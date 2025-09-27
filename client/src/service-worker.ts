/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'business-platform-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
];

const API_CACHE_NAME = 'business-platform-api-v1';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirstWithCache(request)
    );
  }
  // Handle static assets with cache-first strategy
  else if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(
      cacheFirstWithNetwork(request)
    );
  }
  // Handle navigation with network-first, cache fallback
  else if (request.mode === 'navigate') {
    event.respondWith(
      networkFirstWithOfflinePage(request)
    );
  }
  // Handle other requests with network-first strategy
  else {
    event.respondWith(
      networkFirstWithCache(request)
    );
  }
});

// Network-first strategy with cache fallback
async function networkFirstWithCache(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());

      // Add expiry metadata
      const headers = new Headers(networkResponse.headers);
      headers.set('sw-cached-at', Date.now().toString());

      return networkResponse;
    }

    throw new Error('Network response not ok');
  } catch (error) {
    // Fall back to cache
    const cache = await caches.open(API_CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Check if cache is expired
      const cachedAt = cachedResponse.headers.get('sw-cached-at');
      if (cachedAt && Date.now() - parseInt(cachedAt) > CACHE_EXPIRY) {
        // Cache expired, but still return it if offline
        console.warn('Cache expired for', request.url);
      }
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html') || new Response('Offline');
    }

    throw error;
  }
}

// Cache-first strategy for static assets
async function cacheFirstWithNetwork(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }

  return networkResponse;
}

// Network-first with offline page fallback
async function networkFirstWithOfflinePage(request: Request): Promise<Response> {
  try {
    return await fetch(request);
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page
    return caches.match('/offline.html') || new Response(
      '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your connection and try again.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineActions());
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const payload = event.data.json();
    const options = {
      body: payload.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: payload.data,
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/pwa-192x192.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(payload.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    const url = event.notification.data?.url || '/';
    event.waitUntil(
      self.clients.openWindow(url)
    );
  }
});

// Sync offline actions when online
async function syncOfflineActions() {
  try {
    // Get offline actions from IndexedDB or localStorage
    // This is a placeholder for actual implementation
    const offlineActions = await getOfflineActions();

    for (const action of offlineActions) {
      try {
        await fetch(action.url, action.options);
        await removeOfflineAction(action.id);
      } catch (error) {
        console.error('Failed to sync action:', action, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Placeholder functions for offline action storage
async function getOfflineActions(): Promise<any[]> {
  // Implement IndexedDB or localStorage logic
  return [];
}

async function removeOfflineAction(id: string): Promise<void> {
  // Implement removal logic
}

export {};