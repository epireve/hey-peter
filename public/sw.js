/**
 * Service Worker for Hey Peter Academy LMS
 * Provides offline caching, background sync, and push notifications
 */

const CACHE_NAME = 'hpa-cache-v1';
const STATIC_CACHE = 'hpa-static-v1';
const API_CACHE = 'hpa-api-v1';
const IMAGE_CACHE = 'hpa-images-v1';

// Cache strategies configuration
const CACHE_STRATEGIES = {
  static: {
    name: STATIC_CACHE,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 100
  },
  api: {
    name: API_CACHE,
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 50,
    staleWhileRevalidate: true
  },
  images: {
    name: IMAGE_CACHE,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 200
  }
};

// Critical resources to cache immediately
const CRITICAL_RESOURCES = [
  '/',
  '/dashboard',
  '/login',
  '/manifest.json',
  '/favicon.ico'
];

// API endpoints that should be cached
const CACHEABLE_API_PATTERNS = [
  /\/api\/students$/,
  /\/api\/teachers$/,
  /\/api\/courses$/,
  /\/api\/analytics\/.*$/,
  /\/api\/user\/preferences$/
];

// Resources that should use network-first strategy
const NETWORK_FIRST_PATTERNS = [
  /\/api\/auth\/.*$/,
  /\/api\/real-time\/.*$/,
  /\/api\/upload\/.*$/
];

/**
 * Install event - cache critical resources
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching critical resources');
        return cache.addAll(CRITICAL_RESOURCES);
      })
      .then(() => {
        console.log('[SW] Critical resources cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache critical resources:', error);
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!Object.values(CACHE_STRATEGIES).some(strategy => strategy.name === cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients
      self.clients.claim()
    ])
  );
});

/**
 * Fetch event - handle all network requests
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Determine cache strategy based on request type
  if (isStaticResource(url)) {
    event.respondWith(cacheFirst(request, CACHE_STRATEGIES.static));
  } else if (isApiRequest(url)) {
    if (shouldUseNetworkFirst(url)) {
      event.respondWith(networkFirst(request, CACHE_STRATEGIES.api));
    } else if (isCacheableApi(url)) {
      event.respondWith(staleWhileRevalidate(request, CACHE_STRATEGIES.api));
    } else {
      event.respondWith(networkOnly(request));
    }
  } else if (isImageRequest(url)) {
    event.respondWith(cacheFirst(request, CACHE_STRATEGIES.images));
  } else {
    event.respondWith(networkFirst(request, CACHE_STRATEGIES.static));
  }
});

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-attendance') {
    event.waitUntil(syncAttendanceData());
  } else if (event.tag === 'background-sync-preferences') {
    event.waitUntil(syncUserPreferences());
  }
});

/**
 * Push notification handler
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'You have new updates in Hey Peter Academy',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: {},
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      options.body = payload.body || options.body;
      options.data = payload.data || {};
    } catch (error) {
      console.error('[SW] Error parsing push payload:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification('Hey Peter Academy', options)
  );
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow('/dashboard');
        }
      })
    );
  }
});

// ============================================================================
// Cache Strategy Implementations
// ============================================================================

/**
 * Cache First strategy - check cache first, fallback to network
 */
async function cacheFirst(request, strategy) {
  try {
    const cache = await caches.open(strategy.name);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isExpired(cachedResponse, strategy.maxAge)) {
      console.log('[SW] Cache hit:', request.url);
      return cachedResponse;
    }
    
    console.log('[SW] Cache miss, fetching from network:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
      await cleanupCache(cache, strategy.maxEntries);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first error:', error);
    
    // Try to return stale cache as fallback
    const cache = await caches.open(strategy.name);
    const staleResponse = await cache.match(request);
    if (staleResponse) {
      console.log('[SW] Returning stale cache due to error:', request.url);
      return staleResponse;
    }
    
    throw error;
  }
}

/**
 * Network First strategy - try network first, fallback to cache
 */
async function networkFirst(request, strategy) {
  try {
    console.log('[SW] Network first for:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(strategy.name);
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
      await cleanupCache(cache, strategy.maxEntries);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cache = await caches.open(strategy.name);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Cache fallback hit:', request.url);
      return cachedResponse;
    }
    
    console.error('[SW] Network first complete failure:', error);
    throw error;
  }
}

/**
 * Stale While Revalidate strategy - return cache immediately, update in background
 */
async function staleWhileRevalidate(request, strategy) {
  const cache = await caches.open(strategy.name);
  const cachedResponse = await cache.match(request);
  
  // Start network request immediately (don't await)
  const networkPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
      await cleanupCache(cache, strategy.maxEntries);
    }
    return networkResponse;
  }).catch((error) => {
    console.error('[SW] Background revalidation failed:', error);
  });
  
  // Return cached response immediately if available
  if (cachedResponse && !isExpired(cachedResponse, strategy.maxAge)) {
    console.log('[SW] Stale while revalidate cache hit:', request.url);
    return cachedResponse;
  }
  
  // No cache or expired, wait for network
  console.log('[SW] No cache, waiting for network:', request.url);
  return networkPromise;
}

/**
 * Network Only strategy - always use network
 */
async function networkOnly(request) {
  console.log('[SW] Network only for:', request.url);
  return fetch(request);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if URL is a static resource
 */
function isStaticResource(url) {
  return url.pathname.match(/\.(js|css|woff|woff2|ttf|eot|ico)$/) ||
         url.pathname === '/' ||
         url.pathname.startsWith('/_next/static/');
}

/**
 * Check if URL is an API request
 */
function isApiRequest(url) {
  return url.pathname.startsWith('/api/') || 
         url.hostname !== self.location.hostname;
}

/**
 * Check if URL is an image request
 */
function isImageRequest(url) {
  return url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp)$/);
}

/**
 * Check if API should use network-first strategy
 */
function shouldUseNetworkFirst(url) {
  return NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname));
}

/**
 * Check if API should be cached
 */
function isCacheableApi(url) {
  return CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname));
}

/**
 * Check if cached response is expired
 */
function isExpired(response, maxAge) {
  const date = response.headers.get('date');
  if (!date) return false;
  
  const responseTime = new Date(date).getTime();
  const now = Date.now();
  
  return (now - responseTime) > maxAge;
}

/**
 * Clean up old cache entries
 */
async function cleanupCache(cache, maxEntries) {
  if (!maxEntries) return;
  
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  
  // Sort by request URL to have consistent cleanup
  keys.sort((a, b) => a.url.localeCompare(b.url));
  
  // Remove oldest entries
  const keysToDelete = keys.slice(0, keys.length - maxEntries);
  await Promise.all(keysToDelete.map(key => cache.delete(key)));
  
  console.log(`[SW] Cleaned up ${keysToDelete.length} cache entries`);
}

/**
 * Sync attendance data when online
 */
async function syncAttendanceData() {
  try {
    // This would integrate with IndexedDB to sync offline attendance data
    console.log('[SW] Syncing attendance data...');
    
    // Implementation would depend on your offline storage strategy
    // const offlineData = await getOfflineAttendanceData();
    // await uploadAttendanceData(offlineData);
    
    console.log('[SW] Attendance data synced');
  } catch (error) {
    console.error('[SW] Failed to sync attendance data:', error);
    throw error;
  }
}

/**
 * Sync user preferences when online
 */
async function syncUserPreferences() {
  try {
    console.log('[SW] Syncing user preferences...');
    
    // Implementation would sync cached preferences with server
    // const preferences = await getOfflinePreferences();
    // await uploadPreferences(preferences);
    
    console.log('[SW] User preferences synced');
  } catch (error) {
    console.error('[SW] Failed to sync user preferences:', error);
    throw error;
  }
}

// ============================================================================
// Cache Management API for client communication
// ============================================================================

/**
 * Handle messages from the main thread
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'CACHE_INVALIDATE':
      handleCacheInvalidation(payload);
      break;
    case 'CACHE_WARM':
      handleCacheWarming(payload);
      break;
    case 'CACHE_STATS':
      handleCacheStats().then(stats => {
        event.ports[0].postMessage(stats);
      });
      break;
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

/**
 * Invalidate cache entries matching pattern
 */
async function handleCacheInvalidation(pattern) {
  try {
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      for (const key of keys) {
        if (key.url.includes(pattern)) {
          await cache.delete(key);
          console.log('[SW] Invalidated cache entry:', key.url);
        }
      }
    }
  } catch (error) {
    console.error('[SW] Cache invalidation error:', error);
  }
}

/**
 * Warm cache with specified URLs
 */
async function handleCacheWarming(urls) {
  try {
    console.log('[SW] Warming cache for URLs:', urls);
    
    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          // Cache based on URL pattern
          let cacheName = STATIC_CACHE;
          if (url.includes('/api/')) {
            cacheName = API_CACHE;
          } else if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
            cacheName = IMAGE_CACHE;
          }
          
          const cache = await caches.open(cacheName);
          await cache.put(url, response);
        }
      } catch (error) {
        console.error('[SW] Failed to warm cache for:', url, error);
      }
    }
    
    console.log('[SW] Cache warming completed');
  } catch (error) {
    console.error('[SW] Cache warming error:', error);
  }
}

/**
 * Get cache statistics
 */
async function handleCacheStats() {
  try {
    const stats = {
      caches: {},
      totalSize: 0,
      totalEntries: 0
    };
    
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      stats.caches[cacheName] = {
        entries: keys.length,
        urls: keys.map(key => key.url)
      };
      
      stats.totalEntries += keys.length;
    }
    
    return stats;
  } catch (error) {
    console.error('[SW] Error getting cache stats:', error);
    return { error: error.message };
  }
}