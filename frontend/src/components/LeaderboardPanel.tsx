import React, { useEffect, useState } from 'react';
import { Trophy, Loader2, Lock } from 'lucide-react';
import { learningApi, type LeaderboardResponse } from '../services/api';
import { EmployeeAvatar } from './EmployeeAvatar';

interface LeaderboardPanelProps {
  courseId: number;
}

const RANK_BADGE: Record<number, string> = {
  1: 'bg-amber-100 text-amber-700 border-amber-200',
  2: 'bg-slate-100 text-slate-600 border-slate-200',
  3: 'bg-orange-100 text-orange-600 border-orange-200',
};

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({ courseId }) => {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    learningApi.getLeaderboard(courseId)
      .then(res => { if (res.data) setData(res.data); })
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-[#f46617] animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white rounded-[24px] border border-orange-100/50 shadow-sm p-5 space-y-4">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-500" /> Leaderboard
      </h3>

      {data.suppressed ? (
        <div className="text-center py-6">
          <Lock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-semibold">Not enough attempts yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Ranking unlocks once {data.minCohortSize} people have attempted the quiz ({data.cohortSize} so far).
          </p>
          {data.myScore !== null && (
            <p className="text-xs text-slate-500 font-semibold mt-3">Your score: {Math.round(data.myScore)}%</p>
          )}
        </div>
      ) : data.anonymous ? (
        <div className="text-center py-6">
          {data.myRank !== null ? (
            <>
              <p className="text-3xl font-black text-[#f46617]">#{data.myRank}</p>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                of {data.cohortSize} {data.myPercentile !== null && `· Top ${100 - data.myPercentile + 1}%`}
              </p>
              {data.myScore !== null && (
                <p className="text-xs text-slate-400 mt-2">Your score: {Math.round(data.myScore)}%</p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400 font-semibold">Attempt the quiz to see your rank</p>
          )}
          <p className="text-[10px] text-slate-400 mt-3 uppercase tracking-wider font-bold">Other learners' names are hidden</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {data.entries.map(entry => (
            <div key={entry.employeeId} className="flex items-center gap-3 py-1.5">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border flex-shrink-0 ${RANK_BADGE[entry.rank] || 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                {entry.rank}
              </span>
              <EmployeeAvatar name={entry.name} avatar={null} gender={null} size="w-7 h-7" shape="rounded" />
              <span className="text-sm font-semibold text-slate-700 truncate flex-1">{entry.name}</span>
              <span className="text-xs font-bold text-slate-500">{Math.round(entry.avgScore)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
