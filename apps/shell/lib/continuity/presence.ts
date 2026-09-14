/**
 * Real-time Org Presence — Supabase Realtime subscription.
 *
 * Subscribes to org_presence changes and provides live updates
 * of who is active in the organization.
 */
import { createBrowserClient } from '@supabase/ssr';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceState {
  userId: string;
  orgId: string;
  deviceName: string;
  deviceType: string;
  lastHeartbeatAt: number;
  /** Whether this presence is from the current user */
  isSelf: boolean;
}

type PresenceCallback = (presence: PresenceState[]) => void;

let currentChannel: RealtimeChannel | null = null;
let currentCallback: PresenceCallback | null = null;

/**
 * Subscribe to real-time presence for an org.
 * Returns an unsubscribe function.
 */
export function subscribeToPresence(
  orgId: string,
  currentUserId: string,
  callback: PresenceCallback
): () => void {
  // Clean up any existing subscription
  unsubscribePresence();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  currentCallback = callback;

  const channel = supabase.channel(`org-presence:${orgId}`, {
    config: {
      presence: {
        key: currentUserId,
      },
    },
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const presence: PresenceState[] = [];

      for (const [key, presences] of Object.entries(state)) {
        if (Array.isArray(presences)) {
          for (const p of presences) {
            const data = p as Record<string, unknown>;
            presence.push({
              userId: (data.user_id as string) || key,
              orgId: (data.org_id as string) || orgId,
              deviceName: (data.device_name as string) || 'Unknown Device',
              deviceType: (data.device_type as string) || 'web',
              lastHeartbeatAt: (data.last_heartbeat_at as number) || Date.now(),
              isSelf: key === currentUserId,
            });
          }
        }
      }

      currentCallback?.(presence);
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      // Handled by sync
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      // Handled by sync
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track own presence
        await channel.track({
          user_id: currentUserId,
          org_id: orgId,
          device_name: getDeviceName(),
          device_type: getDeviceType(),
          last_heartbeat_at: Date.now(),
        });
      }
    });

  currentChannel = channel;

  return () => unsubscribePresence();
}

/**
 * Unsubscribe from the current presence channel.
 */
export function unsubscribePresence(): void {
  if (currentChannel) {
    currentChannel.unsubscribe();
    currentChannel = null;
  }
  currentCallback = null;
}

/**
 * Update own presence heartbeat.
 */
export async function updatePresence(orgId: string, currentUserId: string): Promise<void> {
  if (!currentChannel) return;

  await currentChannel.track({
    user_id: currentUserId,
    org_id: orgId,
    device_name: getDeviceName(),
    device_type: getDeviceType(),
    last_heartbeat_at: Date.now(),
  });
}

// ─── Helpers ────────────────────────────────────────────────

function getDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Unknown Device';
  const platform = navigator.platform || 'Unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
    return `Mobile (${platform})`;
  }
  return `Desktop (${platform})`;
}

function getDeviceType(): string {
  if (typeof navigator === 'undefined') return 'web';
  const ua = navigator.userAgent;
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) return 'mobile';
  if (ua.includes('Electron') || navigator.userAgent.includes('Tauri')) return 'desktop';
  return 'web';
}
