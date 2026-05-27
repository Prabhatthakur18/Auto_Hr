import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { ProfileView } from '../pages/Profile';

type Tab = 'about' | 'performance' | 'leaves' | 'attendance';

export const ProfileDrawer: React.FC<{
  employeeId: number;
  initialTab?: Tab;
  onClose: () => void;
}> = ({ employeeId, initialTab = 'about', onClose }) => {
  const [currentEmployeeId, setCurrentEmployeeId] = useState(employeeId);
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    setCurrentEmployeeId(employeeId);
  }, [employeeId]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const title = useMemo(() => {
    if (tab === 'leaves') return 'Leaves';
    if (tab === 'performance') return 'Performance';
    if (tab === 'attendance') return 'Attendance';
    return 'Profile';
  }, [tab]);

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 w-full max-w-[1000px] hr-surface shadow-3xl">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(var(--hr-border),0.9)] bg-white/60 backdrop-blur">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-rose-700/80 uppercase">{title}</p>
              <p className="text-sm text-slate-600 truncate">Employee #{currentEmployeeId}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-rose-100/70 text-slate-500 hover:text-slate-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-6">
              <ProfileView
                employeeId={currentEmployeeId}
                initialTab={tab}
                theme="light"
                onBack={onClose}
                onOpenEmployee={(id) => setCurrentEmployeeId(id)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
