import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/auth.js';
import employeeRouter from './routes/employees.js';
import leaveRouter from './routes/leaves.js';
import attendanceRouter from './routes/attendance.js';
import salaryRouter from './routes/salary.js';
import announcementRouter from './routes/announcements.js';

const app = express();

// ─── SECURITY MIDDLEWARE ─────────────────────────────────────

// Helmet: sets various HTTP security headers
// - X-Content-Type-Options: nosniff
// - X-Frame-Options: DENY
// - X-XSS-Protection
// - Strict-Transport-Security
// - And more...
app.use(helmet());

// CORS: only allow requests from our frontend
app.use(
    cors({
        origin: env.FRONTEND_URL,
        credentials: true, // allow httpOnly cookies
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

// Global rate limiter: 100 requests per 15 minutes per IP
app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, error: 'Too many requests, please try again later' },
    })
);

// ─── BODY PARSING ────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── HEALTH CHECK ────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
    res.json({
        success: true,
        message: 'Auto HR API is running',
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString(),
    });
});

// ─── ROUTES ──────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/employees', employeeRouter);
app.use('/api/leaves', leaveRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/salary', salaryRouter);
app.use('/api/announcements', announcementRouter);

// ─── ERROR HANDLING ──────────────────────────────────────────

// 404 handler for unknown routes
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
    });
});

// Centralized error handler (must be last)
app.use(errorHandler);

export default app;
