import React, { useEffect, useState } from 'react';
import { CalendarClock, Plus, Loader2, MapPin, User, Users, Check, X, Clock3, List, Calendar as CalendarIcon } from 'lucide-react';
import { iltApi, type ILTSession, type ILTRegistrationDetail, type ILTSessionDetail, type UserRole } from '../services/api';
import { ILTSessionComposer } from './ILTSessionComposer';
import { ILTCalendarView } from './ILTCalendarView';
import { EmployeeAvatar } from './EmployeeAvatar';
import { matchesDateFilter, matchesSearch, type PageFilterState } from '../utils/pageFilters';

interface ILTSessionsPanelProps {
  role: UserRole;
  departments: string[];
  filters?: PageFilterState;
}

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const ILTSessionsPanel: React.FC<ILTSessionsPanelProps> = ({ role, departments, filters }) => {
  const [sessions, setSessions] = useState<ILTSession[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<ILTRegistrationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [registeringId, setRegisteringId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [managingSessionId, setManagingSessionId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const isHR = role === 'HR';

  const loadAll = () => {
    setLoading(true);
    Promise.allSettled([iltApi.listSessions(), iltApi.getMyRegistrations()])
      .then(([sessRes, regRes]) => {
        if (sessRes.status === 'fulfilled' && sessRes.value.data) setSessions(sessRes.value.data.sessions);
        if (regRes.status === 'fulfilled' && regRes.value.data) setMyRegistrations(regRes.value.data.registrations);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const registrationFor = (sessionId: number) => myRegistrations.find(r => r.sessionId === sessionId && r.status !== 'CANCELLED');

  const handleRegister = async (sessionId: number) => {
    setRegisteringId(sessionId);
    try {
      await iltApi.register(sessionId);
      loadAll();
    } catch {
      // non-critical
    } finally {
      setRegisteringId(null);
    }
  };

  const handleCancel = async (registrationId: number) => {
    setCancellingId(registrationId);
    try {
      await iltApi.cancelRegistration(registrationId);
      loadAll();
    } catch {
      // non-critical
    } finally {
      setCancellingId(null);
    }
  };

  if (managingSessionId) {
    return (
      <AttendanceManager
        sessionId={managingSessionId}
        onBack={() => { setManagingSessionId(null); loadAll(); }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#f46617] animate-spin" />
      </div>
    );
  }

  const filteredSessions = filters
    ? sessions.filter(session =>
        matchesSearch(filters.search, [
          session.title,
          session.description,
          session.location,
          session.instructorName,
          session.state,
          session.targetDepartment,
          session.course?.title,
          session.createdBy?.username,
          session.capacity,
        ]) && matchesDateFilter(filters, [session.startsAt, session.endsAt, session.createdAt, session.updatedAt])
      )
    : sessions;
  const upcoming = filteredSessions.filter(s => new Date(s.startsAt) >= new Date() && s.state !== 'CANCELLED');
  const past = filteredSessions.filter(s => new Date(s.startsAt) < new Date() || s.state === 'CANCELLED');

  const renderSession = (session: ILTSession) => {
    const registration = registrationFor(session.id);
    const spotsLeft = session.capacity - (session._count?.registrations ?? 0);
    const isFull = spotsLeft <= 0;
    const cancelled = session.state === 'CANCELLED';
    const hasStarted = new Date(session.startsAt) < new Date();

    return (
      <div key={session.id} className={`bg-white rounded-[24px] border border-orange-100/50 shadow-sm p-5 ${cancelled ? 'opacity-60' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-sm font-bold text-slate-800 truncate">{session.title}</h3>
              {cancelled && (
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-100 flex-shrink-0">
                  Cancelled
                </span>
              )}
            </div>
            {session.description && <p className="text-xs text-slate-500 leading-relaxed mb-2">{session.description}</p>}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-semibold">
              <span className="inline-flex items-center gap-1"><Clock3 className="w-3 h-3" /> {fmtDateTime(session.startsAt)} – {fmtDateTime(session.endsAt)}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {session.location}</span>
              <span className="inline-flex items-center gap-1"><User className="w-3 h-3" /> {session.instructorName}</span>
              <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {session._count?.registrations ?? 0}/{session.capacity}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {isHR && (
              <button
                onClick={() => setManagingSessionId(session.id)}
                className="text-xs font-bold px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition-colors"
              >
                Manage
              </button>
            )}
            {!cancelled && !hasStarted && (
              registration ? (
                <button
                  onClick={() => handleCancel(registration.id)}
                  disabled={cancellingId === registration.id}
                  className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 transition-colors flex items-center gap-1.5"
                >
                  {cancellingId === registration.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  {registration.status === 'WAITLISTED' ? 'Leave Waitlist' : 'Cancel'}
                </button>
              ) : (
                <button
                  onClick={() => handleRegister(session.id)}
                  disabled={registeringId === session.id}
                  className="btn-orange px-3 py-2 text-xs font-bold rounded-xl"
                >
                  {registeringId === session.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isFull ? <Clock3 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                  {isFull ? 'Join Waitlist' : 'Register'}
                </button>
              )
            )}
            {registration && (
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                registration.status === 'WAITLISTED' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              }`}>
                {registration.status === 'WAITLISTED' ? 'Waitlisted' : 'Registered'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Instructor-led sessions — register for a seat</p>
        <div className="flex items-center gap-2">
          <div className="flex bg-orange-50/60 p-1.5 rounded-2xl border border-orange-100/50">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                viewMode === 'list' ? 'bg-white text-[#f46617] shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                viewMode === 'calendar' ? 'bg-white text-[#f46617] shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" /> Calendar
            </button>
          </div>
          {isHR && (
            <button onClick={() => setShowComposer(true)} className="btn-orange px-4 py-2.5 text-xs font-bold rounded-2xl">
              <Plus className="w-4 h-4" /> New Session
            </button>
          )}
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-orange-100/50 shadow-card">
          <CalendarClock className="w-12 h-12 mx-auto mb-3 opacity-50 text-slate-400" />
          <p className="font-semibold">No training sessions scheduled</p>
          {isHR && <p className="text-xs mt-1">Click "New Session" to schedule the first one.</p>}
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-orange-100/50 shadow-card">
          <CalendarClock className="w-12 h-12 mx-auto mb-3 opacity-50 text-slate-400" />
          <p className="font-semibold">No training sessions match the filters</p>
        </div>
      ) : viewMode === 'calendar' ? (
        <ILTCalendarView sessions={filteredSessions} onSelectSession={(s) => (isHR ? setManagingSessionId(s.id) : undefined)} />
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Upcoming</h3>
              <div className="space-y-3">{upcoming.map(renderSession)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Past / Cancelled</h3>
              <div className="space-y-3">{past.map(renderSession)}</div>
            </div>
          )}
        </>
      )}

      {showComposer && (
        <ILTSessionComposer
          departments={departments}
          onClose={() => setShowComposer(false)}
          onSaved={() => { setShowComposer(false); loadAll(); }}
        />
      )}
    </div>
  );
};

// ─── Attendance Manager (HR) ─────────────────────────────────

const AttendanceManager: React.FC<{ sessionId: number; onBack: () => void }> = ({ sessionId, onBack }) => {
  const [session, setSession] = useState<ILTSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [attended, setAttended] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = () => {
    setLoading(true);
    iltApi.getSession(sessionId).then(res => {
      if (res.data) {
        setSession(res.data.session);
        const initial: Record<number, boolean> = {};
        for (const reg of res.data.session.registrations) {
          if (reg.status === 'ATTENDED') initial[reg.id] = true;
          else if (reg.status === 'NO_SHOW') initial[reg.id] = false;
        }
        setAttended(initial);
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [sessionId]);

  const handleSaveAttendance = async () => {
    if (!session) return;
    setSubmitting(true);
    try {
      const active = session.registrations.filter(r => r.status === 'REGISTERED' || r.status === 'ATTENDED' || r.status === 'NO_SHOW');
      await iltApi.markAttendance(sessionId, active.map(r => ({ registrationId: r.id, attended: !!attended[r.id] })));
      load();
    } catch {
      // non-critical
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSession = async () => {
    if (!window.confirm('Cancel this session? Registered employees will be notified.')) return;
    setCancelling(true);
    try {
      await iltApi.cancelSession(sessionId);
      onBack();
    } catch {
      // non-critical
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#f46617] animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const activeRegs = session.registrations.filter(r => r.status === 'REGISTERED' || r.status === 'ATTENDED' || r.status === 'NO_SHOW');
  const waitlisted = session.registrations.filter(r => r.status === 'WAITLISTED');

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-xs font-bold text-slate-500 hover:text-slate-700">← Back to Sessions</button>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{session.title}</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
            {fmtDateTime(session.startsAt)} · {session.location}
          </p>
        </div>
        {session.state !== 'CANCELLED' && session.state !== 'COMPLETED' && (
          <button
            onClick={handleCancelSession}
            disabled={cancelling}
            className="text-xs font-bold px-4 py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 transition-colors"
          >
            {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cancel Session'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-[24px] border border-orange-100/50 shadow-card overflow-hidden divide-y divide-orange-100/40">
        {activeRegs.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-12">No registrations yet</p>
        ) : (
          activeRegs.map(reg => (
            <label key={reg.id} className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-orange-50/20 transition-colors">
              <input
                type="checkbox"
                checked={!!attended[reg.id]}
                onChange={e => setAttended(prev => ({ ...prev, [reg.id]: e.target.checked }))}
                className="w-4 h-4 rounded border-orange-200 text-[#f46617] focus:ring-brand-orange/30 accent-[#f46617] cursor-pointer bg-white"
              />
              <EmployeeAvatar name={reg.employee.name} avatar={reg.employee.avatar} gender={reg.employee.gender} size="w-8 h-8" shape="rounded" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800 truncate">{reg.employee.name}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">{reg.employee.department || 'No department'}</p>
              </div>
              <span className="text-xs font-semibold text-slate-400">{attended[reg.id] ? 'Attended' : 'Not marked'}</span>
            </label>
          ))
        )}
      </div>

      {waitlisted.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Waitlisted</h3>
          <div className="bg-white rounded-[24px] border border-orange-100/50 shadow-card overflow-hidden divide-y divide-orange-100/40">
            {waitlisted.map(reg => (
              <div key={reg.id} className="flex items-center gap-3 px-5 py-3.5">
                <EmployeeAvatar name={reg.employee.name} avatar={reg.employee.avatar} gender={reg.employee.gender} size="w-8 h-8" shape="rounded" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 truncate">{reg.employee.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">{reg.employee.department || 'No department'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeRegs.length > 0 && (
        <button
          onClick={handleSaveAttendance}
          disabled={submitting}
          className="w-full btn-orange px-4 py-3 text-sm font-bold rounded-2xl flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save Attendance
        </button>
      )}
    </div>
  );
};
