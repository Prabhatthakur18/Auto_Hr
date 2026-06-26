import { Router } from 'express';
import prisma from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
    const recipientId = req.user!.userId;
    const notifications = await prisma.notification.findMany({
        where: { recipientId },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
    const unreadCount = await prisma.notification.count({
        where: { recipientId, readAt: null },
    });
    res.json({ success: true, data: { notifications, unreadCount } });
}));

router.post('/read-all', asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
        where: { recipientId: req.user!.userId, readAt: null },
        data: { readAt: new Date() },
    });
    res.json({ success: true, message: 'Notifications marked as read' });
}));

router.post('/:id/read', asyncHandler(async (req, res) => {
    const id = Number(req.params['id']);
    if (!Number.isInteger(id)) throw new BadRequestError('Invalid notification ID');
    const notification = await prisma.notification.findFirst({
        where: { id, recipientId: req.user!.userId },
    });
    if (!notification) throw new NotFoundError('Notification not found');
    await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    res.json({ success: true, message: 'Notification marked as read' });
}));

export default router;
