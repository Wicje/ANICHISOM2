'use client';

import React, { useState } from 'react';
import { OSWindow } from '@/lib/os-context';
import { FileText, ZoomIn, ZoomOut, Download, Maximize, Printer } from 'lucide-react';

export function PdfReader({ window }: { window: OSWindow }) {
  const [zoom, setZoom] = useState(100);

  // Fallback PDF file if nothing passed via data
  const pdfUrl = window.data?.url || '/sample-document.pdf';
  const title = window.data?.title || 'System Architecture.pdf';

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
          <button className="hover:bg-white/10 p-2 rounded-full transition-colors text-white/70 hover:text-white" title="Print">
            <Printer className="w-4 h-4" />
          </button>
          <button className="hover:bg-white/10 p-2 rounded-full transition-colors text-white/70 hover:text-white" title="Download">
            <Download className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-white/20 mx-1" />
          <button className="hover:bg-white/10 p-2 rounded-full transition-colors text-white/70 hover:text-white" title="Fit to width">
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Reader Area */}
      <div className="flex-1 overflow-auto custom-scrollbar flex justify-center bg-[#525659] p-8">
        <div 
          className="bg-white shadow-2xl transition-transform origin-top flex flex-col"
          style={{ 
            width: '800px', 
            minHeight: '1131px', 
            transform: `scale(${zoom / 100})`,
            marginBottom: `${((zoom - 100) / 100) * 1131}px`
          }}
        >
          {/* Simulated PDF Content */}
          <div className="p-16 text-black">
            <h1 className="text-4xl font-bold mb-8">ANICHISOM OS - Vision v2.0</h1>
            <p className="text-gray-600 mb-8 font-serif leading-relaxed">
              ANICHISOM OS is a universal workspace platform that eliminates machine-switching and context-switching friction for anyone running multiple ventures — giving each user a persistent, personalized environment that connects to every tool they use and grows with every new venture they start.
            </p>
            <div className="h-px bg-gray-300 w-full mb-8" />
            <h2 className="text-2xl font-semibold mb-4">1. The Three-Layer Architecture</h2>
            <ul className="list-disc pl-6 space-y-3 font-serif text-gray-700">
              <li><strong>Layer 3 — Ecosystem:</strong> Marketplace, install what you need. (ANICHISOM Pack, Developer Pack)</li>
              <li><strong>Layer 2 — Built-in Apps:</strong> Browser, Campaign Lab, Moodboard, Files, Notes, PDF Reader.</li>
              <li><strong>Layer 1 — The Core:</strong> Persistent State, Auth + Workspaces, Real-time Presence, Event Sourcing.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
