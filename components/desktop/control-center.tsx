'use client';

import React from 'react';
import { useWindowStore } from '@/lib/stores/window.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useNotificationStore } from '@/lib/stores/notification.store';
import { Zap, Brain, Cloud, ShieldCheck, Sun, Moon, Trash2 } from 'lucide-react';

interface ControlCenterProps {
  onClose: () => void;
}

export function ControlCenter({ onClose }: ControlCenterProps) {
  const { openWindow } = useWindowStore();
  const { performanceMode, setPerformanceMode, colorMode, setColorMode } = useThemeStore();
  const { notifications, clearAll, markAllRead } = useNotificationStore();

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="absolute top-8 right-0 h-[calc(100%-2rem)] w-80 glass-panel shadow-2xl z-[265] flex flex-col pointer-events-auto overflow-hidden animate-in slide-in-from-right">
      <div className="p-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--os-border)' }}>
        <h3 className="font-medium text-sm" style={{ color: 'var(--os-text)' }}>Action Center</h3>
        <button onClick={onClose} style={{ color: 'var(--os-text-muted)' }}>✕</button>
      </div>
      <div className="p-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-2 gap-3">
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
          <button className="p-3 rounded-xl flex flex-col items-start gap-2 opacity-50 cursor-not-allowed" style={{ background: 'var(--os-hover)', color: 'var(--os-text-muted)' }}>
            <Cloud className="w-5 h-5" />
            <span className="text-xs font-medium">Cloud Sync</span>
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
