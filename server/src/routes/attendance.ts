import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import * as XLSX from 'xlsx';
// @ts-ignore
import ZKLib from 'zkteco-js';
import prisma from '../config/db.js';
import { authenticate, authorize, scopeData } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ForbiddenError, BadRequestError } from '../utils/errors.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate, scopeData);

// ─── Validation schemas ──────────────────────────────────────

const manualEntrySchema = z.object({
    employeeId: z.number().int().positive(),
    date: z.string().min(1),
    checkIn: z.string().optional(),
    checkOut: z.string().optional(),
    status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY']).optional(),
});


// ─── Biometric file parsing (ported from Python) ─────────────

interface BiometricRecord {
    enNo: number;
    dateTime: Date;
    date: string;
    time: string;
}

function parseBiometricFile(buffer: Buffer): BiometricRecord[] {
    const records: BiometricRecord[] = [];

    // Detect BOM or check for null bytes to identify UTF-16LE encoding
    let encoding: BufferEncoding = 'utf-8';
    if (buffer[0] === 0xff && buffer[1] === 0xfe) {
        encoding = 'utf16le';
    } else if (buffer[0] === 0xfe && buffer[1] === 0xff) {
        encoding = 'utf16le';
    } else {
        // Fallback: if it contains a high density of null bytes, it's UTF-16LE
        let nullCount = 0;
        const testLen = Math.min(buffer.length, 1000);
        for (let i = 0; i < testLen; i++) {
            if (buffer[i] === 0) nullCount++;
        }
        if (nullCount > testLen / 4) {
            encoding = 'utf16le';
        }
    }

    const content = buffer.toString(encoding).trim();
    // Remove any trailing or remaining null bytes
    const cleanedContent = content.replace(/\0/g, '');

    const lines = cleanedContent.split(/\r?\n/);
    const dataLines = lines.slice(1);

    for (const line of dataLines) {
        if (!line.trim()) continue;

        const enNoMatch = line.match(/\b(0+\d+)\b/);
        const dtMatch = line.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);

        if (enNoMatch && dtMatch) {
            const enNo = parseInt(enNoMatch[1]!, 10);
            const dt = new Date(dtMatch[1]!);

            if (!isNaN(dt.getTime())) {
                records.push({
                    enNo,
                    dateTime: dt,
                    date: dtMatch[1]!.split(' ')[0]!,
                    time: dtMatch[1]!.split(' ')[1]!,
                });
            }
        }
    }

    return records;
}

function processAttendanceRecords(records: BiometricRecord[]) {
    // Group by employee + date
    const grouped = new Map<string, BiometricRecord[]>();

    for (const record of records) {
        const key = `${record.enNo}-${record.date}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(record);
    }

    const LATE_THRESHOLD = '09:30:00';
    const results: Array<{
        biometricId: number;
        date: string;
        day: string;
        checkIn: string;
        checkOut: string;
        totalWorkingHours: string;
        isLate: boolean;
        lateBy: string;
        overtime: boolean;
        otTime: string;
    }> = [];

    for (const [, dayRecords] of grouped) {
        const first = dayRecords[0]!;
        const times = dayRecords.map(r => r.dateTime);
        const minTime = new Date(Math.min(...times.map(t => t.getTime())));
        const maxTime = new Date(Math.max(...times.map(t => t.getTime())));

        const inTime = minTime.toTimeString().slice(0, 8);
        const outTime = maxTime.toTimeString().slice(0, 8);

        // Check late
        const isLate = inTime > LATE_THRESHOLD;
        let lateBy = '';
        if (isLate) {
            const lateSecs = (minTime.getHours() * 3600 + minTime.getMinutes() * 60 + minTime.getSeconds()) -
                (9 * 3600 + 30 * 60);
            const hrs = Math.floor(lateSecs / 3600);
            const mins = Math.floor((lateSecs % 3600) / 60);
            const parts = [];
            if (hrs > 0) parts.push(`${hrs} hr`);
            if (mins > 0) parts.push(`${mins} mins`);
            lateBy = parts.join(' ') || '0 mins';
        }

        // Working hours
        const workSecs = Math.floor((maxTime.getTime() - minTime.getTime()) / 1000);
        const wh = Math.floor(workSecs / 3600);
        const wm = Math.floor((workSecs % 3600) / 60);
        const ws = workSecs % 60;
        const totalWorkingHours = `${String(wh).padStart(2, '0')}:${String(wm).padStart(2, '0')}:${String(ws).padStart(2, '0')}`;

        // Overtime (after 18:00)
        const overtime = outTime > '18:00:00';
        let otTime = '';
        if (overtime) {
            const otSecs = (maxTime.getHours() * 3600 + maxTime.getMinutes() * 60 + maxTime.getSeconds()) - (18 * 3600);
            if (otSecs > 0) {
                const oh = Math.floor(otSecs / 3600);
                const om = Math.floor((otSecs % 3600) / 60);
                const os = otSecs % 60;
                otTime = `${String(oh).padStart(2, '0')}:${String(om).padStart(2, '0')}:${String(os).padStart(2, '0')}`;
            }
        }

        const dateObj = new Date(first.date);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        results.push({
            biometricId: first.enNo,
            date: first.date,
            day: days[dateObj.getDay()] || '',
            checkIn: inTime,
            checkOut: outTime,
            totalWorkingHours,
            isLate,
            lateBy,
            overtime,
            otTime,
        });
    }

    return results;
}

// ─── GET /api/attendance/:employeeId ─────────────────────────

router.get(
    '/:employeeId',
    asyncHandler(async (req, res) => {
        const employeeId = parseInt(req.params['employeeId'] as string, 10);
        if (isNaN(employeeId)) throw new BadRequestError('Invalid employee ID');

        // Data isolation check
        const scope = req.dataScope!;
        if (scope.type === 'self' && scope.employeeId !== employeeId) {
            throw new ForbiddenError('You can only view your own attendance');
        }
        if (scope.type === 'team' && scope.employeeId !== employeeId) {
            const isReport = await prisma.employee.findFirst({
                where: { id: employeeId, managerId: scope.employeeId! },
            });
            if (!isReport) throw new ForbiddenError('You can only view your team\'s attendance');
        }

        const month = req.query['month'] as string | undefined;
        const startDate = req.query['startDate'] as string | undefined;
        const endDate = req.query['endDate'] as string | undefined;

        let dateFilter: Record<string, unknown> = {};
        if (month) {
            const [year, mon] = month.split('-').map(Number);
            const start = new Date(year!, mon! - 1, 1);
            const end = new Date(year!, mon!, 0);
            dateFilter = { date: { gte: start, lte: end } };
        } else if (startDate && endDate) {
            dateFilter = { date: { gte: new Date(startDate), lte: new Date(endDate) } };
        }

        const attendance = await prisma.attendance.findMany({
            where: { employeeId, ...dateFilter },
            orderBy: { date: 'desc' },
        });

        // Monthly summary
        const summary = {
            total: attendance.length,
            present: attendance.filter(a => a.status === 'PRESENT').length,
            absent: attendance.filter(a => a.status === 'ABSENT').length,
            halfDay: attendance.filter(a => a.status === 'HALF_DAY').length,
            onLeave: attendance.filter(a => a.status === 'ON_LEAVE').length,
            holiday: attendance.filter(a => a.status === 'HOLIDAY').length,
            lateDays: attendance.filter(a => a.isLate).length,
            overtimeDays: attendance.filter(a => a.overtime).length,
        };

        res.json({
            success: true,
            data: { attendance, summary },
        });
    })
);

// ─── POST /api/attendance/upload/biometric ───────────────────
// Upload raw biometric .txt file (HR only)

router.post(
    '/upload/biometric',
    authorize('HR'),
    upload.single('file'),
    asyncHandler(async (req, res) => {
        if (!req.file) throw new BadRequestError('No file uploaded');

        const { targetMonth } = req.body;

        let records = parseBiometricFile(req.file.buffer);
        if (records.length === 0) throw new BadRequestError('No valid records found in file');

        if (targetMonth) {
            records = records.filter(r => r.date.startsWith(targetMonth));
            if (records.length === 0) {
                throw new BadRequestError(`No records found in file matching target month: ${targetMonth}`);
            }
        }

        const processed = processAttendanceRecords(records);

        // Map biometric IDs to employee IDs
        const biometricIds = [...new Set(processed.map(r => r.biometricId))];
        const employees = await prisma.employee.findMany({
            where: { biometricId: { in: biometricIds } },
            select: { id: true, biometricId: true },
        });
        const bioToEmpId = new Map(employees.map(e => [e.biometricId, e.id]));

        const validProcessed = processed.filter(r => bioToEmpId.has(r.biometricId));
        const unmapped = processed.length - validProcessed.length;

        let inserted = 0;
        let skipped = 0;

        if (validProcessed.length > 0) {
            try {
                await prisma.$transaction(async (tx) => {
                    const deleteConditions = validProcessed.map(r => ({
                        employeeId: bioToEmpId.get(r.biometricId)!,
                        date: new Date(r.date),
                    }));

                    await tx.attendance.deleteMany({
                        where: {
                            OR: deleteConditions,
                        },
                    });

                    await tx.attendance.createMany({
                        data: validProcessed.map(r => ({
                            employeeId: bioToEmpId.get(r.biometricId)!,
                            date: new Date(r.date),
                            day: r.day,
                            checkIn: r.checkIn,
                            checkOut: r.checkOut,
                            totalWorkingHours: r.totalWorkingHours,
                            isLate: r.isLate,
                            lateBy: r.lateBy,
                            overtime: r.overtime,
                            otTime: r.otTime,
                            status: 'PRESENT',
                        })),
                    });
                });
                inserted = validProcessed.length;
            } catch (err) {
                skipped = validProcessed.length;
            }
        }

        res.json({
            success: true,
            message: `Biometric data processed`,
            data: {
                totalRecords: records.length,
                processedDays: processed.length,
                inserted,
                skipped,
                unmappedEmployees: unmapped,
            },
        });
    })
);

// ─── POST /api/attendance/upload/excel ───────────────────────
// Upload processed Excel from attendance portal (HR only)

router.post(
    '/upload/excel',
    authorize('HR'),
    upload.single('file'),
    asyncHandler(async (req, res) => {
        if (!req.file) throw new BadRequestError('No file uploaded');

        const { targetMonth } = req.body;

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]!];
        if (!sheet) throw new BadRequestError('Empty spreadsheet');

        let rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

        if (targetMonth) {
            const [year, month] = targetMonth.split('-').map(Number);
            rows = rows.filter(row => {
                const dateStr = String(row['Date'] || '');
                if (!dateStr) return false;
                const d = new Date(dateStr);
                return d.getFullYear() === year && (d.getMonth() + 1) === month;
            });
            if (rows.length === 0) {
                throw new BadRequestError(`No records found in Excel matching target month: ${targetMonth}`);
            }
        }

        // Map biometric IDs to employee IDs
        const employees = await prisma.employee.findMany({
            select: { id: true, biometricId: true },
        });
        const bioToEmpId = new Map(employees.map(e => [e.biometricId, e.id]));

        const validRows: Array<{ empId: number; date: Date; row: Record<string, any> }> = [];
        let skipped = 0;

        for (const row of rows) {
            const bioId = Number(row['ID']);
            const empId = bioToEmpId.get(bioId);
            const dateStr = String(row['Date'] || '');

            if (!empId || !dateStr) {
                skipped++;
                continue;
            }

            validRows.push({
                empId,
                date: new Date(dateStr),
                row,
            });
        }

        let inserted = 0;

        if (validRows.length > 0) {
            try {
                await prisma.$transaction(async (tx) => {
                    const deleteConditions = validRows.map(vr => ({
                        employeeId: vr.empId,
                        date: vr.date,
                    }));

                    await tx.attendance.deleteMany({
                        where: {
                            OR: deleteConditions,
                        },
                    });

                    await tx.attendance.createMany({
                        data: validRows.map(vr => {
                            const row = vr.row;
                            const inTime = String(row['IN'] || '');
                            const remark = String(row['Remark'] || '');
                            const ot = String(row['Overtime'] || '');
                            return {
                                employeeId: vr.empId,
                                date: vr.date,
                                day: String(row['Day'] || ''),
                                checkIn: inTime || null,
                                checkOut: String(row['OUT'] || '') || null,
                                totalWorkingHours: String(row['Total working Hours'] || '') || null,
                                isLate: remark.toLowerCase().includes('late'),
                                lateBy: String(row['Late By'] || '') || null,
                                overtime: ot.toLowerCase() === 'yes',
                                otTime: String(row['OT time'] || '') || null,
                                status: inTime ? 'PRESENT' : 'ABSENT',
                            };
                        }),
                    });
                });
                inserted = validRows.length;
            } catch (err) {
                skipped += validRows.length;
            }
        }

        res.json({
            success: true,
            message: 'Excel attendance data imported',
            data: { totalRows: rows.length, inserted, skipped },
        });
    })
);

// ─── POST /api/attendance/manual ─────────────────────────────
// Manual attendance entry (HR only)

router.post(
    '/manual',
    authorize('HR'),
    validate(manualEntrySchema),
    asyncHandler(async (req, res) => {
        const { employeeId, date, checkIn, checkOut, status } = req.body as z.infer<typeof manualEntrySchema>;

        const dateObj = new Date(date);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        const attendance = await prisma.attendance.upsert({
            where: {
                employeeId_date: {
                    employeeId,
                    date: dateObj,
                },
            },
            update: {
                checkIn: checkIn || null,
                checkOut: checkOut || null,
                status: status || 'PRESENT',
            },
            create: {
                employeeId,
                date: dateObj,
                day: days[dateObj.getDay()] || '',
                checkIn: checkIn || null,
                checkOut: checkOut || null,
                status: status || 'PRESENT',
            },
        });

        res.json({
            success: true,
            data: { attendance },
            message: 'Attendance record saved',
        });
    })
);

// ─── POST /api/attendance/sync-device ────────────────────────
// Auto-sync attendance directly from ZKTeco/Secureye machine (READ ONLY)

router.post(
    '/sync-device',
    authorize('HR'),
    asyncHandler(async (_req, res) => {
        const ip = process.env.BIOMETRIC_DEVICE_IP;
        const port = Number(process.env.BIOMETRIC_DEVICE_PORT) || 4370;

        if (!ip) throw new BadRequestError('BIOMETRIC_DEVICE_IP is not configured in .env');

        let zkInstance: any = null;
        try {
            zkInstance = new ZKLib(ip, port, 10000, 4000);
            
            // 1. Connect to device
            await zkInstance.createSocket();
            
            // 2. Read attendance log (READ ONLY)
            const attendances = await zkInstance.getAttendances();
            
            if (!attendances || !attendances.data || attendances.data.length === 0) {
                 await zkInstance.disconnect();
                 res.json({ success: true, message: 'No new attendance data found on device', data: { inserted: 0, skipped: 0 } });
                 return;
            }

            // 3. Convert raw device data to our BiometricRecord format
            const records: BiometricRecord[] = attendances.data.map((log: any) => {
                const dt = new Date(log.recordTime);
                return {
                    enNo: parseInt(log.deviceUserId, 10),
                    dateTime: dt,
                    date: dt.toISOString().split('T')[0],
                    time: dt.toTimeString().split(' ')[0],
                };
            });

            // 4. Process and group records using existing logic
            const processed = processAttendanceRecords(records);

            // 5. Save to database
            const biometricIds = [...new Set(processed.map(r => r.biometricId))];
            const employees = await prisma.employee.findMany({
                where: { biometricId: { in: biometricIds } },
                select: { id: true, biometricId: true },
            });
            const bioToEmpId = new Map(employees.map(e => [e.biometricId, e.id]));

            let inserted = 0;
            let skipped = 0;
            let unmapped = 0;

            for (const record of processed) {
                const empId = bioToEmpId.get(record.biometricId);
                if (!empId) { unmapped++; continue; }

                try {
                    await prisma.attendance.upsert({
                        where: {
                            employeeId_date: {
                                employeeId: empId,
                                date: new Date(record.date),
                            },
                        },
                        update: {
                            checkIn: record.checkIn,
                            checkOut: record.checkOut,
                            day: record.day,
                            totalWorkingHours: record.totalWorkingHours,
                            isLate: record.isLate,
                            lateBy: record.lateBy,
                            overtime: record.overtime,
                            otTime: record.otTime,
                            status: 'PRESENT',
                        },
                        create: {
                            employeeId: empId,
                            date: new Date(record.date),
                            day: record.day,
                            checkIn: record.checkIn,
                            checkOut: record.checkOut,
                            totalWorkingHours: record.totalWorkingHours,
                            isLate: record.isLate,
                            lateBy: record.lateBy,
                            overtime: record.overtime,
                            otTime: record.otTime,
                            status: 'PRESENT',
                        },
                    });
                    inserted++;
                } catch {
                    skipped++;
                }
            }
            
            // Disconnect safely
            await zkInstance.disconnect();

            res.json({
                success: true,
                message: 'Device sync complete',
                data: {
                    totalRecords: records.length,
                    processedDays: processed.length,
                    inserted,
                    skipped,
                    unmappedEmployees: unmapped,
                },
            });
        } catch (error: any) {
            if (zkInstance) {
                try { await zkInstance.disconnect(); } catch (e) {}
            }
            throw new BadRequestError(`Failed to sync with device: ${error.message || 'Connection Timeout'}`);
        }
    })
);

export default router;
