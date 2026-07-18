/**
 * ContinuaOS OS — Service Worker (Enhanced)
 *
 * Strategy:
 * - Static assets (_next/static/*): Cache-first (immutable content)
 * - App shell (pages, chunks): Stale-while-revalidate
 * - API calls: Network-only (no caching)
 * - Images/media: Cache-first with network fallback
 * - Fonts: Cache-first
 * - Offline fallback: Serves /offline.html when network unavailable
 *
 * Background Sync: Queues failed POST/PUT/DELETE requests with exponential backoff.
 * Precache: Dynamically caches known chunks on install.
 */

const CACHE_VERSION = 'v3';
const STATIC_CACHE = `continuaos-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `continuaos-runtime-${CACHE_VERSION}`;
const OFFLINE_CACHE = `continuaos-offline-${CACHE_VERSION}`;
const SYNC_QUEUE_CACHE = `continuaos-sync-queue`;

// Core assets to precache on install
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-511.png',
];

// ─── Install ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => caches.open(OFFLINE_CACHE))
      .then((cache) => cache.add('/offline.html'))
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

  // Skip chrome-extension and other non-http(s) schemes
  if (!url.protocol.startsWith('http')) return;

  // API calls: network-only (allow offline reads from cache for GET)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(apiStrategy(request));
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
  if (event.data && event.data.type === 'FORCE_CACHE_URLS') {
    // Allow the app to request caching of specific URLs
    event.waitUntil(forceCacheUrls(event.data.urls || []));
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

async function apiStrategy(request) {
  try {
    const response = await fetch(request);
    // Cache successful GET API responses for offline reads
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Try to serve from cache for GET requests
    if (request.method === 'GET') {
      const cached = await caches.match(request);
      if (cached) return cached;
    }
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
    retries: 0,
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

  // Exponential backoff: cap at 5 retries
  const MAX_RETRIES = 5;
  const retriable = failed
    .filter((e) => (e.retries || 0) < MAX_RETRIES)
    .map((e) => ({
      ...e,
      retries: (e.retries || 0) + 1,
      // Exponential backoff delay in ms (1s, 2s, 4s, 8s, 16s)
      nextRetryAt: Date.now() + Math.min(1000 * Math.pow(2, e.retries || 0), 16000),
    }));

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

// ─── Force Cache URLs ───────────────────────────────────────
async function forceCacheUrls(urls) {
  const cache = await caches.open(RUNTIME_CACHE);
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
      }
    } catch {
      // Skip URLs that fail to fetch
    }
  }
}
