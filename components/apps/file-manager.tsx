'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useOS, OSWindow } from '@/lib/os-context';
import { 
  Folder, File as FileIcon, FileText, Image as ImageIcon, Video, Box, Search, 
  Plus, Trash2, Cloud, Download, HardDrive, History, X, Github
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { initAuth, googleSignIn, getAccessToken, logout, db, collection, onSnapshot, setDoc, doc, deleteDoc as firestoreDeleteDoc, query, where, limit } from '@/lib/firebase';
import { FS } from '@/lib/fs';

type FileItem = {
  id: string;
  name: string;
  type: 'image' | 'doc' | 'video' | 'design' | 'folder' | 'project' | 'unknown';
  date: string;
  size: string;
  content?: string;
  projectId?: string;
  isDrive?: boolean;
  isDropbox?: boolean;
  isLocal?: boolean;
  provider?: 'Firebase' | 'Google Drive' | 'Dropbox' | 'Local';
};

const initialFiles: FileItem[] = [
  { id: '1', name: 'Nike Campaign', type: 'project', date: 'Oct 23', size: '--', projectId: 'nike-campaign', provider: 'Firebase' },
  { id: '2', name: 'Tesla Redesign', type: 'project', date: 'Oct 22', size: '--', projectId: 'tesla-redesign', provider: 'Firebase' },
  { id: '3', name: 'Portfolio OS', type: 'project', date: 'Oct 20', size: '--', projectId: 'portfolio-v3', provider: 'Firebase' },
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

  const [activeTab, setActiveTab] = useState('Unified Explorer');
  const tabs = ['Unified Explorer', 'Ziklag NAS (Local)', 'Google Drive', 'Dropbox', 'Shared With Me'];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');

  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [needsAuth, setNeedsAuth] = useState(false);
  const [needsDropboxAuth, setNeedsDropboxAuth] = useState(true);
  
  const [driveFiles, setDriveFiles] = useState<FileItem[]>([]);
  const [dropboxFiles, setDropboxFiles] = useState<FileItem[]>([]);
  const [localFiles, setLocalFiles] = useState<FileItem[]>([]);
  
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [versionHistoryFile, setVersionHistoryFile] = useState<FileItem | null>(null);

  // Auth Initialization
  useEffect(() => {
    const unsubscribe = initAuth(() => setNeedsAuth(false), () => setNeedsAuth(true));
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // Fetch Providers
  const fetchDriveFiles = async () => {
    setIsLoadingDrive(true);
    try {
      const token = await getAccessToken();
      if (!token) { setNeedsAuth(true); setIsLoadingDrive(false); return; }
      const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType,createdTime,size)', { headers: { Authorization: `Bearer ${token}` }});
      if (res.status === 401) { setNeedsAuth(true); setIsLoadingDrive(false); return; }
      const data = await res.json();
      if (data.files) {
        setDriveFiles(data.files.map((f: any) => ({
          id: f.id, name: f.name,
          type: f.mimeType.includes('folder') ? 'folder' : f.mimeType.includes('image') ? 'image' : f.mimeType.includes('video') ? 'video' : 'doc',
          date: f.createdTime ? format(new Date(f.createdTime), 'MMM dd') : '--',
          size: f.size ? (parseInt(f.size) / 1024).toFixed(1) + ' KB' : '--',
          isDrive: true, provider: 'Google Drive'
        })));
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
        id: e.id, name: e.name, type: 'doc', date: format(new Date(), 'MMM dd'), size: '--', isLocal: true, provider: 'Local'
      })));
    } catch (err) {
      console.error("Failed to read local files:", err);
    }
  };

  const fetchDropboxFiles = async () => {
    // Mocked for Phase 2D MVP
    setTimeout(() => {
      setDropboxFiles([
        { id: 'db1', name: 'Q3 Financials.xlsx', type: 'doc', date: 'Oct 15', size: '1.2 MB', isDropbox: true, provider: 'Dropbox' },
        { id: 'db2', name: 'Brand_Guidelines.pdf', type: 'doc', date: 'Oct 10', size: '8.4 MB', isDropbox: true, provider: 'Dropbox' },
      ]);
    }, 1000);
  };

  useEffect(() => {
    if (activeTab === 'Google Drive' && !needsAuth) fetchDriveFiles();
    if (activeTab === 'Ziklag NAS (Local)') fetchLocalFiles();
    if (activeTab === 'Dropbox' && !needsDropboxAuth) fetchDropboxFiles();
    
    if (activeTab === 'Unified Explorer') {
      fetchLocalFiles();
      if (!needsAuth) fetchDriveFiles();
      if (!needsDropboxAuth) fetchDropboxFiles();
    }
  }, [activeTab, needsAuth, needsDropboxAuth]);

  // Firebase Realtime
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'files'), where('ownerId', '==', currentUser.id), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      const dbFiles: FileItem[] = [];
      snap.forEach(d => dbFiles.push({ ...d.data(), provider: 'Firebase' } as FileItem));
      setFiles(dbFiles.length === 0 ? initialFiles : dbFiles);
      setIsLoaded(true);
    });
    return () => unsub();
  }, [currentUser]);

  const handleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) { setNeedsAuth(false); if (activeTab === 'Google Drive') fetchDriveFiles(); }
    } catch (err) { console.error('Login failed:', err); }
  };

  const handleDropboxLogin = () => {
    setNeedsDropboxAuth(false);
    if (activeTab === 'Dropbox') fetchDropboxFiles();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    Array.from(uploadedFiles).forEach(file => {
      let type: FileItem['type'] = 'unknown';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('text/') || file.name.endsWith('.md')) type = 'doc';
      else if (file.name.endsWith('.fig') || file.name.endsWith('.sketch')) type = 'design';

      const isLocal = activeTab === 'Ziklag NAS (Local)' || activeTab === 'Unified Explorer';
      const isFirebase = activeTab !== 'Google Drive' && !isLocal;
      
      // Validate file size to prevent memory leaks and API rejections
      if (isFirebase && file.size > 500 * 1024) {
         alert(`File ${file.name} is too large for Cloud Sync. Maximum size is 500KB. Use Ziklag NAS for larger files.`);
         return;
      }
      if (isLocal && file.size > 50 * 1024 * 1024) {
         alert(`File ${file.name} is too large for Local Storage. Maximum size is 50MB.`);
         return;
      }

      const fileId = crypto.randomUUID();
      const newFile = {
        id: fileId, name: file.name, type,
        date: format(new Date(), 'MMM dd'),
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        ownerId: currentUser?.id
      };
      
      if (activeTab === 'Ziklag NAS (Local)' || activeTab === 'Unified Explorer') {
        // Stream directly to OPFS without caching in RAM or IndexedDB
        FS.write(file.name, file, file.type).then(() => fetchLocalFiles());
      } else if (activeTab === 'Google Drive') {
        alert('Direct upload to Google Drive requires full OAuth scopes. Supported via Firebase API in prod.');
      } else {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            await setDoc(doc(db, 'files', fileId), { ...newFile, content: event.target?.result as string, provider: 'Firebase' });
          } catch (e: any) { alert('Failed to save file: ' + e.message); }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const deleteFile = async (id: string, e: React.MouseEvent, provider?: string) => {
    e.stopPropagation();
    if (provider === 'Google Drive') {
      if (!globalThis.window.confirm('Delete from Google Drive?')) return;
      const token = await getAccessToken();
      if (token) {
        try {
          await fetch(`https://www.googleapis.com/drive/v3/files/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }});
          setDriveFiles(prev => prev.filter(f => f.id !== id));
        } catch(err) { console.error("Failed", err); }
      }
    } else if (provider === 'Local') {
      if (!confirm("Delete locally?")) return;
      await FS.delete(id);
      fetchLocalFiles();
    } else if (provider === 'Dropbox') {
      if (!confirm("Delete from Dropbox?")) return;
      setDropboxFiles(prev => prev.filter(f => f.id !== id));
    } else {
      if (!confirm("Delete from OS Cloud?")) return;
      try { await firestoreDeleteDoc(doc(db, 'files', id)); } catch (err: any) { alert('Error: ' + err.message); }
    }
  };

  const downloadToLocal = async (file: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    let downloadUrl = file.content;
    
    if (file.type === 'project' || (!downloadUrl && file.type !== 'image')) {
      const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
      downloadUrl = URL.createObjectURL(blob);
    } else if (downloadUrl) {
      if (downloadUrl.startsWith('data:')) {
        const res = await fetch(downloadUrl);
        const blob = await res.blob();
        downloadUrl = URL.createObjectURL(blob);
      } else {
        const blob = new Blob([downloadUrl], { type: 'text/plain' });
        downloadUrl = URL.createObjectURL(blob);
      }
    }
    
    if (downloadUrl) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = file.name + (file.type === 'project' ? '.json' : '');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Ziklag NAS Mock Files
  const ziklagFiles: FileItem[] = [
    { id: 'z1', name: 'Ziklag Firmware Recovery.bin', type: 'doc', content: 'HEX DATA', projectId: 'ziklag', size: '4.2 GB', date: 'Oct 25', provider: 'Local' },
    { id: 'z2', name: 'Client 492_SD_RAW.mp4', type: 'video', size: '12.8 GB', date: 'Oct 24', provider: 'Local' },
    { id: 'z3', name: 'Agency Rebranding Assets.fig', type: 'design', size: '142 MB', date: 'Oct 24', provider: 'Local' },
    ...localFiles
  ];

  const searchFilter = (f: FileItem) => f.name.toLowerCase().includes(search.toLowerCase());

  let currentFiles: FileItem[] = [];
  if (activeTab === 'Google Drive') currentFiles = driveFiles.filter(searchFilter);
  else if (activeTab === 'Dropbox') currentFiles = dropboxFiles.filter(searchFilter);
  else if (activeTab === 'Ziklag NAS (Local)') currentFiles = ziklagFiles.filter(searchFilter);
  else if (activeTab === 'Unified Explorer') currentFiles = [...files, ...driveFiles, ...dropboxFiles, ...ziklagFiles].filter(searchFilter);
  else currentFiles = files.filter(searchFilter);

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
              activeTab === tab ? "bg-white/10 text-white font-medium" : "text-white/60 hover:text-white hover:bg-white/5"
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
              placeholder="Search across all clouds..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-white placeholder:text-white/30 w-full"
            />
          </div>
          
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="h-8 w-8 flex items-center justify-center rounded-md bg-white text-black hover:bg-white/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-[#0a0a0a] to-[#111111] relative">
          <div className="flex items-center justify-between mb-6 px-1">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <Cloud className="w-4 h-4 text-blue-400" />
               </div>
               <h2 className="text-xl font-medium tracking-tight overflow-hidden text-ellipsis whitespace-nowrap">{activeTab}</h2>
             </div>
             <div className="flex items-center gap-4">
               {activeTab === 'Google Drive' && !needsAuth && <button onClick={logout} className="text-sm text-white/50 hover:text-white/80 transition-colors">Sign Out</button>}
             </div>
          </div>

          {activeTab === 'Google Drive' && needsAuth ? (
             <div className="h-full flex flex-col items-center justify-center gap-4 text-white/60">
               <p className="max-w-md text-center text-sm font-medium">Connect your Google Drive account to sync and access files from anywhere across devices in real-time.</p>
               <button className="gsi-material-button mt-2" onClick={handleLogin}>
                  <div className="gsi-material-button-state"></div>
                  <div className="gsi-material-button-content-wrapper flex items-center bg-white text-black px-4 py-2 rounded shadow shrink-0">
                    <span className="font-medium">Sign in with Google</span>
                  </div>
               </button>
             </div>
          ) : activeTab === 'Dropbox' && needsDropboxAuth ? (
             <div className="h-full flex flex-col items-center justify-center gap-4 text-white/60">
               <p className="max-w-md text-center text-sm font-medium">Connect your Dropbox account to bridge your external client folders into the OS.</p>
               <button className="mt-2 bg-[#0061FE] hover:bg-[#0050d2] text-white px-6 py-2.5 rounded shadow font-medium transition-colors" onClick={handleDropboxLogin}>
                  Connect Dropbox
               </button>
             </div>
          ) : activeTab === 'Google Drive' && isLoadingDrive ? (
             <div className="h-full flex items-center justify-center text-white/40 font-mono text-sm animate-pulse">Loading drive files...</div>
          ) : currentFiles.length === 0 ? (
            <div className="h-full flex items-center justify-center text-white/40 font-mono text-sm">No files found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-12">
              {currentFiles.map(file => (
                <div 
                  key={file.id + file.provider} 
                  onDoubleClick={() => handleFileOpen(file)}
                  className="group relative flex flex-col items-center justify-center p-4 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 z-10">
                    <button onClick={(e) => { e.stopPropagation(); setVersionHistoryFile(file); }} className="p-1 hover:bg-white/10 rounded bg-black/40 backdrop-blur" title="Version History">
                      <History className="w-4 h-4 text-white/50 hover:text-white" />
                    </button>
                    {!file.isDrive && !file.isDropbox && (
                      <button onClick={(e) => downloadToLocal(file, e)} className="p-1 hover:bg-white/10 rounded bg-black/40 backdrop-blur" title="Download to Local">
                        <Download className="w-4 h-4 text-white/50 hover:text-white" />
                      </button>
                    )}
                    <button onClick={(e) => deleteFile(file.id, e, file.provider)} className="p-1 hover:bg-white/10 rounded bg-black/40 backdrop-blur" title="Delete">
                      <Trash2 className="w-4 h-4 text-white/50 hover:text-rose-500" />
                    </button>
                  </div>

                  <div className="w-16 h-16 mb-4 flex items-center justify-center relative">
                    {file.type === 'folder' && <Folder className="w-12 h-12 text-neon-blue/80 group-hover:text-neon-blue" fill="currentColor" />}
                    {file.type === 'project' && (
                       <div className="w-12 h-12 rounded bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center group-hover:border-white/30 transition-colors shadow-lg">
                          <Folder className="w-6 h-6 text-white" fill="currentColor" />
                       </div>
                    )}
                    {file.type === 'image' && (
                      file.content ? <img src={file.content} alt={file.name} className="w-12 h-12 object-cover rounded" /> : <ImageIcon className="w-12 h-12 text-electric-purple/80 group-hover:text-electric-purple" />
                    )}
                    {file.type === 'doc' && <FileText className="w-12 h-12 text-white/50 group-hover:text-white/80" />}
                    {file.type === 'video' && <Video className="w-12 h-12 text-acid-green/80 group-hover:text-acid-green" />}
                    {(file.type === 'design' || file.type === 'unknown') && <Box className="w-12 h-12 text-orange-400/80 group-hover:text-orange-400" />}
                    
                    {/* Provider Badge */}
                    {activeTab === 'Unified Explorer' && file.provider && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#111] border border-white/20 flex items-center justify-center" title={file.provider}>
                        {file.provider === 'Google Drive' ? <Cloud className="w-2.5 h-2.5 text-blue-400" /> :
                         file.provider === 'Dropbox' ? <Box className="w-2.5 h-2.5 text-blue-500" /> :
                         file.provider === 'Local' ? <HardDrive className="w-2.5 h-2.5 text-emerald-400" /> :
                         <div className="w-2.5 h-2.5 rounded-full bg-white/20" />}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-center text-white/90 font-medium truncate w-full px-2">{file.name}</div>
                  <div className="text-xs text-white/40 mt-1">{file.date} • {file.size}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Version History Modal */}
      {versionHistoryFile && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#252526]">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-white/70" />
                <h3 className="font-medium text-white">Version History</h3>
              </div>
              <button onClick={() => setVersionHistoryFile(null)} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4 text-white/50" /></button>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <div className="text-sm text-white/50 truncate mb-2">Viewing history for: <strong className="text-white">{versionHistoryFile.name}</strong></div>
              
              <div className="flex flex-col border border-white/5 rounded-lg overflow-hidden bg-black/20">
                {[
                  { v: 'v3 (Current)', time: 'Just now', user: 'You' },
                  { v: 'v2', time: '2 days ago', user: 'Founder' },
                  { v: 'v1', time: 'Oct 10, 2026', user: 'System' }
                ].map((ver, i) => (
                  <div key={ver.v} className="flex items-center justify-between p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group cursor-pointer">
                    <div>
                      <div className="text-sm font-medium text-white group-hover:text-neon-blue transition-colors">{ver.v}</div>
                      <div className="text-xs text-white/40">{ver.time} • by {ver.user}</div>
                    </div>
                    {i !== 0 && (
                      <button className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded transition-colors opacity-0 group-hover:opacity-100">
                        Restore
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
