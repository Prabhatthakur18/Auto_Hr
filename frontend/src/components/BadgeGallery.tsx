import React, { useEffect, useState } from 'react';
import { Award, Loader2 } from 'lucide-react';
import { badgeApi, type EmployeeBadge } from '../services/api';
import { resolveBadgeIcon } from '../utils/badgeIcons';

interface BadgeGalleryProps {
  employeeId: number;
}

export const BadgeGallery: React.FC<BadgeGalleryProps> = ({ employeeId }) => {
  const [earned, setEarned] = useState<EmployeeBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    badgeApi.getEmployeeBadges(employeeId)
      .then(res => { if (res.data) setEarned(res.data.earned); })
      .finally(() => setLoading(false));
  }, [employeeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-[#f46617] animate-spin" />
      </div>
    );
  }

  if (earned.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 bg-white rounded-[24px] border border-orange-100/50 shadow-card">
        <Award className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm font-semibold">No badges earned yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {earned.map(eb => {
        const Icon = resolveBadgeIcon(eb.badge.iconKey);
        return (
          <div
            key={eb.id}
            title={eb.badge.description || eb.badge.name}
            className="bg-white rounded-[20px] border border-orange-100/50 shadow-card p-4 flex flex-col items-center text-center gap-2"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
              <Icon className="w-6 h-6 text-[#f46617]" />
            </div>
            <p className="text-xs font-bold text-slate-800 leading-tight">{eb.badge.name}</p>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              {new Date(eb.earnedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        );
      })}
    </div>
  );
};
