import React, { useEffect, useState } from 'react';
import { Users, Loader2, AlertTriangle, BellRing, Check, X } from 'lucide-react';
import { learningApi, type TeamEnrollment } from '../services/api';
import { EmployeeAvatar } from './EmployeeAvatar';
import { matchesDateFilter, matchesSearch, type PageFilterState } from '../utils/pageFilters';

const STATUS_BADGE: Record<string, string> = {
  COMPLETED: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  IN_PROGRESS: 'bg-orange-50 text-[#f46617] border border-orange-100',
  NOT_STARTED: 'bg-slate-50 text-slate-500 border border-slate-100',
  FAILED: 'bg-red-50 text-red-500 border border-red-100',
  NOMINATED: 'bg-blue-50 text-blue-600 border border-blue-100',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-600 border border-amber-100',
  REJECTED: 'bg-slate-50 text-slate-400 border border-slate-100',
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const isOverdue = (e: TeamEnrollment) =>
  !!e.dueDate && e.status !== 'COMPLETED' && new Date(e.dueDate) < new Date();

export const TeamLearningPanel: React.FC<{ filters?: PageFilterState }> = ({ filters }) => {
  const [enrollments, setEnrollments] = useState<TeamEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERDUE' | 'PENDING_APPROVAL' | 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED'>('ALL');
  const [nudgingId, setNudgingId] = useState<number | null>(null);
  const [nudgedIds, setNudgedIds] = useState<Set<number>>(new Set());
  const [nudgeError, setNudgeError] = useState<{ id: number; message: string } | null>(null);
  const [decidingId, setDecidingId] = useState<number | null>(null);

  const loadAll = () => {
    setLoading(true);
    learningApi.getTeamEnrollments()
      .then(res => { if (res.data) setEnrollments(res.data.enrollments); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const handleNudge = async (enrollmentId: number) => {
    setNudgingId(enrollmentId);
    setNudgeError(null);
    try {
      await learningApi.nudgeEnrollment(enrollmentId);
      setNudgedIds(prev => new Set(prev).add(enrollmentId));
    } catch (err: any) {
      setNudgeError({ id: enrollmentId, message: err.message || 'Failed to send reminder' });
    } finally {
      setNudgingId(null);
    }
  };

  const handleDecide = async (enrollmentId: number, approve: boolean) => {
    setDecidingId(enrollmentId);
    try {
      if (approve) await learningApi.approveCourseEnrollment(enrollmentId);
      else await learningApi.rejectCourseEnrollment(enrollmentId);
      loadAll();
    } catch {
      // non-critical
    } finally {
      setDecidingId(null);
    }
  };

  const filtered = enrollments.filter(e => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'OVERDUE') return isOverdue(e);
    return e.status === statusFilter;
  }).filter(e => {
    if (!filters) return true;
    return matchesSearch(filters.search, [
      e.employee.name,
      e.employee.department,
      e.employee.position,
      e.course.title,
      e.status,
      e.course.durationMinutes,
      e.certificate?.certificateNumber,
    ]) && matchesDateFilter(filters, [e.createdAt, e.dueDate, e.completedAt, e.certificate?.expiresAt]);
  });

  const overdueCount = enrollments.filter(isOverdue).length;
  const pendingApprovalCount = enrollments.filter(e => e.status === 'PENDING_APPROVAL').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#f46617] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
        {enrollments.length} enrollment{enrollments.length !== 1 ? 's' : ''} across your team
        {overdueCount > 0 && <span className="text-red-500"> · {overdueCount} overdue</span>}
        {pendingApprovalCount > 0 && <span className="text-amber-600"> · {pendingApprovalCount} awaiting your approval</span>}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {(['ALL', 'PENDING_APPROVAL', 'OVERDUE', 'IN_PROGRESS', 'COMPLETED', 'NOT_STARTED'] as const).map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === f ? 'bg-[#f46617] text-white shadow-sm shadow-orange-500/30' : 'bg-orange-50/60 text-slate-500 hover:bg-orange-50'
            }`}
          >
            {f === 'ALL' ? 'All' : f === 'OVERDUE' ? 'Overdue' : f === 'PENDING_APPROVAL' ? 'Pending Approval' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-orange-100/50 shadow-card">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50 text-slate-400" />
          <p className="font-semibold">No enrollments found</p>
        </div>
      ) : (
        <div className="bg-white rounded-[24px] border border-orange-100/50 shadow-card overflow-hidden divide-y divide-orange-100/40">
          {filtered.map(e => {
            const overdue = isOverdue(e);
            const nudged = nudgedIds.has(e.id);
            return (
              <div key={e.id} className={`flex items-center gap-4 px-5 py-4 ${overdue ? 'bg-red-50/30' : ''}`}>
                <EmployeeAvatar name={e.employee.name} avatar={e.employee.avatar} gender={e.employee.gender} size="w-9 h-9" shape="rounded" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 truncate">{e.employee.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">{e.employee.department || 'No department'}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700 truncate">{e.course.title}</p>
                  {e.course.mandatory && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Mandatory</p>}
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_BADGE[e.status]}`}>
                    {e.status.replace('_', ' ')}
                  </span>
                  {e.dueDate && (
                    <p className={`text-[11px] font-semibold mt-1 flex items-center justify-end gap-1 ${overdue ? 'text-red-500' : 'text-slate-400'}`}>
                      {overdue && <AlertTriangle className="w-3 h-3" />}
                      Due {fmtDate(e.dueDate)}
                    </p>
                  )}
                  {nudgeError?.id === e.id && (
                    <p className="text-[10px] text-red-500 font-semibold mt-1 max-w-[180px]">{nudgeError.message}</p>
                  )}
                </div>
                {e.status === 'PENDING_APPROVAL' ? (
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => handleDecide(e.id, true)}
                      disabled={decidingId === e.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 text-emerald-600 text-xs font-bold rounded-xl border border-emerald-100 transition-colors"
                    >
                      {decidingId === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecide(e.id, false)}
                      disabled={decidingId === e.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-60 text-slate-500 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                ) : !['NOMINATED', 'REJECTED', 'COMPLETED'].includes(e.status) && (
                  <button
                    onClick={() => handleNudge(e.id)}
                    disabled={nudgingId === e.id || nudged}
                    title={nudged ? 'Reminder sent' : 'Send a one-time reminder'}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                      nudged
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100 cursor-default'
                        : 'bg-white hover:bg-orange-50 text-slate-500 hover:text-[#f46617] border-slate-200 hover:border-orange-200'
                    }`}
                  >
                    {nudgingId === e.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : nudged ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <BellRing className="w-3.5 h-3.5" />
                    )}
                    {nudged ? 'Sent' : 'Nudge'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
