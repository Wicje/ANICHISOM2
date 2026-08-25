'use client';

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Laptop,
  Monitor,
  Shield,
  ShieldOff,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeviceStore } from '@/lib/stores/device.store';

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hour${Math.floor(diff / 3_600_000) === 1 ? '' : 's'} ago`;
  const days = Math.floor(diff / 86_400_000);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function getPlatformIcon(platform: string) {
  switch (platform?.toLowerCase()) {
    case 'mobile':
    case 'android':
    case 'ios':
      return Smartphone;
    case 'laptop':
    case 'macos':
    case 'windows':
      return Laptop;
    default:
      return Monitor;
  }
}

const TRUST_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  trusted: { label: 'Trusted', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  temporary: { label: 'Temporary', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  revoked: { label: 'Revoked', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};
const TRUST_DEFAULT = TRUST_CONFIG.temporary;

export function DeviceManager() {
  const { deviceId, allDevices, fetchDevices, setTrustLevel, revokeDevice } = useDeviceStore();
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const currentDevice = allDevices.find((d) => d.id === deviceId);
  const otherDevices = allDevices.filter((d) => d.id !== deviceId);
  const sorted = [...otherDevices].sort((a, b) => b.lastSeenAt - a.lastSeenAt);

  const handleCycleTrust = (id: string, current: string) => {
    const next = current === 'revoked' ? 'temporary' : current === 'trusted' ? 'temporary' : 'trusted';
    setTrustLevel(id, next as any);
  };

  const handleRevoke = (id: string) => {
    if (confirmRevoke === id) {
      revokeDevice(id);
      setConfirmRevoke(null);
    } else {
      setConfirmRevoke(id);
      setTimeout(() => setConfirmRevoke(null), 3000);
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: 'var(--os-surface)' }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--os-text)' }}>Device Trust</h1>
            <p className="text-xs mt-1" style={{ color: 'var(--os-text-muted)' }}>
              Manage which devices have access to your Continua workspace
            </p>
          </div>
          <button
            onClick={fetchDevices}
            className="p-2 rounded-lg transition-colors"
            style={{ background: 'var(--os-hover)', color: 'var(--os-text-muted)' }}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Device list */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
        {/* Current device */}
        {currentDevice && (
          <DeviceCard
            device={currentDevice}
            isCurrent
            confirmRevoke={confirmRevoke}
            onCycleTrust={handleCycleTrust}
            onRevoke={handleRevoke}
          />
        )}

        {/* Other devices */}
        {sorted.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            isCurrent={false}
            confirmRevoke={confirmRevoke}
            onCycleTrust={handleCycleTrust}
            onRevoke={handleRevoke}
          />
        ))}

        {allDevices.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48" style={{ color: 'var(--os-text-muted)' }}>
            <Shield className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No devices registered</p>
            <p className="text-xs mt-1 opacity-60">Devices will appear here after registration</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DeviceCard({
  device,
  isCurrent,
  confirmRevoke,
  onCycleTrust,
  onRevoke,
}: {
  device: any;
  isCurrent: boolean;
  confirmRevoke: string | null;
  onCycleTrust: (id: string, trust: string) => void;
  onRevoke: (id: string) => void;
}) {
  const PlatformIcon = getPlatformIcon(device.platform);
  const trust = (device.trustLevel in TRUST_CONFIG ? TRUST_CONFIG[device.trustLevel] : TRUST_DEFAULT) as { label: string; color: string; bg: string };
  const isRevoked = device.trustLevel === 'revoked';

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors',
        isCurrent && 'ring-1'
      )}
      style={{
        background: 'var(--os-surface-elevated)',
        borderColor: 'var(--os-border)',
        ...(isCurrent ? { '--tw-ring-color': 'var(--os-primary)' } as any : {}),
      }}
    >
      <div className="flex items-start gap-3">
        {/* Platform icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--os-hover)' }}
        >
          <PlatformIcon className="w-5 h-5" style={{ color: 'var(--os-text-muted)' }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--os-text)' }}>
              {device.deviceName}
            </span>
            {isCurrent && (
              <span
                className="px-1.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide"
                style={{ background: 'rgba(0,240,255,0.12)', color: 'var(--os-primary)' }}
              >
                This Device
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--os-text-muted)' }}>
            {device.platform} &middot; {device.browser}
          </p>

          {/* Trust badge + last seen */}
          <div className="flex items-center gap-3 mt-2">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full"
              style={{ background: trust.bg, color: trust.color }}
            >
              {isRevoked ? <ShieldOff className="w-2.5 h-2.5" /> : <Shield className="w-2.5 h-2.5" />}
              {trust.label}
            </span>
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--os-text-muted)' }}>
              <Clock className="w-2.5 h-2.5" />
              {formatRelativeTime(device.lastSeenAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        {!isCurrent && device.trustLevel !== 'revoked' && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onCycleTrust(device.id, device.trustLevel)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--os-hover)', color: 'var(--os-text-muted)' }}
              title={device.trustLevel === 'trusted' ? 'Set to temporary' : 'Trust device'}
            >
              {device.trustLevel === 'trusted' ? (
                <AlertCircle className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={() => onRevoke(device.id)}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                background: confirmRevoke === device.id ? 'rgba(239,68,68,0.15)' : 'var(--os-hover)',
                color: confirmRevoke === device.id ? 'var(--os-error)' : 'var(--os-text-muted)',
              }}
              title={confirmRevoke === device.id ? 'Click again to confirm' : 'Revoke device'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DeviceManager;
