import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/db.js';
import { authenticate, authorize, scopeData } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';

const router = Router();

router.use(authenticate, scopeData);

// ─── Validation schemas ──────────────────────────────────────

const applyLeaveSchema = z.object({
    type: z.string().min(1).max(50),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    days: z.number().int().min(1),
    reason: z.string().optional(),
});

const leaveActionSchema = z.object({
    reason: z.string().optional(), // rejection reason
});

// ─── GET /api/leaves ─────────────────────────────────────────
// List leaves — scoped by role

router.get(
    '/',
    asyncHandler(async (req, res) => {
        const scope = req.dataScope!;
        const status = req.query['status'] as string | undefined;
        const employeeId = req.query['employeeId'] as string | undefined;

        // Build scope filter
        let where: Record<string, unknown> = {};

        if (scope.type === 'self') {
            where.employeeId = scope.employeeId;
        } else if (scope.type === 'team') {
            // Manager: own leaves + team leaves
            const teamIds = await prisma.employee.findMany({
                where: { managerId: scope.employeeId! },
                select: { id: true },
            });
            const ids = [scope.employeeId!, ...teamIds.map(t => t.id)];
            where.employeeId = { in: ids };
        }
        // HR: no filter (sees all)

        // Optional filters
        if (status) where.status = status;
        if (employeeId && scope.type === 'all') {
            where.employeeId = parseInt(employeeId, 10);
        }

        const leaves = await prisma.leave.findMany({
            where,
            include: {
                employee: { select: { id: true, name: true, department: true } },
                approvedBy: { select: { id: true, username: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ success: true, data: { leaves } });
    })
);

// ─── POST /api/leaves ────────────────────────────────────────
// Apply for leave (any authenticated user)

router.post(
    '/',
    validate(applyLeaveSchema),
    asyncHandler(async (req, res) => {
        const { type, startDate, endDate, days, reason } = req.body as z.infer<typeof applyLeaveSchema>;

        if (!req.user?.employeeId) {
            throw new BadRequestError('No employee profile linked to this account');
        }

        const leave = await prisma.leave.create({
            data: {
                employeeId: req.user.employeeId,
                type,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                days,
                reason,
            },
        });

        res.status(201).json({
            success: true,
            data: { leave },
            message: 'Leave application submitted',
        });
    })
);

// ─── PUT /api/leaves/:id/approve ─────────────────────────────

router.put(
    '/:id/approve',
    authorize('HR', 'MANAGER'),
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid leave ID');

        const leave = await prisma.leave.findUnique({
            where: { id },
            include: { employee: true },
        });
        if (!leave) throw new NotFoundError('Leave not found');

        // Manager can only approve their team's leaves
        if (req.user!.role === 'MANAGER') {
            if (leave.employee.managerId !== req.user!.employeeId) {
                throw new ForbiddenError('You can only approve your team\'s leaves');
            }
        }

        const updated = await prisma.leave.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedById: req.user!.userId,
            },
        });

        res.json({
            success: true,
            data: { leave: updated },
            message: 'Leave approved',
        });
    })
);

// ─── PUT /api/leaves/:id/reject ──────────────────────────────

router.put(
    '/:id/reject',
    authorize('HR', 'MANAGER'),
    validate(leaveActionSchema),
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid leave ID');

        const leave = await prisma.leave.findUnique({
            where: { id },
            include: { employee: true },
        });
        if (!leave) throw new NotFoundError('Leave not found');

        if (req.user!.role === 'MANAGER') {
            if (leave.employee.managerId !== req.user!.employeeId) {
                throw new ForbiddenError('You can only reject your team\'s leaves');
            }
        }

        const updated = await prisma.leave.update({
            where: { id },
            data: {
                status: 'REJECTED',
                approvedById: req.user!.userId,
            },
        });

        res.json({
            success: true,
            data: { leave: updated },
            message: 'Leave rejected',
        });
    })
);

// ─── DELETE /api/leaves/:id ──────────────────────────────────
// Cancel own pending leave

router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid leave ID');

        const leave = await prisma.leave.findUnique({ where: { id } });
        if (!leave) throw new NotFoundError('Leave not found');

        // Only own pending leaves can be cancelled
        if (leave.employeeId !== req.user!.employeeId && req.user!.role !== 'HR') {
            throw new ForbiddenError('You can only cancel your own leaves');
        }
        if (leave.status !== 'PENDING') {
            throw new BadRequestError('Only pending leaves can be cancelled');
        }

        await prisma.leave.delete({ where: { id } });

        res.json({ success: true, message: 'Leave cancelled' });
    })
);

export default router;
