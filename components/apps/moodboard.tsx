'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { motion, useDragControls } from 'motion/react';
import { MousePointer2, GripHorizontal, Type, Image as ImageIcon, Trash2, Video, Link as LinkIcon, Upload, MessageSquare, Heart, X as XIcon, CheckCircle } from 'lucide-react';
import { get, set } from 'idb-keyval';
import { cn } from '@/lib/utils';
import { db, doc, onSnapshot, setDoc } from '@/lib/firebase';
import { PerfectCursor } from 'perfect-cursors';

function usePerfectCursor(cb: (point: number[]) => void, point?: number[]) {
  const [pc] = useState(() => new PerfectCursor(cb));
  useEffect(() => {
    if (point) pc.addPoint(point);
  }, [pc, point]);
  useEffect(() => () => pc.dispose(), [pc]);
  return pc;
}

function CursorOverlay({ state }: { state: any }) {
  const [point, setPoint] = useState([state.cursor.x, state.cursor.y]);
  usePerfectCursor(setPoint, [state.cursor.x, state.cursor.y]);
  
  return (
    <div 
      className="absolute pointer-events-none z-50 pointer-events-none will-change-transform"
      style={{ 
        left: 0,
        top: 0,
        transform: `translate(${point[0]}px, ${point[1]}px) translate(-50%, -50%)`
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="drop-shadow-md">
         <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-5.01c.2-.21.49-.32.78-.32h6.79c.45 0 .67-.54.35-.85L6.35 2.85c-.31-.31-.85-.09-.85.36z" fill={state.user.color} stroke="white" strokeWidth="2"/>
      </svg>
      <div 
        className="absolute top-5 left-3 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-md whitespace-nowrap"
        style={{ backgroundColor: state.user.color }}
      >
        {state.user.name}
      </div>
    </div>
  );
}

function BlobMedia({ content, type, className }: { content: string, type: 'image' | 'video', className?: string }) {
  const [blobSrc, setBlobSrc] = useState<string>('');

  useEffect(() => {
    if (content.startsWith('local-blob:')) {
      const id = content.split(':')[1];
      let active = true;
      let url = '';
      get(`blob_${id}`).then((blob: any) => {
        if (active && blob instanceof Blob) {
           url = URL.createObjectURL(blob);
           setBlobSrc(url);
        }
      });
      return () => {
        active = false;
        if (url) URL.revokeObjectURL(url);
      };
    }
  }, [content]);

  const src = content.startsWith('local-blob:') ? blobSrc : content;

  if (!src) return <div className="w-[400px] h-[300px] bg-slate-100 animate-pulse rounded flex items-center justify-center text-xs text-black/50">Loading Media...</div>;

  if (type === 'video') return <video src={src} className={className} controls onPointerDown={(e) => e.stopPropagation()} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} className={className} alt="Media content" />;
}

type BoardNode = {
  id: string;
  type: 'image' | 'text' | 'video' | 'embed';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content: string;
};

type Comment = {
  id: string;
  x: number;
  y: number;
  text: string;
  author: string;
};

function getEmbedDetails(url: string) {
  try {
    if (url.includes('youtube.com/watch') || url.includes('youtube.com/shorts/')) {
      const urlObj = new URL(url);
      const v = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
      return { url: `https://www.youtube.com/embed/${v}`, w: 400, h: 225 };
    }
    if (url.includes('youtu.be/')) {
      const urlObj = new URL(url);
      return { url: `https://www.youtube.com/embed${urlObj.pathname}`, w: 400, h: 225 };
    }
    if (url.includes('instagram.com/')) {
      const cleanUrl = url.split('?')[0].replace(/\/$/, '');
      return { url: `${cleanUrl}/embed`, w: 340, h: 440 };
    }
    if (url.includes('pinterest.com/pin/')) {
      const parts = url.split('/');
      const pinIndex = parts.indexOf('pin');
      if (pinIndex !== -1 && parts[pinIndex + 1]) {
        return { url: `https://assets.pinterest.com/ext/embed.html?id=${parts[pinIndex + 1]}`, w: 236, h: 420 };
      }
    }
  } catch (e) {}
  return { url, w: 400, h: 300 }; // Default
}

const isImageUrl = (url: string) => /\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i.test(url);

export function Moodboard({ window: osWindow }: { window: OSWindow }) {
  const { currentUser, workspaceMode } = useOS();
  const [nodes, setNodes] = useState<BoardNode[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, z: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [voteMode, setVoteMode] = useState(false);
  const [currentVoteIndex, setCurrentVoteIndex] = useState(0);
  
  const colorRef = useRef<string>('#000');
  const isSyncingRef = useRef(false);

  const projectId = osWindow.data?.projectId || 'global';
  const roomId = `moodboard-${workspaceMode}-${projectId}`;
  
  // Realtime Cursors and Local-First CRDT (Yjs) (Phase 2 & 3)
  const [awarenessInfo, setAwarenessInfo] = useState<any[]>([]);
  
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoaded(false);
    colorRef.current = `hsl(${Math.round(Math.random() * 360)}, 100%, 50%)`;
    
    // Abstracted Storage Layer & Sync Manager imports
    import('yjs').then(Y => {
        import('y-indexeddb').then(({ IndexeddbPersistence }) => {
            const ydoc = new Y.Doc();
            const yNodes = ydoc.getMap<BoardNode>('nodes');
            const yComments = ydoc.getArray<Comment>('comments');
            
            // Local IndexedDB persistence
            const provider = new IndexeddbPersistence(roomId, ydoc);
            
            // Let's bind UI
            const syncUiToYjs = () => {
                setNodes(Array.from(yNodes.values()));
                setComments(yComments.toArray());
            };
            
            provider.on('synced', () => {
                if (yNodes.size === 0) {
                    const initNode: BoardNode = { id: '1', type: 'text', x: 100, y: 100, content: `CAMPAIGN: "${projectId.toUpperCase()}"\n\n${workspaceMode === 'agency' ? 'Agency Shared Mode' : 'Private Mode'}` };
                    yNodes.set(initNode.id, initNode);
                }
                syncUiToYjs();
                setIsLoaded(true);
            });
            
            yNodes.observe(syncUiToYjs);
            yComments.observe(syncUiToYjs);

            let webrtcProvider: any = null;
            if (workspaceMode === 'agency') {
                import('y-webrtc').then(({ WebrtcProvider }) => {
                   webrtcProvider = new WebrtcProvider(roomId, ydoc, { signaling: ['wss://signaling.yjs.dev'] });
                   webrtcProvider.awareness.setLocalStateField('user', {
                     name: currentUser?.name || 'Anonymous',
                     color: colorRef.current,
                     avatar: currentUser?.avatarUrl
                   });
                   
                   webrtcProvider.awareness.on('change', () => {
                     const states = Array.from(webrtcProvider.awareness.getStates().entries())
                       .filter((entry: any) => entry[0] !== webrtcProvider.doc.clientID && entry[1].user && entry[1].cursor)
                       .map((entry: any) => ({ clientId: entry[0], ...entry[1] }));
                     setAwarenessInfo(states);
                   });
                   
                   // Store on window object to update cursors easily
                   (globalThis.window as any)[`webrtc_${osWindow.id}`] = webrtcProvider;
                });
            }

            // Sync down to our state setter refs mapping (to mock React's setState behavior)
            (globalThis.window as any)[`ydoc_${osWindow.id}`] = yNodes;

            return () => {
                provider.destroy();
                if (webrtcProvider) {
                   webrtcProvider.destroy();
                }
                delete (globalThis.window as any)[`webrtc_${osWindow.id}`];
                delete (globalThis.window as any)[`ydoc_${osWindow.id}`];
            };
        });
    });
  }, [roomId, workspaceMode, currentUser, projectId, osWindow.id]);

  // Handle inject data from window param on first load
  useEffect(() => {
     if (isLoaded && osWindow.data?.url) {
        const yNodes = (globalThis.window as any)[`ydoc_${osWindow.id}`];
        if (yNodes) {
           const existing = Array.from(yNodes.values()).find((n: any) => n.content === osWindow.data?.url);
           if (!existing) {
              const newId = crypto.randomUUID();
              yNodes.set(newId, { id: newId, type: 'image', x: 200, y: 200, width: 400, content: osWindow.data.url });
           }
        }
     }
  }, [osWindow.data?.url, isLoaded, osWindow.id]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      setCamera(prev => {
        let { x, y, z } = prev;
        
        if (e.ctrlKey || e.metaKey) {
          const zoomFactor = Math.pow(0.995, e.deltaY);
          const newZ = Math.min(Math.max(0.1, z * zoomFactor), 5);
          
          const rect = container.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          
          x = mouseX - (mouseX - x) * (newZ / z);
          y = mouseY - (mouseY - y) * (newZ / z);
          z = newZ;
        } else {
          x -= e.deltaX;
          y -= e.deltaY;
        }
        
        return { x, y, z };
      });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  // Update helper for Yjs writes
  const _updateYNode = (newVals: Partial<BoardNode> & { id: string }) => {
     const yNodes = (globalThis.window as any)[`ydoc_${osWindow.id}`];
     if (yNodes) {
        const existing = yNodes.get(newVals.id) || {};
        yNodes.set(newVals.id, { ...existing, ...newVals });
     }
  };

  const addText = () => {
    const x = (osWindow.width / 2 - camera.x) / camera.z;
    const y = (osWindow.height / 2 - camera.y) / camera.z;
    const newId = crypto.randomUUID();
    _updateYNode({ id: newId, type: 'text', x, y, content: 'New Text' });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert(`File is too large. Maximum size is 50MB.`);
      return;
    }

    const fileId = crypto.randomUUID();
    await set(`blob_${fileId}`, file);

    const x = (osWindow.width / 2 - camera.x) / camera.z;
    const y = (osWindow.height / 2 - camera.y) / camera.z;
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    const newId = crypto.randomUUID();
    _updateYNode({ id: newId, type, x, y, content: `local-blob:${fileId}` });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddLink = () => {
    const url = prompt('Enter a URL (YouTube, Instagram, Pinterest, Image, etc.):');
    if (url) {
      processUrl(url);
    }
  };

  const processUrl = (url: string) => {
    const x = (osWindow.width / 2 - camera.x) / camera.z;
    const y = (osWindow.height / 2 - camera.y) / camera.z;
    
    let type: BoardNode['type'] = 'embed';
    if (isImageUrl(url)) {
        type = 'image';
    } else if (url.includes('youtube.com/') || url.includes('youtu.be/') || url.includes('instagram.com/') || url.includes('pinterest.com/')) {
        type = 'embed';
    }
    const newId = crypto.randomUUID();
    _updateYNode({ id: newId, type, x, y, content: url });
  };

  const deleteNode = (id: string) => {
    const yNodes = (globalThis.window as any)[`ydoc_${osWindow.id}`];
    if (yNodes) yNodes.delete(id);
  };
  
  const updateNodePosition = (id: string, x: number, y: number) => {
    _updateYNode({ id, x, y });
  };
  
  const updateNodeContent = (id: string, content: string) => {
    _updateYNode({ id, content });
  };
  
  const updateNodeSize = (id: string, width: number, height: number) => {
     _updateYNode({ id, width, height });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const activeElement = document.activeElement;
    if (activeElement && activeElement.tagName === 'TEXTAREA') return; 

    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const x = (osWindow.width / 2 - camera.x) / camera.z;
            const y = (osWindow.height / 2 - camera.y) / camera.z;
            const fileId = crypto.randomUUID();
            await set(`blob_${fileId}`, file);
            _updateYNode({ id: crypto.randomUUID(), type: 'image', x, y, content: `local-blob:${fileId}` });
          };
          reader.readAsArrayBuffer(file); // Just to trigger onload, though we don't use it
        }
        return; 
      }
    }
    
    // If no image, try text
    const text = e.clipboardData.getData('text');
    if (text) {
        if (/^https?:\/\//.test(text.trim())) {
           processUrl(text.trim());
        } else {
           const x = (osWindow.width / 2 - camera.x) / camera.z;
           const y = (osWindow.height / 2 - camera.y) / camera.z;
           _updateYNode({ id: crypto.randomUUID(), type: 'text', x, y, content: text });
        }
    }
  };

  const [mode, setMode] = useState<'pan'|'select'|'comment'>('select');

  const handlePointerDown = (e: React.PointerEvent) => {
    // Middle click or right click panning
    if (e.button === 1 || e.button === 2 || mode === 'pan') {
      e.preventDefault();
      setIsPanning(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (mode === 'comment' && e.target === e.currentTarget) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left - camera.x) / camera.z;
      const y = (e.clientY - rect.top - camera.y) / camera.z;
      
      const newComment: Comment = {
        id: crypto.randomUUID(),
        x, y, text: 'New comment...', author: 'Guest'
      };
      setComments(prev => [...prev, newComment]);
      setMode('select');
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setCamera(prev => ({
        ...prev,
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
    
    // Broadcast WebRTC cursor (Phase 3)
    const webrtc = (globalThis.window as any)[`webrtc_${osWindow.id}`];
    if (webrtc && webrtc.awareness) {
      const now = Date.now();
      if (!webrtc.lastCursorUpdate || now - webrtc.lastCursorUpdate > 50) {
        webrtc.lastCursorUpdate = now;
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const x = (e.clientX - rect.left - camera.x) / camera.z;
          const y = (e.clientY - rect.top - camera.y) / camera.z;
          webrtc.awareness.setLocalStateField('cursor', { x, y });
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsPanning(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  if (!isLoaded) return null;

  return (
    <div 
      ref={containerRef}
      className={cn(
        "w-full h-full bg-[#eee] overflow-hidden relative font-sans outline-none",
        isPanning ? "cursor-grabbing" : "cursor-default"
      )}
      onPaste={handlePaste}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      tabIndex={0} 
    >
      {/* Canvas Grid Background */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-20 origin-top-left"
        style={{ 
          backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', 
          backgroundSize: `${24 * camera.z}px ${24 * camera.z}px`,
          backgroundPosition: `${camera.x}px ${camera.y}px`
        }}
      />

      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg border border-black/10 z-50 flex items-center gap-2">
        <div className="px-2 py-1 flex flex-col justify-center text-[10px] rounded uppercase font-bold tracking-wider leading-tight mr-2 text-black/50">
          <span>{workspaceMode}</span>
          <span className="text-[8px] opacity-70">Context</span>
        </div>
        <div className="w-px h-6 bg-black/10 mx-[-4px]" />
        
        <button onClick={() => setMode('select')} className={cn("w-8 h-8 rounded flex items-center justify-center transition-colors", mode === 'select' ? "bg-black text-white" : "text-black/60 hover:bg-slate-100 hover:text-black")}>
          <MousePointer2 className="w-4 h-4" />
        </button>
        <button onClick={() => setMode('comment')} className={cn("w-8 h-8 rounded flex items-center justify-center transition-colors", mode === 'comment' ? "bg-black text-white" : "text-black/60 hover:bg-slate-100 hover:text-black")} title="Add Comment">
          <MessageSquare className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-black/10 mx-2" />
        <button onClick={addText} className="w-8 h-8 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 hover:text-black transition-colors" title="Add Text">
          <Type className="w-4 h-4" />
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="w-8 h-8 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 hover:text-black transition-colors" title="Upload Media (Image/Video)">
          <Upload className="w-4 h-4" />
        </button>
        <button onClick={handleAddLink} className="w-8 h-8 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 hover:text-black transition-colors" title="Add Link (YouTube, Instagram, etc.)">
          <LinkIcon className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-black/10 mx-2" />
        <button onClick={() => { setVoteMode(true); setCurrentVoteIndex(0); }} className="px-3 h-8 rounded flex items-center justify-center bg-rose-50 text-rose-500 font-bold text-xs hover:bg-rose-100 transition-colors gap-1" title="Moodboard Mill (Voting)">
          <Heart className="w-3.5 h-3.5" /> Mill
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*,video/*" 
          onChange={handleFileUpload} 
        />
      </div>

      {/* Nodes & Cursors */}
      <div 
        className="absolute inset-0 origin-top-left"
        style={{ 
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.z})`,
        }}
      >
        {nodes.map(node => (
          <DraggableNode 
            key={node.id} 
            node={node} 
            cameraScale={camera.z}
            onDelete={() => deleteNode(node.id)} 
            onPositionChange={(x, y) => updateNodePosition(node.id, x, y)}
            onContentChange={(content) => updateNodeContent(node.id, content)}
          />
        ))}

        {comments.map((comment, i) => (
          <div 
            key={comment.id}
            className="absolute rounded bg-yellow-200 text-black shadow-md border border-yellow-400 p-2 text-sm w-48 font-sans cursor-text group"
            style={{ left: comment.x, top: comment.y }}
            onPointerDown={(e) => e.stopPropagation()}
          >
             <button 
                onClick={() => setComments(c => c.filter(x => x.id !== comment.id))}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
             >
                ×
             </button>
             <div className="text-[10px] uppercase font-bold text-black/40 mb-1">{comment.author}</div>
             <textarea 
               className="w-full bg-transparent border-none outline-none resize-none"
               value={comment.text}
               onChange={(e) => setComments(c => c.map(x => x.id === comment.id ? { ...x, text: e.target.value } : x))}
               placeholder="Write comment..."
               rows={2}
               autoFocus={i === comments.length - 1}
             />
          </div>
        ))}
        {awarenessInfo.map((state) => {
          if (!state.cursor || !state.user) return null;
          return <CursorOverlay key={state.clientId} state={state} />;
        })}
      </div>

      {/* Moodboard Mill Voting Overlay */}
      {voteMode && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-8">
          <button onClick={() => setVoteMode(false)} className="absolute top-6 right-6 text-white/50 hover:text-white bg-white/10 p-2 rounded-full transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2 mb-2">
              <Heart className="w-6 h-6 text-rose-500 fill-rose-500" /> Moodboard Mill
            </h2>
            <p className="text-white/50 text-sm max-w-md">Client Voting Mode: Approve or reject items to generate a precise taste profile for this campaign.</p>
          </div>

          {nodes.filter(n => n.type === 'image' || n.type === 'embed').length > 0 ? (
            currentVoteIndex < nodes.filter(n => n.type === 'image' || n.type === 'embed').length ? (
              <div className="relative w-full max-w-sm aspect-[3/4] bg-[#111] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col items-center justify-center group">
                <div className="absolute inset-0 p-4 flex items-center justify-center bg-black/50 pointer-events-none">
                  {(() => {
                     const voteNodes = nodes.filter(n => n.type === 'image' || n.type === 'embed');
                     const node = voteNodes[currentVoteIndex];
                     if (node.type === 'image') return <BlobMedia content={node.content} type="image" className="max-w-full max-h-full object-contain rounded" />;
                     return <div className="text-white/50 bg-black/50 p-4 rounded text-center">Video/Embed Item<br/><span className="text-xs break-all">{node.content}</span></div>;
                  })()}
                </div>
                
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 px-6">
                  <button 
                    onClick={() => setCurrentVoteIndex(c => c + 1)}
                    className="w-16 h-16 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white flex items-center justify-center hover:bg-rose-500 hover:border-rose-500 hover:text-white transition-all shadow-xl"
                  >
                    <XIcon className="w-8 h-8" />
                  </button>
                  <button 
                    onClick={() => setCurrentVoteIndex(c => c + 1)}
                    className="w-16 h-16 rounded-full bg-white/10 backdrop-blur border border-white/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:border-emerald-500 hover:text-white transition-all shadow-xl"
                  >
                    <Heart className="w-8 h-8 fill-current" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center bg-white/5 border border-white/10 p-8 rounded-2xl max-w-md w-full">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Voting Complete</h3>
                <p className="text-white/60 text-sm mb-6">Taste profile successfully generated and logged to the Campaign Lab.</p>
                <button onClick={() => setVoteMode(false)} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg transition-colors">
                  Return to Canvas
                </button>
              </div>
            )
          ) : (
             <div className="text-center text-white/50 bg-white/5 border border-white/10 p-8 rounded-2xl">
               Add images or media to the board first to start voting.
             </div>
          )}
        </div>
      )}
    </div>
  );
}

function DraggableNode({ node, cameraScale, onDelete, onPositionChange, onContentChange }: { node: BoardNode, cameraScale: number, onDelete: () => void, onPositionChange: (x: number, y: number) => void, onContentChange: (c: string) => void }) {
  const dragControls = useDragControls();

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      initial={{ x: node.x, y: node.y, opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onDragEnd={(e, info) => {
        onPositionChange(node.x + info.offset.x / cameraScale, node.y + info.offset.y / cameraScale);
      }}
      className="absolute bg-white shadow-xl rounded-lg border border-black/10 overflow-hidden group min-w-[200px]"
      style={{ position: 'absolute' }} 
    >
      <div 
        className="h-6 w-full bg-slate-50 border-b border-black/5 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity flex items-center justify-between px-2 cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <GripHorizontal className="w-3 h-3 text-slate-400" />
        <button 
          onPointerDown={(e) => e.stopPropagation()} 
          onClick={onDelete}
          className="hover:bg-rose-100 p-0.5 rounded text-rose-500"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      
      {node.type === 'text' && (
        <div className="p-4 font-sans text-black">
          <textarea 
            className="w-full bg-transparent border-none outline-none resize-none min-h-[100px]"
            value={node.content}
            onChange={(e) => onContentChange(e.target.value)}
            spellCheck={false}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Type or paste text..."
          />
        </div>
      )}

      {node.type === 'image' && (
        <div className="p-2 pointer-events-none">
          <BlobMedia content={node.content} type="image" className="max-w-[400px] h-auto object-cover rounded pointer-events-none" />
        </div>
      )}

      {node.type === 'video' && (
        <div className="p-2">
          <BlobMedia content={node.content} type="video" className="max-w-[400px] h-[300px] object-cover rounded" />
        </div>
      )}

        {node.type === 'embed' && (
          <div 
            className="p-2"
            style={{ 
              width: getEmbedDetails(node.content).w + 16, 
              height: getEmbedDetails(node.content).h + 16 
            }}
          >
            <iframe 
              src={getEmbedDetails(node.content).url} 
              className="w-full h-full border-none rounded pointer-events-auto"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </motion.div>
    );
  }

