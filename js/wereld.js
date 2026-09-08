/* ============================================================
   SLAY LIT — DE AFDALING (js/wereld.js)
   ------------------------------------------------------------
   De afdaalkaart als beloopbaar zijaanzicht-level. Elke rij van S.kaart is een
   VERDIEPING met een deurbaan; je landt op een GALERIJ bóven die baan, daalt af
   (rand, ladder of sprong), loopt met gewicht naar de deur die gloeit en gaat
   binnen — waarna je exact de kamer krijgt die de klassieke kaart ook geeft.

   Achter de DEV-vlag body.wereld (dev-sleutel / devWereld(), zie game.js). Zonder
   vlag tekent game.js de klassieke knopenkaart, byte-voor-byte ongewijzigd.

   LAGEN (van achter naar voor), §2.1 van het contract:
     0 nacht   #scherm-wereld achtergrondkleur
     1 verte   .w-ver   <img> per richel (afdaling_a1_verte_1..4)   x0,10 / x0,06
     2 midden  .w-mid   2 gespiegelde platen met open gaten          x0,40 / x0,30
     3 vlak    #wereld-vlak: alle geometrie, deuren, nissen, held    x1
     4 licht   <canvas id="w-licht">: duister -> plas -> gloeiers    schermvast
     5 voor    .w-voor  hangers, bijna zwart                         x1,30 / x1,20
     6 deeltjes .w-deeltjes: CSS-sprites, nul JS per frame           schermvast
     7 doek    #w-doek: titelkaart en overgangen

   HARDE REGELS
   - Determinisme is heilig: hier komt NOOIT de gedeelde seed-generator van game.js
     voor. De decor-loterij draait op een eigen mulberry32 (zaadVanTekst(seed|act|
     sleutel)); het terrein op WereldTerrein.loterij. Presentatie-ruis (deeltjes,
     flikker, stof) draait op ruis(): een eigen generator, gezaaid bij het laden.
     Lint in de teststap: grep -nE "To[e]val|rn[d]\(|kies[U]it\(|sch[u]d\(|
     willekeu[r]ig\(|Math\.ra[n]dom" js/wereld*.js  ->  0 treffers.
   - Fakkelkost en verdieping worden UITSLUITEND in kiesNodeEcht afgerekend; de
     olie uit een nis uitsluitend in kiesNisEcht (game.js). De wereld rekent nooit af.
   - Save-formaat: additief. S.w = { rij, x, y, act } (alleen op vaste grond),
     S.wn = ['act|rij', ...] (gepakte nissen), S.wg = de landings-x van de richel
     waar je staat, S.wt = de act waarvan de titelkaart al speelde.
   - De lus (Tikker) schrijft per frame alleen transforms + een canvas-pass; alles
     wat layout forceert wordt in hermeet() gecacht.
   - Idempotent: render() mag twee keer na elkaar zonder dubbele lus of daling.
   ============================================================ */
const Wereld = (() => {
  'use strict';

  const TT = window.WereldTerrein;
  const K = TT.K, FY = TT.F;
  const BREEDTE = K.BREEDTE, RH = K.RH, KOL_B = K.KOL_B, RAND = K.RAND, MARGE = K.MARGE;

  /* ---------- maten in wereld-eenheden (wu), vast op elk toestel ---------- */
  const HELD_MIN_PX = 110;              /* DE HELDMAAT-KNOP: kort liggend (~420px) geeft ~110px held */
  const HELD_MAX_PX = 210;
  const KUNST = 'assets/achtergronden/Afdaling/';
  /* de richelstrook: de looplijn zit op 57,8% van de plaat (gemeten alfa-snede) */
  const GROND_TB = 1000, GROND_TH = 400, GROND_LIJN = Math.round(GROND_TH * 0.578);
  const MID_TB = 1500, MID_TH = Math.round(MID_TB * 821 / 1916), MID_OFF = 70;
  const VOOR_TB = 1500, VOOR_TH = Math.round(VOOR_TB * 793 / 1983), VOOR_OFF = -520;
  const POORT_W = 250;                  /* de poortplaat is vierkant; het gat zit op 26,5-72,8% x 18-100% */
  const NIS_W = 160, NIS_H = 150;
  const LICHT_STRAAL = { helder: 260, schemer: 190, duister: 130, gedoofd: 90 };
  const DUISTER = { helder: 0.86, schemer: 0.89, duister: 0.92, gedoofd: 0.93 };
  const ACT_STEMPEL = {
    1: 'GEEN LIFT. B.A.A.S. BESPAART.',
    2: 'STILTE — ARCHIEF IN GEBRUIK',
    3: 'BILLABILITY-CONTROLE: TOON UW BADGE'
  };
  const ACT_TITEL = { 1: 'DE DIEPTE', 2: 'HET ARCHIEF', 3: 'HET SLACHTBLOK' };
  /* affiches: één plaat, oneindig veel slogans (de proloog-woordenschat) */
  const AFFICHES = {
    1: ['PRIKKLOKKEN IS EEN VOORRECHT', 'UW LICHT IS EEN KOSTENPOST', 'DE DIEPTE IS EEN KANS',
        'MELD DEFECTEN AAN UW LEIDINGGEVENDE', 'U WORDT ZO GEHOLPEN', 'GEEN OPWAARTSE MOBILITEIT',
        'PERSONEELSUITGANG (BUITEN GEBRUIK)', 'B.A.A.S. DANKT U VOOR UW INZET'],
    2: ['DOORSLAG IS DE NORM', 'STILTE — ARCHIEF IN GEBRUIK', 'ALLES IS GEARCHIVEERD',
        'UW DOSSIER IS ZOEK (NIET UW SCHULD)', 'ORDE IS EEN HOUDING'],
    3: ['APPLAUS IS VERPLICHT', 'TOON UW BADGE', 'DE TIRAN ZIET UW UREN', 'BILLABILITY BOVEN ALLES']
  };
  const VONDST = {
    olie: { naam: 'Oliekruik', icoon: 'assets/iconen/lantaarnolie.webp',
      lijn: 'Een halfvolle kruik lampolie, achter een losse steen. Iemand bewaarde hem voor later. Later kwam nooit.' },
    pamflet: { naam: 'Circulaire', icoon: 'assets/ui/decreet_zegel.webp', lijn: 'Circulaire nr. 7: licht is een kostenpost.' },
    fakkel: { naam: 'Gedoofde fakkel', icoon: 'assets/ui/grafzerk.webp', lijn: 'De koude fakkel van een voorganger.' }
  };
  /* de lore-regels van een vondst: gekozen met de eigen loterij, dus dezelfde seed = dezelfde tekst */
  const LORE = {
    pamflet: [
      'Circulaire nr. 7: licht is een kostenpost. Wie zuinig daalt, daalt dieper.',
      'Memo aan alle verdiepingen: de lift is geen recht maar een gunst. B.A.A.S. bespaart.',
      'Nota bene: wie zijn fakkel deelt, deelt ook zijn beoordeling.',
      'Uit het personeelsreglement: de diepte is geen straf, de diepte is een kans.',
      'Klachtenformulier B-12. In te dienen op de verdieping erboven. Er is geen weg naar boven.'
    ],
    fakkel: [
      'Een koude fakkel, de hand lag er nog omheen toen het licht opging.',
      'Iemand kwam tot hier. Zijn lont is op, zijn naam staat nergens.',
      'De fakkel van een voorganger. Hij hield hem vast tot het einde van zijn contract.'
    ],
    olie: ['Een halfvolle kruik lampolie, achter een losse steen. Bewaard voor later. Later kwam nooit.']
  };

  /* ---------- module-staat ---------- */
  let els = null;
  let st = null;                        /* de held als fysiek lichaam (WereldTerrein) */
  let W = null;                         /* de fysieke wereld (vloeren, ladders, balken) */
  let sjab = {};                        /* rij -> sjabloon */
  let actieveRij = 0, heldRij = 0, plekken = [], deurPlaten = {}, landXvan = {};
  let camX = 0, camY = 0, camBasis = 0, camAhead = 0, schokX = 0, schokY = 0;
  let k = 1, vw = 0, vh = 0, grondY = 0, kijkerLinks = 0, kijkerBoven = 0, heldPx = 170;
  let nabij = null, valgat = null, exitVanRij = null;
  let bezig = false, dalingBezig = false, dalingFase = '';
  let auto = null, autoDoel = null;
  /* DRIE timerlijsten: de titelkaart en de daling mogen ALLEEN hun eigen wachtjes wissen.
     Eén gedeelde lijst kaapte de na(620, kiesNodeEcht) die betreden() net had gezet: één tik
     tijdens de titelkaart en de wereld hing (bezig bleef true, de kamer kwam nooit). */
  let afmeld = null, timers = [], titelTimers = [], dalingTimers = [], ro = null, hintGetoond = false;
  let stapKlok = 0, loopToestand = '', wasLinks = false;
  let renT = 0, renKant = 0;                    /* de renpas: hoe lang houdt hij dezelfde kant al vast? */
  const REN_NA = 0.4;                           /* seconden vasthouden voor hij van looppas naar renpas gaat */
  let sleep = [];                       /* ringbuffer voor de metgezel (positie-replay) */
  let frames = {}, figA = null, figB = null, figAan = 'a';
  let ctx2d = null, plasSprite = null, gloedSprite = null, canvasDpr = 1;
  let dtLog = [], liteLog = [], meetTot = 0, autoLiteKlaar = false;
  let titelBezig = false;
  const raakt = new Map();              /* pointerId -> slot (twee duimen: lopen + springen) */
  const inv = { links: false, rechts: false, spring: false, omhoog: false, omlaag: false, rol: false, snel: false };
  const toets = { links: false, rechts: false, omhoog: false, omlaag: false };

  const klem = (v, a, b) => Math.max(a, Math.min(b, v));
  const px = v => v.toFixed(1) + 'px';

  /* ---------- eigen hash-PRNG voor het decor (nooit de gedeelde seed-generator) ---------- */
  function loterij(sleutel) {
    let staat = zaadVanTekst(String(S.seed) + '|' + huidigeAct() + '|' + sleutel) >>> 0;
    return function () {
      staat = (staat + 0x6D2B79F5) | 0;
      let t = Math.imul(staat ^ (staat >>> 15), 1 | staat);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const kies = (arr, sleutel) => (arr && arr.length) ? arr[Math.floor(loterij(sleutel)() * arr.length)] : null;
  /* PRESENTATIE-ruis: vuurvliegjes, flikker, stofpufjes. Raakt nooit iets wat de speler
     terugziet in een tweede run met dezelfde seed — daarom bewust niet uit de loterij. */
  const ruis = (() => {
    let s = ((Date.now() & 0x7fffffff) ^ 0x9e3779b9) >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();

  /* ---------- de graaf als terrein (pure functies van S.kaart) ---------- */
  function actief() {
    return document.body.classList.contains('wereld')
      && !!(typeof S !== 'undefined' && S && S.kaart)
      && !!window.WereldTerrein
      && !!document.getElementById('scherm-wereld');
  }
  function rijVan(id) { return id === 'baas' ? RIJEN : (S.kaart[id] ? S.kaart[id].r : 0); }
  function doelRij() { return S._herbetreed ? rijVan(S._herbetreed) : (S.pos === null ? 0 : rijVan(S.pos) + 1); }
  function plekX(n) { return n.id === 'baas' ? BREEDTE / 2 : RAND + n.c * KOL_B; }
  function plekkenVan(r, beschikbaar) {
    return Object.values(S.kaart).filter(n => n.r === r).sort((a, b) => a.c - b.c).map(n => ({
      id: n.id, type: n.type, r: n.r, c: n.c, x: plekX(n),
      open: beschikbaar.indexOf(n.id) >= 0,
      kost: fakkelKost(n.type, n.r),
      naam: n.type === 'baas' ? huidigeBaas().naam : (NODE_NAMEN[n.type] || n.type),
      icoon: NODE_ICONEN[n.type] || '❓'
    }));
  }
  const naastAfstand = () => 92;                      /* in wu: je staat NAAST de deur, niet ervoor */
  const nabijAfstand = () => 118;

  /* ---------- platen ---------- */
  function actSet() { const A = window.ACHTERGRONDEN; return A ? (A['act' + huidigeAct()] || A.act1) : null; }
  function plaat(pad) { return (pad && window.ACHTERGRONDEN) ? ACHTERGRONDEN.basis + pad : null; }
  function verdeelDoorkijken(r) {
    const set = actSet();
    const pot = set && set.gevecht ? set.gevecht.slice() : [];
    if (!pot.length) return;
    const trek = loterij('deuren|' + r);
    for (let i = pot.length - 1; i > 0; i--) { const j = Math.floor(trek() * (i + 1)); const w = pot[i]; pot[i] = pot[j]; pot[j] = w; }
    Object.values(S.kaart).filter(n => n.r === r && n.type === 'gevecht').sort((a, b) => a.c - b.c)
      .forEach((n, i) => { deurPlaten[n.id] = plaat(pot[i % pot.length]); });
  }
  function doorkijk(p) {
    const set = actSet();
    if (!set) return null;
    switch (p.type) {
      case 'gevecht': return deurPlaten[p.id] || plaat(kies(set.gevecht, 'deur|' + p.id));
      case 'elite': case 'episch': return plaat(kies((set.episch && set.episch.length) ? set.episch : set.gevecht, 'deur|' + p.id));
      case 'baas': return plaat(set.finale || (set.episch && set.episch[0]) || (set.gevecht && set.gevecht[0]));
      case 'event': return plaat(actBg('event'));
      case 'rust': return plaat(actBg('rust'));
      case 'winkel': return plaat(actBg('winkel'));
      case 'schat': return plaat(actBg('schat'));
    }
    return plaat(kies(set.gevecht, 'deur|' + p.id));
  }
  /* Act 1 heeft een eigen bioomverte (vier brede platen); Act 2/3 draaien voorlopig op
     de bestaande gevechtsplaten met de act-tint (--vd) tot hun eigen art er is. */
  function vertePad(sj) {
    if (huidigeAct() === 1) return KUNST + 'afdaling_a1_verte_' + (sj.verte || 1) + '.webp';
    const set = actSet();
    return set ? plaat(kies(set.gevecht, 'ver|' + sj.r)) : null;
  }
  const heeftBioom = () => huidigeAct() === 1;        /* Act 1: eigen grond/midden/voor/poort/props */
  const cssUrl = pad => pad ? `background-image:url('${String(pad).replace(/'/g, '%27')}')` : '';

  /* ---------- DOM binden ---------- */
  function bind() {
    const scherm = document.getElementById('scherm-wereld');
    if (!scherm || !window.WereldTerrein) return false;
    els = {
      scherm,
      kijker: scherm.querySelector('#wereld-kijker'),
      ver: scherm.querySelector('.w-ver'),
      mid: scherm.querySelector('.w-mid'),
      vlak: scherm.querySelector('#wereld-vlak'),
      richels: scherm.querySelector('.w-richels'),
      held: scherm.querySelector('#w-held'),
      metgezel: scherm.querySelector('#w-metgezel'),
      canvas: scherm.querySelector('#w-licht'),
      voor: scherm.querySelector('.w-voor'),
      deeltjes: scherm.querySelector('.w-deeltjes'),
      doek: scherm.querySelector('#w-doek'),
      hud: scherm.querySelector('#wereld-hud'),
      verdieping: scherm.querySelector('#w-verdieping'),
      plattegrond: scherm.querySelector('#w-plattegrond'),
      actie: scherm.querySelector('#w-actie'),
      springKnop: scherm.querySelector('#w-spring'),
      rolKnop: scherm.querySelector('#w-rol'),
      paneel: scherm.querySelector('#w-paneel'),
      fig: null, naloop: null, stof: []
    };
    if (!els.kijker || !els.vlak) { els = null; return false; }
    els.kijker.addEventListener('pointerdown', opPointerDown);
    els.kijker.addEventListener('pointermove', opPointerMove);
    els.kijker.addEventListener('pointerup', opPointerUp);
    els.kijker.addEventListener('pointercancel', opPointerUp);
    els.kijker.addEventListener('lostpointercapture', opPointerUp);
    /* klik-delegatie op data-id (deuren + paneelkaarten) — nooit data in inline onclick-strings */
    scherm.addEventListener('click', e => {
      const kn = e.target.closest('[data-id]');
      if (!kn || !kn.classList.contains('kan')) return;
      if (kn.classList.contains('w-plek') && !kn.closest('.w-actief')) return;
      ga(kn.dataset.id);
    });
    els.actie.addEventListener('click', doeActie);
    els.plattegrond.addEventListener('click', () => { if (typeof window.devWereld === 'function') window.devWereld(false); });
    knopGebaar(els.springKnop, () => { inv.spring = true; }, aan => { toets.omhoog = aan; });
    knopGebaar(els.rolKnop, () => { inv.rol = true; }, () => {});
    window.addEventListener('keydown', opToetsNeer);
    window.addEventListener('keyup', opToetsOp);
    window.addEventListener('blur', losAlles);
    if (window.ResizeObserver) {
      ro = new ResizeObserver(() => { if (document.body.dataset.scherm === 'wereld') hermeet(); });
      ro.observe(els.kijker);
    }
    return true;
  }
  /* een gebaarknop: flank bij neer + 'houden' zolang je hem vasthoudt (klimmen) */
  function knopGebaar(el, flank, houd) {
    if (!el) return;
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      if (dalingBezig) { slaDalingOver(); return; }
      if (bezig) return;
      flank(); houd(true); el.classList.add('in');
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    });
    const op = e => { if (e) e.stopPropagation(); houd(false); el.classList.remove('in'); };
    el.addEventListener('pointerup', op);
    el.addEventListener('pointercancel', op);
    el.addEventListener('lostpointercapture', op);
  }
  function losAlles() {
    toets.links = toets.rechts = toets.omhoog = toets.omlaag = false;
    raakt.clear();
    if (els) { els.springKnop.classList.remove('in'); els.rolKnop.classList.remove('in'); }
  }

  /* ---------- hermeten: de enige layout-reads ---------- */
  function hermeet() {
    if (!els) return;
    const r = els.kijker.getBoundingClientRect();
    vw = r.width || window.innerWidth;
    vh = r.height || window.innerHeight;
    kijkerLinks = r.left; kijkerBoven = r.top;
    /* ÉÉN camera-schaal: dezelfde sprong op telefoon en laptop (§3.1) */
    heldPx = klem(vh * 0.26, HELD_MIN_PX, HELD_MAX_PX);
    k = heldPx / K.HELD;
    grondY = Math.round(vh * (geleid() ? 0.72 : 0.64));
    els.scherm.style.setProperty('--k', k.toFixed(4));
    els.scherm.style.setProperty('--kh', Math.round(vh) + 'px');
    els.scherm.style.setProperty('--wb', BREEDTE + 'px');
    els.scherm.style.setProperty('--heldpx', Math.round(heldPx) + 'px');
    /* het lichtcanvas op DPR <= 1,5 (§6.1) */
    canvasDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const cw = Math.max(1, Math.round(vw * canvasDpr)), ch = Math.max(1, Math.round(vh * canvasDpr));
    if (els.canvas.width !== cw || els.canvas.height !== ch) {
      els.canvas.width = cw; els.canvas.height = ch;
      els.canvas.style.width = Math.round(vw) + 'px'; els.canvas.style.height = Math.round(vh) + 'px';
      ctx2d = els.canvas.getContext('2d');
    }
    if (!ctx2d) ctx2d = els.canvas.getContext('2d');
    if (!plasSprite) bakSprites();
    camX = klem(camX, camMin(), camMax());
    schrijfTransforms();
    tekenLicht();
  }
  const camMin = () => Math.min(vw / (2 * k), BREEDTE / 2);
  const camMax = () => Math.max(BREEDTE - vw / (2 * k), BREEDTE / 2);
  /* geleide modus = mobiel EN portret: de kijker is daar een band van 46%, dus de
     verhouding van het KIJKVENSTER zegt niets — het schermformaat wel. */
  const geleid = () => document.body.dataset.modus === 'mobiel' && window.innerWidth < window.innerHeight;
  const lite = () => document.body.classList.contains('lite') || document.body.classList.contains('w-lite');
  const stil = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* vooraf gebakken lichtsprites: één keer een gradiënt, daarna alleen nog blits */
  function bakSprites() {
    const mk = (maat, stops) => {
      const c = document.createElement('canvas'); c.width = c.height = maat;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(maat / 2, maat / 2, 0, maat / 2, maat / 2, maat / 2);
      stops.forEach(s => grad.addColorStop(s[0], s[1]));
      g.fillStyle = grad; g.fillRect(0, 0, maat, maat);
      return c;
    };
    plasSprite = mk(256, [[0, 'rgba(255,255,255,1)'], [0.42, 'rgba(255,255,255,.96)'], [0.72, 'rgba(255,255,255,.55)'], [0.9, 'rgba(255,255,255,.16)'], [1, 'rgba(255,255,255,0)']]);
    gloedSprite = mk(128, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,.5)'], [1, 'rgba(255,255,255,0)']]);
  }

  /* ---------- DE ASSET-HAAK voor de vier stukken die nog CSS-terugval zijn ----------
     Bordes, kettingladder, valgat en rustnis bestaan nu als CSS; hun prompts staan al in
     assets/achtergronden/PROMPTS.txt. Zodra de platen als afdaling_aN_<naam>.webp in de
     PLATTE dropmap assets/wereld/ landen en converteer_webp.py het manifest herschrijft,
     zet deze haak ze automatisch in — zonder één 404-probe, want artBestaat leest het
     manifest. Ontbreekt een plaat, dan blijft de CSS-terugval staan (var(--w-x, ...)). */
  const BIOOM_HAAK = [['bordes', '--w-bordes'], ['ladder', '--w-ladder'], ['valgat', '--w-valgat'], ['nis_rust', '--w-nis']];
  function haakBioom() {
    const act = huidigeAct();
    for (const [naam, prop] of BIOOM_HAAK) {
      const id = 'afdaling_a' + act + '_' + naam;
      const heeft = (typeof artBestaat === 'function') && artBestaat('wereld', id) && !!(window.ART_MANIFEST && window.ART_MANIFEST.wereld);
      if (heeft) els.scherm.style.setProperty(prop, "url('assets/wereld/" + id + ".webp')");
      else els.scherm.style.removeProperty(prop);
    }
  }

  /* ---------- opbouw van de lagen ---------- */
  function bouwLagen(sj) {
    haakBioom();
    els.ver.innerHTML = `<img src="${vertePad(sj)}" alt="" draggable="false">`;
    if (heeftBioom() && !lite()) {
      const h = `<img src="${KUNST}afdaling_a1_midden.webp" alt="" draggable="false" style="left:${-MID_TB}px;top:${MID_OFF - MID_TH}px;width:${MID_TB}px">`
        + `<img class="spiegel" src="${KUNST}afdaling_a1_midden.webp" alt="" draggable="false" style="left:${-Math.round(MID_TB * 0.08)}px;top:${MID_OFF - MID_TH}px;width:${MID_TB}px">`;
      els.mid.innerHTML = h;
      let v = '';
      for (let i = -1; i <= 1; i++) v += `<img src="${KUNST}afdaling_a1_voorgrond.webp" alt="" draggable="false" style="left:${i * VOOR_TB - VOOR_TB / 2}px;top:${VOOR_OFF}px;width:${VOOR_TB}px">`;
      els.voor.innerHTML = v;
    } else { els.mid.innerHTML = ''; els.voor.innerHTML = ''; }
  }

  /* de deeltjes: <= 24 CSS-sprites, schermvast, nul JS per frame (§2.1 laag 6) */
  function bouwDeeltjes() {
    if (lite() || stil()) { els.deeltjes.innerHTML = ''; return; }
    let h = '';
    for (let i = 0; i < 12; i++) {
      h += `<i class="w-vlieg" style="left:${(ruis() * 100).toFixed(1)}%;top:${(20 + ruis() * 70).toFixed(1)}%;`
        + `animation-duration:${(9 + ruis() * 5).toFixed(1)}s;animation-delay:${(-ruis() * 12).toFixed(1)}s"></i>`;
    }
    for (let i = 0; i < 6; i++) {
      h += `<i class="w-druppel" style="left:${(ruis() * 100).toFixed(1)}%;`
        + `animation-duration:${(0.8 + ruis() * 0.5).toFixed(2)}s;animation-delay:${(-ruis() * 6).toFixed(1)}s"></i>`;
    }
    els.deeltjes.innerHTML = h;
  }

  /* ---------- één verdieping als DOM ---------- */
  function bouwVerdieping(sj, rol, beschikbaar, verlatenId, verzegeld) {
    const act = huidigeAct();
    verdeelDoorkijken(sj.r);
    const lijst = plekkenVan(sj.r, beschikbaar);
    const isActief = rol === 'w-actief';
    const bio = heeftBioom();
    let h = `<div class="w-richel ${rol}" data-rij="${sj.r}" style="top:${sj.y0}px">`;

    /* --- de vloeren: de richelstrook herhaald, met gefade uiteinden waar hij breekt --- */
    const vloeren = W.vloeren.filter(v => v.r === sj.r);
    for (const v of vloeren) {
      const b = v.x1 - v.x0;
      h += `<div class="w-vloer w-vloer-${v.soort}${bio ? ' bio' : ''}" style="left:${v.x0}px;top:${v.y - sj.y0 - GROND_LIJN}px;width:${b}px;height:${GROND_TH}px"></div>`;
    }
    /* de kloof: een donkere spleet met een randlicht, zodat je hem ZIET voor je springt */
    for (const kl of sj.kloven) h += `<div class="w-kloof" style="left:${kl.x0}px;width:${kl.x1 - kl.x0}px"></div>`;
    /* ladder (kettingladder), kruipbalk, valgat */
    if (sj.ladder) h += `<div class="w-ladder" style="left:${sj.ladder.x}px;top:${sj.ladder.y0}px;height:${sj.ladder.y1 - sj.ladder.y0}px"></div>`;
    if (sj.balk) h += `<div class="w-balk" style="left:${sj.balk.x0}px;top:${-K.BALK_H}px;width:${sj.balk.x1 - sj.balk.x0}px;height:${K.BALK_H}px"><i>ROL ERONDER</i></div>`;
    if (isActief && sj.r === 0) h += `<div class="w-ingang" style="left:${K.INGANG_X}px"><i>INGANG · UITSLUITEND PERSONEEL</i></div>`;
    if (valgat && valgat.r === sj.r) {
      h += `<div class="w-valgat${verzegeld ? ' open' : ''}" style="left:${valgat.x}px;width:${K.VALGAT_B}px">`
        + `<span class="w-valgat-schacht"></span><i class="w-valgat-bord">GEEN OPWAARTSE MOBILITEIT</i></div>`;
    }

    /* --- rekwisieten en affiches (loterij 'rekw') --- */
    for (const rw of sj.rekw) {
      if (!bio) continue;
      const hang = rw.soort === 'kooi';
      h += `<img class="w-prop w-prop-${rw.soort}${rw.spiegel ? ' spiegel' : ''}" src="${KUNST}afdaling_a1_prop_${rw.soort}.webp" alt="" draggable="false"`
        + ` style="left:${rw.x}px;top:${hang ? -520 : -390}px">`;
    }
    const slogans = AFFICHES[act] || AFFICHES[1];
    for (const af of sj.affiches) {
      h += `<div class="w-affiche" style="left:${af.x}px;transform:translate(-50%,0) rotate(${af.schuin.toFixed(1)}deg)">`
        + `<span>${slogans[af.tekst % slogans.length]}</span></div>`;
    }

    /* --- het verdiepingsbord --- */
    const bordX = klem(sj.galerij ? (sj.galerij.x0 + sj.galerij.x1) / 2 : BREEDTE / 2, RAND, BREEDTE - RAND);
    h += `<div class="w-bord" style="left:${bordX}px;top:${(sj.galerij ? K.GALERIJ_Y : 0) - 300}px">`
      + `<b>VERDIEPING −${sj.r + 1}</b><small>${ACT_STEMPEL[act] || ACT_STEMPEL[1]}</small></div>`;

    /* --- de deuren --- */
    for (const p of lijst) {
      const dk = doorkijk(p);
      const staat = p.open ? 'kan' : 'dicht';
      const extra = (verlatenId === p.id ? ' w-verlaten' + (verzegeld ? ' verzegeld' : '') : '');
      const tag = isActief ? 'button' : 'div';
      const attr = isActief
        ? ` type="button" data-id="${p.id}" aria-label="${p.naam}${p.kost ? `, kost ${p.kost} licht` : ''}"${p.open ? '' : ' aria-disabled="true" tabindex="-1"'}`
        : ' aria-hidden="true"';
      h += `<${tag} class="w-plek w-plek-${p.type} ${staat}${extra}${bio ? ' bio' : ''}" style="left:${p.x}px;width:${POORT_W}px;height:${POORT_W}px"${attr}>`;
      h += `<span class="w-doorkijk" style="${cssUrl(dk)}"></span><span class="w-poort"></span><span class="w-gloed"></span>`;
      if (p.type === 'rust') h += `<img class="w-rekw w-vuur" src="assets/iconen/vlam_brandt.webp" alt="" draggable="false">`;
      else if (p.type === 'winkel') h += `<i class="w-bordje">MAGAZIJN — prijzen excl. licht</i>`;
      else if (p.type === 'elite' || p.type === 'baas') h += `<img class="w-rekw w-korf w-korf-l" src="assets/iconen/vlam_brandt.webp" alt="" draggable="false"><img class="w-rekw w-korf w-korf-r" src="assets/iconen/vlam_brandt.webp" alt="" draggable="false">`;
      else if (p.type === 'episch') h += `<i class="w-rune">🜂</i>`;
      if (p.type === 'baas') h += `<b class="w-baasnaam">${p.naam}</b>`;
      h += `<span class="w-zegel"><img src="assets/ui/decreet_zegel.webp" alt="" draggable="false"><i>NIET IN UW FUNCTIEOMSCHRIJVING</i></span>`;
      h += `<span class="w-label">${p.icoon} ${p.naam}${p.kost ? ` · −${p.kost} 🔥` : ''}</span>`;
      h += `</${tag}>`;
    }

    /* --- de nis (achter een gebaar) --- */
    if (sj.nis && isActief) {
      const op = nisGepakt(sj.r);
      const v = VONDST[sj.nis.soort] || VONDST.olie;
      h += `<div class="w-nis${op ? ' leeg' : ''}" style="left:${sj.nis.x}px;top:${sj.nis.y - NIS_H}px;width:${NIS_W}px;height:${NIS_H}px">`
        + `<span class="w-nis-holte"></span>`
        + (op ? '<i class="w-nis-op">leeg</i>' : `<img class="w-nis-vondst" src="${v.icoon}" alt="" draggable="false"><span class="w-nis-gloed"></span>`)
        + `</div>`;
    }
    h += '</div>';
    return h;
  }

  function nisSleutel(r) { return huidigeAct() + '|' + r; }
  function nisGepakt(r) { return !!(S && Array.isArray(S.wn) && S.wn.indexOf(nisSleutel(r)) >= 0); }

  /* ---------- de held: marionet als skelet, losse frames als huid ---------- */
  function bouwHeld() {
    const held = huidigeHeld();
    const vm = (window.VOETMARGE && VOETMARGE[held.art]) ? ` style="--voetc:${VOETMARGE[held.art]}%"` : '';
    let stof = '';
    for (let i = 0; i < 8; i++) stof += '<span class="w-stof"></span>';
    els.held.innerHTML = `<div class="w-fig"${vm}><span class="w-schaduw"></span><span class="w-naloop"></span>`
      + `<img class="w-pose aan" alt="" draggable="false"><img class="w-pose" alt="" draggable="false">`
      + `<span class="w-fig-terugval">${held.icoon || '⚔️'}</span></div><div class="w-stofpool">${stof}</div>`;
    els.fig = els.held.querySelector('.w-fig');
    els.naloop = els.held.querySelector('.w-naloop');
    els.stof = Array.from(els.held.querySelectorAll('.w-stof'));
    const imgs = els.held.querySelectorAll('.w-pose');
    figA = imgs[0]; figB = imgs[1]; figAan = 'a';
    frames = {}; loopToestand = '';
    /* DE FRAME-HAAK: staat {id}_walk_a enz. in assets/karakters, dan wordt dat de huid;
       ontbreekt een frame, dan blijft de marionet die toestand dragen (§5.1). */
    const posen = ['', '_walk_a', '_walk_b', '_jump', '_land', '_roll', '_climb'];
    if (window.laadKarakterAfbeelding) {
      posen.forEach(p => laadKarakterAfbeelding(held.art + p, img => {
        if (!img || !els || !els.fig) return;
        frames[p || 'basis'] = img.src;
        if (!p) {
          const tv = els.fig.querySelector('.w-fig-terugval'); if (tv) tv.remove();
          if (!figA.getAttribute('src')) figA.src = img.src;
        }
      }));
    }
    /* de metgezel: nul nieuwe beelden — positie-replay van de held (§5.4) */
    sleep = [];
    els.metgezel.innerHTML = '';
    if (typeof heeftMetgezel === 'function' && heeftMetgezel()) {
      const md = metgezelDef();
      els.metgezel.innerHTML = `<div class="w-mfig"><span class="w-schaduw"></span><img alt="" draggable="false"><span class="w-mfig-terugval">${md.icoon || '🐾'}</span></div>`;
      const mimg = els.metgezel.querySelector('img');
      if (window.laadMetgezelAfbeelding) laadMetgezelAfbeelding(md.art, img => {
        if (!img || !mimg) return;
        mimg.src = img.src;
        const tv = els.metgezel.querySelector('.w-mfig-terugval'); if (tv) tv.remove();
      });
    }
  }

  /* portret = geleide modus: de open deuren (en de nis) als grote tikkaarten */
  function bouwPaneel() {
    const sj = sjab[actieveRij];
    let h = plekken.filter(p => p.open).map(p =>
      `<button type="button" class="w-kaart w-kaart-${p.type} kan" data-id="${p.id}">`
      + `<span class="w-kaart-deur" style="${cssUrl(doorkijk(p))}"></span>`
      + `<span class="w-kaart-tekst"><b>${p.icoon} ${p.naam}</b><small>${p.kost ? `−${p.kost} 🔥 licht` : 'geen lichtkost'}</small></span>`
      + `<em>Loop erheen</em></button>`).join('');
    if (sj && sj.nis && !nisGepakt(sj.r)) {
      const v = VONDST[sj.nis.soort] || VONDST.olie;
      h += `<button type="button" class="w-kaart w-kaart-nis kan" data-id="nis">`
        + `<span class="w-kaart-deur nis" style="${cssUrl(v.icoon)}"></span>`
        + `<span class="w-kaart-tekst"><b>🔦 Nis · ${v.naam}</b><small>${nisUitleg(sj.nis.plek)}</small></span>`
        + `<em>Loop erheen</em></button>`;
    }
    els.paneel.innerHTML = h;
  }
  function nisUitleg(plek) {
    return plek === 'balk' ? 'achter de gevallen balk — rol eronder'
      : plek === 'bordes' ? 'op het bordes — spring erop'
      : plek === 'put' ? 'onder in de put — laat je vallen'
      : 'aan het einde van de galerij';
  }

  /* ---------- render: de haak vanuit renderKaartScherm ---------- */
  function render() {
    if (!els && !bind()) { renderKaartSchermKlassiek(); return; }
    toonScherm('wereld');
    saveSpel();
    setTimeout(checkGrafsteen, 700);
    stop();
    wisTimers(timers); wisTimers(titelTimers); wisTimers(dalingTimers);
    bezig = false; dalingBezig = false; dalingFase = ''; deurPlaten = {}; auto = null; autoDoel = null;
    nabij = null; valgat = null; titelBezig = false; losAlles();
    inv.spring = inv.rol = false;
    els.actie.hidden = true;
    els.doek.className = ''; els.doek.innerHTML = ''; els.doek.hidden = true;
    els.scherm.dataset.act = String(huidigeAct());
    els.scherm.dataset.licht = lichtNiveau();

    actieveRij = doelRij();
    const beschikbaar = beschikbareNodes();
    plekken = plekkenVan(actieveRij, beschikbaar);
    const past = !!(S.w && typeof S.w === 'object' && S.w.rij === actieveRij && S.w.act === huidigeAct() && typeof S.w.x === 'number');
    const moetDalen = !past && !S._herbetreed && S.pos !== null && actieveRij > 0;

    /* --- de sjablonen van drie verdiepingen (r−1 / r / r+1) --- */
    const zaad = String(S.seed) + '|' + huidigeAct();
    const vorigeRij = actieveRij - 1;
    const landXvorige = (typeof S.wg === 'number') ? S.wg : null;
    landXvan = {};
    sjab = {};
    const maak = (r, landX) => {
      if (r < 0 || r > RIJEN) return null;
      const deuren = plekkenVan(r, []).map(p => ({ id: p.id, c: p.c, x: p.x, type: p.type }));
      return TT.sjabloon({ zaad, act: huidigeAct(), r, rijen: RIJEN, deuren, landX });
    };
    if (moetDalen) {
      /* je staat nog op de vorige richel; het valgat breekt daar open */
      sjab[vorigeRij] = maak(vorigeRij, landXvorige);
      const voorlopig = maak(actieveRij, null);
      const n = S.kaart[S.pos];
      const kinderen = (n && n.verb ? n.verb : []).map(id => S.kaart[id] ? plekX(S.kaart[id]) : BREEDTE / 2);
      const ex = TT.exitX(zaad, sjab[vorigeRij], voorlopig, kinderen.length ? kinderen : [BREEDTE / 2], n ? n.c : 3, n ? plekX(n) : BREEDTE / 2);
      exitVanRij = ex;
      valgat = { r: vorigeRij, x: ex, y: vorigeRij * RH };
      sjab[actieveRij] = maak(actieveRij, ex);
      landXvan[actieveRij] = ex;
    } else {
      const lx = actieveRij === 0 ? K.INGANG_X : (landXvorige !== null ? landXvorige : BREEDTE / 2);
      sjab[actieveRij] = maak(actieveRij, lx);
      landXvan[actieveRij] = lx;
      if (vorigeRij >= 0) sjab[vorigeRij] = maak(vorigeRij, null);
      S.wg = lx;
    }
    if (actieveRij + 1 <= RIJEN) sjab[actieveRij + 1] = maak(actieveRij + 1, null);

    const spec = [];
    [vorigeRij, actieveRij, actieveRij + 1].forEach(r => {
      if (sjab[r]) spec.push({ sj: sjab[r], valgatX: (valgat && valgat.r === r) ? valgat.x : null });
    });
    W = TT.bouwWereld(spec);

    /* --- DOM --- */
    bouwLagen(sjab[actieveRij]);
    let h = '';
    const verlaten = (S.pos !== null && !S._herbetreed && S.kaart[S.pos]) ? S.pos : null;
    if (sjab[vorigeRij]) h += bouwVerdieping(sjab[vorigeRij], 'w-vorige', [], verlaten, !moetDalen);
    h += bouwVerdieping(sjab[actieveRij], 'w-actief', beschikbaar, null, true);
    if (sjab[actieveRij + 1]) h += bouwVerdieping(sjab[actieveRij + 1], 'w-volgende', [], null, true);
    els.richels.innerHTML = h;
    bouwHeld();
    bouwPaneel();
    bouwDeeltjes();
    els.verdieping.innerHTML = `VERDIEPING −${actieveRij + 1}<small> · ${ACT_NAMEN[huidigeAct()] || 'Act ' + huidigeAct()} · seed ${S.seed || '—'}</small>`;

    /* --- de held plaatsen --- */
    st = TT.nieuweStaat(BREEDTE / 2, actieveRij * RH);
    heldRij = actieveRij;
    hermeet();
    if (past) {
      st.x = klem(S.w.x, MARGE, BREEDTE - MARGE);
      st.y = typeof S.w.y === 'number' ? S.w.y : actieveRij * RH;
      const v = TT.vloerOp(W, st.x, st.y);
      if (v) { st.opGrond = true; st.grond = v; } else { st.opGrond = false; st.valVan = st.y; }
    } else if (S._herbetreed) {
      const p = plekken[0];
      st.x = klem((p ? p.x : BREEDTE / 2) - naastAfstand(), MARGE, BREEDTE - MARGE);
      st.y = actieveRij * RH; st.opGrond = true; st.grond = TT.vloerOp(W, st.x, st.y);
      bewaarPlek();
    } else if (moetDalen) {
      heldRij = vorigeRij;
      const n = S.kaart[S.pos];
      st.x = klem(plekX(n) + naastAfstand(), MARGE, BREEDTE - MARGE);
      st.y = vorigeRij * RH; st.opGrond = true; st.grond = TT.vloerOp(W, st.x, st.y);
    } else {
      /* de intocht: je valt de personeelsschacht binnen op de galerij van richel 0 */
      const g = sjab[0] && sjab[0].galerij;
      st.x = g ? klem(K.INGANG_X, g.x0 + 40, g.x1 - 40) : K.INGANG_X;
      st.y = (g ? g.y : 0) - 260; st.opGrond = false; st.valVan = st.y;
      st.vy = 0;
    }
    camBasis = heldRij * RH;
    camX = klem(st.x, camMin(), camMax());
    camY = st.y;
    schrijfTransforms();
    checkNabij();
    start();
    if (moetDalen) startDaling();
    else titelkaartMisschien();
    hint();
    renderTopbalk();
  }

  function hint() {
    if (hintGetoond) return;
    hintGetoond = true;
    try { if (localStorage.getItem('slayit_wereld_hint3') === '1') return; localStorage.setItem('slayit_wereld_hint3', '1'); } catch (e) {}
    melding(document.body.dataset.modus === 'mobiel'
      ? '🚶 Houd links/rechts vast om te lopen · ▲ springen · ◐ rollen · veeg omlaag = eraf.'
      : '🚶 ← → lopen · spatie springen · ↓ eraf/ladder · shift rollen · E binnengaan · K = kaart.');
  }

  /* ---------- de titelkaart van de act ---------- */
  function titelkaartMisschien() {
    if (S.wt === huidigeAct()) return;
    S.wt = huidigeAct();
    toonTitel(ACT_TITEL[huidigeAct()] || 'DE DIEPTE', ACT_STEMPEL[huidigeAct()] || ACT_STEMPEL[1]);
  }
  function toonTitel(naam, kreet) {
    titelBezig = true;
    els.doek.innerHTML = `<div class="w-titel"><b>${naam}</b><small>ACT ${huidigeAct()} · VERDIEPING −${actieveRij + 1}</small><i>${kreet}</i></div>`;
    els.doek.hidden = false;
    els.doek.className = 'titel aan';
    na(1900, () => {
      els.doek.classList.remove('aan');
      na(500, () => { els.doek.hidden = true; els.doek.innerHTML = ''; els.doek.className = ''; titelBezig = false; }, titelTimers);
    }, titelTimers);
  }
  function slaTitelOver() {
    if (!titelBezig || inOvergang()) return false;
    wisTimers(titelTimers);
    els.doek.hidden = true; els.doek.innerHTML = ''; els.doek.className = ''; titelBezig = false;
    return true;
  }

  /* ---------- de afdaling naar de volgende verdieping ---------- */
  function startDaling() {
    bezig = true; dalingBezig = true; dalingFase = 'zegel';
    /* TEMPO: het zegel klapt en de vloer breekt in DEZELFDE tel, en hij loopt er meteen
       heen — de zegelanimatie speelt over zijn eerste passen. Twee gescripte wachtjes
       achter elkaar kostten 420 ms dode tijd per verdieping (contract 3.8: dode tijd weg). */
    na(180, () => {
      const deur = els.richels.querySelector('.w-vorige .w-plek.w-verlaten');
      if (deur) deur.classList.add('verzegelt');
      Klank.sfx('klap');
      const gat = els.richels.querySelector('.w-valgat');
      if (gat) gat.classList.add('open');
      puin(valgat.x, valgat.y, 4);
      schok(4);
      dalingFase = 'lopen';
      const vl = TT.vloerOp(W, valgat.x, valgat.y);
      auto = vl ? TT.maakAuto(W, st, { vloerId: vl.id, x: valgat.x }) : null;
      if (!auto) valIn();
    }, dalingTimers);
  }
  function valIn() {
    if (dalingFase === 'vallen') return;
    dalingFase = 'vallen'; auto = null;
    st.opGrond = false; st.grond = null; st.vx = 0; st.vxAf = 0; st.vy = 30; st.valVan = st.y; st.y += 4;
    Klank.sfx('stap');
  }
  /* een tik of toets tijdens de sequentie: meteen naar het eind (de spike-les: 48x wachten per run) */
  function slaDalingOver() {
    if (!dalingBezig) return false;
    wisTimers(dalingTimers);
    const deur = els.richels.querySelector('.w-vorige .w-plek.w-verlaten');
    if (deur) { deur.classList.remove('verzegelt'); deur.classList.add('verzegeld'); }
    const gat = els.richels.querySelector('.w-valgat');
    if (gat) gat.classList.add('open');
    auto = null;
    const g = sjab[actieveRij] && sjab[actieveRij].galerij;
    st.x = g ? klem(valgat.x, g.x0 + 30, g.x1 - 30) : valgat.x;
    st.y = actieveRij * RH + (g ? g.y : 0);
    st.vx = 0; st.vy = 0; st.opGrond = true; st.grond = TT.vloerOp(W, st.x, st.y);
    st.landZwaar = true; st.landT = FY.uitrol;
    eindDaling(true);
    return true;
  }
  function eindDaling(gesprongen) {
    dalingBezig = false; dalingFase = ''; bezig = false; auto = null;
    heldRij = actieveRij; camBasis = actieveRij * RH;
    S.wg = landXvan[actieveRij];
    valgat = null;
    const gat = els.richels.querySelector('.w-valgat');
    if (gat) gat.classList.add('dicht');
    if (!gesprongen) { schok(6); puin(st.x, st.y, 6); }
    bewaarPlek();
    checkNabij();
    titelkaartMisschien();
  }

  /* ---------- de lus ---------- */
  function start() { stop(); meetTot = 0; dtLog = []; liteLog = []; autoLiteKlaar = lite(); afmeld = Tikker.abonneer(stap); }
  function stop() { if (afmeld) { afmeld(); afmeld = null; } }
  /* na(ms, fn, bak): bak = de timerlijst die dit wachtje bezit (standaard de algemene). */
  function na(ms, fn, bak) {
    const lijst = bak || timers;
    const t = setTimeout(() => { const i = lijst.indexOf(t); if (i >= 0) lijst.splice(i, 1); fn(); }, ms);
    lijst.push(t);
    return t;
  }
  function wisTimers(lijst) { lijst.forEach(clearTimeout); lijst.length = 0; }
  /* een kamerovergang loopt (betreden): dan mag NIETS meer onderbroken worden */
  const inOvergang = () => bezig && !dalingBezig;

  function stap(dt) {
    if (document.body.dataset.scherm !== 'wereld') { stop(); return; }
    if (!st || !W) return;
    dt = Math.min(dt, 0.05);
    meetLus(dt);

    /* --- invoer verzamelen --- */
    const i = { links: false, rechts: false, spring: inv.spring, omhoog: false, omlaag: false, rol: inv.rol, snel: false };
    inv.spring = false; inv.rol = false;
    if (bezig && dalingFase !== 'lopen') { i.spring = false; i.rol = false; }
    if (auto) {
      renT = 0; renKant = 0;
      const a = TT.stuurAuto(auto, W, st, dt);
      i.links = a.links; i.rechts = a.rechts; i.spring = i.spring || a.spring;
      i.omhoog = a.omhoog; i.omlaag = a.omlaag; i.rol = i.rol || a.rol; i.snel = a.snel;
      if (auto.klaar) { const d = autoDoel; auto = null; autoDoel = null; if (d && d.na) d.na(); }
      else if (auto.mislukt) { auto = null; autoDoel = null; }
    } else if (!bezig) {
      let houd = 0;
      raakt.forEach(p => { if (p.houdt) houd = p.richting; });
      i.links = toets.links || houd < 0;
      i.rechts = toets.rechts || houd > 0;
      i.omhoog = toets.omhoog;
      i.omlaag = toets.omlaag;
      /* DE RENPAS (§7 tempo): houd je dezelfde kant langer dan REN_NA vast, dan gaat hij
         van de looppas (F.loop 230) naar de renpas (F.auto 340) — dezelfde snelheid als de
         autoroute, zodat wie zélf loopt niet structureel 45% trager is dan wie tikt. Kort
         tikkend bijsturen blijft de nauwkeurige looppas. */
      const wil = (i.rechts ? 1 : 0) - (i.links ? 1 : 0);
      if (wil && wil === renKant) renT += dt; else { renKant = wil; renT = 0; }
      i.snel = !!wil && renT > REN_NA;
    } else { renT = 0; renKant = 0; }

    /* --- fysica --- */
    const ev = TT.stapFysica(st, i, dt, W);
    verwerkGebeurtenissen(ev, i, dt);

    /* --- het valgat als triggerzone --- */
    if (dalingBezig && dalingFase === 'lopen' && st.opGrond && Math.abs(st.x - valgat.x) < 26 && Math.abs(st.y - valgat.y) < 2) valIn();
    else if (!dalingBezig && valgat && st.opGrond && Math.abs(st.x - valgat.x) < 26 && Math.abs(st.y - valgat.y) < 2) valIn();
    if (dalingBezig && dalingFase === 'vallen' && st.opGrond) eindDaling(false);

    /* --- de richel waar hij nu staat --- */
    if (st.grond && st.grond.r !== heldRij) { heldRij = st.grond.r; camBasis = heldRij * RH; }

    /* --- camera --- */
    camera(dt, i);
    /* --- figuur + metgezel --- */
    zetFiguur(dt, i);
    schrijfTransforms();
    tekenLicht();
    checkNabij();
  }

  function verwerkGebeurtenissen(ev, i, dt) {
    for (const e of ev) {
      if (e === 'spring') { Klank.sfx('stap'); puin(st.x, st.y, 1); }
      else if (e === 'land-licht') { puin(st.x, st.y, 2); Klank.sfx('stap'); }
      else if (e === 'land-zwaar') {
        puin(st.x, st.y, lite() ? 1 : 6); schok(6);
        /* 'plof' (de zware landing) is een P3-klank in audio.js; tot dan de zware klap.
           Klank.sfx negeert een onbekende naam stil, dus dit blijft één regel om te wisselen. */
        Klank.sfx('zwareklap');
        if (!dalingBezig) bewaarPlekStraks();
      } else if (e === 'rol') Klank.sfx('stap');
      else if (e === 'klim-af') bewaarPlekStraks();
    }
    /* stap-timbre op de cadans */
    if (st.opGrond && Math.abs(st.vx) > 30 && !st.klimt) {
      stapKlok -= dt;
      if (stapKlok <= 0) { stapKlok = FY.cadans * (Math.abs(st.vx) > FY.loop + 40 ? 0.72 : 1); Klank.sfx('stap'); if (!lite()) puin(st.x, st.y, 1); }
    } else stapKlok = 0;
  }
  let bewaarTimer = null;
  function bewaarPlekStraks() { clearTimeout(bewaarTimer); bewaarTimer = setTimeout(bewaarPlek, 260); }

  /* ---------- camera: look-ahead, dode zone, schud ---------- */
  function camera(dt, i) {
    const wil = (i.rechts ? 1 : 0) - (i.links ? 1 : 0);
    const doelAhead = wil ? wil * Math.min(140, vw / (2 * k) * 0.18) : 0;
    camAhead += (doelAhead - camAhead) * (1 - Math.pow(stil() ? 0.6 : 0.94, dt * 60));
    const doelX = klem(st.x + camAhead, camMin(), camMax());
    camX += (doelX - camX) * (1 - Math.pow(0.88, dt * 60));
    if (Math.abs(doelX - camX) < 0.05) camX = doelX;

    let doelY;
    /* geleide modus: de deurbaan blijft in beeld, maar de camera laat de held nooit
       uit de band lopen — op de galerij stak zijn hoofd anders boven het kijkvenster uit
       (gemeten op 360x800: voeten op 91 px, dus hoofd op -19) */
    if (geleid()) doelY = klem(st.y, actieveRij * RH - 110, actieveRij * RH);
    else {
      doelY = st.y;
      if (st.grond && st.grond.soort === 'galerij') doelY += 60;  /* je kijkt neer op de deuren: het keuzemoment */
      if (!st.opGrond && st.vy > 200) doelY += 90;                /* tijdens een val: look-down */
      if (Math.abs(doelY - camY) < 40 && st.opGrond) doelY = camY; /* dode zone */
    }
    camY += (doelY - camY) * (1 - Math.pow(0.82, dt * 60));

    const verval = Math.pow(0.86, dt * 60);
    schokX *= verval; schokY *= verval;
    if (Math.abs(schokX) < 0.2) schokX = 0;
    if (Math.abs(schokY) < 0.2) schokY = 0;
  }
  function schok(pxl) {
    if (lite() || stil()) return;
    schokY = pxl; schokX = pxl * 0.5;
  }

  /* ---------- de figuur: toestandsmachine + naloop + stof ---------- */
  function zetFiguur(dt, i) {
    if (!els.fig) return;
    let t = 'staat';
    if (st.klimt) t = 'klim';
    else if (st.rolT > 0) t = 'rol';
    else if (!st.opGrond) t = st.vy < -40 ? 'spring' : 'val';
    else if (st.landT > 0 && st.landZwaar) t = 'land';
    else if (Math.abs(st.vx) > 30) t = 'loopt';
    if (t !== loopToestand) {
      els.fig.classList.remove('t-' + loopToestand);
      els.fig.classList.add('t-' + t);
      loopToestand = t;
    }
    const links = st.richting < 0;
    if (links !== wasLinks) { wasLinks = links; els.fig.classList.toggle('links', links); }
    /* de huid: het frame dat bij deze toestand hoort, met een crossfade van 90 ms */
    let pose = frames.basis;
    if (t === 'loopt') pose = frames[(Math.floor(st.tijd / 0.21) % 2) ? '_walk_b' : '_walk_a'] || frames.basis;
    else if (t === 'spring' || t === 'val') pose = frames._jump || frames.basis;
    else if (t === 'land') pose = frames._land || frames.basis;
    else if (t === 'rol') pose = frames._roll || frames._land || frames.basis;
    else if (t === 'klim') pose = frames._climb || frames.basis;
    if (pose) zetPose(pose);

    /* squash/stretch + lean, in één transform op de figuur */
    let sx = 1, sy = 1, lean = 0;
    if (t === 'land') { const p = klem(st.landT / (st.landZwaar ? FY.uitrol : 0.12), 0, 1); sy = 1 - 0.12 * p; sx = 1 + 0.10 * p; }
    else if (t === 'spring') { sy = 1.04; sx = 0.97; }
    else if (t === 'loopt' && !lite() && !stil()) lean = klem(st.vx / FY.loop, -1, 1) * 2.5;
    els.fig.style.transform = `translate(-50%,0) scaleX(${links ? -1 : 1}) scale(${sx.toFixed(3)},${sy.toFixed(3)}) rotate(${(links ? -lean : lean).toFixed(2)}deg)`;

    /* de naloop: de mantel die 70 ms achterblijft */
    if (els.naloop && !lite() && !stil()) {
      const na70 = sleepOp(st.tijd - 0.07);
      const dx = na70 ? klem((na70.x - st.x) * 0.5, -14, 14) : 0;
      const dy = na70 ? klem((na70.y - st.y) * 0.35, -10, 10) : 0;
      els.naloop.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) rotate(${(dx * 0.3).toFixed(1)}deg)`;
    }

    /* de metgezel loopt 240 ms geleden, 70 wu achter je */
    sleep.push({ t: st.tijd, x: st.x, y: st.y, toestand: t });
    if (sleep.length > 90) sleep.shift();
    if (els.metgezel.firstChild) {
      const p = sleepOp(st.tijd - 0.24);
      if (p) {
        const mx = p.x - (st.richting >= 0 ? 70 : -70);
        els.metgezel.style.transform = `translate3d(${mx.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
        els.metgezel.firstChild.classList.toggle('links', st.richting < 0);
      }
    }
  }
  function sleepOp(t) {
    for (let i = sleep.length - 1; i >= 0; i--) if (sleep[i].t <= t) return sleep[i];
    return sleep[0] || null;
  }
  function zetPose(src) {
    const aan = figAan === 'a' ? figA : figB, uit = figAan === 'a' ? figB : figA;
    if (!aan || aan.getAttribute('src') === src) return;
    if (uit.getAttribute('src') === src) { uit.classList.add('aan'); aan.classList.remove('aan'); figAan = figAan === 'a' ? 'b' : 'a'; return; }
    uit.src = src; uit.classList.add('aan'); aan.classList.remove('aan');
    figAan = figAan === 'a' ? 'b' : 'a';
  }
  /* stofpufjes uit een pool van 8: de animatie herstart door de klasse te wippen */
  let stofBeurt = 0;
  function puin(x, y, n) {
    if (!els.stof || !els.stof.length || lite() || stil()) return;
    for (let i = 0; i < n; i++) {
      const el = els.stof[stofBeurt++ % els.stof.length];
      el.classList.remove('puf');
      void el.offsetWidth;
      el.style.setProperty('--dx', ((ruis() * 2 - 1) * 46).toFixed(0) + 'px');
      el.style.setProperty('--dy', (-14 - ruis() * 26).toFixed(0) + 'px');
      el.style.setProperty('--ds', (0.6 + ruis() * 0.7).toFixed(2));
      el.classList.add('puf');
    }
  }

  /* ---------- de zeven transforms ---------- */
  function schrijfTransforms() {
    if (!els || !st) return;
    /* de midden-/voorgrondlagen hangen aan een BASIS die zacht naar de nieuwe richel
       lerpt: zo is er geen sprong bij een verdiepingswissel en toch echte parallax. */
    camBasis += (heldRij * RH - camBasis) * 0.06;
    const a = vw / 2 - k * camX + schokX, b = grondY - k * camY + schokY;
    els.vlak.style.transform = `translate3d(${px(a)}, ${px(b)}, 0) scale(${k.toFixed(4)})`;
    const dy = camY - camBasis;
    els.ver.style.transform = `translate3d(${px(-(camX - BREEDTE / 2) * 0.10 * k)}, ${px(-dy * 0.06 * k)}, 0)`;
    els.mid.style.transform = `translate3d(${px(vw / 2 - (camX - BREEDTE / 2) * 0.40 * k + schokX * 0.4)}, ${px(grondY - dy * 0.30 * k + schokY * 0.4)}, 0) scale(${k.toFixed(4)})`;
    els.voor.style.transform = `translate3d(${px(vw / 2 - (camX - BREEDTE / 2) * 1.30 * k + schokX * 1.2)}, ${px(grondY - dy * 1.20 * k + schokY * 1.2)}, 0) scale(${k.toFixed(4)})`;
    els.held.style.transform = `translate3d(${px(st.x)}, ${px(st.y)}, 0)`;
  }

  /* ---------- het lichtcanvas: duister -> plas -> gloeiers ---------- */
  function tekenLicht() {
    if (!ctx2d || !st) return;
    const g = ctx2d, w = els.canvas.width, h = els.canvas.height, d = canvasDpr;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    const niveau = lichtNiveau();
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(6,3,10,' + (DUISTER[niveau] || 0.93) + ')';
    g.fillRect(0, 0, w, h);
    /* de fakkelplas: in WERELD-eenheden, dus dezelfde ruimtelijke maat als de kloof */
    const straalWu = LICHT_STRAAL[niveau] || 260;
    const straal = Math.min(straalWu * k, vw * 0.34, vh * 0.7) * d;
    const hx = (st.x - camX) * k + vw / 2 + schokX, hy = (st.y - camY) * k + grondY + schokY - heldPx * 0.55;
    const adem = lite() || stil() ? 1 : 1 + Math.sin(Date.now() / 540) * 0.035;
    g.globalCompositeOperation = 'destination-out';
    const rp = straal * adem;
    g.drawImage(plasSprite, hx * d - rp, hy * d - rp, rp * 2, rp * 2);
    /* gloeiers: een kampvuur van ver is zichtbaar, een gewone deur amper — licht onthult */
    if (!lite()) {
      g.globalCompositeOperation = 'lighter';
      for (const p of plekken) {
        const gx = ((p.x - camX) * k + vw / 2 + schokX) * d;
        const gy = ((actieveRij * RH - camY) * k + grondY + schokY - POORT_W * 0.5 * k) * d;
        if (gx < -300 || gx > w + 300) continue;
        const maat = (p.type === 'rust' ? 170 : p.type === 'baas' ? 240 : p.type === 'elite' ? 130 : 96) * k * d;
        g.globalAlpha = p.open ? 0.62 : 0.16;
        g.drawImage(kleurGloed(p.type), gx - maat, gy - maat * 0.65, maat * 2, maat * 1.3);
      }
      const sjN = sjab[actieveRij];
      if (sjN && sjN.nis && !nisGepakt(sjN.r)) {
        const nx = ((sjN.nis.x - camX) * k + vw / 2 + schokX) * d;
        const ny = ((actieveRij * RH + sjN.nis.y - camY) * k + grondY + schokY - 60 * k) * d;
        const m = 110 * k * d;
        g.globalAlpha = 0.5;
        g.drawImage(kleurGloed('nis'), nx - m, ny - m * 0.7, m * 2, m * 1.4);
      }
      g.globalAlpha = 1;
    }
    g.globalCompositeOperation = 'source-over';
  }
  const GLOED_KLEUR = { nis: '255,196,120', rust: '255,170,70', baas: '225,60,60', elite: '210,60,95', episch: '168,111,224', event: '111,179,196', winkel: '255,214,130', schat: '245,197,66' };
  const gloedCache = {};
  function kleurGloed(type) {
    const kl = GLOED_KLEUR[type] || '255,156,63';
    if (gloedCache[kl]) return gloedCache[kl];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(' + kl + ',1)');
    grad.addColorStop(0.4, 'rgba(' + kl + ',.42)');
    grad.addColorStop(1, 'rgba(' + kl + ',0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    gloedCache[kl] = c;
    return c;
  }

  /* ---------- prestatiemeting + auto-lite ---------- */
  function meetLus(dt) {
    dtLog.push(dt * 1000);
    if (dtLog.length > 600) dtLog.shift();
    meetTot += dt;
    /* AUTO-LITE: pas meten NA de eerste 1,5 s. De laadhapering (art decoderen, fonts,
       de titelkaart) gaf anders een p95 van 30+ ms op een laptop die daarna vlot 60 fps
       draaide — en die zette lite onterecht aan (gemeten). */
    if (autoLiteKlaar) return;
    if (meetTot > 1.5 && dt < 0.2) liteLog.push(dt * 1000);
    if (meetTot > 5.5 && liteLog.length > 90) {
      autoLiteKlaar = true;
      const s = liteLog.slice().sort((a, b) => a - b);
      const p95 = s[Math.floor(s.length * 0.95)], p50 = s[Math.floor(s.length * 0.5)];
      window.__wLiteMeting = { p50: +p50.toFixed(1), p95: +p95.toFixed(1), n: s.length };
      /* twee eisen: een enkele hapering (een deur die opengaat, art dat decodeert) mag lite
         niet aanzetten — pas als de MEDIAAN ook zakt is het toestel echt te traag */
      if (p95 > 24 && p50 > 19) {
        document.body.classList.add('w-lite');
        bouwDeeltjes();
        console.log('[wereld] auto-lite: p50 ' + p50.toFixed(1) + ' / p95 ' + p95.toFixed(1) + ' ms');
      }
    }
  }
  function stats() {
    const s = dtLog.slice().sort((a, b) => a - b);
    if (!s.length) return null;
    return {
      frames: s.length, p50: +s[Math.floor(s.length * 0.5)].toFixed(2), p95: +s[Math.floor(s.length * 0.95)].toFixed(2),
      max: +s[s.length - 1].toFixed(2), fps: +(1000 / (s.reduce((a, b) => a + b, 0) / s.length)).toFixed(1),
      k: +k.toFixed(3), heldPx: Math.round(heldPx), lite: lite(), rij: actieveRij
    };
  }

  /* ---------- nabijheid + de contextknop ---------- */
  function checkNabij() {
    if (!st) return;
    let nieuw = null;
    const opRij = heldRij === actieveRij;
    if (!bezig && !dalingBezig && st.opGrond) {
      if (opRij && Math.abs(st.y - actieveRij * RH) < 2) {
        let bd = nabijAfstand();
        for (const p of plekken) { if (!p.open) continue; const d = Math.abs(p.x - st.x); if (d < bd) { bd = d; nieuw = { soort: 'deur', p }; } }
      }
      const sj = sjab[actieveRij];
      if (!nieuw && opRij && sj && sj.nis && !nisGepakt(sj.r) && Math.abs(st.x - sj.nis.x) < 90 && Math.abs(st.y - (actieveRij * RH + sj.nis.y)) < 40) nieuw = { soort: 'nis', nis: sj.nis };
      if (!nieuw && valgat && Math.abs(st.x - valgat.x) < 80 && Math.abs(st.y - valgat.y) < 4) nieuw = { soort: 'valgat' };
      if (!nieuw && sj && sj.ladder) {
        const ly = actieveRij * RH;
        if (Math.abs(st.x - sj.ladder.x) < 40 && st.y >= ly + sj.ladder.y0 - 4 && st.y <= ly + sj.ladder.y1 + 4) {
          nieuw = { soort: 'ladder', omhoog: Math.abs(st.y - (ly + sj.ladder.y1)) < 4 };
        }
      }
    }
    const sleutel = nieuw ? nieuw.soort + (nieuw.p ? nieuw.p.id : '') : '';
    if (sleutel === (nabij ? nabij.sleutel : '')) return;
    if (nieuw) nieuw.sleutel = sleutel;
    nabij = nieuw;
    els.scherm.querySelectorAll('.w-plek.nabij, .w-kaart.nabij, .w-nis.nabij').forEach(el => el.classList.remove('nabij'));
    els.scherm.querySelectorAll('.w-kaart em').forEach(em => { em.textContent = 'Loop erheen'; });
    if (!nabij) { els.actie.hidden = true; return; }
    let tekst = '';
    if (nabij.soort === 'deur') {
      const p = nabij.p;
      els.scherm.querySelectorAll(`.w-actief .w-plek[data-id="${p.id}"], .w-kaart[data-id="${p.id}"]`).forEach(el => el.classList.add('nabij'));
      const em = els.paneel.querySelector(`.w-kaart[data-id="${p.id}"] em`); if (em) em.textContent = 'Binnengaan';
      tekst = `${p.icoon} ${p.naam}${p.kost ? ` · −${p.kost} 🔥` : ''} · Binnengaan`;
    } else if (nabij.soort === 'nis') {
      const v = VONDST[nabij.nis.soort] || VONDST.olie;
      const el = els.richels.querySelector('.w-actief .w-nis'); if (el) el.classList.add('nabij');
      const em = els.paneel.querySelector('.w-kaart-nis em'); if (em) em.textContent = 'Openen';
      tekst = `🔦 ${v.naam} · Nis openen`;
    } else if (nabij.soort === 'valgat') tekst = '⬇️ Daal af';
    else if (nabij.soort === 'ladder') tekst = nabij.omhoog ? '🪜 Klim op' : '🪜 Klim af';
    els.actie.textContent = tekst;
    els.actie.hidden = false;
  }

  /* ---------- kiezen, betreden, nis ---------- */
  function doeActie() {
    if (!nabij || bezig) { if (dalingBezig) slaDalingOver(); return; }
    if (nabij.soort === 'deur') betreden(nabij.p.id);
    else if (nabij.soort === 'nis') pakNis();
    else if (nabij.soort === 'valgat') valIn();
    else if (nabij.soort === 'ladder') { if (nabij.omhoog) toets.omhoog = true; else toets.omlaag = true; na(420, () => { toets.omhoog = false; toets.omlaag = false; }); }
  }
  /* naar een deur/nis lopen (autoroute over banen, ladders en kloven); sta je er al, dan meteen */
  function ga(id) {
    if (bezig || dalingBezig || !S || !S.kaart) return;
    if (id === 'nis') { gaNaarNis(); return; }
    const p = plekken.find(q => q.id === id);
    if (!p || !p.open || beschikbareNodes().indexOf(id) < 0) return;
    if (nabij && nabij.soort === 'deur' && nabij.p.id === id) { betreden(id); return; }
    const kant = st.x < p.x ? -1 : 1;
    const doelX = klem(p.x + kant * naastAfstand(), MARGE, BREEDTE - MARGE);
    const vl = TT.vloerOp(W, doelX, actieveRij * RH) || TT.vloerOp(W, p.x - kant * naastAfstand(), actieveRij * RH);
    if (!vl) return;
    losAlles();
    autoDoel = { na: () => { if (geleid()) betreden(id); } };
    auto = TT.maakAuto(W, st, { vloerId: vl.id, x: doelX });
    if (!auto) autoDoel = null;
  }
  function gaNaarNis() {
    const sj = sjab[actieveRij];
    if (!sj || !sj.nis || nisGepakt(sj.r)) return;
    const y = actieveRij * RH + sj.nis.y;
    const vl = TT.vloerOp(W, sj.nis.x, y);
    if (!vl) return;
    losAlles();
    autoDoel = { na: pakNis };
    auto = TT.maakAuto(W, st, { vloerId: vl.id, x: sj.nis.x });
    if (!auto) autoDoel = null;
  }
  function pakNis() {
    const sj = sjab[actieveRij];
    if (!sj || !sj.nis || nisGepakt(sj.r) || bezig) return;
    if (Math.abs(st.x - sj.nis.x) > 110) return;
    /* AFREKENEN GEBEURT IN GAME.JS (kiesNisEcht): de wereld rekent nooit af */
    const pool = LORE[sj.nis.soort] || LORE.pamflet;
    const tekst = pool[Math.floor(loterij('nislore|' + sj.r)() * pool.length)];
    if (typeof window.kiesNisEcht === 'function') kiesNisEcht(nisSleutel(sj.r), sj.nis.soort, tekst);
    const el = els.richels.querySelector('.w-actief .w-nis');
    if (el) { el.classList.add('leeg', 'net'); const v = el.querySelector('.w-nis-vondst'); if (v) v.classList.add('weg'); }
    nabij = null;
    els.actie.hidden = true;
    bouwPaneel();
    Klank.sfx('klap');
    puin(sj.nis.x, actieveRij * RH + sj.nis.y, 3);
  }
  function betreden(id) {
    if (bezig || dalingBezig || beschikbareNodes().indexOf(id) < 0) return;
    bezig = true; auto = null; autoDoel = null; losAlles();
    els.actie.hidden = true;
    const knop = els.richels.querySelector(`.w-actief .w-plek[data-id="${id}"]`);
    if (knop) knop.classList.add('opent');
    try { Klank.duck(0.5, 0.9); } catch (e) {}
    Klank.sfx('stap');
    schok(8);
    S.w = null;
    els.doek.hidden = false; els.doek.className = 'doek';
    na(180, () => { els.doek.classList.add('aan'); });
    na(620, () => kiesNodeEcht(id));            /* NOOIT kiesNode: kost + verdieping zitten in kiesNodeEcht */
  }
  function binnenOfDichtstbij() {
    if (bezig || dalingBezig) return;
    if (nabij) { doeActie(); return; }
    let beste = null, bd = Infinity;
    for (const p of plekken) { if (!p.open) continue; const d = Math.abs(p.x - st.x); if (d < bd) { bd = d; beste = p; } }
    if (beste) ga(beste.id);
  }

  /* ---------- save: alleen op vaste grond ---------- */
  function bewaarPlek() {
    if (!st || !S || !S.kaart) return;
    if (dalingBezig || bezig || !st.opGrond || st.klimt || heldRij !== actieveRij) return;
    S.w = { rij: actieveRij, x: Math.round(st.x), y: Math.round(st.y), act: huidigeAct() };
    S.wg = landXvan[actieveRij];
    saveSpel();
  }

  /* ---------- invoer: pointer (twee duimen, veeg, tik) ---------- */
  function schermNaarWereld(cx) { return klem((cx - kijkerLinks - vw / 2) / k + camX, MARGE, BREEDTE - MARGE); }
  function opPointerDown(e) {
    if (!els || e.target.closest('#wereld-hud')) return;
    if (e.button !== undefined && e.button !== 0) return;
    if (inOvergang()) return;                       /* de deur gaat al open: niets mag die overgang breken */
    if (slaTitelOver()) return;
    if (dalingBezig) { slaDalingOver(); return; }
    const deur = e.target.closest('.w-plek.kan');
    const nisEl = e.target.closest('.w-nis:not(.leeg)');
    const slot = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: Date.now(), cx: e.clientX, houdt: false, richting: 0, deur, nisEl };
    raakt.set(e.pointerId, slot);
    try { els.kijker.setPointerCapture(e.pointerId); } catch (err) {}
    slot.timer = setTimeout(() => { if (raakt.has(e.pointerId) && !bezig) beginHoud(slot); }, 170);
  }
  function beginHoud(slot) {
    slot.houdt = true;
    auto = null; autoDoel = null;
    const heldScherm = (st.x - camX) * k + vw / 2 + kijkerLinks;
    slot.richting = slot.cx < heldScherm ? -1 : 1;
  }
  function opPointerMove(e) {
    const slot = raakt.get(e.pointerId);
    if (!slot) return;
    slot.cx = e.clientX;
    if (slot.houdt) {
      const heldScherm = (st.x - camX) * k + vw / 2 + kijkerLinks;
      if (Math.abs(e.clientX - heldScherm) > 12) slot.richting = e.clientX < heldScherm ? -1 : 1;
      return;
    }
    const dx = e.clientX - slot.x0, dy = e.clientY - slot.y0, verstreken = Date.now() - slot.t0;
    /* VEEG: omhoog = springen, omlaag = van de rand / de ladder af / door een bordes */
    if (Math.abs(dy) >= 40 && Math.abs(dy) > 1.5 * Math.abs(dx) && verstreken < 250) {
      clearTimeout(slot.timer); raakt.delete(e.pointerId);
      if (bezig) return;
      if (dy < 0) inv.spring = true;
      else { toets.omlaag = true; setTimeout(() => { toets.omlaag = false; }, 320); }
      return;
    }
    /* een veeg IN WORDING mag geen 'houden' worden: de eerste 10 px van een verticale veeg
       haalden anders al de loop-modus binnen en de veeg werd nooit herkend (gemeten: 0 van
       de 4 veegsprongen kwam aan) */
    if (verstreken < 250 && Math.abs(dy) > Math.abs(dx)) return;
    if (Math.hypot(dx, dy) > 10 && !bezig) { clearTimeout(slot.timer); beginHoud(slot); }
  }
  function opPointerUp(e) {
    const slot = raakt.get(e.pointerId);
    if (!slot) return;
    clearTimeout(slot.timer);
    raakt.delete(e.pointerId);
    if (slot.houdt || e.type !== 'pointerup' || bezig || dalingBezig) return;
    if (slot.deur) { ga(slot.deur.dataset.id); return; }
    if (slot.nisEl) { gaNaarNis(); return; }
    /* tik op de wereld: autoroute naar dat punt (of naar de dichtstbijzijnde vloer eronder) */
    const wx = schermNaarWereld(e.clientX);
    const wy = (e.clientY - kijkerBoven - grondY) / k + camY;
    let vl = TT.vloerOp(W, wx, Math.round(wy / 5) * 5) || TT.vloerOnder(W, wx, wy - 60, 40) || TT.vloerOp(W, wx, actieveRij * RH);
    if (!vl) return;
    losAlles();
    autoDoel = null;
    auto = TT.maakAuto(W, st, { vloerId: vl.id, x: wx });
  }

  /* ---------- invoer: toetsen ---------- */
  function toetsMag(e) {
    if (document.body.dataset.scherm !== 'wereld' || !els) return false;
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return false;
    if (document.querySelector('.overlay.open, #grafsteen, #baas-intro')) return false;
    return true;
  }
  function opToetsNeer(e) {
    if (!toetsMag(e)) return;
    if (e.repeat && !/^(ArrowLeft|ArrowRight|ArrowUp|ArrowDown|a|A|d|D|w|W|s|S)$/.test(e.key)) return;
    if (inOvergang()) return;                       /* de deur gaat al open: geen invoer meer */
    if ((titelBezig || dalingBezig) && !e.repeat && /^(ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Enter| |a|A|d|D|e|E|w|W|s|S)$/.test(e.key)) {
      e.preventDefault();
      if (slaTitelOver()) return;
      slaDalingOver(); return;
    }
    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A': toets.links = true; auto = null; e.preventDefault(); break;
      case 'ArrowRight': case 'd': case 'D': toets.rechts = true; auto = null; e.preventDefault(); break;
      case ' ': case 'w': case 'W': if (!e.repeat) inv.spring = true; auto = null; e.preventDefault(); break;
      /* ↑ klimt als er een ladder is en springt anders (het contract wil klimmen, de bouwbrief springen) */
      case 'ArrowUp':
        e.preventDefault(); auto = null;
        if (nabij && nabij.soort === 'ladder') toets.omhoog = true; else if (!e.repeat) inv.spring = true;
        break;
      case 'ArrowDown': case 's': case 'S': toets.omlaag = true; auto = null; e.preventDefault(); break;
      case 'Shift': case 'c': case 'C': if (!e.repeat) inv.rol = true; e.preventDefault(); break;
      case 'e': case 'E': case 'Enter': if (!e.repeat) { e.preventDefault(); binnenOfDichtstbij(); } break;
      case 'k': case 'K': if (typeof window.devWereld === 'function') window.devWereld(false); break;
      case 'Escape': auto = null; autoDoel = null; break;
    }
  }
  function opToetsOp(e) {
    if (!els) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') toets.links = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') toets.rechts = false;
    if (e.key === 'ArrowUp') toets.omhoog = false;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') toets.omlaag = false;
  }

  return { actief, render, hermeet, ga, betreden, stop, stats, slaDalingOver,
    _dev: () => ({ st, W, sjab, actieveRij, heldRij, valgat, k, camX, camY, nabij, geleid: geleid() }) };
})();
window.Wereld = Wereld;
window.devWereldStats = () => Wereld.stats();
