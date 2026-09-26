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
   wachtStop in de Afgrond. Fixer R2: de pauze (tab verborgen, draai-blok) houdt ook de
   wachtmuziek en de lift-brom vast (klank('pauzeer')), de brom loopt van 'vertrek' tot 'tl',
   en stilteWeg heft een lopende stilte op (Afgrond, stop, doorgespoeld tot het kooltje).

   R3 "HET KANTOOR ALS FILM": scènes 0-2 zijn geen beat-machine meer maar een film met één
   handeling per beat (inklokken aan de prikklok, de CRT degausst, het Glimlachquotum aan
   één bureau, de Zingevingsaudit, Karel, de oproep, de lift omhoog). De rest is regie die
   je met een tik versnelt. Checkpoints in het bureau: 'start', 'glimlach', 'audit' en
   'oproep' (met meterstand en glimCp). regen(aan) en zoem(aan) sturen de lussen van K
   (ProloogKlank.regen/kantoor); ze gaan uit bij het verlaten van scène 2 en in stop().

   R4 "GESPREK EN AFREKENING": scène 3 is een beige kopie van het ECHTE gevechtstoneel (de indeling
   van #scherm-gevecht) op het dak in onweer — 0042 als naamkaart op een lege bureaustoel, B.A.A.S.
   met AANDEELHOUDERSWAARDE ∞ en een intentiepil, de energiebol, de trekstapel, de borstzak met de
   foto, een waaier van vijf kantoorkaarten en 'Eindig beurt'. De uitweg (scène 4) speelt in hetzelfde
   decor: de foto vasthouden (touch/muis: vasthouden of een tweede tik; laptop: spatie vasthouden) of
   geduwd worden door de OPTIMALISATIERONDE. De Eindafrekening (scène 5) is een matrixprinter met een
   kettingvel vol eigen cijfers, een vastloper en na de perforatie het BESLUIT (checkpoint 'ontslag'). */
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
  let sleutelsOp = null;   /* R4: scène-eigen keyup (de foto vasthouden met spatie) → true als verwerkt */
  let houd = null;         /* lopende vasthoud-skip */
  let houdT0 = 0;          /* wanneer het vasthouden begon (performance.now) */
  let cam = null;          /* { stream } van de pasfoto-camera */
  let cssGeladen = false;
  let hintGezien = {};
  let val = null;          /* R2: de lopende val (window.ProloogVal-handle) */
  let wachtAan = false;    /* R2: loopt de wachtmuziek (sinds de oproep)? */
  let kijkStil = false;    /* R4: de wachtmuziek zwijgt terwijl je naar de foto kijkt (sprong) */
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
    if (typeof c.zelfGestempeld === 'boolean') u.zelfGestempeld = c.zelfGestempeld;
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
    klank('pauzeer', aan || kijkStil);   /* fixer R2: de klok staat stil, dus de wachtmuziek en de lift-brom ook (R4: en tijdens de foto blijft ze stil) */
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
    return true;   /* R3: er was een klank met die naam (zoem() valt anders terug op de oude brom) */
  }
  /* R3: de lussen van het kantoor (bouwer K): regen op glas en de kantoorzoem/tl-brom onder
     scènes 0-2. Ontbreekt die lus, dan brommen we met de oude hum van audio.js. */
  let regenAan = false, zoemAan = false;
  function regen(aan) { aan = !!aan; if (aan === regenAan) return; regenAan = aan; klank('regen', aan); }
  function zoem(aan, extra) {
    aan = !!aan;
    if (aan === zoemAan && !extra) return;
    zoemAan = aan;
    if (klank('kantoor', aan, extra)) { if (AU) AU.humOff(); }
    else if (AU) { if (aan) AU.humOn(); else AU.humOff(); }
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
  /* art met terugval: img, en bij een laadfout een placeholder-span (emoji/label).
     Fixer R3 F1: met terug(houder) tekent de laadfout de eigen terugval (bv. het silhouet van
     een collega) in plaats van het puntje — ook als het manifest een plaat belooft die er
     (nog) niet is. terug geeft true als hij iets tekende. */
  function art(src, ph, cls, terug) {
    const houder = el('span', cls || 'art-houder');
    const val = () => {
      if (typeof terug === 'function') { try { if (terug(houder)) return; } catch (e) { meldFout(e); } }
      houder.appendChild(el('span', 'art-ph', ph || '·'));
    };
    if (src) {
      const img = document.createElement('img');
      img.src = src; img.alt = ''; img.draggable = false; img.className = 'art-img'; img.decoding = 'async';
      img.onerror = function () { img.remove(); val(); houder.classList.add('art-terug'); };
      houder.appendChild(img);
    } else {
      val();
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
      if (tikken && tekst[n - 1] !== ' ' && n % 2 === 0) klank('sfx', 'type');
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
  /* Fixer R3 F1 · de tikgrens. Een regie die direct op een handeling volgt, laat zich pas na haar
     'aanslag' doorspoelen (zoals de 450 ms van de scheur): de tweede tik van een gewone dubbeltik
     (2 tikken, ±130 ms) spoelt zo nooit het antwoord op je eigen handeling weg (KA-TSJONK, de
     afdruk van je stempel, de eerste liftbel, de zin bij de foto) en kiest nooit iets voor je
     (de STEMPEL die onder je vinger verschijnt). Tot dan doet een tik niets. nogGeldig() (optioneel)
     zegt of de regie nog loopt: zo zet een late timer nooit een spoel van een vorige fase. */
  function spoelNa(fn, ms, nogGeldig) {
    spoel = null;
    return T(() => { if (spoel === null && (!nogGeldig || nogGeldig())) spoel = fn; }, ms == null ? 450 : ms);
  }
  function toonHint(sleutel) {
    if (!hintEl || hintGezien[sleutel]) return;
    hintGezien[sleutel] = true;
    hintEl.textContent = isMobiel() ? 'TIK = DOORSPOELEN' : 'ELKE TOETS = DOORSPOELEN';
    hintEl.classList.add('toon');
    T(() => { if (hintEl) hintEl.classList.remove('toon'); }, 3000, 'sessie');
  }
  /* Fixer R3 F1: zodra er in het bureau een handeling verschijnt (de knop op de plek van de
     hint), maakt de hint plaats — hij gaat over doorspoelen, niet over de knop */
  function hintWeg() { if (hintEl) hintEl.classList.remove('toon'); }

  /* ---------- de vasthoud-skip ---------- */
  function inAfgrond() { return !!(P && P.scene === IDX.breekpunt && P.checkpoint === 'afgrond'); }
  function magSkippen() { return actief && !klaarGeroepen && !inAfgrond(); }
  function houdSkipStart() {
    if (houd || !magSkippen() || !skipEl) return;
    skipEl.classList.add('zichtbaar', 'vult');
    houdT0 = performance.now();
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
    /* integrator R3: wie lang genoeg vasthield, slaat over, ook als de timer nog niet vuurde. De
       browser behandelt invoer vóór timers: op een haperend toestel kwam het loslaten na 0,95 s
       soms vóór de timer van 0,8 s, en dan brak het vasthouden af. Kort blijft kort. */
    if (performance.now() - houdT0 >= SKIP_HOUD_MS) slaOver();
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
      glimlachen: P.choices.glimlachen || 0, fotoKantoor: !!P.choices.fotoKantoor, zelfGestempeld: !!P.choices.zelfGestempeld });
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
    spoel = null; sleutels = null; sleutelsOp = null;
    stopCamera();
    stopVal();
    stopLucht();
    if (kijkStil) { kijkStil = false; klank('pauzeer', klok.pauze); }   /* R4: wie tijdens de foto overslaat, hoort de Afgrond */
    if (AU) { AU.heartStop(); AU.noiseOff(); AU.droneOff(); }
    const scene = STORY.scenes[P.scene];
    if (scene.kind === 'gesprek') zorgWacht();   /* R2: in de wacht, al sinds de oproep */
    /* R3: regen en kantoorzoem horen alleen bij scènes 0-2 (de scène zet ze zelf aan) */
    const kantoorScene = scene.kind === 'overzicht' || scene.kind === 'boot' || scene.kind === 'kantoor';
    if (!kantoorScene) { regen(false); zoem(false); }
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
    if (AU && !kantoorScene) {
      if (scene.kind === 'gesprek') AU.humOn();
      else AU.humOff();
    }
  }
  function ga(n, checkpoint) {
    if (n < 0 || n >= AANTAL) return;
    P.scene = n; P.checkpoint = checkpoint || 'start';
    bewaar(); render();
  }
  function verder() { ga(P.scene + 1); }

  /* ═══════════════ R3 · HET KANTOOR ALS FILM (scènes 0-2) ═══════════════
     Eén handeling per beat; al de rest is regie die een tik versnelt (spoel). Geen
     beat-machine meer: elke scène is een kleine staatmachine op de T()-klok (pauzeert
     bij een verborgen tab en het draai-blok). De klank komt van bouwer K, altijd via
     klank(): sfx-namen tlStarter, tlAan, tlBank(rij), prikklok, glimlach(n[, 'opDeTel']),
     naald, scheur, gemarkeerd, stempelZelf, stempelMachine, buizenpost, tlKlakUit,
     tlDooft(rij), liftDing(verdieping), toets; en de lussen regen(aan) en kantoor(aan). */

  /* een regiereeks: momenten na elkaar; één tik = één moment verder (wat nog typt, staat
     er meteen helemaal), zoals de val (één tik = één mijlpaal) */
  function reeks(stappen, klaar) {
    let i = 0, tid = null, af = false, lopend = null;
    function volgende() {
      if (af || !actief) return;
      if (lopend && lopend.rond) lopend.rond();
      lopend = null;
      if (i >= stappen.length) {
        af = true;
        if (spoel === spoelHier) spoel = null;
        if (klaar) klaar();
        return;
      }
      const s = stappen[i++];
      lopend = s.doe ? s.doe() : null;
      tid = T(volgende, Math.max(0, s.ms || 0));
    }
    function spoelHier() {
      if (af) return;
      wisT(tid);
      volgende();
      if (!af && !spoel) spoel = spoelHier;
    }
    spoel = spoelHier;
    volgende();
    return { spoel: spoelHier, get af() { return af; } };
  }
  /* de twee frames van de scheur (de echte Act 1-plaat) alvast laden en decoderen: ze staan elk
     maar ±0,2 s in beeld, een koude cache zou ze missen. Eén keer per pagina. */
  let platenVoorgeladen = null;
  function laadPlatenVoor(platen) {
    if (platenVoorgeladen || !Array.isArray(platen)) return;
    platenVoorgeladen = platen.map(src => {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
      if (img.decode) img.decode().catch(() => { /* de scheur heeft een eigen terugval (onerror) */ });
      return img;
    });
  }
  /* de maat van de kantoormuzak: waar in de tel staan we (ms), op de speelklok (pauzeert mee) */
  function telFase(t0, tel) { const d = speelTijd() - t0; return ((d % tel) + tel) % tel; }

  /* ═══════════════ SCÈNE 0 · 06:42, INKLOKKEN ═══════════════
     Regen op glas. Een tl-starter tikt: tik… tik… TING — één tl-bak springt aan boven de
     beige prikklok ('MA 06:42', tijdkaart 0042 in het rek). Sleep of tik de kaart in de
     gleuf (Enter): KA-TSJONK. Dan klakken de tl-rijen bank per bank aan (de tl-golf) en
     onthullen het kantoor; de camera duikt in de terminal die daar al gloeit. */
  function sceneOverzicht(scene, wrap) {
    const k = scene.klok;
    const zacht = rustig();
    let fase = 'donker';     /* donker → aan (de tl brandt) → in (geklokt) → weg */
    const tids = [];
    regen(true);

    const zaal = el('div', 'ik-zaal');
    /* integrator R3: de camera zoomt IN de zaal (de lens), en de zaal clipt. Zo loopt #scene
       tijdens de duik niet over (een scale(6) op een kind van #scene maakte hem scrollbaar).
       Fixer R3 F1: de lens IS de plaat (de maat van object-fit: cover, in px). Staand steekt ze
       links en rechts buiten het scherm: zo bestaat de gloeiende terminal ook daar, en kan de
       camera erheen pannen in plaats van rond een punt buiten beeld te schalen (dat schoof een
       zwarte muur in beeld). */
    /* de zaal clipt ook in de eerste beelden, vóór proloog.css binnen is: de lens heeft dan al haar
       maat in px (staand 1463 breed, liggend 500 hoog) en mocht de app niet laten overlopen */
    zaal.style.cssText = 'position:absolute;inset:0;overflow:hidden;';
    const lens = el('div', 'ik-lens');
    lens.style.position = 'absolute';
    lens.appendChild(art(scene.backdrop.src, '', 'ik-plaat'));
    const donker = el('div', 'ik-donker');
    lens.appendChild(donker);
    lens.appendChild(el('div', 'ik-flits'));
    zaal.appendChild(lens);
    wrap.appendChild(zaal);
    legLens();
    /* draaien tijdens scène 0: de lens volgt (anders dekt een liggende plaat een staand scherm niet) */
    const opResize = () => {
      if (!lens.isConnected) { removeEventListener('resize', opResize); return; }
      if (fase !== 'weg' && !wrap.classList.contains('ik-duik')) legLens();
    };
    addEventListener('resize', opResize);
    const regenEl = el('div', 'ik-regen');
    regenEl.setAttribute('aria-hidden', 'true');
    regenEl.appendChild(el('span', 'ik-regen-a'));
    regenEl.appendChild(el('span', 'ik-regen-b'));
    wrap.appendChild(regenEl);

    /* de post: één tl-bak boven de prikklok, het rek met de tijdkaarten, de badge ernaast */
    const post = el('div', 'ik-post');
    const rij = el('div', 'ik-rij');
    const badge = maakBadge(scene.badge);
    badge.classList.add('ik-badge');
    rij.appendChild(badge);
    const klok = el('div', 'ik-klok');
    const tl = el('div', 'ik-tl');
    tl.appendChild(el('span', 'ik-buis'));
    klok.appendChild(tl);
    klok.appendChild(el('div', 'ik-kegel'));
    const gleuf = el('div', 'ik-gleuf');
    gleuf.appendChild(el('span', 'ik-spleet'));
    const gleufLabel = el('span', 'ik-gleuf-label', k.gleuf + ' ▼');
    if (!isMobiel()) gleufLabel.appendChild(el('kbd', '', '↵'));
    gleuf.appendChild(gleufLabel);
    klok.appendChild(gleuf);
    const venster = el('div', 'ik-venster');
    venster.appendChild(el('span', 'ik-dag', k.dag));
    venster.appendChild(el('span', 'ik-tijd', k.tijd));
    klok.appendChild(venster);
    klok.appendChild(el('div', 'ik-merk', k.merk));
    rij.appendChild(klok);
    const rek = el('div', 'ik-rek');
    for (let i = 0; i < 4; i++) { const r = el('span', 'ik-rekkaart'); r.style.setProperty('--i', i); rek.appendChild(r); }
    const kaart = el('button', 'ik-kaart');
    kaart.type = 'button';
    kaart.dataset.actie = 'kaart';
    kaart.setAttribute('aria-label', 'Tijdkaart ' + k.kaart + ': klok in');
    kaart.appendChild(el('span', 'ik-kaart-nr', k.kaart));
    const rooster = el('span', 'ik-rooster');
    let stempelVak = null;
    (k.dagen || []).forEach((d, i) => {
      const r = el('span', 'ik-dagrij');
      r.appendChild(el('b', '', d));
      const v = el('i', '');
      if (i === 0) stempelVak = v;
      r.appendChild(v);
      rooster.appendChild(r);
    });
    kaart.appendChild(rooster);
    rek.appendChild(kaart);
    rij.appendChild(rek);
    post.appendChild(rij);
    wrap.appendChild(post);

    /* tik… tik… TING: de starter, dan brandt de tl boven de klok */
    function starter() {
      if (fase !== 'donker') return;
      wrap.classList.add('ik-tik');
      klank('sfx', 'tlStarter');
      tids.push(T(() => wrap.classList.remove('ik-tik'), 90));
    }
    function ting() {
      if (fase !== 'donker') return;
      fase = 'aan';
      tids.forEach(wisT);
      wrap.classList.remove('ik-tik');
      wrap.classList.add('ik-aan');
      klank('sfx', 'tlAan');
      zoem(true);
      spoel = null;
      focusStil(kaart);
    }
    tids.push(T(starter, zacht ? 250 : 380));
    tids.push(T(starter, zacht ? 700 : 980));
    tids.push(T(ting, zacht ? 1150 : 1620));
    spoel = ting;   /* een tik in het donker: het licht springt meteen aan */

    /* slepen (pointer) of tikken (klik/Enter): de kaart gaat in de gleuf */
    let sleep = null, verschoven = { dx: 0, dy: 0 }, geenKlikTot = 0;
    kaart.addEventListener('pointerdown', e => {
      if (fase === 'in' || fase === 'weg') return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      try { kaart.setPointerCapture(e.pointerId); } catch (x) {}
      sleep = { id: e.pointerId, x0: e.clientX, y0: e.clientY, bewogen: false };
    });
    kaart.addEventListener('pointermove', e => {
      if (!sleep || e.pointerId !== sleep.id) return;
      const dx = e.clientX - sleep.x0, dy = e.clientY - sleep.y0;
      if (!sleep.bewogen && Math.hypot(dx, dy) > 8) { sleep.bewogen = true; kaart.classList.add('sleept'); if (fase === 'donker') ting(); }
      if (!sleep.bewogen) return;
      verschoven = { dx, dy };
      kaart.style.transform = 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px) rotate(-3deg)';
    });
    const los = e => {
      if (!sleep || (e && e.pointerId !== sleep.id)) return;
      const s = sleep;
      sleep = null;
      kaart.classList.remove('sleept');
      if (!s.bewogen) return;   /* een tik: de klik doet het */
      geenKlikTot = performance.now() + 400;
      const kr = kaart.getBoundingClientRect(), gr = gleuf.getBoundingClientRect();
      const cx = kr.left + kr.width / 2;
      const raak = cx > gr.left - 36 && cx < gr.right + 36 && kr.bottom > gr.top - 30 && kr.top < gr.bottom + 60;
      if (raak) { try { inklokken(); } catch (err) { meldFout(err); redding(); } }
      else { kaart.style.transform = ''; verschoven = { dx: 0, dy: 0 }; }   /* terug in het rek */
    };
    kaart.addEventListener('pointerup', los);
    kaart.addEventListener('pointercancel', () => { if (!sleep) return; sleep = null; kaart.classList.remove('sleept'); kaart.style.transform = ''; verschoven = { dx: 0, dy: 0 }; });
    kaart.addEventListener('click', e => {
      e.stopPropagation();
      if (performance.now() < geenKlikTot) return;
      try { inklokken(); } catch (err) { meldFout(err); redding(); }
    });
    sleutels = e => {
      if (e.key !== 'Enter' && e.key !== ' ') return false;
      /* Fixer R3 F1: staat de focus op een ANDERE knop (de pasfoto, de klankknop, de skip), dan
         klikt die knop zelf — Enter op de pasfoto start de camera, niet het inklokken */
      const bron = (e.composedPath && e.composedPath()[0]) || e.target;
      if (bron && bron.tagName === 'BUTTON' && bron !== kaart) return false;
      if (!e.repeat) { try { inklokken(); } catch (err) { meldFout(err); redding(); } }
      return true;
    };

    function inklokken() {
      if (fase === 'in' || fase === 'weg' || !actief) return;
      if (fase === 'donker') ting();
      fase = 'in';
      spoel = null; sleutels = null;
      stopCamera();
      /* de kaart glijdt boven de gleuf, zakt erin (de onderkant verdwijnt in de klok), KA-TSJONK,
         en komt een stukje terug met de tijd erop */
      const kr = kaart.getBoundingClientRect(), gr = gleuf.getBoundingClientRect();
      const w = kaart.offsetWidth || kr.width, h = kaart.offsetHeight || kr.height;
      const baseL = kr.left + kr.width / 2 - verschoven.dx - w / 2, baseT = kr.top + kr.height / 2 - verschoven.dy - h / 2;
      const tx = gr.left + gr.width / 2 - (baseL + w / 2);
      const ty = gr.top + gr.height / 2 - (baseT + h);
      const tf = (x, y, r) => 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px) rotate(' + r + 'deg)';
      kaart.classList.add('in');
      kaart.disabled = true;   /* geklokt: de kaart is geen handeling meer */
      let anim = null;
      if (!zacht && kaart.animate) {
        try {
          anim = kaart.animate([
            { transform: tf(verschoven.dx, verschoven.dy, verschoven.dx ? -3 : 0), clipPath: 'inset(0 0 0 0)' },
            { transform: tf(tx, ty, 0), clipPath: 'inset(0 0 0 0)', offset: 0.55 },
            { transform: tf(tx, ty + h * 0.62, 0), clipPath: 'inset(0 0 62% 0)' }
          ], { duration: 380, easing: 'cubic-bezier(.3, 0, .4, 1)', fill: 'forwards' });
        } catch (x) { anim = null; }
      }
      if (!anim) { kaart.style.transform = tf(tx, ty + h * 0.62, 0); kaart.style.clipPath = 'inset(0 0 62% 0)'; }
      T(() => {
        /* KA-TSJONK — hetzelfde stempelgeluid als het ontslag straks */
        klank('sfx', 'prikklok');
        klok.classList.add('tsjonk');
        if (stempelVak) stempelVak.textContent = k.tijd;
        if (!zacht && kaart.animate) {
          try { kaart.animate([{ transform: tf(tx, ty + h * 0.62, 0), clipPath: 'inset(0 0 62% 0)' }, { transform: tf(tx, ty + h * 0.34, 0), clipPath: 'inset(0 0 34% 0)' }], { duration: 220, delay: 90, easing: 'ease-out', fill: 'forwards' }); } catch (x) {}
        } else { kaart.style.transform = tf(tx, ty + h * 0.34, 0); kaart.style.clipPath = 'inset(0 0 34% 0)'; }
        T(golf, zacht ? 120 : 320);
        /* vanaf hier is het regie: een tik = naar de CRT. Fixer R3 F1: pas NA de dreun (de tikgrens) —
           de tweede tik van een dubbeltik op de kaart slikte anders KA-TSJONK en de hele tl-golf in */
        spoelNa(weg, zacht ? 150 : 60, () => fase === 'in');
      }, zacht ? 60 : 390);
    }

    /* de tl-golf: bank per bank, van voor naar achter; het donker krimpt naar het
       verdwijnpunt van de plaat (rijen op de plaat: scene.banken) */
    function golf() {
      if (fase !== 'in') return;
      const banken = scene.banken || [];
      const g = legLens();
      let i = 0;
      const stap = () => {
        if (fase !== 'in') return;
        if (i >= banken.length) {
          donker.style.setProperty('--ry', '0px'); donker.style.setProperty('--rx', '0px');
          wrap.classList.add('ik-licht');
          T(duik, zacht ? 150 : 260);
          return;
        }
        const d = Math.max(0, (g.vy - banken[i]) * g.h);   /* de afstand van deze rij tot de horizon, in px */
        donker.style.setProperty('--ry', (d * 1.05).toFixed(0) + 'px');
        donker.style.setProperty('--rx', (d * 2.5).toFixed(0) + 'px');
        if (!zacht) { zaal.classList.remove('bankflits'); void zaal.offsetWidth; zaal.classList.add('bankflits'); }
        klank('sfx', 'tlBank', i);
        i++;
        T(stap, zacht ? 80 : 140);
      };
      donker.style.setProperty('--vx', g.px.toFixed(0) + 'px');
      donker.style.setProperty('--vy', g.py.toFixed(0) + 'px');
      wrap.classList.add('ik-golf');
      stap();
    }
    /* de plaat (object-fit: cover): de maat en plaats van de lens in schermpx, en IN de lens het
       verdwijnpunt (px, py) en de terminal die gloeit (dx, dy) */
    function plaatGeo() {
      const W = zaal.clientWidth || (app && app.clientWidth) || innerWidth;
      const H = zaal.clientHeight || (app && app.clientHeight) || innerHeight;
      const s = Math.max(W / 1586, H / 992), iw = 1586 * s, ih = 992 * s;
      const ox = (W - iw) / 2, oy = (H - ih) / 2;
      const vy = 0.385;
      return { W, H, iw, ih, ox, oy, h: ih, vy, px: 0.505 * iw, py: vy * ih,
        dx: (scene.duik ? scene.duik.x : 0.72) * iw, dy: (scene.duik ? scene.duik.y : 0.42) * ih };
    }
    function legLens() {
      const g = plaatGeo();
      lens.style.left = g.ox.toFixed(1) + 'px'; lens.style.top = g.oy.toFixed(1) + 'px';
      lens.style.width = g.iw.toFixed(1) + 'px'; lens.style.height = g.ih.toFixed(1) + 'px';
      return g;
    }
    /* de camera duikt in de terminal: de CRT degausst (scène 1). Fixer R3 F1: ze schaalt rond de
       terminal ÉN pant hem naar het midden van het scherm, geklemd zodat de lens het scherm altijd
       dekt. Een schaal k rond T plus een pan p is lineair in de voortgang van de overgang: dekt de
       lens het scherm bij het begin (cover) en bij het einde (de klem), dan ook in elk beeld ertussen. */
    const DUIK_K = 6;
    function duik() {
      if (fase !== 'in') return;
      const g = legLens(), k = DUIK_K;
      const tx = g.ox + g.dx, ty = g.oy + g.dy;   /* de terminal in schermpx (staand: rechts buiten beeld) */
      const klem = (p, T, lo, hi, maat) => Math.min(Math.max(p, maat - (T + k * (hi - T))), -(T + k * (lo - T)));
      const panX = klem(g.W / 2 - tx, tx, g.ox, g.ox + g.iw, g.W);
      const panY = klem(g.H / 2 - ty, ty, g.oy, g.oy + g.ih, g.H);
      lens.style.transformOrigin = g.dx.toFixed(1) + 'px ' + g.dy.toFixed(1) + 'px';
      lens.style.setProperty('--pan-x', panX.toFixed(1) + 'px');
      lens.style.setProperty('--pan-y', panY.toFixed(1) + 'px');
      wrap.classList.add('ik-duik');
      T(weg, zacht ? 300 : 700);
    }
    function weg() {
      if (fase === 'weg' || !actief) return;
      fase = 'weg';
      spoel = null;
      removeEventListener('resize', opResize);   /* fixer R3 F1 (hervat): niet wachten op de volgende resize */
      verder();
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

  /* ═══════════════ SCÈNE 1 · DE CRT DEGAUSST ═══════════════
     De camera zit ín de terminal: het merk van De Oprichter (niet SLAY LIT), de jingle
     speelt één maat te lang en eindigt net vals — ze klinkt nog door aan het bureau.
     Regie, geen knop: na scene.duur het bureau; een tik spoelt door. */
  function sceneBoot(scene, wrap) {
    regen(true);
    zoem(true, { lampen: 6 });   /* de tl-golf is voorbij: het kantoor brandt (ook wie in de boot hervat) */
    const b = el('div', 'boot');
    b.appendChild(el('div', 'boot-poweron'));
    const inh = el('div', 'boot-inhoud');
    inh.appendChild(el('div', 'boot-jingle', scene.jingle));
    const merk = el('h1', 'boot-merk', scene.merk);
    merk.appendChild(el('sup', '', '™'));
    inh.appendChild(merk);
    inh.appendChild(el('div', 'boot-tm', scene.tm));
    b.appendChild(inh);
    b.appendChild(el('div', 'boot-version', scene.version));
    wrap.appendChild(b);
    if (AU) AU.unlock();
    klank('sfx', 'degauss');   /* BWOMM: het schaduwmasker zingt even (bouwer K) */
    klank('jingle', { vals: true });   /* R2: de bedrijfsjingle, één maat te lang en net vals */
    let weg = false;
    const door = () => {
      if (weg || !actief) return;
      weg = true; spoel = null;
      wisT(tid);
      ga(IDX.kantoor);
    };
    const tid = T(door, scene.duur || 2600);
    spoel = door;
    toonHint('regie');
  }

  /* ═══════════════ SCÈNE 2 · HET BUREAU ═══════════════
     Eén vast bureaushot: de CRT met B.A.A.S. in groen fosfor, de VU-naald op 78 %, het
     fotolijstje met de rode stippellijn, De Oprichter en Juniors memo op de wand, een
     frietkotmagneet, de collega's als hoofden boven de scheidingswand; onderaan gloeit het
     kooltje in je borstzak. Checkpoints (met meterstand én glimlachteller, glimCp):
       'start'     het bureau (B.A.A.S. zegt drie korte regels)
       'glimlach'  het Glimlachquotum: [ GLIMLACH 0u06 ] — de naald stijgt, de tl wordt
                   feller, het kooltje zwakker, de knop schuift op; bij 3 schuift het quotum
                   op naar 8, bij 4 roept Bart, bij 5 scheurt het beeld (de énige knipoog)
       'audit'     formulier Z-8, zelf afstempelen (of de machine doet het na 6 s), de
                   buizenpost naar het ARCHIEF; Karel, Rudi, Bart en Marleen
       'oproep'    de tl-rijen doven van achter naar voor tot alleen jouw spot overblijft;
                   de wachtmuziek begint; na 2,5 s [ BEVESTIG AANWEZIGHEID ] → de lift omhoog */
  const KANTOOR_CP = ['start', 'glimlach', 'audit', 'oproep'];
  function sceneKantoor(scene, wrap) {
    const S = scene;
    const zacht = rustig();
    const cp = KANTOOR_CP.indexOf(P.checkpoint) !== -1 ? P.checkpoint : 'start';
    /* hervat op een checkpoint: ook de glimlachteller van toen (F1: anders telt een herlaad
       tussen de GLIMLACH-knop en het volgende checkpoint die glimlach dubbel) */
    if (typeof P.choices.glimCp === 'number') P.choices.glimlachen = P.choices.glimCp;
    let meter = (cp !== 'start' && typeof P.choices.meter === 'number') ? P.choices.meter : S.meter.start;
    let n = 0, quotum = S.quotum.start, fase = 'intro', knopGlim = null, knopBevestig = null;
    const t0 = speelTijd();   /* de maat van de kantoormuzak begint bij het bureau */
    const tel = S.tel || 750;
    const typend = new Set();
    regen(true);
    zoem(true, { tel });
    laadPlatenVoor(S.platen);

    const bureau = el('div', 'bureau');
    bureau.dataset.fase = 'quotum';
    bureau.style.setProperty('--tel', tel + 'ms');
    bureau.style.setProperty('--telfase', '-' + Math.round(telFase(t0, tel)) + 'ms');

    /* achter de wand: het kantoor, gedimd, met de tl-rijen (gekocht licht) */
    const kopvak = el('div', 'br-kopvak');
    const achter = el('div', 'br-achter');
    achter.appendChild(art(STORY.SLOTS.kantoor.src, '', 'br-plaat'));
    const rijen = [];
    for (let i = 0; i < 4; i++) { const r = el('span', 'br-rij'); r.style.setProperty('--r', i); achter.appendChild(r); rijen.push(r); }
    kopvak.appendChild(achter);

    /* de collega's als hoofden boven de scheidingswand */
    const hoofden = el('div', 'br-hoofden');
    const team = {};
    /* het silhouet met één attribuut, getekend OP het hoofd-element (de terugval zonder art, én
       als een door het manifest beloofde plaat niet laadt) */
    function silhouet(lid, kop) {
      if (lid.attribuut === 'tl') return true;   /* Karel: alleen zijn buis en zijn stem */
      kop.classList.add('hd-silhouet');
      if (lid.attribuut === 'doos') kop.appendChild(el('span', 'hd-bril'));
      return true;
    }
    (S.team || []).forEach(lid => {
      const h = el('div', 'hoofd hoofd-' + lid.id);
      h.dataset.wie = lid.id;
      h.style.setProperty('--x', lid.x);
      if (lid.attribuut === 'lamp') h.appendChild(el('span', 'hd-lamp'));
      if (lid.attribuut === 'tl') h.appendChild(el('span', 'hd-buis'));
      const beeld = lid.portret || lid.src;
      /* Fixer R3 F1: laadt een plaat niet (404), dan het silhouet, niet het puntje van art() */
      if (beeld) h.appendChild(art(beeld, '', 'hd-kop hd-art', d => { d.classList.remove('hd-art'); return silhouet(lid, d); }));
      else if (lid.attribuut !== 'tl') { const k = el('span', 'hd-kop'); silhouet(lid, k); h.appendChild(k); }
      if (lid.attribuut === 'doos') h.appendChild(el('span', 'hd-doos', 'ARCHIEF'));
      hoofden.appendChild(h);
      team[lid.id] = { lid, h, plaat: null, kegel: null };
    });
    kopvak.appendChild(hoofden);

    /* de scheidingswand, met De Oprichter en Juniors memo, en de naamplaatjes */
    const wand = el('div', 'br-wand');
    (S.team || []).forEach(lid => {
      const t = team[lid.id];
      /* Fixer R3 F1: Karels buis werpt een koude lichtkegel over zijn naamplaatje; klakt de buis
         uit, dan gaan kegel en plaatje mee op zwart (zo zie je het, niet alleen in de log) */
      if (lid.attribuut === 'tl') { const kg = el('span', 'br-kegel'); kg.style.setProperty('--x', lid.x); wand.appendChild(kg); if (t) t.kegel = kg; }
      const p = el('span', 'br-naamplaat' + (lid.attribuut === 'tl' ? ' belicht' : ''), lid.plaat);
      p.dataset.wie = lid.id; p.style.setProperty('--x', lid.x);
      wand.appendChild(p);
      if (t) t.plaat = p;
    });
    kopvak.appendChild(wand);
    /* een buis klakt uit: hoofd, kegel en naamplaatje op zwart */
    function tlUit(t) {
      t.h.classList.add('uit');
      if (t.plaat) t.plaat.classList.add('uit');
      if (t.kegel) t.kegel.classList.add('uit');
    }
    const W = S.wand;
    const opr = el('div', 'br-oprichter');
    opr.appendChild(art(W.oprichter.src, '', 'br-opr-art'));
    opr.appendChild(el('span', 'br-plaquette', W.plaquette));
    const memo = el('div', 'br-memo');
    memo.appendChild(art(W.memo.portret, '', 'br-memo-art'));
    const mt = el('span', 'br-memo-tekst');
    mt.appendChild(el('b', '', W.memo.kop));
    mt.appendChild(el('span', '', W.memo.t));
    memo.appendChild(mt);

    /* de buizenpost naar het ARCHIEF (de kast die de outro openbreekt) */
    const buis = el('div', 'br-buis');
    buis.appendChild(el('span', 'br-buis-pijp'));
    const mond = el('span', 'br-buis-mond');
    buis.appendChild(mond);
    buis.appendChild(el('span', 'br-buis-label', S.audit.archief + ' ▲'));
    kopvak.appendChild(buis);

    /* de tl boven jou: wordt feller per glimlach (gekocht licht) */
    const tlBak = el('div', 'br-tl');
    tlBak.appendChild(el('span', 'br-tl-buis'));
    bureau.appendChild(el('div', 'br-blad'));
    bureau.appendChild(kopvak);
    bureau.appendChild(tlBak);
    bureau.appendChild(opr);
    bureau.appendChild(memo);
    bureau.appendChild(el('div', 'br-tl-licht'));

    /* de CRT met B.A.A.S. — de collega's praten in dezelfde log (naamkop, nooit onder de vouw) */
    const crt = el('div', 'br-crt');
    const bezel = el('div', 'br-bezel');
    const scherm = el('div', 'br-scherm');
    scherm.appendChild(el('div', 'br-scherm-kop', S.kop));
    scherm.appendChild(el('div', 'br-oog'));
    const log = el('div', 'term-log');
    scherm.appendChild(log);
    bezel.appendChild(scherm);
    const mag = el('div', 'br-magneet');
    mag.appendChild(el('b', '', W.friet[0]));
    mag.appendChild(el('span', '', W.friet[1]));
    bezel.appendChild(mag);
    crt.appendChild(bezel);
    bureau.appendChild(crt);

    /* het fotolijstje met de rode stippellijn (optioneel: tik erop) */
    const fotoVak = el('div', 'br-foto');
    const lijst = el('button', 'br-lijst');
    lijst.type = 'button';
    lijst.dataset.actie = 'foto';
    lijst.disabled = true;   /* integrator R3: pas een handeling in het quotum (daarvoor is het een lijstje) */
    lijst.setAttribute('aria-label', 'Kijk naar de foto');
    lijst.appendChild(art(S.foto.src, '', 'br-lijst-art'));
    lijst.appendChild(el('span', 'br-stip', S.foto.stip));
    lijst.appendChild(el('span', 'br-gemarkeerd', S.foto.snit[1]));
    fotoVak.appendChild(lijst);
    bureau.appendChild(fotoVak);

    /* de VU-meter: FACTURABILITEIT, de naald, het quotum, het tellampje */
    const vu = el('div', 'br-vu');
    const vuKast = el('div', 'vu-kast');
    const schaal = el('div', 'vu-schaal');
    for (let i = 0; i <= 10; i++) { const s = el('span', 'vu-streep' + (i >= 8 ? ' rood' : '')); s.style.setProperty('--i', i); schaal.appendChild(s); }
    const naald = el('span', 'vu-naald');
    naald.appendChild(el('span', 'vu-naald-tel'));
    schaal.appendChild(naald);
    schaal.appendChild(el('span', 'vu-as'));
    vuKast.appendChild(schaal);
    const lamp = el('span', 'vu-lamp');
    vuKast.appendChild(lamp);
    vu.appendChild(vuKast);
    const vuLabel = el('div', 'vu-label');
    vuLabel.appendChild(el('span', '', S.meter.label));
    const vuNum = el('b', '', '');
    vuLabel.appendChild(vuNum);
    vu.appendChild(vuLabel);
    const vuQuotum = el('div', 'vu-quotum');
    vu.appendChild(vuQuotum);
    bureau.appendChild(vu);

    /* de handeling: de knop schuift op onder je duim */
    const actie = el('div', 'br-actie');
    bureau.appendChild(actie);

    /* de borstzak met het kooltje (warm licht: van jou) */
    const zak = el('div', 'br-zak');
    const kool = el('span', 'br-kooltje');
    kool.appendChild(el('span', 'br-kool-gloed'));
    kool.appendChild(el('span', 'br-kool-kern'));
    zak.appendChild(el('span', 'br-zak-naad'));
    zak.appendChild(kool);
    bureau.appendChild(zak);

    /* integrator R3: een vast kader dat clipt, rond het bureau. De pull-back (scale 2,6 → 1) en
       de V-hold van de scheur bewegen het bureau zelf; zonder kader liep #scene dan over. */
    const kader = el('div', 'br-kader');
    kader.appendChild(bureau);
    wrap.appendChild(kader);

    /* — de staat tekenen — */
    function zetMeter(v) {
      meter = Math.max(0, Math.min(100, v));
      naald.style.setProperty('--hoek', ((meter / 100) * 100 - 50).toFixed(1) + 'deg');
      vuNum.textContent = Math.round(meter) + '%';
    }
    function zetQuotum() { vuQuotum.textContent = 'QUOTUM ' + Math.min(n, quotum) + '/' + quotum; }
    function zetLicht() {
      bureau.style.setProperty('--tl', Math.min(1, n * 0.2).toFixed(2));
      const bonus = P.choices.fotoKantoor ? 0.35 : 0;
      bureau.style.setProperty('--kool', Math.max(0.28, Math.min(1.3, 1 - n * 0.15 + bonus)).toFixed(2));
      bureau.classList.toggle('kool-fel', !!P.choices.fotoKantoor);
    }
    zetMeter(meter); zetQuotum(); zetLicht();
    if (P.choices.fotoKantoor) lijst.classList.add('gemarkeerd');

    /* — de log: groeit onderaan, bovenaan valt het oudste weg (nooit een scrollbalk) — */
    function lijn(cls, tekst) {
      const p = el('p', 'term-line ' + cls, tekst == null ? '' : tekst);
      log.appendChild(p);
      while (log.children.length > 40) log.removeChild(log.firstChild);
      return p;
    }
    function typ(cls, tekst, cps) {
      const p = lijn(cls + ' caret', '');
      let h = null;
      const klaar = () => { p.classList.remove('caret'); typend.delete(h); };
      h = typMachine(p, tekst, cps || 26, /tl-baas/.test(cls) && !/tl-warm/.test(cls), klaar);
      if (p.classList.contains('caret')) typend.add(h);
      return h;
    }
    function rondAlles() { [...typend].forEach(h => h.rond()); }
    const baas = t => typ('tl-baas', t, 26);
    /* Fixer R3 F1: een avatarje van de spreker in de naamkop (liggend zichtbaar, waar de hoofden
       boven de wand maar 40 px zijn): Barts portret, een silhouet, of Karels buis */
    function avatar(lid) {
      const a = el('span', 'tl-avatar tl-av-' + lid.id);
      a.setAttribute('aria-hidden', 'true');
      const beeld = lid.portret || lid.src;
      if (lid.attribuut === 'tl') a.appendChild(el('span', 'tl-av-buis'));
      else if (beeld) a.appendChild(art(beeld, '', 'tl-av-art', d => { d.classList.add('tl-av-sil'); return true; }));
      else a.appendChild(el('span', 'tl-av-art tl-av-sil'));
      return a;
    }
    function collegaLijn(lid, tekst) {
      const p = lijn('tl-collega tl-c-' + (lid.toon || 'neutraal'));
      p.dataset.wie = lid.id;
      const wie = el('b', 'tl-wie');
      wie.appendChild(avatar(lid));
      wie.appendChild(document.createTextNode(lid.naam));
      p.appendChild(wie);
      p.appendChild(el('span', 'tl-zegt', tekst));
      return p;
    }
    function spreekt(id, aan) { const t = team[id]; if (t) t.h.classList.toggle('spreekt', !!aan); }
    let vorigeSpreker = null;
    function zegt(id, tekst) {
      const t = team[id];
      if (!t) return null;
      if (vorigeSpreker) spreekt(vorigeSpreker, false);
      vorigeSpreker = id;
      spreekt(id, true);
      if (id === 'bart') { t.h.classList.remove('pop'); void t.h.offsetWidth; t.h.classList.add('pop'); }
      return collegaLijn(t.lid, tekst);
    }
    function zetCp(naam) {
      P.checkpoint = naam;
      P.choices.meter = meter;
      P.choices.glimCp = P.choices.glimlachen || 0;
      bewaar();
    }

    /* — de maat: de naald en de tl pulseren op de tel; wie op de tel glimlacht, klinkt zuiverder — */
    function opDeTel() { const f = telFase(t0, tel); return f < 120 || f > tel - 120; }

    /* ── het Glimlachquotum ── */
    function intro() {
      zetCp('start');
      const r = S.intro;
      reeks(r.map((t, i) => ({ doe: () => { const h = baas(t); if (i === r.length - 1) quotumStart(); return h; }, ms: t.length * 26 + (i === r.length - 1 ? 0 : 300) })), () => { if (fase === 'quotum' && !spoel) spoel = quotumSpoel; });
    }
    function vulLog(tot) {
      /* hervatten: de log van toen staat er meteen (geen typen) */
      S.intro.forEach(t => lijn('tl-baas', t));
      if (tot === 'glimlach') return;
      lijn('tl-baas', S.bijgesteld);
      const b = team.bart; if (b) collegaLijn(b.lid, S.bart);
      lijn('tl-knipoog', S.knipoog);
      lijn('tl-baas tl-warm', S.warm);
      lijn('tl-baas', S.ruis);
      if (tot === 'audit') return;
      if (S.audit.bon) lijn('tl-baas', S.audit.bon);
      S.collegas.forEach(c => {
        const t = team[c.wie]; if (!t) return;
        const p = collegaLijn(t.lid, c.knip || c.t);
        if (c.knip) { p.querySelector('.tl-zegt').appendChild(el('span', 'tl-knip', '—')); p.classList.add('knip'); tlUit(t); }
      });
    }
    function quotumStart() {
      if (fase !== 'intro') return;
      fase = 'quotum';
      zetCp('glimlach');
      knopGlim = knop('glim-knop', '', glimlach);
      knopGlim.dataset.actie = 'glimlach';
      knopGlim.appendChild(el('span', 'glim-label', S.knop.label));
      knopGlim.appendChild(el('span', 'u', S.knop.units));
      knopGlim.style.setProperty('--telfase', '-' + Math.round(telFase(t0, tel)) + 'ms');   /* de gloed klopt op dezelfde maat */
      actie.appendChild(knopGlim);
      schuif();
      hintWeg();   /* fixer R3 F1: de knop staat waar de hint knipperde */
      focusStil(knopGlim);
      if (!P.choices.fotoKantoor) { lijst.disabled = false; lijst.classList.add('mag'); lijst.addEventListener('click', kijkKlik); }
      else lijst.disabled = true;
      /* in het quotum spoelt een tik alleen het typen door (de knop is de handeling) */
      if (!spoel) spoel = quotumSpoel;
    }
    function quotumSpoel() { rondAlles(); if (fase === 'quotum') spoel = quotumSpoel; }
    const POS = [0.3, 0.42, 0.54, 0.8, 0.9, 1];
    function schuif() { if (knopGlim) actie.style.setProperty('--p', POS[Math.min(n, POS.length - 1)]); }
    function glimlach() {
      if (fase !== 'quotum' || !knopGlim) return;
      const tel1 = opDeTel();
      n++;
      P.choices.glimlachen = (P.choices.glimlachen || 0) + 1;
      bewaar();
      schrijfContract({ glimlachen: P.choices.glimlachen });
      if (tel1) klank('sfx', 'glimlach', n, 'opDeTel'); else klank('sfx', 'glimlach', n);
      zetMeter(meter + S.meter.stap);
      klank('sfx', 'naald', meter);   /* integrator R3: de nieuwe stand (K: hoger = iets hoger) */
      zetLicht();
      if (tel1) {
        lamp.classList.remove('tel'); void lamp.offsetWidth; lamp.classList.add('tel');
        /* fixer R3 F1: een zuivere glimlach (op de tel) laat het kooltje héél even opvlammen,
           ondanks het gekochte licht — het enige dat de maat je teruggeeft */
        if (kool.animate) {
          try { kool.animate([{ offset: 0, opacity: 1, transform: zacht ? 'none' : 'scale(1.5)' }], { duration: zacht ? 300 : 520, easing: 'ease-out' }); } catch (x) {}
        }
      }
      if (!zacht && knopGlim.animate) { try { knopGlim.animate([{ filter: 'brightness(1.45)' }, { filter: 'none' }], { duration: 260, easing: 'ease-out' }); } catch (x) {} }   /* het d-ding, even fel */
      if (n === S.quotum.bijstelOp) { quotum = S.quotum.bijgesteld; baas(S.bijgesteld); }
      if (n === S.quotum.bartOp) zegt('bart', S.bart);
      zetQuotum();
      schuif();
      if (n >= S.quotum.scheurOp) { T(scheur, zacht ? 120 : 260); fase = 'naQuotum'; knopGlim.disabled = true; }
      if (!spoel) spoel = quotumSpoel;
    }

    /* bij 5: het beeld scheurt 1,2 s (V-hold, RGB-split, twee frames van de echte Act 1-plaat)
       met de énige knipoog; dan, in warm amber, B.A.A.S.' oude stem */
    function scheur() {
      if (!actief) return;
      fase = 'scheur';
      rondAlles();
      if (knopGlim) { knopGlim.remove(); knopGlim = null; }
      fotoUit();
      if (vorigeSpreker) spreekt(vorigeSpreker, false);
      klank('sfx', 'scheur', S.scheurFrames || [0.22, 0.67]);   /* de momenten (s) van de twee plaatframes */
      const laag = el('div', 'scheur' + (zacht ? ' zacht' : ''));
      (S.platen || []).forEach((src, i) => {
        const f = el('div', 'sch-frame sch-f' + i);
        const img = document.createElement('img');
        img.alt = ''; img.decoding = 'async'; img.draggable = false; img.src = src;
        img.onerror = () => img.remove();
        f.appendChild(img);
        laag.appendChild(f);
      });
      laag.appendChild(el('div', 'sch-ruis'));
      laag.appendChild(el('p', 'sch-tekst', S.knipoog));
      wrap.appendChild(laag);
      const vrij = modaal(laag);
      if (!zacht) bureau.classList.add('vhold');
      let af = false;
      const eind = () => {
        if (af) return; af = true;
        wisT(tid); spoel = null;
        laag.remove(); vrij();
        bureau.classList.remove('vhold');
        naScheur();
      };
      const tid = T(eind, 1200);
      T(() => { if (!af) spoel = eind; }, 450);   /* de frames zie je altijd even */
    }
    function naScheur() {
      /* de knipoog blijft ingebrand in de fosfor; dan het oude stemmetje, dan de ruis */
      lijn('tl-knipoog', S.knipoog);
      reeks([
        { doe: () => { klank('sfx', 'warm'); return typ('tl-baas tl-warm', S.warm, 46); }, ms: S.warm.length * 46 + 700 },
        { doe: () => baas(S.ruis), ms: S.ruis.length * 26 + 650 }
      ], auditStart);
    }

    /* optioneel: de foto. Eén regel, dan een harde snit: NIET-FACTUREERBAAR. GEMARKEERD.
       Het kooltje gloeit toch feller. (De volle blik is voor het gesprek.) */
    function kijkFoto() {
      if (fase !== 'quotum' || P.choices.fotoKantoor) return;
      fase = 'foto';
      P.choices.fotoKantoor = true; bewaar();
      schrijfContract({ fotoKantoor: true });
      klank('sfx', 'warm');
      const laag = el('div', 'br-kijk' + (zacht ? ' zacht' : ''));
      const beeld = art(S.foto.src, '', 'br-kijk-beeld');
      laag.appendChild(beeld);
      laag.appendChild(el('p', 'br-kijk-zin', S.foto.zin));
      const snit = el('div', 'br-snit');
      S.foto.snit.forEach(r => snit.appendChild(el('b', '', r)));
      laag.appendChild(snit);
      wrap.appendChild(laag);
      const vrij = modaal(laag);
      let stap = 0, tid = null;
      const volgende = () => {
        wisT(tid);
        if (stap === 0) {
          stap = 1;
          laag.classList.add('snit');   /* de harde snit: geen overgang */
          klank('sfx', 'gemarkeerd');
          lijst.classList.add('gemarkeerd');
          lijst.classList.remove('mag');
          lijst.disabled = true;
          zetLicht();
          tid = T(volgende, 800);
          spoelNa(volgende, 300, () => stap === 1);   /* fixer R3 F1: GEMARKEERD. zie je altijd even */
        } else if (stap === 1) {
          stap = 2;
          laag.remove(); vrij();
          spoel = null;
          fase = 'quotum';
          focusStil(knopGlim);
          spoel = quotumSpoel;
        }
      };
      tid = T(volgende, zacht ? 1300 : 1500);
      /* fixer R3 F1 · de tikgrens: de tweede tik van een dubbeltik op het lijstje sprong door
         'Dat kleine gezicht.' heen naar de snit — de zin staat nu altijd even (de tikgrens) */
      spoelNa(volgende, 500, () => stap === 0);
    }
    function fotoUit() { lijst.classList.remove('mag'); lijst.disabled = true; lijst.removeEventListener('click', kijkKlik); }
    function kijkKlik(e) { e.stopPropagation(); try { kijkFoto(); } catch (err) { meldFout(err); redding(); } }

    /* ── de Zingevingsaudit: formulier Z-8 ── */
    function auditStart() {
      if (!actief) return;
      fase = 'audit';
      zetCp('audit');
      fotoUit();
      const f = S.audit;
      const form = el('div', 'z8' + (zacht ? ' zacht' : ''));
      form.appendChild(el('div', 'z8-kop', f.kop));
      form.appendChild(el('p', 'z8-vraag', f.vraag));
      const invoerRij = el('div', 'z8-rij');
      const inp = document.createElement('input');
      inp.className = 'z8-invoer';
      inp.maxLength = f.max || 40;
      inp.placeholder = f.placeholder || '';
      inp.autocomplete = 'off';
      inp.enterKeyHint = 'done';
      inp.setAttribute('aria-label', f.vraag);
      inp.value = P.choices.jeugddroom || '';
      invoerRij.appendChild(inp);
      const noteer = knop('z8-noteer', '↵ ' + f.noteer, stuur);
      noteer.dataset.actie = 'noteer';
      invoerRij.appendChild(noteer);
      form.appendChild(invoerRij);
      const antw = el('p', 'z8-antwoord');
      form.appendChild(antw);
      const voet = el('div', 'z8-voet');
      form.appendChild(voet);
      const arm = el('div', 'z8-arm');
      form.appendChild(arm);
      /* integrator R3: een laag die aan de schermrand clipt — de stempelslag (scale 2,6) liep
         staand buiten beeld en maakte #scene scrollbaar */
      const formLaag = el('div', 'z8-laag');
      formLaag.appendChild(form);
      wrap.appendChild(formLaag);
      const vrij = modaal(formLaag);
      let verstuurd = false, gestempeld = false, tid = null;
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); stuur(); } });
      inp.addEventListener('click', e => e.stopPropagation());
      /* fixer R3 F1: wie tijdens 'Gelieve zelf af te stempelen' op het PAPIER tikt, laat de machine
         niet stempelen (dat deed elke tik naast een knop, ook op het formulier zelf). Alleen een tik
         naast het formulier is wegtikken; de STEMPEL-knop blijft de enige manier om zelf te stempelen. */
      form.addEventListener('click', e => { if (verstuurd && !gestempeld) e.stopPropagation(); });
      T(() => { if (inp.isConnected && !verstuurd) { try { inp.focus({ preventScroll: true }); } catch (x) {} } }, zacht ? 0 : 380);
      function stuur() {
        if (verstuurd || !actief) return;
        verstuurd = true;
        const v = (inp.value || '').trim().slice(0, 60) || 'iets belangrijks';
        P.choices.jeugddroom = v; bewaar();
        schrijfContract({ jeugddroom: v });
        try { inp.blur(); } catch (e) {}
        invoerRij.remove();
        antw.textContent = '“' + v + '”';   /* spelersinvoer: altijd textContent */
        klank('sfx', 'toets');
        voet.appendChild(el('p', 'z8-zelf', f.zelf));
        const st = knop('z8-stempel', f.stempelKnop, () => stempel(true));
        st.dataset.actie = 'stempel';
        /* fixer R3 F1 · de tikgrens: STEMPEL verschijnt ±450 ms uitgeschakeld en pas dan mag een tik
           ernaast de machine laten stempelen. Anders besliste de tweede tik van een gewone dubbeltik
           op 'noteer' het contractveld zelfGestempeld (touch: STEMPEL schoof onder de vinger = zelf;
           laptop: de klik viel ernaast = de machine). De 6 s tellen vanaf dat de knop kan. */
        st.disabled = true;
        voet.appendChild(st);
        T(() => {
          if (gestempeld || !actief) return;
          st.disabled = false;
          focusStil(st);
          tid = T(() => stempel(false), f.wachtMs || 6000);
          spoel = () => stempel(false);   /* wie naast het formulier tikt, laat de machine stempelen */
        }, zacht ? 300 : 450);
      }
      function stempel(zelf) {
        if (gestempeld || !actief) return;
        gestempeld = true;
        wisT(tid); spoel = null;
        P.choices.zelfGestempeld = !!zelf; bewaar();
        schrijfContract({ zelfGestempeld: !!zelf });
        voet.innerHTML = '';
        if (zelf) klank('sfx', 'stempelZelf');
        else { baas(f.machine); form.classList.add('machine'); klank('sfx', 'stempelMachine'); }
        const afdruk = el('div', 'z8-afdruk', f.stempel);
        form.appendChild(afdruk);
        let door1 = false;
        const door = () => { if (door1) return; door1 = true; wisT(tid2); buizenpost(); };
        const tid2 = T(door, zelf ? 600 : 1200);
        spoelNa(door, zacht ? 250 : 450, () => !door1);   /* fixer R3 F1: de afdruk zie je altijd even */
      }
      function buizenpost() {
        if (!actief || form.classList.contains('weg')) return;
        spoel = null;
        klank('sfx', 'buizenpost');
        buis.classList.add('zuigt');
        let af = false;
        const klaar = () => {
          if (af) return; af = true; wisT(tid3); formLaag.remove(); vrij(); buis.classList.remove('zuigt');
          collegas(true);   /* fixer R3 F1: B.A.A.S. typt eerst het bonnetje 'Z-8 → ARCHIEF.' */
        };
        if (!zacht && form.animate) {
          try {
            const fr = form.getBoundingClientRect(), mr = mond.getBoundingClientRect();
            const dx = mr.left + mr.width / 2 - (fr.left + fr.width / 2), dy = mr.top + mr.height / 2 - (fr.top + fr.height / 2);
            /* integrator R3: de eigen centrering van het formulier (translateX(-50%), liggend
               translate(-50%, -50%)) blijft eronder staan; zonder die basis sprong het formulier
               bij het aanzuigen een halve breedte naar rechts (en liep #scene over) */
            const basis = getComputedStyle(form).transform;
            const b0 = basis && basis !== 'none' ? basis + ' ' : '';
            form.animate([
              { transform: b0 + 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
              { transform: b0 + 'translate(' + (dx * 0.35).toFixed(0) + 'px, ' + (dy * 0.2).toFixed(0) + 'px) scale(.5, .16) rotate(-8deg)', opacity: 1, offset: 0.35 },
              { transform: b0 + 'translate(' + dx.toFixed(0) + 'px, ' + dy.toFixed(0) + 'px) scale(.05, .04) rotate(-20deg)', opacity: 0 }
            ], { duration: 640, easing: 'cubic-bezier(.5, 0, .8, .4)', fill: 'forwards' });
          } catch (x) {}
        } else form.classList.add('weg');
        const tid3 = T(klaar, zacht ? 300 : 820);
        spoelNa(klaar, zacht ? 200 : 350, () => !af);   /* fixer R3 F1: de thwup zie je altijd even */
      }
    }

    /* ── Karel, Rudi, Bart en Marleen (in de log); Karels tl klakt uit midden in het woord ── */
    function collegas(bon) {
      if (!actief) return;
      fase = 'collegas';
      toonHint('collegas');
      /* fixer R3 F1: na de thwup typt B.A.A.S. het bonnetje 'Z-8 → ARCHIEF.' — de bestemming van de
         buizenpost (de kast die de outro openbreekt, etage −1 van de val), op elk formaat in beeld */
      const stappen = [];
      if (bon && S.audit.bon) stappen.push({ doe: () => baas(S.audit.bon), ms: S.audit.bon.length * 26 + 450 });
      S.collegas.forEach(c => stappen.push({ doe: () => spreek(c), ms: duur(c) }));
      reeks(stappen, () => { if (vorigeSpreker) spreekt(vorigeSpreker, false); oproepStart(); });
    }
    function duur(c) {
      if (c.knip) return c.knip.length * 45 + 800;   /* Karel: typen, de tl klakt uit, een stilte */
      /* fixer R3 F1: Marleens vraag wordt afgebroken — de oproep valt er ±0,6 s na binnen, en de enige
         vraag die een mens je die dag stelt, blijft onbeantwoord (ze blijft in de log staan) */
      if (typeof c.afgebroken === 'number') return c.afgebroken;
      return Math.max(1000, c.t.length * 34 + 350);
    }
    function spreek(c) {
      const t = team[c.wie];
      if (!t) return null;
      if (c.knip) {
        const p = zegt(c.wie, '');
        const z = p.querySelector('.tl-zegt');
        let uit = false;
        const knip = () => {
          if (uit) return; uit = true;
          z.appendChild(el('span', 'tl-knip', '—'));
          p.classList.add('knip');   /* ook zijn avatarje (de buis) in de naamkop dooft */
          tlUit(t);
          spreekt(c.wie, false);
          klank('sfx', 'tlKlakUit');
          /* fixer R3 F1: het hele bureau dipt even mee (120-200 ms), gelijk met K's ambient die
             wegvalt — zo ZIE je dat een buis uitklakt, niet alleen in de log. Rustig: geen dip. */
          if (!zacht && kader.animate) { try { kader.animate([{ filter: 'brightness(.78)' }, { filter: 'brightness(.78)', offset: 0.4 }, { filter: 'none' }], { duration: 180, easing: 'ease-out' }); } catch (x) {} }
        };
        const h = typMachine(z, c.knip, 45, false, knip);
        return { rond() { h.rond(); } };
      }
      zegt(c.wie, c.t);
      return null;
    }

    /* ── de oproep: de rijen doven van achter naar voor tot alleen jouw spot overblijft ── */
    function oproepStart() {
      if (!actief) return;
      fase = 'oproep';
      zetCp('oproep');
      fotoUit();
      bureau.dataset.fase = 'oproep';
      const donker = el('div', 'oproep');   /* het donker rond jouw spot (en het teken voor de klank-suite) */
      bureau.appendChild(donker);
      zorgWacht();   /* R2: "uw aanwezigheid is vereist" — en u staat in de wacht */
      const h = baas(S.oproep.t);
      const achterNaarVoor = rijen.slice().reverse();
      const tids = [];
      achterNaarVoor.forEach((r, i) => tids.push(T(() => { r.classList.add('uit'); klank('sfx', 'tlDooft', i); }, 300 + i * 360)));
      /* integrator R3: alleen jouw spot brandt nog — dan zoemt ook alleen die ene tl nog (K's
         lichtstand op 1 lamp), onder de wachtmuziek; de zoem gaat pas weg met de lift */
      const spot = () => { bureau.classList.add('spot'); zoem(true, { lampen: 1 }); };
      tids.push(T(spot, 300 + achterNaarVoor.length * 360));
      const knopT = T(bevestig, S.oproep.knopNa || 2500);
      spoel = () => {
        tids.forEach(wisT); wisT(knopT);
        h.rond();
        achterNaarVoor.forEach(r => r.classList.add('uit'));
        spot();
        bevestig(true);
      };
    }
    function bevestig(viaTik) {
      if (knopBevestig || !actief) return;
      spoel = null;
      knopBevestig = knop('knop-bevestig', '[ ' + S.oproep.cta + ' ]', lift);
      knopBevestig.dataset.actie = 'bevestig';
      actie.style.setProperty('--p', 0.5);
      actie.appendChild(knopBevestig);
      hintWeg();
      if (viaTik) {
        /* slot R3 (verificatie): komt de knop er door een tik, dan verschijnt hij ±450 ms
           uitgeschakeld, zoals STEMPEL — anders drukt de tweede tik van een dubbeltik BEVESTIG in */
        const kb = knopBevestig;
        kb.disabled = true;
        T(() => { if (kb === knopBevestig && actief) { kb.disabled = false; focusStil(kb); } }, zacht ? 300 : 450);
      } else focusStil(knopBevestig);
    }

    /* ── de goederenlift omhoog (≤ 3 s, doortikbaar): het schaarhek DICHT, 2 · 3 · 4 · DAK,
       geen blik omlaag, geen dakrand (keuze 3). Dezelfde etages als de val, in omgekeerde zin.
       Fixer R3 F1: per etage glijdt achter het dichte hek een lichtband in het klimaat van die
       etage naar beneden (2 ziekgroen, 3 ijscyaan, 4 bordeaux, DAK stormviolet: OutroFX.KLIMAAT,
       dezelfde kleuren als de val), en het paneel noemt de etage zoals de val (KANTOORTUIN,
       FACTURATIE, DIRECTIE). Omhoog passeer je wat je straks in de wacht omlaag passeert.
       Geen buitenzicht, geen figuur: keuze 3 blijft veilig. ── */
    const LIFT_KLEUR = { '2': '#4f7a4a', '3': '#2f7a8a', '4': '#8a2a2a', 'DAK': '#6a2a5a' };   /* terugval = KLIMAAT[].grade */
    function liftKleur(nr) {
      try {
        const FX = window.OutroFX;
        const k = FX && Array.isArray(FX.ETAGE_NR) && Array.isArray(FX.KLIMAAT) ? FX.ETAGE_NR.indexOf(nr) : -1;
        const c = k >= 0 && FX.KLIMAAT[k] && typeof FX.KLIMAAT[k].grade === 'string' ? FX.KLIMAAT[k].grade : null;
        if (c) return c;
      } catch (e) {}
      return Object.prototype.hasOwnProperty.call(LIFT_KLEUR, nr) ? LIFT_KLEUR[nr] : '#6f5a34';
    }
    function lift() {
      if (fase === 'lift' || !actief) return;
      fase = 'lift';
      spoel = null;
      klank('sfx', 'toets');
      zoem(false);   /* integrator R3: je laat het kantoor achter; de regen hoor je nog tot het dak */
      const L = S.lift;
      const laag = el('div', 'lift' + (zacht ? ' zacht' : ''));
      const band = el('div', 'lift-band');
      laag.appendChild(band);
      laag.appendChild(el('div', 'lift-hek'));
      const paneel = el('div', 'lift-paneel');
      const rijEt = el('div', 'lift-rij');
      rijEt.appendChild(el('span', 'lift-pijl', '▲'));
      const etages = L.etages.map(e => { const s = el('span', 'lift-etage', e); rijEt.appendChild(s); return s; });
      paneel.appendChild(rijEt);
      const naam = el('div', 'lift-naam', '');
      paneel.appendChild(naam);
      laag.appendChild(paneel);
      wrap.appendChild(laag);
      modaal(laag);
      let i = 0, af = false, tid = null;
      const klaar = () => {
        if (af || !actief) return;
        af = true; wisT(tid); spoel = null;
        regen(false); zoem(false);
        ga(IDX.gesprek);
      };
      const namen = Array.isArray(L.namen) ? L.namen : [];
      const stap = () => {
        if (i >= etages.length) { tid = T(klaar, 380); return; }
        etages.forEach((e, j) => e.classList.toggle('aan', j === i));
        const nr = L.etages[i];
        naam.textContent = typeof namen[i] === 'string' ? namen[i] : '';
        band.style.setProperty('--band', liftKleur(nr));
        band.classList.remove('glijdt'); void band.offsetWidth; band.classList.add('glijdt');
        klank('sfx', 'liftDing', i + 2);   /* de verdieping: 2, 3, 4, 5 (= DAK) */
        i++;
        /* fixer R3 F1 · de tikgrens: pas na de eerste liftbel spoelt een tik de lift door (de tweede
           tik van een dubbeltik op BEVESTIG slikte de hele lift in, 0 van de 4 bellen) */
        if (i === 1) spoelNa(klaar, 60, () => !af);
        tid = T(stap, L.stapMs || 560);
      };
      tid = T(stap, 220);
    }

    /* — waar begint de scène? — */
    toonHint('regie');
    if (cp === 'start') {
      if (!zacht) {
        const cr = crt.getBoundingClientRect(), br = bureau.getBoundingClientRect();
        bureau.style.transformOrigin = (cr.left + cr.width / 2 - br.left).toFixed(0) + 'px ' + (cr.top + cr.height / 2 - br.top).toFixed(0) + 'px';
        bureau.classList.add('terug');
        /* weg na afloop: anders herstart de pull-back zodra een andere animatie van het bureau
           (de V-hold van de scheur) wegvalt en 'terug' weer de animatie wordt */
        T(() => bureau.classList.remove('terug'), 650);
      }
      intro();
    } else {
      vulLog(cp);
      if (cp === 'glimlach') { fase = 'intro'; quotumStart(); }
      else {
        n = S.quotum.scheurOp; quotum = S.quotum.bijgesteld;
        zetQuotum(); zetLicht(); fotoUit();
        if (cp === 'audit') auditStart();
        else oproepStart();
      }
    }
  }

  /* ═══════════════ SCÈNE 3 · HET FUNCTIONERINGSGESPREK (R4) ═══════════════
     De indeling van het ECHTE gevechtstoneel van de game (#scherm-gevecht), in beige, op het dak
     in onweer — zodat je het gevecht straks herkent. Links 0042: de naamkaart aan een rood koord
     op een lege bureaustoel, WELZIJN 40 eronder. Rechts B.A.A.S.: een beige mainframekast met het
     groene oog, de intentiepil erboven (DEADLINE 8 · TEAMBUILDING −1 ⚡ · OPTIMALISATIERONDE met
     schedel) en AANDEELHOUDERSWAARDE ∞ als balk. Onderaan: de energiebol, de trekstapel, de
     BORSTZAK met de foto (altijd in beeld), de waaier van vijf kantoorkaarten, 'Eindig beurt' en de
     aflegstapel. Kaarten spelen zoals in het spel: klik op laptop (of 1-5, E = eindig beurt), tik-tik
     op touch (de eerste tik tilt de kaart op). Een mailtje laat ∞ niet zakken: '+6 % FACTURABILITEIT',
     een belletje, 'Dank voor uw inzet.' Geen uitlegregels, geen 'Verder'. Achter het strijdveld de
     onweerslucht van de val (OutroFX.tekenLucht: dezelfde stad, dezelfde zeppelin) en in het midden
     de goederenlift waarmee je bovenkwam, het hek dicht.

     SCÈNE 4 · DE UITWEG (in hetzelfde decor)
       sprong   houd de foto vast (touch/muis: vasthouden of een tweede tik; laptop: spatie
                vasthouden). De wereld verbleekt, drie je-regels met een Ken Burns; bij 'Laat los'
                (loslaten, of een tik) scheurt de stippellijn over het hele scherm en valt de foto
                gloeiend de liftschacht in — de val (R2) vindt haar terug naast de knop −∞.
       geduwd   na beurt 3 (of bij WELZIJN 0) vuurt de OPTIMALISATIERONDE: alle lichten uit behalve
                B.A.A.S., het hek gaat open, je stoel rolt de lift in, 'U bent vrijgesteld.', het hek
                gaat dicht. Keuze 3: de lift daalt, de mens valt niet (geen dakrand, geen blik omlaag).
     Het contract (uitweg, jeugddroom, glimlachen) wordt geschreven zodra de uitweg vastligt; de save
     springt dan meteen naar de Eindafrekening (een herlaad tijdens de uitweg hervat daar). */
  const HOUD_MS = 500;        /* zo lang houd je de foto (of spatie) vast voor je kijkt */
  const TIKGRENS_MS = 300;    /* de tweede tik van een dubbeltik is geen 'tweede tik' (fixer R3 F1) */
  const GESPREK_BINNEN_MS = 700;   /* het hek van de lift schuift open; pas dan kun je spelen */
  /* de lege bureaustoel van 0042 (3/4 van opzij, kijkt naar rechts), met het rode koord van de badge.
     Vaste markup, geen data. */
  const STOEL_SVG = '<svg class="gs-stoel-svg" viewBox="0 0 120 150" aria-hidden="true">'
    + '<path class="st-poot" d="M60 122 L20 131 M60 122 L99 131 M60 122 L38 140 M60 122 L83 140 M60 122 L61 134"/>'
    + '<circle class="st-wiel" cx="20" cy="133" r="4.6"/><circle class="st-wiel" cx="99" cy="133" r="4.6"/><circle class="st-wiel" cx="38" cy="142" r="4.6"/><circle class="st-wiel" cx="83" cy="142" r="4.6"/><circle class="st-wiel" cx="61" cy="137" r="4.2"/>'
    + '<rect class="st-gas" x="56.5" y="92" width="8" height="31" rx="2"/>'
    + '<rect class="st-steun" x="37" y="70" width="8" height="16" rx="2"/>'
    + '<path class="st-rug" d="M28 14 Q27 7 35 7 L63 9 Q70 10 69 17 L66 68 Q65 75 58 75 L37 74 Q30 74 30 67 Z"/>'
    + '<path class="st-rug-licht" d="M35 14 L61 15 Q63 15 63 18 L61 63 Q61 66 58 66 L39 66 Q36 66 36 63 Z"/>'
    + '<path class="st-zit" d="M24 86 Q23 78 31 78 L90 79 Q98 80 97 87 L95 92 Q94 96 88 96 L32 96 Q25 96 25 90 Z"/>'
    + '<rect class="st-arm" x="66" y="62" width="30" height="6" rx="3"/><rect class="st-arm" x="84" y="66" width="5" height="14" rx="2"/>'
    + '<path class="st-koord" d="M40 10 L48.5 44 L57 11"/>'
    + '</svg>';
  /* het blokschild van de game (links uit de welzijnsbalk), vaste markup */
  const SCHILD_SVG = '<svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1 L22 5 V12 C22 19.5 17.5 24.8 12 27 C6.5 24.8 2 19.5 2 12 V5 Z"/></svg>';

  let lucht = null;          /* de onweerslucht boven het dak (één klein canvas met OutroFX) */
  function stopLucht() { if (lucht) { const l = lucht; lucht = null; try { l.stop(); } catch (e) { meldFout(e); } } }
  /* de onweerslucht van de val: dezelfde stad, wolken, regen en zeppelin, op een klein canvas dat de
     browser opschaalt (pixelated, zoals de val en de outro). Het canvas neemt de verhouding van zijn
     vak aan (320 breed, 96-360 hoog; object-fit cover, onderaan verankerd), zodat de zeppelin op elk
     formaat in beeld hangt. Tekent op speelTijd() (een verborgen tab of het draai-blok houdt hem
     vast), ±30 beelden per seconde; rustig en lite: één stilstaand beeld, geen bliksem, geen regen. */
  function startLucht(canvas, o) {
    const FX = window.OutroFX;
    if (!canvas || !FX || typeof FX.init !== 'function' || typeof FX.tekenLucht !== 'function' || typeof FX.updateBliksem !== 'function') return null;
    const stil = !!(o.rustig || o.lite);
    let W = 320, H = 180, kim = 164, zepAan = true, ctx = null, zep = { x: 120, y: 12 }, raf = 0, gestopt = false, ro = null;
    const t0 = speelTijd();
    let vorig = t0, laatst = -1e9, maatSleutel = '';
    function maat() {
      const b = canvas.getBoundingClientRect();
      const bw = Math.max(1, b.width || innerWidth), bh = Math.max(1, b.height || innerHeight / 2);
      /* ±3,4 schermpx per pixel op een laptop (de stad zou anders als een muur voor je staan), op een
         telefoon het canvas van de val (320 breed) */
      const w = Math.max(320, Math.min(520, Math.round(bw / 3.4)));
      const h = Math.max(96, Math.min(360, Math.round(w * bh / bw)));
      const s = Math.max(bw / w, bh / h), zw = bw / s, zh = bh / s;
      const sleutel = w + 'x' + h + ':' + Math.round(zw) + ':' + Math.round(zh);
      if (sleutel === maatSleutel && ctx) return;
      maatSleutel = sleutel;
      W = w; H = h; canvas.width = W; canvas.height = H;
      /* de stad zakt achter de kim: van op het dak zie je alleen de bovenkant van de torens (de
         dichtste laag is tot 126 px hoog; ze neemt hoogstens ±55 % van de zichtbare lucht) */
      kim = H - 16 + Math.max(0, Math.round(126 - 0.55 * zh));
      ctx = canvas.getContext('2d', { alpha: false });
      FX.init({ breed: W, hoog: H, lite: !!o.lite, rustig: !!o.rustig, tekst: FX.tekst });
      if (o.lite && typeof FX.zetLite === 'function') FX.zetLite(true);
      /* het zichtbare stuk (object-fit: cover, object-position: onderaan): de zeppelin daarin, rechts van het midden */
      const links = (W - zw) / 2, boven = H - zh;
      zep = { x: Math.round(links + zw * 0.6 - 66), y: Math.round(boven + Math.max(3, Math.min(24, zh * 0.1))) };
      /* een lage lucht (liggend) heeft geen plaats voor de zeppelin: die zou half het scherm vullen */
      zepAan = zh >= 100;
    }
    function teken(t, dt) {
      if (!ctx) return;
      FX.updateBliksem(dt, !stil, () => { if (typeof o.opBliksem === 'function') { try { o.opBliksem(); } catch (e) { meldFout(e); } } }, null);
      FX.tekenLucht(ctx, { lucht: 'storm', horizon: kim, camX: 0, t, regen: !stil, zoeklicht: false, zeppelin: zepAan,
        krant: o.krant, zepX: zep.x, zepY: zep.y, y0: 0, y1: H });
    }
    function beeld() {
      raf = 0;
      if (gestopt || !actief || !canvas.isConnected) return;
      raf = requestAnimationFrame(beeld);
      const nu = speelTijd();
      if (klok.pauze) { vorig = nu; return; }
      if (nu - laatst < 32) return;
      const dt = Math.min(0.1, Math.max(0, (nu - vorig) / 1000));
      vorig = nu; laatst = nu;
      try { teken((nu - t0) / 1000, dt); } catch (e) { meldFout(e); stopIt(); }
    }
    function stopIt() { gestopt = true; if (raf) cancelAnimationFrame(raf); raf = 0; if (ro) { try { ro.disconnect(); } catch (e) {} ro = null; } }
    try { maat(); teken(0, 0); } catch (e) { meldFout(e); return null; }
    /* de css kan later binnenkomen, het toestel kan draaien: meet opnieuw als het vak verandert */
    if (window.ResizeObserver) {
      ro = new ResizeObserver(() => { if (gestopt) return; try { maat(); teken((speelTijd() - t0) / 1000, 0); } catch (e) { meldFout(e); } });
      ro.observe(canvas);
    }
    if (!stil) raf = requestAnimationFrame(beeld);
    return { stop: stopIt };
  }

  function sceneGesprek(scene, wrap) {
    /* alles van het gesprek hangt aan één eigen wortel (listeners en data-attributen verdwijnen mee) */
    const root = el('div', 'gs-root');
    wrap.appendChild(root);
    const S = scene;
    const zacht = rustig();
    const mob = isMobiel();
    const st = {
      welzijn: S.start.welzijn, maxWelzijn: S.start.welzijn, blok: 0,
      energie: S.start.energie, maxEnergie: S.start.energie, beurt: 0,
      fact: S.facturabiliteit, trek: S.hand.length * 2, afleg: 0,
      hand: [], voorbeeld: null, bezig: true, einde: null,
      fotoKlaar: false, fotoT: 0
    };
    glimOpen = 0;   /* een (her)start van het gesprek telt van nul */
    const binnenT = performance.now();
    regen(true);    /* het regent op het dak (tot de uitweg; de Eindafrekening zet hem uit) */

    /* ── het toneel: de lucht, het dak, de kim met wat er op een dak staat, de goederenlift ── */
    const toneel = el('div', 'gs-toneel');
    const luchtC = document.createElement('canvas');
    luchtC.className = 'gs-lucht';
    luchtC.setAttribute('aria-hidden', 'true');
    toneel.appendChild(luchtC);
    const dak = el('div', 'gs-dak');
    dak.appendChild(el('span', 'gs-dak-tegels'));
    dak.appendChild(el('span', 'gs-plas gs-plas-a'));
    dak.appendChild(el('span', 'gs-plas gs-plas-b'));
    toneel.appendChild(dak);
    const kim = el('div', 'gs-kim');
    ['gs-vent gs-vent-a', 'gs-vent gs-vent-b', 'gs-tank', 'gs-mast'].forEach(c => kim.appendChild(el('span', c)));
    toneel.appendChild(kim);
    toneel.appendChild(el('div', 'gs-nacht'));   /* geduwd: de lichten gaan uit (de lift blijft net zichtbaar) */
    const lift = el('div', 'gs-lift');
    lift.appendChild(el('span', 'gs-lift-bord', S.lift.bord));
    lift.appendChild(el('span', 'gs-lift-lamp'));
    const deur = el('div', 'gs-lift-deur');
    deur.appendChild(el('span', 'gs-lift-binnen'));
    deur.appendChild(el('span', 'gs-lift-hek'));
    lift.appendChild(deur);
    toneel.appendChild(lift);
    toneel.appendChild(el('div', 'gs-flits'));
    root.appendChild(toneel);

    /* ── #beurt-label ── */
    const beurtEl = el('div', 'gs-beurt');
    root.appendChild(beurtEl);

    /* ── #strijdveld: 0042 links, B.A.A.S. rechts ── */
    const veld = el('div', 'gs-veld');
    const held = el('div', 'gs-held');
    const stoel = el('div', 'gs-figuur gs-stoel');
    stoel.innerHTML = STOEL_SVG;   /* vaste markup, geen data */
    const badge = el('div', 'gs-badge');
    const pf = el('span', 'gs-pasfoto');
    if (P.choices.pasfoto) { const im = document.createElement('img'); im.src = P.choices.pasfoto; im.alt = ''; im.draggable = false; pf.appendChild(im); }   /* keuze 4: de pasfoto komt terug */
    else pf.appendChild(el('span', 'gs-pf-sil'));
    badge.appendChild(pf);
    badge.appendChild(el('b', 'gs-badge-nr', S.held.nr));
    stoel.appendChild(badge);
    held.appendChild(stoel);
    held.appendChild(el('div', 'gs-schaduw'));
    held.appendChild(el('div', 'gs-naam', S.held.naam));
    const hpH = el('div', 'gs-hp');
    const hpHvul = el('div', 'gs-hp-vul');
    const hpHtekst = el('span', 'gs-hp-tekst');
    const schild = el('span', 'gs-schild');
    schild.innerHTML = SCHILD_SVG;
    const schildN = el('b', '');
    schild.appendChild(schildN);
    hpH.appendChild(hpHvul); hpH.appendChild(hpHtekst); hpH.appendChild(schild);
    held.appendChild(hpH);
    veld.appendChild(held);

    const baas = el('div', 'gs-baas');
    const intentRij = el('div', 'gs-intent-rij');
    const intent = el('div', 'gs-intent');
    intentRij.appendChild(intent);
    baas.appendChild(intentRij);
    const kast = el('div', 'gs-figuur gs-kast');
    /* de beige mainframekast (css): antenne, lampjes, het groene oog, twee bandspoelen */
    const tekenKast = () => {
      kast.classList.remove('gs-kast-art');
      kast.appendChild(el('span', 'gs-kast-antenne'));
      kast.appendChild(el('span', 'gs-kast-lampen'));
      const oog = el('span', 'gs-oog');
      oog.appendChild(el('span', 'gs-oog-kern'));
      kast.appendChild(oog);
      kast.appendChild(el('span', 'gs-spoel gs-spoel-l'));
      kast.appendChild(el('span', 'gs-spoel gs-spoel-r'));
      kast.appendChild(el('span', 'gs-kast-voet'));
      return true;
    };
    /* optionele art (baas_kast, kijkt naar LINKS zoals elke vijand): pas als het manifest haar kent;
       laadt ze niet, dan alsnog de css-kast */
    if (S.baas.art) { kast.classList.add('gs-kast-art'); kast.appendChild(art(S.baas.art, '', 'gs-kast-plaat', d => { d.remove(); return tekenKast(); })); }
    else tekenKast();
    baas.appendChild(kast);
    baas.appendChild(el('div', 'gs-schaduw'));
    baas.appendChild(el('div', 'gs-naam', S.baas.naam));
    const hpB = el('div', 'gs-hp gs-hp-baas');
    hpB.appendChild(el('div', 'gs-hp-vul'));
    const hpBtekst = el('span', 'gs-hp-tekst');
    hpBtekst.appendChild(el('span', 'gs-hp-label', S.baas.waarde + ' '));
    hpBtekst.appendChild(el('b', 'gs-oneindig', S.baas.oneindig));
    hpB.appendChild(hpBtekst);
    hpB.setAttribute('aria-label', S.baas.waarde + ' ' + S.baas.oneindig);
    baas.appendChild(hpB);
    const chip = el('div', 'gs-chip');
    baas.appendChild(chip);
    /* B.A.A.S. spreekt: een ballon in groen fosfor bij zijn kast */
    const ballon = el('div', 'gs-ballon');
    const ballonT = el('p', 'gs-ballon-tekst');
    ballon.appendChild(ballonT);
    baas.appendChild(ballon);
    veld.appendChild(baas);
    root.appendChild(veld);

    /* ── #onderbalk: energiebol, trekstapel, borstzak, hand, 'Eindig beurt', aflegstapel ── */
    const onder = el('div', 'gs-onder');
    const orb = el('div', 'gs-orb');
    const trekEl = el('div', 'gs-stapel gs-trek');
    const aflegEl = el('div', 'gs-stapel gs-afleg');
    /* de borstzak met de foto: altijd in beeld, naast de bol */
    const zak = el('div', 'gs-zak');
    zak.appendChild(el('span', 'gs-zak-achter'));
    const kool = el('span', 'gs-kool');
    kool.appendChild(el('span', 'gs-kool-gloed'));
    kool.appendChild(el('span', 'gs-kool-kern'));
    zak.appendChild(kool);
    const fotoKnop = el('button', 'gs-foto');
    fotoKnop.type = 'button';
    fotoKnop.dataset.actie = 'zakfoto';
    fotoKnop.setAttribute('aria-label', 'De foto in je borstzak (vasthouden)');
    fotoKnop.appendChild(art(S.foto.src, '', 'gs-foto-art'));
    zak.appendChild(fotoKnop);
    zak.appendChild(el('span', 'gs-zak-voor'));
    zak.appendChild(el('span', 'gs-stip', S.foto.stip));
    if (!mob) { const kb = el('kbd', 'gs-toets', 'spatie'); kb.setAttribute('aria-hidden', 'true'); zak.appendChild(kb); }
    const handEl = el('div', 'gs-hand');
    const eind = knop('gs-eind', S.eindig + ' ⏳', () => eindigBeurt());
    eind.dataset.actie = 'eindig';
    if (!mob) eind.title = S.eindig + ' (E)';
    onder.appendChild(orb); onder.appendChild(trekEl); onder.appendChild(zak);
    onder.appendChild(handEl); onder.appendChild(eind); onder.appendChild(aflegEl);
    root.appendChild(onder);

    /* ── de staat tekenen ── */
    function herteken() {
      beurtEl.textContent = interp(S.beurt, { n: st.beurt + 1 });
      const it = S.intenties[Math.min(st.beurt, S.intenties.length - 1)];
      intent.className = 'gs-intent gs-int-' + it.soort + (intent.classList.contains('vuurt') ? ' vuurt' : '');
      intent.textContent = '';
      intent.appendChild(el('span', 'gs-int-icoon', it.icoon));
      intent.appendChild(el('span', 'gs-int-naam', it.naam));
      if (it.waarde) intent.appendChild(el('b', 'gs-int-waarde', it.waarde));
      hpHvul.style.width = Math.max(0, st.welzijn / st.maxWelzijn * 100).toFixed(1) + '%';
      hpHtekst.textContent = S.held.welzijn + ' ' + st.welzijn + '/' + st.maxWelzijn;
      schild.classList.toggle('aan', st.blok > 0);
      schildN.textContent = st.blok > 0 ? String(st.blok) : '';
      hpH.classList.toggle('geblokt', st.blok > 0);
      chip.textContent = S.baas.fact + ' ' + st.fact + ' %';
      orb.textContent = '';
      orb.appendChild(el('b', '', String(st.energie)));
      orb.appendChild(document.createTextNode('/' + st.maxEnergie));
      orb.setAttribute('aria-label', 'Energie ' + st.energie + ' van ' + st.maxEnergie);
      trekEl.textContent = '▤ ' + st.trek;
      aflegEl.textContent = '▥ ' + st.afleg;
      eind.disabled = !!st.einde || st.bezig;
      st.hand.forEach(h => {
        h.b.classList.toggle('te-duur', h.k.kost > st.energie);
        h.b.classList.toggle('voorbeeld', st.voorbeeld === h);
        h.b.disabled = !!st.einde;
      });
      zak.classList.toggle('opgetild', st.fotoKlaar && !st.einde);
    }
    function magSpelen() { return actief && !st.einde && !st.bezig; }

    /* ── de hand: vijf kaarten in een waaier, zoals renderHand() in het spel ── */
    function maakKaart(k) {
      const h = { k, b: null };
      const b = el('button', 'gs-kaart gk-' + k.type);
      b.type = 'button';
      b.dataset.kaart = k.id;
      b.setAttribute('aria-label', k.naam + ', kost ' + k.kost);
      b.appendChild(el('span', 'gk-kost', String(k.kost)));
      b.appendChild(el('span', 'gk-naam', k.naam));
      b.appendChild(art(k.src, '', 'gk-art'));
      const tx = el('span', 'gk-tekst');
      tx.innerHTML = k.tekst;   /* ontwikkelaarsdata uit data.js, geen spelersinvoer */
      b.appendChild(tx);
      b.appendChild(el('span', 'gk-type', k.label || k.type));
      b.addEventListener('click', e => { e.stopPropagation(); try { kaartKlik(h); } catch (err) { meldFout(err); redding(); } });
      h.b = b;
      return h;
    }
    function legWaaier() {
      const n = st.hand.length, mid = (n - 1) / 2;
      const rot = mob ? 1.5 : 4, til = mob ? 0 : 7;
      st.hand.forEach((h, i) => {
        h.b.style.setProperty('--rot', ((i - mid) * rot).toFixed(2) + 'deg');
        h.b.style.setProperty('--til', (Math.abs(i - mid) * til).toFixed(1) + 'px');
        h.b.style.zIndex = String(i + 1);
        if (!mob) h.b.dataset.toets = String(i + 1);
      });
    }
    /* trek vijf: het dek is de vijf kantoorkaarten, twee keer; is de trekstapel op, dan gaat de
       aflegstapel terug (zoals in het spel, in het klein) */
    function trekHand() {
      handEl.innerHTML = '';
      st.hand = [];
      const n = S.hand.length;
      if (st.trek < n) { st.trek += st.afleg; st.afleg = 0; }
      S.hand.forEach((k, i) => {
        const h = maakKaart(k);
        st.hand.push(h);
        handEl.appendChild(h.b);
        if (!zacht) {
          h.b.classList.add('nieuw'); h.b.style.animationDelay = (i * 70) + 'ms';
          T(() => { h.b.classList.remove('nieuw'); h.b.style.animationDelay = ''; }, 440 + i * 70);   /* gedeeld: de kaart ligt in de waaier */
        }
      });
      st.trek = Math.max(0, st.trek - n);
      legWaaier();
      klank('sfx', 'trek');
    }
    function kaartKlik(h) {
      if (!magSpelen() || st.hand.indexOf(h) === -1) return;
      /* touch: de eerste tik tilt de kaart op om te lezen, de tweede speelt hem (zoals klikKaart) */
      if (mob && st.voorbeeld !== h) { st.voorbeeld = h; st.fotoKlaar = false; klank('sfx', 'klik'); herteken(); return; }
      st.voorbeeld = null;
      speel(h);
    }
    function speel(h) {
      const k = h.k, e = k.eff || {};
      if (k.kost > st.energie) {
        zeg(S.zegt.teWeinig); klank('sfx', 'fout');
        tril(h.b); herteken();
        return;
      }
      st.fotoKlaar = false;
      st.energie -= k.kost;
      st.hand.splice(st.hand.indexOf(h), 1);
      st.afleg++;
      const doel = (e.schade || e.baasFact) ? kast : (e.energie && !e.welzijn) ? orb : stoel;
      vlieg(h.b, doel);
      klank('sfx', 'kaart');
      const land = zacht ? 60 : 280;   /* de kaart landt: dan pas het getal */
      if (e.blok) { st.blok += e.blok; T(() => { klank('sfx', 'blok'); fx(stoel, interp(S.fx.blok, { n: e.blok }), 'blok'); }, land); }
      if (e.schade) {
        st.fact = Math.min(100, st.fact + e.schade);
        T(() => { geraakt(kast); klank('sfx', 'klap'); fx(kast, S.fx.mailtje, 'fact'); klank('sfx', 'ding'); oneindigPuls(); herteken(); }, land);
      }
      if (e.baasFact) { st.fact = Math.min(100, st.fact + e.baasFact); T(() => { fx(kast, S.fx.verantwoord, 'fact'); klank('sfx', 'ding'); herteken(); }, land); }
      if (e.energie) { st.energie += e.energie; T(() => { fx(orb, interp(S.fx.energie, { n: e.energie }), 'energie'); klank('sfx', 'energie'); }, land); }
      if (e.welzijn) { st.welzijn = Math.max(0, st.welzijn + e.welzijn); T(() => { fx(stoel, String(e.welzijn).replace('-', '−'), 'schade'); geraakt(stoel); }, land); }
      if (k.id === 'glimlach') glimOpen++;   /* telt pas mee bij de uitweg: zie telGlimlachenBij */
      const zin = S.zegt[k.id];
      if (zin) T(() => zeg(zin), land + 40);
      legWaaier(); herteken();
      if (st.welzijn <= 0) { st.bezig = true; herteken(); T(() => eindig('geduwd'), zacht ? 300 : 900); }
    }
    /* de kaart vliegt naar haar doel en verdwijnt (vliegKaart in het spel) */
    function vlieg(b, doel) {
      const r = b.getBoundingClientRect(), d = doel.getBoundingClientRect();
      const w = b.offsetWidth || r.width, h = b.offsetHeight || r.height;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      b.remove();
      if (zacht) return;
      const kloon = b.cloneNode(true);
      kloon.className = b.className + ' gs-vliegt';
      kloon.disabled = true;
      kloon.removeAttribute('data-kaart');
      kloon.style.cssText = 'position:absolute;margin:0;z-index:40;pointer-events:none;left:' + (cx - w / 2).toFixed(1) + 'px;top:' + (cy - h / 2).toFixed(1) + 'px;width:' + w + 'px;height:' + h + 'px;';
      root.appendChild(kloon);
      const dx = d.left + d.width / 2 - cx, dy = d.top + d.height / 2 - cy;
      try {
        const a = kloon.animate([{ transform: 'rotate(0deg)', opacity: 1 }, { transform: 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px) scale(.3) rotate(8deg)', opacity: 0 }],
          { duration: 360, easing: 'cubic-bezier(.5, -.2, .7, 1)', fill: 'forwards' });
        a.finished.then(() => kloon.remove(), () => kloon.remove());
      } catch (e) { kloon.remove(); }
      T(() => kloon.remove(), 600);   /* vangnet (een verborgen tab speelt geen animaties af) */
    }
    /* een zwevend getal op een doel (fx-nummer in het spel) */
    function fx(doel, tekst, soort) {
      const r = doel.getBoundingClientRect();
      const f = el('div', 'gs-fx gs-fx-' + soort, tekst);
      f.style.left = Math.round(r.left + r.width / 2) + 'px';
      f.style.top = Math.round(r.top + r.height * 0.28) + 'px';
      root.appendChild(f);
      T(() => f.remove(), 1150);
    }
    function herstart(e, cls) { e.classList.remove(cls); void e.offsetWidth; e.classList.add(cls); }
    function geraakt(e) { if (!zacht) herstart(e, 'geraakt'); }
    function tril(e) { if (!zacht) herstart(e, 'tril'); }
    function oneindigPuls() { herstart(hpB, 'puls'); }
    /* B.A.A.S. spreekt (getypt, groen fosfor); geeft de typmachine terug (reeks kan hem afronden) */
    let ballonTyp = null;
    function zeg(tekst) {
      if (ballonTyp) ballonTyp.rond();
      ballon.classList.add('toon');
      ballonTyp = typMachine(ballonT, tekst, zacht ? 6 : 22, true, null);
      return ballonTyp;
    }
    function zwijg() { if (ballonTyp) ballonTyp.rond(); ballon.classList.remove('toon'); }

    /* ── 'Eindig beurt' en de beurt van B.A.A.S. ── */
    function eindigBeurt() {
      if (!magSpelen()) return;
      st.bezig = true; st.voorbeeld = null; st.fotoKlaar = false;
      klank('sfx', 'klik');
      st.hand.forEach(h => { vlieg(h.b, aflegEl); st.afleg++; });
      st.hand = [];
      herteken();
      const it = S.intenties[Math.min(st.beurt, S.intenties.length - 1)];
      T(() => baasBeurt(it), zacht ? 150 : 480);
    }
    function baasBeurt(it) {
      if (!actief || st.einde) return;
      if (it.id === 'optimalisatie') { eindig('geduwd'); return; }
      if (!zacht) herstart(kast, 'valt-aan');
      T(() => {
        if (it.id === 'deadline') {
          const dmg = Math.max(0, (it.schade || 8) - st.blok);
          if (dmg > 0) { st.welzijn = Math.max(0, st.welzijn - dmg); fx(stoel, '−' + dmg, 'schade'); geraakt(stoel); klank('sfx', 'klap'); }
          else { fx(stoel, S.fx.geblokt, 'blok'); klank('sfx', 'blok'); }
          zeg(S.zegt.deadline);
        } else if (it.id === 'teambuilding') {
          st.maxEnergie = Math.max(1, st.maxEnergie - 1);
          fx(orb, S.fx.diefstal, 'schade'); geraakt(orb); klank('sfx', 'debuff');
          zeg(S.zegt.teambuilding);
        }
        st.blok = 0;
        herteken();
      }, zacht ? 80 : 220);
      T(() => {
        if (!actief || st.einde) return;
        if (st.welzijn <= 0) { eindig('geduwd'); return; }
        st.beurt++;
        st.energie = st.maxEnergie;
        st.bezig = false;
        trekHand();
        herteken();
        if (S.intenties[st.beurt] && S.intenties[st.beurt].id === 'optimalisatie' && !zacht) herstart(intent, 'dreigt');
      }, zacht ? 600 : 1250);
    }

    /* ── de foto in je borstzak: vasthouden (of een tweede tik; laptop: spatie vasthouden) ── */
    let fotoHoud = null;       /* { bron: 'pointer'|'spatie', vol, tid } */
    let kijk = null;           /* de lopende uitweg 'sprong' */
    function fotoDruk(bron) {
      if (!magSpelen() || fotoHoud) return;
      st.voorbeeld = null;
      fotoHoud = { bron, vol: false, tid: 0 };
      zak.classList.add('houdt');
      herteken();
      fotoHoud.tid = T(() => {
        const h = fotoHoud;
        if (!h || h.vol) return;
        h.vol = true;
        startKijken(h.bron === 'spatie' ? 'spatie' : 'vasthouden');
      }, HOUD_MS);
    }
    function fotoLos() {
      const h = fotoHoud;
      if (!h) return;
      fotoHoud = null;
      wisT(h.tid);
      zak.classList.remove('houdt');
      if (h.vol) { if (kijk) kijk.los(); return; }
      /* kort ingedrukt: een tik (spatie niet: wie de regie wegtikt met spatie, springt nooit per ongeluk) */
      if (h.bron === 'pointer') fotoTik('tweede tik');
      else herteken();
    }
    function fotoTik(via) {
      if (!magSpelen()) return;
      const nu = performance.now();
      if (!st.fotoKlaar) { st.fotoKlaar = true; st.fotoT = nu; st.voorbeeld = null; klank('sfx', 'tik'); herteken(); return; }
      if (nu - st.fotoT < TIKGRENS_MS) return;
      startKijken(via);
    }
    fotoKnop.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      try { fotoKnop.setPointerCapture(e.pointerId); } catch (x) {}
      fotoDruk('pointer');
    });
    const fotoPointerLos = () => { if (fotoHoud && fotoHoud.bron === 'pointer') fotoLos(); };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => fotoKnop.addEventListener(t, fotoPointerLos));
    fotoKnop.addEventListener('contextmenu', e => e.preventDefault());
    /* Enter op de gefocuste foto (toetsenbord zonder spatie): dezelfde tik */
    fotoKnop.addEventListener('click', e => { e.stopPropagation(); if (e.detail === 0) fotoTik('toets'); });
    /* een tik naast een opgetilde kaart legt hem terug */
    root.addEventListener('click', e => {
      if (st.voorbeeld && !(e.target.closest && e.target.closest('.gs-kaart'))) { st.voorbeeld = null; herteken(); }
    });

    /* laptop: 1-5 speelt een kaart, E eindigt de beurt, spatie vasthouden = de foto */
    sleutels = e => {
      if (kijk) return kijk.toets(e);
      if (st.einde) return false;   /* de uitweg is regie: elke toets spoelt door (de gewone regel) */
      const spatie = e.key === ' ' || e.key === 'Spacebar';
      if (spatie) {
        if (!e.repeat && magSpelen() && performance.now() - binnenT > GESPREK_BINNEN_MS + 200) fotoDruk('spatie');
        return true;   /* nooit een knop onder de focus indrukken */
      }
      if (!magSpelen()) return false;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= st.hand.length) { if (!e.repeat) { st.voorbeeld = null; speel(st.hand[n - 1]); } return true; }
      if (e.key === 'e' || e.key === 'E') { if (!e.repeat) eindigBeurt(); return true; }
      return false;
    };
    sleutelsOp = e => {
      if (e.key !== ' ' && e.key !== 'Spacebar') return false;
      if (fotoHoud && fotoHoud.bron === 'spatie') fotoLos();
      return true;
    };

    /* ── de uitweg ── */
    function eindig(hoe) {
      if (st.einde) return;
      st.einde = hoe; st.bezig = true; st.voorbeeld = null;
      /* het contract krijgt zijn uitweg NU, en de save springt meteen door naar de Eindafrekening:
         een herlaad tijdens de uitweg hervat daar, niet in het gesprek */
      P.choices.val = hoe;
      telGlimlachenBij();
      P.scene = IDX.breekpunt; P.checkpoint = 'factuur';
      bewaar();
      const delta = { uitweg: uitwegVan(hoe), glimlachen: P.choices.glimlachen || 0,
        fotoKantoor: !!P.choices.fotoKantoor, zelfGestempeld: !!P.choices.zelfGestempeld };
      if (typeof P.choices.jeugddroom === 'string') delta.jeugddroom = P.choices.jeugddroom;
      schrijfContract(delta);
      herteken();
      if (hoe === 'gesprongen') kijkRegie(); else geduwdRegie();
    }
    function startKijken(via) {
      if (st.einde) return;
      root.dataset.uitweg = 'sprong:' + via;   /* voor de suite: welke variant (vasthouden, tweede tik, spatie, toets) */
      eindig('gesprongen');
    }

    /* SPRONG: de wereld verbleekt, de foto komt uit je zak naar het midden (Ken Burns), drie je-regels;
       dan 'Laat los': de stippellijn scheurt over het hele scherm, en de foto valt gloeiend de
       liftschacht in. Wie de foto nog vasthoudt, laat los door los te laten. */
    function kijkRegie() {
      const K = S.kijk;
      regen(false);          /* de wereld valt weg: alleen de warmte */
      kijkStil = true; klank('pauzeer', true);   /* ook de wachtmuziek zwijgt zolang je kijkt (ze komt terug als je loslaat) */
      zwijg();
      klank('sfx', 'warm');
      toonHint('uitweg');
      const laag = el('div', 'gs-kijk' + (zacht ? ' zacht' : ''));
      const kader = el('div', 'gs-kijk-kader');
      kader.appendChild(art(S.foto.src, '', 'gs-kijk-foto'));
      kader.appendChild(el('span', 'gs-kijk-stip'));
      laag.appendChild(kader);
      const regels = el('div', 'gs-kijk-regels');
      laag.appendChild(regels);
      const losKnop = knop('gs-laatlos', K.cta, () => laatLos());
      losKnop.dataset.actie = 'laatlos';
      losKnop.hidden = true;
      laag.appendChild(losKnop);
      root.appendChild(laag);
      root.classList.add('gs-bleek');
      zak.classList.add('leeg');
      /* de foto komt uit je zak (FLIP van de zakfoto naar het kader) */
      if (!zacht && kader.animate) {
        try {
          const v = fotoKnop.getBoundingClientRect(), k = kader.getBoundingClientRect();
          if (k.width > 0 && v.width > 0) {
            const s = v.width / k.width, dx = v.left + v.width / 2 - (k.left + k.width / 2), dy = v.top + v.height / 2 - (k.top + k.height / 2);
            kader.animate([{ transform: 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px) scale(' + s.toFixed(3) + ') rotate(-6deg)' }, { transform: 'none' }],
              { duration: 720, easing: 'cubic-bezier(.2, .7, .2, 1)' });
          }
        } catch (e) {}
      }
      let i = 0, kanLos = false, weg = false, tid = 0;
      function regel() { if (i < K.regels.length) { regels.appendChild(el('p', 'gs-kijk-regel', K.regels[i])); i++; } }
      function stap() {
        tid = 0;
        if (weg) return;
        if (i < K.regels.length) { regel(); tid = T(stap, i < K.regels.length ? (zacht ? 1100 : 1250) : (zacht ? 800 : 1050)); return; }
        toonLos();
      }
      function toonLos() {
        if (kanLos || weg) return;
        kanLos = true;
        losKnop.hidden = false;
        laag.classList.add('kan-los');
        focusStil(losKnop);
      }
      /* een tik (of spatie/Enter): de volgende regel, en als het kan: loslaten */
      function volgende() {
        if (weg) return;
        if (kanLos) { laatLos(); return; }
        wisT(tid); tid = 0;
        if (i < K.regels.length) { regel(); tid = T(stap, i < K.regels.length ? (zacht ? 1100 : 1250) : (zacht ? 800 : 1050)); }
        else toonLos();
      }
      function spoelKijk() { volgende(); if (!weg && !spoel) spoel = spoelKijk; }
      tid = T(stap, zacht ? 300 : 650);
      spoelNa(spoelKijk, 400, () => !weg);   /* de tweede tik van een dubbeltik op de foto slaat de eerste regel niet over */
      function laatLos() {
        if (weg || !kanLos) return;
        weg = true; kanLos = false; spoel = null; wisT(tid);
        losKnop.remove();
        laag.classList.add('los');
        root.classList.add('gs-na');   /* het gesprek is voorbij: de hand, de bol en de knoppen gaan weg; het dak blijft */
        root.dataset.losgelaten = '1';
        const r = reeks([
          { doe: scheur, ms: zacht ? 250 : 480 },
          { doe: valFoto, ms: zacht ? 450 : 1300 },
          { doe: () => { laag.appendChild(el('p', 'gs-slotzin', K.slot)); }, ms: zacht ? 1400 : 1650 }
        ], () => render());
        spoel = null;
        spoelNa(r.spoel, 350, () => !r.af);
      }
      /* de stippellijn scheurt over het hele scherm; de kleuren komen terug (de storm) */
      function scheur() {
        kijkStil = false; klank('pauzeer', klok.pauze);   /* het systeem hervat: de wacht loopt door */
        klank('sfx', 'papierscheur');
        const k = kader.getBoundingClientRect();
        const lijn = el('div', 'gs-scheurlijn');
        lijn.style.top = Math.round(k.top + k.height * 0.86) + 'px';
        lijn.appendChild(el('span', 'gs-scheur-l'));
        lijn.appendChild(el('span', 'gs-scheur-r'));
        root.appendChild(lijn);
        root.classList.remove('gs-bleek');
        kader.classList.add('los');
      }
      /* de foto zweeft gloeiend naar de lift en valt tussen het hek door de schacht in */
      function valFoto() {
        klank('sfx', 'fotoValt');
        let klaar1 = false;
        const inDeSchacht = () => {
          if (klaar1) return; klaar1 = true;
          kader.style.visibility = 'hidden';
          const klein = el('span', 'gs-valfoto');
          klein.appendChild(art(S.foto.src, '', 'gs-valfoto-art'));
          deur.appendChild(klein);
          lift.classList.add('gloeit');
        };
        if (zacht || !kader.animate) { inDeSchacht(); return; }
        try {
          const k = kader.getBoundingClientRect(), d = deur.getBoundingClientRect();
          const s = Math.max(0.05, (d.width * 0.42) / Math.max(1, k.width));
          const dx = d.left + d.width / 2 - (k.left + k.width / 2), dy = d.top + d.height * 0.3 - (k.top + k.height / 2);
          const a = kader.animate([{ transform: 'none', offset: 0 }, { transform: 'translate(' + (dx * 0.5).toFixed(1) + 'px, ' + (dy * 0.35 - 30).toFixed(1) + 'px) scale(' + ((1 + s) / 2).toFixed(3) + ') rotate(4deg)', offset: 0.45 },
            { transform: 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px) scale(' + s.toFixed(3) + ') rotate(12deg)' }],
            { duration: 850, easing: 'cubic-bezier(.45, 0, .55, 1)', fill: 'forwards' });
          a.finished.then(inDeSchacht, inDeSchacht);
        } catch (e) { inDeSchacht(); }
        T(inDeSchacht, 1000);
      }
      kijk = {
        /* wie de foto vasthield en nu loslaat: laat los (als dat al kan; anders loopt de regie door) */
        los() { if (kanLos) laatLos(); },
        toets(e) {
          if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
            if (!e.repeat && !fotoHoud) { if (spoel) doorspoelen(); }
            return true;
          }
          return false;
        }
      };
    }

    /* GEDUWD: de OPTIMALISATIERONDE vuurt — alle lichten uit behalve B.A.A.S., het hek gaat open, je
       stoel rolt de lift in, 'U bent vrijgesteld.', het hek gaat dicht. Een tik = één moment verder. */
    function geduwdRegie() {
      zwijg();
      toonHint('uitweg');
      const r = reeks([
        { doe: () => {
            herstart(intent, 'vuurt');
            klank('sfx', 'optimalisatie');
            if (!zacht) { const sw = el('div', 'gs-sweep'); root.appendChild(sw); T(() => sw.remove(), 900); }
            return zeg(S.zegt.optimalisatie);
          }, ms: zacht ? 700 : 950 },
        { doe: () => {
            root.classList.add('gs-uit');
            [0, 1, 2, 3].forEach(i => T(() => klank('sfx', 'tlDooft', 3 - i), zacht ? 0 : i * 260));
          }, ms: zacht ? 700 : 1250 },
        { doe: () => { zwijg(); lift.classList.add('open'); klank('sfx', 'schaarhek'); }, ms: zacht ? 350 : 520 },
        { doe: rolStoel, ms: zacht ? 600 : 1500 },
        { doe: () => zeg(S.zegt.vrijgesteld), ms: 1500 },
        { doe: () => { lift.classList.remove('open'); lift.classList.add('dicht'); klank('sfx', 'grendel'); }, ms: zacht ? 450 : 650 }
      ], () => render());
      spoel = null;
      spoelNa(r.spoel, 350, () => !r.af);
    }
    /* de stoel rolt naar de open lift: kleiner (verder weg) en dieper in het donker */
    function rolStoel() {
      klank('sfx', 'stoel');
      held.classList.add('rolt');
      if (zacht || !stoel.animate) { stoel.classList.add('weg'); return; }
      try {
        const s0 = stoel.getBoundingClientRect(), d = deur.getBoundingClientRect();
        const s = Math.max(0.2, Math.min(0.9, (d.height * 0.72) / Math.max(1, s0.height)));
        const dx = d.left + d.width / 2 - (s0.left + s0.width / 2), dy = d.bottom - 2 - s0.bottom;
        stoel.animate([
          { transform: 'none', filter: 'brightness(1)', opacity: 1 },
          { transform: 'translate(' + (dx * 0.35).toFixed(1) + 'px, ' + (dy * 0.35).toFixed(1) + 'px) scale(' + (1 - (1 - s) * 0.35).toFixed(3) + ') rotate(-2deg)', offset: 0.35 },
          { transform: 'translate(' + (dx * 0.75).toFixed(1) + 'px, ' + (dy * 0.75).toFixed(1) + 'px) scale(' + (1 - (1 - s) * 0.75).toFixed(3) + ') rotate(1.5deg)', offset: 0.72, opacity: 1 },
          { transform: 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px) scale(' + s.toFixed(3) + ')', filter: 'brightness(.35)', opacity: 0 }
        ], { duration: 1400, easing: 'cubic-bezier(.35, 0, .6, 1)', fill: 'forwards' });
      } catch (e) { stoel.classList.add('weg'); }
    }

    /* ── binnenkomen: het hek van de lift schuift open op het dak; de kaarten worden gedeeld ── */
    herteken();
    lucht = startLucht(luchtC, { rustig: zacht, lite: isLite(), krant: S.krant,
      opBliksem: () => { herstart(toneel, 'flitst'); klank('sfx', 'bliksem'); } });
    if (!zacht) { const hek = el('div', 'gs-hek-in'); root.appendChild(hek); T(() => hek.remove(), 900); }
    const binnen = () => {
      if (!actief || st.einde || !st.bezig || st.hand.length) return;
      spoel = null;
      st.bezig = false;
      trekHand();
      herteken();
      zeg(S.zegt.start);
    };
    T(binnen, zacht ? 250 : GESPREK_BINNEN_MS);
    spoel = binnen;   /* een tik tijdens het binnenkomen: meteen spelen */
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
      klank('brom', false);   /* fixer R2: de lift-brom hoort alleen bij de val */
      if (naam === 'afgrond') { wachtUit(); klank('stilteWeg'); }   /* wie in de stilte overslaat: de Afgrond klinkt meteen */
      else zorgWacht();
      spoel = null; sleutels = null; sleutelsOp = null;
      P.checkpoint = naam; bewaar();
      app.dataset.fase = naam;
      vak.style.filter = '';
    }

    /* ═══ SCÈNE 5 · DE EINDAFREKENING (R4) ═══
       De matrixprinter van B.A.A.S. voert één kettingvel (groenbalkpapier, tractorgaatjes) met JOUW
       cijfers, regel per regel met printergeratel: 'Glimlachen vandaag: 7 × 0u06' (het echte aantal,
       kantoor + gesprek), 'Foto bekeken: 1× …… gemarkeerd' (het kantoor, en de sprong), '“BRANDWEERMAN”
       — zelf afgestempeld …… voorziening getroffen' (de echte jeugddroom; zelf of machinaal) — die regel
       print trager —, 'Loyaliteitsbonus 25 jaar …… 1 (één) pen, leeg'. Bij 'Niet-factureerbare warmte —
       borstzak …… IN BESL█' loopt de printer vast; het totaal zakt naar €0,00: 'Facturabiliteit
       afgerond: 80 %. In ons voordeel.' Na de perforatie (checkpoint 'ontslag') print hetzelfde vel het
       BESLUIT TOT BEËINDIGING (J. Devroe), en de stempel ONMIDDELLIJK ONTSLAG slaat met dezelfde
       KA-TSJONK als de prikklok. Geduwd: teken met de lege pen (tik, of trek zelf je handtekening):
       alleen een groef; na 6 s (of een tik naast het vel) 'Uw handtekening is niet vereist. Wij hadden
       hem al.', en de printer zet hem er zelf op. Sprong: 'U tekende niet. U had al losgelaten.' Dan de
       val (R2, ongewijzigd). Eén tik = één moment verder (de regel staat er meteen helemaal). De cijfers
       komen uit de save en het contract: ook na een herlaad midden in de afrekening, en bij herbeleven
       (alleen-lezen). */
    function faseFactuur() { afrekening('factuur'); }
    function faseOntslag() { afrekening('ontslag'); }
    function afrekening(vanaf) {
      zetFase(vanaf);
      bakValVoor(S);
      titel.style.display = 'none';
      vak.innerHTML = ''; vak.className = 'bs-vak fase-afrekening';
      const zacht = rustig();
      const F = S.factuur, O = S.ontslag;
      const c = afrekenCijfers();
      const droom = (c.droom || F.droom.leeg).toLocaleUpperCase('nl');
      const hoe = c.zelf === true ? F.droom.zelf : c.zelf === false ? F.droom.machine : '';
      vak.appendChild(el('div', 'pv-kamer'));
      const vel = el('div', 'pv-vel');
      const papier = el('div', 'pv-papier');
      vel.appendChild(papier);
      vak.appendChild(vel);
      /* de printer: beige kast, de sleuf, de kop die heen en weer rijdt, ON LINE en ERROR */
      const pr = el('div', 'pv-printer');
      const sleuf = el('div', 'pv-sleuf');
      const kop = el('span', 'pv-kop');
      sleuf.appendChild(kop);
      pr.appendChild(sleuf);
      const leds = el('div', 'pv-leds');
      leds.appendChild(el('span', 'pv-led pv-led-aan', 'ON LINE'));
      leds.appendChild(el('span', 'pv-led pv-led-fout', 'ERROR'));
      pr.appendChild(leds);
      pr.appendChild(el('span', 'pv-merk', 'B.A.A.S.'));
      vak.appendChild(pr);

      const rijen = [
        { cls: 'pv-titel', l: F.kop, cps: 7 },
        { cls: 'pv-sub', l: F.sub, cps: 4 },
        { cls: 'pv-post', id: 'glimlachen', l: interp(F.glimlachen, { n: c.n }), w: tijdU(c.n * 6) },
        { cls: 'pv-post', id: 'foto', l: interp(F.foto.label, { n: c.fotoN }), w: c.fotoN ? F.foto.ja : F.foto.nee },
        { cls: 'pv-post pv-droom', id: 'droom', l: interp(F.droom.label, { droom, hoe }).replace(/\s{2,}/g, ' '), w: F.droom.waarde, cps: 36 },
        { cls: 'pv-post', id: 'bonus', l: F.bonus.label, w: F.bonus.waarde },
        { cls: 'pv-post pv-warmte', id: 'warmte', l: F.warmte.label, w: F.warmte.waarde, vast: F.warmte.tot },
        { cls: 'pv-totaal', id: 'totaal', l: F.totaal.label, rol: [F.totaal.van, F.totaal.naar] },
        { cls: 'pv-afgerond', id: 'afgerond', l: F.afgerond },
        { soort: 'perfo' },
        { cls: 'pv-besluit', l: O.kop, cps: 10 },
        ...O.regels.map(t => ({ cls: 'pv-brief', l: t })),
        { cls: 'pv-namens', l: O.namens, hand: O.ondertekenaar },
        { soort: 'stempel' },
        { cls: 'pv-teken', l: O.tekenregel, teken: true }
      ];
      const PERFO = rijen.findIndex(r => r.soort === 'perfo');
      let idx = 0, bezig = null, tid = 0, af = false, besluitEl = null, tekenvak = null, rijNr = 0;

      /* een nieuwe regel onderaan het vel: het papier voert één regel op (de kop staat onderaan) */
      function nieuweRij(cls, stil) {
        const r = el('div', 'pv-regel ' + cls + ((Math.floor(rijNr / 2) % 2) ? ' gb' : ''));
        rijNr++;
        papier.appendChild(r);
        if (!stil && !zacht && papier.animate) {
          try { papier.animate([{ transform: 'translateY(' + Math.max(8, r.offsetHeight) + 'px)' }, { transform: 'none' }], { duration: 110, easing: 'steps(3, end)' }); } catch (e) {}
        }
        return r;
      }
      function zetKop(p) { kop.style.left = (Math.max(0, Math.min(1, p)) * 100).toFixed(1) + '%'; }
      /* print tekst in een span, letter per letter (de kop rijdt mee); { rond() } maakt hem meteen af */
      function tikTekst(span, tekst, cps, klaar, tot) {
        const eind = typeof tot === 'number' ? Math.min(tot, tekst.length) : tekst.length;
        let n = 0, t = 0, weg = false;
        const af1 = () => { if (weg) return; weg = true; wisT(t); span.textContent = tekst.slice(0, eind); klaar(); };
        if (zacht || !cps) { af1(); return { rond() {} }; }
        const stap = () => {
          t = 0;
          if (weg) return;
          n = Math.min(eind, n + 1);
          span.textContent = tekst.slice(0, n);
          zetKop(n / Math.max(1, tekst.length));
          if (n >= eind) { af1(); return; }
          t = T(stap, cps);
        };
        stap();
        return { rond: af1 };
      }
      /* één regel (of de perforatie, of de stempel). Een regel heeft fasen (label, waarde, vastloper,
         het zakkende totaal); rond() maakt ze allemaal meteen af. stil: zonder geratel en in één keer
         (hervatten na een herlaad). */
      function drukRij(r, klaar, stil) {
        const snel = !!(stil || zacht);
        const st = { sub: null, klaar: false };
        const eind = () => { if (st.klaar) return; st.klaar = true; st.sub = null; zetKop(0); klaar(); };
        const handle = { rond() { let g = 0; while (!st.klaar && st.sub && g++ < 8) { const s = st.sub; st.sub = null; s.rond(); } if (!st.klaar) eind(); } };
        if (r.soort === 'perfo') {
          nieuweRij('pv-perfo', stil);
          if (!stil) klank('sfx', 'printer', 0.12);
          markeerBesluit();
          eind(); return handle;
        }
        if (r.soort === 'stempel') {
          const s = el('div', 'pv-stempel', O.stempel);
          (besluitEl || papier).appendChild(s);
          if (!snel) s.classList.add('slam');
          if (!stil) { klank('sfx', 'prikklok'); vak.classList.remove('dreun'); void vak.offsetWidth; vak.classList.add('dreun'); }
          eind(); return handle;
        }
        const rij = nieuweRij(r.cls, stil);
        if (r.id) rij.dataset.post = r.id;
        if (r.cls === 'pv-besluit') { besluitEl = rij; tekenPasfoto(rij); }
        const l = el('span', 'pv-l');
        rij.appendChild(l);
        if (r.teken) {
          l.textContent = r.l;
          tekenvak = el('span', 'pv-tekenvak');
          rij.appendChild(tekenvak);
          eind(); return handle;
        }
        const cps = snel ? 0 : (r.cps || 12);   /* stil (hervatten) of rustig: de regel staat er in één keer */
        if (!stil) klank('sfx', 'printer', Math.min(2.4, ((r.l || '').length + (r.w || '').length) * (cps || 2) / 1000 + 0.06), cps > 30);
        const waarde = () => {
          if (r.hand) { rij.appendChild(el('span', 'pv-hand', r.hand)); eind(); return; }
          if (r.w == null && !r.rol) { eind(); return; }
          rij.appendChild(el('span', 'pv-dots'));
          const w = el('span', 'pv-w');
          rij.appendChild(w);
          if (r.rol) { w.textContent = euro(r.rol[0]); st.sub = rol(w, r.rol[0], r.rol[1], eind, snel); return; }
          if (typeof r.vast === 'number') {
            st.sub = tikTekst(w, r.w, cps, () => { w.appendChild(el('span', 'pv-blok', '█')); st.sub = vastloper(eind, snel, stil); }, r.vast);
            return;
          }
          st.sub = tikTekst(w, r.w, cps, eind);
        };
        st.sub = tikTekst(l, r.l || '', cps, waarde);
        return handle;
      }
      /* de printer loopt vast: de kop blijft hangen, ERROR knippert, het vel rukt; na ±1 s geeft hij op */
      function vastloper(klaar, snel, stil) {
        let weg = false, t = 0;
        const los = () => { if (weg) return; weg = true; wisT(t); pr.classList.remove('vast'); vak.classList.remove('vast'); klaar(); };
        if (stil) { los(); return { rond() {} }; }
        pr.classList.add('vast');
        vak.classList.add('vast');
        klank('sfx', 'vastloper');
        t = T(los, snel ? 800 : 1000);
        return { rond: los };
      }
      /* het totaal zakt: € 9.131,00 … € 0,00 (de printer slaat de cijfers over, stap voor stap) */
      function rol(w, van, naar, klaar, snel) {
        let weg = false, t = 0, i = 0;
        const los = () => { if (weg) return; weg = true; wisT(t); w.textContent = euro(naar); klaar(); };
        if (snel) { los(); return { rond() {} }; }
        const N = 9;
        const stap = () => {
          t = 0;
          if (weg) return;
          i++;
          if (i >= N) { klank('sfx', 'printer', 0.08); los(); return; }
          w.textContent = euro(Math.round(van - (van - naar) * (1 - Math.pow(1 - i / N, 2))));
          klank('sfx', 'printer', 0.05);
          t = T(stap, 105);
        };
        t = T(stap, 260);
        return { rond: los };
      }
      /* de pasfoto (keuze 4) komt terug op Juniors besluit: in printerinkt, gerasterd */
      function tekenPasfoto(rij) {
        const src = P.choices.pasfoto;
        if (typeof src !== 'string' || src.indexOf('data:image/') !== 0) return;
        const cv = document.createElement('canvas');
        cv.className = 'pv-pasfoto'; cv.width = 40; cv.height = 40;
        cv.setAttribute('aria-hidden', 'true');
        rij.appendChild(cv);
        const im = new Image();
        im.onload = () => {
          try {
            const x = cv.getContext('2d');
            x.drawImage(im, 0, 0, 40, 40);
            const d = x.getImageData(0, 0, 40, 40), p = d.data;
            const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
            for (let y = 0; y < 40; y++) for (let xx = 0; xx < 40; xx++) {
              const i = (y * 40 + xx) * 4, g = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) / 255;
              const inkt = g < (B[(y & 3) * 4 + (xx & 3)] + 0.5) / 16;
              p[i] = 43; p[i + 1] = 33; p[i + 2] = 20; p[i + 3] = inkt ? 210 : 0;
            }
            x.putImageData(d, 0, 0);
          } catch (e) { cv.remove(); }
        };
        im.onerror = () => cv.remove();
        im.src = src;
      }
      /* na de perforatie begint het besluit: checkpoint 'ontslag' (een herlaad hervat hier) */
      function markeerBesluit() {
        if (P.checkpoint === 'ontslag') return;
        P.checkpoint = 'ontslag'; bewaar();
        app.dataset.fase = 'ontslag';
      }

      /* ── de regie: één regel per moment; een tik = de regel meteen helemaal, en de volgende ── */
      /* rustig (reduced motion, lite): de regel staat er in één keer, maar je krijgt dezelfde leestijd */
      function pauzeNa(r) {
        if (r.soort === 'stempel') return zacht ? 800 : 650;
        if (r.soort === 'perfo') return zacht ? 400 : 320;
        if (r.cls === 'pv-titel') return zacht ? 250 : 80;
        if (r.id === 'droom') return zacht ? 1100 : 380;
        return zacht ? 650 : 200;
      }
      function volgende() {
        tid = 0;
        if (af || !actief) return;
        if (idx >= rijen.length) { slot(); return; }
        const r = rijen[idx++];
        bezig = drukRij(r, () => { bezig = null; tid = T(volgende, pauzeNa(r)); });
      }
      function spoelA() {
        if (af) return;
        const b = bezig; bezig = null;
        if (b) b.rond();
        wisT(tid); tid = 0;
        volgende();
        if (!af && !spoel) spoel = spoelA;
      }
      /* hervatten op 'ontslag': de afrekening staat er al (stil), het besluit print */
      if (vanaf === 'ontslag' && PERFO > 0) {
        for (idx = 0; idx <= PERFO; idx++) drukRij(rijen[idx], () => {}, true);
      }
      zetKop(0);
      tid = T(volgende, zacht ? 150 : 420);
      spoel = spoelA;
      toonHint('afrekening');

      /* ── het slot: tekenen (geduwd) of niet (sprong), dan de val ── */
      function slot() {
        if (af) return;
        af = true; spoel = null; bezig = null;
        if (sprong) {
          let rijKlaar = false;
          const rij = drukRij({ cls: 'pv-brief pv-sprong', l: O.sprong, cps: 22 }, () => { rijKlaar = true; });
          const door = () => { wisT(tv); naarVal(); };
          const tv = T(door, zacht ? 1300 : 2600);
          /* een tik maakt eerst de regel af (zoals elke regel), de volgende gaat naar de val */
          spoelNa(() => { if (rijKlaar) door(); else { rij.rond(); spoelNa(door, 350); } }, 450);
          return;
        }
        /* de lege pen: een tik laat hem zelf een lus trekken, of je trekt zelf je handtekening */
        const vakT = tekenvak || papier;
        const groefSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        groefSvg.setAttribute('class', 'pv-groef');
        groefSvg.setAttribute('aria-hidden', 'true');
        const groefS = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        groefS.setAttribute('class', 'pv-groef-schaduw');
        const groef = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        groef.setAttribute('class', 'pv-groef-lijn');
        groefSvg.appendChild(groefS); groefSvg.appendChild(groef);
        vakT.appendChild(groefSvg);
        const pen = el('button', 'pv-pen');
        pen.type = 'button';
        pen.dataset.actie = 'teken';
        pen.setAttribute('aria-label', O.pen + ' (de pen is leeg)');
        pen.appendChild(el('span', 'pv-pen-tekst', O.pen));
        pen.appendChild(el('span', 'pv-pen-icoon', '🖊'));
        vakT.appendChild(pen);
        let klaar1 = false, punten = [], trekt = null;
        pen.disabled = true;   /* de tikgrens (zoals STEMPEL): de tweede tik van een dubbeltik tekent niet */
        T(() => { if (!klaar1 && actief) { pen.disabled = false; focusStil(pen); } }, zacht ? 250 : 450);
        const tMachine = T(() => afgerond(false), O.wachtMs || 6000);
        spoelNa(() => afgerond(false), 450, () => !klaar1);   /* een tik naast het vel: de machine */
        const doos = () => groefSvg.getBoundingClientRect();
        const zetGroef = () => {
          const s = punten.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
          groef.setAttribute('points', s); groefS.setAttribute('points', s);
        };
        pen.addEventListener('pointerdown', e => {
          if (pen.disabled || klaar1) return;
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          e.preventDefault();
          try { pen.setPointerCapture(e.pointerId); } catch (x) {}
          const b = doos();
          trekt = { id: e.pointerId, x0: e.clientX, y0: e.clientY, bewogen: false };
          punten = [[e.clientX - b.left, e.clientY - b.top]];
          klank('sfx', 'groef');
        });
        pen.addEventListener('pointermove', e => {
          if (!trekt || e.pointerId !== trekt.id) return;
          const b = doos();
          if (Math.hypot(e.clientX - trekt.x0, e.clientY - trekt.y0) > 6) trekt.bewogen = true;
          punten.push([e.clientX - b.left, e.clientY - b.top]);
          if (punten.length > 400) punten.shift();
          zetGroef();
        });
        const penLos = e => {
          if (!trekt || (e && e.pointerId !== trekt.id)) return;
          const zelf = trekt.bewogen && punten.length > 4;
          trekt = null;
          if (zelf) geslagen(); else krabbel();
        };
        pen.addEventListener('pointerup', penLos);
        pen.addEventListener('pointercancel', penLos);
        pen.addEventListener('click', e => { e.stopPropagation(); if (e.detail === 0) krabbel(); });
        /* een tik: de pen trekt zelf een lus — zonder inkt, alleen een groef */
        function krabbel() {
          if (klaar1 || pen.dataset.krabbelt) return;
          pen.dataset.krabbelt = '1';
          const b = doos();
          const w = Math.max(60, b.width * 0.5), h = Math.max(10, b.height * 0.55), x0 = Math.max(6, b.width * 0.08), y0 = b.height * 0.62;
          const P2 = [];
          for (let i = 0; i <= 44; i++) {
            const t = i / 44;
            P2.push([x0 + t * w + Math.sin(t * Math.PI * 9) * 5, y0 - Math.sin(t * Math.PI * 4.5) * h * 0.42 * (1 - t * 0.35) - Math.sin(t * Math.PI) * h * 0.25]);
          }
          klank('sfx', 'groef');
          if (zacht) { punten = P2; zetGroef(); geslagen(); return; }
          let i = 0;
          const stap = () => { if (klaar1) return; i = Math.min(P2.length, i + 3); punten = P2.slice(0, i); zetGroef(); if (i < P2.length) T(stap, 18); else geslagen(); };
          stap();
        }
        function geslagen() {
          if (klaar1) return;
          pen.classList.add('leeg');
          groefSvg.classList.add('klaar');
          afgerond(true);
        }
        /* getekend of niet: B.A.A.S. had hem al — de printer zet de handtekening er zelf op */
        function afgerond(getekend) {
          if (klaar1) return;
          klaar1 = true; spoel = null; wisT(tMachine);
          pen.disabled = true;
          papier.dataset.getekend = getekend ? 'zelf' : 'machine';
          let rijKlaar = false;
          const rij = drukRij({ cls: 'pv-brief pv-geduwd', l: O.geduwd, cps: 20 }, () => {
            rijKlaar = true;
            if (!tekenvak) return;
            tekenvak.appendChild(el('span', 'pv-facsimile', '0042'));
            klank('sfx', 'printer', 0.35);
          });
          const door = () => { wisT(tv); naarVal(); };
          const tv = T(door, zacht ? 1600 : 2900);
          spoelNa(() => { if (rijKlaar) door(); else { rij.rond(); spoelNa(door, 350); } }, 450);
        }
      }
      function naarVal() {
        if (!actief) return;
        spoel = null;
        if (zacht) { faseVal(); return; }
        vak.classList.add('pv-uit');
        T(faseVal, 320);
      }
    }
    /* de eigen cijfers: de save (en voor wie herbeleeft het contract, alleen-lezen) */
    function afrekenCijfers() {
      const ch = P.choices || {}, c = leesContract() || {};
      const n = typeof ch.glimlachen === 'number' ? ch.glimlachen : (typeof c.glimlachen === 'number' ? c.glimlachen : 0);
      const fotoK = ch.fotoKantoor ? true : !!c.fotoKantoor;
      const zelf = typeof ch.zelfGestempeld === 'boolean' ? ch.zelfGestempeld : (typeof c.zelfGestempeld === 'boolean' ? c.zelfGestempeld : null);
      const droom = (typeof ch.jeugddroom === 'string' && ch.jeugddroom.trim()) || (typeof c.jeugddroom === 'string' && c.jeugddroom.trim()) || '';
      return { n: Math.max(0, n | 0), fotoN: (fotoK ? 1 : 0) + (sprong ? 1 : 0), zelf, droom: droom.slice(0, 60) };
    }
    function tijdU(min) { min = Math.max(0, Math.round(min)); return Math.floor(min / 60) + 'u' + String(min % 60).padStart(2, '0'); }
    function euro(v) {
      const n = Math.max(0, Math.round(v));
      return '€ ' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',00';
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
        else if (naam === 'vertrek') klank('brom', true);   /* fixer R2: motor en kabels, zolang de lift daalt */
        else if (naam === 'tl') { klank('brom', false); if (vers) klank('sfx', 'tl'); }   /* de stroom valt weg: tl én mechaniek */
        else if (naam === 'kooltje') { klank('stilteWeg'); if (vers) klank('sfx', 'kooltje'); }   /* doorgespoeld tot het kooltje: de stilte is voorbij */
        else if (naam !== 'slot' && vers) klank('sfx', naam);   /* bliksem (donder), hek (grendel), krant, verbinding, ledUit, vloer */
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
          jeugddroom: P.choices.jeugddroom || null, glimlachen: P.choices.glimlachen || 0, fotoKantoor: !!P.choices.fotoKantoor, zelfGestempeld: !!P.choices.zelfGestempeld });
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
  function opToetsOp(e) {
    if (e.key === 'Escape') { houdSkipStop(); return; }
    /* R4: de scène luistert ook naar het loslaten (de foto vasthouden met spatie) */
    if (actief && sleutelsOp && sleutelsOp(e)) e.preventDefault();
  }

  function start(o) {
    o = o || {};
    if (actief) stop();
    host = o.host || document.getElementById('scherm-proloog');
    if (!host) return false;
    opts = o;
    herbeleef = !!o.herbeleef;
    kijkStil = false; klaarGeroepen = false; overgeslagen = false; glimOpen = 0; spoel = null; sleutels = null; sleutelsOp = null; hintGezien = {}; wachtAan = false;
    regenAan = false; zoemAan = false;
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
    stopLucht();
    wachtUit();
    klank('pauzeer', false);   /* fixer R2: een pauze mag de volgende proloog niet stil laten beginnen */
    klank('stilteWeg');        /* en een stilte mag de titel of het herbeleven niet stil laten */
    regen(false); zoem(false); /* R3: de lussen van het kantoor (regen op glas, de kantoorzoem) */
    objectUrls.forEach(u => { try { URL.revokeObjectURL(u); } catch (e) {} });
    objectUrls.clear();
    if (AU && AU.stilte) { try { AU.stilte(); } catch (e) {} }
    spoel = null; sleutels = null; sleutelsOp = null;
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
