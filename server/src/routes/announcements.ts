import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import prisma from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

// ─── Validation schemas ──────────────────────────────────────

const createAnnouncementSchema = z.object({
    title: z.string().min(1).max(255),
    content: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    expiresAt: z.string().optional(),
});

const updateAnnouncementSchema = createAnnouncementSchema.partial();

// ─── GET /api/announcements ──────────────────────────────────
// All authenticated users can see announcements

router.get(
    '/',
    asyncHandler(async (_req, res) => {
        const announcements = await prisma.announcement.findMany({
            where: {
                isActive: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gte: new Date() } },
                ],
            },
            include: {
                createdBy: { select: { username: true } },
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' },
            ],
        });

        res.json({ success: true, data: { announcements } });
    })
);

// ─── GET /api/announcements/:id ──────────────────────────────

router.get(
    '/:id',
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid announcement ID');

        const announcement = await prisma.announcement.findUnique({
            where: { id },
            include: { createdBy: { select: { username: true } } },
        });

        if (!announcement || !announcement.isActive) {
            throw new NotFoundError('Announcement not found');
        }

        res.json({ success: true, data: { announcement } });
    })
);

// ─── POST /api/announcements ─────────────────────────────────
// Create announcement (HR only), optionally with file attachment

router.post(
    '/',
    authorize('HR'),
    upload.single('attachment'),
    asyncHandler(async (req, res) => {
        // Parse JSON fields from multipart form data
        const title = req.body.title as string;
        const content = req.body.content as string | undefined;
        const priority = req.body.priority as string | undefined;
        const expiresAt = req.body.expiresAt as string | undefined;

        if (!title) throw new BadRequestError('Title is required');

        // For file attachments: in production, upload to cloud storage
        // For now, store as base64 data URL (suitable for small files)
        let attachmentUrl: string | null = null;
        if (req.file) {
            // Store file info (in production, use S3/Cloudinary)
            const base64 = req.file.buffer.toString('base64');
            const mimeType = req.file.mimetype;
            attachmentUrl = `data:${mimeType};base64,${base64}`;
        }

        const announcement = await prisma.announcement.create({
            data: {
                title,
                content,
                priority: (priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') || 'LOW',
                attachmentUrl,
                createdById: req.user!.userId,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
        });

        res.status(201).json({
            success: true,
            data: { announcement },
            message: 'Announcement created',
        });
    })
);

// ─── PUT /api/announcements/:id ──────────────────────────────

router.put(
    '/:id',
    authorize('HR'),
    validate(updateAnnouncementSchema),
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid announcement ID');

        const existing = await prisma.announcement.findUnique({ where: { id } });
        if (!existing) throw new NotFoundError('Announcement not found');

        const data = req.body as z.infer<typeof updateAnnouncementSchema>;

        const announcement = await prisma.announcement.update({
            where: { id },
            data: {
                ...data,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
            },
        });

        res.json({
            success: true,
            data: { announcement },
            message: 'Announcement updated',
        });
    })
);

// ─── DELETE /api/announcements/:id ───────────────────────────
// Soft delete

router.delete(
    '/:id',
    authorize('HR'),
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid announcement ID');

        await prisma.announcement.update({
            where: { id },
            data: { isActive: false },
        });

        res.json({ success: true, message: 'Announcement deleted' });
    })
);

export default router;
