'use client';

import { useEffect, useState } from 'react';
import { useThemeStore } from '@/lib/stores/theme.store';

// A dynamic wallpaper that changes based on the time of day
const DYNAMIC_WALLPAPERS: Record<string, string> = {
  morning: 'https://images.unsplash.com/photo-1506744626753-1fa00d20d7f9?q=80&w=2564&auto=format&fit=crop', // bright mountains
  afternoon: 'https://images.unsplash.com/photo-1445262102387-5febb37a4121?q=80&w=2564&auto=format&fit=crop', // clear sky
  evening: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2564&auto=format&fit=crop', // sunset
  night: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2564&auto=format&fit=crop', // starry night
};

export function useDynamicWallpaper(enabled: boolean) {
  const setWallpaper = useThemeStore(s => s.setWallpaper);

  useEffect(() => {
    if (!enabled) return;
    
    const updateWallpaper = () => {
      const hour = new Date().getHours();
      let timeOfDay = 'afternoon';
      if (hour >= 5 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
      else if (hour >= 17 && hour < 20) timeOfDay = 'evening';
      else timeOfDay = 'night';

      setWallpaper(DYNAMIC_WALLPAPERS[timeOfDay]);
    };

    updateWallpaper();
    const interval = setInterval(updateWallpaper, 60 * 60 * 1000); // Check every hour
    return () => clearInterval(interval);
  }, [enabled, setWallpaper]);
}
