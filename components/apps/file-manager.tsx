'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useOS, OSWindow } from '@/lib/os-context';
import { 
  Folder, File as FileIcon, FileText, Image as ImageIcon, Video, Box, Search, 
  Plus, Trash2, HardDrive, RefreshCw, ChevronRight, Download, Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { FS, LocalFile } from '@/lib/fs';

export function FileManager({ window: osWindow }: { window: OSWindow }) {
  const { openWindow } = useOS();
  
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('Desktop');
  const [search, setSearch] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    setIsLoaded(false);
    try {
      const entries = await FS.readDir(currentPath === 'Root' ? '' : currentPath);
      setFiles(entries || []);
    } catch (err) {
      console.error("Failed to read local files:", err);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [currentPath]);

  const handleFileOpen = (file: LocalFile) => {
    if (file.mimeType?.startsWith('image/')) {
       openWindow('moodboard', 'Image Viewer', { url: file.content || file.id });
    } else if (file.mimeType?.startsWith('video/') || file.mimeType?.startsWith('audio/')) {
       openWindow('media-player', 'Media Player', { fileUrl: file.content || file.id, mimeType: file.mimeType });
    } else if (file.name.toLowerCase().endsWith('.pdf')) {
       openWindow('pdf', `Reading: ${file.name}`, { url: file.content || file.id });
    } else {
       openWindow('code', 'Code Editor', { fileId: file.id, content: file.content });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const filePath = currentPath === 'Root' ? file.name : `${currentPath}/${file.name}`;
      await FS.write(filePath, file, file.type);
    }
    fetchFiles();
  };

  const deleteFile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this file?")) return;
    await FS.delete(id);
    fetchFiles();
  };

  const downloadFile = (file: LocalFile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!file.content) return;
    const a = document.createElement('a');
    a.href = file.content;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const createNewFile = async () => {
    const name = prompt("Enter new file name (e.g. document.txt):");
    if (!name) return;
    const filePath = currentPath === 'Root' ? name : `${currentPath}/${name}`;
    await FS.write(filePath, "");
    fetchFiles();
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-full h-full flex bg-[#0f0f0f] text-[#ececec] font-sans overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-56 bg-[#1a1a1a] border-r border-white/5 flex flex-col shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-white/5 text-sm font-semibold tracking-wide text-white/80">
          <HardDrive className="w-4 h-4 mr-2 text-emerald-500" />
          Virtual OS Disk
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-white/40">Locations</div>
          <div className="flex flex-col gap-1 px-2">
            {['Root', 'Desktop', 'Documents', 'Downloads', 'Media'].map(loc => (
              <button
                key={loc}
                onClick={() => {
                  if (loc !== 'Root' && loc !== 'Desktop') {
                     // Auto-create directories if they don't exist by just changing path
                     // the FS handles flat structures dynamically based on prefixes
                  }
                  setCurrentPath(loc);
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  currentPath === loc ? "bg-blue-600 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                )}
              >
                <Folder className={cn("w-4 h-4", currentPath === loc ? "text-white" : "text-blue-400")} fill="currentColor" />
                {loc}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a]">
        
        {/* Toolbar */}
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#121212] shrink-0">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-white/80 font-medium">
             <button onClick={() => setCurrentPath('Root')} className="hover:text-blue-400 transition-colors">OS</button>
             <ChevronRight className="w-3 h-3 text-white/40" />
             <span className="text-white">{currentPath}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input 
                type="text" 
                placeholder="Search files..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-48 bg-[#1a1a1a] border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-sm text-white outline-none focus:border-blue-500 transition-colors shadow-inner"
              />
            </div>
            
            <div className="h-6 w-px bg-white/10 mx-1"></div>
            
            <button onClick={fetchFiles} className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors" title="Refresh">
               <RefreshCw className="w-4 h-4" />
            </button>
            
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-sm font-medium transition-colors" title="Upload Files">
               <Upload className="w-4 h-4" /> Upload
            </button>
            
            <button onClick={createNewFile} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-md text-white text-sm font-medium transition-colors shadow-lg shadow-blue-500/20">
               <Plus className="w-4 h-4" /> New File
            </button>
          </div>
        </div>

        {/* File Grid */}
        <div className="flex-1 overflow-y-auto p-6">
           {!isLoaded ? (
             <div className="flex items-center justify-center h-full text-white/40 text-sm">Loading files...</div>
           ) : filteredFiles.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full gap-4 text-white/40">
               <Folder className="w-16 h-16 opacity-20" />
               <p className="text-sm">This folder is empty.</p>
               <button onClick={createNewFile} className="px-4 py-2 bg-white/5 rounded-md text-white hover:bg-white/10 transition-colors">Create a file</button>
             </div>
           ) : (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-12">
               {filteredFiles.map((file, i) => {
                 const isMedia = file.mimeType?.startsWith('video/') || file.mimeType?.startsWith('audio/');
                 const isImage = file.mimeType?.startsWith('image/');
                 const isPdf = file.name.toLowerCase().endsWith('.pdf');
                 
                 return (
                   <div 
                     key={i} 
                     onDoubleClick={() => handleFileOpen(file)}
                     className="group flex flex-col items-center p-4 rounded-xl border border-transparent hover:bg-white/5 hover:border-white/10 hover:shadow-xl transition-all cursor-pointer relative"
                   >
                     {/* Action Buttons */}
                     <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 z-10">
                       <button onClick={(e) => downloadFile(file, e)} className="p-1.5 hover:bg-blue-500 rounded-md bg-black/60 backdrop-blur" title="Download">
                         <Download className="w-3.5 h-3.5 text-white" />
                       </button>
                       <button onClick={(e) => deleteFile(file.id, e)} className="p-1.5 hover:bg-red-500 rounded-md bg-black/60 backdrop-blur" title="Delete">
                         <Trash2 className="w-3.5 h-3.5 text-white" />
                       </button>
                     </div>
                     
                     <div className="w-16 h-16 mb-4 flex items-center justify-center relative">
                       {isImage && file.content ? (
                         <img src={file.content} alt={file.name} className="w-16 h-16 object-cover rounded-lg shadow-md" />
                       ) : isMedia ? (
                         <Video className="w-12 h-12 text-rose-400 drop-shadow-md" />
                       ) : isPdf ? (
                         <FileText className="w-12 h-12 text-orange-500 drop-shadow-md" />
                       ) : (
                         <FileText className="w-12 h-12 text-white/50 drop-shadow-md" />
                       )}
                     </div>
                     <span className="text-xs font-medium text-white/90 text-center line-clamp-2 w-full break-words">
                       {file.name}
                     </span>
                     <span className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">
                       {isImage ? 'Image' : isMedia ? 'Media' : isPdf ? 'PDF' : 'Document'}
                     </span>
                   </div>
                 )
               })}
             </div>
           )}
        </div>

      </div>
    </div>
  );
}
