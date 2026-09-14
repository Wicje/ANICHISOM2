import { create } from 'zustand';

interface AIStore {
  ready: boolean;
  progress: string;
  setReady: (r: boolean) => void;
  setProgress: (p: string) => void;
  query: (prompt: string) => Promise<string>;
  setQueryEngine: (engine: (prompt: string) => Promise<string>) => void;
}

export const useAIStore = create<AIStore>((set, get) => ({
  ready: false,
  progress: 'Initializing...',
  setReady: (ready) => set({ ready }),
  setProgress: (progress) => set({ progress }),
  query: async (prompt: string) => {
    return 'AI Engine not ready.';
  },
  setQueryEngine: (queryFunc) => set({ query: queryFunc }),
}));
