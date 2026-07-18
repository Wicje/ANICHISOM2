/**
 * ContinuaOS OS — Service Worker
 *
 * Strategy:
 * - Static assets (_next/static/*): Cache-first (immutable content)
 * - App shell (pages, chunks): Stale-while-revalidate
 * - API calls: Network-only (no caching)
 * - Images/media: Cache-first with network fallback
 * - Offline fallback: Serves /offline.html when network unavailable
 *
 * Background Sync: Queues failed POST/PUT/DELETE requests and replays on reconnect.
 */

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `continuaos-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `continuaos-runtime-${CACHE_VERSION}`;
const OFFLINE_CACHE = `continuaos-offline-${CACHE_VERSION}`;
const SYNC_QUEUE_CACHE = `continuaos-sync-queue`;

// Assets to precache on install (app shell)
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
];

// ─── Install ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
      caches.open(OFFLINE_CACHE).then((cache) => cache.add('/offline.html')),
    ])
  );
});

// ─── Activate ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, RUNTIME_CACHE, OFFLINE_CACHE, SYNC_QUEUE_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip HMR and webpack internals
  if (url.pathname.includes('_next/webpack')) return;

  // API calls: network-only
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkOnly(request));
    return;
  }

  // Static assets (_next/static): cache-first (immutable)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Images: cache-first with network fallback
  if (request.destination === 'image' || /\.(png|jpg|jpeg|gif|svg|webp|ico)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  // Fonts: cache-first
  if (request.destination === 'font' || /\.(woff|woff2|ttf|otf|eot)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // JS/CSS chunks: stale-while-revalidate
  if (request.destination === 'script' || request.destination === 'style' ||
      url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // Navigation requests: stale-while-revalidate with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(navigationWithOfflineFallback(request));
    return;
  }

  // Everything else: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});

// ─── Background Sync ────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'continuaos-sync') {
    event.waitUntil(replaySyncQueue());
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_QUEUE_ADD') {
    event.waitUntil(addToSyncQueue(event.data.payload));
  }
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Cache Strategies ───────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(JSON.stringify({ error: 'Offline', message: 'Network unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function navigationWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Serve offline fallback page
    const offlinePage = await caches.match('/offline.html');
    return offlinePage || new Response('Offline', { status: 503 });
  }
}

// ─── Background Sync Queue ──────────────────────────────────

async function addToSyncQueue(payload) {
  const cache = await caches.open(SYNC_QUEUE_CACHE);
  const existing = await cache.match('sync-queue');
  const queue = existing ? await existing.json() : [];
  queue.push({
    ...payload,
    timestamp: Date.now(),
    id: crypto.randomUUID(),
  });
  const response = new Response(JSON.stringify(queue));
  await cache.put('sync-queue', response);

  // Register background sync if available
  if ('sync' in self.registration) {
    await self.registration.sync.register('continuaos-sync');
  }
}

async function replaySyncQueue() {
  const cache = await caches.open(SYNC_QUEUE_CACHE);
  const existing = await cache.match('sync-queue');
  if (!existing) return;

  const queue = await existing.json();
  const failed = [];

  for (const entry of queue) {
    try {
      const response = await fetch(entry.url, {
        method: entry.method || 'POST',
        headers: entry.headers || { 'Content-Type': 'application/json' },
        body: entry.body ? JSON.stringify(entry.body) : undefined,
      });

      if (!response.ok) {
        failed.push(entry);
      }
    } catch {
      failed.push(entry);
    }
  }

  // Keep only failed entries (with retry limit)
  const retriable = failed.filter((e) => (e.retries || 0) < 5).map((e) => ({ ...e, retries: (e.retries || 0) + 1 }));
  const response = new Response(JSON.stringify(retriable));
  await cache.put('sync-queue', response);

  // Notify clients about sync status
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_COMPLETE',
      remaining: retriable.length,
      total: queue.length,
    });
  });
}
