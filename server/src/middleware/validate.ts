import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError } from '../utils/errors.js';

/**
 * Validation middleware using Zod schemas.
 * Validates request body, query, or params.
 *
 * Usage:
 *   router.post('/login', validate(loginSchema), handler)
 *   router.get('/users', validate(querySchema, 'query'), handler)
 */
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            const data = schema.parse(req[source]);
            // Replace with parsed (and potentially transformed) data
            req[source] = data;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const messages = error.errors.map(
                    (e) => `${e.path.join('.')}: ${e.message}`
                );
                throw new BadRequestError(`Validation failed: ${messages.join(', ')}`);
            }
            throw error;
        }
    };
}
