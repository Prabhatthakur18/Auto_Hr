import React, { useState, useEffect, useRef } from 'react';
import {
  DollarSign,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Printer,
  X,
  FileText,
  Building2,
  User,
  Calendar,
  Briefcase,
} from 'lucide-react';
import { salaryApi, type SalaryBreakdown, type SalaryTotals, type SalarySlip } from '../../services/api';
import logoImg from '../../images/autologo-removebg-preview.png';

// ─── Format Helpers ──────────────────────────────────────────

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatMonth = (month: string): string => {
  const [year, m] = month.split('-');
  const date = new Date(Number(year), Number(m) - 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

// ─── Props ───────────────────────────────────────────────────

interface SalaryTabProps {
  employeeId: number;
  employeeName?: string;
  employeeDepartment?: string;
  employeePosition?: string;
  theme?: 'light' | 'dark';
}

// ─── Earnings / Deductions Labels ────────────────────────────

interface BreakdownEntry {
  label: string;
  key: keyof SalaryBreakdown;
  type: 'earning' | 'deduction';
}

const BREAKDOWN_FIELDS: BreakdownEntry[] = [
  { label: 'Basic Salary', key: 'basicSalary', type: 'earning' },
  { label: 'HRA', key: 'hra', type: 'earning' },
  { label: 'DA', key: 'da', type: 'earning' },
  { label: 'TA', key: 'ta', type: 'earning' },
  { label: 'Medical Allowance', key: 'medicalAllowance', type: 'earning' },
  { label: 'Special Allowance', key: 'specialAllowance', type: 'earning' },
  { label: 'PF', key: 'pf', type: 'deduction' },
  { label: 'ESI', key: 'esi', type: 'deduction' },
  { label: 'Tax / TDS', key: 'tax', type: 'deduction' },
  { label: 'Other Deductions', key: 'otherDeductions', type: 'deduction' },
];

// ─── Main Salary Tab Component ───────────────────────────────

const SalaryTab: React.FC<SalaryTabProps> = ({
  employeeId,
  employeeName,
  employeeDepartment,
  employeePosition,
  theme = 'light',
}) => {
  const [breakdowns, setBreakdowns] = useState<SalaryBreakdown[]>([]);
  const [totals, setTotals] = useState<SalaryTotals | null>(null);
  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlip, setSelectedSlip] = useState<SalarySlip | null>(null);

  useEffect(() => {
    loadSalaryData();
  }, [employeeId]);

  const loadSalaryData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [breakdownRes, slipsRes] = await Promise.allSettled([
        salaryApi.getMyBreakdown(),
        salaryApi.getMySlips(),
      ]);

      if (breakdownRes.status === 'fulfilled' && breakdownRes.value.data) {
        setBreakdowns(breakdownRes.value.data.breakdowns);
        setTotals(breakdownRes.value.data.totals);
      }
      if (slipsRes.status === 'fulfilled' && slipsRes.value.data) {
        setSlips(slipsRes.value.data.slips);
      }
    } catch (err) {
      console.error('Failed to load salary data:', err);
      setError('Could not load salary information. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const latest = breakdowns[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-[#f46617] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Breakdown */}
      {latest && totals ? (
        <div className="bg-white rounded-[28px] border border-orange-100/60 shadow-card overflow-hidden">
          <div className="p-5 border-b border-orange-100/40">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#f46617]" />
              Current Salary Breakdown
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Effective {new Date(latest.effectiveFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Earnings */}
              <div>
                <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Earnings
                </h4>
                <div className="space-y-2">
                  {BREAKDOWN_FIELDS.filter(f => f.type === 'earning').map(field => {
                    const value = Number(latest[field.key]) || 0;
                    return (
                      <div key={field.key} className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 font-medium">{field.label}</span>
                        <span className="font-bold text-slate-800">{formatCurrency(value)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-700">Gross Salary</span>
                  <span className="font-black text-slate-800">{formatCurrency(totals.grossSalary)}</span>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h4 className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Deductions
                </h4>
                <div className="space-y-2">
                  {BREAKDOWN_FIELDS.filter(f => f.type === 'deduction').map(field => {
                    const value = Number(latest[field.key]) || 0;
                    return (
                      <div key={field.key} className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 font-medium">{field.label}</span>
                        <span className="font-bold text-slate-800">{formatCurrency(value)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-700">Total Deductions</span>
                  <span className="font-black text-red-600">{formatCurrency(totals.totalDeductions)}</span>
                </div>
              </div>
            </div>

            {/* Net Payable */}
            <div className="mt-6 pt-4 border-t-2 border-orange-100 rounded-b-[28px] bg-gradient-to-r from-orange-50/40 to-amber-50/40 -mx-5 -mb-5 px-5 pb-5">
              <div className="flex justify-between items-center">
                <span className="text-base font-black text-slate-800">Net Payable</span>
                <span className="text-xl font-black text-[#f46617]">{formatCurrency(totals.netSalary)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[28px] border border-orange-100/60 shadow-card p-8 text-center">
          <DollarSign className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">No salary breakdown configured yet</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
            Speak to HR to set up your salary structure
          </p>
        </div>
      )}

      {/* Past Payslips */}
      <div className="bg-white rounded-[28px] border border-orange-100/60 shadow-card overflow-hidden">
        <div className="p-5 border-b border-orange-100/40">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#f46617]" />
            Past Payslips
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            {slips.length} {slips.length === 1 ? 'slip' : 'slips'} available
          </p>
        </div>

        {slips.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-400">No payslips generated yet</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
              Payslips appear after salary processing
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {slips.map(slip => (
              <div
                key={slip.id}
                className="flex items-center justify-between p-4 rounded-2xl border border-orange-100/40 hover:border-brand-orange/30 hover:shadow-sm transition-all cursor-pointer bg-white"
                onClick={() => setSelectedSlip(slip)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{formatMonth(slip.month)}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {slip.workingDays} working days · {slip.daysPresent} present
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-800">{formatCurrency(slip.netSalary)}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">Net</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payslip Modal */}
      {selectedSlip && (
        <PayslipModal
          slip={selectedSlip}
          employeeName={employeeName || ''}
          employeeDepartment={employeeDepartment || ''}
          employeePosition={employeePosition || ''}
          onClose={() => setSelectedSlip(null)}
        />
      )}
    </div>
  );
};

// ─── Payslip Modal (Print-Ready) ─────────────────────────────

interface PayslipModalProps {
  slip: SalarySlip;
  employeeName: string;
  employeeDepartment: string;
  employeePosition: string;
  onClose: () => void;
}

const PayslipModal: React.FC<PayslipModalProps> = ({
  slip,
  employeeName,
  employeeDepartment,
  employeePosition,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const content = printRef.current?.innerHTML || '';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Slip - ${formatMonth(slip.month)}</title>
        <style>
          @page { margin: 15mm; size: A4; }
          body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1e293b; }
          .payslip { max-width: 800px; margin: 0 auto; border: 2px solid #e2e8f0; border-radius: 16px; padding: 32px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f46617; padding-bottom: 16px; margin-bottom: 24px; }
          .header-left { display: flex; align-items: center; gap: 12px; }
          .header-left h1 { font-size: 18px; font-weight: 900; margin: 0; }
          .header-left p { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 2px 0 0; }
          .header-right { text-align: right; }
          .header-right h2 { font-size: 14px; font-weight: 900; margin: 0; }
          .header-right p { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; margin: 2px 0 0; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 32px; background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 24px; font-size: 13px; }
          .info-grid .label { color: #64748b; font-weight: 600; }
          .info-grid .value { font-weight: 700; text-align: right; }
          .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
          .col { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
          .col h3 { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px; }
          .col h3.earnings { color: #059669; }
          .col h3.deductions { color: #dc2626; }
          .row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
          .row .lbl { color: #475569; font-weight: 500; }
          .row .val { font-weight: 700; }
          .total-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 800; padding: 8px 0 0; margin-top: 8px; border-top: 1px solid #e2e8f0; }
          .net-section { background: linear-gradient(to right, #fff7ed, #fffbeb); border-top: 2px solid #f46617; margin: 0 -32px -32px; padding: 20px 32px; border-radius: 0 0 14px; display: flex; justify-content: space-between; align-items: center; }
          .net-section .label { font-size: 16px; font-weight: 900; }
          .net-section .value { font-size: 20px; font-weight: 900; color: #f46617; }
          .footer { text-align: center; font-size: 10px; color: #94a3b8; font-weight: 600; margin-top: 20px; }
        </style>
      </head>
      <body>
        ${content}
        <script>
          window.onload = function() { window.print(); window.close(); };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const breakdown: Record<string, number> = slip.breakdownJson || {};

  const earningsTotal = BREAKDOWN_FIELDS
    .filter(f => f.type === 'earning')
    .reduce((sum, f) => sum + (Number(breakdown[f.key]) || 0), 0);

  const deductionsTotal = BREAKDOWN_FIELDS
    .filter(f => f.type === 'deduction')
    .reduce((sum, f) => sum + (Number(breakdown[f.key]) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-[32px] border border-orange-100/60 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scale-in flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-orange-100/40 flex-shrink-0">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#f46617]" />
            Payslip — {formatMonth(slip.month)}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-[#f46617] hover:bg-orange-600 text-white rounded-xl transition-all shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-orange-50 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Payslip Content */}
        <div className="flex-1 overflow-y-auto p-6" ref={printRef}>
          <div className="payslip-container max-w-[700px] mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-[#f46617] pb-4 mb-6">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="Logo" className="h-10 w-auto" />
                <div>
                  <h1 className="text-lg font-black text-slate-800 leading-tight">AUTOFORM INDIA</h1>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Salary Slip</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-black text-slate-800">{formatMonth(slip.month)}</h2>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Payslip</p>
              </div>
            </div>

            {/* Employee Info */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 bg-slate-50 p-4 rounded-2xl mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold text-xs">Name</span>
                <span className="font-bold text-slate-800 text-xs">{employeeName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold text-xs">Department</span>
                <span className="font-bold text-slate-800 text-xs">{employeeDepartment || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold text-xs">Designation</span>
                <span className="font-bold text-slate-800 text-xs">{employeePosition || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold text-xs">Days Present</span>
                <span className="font-bold text-slate-800 text-xs">{slip.daysPresent} / {slip.workingDays}</span>
              </div>
            </div>

            {/* Earnings & Deductions Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Earnings */}
              <div className="border border-slate-200 rounded-2xl p-4">
                <h3 className="text-[11px] font-black text-emerald-600 uppercase tracking-wider mb-3">Earnings</h3>
                <div className="space-y-1.5">
                  {BREAKDOWN_FIELDS.filter(f => f.type === 'earning').map(field => {
                    const value = Number(breakdown[field.key]) || 0;
                    return (
                      <div key={field.key} className="flex justify-between text-sm">
                        <span className="text-slate-600 font-medium">{field.label}</span>
                        <span className="font-bold text-slate-800">{formatCurrency(value)}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between text-sm font-bold pt-2 mt-2 border-t border-slate-100">
                    <span className="text-slate-700">Gross</span>
                    <span className="text-slate-800">{formatCurrency(slip.grossSalary)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="border border-slate-200 rounded-2xl p-4">
                <h3 className="text-[11px] font-black text-red-500 uppercase tracking-wider mb-3">Deductions</h3>
                <div className="space-y-1.5">
                  {BREAKDOWN_FIELDS.filter(f => f.type === 'deduction').map(field => {
                    const value = Number(breakdown[field.key]) || 0;
                    return (
                      <div key={field.key} className="flex justify-between text-sm">
                        <span className="text-slate-600 font-medium">{field.label}</span>
                        <span className="font-bold text-slate-800">{formatCurrency(value)}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between text-sm font-bold pt-2 mt-2 border-t border-slate-100">
                    <span className="text-slate-700">Total Deductions</span>
                    <span className="text-red-600">{formatCurrency(slip.totalDeductions)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Payable */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-t-2 border-[#f46617] -mx-6 -mb-6 px-6 py-5 rounded-b-[31px]">
              <div className="flex justify-between items-center">
                <span className="text-base font-black text-slate-800">Net Payable</span>
                <span className="text-xl font-black text-[#f46617]">{formatCurrency(slip.netSalary)}</span>
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-4">
              This is a computer-generated slip
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalaryTab;
