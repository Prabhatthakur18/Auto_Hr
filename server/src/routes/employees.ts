import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/db.js';
import { authenticate, authorize, scopeData } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { hashPassword } from '../utils/password.js';

const router = Router();

// All employee routes require authentication + data scoping
router.use(authenticate, scopeData);

// ─── Validation schemas ──────────────────────────────────────

const createEmployeeSchema = z.object({
    biometricId: z.number().int().positive().optional(),
    name: z.string().min(1, 'Name is required').max(100),
    position: z.string().max(100).optional(),
    department: z.string().max(100).optional(),
    email: z.string().email('Invalid email').max(100).optional(),
    phone: z.string().max(20).optional(),
    joinDate: z.string().optional(), // ISO date string
    managerId: z.number().int().positive().optional().nullable(),
    avatar: z.string().url().max(500).optional(),
    bio: z.string().optional(),
    skills: z.array(z.string()).optional(),
    experience: z.string().optional(),
    education: z.string().max(255).optional(),
    employeeType: z.string().max(50).optional(),

    // Optional: create a user account for this employee
    createUser: z.boolean().optional(),
    username: z.string().min(1).max(50).optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').max(128).optional(),
    role: z.enum(['EMPLOYEE', 'MANAGER', 'HR']).optional(),
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

function buildWhereClause(req: Express.Request) {
    const scope = req.dataScope!;

    switch (scope.type) {
        case 'self':
            // Employee can only see themselves
            if (!scope.employeeId) return { id: -1 }; // no results
            return { id: scope.employeeId };

        case 'team':
            // Manager sees self + direct reports
            if (!scope.employeeId) return { id: -1 };
            return {
                OR: [
                    { id: scope.employeeId },
                    { managerId: scope.employeeId },
                ],
            };

        case 'all':
            // HR sees everyone
            return {};

        default:
            return { id: -1 };
    }
}

// ─── GET /api/employees ──────────────────────────────────────
// List employees (filtered by role scope)

router.get(
    '/',
    validate(querySchema, 'query'),
    asyncHandler(async (req, res) => {
        const { search, department, managerId, page, limit } = req.query as unknown as z.infer<typeof querySchema>;

        const scopeWhere = buildWhereClause(req);
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
                    employeeType: true,
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

// ─── GET /api/employees/:id ──────────────────────────────────
// Full employee profile (all data)

router.get(
    '/:id',
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid employee ID');

        // Check scope: can this user see this employee?
        const scope = req.dataScope!;
        if (scope.type === 'self' && scope.employeeId !== id) {
            throw new ForbiddenError('You can only view your own profile');
        }

        if (scope.type === 'team' && scope.employeeId !== id) {
            // Check if the employee is a direct report
            const isReport = await prisma.employee.findFirst({
                where: { id, managerId: scope.employeeId! },
            });
            if (!isReport) {
                throw new ForbiddenError('You can only view your own team members');
            }
        }

        const employee = await prisma.employee.findUnique({
            where: { id },
            include: {
                manager: {
                    select: { id: true, name: true, position: true },
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
            ...employeeData
        } = req.body as z.infer<typeof createEmployeeSchema>;

        // Create employee
        const employee = await prisma.employee.create({
            data: {
                ...employeeData,
                joinDate: joinDate ? new Date(joinDate) : undefined,
            },
        });

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

        const { createUser, username, password, role, joinDate, ...updateData } = req.body as z.infer<typeof updateEmployeeSchema>;

        const employee = await prisma.employee.update({
            where: { id },
            data: {
                ...updateData,
                joinDate: joinDate ? new Date(joinDate) : undefined,
            },
        });

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

        // Only allow viewing own team or HR viewing anyone's team
        const scope = req.dataScope!;
        if (scope.type === 'self') {
            throw new ForbiddenError('Employees cannot view team data');
        }
        if (scope.type === 'team' && scope.employeeId !== id) {
            throw new ForbiddenError('You can only view your own team');
        }

        const team = await prisma.employee.findMany({
            where: {
                managerId: id,
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
