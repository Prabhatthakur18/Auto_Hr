import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Download,
  Edit3,
  FileArchive,
  FileImage,
  FileText,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  documentApi,
  type EmployeeDocument,
  type EmployeeDocumentDownloadPayload,
  type EmployeeDocumentWithEmployee,
  type UserRole,
} from '../services/api';
import { compressDocumentImage } from '../utils/imageCompression';

const MANAGEMENT_ROLES: UserRole[] = ['HR', 'LEADERSHIP', 'MANAGER'];

type DocumentSubTab = 'mine' | 'staff';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function saveDownloadedDocument(document: EmployeeDocumentDownloadPayload, delayMs = 0) {
  window.setTimeout(() => {
    const link = window.document.createElement('a');
    link.href = document.dataUrl;
    link.download = document.fileName || `${document.title}.${document.mimeType === 'application/pdf' ? 'pdf' : 'jpg'}`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  }, delayMs);
}

async function prepareDocumentFile(file: File) {
  if (file.type.startsWith('image/')) {
    return compressDocumentImage(file);
  }
  return file;
}

const DocumentIcon: React.FC<{ mimeType: string; className?: string }> = ({ mimeType, className = 'w-5 h-5' }) => {
  if (mimeType.startsWith('image/')) return <FileImage className={className} />;
  return <FileText className={className} />;
};

const EmptyState: React.FC<{ staff?: boolean }> = ({ staff }) => (
  <div className="text-center py-14 bg-white rounded-3xl border border-orange-100/50 shadow-card">
    <FileArchive className="w-12 h-12 mx-auto mb-3 text-slate-300" />
    <p className="font-bold text-slate-700">{staff ? 'No employee documents found' : 'No documents uploaded yet'}</p>
    <p className="text-xs text-slate-400 font-semibold mt-1">
      {staff ? 'Uploaded employee documents will appear here.' : 'Add your important PDF or image documents here.'}
    </p>
  </div>
);

export const DocumentManagerPanel: React.FC<{ role: UserRole; currentEmployeeId: number | null }> = ({ role, currentEmployeeId }) => {
  const isManagement = MANAGEMENT_ROLES.includes(role);
  const [subTab, setSubTab] = useState<DocumentSubTab>('mine');
  const [myDocuments, setMyDocuments] = useState<EmployeeDocument[]>([]);
  const [staffDocuments, setStaffDocuments] = useState<EmployeeDocumentWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | 'all' | null>(null);
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editing, setEditing] = useState<EmployeeDocument | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadMine = async () => {
    if (!currentEmployeeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await documentApi.listMine();
      setMyDocuments(res.data?.documents ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    if (!isManagement) return;
    setStaffLoading(true);
    try {
      const res = await documentApi.listTeam();
      setStaffDocuments(res.data?.documents ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to load employee documents');
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    void loadMine();
    if (isManagement) void loadStaff();
  }, [isManagement, currentEmployeeId]);

  const resetForm = () => {
    setTitle('');
    setSelectedFile(null);
    setEditing(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!editing && !selectedFile) {
      setError('Choose a PDF or image document');
      return;
    }

    setSubmitting(true);
    try {
      const file = selectedFile ? await prepareDocumentFile(selectedFile) : undefined;
      if (editing) {
        await documentApi.update(editing.id, { title: title.trim(), file });
      } else if (file) {
        await documentApi.upload(title.trim(), file);
      }
      resetForm();
      await loadMine();
      if (isManagement) await loadStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to save document');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (document: EmployeeDocument) => {
    setEditing(document);
    setTitle(document.title);
    setSelectedFile(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (document: EmployeeDocument) => {
    if (!window.confirm(`Remove "${document.title}"?`)) return;
    setError('');
    try {
      await documentApi.delete(document.id);
      await loadMine();
      if (isManagement) await loadStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to remove document');
    }
  };

  const handleDownload = async (documentId: number) => {
    setDownloadingId(documentId);
    setError('');
    try {
      const res = await documentApi.download(documentId);
      if (res.data?.document) saveDownloadedDocument(res.data.document);
    } catch (err: any) {
      setError(err.message || 'Failed to download document');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async (employeeId: number) => {
    setDownloadingId('all');
    setError('');
    try {
      const res = await documentApi.downloadAll(employeeId);
      const documents = res.data?.documents ?? [];
      documents.forEach((document, index) => saveDownloadedDocument(document, index * 250));
    } catch (err: any) {
      setError(err.message || 'Failed to download documents');
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredStaffDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return staffDocuments;
    return staffDocuments.filter(document => {
      const haystack = [
        document.title,
        document.fileName,
        document.employee.name,
        document.employee.department,
        document.employee.position,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [staffDocuments, search]);

  const staffGroups = useMemo(() => {
    const groups = new Map<number, { employee: EmployeeDocumentWithEmployee['employee']; documents: EmployeeDocumentWithEmployee[] }>();
    for (const document of filteredStaffDocuments) {
      const group = groups.get(document.employeeId) ?? { employee: document.employee, documents: [] };
      group.documents.push(document);
      groups.set(document.employeeId, group);
    }
    return [...groups.values()];
  }, [filteredStaffDocuments]);

  const renderDocumentRow = (document: EmployeeDocument, editable: boolean) => (
    <div key={document.id} className="bg-white rounded-3xl p-4 border border-orange-100/50 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#f46617] flex items-center justify-center flex-shrink-0">
            <DocumentIcon mimeType={document.mimeType} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-800 truncate">{document.title}</p>
            <p className="text-xs text-slate-500 font-semibold mt-1 truncate">
              {document.fileName} · {formatBytes(document.sizeBytes)}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
              Added {new Date(document.createdAt).toLocaleDateString('en-IN')} · Downloads {document._count?.downloads ?? 0}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => handleDownload(document.id)}
            disabled={downloadingId === document.id}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl border border-slate-200 transition-colors disabled:opacity-60"
            title="Download"
          >
            {downloadingId === document.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download
          </button>
          {editable && (
            <>
              <button
                type="button"
                onClick={() => startEdit(document)}
                className="inline-flex items-center justify-center p-2 bg-orange-50 hover:bg-orange-100 text-[#f46617] rounded-2xl border border-orange-100 transition-colors"
                title="Edit document"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(document)}
                className="inline-flex items-center justify-center p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl border border-red-100 transition-colors"
                title="Remove document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Document Manager</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
            Store employee documents and download them when needed.
          </p>
        </div>
        {isManagement && (
          <div className="flex bg-orange-50/60 p-1.5 rounded-2xl border border-orange-100/50 w-fit">
            {([
              { id: 'mine' as const, label: 'My Documents' },
              { id: 'staff' as const, label: role === 'MANAGER' ? 'Team Documents' : 'Employee Documents' },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  subTab === tab.id ? 'bg-white text-[#f46617] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 rounded-2xl p-3 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {subTab === 'mine' && (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-orange-100/50 shadow-card p-5 h-fit space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">{editing ? 'Edit Document' : 'Add Document'}</h3>
              {editing && (
                <button type="button" onClick={resetForm} className="p-1.5 rounded-xl hover:bg-slate-50 text-slate-400" title="Cancel edit">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Title</label>
              <input
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="Aadhaar card, PAN, certificate..."
                className="w-full px-3.5 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                {editing ? 'Replace File (Optional)' : 'Document File'}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={event => setSelectedFile(event.target.files?.[0] ?? null)}
                className="w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#f46617] hover:file:bg-orange-100"
              />
              <p className="text-[10px] text-slate-400 font-semibold mt-2">PDF, JPG, PNG, or WebP. Images are compressed before upload.</p>
            </div>
            <button
              type="submit"
              disabled={submitting || !currentEmployeeId}
              className="btn-orange w-full py-2.5 text-sm font-bold rounded-2xl disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Upload Document'}
            </button>
          </form>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500 font-semibold">
                <span className="font-black text-slate-800">{myDocuments.length}</span> saved document{myDocuments.length === 1 ? '' : 's'}
              </p>
              {currentEmployeeId && myDocuments.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleDownloadAll(currentEmployeeId)}
                  disabled={downloadingId === 'all'}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl border border-slate-200 transition-colors disabled:opacity-60"
                >
                  {downloadingId === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download All
                </button>
              )}
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-[#f46617] animate-spin" />
              </div>
            ) : myDocuments.length === 0 ? (
              <EmptyState />
            ) : (
              myDocuments.map(document => renderDocumentRow(document, true))
            )}
          </div>
        </div>
      )}

      {subTab === 'staff' && isManagement && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search employee, department, position, document title..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange shadow-sm"
            />
          </div>

          {staffLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-[#f46617] animate-spin" />
            </div>
          ) : staffGroups.length === 0 ? (
            <EmptyState staff />
          ) : (
            staffGroups.map(group => (
              <div key={group.employee.id} className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-orange-50/35 border border-orange-100/60 rounded-3xl px-4 py-3">
                  <div>
                    <p className="text-sm font-black text-slate-800">{group.employee.name}</p>
                    <p className="text-xs text-slate-500 font-semibold">
                      {group.employee.department || 'No department'} · {group.employee.position || 'No position'} · {group.documents.length} document{group.documents.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadAll(group.employee.id)}
                    disabled={downloadingId === 'all'}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-2xl border border-orange-100 transition-colors disabled:opacity-60"
                  >
                    {downloadingId === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Download All
                  </button>
                </div>
                {group.documents.map(document => renderDocumentRow(document, false))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
