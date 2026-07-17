import { create } from 'zustand';

export type ActivityType = 'app-open' | 'app-close' | 'file-save' | 'file-open' | 'notification' | 'system' | 'install' | 'setting-change' | 'search';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  title: string;
  detail?: string;
  appId?: string;
  timestamp: number;
}

interface ActivityState {
  events: ActivityEvent[];
  log: (type: ActivityType, title: string, detail?: string, appId?: string) => void;
  clear: () => void;
  getRecent: (count: number) => ActivityEvent[];
  getByType: (type: ActivityType) => ActivityEvent[];
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  events: [],

  log: (type, title, detail, appId) => {
    const event: ActivityEvent = {
      id: crypto.randomUUID(),
      type,
      title,
      detail,
      appId,
      timestamp: Date.now(),
    };
    set((s) => ({
      events: [event, ...s.events].slice(0, 200),
    }));
  },

  clear: () => set({ events: [] }),

  getRecent: (count) => get().events.slice(0, count),

  getByType: (type) => get().events.filter((e) => e.type === type),
}));
