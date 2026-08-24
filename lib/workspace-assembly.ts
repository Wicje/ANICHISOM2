/**
 * Continua Workspace Assembly — client side (Phase H)
 *
 * Applies an org role manifest to the live OS stores at boot. Idempotent:
 * app installs and web-app additions dedupe, so re-running on every boot is
 * safe. This module runs in the browser only — it must never import server
 * code (org-service etc.). The server already resolved the caller's seat;
 * we simply apply what it returned.
 */
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { writeDomain } from '@/lib/context-layer';

export interface AssemblyPayload {
  orgId: string;
  orgName: string;
  role: string;
  manifest: {
    displayName?: string;
    apps?: string[];
    links?: Array<{ title: string; url: string }>;
    aiContext?: { summary: string; tags?: string[] };
    projectTag?: string;
  };
}

export interface AssemblySummary {
  orgId: string;
  orgName: string;
  role: string;
  appsInstalled: string[];
  linksAdded: number;
  aiContextSeeded: boolean;
}

const ACTIVE_ORG_KEY = 'continua_active_org';

export function getActiveOrgId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ORG_KEY);
  } catch {
    return null;
  }
}

/**
 * Boot-time assembly: resolve the user's org memberships, pick the active
 * org (stored preference or first), fetch the derived workspace, apply it.
 * Silent no-op when unauthenticated, org-less, or offline.
 */
export async function assembleOnBoot(): Promise<AssemblySummary | null> {
  try {
    const orgsRes = await fetch('/api/orgs');
    if (!orgsRes.ok) return null;
    const { data: orgs } = await orgsRes.json();
    if (!Array.isArray(orgs) || orgs.length === 0) return null;

    const preferred = getActiveOrgId();
    const org =
      orgs.find((o: { id: string }) => o.id === preferred) ?? orgs[0];

    const res = await fetch(`/api/orgs/${org.id}/assemble`);
    if (!res.ok) return null; // seat revoked mid-session → nothing to apply
    const { data }: { data: AssemblyPayload } = await res.json();

    return await applyAssembly(data);
  } catch (e) {
    console.warn('[assembly] boot assembly skipped:', e);
    return null;
  }
}

/** Apply a manifest payload to live stores. Exported for direct use/tests. */
export async function applyAssembly(payload: AssemblyPayload): Promise<AssemblySummary> {
  const ws = useWorkspaceStore.getState();
  const summary: AssemblySummary = {
    orgId: payload.orgId,
    orgName: payload.orgName,
    role: payload.role,
    appsInstalled: [],
    linksAdded: 0,
    aiContextSeeded: false,
  };

  // 1. Install the role's Continua apps (dedupe handled by store).
  for (const appId of payload.manifest.apps ?? []) {
    ws.installApp(appId);
    summary.appsInstalled.push(appId);
  }

  // 2. Assemble web resources as custom web apps (dedup by id = origin slug).
  for (const link of payload.manifest.links ?? []) {
    let host = link.url;
    try {
      host = new URL(link.url).hostname;
    } catch {}
    const id = `org-${payload.orgId.slice(0, 8)}-${host}`;
    const exists = useWorkspaceStore
      .getState()
      .customWebApps.some((a) => a.id === id || a.url === link.url);
    if (!exists) {
      ws.addCustomWebApp({ id, title: link.title, url: link.url, iconImage: `https://${host}/favicon.ico` });
      summary.linksAdded++;
    }
  }

  // 3. Seed AI context scope (cloud-synced via the registered ai_context domain).
  if (payload.manifest.aiContext) {
    await writeDomain('ai_context', {
      ...payload.manifest.aiContext,
      orgId: payload.orgId,
      role: payload.role,
      updatedAt: new Date().toISOString(),
    });
    summary.aiContextSeeded = true;
  }

  // 4. Remember which org this workspace was assembled from + agency scope.
  try {
    localStorage.setItem(ACTIVE_ORG_KEY, payload.orgId);
  } catch {}
  if (ws.workspaceMode !== 'agency') {
    ws.setWorkspaceMode('agency');
  }

  return summary;
}
