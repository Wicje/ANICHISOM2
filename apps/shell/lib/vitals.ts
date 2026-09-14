/**
 * ContinuaOS Web Vitals Tracking
 * 
 * Reports CLS, LCP, INP, TTFB, and FCP metrics.
 * Logs to console in development, can be extended to report to analytics.
 * 
 * Enable: import '@/lib/vitals' in app/layout.tsx
 */

import { onCLS, onLCP, onINP, onTTFB, onFCP } from 'web-vitals';

type VitalMetric = {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
};

function reportMetric(metric: VitalMetric): void {
  if (typeof window === 'undefined') return;

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    const style = metric.rating === 'good'
      ? 'color: #22c55e'
      : metric.rating === 'needs-improvement'
        ? 'color: #eab308'
        : 'color: #ef4444';
    console.log(
      `%c[Perf] ${metric.name}: ${metric.value.toFixed(1)}ms (${metric.rating})`,
      style
    );
  }

  // Store in window for debugging
  if (!(window as any).__continuaos_vitals) {
    (window as any).__continuaos_vitals = {};
  }
  (window as any).__continuaos_vitals[metric.name] = {
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    timestamp: Date.now(),
  };

  // Send to analytics endpoint (when available)
  if (process.env.NODE_ENV === 'production') {
    try {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      });

      // Use sendBeacon for non-blocking delivery
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/vitals', body);
      } else {
        fetch('/api/vitals', { body, method: 'POST', keepalive: true });
      }
    } catch {
      // Non-fatal: vitals reporting should never break the app
    }
  }
}

/** Initialize Web Vitals tracking */
export function initVitals(): void {
  if (typeof window === 'undefined') return;

  try {
    onCLS(reportMetric);
    onLCP(reportMetric);
    onINP(reportMetric);
    onTTFB(reportMetric);
    onFCP(reportMetric);
  } catch {
    // web-vitals may not be available in all environments
  }
}
