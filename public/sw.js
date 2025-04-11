const CACHE_NAME = 'inventassist-cache-v1';
const urlsToCache = [
  '/',
  '/manifest.json'
];

// Install event - cache the app shell
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return Promise.all(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Failed to cache ${url}:`, err);
              return Promise.resolve(); // Continue even if one file fails
            })
          )
        );
      })
      .then(() => {
        console.log('Service Worker: App shell cached');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip caching for Chrome extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Skip caching for non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip caching for non-http(s) requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  console.log('Service Worker: Fetching', event.request.url);
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          console.log('Service Worker: Serving from cache', event.request.url);
          return response;
        }
        console.log('Service Worker: Fetching from network', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the new response
            caches.open(CACHE_NAME)
              .then((cache) => {
                console.log('Service Worker: Caching new response', event.request.url);
                cache.put(event.request, responseToCache).catch(err => {
                  console.warn('Failed to cache response:', err);
                });
              });

            return response;
          })
          .catch(err => {
            console.warn('Fetch failed:', err);
            return new Response('Network error occurred', {
              status: 408,
              statusText: 'Network error'
            });
          });
      })
  );
}); 