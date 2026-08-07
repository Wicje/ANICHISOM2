import { create } from 'zustand';
import { readDomain, writeDomain } from '@/lib/context-layer';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface AppNotification {
  id: string;
  title: string;
  description?: string;
  type: NotificationType;
  timestamp: number;
  read: boolean;
}

const STORAGE_KEY = 'continuaos:notifications';
const NOTIFICATIONS_DOMAIN = 'notifications';

function loadNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 50);
  } catch {
    return [];
  }
}

function saveNotifications(notifications: AppNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // Storage full or unavailable — silent fail
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function persistNotifications(notifications: AppNotification[]): void {
  saveNotifications(notifications);
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    writeDomain(NOTIFICATIONS_DOMAIN, notifications).catch(() => {});
  }, 1500);
}

interface NotificationState {
  notifications: AppNotification[];
  hydrate: () => Promise<void>;
  addNotification: (title: string, type?: NotificationType, description?: string) => string;
  dismiss: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: loadNotifications(),

  hydrate: async () => {
    try {
      const data = await readDomain<AppNotification[]>(NOTIFICATIONS_DOMAIN);
      if (Array.isArray(data) && data.length > 0) {
        set({ notifications: data.slice(0, 50) });
        saveNotifications(data.slice(0, 50));
      }
    } catch {
      // Keep whatever was loaded from localStorage
    }
  },

  addNotification: (title, type = 'info', description) => {
    const notification: AppNotification = {
      id: crypto.randomUUID(),
      title,
      description,
      type,
      timestamp: Date.now(),
      read: false,
    };
    const updated = [notification, ...get().notifications].slice(0, 50);
    set({ notifications: updated });
    persistNotifications(updated);
    return notification.id;
  },

  dismiss: (id) => {
    const updated = get().notifications.filter((n) => n.id !== id);
    set({ notifications: updated });
    persistNotifications(updated);
  },

  markRead: (id) => {
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    set({ notifications: updated });
    persistNotifications(updated);
  },

  markAllRead: () => {
    const updated = get().notifications.map((n) => ({ ...n, read: true }));
    set({ notifications: updated });
    persistNotifications(updated);
  },

  clearAll: () => {
    set({ notifications: [] });
    persistNotifications([]);
  },
}));
