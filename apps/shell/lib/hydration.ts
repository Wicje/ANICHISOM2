'use client';

/**
 * Continua Workspace Hydration
 *
 * Rebuilds a working situation from the latest context checkpoint:
 * browser tabs → Power Browser, open apps → window store.
 *
 * Auth: works for logged-in users (Supabase session cookies) and for
 * ephemeral guest sessions (capability token from /connect pairing).
 */
import type { WorkContext } from '@/lib/context-kernel/graph';
import { useBrowserStore } from '@/lib/stores/browser.store';
import { useWindowStore } from '@/lib/stores/window.store';

export interface HydrationSummary {
  restoredAt: string;
  checkpointAt?: string;
  projectName?: string;
  appsRestored: Array<{ appId: string; title: string }>;
  tabsRestored: number;
  notesSummary?: string;
  source: 'cloud' | 'local';
}

const CONTEXT_DOMAIN = 'context_graph';

function isWorkContext(value: unknown): value is WorkContext {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as WorkContext).projectId === 'string' &&
    Array.isArray((value as WorkContext).browserTabs)
  );
}

/** Pick the freshest valid context out of arbitrary record payloads. */
export function pickLatestContext(data: unknown): WorkContext | null {
  const candidates: WorkContext[] = [];

  if (isWorkContext(data)) {
    candidates.push(data);
  } else if (data && typeof data === 'object') {
    // ContextGraph shape: { contexts: Record<string, WorkContext> }
    const maybeGraph = data as { contexts?: Record<string, unknown> };
    if (maybeGraph.contexts && typeof maybeGraph.contexts === 'object') {
      for (const entry of Object.values(maybeGraph.contexts)) {
        if (isWorkContext(entry)) candidates.push(entry);
      }
    }
    // Legacy array-of-checkpoints shape
    if (Array.isArray(data)) {
      for (const entry of data) {
        if (isWorkContext(entry)) candidates.push(entry);
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  return candidates[0] ?? null;
}

/**
 * Fetch the most recent checkpoint. Tries cloud first (works for both
 * authenticated and capability-token sessions), then falls back to the
 * local IndexedDB domain copy.
 */
export async function fetchLatestCheckpoint(capabilityToken?: string): Promise<{
  context: WorkContext | null;
  source: 'cloud' | 'local';
}> {
  // 1. Cloud pull
  try {
    const headers: Record<string, string> = {};
    if (capabilityToken) headers['x-capability-token'] = capabilityToken;

    const res = await fetch(`/api/context/pull?domains=${CONTEXT_DOMAIN}`, { headers });
    if (res.ok) {
      const body = await res.json();
      const records = body?.data?.domains as
        | Array<{ domain: string; data: unknown }>
        | undefined;

      const match = records?.find((r) => r.domain === CONTEXT_DOMAIN);
      const ctx = match ? pickLatestContext(match.data) : null;
      if (ctx) return { context: ctx, source: 'cloud' };
    }
  } catch {
    // fall through to local
  }

  // 2. Local IDB fallback (same-device restore)
  try {
    const { readDomain } = await import('@/lib/context-layer');
    const local = await readDomain<unknown>(CONTEXT_DOMAIN);
    const ctx = pickLatestContext(local);
    if (ctx) return { context: ctx, source: 'local' };
  } catch {}

  return { context: null, source: 'cloud' };
}

/**
 * Apply a checkpoint to the live OS stores.
 */
export async function hydrateWorkspace(context: WorkContext): Promise<HydrationSummary> {
  const summary: HydrationSummary = {
    restoredAt: new Date().toISOString(),
    checkpointAt: context.updatedAt,
    projectName: context.projectName,
    appsRestored: [],
    tabsRestored: 0,
    notesSummary: context.notesSummary,
    source: 'cloud',
  };

  // 1. Restore OS windows/apps
  const openApps = context.editor?.openApps ?? [];
  let restoredCount = 0;
  for (const app of openApps.slice(0, 8)) {
    if (!app.appId || app.appId === 'settings') continue;
    try {
      useWindowStore.getState().openWindow(app.appId, app.title);
      summary.appsRestored.push(app);
      restoredCount++;
      if (restoredCount >= 6) break; // keep restore light on guest machines
    } catch {}
  }

  // 2. Restore browser tabs into the Power Browser
  const tabs = context.browserTabs ?? [];
  if (tabs.length > 0) {
    const now = Date.now();
    const hydratedTabs = tabs.slice(0, 10).map((t, i) => ({
      id: `restored-${now}-${i}`,
      url: t.url,
      title: t.title,
      history: [t.url],
      historyIndex: 0,
    }));

    const state = useBrowserStore.getState();
    const existing = state.tabs ?? [];
    useBrowserStore.setState({
      tabs: [...existing, ...hydratedTabs],
      activeTabId:
        existing[existing.length - 1]?.id ??
        hydratedTabs[hydratedTabs.length - 1]?.id ??
        state.activeTabId,
    });
    summary.tabsRestored = hydratedTabs.length;

    // Make sure the browser app itself is available to show them
    if (summary.tabsRestored > 0 && !summary.appsRestored.some((a) => a.appId === 'browser')) {
      try {
        useWindowStore.getState().openWindow('browser', 'Power Browser');
        summary.appsRestored.push({ appId: 'browser', title: 'Power Browser' });
      } catch {}
    }
  }

  return summary;
}

/**
 * Convenience: pull + hydrate in one call.
 */
export async function restoreLatestSession(
  capabilityToken?: string
): Promise<{ ok: boolean; summary?: HydrationSummary }> {
  const { context, source } = await fetchLatestCheckpoint(capabilityToken);
  if (!context) return { ok: false };

  const summary = await hydrateWorkspace(context);
  summary.source = source;
  return { ok: true, summary };
}
