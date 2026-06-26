import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
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
import {
    parsePayrollJson,
    parsePayrollXml,
    parsePayrollXlsx,
    type ParsedEmployeePaysheet,
} from '../utils/payrollImport.js';
import { notify, getEmployeeUserId, notifyEmployeesBulk } from '../utils/notificationService.js';

const router = Router();
const payrollUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
});

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
    generatedAt: Date;
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
    generatedAt: Date;
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

        const earningLabels: [string, number][] = [
            ['Basic Salary', Number(breakdown.basicSalary)],
            ['HRA', Number(breakdown.hra)],
            ['DA', Number(breakdown.da)],
            ['TA', Number(breakdown.ta)],
            ['Medical Allowance', Number(breakdown.medicalAllowance)],
            ['Special Allowance', Number(breakdown.specialAllowance)],
        ];
        const deductionLabels: [string, number][] = [
            ['PF', Number(breakdown.pf)],
            ['ESI', Number(breakdown.esi)],
            ['TDS', Number(breakdown.tax)],
            ['Other Deductions', Number(breakdown.otherDeductions)],
        ];
        const breakdownJson = {
            earnings: earningLabels.filter(([, amount]) => amount > 0).map(([label, amount]) => ({ label, amount: Math.round(amount * ratio * 100) / 100 })),
            deductions: deductionLabels.filter(([, amount]) => amount > 0).map(([label, amount]) => ({ label, amount })),
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

        const employeeUserId = await getEmployeeUserId(employeeId);
        if (employeeUserId) {
            await notify({
                recipientIds: [employeeUserId],
                excludeUserId: req.user!.userId,
                type: 'SALARY_SLIP_READY',
                title: 'Salary slip ready',
                message: `Your salary slip for ${month} is now available.`,
                entityId: slip.id,
                employeeId,
            });
        }

        res.json({
            success: true,
            data: { slip: normalizeSlip(slip) },
            message: `Salary slip generated for ${month}`,
        });
    })
);

// ─── Tally JSON/XML payroll import (HR-only, browser session) ─────────────

const importMonthSchema = z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM format'),
});

interface PreviewRow {
    ledgerName: string;
    employeeId: number | null;
    employeeName: string | null;
    matched: boolean;
    earnings: { label: string; amount: number }[];
    deductions: { label: string; amount: number }[];
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
}

/** Tally exports JSON/XML as UTF-16 LE (with BOM) on Windows; decode accordingly. */
function decodeFileBuffer(buffer: Buffer): string {
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
        return buffer.subarray(2).toString('utf16le');
    }
    if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
        return buffer.subarray(2).swap16().toString('utf16le');
    }
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
        return buffer.subarray(3).toString('utf8');
    }
    return buffer.toString('utf8');
}

async function parsePayrollFile(file: Express.Multer.File): Promise<{ paysheets: ParsedEmployeePaysheet[]; detectedMonth: string | null }> {
    const lowerName = file.originalname.toLowerCase();

    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || file.mimetype.includes('spreadsheet')) {
        return parsePayrollXlsx(file.buffer);
    }

    const isXml = file.mimetype.includes('xml') || lowerName.endsWith('.xml');
    const raw = decodeFileBuffer(file.buffer);

    if (isXml) {
        return { paysheets: await parsePayrollXml(raw), detectedMonth: null };
    }

    try {
        return { paysheets: parsePayrollJson(raw), detectedMonth: null };
    } catch (err) {
        throw new BadRequestError(
            err instanceof Error ? err.message : 'Could not parse this file. Export the Pay Sheet as XLSX for best results.'
        );
    }
}

async function buildPreviewRows(paysheets: ParsedEmployeePaysheet[]): Promise<PreviewRow[]> {
    const employees = await prisma.employee.findMany({
        where: { isActive: true, tallyLedgerName: { not: null } },
        select: { id: true, name: true, tallyLedgerName: true },
    });

    const byLedgerName = new Map(
        employees.map((e) => [e.tallyLedgerName!.trim().toLowerCase(), e])
    );

    return paysheets.map((sheet): PreviewRow => {
        const employee = byLedgerName.get(sheet.employeeLabel.trim().toLowerCase());

        return {
            ledgerName: sheet.employeeLabel,
            employeeId: employee?.id ?? null,
            employeeName: employee?.name ?? null,
            matched: Boolean(employee),
            earnings: sheet.earnings,
            deductions: sheet.deductions,
            grossSalary: sheet.grossSalary,
            totalDeductions: sheet.totalDeductions,
            netSalary: sheet.netSalary,
        };
    });
}

// ─── POST /api/salary/import/preview ───────────────────────────────────────
// HR uploads a JSON/XML payroll export; nothing is written to the database.
// Returns matched/unmatched employees and computed totals for review.

router.post(
    '/import/preview',
    authorize('HR'),
    payrollUpload.single('file'),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            throw new BadRequestError('A JSON or XML payroll export file is required');
        }

        const { month } = importMonthSchema.parse({ month: req.body.month });

        const { paysheets, detectedMonth } = await parsePayrollFile(req.file);
        if (paysheets.length === 0) {
            throw new BadRequestError('No payroll records found in the uploaded file');
        }

        const rows = await buildPreviewRows(paysheets);
        const matchedCount = rows.filter((r) => r.matched).length;

        const matchedIds = rows.filter((r) => r.employeeId !== null).map((r) => r.employeeId as number);
        const existingCount = matchedIds.length
            ? await prisma.salarySlip.count({ where: { month, employeeId: { in: matchedIds } } })
            : 0;

        res.json({
            success: true,
            data: {
                rows,
                summary: {
                    total: rows.length,
                    matched: matchedCount,
                    unmatched: rows.length - matchedCount,
                    alreadyImported: existingCount,
                },
                detectedMonth,
                monthMismatch: Boolean(detectedMonth && detectedMonth !== month),
            },
        });
    })
);

// ─── POST /api/salary/import/commit ────────────────────────────────────────
// Re-parses the same file and writes encrypted salary slips for matched
// employees only. Unmatched ledger names are skipped and reported back.

router.post(
    '/import/commit',
    authorize('HR'),
    payrollUpload.single('file'),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            throw new BadRequestError('A JSON or XML payroll export file is required');
        }

        const { month } = importMonthSchema.parse({ month: req.body.month });
        const overwrite = req.body.overwrite === 'true' || req.body.overwrite === true;
        const acknowledgeMonthMismatch = req.body.acknowledgeMonthMismatch === 'true' || req.body.acknowledgeMonthMismatch === true;

        const { paysheets, detectedMonth } = await parsePayrollFile(req.file);
        if (paysheets.length === 0) {
            throw new BadRequestError('No payroll records found in the uploaded file');
        }

        if (detectedMonth && detectedMonth !== month && !acknowledgeMonthMismatch) {
            throw new BadRequestError(
                `This file's pay period looks like ${detectedMonth}, but you selected ${month}. Confirm to proceed if this is intentional.`
            );
        }

        const rows = await buildPreviewRows(paysheets);
        const matchedIds = rows.filter((r) => r.employeeId !== null).map((r) => r.employeeId as number);

        if (!overwrite && matchedIds.length) {
            const existingCount = await prisma.salarySlip.count({
                where: { month, employeeId: { in: matchedIds } },
            });
            if (existingCount > 0) {
                throw new BadRequestError(
                    `${existingCount} employee(s) already have salary data for ${month}. Confirm overwrite to proceed.`
                );
            }
        }

        const daysInMonth = new Date(
            Number(month.slice(0, 4)),
            Number(month.slice(5, 7)),
            0
        ).getDate();

        let imported = 0;
        const skipped: string[] = [];
        const slipIdByEmployeeId = new Map<number, number>();

        for (const row of rows) {
            if (!row.matched || row.employeeId === null) {
                skipped.push(row.ledgerName);
                continue;
            }

            const breakdownPayload = {
                earnings: row.earnings,
                deductions: row.deductions,
            };

            const slip = await prisma.salarySlip.upsert({
                where: { employeeId_month: { employeeId: row.employeeId, month } },
                update: {
                    grossSalary: encryptSalaryValue(row.grossSalary),
                    totalDeductions: encryptSalaryValue(row.totalDeductions),
                    netSalary: encryptSalaryValue(row.netSalary),
                    workingDays: daysInMonth,
                    daysPresent: daysInMonth,
                    breakdownJson: encryptSalaryValue(breakdownPayload),
                },
                create: {
                    employeeId: row.employeeId,
                    month,
                    grossSalary: encryptSalaryValue(row.grossSalary),
                    totalDeductions: encryptSalaryValue(row.totalDeductions),
                    netSalary: encryptSalaryValue(row.netSalary),
                    workingDays: daysInMonth,
                    daysPresent: daysInMonth,
                    breakdownJson: encryptSalaryValue(breakdownPayload),
                },
            });
            slipIdByEmployeeId.set(row.employeeId, slip.id);
            imported += 1;
        }

        await prisma.payrollImportLog.create({
            data: {
                month,
                fileName: req.file.originalname,
                totalRecords: rows.length,
                importedCount: imported,
                skippedLedgers: skipped.length ? skipped.join(', ') : null,
                importedById: req.user!.userId,
            },
        });

        await notifyEmployeesBulk(
            [...slipIdByEmployeeId.keys()],
            'SALARY_SLIP_READY',
            (employeeId) => ({
                title: 'Salary slip ready',
                message: `Your salary slip for ${month} is now available.`,
                entityId: slipIdByEmployeeId.get(employeeId),
            }),
            req.user!.userId
        );

        res.json({
            success: true,
            message: `Imported salary data for ${imported} employee(s) for ${month}`,
            data: { imported, skipped },
        });
    })
);

// ─── GET /api/salary/import/history ────────────────────────────────────────

router.get(
    '/import/history',
    authorize('HR'),
    asyncHandler(async (_req, res) => {
        const logs = await prisma.payrollImportLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: { importedBy: { select: { username: true } } },
        });

        res.json({ success: true, data: { logs } });
    })
);

export default router;
