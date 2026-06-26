import React, { useEffect, useState } from 'react';
import { Target, TrendingUp, Plus, ChevronDown, ChevronRight, Pencil, Trash2, Loader2, X, Check, Gauge, GraduationCap, Award, CalendarClock } from 'lucide-react';
import { performanceApi, learningApi, type EmployeeLearningSummary } from '../../services/api';
import { type Kra, type Kpi, type PerformanceSummary } from '../../types';
import { BadgeGallery } from '../BadgeGallery';

interface PerformanceTabProps {
  employeeId: number;
  kras: Kra[];
  summary: PerformanceSummary | null;
  isHR: boolean;
  onRefresh: () => Promise<void>;
  theme?: 'dark' | 'light';
}

// ─── Score Badge ─────────────────────────────────────────────

const ScoreBadge: React.FC<{ score: number | null; isLight: boolean }> = ({ score, isLight }) => {
  if (score === null) return <span className={`text-xs italic ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>No score yet</span>;
  const color = score >= 80
    ? (isLight ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20')
    : score >= 60
      ? (isLight ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-amber-500/15 text-amber-400 border-amber-500/20')
      : (isLight ? 'bg-red-100 text-red-700 border-red-200' : 'bg-red-500/15 text-red-400 border-red-500/20');
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {Math.round(score)}/100
    </span>
  );
};

// ─── Shared field classes ─────────────────────────────────────

const fieldClass = (isLight: boolean) =>
  isLight
    ? 'w-full bg-white text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all placeholder-slate-400'
    : 'w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500';

const labelClass = (isLight: boolean) =>
  isLight
    ? 'block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider'
    : 'text-xs text-slate-400 mb-1 block';

// ─── KPI Progress Bar ────────────────────────────────────────

const KpiRow: React.FC<{ kpi: Kpi; isHR: boolean; isLight: boolean; onRefresh: () => Promise<void>; kraTitle?: string }> = ({ kpi, isHR, isLight, onRefresh, kraTitle }) => {
  const [editMode, setEditMode] = useState(false);
  const [actual, setActual] = useState(kpi.actual !== null ? String(kpi.actual) : '');
  const [metric, setMetric] = useState(kpi.metric);
  const [target, setTarget] = useState(String(kpi.target));
  const [unit, setUnit] = useState(kpi.unit || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const pct = kpi.actual !== null && kpi.target > 0
    ? Math.min((kpi.actual / kpi.target) * 100, 100)
    : 0;
  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : pct > 0 ? (isLight ? 'bg-[#f46617]' : 'bg-red-500') : (isLight ? 'bg-orange-100' : 'bg-slate-600');

  const handleSave = async () => {
    setSaving(true);
    try {
      await performanceApi.updateKpi(kpi.id, {
        metric,
        target: parseFloat(target) || kpi.target,
        actual: actual !== '' ? parseFloat(actual) : null,
        unit: unit || null,
      });
      await onRefresh();
      setEditMode(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete KPI "${kpi.metric}"?`)) return;
    setDeleting(true);
    try {
      await performanceApi.deleteKpi(kpi.id);
      await onRefresh();
    } catch (e) { console.error(e); }
    finally { setDeleting(false); }
  };

  if (editMode) {
    return (
      <div className={isLight ? 'rounded-2xl p-4 border border-orange-100 bg-orange-50/30 space-y-3' : 'bg-slate-700/50 rounded-xl p-4 border border-slate-600/50 space-y-3'}>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3">
            <label className={labelClass(isLight)}>Metric</label>
            <input value={metric} onChange={e => setMetric(e.target.value)} className={fieldClass(isLight)} />
          </div>
          <div>
            <label className={labelClass(isLight)}>Target</label>
            <input type="number" value={target} onChange={e => setTarget(e.target.value)} className={fieldClass(isLight)} />
          </div>
          <div>
            <label className={labelClass(isLight)}>Actual</label>
            <input type="number" value={actual} onChange={e => setActual(e.target.value)} placeholder="—" className={fieldClass(isLight)} />
          </div>
          <div>
            <label className={labelClass(isLight)}>Unit</label>
            <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="%, days, ₹…" className={fieldClass(isLight)} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className={isLight
              ? 'btn-orange px-4 py-2 text-xs font-bold rounded-xl'
              : 'flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors'}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
          </button>
          <button onClick={() => setEditMode(false)}
            className={isLight
              ? 'px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5'
              : 'flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-colors'}>
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 py-3 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="min-w-0">
            <span className={`text-sm font-bold truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{kpi.metric}</span>
            {kraTitle && <span className={`text-[10px] block mt-0.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>KRA: {kraTitle}</span>}
          </div>
          <div className="flex items-center gap-3 ml-4 flex-shrink-0">
            <span className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {kpi.actual !== null ? kpi.actual : '—'}{kpi.unit ? ` ${kpi.unit}` : ''} / {kpi.target}{kpi.unit ? ` ${kpi.unit}` : ''}
            </span>
            <ScoreBadge score={kpi.score !== null ? Number(kpi.score) : null} isLight={isLight} />
            {isHR && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditMode(true)} className={`p-1 transition-colors ${isLight ? 'text-slate-400 hover:text-[#f46617]' : 'text-slate-400 hover:text-blue-400'}`}>
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleDelete} disabled={deleting} className={`p-1 transition-colors ${isLight ? 'text-slate-400 hover:text-red-500' : 'text-slate-400 hover:text-red-400'}`}>
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-orange-50' : 'bg-slate-700'}`}>
          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
};

// ─── KRA Card ────────────────────────────────────────────────

const KraCard: React.FC<{ kra: Kra; isHR: boolean; isLight: boolean; onRefresh: () => Promise<void> }> = ({ kra, isHR, isLight, onRefresh }) => {
  const [open, setOpen] = useState(true);
  const [editingKra, setEditingKra] = useState(false);
  const [kraForm, setKraForm] = useState({ title: kra.title, description: kra.description || '', period: kra.period });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const kraScore = kra.kpis.length > 0
    ? kra.kpis.filter(k => k.score !== null).reduce((s, k) => s + Number(k.score), 0) / kra.kpis.filter(k => k.score !== null).length || null
    : null;
  const scored = kra.kpis.filter(k => k.score !== null).length;

  const handleUpdateKra = async () => {
    setSaving(true);
    try {
      await performanceApi.updateKra(kra.id, kraForm);
      await onRefresh();
      setEditingKra(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDeleteKra = async () => {
    if (!confirm(`Delete KRA "${kra.title}" and all its KPIs?`)) return;
    setDeleting(true);
    try {
      await performanceApi.deleteKra(kra.id);
      await onRefresh();
    } catch (e) { console.error(e); }
    finally { setDeleting(false); }
  };

  return (
    <div className={isLight
      ? 'bg-white rounded-[24px] border border-orange-100/50 shadow-card overflow-hidden'
      : 'bg-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden'}>
      {/* KRA Header */}
      <div className={`flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors ${isLight ? 'hover:bg-orange-50/30' : 'hover:bg-slate-750'}`} onClick={() => setOpen(o => !o)}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isLight ? 'bg-orange-50 border border-orange-100' : 'bg-blue-500/15 border border-blue-500/20'}`}>
          <Target className={`w-4 h-4 ${isLight ? 'text-[#f46617]' : 'text-blue-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          {editingKra ? (
            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
              <input value={kraForm.title} onChange={e => setKraForm(p => ({ ...p, title: e.target.value }))}
                className={isLight
                  ? 'flex-1 bg-white text-slate-800 text-sm rounded-xl px-3 py-1.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all'
                  : 'flex-1 bg-slate-700 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:border-blue-500'} />
              <input value={kraForm.period} onChange={e => setKraForm(p => ({ ...p, period: e.target.value }))} placeholder="Period"
                className={isLight
                  ? 'w-32 bg-white text-slate-800 text-sm rounded-xl px-3 py-1.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all'
                  : 'w-32 bg-slate-700 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:border-blue-500'} />
              <button onClick={handleUpdateKra} disabled={saving}
                className={isLight ? 'btn-orange px-3 py-1.5 text-xs font-bold rounded-xl' : 'px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg disabled:opacity-50'}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
              </button>
              <button onClick={() => setEditingKra(false)}
                className={isLight ? 'px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50' : 'px-3 py-1.5 bg-slate-700 text-white text-xs rounded-lg'}>Cancel</button>
            </div>
          ) : (
            <>
              <p className={`font-bold text-sm ${isLight ? 'text-slate-800' : 'text-white'}`}>{kra.title}</p>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{kra.period} · {kra.kpis.length} KPI{kra.kpis.length !== 1 ? 's' : ''}{scored > 0 ? ` · ${scored} scored` : ''}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
          <ScoreBadge score={kraScore !== null ? Math.round(kraScore * 100) / 100 : null} isLight={isLight} />
          {isHR && (
            <>
              <button onClick={() => setEditingKra(v => !v)} className={`p-1 transition-colors ${isLight ? 'text-slate-400 hover:text-[#f46617]' : 'text-slate-400 hover:text-blue-400'}`}>
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleDeleteKra} disabled={deleting} className={`p-1 transition-colors ${isLight ? 'text-slate-400 hover:text-red-500' : 'text-slate-400 hover:text-red-400'}`}>
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
          {open
            ? <ChevronDown className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-slate-400'}`} />
            : <ChevronRight className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-slate-400'}`} />}
        </div>
      </div>

      {/* KRA Body */}
      {open && (
        <div className={`px-5 pb-4 border-t ${isLight ? 'border-orange-100/50' : 'border-slate-700/50'}`}>
          {kra.description && (
            <p className={`text-xs mt-3 mb-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{kra.description}</p>
          )}

          {kra.kpis.length === 0 && (
            <p className={`text-sm italic py-4 text-center ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>No KPIs yet{isHR ? ' — add one from the KPIs tab' : ''}</p>
          )}

          <div className={isLight ? 'divide-y divide-orange-100/40' : 'divide-y divide-slate-700/40'}>
            {kra.kpis.map(kpi => (
              <KpiRow key={kpi.id} kpi={kpi} isHR={isHR} isLight={isLight} onRefresh={onRefresh} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── KRAs Sub-tab ────────────────────────────────────────────

const KrasSection: React.FC<{ employeeId: number; kras: Kra[]; isHR: boolean; isLight: boolean; onRefresh: () => Promise<void> }> = ({ employeeId, kras, isHR, isLight, onRefresh }) => {
  const [addingKra, setAddingKra] = useState(false);
  const [kraForm, setKraForm] = useState({ title: '', description: '', period: 'Ongoing' });
  const [saving, setSaving] = useState(false);

  const handleAddKra = async () => {
    if (!kraForm.title) return;
    setSaving(true);
    try {
      await performanceApi.createKra({ employeeId, ...kraForm });
      await onRefresh();
      setKraForm({ title: '', description: '', period: 'Ongoing' });
      setAddingKra(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {kras.length === 0 && !addingKra && (
        <div className={isLight
          ? 'text-center py-16 text-slate-400 bg-white rounded-3xl border border-orange-100/50 shadow-card'
          : 'text-center py-16'}>
          <TrendingUp className={`w-12 h-12 mx-auto mb-3 ${isLight ? 'opacity-50 text-slate-400' : 'text-slate-600'}`} />
          <p className={`font-semibold ${isLight ? '' : 'text-slate-400 font-medium'}`}>No KRAs defined yet</p>
          {isHR && <p className={`text-sm mt-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Add the first KRA to start tracking performance</p>}
        </div>
      )}

      <div className="space-y-4">
        {kras.map(kra => (
          <KraCard key={kra.id} kra={kra} isHR={isHR} isLight={isLight} onRefresh={onRefresh} />
        ))}
      </div>

      {isHR && (
        <>
          {addingKra ? (
            <div className={isLight
              ? 'bg-white rounded-[24px] p-6 border border-orange-100/50 shadow-card space-y-4'
              : 'bg-slate-800 rounded-2xl p-6 border border-slate-700/50 space-y-4'}>
              <h3 className={`font-bold flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-white font-semibold'}`}>
                <Target className={`w-4 h-4 ${isLight ? 'text-[#f46617]' : 'text-blue-400'}`} /> New KRA
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelClass(isLight)}>Title *</label>
                  <input value={kraForm.title} onChange={e => setKraForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Improve Delivery TAT"
                    className={fieldClass(isLight)} />
                </div>
                <div>
                  <label className={labelClass(isLight)}>Period</label>
                  <input value={kraForm.period} onChange={e => setKraForm(p => ({ ...p, period: e.target.value }))} placeholder="e.g. Q2 2026, Monthly"
                    className={fieldClass(isLight)} />
                </div>
                <div>
                  <label className={labelClass(isLight)}>Description (optional)</label>
                  <input value={kraForm.description} onChange={e => setKraForm(p => ({ ...p, description: e.target.value }))}
                    className={fieldClass(isLight)} />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleAddKra} disabled={saving || !kraForm.title}
                  className={isLight ? 'btn-orange px-5 py-2.5 text-sm font-bold rounded-xl' : 'flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors'}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create KRA
                </button>
                <button onClick={() => setAddingKra(false)}
                  className={isLight ? 'px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors' : 'px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-xl transition-colors'}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingKra(true)}
              className={isLight
                ? 'w-full flex items-center justify-center gap-2 py-4 text-sm font-bold text-slate-400 hover:text-[#f46617] border-2 border-dashed border-orange-100 hover:border-brand-orange/40 rounded-[24px] transition-colors'
                : 'w-full flex items-center justify-center gap-2 py-4 text-sm text-slate-400 hover:text-blue-400 border-2 border-dashed border-slate-700 hover:border-blue-500/40 rounded-2xl transition-colors'}>
              <Plus className="w-4 h-4" /> Add KRA
            </button>
          )}
        </>
      )}
    </div>
  );
};

// ─── KPIs Sub-tab ────────────────────────────────────────────

const KpisSection: React.FC<{ kras: Kra[]; isHR: boolean; isLight: boolean; onRefresh: () => Promise<void> }> = ({ kras, isHR, isLight, onRefresh }) => {
  const [addingKpi, setAddingKpi] = useState(false);
  const [kpiForm, setKpiForm] = useState({ kraId: '', metric: '', target: '', actual: '', unit: '' });
  const [saving, setSaving] = useState(false);

  const allKpis = kras.flatMap(kra => kra.kpis.map(kpi => ({ kpi, kraTitle: kra.title })));

  const handleAddKpi = async () => {
    if (!kpiForm.kraId || !kpiForm.metric || !kpiForm.target) return;
    setSaving(true);
    try {
      await performanceApi.createKpi({
        kraId: parseInt(kpiForm.kraId, 10),
        metric: kpiForm.metric,
        target: parseFloat(kpiForm.target),
        actual: kpiForm.actual !== '' ? parseFloat(kpiForm.actual) : null,
        unit: kpiForm.unit || null,
      });
      await onRefresh();
      setKpiForm({ kraId: '', metric: '', target: '', actual: '', unit: '' });
      setAddingKpi(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const emptyStateClass = isLight
    ? 'text-center py-16 text-slate-400 bg-white rounded-3xl border border-orange-100/50 shadow-card'
    : 'text-center py-16';

  return (
    <div className="space-y-4">
      {kras.length === 0 && (
        <div className={emptyStateClass}>
          <Gauge className={`w-12 h-12 mx-auto mb-3 ${isLight ? 'opacity-50 text-slate-400' : 'text-slate-600'}`} />
          <p className={`font-semibold ${isLight ? '' : 'text-slate-400 font-medium'}`}>No KRAs yet</p>
          <p className={`text-sm mt-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Create a KRA first, then add KPIs under it</p>
        </div>
      )}

      {kras.length > 0 && allKpis.length === 0 && !addingKpi && (
        <div className={emptyStateClass}>
          <Gauge className={`w-12 h-12 mx-auto mb-3 ${isLight ? 'opacity-50 text-slate-400' : 'text-slate-600'}`} />
          <p className={`font-semibold ${isLight ? '' : 'text-slate-400 font-medium'}`}>No KPIs defined yet</p>
          {isHR && <p className={`text-sm mt-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Add the first KPI to start tracking progress</p>}
        </div>
      )}

      {allKpis.length > 0 && (
        <div className={isLight
          ? 'bg-white rounded-[24px] border border-orange-100/50 shadow-card px-5 divide-y divide-orange-100/40'
          : 'bg-slate-800 rounded-2xl border border-slate-700/50 px-5 divide-y divide-slate-700/50'}>
          {allKpis.map(({ kpi, kraTitle }) => (
            <KpiRow key={kpi.id} kpi={kpi} isHR={isHR} isLight={isLight} onRefresh={onRefresh} kraTitle={kraTitle} />
          ))}
        </div>
      )}

      {isHR && kras.length > 0 && (
        <>
          {addingKpi ? (
            <div className={isLight
              ? 'bg-white rounded-[24px] p-6 border border-orange-100/50 shadow-card space-y-4'
              : 'bg-slate-800 rounded-2xl p-6 border border-slate-700/50 space-y-4'}>
              <h3 className={`font-bold flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-white font-semibold'}`}>
                <Gauge className={`w-4 h-4 ${isLight ? 'text-[#f46617]' : 'text-blue-400'}`} /> New KPI
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelClass(isLight)}>KRA *</label>
                  <select value={kpiForm.kraId} onChange={e => setKpiForm(p => ({ ...p, kraId: e.target.value }))}
                    className={fieldClass(isLight)}>
                    <option value="">Select a KRA…</option>
                    {kras.map(kra => (
                      <option key={kra.id} value={kra.id}>{kra.title}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelClass(isLight)}>Metric *</label>
                  <input value={kpiForm.metric} onChange={e => setKpiForm(p => ({ ...p, metric: e.target.value }))} placeholder="e.g. Tickets resolved"
                    className={fieldClass(isLight)} />
                </div>
                <div>
                  <label className={labelClass(isLight)}>Target *</label>
                  <input type="number" value={kpiForm.target} onChange={e => setKpiForm(p => ({ ...p, target: e.target.value }))} placeholder="Target"
                    className={fieldClass(isLight)} />
                </div>
                <div>
                  <label className={labelClass(isLight)}>Actual (optional)</label>
                  <input type="number" value={kpiForm.actual} onChange={e => setKpiForm(p => ({ ...p, actual: e.target.value }))} placeholder="Actual"
                    className={fieldClass(isLight)} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass(isLight)}>Unit (optional)</label>
                  <input value={kpiForm.unit} onChange={e => setKpiForm(p => ({ ...p, unit: e.target.value }))} placeholder="%, days, ₹…"
                    className={fieldClass(isLight)} />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleAddKpi} disabled={saving || !kpiForm.kraId || !kpiForm.metric || !kpiForm.target}
                  className={isLight ? 'btn-orange px-5 py-2.5 text-sm font-bold rounded-xl' : 'flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors'}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create KPI
                </button>
                <button onClick={() => setAddingKpi(false)}
                  className={isLight ? 'px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors' : 'px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-xl transition-colors'}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingKpi(true)}
              className={isLight
                ? 'w-full flex items-center justify-center gap-2 py-4 text-sm font-bold text-slate-400 hover:text-[#f46617] border-2 border-dashed border-orange-100 hover:border-brand-orange/40 rounded-[24px] transition-colors'
                : 'w-full flex items-center justify-center gap-2 py-4 text-sm text-slate-400 hover:text-blue-400 border-2 border-dashed border-slate-700 hover:border-blue-500/40 rounded-2xl transition-colors'}>
              <Plus className="w-4 h-4" /> Add KPI
            </button>
          )}
        </>
      )}
    </div>
  );
};

// ─── Learning Summary Sub-tab (read-only L&D rollup, BRD FR-7.3) ─

const LearningSummarySection: React.FC<{ employeeId: number; isLight: boolean }> = ({ employeeId, isLight }) => {
  const [data, setData] = useState<EmployeeLearningSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    learningApi.getEmployeeLearningSummary(employeeId)
      .then(res => { if (res.data) setData(res.data.summary); })
      .finally(() => setLoading(false));
  }, [employeeId]);

  const cardClass = isLight
    ? 'bg-white rounded-[24px] p-5 border border-orange-100/50 shadow-card'
    : 'bg-slate-800 rounded-2xl p-5 border border-slate-700/50';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={`w-6 h-6 animate-spin ${isLight ? 'text-[#f46617]' : 'text-blue-400'}`} />
      </div>
    );
  }

  if (!data) return null;

  const courseRate = data.courses.total > 0 ? Math.round((data.courses.completed / data.courses.total) * 100) : 0;
  const mandatoryRate = data.courses.mandatoryTotal > 0 ? Math.round((data.courses.mandatoryCompleted / data.courses.mandatoryTotal) * 100) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Courses Completed', value: `${data.courses.completed}/${data.courses.total}`, icon: GraduationCap },
          { label: 'Paths Completed', value: `${data.paths.completed}/${data.paths.total}`, icon: TrendingUp },
          { label: 'Live Sessions Attended', value: data.ilt.attended, icon: CalendarClock },
          { label: 'Certificates Earned', value: data.certificatesEarned, icon: Award },
        ].map(s => (
          <div key={s.label} className={`${cardClass} text-center`}>
            <s.icon className={`w-5 h-5 mx-auto mb-2 ${isLight ? 'text-[#f46617]' : 'text-blue-400'}`} />
            <p className={`text-xl font-black ${isLight ? 'text-slate-800' : 'text-white'}`}>{s.value}</p>
            <p className={`text-[10px] mt-1 font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between mb-2">
          <p className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Course Completion Rate</p>
          <p className={`text-sm font-black ${isLight ? 'text-[#f46617]' : 'text-blue-400'}`}>{courseRate}%</p>
        </div>
        <div className={`w-full h-2 rounded-full overflow-hidden ${isLight ? 'bg-orange-50' : 'bg-slate-700'}`}>
          <div className={`h-full rounded-full ${isLight ? 'bg-[#f46617]' : 'bg-blue-500'}`} style={{ width: `${courseRate}%` }} />
        </div>

        {mandatoryRate !== null && (
          <>
            <div className="flex items-center justify-between mb-2 mt-4">
              <p className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Mandatory Course Compliance</p>
              <p className={`text-sm font-black ${mandatoryRate === 100 ? 'text-emerald-500' : isLight ? 'text-red-500' : 'text-red-400'}`}>{mandatoryRate}%</p>
            </div>
            <div className={`w-full h-2 rounded-full overflow-hidden ${isLight ? 'bg-orange-50' : 'bg-slate-700'}`}>
              <div className={`h-full rounded-full ${mandatoryRate === 100 ? 'bg-emerald-500' : isLight ? 'bg-red-400' : 'bg-red-500'}`} style={{ width: `${mandatoryRate}%` }} />
            </div>
          </>
        )}

        {data.ilt.upcoming > 0 && (
          <p className={`text-xs mt-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {data.ilt.upcoming} upcoming live session{data.ilt.upcoming !== 1 ? 's' : ''} registered
          </p>
        )}
      </div>

      <div>
        <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Badges Earned</p>
        <BadgeGallery employeeId={employeeId} />
      </div>
    </div>
  );
};

// ─── Performance Tab ─────────────────────────────────────────

type PerformanceSubTab = 'kras' | 'kpis' | 'learning';

const PerformanceTab: React.FC<PerformanceTabProps> = ({ employeeId, kras, summary, isHR, onRefresh, theme = 'dark' }) => {
  const isLight = theme === 'light';
  const [subTab, setSubTab] = useState<PerformanceSubTab>('kras');

  const subTabs: { id: PerformanceSubTab; label: string }[] = [
    { id: 'kras', label: 'KRAs' },
    { id: 'kpis', label: 'KPIs' },
    { id: 'learning', label: 'Learning' },
  ];

  return (
    <div className={`space-y-6 ${isLight ? 'hr-panel-light' : ''}`}>
      {/* Summary Bar */}
      {summary && (summary.totalKras > 0 || summary.overallScore !== null) && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total KRAs', value: summary.totalKras },
            { label: 'Total KPIs', value: summary.totalKpis },
            { label: 'Scored KPIs', value: `${summary.scoredKpis}/${summary.totalKpis}` },
          ].map(s => (
            <div key={s.label} className={isLight
              ? 'bg-white rounded-[24px] p-4 border border-orange-100/50 shadow-card text-center'
              : 'bg-slate-800 rounded-xl p-4 border border-slate-700/50 text-center'}>
              <p className={`text-2xl font-black ${isLight ? 'text-slate-800' : 'text-white font-bold'}`}>{s.value}</p>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500 font-bold uppercase tracking-wider' : 'text-slate-400'}`}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sub-tab Switcher */}
      <div className={isLight
        ? 'flex bg-orange-50/60 p-1.5 rounded-2xl border border-orange-100/50 w-fit'
        : 'flex bg-slate-800/60 p-1.5 rounded-2xl border border-slate-700/50 w-fit'}>
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={
              isLight
                ? `px-5 py-2 text-xs font-bold rounded-xl transition-all ${subTab === tab.id ? 'bg-white text-[#f46617] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`
                : `px-5 py-2 text-sm font-bold rounded-xl transition-all ${subTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'kras' && (
        <KrasSection employeeId={employeeId} kras={kras} isHR={isHR} isLight={isLight} onRefresh={onRefresh} />
      )}
      {subTab === 'kpis' && (
        <KpisSection kras={kras} isHR={isHR} isLight={isLight} onRefresh={onRefresh} />
      )}
      {subTab === 'learning' && (
        <LearningSummarySection employeeId={employeeId} isLight={isLight} />
      )}
    </div>
  );
};

export default PerformanceTab;
