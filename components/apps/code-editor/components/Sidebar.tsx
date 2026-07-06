import React, { useState } from 'react';
import { ActivityTab, FileNode } from '../types';
import { FS } from '@/lib/fs';
import { Settings, File as FileIcon, Search, Plus, RefreshCcw, GitBranch, Bug, ChevronDown, ChevronRight, Folder, Check } from 'lucide-react';
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

export function Sidebar({ activityTab, setActivityTab, files, activeFileId, setActiveFileId, refreshFiles, setCode, projectId }: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['src', 'root']);
  const [commitMsg, setCommitMsg] = useState('');

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
           <div className="absolute right-1 bottom-1 w-3.5 h-3.5 bg-blue-500 rounded-full text-white text-[8px] flex items-center justify-center font-bold">2</div>
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
                 <button onClick={async () => {
                   const name = prompt("Enter file path (e.g. src/app.tsx):");
                   if (name) { await FS.write(name, '// new file\\n'); await refreshFiles(); }
                 }} className="p-0.5 hover:bg-[#3c3c3c] rounded"><Plus className="w-3.5 h-3.5" /></button>
                 <button onClick={refreshFiles} className="p-0.5 hover:bg-[#3c3c3c] rounded"><RefreshCcw className="w-3.5 h-3.5" /></button>
               </div>
             </div>
             
             <div className="flex flex-col mt-1">
               {Object.entries(
                 files.reduce((acc, file) => {
                    const parts = file.id.split('/');
                    const folder = parts.length > 1 ? parts[0] : 'root';
                    if (!acc[folder]) acc[folder] = [];
                    acc[folder].push(file);
                    return acc;
                 }, {} as Record<string, typeof files>)
               ).map(([folderName, folderFiles]) => (
                 <React.Fragment key={folderName}>
                   <div 
                     className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-[#2a2d2e] text-[#cccccc] text-sm font-semibold"
                     onClick={() => setExpandedFolders(prev => prev.includes(folderName) ? prev.filter(f => f !== folderName) : [...prev, folderName])}
                   >
                     {expandedFolders.includes(folderName) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                     <Folder className="w-4 h-4 text-blue-400" />
                     <span>{folderName.toUpperCase()}</span>
                   </div>
                   {expandedFolders.includes(folderName) && folderFiles.map(file => (
                     <div 
                       key={file.id} 
                       onClick={async () => { 
                         setActiveFileId(file.id); 
                         const localFile = await FS.read(file.id);
                         setCode(localFile?.content || getInitialCode(projectId, '')); 
                       }}
                       className={cn("flex items-center justify-between pl-8 pr-2 py-1 cursor-pointer text-[13px] group", activeFileId === file.id ? "bg-[#37373d] text-white" : "text-[#cccccc] hover:bg-[#2a2d2e]")}
                     >
                       <div className="flex items-center gap-2 overflow-hidden">
                         <FileIcon className={cn("w-4 h-4 shrink-0", file.name.endsWith('.tsx') || file.name.endsWith('.ts') || file.name.endsWith('.js') ? "text-[#e3c14a]" : "text-[#519aba]")} />
                         <span className="truncate">{file.id.includes('/') ? file.id.substring(file.id.indexOf('/') + 1) : file.name}</span>
                       </div>
                       <button 
                         className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded text-rose-400"
                         onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete ${file.id}?`)) {
                               await FS.delete(file.id);
                               await refreshFiles();
                            }
                         }}
                       >✖</button>
                     </div>
                   ))}
                 </React.Fragment>
               ))}
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
               <div className="text-[11px] font-bold uppercase text-white/50 mb-1 px-1">Changes</div>
               <div className="flex items-center justify-between p-1 hover:bg-[#2a2d2e] cursor-pointer text-[13px] text-[#cccccc] rounded">
                  <div className="flex items-center gap-2">
                    <FileIcon className="w-3.5 h-3.5 text-[#e3c14a]" /> <span className={cn("truncate", activeFileId === 'app.tsx' && "text-[#e2c08d]")}>app.tsx</span>
                  </div>
                  <span className="text-[#e2c08d] text-xs font-bold">M</span>
               </div>
               <div className="flex items-center justify-between p-1 hover:bg-[#2a2d2e] cursor-pointer text-[13px] text-[#cccccc] rounded">
                  <div className="flex items-center gap-2">
                    <FileIcon className="w-3.5 h-3.5 text-green-400" /> <span className="truncate text-green-400">new_component.tsx</span>
                  </div>
                  <span className="text-green-400 text-xs font-bold">U</span>
               </div>
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
    </>
  );
}
