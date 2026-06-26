import React, { useEffect, useState } from 'react';
import { Award, Plus, Loader2, Trash2 } from 'lucide-react';
import { badgeApi, type Badge, type UserRole } from '../services/api';
import { BadgeComposer } from './BadgeComposer';
import { resolveBadgeIcon } from '../utils/badgeIcons';
import { matchesDateFilter, matchesSearch, type PageFilterState } from '../utils/pageFilters';

interface BadgeCatalogPanelProps {
  role: UserRole;
  filters?: PageFilterState;
}

const CRITERIA_DESCRIPTION: Record<Badge['criteriaType'], (b: Badge) => string> = {
  QUIZ_GRADE: (b) => `Earned at the "${b.criteriaLabel}" grade tier on any quiz`,
  PERFECT_SCORE: () => 'Earned on any 100% quiz score',
  COURSE_COMPLETION_COUNT: (b) => `Earned after completing ${b.criteriaValue} courses`,
  PATH_COMPLETION_COUNT: (b) => `Earned after completing ${b.criteriaValue} learning paths`,
  MODULE_COMPLETION_COUNT: (b) => `Earned after completing ${b.criteriaValue} modules`,
};

export const BadgeCatalogPanel: React.FC<BadgeCatalogPanelProps> = ({ role, filters }) => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const isHR = role === 'HR';

  const loadAll = () => {
    setLoading(true);
    badgeApi.listBadges()
      .then(res => { if (res.data) setBadges(res.data.badges); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Remove this badge? Employees who already earned it keep it on their record.')) return;
    setDeletingId(id);
    try {
      await badgeApi.deleteBadge(id);
      loadAll();
    } catch {
      // non-critical
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#f46617] animate-spin" />
      </div>
    );
  }

  const filteredBadges = filters
    ? badges.filter(badge =>
        matchesSearch(filters.search, [
          badge.name,
          badge.description,
          badge.iconKey,
          badge.criteriaType,
          badge.criteriaValue,
          badge.criteriaLabel,
          CRITERIA_DESCRIPTION[badge.criteriaType](badge),
          badge.createdBy?.username,
        ]) && matchesDateFilter(filters, [badge.createdAt])
      )
    : badges;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Badges earnable through quiz performance and course completion</p>
        {isHR && (
          <button onClick={() => setShowComposer(true)} className="btn-orange px-4 py-2.5 text-xs font-bold rounded-2xl">
            <Plus className="w-4 h-4" /> New Badge
          </button>
        )}
      </div>

      {badges.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-orange-100/50 shadow-card">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-50 text-slate-400" />
          <p className="font-semibold">No badges defined yet</p>
          {isHR && <p className="text-xs mt-1">Click "New Badge" to create the first one.</p>}
        </div>
      ) : filteredBadges.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-orange-100/50 shadow-card">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-50 text-slate-400" />
          <p className="font-semibold">No badges match the filters</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBadges.map(badge => {
            const Icon = resolveBadgeIcon(badge.iconKey);
            return (
              <div key={badge.id} className="bg-white rounded-[24px] border border-orange-100/50 shadow-sm p-5 flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-[#f46617]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{badge.name}</p>
                  {badge.description && <p className="text-xs text-slate-500 mt-0.5">{badge.description}</p>}
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">{CRITERIA_DESCRIPTION[badge.criteriaType](badge)}</p>
                </div>
                {isHR && (
                  <button
                    onClick={() => handleDelete(badge.id)}
                    disabled={deletingId === badge.id}
                    className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    {deletingId === badge.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showComposer && (
        <BadgeComposer
          onClose={() => setShowComposer(false)}
          onSaved={() => { setShowComposer(false); loadAll(); }}
        />
      )}
    </div>
  );
};
