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
   de pil, maar nooit onder de inzage-knop (x < 44). */
function heldChipsWijken() {
  const hs = document.querySelector('#speler-zone .blok-status'); if (!hs) return;
  const oud = parseFloat(hs.style.getPropertyValue('--wijk')) || 0;
  const pil = document.querySelector('#vijanden-rij .vijand.is-baas.pil-zij .intent-rij');
  let wijk = 0;
  if (pil && hs.childElementCount) {
    const p = pil.getBoundingClientRect(), c = hs.getBoundingClientRect();
    /* de chipblok zoals hij zonder wijk zou staan */
    const l0 = c.left + oud, r0 = c.right + oud;
    if (c.top < p.bottom + 4 && c.bottom > p.top - 4 && r0 > p.left - 6) wijk = Math.min(r0 - (p.left - 6), Math.max(0, l0 - 44));
  }
  if (Math.abs(wijk - oud) >= 1) hs.style.setProperty('--wijk', Math.round(wijk) + 'px');
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
    if (z[1] - z[0] < 160) return;   /* nergens plaats: dan de standaardplek (gecentreerd) */
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
     haar plek zolang die schoon blijft, zodat ze niet heen en weer springt terwijl ze opkomt. */
  const hf = document.getElementById('speler-figuur');
  const held = hf ? hf.getBoundingClientRect() : null;
  const hindernis = [[art, 4], ...pillen.map(q => [q, 4]), [bbR && bbR.width ? bbR : null, 4], [held, 1]].filter(h => h[0]);
  const sp = el.querySelector('span');
  const kost = () => {
    if (!sp) return 0;
    const q = sp.getBoundingClientRect();
    return hindernis.reduce((s, [r, w]) => {
      const x = Math.min(q.right, r.right != null ? r.right : r.r) - Math.max(q.left, r.left != null ? r.left : r.l);
      const y = Math.min(q.bottom, r.bottom != null ? r.bottom : r.b) - Math.max(q.top, r.top != null ? r.top : r.t);
      return s + (x > 0 && y > 0 ? x * y * w : 0);
    }, 0);
  };
  const zA2 = [L, art.l - 12];
  const volg = [];
  for (const z of [bB >= 200 ? zB : (bA >= bB ? zA : zB), zA2, bA >= bB ? zA : zB, zB, zA]) {
    if (z[1] - z[0] >= 110 && !volg.some(v => v[0] === z[0] && v[1] === z[1])) volg.push(z);
  }
  if (!volg.length) return;
  if (el._zone) { zet(el._zone.z, el._zone.maat); if (kost() === 0) return; }
  let best = null;
  zoek: for (const maat of [0, 1, 2]) for (const z of volg) {
    if (maat === 0 && z[1] - z[0] < 340) continue;
    zet(z, maat);
    const k = kost();
    if (!best || k < best.k) best = { z, maat, k };
    if (k === 0) break zoek;
  }
  el._zone = best;
  zet(best.z, best.maat);
}

/* ---------- B0.13 — de fasebanner blijft boven het hoofd van de held (mobiel liggend) ----------
   De banner staat links in de bovenband (css). Een lange ondertitel (DE ROOF: "7 van je beste
   kaarten — nu MÍJN werk. Je dek sluit zich.") wrapte op 800x360 naar twee regels en liep
   over het hoofd van de held (10,9% van zijn silhouet). Na het tonen meten we of titel of
   ondertitel de figuur van de held raakt (zijn art heeft bovenaan maar 1-2% lucht, dus de
   doos volstaat); zo ja, een maat kleiner (.bf-klein), en zo nodig nog een (.bf-kleinst).
   Een korte banner links van de held blijft op volle maat. */
function bannerFit(el) {
  if (!el || document.body.dataset.modus !== 'mobiel' || innerHeight > innerWidth) return;
  const hf = document.getElementById('speler-figuur'); if (!hf) return;
  const h = hf.getBoundingClientRect();
  const raakt = () => [...el.children].some(c => {
    const q = c.getBoundingClientRect();
    return q.bottom > h.top - 2 && q.top < h.bottom && q.right > h.left && q.left < h.right;
  });
  if (raakt()) el.classList.add('bf-klein');
  if (raakt()) el.classList.add('bf-kleinst');
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
  if (GDOM.speler) grenzen.push({ a: g.speler, max: lijn - (GDOM.speler.infoH || 0) - ADEM });
  g.vijanden.forEach((v, i) => { const d = GDOM.vijanden[i]; if (d && !v.dood) grenzen.push({ a: v, max: lijn - ((d.infoH || 130) - 34) - ADEM }); });
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

/* ---------- de toneelwacht: één lichte lus (150 ms), alleen tijdens een gevecht ----------
   Figuren bewegen buiten renderGevecht om (entree, oprijzen, het hof dat opkomt, de adem),
   dus wat aan hun positie hangt, volgt hier mee. Buiten het gevecht doet de lus niets. */
function toneelWacht() {
  if (typeof S === 'undefined' || !S || !S.gevecht || document.body.dataset.scherm !== 'gevecht') return;
  if (document.body.dataset.modus === 'mobiel') { zetPilZij(); heldChipsWijken(); }
  /* een staande spraakplaat volgt de zone mee (het hof komt op, de pil wisselt) */
  document.querySelectorAll('.baas-spraak').forEach(spraakZone);
}
setInterval(toneelWacht, 150);
