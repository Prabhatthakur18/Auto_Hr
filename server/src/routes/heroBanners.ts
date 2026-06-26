import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import prisma from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { classifyLink } from '../utils/linkEmbed.js';

const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
});

router.use(authenticate);

const updateHeroBannerSchema = z.object({
    title: z.string().max(255).nullable().optional(),
    subtitle: z.string().nullable().optional(),
    linkUrl: z.string().nullable().optional(),
    sortOrder: z.number().optional(),
    isActive: z.boolean().optional(),
});

// ─── GET /api/hero-banners ────────────────────────────────────
// All authenticated users can see active hero banners

router.get(
    '/',
    asyncHandler(async (_req, res) => {
        const banners = await prisma.heroBanner.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        });

        res.json({ success: true, data: { banners } });
    })
);

// ─── POST /api/hero-banners ───────────────────────────────────
// Create hero banner (HR only) — an uploaded image/gif/video, or a video link (e.g. YouTube)

router.post(
    '/',
    authorize('HR'),
    upload.single('media'),
    asyncHandler(async (req, res) => {
        const title = req.body.title as string | undefined;
        const subtitle = req.body.subtitle as string | undefined;
        const linkUrl = req.body.linkUrl as string | undefined;
        const videoLink = req.body.videoLink as string | undefined;
        const sortOrder = req.body.sortOrder ? parseInt(req.body.sortOrder, 10) : 0;

        let mediaType: 'IMAGE' | 'GIF' | 'VIDEO_FILE' | 'VIDEO_EMBED';
        let mediaUrl: string;

        if (req.file) {
            const mimeType = req.file.mimetype;
            mediaUrl = `data:${mimeType};base64,${req.file.buffer.toString('base64')}`;
            mediaType = mimeType.startsWith('video/') ? 'VIDEO_FILE' : mimeType === 'image/gif' ? 'GIF' : 'IMAGE';
        } else if (videoLink) {
            const kind = classifyLink(videoLink);
            if (kind !== 'VIDEO_EMBED') throw new BadRequestError('Video link must be a YouTube or Vimeo URL');
            mediaUrl = videoLink;
            mediaType = 'VIDEO_EMBED';
        } else {
            throw new BadRequestError('A banner image, GIF, video file, or video link is required');
        }

        const banner = await prisma.heroBanner.create({
            data: {
                title: title || null,
                subtitle: subtitle || null,
                mediaType,
                mediaUrl,
                linkUrl: linkUrl || null,
                sortOrder,
                createdById: req.user!.userId,
            },
        });

        res.status(201).json({
            success: true,
            data: { banner },
            message: 'Hero banner published',
        });
    })
);

// ─── PUT /api/hero-banners/:id ────────────────────────────────

router.put(
    '/:id',
    authorize('HR'),
    validate(updateHeroBannerSchema),
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid hero banner ID');

        const existing = await prisma.heroBanner.findUnique({ where: { id } });
        if (!existing) throw new NotFoundError('Hero banner not found');

        const banner = await prisma.heroBanner.update({
            where: { id },
            data: req.body as z.infer<typeof updateHeroBannerSchema>,
        });

        res.json({ success: true, data: { banner }, message: 'Hero banner updated' });
    })
);

// ─── DELETE /api/hero-banners/:id ─────────────────────────────

router.delete(
    '/:id',
    authorize('HR'),
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params['id'] as string, 10);
        if (isNaN(id)) throw new BadRequestError('Invalid hero banner ID');

        await prisma.heroBanner.update({
            where: { id },
            data: { isActive: false },
        });

        res.json({ success: true, message: 'Hero banner removed' });
    })
);

export default router;
