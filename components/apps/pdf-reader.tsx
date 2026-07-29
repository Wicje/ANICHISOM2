'use client';

import React, { useState } from 'react';
import { OSWindow } from '@/lib/os-context';
import { FileText, ZoomIn, ZoomOut, Download, Maximize, Printer } from 'lucide-react';

export function PdfReader({ window }: { window: OSWindow }) {
  const [zoom, setZoom] = useState(100);

  const pdfUrl = window.data?.url;
  const title = window.data?.title || 'Document.pdf';

  return (
    <div className="flex flex-col h-full bg-[#323639] text-white">
      {/* Toolbar */}
      <div className="h-14 bg-[#323639] border-b border-black/20 flex items-center justify-between px-4 shadow-sm shrink-0">
        <div className="flex items-center gap-3 w-1/3">
          <div className="w-8 h-8 bg-red-500/20 rounded flex items-center justify-center">
            <FileText className="w-5 h-5 text-red-400" />
          </div>
          <span className="font-medium text-sm truncate">{title}</span>
        </div>

        <div className="flex items-center gap-4 bg-black/20 px-4 py-1.5 rounded-md border border-white/5">
          <button 
            onClick={() => setZoom(Math.max(50, zoom - 10))}
            className="hover:bg-white/10 p-1 rounded transition-colors text-white/70 hover:text-white"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium w-12 text-center">{zoom}%</span>
          <button 
            onClick={() => setZoom(Math.min(200, zoom + 10))}
            className="hover:bg-white/10 p-1 rounded transition-colors text-white/70 hover:text-white"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 w-1/3 justify-end">
          <button onClick={() => { const iframe = document.querySelector('iframe[title="' + title + '"]'); if(iframe) (iframe as any).contentWindow?.print(); }} className="hover:bg-white/10 p-2 rounded-full transition-colors text-white/70 hover:text-white" title="Print">
            <Printer className="w-4 h-4" />
          </button>
          <button onClick={() => { if (pdfUrl) { const a = document.createElement('a'); a.href = pdfUrl; a.download = title; a.click(); }}} className="hover:bg-white/10 p-2 rounded-full transition-colors text-white/70 hover:text-white" title="Download">
            <Download className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-white/20 mx-1" />
          <button onClick={() => setZoom(100)} className="hover:bg-white/10 p-2 rounded-full transition-colors text-white/70 hover:text-white" title="Fit to width">
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Reader Area */}
      <div className="flex-1 overflow-hidden flex justify-center bg-[#525659] p-4">
        {pdfUrl ? (
          <div className="w-full h-full overflow-hidden flex justify-center">
            <iframe 
               src={`${pdfUrl}#view=FitH`} 
               className="shadow-2xl bg-white origin-top"
               style={{
                 width: '100%',
                 height: '100%',
                 transform: `scale(${zoom / 100})`,
                 transformOrigin: 'top center',
               }} 
               title={title}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-white/40 gap-4">
            <FileText className="w-16 h-16 opacity-30" />
            <div className="text-center">
              <p className="text-sm font-medium">No PDF loaded</p>
              <p className="text-xs text-white/30 mt-1">Open a PDF file from Files to view it here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
