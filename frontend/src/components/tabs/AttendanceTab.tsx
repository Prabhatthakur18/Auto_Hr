import React, { useState, useEffect } from 'react';
import { Clock, Plus, Loader2, AlertCircle, Check, X, Calendar } from 'lucide-react';
import { attendanceApi, type Attendance, type AttendanceSummary } from '../../services/api';

interface AttendanceTabProps {
  employeeId: number;
  isHR: boolean;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({ employeeId, isHR }) => {
  const [targetMonth, setTargetMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Manual Adjust form state
  const [showManualForm, setShowManualForm] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    date: '',
    checkIn: '',
    checkOut: '',
    status: 'PRESENT' as 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE' | 'HOLIDAY',
  });

  useEffect(() => {
    loadAttendance();
  }, [employeeId, targetMonth]);

  const loadAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await attendanceApi.get(employeeId, { month: targetMonth });
      if (res.data) {
        setAttendance(res.data.attendance);
        setSummary(res.data.summary);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance logs');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.date) return;
    setSavingManual(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        employeeId,
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
      {/* Controls Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Month Picker */}
        <div className="flex items-center gap-3 bg-slate-800 p-2.5 rounded-xl border border-slate-700/50">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Month</span>
          <input
            type="month"
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
            className="bg-slate-700 text-white text-sm font-semibold border-0 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* HR Manual adjust button */}
        {isHR && !showManualForm && (
          <button
            onClick={() => setShowManualForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/10"
          >
            <Plus className="w-4 h-4" /> Add/Edit Log
          </button>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
          <Check className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {/* Manual Entry Form */}
      {showManualForm && (
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700/50 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              Manual Attendance Entry
            </h3>
            <button
              onClick={() => setShowManualForm(false)}
              className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleManualSave} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Date *</label>
              <input
                type="date"
                required
                value={manualForm.date}
                onChange={(e) => setManualForm((p) => ({ ...p, date: e.target.value }))}
                className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Status</label>
              <select
                value={manualForm.status}
                onChange={(e) => setManualForm((p) => ({ ...p, status: e.target.value as any }))}
                className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500"
              >
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="HOLIDAY">Holiday</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Check In (e.g. 09:15:00)</label>
              <input
                type="text"
                placeholder="HH:MM:SS"
                value={manualForm.checkIn}
                onChange={(e) => setManualForm((p) => ({ ...p, checkIn: e.target.value }))}
                className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Check Out (e.g. 18:30:00)</label>
              <input
                type="text"
                placeholder="HH:MM:SS"
                value={manualForm.checkOut}
                onChange={(e) => setManualForm((p) => ({ ...p, checkOut: e.target.value }))}
                className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-4 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="px-5 py-2 bg-slate-700 hover:bg-slate-650 text-white text-sm rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingManual}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2"
              >
                {savingManual ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  'Save Attendance'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Present', value: summary.present, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15' },
            { label: 'Absent', value: summary.absent, color: 'text-red-400 bg-red-500/10 border-red-500/15' },
            { label: 'Late Days', value: summary.lateDays, color: 'text-amber-400 bg-amber-500/10 border-amber-500/15' },
            { label: 'Overtime Days', value: summary.overtimeDays, color: 'text-purple-400 bg-purple-500/10 border-purple-500/15' },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-2xl p-4 text-center border ${stat.color}`}>
              <p className="text-3xl font-extrabold">{stat.value}</p>
              <p className="text-xs font-semibold opacity-85 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Daily log table */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : attendance.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="w-12 h-12 text-slate-650 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No attendance logs found for this month</p>
            <p className="text-xs text-slate-500 mt-1">Select another month or update logs</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-700/50 text-slate-400 font-semibold bg-slate-900/40">
                  <th className="py-3.5 px-5">Date</th>
                  <th className="py-3.5 px-4">Day</th>
                  <th className="py-3.5 px-4">Check In</th>
                  <th className="py-3.5 px-4">Check Out</th>
                  <th className="py-3.5 px-4">Working Hours</th>
                  <th className="py-3.5 px-4">Late By</th>
                  <th className="py-3.5 px-4">Overtime</th>
                  <th className="py-3.5 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {attendance.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-750/30 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-slate-200">
                      {new Date(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{record.day || '—'}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{record.checkIn || '—'}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{record.checkOut || '—'}</td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-200">{record.totalWorkingHours || '—'}</td>
                    <td className="py-3.5 px-4">
                      {record.isLate ? (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                          Late ({record.lateBy})
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {record.overtime ? (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full">
                          Yes ({record.otTime})
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          record.status === 'PRESENT'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                            : 'bg-red-500/10 text-red-400 border-red-500/15'
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
  );
};
