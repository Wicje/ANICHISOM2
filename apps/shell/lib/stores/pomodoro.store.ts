import { create } from 'zustand';

interface PomodoroStore {
  isActive: boolean;
  timeLeft: number;
  mode: 'focus' | 'break' | 'idle';
  sessionsCompleted: number;
  startFocus: () => void;
  startBreak: () => void;
  stop: () => void;
  tick: () => void;
}

const FOCUS_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;

export const usePomodoroStore = create<PomodoroStore>((set, get) => ({
  isActive: false,
  timeLeft: FOCUS_TIME,
  mode: 'idle',
  sessionsCompleted: 0,
  
  startFocus: () => set({ isActive: true, timeLeft: FOCUS_TIME, mode: 'focus' }),
  startBreak: () => set({ isActive: true, timeLeft: BREAK_TIME, mode: 'break' }),
  stop: () => set({ isActive: false, timeLeft: FOCUS_TIME, mode: 'idle' }),
  
  tick: () => {
    const { isActive, timeLeft, mode, sessionsCompleted } = get();
    if (!isActive) return;

    if (timeLeft > 0) {
      set({ timeLeft: timeLeft - 1 });
    } else {
      // Phase transition
      if (mode === 'focus') {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('os:notify', {
            detail: { title: 'Focus Session Complete!', description: 'Time for a 5 minute break.', type: 'success' }
          }));
        }
        set({ isActive: true, timeLeft: BREAK_TIME, mode: 'break', sessionsCompleted: sessionsCompleted + 1 });
      } else if (mode === 'break') {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('os:notify', {
            detail: { title: 'Break Over!', description: 'Ready to focus again?', type: 'info' }
          }));
        }
        set({ isActive: false, timeLeft: FOCUS_TIME, mode: 'idle' });
      }
    }
  }
}));
