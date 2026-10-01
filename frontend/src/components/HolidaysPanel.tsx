import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Palmtree, Plus, Pencil, Trash2, Check, X, Loader2, CalendarDays } from 'lucide-react';
import { holidayApi, type Holiday, type UserRole } from '../services/api';
import ConfirmDialog from './ConfirmDialog';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Today's date in India as YYYY-MM-DD. */
const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const ymd = (iso: string) => iso.slice(0, 10);
const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' });

const inputClass =
  'w-full bg-white text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all';

/**
 * Company holiday calendar. Everyone sees the year's holidays; HR can add, rename/move and
 * delete them. Holidays feed attendance (shown as "Holiday" instead of absent), the home
 * page's upcoming list and the leave calendar.
 */
export const HolidaysPanel: React.FC<{ role: UserRole }> = ({ role }) => {
  const canManage = role === 'HR';
  const today = todayIST();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editName, setEditName] = useState('');
  const [toDelete, setToDelete] = useState<Holiday | null>(null);

  const load = async (y = year) => {
    setLoading(true);
    setError('');
    try {
      const res = await holidayApi.list(y);
      setHolidays(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load holidays');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(year);
  }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  const byMonth = useMemo(() => {
    const groups = new Map<number, Holiday[]>();
    for (const h of holidays) {
      const m = Number(ymd(h.date).slice(5, 7)) - 1;
      groups.set(m, [...(groups.get(m) ?? []), h]);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [holidays]);

  const nextHoliday = holidays.find(h => ymd(h.date) >= today);
  const remaining = holidays.filter(h => ymd(h.date) >= today).length;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await holidayApi.create({ date: newDate, name: newName.trim() });
      setNewName('');
      setNewDate('');
      const addedYear = Number(newDate.slice(0, 4));
      if (addedYear !== year) setYear(addedYear); else await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add holiday');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (h: Holiday) => {
    setEditingId(h.id);
    setEditDate(ymd(h.date));
    setEditName(h.name);
    setError('');
  };

  const saveEdit = async () => {
    if (editingId === null || !editDate || !editName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await holidayApi.update(editingId, { date: editDate, name: editName.trim() });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update holiday');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const target = toDelete;
    setToDelete(null);
    setError('');
    try {
      await holidayApi.remove(target.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete holiday');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Holidays</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Company holiday calendar{canManage ? ' — add or change holidays here; everyone sees them.' : '.'}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-orange-100 rounded-2xl p-1 self-start sm:self-auto">
          <button onClick={() => setYear(y => y - 1)} className="p-2 rounded-xl text-slate-500 hover:bg-orange-50" aria-label="Previous year">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-sm font-black text-slate-800 tabular-nums">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="p-2 rounded-xl text-slate-500 hover:bg-orange-50" aria-label="Next year">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-orange-100/60 p-4">
          <p className="text-2xl font-black text-slate-800 tabular-nums">{holidays.length}</p>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Holidays in {year}</p>
        </div>
        <div className="bg-white rounded-2xl border border-orange-100/60 p-4">
          <p className="text-2xl font-black text-slate-800 tabular-nums">{remaining}</p>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Still to come</p>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100 p-4">
          <p className="text-[11px] font-bold text-[#c2410c] uppercase tracking-wider">Next holiday</p>
          {nextHoliday ? (
            <>
              <p className="text-sm font-black text-slate-800 mt-1 truncate">{nextHoliday.name}</p>
              <p className="text-xs font-semibold text-slate-500">{fmt(nextHoliday.date, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
            </>
          ) : (
            <p className="text-sm font-semibold text-slate-500 mt-1">None left this year</p>
          )}
        </div>
      </div>

      {/* Add (HR) */}
      {canManage && (
        <form onSubmit={handleAdd} className="bg-white rounded-[24px] border border-orange-100/60 shadow-card p-5">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-3">
            <Plus className="w-4 h-4 text-[#f46617]" /> Add a holiday
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} required className={`${inputClass} sm:w-48`} aria-label="Holiday date" />
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required maxLength={100} placeholder="e.g. Diwali" className={inputClass} aria-label="Holiday name" />
            <button type="submit" disabled={saving || !newDate || !newName.trim()} className="btn-orange px-5 py-2.5 text-sm font-bold rounded-xl justify-center flex-shrink-0">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</div>
      )}

      {/* List by month */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-[#f46617] animate-spin" /></div>
      ) : holidays.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
          <Palmtree className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="font-black text-slate-700">No holidays added for {year}</p>
          <p className="text-sm text-slate-400 font-medium mt-1">{canManage ? 'Add the first one above.' : 'HR will publish the holiday calendar here.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {byMonth.map(([month, items]) => (
            <section key={month} className="bg-white rounded-[24px] border border-orange-100/60 shadow-card overflow-hidden">
              <h3 className="px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider bg-orange-50/40 border-b border-orange-100/60 flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-[#f46617]" /> {MONTHS[month]}
              </h3>
              <ul className="divide-y divide-slate-100">
                {items.map(h => {
                  const day = ymd(h.date);
                  const past = day < today;
                  const isToday = day === today;
                  const editing = editingId === h.id;
                  return (
                    <li key={h.id} className={`flex items-center gap-4 px-5 py-3 ${past ? 'opacity-60' : ''}`}>
                      <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 leading-none ${isToday ? 'bg-[#f46617] text-white' : 'bg-orange-50 text-[#f46617]'}`}>
                        <span className="text-[10px] font-bold uppercase">{fmt(h.date, { weekday: 'short' })}</span>
                        <span className="text-lg font-black">{fmt(h.date, { day: 'numeric' })}</span>
                      </div>
                      {editing ? (
                        <div className="flex-1 flex flex-col sm:flex-row gap-2 min-w-0">
                          <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className={`${inputClass} sm:w-44`} aria-label="Holiday date" />
                          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} maxLength={100} className={inputClass} aria-label="Holiday name" />
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{h.name}</p>
                          <p className="text-xs font-semibold text-slate-500">
                            {fmt(h.date, { weekday: 'long', day: 'numeric', month: 'long' })}
                            {isToday && <span className="ml-2 text-[#f46617] font-bold">· Today</span>}
                          </p>
                        </div>
                      )}
                      {canManage && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {editing ? (
                            <>
                              <button onClick={() => void saveEdit()} disabled={saving} className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50" aria-label="Save">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100" aria-label="Cancel">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(h)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label={`Edit ${h.name}`}>
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => setToDelete(h)} className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50" aria-label={`Delete ${h.name}`}>
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={toDelete !== null}
        variant="danger"
        title="Delete holiday?"
        message={toDelete ? `Remove "${toDelete.name}" (${fmt(toDelete.date, { day: 'numeric', month: 'long', year: 'numeric' })}) from the holiday calendar? Attendance for that day will no longer show as a holiday.` : ''}
        confirmLabel="Delete"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
