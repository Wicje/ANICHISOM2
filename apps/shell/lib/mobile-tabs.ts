/**
 * Mobile companion sync — same-origin session-cookie calls to the Context
 * Protocol (no new auth). Reads/writes the `browser` domain the desktop
 * browser syncs: tabs appended here are adopted by desktop pull-merge.
 */
export interface MobileTab {
  url: string;
  title: string;
}

export interface MobileWorkspace {
  name: string;
  tabs: MobileTab[];
}

const DEVICE_KEY = "continua-mobile-device-id";

export function mobileDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = "mob-" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "mob-unknown";
  }
}

interface BrowserRecord {
  data?: { tabs?: MobileTab[]; active?: string | null };
  version?: number;
}

async function pullBrowser(): Promise<{ tabs: MobileTab[]; version: number }> {
  const res = await fetch("/api/context/pull?domains=browser", { credentials: "same-origin" });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(`pull failed (${res.status})`);
  const body = await res.json();
  const records: BrowserRecord[] = body?.data?.records || body?.data?.domains || body?.data || [];
  const rec = Array.isArray(records) ? records.find((r) => (r as { domain?: string }).domain === "browser") || records[0] : records;
  return { tabs: rec?.data?.tabs || [], version: rec?.version || 0 };
}

export async function loadTabs(): Promise<MobileTab[]> {
  return (await pullBrowser()).tabs;
}

export async function loadWorkspaces(): Promise<MobileWorkspace[]> {
  const res = await fetch("/api/context/pull?domains=browser", { credentials: "same-origin" });
  if (!res.ok) throw new Error("pull failed");
  const body = await res.json();
  const records: Array<{ domain?: string; data?: { workspaces?: MobileWorkspace[] } }> =
    body?.data?.records || body?.data?.domains || body?.data || [];
  const rec = Array.isArray(records) ? records.find((r) => r.domain === "browser") || records[0] : records;
  return rec?.data?.workspaces || [];
}

/** Open a whole workspace on desktop: push its tabs (merge adopts them). */
export async function openWorkspaceOnDesktop(ws: MobileWorkspace): Promise<void> {
  const { tabs, version } = await pullBrowser();
  const have = new Set(tabs.map((t) => t.url));
  const merged = [...tabs, ...ws.tabs.filter((t) => t.url && !have.has(t.url))];
  const res = await fetch("/api/context/save", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      domain: "browser",
      data: { tabs: merged },
      version: version > 0 ? version : 1,
      deviceId: mobileDeviceId(),
    }),
  });
  if (!res.ok) throw new Error(`save failed (${res.status})`);
}

/** Append a tab so desktop pull-merge adopts it (send-to-desktop). */
export async function pushTab(url: string, title?: string): Promise<void> {
  const clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) throw new Error("Enter an http(s) URL");
  // Re-pull for a fresh version right before writing (cheap race guard).
  const { tabs, version } = await pullBrowser();
  if (tabs.some((t) => t.url === clean)) return; // already there
  const res = await fetch("/api/context/save", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      domain: "browser",
      data: { tabs: [...tabs, { url: clean, title: title?.trim() || clean }] },
      version: version > 0 ? version : 1,
      deviceId: mobileDeviceId(),
    }),
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(`save failed (${res.status})`);
}
