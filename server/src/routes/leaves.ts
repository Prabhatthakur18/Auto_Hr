import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/db.js';
import {
    authenticate,
    authorize,
    scopeData,
    assertCanAccessEmployee,
    canReviewLeaves,
    getScopedEmployeeIds,
    hasFullAccess,
} from '../middleware/auth.js';
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
    approverIds: z.string().optional(),
});

const leaveActionSchema = z.object({
    reason: z.string().optional(), // rejection reason
});

async function canManageLeaveByHierarchy(
    req: import('express').Request,
    leaveEmployeeId: number
): Promise<boolean> {
    const currentUser = req.user;
    if (!currentUser?.employeeId || leaveEmployeeId === currentUser.employeeId) {
        return false;
    }

    const scopedIds = await getScopedEmployeeIds(req);
    if (!scopedIds) {
        return true;
    }

    return scopedIds.includes(leaveEmployeeId);
}

// ─── GET /api/leaves ─────────────────────────────────────────
// List leaves — scoped by role

router.get(
    '/',
    asyncHandler(async (req, res) => {
        const scope = req.dataScope!;
        const status = req.query['status'] as string | undefined;
        const employeeId = req.query['employeeId'] as string | undefined;
        const currentUser = req.user!;
        const targetEmployeeId = employeeId ? parseInt(employeeId, 10) : null;

        if (employeeId && (!targetEmployeeId || Number.isNaN(targetEmployeeId))) {
            throw new BadRequestError('Invalid employee ID');
        }

        // Build scope filter
        let where: any = {};

        if (targetEmployeeId) {
            await assertCanAccessEmployee(req, targetEmployeeId, {
                self: 'You can only view your own leave records',
                team: 'You can only view leave records for your own team members',
            });

            where.employeeId = targetEmployeeId;
        } else if (scope.type === 'self') {
            where.OR = [
                { employeeId: scope.employeeId },
                { approverIds: { contains: `,${currentUser.userId},` } }
            ];
        } else if (scope.type === 'team') {
            // Manager: own leaves + full team hierarchy + leaves where they are listed in approverIds
            const ids = await getScopedEmployeeIds(req);
            where.OR = [
                { employeeId: { in: ids } },
                { approverIds: { contains: `,${currentUser.userId},` } }
            ];
        }
        // HR: no filter (sees all)

        // Optional filters
        if (status) where.status = status;

        const leaves = await prisma.leave.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        department: true,
                        manager: {
                            select: {
                                id: true,
                                name: true,
                                department: true,
                                position: true,
                            },
                        },
                    },
                },
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
        const { type, startDate, endDate, days, reason, approverIds } = req.body as z.infer<typeof applyLeaveSchema>;

        if (!req.user?.employeeId) {
            throw new BadRequestError('No employee profile linked to this account');
        }

        // Format approver IDs with commas to allow robust matching: e.g. ",2,5,"
        const formattedApprovers = approverIds
            ? `,${approverIds.split(',').filter(Boolean).join(',')},`
            : null;

        const isSelfApprovingRole = canReviewLeaves(req.user.role);

        const leave = await prisma.leave.create({
            data: {
                employeeId: req.user.employeeId,
                type,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                days,
                reason,
                approverIds: formattedApprovers,
                status: isSelfApprovingRole ? 'APPROVED' : 'PENDING',
                approvedById: isSelfApprovingRole ? req.user.userId : null,
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
    authorize('HR', 'MANAGER', 'LEADERSHIP'),
    validate(leaveActionSchema),
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid leave ID');

        const { reason } = req.body as z.infer<typeof leaveActionSchema>;

        const leave = await prisma.leave.findUnique({
            where: { id },
            include: { employee: true },
        });
        if (!leave) throw new NotFoundError('Leave not found');

        const isGlobalReviewer = hasFullAccess(req.user!.role);
        const isDesignatedApprover = leave.approverIds
            ? leave.approverIds.split(',').filter(Boolean).includes(String(req.user!.userId))
            : false;
        const isHierarchyManager = await canManageLeaveByHierarchy(req, leave.employeeId);

        // Either a full-access role, hierarchy manager, or a selected designated approver can approve
        if (!isGlobalReviewer && !isDesignatedApprover && !isHierarchyManager) {
            throw new ForbiddenError('You do not have permission to approve this leave');
        }

        const updated = await prisma.leave.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedById: req.user!.userId,
                comment: reason || null,
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
    authorize('HR', 'MANAGER', 'LEADERSHIP'),
    validate(leaveActionSchema),
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid leave ID');

        const { reason } = req.body as z.infer<typeof leaveActionSchema>;

        const leave = await prisma.leave.findUnique({
            where: { id },
            include: { employee: true },
        });
        if (!leave) throw new NotFoundError('Leave not found');

        const isGlobalReviewer = hasFullAccess(req.user!.role);
        const isDesignatedApprover = leave.approverIds
            ? leave.approverIds.split(',').filter(Boolean).includes(String(req.user!.userId))
            : false;
        const isHierarchyManager = await canManageLeaveByHierarchy(req, leave.employeeId);

        // Either a full-access role, hierarchy manager, or a selected designated approver can reject
        if (!isGlobalReviewer && !isDesignatedApprover && !isHierarchyManager) {
            throw new ForbiddenError('You do not have permission to reject this leave');
        }

        const updated = await prisma.leave.update({
            where: { id },
            data: {
                status: 'REJECTED',
                approvedById: req.user!.userId,
                comment: reason || null,
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
        if (leave.employeeId !== req.user!.employeeId && !hasFullAccess(req.user!.role)) {
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
