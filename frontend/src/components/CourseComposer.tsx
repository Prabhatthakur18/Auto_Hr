import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, GraduationCap, Image as ImageIcon, Video, FileText, HelpCircle,
  Link as LinkIcon, AlertTriangle, Plus, Loader2, Trash2, CheckCircle, Upload,
} from 'lucide-react';
import { learningApi, type Course, type CourseDetail, type CourseModule, type ModuleContentType } from '../services/api';
import { QuizBuilder } from './QuizBuilder';

interface CourseComposerProps {
  departments: string[];
  editingCourse?: CourseDetail | null;
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

export const CourseComposer: React.FC<CourseComposerProps> = ({ departments, editingCourse, onClose, onSaved }) => {
  const isEditing = !!editingCourse;
  const [step, setStep] = useState<'DETAILS' | 'MODULES'>(isEditing ? 'MODULES' : 'DETAILS');
  const [course, setCourse] = useState<Course | null>(editingCourse ?? null);
  const [modules, setModules] = useState<CourseModule[]>(editingCourse?.modules ?? []);
  const [quizBuilderModule, setQuizBuilderModule] = useState<CourseModule | null>(null);

  // Course detail form state
  const [title, setTitle] = useState(editingCourse?.title ?? '');
  const [description, setDescription] = useState(editingCourse?.description ?? '');
  const [category, setCategory] = useState(editingCourse?.category ?? '');
  const [durationMinutes, setDurationMinutes] = useState(editingCourse?.durationMinutes != null ? String(editingCourse.durationMinutes) : '');
  const [mandatory, setMandatory] = useState(editingCourse?.mandatory ?? false);
  const [targetDepartment, setTargetDepartment] = useState(editingCourse?.targetDepartment ?? 'ALL');
  const [autoAssign, setAutoAssign] = useState(editingCourse?.autoAssign ?? false);
  const [autoAssignDueDays, setAutoAssignDueDays] = useState(editingCourse?.autoAssignDueDays != null ? String(editingCourse.autoAssignDueDays) : '');
  const [certificateExpires, setCertificateExpires] = useState(editingCourse?.certificateValidityMonths != null);
  const [certificateValidityMonths, setCertificateValidityMonths] = useState(editingCourse?.certificateValidityMonths != null ? String(editingCourse.certificateValidityMonths) : '');
  const [enableRanking, setEnableRanking] = useState(editingCourse?.enableRanking ?? false);
  const [rankingScope, setRankingScope] = useState<'DEPARTMENT' | 'ORG_WIDE'>(editingCourse?.rankingScope ?? 'DEPARTMENT');
  const [rankingAnonymous, setRankingAnonymous] = useState(editingCourse?.rankingAnonymous ?? true);
  const [requiresApproval, setRequiresApproval] = useState(editingCourse?.requiresApproval ?? false);
  const [thumbnail, setThumbnail] = useState<File | null>(null);

  // Module form state
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleType, setModuleType] = useState<ModuleContentType>('VIDEO_EMBED');
  const [videoLink, setVideoLink] = useState('');
  const [moduleFile, setModuleFile] = useState<File | null>(null);
  const [moduleDurationMinutes, setModuleDurationMinutes] = useState('');

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
      if (isEditing && course) {
        const res = await learningApi.updateCourse(course.id, {
          title: title.trim(),
          description: description.trim() || null,
          category: category.trim() || null,
          durationMinutes: durationMinutes ? Number(durationMinutes) : null,
          mandatory,
          targetDepartment: targetDepartment !== 'ALL' ? targetDepartment : null,
          autoAssign,
          autoAssignDueDays: autoAssign && autoAssignDueDays ? Number(autoAssignDueDays) : null,
          certificateValidityMonths: certificateExpires && certificateValidityMonths ? Number(certificateValidityMonths) : null,
          enableRanking: !mandatory && enableRanking,
          rankingScope,
          rankingAnonymous,
          requiresApproval,
        });
        if (res.data?.course) {
          setCourse(res.data.course);
          if (thumbnail) {
            const thumbForm = new FormData();
            thumbForm.append('thumbnail', thumbnail);
            await learningApi.updateCourseThumbnail(course.id, thumbForm);
          }
          setStep('MODULES');
        }
        return;
      }

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
      setError(err.message || `Failed to ${isEditing ? 'update' : 'create'} course`);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!course) return;
    setSubmitting(true);
    setError('');
    try {
      const res = course.state === 'PUBLISHED'
        ? await learningApi.unpublishCourse(course.id)
        : await learningApi.publishCourse(course.id);
      if (res.data?.course) setCourse(res.data.course);
    } catch (err: any) {
      setError(err.message || 'Failed to update course status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!course) return;
    if (!window.confirm('Archive this course? It will no longer be visible in the catalog, but existing enrollments and certificates are retained.')) return;
    setSubmitting(true);
    setError('');
    try {
      await learningApi.archiveCourse(course.id);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to archive course');
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
    if (moduleType === 'DOCUMENT' && !moduleDurationMinutes) {
      setError('Estimated read time is required for document modules — it gates "Mark as Complete" for learners');
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
      if (moduleDurationMinutes) formData.append('durationMinutes', moduleDurationMinutes);

      const res = await learningApi.addModule(course.id, formData);
      if (res.data?.module) {
        setModules(prev => [...prev, res.data!.module]);
        if (moduleType === 'QUIZ') {
          setQuizBuilderModule(res.data.module);
        }
        setModuleTitle('');
        setVideoLink('');
        setModuleFile(null);
        setModuleDurationMinutes('');
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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { if (!submitting) onClose(); }} />

      <div className="relative bg-white rounded-[32px] border border-orange-100/50 shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-orange-100/50 flex-shrink-0">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#f46617]" />
            {step === 'DETAILS'
              ? (isEditing ? `Manage Course — ${course?.title}` : 'New Course')
              : (isEditing ? `Manage Course — ${course?.title}` : `Add Modules — ${course?.title}`)}
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
                {isEditing
                  ? (submitting ? 'Saving...' : 'Save Details')
                  : (submitting ? 'Creating...' : 'Create Course & Add Modules')}
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
                        {m.contentType === 'QUIZ' && (
                          <button
                            type="button"
                            onClick={() => setQuizBuilderModule(m)}
                            className="text-xs font-bold text-[#f46617] hover:text-orange-700 flex-shrink-0"
                          >
                            {m.quiz ? 'Edit Quiz' : 'Add Quiz'}
                          </button>
                        )}
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

                {moduleType !== 'QUIZ' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      {moduleType === 'DOCUMENT' ? 'Estimated Read Time (minutes)' : 'Duration (minutes, optional)'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={moduleDurationMinutes}
                      onChange={e => setModuleDurationMinutes(e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full max-w-[160px] px-4 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                    />
                    {moduleType === 'DOCUMENT' && (
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                        Learners must spend ~80% of this time on the document before "Mark as Complete" unlocks.
                      </p>
                    )}
                  </div>
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

              {isEditing ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePublishToggle}
                    disabled={submitting || (course.state !== 'PUBLISHED' && modules.length === 0)}
                    className="flex-1 btn-orange px-4 py-3 text-sm font-bold rounded-2xl flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {course.state === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    onClick={handleArchive}
                    disabled={submitting}
                    className="px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 text-sm font-bold rounded-2xl border border-slate-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Archive
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={submitting || modules.length === 0}
                  className="w-full btn-orange px-4 py-3 text-sm font-bold rounded-2xl flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Publish Course
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {quizBuilderModule && (
        <QuizBuilder
          moduleId={quizBuilderModule.id}
          moduleTitle={quizBuilderModule.title}
          existingQuiz={quizBuilderModule.quiz ?? undefined}
          onClose={() => setQuizBuilderModule(null)}
          onSaved={(quiz) => {
            setModules(prev => prev.map(m => (m.id === quizBuilderModule.id ? { ...m, quiz } : m)));
            setQuizBuilderModule(null);
          }}
        />
      )}
    </div>,
    document.body
  );
};
