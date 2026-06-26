import React, { useEffect, useState } from 'react';
import { AlertTriangle, Download, FileArchive, FileImage, FileText, Loader2 } from 'lucide-react';
import { documentApi, type EmployeeDocument } from '../../services/api';

interface EmployeeDocumentsTabProps {
  employeeId: number;
  employeeName: string;
}

interface DownloadPayload {
  id: number;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function saveDocument(document: DownloadPayload, delayMs = 0) {
  window.setTimeout(() => {
    const link = window.document.createElement('a');
    link.href = document.dataUrl;
    link.download = document.fileName || document.title;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  }, delayMs);
}

const DocumentIcon: React.FC<{ mimeType: string }> = ({ mimeType }) => (
  mimeType.startsWith('image/')
    ? <FileImage className="w-5 h-5" />
    : <FileText className="w-5 h-5" />
);

export const EmployeeDocumentsTab: React.FC<EmployeeDocumentsTabProps> = ({ employeeId, employeeName }) => {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | 'all' | null>(null);
  const [error, setError] = useState('');

  const loadDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await documentApi.getEmployeeDocuments(employeeId);
      setDocuments(res.data?.documents ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
  }, [employeeId]);

  const handleDownload = async (documentId: number) => {
    setDownloadingId(documentId);
    setError('');
    try {
      const res = await documentApi.download(documentId);
      if (res.data?.document) saveDocument(res.data.document);
    } catch (err: any) {
      setError(err.message || 'Failed to download document');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    setDownloadingId('all');
    setError('');
    try {
      const res = await documentApi.downloadAll(employeeId);
      (res.data?.documents ?? []).forEach((document, index) => saveDocument(document, index * 250));
    } catch (err: any) {
      setError(err.message || 'Failed to download documents');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-[#f46617] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-800">Documents</h3>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            {documents.length} document{documents.length === 1 ? '' : 's'} uploaded by {employeeName}
          </p>
        </div>
        {documents.length > 0 && (
          <button
            type="button"
            onClick={handleDownloadAll}
            disabled={downloadingId === 'all'}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl border border-slate-200 transition-colors disabled:opacity-60"
          >
            {downloadingId === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download All
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 rounded-2xl p-3 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-3xl border border-orange-100/50 shadow-card">
          <FileArchive className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-bold text-slate-700">No documents uploaded</p>
          <p className="text-xs text-slate-400 font-semibold mt-1">This employee has not added any documents yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map(document => (
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

                <button
                  type="button"
                  onClick={() => handleDownload(document.id)}
                  disabled={downloadingId === document.id}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl border border-slate-200 transition-colors disabled:opacity-60"
                >
                  {downloadingId === document.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
