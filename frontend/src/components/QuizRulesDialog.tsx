import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Clock, ShieldAlert, Target } from 'lucide-react';
import type { CourseQuiz } from '../services/api';

interface QuizRulesDialogProps {
  quiz: CourseQuiz;
  onConfirm: () => void;
}

const READ_SECONDS = 10;

export const QuizRulesDialog: React.FC<QuizRulesDialogProps> = ({ quiz, onConfirm }) => {
  const [secondsLeft, setSecondsLeft] = useState(READ_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const canContinue = secondsLeft <= 0;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fade-in">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />

      <div className="relative bg-white rounded-[32px] border border-orange-100/50 shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
        <div className="flex items-center gap-2 p-6 border-b border-orange-100/50">
          <ShieldAlert className="w-5 h-5 text-[#f46617]" />
          <h3 className="text-lg font-black text-slate-800">Before You Start</h3>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Target className="w-3.5 h-3.5" /> Pass mark: {quiz.passPercentage}% · Max attempts: {quiz.maxAttempts}
            {quiz.timeLimitMinutes && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Time limit: {quiz.timeLimitMinutes} min
              </span>
            )}
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="text-sm font-bold text-red-700">Do not switch tabs or apps once started</p>
              <p className="text-xs text-red-600 leading-relaxed">
                The moment you leave this tab, minimize the window, or switch to another application, your quiz will be{' '}
                <span className="font-bold">submitted automatically</span> with whatever answers you've selected so far.
              </p>
            </div>
          </div>

          <ul className="text-xs text-slate-500 font-semibold space-y-1.5 list-disc pl-4">
            <li>Stay on this tab for the entire duration of the quiz.</li>
            <li>Answer every question before submitting — there's no auto-save of partial progress beyond what's been selected.</li>
            <li>Once submitted, you cannot change your answers for that attempt.</li>
          </ul>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!canContinue}
            className="btn-orange w-full py-3 text-sm font-bold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {canContinue ? 'Continue' : `Continue (${secondsLeft}s)`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
