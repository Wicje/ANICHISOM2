const fs = require('fs');

const path = '/home/zk3/workstation/experiments/ANICHISOM2/components/apps/productivity-suite.tsx';
let code = fs.readFileSync(path, 'utf-8');

const newSlidesEditor = `function SlidesEditor({ workspaceMode, projectId, currentUser, canvasRef, collab, onDirty }: { workspaceMode: 'private' | 'agency', projectId: string, currentUser: any, canvasRef: React.MutableRefObject<any>, collab: CollaborativeDocState, onDirty?: () => void }) {
  const localCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [loaded, setLoaded] = useState(false);
  const [slideOrder, setSlideOrder] = useState<string[]>([]);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isSyncingRef = useRef(false);
  const onDirtyRef = useRef(onDirty);
  useEffect(() => { onDirtyRef.current = onDirty; }, [onDirty]);

  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const previousStateRef = useRef<string>('');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const canvasObserverRef = useRef<any>(null);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const activeSlideIdRef = useRef<string | null>(null);
  activeSlideIdRef.current = activeSlideId;

  // Track Fullscreen
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handlePresent = () => {
    if (containerRef.current?.requestFullscreen) {
       containerRef.current.requestFullscreen();
    }
  };

  useEffect(() => {
    let active = true;

    import('fabric').then((fabric) => {
      if (!active || !localCanvasRef.current) return;

      const canvas = new fabric.Canvas(localCanvasRef.current, {
         width: 768,
         height: 432,
         backgroundColor: '#ffffff'
      });
      fabricCanvasRef.current = canvas;
      canvasRef.current = canvas;

      const createDefaultSlideState = (isFirst: boolean) => {
         const tempCanvas = new fabric.Canvas(null, { width: 768, height: 432, backgroundColor: '#ffffff' });
         if (isFirst) {
           const title = new fabric.IText('Project "Edge"', { left: 384, top: 150, originX: 'center', originY: 'center', fontFamily: 'sans-serif', fontSize: 48, fontWeight: 'bold', fill: '#1e293b' });
           const subtitle = new fabric.IText('An infrastructure presentation\\nexplaining local-first architecture and node scaling.', { left: 384, top: 250, originX: 'center', originY: 'center', fontFamily: 'sans-serif', fontSize: 20, fill: '#64748b', textAlign: 'center' });
           tempCanvas.add(title, subtitle);
         } else {
           const title = new fabric.IText('New Slide', { left: 384, top: 216, originX: 'center', originY: 'center', fontFamily: 'sans-serif', fontSize: 48, fill: '#cbd5e1' });
           tempCanvas.add(title);
         }
         return JSON.stringify(tempCanvas.toJSON());
      };

      const waitForSync = () => {
        if (!collab.synced || !active) return;

        const canvasMap = collab.sharedTypesRef.current.canvas;
        if (!canvasMap) { setLoaded(true); return; }

        const initSlides = () => {
          let order = canvasMap.get('slide_order');
          if (!order) {
            const firstId = 'slide-' + Date.now();
            order = JSON.stringify([firstId]);
            canvasMap.set('slide_order', order);
            canvasMap.set(firstId, createDefaultSlideState(true));
          }
          const parsedOrder = JSON.parse(order as string);
          setSlideOrder(parsedOrder);
          
          if (!activeSlideIdRef.current && parsedOrder.length > 0) {
            setActiveSlideId(parsedOrder[0]);
          }
        };
        initSlides();

        const observer = (event: any) => {
          const keys = event.keys;
          if (keys.has('slide_order')) {
            const newOrder = JSON.parse(canvasMap.get('slide_order') as string);
            setSlideOrder(newOrder);
            if (!newOrder.includes(activeSlideIdRef.current)) {
               setActiveSlideId(newOrder.length > 0 ? newOrder[0] : null);
            }
          }
          
          if (activeSlideIdRef.current && keys.has(activeSlideIdRef.current)) {
            const remoteState = canvasMap.get(activeSlideIdRef.current) as string | undefined;
            if (!remoteState || isSyncingRef.current) return;
            if (canvas.getActiveObject()) return; // Don't disrupt local editing

            const currentStateStr = JSON.stringify(canvas.toJSON());
            if (currentStateStr === remoteState) return;

            isSyncingRef.current = true;
            try {
              canvas.loadFromJSON(JSON.parse(remoteState)).then(() => {
                canvas.renderAll();
                setTimeout(() => { isSyncingRef.current = false; }, 100);
              }).catch(() => { isSyncingRef.current = false; });
            } catch {
              isSyncingRef.current = false;
            }
          }
        };
        
        canvasMap.observe(observer);
        canvasObserverRef.current = observer;
        setLoaded(true);
      };

      if (collab.synced) waitForSync();
      else {
        checkIntervalRef.current = setInterval(() => {
          if (collab.synced && active) {
            clearInterval(checkIntervalRef.current);
            waitForSync();
          }
        }, 200);
      }

      const handleModify = () => {
         if (isSyncingRef.current || !activeSlideIdRef.current) return;

         undoStackRef.current.push(previousStateRef.current);
         redoStackRef.current = [];
         setCanUndo(true);
         setCanRedo(false);

         previousStateRef.current = JSON.stringify(canvas.toJSON());
         isSyncingRef.current = true;
         
         const stateStr = JSON.stringify(canvas.toJSON());
         const canvasMap = collab.sharedTypesRef.current.canvas;
         if (canvasMap) {
           canvasMap.set(activeSlideIdRef.current, stateStr);
         }

         setTimeout(() => { isSyncingRef.current = false; }, 100);
         onDirtyRef.current?.();
      };

      canvas.on('object:modified', handleModify);
      canvas.on('text:changed', handleModify);
    });

    return () => {
      active = false;
      canvasRef.current = null;
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (canvasObserverRef.current && collab.sharedTypesRef.current.canvas) {
        collab.sharedTypesRef.current.canvas.unobserve(canvasObserverRef.current);
      }
      if (fabricCanvasRef.current) fabricCanvasRef.current.dispose();
    };
  }, [collab.synced, projectId]);

  useEffect(() => {
    if (!activeSlideId || !fabricCanvasRef.current || !collab.synced || !loaded) return;
    const canvasMap = collab.sharedTypesRef.current.canvas;
    if (!canvasMap) return;

    const state = canvasMap.get(activeSlideId) as string | undefined;
    if (state) {
      isSyncingRef.current = true;
      try {
        fabricCanvasRef.current.loadFromJSON(JSON.parse(state)).then(() => {
           fabricCanvasRef.current.renderAll();
           previousStateRef.current = JSON.stringify(fabricCanvasRef.current.toJSON());
           undoStackRef.current = [];
           redoStackRef.current = [];
           setCanUndo(false);
           setCanRedo(false);
           setTimeout(() => { isSyncingRef.current = false; }, 100);
        }).catch(() => { isSyncingRef.current = false; });
      } catch {
        isSyncingRef.current = false;
      }
    }
  }, [activeSlideId, loaded, projectId]);

  const addSlide = () => {
    const canvasMap = collab.sharedTypesRef.current.canvas;
    if (!canvasMap) return;
    const newId = 'slide-' + Date.now();
    
    // Default slide state
    const defaultState = JSON.stringify({ version: "5.3.0", objects: [], background: "#ffffff" });
    canvasMap.set(newId, defaultState);
    
    const newOrder = [...slideOrder, newId];
    canvasMap.set('slide_order', JSON.stringify(newOrder));
    setSlideOrder(newOrder);
    setActiveSlideId(newId);
  };

  const deleteSlide = (id: string) => {
    const canvasMap = collab.sharedTypesRef.current.canvas;
    if (!canvasMap || slideOrder.length <= 1) return;
    const newOrder = slideOrder.filter(s => s !== id);
    canvasMap.set('slide_order', JSON.stringify(newOrder));
    setSlideOrder(newOrder);
    if (activeSlideId === id) setActiveSlideId(newOrder[0]);
  };

  const handleSlidesUndo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || undoStackRef.current.length === 0 || !activeSlideId) return;
    redoStackRef.current.push(previousStateRef.current);
    const prevState = undoStackRef.current.pop()!;
    previousStateRef.current = prevState;
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);

    isSyncingRef.current = true;
    try {
      canvas.loadFromJSON(JSON.parse(prevState)).then(() => {
        canvas.renderAll();
        collab.sharedTypesRef.current.canvas.set(activeSlideId, prevState);
        setTimeout(() => { isSyncingRef.current = false; }, 100);
      }).catch(() => { isSyncingRef.current = false; });
    } catch { isSyncingRef.current = false; }
  };

  const handleSlidesRedo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || redoStackRef.current.length === 0 || !activeSlideId) return;
    undoStackRef.current.push(previousStateRef.current);
    const nextState = redoStackRef.current.pop()!;
    previousStateRef.current = nextState;
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);

    isSyncingRef.current = true;
    try {
      canvas.loadFromJSON(JSON.parse(nextState)).then(() => {
        canvas.renderAll();
        collab.sharedTypesRef.current.canvas.set(activeSlideId, nextState);
        setTimeout(() => { isSyncingRef.current = false; }, 100);
      }).catch(() => { isSyncingRef.current = false; });
    } catch { isSyncingRef.current = false; }
  };

  if (!collab.synced) return <div className="p-8 text-slate-500">Loading collaborative slides...</div>;

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* Thumbnail Sidebar */}
      {!isFullscreen && (
        <div className="w-48 shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col overflow-y-auto p-2 gap-2">
          {slideOrder.map((s, idx) => (
            <div key={s} className="flex gap-2 group relative">
              <span className="text-[10px] font-bold text-slate-400 mt-1 w-3 text-right shrink-0">{idx + 1}</span>
              <div 
                onClick={() => setActiveSlideId(s)}
                className={cn(
                "flex-1 aspect-video bg-white border rounded shadow-sm flex items-center justify-center cursor-pointer transition-all",
                activeSlideId === s ? "border-amber-400 ring-2 ring-amber-400 focus:outline-none" : "border-slate-200 hover:border-slate-300"
              )}>
                 <div className="text-[10px] text-slate-300 font-medium">Slide {idx + 1}</div>
              </div>
              <button onClick={() => deleteSlide(s)} className="absolute right-1 top-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-opacity">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button onClick={addSlide} className="mt-2 w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded text-xs flex items-center justify-center gap-1 font-medium transition-colors">
            <Plus className="w-3 h-3" /> Add Slide
          </button>
        </div>
      )}

      {/* Main Canvas Area */}
      <div
        className={cn(
          "flex-1 overflow-auto flex flex-col items-center justify-center relative",
          isFullscreen ? "bg-black" : "bg-slate-100 p-8"
        )}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleSlidesUndo(); }
          if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleSlidesRedo(); }
        }}
        tabIndex={0}
      >
         {/* Top bar */}
         {!isFullscreen && (
           <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
             <div className="flex items-center gap-1">
               <button onClick={handleSlidesUndo} disabled={!canUndo} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors bg-white shadow-sm border border-slate-200" title="Undo (Ctrl+Z)">
                 <Undo2 className="w-4 h-4 text-slate-600" />
               </button>
               <button onClick={handleSlidesRedo} disabled={!canRedo} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors bg-white shadow-sm border border-slate-200" title="Redo (Ctrl+Shift+Z)">
                 <Redo2 className="w-4 h-4 text-slate-600" />
               </button>
             </div>
             
             <button onClick={handlePresent} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded font-medium shadow-sm flex items-center gap-2 transition-colors">
               <span className="text-sm">Present</span>
             </button>
           </div>
         )}

         {!loaded && (
             <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 z-10">
                <div className="text-slate-500 animate-pulse">Loading canvas engine...</div>
             </div>
         )}
         <div 
            ref={containerRef}
            className={cn(
              "flex items-center justify-center overflow-hidden transition-all",
              isFullscreen ? "w-screen h-screen bg-black" : "shadow-2xl bg-white ring-1 ring-slate-200"
            )}
         >
            <div 
              style={{
                transform: isFullscreen ? \`scale(\${Math.min(window.innerWidth / 768, window.innerHeight / 432)})\` : 'scale(1)',
                transformOrigin: 'center center'
              }}
            >
              <canvas ref={localCanvasRef} />
            </div>
         </div>
      </div>
    </div>
  );
}`;

const startIndex = code.indexOf('function SlidesEditor(');
const endIndex = code.indexOf('function PdfEditor(');
if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + newSlidesEditor + "\n\n" + code.substring(endIndex);
  fs.writeFileSync(path, code);
  console.log('SlidesEditor replaced successfully.');
} else {
  console.log('Could not find boundaries.');
}
