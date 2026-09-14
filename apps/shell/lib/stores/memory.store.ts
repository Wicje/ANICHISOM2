import { create } from 'zustand';
import { episodicMemory, MemoryTurn, MemoryEpisode } from '@/lib/ai-memory/episodic-memory';

export interface MemoryEvent {
  id: string;
  timestamp: number;
  type: 'app_open' | 'file_open' | 'search' | 'clipboard' | 'terminal_command' | 'chat_turn';
  details: string;
}

interface MemoryStore {
  events: MemoryEvent[];
  logEvent: (type: MemoryEvent['type'], details: string) => void;
  recordChatTurn: (role: 'user' | 'assistant', content: string, appContext?: string) => Promise<void>;
  getNucleusContext: (query: string) => Promise<string>;
  getContext: () => string;
  clear: () => void;
}

const MAX_MEMORY = 100;

export const useMemoryStore = create<MemoryStore>((set, get) => ({
  events: [],
  logEvent: (type, details) => {
    set((state) => {
      const newEvent: MemoryEvent = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type,
        details,
      };
      const updated = [newEvent, ...state.events].slice(0, MAX_MEMORY);
      return { events: updated };
    });
  },
  recordChatTurn: async (role, content, appContext) => {
    get().logEvent('chat_turn', `[${role}] ${content.slice(0, 80)}`);
    await episodicMemory.recordTurn(role, content, { appContext });
  },
  getNucleusContext: async (query: string) => {
    return episodicMemory.retrieveNucleusContext(query);
  },
  getContext: () => {
    const events = get().events;
    if (events.length === 0) return 'User has no recent activity.';
    
    // Group and format recent events for the LLM
    const lines = events.slice(0, 15).map(e => {
      const time = new Date(e.timestamp).toLocaleTimeString();
      return `[${time}] ${e.type.toUpperCase()}: ${e.details}`;
    });
    
    return `Recent User Activity Context:\n${lines.join('\n')}`;
  },
  clear: () => set({ events: [] })
}));
