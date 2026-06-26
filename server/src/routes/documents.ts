import { Router, type Request } from 'express';
import multer from 'multer';
import { z } from 'zod';
import prisma from '../config/db.js';
import { authenticate, assertCanAccessEmployee, getScopedEmployeeIds, scopeData } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { getEmployeeUserId, notify } from '../utils/notificationService.js';

const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 12 * 1024 * 1024 },
});

const titleSchema = z.string().trim().min(1, 'Title is required').max(255, 'Title is too long');
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

router.use(authenticate, scopeData);

function parseId(value: string | string[] | undefined, label: string): number {
    const normalized = Array.isArray(value) ? value[0] : value;
    const id = Number.parseInt(normalized ?? '', 10);
    if (!Number.isInteger(id)) throw new BadRequestError(`Invalid ${label}`);
    return id;
}

function validateDocumentFile(file: Express.Multer.File | undefined): Express.Multer.File {
    if (!file) throw new BadRequestError('Document file is required');
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        throw new BadRequestError('Only PDF, JPG, PNG, and WebP documents are supported');
    }
    return file;
}

function parseTitle(value: unknown): string {
    const parsed = titleSchema.safeParse(value);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? 'Title is required');
    return parsed.data;
}

function toDownloadPayload(document: {
    id: number;
    title: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    contentBase64: string;
}) {
    return {
        id: document.id,
        title: document.title,
        fileName: document.fileName,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        dataUrl: `data:${document.mimeType};base64,${document.contentBase64}`,
    };
}

async function getAccessibleDocument(req: Request, documentId: number) {
    const document = await prisma.employeeDocument.findUnique({
        where: { id: documentId },
        include: { employee: { select: { id: true, name: true } } },
    });

    if (!document) throw new NotFoundError('Document not found');
    await assertCanAccessEmployee(req, document.employeeId, {
        self: 'You can only access your own documents',
        team: 'You can only access documents for your team members',
    });

    return document;
}

async function recordDownloadAndNotify(req: Request, document: {
    id: number;
    title: string;
    employeeId: number;
    employee: { name: string };
}) {
    await prisma.employeeDocumentDownload.create({
        data: {
            documentId: document.id,
            downloadedById: req.user!.userId,
        },
    });

    if (req.user!.employeeId === document.employeeId) return;

    const recipientId = await getEmployeeUserId(document.employeeId);
    if (!recipientId) return;

    const downloader = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { username: true, employee: { select: { name: true } } },
    });
    const downloaderName = downloader?.employee?.name ?? downloader?.username ?? 'An authorized user';
    await notify({
        recipientIds: [recipientId],
        type: 'DOCUMENT_DOWNLOADED',
        title: 'Document downloaded',
        message: `${downloaderName} downloaded "${document.title}" from your document manager.`,
        entityId: document.id,
        employeeId: document.employeeId,
        excludeUserId: req.user!.userId,
    });
}

router.get(
    '/mine',
    asyncHandler(async (req, res) => {
        if (!req.user!.employeeId) throw new BadRequestError('This account is not linked to an employee profile');

        const documents = await prisma.employeeDocument.findMany({
            where: { employeeId: req.user!.employeeId },
            select: {
                id: true,
                employeeId: true,
                title: true,
                fileName: true,
                mimeType: true,
                sizeBytes: true,
                createdAt: true,
                updatedAt: true,
                _count: { select: { downloads: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ success: true, data: { documents } });
    })
);

router.get(
    '/employees/:employeeId',
    asyncHandler(async (req, res) => {
        const employeeId = parseId(req.params.employeeId, 'employee ID');
        await assertCanAccessEmployee(req, employeeId, {
            self: 'You can only view your own documents',
            team: 'You can only view documents for your team members',
        });

        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            select: { id: true, name: true, department: true, position: true },
        });
        if (!employee) throw new NotFoundError('Employee not found');

        const documents = await prisma.employeeDocument.findMany({
            where: { employeeId },
            select: {
                id: true,
                employeeId: true,
                title: true,
                fileName: true,
                mimeType: true,
                sizeBytes: true,
                createdAt: true,
                updatedAt: true,
                _count: { select: { downloads: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ success: true, data: { employee, documents } });
    })
);

router.get(
    '/team',
    asyncHandler(async (req, res) => {
        const scopedIds = await getScopedEmployeeIds(req);
        const where = scopedIds ? { employeeId: { in: scopedIds } } : {};

        const documents = await prisma.employeeDocument.findMany({
            where,
            select: {
                id: true,
                employeeId: true,
                title: true,
                fileName: true,
                mimeType: true,
                sizeBytes: true,
                createdAt: true,
                updatedAt: true,
                employee: { select: { id: true, name: true, department: true, position: true, avatar: true, gender: true } },
                _count: { select: { downloads: true } },
            },
            orderBy: [{ employee: { name: 'asc' } }, { createdAt: 'desc' }],
        });

        res.json({ success: true, data: { documents } });
    })
);

router.post(
    '/',
    upload.single('document'),
    asyncHandler(async (req, res) => {
        if (!req.user!.employeeId) throw new BadRequestError('This account is not linked to an employee profile');
        const title = parseTitle(req.body.title);
        const file = validateDocumentFile(req.file);

        const document = await prisma.employeeDocument.create({
            data: {
                employeeId: req.user!.employeeId,
                title,
                fileName: file.originalname,
                mimeType: file.mimetype,
                sizeBytes: file.size,
                contentBase64: file.buffer.toString('base64'),
                uploadedById: req.user!.userId,
            },
            select: {
                id: true,
                employeeId: true,
                title: true,
                fileName: true,
                mimeType: true,
                sizeBytes: true,
                createdAt: true,
                updatedAt: true,
                _count: { select: { downloads: true } },
            },
        });

        res.status(201).json({ success: true, data: { document }, message: 'Document uploaded' });
    })
);

router.put(
    '/:id',
    upload.single('document'),
    asyncHandler(async (req, res) => {
        const id = parseId(req.params.id, 'document ID');
        const existing = await getAccessibleDocument(req, id);
        if (existing.employeeId !== req.user!.employeeId) {
            throw new ForbiddenError('You can only edit your own documents');
        }

        const data: {
            title?: string;
            fileName?: string;
            mimeType?: string;
            sizeBytes?: number;
            contentBase64?: string;
        } = {};

        if (req.body.title !== undefined) data.title = parseTitle(req.body.title);
        if (req.file) {
            const file = validateDocumentFile(req.file);
            data.fileName = file.originalname;
            data.mimeType = file.mimetype;
            data.sizeBytes = file.size;
            data.contentBase64 = file.buffer.toString('base64');
        }

        if (Object.keys(data).length === 0) throw new BadRequestError('Nothing to update');

        const document = await prisma.employeeDocument.update({
            where: { id },
            data,
            select: {
                id: true,
                employeeId: true,
                title: true,
                fileName: true,
                mimeType: true,
                sizeBytes: true,
                createdAt: true,
                updatedAt: true,
                _count: { select: { downloads: true } },
            },
        });

        res.json({ success: true, data: { document }, message: 'Document updated' });
    })
);

router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
        const id = parseId(req.params.id, 'document ID');
        const existing = await getAccessibleDocument(req, id);
        if (existing.employeeId !== req.user!.employeeId) {
            throw new ForbiddenError('You can only remove your own documents');
        }

        await prisma.employeeDocument.delete({ where: { id } });
        res.json({ success: true, message: 'Document removed' });
    })
);

router.get(
    '/:id/download',
    asyncHandler(async (req, res) => {
        const id = parseId(req.params.id, 'document ID');
        const document = await getAccessibleDocument(req, id);
        await recordDownloadAndNotify(req, document);

        res.json({ success: true, data: { document: toDownloadPayload(document) } });
    })
);

router.get(
    '/employees/:employeeId/download-all',
    asyncHandler(async (req, res) => {
        const employeeId = parseId(req.params.employeeId, 'employee ID');
        await assertCanAccessEmployee(req, employeeId, {
            self: 'You can only download your own documents',
            team: 'You can only download documents for your team members',
        });

        const documents = await prisma.employeeDocument.findMany({
            where: { employeeId },
            include: { employee: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
        });

        for (const document of documents) {
            await recordDownloadAndNotify(req, document);
        }

        res.json({ success: true, data: { documents: documents.map(toDownloadPayload) } });
    })
);

export default router;
