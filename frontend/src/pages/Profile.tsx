import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, Calendar, Building2, Users,
  Loader2, AlertCircle, Briefcase, GraduationCap, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  employeeApi,
  leaveApi,
  type EmployeeDetail,
  type EmployeeMutationPayload,
  type Leave,
  type UserRole,
} from '../services/api';
import { performanceApi } from '../services/api';
import { type Kra, type PerformanceSummary } from '../types';
import PerformanceTab from '../components/tabs/PerformanceTab';
import LeavesTab from '../components/tabs/LeavesTab';
import { AttendanceTab } from '../components/tabs/AttendanceTab';

const getRoleBadgeClasses = (role: UserRole) => (
  role === 'HR'
    ? 'bg-rose-500/15 text-rose-700 border border-rose-500/20'
    : role === 'LEADERSHIP'
      ? 'bg-amber-500/15 text-amber-800 border border-amber-500/20'
      : role === 'MANAGER'
        ? 'bg-teal-500/15 text-teal-800 border border-teal-500/20'
        : 'bg-slate-500/10 text-slate-700 border border-slate-500/15'
);

// ─── Score Display ───────────────────────────────────────────

const ScoreDisplay: React.FC<{ score: number | null }> = ({ score }) => {
  const size = 96;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = score !== null ? Math.min(score, 100) : 0;
  const offset = circumference - (pct / 100) * circumference;
  const color = score === null ? '#94a3b8' : score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#334155" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="flex flex-col items-center z-10">
        <span className="text-2xl font-bold" style={{ color }}>{score !== null ? Math.round(score) : '—'}</span>
        <span className="text-xs text-slate-400">/100</span>
      </div>
    </div>
  );
};

// ─── Profile Page ────────────────────────────────────────────

type Tab = 'about' | 'performance' | 'leaves' | 'attendance';

export const ProfileView: React.FC<{
  employeeId: number;
  initialTab?: Tab;
  onBack?: () => void;
  onOpenEmployee?: (employeeId: number) => void;
  theme?: 'dark' | 'light';
}> = ({ employeeId, initialTab = 'about', onBack, onOpenEmployee, theme = 'dark' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [kras, setKras] = useState<Kra[]>([]);
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isHR = user?.role === 'HR';

  useEffect(() => {
    if (!employeeId) return;
    loadProfile();
  }, [employeeId]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const [empRes, leaveRes, perfRes] = await Promise.allSettled([
        employeeApi.get(employeeId),
        leaveApi.list({ employeeId: String(employeeId) }),
        performanceApi.get(employeeId),
      ]);

      if (empRes.status === 'fulfilled' && empRes.value.data) {
        setEmployee(empRes.value.data.employee);
      } else {
        setError('Employee not found');
      }
      if (leaveRes.status === 'fulfilled' && leaveRes.value.data) {
        setLeaves(leaveRes.value.data.leaves);
      }
      if (perfRes.status === 'fulfilled' && perfRes.value.data) {
        setKras(perfRes.value.data.kras);
        setSummary(perfRes.value.data.summary);
      }
    } catch {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const refreshPerformance = async () => {
    const res = await performanceApi.get(employeeId);
    if (res.data) {
      setKras(res.data.kras);
      setSummary(res.data.summary);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-transparent flex items-center justify-center">
        <Loader2 className={`w-10 h-10 animate-spin ${isLight ? 'text-rose-500' : 'text-blue-500'}`} />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="min-h-[60vh] bg-transparent flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-slate-700 font-medium">{error || 'Employee not found'}</p>
          {onBack && (
            <button
              onClick={onBack}
              className={`mt-4 px-4 py-2 text-white rounded-xl text-sm transition-colors ${isLight ? 'bg-rose-500 hover:bg-rose-600' : 'bg-blue-500 hover:bg-blue-600'}`}
            >
              Back
            </button>
          )}
        </div>
      </div>
    );
  }

  const initials = employee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const tabs: { id: Tab; label: string }[] = [
    { id: 'about', label: 'About' },
    { id: 'performance', label: 'Performance' },
    { id: 'leaves', label: 'Leaves' },
    { id: 'attendance', label: 'Attendance' },
  ];

  return (
    <div className={isLight
      ? 'bg-white/70 backdrop-blur rounded-3xl overflow-hidden border border-rose-100 shadow-xl shadow-rose-200/40'
      : 'bg-slate-900 rounded-3xl overflow-hidden border border-slate-800/60 shadow-xl shadow-slate-950/20'
    }>
      {/* Header Banner */}
      <div className={isLight
        ? 'bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border-b border-rose-100'
        : 'bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-b border-slate-700/50'
      }>
        <div className="mx-auto px-6 pt-6 pb-0">
          {/* Back */}
          <button
            onClick={() => (onBack ? onBack() : navigate('/'))}
            className={`flex items-center gap-2 text-sm mb-6 transition-colors ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {/* Profile header */}
          <div className="flex items-start gap-6 pb-6">
            {/* Avatar */}
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-xl flex-shrink-0 ${
              isLight ? 'bg-gradient-to-br from-rose-400 to-orange-400 shadow-rose-200/60' : 'bg-gradient-to-br from-blue-400 to-indigo-600 shadow-blue-900/40'
            }`}>
              {initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{employee.name}</h1>
                {employee.user && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getRoleBadgeClasses(employee.user.role)}`}>
                    {employee.user.role}
                  </span>
                )}
              </div>
              <p className={`${isLight ? 'text-slate-600' : 'text-slate-300'} mt-0.5`}>{employee.position || 'No position set'}</p>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {employee.department && (
                  <span className={`flex items-center gap-1.5 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    <Building2 className="w-3.5 h-3.5" /> {employee.department}
                  </span>
                )}
                {employee.email && (
                  <span className={`flex items-center gap-1.5 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    <Mail className="w-3.5 h-3.5" /> {employee.email}
                  </span>
                )}
                {employee.phone && (
                  <span className={`flex items-center gap-1.5 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    <Phone className="w-3.5 h-3.5" /> {employee.phone}
                  </span>
                )}
                {employee.joinDate && (
                  <span className={`flex items-center gap-1.5 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    <Calendar className="w-3.5 h-3.5" /> Joined {new Date(employee.joinDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Manager + Direct Reports */}
              <div className="flex items-start gap-4 mt-3 flex-wrap">
                {(employee.managers && employee.managers.length > 0) || employee.manager ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-sm text-slate-500">Reports to:</span>
                    <div className="flex gap-2 flex-wrap">
                      {employee.managers && employee.managers.length > 0 ? (
                        employee.managers.map(m => (
                          <button
                            key={m.manager.id}
                            onClick={() => (onOpenEmployee ? onOpenEmployee(m.manager.id) : navigate(`/profile/${m.manager.id}`))}
                            className={`text-xs px-3 py-1 rounded-full transition-colors border font-medium ${
                              isLight
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border-rose-200'
                                : 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 hover:text-blue-300 border-blue-500/20'
                            }`}
                          >
                            {m.manager.name}
                          </button>
                        ))
                      ) : employee.manager ? (
                        <button
                          onClick={() => (onOpenEmployee ? onOpenEmployee(employee.manager!.id) : navigate(`/profile/${employee.manager!.id}`))}
                          className={`text-xs px-3 py-1 rounded-full transition-colors border font-medium ${
                            isLight
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border-rose-200'
                              : 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 hover:text-blue-300 border-blue-500/20'
                          }`}
                        >
                          {employee.manager.name}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {employee.directReports && employee.directReports.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-sm text-slate-500 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Team:
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      {employee.directReports.map(dr => (
                        <button
                          key={dr.id}
                          onClick={() => (onOpenEmployee ? onOpenEmployee(dr.id) : navigate(`/profile/${dr.id}`))}
                          className={`text-xs px-2.5 py-1 rounded-full transition-colors border ${
                            isLight
                              ? 'bg-white/70 hover:bg-white text-slate-700 hover:text-slate-900 border-rose-100'
                              : 'bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 hover:text-white border-slate-600/40'
                          }`}
                        >
                          {dr.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Score Ring */}
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <ScoreDisplay score={summary?.overallScore ?? null} />
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Performance</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === tab.id
                    ? (isLight ? 'text-slate-900 border-rose-500' : 'text-white border-blue-500')
                    : (isLight ? 'text-slate-500 border-transparent hover:text-slate-800' : 'text-slate-400 border-transparent hover:text-slate-200')
                  }`}
              >
                {tab.label}
                {tab.id === 'leaves' && leaves.length > 0 && (
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${isLight ? 'bg-rose-100 text-rose-700' : 'bg-slate-700 text-slate-300'}`}>{leaves.length}</span>
                )}
                {tab.id === 'performance' && summary && summary.totalKras > 0 && (
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${isLight ? 'bg-amber-100 text-amber-800' : 'bg-slate-700 text-slate-300'}`}>{summary.totalKras}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mx-auto px-6 py-8">
        {activeTab === 'about' && <AboutSection employee={employee} isHR={isHR} onRefresh={loadProfile} theme={theme} />}
        {activeTab === 'performance' && (
          <PerformanceTab
            employeeId={employeeId}
            kras={kras}
            summary={summary}
            isHR={isHR}
            onRefresh={refreshPerformance}
            theme={theme}
          />
        )}
        {activeTab === 'leaves' && <LeavesTab leaves={leaves} employee={employee} isHR={isHR} onRefresh={loadProfile} theme={theme} />}
        {activeTab === 'attendance' && <AttendanceTab employeeId={employeeId} isHR={isHR} theme={theme} />}
      </div>
    </div>
  );
};

// ─── About Section (inline, no separate file needed) ─────────

const AboutSection: React.FC<{ employee: EmployeeDetail; isHR: boolean; onRefresh: () => void; theme: 'dark' | 'light' }> = ({ employee, isHR, onRefresh, theme }) => {
  const navigate = useNavigate();
  const isLight = theme === 'light';
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  type ManagerCandidate = {
    employeeId: number;
    name: string;
    position: string | null;
    department: string | null;
    roleHint?: 'MANAGER' | 'LEADERSHIP';
  };
  const [managerOptions, setManagerOptions] = useState<ManagerCandidate[]>([]);
  const [form, setForm] = useState({
    name: employee.name || '',
    biometricId: employee.biometricId ? String(employee.biometricId) : '',
    bio: employee.bio || '',
    skills: (() => {
      if (Array.isArray(employee.skills)) return (employee.skills as string[]).join(', ');
      if (typeof employee.skills === 'string') {
        try { return (JSON.parse(employee.skills) as string[]).join(', '); } catch { return employee.skills; }
      }
      return '';
    })(),
    education: employee.education || '',
    experience: employee.experience || '',
    position: employee.position || '',
    department: employee.department || '',
    phone: employee.phone || '',
    email: employee.email || '',
    employeeType: employee.employeeType || '',
    joinDate: employee.joinDate ? employee.joinDate.split('T')[0] : '',
    managerId: employee.managerId ?? null as number | null,
    managerIds: employee.managers?.map(m => m.manager.id) ?? (employee.managerId ? [employee.managerId] : []) as number[],
  });

  const startEditing = async () => {
    setEditing(true);
    setSaveError(null);
    // Load all employees so HR can assign reporting lines even before managers have logins.
    try {
      const [empsRes, mgrRes] = await Promise.all([
        employeeApi.list({ page: '1', limit: '200' }),
        employeeApi.managersList(),
      ]);

      const roleHintByEmployeeId = new Map<number, 'MANAGER' | 'LEADERSHIP'>(
        (mgrRes.data?.managers ?? []).map(m => [m.employeeId, m.role])
      );

      const opts = (empsRes.data?.employees ?? [])
        .filter(e => e.id !== employee.id)
        .map(e => ({
          employeeId: e.id,
          name: e.name,
          position: e.position,
          department: e.department,
          roleHint: roleHintByEmployeeId.get(e.id),
        }));

      setManagerOptions(opts);
    } catch {
      setManagerOptions([]);
    }
  };


  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const skillsArr = form.skills.split(',').map(s => s.trim()).filter(Boolean);
      const payload: EmployeeMutationPayload = {
        name: form.name,
        biometricId: form.biometricId ? parseInt(form.biometricId, 10) : null,
        bio: form.bio,
        skills: skillsArr,
        education: form.education,
        experience: form.experience,
        position: form.position,
        department: form.department,
        phone: form.phone,
        email: form.email,
        employeeType: form.employeeType,
        joinDate: form.joinDate || null,
        managerIds: form.managerIds && form.managerIds.length > 0 ? form.managerIds : [],
      };
      await employeeApi.update(employee.id, payload);
      await onRefresh();
      setEditing(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to update employee profile';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm(`Are you sure you want to deactivate employee "${employee.name}"?`)) return;
    setDeactivating(true);
    try {
      await employeeApi.delete(employee.id);
      navigate('/');
    } catch (err: any) {
      alert(err.message || 'Failed to deactivate employee');
    } finally {
      setDeactivating(false);
    }
  };

  const skills: string[] = (() => {
    if (Array.isArray(employee.skills)) return employee.skills as string[];
    if (typeof employee.skills === 'string') {
      try { return JSON.parse(employee.skills) as string[]; } catch { return []; }
    }
    return [];
  })();

  return (
    <div className="space-y-6">
      {/* Action */}
      {isHR && !editing && (
        <div className="flex justify-end gap-3">
          <button
            onClick={handleDeactivate}
            disabled={deactivating}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {deactivating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Deactivate Employee
          </button>
          <button
            onClick={startEditing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Edit Profile
          </button>
        </div>
      )}

      {editing ? (
        <div className={isLight ? 'bg-white/85 rounded-2xl p-6 border border-[rgba(var(--hr-border),0.85)] space-y-4 text-stone-900 shadow-sm' : 'bg-slate-800 rounded-2xl p-6 border border-slate-700/50 space-y-4'}>
          <h3 className={isLight ? 'text-stone-900 font-semibold text-lg mb-2' : 'text-white font-semibold text-lg mb-2'}>Edit Profile</h3>
          {saveError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {saveError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Full Name', key: 'name' },
              { label: 'Biometric ID / EnNo', key: 'biometricId' },
              { label: 'Position', key: 'position' },
              { label: 'Department', key: 'department' },
              { label: 'Phone', key: 'phone' },
              { label: 'Email', key: 'email' },
              { label: 'Employee Type', key: 'employeeType' },
              { label: 'Join Date', key: 'joinDate', type: 'date' },
            ].map(f => (
              <div key={f.key}>
                <label className={isLight ? 'block text-xs text-stone-600 mb-1' : 'block text-xs text-slate-400 mb-1'}>{f.label}</label>
                <input
                  type={f.type || 'text'}
                  value={form[f.key as keyof typeof form] ?? ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className={isLight ? 'w-full bg-white text-stone-900 text-sm rounded-lg px-3 py-2 border border-[rgba(var(--hr-border),0.85)] focus:outline-none focus:border-rose-300' : 'w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500'}
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className={isLight ? 'block text-xs text-stone-600 mb-1' : 'block text-xs text-slate-400 mb-1'}>Skills (comma separated)</label>
              <input
                value={form.skills}
                onChange={e => setForm(p => ({ ...p, skills: e.target.value }))}
                className={isLight ? 'w-full bg-white text-stone-900 text-sm rounded-lg px-3 py-2 border border-[rgba(var(--hr-border),0.85)] focus:outline-none focus:border-rose-300' : 'w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500'}
              />
            </div>
            <div className="col-span-2">
              <label className={isLight ? 'block text-xs text-stone-600 mb-1' : 'block text-xs text-slate-400 mb-1'}>Bio</label>
              <textarea
                rows={3}
                value={form.bio}
                onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                className={isLight ? 'w-full bg-white text-stone-900 text-sm rounded-lg px-3 py-2 border border-[rgba(var(--hr-border),0.85)] focus:outline-none focus:border-rose-300 resize-none' : 'w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500 resize-none'}
              />
            </div>
            <div>
              <label className={isLight ? 'block text-xs text-stone-600 mb-1' : 'block text-xs text-slate-400 mb-1'}>Education</label>
              <input
                value={form.education}
                onChange={e => setForm(p => ({ ...p, education: e.target.value }))}
                className={isLight ? 'w-full bg-white text-stone-900 text-sm rounded-lg px-3 py-2 border border-[rgba(var(--hr-border),0.85)] focus:outline-none focus:border-rose-300' : 'w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500'}
              />
            </div>
            <div>
              <label className={isLight ? 'block text-xs text-stone-600 mb-1' : 'block text-xs text-slate-400 mb-1'}>Experience</label>
              <input
                value={form.experience}
                onChange={e => setForm(p => ({ ...p, experience: e.target.value }))}
                className={isLight ? 'w-full bg-white text-stone-900 text-sm rounded-lg px-3 py-2 border border-[rgba(var(--hr-border),0.85)] focus:outline-none focus:border-rose-300' : 'w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500'}
              />
            </div>
            {/* Manager Assignment */}
            <div className="col-span-2">
              <label className={isLight ? 'block text-xs text-stone-600 mb-2 font-medium' : 'block text-xs text-slate-400 mb-2 font-medium'}>Managers (Reports To) - Select one or more</label>
              <div className={isLight ? 'bg-white border border-[rgba(var(--hr-border),0.85)] rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto' : 'bg-slate-700 border border-slate-600 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto'}>
                {managerOptions.length === 0 ? (
                  <p className={isLight ? 'text-stone-500 text-xs italic' : 'text-slate-500 text-xs italic'}>No managers available</p>
                ) : (
                  managerOptions.map(option => (
                    <label key={option.employeeId} className="flex items-center gap-2 cursor-pointer hover:opacity-80">
                      <input
                        type="checkbox"
                        checked={form.managerIds.includes(option.employeeId)}
                        onChange={e => {
                          if (e.target.checked) {
                            setForm(p => ({
                              ...p,
                              managerIds: [...p.managerIds, option.employeeId]
                            }));
                          } else {
                            setForm(p => ({
                              ...p,
                              managerIds: p.managerIds.filter(id => id !== option.employeeId)
                            }));
                          }
                        }}
                        className="w-4 h-4 accent-rose-500 cursor-pointer"
                      />
                      <span className={isLight ? 'text-sm text-stone-700' : 'text-sm text-slate-200'}>
                        {option.name}
                        {option.position ? ` - ${option.position}` : ''}
                        {option.roleHint === 'LEADERSHIP' ? ' (Leadership)' : ''}
                        {option.roleHint === 'MANAGER' ? ' (Manager)' : ''}
                      </span>
                    </label>
                  ))
                )}
              </div>
              {form.managerIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.managerIds.map(managerId => {
                    const mgr = managerOptions.find(m => m.employeeId === managerId);
                    return mgr ? (
                      <span key={managerId} className={isLight ? 'text-xs px-2 py-1 bg-rose-100 text-rose-700 border border-rose-200 rounded-full flex items-center gap-1' : 'text-xs px-2 py-1 bg-blue-500/15 text-blue-300 border border-blue-500/20 rounded-full flex items-center gap-1'}>
                        {mgr.name}
                        <button
                          type="button"
                          onClick={() => setForm(p => ({
                            ...p,
                            managerIds: p.managerIds.filter(id => id !== managerId)
                          }))}
                          className="ml-1 hover:opacity-70"
                        >
                          ✕
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
            </button>
            <button
              onClick={() => setEditing(false)}
              className={isLight ? 'px-5 py-2 bg-white border border-[rgba(var(--hr-border),0.85)] text-stone-700 text-sm rounded-xl hover:bg-rose-50 transition-colors' : 'px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-xl transition-colors'}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bio */}
          <div className={isLight ? 'md:col-span-2 bg-white/80 rounded-2xl p-6 border border-[rgba(var(--hr-border),0.85)] shadow-sm' : 'md:col-span-2 bg-slate-800 rounded-2xl p-6 border border-slate-700/50'}>
            <h3 className={isLight ? 'text-stone-900 font-semibold mb-3 flex items-center gap-2' : 'text-slate-300 font-semibold mb-3 flex items-center gap-2'}>
              <Briefcase className={`w-4 h-4 ${isLight ? 'text-rose-500' : 'text-blue-400'}`} /> Bio
            </h3>
            <p className={isLight ? 'text-stone-600 text-sm leading-relaxed' : 'text-slate-400 text-sm leading-relaxed'}>
              {employee.bio || <span className={isLight ? 'italic text-stone-500' : 'italic text-slate-500'}>No bio added yet</span>}
            </p>
          </div>

          {/* Skills */}
          <div className={isLight ? 'bg-white/80 rounded-2xl p-6 border border-[rgba(var(--hr-border),0.85)] shadow-sm' : 'bg-slate-800 rounded-2xl p-6 border border-slate-700/50'}>
            <h3 className={isLight ? 'text-stone-900 font-semibold mb-3 flex items-center gap-2' : 'text-slate-300 font-semibold mb-3 flex items-center gap-2'}>
              <Sparkles className={`w-4 h-4 ${isLight ? 'text-purple-500' : 'text-purple-400'}`} /> Skills
            </h3>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((s, i) => (
                  <span key={i} className={isLight ? 'text-xs px-3 py-1 bg-rose-100 text-rose-700 border border-rose-200 rounded-full' : 'text-xs px-3 py-1 bg-blue-500/15 text-blue-300 border border-blue-500/20 rounded-full'}>
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className={isLight ? 'text-stone-600 text-sm italic' : 'text-slate-500 text-sm italic'}>No skills listed</p>
            )}
          </div>

          {/* Education & Experience */}
          <div className={isLight ? 'bg-white/80 rounded-2xl p-6 border border-[rgba(var(--hr-border),0.85)] shadow-sm space-y-4' : 'bg-slate-800 rounded-2xl p-6 border border-slate-700/50 space-y-4'}>
            <div>
              <h3 className={isLight ? 'text-stone-900 font-semibold mb-1 flex items-center gap-2' : 'text-slate-300 font-semibold mb-1 flex items-center gap-2'}>
                <GraduationCap className={`w-4 h-4 ${isLight ? 'text-emerald-500' : 'text-emerald-400'}`} /> Education
              </h3>
              <p className={isLight ? 'text-stone-600 text-sm' : 'text-slate-400 text-sm'}>{employee.education || <span className={isLight ? 'italic text-stone-500' : 'italic text-slate-500'}>Not specified</span>}</p>
            </div>
            <div>
              <h3 className={isLight ? 'text-stone-900 font-semibold mb-1 flex items-center gap-2' : 'text-slate-300 font-semibold mb-1 flex items-center gap-2'}>
                <Briefcase className={`w-4 h-4 ${isLight ? 'text-amber-500' : 'text-amber-400'}`} /> Experience
              </h3>
              <p className={isLight ? 'text-stone-600 text-sm' : 'text-slate-400 text-sm'}>{employee.experience || <span className={isLight ? 'italic text-stone-500' : 'italic text-slate-500'}>Not specified</span>}</p>
            </div>
          </div>

          {/* Details */}
          <div className={isLight ? 'md:col-span-2 bg-white/80 rounded-2xl p-6 border border-[rgba(var(--hr-border),0.85)] shadow-sm' : 'md:col-span-2 bg-slate-800 rounded-2xl p-6 border border-slate-700/50'}>
            <h3 className={isLight ? 'text-stone-900 font-semibold mb-4' : 'text-slate-300 font-semibold mb-4'}>Employee Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Biometric ID', value: employee.biometricId ? `#${employee.biometricId}` : '—' },
                { label: 'Employee Type', value: employee.employeeType || '—' },
                { label: 'Department', value: employee.department || '—' },
                { label: 'Username', value: employee.user?.username || '—' },
              ].map(d => (
                <div key={d.label}>
                  <p className={isLight ? 'text-xs text-stone-600 mb-0.5' : 'text-xs text-slate-500 mb-0.5'}>{d.label}</p>
                  <p className={isLight ? 'text-sm text-stone-900 font-medium' : 'text-sm text-slate-200 font-medium'}>{d.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Profile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const employeeId = parseInt(id || '', 10);

  const initialTab = (() => {
    const param = new URLSearchParams(location.search).get('tab');
    if (param === 'leaves' || param === 'performance' || param === 'attendance') return param as Tab;
    return 'about' as Tab;
  })();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <ProfileView
          employeeId={employeeId}
          initialTab={initialTab}
          onBack={() => navigate('/')}
          onOpenEmployee={(empId) => navigate(`/profile/${empId}`)}
        />
      </div>
    </div>
  );
};

export default Profile;
