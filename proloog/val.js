/* SLAY LIT — Proloog · DE VAL "IN DE WACHT" (R2 "de val en de klank", sep 2026)

   Eén pixelcanvas (320x180 liggend/laptop, 180x320 staand), integer opgeschaald en
   gecentreerd, met de lichtmotor van de outro (js/outro-fx.js: klimaat, licht, gloed,
   vignet, tekenLucht, het pixelfont). 0042 staat in de goederenlift, en die blijft dalen.
   Door het schaarhek glijden de etages voorbij in hun outro-klimaat — DAK (stormviolet,
   de zeppelin), 4 DIRECTIE (bordeaux: De Oprichter, de deur J. DEVROE), 3 FACTURATIE
   (ijscyaan), 2 KANTOORTUIN (ziek groen: je stoel draait nog, cubicle 7 is leeg), −1
   ARCHIEF (staalblauw: de kast VOORZIENING GETROFFEN, door het kelderraam het warme
   frietkot) — daarna rots. Elke etage dooft als je hem passeert; de kooi-tl sterft bij −3.
   Het laatste gekochte licht is de meter-LED op 80 %: hij toont VERBINDING VERBROKEN (de
   enige keer in de hele proloog), kleurt kooloranje en dooft. De vloer valt uiteen in
   factuurvellen. Stilte. Eén ademend kooltje (de code van de outro-intro).

   BEWUST NIET (plan §7 keuze 3, gevoeligheid): geen raam naar buiten, geen gevel, geen blik
   omlaag, geen vrij vallende figuur, geen inslag. De lift daalt, de mens valt niet: 0042
   staat stil in de kooi, het beeld daalt met hem mee, en als het licht op is, blijft
   alleen zijn kooltje over — op dezelfde plek.

   Het canvas tekent op zijn eigen resolutie; de browser schaalt het op (image-rendering:
   pixelated) en de scanlines zijn een css-laag. Zo kost een beeld op een laptop geen blit
   van 1280x720 (de outro doet dat wel, maar die heeft geen CPU-grens van 50 fps bij x4).
   Wat statisch is (de kooi, 0042, het hek, de etages, de rots) wordt één keer per layout
   gebakken en bewaard; voorbak() doet dat alvast tijdens de factuur, samen met de
   onweerslucht, zodat het eerste beeld van de val niet op het bakken wacht.

   Geen audio-code hier: de val meldt haar momenten via opts.bij(naam, arg, laat);
   proloog.js zet ze om in klank (window.ProloogKlank, altijd achter een guard).

   API (window.ProloogVal):
     start(opts) → handle | null      (null = geen OutroFX/canvas: proloog.js valt terug)
       opts = { houder, sprong, tekst (STORY val-blok), nu() (ms, de pauzebewuste klok
                van de proloog), gepauzeerd(), rustig, lite, bij(naam, arg, laat) }
       gebeurtenissen: 'hek', 'krant' (0|1|2), 'etage' (k = 0..6: DAK, 4, 3, 2, −1, −2, −3),
         'tl', 'verbinding', 'ledUit', 'vloer', 'stilte' (ms, ingekort als je erdoorheen
         spoelde), 'kooltje', 'slot', 'knop', 'baasDrukt'. laat = hoeveel s te laat het
         moment vuurt (> 0 na doorspoelen: dan liever geen geluid)
     handle = { spoel() (één tik: naar de volgende mijlpaal), hang(el, anker) (DOM boven
       het canvas, anker 'knop'), druk() (de knop is ingedrukt), kooltje() → { x, y, maat }
       in viewport-px (zoals de Afgrond haar kooltje doorgeeft), stop(), get t, get lite }
     voorbak(tekst)                   bakt de statische beelden en de lucht alvast (idle)
   Duur onaangeraakt: 12,6 s tot de Afgrond (geduwd: B.A.A.S. drukt op 12,08 s, de
   Afgrond volgt na de drukanimatie van proloog.js). */
(function () {
  'use strict';

  /* ================= DE REGIE (seconden sinds het eerste beeld van de val) ================= */
  const VERTREK = 0.8;                                        /* de lift zet zich in beweging */
  const CENTRUM = [0, 2.0, 3.2, 4.4, 5.6, 6.2, 6.7, 7.1];    /* d = k: etage k staat recht voor de kooi */
  const NA = 2.6;                                             /* etages per seconde onder −3 (in het donker) */
  const EASE = 0.55;                                          /* traag waar een etage recht staat, snel in de plaat */
  const DOOFT = 0.3;                                          /* etage k dooft als d = k + 0.3: ze glijdt al weg */
  const NRS = ['DAK', '4', '3', '2', '-1', '-2', '-3'];
  const KLIMAAT_VAN = [4, 3, 2, 1, 0];                        /* etage k → OutroFX.KLIMAAT-index */

  function diepte(t) {
    if (t <= VERTREK) return 0;
    for (let k = 0; k < CENTRUM.length - 1; k++) {
      const a = k === 0 ? VERTREK : CENTRUM[k], b = CENTRUM[k + 1];
      if (t < b) { const u = (t - a) / (b - a); return k + u - EASE * Math.sin(2 * Math.PI * u) / (2 * Math.PI); }
    }
    return CENTRUM.length - 1 + (t - CENTRUM[CENTRUM.length - 1]) * NA;
  }
  function tijdVan(doel) {   /* d(t) stijgt monotoon: bisectie */
    let a = VERTREK, b = 30;
    for (let i = 0; i < 44; i++) { const m = (a + b) / 2; if (diepte(m) < doel) a = m; else b = m; }
    return b;
  }
  const DOOF_T = [0, 1, 2, 3, 4, 5, 6].map(k => tijdVan(k + DOOFT));   /* ≈ 1,24 · 2,44 · 3,64 · 4,84 · 5,82 · 6,38 · 6,85 */
  const TL = {
    hek: 0.05, hekDuur: 0.5, klak: 0.52, bliksem: 0.3,
    krant: [[0.15, 0], [2.0, 1], [3.7, 2], [5.4, 1]],        /* [start, bericht] 0 = de wacht, 1 = BLIJF, 2 = UW OPROEP */
    tlSterft: DOOF_T[6], tlUit: DOOF_T[6] + 0.3,              /* de kooi-tl sterft bij −3 */
    verbinding: 7.45, oranje: 8.2, ledUit: 8.55, ledWeg: 8.8, /* het laatste gekochte licht */
    vloer: 8.6, vloerTekst: 8.75, vloerTekstWeg: 10.4,        /* de vloer: factuurvellen */
    stilte: 8.95, stilteMs: 1500,                             /* 1,5 s stilte (de vellen mogen nog uitklinken) */
    kooltje: 10.45, slot: 10.6, fotoIn: 10.6, knop: 11.2, baas: 12.08, einde: 12.6
  };
  /* één tik = één stap: naar de volgende mijlpaal */
  const MIJLPALEN = [VERTREK, 2.0, 3.2, 4.4, 5.6, 6.2, 6.7, TL.verbinding, TL.ledUit, TL.kooltje, TL.knop];

  /* ================= DE TWEE LAYOUTS ================= */
  const LIGGEND = {
    staand: false, W: 320, H: 180,
    krant: { x: 2, y: 1, w: 316, h: 13 },
    schacht: { x: 104, w: 112 },
    kooi: { x: 112, y: 50, w: 96, h: 108 },
    top: { x: 112, y: 28, w: 96, h: 22 },
    vloerY: 158, F: 148, kamerH: 124, plaat: 24,
    held: { x: 160, voet: 154 },
    paneel: { x: 193, y: 82 },
    knop: { x: 197, y: 132 },
    onder: { y: 161, h: 19 },
    zep: { x: 214, y: 20 }, horizon: 150
  };
  /* staand: de kooi links, de etages in één brede vleugel rechts (74 px), niet in twee
     smalle stroken van 36 px waarin geen enkel bordje leesbaar blijft */
  const STAAND = {
    staand: true, W: 180, H: 320,
    krant: { x: 2, y: 1, w: 176, h: 22 },
    schacht: { x: 0, w: 106 },
    kooi: { x: 8, y: 134, w: 90, h: 112 },
    top: { x: 8, y: 112, w: 90, h: 22 },
    vloerY: 246, F: 204, kamerH: 176, plaat: 28,
    held: { x: 53, voet: 242 },
    paneel: { x: 84, y: 168 },
    knop: { x: 88, y: 222 },
    onder: { y: 266, h: 52 },
    zep: { x: 30, y: 36 }, horizon: 250
  };

  /* ================= kleine hulpjes ================= */
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };
  const klem = (v, a, b) => v < a ? a : (v > b ? b : v);
  const easeUit = f => 1 - Math.pow(1 - klem(f, 0, 1), 3);
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function hash(n) { let h = (n * 374761393 + 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mengC = new Map();
  function meng(a, b, f) {
    f = Math.round(klem(f, 0, 1) * 32) / 32;
    const sl = a + b + f; let r = mengC.get(sl); if (r) return r;
    const pa = hexRgb(a), pb = hexRgb(b);
    r = '#' + pa.map((v, i) => Math.round(v * (1 - f) + pb[i] * f).toString(16).padStart(2, '0')).join('');
    if (mengC.size > 500) mengC.clear();
    mengC.set(sl, r);
    return r;
  }
  /* het pixelfont kent geen accenten: weg ermee (NFD + de combinerende tekens U+0300-U+036F) */
  const ACCENT = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');
  const hoofd = s => String(s || '').normalize('NFD').replace(ACCENT, '').toUpperCase();
  /* een 1px donkere omlijning rond elke gevulde pixel (de leesbaarheidstruc van de outro) */
  function omlijn(c) {
    const w = c.width, h = c.height, x = c.getContext('2d');
    const d = x.getImageData(0, 0, w, h), p = d.data, vol = i => p[i * 4 + 3] > 40, rand = [];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const idx = j * w + i;
      if (vol(idx)) continue;
      if ((i > 0 && vol(idx - 1)) || (i < w - 1 && vol(idx + 1)) || (j > 0 && vol(idx - w)) || (j < h - 1 && vol(idx + w))) rand.push(idx);
    }
    for (const idx of rand) { p[idx * 4] = 12; p[idx * 4 + 1] = 10; p[idx * 4 + 2] = 7; p[idx * 4 + 3] = 235; }
    x.putImageData(d, 0, 0);
    return c;
  }

  /* ================= DE STATISCHE BEELDEN (per layout één keer gebakken, en bewaard) ================= */
  const STATISCH = { liggend: null, staand: null };
  function statisch(L, TX) {
    const k = L.staand ? 'staand' : 'liggend';
    if (!STATISCH[k]) {
      const FX = window.OutroFX;
      STATISCH[k] = {
        held: bak0042(), kooi: bakKooi(L), hek: bakHek(L), krant: bakKrant(L), rots: bakRots(L),
        dak: bakKamer(L, 'dak', TX, FX),
        kamers: [null].concat(['directie', 'facturatie', 'kantoortuin', 'archief'].map(s => bakKamer(L, s, TX, FX)))
      };
    }
    return STATISCH[k];
  }

  /* 0042: hemd en das, badge aan een koord, de vastgeroeste glimlach. Frontaal: hij kijkt
     door het hek naar buiten, naar jou. In zijn borstzak (links op zijn borst) het kooltje. */
  function bak0042() {
    const c = mk(24, 66), x = c.getContext('2d');
    const r = (kl, px, py, bw, bh) => { x.fillStyle = kl; x.fillRect(px, py, bw, bh); };
    const cx = 12;
    r('#16130e', cx - 8, 63, 7, 3); r('#16130e', cx + 1, 63, 7, 3);                       /* schoenen */
    r('#3a3a44', cx - 7, 36, 14, 8); r('#3a3a44', cx - 7, 44, 6, 19); r('#3a3a44', cx + 1, 44, 6, 19);   /* broek */
    r('#4a4a56', cx - 7, 38, 1, 25); r('#2c2c34', cx + 6, 38, 1, 25); r('#2c2c34', cx - 1, 44, 1, 19);
    r('#1c1812', cx - 7, 35, 14, 1); r('#c9a13a', cx - 1, 35, 2, 1);                       /* riem */
    r('#e6dcc4', cx - 10, 15, 20, 4); r('#e6dcc4', cx - 8, 19, 16, 16);                   /* hemd */
    r('#c7b894', cx - 8, 19, 2, 16); r('#d4c8aa', cx + 6, 19, 2, 16);
    r('#d8ccb0', cx - 11, 16, 3, 17); r('#d8ccb0', cx + 8, 16, 3, 17);                    /* mouwen */
    r('#bfb090', cx - 11, 16, 1, 17); r('#efe6d0', cx - 11, 32, 3, 1); r('#efe6d0', cx + 8, 32, 3, 1);
    r('#e0b48c', cx - 11, 33, 3, 4); r('#e0b48c', cx + 8, 33, 3, 4);                      /* handen */
    r('#e0b48c', cx - 2, 12, 4, 3);                                                        /* hals */
    r('#f4efe0', cx - 3, 14, 2, 2); r('#f4efe0', cx + 1, 14, 2, 2);                       /* boord */
    r('#8f1f1c', cx - 1, 15, 2, 2); r('#b02a26', cx - 1, 17, 2, 12); r('#b02a26', cx - 2, 27, 4, 2); r('#8f1f1c', cx, 17, 1, 12);   /* das */
    r('#e0b48c', cx - 4, 2, 8, 10); r('#e0b48c', cx - 5, 4, 10, 6);                       /* hoofd */
    r('#c9966e', cx - 5, 8, 1, 2); r('#c9966e', cx + 4, 8, 1, 2);
    r('#3a2a1a', cx - 5, 0, 10, 3); r('#3a2a1a', cx - 5, 3, 1, 3); r('#3a2a1a', cx + 4, 3, 1, 3); r('#4a3826', cx - 3, 1, 4, 1);   /* haar, met een scheiding */
    r('#16130e', cx - 3, 6, 1, 1); r('#16130e', cx + 2, 6, 1, 1);                         /* ogen */
    r('#7a2a22', cx - 2, 9, 4, 1); r('#7a2a22', cx - 3, 8, 1, 1); r('#7a2a22', cx + 2, 8, 1, 1);   /* de glimlach, vastgeroest */
    r('#c9302c', cx - 3, 15, 1, 1); r('#c9302c', cx - 4, 16, 1, 3); r('#c9302c', cx - 5, 19, 1, 4);   /* het koord */
    r('#efe9d6', cx - 7, 23, 5, 5); r('#26221a', cx - 6, 24, 3, 1); r('#8a8f93', cx - 6, 26, 3, 1);   /* de badge 0042 */
    r('#cbbd99', cx + 3, 20, 5, 4); r('#a8997a', cx + 3, 20, 5, 1);                       /* de borstzak */
    return omlijn(c);
  }
  /* de kooi: achterwand, paneel, stijlen, plafond, het kastje met display en meter-LED.
     Bijgesneden tot de kolom van de kooi (van boven tot de vloer): per beeld één kleine blit. */
  function bakKooi(L) {
    const K = L.kooi, T = L.top, P = L.paneel;
    const c = mk(K.w, K.y + K.h), x = c.getContext('2d');
    x.translate(-K.x, 0);
    const r = (kl, px, py, bw, bh) => { x.fillStyle = kl; x.fillRect(px, py, bw, bh); };
    r('#2b2f33', K.x, K.y, K.w, K.h - 4);
    for (let gx = K.x + 8; gx < K.x + K.w - 4; gx += 12) { r('#1f2326', gx, K.y + 3, 1, K.h - 7); r('#3c4146', gx + 1, K.y + 3, 1, K.h - 7); }
    for (let gx = K.x + 5; gx < K.x + K.w - 4; gx += 10) { r('#4a5055', gx, K.y + 6, 1, 1); r('#4a5055', gx, K.y + K.h - 12, 1, 1); }
    const leuning = L.held.voet - 30;
    r('#6a604a', K.x + 4, leuning, K.w - 8, 1); r('#4a4436', K.x + 12, leuning, 1, 3); r('#4a4436', K.x + K.w - 13, leuning, 1, 3);
    r('#4a4436', K.x, K.y, K.w, 3); r('#5a5446', K.x, K.y + 2, K.w, 1);
    r('#6e6a58', K.x + (K.w >> 1) - 14, K.y + 3, 28, 2);                                   /* de tl-bak van de kooi */
    r('#3a3f44', P.x, P.y, 9, 44); r('#4a5055', P.x, P.y, 9, 1); r('#26292c', P.x, P.y + 43, 9, 1);   /* het knoppenpaneel */
    for (let i = 0; i < 5; i++) { r('#1c1f22', P.x + 2, P.y + 4 + i * 8, 5, 5); r('#8a8f93', P.x + 3, P.y + 5 + i * 8, 3, 3); r('#b8bcc0', P.x + 3, P.y + 5 + i * 8, 1, 1); }
    r('#4a4436', K.x, K.y, 3, K.h); r('#5a5446', K.x + 2, K.y, 1, K.h);                    /* de stijlen */
    r('#4a4436', K.x + K.w - 3, K.y, 3, K.h); r('#5a5446', K.x + K.w - 3, K.y, 1, K.h);
    r('#3a352a', T.x + 22, 0, 1, T.y); r('#3a352a', T.x + T.w - 23, 0, 1, T.y);            /* de kabels */
    r('#16130e', T.x, T.y, T.w, T.h); r('#3a352a', T.x, T.y, T.w, 1); r('#3a352a', T.x, T.y + T.h - 1, T.w, 1);
    r('#3a352a', T.x, T.y, 1, T.h); r('#3a352a', T.x + T.w - 1, T.y, 1, T.h);
    r('#0b0906', T.x + 4, T.y + 3, 18, T.h - 6);                                           /* het display */
    r('#070907', T.x + 26, T.y + 3, T.w - 30, T.h - 6);                                    /* de meter-LED */
    return c;
  }
  /* het schaarhek: diagonalen van 1 px, zoals in de liftrit van de outro */
  function bakHek(L) {
    const K = L.kooi, bw = K.w - 6, bh = K.h - 7;
    const c = mk(bw, bh), x = c.getContext('2d');
    x.fillStyle = '#6a604a';
    for (let d = -bh; d < bw; d += 11) {
      for (let q = 0; q < bh; q++) {
        const x1 = d + q, x2 = d + (bh - q);
        if (x1 >= 0 && x1 < bw && (q & 1) === 0) x.fillRect(x1, q, 1, 1);
        if (x2 >= 0 && x2 < bw && (q & 1) === 1) x.fillRect(x2, q, 1, 1);
      }
    }
    x.fillRect(0, 0, bw, 1); x.fillRect(0, bh - 1, bw, 1);
    return c;
  }
  /* de lichtkrant: een zwarte strook met een fijn puntraster */
  function bakKrant(L) {
    const k = L.krant, c = mk(k.w, k.h), x = c.getContext('2d');
    x.fillStyle = '#07060a'; x.fillRect(0, 0, k.w, k.h);
    x.fillStyle = '#131018';
    for (let yy = 1; yy < k.h - 1; yy += 2) for (let xx = 1; xx < k.w - 1; xx += 2) x.fillRect(xx, yy, 1, 1);
    x.fillStyle = '#26221b'; x.fillRect(0, 0, k.w, 1); x.fillRect(0, k.h - 1, k.w, 1);
    return c;
  }
  /* de rots onder −1: gedithered gesteente, dat per laag iets anders ligt */
  function bakRots(L) {
    const c = mk(L.W, L.F), x = c.getContext('2d'), img = x.createImageData(L.W, L.F), p = img.data;
    const KL = ['#0f0c0a', '#16120e', '#1d1812', '#251f17', '#2e261c'].map(hexRgb);
    for (let yy = 0; yy < L.F; yy++) for (let xx = 0; xx < L.W; xx++) {
      const v = Math.sin(yy * 0.19 + Math.sin(xx * 0.045) * 1.6) * 0.5 + Math.sin(yy * 0.53 + xx * 0.021) * 0.25;
      const drempel = BAYER[(yy & 3) * 4 + (xx & 3)] / 16 - 0.5;
      const n = hash(xx * 131 + yy * 7919) < 0.035 ? 1.2 : 0;
      const q = klem(Math.round(1.6 + v * 1.6 + drempel * 0.8 + n), 0, 4), k = KL[q], i = (yy * L.W + xx) * 4;
      p[i] = k[0]; p[i + 1] = k[1]; p[i + 2] = k[2]; p[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  /* ---------- de etages (elk in zijn outro-klimaat, gebakken in basiskleuren; het licht
     komt er per beeld overheen). De wand loopt achter de schacht door. Liggend staat de
     inhoud in twee vleugels naast de schacht; staand staat de kooi links en heeft elke
     etage één vleugel van 74 px rechts, van boven naar onder ingericht. ---------- */
  function bakKamer(L, soort, TX, FX) {
    const TK = FX.tekst, TB = FX.tekstBreedte;
    const W = L.W, h = L.kamerH, f = h - 4, St = L.staand;
    const c = mk(W, h), x = c.getContext('2d');
    const r = (kl, px, py, bw, bh) => { x.fillStyle = kl; x.fillRect(Math.round(px), Math.round(py), Math.round(bw), Math.round(bh)); };
    const wr = [L.schacht.x + L.schacht.w, W], wrc = (wr[0] + wr[1]) >> 1;
    const wl = [0, L.schacht.x], wlc = wl[1] >> 1;   /* staand leeg (de schacht begint op 0) */
    const lichten = [], anim = [];
    let friet = null;
    const wand = (plafond, muur, vloer) => { r(plafond, 0, 0, W, 3); r(muur, 0, 3, W, f - 3); r(vloer, 0, f, W, 4); };
    const tl = (tx, dood) => { r(dood ? '#4a4a40' : '#6e6a58', tx - 7, 3, 14, 2); if (!dood) lichten.push({ soort: 'tl', x: tx }); };
    const bureau = (bx, metCrt) => {
      r('#6e6a58', bx, f - 13, 22, 2); r('#5a5446', bx, f - 11, 22, 1);
      r('#454136', bx + 1, f - 11, 1, 11); r('#454136', bx + 20, f - 11, 1, 11);
      r('#efe9d6', bx + 1, f - 15, 4, 2); r('#cfc0a0', bx + 2, f - 16, 3, 1);
      if (metCrt) {
        r('#cfc0a0', bx + 6, f - 24, 11, 10); r('#a08d68', bx + 7, f - 14, 9, 1); r('#e6dcc4', bx + 6, f - 24, 11, 1);
        r('#0c140c', bx + 8, f - 22, 7, 5);
        lichten.push({ soort: 'crt', x: bx + 8, y: f - 22, w: 7, h: 5 });
      }
    };
    if (soort === 'dak') {
      /* het dak: grind, de luchtbehandeling, schijnwerpers en de antennemast (daar slaat de
         bliksem in, zoals in de outro). Wat hier doorzichtig blijft, is de onweerslucht. */
      r('#3a342a', 0, f, W, 4); r('#4a4436', 0, f, W, 1);
      for (let i = 0; i < W; i += 3) if (hash(i) < 0.4) r('#2e2a22', i, f + 2, 1, 1);
      const ax = St ? wr[0] + 5 : wlc - 24, aw = St ? 26 : 34;
      r('#4a4436', ax, f - 16, aw, 16); r('#5a5446', ax, f - 16, aw, 1);
      for (let i = 2; i < aw - 12; i += 3) r('#2e2a22', ax + i, f - 13, 1, 10);
      const vx = ax + aw - 7, vy = f - 9;
      r('#2e2a22', vx - 4, vy - 4, 9, 9); r('#3a342a', vx - 3, vy - 3, 7, 7); r('#2e2a22', vx, vy - 3, 1, 7); r('#2e2a22', vx - 3, vy, 7, 1);
      for (const px of (St ? [wr[0] + 44] : [wl[1] - 16, wr[0] + 16])) {
        r('#4a4436', px, f - 42, 1, 42); r('#26221a', px - 3, f - 45, 7, 3);
        lichten.push({ soort: 'schijn', x: px, y: f - 42 });
      }
      const mx = St ? W - 8 : wr[1] - 20;
      r('#4a4436', mx - 2, f - 3, 5, 3); r('#6e6a58', mx, f - 70, 1, 67);
      r('#6e6a58', mx - 3, f - 60, 7, 1); r('#6e6a58', mx - 2, f - 46, 5, 1); r('#6e6a58', mx - 1, f - 30, 3, 1);
      lichten.push({ soort: 'antenne', x: mx, y: f - 72 });
    } else if (soort === 'directie') {
      wand('#2a1c18', '#8a6a58', '#7a2424');
      for (let i = 2; i < W; i += 6) r('#7d5d4b', i, 3, 1, f - 37);                          /* behang */
      r('#5a3a2a', 0, f - 34, W, 34); r('#6a4a32', 0, f - 34, W, 2);                         /* lambrisering */
      for (let i = 6; i < W - 12; i += 18) { r('#4a2e1e', i, f - 28, 12, 1); r('#4a2e1e', i, f - 8, 12, 1); r('#4a2e1e', i, f - 28, 1, 20); r('#4a2e1e', i + 11, f - 28, 1, 20); }
      r('#5a1a1a', 0, f, W, 1);
      TK(x, 'DIRECTIE', St ? wr[0] + 4 : 6, 12, '#b89a80');
      /* De Oprichter, in goud: witte haren, een snor, ogen die je volgen */
      const px = St ? wr[0] + 6 : wlc - 10, py = 30;
      r('#c9a13a', px, py, 20, 26); r('#8a6a2a', px + 1, py + 1, 18, 24); r('#1e1814', px + 3, py + 3, 14, 20);
      r('#26221a', px + 4, py + 15, 12, 8); r('#1a1612', px + 3, py + 19, 14, 4);
      r('#cfc0a0', px + 9, py + 15, 2, 4); r('#8f1f1c', px + 9, py + 17, 2, 3);
      r('#a88060', px + 7, py + 6, 6, 8);
      r('#d8d4c8', px + 7, py + 5, 6, 2); r('#d8d4c8', px + 6, py + 6, 1, 4); r('#d8d4c8', px + 13, py + 6, 1, 4);
      r('#fff4d6', px + 8, py + 9, 1, 1); r('#fff4d6', px + 11, py + 9, 1, 1); r('#d8d4c8', px + 8, py + 12, 4, 1);
      r('#c9a13a', px + 5, py + 27, 10, 2);
      /* de deur van J. Devroe (Junior), met zijn koperen naambord */
      const dx = St ? wr[0] + 30 : wrc - 9, dy = f - 40;
      r('#3a2414', dx - 1, dy - 1, 20, 41); r('#54371f', dx, dy, 18, 40);
      r('#46301a', dx + 3, dy + 4, 12, 14); r('#46301a', dx + 3, dy + 22, 12, 14); r('#c9a13a', dx + 14, dy + 20, 2, 2);
      const naam = TX.deur || 'J. DEVROE', bb = TB(naam) + 6;
      const bx = St ? Math.min(W - bb - 2, dx + 9 - (bb >> 1)) : wrc - (bb >> 1), by = dy - 15;
      r('#8a6a2a', bx - 1, by - 1, bb + 2, 12); r('#2a1a10', bx, by, bb, 10); TK(x, naam, bx + 3, by + 2, '#e0b85a');
      for (const kx of (St ? [wrc] : [wlc, wrc])) {
        r('#8a6a2a', kx, 3, 1, 4); r('#c9a13a', kx - 5, 7, 11, 2);
        r('#c9a13a', kx - 5, 5, 1, 2); r('#c9a13a', kx + 5, 5, 1, 2); r('#c9a13a', kx, 5, 1, 2);
        lichten.push({ soort: 'kroon', x: kx });
      }
    } else if (soort === 'facturatie') {
      wand('#20282a', '#9aa6a8', '#3a4a4c');
      r('#5a6668', 0, f - 3, W, 3);
      for (let i = 0; i < W; i += 8) r('#324244', i, f, 1, 4);
      TK(x, 'FACTURATIE', St ? wr[0] + 4 : 6, 12, '#c8d2d4');
      for (const bx of (St ? [wr[0] + 3, wr[0] + 29] : [8, 40, 72, wr[0] + 8, wr[0] + 40, wr[0] + 72])) bureau(bx, true);
      const kx = St ? W - 9 : wr[1] - 12, ky = St ? 32 : 14;
      r('#26221a', kx - 3, ky - 3, 7, 7); r('#efe9d6', kx - 2, ky - 2, 5, 5); r('#26221a', kx, ky - 2, 1, 3); r('#26221a', kx, ky, 2, 1);
      for (const tx of (St ? [wr[0] + 18, wr[0] + 52] : [24, 80, wr[0] + 24, wr[0] + 80])) tl(tx, false);
    } else if (soort === 'kantoortuin') {
      wand('#1e2a1e', '#8f9c84', '#4a5a3c');
      for (let i = 0; i < W; i += 2) if (hash(i * 7 + 3) < 0.3) r('#3e4e32', i, f + 1 + ((i >> 1) & 1), 1, 1);
      const pt = f - 28;
      for (const [a, b] of (St ? [[wr[0] + 2, W - 2]] : [[wl[0] + 3, wl[1] - 3], [wr[0] + 3, wr[1] - 3]])) {
        r('#6a7a60', a, pt, b - a, 24); r('#8a9a80', a, pt, b - a, 1);
        for (let i = a; i < b; i += 30) r('#5a6a50', i, pt, 2, 24);
        r('#5a6a50', b - 2, pt, 2, 24);
      }
      /* je eigen bureau: de terminal staat nog aan, en je stoel draait nog na */
      const jb = St ? wr[0] + 4 : wl[0] + 14;
      bureau(jb, true);
      anim.push({ soort: 'stoel', x: St ? jb + 25 : jb + 30, y: f });
      /* cubicle 7: leeg. Geen stoel, geen terminal. Zijn tl klakte uit midden in een woord. */
      const c7 = St ? wr[0] + 40 : wr[0] + 30;
      bureau(c7, false);
      r('#8a8a7a', c7 + 6, pt - 12, 11, 12); r('#26221a', c7 + 7, pt - 11, 9, 10); TK(x, TX.cubicle || '7', c7 + 9, pt - 10, '#cfc0a0');
      const post = TX.poster || 'GLIMLACH!', pw = TB(post) + 5;
      const ppx = St ? wr[0] + 4 : wl[0] + 8, ppy = St ? 22 : 14;
      r('#8a7a2a', ppx - 1, ppy - 1, pw + 2, 11); r('#26221a', ppx, ppy, pw, 9); TK(x, post, ppx + 3, ppy + 1, '#ffd23f');
      TK(x, 'KANTOORTUIN', St ? wr[0] + 4 : wr[0] + 6, St ? 7 : 12, '#bcc8b0');
      if (!St) {
        const px2 = wr[1] - 12;
        r('#7a5230', px2, f - 7, 6, 7); r('#6a7a40', px2 + 2, f - 13, 1, 6); r('#6a7a40', px2 - 1, f - 12, 3, 1); r('#6a7a40', px2 + 3, f - 10, 3, 1); r('#5a6a30', px2 + 5, f - 9, 1, 2);
      }
      for (const [tx, dood] of (St ? [[jb + 13, false], [c7 + 11, true]] : [[wl[0] + 26, false], [wl[0] + 78, false], [c7 + 11, true]])) tl(tx, dood);
    } else if (soort === 'archief') {
      wand('#161c22', '#6e7884', '#2e3238');
      for (let i = 3; i < W; i += 23) r('#262a30', i, f + 1, 5, 1);
      const kast = kx => {
        r('#5f6d72', kx, f - 30, 12, 30); r('#6f7d82', kx, f - 30, 12, 1);
        for (let i = 0; i < 4; i++) { r('#4a5055', kx, f - 30 + 7 * i + 7, 12, 1); r('#9aa7ab', kx + 5, f - 30 + 7 * i + 3, 2, 1); }
      };
      /* DE kast: VOORZIENING GETROFFEN — duizenden getypte jeugddromen (de outro breekt haar open) */
      const regelsKast = Array.isArray(TX.kast) ? TX.kast : ['VOORZIENING', 'GETROFFEN'];
      const kx = St ? wr[0] + 1 : wl[0] + 12, kw = St ? 72 : 78, kh = 50, ky = f - kh;
      r('#4a5660', kx - 1, ky - 1, kw + 2, kh + 1); r('#5f6d72', kx, ky, kw, kh); r('#4a5055', kx + (kw >> 1), ky + 22, 1, kh - 22);
      r('#9aa7ab', kx + (kw >> 1) - 4, ky + 34, 2, 3); r('#9aa7ab', kx + (kw >> 1) + 3, ky + 34, 2, 3);
      const ppx = kx + (St ? 1 : 3), ppw = kw - (St ? 2 : 6);
      r('#8a7a5a', ppx - 1, ky + 1, ppw + 2, 20); r('#221e18', ppx, ky + 2, ppw, 18);
      TK(x, regelsKast[0], ppx + ((ppw - TB(regelsKast[0])) >> 1), ky + 4, '#cfc0a0');
      TK(x, regelsKast[1] || '', ppx + ((ppw - TB(regelsKast[1] || '')) >> 1), ky + 12, '#cfc0a0');
      if (!St) for (let kx2 = wr[0] + 6; kx2 < wr[1] - 14; kx2 += 14) kast(kx2);
      TK(x, 'ARCHIEF', wr[0] + 6, St ? 27 : 28, '#a4aebb');
      /* het kelderraam, op straatniveau: daarachter het frietkot. Warm licht van mensen —
         het dooft niet mee met de etage. */
      const rx = wr[0] + (St ? 4 : 14), ry = 5, rw = St ? 64 : 72, rh = 16;
      r('#26221a', rx - 2, ry - 2, rw + 4, rh + 4); r('#4a4436', rx - 3, ry + rh + 2, rw + 6, 2); r('#0a0806', rx, ry, rw, rh);
      lichten.push({ soort: 'friet', x: rx, y: ry, w: rw, h: rh });
      friet = bakFriet(rw, rh, TX, FX);
      for (const tx of (St ? [wr[0] + 20, wr[0] + 56] : [wlc, wr[0] + 30, wr[0] + 82])) tl(tx, false);
    }
    return { c, lichten, anim, friet };
  }
  /* de straat achter het kelderraam: het frietkot (FRIET), twee mensen aan de toonbank */
  function bakFriet(rw, rh, TX, FX) {
    const TK = FX.tekst, TB = FX.tekstBreedte;
    const c = mk(rw, rh), x = c.getContext('2d');
    const r = (kl, px, py, bw, bh) => { x.fillStyle = kl; x.fillRect(px, py, bw, bh); };
    r('#120a08', 0, 0, rw, rh); r('#1e140e', 0, rh - 5, rw, 5); r('#2a1c12', 0, rh - 5, rw, 1);
    const bx = Math.round(rw * 0.42), bw = Math.round(rw * 0.5);
    r('#4a2e1a', bx, 3, bw, rh - 3);
    for (let i = 0; i < bw; i += 2) r(((i >> 1) & 1) ? '#efe9d6' : '#c9302c', bx + i, rh - 11, 2, 2);   /* de luifel */
    r('#ffb347', bx + 3, rh - 8, bw - 6, 4); r('#ffd9a0', bx + 3, rh - 8, bw - 6, 1);          /* de toonbank, verlicht */
    const bord = TX.friet || 'FRIET';
    TK(x, bord, bx + ((bw - TB(bord)) >> 1), 0, '#ffd23f');
    for (const [px, hh] of [[bx - 7, 6], [bx - 12, 5]]) { r('#140e0a', px, rh - 4 - hh, 3, hh); r('#140e0a', px, rh - 6 - hh, 3, 2); }   /* mensen */
    r('#3a2414', 4, rh - 9, 1, 5); r('#ffd9a0', 3, rh - 10, 3, 1);                          /* een straatlantaarn */
    return c;
  }

  /* ================= DE VAL ================= */
  function start(opts) {
    opts = opts || {};
    const FX = window.OutroFX;
    const houder = opts.houder;
    if (!houder || !FX || typeof FX.init !== 'function' || !FX.KLIMAAT || !FX.tekst || !FX.lichtRegio) return null;
    const TK = FX.tekst, TB = FX.tekstBreedte;
    const TX = opts.tekst || {};
    const sprong = !!opts.sprong, rustig = !!opts.rustig;
    let liteNu = !!opts.lite;
    const nuMs = typeof opts.nu === 'function' ? opts.nu : () => performance.now();
    const gepauzeerd = typeof opts.gepauzeerd === 'function' ? opts.gepauzeerd : () => false;
    const bij = (naam, arg, laat) => { if (typeof opts.bij === 'function') { try { opts.bij(naam, arg, laat); } catch (e) { try { console.error('[ProloogVal]', e); } catch (x) {} } } };
    const KRANT = [hoofd(TX.wacht || 'Een ogenblikje. Ik zet u even in de wacht.'),
      ...((Array.isArray(TX.krant) && TX.krant.length >= 2) ? TX.krant : ['Blijf even aan de lijn.', 'Uw oproep is belangrijk voor ons.']).map(hoofd)];
    const VERBINDING = hoofd(TX.verbinding || 'VERBINDING VERBROKEN');
    const VLOER = hoofd(TX.vloer || 'De vloer is een veronderstelling. U had het moeten nalezen.');
    const SLOT = hoofd(TX.slot || 'Voor het eerst in vijfentwintig jaar wordt er niets gefactureerd.');

    /* ---------- DOM: het canvas (op zijn eigen resolutie, de browser schaalt op), de
       scanlines als css-laag, een laag voor de knop, en een spiegel voor schermlezers ---------- */
    const scherm = document.createElement('canvas');
    scherm.className = 'val-scherm';
    scherm.setAttribute('aria-hidden', 'true');
    const scan = document.createElement('div');
    scan.className = 'val-scan';
    const laag = document.createElement('div');
    laag.className = 'val-laag';
    const spiegel = document.createElement('p');
    spiegel.className = 'val-sr';
    spiegel.setAttribute('aria-live', 'polite');
    const weg = () => { scherm.remove(); scan.remove(); laag.remove(); spiegel.remove(); };
    houder.appendChild(scherm); houder.appendChild(scan); houder.appendChild(laag); houder.appendChild(spiegel);
    let ctx = scherm.getContext('2d', { alpha: false });
    if (!ctx) { weg(); return null; }
    const zeg = s => { spiegel.textContent = s; };

    /* ---------- de staat ---------- */
    let L = null, wc = null, wl = null, ST = null;   /* wc/wl: de wereldlaag zolang de lucht te zien is */
    let S = 1, ox = 0, oy = 0;
    let t0 = nuMs(), overslag = 0, volgende = 0, raf = 0, gestopt = false, vorigMs = performance.now();
    let ingedruktT = -1, gem = 1 / 60, traag = 0;
    const hangers = [];
    const GEB = [
      { t: TL.bliksem, naam: 'bliksem' },
      { t: TL.klak, naam: 'hek' },
      ...TL.krant.map(([t, i]) => ({ t, naam: 'krant', arg: i })),
      ...DOOF_T.map((t, k) => ({ t, naam: 'etage', arg: k })),
      { t: TL.tlSterft, naam: 'tl' },
      { t: TL.verbinding, naam: 'verbinding' },
      { t: TL.ledUit, naam: 'ledUit' },
      { t: TL.vloer, naam: 'vloer' },
      { t: TL.stilte, naam: 'stilte', arg: TL.stilteMs },
      { t: TL.kooltje, naam: 'kooltje' },
      { t: TL.slot, naam: 'slot' },
      { t: TL.knop, naam: 'knop' },
      { t: TL.baas, naam: 'baasDrukt' }
    ].sort((a, b) => a.t - b.t);

    const tijd = () => (nuMs() - t0) / 1000 + overslag;

    /* per layout: de lichtmotor op deze maat, en de (bewaarde) statische beelden */
    function bouw(staand) {
      L = staand ? STAAND : LIGGEND;
      FX.init({ breed: L.W, hoog: L.H, lite: liteNu, rustig, tekst: TK });
      if (liteNu) { try { FX.zetLite(true); } catch (e) {} }
      scherm.width = L.W; scherm.height = L.H;
      ctx = scherm.getContext('2d', { alpha: false });
      wc = mk(L.W, L.H); wl = wc.getContext('2d');
      ST = statisch(L, TX);
      houder.dataset.valLayout = staand ? 'staand' : 'liggend';
    }

    /* ================= PER BEELD ================= */
    const kamerInfo = k => k === 0 ? ST.dak : (k <= 4 ? ST.kamers[k] : null);
    function klimaatVan(k) { return k <= 4 ? FX.KLIMAAT[KLIMAAT_VAN[k]] : null; }
    /* hoe fel een etage nog brandt: 1 tot ze dooft, dan een korte flikker (rustig: een fade) */
    function lichtNiveau(k, t) {
      if (k > 6) return 0;
      const dt = t - DOOF_T[k];
      if (dt < 0) return 1;
      if (rustig) return klem(1 - dt / 0.3, 0, 1);
      if (dt > 0.26) return 0;
      return hash(Math.floor(dt * 36) + k * 17) < 0.45 ? 0.1 : 0.95 * (1 - dt / 0.3);
    }
    function kooiTl(t) {
      const dt = t - TL.tlSterft;
      if (dt < 0) return 1;
      if (rustig) return klem(1 - dt / 0.3, 0, 1);
      if (dt > 0.3) return 0;
      return hash(Math.floor(dt * 30) + 991) < 0.5 ? 0.08 : 0.9;
    }
    const ledSterkte = t => t < TL.ledUit ? 1 : klem(1 - (t - TL.ledUit) / (TL.ledWeg - TL.ledUit), 0, 1);
    const ledKleur = t => t >= TL.oranje ? '#ff9c3f' : '#79c045';
    const kooltjeXY = () => ({ x: L.held.x + 4, y: L.held.voet - 47 });
    /* het licht van het kooltje: zwak in de borstzak, feller als het gekochte licht sterft,
       en in de stilte weer klein — dan ademt het (de code van de outro-intro) */
    function kooltjeLicht(t) {
      if (t < TL.tlUit) return { r: 8, a: 0.35 };
      if (t < TL.ledUit) { const f = (t - TL.tlUit) / (TL.ledUit - TL.tlUit); return { r: 8 + 9 * f, a: 0.35 + 0.3 * f }; }
      if (t < TL.kooltje) { const f = (t - TL.ledUit) / (TL.kooltje - TL.ledUit); return { r: 17 - 10 * f, a: 0.65 - 0.3 * f }; }
      return { r: 7 + 2 * Math.sin((t - TL.kooltje) * 1.1), a: 0.35 };
    }
    function fotoXY(t) {
      const f = easeUit((t - TL.fotoIn) / (TL.knop - 0.1 - TL.fotoIn));
      return { x: Math.round(L.knop.x - 13 + Math.sin(t * 3) * 2 * (1 - f)), y: Math.round(-12 + (L.knop.y - 1 + 12) * f) };
    }

    function teken(t, dt) {
      const W = L.W, H = L.H, K = L.kooi, T = L.top;
      const dEcht = diepte(t);
      const d = rustig ? Math.round(dEcht) : dEcht;       /* rustig: de etages glijden niet, ze wisselen in het donker */
      const fy0 = L.vloerY - d * L.F;                     /* het dakvlak */
      const kMin = Math.max(0, Math.floor(d) - 1), kMax = Math.floor(d) + 2;
      const zicht = [];
      for (let k = kMin; k <= kMax; k++) {
        const fy = Math.round(L.vloerY + (k - d) * L.F), top = fy - L.kamerH;
        if (fy + L.plaat < 0 || top > H) continue;
        zicht.push({ k, fy, top, lv: lichtNiveau(k, t) });
      }
      const lv0 = lichtNiveau(0, t);

      /* 1. de lucht boven het dak (emissief: de storm heeft zijn eigen licht) */
      ctx.fillStyle = '#07060a'; ctx.fillRect(0, 0, W, H);
      if (fy0 > 0) {
        /* de bliksem slaat om de andere keer in de antennemast op het dak (zoals in de outro) */
        FX.updateBliksem(dt, !rustig, null, () => ({ x: L.staand ? W - 8 : W - 20, y: Math.round(fy0 - 76) }));
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, Math.ceil(fy0)); ctx.clip();
        FX.tekenLucht(ctx, {
          lucht: 'storm', horizon: Math.round(L.horizon - d * 14), camX: 0, t,
          regen: !liteNu && !rustig, zoeklicht: false, zeppelin: true,
          krant: TX.zeppelin || 'UW WELZIJN IS ONZE KPI  -  ', krantUit: lv0 < 0.5,
          zepX: L.zep.x, zepY: L.zep.y, y0: 0, y1: Math.ceil(fy0)
        });
        ctx.restore();
      } else FX.updateBliksem(dt, false);

      /* 2. de wereld (belicht): etages, platen, schacht, kooi. Zolang de lucht te zien is,
         op een eigen laag (die houdt de lucht doorzichtig bij het belichten); daarna meteen
         op het scherm. In het donker (alle gekochte licht in de etages is uit) alleen de kooi:
         de rest zou toch zwart vermenigvuldigen. */
      const lucht = fy0 > 0, donker = t >= TL.tlUit + 0.05;
      const w = lucht ? wl : ctx;
      if (lucht) w.clearRect(0, 0, W, H);
      if (donker) zicht.length = 0;
      for (const z of zicht) {
        const info = kamerInfo(z.k);
        if (info) w.drawImage(info.c, 0, z.top); else w.drawImage(ST.rots, 0, z.top);
        if (info) for (const a of info.anim) if (a.soort === 'stoel') stoel(w, a.x, z.top + a.y, t);
        if (z.k <= 6) plaat(w, z.k, z.fy);
      }
      const s0 = donker ? H : Math.max(0, Math.round(fy0));
      if (s0 < H) {
        const sx = L.schacht.x, sw = L.schacht.w;
        w.fillStyle = '#1a1814'; w.fillRect(sx, s0, sw, H - s0);
        const off = (((L.vloerY - d * L.F) % 12) + 12) % 12;
        w.fillStyle = '#131110';
        for (let y = off; y < H; y += 12) if (y >= s0) w.fillRect(sx, Math.round(y), sw, 1);
        w.fillStyle = '#2e2a22'; w.fillRect(K.x - 5, s0, 2, H - s0); w.fillRect(K.x + K.w + 3, s0, 2, H - s0);
        w.fillStyle = '#6a604a';
        for (let q = 0; q < 3; q++) { const y = ((q * 67 - d * L.F) % H + H) % H; if (y >= s0) { w.fillRect(K.x - 5, Math.round(y), 1, 3); w.fillRect(K.x + K.w + 4, Math.round((y + 31) % H), 1, 3); } }
      }
      w.drawImage(ST.kooi, K.x, 0);
      w.drawImage(ST.held, L.held.x - 12, L.held.voet - 66);
      if (t < TL.vloer) {
        w.fillStyle = '#4a4436'; w.fillRect(K.x, L.vloerY - 4, K.w, 4);
        w.fillStyle = '#c9a13a';
        for (let gx = K.x; gx < K.x + K.w; gx += 6) w.fillRect(gx, L.vloerY - 4, 3, 1);
      }
      /* het hek schuift dicht (van rechts naar links) */
      const hekC = ST.hek;
      const hekF = rustig ? 1 : easeUit((t - TL.hek) / TL.hekDuur);
      const hw = Math.round((K.w - 6) * hekF);
      if (hw > 0) {
        const gx0 = K.x + 3 + (K.w - 6) - hw;
        w.drawImage(hekC, 0, 0, hw, hekC.height, gx0, K.y + 3, hw, hekC.height);
        w.fillStyle = '#8a8168'; w.fillRect(gx0, K.y + 3, 1, hekC.height);
      }
      if (t >= TL.fotoIn - 0.3) {   /* de knop die niet zou mogen bestaan: eerst alleen zijn fitting */
        w.fillStyle = '#1c1f22'; w.fillRect(L.knop.x - 3, L.knop.y - 3, 7, 7);
        w.fillStyle = '#34383c'; w.fillRect(L.knop.x - 2, L.knop.y - 2, 5, 5);
      }

      /* 3. de lichtkaart: per etage haar klimaat, de kooi, en alles wat nog brandt */
      FX.lichtBegin('#07060a');
      for (const z of zicht) {
        const KL = klimaatVan(z.k);
        if (z.k === 0) FX.lichtRegio(0, 0, W, z.fy + L.plaat, meng('#221a2e', KL.koud, 0.35 + 0.65 * z.lv));
        else if (KL) FX.lichtRegio(0, z.top, W, L.F, meng('#08070a', meng(KL.koud, KL.tl, 0.2), z.lv));
        else FX.lichtRegio(0, z.top, W, L.F, meng('#07060a', '#231c16', z.lv));
      }
      if (s0 < H) FX.lichtRegio(L.schacht.x, s0, L.schacht.w, H - s0, '#1c1916');
      const tk = kooiTl(t);
      FX.lichtRegio(K.x, K.y, K.w, K.h, meng('#07060a', '#3a3530', tk));
      FX.lichtRegio(T.x, T.y, T.w, T.h, meng('#07060a', '#3a3530', tk));
      for (const z of zicht) lichtenIn(z, t, true);
      if (tk > 0.02) FX.kegel(K.x + (K.w >> 1), K.y + 5, K.w - 6, K.h - 9, '#e8e0c8', 0.85 * tk);
      const ls = ledSterkte(t);
      if (ls > 0.02) FX.licht(T.x + 26 + ((T.w - 30) >> 1), T.y + 14, 40, ledKleur(t), 0.35 * ls);
      const kp = kooltjeXY(), kl = kooltjeLicht(t);
      FX.licht(kp.x + 1, kp.y + 1, kl.r, '#ff9c3f', kl.a + (ingedruktT >= 0 ? klem(0.5 - (t - ingedruktT), 0, 0.5) : 0));
      if (sprong && t >= TL.fotoIn) { const p = fotoXY(t); FX.licht(p.x + 3, p.y + 4, 20, '#ffb347', 0.75); }
      if (!sprong && t >= TL.knop) FX.licht(L.knop.x, L.knop.y, 16, '#79c045', 0.45);
      if (fy0 > -L.plaat) FX.lichtFlits('#b8c4ff', FX.bliksemSterkte() * 0.3);
      if (lucht) { FX.toepassenMasker(wl, wc); ctx.drawImage(wc, 0, 0); } else FX.toepassen(ctx);

      /* 4. wat zelf licht geeft (na de lichtkaart) */
      for (const z of zicht) lichtenIn(z, t, false);
      if (tk > 0.05) {
        ctx.globalAlpha = tk; ctx.fillStyle = '#fff4d6'; ctx.fillRect(K.x + (K.w >> 1) - 13, K.y + 5, 26, 1); ctx.globalAlpha = 1;
        if (!liteNu) FX.gloed(ctx, K.x + (K.w >> 1), K.y + 5, 10, '#e8e0c8', 0.3 * tk);
        /* het display: de etage waar je nu bent */
        const nr = NRS[klem(Math.round(dEcht), 0, 6)];
        ctx.globalAlpha = tk; TK(ctx, nr, T.x + 4 + ((18 - TB(nr)) >> 1), T.y + 7, '#ffb347'); ctx.globalAlpha = 1;
      }
      tekenLed(t);
      tekenKooltje(t);
      if (sprong && t >= TL.fotoIn) tekenFoto(t);
      if (t >= TL.vloer) tekenVellen(t);
      tekenKrant(t);
      if (t >= TL.vloerTekst && t < TL.vloerTekstWeg) {
        const a = klem(Math.min((t - TL.vloerTekst) / 0.25, (TL.vloerTekstWeg - t) / 0.35), 0, 1);
        onderschrift(VLOER, '#cfc0a0', a, 999);
      }
      if (t >= TL.slot) onderschrift(SLOT, '#ffd9a0', 1, Math.floor((t - TL.slot) * 60));
      if (rustig && dEcht < 7.2 && t > VERTREK) {   /* rustig: de etage wisselt in een korte dip naar zwart */
        const fr = dEcht - Math.floor(dEcht), a = klem(1 - Math.abs(fr - 0.5) * 3.2, 0, 1);
        if (a > 0.01) {
          ctx.fillStyle = 'rgba(7,6,10,' + a.toFixed(3) + ')';
          ctx.fillRect(0, L.krant.y + L.krant.h, Math.max(0, K.x - 6), H); ctx.fillRect(K.x + K.w + 6, L.krant.y + L.krant.h, W, H);
        }
      }
      FX.vignet(ctx, 0.85);
    }

    function plaat(w, k, fy) {
      const W = L.W, rots = k >= 5;
      w.fillStyle = rots ? '#2e2a24' : '#3a342a'; w.fillRect(0, fy, W, L.plaat);
      w.fillStyle = rots ? '#3a352c' : '#4a4436'; w.fillRect(0, fy, W, 1);
      w.fillStyle = '#26221b'; w.fillRect(0, fy + L.plaat - 1, W, 1);
      TK(w, NRS[k], L.schacht.x + L.schacht.w + 8, fy + ((L.plaat - 14) >> 1), '#26221b', 2);
    }
    /* je stoel draait nog na: vier standen (rug, zij, voor, zij) */
    function stoel(c, sx, fy, t) {
      const fr = Math.floor(t * 2.6) % 4;
      c.fillStyle = '#26221a'; c.fillRect(sx - 4, fy - 1, 9, 1); c.fillRect(sx, fy - 6, 1, 5);
      c.fillStyle = '#3a3a44'; c.fillRect(sx - 4, fy - 8, 9, 2);
      c.fillStyle = '#454150';
      if (fr === 0) c.fillRect(sx - 4, fy - 17, 9, 9);
      else if (fr === 1) c.fillRect(sx + 3, fy - 17, 2, 9);
      else if (fr === 2) { c.fillRect(sx - 3, fy - 17, 7, 2); c.fillRect(sx - 3, fy - 15, 1, 7); c.fillRect(sx + 3, fy - 15, 1, 7); }
      else c.fillRect(sx - 4, fy - 17, 2, 9);
    }
    /* de lampen van een etage: in de lichtkaart (inLicht) of als emissieve pixels */
    function lichtenIn(z, t, inLicht) {
      const info = kamerInfo(z.k), lv = z.lv, KL = klimaatVan(z.k), top = z.top;
      const wingB = L.staand ? 40 : 84;   /* de breedte van een tl-kegel: past in de vleugel */
      const lijst = info ? info.lichten : (z.k <= 6 ? [{ soort: 'nood', x: (L.schacht.x + L.schacht.w + L.W) >> 1, y: 30 }] : []);
      for (const l of lijst) {
        if (l.soort === 'friet') {
          if (inLicht) FX.licht(l.x + (l.w >> 1), top + l.y + l.h + 12, 34, '#ffb347', 0.6);
          else if (info.friet) {
            ctx.drawImage(info.friet, l.x, top + l.y);
            ctx.fillStyle = '#1a1612';
            for (let bx = l.x + 5; bx < l.x + l.w; bx += 7) ctx.fillRect(bx, top + l.y, 1, l.h);
            if (!liteNu) FX.gloed(ctx, l.x + (l.w >> 1), top + l.y + l.h - 3, 16, '#ffb347', 0.3 + 0.05 * Math.sin(t * 7));
          }
          continue;
        }
        if (lv <= 0.02) continue;
        if (l.soort === 'tl') {
          if (inLicht) FX.kegel(l.x, top + 5, wingB, L.kamerH - 10, KL.tl, 0.9 * lv);
          else { ctx.globalAlpha = lv; ctx.fillStyle = '#fbfff4'; ctx.fillRect(l.x - 6, top + 5, 12, 1); ctx.globalAlpha = 1; if (!liteNu) FX.gloed(ctx, l.x, top + 5, 7, KL.tl, 0.3 * lv); }
        } else if (l.soort === 'kroon') {
          if (inLicht) { FX.kegel(l.x, top + 8, wingB, L.kamerH - 12, KL.tl, 0.6 * lv); FX.licht(l.x, top + 9, 26, '#ffe0b0', 0.6 * lv); }
          else { ctx.globalAlpha = lv; ctx.fillStyle = '#fff4d6'; ctx.fillRect(l.x - 5, top + 4, 1, 1); ctx.fillRect(l.x, top + 4, 1, 1); ctx.fillRect(l.x + 5, top + 4, 1, 1); ctx.globalAlpha = 1; if (!liteNu) FX.gloed(ctx, l.x, top + 6, 9, '#ffe0b0', 0.35 * lv); }
        } else if (l.soort === 'crt') {
          if (inLicht) FX.licht(l.x + (l.w >> 1), top + l.y + 2, 12, '#79c045', 0.45 * lv);
          else {
            ctx.globalAlpha = lv; ctx.fillStyle = '#12301a'; ctx.fillRect(l.x, top + l.y, l.w, l.h);
            ctx.fillStyle = '#79c045'; ctx.fillRect(l.x + 1, top + l.y + 1, l.w - 3, 1); ctx.fillRect(l.x + 1, top + l.y + 3, l.w - 4 - ((t * 3 + l.x) & 1), 1);
            ctx.globalAlpha = 1;
          }
        } else if (l.soort === 'nood') {
          if (inLicht) FX.licht(l.x, top + l.y, 22, '#c9302c', 0.6 * lv);
          else { ctx.globalAlpha = lv; ctx.fillStyle = '#3a352a'; ctx.fillRect(l.x - 2, top + l.y - 2, 6, 5); ctx.fillStyle = '#ff5a3c'; ctx.fillRect(l.x, top + l.y - 1, 2, 2); ctx.globalAlpha = 1; if (!liteNu) FX.gloed(ctx, l.x + 1, top + l.y, 7, '#c9302c', 0.45 * lv); }
        } else if (l.soort === 'schijn') {
          if (inLicht) FX.kegel(l.x, top + l.y + 1, 46, L.kamerH - l.y - 4, '#dfe2ff', 0.8 * lv);
          else { ctx.globalAlpha = lv; ctx.fillStyle = '#fbfff4'; ctx.fillRect(l.x - 2, top + l.y, 5, 1); ctx.globalAlpha = 1; if (!liteNu) FX.gloed(ctx, l.x, top + l.y, 7, '#dfe2ff', 0.35 * lv); }
        } else if (l.soort === 'antenne') {
          if (!inLicht && ((t * 1.3) | 0) % 2 === 0) { ctx.globalAlpha = lv; ctx.fillStyle = '#ff4a3a'; ctx.fillRect(l.x - 1, top + l.y, 2, 2); ctx.globalAlpha = 1; if (!liteNu) FX.gloed(ctx, l.x, top + l.y + 1, 6, '#d43d2a', 0.4 * lv); }
        }
      }
    }
    /* het laatste gekochte licht: de meter op 80 %, dan VERBINDING VERBROKEN, kooloranje, uit */
    function tekenLed(t) {
      const T = L.top, lx = T.x + 26, ly = T.y + 3, lw = T.w - 30;
      const s = ledSterkte(t);
      if (s <= 0.01) return;
      const kleur = ledKleur(t);
      ctx.globalAlpha = s;
      if (t < TL.verbinding) {
        for (let i = 0; i < 10; i++) { ctx.fillStyle = i < 8 ? '#79c045' : '#1a2a12'; ctx.fillRect(lx + 1 + i * 6, ly + 2, 5, 3); }
        TK(ctx, 'FACT. 80%', lx + ((lw - TB('FACT. 80%')) >> 1), ly + 7, '#79c045');
      } else {
        const aan = rustig || t - TL.verbinding > 0.22 || ((t - TL.verbinding) * 20 | 0) % 2 === 0;
        if (aan) {
          const woorden = VERBINDING.split(' '), r1 = woorden[0] || '', r2 = woorden.slice(1).join(' ');
          TK(ctx, r1, lx + ((lw - TB(r1)) >> 1), ly, kleur);
          TK(ctx, r2, lx + ((lw - TB(r2)) >> 1), ly + 8, kleur);
        }
      }
      ctx.globalAlpha = 1;
      if (!liteNu) FX.gloed(ctx, lx + (lw >> 1), ly + 7, 14, kleur, 0.3 * s);
    }
    function tekenKooltje(t) {
      const p = kooltjeXY();
      if (t >= TL.kooltje) { FX.kooltje(ctx, p.x, p.y, t - TL.kooltje); return; }
      const kl = kooltjeLicht(t);
      ctx.fillStyle = '#ff9c3f'; ctx.fillRect(p.x, p.y, 2, 2);
      FX.gloed(ctx, p.x + 1, p.y + 1, Math.max(3, Math.round(kl.r * 0.55)), '#ff9c3f', 0.25 + kl.a * 0.6);
    }
    /* de foto die in de schacht viel (sprong): hij drijft binnen en beschijnt de knop */
    function tekenFoto(t) {
      const p = fotoXY(t);
      ctx.fillStyle = '#efe9d6'; ctx.fillRect(p.x, p.y, 6, 8);
      ctx.fillStyle = '#ffd9a0'; ctx.fillRect(p.x + 1, p.y + 1, 4, 5);
      ctx.fillStyle = '#c98a4a'; ctx.fillRect(p.x + 2, p.y + 2, 2, 2); ctx.fillRect(p.x + 2, p.y + 4, 2, 2);
      FX.gloed(ctx, p.x + 3, p.y + 4, 12, '#ffb347', 0.45 + 0.08 * Math.sin(t * 4));
    }
    /* de vloer is een veronderstelling: ze valt uiteen in factuurvellen, in het licht
       van het kooltje en de laatste oranje gloed van de LED (de mens valt niet mee) */
    function tekenVellen(t) {
      const K = L.kooi, n = Math.floor((K.w - 8) / 8), kp = kooltjeXY();
      const oranje = t >= TL.oranje ? ledSterkte(t) : 0;
      for (let i = 0; i < n; i++) {
        const x0 = K.x + 4 + i * 8, y0 = L.vloerY - 4;
        const age = t - TL.vloer - Math.abs(i - n / 2) * 0.035;
        if (age < 0) { ctx.fillStyle = meng('#07060a', '#4a4436', 0.2 + oranje * 0.5); ctx.fillRect(x0, y0, 8, 4); continue; }
        const a = klem(1 - age / 1.3, 0, 1);
        if (a <= 0) continue;
        const vy = 8 + hash(i + 3) * 14, vx = (hash(i + 11) - 0.5) * 10;
        const x = Math.round(x0 + (rustig ? 0 : vx * age)), y = Math.round(y0 + (rustig ? 0 : vy * age + 5 * age * age));
        const afst = Math.hypot(x - kp.x, y - kp.y);
        const licht = klem(1 - afst / 70, 0, 1) * 0.75 + oranje * 0.4;
        const papier = meng('#1a140e', '#ffe8c0', licht), inkt = meng('#1a140e', '#a08d68', licht);
        ctx.globalAlpha = a;
        const fr = rustig ? 0 : Math.floor(age * 7 + i) % 3;
        ctx.fillStyle = papier;
        if (fr === 0) { ctx.fillRect(x, y, 7, 5); ctx.fillStyle = inkt; ctx.fillRect(x + 1, y + 1, 5, 1); ctx.fillRect(x + 1, y + 3, 3, 1); }
        else if (fr === 1) { ctx.fillRect(x + 1, y, 5, 5); ctx.fillStyle = inkt; ctx.fillRect(x + 2, y + 2, 3, 1); }
        else ctx.fillRect(x, y + 2, 7, 1);
        ctx.globalAlpha = 1;
      }
    }
    /* de lichtkrant: B.A.A.S. zet je in de wacht; sterft bij −3 met de kooi-tl */
    function tekenKrant(t) {
      const k = L.krant;
      ctx.drawImage(ST.krant, k.x, k.y);
      if (t >= TL.tlSterft + 0.25 || t < TL.krant[0][0]) return;
      let bericht = 0, start = 0;
      for (const [ts, i] of TL.krant) if (t >= ts) { bericht = i; start = ts; }
      const regelsK = regels(KRANT[bericht] || '', k.w - 6, L.staand ? 2 : 1);
      let n = Math.floor((t - start) * 50);
      const sterft = t >= TL.tlSterft;
      ctx.save(); ctx.beginPath(); ctx.rect(k.x + 1, k.y + 1, k.w - 2, k.h - 2); ctx.clip();
      const lh = 9, y0 = k.y + ((k.h - regelsK.length * lh) >> 1) + 1;
      regelsK.forEach((ln, i) => {
        if (n <= 0) return;
        let tonen = ln;
        if (sterft) {   /* de stroom valt weg: tekens verspringen, dan niets */
          if (hash(Math.floor(t * 40) + i) < 0.4) return;
          tonen = ln.split('').map((ch, j) => hash(j * 13 + Math.floor(t * 30)) < 0.35 ? '-' : ch).join('');
        }
        const x0 = k.x + ((k.w - TB(ln)) >> 1), zichtbaar = Math.min(ln.length, n);
        ctx.save(); ctx.beginPath(); ctx.rect(x0, y0 + i * lh, zichtbaar * 6, 9); ctx.clip();
        TK(ctx, tonen, x0, y0 + i * lh, '#ffb347');
        ctx.restore();
        n -= ln.length + 1;
      });
      ctx.restore();
    }
    /* woorden in regels, per zin; met max. regels: evenwichtig verdeeld */
    function regels(str, maxBr, maxRegels) {
      /* per zin (geen lookbehind in de regex: oudere Safari's struikelen daarover bij het parsen) */
      const zinnen = maxRegels === 1 ? [str] : String(str).replace(/\.\s+/g, '.\n').split('\n');
      const uit = [];
      for (const zin of zinnen) {
        let lijst = breek(zin, maxBr);
        /* evenwichtig: zo smal mogelijk zonder een regel extra */
        if (lijst.length > 1) {
          for (let probeer = maxBr - 6; probeer > 30; probeer -= 6) { const l2 = breek(zin, probeer); if (l2.length > lijst.length) break; lijst = l2; }
        }
        uit.push(...lijst);
      }
      if (maxRegels && uit.length > maxRegels) return breek(str, maxBr);
      return uit;
    }
    function breek(str, maxBr) {
      const uit = []; let r = '';
      for (const woord of String(str).split(' ')) {
        const test = r ? r + ' ' + woord : woord;
        if (r && TB(test) > maxBr) { uit.push(r); r = woord; } else r = test;
      }
      if (r) uit.push(r);
      return uit;
    }
    function onderschrift(str, kleur, a, n) {
      const ls = regels(str, L.W - 10), lh = 9;
      const y0 = L.onder.y + Math.max(0, (L.onder.h - ls.length * lh) >> 1);
      ctx.globalAlpha = a;
      for (let i = 0; i < ls.length; i++) {
        if (n <= 0) break;
        const ln = ls[i], x0 = (L.W - TB(ln)) >> 1;
        if (n < ln.length) { ctx.save(); ctx.beginPath(); ctx.rect(x0, y0 + i * lh, n * 6, 9); ctx.clip(); TK(ctx, ln, x0, y0 + i * lh, kleur); ctx.restore(); }
        else TK(ctx, ln, x0, y0 + i * lh, kleur);
        n -= ln.length + 1;
      }
      ctx.globalAlpha = 1;
    }

    /* ================= DE KLOK, DE GEBEURTENISSEN, HET SCHERM ================= */
    function verwerk(t) {
      while (volgende < GEB.length && GEB[volgende].t <= t) {
        const g = GEB[volgende++], laat = Math.max(0, t - g.t);
        let arg = g.arg;
        if (g.naam === 'bliksem') { if (!rustig && diepte(t) < 0.5) FX.forceerBliksem(); continue; }
        if (g.naam === 'stilte') { arg = Math.round(TL.stilteMs - laat * 1000); if (arg < 150) continue; }   /* doorgespoeld: de rest van de stilte */
        if (g.naam === 'krant') zeg(KRANT[g.arg] || '');
        else if (g.naam === 'verbinding') zeg(VERBINDING);
        else if (g.naam === 'vloer') zeg(VLOER);
        else if (g.naam === 'slot') zeg(SLOT);
        if (g.naam === 'tl') houder.dataset.valFase = 'donker';
        else if (g.naam === 'stilte') houder.dataset.valFase = 'stilte';
        else if (g.naam === 'knop') houder.dataset.valFase = 'knop';
        bij(g.naam, arg, laat);
        if (gestopt) return;
      }
    }
    /* de fps-bewaker: onder ~49 fps gedurende 1 s → de lichtmotor schakelt stil naar lite
       (geen regen, geen scanlines, minder wolken en stad, kleinere gloed), en nooit terug */
    function bewaak(dt) {
      if (liteNu) return;
      gem = gem * 0.9 + dt * 0.1;
      if (gem > 0.0205) {
        traag += dt;
        if (traag > 1.0) { liteNu = true; try { FX.zetLite(true); } catch (e) {} houder.dataset.valLite = '1'; scan.hidden = true; }
      } else traag = 0;
    }
    function frame() {
      raf = requestAnimationFrame(frame);
      if (gestopt) return;
      const nu = performance.now();
      if (gepauzeerd()) { vorigMs = nu; return; }
      const dt = Math.min(0.1, Math.max(0, (nu - vorigMs) / 1000));
      vorigMs = nu;
      bewaak(dt);
      const t = tijd();
      verwerk(t);
      if (gestopt) return;
      tekenAlles(t, dt);
    }
    function tekenAlles(t, dt) {
      try { teken(t, dt); } catch (e) { try { console.error('[ProloogVal]', e); } catch (x) {} }
    }
    function schaal(eerste) {
      const cw = houder.clientWidth || innerWidth, ch = houder.clientHeight || innerHeight;
      const staand = ch > cw;
      if (!L || staand !== L.staand) bouw(staand);
      const s = Math.max(1, Math.floor(Math.min(cw / L.W, ch / L.H)));
      const bw = L.W * s, bh = L.H * s;
      ox = Math.floor((cw - bw) / 2); oy = Math.floor((ch - bh) / 2);
      S = s;
      for (const e of [scherm, scan]) {
        e.style.width = bw + 'px'; e.style.height = bh + 'px';
        e.style.left = ox + 'px'; e.style.top = oy + 'px';
      }
      /* scanlines op het opgeschaalde beeld: één donkere lijn onder elke pixelrij (vanaf 3x) */
      scan.style.backgroundSize = '100% ' + s + 'px';
      scan.hidden = s < 3 || liteNu;
      laag.classList.toggle('staand', !!L.staand);
      for (const h of hangers) plaats(h);
      if (!eerste && !gestopt) tekenAlles(tijd(), 0);
    }
    function plaats(h) {
      const a = L.knop;   /* voorlopig één anker: de fitting van de knop −∞ op het liftpaneel */
      h.el.style.left = (ox + (a.x + 0.5) * S) + 'px';
      h.el.style.top = (oy + (a.y + 0.5) * S) + 'px';
    }
    let wachtResize = 0;
    const opResize = () => { cancelAnimationFrame(wachtResize); wachtResize = requestAnimationFrame(() => { if (!gestopt) schaal(false); }); };

    try {
      schaal(true);
    } catch (e) {
      try { console.error('[ProloogVal]', e); } catch (x) {}
      weg();
      return null;
    }
    /* de val begint bij haar eerste beeld, niet vóór het bakken (anders eet een trage
       eerste bak de eerste halve seconde van de regie op) */
    t0 = nuMs();
    tekenAlles(0, 0);
    houder.dataset.valFase = 'daal';
    window.addEventListener('resize', opResize);
    /* het vak kan nog groeien (bv. de proloog-css komt binnen terwijl je in de val hervat): herschalen */
    let waarnemer = null;
    try { if (window.ResizeObserver) { waarnemer = new ResizeObserver(opResize); waarnemer.observe(houder); } } catch (e) { waarnemer = null; }
    raf = requestAnimationFrame(frame);

    return {
      /* één tik = één stap vooruit: naar de volgende mijlpaal (de gebeurtenissen daartussen
         vuren in volgorde, dus ook de transponering zakt netjes stap voor stap) */
      spoel() {
        if (gestopt) return false;
        const t = tijd();
        const m = MIJLPALEN.find(x => x > t + 0.02);
        if (m == null) return false;
        overslag += m - t;
        verwerk(tijd());
        return true;
      },
      hang(el, anker) {
        if (gestopt || !el) return;
        el.classList.add('val-hanger');
        laag.appendChild(el);
        const h = { el, anker: anker || 'knop' };
        hangers.push(h);
        plaats(h);
      },
      druk() { if (ingedruktT < 0) ingedruktT = tijd(); },
      kooltje() {
        const p = kooltjeXY(), r = scherm.getBoundingClientRect();
        return { x: Math.round(r.left + (p.x + 1) * S), y: Math.round(r.top + (p.y + 1) * S), maat: 2 * S };
      },
      stop() {
        if (gestopt) return;
        gestopt = true;
        cancelAnimationFrame(raf); cancelAnimationFrame(wachtResize);
        window.removeEventListener('resize', opResize);
        if (waarnemer) { try { waarnemer.disconnect(); } catch (e) {} }
        weg();
        delete houder.dataset.valFase; delete houder.dataset.valLayout; delete houder.dataset.valLite;
      },
      get t() { return tijd(); },
      get lite() { return liteNu; }
    };
  }

  /* voorbakken (idle): de statische beelden van de layout die je nu hebt, en de onweerslucht
     (stad, wolken, regen, zeppelin) — tijdens de factuur, zodat het eerste beeld van de val
     meteen kan tekenen. Eén keer per pagina en per layout; stil als iets ontbreekt. */
  const voorgebakken = {};
  function voorbak(tekst) {
    const FX = window.OutroFX;
    if (!FX || typeof FX.init !== 'function' || !FX.lichtRegio) return;
    const L = innerHeight > innerWidth ? STAAND : LIGGEND;
    const sleutel = L.staand ? 'staand' : 'liggend';
    if (voorgebakken[sleutel]) return;
    voorgebakken[sleutel] = true;
    const taken = [
      () => statisch(L, tekst || {}),
      () => {
        FX.init({ breed: L.W, hoog: L.H, lite: false, rustig: false, tekst: FX.tekst });
        const c = mk(L.W, L.H), x = c.getContext('2d');
        FX.tekenLucht(x, { lucht: 'storm', horizon: L.horizon, camX: 0, t: 0, regen: true, zeppelin: true, zepX: L.zep.x, zepY: L.zep.y, y0: 0, y1: L.H });
      }
    ];
    const plan = () => {
      if (!taken.length) return;
      const doe = () => { const f = taken.shift(); try { if (f) f(); } catch (e) { /* de val bakt het dan zelf */ } plan(); };
      if (window.requestIdleCallback) requestIdleCallback(doe, { timeout: 800 }); else setTimeout(doe, 80);
    };
    plan();
  }

  window.ProloogVal = { start, voorbak, DUUR: TL.einde };
})();
