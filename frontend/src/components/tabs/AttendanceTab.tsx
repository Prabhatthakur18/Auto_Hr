import React, { useState, useEffect } from 'react';
import { Clock, Plus, Loader2, AlertCircle, Check, X, Calendar } from 'lucide-react';
import { attendanceApi, type Attendance, type AttendanceSummary } from '../../services/api';

interface AttendanceTabProps {
  employeeId: number;
  isHR: boolean;
  theme?: 'dark' | 'light';
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({ employeeId, isHR, theme = 'dark' }) => {
  const isLight = theme === 'light';
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
        <div className={`flex items-center gap-3 p-2.5 rounded-xl ${isLight ? 'hr-surface-solid' : 'bg-slate-800 border border-slate-700/50'}`}>
          <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-stone-600' : 'text-slate-400'}`}>Select Month</span>
          <input
            type="month"
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
            className={isLight
              ? 'bg-white text-stone-900 text-sm font-semibold border border-[rgba(var(--hr-border),0.85)] rounded-lg px-3 py-1 focus:ring-2 focus:ring-[rgba(var(--hr-accent),0.35)] focus:border-transparent'
              : 'bg-slate-700 text-white text-sm font-semibold border-0 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500'
            }
          />
        </div>

        {/* HR Manual adjust button */}
        {isHR && !showManualForm && (
          <button
            onClick={() => setShowManualForm(true)}
            className={`flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-all ${isLight ? 'hr-btn-primary' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/10'}`}
          >
            <Plus className="w-4 h-4" /> Add/Edit Log
          </button>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${isLight ? 'bg-rose-500/10 border-rose-500/20 text-rose-700' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${isLight ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
          <Check className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {/* Manual Entry Form */}
      {showManualForm && (
        <div className={`rounded-2xl p-6 space-y-4 ${isLight ? 'hr-surface-solid' : 'bg-slate-800 border border-slate-700/50'}`}>
          <div className={`flex items-center justify-between pb-3 ${isLight ? 'border-b border-[rgba(var(--hr-border),0.85)]' : 'border-b border-slate-700/50'}`}>
            <h3 className={`font-bold text-base flex items-center gap-2 ${isLight ? 'text-stone-900' : 'text-white'}`}>
              <Calendar className={`w-5 h-5 ${isLight ? 'text-rose-500' : 'text-blue-400'}`} />
              Manual Attendance Entry
            </h3>
            <button
              onClick={() => setShowManualForm(false)}
              className={`p-1 rounded-lg transition-colors ${isLight ? 'hover:bg-rose-100 text-stone-500 hover:text-stone-800' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
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
                className={isLight
                  ? 'w-full bg-white text-stone-900 text-sm rounded-lg px-3 py-2 border border-[rgba(var(--hr-border),0.9)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--hr-accent),0.35)] focus:border-transparent'
                  : 'w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500'
                }
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Status</label>
              <select
                value={manualForm.status}
                onChange={(e) => setManualForm((p) => ({ ...p, status: e.target.value as any }))}
                className={isLight
                  ? 'w-full bg-white text-stone-900 text-sm rounded-lg px-3 py-2 border border-[rgba(var(--hr-border),0.9)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--hr-accent),0.35)] focus:border-transparent'
                  : 'w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500'
                }
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
                className={isLight
                  ? 'w-full bg-white text-stone-900 text-sm rounded-lg px-3 py-2 border border-[rgba(var(--hr-border),0.9)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--hr-accent),0.35)] focus:border-transparent'
                  : 'w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500'
                }
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Check Out (e.g. 18:30:00)</label>
              <input
                type="text"
                placeholder="HH:MM:SS"
                value={manualForm.checkOut}
                onChange={(e) => setManualForm((p) => ({ ...p, checkOut: e.target.value }))}
                className={isLight
                  ? 'w-full bg-white text-stone-900 text-sm rounded-lg px-3 py-2 border border-[rgba(var(--hr-border),0.9)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--hr-accent),0.35)] focus:border-transparent'
                  : 'w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500'
                }
              />
            </div>

            <div className="md:col-span-4 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className={isLight
                  ? 'px-5 py-2 bg-white hover:bg-rose-50 text-stone-800 text-sm rounded-xl transition-all border border-[rgba(var(--hr-border),0.9)]'
                  : 'px-5 py-2 bg-slate-700 hover:bg-slate-650 text-white text-sm rounded-xl transition-all'
                }
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingManual}
                className={`px-5 py-2 text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2 disabled:opacity-60 ${isLight ? 'hr-btn-primary' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600'}`}
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { label: 'Present', value: summary.present, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15' },
            { label: 'Absent', value: summary.absent, color: 'text-red-400 bg-red-500/10 border-red-500/15' },
            { label: 'Late Days', value: summary.lateDays, color: 'text-amber-400 bg-amber-500/10 border-amber-500/15' },
            { label: 'Grace Lates', value: `${summary.graceLateDays}/3`, color: 'text-orange-400 bg-orange-500/10 border-orange-500/15' },
            { label: 'Avg Late Time', value: `${summary.avgLateMinutes} min`, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/15' },
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
      <div className={`rounded-2xl overflow-hidden ${isLight ? 'hr-surface-solid hr-table-light' : 'bg-slate-800 border border-slate-700/50'}`}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className={`w-8 h-8 animate-spin ${isLight ? 'text-rose-500' : 'text-blue-500'}`} />
          </div>
        ) : attendance.length === 0 ? (
          <div className="text-center py-16">
            <Clock className={`w-12 h-12 mx-auto mb-3 ${isLight ? 'text-stone-300' : 'text-slate-650'}`} />
            <p className={`${isLight ? 'text-stone-600' : 'text-slate-400'} font-medium`}>No attendance logs found for this month</p>
            <p className={`text-xs mt-1 ${isLight ? 'text-stone-500' : 'text-slate-500'}`}>Select another month or update logs</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className={isLight
                  ? 'border-b border-[rgba(var(--hr-border),0.85)] text-stone-600 font-semibold bg-rose-50/60'
                  : 'border-b border-slate-700/50 text-slate-400 font-semibold bg-slate-900/40'
                }>
                  <th className="py-4 px-6 whitespace-nowrap min-w-[110px]">Date</th>
                  <th className="py-4 px-5 whitespace-nowrap min-w-[85px]">Day</th>
                  <th className="py-4 px-5 whitespace-nowrap min-w-[85px]">Check In</th>
                  <th className="py-4 px-5 whitespace-nowrap min-w-[85px]">Check Out</th>
                  <th className="py-4 px-5 whitespace-nowrap min-w-[95px]">Working Hours</th>
                  <th className="py-4 px-5 whitespace-nowrap min-w-[100px]">Late By</th>
                  <th className="py-4 px-5 whitespace-nowrap min-w-[95px]">Overtime</th>
                  <th className="py-4 px-6 whitespace-nowrap min-w-[80px]">Status</th>
                </tr>
              </thead>
              <tbody className={isLight ? 'divide-y divide-[rgba(var(--hr-border),0.7)]' : 'divide-y divide-slate-700/30'}>
                {attendance.map((record) => (
                  <tr key={`${record.id ?? record.date}`} className={`align-middle ${isLight ? 'hover:bg-rose-50/50 transition-colors' : 'hover:bg-slate-750/30 transition-colors'}`}>
                    <td className={`py-4 px-6 font-semibold whitespace-nowrap min-w-[110px] ${isLight ? 'text-stone-900' : 'text-slate-200'}`}>
                      {new Date(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className={`py-4 px-5 whitespace-nowrap min-w-[85px] ${isLight ? 'text-stone-600' : 'text-slate-400'}`}>{record.day || '—'}</td>
                    <td className={`py-4 px-5 font-mono whitespace-nowrap min-w-[85px] ${isLight ? 'text-stone-700' : 'text-slate-300'}`}>{record.checkIn || '—'}</td>
                    <td className={`py-4 px-5 font-mono whitespace-nowrap min-w-[85px] ${isLight ? 'text-stone-700' : 'text-slate-300'}`}>{record.checkOut || '—'}</td>
                    <td className={`py-4 px-5 font-mono font-medium whitespace-nowrap min-w-[95px] ${isLight ? 'text-stone-800' : 'text-slate-200'}`}>{record.totalWorkingHours || '—'}</td>
                    <td className={`py-4 px-5 min-w-[100px] ${isLight ? 'text-stone-700' : 'text-slate-300'}`}>
                      {record.isLate ? (
                        <span className={isLight ? 'text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full inline-block whitespace-nowrap' : 'text-xs font-semibold px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full inline-block whitespace-nowrap'}>
                          Late ({record.lateBy})
                        </span>
                      ) : record.isGraceLate ? (
                        <span className={isLight ? 'text-xs font-semibold px-2.5 py-1 bg-orange-100 text-orange-800 border border-orange-300 rounded-full inline-block whitespace-nowrap' : 'text-xs font-semibold px-2.5 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full inline-block whitespace-nowrap'}>
                          Grace Late ({record.lateBy})
                        </span>
                      ) : (
                        <span className={isLight ? 'text-stone-500' : 'text-slate-500'}>—</span>
                      )}
                    </td>
                    <td className={`py-4 px-5 min-w-[95px] ${isLight ? 'text-stone-700' : 'text-slate-300'}`}>
                      {record.overtime ? (
                        <span className={isLight ? 'text-xs font-semibold px-2.5 py-1 bg-purple-100 text-purple-800 border border-purple-300 rounded-full inline-block whitespace-nowrap' : 'text-xs font-semibold px-2.5 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full inline-block whitespace-nowrap'}>
                          Yes ({record.otTime})
                        </span>
                      ) : (
                        <span className={isLight ? 'text-stone-500' : 'text-slate-500'}>—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 min-w-[80px]">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border inline-block whitespace-nowrap ${
                          record.status === 'PRESENT'
                            ? isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                            : record.status === 'ABSENT'
                            ? isLight ? 'bg-red-100 text-red-800 border-red-300' : 'bg-red-500/10 text-red-400 border-red-500/15'
                            : record.status === 'HOLIDAY'
                            ? isLight ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-blue-500/10 text-blue-400 border-blue-500/15'
                            : record.status === 'ON_LEAVE'
                            ? isLight ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-purple-500/10 text-purple-400 border-purple-500/15'
                            : isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-500/10 text-slate-400 border-slate-500/15'
                        }`}
                      >
                        {record.status === 'HOLIDAY' && record.holidayName
                          ? `HOLIDAY (${record.holidayName})`
                          : record.status === 'ON_LEAVE' && record.leaveType
                          ? `LEAVE (${record.leaveType})`
                          : record.status}
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
