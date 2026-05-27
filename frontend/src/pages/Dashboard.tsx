import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/LoginForm';
import {
  Users, Calendar, Clock, DollarSign, Megaphone,
  LogOut, Shield, ChevronRight,
  Home, FileText, BarChart3, Loader2,
  CheckCircle, XCircle, MessageSquare, X, Send, AlertTriangle,
  UserPlus, Search, Filter, RefreshCw
} from 'lucide-react';
import {
  employeeApi,
  leaveApi,
  announcementApi,
  type Employee,
  type Leave,
  type Announcement,
  type AuthUser,
  type UserRole,
} from '../services/api';
import { AttendancePanel } from '../components/AttendancePanel';
import { ProfileDrawer } from '../components/ProfileDrawer';

const ALL_ACCESS_ROLES: UserRole[] = ['HR', 'LEADERSHIP'];
const MANAGEMENT_ROLES: UserRole[] = ['HR', 'LEADERSHIP', 'MANAGER'];

const getRoleBadgeClasses = (role: UserRole) => (
  role === 'HR'
    ? 'bg-rose-500/15 text-rose-700 border border-rose-500/20'
    : role === 'LEADERSHIP'
      ? 'bg-amber-500/15 text-amber-800 border border-amber-500/20'
      : role === 'MANAGER'
        ? 'bg-teal-500/15 text-teal-800 border border-teal-500/20'
        : 'bg-slate-500/10 text-slate-700 border border-slate-500/15'
);

// ─── Dashboard Page ──────────────────────────────────────────

const Dashboard: React.FC = () => {
  const { user, isLoggedIn, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [profileDrawer, setProfileDrawer] = useState<{ open: boolean; employeeId: number | null; tab: 'about' | 'performance' | 'leaves' | 'attendance' }>({
    open: false,
    employeeId: null,
    tab: 'about',
  });

  useEffect(() => {
    if (isLoggedIn) {
      loadDashboardData();
    }
  }, [isLoggedIn]);

  const loadDashboardData = async () => {
    setDataLoading(true);
    try {
      const [empRes, leaveRes, annRes] = await Promise.allSettled([
        employeeApi.list(),
        leaveApi.list(),
        announcementApi.list(),
      ]);

      if (empRes.status === 'fulfilled' && empRes.value.data) {
        setEmployees(empRes.value.data.employees);
      }
      if (leaveRes.status === 'fulfilled' && leaveRes.value.data) {
        setLeaves(leaveRes.value.data.leaves);
      }
      if (annRes.status === 'fulfilled' && annRes.value.data) {
        setAnnouncements(annRes.value.data.announcements);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
      </div>
    );
  }

  // Show login if not authenticated
  if (!isLoggedIn) {
    return <LoginForm />;
  }

  const role: UserRole = user?.role || 'EMPLOYEE';
  const name = user?.employee?.name || user?.username || 'User';

  // Define sidebar navigation based on role
  const navItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'employees', label: role === 'EMPLOYEE' ? 'My Profile' : 'Employees', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'leaves', label: 'Leaves', icon: Calendar },
    { id: 'salary', label: 'Salary', icon: DollarSign },
    ...(ALL_ACCESS_ROLES.includes(role) ? [
      { id: 'reports', label: 'Reports', icon: BarChart3 },
    ] : []),
  ];

  const pendingLeaves = leaves.filter(l => l.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white/70 backdrop-blur text-slate-800 flex flex-col min-h-screen fixed border-r border-rose-100">
        {/* Logo */}
        <div className="p-6 border-b border-rose-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center shadow-lg shadow-rose-300/40">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Auto HR</h1>
              <p className="text-xs text-slate-500">Autoform India</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="px-6 py-4 border-b border-rose-100/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-rose-200/60">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{name}</p>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${getRoleBadgeClasses(role)}`}>
                {role}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all relative ${activeTab === item.id
                  ? 'text-slate-900 bg-rose-100/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-rose-100/40'
                }`}
            >
              {activeTab === item.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-rose-500 rounded-r-full" />
              )}
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
              {item.id === 'leaves' && pendingLeaves > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {pendingLeaves}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-rose-100">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-rose-100/40 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        {dataLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewPanel
                role={role}
                name={name}
                employeeCount={employees.length}
                pendingLeaves={pendingLeaves}
                announcementCount={announcements.length}
                announcements={announcements}
              />
            )}
            {activeTab === 'employees' && (
              <EmployeesPanel
                employees={employees}
                role={role}
                onRefresh={loadDashboardData}
                onOpenProfile={(employeeId: number) => setProfileDrawer({ open: true, employeeId, tab: 'about' })}
              />
            )}
            {activeTab === 'announcements' && (
              <AnnouncementsPanel announcements={announcements} role={role} />
            )}
            {activeTab === 'leaves' && (
              <LeavesPanel
                leaves={leaves}
                role={role}
                user={user}
                onRefresh={loadDashboardData}
                onOpenApplyLeave={(employeeId: number) => setProfileDrawer({ open: true, employeeId, tab: 'leaves' })}
              />
            )}
            {activeTab === 'attendance' && (
              <AttendancePanel user={user} employees={employees} />
            )}
            {['salary', 'reports'].includes(activeTab) && (
              <ComingSoonPanel title={navItems.find(n => n.id === activeTab)?.label || activeTab} />
            )}
          </>
        )}
      </main>

      {profileDrawer.open && profileDrawer.employeeId && (
        <ProfileDrawer
          employeeId={profileDrawer.employeeId}
          initialTab={profileDrawer.tab}
          onClose={() => setProfileDrawer({ open: false, employeeId: null, tab: 'about' })}
        />
      )}
    </div>
  );
};

// ─── Overview Panel ──────────────────────────────────────────

interface OverviewProps {
  role: UserRole;
  name: string;
  employeeCount: number;
  pendingLeaves: number;
  announcementCount: number;
  announcements: Announcement[];
}

const OverviewPanel: React.FC<OverviewProps> = ({
  role, name, employeeCount, pendingLeaves, announcementCount, announcements
}) => {
  const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  const stats = role === 'EMPLOYEE' ? [
    { label: 'Pending Leaves', value: pendingLeaves, icon: Calendar, color: 'from-amber-400 to-orange-500' },
    { label: 'Announcements', value: announcementCount, icon: Megaphone, color: 'from-violet-400 to-purple-500' },
  ] : [
    { label: 'Total Employees', value: employeeCount, icon: Users, color: 'from-blue-400 to-indigo-500' },
    { label: 'Pending Leaves', value: pendingLeaves, icon: Calendar, color: 'from-amber-400 to-orange-500' },
    { label: 'Announcements', value: announcementCount, icon: Megaphone, color: 'from-violet-400 to-purple-500' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">{greeting}, {name}</h2>
        <p className="text-slate-500 mt-1">Here's what's happening today</p>
      </div>

      {/* Stats Cards */}
      <div className={`grid gap-6 mb-8 ${role === 'EMPLOYEE' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Announcements */}
      {announcements.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-indigo-500" />
            Recent Announcements
          </h3>
          <div className="space-y-3">
            {announcements.slice(0, 3).map(ann => (
              <div key={ann.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <span className={`inline-block w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${ann.priority === 'URGENT' ? 'bg-red-500' :
                    ann.priority === 'HIGH' ? 'bg-amber-500' :
                      ann.priority === 'MEDIUM' ? 'bg-blue-500' : 'bg-slate-300'
                  }`} />
                <div>
                  <p className="text-sm font-medium text-slate-900">{ann.title}</p>
                  {ann.content && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{ann.content}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(ann.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Employees Panel ─────────────────────────────────────────

interface EmployeesPanelProps {
  employees: Employee[];
  role: UserRole;
  onRefresh: () => void;
  onOpenProfile: (employeeId: number) => void;
}

const EmployeesPanel: React.FC<EmployeesPanelProps> = ({ employees, role, onRefresh, onOpenProfile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [syncingMasterData, setSyncingMasterData] = useState(false);
  
  // Add employee modal states
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [biometricId, setBiometricId] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeType, setEmployeeType] = useState('Full-time');
  const [createUser, setCreateUser] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [systemRole, setSystemRole] = useState<UserRole>('EMPLOYEE');
  const [managerId, setManagerId] = useState('');
  type ManagerCandidate = {
    employeeId: number;
    name: string;
    position: string | null;
    department: string | null;
    roleHint?: 'MANAGER' | 'LEADERSHIP';
  };
  const [availableManagers, setAvailableManagers] = useState<ManagerCandidate[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Extract unique departments for filtering
  const departments = ['ALL', ...Array.from(new Set(employees.map(e => e.department).filter(Boolean)))];

  // Filtered employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.position && emp.position.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesDept = deptFilter === 'ALL' || emp.department === deptFilter;
    
    return matchesSearch && matchesDept;
  });

  const resetForm = () => {
    setName('');
    setBiometricId('');
    setPosition('');
    setDepartment('');
    setEmail('');
    setPhone('');
    setEmployeeType('Full-time');
    setCreateUser(false);
    setUsername('');
    setPassword('');
    setSystemRole('EMPLOYEE');
    setManagerId('');
    setError('');
  };

  const loadManagerOptions = async () => {
    setLoadingManagers(true);
    try {
      const res = await employeeApi.managersList();
      const roleHintByEmployeeId = new Map<number, 'MANAGER' | 'LEADERSHIP'>(
        (res.data?.managers ?? []).map(m => [m.employeeId, m.role])
      );

      setAvailableManagers(
        employees.map(e => ({
          employeeId: e.id,
          name: e.name,
          position: e.position,
          department: e.department,
          roleHint: roleHintByEmployeeId.get(e.id),
        }))
      );
    } catch {
      setAvailableManagers(
        employees.map(e => ({
          employeeId: e.id,
          name: e.name,
          position: e.position,
          department: e.department,
        }))
      );
    } finally {
      setLoadingManagers(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Employee name is required');
      return;
    }
    if (createUser && (!username.trim() || !password.trim())) {
      setError('Username and password are required for user account creation');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload: any = {
        name,
        position: position || undefined,
        department: department || undefined,
        email: email || undefined,
        phone: phone || undefined,
        employeeType: employeeType || undefined,
        biometricId: biometricId ? parseInt(biometricId, 10) : undefined,
        managerId: managerId ? parseInt(managerId, 10) : undefined,
      };

      if (createUser) {
        payload.createUser = true;
        payload.username = username;
        payload.password = password;
        payload.role = systemRole;
      }

      const res = await employeeApi.create(payload);
      if (res.success) {
        setShowModal(false);
        resetForm();
        onRefresh();
      } else {
        setError('Failed to create employee profile');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while creating employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncMasterData = async () => {
    setSyncingMasterData(true);
    setError('');
    try {
      const res = await employeeApi.syncMasterData();
      if (res.success) {
        await onRefresh();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync master employee data');
    } finally {
      setSyncingMasterData(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {role === 'EMPLOYEE' ? 'My Profile' : 'Employees'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {filteredEmployees.length} of {employees.length} {employees.length === 1 ? 'employee' : 'employees'} listed
          </p>
        </div>
        
        {role === 'HR' && (
          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={handleSyncMasterData}
              disabled={syncingMasterData}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 disabled:opacity-60 text-slate-800 text-sm font-semibold rounded-xl transition-all"
            >
              {syncingMasterData ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sync Master Data
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
                void loadManagerOptions();
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-blue-500/10"
            >
              <UserPlus className="w-4 h-4" /> Add Employee
            </button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, position or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200 rounded-xl shadow-sm min-w-[160px]">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="w-full text-xs font-semibold text-slate-600 bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
          >
            {departments.map(d => (
              <option key={d} value={d || ''}>
                {d === 'ALL' ? 'All Departments' : d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Employees Grid */}
      {filteredEmployees.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50 text-slate-400" />
          <p>No matching employees found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fadeIn">
          {filteredEmployees.map(emp => (
            <div
              key={emp.id}
              onClick={() => onOpenProfile(emp.id)}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-200 transition-all group cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                  {emp.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                    {emp.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{emp.position || 'No position set'}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{emp.department || 'No department'}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all ml-3 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Add Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { if (!submitting) setShowModal(false); }} />
          
          {/* Dialog Box */}
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-500" />
                Add New Employee Profile
              </h3>
              <button
                disabled={submitting}
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Employee details */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    disabled={submitting}
                    placeholder="e.g. John Doe"
                    className="w-full text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Biometric ID / EnNo
                  </label>
                  <input
                    type="number"
                    value={biometricId}
                    onChange={e => setBiometricId(e.target.value)}
                    disabled={submitting}
                    placeholder="e.g. 48"
                    className="w-full text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Employee Type
                  </label>
                  <select
                    value={employeeType}
                    onChange={e => setEmployeeType(e.target.value)}
                    disabled={submitting}
                    className="w-full text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer bg-white"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Position / Designation
                  </label>
                  <input
                    type="text"
                    value={position}
                    onChange={e => setPosition(e.target.value)}
                    disabled={submitting}
                    placeholder="e.g. Software Engineer"
                    className="w-full text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    disabled={submitting}
                    placeholder="e.g. Engineering"
                    className="w-full text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={submitting}
                    placeholder="e.g. john@example.com"
                    className="w-full text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    disabled={submitting}
                    placeholder="e.g. +91 99999 88888"
                    className="w-full text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-slate-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Reporting Manager
                  </label>
                  <select
                    value={managerId}
                    onChange={e => setManagerId(e.target.value)}
                    disabled={submitting || loadingManagers}
                    className="w-full text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer bg-white disabled:bg-slate-50"
                  >
                    <option value="">
                      {loadingManagers ? 'Loading managers...' : 'No manager assigned'}
                    </option>
                    {availableManagers.map(manager => (
                      <option key={manager.employeeId} value={String(manager.employeeId)}>
                        {manager.name}
                        {manager.position ? ` - ${manager.position}` : ''}
                        {manager.roleHint === 'LEADERSHIP' ? ' (Leadership)' : ''}
                        {manager.roleHint === 'MANAGER' ? ' (Manager)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Checkbox: Create login account */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={createUser}
                    onChange={e => setCreateUser(e.target.checked)}
                    disabled={submitting}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 accent-blue-600 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Create User Account (System Access)
                  </span>
                </label>
              </div>

              {/* User account details */}
              {createUser && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                        Username *
                      </label>
                      <input
                        type="text"
                        required={createUser}
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        disabled={submitting}
                        placeholder="Username for login"
                        className="w-full text-slate-800 bg-white text-sm rounded-xl px-3.5 py-2.5 border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                        Password *
                      </label>
                      <input
                        type="password"
                        required={createUser}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        disabled={submitting}
                        placeholder="Min 6 characters"
                        className="w-full text-slate-800 bg-white text-sm rounded-xl px-3.5 py-2.5 border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-slate-400"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                        Access Role
                      </label>
                      <select
                        value={systemRole}
                        onChange={e => setSystemRole(e.target.value as any)}
                        disabled={submitting}
                        className="w-full text-slate-800 bg-white text-sm rounded-xl px-3.5 py-2.5 border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer"
                      >
                        <option value="EMPLOYEE">Employee (Standard Access)</option>
                        <option value="MANAGER">Manager (Team Approval/Performance)</option>
                        <option value="HR">HR Admin (Full Access)</option>
                        <option value="LEADERSHIP">Leadership (Company-wide Visibility)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-3 text-xs flex gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </form>

            <div className="flex items-center gap-3 p-5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                onClick={handleCreateEmployee}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-500/10 transition-all"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitting ? 'Creating...' : 'Create Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Announcements Panel ─────────────────────────────────────

const AnnouncementsPanel: React.FC<{ announcements: Announcement[]; role: UserRole }> = ({ announcements }) => (
  <div>
    <h2 className="text-2xl font-bold text-slate-900 mb-6">Announcements</h2>
    {announcements.length === 0 ? (
      <div className="text-center py-16 text-slate-400">
        <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No announcements yet</p>
      </div>
    ) : (
      <div className="space-y-4">
        {announcements.map(ann => (
          <div key={ann.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-2 ${ann.priority === 'URGENT' ? 'bg-red-50 text-red-600' :
                    ann.priority === 'HIGH' ? 'bg-amber-50 text-amber-600' :
                      ann.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'
                  }`}>
                  {ann.priority}
                </span>
                <h3 className="text-lg font-semibold text-slate-900">{ann.title}</h3>
                {ann.content && <p className="text-sm text-slate-600 mt-2 leading-relaxed">{ann.content}</p>}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
              <span>By {ann.createdBy?.username || 'Admin'}</span>
              <span>•</span>
              <span>{new Date(ann.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ─── Leaves Panel ────────────────────────────────────────────

const LeavesPanel: React.FC<{
  leaves: Leave[];
  role: UserRole;
  user: AuthUser | null;
  onRefresh: () => void;
  onOpenApplyLeave: (employeeId: number) => void;
}> = ({ leaves, role, user, onRefresh, onOpenApplyLeave }) => {
  const [activeLeave, setActiveLeave] = useState<Leave | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [category, setCategory] = useState<'TEAM' | 'MY'>('TEAM');
  const [leaveActionNotice, setLeaveActionNotice] = useState('');

  const isManagement = MANAGEMENT_ROLES.includes(role);
  const canApplyLeave = Boolean(user?.employeeId);
  const ownLeaves = user?.employeeId ? leaves.filter(leave => leave.employeeId === user.employeeId) : [];
  const hierarchyLeaves = user?.employeeId ? leaves.filter(leave => leave.employeeId !== user.employeeId) : leaves;
  const teamLabel = ALL_ACCESS_ROLES.includes(role) ? 'All Leaves' : 'Team Leaves';

  const filteredLeaves = leaves.filter(l => {
    // 1. Status Filter
    if (filter !== 'ALL' && l.status !== filter) return false;

    // 2. Category Filter (for Managers and HR with linked employee profiles)
    if (isManagement && user?.employeeId) {
      if (category === 'MY') {
        return l.employeeId === user.employeeId;
      } else {
        return l.employeeId !== user.employeeId;
      }
    }

    return true;
  });

  const openReviewModal = (leave: Leave, type: 'APPROVE' | 'REJECT') => {
    setActiveLeave(leave);
    setActionType(type);
    setComment('');
    setError('');
  };

  const handleApplyLeave = () => {
    if (!user) return;

    if (user.employeeId) {
      setLeaveActionNotice('');
      onOpenApplyLeave(user.employeeId);
      return;
    }

    setLeaveActionNotice('This account is not linked to an employee profile yet. Link the HR or leadership user to an employee record to submit leave.');
  };

  const handleConfirmAction = async () => {
    if (!activeLeave || !actionType) return;
    setSubmitting(true);
    setError('');
    try {
      if (actionType === 'APPROVE') {
        await leaveApi.approve(activeLeave.id, comment || undefined);
      } else {
        await leaveApi.reject(activeLeave.id, comment || undefined);
      }
      setActiveLeave(null);
      setActionType(null);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update leave status');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Leave Management</h2>
          {role === 'EMPLOYEE' && (
            <p className="text-sm text-slate-500 mt-0.5">View your leave history. Use the button to apply.</p>
          )}
          {isManagement && (
            <p className="text-sm text-slate-500 mt-0.5">
              {category === 'TEAM'
                ? role === 'HR'
                  ? 'Review and manage all employee leave requests.'
                  : role === 'LEADERSHIP'
                    ? 'Review and manage company-wide leave requests.'
                  : 'Review and manage leave requests across your reporting hierarchy.'
                : 'View your own leave application history and status.'}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex flex-col items-start gap-1.5">
            <button
              onClick={handleApplyLeave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-blue-500/10"
            >
              <Calendar className="w-4 h-4" /> Add Leave
            </button>
            {!canApplyLeave && leaveActionNotice && (
              <p className="max-w-xs text-xs text-amber-600">
                {leaveActionNotice}
              </p>
            )}
          </div>

          {/* Filters */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filter === f
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Tabs for Management */}
      {isManagement && user?.employeeId && (
        <div className="flex border-b border-slate-200 mb-6 gap-6">
          <button
            onClick={() => setCategory('TEAM')}
            className={`pb-3 text-sm font-semibold relative transition-all ${
              category === 'TEAM'
                ? 'text-blue-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {teamLabel}
            <span className="ml-2 text-xs text-slate-400">({hierarchyLeaves.length})</span>
            {category === 'TEAM' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setCategory('MY')}
            className={`pb-3 text-sm font-semibold relative transition-all ${
              category === 'MY'
                ? 'text-blue-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            My Leaves
            <span className="ml-2 text-xs text-slate-400">({ownLeaves.length})</span>
            {category === 'MY' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        </div>
      )}

      {filteredLeaves.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50 text-slate-400" />
          <p>No leave records found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeaves.map(leave => (
            <div key={leave.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-slate-200 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    leave.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-500' :
                    leave.status === 'REJECTED' ? 'bg-red-50 text-red-500' :
                    'bg-amber-50 text-amber-500'
                  }`}>
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {leave.employee?.name || 'Employee'} — <span className="text-slate-600">{leave.type}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(leave.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' → '}
                      {new Date(leave.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}
                      <span className="font-medium text-slate-700">{leave.days} day{leave.days > 1 ? 's' : ''}</span>
                    </p>
                    {leave.reason && (
                      <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                        "{leave.reason}"
                      </p>
                    )}
                    {leave.comment && (
                      <div className="flex gap-1.5 items-start text-xs text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <p>
                          <span className="font-semibold text-slate-700">Review comment:</span> "{leave.comment}"
                          {leave.approvedBy && (
                            <span className="text-slate-400 block mt-0.5">by {leave.approvedBy.username}</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    leave.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    leave.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' :
                    'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                    {leave.status}
                  </span>
                  
                  {leave.status === 'PENDING' && 
                   MANAGEMENT_ROLES.includes(role) && 
                   leave.employeeId !== user?.employeeId && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openReviewModal(leave, 'APPROVE')}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center gap-1 shadow-sm shadow-emerald-500/10"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => openReviewModal(leave, 'REJECT')}
                        className="px-3 py-1.5 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-1 shadow-sm shadow-red-500/10"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Dialog Modal */}
      {activeLeave && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { if (!submitting) { setActiveLeave(null); setActionType(null); } }} />
          
          {/* Dialog Box */}
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {actionType === 'APPROVE' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                {actionType === 'APPROVE' ? 'Approve Leave Request' : 'Reject Leave Request'}
              </h3>
              <button
                disabled={submitting}
                onClick={() => { setActiveLeave(null); setActionType(null); }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-1.5">
                <p className="text-slate-500">Employee: <span className="font-semibold text-slate-800">{activeLeave.employee?.name}</span></p>
                <p className="text-slate-500">Leave Type: <span className="font-semibold text-slate-800">{activeLeave.type}</span></p>
                <p className="text-slate-500">Dates: <span className="font-semibold text-slate-800">
                  {new Date(activeLeave.startDate).toLocaleDateString('en-IN')} → {new Date(activeLeave.endDate).toLocaleDateString('en-IN')} ({activeLeave.days} days)
                </span></p>
                {activeLeave.reason && (
                  <p className="text-slate-500 mt-2 italic pt-1 border-t border-slate-200/60">
                    Reason: "{activeLeave.reason}"
                  </p>
                )}
              </div>

              {/* Comment Text Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Review Comment (Optional)
                </label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  disabled={submitting}
                  rows={3}
                  placeholder={`Write comments regarding this ${actionType === 'APPROVE' ? 'approval' : 'rejection'}...`}
                  className="w-full text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 resize-none transition-all placeholder-slate-400"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-3 text-xs flex gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 p-5 border-t border-slate-100 bg-slate-50">
              <button
                disabled={submitting}
                onClick={() => { setActiveLeave(null); setActionType(null); }}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={handleConfirmAction}
                className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-white text-sm font-semibold rounded-xl shadow-sm transition-all ${
                  actionType === 'APPROVE'
                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10'
                    : 'bg-red-500 hover:bg-red-600 shadow-red-500/10'
                }`}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitting ? 'Submitting...' : actionType === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Coming Soon Panel ───────────────────────────────────────

const ComingSoonPanel: React.FC<{ title: string }> = ({ title }) => (
  <div className="text-center py-20">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
      <FileText className="w-8 h-8 text-slate-400" />
    </div>
    <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
    <p className="text-slate-500">This section is coming soon</p>
    <p className="text-sm text-slate-400 mt-1">We're building something great here</p>
  </div>
);

export default Dashboard;
