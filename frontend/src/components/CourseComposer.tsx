import React, { useState } from 'react';
import {
  X, GraduationCap, Image as ImageIcon, Video, FileText, HelpCircle,
  Link as LinkIcon, AlertTriangle, Plus, Loader2, Trash2, CheckCircle, Upload,
} from 'lucide-react';
import { learningApi, type Course, type CourseModule, type ModuleContentType } from '../services/api';
import { QuizBuilder } from './QuizBuilder';

interface CourseComposerProps {
  departments: string[];
  onClose: () => void;
  onSaved: () => void;
}

const MAX_FILE_BYTES = 50 * 1024 * 1024;

const CONTENT_TYPE_OPTIONS: { value: ModuleContentType; label: string; icon: React.ElementType }[] = [
  { value: 'VIDEO_EMBED', label: 'Video Link (YouTube/Vimeo)', icon: LinkIcon },
  { value: 'VIDEO_FILE', label: 'Video Upload', icon: Video },
  { value: 'DOCUMENT', label: 'Document', icon: FileText },
  { value: 'QUIZ', label: 'Quiz', icon: HelpCircle },
];

export const CourseComposer: React.FC<CourseComposerProps> = ({ departments, onClose, onSaved }) => {
  const [step, setStep] = useState<'DETAILS' | 'MODULES'>('DETAILS');
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [quizBuilderModule, setQuizBuilderModule] = useState<CourseModule | null>(null);

  // Course detail form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [mandatory, setMandatory] = useState(false);
  const [targetDepartment, setTargetDepartment] = useState('ALL');
  const [autoAssign, setAutoAssign] = useState(false);
  const [autoAssignDueDays, setAutoAssignDueDays] = useState('');
  const [certificateExpires, setCertificateExpires] = useState(false);
  const [certificateValidityMonths, setCertificateValidityMonths] = useState('');
  const [enableRanking, setEnableRanking] = useState(false);
  const [rankingScope, setRankingScope] = useState<'DEPARTMENT' | 'ORG_WIDE'>('DEPARTMENT');
  const [rankingAnonymous, setRankingAnonymous] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [thumbnail, setThumbnail] = useState<File | null>(null);

  // Module form state
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleType, setModuleType] = useState<ModuleContentType>('VIDEO_EMBED');
  const [videoLink, setVideoLink] = useState('');
  const [moduleFile, setModuleFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      if (description.trim()) formData.append('description', description.trim());
      if (category.trim()) formData.append('category', category.trim());
      if (durationMinutes) formData.append('durationMinutes', durationMinutes);
      formData.append('mandatory', String(mandatory));
      if (targetDepartment !== 'ALL') formData.append('targetDepartment', targetDepartment);
      formData.append('autoAssign', String(autoAssign));
      if (autoAssign && autoAssignDueDays) formData.append('autoAssignDueDays', autoAssignDueDays);
      if (certificateExpires && certificateValidityMonths) formData.append('certificateValidityMonths', certificateValidityMonths);
      if (!mandatory && enableRanking) {
        formData.append('enableRanking', 'true');
        formData.append('rankingScope', rankingScope);
        formData.append('rankingAnonymous', String(rankingAnonymous));
      }
      formData.append('requiresApproval', String(requiresApproval));
      if (thumbnail) formData.append('thumbnail', thumbnail);

      const res = await learningApi.createCourse(formData);
      if (res.data?.course) {
        setCourse(res.data.course);
        setStep('MODULES');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create course');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;
    if (!moduleTitle.trim()) {
      setError('Module title is required');
      return;
    }
    if (moduleType === 'VIDEO_EMBED' && !videoLink.trim()) {
      setError('Enter a video link');
      return;
    }
    if ((moduleType === 'VIDEO_FILE' || moduleType === 'DOCUMENT') && !moduleFile) {
      setError('Choose a file to upload');
      return;
    }
    if (moduleFile && moduleFile.size > MAX_FILE_BYTES) {
      setError('File exceeds the 50MB limit');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('title', moduleTitle.trim());
      formData.append('contentType', moduleType);
      if (moduleType === 'VIDEO_EMBED') formData.append('videoLink', videoLink.trim());
      if (moduleFile) formData.append('file', moduleFile);

      const res = await learningApi.addModule(course.id, formData);
      if (res.data?.module) {
        setModules(prev => [...prev, res.data!.module]);
        if (moduleType === 'QUIZ') {
          setQuizBuilderModule(res.data.module);
        }
        setModuleTitle('');
        setVideoLink('');
        setModuleFile(null);
        setModuleType('VIDEO_EMBED');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add module');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveModule = async (moduleId: number) => {
    try {
      await learningApi.deleteModule(moduleId);
      setModules(prev => prev.filter(m => m.id !== moduleId));
    } catch (err: any) {
      const message = err.message || 'Failed to remove module';
      if (message.includes('force=true') && window.confirm(`${message}\n\nProceed anyway?`)) {
        try {
          await learningApi.deleteModule(moduleId, true);
          setModules(prev => prev.filter(m => m.id !== moduleId));
        } catch (err2: any) {
          setError(err2.message || 'Failed to remove module');
        }
        return;
      }
      setError(message);
    }
  };

  const handlePublish = async () => {
    if (!course) return;
    if (modules.length === 0) {
      setError('Add at least one module before publishing');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await learningApi.publishCourse(course.id);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to publish course');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { if (!submitting) onClose(); }} />

      <div className="relative bg-white rounded-[32px] border border-orange-100/50 shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-orange-100/50 flex-shrink-0">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#f46617]" />
            {step === 'DETAILS' ? 'New Course' : `Add Modules — ${course?.title}`}
          </h3>
          <button
            disabled={submitting}
            onClick={() => (step === 'MODULES' ? onSaved() : onClose())}
            className="p-1.5 rounded-xl hover:bg-orange-50 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {step === 'DETAILS' && (
            <form onSubmit={handleCreateCourse} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Workplace Safety Fundamentals"
                  className="w-full px-4 py-3 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What will learners take away from this course?"
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="e.g. Compliance, Technical"
                    className="w-full px-4 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Duration (minutes)</label>
                  <input
                    type="number"
                    min={0}
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(e.target.value)}
                    placeholder="e.g. 45"
                    className="w-full px-4 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Audience</label>
                <select
                  value={targetDepartment}
                  onChange={e => setTargetDepartment(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mandatory}
                  onChange={e => {
                    setMandatory(e.target.checked);
                    if (e.target.checked) setEnableRanking(false); // ranking is unavailable on mandatory courses
                  }}
                  className="w-4 h-4 rounded accent-[#f46617]"
                />
                <span className="text-sm font-semibold text-slate-700">Mandatory course</span>
              </label>

              <div className="p-4 rounded-2xl bg-orange-50/30 border border-orange-100/60 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoAssign}
                    onChange={e => setAutoAssign(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#f46617]"
                  />
                  <span className="text-sm font-semibold text-slate-700">Auto-assign to matching employees</span>
                </label>
                <p className="text-xs text-slate-500 leading-relaxed pl-6">
                  Automatically enrolls every active employee in the selected audience — including anyone onboarded or transferred in later — without HR manually assigning it.
                </p>
                {autoAssign && (
                  <div className="pl-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Due in (days, optional)</label>
                    <input
                      type="number"
                      min={1}
                      value={autoAssignDueDays}
                      onChange={e => setAutoAssignDueDays(e.target.value)}
                      placeholder="e.g. 14"
                      className="w-full max-w-[160px] px-4 py-2 bg-white border border-orange-100 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                    />
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-orange-50/30 border border-orange-100/60 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={certificateExpires}
                    onChange={e => setCertificateExpires(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#f46617]"
                  />
                  <span className="text-sm font-semibold text-slate-700">Certificate expires</span>
                </label>
                <p className="text-xs text-slate-500 leading-relaxed pl-6">
                  Learners will be reminded to retake the course before their certificate expires, and again once it has.
                </p>
                {certificateExpires && (
                  <div className="pl-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Valid for (months)</label>
                    <input
                      type="number"
                      min={1}
                      value={certificateValidityMonths}
                      onChange={e => setCertificateValidityMonths(e.target.value)}
                      placeholder="e.g. 12"
                      className="w-full max-w-[160px] px-4 py-2 bg-white border border-orange-100 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                    />
                  </div>
                )}
              </div>

              {mandatory ? (
                <p className="text-xs text-slate-400 leading-relaxed px-1">
                  Leaderboard ranking is unavailable on mandatory courses — compliance training shouldn't feel competitive.
                </p>
              ) : (
                <div className="p-4 rounded-2xl bg-orange-50/30 border border-orange-100/60 space-y-3">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableRanking}
                      onChange={e => setEnableRanking(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#f46617]"
                    />
                    <span className="text-sm font-semibold text-slate-700">Enable leaderboard ranking</span>
                  </label>
                  <p className="text-xs text-slate-500 leading-relaxed pl-6">
                    Learners see their own rank/percentile (not other names) unless you disable anonymity below. Ranking is hidden until enough people have attempted the quiz.
                  </p>
                  {enableRanking && (
                    <div className="pl-6 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Scope</label>
                        <select
                          value={rankingScope}
                          onChange={e => setRankingScope(e.target.value as 'DEPARTMENT' | 'ORG_WIDE')}
                          className="w-full max-w-[220px] px-4 py-2 bg-white border border-orange-100 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                        >
                          <option value="DEPARTMENT">Same department</option>
                          <option value="ORG_WIDE">Org-wide</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!rankingAnonymous}
                          onChange={e => setRankingAnonymous(!e.target.checked)}
                          className="w-4 h-4 rounded accent-[#f46617]"
                        />
                        <span className="text-sm font-semibold text-slate-700">Show named leaderboard (disable anonymity)</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={requiresApproval}
                  onChange={e => setRequiresApproval(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#f46617]"
                />
                <span className="text-sm font-semibold text-slate-700">Self-enrollment requires manager approval</span>
              </label>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Thumbnail (optional)</label>
                <label className="flex items-center justify-center gap-2 px-4 py-4 rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/30 text-slate-500 text-sm font-semibold cursor-pointer hover:bg-orange-50/60 transition-all">
                  <ImageIcon className="w-4 h-4" />
                  {thumbnail ? thumbnail.name : 'Click to upload a thumbnail image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => setThumbnail(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-orange px-4 py-3 text-sm font-bold rounded-2xl flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {submitting ? 'Creating...' : 'Create Course & Add Modules'}
              </button>
            </form>
          )}

          {step === 'MODULES' && course && (
            <div className="space-y-5">
              {modules.length > 0 && (
                <div className="space-y-2">
                  {modules.map((m, i) => {
                    const opt = CONTENT_TYPE_OPTIONS.find(o => o.value === m.contentType);
                    const Icon = opt?.icon || FileText;
                    return (
                      <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
                        <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="flex-1 text-sm font-semibold text-slate-700 truncate">{m.title}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveModule(m.id)}
                          className="text-slate-400 hover:text-red-500 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <form onSubmit={handleAddModule} className="space-y-4 p-4 rounded-2xl bg-orange-50/30 border border-orange-100/60">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Module Title</label>
                  <input
                    type="text"
                    value={moduleTitle}
                    onChange={e => setModuleTitle(e.target.value)}
                    placeholder="e.g. Introduction"
                    className="w-full px-4 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Content Type</label>
                  <div className="flex flex-wrap gap-2">
                    {CONTENT_TYPE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setModuleType(opt.value); setModuleFile(null); setVideoLink(''); }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                          moduleType === opt.value
                            ? 'bg-[#f46617] text-white shadow-sm shadow-orange-500/30'
                            : 'bg-white text-slate-500 hover:bg-orange-50 border border-orange-100'
                        }`}
                      >
                        <opt.icon className="w-3.5 h-3.5" /> {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {moduleType === 'VIDEO_EMBED' && (
                  <input
                    type="url"
                    value={videoLink}
                    onChange={e => setVideoLink(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full px-4 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                  />
                )}

                {(moduleType === 'VIDEO_FILE' || moduleType === 'DOCUMENT') && (
                  <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-orange-200 bg-white text-slate-500 text-sm font-semibold cursor-pointer hover:bg-orange-50/60 transition-all">
                    <Upload className="w-4 h-4" />
                    {moduleFile ? moduleFile.name : `Click to upload ${moduleType === 'VIDEO_FILE' ? 'a video' : 'a document'}`}
                    <input
                      type="file"
                      accept={moduleType === 'VIDEO_FILE' ? 'video/*' : '.pdf,.doc,.docx,.ppt,.pptx,application/pdf'}
                      className="hidden"
                      onChange={e => setModuleFile(e.target.files?.[0] || null)}
                    />
                  </label>
                )}

                {moduleType === 'QUIZ' && (
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    Quiz questions can be added after this module is created, from the course detail page.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Module
                </button>
              </form>

              <button
                type="button"
                onClick={handlePublish}
                disabled={submitting || modules.length === 0}
                className="w-full btn-orange px-4 py-3 text-sm font-bold rounded-2xl flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Publish Course
              </button>
            </div>
          )}
        </div>
      </div>

      {quizBuilderModule && (
        <QuizBuilder
          moduleId={quizBuilderModule.id}
          moduleTitle={quizBuilderModule.title}
          onClose={() => setQuizBuilderModule(null)}
          onSaved={() => setQuizBuilderModule(null)}
        />
      )}
    </div>
  );
};
