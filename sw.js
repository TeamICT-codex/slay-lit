/* SLAY LIT — service worker.
   Code (html/js/css): network-first — online krijg je altijd de nieuwste versie.
   Art (assets/): cache-first — afbeeldingen veranderen niet, dus herbezoeken
   laden vrijwel instant. Offline werkt alles vanuit de cache. */
const CACHE = 'slayit-v64'; /* v64: naslag op v63 — het ✏️ (naam wijzigen) was op touch maar 22x17px (te klein om te mikken): op het mobiele spoor nu een 44x44-raakzone, laptop ongemoeid; en synVerlaat had een latente crash zonder lidmaatschap (las lid.code van null) → guard. v63: NAAM WIJZIGEN ZONDER SPOOK — je strijdnaam veranderen kon alleen via 'verlaten + opnieuw joinen', waardoor je een TWEEDE speler werd: je oude naam bleef als lid zonder scores in de lijst hangen (eeuwig ⏳, kreeg porren die niemand las) en je geschiedenis bleef aan de oude naam kleven. Nu een ✏️ naast je naam: Online.hernoem() verhuist scores, grafschriften, porren én je lidmaatschap mee, weigert een naam die al van een genoot is ('bezet'), en de Verlaat-knop waarschuwt eerst en wijst de ✏️-route aan. v62: DEBUG- EN OPTIMALISATIERONDE op de sociale laag — (1) por-knoppen dragen de naam nu in een data-attribuut i.p.v. in een inline JS-string: een naam met backslash porde de VERKEERDE persoon ("Pad\Naam"→"PadNaam") en een naam eindigend op \ brak de knop volledig (SyntaxError, klik deed niets); ook "por alle achterblijvers" leest nu data i.p.v. schermtekst. (2) req() heeft een 8s-timeout (AbortController): een hangende verbinding liet "De duiven zijn onderweg…" eeuwig staan, nu nette offline-terugval. (3) por-gezien-set is dag-gescopet — groeide onbeperkt (±72 KB/jaar). (4) zwervers krijgen geen zinloos grafschrift-veld meer (hun zerk had nooit bezoekers) maar een posse-uitnodiging. (5) meldAan gethrottled → 9 requests per leaderboard-open werden er 7. v61: grafschrift-vindbaarheid — het invoerblok verdween stilzwijgend voor spelers zónder identiteit (geen posse/zwerver); het verschijnt nu ALTIJD bij een gevallen daily: mét strijdnaam het invoerveld + 🎲, zonder strijdnaam dezelfde kop + uitleg ("je hebt eerst een strijdnaam nodig") + knop naar het leaderboard. v60: grafzerk-art LIVE — assets/ui/grafzerk.webp (gebeitelde arcering-top-zerk, transparant, 118 KB) verschijnt nu áchter de gegraveerde HTML-tekst bij het grafschrift-moment; dambord verwijderd + WebP-conversie via de pijplijn, gekleurde gloed gespaard. Tekst-marges fijngesteld op het inscriptievlak (HTML-kruis weg want de steen draagt er al een), desktop + mobiel geverifieerd */
const BESTANDEN = [
  '.',
  'css/style.css',
  'css/mobiel.css',
  'js/lib/three.min.js',
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
  'assets/icoon.svg',
  'assets/icoon-180.png',
  'assets/icoon-192.png',
  'assets/icoon-512.png',
  'assets/icoon-512-maskable.png',
  'manifest.webmanifest'
];
/* de proloog (±2,9 MB, standalone) apart en BEST-EFFORT: onder de URL 'proloog/'
   (waar de gate en de titelknop echt naartoe navigeren — cache.match is exact),
   en een gefaalde download mag de kern-install niet laten mislukken */
const ZWAAR = ['proloog/'];
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
