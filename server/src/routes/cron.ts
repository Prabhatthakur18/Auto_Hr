import { Router } from 'express';
import { env } from '../config/env.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { UnauthorizedError } from '../utils/errors.js';
import { processLearningReminders } from '../utils/learningReminderScheduler.js';
import { processAutoAssignments } from '../utils/learningAutoAssignScheduler.js';
import { processCertificateExpiry } from '../utils/certificateExpiryScheduler.js';
import { processDueAnnouncements } from '../utils/announcementScheduler.js';

/**
 * Scheduled jobs for serverless hosting. On Vercel there is no long-running process to run the
 * interval schedulers from src/index.ts, so Vercel Cron calls these endpoints instead (see the
 * `crons` entry in vercel.json). Vercel sends `Authorization: Bearer <CRON_SECRET>`.
 */
const router = Router();

router.use((req, _res, next) => {
    if (!env.CRON_SECRET || req.headers.authorization !== `Bearer ${env.CRON_SECRET}`) {
        throw new UnauthorizedError('Invalid cron credentials');
    }
    next();
});

// ─── GET /api/cron/daily ─────────────────────────────────────
// Day-granular jobs: course due/overdue reminders, course auto-assignment, certificate expiry
// notices, plus a catch-up pass over scheduled announcements.

router.get(
    '/daily',
    asyncHandler(async (_req, res) => {
        const jobs: [string, () => Promise<void>][] = [
            ['learningReminders', processLearningReminders],
            ['learningAutoAssign', processAutoAssignments],
            ['certificateExpiry', processCertificateExpiry],
            ['announcements', processDueAnnouncements],
        ];

        // Run one after another so a slow job can't starve the DB pool; a failure in one job
        // doesn't stop the others.
        const results: Record<string, string> = {};
        for (const [name, job] of jobs) {
            const started = Date.now();
            try {
                await job();
                results[name] = `ok (${Date.now() - started}ms)`;
            } catch (error) {
                console.error(`Cron job ${name} failed:`, error);
                results[name] = `failed: ${error instanceof Error ? error.message : String(error)}`;
            }
        }

        res.json({ success: true, data: { ranAt: new Date().toISOString(), results } });
    })
);

export default router;
