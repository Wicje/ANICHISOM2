'use client';
import { useEffect } from 'react';
import { usePomodoroStore } from '@/lib/stores/pomodoro.store';
import { useFocusStore } from '@/lib/stores/focus.store';

export function PomodoroDaemon() {
  const { tick, mode, isActive } = usePomodoroStore();
  const enableFocus = useFocusStore(s => s.enable);
  const disableFocus = useFocusStore(s => s.disable);
  
  // Timer loop
  useEffect(() => {
    const interval = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  // Hook into OS states (e.g. automatically enable Focus Mode to block notifications)
  useEffect(() => {
    if (isActive && mode === 'focus') {
      enableFocus();
    } else if (isActive && mode === 'break') {
      disableFocus();
    }
  }, [isActive, mode, enableFocus, disableFocus]);

  return null;
}
