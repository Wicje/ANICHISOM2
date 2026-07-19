'use client';

import { useState, useEffect } from 'react';
import { useFigma } from '@/lib/hooks/use-figma';

/**
 * Context Panel — displays captured context from external tools.
 * Shown as a side panel in the OS, shows design tokens, browser context, etc.
 */

interface BrowserContext {
  url: string;
  title: string;
  selectedText?: string;
  colors?: string[];
  headings?: Array<{ tag: string; text: string }>;
  capturedAt?: number;
}

export function ContextPanel() {
  const [activeTab, setActiveTab] = useState<'browser' | 'design'>('browser');
  const [browserContexts, setBrowserContexts] = useState<BrowserContext[]>([]);
  const figma = useFigma();

  useEffect(() => {
    // Load browser contexts from IDB
    import('@/lib/context-layer').then(({ readDomain }) => {
      readDomain('browser').then((data: any) => {
        if (data?.tabContext) {
          setBrowserContexts([data.tabContext]);
        }
      });
    });
  }, []);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--os-surface)', borderLeft: '1px solid var(--os-border)' }}>
      {/* Tab bar */}
      <div className="flex border-b" style={{ borderColor: 'var(--os-border)' }}>
        <button
          onClick={() => setActiveTab('browser')}
          className="flex-1 px-3 py-2 text-xs font-medium transition-colors"
          style={{
            color: activeTab === 'browser' ? 'var(--os-primary)' : 'var(--os-text-muted)',
            borderBottom: activeTab === 'browser' ? '2px solid var(--os-primary)' : '2px solid transparent',
          }}
        >
          Browser
        </button>
        <button
          onClick={() => setActiveTab('design')}
          className="flex-1 px-3 py-2 text-xs font-medium transition-colors"
          style={{
            color: activeTab === 'design' ? 'var(--os-primary)' : 'var(--os-text-muted)',
            borderBottom: activeTab === 'design' ? '2px solid var(--os-primary)' : '2px solid transparent',
          }}
        >
          Design
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'browser' ? (
          <BrowserContextTab contexts={browserContexts} />
        ) : (
          <DesignContextTab figma={figma} />
        )}
      </div>
    </div>
  );
}

function BrowserContextTab({ contexts }: { contexts: BrowserContext[] }) {
  if (contexts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-xs" style={{ color: 'var(--os-text-muted)' }}>
          No browser context captured yet.
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--os-text-muted)' }}>
          Use the Continua browser or Chrome extension to capture context.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contexts.map((ctx, i) => (
        <div key={i} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--os-border)' }}>
          <div className="text-xs font-medium mb-1 truncate" style={{ color: 'var(--os-primary)' }}>
            {ctx.url}
          </div>
          <div className="text-xs mb-2" style={{ color: 'var(--os-text)' }}>
            {ctx.title}
          </div>
          {ctx.selectedText && (
            <div className="text-xs rounded p-2 mb-2" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--os-text-muted)' }}>
              &ldquo;{ctx.selectedText.slice(0, 200)}&rdquo;
            </div>
          )}
          {ctx.colors && ctx.colors.length > 0 && (
            <div className="flex gap-1 mt-2">
              {ctx.colors.slice(0, 8).map((color, j) => (
                <div
                  key={j}
                  className="w-4 h-4 rounded-full border"
                  style={{ background: color, borderColor: 'var(--os-border)' }}
                  title={color}
                />
              ))}
            </div>
          )}
          {ctx.headings && ctx.headings.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {ctx.headings.slice(0, 5).map((h, j) => (
                <div key={j} className="text-xs truncate" style={{ color: 'var(--os-text-muted)' }}>
                  {h.tag}: {h.text}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DesignContextTab({ figma }: { figma: ReturnType<typeof useFigma> }) {
  if (!figma.connected) {
    return (
      <div className="text-center py-8">
        <p className="text-xs mb-3" style={{ color: 'var(--os-text-muted)' }}>
          Connect Figma to pull design tokens.
        </p>
        <FigmaTokenInput onSubmit={figma.connect} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Colors */}
      {figma.tokens.colors.length > 0 && (
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--os-text)' }}>
            Colors ({figma.tokens.colors.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {figma.tokens.colors.slice(0, 24).map((color, i) => (
              <div key={i} className="group relative">
                <div
                  className="w-6 h-6 rounded-md border cursor-pointer"
                  style={{ background: color.hex, borderColor: 'var(--os-border)' }}
                  title={`${color.hex}${color.name ? ` — ${color.name}` : ''}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text Styles */}
      {figma.tokens.textStyles.length > 0 && (
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--os-text)' }}>
            Typography ({figma.tokens.textStyles.length})
          </div>
          <div className="space-y-1">
            {figma.tokens.textStyles.slice(0, 10).map((style, i) => (
              <div key={i} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ fontFamily: style.fontFamily, fontSize: Math.min(style.fontSize, 14) }}>
                  {style.fontFamily}
                </span>
                <span className="ml-2" style={{ color: 'var(--os-text-muted)' }}>
                  {style.fontSize}px / {style.fontWeight}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Components */}
      {figma.tokens.components.length > 0 && (
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--os-text)' }}>
            Components ({figma.tokens.components.length})
          </div>
          <div className="space-y-1">
            {figma.tokens.components.slice(0, 15).map((comp, i) => (
              <div key={i} className="text-xs px-2 py-1 rounded truncate" style={{ background: 'rgba(255,255,255,0.03)' }}>
                {comp.name}
                {comp.variants && comp.variants.length > 0 && (
                  <span className="ml-1" style={{ color: 'var(--os-text-muted)' }}>
                    ({comp.variants.length} variants)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sync button */}
      <div className="pt-2">
        <button
          onClick={() => figma.syncFile('')}
          disabled={figma.syncing}
          className="w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--os-text)' }}
        >
          {figma.syncing ? 'Syncing...' : 'Sync Figma File'}
        </button>
        <input
          type="text"
          placeholder="Figma file key (from URL)"
          className="w-full mt-2 px-3 py-2 rounded-lg text-xs outline-none"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--os-border)',
            color: 'var(--os-text)',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const input = e.target as HTMLInputElement;
              if (input.value.trim()) figma.syncFile(input.value.trim());
            }
          }}
        />
      </div>

      {figma.error && (
        <div className="text-xs px-2 py-1 rounded" style={{ color: '#F87171', background: 'rgba(248,113,113,0.1)' }}>
          {figma.error}
        </div>
      )}
    </div>
  );
}

function FigmaTokenInput({ onSubmit }: { onSubmit: (token: string) => void }) {
  const [token, setToken] = useState('');

  return (
    <div className="space-y-2">
      <input
        type="password"
        value={token}
        onChange={e => setToken(e.target.value)}
        placeholder="Figma personal access token"
        className="w-full px-3 py-2 rounded-lg text-xs outline-none"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--os-border)',
          color: 'var(--os-text)',
        }}
      />
      <button
        onClick={() => { if (token.trim()) onSubmit(token.trim()); }}
        className="w-full px-3 py-2 rounded-lg text-xs font-medium"
        style={{ background: 'var(--os-primary)', color: '#060608' }}
      >
        Connect Figma
      </button>
      <p className="text-xs text-center" style={{ color: 'var(--os-text-muted)' }}>
        Token stored locally in your browser. Never sent to our servers.
      </p>
    </div>
  );
}
