'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  UploadCloud, Image as ImageIcon, Video, FileText, PenTool,
  Search, Grid3x3, List, MoreVertical, Plus, Download, Trash2, Folder, HardDrive, LayoutTemplate
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { writeBlob } from '@/lib/context-layer';

type FileType = 'image' | 'video' | 'copy' | 'design' | 'template';

interface AssetFile {
  id: string;
  name: string;
  type: FileType;
  url: string | null;
  size: string;
  date: string;
}

const TEMPLATES: AssetFile[] = [
  { id: 't1', name: 'IG Story (1080x1920)', type: 'template', url: null, size: '2 MB', date: 'Today' },
  { id: 't2', name: 'Email Header (600x200)', type: 'template', url: null, size: '1.5 MB', date: 'Yesterday' },
  { id: 't3', name: 'FB Ad (1200x628)', type: 'template', url: null, size: '3.1 MB', date: '2 days ago' },
];

const ICONS = {
  image: <ImageIcon className="w-5 h-5 text-blue-500" />,
  video: <Video className="w-5 h-5 text-emerald-500" />,
  copy: <FileText className="w-5 h-5 text-amber-500" />,
  design: <PenTool className="w-5 h-5 text-rose-500" />,
  template: <LayoutTemplate className="w-5 h-5 text-emerald-500" />
};

export function AssetsLibrary({ window: osWindow }: { window?: any }) {
  const [files, setFiles] = useState<AssetFile[]>([...TEMPLATES]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<FileType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createdUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      createdUrlsRef.current.forEach((url) => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
      createdUrlsRef.current.clear();
    };
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: AssetFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file) continue;
      const fileId = crypto.randomUUID();
      await writeBlob(fileId, file);
      
      let type: FileType = 'copy';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.name.endsWith('.ai') || file.name.endsWith('.psd') || file.name.endsWith('.fig')) type = 'design';

      const previewUrl = URL.createObjectURL(file);
      createdUrlsRef.current.add(previewUrl);

      newFiles.push({
        id: fileId,
        name: file.name,
        type,
        url: previewUrl, // create local preview
        size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
        date: 'Just now'
      });
    }
    setFiles(prev => [...newFiles, ...prev]);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    await processFiles(e.dataTransfer.files);
  }, []);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (id: string) => {
    setFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target?.url && target.url.startsWith('blob:')) {
        URL.revokeObjectURL(target.url);
        createdUrlsRef.current.delete(target.url);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const filteredFiles = files.filter(f => 
    (filter === 'all' || f.type === filter) && 
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 font-sans text-slate-900">
      <div className="px-8 py-6 bg-white border-b border-black/5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Folder className="w-6 h-6 text-blue-500" />
            Assets Library
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage and organize your campaign files and templates.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-black/10 rounded-lg text-sm font-medium hover:bg-slate-50">
            <HardDrive className="w-4 h-4 text-slate-500" /> Import from Drive
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 shadow-sm">
            <Plus className="w-4 h-4" /> Upload Files
          </button>
          <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileInput} />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar filters */}
        <div className="w-56 shrink-0 bg-white border-r border-black/5 p-4 flex flex-col">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">File Types</div>
          <div className="space-y-1">
            {(['all', 'image', 'video', 'design', 'copy', 'template'] as const).map(t => (
              <button key={t} onClick={() => setFilter(t)} className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors", filter === t ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50")}>
                {t === 'all' ? <Grid3x3 className="w-4 h-4" /> : ICONS[t as FileType]}
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div 
          className="flex-1 flex flex-col relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="absolute inset-0 z-50 bg-blue-500/10 border-4 border-dashed border-blue-500 rounded-xl m-4 flex flex-col items-center justify-center pointer-events-none backdrop-blur-sm">
              <UploadCloud className="w-16 h-16 text-blue-500 mb-4" />
              <h2 className="text-2xl font-bold text-blue-600">Drop files to upload</h2>
              <p className="text-blue-500 font-medium">Files will be saved as local blobs</p>
            </div>
          )}

          <div className="p-4 border-b border-black/5 flex items-center justify-between shrink-0 bg-white/50 backdrop-blur">
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-1.5 text-sm border border-black/10 rounded-lg outline-none focus:border-blue-500 bg-white" />
            </div>
            <div className="flex bg-white rounded-lg border border-black/10 p-0.5">
              <button onClick={() => setViewMode('grid')} className={cn("p-1.5 rounded-md transition-colors", viewMode === 'grid' ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600")}><Grid3x3 className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('list')} className={cn("p-1.5 rounded-md transition-colors", viewMode === 'list' ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600")}><List className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {filteredFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <UploadCloud className="w-12 h-12 mb-4 opacity-50" />
                <p>No files found.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredFiles.map(file => (
                  <div key={file.id} className="bg-white border border-black/5 rounded-xl overflow-hidden hover:shadow-md transition-shadow group relative flex flex-col">
                    <div className="aspect-square bg-slate-50 flex items-center justify-center relative p-4">
                      {file.type === 'image' && file.url ? (
                        <img src={file.url} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <div className="scale-[2] opacity-50">{ICONS[file.type]}</div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button className="p-2 bg-white rounded-full text-slate-900 hover:scale-110 transition-transform"><Download className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(file.id)} className="p-2 bg-red-500 rounded-full text-white hover:scale-110 transition-transform"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="p-3 border-t border-black/5 flex-1 flex flex-col justify-center">
                      <div className="text-sm font-medium text-slate-800 truncate" title={file.name}>{file.name}</div>
                      <div className="text-xs text-slate-400 flex justify-between mt-1">
                        <span>{file.size}</span>
                        <span>{file.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-black/5 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-black/5">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Size</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map(file => (
                      <tr key={file.id} className="border-b border-black/5 last:border-0 hover:bg-slate-50/50 group">
                        <td className="px-4 py-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            {ICONS[file.type]}
                          </div>
                          <span className="text-sm font-medium text-slate-800">{file.name}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">{file.size}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{file.date}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="opacity-0 group-hover:opacity-100 flex justify-end gap-2 transition-opacity">
                            <button className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded"><Download className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(file.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AssetsLibrary;
