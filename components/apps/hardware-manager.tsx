import React, { useState, useEffect } from 'react';
import { OSWindow } from '@/lib/os-context';
import { Wifi, Monitor, Smartphone, Keyboard, RefreshCw, Bluetooth, Link2, Unlink } from 'lucide-react';
import { cn } from '@/lib/utils';

// Tauri IPC Mock/Detection
const isTauri = typeof window !== 'undefined' && '__TAURI_IPC__' in window;

export function HardwareManagerApp({ window: osWindow }: { window: OSWindow }) {
  const [activeTab, setActiveTab] = useState<'wireless' | 'displays' | 'phone' | 'keyboard'>('wireless');
  
  // Wireless State
  const [wifiNetworks, setWifiNetworks] = useState<{ ssid: string, strength: number, secure: boolean }[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connectedWifi, setConnectedWifi] = useState<string | null>(null);

  // Displays State — use Screen API
  const [displays, setDisplays] = useState<{ id: string, name: string, resolution: string, primary: boolean }[]>([
    { id: '1', name: `${typeof screen !== 'undefined' ? screen.width + 'x' + screen.height : 'Unknown'} Display`, resolution: `${typeof screen !== 'undefined' ? screen.width + 'x' + screen.height : 'Unknown'}`, primary: true }
  ]);

  // Phone State
  const [phoneStatus, setPhoneStatus] = useState<'disconnected' | 'pairing' | 'connected'>('disconnected');

  // Keyboard State
  const [keyboardLayout, setKeyboardLayout] = useState('us');

  // Scan for Wi-Fi using Network Information API if available
  const scanWifi = () => {
    setScanning(true);
    setWifiNetworks([]);
    setTimeout(() => {
      const conn = typeof navigator !== 'undefined' ? (navigator as any).connection : null;
      const networks: { ssid: string; strength: number; secure: boolean }[] = [];
      if (conn) {
        networks.push({
          ssid: conn.type === 'wifi' ? 'Current Network' : 'Connected (' + (conn.type || 'unknown') + ')',
          strength: conn.effectiveType === '4g' ? 100 : conn.effectiveType === '3g' ? 70 : 50,
          secure: true,
        });
      }
      setWifiNetworks(networks);
      setScanning(false);
    }, 800);
  };

  useEffect(() => {
    if (activeTab === 'wireless' && wifiNetworks.length === 0) {
      scanWifi();
    }
  }, [activeTab]);

  return (
    <div className="flex w-full h-full bg-neutral-950 text-white font-sans">
      {/* Sidebar */}
      <div className="w-48 border-r border-white/10 p-4 flex flex-col gap-2 shrink-0">
        <div className="text-xs font-bold text-white/50 tracking-wider uppercase mb-2">Hardware</div>
        
        <button 
          onClick={() => setActiveTab('wireless')}
          className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === 'wireless' ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white")}
        >
          <Wifi className="w-4 h-4" /> Wireless
        </button>
        <button 
          onClick={() => setActiveTab('displays')}
          className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === 'displays' ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white")}
        >
          <Monitor className="w-4 h-4" /> Displays (HDMI)
        </button>
        <button 
          onClick={() => setActiveTab('phone')}
          className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === 'phone' ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white")}
        >
          <Smartphone className="w-4 h-4" /> Phone Connect
        </button>
        <button 
          onClick={() => setActiveTab('keyboard')}
          className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === 'keyboard' ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white")}
        >
          <Keyboard className="w-4 h-4" /> Keyboard Layout
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 relative">
        {!isTauri && (
          <div className="absolute top-4 right-4 bg-amber-500/10 border border-amber-500/30 text-amber-500 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2">
            <span>Running in Web Mode</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          </div>
        )}

        {/* Wireless Tab */}
        {activeTab === 'wireless' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h2 className="text-xl font-medium flex items-center gap-2"><Wifi className="w-6 h-6 text-blue-400" /> Wi-Fi Connections</h2>
              <button onClick={scanWifi} disabled={scanning} className="p-2 bg-white/10 hover:bg-white/20 rounded-md transition-colors disabled:opacity-50">
                <RefreshCw className={cn("w-4 h-4", scanning && "animate-spin")} />
              </button>
            </div>
            
            <div className="space-y-2">
              {wifiNetworks.map((net) => (
                <div key={net.ssid} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-4">
                    <Wifi className={cn("w-5 h-5", net.strength > 70 ? "text-green-400" : "text-amber-400")} />
                    <div>
                      <div className="font-medium text-sm">{net.ssid}</div>
                      <div className="text-xs text-white/50">{net.secure ? 'Secured' : 'Open'} • Signal: {net.strength}%</div>
                    </div>
                  </div>
                  {connectedWifi === net.ssid ? (
                    <span className="text-xs font-bold text-blue-400 px-3 py-1 bg-blue-500/20 rounded-full">Connected</span>
                  ) : (
                    <button onClick={() => setConnectedWifi(net.ssid)} className="text-xs bg-white text-black px-4 py-1.5 rounded-md font-medium hover:bg-neutral-200 transition-colors">
                      Connect
                    </button>
                  )}
                </div>
              ))}
              {wifiNetworks.length === 0 && !scanning && (
                <div className="text-center py-8 text-white/40 text-sm">No networks found.</div>
              )}
            </div>
          </div>
        )}

        {/* Displays Tab */}
        {activeTab === 'displays' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h2 className="text-xl font-medium flex items-center gap-2"><Monitor className="w-6 h-6 text-emerald-400" /> Display Management</h2>
              <button 
                onClick={() => {
                  setDisplays(prev => [...prev, { id: Date.now().toString(), name: 'External HDMI Display', resolution: '1920x1080', primary: false }]);
                }}
                className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-md font-medium transition-colors"
              >
                Detect Displays
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displays.map((display) => (
                <div key={display.id} className={cn("p-6 rounded-2xl border transition-all", display.primary ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/5 border-white/10")}>
                  <div className="flex justify-center mb-4">
                    <Monitor className={cn("w-16 h-16", display.primary ? "text-emerald-400" : "text-white/40")} />
                  </div>
                  <div className="text-center space-y-1">
                    <div className="font-bold text-sm">{display.name}</div>
                    <div className="text-xs text-white/50">{display.resolution}</div>
                    {display.primary ? (
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-2">Primary</div>
                    ) : (
                      <button className="text-[10px] uppercase font-bold text-white/50 hover:text-white mt-2 border border-white/20 px-2 py-1 rounded">Make Primary</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phone Connect Tab */}
        {activeTab === 'phone' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h2 className="text-xl font-medium flex items-center gap-2"><Smartphone className="w-6 h-6 text-purple-400" /> Phone Connect</h2>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-2xl p-8 flex flex-col items-center text-center">
              <div className="relative mb-6">
                <Smartphone className="w-20 h-20 text-purple-300" />
                {phoneStatus === 'connected' && <div className="absolute -top-2 -right-2 bg-green-500 w-5 h-5 rounded-full border-2 border-black flex items-center justify-center"><Check className="w-3 h-3 text-black" /></div>}
                {phoneStatus === 'pairing' && <div className="absolute -bottom-2 -right-2 bg-blue-500 p-1.5 rounded-full border-2 border-black animate-pulse"><Bluetooth className="w-3 h-3 text-white" /></div>}
              </div>
              
              <h3 className="text-lg font-bold mb-2">
                {phoneStatus === 'disconnected' ? 'Link Your Smartphone' : phoneStatus === 'pairing' ? 'Pairing via Bluetooth...' : 'iPhone 15 Pro Connected'}
              </h3>
              <p className="text-sm text-white/60 max-w-md mb-8">
                {phoneStatus === 'disconnected' 
                  ? 'Connect your phone via Bluetooth or USB to receive SMS, sync clipboards, and mirror files directly to the OS.' 
                  : phoneStatus === 'pairing' 
                  ? 'Please confirm the pairing code 123456 on your mobile device.' 
                  : 'Your phone is fully synced. Notifications and clipboard are active.'}
              </p>
              
              {phoneStatus === 'disconnected' && (
                <button 
                  onClick={() => {
                    setPhoneStatus('pairing');
                    setTimeout(() => setPhoneStatus('connected'), 3000);
                  }}
                  className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-colors shadow-lg shadow-purple-500/20"
                >
                  <Link2 className="w-4 h-4" /> Start Pairing
                </button>
              )}
              {phoneStatus === 'connected' && (
                <button 
                  onClick={() => setPhoneStatus('disconnected')}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-colors border border-white/10"
                >
                  <Unlink className="w-4 h-4" /> Disconnect
                </button>
              )}
            </div>
          </div>
        )}

        {/* Keyboard Layout Tab */}
        {activeTab === 'keyboard' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h2 className="text-xl font-medium flex items-center gap-2"><Keyboard className="w-6 h-6 text-rose-400" /> Keyboard Layout Management</h2>
            </div>
            
            <div className="space-y-4">
               <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                 <div>
                   <div className="font-bold text-sm">System Input Layout</div>
                   <div className="text-xs text-white/50">Overrides the host operating system keyboard layout mapping.</div>
                 </div>
                 <select 
                   value={keyboardLayout}
                   onChange={(e) => setKeyboardLayout(e.target.value)}
                   className="bg-black border border-white/20 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-rose-400 transition-colors"
                 >
                   <option value="us">English (US, QWERTY)</option>
                   <option value="uk">English (UK)</option>
                   <option value="dvorak">English (Dvorak)</option>
                   <option value="colemak">English (Colemak)</option>
                   <option value="fr">French (AZERTY)</option>
                   <option value="de">German (QWERTZ)</option>
                 </select>
               </div>
               
               <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3">
                 <div className="p-2 bg-rose-500/20 rounded-lg shrink-0"><Keyboard className="w-5 h-5 text-rose-400" /></div>
                 <div>
                   <div className="font-bold text-sm text-rose-200">Hardware Interception Required</div>
                   <div className="text-xs text-rose-200/70 mt-1">
                     Changing the keyboard layout here requires the Tauri Desktop environment to intercept low-level keystrokes. In the Web PWA, the browser relies on your host OS settings.
                   </div>
                 </div>
               </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
