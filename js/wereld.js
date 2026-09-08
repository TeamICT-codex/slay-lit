/* ============================================================
   SLAY LIT — DE WERELD (spike "De Richels")
   ------------------------------------------------------------
   De afdaalkaart als beloopbaar zijaanzicht-terrein. Elke rij van S.kaart is
   een RICHEL (een verdieping van de diepte), elke knoop een PLEK op die richel
   (een deur met de act-plaat als doorkijk), elke verbinding een TRAP naar
   beneden. De held loopt met zijn fakkelplas links/rechts, gaat een deur binnen
   en krijgt exact de kamer die de klassieke kaart ook geeft.

   Achter de DEV-vlag body.wereld (?wereld=1 / devWereld(), zie game.js). Zonder
   vlag tekent game.js de klassieke knopenkaart, byte-voor-byte ongewijzigd.

   HARDE REGELS
   - Determinisme is heilig: hier komt NOOIT de gedeelde seed-generator van game.js
     voor (de globale trekkingsfuncties bovenaan game.js, noch kiesGevechtAchtergrond).
     Eén trekking zou de seed-stroom verschuiven en daily's + Prikbord breken. De
     decor-loterij draait op een eigen mulberry32, gezaaid met
     zaadVanTekst(seed|act|sleutel) → loterij(). Lint in de teststap:
     grep -E "Toe[v]al|rn[d]\(|kies[U]it\(|sch[u]d\(" js/wereld.js → 0 treffers.
   - Fakkelkost en verdieping worden UITSLUITEND in kiesNodeEcht afgerekend
     (nooit kiesNode: die verwacht #kaart-held). De wereld rekent niets af.
   - Save-formaat: één additief veld S.w = { rij, x, act } (waar de held staat).
     Ontbreekt of klopt het niet → intocht/daling, nooit een crash.
   - De lus (Tikker) schrijft per frame alleen transforms; alles wat layout
     forceert (maten van het kijkvenster) wordt in hermeet() gecacht.
   - Idempotent: render() mag twee keer na elkaar (de vertraagde rust-timers)
     zonder dubbele lus of dubbele daling.
   ============================================================ */
const Wereld = (() => {
  'use strict';

  /* ---------- geometrie & tempo ---------- */
  const KOL_B = 230, RAND = 160;                       /* kolom c → wereld-x = RAND + c·KOL_B */
  const BREEDTE = 2 * RAND + (KOLS - 1) * KOL_B;       /* 1700 wereld-px per richel */
  const INGANG_X = BREEDTE / 2 - KOL_B / 2;            /* de ingang op richel 0: tussen kolom 2 en 3 (nooit óp een deur) */
  const SNEL = 150, AUTO = 300;                        /* lopen / autolopen naar een deur, wereld-px per s */
  const DAAL_MS = 1000;                                /* de gescripte trap af (hertest: 2,4 s vergrendeling was te lang; bovendien skipbaar) */
  /* je loopt NAAST een deur, niet ervoor (hertest: de held bedekte de doorkijk); schaalt met de heldhoogte.
     'Nabij' (= je mag naar binnen) is net iets ruimer dan die afstand, zodat tikken op een deur waar je
     al naast staat = binnengaan, maar een deur verderop eerst de prijs toont. */
  const naastAfstand = () => Math.min(95, Math.round(heldH * 0.5));
  const nabijAfstand = () => naastAfstand() + 14;
  const MARGE = 60;                                    /* de held blijft van de richeluiteinden weg (puin in het donker) */
  const LICHT_STRAAL = { helder: 260, schemer: 190, duister: 130, gedoofd: 90 };
  const ACT_STEMPEL = {
    1: 'GEEN LIFT. B.A.A.S. BESPAART.',
    2: 'STILTE — ARCHIEF IN GEBRUIK',
    3: 'BILLABILITY-CONTROLE: TOON UW BADGE'
  };

  /* ---------- module-staat ---------- */
  let els = null;                                      /* DOM-verwijzingen (bind) */
  let x = 0, richting = 1, heldY = 0, heldRij = 0;     /* de held in wereld-px */
  let doelX = null, doelId = null, snel = false, naAankomst = null;
  let houdSx = null;                                   /* scherm-x van een vastgehouden vinger/muis (lopen zolang je houdt) */
  const toets = { links: false, rechts: false };
  let camX = 0, camY = 0, camMin = 0, camMax = 0;
  let rij = 0, plekken = [], nabijId = null;
  let bezig = false;                                   /* invoerslot: intocht, daling, deur die opent */
  let daling = null;                                   /* { t, vanY, naarY, oud } tijdens de trap af */
  let dalingBezig = false;                             /* de hele sequentie zegel → trap → daling (skipbaar met een tik/toets) */
  let deurPlaten = {};                                 /* knoop-id → doorkijkplaat, per richel zonder teruglegging */
  let loopt = false, stapKlok = 0, wasRichting = 1, loopTempo = AUTO;
  let afmeld = null, timers = [], pointer = null, naHoud = false;
  let vw = 0, vh = 0, kijkerLinks = 0, RH = 340, grondY = 0, heldH = 160;
  let hintGetoond = false, ro = null;

  const klem = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- eigen hash-PRNG (nooit de gedeelde seed-generator) ----------
     Zelfde seed + act + sleutel = zelfde trekking, los van wat de speler doet. */
  function loterij(sleutel) {
    let staat = zaadVanTekst(String(S.seed) + '|' + huidigeAct() + '|' + sleutel) >>> 0;
    return function () {
      staat = (staat + 0x6D2B79F5) | 0;
      let t = Math.imul(staat ^ (staat >>> 15), 1 | staat);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* index via Math.floor — nooit een float-modulo (die geeft altijd 0) */
  const kies = (arr, sleutel) => (arr && arr.length) ? arr[Math.floor(loterij(sleutel)() * arr.length)] : null;

  /* ---------- de graaf als terrein (pure functies van S.kaart) ---------- */
  function actief() {
    return document.body.classList.contains('wereld')
      && !!(typeof S !== 'undefined' && S && S.kaart)
      && !!document.getElementById('scherm-wereld');
  }
  function rijVan(id) { return id === 'baas' ? RIJEN : (S.kaart[id] ? S.kaart[id].r : 0); }
  /* welke richel is 'actief'? herbetreding (reload op de baasnode) → die rij;
     ingang → 0; anders de rij onder je huidige kamer. Exact de bestaande vlaglogica. */
  function doelRij() { return S._herbetreed ? rijVan(S._herbetreed) : (S.pos === null ? 0 : rijVan(S.pos) + 1); }
  function plekX(n) { return n.id === 'baas' ? BREEDTE / 2 : RAND + n.c * KOL_B; }
  function plekkenVan(r, beschikbaar) {
    return Object.values(S.kaart).filter(n => n.r === r).sort((a, b) => a.c - b.c).map(n => ({
      id: n.id, type: n.type, r: n.r, c: n.c, x: plekX(n),
      open: beschikbaar.includes(n.id),
      kost: fakkelKost(n.type, n.r),
      naam: n.type === 'baas' ? huidigeBaas().naam : (NODE_NAMEN[n.type] || n.type),
      icoon: NODE_ICONEN[n.type] || '❓'
    }));
  }
  /* de trap waarlangs je afdaalde/afdaalt: naast de deur, tussen twee kolommen. Naar het
     baasvoorplein (rij RIJEN) aan de kant wég van de brede poort in het midden. */
  function trapXVan(id) {
    const n = S.kaart[id];
    if (!n) return INGANG_X;
    /* naar het baasvoorplein: altijd vlak naast de poort (hertest: landen op 805 px van de
       poort, met de poort buiten beeld, was de slechtste aankomst van de act) */
    if (n.r + 1 === RIJEN) return BREEDTE / 2 + (n.c <= 3 ? -1 : 1) * KOL_B;   /* een volle kolom: het bord raakt de poort niet */
    return klem(RAND + (n.c + 0.5) * KOL_B, MARGE + 20, BREEDTE - MARGE - 20);
  }

  /* ---------- platen (de bestaande 16:9-act-platen als verte én doorkijk) ---------- */
  function actSet() { const A = window.ACHTERGRONDEN; return A ? (A['act' + huidigeAct()] || A.act1) : null; }
  function plaat(pad) { return (pad && window.ACHTERGRONDEN) ? ACHTERGRONDEN.basis + pad : null; }
  /* per richel de gevechtsplaten husselen (eigen loterij) en zonder teruglegging over de
     deuren verdelen: vier identieke doorkijken naast elkaar breken de illusie (hertest) */
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
  function vertePlaat(r) { const set = actSet(); return set ? plaat(kies(set.gevecht, 'ver|' + r)) : null; }
  const cssUrl = pad => pad ? `background-image:url('${pad.replace(/'/g, '%27')}')` : '';

  /* ---------- DOM ---------- */
  function bind() {
    const scherm = document.getElementById('scherm-wereld');
    if (!scherm) return false;
    els = {
      scherm,
      kijker: scherm.querySelector('#wereld-kijker'),
      ver: scherm.querySelector('.w-ver'),
      vlak: scherm.querySelector('#wereld-vlak'),
      richels: scherm.querySelector('.w-richels'),
      held: scherm.querySelector('#w-held'),
      licht: scherm.querySelector('#wereld-licht'),
      gloeiers: scherm.querySelector('.w-gloeiers'),
      hud: scherm.querySelector('#wereld-hud'),
      verdieping: scherm.querySelector('#w-verdieping'),
      klassiek: scherm.querySelector('#w-klassiek'),
      binnen: scherm.querySelector('#w-binnen'),
      paneel: scherm.querySelector('#w-paneel'),
      fig: null
    };
    /* invoer: pointer capture op het kijkvenster (houden = lopen, tik = doel, tik op deur = autolopen) */
    els.kijker.addEventListener('pointerdown', opPointerDown);
    els.kijker.addEventListener('pointermove', opPointerMove);
    els.kijker.addEventListener('pointerup', opPointerUp);
    els.kijker.addEventListener('pointercancel', opPointerUp);
    els.kijker.addEventListener('lostpointercapture', opPointerUp);
    /* klik-delegatie op data-id (deuren + paneelkaarten) — nooit data in inline onclick-strings */
    scherm.addEventListener('click', e => {
      if (naHoud) return;                                        /* de klik die op een vasthoud-gebaar volgt is geen keuze */
      const k = e.target.closest('[data-id]');
      if (!k || !k.classList.contains('kan')) return;
      if (k.classList.contains('w-plek') && !k.closest('.w-actief')) return;
      ga(k.dataset.id);
    });
    els.binnen.addEventListener('click', () => { if (nabijId) betreden(nabijId); });
    els.klassiek.addEventListener('click', () => { if (typeof window.devWereld === 'function') window.devWereld(false); });
    window.addEventListener('keydown', opToetsNeer);
    window.addEventListener('keyup', opToetsOp);
    window.addEventListener('blur', () => { toets.links = toets.rechts = false; houdSx = null; });
    /* het kijkvenster krimpt/groeit ook zonder resize-event (nudge-reserve, draaien) → hermeten */
    if (window.ResizeObserver) {
      ro = new ResizeObserver(() => { if (document.body.dataset.scherm === 'wereld') hermeet(); });
      ro.observe(els.kijker);
    }
    return true;
  }

  /* maten van het kijkvenster cachen — de enige layout-reads, nooit in de lus */
  function hermeet() {
    if (!els) return;
    const r = els.kijker.getBoundingClientRect();
    vw = r.width || window.innerWidth;
    vh = r.height || window.innerHeight;
    kijkerLinks = r.left;
    RH = klem(Math.round(vh * 0.40), 260, 460);       /* richelhoogte: de vorige richel blijft boven in beeld, de volgende gloeit onderin */
    grondY = Math.round(vh * 0.60);                    /* de richelrand op 60% van het kijkvenster (meer afgrond dan lucht) */
    els.scherm.style.setProperty('--kh', vh + 'px');   /* in px, nooit vh: de portret-topbalk is 76px (JURY 2) */
    els.scherm.style.setProperty('--rh', RH + 'px');
    els.scherm.style.setProperty('--wb', BREEDTE + 'px');
    heldH = (els.fig && els.fig.offsetHeight) || Math.round(vh * 0.24);
    camMin = Math.min(vw / 2, BREEDTE / 2);
    camMax = Math.max(BREEDTE - vw / 2, BREEDTE / 2);
    els.licht.style.width = Math.ceil(2 * vw) + 'px';   /* het gat verplaatst; het element dekt het venster vanuit élke heldpositie */
    els.licht.style.height = Math.ceil(2 * vh) + 'px';
    if (daling) {                                      /* hermeten midden in de trap: zelfde voortgang, nieuwe maten */
      const p = klem(daling.t / DAAL_MS, 0, 1);
      daling.vanY = (rij - 1) * RH; daling.naarY = rij * RH;
      camY = heldY = daling.vanY + (daling.naarY - daling.vanY) * p;
    } else { heldY = heldRij * RH; camY = heldY; }
    camX = klem(camX, camMin, camMax);
    zetLicht();
    schrijfTransforms();
  }
  function zetLicht() {
    const basis = LICHT_STRAAL[lichtNiveau()] || LICHT_STRAAL.helder;
    const schaal = klem(vh / 720, 0.7, 1.4);
    /* de plasrand hoort in élke stand binnen het venster te vallen (hertest: in portret was de
       straal de halve schermbreedte en las het licht als vignet, niet als plas) */
    const plafond = Math.min(vw * 0.34, vh * 0.7);
    els.licht.style.setProperty('--lr', Math.round(Math.min(basis * schaal, plafond)) + 'px');
  }

  /* ---------- opbouw ---------- */
  function bouwVerte(actieveRij, metOude) {
    const nieuw = vertePlaat(actieveRij);
    let html = `<div class="w-ver-plaat" style="${cssUrl(nieuw)}"></div>`;
    /* een daling op komst: de plaat van de richel die je verlaat ligt er nog bovenop en
       schuift straks trager weg (parallax) terwijl ze vervaagt */
    if (metOude) html += `<div class="w-ver-plaat oud" style="${cssUrl(vertePlaat(actieveRij - 1))}"></div>`;
    els.ver.innerHTML = html;
  }

  function richelHtml(r, rol, beschikbaar, trapX, verlaten, verzegeld) {
    const act = huidigeAct();
    verdeelDoorkijken(r);
    const lijst = plekkenVan(r, beschikbaar);
    const k = 1 + Math.floor(loterij('kant|' + r)() * 3);                 /* welk tredeblok deze richel afzoomt */
    const schuin = (-(1 + r * 0.25) + (loterij('bord|' + r)() * 2 - 1) * 1.2).toFixed(2);   /* hoe dieper, hoe schever het bord */
    const isActief = rol === 'w-actief';
    let h = `<div class="w-richel ${rol}" style="--r:${r}" data-rij="${r}">`;
    h += `<div class="w-grond"></div><div class="w-kant k${k}"></div>`;
    /* de ingang op richel 0 (waar je vandaan kwam), elders de trap omhoog — ingestort */
    if (r === 0) h += `<div class="w-ingang" style="--px:${INGANG_X}px"><i>INGANG · UITSLUITEND PERSONEEL</i></div>`;
    if (isActief && trapX !== null && r > 0) {
      /* `dicht` = al ingestort (hervat na reload); anders stort hij in zodra de daling klaar is */
      h += `<div class="w-trap${verzegeld ? ' dicht' : ''}" style="--px:${trapX}px"><span class="w-trap-schacht"></span>`
        + `<span class="w-trap-trede t1"></span><span class="w-trap-trede t2"></span><span class="w-trap-trede t3"></span>`
        + `<i class="w-trap-bord">GEEN OPWAARTSE MOBILITEIT</i></div>`;
    }
    const bordX = (r === 0) ? INGANG_X : (isActief && trapX !== null ? trapX : RAND - 40);
    h += `<div class="w-bord" style="--px:${bordX}px; --schuin:${schuin}deg"><b>VERDIEPING −${r + 1}</b><small>${ACT_STEMPEL[act] || ACT_STEMPEL[1]}</small></div>`;
    for (const p of lijst) {
      const dk = doorkijk(p);
      const staat = p.open ? 'kan' : 'dicht';
      const extra = (verlaten === p.id ? ' w-verlaten' + (verzegeld ? ' verzegeld' : '') : '');
      const tag = isActief ? 'button' : 'div';
      const attr = isActief
        ? ` type="button" data-id="${p.id}" aria-label="${p.naam}${p.kost ? `, kost ${p.kost} licht` : ''}"${p.open ? '' : ' aria-disabled="true" tabindex="-1"'}`
        : ` aria-hidden="true"`;
      h += `<${tag} class="w-plek w-plek-${p.type} ${staat}${extra}" style="--px:${p.x}px"${attr}>`;
      h += `<span class="w-deur" style="${cssUrl(dk)}"></span><span class="w-gloed"></span>`;
      if (p.type === 'rust') h += `<img class="w-rekw w-vuur" src="assets/iconen/vlam_brandt.webp" alt="" draggable="false"><img class="w-rekw w-bedrol" src="assets/iconen/rusten.webp" alt="" draggable="false">`;
      else if (p.type === 'winkel') h += `<img class="w-rekw w-buidel" src="assets/iconen/winkel.webp" alt="" draggable="false"><i class="w-bordje">MAGAZIJN — prijzen excl. licht</i>`;
      else if (p.type === 'elite' || p.type === 'baas') h += `<img class="w-rekw w-korf w-korf-l" src="assets/iconen/vlam_brandt.webp" alt="" draggable="false"><img class="w-rekw w-korf w-korf-r" src="assets/iconen/vlam_brandt.webp" alt="" draggable="false">`;
      else if (p.type === 'episch') h += `<i class="w-rune">🜂</i>`;
      if (p.type === 'baas') h += `<b class="w-baasnaam">${p.naam}</b>`;
      h += `<span class="w-zegel"><img src="assets/ui/decreet_zegel.webp" alt="" draggable="false"><i>NIET IN UW FUNCTIEOMSCHRIJVING</i></span>`;
      h += `<span class="w-label">${p.icoon} ${p.naam}${p.kost ? ` · −${p.kost} 🔥` : ''}</span>`;
      h += `</${tag}>`;
    }
    h += '</div>';
    return h;
  }

  /* drie richels: de vorige (gedimd, alles verzegeld, jouw deur met het zegel), de actieve
     en de volgende (alleen gloeiers). `verzegeld` = het zegel staat er al stil (hervat na
     reload); anders klapt het erop bij de daling (verzegelt). */
  function bouwRichels(actieveRij, beschikbaar, verzegeld) {
    const verlaten = (S.pos !== null && !S._herbetreed && S.kaart[S.pos]) ? S.pos : null;
    const trapX = verlaten ? trapXVan(verlaten) : null;
    let h = '';
    if (actieveRij - 1 >= 0) h += richelHtml(actieveRij - 1, 'w-vorige', [], null, verlaten, verzegeld);
    h += richelHtml(actieveRij, 'w-actief', beschikbaar, trapX, null, verzegeld);
    if (actieveRij + 1 <= RIJEN) h += richelHtml(actieveRij + 1, 'w-volgende', [], null, null, false);
    els.richels.innerHTML = h;
    /* de gloeiers: boven het duister, zodat een kampvuur van ver zichtbaar is en een
       gewone deur amper — licht onthult letterlijk */
    let g = '';
    for (let r = Math.max(0, actieveRij - 1); r <= Math.min(RIJEN, actieveRij + 1); r++) {
      const rol = r < actieveRij ? 'w-vorige' : (r > actieveRij ? 'w-volgende' : 'w-actief');
      for (const p of plekkenVan(r, r === actieveRij ? beschikbaar : [])) {
        g += `<i class="w-gloei w-gloei-${p.type} ${p.open ? 'kan' : ''} ${rol}" style="--px:${p.x}px; --r:${r}"></i>`;
      }
    }
    els.gloeiers.innerHTML = g;
  }

  function bouwHeld() {
    const held = huidigeHeld();
    const vm = (window.VOETMARGE && VOETMARGE[held.art]) ? ` style="--voetc:${VOETMARGE[held.art]}%"` : '';
    els.held.innerHTML = `<div class="w-fig"${vm}><span class="w-schaduw"></span><span class="w-fig-terugval">${held.icoon || '⚔️'}</span></div>`;
    els.fig = els.held.querySelector('.w-fig');
    wasRichting = 1;
    if (window.laadKarakterAfbeelding) {
      laadKarakterAfbeelding(held.art, img => {
        if (!img || !els.fig || els.fig.querySelector('img')) return;
        const tv = els.fig.querySelector('.w-fig-terugval'); if (tv) tv.remove();
        els.fig.insertAdjacentHTML('beforeend', `<img src="${img.src}" alt="" draggable="false">`);
      });
    }
  }

  /* portret-paneel (C's antwoord): de open deuren als grote tikkaarten — één tik = autolopen */
  function bouwPaneel() {
    els.paneel.innerHTML = plekken.filter(p => p.open).map(p =>
      `<button type="button" class="w-kaart w-kaart-${p.type} kan" data-id="${p.id}">`
      + `<span class="w-kaart-deur" style="${cssUrl(doorkijk(p))}"></span>`
      + `<span class="w-kaart-tekst"><b>${p.icoon} ${p.naam}</b><small>${p.kost ? `−${p.kost} 🔥 licht` : 'geen lichtkost'}</small></span>`
      + `<em>Loop erheen</em></button>`).join('');
  }

  /* ---------- render (de haak vanuit renderKaartScherm) ---------- */
  function render() {
    if (!els && !bind()) { renderKaartSchermKlassiek(); return; }
    toonScherm('wereld');
    saveSpel();
    setTimeout(checkGrafsteen, 700);                   /* HET GRAFSCHRIFT: identiek aan de klassieke kaart */
    /* idempotent: vorige lus, timers en gebaren weg vóór we opnieuw bouwen */
    stop();
    timers.forEach(clearTimeout); timers = [];
    bezig = false; daling = null; dalingBezig = false; deurPlaten = {}; doelX = null; doelId = null; naAankomst = null; snel = false;
    houdSx = null; pointer = null; naHoud = false; nabijId = null; loopt = false; stapKlok = 0;
    toets.links = toets.rechts = false;
    els.binnen.hidden = true;
    els.scherm.dataset.act = String(huidigeAct());

    rij = doelRij();
    const beschikbaar = beschikbareNodes();
    plekken = plekkenVan(rij, beschikbaar);
    const past = !!(S.w && typeof S.w === 'object' && S.w.rij === rij && S.w.act === huidigeAct() && typeof S.w.x === 'number');
    const moetDalen = !past && !S._herbetreed && S.pos !== null;

    bouwVerte(rij, moetDalen);
    bouwRichels(rij, beschikbaar, !moetDalen);
    bouwHeld();
    bouwPaneel();
    els.verdieping.innerHTML = `VERDIEPING −${rij + 1}<small> · ${ACT_NAMEN[huidigeAct()] || 'Act ' + huidigeAct()} · seed ${S.seed || '—'}</small>`;

    heldRij = rij; richting = 1;
    hermeet();                                         /* zet --kh/--rh, leest de heldhoogte, plaatst het licht */
    if (past) {
      x = klem(S.w.x, MARGE, BREEDTE - MARGE);
    } else if (S._herbetreed) {
      /* reload op de baasnode: je staat voor die ene open deur — kiesNodeEcht rekent niets dubbel */
      x = klem((plekken[0] ? plekken[0].x : BREEDTE / 2) - naastAfstand(), MARGE, BREEDTE - MARGE);
      bewaarPlek();
    } else if (S.pos === null) {
      intocht();
    } else {
      startDaling();
    }
    camX = klem(x, camMin, camMax);
    schrijfTransforms();
    checkNabij();
    start();
    hint();
    renderTopbalk();
  }

  function hint() {
    if (hintGetoond) return;
    hintGetoond = true;
    try { if (localStorage.getItem('slayit_wereld_hint') === '1') return; localStorage.setItem('slayit_wereld_hint', '1'); } catch (e) {}
    melding(document.body.dataset.modus === 'mobiel'
      ? '🚶 Houd links of rechts vast om te lopen. Tik een deur: eerst de prijs, dan binnen.'
      : '🚶 ← → (of A/D) om te lopen · Enter/E bij een deur · K = klassieke kaart.');
  }

  /* richel 0: de held komt de ingang uit en loopt een stukje de richel op */
  function intocht() {
    x = INGANG_X - 70;
    bezig = true;
    doelX = INGANG_X; snel = false;        /* de ingang ligt precies tussen kolom 2 en 3 (115 px van elk): geen ongevraagde 'Binnengaan' */
    naAankomst = () => { bezig = false; bewaarPlek(); };
  }

  /* na een kamer: je staat weer voor de deur op de vorige richel; die valt dicht (zegel),
     je loopt naar de trap en daalt gescript af naar de nieuwe richel */
  function startDaling() {
    const n = S.kaart[S.pos];
    heldRij = rij - 1; heldY = heldRij * RH; camY = heldY;
    x = klem(plekX(n) + naastAfstand(), MARGE, BREEDTE - MARGE);
    bezig = true; dalingBezig = true;
    na(300, () => {
      const deur = els.richels.querySelector('.w-vorige .w-plek.w-verlaten');
      if (deur) deur.classList.add('verzegelt');
      Klank.sfx('klap');
      na(260, () => {
        doelX = trapXVan(S.pos); snel = true; naAankomst = daal;
        loopTempo = Math.max(AUTO, Math.abs(doelX - x) / 0.6);   /* naar de trap in hoogstens 0,6 s, hoe ver hij ook staat */
      });
    });
  }
  function daal() {
    const oud = els.ver.querySelector('.w-ver-plaat.oud');
    if (oud) oud.classList.add('weg');
    daling = { t: 0, vanY: (rij - 1) * RH, naarY: rij * RH, oud };
    zetLoopt(true, 0);
    if (els.fig) els.fig.classList.add('daalt');
    /* drie stappen in het ritme van de daling */
    Klank.sfx('stap'); na(DAAL_MS * 0.38, () => Klank.sfx('stap')); na(DAAL_MS * 0.74, () => Klank.sfx('stap'));
  }
  /* een tik of toets tijdens de sequentie: meteen naar het eind (hertest: 48× wachten per run) */
  function slaDalingOver() {
    if (!dalingBezig || !S || S.pos === null) return false;
    timers.forEach(clearTimeout); timers = [];
    const deur = els.richels.querySelector('.w-vorige .w-plek.w-verlaten');
    if (deur) deur.classList.add('verzegeld');
    doelX = null; naAankomst = null; snel = false; loopTempo = AUTO;
    x = trapXVan(S.pos);
    if (!daling) daal();
    daling.t = DAAL_MS;                                /* de lus rondt hem het volgende frame af (eindDaling) */
    return true;
  }
  function eindDaling() {
    const oud = daling && daling.oud;
    daling = null; dalingBezig = false; loopTempo = AUTO;
    heldRij = rij; heldY = rij * RH; camY = heldY;
    if (els.fig) els.fig.classList.remove('daalt');
    zetLoopt(false, 0);
    const trap = els.richels.querySelector('.w-actief .w-trap');
    if (trap) trap.classList.add('dicht');            /* de trap achter je stort in: GEEN OPWAARTSE MOBILITEIT */
    if (oud) na(150, () => oud.remove());
    bezig = false;
    bewaarPlek();
    checkNabij();
  }

  /* waar de held staat → S.w (additief) + save; alleen op een echte richel, nooit halverwege */
  function bewaarPlek() {
    if (daling || heldRij !== rij || !S || !S.kaart) return;
    S.w = { rij, x: Math.round(x), act: huidigeAct() };
    saveSpel();
  }

  /* ---------- de lus ---------- */
  function start() { stop(); afmeld = Tikker.abonneer(stap); }
  function stop() { if (afmeld) { afmeld(); afmeld = null; } }
  function na(ms, fn) {
    const t = setTimeout(() => { timers = timers.filter(q => q !== t); fn(); }, ms);
    timers.push(t);
    return t;
  }

  function stap(dt) {
    if (document.body.dataset.scherm !== 'wereld') { stop(); return; }   /* een ander scherm nam over: zelf afmelden */
    let bewoog = false;
    if (daling) {
      daling.t += dt * 1000;
      const p = klem(daling.t / DAAL_MS, 0, 1);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;   /* ease-in-out */
      camY = heldY = daling.vanY + (daling.naarY - daling.vanY) * e;
      if (daling.oud) daling.oud.style.transform = `translate3d(0, ${(-(camY - daling.vanY) * 0.15).toFixed(1)}px, 0)`;
      bewoog = true;
      if (p >= 1) eindDaling();
    } else {
      let v = 0;
      if (doelX !== null) {
        const d = doelX - x, sn = snel ? loopTempo : SNEL;
        if (Math.abs(d) <= sn * dt + 0.5) { x = doelX; doelX = null; snel = false; loopTempo = AUTO; bewoog = true; aangekomen(); }
        else v = Math.sign(d) * sn;
      } else if (!bezig) {
        if (houdSx !== null) {
          const hx = houdSx - kijkerLinks + camX - vw / 2;              /* het schermpunt onder de vinger, nú in wereld-x */
          v = Math.abs(hx - x) > 4 ? Math.sign(hx - x) * SNEL : 0;
        } else {
          v = ((toets.rechts ? 1 : 0) - (toets.links ? 1 : 0)) * SNEL;
        }
      }
      if (v) {
        const nx = klem(x + v * dt, MARGE, BREEDTE - MARGE);
        if (nx !== x) { x = nx; bewoog = true; }
        richting = v > 0 ? 1 : -1;
      }
      zetLoopt(!!v && bewoog, dt);
    }
    /* camera: volgt de held met lerp, geklemd op de richel; framerate-onafhankelijk */
    const camDoel = klem(x, camMin, camMax);
    const rest = camDoel - camX;
    if (Math.abs(rest) > 0.05) { camX += rest * (1 - Math.pow(0.88, dt * 60)); if (Math.abs(camDoel - camX) <= 0.05) camX = camDoel; bewoog = true; }
    if (richting !== wasRichting) { wasRichting = richting; if (els.fig) els.fig.classList.toggle('links', richting < 0); }
    if (bewoog) { schrijfTransforms(); checkNabij(); }
  }

  function zetLoopt(aan, dt) {
    if (aan !== loopt) {
      loopt = aan;
      if (els.fig) els.fig.classList.toggle('loopt', aan);
      stapKlok = aan ? 0.21 : 0;
      if (!aan && !bezig) bewaarPlek();                /* stilstaan = hier sta je (reload zet je terug) */
    }
    if (aan && !daling) { stapKlok -= dt; if (stapKlok <= 0) { stapKlok += 0.42; Klank.sfx('stap'); } }
  }

  function aangekomen() {
    const cb = naAankomst; naAankomst = null;
    if (cb) cb();
    else if (doelId) { checkNabij(); doelId = null; }
  }

  /* per frame ALLEEN transforms: het vlak (camera), de verte (×0,15), de held, het licht, de gloeiers */
  function schrijfTransforms() {
    if (!els) return;
    const ox = (vw / 2 - camX).toFixed(1), oy = (grondY - camY).toFixed(1);
    const t = `translate3d(${ox}px, ${oy}px, 0)`;
    els.vlak.style.transform = t;
    els.gloeiers.style.transform = t;
    els.ver.style.transform = `translate3d(${(-(camX - BREEDTE / 2) * 0.15).toFixed(1)}px, 0, 0)`;
    els.held.style.transform = `translate3d(${x.toFixed(1)}px, ${heldY.toFixed(1)}px, 0)`;
    const sx = x - camX + vw / 2, sy = grondY + (heldY - camY) - heldH * 0.55;
    els.licht.style.transform = `translate3d(${(sx - vw).toFixed(1)}px, ${(sy - vh).toFixed(1)}px, 0)`;
  }

  /* nabijheid: alleen bij verandering klassen + de 'Binnengaan'-knop bijwerken */
  function checkNabij() {
    let beste = null, bd = nabijAfstand();
    for (const p of plekken) { if (!p.open) continue; const d = Math.abs(p.x - x); if (d < bd) { bd = d; beste = p; } }
    const id = (beste && !bezig && !daling) ? beste.id : null;
    if (id === nabijId) return;
    nabijId = id;
    els.scherm.querySelectorAll('.w-plek.nabij, .w-kaart.nabij').forEach(el => el.classList.remove('nabij'));
    if (!id) { els.binnen.hidden = true; els.scherm.querySelectorAll('.w-kaart em').forEach(em => em.textContent = 'Loop erheen'); return; }
    const p = beste;
    els.scherm.querySelectorAll(`.w-actief .w-plek[data-id="${p.id}"], .w-kaart[data-id="${p.id}"]`).forEach(el => el.classList.add('nabij'));
    const em = els.paneel.querySelector(`.w-kaart[data-id="${p.id}"] em`); if (em) em.textContent = 'Binnengaan';
    els.binnen.textContent = `${p.icoon} ${p.naam}${p.kost ? ` · −${p.kost} 🔥` : ''} · Binnengaan`;
    els.binnen.hidden = false;
  }

  /* ---------- kiezen & betreden ---------- */
  /* naar een deur lopen; sta je er al voor, dan naar binnen. Guards zoals kiesNode. */
  function ga(id) {
    if (bezig || daling || !S || !S.kaart) return;
    const p = plekken.find(q => q.id === id);
    if (!p || !p.open || !beschikbareNodes().includes(id)) return;
    if (nabijId === id) { betreden(id); return; }
    houdSx = null; toets.links = toets.rechts = false;
    const kant = x < p.x ? -1 : 1;
    doelId = id; doelX = klem(p.x + kant * naastAfstand(), MARGE, BREEDTE - MARGE); snel = true; naAankomst = null;
  }
  function betreden(id) {
    if (bezig || daling || !beschikbareNodes().includes(id)) return;
    bezig = true;
    doelX = null; doelId = null; houdSx = null; toets.links = toets.rechts = false;
    zetLoopt(false, 0);
    els.binnen.hidden = true;
    const knop = els.richels.querySelector(`.w-actief .w-plek[data-id="${id}"]`);
    if (knop) knop.classList.add('opent');
    Klank.sfx('stap');
    S.w = null;                                        /* je staat niet meer op de richel; na de kamer volgt de daling */
    na(600, () => kiesNodeEcht(id));                   /* NOOIT kiesNode: kost + verdieping zitten in kiesNodeEcht */
  }
  function binnenOfDichtstbij() {
    if (bezig || daling) return;
    if (nabijId) { betreden(nabijId); return; }
    let beste = null, bd = Infinity;
    for (const p of plekken) { if (!p.open) continue; const d = Math.abs(p.x - x); if (d < bd) { bd = d; beste = p; } }
    if (beste) ga(beste.id);
  }

  /* ---------- invoer: pointer ---------- */
  function opPointerDown(e) {
    if (!els || e.target.closest('#wereld-hud')) return;
    if (e.button !== undefined && e.button !== 0) return;
    if (dalingBezig) { slaDalingOver(); return; }      /* ongeduld is toegestaan */
    if (pointer) return;                               /* één vinger tegelijk */
    pointer = { id: e.pointerId, x0: e.clientX, y0: e.clientY, cx: e.clientX, houdt: false, deur: e.target.closest('.w-plek.kan') };
    try { els.kijker.setPointerCapture(e.pointerId); } catch (err) {}
    /* na 200 ms zonder loslaten telt het als houden = lopen naar de vinger toe */
    pointer.timer = setTimeout(() => { if (pointer && !bezig && !daling) beginHoud(); }, 200);
  }
  function beginHoud() {
    pointer.houdt = true;
    doelX = null; doelId = null; snel = false;
    houdSx = pointer.cx;
  }
  function opPointerMove(e) {
    if (!pointer || e.pointerId !== pointer.id) return;
    pointer.cx = e.clientX;
    if (pointer.houdt) { houdSx = e.clientX; return; }
    if (Math.hypot(e.clientX - pointer.x0, e.clientY - pointer.y0) > 8 && !bezig && !daling) { clearTimeout(pointer.timer); beginHoud(); }
  }
  function opPointerUp(e) {
    if (!pointer || e.pointerId !== pointer.id) return;
    clearTimeout(pointer.timer);
    const p = pointer; pointer = null; houdSx = null;
    if (p.houdt) {
      naHoud = true; setTimeout(() => { naHoud = false; }, 0);   /* de click die hierop volgt is geen keuze */
      if (e.type === 'pointerup') zetLoopt(false, 0);
      return;
    }
    if (e.type !== 'pointerup' || bezig || daling) return;
    if (p.deur) {
      /* korte tik op een open deur → autolopen (of binnengaan als je er al voor staat).
         Hier en niet via click: door de pointer capture krijgt de click het kijkvenster
         als target, niet de deur. De click-delegatie blijft voor Enter op een gefocuste
         deur en voor de paneelkaarten. */
      naHoud = true; setTimeout(() => { naHoud = false; }, 0);
      ga(p.deur.dataset.id);
      return;
    }
    doelId = null; snel = false;
    doelX = klem(e.clientX - kijkerLinks + camX - vw / 2, MARGE, BREEDTE - MARGE);
  }

  /* ---------- invoer: toetsen (laptop) ---------- */
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
    if (dalingBezig && !e.repeat && /^(ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Enter| |a|A|d|D|e|E)$/.test(e.key)) { slaDalingOver(); e.preventDefault(); return; }
    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A':
        toets.links = true; if (!bezig) { doelX = null; doelId = null; } e.preventDefault(); break;
      case 'ArrowRight': case 'd': case 'D':
        toets.rechts = true; if (!bezig) { doelX = null; doelId = null; } e.preventDefault(); break;
      case 'ArrowUp': case 'Enter': case 'e': case 'E':
        if (e.repeat) { e.preventDefault(); return; }
        e.preventDefault(); binnenOfDichtstbij(); break;
      case 'k': case 'K':
        if (typeof window.devWereld === 'function') window.devWereld(false); break;
      case 'Escape':
        if (!bezig) { doelX = null; doelId = null; } break;
    }
  }
  function opToetsOp(e) {
    if (!els) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') toets.links = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') toets.rechts = false;
  }

  return { actief, render, hermeet, ga, betreden, stop };
})();
window.Wereld = Wereld;
