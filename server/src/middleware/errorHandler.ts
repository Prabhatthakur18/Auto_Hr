import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { isProd } from '../config/env.js';

/**
 * Centralized error handling middleware.
 *
 * - Operational errors (AppError): return clean JSON with appropriate status.
 * - Unknown errors in production: return generic 500 (no stack traces leaked).
 * - Unknown errors in development: return full details for debugging.
 */
export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    // Log all errors
    console.error(`[ERROR] ${err.message}`, isProd ? '' : err.stack);

    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: err.message,
        });
        return;
    }

    // Unknown/unexpected errors
    const statusCode = 500;
    const message = isProd
        ? 'An unexpected error occurred'
        : err.message || 'Internal server error';

    res.status(statusCode).json({
        success: false,
        error: message,
        // Only include stack trace in development
        ...(isProd ? {} : { stack: err.stack }),
    });
}

/**
 * Async route handler wrapper.
 * Catches async errors and forwards them to the error handler.
 * 
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
