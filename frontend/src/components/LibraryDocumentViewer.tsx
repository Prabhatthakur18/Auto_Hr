import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Loader2, AlertTriangle, FileText, FileWarning, Maximize2, Minimize2 } from 'lucide-react';
import { libraryApi, type LibraryDocument } from '../services/api';

interface LibraryDocumentViewerProps {
  document: LibraryDocument;
  onClose: () => void;
  onOpened: () => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function saveDownloadedFile(fileName: string, blobUrl: string) {
  const link = window.document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
}

export const LibraryDocumentViewer: React.FC<LibraryDocumentViewerProps> = ({ document, onClose, onOpened }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hasFiredOpened = useRef(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(window.document.fullscreenElement === modalRef.current);
    window.document.addEventListener('fullscreenchange', handleChange);
    return () => window.document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const toggleFullscreen = () => {
    if (window.document.fullscreenElement) {
      window.document.exitFullscreen();
    } else {
      modalRef.current?.requestFullscreen();
    }
  };

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    libraryApi.download(document.id)
      .then(async (res) => {
        if (cancelled || !res.data) return;
        // Large PDFs as a raw URL passed straight to an iframe src can be blocked by the
        // browser's PDF viewer sandboxing on some setups — a blob: URL avoids that and
        // also lets us revoke it (free memory) once the viewer closes.
        const fileResponse = await fetch(res.data.contentUrl);
        if (!fileResponse.ok) throw new Error('Failed to fetch document content');
        const blob = await fileResponse.blob();
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);
        if (!hasFiredOpened.current) {
          hasFiredOpened.current = true;
          onOpened();
        }
      })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to open document'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [document.id]);

  const handleDownload = () => {
    if (blobUrl) saveDownloadedFile(document.fileName, blobUrl);
  };

  const isPdf = document.mimeType === 'application/pdf';

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fade-in">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div
        ref={modalRef}
        className={`relative bg-white border border-orange-100/50 shadow-2xl overflow-hidden animate-scale-in flex flex-col ${
          isFullscreen ? 'w-screen h-screen rounded-none' : 'rounded-[32px] w-full max-w-4xl h-[90vh]'
        }`}
      >
        <div className="flex items-center justify-between gap-3 p-5 border-b border-orange-100/50 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#f46617] flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-800 truncate">{document.title}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                {document.fileName} · {formatBytes(document.sizeBytes)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit full screen' : 'Full screen'}
              className="p-1.5 rounded-xl hover:bg-orange-50 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-orange-50 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-slate-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-[#f46617] animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
              <p className="text-sm font-bold text-slate-700">{error}</p>
            </div>
          ) : isPdf && blobUrl ? (
            <iframe src={blobUrl} className="w-full h-full border-0" title={document.title} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 rounded-3xl bg-orange-50 text-[#f46617] flex items-center justify-center mb-4">
                <FileWarning className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-slate-700">Preview not available for Word documents</p>
              <p className="text-xs text-slate-500 font-semibold mt-1.5 max-w-sm">
                Download "{document.fileName}" to view it in Microsoft Word or a compatible app.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-orange-100/50 flex-shrink-0">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!blobUrl}
            className="btn-orange px-4 py-2.5 text-xs font-bold rounded-2xl flex items-center gap-1.5 disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>
    </div>,
    window.document.body
  );
};
