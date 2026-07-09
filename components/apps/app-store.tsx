import React, { useState } from 'react';
import { OSWindow } from '@/lib/os-context';
import { Store, Download, CheckCircle, Star, Plus, Shield, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOS } from '@/lib/os-context';

const STORE_APPS = [
  { id: 'browser', name: 'Nite Browser', desc: 'A fast, privacy-first web browser.', icon: '🌐', category: 'Productivity', rating: 4.8 },
  { id: 'media-player', name: 'CinePlay', desc: 'Watch videos and listen to music in high fidelity.', icon: '🎬', category: 'Media', rating: 4.9 },
  { id: 'figma-clone', name: 'DesignFlow', desc: 'Vector graphics editor.', icon: '🎨', category: 'Design', rating: 4.5 },
  { id: 'calculator', name: 'Calc+', desc: 'Advanced scientific calculator.', icon: '🔢', category: 'Utilities', rating: 4.2 },
];

const ECOSYSTEM_PACKS = [
  { id: 'proposals', name: 'ANICHISOM Creative Pack', desc: 'The ultimate agency toolkit. Moodboard Mill, Proposal Generator, Client Portal, and Brand Guides.', icon: '✨', category: 'Ecosystem Pack', rating: 4.9 },
  { id: 'ziklag', name: 'Ziklag Forensics Pack', desc: 'Data recovery and forensics toolkit. Case Management, Chain of Custody, and Evidence Logs.', icon: '🗄️', category: 'Ecosystem Pack', rating: 5.0 },
  { id: 'clothing', name: 'Clothing Brand Pack', desc: 'End-to-end fashion venture management. Lookbooks, inventory, and Shopify integration.', icon: '👕', category: 'Ecosystem Pack', rating: 4.7 },
  { id: 'hardware', name: 'Hardware Pack', desc: 'Electronics venture management. BOMs, firmware tracking, and component libraries.', icon: '🔌', category: 'Ecosystem Pack', rating: 4.8 },
  { id: 'developer', name: 'Developer Pack', desc: 'Freelance developer environment. Deployment tracking, code review logs, and CI bridge.', icon: '💻', category: 'Ecosystem Pack', rating: 4.9 },
  { id: 'photography', name: 'Photography Pack', desc: 'Freelance photography toolkit. Galleries, client delivery, and print orders.', icon: '📷', category: 'Ecosystem Pack', rating: 4.8 },
  { id: 'sidegigs', name: 'Side Gigs Pack', desc: 'Manage multiple side hustles easily. Income tracking, client CRM, and task boards.', icon: '💼', category: 'Ecosystem Pack', rating: 4.6 }
];

export function AppStoreApp({ window: osWindow }: { window: OSWindow }) {
  const { installedApps, installApp, uninstallApp, openWindow } = useOS();
  const [activeTab, setActiveTab] = useState('Discover');

  // Combine both registries for search/installed lists
  const ALL_ITEMS = [...STORE_APPS, ...ECOSYSTEM_PACKS];

  return (
    <div className="flex flex-col w-full h-full bg-[#0a0a0a] text-white font-sans overflow-hidden">
      
      {/* Header */}
      <div className="h-16 border-b border-white/10 bg-white/5 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Store className="w-6 h-6 text-blue-400" />
          <span className="font-bold text-lg tracking-tight">App Hub & Ecosystem Registry</span>
        </div>
        
        <div className="flex bg-black/50 rounded-lg p-1 border border-white/10">
          {['Discover', 'Ecosystem Packs', 'Installed'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", activeTab === tab ? "bg-white/20 text-white shadow-sm" : "text-white/50 hover:text-white")}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 relative">
        <button 
           onClick={() => window.dispatchEvent(new CustomEvent('os:add-custom-app'))}
           className="absolute top-8 right-8 px-4 py-2 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-full transition-colors flex items-center gap-2 border border-white/10"
        >
           <Plus className="w-3.5 h-3.5" /> Add Custom Web App
        </button>

        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pt-8">
          
          {activeTab === 'Discover' && (
             <>
               <div className="w-full h-48 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 flex flex-col justify-end relative overflow-hidden group cursor-pointer shadow-2xl">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  <div className="relative z-10">
                     <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded mb-2 inline-block">Featured Pack</span>
                     <h2 className="text-3xl font-bold mb-1">Ziklag Forensics Pack</h2>
                     <p className="text-white/80">Security auditing, file integrity verification, and data recovery for heavy technical ventures.</p>
                  </div>
               </div>

               <div>
                 <h3 className="text-lg font-bold mb-4">Recommended Apps</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {STORE_APPS.map(app => {
                      const isInstalled = installedApps.includes(app.id);
                      return (
                        <div key={app.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4 hover:bg-white/10 transition-colors">
                           <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center text-3xl shrink-0 shadow-inner">
                             {app.icon}
                           </div>
                           <div className="flex flex-col justify-center flex-1 min-w-0">
                             <div className="font-bold truncate">{app.name}</div>
                             <div className="text-xs text-white/50 truncate mb-1">{app.desc}</div>
                             <div className="flex items-center gap-1 text-[10px] text-yellow-500 font-bold"><Star className="w-3 h-3 fill-yellow-500" /> {app.rating}</div>
                           </div>
                           <div className="flex items-center justify-center shrink-0">
                             {isInstalled ? (
                               <button 
                                 onClick={() => openWindow(app.id)}
                                 className="px-4 py-1.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-colors shadow-lg"
                               >
                                 Open
                               </button>
                             ) : (
                               <button 
                                 onClick={() => installApp(app.id)}
                                 className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors border border-white/10 flex items-center gap-1"
                               >
                                 <Download className="w-3 h-3" /> Get
                               </button>
                             )}
                           </div>
                        </div>
                      )
                    })}
                 </div>
               </div>
             </>
          )}

          {activeTab === 'Ecosystem Packs' && (
             <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold">Layer 3 Venture Packs</h3>
                    <p className="text-sm text-white/50">Install specific plugins for your business units and ventures.</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                     <Shield className="w-3.5 h-3.5" /> Sandbox Verified
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {ECOSYSTEM_PACKS.map(pack => {
                     const isInstalled = installedApps.includes(pack.id);
                     return (
                       <div key={pack.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4 hover:bg-white/10 transition-colors relative overflow-hidden group">
                          <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center text-3xl shrink-0">
                            {pack.icon}
                          </div>
                          <div className="flex flex-col justify-center flex-1 min-w-0">
                            <div className="font-bold flex items-center gap-2">
                              {pack.name} 
                              <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/10 uppercase tracking-widest font-mono font-bold">Venture</span>
                            </div>
                            <div className="text-xs text-white/50 line-clamp-2 mt-1 mb-2 leading-relaxed">{pack.desc}</div>
                            <div className="flex items-center gap-1 text-[10px] text-yellow-500 font-bold"><Star className="w-3 h-3 fill-yellow-500" /> {pack.rating}</div>
                          </div>
                          <div className="flex items-center justify-center shrink-0">
                            {isInstalled ? (
                              <button 
                                onClick={() => openWindow(pack.id)}
                                className="px-4 py-1.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-colors shadow-lg"
                              >
                                Open
                              </button>
                            ) : (
                              <button 
                                onClick={() => installApp(pack.id)}
                                className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors border border-white/10 flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" /> Get
                              </button>
                            )}
                          </div>
                       </div>
                     )
                   })}
                </div>
             </div>
          )}

          {activeTab === 'Installed' && (
            <div>
               <h3 className="text-lg font-bold mb-4">Your Installed Tools</h3>
               <div className="space-y-2">
                 {installedApps.map(appId => {
                   const item = ALL_ITEMS.find(a => a.id === appId);
                   if (!item) return null;
                   return (
                     <div key={appId} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl">{item.icon}</div>
                          <div>
                            <div className="font-bold text-sm">{item.name}</div>
                            <div className="text-[10px] text-white/50">{item.category}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => openWindow(appId)}
                            className="text-xs text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-md transition-colors"
                          >
                            Open
                          </button>
                          <button 
                            onClick={() => uninstallApp(appId)}
                            className="text-xs text-red-400 hover:text-red-300 px-3 py-1 bg-red-400/10 rounded-md transition-colors"
                          >
                            Uninstall
                          </button>
                        </div>
                     </div>
                   );
                 })}
                 {installedApps.length === 0 && (
                   <div className="text-center py-12 text-white/40">You haven't installed any apps or venture packs yet. Go to Discover or Ecosystem Packs to add some!</div>
                 )}
               </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
