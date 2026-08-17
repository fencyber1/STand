// Service Worker for STand - Offline Support
// This service worker provides offline caching for static assets and API responses

const CACHE_NAME = 'stand-v1';
const STATIC_CACHE_NAME = 'stand-static-v1';
const DYNAMIC_CACHE_NAME = 'stand-dynamic-v1';
const API_CACHE_NAME = 'stand-api-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first, then network
  cacheFirst: async (request: Request, cacheName: string) => {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      return new Response('Offline', { status: 503 });
    }
  },
  
  // Network first, then cache
  networkFirst: async (request: Request, cacheName: string) => {
    const cache = await caches.open(cacheName);
    
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      return new Response(JSON.stringify({ error: 'Offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
  
  // Stale while revalidate
  staleWhileRevalidate: async (request: Request, cacheName: string) => {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request).then(async (networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    });
    
    return cachedResponse || fetchPromise;
  },
};

// Install event - cache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // Force activation
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME &&
                   cacheName !== STATIC_CACHE_NAME &&
                   cacheName !== DYNAMIC_CACHE_NAME &&
                   cacheName !== API_CACHE_NAME;
          })
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  
  self.clients.claim();
});

// Fetch event - handle requests with appropriate caching strategy
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // API requests - network first with cache fallback
  if (url.pathname.startsWith('/api/') || url.hostname.includes('firestore.googleapis.com')) {
    event.respondWith(
      CACHE_STRATEGIES.networkFirst(request, API_CACHE_NAME)
    );
    return;
  }
  
  // Static assets - cache first
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/)) {
    event.respondWith(
      CACHE_STRATEGIES.cacheFirst(request, STATIC_CACHE_NAME)
    );
    return;
  }
  
  // HTML pages - stale while revalidate
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      CACHE_STRATEGIES.staleWhileRevalidate(request, DYNAMIC_CACHE_NAME)
    );
    return;
  }
  
  // Default - network first
  event.respondWith(
    CACHE_STRATEGIES.networkFirst(request, DYNAMIC_CACHE_NAME)
  );
});

// Background sync for offline mutations
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-announcements') {
    event.waitUntil(syncAnnouncements());
  } else if (event.tag === 'sync-attendance') {
    event.waitUntil(syncAttendance());
  } else if (event.tag === 'sync-assessments') {
    event.waitUntil(syncAssessments());
  }
});

// Push notifications
self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() || {};
  
  const options: NotificationOptions = {
    body: data.body || 'New notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Dismiss' },
    ],
    vibrate: [200, 100, 200],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'STand', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data || '/')
    );
  }
});

// Offline queue for mutations
const OFFLINE_QUEUE_KEY = 'stand-offline-queue';

async function saveOfflineMutation(mutation: any) {
  const cache = await caches.open('stand-offline-queue');
  const key = `mutation-${Date.now()}-${Math.random()}`;
  await cache.put(key, new Response(JSON.stringify(mutation)));
}

async function processOfflineQueue() {
  const cache = await caches.open('stand-offline-queue');
  const keys = await cache.keys();
  
  for (const key of keys) {
    const response = await cache.match(key);
    const mutation = await response.json();
    
    try {
      await fetch(mutation.url, {
        method: mutation.method,
        headers: mutation.headers,
        body: mutation.body,
      });
      await cache.delete(key);
    } catch (error) {
      console.error('Failed to process offline mutation:', error);
    }
  }
}

async function syncAnnouncements() {
  // Sync offline announcements when back online
  await processOfflineQueue();
}

async function syncAttendance() {
  // Sync offline attendance
  await processOfflineQueue();
}

async function syncAssessments() {
  // Sync offline assessments
  await processOfflineQueue();
}

// Listen for online event
self.addEventListener('online', () => {
  processOfflineQueue();
});