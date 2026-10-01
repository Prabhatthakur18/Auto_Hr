import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

/**
 * Adds connection-pool defaults to DATABASE_URL unless already set there.
 * On serverless each instance opens its own pool, and Hostinger caps the DB user
 * at 75 connections, so a small per-instance pool avoids exhausting it.
 */
function withPoolDefaults(url: string): string {
    const defaults: Record<string, string> = {
        connection_limit: '5',
        pool_timeout: '10',
        connect_timeout: '10',
    };
    try {
        const parsed = new URL(url);
        for (const [key, value] of Object.entries(defaults)) {
            if (!parsed.searchParams.has(key)) parsed.searchParams.set(key, value);
        }
        return parsed.toString();
    } catch {
        return url;
    }
}

/**
 * Singleton Prisma client.
 * Set PRISMA_LOG_QUERIES=true to log every query (slow — debugging only).
 */
const prisma = new PrismaClient({
    datasources: { db: { url: withPoolDefaults(env.DATABASE_URL) } },
    log: process.env['PRISMA_LOG_QUERIES'] === 'true' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

export default prisma;
