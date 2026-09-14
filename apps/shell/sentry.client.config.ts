import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only send errors in production
  enabled: process.env.NODE_ENV === 'production',

  // Adjust sample rate: 100% of errors, 10% of transactions
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  // Ignore known noisy errors
  ignoreErrors: [
    'ResizeObserver loop',
    'Non-Error promise rejection',
    'Network request failed',
    'Failed to fetch',
    'AbortError',
  ],

  // Don't track PII
  sendDefaultPii: false,
});
