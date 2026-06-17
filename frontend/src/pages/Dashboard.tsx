import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/LoginForm';
import {
  Users, Calendar, Clock, DollarSign, Megaphone,
  LogOut, Shield, ChevronRight,
  Home, FileText, BarChart3, Loader2,
  CheckCircle, XCircle, MessageSquare, X, Send, AlertTriangle,
  UserPlus, Search, Filter, RefreshCw, RotateCcw
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
import { EmployeeAvatar } from '../components/EmployeeAvatar';
import { DropdownSelect, type DropdownOption } from '../components/DropdownSelect';
import SalaryTab from '../components/tabs/SalaryTab';
import logoImg from '../images/autologo-removebg-preview.png';

const ALL_ACCESS_ROLES: UserRole[] = ['HR', 'LEADERSHIP'];
const MANAGEMENT_ROLES: UserRole[] = ['HR', 'LEADERSHIP', 'MANAGER'];

const getRoleBadgeClasses = (role: UserRole) => (
  role === 'HR'
    ? 'bg-orange-500/15 text-orange-700 border border-orange-500/20'
    : role === 'LEADERSHIP'
      ? 'bg-amber-500/15 text-amber-850 border border-amber-500/20'
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
      <div className="min-h-screen bg-app-bg flex items-center justify-center relative">
        <Loader2 className="w-10 h-10 text-[#f46617] animate-spin" />
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
    <div className="min-h-screen bg-app-bg flex gap-4 p-4 lg:p-6 h-screen w-screen overflow-hidden relative font-sans">
      {/* Background Glowing Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-orange/10 blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-400/5 blur-[120px] pointer-events-none animate-pulse-slow" />

      {/* Sidebar */}
      <aside className="w-72 bg-white rounded-[40px] border border-orange-100/60 shadow-island flex flex-col h-full relative z-10 overflow-hidden flex-shrink-0 animate-scale-in">
        {/* Logo */}
        <div className="p-6 border-b border-orange-100/70 flex flex-col items-center text-center">
          <img src={logoImg} alt="Autoform Logo" className="h-12 w-auto mb-1 select-none" />
          <h1 className="text-lg font-black tracking-tight text-slate-800 leading-none">Auto HR</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Autoform India</p>
        </div>

        {/* User Info */}
        <div className="px-6 py-4 border-b border-orange-100/40">
          <div className="flex items-center gap-3">
            <EmployeeAvatar
              name={name}
              avatar={user?.employee?.avatar}
              gender={user?.employee?.gender}
              size="w-10 h-10"
              shape="rounded"
              className="shadow-md shadow-orange-200/60"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{name}</p>
              <span className={`inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full mt-0.5 ${getRoleBadgeClasses(role)}`}>
                {role}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={isActive ? 'nav-item-active' : 'nav-item'}
              >
                <div className={`p-1 rounded-lg transition-colors ${isActive ? 'text-[#f46617]' : 'text-slate-400'}`}>
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                </div>
                <span>{item.label}</span>
                {item.id === 'leaves' && pendingLeaves > 0 && (
                  <span className="ml-auto bg-[#f46617] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {pendingLeaves}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-orange-100/70">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-6 py-3 text-sm font-semibold text-slate-500 hover:text-[#f46617] hover:bg-orange-50/50 rounded-2xl transition-all"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-white rounded-[40px] border border-orange-100/60 shadow-island flex flex-col h-full overflow-hidden relative z-10 animate-scale-in">
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          {dataLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-[#f46617] animate-spin" />
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
              {activeTab === 'salary' && user?.employeeId && (
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-6">My Salary</h2>
                  <SalaryTab
                    employeeId={user.employeeId}
                    employeeName={user.employee?.name || ''}
                    employeeDepartment={user.employee?.department || ''}
                    employeePosition={user.employee?.position || ''}
                  />
                </div>
              )}
              {activeTab === 'reports' && (
                <ComingSoonPanel title="Reports" />
              )}
            </>
          )}
        </div>
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
    { label: 'Pending Leaves', value: pendingLeaves, icon: Calendar, color: 'from-orange-400 to-[#f46617]' },
    { label: 'Announcements', value: announcementCount, icon: Megaphone, color: 'from-amber-400 to-yellow-500' },
  ] : [
    { label: 'Total Employees', value: employeeCount, icon: Users, color: 'from-blue-400 to-indigo-500' },
    { label: 'Pending Leaves', value: pendingLeaves, icon: Calendar, color: 'from-orange-400 to-[#f46617]' },
    { label: 'Announcements', value: announcementCount, icon: Megaphone, color: 'from-amber-400 to-yellow-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">{greeting}, {name}</h2>
        <p className="text-slate-500 font-semibold text-xs tracking-wider uppercase mt-1">Here's what's happening today</p>
      </div>

      {/* Stats Cards */}
      <div className={`grid gap-6 ${role === 'EMPLOYEE' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-[24px] p-6 border border-orange-100/50 shadow-card hover:shadow-card-hover transition-all duration-300 flex items-center justify-between group">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{stat.label}</p>
              <p className="text-4xl font-black text-slate-800 tracking-tight mt-1.5">{stat.value}</p>
            </div>
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg shadow-orange-500/5 group-hover:scale-110 transition-transform duration-300`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Announcements */}
      {announcements.length > 0 && (
        <div className="bg-white rounded-[32px] p-6 border border-orange-100/50 shadow-card">
          <h3 className="text-lg font-black text-slate-800 tracking-tight mb-4 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#f46617]" />
            Recent Announcements
          </h3>
          <div className="space-y-3">
            {announcements.slice(0, 3).map(ann => (
              <div key={ann.id} className="flex items-start gap-3 p-4 rounded-2xl bg-orange-50/20 hover:bg-orange-50/55 border border-orange-100/30 transition-all duration-200">
                <span className={`inline-block w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                  ann.priority === 'URGENT' ? 'bg-red-500 shadow-sm shadow-red-500/35' :
                  ann.priority === 'HIGH' ? 'bg-orange-500 shadow-sm shadow-orange-500/35' :
                  ann.priority === 'MEDIUM' ? 'bg-amber-500 shadow-sm shadow-amber-500/35' : 'bg-slate-300'
                }`} />
                <div>
                  <p className="text-sm font-bold text-slate-800 leading-snug">{ann.title}</p>
                  {ann.content && (
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{ann.content}</p>
                  )}
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">
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
  const [gender, setGender] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [employeeType, setEmployeeType] = useState('Full-time');
  const [tallyLedgerName, setTallyLedgerName] = useState('');
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
    userId?: number;
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
    setGender('');
    setAvatarUrl('');
    setEmployeeType('Full-time');
    setTallyLedgerName('');
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
      const managerMap = new Map<number, ManagerCandidate>();

      (employees ?? []).forEach(employee => {
        managerMap.set(employee.id, {
          employeeId: employee.id,
          name: employee.name,
          position: employee.position,
          department: employee.department,
        });
      });

      (res.data?.managers ?? []).forEach(manager => {
        managerMap.set(manager.employeeId, {
          employeeId: manager.employeeId,
          userId: manager.userId,
          name: manager.name,
          position: manager.position,
          department: manager.department,
          roleHint: manager.role,
        });
      });

      setAvailableManagers(
        Array.from(managerMap.values()).sort((a, b) => {
          const aRank = a.roleHint ? 0 : 1;
          const bRank = b.roleHint ? 0 : 1;
          return aRank - bRank || a.name.localeCompare(b.name);
        })
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

  useEffect(() => {
    if (showModal) {
      void loadManagerOptions();
    }
  }, [showModal, employees]);

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
        gender: gender || undefined,
        avatar: avatarUrl || undefined,
        employeeType: employeeType || undefined,
        tallyLedgerName: tallyLedgerName || undefined,
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
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {role === 'EMPLOYEE' ? 'My Profile' : 'Employees'}
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
            {filteredEmployees.length} of {employees.length} {employees.length === 1 ? 'employee' : 'employees'} listed
          </p>
        </div>
        
        {role === 'HR' && (
          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={handleSyncMasterData}
              disabled={syncingMasterData}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 text-xs font-bold rounded-2xl transition-all"
            >
              {syncingMasterData ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sync Master Data
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="btn-orange px-4 py-2.5 text-xs font-bold rounded-2xl"
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
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange shadow-sm transition-all"
          />
        </div>
        
        <DropdownSelect
          value={deptFilter}
          onChange={setDeptFilter}
          placeholder="All Departments"
          variant="filter"
          leadingIcon={<Filter className="w-4 h-4" />}
          className="min-w-[160px]"
          options={departments.map(d => ({
            value: d || 'ALL',
            label: d === 'ALL' ? 'All Departments' : d,
          }))}
        />
      </div>

      {/* Employees Grid */}
      {filteredEmployees.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-orange-100/50 shadow-card">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50 text-slate-400" />
          <p className="font-semibold">No matching employees found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-scale-in">
          {filteredEmployees.map(emp => (
            <div
              key={emp.id}
              onClick={() => onOpenProfile(emp.id)}
              className="bg-white rounded-[24px] p-5 shadow-sm border border-orange-100/50 hover:border-brand-orange/30 hover:shadow-md transition-all duration-300 group cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="group-hover:scale-105 transition-transform duration-300">
                  <EmployeeAvatar
                    name={emp.name}
                    avatar={emp.avatar}
                    gender={emp.gender}
                    size="w-12 h-12"
                    shape="rounded"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 truncate group-hover:text-[#f46617] transition-colors">
                    {emp.name}
                  </p>
                  <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{emp.position || 'No position set'}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{emp.department || 'No department'}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#f46617] group-hover:translate-x-0.5 transition-all ml-3 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Add Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { if (!submitting) setShowModal(false); }} />
          
          {/* Dialog Box */}
          <div className="relative bg-white rounded-[32px] border border-orange-100/50 shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-orange-100/50 flex-shrink-0">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#f46617]" />
                Add New Employee
              </h3>
              <button
                disabled={submitting}
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl hover:bg-orange-50 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Avatar preview */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-orange-50/30 border border-orange-100/60">
                <EmployeeAvatar
                  name={name || '?'}
                  avatar={avatarUrl || undefined}
                  gender={gender || undefined}
                  size="w-16 h-16"
                  shape="rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Avatar Preview</p>
                  <p className="text-xs text-slate-400 font-medium">
                    {avatarUrl ? 'Photo URL set' : gender ? `${gender} clipart will be used` : 'Initials shown until gender or photo set'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Employee details */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    disabled={submitting}
                    placeholder="e.g. John Doe"
                    className="w-full text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all placeholder-slate-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Gender
                  </label>
                  <DropdownSelect
                    value={gender}
                    onChange={setGender}
                    disabled={submitting}
                    placeholder="Select gender"
                    options={[
                      { value: 'Male', label: 'Male' },
                      { value: 'Female', label: 'Female' },
                      { value: 'Other', label: 'Other / Prefer not to say' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Biometric ID / EnNo
                  </label>
                  <input
                    type="number"
                    value={biometricId}
                    onChange={e => setBiometricId(e.target.value)}
                    disabled={submitting}
                    placeholder="e.g. 48"
                    className="w-full text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all placeholder-slate-400 bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Profile Photo URL
                  </label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={e => setAvatarUrl(e.target.value)}
                    disabled={submitting}
                    placeholder="https://example.com/photo.jpg (optional)"
                    className="w-full text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all placeholder-slate-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Employee Type
                  </label>
                  <DropdownSelect
                    value={employeeType}
                    onChange={setEmployeeType}
                    disabled={submitting}
                    placeholder="Select employee type"
                    options={[
                      { value: 'Full-time', label: 'Full-time' },
                      { value: 'Part-time', label: 'Part-time' },
                      { value: 'Contract', label: 'Contract' },
                      { value: 'Intern', label: 'Intern' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Position / Designation
                  </label>
                  <input
                    type="text"
                    value={position}
                    onChange={e => setPosition(e.target.value)}
                    disabled={submitting}
                    placeholder="e.g. Software Engineer"
                    className="w-full text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all placeholder-slate-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    disabled={submitting}
                    placeholder="e.g. Engineering"
                    className="w-full text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all placeholder-slate-400 bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Tally Ledger Name
                  </label>
                  <input
                    type="text"
                    value={tallyLedgerName}
                    onChange={e => setTallyLedgerName(e.target.value)}
                    disabled={submitting}
                    placeholder="Exact ledger name from Tally"
                    className="w-full text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all placeholder-slate-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={submitting}
                    placeholder="e.g. john@example.com"
                    className="w-full text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all placeholder-slate-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    disabled={submitting}
                    placeholder="e.g. +91 99999 88888"
                    className="w-full text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all placeholder-slate-400 bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Reporting Manager
                  </label>
                  <DropdownSelect
                    value={managerId}
                    onChange={setManagerId}
                    disabled={submitting || loadingManagers}
                    placeholder={loadingManagers ? 'Loading managers...' : 'No manager assigned'}
                    options={availableManagers.map(manager => ({
                      value: String(manager.employeeId),
                      label: manager.name,
                      description: [
                        manager.position,
                        manager.roleHint === 'LEADERSHIP' ? 'Leadership' : null,
                        manager.roleHint === 'MANAGER' ? 'Manager' : null,
                      ].filter(Boolean).join(' • '),
                    }))}
                  />
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
                    className="w-4 h-4 rounded border-orange-200 text-[#f46617] focus:ring-brand-orange/30 accent-[#f46617] cursor-pointer bg-white"
                  />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    Create User Account (System Access)
                  </span>
                </label>
              </div>

              {/* User account details */}
              {createUser && (
                <div className="p-4 rounded-2xl border border-orange-100 bg-orange-50/20 space-y-4 animate-scale-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                        Username *
                      </label>
                      <input
                        type="text"
                        required={createUser}
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        disabled={submitting}
                        placeholder="Username for login"
                        className="w-full text-slate-800 bg-white text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all placeholder-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                        Password *
                      </label>
                      <input
                        type="password"
                        required={createUser}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        disabled={submitting}
                        placeholder="Min 6 characters"
                        className="w-full text-slate-800 bg-white text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all placeholder-slate-400"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                        Access Role
                      </label>
                      <DropdownSelect
                        value={systemRole}
                        onChange={value => setSystemRole(value as UserRole)}
                        disabled={submitting}
                        placeholder="Select access role"
                        options={[
                          { value: 'EMPLOYEE', label: 'Employee (Standard Access)' },
                          { value: 'MANAGER', label: 'Manager (Team Approval/Performance)' },
                          { value: 'HR', label: 'HR Admin (Full Access)' },
                          { value: 'LEADERSHIP', label: 'Leadership (Company-wide Visibility)' },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-3 text-xs flex gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </form>

            <div className="flex items-center gap-3 p-6 border-t border-orange-100/50 bg-orange-50/10 flex-shrink-0">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-250 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                onClick={handleCreateEmployee}
                className="flex-1 btn-orange py-2.5 text-sm font-bold rounded-xl"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{submitting ? 'Creating...' : 'Create Employee'}</span>
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
  <div className="space-y-6">
    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Announcements</h2>
    {announcements.length === 0 ? (
      <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-orange-100/50 shadow-card">
        <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50 text-slate-400" />
        <p className="font-semibold">No announcements yet</p>
      </div>
    ) : (
      <div className="space-y-4">
        {announcements.map(ann => (
          <div key={ann.id} className="bg-white rounded-3xl p-6 border border-orange-100/50 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3 ${
                  ann.priority === 'URGENT' ? 'bg-red-50 text-red-600 border border-red-100' :
                  ann.priority === 'HIGH' ? 'bg-orange-50 text-[#f46617] border border-orange-100' :
                  ann.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-605 border border-blue-100' : 'bg-slate-50 text-slate-500 border border-slate-100'
                }`}>
                  {ann.priority}
                </span>
                <h3 className="text-lg font-bold text-slate-800 leading-snug">{ann.title}</h3>
                {ann.content && <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">{ann.content}</p>}
              </div>
            </div>
            <div className="mt-5 flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-t border-orange-100/30 pt-4">
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
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [managerFilter, setManagerFilter] = useState('ALL');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('ALL');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  const isManagement = MANAGEMENT_ROLES.includes(role);
  const canApplyLeave = Boolean(user?.employeeId);
  const ownLeaves = user?.employeeId ? leaves.filter(leave => leave.employeeId === user.employeeId) : [];
  const hierarchyLeaves = user?.employeeId ? leaves.filter(leave => leave.employeeId !== user.employeeId) : leaves;
  const teamLabel = ALL_ACCESS_ROLES.includes(role) ? 'All Leaves' : 'Team Leaves';
  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Set(
          leaves
            .map(leave => leave.employee?.department)
            .filter((department): department is string => Boolean(department))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [leaves]
  );

  const [managerOptions, setManagerOptions] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadManagers = async () => {
      try {
        const res = await employeeApi.managersList();
        if (!isMounted) return;

        const managersById = new Map<number, string>();
        (res.data?.managers ?? []).forEach(manager => {
          managersById.set(manager.employeeId, manager.name);
        });
        leaves.forEach(leave => {
          const manager = leave.employee?.manager;
          if (manager?.id) {
            managersById.set(manager.id, manager.name);
          }
        });

        setManagerOptions(
          Array.from(managersById.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      } catch {
        if (!isMounted) return;

        const managersById = new Map<number, string>();
        leaves.forEach(leave => {
          const manager = leave.employee?.manager;
          if (manager?.id) {
            managersById.set(manager.id, manager.name);
          }
        });

        setManagerOptions(
          Array.from(managersById.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      }
    };

    void loadManagers();

    return () => {
      isMounted = false;
    };
  }, [leaves]);

  const leaveTypeOptions = useMemo(
    () => Array.from(new Set(leaves.map(leave => leave.type))).sort((a, b) => a.localeCompare(b)),
    [leaves]
  );

  const filteredLeaves = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const fromDate = dateFromFilter || null;
    const toDate = dateToFilter || null;

    return leaves.filter(leave => {
      const isMyLeave = leave.employeeId === user?.employeeId;
      const isTeamLeave = user?.employeeId ? leave.employeeId !== user.employeeId : true;

      if (isManagement && user?.employeeId) {
        if (category === 'MY' && !isMyLeave) return false;
        if (category === 'TEAM' && !isTeamLeave) return false;
      }

      if (filter !== 'ALL' && leave.status !== filter) return false;
      if (leaveTypeFilter !== 'ALL' && leave.type !== leaveTypeFilter) return false;
      if (departmentFilter !== 'ALL' && leave.employee?.department !== departmentFilter) return false;

      if (managerFilter !== 'ALL') {
        const managerId = leave.employee?.manager?.id;
        if (String(managerId ?? '') !== managerFilter) return false;
      }

      const leaveStart = leave.startDate.split('T')[0];
      const leaveEnd = leave.endDate.split('T')[0];
      if (fromDate && leaveEnd < fromDate) return false;
      if (toDate && leaveStart > toDate) return false;

      if (!search) return true;

      const searchable = [
        leave.employee?.name,
        leave.employee?.department,
        leave.employee?.manager?.name,
        leave.employee?.manager?.position,
        leave.type,
        leave.status,
        leave.reason,
        leave.comment,
        leave.approvedBy?.username,
        leave.days.toString(),
        `${leave.days} day${leave.days > 1 ? 's' : ''}`,
        new Date(leave.startDate).toLocaleDateString('en-IN'),
        new Date(leave.endDate).toLocaleDateString('en-IN'),
        isMyLeave ? 'my leave' : 'team leave',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(search);
    });
  }, [
    category,
    dateFromFilter,
    dateToFilter,
    departmentFilter,
    filter,
    isManagement,
    leaveTypeFilter,
    leaves,
    managerFilter,
    searchTerm,
    user?.employeeId,
  ]);

  const clearFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('ALL');
    setManagerFilter('ALL');
    setLeaveTypeFilter('ALL');
    setDateFromFilter('');
    setDateToFilter('');
    setFilter('ALL');
    setCategory('TEAM');
  };

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
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Leave Management</h2>
          {role === 'EMPLOYEE' && (
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">View your leave history. Use the button to apply.</p>
          )}
          {isManagement && (
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
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
              className="btn-orange px-4 py-2 text-xs font-bold rounded-2xl"
            >
              <Calendar className="w-4 h-4" /> Add Leave
            </button>
            {!canApplyLeave && leaveActionNotice && (
              <p className="max-w-xs text-[10px] text-amber-600 font-semibold leading-normal">
                {leaveActionNotice}
              </p>
            )}
          </div>

          {/* Filters */}
          <div className="flex bg-orange-50/60 p-1.5 rounded-2xl border border-orange-100/50">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  filter === f
                    ? 'bg-white text-[#f46617] shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-6 mb-5">
        <div className="relative xl:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search leave records, names, comments, dates..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange shadow-sm transition-all"
          />
        </div>

        <DropdownSelect
          value={departmentFilter}
          onChange={setDepartmentFilter}
          placeholder="All Departments"
          variant="filter"
          leadingIcon={<Filter className="w-4 h-4" />}
          options={[
            { value: 'ALL', label: 'All Departments' },
            ...departmentOptions.map(dept => ({ value: dept, label: dept })),
          ]}
        />

        <DropdownSelect
          value={managerFilter}
          onChange={setManagerFilter}
          placeholder="All Managers"
          variant="filter"
          leadingIcon={<Filter className="w-4 h-4" />}
          options={[
            { value: 'ALL', label: 'All Managers' },
            ...managerOptions.map(manager => ({ value: String(manager.id), label: manager.name })),
          ]}
        />

        <DropdownSelect
          value={leaveTypeFilter}
          onChange={setLeaveTypeFilter}
          placeholder="All Leave Types"
          variant="filter"
          leadingIcon={<Filter className="w-4 h-4" />}
          options={[
            { value: 'ALL', label: 'All Leave Types' },
            ...leaveTypeOptions.map(type => ({ value: type, label: type })),
          ]}
        />

        <div className="grid grid-cols-2 gap-2 xl:col-span-2">
          <input
            type="date"
            value={dateFromFilter}
            onChange={e => setDateFromFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange shadow-sm"
            title="From date"
          />
          <input
            type="date"
            value={dateToFilter}
            onChange={e => setDateToFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange shadow-sm"
            title="To date"
          />
        </div>

        <button
          type="button"
          onClick={clearFilters}
          className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-2xl border border-slate-200 transition-colors xl:col-span-1"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      {/* Category Tabs for Management */}
      {isManagement && user?.employeeId && (
        <div className="flex border-b border-orange-100/50 mb-6 gap-6">
          <button
            onClick={() => setCategory('TEAM')}
            className={`pb-3 text-sm font-bold relative transition-all ${
              category === 'TEAM'
                ? 'text-[#f46617]'
                : 'text-slate-450 hover:text-slate-600'
            }`}
          >
            {teamLabel}
            <span className="ml-2 text-xs font-medium text-slate-400">({hierarchyLeaves.length})</span>
            {category === 'TEAM' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f46617] rounded-full" />
            )}
          </button>
          <button
            onClick={() => setCategory('MY')}
            className={`pb-3 text-sm font-bold relative transition-all ${
              category === 'MY'
                ? 'text-[#f46617]'
                : 'text-slate-450 hover:text-slate-600'
            }`}
          >
            My Leaves
            <span className="ml-2 text-xs font-medium text-slate-400">({ownLeaves.length})</span>
            {category === 'MY' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f46617] rounded-full" />
            )}
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <p className="text-xs text-slate-500 font-semibold">
          Showing <span className="font-black text-slate-800">{filteredLeaves.length}</span>{' '}
          {filteredLeaves.length === 1 ? 'leave' : 'leaves'}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
          Search matches names, departments, managers, types, dates, comments and status
        </p>
      </div>

      {filteredLeaves.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-orange-100/50 shadow-card">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50 text-slate-400" />
          <p className="font-semibold">No leave records found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeaves.map(leave => (
            <div key={leave.id} className="bg-white rounded-3xl p-5 border border-orange-100/50 hover:border-brand-orange/30 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    leave.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-500' :
                    leave.status === 'REJECTED' ? 'bg-red-50 text-red-500' :
                    'bg-amber-50 text-amber-500'
                  }`}>
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {leave.employee?.name || 'Employee'} — <span className="text-slate-650 font-semibold">{leave.type}</span>
                    </p>
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                      {new Date(leave.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' → '}
                      {new Date(leave.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}
                      <span className="font-bold text-[#f46617]">{leave.days} day{leave.days > 1 ? 's' : ''}</span>
                    </p>
                    {leave.reason && (
                      <p className="text-xs text-slate-600 mt-2.5 bg-orange-50/20 p-3 rounded-2xl border border-orange-100/20 italic">
                        "{leave.reason}"
                      </p>
                    )}
                    {leave.comment && (
                      <div className="flex gap-1.5 items-start text-xs text-slate-500 mt-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <p>
                          <span className="font-bold text-slate-700">Review comment:</span> "{leave.comment}"
                          {leave.approvedBy && (
                            <span className="text-slate-400 font-medium block mt-1">by {leave.approvedBy.username}</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
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
                        className="px-3 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all flex items-center gap-1 shadow-sm shadow-emerald-500/10"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => openReviewModal(leave, 'REJECT')}
                        className="px-3 py-1.5 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all flex items-center gap-1 shadow-sm shadow-red-500/10"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { if (!submitting) { setActiveLeave(null); setActionType(null); } }} />
          
          {/* Dialog Box */}
          <div className="relative bg-white rounded-[32px] border border-orange-100/50 shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-orange-100/50">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
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
                className="p-1.5 rounded-xl hover:bg-orange-50 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Summary */}
              <div className="bg-orange-50/20 p-4 rounded-2xl border border-orange-100/30 text-xs font-semibold space-y-1.5 text-slate-600">
                <p>Employee: <span className="font-bold text-slate-800">{activeLeave.employee?.name}</span></p>
                <p>Leave Type: <span className="font-bold text-slate-800">{activeLeave.type}</span></p>
                <p>Dates: <span className="font-bold text-slate-800">
                  {new Date(activeLeave.startDate).toLocaleDateString('en-IN')} → {new Date(activeLeave.endDate).toLocaleDateString('en-IN')} ({activeLeave.days} days)
                </span></p>
                {activeLeave.reason && (
                  <p className="mt-2 italic pt-2 border-t border-orange-100/30">
                    Reason: "{activeLeave.reason}"
                  </p>
                )}
              </div>

              {/* Comment Text Area */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Review Comment (Optional)
                </label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  disabled={submitting}
                  rows={3}
                  placeholder={`Write comments regarding this ${actionType === 'APPROVE' ? 'approval' : 'rejection'}...`}
                  className="w-full text-slate-800 text-sm rounded-2xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange resize-none bg-white placeholder-slate-400 transition-all"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-3 text-xs flex gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 p-6 border-t border-orange-100/50 bg-orange-50/10">
              <button
                disabled={submitting}
                onClick={() => { setActiveLeave(null); setActionType(null); }}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-250 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={handleConfirmAction}
                className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-white text-sm font-bold rounded-xl shadow-sm transition-all ${
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
                <span>{submitting ? 'Submitting...' : actionType === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}</span>
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
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-orange-50 text-[#f46617] mb-4 shadow-sm">
      <FileText className="w-8 h-8" />
    </div>
    <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">{title}</h2>
    <p className="text-slate-500 font-medium text-sm">This section is coming soon</p>
    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1.5">We're building something great here</p>
  </div>
);

export default Dashboard;
