import React, { useState } from 'react';
import { ActivityTab, FileNode } from '../types';
import { FS } from '@/lib/fs';
import { Settings, File as FileIcon, Search, Plus, RefreshCcw, GitBranch, Bug, ChevronDown, ChevronRight, Folder, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getInitialCode } from '../hooks/useCodeEditorState';

interface SidebarProps {
  activityTab: ActivityTab;
  setActivityTab: (tab: ActivityTab) => void;
  files: FileNode[];
  activeFileId: string;
  setActiveFileId: (id: string) => void;
  refreshFiles: () => Promise<void>;
  setCode: (code: string) => void;
  projectId: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children: Record<string, TreeNode>;
}

export function Sidebar({ activityTab, setActivityTab, files, activeFileId, setActiveFileId, refreshFiles, setCode, projectId }: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['src', 'root', 'Desktop', 'Documents', 'Downloads', 'Media']);
  const [commitMsg, setCommitMsg] = useState('');

  const [modal, setModal] = useState<{
    type: 'rename' | 'delete' | 'newFile' | 'newFolder' | 'newProject' | null;
    title?: string;
    placeholder?: string;
    value?: string;
    mode?: 'input' | 'confirm';
    onSubmit?: (val: string) => void;
  }>({ type: null });

  const openInputModal = (title: string, placeholder: string, onSubmit: (val: string) => void) => {
    setModal({ type: 'newFile', title, placeholder, value: '', mode: 'input', onSubmit });
  };

  const openConfirmModal = (title: string, onSubmit: (val: string) => void) => {
    setModal({ type: 'delete', title, value: '', mode: 'confirm', onSubmit });
  };

  const handleModalSubmit = () => {
    modal.onSubmit?.(modal.value || '');
    setModal({ type: null });
  };

  // Build a hierarchical tree of files from flat paths
  const buildTree = (filesList: FileNode[]): TreeNode => {
    const root: TreeNode = { name: 'root', path: '', type: 'directory', children: {} };

    filesList.forEach(file => {
      const parts = file.id.split('/').filter(Boolean);
      let current = root;
      let accumulatedPath = '';

      parts.forEach((part, index) => {
        accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
        const isLast = index === parts.length - 1;

        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: accumulatedPath,
            type: isLast ? 'file' : 'directory',
            children: {}
          };
        }
        current = current.children[part];
      });
    });

    return root;
  };

  const fileTree = buildTree(files);

  const handleCreateRootFile = async () => {
    openInputModal('New File', 'package.json', async (name) => {
      if (!name) return;
      await FS.write(name, '// new file\n');
      await refreshFiles();
    });
  };

  const handleCreateRootFolder = async () => {
    openInputModal('New Folder', 'src', async (name) => {
      if (!name) return;
      await FS.write(`${name}/.keep`, '');
      await refreshFiles();
    });
  };

  const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
    const isDir = node.type === 'directory';
    const isExpanded = expandedFolders.includes(node.path);

    if (node.path === '') {
      return Object.values(node.children)
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
        .map(child => renderNode(child, 0));
    }

    const handleToggle = () => {
      if (isExpanded) {
        setExpandedFolders(prev => prev.filter(p => p !== node.path));
      } else {
        setExpandedFolders(prev => [...prev, node.path]);
      }
    };

    const handleCreateFile = async (e: React.MouseEvent) => {
      e.stopPropagation();
      openInputModal(`New file in ${node.name}`, 'filename.ts', async (name) => {
        if (!name) return;
        const filePath = `${node.path}/${name}`;
        await FS.write(filePath, '// new file\n');
        await refreshFiles();
        setExpandedFolders(prev => prev.includes(node.path) ? prev : [...prev, node.path]);
      });
    };

    const handleCreateFolder = async (e: React.MouseEvent) => {
      e.stopPropagation();
      openInputModal(`New folder in ${node.name}`, 'folder-name', async (name) => {
        if (!name) return;
        const folderPath = `${node.path}/${name}`;
        await FS.write(`${folderPath}/.keep`, '');
        await refreshFiles();
        setExpandedFolders(prev => prev.includes(node.path) ? prev : [...prev, node.path]);
      });
    };

    const handleDelete = async (e: React.MouseEvent) => {
      e.stopPropagation();
      openConfirmModal(`Delete ${node.name} and all its contents?`, async () => {
        await FS.delete(node.path);
        await refreshFiles();
      });
    };

    const handleFileClick = async () => {
      setActiveFileId(node.path);
      const localFile = await FS.read(node.path);
      setCode(localFile?.content || getInitialCode(projectId, ''));
    };

    return (
      <div key={node.path} className="select-none">
        {isDir ? (
          <div 
            onClick={handleToggle}
            className="group flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-[#2a2d2e] text-[#cccccc] text-xs font-semibold"
            style={{ paddingLeft: `${depth * 8 + 8}px` }}
          >
            <div className="flex items-center gap-1.5 overflow-hidden">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-white/60" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-white/60" />}
              <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="currentColor" />
              <span className="truncate text-white/90">{node.name}</span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
              <button onClick={handleCreateFile} title="New File" className="p-0.5 hover:bg-white/10 rounded text-slate-400 hover:text-white">
                <Plus className="w-3 h-3" />
              </button>
              <button onClick={handleCreateFolder} title="New Folder" className="p-0.5 hover:bg-white/10 rounded text-slate-400 hover:text-white">
                <Folder className="w-3 h-3 text-blue-400" />
              </button>
              <button onClick={handleDelete} title="Delete Folder" className="p-0.5 hover:bg-white/10 rounded text-red-400 hover:text-red-300">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          node.name !== '.keep' && (
            <div 
              onClick={handleFileClick}
              className={cn(
                "group flex items-center justify-between px-2 py-1.5 cursor-pointer text-xs transition-colors hover:bg-[#2a2d2e]",
                activeFileId === node.path ? "bg-[#37373d] text-white border-l-2 border-blue-500" : "text-[#cccccc]"
              )}
              style={{ paddingLeft: `${depth * 8 + 22}px` }}
            >
              <div className="flex items-center gap-1.5 overflow-hidden">
                <FileIcon className={cn("w-3.5 h-3.5 shrink-0", node.name.endsWith('.tsx') || node.name.endsWith('.ts') || node.name.endsWith('.js') ? "text-[#e3c14a]" : "text-[#519aba]")} />
                <span className="truncate">{node.name}</span>
              </div>
              <button 
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded text-rose-400 hover:text-rose-300 shrink-0 ml-2"
                onClick={handleDelete}
                title="Delete File"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )
        )}
        {isDir && isExpanded && (
          <div className="flex flex-col">
            {Object.values(node.children)
              .sort((a, b) => {
                if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
                return a.name.localeCompare(b.name);
              })
              .map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Activity Bar (VS Code left-most icon bar) */}
      <div className="w-12 bg-[#333333] flex flex-col items-center py-2 gap-4 shrink-0 border-r border-[#252526] z-10 text-white/40">
         <button onClick={() => setActivityTab('explorer')} className={cn("p-2 rounded cursor-pointer transition-colors relative", activityTab === 'explorer' ? "text-white" : "hover:text-white")}>
           {activityTab === 'explorer' && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />}
           <FileIcon className="w-6 h-6" />
         </button>
         <button onClick={() => setActivityTab('search')} className={cn("p-2 rounded cursor-pointer transition-colors relative", activityTab === 'search' ? "text-white" : "hover:text-white")}>
           {activityTab === 'search' && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />}
           <Search className="w-6 h-6" />
         </button>
         <button onClick={() => setActivityTab('git')} className={cn("p-2 rounded cursor-pointer transition-colors relative", activityTab === 'git' ? "text-white" : "hover:text-white")}>
           {activityTab === 'git' && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />}
           <GitBranch className="w-6 h-6" />
           {files.length > 0 && <div className="absolute right-1 bottom-1 w-3.5 h-3.5 bg-blue-500 rounded-full text-white text-[8px] flex items-center justify-center font-bold">{files.length > 99 ? '99+' : files.length}</div>}
         </button>
         <button onClick={() => setActivityTab('debug')} className={cn("p-2 rounded cursor-pointer transition-colors relative", activityTab === 'debug' ? "text-white" : "hover:text-white")}>
           {activityTab === 'debug' && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />}
           <Bug className="w-6 h-6" />
         </button>
         <button className="p-2 mt-auto rounded cursor-pointer hover:text-white transition-colors">
           <Settings className="w-6 h-6" />
         </button>
      </div>

      {/* Primary Sidebar (Explorer, Git, Debug) */}
      <div className="w-60 shrink-0 bg-[#252526] border-r border-[#3c3c3c] flex flex-col custom-scrollbar overflow-y-auto z-10">
         
         {/* EXPLORER TAB */}
         {activityTab === 'explorer' && (
           <>
             <div className="p-3 flex items-center justify-between text-[#cccccc] text-[11px] font-semibold uppercase tracking-wider">
               <span>Explorer</span>
               <div className="flex items-center gap-1">
                 <button onClick={handleCreateRootFolder} className="p-0.5 hover:bg-[#3c3c3c] rounded text-slate-400 hover:text-white" title="New Root Folder">
                   <Folder className="w-3.5 h-3.5" />
                 </button>
                 <button onClick={handleCreateRootFile} className="p-0.5 hover:bg-[#3c3c3c] rounded text-slate-400 hover:text-white" title="New Root File">
                   <Plus className="w-3.5 h-3.5" />
                 </button>
                 <button onClick={refreshFiles} className="p-0.5 hover:bg-[#3c3c3c] rounded text-slate-400 hover:text-white" title="Refresh">
                   <RefreshCcw className="w-3.5 h-3.5" />
                 </button>
               </div>
             </div>
             
             <div className="flex flex-col mt-1 px-1">
                {renderNode(fileTree, 0)}
             </div>
           </>
         )}

          {/* GIT / SOURCE CONTROL TAB */}
          {activityTab === 'git' && (
            <div className="flex flex-col h-full">
              <div className="p-3 text-[#cccccc] text-[11px] font-semibold uppercase tracking-wider flex justify-between items-center">
                <span>Source Control</span>
                <Check className="w-3.5 h-3.5 cursor-pointer hover:text-white" />
              </div>
              <div className="px-3 pb-3 border-b border-[#3c3c3c]">
                <input 
                  value={commitMsg}
                  onChange={e => setCommitMsg(e.target.value)}
                  placeholder="Message (Enter to commit)" 
                  className="w-full bg-[#3c3c3c] border border-transparent rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-white/40" 
                />
                <button className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white rounded py-1 text-xs transition-colors">Commit</button>
              </div>
              <div className="flex flex-col mt-2 px-2">
                <div className="text-[11px] font-bold uppercase text-white/50 mb-1 px-1">Changes ({files.length})</div>
                {files.length === 0 ? (
                  <div className="text-[11px] text-white/30 px-1 py-2">No tracked files</div>
                ) : (
                  files.slice(0, 20).map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-1 hover:bg-[#2a2d2e] cursor-pointer text-[13px] text-[#cccccc] rounded">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileIcon className={cn("w-3.5 h-3.5 shrink-0", file.name.endsWith('.tsx') || file.name.endsWith('.ts') || file.name.endsWith('.js') ? "text-[#e3c14a]" : "text-[#519aba]")} />
                        <span className={cn("truncate", activeFileId === file.id && "text-[#e2c08d]")}>{file.name}</span>
                      </div>
                      <span className="text-[#e2c08d] text-xs font-bold shrink-0 ml-2">M</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

         {/* DEBUG TAB */}
         {activityTab === 'debug' && (
           <div className="flex flex-col h-full">
             <div className="p-3 text-[#cccccc] text-[11px] font-semibold uppercase tracking-wider flex justify-between items-center">
               <span>Run and Debug</span>
               <div className="w-3.5 h-3.5 cursor-pointer hover:text-green-400"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div>
             </div>
             <div className="flex-1 flex flex-col gap-px bg-[#3c3c3c]">
               <div className="bg-[#252526] p-2 flex flex-col gap-1">
                  <div className="text-[11px] font-bold uppercase text-white/80 cursor-pointer flex items-center"><ChevronDown className="w-3.5 h-3.5" /> Variables</div>
                  <div className="pl-4 text-xs text-blue-300 font-mono flex items-center gap-2">Local <span className="text-white/40">...</span></div>
               </div>
               <div className="bg-[#252526] p-2 flex flex-col gap-1">
                  <div className="text-[11px] font-bold uppercase text-white/80 cursor-pointer flex items-center"><ChevronDown className="w-3.5 h-3.5" /> Watch</div>
               </div>
               <div className="bg-[#252526] p-2 flex flex-col gap-1">
                  <div className="text-[11px] font-bold uppercase text-white/80 cursor-pointer flex items-center"><ChevronDown className="w-3.5 h-3.5" /> Call Stack</div>
               </div>
               <div className="bg-[#252526] p-2 flex flex-col gap-1 flex-1">
                  <div className="text-[11px] font-bold uppercase text-white/80 cursor-pointer flex items-center"><ChevronDown className="w-3.5 h-3.5" /> Breakpoints</div>
                  <div className="pl-4 text-xs font-mono flex items-center gap-2 mt-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /> app.tsx:4</div>
               </div>
             </div>
           </div>
         )}
      </div>

      {/* Inline Modal */}
      {modal.type && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={() => setModal({ type: null })}>
          <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl p-5 w-80" onClick={e => e.stopPropagation()}>
            <div className="text-sm font-medium text-white mb-3">{modal.title}</div>
            {modal.mode === 'input' ? (
              <input
                type="text"
                value={modal.value || ''}
                onChange={e => setModal(prev => ({ ...prev, value: e.target.value }))}
                placeholder={modal.placeholder}
                className="w-full bg-[#3c3c3c] border border-[#555] rounded px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-blue-500 mb-4"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleModalSubmit(); if (e.key === 'Escape') setModal({ type: null }); }}
              />
            ) : (
              <p className="text-xs text-[#cccccc] mb-4">{modal.title}</p>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal({ type: null })} className="px-3 py-1.5 text-xs text-[#cccccc] hover:bg-[#3c3c3c] rounded">Cancel</button>
              <button onClick={handleModalSubmit} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded">
                {modal.mode === 'confirm' ? 'Delete' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
