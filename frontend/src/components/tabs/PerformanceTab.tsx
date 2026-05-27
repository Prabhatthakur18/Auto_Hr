import React, { useState } from 'react';
import { Target, TrendingUp, Plus, ChevronDown, ChevronRight, Pencil, Trash2, Loader2, X, Check } from 'lucide-react';
import { performanceApi } from '../../services/api';
import { type Kra, type Kpi, type PerformanceSummary } from '../../types';

interface PerformanceTabProps {
  employeeId: number;
  kras: Kra[];
  summary: PerformanceSummary | null;
  isHR: boolean;
  onRefresh: () => Promise<void>;
  theme?: 'dark' | 'light';
}

// ─── Score Badge ─────────────────────────────────────────────

const ScoreBadge: React.FC<{ score: number | null }> = ({ score }) => {
  if (score === null) return <span className="text-xs text-slate-500 italic">No score yet</span>;
  const color = score >= 80 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
    : score >= 60 ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
    : 'bg-red-500/15 text-red-400 border-red-500/20';
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {Math.round(score)}/100
    </span>
  );
};

// ─── KPI Progress Bar ────────────────────────────────────────

const KpiRow: React.FC<{ kpi: Kpi; isHR: boolean; onRefresh: () => Promise<void> }> = ({ kpi, isHR, onRefresh }) => {
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
  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : pct > 0 ? 'bg-red-500' : 'bg-slate-600';

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
      <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600/50 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3">
            <label className="text-xs text-slate-400 mb-1 block">Metric</label>
            <input value={metric} onChange={e => setMetric(e.target.value)}
              className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Target</label>
            <input type="number" value={target} onChange={e => setTarget(e.target.value)}
              className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Actual</label>
            <input type="number" value={actual} onChange={e => setActual(e.target.value)} placeholder="—"
              className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Unit</label>
            <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="%, days, ₹…"
              className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
          </button>
          <button onClick={() => setEditMode(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-colors">
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
          <span className="text-sm text-slate-200 font-medium truncate">{kpi.metric}</span>
          <div className="flex items-center gap-3 ml-4 flex-shrink-0">
            <span className="text-xs text-slate-400">
              {kpi.actual !== null ? kpi.actual : '—'}{kpi.unit ? ` ${kpi.unit}` : ''} / {kpi.target}{kpi.unit ? ` ${kpi.unit}` : ''}
            </span>
            <ScoreBadge score={kpi.score !== null ? Number(kpi.score) : null} />
            {isHR && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditMode(true)} className="p-1 text-slate-400 hover:text-blue-400 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleDelete} disabled={deleting} className="p-1 text-slate-400 hover:text-red-400 transition-colors">
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
};

// ─── KRA Card ────────────────────────────────────────────────

const KraCard: React.FC<{ kra: Kra; isHR: boolean; onRefresh: () => Promise<void> }> = ({ kra, isHR, onRefresh }) => {
  const [open, setOpen] = useState(true);
  const [addingKpi, setAddingKpi] = useState(false);
  const [editingKra, setEditingKra] = useState(false);
  const [kpiForm, setKpiForm] = useState({ metric: '', target: '', actual: '', unit: '' });
  const [kraForm, setKraForm] = useState({ title: kra.title, description: kra.description || '', period: kra.period });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const kraScore = kra.kpis.length > 0
    ? kra.kpis.filter(k => k.score !== null).reduce((s, k) => s + Number(k.score), 0) / kra.kpis.filter(k => k.score !== null).length || null
    : null;
  const scored = kra.kpis.filter(k => k.score !== null).length;

  const handleAddKpi = async () => {
    if (!kpiForm.metric || !kpiForm.target) return;
    setSaving(true);
    try {
      await performanceApi.createKpi({
        kraId: kra.id,
        metric: kpiForm.metric,
        target: parseFloat(kpiForm.target),
        actual: kpiForm.actual !== '' ? parseFloat(kpiForm.actual) : null,
        unit: kpiForm.unit || null,
      });
      await onRefresh();
      setKpiForm({ metric: '', target: '', actual: '', unit: '' });
      setAddingKpi(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

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
    <div className="bg-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden">
      {/* KRA Header */}
      <div className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-slate-750 transition-colors" onClick={() => setOpen(o => !o)}>
        <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
          <Target className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          {editingKra ? (
            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
              <input value={kraForm.title} onChange={e => setKraForm(p => ({ ...p, title: e.target.value }))}
                className="flex-1 bg-slate-700 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:border-blue-500" />
              <input value={kraForm.period} onChange={e => setKraForm(p => ({ ...p, period: e.target.value }))} placeholder="Period"
                className="w-32 bg-slate-700 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:border-blue-500" />
              <button onClick={handleUpdateKra} disabled={saving}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg disabled:opacity-50">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
              </button>
              <button onClick={() => setEditingKra(false)} className="px-3 py-1.5 bg-slate-700 text-white text-xs rounded-lg">Cancel</button>
            </div>
          ) : (
            <>
              <p className="text-white font-semibold text-sm">{kra.title}</p>
              <p className="text-slate-400 text-xs mt-0.5">{kra.period} · {kra.kpis.length} KPI{kra.kpis.length !== 1 ? 's' : ''}{scored > 0 ? ` · ${scored} scored` : ''}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
          <ScoreBadge score={kraScore !== null ? Math.round(kraScore * 100) / 100 : null} />
          {isHR && (
            <>
              <button onClick={() => setEditingKra(v => !v)} className="p-1 text-slate-400 hover:text-blue-400 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleDeleteKra} disabled={deleting} className="p-1 text-slate-400 hover:text-red-400 transition-colors">
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
          {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* KRA Body */}
      {open && (
        <div className="px-5 pb-4 border-t border-slate-700/50">
          {kra.description && (
            <p className="text-slate-400 text-xs mt-3 mb-2">{kra.description}</p>
          )}

          {kra.kpis.length === 0 && !addingKpi && (
            <p className="text-slate-500 text-sm italic py-4 text-center">No KPIs yet{isHR ? ' — add one below' : ''}</p>
          )}

          {kra.kpis.map(kpi => (
            <KpiRow key={kpi.id} kpi={kpi} isHR={isHR} onRefresh={onRefresh} />
          ))}

          {/* Add KPI form */}
          {isHR && (
            <>
              {addingKpi ? (
                <div className="mt-3 bg-slate-700/40 rounded-xl p-4 border border-slate-600/40 space-y-3">
                  <p className="text-xs text-slate-400 font-medium">New KPI</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <input value={kpiForm.metric} onChange={e => setKpiForm(p => ({ ...p, metric: e.target.value }))} placeholder="Metric name *"
                        className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500" />
                    </div>
                    <input type="number" value={kpiForm.target} onChange={e => setKpiForm(p => ({ ...p, target: e.target.value }))} placeholder="Target *"
                      className="bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500" />
                    <input type="number" value={kpiForm.actual} onChange={e => setKpiForm(p => ({ ...p, actual: e.target.value }))} placeholder="Actual (optional)"
                      className="bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500" />
                    <input value={kpiForm.unit} onChange={e => setKpiForm(p => ({ ...p, unit: e.target.value }))} placeholder="Unit (%, days, ₹…)"
                      className="bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddKpi} disabled={saving || !kpiForm.metric || !kpiForm.target}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add KPI
                    </button>
                    <button onClick={() => setAddingKpi(false)} className="px-4 py-2 bg-slate-700 text-white text-xs rounded-lg hover:bg-slate-600 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingKpi(true)}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-xs text-slate-400 hover:text-blue-400 border border-dashed border-slate-600 hover:border-blue-500/40 rounded-xl transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add KPI
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Performance Tab ─────────────────────────────────────────

const PerformanceTab: React.FC<PerformanceTabProps> = ({ employeeId, kras, summary, isHR, onRefresh, theme = 'dark' }) => {
  const isLight = theme === 'light';
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
    <div className={`space-y-6 ${isLight ? 'hr-panel-light' : ''}`}>
      {/* Summary Bar */}
      {summary && (summary.totalKras > 0 || summary.overallScore !== null) && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total KRAs', value: summary.totalKras },
            { label: 'Total KPIs', value: summary.totalKpis },
            { label: 'Scored KPIs', value: `${summary.scoredKpis}/${summary.totalKpis}` },
          ].map(s => (
            <div key={s.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700/50 text-center">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* KRA List */}
      {kras.length === 0 && !addingKra && (
        <div className="text-center py-16">
          <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No KRAs defined yet</p>
          {isHR && <p className="text-slate-500 text-sm mt-1">Add the first KRA to start tracking performance</p>}
        </div>
      )}

      <div className="space-y-4">
        {kras.map(kra => (
          <KraCard key={kra.id} kra={kra} isHR={isHR} onRefresh={onRefresh} />
        ))}
      </div>

      {/* Add KRA */}
      {isHR && (
        <>
          {addingKra ? (
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700/50 space-y-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" /> New KRA
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Title *</label>
                  <input value={kraForm.title} onChange={e => setKraForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Improve Delivery TAT"
                    className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Period</label>
                  <input value={kraForm.period} onChange={e => setKraForm(p => ({ ...p, period: e.target.value }))} placeholder="e.g. Q2 2026, Monthly"
                    className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Description (optional)</label>
                  <input value={kraForm.description} onChange={e => setKraForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleAddKra} disabled={saving || !kraForm.title}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create KRA
                </button>
                <button onClick={() => setAddingKra(false)} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-xl transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingKra(true)}
              className="w-full flex items-center justify-center gap-2 py-4 text-sm text-slate-400 hover:text-blue-400 border-2 border-dashed border-slate-700 hover:border-blue-500/40 rounded-2xl transition-colors">
              <Plus className="w-4 h-4" /> Add KRA
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default PerformanceTab;
