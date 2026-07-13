'use client';
import React, { useState, useEffect } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { Cpu, Layers, Box, List, Terminal, Zap, CheckCircle, AlertTriangle, Download, Search, Bot, Send, Microchip, CircuitBoard, Wrench, Plus, X, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import '@google/model-viewer';
import { Storage } from '@/lib/storage';
import { useHardwareStore, HwComponent, Schematic, FirmwareVersion, Supplier } from '@/lib/stores/hardware.store';

export function HardwarePack({ window: osWindow }: { window: OSWindow }) {
  const { workspaceMode } = useOS();
  const [activeTab, setActiveTab] = useState<'schematic' | 'pcb-layout' | '3d-viewer' | 'bom' | 'firmware'>('schematic');

  const { components, schematics, firmwareVersions, suppliers, createComponent, updateComponent, deleteComponent, createSchematic, updateSchematic, getComponentsByType, createFirmware, updateFirmware, getDeployedFirmware, addSupplier, linkSupplier, unlinkSupplier } = useHardwareStore();
  
  const [bomData, setBomData] = useState<any[]>([
    { id: '1', part: 'ESP32-S3-WROOM', desc: 'WiFi/BT MCU Module', qty: 1, cost: 3.40, footprint: 'MOD-ESP32-S3' },
    { id: '2', part: 'BME280', desc: 'Temp/Humidity/Pressure Sensor', qty: 1, cost: 2.15, footprint: 'LGA-8' },
    { id: '3', part: 'TP4056', desc: 'Li-Ion Battery Charger', qty: 1, cost: 0.45, footprint: 'SOP-8' },
    { id: '4', part: '0603 10kΩ', desc: 'Resistor Thick Film', qty: 4, cost: 0.01, footprint: '0603' },
  ]);

  useEffect(() => {
     const roomId = `hardware-${osWindow.id}`;
     const unsub = Storage.subscribe('docs', roomId, workspaceMode, (state: any) => {
       if (state && state.bom) setBomData(state.bom);
     });
     return () => unsub();
  }, [workspaceMode, osWindow.id]);
  
  return (
    <div className="w-full h-full flex flex-col bg-[var(--os-bg)] text-white font-mono overflow-hidden">
      <div className="h-14 border-b border-white/10 flex items-center px-4 shrink-0 bg-[#0a0a0a]">
        <Cpu className="w-5 h-5 text-emerald-400 mr-3" />
        <h1 className="font-bold tracking-wider hidden sm:block">Hardware EDA Studio</h1>
        <div className="ml-8 flex gap-2 overflow-x-auto no-scrollbar">
          {(['schematic', 'pcb-layout', '3d-viewer', 'bom', 'firmware'] as const).map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md uppercase tracking-wider transition-colors flex items-center gap-2", 
                activeTab === tab ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "text-white/50 hover:bg-white/5 hover:text-white/80 border border-transparent"
              )}
            >
              {tab === 'schematic' && <Zap className="w-3.5 h-3.5" />}
              {tab === 'pcb-layout' && <Layers className="w-3.5 h-3.5" />}
              {tab === '3d-viewer' && <Box className="w-3.5 h-3.5" />}
              {tab === 'bom' && <List className="w-3.5 h-3.5" />}
              {tab === 'firmware' && <Terminal className="w-3.5 h-3.5" />}
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'schematic' && <SchematicTab components={components} />}
        {activeTab === 'pcb-layout' && <PcbLayoutTab />}
        {activeTab === '3d-viewer' && <Prototype3DTab />}
        {activeTab === 'bom' && <BomTab bomData={bomData} components={components} suppliers={suppliers} linkSupplier={linkSupplier} unlinkSupplier={unlinkSupplier} />}
        {activeTab === 'firmware' && <FirmwareTab firmwareVersions={firmwareVersions} createFirmware={createFirmware} updateFirmware={updateFirmware} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 1. Schematic Capture & AI Co-pilot
// ---------------------------------------------------------
function SchematicTab({ components }: { components: Record<string, HwComponent> }) {
  const [prompt, setPrompt] = useState('');
  const [chat, setChat] = useState<{role: string, text: string}[]>([
    { role: 'ai', text: 'I am your Hardware Co-pilot. I can help select parts, draft sub-circuits, and verify your schematic against datasheets. What are we building today?' }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [componentFilter, setComponentFilter] = useState<HwComponent['type'] | 'all'>('all');

  const componentList = Object.values(components);
  const filteredComponents = componentFilter === 'all' ? componentList : componentList.filter(c => c.type === componentFilter);

  const handleSend = () => {
    if(!prompt.trim()) return;
    setChat(prev => [...prev, {role: 'user', text: prompt}]);
    setPrompt('');
    setIsGenerating(true);
    setTimeout(() => {
      setChat(prev => [...prev, {role: 'ai', text: 'I have added an ESP32-S3 module and wired the I2C bus to the BME280 sensor. I also placed pull-up resistors on SDA and SCL as per the datasheet requirements.'}]);
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="flex h-full p-4 gap-4">
      {/* Component Picker Sidebar */}
      <div className="w-56 bg-[#111] rounded-xl border border-white/10 shadow-sm flex flex-col overflow-hidden shrink-0">
        <div className="p-3 border-b border-white/10 bg-black/40">
          <h3 className="font-bold text-xs text-emerald-400 uppercase tracking-widest mb-2">Component Picker</h3>
          <select
            value={componentFilter}
            onChange={e => setComponentFilter(e.target.value as any)}
            className="w-full bg-[#222] border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="all">All Types</option>
            <option value="mcu">MCU</option>
            <option value="sensor">Sensor</option>
            <option value="passive">Passive</option>
            <option value="ic">IC</option>
            <option value="connector">Connector</option>
            <option value="power">Power</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {filteredComponents.length === 0 && (
            <div className="text-[10px] text-white/30 text-center py-4">No components in library.</div>
          )}
          {filteredComponents.map((c) => (
            <div
              key={c.id}
              className="p-2 bg-white/5 rounded-lg border border-transparent hover:border-emerald-500/30 hover:bg-emerald-500/5 cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Microchip className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-xs font-bold text-white/90 truncate">{c.name}</span>
              </div>
              <div className="text-[10px] text-white/40 font-mono">{c.value} &middot; {c.footprint}</div>
              <div className="text-[10px] text-white/30 mt-0.5">{c.manufacturer}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-[#fcfcfc] rounded-xl border border-white/10 relative overflow-hidden flex items-center justify-center shadow-inner">
         <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#005f73 1px, transparent 1px), linear-gradient(90deg, #005f73 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
         
         {/* Mock Schematic SVG */}
         <div className="relative z-10 w-full max-w-2xl h-96">
            <svg viewBox="0 0 800 400" className="w-full h-full drop-shadow-md">
               {/* ESP32 */}
               <rect x="200" y="100" width="160" height="200" fill="#fff" stroke="#005f73" strokeWidth="2" />
               <text x="280" y="130" textAnchor="middle" fill="#005f73" fontSize="14" fontWeight="bold" fontFamily="monospace">U1</text>
               <text x="280" y="150" textAnchor="middle" fill="#005f73" fontSize="12" fontFamily="monospace">ESP32-S3</text>
               
               {/* ESP Pins */}
               <line x1="360" y1="200" x2="400" y2="200" stroke="#005f73" strokeWidth="2" />
               <text x="350" y="195" textAnchor="end" fill="#005f73" fontSize="10" fontFamily="monospace">IO8 (SDA)</text>
               <line x1="360" y1="230" x2="400" y2="230" stroke="#005f73" strokeWidth="2" />
               <text x="350" y="225" textAnchor="end" fill="#005f73" fontSize="10" fontFamily="monospace">IO9 (SCL)</text>

               {/* BME280 */}
               <rect x="500" y="180" width="100" height="80" fill="#fff" stroke="#005f73" strokeWidth="2" />
               <text x="550" y="205" textAnchor="middle" fill="#005f73" fontSize="14" fontWeight="bold" fontFamily="monospace">U2</text>
               <text x="550" y="225" textAnchor="middle" fill="#005f73" fontSize="12" fontFamily="monospace">BME280</text>

               {/* Sensor Pins */}
               <line x1="460" y1="200" x2="500" y2="200" stroke="#005f73" strokeWidth="2" />
               <text x="510" y="195" textAnchor="start" fill="#005f73" fontSize="10" fontFamily="monospace">SDA</text>
               <line x1="460" y1="230" x2="500" y2="230" stroke="#005f73" strokeWidth="2" />
               <text x="510" y="225" textAnchor="start" fill="#005f73" fontSize="10" fontFamily="monospace">SCL</text>

               {/* Connections */}
               <path d="M 400 200 L 460 200" fill="none" stroke="#e63946" strokeWidth="2" />
               <path d="M 400 230 L 460 230" fill="none" stroke="#457b9d" strokeWidth="2" />

               {/* Pullups */}
               <rect x="425" y="140" width="10" height="30" fill="#fff" stroke="#005f73" strokeWidth="2" />
               <text x="445" y="160" fill="#005f73" fontSize="10" fontFamily="monospace">10k</text>
               <line x1="430" y1="170" x2="430" y2="200" stroke="#e63946" strokeWidth="2" />
               <line x1="430" y1="140" x2="430" y2="120" stroke="#e63946" strokeWidth="2" />
               <circle cx="430" cy="200" r="3" fill="#e63946" />
               <line x1="420" y1="120" x2="440" y2="120" stroke="#e63946" strokeWidth="2" />
               <text x="430" y="115" textAnchor="middle" fill="#e63946" fontSize="10" fontFamily="monospace">3V3</text>
            </svg>
         </div>
         <div className="absolute top-4 left-4 flex gap-2">
            <button className="px-3 py-1.5 bg-white border border-gray-200 shadow-sm rounded text-xs font-bold text-gray-800 flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-blue-500" /> Auto-Wire</button>
            <button className="px-3 py-1.5 bg-white border border-gray-200 shadow-sm rounded text-xs font-bold text-gray-800 flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> ERC Check</button>
         </div>
      </div>

      {/* AI Co-pilot Sidebar */}
      <div className="w-80 bg-[#111] rounded-xl border border-white/10 shadow-sm flex flex-col overflow-hidden shrink-0">
         <div className="p-4 border-b border-white/10 bg-black/40 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
               <Bot className="w-4 h-4 text-blue-400" />
            </div>
            <div>
               <h3 className="font-bold text-sm text-blue-400 uppercase tracking-widest">EDA Co-pilot</h3>
               <p className="text-[10px] text-white/40">Powered by Gemini Hardware</p>
            </div>
         </div>
         <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 text-xs font-sans">
            {chat.map((msg, i) => (
               <div key={i} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn("p-3 rounded-lg max-w-[90%]", msg.role === 'user' ? "bg-blue-600 text-white" : "bg-white/10 text-white/90 border border-white/5")}>
                     {msg.text}
                  </div>
               </div>
            ))}
            {isGenerating && (
               <div className="flex w-full justify-start">
                  <div className="p-3 rounded-lg bg-white/10 border border-white/5 flex gap-1">
                     <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                     <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-75" />
                     <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-150" />
                  </div>
               </div>
            )}
         </div>
         <div className="p-3 border-t border-white/10 bg-black/20">
            <div className="relative">
               <input 
                 value={prompt}
                 onChange={e => setPrompt(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && handleSend()}
                 placeholder="Instruct Co-pilot..."
                 className="w-full bg-[#222] border border-white/10 rounded-lg px-3 py-2 pr-10 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
               />
               <button onClick={handleSend} className="absolute right-2 top-1.5 p-1 text-blue-400 hover:text-blue-300">
                  <Send className="w-3.5 h-3.5" />
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 2. PCB Layout & DRC
// ---------------------------------------------------------
function PcbLayoutTab() {
  const [drcRunning, setDrcRunning] = useState(false);
  const [drcErrors, setDrcErrors] = useState<any[]>([]);

  const runDRC = () => {
    setDrcRunning(true);
    setDrcErrors([]);
    setTimeout(() => {
      setDrcErrors([
         { type: 'Clearance Violation', desc: 'Trace T1 is too close to Pad P3 (0.1mm < 0.15mm)', loc: 'X: 45.2, Y: 12.1' },
         { type: 'Unrouted Net', desc: 'Net VCC is missing connection to U2_Pin1', loc: 'Global' }
      ]);
      setDrcRunning(false);
    }, 1500);
  };

  return (
    <div className="flex h-full p-4 gap-4">
      {/* PCB Canvas */}
      <div className="flex-1 bg-[var(--os-surface)] rounded-xl border border-white/10 relative overflow-hidden flex items-center justify-center shadow-inner">
         <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
         
         {/* Mock PCB SVG */}
         <div className="relative z-10">
            <svg viewBox="0 0 400 300" className="w-[600px] h-auto shadow-[0_0_50px_rgba(0,0,0,0.5)]">
               {/* Board Outline */}
               <rect x="50" y="50" width="300" height="200" rx="10" fill="#135028" stroke="#d4af37" strokeWidth="2" />
               {/* Copper Pour / Traces */}
               <path d="M 120 100 L 250 100 L 280 130 L 280 180" fill="none" stroke="#a03232" strokeWidth="4" opacity="0.8" />
               <path d="M 120 120 L 200 120 L 220 140 L 220 180" fill="none" stroke="#325aa0" strokeWidth="4" opacity="0.8" />
               
               {/* Pads / Vias */}
               {/* IC 1 */}
               <rect x="100" y="90" width="10" height="40" fill="#d4af37" />
               <rect x="130" y="90" width="10" height="40" fill="#d4af37" />
               <rect x="105" y="95" width="30" height="30" fill="#222" />
               
               {/* IC 2 */}
               <rect x="270" y="170" width="40" height="10" fill="#d4af37" />
               <rect x="270" y="200" width="40" height="10" fill="#d4af37" />
               <rect x="275" y="175" width="30" height="30" fill="#222" />

               {/* Vias */}
               <circle cx="250" cy="100" r="4" fill="#d4af37" />
               <circle cx="250" cy="100" r="2" fill="#111" />

               {/* DRC Error Highlight Mock */}
               {drcErrors.length > 0 && (
                 <circle cx="135" cy="100" r="15" fill="none" stroke="#ef4444" strokeWidth="2" className="animate-ping" />
               )}
            </svg>
         </div>
      </div>

      {/* DRC & Layers Sidebar */}
      <div className="w-80 flex flex-col gap-4 shrink-0">
         <div className="bg-[#111] border border-white/10 rounded-xl p-4 flex flex-col gap-4">
            <h3 className="font-bold text-emerald-400 uppercase tracking-widest text-xs">Design Rule Check</h3>
            <button 
              onClick={runDRC}
              className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              {drcRunning ? <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" /> : <><AlertTriangle className="w-4 h-4" /> Run DRC</>}
            </button>
            
            {drcErrors.length > 0 && (
               <div className="flex flex-col gap-2 mt-2">
                  {drcErrors.map((err, i) => (
                    <div key={i} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-sans text-red-400">
                       <div className="font-bold mb-1">{err.type}</div>
                       <div className="text-white/60 mb-1">{err.desc}</div>
                       <div className="text-[10px] font-mono text-white/40">LOC: {err.loc}</div>
                    </div>
                  ))}
               </div>
            )}
            {drcErrors.length === 0 && !drcRunning && (
               <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-xs text-white/50 text-center font-sans">
                  Click 'Run DRC' to verify layout constraints.
               </div>
            )}
         </div>

         <div className="bg-[#111] border border-white/10 rounded-xl p-4 flex-1">
            <h3 className="font-bold text-white/80 uppercase tracking-widest text-xs mb-4">Board Layers</h3>
            <div className="flex flex-col gap-2 text-xs font-sans text-white/70">
               <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded border border-transparent hover:border-white/10 cursor-pointer">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#a03232] rounded-sm" /> Top Copper (F.Cu)</div>
                  <input type="checkbox" defaultChecked className="accent-[#a03232]" />
               </div>
               <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded border border-transparent hover:border-white/10 cursor-pointer">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#325aa0] rounded-sm" /> Bottom Copper (B.Cu)</div>
                  <input type="checkbox" defaultChecked className="accent-[#325aa0]" />
               </div>
               <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded border border-transparent hover:border-white/10 cursor-pointer">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#d4af37] rounded-sm" /> Silk Screen (F.SilkS)</div>
                  <input type="checkbox" defaultChecked className="accent-[#d4af37]" />
               </div>
               <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded border border-transparent hover:border-white/10 cursor-pointer">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#135028] rounded-sm" /> Edge Cuts</div>
                  <input type="checkbox" defaultChecked className="accent-[#135028]" />
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 3. Virtual Simulation & 3D Preview (model-viewer)
// ---------------------------------------------------------
function Prototype3DTab() {
  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex-1 bg-[#0a0a0a] rounded-xl border border-white/10 overflow-hidden relative shadow-2xl">
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-black/60 p-4 rounded-lg border border-white/10 backdrop-blur text-white">
           <h3 className="text-emerald-400 font-bold uppercase tracking-widest text-xs">Virtual Prototype</h3>
           <div className="text-xs text-white/70">Board Thickness: 1.6mm</div>
           <div className="text-xs text-white/70">Solder Mask: Matte Black</div>
           <div className="text-xs text-white/70">Components: 42 Placed</div>
        </div>
        {/* @ts-ignore */}
        <model-viewer
          src="https://modelviewer.dev/shared-assets/models/Astronaut.glb"
          ios-src="https://modelviewer.dev/shared-assets/models/Astronaut.usdz"
          alt="3D Prototype Preview"
          shadow-intensity="1"
          camera-controls
          auto-rotate
          environment-image="neutral"
          style={{ width: '100%', height: '100%', backgroundColor: 'var(--os-bg)' }}
        >
        {/* @ts-ignore */}
        </model-viewer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 4. Component Libraries, Sourcing & BOM
// ---------------------------------------------------------
function BomTab({ bomData, components, suppliers, linkSupplier, unlinkSupplier }: { bomData: any[]; components: Record<string, HwComponent>; suppliers: Record<string, Supplier>; linkSupplier: (id: string) => void; unlinkSupplier: (id: string) => void }) {
  const storeComponentList = Object.values(components);

  return (
    <div className="flex flex-col gap-6 p-6 h-full font-sans">
       <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-emerald-400">Bill of Materials & Sourcing</h2>
            <p className="text-sm text-white/50">Manage components, check live distributor stock, and export files.</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors shadow-sm flex items-center gap-2">
               <Download className="w-4 h-4" /> Export Gerber / Drill
            </button>
          </div>
       </div>

       <div className="flex-1 grid grid-cols-[1fr_300px] gap-6 min-h-0">
          <div className="flex flex-col gap-4 min-h-0">
            {/* Legacy BOM table */}
            <div className="bg-[#111] rounded-xl border border-white/10 overflow-auto shadow-sm">
               <table className="w-full text-left text-sm border-collapse">
                 <thead>
                   <tr className="border-b border-white/10 text-white/50 bg-white/5 sticky top-0">
                     <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Part #</th>
                     <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Description</th>
                     <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Footprint</th>
                     <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Qty</th>
                     <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Est. Cost</th>
                   </tr>
                 </thead>
                 <tbody>
                   {bomData.map((item, i) => (
                     <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                       <td className="p-4 text-emerald-400 font-bold font-mono">{item.part}</td>
                       <td className="p-4 text-white/80">{item.desc}</td>
                       <td className="p-4 text-white/60 font-mono text-xs">{item.footprint}</td>
                       <td className="p-4 text-white/80 font-bold">{item.qty}</td>
                       <td className="p-4 text-white">${(item.cost * item.qty).toFixed(2)}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>

            {/* Store component library */}
            {storeComponentList.length > 0 && (
              <div className="bg-[#111] rounded-xl border border-white/10 overflow-auto shadow-sm flex-1 min-h-0">
                <div className="p-4 border-b border-white/10 bg-white/5 sticky top-0">
                  <h3 className="font-bold uppercase tracking-wider text-[10px] text-emerald-400">Component Library (Store)</h3>
                </div>
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50">
                      <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Name</th>
                      <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Type</th>
                      <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Value</th>
                      <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Footprint</th>
                      <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Mfr.</th>
                      <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Unit $</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storeComponentList.map((c) => (
                      <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-3 text-emerald-400 font-bold font-mono">{c.name}</td>
                        <td className="p-3 text-white/60 font-mono text-xs">{c.type}</td>
                        <td className="p-3 text-white/80">{c.value}</td>
                        <td className="p-3 text-white/60 font-mono text-xs">{c.footprint}</td>
                        <td className="p-3 text-white/60">{c.manufacturer}</td>
                        <td className="p-3 text-white">${c.unitCost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
             <div className="bg-[#111] border border-white/10 rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-white mb-4 uppercase tracking-wider text-xs">Live API Sourcing</h3>
                <div className="relative mb-4">
                   <Search className="w-4 h-4 absolute left-3 top-2.5 text-white/40" />
                   <input type="text" placeholder="Search Octopart..." className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
                <div className="flex flex-col gap-3">
                   {Object.values(suppliers).length > 0 ? Object.values(suppliers).map((s) => (
                     <div key={s.id} className="flex items-center justify-between p-3 bg-white/5 rounded border border-transparent hover:border-white/10 cursor-pointer">
                        <div className="font-bold text-sm text-white/90">{s.name}</div>
                        <button
                          onClick={() => s.linked ? unlinkSupplier(s.id) : linkSupplier(s.id)}
                          className={cn("text-xs flex items-center gap-1", s.linked ? "text-emerald-400" : "text-white/40 hover:text-emerald-400")}
                        >
                          {s.linked ? <><CheckCircle className="w-3 h-3" /> Linked</> : <><LinkIcon className="w-3 h-3" /> Link</>}
                        </button>
                     </div>
                   )) : (
                     ['DigiKey', 'Mouser', 'LCSC'].map(supplier => (
                       <div key={supplier} className="flex items-center justify-between p-3 bg-white/5 rounded border border-transparent hover:border-white/10 cursor-pointer">
                          <div className="font-bold text-sm text-white/90">{supplier}</div>
                          <div className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Linked</div>
                       </div>
                     ))
                   )}
                </div>
             </div>

             <div className="bg-[#111] border border-white/10 rounded-xl p-5 shadow-sm mt-auto">
                <div className="text-sm text-white/50 mb-1 uppercase tracking-wider font-bold text-[10px]">Total PCBA Cost Estimate</div>
                <div className="text-3xl font-bold text-emerald-400">${bomData.reduce((acc, val) => acc + (val.cost * val.qty), 0).toFixed(2)}</div>
                <div className="text-xs text-white/40 mt-2">Based on 100 unit batch from JLCPCB.</div>
             </div>
          </div>
       </div>
    </div>
  );
}

// ---------------------------------------------------------
// 5. Firmware Deployment (WebSerial / WebUSB) - Kept intact
// ---------------------------------------------------------
function FirmwareTab({ firmwareVersions, createFirmware, updateFirmware }: { firmwareVersions: Record<string, FirmwareVersion>; createFirmware: (name: string, version: string, changelog?: string) => string; updateFirmware: (id: string, updates: Partial<Omit<FirmwareVersion, 'id'>>) => void }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [port, setPort] = useState<any>(null);
  const [newFwName, setNewFwName] = useState('');
  const [newFwVersion, setNewFwVersion] = useState('');

  const firmwareList = Object.values(firmwareVersions).sort((a, b) => b.deployedAt ?? 0 - (a.deployedAt ?? 0));

  const connectSerial = async () => {
    try {
      const p = await (navigator as any).serial.requestPort();
      await p.open({ baudRate: 115200 });
      setPort(p);
      setIsConnected(true);
      setLogs(prev => [...prev, '> WebSerial Port Opened at 115200 baud. Waiting for data...']);
      
      const decoder = new TextDecoderStream();
      const inputDone = p.readable.pipeTo(decoder.writable);
      const inputStream = decoder.readable;
      const reader = inputStream.getReader();

      while (true) {
        const { value, done } = await reader.read();
        if (value) {
          setLogs(prev => [...prev, value]);
        }
        if (done) {
          reader.releaseLock();
          break;
        }
      }
    } catch (e: any) {
      setLogs(prev => [...prev, `> Serial Connection failed: ${e.message || e}`]);
    }
  };

  const disconnectSerial = async () => {
    if (port) {
      try {
        await port.close();
        setPort(null);
        setIsConnected(false);
        setLogs(prev => [...prev, '> WebSerial Port Closed.']);
      } catch (e: any) {
        setLogs(prev => [...prev, `> Failed to close port: ${e.message}`]);
      }
    }
  };

  return (
    <div className="flex gap-4 h-full p-6 font-sans">
      <div className="flex flex-col gap-4 flex-1 min-w-0">
        <div className="flex items-center justify-between">
           <div>
              <h2 className="text-2xl font-bold text-emerald-400 tracking-tight">Firmware Deployment</h2>
              <p className="text-sm text-white/50">Flash compiled binaries and monitor serial output directly via browser APIs.</p>
           </div>
           <div className="flex gap-2">
             {!isConnected ? (
               <button 
                 onClick={connectSerial}
                 className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-bold hover:bg-emerald-500/30 transition-colors"
               >
                 Connect WebSerial
               </button>
             ) : (
               <button 
                 onClick={disconnectSerial}
                 className="px-4 py-2 bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-lg text-sm font-bold hover:bg-rose-500/30 transition-colors"
               >
                 Disconnect
               </button>
             )}
             <button 
               onClick={async () => {
                 try {
                    const device = await (navigator as any).usb.requestDevice({ filters: [] });
                    setLogs(prev => [...prev, `> Connected to WebUSB Device: ${device.productName}`]);
                 } catch (e) {
                    setLogs(prev => [...prev, `> USB Connection failed: ${e}`]);
                 }
               }}
               className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-bold hover:bg-blue-500/30 transition-colors"
             >
               Connect WebUSB
             </button>
           </div>
        </div>
        <div className="flex-1 bg-[#0a0a0a] rounded-xl border border-white/10 p-5 font-mono text-sm text-white/70 overflow-auto shadow-inner flex flex-col gap-1 whitespace-pre-wrap min-h-0">
           {!isConnected && logs.length === 0 && (
             <>
               <div className="text-emerald-500 mb-6 font-bold">{`> Awaiting hardware connection...`} <br/>{`> Use the buttons above to grant WebUSB or WebSerial access to physical boards.`}</div>
               {firmwareList.length > 0 ? firmwareList.map((fw) => (
                 <div key={fw.id} className="mb-3">
                   <span className="text-blue-400 font-bold">[{fw.version}]</span> - {fw.changelog || fw.name}
                   <span className={cn("ml-2 text-[10px] px-1.5 py-0.5 rounded",
                     fw.status === 'deployed' ? "bg-emerald-500/20 text-emerald-400" :
                     fw.status === 'staged' ? "bg-yellow-500/20 text-yellow-400" :
                     fw.status === 'archived' ? "bg-white/10 text-white/40" :
                     "bg-white/5 text-white/30"
                   )}>{fw.status}</span>
                 </div>
               )) : (
                 <>
                   <div className="mb-3"><span className="text-blue-400 font-bold">[v1.2.4]</span> - OTA deployed to 1,204 devices successfully.</div>
                   <div className="mb-3"><span className="text-blue-400 font-bold">[v1.2.3]</span> - Fixed I2C clock stretching issue on BME280.</div>
                 </>
               )}
               <div className="mb-3 text-white/40">Ready to write to flash at 0x10000...</div>
             </>
           )}
           {logs.map((log, i) => (
             <div key={i}>{log}</div>
           ))}
        </div>
      </div>

      {/* Firmware Version History Sidebar */}
      <div className="w-72 bg-[#111] border border-white/10 rounded-xl flex flex-col shrink-0 overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between">
          <h3 className="font-bold text-sm text-emerald-400 uppercase tracking-widest">Version History</h3>
          <button
            onClick={() => {
              if (newFwName.trim() && newFwVersion.trim()) {
                createFirmware(newFwName.trim(), newFwVersion.trim());
                setNewFwName('');
                setNewFwVersion('');
              }
            }}
            className="p-1 bg-emerald-500/20 hover:bg-emerald-500/30 rounded text-emerald-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-3 border-b border-white/10 bg-black/20 flex flex-col gap-2">
          <input
            value={newFwName}
            onChange={e => setNewFwName(e.target.value)}
            placeholder="Version name"
            className="w-full bg-[#222] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <input
            value={newFwVersion}
            onChange={e => setNewFwVersion(e.target.value)}
            placeholder="e.g. 1.3.0"
            className="w-full bg-[#222] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {firmwareList.length === 0 && (
            <div className="text-xs text-white/30 text-center py-4">No firmware versions yet.</div>
          )}
          {firmwareList.map((fw) => (
            <div key={fw.id} className="p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-emerald-400 font-bold font-mono text-xs">{fw.version}</span>
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded uppercase font-bold",
                  fw.status === 'deployed' ? "bg-emerald-500/20 text-emerald-400" :
                  fw.status === 'staged' ? "bg-yellow-500/20 text-yellow-400" :
                  fw.status === 'archived' ? "bg-white/10 text-white/40" :
                  "bg-white/5 text-white/30"
                )}>{fw.status}</span>
              </div>
              <div className="text-xs text-white/60 mb-1">{fw.name}</div>
              {fw.changelog && <div className="text-[10px] text-white/40">{fw.changelog}</div>}
              <div className="flex gap-1 mt-2">
                {fw.status !== 'deployed' && (
                  <button
                    onClick={() => updateFirmware(fw.id, { status: 'deployed', deployedAt: Date.now() })}
                    className="text-[9px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors"
                  >Deploy</button>
                )}
                {fw.status === 'deployed' && (
                  <button
                    onClick={() => updateFirmware(fw.id, { status: 'archived' })}
                    className="text-[9px] px-2 py-0.5 bg-white/10 text-white/50 rounded hover:bg-white/20 transition-colors"
                  >Archive</button>
                )}
                {fw.status === 'draft' && (
                  <button
                    onClick={() => updateFirmware(fw.id, { status: 'staged' })}
                    className="text-[9px] px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors"
                  >Stage</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
