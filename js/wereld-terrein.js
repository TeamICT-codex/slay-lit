/* ============================================================
   SLAY LIT — DE AFDALING: terrein, fysica en autoroute (js/wereld-terrein.js)
   ------------------------------------------------------------
   Puur en DOM-vrij: alles hier is een functie van (seed, act, rij, de graaf) en van
   de invoer per frame. js/wereld.js tekent en bedient; deze module rekent.
   - Wereld-eenheden (wu), vast op elk toestel: held 170, kolom 230, rand 160,
     richelbreedte 1700, verdiepingshoogte 400. De camera-schaal k zit in wereld.js.
   - Levelvorm B: je landt op een GALERIJ (−170) bóven de deurbaan (0), ≥ 1,5 kolom
     van de open deur; bordes (−95), kloof met put (+70), ladder, kruipbalk, nis.
   - DETERMINISME: hier komt NOOIT de gedeelde seed-generator van game.js voor — alleen
     loterij() (eigen mulberry32 op een eigen tekst-hash), nooit een globale ruisbron.
   - Fysica: swept top-only botsing tegen ≤ 12 vloersegmenten per verdieping, dt-cap 0,05
     (Tikker). Geen valschade, geen dood: elke put heeft een bodem.
   ============================================================ */
const WereldTerrein = (() => {
  'use strict';

  /* ---------- maten (wu) ---------- */
  const K = {
    HELD: 170, KOL_B: 230, RAND: 160, RH: 400, MARGE: 60,
    GALERIJ_Y: -170, BORDES_Y: -95, PUT_Y: 70, BALK_H: 119,
    VOET: 18,                     /* halve voetbreedte voor randen (vergevingsgezind zoals Dead Cells) */
    VALGAT_B: 84, KLOOF_MIN: 80, KLOOF_MAX: 115, PUT_EXTRA: 40,
    POORT_B: 190
  };
  K.BREEDTE = 2 * K.RAND + 6 * K.KOL_B;             /* 1700: KOLS = 7 */
  K.INGANG_X = K.BREEDTE / 2 - K.KOL_B / 2;         /* de personeelsschacht op richel 0: tussen kolom 2 en 3 */

  /* fysica (§3.4 van het contract) */
  const F = {
    loop: 230, auto: 340, aanloop: 0.12, uitloop: 0.09,
    v0: 900, g: 2800, terminaal: 1400,
    rol: 520, rolDuur: 0.32, rolCool: 0.25, uitrol: 0.26,
    klim: 170, coyote: 0.09, buffer: 0.12,
    zwaarVal: 200,                /* vanaf deze valhoogte (wu) is de landing zwaar: squash 12%, uitrol, schok */
    cadans: 0.42
  };

  /* sjabloontabel per act (§3.2) */
  const SJABLOON = {
    1: { klovenMax: 2, bordes: 0.5, ladder: 0.45, balk: 0.2, nis: 0.55 },
    2: { klovenMax: 1, bordes: 0.7, ladder: 0.7, balk: 0.1, nis: 0.5 },
    3: { klovenMax: 2, bordes: 0.4, ladder: 0.3, balk: 0.3, nis: 0.45 }
  };
  const VONDST_TABEL = [['olie', 45], ['pamflet', 40], ['fakkel', 15]];

  /* TEMPO-KNOPPEN (contract §3.7): het verplichte pad moet <= 5 s per verdieping blijven.
     Gemeten over 200 seeds x 6 verdiepingen ging de mediaan van 5,16 -> 4,50 s (autoroute)
     en van 6,61 -> 4,80 s (handmatig) door VIER dingen, in volgorde van opbrengst:
       1. de renpas in wereld.js (handmatig lopen haalt nu ook 340 wu/s)
       2. planRoute weegt loopafstand mee (koos altijd de linkerrand van de galerij)
       3. de galerij korter — de hefboom die het contract zelf noemt (560 -> 420 -> 300-380):
          een galerij breder dan 2 x 253 wu reikt vóórbij de deur, dus je viel eraf en moest
          terug (0,5-0,6 s per verdieping)
       4. de sprong-aanloop overslaan als hij al op renpas de goede kant op gaat
     De afstandseis blijft daardoor op 1,5 kolom: hefboom 2 van het contract was niet nodig. */
  /* GALERIJBREEDTE (contract §3.7, hefboom 1: "galerij korter, 560 -> 420"). De landing ligt
     >= 1,5 kolom (345 wu) van de deur, dus je doelpunt ligt op >= 253 wu van het galerijmidden.
     Was de galerij breder dan 2x253 = 506, dan viel je VOORBIJ de deur van de rand en moest je
     terugkomen — dat was 0,5-0,6 s per verdieping. 400-490 houdt de rand altijd binnen bereik. */
  const GALERIJ_B0 = 300, GALERIJ_BD = 80;            /* galerijbreedte 400-490 wu */
  const EXIT_KOLOM = 1.5;                             /* landing >= zoveel kolommen van elke open deur van r+1 (§3, levelvorm B) */

  const klem = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- eigen hash + PRNG (nooit de gedeelde seed-generator) ---------- */
  function hash(tekst) {                              /* FNV-1a 32 bits */
    let h = 0x811c9dc5;
    for (let i = 0; i < tekst.length; i++) { h ^= tekst.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  /* loterij(zaadTekst, sleutel) → trekker in [0,1): zelfde tekst + sleutel = zelfde reeks */
  function loterij(zaadTekst, sleutel) {
    let staat = hash(String(zaadTekst) + '|' + sleutel) >>> 0;
    return function () {
      staat = (staat + 0x6D2B79F5) | 0;
      let t = Math.imul(staat ^ (staat >>> 15), 1 | staat);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const kiesMet = (trek, arr) => arr[Math.floor(trek() * arr.length)];
  function gewogen(trek, tabel) {
    const som = tabel.reduce((s, p) => s + p[1], 0);
    let r = trek() * som;
    for (const [w, g] of tabel) { r -= g; if (r < 0) return w; }
    return tabel[tabel.length - 1][0];
  }

  /* De verte-variant (1-4) van richel r, nooit dezelfde als die van r-1: er is er maar een
     tegelijk in beeld, dus twee gelijke op rij betekent dat de achtergrond bij het afdalen
     niet verandert (gemeten op seed ART-1: 3,3,1,1,2 - twee dode overgangen van de vier).
     Iteratief vanaf 0 zodat hij puur en deterministisch blijft; r is hooguit 15. */
  function verteVan(zaadTekst, r) {
    let vorige = 0;
    for (let i = 0; i <= r; i++) {
      let v = 1 + Math.floor(loterij(zaadTekst, 'verte|' + i)() * 4);
      if (v === vorige) v = 1 + ((vorige + Math.floor(loterij(zaadTekst, 'verte2|' + i)() * 3)) % 4);
      vorige = v;
    }
    return vorige;
  }

  /* ---------- het sjabloon van een verdieping ----------
     ctx = { zaad: 'seed|act', act, r, rijen, deuren: [{ id, x, c, type, open }], landX (of null) }
     Alles behalve galerij/ladder/galerij-nis is onafhankelijk van landX, zodat de volgende
     richel (waarvan de landing nog onbekend is) al met dezelfde kloven/bordes getoond wordt. */
  function sjabloon(ctx) {
    const r = ctx.r, tab = SJABLOON[ctx.act] || SJABLOON[1];
    const T = loterij(ctx.zaad, 'terrein|' + r);
    const voorplein = r >= ctx.rijen;                /* het baasvoorplein: geen kloven, geen balk */
    const deuren = ctx.deuren || [];
    const sj = { r, y0: r * K.RH, deuren, kloven: [], putten: [], bordes: null, balk: null, ladder: null, nis: null, galerij: null, rekw: [], affiches: [], verte: 1 };
    const bezetDoor = (x, m) => deuren.some(d => Math.abs(d.x - x) < m);
    const vrij = (x0, x1, lijst) => !lijst.some(s => x1 > s.x0 && x0 < s.x1);

    /* galerijbreedte (nu getrokken, plaatsing zodra landX bekend is) */
    sj.galerijB = voorplein ? 520 : GALERIJ_B0 + Math.round(T() * GALERIJ_BD);

    /* kloven 0-2 (rij ≥ 10: +1), 80-115 breed, nooit onder een deur, onderling ≥ 260 uit elkaar */
    let nK = voorplein ? 0 : Math.floor(T() * (tab.klovenMax + 1));
    if (!voorplein && r >= 10 && nK < tab.klovenMax + 1) nK += 1;
    for (let i = 0; i < nK; i++) {
      for (let poging = 0; poging < 14; poging++) {
        const b = K.KLOOF_MIN + Math.round(T() * (K.KLOOF_MAX - K.KLOOF_MIN));
        const x0 = Math.round(K.MARGE + 120 + T() * (K.BREEDTE - 2 * K.MARGE - 240 - b));
        const x1 = x0 + b;
        if (bezetDoor((x0 + x1) / 2, K.POORT_B / 2 + b / 2 + 30)) continue;
        if (!vrij(x0 - 260, x1 + 260, sj.kloven)) continue;
        sj.kloven.push({ x0, x1 });
        sj.putten.push({ x0: x0 - K.PUT_EXTRA, x1: x1 + K.PUT_EXTRA, y: K.PUT_Y });
        break;
      }
    }
    sj.kloven.sort((a, b) => a.x0 - b.x0); sj.putten.sort((a, b) => a.x0 - b.x0);

    /* bordes (0-1) boven een leeg kolomslot, springbaar (−95), 230-320 breed */
    if (!voorplein && T() < tab.bordes) {
      const b = 230 + Math.round(T() * 90);
      const leeg = [];
      for (let c = 0; c < 7; c++) if (!deuren.some(d => d.c === c)) leeg.push(c);
      const volgorde = leeg.slice();
      for (let i = volgorde.length - 1; i > 0; i--) { const j = Math.floor(T() * (i + 1)); const w = volgorde[i]; volgorde[i] = volgorde[j]; volgorde[j] = w; }
      for (const c of volgorde) {
        const cx = K.RAND + c * K.KOL_B, x0 = cx - b / 2, x1 = cx + b / 2;
        if (x0 < K.MARGE + 30 || x1 > K.BREEDTE - K.MARGE - 30) continue;
        if (!vrij(x0 - 50, x1 + 50, sj.kloven)) continue;
        sj.bordes = { x0, x1, y: K.BORDES_Y };
        break;
      }
    }

    /* kruipbalk (0-1, vanaf rij 3): op de baan, ≥ 90 van een deur, niet boven een kloof of onder het bordes */
    if (!voorplein && r >= 3 && T() < tab.balk) {
      for (let poging = 0; poging < 12; poging++) {
        const x0 = Math.round(K.MARGE + 200 + T() * (K.BREEDTE - 2 * K.MARGE - 400)), x1 = x0 + 90;
        if (bezetDoor(x0 + 45, K.POORT_B / 2 + 45 + 60)) continue;
        if (!vrij(x0 - 70, x1 + 70, sj.kloven)) continue;
        if (sj.bordes && !vrij(x0 - 60, x1 + 60, [sj.bordes])) continue;
        sj.balk = { x0, x1, y: 0, h: K.BALK_H };
        break;
      }
    }

    /* HET VERDIEPINGSBORD hangt boven de galerij, dus zijn x volgt uit landX en de
       galerijbreedte - allebei hier al bekend. Hij wordt VOOR de rekwisieten berekend zodat
       de hangende kooi (die op dezelfde hoogte hangt) hem niet meer kan afdekken; gemeten
       raakte 13,3% van de verdiepingen zijn eigen bord kwijt achter een kooi. */
    const gbNu = sj.galerijB;
    const heeftLand = ctx.landX !== null && ctx.landX !== undefined;
    const galMid = heeftLand ? klem(ctx.landX, K.MARGE + gbNu / 2 + 60, K.BREEDTE - K.MARGE - gbNu / 2 - 60) : K.BREEDTE / 2;
    sj.bordX = Math.round(klem(galMid, K.RAND, K.BREEDTE - K.RAND));
    /* richel 0 draagt ook het ingangsbord van de personeelsschacht, en die landt per
       definitie op INGANG_X: het verdiepingsbord wijkt daar opzij. */
    if (r === 0 && Math.abs(sj.bordX - K.INGANG_X) < 280) {
      const opzij = K.INGANG_X < K.BREEDTE / 2 ? 1 : -1;
      sj.bordX = Math.round(klem(K.INGANG_X + opzij * 330, K.RAND, K.BREEDTE - K.RAND));
    }

    /* rekwisieten (loterij 'rekw'): 1-3 losse props op vrije plekken, plus 1-2 affiches */
    const R = loterij(ctx.zaad, 'rekw|' + r);
    const soorten = ['zuil', 'prikklok', 'lift', 'kooi'];
    const nR = 1 + Math.floor(R() * 3);
    for (let i = 0; i < nR; i++) {
      const soort = kiesMet(R, soorten);
      for (let poging = 0; poging < 10; poging++) {
        const x = Math.round(K.MARGE + 80 + R() * (K.BREEDTE - 2 * K.MARGE - 160));
        if (soort !== 'kooi' && bezetDoor(x, K.POORT_B / 2 + 70)) continue;
        if (soort === 'kooi' && Math.abs(x - sj.bordX) < 220) continue;   /* de kooi hangt op bordhoogte */
        if (!vrij(x - 70, x + 70, sj.kloven)) continue;
        if (sj.balk && !vrij(x - 80, x + 80, [sj.balk])) continue;
        if (sj.rekw.some(q => Math.abs(q.x - x) < 150)) continue;
        sj.rekw.push({ soort, x, spiegel: R() < 0.5 });
        break;
      }
    }
    const nA = 1 + Math.floor(R() * 2);
    for (let i = 0; i < nA; i++) {
      for (let poging = 0; poging < 12; poging++) {
        const x = Math.round(K.MARGE + 100 + R() * (K.BREEDTE - 2 * K.MARGE - 200));
        if (bezetDoor(x, K.POORT_B / 2 + 40)) continue;
        if (!vrij(x - 60, x + 60, sj.kloven)) continue;
        if (sj.affiches.some(a => Math.abs(a.x - x) < 200)) continue;
        if (sj.rekw.some(q => Math.abs(q.x - x) < 130)) continue;
        sj.affiches.push({ x, tekst: Math.floor(R() * 1000), schuin: (R() * 8 - 4) });
        break;
      }
    }
    sj.verte = verteVan(ctx.zaad, r);

    /* vondst (loterij 'vondst'): aanwezig? soort? De plek volgt uit het terrein. */
    const V = loterij(ctx.zaad, 'vondst|' + r);
    sj.nisKans = V(); sj.nisSoort = gewogen(V, VONDST_TABEL); sj.nisKeuze = V();
    sj.wilNis = !voorplein && sj.nisKans < tab.nis;

    if (ctx.landX !== null && ctx.landX !== undefined) plaatsGalerij(sj, ctx, tab, T);
    else plaatsNis(sj, false);                        /* voorvertoning: nis alleen op plekken zonder galerij-afhankelijkheid */
    return sj;
  }

  /* galerij op landX (geklemd binnen de richel), ladder aan het uiteinde richting het midden,
     dan de nis. De trekker T loopt hier door: de galerij-afhankelijke trekkingen komen ná alle
     onafhankelijke, zodat de voorvertoning en de echte richel dezelfde kloven/bordes/balk hebben. */
  function plaatsGalerij(sj, ctx, tab, T) {
    const gb = sj.galerijB;
    /* ≥ 60 van de richelwanden: je moet er aan beide kanten áf kunnen lopen */
    const gx = klem(ctx.landX, K.MARGE + gb / 2 + 60, K.BREEDTE - K.MARGE - gb / 2 - 60);
    sj.galerij = { x0: Math.round(gx - gb / 2), x1: Math.round(gx + gb / 2), y: K.GALERIJ_Y, landX: ctx.landX };
    const naarMidden = gx < K.BREEDTE / 2 ? 1 : -1;
    const afd = loterij(ctx.zaad, 'afdaal|' + sj.r)();
    if (sj.r < ctx.rijen && afd < tab.ladder) {
      const lx = naarMidden > 0 ? sj.galerij.x1 - 34 : sj.galerij.x0 + 34;
      /* de ladder komt nooit in een kloof of een balk terecht (de uitgang van r−1 is daarop gekozen; vangnet hier) */
      const inKloof = sj.kloven.some(s => lx > s.x0 - 30 && lx < s.x1 + 30) || (sj.balk && lx > sj.balk.x0 - 40 && lx < sj.balk.x1 + 40);
      if (!inKloof) sj.ladder = { x: lx, y0: K.GALERIJ_Y, y1: 0 };
    }
    plaatsNis(sj, true);
  }

  /* de nis: achter de balk (rollen), op het bordes (springen), in een put (vallen), of aan het
     verre galerij-einde (alleen als er een ladder is: dan blijft hij bereikbaar na de afdaling).
     plaatsNis was de ENIGE plaatsing zonder deurcheck: 27,4% van de nissen raakte het poortvlak
     en 9,6% lag in de poort, tot op 10 wu van het deurmidden - met de nisstempel dwars over een
     verzegelde deurboog. De poortplaat is 250 wu breed en loopt van de baan tot -250, dus balk
     (y 0), bordes (-95) en galerij (-170) overlappen hem allemaal; alleen de put (+70) niet.
     Elke plek levert nu KANDIDATEN; de eerste die vrij is wint, anders de volgende plek. */
  const NIS_POORT_M = 205;                            /* (poortplaat 250 + nisbreedte 160) / 2 */
  function nisKandidaten(sj, plek) {
    if (plek === 'balk') {
      /* aan de kant van de balk die het verst van het richelmidden ligt, zodat je er niet toevallig al staat */
      const kant = (sj.balk.x0 + 45) < K.BREEDTE / 2 ? -1 : 1;
      const a = kant < 0 ? sj.balk.x0 - 70 : sj.balk.x1 + 70;
      const b = kant < 0 ? sj.balk.x1 + 70 : sj.balk.x0 - 70;
      return [a, b].filter(x => x >= K.MARGE + 20 && x <= K.BREEDTE - K.MARGE - 20).map(x => ({ x: Math.round(x), y: 0 }));
    }
    if (plek === 'bordes') {
      const m = (sj.bordes.x0 + sj.bordes.x1) / 2;
      return [m, sj.bordes.x0 + 60, sj.bordes.x1 - 60].map(x => ({ x: Math.round(x), y: K.BORDES_Y }));
    }
    if (plek === 'put') {
      const eerst = Math.floor(sj.nisKeuze * sj.putten.length);
      return sj.putten.map((_, i) => sj.putten[(eerst + i) % sj.putten.length])
        .map(q => ({ x: Math.round((q.x0 + q.x1) / 2), y: K.PUT_Y }));
    }
    const mid = (sj.galerij.x0 + sj.galerij.x1) / 2;
    const ver = sj.ladder.x > mid ? sj.galerij.x0 + 50 : sj.galerij.x1 - 50;
    const dichtbij = sj.ladder.x > mid ? sj.galerij.x1 - 50 : sj.galerij.x0 + 50;
    return [ver, dichtbij].map(x => ({ x: Math.round(x), y: K.GALERIJ_Y }));
  }
  function plaatsNis(sj, metGalerij) {
    if (!sj.wilNis) return;
    const opties = [];
    if (sj.balk) opties.push('balk');
    if (sj.bordes) opties.push('bordes');
    if (sj.putten.length) opties.push('put');
    if (metGalerij && sj.galerij && sj.ladder) opties.push('galerij');
    if (!opties.length) return;
    const deuren = sj.deuren || [];
    const vrijVanPoort = kp => kp.y > 0 || !deuren.some(d => Math.abs(d.x - kp.x) < NIS_POORT_M);
    const eerst = Math.floor(sj.nisKeuze * opties.length);
    for (let n = 0; n < opties.length; n++) {
      const plek = opties[(eerst + n) % opties.length];
      for (const kp of nisKandidaten(sj, plek)) {
        if (!vrijVanPoort(kp)) continue;
        sj.nis = { x: kp.x, y: kp.y, plek, soort: sj.nisSoort, id: sj.r };
        return;
      }
    }
    /* geen enkele plek vrij: dan liever geen nis dan een nis in een deurboog */
  }

  /* ---------- de uitgang van richel r (het valgat) ----------
     Het valgat is GEEN gat in de fysieke vloer maar een triggerzone óp de deurbaan: loop
     erin (of druk ↓) en de vloer breekt open — anders zou je er met je loopsnelheid overheen
     driften en op de smalle richel ernaast landen (gemeten: 1 op 8 dalingen ging mis).
     Eisen, van streng naar los: ≥ 1,5 kolom van elke open deur van r+1 (het antwoord op
     "89% één uitgang"), op een echt baansegment (niet in een kloof, niet onder een deur,
     balk, ladder, galerij of bordes van r), en de landing op r+1 (galerij ± 40) vrij van
     kloof, bordes en balk. Elk niveau laat één eis vallen; falen kan niet (BREEDTE/2). */
  function exitX(zaad, sjR, sjVolgende, kinderenX, kolom, ouderX) {
    const gbV = sjVolgende ? sjVolgende.galerijB : 480;
    const deuren = sjR.deuren || [];
    /* [kolomeis, landing vrij van bordes, landing vrij van kloof/balk, marge rond terrein van r] */
    const E = EXIT_KOLOM;
    const NIVEAUS = [
      [E, true, true, 1], [E, false, true, 1], [E, false, false, 1],
      [E * 0.87, false, false, 1], [E * 0.73, false, false, 1], [E * 0.6, false, false, 1],
      [E, false, false, 0], [E * 0.6, false, false, 0], [0, false, false, 0]
    ];
    for (const [eis, eisBordes, eisKloof, streng] of NIVEAUS) {
      const kand = [];
      const minAf = eis * K.KOL_B;
      for (let x = K.RAND - 40; x <= K.BREEDTE - K.RAND + 40; x += 10) {
        if (kinderenX.some(kx => Math.abs(kx - x) < minAf)) continue;
        const h0 = x - K.VALGAT_B / 2, h1 = x + K.VALGAT_B / 2;
        /* nooit ín een kloof: daar is geen vloer om open te breken */
        if (sjR.kloven.some(s => h1 > s.x0 - 20 && h0 < s.x1 + 20)) continue;
        /* nooit pal onder een deur: je zou erin lopen op weg naar de deur (110 = de helft van
           een kolomafstand, zodat een gat tussen twee buurdeuren nog past) */
        if (deuren.some(d => Math.abs(d.x - x) < 110)) continue;
        if (streng) {
          if (sjR.balk && h1 > sjR.balk.x0 - 60 && h0 < sjR.balk.x1 + 60) continue;
          if (sjR.galerij && h1 > sjR.galerij.x0 - 30 && h0 < sjR.galerij.x1 + 30) continue;
          if (sjR.bordes && h1 > sjR.bordes.x0 - 30 && h0 < sjR.bordes.x1 + 30) continue;
          if (sjR.nis && sjR.nis.y === 0 && Math.abs(sjR.nis.x - x) < 110) continue;
          if (sjR.ladder && Math.abs(sjR.ladder.x - x) < 70) continue;
        }
        if (sjVolgende) {
          const gx = klem(x, K.MARGE + gbV / 2 + 60, K.BREEDTE - K.MARGE - gbV / 2 - 60);
          const g0 = gx - gbV / 2 - 40, g1 = gx + gbV / 2 + 40;
          if (eisKloof && sjVolgende.kloven.some(s => g1 > s.x0 && g0 < s.x1)) continue;
          if (eisBordes && sjVolgende.bordes && g1 > sjVolgende.bordes.x0 && g0 < sjVolgende.bordes.x1) continue;
          if (eisKloof && sjVolgende.balk && g1 > sjVolgende.balk.x0 && g0 < sjVolgende.balk.x1) continue;
        }
        kand.push(klem(x, K.MARGE + 40, K.BREEDTE - K.MARGE - 40));
      }
      if (kand.length) return kiesUitKandidaten(zaad, sjR, kolom, kand, kinderenX, ouderX);
    }
    return K.BREEDTE / 2;
  }
  /* TEMPO (§7, doel <= 5 s per verdieping): de eis is "ver genoeg van de deur van r+1",
     niet "zo ver mogelijk". Daarom eerst de kandidaten die HOOGSTENS 2,2 kolommen van de
     dichtstbijzijnde open deur liggen, en dan het derde deel dat het dichtst bij de deur
     ligt waar je NET uitkwam — dat scheelt een halve richel lopen zonder de landingseis
     of het determinisme aan te raken (de keuze blijft loterij('uitgang|r|c')). Beide
     grenzen zijn een SELECTIE binnen al goedgekeurde kandidaten: de harde eisen (kolomeis,
     echte baan, vrije landing) zijn in exitX al afgehandeld. */
  const EXIT_KIND_MAX = 1.7;                          /* kolommen van de dichtstbijzijnde open deur van r+1 */
  const EXIT_OUDER_DEEL = 0.35;                       /* aandeel van de pool dat het dichtst bij de vorige deur ligt */
  function kiesUitKandidaten(zaad, sjR, kolom, kand, kinderenX, ouderX) {
    const afKind = x => kinderenX.length ? Math.min.apply(null, kinderenX.map(kx => Math.abs(kx - x))) : 0;
    let pool = kand.filter(x => afKind(x) <= EXIT_KIND_MAX * K.KOL_B);
    /* leeg? dan niet terugvallen op ALLE kandidaten (dat gaf de langste verdiepingen),
       maar op de helft die het dichtst bij de volgende open deur ligt. */
    if (!pool.length) {
      const opAfstand = kand.slice().sort((a, b) => afKind(a) - afKind(b));
      pool = opAfstand.slice(0, Math.max(3, Math.ceil(opAfstand.length * 0.5)));
    }
    if (typeof ouderX === 'number') {
      const gesorteerd = pool.slice().sort((a, b) => Math.abs(a - ouderX) - Math.abs(b - ouderX));
      pool = gesorteerd.slice(0, Math.max(3, Math.ceil(gesorteerd.length * EXIT_OUDER_DEEL)));
    }
    return kiesMet(loterij(zaad, 'uitgang|' + sjR.r + '|' + kolom), pool);
  }

  /* ---------- de fysieke wereld uit één of meer sjablonen ----------
     spec = [{ sj, valgatX (open gat, of null) }] → { vloeren, ladders, balken, putten, xMin, xMax } */
  function bouwWereld(spec) {
    const W = { vloeren: [], ladders: [], balken: [], putten: [], valgaten: [], xMin: K.MARGE, xMax: K.BREEDTE - K.MARGE, spec };
    for (const { sj, valgatX } of spec) {
      const y0 = sj.y0;
      /* het valgat is een TRIGGERZONE op de baan, geen gat in de vloer (zie exitX) */
      if (valgatX !== null && valgatX !== undefined) W.valgaten.push({ r: sj.r, x: valgatX, y: y0, x0: valgatX - K.VALGAT_B / 2, x1: valgatX + K.VALGAT_B / 2 });
      /* de deurbaan: [MARGE, BREEDTE−MARGE] minus de kloven */
      const gaten = sj.kloven.map(s => ({ x0: s.x0, x1: s.x1 }));
      gaten.sort((a, b) => a.x0 - b.x0);
      let x = K.MARGE - 40, i = 0;
      for (const g of gaten) {
        if (g.x0 > x) W.vloeren.push({ id: sj.r + ':baan:' + (i++), soort: 'baan', r: sj.r, x0: x, x1: g.x0, y: y0 });
        x = g.x1;
      }
      W.vloeren.push({ id: sj.r + ':baan:' + (i++), soort: 'baan', r: sj.r, x0: x, x1: K.BREEDTE - K.MARGE + 40, y: y0 });
      for (const p of sj.putten) { W.vloeren.push({ id: sj.r + ':put:' + p.x0, soort: 'put', r: sj.r, x0: p.x0, x1: p.x1, y: y0 + p.y }); W.putten.push({ x0: p.x0, x1: p.x1, yBaan: y0, y: y0 + p.y }); }
      if (sj.galerij) W.vloeren.push({ id: sj.r + ':galerij', soort: 'galerij', r: sj.r, x0: sj.galerij.x0, x1: sj.galerij.x1, y: y0 + sj.galerij.y });
      if (sj.bordes) W.vloeren.push({ id: sj.r + ':bordes', soort: 'bordes', r: sj.r, x0: sj.bordes.x0, x1: sj.bordes.x1, y: y0 + sj.bordes.y });
      if (sj.ladder) W.ladders.push({ id: sj.r + ':ladder', r: sj.r, x: sj.ladder.x, y0: y0 + sj.ladder.y0, y1: y0 + sj.ladder.y1 });
      if (sj.balk) W.balken.push({ id: sj.r + ':balk', r: sj.r, x0: sj.balk.x0, x1: sj.balk.x1, y: y0 });
    }
    W.vloeren.forEach(v => { v.x0 = Math.round(v.x0); v.x1 = Math.round(v.x1); });
    W.maxY = W.vloeren.reduce((m, v) => Math.max(m, v.y), -Infinity);
    return W;
  }
  const vloerMet = (W, id) => W.vloeren.find(v => v.id === id) || null;
  /* de hoogste vloer ónder (x, y) */
  function vloerOnder(W, x, y, marge) {
    marge = marge === undefined ? K.VOET : marge;
    let beste = null;
    for (const v of W.vloeren) if (v.y > y + 0.5 && x >= v.x0 - marge && x <= v.x1 + marge && (!beste || v.y < beste.y)) beste = v;
    return beste;
  }
  function vloerOp(W, x, y) {
    let beste = null;
    for (const v of W.vloeren) if (Math.abs(v.y - y) < 1 && x >= v.x0 - K.VOET && x <= v.x1 + K.VOET && (!beste || (v.x1 - v.x0) < (beste.x1 - beste.x0))) beste = v;
    return beste;
  }

  /* ---------- de held als fysiek lichaam ---------- */
  function nieuweStaat(x, y) {
    return { x, y, vx: 0, vy: 0, richting: 1, opGrond: false, grond: null, klimt: false, ladder: null,
      rolT: 0, rolCool: 0, rolRichting: 1, coyote: 0, buffer: 0, landT: 0, landZwaar: false, doorval: 0,
      valVan: y, vxAf: 0, luchtT: 0, tijd: 0 };
  }
  const naar = (v, doel, stap) => v < doel ? Math.min(doel, v + stap) : Math.max(doel, v - stap);

  /* één fysicastap. inv = { links, rechts, spring (flank: één frame), omhoog, omlaag, rol (flank), snel }
     Geeft een lijst gebeurtenissen terug: 'spring' | 'land-licht' | 'land-zwaar' | 'rol' | 'klim-aan' | 'klim-af' */
  function stapFysica(st, inv, dt, W) {
    const ev = [];
    st.tijd += dt;
    if (st.rolCool > 0) st.rolCool -= dt;
    if (st.coyote > 0) st.coyote -= dt;
    if (st.buffer > 0) st.buffer -= dt;
    if (st.landT > 0) st.landT -= dt;
    if (st.doorval > 0) st.doorval -= dt;
    if (inv.spring) st.buffer = F.buffer;
    const uitrolt = st.landZwaar && st.landT > 0;    /* de automatische uitrol na een zware landing: even geen invoer */
    const wil = uitrolt ? 0 : (inv.rechts ? 1 : 0) - (inv.links ? 1 : 0);

    /* ladder pakken */
    if (!st.klimt && !uitrolt && st.rolT <= 0 && (inv.omhoog || inv.omlaag)) {
      for (const l of W.ladders) {
        if (Math.abs(st.x - l.x) > 26) continue;
        const bovenaan = Math.abs(st.y - l.y0) < 3, onderaan = Math.abs(st.y - l.y1) < 3;
        const erlangs = st.y > l.y0 - 3 && st.y < l.y1 + 3;
        if ((inv.omlaag && bovenaan) || (inv.omhoog && onderaan) || (!bovenaan && !onderaan && erlangs && !st.opGrond)) {
          st.klimt = true; st.ladder = l; st.x = l.x; st.vx = 0; st.vy = 0; st.opGrond = false; st.grond = null; st.rolT = 0;
          ev.push('klim-aan');
          break;
        }
      }
    }
    if (st.klimt) {
      const l = st.ladder;
      if (st.buffer > 0) {                          /* van de ladder af springen */
        st.klimt = false; st.ladder = null; st.buffer = 0; st.vy = -F.v0 * 0.8; st.vx = wil * F.loop; st.vxAf = st.vx; st.valVan = st.y;
        if (wil) st.richting = wil;
        ev.push('spring');
      } else {
        const d = (inv.omlaag ? 1 : 0) - (inv.omhoog ? 1 : 0);
        st.y += d * F.klim * dt;
        if (st.y <= l.y0) { st.y = l.y0; st.klimt = false; st.ladder = null; st.opGrond = true; st.grond = vloerOp(W, st.x, st.y); st.vy = 0; ev.push('klim-af'); }
        else if (st.y >= l.y1) { st.y = l.y1; st.klimt = false; st.ladder = null; st.opGrond = true; st.grond = vloerOp(W, st.x, st.y); st.vy = 0; ev.push('klim-af'); }
        else if (wil && !d && st.opGrond === false && Math.abs(st.y - l.y1) < 40 && st.y > l.y1 - 40) { /* onderaan opzij stappen mag */ }
        return ev;
      }
    }

    /* rollen (alleen op de grond; passeert kruipbalken) */
    if (inv.rol && !uitrolt && st.rolCool <= 0 && st.opGrond && st.rolT <= 0) {
      st.rolT = F.rolDuur; st.rolCool = F.rolDuur + F.rolCool; st.rolRichting = wil || st.richting; st.richting = st.rolRichting;
      ev.push('rol');
    }
    if (st.rolT > 0) st.rolT -= dt;

    /* horizontaal */
    const max = inv.snel ? F.auto : F.loop;
    if (st.rolT > 0) st.vx = st.rolRichting * F.rol;
    else if (uitrolt) st.vx = naar(st.vx, 0, F.rol / F.uitrol * dt);
    else if (st.opGrond) {
      if (wil) { st.richting = wil; st.vx = naar(st.vx, wil * max, max / F.aanloop * dt); }
      else st.vx = naar(st.vx, 0, max / F.uitloop * dt);
    } else {
      /* in de lucht: geen richtingwissel tegen de afzetrichting in (alleen afremmen tot 0) */
      if (wil && (st.vxAf === 0 || Math.sign(wil) === Math.sign(st.vxAf))) { st.richting = wil; st.vx = naar(st.vx, wil * max, max / F.aanloop * dt * 0.8); }
      else if (wil) st.vx = naar(st.vx, 0, max / F.uitloop * dt);
    }

    /* door een bordes zakken: ↓ + springen */
    if (st.buffer > 0 && inv.omlaag && st.opGrond && st.grond && st.grond.soort === 'bordes') {
      st.buffer = 0; st.doorval = 0.28; st.opGrond = false; st.grond = null; st.vy = 60; st.valVan = st.y; st.vxAf = st.vx;
    }
    /* springen (coyote + buffer) */
    if (st.buffer > 0 && (st.opGrond || st.coyote > 0) && st.rolT <= 0 && !uitrolt) {
      st.buffer = 0; st.coyote = 0; st.opGrond = false; st.grond = null; st.vy = -F.v0; st.vxAf = st.vx; st.valVan = st.y;
      ev.push('spring');
    }

    /* zwaartekracht + verplaatsing */
    const px = st.x, py = st.y;
    if (!st.opGrond) { st.vy = Math.min(F.terminaal, st.vy + F.g * dt); st.y += st.vy * dt; st.luchtT += dt; if (st.y < st.valVan) st.valVan = st.y; }
    else st.luchtT = 0;
    st.x += st.vx * dt;

    /* wanden: richeluiteinden, putwanden, kruipbalken */
    if (st.x < W.xMin) { st.x = W.xMin; if (st.vx < 0) st.vx = 0; }
    if (st.x > W.xMax) { st.x = W.xMax; if (st.vx > 0) st.vx = 0; }
    for (const p of W.putten) {
      if (st.y > p.yBaan + 4 && st.y <= p.y + 1 && st.x > p.x0 - K.VOET && st.x < p.x1 + K.VOET) {
        const nx = klem(st.x, p.x0 + K.VOET - 6, p.x1 - K.VOET + 6);
        if (nx !== st.x) { st.x = nx; st.vx = 0; }
      }
    }
    for (const b of W.balken) {
      if (st.rolT > 0) continue;
      if (st.y > b.y - 40 && st.y <= b.y + 2 && st.x > b.x0 - K.VOET && st.x < b.x1 + K.VOET) {
        /* niet rollend onder de balk: naar de dichtstbijzijnde kant duwen */
        st.x = (st.x - b.x0 < b.x1 - st.x) ? b.x0 - K.VOET : b.x1 + K.VOET;
        st.vx = 0;
      }
    }

    /* vloeren: swept top-only ('was erboven, nu eronder') */
    if (!st.opGrond) {
      if (st.vy >= 0) {
        let beste = null;
        for (const v of W.vloeren) {
          if (st.doorval > 0 && v.soort === 'bordes') continue;
          if (st.x < v.x0 - K.VOET || st.x > v.x1 + K.VOET) continue;
          if (py <= v.y + 0.01 && st.y >= v.y && (!beste || v.y < beste.y)) beste = v;
        }
        if (beste) {
          const val = beste.y - st.valVan;
          st.y = beste.y; st.vy = 0; st.opGrond = true; st.grond = beste; st.vxAf = 0; st.doorval = 0;
          st.landZwaar = val >= F.zwaarVal;
          st.landT = st.landZwaar ? F.uitrol : 0.12;
          if (st.landZwaar) st.vx = st.richting * F.rol * 0.55;   /* de automatische uitrol */
          ev.push(st.landZwaar ? 'land-zwaar' : 'land-licht');
        }
      }
    } else {
      const g = st.grond;
      const nog = g && st.x >= g.x0 - K.VOET && st.x <= g.x1 + K.VOET && Math.abs(st.y - g.y) < 1;
      if (!nog) {
        const ander = vloerOp(W, st.x, st.y);
        if (ander) st.grond = ander;
        else { st.opGrond = false; st.grond = null; st.coyote = F.coyote; st.valVan = st.y; st.vxAf = st.vx; st.vy = 0; }
      }
    }
    /* vangnet: onder álle vloeren (mag niet, maar nooit een val zonder einde) */
    if (!st.opGrond && st.y > W.maxY + 200) {
      const v = W.vloeren.reduce((a, b) => (b.y > a.y ? b : a));
      st.x = klem(st.x, v.x0 + K.VOET, v.x1 - K.VOET); st.y = v.y; st.vy = 0; st.opGrond = true; st.grond = v; ev.push('land-licht');
    }
    return ev;
  }

  /* ---------- autoroute: BFS over de vlakken, dan virtuele invoer ----------
     Randen (gebaren) tussen vloeren: 'val' (van een rand af), 'spring' (over een gat, gelijke
     hoogte), 'springop' (naar een hoger vlak ≤ 140 hoger: bordes, uit een put), 'klimaf'/'klimop'
     (ladder). Kruipbalken op hetzelfde vlak worden al lopend genomen ('rol' in de besturing). */
  function randen(W) {
    const R = [];
    for (const F0 of W.vloeren) {
      if (F0.soort !== 'put') {                      /* uit een put kun je alleen omhoog springen (wanden) */
        for (const kant of [-1, 1]) {
          const x = kant < 0 ? F0.x0 - K.VOET - 6 : F0.x1 + K.VOET + 6;
          if (x < W.xMin || x > W.xMax) continue;      /* de richelwand: hier kun je er niet af */
          const G = vloerOnder(W, kant < 0 ? F0.x0 - 30 : F0.x1 + 30, F0.y, 30);
          if (G) R.push({ van: F0.id, naar: G.id, gebaar: 'val', x, richting: kant });
        }
      }
      for (const G of W.vloeren) {
        if (G === F0) continue;
        const dy = F0.y - G.y;                       /* > 0: G ligt hoger */
        if (Math.abs(dy) < 1) {
          const gat = G.x0 - F0.x1;
          if (gat > 0 && gat <= 125) R.push({ van: F0.id, naar: G.id, gebaar: 'spring', x: Math.min(F0.x1 - 12, W.xMax - 2), richting: 1 });
          const gat2 = F0.x0 - G.x1;
          if (gat2 > 0 && gat2 <= 125) R.push({ van: F0.id, naar: G.id, gebaar: 'spring', x: Math.max(F0.x0 + 12, W.xMin + 2), richting: -1 });
        } else if (dy > 0 && dy <= 140) {
          /* G hoger: afzetten vlak vóór G's rand, in de richting van G */
          if (G.x0 > F0.x0 - 60 && G.x0 < F0.x1 + 40) {
            const x = klem(G.x0 - 52, Math.max(F0.x0 + K.VOET, W.xMin + 2), Math.min(F0.x1 - K.VOET, W.xMax - 2));
            if (G.x0 - x <= 110 && G.x0 - x >= -20) R.push({ van: F0.id, naar: G.id, gebaar: 'springop', x, richting: 1 });
          }
          if (G.x1 < F0.x1 + 60 && G.x1 > F0.x0 - 40) {
            const x = klem(G.x1 + 52, Math.max(F0.x0 + K.VOET, W.xMin + 2), Math.min(F0.x1 - K.VOET, W.xMax - 2));
            if (x - G.x1 <= 110 && x - G.x1 >= -20) R.push({ van: F0.id, naar: G.id, gebaar: 'springop', x, richting: -1 });
          }
        }
      }
    }
    for (const l of W.ladders) {
      const boven = vloerOp(W, l.x, l.y0), onder = vloerOp(W, l.x, l.y1);
      if (boven && onder) {
        R.push({ van: boven.id, naar: onder.id, gebaar: 'klimaf', x: l.x, richting: 0 });
        R.push({ van: onder.id, naar: boven.id, gebaar: 'klimop', x: l.x, richting: 0 });
      }
    }
    return R;
  }
  /* De randkosten zijn geijkt op TIJD, uitgedrukt in kolommen loopafstand (1 kolom = 230 wu
     = 0,68 s op renpas). Vallen 170 wu = 0,35 s + 0,12 landing ~ 0,7 kolom; een ladder van
     dezelfde hoogte kost 1,0 s = 1,5 kolom. Met de oude gelijke kosten koos de route de
     ladder even vaak als de rand, en dat is per verdieping 0,65 s duurder. */
  const VOORKEUR = { val: 0.7, spring: 0.8, springop: 1.1, klimaf: 1.6, klimop: 1.9 };
  /* Dijkstra over de vlakken. De kost is gebaar + LOOPAFSTAND (in kolommen): zonder die
     afstandsterm kostte elke rand evenveel en won simpelweg de eerst gevonden — dat is de
     rand van kant −1, dus de autoroute stapte ALTIJD van de linkerrand van de galerij, ook
     als de deur rechts lag (gemeten: mediaan 0,63 s van de 2,35 s liep hij achteruit).
     vanX/doelX zijn optioneel; zonder die twee is het gedrag als vanouds. */
  function planRoute(W, vanId, naarId, vanX, doelX) {
    if (vanId === naarId) return [];
    const R = W._randen || (W._randen = randen(W));
    const metX = typeof vanX === 'number';
    const eind = metX && typeof doelX === 'number';
    const kost = { [vanId]: 0 }, via = {}, plek = { [vanId]: metX ? vanX : 0 }, open = [vanId];
    while (open.length) {
      open.sort((a, b) => kost[a] - kost[b]);
      const u = open.shift();
      if (u === naarId) break;
      for (const e of R) {
        if (e.van !== u) continue;
        let c = kost[u] + (VOORKEUR[e.gebaar] || 1);
        if (metX) c += Math.abs(e.x - plek[u]) / K.KOL_B;
        if (eind && e.naar === naarId) c += Math.abs(doelX - e.x) / K.KOL_B;
        if (kost[e.naar] === undefined || c < kost[e.naar]) { kost[e.naar] = c; via[e.naar] = e; plek[e.naar] = e.x; if (!open.includes(e.naar)) open.push(e.naar); }
      }
    }
    if (kost[naarId] === undefined) return null;
    const pad = [];
    for (let v = naarId; v !== vanId; v = via[v].van) pad.unshift(via[v]);
    return pad;
  }

  /* de besturing: één object dat per frame virtuele invoer levert.
     doel = { vloerId, x } ; geeft { klaar, mislukt } terug via opvolgen(). */
  function maakAuto(W, st, doel) {
    const vanId = st.grond ? st.grond.id : (vloerOnder(W, st.x, st.y - 1) || {}).id;
    const route = vanId ? planRoute(W, vanId, doel.vloerId, st.x, doel.x) : null;
    if (!route) return null;
    return { route, i: 0, doel, wachtT: 0, gedaan: false, fase: 0, herplan: 0, klaar: false, mislukt: false, richtingLucht: 0 };
  }
  function stuurAuto(A, W, st, dt) {
    const inv = { links: false, rechts: false, spring: false, omhoog: false, omlaag: false, rol: false, snel: true };
    if (!A || A.klaar || A.mislukt) return inv;
    A.wachtT += dt;
    const zet = r => { if (r > 0) inv.rechts = true; else if (r < 0) inv.links = true; };
    /* in de lucht of op de ladder: het lopende gebaar afmaken */
    if (st.klimt) { const e = A.route[A.i]; if (e && e.gebaar === 'klimaf') inv.omlaag = true; else if (e && e.gebaar === 'klimop') inv.omhoog = true; else inv.omlaag = true; return inv; }
    if (!st.opGrond) { zet(A.richtingLucht); return inv; }
    const hier = st.grond ? st.grond.id : null;
    if (A.i >= A.route.length) {
      /* op het doelvlak: naar x lopen, kruipbalken rollend */
      if (hier !== A.doel.vloerId) { herplan(A, W, st); return inv; }
      const dx = A.doel.x - st.x;
      if (Math.abs(dx) <= 4) { A.klaar = true; return inv; }
      const r = Math.sign(dx);
      inv.snel = Math.abs(dx) > 40;
      zet(r); balkCheck(inv, W, st, r);
      A.richtingLucht = r;
      if (A.wachtT > 6) A.mislukt = true;
      return inv;
    }
    const e = A.route[A.i];
    if (hier === e.naar) { A.i++; A.wachtT = 0; A.gedaan = false; A.fase = 0; return stuurAuto(A, W, st, 0); }
    if (hier !== e.van) { herplan(A, W, st); return inv; }
    if (A.wachtT > 4) { herplan(A, W, st); return inv; }
    const dx = e.x - st.x;
    const r = e.richting || Math.sign(dx) || 1;
    if (e.gebaar === 'klimaf' || e.gebaar === 'klimop') {
      if (Math.abs(dx) > 5) { zet(Math.sign(dx)); balkCheck(inv, W, st, Math.sign(dx)); inv.snel = Math.abs(dx) > 40; }
      else { if (e.gebaar === 'klimaf') inv.omlaag = true; else inv.omhoog = true; }
      return inv;
    }
    /* springen vraagt een AANLOOP: eerst 95 wu achter het afzetpunt gaan staan, dan er met
       volle snelheid overheen. Zonder die fase sprong de autoroute vanaf de plek waar hij
       toevallig stond (hij stond al 'voorbij' het afzetpunt) en haalde de overkant niet. */
    if (e.gebaar === 'spring' || e.gebaar === 'springop') {
      const g = st.grond;
      const aanloop = klem(e.x - r * 95, (g ? g.x0 : W.xMin) + K.VOET + 2, (g ? g.x1 : W.xMax) - K.VOET - 2);
      /* TEMPO: loopt hij al op renpas de goede kant op, dan is de aanloop overbodig — die
         190 wu heen-en-weer kostte een halve seconde per kloof. 0,9 x F.auto geeft 0,64 s
         luchttijd x 306 wu/s = 196 wu, ruim over de breedste kloof (125 + 2 x VOET). Bij
         'springop' blijft de aanloop staan: daar moet hij op de juiste x afzetten. */
      const opGang = e.gebaar === 'spring' && Math.sign(st.vx) === r && Math.abs(st.vx) > F.auto * 0.9;
      if (!A.fase) {
        if (!opGang && ((r > 0 && st.x > aanloop + 8) || (r < 0 && st.x < aanloop - 8))) {
          const rr = Math.sign(aanloop - st.x); zet(rr); balkCheck(inv, W, st, rr); inv.snel = false; A.richtingLucht = rr;
          return inv;
        }
        A.fase = 1;
      }
      A.richtingLucht = r;
      zet(r); balkCheck(inv, W, st, r);
      const voorbij = r > 0 ? st.x >= e.x - 3 : st.x <= e.x + 3;
      /* pas afzetten als hij ook ECHT die kant op beweegt: springen terwijl je nog de andere
         kant op glijdt geeft een sprong zonder luchtsnelheid (er is geen richtingwissel in de
         lucht) — dat was de enige mislukte autoroute in de 400-seed-sweep */
      if (voorbij && !A.gedaan && (Math.sign(st.vx) === r || Math.abs(st.vx) < 25)) { inv.spring = true; A.gedaan = true; }
      return inv;
    }
    /* 'val': gewoon doorlopen van de rand af */
    const voorbij = e.richting > 0 ? st.x >= e.x - 3 : st.x <= e.x + 3;
    if (!voorbij) { zet(Math.sign(dx)); balkCheck(inv, W, st, Math.sign(dx)); A.richtingLucht = r; return inv; }
    A.richtingLucht = r;
    zet(r);
    return inv;
  }
  function balkCheck(inv, W, st, r) {
    for (const b of W.balken) {
      if (Math.abs(st.y - b.y) > 2) continue;
      const rand = r > 0 ? b.x0 - K.VOET : b.x1 + K.VOET;
      const af = r > 0 ? rand - st.x : st.x - rand;
      if (af >= -2 && af <= 34 && st.rolT <= 0 && st.rolCool <= 0) inv.rol = true;
    }
  }
  function herplan(A, W, st) {
    A.herplan++;
    if (A.herplan > 3 || !st.grond) { A.mislukt = true; return; }
    const route = planRoute(W, st.grond.id, A.doel.vloerId, st.x, A.doel.x);
    if (!route) { A.mislukt = true; return; }
    A.route = route; A.i = 0; A.wachtT = 0; A.gedaan = false; A.fase = 0;
  }

  /* headless-simulatie (tests): van (vloerId, x) naar doel; klaar binnen maxT s? */
  function simuleer(W, start, doel, maxT) {
    const st = nieuweStaat(start.x, start.y);
    st.opGrond = true; st.grond = vloerOp(W, start.x, start.y);
    const A = maakAuto(W, st, doel);
    if (!A) return { ok: false, reden: 'geen route', t: 0 };
    const dt = 1 / 60; let t = 0;
    const ev = [];
    while (t < (maxT || 20)) {
      const inv = stuurAuto(A, W, st, dt);
      ev.push(...stapFysica(st, inv, dt, W));
      t += dt;
      if (A.klaar) return { ok: true, t, x: st.x, y: st.y, ev };
      if (A.mislukt) return { ok: false, reden: 'mislukt', t, x: st.x, y: st.y, ev };
    }
    return { ok: false, reden: 'tijd', t, x: st.x, y: st.y, ev };
  }

  const api = { K, F, SJABLOON, VONDST_TABEL, hash, loterij, gewogen, sjabloon, exitX, bouwWereld, vloerMet, vloerOnder, vloerOp, nieuweStaat, stapFysica, randen, planRoute, maakAuto, stuurAuto, simuleer, klem };
  return api;
})();
if (typeof window !== 'undefined') window.WereldTerrein = WereldTerrein;
if (typeof module !== 'undefined' && module.exports) module.exports = WereldTerrein;
