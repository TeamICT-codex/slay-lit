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
}
(function volgBazenbalk() {
  const bb = document.getElementById('baas-balk'); if (!bb) return;
  if (window.ResizeObserver) new ResizeObserver(zetBazenbalkOnder).observe(bb);
  window.addEventListener('resize', zetBazenbalkOnder);
  zetBazenbalkOnder();
})();

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
