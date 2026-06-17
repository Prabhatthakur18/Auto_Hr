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
import SalaryTab from '../components/tabs/SalaryTab';
import { EmployeeAvatar } from '../components/EmployeeAvatar';

const getRoleBadgeClasses = (role: UserRole) => (
  role === 'HR'
    ? 'bg-orange-500/15 text-orange-700 border border-orange-500/20'
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
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="flex flex-col items-center z-10">
        <span className="text-2xl font-bold" style={{ color }}>{score !== null ? Math.round(score) : '—'}</span>
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">/100</span>
      </div>
    </div>
  );
};

// ─── Profile Page ────────────────────────────────────────────

type Tab = 'about' | 'performance' | 'leaves' | 'attendance' | 'salary';

export const ProfileView: React.FC<{
  employeeId: number;
  initialTab?: Tab;
  onBack?: () => void;
  onOpenEmployee?: (employeeId: number) => void;
  theme?: 'dark' | 'light';
}> = ({ employeeId, initialTab = 'about', onBack, onOpenEmployee }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
        <Loader2 className="w-10 h-10 animate-spin text-[#f46617]" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="min-h-[60vh] bg-transparent flex items-center justify-center">
        <div className="text-center bg-white border border-orange-100 rounded-3xl p-8 shadow-card max-w-sm w-full mx-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-slate-800 font-bold">{error || 'Employee not found'}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="mt-5 btn-orange w-full py-2.5 rounded-xl text-sm"
            >
              Back
            </button>
          )}
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.employeeId === employeeId;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'about', label: 'About' },
    ...(isOwnProfile ? [{ id: 'salary' as Tab, label: 'Salary' }] : []),
    { id: 'performance', label: 'Performance' },
    { id: 'leaves', label: 'Leaves' },
    { id: 'attendance', label: 'Attendance' },
  ];

  return (
    <div className="bg-white rounded-[40px] overflow-hidden border border-orange-100/60 shadow-island font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-50 via-amber-50/50 to-orange-50/20 border-b border-orange-100/60">
        <div className="mx-auto px-6 pt-6 pb-0">
          {/* Back */}
          <button
            onClick={() => (onBack ? onBack() : navigate('/'))}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-[#f46617] mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {/* Profile header */}
          <div className="flex flex-col md:flex-row items-start gap-6 pb-6">
            {/* Avatar */}
            <EmployeeAvatar
              name={employee.name}
              avatar={employee.avatar}
              gender={employee.gender}
              size="w-20 h-20"
              shape="rounded"
              className="shadow-xl shadow-orange-200/50"
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black text-slate-800 leading-tight">{employee.name}</h1>
                {employee.user && (
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${getRoleBadgeClasses(employee.user.role)}`}>
                    {employee.user.role}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-slate-500 mt-0.5">{employee.position || 'No position set'}</p>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                {employee.department && (
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-450">
                    <Building2 className="w-4 h-4 text-[#f46617]" /> {employee.department}
                  </span>
                )}
                {employee.email && (
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-455">
                    <Mail className="w-4 h-4 text-[#f46617]" /> {employee.email}
                  </span>
                )}
                {employee.phone && (
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-455">
                    <Phone className="w-4 h-4 text-[#f46617]" /> {employee.phone}
                  </span>
                )}
                {employee.joinDate && (
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-455">
                    <Calendar className="w-4 h-4 text-[#f46617]" /> Joined {new Date(employee.joinDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Manager + Direct Reports */}
              <div className="flex items-start gap-4 mt-4 flex-wrap">
                {(employee.managers && employee.managers.length > 0) || employee.manager ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reports to:</span>
                    <div className="flex gap-2 flex-wrap">
                      {employee.managers && employee.managers.length > 0 ? (
                        employee.managers.map(m => (
                          <button
                            key={m.manager.id}
                            onClick={() => (onOpenEmployee ? onOpenEmployee(m.manager.id) : navigate(`/profile/${m.manager.id}`))}
                            className="text-xs px-3 py-1 rounded-full transition-all border font-bold bg-orange-50/50 hover:bg-orange-100 text-[#f46617] border-orange-100"
                          >
                            {m.manager.name}
                          </button>
                        ))
                      ) : employee.manager ? (
                        <button
                          onClick={() => (onOpenEmployee ? onOpenEmployee(employee.manager!.id) : navigate(`/profile/${employee.manager!.id}`))}
                          className="text-xs px-3 py-1 rounded-full transition-all border font-bold bg-orange-50/50 hover:bg-orange-100 text-[#f46617] border-orange-100"
                        >
                          {employee.manager.name}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {employee.directReports && employee.directReports.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Team:
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      {employee.directReports.map(dr => (
                        <button
                          key={dr.id}
                          onClick={() => (onOpenEmployee ? onOpenEmployee(dr.id) : navigate(`/profile/${dr.id}`))}
                          className="text-xs px-3 py-1 rounded-full transition-all border font-semibold bg-white hover:bg-orange-50/30 text-slate-600 hover:text-slate-800 border-orange-100/50"
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
            <div className="flex-shrink-0 flex flex-col items-center gap-1.5 self-center md:self-start">
              <ScoreDisplay score={summary?.overallScore ?? null} />
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider mt-1">Performance</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3 text-sm font-bold transition-all border-b-2 relative ${
                    isActive
                      ? 'text-[#f46617] border-[#f46617]'
                      : 'text-slate-500 border-transparent hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                  {tab.id === 'leaves' && leaves.length > 0 && (
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 bg-orange-100 text-[#f46617] rounded-full border border-orange-100">{leaves.length}</span>
                  )}
                  {tab.id === 'performance' && summary && summary.totalKras > 0 && (
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-200">{summary.totalKras}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mx-auto px-6 py-6 bg-white">
        {activeTab === 'about' && <AboutSection employee={employee} isHR={isHR} onRefresh={loadProfile} />}
        {activeTab === 'performance' && (
          <PerformanceTab
            employeeId={employeeId}
            kras={kras}
            summary={summary}
            isHR={isHR}
            onRefresh={refreshPerformance}
            theme="light"
          />
        )}
        {activeTab === 'leaves' && <LeavesTab leaves={leaves} employee={employee} isHR={isHR} onRefresh={loadProfile} theme="light" />}
        {activeTab === 'attendance' && <AttendanceTab employeeId={employeeId} isHR={isHR} theme="light" />}
        {activeTab === 'salary' && isOwnProfile && employee && (
          <SalaryTab
            employeeId={employeeId}
            employeeName={employee.name}
            employeeDepartment={employee.department || ''}
            employeePosition={employee.position || ''}
          />
        )}
      </div>
    </div>
  );
};

// ─── About Section ───────────────────────────────────────────

const AboutSection: React.FC<{ employee: EmployeeDetail; isHR: boolean; onRefresh: () => void }> = ({ employee, isHR, onRefresh }) => {
  const navigate = useNavigate();
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
    gender: employee.gender || '',
    avatar: employee.avatar || '',
    employeeType: employee.employeeType || '',
    tallyLedgerName: employee.tallyLedgerName || '',
    joinDate: employee.joinDate ? employee.joinDate.split('T')[0] : '',
    managerId: employee.managerId ?? null as number | null,
    managerIds: employee.managers?.map(m => m.manager.id) ?? (employee.managerId ? [employee.managerId] : []) as number[],
  });

  const startEditing = async () => {
    setEditing(true);
    setSaveError(null);
    try {
      const mgrRes = await employeeApi.managersList();

      const optionsByEmployeeId = new Map<number, ManagerCandidate>();

      for (const assigned of employee.managers ?? []) {
        optionsByEmployeeId.set(assigned.manager.id, {
          employeeId: assigned.manager.id,
          name: assigned.manager.name,
          position: assigned.manager.position,
          department: assigned.manager.department,
          roleHint: undefined,
        });
      }

      for (const manager of mgrRes.data?.managers ?? []) {
        optionsByEmployeeId.set(manager.employeeId, {
          employeeId: manager.employeeId,
          name: manager.name,
          position: manager.position,
          department: manager.department,
          roleHint: manager.role,
        });
      }

      setManagerOptions(
        Array.from(optionsByEmployeeId.values()).sort((a, b) => a.name.localeCompare(b.name))
      );
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
        email: form.email.trim() ? form.email.trim() : undefined,
        gender: form.gender || null,
        avatar: form.avatar || null,
        employeeType: form.employeeType,
        tallyLedgerName: form.tallyLedgerName || null,
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
        <div className="flex justify-end gap-3 mb-2">
          <button
            onClick={handleDeactivate}
            disabled={deactivating}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-2xl transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-red-500/10"
          >
            {deactivating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Deactivate Profile
          </button>
          <button
            onClick={startEditing}
            className="btn-orange px-4 py-2 text-xs font-bold rounded-2xl"
          >
            Edit Profile
          </button>
        </div>
      )}

      {editing ? (
        <div className="bg-white rounded-[28px] p-6 border border-orange-100 shadow-sm space-y-5 text-slate-800">
          <h3 className="text-slate-850 font-black text-lg mb-2">Edit Profile Details</h3>
          {saveError && (
            <div className="rounded-xl border border-red-250 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
              {saveError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  value={form[f.key as keyof typeof form] ?? ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full bg-white text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                />
              </div>
            ))}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
              <select
                value={form.gender}
                onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}
                className="w-full bg-white text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all cursor-pointer"
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other / Prefer not to say</option>
              </select>
            </div>

            <div className="col-span-1 sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Profile Photo URL</label>
              <input
                type="url"
                value={form.avatar}
                onChange={e => setForm(p => ({ ...p, avatar: e.target.value }))}
                placeholder="https://example.com/photo.jpg"
                className="w-full bg-white text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
              />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Skills (comma separated)</label>
              <input
                value={form.skills}
                onChange={e => setForm(p => ({ ...p, skills: e.target.value }))}
                className="w-full bg-white text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
              />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Bio</label>
              <textarea
                rows={3}
                value={form.bio}
                onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                className="w-full bg-white text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Education</label>
              <input
                value={form.education}
                onChange={e => setForm(p => ({ ...p, education: e.target.value }))}
                className="w-full bg-white text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Experience</label>
              <input
                value={form.experience}
                onChange={e => setForm(p => ({ ...p, experience: e.target.value }))}
                className="w-full bg-white text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
              />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tally Ledger Name</label>
              <input
                value={form.tallyLedgerName}
                onChange={e => setForm(p => ({ ...p, tallyLedgerName: e.target.value }))}
                placeholder="Exact Tally payroll ledger name"
                className="w-full bg-white text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
              />
            </div>
            {/* Manager Assignment */}
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Managers (Reports To)</label>
              <div className="bg-white border border-orange-100 rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">
                {managerOptions.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">No managers available</p>
                ) : (
                  managerOptions.map(option => (
                    <label key={option.employeeId} className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 select-none">
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
                        className="w-4 h-4 rounded border-orange-200 text-[#f46617] focus:ring-brand-orange/30 accent-[#f46617] cursor-pointer"
                      />
                      <span className="text-sm text-slate-700 font-semibold">
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
                <div className="mt-2.5 flex flex-wrap gap-2 animate-scale-in">
                  {form.managerIds.map(managerId => {
                    const mgr = managerOptions.find(m => m.employeeId === managerId);
                    return mgr ? (
                      <span key={managerId} className="text-xs px-2.5 py-1 bg-orange-50 text-[#f46617] border border-orange-100 rounded-full flex items-center gap-1 font-bold">
                        {mgr.name}
                        <button
                          type="button"
                          onClick={() => setForm(p => ({
                            ...p,
                            managerIds: p.managerIds.filter(id => id !== managerId)
                          }))}
                          className="ml-1 hover:opacity-75"
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
          <div className="flex gap-3 pt-3 border-t border-orange-100/30">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-orange px-5 py-2.5 text-xs font-bold rounded-xl"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-5 py-2.5 bg-white border border-slate-250 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bio */}
          <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-orange-100/50 shadow-card">
            <h3 className="text-slate-800 font-black text-sm mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#f46617]" />
              Bio Description
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed font-medium">
              {employee.bio || <span className="italic text-slate-400">No bio description added yet</span>}
            </p>
          </div>

          {/* Skills */}
          <div className="bg-white rounded-3xl p-6 border border-orange-100/50 shadow-card">
            <h3 className="text-slate-800 font-black text-sm mb-3.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" />
              Specialist Skills
            </h3>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((s, i) => (
                  <span key={i} className="text-xs font-bold px-3 py-1 bg-orange-50 text-[#f46617] border border-orange-100/60 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm italic font-medium">No special skills listed yet</p>
            )}
          </div>

          {/* Education & Experience */}
          <div className="bg-white rounded-3xl p-6 border border-orange-100/50 shadow-card space-y-4">
            <div>
              <h3 className="text-slate-800 font-black text-sm mb-1.5 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#f46617]" />
                Education Details
              </h3>
              <p className="text-slate-650 text-sm font-semibold">{employee.education || <span className="italic text-slate-400 font-medium">Not specified</span>}</p>
            </div>
            <div>
              <h3 className="text-slate-800 font-black text-sm mb-1.5 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#f46617]" />
                Professional Experience
              </h3>
              <p className="text-slate-655 text-sm font-semibold">{employee.experience || <span className="italic text-slate-400 font-medium">Not specified</span>}</p>
            </div>
          </div>

          {/* Details */}
          <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-orange-100/50 shadow-card">
            <h3 className="text-slate-850 font-black text-sm mb-4">Employee Status Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Biometric ID', value: employee.biometricId ? `#${employee.biometricId}` : '—' },
                { label: 'Employee Type', value: employee.employeeType || '—' },
                { label: 'Department', value: employee.department || '—' },
                { label: 'Tally Ledger', value: employee.tallyLedgerName || '—' },
                { label: 'Username', value: employee.user?.username || '—' },
              ].map(d => (
                <div key={d.label}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{d.label}</p>
                  <p className="text-sm text-slate-800 font-black tracking-tight">{d.value}</p>
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
    if (param === 'leaves' || param === 'performance' || param === 'attendance' || param === 'salary') return param as Tab;
    return 'about' as Tab;
  })();

  return (
    <div className="min-h-screen bg-app-bg relative flex flex-col font-sans p-4 lg:p-6 overflow-x-hidden">
      {/* Background Glowing Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-orange/10 blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-400/5 blur-[120px] pointer-events-none animate-pulse-slow" />

      <div className="max-w-5xl w-full mx-auto relative z-10 flex-1 flex flex-col justify-center animate-scale-in">
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
