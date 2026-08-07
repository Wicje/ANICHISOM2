'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureUnderscoreErrorException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-black font-sans text-slate-100">
        <div className="flex max-w-md flex-col items-center gap-4 p-8 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-neon-blue">
            continua
          </p>
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-sm text-slate-400">
            Your context is safe. A report has been sent — try again or reload.
          </p>
          <button
            onClick={reset}
            className="mt-2 rounded-md bg-[#10F4A0] px-5 py-2 text-sm font-semibold text-black transition hover:brightness-110"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
