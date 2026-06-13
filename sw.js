/* SLAY LIT — service worker.
   Code (html/js/css): network-first — online krijg je altijd de nieuwste versie.
   Art (assets/): cache-first — afbeeldingen veranderen niet, dus herbezoeken
   laden vrijwel instant. Offline werkt alles vanuit de cache. */
const CACHE = 'slayit-v7'; /* v7: herwerkte karakter-art (witresten weg) */
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
  'assets/icoon-180.png',
  'assets/icoon-192.png',
  'assets/icoon-512.png',
  'assets/icoon-512-maskable.png',
  'manifest.webmanifest'
];
/* NB: CACHE bewust op v7 gehouden — een gewijzigde sw.js her-installeert en
   voegt de nieuwe iconen aan de bestaande cache toe; een versiebump zou de
   hele art-cache wissen (onnodige her-download voor elke speler). */

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

  /* art is onveranderlijk: cache-first — maar bewaar NOOIT mislukte
     antwoorden (een gecachete 404 zou nieuwe art eeuwig blokkeren) */
  if (e.request.url.includes('/assets/')) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(antwoord => {
        if (antwoord.ok) {
          const kopie = antwoord.clone();
          caches.open(CACHE).then(c => c.put(e.request, kopie)).catch(() => {});
        }
        return antwoord;
      }))
    );
    return;
  }

  /* code: network-first met cache-terugval */
  e.respondWith(
    fetch(e.request)
      .then(antwoord => {
        if (antwoord.ok) {
          const kopie = antwoord.clone();
          caches.open(CACHE).then(c => c.put(e.request, kopie)).catch(() => {});
        }
        return antwoord;
      })
      .catch(() => caches.match(e.request))
  );
});
