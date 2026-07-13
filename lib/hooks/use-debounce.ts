'use client';

import { useState, useEffect } from 'react';

/**
 * Debounce a value by `delay` ms.
 * Returns the debounced value that only updates after the delay.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
