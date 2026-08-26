/* SLAY LIT — service worker.
   Code (html/js/css): network-first — online krijg je altijd de nieuwste versie.
   Art (assets/): cache-first — afbeeldingen veranderen niet, dus herbezoeken
   laden vrijwel instant. Offline werkt alles vanuit de cache. */
const CACHE = 'slayit-v70'; /* v70: MOBIELE GEVECHTS-POLIJSTRONDE (playtest Thomas: 'fullscreen voelt voller dan zonder', vijand-info onleesbaar, figuren zweven nog, relikwieen bovenaan afgekapt). (1) VOETCORRECTIE: de karakter-art draagt per figuur 1-11% transparante marge onder de geschilderde voeten (alpha-scan, tabel VOETMARGE in art.js) — elke figuur zweefde dus een ander beetje; nu wordt de marge per figuur weggedrukt via --voetc + losse translate op de img (composeert met de entree/adem-animaties, zelfde les als de klein/groot-scale). Geldt op beide sporen. (2) GRONDANKER + SAFE-AREA: de plaat eindigt nu op env(safe-area-inset-bottom) zodat de vloer op een echt toestel exact meelift met de UI (emulatie: identiek). (3) LEESBAARHEID: vijandnaam 9,9px → 12px met hardere schaduw, hp-balk 13 → 16px, intent-rij +12% op schermen ≥400px hoog. (4) DICHTHEIDSKNIK: de vh-helling van de figuurmaten GEHALVEERD via a*vh+b, geijkt zodat 360px-schermen pixel-identiek blijven — extra fullscreen-hoogte gaat nu half naar lucht i.p.v. volledig naar grotere figuren; onderbalk-verloop iets dieper zodat de hand een eigen laag is. (5) RELIKWIE-RIJ: overflow-x:auto clipt stilzwijgend ook verticaal en de rij was content-strak → uitstekende art/badges kapten bovenaan af; nu volle topbalkhoogte + centrering. */ /* v69: DE RELIKWIE-CEREMONIE — elke vondst komt nu groot in beeld. Alleen de schatkist had een onthulling; events (vuurvliegjes, bloedaltaar, de klerk, het schavot, het verloren origineel, de derde gleuf) meldden hun relikwie in één tekstregel tussen de rest, waardoor de beste vondst van je run visueel wegviel. toonRelikwieReveal() hangt nu CENTRAAL in geefRelikwie(), dus elke bron (event, gevechtsbeloning, winkel) krijgt dezelfde ceremonie — en een nieuw event dat een relikwie uitdeelt erft hem automatisch. Inslag-flits + uitslaande ring + draaiende stralen + slam-in van de echte relikwie-art; kleur volgt de zeldzaamheid (--relk), zeldzaam/episch krijgen een tweede tegendraadse straallaag, een zwaardere inslag en een langere leespauze. Stil bij: de schatkist (eigen ceremonie), Schrijn-overdracht en daily-startrelikwieën (bulk bij runstart) en duplicaten. */ /* v68: HET GRONDANKER — einde van het 'zweven op mobiel'. De gevechtsplaten (16:9) dragen hun geschilderde vloer in de onderste ~32-40%; op laptop valt cover daar vanzelf goed, maar op telefoonverhoudingen (±2.16:1) sneed cover+'center' de vloer onderaan wég terwijl de voetlijn er proportioneel hóger ligt (~40-47% vs ~35%) — figuren stonden op de achterwand. Fix op het mobiele spoor: #gevecht-achtergrond inset 0 (de -28px parallax-marge is desktop-3D-only; 3D staat op mobiel altijd uit) + background-position center bottom — numeriek geverifieerd op 844×390/933×430/900×460: voetlijn valt nu ín de vloerband, ook op de twee Act 3-afgrond-platforms; laptop exact ongemoeid. Zelfde onder-anker voor de sfeerschermen mét grondlijn (event/winkel/schat/beloning — rust had het al); het event-art-paneel grondt op mobiel-liggend op de vloer (flex-end) i.p.v. te zweven in het midden, en object-position bottom in het paneel houdt op laptop de voeten van de art-figuren heel (de 235px-band sneed 19% boven én onder). Uitzondering: de FINALE-plaat (vogelvlucht, geen grondlijn) blijft overal center. v67: DE PROLOOG HERBOUWD IN VANILLA — de React+Babel-bundel van 2,9 MB (met base64-art en het brug-script dat zich elke 700ms opnieuw vastplakte) is vervangen door een dunne index.html + data.js/audio.js/proloog.js (~60 KB code) met echte WebP-art in assets/proloog/ (±1 MB, 16 platen die vroeger als 404 eindigden want de map was gitignored). Mobiel-eerst: geen vaste 1280×800-stage meer die op een telefoon onleesbaar klein schaalde — elke scène is nu responsief (staand én liggend). Zelfde verhaal en teksten (de datamodule uit de bundel is 1-op-1 overgenomen), zelfde localStorage-contract, met twee verbeteringen: 'held' wordt nu rechtstreeks in slayit_proloog geschreven (de outro hoeft niet meer op de brug-verrijking te rekenen) en 'Begin het avontuur' navigeert nu écht naar de game. Nieuw in de precache: VT323 + Special Elite als lokale woff2 (geen Google-Fonts-runtime meer) en de proloog-art best-effort. v66: de 7 zware rook-WebP's (Fluisteraar + Echo, samen 4,2 MB) herconverteerd naar 1,8 MB (-57%) — het gewicht zat niet in de kleuren maar in de LOSSLESS gecodeerde alpha (het alfakanaal van een rookfiguur is zelf een compleet rookbeeld: ALPH-chunk 500+ KB per bestand); nu 900px + alpha_quality 60, visueel identiek op speelformaat (geverifieerd op donker én magenta, alle 7 integriteit-gecheckt incl. alpha-chunk en dekking). Cache-bump omdat bestaande cliënten deze bestandsnamen al cache-first hebben. v65: opruimronde uit de account-overname-audit — epische en gesmede kaartnamen krijgen eindelijk hun eigen kleur (de .zeld-naamkleurtabel stopte bij zeldzaam, dus epische kaarten oogden als basiskaarten), de onthul-flits bestaat nu ook voor vloek/gesmeed/basis (de zeldglans-klassen werden wel gezet maar bestonden niet in de CSS → flits viel stil weg), de uitnodigings-joinknop draagt zijn code via een closure i.p.v. een inline onclick-string (bugklasse: backslash-verminking; was hier dubbel genormd en dus veilig, maar het patroon moet weg), en de wereldbord-dedup-scheider in online.js bleek een ONZICHTBARE 0x01-controlebyte — functioneel correct maar onleesbaar (misleidde een complete audit-sweep die 'm als ontbrekend rapporteerde): nu een zichtbare '|' met comment. Buiten de shell: CLAUDE.md en drie stale comments beweerden nog ACTS_MAX=2 terwijl Act 3 al sinds 8 juli live is — rechtgezet zodat een toekomstige sessie de code niet 'terugcorrigeert'. v64: naslag op v63 — het ✏️ (naam wijzigen) was op touch maar 22x17px (te klein om te mikken): op het mobiele spoor nu een 44x44-raakzone, laptop ongemoeid; en synVerlaat had een latente crash zonder lidmaatschap (las lid.code van null) → guard. v63: NAAM WIJZIGEN ZONDER SPOOK — je strijdnaam veranderen kon alleen via 'verlaten + opnieuw joinen', waardoor je een TWEEDE speler werd: je oude naam bleef als lid zonder scores in de lijst hangen (eeuwig ⏳, kreeg porren die niemand las) en je geschiedenis bleef aan de oude naam kleven. Nu een ✏️ naast je naam: Online.hernoem() verhuist scores, grafschriften, porren én je lidmaatschap mee, weigert een naam die al van een genoot is ('bezet'), en de Verlaat-knop waarschuwt eerst en wijst de ✏️-route aan. v62: DEBUG- EN OPTIMALISATIERONDE op de sociale laag — (1) por-knoppen dragen de naam nu in een data-attribuut i.p.v. in een inline JS-string: een naam met backslash porde de VERKEERDE persoon ("Pad\Naam"→"PadNaam") en een naam eindigend op \ brak de knop volledig (SyntaxError, klik deed niets); ook "por alle achterblijvers" leest nu data i.p.v. schermtekst. (2) req() heeft een 8s-timeout (AbortController): een hangende verbinding liet "De duiven zijn onderweg…" eeuwig staan, nu nette offline-terugval. (3) por-gezien-set is dag-gescopet — groeide onbeperkt (±72 KB/jaar). (4) zwervers krijgen geen zinloos grafschrift-veld meer (hun zerk had nooit bezoekers) maar een posse-uitnodiging. (5) meldAan gethrottled → 9 requests per leaderboard-open werden er 7. v61: grafschrift-vindbaarheid — het invoerblok verdween stilzwijgend voor spelers zónder identiteit (geen posse/zwerver); het verschijnt nu ALTIJD bij een gevallen daily: mét strijdnaam het invoerveld + 🎲, zonder strijdnaam dezelfde kop + uitleg ("je hebt eerst een strijdnaam nodig") + knop naar het leaderboard. v60: grafzerk-art LIVE — assets/ui/grafzerk.webp (gebeitelde arcering-top-zerk, transparant, 118 KB) verschijnt nu áchter de gegraveerde HTML-tekst bij het grafschrift-moment; dambord verwijderd + WebP-conversie via de pijplijn, gekleurde gloed gespaard. Tekst-marges fijngesteld op het inscriptievlak (HTML-kruis weg want de steen draagt er al een), desktop + mobiel geverifieerd */
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
