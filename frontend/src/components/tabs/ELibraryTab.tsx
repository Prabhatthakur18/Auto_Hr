import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  Download,
  FileText,
  Loader2,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { libraryApi, type LibraryDocument, type UserRole } from '../../services/api';

const MANAGEMENT_ROLES: UserRole[] = ['HR', 'LEADERSHIP', 'MANAGER'];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function saveDownloadedFile(payload: { fileName: string; mimeType: string; contentUrl: string }) {
  const link = document.createElement('a');
  link.href = payload.contentUrl;
  link.download = payload.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

interface ELibraryTabProps {
  role: UserRole;
}

export const ELibraryTab: React.FC<ELibraryTabProps> = ({ role }) => {
  const canManage = MANAGEMENT_ROLES.includes(role);
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = () => {
    setLoading(true);
    libraryApi.list()
      .then(res => { if (res.data) setDocuments(res.data.documents); })
      .catch(err => setError(err.message || 'Failed to load the library'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!file) {
      setError('Choose a PDF or Word document');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await libraryApi.upload(title.trim(), description.trim(), file);
      setTitle('');
      setDescription('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkRead = async (id: number) => {
    setBusyId(id);
    try {
      await libraryApi.markRead(id);
      setDocuments(prev => prev.map(d => (d.id === id ? { ...d, isRead: true, readCount: d.readCount + 1 } : d)));
    } catch (err: any) {
      setError(err.message || 'Failed to mark as read');
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = async (id: number) => {
    setBusyId(id);
    setError('');
    try {
      const res = await libraryApi.download(id);
      if (res.data) saveDownloadedFile(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to download document');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (document: LibraryDocument) => {
    if (!window.confirm(`Remove "${document.title}" from the library?`)) return;
    setError('');
    try {
      await libraryApi.remove(document.id);
      setDocuments(prev => prev.filter(d => d.id !== document.id));
    } catch (err: any) {
      setError(err.message || 'Failed to remove document');
    }
  };

  const filtered = documents.filter(d => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [d.title, d.description, d.fileName].filter(Boolean).join(' ').toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">E-Library</h2>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
          Shared PDFs and documents for everyone to read and download
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 rounded-2xl p-3 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <div className={canManage ? 'grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6' : 'space-y-4'}>
        {canManage && (
          <form onSubmit={handleUpload} className="bg-white rounded-3xl border border-orange-100/50 shadow-card p-5 h-fit space-y-4">
            <h3 className="text-sm font-black text-slate-800">Add Document</h3>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Leave Policy 2026"
                className="w-full px-3.5 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Description (optional)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="What is this document about?"
                className="w-full px-3.5 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#f46617] hover:file:bg-orange-100"
              />
              <p className="text-[10px] text-slate-400 font-semibold mt-2">PDF or Word document, up to 25MB.</p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn-orange w-full py-2.5 text-sm font-bold rounded-2xl disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {submitting ? 'Uploading...' : 'Upload Document'}
            </button>
          </form>
        )}

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title or description..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange shadow-sm"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-[#f46617] animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-orange-100/50 shadow-card">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50 text-slate-400" />
              <p className="font-semibold">{documents.length === 0 ? 'No documents yet' : 'No documents match your search'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(document => (
                <div key={document.id} className="bg-white rounded-3xl p-4 border border-orange-100/50 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#f46617] flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-slate-800 truncate">{document.title}</p>
                          {document.isRead && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
                              <CheckCircle className="w-2.5 h-2.5" /> Read
                            </span>
                          )}
                        </div>
                        {document.description && (
                          <p className="text-xs text-slate-500 font-semibold mt-1 line-clamp-2">{document.description}</p>
                        )}
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                          {document.fileName} · {formatBytes(document.sizeBytes)} · Added {new Date(document.createdAt).toLocaleDateString('en-IN')}
                          {document.uploadedBy && ` · by ${document.uploadedBy.username}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end flex-shrink-0">
                      {!document.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(document.id)}
                          disabled={busyId === document.id}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-50 hover:bg-orange-100 text-[#f46617] text-xs font-bold rounded-2xl border border-orange-100 transition-colors disabled:opacity-60"
                        >
                          {busyId === document.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          Mark as Read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDownload(document.id)}
                        disabled={busyId === document.id}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl border border-slate-200 transition-colors disabled:opacity-60"
                        title="Download"
                      >
                        {busyId === document.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Download
                      </button>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleDelete(document)}
                          className="inline-flex items-center justify-center p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl border border-red-100 transition-colors"
                          title="Remove document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
