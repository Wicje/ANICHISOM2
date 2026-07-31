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
  const [wifiName, setWifiName] = useState('Continua_Studio_5G');
  const [showWifiList, setShowWifiList] = useState(false);
  const [availableNetworks, setAvailableNetworks] = useState([
    { ssid: 'Continua_Studio_5G', signal: '100%', secured: true },
    { ssid: 'Fiber_Ultra_Guest', signal: '85%', secured: true },
    { ssid: 'Home_Lab_Mesh', signal: '70%', secured: true },
    { ssid: 'Direct_5G_Hotspot', signal: '60%', secured: false },
  ]);

  // Detect network name on mount if Web API is available
  useEffect(() => {
    const conn = typeof navigator !== 'undefined' ? (navigator as any).connection : null;
    if (conn && conn.type) {
      if (conn.type === 'wifi') setWifiName('Continua_WiFi');
      else if (conn.type === 'cellular') setWifiName('Cellular_5G');
      else if (conn.type === 'ethernet') setWifiName('Ethernet_Gigabit');
    }
  }, []);

  // Apply brightness globally using CSS filters on body
  useEffect(() => {
    document.body.style.filter = `brightness(${brightness}%)`;
    return () => { document.body.style.filter = ''; };
  }, [brightness]);

  return (
    <div className="absolute top-8 right-4 w-[340px] bg-[var(--os-surface)] border border-white/20 shadow-2xl rounded-3xl p-4 flex flex-col gap-4 text-white z-[300] animate-in fade-in slide-in-from-top-4 duration-200">
      
      {/* Network Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/10 rounded-2xl p-3 flex flex-col gap-3 border border-white/5 relative">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setShowWifiList(!showWifiList)}>
            <button 
              onClick={(e) => { e.stopPropagation(); setWifi(!wifi); }} 
              className={cn("p-2 rounded-full transition-colors", wifi ? "bg-blue-500 text-white" : "bg-white/20 text-white/50")}
            >
              <Wifi className="w-4 h-4" />
            </button>
            <div className="flex flex-col flex-1">
              <span className="text-sm font-bold leading-tight flex items-center justify-between">
                Wi-Fi <ChevronRight className={cn("w-3 h-3 text-white/50 transition-transform", showWifiList && "rotate-90")} />
              </span>
              <span className="text-[10px] text-white/60 truncate max-w-[90px]">{wifi ? wifiName : 'Off'}</span>
            </div>
          </div>

          {showWifiList && wifi && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 border border-white/15 rounded-2xl p-2.5 shadow-2xl z-50 flex flex-col gap-1 backdrop-blur-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">Select Network</span>
              {availableNetworks.map((net) => (
                <button
                  key={net.ssid}
                  onClick={() => {
                    setWifiName(net.ssid);
                    setShowWifiList(false);
                    window.dispatchEvent(new CustomEvent('os:notify', {
                      detail: { title: 'Wi-Fi Connected', description: `Connected to ${net.ssid}`, type: 'success' }
                    }));
                  }}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors text-left",
                    wifiName === net.ssid ? "bg-blue-600/30 text-blue-300 font-bold border border-blue-500/40" : "hover:bg-white/10 text-slate-200"
                  )}
                >
                  <span className="truncate max-w-[130px]">{net.ssid}</span>
                  <span className="text-[10px] opacity-60 font-mono">{net.signal}</span>
                </button>
              ))}
            </div>
          )}
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
          <button 
            onClick={() => {
              try {
                const { usePomodoroStore } = require('@/lib/stores/pomodoro.store');
                const store = usePomodoroStore.getState();
                if (store.isActive) store.stop();
                else store.startFocus();
              } catch {}
            }}
            className="bg-white/10 rounded-2xl p-3 flex items-center justify-between border border-white/5 cursor-pointer hover:bg-white/20 transition-colors w-full"
          >
             <div className="flex flex-col text-left">
               <span className="text-xs font-bold">Focus Mode</span>
               <span className="text-[10px] text-white/50">Pomodoro Timer</span>
             </div>
             <Focus className="w-4 h-4 text-emerald-400" />
          </button>

          {/* Light / Heavy Mode Toggle */}
          <button 
            onClick={() => {
              window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Theme Updated', description: 'Performance & Shader mode updated', type: 'info' } }));
            }}
            className="bg-white/10 rounded-2xl p-3 flex items-center justify-between border border-white/5 cursor-pointer hover:bg-white/20 transition-colors w-full"
          >
             <div className="flex flex-col text-left">
               <span className="text-xs font-bold">Performance Mode</span>
               <span className="text-[10px] text-amber-400 font-semibold">Light / Heavy</span>
             </div>
             <Sun className="w-4 h-4 text-amber-400" />
          </button>
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
