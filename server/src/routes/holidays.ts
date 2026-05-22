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

// GET /api/holidays - List all holidays (accessible by anyone authenticated)
router.get(
    '/',
    asyncHandler(async (_req, res) => {
        const holidays = await prisma.holiday.findMany({
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
