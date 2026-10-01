import prisma from '../config/db.js';
import { getEmployeeUserIdMap } from './notificationService.js';

/** Highest-minScore GradeBand whose minScore the score meets/exceeds, or null if none qualify. */
export function resolveGradeLabel(score: number, gradeBands: { label: string; minScore: number }[]): string | null {
    const qualifying = gradeBands.filter((b) => score >= b.minScore);
    if (qualifying.length === 0) return null;
    return qualifying.reduce((best, b) => (b.minScore > best.minScore ? b : best)).label;
}

/** Awards a badge tied to a specific quiz attempt (QUIZ_GRADE/PERFECT_SCORE). Relies on the
 * unique(employeeId, badgeId, sourceQuizAttemptId) constraint to no-op on a re-grade of the
 * same attempt. */
async function awardAttemptBadge(employeeId: number, badgeId: number, sourceQuizAttemptId: number): Promise<boolean> {
    try {
        await prisma.employeeBadge.create({
            data: { employeeId, badgeId, sourceQuizAttemptId },
        });
        return true;
    } catch {
        return false; // unique constraint hit — already awarded for this attempt
    }
}

async function notifyBadgeEarned(employeeId: number, badgeNames: string[]): Promise<void> {
    if (badgeNames.length === 0) return;
    const userIdMap = await getEmployeeUserIdMap([employeeId]);
    const recipientUserId = userIdMap.get(employeeId);
    if (!recipientUserId) return;

    // One insert for all badges earned at once.
    await prisma.notification.createMany({
        data: badgeNames.map((name) => ({
            recipientId: recipientUserId,
            type: 'BADGE_EARNED',
            title: 'New badge earned!',
            message: `You've earned the "${name}" badge.`,
        })),
    });
}

/** Awards every not-yet-held milestone badge in `badges` with two queries total (lookup + insert). */
async function awardMilestoneBadges(employeeId: number, badges: { id: number; name: string }[]): Promise<string[]> {
    if (badges.length === 0) return [];
    const held = await prisma.employeeBadge.findMany({
        where: { employeeId, badgeId: { in: badges.map((b) => b.id) }, sourceQuizAttemptId: null },
        select: { badgeId: true },
    });
    const heldIds = new Set(held.map((h) => h.badgeId));
    const toAward = badges.filter((b) => !heldIds.has(b.id));
    if (toAward.length === 0) return [];
    await prisma.employeeBadge.createMany({
        data: toAward.map((b) => ({ employeeId, badgeId: b.id, sourceQuizAttemptId: null })),
    });
    return toAward.map((b) => b.name);
}

/** Checks QUIZ_GRADE and PERFECT_SCORE badges against one freshly-graded attempt. */
export async function evaluateAttemptBadges(attemptId: number): Promise<void> {
    const attempt = await prisma.quizAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) return;

    const candidateBadges = await prisma.badge.findMany({
        where: {
            OR: [
                { criteriaType: 'PERFECT_SCORE' },
                ...(attempt.gradeLabel ? [{ criteriaType: 'QUIZ_GRADE' as const, criteriaLabel: attempt.gradeLabel }] : []),
            ],
        },
    });

    const earnedNames: string[] = [];
    for (const badge of candidateBadges) {
        const qualifies = badge.criteriaType === 'PERFECT_SCORE'
            ? attempt.score === 100
            : badge.criteriaType === 'QUIZ_GRADE' && badge.criteriaLabel === attempt.gradeLabel;
        if (!qualifies) continue;

        const awarded = await awardAttemptBadge(attempt.employeeId, badge.id, attempt.id);
        if (awarded) earnedNames.push(badge.name);
    }

    await notifyBadgeEarned(attempt.employeeId, earnedNames);
}

/** Checks COURSE_COMPLETION_COUNT badges after a course enrollment completes. */
export async function evaluateCourseCompletionBadges(employeeId: number): Promise<void> {
    const completedCount = await prisma.enrollment.count({ where: { employeeId, status: 'COMPLETED' } });

    const candidateBadges = await prisma.badge.findMany({
        where: { criteriaType: 'COURSE_COMPLETION_COUNT', criteriaValue: { lte: completedCount } },
    });

    const earnedNames = await awardMilestoneBadges(employeeId, candidateBadges);

    await notifyBadgeEarned(employeeId, earnedNames);
}

/** Checks PATH_COMPLETION_COUNT badges after a learning path enrollment completes. */
export async function evaluatePathCompletionBadges(employeeId: number): Promise<void> {
    const completedCount = await prisma.pathEnrollment.count({ where: { employeeId, status: 'COMPLETED' } });

    const candidateBadges = await prisma.badge.findMany({
        where: { criteriaType: 'PATH_COMPLETION_COUNT', criteriaValue: { lte: completedCount } },
    });

    const earnedNames = await awardMilestoneBadges(employeeId, candidateBadges);

    await notifyBadgeEarned(employeeId, earnedNames);
}

/** Checks MODULE_COMPLETION_COUNT badges after any individual module completes — counts
 * COMPLETED ModuleProgress rows across every course, not just within one enrollment, mirroring
 * how PW/Udemy-style platforms award milestones on raw lesson count rather than course count. */
export async function evaluateModuleCompletionBadges(employeeId: number): Promise<void> {
    const completedCount = await prisma.moduleProgress.count({
        where: { status: 'COMPLETED', enrollment: { employeeId } },
    });

    const candidateBadges = await prisma.badge.findMany({
        where: { criteriaType: 'MODULE_COMPLETION_COUNT', criteriaValue: { lte: completedCount } },
    });

    const earnedNames = await awardMilestoneBadges(employeeId, candidateBadges);

    await notifyBadgeEarned(employeeId, earnedNames);
}
