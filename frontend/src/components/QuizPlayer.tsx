import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Loader2, HelpCircle } from 'lucide-react';
import { learningApi, type CourseQuiz } from '../services/api';
import { QuizRulesDialog } from './QuizRulesDialog';

interface QuizPlayerProps {
  enrollmentId: number;
  quiz: CourseQuiz;
  onPassed: () => void;
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({ quiz, onPassed }) => {
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<number, Set<number>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; gradeLabel: string | null; correctCount: number; totalQuestions: number } | null>(null);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const toggleOption = (questionId: number, optionId: number, singleAnswer: boolean) => {
    setAnswers(prev => {
      const next = { ...prev };
      const current = new Set(next[questionId] ?? []);
      if (singleAnswer) {
        next[questionId] = current.has(optionId) ? new Set() : new Set([optionId]);
      } else {
        if (current.has(optionId)) current.delete(optionId);
        else current.add(optionId);
        next[questionId] = current;
      }
      return next;
    });
  };

  const handleSubmit = async (isAutoSubmit = false) => {
    setSubmitting(true);
    setError('');
    if (isAutoSubmit) setAutoSubmitted(true);
    try {
      const currentAnswers = answersRef.current;
      const payload = {
        answers: quiz.questions.map(q => ({
          questionId: q.id,
          selectedOptionIds: Array.from(currentAnswers[q.id] ?? []),
        })),
        startedAt: startedAt ?? new Date().toISOString(),
        isAutoSubmit,
      };
      const res = await learningApi.submitQuizAttempt(quiz.id, payload);
      if (res.data?.attempt) {
        setResult({
          score: res.data.attempt.score,
          passed: res.data.attempt.passed,
          gradeLabel: res.data.attempt.gradeLabel,
          correctCount: res.data.attempt.correctCount,
          totalQuestions: res.data.attempt.totalQuestions,
        });
        if (res.data.attempt.passed) onPassed();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-submit the instant the learner leaves this tab/app once the quiz has actually started —
  // listeners self-remove on first trigger so a slow submit can't be interrupted by a second event.
  useEffect(() => {
    if (!started || result) return;

    const triggerAutoSubmit = () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      handleSubmit(true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') triggerAutoSubmit();
    };
    const handleBlur = () => triggerAutoSubmit();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [started, result]);

  if (!started) {
    return (
      <QuizRulesDialog
        quiz={quiz}
        onConfirm={() => {
          setStartedAt(new Date().toISOString());
          setStarted(true);
        }}
      />
    );
  }

  if (result) {
    return (
      <div className="text-center space-y-4 py-6">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${result.passed ? 'bg-emerald-50' : 'bg-red-50'}`}>
          {result.passed ? <CheckCircle className="w-7 h-7 text-emerald-500" /> : <XCircle className="w-7 h-7 text-red-500" />}
        </div>
        <p className="text-lg font-black text-slate-800">{result.score}%</p>
        {result.gradeLabel && (
          <span className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
            {result.gradeLabel}
          </span>
        )}
        <p className="text-sm text-slate-600">
          {result.correctCount} of {result.totalQuestions} correct — {result.passed ? 'You passed!' : 'Not passed. Try again if attempts remain.'}
        </p>
        {autoSubmitted && (
          <div className="flex items-center gap-2 justify-center text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-2xl px-3.5 py-2.5 max-w-sm mx-auto">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Submitted automatically — you switched away from the quiz tab
          </div>
        )}
        {!result.passed && (
          <button
            onClick={() => { setResult(null); setAnswers({}); setAutoSubmitted(false); setStarted(false); }}
            className="btn-orange px-4 py-2.5 text-xs font-bold rounded-2xl"
          >
            Retry Quiz
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
        <HelpCircle className="w-3.5 h-3.5" /> Pass mark: {quiz.passPercentage}% · Max attempts: {quiz.maxAttempts}
      </p>

      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {quiz.questions.map((q, qi) => {
        const correctOptionCount = 1; // Phase 1: single-correct-answer UI by default (multi-select still supported server-side)
        const singleAnswer = correctOptionCount === 1;
        return (
          <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-sm font-bold text-slate-800 mb-3">{qi + 1}. {q.questionText}</p>
            <div className="space-y-2">
              {q.options.map(opt => {
                const selected = answers[q.id]?.has(opt.id) ?? false;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleOption(q.id, opt.id, singleAnswer)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      selected
                        ? 'bg-orange-50 border-[#f46617] text-slate-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-orange-200'
                    }`}
                  >
                    {opt.optionText}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <button
        onClick={() => handleSubmit(false)}
        disabled={submitting}
        className="btn-orange px-4 py-3 text-sm font-bold rounded-2xl flex items-center justify-center gap-2 w-full sm:w-auto"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
        Submit Quiz
      </button>
    </div>
  );
};
