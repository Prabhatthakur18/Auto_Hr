import prisma from '../config/db.js';
import { sendLearningReminderEmail } from './mailer.js';
import { notify, getManagerAndHrUserIds, getEmployeeUserIdMap } from './notificationService.js';

const POLL_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours — due dates are day-granular, no need to poll faster
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Reminder milestones (days-until-due), most urgent first. */
const UPCOMING_MILESTONES = [0, 1, 3, 7] as const;

let processing = false;

function daysUntil(dueDate: Date, now: Date): number {
    const dueMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((dueMidnight.getTime() - nowMidnight.getTime()) / MS_PER_DAY);
}

export async function processLearningReminders(): Promise<void> {
    if (processing) return;
    processing = true;
    try {
        const now = new Date();

        const enrollments = await prisma.enrollment.findMany({
            where: {
                status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'FAILED'] },
                dueDate: { not: null },
            },
            include: {
                course: { select: { title: true } },
                employee: { select: { id: true, name: true, email: true } },
            },
        });

        for (const enrollment of enrollments) {
            try {
                await processOne(enrollment, now);
            } catch (error) {
                console.error(`Learning reminder failed for enrollment ${enrollment.id}:`, error);
            }
        }
    } finally {
        processing = false;
    }
}

async function processOne(
    enrollment: Awaited<ReturnType<typeof prisma.enrollment.findMany>>[number] & {
        course: { title: string };
        employee: { id: number; name: string; email: string | null };
    },
    now: Date
): Promise<void> {
    if (!enrollment.dueDate) return;
    const offset = daysUntil(enrollment.dueDate, now);

    if (offset >= 0) {
        // Upcoming or due-today — find the most urgent milestone reached that hasn't fired yet.
        const milestone = UPCOMING_MILESTONES.find(
            (m) => offset <= m && (enrollment.lastReminderDay === null || enrollment.lastReminderDay === undefined || m < enrollment.lastReminderDay)
        );
        if (milestone === undefined) return;

        const userIdMap = await getEmployeeUserIdMap([enrollment.employee.id]);
        const userId = userIdMap.get(enrollment.employee.id);
        const kind = milestone === 0 ? 'DUE_TODAY' as const : 'UPCOMING' as const;

        if (userId) {
            await notify({
                recipientIds: [userId],
                type: 'COURSE_DUE_REMINDER',
                title: milestone === 0 ? 'Course due today' : 'Course due soon',
                message: `"${enrollment.course.title}" is due ${milestone === 0 ? 'today' : `in ${milestone} day${milestone === 1 ? '' : 's'}`}.`,
                entityId: enrollment.courseId,
                employeeId: enrollment.employee.id,
            });
        }
        if (enrollment.employee.email) {
            await sendLearningReminderEmail({
                to: enrollment.employee.email,
                employeeName: enrollment.employee.name,
                courseTitle: enrollment.course.title,
                dueDate: enrollment.dueDate,
                kind,
            }).catch((error) => console.error(`Reminder email failed for enrollment ${enrollment.id}:`, error));
        }

        await prisma.enrollment.update({ where: { id: enrollment.id }, data: { lastReminderDay: milestone } });
        return;
    }

    // Overdue — escalate once when it first goes overdue, then notify the learner + manager/HR
    // again only on whole-week boundaries to avoid spamming (7, 14, 21 days overdue, etc.).
    const daysOverdue = -offset;
    const alreadyOverdueDay = enrollment.lastReminderDay !== null && enrollment.lastReminderDay !== undefined && enrollment.lastReminderDay <= 0
        ? -enrollment.lastReminderDay
        : -1;
    const shouldEscalate = daysOverdue === 1 || (daysOverdue > alreadyOverdueDay && daysOverdue % 7 === 0);
    if (!shouldEscalate) return;

    const userIdMap = await getEmployeeUserIdMap([enrollment.employee.id]);
    const learnerUserId = userIdMap.get(enrollment.employee.id);
    const escalationUserIds = await getManagerAndHrUserIds(enrollment.employee.id);

    const recipients = new Set<number>(escalationUserIds);
    if (learnerUserId) recipients.add(learnerUserId);

    await notify({
        recipientIds: recipients,
        type: 'COURSE_OVERDUE',
        title: 'Course overdue',
        message: `${enrollment.employee.name}'s "${enrollment.course.title}" is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue.`,
        entityId: enrollment.courseId,
        employeeId: enrollment.employee.id,
    });

    if (enrollment.employee.email) {
        await sendLearningReminderEmail({
            to: enrollment.employee.email,
            employeeName: enrollment.employee.name,
            courseTitle: enrollment.course.title,
            dueDate: enrollment.dueDate,
            kind: 'OVERDUE',
        }).catch((error) => console.error(`Overdue email failed for enrollment ${enrollment.id}:`, error));
    }

    await prisma.enrollment.update({ where: { id: enrollment.id }, data: { lastReminderDay: -daysOverdue } });
}

export function startLearningReminderScheduler(): NodeJS.Timeout {
    void processLearningReminders().catch((error) => console.error('Learning reminder scheduler failed:', error));
    return setInterval(() => {
        void processLearningReminders().catch((error) => console.error('Learning reminder scheduler failed:', error));
    }, POLL_INTERVAL_MS);
}
