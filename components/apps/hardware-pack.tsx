'use client';
import React, { useState } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { Cpu, Battery, Database, Settings, Box, Play, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import '@google/model-viewer';
import { Storage } from '@/lib/storage';
import { useEffect } from 'react';

export function HardwarePack({ window: osWindow }: { window: OSWindow }) {
  const { workspaceMode } = useOS();
  const [activeTab, setActiveTab] = useState<'bom' | 'firmware' | 'suppliers' | '3d-viewer'>('3d-viewer');
  
  const [bomData, setBomData] = useState<any[]>([
    { id: '1', part: 'ESP32-S3-WROOM', desc: 'WiFi/BT MCU Module', qty: 1, cost: 3.40 },
    { id: '2', part: 'BME280', desc: 'Temp/Humidity/Pressure Sensor', qty: 1, cost: 2.15 },
  ]);

  useEffect(() => {
     const roomId = `hardware-${osWindow.id}`;
     const unsub = Storage.subscribe('docs', roomId, workspaceMode, (state: any) => {
        if (state && state.bom) setBomData(state.bom);
     });
     return () => unsub();
  }, [workspaceMode, osWindow.id]);
  
  return (
    <div className="w-full h-full flex flex-col bg-slate-900 text-white font-mono">
      <div className="h-14 border-b border-white/10 flex items-center px-4 shrink-0 bg-slate-950">
        <Cpu className="w-5 h-5 text-emerald-400 mr-3" />
        <h1 className="font-bold tracking-wider">Hardware Engineering Pack</h1>
        <div className="ml-8 flex gap-2">
          {(['3d-viewer', 'bom', 'firmware', 'suppliers'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-3 py-1 text-xs font-semibold rounded-md uppercase tracking-wider transition-colors", activeTab === tab ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-white/50 hover:bg-white/5 hover:text-white/80")}>
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === '3d-viewer' && (
          <div className="flex flex-col h-full bg-[#111] rounded-xl border border-white/10 overflow-hidden relative shadow-2xl">
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-black/50 p-4 rounded-lg border border-white/5 backdrop-blur">
               <h3 className="text-emerald-400 font-bold uppercase tracking-widest text-xs">Model Metadata</h3>
               <div className="text-xs text-white/70">Part: OS-Core-RevB</div>
               <div className="text-xs text-white/70">Material: Aluminum 6061</div>
               <div className="text-xs text-white/70">Mass: 142.4g</div>
            </div>
            {/* @ts-ignore */}
            <model-viewer
              src="https://modelviewer.dev/shared-assets/models/Astronaut.glb"
              ios-src="https://modelviewer.dev/shared-assets/models/Astronaut.usdz"
              alt="A 3D model of an astronaut"
              shadow-intensity="1"
              camera-controls
              auto-rotate
              ar
              style={{ width: '100%', height: '100%', backgroundColor: '#0a0a0a' }}
            >
            {/* @ts-ignore */}
            </model-viewer>
          </div>
        )}
        {activeTab === 'bom' && (
          <div className="flex flex-col gap-4">
             <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-emerald-400">Bill of Materials (BOM)</h2>
                <div className="text-sm bg-white/10 px-3 py-1 rounded text-white/80">Total Cost: <span className="font-bold text-emerald-400">${bomData.reduce((acc, val) => acc + (val.cost * val.qty), 0).toFixed(2)}</span></div>
             </div>
             <div className="bg-[#111] rounded-lg border border-white/10 overflow-hidden">
               <table className="w-full text-left text-sm border-collapse">
                 <thead>
                   <tr className="border-b border-white/10 text-white/50 bg-black/40">
                     <th className="p-4 font-medium uppercase tracking-wider text-[10px]">Part #</th>
                     <th className="p-4 font-medium uppercase tracking-wider text-[10px]">Description</th>
                     <th className="p-4 font-medium uppercase tracking-wider text-[10px]">Quantity</th>
                     <th className="p-4 font-medium uppercase tracking-wider text-[10px]">Unit Cost</th>
                     <th className="p-4 font-medium uppercase tracking-wider text-[10px]">Ext Cost</th>
                   </tr>
                 </thead>
                 <tbody>
                   {bomData.map(item => (
                     <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                       <td className="p-4 text-emerald-300 font-bold">{item.part}</td>
                       <td className="p-4 text-white/80">{item.desc}</td>
                       <td className="p-4 text-white/60">{item.qty}</td>
                       <td className="p-4 text-white/60">${item.cost.toFixed(2)}</td>
                       <td className="p-4 text-white">${(item.cost * item.qty).toFixed(2)}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        )}
        {activeTab === 'firmware' && (
          <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-bold text-emerald-400">Firmware Deployment</h2>
               <div className="flex gap-2">
                 <button 
                   onClick={async () => {
                     try {
                        const port = await (navigator as any).serial.requestPort();
                        alert(`Connected to WebSerial Port! Proceeding with firmware flash...`);
                     } catch (e) {
                        alert(`Serial Connection failed: ${e}`);
                     }
                   }}
                   className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-xs uppercase tracking-widest font-bold hover:bg-emerald-500/30 transition-colors"
                 >
                   Connect WebSerial
                 </button>
                 <button 
                   onClick={async () => {
                     try {
                        const device = await (navigator as any).usb.requestDevice({ filters: [] });
                        alert(`Connected to WebUSB Device: ${device.productName}`);
                     } catch (e) {
                        alert(`USB Connection failed: ${e}`);
                     }
                   }}
                   className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs uppercase tracking-widest font-bold hover:bg-blue-500/30 transition-colors"
                 >
                   Connect WebUSB
                 </button>
               </div>
            </div>
            <div className="flex-1 bg-[#0a0a0a] rounded-lg border border-white/10 p-4 font-mono text-xs text-white/70 overflow-auto">
               <div className="text-emerald-500 mb-4">{`> Awaiting hardware connection...`} <br/>{`> Use the buttons above to grant WebUSB or WebSerial access.`}</div>
               <div className="mb-2"><span className="text-blue-400">[v1.2.4]</span> - OTA deployed to 1,204 devices successfully.</div>
               <div className="mb-2"><span className="text-blue-400">[v1.2.3]</span> - Fixed I2C clock stretching issue on BME280.</div>
            </div>
          </div>
        )}
        {activeTab === 'suppliers' && (
          <div className="grid grid-cols-2 gap-4">
             {['DigiKey', 'Mouser', 'JLCPCB', 'PCBWay'].map(supplier => (
               <div key={supplier} className="p-6 bg-[#111] rounded-lg border border-white/10 hover:border-emerald-500/50 transition-colors cursor-pointer">
                  <div className="font-bold text-lg mb-2">{supplier}</div>
                  <div className="text-sm text-emerald-400 mb-4">API Connected • Auto-Ordering Active</div>
                  <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-xs uppercase tracking-wider w-full transition-colors">View Inventory</button>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}
