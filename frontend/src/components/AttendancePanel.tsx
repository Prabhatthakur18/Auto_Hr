import React, { useState, useEffect } from 'react';
import { Clock, Upload, RefreshCw, Check, AlertCircle, FileText, Plus, X, Calendar } from 'lucide-react';
import { attendanceApi, type Employee, type Attendance } from '../services/api';

interface AttendancePanelProps {
  user: any;
  employees: Employee[];
}

export const AttendancePanel: React.FC<AttendancePanelProps> = ({ user, employees }) => {
  const isHR = user?.role === 'HR';
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [targetMonth, setTargetMonth] = useState<string>(() => {
    const d = new Date();
    // Default to current month, format YYYY-MM
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // File Upload states
  const [uploadType, setUploadType] = useState<'biometric' | 'excel'>('biometric');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Sync state
  const [syncing, setSyncing] = useState(false);

  // Manual Adjust form state
  const [showManualForm, setShowManualForm] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    date: '',
    checkIn: '',
    checkOut: '',
    status: 'PRESENT' as 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE' | 'HOLIDAY',
  });

  // Load employee list and default to self if not HR
  useEffect(() => {
    if (!isHR) {
      setSelectedEmployeeId(user?.employeeId);
    } else if (employees.length > 0 && selectedEmployeeId === null) {
      setSelectedEmployeeId(employees[0]!.id);
    }
  }, [isHR, employees, user]);

  useEffect(() => {
    if (selectedEmployeeId) {
      loadAttendance();
    }
  }, [selectedEmployeeId, targetMonth]);

  const loadAttendance = async () => {
    if (!selectedEmployeeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await attendanceApi.get(selectedEmployeeId, { month: targetMonth });
      if (res.data) {
        setAttendance(res.data.attendance);
        setSummary(res.data.summary);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      let res;
      if (uploadType === 'biometric') {
        res = await attendanceApi.uploadBiometric(file, targetMonth);
      } else {
        res = await attendanceApi.uploadExcel(file, targetMonth);
      }
      setSuccessMsg(res.message || 'Data uploaded successfully!');
      setFile(null);
      // Reset input element
      const fileInput = document.getElementById('attendance-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Reload logs
      if (selectedEmployeeId) {
        loadAttendance();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload attendance file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeviceSync = async () => {
    setSyncing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/attendance/sync-device', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to sync');
      setSuccessMsg(`Device synced successfully! Processed ${json.data?.processedDays || 0} days of attendance.`);
      if (selectedEmployeeId) {
        loadAttendance();
      }
    } catch (err: any) {
      setError(err.message || 'Biometric device is currently offline (Connection Timeout)');
    } finally {
      setSyncing(false);
    }
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !manualForm.date) return;
    setSavingManual(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        employeeId: selectedEmployeeId,
        date: manualForm.date,
        checkIn: manualForm.checkIn || undefined,
        checkOut: manualForm.checkOut || undefined,
        status: manualForm.status,
      };
      await attendanceApi.saveManual(payload);
      setSuccessMsg('Attendance record updated successfully');
      setShowManualForm(false);
      // Reset form
      setManualForm({
        date: '',
        checkIn: '',
        checkOut: '',
        status: 'PRESENT',
      });
      loadAttendance();
    } catch (err: any) {
      setError(err.message || 'Failed to save manual attendance');
    } finally {
      setSavingManual(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Attendance Module</h2>
          <p className="text-slate-500 mt-1">Manage and sync biometric attendance sheets</p>
        </div>

        {/* Global target month filter */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Target Month</span>
          <input
            type="month"
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
            className="bg-slate-50 text-slate-700 text-sm font-semibold border-0 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700">
          <Check className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {/* HR Actions Panel */}
      {isHR && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload card */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-500" />
              Upload Attendance Data Sheet
            </h3>
            
            {/* File Type tabs */}
            <div className="flex gap-2 mb-4 bg-slate-100 p-1.5 rounded-xl">
              <button
                type="button"
                onClick={() => setUploadType('biometric')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  uploadType === 'biometric' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Biometric raw text (.txt)
              </button>
              <button
                type="button"
                onClick={() => setUploadType('excel')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  uploadType === 'excel' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Attendance Portal Excel (.xlsx)
              </button>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-8 flex flex-col items-center justify-center transition-colors bg-slate-50 cursor-pointer relative">
                <input
                  id="attendance-file-input"
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  accept={uploadType === 'biometric' ? '.txt' : '.xlsx'}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  required
                />
                <FileText className="w-12 h-12 text-slate-400 mb-3" />
                <p className="text-sm font-semibold text-slate-700">
                  {file ? file.name : 'Click to select or drag and drop file'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {uploadType === 'biometric'
                    ? 'Upload the S-FB4K biometric machine output text file'
                    : 'Upload the exported Excel sheet'}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Filtering for month: <strong className="text-slate-800 font-bold">{targetMonth}</strong> (non-matching data ignored)
                </span>
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-500/10 transition-all flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    'Process and Import'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Secureye Live Connection Panel */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-full">
                  Secureye Integration
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold">Secureye S-FB4K</h3>
              <p className="text-xs text-slate-400 mt-1">IP Address: 192.168.1.224</p>
              <p className="text-sm text-slate-300 mt-4 leading-relaxed">
                Connect and sync logs automatically over your local network. Zero manual sheet uploads needed.
              </p>
            </div>

            <button
              onClick={handleDeviceSync}
              disabled={syncing}
              className="w-full mt-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" /> Trigger Auto-Sync API
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Grid container: Employee selection and attendance log grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar employee lists (for HR only) */}
        {isHR && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">Employees</h4>
            <div className="space-y-1 max-h-[450px] overflow-y-auto">
              {employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployeeId(emp.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-sm font-medium transition-all ${
                    selectedEmployeeId === emp.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{emp.name}</span>
                  <span className="text-xs text-slate-400">ID: {emp.biometricId || '—'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Employee log panel */}
        <div className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-100 ${isHR ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              {isHR
                ? `Attendance Log: ${employees.find((e) => e.id === selectedEmployeeId)?.name || ''}`
                : 'My Attendance Logs'}
            </h3>
            <div className="flex items-center gap-3">
              {isHR && !showManualForm && (
                <button
                  onClick={() => setShowManualForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add/Edit Log
                </button>
              )}
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-full">
                {attendance.length} record{attendance.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Manual Entry Form */}
          {showManualForm && (
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 mb-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-slate-900 font-bold text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Manual Attendance Entry
                </h3>
                <button
                  onClick={() => setShowManualForm(false)}
                  className="p-1 hover:bg-slate-250 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleManualSave} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-semibold">Date *</label>
                  <input
                    type="date"
                    required
                    value={manualForm.date}
                    onChange={(e) => setManualForm((p) => ({ ...p, date: e.target.value }))}
                    className="w-full bg-white text-slate-800 text-xs rounded-lg px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-semibold">Status</label>
                  <select
                    value={manualForm.status}
                    onChange={(e) => setManualForm((p) => ({ ...p, status: e.target.value as any }))}
                    className="w-full bg-white text-slate-800 text-xs rounded-lg px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="HOLIDAY">Holiday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-semibold">Check In (e.g. 09:15:00)</label>
                  <input
                    type="text"
                    placeholder="HH:MM:SS"
                    value={manualForm.checkIn}
                    onChange={(e) => setManualForm((p) => ({ ...p, checkIn: e.target.value }))}
                    className="w-full bg-white text-slate-800 text-xs rounded-lg px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-semibold">Check Out (e.g. 18:30:00)</label>
                  <input
                    type="text"
                    placeholder="HH:MM:SS"
                    value={manualForm.checkOut}
                    onChange={(e) => setManualForm((p) => ({ ...p, checkOut: e.target.value }))}
                    className="w-full bg-white text-slate-800 text-xs rounded-lg px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="sm:col-span-4 flex justify-end gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowManualForm(false)}
                    className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingManual}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
                  >
                    {savingManual ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      'Save Attendance'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Monthly stats breakdown */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Present', value: summary.present, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Absent', value: summary.absent, color: 'text-red-600 bg-red-50' },
                { label: 'Late Days', value: summary.lateDays, color: 'text-amber-600 bg-amber-50' },
                { label: 'Overtime Days', value: summary.overtimeDays, color: 'text-purple-600 bg-purple-50' },
              ].map((stat) => (
                <div key={stat.label} className={`rounded-xl p-4 text-center ${stat.color}`}>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs font-semibold opacity-80 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Attendance Log Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : attendance.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-semibold text-slate-500">No attendance data found</p>
              <p className="text-xs text-slate-400 mt-1">Try changing the Target Month or uploading a sheet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                    <th className="py-3 px-2">Date</th>
                    <th className="py-3 px-2">Day</th>
                    <th className="py-3 px-2">Check In</th>
                    <th className="py-3 px-2">Check Out</th>
                    <th className="py-3 px-2">Working Hours</th>
                    <th className="py-3 px-2">Late By</th>
                    <th className="py-3 px-2">Overtime</th>
                    <th className="py-3 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {attendance.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-2 font-semibold text-slate-700">
                        {new Date(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-3 px-2 text-slate-500">{record.day || '—'}</td>
                      <td className="py-3 px-2 font-mono text-slate-600">{record.checkIn || '—'}</td>
                      <td className="py-3 px-2 font-mono text-slate-600">{record.checkOut || '—'}</td>
                      <td className="py-3 px-2 font-mono font-medium text-slate-700">{record.totalWorkingHours || '—'}</td>
                      <td className="py-3 px-2">
                        {record.isLate ? (
                          <span className="text-xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full">
                            Late ({record.lateBy})
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        {record.overtime ? (
                          <span className="text-xs font-semibold px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">
                            Yes ({record.otTime})
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            record.status === 'PRESENT'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
