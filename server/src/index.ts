import 'dotenv/config';
import app from './app.js';
import { env } from './config/env.js';
import prisma from './config/db.js';

/**
 * Server entry point.
 * Validates environment, tests DB connection, then starts listening.
 */
async function main() {
    try {
        // Test database connection
        await prisma.$connect();
        console.log('✅ Database connected');

        // Start server
        app.listen(env.PORT, () => {
            console.log(`✅ Auto HR API running on port ${env.PORT}`);
            console.log(`   Environment: ${env.NODE_ENV}`);
            console.log(`   Frontend URL: ${env.FRONTEND_URL}`);
            console.log(`   Health check: http://localhost:${env.PORT}/api/health`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('⏳ Shutting down...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('⏳ Shutting down...');
    await prisma.$disconnect();
    process.exit(0);
});

main();
