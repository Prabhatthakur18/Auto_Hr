import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, Calendar, Building2, Users,
  Loader2, AlertCircle, Briefcase, GraduationCap, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { employeeApi, leaveApi, type EmployeeDetail, type Leave } from '../services/api';
import { performanceApi } from '../services/api';
import { type Kra, type PerformanceSummary } from '../types';
import PerformanceTab from '../components/tabs/PerformanceTab';
import LeavesTab from '../components/tabs/LeavesTab';
import { AttendanceTab } from '../components/tabs/AttendanceTab';

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

const Profile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('about');
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [kras, setKras] = useState<Kra[]>([]);
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const employeeId = parseInt(id || '', 10);
  const isHR = user?.role === 'HR';

  useEffect(() => {
    if (!employeeId) return;
    loadProfile();
  }, [employeeId]);

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-slate-700 font-medium">{error || 'Employee not found'}</p>
          <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm hover:bg-blue-600 transition-colors">
            Back to Dashboard
          </button>
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
    <div className="min-h-screen bg-slate-900">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-b border-slate-700/50">
        <div className="max-w-5xl mx-auto px-6 pt-6 pb-0">
          {/* Back */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>

          {/* Profile header */}
          <div className="flex items-start gap-6 pb-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-blue-900/40 flex-shrink-0">
              {initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-white">{employee.name}</h1>
                {employee.user && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${employee.user.role === 'HR' ? 'bg-blue-500/20 text-blue-300' :
                      employee.user.role === 'MANAGER' ? 'bg-emerald-500/20 text-emerald-300' :
                        'bg-purple-500/20 text-purple-300'
                    }`}>
                    {employee.user.role}
                  </span>
                )}
              </div>
              <p className="text-slate-300 mt-0.5">{employee.position || 'No position set'}</p>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {employee.department && (
                  <span className="flex items-center gap-1.5 text-sm text-slate-400">
                    <Building2 className="w-3.5 h-3.5" /> {employee.department}
                  </span>
                )}
                {employee.email && (
                  <span className="flex items-center gap-1.5 text-sm text-slate-400">
                    <Mail className="w-3.5 h-3.5" /> {employee.email}
                  </span>
                )}
                {employee.phone && (
                  <span className="flex items-center gap-1.5 text-sm text-slate-400">
                    <Phone className="w-3.5 h-3.5" /> {employee.phone}
                  </span>
                )}
                {employee.joinDate && (
                  <span className="flex items-center gap-1.5 text-sm text-slate-400">
                    <Calendar className="w-3.5 h-3.5" /> Joined {new Date(employee.joinDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Manager + Direct Reports */}
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                {employee.manager && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-slate-500">Reports to:</span>
                    <button
                      onClick={() => navigate(`/profile/${employee.manager!.id}`)}
                      className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      {employee.manager.name}
                    </button>
                  </div>
                )}
                {employee.directReports && employee.directReports.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-500 text-sm flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Team:
                    </span>
                    {employee.directReports.map(dr => (
                      <button
                        key={dr.id}
                        onClick={() => navigate(`/profile/${dr.id}`)}
                        className="text-xs bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 hover:text-white px-2.5 py-1 rounded-full transition-colors border border-slate-600/40"
                      >
                        {dr.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Score Ring */}
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <ScoreDisplay score={summary?.overallScore ?? null} />
              <span className="text-xs text-slate-400">Performance</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === tab.id
                    ? 'text-white border-blue-500'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
              >
                {tab.label}
                {tab.id === 'leaves' && leaves.length > 0 && (
                  <span className="ml-2 text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full">{leaves.length}</span>
                )}
                {tab.id === 'performance' && summary && summary.totalKras > 0 && (
                  <span className="ml-2 text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full">{summary.totalKras}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {activeTab === 'about' && <AboutSection employee={employee} isHR={isHR} onRefresh={loadProfile} />}
        {activeTab === 'performance' && (
          <PerformanceTab
            employeeId={employeeId}
            kras={kras}
            summary={summary}
            isHR={isHR}
            onRefresh={refreshPerformance}
          />
        )}
        {activeTab === 'leaves' && <LeavesTab leaves={leaves} isHR={isHR} onRefresh={loadProfile} />}
        {activeTab === 'attendance' && <AttendanceTab employeeId={employeeId} isHR={isHR} />}
      </div>
    </div>
  );
};

// ─── About Section (inline, no separate file needed) ─────────

const AboutSection: React.FC<{ employee: EmployeeDetail; isHR: boolean; onRefresh: () => void }> = ({ employee, isHR, onRefresh }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allEmployees, setAllEmployees] = useState<{ id: number; name: string }[]>([]);
  const [form, setForm] = useState({
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
    managerId: employee.managerId ?? null as number | null,
  });

  const startEditing = async () => {
    setEditing(true);
    // Load employee list for manager dropdown
    try {
      const res = await employeeApi.list({ limit: '200' });
      if (res.data) {
        setAllEmployees(
          res.data.employees
            .filter(e => e.id !== employee.id) // can't be own manager
            .map(e => ({ id: e.id, name: e.name }))
        );
      }
    } catch { /* ignore */ }
  };


  const handleSave = async () => {
    setSaving(true);
    try {
      const skillsArr = form.skills.split(',').map(s => s.trim()).filter(Boolean);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await employeeApi.update(employee.id, {
        bio: form.bio,
        skills: skillsArr as any,
        education: form.education,
        experience: form.experience,
        position: form.position,
        department: form.department,
        phone: form.phone,
        email: form.email,
        employeeType: form.employeeType,
        managerId: form.managerId,
      } as any);
      await onRefresh();
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
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
        <div className="flex justify-end">
          <button
            onClick={startEditing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Edit Profile
          </button>
        </div>
      )}

      {editing ? (
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 space-y-4">
          <h3 className="text-white font-semibold text-lg mb-2">Edit Profile</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Position', key: 'position' },
              { label: 'Department', key: 'department' },
              { label: 'Phone', key: 'phone' },
              { label: 'Email', key: 'email' },
              { label: 'Employee Type', key: 'employeeType' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
                <input
                  value={form[f.key as keyof typeof form] ?? ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Skills (comma separated)</label>
              <input
                value={form.skills}
                onChange={e => setForm(p => ({ ...p, skills: e.target.value }))}
                className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Bio</label>
              <textarea
                rows={3}
                value={form.bio}
                onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Education</label>
              <input
                value={form.education}
                onChange={e => setForm(p => ({ ...p, education: e.target.value }))}
                className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Experience</label>
              <input
                value={form.experience}
                onChange={e => setForm(p => ({ ...p, experience: e.target.value }))}
                className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            {/* Manager Assignment */}
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Manager (Reports To)</label>
              <select
                value={form.managerId ?? ''}
                onChange={e => setForm(p => ({ ...p, managerId: e.target.value ? parseInt(e.target.value) : null }))}
                className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500"
              >
                <option value="">— No Manager (Top Level) —</option>
                {allEmployees.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
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
              className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bio */}
          <div className="md:col-span-2 bg-slate-800 rounded-2xl p-6 border border-slate-700/50">
            <h3 className="text-slate-300 font-semibold mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-400" /> Bio
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              {employee.bio || <span className="italic text-slate-500">No bio added yet</span>}
            </p>
          </div>

          {/* Skills */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700/50">
            <h3 className="text-slate-300 font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" /> Skills
            </h3>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((s, i) => (
                  <span key={i} className="text-xs px-3 py-1 bg-blue-500/15 text-blue-300 border border-blue-500/20 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm italic">No skills listed</p>
            )}
          </div>

          {/* Education & Experience */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700/50 space-y-4">
            <div>
              <h3 className="text-slate-300 font-semibold mb-1 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-400" /> Education
              </h3>
              <p className="text-slate-400 text-sm">{employee.education || <span className="italic text-slate-500">Not specified</span>}</p>
            </div>
            <div>
              <h3 className="text-slate-300 font-semibold mb-1 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-amber-400" /> Experience
              </h3>
              <p className="text-slate-400 text-sm">{employee.experience || <span className="italic text-slate-500">Not specified</span>}</p>
            </div>
          </div>

          {/* Details */}
          <div className="md:col-span-2 bg-slate-800 rounded-2xl p-6 border border-slate-700/50">
            <h3 className="text-slate-300 font-semibold mb-4">Employee Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Biometric ID', value: employee.biometricId ? `#${employee.biometricId}` : '—' },
                { label: 'Employee Type', value: employee.employeeType || '—' },
                { label: 'Department', value: employee.department || '—' },
                { label: 'Username', value: employee.user?.username || '—' },
              ].map(d => (
                <div key={d.label}>
                  <p className="text-xs text-slate-500 mb-0.5">{d.label}</p>
                  <p className="text-sm text-slate-200 font-medium">{d.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;