import { z } from 'zod';

/**
 * Environment configuration with validation.
 * Fails fast on startup if required variables are missing.
 */

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    // JWT
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('24h'),

    // SMTP (optional — features degrade gracefully)
    SMTP_HOST: z.string().optional().default(''),
    SMTP_PORT: z.coerce.number().optional().default(587),
    SMTP_USER: z.string().optional().default(''),
    SMTP_PASSWORD: z.string().optional().default(''),
    SMTP_FROM: z.string().optional().default(''),

    // Server
    PORT: z.coerce.number().default(3001),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // CORS
    FRONTEND_URL: z.string().default('http://localhost:5173'),
});

// Load and validate environment variables
function loadEnv() {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error('❌ Invalid environment variables:');
        for (const error of result.error.errors) {
            console.error(`   ${error.path.join('.')}: ${error.message}`);
        }
        process.exit(1);
    }

    return result.data;
}

export const env = loadEnv();

export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
