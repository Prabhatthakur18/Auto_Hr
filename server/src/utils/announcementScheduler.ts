import prisma from '../config/db.js';
import { isSmtpConfigured, sendAnnouncementEmail } from './mailer.js';
import { notify, getAudienceUserIds } from './notificationService.js';

const POLL_INTERVAL_MS = 30_000;
let processing = false;

export async function notifyAnnouncementPublished(announcementId: number): Promise<void> {
    const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!announcement) return;

    const recipientIds = await getAudienceUserIds(announcement.targetDepartment);
    await notify({
        recipientIds,
        excludeUserId: announcement.createdById,
        type: 'ANNOUNCEMENT_PUBLISHED',
        title: 'New announcement',
        message: announcement.title,
        entityId: announcement.id,
    });
}

async function getRecipientEmails(targetDepartment: string | null): Promise<string[]> {
    const employees = await prisma.employee.findMany({
        where: {
            isActive: true,
            email: { not: null },
            ...(targetDepartment ? { department: targetDepartment } : {}),
        },
        select: { email: true },
    });

    return [...new Set(employees.map(employee => employee.email).filter((email): email is string => Boolean(email)))];
}

export async function deliverAnnouncementEmail(announcementId: number): Promise<void> {
    if (!isSmtpConfigured()) return;

    const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!announcement?.isActive || !announcement.sendEmail || announcement.emailSentAt) return;

    try {
        const recipients = await getRecipientEmails(announcement.targetDepartment);
        await sendAnnouncementEmail({
            recipients,
            title: announcement.title,
            content: announcement.content,
        });
        await prisma.announcement.update({
            where: { id: announcement.id },
            data: { emailSentAt: new Date(), emailError: null },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown email delivery error';
        await prisma.announcement.update({
            where: { id: announcement.id },
            data: { emailError: message.slice(0, 2000) },
        });
        throw error;
    }
}

export async function processDueAnnouncements(): Promise<void> {
    if (processing) return;
    processing = true;
    try {
        const now = new Date();
        const due = await prisma.announcement.findMany({
            where: {
                isActive: true,
                AND: [
                    { OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] },
                    { OR: [
                        { publishedAt: null },
                        { sendEmail: true, emailSentAt: null },
                    ] },
                ],
            },
            select: { id: true, publishedAt: true, sendEmail: true, emailSentAt: true },
        });

        for (const announcement of due) {
            if (!announcement.publishedAt) {
                await prisma.announcement.update({
                    where: { id: announcement.id },
                    data: { publishedAt: now },
                });
                await notifyAnnouncementPublished(announcement.id).catch(error => {
                    console.error(`Announcement ${announcement.id} notification failed:`, error);
                });
            }
            if (announcement.sendEmail && !announcement.emailSentAt) {
                try {
                    await deliverAnnouncementEmail(announcement.id);
                } catch (error) {
                    console.error(`Announcement ${announcement.id} email delivery failed:`, error);
                }
            }
        }
    } finally {
        processing = false;
    }
}

let lastOnDemandRun = 0;

/**
 * Publishes due scheduled announcements from normal request traffic, at most once a minute per
 * server instance. Needed on serverless hosting, where the 30s interval scheduler doesn't run;
 * the notification poll every logged-in client makes provides the trigger. Never throws.
 */
export async function processDueAnnouncementsThrottled(): Promise<void> {
    const now = Date.now();
    if (now - lastOnDemandRun < 60_000) return;
    lastOnDemandRun = now;
    await processDueAnnouncements().catch(error => console.error('On-demand announcement publish failed:', error));
}

export function startAnnouncementScheduler(): NodeJS.Timeout {
    void processDueAnnouncements().catch(error => console.error('Announcement scheduler failed:', error));
    return setInterval(() => {
        void processDueAnnouncements().catch(error => console.error('Announcement scheduler failed:', error));
    }, POLL_INTERVAL_MS);
}
