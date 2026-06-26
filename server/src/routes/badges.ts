import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/db.js';
import { authenticate, authorize, scopeData, assertCanAccessEmployee } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { BadRequestError } from '../utils/errors.js';

const router = Router();

router.use(authenticate, scopeData);

// ─── Validation schemas ──────────────────────────────────────

const createBadgeSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().optional(),
    iconKey: z.string().max(50).optional(),
    criteriaType: z.enum(['QUIZ_GRADE', 'PERFECT_SCORE', 'COURSE_COMPLETION_COUNT', 'PATH_COMPLETION_COUNT', 'MODULE_COMPLETION_COUNT']),
    criteriaValue: z.number().int().positive().optional(),
    criteriaLabel: z.string().max(50).optional(),
}).refine(
    (data) => data.criteriaType !== 'QUIZ_GRADE' || Boolean(data.criteriaLabel),
    { message: 'criteriaLabel is required for QUIZ_GRADE badges' }
).refine(
    (data) => !['COURSE_COMPLETION_COUNT', 'PATH_COMPLETION_COUNT', 'MODULE_COMPLETION_COUNT'].includes(data.criteriaType) || Boolean(data.criteriaValue),
    { message: 'criteriaValue is required for completion-count badges' }
);

// ─── GET /api/badges ──────────────────────────────────────────
// Badge catalog — visible to everyone (so learners know what's earnable)

router.get(
    '/',
    asyncHandler(async (_req, res) => {
        const badges = await prisma.badge.findMany({
            include: { createdBy: { select: { username: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: { badges } });
    })
);

// ─── POST /api/badges ─────────────────────────────────────────

router.post(
    '/',
    authorize('HR'),
    validate(createBadgeSchema),
    asyncHandler(async (req, res) => {
        const body = req.body as z.infer<typeof createBadgeSchema>;

        const badge = await prisma.badge.create({
            data: {
                name: body.name,
                description: body.description,
                iconKey: body.iconKey || 'Award',
                criteriaType: body.criteriaType,
                criteriaValue: body.criteriaValue,
                criteriaLabel: body.criteriaLabel,
                createdById: req.user!.userId,
            },
        });

        res.status(201).json({ success: true, data: { badge }, message: 'Badge created' });
    })
);

// ─── DELETE /api/badges/:id ───────────────────────────────────

router.delete(
    '/:id',
    authorize('HR'),
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid badge ID');

        await prisma.badge.delete({ where: { id } });
        res.json({ success: true, message: 'Badge removed' });
    })
);

// ─── GET /api/badges/employees/:employeeId ───────────────────
// Badges earned by one employee — self, or anyone permitted to view that employee's data.

router.get(
    '/employees/:employeeId',
    asyncHandler(async (req, res) => {
        const employeeId = parseInt(req.params['employeeId'] as string, 10);
        if (isNaN(employeeId)) throw new BadRequestError('Invalid employee ID');

        await assertCanAccessEmployee(req, employeeId, {
            self: 'You can only view your own badges',
            team: 'You can only view your team\'s badges',
        });

        const earned = await prisma.employeeBadge.findMany({
            where: { employeeId },
            include: { badge: true },
            orderBy: { earnedAt: 'desc' },
        });

        res.json({ success: true, data: { earned } });
    })
);

export default router;
