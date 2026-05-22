import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar, CheckCircle, XCircle, Clock,
  Plus, X, AlertTriangle, Loader2, Send, Info
} from 'lucide-react';
import { leaveApi, employeeApi, type Leave, type EmployeeDetail } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/* ─── Types & Constants ────────────────────────────────────── */

interface LeavesTabProps {
  leaves: Leave[];
  employee: EmployeeDetail;
  isHR: boolean;
  onRefresh: () => void;
}

interface Approver {
  userId: number;
  employeeId: number;
  name: string;
  role: string;
  position: string | null;
  department: string | null;
}

const LEAVE_TYPES = [
  { value: 'Casual Leave', label: 'Casual Leave', consumesQuota: true, color: '#6366f1', bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  { value: 'Medical Leave', label: 'Medical / Sick Leave', consumesQuota: true, color: '#8b5cf6', bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/20' },
  { value: 'Earned Leave', label: 'Earned Leave', consumesQuota: true, color: '#06b6d4', bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  { value: 'Comp Off', label: 'Comp Off', consumesQuota: false, color: '#f59e0b', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20' },
  { value: 'Unpaid Leave', label: 'Unpaid Leave', consumesQuota: false, color: '#ef4444', bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/20' },
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/* ─── Utility Helpers ──────────────────────────────────────── */

const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const getFirstDay = (y: number, m: number) => new Date(y, m, 1).getDay();

const fmtKey = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const getTodayKey = () => {
  const n = new Date();
  return fmtKey(n.getFullYear(), n.getMonth(), n.getDate());
};

const dayCount = (s: string, e: string) =>
  Math.floor((new Date(e + 'T00:00:00').getTime() - new Date(s + 'T00:00:00').getTime()) / 86400000) + 1;

const fmtDisplay = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/* ─── Main Component ───────────────────────────────────────── */

const LeavesTab: React.FC<LeavesTabProps> = ({ leaves, employee, isHR, onRefresh }) => {
  const { user } = useAuth();
  const isOwnProfile = user?.employeeId === employee.id;

  // ── Calendar navigation state ─────────────────────────────
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());

  // ── Apply mode state ──────────────────────────────────────
  const [applyMode, setApplyMode] = useState(false);
  const [selStart, setSelStart] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // ── Apply dialog state ────────────────────────────────────
  const [showDialog, setShowDialog] = useState(false);
  const [leaveType, setLeaveType] = useState(LEAVE_TYPES[0].value);
  const [reason, setReason] = useState('');
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [selectedApprovers, setSelectedApprovers] = useState<number[]>([]);
  const [loadingApprovers, setLoadingApprovers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // ── Tooltip state ─────────────────────────────────────────
  const [tooltip, setTooltip] = useState<{ leave: Leave; rect: DOMRect } | null>(null);

  // ── Derived: only this employee's leaves ──────────────────
  const myLeaves = useMemo(
    () => leaves.filter(l => l.employeeId === employee.id),
    [leaves, employee.id],
  );

  // ── Derived: date → leave[] lookup map ────────────────────
  const leaveMap = useMemo(() => {
    const map: Record<string, Leave[]> = {};
    myLeaves.forEach(lv => {
      const sd = new Date(lv.startDate.split('T')[0] + 'T00:00:00');
      const ed = new Date(lv.endDate.split('T')[0] + 'T00:00:00');
      for (let d = new Date(sd); d <= ed; d.setDate(d.getDate() + 1)) {
        const key = fmtKey(d.getFullYear(), d.getMonth(), d.getDate());
        (map[key] ??= []).push(lv);
      }
    });
    return map;
  }, [myLeaves]);

  // ── Derived: paid leave balance ───────────────────────────
  const paidBalance = useMemo(() => {
    const jd = employee.joinDate ? new Date(employee.joinDate) : new Date();
    const n = new Date();
    // Months since join date (inclusive of current month)
    let months =
      (n.getFullYear() - jd.getFullYear()) * 12 +
      (n.getMonth() - jd.getMonth());
    months = Math.max(months + 1, 1); // at least 1 month (current)
    const total = months * 2; // 2 paid leaves per month

    // Used = days in APPROVED or PENDING leaves that consume quota
    const used = myLeaves
      .filter(
        l =>
          (l.status === 'APPROVED' || l.status === 'PENDING') &&
          LEAVE_TYPES.find(t => t.value === l.type)?.consumesQuota,
      )
      .reduce((s, l) => s + l.days, 0);

    return { total, used, remaining: total - used };
  }, [myLeaves, employee.joinDate]);

  // ── Derived: summary stats ────────────────────────────────
  const stats = useMemo(
    () => ({
      total: myLeaves.length,
      approvedDays: myLeaves
        .filter(l => l.status === 'APPROVED')
        .reduce((s, l) => s + l.days, 0),
      pending: myLeaves.filter(l => l.status === 'PENDING').length,
      rejected: myLeaves.filter(l => l.status === 'REJECTED').length,
    }),
    [myLeaves],
  );

  // ── Derived: visible approvers (direct manager + HR only) ─
  const visibleApprovers = useMemo(() => {
    return approvers.filter(a => {
      // Always include HR users
      if (a.role === 'HR') return true;
      // Include their direct manager only
      if (employee.managerId && a.employeeId === employee.managerId) return true;
      return false;
    });
  }, [approvers, employee.managerId]);

  // ── Calendar grid cells ───────────────────────────────────
  const cells = useMemo(() => {
    const dim = getDaysInMonth(viewYear, viewMonth);
    const fd = getFirstDay(viewYear, viewMonth);
    const arr: { key: string; day: number; current: boolean }[] = [];

    // Previous month filler
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    const prevDim = getDaysInMonth(prevY, prevM);
    for (let i = fd - 1; i >= 0; i--) {
      arr.push({ key: fmtKey(prevY, prevM, prevDim - i), day: prevDim - i, current: false });
    }

    // Current month days
    for (let d = 1; d <= dim; d++) {
      arr.push({ key: fmtKey(viewYear, viewMonth, d), day: d, current: true });
    }

    // Next month filler (to fill 6 rows = 42 cells)
    const rem = 42 - arr.length;
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    for (let d = 1; d <= rem; d++) {
      arr.push({ key: fmtKey(nextY, nextM, d), day: d, current: false });
    }
    return arr;
  }, [viewYear, viewMonth]);

  // ── Helpers ───────────────────────────────────────────────

  const isBlocked = useCallback(
    (key: string) => {
      if (key < getTodayKey()) return true;
      return (leaveMap[key] || []).some(
        l => l.status === 'PENDING' || l.status === 'APPROVED',
      );
    },
    [leaveMap],
  );

  const getDayStatus = (key: string): 'APPROVED' | 'PENDING' | 'REJECTED' | null => {
    const lvs = leaveMap[key] || [];
    if (lvs.length === 0) return null;
    if (lvs.some(l => l.status === 'APPROVED')) return 'APPROVED';
    if (lvs.some(l => l.status === 'PENDING')) return 'PENDING';
    return 'REJECTED';
  };

  const inRange = (key: string) => {
    if (!selStart) return false;
    const end = selEnd || (hoverDate && hoverDate >= selStart ? hoverDate : selStart);
    return key >= selStart && key <= (end || selStart);
  };

  // ── Navigation ────────────────────────────────────────────

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // ── Apply Mode handlers ───────────────────────────────────

  const exitApply = () => {
    setApplyMode(false);
    setSelStart(null);
    setSelEnd(null);
    setHoverDate(null);
    setShowDialog(false);
  };

  const handleDayClick = (key: string) => {
    if (!applyMode || isBlocked(key)) return;

    if (!selStart || selEnd) {
      // First click or restart after a completed selection
      setSelStart(key);
      setSelEnd(null);
      return;
    }

    // Second click
    if (key < selStart) {
      setSelStart(key);
      setSelEnd(null);
      return;
    }

    // Verify no blocked dates in the range
    const sd = new Date(selStart + 'T00:00:00');
    const ed = new Date(key + 'T00:00:00');
    for (let d = new Date(sd); d <= ed; d.setDate(d.getDate() + 1)) {
      const k = fmtKey(d.getFullYear(), d.getMonth(), d.getDate());
      if (isBlocked(k)) {
        // Blocked date in range — restart with this date
        setSelStart(key);
        setSelEnd(null);
        return;
      }
    }

    setSelEnd(key);
    openDialog();
  };

  // ── Dialog ────────────────────────────────────────────────

  const isSelfManagerOrHR = user?.role === 'HR' || user?.role === 'MANAGER';

  const openDialog = async () => {
    setShowDialog(true);
    setLeaveType(LEAVE_TYPES[0].value);
    setReason('');
    setSubmitError('');
    setLoadingApprovers(true);

    try {
      const res = await employeeApi.approversList();
      if (res.data) {
        setApprovers(res.data.approvers);
        const pre: number[] = [];
        res.data.approvers.forEach(a => {
          if (isSelfManagerOrHR) {
            // Managers / HRs only pre-select their designated manager if they report to someone
            if (employee.managerId && a.employeeId === employee.managerId) {
              pre.push(a.userId);
            }
          } else {
            // Standard employees pre-select direct manager and always include HR
            if (a.role === 'HR') pre.push(a.userId);
            if (employee.managerId && a.employeeId === employee.managerId) {
              pre.push(a.userId);
            }
          }
        });
        setSelectedApprovers([...new Set(pre)]);
      }
    } catch {
      /* silent */
    }
    setLoadingApprovers(false);
  };

  const toggleApprover = (uid: number) => {
    // If not a manager/HR, cannot toggle HR (always force selected)
    if (!isSelfManagerOrHR && approvers.find(a => a.userId === uid)?.role === 'HR') return;
    setSelectedApprovers(p =>
      p.includes(uid) ? p.filter(i => i !== uid) : [...p, uid],
    );
  };

  const handleSubmit = async () => {
    if (!selStart || !selEnd) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await leaveApi.apply({
        type: leaveType,
        startDate: selStart,
        endDate: selEnd,
        days: dayCount(selStart, selEnd),
        reason: reason || undefined,
        approverIds: selectedApprovers.length > 0 ? selectedApprovers.join(',') : undefined,
      });
      exitApply();
      onRefresh();
    } catch (e: any) {
      setSubmitError(e.message || 'Failed to submit leave application');
    }
    setSubmitting(false);
  };

  // ── Computed for dialog ───────────────────────────────────

  const selDays = selStart && selEnd ? dayCount(selStart, selEnd) : 0;
  const selTypeInfo = LEAVE_TYPES.find(t => t.value === leaveType);
  const willExceed =
    selTypeInfo?.consumesQuota && paidBalance.remaining - selDays < 0;

  const tKey = getTodayKey();

  /* ═══════════════════════════════════════════════════════════
   *  R E N D E R
   * ═══════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-6 relative">
      {/* ── Summary Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Requests', value: stats.total, color: 'text-white', accent: 'from-slate-600 to-slate-700' },
          { label: 'Approved Days', value: stats.approvedDays, color: 'text-emerald-400', accent: 'from-emerald-600/20 to-emerald-700/10' },
          { label: 'Pending', value: stats.pending, color: 'text-amber-400', accent: 'from-amber-600/20 to-amber-700/10' },
          { label: 'Rejected', value: stats.rejected, color: 'text-red-400', accent: 'from-red-600/20 to-red-700/10' },
          { label: 'Paid Balance', value: paidBalance.remaining, color: paidBalance.remaining > 0 ? 'text-blue-400' : 'text-red-400', accent: 'from-blue-600/20 to-blue-700/10' },
        ].map(s => (
          <div
            key={s.label}
            className="bg-gradient-to-br bg-slate-800 rounded-xl p-4 border border-slate-700/50 text-center transition-transform hover:scale-[1.02]"
          >
            <p className={`text-2xl font-bold ${s.color} tabular-nums`}>{s.value}</p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium uppercase tracking-wider">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Calendar ──────────────────────────────────────── */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden shadow-lg shadow-black/10">
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40 bg-slate-800/80">
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-white min-w-[180px] text-center select-none">
              {MONTHS[viewMonth]} {viewYear}
            </h3>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setViewMonth(now.getMonth());
                setViewYear(now.getFullYear());
              }}
              className="text-xs text-slate-500 hover:text-blue-400 ml-1 px-2 py-1 rounded-md hover:bg-slate-700/40 transition-all"
            >
              Today
            </button>
          </div>

          {isOwnProfile && (
            <button
              onClick={applyMode ? exitApply : () => { setApplyMode(true); setSelStart(null); setSelEnd(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                applyMode
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-600/35 hover:brightness-110'
              }`}
            >
              {applyMode ? (
                <><X className="w-4 h-4" /> Cancel</>
              ) : (
                <><Plus className="w-4 h-4" /> Apply Leave</>
              )}
            </button>
          )}
        </div>

        {/* Apply mode instruction banner */}
        {applyMode && (
          <div className="px-5 py-2.5 bg-blue-500/8 border-b border-blue-500/15 flex items-center gap-2 animate-fadeIn">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <p className="text-xs text-blue-300">
              {!selStart
                ? 'Click on a start date to begin selecting your leave range.'
                : !selEnd
                  ? 'Now click on an end date (or the same date for a single day).'
                  : 'Range selected! Fill in the details in the dialog.'}
            </p>
          </div>
        )}

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-slate-700/30 bg-slate-800/50">
          {DAYS_OF_WEEK.map(d => (
            <div
              key={d}
              className={`py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider ${
                d === 'Sun' ? 'text-red-400/60' : 'text-slate-500'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {cells.map(cell => {
            const status = getDayStatus(cell.key);
            const blocked = applyMode && isBlocked(cell.key);
            const selected = applyMode && inRange(cell.key);
            const isToday = cell.key === tKey;
            const dayLeaves = leaveMap[cell.key] || [];
            const isSunday = new Date(cell.key + 'T00:00:00').getDay() === 0;

            return (
              <div
                key={cell.key}
                onClick={() => cell.current && handleDayClick(cell.key)}
                onMouseEnter={e => {
                  // Hover preview for range selection
                  if (applyMode && selStart && !selEnd && !isBlocked(cell.key) && cell.current) {
                    setHoverDate(cell.key);
                  }
                  // Show tooltip for leave days
                  if (dayLeaves.length > 0 && cell.current) {
                    setTooltip({
                      leave: dayLeaves[0],
                      rect: (e.currentTarget as HTMLElement).getBoundingClientRect(),
                    });
                  }
                }}
                onMouseLeave={() => {
                  setHoverDate(null);
                  setTooltip(null);
                }}
                className={[
                  'relative min-h-[68px] p-1.5 border-b border-r border-slate-700/15 transition-all duration-150',
                  !cell.current && 'opacity-25 pointer-events-none',
                  cell.current && applyMode && !blocked && 'cursor-pointer hover:bg-slate-700/30',
                  cell.current && applyMode && blocked && 'cursor-not-allowed opacity-35',
                  selected && 'bg-blue-600/15 ring-1 ring-inset ring-blue-500/30',
                  isToday && !selected && 'bg-slate-700/25',
                ].filter(Boolean).join(' ')}
              >
                {/* Day number badge */}
                <span
                  className={[
                    'text-sm font-medium inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors',
                    isToday && 'bg-blue-500 text-white shadow-sm shadow-blue-500/40',
                    !isToday && cell.current && !selected && (isSunday ? 'text-red-400/70' : 'text-slate-300'),
                    !isToday && !cell.current && 'text-slate-600',
                    selected && !isToday && 'text-blue-200',
                  ].filter(Boolean).join(' ')}
                >
                  {cell.day}
                </span>

                {/* Leave type label */}
                {cell.current && dayLeaves.length > 0 && (
                  <div
                    className={[
                      'absolute top-[34px] left-1 right-1 text-center rounded-md px-0.5 py-[3px] text-[9px] font-semibold leading-tight truncate',
                      status === 'APPROVED' && 'bg-emerald-500/20 text-emerald-300',
                      status === 'PENDING' && 'bg-amber-500/20 text-amber-300',
                      status === 'REJECTED' && 'bg-red-500/15 text-red-400/70 line-through',
                    ].filter(Boolean).join(' ')}
                  >
                    {dayLeaves[0].type.replace(' Leave', '')}
                  </div>
                )}

                {/* Status dot */}
                {cell.current && status && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    <span
                      className={[
                        'w-[6px] h-[6px] rounded-full',
                        status === 'APPROVED' && 'bg-emerald-400 shadow-sm shadow-emerald-400/50',
                        status === 'PENDING' && 'bg-amber-400 shadow-sm shadow-amber-400/50 animate-pulse',
                        status === 'REJECTED' && 'bg-red-400/60',
                      ].filter(Boolean).join(' ')}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend bar */}
        <div className="px-5 py-3 border-t border-slate-700/30 flex items-center gap-5 flex-wrap bg-slate-800/50">
          {[
            { color: 'bg-emerald-400', label: 'Approved' },
            { color: 'bg-amber-400', label: 'Pending' },
            { color: 'bg-red-400', label: 'Rejected' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${l.color}`} />
              <span className="text-[11px] text-slate-400">{l.label}</span>
            </div>
          ))}
          <div className="ml-auto text-[11px] text-slate-500">
            Paid balance: <span className={`font-semibold ${paidBalance.remaining > 0 ? 'text-blue-400' : 'text-red-400'}`}>
              {paidBalance.remaining}
            </span>
            {' / '}{paidBalance.total} (used {paidBalance.used})
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════
       *  TOOLTIP  (fixed positioned, viewport-relative)
       * ═════════════════════════════════════════════════════ */}
      {tooltip && (
        <div
          className="fixed z-[60] pointer-events-none animate-fadeIn"
          style={{
            left: tooltip.rect.left + tooltip.rect.width / 2,
            top: tooltip.rect.top - 8,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-600/60 rounded-xl p-3.5 shadow-2xl shadow-black/40 min-w-[230px] max-w-[290px]">
            {/* Status badge */}
            <div className="flex items-center gap-2 mb-2">
              {tooltip.leave.status === 'APPROVED' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
              {tooltip.leave.status === 'PENDING' && <Clock className="w-3.5 h-3.5 text-amber-400" />}
              {tooltip.leave.status === 'REJECTED' && <XCircle className="w-3.5 h-3.5 text-red-400" />}
              <span
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  tooltip.leave.status === 'APPROVED'
                    ? 'text-emerald-400'
                    : tooltip.leave.status === 'PENDING'
                      ? 'text-amber-400'
                      : 'text-red-400'
                }`}
              >
                {tooltip.leave.status}
              </span>
            </div>

            <p className="text-sm font-semibold text-white">{tooltip.leave.type}</p>
            <p className="text-xs text-slate-400 mt-1">
              {fmtDisplay(tooltip.leave.startDate.split('T')[0])} →{' '}
              {fmtDisplay(tooltip.leave.endDate.split('T')[0])}
              {' · '}
              {tooltip.leave.days} day{tooltip.leave.days !== 1 ? 's' : ''}
            </p>

            {tooltip.leave.reason && (
              <p className="text-xs text-slate-500 mt-2 italic leading-relaxed border-t border-slate-700/40 pt-2">
                "{tooltip.leave.reason}"
              </p>
            )}

            {tooltip.leave.approvedBy && (
              <p className="text-[11px] text-slate-500 mt-1.5">
                Reviewed by:{' '}
                <span className="text-slate-300 font-medium">{tooltip.leave.approvedBy.username}</span>
              </p>
            )}

            {tooltip.leave.comment && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                Comment: <span className="text-slate-400">"{tooltip.leave.comment}"</span>
              </p>
            )}

            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full">
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-600/60" />
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════
       *  APPLY LEAVE DIALOG  (modal overlay)
       * ═════════════════════════════════════════════════════ */}
      {showDialog && selStart && selEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDialog(false)}
          />

          {/* Dialog card */}
          <div className="relative bg-slate-800 rounded-2xl border border-slate-600/50 shadow-2xl shadow-black/50 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Dialog header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-700/50 sticky top-0 bg-slate-800 z-10">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Apply for Leave
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {fmtDisplay(selStart)} → {fmtDisplay(selEnd)} ·{' '}
                  <span className="font-semibold text-white">{selDays} day{selDays !== 1 ? 's' : ''}</span>
                </p>
              </div>
              <button
                onClick={() => setShowDialog(false)}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* ── Leave Type Selector ─────────────────────── */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2.5 uppercase tracking-wider">
                  Leave Type
                </label>
                <div className="space-y-2">
                  {LEAVE_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setLeaveType(t.value)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        leaveType === t.value
                          ? `${t.bg} ${t.border} ${t.text}`
                          : 'border-slate-700/40 text-slate-400 hover:bg-slate-700/30 hover:text-slate-300'
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-slate-800"
                        style={{
                          backgroundColor: leaveType === t.value ? t.color : 'transparent',
                          borderColor: t.color,
                          ringColor: t.color,
                        }}
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium">{t.label}</span>
                        {t.consumesQuota && (
                          <span className="ml-2 text-[10px] opacity-50">uses paid quota</span>
                        )}
                        {t.value === 'Comp Off' && (
                          <span className="ml-2 text-[10px] opacity-50">no quota usage</span>
                        )}
                        {t.value === 'Unpaid Leave' && (
                          <span className="ml-2 text-[10px] opacity-50">salary deduction</span>
                        )}
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                          leaveType === t.value ? 'border-current' : 'border-slate-600'
                        }`}
                      >
                        {leaveType === t.value && (
                          <div className="w-2 h-2 rounded-full bg-current" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Paid Leave Balance Info ─────────────────── */}
              {selTypeInfo?.consumesQuota && (
                <div
                  className={`rounded-xl p-4 border transition-colors ${
                    willExceed
                      ? 'bg-red-500/10 border-red-500/25'
                      : 'bg-blue-500/8 border-blue-500/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {willExceed ? (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-400" />
                    )}
                    <span
                      className={`text-xs font-bold ${
                        willExceed ? 'text-red-400' : 'text-blue-400'
                      }`}
                    >
                      {willExceed ? 'Exceeds Paid Leave Quota!' : 'Paid Leave Balance'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-4 mt-1">
                    <span className="text-sm text-slate-300">
                      Remaining:{' '}
                      <span
                        className={`font-bold ${
                          paidBalance.remaining > 0 ? 'text-blue-300' : 'text-red-400'
                        }`}
                      >
                        {paidBalance.remaining}
                      </span>{' '}
                      / {paidBalance.total}
                    </span>
                    <span className="text-xs text-slate-500">Used: {paidBalance.used}</span>
                  </div>
                  {willExceed && (
                    <p className="text-xs text-red-400/80 mt-2 leading-relaxed">
                      ⚠ Applying {selDays} day(s) will exceed your paid quota by{' '}
                      {selDays - paidBalance.remaining} day(s). The excess will be treated as
                      unpaid leave with salary deduction.
                    </p>
                  )}
                </div>
              )}

              {leaveType === 'Unpaid Leave' && (
                <div className="rounded-xl p-4 border bg-amber-500/8 border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">
                      Salary Deduction Warning
                    </span>
                  </div>
                  <p className="text-xs text-amber-300/70 mt-1.5 leading-relaxed">
                    Unpaid leave will result in a proportional salary deduction for{' '}
                    {selDays} day(s).
                  </p>
                </div>
              )}

              {/* ── Reason ─────────────────────────────────── */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                  Reason
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  placeholder="Enter the reason for your leave..."
                  className="w-full bg-slate-700/40 text-white text-sm rounded-xl px-4 py-3 border border-slate-600/40 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 resize-none placeholder-slate-500 transition-all"
                />
              </div>

              {/* ── Approvers ──────────────────────────────── */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2.5 uppercase tracking-wider">
                  {isSelfManagerOrHR ? 'Inform / Notify (Optional)' : 'Send to Approvers'}
                </label>
                {loadingApprovers ? (
                  <div className="flex items-center gap-2 py-6 justify-center">
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    <span className="text-xs text-slate-400">Loading approvers…</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                    {visibleApprovers.map(a => {
                      const isHRApprover = a.role === 'HR';
                      const isManager = a.employeeId === employee.managerId;
                      const checked = selectedApprovers.includes(a.userId);
                      const cannotToggle = !isSelfManagerOrHR && isHRApprover;
                      return (
                        <label
                          key={a.userId}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all select-none ${
                            checked
                              ? 'bg-blue-500/8 border-blue-500/25'
                              : 'border-slate-700/40 hover:bg-slate-700/20'
                          } ${cannotToggle ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={cannotToggle}
                            onChange={() => toggleApprover(a.userId)}
                            className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-blue-500 focus:ring-blue-500/30 focus:ring-offset-0 accent-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white truncate">
                                {a.name}
                              </span>
                              {isHRApprover && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold">
                                  HR
                                </span>
                              )}
                              {isManager && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                                  Manager
                                </span>
                              )}
                            </div>
                            {(a.position || a.department) && (
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {[a.position, a.department].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                    {visibleApprovers.length === 0 && (
                      <p className="text-xs text-slate-500 text-center py-4 italic">
                        No supervisors available
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* ── Error display ──────────────────────────── */}
              {submitError && (
                <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400 leading-relaxed">{submitError}</p>
                </div>
              )}
            </div>

            {/* Dialog footer */}
            <div className="flex items-center gap-3 p-5 border-t border-slate-700/50 sticky bottom-0 bg-slate-800 z-10">
              <button
                onClick={() => setShowDialog(false)}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || (!isSelfManagerOrHR && selectedApprovers.length === 0)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/35 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitting ? 'Submitting…' : isSelfManagerOrHR ? 'Submit & Inform' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════
       *  RECENT LEAVE REQUESTS LIST
       * ═════════════════════════════════════════════════════ */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/40">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Recent Requests
          </h3>
        </div>

        {myLeaves.length === 0 ? (
          <div className="text-center py-14">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No leave records yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/25">
            {myLeaves.slice(0, 10).map(lv => {
              const typeInfo = LEAVE_TYPES.find(t => t.value === lv.type);
              return (
                <div
                  key={lv.id}
                  className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-700/15 transition-colors"
                >
                  {/* Color accent bar */}
                  <div
                    className="w-1 h-10 rounded-full flex-shrink-0"
                    style={{ backgroundColor: typeInfo?.color || '#64748b' }}
                  />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{lv.type}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {fmtDisplay(lv.startDate.split('T')[0])} →{' '}
                      {fmtDisplay(lv.endDate.split('T')[0])} · {lv.days} day
                      {lv.days !== 1 ? 's' : ''}
                    </p>
                    {lv.reason && (
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate italic">
                        {lv.reason}
                      </p>
                    )}
                    {lv.comment && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Review: <span className="text-slate-400">"{lv.comment}"</span>
                      </p>
                    )}
                  </div>
                  {/* Status */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {lv.status === 'APPROVED' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    {lv.status === 'PENDING' && <Clock className="w-4 h-4 text-amber-400" />}
                    {lv.status === 'REJECTED' && <XCircle className="w-4 h-4 text-red-400" />}
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        lv.status === 'APPROVED'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : lv.status === 'PENDING'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {lv.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeavesTab;