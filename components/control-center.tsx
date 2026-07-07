import React, { useState, useEffect } from 'react';
import { Volume2, Sun, Moon, Wifi, Bluetooth, Focus, Battery, Airplay, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOS } from '@/lib/os-context';

export function ControlCenter({ onClose }: { onClose: () => void }) {
  const { themeColor, setScreenShader, screenShader } = useOS();
  const [volume, setVolume] = useState(70);
  const [brightness, setBrightness] = useState(100);
  const [dnd, setDnd] = useState(false);
  const [wifi, setWifi] = useState(true);
  const [bluetooth, setBluetooth] = useState(true);
  const [airdrop, setAirdrop] = useState(true);

  // Apply brightness globally using CSS filters on body (mock)
  useEffect(() => {
    document.body.style.filter = `brightness(${brightness}%)`;
    return () => { document.body.style.filter = ''; };
  }, [brightness]);

  return (
    <div className="absolute top-8 right-4 w-[340px] bg-black/80 backdrop-blur-md border border-white/20 shadow-2xl rounded-3xl p-4 flex flex-col gap-4 text-white z-[300] animate-in fade-in slide-in-from-top-4 duration-200">
      
      {/* Network Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/10 rounded-2xl p-3 flex flex-col gap-3 border border-white/5">
          <div className="flex items-center gap-3">
            <button onClick={() => setWifi(!wifi)} className={cn("p-2 rounded-full transition-colors", wifi ? "bg-blue-500 text-white" : "bg-white/20 text-white/50")}>
              <Wifi className="w-4 h-4" />
            </button>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight">Wi-Fi</span>
              <span className="text-[10px] text-white/60">{wifi ? 'Ziklag_5G' : 'Off'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setBluetooth(!bluetooth)} className={cn("p-2 rounded-full transition-colors", bluetooth ? "bg-blue-500 text-white" : "bg-white/20 text-white/50")}>
              <Bluetooth className="w-4 h-4" />
            </button>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight">Bluetooth</span>
              <span className="text-[10px] text-white/60">{bluetooth ? 'On' : 'Off'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setAirdrop(!airdrop)} className={cn("p-2 rounded-full transition-colors", airdrop ? "bg-blue-500 text-white" : "bg-white/20 text-white/50")}>
              <Airplay className="w-4 h-4" />
            </button>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight">AirDrop</span>
              <span className="text-[10px] text-white/60">{airdrop ? 'Contacts Only' : 'Off'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => {
              setDnd(!dnd);
              if (!dnd) setScreenShader('warm');
              else setScreenShader('none');
            }}
            className={cn("flex-1 rounded-2xl p-3 flex flex-col justify-center items-center gap-2 border transition-colors", dnd ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "bg-white/10 border-white/5 hover:bg-white/20")}
          >
            {dnd ? <Moon className="w-6 h-6 fill-indigo-400" /> : <Moon className="w-6 h-6" />}
            <span className="text-xs font-bold">Do Not Disturb</span>
          </button>
          <div className="bg-white/10 rounded-2xl p-3 flex items-center justify-between border border-white/5 cursor-pointer hover:bg-white/20">
             <div className="flex flex-col">
               <span className="text-xs font-bold">Focus</span>
               <span className="text-[10px] text-white/50">Personal</span>
             </div>
             <Focus className="w-4 h-4 text-white/70" />
          </div>
        </div>
      </div>

      {/* Sliders */}
      <div className="bg-white/10 rounded-2xl p-4 flex flex-col gap-4 border border-white/5">
        <div className="flex items-center gap-3 group">
          <Sun className="w-4 h-4 text-white/70" />
          <input 
            type="range" 
            min="20" max="100" 
            value={brightness}
            onChange={(e) => setBrightness(parseInt(e.target.value))}
            className="flex-1 h-1.5 bg-white/20 rounded-full appearance-none outline-none accent-white group-hover:accent-blue-400 transition-all cursor-pointer"
          />
        </div>
        <div className="flex items-center gap-3 group">
          <Volume2 className="w-4 h-4 text-white/70" />
          <input 
            type="range" 
            min="0" max="100" 
            value={volume}
            onChange={(e) => setVolume(parseInt(e.target.value))}
            className="flex-1 h-1.5 bg-white/20 rounded-full appearance-none outline-none accent-white group-hover:accent-blue-400 transition-all cursor-pointer"
          />
        </div>
      </div>

      {/* Media Player */}
      <div className="bg-white/10 rounded-2xl p-4 border border-white/5 flex items-center gap-4 hover:bg-white/20 transition-colors cursor-pointer">
        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 animate-pulse"></div>
        </div>
        <div className="flex flex-col flex-1 truncate">
          <span className="text-sm font-bold truncate">OS Background Audio</span>
          <span className="text-[10px] text-white/60 truncate">System Mixer</span>
        </div>
        <ChevronRight className="w-4 h-4 text-white/40" />
      </div>

    </div>
  );
}
