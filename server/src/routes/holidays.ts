import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

const router = Router();

router.use(authenticate);

// Validation schema for creating a holiday
const holidaySchema = z.object({
    name: z.string().min(1, 'Holiday name is required').max(100),
    date: z.string().min(1, 'Holiday date is required').refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid date format',
    }),
});

const toUtcDate = (date: string) => new Date(`${date.slice(0, 10)}T00:00:00.000Z`);

// GET /api/holidays - List holidays (anyone authenticated). Optional ?year=2026.
router.get(
    '/',
    asyncHandler(async (req, res) => {
        const year = Number(req.query['year']);
        const holidays = await prisma.holiday.findMany({
            where: Number.isInteger(year) && year > 1900
                ? { date: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } }
                : undefined,
            orderBy: { date: 'asc' },
        });
        res.json({ success: true, data: holidays });
    })
);

// POST /api/holidays - Add a new holiday (HR only)
router.post(
    '/',
    authorize('HR'),
    validate(holidaySchema),
    asyncHandler(async (req, res) => {
        const { name, date } = req.body;
        
        // Parse date as UTC at midnight to avoid timezone shift
        const parsedDate = new Date(`${date}T00:00:00.000Z`);

        // Check if a holiday already exists on this date
        const existing = await prisma.holiday.findUnique({
            where: { date: parsedDate },
        });

        if (existing) {
            throw new BadRequestError('A holiday is already scheduled on this date.');
        }

        const holiday = await prisma.holiday.create({
            data: {
                name,
                date: parsedDate,
            },
        });

        res.status(201).json({ success: true, data: holiday });
    })
);

// POST /api/holidays/bulk - Add many holidays at once (HR only). Dates that already have a
// holiday are skipped and reported, so re-running an import is safe.
router.post(
    '/bulk',
    authorize('HR'),
    validate(z.object({ holidays: z.array(holidaySchema).min(1).max(100) })),
    asyncHandler(async (req, res) => {
        const items = (req.body.holidays as { name: string; date: string }[])
            .map((h) => ({ name: h.name.trim(), date: toUtcDate(h.date) }));
        const existing = await prisma.holiday.findMany({
            where: { date: { in: items.map((h) => h.date) } },
            select: { date: true },
        });
        const taken = new Set(existing.map((h) => h.date.toISOString()));
        const seen = new Set<string>();
        const toCreate = items.filter((h) => {
            const key = h.date.toISOString();
            if (taken.has(key) || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        const { count } = toCreate.length ? await prisma.holiday.createMany({ data: toCreate }) : { count: 0 };
        res.status(201).json({
            success: true,
            data: { created: count, skipped: items.length - count },
            message: `${count} holiday${count === 1 ? '' : 's'} added${items.length - count ? `, ${items.length - count} skipped (date already has a holiday)` : ''}`,
        });
    })
);

// PUT /api/holidays/:id - Rename or move a holiday (HR only)
router.put(
    '/:id',
    authorize('HR'),
    validate(holidaySchema),
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid holiday ID');
        const { name, date } = req.body as { name: string; date: string };
        const parsedDate = toUtcDate(date);

        const existing = await prisma.holiday.findUnique({ where: { id } });
        if (!existing) throw new NotFoundError('Holiday not found');

        const clash = await prisma.holiday.findUnique({ where: { date: parsedDate } });
        if (clash && clash.id !== id) {
            throw new BadRequestError(`${clash.name} is already on this date.`);
        }

        const holiday = await prisma.holiday.update({ where: { id }, data: { name: name.trim(), date: parsedDate } });
        res.json({ success: true, data: holiday });
    })
);

// DELETE /api/holidays/:id - Delete a holiday (HR only)
router.delete(
    '/:id',
    authorize('HR'),
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid holiday ID');

        const existing = await prisma.holiday.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundError('Holiday not found');
        }

        await prisma.holiday.delete({
            where: { id },
        });

        res.json({ success: true, message: 'Holiday deleted successfully' });
    })
);

export default router;
