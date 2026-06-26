import React, { useState } from 'react';
import { X, HelpCircle, Plus, Trash2, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { learningApi } from '../services/api';

interface QuizBuilderProps {
  moduleId: number;
  moduleTitle: string;
  onClose: () => void;
  onSaved: () => void;
}

interface DraftOption {
  optionText: string;
  isCorrect: boolean;
}

interface DraftQuestion {
  questionText: string;
  options: DraftOption[];
}

interface DraftGradeBand {
  label: string;
  minScore: string;
}

const emptyQuestion = (): DraftQuestion => ({
  questionText: '',
  options: [{ optionText: '', isCorrect: true }, { optionText: '', isCorrect: false }],
});

const defaultGradeBands = (): DraftGradeBand[] => [
  { label: 'Excellent', minScore: '90' },
  { label: 'Good', minScore: '75' },
  { label: 'Satisfactory', minScore: '60' },
];

export const QuizBuilder: React.FC<QuizBuilderProps> = ({ moduleId, moduleTitle, onClose, onSaved }) => {
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [passPercentage, setPassPercentage] = useState(70);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [useGradeBands, setUseGradeBands] = useState(false);
  const [gradeBands, setGradeBands] = useState<DraftGradeBand[]>(defaultGradeBands());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const updateGradeBand = (gi: number, field: 'label' | 'minScore', value: string) => {
    setGradeBands(prev => prev.map((g, i) => (i === gi ? { ...g, [field]: value } : g)));
  };

  const addGradeBand = () => setGradeBands(prev => [...prev, { label: '', minScore: '' }]);
  const removeGradeBand = (gi: number) => setGradeBands(prev => prev.filter((_, i) => i !== gi));

  const updateQuestion = (qi: number, text: string) => {
    setQuestions(prev => prev.map((q, i) => (i === qi ? { ...q, questionText: text } : q)));
  };

  const updateOption = (qi: number, oi: number, text: string) => {
    setQuestions(prev => prev.map((q, i) => i === qi
      ? { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, optionText: text } : o)) }
      : q));
  };

  const setCorrectOption = (qi: number, oi: number) => {
    setQuestions(prev => prev.map((q, i) => i === qi
      ? { ...q, options: q.options.map((o, j) => ({ ...o, isCorrect: j === oi })) }
      : q));
  };

  const addOption = (qi: number) => {
    setQuestions(prev => prev.map((q, i) => i === qi
      ? { ...q, options: [...q.options, { optionText: '', isCorrect: false }] }
      : q));
  };

  const removeOption = (qi: number, oi: number) => {
    setQuestions(prev => prev.map((q, i) => i === qi
      ? { ...q, options: q.options.filter((_, j) => j !== oi) }
      : q));
  };

  const addQuestion = () => setQuestions(prev => [...prev, emptyQuestion()]);
  const removeQuestion = (qi: number) => setQuestions(prev => prev.filter((_, i) => i !== qi));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (questions.some(q => !q.questionText.trim())) {
      setError('Every question needs text');
      return;
    }
    if (questions.some(q => q.options.some(o => !o.optionText.trim()))) {
      setError('Every option needs text');
      return;
    }
    if (questions.some(q => !q.options.some(o => o.isCorrect))) {
      setError('Every question needs a correct option selected');
      return;
    }

    let parsedGradeBands: { label: string; minScore: number }[] | undefined;
    if (useGradeBands) {
      if (gradeBands.some(g => !g.label.trim() || g.minScore === '')) {
        setError('Every grade band needs a label and minimum score');
        return;
      }
      parsedGradeBands = gradeBands.map(g => ({ label: g.label.trim(), minScore: Number(g.minScore) }));
      const minScores = new Set(parsedGradeBands.map(g => g.minScore));
      if (minScores.size !== parsedGradeBands.length) {
        setError('Grade bands must have distinct minimum scores');
        return;
      }
    }

    setSubmitting(true);
    const payload = {
      passPercentage,
      maxAttempts,
      questions: questions.map(q => ({ questionText: q.questionText.trim(), options: q.options.map(o => ({ optionText: o.optionText.trim(), isCorrect: o.isCorrect })) })),
      gradeBands: parsedGradeBands,
    };
    try {
      await learningApi.saveQuiz(moduleId, payload);
      onSaved();
    } catch (err: any) {
      const message = err.message || 'Failed to save quiz';
      if (message.includes('force=true') && window.confirm(`${message}\n\nProceed anyway?`)) {
        try {
          await learningApi.saveQuiz(moduleId, payload, true);
          onSaved();
        } catch (err2: any) {
          setError(err2.message || 'Failed to save quiz');
        }
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { if (!submitting) onClose(); }} />

      <div className="relative bg-white rounded-[32px] border border-orange-100/50 shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-orange-100/50 flex-shrink-0">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#f46617]" />
            Quiz — {moduleTitle}
          </h3>
          <button disabled={submitting} onClick={onClose} className="p-1.5 rounded-xl hover:bg-orange-50 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pass Percentage</label>
              <input
                type="number"
                min={1}
                max={100}
                value={passPercentage}
                onChange={e => setPassPercentage(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Max Attempts</label>
              <input
                type="number"
                min={1}
                value={maxAttempts}
                onChange={e => setMaxAttempts(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-orange-50/30 border border-orange-100/60 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useGradeBands}
                onChange={e => setUseGradeBands(e.target.checked)}
                className="w-4 h-4 rounded accent-[#f46617]"
              />
              <span className="text-sm font-semibold text-slate-700">Grade tiers (beyond pass/fail)</span>
            </label>
            <p className="text-xs text-slate-500 leading-relaxed pl-6">
              A score earns the highest tier whose minimum it meets — independent of the pass percentage above. Used for grade-based badges.
            </p>
            {useGradeBands && (
              <div className="pl-6 space-y-2">
                {gradeBands.map((g, gi) => (
                  <div key={gi} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={g.label}
                      onChange={e => updateGradeBand(gi, 'label', e.target.value)}
                      placeholder="e.g. Excellent"
                      className="flex-1 px-3 py-2 bg-white border border-orange-100 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={g.minScore}
                      onChange={e => updateGradeBand(gi, 'minScore', e.target.value)}
                      placeholder="Min %"
                      className="w-20 px-3 py-2 bg-white border border-orange-100 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                    />
                    {gradeBands.length > 1 && (
                      <button type="button" onClick={() => removeGradeBand(gi)} className="text-slate-300 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addGradeBand}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add tier
                </button>
              </div>
            )}
          </div>

          {questions.map((q, qi) => (
            <div key={qi} className="p-4 rounded-2xl bg-orange-50/30 border border-orange-100/60 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={q.questionText}
                  onChange={e => updateQuestion(qi, e.target.value)}
                  placeholder={`Question ${qi + 1}`}
                  className="flex-1 px-4 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                />
                {questions.length > 1 && (
                  <button type="button" onClick={() => removeQuestion(qi)} className="text-slate-400 hover:text-red-500 p-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {q.options.map((o, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectOption(qi, oi)}
                      className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${o.isCorrect ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}
                      title="Mark as correct answer"
                    >
                      {o.isCorrect && <CheckCircle className="w-3 h-3 text-white" />}
                    </button>
                    <input
                      type="text"
                      value={o.optionText}
                      onChange={e => updateOption(qi, oi, e.target.value)}
                      placeholder={`Option ${oi + 1}`}
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                    />
                    {q.options.length > 2 && (
                      <button type="button" onClick={() => removeOption(qi, oi)} className="text-slate-300 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addOption(qi)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add option
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addQuestion}
            className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-2xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Question
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="w-full btn-orange px-4 py-3 text-sm font-bold rounded-2xl flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Save Quiz
          </button>
        </form>
      </div>
    </div>
  );
};
