import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/LoginForm';
import {
  Users, Calendar, Clock, DollarSign, Megaphone,
  LogOut, Shield, Building, User, ChevronRight,
  Home, FileText, BarChart3, Loader2
} from 'lucide-react';
import { employeeApi, leaveApi, announcementApi, type Employee, type Leave, type Announcement } from '../services/api';

// ─── Dashboard Page ──────────────────────────────────────────

const Dashboard: React.FC = () => {
  const { user, isLoggedIn, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Show login if not authenticated
  if (!isLoggedIn) {
    return <LoginForm />;
  }

  const role = user?.role || 'EMPLOYEE';
  const name = user?.employee?.name || user?.username || 'User';

  // Define sidebar navigation based on role
  const navItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'employees', label: role === 'EMPLOYEE' ? 'My Profile' : 'Employees', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'leaves', label: 'Leaves', icon: Calendar },
    { id: 'salary', label: 'Salary', icon: DollarSign },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    ...(role === 'HR' ? [
      { id: 'reports', label: 'Reports', icon: BarChart3 },
    ] : []),
  ];

  const pendingLeaves = leaves.filter(l => l.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col min-h-screen fixed">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Auto HR</h1>
              <p className="text-xs text-slate-400">Autoform India</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="px-6 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{name}</p>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${role === 'HR' ? 'bg-blue-500/20 text-blue-300' :
                  role === 'MANAGER' ? 'bg-emerald-500/20 text-emerald-300' :
                    'bg-purple-500/20 text-purple-300'
                }`}>
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
                  ? 'text-white bg-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              {activeTab === item.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />
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
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
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
              <EmployeesPanel employees={employees} role={role} />
            )}
            {activeTab === 'announcements' && (
              <AnnouncementsPanel announcements={announcements} role={role} />
            )}
            {activeTab === 'leaves' && (
              <LeavesPanel leaves={leaves} role={role} onRefresh={loadDashboardData} />
            )}
            {['attendance', 'salary', 'reports'].includes(activeTab) && (
              <ComingSoonPanel title={navItems.find(n => n.id === activeTab)?.label || activeTab} />
            )}
          </>
        )}
      </main>
    </div>
  );
};

// ─── Overview Panel ──────────────────────────────────────────

interface OverviewProps {
  role: string;
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

const EmployeesPanel: React.FC<{ employees: Employee[]; role: string }> = ({ employees, role }) => (
  <div>
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-slate-900">
        {role === 'EMPLOYEE' ? 'My Profile' : 'Employees'}
      </h2>
      <span className="text-sm text-slate-500">{employees.length} {employees.length === 1 ? 'person' : 'people'}</span>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {employees.map(emp => (
        <div key={emp.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all group cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
              {emp.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">{emp.name}</p>
              <p className="text-xs text-slate-500 truncate">{emp.position || 'No position set'}</p>
              <p className="text-xs text-slate-400">{emp.department || ''}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Announcements Panel ─────────────────────────────────────

const AnnouncementsPanel: React.FC<{ announcements: Announcement[]; role: string }> = ({ announcements }) => (
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

const LeavesPanel: React.FC<{ leaves: Leave[]; role: string; onRefresh: () => void }> = ({ leaves, role, onRefresh }) => {
  const handleApprove = async (id: number) => {
    try {
      await leaveApi.approve(id);
      onRefresh();
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await leaveApi.reject(id);
      onRefresh();
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Leave Management</h2>
      {leaves.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No leave records</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaves.map(leave => (
            <div key={leave.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${leave.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-500' :
                      leave.status === 'REJECTED' ? 'bg-red-50 text-red-500' :
                        'bg-amber-50 text-amber-500'
                    }`}>
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {leave.employee?.name || 'You'} — {leave.type}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(leave.startDate).toLocaleDateString('en-IN')} → {new Date(leave.endDate).toLocaleDateString('en-IN')} ({leave.days} day{leave.days > 1 ? 's' : ''})
                    </p>
                    {leave.reason && <p className="text-xs text-slate-400 mt-1">{leave.reason}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${leave.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' :
                      leave.status === 'REJECTED' ? 'bg-red-50 text-red-600' :
                        'bg-amber-50 text-amber-600'
                    }`}>
                    {leave.status}
                  </span>
                  {leave.status === 'PENDING' && (role === 'HR' || role === 'MANAGER') && (
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => handleApprove(leave.id)}
                        className="px-3 py-1 text-xs font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(leave.id)}
                        className="px-3 py-1 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
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