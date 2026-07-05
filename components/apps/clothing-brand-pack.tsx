'use client';
import React, { useState } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { Shirt, Tag, Truck, ShoppingBag, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ClothingBrandPack({ window: osWindow }: { window: OSWindow }) {
  const [activeTab, setActiveTab] = useState<'lookbook' | 'suppliers' | 'collections' | 'shopify'>('lookbook');
  
  return (
    <div className="w-full h-full flex flex-col bg-white text-black font-sans">
      <div className="h-14 border-b border-black/10 flex items-center px-4 shrink-0 bg-gray-50">
        <Shirt className="w-5 h-5 mr-3" />
        <h1 className="font-bold">Clothing Brand Pack</h1>
        <div className="ml-8 flex gap-2">
          {(['lookbook', 'suppliers', 'collections', 'shopify'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-3 py-1 text-xs font-semibold rounded-md capitalize", activeTab === tab ? "bg-black text-white" : "hover:bg-gray-200")}>
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'lookbook' && (
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 flex-col gap-2">
                <ImageIcon className="w-8 h-8 text-gray-300" />
                <span className="text-sm font-medium text-gray-500">Look {i}</span>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'suppliers' && (
          <div className="flex flex-col gap-4">
             <h2 className="text-xl font-bold">Supplier Directory</h2>
             <p className="text-gray-600">Track fabrics, trims, and manufacturers across multiple regions.</p>
             <div className="p-4 border rounded shadow-sm">
                <div className="font-bold">Guangzhou Textiles Ltd.</div>
                <div className="text-sm text-gray-500">Cotton Blends, Jersey</div>
             </div>
          </div>
        )}
        {activeTab === 'collections' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold">Collection Planner</h2>
            <div className="p-4 border rounded shadow-sm">
               <div className="font-bold">FW26 Drop 1</div>
               <div className="text-sm text-gray-500">Target Launch: Oct 15</div>
            </div>
          </div>
        )}
        {activeTab === 'shopify' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-green-700">Shopify Integration</h2>
            <button className="px-4 py-2 bg-green-600 text-white rounded w-fit font-bold">Sync Products</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ImageIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
}
