'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { Shirt, Scissors, Cuboid, Cpu, PenTool, Layers, Type, Download, Maximize, Target, Zap, Bot, Search, ShoppingBag, TrendingUp, Undo2, Redo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

import { useCollaborativeDoc, CollaborativeDocState } from '@/lib/hooks/useCollaborativeDoc';
import { useClothingStore, Design, Collection, ProductionOrder } from '@/lib/stores/clothing.store';
import { getAiProvider } from '@/lib/ai-providers/ai-provider-factory';

export function ClothingBrandPack({ window: osWindow }: { window: OSWindow }) {
  const { workspaceMode } = useOS();
  const [activeTab, setActiveTab] = useState<'sketching' | 'drafting' | '3d-prototype' | 'production' | 'shopify'>('sketching');

  const collab = useCollaborativeDoc({
    appPrefix: 'clothing',
    docId: osWindow.id,
    sharedTypes: [
      { name: 'sketch', kind: 'Map' },
    ],
  });
  
  const { designs, collections, orders, createDesign, createCollection, createOrder, updateOrder, updateDesign, getDesignsByStatus, getPatternsForDesign } = useClothingStore();
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);

  const [shopifyData, setShopifyData] = useState<any[]>([
    { name: 'Mon', sales: 1200 }, { name: 'Tue', sales: 1900 }, { name: 'Wed', sales: 2400 },
    { name: 'Thu', sales: 1800 }, { name: 'Fri', sales: 3200 }, { name: 'Sat', sales: 4100 }, { name: 'Sun', sales: 3800 }
  ]);

  useEffect(() => {
    (useClothingStore as any).hydrate?.();
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-white text-black font-sans overflow-hidden">
      <div className="h-14 border-b border-black/10 flex items-center px-4 shrink-0 bg-gray-50">
        <Shirt className="w-5 h-5 mr-3" />
        <h1 className="font-bold hidden sm:block">Clothing Brand Pack</h1>
        <div className="ml-8 flex gap-2 overflow-x-auto no-scrollbar">
          {(['sketching', 'drafting', '3d-prototype', 'production', 'shopify'] as const).map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-md capitalize whitespace-nowrap transition-colors", 
                activeTab === tab ? "bg-black text-white" : "hover:bg-gray-200 text-gray-700"
              )}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-50/50">
        {activeTab === 'sketching' && <SketchingTab windowId={osWindow.id} collab={collab} designs={Object.values(designs)} selectedDesignId={selectedDesignId} onSelectDesign={setSelectedDesignId} onCreateDesign={createDesign} onUpdateDesign={updateDesign} />}
        {activeTab === 'drafting' && <DraftingTab />}
        {activeTab === '3d-prototype' && <Prototype3DTab />}
        {activeTab === 'production' && <ProductionTab orders={Object.values(orders)} designs={Object.values(designs)} onCreateOrder={createOrder} onUpdateOrder={updateOrder} />}
        {activeTab === 'shopify' && <ShopifyTab data={shopifyData} collections={Object.values(collections)} onCreateCollection={createCollection} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 1. Digital Sketching & Illustration (Fabric.js)
// ---------------------------------------------------------
function SketchingTab({ windowId, collab, designs, selectedDesignId, onSelectDesign, onCreateDesign, onUpdateDesign }: { windowId: string; collab: CollaborativeDocState; designs: Design[]; selectedDesignId: string | null; onSelectDesign: (id: string | null) => void; onCreateDesign: (name: string, category: Design['category']) => string; onUpdateDesign: (id: string, updates: Partial<Design>) => void }) {
  const [showDesignLibrary, setShowDesignLibrary] = useState(false);
  const [newDesignName, setNewDesignName] = useState('');
  const [newDesignCategory, setNewDesignCategory] = useState<Design['category']>('top');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<any>(null);
  const [fabricReady, setFabricReady] = useState(false);
  const [tool, setTool] = useState<'draw' | 'select' | 'text'>('draw');
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const previousStateRef = useRef<string>('');
  const isSyncingRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const handleSketchUndo = () => {
    const canvas = fabricRef.current;
    if (!canvas || undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current.pop()!;
    redoStackRef.current.push(JSON.stringify(canvas.toJSON()));
    isSyncingRef.current = true;
    canvas.loadFromJSON(prev, () => {
      canvas.renderAll();
      const state = JSON.stringify(canvas.toJSON());
      previousStateRef.current = state;
      isSyncingRef.current = false;
      const sketchMap = collab.sharedTypesRef.current.sketch;
      if (sketchMap) sketchMap.set('state', state);
    });
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  };

  const handleSketchRedo = () => {
    const canvas = fabricRef.current;
    if (!canvas || redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(JSON.stringify(canvas.toJSON()));
    isSyncingRef.current = true;
    canvas.loadFromJSON(next, () => {
      canvas.renderAll();
      const state = JSON.stringify(canvas.toJSON());
      previousStateRef.current = state;
      isSyncingRef.current = false;
      const sketchMap = collab.sharedTypesRef.current.sketch;
      if (sketchMap) sketchMap.set('state', state);
    });
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  };

  // Sync Fabric canvas state to Y.Map on local changes.
  // `fabricRef` and `collab.sharedTypesRef` are stable refs, so this callback
  // never changes identity — the init effect below runs exactly once.
  const syncToYjs = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || isSyncingRef.current) return;
    const state = JSON.stringify(canvas.toJSON());
    if (previousStateRef.current) {
      undoStackRef.current.push(previousStateRef.current);
      redoStackRef.current = [];
      setCanUndo(undoStackRef.current.length > 0);
      setCanRedo(false);
    }
    previousStateRef.current = state;
    const sketchMap = collab.sharedTypesRef.current.sketch;
    if (sketchMap) sketchMap.set('state', state);
  }, [collab.sharedTypesRef]);

  useEffect(() => {
    let canvas: any = null;
    let disposed = false;
    import('fabric').then((fabricModule) => {
      const fabric = (fabricModule as any).fabric || fabricModule;
      if (disposed || !canvasRef.current || !containerRef.current) return;

      canvas = new fabric.Canvas(canvasRef.current, {
        width: Math.max(containerRef.current.clientWidth - 40, 600),
        height: Math.max(containerRef.current.clientHeight - 40, 400),
        isDrawingMode: true,
        backgroundColor: '#ffffff'
      });

      canvas.freeDrawingBrush.color = '#000000';
      canvas.freeDrawingBrush.width = 3;

      canvas.on('path:created', () => syncToYjs());
      canvas.on('object:modified', () => syncToYjs());

      fabricRef.current = canvas;
      setFabricReady(true);

      // Load a template mannequin outline
      fabric.Image.fromURL('https://cdn-icons-png.flaticon.com/512/77/77305.png', (img: any) => {
         if (disposed || !canvas) return;
         img.set({ left: canvas.width / 2 - 100, top: 50, scaleX: 0.5, scaleY: 0.5, opacity: 0.1, selectable: false });
         canvas.add(img);
         canvas.sendToBack(img);
         canvas.renderAll();
         previousStateRef.current = JSON.stringify(canvas.toJSON());
      });
    });

    return () => {
      disposed = true;
      if (canvas) {
        canvas.dispose();
        canvas = null;
      }
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, [syncToYjs]);

  // Load remote canvas state from Y.Map when synced
  useEffect(() => {
    if (!collab.synced || !fabricReady) return;
    const canvas = fabricRef.current;
    if (!canvas) return;
    const sketchMap = collab.sharedTypesRef.current.sketch;
    if (!sketchMap) return;

    const remoteState = sketchMap.get('state') as string | undefined;
    if (remoteState) {
      isSyncingRef.current = true;
      canvas.loadFromJSON(remoteState, () => {
        canvas.renderAll();
        previousStateRef.current = JSON.stringify(canvas.toJSON());
        isSyncingRef.current = false;
      });
    }
  }, [collab.synced, fabricReady, collab.sharedTypesRef]);

  // Observe Y.Map for remote canvas updates
  useEffect(() => {
    if (!collab.synced || !fabricReady) return;
    const canvas = fabricRef.current;
    if (!canvas) return;
    const sketchMap = collab.sharedTypesRef.current.sketch;
    if (!sketchMap) return;

    const observer = () => {
      if (isSyncingRef.current) return;
      const remoteState = sketchMap.get('state') as string | undefined;
      if (remoteState) {
        isSyncingRef.current = true;
        canvas.loadFromJSON(remoteState, () => {
          canvas.renderAll();
          previousStateRef.current = JSON.stringify(canvas.toJSON());
          isSyncingRef.current = false;
        });
      }
    };

    sketchMap.observe(observer);
    return () => sketchMap.unobserve(observer);
  }, [collab.synced, fabricReady, collab.sharedTypesRef]);

  useEffect(() => {
     const canvas = fabricRef.current;
     if (!canvas) return;
     if (tool === 'draw') {
        canvas.isDrawingMode = true;
     } else {
        canvas.isDrawingMode = false;
     }
  }, [tool, fabricReady]);

  return (
    <div
      className="flex h-full p-4 gap-4"
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleSketchUndo(); }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleSketchRedo(); }
      }}
      tabIndex={0}
    >
      <div className="w-16 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col items-center py-4 gap-4 shrink-0">
         <button onClick={() => setTool('select')} className={cn("p-2 rounded-lg transition-colors", tool === 'select' ? "bg-black text-white" : "hover:bg-gray-100")}><Target className="w-5 h-5" /></button>
         <button onClick={() => setTool('draw')} className={cn("p-2 rounded-lg transition-colors", tool === 'draw' ? "bg-black text-white" : "hover:bg-gray-100")}><PenTool className="w-5 h-5" /></button>
         <button onClick={() => setTool('text')} className={cn("p-2 rounded-lg transition-colors", tool === 'text' ? "bg-black text-white" : "hover:bg-gray-100")}><Type className="w-5 h-5" /></button>
         <div className="w-8 h-px bg-gray-200 my-2" />
         <button onClick={handleSketchUndo} disabled={!canUndo} className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent hover:bg-gray-100" title="Undo (Ctrl+Z)"><Undo2 className="w-5 h-5" /></button>
         <button onClick={handleSketchRedo} disabled={!canRedo} className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent hover:bg-gray-100" title="Redo (Ctrl+Shift+Z)"><Redo2 className="w-5 h-5" /></button>
         <div className="w-8 h-px bg-gray-200 my-2" />
         <button className="p-2 rounded-lg hover:bg-gray-100 text-blue-600" title="Apply Textile Map"><Layers className="w-5 h-5" /></button>
      </div>
      <div ref={containerRef} className="flex-1 bg-gray-200 rounded-xl border border-gray-300 shadow-inner flex items-center justify-center relative overflow-hidden">
         <div className="absolute top-4 left-4 bg-white/80 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider backdrop-blur-sm z-10 border border-gray-200 shadow-sm">Digital Sketchbook</div>
         <canvas ref={canvasRef} className="shadow-lg rounded-md" />
      </div>
      <div className="w-64 bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col gap-4 shrink-0">
         <h3 className="font-bold border-b border-gray-100 pb-2">Properties</h3>
         {tool === 'draw' && (
           <div className="flex flex-col gap-2">
             <label className="text-xs font-bold text-gray-500 uppercase">Brush Size</label>
              <input type="range" min="1" max="20" defaultValue="3" onChange={e => {
                 const canvas = fabricRef.current;
                 if (canvas) canvas.freeDrawingBrush.width = parseInt(e.target.value);
              }} className="w-full" />
             <label className="text-xs font-bold text-gray-500 uppercase mt-2">Color</label>
             <div className="flex gap-2">
                {['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B'].map(c => (
                  <button key={c} className="w-6 h-6 rounded-full border border-gray-300" style={{backgroundColor: c}} onClick={() => {
                     const canvas = fabricRef.current;
                     if (canvas) canvas.freeDrawingBrush.color = c;
                  }} />
                ))}
             </div>
           </div>
         )}
          <div className="mt-auto">
              <button onClick={() => {
                 const canvas = fabricRef.current;
                 const sketchData = canvas ? JSON.stringify(canvas.toJSON()) : '';
                 const id = onCreateDesign(newDesignName || 'Untitled Design', newDesignCategory);
                 onUpdateDesign(id, { sketchData });
                 onSelectDesign(id);
                 setNewDesignName('');
              }} className="w-full py-2 bg-black text-white rounded-lg text-sm font-bold shadow-sm">Save Sketch</button>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Design Name</label>
            <input type="text" value={newDesignName} onChange={e => setNewDesignName(e.target.value)} placeholder="e.g. Cargo Tee" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black" />
            <label className="text-xs font-bold text-gray-500 uppercase mt-1">Category</label>
            <select value={newDesignCategory} onChange={e => setNewDesignCategory(e.target.value as Design['category'])} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black">
              {['top', 'bottom', 'outerwear', 'accessory', 'footwear'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={() => setShowDesignLibrary(!showDesignLibrary)} className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-200 transition-colors">{showDesignLibrary ? 'Hide' : 'Show'} Design Library</button>
          {showDesignLibrary && (
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {designs.length === 0 && <p className="text-xs text-gray-400 italic">No saved designs yet.</p>}
              {designs.map(d => (
                <button key={d.id} onClick={() => {
                  onSelectDesign(d.id);
                  setNewDesignName(d.name);
                  setNewDesignCategory(d.category);
                  if (d.sketchData && fabricRef.current) {
                    fabricRef.current.loadFromJSON(d.sketchData, () => fabricRef.current.renderAll());
                  }
                }} className={cn("text-left px-2 py-1.5 rounded text-xs border transition-colors", selectedDesignId === d.id ? "bg-black text-white border-black" : "border-transparent hover:bg-gray-100")}>
                  <div className="font-bold truncate">{d.name}</div>
                  <div className={cn("text-[10px]", selectedDesignId === d.id ? "text-white/70" : "text-gray-400")}>{d.category} · {d.status}</div>
                </button>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 2. Pattern Making & Drafting
// ---------------------------------------------------------
function DraftingTab() {
  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex justify-between items-center">
         <div>
            <h2 className="text-2xl font-bold tracking-tight">Vector Drafting & Patterns</h2>
            <p className="text-sm text-gray-500">Automated grading and fabric layout optimization.</p>
         </div>
         <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 flex items-center gap-2"><Maximize className="w-4 h-4" /> Auto-Grade</button>
            <button className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold shadow-sm hover:bg-gray-800 flex items-center gap-2"><Scissors className="w-4 h-4" /> Export DXF</button>
         </div>
      </div>
      
      <div className="flex-1 flex gap-4 min-h-0">
         <div className="flex-1 bg-[#f0f0f0] border border-gray-300 rounded-xl relative overflow-hidden shadow-inner flex items-center justify-center p-8">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            {/* Mock Vector Patterns */}
            <div className="relative w-full max-w-2xl h-full border-2 border-blue-400 bg-blue-50/50 backdrop-blur-sm rounded p-4 flex flex-wrap gap-4 items-center justify-center">
               <svg viewBox="0 0 100 100" className="w-48 h-48 drop-shadow-md stroke-blue-600 fill-white stroke-2 hover:fill-blue-100 transition-colors cursor-pointer">
                  <path d="M 30,10 Q 50,20 70,10 L 90,40 L 70,100 L 30,100 L 10,40 Z" />
                  <text x="50" y="55" textAnchor="middle" fontSize="8" className="fill-blue-800 stroke-none font-mono">FRONT BODICE</text>
                  <text x="50" y="65" textAnchor="middle" fontSize="6" className="fill-blue-600 stroke-none font-mono">CUT 1 ON FOLD</text>
               </svg>
               <svg viewBox="0 0 100 100" className="w-48 h-48 drop-shadow-md stroke-blue-600 fill-white stroke-2 hover:fill-blue-100 transition-colors cursor-pointer">
                  <path d="M 30,10 Q 50,15 70,10 L 85,45 L 65,95 L 35,95 L 15,45 Z" />
                  <text x="50" y="55" textAnchor="middle" fontSize="8" className="fill-blue-800 stroke-none font-mono">BACK BODICE</text>
                  <text x="50" y="65" textAnchor="middle" fontSize="6" className="fill-blue-600 stroke-none font-mono">CUT 2</text>
               </svg>
               <svg viewBox="0 0 100 100" className="w-32 h-64 drop-shadow-md stroke-blue-600 fill-white stroke-2 hover:fill-blue-100 transition-colors cursor-pointer">
                  <path d="M 20,10 Q 50,-5 80,10 L 90,90 L 10,90 Z" />
                  <text x="50" y="50" textAnchor="middle" fontSize="8" className="fill-blue-800 stroke-none font-mono transform -rotate-90">SLEEVE (CUT 2)</text>
               </svg>
            </div>
         </div>
         
         <div className="w-72 bg-white border border-gray-200 rounded-xl shadow-sm p-4 overflow-y-auto">
            <h3 className="font-bold border-b border-gray-100 pb-2 mb-4">Grading Rules (Size M Base)</h3>
            {['XS', 'S', 'M', 'L', 'XL'].map(size => (
               <div key={size} className={cn("flex justify-between items-center p-2 rounded-lg mb-2 border", size === 'M' ? "bg-blue-50 border-blue-200" : "border-transparent hover:bg-gray-50")}>
                  <span className={cn("font-bold", size === 'M' ? "text-blue-700" : "text-gray-700")}>{size}</span>
                  <span className="text-xs text-gray-500 font-mono">{size === 'M' ? 'Base Size' : 'Graded'}</span>
               </div>
            ))}
            
            <h3 className="font-bold border-b border-gray-100 pb-2 mt-8 mb-4">Fabric Layout (Marker)</h3>
            <div className="bg-gray-100 h-24 rounded border border-gray-300 relative overflow-hidden">
               <div className="absolute top-0 bottom-0 left-0 bg-emerald-500/20 border-r border-emerald-500 w-[85%] flex items-center justify-center text-xs font-bold text-emerald-700 font-mono">85% Efficiency</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Roll Width: 58" • Estimated Yield: 1.2 yds</p>
         </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 3. 3D Prototyping & Simulation
// ---------------------------------------------------------
function Prototype3DTab() {
  const [mode, setMode] = useState<'fit' | 'strain' | 'physics'>('fit');
  const [ready, setReady] = useState(false);
  const [modelUrl, setModelUrl] = useState('https://modelviewer.dev/shared-assets/models/glTF-Sample-Models/2.0/Corset/glTF/Corset.gltf');
  const [inputUrl, setInputUrl] = useState('');
  
  useEffect(() => { import('@google/model-viewer').then(() => setReady(true)); }, []);
  if (!ready) return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading 3D Engine...</div>;
  
  return (
    <div className="flex flex-col h-full p-4 gap-4">
       <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2"><Cuboid className="w-5 h-5 text-blue-500" /> 3D Virtual Fitting</h2>
            <p className="text-xs text-gray-500">Industry-standard drape and pattern simulation</p>
          </div>
          <div className="flex gap-4 items-center">
             <form 
               onSubmit={(e) => { e.preventDefault(); if (inputUrl) setModelUrl(inputUrl); }}
               className="flex items-center gap-2"
             >
                <input 
                  type="url" 
                  placeholder="Enter custom .glb/.gltf URL" 
                  value={inputUrl}
                  onChange={e => setInputUrl(e.target.value)}
                  className="text-xs px-3 py-1.5 border border-gray-300 rounded-md w-64 focus:outline-none focus:ring-1 focus:ring-black"
                />
                <button type="submit" className="text-xs bg-black text-white px-3 py-1.5 rounded-md hover:bg-gray-800">Load Model</button>
             </form>
             <div className="w-px h-6 bg-gray-300"></div>
             <div className="flex bg-gray-100 p-1 rounded-lg">
                {(['fit', 'strain', 'physics'] as const).map(m => (
                  <button 
                    key={m} 
                    onClick={() => setMode(m)} 
                    className={cn("px-4 py-1 rounded-md text-xs font-bold capitalize transition-all", mode === m ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-black")}
                  >
                    {m}
                  </button>
                ))}
             </div>
          </div>
       </div>
       
       <div className="flex-1 bg-[#f4f4f5] rounded-xl overflow-hidden relative shadow-inner border border-gray-300">
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-white/90 p-4 rounded-lg border border-gray-200 shadow-lg backdrop-blur-md">
             <h3 className="text-blue-600 font-bold uppercase tracking-widest text-[10px] flex items-center gap-1"><Zap className="w-3 h-3" /> Simulation Engine Active</h3>
             <div className="text-xs text-gray-700 font-medium">Avatar: Female Standard US 6</div>
             <div className="text-xs text-gray-700 font-medium">Fabric: Heavyweight French Terry</div>
             <div className="text-xs text-gray-700 font-medium">Drape Accuracy: 98.4%</div>
             
             {mode === 'strain' && (
                <div className="mt-4 flex flex-col gap-1 border-t border-gray-200 pt-3">
                   <div className="text-[10px] font-bold text-gray-400 uppercase">Strain Map Legend</div>
                   <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 bg-red-500 rounded-full" /> High Tension</div>
                   <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 bg-yellow-400 rounded-full" /> Moderate</div>
                   <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 bg-blue-500 rounded-full" /> Relaxed</div>
                </div>
             )}
          </div>
          
          {/* @ts-ignore */}
          <model-viewer
            src={modelUrl}
            alt="3D Garment Prototype"
            auto-rotate
            camera-controls
            ar
            ar-modes="webxr scene-viewer quick-look"
            shadow-intensity="1.5"
            exposure={mode === 'strain' ? "0.6" : "1.2"}
            environment-image="neutral"
            style={{ width: '100%', height: '100%' }}
          >
             {mode === 'strain' && (
               <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent animate-pulse" />
             )}
             <button slot="ar-button" className="absolute bottom-4 right-4 bg-black text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-gray-800 transition-colors">
               View in AR (Mobile)
             </button>
          {/* @ts-ignore */}
          </model-viewer>
       </div>
    </div>
  );
}

// ---------------------------------------------------------
// 4. AI & Production Tools
// ---------------------------------------------------------
function ProductionTab({ orders, designs, onCreateOrder, onUpdateOrder }: { orders: ProductionOrder[]; designs: Design[]; onCreateOrder: (designId: string, quantity: number, manufacturer: string, unitCost: number, dueDate: string) => string; onUpdateOrder: (id: string, updates: Partial<Omit<ProductionOrder, 'id' | 'createdAt'>>) => void }) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [orderDesignId, setOrderDesignId] = useState('');
  const [orderQty, setOrderQty] = useState('100');
  const [orderManufacturer, setOrderManufacturer] = useState('');
  const [orderCost, setOrderCost] = useState('5.00');
  const [orderDue, setOrderDue] = useState('');

  const handleCreateOrder = () => {
    if (!orderDesignId || !orderManufacturer || !orderDue) return;
    onCreateOrder(orderDesignId, parseInt(orderQty) || 100, orderManufacturer, parseFloat(orderCost) || 5, orderDue);
    setShowNewOrder(false);
    setOrderDesignId(''); setOrderQty('100'); setOrderManufacturer(''); setOrderCost('5.00'); setOrderDue('');
  };

  const statusColors: Record<string, string> = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'confirmed': 'bg-blue-100 text-blue-800',
    'in-production': 'bg-indigo-100 text-indigo-800',
    'shipped': 'bg-purple-100 text-purple-800',
    'delivered': 'bg-green-100 text-green-800',
  };

  return (
    <div className="flex flex-col h-full p-4 gap-6">
       {/* Orders Panel */}
       <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
         <div className="flex items-center justify-between mb-3">
           <h3 className="font-bold">Production Orders</h3>
           <button onClick={() => setShowNewOrder(!showNewOrder)} className="px-3 py-1 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors">{showNewOrder ? 'Cancel' : '+ New Order'}</button>
         </div>
         {showNewOrder && (
           <div className="flex gap-2 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200 flex-wrap">
             <select value={orderDesignId} onChange={e => setOrderDesignId(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-xs">
               <option value="">Select design...</option>
               {designs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
             </select>
             <input type="number" value={orderQty} onChange={e => setOrderQty(e.target.value)} placeholder="Qty" className="border border-gray-300 rounded px-2 py-1 text-xs w-20" />
             <input type="text" value={orderManufacturer} onChange={e => setOrderManufacturer(e.target.value)} placeholder="Manufacturer" className="border border-gray-300 rounded px-2 py-1 text-xs flex-1 min-w-[120px]" />
             <input type="number" step="0.01" value={orderCost} onChange={e => setOrderCost(e.target.value)} placeholder="Unit cost" className="border border-gray-300 rounded px-2 py-1 text-xs w-20" />
             <input type="date" value={orderDue} onChange={e => setOrderDue(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-xs" />
             <button onClick={handleCreateOrder} className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700">Create</button>
           </div>
         )}
         {orders.length === 0 ? (
           <p className="text-xs text-gray-400 italic">No orders yet.</p>
         ) : (
           <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
             {orders.map(o => {
               const design = designs.find(d => d.id === o.designId);
               return (
                 <div key={o.id} className="flex items-center justify-between text-xs px-2 py-1 rounded hover:bg-gray-50">
                   <span className="font-bold truncate max-w-[150px]">{design?.name ?? 'Unknown'}</span>
                   <span className="text-gray-500">x{o.quantity}</span>
                   <span className="text-gray-500">{o.manufacturer}</span>
                   <span className={cn("px-1.5 py-0.5 rounded-full font-bold", statusColors[o.status] ?? 'bg-gray-100')}>{o.status}</span>
                   <select value={o.status} onChange={e => onUpdateOrder(o.id, { status: e.target.value as ProductionOrder['status'] })} className="border border-gray-200 rounded px-1 py-0.5 text-[10px]">
                     {['pending', 'confirmed', 'in-production', 'shipped', 'delivered'].map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                 </div>
               );
             })}
           </div>
         )}
       </div>

       <div className="flex-1 grid grid-cols-2 gap-6">
          {/* AI Concept Generation */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Bot className="w-6 h-6" /></div>
                <div>
                   <h2 className="text-xl font-bold">AI Concept Generator</h2>
                   <p className="text-sm text-gray-500">Generate base designs from text prompts.</p>
                </div>
             </div>
             
             <textarea 
               value={prompt}
               onChange={e => setPrompt(e.target.value)}
               placeholder="Describe your design... e.g. 'Cyberpunk oversized cargo pants with reflective taping and asymmetrical pockets'"
               className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none h-32 mb-4"
             />
              <button 
                onClick={async () => {
                  if (!prompt.trim()) return;
                  setIsGenerating(true);
                  setAiResult('');
                  try {
                    const provider = getAiProvider();
                    const response = await provider.chat({
                      messages: [
                        { role: 'system', content: 'You are an expert fashion design AI. Generate detailed clothing design concepts based on text descriptions. Include silhouette, materials, color palette, construction details, and market positioning. Be creative and specific.' },
                        { role: 'user', content: prompt },
                      ],
                      maxTokens: 1024,
                      temperature: 0.8,
                    });
                    setAiResult(response.text);
                  } catch (err: any) {
                    setAiResult(`Error: ${err?.message || 'AI provider unavailable. Check your API key configuration.'}`);
                  }
                  setIsGenerating(false);
                }}
               className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
             >
               {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Zap className="w-4 h-4" /> Generate Concepts</>}
             </button>
             
              {(isGenerating || aiResult) && (
                <div className="mt-6 flex-1 bg-gray-50 rounded-xl border border-dashed border-gray-300 p-4 overflow-y-auto">
                  {isGenerating ? (
                    <div className="flex items-center justify-center flex-col gap-2 animate-pulse h-full">
                      <div className="text-sm font-bold text-gray-400">Generating design concept...</div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{aiResult}</div>
                  )}
                </div>
              )}
          </div>
          
          {/* Tech Pack Export & Cloud */}
          <div className="flex flex-col gap-6">
             <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-xl p-6 text-white flex-1 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full pointer-events-none" />
                <div>
                   <div className="flex items-center gap-3 mb-2">
                      <Cpu className="w-6 h-6 text-blue-400" />
                      <h2 className="text-xl font-bold">Automated Tech Pack</h2>
                   </div>
                   <p className="text-sm text-gray-400 mb-6">Generates standardized factory instructions, measurements, and stitching details.</p>
                   
                   <div className="space-y-3 font-mono text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                         <span className="text-gray-400">BOM Extraction</span>
                         <span className="text-emerald-400">Complete</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                         <span className="text-gray-400">Grading Rules</span>
                         <span className="text-emerald-400">Compiled</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                         <span className="text-gray-400">Stitch Callouts</span>
                         <span className="text-emerald-400">Mapped</span>
                      </div>
                   </div>
                </div>
                
                <button className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 mt-6">
                  <Download className="w-4 h-4" /> Export PDF for Factory
                </button>
             </div>
             
             <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-6 flex items-center justify-between">
                <div>
                   <h3 className="font-bold text-emerald-900">Cloud Collaboration Active</h3>
                   <p className="text-xs text-emerald-700 mt-1">Manufacturer (Guangzhou Textiles) is viewing your tech pack in real-time.</p>
                </div>
                <div className="flex -space-x-2">
                   <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-emerald-50 flex items-center justify-center text-white text-xs font-bold">ME</div>
                   <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-emerald-50 flex items-center justify-center text-white text-xs font-bold">MF</div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}

// ---------------------------------------------------------
// 5. Shopify Integration (Kept from original)
// ---------------------------------------------------------
function ShopifyTab({ data, collections, onCreateCollection }: { data: any[]; collections: Collection[]; onCreateCollection: (name: string, season: Collection['season']) => string }) {
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [collName, setCollName] = useState('');
  const [collSeason, setCollSeason] = useState<Collection['season']>('spring');

  const handleCreateCollection = () => {
    if (!collName) return;
    onCreateCollection(collName, collSeason);
    setCollName('');
    setShowNewCollection(false);
  };

  const seasonColors: Record<string, string> = {
    spring: 'bg-green-100 text-green-800', summer: 'bg-yellow-100 text-yellow-800',
    fall: 'bg-orange-100 text-orange-800', winter: 'bg-blue-100 text-blue-800', resort: 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full">
       {/* Collections Panel */}
       <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
         <div className="flex items-center justify-between mb-3">
           <h3 className="font-bold">Collections</h3>
           <button onClick={() => setShowNewCollection(!showNewCollection)} className="px-3 py-1 bg-[#95BF47] text-white rounded-lg text-xs font-bold hover:bg-[#7a9d3a] transition-colors">{showNewCollection ? 'Cancel' : '+ New Collection'}</button>
         </div>
         {showNewCollection && (
           <div className="flex gap-2 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
             <input type="text" value={collName} onChange={e => setCollName(e.target.value)} placeholder="Collection name" className="border border-gray-300 rounded px-2 py-1 text-xs flex-1" />
             <select value={collSeason} onChange={e => setCollSeason(e.target.value as Collection['season'])} className="border border-gray-300 rounded px-2 py-1 text-xs">
               {['spring', 'summer', 'fall', 'winter', 'resort'].map(s => <option key={s} value={s}>{s}</option>)}
             </select>
             <button onClick={handleCreateCollection} className="px-3 py-1 bg-[#95BF47] text-white rounded text-xs font-bold hover:bg-[#7a9d3a]">Create</button>
           </div>
         )}
         {collections.length === 0 ? (
           <p className="text-xs text-gray-400 italic">No collections yet. Create one to get started.</p>
         ) : (
           <div className="flex gap-2 flex-wrap">
             {collections.map(c => (
               <div key={c.id} className="border border-gray-200 rounded-lg px-3 py-2 text-xs hover:shadow-sm transition-shadow">
                 <div className="font-bold">{c.name}</div>
                 <div className="flex items-center gap-2 mt-1">
                   <span className={cn("px-1.5 py-0.5 rounded-full font-bold", seasonColors[c.season])}>{c.season}</span>
                   <span className="text-gray-400">{c.designIds.length} designs</span>
                   <span className={cn("px-1.5 py-0.5 rounded-full font-bold", c.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600')}>{c.status}</span>
                 </div>
               </div>
             ))}
           </div>
         )}
       </div>

      <div className="flex items-center justify-between">
         <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-full bg-[#95BF47] flex items-center justify-center">
             <ShoppingBag className="w-4 h-4 text-white" />
           </div>
           <h2 className="text-2xl font-bold tracking-tight">Store Overview</h2>
         </div>
         <button className="px-4 py-2 bg-[#95BF47] text-white rounded-lg text-sm font-bold hover:bg-[#7a9d3a] transition-colors shadow-sm">Sync Products</button>
      </div>
      <div className="grid grid-cols-3 gap-4">
         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Total Sales (7d)</div>
            <div className="text-3xl font-bold">$39,540.00</div>
            <div className="text-sm font-medium text-green-600 mt-2 flex items-center gap-1"><TrendingUp className="w-4 h-4" /> +12.5%</div>
         </div>
         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Online Sessions</div>
            <div className="text-3xl font-bold">12,401</div>
            <div className="text-sm font-medium text-green-600 mt-2 flex items-center gap-1"><TrendingUp className="w-4 h-4" /> +5.2%</div>
         </div>
         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Conversion Rate</div>
            <div className="text-3xl font-bold">3.2%</div>
            <div className="text-sm font-medium text-red-500 mt-2">-0.4%</div>
         </div>
      </div>
      <div className="flex-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[300px] flex flex-col">
         <h3 className="font-bold text-lg mb-6">Revenue Over Time</h3>
         <div className="flex-1 min-h-0">
           <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={data}>
               <defs>
                 <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor="#000000" stopOpacity={0.1}/>
                   <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                 </linearGradient>
               </defs>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
               <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--os-text-muted)' }} dy={10} />
               <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--os-text-muted)' }} tickFormatter={(val) => `$${val}`} />
               <Tooltip 
                 contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                 formatter={(val: any) => [`$${val}`, 'Sales']}
               />
               <Area type="monotone" dataKey="sales" stroke="#000000" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
             </AreaChart>
           </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
}
