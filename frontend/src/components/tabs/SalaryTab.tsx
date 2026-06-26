import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  DollarSign,
  Loader2,
  AlertCircle,
  Download,
  X,
  FileText,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  salaryApi,
  employeeApi,
  type SalaryBreakdown,
  type SalaryTotals,
  type SalarySlip,
  type SalaryLineItem,
  type EmployeeDetail,
} from '../../services/api';
import logoImg from '../../images/amato-new-logo-black.png';
import { matchesDateFilter, matchesSearch, type PageFilterState } from '../../utils/pageFilters';

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

const numberToIndianWords = (value: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const belowThousand = (amount: number): string => {
    const parts: string[] = [];
    if (amount >= 100) {
      parts.push(`${ones[Math.floor(amount / 100)]} Hundred`);
      amount %= 100;
    }
    if (amount >= 20) {
      parts.push(tens[Math.floor(amount / 10)]);
      amount %= 10;
    }
    if (amount > 0) parts.push(ones[amount]);
    return parts.join(' ');
  };

  const amount = Math.max(0, Math.round(Number(value)));
  if (amount === 0) return 'Zero Rupees Only';
  let remainder = amount;
  const words: string[] = [];
  [
    { divisor: 10000000, label: 'Crore' },
    { divisor: 100000, label: 'Lakh' },
    { divisor: 1000, label: 'Thousand' },
  ].forEach(({ divisor, label }) => {
    const count = Math.floor(remainder / divisor);
    if (count > 0) {
      words.push(`${belowThousand(count)} ${label}`);
      remainder %= divisor;
    }
  });
  if (remainder > 0) words.push(belowThousand(remainder));
  return `${words.join(' ')} Rupees Only`;
};

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

/**
 * Normalizes a slip's breakdownJson into {earnings, deductions} line-item
 * arrays. Older slips (generated before dynamic line items) stored a flat
 * fixed-key object instead — fall back to label-mapping those keys so old
 * data still renders correctly.
 */
const LEGACY_EARNING_LABELS: Record<string, string> = {
  basicSalary: 'Basic Salary',
  hra: 'HRA',
  da: 'DA',
  ta: 'TA',
  medicalAllowance: 'Medical Allowance',
  specialAllowance: 'Special Allowance',
};
const LEGACY_DEDUCTION_LABELS: Record<string, string> = {
  pf: 'PF',
  esi: 'ESI',
  tax: 'Tax / TDS',
  otherDeductions: 'Other Deductions',
};

function normalizeBreakdown(raw: SalarySlip['breakdownJson']): { earnings: SalaryLineItem[]; deductions: SalaryLineItem[] } {
  if (!raw) return { earnings: [], deductions: [] };

  if (Array.isArray((raw as any).earnings) || Array.isArray((raw as any).deductions)) {
    return {
      earnings: (raw as any).earnings ?? [],
      deductions: (raw as any).deductions ?? [],
    };
  }

  const legacy = raw as Record<string, number>;
  const earnings = Object.entries(LEGACY_EARNING_LABELS)
    .filter(([key]) => Number(legacy[key]) > 0)
    .map(([key, label]) => ({ label, amount: Number(legacy[key]) }));
  const deductions = Object.entries(LEGACY_DEDUCTION_LABELS)
    .filter(([key]) => Number(legacy[key]) > 0)
    .map(([key, label]) => ({ label, amount: Number(legacy[key]) }));

  return { earnings, deductions };
}

const normalizeSalaryLabel = (label: string): string => {
  return label.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const EARNING_DISPLAY_ORDER: Record<string, number> = {
  basicsalary: 1,
  hra: 2,
  conveyanceallowance: 3,
  conveyanceallowances: 3,
  otherallowance: 4,
  otherallowances: 4,
};

const sortEarningsForPayslip = (earnings: SalaryLineItem[]): SalaryLineItem[] => {
  return earnings
    .map((earning, index) => ({ earning, index }))
    .sort((a, b) => {
      const aOrder = EARNING_DISPLAY_ORDER[normalizeSalaryLabel(a.earning.label)] ?? 99;
      const bOrder = EARNING_DISPLAY_ORDER[normalizeSalaryLabel(b.earning.label)] ?? 99;
      return aOrder - bOrder || a.index - b.index;
    })
    .map(({ earning }) => earning);
};

// ─── Props ───────────────────────────────────────────────────

interface SalaryTabProps {
  employeeId: number;
  employeeName?: string;
  employeeDepartment?: string;
  employeePosition?: string;
  theme?: 'light' | 'dark';
  filters?: PageFilterState;
}

// ─── Main Salary Tab Component ───────────────────────────────

const SalaryTab: React.FC<SalaryTabProps> = ({
  employeeId,
  employeeName,
  employeeDepartment,
  employeePosition,
  filters,
}) => {
  const [breakdowns, setBreakdowns] = useState<SalaryBreakdown[]>([]);
  const [totals, setTotals] = useState<SalaryTotals | null>(null);
  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
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
      const [breakdownRes, slipsRes, employeeRes] = await Promise.allSettled([
        salaryApi.getMyBreakdown(),
        salaryApi.getMySlips(),
        employeeApi.get(employeeId),
      ]);

      if (breakdownRes.status === 'fulfilled' && breakdownRes.value.data) {
        setBreakdowns(breakdownRes.value.data.breakdowns);
        setTotals(breakdownRes.value.data.totals);
      }
      if (slipsRes.status === 'fulfilled' && slipsRes.value.data) {
        setSlips(slipsRes.value.data.slips);
      }
      if (employeeRes.status === 'fulfilled' && employeeRes.value.data) {
        setEmployee(employeeRes.value.data.employee);
      }
    } catch (err) {
      console.error('Failed to load salary data:', err);
      setError('Could not load salary information. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const latest = breakdowns[0];
  const filteredSlips = filters
    ? slips.filter(slip =>
        matchesSearch(filters.search, [
          formatMonth(slip.month),
          slip.month,
          slip.grossSalary,
          slip.totalDeductions,
          slip.netSalary,
          slip.workingDays,
          slip.daysPresent,
          slip.generatedAt,
          employeeName,
          employee?.name,
          employeeDepartment,
          employeePosition,
        ]) && matchesDateFilter(filters, [`${slip.month}-01`, slip.generatedAt])
      )
    : slips;

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
                  {([
                    ['Basic Salary', latest.basicSalary],
                    ['HRA', latest.hra],
                    ['DA', latest.da],
                    ['TA', latest.ta],
                    ['Medical Allowance', latest.medicalAllowance],
                    ['Special Allowance', latest.specialAllowance],
                  ] as [string, number][]).filter(([, v]) => Number(v) > 0).map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center text-sm">
                      <span className="text-slate-600 font-medium">{label}</span>
                      <span className="font-bold text-slate-800">{formatCurrency(Number(value))}</span>
                    </div>
                  ))}
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
                  {([
                    ['PF', latest.pf],
                    ['ESI', latest.esi],
                    ['Tax / TDS', latest.tax],
                    ['Other Deductions', latest.otherDeductions],
                  ] as [string, number][]).filter(([, v]) => Number(v) > 0).map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center text-sm">
                      <span className="text-slate-600 font-medium">{label}</span>
                      <span className="font-bold text-slate-800">{formatCurrency(Number(value))}</span>
                    </div>
                  ))}
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
            {filteredSlips.length} of {slips.length} {slips.length === 1 ? 'slip' : 'slips'} available
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
        ) : filteredSlips.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-400">No payslips match the filters</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {filteredSlips.map(slip => (
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
          employeeName={employeeName || employee?.name || ''}
          employeeDepartment={employeeDepartment || employee?.department || ''}
          employeePosition={employeePosition || employee?.position || ''}
          employee={employee}
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
  employee: EmployeeDetail | null;
  onClose: () => void;
}

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="grid grid-cols-[124px_8px_1fr]">
    <span>{label}</span>
    <span>:</span>
    <span className="font-medium">{value || '-'}</span>
  </div>
);

const ProfessionalPayslip: React.FC<Omit<PayslipModalProps, 'onClose'> & { printRef: React.RefObject<HTMLDivElement> }> = ({
  slip,
  employeeName,
  employeeDepartment,
  employeePosition,
  employee,
  printRef,
}) => {
  const breakdown = normalizeBreakdown(slip.breakdownJson);
  const earnings = sortEarningsForPayslip(breakdown.earnings);
  const rowCount = Math.max(earnings.length, breakdown.deductions.length, 1);

  return (
    <div ref={printRef} className="payslip-container mx-auto max-w-[760px] bg-white px-7 py-6 font-sans text-black shadow-sm">
      <header className="relative min-h-[112px] border-b border-black pb-3 text-center">
        <img src={logoImg} alt="AFAC India" className="absolute left-0 top-1 h-[54px] w-[120px] object-contain" />
        <div className="px-28 text-[11px] leading-[1.45]">
          <h1 className="text-[16px] font-bold leading-tight">AMATO AUTOMOTIVE PRIVATE LIMITED</h1>
          <p>D-135, SECTOR-63, NOIDA, GAUTAM BUDDHA NAGAR</p>
          <p>UTTAR PRADESH-201301 INDIA</p>
          <p>Contact : 7217045485</p>
          <p>E-Mail : gauravaccounts@autoformindia.com</p>
          <div className="inline-flex flex-col items-center">
            <span>www.autoformindia.com/amatoautomotive.co.in</span>
            <span className="mt-1.5 block h-px w-full bg-black" />
          </div>
        </div>
      </header>

      <section className="py-2 text-center leading-tight">
        <h2 className="inline-flex flex-col items-center text-[15px] font-bold leading-tight">
          <span>Pay Slip</span>
          <span className="mt-1.5 block h-px w-full bg-black" />
        </h2>
        <p className="text-[11px]">for {formatMonth(slip.month)}</p>
        <p className="mt-1 text-[14px] font-bold uppercase">{employeeName || '-'}</p>
      </section>

      <section className="grid grid-cols-2 gap-x-8 border-b border-black pb-4 text-[10px] leading-[1.55]">
        <div>
          <DetailRow label="Employee Number" value={employee?.employeeNumber} />
          <DetailRow label="Department" value={employeeDepartment} />
          <DetailRow label="Designation" value={employeePosition} />
          <DetailRow label="Location" value="Noida" />
          <DetailRow label="Bank Account No." value={employee?.bankAccountNumber} />
          <DetailRow label="IFSC Code" value={employee?.bankIfscCode} />
          <DetailRow label="Bank Branch" value={employee?.bankBranch} />
          <DetailRow label="Date of Joining" value={formatDate(employee?.joinDate)} />
        </div>
        <div>
          <DetailRow label="Tax Regime" value={employee?.taxRegime} />
          <DetailRow label="PAN" value={employee?.panNumber} />
          <DetailRow label="UAN" value={employee?.uanNumber} />
          <DetailRow label="PF Account Number" value={employee?.pfAccountNumber} />
          <DetailRow label="ESI Number" value={employee?.esiNumber} />
          <DetailRow label="PRAN" value={employee?.pranNumber} />
          <DetailRow label="Working Days" value={slip.workingDays} />
          <DetailRow label="Days Present" value={slip.daysPresent} />
        </div>
      </section>

      <div className="mt-5 grid grid-cols-[38%_12%_38%_12%] border-l border-t border-black text-[10px] leading-4">
        <div className="border-b border-r border-black px-1.5 py-1.5 font-bold">Earnings</div>
        <div className="border-b border-r border-black px-1.5 py-1.5 text-right font-bold">Amount</div>
        <div className="border-b border-r border-black px-1.5 py-1.5 font-bold">Deductions</div>
        <div className="border-b border-r border-black px-1.5 py-1.5 text-right font-bold">Amount</div>

        {Array.from({ length: rowCount }).map((_, index) => {
          const earning = earnings[index];
          const deduction = breakdown.deductions[index];
          return (
            <React.Fragment key={index}>
              <div className="border-r border-black px-1.5 py-1.5">{earning?.label || ''}</div>
              <div className="border-r border-black px-1.5 py-1.5 text-right">{earning ? formatCurrency(earning.amount) : ''}</div>
              <div className="border-r border-black px-1.5 py-1.5">{deduction?.label || ''}</div>
              <div className="border-r border-black px-1.5 py-1.5 text-right">{deduction ? formatCurrency(deduction.amount) : ''}</div>
            </React.Fragment>
          );
        })}

        <div className="border-b border-r border-t border-black px-1.5 py-1.5 font-bold">Total Earnings</div>
        <div className="border-b border-r border-t border-black px-1.5 py-1.5 text-right font-bold">{formatCurrency(slip.grossSalary)}</div>
        <div className="border-b border-r border-t border-black px-1.5 py-1.5 font-bold">Total Deductions</div>
        <div className="border-b border-r border-t border-black px-1.5 py-1.5 text-right font-bold">{formatCurrency(slip.totalDeductions)}</div>
        <div className="col-span-2 border-b border-r border-black px-1.5 py-1.5"></div>
        <div className="border-b border-r border-black px-1.5 py-1.5 font-bold">Net Amount</div>
        <div className="border-b border-r border-black px-1.5 py-1.5 text-right font-bold">{formatCurrency(slip.netSalary)}</div>
      </div>

      <section className="mt-2 text-[10px] leading-relaxed">
        <p className="font-semibold">Amount (in words):</p>
        <p className="font-medium">INR {numberToIndianWords(Number(slip.netSalary))}</p>
      </section>
      <footer className="mt-5 text-center text-[10px] font-medium">This is a Computer Generated Pay Slip</footer>
    </div>
  );
};

const PayslipModal: React.FC<PayslipModalProps> = ({
  slip,
  employeeName,
  employeeDepartment,
  employeePosition,
  employee,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      await document.fonts.ready;
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const scale = Math.min(
        (pageWidth - margin * 2) / canvas.width,
        (pageHeight - margin * 2) / canvas.height,
      );
      const imgWidth = canvas.width * scale;
      const imgHeight = canvas.height * scale;

      pdf.addImage(imgData, 'PNG', (pageWidth - imgWidth) / 2, margin, imgWidth, imgHeight);
      pdf.save(`Salary Slip - ${formatMonth(slip.month)}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

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
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-[#f46617] hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl transition-all shadow-sm"
            >
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {downloading ? 'Generating...' : 'Download PDF'}
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
        <div className="flex-1 overflow-y-auto bg-slate-100 p-5">
          <ProfessionalPayslip
            slip={slip}
            employeeName={employeeName}
            employeeDepartment={employeeDepartment}
            employeePosition={employeePosition}
            employee={employee}
            printRef={printRef}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SalaryTab;
