'use client';

import React, { useState, useEffect } from 'react';
import { useWindowStore } from '@/lib/stores/window.store';
import { FS, LocalFile } from '@/lib/fs';
import { useFileStore } from '@/lib/stores/file.store';
import { FileText, Film } from 'lucide-react';

export function DesktopIcons() {
  const { openWindow } = useWindowStore();
  const [desktopFiles, setDesktopFiles] = useState<LocalFile[]>([]);

  const refreshDesktop = async () => {
    try {
      let files = await FS.readDir('Desktop');
      if (files.length === 0) {
        await FS.write('Desktop/Welcome to ContinuaOS.md', `# Welcome to ContinuaOS! 🚀
This is a hyper-immersive, AI-powered Web Operating System built for **Writers, Travellers, Photographers, Students, Devs, and Designers**.

### Quick Actions:
- **Cmd+K (or Ctrl+K)**: Open the Omni-Search Palette.
- **Drag & Drop**: Drag files from your computer straight onto this desktop to upload them to the Virtual File System.
- **Double Click**: Try double-clicking any file to open it in the appropriate app!

Enjoy your new home.
`);
        await FS.write('Desktop/For Writers.md', `# Your Distraction-Free Zone ✍️

Writers need focus. 
1. Look at the top right Menu Bar. See the **FOCUS** button next to the clock? Click it.
2. It will instantly block all notifications, dim distractions, and set a 25-minute Pomodoro timer.
3. Open the **Notch Nook** (the pill at the top center) and play some Ambient Lo-Fi.
`);
        await FS.write('Desktop/For Devs.json', JSON.stringify({
          message: "Welcome to a fully local, POSIX-compliant environment.",
          architecture: "Next.js 15 + Zustand + React Server Components",
          features: [
            "Native background daemons",
            "IndexedDB Virtual File System",
            "Offline Edge AI inference via WebGPU",
            "Zero iframe sandboxing limits (Proxy bypass installed)"
          ]
        }, null, 2));
        await FS.write('Desktop/For Photographers.md', `# Organize Your Shoots 📸
Drop your raw files or JPEGs directly onto the Desktop.
Double click them to preview in the native Image Viewer.
Because the OS uses IndexedDB, your assets remain fully private and instantly accessible offline—perfect for reviewing shoots on a flight without Wi-Fi!
`);
        await FS.write('Desktop/For Students.md', `# The Ultimate Study Environment 🎓

1. Hit **Cmd+K** and search for "Ask Edge AI". It runs *locally*, meaning it won't crash when campus Wi-Fi drops.
2. Store your class notes in the \`Documents\` folder.
3. Keep track of your clipboard history (Cmd+Shift+V) when writing essays!
`);
        await FS.write('Desktop/For Travellers.md', `# Trip Itinerary: Tokyo 2026 ✈️
- **Flight**: JL007
- **Hotel**: Shinjuku Granbell
- **To-Do**: 
  - Visit TeamLab Planets
  - Eat at Omoide Yokocho

*Note: ContinuaOS syncs everything offline. Open this itinerary even when you're 30,000 feet in the air!*
`);
        await FS.write('Documents/Project Brief.txt', `Project Brief: Nike Campaign 2026\nStatus: In Review`);

        files = await FS.readDir('Desktop');
      }
      setDesktopFiles(files || []);
    } catch (e) {
      console.warn("Failed to read desktop files", e);
    }
  };

  useEffect(() => {
    refreshDesktop();
    const handleRefresh = () => refreshDesktop();
    window.addEventListener('os:refresh-desktop', handleRefresh);
    return () => window.removeEventListener('os:refresh-desktop', handleRefresh);
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
              const appId = useFileStore.getState().resolveSmartRoute(file.mimeType || '', file.name);
              if (appId) {
                openWindow(appId, file.name, { fileId: file.id, content: file.content, mimeType: file.mimeType });
              } else {
                openWindow('code', file.name, { fileId: file.id, content: file.content });
              }
            }}
          >
            {isImage && file.content ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img loading="lazy" src={file.content} alt={file.name} className="w-12 h-12 object-cover rounded shadow-lg" />
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
