import React from 'react';
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { type Leave } from '../../services/api';

interface LeavesTabProps {
  leaves: Leave[];
  isHR: boolean;
  onRefresh: () => void;
}

const statusConfig = {
  APPROVED: { label: 'Approved', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: CheckCircle, iconColor: 'text-emerald-400' },
  REJECTED: { label: 'Rejected', color: 'bg-red-500/15 text-red-400 border-red-500/20', icon: XCircle, iconColor: 'text-red-400' },
  PENDING:  { label: 'Pending',  color: 'bg-amber-500/15 text-amber-400 border-amber-500/20',   icon: Clock,      iconColor: 'text-amber-400'   },
};

const LeavesTab: React.FC<LeavesTabProps> = ({ leaves }) => {
  const pending  = leaves.filter(l => l.status === 'PENDING').length;
  const rejected = leaves.filter(l => l.status === 'REJECTED').length;
  const totalDays = leaves.filter(l => l.status === 'APPROVED').reduce((s, l) => s + l.days, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: leaves.length, color: 'text-white' },
          { label: 'Approved Days',  value: totalDays,      color: 'text-emerald-400' },
          { label: 'Pending',        value: pending,        color: 'text-amber-400' },
          { label: 'Rejected',       value: rejected,       color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700/50 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Leave List */}
      {leaves.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No leave records</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaves.map(leave => {
            const cfg = statusConfig[leave.status];
            const Icon = cfg.icon;
            return (
              <div key={leave.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700/50 flex items-center gap-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  leave.status === 'APPROVED' ? 'bg-emerald-500/15' :
                  leave.status === 'REJECTED' ? 'bg-red-500/15' : 'bg-amber-500/15'
                }`}>
                  <Icon className={`w-4.5 h-4.5 ${cfg.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{leave.type}</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {new Date(leave.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' → '}
                    {new Date(leave.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}
                    {leave.days} day{leave.days !== 1 ? 's' : ''}
                  </p>
                  {leave.reason && <p className="text-slate-500 text-xs mt-0.5 truncate">{leave.reason}</p>}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LeavesTab;