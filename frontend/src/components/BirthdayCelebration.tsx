import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Cake, PartyPopper, X } from 'lucide-react';
import { employeeApi, type BirthdayPerson } from '../services/api';
import { EmployeeAvatar } from './EmployeeAvatar';

/** Today's date in India — the popup is shown at most once per viewer per IST day. */
function todayKeyIST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

const CONFETTI_COLORS = ['#f46617', '#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'];

/**
 * Birthday celebration popup. On the first visit of the day it checks who has a birthday
 * today and, if anyone does, shows a festive card — with a personal message when the
 * viewer is one of them. Dismissal is remembered per day in localStorage.
 */
export const BirthdayCelebration: React.FC<{ currentEmployeeId: number | null; viewerName: string }> = ({
  currentEmployeeId,
  viewerName,
}) => {
  const [birthdays, setBirthdays] = useState<BirthdayPerson[]>([]);
  const [open, setOpen] = useState(false);
  const storageKey = `birthday-popup-seen:${todayKeyIST()}`;

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey)) return;
    } catch {
      // Storage unavailable (private mode) — just show it.
    }

    let cancelled = false;
    employeeApi
      .birthdaysToday()
      .then(res => {
        const people = res.data?.birthdays ?? [];
        if (!cancelled && people.length > 0) {
          setBirthdays(people);
          setOpen(true);
        }
      })
      .catch(() => {
        // Non-critical — never block the dashboard over this.
      });

    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      // ignore
    }
  };

  if (!open) return null;

  const isOwnBirthday = currentEmployeeId !== null && birthdays.some(b => b.id === currentEmployeeId);
  const others = birthdays.filter(b => b.id !== currentEmployeeId);

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 font-sans">
      <style>{`
        @keyframes birthday-confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(560px) rotate(540deg); opacity: 0; }
        }
        @keyframes birthday-pop-in {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={close} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="birthday-title"
        className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
        style={{ animation: 'birthday-pop-in 0.35s ease-out' }}
      >
        {/* Confetti */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 28 }, (_, i) => (
            <span
              key={i}
              className="absolute top-0 block w-2 h-3 rounded-sm"
              style={{
                left: `${(i * 37) % 100}%`,
                backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                animation: `birthday-confetti-fall ${2.4 + (i % 5) * 0.4}s ease-in ${(i % 7) * 0.25}s 2 both`,
              }}
            />
          ))}
        </div>

        <button
          onClick={close}
          className="absolute top-4 right-4 z-10 p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative bg-gradient-to-br from-[#f46617] via-orange-500 to-amber-400 px-6 pt-8 pb-7 text-center text-white">
          <div className="mx-auto mb-3 w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            {isOwnBirthday ? <Cake className="w-9 h-9" /> : <PartyPopper className="w-9 h-9" />}
          </div>
          <h2 id="birthday-title" className="text-2xl font-black tracking-tight">
            {isOwnBirthday ? `Happy Birthday, ${viewerName.split(' ')[0]}! 🎂` : "It's a birthday today! 🎉"}
          </h2>
          <p className="text-sm font-semibold text-white/90 mt-1">
            {isOwnBirthday
              ? 'Wishing you a wonderful year ahead from everyone at Autoform.'
              : 'Take a moment to wish them a happy birthday.'}
          </p>
        </div>

        {others.length > 0 && (
          <div className="relative px-6 py-5">
            {isOwnBirthday && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Also celebrating today</p>
            )}
            <ul className="space-y-3 max-h-64 overflow-y-auto">
              {others.map(person => (
                <li key={person.id} className="flex items-center gap-3">
                  <EmployeeAvatar name={person.name} avatar={person.avatar} gender={person.gender} size="w-11 h-11" shape="rounded" />
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-800 truncate">{person.name}</p>
                    <p className="text-xs font-semibold text-slate-500 truncate">
                      {[person.position, person.department].filter(Boolean).join(' · ') || 'Team member'}
                    </p>
                  </div>
                  <Cake className="w-5 h-5 text-[#f46617] ml-auto flex-shrink-0" />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="relative px-6 pb-6 pt-1">
          <button onClick={close} className="btn-orange w-full py-3 text-sm font-bold rounded-2xl justify-center">
            {isOwnBirthday ? 'Thank you! 🎉' : 'Celebrate! 🎉'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
