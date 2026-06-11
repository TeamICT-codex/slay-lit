/* SLAY LIT — service worker: network-first met cache-terugval.
   Online krijg je altijd de nieuwste versie; offline werkt het spel
   vanuit de cache. */
const CACHE = 'slayit-v4';
const BESTANDEN = [
  '.',
  'index.html',
  'css/style.css',
  'js/lib/three.min.js',
  'js/art.js',
  'js/audio.js',
  'js/scene3d.js',
  'js/data.js',
  'js/game.js',
  'assets/fonts/fonts.css',
  'assets/fonts/PirataOne-400-normal.woff2',
  'assets/fonts/Alegreya-400-normal.woff2',
  'assets/fonts/Alegreya-700-normal.woff2',
  'assets/fonts/Alegreya-400-italic.woff2',
  'assets/icoon.svg',
  'manifest.webmanifest'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BESTANDEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(sleutels => Promise.all(sleutels.filter(s => s !== CACHE).map(s => caches.delete(s))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(antwoord => {
        const kopie = antwoord.clone();
        caches.open(CACHE).then(c => c.put(e.request, kopie)).catch(() => {});
        return antwoord;
      })
      .catch(() => caches.match(e.request))
  );
});
