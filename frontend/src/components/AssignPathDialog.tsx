import React, { useEffect, useState } from 'react';
import { X, Loader2, Send, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { employeeApi, learningApi, type LearningPath, type Employee } from '../services/api';
import { EmployeeAvatar } from './EmployeeAvatar';

interface AssignPathDialogProps {
  path: LearningPath;
  onClose: () => void;
  onAssigned: () => void;
}

export const AssignPathDialog: React.FC<AssignPathDialogProps> = ({ path, onClose, onAssigned }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ assignedCount: number; alreadyEnrolledCount: number } | null>(null);

  useEffect(() => {
    employeeApi.list()
      .then(res => { if (res.data) setEmployees(res.data.employees); })
      .finally(() => setLoadingEmployees(false));
  }, []);

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.department && emp.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleEmployee = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAssign = async () => {
    if (selectedIds.length === 0) {
      setError('Select at least one employee');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await learningApi.assignPath(path.id, {
        employeeIds: selectedIds,
        dueDate: dueDate || undefined,
      });
      if (res.data) {
        setResult(res.data);
        onAssigned();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to assign learning path');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { if (!submitting) onClose(); }} />

      <div className="relative bg-white rounded-[32px] border border-orange-100/50 shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-orange-100/50 flex-shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-800">Assign Learning Path</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">{path.title}</p>
          </div>
          <button
            disabled={submitting}
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-orange-50 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-700">
                  Assigned to {result.assignedCount} employee{result.assignedCount !== 1 ? 's' : ''}
                </p>
                {result.alreadyEnrolledCount > 0 && (
                  <p className="text-xs text-emerald-600 mt-0.5">
                    {result.alreadyEnrolledCount} were already enrolled and skipped
                  </p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="btn-orange w-full py-2.5 text-sm font-bold rounded-xl">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Due Date (optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  disabled={submitting}
                  className="w-full text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Employees * {selectedIds.length > 0 && `(${selectedIds.length} selected)`}
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or department..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    disabled={submitting}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                  />
                </div>

                <div className="border border-orange-100 rounded-2xl max-h-64 overflow-y-auto divide-y divide-orange-100/50">
                  {loadingEmployees ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 text-[#f46617] animate-spin" />
                    </div>
                  ) : filteredEmployees.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-8">No employees found</p>
                  ) : (
                    filteredEmployees.map(emp => (
                      <label
                        key={emp.id}
                        className={`flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors ${
                          selectedIds.includes(emp.id) ? 'bg-orange-50/60' : 'hover:bg-orange-50/30'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(emp.id)}
                          onChange={() => toggleEmployee(emp.id)}
                          disabled={submitting}
                          className="w-4 h-4 rounded border-orange-200 text-[#f46617] focus:ring-brand-orange/30 accent-[#f46617] cursor-pointer bg-white"
                        />
                        <EmployeeAvatar name={emp.name} avatar={emp.avatar} gender={emp.gender} size="w-8 h-8" shape="rounded" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800 truncate">{emp.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">{emp.department || 'No department'}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-3 text-xs flex gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 p-6 border-t border-orange-100/50 bg-orange-50/10 flex-shrink-0">
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || selectedIds.length === 0}
                onClick={handleAssign}
                className="flex-1 btn-orange py-2.5 text-sm font-bold rounded-xl"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{submitting ? 'Assigning...' : 'Assign'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
