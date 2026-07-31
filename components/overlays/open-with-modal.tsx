'use client';

import React, { useState } from 'react';
import { X, ExternalLink, Check, Sparkles } from 'lucide-react';
import { useFileStore, SmartRoute } from '@/lib/stores/file.store';
import { useWindowStore } from '@/lib/stores/window.store';

export interface OpenWithModalProps {
  filePath: string;
  fileName: string;
  mimeType: string;
  onClose: () => void;
}

const AVAILABLE_APPS = [
  { id: 'code', name: 'Code Editor', icon: '💻', desc: 'Syntax highlighting code & text editor' },
  { id: 'image-viewer', name: 'Image Viewer', icon: '🖼️', desc: 'High resolution image canvas & filter suite' },
  { id: 'media-player', name: 'Media Player', icon: '🎬', desc: 'Audio & Video playback' },
  { id: 'pdf-reader', name: 'PDF Reader', icon: '📄', desc: 'Document & PDF reader' },
  { id: 'moodboard', name: 'Moodboard Canvas', icon: '🎨', desc: 'Visual node board & clipping tool' },
  { id: 'power-browser', name: 'Power Browser', icon: '🌐', desc: 'Proxied web app & URL viewer' },
];

export function OpenWithModal({ filePath, fileName, mimeType, onClose }: OpenWithModalProps) {
  const [selectedAppId, setSelectedAppId] = useState<string>(AVAILABLE_APPS[0]!.id);
  const [setAsDefault, setSetAsDefault] = useState(true);
  const openWindow = useWindowStore((s) => s.openWindow);
  const addSmartRoute = useFileStore((s) => s.addSmartRoute);

  const ext = fileName.includes('.') ? `*.${fileName.split('.').pop()!.toLowerCase()}` : mimeType;

  const handleLaunch = () => {
    if (setAsDefault) {
      const selectedApp = AVAILABLE_APPS.find((a) => a.id === selectedAppId);
      const newRoute: SmartRoute = {
        pattern: ext,
        appId: selectedAppId,
        label: `Open in ${selectedApp?.name || selectedAppId}`,
      };
      addSmartRoute(newRoute);
    }

    openWindow(selectedAppId, fileName, { filePath, url: filePath, content: filePath });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm tracking-wide">Open File With...</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4">
          <div className="bg-slate-800/60 border border-white/5 p-3 rounded-xl flex items-center justify-between">
            <div className="flex flex-col truncate">
              <span className="font-semibold text-sm truncate text-white">{fileName}</span>
              <span className="text-xs text-slate-400 font-mono truncate">{filePath}</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded-md border border-cyan-500/30">
              {ext}
            </span>
          </div>

          <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Select Application</span>

          <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
            {AVAILABLE_APPS.map((app) => {
              const isSelected = selectedAppId === app.id;
              return (
                <button
                  key={app.id}
                  onClick={() => setSelectedAppId(app.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border text-left ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-lg shadow-cyan-500/10'
                      : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{app.icon}</span>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{app.name}</span>
                      <span className="text-xs text-slate-400">{app.desc}</span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                </button>
              );
            })}
          </div>

          <label className="flex items-center gap-2 pt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={setAsDefault}
              onChange={(e) => setSetAsDefault(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
            />
            <span className="text-xs text-slate-300">Always use this application for <code className="text-cyan-400">{ext}</code> files</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-cyan-500/20"
          >
            Open File <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
