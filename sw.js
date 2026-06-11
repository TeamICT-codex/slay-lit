/* SLAY LIT — service worker.
   Code (html/js/css): network-first — online krijg je altijd de nieuwste versie.
   Art (assets/): cache-first — afbeeldingen veranderen niet, dus herbezoeken
   laden vrijwel instant. Offline werkt alles vanuit de cache. */
const CACHE = 'slayit-v5';
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

  /* art is onveranderlijk: cache-first */
  if (e.request.url.includes('/assets/')) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(antwoord => {
        const kopie = antwoord.clone();
        caches.open(CACHE).then(c => c.put(e.request, kopie)).catch(() => {});
        return antwoord;
      }))
    );
    return;
  }

  /* code: network-first met cache-terugval */
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
