import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/db.js';
import { authenticate, authorize, scopeData } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ForbiddenError, BadRequestError } from '../utils/errors.js';

const router = Router();

router.use(authenticate, scopeData);

// ─── Validation schemas ──────────────────────────────────────

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

// ─── GET /api/salary/breakdown/:employeeId ───────────────────

router.get(
    '/breakdown/:employeeId',
    asyncHandler(async (req, res) => {
        const employeeId = parseInt(req.params['employeeId'] as string, 10);
        if (isNaN(employeeId)) throw new BadRequestError('Invalid employee ID');

        // Data isolation
        const scope = req.dataScope!;
        if (scope.type === 'self' && scope.employeeId !== employeeId) {
            throw new ForbiddenError('You can only view your own salary');
        }
        if (scope.type === 'team' && scope.employeeId !== employeeId) {
            const isReport = await prisma.employee.findFirst({
                where: { id: employeeId, managerId: scope.employeeId! },
            });
            if (!isReport) throw new ForbiddenError('You can only view your team\'s salary');
        }

        const breakdowns = await prisma.salaryBreakdown.findMany({
            where: { employeeId },
            orderBy: { effectiveFrom: 'desc' },
        });

        // Calculate totals for the latest breakdown
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

// ─── POST /api/salary/breakdown ──────────────────────────────
// Create/update salary breakdown (HR only)

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

// ─── GET /api/salary/slips/:employeeId ───────────────────────

router.get(
    '/slips/:employeeId',
    asyncHandler(async (req, res) => {
        const employeeId = parseInt(req.params['employeeId'] as string, 10);
        if (isNaN(employeeId)) throw new BadRequestError('Invalid employee ID');

        // Data isolation
        const scope = req.dataScope!;
        if (scope.type === 'self' && scope.employeeId !== employeeId) {
            throw new ForbiddenError('You can only view your own salary slips');
        }
        if (scope.type === 'team' && scope.employeeId !== employeeId) {
            const isReport = await prisma.employee.findFirst({
                where: { id: employeeId, managerId: scope.employeeId! },
            });
            if (!isReport) throw new ForbiddenError('You can only view your team\'s salary slips');
        }

        const slips = await prisma.salarySlip.findMany({
            where: { employeeId },
            orderBy: { month: 'desc' },
        });

        res.json({ success: true, data: { slips } });
    })
);

// ─── POST /api/salary/slips/generate ─────────────────────────
// Generate a salary slip for a month (HR only)

router.post(
    '/slips/generate',
    authorize('HR'),
    validate(generateSlipSchema),
    asyncHandler(async (req, res) => {
        const { employeeId, month, workingDays, daysPresent } = req.body as z.infer<typeof generateSlipSchema>;

        // Get latest salary breakdown
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

        // Pro-rate based on attendance
        const ratio = workingDays > 0 ? daysPresent / workingDays : 1;
        const proratedGross = Math.round(gross * ratio * 100) / 100;
        const netSalary = Math.round((proratedGross - deductions) * 100) / 100;

        const slip = await prisma.salarySlip.upsert({
            where: {
                employeeId_month: { employeeId, month },
            },
            update: {
                grossSalary: proratedGross,
                totalDeductions: deductions,
                netSalary,
                workingDays,
                daysPresent,
                breakdownJson: {
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
                },
            },
            create: {
                employeeId,
                month,
                grossSalary: proratedGross,
                totalDeductions: deductions,
                netSalary,
                workingDays,
                daysPresent,
                breakdownJson: {
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
                },
            },
        });

        res.json({
            success: true,
            data: { slip },
            message: `Salary slip generated for ${month}`,
        });
    })
);

export default router;
