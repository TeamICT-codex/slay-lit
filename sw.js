/* SLAY LIT — service worker.
   Code (html/js/css): network-first — online krijg je altijd de nieuwste versie.
   Art (assets/): cache-first — afbeeldingen veranderen niet, dus herbezoeken
   laden vrijwel instant. Offline werkt alles vanuit de cache. */
const CACHE = 'slayit-v105'; // v105: Inzage-knop zonder tooltip (de uitleg verscheen bij elke tik); alleen nog de eenmalige melding
const BESTANDEN = [
  '.',
  'css/style.css',
  'css/mobiel.css',
  'js/lib/three.min.js',
  'assets/art-manifest.js',
  'js/art.js',
  'js/audio.js',
  'js/scene3d.js',
  'js/data.js',
  'js/outro.js',
  'js/online.js',
  'js/game.js',
  'assets/fonts/fonts.css',
  'assets/fonts/PirataOne-400-normal.woff2',
  'assets/fonts/Alegreya-400-normal.woff2',
  'assets/fonts/Alegreya-700-normal.woff2',
  'assets/fonts/Alegreya-400-italic.woff2',
  'assets/fonts/VT323-400-normal.woff2',
  'assets/fonts/SpecialElite-400-normal.woff2',
  'proloog/',
  'proloog/proloog.css',
  'proloog/data.js',
  'proloog/audio.js',
  'proloog/proloog.js',
  'assets/icoon.svg',
  'assets/icoon-180.png',
  'assets/icoon-192.png',
  'assets/icoon-512.png',
  'assets/icoon-512-maskable.png',
  'manifest.webmanifest'
];
/* De proloog-CODE is sinds de vanilla-herbouw klein en zit hierboven atomair in
   BESTANDEN (onder de URL 'proloog/' — waar de gate en de titelknop echt naartoe
   navigeren; cache.match is exact). Alleen de proloog-ART (±1 MB webp) blijft
   BEST-EFFORT: een hapering mag de kern-install niet laten mislukken; de
   cache-first /assets/-tak vangt gemiste platen bij het eerste echte bezoek. */
const ZWAAR = [
  'assets/proloog/kantoor-overzicht.webp',
  'assets/proloog/de-oprichter.webp',
  'assets/proloog/foto-kind.webp',
  'assets/proloog/glenn2.webp',
  'assets/proloog/junior.webp',
  'assets/proloog/baas-terminal.webp',
  'assets/proloog/kaart-glimlach.webp',
  'assets/proloog/kaart-mailtje.webp',
  'assets/proloog/kaart-koffie.webp',
  'assets/proloog/kaart-overuren.webp',
  'assets/proloog/kaart-verantwoordelijkheid.webp',
  'assets/proloog/de-afgrond.webp',
  'assets/proloog/masker-woede.webp',
  'assets/proloog/masker-gif.webp',
  'assets/proloog/masker-vlucht.webp',
  'assets/proloog/slijmklerk.webp'
];
/* NB: een versiebump laat 'activate' de oude cache wissen (één keer art-her-download).
   Bewust hier: de gsm bleef op een oude build hangen omdat de oude shell in de cache
   bleef zitten. De code-fetch hieronder gebruikt nu cache:'reload' zodat online ALTIJD
   de nieuwste html/js/css binnenkomt, dwars door de HTTP/CDN-cache (Pages: max-age=600). */

self.addEventListener('install', e => {
  /* shell vers ophalen (cache:'reload') zodat de install niet zelf een oude
     HTTP-gecachte versie inmetselt. Kern = atomair (addAll); het zware deel
     (de proloog) best-effort via allSettled — een hapering op trage mobiel
     mag de hele install niet laten falen (de fetch-handler cachet hem dan
     alsnog bij het eerste echte bezoek). */
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(BESTANDEN.map(u => new Request(u, { cache: 'reload' })))
      .then(() => Promise.allSettled(ZWAAR.map(u => c.add(new Request(u, { cache: 'reload' }))))))
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
          return antwoord;
        }
        /* server gaf een FOUT (404/5xx, bv. een CDN-hikje mid-deploy): val terug op de
           werkende kopie in de cache i.p.v. de foutpagina door te geven */
        return caches.match(e.request).then(hit => hit || antwoord);
      })
      /* offline: cache-terugval. ignoreSearch vangt navigaties met een query-string
         (gedeelde link met ?param) — die staan onder hun kale URL in de cache; een
         map-navigatie ('proloog/') en zijn index.html zijn uitwisselbaar; een
         onbekende navigatie valt terug op de app-shell ('.'). */
      .catch(() => caches.match(e.request, { ignoreSearch: true })
        .then(hit => {
          if (hit) return hit;
          const pad = new URL(e.request.url).pathname;
          if (pad.endsWith('/')) return caches.match(pad + 'index.html', { ignoreSearch: true });
          if (pad.endsWith('/index.html')) return caches.match(pad.slice(0, -10), { ignoreSearch: true });
        })
        .then(hit => hit || (e.request.mode === 'navigate' ? caches.match('.') : undefined)))
  );
});
