/* SLAY LIT — Proloog · in-page motor (R1 "DE NAAD", sep 2026).
   Scènes uit window.SLAYLIT_PROLOOG (data.js), sfeer uit window.SLAYLIT_AUDIO (audio.js).

   DE PROLOOG DRAAIT IN DE GAME-PAGINA — scherm 'proloog', in een SHADOW ROOT op
   #scherm-proloog (geen herlaad, geen tweede AudioContext, geen CSS-lek: proloog.css
   wordt IN de shadow root geladen, met :host{all:initial} en de tokens op :host).
   Geen DOMContentLoaded, geen location.href: de game roept ons aan.

   API (window.Proloog):
     start(opts) → true|false   opts = { host, herbeleef, hoofdstuk, klaar(uitkomst), over() }
                                 host: #scherm-proloog · hoofdstuk: scène-index (0-4) of
                                 'factuur'|'ontslag'|'val'|'afgrond' (zie Proloog.hoofdstukken)
     stop()                      ruimt listeners, timers, camerastream, objectURLs en audio op
     slaOver()                   = de vasthoud-skip: snijdt naar de Afgrond (herbeleven: over())
     actief                      getter: loopt de proloog?
     hoofdstukken                [{ hoofdstuk, naam }] voor een herbeleef-menu
   uitkomst (aan klaar) = { held: 'slachter'|'gifmagier'|'thoverk', masker: 'woede'|'gif'|'vlucht',
     kooltje: { x, y, maat } (viewportpx van het kooltje op het moment van de keuze),
     contract: het geschreven contract (null bij herbeleven) }.
   klaar() komt 1,5 s na de keuze (reduced motion: 0,9 s), op puur zwart met één ademend
   kooltje — daar neemt #proloog-sluier van de game het over (plan §3).

   OPSLAG (alles in try/catch; volle/privé-opslag mag nooit crashen):
   - 'slayit_proloog'      = het contract { v:2, jeugddroom, uitweg:'sprong'|'geduwd', held (game-id),
                             masker, glimlachen, fotoKantoor, zelfGestempeld, wachtToon:-7, echo:0 },
                             stapsgewijs geschreven; nooit bij herbeleven. Elk pad (sprong, geduwd,
                             skip) eindigt met uitweg + held.
   - 'slayit_proloog_over' = '1' — alleen na de vasthoud-skip (Esc op laptop), en pas geschreven
                             bij de landing (klaarMet): wie in de Afgrond herlaadt, keert daar terug.
   - 'slaylit_proloog_v3'  = eigen voortgang { scene, checkpoint, choices, gezien[] }; na een herlaad
                             hervat je op het laatste checkpoint, nooit midden in het gesprek.
                             De oude v2-sleutel wordt gemigreerd en gewist.
   Spelersinvoer (jeugddroom) gaat ALTIJD via textContent, nooit via innerHTML of inline handlers.

   R2 "DE VAL EN DE KLANK": de val is een pixelcanvas (proloog/val.js, window.ProloogVal) met
   de lichtmotor van de outro; ze tekent op speelTijd() (dezelfde pauze als T()). De klank
   komt van bouwer K (proloog/audio.js → window.ProloogKlank) en wordt hier ALLEEN achter een
   guard aangeroepen (klank()): de jingle in de boot, de wachtmuziek vanaf de oproep, een
   halve toon lager per etage in de val (tot −7), stilte(1500) als de vloer weg is, en
   wachtStop in de Afgrond. */
(function () {
  'use strict';
  const STORY = window.SLAYLIT_PROLOOG;
  const AU = window.SLAYLIT_AUDIO || null;
  if (!STORY || !Array.isArray(STORY.scenes)) return;   /* zonder data geen proloog: de game valt terug op de heldkeuze */

  const SAVE = 'slaylit_proloog_v3';
  const SAVE_OUD = 'slaylit_proloog_v2';
  const CONTRACT = 'slayit_proloog';
  const OVER = 'slayit_proloog_over';
  const CSS_PAD = (STORY.BASE || '') + 'proloog/proloog.css';
  const AANTAL = STORY.scenes.length;
  const IDX = {};
  STORY.scenes.forEach((s, i) => { IDX[s.kind] = i; });
  const FASEN = ['factuur', 'ontslag', 'val', 'afgrond'];
  const SKIP_ZICHTBAAR_MS = 4000;
  const SKIP_HOUD_MS = 800;
  const TOKEN_MS = 1500;   /* het token zinkt in het kooltje; klaar() volgt uit het einde (plan §3: T 1,5) */

  /* ---------- sessie-staat ---------- */
  let host = null, R = null, app = null, wrap = null, skipEl = null, hintEl = null, klankEl = null;
  let opts = {}, actief = false, herbeleef = false, klaarGeroepen = false, overgeslagen = false;
  let glimOpen = 0;        /* glimlachen van het lopende gesprek: pas geteld als het gesprek eindigt (of bij de skip) */
  let P = null, contractVers = false;
  let spoel = null;        /* doorspoel-handler van de actieve beat/overlay (null = hier moet je handelen) */
  let sleutels = null;     /* scène-eigen toetsen (gesprek, afgrond) → true als verwerkt */
  let houd = null;         /* lopende vasthoud-skip */
  let cam = null;          /* { stream } van de pasfoto-camera */
  let cssGeladen = false;
  let hintGezien = {};
  let val = null;          /* R2: de lopende val (window.ProloogVal-handle) */
  let wachtAan = false;    /* R2: loopt de wachtmuziek (sinds de oproep)? */
  const opruimers = [];
  const objectUrls = new Set();

  /* ---------- opslag ---------- */
  function lees(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function schrijf(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function wis(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function leesJSON(k) {
    const r = lees(k);
    if (!r) return null;
    try { return JSON.parse(r); } catch (e) { return null; }
  }
  function klemScene(n) { n = parseInt(n, 10); return isFinite(n) ? Math.max(0, Math.min(AANTAL - 1, n)) : 0; }
  function nieuweStaat() { return { scene: 0, checkpoint: 'start', choices: {}, gezien: [0] }; }
  function saniteerKeuzes(c) {
    const u = {};
    if (!c || typeof c !== 'object') return u;
    if (typeof c.jeugddroom === 'string' && c.jeugddroom.trim()) u.jeugddroom = c.jeugddroom.trim().slice(0, 60);
    if (c.val === 'gesprongen' || c.val === 'geduwd') u.val = c.val;
    if (typeof c.pasfoto === 'string' && c.pasfoto.indexOf('data:image/') === 0) u.pasfoto = c.pasfoto;
    if (typeof c.meter === 'number' && isFinite(c.meter)) u.meter = Math.max(0, Math.min(100, c.meter));
    if (typeof c.glimlachen === 'number' && isFinite(c.glimlachen)) u.glimlachen = Math.max(0, Math.min(999, c.glimlachen | 0));
    if (typeof c.glimCp === 'number' && isFinite(c.glimCp)) u.glimCp = Math.max(0, Math.min(999, c.glimCp | 0));
    if (c.fotoKantoor) u.fotoKantoor = true;
    if (typeof c.held === 'string') u.held = c.held;
    if (typeof c.masker === 'string') u.masker = c.masker;
    return u;
  }
  function laadSave() {
    const d = leesJSON(SAVE);
    if (d && typeof d === 'object') {
      const p = { scene: klemScene(d.scene), checkpoint: typeof d.checkpoint === 'string' ? d.checkpoint : 'start',
        choices: saniteerKeuzes(d.choices), gezien: Array.isArray(d.gezien) ? d.gezien.map(klemScene) : [] };
      /* nooit midden in het gesprek: dat hervat altijd op zijn start */
      if (p.scene === IDX.gesprek) p.checkpoint = 'start';
      if (p.scene === IDX.breekpunt && FASEN.indexOf(p.checkpoint) === -1) p.checkpoint = 'factuur';
      if (p.gezien.indexOf(p.scene) === -1) p.gezien.push(p.scene);
      return p;
    }
    /* migratie van de v2-voortgang (vóór R1): scène-index + keuzes, de afdaling (5) wordt de Afgrond */
    const o = leesJSON(SAVE_OUD);
    if (o && typeof o === 'object') {
      const idx = parseInt(o.idx, 10) || 0;
      const p = nieuweStaat();
      p.choices = saniteerKeuzes(o.choices);
      if (idx >= 5) { p.scene = IDX.breekpunt; p.checkpoint = 'afgrond'; }
      else { p.scene = klemScene(idx); p.checkpoint = p.scene === IDX.breekpunt ? 'factuur' : 'start'; }
      p.gezien = [];
      for (let i = 0; i <= p.scene; i++) p.gezien.push(i);
      return p;
    }
    return nieuweStaat();
  }
  function bewaar() { if (!herbeleef && P) schrijf(SAVE, JSON.stringify(P)); }
  function isVers(p) { return p.scene === 0 && p.checkpoint === 'start' && !Object.keys(p.choices).length; }

  /* ---------- het contract met de game ---------- */
  function contractBasis() {
    return { v: 2, jeugddroom: null, uitweg: null, held: null, masker: null, glimlachen: 0,
      fotoKantoor: false, zelfGestempeld: false, wachtToon: -7, echo: 0 };
  }
  function leesContract() {
    const c = leesJSON(CONTRACT);
    return (c && typeof c === 'object' && c.v === 2) ? c : null;
  }
  function schrijfContract(delta) {
    if (herbeleef) return null;
    const oud = contractVers ? null : leesContract();
    contractVers = false;   /* een verse run begint met een schoon contract, daarna stapsgewijs */
    const c = Object.assign(contractBasis(), oud || {}, delta || {});
    c.v = 2; c.wachtToon = -7; if (typeof c.echo !== 'number') c.echo = 0;
    schrijf(CONTRACT, JSON.stringify(c));
    return c;
  }
  function uitwegVan(val) { return val === 'gesprongen' ? 'sprong' : val === 'geduwd' ? 'geduwd' : null; }
  /* F1 (review): de glimlachen van het gesprek tellen pas mee als het gesprek eindigt (of bij
     de skip). Het gesprek begint na een herlaad opnieuw; meteen tellen gaf per herlaad dubbele
     glimlachen in het contract (en straks op de factuur van R4). */
  function telGlimlachenBij() {
    if (glimOpen > 0 && P) P.choices.glimlachen = (P.choices.glimlachen || 0) + glimOpen;
    glimOpen = 0;
  }

  /* ---------- timers: één klok die pauzeert (tab verborgen / draai-blok) ---------- */
  const klok = { lijst: new Map(), id: 0, pauze: false };
  /* R2: de pauzebewuste speeltijd (ms) — dezelfde pauze als T(): de val tekent hierop,
     dus een verborgen tab of het draai-blok houdt ook het liftcanvas vast */
  let pauzeSinds = 0, pauzeTotaal = 0;
  function speelTijd() { const nu = performance.now(); return nu - pauzeTotaal - (klok.pauze ? nu - pauzeSinds : 0); }
  function T(fn, ms, groep) {
    const id = ++klok.id;
    const t = { fn, rest: Math.max(0, ms || 0), start: performance.now(), h: null, groep: groep || 'scene' };
    klok.lijst.set(id, t);
    if (!klok.pauze) t.h = setTimeout(() => vuur(id), t.rest);
    return id;
  }
  function vuur(id) {
    const t = klok.lijst.get(id);
    if (!t) return;
    klok.lijst.delete(id);
    if (!actief) return;
    try { t.fn(); } catch (e) { meldFout(e); redding(); }
  }
  function wisT(id) {
    const t = id && klok.lijst.get(id);
    if (!t) return;
    clearTimeout(t.h);
    klok.lijst.delete(id);
  }
  function wisAlleT(groep) {
    klok.lijst.forEach((t, id) => {
      if (groep && t.groep !== groep) return;
      clearTimeout(t.h);
      klok.lijst.delete(id);
    });
  }
  function zetPauze(aan) {
    if (aan === klok.pauze) return;
    klok.pauze = aan;
    const nu = performance.now();
    if (aan) pauzeSinds = nu; else pauzeTotaal += nu - pauzeSinds;
    klok.lijst.forEach((t, id) => {
      if (aan) { clearTimeout(t.h); t.h = null; t.rest = Math.max(0, t.rest - (nu - t.start)); }
      else { t.start = nu; t.h = setTimeout(() => vuur(id), t.rest); }
    });
    if (app) app.classList.toggle('pl-gepauzeerd', aan);
    if (AU && AU.pauzeer) AU.pauzeer(aan);
  }
  function draaiBlokToont() {
    const db = document.getElementById('draai-blok');
    return !!(db && db.classList.contains('toon'));
  }
  function evalueerPauze() { if (actief) zetPauze(!!(document.hidden || draaiBlokToont())); }

  /* ---------- R2: de klank van bouwer K (window.ProloogKlank), altijd achter een guard ---------- */
  function klank(naam, ...args) {
    const K = window.ProloogKlank;
    if (!K || typeof K[naam] !== 'function') return;
    try { K[naam](...args); } catch (e) { meldFout(e); }
  }
  /* de wachtmuziek loopt van de oproep tot de Afgrond; ook wie na een herlaad in het gesprek,
     de factuur, het ontslag of de val hervat (of er een hoofdstuk herbeleeft), hoort haar */
  function zorgWacht() { if (wachtAan) return; wachtAan = true; klank('wachtStart'); }
  function wachtUit() { if (!wachtAan) return; wachtAan = false; klank('wachtStop'); }
  function stopVal() { if (val) { const v = val; val = null; try { v.stop(); } catch (e) { meldFout(e); } } }
  /* het liftcanvas alvast bakken (idle), terwijl de factuur print: zo wacht het eerste beeld
     van de val niet op het bakken van de etages en de onweerslucht */
  function bakValVoor(sc) { try { if (window.ProloogVal && typeof ProloogVal.voorbak === 'function') ProloogVal.voorbak(sc && sc.val); } catch (e) { meldFout(e); } }

  /* ---------- DOM-hulpjes (alles in de shadow root) ---------- */
  function el(tag, cls, tekst) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (tekst != null) e.textContent = tekst;
    return e;
  }
  /* art met terugval: img, en bij een laadfout een placeholder-span (emoji/label) */
  function art(src, ph, cls) {
    const houder = el('span', cls || 'art-houder');
    if (src) {
      const img = document.createElement('img');
      img.src = src; img.alt = ''; img.draggable = false; img.className = 'art-img'; img.decoding = 'async';
      img.onerror = function () { img.remove(); houder.appendChild(el('span', 'art-ph', ph || '·')); };
      houder.appendChild(img);
    } else {
      houder.appendChild(el('span', 'art-ph', ph || '·'));
    }
    return houder;
  }
  function knop(cls, tekst, fn) {
    const b = el('button', cls, tekst);
    b.type = 'button';
    b.addEventListener('click', e => {
      e.stopPropagation();
      try { fn(e); } catch (err) { meldFout(err); redding(); }
    });
    return b;
  }
  function interp(tmpl, data) { return (tmpl || '').replace(/\{(\w+)\}/g, (_, k) => (data[k] != null ? data[k] : '…')); }
  function isMobiel() { return !!(host && host.getAttribute('data-modus') === 'mobiel'); }
  /* reduced motion OF de prestatiemodus (body.lite, gespiegeld als data-lite op de host):
     geen blur over het vak, geen tokenvlucht, kortere regie (plan §3: lite = rustig) */
  function isLite() { return !!(host && host.hasAttribute('data-lite')); }
  function rustig() {
    if (isLite()) return true;
    try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  function focusStil(e) { if (e && !isMobiel()) { try { e.focus({ preventScroll: true }); } catch (x) {} } }
  function ontfocus() { try { const a = R && R.activeElement; if (a && a.blur) a.blur(); } catch (x) {} }
  /* een overlay is modaal: de rest van de scène wordt inert (geen tik of spatie op een
     knop eronder) en de focus springt eraf — een spatie spoelt dan de overlay door */
  function modaal(laag) {
    ontfocus();
    const anderen = wrap ? [...wrap.children].filter(c => c !== laag && !c.inert) : [];
    anderen.forEach(c => { c.inert = true; });
    return () => anderen.forEach(c => { c.inert = false; });
  }
  function meldFout(e) { try { console.error('[Proloog]', e); } catch (x) {} }
  /* een fout mag de speler nooit vastzetten: snij naar de Afgrond (of land, als die zelf brak) */
  function redding() {
    if (!actief || klaarGeroepen || !P) return;
    if (inAfgrond()) noodKlaar(); else T(naarAfgrond, 0);
  }

  /* typemachine: onthult tekst teken voor teken; geeft een handle om af te ronden */
  function typMachine(elm, tekst, cps, tikken, klaar) {
    let n = 0, af = false;
    function stap() {
      if (af) return;
      if (n >= tekst.length) { af = true; if (klaar) klaar(); return; }
      n++;
      elm.textContent = tekst.slice(0, n);
      if (tikken && AU && tekst[n - 1] !== ' ' && n % 2 === 0) AU.type();
      T(stap, cps);
    }
    stap();
    return { rond() { if (af) return; af = true; elm.textContent = tekst; if (klaar) klaar(); } };
  }

  /* ---------- doorspoelen + de hint ---------- */
  function doorspoelen() {
    const f = spoel;
    if (!f) return;
    spoel = null;
    try { f(); } catch (e) { meldFout(e); }
  }
  function toonHint(sleutel) {
    if (!hintEl || hintGezien[sleutel]) return;
    hintGezien[sleutel] = true;
    hintEl.textContent = isMobiel() ? 'TIK = DOORSPOELEN' : 'ELKE TOETS = DOORSPOELEN';
    hintEl.classList.add('toon');
    T(() => { if (hintEl) hintEl.classList.remove('toon'); }, 3000, 'sessie');
  }

  /* ---------- de vasthoud-skip ---------- */
  function inAfgrond() { return !!(P && P.scene === IDX.breekpunt && P.checkpoint === 'afgrond'); }
  function magSkippen() { return actief && !klaarGeroepen && !inAfgrond(); }
  function houdSkipStart() {
    if (houd || !magSkippen() || !skipEl) return;
    skipEl.classList.add('zichtbaar', 'vult');
    houd = setTimeout(() => {
      houd = null;
      if (skipEl) skipEl.classList.remove('vult');
      slaOver();
    }, SKIP_HOUD_MS);
  }
  function houdSkipStop() {
    if (!houd) return;
    clearTimeout(houd); houd = null;
    if (skipEl) skipEl.classList.remove('vult');
  }
  function slaOver() {
    if (!actief || klaarGeroepen || inAfgrond()) return;
    houdSkipStop();
    if (herbeleef && typeof opts.over === 'function') {
      /* een herbeleving afbreken = terug naar waar je vandaan kwam, niets geschreven */
      const f = opts.over;
      stop();
      try { f(); } catch (e) { meldFout(e); }
      return;
    }
    /* F1 (review): 'slayit_proloog_over' pas bij de landing (klaarMet), niet hier. Wie in de
       Afgrond herlaadt of de app sluit, heeft nog geen held: dan moet 'Nieuw avontuur' hem
       terugbrengen in de Afgrond (de save staat daar), niet op de heldkeuze zonder voorselectie. */
    overgeslagen = true;
    telGlimlachenBij();
    /* ook wie overslaat, krijgt een uitweg: wie niet zelf sprong, werd geduwd */
    if (!P.choices.val) P.choices.val = 'geduwd';
    schrijfContract({ uitweg: uitwegVan(P.choices.val), jeugddroom: P.choices.jeugddroom || null,
      glimlachen: P.choices.glimlachen || 0, fotoKantoor: !!P.choices.fotoKantoor });
    naarAfgrond();
  }
  function naarAfgrond() {
    P.scene = IDX.breekpunt; P.checkpoint = 'afgrond';
    if (P.gezien.indexOf(P.scene) === -1) P.gezien.push(P.scene);
    bewaar();
    render();
  }

  /* ---------- scène-router ---------- */
  function render() {
    if (!actief || !wrap) return;
    wisAlleT('scene');
    spoel = null; sleutels = null;
    stopCamera();
    stopVal();
    if (AU) { AU.heartStop(); AU.noiseOff(); AU.droneOff(); }
    const scene = STORY.scenes[P.scene];
    if (scene.kind === 'gesprek') zorgWacht();   /* R2: in de wacht, al sinds de oproep */
    wrap.innerHTML = '';
    wrap.className = 'scene scene-' + scene.kind;
    wrap.style.filter = '';
    app.dataset.scene = scene.kind;
    app.classList.remove('pl-afgrond', 'pl-landt');
    host.dataset.plScene = scene.kind;
    if (P.gezien.indexOf(P.scene) === -1) P.gezien.push(P.scene);
    try {
      SCENES[scene.kind](scene, wrap);
    } catch (e) {
      /* een scène die breekt mag de speler nooit vastzetten: snij naar de Afgrond,
         en breekt die zelf, land dan met wat we weten */
      meldFout(e);
      if (scene.kind === 'breekpunt' && P.checkpoint === 'afgrond') noodKlaar();
      else T(naarAfgrond, 0);
      return;
    }
    if (AU) {
      if (['overzicht', 'boot', 'kantoor', 'gesprek'].indexOf(scene.kind) !== -1) AU.humOn();
      else AU.humOff();
    }
  }
  function ga(n, checkpoint) {
    if (n < 0 || n >= AANTAL) return;
    P.scene = n; P.checkpoint = checkpoint || 'start';
    bewaar(); render();
  }
  function verder() { ga(P.scene + 1); }

  /* ═══════════════ SCÈNE · overzicht (kantoor + badge + monitor) ═══════════════ */
  function sceneOverzicht(scene, wrap) {
    let gedoken = false;
    const zoom = el('div', 'ov-zoomlaag');
    zoom.appendChild(art(scene.backdrop.src, scene.backdrop.placeholder, 'ov-backdrop'));
    zoom.appendChild(el('div', 'ov-dim'));
    const monitor = knop('ov-monitor', '', duik);
    monitor.setAttribute('aria-label', 'Inloggen');
    const bezel = el('span', 'ovm-bezel');
    const scherm = el('span', 'ovm-screen');
    scherm.appendChild(el('span', 'ovm-prompt', '▸ ' + (isMobiel() ? scene.prompt.mobiel : scene.prompt.laptop)));
    bezel.appendChild(scherm);
    monitor.appendChild(bezel);
    monitor.appendChild(el('span', 'ovm-voet'));
    zoom.appendChild(monitor);
    wrap.appendChild(zoom);

    const kicker = el('div', 'ov-kicker', scene.kicker);
    kicker.appendChild(el('span', '', scene.klok));
    wrap.appendChild(kicker);
    wrap.appendChild(maakBadge(scene.badge));
    focusStil(monitor);

    function duik() {
      if (gedoken) return; gedoken = true;
      stopCamera();
      if (AU) { AU.unlock(); AU.powerOn(); }
      wrap.classList.add('dive');
      T(verder, rustig() ? 300 : 1150);
    }
  }

  /* de naamkaart: de pasfoto is een STILLE optie — tik op het vakje: de camera
     kijkt live mee in de badge, tik nog eens en hij is genomen. Geen popup; wie geen
     camera heeft (of weigert), kiest een bestand. */
  function maakBadge(badge) {
    const kaart = el('div', 'badge');
    kaart.appendChild(el('span', 'badge-clip'));
    kaart.appendChild(el('div', 'badge-kop', badge.merk));
    const rij = el('div', 'badge-rij');
    const foto = el('button', 'pasfoto');
    foto.type = 'button';
    foto.setAttribute('aria-label', 'Pasfoto');
    let staat = 'leeg', video = null;
    const file = document.createElement('input');
    file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
    file.setAttribute('capture', 'user');
    file.addEventListener('change', () => {
      const f = file.files && file.files[0]; if (!f) return;
      const url = URL.createObjectURL(f);
      objectUrls.add(url);
      const img = new Image();
      img.onload = () => { zetPasfoto(crop(img)); URL.revokeObjectURL(url); objectUrls.delete(url); };
      img.onerror = () => { URL.revokeObjectURL(url); objectUrls.delete(url); };
      img.src = url;
    });
    function teken() {
      foto.innerHTML = '';
      foto.classList.toggle('vol', !!P.choices.pasfoto && staat !== 'live');
      foto.classList.toggle('live', staat === 'live');
      if (staat === 'live' && video) {
        foto.appendChild(video);
        foto.appendChild(el('span', 'pf-sluiter', '● ' + (isMobiel() ? 'tik' : 'klik')));
      } else if (P.choices.pasfoto) {
        const img = document.createElement('img');
        img.src = P.choices.pasfoto; img.alt = 'pasfoto';
        foto.appendChild(img);
      } else {
        const leeg = el('span', 'pf-leeg');
        leeg.appendChild(el('span', '', staat === 'upload' ? '⬆' : '📷'));
        leeg.appendChild(el('span', '', staat === 'upload' ? 'UPLOAD' : 'PASFOTO'));
        foto.appendChild(leeg);
      }
    }
    foto.addEventListener('click', e => {
      e.stopPropagation();
      if (staat === 'live') { neem(); return; }
      if (staat === 'upload') { file.click(); return; }
      startCam();
    });
    function startCam() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { staat = 'upload'; teken(); file.click(); return; }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } } }).then(s => {
        if (!actief || !foto.isConnected) { s.getTracks().forEach(t => t.stop()); return; }
        stopCamera();
        cam = { stream: s };
        video = document.createElement('video');
        video.className = 'pf-video'; video.playsInline = true; video.muted = true; video.autoplay = true;
        video.srcObject = s;
        const p = video.play(); if (p && p.catch) p.catch(() => {});
        staat = 'live'; teken();
      }).catch(() => { staat = 'upload'; teken(); });
    }
    function neem() {
      if (video && video.videoWidth) zetPasfoto(crop(video));
      stopCamera(); video = null; staat = 'leeg'; teken();
    }
    function zetPasfoto(dataUrl) {
      if (!dataUrl) return;
      P.choices.pasfoto = dataUrl; bewaar();
      staat = 'leeg'; teken();
    }
    function crop(bron) {
      try {
        const sw = bron.videoWidth || bron.naturalWidth || bron.width;
        const sh = bron.videoHeight || bron.naturalHeight || bron.height;
        const s = Math.min(sw, sh);
        const c = document.createElement('canvas'); c.width = c.height = 240;
        c.getContext('2d').drawImage(bron, (sw - s) / 2, (sh - s) / 2, s, s, 0, 0, 240, 240);
        return c.toDataURL('image/jpeg', 0.72);
      } catch (e) { return null; }
    }
    teken();
    rij.appendChild(foto);
    rij.appendChild(file);
    const info = el('div', 'badge-info');
    info.appendChild(el('b', '', badge.mw));
    info.appendChild(el('span', '', badge.rol));
    info.appendChild(el('span', 'badge-streep'));
    rij.appendChild(info);
    kaart.appendChild(rij);
    return kaart;
  }
  function stopCamera() {
    if (cam && cam.stream) { try { cam.stream.getTracks().forEach(t => t.stop()); } catch (e) {} }
    cam = null;
  }

  /* ═══════════════ SCÈNE · boot (de CRT degausst — het merk, niet SLAY LIT) ═══════════════ */
  function sceneBoot(scene, wrap) {
    const b = el('div', 'boot');
    let weg = false;
    const klokIn = () => { if (weg) return; weg = true; if (AU) AU.stamp(); verder(); };
    b.addEventListener('click', klokIn);
    b.appendChild(el('div', 'boot-poweron'));
    b.appendChild(el('div', 'boot-jingle', scene.jingle));
    const merk = el('h1', 'boot-merk', scene.merk);
    merk.appendChild(el('sup', '', '™'));
    b.appendChild(merk);
    b.appendChild(el('div', 'boot-tm', scene.tm));
    b.appendChild(el('div', 'boot-baas', scene.baas));
    const cta = el('div', 'boot-cta');
    const k = knop('knop-groot', scene.cta, klokIn);
    cta.appendChild(k);
    b.appendChild(cta);
    b.appendChild(el('div', 'boot-version', scene.version));
    wrap.appendChild(b);
    if (AU) AU.unlock();
    klank('jingle', { vals: true });   /* R2: de bedrijfsjingle, één maat te lang en net vals */
    focusStil(k);
  }

  /* ═══════════════ SCÈNE · kantoor (de beat-machine) ═══════════════ */
  function sceneKantoor(scene, wrap) {
    const beats = scene.beats;
    const railData = scene.rail;
    let stap = 0;
    const m = /^beat:(\d+)$/.exec(P.checkpoint || '');
    if (m && beats[+m[1]] && beats[+m[1]].cp) stap = +m[1];
    let meter = (stap > 0 && typeof P.choices.meter === 'number') ? P.choices.meter : (scene.meterStart || 0);
    /* hervat op een checkpoint: ook de glimlachteller van toen (anders telt een herlaad
       tussen de GLIMLACH-knop en het volgende checkpoint die glimlach dubbel) */
    if (stap > 0 && typeof P.choices.glimCp === 'number') P.choices.glimlachen = P.choices.glimCp;
    const data = () => ({ jeugddroom: P.choices.jeugddroom || '…' });

    /* — koptekst — */
    const kop = el('header', 'kant-header');
    const merk = el('div', 'kh-merk', 'EEN PRODUCTIEF LEVEN');
    merk.appendChild(el('b', '', '™'));
    kop.appendChild(merk);
    kop.appendChild(el('div', 'kh-baas', 'B.A.A.S. v8.7'));
    const mw = el('div', 'kh-mw');
    mw.appendChild(el('b', '', 'MEDEWERKER 0042'));
    mw.appendChild(el('span', '', '24.847 dgn in dienst'));
    kop.appendChild(mw);
    wrap.appendChild(kop);

    /* — terminal + rail — */
    const body = el('div', 'kant-body');
    const mon = el('div', 'monitor');
    const monScherm = el('div', 'monitor-screen');
    const term = el('div', 'term');
    const log = el('div', 'term-log');
    term.appendChild(log);
    const actieVak = el('div', 'term-acties');
    term.appendChild(actieVak);
    monScherm.appendChild(term);
    mon.appendChild(monScherm);
    body.appendChild(mon);

    /* de bureau-rail: laptop rechts, liggend een smalle kolom, staand een strook onderaan */
    const rail = el('div', 'rail');
    const lijst = el('div', 'lijst-oprichter');
    lijst.appendChild(art(railData.oprichter.src, railData.oprichter.placeholder, 'slot'));
    lijst.appendChild(el('div', 'plaquette', '◆ De Oprichter ◆'));
    rail.appendChild(lijst);
    const fotoVak = el('div', 'foto-kind');
    fotoVak.appendChild(el('span', 'stip', 'niet-factureerbaar'));
    fotoVak.appendChild(art(railData.foto.src, railData.foto.placeholder, 'slot'));
    rail.appendChild(fotoVak);
    const team = el('div', 'team');
    const teamEl = {};
    (railData.team || []).forEach(lid => {
      const rij = el('div', 'collega ' + (lid.toon === 'kiss' ? 'kiss' : 'neutraal'));
      const av = el('div', 'av');
      av.appendChild(lid.src ? art(lid.src, lid.emoji, 'av-houder') : el('span', 'av-emoji', lid.emoji));
      rij.appendChild(av);
      const txt = el('div', 'txt');
      txt.appendChild(el('b', '', lid.naam));
      txt.appendChild(el('span', '', lid.rol));
      rij.appendChild(txt);
      team.appendChild(rij);
      teamEl[lid.id] = rij;
    });
    rail.appendChild(team);
    const memo = el('div', 'memo-junior');
    memo.appendChild(art(railData.juniorPortret.src, railData.juniorPortret.placeholder, 'mj-portret'));
    const mj = el('div', 'mj-txt');
    mj.appendChild(el('span', 'mj-stempel', '◆ Directie'));
    mj.appendChild(el('b', '', railData.juniorPortret.naam));
    mj.appendChild(el('span', 'mj-rol', railData.juniorPortret.rol));
    mj.appendChild(el('span', 'mj-memo', railData.junior));
    memo.appendChild(mj);
    rail.appendChild(memo);
    const meterVak = el('div', 'meter');
    const meterKop = el('div', 'meter-kop');
    const meterLabel = el('span', '', 'Facturabiliteit');
    const meterNum = el('b', '', '0%');
    meterKop.appendChild(meterLabel); meterKop.appendChild(meterNum);
    meterVak.appendChild(meterKop);
    const spoor = el('div', 'meter-spoor');
    const vul = el('div', 'meter-vul');
    spoor.appendChild(vul);
    meterVak.appendChild(spoor);
    meterVak.appendChild(el('div', 'meter-voet', 'eenheden van 6 minuten · 1 tiende uur'));
    rail.appendChild(meterVak);
    body.appendChild(rail);
    wrap.appendChild(body);

    function zetMeter(n, label) {
      meter = Math.max(0, Math.min(100, n));
      vul.style.width = meter + '%';
      meterNum.textContent = Math.round(meter) + '%';
      meterLabel.textContent = label || 'Facturabiliteit';
    }
    zetMeter(meter);

    /* de log groeit onderaan; wat bovenaan wegvalt, gaat weg (nooit een scrollbalk) */
    function lijn(cls, tekst) {
      const p = el('p', 'term-line ' + cls, tekst == null ? '' : tekst);
      log.appendChild(p);
      while (log.children.length > 40) log.removeChild(log.firstChild);
      return p;
    }
    function collegaLijn(lid, tekst) {
      const p = lijn('tl-collega ' + (lid.toon === 'kiss' ? 'tl-c-kiss' : 'tl-c-neutraal'));
      p.appendChild(el('b', 'tl-wie', lid.naam));
      p.appendChild(el('span', 'tl-zegt', tekst));
      return p;
    }

    /* — de beat-machine — */
    const PASSIEF = { sys: 1, baas: 1, jij: 1, mark: 1, warm: 1, fluister: 1 };
    const KLASSE = { baas: 'tl-baas', sys: 'tl-sys tl-prompt', jij: 'tl-jij tl-prompt', mark: 'tl-mark', warm: 'tl-baas tl-warm', fluister: 'tl-fluister' };

    function speelBeat() {
      if (!actief || stap >= beats.length) return;
      const beat = beats[stap];
      spoel = null;
      if (beat.cp) { P.checkpoint = 'beat:' + stap; P.choices.meter = meter; P.choices.glimCp = P.choices.glimlachen || 0; bewaar(); }

      if (PASSIEF[beat.type]) {
        if (AU && beat.type === 'warm') AU.warm();
        const tekst = beat.tmpl ? interp(beat.tmpl, data()) : (beat.text || '');
        const p = lijn((KLASSE[beat.type] || 'tl-baas') + ' caret', '');
        const cps = beat.type === 'fluister' ? 16 : 24;
        const pauze = beat.type === 'sys' ? 300 : beat.type === 'fluister' ? 700 : 560;
        let wacht = null;
        const door = () => { wisT(wacht); p.classList.remove('caret'); volgende(); };
        const typ = typMachine(p, tekst, cps, beat.type === 'baas' || beat.type === 'sys', () => {
          wacht = T(door, pauze);
          spoel = door;
        });
        if (!spoel) spoel = () => typ.rond();
      } else if (beat.type === 'collega') {
        const lid = (railData.team || []).find(x => x.id === beat.who);
        if (!lid) { volgende(); return; }
        const rij = teamEl[lid.id];
        if (rij) rij.classList.add('speaking');
        let kaart = null, af = false;
        if (lid.portret) {
          /* Bart Blinker: zijn portret schuift bovenaan binnen — het herkenningspunt */
          kaart = el('div', 'spreker-kaart');
          const portret = el('div', 'sk-portret');
          portret.appendChild(art(lid.portret, lid.emoji, 'sk-img'));
          kaart.appendChild(portret);
          const tk = el('div', 'sk-tekst');
          const plaat = el('span', 'sk-plaat', lid.naam);
          plaat.appendChild(el('i', '', lid.rol));
          tk.appendChild(plaat);
          tk.appendChild(el('div', 'sk-zin', beat.text));
          kaart.appendChild(tk);
          wrap.appendChild(kaart);
        } else {
          collegaLijn(lid, beat.text);
        }
        const klaar = () => {
          if (af) return; af = true;
          wisT(tid);
          if (kaart) { kaart.remove(); collegaLijn(lid, beat.text); }
          if (rij) rij.classList.remove('speaking');
          volgende();
        };
        const tid = T(klaar, lid.portret ? 2600 : 2300);
        spoel = klaar;
      } else if (beat.type === 'meter') {
        zetMeter(beat.to, beat.label || '');
        const door = () => { wisT(tid); zetMeter(meter); volgende(); };
        const tid = T(door, 1100);
        spoel = door;
      } else if (beat.type === 'glitch') {
        if (AU) AU.glitch();
        const frame = el('div', 'glitch-frame');
        frame.appendChild(el('p', '', beat.text));
        wrap.appendChild(frame);
        const vrij = modaal(frame);
        const door = () => { wisT(tid); frame.remove(); vrij(); volgende(); };
        const tid = T(door, 1500);
        spoel = door;
      } else if (beat.type === 'actie') {
        beat.knoppen.forEach(k => {
          const b = knop(k.soort === 'billable' ? 'knop-billable' : 'knop-niet-billable', k.label, () => kiesActie(k));
          b.dataset.actie = k.id;
          if (k.units) b.appendChild(el('span', 'u', k.units));
          actieVak.appendChild(b);
          focusStil(b);
        });
        const f = beat.knoppen.find(k => k.id === 'foto');
        if (f) {
          fotoVak.classList.add('pulse');
          fotoVak.onclick = e => { e.stopPropagation(); kiesActie(f); };
        }
      } else if (beat.type === 'invoer') {
        const inp = document.createElement('input');
        inp.maxLength = beat.max || 40;
        inp.placeholder = beat.placeholder || '';
        inp.autocomplete = 'off';
        inp.enterKeyHint = 'done';
        inp.value = P.choices.jeugddroom || '';
        let verstuurd = false;
        const stuur = () => {
          if (verstuurd) return; verstuurd = true;
          const v = (inp.value || '').trim().slice(0, 60) || 'iets belangrijks';
          P.choices.jeugddroom = v; bewaar();
          schrijfContract({ jeugddroom: v });
          try { inp.blur(); } catch (e) {}
          actieVak.innerHTML = '';
          volgende();
        };
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); stuur(); } });
        inp.addEventListener('click', e => e.stopPropagation());
        const vak = el('div', 'term-invoer');
        vak.appendChild(inp);
        vak.appendChild(knop('', '↵ noteer', stuur));
        actieVak.appendChild(vak);
        try { inp.focus({ preventScroll: true }); } catch (e) {}
      } else if (beat.type === 'oproep') {
        if (AU) { AU.humOff(); AU.glitch(); }
        toonOproep();
      } else { volgende(); }
    }

    function volgende() { if (!actief) return; stap++; speelBeat(); }

    function kiesActie(k) {
      if (!actieVak.children.length) return;   /* dubbelklik: de actie is al gekozen */
      actieVak.innerHTML = '';
      fotoVak.classList.remove('pulse'); fotoVak.onclick = null;
      if (k.id === 'glimlach') {
        P.choices.glimlachen = (P.choices.glimlachen || 0) + 1; bewaar();
        schrijfContract({ glimlachen: P.choices.glimlachen });
      }
      if (k.id === 'foto') {
        P.choices.fotoKantoor = true; bewaar();
        schrijfContract({ fotoKantoor: true });
        if (scene.fotoKijk) {
          if (AU) AU.warm();
          toonFotoKijk(scene.fotoKijk, railData.foto.src, () => {
            if (typeof k.meter === 'number') zetMeter(meter + k.meter);
            volgende();
          });
          return;
        }
      }
      if (AU && k.soort === 'billable') AU.ding();
      if (typeof k.meter === 'number') zetMeter(meter + k.meter);
      volgende();
    }

    /* de oproep: jij wordt uit de zaal gelicht */
    function toonOproep() {
      const o = scene.oproep;
      zorgWacht();   /* R2: "uw aanwezigheid is vereist" — en u staat in de wacht */
      const laag = el('div', 'oproep');
      const links = el('div', 'op-links');
      const zaal = el('div', 'op-zaal');
      (railData.team || []).forEach(lid => {
        const av = el('div', 'op-collega');
        av.appendChild(lid.portret || lid.src ? art(lid.portret || lid.src, lid.emoji, 'op-av') : el('span', 'op-av op-emoji', lid.emoji));
        zaal.appendChild(av);
      });
      links.appendChild(zaal);
      const badge = el('div', 'op-badge');
      badge.appendChild(el('span', 'op-badge-merk', 'EEN PRODUCTIEF LEVEN™'));
      badge.appendChild(el('span', 'op-badge-nr', '0042'));
      badge.appendChild(el('span', 'op-badge-jij', '↑ U'));
      links.appendChild(badge);
      const roep = el('div', 'op-roep', o.nummer);
      roep.appendChild(el('span', 'op-caret2'));
      links.appendChild(roep);
      links.appendChild(el('div', 'op-roep-sub', o.roep));
      laag.appendChild(links);
      const rechts = el('div', 'op-rechts');
      const regels = el('div', 'op-regels');
      rechts.appendChild(regels);
      const voet = el('div', 'op-voet');
      rechts.appendChild(voet);
      laag.appendChild(rechts);
      wrap.appendChild(laag);
      modaal(laag);
      let i = 0, tid = null, af = false;
      function afronden() {
        if (af) return; af = true; spoel = null;
        const k = knop('knop-groot op-cta', o.cta + ' ▸', () => { laag.remove(); ga(IDX.gesprek); });
        voet.appendChild(k);
        focusStil(k);
      }
      function toon() {
        if (i >= o.regels.length) { afronden(); return; }
        regels.appendChild(el('p', 'op-regel', o.regels[i]));
        i++;
        tid = T(toon, 2400);
      }
      spoel = () => {
        wisT(tid);
        while (i < o.regels.length) { regels.appendChild(el('p', 'op-regel', o.regels[i])); i++; }
        afronden();
      };
      tid = T(toon, 1600);
    }

    toonHint('kantoor');
    speelBeat();
  }

  /* het foto-kijk-overlay (kantoor + gesprek): regels verschijnen, een tik spoelt door,
     de knop is de handeling */
  function toonFotoKijk(fk, src, klaar, opties) {
    const laag = el('div', 'foto-kijk' + (opties && opties.groot ? ' fk-groot' : ''));
    laag.appendChild(art(src, '🖼️', 'fk-beeld'));
    const tekst = el('div', 'fk-tekst');
    const regels = el('div', 'fk-regels');
    tekst.appendChild(regels);
    const voet = el('div', 'fk-voet');
    tekst.appendChild(voet);
    laag.appendChild(tekst);
    wrap.appendChild(laag);
    const vrij = modaal(laag);
    let i = 0, tid = null, af = false;
    const eerste = (opties && opties.eerste) || 1300, rest = (opties && opties.rest) || 2500;
    function cta() {
      if (af) return; af = true; spoel = null;
      const k = knop('knop-groot fk-cta', fk.cta + ' ▸', () => { if (!laag.isConnected) return; laag.remove(); vrij(); klaar(); });
      voet.appendChild(k);
      focusStil(k);
    }
    function toon() {
      if (i >= fk.regels.length) { cta(); return; }
      regels.appendChild(el('p', 'fk-regel', fk.regels[i]));
      i++;
      if (opties && opties.warmOp === i && AU) AU.warm();
      tid = T(toon, rest);
    }
    spoel = () => {
      wisT(tid);
      while (i < fk.regels.length) { regels.appendChild(el('p', 'fk-regel', fk.regels[i])); i++; }
      cta();
    };
    tid = T(toon, eerste);
  }

  /* ═══════════════ SCÈNE · gesprek (het onwinbare gevecht) ═══════════════ */
  function sceneGesprek(scene, wrap) {
    const S = scene;
    const st = {
      welzijn: S.start.welzijn, blok: 0, maxEnergie: S.start.energie,
      energie: S.start.energie, turn: 0, baasFact: S.facturabiliteit,
      paniek: 0, einde: null, fotoKlaar: false
    };
    const fotoSrc = (S.hand.find(k => k.id === 'foto') || {}).src;
    glimOpen = 0;   /* een (her)start van het gesprek telt van nul */

    wrap.appendChild(el('div', 'gesprek-titel', S.titel));

    /* B.A.A.S.-paneel */
    const paneel = el('div', 'baas-paneel');
    paneel.appendChild(art(S.baas.src, '▮', 'bp-art'));
    const mid = el('div', 'bp-mid');
    const naam = el('div', 'bp-naam', 'B.A.A.S. ');
    naam.appendChild(el('span', '', '· uw gesprekspartner'));
    mid.appendChild(naam);
    const rij1 = el('div', 'bp-rij');
    rij1.appendChild(el('span', '', 'AANDEELHOUDERSWAARDE'));
    rij1.appendChild(el('b', 'oneindig', '∞'));
    mid.appendChild(rij1);
    const rij2 = el('div', 'bp-rij');
    rij2.appendChild(el('span', '', 'FACTURABILITEIT'));
    const factNum = el('b', '', st.baasFact + '%');
    rij2.appendChild(factNum);
    mid.appendChild(rij2);
    const factBar = el('div', 'fact-bar');
    const factVul = el('div', 'fact-vul');
    factBar.appendChild(factVul);
    mid.appendChild(factBar);
    const rij3 = el('div', 'bp-rij');
    rij3.appendChild(el('span', '', 'OPTIMALISATIE'));
    const optPips = el('span', 'opt-pips');
    rij3.appendChild(optPips);
    mid.appendChild(rij3);
    paneel.appendChild(mid);
    const intentVak = el('div', 'intent');
    paneel.appendChild(intentVak);
    wrap.appendChild(paneel);

    /* flits-balk */
    const flits = el('div', 'flits');
    const flitsBron = el('span', 'flits-bron');
    const flitsTekst = el('span', 'flits-tekst');
    flits.appendChild(flitsBron); flits.appendChild(flitsTekst);
    wrap.appendChild(flits);

    /* beurt-stepper */
    const stepper = el('div', 'beurt-stepper');
    wrap.appendChild(stepper);

    /* spelerbalk */
    const balk = el('div', 'speler-balk');
    const wz = el('div', 'sp-welzijn');
    wz.appendChild(el('span', 'sp-label', 'WELZIJN'));
    const wzBar = el('div', 'welzijn-bar');
    const wzVul = el('div', 'welzijn-vul');
    const wzNum = el('span', 'welzijn-num');
    wzBar.appendChild(wzVul); wzBar.appendChild(wzNum);
    wz.appendChild(wzBar);
    const blokBadge = el('span', 'blok-badge');
    wz.appendChild(blokBadge);
    balk.appendChild(wz);
    const en = el('div', 'sp-energie');
    en.appendChild(el('span', 'sp-label', 'ENERGIE'));
    const enPips = el('span', 'energie-pips');
    en.appendChild(enPips);
    balk.appendChild(en);
    const eindKnop = knop('knop-eindig', 'Eindig beurt ▸', eindigBeurt);
    if (!isMobiel()) eindKnop.title = 'Eindig beurt (E)';
    balk.appendChild(eindKnop);
    wrap.appendChild(balk);

    /* de hand */
    const hand = el('div', 'hand');
    const kaartEls = [];
    S.hand.forEach((k, i) => {
      const b = el('button', 'kkaart kk-' + k.soort);
      b.type = 'button';
      b.dataset.kaart = k.id;
      if (!isMobiel()) b.dataset.toets = String(i + 1);   /* laptop: 1-6 speelt de kaart */
      b.appendChild(el('span', 'kk-kost', String(k.kost)));
      b.appendChild(art(k.src, k.ph, 'kk-art'));
      b.appendChild(el('span', 'kk-naam', k.naam));
      const tekst = el('span', 'kk-tekst');
      tekst.innerHTML = k.tekst; /* ontwikkelaar-data uit data.js, geen spelersinvoer */
      b.appendChild(tekst);
      b.appendChild(el('span', 'kk-flavor', k.flavor));
      b.appendChild(el('span', 'kk-soort', k.soort));
      if (k.eff.ontsnap) b.appendChild(el('span', 'kk-tweede', isMobiel() ? S.fotoTweede.mobiel : S.fotoTweede.laptop));
      b.addEventListener('click', e => { e.stopPropagation(); speel(k); });
      hand.appendChild(b);
      kaartEls.push({ k, b });
    });
    wrap.appendChild(hand);

    function pips(houder, totaal, vol, cls) {
      houder.innerHTML = '';
      for (let i = 0; i < totaal; i++) houder.appendChild(el('span', 'pip ' + (i < vol ? cls : 'pip-leeg')));
    }
    function zetFlits(bron, t) {
      flits.className = 'flits flits-' + bron + ' paniek-' + Math.min(st.paniek, 4);
      flitsBron.textContent = bron === 'baas' ? 'B.A.A.S.' : bron === 'jij' ? 'JIJ' : '⚠ SYSTEEM';
      flitsTekst.textContent = t;
    }
    function herteken() {
      factNum.textContent = st.baasFact + '%';
      factVul.style.width = st.baasFact + '%';
      pips(optPips, 3, 3 - st.turn, 'pip-opt');
      const intent = S.intenties[Math.min(st.turn, S.intenties.length - 1)];
      intentVak.className = 'intent intent-' + st.turn;
      intentVak.innerHTML = '';
      intentVak.appendChild(el('div', 'int-kop', intent.kop + ' · intentie'));
      intentVak.appendChild(el('div', 'int-naam', intent.icoon + ' ' + intent.naam));
      intentVak.appendChild(el('div', 'int-tele', intent.telegraph));
      intentVak.appendChild(el('div', 'int-hint', intent.hint));
      stepper.innerHTML = '';
      S.intenties.forEach((it, idx) => {
        const s = el('div', 'bstap' + (idx < st.turn ? ' gedaan' : '') + (idx === st.turn ? ' actief' : '') + (idx === S.intenties.length - 1 ? ' finaal' : ''));
        s.appendChild(el('span', 'bstap-num', idx < st.turn ? '✓' : String(idx + 1)));
        const bt = el('span', 'bstap-tekst');
        bt.appendChild(el('b', '', 'Beurt ' + (idx + 1)));
        bt.appendChild(document.createTextNode(it.naam));
        s.appendChild(bt);
        if (idx < S.intenties.length - 1) s.appendChild(el('span', 'bstap-pijl', '→'));
        stepper.appendChild(s);
      });
      wzVul.style.width = (st.welzijn / S.start.welzijn * 100) + '%';
      wzNum.textContent = st.welzijn + '/' + S.start.welzijn;
      blokBadge.textContent = st.blok > 0 ? '🛡 ' + st.blok : '';
      blokBadge.style.display = st.blok > 0 ? '' : 'none';
      pips(enPips, st.maxEnergie, st.energie, 'pip-nrg');
      eindKnop.disabled = !!st.einde;
      kaartEls.forEach(({ k, b }) => {
        b.disabled = !!st.einde || (!k.eff.ontsnap && st.energie < k.kost);
        b.classList.toggle('kk-uit', b.disabled);
        if (k.eff.ontsnap) b.classList.toggle('kk-klaar', st.fotoKlaar && !st.einde);
      });
    }

    function eindig(hoe) {
      if (st.einde) return;
      st.einde = hoe;
      /* het contract krijgt zijn uitweg NU, en de save springt meteen door naar de
         Eindafrekening: een herlaad tijdens de uitkomst hervat daar, niet in het gesprek */
      P.choices.val = hoe;
      telGlimlachenBij();
      P.scene = IDX.breekpunt; P.checkpoint = 'factuur';
      bewaar();
      schrijfContract({ uitweg: uitwegVan(hoe), glimlachen: P.choices.glimlachen || 0 });
      herteken();
      toonUitkomst(hoe);
    }
    function toonUitkomst(hoe) {
      const u = S.uitkomst[hoe] || S.uitkomst.geduwd;
      const laag = el('div', 'uitkomst uit-' + hoe);
      if (hoe === 'gesprongen') laag.appendChild(el('div', 'uit-tear'));
      laag.appendChild(el('div', 'uit-kop', u.kop));
      const p = el('p', 'uit-body');
      p.innerHTML = u.body; /* ontwikkelaar-data */
      laag.appendChild(p);
      wrap.appendChild(laag);
      modaal(laag);
      /* regie, geen knop: na een ademtocht door naar de Eindafrekening; een tik spoelt door */
      const door = () => { wisT(tid); render(); };
      const tid = T(door, 3400);
      spoel = door;
    }

    function speel(k) {
      if (st.einde || st.kijkt) return;
      if (k.eff.ontsnap) {
        /* de foto: de eerste tik tilt hem op, de tweede kijkt (de modal is weg) */
        if (!st.fotoKlaar) { st.fotoKlaar = true; if (AU) AU.tik(); herteken(); return; }
        startKijken(); return;
      }
      if (st.fotoKlaar) st.fotoKlaar = false;
      if (st.energie < k.kost) { zetFlits('systeem', 'Niet genoeg energie. Je vingers haperen boven de kaarten.'); herteken(); return; }
      if (AU) AU.tik();
      const e = k.eff;
      st.energie -= k.kost;
      if (e.blok) st.blok += e.blok;
      if (e.schade) st.baasFact = Math.min(100, st.baasFact + 6);
      if (e.energie) st.energie += e.energie;
      if (e.welzijn) st.welzijn = Math.max(0, st.welzijn + e.welzijn);
      if (e.baasFact) st.baasFact = Math.min(100, st.baasFact + e.baasFact);
      if (k.id === 'glimlach') glimOpen++;   /* telt pas bij eindig(): zie telGlimlachenBij */
      const lijnen = (S.reacties && S.reacties[k.id]) || [];
      if (lijnen.length) zetFlits('jij', lijnen[Math.min(st.paniek, lijnen.length - 1)]);
      st.paniek++;
      if (st.welzijn <= 0) { herteken(); eindig('geduwd'); return; }
      herteken();
    }

    function eindigBeurt() {
      if (st.einde || st.kijkt) return;
      st.fotoKlaar = false;
      if (st.turn === 0) {
        const dmg = Math.max(0, 8 - st.blok);
        st.welzijn = Math.max(0, st.welzijn - dmg);
        st.blok = 0; st.turn = 1; st.energie = st.maxEnergie; st.paniek++;
        zetFlits('systeem', dmg > 0
          ? 'DEADLINE. ' + dmg + ' stress slaat dwars door je Welzijn. Je adem stokt.'
          : 'DEADLINE. Je Blok houdt — nipt. Je hoort je eigen hart in de stilte.');
        if (st.welzijn <= 0) { herteken(); eindig('geduwd'); return; }
      } else if (st.turn === 1) {
        st.maxEnergie = Math.max(1, st.maxEnergie - 1);
        st.blok = 0; st.energie = st.maxEnergie; st.turn = 2; st.paniek++;
        zetFlits('systeem', 'VERPLICHTE TEAMBUILDING. Ze nemen je ⚡ en noemen het “samen”. Het kwartje valt: niets wat je speelt verlaagt ∞.');
      } else {
        eindig('geduwd');
        return;
      }
      herteken();
    }

    function startKijken() {
      if (st.einde || st.kijkt) return;
      st.kijkt = true;
      if (AU) AU.warm();
      toonFotoKijk(S.fotoKijk, fotoSrc, () => eindig('gesprongen'), { groot: true, eerste: 1500, rest: 2700, warmOp: 3 });
    }

    /* laptop: 1-6 speelt een kaart, E eindigt de beurt */
    sleutels = e => {
      if (st.einde || st.kijkt) return false;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= kaartEls.length) { if (!e.repeat) speel(kaartEls[n - 1].k); return true; }
      if (e.key === 'e' || e.key === 'E') { if (!e.repeat) eindigBeurt(); return true; }
      return false;
    };

    zetFlits('baas', '“Fijn dat u er bent. Dit is een gesprek tussen gelijken.”');
    herteken();
  }

  /* ═══════════════ SCÈNE · breekpunt (factuur → ontslag → val → afgrond) ═══════ */
  function sceneBreekpunt(scene, wrap) {
    const S = scene;
    const sprong = P.choices.val === 'gesprongen';
    const data = { jeugddroom: P.choices.jeugddroom || 'iets belangrijks' };
    const titel = el('div', 'bs-titel', S.titel);
    wrap.appendChild(titel);
    const vak = el('div', 'bs-vak');
    wrap.appendChild(vak);
    const start = FASEN.indexOf(P.checkpoint) !== -1 ? P.checkpoint : 'factuur';
    ({ factuur: faseFactuur, ontslag: faseOntslag, val: faseVal, afgrond: faseAfgrond })[start]();

    function zetFase(naam) {
      wisAlleT('scene');
      stopVal();
      if (naam === 'afgrond') wachtUit(); else zorgWacht();
      spoel = null; sleutels = null;
      P.checkpoint = naam; bewaar();
      app.dataset.fase = naam;
      vak.style.filter = '';
    }

    /* de factuur print regel per regel (een tik print de rest in één keer); het
       papier loopt onderaan het venster uit, dus nooit een scrollbalk */
    function faseFactuur() {
      zetFase('factuur');
      bakValVoor(S);
      titel.textContent = S.titel; titel.style.display = '';
      vak.innerHTML = ''; vak.className = 'bs-vak fase-factuur';
      const f = S.factuur;
      const venster = el('div', 'bon-venster');
      const bon = el('div', 'bon');
      bon.appendChild(el('div', 'bon-perfo'));
      bon.appendChild(el('div', 'bon-kop', f.kop));
      bon.appendChild(el('div', 'bon-sub', f.sub));
      const regels = el('div', 'bon-regels');
      bon.appendChild(regels);
      venster.appendChild(bon);
      vak.appendChild(venster);
      const voet = el('div', 'bs-voet');
      vak.appendChild(voet);
      let i = 0, tid = null, af = false;
      function regel(r) {
        const rij = el('div', 'bon-regel bon-' + r.soort);
        rij.appendChild(el('span', 'bon-label', interp(r.label, data)));
        rij.appendChild(el('span', 'bon-dots'));
        rij.appendChild(el('span', 'bon-waarde', r.waarde));
        regels.appendChild(rij);
      }
      function afdrukken() {
        if (af) return; af = true; spoel = null;
        const tot = el('div', 'bon-totaal');
        tot.appendChild(el('span', '', f.totaalLabel));
        tot.appendChild(el('b', '', f.totaal));
        bon.appendChild(tot);
        bon.appendChild(el('div', 'bon-voet', f.voet));
        bon.appendChild(el('div', 'bon-perfo onder'));
        const k = knop('knop-groot', f.cta + ' ▸', faseOntslag);
        voet.appendChild(k);
        focusStil(k);
      }
      function print() {
        if (i >= f.regels.length) { tid = T(afdrukken, 260); return; }
        regel(f.regels[i]); i++;
        if (AU) AU.type();
        tid = T(print, 130);
      }
      spoel = () => { wisT(tid); while (i < f.regels.length) { regel(f.regels[i]); i++; } afdrukken(); };
      tid = T(print, 420);
    }

    function faseOntslag() {
      zetFase('ontslag');
      bakValVoor(S);
      titel.style.display = 'none';
      vak.innerHTML = ''; vak.className = 'bs-vak fase-ontslag';
      const o = S.ontslag;
      const brief = el('div', 'brief');
      const kolom1 = el('div', 'brief-kolom');
      kolom1.appendChild(el('div', 'brief-kop', o.kop));
      const bodyVak = el('div', 'brief-body');
      o.regels.forEach(r => bodyVak.appendChild(el('p', r.warm ? 'br-warm' : 'br-koud', r.t)));
      kolom1.appendChild(bodyVak);
      brief.appendChild(kolom1);
      const stempel = el('div', 'brief-stempel', o.stempel);
      stempel.style.visibility = 'hidden';
      brief.appendChild(stempel);
      T(() => { stempel.style.visibility = ''; stempel.classList.add('slam'); if (AU) AU.stamp(); }, 200);
      const kolom2 = el('div', 'brief-kolom brief-rechts');
      let cta = null;
      if (sprong) {
        kolom2.appendChild(el('div', 'brief-sprong', o.sprong.plus));
        cta = knop('knop-groot brief-cta', o.sprong.cta + ' ▸', faseVal);
      } else {
        const teken = el('div', 'brief-teken');
        teken.appendChild(el('span', '', o.teken));
        cta = knop('knop-pen', '🖊 ' + o.knop, () => {
          /* de lege pen: alleen een groef — dan de val */
          teken.innerHTML = '';
          teken.appendChild(el('span', 'brief-groef', o.geduwd));
          if (AU) AU.tik();
          const door = () => { wisT(tid); faseVal(); };
          const tid = T(door, 1800);
          spoel = door;
        });
        teken.appendChild(cta);
        kolom2.appendChild(teken);
      }
      const onder = el('div', 'brief-onder');
      onder.appendChild(art(o.ondertekenaar.src, o.ondertekenaar.placeholder, 'bo-portret'));
      const bo = el('div', 'bo-txt');
      bo.appendChild(el('span', 'bo-hand', o.ondertekenaar.handtekening));
      bo.appendChild(el('b', '', o.ondertekenaar.naam));
      bo.appendChild(el('span', 'bo-rol', o.ondertekenaar.rol));
      onder.appendChild(bo);
      kolom2.appendChild(onder);
      brief.appendChild(kolom2);
      vak.appendChild(brief);
      if (sprong) { const voet = el('div', 'bs-voet'); voet.appendChild(cta); vak.appendChild(voet); }
      focusStil(cta);
    }

    /* ═══ IN DE WACHT: DE VAL (R2) ═══
       Een pixelcanvas (proloog/val.js) met de lichtmotor van de outro: 0042 in de
       goederenlift, de etages van de outro glijden voorbij en doven, de wachtmuziek zakt een
       halve toon per etage (tot −7), de meter-LED toont VERBINDING VERBROKEN (de enige keer),
       de vloer valt uiteen, stilte, één ademend kooltje. Dan licht de knop −∞ op: wie sprong,
       drukt hem zelf in (beschenen door de gevallen foto); wie geduwd werd, ziet B.A.A.S.
       drukken. Eén tik = één stap vooruit, naar de volgende mijlpaal van de val. */
    function faseVal() {
      zetFase('val');
      laadAfgrondVoor();
      titel.style.display = 'none';
      vak.innerHTML = ''; vak.className = 'bs-vak fase-val';
      const v = S.val;
      if (AU) { AU.humOff(); AU.heartStop(); AU.noiseOff(); }
      klank('transponeer', 0);
      let knopEl = null, weg = false;
      const druk = () => {
        if (weg || !knopEl || !actief) return;
        weg = true; spoel = null;
        knopEl.classList.add('ingedrukt');
        klank('sfx', 'knop');
        const van = val ? val.kooltje() : null;   /* het kooltje van de lift: de Afgrond neemt het over */
        if (val) val.druk();
        T(() => faseAfgrond(van), rustig() ? 150 : 520);
      };
      /* de knop die niet zou mogen bestaan: een echte knop, op zijn fitting in het canvas */
      function toonKnop() {
        if (knopEl) return;
        const houder = el('div', 'val-knophouder');
        knopEl = knop('val-knop ' + (sprong ? 'foto' : 'baas'), v.knop, druk);
        knopEl.setAttribute('aria-label', 'Min oneindig');
        houder.appendChild(knopEl);
        houder.appendChild(el('p', 'val-knop-zin', sprong ? v.knopSprong : v.knopGeduwd));
        if (val) val.hang(houder, 'knop'); else vak.appendChild(houder);
        spoel = sprong ? null : druk;   /* sprong: hier handel jij; geduwd: een tik laat B.A.A.S. drukken */
        focusStil(knopEl);
      }
      /* de momenten van de val → klank (bouwer K: ProloogKlank kent de gebeurtenisnamen van
         val.js als sfx) en de knop. Wie doorspoelt, hoort de transponering wel stap voor stap
         zakken, maar geen stapel belletjes (laat > 0,25 s: geen sfx). */
      const opVal = (naam, arg, laat) => {
        if (!actief) return;
        const vers = !(laat > 0.25);
        if (naam === 'etage') { klank('transponeer', -(arg + 1)); if (vers) klank('sfx', 'etage'); }   /* DAK … −3 → −1 … −7 */
        else if (naam === 'stilte') klank('stilte', arg);
        else if (naam === 'knop') toonKnop();
        else if (naam === 'baasDrukt') { if (!sprong) druk(); }
        else if (naam !== 'slot' && vers) klank('sfx', naam);   /* hek, krant, tl, verbinding, ledUit, vloer, kooltje */
      };
      try {
        if (window.ProloogVal && typeof ProloogVal.start === 'function') {
          val = ProloogVal.start({ houder: vak, sprong, tekst: v, nu: speelTijd, gepauzeerd: () => klok.pauze,
            rustig: rustig(), lite: isLite(), bij: opVal });
        }
      } catch (e) { meldFout(e); val = null; }
      if (!val) {
        /* terugval zonder canvas (geen OutroFX of geen 2D-context): de uitkomst in woorden, dan de knop */
        vak.classList.add('val-nood');
        vak.appendChild(el('p', 'val-nood-kop', v.verbinding));
        toonKnop();
        if (!sprong) T(druk, 1700);
        return;
      }
      const spoelVal = () => {
        if (!val || weg) return;
        val.spoel();
        if (!knopEl) spoel = spoelVal;   /* nog in de val; anders zette toonKnop() de volgende stap */
      };
      spoel = spoelVal;
      toonHint('val');
    }

    /* ═══ DE AFGROND = DE HELDKEUZE ═══
       Drie maskers rond het kooltje, van onderen belicht in de kleur van hun held.
       De eerste tik (of hover/toetsfocus) pelt het masker af tot de held — naam,
       stijl, HP en startkaarten komen uit window.SPELERS; de tweede tik (of de knop)
       laat los. De andere twee kantelen ±18° en vallen, het gekozen token krimpt en
       zinkt in het kooltje. Op puur zwart gaat klaar(uitkomst) naar de game (plan §3). */
    function faseAfgrond(van) {
      zetFase('afgrond');
      houdSkipStop();
      app.classList.add('pl-afgrond');
      titel.style.display = 'none';
      vak.innerHTML = ''; vak.className = 'bs-vak fase-afgrond';
      const b = S.breekpunt;
      if (AU) { AU.humOff(); AU.heartStop(); AU.noiseOff(); AU.droneOn(46, 0.05); }

      const decor = el('div', 'afgrond');
      decor.appendChild(art(b.afgrondArt, '', 'afg-art'));
      for (let n = 0; n < 6; n++) { const r = el('div', 'afg-rimpel'); r.style.setProperty('--ri', n); decor.appendChild(r); }
      decor.appendChild(el('div', 'afg-ember'));
      vak.appendChild(decor);

      const stage = el('div', 'afg-stage');
      const kopvak = el('div', 'afg-kopvak');
      kopvak.appendChild(el('h2', 'afg-kop', b.kop));
      kopvak.appendChild(el('p', 'afg-vraag', b.vraag));
      kopvak.appendChild(el('p', 'afg-sub', b.sub));
      const rij = el('div', 'afg-maskers');
      const kool = el('div', 'afg-kooltje');
      const gloed = el('span', 'afg-kool-gloed');
      const kern = el('span', 'afg-kool-kern');
      kool.appendChild(gloed); kool.appendChild(kern);
      const info = el('div', 'afg-info');
      const voet = el('p', 'afg-voet', b.voet);
      stage.appendChild(kopvak); stage.appendChild(rij); stage.appendChild(kool); stage.appendChild(info); stage.appendChild(voet);
      vak.appendChild(stage);
      const zwart = el('div', 'afg-zwart');
      vak.appendChild(zwart);

      let gepeld = null, gekozen = false;
      /* een klik die van de −∞-knop of de skip overloopt, kiest nooit meteen: de eerste
         0,6 s pelt een klik alleen af */
      const binnen = performance.now();
      const items = STORY.MASKERS.map(m => {
        const heldId = heldVoorMasker(m.id);
        const h = heldInfo(heldId);
        const btn = el('button', 'afg-masker');
        btn.type = 'button';
        btn.dataset.masker = m.id;
        btn.dataset.held = heldId;
        btn.style.setProperty('--mk', 'rgb(' + h.kleur + ')');
        btn.style.setProperty('--mk-rgb', h.kleur);
        btn.setAttribute('aria-label', m.reactie + ': ' + h.naam);
        const schijf = el('span', 'afg-schijf');
        const heldVak = el('span', 'afg-held');
        heldVak.appendChild(art(h.art, h.ph, 'afg-held-art'));
        const mom = el('span', 'afg-mom');
        mom.appendChild(art(m.masker.src, m.masker.ph, 'afg-mom-art'));
        schijf.appendChild(heldVak); schijf.appendChild(mom); schijf.appendChild(el('span', 'afg-ring'));
        btn.appendChild(schijf);
        const label = el('span', 'afg-label', m.reactie);
        btn.appendChild(label);
        rij.appendChild(btn);
        const it = { m, h, heldId, btn, schijf };
        btn.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') pel(it); });
        btn.addEventListener('focus', () => { let kb = false; try { kb = btn.matches(':focus-visible'); } catch (x) {} if (kb) pel(it); });
        btn.addEventListener('click', e => {
          e.stopPropagation();
          if (gepeld === it && performance.now() - binnen > 600) kies(it); else pel(it);
        });
        return it;
      });

      function pel(it) {
        if (gekozen || gepeld === it) return;
        gepeld = it;
        items.forEach(x => x.btn.classList.toggle('gepeld', x === it));
        stage.classList.add('heeft-gepeld');
        if (AU) AU.tik();
        tekenInfo(it);
      }
      function tekenInfo(it) {
        info.innerHTML = '';
        if (!it) {
          info.className = 'afg-info leeg';
          info.appendChild(el('p', 'afg-info-leeg', isMobiel() ? b.leeg.mobiel : b.leeg.laptop));
          return;
        }
        info.className = 'afg-info';
        info.style.setProperty('--mk', 'rgb(' + it.h.kleur + ')');
        info.style.setProperty('--mk-rgb', it.h.kleur);
        info.dataset.held = it.heldId;
        const tekst = el('div', 'afg-info-tekst');
        const ik = el('div', 'afg-info-kop');
        ik.appendChild(el('b', 'afg-naam', it.h.naam));
        ik.appendChild(el('span', 'afg-hp', '♥ ' + it.h.hp));
        tekst.appendChild(ik);
        /* R2: de zin komt uit OutroFX.MASKERZINNEN (één bron met de outro); geen bron → geen regel */
        const zin = STORY.maskerZin(it.m.id, P.choices.jeugddroom);
        if (zin) tekst.appendChild(el('p', 'afg-zin', '“' + zin + '”'));
        tekst.appendChild(el('p', 'afg-stijl', it.h.stijl));
        const kaarten = el('p', 'afg-kaarten');
        kaarten.appendChild(el('span', 'afg-kaarten-kop', 'Startkaarten'));
        kaarten.appendChild(document.createTextNode(' ' + it.h.kaarten.join(' · ')));
        tekst.appendChild(kaarten);
        info.appendChild(tekst);
        const actie = el('div', 'afg-actie');
        actie.appendChild(knop('knop-groot afg-kies', b.cta + ' ▸', () => kies(it)));
        actie.appendChild(el('span', 'afg-tweede', isMobiel() ? b.tweede.mobiel : b.tweede.laptop));
        info.appendChild(actie);
      }
      tekenInfo(null);
      /* R2: uit de val — het kooltje van de lift zweeft naar zijn plek tussen de maskers, en
         de Afgrond doemt eromheen op (rustig: meteen op zijn plek, zonder vlucht) */
      if (van && typeof van.x === 'number' && isFinite(van.x) && isFinite(van.y) && !rustig()) {
        vak.classList.add('uit-val');
        try {
          const kr = kern.getBoundingClientRect();
          const dx = van.x - (kr.left + kr.width / 2), dy = van.y - (kr.top + kr.height / 2);
          if (kool.animate && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
            kool.animate([{ transform: 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px)' }, { transform: 'translate(0px, 0px)' }],
              { duration: 650, easing: 'cubic-bezier(.3, 0, .2, 1)' });
          }
        } catch (e) { /* geen vlucht: het kooltje staat gewoon op zijn plek */ }
      }

      function kies(it) {
        if (gekozen || !actief || klaarGeroepen) return;
        const klikT = performance.now();
        gekozen = true; sleutels = null; spoel = null;
        if (gepeld !== it) { gepeld = it; items.forEach(x => x.btn.classList.toggle('gepeld', x === it)); }
        if (AU) AU.plunge();
        P.choices.held = it.heldId; P.choices.masker = it.m.id;
        if (!P.choices.val) P.choices.val = 'geduwd';
        bewaar();
        const contract = schrijfContract({ held: it.heldId, masker: it.m.id, uitweg: uitwegVan(P.choices.val) || 'geduwd',
          jeugddroom: P.choices.jeugddroom || null, glimlachen: P.choices.glimlachen || 0, fotoKantoor: !!P.choices.fotoKantoor });
        const kr = kern.getBoundingClientRect();
        const kooltje = { x: Math.round(kr.left + kr.width / 2), y: Math.round(kr.top + kr.height / 2), maat: Math.round(kr.width) || 8 };
        const uitkomst = { held: it.heldId, masker: it.m.id, kooltje, contract: herbeleef ? null : contract };

        const zacht = rustig();
        vak.classList.add('gekozen');
        if (zacht) vak.classList.add('zacht');
        app.classList.add('pl-landt');
        it.btn.classList.add('uitverkoren');
        const ci = items.indexOf(it);
        items.forEach((x, i) => { if (x !== it) x.btn.classList.add(i < ci ? 'valt-links' : 'valt-rechts'); });
        /* het gekozen token: krimpen tot token (0-0,9 s), dan zinken in het kooltje (0,9-1,5 s).
           F1 (review): klaar() volgt uit het EINDE van de animatie, niet uit een blinde timer.
           De animatie start pas bij haar eerste frame, en op een laptop kost het herstylen van
           de Afgrond bij de klik 100-170 ms: een timer vanaf de klik gaf de sluier dan een token
           van ±65 px op opacity .6 in het naadframe (een 'pop'). Het zinken is ook minder
           achterwaarts geladen, en het token is op 92 % al volledig in het kooltje verdwenen:
           de laatste ±120 ms vóór de overname is het beeld puur zwart met één kooltje. */
        let anim = null;
        if (!zacht && it.schijf.animate) {
          const sr = it.schijf.getBoundingClientRect();
          const dx = kooltje.x - (sr.left + sr.width / 2), dy = kooltje.y - (sr.top + sr.height / 2);
          const w = sr.width || 1;
          const s1 = tokenMaat() / w, s2 = eindMaat() / w;
          const eind = 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px) scale(' + s2.toFixed(3) + ')';
          try {
            anim = it.schijf.animate([
              { transform: 'translate(0px, 0px) scale(1)', opacity: 1, easing: 'cubic-bezier(.3,0,.3,1)' },
              { transform: 'translate(' + (dx * 0.22).toFixed(1) + 'px, ' + (dy * 0.22).toFixed(1) + 'px) scale(' + s1.toFixed(3) + ')', opacity: 1, offset: 0.6, easing: 'cubic-bezier(.45,0,.75,.55)' },
              { transform: eind, opacity: 0, offset: 0.92 },
              { transform: eind, opacity: 0 }
            ], { duration: TOKEN_MS, fill: 'forwards' });
          } catch (e) { anim = null; }
        }
        /* via T(…, 0): een draai-blok of een verborgen tab houdt de overname nog altijd vast */
        const naarKlaar = () => T(() => klaarMet(uitkomst), 0);
        if (anim && anim.finished && anim.finished.then) {
          /* de startvertraging inhalen: speel de rest iets sneller (hoogstens 1,5x), zodat het
             einde — en dus de overname — toch op T 1,5 na de klik valt, zoals plan §3 wil */
          if (anim.ready && anim.updatePlaybackRate) anim.ready.then(() => {
            /* currentTime en 'nu' op dezelfde klok: de frametijd van de tijdlijn (die kan na een
               zwaar frame ver achter performance.now() liggen — dan was de inhaalslag te groot) */
            const tl = document.timeline && typeof document.timeline.currentTime === 'number' ? document.timeline.currentTime : performance.now();
            const rest = TOKEN_MS - (+anim.currentTime || 0);
            const beschikbaar = klikT + TOKEN_MS - tl;
            if (rest > 0 && beschikbaar > 0 && rest > beschikbaar + 20) anim.updatePlaybackRate(Math.min(1.5, rest / beschikbaar));
          }).catch(() => { /* geannuleerd: dan geen inhaalslag */ });
          anim.finished.then(naarKlaar, naarKlaar);
          T(() => klaarMet(uitkomst), TOKEN_MS + 400);   /* vangnet (klaarMet is idempotent) */
        } else {
          T(() => klaarMet(uitkomst), zacht ? 900 : TOKEN_MS);
        }
      }

      /* toetsen: ←/→ pelt het buurmasker, Enter (op de gefocuste knop) kiest */
      sleutels = e => {
        if (gekozen) return false;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          const i = gepeld ? items.indexOf(gepeld) : (e.key === 'ArrowLeft' ? items.length : -1);
          const n = Math.max(0, Math.min(items.length - 1, i + (e.key === 'ArrowLeft' ? -1 : 1)));
          pel(items[n]);
          try { items[n].btn.focus({ preventScroll: true }); } catch (x) {}
          return true;
        }
        return false;
      };
    }
  }

  /* ---------- masker → held, heldinfo uit het spel (met terugval) ---------- */
  function heldVoorMasker(id) {
    const h = STORY.HELD_MAP && STORY.HELD_MAP[id];
    return (h && STORY.HELDEN[h]) ? h : 'slachter';
  }
  const RGB = /^\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*$/;
  function kaartNaam(id) {
    try { if (typeof KAARTEN !== 'undefined' && KAARTEN && KAARTEN[id] && KAARTEN[id].naam) return String(KAARTEN[id].naam); } catch (e) {}
    const s = String(id || '').replace(/_/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function heldInfo(id) {
    const F = STORY.HELDEN[id] || STORY.HELDEN.slachter;
    let G = null;
    try { G = (window.SPELERS && window.SPELERS[id]) || null; } catch (e) { G = null; }
    const kleur = (G && typeof G.kleur === 'string' && RGB.test(G.kleur)) ? G.kleur : F.kleur;
    const hp = (G && isFinite(+G.hp) && +G.hp > 0) ? +G.hp : F.hp;
    let kaarten = F.start;
    if (G && Array.isArray(G.dek) && G.dek.length) {
      const tel = new Map();
      G.dek.forEach(k => tel.set(k, (tel.get(k) || 0) + 1));
      kaarten = [...tel].map(([k, n]) => kaartNaam(k) + (n > 1 ? ' ×' + n : ''));
    }
    return {
      naam: (G && typeof G.naam === 'string' && G.naam) || F.naam,
      stijl: (G && typeof G.stijl === 'string' && G.stijl) || F.stijl,
      hp, kleur, kaarten,
      art: (G && typeof G.art === 'string' && G.art) ? (STORY.BASE || '') + 'assets/karakters/' + G.art + '.webp' : F.art,
      ph: (G && G.icoon) || F.ph
    };
  }
  /* F1 (creatief): de art van de Afgrond (maskers, helden, de afgrond) alvast binnenhalen en
     decoderen — tijdens de val, of zodra de skip kan. Anders staan de maskerschijven bij het
     binnenkomen ±150 ms leeg (gemeten op 412x915). Eén keer per pagina. */
  let afgrondVoorgeladen = null;
  function laadAfgrondVoor() {
    if (afgrondVoorgeladen) return;
    afgrondVoorgeladen = [];
    const bronnen = [];
    try {
      const sc = STORY.scenes[IDX.breekpunt];
      const b = sc && sc.breekpunt;
      if (b && b.afgrondArt) bronnen.push(b.afgrondArt);
      (STORY.MASKERS || []).forEach(m => {
        if (m.masker && m.masker.src) bronnen.push(m.masker.src);
        const h = heldInfo(heldVoorMasker(m.id));
        if (h && h.art) bronnen.push(h.art);
      });
    } catch (e) { return; }
    bronnen.forEach(src => {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
      if (img.decode) img.decode().catch(() => { /* de <img> in de Afgrond heeft een eigen terugval */ });
      afgrondVoorgeladen.push(img);
    });
  }
  function kortLiggend() { return innerHeight <= 560 && innerWidth > innerHeight; }
  function tokenMaat() { return kortLiggend() ? 72 : innerWidth < 700 ? 64 : 104; }
  function eindMaat() { return (kortLiggend() || innerWidth < 700 || isMobiel()) ? 4 : 8; }

  /* ---------- de overdracht ---------- */
  function klaarMet(uitkomst) {
    if (klaarGeroepen || !actief) return;
    klaarGeroepen = true;
    houdSkipStop();
    if (overgeslagen && !herbeleef) schrijf(OVER, '1');   /* de skip telt pas als je landt */
    const f = opts.klaar;
    if (typeof f === 'function') { try { f(uitkomst); } catch (e) { meldFout(e); } }
  }
  /* noodlanding: de Afgrond zelf brak — land met wat we weten, in het midden */
  function noodKlaar() {
    const held = (P && P.choices.held && STORY.HELDEN[P.choices.held]) ? P.choices.held : 'slachter';
    const masker = Object.keys(STORY.HELD_MAP).find(k => STORY.HELD_MAP[k] === held) || 'woede';
    if (!P.choices.val) P.choices.val = 'geduwd';
    const contract = schrijfContract({ held, masker, uitweg: uitwegVan(P.choices.val), jeugddroom: P.choices.jeugddroom || null });
    klaarMet({ held, masker, kooltje: { x: Math.round(innerWidth / 2), y: Math.round(innerHeight * 0.58), maat: 8 }, contract: herbeleef ? null : contract });
  }

  const SCENES = {
    overzicht: sceneOverzicht, boot: sceneBoot, kantoor: sceneKantoor,
    gesprek: sceneGesprek, breekpunt: sceneBreekpunt
  };

  /* ---------- de shadow root ---------- */
  function maakRoot() {
    try { R = host.shadowRoot || host.attachShadow({ mode: 'open' }); } catch (e) { R = host.shadowRoot || null; }
    if (!R) return false;
    let link = R.querySelector('link[data-pl-css]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = CSS_PAD;
      link.setAttribute('data-pl-css', '');
      link.addEventListener('load', () => { cssGeladen = true; toonApp(); });
      link.addEventListener('error', () => { cssGeladen = true; toonApp(); });
      R.appendChild(link);
    }
    app = R.getElementById('pl-app');
    if (!app) {
      app = el('div', 'pl-app');
      app.id = 'pl-app';
      /* vangnet vóór de css binnen is: zwart en schermvullend, nooit het spel erdoor */
      app.style.cssText = 'position:fixed;inset:0;background:#0a0e08;overflow:hidden;';
      R.appendChild(app);
    }
    app.innerHTML = '';
    app.className = 'pl-app';
    wrap = el('div', 'scene'); wrap.id = 'scene';
    app.appendChild(wrap);
    ['crt-scanlines', 'crt-glow', 'crt-vignette'].forEach(id => { const l = el('div', 'crt-laag'); l.id = id; l.setAttribute('aria-hidden', 'true'); app.appendChild(l); });
    hintEl = el('div', 'pl-hint'); hintEl.setAttribute('aria-hidden', 'true');
    app.appendChild(hintEl);
    skipEl = el('button', 'pl-skip');
    skipEl.type = 'button';
    skipEl.setAttribute('aria-label', 'Houd vast om de proloog over te slaan');
    skipEl.innerHTML = '<svg viewBox="0 0 36 36" aria-hidden="true"><circle class="pl-skip-spoor" cx="18" cy="18" r="15"/><circle class="pl-skip-vul" cx="18" cy="18" r="15"/></svg><span class="pl-skip-pijl" aria-hidden="true">⏭</span>';
    skipEl.appendChild(el('span', 'pl-skip-tekst', isMobiel() ? 'houd vast · overslaan' : 'houd Esc · overslaan'));
    app.appendChild(skipEl);
    /* F1 (review): de klankknop. De topbalk (met ⚙️ Instellingen) is hier verborgen en de oude
       nav met zijn 🔇 is weg; zonder deze knop kon je ±2 min brom, typmachine en hartslag
       alleen met het toestelvolume stilzetten. Hij schakelt de game-mute (Klank.vol.aan). */
    klankEl = el('button', 'pl-klank');
    klankEl.type = 'button';
    klankEl.appendChild(el('span', 'pl-klank-icoon'));
    if (!isMobiel()) klankEl.title = 'Geluid aan/uit (M)';
    app.appendChild(klankEl);
    tekenKlank();
    return true;
  }
  /* ---------- de klankknop: de game-mute, gesynchroniseerd met ⚙️ Instellingen ---------- */
  function klankAan() {
    try { return !(window.Klank && Klank.vol && Klank.vol.aan === false); } catch (e) { return true; }
  }
  function tekenKlank() {
    if (!klankEl) return;
    const aan = klankAan();
    klankEl.classList.toggle('uit', !aan);
    klankEl.setAttribute('aria-pressed', aan ? 'false' : 'true');
    klankEl.setAttribute('aria-label', aan ? 'Geluid dempen' : 'Geluid weer aan');
    const i = klankEl.querySelector('.pl-klank-icoon');
    if (i) i.textContent = aan ? '🔊' : '🔇';
  }
  function wisselKlank() {
    const K = window.Klank;
    if (!K || typeof K.zet !== 'function') return;
    try { K.zet('aan', !klankAan()); } catch (e) { meldFout(e); }
    const cb = document.getElementById('inst-geluid');
    if (cb) cb.checked = klankAan();
    if (klankAan() && AU) AU.unlock();   /* weer aan: meteen hoorbaar, ook als de context sliep */
    tekenKlank();
  }
  function toonApp() {
    [wrap, skipEl, hintEl, klankEl].forEach(e => { if (e) e.style.visibility = ''; });
  }
  function spiegelModus() {
    if (!host) return;
    const m = (document.body && document.body.dataset.modus === 'mobiel') || (!document.body.dataset.modus && window.mobiel) ? 'mobiel' : 'laptop';
    host.setAttribute('data-modus', m);
    /* de prestatiemodus: :host([data-lite]) zet de CRT-flikker en de andere lussen stil */
    host.toggleAttribute('data-lite', !!(document.body && document.body.classList.contains('lite')));
  }

  /* ---------- levenscyclus ---------- */
  function zetHoofdstuk(h) {
    if (typeof h === 'number' && isFinite(h)) { P.scene = klemScene(h); P.checkpoint = P.scene === IDX.breekpunt ? 'factuur' : 'start'; }
    else if (FASEN.indexOf(h) !== -1) { P.scene = IDX.breekpunt; P.checkpoint = h; }
    else if (typeof h === 'string' && IDX[h] != null) { P.scene = IDX[h]; P.checkpoint = P.scene === IDX.breekpunt ? 'factuur' : 'start'; }
    if (P.gezien.indexOf(P.scene) === -1) P.gezien.push(P.scene);
  }
  function luister(doel, type, fn, o) {
    doel.addEventListener(type, fn, o);
    opruimers.push(() => doel.removeEventListener(type, fn, o));
  }
  function opToets(e) {
    if (!actief) return;
    const bron = (e.composedPath && e.composedPath()[0]) || e.target;
    const tag = bron && bron.tagName;
    if (e.key === 'Escape') {
      if (!e.repeat) houdSkipStart();
      return;
    }
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (bron && bron.isContentEditable)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'm' || e.key === 'M') { e.preventDefault(); if (!e.repeat) wisselKlank(); return; }   /* M = geluid aan/uit */
    if (sleutels && sleutels(e)) { e.preventDefault(); return; }
    if (e.repeat) return;
    if (tag === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;   /* de knop zelf klikt */
    if (['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Escape'].indexOf(e.key) !== -1) return;
    if (spoel) { e.preventDefault(); doorspoelen(); }
  }
  function opToetsOp(e) { if (e.key === 'Escape') houdSkipStop(); }

  function start(o) {
    o = o || {};
    if (actief) stop();
    host = o.host || document.getElementById('scherm-proloog');
    if (!host) return false;
    opts = o;
    herbeleef = !!o.herbeleef;
    klaarGeroepen = false; overgeslagen = false; glimOpen = 0; spoel = null; sleutels = null; hintGezien = {}; wachtAan = false;
    spiegelModus();
    if (!maakRoot()) return false;
    actief = true;
    if (!cssGeladen) {
      /* tot de css binnen is: alleen het zwarte vlak (anders flitst de skip ongestyled op) */
      [wrap, skipEl, hintEl, klankEl].forEach(e => { e.style.visibility = 'hidden'; });
      T(toonApp, 2500, 'sessie');   /* vangnet: nooit langer dan 2,5 s op de css wachten */
    }

    if (herbeleef) {
      /* alleen in het geheugen: geen save, geen contract; het contract mag wel
         voorlezen (jeugddroom en uitweg van toen) */
      P = nieuweStaat();
      const c = leesJSON(CONTRACT);
      if (c && typeof c === 'object') {
        if (typeof c.jeugddroom === 'string' && c.jeugddroom.trim()) P.choices.jeugddroom = c.jeugddroom.trim().slice(0, 60);
        if (c.uitweg === 'sprong') P.choices.val = 'gesprongen';
        else if (c.uitweg === 'geduwd') P.choices.val = 'geduwd';
      }
      contractVers = false;
    } else {
      P = laadSave();
      wis(SAVE_OUD);
      contractVers = isVers(P);
    }
    if (o.hoofdstuk != null) zetHoofdstuk(o.hoofdstuk);
    bewaar();

    luister(window, 'keydown', opToets);
    luister(window, 'keyup', opToetsOp);
    luister(window, 'blur', houdSkipStop);
    luister(document, 'visibilitychange', evalueerPauze);
    luister(app, 'pointerdown', () => { if (AU) AU.unlock(); }, { passive: true });
    /* nooit iets verschoven: een focus of een klavier dat een overflow:hidden-vak laat
       scrollen, zetten we meteen terug op 0 (scroll bubbelt niet, capture ziet hem wel) */
    luister(app, 'scroll', e => {
      const d = e.target;
      if (d && d !== document && (d.scrollTop || d.scrollLeft)) { d.scrollTop = 0; d.scrollLeft = 0; }
    }, true);
    luister(app, 'click', e => {
      if (!spoel) return;
      const t = e.target;
      if (t && t.closest && t.closest('button, input, a')) return;
      doorspoelen();
    });
    /* de skip: vasthouden (pointer) — loslaten of wegglijden breekt af */
    luister(skipEl, 'pointerdown', e => {
      e.preventDefault();
      try { skipEl.setPointerCapture(e.pointerId); } catch (x) {}
      houdSkipStart();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => luister(skipEl, t, houdSkipStop));
    luister(skipEl, 'contextmenu', e => e.preventDefault());
    luister(skipEl, 'click', e => e.stopPropagation());
    /* de klankknop: stopPropagation, anders spoelt dezelfde tik ook de scène door */
    luister(klankEl, 'click', e => { e.stopPropagation(); wisselKlank(); });
    if (window.MutationObserver) {
      const db = document.getElementById('draai-blok');
      if (db) { const mo = new MutationObserver(evalueerPauze); mo.observe(db, { attributes: true, attributeFilter: ['class'] }); opruimers.push(() => mo.disconnect()); }
      if (document.body) { const mb = new MutationObserver(spiegelModus); mb.observe(document.body, { attributes: true, attributeFilter: ['data-modus', 'class'] }); opruimers.push(() => mb.disconnect()); }
    }

    render();
    /* de skip verschijnt; vanaf nu kan de Afgrond elk moment komen → haar art alvast laden */
    T(() => { if (skipEl && magSkippen()) skipEl.classList.add('zichtbaar'); laadAfgrondVoor(); }, SKIP_ZICHTBAAR_MS, 'sessie');
    evalueerPauze();
    return true;
  }

  function stop() {
    const wasActief = actief;
    actief = false;
    houdSkipStop();
    wisAlleT();
    klok.pauze = false;
    opruimers.splice(0).forEach(f => { try { f(); } catch (e) {} });
    stopCamera();
    stopVal();
    wachtUit();
    objectUrls.forEach(u => { try { URL.revokeObjectURL(u); } catch (e) {} });
    objectUrls.clear();
    if (AU && AU.stilte) { try { AU.stilte(); } catch (e) {} }
    spoel = null; sleutels = null;
    if (app) { app.innerHTML = ''; app.className = 'pl-app'; delete app.dataset.scene; delete app.dataset.fase; }
    if (host) { delete host.dataset.plScene; }
    wrap = null; skipEl = null; hintEl = null; klankEl = null;
    return wasActief;
  }

  window.Proloog = {
    start, stop, slaOver,
    get actief() { return actief; },
    hoofdstukken: (STORY.HOOFDSTUKKEN || []).slice(),
    HELD_MAP: Object.assign({}, STORY.HELD_MAP)
  };
})();
