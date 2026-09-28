/* ============================================================================
   HET BAZENTONEEL (B2) — generieke plaatsing- en regieregels voor élke baas
   (Slijmkoning, Erfprins, DICKtator). Bouwcontract:
   .claude/notities/bazen_onderzoek/ontwerp/P_plaatsing_regie_plan.md §3 (B0.1-B0.13).

   Wat hier staat, is het deel dat MEET en VOLGT: waar staat de baas nu, waar valt zijn
   pil, waar is de bovenband vrij. De regels die een bestaande functie veranderen (de
   tekstsluis, de bannerwachtrij, de dood, de telegraaf) staan in js/game.js bij die
   functie zelf; de vaste maten staan in css/style.css (laptop) en css/mobiel.css (C2).

   Laadt NA js/game.js (leest S, GDOM, VIJANDEN, d3Actief, Vista). Alles is presentatie:
   niets hier raakt de spelstaat of de seeded RNG.
   ============================================================================ */

/* gedeelde toestand (bovenaan: de IIFE's hieronder lopen al tijdens het laden) */
let _vrijBoven = null;   /* B0.12: gecachte vrije bovenrand onder de HUD (vrijeBovenrand) */
let _kaderT = null;      /* B0.12: de geplande kaderfit (planKaderFit) */

/* ---------- B0.9 — de baaspil nooit in de topbalk (mobiel liggend) ----------
   De intentpil van een baas hangt boven zijn hoofd. Alleen als ze daar in de topbalk zou
   vallen (bovenkant van de art − 34px < onderkant topbalk), krijgt de kolom .pil-zij en
   hangt de pil LINKS naast zijn hoofd (css/mobiel.css, blok C2). Geometrisch en niet per
   aantal figuren: met het hof (kleinere baas) blijft ze boven hem en ligt ze niet over de
   held; bij de herverkiezing (vier kolommen, baas opgerezen) gaat ze opzij in plaats van in
   de topbalk. 6px hysterese, zodat de ademende art de pil niet laat heen en weer springen. */
const PIL_HOOGTE = 34;   /* pil + marge boven de art (de .intent-rij van een baas) */
function zetPilZij() {
  const tb = document.getElementById('topbalk');
  const grens = (tb ? tb.getBoundingClientRect().bottom : 40) + 2;
  document.querySelectorAll('#vijanden-rij .vijand.is-baas').forEach(w => {
    const a = w.querySelector('.vijand-art'); if (!a) return;
    const pilTop = a.getBoundingClientRect().top - PIL_HOOGTE;
    const zij = w.classList.contains('pil-zij');
    if (!zij && pilTop < grens) w.classList.add('pil-zij');
    else if (zij && pilTop > grens + 6) w.classList.remove('pil-zij');
  });
}

/* ---------- B0.8 × B0.9 — de chips van de held wijken voor een baaspil die opzij hangt ----------
   Beide hangen in de bovenband tussen held en baas: de chiprij van de held boven zijn hoofd
   (B0.8), de pil links naast het hoofd van de baas (B0.9). Met vier of vijf statussen op de
   held (twee rijen) en een brede pil ('🪑 delegeert') lag de pil over een chip - gezien op
   800x360 tegen de DICKtator. De chipblok schuift dan naar links (--wijk, css C2), weg van
   de pil, maar nooit onder de inzage-knop (x < 44).
   B2 F1: die klem op x >= 44 geldt nu ALTIJD, ook zonder pil opzij. Bij 3-4 vijanden staat de
   held tegen de linkerrand en viel zijn (bredere, 4 per rij) chipblok links uit beeld; dan
   schuift hij naar rechts (een negatieve --wijk). En hij wijkt voor ELKE vijandpil op zijn
   hoogte, niet alleen voor de baaspil opzij: de brede blok liep anders over de pil van de
   eerste vijand (2-4 vijanden: 85-511 px2). Botsen beide, dan wint de klem (niets uit beeld). */
function heldChipsWijken() {
  const hs = document.querySelector('#speler-zone .blok-status'); if (!hs) return;
  const oud = parseFloat(hs.style.getPropertyValue('--wijk')) || 0;
  let wijk = 0;
  if (hs.childElementCount) {
    const c = hs.getBoundingClientRect();
    /* de chipblok zoals hij zonder wijk zou staan */
    const l0 = c.left + oud, r0 = c.right + oud;
    let nodig = 0;
    document.querySelectorAll('#vijanden-rij .vijand:not(.sterft) .intent').forEach(e => {
      const p = e.getBoundingClientRect();
      if (p.width && c.top < p.bottom + 4 && c.bottom > p.top - 4 && r0 > p.left - 6 && l0 < p.right) nodig = Math.max(nodig, r0 - (p.left - 6));
    });
    wijk = Math.min(nodig, l0 - 44);
  }
  if (Math.abs(wijk - oud) >= 1) hs.style.setProperty('--wijk', Math.round(wijk) + 'px');
}

/* ---------- B3 × B0.8 × B0.9 — een brede baaspil opzij wordt compact en krijgt een tweede rij ----------
   De Erfprins plant in fase 3 tot drie kaarten (ERF.plan), elk met een eigen pip ("🎭 12+19🩸":
   het blokbare en het onblokbare deel), en zijn pil opzij werd zo 310-340 px breed. Links naast
   zijn hoofd liep ze dan over de chips van de held, ook als die zo ver mogelijk weken (de klem
   hierboven): 800x360, drie pips en drie tot zes statussen op de held, 612-2 903 px2 (B3,
   integratie). Past de pil op haar natuurlijke breedte (één rij, gewone pips) niet naast de
   chips op hun uiterste plek, dan krijgt de kolom .pil-krap: kleinere pips die rechts uitgelijnd
   naar een tweede rij mogen breken, niet breder dan de ruimte tot die chips (--pil-max, css C2).
   De tweede rij hangt dan in het gat tussen held en baas (B1.1), rechts van het hoofd van de
   held. Alleen bij twee of meer pips: één pip wijkt al via heldChipsWijken(). De maat wordt
   zonder .pil-krap gemeten (synchroon, dus zonder een verfbeurt ertussen), zodat de klasse
   niet heen en weer springt. */
function pilKrap() {
  const hs = document.querySelector('#speler-zone .blok-status');
  const chips = hs ? [...hs.children] : [];
  let crMin = null, band = null;
  if (chips.length) {
    const c = hs.getBoundingClientRect(), oud = parseFloat(hs.style.getPropertyValue('--wijk')) || 0;
    const cr0 = Math.max(...chips.map(e => e.getBoundingClientRect().right)) + oud;   /* de chips zonder wijk */
    crMin = cr0 - Math.max(0, c.left + oud - 44);                                     /* ... en zo ver als ze kunnen wijken */
    band = { t: c.top, b: c.bottom };
  }
  document.querySelectorAll('#vijanden-rij .vijand.is-baas').forEach(w => {
    const rij = w.querySelector('.intent-rij'); if (!rij) return;
    let krap = false, max = 0;
    if (crMin != null && w.classList.contains('pil-zij') && rij.querySelectorAll('.intent').length >= 2) {
      w.classList.remove('pil-krap');   /* de natuurlijke maat */
      const r = rij.getBoundingClientRect();
      if (band.t < r.bottom + 4 && band.b > r.top - 4 && r.left - 6 < crMin) { krap = true; max = Math.floor(r.right - crMin - 6); }
    }
    w.classList.toggle('pil-krap', krap);
    if (krap) rij.style.setProperty('--pil-max', Math.max(96, max) + 'px'); else rij.style.removeProperty('--pil-max');
  });
}

/* ---------- B0.5 — de spraakplaat nooit over de spreker: een berekende vrije zone ----------
   De plaat hangt in de bovenband (mobiel onder de topbalk, laptop onder de bazenbalk: css).
   Horizontaal kiest spraakZone() een VRIJE zone naast de spreker. De spreker is de baas
   PLUS zijn pil: in 2D zijn art, in 3D zijn sprite (Vista.schermPos). Zone A ligt links van
   hem (boven de held), zone B rechts van hem (tot de rand, of op mobiel tot het hart).
   - laptop: A wint als ze >= 200px breed is - de band boven de kleine held is vrij;
   - mobiel: B wint als ze >= 200px breed is - daar staat het hof, en een plaat mag een
     hoveling even afdekken, de spreker nooit; anders de bredere kant. Mobiel wordt de
     plaatsing bovendien NAGEMETEN (zie hieronder): een kleiner lettertype (.smal, .krap)
     of een andere zone als de geplaatste plaat de spreker, zijn pil of de held raakt.
   De eerste versie (vast op 34-36% van links) lag in de finale op laptop-3D 1-3,4 s over de
   DICKtator; deze zone haalt <= 179 ms randpixels, en 0 op mobiel. Na de doodsklap telt de
   gevallen baas nog mee: zijn slotwoord hoort naast hem, niet op hem. */
function spraakZone(el) {
  const g = S && S.gevecht; if (!g || !el) return;
  const isBaas = v => VIJANDEN[v.id] && VIJANDEN[v.id].baas;
  const b = g.vijanden.find(v => !v.dood && isBaas(v)) || g.vijanden.find(isBaas); if (!b) return;
  const i = g.vijanden.indexOf(b);
  const wrap = GDOM.vijanden[i] && GDOM.vijanden[i].wrap;
  let art = null;   /* de spreker zelf: {l, t, r, b} */
  if (d3Actief() && window.Vista) {
    const p = Vista.schermPos(b);
    if (p) { const h = p.voetY - p.topY; art = { l: p.x - h * 0.36, r: p.x + h * 0.36, t: p.topY, b: p.voetY }; }
  } else {
    const a = wrap && wrap.querySelector('.vijand-art');
    if (a) { const q = a.getBoundingClientRect(); art = { l: q.left, r: q.right, t: q.top, b: q.bottom }; }
  }
  if (!art) return;
  /* de pil hoort bij de spreker (op mobiel hangt ze soms links naast zijn hoofd, B0.9) */
  const pillen = wrap ? [...wrap.querySelectorAll('.intent')].map(p => p.getBoundingClientRect()).filter(q => q.width > 0 && q.top < innerHeight * 0.5) : [];
  const links = Math.min(art.l, ...pillen.map(q => q.left)), rechts = Math.max(art.r, ...pillen.map(q => q.right));
  const W = innerWidth, mob = document.body.dataset.modus === 'mobiel';
  const bb = document.getElementById('baas-balk');
  const bbR = bb ? bb.getBoundingClientRect() : null;
  const hartL = (mob && bbR && bbR.width) ? bbR.left : W;
  const L = Math.max(12, W * 0.03);
  const zA = [L, links - 12], zB = [rechts + 12, Math.min(W - 12, hartL - 8)];
  const bA = zA[1] - zA[0], bB = zB[1] - zB[0];
  /* maat: 0 = gewoon, 1 = .smal, 2 = .smal.krap (alleen mobiel) */
  const zet = (z, maat) => { el.style.left = Math.round((z[0] + z[1]) / 2) + 'px'; el.style.maxWidth = Math.round(z[1] - z[0]) + 'px'; el.classList.toggle('smal', maat >= 1); el.classList.toggle('krap', maat >= 2); };
  if (!mob) {
    /* laptop: de band boven de (kleine) held is vrij -> links, anders de bredere kant */
    let z = bA >= 200 ? zA : (bA >= bB ? zA : zB);
    /* B2 F1: een plaat die al staat, wisselt niet van kant zolang haar kant breed genoeg blijft
       (toneelWacht rekent elke 150 ms opnieuw; een baas die oprijst, verschoof de grens) */
    if (el._kant) { const zk = el._kant === 'A' ? zA : zB; if (zk[1] - zk[0] >= 160) z = zk; }
    if (z[1] - z[0] < 160) return;   /* nergens plaats: dan de standaardplek (gecentreerd) */
    el._kant = z === zA ? 'A' : 'B';
    zet(z, 0);
    return;
  }
  /* Mobiel: een paar kandidaten, in volgorde van voorkeur, en de eerste die niemand raakt
     wint - gemeten op de plaat zelf, na het zetten (een lange regel wordt drie regels).
     1. P's keuze: rechts (over het hof) als daar >= 200px is, anders de bredere kant;
     2. links tot de art zelf: een pil-zij hangt lager dan de plaat en hoeft haar niet te
        blokkeren (800x360 na de herverkiezing: '🗳️ DE REDE' links, de lange beleidsstrook
        rechts - zonder deze kandidaat viel de plaat terug op de standaardplek, gecentreerd
        precies op de DICKtator: 840 ms);
     3. de bredere kant, ook als ze smaller is dan 160px (>= 110).
     Elke kandidaat met het gewone, het smalle en - als niets anders schoon is - het krappe
     lettertype (een zone < 340px nooit gewoon). De spreker, zijn pil en de bazenbalk wegen
     vier keer zo zwaar als de held; het hof mag een plaat even afdekken. Een plaat houdt
     haar plek zolang die schoon blijft, zodat ze niet heen en weer springt terwijl ze opkomt.
     B2 F1 — DE CHIPS. Ook de statuschips zijn een hindernis, lichter dan de held (x0,5): die
     van de held boven zijn hoofd (B0.8; de introplaat van de Erfprins dekte op 846x381 zijn
     bovenste chiprij) én die van de vijanden - anders week de plaat naar rechts en legde ze
     zich over de chipkolom van de baas (800x360: 700-1 256 px2). En een plaat van meer dan
     twee regels telt als een botsing van 3 000 px2 per extra regel (P: <= 2 regels op
     800x360): liever één regel over een chip dan drie regels in een smalle strook.
     Gemeten (introregel, held en baas met 4-5 statussen): op 846x381 alle chips 0 (was
     heldchips 1 252-5 376 px2), op 800x360 bij de Slijmkoning en de Erfprins heldchips 0 (de
     rand van de bovenste baaschip, ~400 px2), nooit een derde regel. Bij de DICKtator op
     800x360 en op 740x360 is er nergens een schone plek van <= 2 regels: dan links, over een
     deel van de bovenste chiprij (1 138-2 294 px2, was 1 392-4 653).
     En een plaat die al STAAT, springt niet meer van kant: zie hieronder. */
  const hf = document.getElementById('speler-figuur');
  const held = hf ? hf.getBoundingClientRect() : null;
  const chips = [...document.querySelectorAll('#scherm-gevecht .blok-status > *')].map(c => c.getBoundingClientRect()).filter(q => q.width > 0);
  /* [rechthoek, gewicht, is het de spreker zelf (zijn lijf of zijn pil)] */
  const hindernis = [[art, 4, 1], ...pillen.map(q => [q, 4, 1]), [bbR && bbR.width ? bbR : null, 4, 0], [held, 1, 0], ...chips.map(q => [q, 0.5, 0])].filter(h => h[0]);
  const sp = el.querySelector('span');
  const regels = () => {
    const cs = getComputedStyle(sp), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
    return Math.round((sp.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / lh);
  };
  /* spreker = true: alleen zijn lijf en zijn pil (de maat voor een plaat die al staat) */
  const kost = spreker => {
    if (!sp) return 0;
    const q = sp.getBoundingClientRect();
    const k = hindernis.reduce((s, [r, w, isSpreker]) => {
      if (spreker && !isSpreker) return s;
      const x = Math.min(q.right, r.right != null ? r.right : r.r) - Math.max(q.left, r.left != null ? r.left : r.l);
      const y = Math.min(q.bottom, r.bottom != null ? r.bottom : r.b) - Math.max(q.top, r.top != null ? r.top : r.t);
      return s + (x > 0 && y > 0 ? x * y * w : 0);
    }, 0);
    return spreker ? k : k + Math.max(0, regels() - 2) * 3000;
  };
  const zA2 = [L, art.l - 12];
  /* B3 — de strook LINKS VAN DE CHIPS VAN DE HELD (zijn chipblok staat boven zijn hoofd, B0.8).
     Een baas die alleen staat, krijgt liggend een eigen podium (B1.1): hij schuift naar rechts en
     de strook tussen hem en het hart (zB) wordt te smal (846x381: 104 px), zodat de plaat links
     over de bovenste chiprij van de held viel (514-526 px2). Deze kandidaat komt als laatste: hij
     wint alleen als alle andere iets raken, en dan in twee smalle regels naast de chips. */
  const heldChipsL = Math.min(...[...document.querySelectorAll('#speler-zone .blok-status > *')].map(c => c.getBoundingClientRect()).filter(q => q.width > 0).map(q => q.left));
  const zH = isFinite(heldChipsL) ? [L, Math.min(links - 12, heldChipsL - 8)] : zA;
  const volg = [];
  /* kant: L (links van de spreker, A, A2 en H) of R (rechts, B) */
  for (const [z, kant] of [bB >= 200 ? [zB, 'R'] : (bA >= bB ? [zA, 'L'] : [zB, 'R']), [zA2, 'L'], bA >= bB ? [zA, 'L'] : [zB, 'R'], [zB, 'R'], [zA, 'L'], [zH, 'L']]) {
    if (z[1] - z[0] >= 110 && !volg.some(v => v.z[0] === z[0] && v.z[1] === z[1])) volg.push({ z, kant });
  }
  if (!volg.length) return;
  /* B2 F1 — EEN STAANDE PLAAT SPRINGT NIET VAN KANT. toneelWacht rekent elke 150 ms opnieuw,
     en vroeger zocht een plaat die ergens iets raakte meteen een nieuwe zone: op 800x360
     sprong „Herverkozen. Unaniem…" midden in de regel 431 px, op 846x381 413 px - toen de
     DICKtator oprees en toen zijn bazenbalk bij de herverkiezing 117 px breder werd. Nu houdt
     ze haar zone zolang de SPREKER (zijn lijf, zijn pil) haar niet raakt; wat er verder over
     schuift (de bazenbalk, een chip), ligt er ten hoogste de rest van die ene regel onder.
     Raakt hij haar wel, dan eerst een kleinere letter op dezelfde plek, dan dezelfde kant
     met de nieuwe grenzen, en alleen als ook dat niet schoon kan een plek waar hij haar
     niet raakt. */
  const o = el._zone;
  if (o) {
    for (const maat of [0, 1, 2].filter(m => m >= o.maat)) { zet(o.z, maat); if (kost(true) === 0) { o.maat = maat; return; } }
    for (const zk of volg.filter(v => v.kant === o.kant)) for (const maat of [0, 1, 2].filter(m => m >= o.maat)) {
      if (maat === 0 && zk.z[1] - zk.z[0] < 340) continue;
      zet(zk.z, maat);
      if (kost(true) === 0) { el._zone = { z: zk.z, maat, kant: zk.kant }; return; }
    }
  }
  let best = null;
  zoek: for (const maat of [0, 1, 2]) for (const v of volg) {
    if (maat === 0 && v.z[1] - v.z[0] < 340) continue;
    zet(v.z, maat);
    const k = kost();
    if (!best || k < best.k) best = { z: v.z, maat, k, kant: v.kant, ks: kost(true) };
    if (k === 0) break zoek;
  }
  /* een staande plaat verhuist alleen als de spreker haar op de nieuwe plek niet raakt */
  if (o && best.ks > 0) { zet(o.z, o.maat); return; }
  el._zone = { z: best.z, maat: best.maat, kant: best.kant };
  zet(best.z, best.maat);
}

/* ---------- B0.13 — de fasebanner blijft boven het hoofd van de held (mobiel liggend) ----------
   De banner staat links in de bovenband (css). Een lange ondertitel (DE ROOF: "7 van je beste
   kaarten — nu MÍJN werk. Je dek sluit zich.") wrapte op 800x360 naar twee regels en liep
   over het hoofd van de held (10,9% van zijn silhouet). Na het tonen meten we of titel of
   ondertitel de figuur van de held raakt (zijn art heeft bovenaan maar 1-2% lucht, dus de
   doos volstaat); zo ja, een maat kleiner (.bf-klein), en zo nodig nog een (.bf-kleinst).
   Een korte banner links van de held blijft op volle maat.
   B3 (integratie): ook op laptop. De fase-3-banner van de Erfprins ("HET IS ALLEMAAL VAN MIJ",
   met de ondertitel die zegt hoeveel kaarten hij vanaf dan speelt) brak op 1366x768 in 2D naar
   vier regels en lag op 26 % van de held. In 3D is de held een sprite: zijn doos komt dan uit
   Vista.schermPos (de breedte zoals erfPlaatsSpeelKaart ze neemt).
   B3 F1: ook de PIL VAN DE BAAS blijft vrij, en op laptop de chips van de held (op mobiel zakken die
   tijdens een banner naar .12, zie mobiel.css C2). Op zijn telefoon hangt de pil van de Erfprins
   (pil-zij) in dezelfde bovenband: WOEDE, DE ROOF, fase 3, het noodrantsoen en de naroof liepen er
   per tekstregel 500-2 200 px2 overheen (846x381), ook in JOUW beurt, net als je hem moet lezen.
   De banner krijgt dan eerst een smallere kolom (tot vóór de pil, zo nodig tot vóór de held) en
   een kleinere letter; van de plekken waar geen tekstregel iets raakt, wint de laagste banner.
   B3 F2: eerst de pil op haar EINDPLEK (zetPilZij, pilKrap en de wijkende chips, die anders pas bij
   de volgende tik van de toneelwacht lopen) en pas dan meten; en verhuist ze nog terwijl de banner
   staat, dan past bannerVolgt() hem opnieuw (zie daar). */
const _baasPillen = () => [...document.querySelectorAll('#vijanden-rij .vijand.is-baas .intent-rij .intent')].map(e => e.getBoundingClientRect()).filter(q => q.width > 0);
const _snijdt = (q, r) => q.bottom > r.top && q.top < r.bottom && q.right > r.left && q.left < r.right;
/* de tekstregels van een banner (een regel is korter dan zijn blok): Range per tekstknoop */
function _bannerRegels(el) {
  const uit = [];
  for (const c of el.children) {
    const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const rg = document.createRange(); rg.selectNodeContents(n); for (const q of rg.getClientRects()) if (q.width > 0) uit.push(q); }
  }
  return uit;
}
function bannerFit(el) {
  if (!el || innerHeight > innerWidth) return;
  if (document.body.dataset.modus === 'mobiel') { zetPilZij(); pilKrap(); heldChipsWijken(); }
  let h = null;
  const sc = document.getElementById('scherm-gevecht');
  if (sc && sc.classList.contains('d3-actief') && window.Vista && Vista.schermPos && typeof S !== 'undefined' && S && S.gevecht) {
    const p = Vista.schermPos(S.gevecht.speler);
    if (p) { const hh = p.voetY - p.topY; h = { left: p.x - hh * 0.3, right: p.x + hh * 0.3, top: p.topY, bottom: p.voetY }; }
  } else {
    const hf = document.getElementById('speler-figuur'); if (hf) h = hf.getBoundingClientRect();
  }
  if (!h) return;
  const rect = e => e.getBoundingClientRect();
  const pillen = _baasPillen();
  el._pillen = pillen;   /* de pil zoals deze fit ze zag (bannerVolgt) */
  /* de chips van de held tellen alleen waar ze tijdens een banner niet dimmen (laptop); op mobiel
     zakken ze naar .12 (css), en de computed opacity helpt hier niet: de overgang loopt nog */
  const chipsEl = document.body.dataset.modus === 'mobiel' ? null : document.querySelector('#speler-zone .blok-status');
  const chips = chipsEl ? [...chipsEl.children].map(rect).filter(q => q.width > 0) : [];
  const snijdt = _snijdt;
  const regels = () => _bannerRegels(el);
  const raaktHeld = () => [...el.children].some(c => {
    const q = rect(c);
    return q.bottom > h.top - 2 && q.top < h.bottom && q.right > h.left && q.left < h.right;
  });
  const kost = () => {
    let k = raaktHeld() ? 1000 : 0;
    for (const q of regels()) { for (const p of pillen) if (snijdt(q, p)) k += 100; for (const c of chips) if (snijdt(q, c)) k += 10; }
    return k;
  };
  if (!pillen.length && !chips.length) {   /* het oude pad: alleen de held */
    if (raaktHeld()) el.classList.add('bf-klein');
    if (raaktHeld()) el.classList.add('bf-kleinst');
    return;
  }
  const L = Math.min(...[...el.children].map(c => rect(c).left));
  const std = Math.max(...[...el.children].map(c => rect(c).width), parseFloat(getComputedStyle(el.children[0]).maxWidth) || 0);   /* de css-kolom (44vw / 40vw): nooit breder */
  const hind = pillen.concat(chips).filter(p => p.top < h.top);   /* wat boven zijn hoofd in de band hangt */
  const totPil = hind.length ? Math.min(...hind.map(p => p.left)) - 10 - L : null;
  const totHeld = Math.min(totPil == null ? Infinity : totPil, h.left - 10 - L);
  const breedtes = [null, totPil, totHeld].filter((b, i, a) => b == null || (b >= 110 && b < std - 1 && a.indexOf(b) === i));
  const zet = (maat, b) => {
    el.classList.toggle('bf-klein', maat >= 1); el.classList.toggle('bf-kleinst', maat >= 2);
    for (const c of el.children) c.style.maxWidth = b == null ? '' : Math.floor(b) + 'px';
  };
  const volg = [];
  for (const maat of [0, 1, 2]) for (const b of breedtes) volg.push([maat, b]);
  /* de volle maat op de gewone plek wint meteen (het oude gedrag als er niets in de weg hangt);
     anders, van alle schone plekken, de laagste banner (minder regels), met een kleine prijs per
     maat kleiner - zo wordt het in een smalle kolom "HET IS ALLEMAAL / VAN MIJ" en niet
     "HET IS / ALLEMAAL VAN / MIJ" */
  let best = null;
  for (const [maat, b] of volg) {
    zet(maat, b);
    const k = kost();
    if (k === 0 && maat === 0 && b == null) { el._fit = '0/std'; return; }   /* een JS-eigenschap: de DOM van een banner blijft ongewijzigd (B2) */
    const hoog = Math.max(...[...el.children].map(c => rect(c).bottom)) - Math.min(...[...el.children].map(c => rect(c).top));
    const score = k * 1000 + hoog + maat * 20;
    if (!best || score < best.score) best = { score, k, maat, b };
  }
  zet(best.maat, best.b);
  el._fit = `${best.maat}/${best.b == null ? 'std' : Math.floor(best.b)}${best.k ? '/k' + best.k : ''}`;
}

/* ---------- B3 F2 — een staande banner volgt de pil van de baas ----------
   bannerFit meet de pil op het moment dat de banner komt. Verhuist ze daarna, dan liep de banner
   er de rest van zijn tijd overheen: HET NOODRANTSOEN in jouw beurt op zijn telefoon (846x381) -
   zijn schijndood liet de art zakken, dus hing de pil boven zijn hoofd toen de banner kwam, en zodra
   hij opstond zette zetPilZij haar links naast zijn hoofd, midden in de ondertitel (900-2 100 px2,
   ~2 s lang). Een nieuwe pose of een nieuwe pip doet hetzelfde. De toneelwacht roept dit elke tik,
   direct na zetPilZij (dus in dezelfde taak, zonder verfbeurt ertussen): is de pil verhuisd (meer
   dan 6 px - de ademende art beweegt haar een paar pixels) en raakt een tekstregel haar nu, dan
   past de banner opnieuw. Schuift ze weg, dan blijft hij staan: geen sprong voor niets. */
function bannerVolgt() {
  const el = document.querySelector('#scherm-gevecht > .baas-flits:not(.bf-weg)');
  if (!el || !el._pillen || innerHeight > innerWidth) return;
  const nu = _baasPillen(), oud = el._pillen;
  const zelfde = nu.length === oud.length && nu.every((q, i) => Math.abs(q.left - oud[i].left) <= 6 && Math.abs(q.top - oud[i].top) <= 6
    && Math.abs(q.right - oud[i].right) <= 6 && Math.abs(q.bottom - oud[i].bottom) <= 6);
  if (zelfde) return;
  if (_bannerRegels(el).some(q => nu.some(p => _snijdt(q, p)))) bannerFit(el);
  else el._pillen = nu;
}

/* ---------- --bb-onder: de onderrand van de bazenbalk als CSS-variabele ----------
   Op laptop beginnen de fasebanner (B0.13) en de spraakplaat (B0.5) net onder de bazenbalk.
   Die groeit mee met wat hij toont (Geroofd-pil, beleidsstrook), dus een ResizeObserver
   houdt de maat bij; zonder zichtbare balk (gewoon gevecht) geldt 60px. */
function zetBazenbalkOnder() {
  const bb = document.getElementById('baas-balk'); if (!bb) return;
  const r = bb.getBoundingClientRect();
  document.body.style.setProperty('--bb-onder', Math.round(r.height ? r.bottom : 60) + 'px');
  /* B0.12: de vrije bovenrand verschuift mee, en in een 3D-baasgevecht het kader ook */
  _vrijBoven = null;
  const sc = document.getElementById('scherm-gevecht');
  if (sc && sc.classList.contains('d3-actief') && typeof S !== 'undefined' && S && S.gevecht && S.gevecht.soort === 'baas') planKaderFit(120);
}
(function volgBazenbalk() {
  const bb = document.getElementById('baas-balk'); if (!bb) return;
  if (window.ResizeObserver) new ResizeObserver(zetBazenbalkOnder).observe(bb);
  window.addEventListener('resize', zetBazenbalkOnder);
  zetBazenbalkOnder();
})();

/* ---------- B0.12 — het 3D-kader van een baasgevecht ----------
   vrijeBovenrand(): de eerste vrije pixelrij onder de HUD (topbalk, en de bazenbalk als die
   staat) + 4px. gevechtTik leest haar elk frame, dus ze is GECACHET en wordt herberekend als
   de bazenbalk van maat verandert, bij resize en bij elke kaderfit. */
function _meetVrijeBovenrand() {
  const tb = document.getElementById('topbalk'), bb = document.getElementById('baas-balk');
  let y = tb ? tb.getBoundingClientRect().bottom : 52;
  if (bb && bb.style.display !== 'none' && getComputedStyle(bb).display !== 'none') {
    /* computed top + layouthoogte: immuun voor de animaties op de balk (hart, pips) */
    y = Math.max(y, (parseFloat(getComputedStyle(bb).top) || 0) + bb.offsetHeight);
  }
  _vrijBoven = y + 4;
  return _vrijBoven;
}
function vrijeBovenrand() { return _vrijBoven == null ? _meetVrijeBovenrand() : _vrijBoven; }

/* kaderFit3D(): de camera van een 3D-baasgevecht, per scherm uitgerekend.
   - de voeten: ELKE figuur staat met zijn voeten boven zijn eigen labelstapel (hp, chips),
     die op de bovenrand van de kaarten rust. gevechtTik hangt die stapel onder de voeten en
     klemt hem op die lijn; staat een voet lager, dan schuift de hp-balk over het eigen lijf.
     Per figuur dus, niet de voetlijn van het toneel: de held staat vooraan (z +0,4) en zijn
     voeten vallen op het scherm 7-11px lager dan die lijn (integratie B2: zijn hp-balk lag
     tot 0,7% over zijn laarzen, 1440-3D). 2px speling voor de adem.
   - kopDoel: de kruin van de HOOGSTE figuur blijft onder vrijeBovenrand() + 35 (de pil);
   - de kleinste fov (>= 50) die beide haalt, met per fov de kijkhoogte (kijkY) die de
     laagste voet precies op zijn grens zet.
   Gemeten: fov 52-55 op 1440x900 en 61-66 op 1366x768 (P's toneelvoetlijn: 53,4 en 64,0).
   Eigen label op eigen lijf 45,4% -> 0% (1366-3D), pil in de bazenbalk 2 905 px2 -> 0. De
   prijs op 1366x768: de figuren worden ruim een kwart kleiner, nog altijd groter dan in 2D
   (beslissing Thomas: de kaderfit). Een gewoon gevecht krijgt de vaste camera terug. */
function kaderFit3D() {
  const sc = document.getElementById('scherm-gevecht');
  if (!sc || !sc.classList.contains('d3-actief') || !window.Vista || !Vista.zetKader) return null;
  const g = S && S.gevecht; if (!g) return null;
  if (g.soort !== 'baas') { if (Vista.kaderStand().eigen) { Vista.zetKader(null); plaatsGevechtsplaat(); } return null; }
  const lev = g.vijanden.filter(v => !v.dood); if (!lev.length) return null;
  renderGevecht();   /* labels (en dus infoH) op de huidige stand */
  Vista.zetKader(null);
  let hoogste = lev[0], hoogsteTop = Infinity;
  lev.forEach(v => { const p = Vista.schermPos(v); if (p && p.topY < hoogsteTop) { hoogsteTop = p.topY; hoogste = v; } });
  const kopDoel = _meetVrijeBovenrand() + 35;
  /* de grens per figuur, dezelfde rekensom als gevechtTik: de held hangt zijn stapel (infoH)
     direct onder de voeten; een vijand draagt 34px pilruimte boven zijn kruin mee */
  const lijn = innerHeight - ((GDOM.onderbalkH || 235) - 25), ADEM = 2;
  const grenzen = [];
  /* B2 F1: met de hoogste stapel van dit gevecht (infoHMax: een chiprij die naar onder
     overloopt, telt mee - zie renderGevecht) */
  const stapelH = d => d.infoHMax != null ? d.infoHMax : d.infoH;
  if (GDOM.speler) grenzen.push({ a: g.speler, max: lijn - (stapelH(GDOM.speler) || 0) - ADEM });
  g.vijanden.forEach((v, i) => { const d = GDOM.vijanden[i]; if (d && !v.dood) grenzen.push({ a: v, max: lijn - ((stapelH(d) || 130) - 34) - ADEM }); });
  /* > 0: een voet staat lager dan zijn grens (de hp-balk zou over het lijf schuiven) */
  const teLaag = () => Math.max(...grenzen.map(x => { const p = Vista.schermPos(x.a); return p ? p.voetY - x.max : -Infinity; }));
  const zet = (fov, kijkY) => Vista.zetKader({ fov, kijkY });
  /* per fov: de kijkhoogte die de laagste voet op zijn grens legt (bisectie; de voeten
     zakken monotoon als de camera hoger kijkt) */
  const kijkVoor = fov => {
    let lo = -4, hi = 8;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; zet(fov, m); if (teLaag() > 0) hi = m; else lo = m; }
    return (lo + hi) / 2;
  };
  const kopBij = fov => { const k = kijkVoor(fov); zet(fov, k); return { k, top: Vista.schermPos(hoogste).topY }; };
  let best = { fov: 50, ...kopBij(50) };
  if (best.top < kopDoel) {
    let lo = 50, hi = 95; best = null;
    for (let i = 0; i < 22; i++) {
      const f = (lo + hi) / 2, r = kopBij(f);
      if (r.top < kopDoel) lo = f; else { hi = f; best = { fov: f, ...r }; }
    }
    if (!best) best = { fov: 95, ...kopBij(95) };
  }
  zet(best.fov, best.k);
  plaatsGevechtsplaat();
  return { fov: +best.fov.toFixed(2), kijkY: +best.k.toFixed(3), kopDoel: Math.round(kopDoel), voetSpeling: +(-teLaag()).toFixed(1), top: Math.round(best.top) };
}
/* de fit loopt VANZELF: na elke Vista.gevechtStart (start, nieuwkomer, de 3D-knop), bij
   resize, en als de bazenbalk van hoogte verandert (Geroofd-pil, beleidsstrook) */
function planKaderFit(ms) {
  clearTimeout(_kaderT);
  _kaderT = setTimeout(() => { try { kaderFit3D(); } catch (e) { } }, ms);
}
window.addEventListener('vista:gevechtstart', () => {
  const g = typeof S !== 'undefined' && S && S.gevecht;
  /* een gewoon gevecht: meteen de vaste camera terug (vóór plaatsGevechtsplaat zijn voetlijn
     leest), een baasgevecht: fitten zodra het DOM staat */
  if (g && g.soort === 'baas') planKaderFit(60);
  else if (window.Vista && Vista.kaderStand && Vista.kaderStand().eigen) Vista.zetKader(null);
});
window.addEventListener('resize', () => { _vrijBoven = null; planKaderFit(180); });
/* B2 F1: renderGevecht meldt het als de chipstapel van een figuur HOGER wordt dan ooit in dit
   gevecht (er komt een chiprij bij, de overloop onder de vaste rij). In een 3D-baasgevecht
   past het kader zich dan één keer aan, anders klemde gevechtTik de stapel omhoog en lag de
   hp-balk van de held tot 7 % over zijn benen (1366-3D, 6-7 statussen). Krimpt de stapel,
   dan blijft het kader staan (geen camera die elke beurt meepompt). */
function kaderNaOverloop() {
  const sc = document.getElementById('scherm-gevecht');
  if (sc && sc.classList.contains('d3-actief') && S && S.gevecht && S.gevecht.soort === 'baas') planKaderFit(120);
}

/* ---------- de toneelwacht: één lichte lus (150 ms), alleen tijdens een gevecht ----------
   Figuren bewegen buiten renderGevecht om (entree, oprijzen, het hof dat opkomt, de adem),
   dus wat aan hun positie hangt, volgt hier mee. Buiten het gevecht doet de lus niets. */
function toneelWacht() {
  if (typeof S === 'undefined' || !S || !S.gevecht || document.body.dataset.scherm !== 'gevecht') return;
  if (document.body.dataset.modus === 'mobiel') { zetPilZij(); pilKrap(); heldChipsWijken(); }
  bannerVolgt();   /* B3 F2: een staande banner volgt een pil die verhuisde */
  /* een staande spraakplaat volgt de zone mee (het hof komt op, de pil wisselt) */
  document.querySelectorAll('.baas-spraak').forEach(spraakZone);
}
setInterval(toneelWacht, 150);
