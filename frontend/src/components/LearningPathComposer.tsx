import React, { useEffect, useState } from 'react';
import { X, Route, Image as ImageIcon, AlertTriangle, Plus, Loader2, Trash2, CheckCircle } from 'lucide-react';
import { learningApi, type LearningPath, type Course } from '../services/api';

interface LearningPathComposerProps {
  departments: string[];
  onClose: () => void;
  onSaved: () => void;
}

export const LearningPathComposer: React.FC<LearningPathComposerProps> = ({ departments, onClose, onSaved }) => {
  const [step, setStep] = useState<'DETAILS' | 'COURSES'>('DETAILS');
  const [path, setPath] = useState<LearningPath | null>(null);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');

  // Path detail form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mandatory, setMandatory] = useState(false);
  const [targetDepartment, setTargetDepartment] = useState('ALL');
  const [navigationMode, setNavigationMode] = useState<'FREE' | 'SEQUENTIAL'>('SEQUENTIAL');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [thumbnail, setThumbnail] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    learningApi.listCourses().then(res => {
      if (res.data) setAvailableCourses(res.data.courses.filter(c => c.state === 'PUBLISHED'));
    });
  }, []);

  const handleCreatePath = async (e: React.FormEvent) => {
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
      formData.append('mandatory', String(mandatory));
      if (targetDepartment !== 'ALL') formData.append('targetDepartment', targetDepartment);
      formData.append('navigationMode', navigationMode);
      formData.append('requiresApproval', String(requiresApproval));
      if (thumbnail) formData.append('thumbnail', thumbnail);

      const res = await learningApi.createPath(formData);
      if (res.data?.path) {
        setPath(res.data.path);
        setStep('COURSES');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create learning path');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCourse = async () => {
    if (!path || !selectedCourseId) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await learningApi.addCourseToPath(path.id, parseInt(selectedCourseId, 10));
      if (res.data?.pathCourse) {
        setPath(prev => prev ? { ...prev, courses: [...prev.courses, res.data!.pathCourse] } : prev);
        setSelectedCourseId('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add course');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveCourse = async (courseId: number) => {
    if (!path) return;
    try {
      await learningApi.removeCourseFromPath(path.id, courseId);
      setPath(prev => prev ? { ...prev, courses: prev.courses.filter(c => c.courseId !== courseId) } : prev);
    } catch {
      // non-critical
    }
  };

  const handlePublish = async () => {
    if (!path) return;
    if (path.courses.length === 0) {
      setError('Add at least one course before publishing');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await learningApi.publishPath(path.id);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to publish learning path');
    } finally {
      setSubmitting(false);
    }
  };

  const coursesNotInPath = availableCourses.filter(c => !path?.courses.some(pc => pc.courseId === c.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { if (!submitting) onClose(); }} />

      <div className="relative bg-white rounded-[32px] border border-orange-100/50 shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-orange-100/50 flex-shrink-0">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Route className="w-5 h-5 text-[#f46617]" />
            {step === 'DETAILS' ? 'New Learning Path' : `Add Courses — ${path?.title}`}
          </h3>
          <button
            disabled={submitting}
            onClick={() => (step === 'COURSES' ? onSaved() : onClose())}
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
            <form onSubmit={handleCreatePath} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. New Manager Onboarding"
                  className="w-full px-4 py-3 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What will this path prepare learners for?"
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all resize-none"
                />
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

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Course Order</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNavigationMode('SEQUENTIAL')}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      navigationMode === 'SEQUENTIAL' ? 'bg-[#f46617] text-white shadow-sm' : 'bg-white text-slate-500 border border-orange-100'
                    }`}
                  >
                    Sequential (locked order)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNavigationMode('FREE')}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      navigationMode === 'FREE' ? 'bg-[#f46617] text-white shadow-sm' : 'bg-white text-slate-500 border border-orange-100'
                    }`}
                  >
                    Free (any order)
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mandatory}
                  onChange={e => setMandatory(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#f46617]"
                />
                <span className="text-sm font-semibold text-slate-700">Mandatory path</span>
              </label>

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
                {submitting ? 'Creating...' : 'Create Path & Add Courses'}
              </button>
            </form>
          )}

          {step === 'COURSES' && path && (
            <div className="space-y-5">
              {path.courses.length > 0 && (
                <div className="space-y-2">
                  {path.courses.map((pc, i) => (
                    <div key={pc.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
                      <span className="flex-1 text-sm font-semibold text-slate-700 truncate">{pc.course.title}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCourse(pc.courseId)}
                        className="text-slate-400 hover:text-red-500 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 p-4 rounded-2xl bg-orange-50/30 border border-orange-100/60">
                <select
                  value={selectedCourseId}
                  onChange={e => setSelectedCourseId(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-white border border-orange-100 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                >
                  <option value="">Select a published course…</option>
                  {coursesNotInPath.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddCourse}
                  disabled={submitting || !selectedCourseId}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add
                </button>
              </div>

              <button
                type="button"
                onClick={handlePublish}
                disabled={submitting || path.courses.length === 0}
                className="w-full btn-orange px-4 py-3 text-sm font-bold rounded-2xl flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Publish Path
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
