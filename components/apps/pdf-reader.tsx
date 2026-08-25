'use client';

import React, { useState, useEffect, useRef } from 'react';
import { OSWindow } from '@/lib/os-context';
import { FileText, ZoomIn, ZoomOut, Download, Maximize, Printer, Loader2, RefreshCw } from 'lucide-react';
import { FS } from '@/lib/fs';

export function PdfReader({ window: osWindow }: { window: OSWindow }) {
  const [zoom, setZoom] = useState(100);
  const [pdfUrl, setPdfUrl] = useState<string | null>(osWindow.data?.url || null);
  const [loading, setLoading] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  const title = osWindow.data?.title || osWindow.data?.name || osWindow.title || 'Document.pdf';
  const fileId = osWindow.data?.fileId || osWindow.data?.path;

  useEffect(() => {
    let active = true;

    async function loadPdf() {
      if (osWindow.data?.url) {
        setPdfUrl(osWindow.data.url);
        return;
      }

      if (fileId) {
        setLoading(true);
        try {
          const file = await FS.read(fileId);
          if (!active) return;
          if (file?.content) {
            if (typeof file.content === 'string' && file.content.startsWith('blob:')) {
              setPdfUrl(file.content);
            } else if ((file.content as any) instanceof Blob) {
              if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
              const url = URL.createObjectURL(file.content as unknown as Blob);
              blobUrlRef.current = url;
              setPdfUrl(url);
            } else {
              // Binary string / base64 fallback
              const blob = new Blob([file.content as any], { type: 'application/pdf' });
              if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
              const url = URL.createObjectURL(blob);
              blobUrlRef.current = url;
              setPdfUrl(url);
            }
          }
        } catch (err) {
          console.error('Failed to load PDF from FS:', err);
        } finally {
          if (active) setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      active = false;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [fileId, osWindow.data?.url]);

  return (
    <div className="flex flex-col h-full bg-[#323639] text-white select-none">
      {/* Toolbar */}
      <div className="h-14 bg-[#323639] border-b border-black/20 flex items-center justify-between px-4 shadow-sm shrink-0">
        <div className="flex items-center gap-3 w-1/3 min-w-0">
          <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-red-400" />
          </div>
          <span className="font-medium text-sm truncate">{title}</span>
        </div>

        <div className="flex items-center gap-3 bg-black/20 px-4 py-1.5 rounded-xl border border-white/5">
          <button 
            onClick={() => setZoom(Math.max(50, zoom - 10))}
            className="hover:bg-white/10 p-1 rounded-lg transition-colors text-white/70 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-medium w-12 text-center">{zoom}%</span>
          <button 
            onClick={() => setZoom(Math.min(200, zoom + 10))}
            className="hover:bg-white/10 p-1 rounded-lg transition-colors text-white/70 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 w-1/3 justify-end">
          <button
            onClick={() => {
              const iframe = document.querySelector(`iframe[title="${title}"]`) as HTMLIFrameElement;
              if (iframe) (iframe as any).contentWindow?.print();
            }}
            className="hover:bg-white/10 p-2 rounded-xl transition-colors text-white/70 hover:text-white"
            title="Print Document"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (pdfUrl) {
                const a = document.createElement('a');
                a.href = pdfUrl;
                a.download = title.endsWith('.pdf') ? title : `${title}.pdf`;
                a.click();
              }
            }}
            className="hover:bg-white/10 p-2 rounded-xl transition-colors text-white/70 hover:text-white"
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-white/20 mx-1" />
          <button
            onClick={() => setZoom(100)}
            className="hover:bg-white/10 p-2 rounded-xl transition-colors text-white/70 hover:text-white"
            title="Fit to Width (100%)"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Reader Area */}
      <div className="flex-1 overflow-hidden flex justify-center bg-[#525659] p-4 relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center text-white/60 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-red-400" />
            <p className="text-sm font-medium">Opening PDF from storage...</p>
          </div>
        ) : pdfUrl ? (
          <div className="w-full h-full overflow-auto flex justify-center">
            <div className="relative" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
              <iframe 
                 src={`${pdfUrl}#toolbar=0&navpanes=0`} 
                 className="shadow-2xl bg-white rounded-lg"
                 style={{
                   width: '850px',
                   height: '1100px',
                   border: 'none',
                 }} 
                 title={title}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-white/40 gap-4">
            <FileText className="w-16 h-16 opacity-30" />
            <div className="text-center">
              <p className="text-sm font-medium text-white/70">No PDF loaded</p>
              <p className="text-xs text-white/40 mt-1">Open a PDF file from File Manager or drag a document here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
