'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useOS, OSWindow } from '@/lib/os-context';
import { Folder, File as FileIcon, FileText, Image as ImageIcon, Video, Box, Search, Plus, Trash2, Cloud, Download, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { get, set } from 'idb-keyval';
import { format } from 'date-fns';
import { initAuth, googleSignIn, getAccessToken, logout, db, collection, onSnapshot, setDoc, doc, deleteDoc as firestoreDeleteDoc, query, where, limit } from '@/lib/firebase';
import { FS } from '@/lib/fs';

type FileItem = {
  id: string;
  name: string;
  type: 'image' | 'doc' | 'video' | 'design' | 'folder' | 'project' | 'unknown';
  date: string;
  size: string;
  content?: string; // base64 or text
  projectId?: string;
  isDrive?: boolean;
};

const initialFiles: FileItem[] = [
  { id: '1', name: 'Nike Campaign', type: 'project', date: 'Oct 23', size: '--', projectId: 'nike-campaign' },
  { id: '2', name: 'Tesla Redesign', type: 'project', date: 'Oct 22', size: '--', projectId: 'tesla-redesign' },
  { id: '3', name: 'Portfolio OS', type: 'project', date: 'Oct 20', size: '--', projectId: 'portfolio-v3' },
  { id: '4', name: 'Moodboard_01.png', type: 'image', date: 'Oct 19', size: '2.4 MB' },
  { id: '5', name: 'Site_Design.fig', type: 'design', date: 'Oct 19', size: '14.2 MB' },
];

export function FileManager({ window }: { window: OSWindow }) {
  const { loadProject, openWindow, currentUser } = useOS();

  const handleFileOpen = (file: FileItem) => {
    if (file.type === 'project' && file.projectId) {
      loadProject(file.projectId);
      return;
    }

    if (file.name.toLowerCase().endsWith('.pdf')) {
      openWindow('office', `Reading: ${file.name}`, { tab: 'pdf', url: file.content || file.name });
    } else if (['.js', '.ts', '.jsx', '.tsx', '.json', '.html', '.css', '.md'].some(ext => file.name.toLowerCase().endsWith(ext)) || file.type === 'doc') {
      openWindow('code', `Editing: ${file.name}`, { content: file.content, filename: file.name });
    } else if (file.type === 'image') {
      openWindow('moodboard', `Viewing: ${file.name}`, { url: file.content });
    } else if (file.name.toLowerCase().endsWith('.fig') || file.type === 'design') {
      openWindow('browser', `Figma: ${file.name}`, { url: 'https://www.figma.com/login' });
    } else {
      openWindow('code', `Editing: ${file.name}`, { content: file.content, filename: file.name });
    }
  };
  const [activeTab, setActiveTab] = useState('My Cloud Drive');
  const tabs = ['My Cloud Drive', 'Shared With Me', 'Google Drive', 'Ziklag NAS (Local)'];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');

  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [needsAuth, setNeedsAuth] = useState(false);
  const [driveFiles, setDriveFiles] = useState<FileItem[]>([]);
  const [localFiles, setLocalFiles] = useState<FileItem[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      () => setNeedsAuth(false),
      () => setNeedsAuth(true)
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const fetchDriveFiles = async () => {
    setIsLoadingDrive(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        setIsLoadingDrive(false);
        return;
      }
      const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType,createdTime,size)', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
         setNeedsAuth(true);
         setIsLoadingDrive(false);
         return;
      }
      const data = await res.json();
      if (data.files) {
        const mapped = data.files.map((f: any) => ({
          id: f.id,
          name: f.name,
          type: f.mimeType.includes('folder') ? 'folder' :
                f.mimeType.includes('image') ? 'image' : 
                f.mimeType.includes('video') ? 'video' : 'doc',
          date: f.createdTime ? format(new Date(f.createdTime), 'MMM dd') : '--',
          size: f.size ? (parseInt(f.size) / 1024).toFixed(1) + ' KB' : '--',
          isDrive: true,
        }));
        setDriveFiles(mapped);
      }
    } catch (err) {
      console.error('Failed to load drive files:', err);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const fetchLocalFiles = async () => {
    try {
      const entries = await FS.readDir('');
      setLocalFiles(entries.map(e => ({
        id: e.id,
        name: e.name,
        type: 'doc',
        date: format(new Date(), 'MMM dd'),
        size: '--'
      })));
    } catch (err) {
      console.error("Failed to read local files:", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'Google Drive' && !needsAuth) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchDriveFiles();
    } else if (activeTab === 'Ziklag NAS (Local)') {
       
      fetchLocalFiles();
    }
  }, [activeTab, needsAuth]);

  const handleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setNeedsAuth(false);
        if (activeTab === 'Google Drive') fetchDriveFiles();
      }
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'files'),
      where('ownerId', '==', currentUser.id),
      limit(200)
    );
    const unsub = onSnapshot(q, (snap) => {
      const dbFiles: FileItem[] = [];
      snap.forEach(d => {
        dbFiles.push(d.data() as FileItem);
      });
      if (dbFiles.length === 0) {
        setFiles(initialFiles); // visual placeholder
      } else {
        setFiles(dbFiles);
      }
      setIsLoaded(true);
    });
    return () => unsub();
  }, [currentUser]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    Array.from(uploadedFiles).forEach(file => {
      // Security/Performance: Firebase has a 1MB limit for doc sizes. 
      // Ziklag NAS (Local) supports Blobs up to 2GB via IndexedDB/OPFS.
      if (activeTab === 'My Cloud Drive' && file.size > 1000000) {
        alert(`File ${file.name} is too large for Cloud Drive (1MB limit). Save to Ziklag NAS for large files.`);
        return;
      }
      if (file.size > 500 * 1024 * 1024) {
        alert(`File ${file.name} is too large. For browser stability, we limit local uploads to 500MB.`);
        return;
      }
      
      let type: FileItem['type'] = 'unknown';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('text/') || file.name.endsWith('.md')) type = 'doc';
      else if (file.name.endsWith('.fig') || file.name.endsWith('.sketch')) type = 'design';

      const fileId = crypto.randomUUID();
      const newFile = {
        id: fileId,
        name: file.name,
        type,
        date: format(new Date(), 'MMM dd'),
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        ownerId: currentUser?.id
      };
      
      if (activeTab === 'Ziklag NAS (Local)') {
        // Store as RAW BLOB in IndexedDB to support big files without Base64 overhead
        import('idb-keyval').then(({ set }) => {
          set(`file_blob_${fileId}`, file).then(() => {
             FS.write(file.name, `blob://${fileId}`, file.type).then(() => fetchLocalFiles());
          });
        });
      } else if (activeTab === 'My Cloud Drive') {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            await setDoc(doc(db, 'files', fileId), { ...newFile, content: event.target?.result as string });
          } catch (e: any) {
            alert('Failed to save file: ' + e.message);
          }
        };
        reader.readAsDataURL(file);
      } else {
        alert('Cannot upload directly to this tab.');
      }
    });
  };

  const deleteFile = async (id: string, e: React.MouseEvent, isDrive?: boolean, isLocal?: string) => {
    e.stopPropagation();
    if (isDrive) {
      const confirmed = globalThis.window.confirm('Are you sure you want to delete this file from Google Drive? This action cannot be undone.');
      if (!confirmed) return;
      
      const token = await getAccessToken();
      if (token) {
        try {
          await fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          setDriveFiles(prev => prev.filter(f => f.id !== id));
        } catch(err) {
          console.error("Failed to delete from drive", err);
        }
      }
    } else if (activeTab === 'Ziklag NAS (Local)') {
      if (!confirm("Are you sure you want to delete this file locally?")) return;
      await FS.delete(id);
      fetchLocalFiles();
    } else {
      if (!confirm("Are you sure you want to delete this file from your OS Cloud?")) return;
      try {
        await firestoreDeleteDoc(doc(db, 'files', id));
      } catch (err: any) {
         console.error('Failed to delete file', err);
         alert('Error deleting file: ' + err.message);
      }
    }
  };

  const downloadToLocal = async (file: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    let downloadUrl = file.content;
    
    // For projects or unknown content we fallback to JSON
    if (file.type === 'project' || (!downloadUrl && file.type !== 'image')) {
      const jsonStr = JSON.stringify(file, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      downloadUrl = URL.createObjectURL(blob);
    } else if (downloadUrl) {
      try {
        if (downloadUrl.startsWith('data:')) {
          const res = await fetch(downloadUrl);
          const blob = await res.blob();
          downloadUrl = URL.createObjectURL(blob);
        } else {
          const blob = new Blob([downloadUrl], { type: 'text/plain' });
          downloadUrl = URL.createObjectURL(blob);
        }
      } catch (err) {
        console.error('Failed to create blob for download', err);
      }
    }
    
    if (downloadUrl) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = file.name + (file.type === 'project' ? '.json' : '');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      if (downloadUrl.startsWith('blob:')) {
        URL.revokeObjectURL(downloadUrl);
      }
    }
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  const filteredDriveFiles = driveFiles.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  const filteredLocalFiles = localFiles.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  
  const ziklagFiles: FileItem[] = [
    { id: 'z1', name: 'Ziklag Firmware Recovery.bin', type: 'doc' as const, content: 'HEX DATA OMITTED', projectId: 'ziklag', size: '4.2 GB', date: new Date().toISOString() },
    { id: 'z2', name: 'Client 492_SD_RAW.mp4', type: 'video' as const, size: '12.8 GB', date: new Date().toISOString() },
    { id: 'z3', name: 'Agency Rebranding Assets.fig', type: 'design' as const, url: 'https://www.figma.com/login', size: '142 MB', date: new Date().toISOString() },
    { id: 'z4', name: 'Local LLM Prompt Templates.md', type: 'doc' as const, content: '# Confidential\n\nPrompt templates for Ziklag data parsing.', size: '12 KB', date: new Date().toISOString() },
    ...filteredLocalFiles
  ].filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  const currentFiles = activeTab === 'Google Drive' ? filteredDriveFiles : (activeTab === 'Ziklag NAS (Local)' ? ziklagFiles : filteredFiles);

  if (!isLoaded) return null;

  return (
    <div className="w-full h-full flex bg-[#0a0a0a]/90 text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-48 border-r border-white/5 p-4 flex flex-col gap-2 shrink-0">
        <div className="font-display text-xs text-white/40 uppercase tracking-widest mb-4 px-2">Locations</div>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "text-left px-3 py-1.5 rounded-md text-sm transition-colors",
              activeTab === tab ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            {tab}
          </button>
        ))}
        
        <div className="mt-8 font-display text-xs text-white/40 uppercase tracking-widest mb-4 px-2">Tags</div>
        <div className="flex flex-wrap gap-2 px-2">
          <span className="w-3 h-3 rounded-full bg-neon-blue cursor-pointer hover:scale-125 transition-transform" />
          <span className="w-3 h-3 rounded-full bg-electric-purple cursor-pointer hover:scale-125 transition-transform" />
          <span className="w-3 h-3 rounded-full bg-acid-green cursor-pointer hover:scale-125 transition-transform" />
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-sm focus-within:border-white/30 transition-colors w-64">
            <Search className="w-4 h-4 text-white/50" />
            <input 
              type="text" 
              placeholder="Search files..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-white placeholder:text-white/30 w-full"
            />
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden" 
            multiple 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="h-8 w-8 flex items-center justify-center rounded-md bg-white text-black hover:bg-white/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-[#0a0a0a] to-[#111111]">
          <div className="flex items-center justify-between mb-6 px-1">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <Cloud className="w-4 h-4 text-blue-400" />
               </div>
               <h2 className="text-xl font-medium tracking-tight overflow-hidden text-ellipsis whitespace-nowrap">{activeTab}</h2>
             </div>
             <div className="flex items-center gap-4">
                {activeTab === 'Ziklag NAS (Local)' && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full hidden sm:flex">
                     <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                     </span>
                     {/* @ts-ignore */}
                     {globalThis.window.__TAURI__ ? 'Tauri Native FS Actived' : 'IndexedDB Fallback (Tauri Ready)'}
                  </div>
               )}
               {activeTab === 'Google Drive' && !needsAuth && (
                 <button onClick={logout} className="text-sm text-white/50 hover:text-white/80 transition-colors">Sign Out</button>
               )}
             </div>
          </div>
          {activeTab === 'Google Drive' && needsAuth ? (
             <div className="h-full flex flex-col items-center justify-center gap-4 text-white/60">
               <p className="max-w-md text-center text-sm font-medium">Connect your Google Drive account to sync and access files from anywhere across devices in real-time.</p>
               <button className="gsi-material-button mt-2" onClick={handleLogin}>
                  <div className="gsi-material-button-state"></div>
                  <div className="gsi-material-button-content-wrapper flex items-center bg-white text-black px-4 py-2 rounded shadow shrink-0">
                    <div className="gsi-material-button-icon mr-2">
                       <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 block">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                          <path fill="none" d="M0 0h48v48H0z"></path>
                       </svg>
                    </div>
                    <span className="gsi-material-button-contents font-medium">Sign in with Google</span>
                  </div>
               </button>
             </div>
          ) : activeTab === 'Google Drive' && isLoadingDrive ? (
             <div className="h-full flex items-center justify-center text-white/40 font-mono text-sm animate-pulse">
               Loading drive files...
             </div>
          ) : currentFiles.length === 0 ? (
            <div className="h-full flex items-center justify-center text-white/40 font-mono text-sm">
              No files found.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {currentFiles.map(file => (
                <div 
                  key={file.id} 
                  onDoubleClick={() => handleFileOpen(file)}
                  className="group relative flex flex-col items-center justify-center p-4 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                    {!file.isDrive && (
                      <button onClick={(e) => downloadToLocal(file, e)} className="p-1 hover:bg-white/10 rounded" title="Download to Local">
                        <Download className="w-4 h-4 text-white/50 hover:text-white" />
                      </button>
                    )}
                    <button onClick={(e) => deleteFile(file.id, e, file.isDrive)} className="p-1 hover:bg-white/10 rounded" title="Delete">
                      <Trash2 className="w-4 h-4 text-white/50 hover:text-rose-500" />
                    </button>
                  </div>
                  <div className="w-16 h-16 mb-4 flex items-center justify-center">
                    {file.type === 'folder' && <Folder className="w-12 h-12 text-neon-blue/80 group-hover:text-neon-blue" fill="currentColor" />}
                    {file.type === 'project' && (
                       <div className="w-12 h-12 rounded bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center group-hover:border-white/30 transition-colors shadow-lg">
                          <Folder className="w-6 h-6 text-white" fill="currentColor" />
                       </div>
                    )}
                    {file.type === 'image' && (
                      file.content ? 
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={file.content} alt={file.name} className="w-12 h-12 object-cover rounded" /> :
                        <ImageIcon className="w-12 h-12 text-electric-purple/80 group-hover:text-electric-purple" />
                    )}
                    {file.type === 'doc' && <FileText className="w-12 h-12 text-white/50 group-hover:text-white/80" />}
                    {file.type === 'video' && <Video className="w-12 h-12 text-acid-green/80 group-hover:text-acid-green" />}
                    {(file.type === 'design' || file.type === 'unknown') && <Box className="w-12 h-12 text-orange-400/80 group-hover:text-orange-400" />}
                  </div>
                  <div className="text-sm text-center text-white/90 font-medium truncate w-full">{file.name}</div>
                  <div className="text-xs text-white/40 mt-1">{file.date} • {file.size}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
