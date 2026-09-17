'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { pushTab } from '@/lib/mobile-tabs';
import { Suspense } from 'react';

function ShareBody() {
  const params = useSearchParams();
  const sharedUrl = params.get('url') || params.get('text') || '';
  const sharedTitle = params.get('title') || '';
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const save = async () => {
    if (!sharedUrl || state === 'sending' || state === 'done') return;
    setState('sending');
    try {
      await pushTab(sharedUrl, sharedTitle);
      setState('done');
    } catch {
      setState('error');
    }
  };

  return (
    <main style={{ minHeight: '100dvh', background: '#000', color: '#f5f5f7', padding: 24, fontFamily: '-apple-system, system-ui, sans-serif' }}>
      <div style={{ fontSize: 13, color: '#86868b', marginBottom: 8 }}>Shared to Continua</div>
      <h1 style={{ fontSize: 22, margin: '0 0 6px' }}>{sharedTitle || 'Untitled page'}</h1>
      <p style={{ fontSize: 14, color: '#86868b', wordBreak: 'break-all' }}>{sharedUrl || 'Nothing to save.'}</p>
      {sharedUrl && state !== 'done' && (
        <button
          onClick={() => void save()}
          disabled={state === 'sending'}
          style={{ marginTop: 20, height: 48, padding: '0 28px', borderRadius: 24, border: 'none', background: '#0071e3', color: '#fff', fontSize: 17, fontWeight: 600 }}
        >
          {state === 'sending' ? 'Saving…' : 'Save to desktop tabs'}
        </button>
      )}
      {state === 'done' && <p style={{ color: '#30d158' }}>Saved — pull on your desktop to open it.</p>}
      {state === 'error' && <p style={{ color: '#ff9f0a' }}>Couldn&apos;t save. Sign in first, then retry.</p>}
      <p><a href="/m" style={{ color: '#2997ff' }}>← All tabs</a></p>
    </main>
  );
}

export default function SharePage() {
  return (
    <Suspense>
      <ShareBody />
    </Suspense>
  );
}
