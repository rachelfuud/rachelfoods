// Service Worker for offline support and push notifications
// This enables the "Install App" prompt on mobile and desktop

const CACHE_NAME = 'rachelfoods-v1';
const urlsToCache = [
    '/',
    '/catalog',
    '/orders',
    '/offline',
];

// Install service worker and cache essential resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

// Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request).catch(() => {
                    // Show offline page if both cache and network fail
                    if (event.request.mode === 'navigate') {
                        return caches.match('/offline');
                    }
                });
            })
    );
});

// Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Push notification handler
self.addEventListener('push', (event) => {
    const data = event.data.json();

    const options = {
        body: data.body,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/',
        },
        actions: [
            { action: 'view', title: 'View Order' },
            { action: 'close', title: 'Close' },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});
