import React, { useRef, useState } from 'react';
import {
  Upload, FileJson, Loader2, CheckCircle, XCircle, AlertTriangle,
  ShieldCheck, ArrowRight, RotateCcw,
} from 'lucide-react';
import { salaryApi, type PayrollImportRow, type PayrollImportSummary } from '../services/api';

type Stage = 'UPLOAD' | 'PREVIEW' | 'CONFIRM_MONTH_MISMATCH' | 'CONFIRM_OVERWRITE' | 'DONE';

const currentMonthValue = () => new Date().toISOString().slice(0, 7);

const formatMonthLabel = (month: string): string => {
  const [year, m] = month.split('-');
  const date = new Date(Number(year), Number(m) - 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

export const PayrollImportPanel: React.FC = () => {
  const [stage, setStage] = useState<Stage>('UPLOAD');
  const [file, setFile] = useState<File | null>(null);
  const [month, setMonth] = useState(currentMonthValue());
  const [rows, setRows] = useState<PayrollImportRow[]>([]);
  const [summary, setSummary] = useState<PayrollImportSummary | null>(null);
  const [detectedMonth, setDetectedMonth] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage('UPLOAD');
    setFile(null);
    setRows([]);
    setSummary(null);
    setDetectedMonth(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelected = (selected: FileList | null) => {
    if (!selected || !selected[0]) return;
    setFile(selected[0]);
    setError('');
  };

  const handlePreview = async () => {
    if (!file) {
      setError('Choose an XLSX, JSON, or XML payroll export file first');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await salaryApi.previewImport(file, month);
      if (res.data) {
        setRows(res.data.rows);
        setSummary(res.data.summary);
        setDetectedMonth(res.data.detectedMonth);
        setStage('PREVIEW');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse the payroll file');
    } finally {
      setLoading(false);
    }
  };

  const runCommit = async (overwrite: boolean, acknowledgeMonthMismatch: boolean) => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const res = await salaryApi.commitImport(file, month, overwrite, acknowledgeMonthMismatch);
      if (res.data) {
        setResult(res.data);
        setStage('DONE');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import payroll data');
      setStage('PREVIEW');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClick = () => {
    if (detectedMonth && detectedMonth !== month) {
      setStage('CONFIRM_MONTH_MISMATCH');
      return;
    }
    if (summary && summary.alreadyImported > 0) {
      setStage('CONFIRM_OVERWRITE');
      return;
    }
    runCommit(false, false);
  };

  return (
    <div className="bg-white rounded-[32px] p-6 border border-orange-100/50 shadow-card">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
          <FileJson className="w-5 h-5 text-[#f46617]" />
          Import Payroll Data
        </h3>
        {stage !== 'UPLOAD' && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Start Over
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500 font-semibold mb-5">
        Upload a Tally Pay Sheet export (XLSX recommended, JSON or XML also supported) to update employee salary records. Matching is based on each employee's Tally ledger name.
      </p>

      <div className="flex items-center gap-1.5 mb-5 p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-bold">
        <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
        Salary figures are encrypted before being stored.
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3.5 mb-5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {stage === 'UPLOAD' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Payroll Month</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="px-3 py-2.5 bg-white border border-orange-100 rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
            />
          </div>

          <label className="flex items-center justify-center gap-2 px-4 py-6 rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/30 text-slate-500 text-sm font-semibold cursor-pointer hover:bg-orange-50/60 transition-all">
            <Upload className="w-4 h-4" />
            {file ? file.name : 'Click to upload a .xlsx, .json, or .xml payroll export'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.json,.xml,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/json,text/xml"
              className="hidden"
              onChange={e => handleFileSelected(e.target.files)}
            />
          </label>

          <button
            onClick={handlePreview}
            disabled={!file || loading}
            className="btn-orange px-4 py-3 text-sm font-bold rounded-2xl flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? 'Reading file...' : 'Preview Import'}
          </button>
        </div>
      )}

      {stage === 'PREVIEW' && summary && (
        <div className="space-y-4">
          {detectedMonth && detectedMonth !== month && (
            <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 text-sm font-semibold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              This file's pay period looks like <strong className="mx-1">{formatMonthLabel(detectedMonth)}</strong>, but you selected <strong className="mx-1">{formatMonthLabel(month)}</strong>. Double-check before confirming.
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
              <p className="text-2xl font-black text-slate-800">{summary.total}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Records Found</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
              <p className="text-2xl font-black text-emerald-600">{summary.matched}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mt-0.5">Matched</p>
            </div>
            <div className="p-3 rounded-2xl bg-red-50 border border-red-100 text-center">
              <p className="text-2xl font-black text-red-500">{summary.unmatched}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mt-0.5">Unmatched</p>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-100">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2.5">Ledger Name</th>
                  <th className="text-left px-3 py-2.5">Employee</th>
                  <th className="text-right px-3 py-2.5">Net Salary</th>
                  <th className="text-center px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-t border-slate-50">
                    <td className="px-3 py-2.5 font-semibold text-slate-700">{row.ledgerName}</td>
                    <td className="px-3 py-2.5 text-slate-600">{row.employeeName || '—'}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-700">
                      {row.netSalary.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {row.matched ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                          <CheckCircle className="w-3.5 h-3.5" /> Matched
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-500 font-bold">
                          <XCircle className="w-3.5 h-3.5" /> No Match
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {summary.unmatched > 0 && (
            <p className="text-[11px] text-amber-600 font-semibold leading-relaxed">
              Unmatched ledgers will be skipped. Set the correct Tally ledger name on those employees' profiles, then re-import.
            </p>
          )}

          {summary.alreadyImported > 0 && (
            <p className="text-[11px] text-red-500 font-semibold leading-relaxed">
              {summary.alreadyImported} employee(s) already have salary data for {month}. You'll be asked to confirm before overwriting.
            </p>
          )}

          <button
            onClick={handleConfirmClick}
            disabled={loading || summary.matched === 0}
            className="btn-orange px-4 py-3 text-sm font-bold rounded-2xl flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {loading ? 'Importing...' : `Confirm Import (${summary.matched})`}
          </button>
        </div>
      )}

      {stage === 'CONFIRM_MONTH_MISMATCH' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-semibold">
              This file's pay period looks like <strong>{detectedMonth && formatMonthLabel(detectedMonth)}</strong>, but you selected <strong>{formatMonthLabel(month)}</strong> as the payroll month. Are you sure you want to continue?
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStage('PREVIEW')}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 text-sm font-bold rounded-2xl transition-all"
            >
              Go Back
            </button>
            <button
              onClick={() => {
                if (summary && summary.alreadyImported > 0) {
                  setStage('CONFIRM_OVERWRITE');
                } else {
                  runCommit(false, true);
                }
              }}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {loading ? 'Importing...' : `Yes, Import as ${formatMonthLabel(month)}`}
            </button>
          </div>
        </div>
      )}

      {stage === 'CONFIRM_OVERWRITE' && summary && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-semibold">
              {summary.alreadyImported} employee(s) already have salary data for {month}. Continuing will overwrite their existing records.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStage('PREVIEW')}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 text-sm font-bold rounded-2xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => runCommit(true, Boolean(detectedMonth && detectedMonth !== month))}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {loading ? 'Overwriting...' : 'Overwrite & Import'}
            </button>
          </div>
        </div>
      )}

      {stage === 'DONE' && result && (
        <div className="text-center space-y-4 py-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
            <CheckCircle className="w-7 h-7 text-emerald-500" />
          </div>
          <p className="text-sm text-slate-600">
            Imported salary data for <span className="font-bold text-slate-800">{result.imported}</span> employee(s) for {month}.
          </p>
          {result.skipped.length > 0 && (
            <p className="text-xs text-amber-600 font-semibold">
              Skipped (no ledger match): {result.skipped.join(', ')}
            </p>
          )}
          <button
            onClick={reset}
            className="btn-orange px-4 py-3 text-sm font-bold rounded-2xl"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
};
