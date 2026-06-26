import React, { useState } from 'react';
import { X, Award, Plus, Loader2, AlertTriangle } from 'lucide-react';
import { badgeApi, type BadgeCriteriaType } from '../services/api';
import { BADGE_ICON_KEYS } from '../utils/badgeIcons';

interface BadgeComposerProps {
  onClose: () => void;
  onSaved: () => void;
}

const CRITERIA_OPTIONS: { value: BadgeCriteriaType; label: string; description: string }[] = [
  { value: 'QUIZ_GRADE', label: 'Quiz Grade Tier', description: 'Earned when a quiz attempt is graded into a specific tier (e.g. "Excellent")' },
  { value: 'PERFECT_SCORE', label: 'Perfect Score', description: 'Earned the moment any quiz attempt scores 100%' },
  { value: 'COURSE_COMPLETION_COUNT', label: 'Courses Completed', description: 'Earned after completing N courses total' },
  { value: 'PATH_COMPLETION_COUNT', label: 'Learning Paths Completed', description: 'Earned after completing N learning paths total' },
];

export const BadgeComposer: React.FC<BadgeComposerProps> = ({ onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconKey, setIconKey] = useState('Award');
  const [criteriaType, setCriteriaType] = useState<BadgeCriteriaType>('QUIZ_GRADE');
  const [criteriaLabel, setCriteriaLabel] = useState('');
  const [criteriaValue, setCriteriaValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (criteriaType === 'QUIZ_GRADE' && !criteriaLabel.trim()) {
      setError('Grade tier label is required (must match a grade band label exactly, e.g. "Excellent")');
      return;
    }
    if (['COURSE_COMPLETION_COUNT', 'PATH_COMPLETION_COUNT'].includes(criteriaType) && !criteriaValue) {
      setError('Completion count is required');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await badgeApi.createBadge({
        name: name.trim(),
        description: description.trim() || undefined,
        iconKey,
        criteriaType,
        criteriaLabel: criteriaType === 'QUIZ_GRADE' ? criteriaLabel.trim() : undefined,
        criteriaValue: ['COURSE_COMPLETION_COUNT', 'PATH_COMPLETION_COUNT'].includes(criteriaType) ? parseInt(criteriaValue, 10) : undefined,
      });
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to create badge');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { if (!submitting) onClose(); }} />

      <div className="relative bg-white rounded-[32px] border border-orange-100/50 shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-orange-100/50 flex-shrink-0">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#f46617]" /> New Badge
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

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Quiz Master"
              className="w-full px-4 py-3 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {BADGE_ICON_KEYS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setIconKey(icon)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    iconKey === icon ? 'bg-[#f46617] text-white shadow-sm' : 'bg-white text-slate-500 border border-orange-100'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">How is it earned?</label>
            <div className="space-y-2">
              {CRITERIA_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                    criteriaType === opt.value ? 'bg-orange-50/60 border-orange-200' : 'bg-white border-slate-200 hover:border-orange-100'
                  }`}
                >
                  <input
                    type="radio"
                    checked={criteriaType === opt.value}
                    onChange={() => setCriteriaType(opt.value)}
                    className="mt-0.5 accent-[#f46617]"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{opt.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {criteriaType === 'QUIZ_GRADE' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Grade Tier Label</label>
              <input
                type="text"
                value={criteriaLabel}
                onChange={e => setCriteriaLabel(e.target.value)}
                placeholder='Must match a quiz grade band exactly, e.g. "Excellent"'
                className="w-full px-4 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
              />
            </div>
          )}

          {['COURSE_COMPLETION_COUNT', 'PATH_COMPLETION_COUNT'].includes(criteriaType) && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Completion Count</label>
              <input
                type="number"
                min={1}
                value={criteriaValue}
                onChange={e => setCriteriaValue(e.target.value)}
                placeholder="e.g. 5"
                className="w-32 px-4 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full btn-orange px-4 py-3 text-sm font-bold rounded-2xl flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {submitting ? 'Creating...' : 'Create Badge'}
          </button>
        </form>
      </div>
    </div>
  );
};
