import React, { useState } from 'react';
import { useFileStore } from '@/lib/stores/file.store';
import { useOS, OSWindow } from '@/lib/os-context';
import { Image as ImageIcon, Palette, Save, Type, Eye, Settings2, Monitor, User, Volume2, VolumeX, Shield, Keyboard, CloudRain, Coffee, Trees, Radio, Download, Upload, HardDrive, Trash2, Github, Sparkles, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { usePrivacyStore } from '@/lib/stores/privacy.store';
import { audioSystem } from '@/lib/services/audio-engine';
import { ContextPrivacySection } from '@/components/apps/context-privacy-settings';
import { ambientSounds, type AmbientPreset } from '@/lib/services/ambient-sounds';
import { githubDeviceFlow, DeviceCodeResponse, GitHubProfile } from '@/lib/services/github-device-flow.service';
import { GoogleSSOService, GoogleUser } from '@/lib/services/google-sso.service';
import { AVATAR_STYLES, AvatarStyle, avatarDataUrl } from '@/lib/avatar-engine';

const PRESET_WALLPAPERS = [
  { name: 'Tahoe Mesh', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop' },
  { name: 'Neon Cyberpunk', url: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=2564&auto=format&fit=crop' },
  { name: 'Abstract Liquid', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2564&auto=format&fit=crop' },
  { name: 'Deep Space Nebula', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2000&auto=format&fit=crop' },
  { name: 'Sunset Aura', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2564&auto=format&fit=crop' },
  { name: 'Dark Topography', url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=2564&auto=format&fit=crop' },
  { name: 'Glass Dunes', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2564&auto=format&fit=crop' },
  { name: 'Minimalist Gradient', url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=2564&auto=format&fit=crop' },
  { name: 'Aesthetic Vaporwave', url: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=2564&auto=format&fit=crop' },
  { name: 'Midnight Mountains', url: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=2564&auto=format&fit=crop' },
  { name: 'Serene Pastel Sky', url: 'https://images.unsplash.com/photo-1505909182942-e2f09aee3e89?q=80&w=2564&auto=format&fit=crop' },
  { name: 'Geometric Elegance', url: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?q=80&w=2564&auto=format&fit=crop' }
];

const PRESET_THEMES = [
  { name: 'Neon Blue', color: '#00f0ff' },
  { name: 'Brand Green', color: '#10F4A0' },
  { name: 'Acid Green', color: '#ccff00' },
  { name: 'Cyber Red', color: '#ff003c' },
  { name: 'Clean White', color: '#ffffff' }
];

const PRESET_FONTS = [
  { name: 'Outfit (Modern)', value: '"Outfit", sans-serif' },
  { name: 'Plus Jakarta (Clean)', value: '"Plus Jakarta Sans", sans-serif' },
  { name: 'Inter (Standard)', value: '"Inter", sans-serif' },
  { name: 'Space Mono (Dev)', value: '"Space Mono", monospace' },
  { name: 'Fira Code (Code)', value: '"Fira Code", monospace' },
  { name: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
  { name: 'Playfair (Serif)', value: '"Playfair Display", serif' },
  { name: 'Roboto (Classic)', value: '"Roboto", sans-serif' },
  { name: 'Poppins (Geometric)', value: '"Poppins", sans-serif' },
  { name: 'Merriweather (Elegant)', value: '"Merriweather", serif' },
  { name: 'System Default', value: 'system-ui, sans-serif' },
];

const PRESET_SHADERS = [
  { name: 'None', value: 'none' },
  { name: 'CRT Scanlines', value: 'crt' },
  { name: 'Night Shift (Warm)', value: 'warm' },
  { name: 'High Contrast', value: 'contrast' },
  { name: 'Matrix Green', value: 'matrix' },
];

export function SettingsApp({ window: osWindow }: { window: OSWindow }) {
  const { wallpaper, setWallpaper, themeColor, setThemeColor, fontFamily, setFontFamily, screenShader, setScreenShader, currentUser, setCurrentUser } = useOS();
  const setAuthUser = useAuthStore((s) => s.setCurrentUser);
  const systemPermissions = usePrivacyStore((s) => s.systemPermissions);
  const setPermission = usePrivacyStore((s) => s.setPermission);
  const [customUrl, setCustomUrl] = useState('');
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('gradient');
  const [avatarShuffle, setAvatarShuffle] = useState(0);
  const [activeTab, setActiveTab] = useState<'appearance' | 'system' | 'account' | 'privacy'>('appearance');
  const [contextExporting, setContextExporting] = useState(false);
  const [contextImporting, setContextImporting] = useState(false);
  const connectedSources = useFileStore(s => s.connectedSources);
  const [contextMessage, setContextMessage] = useState('');

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
  const ambientSound = useThemeStore((s) => s.ambientSound);

  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number }>({ usage: 0, quota: 1024 * 1024 * 1024 * 10 });
  const [cleaningCache, setCleaningCache] = useState(false);
  const [deviceCodeData, setDeviceCodeData] = useState<DeviceCodeResponse | null>(null);
  const [isAuthorizingGithub, setIsAuthorizingGithub] = useState(false);
  const [githubProfile, setGithubProfile] = useState<GitHubProfile | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleProfile, setGoogleProfile] = useState<GoogleUser | null>(null);

  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');

  React.useEffect(() => {
    try {
      const gh = localStorage.getItem('continuaos_github_profile');
      if (gh) setGithubProfile(JSON.parse(gh));
      const gUser = localStorage.getItem('continuaos_google_user');
      if (gUser) setGoogleProfile(JSON.parse(gUser));
      setGeminiKey(localStorage.getItem('continuaos_ai_gemini_key') || '');
      setOpenaiKey(localStorage.getItem('continuaos_ai_openai_key') || '');
      setClaudeKey(localStorage.getItem('continuaos_ai_claude_key') || '');
    } catch {}
  }, []);

  const handleStartGithubDeviceFlow = async () => {
    try {
      setIsAuthorizingGithub(true);
      audioSystem.playClick();
      const codeRes = await githubDeviceFlow.requestDeviceCode();
      setDeviceCodeData(codeRes);
      
      // Open verification URI in a new tab
      if (typeof window !== 'undefined') {
        window.open(codeRes.verification_uri, '_blank');
      }

      githubDeviceFlow.pollForToken(
        codeRes.device_code,
        codeRes.interval,
        (profile) => {
          setGithubProfile(profile);
          setIsAuthorizingGithub(false);
          setDeviceCodeData(null);
          audioSystem.playClick();
          if (currentUser) {
            const updated = { ...currentUser, name: profile.name || profile.login, avatarUrl: profile.avatar_url };
            setCurrentUser(updated);
            setAuthUser(updated);
          }
          window.dispatchEvent(new CustomEvent('os:notify', {
            detail: { title: 'GitHub Connected', description: `Authenticated as @${profile.login}`, type: 'success' }
          }));
        },
        (err) => {
          setIsAuthorizingGithub(false);
          setDeviceCodeData(null);
          window.dispatchEvent(new CustomEvent('os:notify', {
            detail: { title: 'GitHub Auth Failed', description: err, type: 'error' }
          }));
        }
      );
    } catch (e: any) {
      setIsAuthorizingGithub(false);
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'Auth Error', description: e.message, type: 'error' }
      }));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      audioSystem.playClick();
      const gUser = await GoogleSSOService.signInWithGoogleOneTap();
      setGoogleProfile(gUser);
      setIsGoogleLoading(false);
      if (currentUser) {
        const updated = { ...currentUser, name: gUser.name, avatarUrl: gUser.picture };
        setCurrentUser(updated);
        setAuthUser(updated);
      }
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'Google Connected', description: `Signed in as ${gUser.email}`, type: 'success' }
      }));
    } catch (e: any) {
      setIsGoogleLoading(false);
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'Google Sign-In Error', description: e.message, type: 'error' }
      }));
    }
  };

  React.useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        setStorageInfo({
          usage: est.usage || 0,
          quota: est.quota || (1024 * 1024 * 1024 * 10),
        });
      });
    }
  }, []);

  const handleCleanCache = async () => {
    setCleaningCache(true);
    try {
      if (typeof window !== 'undefined' && window.caches) {
        const keys = await caches.keys();
        for (const k of keys) await caches.delete(k);
      }
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        setStorageInfo(prev => ({ ...prev, usage: est.usage || 0 }));
      }
      audioSystem.playClick();
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'Storage Cleaned', description: 'Temporary app caches purged successfully.', type: 'success' }
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setCleaningCache(false);
    }
  };

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

  const handleExportContext = async () => {
    setContextExporting(true);
    setContextMessage('');
    try {
      const res = await fetch('/api/context/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Sanitize export filename against directory traversal (Issue 64)
      const safeDate = (new Date().toISOString().split('T')[0] || 'export').replace(/[^a-zA-Z0-9-]/g, '');
      a.download = `continuaos-context-${safeDate}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setContextMessage('Context exported successfully');
    } catch (err) {
      setContextMessage('Export failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setContextExporting(false);
    }
  };

  const handleImportContext = async () => {
    setContextImporting(true);
    setContextMessage('');
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) { setContextImporting(false); return; }
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed.continuaos_context) {
          setContextMessage('Invalid context file');
          setContextImporting(false);
          return;
        }
        const res = await fetch('/api/context/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context: parsed.context, mode: 'merge' }),
        });
        const result = await res.json();
        if (result.ok) {
          setContextMessage(`Imported ${result.imported} domains${result.errors > 0 ? ` (${result.errors} errors)` : ''}`);
        } else {
          setContextMessage('Import failed: ' + result.error);
        }
        setContextImporting(false);
      };
      input.click();
    } catch (err) {
      setContextMessage('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setContextImporting(false);
    }
  };

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: ImageIcon },
    { id: 'system', label: 'System & Display', icon: Monitor },
    { id: 'account', label: 'Account & Sync', icon: User },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  ] as const;

  const [sidebarMouse, setSidebarMouse] = useState<{ x: number; y: number } | null>(null);

  return (
    <div className="flex w-full h-full bg-[#05070d]/65 backdrop-blur-3xl border border-white/15 text-white font-sans overflow-hidden select-none">
      {/* Sidebar */}
      <div 
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setSidebarMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onMouseLeave={() => setSidebarMouse(null)}
        className="w-56 border-r border-white/10 p-5 flex flex-col gap-2 shrink-0 bg-white/[0.02] relative"
      >
        <div className="text-[10px] font-bold text-[#10F4A0] tracking-widest uppercase mb-3 px-2">Settings</div>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                audioSystem.playClick();
              }}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 relative group overflow-hidden border",
                isActive 
                  ? "bg-gradient-to-r from-[#10F4A0]/20 to-cyan-500/20 text-[#10F4A0] border-[#10F4A0]/40 shadow-lg shadow-[#10F4A0]/10" 
                  : "border-transparent text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              {sidebarMouse && !isActive && (
                <div 
                  className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(120px circle at ${sidebarMouse.x}px ${sidebarMouse.y}px, rgba(16,244,160,0.18), transparent 80%)`
                  }}
                />
              )}
              <Icon className="w-4 h-4 text-[#10F4A0]" />
              <span className="relative z-10">{tab.label}</span>
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
                      <img loading="lazy" src={wp.url} alt={wp.name} className="w-full h-full object-cover" />
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

                {/* System Sound Profile Selector */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span>System Sound Profile</span>
                    <span className="text-[#10F4A0] capitalize">{audioSystem.getSoundProfile()}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {([
                      { id: 'mechanical' as const, label: 'Mechanical', desc: 'Tactile Thock' },
                      { id: 'glass' as const, label: 'Glass Tap', desc: 'Sleek Acoustic' },
                      { id: 'arcade' as const, label: '8-Bit Arcade', desc: 'Retro Blip' },
                      { id: 'minimal' as const, label: 'Minimal', desc: 'Soft Haptic' },
                    ]).map((item) => {
                      const isActive = audioSystem.getSoundProfile() === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            audioSystem.setSoundProfile(item.id);
                            audioSystem.playClick();
                          }}
                          className={cn(
                            "flex flex-col items-start gap-1 p-3 rounded-lg text-left transition-all border",
                            isActive 
                              ? "bg-[#10F4A0]/20 border-[#10F4A0]/50 text-[#10F4A0] shadow-sm shadow-[#10F4A0]/20" 
                              : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          <div className="text-xs font-semibold">{item.label}</div>
                          <div className="text-[10px] text-white/40">{item.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span>Ambient Sounds</span>
                    <span className="text-blue-400 capitalize">{useThemeStore.getState().ambientSound === 'off' ? 'Off' : useThemeStore.getState().ambientSound}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {([
                      { preset: 'off' as AmbientPreset, icon: VolumeX, label: 'Off' },
                      { preset: 'rain' as AmbientPreset, icon: CloudRain, label: 'Rain' },
                      { preset: 'cafe' as AmbientPreset, icon: Coffee, label: 'Cafe' },
                      { preset: 'forest' as AmbientPreset, icon: Trees, label: 'Forest' },
                    ]).map((item) => {
                      const isActive = ambientSound === item.preset;
                      return (
                        <button
                          key={item.preset}
                          onClick={() => {
                            useThemeStore.getState().setAmbientSound(item.preset);
                            if (item.preset === 'off') ambientSounds.stop();
                            else ambientSounds.play(item.preset);
                          }}
                          className={cn(
                            "flex flex-col items-center gap-1.5 py-3 rounded-lg text-xs font-medium transition-all",
                            isActive ? "bg-blue-500/20 border border-blue-500/50 text-blue-400" : "bg-white/5 border border-white/10 text-white/50 hover:text-white/70"
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-white/40">Subtle background ambience. Plays through your audio output.</p>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <HardDrive className="w-5 h-5 text-white/70" />
                  <h2 className="text-lg font-medium">Storage & Quota</h2>
                </div>

                <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-4">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span>OPFS & Sovereign Storage</span>
                    <span className="text-[#10F4A0] font-mono font-bold">
                      {(storageInfo.usage / (1024 * 1024)).toFixed(1)} MB / {(storageInfo.quota / (1024 * 1024 * 1024)).toFixed(1)} GB
                    </span>
                  </div>

                  {/* Storage Progress Bar */}
                  <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-[#10F4A0] transition-all rounded-full"
                      style={{ width: `${Math.max(2, Math.min(100, (storageInfo.usage / storageInfo.quota) * 100))}%` }}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                    <p className="text-xs text-white/40">Includes local files, recordings, downloaded assets, and episodic dialogue cache.</p>
                    <button
                      onClick={handleCleanCache}
                      disabled={cleaningCache}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {cleaningCache ? 'Purging...' : 'Purge Temp Caches'}
                    </button>
                  </div>
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

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 bg-white/5 rounded-xl border border-white/10">
                  {currentUser?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentUser.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-[#10F4A0] shadow-lg shadow-[#10F4A0]/20 shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#10F4A0] to-cyan-500 flex items-center justify-center text-3xl font-black text-slate-950 shrink-0 shadow-lg shadow-[#10F4A0]/20">
                      {currentUser?.name?.charAt(0) || 'C'}
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <h3 className="text-xl font-bold">{currentUser?.name || 'Continua User'}</h3>
                    <p className="text-white/50 text-sm">Role: <span className="text-[#10F4A0] uppercase tracking-wider text-xs font-bold">{currentUser?.role || 'User'}</span></p>
                    <div className="flex gap-2 items-center pt-2">
                      <input 
                        type="text" 
                        placeholder="Paste custom avatar URL..." 
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        className="bg-black/40 border border-white/15 px-3 py-1.5 rounded-lg text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#10F4A0] flex-1 max-w-xs"
                      />
                      <button 
                        onClick={() => {
                          const trimmed = customUrl.trim();
                          if (trimmed && currentUser) {
                            const updated = { ...currentUser, avatarUrl: trimmed };
                            setCurrentUser(updated);
                            setAuthUser(updated);
                            audioSystem.playClick();
                            window.dispatchEvent(new CustomEvent('os:notify', { 
                              detail: { title: 'Avatar Updated', description: 'Your custom avatar URL has been applied.', type: 'success' } 
                            }));
                          }
                        }}
                        className="bg-[#10F4A0]/20 hover:bg-[#10F4A0]/30 text-[#10F4A0] border border-[#10F4A0]/40 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Apply Avatar URL
                      </button>
                    </div>
                  </div>
                </div>

                {/* Generated Avatars — Vercel-style gradients + Boring-style identicons */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider">Generated Avatars (Offline, Private)</h4>
                    <button
                      onClick={() => setAvatarShuffle((s) => s + 1)}
                      className="text-[11px] font-semibold text-[#10F4A0] hover:text-[#10F4A0]/80 transition-colors flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Shuffle
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {AVATAR_STYLES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setAvatarStyle(s.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                          avatarStyle === s.id
                            ? 'bg-[#10F4A0]/20 text-[#10F4A0] border border-[#10F4A0]/40'
                            : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-6 gap-3">
                    {Array.from({ length: 6 }, (_, i) => {
                      const seed = `${currentUser?.name || 'Continua'}#${i + avatarShuffle * 6}`;
                      const url = avatarDataUrl(avatarStyle, seed);
                      const selected = currentUser?.avatarUrl === url;
                      return (
                        <button
                          key={`${avatarStyle}-${seed}`}
                          onClick={() => {
                            if (!currentUser) return;
                            const updated = { ...currentUser, avatarUrl: url };
                            setCurrentUser(updated);
                            setAuthUser(updated);
                            audioSystem.playClick();
                            window.dispatchEvent(new CustomEvent('os:notify', {
                              detail: { title: 'Avatar Applied', description: `Generated ${avatarStyle} avatar applied — shown at login and across the OS.`, type: 'success' },
                            }));
                          }}
                          title={seed}
                          aria-label={`Apply generated ${avatarStyle} avatar variant ${i + 1}`}
                          className={cn(
                            'aspect-square rounded-full overflow-hidden transition-all',
                            selected ? 'ring-2 ring-[#10F4A0] shadow-md shadow-[#10F4A0]/30' : 'ring-1 ring-white/10 hover:ring-white/40'
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="w-full h-full" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3D & Vector Avatar Preset Library */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider">Select Avatar from Library (DiceBear & 3D)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {([
                      { name: '3D Glass Cyberbot', url: '/images/avatar_cyber.jpg' },
                      { name: 'Emerald Cyber Synth', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=continua1&backgroundColor=05070d' },
                      { name: '3D Adventurer', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=cyberpunk' },
                      { name: 'Neon Persona', url: 'https://api.dicebear.com/7.x/personas/svg?seed=neo' },
                      { name: 'Cosmic Lorelei', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=orbit' },
                      { name: 'Minimal Micah', url: 'https://api.dicebear.com/7.x/micah/svg?seed=continua' },
                      { name: 'Identicon Shield', url: 'https://api.dicebear.com/7.x/identicon/svg?seed=continuaos' },
                      { name: 'Emerald Obsidian 3D', url: '/images/hero_3d.jpg' },
                    ]).map((preset) => (
                      <button
                        key={preset.url}
                        onClick={() => {
                          if (currentUser) {
                            const updated = { ...currentUser, avatarUrl: preset.url };
                            setCurrentUser(updated);
                            setAuthUser(updated);
                            audioSystem.playClick();
                            window.dispatchEvent(new CustomEvent('os:notify', { 
                              detail: { title: 'Avatar Changed', description: `Selected ${preset.name}`, type: 'success' } 
                            }));
                          }
                        }}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-center",
                          currentUser?.avatarUrl === preset.url
                            ? "bg-[#10F4A0]/20 border-[#10F4A0] shadow-md shadow-[#10F4A0]/20"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preset.url} alt={preset.name} className="w-12 h-12 rounded-full object-cover border border-white/20 bg-slate-900" />
                        <span className="text-[11px] font-semibold text-white/80">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <Save className="w-5 h-5 text-white/70" />
                  <h2 className="text-lg font-medium">Cloud Integrations</h2>
                </div>

                <div className="space-y-3">
                  {/* GitHub Device Flow Card */}
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-neutral-900 border border-white/20 rounded flex items-center justify-center text-white">
                          <Github className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">GitHub (Device Flow RFC 8628)</h3>
                          {githubProfile ? (
                            <p className="text-xs text-emerald-400 mt-0.5 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Connected as @{githubProfile.login} ({githubProfile.public_repos} repos)
                            </p>
                          ) : (
                            <p className="text-xs text-white/40 mt-0.5">1-Click Code Confirmation (No OAuth app setup needed)</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={handleStartGithubDeviceFlow}
                        disabled={isAuthorizingGithub}
                        className="text-sm px-4 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors flex items-center gap-1.5"
                      >
                        {isAuthorizingGithub ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Authorizing...</>
                        ) : githubProfile ? (
                          'Reconnect'
                        ) : (
                          'Connect GitHub'
                        )}
                      </button>
                    </div>

                    {/* Active Device Code Display Banner */}
                    {deviceCodeData && (
                      <div className="p-3 rounded-xl bg-black/60 border border-cyan-500/40 flex flex-col gap-2 animate-in fade-in">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300">Enter this code on GitHub:</span>
                          <span className="font-mono font-black text-sm text-cyan-400 tracking-widest bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-400/40">
                            {deviceCodeData.user_code}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Waiting for your approval on GitHub...</span>
                          <a
                            href={deviceCodeData.verification_uri}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-400 underline flex items-center gap-1"
                          >
                            Open github.com/login/device <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Google SSO Card */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                        <img loading="lazy" src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">Google Account (Identity Services)</h3>
                        {googleProfile ? (
                          <p className="text-xs text-emerald-400 mt-0.5 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Signed in as {googleProfile.email}
                          </p>
                        ) : (
                          <p className="text-xs text-white/40 mt-0.5">1-Click Google Profile & Drive Sync</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleGoogleSignIn}
                      disabled={isGoogleLoading}
                      className="text-sm px-4 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors flex items-center gap-1.5"
                    >
                      {isGoogleLoading ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Signing in...</>
                      ) : googleProfile ? (
                        'Switch Account'
                      ) : (
                        'Sign in with Google'
                      )}
                    </button>
                  </div>

                  {/* Dropbox */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-xs text-white">
                        DB
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">Dropbox Sync</h3>
                        <p className="text-xs text-white/40 mt-0.5">
                          {useFileStore.getState().connectedSources.includes('dropbox') ? (
                            <span className="text-emerald-400 font-medium">● Connected & Synced</span>
                          ) : (
                            'Mount personal Dropbox storage via OAuth'
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const isConnected = useFileStore.getState().connectedSources.includes('dropbox');
                        if (isConnected) {
                          useFileStore.getState().disconnectSource('dropbox');
                          audioSystem.playClick();
                          window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Dropbox Disconnected', description: 'Dropbox storage unmounted', type: 'info' } }));
                          return;
                        }

                        const clientId = 'ur0xcvza9suo8q7';
                        const redirectUri = encodeURIComponent(`${window.location.origin}/api/storage/callback/dropbox`);
                        const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&token_access_type=offline`;
                        
                        const popup = window.open(authUrl, 'DropboxAuth', 'width=520,height=680,scrollbars=yes,status=no');
                        
                        const handleMessage = (event: MessageEvent) => {
                          if (event.data?.type === 'storage-oauth-callback' && event.data.provider === 'dropbox') {
                            window.removeEventListener('message', handleMessage);
                            useFileStore.getState().connectSource('dropbox');
                            audioSystem.playClick();
                            window.dispatchEvent(new CustomEvent('os:notify', {
                              detail: { title: 'Dropbox Connected', description: 'Dropbox storage mounted in Files app', type: 'success' }
                            }));
                          }
                        };
                        window.addEventListener('message', handleMessage);
                      }}
                      className="text-sm px-4 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors"
                    >
                      {useFileStore.getState().connectedSources.includes('dropbox') ? 'Disconnect' : 'Connect Dropbox'}
                    </button>
                  </div>

                  {/* OneDrive */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-sky-600 rounded flex items-center justify-center font-bold text-xs text-white">
                        OD
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">Microsoft OneDrive</h3>
                        <p className="text-xs text-white/40 mt-0.5">Mount personal OneDrive files</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        useFileStore.getState().connectSource('onedrive');
                        audioSystem.playClick();
                        window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'OneDrive Connected', description: 'OneDrive source enabled in Files app', type: 'success' } }));
                      }}
                      className="text-sm px-4 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors"
                    >
                      Connect OneDrive
                    </button>
                  </div>

                  {/* Local Host Directory Mount */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center font-bold text-xs text-white">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">Local Host Directory</h3>
                        <p className="text-xs text-white/40 mt-0.5">Mount folders from your computer disk directly into the OS</p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
                          try {
                            const handle = await (window as any).showDirectoryPicker();
                            useFileStore.getState().setLocalFolderName(handle.name);
                            useFileStore.getState().connectSource('local-folder');
                            audioSystem.playClick();
                            window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Directory Mounted', description: `Mounted "${handle.name}" to Files app`, type: 'success' } }));
                          } catch {}
                        } else {
                          useFileStore.getState().connectSource('local-folder');
                          window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Local Storage', description: 'Local VFS storage active', type: 'info' } }));
                        }
                      }}
                      className="text-sm px-4 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors"
                    >
                      Mount Folder
                    </button>
                  </div>
                </div>
              </section>

              {/* Personal AI Intelligence Keys (BYOK) */}
              <section className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h2 className="text-lg font-medium">Personal AI Intelligence (Bring Your Own Key)</h2>
                    <p className="text-xs text-white/40">Each user can use their personal AI accounts. Keys are stored locally in your browser and never shared.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Google Gemini */}
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Google Gemini API Key
                      </span>
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1">
                        Get free key at Google AI Studio <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="AIzaSy..."
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        className="flex-1 bg-black/40 border border-white/15 px-3 py-1.5 rounded-lg text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        onClick={() => {
                          localStorage.setItem('continuaos_ai_gemini_key', geminiKey.trim());
                          audioSystem.playClick();
                          window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Gemini Key Saved', description: 'Personal Gemini key active for your session', type: 'success' } }));
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  {/* OpenAI */}
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        OpenAI API Key (GPT-4o)
                      </span>
                      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1">
                        Get OpenAI key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="sk-..."
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        className="flex-1 bg-black/40 border border-white/15 px-3 py-1.5 rounded-lg text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        onClick={() => {
                          localStorage.setItem('continuaos_ai_openai_key', openaiKey.trim());
                          audioSystem.playClick();
                          window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'OpenAI Key Saved', description: 'Personal OpenAI key active for your session', type: 'success' } }));
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  {/* Anthropic Claude */}
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        Anthropic Claude API Key
                      </span>
                      <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1">
                        Get Claude key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="sk-ant-..."
                        value={claudeKey}
                        onChange={(e) => setClaudeKey(e.target.value)}
                        className="flex-1 bg-black/40 border border-white/15 px-3 py-1.5 rounded-lg text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        onClick={() => {
                          localStorage.setItem('continuaos_ai_claude_key', claudeKey.trim());
                          audioSystem.playClick();
                          window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Claude Key Saved', description: 'Personal Claude key active for your session', type: 'success' } }));
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <Save className="w-5 h-5 text-white/70" />
                  <h2 className="text-lg font-medium">Context Sync</h2>
                </div>

                <p className="text-xs text-white/40">
                  Export your workspace context (windows, theme, app state) to a JSON file, or import a previously exported context.
                </p>

                {contextMessage && (
                  <div className={cn(
                    "text-xs p-3 rounded-lg border",
                    contextMessage.includes('success') || contextMessage.includes('Imported')
                      ? "bg-green-500/10 border-green-500/30 text-green-400"
                      : "bg-red-500/10 border-red-500/30 text-red-400"
                  )}>
                    {contextMessage}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleExportContext}
                    disabled={contextExporting}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {contextExporting ? 'Exporting...' : 'Export Context'}
                  </button>

                  <button
                    onClick={handleImportContext}
                    disabled={contextImporting}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {contextImporting ? 'Importing...' : 'Import Context'}
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ContextPrivacySection />

              <section className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <Shield className="w-5 h-5 text-white/70" />
                  <h2 className="text-lg font-medium">App Permissions</h2>
                </div>

                <div className="space-y-3">
                  {['Microphone', 'Camera', 'Clipboard', 'File System', 'Location', 'Network'].map(perm => (
                    <div key={perm} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                      <div>
                        <h3 className="font-medium text-sm">{perm} Access</h3>
                        <p className="text-xs text-white/50 mt-1">Configure OS security policy for {perm.toLowerCase()}</p>
                      </div>
                      <select 
                        value={systemPermissions[perm] || 'ask'}
                        onChange={(e) => {
                          const val = e.target.value as 'ask' | 'allow' | 'deny';
                          setPermission(perm, val);
                          audioSystem.playClick();
                          window.dispatchEvent(new CustomEvent('os:notify', { 
                            detail: { title: 'Permission Updated', description: `${perm} set to ${val.toUpperCase()}`, type: 'success' } 
                          }));
                        }}
                        className="bg-[#05070d] border border-white/20 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-[#10F4A0]"
                      >
                        <option value="ask">Ask First</option>
                        <option value="allow">Allow All</option>
                        <option value="deny">Deny Access</option>
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
