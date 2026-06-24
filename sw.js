/* SLAY LIT — service worker.
   Code (html/js/css): network-first — online krijg je altijd de nieuwste versie.
   Art (assets/): cache-first — afbeeldingen veranderen niet, dus herbezoeken
   laden vrijwel instant. Offline werkt alles vanuit de cache. */
const CACHE = 'slayit-v12'; /* v12: Act 2 "Het Archief"-achtergronden (startscherm + 5 gevecht + 3 episch hergenereerd) */
const BESTANDEN = [
  '.',
  'index.html',
  'css/style.css',
  'css/mobiel.css',
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
/* NB: een versiebump laat 'activate' de oude cache wissen (één keer art-her-download).
   Bewust hier: de gsm bleef op een oude build hangen omdat de oude shell in de cache
   bleef zitten. De code-fetch hieronder gebruikt nu cache:'reload' zodat online ALTIJD
   de nieuwste html/js/css binnenkomt, dwars door de HTTP/CDN-cache (Pages: max-age=600). */

self.addEventListener('install', e => {
  /* shell vers ophalen (cache:'reload') zodat de install niet zelf een oude
     HTTP-gecachte versie inmetselt */
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(BESTANDEN.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
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

  /* code: network-first met cache-terugval. cache:'reload' forceert de fetch
     dóór de HTTP-cache van browser/CDN heen → online ALTIJD de nieuwste versie
     (GitHub Pages stuurt max-age=600 mee; zonder dit bleef de gsm tot 10 min op
     een oude build hangen, ondanks 'network-first'). Offline → catch → cache. */
  e.respondWith(
    fetch(e.request, { cache: 'reload' })
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
