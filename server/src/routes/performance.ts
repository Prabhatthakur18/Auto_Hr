import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/db.js';
import { authenticate, authorize, scopeData } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors.js';

const router = Router();

router.use(authenticate, scopeData);

// ─── Validation schemas ──────────────────────────────────────

const kraSchema = z.object({
    employeeId: z.number().int().positive(),
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    period: z.string().max(50).default('Ongoing'),
});

const kpiSchema = z.object({
    kraId: z.number().int().positive(),
    metric: z.string().min(1).max(200),
    target: z.number().positive(),
    actual: z.number().min(0).optional().nullable(),
    unit: z.string().max(50).optional().nullable(),
});

const updateKpiSchema = z.object({
    metric: z.string().min(1).max(200).optional(),
    target: z.number().positive().optional(),
    actual: z.number().min(0).optional().nullable(),
    unit: z.string().max(50).optional().nullable(),
});

const updateKraSchema = kraSchema.partial().omit({ employeeId: true });

// ─── Helper: calculate score (0–100) ────────────────────────

function calcScore(actual: number | null | undefined, target: number): number | null {
    if (actual === null || actual === undefined) return null;
    if (target <= 0) return null;
    return Math.min(Math.round((actual / target) * 100 * 100) / 100, 100);
}

// ─── GET /api/performance/:employeeId ───────────────────────
// Returns all KRAs with nested KPIs + overall score summary

router.get(
    '/:employeeId',
    asyncHandler(async (req, res) => {
        const employeeId = parseInt(req.params['employeeId'] as string, 10);
        if (isNaN(employeeId)) throw new BadRequestError('Invalid employee ID');

        // Data isolation
        const scope = req.dataScope!;
        if (scope.type === 'self' && scope.employeeId !== employeeId) {
            throw new ForbiddenError('You can only view your own performance data');
        }
        if (scope.type === 'team' && scope.employeeId !== employeeId) {
            const isReport = await prisma.employee.findFirst({
                where: { id: employeeId, managerId: scope.employeeId! },
            });
            if (!isReport) throw new ForbiddenError('You can only view your team members\' data');
        }

        const kras = await prisma.kra.findMany({
            where: { employeeId },
            include: { kpis: { orderBy: { createdAt: 'asc' } } },
            orderBy: { createdAt: 'asc' },
        });

        // Calculate overall score across all KPIs
        const allKpis = kras.flatMap(k => k.kpis);
        const scoredKpis = allKpis.filter(k => k.score !== null);
        const overallScore = scoredKpis.length > 0
            ? Math.round(scoredKpis.reduce((sum, k) => sum + Number(k.score), 0) / scoredKpis.length * 100) / 100
            : null;

        const summary = {
            totalKras: kras.length,
            totalKpis: allKpis.length,
            scoredKpis: scoredKpis.length,
            overallScore,
        };

        res.json({ success: true, data: { kras, summary } });
    })
);

// ─── POST /api/performance/kra ───────────────────────────────

router.post(
    '/kra',
    authorize('HR'),
    validate(kraSchema),
    asyncHandler(async (req, res) => {
        const data = req.body as z.infer<typeof kraSchema>;

        const kra = await prisma.kra.create({ data });

        res.status(201).json({
            success: true,
            data: { kra },
            message: 'KRA created',
        });
    })
);

// ─── PUT /api/performance/kra/:id ───────────────────────────

router.put(
    '/kra/:id',
    authorize('HR'),
    validate(updateKraSchema),
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid KRA ID');

        const existing = await prisma.kra.findUnique({ where: { id } });
        if (!existing) throw new NotFoundError('KRA not found');

        const kra = await prisma.kra.update({
            where: { id },
            data: req.body as z.infer<typeof updateKraSchema>,
        });

        res.json({ success: true, data: { kra }, message: 'KRA updated' });
    })
);

// ─── DELETE /api/performance/kra/:id ────────────────────────

router.delete(
    '/kra/:id',
    authorize('HR'),
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid KRA ID');

        const existing = await prisma.kra.findUnique({ where: { id } });
        if (!existing) throw new NotFoundError('KRA not found');

        await prisma.kra.delete({ where: { id } });

        res.json({ success: true, message: 'KRA deleted' });
    })
);

// ─── POST /api/performance/kpi ───────────────────────────────

router.post(
    '/kpi',
    authorize('HR'),
    validate(kpiSchema),
    asyncHandler(async (req, res) => {
        const data = req.body as z.infer<typeof kpiSchema>;

        // Verify KRA exists
        const kra = await prisma.kra.findUnique({ where: { id: data.kraId } });
        if (!kra) throw new NotFoundError('KRA not found');

        const score = calcScore(data.actual ?? null, data.target);

        const kpi = await prisma.kpi.create({
            data: {
                kraId: data.kraId,
                metric: data.metric,
                target: data.target,
                actual: data.actual ?? null,
                unit: data.unit ?? null,
                score: score,
            },
        });

        res.status(201).json({ success: true, data: { kpi }, message: 'KPI created' });
    })
);

// ─── PUT /api/performance/kpi/:id ───────────────────────────

router.put(
    '/kpi/:id',
    authorize('HR'),
    validate(updateKpiSchema),
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid KPI ID');

        const existing = await prisma.kpi.findUnique({ where: { id } });
        if (!existing) throw new NotFoundError('KPI not found');

        const data = req.body as z.infer<typeof updateKpiSchema>;

        const newTarget = data.target ?? Number(existing.target);
        const newActual = data.actual !== undefined ? data.actual : (existing.actual !== null ? Number(existing.actual) : null);
        const score = calcScore(newActual, newTarget);

        const kpi = await prisma.kpi.update({
            where: { id },
            data: {
                ...data,
                score,
            },
        });

        res.json({ success: true, data: { kpi }, message: 'KPI updated' });
    })
);

// ─── DELETE /api/performance/kpi/:id ────────────────────────

router.delete(
    '/kpi/:id',
    authorize('HR'),
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid KPI ID');

        const existing = await prisma.kpi.findUnique({ where: { id } });
        if (!existing) throw new NotFoundError('KPI not found');

        await prisma.kpi.delete({ where: { id } });

        res.json({ success: true, message: 'KPI deleted' });
    })
);

export default router;
