// Blessings Family App — Service Worker
// Caches the app shell so it loads instantly and works offline

const CACHE_NAME = 'blessings-v2';

// All the files that make up the app shell
const APP_SHELL = [
  '/Bless/',
  '/Bless/index.html',
  '/Bless/index.css',
  '/Bless/index.js',
  '/Bless/Manifest.json',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Poppins:wght@300;400;500;600&display=swap',
  'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800&fit=crop&q=80'
];

// ---- INSTALL: cache the app shell ----
self.addEventListener('install', function(event) {
  console.log('[SW] Installing Blessings...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Caching app shell');
      // Cache each file individually so one failure doesn't break everything
      return Promise.allSettled(
        APP_SHELL.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn('[SW] Could not cache:', url, err);
          });
        })
      );
    }).then(function() {
      // Activate immediately without waiting for old tabs to close
      return self.skipWaiting();
    })
  );
});

// ---- ACTIVATE: clean up old caches ----
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating Blessings...');
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(function() {
      // Take control of all open tabs immediately
      return self.clients.claim();
    })
  );
});

// ---- FETCH: serve from cache, fall back to network ----
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Let Firebase & Google Fonts requests go straight to network
  // (Firebase needs live data; fonts have their own cache)
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('googleapis.com/identitytoolkit') ||
    url.includes('securetoken.googleapis.com')
  ) {
    return; // Don't intercept — let browser handle normally
  }

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) {
        // Serve from cache, but also refresh in background (stale-while-revalidate)
        var networkFetch = fetch(event.request).then(function(response) {
          if (response && response.status === 200 && response.type !== 'opaque') {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, response.clone());
            });
          }
          return response;
        }).catch(function() { /* network failed, cached version already served */ });

        return cached;
      }

      // Not in cache — try network, cache it for next time
      return fetch(event.request).then(function(response) {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        var toCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, toCache);
        });
        return response;
      }).catch(function() {
        // Offline and not cached — return the app shell HTML as fallback
        if (event.request.destination === 'document') {
          return caches.match('/Bless/index.html');
        }
      });
    })
  );
});
