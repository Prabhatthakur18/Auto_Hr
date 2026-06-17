import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/db.js';
import { masterEmployees } from '../data/employeeMaster.js';
import {
    authenticate,
    authorize,
    scopeData,
    assertCanAccessEmployee,
    getDescendantEmployeeIds,
    getScopedEmployeeIds,
    MANAGER_ASSIGNMENT_ROLES,
} from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../utils/errors.js';
import { hashPassword } from '../utils/password.js';

const router = Router();

// All employee routes require authentication + data scoping
router.use(authenticate, scopeData);

// ─── Validation schemas ──────────────────────────────────────

const optionalEmail = z.preprocess(
    (value) => {
        if (typeof value === 'string' && value.trim() === '') {
            return undefined;
        }
        return value;
    },
    z.string().email('Invalid email').max(100).nullable().optional()
);

const createEmployeeSchema = z.object({
    biometricId: z.number().int().positive().optional().nullable(),
    name: z.string().min(1, 'Name is required').max(100),
    position: z.string().max(100).optional(),
    department: z.string().max(100).optional(),
    email: optionalEmail,
    phone: z.string().max(20).optional(),
    joinDate: z.string().optional().nullable(), // ISO date string
    managerId: z.number().int().positive().optional().nullable(),
    managerIds: z.array(z.number().int().positive()).optional(), // Multiple managers
    avatar: z.string().max(500).optional().nullable(),
    gender: z.enum(['Male', 'Female', 'Other']).optional().nullable(),
    bio: z.string().optional(),
    skills: z.array(z.string()).optional(),
    experience: z.string().optional(),
    education: z.string().max(255).optional(),
    employeeType: z.string().max(50).optional(),
    tallyLedgerName: z.string().max(200).optional().nullable(),

    // Optional: create a user account for this employee
    createUser: z.boolean().optional(),
    username: z.string().min(1).max(50).optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').max(128).optional(),
    role: z.enum(['EMPLOYEE', 'MANAGER', 'HR', 'LEADERSHIP']).optional(),
});

const updateEmployeeSchema = createEmployeeSchema.partial();

const querySchema = z.object({
    search: z.string().optional(),
    department: z.string().optional(),
    managerId: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ─── Helper: build WHERE clause based on data scope ──────────

async function buildWhereClause(req: import('express').Request) {
    const scope = req.dataScope!;

    switch (scope.type) {
        case 'self':
            // Employee can only see themselves
            if (!scope.employeeId) return { id: -1 }; // no results
            return { id: scope.employeeId };

        case 'team':
            // Manager sees self + full reporting hierarchy
            const scopedIds = await getScopedEmployeeIds(req);
            return {
                id: {
                    in: scopedIds ?? [],
                },
            };

        case 'all':
            // HR sees everyone
            return {};

        default:
            return { id: -1 };
    }
}

async function validateManagerAssignment(
    managerId: number | null | undefined,
    employeeId?: number
) {
    if (managerId === undefined || managerId === null) {
        return;
    }

    if (employeeId && managerId === employeeId) {
        throw new BadRequestError('Employee cannot be their own manager');
    }

    // Allow building the reporting hierarchy even before every manager has a
    // login/user role. If a manager has a user, ensure they have a manager-capable role.
    const manager = await prisma.employee.findFirst({
        where: { id: managerId, isActive: true },
        select: { id: true },
    });

    if (!manager) {
        throw new BadRequestError('Selected manager not found or inactive');
    }

    const managerUser = await prisma.user.findFirst({
        where: {
            employeeId: managerId,
            isActive: true,
        },
        select: { role: true },
    });

    if (managerUser && !MANAGER_ASSIGNMENT_ROLES.includes(managerUser.role)) {
        throw new BadRequestError(
            'Selected manager must have a MANAGER or LEADERSHIP user role'
        );
    }
}

// ─── GET /api/employees ──────────────────────────────────────
// List employees (filtered by role scope)

router.get(
    '/',
    validate(querySchema, 'query'),
    asyncHandler(async (req, res) => {
        const { search, department, managerId, page, limit } = req.query as unknown as z.infer<typeof querySchema>;

        const scopeWhere = await buildWhereClause(req);
        const skip = (page - 1) * limit;

        // Build additional filters
        const filters: Record<string, unknown> = {};
        if (search) {
            filters.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
                { position: { contains: search } },
            ];
        }
        if (department) {
            filters.department = department;
        }
        if (managerId) {
            filters.managerId = parseInt(managerId, 10);
        }

        const [employees, total] = await Promise.all([
            prisma.employee.findMany({
                where: {
                    ...scopeWhere,
                    ...filters,
                    isActive: true,
                },
                select: {
                    id: true,
                    biometricId: true,
                    name: true,
                    position: true,
                    department: true,
                    email: true,
                    phone: true,
                    joinDate: true,
                    managerId: true,
                    avatar: true,
                    gender: true,
                    employeeType: true,
                    tallyLedgerName: true,
                    manager: {
                        select: { id: true, name: true },
                    },
                },
                orderBy: { name: 'asc' },
                skip,
                take: limit,
            }),
            prisma.employee.count({
                where: {
                    ...scopeWhere,
                    ...filters,
                    isActive: true,
                },
            }),
        ]);

        res.json({
            success: true,
            data: {
                employees,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    })
);

// ─── GET /api/employees/approvers/list ───────────────────────────
// Get list of all potential approvers (Managers and HRs)
// Available to any authenticated user

router.get(
    '/approvers/list',
    asyncHandler(async (_req, res) => {
        const approvers = await prisma.user.findMany({
            where: {
                role: { in: ['MANAGER', 'HR', 'LEADERSHIP'] },
                isActive: true,
                employeeId: { not: null },
            },
            select: {
                id: true, // User ID (stored in approverIds)
                role: true,
                username: true,
                employee: {
                    select: {
                        id: true,
                        name: true,
                        position: true,
                        department: true,
                    },
                },
            },
            orderBy: {
                employee: {
                    name: 'asc',
                },
            },
        });

        // Format nicely for frontend
        const list = approvers.map(a => ({
            userId: a.id,
            employeeId: a.employee!.id,
            name: a.employee!.name,
            role: a.role,
            position: a.employee!.position,
            department: a.employee!.department,
        }));

        res.json({
            success: true,
            data: { approvers: list },
        });
    })
);

// ─── GET /api/employees/managers/list ────────────────────────────────
// Get employees who can be assigned as reporting managers

router.get(
    '/managers/list',
    asyncHandler(async (_req, res) => {
        const managers = await prisma.user.findMany({
            where: {
                role: { in: MANAGER_ASSIGNMENT_ROLES },
                isActive: true,
                employeeId: { not: null },
                employee: {
                    is: {
                        isActive: true,
                    },
                },
            },
            select: {
                id: true,
                role: true,
                employee: {
                    select: {
                        id: true,
                        name: true,
                        position: true,
                        department: true,
                    },
                },
            },
            orderBy: {
                employee: {
                    name: 'asc',
                },
            },
        });

        res.json({
            success: true,
            data: {
                managers: managers.map((manager) => ({
                    userId: manager.id,
                    employeeId: manager.employee!.id,
                    name: manager.employee!.name,
                    position: manager.employee!.position,
                    department: manager.employee!.department,
                    role: manager.role,
                })),
            },
        });
    })
);

// ─── POST /api/employees/master/sync ────────────────────────────────
// Sync baseline biometric master data into the employee table

router.post(
    '/master/sync',
    authorize('HR'),
    asyncHandler(async (_req, res) => {
        let created = 0;
        let skipped = 0;

        for (const masterEmployee of masterEmployees) {
            const existing = await prisma.employee.findUnique({
                where: { biometricId: masterEmployee.biometricId },
                select: { id: true },
            });

            if (existing) {
                skipped++;
                continue;
            }

            await prisma.employee.create({
                data: {
                    biometricId: masterEmployee.biometricId,
                    name: masterEmployee.name,
                    department: masterEmployee.department,
                },
            });
            created++;
        }

        res.json({
            success: true,
            message: 'Master employee data synced successfully',
            data: {
                total: masterEmployees.length,
                created,
                skipped,
            },
        });
    })
);

// ─── GET /api/employees/:id ──────────────────────────────────
// Full employee profile (all data)

router.get(
    '/:id',
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid employee ID');

        await assertCanAccessEmployee(req, id, {
            self: 'You can only view your own profile',
            team: 'You can only view your own team members',
        });

        const employee = await prisma.employee.findUnique({
            where: { id },
            include: {
                    manager: {
                        select: { id: true, name: true, position: true },
                    },
                    managers: {
                        include: {
                            manager: {
                            select: { id: true, name: true, position: true, department: true },
                        },
                    },
                },
                directReports: {
                    select: { id: true, name: true, position: true, department: true },
                    where: { isActive: true },
                },
                user: {
                    select: { id: true, username: true, role: true },
                },
            },
        });

        if (!employee || !employee.isActive) {
            throw new NotFoundError('Employee not found');
        }

        res.json({
            success: true,
            data: { employee },
        });
    })
);

// ─── POST /api/employees ─────────────────────────────────────
// Create employee (HR only)

router.post(
    '/',
    authorize('HR'),
    validate(createEmployeeSchema),
    asyncHandler(async (req, res) => {
        const {
            createUser, username, password, role,
            joinDate,
            managerIds,
            ...employeeData
        } = req.body as z.infer<typeof createEmployeeSchema>;

        // Validate single manager first if provided
        if (employeeData.managerId) {
            await validateManagerAssignment(employeeData.managerId);
        }

        // Validate each manager in managerIds
        if (managerIds && managerIds.length > 0) {
            for (const mId of managerIds) {
                await validateManagerAssignment(mId);
            }
        }

        if (employeeData.email) {
            const emailOwner = await prisma.employee.findFirst({
                where: { email: employeeData.email },
                select: { id: true },
            });

            if (emailOwner) {
                throw new ConflictError('An employee with this email already exists');
            }
        }

        // Create employee
        const employee = await prisma.employee.create({
            data: {
                ...employeeData,
                skills: employeeData.skills ? JSON.stringify(employeeData.skills) : undefined,
                joinDate: joinDate ? new Date(joinDate) : undefined,
            },
        });

        // Add multiple managers if provided
        if (managerIds && managerIds.length > 0) {
            await prisma.employeeManager.createMany({
                data: managerIds.map(managerId => ({
                    employeeId: employee.id,
                    managerId,
                })),
            });
        }

        // Optionally create a user account linked to this employee
        if (createUser && username && password) {
            const passwordHash = await hashPassword(password);
            await prisma.user.create({
                data: {
                    username,
                    passwordHash,
                    role: role || 'EMPLOYEE',
                    employeeId: employee.id,
                },
            });
        }

        res.status(201).json({
            success: true,
            data: { employee },
            message: 'Employee created successfully',
        });
    })
);

// ─── PUT /api/employees/:id ──────────────────────────────────
// Update employee (HR only)

router.put(
    '/:id',
    authorize('HR'),
    validate(updateEmployeeSchema),
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid employee ID');

        const existing = await prisma.employee.findUnique({ where: { id } });
        if (!existing) throw new NotFoundError('Employee not found');

        const { createUser, username, password, role, joinDate, managerIds, ...updateData } = req.body as z.infer<typeof updateEmployeeSchema>;

        if ('managerId' in req.body) {
            await validateManagerAssignment(req.body.managerId ?? null, id);
        }

        // Validate each manager in managerIds
        if (managerIds && managerIds.length > 0) {
            for (const mId of managerIds) {
                await validateManagerAssignment(mId, id);
            }
        }

        if (updateData.email) {
            const emailOwner = await prisma.employee.findFirst({
                where: {
                    email: updateData.email,
                    NOT: { id },
                },
                select: { id: true },
            });

            if (emailOwner) {
                throw new ConflictError('An employee with this email already exists');
            }
        }

        const employee = await prisma.employee.update({
            where: { id },
            data: {
                ...updateData,
                skills: updateData.skills ? JSON.stringify(updateData.skills) : undefined,
                biometricId: 'biometricId' in req.body ? (req.body.biometricId ?? null) : undefined,
                joinDate: 'joinDate' in req.body ? (joinDate ? new Date(joinDate) : null) : undefined,
                // Explicitly handle null to clear the manager relation
                managerId: 'managerId' in req.body ? (req.body.managerId ?? null) : undefined,
            },
        });

        // Update multiple managers if provided
        if ('managerIds' in req.body && managerIds !== undefined) {
            // Clear existing managers and add new ones
            await prisma.employeeManager.deleteMany({
                where: { employeeId: id },
            });

            if (managerIds.length > 0) {
                await prisma.employeeManager.createMany({
                    data: managerIds.map(managerId => ({
                        employeeId: id,
                        managerId,
                    })),
                });
            }
        }

        res.json({
            success: true,
            data: { employee },
            message: 'Employee updated successfully',
        });
    })
);

// ─── DELETE /api/employees/:id ───────────────────────────────
// Soft-delete employee (HR only)

router.delete(
    '/:id',
    authorize('HR'),
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid employee ID');

        const existing = await prisma.employee.findUnique({ where: { id } });
        if (!existing) throw new NotFoundError('Employee not found');

        // Soft delete — set isActive to false
        await prisma.employee.update({
            where: { id },
            data: { isActive: false },
        });

        // Also deactivate linked user account
        await prisma.user.updateMany({
            where: { employeeId: id },
            data: { isActive: false },
        });

        res.json({
            success: true,
            message: 'Employee deactivated successfully',
        });
    })
);

// ─── GET /api/employees/:id/team ─────────────────────────────
// Get direct reports (for managers)

router.get(
    '/:id/team',
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid employee ID');

        const scope = req.dataScope!;
        if (scope.type === 'self') {
            throw new ForbiddenError('Employees cannot view team data');
        }

        if (scope.type === 'team') {
            await assertCanAccessEmployee(req, id, {
                self: 'Employees cannot view team data',
                team: 'You can only view teams within your reporting hierarchy',
            });
        }

        const descendantIds = await getDescendantEmployeeIds(id);
        const team = await prisma.employee.findMany({
            where: {
                id: { in: descendantIds },
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                position: true,
                department: true,
                email: true,
                phone: true,
                avatar: true,
                joinDate: true,
                managerId: true,
            },
            orderBy: { name: 'asc' },
        });

        res.json({
            success: true,
            data: { team, count: team.length },
        });
    })
);

export default router;
