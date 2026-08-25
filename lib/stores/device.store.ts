/**
 * Continua Device Store — device identity, registration, and heartbeat.
 *
 * Manages the local device's identity and syncs it with the server.
 * Auto-registers on first auth and sends heartbeats on window focus.
 */
import { create } from 'zustand';
import { readDomain, writeDomain } from '@/lib/context-layer';
import {
  detectCapabilities,
  generateFingerprint,
  generateDeviceName,
  type DeviceCapabilities,
} from '@/lib/capabilities';
import type { TrustLevel } from '@/lib/continuity/types';

const DEVICE_DOMAIN = 'device';
const DEVICE_ID_KEY = 'continua_device_id';
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export type DeviceState = {
  // Identity
  deviceId: string | null;
  fingerprint: string;
  deviceName: string;
  trustLevel: TrustLevel;
  capabilities: DeviceCapabilities;

  // Sync status
  isRegistered: boolean;
  lastHeartbeatAt: number | null;
  isOnline: boolean;

  // All registered devices
  allDevices: DeviceRegistration[];

  // Actions
  initialize: () => Promise<void>;
  register: (userId: string) => Promise<boolean>;
  heartbeat: () => Promise<void>;
  setTrustLevel: (deviceId: string, level: TrustLevel) => Promise<void>;
  revokeDevice: (deviceId: string) => Promise<void>;
  fetchDevices: () => Promise<void>;
  destroy: () => void;
};

type DeviceRegistration = {
  id: string;
  userId: string;
  deviceName: string;
  trustLevel: TrustLevel;
  platform: string;
  browser: string;
  fingerprint: string;
  capabilities: DeviceCapabilities;
  lastSeenAt: number;
  createdAt: number;
  revokedAt: number | null;
};

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `dev-${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  // Identity
  deviceId: null,
  fingerprint: '',
  deviceName: '',
  trustLevel: 'temporary',
  capabilities: detectCapabilities(),

  // Sync
  isRegistered: false,
  lastHeartbeatAt: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

  // All devices
  allDevices: [],

  initialize: async () => {
    const caps = detectCapabilities();
    const fp = generateFingerprint(caps);
    const name = generateDeviceName(caps);
    const deviceId = getOrCreateDeviceId();

    // Try to load persisted device state
    let persisted: Partial<DeviceState> = {};
    try {
      persisted = (await readDomain<Partial<DeviceState>>(DEVICE_DOMAIN)) || {};
    } catch {}

    set({
      deviceId: persisted.deviceId || deviceId,
      fingerprint: fp,
      deviceName: persisted.deviceName || name,
      trustLevel: persisted.trustLevel || 'temporary',
      capabilities: caps,
      isRegistered: persisted.isRegistered || false,
      lastHeartbeatAt: persisted.lastHeartbeatAt || null,
    });

    // Start heartbeat interval
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      const state = get();
      if (state.isRegistered && state.isOnline) {
        state.heartbeat();
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Listen for online/offline
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => set({ isOnline: true }));
      window.addEventListener('offline', () => set({ isOnline: false }));

      // Heartbeat on window focus
      window.addEventListener('focus', () => {
        const state = get();
        if (state.isRegistered) state.heartbeat();
      });
    }
  },

  register: async (userId: string) => {
    const state = get();
    try {
      const res = await fetch('/api/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceName: state.deviceName,
          fingerprint: state.fingerprint,
          platform: state.capabilities.platform,
          browser: state.capabilities.browser,
          capabilities: state.capabilities,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          set({
            isRegistered: true,
            trustLevel: data.data.trustLevel || 'temporary',
            deviceId: data.data.deviceId,
          });
          // Persist
          writeDomain(DEVICE_DOMAIN, {
            deviceId: data.data.deviceId,
            deviceName: state.deviceName,
            trustLevel: data.data.trustLevel || 'temporary',
            isRegistered: true,
          });
          return true;
        }
      }
    } catch (err) {
      console.error('[device] Registration failed:', err);
    }
    return false;
  },

  heartbeat: async () => {
    const state = get();
    if (!state.isRegistered) return;

    try {
      const res = await fetch('/api/devices/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint: state.fingerprint,
        }),
      });

      if (res.ok) {
        set({ lastHeartbeatAt: Date.now() });
        writeDomain(DEVICE_DOMAIN, { lastHeartbeatAt: Date.now() });
      }
    } catch {
      // Silently fail — will retry on next interval
    }
  },

  setTrustLevel: async (deviceId: string, level: TrustLevel) => {
    try {
      const res = await fetch(`/api/devices/${deviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trustLevel: level }),
      });

      if (res.ok) {
        set(state => ({
          allDevices: state.allDevices.map(d =>
            d.id === deviceId ? { ...d, trustLevel: level } : d
          ),
        }));
      }
    } catch (err) {
      console.error('[device] Update trust level failed:', err);
    }
  },

  revokeDevice: async (deviceId: string) => {
    try {
      const res = await fetch(`/api/devices/${deviceId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        set(state => ({
          allDevices: state.allDevices.map(d =>
            d.id === deviceId ? { ...d, trustLevel: 'revoked' as TrustLevel, revokedAt: Date.now() } : d
          ),
        }));
      }
    } catch (err) {
      console.error('[device] Revoke failed:', err);
    }
  },

  fetchDevices: async () => {
    try {
      const res = await fetch('/api/devices');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          set({ allDevices: data.data || [] });
        }
      }
    } catch {
      // Silently fail
    }
  },

  destroy: () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  },
}));
