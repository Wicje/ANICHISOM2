import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface AppNotification {
  id: string;
  title: string;
  description?: string;
  type: NotificationType;
  timestamp: number;
  read: boolean;
}

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (title: string, type?: NotificationType, description?: string) => string;
  dismiss: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: (title, type = 'info', description) => {
    const notification: AppNotification = {
      id: crypto.randomUUID(),
      title,
      description,
      type,
      timestamp: Date.now(),
      read: false,
    };
    set((s) => ({
      notifications: [notification, ...s.notifications].slice(0, 50),
    }));
    return notification.id;
  },

  dismiss: (id) => {
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    }));
  },

  markRead: (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },

  markAllRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }));
  },

  clearAll: () => set({ notifications: [] }),
}));
