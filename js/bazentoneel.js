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
}
setInterval(toneelWacht, 150);
