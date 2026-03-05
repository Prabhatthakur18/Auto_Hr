import { PrismaClient } from '@prisma/client';
import { isDev } from '../config/env.js';

/**
 * Singleton Prisma client.
 * Logs queries in development for debugging.
 */
const prisma = new PrismaClient({
    log: isDev ? ['query', 'warn', 'error'] : ['error'],
});

export default prisma;
