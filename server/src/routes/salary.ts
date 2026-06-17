import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/db.js';
import {
    authenticate,
    authorize,
    scopeData,
} from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import {
    decryptSalaryValue,
    encryptSalaryValue,
    verifySalaryApiKey,
} from '../utils/salarySecurity.js';

const router = Router();

// ─── API key only routes for the finance machine / Tally sync ───────────────

const salaryImportSchema = z.object({
    employeeId: z.number().int().positive(),
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM format'),
    workingDays: z.number().int().nonnegative(),
    daysPresent: z.number().int().nonnegative(),
    grossSalary: z.number().nonnegative(),
    totalDeductions: z.number().nonnegative(),
    netSalary: z.number(),
    breakdownJson: z.unknown().optional(),
});

const apiKeyMiddleware = (req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) => {
    try {
        verifySalaryApiKey(req.headers['x-salary-api-key'] as string | undefined);
        next();
    } catch (error) {
        next(error);
    }
};

router.get(
    '/mapped-employees',
    apiKeyMiddleware,
    asyncHandler(async (_req, res) => {
        const employees = await prisma.employee.findMany({
            where: {
                isActive: true,
                tallyLedgerName: { not: null },
            },
            select: {
                id: true,
                name: true,
                department: true,
                position: true,
                tallyLedgerName: true,
            },
            orderBy: { name: 'asc' },
        });

        res.json({
            success: true,
            data: {
                employees: employees.map(employee => ({
                    employeeId: employee.id,
                    name: employee.name,
                    department: employee.department,
                    position: employee.position,
                    tallyLedgerName: employee.tallyLedgerName,
                })),
            },
        });
    })
);

router.post(
    '/import',
    apiKeyMiddleware,
    validate(salaryImportSchema),
    asyncHandler(async (req, res) => {
        const payload = req.body as z.infer<typeof salaryImportSchema>;

        const employee = await prisma.employee.findFirst({
            where: {
                id: payload.employeeId,
                isActive: true,
                tallyLedgerName: { not: null },
            },
            select: { id: true, tallyLedgerName: true, name: true },
        });

        if (!employee) {
            throw new BadRequestError('Employee is not mapped for Tally import');
        }

        const slip = await prisma.salarySlip.upsert({
            where: {
                employeeId_month: {
                    employeeId: payload.employeeId,
                    month: payload.month,
                },
            },
            update: {
                grossSalary: encryptSalaryValue(payload.grossSalary),
                totalDeductions: encryptSalaryValue(payload.totalDeductions),
                netSalary: encryptSalaryValue(payload.netSalary),
                workingDays: payload.workingDays,
                daysPresent: payload.daysPresent,
                breakdownJson: encryptSalaryValue(payload.breakdownJson ?? null),
            },
            create: {
                employeeId: payload.employeeId,
                month: payload.month,
                grossSalary: encryptSalaryValue(payload.grossSalary),
                totalDeductions: encryptSalaryValue(payload.totalDeductions),
                netSalary: encryptSalaryValue(payload.netSalary),
                workingDays: payload.workingDays,
                daysPresent: payload.daysPresent,
                breakdownJson: encryptSalaryValue(payload.breakdownJson ?? null),
            },
        });

        res.json({
            success: true,
            message: `Salary data imported for ${employee.name} (${payload.month})`,
            data: {
                employeeId: employee.id,
                month: payload.month,
                updated: true,
                slipId: slip.id,
            },
        });
    })
);

// ─── Validation schemas ─────────────────────────────────────────────────────

const breakdownSchema = z.object({
    employeeId: z.number().int().positive(),
    basicSalary: z.number().min(0).default(0),
    hra: z.number().min(0).default(0),
    da: z.number().min(0).default(0),
    ta: z.number().min(0).default(0),
    medicalAllowance: z.number().min(0).default(0),
    specialAllowance: z.number().min(0).default(0),
    pf: z.number().min(0).default(0),
    esi: z.number().min(0).default(0),
    tax: z.number().min(0).default(0),
    otherDeductions: z.number().min(0).default(0),
    effectiveFrom: z.string().min(1),
});

const generateSlipSchema = z.object({
    employeeId: z.number().int().positive(),
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM format'),
    workingDays: z.number().int().positive(),
    daysPresent: z.number().int().min(0),
});

type DecryptedSlip = {
    id: number;
    employeeId: number;
    month: string;
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
    workingDays: number;
    daysPresent: number;
    breakdownJson: unknown;
    createdAt: Date;
    updatedAt: Date;
};

function getSelfEmployeeId(req: import('express').Request): number {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
        throw new ForbiddenError('This salary view requires an employee profile');
    }
    return employeeId;
}

function ensureSelfSalaryAccess(req: import('express').Request, targetEmployeeId: number): void {
    const employeeId = getSelfEmployeeId(req);
    if (employeeId !== targetEmployeeId) {
        throw new ForbiddenError('You can only view your own salary');
    }
}

function readEncryptedNumber(value: unknown): number {
    if (typeof value === 'number') {
        return value;
    }

    if (typeof value === 'string' && value.trim()) {
        try {
            const decrypted = decryptSalaryValue<number>(value);
            return Number(decrypted);
        } catch {
            const parsed = Number(value);
            if (!Number.isNaN(parsed)) {
                return parsed;
            }
        }
    }

    return 0;
}

function readEncryptedJson(value: unknown): unknown {
    if (typeof value === 'string' && value.trim()) {
        try {
            return decryptSalaryValue<unknown>(value);
        } catch {
            try {
                return JSON.parse(value);
            } catch {
                return null;
            }
        }
    }

    return value ?? null;
}

function normalizeSlip(row: {
    id: number;
    employeeId: number;
    month: string;
    grossSalary: unknown;
    totalDeductions: unknown;
    netSalary: unknown;
    workingDays: number;
    daysPresent: number;
    breakdownJson: unknown;
    createdAt: Date;
    updatedAt: Date;
}): DecryptedSlip {
    return {
        ...row,
        grossSalary: readEncryptedNumber(row.grossSalary),
        totalDeductions: readEncryptedNumber(row.totalDeductions),
        netSalary: readEncryptedNumber(row.netSalary),
        breakdownJson: readEncryptedJson(row.breakdownJson),
    };
}

// ─── Authenticated salary routes ────────────────────────────────────────────

router.use(authenticate, scopeData);

// ─── GET /api/salary/my/breakdown ───────────────────────────────────────────

router.get(
    '/my/breakdown',
    asyncHandler(async (req, res) => {
        const employeeId = getSelfEmployeeId(req);

        const breakdowns = await prisma.salaryBreakdown.findMany({
            where: { employeeId },
            orderBy: { effectiveFrom: 'desc' },
        });

        const latest = breakdowns[0];
        let totals = null;

        if (latest) {
            const gross = Number(latest.basicSalary) + Number(latest.hra) + Number(latest.da) +
                Number(latest.ta) + Number(latest.medicalAllowance) + Number(latest.specialAllowance);
            const deductions = Number(latest.pf) + Number(latest.esi) + Number(latest.tax) + Number(latest.otherDeductions);
            totals = { grossSalary: gross, totalDeductions: deductions, netSalary: gross - deductions };
        }

        res.json({
            success: true,
            data: { breakdowns, totals },
        });
    })
);

// ─── GET /api/salary/breakdown/:employeeId ─────────────────────────────────

router.get(
    '/breakdown/:employeeId',
    asyncHandler(async (req, res) => {
        const employeeId = parseInt(req.params['employeeId'] as string, 10);
        if (Number.isNaN(employeeId)) throw new BadRequestError('Invalid employee ID');

        ensureSelfSalaryAccess(req, employeeId);

        const breakdowns = await prisma.salaryBreakdown.findMany({
            where: { employeeId },
            orderBy: { effectiveFrom: 'desc' },
        });

        const latest = breakdowns[0];
        let totals = null;
        if (latest) {
            const gross = Number(latest.basicSalary) + Number(latest.hra) + Number(latest.da) +
                Number(latest.ta) + Number(latest.medicalAllowance) + Number(latest.specialAllowance);
            const deductions = Number(latest.pf) + Number(latest.esi) + Number(latest.tax) + Number(latest.otherDeductions);
            totals = { grossSalary: gross, totalDeductions: deductions, netSalary: gross - deductions };
        }

        res.json({
            success: true,
            data: { breakdowns, totals },
        });
    })
);

// ─── POST /api/salary/breakdown ────────────────────────────────────────────

router.post(
    '/breakdown',
    authorize('HR'),
    validate(breakdownSchema),
    asyncHandler(async (req, res) => {
        const data = req.body as z.infer<typeof breakdownSchema>;

        const breakdown = await prisma.salaryBreakdown.create({
            data: {
                ...data,
                effectiveFrom: new Date(data.effectiveFrom),
            },
        });

        res.status(201).json({
            success: true,
            data: { breakdown },
            message: 'Salary breakdown created',
        });
    })
);

// ─── GET /api/salary/my/slips ──────────────────────────────────────────────

router.get(
    '/my/slips',
    asyncHandler(async (req, res) => {
        const employeeId = getSelfEmployeeId(req);

        const slips = await prisma.salarySlip.findMany({
            where: { employeeId },
            orderBy: { month: 'desc' },
        });

        res.json({
            success: true,
            data: { slips: slips.map(normalizeSlip) },
        });
    })
);

// ─── GET /api/salary/my/slips/:month ───────────────────────────────────────

router.get(
    '/my/slips/:month',
    asyncHandler(async (req, res) => {
        const employeeId = getSelfEmployeeId(req);
        const month = req.params['month'] as string;
        if (!/^\d{4}-\d{2}$/.test(month)) {
            throw new BadRequestError('Month must be YYYY-MM format');
        }

        const slip = await prisma.salarySlip.findUnique({
            where: {
                employeeId_month: { employeeId, month },
            },
        });

        if (!slip) {
            throw new NotFoundError('Salary slip not found');
        }

        res.json({
            success: true,
            data: { slip: normalizeSlip(slip) },
        });
    })
);

// ─── GET /api/salary/slips/:employeeId ─────────────────────────────────────

router.get(
    '/slips/:employeeId',
    asyncHandler(async (req, res) => {
        const employeeId = parseInt(req.params['employeeId'] as string, 10);
        if (Number.isNaN(employeeId)) throw new BadRequestError('Invalid employee ID');

        ensureSelfSalaryAccess(req, employeeId);

        const slips = await prisma.salarySlip.findMany({
            where: { employeeId },
            orderBy: { month: 'desc' },
        });

        res.json({
            success: true,
            data: { slips: slips.map(normalizeSlip) },
        });
    })
);

// ─── POST /api/salary/slips/generate ───────────────────────────────────────

router.post(
    '/slips/generate',
    authorize('HR'),
    validate(generateSlipSchema),
    asyncHandler(async (req, res) => {
        const { employeeId, month, workingDays, daysPresent } = req.body as z.infer<typeof generateSlipSchema>;

        const breakdown = await prisma.salaryBreakdown.findFirst({
            where: { employeeId },
            orderBy: { effectiveFrom: 'desc' },
        });

        if (!breakdown) {
            throw new BadRequestError('No salary breakdown found for this employee');
        }

        const gross = Number(breakdown.basicSalary) + Number(breakdown.hra) + Number(breakdown.da) +
            Number(breakdown.ta) + Number(breakdown.medicalAllowance) + Number(breakdown.specialAllowance);
        const deductions = Number(breakdown.pf) + Number(breakdown.esi) + Number(breakdown.tax) + Number(breakdown.otherDeductions);

        const ratio = workingDays > 0 ? daysPresent / workingDays : 1;
        const proratedGross = Math.round(gross * ratio * 100) / 100;
        const netSalary = Math.round((proratedGross - deductions) * 100) / 100;
        const breakdownJson = {
            basicSalary: Number(breakdown.basicSalary),
            hra: Number(breakdown.hra),
            da: Number(breakdown.da),
            ta: Number(breakdown.ta),
            medicalAllowance: Number(breakdown.medicalAllowance),
            specialAllowance: Number(breakdown.specialAllowance),
            pf: Number(breakdown.pf),
            esi: Number(breakdown.esi),
            tax: Number(breakdown.tax),
            otherDeductions: Number(breakdown.otherDeductions),
        };

        const slip = await prisma.salarySlip.upsert({
            where: {
                employeeId_month: { employeeId, month },
            },
            update: {
                grossSalary: encryptSalaryValue(proratedGross),
                totalDeductions: encryptSalaryValue(deductions),
                netSalary: encryptSalaryValue(netSalary),
                workingDays,
                daysPresent,
                breakdownJson: encryptSalaryValue(breakdownJson),
            },
            create: {
                employeeId,
                month,
                grossSalary: encryptSalaryValue(proratedGross),
                totalDeductions: encryptSalaryValue(deductions),
                netSalary: encryptSalaryValue(netSalary),
                workingDays,
                daysPresent,
                breakdownJson: encryptSalaryValue(breakdownJson),
            },
        });

        res.json({
            success: true,
            data: { slip: normalizeSlip(slip) },
            message: `Salary slip generated for ${month}`,
        });
    })
);

export default router;
