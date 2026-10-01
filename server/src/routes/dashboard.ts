import { Router } from 'express';
import prisma from '../config/db.js';
import { authenticate, scopeData, getScopedEmployeeIds } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NOT_SHORT_LEAVE } from '../utils/leaveRules.js';

const router = Router();
router.use(authenticate, scopeData);

// Statuses that mean the person was working that day (in office or not).
const PRESENT_STATUSES = ['PRESENT', 'HALF_DAY', 'WFH', 'ON_DUTY', 'CLIENT_VISIT', 'BUSINESS_TRAVEL'] as const;
const ACTIVE_LEARNING = ['NOT_STARTED', 'IN_PROGRESS'] as const;

/** Today's calendar date in India as YYYY-MM-DD (servers may run in UTC). */
function todayIST(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

const asDate = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
const ymd = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Attendance snapshot for a set of employees on the most recent day that has attendance
 * data (biometric uploads can lag, so "today" is often not loaded yet).
 */
async function attendanceSnapshot(employeeIds: number[] | null, today: string, knownHeadcount?: number) {
    const scope = employeeIds ? { employeeId: { in: employeeIds } } : {};

    // Latest day with real attendance (a lone manual correction shouldn't count as a "day").
    const latest = await prisma.attendance.findFirst({
        where: { ...scope, date: { lte: asDate(today) }, status: 'PRESENT' },
        orderBy: { date: 'desc' },
        select: { date: true },
    });
    if (!latest) return null;

    const day = latest.date;
    const [records, leaves, headcount] = await Promise.all([
        prisma.attendance.findMany({
            where: { ...scope, date: day, status: { in: [...PRESENT_STATUSES] } },
            select: { isLate: true },
        }),
        prisma.leave.findMany({
            where: {
                ...scope,
                ...NOT_SHORT_LEAVE,
                status: 'APPROVED',
                startDate: { lte: day },
                endDate: { gte: day },
                employee: { isActive: true },
            },
            select: { employeeId: true },
            distinct: ['employeeId'],
        }),
        knownHeadcount ?? prisma.employee.count({ where: { isActive: true, ...(employeeIds ? { id: { in: employeeIds } } : {}) } }),
    ]);

    const present = records.length;
    const onLeave = leaves.length;
    return {
        date: ymd(day),
        isToday: ymd(day) === today,
        headcount,
        present,
        late: records.filter((r) => r.isLate).length,
        onLeave,
        notMarked: Math.max(0, headcount - present - onLeave),
    };
}

// ─── GET /api/dashboard/summary ──────────────────────────────
// Everything the home page needs for the signed-in user's role, in one round trip.

router.get(
    '/summary',
    asyncHandler(async (req, res) => {
        const { userId, role, employeeId } = req.user!;
        const today = todayIST();
        const todayDate = asDate(today);
        const monthStart = asDate(`${today.slice(0, 7)}-01`);
        const yearStart = asDate(`${today.slice(0, 4)}-01-01`);
        const isOrgWide = role === 'HR' || role === 'LEADERSHIP';

        // Manager → whole reporting tree (incl. self); HR/Leadership → null (everyone); employee → self.
        const scopedIds = await getScopedEmployeeIds(req);
        const teamIds = role === 'MANAGER' && scopedIds ? scopedIds.filter((id) => id !== employeeId) : null;

        // ── Pending leave approvals this user can act on ──
        const approvalWhere = {
            status: 'PENDING' as const,
            employee: { isActive: true },
            ...(employeeId ? { NOT: { employeeId } } : {}),
            ...(isOrgWide
                ? {}
                : {
                    OR: [
                        ...(teamIds && teamIds.length ? [{ employeeId: { in: teamIds } }] : []),
                        { approverIds: { contains: `,${userId},` } },
                    ],
                }),
        };

        // The common, personal, team and org sections are independent, so they all run at once.
        const loadCommon = () => Promise.all([
            prisma.holiday.findMany({
                where: { date: { gte: todayDate } },
                orderBy: { date: 'asc' },
                take: 4,
                select: { id: true, name: true, date: true },
            }),
            prisma.leave.count({ where: approvalWhere }),
            prisma.leave.findMany({
                where: approvalWhere,
                orderBy: { startDate: 'asc' },
                take: 5,
                select: {
                    id: true, type: true, startDate: true, endDate: true, days: true,
                    employee: { select: { id: true, name: true, department: true, avatar: true, gender: true } },
                },
            }),
            role === 'EMPLOYEE'
                ? Promise.resolve([])
                : prisma.leave.findMany({
                    where: {
                        ...NOT_SHORT_LEAVE,
                        status: 'APPROVED',
                        startDate: { lte: todayDate },
                        endDate: { gte: todayDate },
                        employee: { isActive: true },
                        ...(isOrgWide ? {} : { employeeId: { in: teamIds ?? [] } }),
                    },
                    orderBy: { endDate: 'asc' },
                    take: 8,
                    select: {
                        id: true, type: true, endDate: true,
                        employee: { select: { id: true, name: true, department: true, avatar: true, gender: true } },
                    },
                }),
        ]);

        // ── My own snapshot (anyone linked to an employee profile) ──
        const loadMe = async (employeeId: number) => {
            // One attendance query (this month, incl. today) and one leave query cover what used to be five.
            const [monthRecords, myLeaves, enrollments, latestSlip] = await Promise.all([
                prisma.attendance.findMany({
                    where: { employeeId, date: { gte: monthStart, lte: todayDate } },
                    select: { date: true, status: true, checkIn: true, checkOut: true, isLate: true },
                }),
                prisma.leave.findMany({
                    where: {
                        employeeId,
                        OR: [
                            { status: 'PENDING' },
                            { status: 'APPROVED', startDate: { gte: yearStart } },
                            { status: 'APPROVED', endDate: { gte: todayDate } },
                        ],
                    },
                    orderBy: { startDate: 'asc' },
                    select: { status: true, type: true, startDate: true, endDate: true, days: true },
                }),
                prisma.enrollment.findMany({
                    where: { employeeId },
                    select: { status: true, dueDate: true, course: { select: { id: true, title: true } } },
                }),
                prisma.salarySlip.findFirst({
                    where: { employeeId },
                    orderBy: { month: 'desc' },
                    select: { month: true },
                }),
            ]);

            const todayRecord = monthRecords.find((r) => ymd(r.date) === today);
            const attendanceToday = todayRecord
                ? { status: todayRecord.status, checkIn: todayRecord.checkIn, checkOut: todayRecord.checkOut, isLate: todayRecord.isLate }
                : null;
            const approved = myLeaves.filter((l) => l.status === 'APPROVED');
            const upcomingLeave = approved.find((l) => l.endDate >= todayDate);

            const active = enrollments.filter((e) => (ACTIVE_LEARNING as readonly string[]).includes(e.status));
            const nextDue = active
                .filter((e) => e.dueDate)
                .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())[0];

            return {
                attendanceToday,
                month: {
                    present: monthRecords.filter((r) => (PRESENT_STATUSES as readonly string[]).includes(r.status)).length,
                    late: monthRecords.filter((r) => r.isLate).length,
                    onLeave: monthRecords.filter((r) => r.status === 'ON_LEAVE').length,
                },
                leaves: {
                    pending: myLeaves.filter((l) => l.status === 'PENDING').length,
                    takenThisYear: approved.filter((l) => l.startDate >= yearStart).reduce((sum, l) => sum + l.days, 0),
                    upcoming: upcomingLeave
                        ? { type: upcomingLeave.type, startDate: upcomingLeave.startDate, endDate: upcomingLeave.endDate, days: upcomingLeave.days }
                        : null,
                },
                learning: {
                    active: active.length,
                    overdue: active.filter((e) => e.dueDate && e.dueDate < todayDate).length,
                    completed: enrollments.filter((e) => e.status === 'COMPLETED').length,
                    nextDue: nextDue ? { courseId: nextDue.course.id, title: nextDue.course.title, dueDate: nextDue.dueDate } : null,
                },
                latestSlipMonth: latestSlip?.month ?? null,
            };
        };

        // ── Manager: team view ──
        const loadTeam = async (teamIds: number[]) => {
            const [attendance, learningOverdue, members] = await Promise.all([
                teamIds.length ? attendanceSnapshot(teamIds, today) : Promise.resolve(null),
                prisma.enrollment.count({
                    where: { employeeId: { in: teamIds }, status: { in: [...ACTIVE_LEARNING] }, dueDate: { lt: todayDate } },
                }),
                prisma.employee.count({ where: { id: { in: teamIds }, isActive: true } }),
            ]);
            return { size: members, attendance, learningOverdue };
        };

        // ── HR / Leadership: organisation view ──
        const loadOrg = async () => {
            // Headcount comes from the employee list, so the snapshot doesn't count again.
            const employees = prisma.employee.findMany({
                where: { isActive: true },
                select: { department: true, position: true, email: true, phone: true, joinDate: true },
            });
            const [employeeRows, attendance, enrollmentGroups, learningOverdue, lastPayroll] = await Promise.all([
                employees,
                employees.then((rows) => attendanceSnapshot(null, today, rows.length)),
                prisma.enrollment.groupBy({ by: ['status'], _count: true }),
                prisma.enrollment.count({
                    where: { status: { in: [...ACTIVE_LEARNING] }, dueDate: { lt: todayDate }, employee: { isActive: true } },
                }),
                prisma.payrollImportLog.findFirst({
                    orderBy: { createdAt: 'desc' },
                    select: { month: true, importedCount: true, createdAt: true },
                }),
            ]);

            const byDepartment = new Map<string, number>();
            for (const e of employeeRows) {
                const name = e.department?.trim() || 'Unassigned';
                byDepartment.set(name, (byDepartment.get(name) ?? 0) + 1);
            }

            const countFor = (status: string) => enrollmentGroups.find((g) => g.status === status)?._count ?? 0;
            const completed = countFor('COMPLETED');
            const assigned = completed + countFor('NOT_STARTED') + countFor('IN_PROGRESS') + countFor('FAILED');

            return {
                headcount: employeeRows.length,
                newJoinersThisMonth: employeeRows.filter((e) => e.joinDate && e.joinDate >= monthStart).length,
                departments: [...byDepartment.entries()]
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count),
                attendance,
                learning: {
                    active: countFor('NOT_STARTED') + countFor('IN_PROGRESS'),
                    overdue: learningOverdue,
                    completionRate: assigned ? Math.round((completed / assigned) * 100) : null,
                },
                payroll: lastPayroll,
                incompleteProfiles: employeeRows.filter((e) => !e.department || !e.position || (!e.email && !e.phone)).length,
            };
        };

        const [[holidays, approvalsCount, approvals, onLeaveToday], me, team, org] = await Promise.all([
            loadCommon(),
            employeeId ? loadMe(employeeId) : null,
            role === 'MANAGER' && teamIds ? loadTeam(teamIds) : null,
            isOrgWide ? loadOrg() : null,
        ]);

        res.json({
            success: true,
            data: {
                today,
                me,
                holidays,
                approvals: { count: approvalsCount, items: approvals },
                onLeaveToday,
                team,
                org,
            },
        });
    })
);

export default router;
