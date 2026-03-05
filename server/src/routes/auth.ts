import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import prisma from '../config/db.js';
import { signToken } from '../utils/jwt.js';
import { verifyPassword } from '../utils/password.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { UnauthorizedError } from '../utils/errors.js';
import { env } from '../config/env.js';

const router = Router();

// ─── Stricter rate limit for login (5 attempts per 15 min) ──

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many login attempts. Please try again after 15 minutes.',
    },
});

// ─── Validation schemas ──────────────────────────────────────

const loginSchema = z.object({
    username: z.string().min(1, 'Username is required').max(50),
    password: z.string().min(1, 'Password is required').max(128),
});

// ─── POST /api/auth/login ────────────────────────────────────

router.post(
    '/login',
    loginLimiter,
    validate(loginSchema),
    asyncHandler(async (req, res) => {
        const { username, password } = req.body as z.infer<typeof loginSchema>;

        // Find user by username
        const user = await prisma.user.findUnique({
            where: { username },
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        position: true,
                        department: true,
                        avatar: true,
                    },
                },
            },
        });

        if (!user || !user.isActive) {
            // Generic message to prevent user enumeration
            throw new UnauthorizedError('Invalid username or password');
        }

        // Verify password
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
            throw new UnauthorizedError('Invalid username or password');
        }

        // Generate JWT
        const token = signToken({
            userId: user.id,
            role: user.role,
            employeeId: user.employeeId,
        });

        // Set httpOnly cookie (more secure than localStorage)
        res.cookie('token', token, {
            httpOnly: true,      // JavaScript cannot access this cookie
            secure: env.NODE_ENV === 'production',  // HTTPS only in prod
            sameSite: 'lax',     // CSRF protection
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });

        // Also return token in body (for mobile/SPA use)
        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    employee: user.employee,
                },
            },
        });
    })
);

// ─── GET /api/auth/me ────────────────────────────────────────

router.get(
    '/me',
    authenticate,
    asyncHandler(async (req, res) => {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: {
                id: true,
                username: true,
                role: true,
                employeeId: true,
                employee: {
                    select: {
                        id: true,
                        name: true,
                        position: true,
                        department: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
        });

        if (!user) {
            throw new UnauthorizedError('User not found');
        }

        res.json({
            success: true,
            data: { user },
        });
    })
);

// ─── POST /api/auth/logout ───────────────────────────────────

router.post('/logout', (_req, res) => {
    // Clear the httpOnly cookie
    res.clearCookie('token', {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
    });

    res.json({
        success: true,
        message: 'Logged out successfully',
    });
});

export default router;
