import React, { useState, useRef } from 'react';
import { OSWindow } from '@/lib/os-context';
import { ChevronLeft, ChevronRight, RotateCw, Home, Shield, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BrowserApp({ window: osWindow }: { window: OSWindow }) {
  const [url, setUrl] = useState('https://www.wikipedia.org/');
  const [inputUrl, setInputUrl] = useState(url);
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const navigate = (e: React.FormEvent) => {
    e.preventDefault();
    let finalUrl = inputUrl;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      if (finalUrl.includes('.')) {
        finalUrl = 'https://' + finalUrl;
      } else {
        finalUrl = 'https://www.google.com/search?q=' + encodeURIComponent(finalUrl);
      }
    }
    setUrl(finalUrl);
    setInputUrl(finalUrl);
    setIsLoading(true);
  };

  return (
    <div className="flex flex-col w-full h-full bg-white text-black font-sans overflow-hidden">
      
      {/* Browser Chrome */}
      <div className="h-12 bg-neutral-100 border-b border-neutral-300 flex items-center px-3 gap-3 shrink-0 select-none">
        <div className="flex items-center gap-1">
          <button className="w-7 h-7 rounded-md hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 rounded-md hover:bg-neutral-200 flex items-center justify-center text-neutral-400 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsLoading(true)}
            className="w-7 h-7 rounded-md hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors"
          >
            <RotateCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin text-blue-500")} />
          </button>
          <button 
            onClick={() => { setUrl('https://www.wikipedia.org/'); setInputUrl('https://www.wikipedia.org/'); }}
            className="w-7 h-7 rounded-md hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={navigate} className="flex-1 relative group">
           <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Shield className="w-3.5 h-3.5 text-neutral-400 group-focus-within:text-blue-500" />
           </div>
           <input 
             type="text" 
             value={inputUrl}
             onChange={(e) => setInputUrl(e.target.value)}
             className="w-full h-8 bg-white border border-neutral-300 rounded-lg pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
             placeholder="Search or enter website name"
           />
        </form>
      </div>

      {/* Webview */}
      <div className="flex-1 bg-white relative">
        <iframe
          ref={iframeRef}
          src={url}
          className="w-full h-full border-none"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          onLoad={() => setIsLoading(false)}
        />
        
        {/* Anti-Frame Busting Disclaimer (since many sites block iframes) */}
        <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md text-white text-[10px] p-2 rounded-lg shadow-xl flex justify-between items-center opacity-50 hover:opacity-100 transition-opacity pointer-events-none">
           <span>Note: Some websites (like Google or YouTube) block rendering inside embedded frames.</span>
           <button className="underline pointer-events-auto" onClick={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}
