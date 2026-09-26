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
     hoveling even afdekken, de spreker nooit; anders de bredere kant;
   - in een smalle mobiele zone (< 340px) een kleiner lettertype (.smal), zodat de plaat
     twee regels blijft en boven het hoofd van de held.
   De eerste versie (vast op 34-36% van links) lag in de finale op laptop-3D 1-3,4 s over de
   DICKtator; deze zone haalt <= 179 ms randpixels, en 0 op mobiel. Na de doodsklap telt de
   gevallen baas nog mee: zijn slotwoord hoort naast hem, niet op hem. */
function spraakZone(el) {
  const g = S && S.gevecht; if (!g || !el) return;
  const isBaas = v => VIJANDEN[v.id] && VIJANDEN[v.id].baas;
  const b = g.vijanden.find(v => !v.dood && isBaas(v)) || g.vijanden.find(isBaas); if (!b) return;
  const i = g.vijanden.indexOf(b);
  const wrap = GDOM.vijanden[i] && GDOM.vijanden[i].wrap;
  let links = null, rechts = null;
  if (d3Actief() && window.Vista) {
    const p = Vista.schermPos(b);
    if (p) { const h = p.voetY - p.topY; links = p.x - h * 0.36; rechts = p.x + h * 0.36; }
  } else {
    const a = wrap && wrap.querySelector('.vijand-art');
    if (a) { const q = a.getBoundingClientRect(); links = q.left; rechts = q.right; }
  }
  if (links == null) return;
  /* de pil hoort bij de spreker (op mobiel hangt ze soms links naast zijn hoofd, B0.9) */
  if (wrap) wrap.querySelectorAll('.intent').forEach(p => {
    const q = p.getBoundingClientRect();
    if (q.width > 0 && q.top < innerHeight * 0.5) { links = Math.min(links, q.left); rechts = Math.max(rechts, q.right); }
  });
  const W = innerWidth, mob = document.body.dataset.modus === 'mobiel';
  const bb = document.getElementById('baas-balk');
  const bbR = bb ? bb.getBoundingClientRect() : null;
  const hartL = (mob && bbR && bbR.width) ? bbR.left : W;
  const L = Math.max(12, W * 0.03);
  const zA = [L, links - 12], zB = [rechts + 12, Math.min(W - 12, hartL - 8)];
  const bA = zA[1] - zA[0], bB = zB[1] - zB[0];
  const z = mob ? (bB >= 200 ? zB : (bA >= bB ? zA : zB)) : (bA >= 200 ? zA : (bA >= bB ? zA : zB));
  if (z[1] - z[0] < 160) return;   /* nergens plaats: dan de standaardplek (gecentreerd) */
  el.style.left = Math.round((z[0] + z[1]) / 2) + 'px';
  el.style.maxWidth = Math.round(z[1] - z[0]) + 'px';
  if (!mob) { el.classList.remove('smal'); return; }
  /* Mobiel: een lange regel in een brede zone (846x381, 354px) werd drie regels en zakte tot
     op het hoofd van de held. Raakt de plaat de held, dan wordt ze .smal - en dat blijft ze
     voor de rest van haar leven, anders klapt ze elke 150 ms heen en weer. */
  if (!el._smal && (z[1] - z[0]) >= 340) {
    const sp = el.querySelector('span'), hf = document.getElementById('speler-figuur');
    if (sp && hf && sp.getBoundingClientRect().bottom > hf.getBoundingClientRect().top - 2) el._smal = true;
  }
  el.classList.toggle('smal', (z[1] - z[0]) < 340 || !!el._smal);
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
   - voetDoel: de voetlijn valt op de bovenrand van de kaarten min de labelstapel (hp, chips);
   - kopDoel: de kruin van de HOOGSTE figuur blijft onder vrijeBovenrand() + 35 (de pil);
   - de kleinste fov (>= 50) die beide haalt, met per fov de kijkhoogte (kijkY) die de
     voeten precies op voetDoel zet.
   Gemeten (P, rook_fit): fov 53,4 op 1440x900 en 64,0 op 1366x768. Eigen label op eigen
   lijf 45,4% -> <= 0,2% (1366-3D), pil in de bazenbalk 2 905 px2 -> 0. De prijs op
   1366x768: de figuren worden een kwart kleiner, nog altijd groter dan in 2D (beslissing
   Thomas: de kaderfit). Een gewoon gevecht krijgt de vaste camera terug. */
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
  let labels = 0;
  GDOM.vijanden.forEach((d, i) => { const v = g.vijanden[i]; if (d && v && !v.dood) labels = Math.max(labels, (d.infoH || 130) - 35); });
  if (GDOM.speler) labels = Math.max(labels, GDOM.speler.infoH || 0);
  const voetDoel = innerHeight - ((GDOM.onderbalkH || 235) - 25) - labels;
  const zet = (fov, kijkY) => Vista.zetKader({ fov, kijkY });
  /* per fov: de kijkhoogte die de voetlijn op voetDoel legt (bisectie; de voetlijn zakt
     monotoon als de camera hoger kijkt) */
  const kijkVoor = fov => {
    let lo = -4, hi = 8;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; zet(fov, m); if (Vista.voetlijnY() > voetDoel) hi = m; else lo = m; }
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
  return { fov: +best.fov.toFixed(2), kijkY: +best.k.toFixed(3), kopDoel: Math.round(kopDoel), voetDoel: Math.round(voetDoel), top: Math.round(best.top) };
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
