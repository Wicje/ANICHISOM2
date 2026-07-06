'use client';
import React, { useState, useEffect, useRef } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { Shirt, Scissors, Cuboid, Cpu, PenTool, Layers, Type, Download, Maximize, Target, Zap, Bot, Search, ShoppingBag, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Storage } from '@/lib/storage';
import '@google/model-viewer';

export function ClothingBrandPack({ window: osWindow }: { window: OSWindow }) {
  const { workspaceMode } = useOS();
  const [activeTab, setActiveTab] = useState<'sketching' | 'drafting' | '3d-prototype' | 'production' | 'shopify'>('sketching');
  
  const [shopifyData, setShopifyData] = useState<any[]>([
    { name: 'Mon', sales: 1200 }, { name: 'Tue', sales: 1900 }, { name: 'Wed', sales: 2400 },
    { name: 'Thu', sales: 1800 }, { name: 'Fri', sales: 3200 }, { name: 'Sat', sales: 4100 }, { name: 'Sun', sales: 3800 }
  ]);

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
        {activeTab === 'sketching' && <SketchingTab windowId={osWindow.id} />}
        {activeTab === 'drafting' && <DraftingTab />}
        {activeTab === '3d-prototype' && <Prototype3DTab />}
        {activeTab === 'production' && <ProductionTab />}
        {activeTab === 'shopify' && <ShopifyTab data={shopifyData} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 1. Digital Sketching & Illustration (Fabric.js)
// ---------------------------------------------------------
function SketchingTab({ windowId }: { windowId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<any>(null);
  const [tool, setTool] = useState<'draw' | 'select' | 'text'>('draw');

  useEffect(() => {
    let canvas: any = null;
    import('fabric').then((fabricModule) => {
      const fabric = fabricModule.fabric || fabricModule;
      if (!canvasRef.current || !containerRef.current) return;
      
      canvas = new fabric.Canvas(canvasRef.current, {
        width: containerRef.current.clientWidth - 40,
        height: containerRef.current.clientHeight - 40,
        isDrawingMode: true,
        backgroundColor: '#ffffff'
      });
      
      canvas.freeDrawingBrush.color = '#000000';
      canvas.freeDrawingBrush.width = 3;
      
      setFabricCanvas(canvas);
      
      // Load a template mannequin outline
      fabric.Image.fromURL('https://cdn-icons-png.flaticon.com/512/77/77305.png', (img: any) => {
         img.set({ left: canvas.width / 2 - 100, top: 50, scaleX: 0.5, scaleY: 0.5, opacity: 0.1, selectable: false });
         canvas.add(img);
         canvas.sendToBack(img);
      });
    });

    return () => {
      if (canvas) canvas.dispose();
    };
  }, []);

  useEffect(() => {
     if (!fabricCanvas) return;
     if (tool === 'draw') {
        fabricCanvas.isDrawingMode = true;
     } else {
        fabricCanvas.isDrawingMode = false;
     }
  }, [tool, fabricCanvas]);

  return (
    <div className="flex h-full p-4 gap-4">
      <div className="w-16 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col items-center py-4 gap-4 shrink-0">
         <button onClick={() => setTool('select')} className={cn("p-2 rounded-lg transition-colors", tool === 'select' ? "bg-black text-white" : "hover:bg-gray-100")}><Target className="w-5 h-5" /></button>
         <button onClick={() => setTool('draw')} className={cn("p-2 rounded-lg transition-colors", tool === 'draw' ? "bg-black text-white" : "hover:bg-gray-100")}><PenTool className="w-5 h-5" /></button>
         <button onClick={() => setTool('text')} className={cn("p-2 rounded-lg transition-colors", tool === 'text' ? "bg-black text-white" : "hover:bg-gray-100")}><Type className="w-5 h-5" /></button>
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
                if(fabricCanvas) fabricCanvas.freeDrawingBrush.width = parseInt(e.target.value);
             }} className="w-full" />
             <label className="text-xs font-bold text-gray-500 uppercase mt-2">Color</label>
             <div className="flex gap-2">
                {['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B'].map(c => (
                  <button key={c} className="w-6 h-6 rounded-full border border-gray-300" style={{backgroundColor: c}} onClick={() => {
                     if(fabricCanvas) fabricCanvas.freeDrawingBrush.color = c;
                  }} />
                ))}
             </div>
           </div>
         )}
         <div className="mt-auto">
            <button className="w-full py-2 bg-black text-white rounded-lg text-sm font-bold shadow-sm">Save Sketch</button>
         </div>
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
  
  return (
    <div className="flex flex-col h-full p-4 gap-4">
       <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">3D Virtual Fitting</h2>
          <div className="flex bg-gray-100 p-1 rounded-lg">
             {(['fit', 'strain', 'physics'] as const).map(m => (
               <button 
                 key={m} 
                 onClick={() => setMode(m)} 
                 className={cn("px-4 py-1.5 rounded-md text-sm font-bold capitalize transition-all", mode === m ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-black")}
               >
                 {m}
               </button>
             ))}
          </div>
       </div>
       
       <div className="flex-1 bg-[#1a1a1a] rounded-xl overflow-hidden relative shadow-2xl border border-gray-800">
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-black/60 p-4 rounded-lg border border-white/10 backdrop-blur-md text-white">
             <h3 className="text-emerald-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2"><Cuboid className="w-3 h-3" /> Simulation Engine</h3>
             <div className="text-xs text-white/70">Avatar: Female Standard US 6</div>
             <div className="text-xs text-white/70">Fabric: Heavyweight French Terry (400GSM)</div>
             <div className="text-xs text-white/70">Drape Accuracy: 98%</div>
             
             {mode === 'strain' && (
                <div className="mt-4 flex flex-col gap-1">
                   <div className="text-[10px] font-bold text-white/50 uppercase">Strain Map Legend</div>
                   <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 bg-red-500 rounded-full" /> High Tension</div>
                   <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 bg-yellow-400 rounded-full" /> Moderate</div>
                   <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 bg-blue-500 rounded-full" /> Relaxed</div>
                </div>
             )}
          </div>
          
          {/* @ts-ignore */}
          <model-viewer
            src="https://modelviewer.dev/shared-assets/models/glTF-Sample-Models/2.0/Corset/glTF/Corset.gltf"
            alt="3D Garment Prototype"
            auto-rotate
            camera-controls
            shadow-intensity="1"
            exposure={mode === 'strain' ? "0.5" : "1"}
            environment-image="neutral"
            style={{ width: '100%', height: '100%', backgroundColor: mode === 'strain' ? '#050505' : '#1a1a1a' }}
          >
             {mode === 'strain' && (
               <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent animate-pulse" />
             )}
          {/* @ts-ignore */}
          </model-viewer>
       </div>
    </div>
  );
}

// ---------------------------------------------------------
// 4. AI & Production Tools
// ---------------------------------------------------------
function ProductionTab() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  return (
    <div className="flex flex-col h-full p-4 gap-6">
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
               onClick={() => { setIsGenerating(true); setTimeout(() => setIsGenerating(false), 2000); }}
               className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
             >
               {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Zap className="w-4 h-4" /> Generate Concepts</>}
             </button>
             
             {isGenerating && (
               <div className="mt-6 flex-1 bg-gray-50 rounded-xl border border-dashed border-gray-300 flex items-center justify-center flex-col gap-2 animate-pulse">
                  <div className="text-sm font-bold text-gray-400">Diffusion Model Processing...</div>
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
function ShopifyTab({ data }: { data: any[] }) {
  return (
    <div className="flex flex-col gap-6 p-6 h-full">
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
               <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
               <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} tickFormatter={(val) => `$${val}`} />
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
