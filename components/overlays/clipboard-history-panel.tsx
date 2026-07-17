'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useClipboardUIStore } from '@/lib/stores/clipboard.store';
import { clipboardHistory, type ClipboardEntry } from '@/lib/services/clipboard-history';
import { Copy, Trash2, X, Clipboard } from 'lucide-react';

export function ClipboardHistoryPanel() {
  const isOpen = useClipboardUIStore((s) => s.isOpen);
  const close = useClipboardUIStore((s) => s.close);
  const [entries, setEntries] = useState<ClipboardEntry[]>([]);
  const [search, setSearch] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    clipboardHistory.load();
    const unsub = clipboardHistory.onChange(() => {
      setEntries(clipboardHistory.getEntries());
    });
    setEntries(clipboardHistory.getEntries());
    return unsub;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, close]);

  // Auto-close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        close();
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, close]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'Copied', description: 'Text copied to clipboard', type: 'success' },
      }));
    } catch {}
  }, []);

  const filtered = search
    ? entries.filter((e) => e.text.toLowerCase().includes(search.toLowerCase()))
    : entries;

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="fixed bottom-12 right-4 z-[9000] w-80 max-h-[60vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden"
      style={{
        background: 'var(--os-glass-bg)',
        borderColor: 'var(--os-border)',
        backdropFilter: 'blur(40px) saturate(200%)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--os-border)' }}>
        <div className="flex items-center gap-2">
          <Clipboard className="w-4 h-4" style={{ color: 'var(--os-primary)' }} />
          <span className="text-xs font-bold" style={{ color: 'var(--os-text)' }}>Clipboard History</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => clipboardHistory.clear().then(() => setEntries([]))}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            style={{ color: 'var(--os-text-muted)' }}
            title="Clear all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={close} className="p-1 rounded hover:bg-white/10 transition-colors" style={{ color: 'var(--os-text-muted)' }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--os-border)' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clipboard..."
          className="w-full px-3 py-1.5 text-xs rounded-lg border outline-none"
          style={{ background: 'var(--os-hover)', borderColor: 'var(--os-border)', color: 'var(--os-text)' }}
          autoFocus
        />
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8" style={{ color: 'var(--os-text-muted)' }}>
            <Clipboard className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">No clipboard entries</p>
            <p className="text-[10px] mt-1 opacity-60">Copy text to see it here</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-2 p-2 rounded-lg group cursor-pointer transition-colors hover:bg-white/5"
                onClick={() => copyToClipboard(entry.text)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--os-text)' }}>{entry.text}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--os-text-muted)' }}>
                    {formatTimeAgo(entry.timestamp)}
                    {entry.source ? ` • ${entry.source}` : ''}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(entry.text); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity shrink-0"
                  style={{ color: 'var(--os-primary)' }}
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}
