import prisma from '../config/db.js';
import { notify, getEmployeeUserIdMap } from './notificationService.js';

const POLL_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours — same cadence as the reminder scheduler

let processing = false;

/**
 * Auto-enrolls every active employee matching an auto-assign course's `targetDepartment`
 * (or all employees if null) who isn't already enrolled. Re-evaluated on every poll, so
 * employees onboarded or transferred into a matching department after the course was
 * published still get enrolled automatically — no separate "rule" table needed since the
 * course itself carries the matching criteria (mandatory/targetDepartment) it already has.
 */
export async function processAutoAssignments(): Promise<void> {
    if (processing) return;
    processing = true;
    try {
        const courses = await prisma.course.findMany({
            where: { state: 'PUBLISHED', autoAssign: true },
            select: { id: true, title: true, targetDepartment: true, autoAssignDueDays: true },
        });

        for (const course of courses) {
            try {
                await assignCourseToMatchingEmployees(course);
            } catch (error) {
                console.error(`Auto-assignment failed for course ${course.id}:`, error);
            }
        }
    } finally {
        processing = false;
    }
}

async function assignCourseToMatchingEmployees(course: {
    id: number;
    title: string;
    targetDepartment: string | null;
    autoAssignDueDays: number | null;
}): Promise<void> {
    const matchingEmployees = await prisma.employee.findMany({
        where: {
            isActive: true,
            ...(course.targetDepartment ? { department: course.targetDepartment } : {}),
        },
        select: { id: true },
    });
    if (matchingEmployees.length === 0) return;

    const matchingIds = matchingEmployees.map((e) => e.id);

    const existing = await prisma.enrollment.findMany({
        where: { courseId: course.id, employeeId: { in: matchingIds } },
        select: { employeeId: true },
    });
    const alreadyEnrolled = new Set(existing.map((e) => e.employeeId));
    const toAssign = matchingIds.filter((id) => !alreadyEnrolled.has(id));
    if (toAssign.length === 0) return;

    const dueDate = course.autoAssignDueDays
        ? new Date(Date.now() + course.autoAssignDueDays * 24 * 60 * 60 * 1000)
        : null;

    await prisma.enrollment.createMany({
        data: toAssign.map((employeeId) => ({
            courseId: course.id,
            employeeId,
            status: 'NOT_STARTED' as const,
            dueDate,
        })),
    });

    const userIdMap = await getEmployeeUserIdMap(toAssign);
    await notify({
        recipientIds: userIdMap.values(),
        type: 'COURSE_ASSIGNED',
        title: 'New course assigned',
        message: `You've been assigned "${course.title}"${dueDate ? ` — due ${dueDate.toLocaleDateString('en-IN')}` : ''}.`,
        entityId: course.id,
    });
}

export function startLearningAutoAssignScheduler(): NodeJS.Timeout {
    void processAutoAssignments().catch((error) => console.error('Learning auto-assign scheduler failed:', error));
    return setInterval(() => {
        void processAutoAssignments().catch((error) => console.error('Learning auto-assign scheduler failed:', error));
    }, POLL_INTERVAL_MS);
}
