import { Request, Response, NextFunction } from 'express';
import { verifyToken, type JwtPayload } from '../utils/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import type { Role } from '@prisma/client';

/**
 * Extend Express Request to include authenticated user info.
 */
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

/**
 * Authentication middleware.
 * Validates JWT from Authorization header or httpOnly cookie.
 * Attaches user payload to req.user.
 */
export function authenticate(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    // Try Authorization header first, then cookie
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
    } else if (req.cookies?.token) {
        token = req.cookies.token as string;
    }

    if (!token) {
        throw new UnauthorizedError('Authentication required');
    }

    const payload = verifyToken(token);
    if (!payload) {
        throw new UnauthorizedError('Invalid or expired token');
    }

    req.user = payload;
    next();
}

/**
 * Role-based authorization middleware.
 * Must be used AFTER authenticate middleware.
 * Accepts one or more allowed roles.
 *
 * Usage: authorize('HR') or authorize('HR', 'MANAGER')
 */
export function authorize(...allowedRoles: Role[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            throw new UnauthorizedError('Authentication required');
        }

        if (!allowedRoles.includes(req.user.role)) {
            throw new ForbiddenError(
                'You do not have permission to perform this action'
            );
        }

        next();
    };
}

/**
 * Data isolation middleware.
 * Ensures employees can only access their own data.
 * Managers can access their own + direct reports.
 * HR can access everything.
 *
 * Attaches `dataScope` to req for use in route handlers.
 */
export interface DataScope {
    /** The employee IDs this user is allowed to view */
    type: 'self' | 'team' | 'all';
    employeeId: number | null;
}

declare global {
    namespace Express {
        interface Request {
            dataScope?: DataScope;
        }
    }
}

export function scopeData(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    if (!req.user) {
        throw new UnauthorizedError('Authentication required');
    }

    switch (req.user.role) {
        case 'HR':
            req.dataScope = { type: 'all', employeeId: req.user.employeeId };
            break;
        case 'MANAGER':
            req.dataScope = { type: 'team', employeeId: req.user.employeeId };
            break;
        case 'EMPLOYEE':
        default:
            req.dataScope = { type: 'self', employeeId: req.user.employeeId };
            break;
    }

    next();
}
