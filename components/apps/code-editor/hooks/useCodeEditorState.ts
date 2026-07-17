import { useState, useEffect, useRef } from 'react';
import { FS } from '@/lib/fs';
import { Storage } from '@/lib/storage';
import { FileNode } from '../types';

export const getInitialCode = (id: string, content?: string) => {
  if (content) return content;
  switch (id) {
     case 'nike-campaign':
       return `import { initCampaign } from '@anichisom/core';\n\n// Nike Air Force 1 : 40th Anniversary\nconst campaign = initCampaign({\n  target: 'Global',\n  platforms: ['Instagram', 'TikTok'],\n  mood: 'Energetic, Street, Heritage'\n});\n`;
     case 'tesla-redesign':
       return `import { renderUI } from '@anichisom/ui';\n\n// Tesla dashboard concept\nexport default function App() {\n  return (\n    <div className="bg-black text-white p-8">\n       <h1>Tesla UI Staging</h1>\n       <p>Dashboard visualization active.</p>\n    </div>\n  )\n}\n`;
     case 'portfolio-v3':
       return `// Portfolio OS Core Boot Sequence\nimport { bootOS } from './kernel';\n\nbootOS({\n  user: 'ANICHISOM',\n  desktopTheme: 'macOS Monterey',\n  apps: ['Terminal', 'Moodboard', 'Code']\n});\n`;
     default:
       return `export default function App() {\n  // Set breakpoints by clicking the gutter on the left\n  const handleAction = () => {\n    const data = { status: 'running' };\n    console.log(data);\n  };\n\n  return (\n    <div className="p-4">\n      <h1 className="text-xl font-bold">Hello World</h1>\n      <button onClick={handleAction}>Run</button>\n    </div>\n  );\n}\n`;
  }
};

export function useCodeEditorState(projectId: string, initialContent: string | undefined, workspaceMode: 'agency' | 'private', roomId: string, currentUser: any, initialFileId?: string) {
  const [files, setFiles] = useState<FileNode[]>([
    { id: 'app.tsx', name: 'app.tsx', type: 'file', folder: 'src' },
    { id: 'package.json', name: 'package.json', type: 'file', folder: 'root' },
  ]);
  
  const refreshFiles = async () => {
      const localFiles = await FS.readDir('');
      if (localFiles && localFiles.length > 0) {
         setFiles(localFiles.map(f => ({ id: f.id, name: f.name, type: 'file', folder: f.id.includes('/') ? f.id.split('/')[0]! : 'root' })));
      }
  };

  useEffect(() => {
     refreshFiles();
  }, []);

  const [activeFileId, setActiveFileId] = useState(
    initialFileId || (projectId === 'portfolio-v3' ? 'app.tsx' : projectId === 'tesla-redesign' ? 'ui.tsx' : 'app.tsx')
  );
  
  const activeFile = files.find(f => f.id === activeFileId);
  const fileName = activeFile?.name || activeFileId.split('/').pop() || 'app.tsx';

  const [code, setCode] = useState(getInitialCode(projectId, initialContent));
  const [loaded, setLoaded] = useState(false);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    
    // First try OPFS natively
    FS.read(activeFileId).then(localFile => {
       if (cancelled) return;
       if (localFile && typeof localFile.content === 'string') {
          setCode(localFile.content);
          setLoaded(true);
       } else {
          // Fallback to legacy cloud storage or templates
          Storage.getDoc('codes', roomId, workspaceMode).then((saved: any) => {
             if (cancelled) return;
             if (workspaceMode === 'private' && saved && typeof saved === 'string') {
                setCode(saved);
             } else if (saved && saved.code !== undefined) {
                setCode(saved.code);
             } else {
                setCode(getInitialCode(projectId, initialContent));
             }
             setLoaded(true);
          });
       }
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, workspaceMode, currentUser, activeFileId, projectId, initialContent]);

  const saveCodeRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleCodeChange = (newCode: string | undefined) => {
    let val = newCode || '';
    
    if (val.match(/sk-[a-zA-Z0-9]{20,}/)) {
       val = val.replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-***REDACTED***');
    }
    
    setCode(val);
    
    if (isSyncingRef.current) {
        isSyncingRef.current = false;
        return;
    }
    
    if (saveCodeRef.current) clearTimeout(saveCodeRef.current);
    saveCodeRef.current = setTimeout(() => {
        // Save to native OPFS for local offline access and FileManager visibility
        FS.write(activeFileId, val).catch(e => console.warn('FS write failed', e));
        
        // Sync to legacy/cloud storage
        if (workspaceMode === 'private') {
           Storage.setDoc('codes', roomId, val, workspaceMode);
        } else {
           Storage.setDoc('codes', roomId, { code: val, workspaceMode: 'agency' }, workspaceMode);
        }
    }, 500);
  };

  return {
    files,
    activeFileId,
    setActiveFileId,
    fileName,
    code,
    loaded,
    refreshFiles,
    handleCodeChange,
    setCode
  };
}
