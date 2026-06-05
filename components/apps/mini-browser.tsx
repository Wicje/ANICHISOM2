'use client';

import React, { useState } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { ArrowLeft, ArrowRight, RotateCw, Home, Lock, ExternalLink, Search } from 'lucide-react';
import Image from 'next/image';

export function MiniBrowser({ window }: { window: OSWindow }) {
  const [url, setUrl] = useState(window.data?.url || '');
  const [inputUrl, setInputUrl] = useState(window.data?.url || '');
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);

  const { performanceMode } = useOS();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl) return;
    
    let finalUrl = inputUrl;
    
    // Check if it's a domain-like string (e.g. example.com)
    const isDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(inputUrl) || inputUrl.startsWith('http');
    
    if (isDomain) {
      if (!inputUrl.startsWith('http')) {
        finalUrl = `https://${inputUrl}`;
        setInputUrl(finalUrl);
      }
    } else {
      // It's a search query. Use Google.
      // Note: Google generally blocks iframing, but the `igu=1` parameter sometimes helps,
      // or the user can click the external link button.
      finalUrl = `https://www.google.com/search?q=${encodeURIComponent(inputUrl)}&igu=1`;
    }
    
    setUrl(finalUrl);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white text-black font-sans relative">
      {/* Browser Chrome */}
      <div className="h-12 border-b border-black/10 bg-slate-50 flex items-center justify-between px-4 gap-4 shrink-0 z-10">
        <div className="flex items-center gap-2 text-slate-500">
          <ArrowLeft className="w-4 h-4 cursor-pointer hover:text-black transition-colors" />
          <ArrowRight className="w-4 h-4 text-slate-300" />
          <RotateCw className="w-4 h-4 cursor-pointer hover:text-black transition-colors ml-2" />
        </div>
        
        <form 
          onSubmit={handleSubmit}
          className="flex-1 max-w-xl mx-auto flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-black/10 focus-within:border-neon-blue shadow-sm"
        >
          {url && !url.includes('search?q=') ? <Lock className="w-3 h-3 text-emerald-600" /> : <Search className="w-3 h-3 text-slate-400" />}
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Search Google or enter web address"
            className="flex-1 bg-transparent border-none outline-none text-sm"
          />
        </form>

        <div className="flex items-center gap-4 text-slate-500">
          <Home className="w-4 h-4 cursor-pointer hover:text-black transition-colors" onClick={() => setUrl('')}/>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors" title="Open in new tab">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Browser Content */}
      <div className="flex-1 bg-slate-100 flex flex-col relative overflow-hidden">
         {!url ? (
       <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white relative z-10 overflow-y-auto">
         {window.data?.projectId === 'nike-campaign' && (
           <div className="max-w-4xl w-full flex flex-col gap-6 pt-12">
             <div className="w-12 h-12 bg-black mb-4"></div>
             <h1 className="font-sans text-5xl font-black uppercase tracking-tighter">Force 40th <br/>Anniversary</h1>
             <p className="text-xl text-slate-500 font-serif italic mb-8 max-w-xl">
               Celebrating four decades of culture. A live preview of the interactive campaign landing page.
             </p>
             <div className="w-full aspect-video bg-slate-100 rounded-xl overflow-hidden relative group">
               <Image src="https://picsum.photos/seed/nike/1000/600" fill className="object-cover" alt="Hero" />
               <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex items-end">
                 <button className="bg-white text-black px-6 py-2 font-bold uppercase rounded-full text-xs">Buy Now</button>
               </div>
             </div>
           </div>
         )}
         {window.data?.projectId === 'tesla-redesign' && (
           <div className="max-w-4xl w-full flex flex-col gap-6 pt-12 text-center items-center">
             <div className="text-red-600 font-bold tracking-widest uppercase mb-4 text-xl">TESLA</div>
             <h1 className="font-sans text-4xl font-extralight tracking-tight text-slate-900">Model OS Concept UI</h1>
             <div className="w-full h-96 bg-black rounded-3xl mt-8 flex px-8 py-6 gap-6 relative shadow-2xl shadow-black/20">
               <div className="w-64 h-full border border-white/10 rounded-2xl flex flex-col p-4 bg-white/5">
                 <div className="text-white font-mono text-sm">68° / Auto</div>
               </div>
               <div className="flex-1 h-full border border-white/10 rounded-2xl p-4 bg-white/5 relative overflow-hidden">
                 <Image src="https://picsum.photos/seed/map/800/600" fill className="opacity-50 object-cover rounded-xl" alt="Map" />
               </div>
             </div>
           </div>
         )}
         {!['nike-campaign', 'tesla-redesign'].includes(window.data?.projectId) && (
             <div className="max-w-3xl w-full h-full flex flex-col pt-12 relative z-10">
               <h1 className="text-4xl font-display font-medium tracking-tight mb-6">{window.data?.projectId ? `Project Live Preview: ${window.data.projectId}` : 'Research Index _ 01'}</h1>
               <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                 An aggregation of visual references, structural concepts, and thematic logic for upcoming campaigns. 
                 Start by searching Google or entering a URL above. Note: some sites block being embedded.
               </p>
               
               <div className="grid grid-cols-2 gap-8">
                 <div className="aspect-[4/3] bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 overflow-hidden relative group">
                   <Image src="https://picsum.photos/seed/design1/800/600" fill className="object-cover brightness-95 group-hover:scale-105 transition-transform duration-700" alt="Reference 1" />
                   <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity">
                     Ref: Brutalist typography
                   </div>
                 </div>
                 <div className="aspect-[4/3] bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 overflow-hidden relative group">
                   <Image src="https://picsum.photos/seed/design2/800/600" fill className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt="Reference 2" />
                   <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity">
                     Ref: Glassmorphism layout
                   </div>
                 </div>
               </div>
             </div>
         )}
       </div>
         ) : (
           <div className="w-full h-full relative">
              {/* Optional overlay message if they complain about blocked iframes */}
             {url && ['figma.com', 'framer.com', 'github.com', 'x.com', 'twitter.com', 'linkedin.com'].some(domain => {
               try {
                 const hostname = new URL(url).hostname;
                 return hostname === domain || hostname.endsWith(`.${domain}`);
               } catch (e) {
                 return false;
               }
             }) ? (
               <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-8 text-center">
                 <Lock className="w-12 h-12 text-slate-400 mb-6" />
                 <h2 className="text-2xl font-semibold mb-2">Can&apos;t Embed This Page</h2>
                 <p className="text-slate-500 max-w-md mb-8">
                   For security reasons, this site does not allow itself to be embedded within other applications.
                 </p>
                 <a href={url} target="_blank" rel="noopener noreferrer" className="bg-black text-white px-6 py-3 rounded-full flex items-center gap-2 hover:bg-slate-800 transition-colors">
                   Open in New Tab <ExternalLink className="w-4 h-4" />
                 </a>
               </div>
             ) : (
               <iframe 
                 src={url} 
                 className="w-full h-full border-none bg-white absolute inset-0 z-20" 
                 title="Browser Content"
                 sandbox="allow-scripts allow-same-origin allow-forms allow-popups" loading={performanceMode === 'light' ? 'lazy' : 'eager'}
               />
             )}
           </div>
         )}
      </div>
    </div>
  );
}
