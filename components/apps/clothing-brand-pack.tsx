'use client';
import React, { useState } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { Shirt, Tag, Truck, ShoppingBag, Package, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Storage } from '@/lib/storage';
import { useEffect } from 'react';

export function ClothingBrandPack({ window: osWindow }: { window: OSWindow }) {
  const { workspaceMode } = useOS();
  const [activeTab, setActiveTab] = useState<'lookbook' | 'suppliers' | 'collections' | 'shopify'>('lookbook');
  
  const [shopifyData, setShopifyData] = useState<any[]>([
    { name: 'Mon', sales: 0 }, { name: 'Tue', sales: 0 }, { name: 'Wed', sales: 0 }
  ]);

  useEffect(() => {
     const roomId = `clothing-${osWindow.id}`;
     const unsub = Storage.subscribe('docs', roomId, workspaceMode, (state: any) => {
        if (state && state.shopify) setShopifyData(state.shopify);
     });
     return () => unsub();
  }, [workspaceMode, osWindow.id]);
  
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
      <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50">
        {activeTab === 'lookbook' && (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {[1,2,3,4,5,6,7,8,9].map(i => (
              <div key={i} className={cn(
                 "bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:shadow-md transition-all",
                 i % 3 === 0 ? "h-80" : i % 2 === 0 ? "h-64" : "h-48"
              )}>
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors z-10" />
                <ImageIcon className="w-10 h-10 text-gray-200 group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity z-20">
                   <div className="font-bold">FW26 Look {i}</div>
                   <div className="text-xs text-white/80">Cotton Jersey / Oversized</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'suppliers' && (
          <div className="flex flex-col gap-6">
             <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Supplier Directory</h2>
                <button className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">Add Supplier</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {[
                 { name: 'Guangzhou Textiles Ltd.', type: 'Cotton Blends, Jersey', status: 'Active', rating: 4.8 },
                 { name: 'Milan Leather Works', type: 'Full-grain Leather', status: 'Pending', rating: 4.9 },
                 { name: 'Portugal Knits', type: 'Fleece, Sweats', status: 'Active', rating: 4.7 }
               ].map(s => (
                 <div key={s.name} className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-black transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                       <div className="font-bold text-lg">{s.name}</div>
                       <div className={cn("px-2 py-1 text-xs font-bold rounded-md", s.status === 'Active' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700")}>{s.status}</div>
                    </div>
                    <div className="text-sm text-gray-500 mb-4">{s.type}</div>
                    <div className="text-sm font-medium">Rating: {s.rating} / 5.0</div>
                 </div>
               ))}
             </div>
          </div>
        )}
        {activeTab === 'collections' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold tracking-tight">Collection Planner</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
               {['Ideation', 'Sampling', 'Production', 'Fulfilled'].map(status => (
                 <div key={status} className="w-80 shrink-0 bg-gray-100/50 rounded-xl p-4 border border-gray-200">
                    <h3 className="font-bold text-gray-700 mb-4 uppercase tracking-wider text-xs">{status}</h3>
                    {status === 'Sampling' && (
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-3 cursor-grab hover:ring-2 hover:ring-black transition-all">
                         <div className="font-bold mb-1">FW26 Drop 1 - Heavyweight Hoodie</div>
                         <div className="text-xs text-gray-500 mb-3">Tech pack sent to Portugal. Awaiting V2 sample.</div>
                         <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                           <div className="bg-black w-3/4 h-full" />
                         </div>
                      </div>
                    )}
                 </div>
               ))}
            </div>
          </div>
        )}
        {activeTab === 'shopify' && (
          <div className="flex flex-col gap-6 h-full">
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
                   <AreaChart data={shopifyData}>
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
        )}
      </div>
    </div>
  );
}

function ImageIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
}
