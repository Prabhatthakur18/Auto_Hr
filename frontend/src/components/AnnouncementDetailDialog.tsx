import React from 'react';
import { createPortal } from 'react-dom';
import { X, Megaphone, Pin, Users, Download } from 'lucide-react';
import type { Announcement } from '../services/api';

interface AnnouncementDetailDialogProps {
  announcement: Announcement;
  onClose: () => void;
}

const PRIORITY_LABELS: Record<Announcement['priority'], string> = {
  LOW: 'Normal',
  MEDIUM: 'Important',
  HIGH: 'High Priority',
  URGENT: 'Urgent',
};

function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function getVimeoEmbedUrl(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}` : null;
}

export const AnnouncementDetailDialog: React.FC<AnnouncementDetailDialogProps> = ({ announcement, onClose }) => {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-[32px] border border-orange-100/50 shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-orange-100/50 flex-shrink-0">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#f46617]" />
            Announcement
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-orange-50 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              announcement.priority === 'URGENT' ? 'bg-red-50 text-red-600 border border-red-100' :
              announcement.priority === 'HIGH' ? 'bg-orange-50 text-[#f46617] border border-orange-100' :
              announcement.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-605 border border-blue-100' : 'bg-slate-50 text-slate-500 border border-slate-100'
            }`}>
              {PRIORITY_LABELS[announcement.priority]}
            </span>
            {announcement.isPinned && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                <Pin className="w-3 h-3" /> Pinned
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
              <Users className="w-3 h-3" /> {announcement.targetDepartment || 'All Departments'}
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">{announcement.title}</h2>
            {announcement.content && (
              <p className="text-sm text-slate-600 mt-3 leading-relaxed whitespace-pre-line">{announcement.content}</p>
            )}
          </div>

          {announcement.media && announcement.media.length > 0 && (
            <div className="space-y-3">
              {announcement.media.map(m => (
                <div key={m.id} className="rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
                  {m.type === 'IMAGE' && <img src={m.url} alt="" className="w-full max-h-[420px] object-contain bg-slate-900/5" />}
                  {m.type === 'VIDEO_FILE' && <video src={m.url} controls className="w-full max-h-[420px]" />}
                  {(m.type === 'IMAGE' || m.type === 'VIDEO_FILE') && m.isDownloadable && (
                    <a
                      href={m.url}
                      download
                      className="flex items-center justify-center gap-2 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  )}
                  {m.type === 'VIDEO_EMBED' && (() => {
                    const embedUrl = getYouTubeEmbedUrl(m.url) || getVimeoEmbedUrl(m.url);
                    return embedUrl ? (
                      <iframe
                        src={embedUrl}
                        className="w-full aspect-video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        frameBorder="0"
                      />
                    ) : (
                      <a href={m.url} target="_blank" rel="noopener noreferrer" className="block p-4 text-sm font-bold text-[#f46617] underline">
                        Watch Video
                      </a>
                    );
                  })()}
                  {(m.type === 'SOCIAL_EMBED' || m.type === 'LINK') && (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 p-6 bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 transition-colors"
                    >
                      View Linked Content
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-t border-orange-100/30 pt-4">
            <span>By {announcement.createdBy?.username || 'HR'}</span>
            <span>•</span>
            <span>{new Date(announcement.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
