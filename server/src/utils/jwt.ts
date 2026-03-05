import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { Role } from '@prisma/client';

/**
 * JWT payload structure — minimal data in token.
 * Full user data is fetched from DB on each request.
 */
export interface JwtPayload {
    userId: number;
    role: Role;
    employeeId: number | null;
}

/**
 * Sign a new JWT token.
 */
export function signToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN,
    });
}

/**
 * Verify and decode a JWT token.
 * Returns null if token is invalid or expired.
 */
export function verifyToken(token: string): JwtPayload | null {
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        return decoded;
    } catch {
        return null;
    }
}
