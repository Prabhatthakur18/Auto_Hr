import React, { useState } from 'react';
import { CreditCard, Pencil, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { employeeApi, type EmployeeDetail } from '../services/api';

interface PayrollDetailsCardProps {
  employee: EmployeeDetail;
  canEdit: boolean;
  onSaved: () => void;
}

const FIELDS: { key: keyof PayrollFormState; label: string; placeholder: string }[] = [
  { key: 'employeeNumber', label: 'Employee Number', placeholder: 'e.g. Afac10375' },
  { key: 'taxRegime', label: 'Tax Regime', placeholder: 'e.g. Regular Tax Regime' },
  { key: 'panNumber', label: 'PAN Number', placeholder: 'e.g. IRLPK0350R' },
  { key: 'uanNumber', label: 'UAN Number', placeholder: 'Universal Account Number' },
  { key: 'pfAccountNumber', label: 'PF Account Number', placeholder: 'e.g. 1021632' },
  { key: 'esiNumber', label: 'ESI Number', placeholder: 'ESI account number' },
  { key: 'pranNumber', label: 'PR Account Number (PRAN)', placeholder: 'Pension Account Number' },
  { key: 'bankAccountNumber', label: 'Bank Account Number', placeholder: 'Account number' },
  { key: 'bankIfscCode', label: 'IFSC Code', placeholder: 'e.g. HDFC0001234' },
  { key: 'bankBranch', label: 'Bank Branch', placeholder: 'Branch name' },
];

interface PayrollFormState {
  employeeNumber: string;
  panNumber: string;
  uanNumber: string;
  pfAccountNumber: string;
  esiNumber: string;
  pranNumber: string;
  taxRegime: string;
  bankAccountNumber: string;
  bankIfscCode: string;
  bankBranch: string;
}

export const PayrollDetailsCard: React.FC<PayrollDetailsCardProps> = ({ employee, canEdit, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<PayrollFormState>({
    employeeNumber: employee.employeeNumber || '',
    panNumber: employee.panNumber || '',
    uanNumber: employee.uanNumber || '',
    pfAccountNumber: employee.pfAccountNumber || '',
    esiNumber: employee.esiNumber || '',
    pranNumber: employee.pranNumber || '',
    taxRegime: employee.taxRegime || '',
    bankAccountNumber: employee.bankAccountNumber || '',
    bankIfscCode: employee.bankIfscCode || '',
    bankBranch: employee.bankBranch || '',
  });

  const startEditing = () => {
    setForm({
      employeeNumber: employee.employeeNumber || '',
      panNumber: employee.panNumber || '',
      uanNumber: employee.uanNumber || '',
      pfAccountNumber: employee.pfAccountNumber || '',
      esiNumber: employee.esiNumber || '',
      pranNumber: employee.pranNumber || '',
      taxRegime: employee.taxRegime || '',
      bankAccountNumber: employee.bankAccountNumber || '',
      bankIfscCode: employee.bankIfscCode || '',
      bankBranch: employee.bankBranch || '',
    });
    setError('');
    setEditing(true);
  };

  const handleSave = async () => {
    setSubmitting(true);
    setError('');
    try {
      await employeeApi.updatePayrollDetails(employee.id, {
        employeeNumber: form.employeeNumber.trim() || null,
        panNumber: form.panNumber.trim() || null,
        uanNumber: form.uanNumber.trim() || null,
        pfAccountNumber: form.pfAccountNumber.trim() || null,
        esiNumber: form.esiNumber.trim() || null,
        pranNumber: form.pranNumber.trim() || null,
        taxRegime: form.taxRegime.trim() || null,
        bankAccountNumber: form.bankAccountNumber.trim() || null,
        bankIfscCode: form.bankIfscCode.trim().toUpperCase() || null,
        bankBranch: form.bankBranch.trim() || null,
      });
      setEditing(false);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save payroll details');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-orange-100/50 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-850 font-black text-sm flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#f46617]" />
          Payroll & Statutory Details
        </h3>
        {canEdit && !editing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-1.5 text-xs font-bold text-[#f46617] hover:text-orange-600 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        )}
      </div>

      <p className="text-[10px] text-slate-400 font-semibold mb-4">
        These fields are optional and can be filled in by you or HR — used for payslip generation.
      </p>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FIELDS.map(f => (
              <div key={f.key}>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{f.label}</label>
                <input
                  type="text"
                  value={form[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  disabled={submitting}
                  placeholder={f.placeholder}
                  className="w-full bg-white text-slate-800 text-sm rounded-xl px-3.5 py-2.5 border border-orange-100 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all placeholder-slate-400"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditing(false)}
              disabled={submitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 text-xs font-bold rounded-2xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={submitting}
              className="btn-orange px-4 py-2 text-xs font-bold rounded-2xl flex items-center gap-1.5"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FIELDS.map(f => (
            <div key={f.key}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{f.label}</p>
              <p className="text-sm text-slate-800 font-black tracking-tight">{employee[f.key] || '—'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
