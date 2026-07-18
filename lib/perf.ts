/**
 * ContinuaOS Performance Instrumentation
 * 
 * Lightweight wrapper around performance.mark/measure for tracking
 * load times, restore times, and window operations.
 * 
 * Usage:
 *   import { perf } from '@/lib/perf';
 *   perf.mark('window:open');
 *   // ... do work ...
 *   perf.measure('window:open');
 *   // Logs: [Perf] window:open: 12.34ms
 */

const marks = new Map<string, number>();
const measures: Array<{ name: string; duration: number; timestamp: number }> = [];

/** Create a performance mark */
export function mark(name: string): void {
  if (typeof performance === 'undefined') return;
  performance.mark(`continuaos:${name}`);
  marks.set(name, performance.now());
}

/** Measure duration since last mark with the same name */
export function measure(name: string): number {
  if (typeof performance === 'undefined') return 0;
  const start = marks.get(name);
  if (start === undefined) return 0;
  const duration = performance.now() - start;
  marks.delete(name);
  
  try {
    performance.measure(`continuaos:${name}`, `continuaos:${name}`);
  } catch { /* mark may not exist in perf buffer */ }
  
  measures.push({ name, duration, timestamp: Date.now() });
  
  if (typeof console !== 'undefined' && (window as any).__continuaos_perf_debug) {
    console.log(`[Perf] ${name}: ${duration.toFixed(2)}ms`);
  }
  
  return duration;
}

/** Get all recorded measurements */
export function getMeasurements(): Array<{ name: string; duration: number; timestamp: number }> {
  return [...measures];
}

/** Get average duration for a named measurement */
export function getAverage(name: string): number {
  const matching = measures.filter(m => m.name === name);
  if (matching.length === 0) return 0;
  return matching.reduce((sum, m) => sum + m.duration, 0) / matching.length;
}

/** Clear all measurements */
export function clearMeasurements(): void {
  measures.length = 0;
  marks.clear();
}

/** Enable debug logging (call in console: window.__continuaos_perf_debug = true) */
export const perf = { mark, measure, getMeasurements, getAverage, clearMeasurements };
