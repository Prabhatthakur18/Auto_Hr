import React, { useEffect, useState } from 'react';
import { History, Loader2, AlertTriangle, FileJson } from 'lucide-react';
import { salaryApi, type PayrollImportLog } from '../services/api';
import { matchesDateFilter, matchesSearch, type PageFilterState } from '../utils/pageFilters';

const formatMonth = (month: string): string => {
  const [year, m] = month.split('-');
  const date = new Date(Number(year), Number(m) - 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

export const PayrollImportHistory: React.FC<{ filters?: PageFilterState }> = ({ filters }) => {
  const [logs, setLogs] = useState<PayrollImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    salaryApi.getImportHistory()
      .then(res => { if (mounted && res.data) setLogs(res.data.logs); })
      .catch(err => { if (mounted) setError(err.message || 'Failed to load import history'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#f46617] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        {error}
      </div>
    );
  }

  const filteredLogs = filters
    ? logs.filter(log =>
        matchesSearch(filters.search, [
          formatMonth(log.month),
          log.month,
          log.fileName,
          log.totalRecords,
          log.importedCount,
          log.skippedLedgers,
          log.importedBy?.username,
          log.createdAt,
        ]) && matchesDateFilter(filters, [`${log.month}-01`, log.createdAt])
      )
    : logs;

  if (logs.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-orange-100/50 shadow-card">
        <History className="w-12 h-12 mx-auto mb-3 opacity-50 text-slate-400" />
        <p className="font-semibold">No payroll imports yet</p>
        <p className="text-xs mt-1">Imported files will show up here for audit purposes.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] border border-orange-100/50 shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="text-left px-5 py-3.5">Month</th>
              <th className="text-left px-5 py-3.5">File</th>
              <th className="text-center px-5 py-3.5">Imported</th>
              <th className="text-center px-5 py-3.5">Skipped</th>
              <th className="text-left px-5 py-3.5">Imported By</th>
              <th className="text-left px-5 py-3.5">Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id} className="border-t border-orange-100/30 hover:bg-orange-50/30 transition-colors">
                <td className="px-5 py-3.5 font-bold text-slate-800">{formatMonth(log.month)}</td>
                <td className="px-5 py-3.5 text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <FileJson className="w-3.5 h-3.5 text-slate-400" />
                    {log.fileName}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center font-bold text-emerald-600">{log.importedCount} / {log.totalRecords}</td>
                <td className="px-5 py-3.5 text-center text-slate-500" title={log.skippedLedgers || ''}>
                  {log.skippedLedgers ? log.skippedLedgers.split(',').length : 0}
                </td>
                <td className="px-5 py-3.5 text-slate-600">{log.importedBy?.username || '—'}</td>
                <td className="px-5 py-3.5 text-slate-400 text-xs font-semibold">
                  {new Date(log.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredLogs.length === 0 && (
        <div className="text-center py-10 text-slate-400 border-t border-orange-100/40">
          <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold">No payroll imports match the filters</p>
        </div>
      )}
    </div>
  );
};
