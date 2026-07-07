import React, { useState } from 'react';
import { OSWindow } from '@/lib/os-context';
import { Store, Download, CheckCircle, Star, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOS } from '@/lib/os-context';

const STORE_APPS = [
  { id: 'browser', name: 'Nite Browser', desc: 'A fast, privacy-first web browser.', icon: '🌐', category: 'Productivity', rating: 4.8 },
  { id: 'media-player', name: 'CinePlay', desc: 'Watch videos and listen to music in high fidelity.', icon: '🎬', category: 'Media', rating: 4.9 },
  { id: 'figma-clone', name: 'DesignFlow', desc: 'Vector graphics editor.', icon: '🎨', category: 'Design', rating: 4.5 },
  { id: 'calculator', name: 'Calc+', desc: 'Advanced scientific calculator.', icon: '🔢', category: 'Utilities', rating: 4.2 },
];

export function AppStoreApp({ window: osWindow }: { window: OSWindow }) {
  const { installedApps, installApp, uninstallApp } = useOS();
  const [activeTab, setActiveTab] = useState('Discover');

  return (
    <div className="flex flex-col w-full h-full bg-[#0a0a0a] text-white font-sans overflow-hidden">
      
      {/* Header */}
      <div className="h-16 border-b border-white/10 bg-white/5 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Store className="w-6 h-6 text-blue-400" />
          <span className="font-bold text-lg tracking-tight">App Hub</span>
        </div>
        
        <div className="flex bg-black/50 rounded-lg p-1 border border-white/10">
          {['Discover', 'Installed', 'Updates'].map(tab => (
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
                     <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded mb-2 inline-block">Featured</span>
                     <h2 className="text-3xl font-bold mb-1">CinePlay is here.</h2>
                     <p className="text-white/80">The ultimate media experience, now native on ANICHISOM.</p>
                  </div>
               </div>

               <div>
                 <h3 className="text-lg font-bold mb-4">Recommended for You</h3>
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
                                 onClick={() => uninstallApp(app.id)}
                                 className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-xs font-bold transition-colors border border-white/5"
                               >
                                 Open
                               </button>
                             ) : (
                               <button 
                                 onClick={() => installApp(app.id)}
                                 className="px-4 py-1.5 rounded-full bg-blue-500 hover:bg-blue-600 text-xs font-bold transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-1"
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

          {activeTab === 'Installed' && (
            <div>
               <h3 className="text-lg font-bold mb-4">Your Apps</h3>
               <div className="space-y-2">
                 {installedApps.map(appId => {
                   const storeApp = STORE_APPS.find(a => a.id === appId);
                   if (!storeApp) return null;
                   return (
                     <div key={appId} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl">{storeApp.icon}</div>
                          <div>
                            <div className="font-bold text-sm">{storeApp.name}</div>
                            <div className="text-[10px] text-white/50">{storeApp.category}</div>
                          </div>
                        </div>
                        <button 
                          onClick={() => uninstallApp(appId)}
                          className="text-xs text-red-400 hover:text-red-300 px-3 py-1 bg-red-400/10 rounded-md"
                        >
                          Uninstall
                        </button>
                     </div>
                   );
                 })}
                 {installedApps.length === 0 && (
                   <div className="text-center py-12 text-white/40">You haven't installed any third-party apps yet.</div>
                 )}
               </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
