'use client';
import React, { useState } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { Camera, Printer, Shield, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PhotographyPack({ window: osWindow }: { window: OSWindow }) {
  const [activeTab, setActiveTab] = useState<'gallery' | 'delivery' | 'watermark' | 'prints'>('gallery');
  
  return (
    <div className="w-full h-full flex flex-col bg-zinc-50 text-zinc-900 font-sans">
      <div className="h-14 border-b border-zinc-200 flex items-center px-4 shrink-0 bg-white">
        <Camera className="w-5 h-5 text-indigo-500 mr-3" />
        <h1 className="font-bold">Photography Studio Pack</h1>
        <div className="ml-8 flex gap-2">
          {(['gallery', 'delivery', 'watermark', 'prints'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-3 py-1 text-xs font-semibold rounded-full capitalize", activeTab === tab ? "bg-indigo-500 text-white" : "hover:bg-zinc-100")}>
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'gallery' && (
          <div className="grid grid-cols-4 gap-4">
             {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="aspect-square bg-zinc-200 rounded-lg overflow-hidden border border-zinc-300 flex items-center justify-center">
                   <span className="text-zinc-400 font-medium">IMG_{8000+i}.CR3</span>
                </div>
             ))}
          </div>
        )}
        {activeTab === 'delivery' && (
          <div className="flex flex-col gap-4 max-w-2xl">
             <h2 className="text-xl font-bold">Client Delivery Portal</h2>
             <div className="p-4 bg-white border border-zinc-200 rounded-lg shadow-sm">
                <div className="font-bold text-lg mb-2">Wedding - Sarah & John</div>
                <div className="flex items-center gap-2 mb-4">
                   <input type="password" value="secretpassword" readOnly className="border px-2 py-1 rounded text-sm w-48 bg-zinc-50" />
                   <button className="text-xs bg-zinc-800 text-white px-3 py-1.5 rounded">Copy Link</button>
                </div>
                <div className="text-sm text-green-600 font-medium flex items-center gap-1">
                   <Shield className="w-4 h-4" /> Delivered & Secured
                </div>
             </div>
          </div>
        )}
        {activeTab === 'watermark' && <div>Batch Watermarking Tool.</div>}
        {activeTab === 'prints' && <div>Print Fulfillment Orders.</div>}
      </div>
    </div>
  );
}
