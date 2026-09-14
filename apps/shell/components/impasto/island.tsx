'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { format } from 'date-fns';
import { Wifi } from 'lucide-react';

import { useHardwareState } from '@/lib/hooks/use-hardware';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { cn } from '@/lib/utils';
import { ControlCenterView } from '@/components/desktop/control-center';

// ── THE DYNAMIC ISLAND ─────────────────────────────────────────────────────
// One black capsule that changes shape to fit whatever it shows (impasto's
// `DynamicIsland`): the clock at rest, a glance under the pointer, and every
// panel — control centre, Wi-Fi — opening into it. The shape animates while
// the contents cross-fade.

export type IslandPanel = 'controls' | 'wifi';

export interface IslandProps {
  openPanel: IslandPanel | null;
  onOpenPanel: (panel: IslandPanel) => void;
  onClose: () => void;
  onOpenSettings: () => void;
  onSpotlight: () => void;
  onLock: () => void;
  onLogout: () => void;
  onWipe: () => void;
}

const CAPSULE_H = 32;
const EASE: [number, number, number, number] = [0.33, 1, 0.68, 1];

export function Island({
  openPanel,
  onOpenPanel,
  onClose,
  onOpenSettings,
  onSpotlight,
  onLock,
  onLogout,
  onWipe,
}: IslandProps) {
  const { battery } = useHardwareState();
  const wifiEnabled = useThemeStore((s) => s.wifiEnabled);
  const workspaceMode = useWorkspaceStore((s) => s.workspaceMode);
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);

  const [now, setNow] = useState(() => new Date());
  const [hovered, setHovered] = useState(false);
  const [summary, setSummary] = useState(false);
  const [held, setHeld] = useState(false);
  const dwellRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clockRef = useRef<HTMLDivElement>(null);
  const [restW, setRestW] = useState(96);

  useEffect(() => {
    const el = clockRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setRestW(Math.max(92, el.offsetWidth + 36)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openPanel) onClose();
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [openPanel, onClose]);

  // Glance dwell (80 ms) and grace period (260 ms), matching impasto.
  const enter = () => {
    if (graceRef.current) clearTimeout(graceRef.current);
    if (!openPanel && !held && !summary) {
      dwellRef.current = setTimeout(() => {
        if (!openPanel && !held) setSummary(true);
      }, 80);
    }
  };
  const leave = () => {
    if (dwellRef.current) clearTimeout(dwellRef.current);
    graceRef.current = setTimeout(() => setSummary(false), 260);
  };

  const openControls = () => {
    setHeld(true);
    setSummary(false);
    onOpenPanel('controls');
  };

  const expanded = openPanel !== null;
  const layer: 'rest' | 'glance' | IslandPanel =
    expanded && openPanel ? openPanel : summary ? 'glance' : 'rest';

  const sizes: Record<'rest' | 'glance' | IslandPanel, { w: number; h: number }> = {
    rest: { w: restW, h: CAPSULE_H },
    glance: { w: 320, h: 112 },
    controls: { w: 648, h: 356 },
    wifi: { w: 420, h: 470 },
  };
  const size = sizes[layer];
  const radius = expanded ? 18 : Math.min(size.h / 2, 22);
  const bg = expanded ? '#000000' : hovered ? '#1f1f1f' : '#141414';

  // Closing after an expanded layer: the pointer may still be over the bar,
  // so cancel any pending glance.
  useEffect(() => {
    if (!expanded && held && !hovered) {
      const t = setTimeout(() => setHeld(false), 220);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [expanded, held, hovered]);

  const time = format(now, 'HH:mm');
  const date = format(now, 'EEE d MMM');
  const batteryPct = battery ? Math.round(battery.level * 100) : null;

  return (
    <>
      {expanded && (
        <div
          className="fixed inset-0 z-[259]"
          style={{ background: 'transparent' }}
          onClick={onClose}
        />
      )}

      <motion.div
        className="absolute top-0 left-1/2 z-[260]"
        style={{ x: '-50%' }}
        onHoverStart={enter}
        onHoverEnd={leave}
        animate={{
          width: size.w,
          height: size.h,
          borderRadius: radius,
          backgroundColor: bg,
        }}
        transition={{
          duration: 0.38,
          ease: EASE,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            border: '1px solid #262626',
            borderRadius: expanded ? 18 : Math.min(size.h / 2, 22),
            opacity: expanded ? 1 : 1,
            pointerEvents: 'none',
          }}
        />

        {/* ── REST / GLANCE ─────────────────────────────────────────────── */}
        <AnimatePresence mode="popLayout">
          {(layer === 'rest' || layer === 'glance') && (
            <motion.div
              key="clock"
              className="absolute inset-0 flex items-center justify-center overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14, ease: EASE }}
              onClick={() => {
                if (layer === 'rest' && !held) {
                  openControls();
                } else if (layer === 'glance') {
                  openControls();
                }
              }}
            >
              <div
                ref={clockRef}
                className="flex items-center gap-2 select-none"
                style={{
                  pointerEvents: 'none',
                  opacity: layer === 'glance' ? 0 : 1,
                }}
              >
                <span
                  className="tabular-nums font-semibold"
                  style={{ fontSize: 13, color: '#fff' }}
                >
                  {time}
                </span>
              </div>

              {/* The glance: a wide capsule with the large clock and a row of
                  small facts, opened under the pointer after a dwell. */}
              {summary && (
                <motion.div
                  key="glance"
                  className="absolute inset-[18px] flex flex-col items-center justify-center gap-3 select-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.14, ease: EASE }}
                >
                  <div className="flex flex-col items-center leading-none" style={{ pointerEvents: 'none' }}>
                    <span className="tabular-nums font-semibold" style={{ fontSize: 34, color: '#fff' }}>
                      {time}
                    </span>
                    <span style={{ fontSize: 11, color: '#8e8e93', marginTop: 6 }}>{date}</span>
                  </div>
                  <div className="flex items-center gap-3" style={{ pointerEvents: 'none' }}>
                    <span className="flex items-center gap-1.5 text-[10px]" style={{ color: '#8e8e93' }}>
                      <span className="imp-dot" style={{ background: '#fff' }} />
                      {workspaceMode === 'agency' ? `Agency · ${activeWorkspace}` : 'Private'}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px]" style={{ color: wifiEnabled ? '#0a84ff' : '#8e8e93' }}>
                      <Wifi className="w-3 h-3" />
                      {wifiEnabled ? 'Wi-Fi' : 'Off'}
                    </span>
                    {batteryPct !== null && (
                      <span className="text-[10px] tabular-nums" style={{ color: '#8e8e93' }}>
                        {batteryPct}%
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── PANELS ────────────────────────────────────────────────────── */}
        <AnimatePresence mode="popLayout">
          {expanded && (
            <motion.div
              key={openPanel}
              className="absolute inset-[20px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              {openPanel === 'controls' ? (
                <ControlCenterView
                  onClose={onClose}
                  onNavigate={(p) => onOpenPanel(p)}
                  onOpenSettings={onOpenSettings}
                  onSpotlight={onSpotlight}
                  onLock={onLock}
                  onLogout={onLogout}
                  onWipe={onWipe}
                />
              ) : (
                <WifiPanel onClose={onClose} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <span className="sr-only">{cn('Island', layer)}</span>
      </motion.div>
    </>
  );
}

// ── WI-FI DETAIL ───────────────────────────────────────────────────────────
function WifiPanel({ onClose }: { onClose: () => void }) {
  const wifiEnabled = useThemeStore((s) => s.wifiEnabled);
  const setWifiEnabled = useThemeStore((s) => s.setWifiEnabled);
  const [active, setActive] = useState('Continua_Studio_5G');

  const networks = [
    { ssid: 'Continua_Studio_5G', signal: '100%', secured: true },
    { ssid: 'Fiber_Ultra_Guest', signal: '85%', secured: true },
    { ssid: 'Home_Lab_Mesh', signal: '70%', secured: true },
    { ssid: 'Direct_5G_Hotspot', signal: '60%', secured: false },
  ];

  return (
    <div className="imp-panel">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[15px] font-semibold">Wi-Fi</span>
        <div className="flex items-center gap-3">
          <span
            className="text-[11px] font-medium"
            style={{ color: wifiEnabled ? '#32d74b' : '#8e8e93' }}
          >
            {wifiEnabled ? active : 'Off'}
          </span>
          <button
            onClick={() => setWifiEnabled(!wifiEnabled)}
            className="relative w-10 h-[24px] rounded-full transition-colors"
            style={{
              background: wifiEnabled ? '#0a84ff' : '#3a3a3c',
              transition: 'background 140ms cubic-bezier(0.33,1,0.68,1)',
            }}
            aria-label="Toggle Wi-Fi"
          >
            <span
              className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all"
              style={{ left: wifiEnabled ? 19 : 3, transition: 'left 200ms cubic-bezier(0.33,1,0.68,1)' }}
            />
          </button>
        </div>
      </div>

      {wifiEnabled ? (
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
          <span className="text-[10px] uppercase tracking-wide px-2" style={{ color: '#8e8e93' }}>
            Known networks
          </span>
          {networks.map((net) => {
            const isActive = active === net.ssid;
            return (
              <button
                key={net.ssid}
                onClick={() => {
                  setActive(net.ssid);
                  window.dispatchEvent(new CustomEvent('os:notify', {
                    detail: { title: 'Wi-Fi', description: `Connected to ${net.ssid}`, type: 'success' },
                  }));
                }}
                className="imp-inset imp-inset--hover flex items-center justify-between px-3 py-2.5 text-left"
                style={{ borderColor: isActive ? '#0a84ff' : undefined }}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-medium truncate" style={{ color: isActive ? '#fff' : '#d1d1d6' }}>
                    {net.ssid}
                  </span>
                  <span className="text-[10px]" style={{ color: '#8e8e93' }}>
                    {net.secured ? 'Secured' : 'Open'} · {net.signal}
                  </span>
                </div>
                {isActive && (
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#32d74b' }} />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[13px]" style={{ color: '#8e8e93' }}>
            Wi-Fi is off. Turn it on to see networks.
          </span>
        </div>
      )}

      <button
        onClick={onClose}
        className="self-end mt-4 text-[12px] font-medium px-3 py-1.5 rounded-lg"
        style={{ background: '#1f1f1f', color: '#fff' }}
      >
        Close
      </button>
    </div>
  );
}