import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Megaphone, Image as ImageIcon, Video, Link as LinkIcon, Pin, AlertTriangle, Plus, Loader2, Users, CalendarClock, Mail, Download } from 'lucide-react';
import { announcementApi, type Announcement } from '../services/api';

interface AnnouncementComposerProps {
  departments: string[];
  onClose: () => void;
  onCreated: (announcement: Announcement) => void;
}

const PRIORITY_OPTIONS: { value: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; label: string }[] = [
  { value: 'LOW', label: 'Normal' },
  { value: 'MEDIUM', label: 'Important' },
  { value: 'HIGH', label: 'High Priority' },
  { value: 'URGENT', label: 'Urgent' },
];

const MAX_FILES = 10;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

export const AnnouncementComposer: React.FC<AnnouncementComposerProps> = ({ departments, onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('LOW');
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [targetDepartment, setTargetDepartment] = useState('ALL');
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [downloadableFlags, setDownloadableFlags] = useState<boolean[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleFilesSelected = (selected: FileList | null) => {
    if (!selected) return;
    const incoming = Array.from(selected);
    const tooBig = incoming.find(f => f.size > MAX_FILE_BYTES);
    if (tooBig) {
      setError(`"${tooBig.name}" exceeds the 25MB limit`);
      return;
    }
    setError('');
    setFiles(prev => [...prev, ...incoming].slice(0, MAX_FILES));
    setDownloadableFlags(prev => [...prev, ...incoming.map(() => false)].slice(0, MAX_FILES));
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setDownloadableFlags(prev => prev.filter((_, i) => i !== index));
  };

  const toggleDownloadable = (index: number) =>
    setDownloadableFlags(prev => prev.map((v, i) => (i === index ? !v : v)));

  const addLink = () => {
    const trimmed = linkInput.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      setError('Enter a valid link (must start with http:// or https://)');
      return;
    }
    setError('');
    setLinks(prev => [...prev, trimmed]);
    setLinkInput('');
  };

  const removeLink = (index: number) => setLinks(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (scheduleForLater && (!scheduledAt || new Date(scheduledAt) <= new Date())) {
      setError('Choose a scheduled date and time in the future');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      if (content.trim()) formData.append('content', content.trim());
      formData.append('priority', priority);
      formData.append('isPinned', String(isPinned));
      formData.append('targetDepartment', targetDepartment);
      if (expiresAt) formData.append('expiresAt', new Date(expiresAt).toISOString());
      if (scheduleForLater) formData.append('scheduledAt', new Date(scheduledAt).toISOString());
      formData.append('sendEmail', String(sendEmail));
      if (links.length) formData.append('links', JSON.stringify(links));
      files.forEach(file => formData.append('media', file));
      if (files.length) formData.append('downloadableFlags', JSON.stringify(downloadableFlags));

      const res = await announcementApi.create(formData);
      if (res.data?.announcement) {
        onCreated(res.data.announcement);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to publish or schedule announcement');
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
            <Megaphone className="w-5 h-5 text-[#f46617]" />
            New Announcement
          </h3>
          <button
            disabled={submitting}
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-orange-50 text-slate-400 hover:text-slate-600 transition-colors"
          >
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
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Annual Day Celebration 2026"
              className="w-full px-4 py-3 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Message</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Share the details..."
              rows={4}
              className="w-full px-4 py-3 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Priority</label>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      priority === opt.value
                        ? 'bg-[#f46617] text-white shadow-sm shadow-orange-500/30'
                        : 'bg-orange-50/60 text-slate-500 hover:bg-orange-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Expires On (optional)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" /> Audience
            </label>
            <select
              value={targetDepartment}
              onChange={e => setTargetDepartment(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
            >
              <option value="ALL">All Departments</option>
              {departments.filter(d => d !== 'ALL').map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1.5">
              {targetDepartment === 'ALL'
                ? 'Visible to everyone in the company.'
                : `Visible only to employees in ${targetDepartment}.`}
            </p>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={e => setIsPinned(e.target.checked)}
              className="w-4 h-4 rounded accent-[#f46617]"
            />
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Pin className="w-3.5 h-3.5 text-[#f46617]" /> Pin to hero spotlight on Overview
            </span>
          </label>

          <div className="rounded-2xl border border-orange-100 bg-orange-50/30 p-4 space-y-4">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={scheduleForLater}
                onChange={e => {
                  setScheduleForLater(e.target.checked);
                  if (!e.target.checked) setScheduledAt('');
                }}
                className="w-4 h-4 rounded accent-[#f46617]"
              />
              <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-[#f46617]" /> Schedule for later
              </span>
            </label>

            {scheduleForLater && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Publish Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                />
                <p className="text-xs text-slate-400 mt-1.5">The announcement will appear automatically at this time.</p>
              </div>
            )}

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={e => setSendEmail(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded accent-[#f46617]"
              />
              <span>
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-[#f46617]" /> Also send by email
                </span>
                <span className="block text-xs text-slate-400 mt-1">
                  {targetDepartment === 'ALL'
                    ? 'Emails all active employees who have an email address.'
                    : `Emails active employees in ${targetDepartment}.`}
                </span>
              </span>
            </label>
          </div>

          {/* Media upload */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Photos & Videos</label>
            <label className="flex items-center justify-center gap-2 px-4 py-4 rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/30 text-slate-500 text-sm font-semibold cursor-pointer hover:bg-orange-50/60 transition-all">
              <ImageIcon className="w-4 h-4" />
              <Video className="w-4 h-4" />
              Click to upload images or a short video
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={e => handleFilesSelected(e.target.files)}
              />
            </label>

            {files.length > 0 && (
              <div className="flex flex-col gap-2 mt-3">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-600">
                    {file.type.startsWith('video/') ? <Video className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> : <ImageIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                    <span className="truncate max-w-[140px] flex-shrink-0">{file.name}</span>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none ml-auto">
                      <input
                        type="checkbox"
                        checked={downloadableFlags[i] || false}
                        onChange={() => toggleDownloadable(i)}
                        className="w-3.5 h-3.5 rounded accent-[#f46617]"
                      />
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      <span>Allow download</span>
                    </label>
                    <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500 flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Link embed */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">YouTube, Instagram or Web Link</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  value={linkInput}
                  onChange={e => setLinkInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
                  placeholder="https://youtube.com/... or https://instagram.com/..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                />
              </div>
              <button
                type="button"
                onClick={addLink}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {links.length > 0 && (
              <div className="space-y-2 mt-3">
                {links.map((link, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-600">
                    <span className="truncate">{link}</span>
                    <button type="button" onClick={() => removeLink(i)} className="text-slate-400 hover:text-red-500 flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 text-sm font-bold rounded-2xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 btn-orange px-4 py-3 text-sm font-bold rounded-2xl flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
              {submitting
                ? (scheduleForLater ? 'Scheduling...' : 'Publishing...')
                : (scheduleForLater ? 'Schedule Announcement' : 'Publish Announcement')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
