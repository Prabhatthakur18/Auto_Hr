import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type ILTSession } from '../services/api';

interface ILTCalendarViewProps {
  sessions: ILTSession[];
  onSelectSession: (session: ILTSession) => void;
}

const STATE_DOT: Record<string, string> = {
  PUBLISHED: 'bg-[#f46617]',
  CANCELLED: 'bg-red-400',
  COMPLETED: 'bg-emerald-400',
  DRAFT: 'bg-slate-300',
};

export const ILTCalendarView: React.FC<ILTCalendarViewProps> = ({ sessions, onSelectSession }) => {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startOffset = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const sessionsByDay = new Map<number, ILTSession[]>();
  for (const session of sessions) {
    const start = new Date(session.startsAt);
    if (start.getFullYear() === year && start.getMonth() === month) {
      const day = start.getDate();
      const list = sessionsByDay.get(day) ?? [];
      list.push(session);
      sessionsByDay.set(day, list);
    }
  }

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="bg-white rounded-[24px] border border-orange-100/50 shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-orange-100/40">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-1.5 rounded-xl hover:bg-orange-50 text-slate-400 hover:text-slate-700 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-bold text-slate-800">
          {cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </h3>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-1.5 rounded-xl hover:bg-orange-50 text-slate-400 hover:text-slate-700 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-orange-100/40 bg-orange-50/30">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const isToday = day !== null && today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const daySessions = day !== null ? (sessionsByDay.get(day) ?? []) : [];
          return (
            <div key={i} className={`min-h-[90px] border-b border-r border-orange-100/20 p-1.5 ${day === null ? 'bg-slate-50/30' : ''}`}>
              {day !== null && (
                <>
                  <span className={`inline-flex items-center justify-center w-5 h-5 text-[11px] font-bold rounded-full ${isToday ? 'bg-[#f46617] text-white' : 'text-slate-500'}`}>
                    {day}
                  </span>
                  <div className="mt-1 space-y-1">
                    {daySessions.slice(0, 3).map(session => (
                      <button
                        key={session.id}
                        onClick={() => onSelectSession(session)}
                        className="w-full flex items-center gap-1 text-left text-[10px] font-semibold text-slate-600 hover:text-[#f46617] truncate px-1 py-0.5 rounded-md hover:bg-orange-50/60 transition-colors"
                        title={session.title}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATE_DOT[session.state]}`} />
                        <span className="truncate">{session.title}</span>
                      </button>
                    ))}
                    {daySessions.length > 3 && (
                      <p className="text-[9px] text-slate-400 font-bold px-1">+{daySessions.length - 3} more</p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
