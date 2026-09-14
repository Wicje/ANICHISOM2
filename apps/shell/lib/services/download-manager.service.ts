/**
 * Download Manager — routes browser downloads into the OS file system.
 *
 * Files land in `Downloads/` inside the OS virtual FS (OPFS with IndexedDB
 * fallback) and are tracked by the downloads store. Sources:
 *   - Same-origin proxy links (Power Browser without extension)
 *   - Extension content-script messages (blocked sites with extension)
 */
import { FS } from '@/lib/fs';
import { useDownloadsStore, DownloadItem } from '@/lib/stores/downloads.store';

const DOWNLOADS_DIR = 'Downloads';

const FILE_EXT_RE = /\.(pdf|zip|tar|gz|tgz|rar|7z|bz2|png|jpe?g|gif|webp|svg|bmp|ico|tiff?|mp[34]|mov|webm|mkv|avi|flac|wav|ogg|aac|docx?|xlsx?|pptx?|odt|ods|csv|txt|rtf|md|psd|ai|fig|figma|sketch|ttf|otf|woff2?|eot|json|xml|apk|ipa|exe|msi|dmg|deb|rpm)$/i;

const activeControllers = new Map<string, AbortController>();

function notify(detail: { title: string; description?: string; type: 'success' | 'error' | 'info' }) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('os:notify', { detail }));
}

/** Does the URL point at something that looks like a downloadable file? */
export function looksLikeDownloadUrl(url: string): boolean {
  try {
    return FILE_EXT_RE.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

/** Best-effort filename derived from a URL path. */
export function filenameFromUrl(url: string, fallback = 'download'): string {
  try {
    const pathname = new URL(url).pathname;
    const base = pathname.split('/').filter(Boolean).pop();
    if (base && base.includes('.')) {
      try {
        return decodeURIComponent(base);
      } catch {
        return base;
      }
    }
  } catch {
    // fall through
  }
  return fallback;
}

/** Strip characters unsafe for file names. */
export function safeFilename(name: string): string {
  const cleaned = name.replace(/[/\\:*?"<>|\u0000-\u001f]/g, '_').trim();
  return cleaned || 'download';
}

/** Pick a name that doesn't collide with existing files in the folder. */
export async function uniqueFilename(dir: string, name: string): Promise<string> {
  const existing = new Set<string>();
  try {
    const entries = await FS.readDir(dir);
    for (const entry of entries) existing.add(entry.name.toLowerCase());
  } catch {
    // empty folder
  }
  if (!existing.has(name.toLowerCase())) return name;
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  for (let i = 1; i < 1000; i++) {
    const candidate = `${base} (${i})${ext}`;
    if (!existing.has(candidate.toLowerCase())) return candidate;
  }
  return `${base}-${Date.now()}${ext}`;
}

/** A blob that's actually the proxy's error page (status 200 HTML). */
export async function blobIsProxyError(blob: Blob): Promise<boolean> {
  if (!blob.type.includes('text/html')) return false;
  let text = '';
  try {
    text = await blob.slice(0, 2048).text();
  } catch {
    return false;
  }
  return text.includes('<!DOCTYPE html>') &&
    /Proxy Error|Load Failed|Rate Limited|Not Logged In|Redirect Blocked|Fetch Failed|No URL|Invalid URL|Blocked/.test(text);
}

/**
 * Start an in-OS download by fetching the resource through the server proxy
 * (avoids CORS) and writing it to the OS file system.
 */
export async function startDownload(
  url: string,
  opts?: { filename?: string; mimeType?: string },
): Promise<string | null> {
  if (!url) return null;
  const store = useDownloadsStore.getState();

  // Dedupe in-flight downloads of the same URL.
  const active = store.downloads.find(d => d.url === url && (d.status === 'downloading' || d.status === 'queued'));
  if (active) return active.id;

  const filename = safeFilename(opts?.filename || filenameFromUrl(url, 'download'));
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `dl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const item: DownloadItem = {
    id,
    url,
    filename,
    mimeType: opts?.mimeType || '',
    status: 'downloading',
    progress: 0,
    receivedBytes: 0,
    totalBytes: 0,
    addedAt: Date.now(),
  };
  store.addDownload(item);
  notify({ title: 'Download Started', description: filename, type: 'info' });

  const controller = new AbortController();
  activeControllers.set(id, controller);

  try {
    const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    if (!res.body) throw new Error('No response body');

    const contentType = res.headers.get('content-type') || '';
    const mimeType = opts?.mimeType || contentType.split(';')[0]?.trim() || '';
    const totalBytes = Number(res.headers.get('content-length') || 0);

    const reader = res.body.getReader();
    const chunks: BlobPart[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.byteLength;
        if (totalBytes > 0) {
          store.updateDownload(id, {
            receivedBytes: received,
            progress: Math.min(99, Math.round((received / totalBytes) * 100)),
          });
        } else {
          store.updateDownload(id, { receivedBytes: received });
        }
      }
    }

    const blob = new Blob(chunks, { type: mimeType });
    if (await blobIsProxyError(blob)) {
      throw new Error('The server could not be reached for this download.');
    }

    await FS.mkdir(DOWNLOADS_DIR);
    const finalName = await uniqueFilename(DOWNLOADS_DIR, filename);
    const filePath = `${DOWNLOADS_DIR}/${finalName}`;
    await FS.write(filePath, blob, mimeType);

    store.updateDownload(id, {
      status: 'done',
      progress: 100,
      receivedBytes: blob.size,
      totalBytes: blob.size,
      filename: finalName,
      filePath,
      mimeType,
      completedAt: Date.now(),
    });
    notify({ title: 'Download Complete', description: finalName, type: 'success' });
    return id;
  } catch (e: unknown) {
    const aborted = e instanceof DOMException ? e.name === 'AbortError' : false;
    store.updateDownload(id, {
      status: 'error',
      error: aborted ? 'Cancelled' : e instanceof Error ? e.message : 'Download failed',
    });
    notify({ title: aborted ? 'Download Cancelled' : 'Download Failed', description: filename, type: 'error' });
    return null;
  } finally {
    activeControllers.delete(id);
  }
}

/** Persist a blob received directly (e.g. extension blob capture). */
export async function saveBlobDownload(opts: {
  blob: Blob;
  filename: string;
  mimeType?: string;
  url?: string;
}): Promise<string | null> {
  try {
    const filename = safeFilename(opts.filename || 'download');
    const mimeType = opts.mimeType || opts.blob.type || '';
    await FS.mkdir(DOWNLOADS_DIR);
    const finalName = await uniqueFilename(DOWNLOADS_DIR, filename);
    const filePath = `${DOWNLOADS_DIR}/${finalName}`;
    await FS.write(filePath, opts.blob, mimeType);

    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `dl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    useDownloadsStore.getState().addDownload({
      id,
      url: opts.url || '',
      filename: finalName,
      mimeType,
      status: 'done',
      progress: 100,
      receivedBytes: opts.blob.size,
      totalBytes: opts.blob.size,
      filePath,
      addedAt: Date.now(),
      completedAt: Date.now(),
    });
    notify({ title: 'Download Complete', description: finalName, type: 'success' });
    return id;
  } catch (e: unknown) {
    notify({ title: 'Download Failed', description: opts.filename || 'download', type: 'error' });
    return null;
  }
}

/** Abort an in-flight download. */
export function cancelDownload(id: string): void {
  activeControllers.get(id)?.abort();
}

/** Remove a failed download and start it again. */
export function retryDownload(id: string): void {
  const item = useDownloadsStore.getState().downloads.find(d => d.id === id);
  if (!item || !item.url) return;
  useDownloadsStore.getState().removeDownload(id);
  void startDownload(item.url, { filename: item.filename, mimeType: item.mimeType });
}
