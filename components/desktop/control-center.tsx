'use client';

import React from 'react';
import { useWindowStore } from '@/lib/stores/window.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useNotificationStore } from '@/lib/stores/notification.store';
import { useSyncStore } from '@/lib/stores/sync.store';
import { Cloud, ShieldCheck, Sun, Moon, Trash2, CloudRain, Wind, Droplets, Zap, Brain } from 'lucide-react';

function WeatherWidget() {
  const [weather, setWeather] = React.useState<any>(null);

  React.useEffect(() => {
    // Attempt to get location, otherwise default to London for demo
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,is_day,precipitation,wind_speed_10m&timezone=auto`);
        const data = await res.json();
        setWeather(data.current);
      } catch (err) {
        console.error('Failed to fetch weather', err);
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(51.5085, -0.1257) // Default London
      );
    } else {
      fetchWeather(51.5085, -0.1257);
    }
  }, []);

  if (!weather) return (
    <div className="w-full h-24 rounded-xl flex items-center justify-center animate-pulse mb-3" style={{ background: 'var(--os-hover)' }}>
      <span className="text-xs" style={{ color: 'var(--os-text-muted)' }}>Loading local weather...</span>
    </div>
  );

  return (
    <div className="w-full p-4 rounded-xl mb-3 flex flex-col gap-3 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)', color: '#fff' }}>
       {/* Decorative */}
       <div className="absolute top-[-20px] right-[-20px] opacity-20">
         {weather.precipitation > 0 ? <CloudRain className="w-32 h-32" /> : (weather.is_day ? <Sun className="w-32 h-32" /> : <Moon className="w-32 h-32" />)}
       </div>
       <div className="flex items-center justify-between z-10">
         <span className="text-sm font-semibold tracking-wide">Current Weather</span>
         <div className="flex items-center gap-1 opacity-80 text-[10px] uppercase font-bold">
           Live <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
         </div>
       </div>
       <div className="flex items-end gap-2 z-10">
         <span className="text-4xl font-black tabular-nums">{Math.round(weather.temperature_2m)}°</span>
         <span className="text-xs opacity-80 pb-1 uppercase tracking-wider">{weather.is_day ? 'Daytime' : 'Night'}</span>
       </div>
       <div className="flex gap-4 text-xs font-medium opacity-90 z-10">
         <div className="flex items-center gap-1"><Droplets className="w-3.5 h-3.5" /> {weather.relative_humidity_2m}% Humidity</div>
         <div className="flex items-center gap-1"><Wind className="w-3.5 h-3.5" /> {weather.wind_speed_10m} km/h</div>
       </div>
    </div>
  );
}

interface ControlCenterProps {
  onClose: () => void;
}

export function ControlCenter({ onClose }: ControlCenterProps) {
  const { openWindow } = useWindowStore();
  const { performanceMode, setPerformanceMode, colorMode, setColorMode } = useThemeStore();
  const { notifications, clearAll, markAllRead } = useNotificationStore();
  const { isSyncing, connectedDevices, startSync, stopSync } = useSyncStore();

  const { showNotch, toggleNotch } = useThemeStore();
  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="absolute top-8 right-0 h-[calc(100%-2rem)] w-80 glass-panel shadow-2xl z-[265] flex flex-col pointer-events-auto overflow-hidden animate-in slide-in-from-right">
      <div className="p-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--os-border)' }}>
        <h3 className="font-medium text-sm" style={{ color: 'var(--os-text)' }}>Action Center</h3>
        <button onClick={onClose} style={{ color: 'var(--os-text-muted)' }}>✕</button>
      </div>
      <div className="p-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
        <WeatherWidget />
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={async () => {
              try {
                // @ts-ignore
                const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
                window.dispatchEvent(new CustomEvent('os:notify', {
                  detail: { title: 'Bluetooth Paired', description: `Connected to ${device.name || 'Unknown Device'}`, type: 'success' },
                }));
              } catch (err) {
                // User cancelled or no BT
              }
            }}
            className="p-3 rounded-xl flex flex-col items-start gap-2 transition-colors col-span-2"
            style={{ background: 'var(--os-hover)', color: 'var(--os-text)' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded flex items-center justify-center bg-blue-500 text-white">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 7 10 10-5 5V2l5 5L7 17"/></svg>
              </div>
              <span className="text-xs font-medium">Connect Bluetooth Device</span>
            </div>
            <span className="text-[10px] opacity-60">Headphones, Gamepads, IoT</span>
          </button>
          <button
            onClick={() => setPerformanceMode(performanceMode === 'heavy' ? 'light' : 'heavy')}
            className="p-3 rounded-xl flex flex-col items-start gap-2 transition-colors"
            style={{
              background: performanceMode === 'heavy' ? '#f59e0b' : 'var(--os-hover)',
              color: performanceMode === 'heavy' ? 'white' : 'var(--os-text-muted)',
            }}
          >
            <Zap className="w-5 h-5" />
            <span className="text-xs font-medium">Heavy Mode</span>
          </button>
          <button
            onClick={() => setColorMode(colorMode === 'light' ? 'dark' : 'light')}
            className="p-3 rounded-xl flex flex-col items-start gap-2 transition-colors"
            style={{
              background: 'var(--os-primary)',
              color: 'white',
            }}
          >
            {colorMode === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            <span className="text-xs font-medium">{colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
          <button
            onClick={() => {
              onClose();
              openWindow('assistant', 'AI Assistant');
            }}
            className="p-3 rounded-xl flex flex-col items-start gap-2 transition-colors"
            style={{ background: '#10b981', color: 'white' }}
          >
            <Brain className="w-5 h-5" />
            <span className="text-xs font-medium">AI Gateway</span>
          </button>
          <button
            onClick={() => {
              onClose();
              openWindow('hardware-manager', 'Hardware Subsystem');
            }}
            className="p-3 rounded-xl flex flex-col items-start gap-2 transition-colors"
            style={{ background: '#0284c7', color: 'white' }}
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-medium">Hardware Manager</span>
          </button>
          <button
            onClick={() => {
              onClose();
              openWindow('app-store', 'ContinuaOS App Store');
            }}
            className="p-3 rounded-xl flex flex-col items-start gap-2 transition-colors"
            style={{ background: '#00f0ff', color: 'white' }}
          >
            <Cloud className="w-5 h-5" />
            <span className="text-xs font-medium">App Store</span>
          </button>
          <button
            onClick={() => toggleNotch()}
            className="p-3 rounded-xl flex flex-col items-start gap-2 transition-colors"
            style={{
              background: showNotch ? '#00f0ff' : 'var(--os-hover)',
              color: showNotch ? 'white' : 'var(--os-text-muted)',
            }}
          >
            <Sun className="w-5 h-5" />
            <span className="text-xs font-medium">{showNotch ? 'Notch: Visible' : 'Notch: Hidden'}</span>
          </button>
          <button 
            onClick={() => {
              if (isSyncing) stopSync();
              else {
                const room = prompt('Enter a sync room ID (e.g. workspace-1):', 'workspace-1');
                if (room) startSync(room);
              }
            }}
            className="p-3 rounded-xl flex flex-col items-start gap-2 transition-colors relative" 
            style={{ 
              background: isSyncing ? '#3b82f6' : 'var(--os-hover)', 
              color: isSyncing ? 'white' : 'var(--os-text-muted)' 
            }}
          >
            <Cloud className="w-5 h-5" />
            <span className="text-xs font-medium">{isSyncing ? `Connected (${connectedDevices})` : 'Cloud Sync'}</span>
            {isSyncing && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white animate-pulse" />}
          </button>
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--os-text-muted)' }}>Notifications</span>
            {recentNotifications.length > 0 && (
              <button onClick={() => { clearAll(); markAllRead(); }} className="text-[10px] flex items-center gap-1 hover:opacity-70" style={{ color: 'var(--os-text-muted)' }}>
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {recentNotifications.length === 0 ? (
              <div className="rounded-lg p-3 text-center text-xs" style={{ background: 'var(--os-hover)', color: 'var(--os-text-muted)' }}>
                No recent notifications
              </div>
            ) : (
              recentNotifications.map((n) => (
                <div key={n.id} className="rounded-lg p-3" style={{ background: 'var(--os-hover)', border: '1px solid var(--os-border)' }}>
                  <div className="text-sm font-medium mb-1" style={{ color: 'var(--os-text)' }}>{n.title}</div>
                  {n.description && (
                    <div className="text-xs" style={{ color: 'var(--os-text-muted)' }}>{n.description}</div>
                  )}
                  <div className="text-[10px] mt-2" style={{ color: 'var(--os-outline)' }}>
                    {new Date(n.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
