'use client';

import React, { useState, useEffect } from 'react';
import { useWindowStore } from '@/lib/stores/window.store';
import { FS, LocalFile } from '@/lib/fs';
import { FileText, Film } from 'lucide-react';

export function DesktopIcons() {
  const { openWindow } = useWindowStore();
  const [desktopFiles, setDesktopFiles] = useState<LocalFile[]>([]);

  const refreshDesktop = async () => {
    try {
      let files = await FS.readDir('Desktop');
      if (files.length === 0) {
        await FS.write('Desktop/Welcome to Ziklag OS.txt', `Welcome to Ziklag OS!

This is a local-first web operating system designed for managing multiple ventures seamlessly.

Quick Start:
1. Double click files in the File Manager to open them.
2. Drag and drop local files from your computer into the OS window to import them.
3. Use the App Hub to install ecosystem packs like Ziklag Diagnostics or Clothing Brand.
4. Try System AI in the dock for natural language control.

Enjoy your workspace!`);
        await FS.write('Documents/Project Brief.txt', `Project Brief: Nike Campaign 2026

Goal: Relaunch the Nike Force 40th anniversary interactive landing page.
Deliverables:
- Campaign landing page live preview
- Design specs and moodboards
- Budget proposals

Status: In Review`);
        await FS.write('Downloads/Minified Specs.json', JSON.stringify({
          projectName: "ContinuaOS",
          version: "2.0.0",
          codename: "Ziklag",
          environment: "Production"
        }, null, 2));

        files = await FS.readDir('Desktop');
      }
      setDesktopFiles(files || []);
    } catch (e) {
      console.warn("Failed to read desktop files", e);
    }
  };

  useEffect(() => {
    refreshDesktop();
  }, []);

  return (
    <div className="absolute inset-0 p-6 flex flex-col flex-wrap gap-6 items-start content-start z-0 pointer-events-auto">
      {desktopFiles.map((file, i) => {
        const isMedia = file.mimeType?.startsWith('video/') || file.mimeType?.startsWith('audio/');
        const isImage = file.mimeType?.startsWith('image/');
        return (
          <div
            key={i}
            className="w-20 flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-white/10 cursor-pointer group transition-colors"
            onDoubleClick={() => {
              if (isMedia) {
                openWindow('media-player', 'Media Player', { fileUrl: file.content || file.id, mimeType: file.mimeType });
              } else {
                openWindow('code', 'Editor', { fileId: file.id });
              }
            }}
          >
            {isImage && file.content ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={file.content} alt={file.name} className="w-12 h-12 object-cover rounded shadow-lg" />
            ) : isMedia ? (
              <Film className="w-12 h-12 text-rose-400 drop-shadow-md" />
            ) : (
              <FileText className="w-12 h-12 text-white/80 drop-shadow-md" />
            )}
            <span className="text-xs text-center font-medium text-white drop-shadow-md px-1 bg-black/30 rounded leading-tight line-clamp-2">
              {file.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
