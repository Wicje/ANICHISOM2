import React, { useState } from 'react';
import { useOS, OSWindow } from '@/lib/os-context';
import { Image as ImageIcon, Palette, Save, Type, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export function SettingsApp({ window }: { window: OSWindow }) {
  const { wallpaper, setWallpaper, themeColor, setThemeColor, fontFamily, setFontFamily, screenShader, setScreenShader } = useOS();
  const [customUrl, setCustomUrl] = useState('');

  const handleApplyCustom = () => {
    if (customUrl) {
      setWallpaper(customUrl);
      setCustomUrl('');
    }
  };

  return (
    <div className="flex w-full h-full bg-neutral-950 text-white font-sans">
      {/* Sidebar */}
      <div className="w-48 border-r border-white/10 p-4 flex flex-col gap-2">
        <div className="text-xs font-bold text-white/50 tracking-wider uppercase mb-2">Settings</div>
        <button className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-md text-sm font-medium transition-colors">
          <ImageIcon className="w-4 h-4" />
          Appearance
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-10">
          
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
                    "group relative aspect-video rounded-xl overflow-hidden border-2 transition-all",
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
                      "w-12 h-12 rounded-full border-2 transition-transform",
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
                <div className="relative w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden cursor-pointer hover:scale-105 transition-transform flex items-center justify-center bg-gradient-to-br from-red-500 via-green-500 to-blue-500">
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

          {/* Shaders & Effects Section */}
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
      </div>
    </div>
  );
}
