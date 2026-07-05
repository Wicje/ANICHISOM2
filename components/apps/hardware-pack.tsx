'use client';
import React, { useState } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { Cpu, Battery, Database, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HardwarePack({ window: osWindow }: { window: OSWindow }) {
  const [activeTab, setActiveTab] = useState<'bom' | 'firmware' | 'suppliers' | 'components'>('bom');
  
  return (
    <div className="w-full h-full flex flex-col bg-slate-900 text-white font-mono">
      <div className="h-14 border-b border-white/10 flex items-center px-4 shrink-0 bg-slate-950">
        <Cpu className="w-5 h-5 text-emerald-400 mr-3" />
        <h1 className="font-bold tracking-wider">Hardware Engineering Pack</h1>
        <div className="ml-8 flex gap-2">
          {(['bom', 'firmware', 'suppliers', 'components'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-3 py-1 text-xs font-semibold rounded-md uppercase", activeTab === tab ? "bg-emerald-500/20 text-emerald-400" : "hover:bg-white/5")}>
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'bom' && (
          <div className="flex flex-col gap-4">
             <h2 className="text-xl font-bold text-emerald-400">Bill of Materials (BOM)</h2>
             <table className="w-full text-left text-sm border-collapse mt-4">
               <thead>
                 <tr className="border-b border-white/10 text-white/50">
                   <th className="pb-2">Part #</th>
                   <th className="pb-2">Description</th>
                   <th className="pb-2">Quantity</th>
                   <th className="pb-2">Unit Cost</th>
                 </tr>
               </thead>
               <tbody>
                 <tr className="border-b border-white/5 hover:bg-white/5">
                   <td className="py-2 text-emerald-300">ESP32-S3-WROOM</td>
                   <td className="py-2">WiFi/BT MCU Module</td>
                   <td className="py-2">1</td>
                   <td className="py-2">$3.40</td>
                 </tr>
               </tbody>
             </table>
          </div>
        )}
        {activeTab === 'firmware' && <div>Firmware Version Tracker - OTA update logs and release notes.</div>}
        {activeTab === 'suppliers' && <div>Hardware Supplier CRM.</div>}
        {activeTab === 'components' && <div>Component Footprint Library (Altium/Eagle Sync).</div>}
      </div>
    </div>
  );
}
