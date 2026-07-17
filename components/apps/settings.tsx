import React, { useState } from 'react';
import { useOS, OSWindow } from '@/lib/os-context';
import { Image as ImageIcon, Palette, Save, Type, Eye, Settings2, Monitor, User, Volume2, VolumeX, Shield, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/lib/stores/theme.store';
import { audioSystem } from '@/lib/services/audio-engine';

const PRESET_WALLPAPERS = [
  { name: 'Default Dark', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop' },
  { name: 'Neon City', url: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=2564&auto=format&fit=crop' },
  { name: 'Abstract Liquid', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2564&auto=format&fit=crop' },
  { name: 'Deep Space', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2000&auto=format&fit=crop' },
  { name: 'Minimalist Gradient', url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=2564&auto=format&fit=crop' }
];

const PRESET_THEMES = [
  { name: 'Neon Blue', color: '#00f0ff' },
  { name: 'Electric Purple', color: '#8a2be2' },
  { name: 'Acid Green', color: '#ccff00' },
  { name: 'Cyber Red', color: '#ff003c' },
  { name: 'Clean White', color: '#ffffff' }
];

const PRESET_FONTS = [
  { name: 'System Default', value: 'system-ui, sans-serif' },
  { name: 'Inter (Modern)', value: '"Inter", sans-serif' },
  { name: 'Space Mono (Dev)', value: '"Space Mono", monospace' },
  { name: 'Playfair (Serif)', value: '"Playfair Display", serif' },
];

const PRESET_SHADERS = [
  { name: 'None', value: 'none' },
  { name: 'CRT Scanlines', value: 'crt' },
  { name: 'Night Shift (Warm)', value: 'warm' },
  { name: 'High Contrast', value: 'contrast' },
  { name: 'Matrix Green', value: 'matrix' },
];

export function SettingsApp({ window: osWindow }: { window: OSWindow }) {
  const { wallpaper, setWallpaper, themeColor, setThemeColor, fontFamily, setFontFamily, screenShader, setScreenShader, currentUser } = useOS();
  const [customUrl, setCustomUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'appearance' | 'system' | 'account' | 'privacy'>('appearance');

  const animationsEnabled = useThemeStore((s) => s.animationsEnabled);
  const setAnimationsEnabled = useThemeStore((s) => s.setAnimationsEnabled);
  const glassmorphism = useThemeStore((s) => s.glassmorphism);
  const setGlassmorphism = useThemeStore((s) => s.setGlassmorphism);
  const aeroSnap = useThemeStore((s) => s.aeroSnap);
  const setAeroSnap = useThemeStore((s) => s.setAeroSnap);
  const volume = useThemeStore((s) => s.volume);
  const setVolume = useThemeStore((s) => s.setVolume);
  const muted = useThemeStore((s) => s.muted);
  const setMuted = useThemeStore((s) => s.setMuted);

  const handleApplyCustom = () => {
    if (customUrl) {
      setWallpaper(customUrl);
      setCustomUrl('');
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (newVol > 0 && muted) setMuted(false);
    audioSystem.init();
    audioSystem.playClick();
  };

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: ImageIcon },
    { id: 'system', label: 'System & Display', icon: Monitor },
    { id: 'account', label: 'Account & Sync', icon: User },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  ] as const;

  return (
    <div className="flex w-full h-full bg-neutral-950 text-white font-sans">
      {/* Sidebar */}
      <div className="w-56 border-r border-white/10 p-4 flex flex-col gap-2 shrink-0">
        <div className="text-xs font-bold text-white/50 tracking-wider uppercase mb-2 px-2">Settings</div>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-12">
          
          {activeTab === 'appearance' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Wallpaper Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <ImageIcon className="w-5 h-5 text-white/70" />
                  <h2 className="text-lg font-medium">Desktop Wallpaper</h2>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {PRESET_WALLPAPERS.map((wp) => (
                    <button
                      key={wp.url}
                      onClick={() => setWallpaper(wp.url)}
                      className={cn(
                        "group relative aspect-video rounded-xl overflow-hidden border-2 transition-all duration-300",
                        wallpaper === wp.url ? "border-blue-500 scale-105 shadow-lg shadow-blue-500/20" : "border-white/10 hover:border-white/30"
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={wp.url} alt={wp.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                        <span className="text-xs font-medium">{wp.name}</span>
                      </div>
                      {wallpaper === wp.url && (
                        <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,1)]" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  <input 
                    type="text" 
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="Or paste a custom image URL..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  />
                  <button 
                    onClick={handleApplyCustom}
                    disabled={!customUrl}
                    className="px-4 py-2 bg-white text-black font-medium text-sm rounded-lg hover:bg-neutral-200 disabled:opacity-50 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </section>

              {/* Theme Color Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <Palette className="w-5 h-5 text-white/70" />
                  <h2 className="text-lg font-medium">Accent Color</h2>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  {PRESET_THEMES.map((theme) => (
                    <button
                      key={theme.color}
                      onClick={() => setThemeColor(theme.color)}
                      className={cn(
                        "flex flex-col items-center gap-2 group outline-none"
                      )}
                    >
                      <div 
                        className={cn(
                          "w-12 h-12 rounded-full border-2 transition-transform duration-300",
                          themeColor === theme.color ? "border-white scale-110 shadow-lg" : "border-white/20 group-hover:scale-105"
                        )}
                        style={{ backgroundColor: theme.color, boxShadow: themeColor === theme.color ? `0 0 15px ${theme.color}80` : undefined }}
                      />
                      <span className={cn(
                        "text-xs font-medium transition-colors",
                        themeColor === theme.color ? "text-white" : "text-white/50 group-hover:text-white/80"
                      )}>
                        {theme.name}
                      </span>
                    </button>
                  ))}
                  
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-300 flex items-center justify-center bg-gradient-to-br from-red-500 via-green-500 to-blue-500">
                      <input 
                        type="color" 
                        value={themeColor}
                        onChange={(e) => setThemeColor(e.target.value)}
                        className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer opacity-0"
                      />
                    </div>
                    <span className="text-xs font-medium text-white/50">Custom</span>
                  </div>
                </div>
              </section>

              {/* Typography Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <Type className="w-5 h-5 text-white/70" />
                  <h2 className="text-lg font-medium">Typography</h2>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {PRESET_FONTS.map((font) => (
                    <button
                      key={font.value}
                      onClick={() => setFontFamily(font.value)}
                      className={cn(
                        "px-4 py-3 rounded-lg border text-left transition-colors",
                        fontFamily === font.value ? "border-blue-500 bg-blue-500/10 text-white" : "border-white/10 hover:bg-white/5 text-white/70"
                      )}
                      style={{ fontFamily: font.value }}
                    >
                      <div className="text-sm font-medium">{font.name}</div>
                      <div className="text-xs opacity-50 mt-1">The quick brown fox jumps over the lazy dog</div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Shaders Section */}
              <section className="space-y-4 pb-12">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <Eye className="w-5 h-5 text-white/70" />
                  <h2 className="text-lg font-medium">Screen Shaders & Filters</h2>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PRESET_SHADERS.map((shader) => (
                    <button
                      key={shader.value}
                      onClick={() => setScreenShader(shader.value)}
                      className={cn(
                        "px-4 py-3 rounded-lg border transition-colors flex items-center justify-center text-sm font-medium",
                        screenShader === shader.value ? "border-blue-500 bg-blue-500/10 text-white" : "border-white/10 hover:bg-white/5 text-white/70"
                      )}
                    >
                      {shader.name}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <Settings2 className="w-5 h-5 text-white/70" />
                  <h2 className="text-lg font-medium">Window Management</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div>
                      <h3 className="font-medium text-sm">Window Animations (Genie Effect)</h3>
                      <p className="text-xs text-white/50 mt-1">Smooth transitions for opening, closing, and minimizing windows.</p>
                    </div>
                    <button 
                      onClick={() => setAnimationsEnabled(!animationsEnabled)}
                      className={cn("w-12 h-6 rounded-full transition-colors relative", animationsEnabled ? "bg-blue-500" : "bg-white/20")}
                    >
                      <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-transform", animationsEnabled ? "translate-x-7" : "translate-x-1")} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div>
                      <h3 className="font-medium text-sm">Aero Snap</h3>
                      <p className="text-xs text-white/50 mt-1">Drag windows to the screen edges to quickly split view.</p>
                    </div>
                    <button 
                      onClick={() => setAeroSnap(!aeroSnap)}
                      className={cn("w-12 h-6 rounded-full transition-colors relative", aeroSnap ? "bg-blue-500" : "bg-white/20")}
                    >
                      <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-transform", aeroSnap ? "translate-x-7" : "translate-x-1")} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div>
                      <h3 className="font-medium text-sm">Glassmorphism UI</h3>
                      <p className="text-xs text-white/50 mt-1">Enable acrylic blur effects on supported windows. May impact performance.</p>
                    </div>
                    <button 
                      onClick={() => setGlassmorphism(!glassmorphism)}
                      className={cn("w-12 h-6 rounded-full transition-colors relative", glassmorphism ? "bg-blue-500" : "bg-white/20")}
                    >
                      <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-transform", glassmorphism ? "translate-x-7" : "translate-x-1")} />
                    </button>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <Volume2 className="w-5 h-5 text-white/70" />
                  <h2 className="text-lg font-medium">Audio</h2>
                </div>
                
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-4">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span>System Volume</span>
                    <span className="text-blue-400">{muted ? 'Muted' : `${volume}%`}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setMuted(!muted);
                        if (!muted) {
                          audioSystem.playClick();
                        }
                      }}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {muted ? <VolumeX className="w-5 h-5 text-white/50" /> : <Volume2 className="w-5 h-5 text-white/70" />}
                    </button>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={muted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      className="flex-1 accent-blue-500"
                    />
                  </div>
                  <p className="text-xs text-white/40">Controls clicks, swooshes, notifications, and startup sounds.</p>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <User className="w-5 h-5 text-white/70" />
                  <h2 className="text-lg font-medium">Account Profile</h2>
                </div>

                <div className="flex items-center gap-6 p-6 bg-white/5 rounded-xl border border-white/10">
                  <div className="w-20 h-20 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center text-3xl font-bold text-blue-400">
                    {currentUser?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{currentUser?.name || 'Guest User'}</h3>
                    <p className="text-white/50 text-sm mt-1">Role: <span className="text-blue-400 uppercase tracking-wider text-xs font-bold">{currentUser?.role || 'User'}</span></p>
                    <p className="text-white/50 text-sm mt-1">Workspace ID: {currentUser?.id}</p>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <Save className="w-5 h-5 text-white/70" />
                  <h2 className="text-lg font-medium">Cloud Integrations</h2>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/d/da/Google_Drive_logo.png" alt="Google Drive" className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">Google Drive</h3>
                        <p className="text-xs text-green-400 mt-1">Connected</p>
                      </div>
                    </div>
                    <button className="text-sm px-4 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors">Manage</button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#0061ff] rounded flex items-center justify-center text-white font-bold font-serif italic text-lg">
                        db
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">Dropbox</h3>
                        <p className="text-xs text-white/40 mt-1">Not Connected</p>
                      </div>
                    </div>
                    <button className="text-sm px-4 py-1.5 rounded-lg border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 transition-colors">Connect</button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <Shield className="w-5 h-5 text-white/70" />
                  <h2 className="text-lg font-medium">App Permissions</h2>
                </div>

                <div className="space-y-3">
                  {['Microphone', 'Camera', 'Clipboard', 'File System'].map(perm => (
                    <div key={perm} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                      <div>
                        <h3 className="font-medium text-sm">{perm} Access</h3>
                        <p className="text-xs text-white/50 mt-1">Allow apps to use your {perm.toLowerCase()}</p>
                      </div>
                      <select className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500">
                        <option value="ask">Ask First</option>
                        <option value="allow">Allow All</option>
                        <option value="deny">Deny</option>
                      </select>
                    </div>
                  ))}
                </div>
              </section>
              
              <section className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <Keyboard className="w-5 h-5 text-white/70" />
                  <h2 className="text-lg font-medium">Global Shortcuts</h2>
                </div>
                
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-4">
                  {[
                    { action: "Open Spotlight / Command Palette", keys: ["⌘", "K"] },
                    { action: "Lock Workstation", keys: ["⌘", "L"] },
                    { action: "Switch Workspace", keys: ["Ctrl", "Tab"] },
                    { action: "Toggle Widgets", keys: ["⌘", "W"] },
                  ].map(sc => (
                    <div key={sc.action} className="flex justify-between items-center border-b border-white/5 pb-3 last:border-0 last:pb-0">
                      <span className="text-sm text-white/70">{sc.action}</span>
                      <div className="flex gap-2">
                        {sc.keys.map(k => (
                          <kbd key={k} className="px-2 py-1 bg-white/10 rounded-md text-xs font-mono border border-white/20 shadow-sm">{k}</kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
