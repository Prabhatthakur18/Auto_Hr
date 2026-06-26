import prisma from '../config/db.js';
import { sendLearningReminderEmail } from './mailer.js';
import { notify, getManagerAndHrUserIds, getEmployeeUserIdMap } from './notificationService.js';

const POLL_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours — same cadence as the other learning schedulers
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Reminder milestones (days-until-expiry), most urgent first. 0 = expires today / just expired. */
const MILESTONES = [0, 7, 30] as const;

let processing = false;

function daysUntil(target: Date, now: Date): number {
    const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((targetMidnight.getTime() - nowMidnight.getTime()) / MS_PER_DAY);
}

export async function processCertificateExpiry(): Promise<void> {
    if (processing) return;
    processing = true;
    try {
        const now = new Date();

        const certificates = await prisma.certificate.findMany({
            where: { expiresAt: { not: null } },
            include: {
                enrollment: {
                    include: {
                        course: { select: { id: true, title: true } },
                        employee: { select: { id: true, name: true, email: true } },
                    },
                },
            },
        });

        for (const certificate of certificates) {
            try {
                await processOne(certificate, now);
            } catch (error) {
                console.error(`Certificate expiry check failed for certificate ${certificate.id}:`, error);
            }
        }
    } finally {
        processing = false;
    }
}

async function processOne(
    certificate: Awaited<ReturnType<typeof prisma.certificate.findMany>>[number] & {
        enrollment: {
            id: number;
            course: { id: number; title: string };
            employee: { id: number; name: string; email: string | null };
        };
    },
    now: Date
): Promise<void> {
    if (!certificate.expiresAt) return;
    const offset = daysUntil(certificate.expiresAt, now);
    if (offset < 0) return; // already expired more than today — one-time "expired" notice already sent at offset 0

    const milestone = MILESTONES.find(
        (m) => offset <= m && (certificate.lastExpiryReminderDay === null || certificate.lastExpiryReminderDay === undefined || m < certificate.lastExpiryReminderDay)
    );
    if (milestone === undefined) return;

    const { employee, course } = certificate.enrollment;
    const userIdMap = await getEmployeeUserIdMap([employee.id]);
    const learnerUserId = userIdMap.get(employee.id);

    const recipients = new Set<number>();
    if (learnerUserId) recipients.add(learnerUserId);
    if (milestone === 0) {
        // Certificate has just expired — also let the manager/HR know, same escalation audience as overdue courses.
        for (const id of await getManagerAndHrUserIds(employee.id)) recipients.add(id);
    }

    await notify({
        recipientIds: recipients,
        type: 'COURSE_CERTIFICATE_EXPIRING',
        title: milestone === 0 ? 'Certificate expired' : 'Certificate expiring soon',
        message: milestone === 0
            ? `${employee.name}'s certificate for "${course.title}" has expired. Retake the course to renew it.`
            : `Your certificate for "${course.title}" expires in ${milestone} days.`,
        entityId: course.id,
        employeeId: employee.id,
    });

    if (employee.email) {
        await sendLearningReminderEmail({
            to: employee.email,
            employeeName: employee.name,
            courseTitle: course.title,
            dueDate: certificate.expiresAt,
            kind: milestone === 0 ? 'OVERDUE' : 'UPCOMING',
        }).catch((error) => console.error(`Certificate expiry email failed for certificate ${certificate.id}:`, error));
    }

    await prisma.certificate.update({ where: { id: certificate.id }, data: { lastExpiryReminderDay: milestone } });
}

export function startCertificateExpiryScheduler(): NodeJS.Timeout {
    void processCertificateExpiry().catch((error) => console.error('Certificate expiry scheduler failed:', error));
    return setInterval(() => {
        void processCertificateExpiry().catch((error) => console.error('Certificate expiry scheduler failed:', error));
    }, POLL_INTERVAL_MS);
}
