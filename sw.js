const CACHE_NAME = 'vertical-jumper-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/src/main.js',
    '/src/style.css',
    '/src/game/Game.js',
    '/src/game/Player.js',
    '/src/game/World.js',
    '/src/game/Camera.js',
    '/src/game/Input.js',
    '/src/game/Particles.js',
    '/src/game/Menu.js',
    '/src/game/TrajectoryPreview.js',
    '/src/game/Constants.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
