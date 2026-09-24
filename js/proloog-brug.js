/* ============================================================
   SLAY LIT — DE PROLOOG-BRUG (R1 "de naad", sep 2026)
   De game-kant van de proloog. De proloog zelf (proloog/*) draait sinds R1
   IN de game-pagina, in een shadow root op #scherm-proloog, en wordt hier lui
   geladen. Geen herlaad meer, geen tweede heldkeuze: het masker dat je in de
   Afgrond loslaat IS je held, en je landt vanuit het kooltje op de Act 1-kaart.
   Plan: .claude/notities/proloog_herwerking_plan.md (par. 3 = de landing frame
   voor frame, par. 4 = contract, gate, poorten, herbeleven).

   DE INTERFACE MET DE PROLOOG-KANT (proloog/proloog.js):
   - window.Proloog = { start(opts), stop(), slaOver(), get actief }.
     opts = { host, herbeleef, hoofdstuk, klaar(uitkomst), over() }.
   - uitkomst = { held (game-id), masker, kooltje: { x, y } (viewport), contract }.
     klaar() komt op plan-T 1,5 s: het zwart met één ademend kooltje. Vanaf daar
     neemt deze brug het beeld over (de sluier gaat in hetzelfde frame dicht,
     met een kooltje op exact dezelfde plek).
   - localStorage: 'slayit_proloog' (contract, schrijft de proloog), 'slayit_proloog_over'
     (de vasthoud-skip; de proloog schrijft hem pas bij de landing), 'slayit_proloog_klaar' (zet DEZE brug bij de
     landing) en 'slaylit_proloog_v3' (de eigen save van de proloog; hier alleen gelezen
     voor de Codex-hoofdstukken).

   Alles staat in een IIFE; enkel wat game.js/index.html/de Codex aanroepen gaat op
   window. Geen top-level const/let: die zouden de globale scope met game.js delen.
   ============================================================ */
(function () {
  'use strict';

  const SLEUTEL = {
    contract: 'slayit_proloog',
    klaar: 'slayit_proloog_klaar',
    over: 'slayit_proloog_over',
    save: 'slaylit_proloog_v3'
  };
  const BRONNEN = ['proloog/data.js', 'proloog/audio.js', 'proloog/proloog.js'];
  const LAAD_GEDULD = 10000;   /* ms: daarna valt de nieuwe speler terug op de heldkeuze */
  /* masker-id's van de OUDE proloog (contract zonder v:2) → game-held; ook het vangnet
     als een uitkomst alleen een masker meegeeft (lookup-bugklasse: nooit blind SPELERS[x]) */
  const MASKER_HELD = { woede: 'slachter', gif: 'gifmagier', vlucht: 'thoverk' };

  /* de landing uit plan par. 3, in ms vanaf klaar() (= plan-T 1,5 s) */
  const TL = {
    brand: 200, letter: 110,          /* T 1,7-2,6: SLAY LIT brandt in, 110 ms per letter */
    tagline: 1200,                    /* T 2,7: '~ voor het licht dooft ~' */
    vonken: 2700, vlucht: 900,        /* T 4,2: letters vallen uiteen, het kooltje stijgt 900 ms */
    onthul: 3600, onthulDuur: 1600,   /* T 5,1-6,7: radiaal masker + de kaart van 1,35 naar 1 */
    zwel: 3800,                       /* T 5,3-5,9: het kooltje zwelt tot de ember-ring */
    heldIn: 4400,                     /* T 5,9: de held verschijnt in de ring */
    topbalk: 5150,                    /* T 6,7: de topbalk schuift binnen (0,5 s) */
    vonk: 5700, vonkDuur: 450,        /* T 7,2: een vonk vliegt naar de fakkelchip */
    telDuur: 800,                     /* ... die telt van 0 tot S.fakkel */
    eind: 7000,                       /* T 8,5: speelbaar */
    /* poort dicht: de heldkeuze met voorselectie in plaats van de kaart */
    heldOnthulDuur: 1300, heldTopbalk: 3900, heldEind: 5000,
    /* reduced motion / lite / DEV-wereld: titel 1,2 s statisch, overvloeier 800 ms */
    rustTitel: 1200, rustVloei: 800,
    /* herbeleven: de sluier onthult het vorige scherm */
    terugAdem: 500, terugDuur: 1200
  };

  /* ---------- kleine hulpjes ---------- */
  const $id = id => document.getElementById(id);
  const lees = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const schrijf = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* opslag optioneel */ } };
  const leesJson = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const opslagWerkt = () => {
    try { localStorage.setItem('slayit_probe', '1'); localStorage.removeItem('slayit_probe'); return true; }
    catch (e) { return false; }
  };
  const rustig = () => !!((window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)
    || document.body.classList.contains('lite'));
  function mk(tag, cls, tekst) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (tekst != null) e.textContent = tekst;
    return e;
  }
  function muziek(scene) { try { if (window.Klank && Klank.muziek) Klank.muziek(scene); } catch (e) { /* stil */ } }
  function sfx(naam) { try { if (window.Klank && Klank.sfx) Klank.sfx(naam); } catch (e) { /* stil */ } }
  function schermMuziek(naam) {
    return (typeof SCHERM_MUZIEK !== 'undefined' && SCHERM_MUZIEK[naam]) || null;
  }
  function heldGeldig(id) { return typeof id === 'string' && typeof SPELERS !== 'undefined' && !!SPELERS[id]; }
  /* een hoofdstuk: een scène-index (0, 1, …) of een fase-id van de proloog ('factuur', 'val', …) */
  function geldigHoofdstuk(h) {
    if (Number.isInteger(h) && h >= 0 && h < 40) return h;
    if (typeof h === 'string' && /^\d{1,2}$/.test(h)) return parseInt(h, 10);
    if (typeof h === 'string' && /^[a-z]{2,20}$/.test(h)) return h;
    return undefined;
  }

  /* ============================================================
     GATE & POORTEN
     ============================================================ */

  /* moet een nieuwe speler de proloog nog zien? Nee zodra hij hem uitspeelde
     ('klaar', gezet bij de landing), oversloeg ('over') of de OUDE proloog uitspeelde
     (een contract zonder v:2 maar met een uitweg). */
  function proloogMoetSpelen() {
    if (lees(SLEUTEL.klaar) === '1' || lees(SLEUTEL.over)) return false;
    const c = leesJson(SLEUTEL.contract);
    if (c && typeof c === 'object' && c.v !== 2 && c.uitweg) return false;
    return true;
  }

  /* DE POORTEN vóór kiesHeldEcht — dat wist de save en bankt scherven. Direct landen
     mag alleen voor een écht nieuwe speler: geen lopende run (dus ook geen daily),
     en geen veteraan (runs, een opgeladen Schrijn, scherven, een gesmede kling of
     een ontgrendelde ascensie). Anders: de heldkeuze met het masker voorgeselecteerd. */
  function proloogMagDirect() {
    try { if (localStorage.getItem(SAVE_SLEUTEL)) return false; } catch (e) { return false; }
    const C = (typeof Codex !== 'undefined' && Codex) || {};
    if ((+C.runs || 0) > 0) return false;
    if (Array.isArray(C.opgeladen) && C.opgeladen.some(r => typeof RELIKWIEEN !== 'undefined' && RELIKWIEEN[r])) return false;
    if (Array.isArray(C.scherven) && C.scherven.length) return false;
    if (C.slachtblok && typeof C.slachtblok === 'object' && Object.keys(C.slachtblok).length) return false;
    try { if (typeof maxOntgrendeld === 'function' && maxOntgrendeld() >= 1) return false; } catch (e) { return false; }
    return true;
  }

  /* ============================================================
     LADEN (lui, gememoiseerd)
     ============================================================ */
  let _laden = null;
  function laadProloog() {
    if (window.Proloog && typeof window.Proloog.start === 'function') return Promise.resolve(window.Proloog);
    if (_laden) return _laden;
    /* de CSS laadt de proloog zelf in haar shadow root; hier alleen alvast de HTTP-cache
       warm (geen <link rel=preload>: die klaagt in de console als de speler niet start),
       zodat het eerste beeld na het zwarte doek meteen gestyled is (integratie R1) */
    try { if (window.fetch) fetch('proloog/proloog.css', { credentials: 'same-origin' }).catch(() => { /* de proloog wacht zelf max 2,5 s */ }); } catch (e) { /* geen fetch */ }
    /* F1: ook de fonts van de proloog (assets/fonts/fonts.css). De browser haalt een font pas
       op als er tekst in staat; zonder dit flitst de CRT-letter op het eerste beeld nog even
       in Courier (de game zelf gebruikt VT323 en Special Elite nergens vóór de proloog) */
    try {
      if (document.fonts && document.fonts.load) ['16px "VT323"', '16px "Special Elite"'].forEach(f => { document.fonts.load(f).catch(() => { /* terugvalfont */ }); });
    } catch (e) { /* geen FontFace-API */ }
    _laden = new Promise((ok, nee) => {
      let geladen = 0, af = false;
      const klaar = fout => {
        if (af) return;
        af = true; clearTimeout(wacht);
        if (fout) nee(fout);
        else if (window.Proloog && typeof window.Proloog.start === 'function') ok(window.Proloog);
        else nee(new Error('window.Proloog ontbreekt na het laden'));
      };
      const wacht = setTimeout(() => klaar(new Error('de proloog laadt te traag')), LAAD_GEDULD);
      BRONNEN.forEach(src => {
        const s = document.createElement('script');
        s.src = src;
        s.async = false;   /* volgorde bewaren: data → audio → proloog */
        s.dataset.proloog = '1';
        s.onload = () => { if (++geladen === BRONNEN.length) klaar(null); };
        s.onerror = () => klaar(new Error('laden mislukt: ' + src));
        document.body.appendChild(s);
      });
    });
    /* mislukt? Dan mag een volgende poging het opnieuw proberen (bv. weer online) */
    _laden.catch(() => {
      _laden = null;
      document.querySelectorAll('script[data-proloog]').forEach(s => { if (!(window.Proloog && window.Proloog.start)) s.remove(); });
    });
    return _laden;
  }

  /* ============================================================
     DE HEENWEG: titel → proloog
     ============================================================ */
  let bezig = false;          /* de heenweg of de proloog zelf loopt */
  const L = { bezig: false, timers: [], raf: 0, haken: [] };   /* de landing / terugkeer */

  function proloogBezig() { return bezig || L.bezig; }

  /* het doek van de heenweg: puur #07060a (css #toneel-doek.pl-zwart), hetzelfde zwart waarin
     de landing straks eindigt — het begin rijmt op het eind (F1: het gevechtsdoek #0b0509 is
     net paarser en liet de titel in zijn fade nog zwak doorschemeren) */
  function doek(aan, duur) {
    const d = $id('toneel-doek');
    if (!d) return;
    d.style.setProperty('--doek', '1');
    d.style.setProperty('--doek-t', duur + 's');
    if (aan) d.classList.add('pl-zwart');
    d.classList.toggle('aan', aan);
    if (!aan) setTimeout(() => {
      if (!d.classList.contains('aan')) { d.style.removeProperty('--doek'); d.style.removeProperty('--doek-t'); d.classList.remove('pl-zwart'); }
    }, duur * 1000 + 60);
  }
  function titelSchoon() { document.body.classList.remove('pl-dooft', 'pl-vlam'); }

  /* opts: { herbeleef, hoofdstuk, vanCodex } */
  function startProloog(opts) {
    opts = opts || {};
    if (proloogBezig()) return;
    const host = $id('scherm-proloog');
    const herbeleef = !!opts.herbeleef;
    const vanCodex = herbeleef && !!opts.vanCodex;
    if (!host) { if (!herbeleef && typeof toonHeldKeuze === 'function') toonHeldKeuze(); return; }
    bezig = true;
    const vorig = document.body.dataset.scherm || 'titel';
    const vorigeMuziek = (window.Klank && Klank.huidigeScene) || null;
    const hoofdstuk = geldigHoofdstuk(opts.hoofdstuk);

    /* de tik op 'Nieuw avontuur' ÍS het gebaar: audio ontgrendelen en fullscreen vragen
       nu het nog mag. De AudioContext en fullscreen blijven daarna gewoon staan. */
    try { if (window.Klank) { Klank.init(); if (Klank.hervat) Klank.hervat(); } } catch (e) { /* stil */ }
    const gebaar = !(navigator.userActivation && !navigator.userActivation.isActive);   /* de ?proloog=1-route heeft er geen */
    if (gebaar && window.mobiel && typeof wisselFullscreen === 'function') wisselFullscreen(true);
    muziek('stil');   /* het titelvuur dooft, de muziek mee */
    /* stond de fullscreen-/installnudge al op de titel (hij komt 1,2 s na de boot), dan
       mag hij niet over de proloog blijven hangen (iOS: geen fullscreen die hem sluit).
       Weg ermee; landingEinde biedt hem daarna opnieuw aan (integratie R1). */
    const nudge = $id('scherm-nudge');
    if (nudge) {
      nudge.remove();
      if (typeof toonSchermNudge === 'function') toonSchermNudge.uitgesteld = true;
    }

    const laden = laadProloog();
    const vanTitel = vorig === 'titel';
    const zacht = rustig();
    /* het titelvuur dooft (500 ms), het woordmerk gaat uit als een vlam (200 ms) */
    let totDoek = 0;
    if (vanTitel) {
      document.body.classList.add('pl-dooft');
      if (!zacht) setTimeout(() => { if (bezig) document.body.classList.add('pl-vlam'); }, 300);
      totDoek = zacht ? 300 : 500;
    }
    setTimeout(() => doek(true, zacht ? 0.2 : 0.12), totDoek);
    /* #toneel-doek blijft 400 ms zwart; tegen dan is de proloog er al (voorgeladen) */
    const zwart = new Promise(r => setTimeout(r, totDoek + 400));

    const herstel = () => {
      titelSchoon();
      if (vorig === 'titel' || vorig === 'proloog' || !$id('scherm-' + vorig)) { if (typeof naarTitel === 'function') naarTitel(); }
      else { toonScherm(vorig); if (vorigeMuziek) muziek(vorigeMuziek); }
    };

    Promise.all([laden, zwart]).then(([P]) => {
      titelSchoon();
      toonScherm('proloog');
      host.dataset.modus = document.body.dataset.modus || 'laptop';   /* de mobiele tak: :host([data-modus="mobiel"]) */
      let afgehandeld = false;
      const gestart = P.start({
        host,
        herbeleef,
        hoofdstuk,
        klaar: uitkomst => {
          if (afgehandeld) return;
          afgehandeld = true;
          if (herbeleef) terugNaHerbeleven(uitkomst && uitkomst.kooltje, herstel, false, vanCodex);
          else landingNaProloog(uitkomst);
        },
        over: () => {
          if (afgehandeld) return;
          afgehandeld = true;
          if (herbeleef) { terugNaHerbeleven(null, herstel, true, vanCodex); return; }
          /* hoort niet te gebeuren (de skip eindigt óók in de Afgrond), maar dan toch netjes */
          schrijf(SLEUTEL.over, '1');
          try { P.stop(); } catch (e) { /* al gestopt */ }
          bezig = false;
          toonHeldKeuze();
        }
      });
      if (gestart === false) throw new Error('Proloog.start() weigerde');
      doek(false, 0.35);
    }).catch(fout => {
      try { if (window.Proloog && Proloog.stop) Proloog.stop(); } catch (e) { /* niets te stoppen */ }
      bezig = false;
      doek(false, 0.3);
      if (window.console) console.warn('[proloog] ' + (fout && fout.message ? fout.message : fout));
      if (herbeleef) {
        herstel();
        if (vanCodex && typeof toonCodex === 'function') { try { toonCodex(); } catch (e) { /* de titel volstaat */ } }
        if (typeof melding === 'function') melding('📼 De proloog kon niet laden — probeer het zo nog eens.');
      }
      else { titelSchoon(); toonHeldKeuze(); }
    });
  }

  /* 'Nieuw avontuur' doet dit via startNieuw (game.js). De titelknop 'Proloog': wie hem
     nog nooit zag, speelt hem echt (met landing); wie hem kent, herbeleeft hem. */
  function proloogKnop() {
    if (opslagWerkt() && proloogMoetSpelen()) startProloog();
    else herbeleefProloog();
  }

  /* herbeleven (titel, DEV-menu, Codex per hoofdstuk): alleen in het geheugen — geen
     contract, geen save, nooit kiesHeldEcht. De sluier onthult daarna het vorige scherm. */
  function herbeleefProloog(hoofdstuk) {
    if (proloogBezig()) return;
    const ov = $id('overlay-codex');
    const vanCodex = !!(ov && ov.classList.contains('open'));   /* F1: daarna terug IN de Codex */
    if (ov) ov.classList.remove('open');
    if ($id('dev-menu') && typeof devMenuSluit === 'function') devMenuSluit();
    startProloog({ herbeleef: true, hoofdstuk: geldigHoofdstuk(hoofdstuk), vanCodex });
  }

  /* ============================================================
     DE LANDING (plan par. 3) — T 1,5 → 8,5 s
     ============================================================ */
  function lT(fn, ms) { L.timers.push(setTimeout(fn, ms)); }
  function lOp(el, ev, fn, cap) { el.addEventListener(ev, fn, cap); L.haken.push([el, ev, fn, cap]); }
  function lWis() {
    L.timers.forEach(clearTimeout); L.timers = [];
    if (L.raf) cancelAnimationFrame(L.raf); L.raf = 0;
    L.haken.forEach(([el, ev, fn, cap]) => el.removeEventListener(ev, fn, cap)); L.haken = [];
    (L.animaties || []).forEach(a => { try { a.cancel(); } catch (e) { /* al klaar */ } }); L.animaties = [];
  }
  function kooltjeGeldig(k) {
    const W = window.innerWidth, H = window.innerHeight;
    const maat = k && isFinite(k.maat) && k.maat >= 2 && k.maat <= 24 ? +k.maat : null;   /* de proloog geeft zijn kooltjesmaat mee */
    if (k && isFinite(k.x) && isFinite(k.y) && k.x >= 0 && k.y >= 0 && k.x <= W && k.y <= H) return { x: +k.x, y: +k.y, maat };
    return { x: W / 2, y: H * 0.6, maat };
  }
  function midden(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, b: r.width, h: r.height };
  }
  function zetKool(kool, x, y) { kool.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`; }

  function sluier() {
    let el = $id('proloog-sluier');
    if (!el) { el = mk('div'); el.id = 'proloog-sluier'; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el); }
    return el;
  }

  /* de sluier dicht, in één frame, met het kooltje op dezelfde plek als in de proloog */
  function bouwSluier(k, metTitel) {
    const el = sluier();
    el.textContent = '';
    el.removeAttribute('style');
    el.className = 'toon';
    const doekEl = mk('div', 'pl-doek');
    const gloed = mk('div', 'pl-gloed');
    const vonkLaag = mk('div', 'pl-vonklaag');
    el.appendChild(doekEl); el.appendChild(gloed); el.appendChild(vonkLaag);
    const d = { el, doek: doekEl, gloed, vonkLaag, titel: null, tagline: null, letters: [], kool: null };
    if (metTitel) {
      d.titel = mk('div', 'pl-titel');
      'SLAY LIT'.split('').forEach((c, i) => {
        if (c === ' ') { d.titel.appendChild(mk('span', 'pl-spatie')); return; }
        const l = mk('span', 'pl-letter' + (i > 4 ? ' pl-lit' : ''), c);
        d.titel.appendChild(l); d.letters.push(l);
      });
      d.tagline = mk('p', 'pl-tagline', '~ voor het licht dooft ~');
      el.appendChild(d.titel); el.appendChild(d.tagline);
      /* boven het kooltje, nooit erdoor: gemeten, niet geraden */
      const th = d.titel.offsetHeight, gh = d.tagline.offsetHeight, tussen = Math.round(th * 0.16);
      const blok = th + tussen + gh;
      let top = Math.min(window.innerHeight * 0.4 - blok / 2, k.y - Math.max(28, th * 0.4) - blok);
      top = Math.max(8, top);
      d.titel.style.top = top + 'px';
      d.tagline.style.top = (top + th + tussen) + 'px';
    }
    d.kool = mk('div', 'pl-kooltje');
    if (k.maat) d.kool.style.width = d.kool.style.height = k.maat + 'px';   /* exact het kooltje van de proloog */
    el.appendChild(d.kool);
    zetKool(d.kool, k.x, k.y);
    return d;
  }

  /* een radiaal masker opent het doek vanuit (cx, cy).
     F1 (creatief): de rand begint OP het kooltje (buitenrand r = 0) en loopt ease-out
     (1-(1-p)^3): de grond gaat open op het moment dat het kooltje landt. Vroeger startte hij
     op -zacht met een ease-in-out en zag je ±0,7 s alleen een stipje op zwart. */
  function onthul(doekEl, cx, cy, duur, klaar) {
    const W = window.innerWidth, H = window.innerHeight;
    const ver = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));
    const zacht = Math.max(48, ver * 0.22);
    const t0 = performance.now();
    const stap = nu => {
      const p = Math.min(1, Math.max(0, (nu - t0) / duur));
      const e = 1 - Math.pow(1 - p, 3);
      const buiten = (ver + zacht) * e;                  /* waar het zwart weer volledig is */
      const r = buiten - Math.min(zacht, buiten);        /* waar het volledig open is */
      const m = `radial-gradient(circle at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, transparent ${r.toFixed(1)}px, #000 ${Math.max(0.1, buiten).toFixed(1)}px)`;
      doekEl.style.webkitMaskImage = m;
      doekEl.style.maskImage = m;
      if (p < 1) L.raf = requestAnimationFrame(stap);
      else { L.raf = 0; doekEl.style.display = 'none'; if (klaar) klaar(); }
    };
    L.raf = requestAnimationFrame(stap);
  }

  function anim(el, frames, opts) {
    if (!el || !el.animate) return null;
    const a = el.animate(frames, opts);
    (L.animaties = L.animaties || []).push(a);
    return a;
  }

  /* de letters vallen uiteen in ±60 vonken */
  function strooiVonken(laag, letters, aantal) {
    if (!letters.length || !Element.prototype.animate) return;
    const per = Math.max(1, Math.round(aantal / letters.length));
    letters.forEach(l => {
      const r = l.getBoundingClientRect();
      for (let i = 0; i < per; i++) {
        const v = mk('i', 'pl-vonk-deeltje');
        const x = r.left + Math.random() * r.width, y = r.top + r.height * (0.2 + Math.random() * 0.65);
        const hoek = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.35;
        const ver = 30 + Math.random() * Math.max(90, r.height * 1.6);
        const dx = Math.cos(hoek) * ver, dy = Math.sin(hoek) * ver - 16;
        laag.appendChild(v);
        const a = v.animate([
          { transform: `translate(${x}px, ${y}px) scale(1)`, opacity: 1 },
          { transform: `translate(${x + dx * 0.6}px, ${y + dy * 0.6}px) scale(.85)`, opacity: 0.9, offset: 0.45 },
          { transform: `translate(${x + dx}px, ${y + dy + 24}px) scale(.3)`, opacity: 0 }
        ], { duration: 800 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' });
        a.onfinish = () => v.remove();
      }
    });
  }

  function zetFakkelChip(chip, n) {
    chip.innerHTML = `🔥 ${n}`;
    chip.style.background = `linear-gradient(90deg, rgba(255,140,60,.30) ${n}%, rgba(0,0,0,.35) ${n}%)`;
  }

  /* LANDING NA DE PROLOOG — de klaar()-callback van de eerste doorloop */
  function landingNaProloog(uitkomst) {
    const u = (uitkomst && typeof uitkomst === 'object') ? uitkomst : {};
    let held = heldGeldig(u.held) ? u.held : null;
    if (!held && typeof u.masker === 'string' && MASKER_HELD[u.masker]) held = MASKER_HELD[u.masker];
    if (!held) held = 'slachter';
    /* vangnet: de proloog schrijft het contract zelf, stapsgewijs. Ontbreekt het toch,
       dan bewaren we het meegegeven contract (anders valt de jeugddroom later stil weg). */
    if (u.contract && typeof u.contract === 'object' && !lees(SLEUTEL.contract)) {
      try { schrijf(SLEUTEL.contract, JSON.stringify(u.contract)); } catch (e) { /* stil */ }
    }
    schrijf(SLEUTEL.klaar, '1');   /* vanaf nu: 'Nieuw avontuur' = de heldkeuze */
    speelLanding(u.kooltje, held, {});
  }

  /* speelLanding(kooltje, heldId, { dev }) — ook de DEV-landing gebruikt dit */
  function speelLanding(kooltje, heldId, opties) {
    opties = opties || {};
    lWis();
    const k = kooltjeGeldig(kooltje);
    const zacht = rustig();
    Object.assign(L, { bezig: true, soort: 'run', held: heldGeldig(heldId) ? heldId : 'slachter', pad: null, kernGedaan: false,
      heldkeuzeGetoond: false, telKlaar: false, vlak: false, zacht, dev: !!opties.dev, naCodex: false });
    bezig = true;
    const s = L.sluier = bouwSluier(k, true);
    if (!zacht) document.body.classList.add('pl-landt');
    skipHaken(s.el);

    /* achter de sluier, onzichtbaar: de proloog stopt, de poorten beslissen, de run start */
    L.kern = () => {
      if (L.kernGedaan) return;
      L.kernGedaan = true;
      try { if (window.Proloog && Proloog.stop) Proloog.stop(); } catch (e) { /* al gestopt */ }
      L.pad = proloogMagDirect() ? 'kaart' : 'held';
      if (L.pad === 'kaart') {
        try {
          const inv = $id('seed-invoer'); if (inv) inv.value = '';   /* een verse run, geen oude seed uit het veld */
          kiesHeldEcht(L.held);
        } catch (e) {
          if (window.console) console.warn('[proloog] kiesHeldEcht faalde', e);
          L.pad = 'held';
        }
        /* de DEV-wereld (of wat renderKaartScherm ook koos): een gewone overvloeier */
        if (L.pad === 'kaart' && document.body.dataset.scherm !== 'kaart') L.vlak = true;
      }
      muziek('afgrond');   /* de muziek blijft stil; enkel een lage drone (40 Hz) ademt mee */
    };
    lT(() => {
      L.kern();
      if (L.zacht || L.vlak) { rustigPad(s); return; }
      if (L.pad === 'kaart') kaartPad(s, k); else heldPad(s, k);
    }, 0);
  }

  function skipHaken(el) {
    /* 'click' (niet pointerdown): anders valt de rest van dezelfde tik op een kaartknoop */
    lOp(el, 'click', e => { e.stopPropagation(); landingEinde(); });
    lOp(window, 'keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (['Enter', ' ', 'Escape', 'ArrowRight', 'ArrowDown'].indexOf(e.key) === -1) return;
      e.preventDefault(); e.stopPropagation();
      landingEinde();
    }, true);
    /* toestel gedraaid: de gemeten maten kloppen niet meer → meteen naar het eind.
       Alleen bij een echte breedtewissel (de adresbalk van mobiel verandert enkel de hoogte). */
    const b0 = window.innerWidth;
    lOp(window, 'resize', () => { if (Math.abs(window.innerWidth - b0) > 40) landingEinde(); });
  }

  function brandTitel(s) {
    s.letters.forEach((l, i) => lT(() => { l.classList.add('brand'); sfx('knisper'); }, TL.brand + i * TL.letter));
    lT(() => s.tagline.classList.add('toon'), TL.tagline);
  }
  function titelUiteen(s) {
    s.letters.forEach(l => { l.classList.remove('brand'); l.classList.add('weg'); });
    s.tagline.classList.add('weg');
    strooiVonken(s.vonkLaag, s.letters, 60);
    sfx('schitter');
  }

  /* HET HOOFDPAD: direct op de Act 1-kaart */
  function kaartPad(s, k) {
    const sk = $id('scherm-kaart');
    const heldEl = $id('kaart-held');
    const doel = midden(heldEl);
    if (!sk || !doel) { rustigPad(s); return; }
    /* de oorsprong van de schaal ligt op de held → de held blijft staan, de grond komt op je af */
    const skR = sk.getBoundingClientRect();
    sk.style.transition = 'none';
    sk.style.transformOrigin = `${(doel.x - skR.left).toFixed(1)}px ${(doel.y - skR.top).toFixed(1)}px`;
    sk.style.transform = 'scale(1.35)';
    const chip = $id('tb-fakkel');
    if (chip) zetFakkelChip(chip, 0);   /* de meter die jou mat, begint op nul */

    brandTitel(s);
    lT(() => {
      titelUiteen(s);
      s.kool.classList.add('vlieg');
      zetKool(s.kool, doel.x, doel.y);
    }, TL.vonken);
    lT(() => {
      onthul(s.doek, doel.x, doel.y, TL.onthulDuur);
      void sk.offsetWidth;
      sk.style.transition = `transform ${TL.onthulDuur}ms cubic-bezier(.22,.61,.36,1)`;
      sk.style.transform = 'scale(1)';
      document.body.classList.add('pl-onthul');
      const g = Math.max(220, doel.b * 7);
      s.gloed.style.width = s.gloed.style.height = g + 'px';
      s.gloed.style.transform = `translate(${doel.x - g / 2}px, ${doel.y - g / 2}px)`;
      anim(s.gloed, [{ opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 0 }], { duration: 2300, easing: 'ease-out', fill: 'forwards' });
      muziek('kaart');   /* de drone glijdt van 40 naar 55 Hz: geen knip, geen stilte */
    }, TL.onthul);
    lT(() => {
      s.kool.classList.add('ring');
      s.kool.style.width = s.kool.style.height = Math.round(doel.b) + 'px';
    }, TL.zwel);
    lT(() => {
      document.body.classList.add('pl-held-in');
      s.kool.classList.add('weg');
    }, TL.heldIn);
    lT(() => document.body.classList.add('pl-tb-in'), TL.topbalk);
    lT(() => fakkelVonk(s, doel), TL.vonk);
    lT(landingEinde, TL.eind);
  }

  /* een vonk vliegt van de held naar de fakkelchip, die van 0 tot S.fakkel telt */
  function fakkelVonk(s, van) {
    const chip = $id('tb-fakkel');
    const naar = midden(chip);
    const doelWaarde = (typeof S !== 'undefined' && S && isFinite(S.fakkel)) ? Math.max(0, Math.round(S.fakkel)) : 80;
    const tel = () => {
      if (!chip) return;
      const t0 = performance.now();
      let vorige = -1;
      const stap = () => {
        if (!L.bezig) return;
        const p = Math.min(1, (performance.now() - t0) / TL.telDuur);
        const n = Math.round(doelWaarde * (1 - Math.pow(1 - p, 2)));
        if (n !== vorige) {
          if (Math.floor(n / 10) !== Math.floor(Math.max(0, vorige) / 10)) sfx('warmtik');
          zetFakkelChip(chip, n); vorige = n;
        }
        if (p < 1) { lT(stap, 40); return; }
        L.telKlaar = true;
        if (typeof renderTopbalk === 'function') renderTopbalk();
        chip.classList.add('pl-fakkel-vol');
        setTimeout(() => chip.classList.remove('pl-fakkel-vol'), 900);
      };
      stap();
    };
    if (!naar || !Element.prototype.animate) { tel(); return; }
    const mx = (van.x + naar.x) / 2, my = Math.min(van.y, naar.y) - Math.max(40, Math.abs(van.x - naar.x) * 0.18);
    const baan = (o, s) => [
      { transform: `translate(${van.x}px, ${van.y}px) scale(${s})`, opacity: o },
      { transform: `translate(${mx}px, ${my}px) scale(${1.2 * s})`, opacity: o, offset: 0.5 },
      { transform: `translate(${naar.x}px, ${naar.y}px) scale(${0.5 * s})`, opacity: 0.2 * o }
    ];
    /* F1 (creatief): het slotbeeld van 'de meter die jou mat, is nu je licht' moet opvallen —
       een grotere vonk (css: 11 px laptop, 8 px telefoon) met een korte staart: twee gedempte
       kopieën die 40 en 80 ms later dezelfde baan volgen */
    [[0.25, 0.55, 80], [0.5, 0.75, 40]].forEach(([o, sc, vertraging]) => {
      const st = mk('i', 'pl-fakkelvonk pl-staart');
      s.vonkLaag.appendChild(st);
      const as = anim(st, baan(o, sc), { duration: TL.vonkDuur, delay: vertraging, easing: 'ease-in', fill: 'both' });
      if (as) as.onfinish = () => st.remove(); else st.remove();
    });
    const v = mk('i', 'pl-fakkelvonk');
    s.vonkLaag.appendChild(v);
    const a = anim(v, baan(1, 1), { duration: TL.vonkDuur, easing: 'ease-in', fill: 'forwards' });
    sfx('schitter');
    if (a) a.onfinish = () => { v.remove(); tel(); }; else tel();
  }

  /* POORT DICHT: de heldkeuze, met het masker voorgeselecteerd */
  function heldPad(s, k) {
    brandTitel(s);
    lT(() => {
      titelUiteen(s);
      toonHeldKeuzeVoorkeur();
      muziek('afgrond');   /* toonScherm('held') zette de titelmuziek al; die wacht nog even */
      const doel = midden(document.querySelector(`.held-kaart[data-held="${L.held}"] .held-art`))
        || midden(document.querySelector(`.held-kaart[data-held="${L.held}"]`))
        || { x: window.innerWidth / 2, y: window.innerHeight / 2, b: 56 };
      L.heldDoel = doel;
      s.kool.classList.add('vlieg');
      zetKool(s.kool, doel.x, doel.y);
    }, TL.vonken);
    lT(() => {
      const d = L.heldDoel;
      onthul(s.doek, d.x, d.y, TL.heldOnthulDuur);
      const g = Math.max(260, Math.min(520, d.b * 1.8));
      s.gloed.style.width = s.gloed.style.height = g + 'px';
      s.gloed.style.transform = `translate(${d.x - g / 2}px, ${d.y - g / 2}px)`;
      anim(s.gloed, [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0 }], { duration: 2000, easing: 'ease-out', fill: 'forwards' });
      muziek(schermMuziek('held') || 'titel');
      s.kool.classList.add('weg');
    }, TL.onthul);
    lT(() => document.body.classList.add('pl-tb-in'), TL.heldTopbalk);
    lT(landingEinde, TL.heldEind);
  }

  function toonHeldKeuzeVoorkeur() {
    if (L.heldkeuzeGetoond) return;
    L.heldkeuzeGetoond = true;
    try { toonHeldKeuze({ voorkeur: L.held }); } catch (e) { if (window.console) console.warn('[proloog] heldkeuze', e); }
  }

  /* REDUCED MOTION / LITE / DEV-WERELD: geen schaal, geen vonken; de titel staat 1,2 s
     statisch, daarna een overvloeier van 800 ms. De rest staat er meteen. */
  function rustigPad(s) {
    document.body.classList.remove('pl-landt', 'pl-onthul', 'pl-held-in', 'pl-tb-in');
    const sk = $id('scherm-kaart');
    if (sk) { sk.style.transition = ''; sk.style.transform = ''; sk.style.transformOrigin = ''; }
    if (L.pad === 'held') toonHeldKeuzeVoorkeur();
    if (L.pad === 'kaart' && typeof renderTopbalk === 'function') renderTopbalk();
    L.telKlaar = true;
    s.titel.classList.add('statisch');
    s.tagline.classList.add('toon', 'direct');
    s.kool.classList.add('weg', 'direct');
    lT(() => {
      s.el.style.transition = `opacity ${TL.rustVloei}ms ease`;
      s.el.style.opacity = '0';
      muziek(schermMuziek(document.body.dataset.scherm) || 'kaart');
    }, TL.rustTitel);
    lT(landingEinde, TL.rustTitel + TL.rustVloei);
  }

  /* HET EIND (ook bij een tik vanaf T 1,5): de eindstaat, gegarandeerd */
  function landingEinde() {
    if (!L.bezig) return;
    if (L.kern && !L.kernGedaan) L.kern();
    L.bezig = false;
    lWis();
    if (L.soort === 'run' && L.pad === 'held') toonHeldKeuzeVoorkeur();
    const sk = $id('scherm-kaart');
    if (sk) { sk.style.transition = ''; sk.style.transform = ''; sk.style.transformOrigin = ''; }
    document.body.classList.remove('pl-landt', 'pl-onthul', 'pl-held-in', 'pl-tb-in');
    const el = sluier();
    el.className = ''; el.textContent = ''; el.removeAttribute('style');
    if (L.soort === 'run') {
      if (L.pad === 'kaart' && !L.telKlaar && typeof renderTopbalk === 'function') renderTopbalk();
      if (typeof zetLichtVisueel === 'function') zetLichtVisueel();
      const m = schermMuziek(document.body.dataset.scherm);
      if (m) muziek(m);
    }
    L.sluier = null; L.kern = null;
    bezig = false;
    /* herbeleven vanuit de Codex: terug IN de Codex (F1), zodat je hoofdstuk na hoofdstuk kunt kijken */
    if (L.soort === 'herbeleef' && L.naCodex) {
      L.naCodex = false;
      try { if (typeof toonCodex === 'function') toonCodex(); } catch (e) { /* dan de titel */ }
    }
    /* de fullscreen-/installnudge werd tijdens de proloog uitgesteld. F1 (review): niet over
       het eerste speelbare moment van een verse run (de kaart, net na de landing), maar bij de
       volgende rustige schermwissel: terug naar de titel, of terug op de kaart na de eerste knoop. */
    if (typeof toonSchermNudge === 'function' && toonSchermNudge.uitgesteld) {
      if (L.soort === 'run' && document.body.dataset.scherm === 'kaart') nudgeLater();
      else { toonSchermNudge.uitgesteld = false; setTimeout(toonSchermNudge, 1500); }
    }
  }
  function nudgeLater() {
    if (!window.MutationObserver) return;   /* dan komt hij bij de volgende boot */
    let weg = false;
    const mo = new MutationObserver(() => {
      const s = document.body.dataset.scherm;
      if (s !== 'kaart' && s !== 'titel') { weg = true; return; }
      if (s === 'kaart' && !weg) return;
      mo.disconnect();
      setTimeout(() => {
        if (!toonSchermNudge.uitgesteld) return;
        const nu = document.body.dataset.scherm;
        if (proloogBezig() || (nu !== 'kaart' && nu !== 'titel')) { nudgeLater(); return; }   /* intussen al verder: volgende keer */
        toonSchermNudge.uitgesteld = false;
        toonSchermNudge();
      }, 1500);
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ['data-scherm'] });
  }

  /* HERBELEVEN: de sluier onthult het vorige scherm (geen titel, geen run) */
  function terugNaHerbeleven(kooltje, herstel, snel, naCodex) {
    lWis();
    const k = kooltjeGeldig(kooltje);
    Object.assign(L, { bezig: true, soort: 'herbeleef', pad: null, kernGedaan: false, zacht: rustig(), naCodex: !!naCodex });
    const s = L.sluier = bouwSluier(k, false);
    if (snel) s.kool.classList.add('weg', 'direct');
    skipHaken(s.el);
    L.kern = () => {
      if (L.kernGedaan) return;
      L.kernGedaan = true;
      try { if (window.Proloog && Proloog.stop) Proloog.stop(); } catch (e) { /* al gestopt */ }
      try { herstel(); } catch (e) { if (typeof naarTitel === 'function') naarTitel(); }
    };
    lT(() => L.kern(), 0);
    if (snel || L.zacht) {
      lT(() => { s.el.style.transition = `opacity ${snel ? 400 : TL.rustVloei}ms ease`; s.el.style.opacity = '0'; }, snel ? 60 : TL.terugAdem);
      lT(landingEinde, (snel ? 60 + 400 : TL.terugAdem + TL.rustVloei));
      return;
    }
    lT(() => { onthul(s.doek, k.x, k.y, TL.terugDuur); s.kool.classList.add('weg'); }, TL.terugAdem);
    lT(landingEinde, TL.terugAdem + TL.terugDuur + 60);
  }

  /* ============================================================
     DE HELDKEUZE MET VOORSELECTIE (haak in toonHeldKeuze)
     ============================================================ */
  function markeerHeldVoorkeur(id) {
    if (!heldGeldig(id)) return;
    const kaart = document.querySelector(`.held-kaart[data-held="${id}"]`);
    if (!kaart) return;
    kaart.classList.add('voorkeur');
    /* in beeld: past het portret, dan gecentreerd; is het hoger dan het scherm (liggend 360 px),
       dan zo dat 'Speel als …' volledig zichtbaar is — dat is de ene klik die nog rest */
    const scroller = $id('scherm-held');
    const knop = kaart.querySelector('.held-kies');
    if (!scroller || !knop) { try { kaart.scrollIntoView({ block: 'center' }); } catch (e) { /* stil */ } return; }
    const sR = scroller.getBoundingClientRect(), kR = kaart.getBoundingClientRect(), bR = knop.getBoundingClientRect();
    const artR = (kaart.querySelector('.held-art') || kaart).getBoundingClientRect();
    const boven = Math.min(kR.top, artR.top);   /* de held torent boven zijn paneel uit */
    let delta;
    if (kR.bottom - boven <= sR.height - 16) delta = (boven + kR.bottom) / 2 - (sR.top + sR.height / 2);
    else delta = bR.bottom - (sR.bottom - Math.max(16, sR.height * 0.06));
    scroller.scrollTop = Math.max(0, scroller.scrollTop + delta);
  }

  /* ============================================================
     CODEX: de proloog herbeleven, per hoofdstuk
     De hoofdstukken wonen in de proloog zelf (Proloog.hoofdstukken = [{ hoofdstuk, naam }],
     hoofdstuk = een scène-index of een fase-id zoals 'factuur'). Vóór het laden tonen we
     wat de proloog-save als gezien markeerde; na het laden de echte lijst: alles als je
     hem uitspeelde, anders de gezien-scènes.
     ============================================================ */
  const HOOFDSTUK_TERUGVAL = {
    overzicht: 'Een Productief Leven™', boot: 'B.A.A.S. start op', kantoor: 'Het kantoor',
    gesprek: 'Het Functioneringsgesprek', breekpunt: 'De Eindafrekening', afdaling: 'De Afgrond'
  };
  function gezienHoofdstukken() {
    const d = leesJson(SLEUTEL.save);
    const g = d && Array.isArray(d.gezien) ? d.gezien : [];
    return [...new Set(g.map(n => parseInt(n, 10)).filter(n => Number.isInteger(n) && n >= 0 && n < 40))].sort((a, b) => a - b);
  }
  function proloogGezien() {
    if (lees(SLEUTEL.klaar) === '1' || lees(SLEUTEL.over)) return true;
    const c = leesJson(SLEUTEL.contract);
    return !!(c && typeof c === 'object' && c.uitweg) || gezienHoofdstukken().length > 0;
  }
  /* de volledige lijst uit de geladen proloog, genormaliseerd naar { id, naam, nr } (of null) */
  function proloogHoofdstukken() {
    let lijst = null;
    try {
      if (window.Proloog && Array.isArray(window.Proloog.hoofdstukken)) lijst = window.Proloog.hoofdstukken;
      else if (window.SLAYLIT_PROLOOG && Array.isArray(window.SLAYLIT_PROLOOG.HOOFDSTUKKEN)) lijst = window.SLAYLIT_PROLOOG.HOOFDSTUKKEN;
    } catch (e) { lijst = null; }
    if (!lijst) return null;
    return lijst.map((h, i) => {
      const o = (h && typeof h === 'object') ? h : { hoofdstuk: i, naam: h };
      return { id: geldigHoofdstuk(o.hoofdstuk !== undefined ? o.hoofdstuk : i), naam: String(o.naam || o.titel || ''), nr: i + 1 };
    }).filter(h => h.id !== undefined);
  }
  function zichtbareHoofdstukken() {
    const gezien = gezienHoofdstukken();
    const lijst = proloogHoofdstukken();
    if (!lijst) {
      const D = window.SLAYLIT_PROLOOG;
      return gezien.map(i => {
        const sc = D && Array.isArray(D.scenes) ? D.scenes[i] : null;
        return { id: i, naam: (sc && (sc.titel || HOOFDSTUK_TERUGVAL[sc.kind])) || '', nr: i + 1 };
      });
    }
    if (lees(SLEUTEL.klaar) === '1') return lijst;
    return lijst.filter(h => typeof h.id === 'number' && gezien.indexOf(h.id) !== -1);
  }
  /* knoppen via DOM + data-attribuut (de naam komt als textContent binnen) */
  function vulHoofdstukken(houder) {
    if (!houder || !houder.isConnected) return;
    const lijst = zichtbareHoofdstukken();
    houder.textContent = '';
    lijst.forEach(h => {
      const b = mk('button', 'knop-stil pl-hfst', `${h.nr} · ${h.naam || 'Hoofdstuk ' + h.nr}`);
      b.type = 'button';
      b.dataset.plHoofdstuk = String(h.id);
      houder.appendChild(b);
    });
    houder.hidden = !lijst.length;
  }
  function proloogCodexBlok() {
    if (!proloogGezien()) return '';
    setTimeout(() => {
      const houder = $id('codex-pl-hfst');
      vulHoofdstukken(houder);
      laadProloog().then(() => vulHoofdstukken(houder)).catch(() => { /* de terugvallijst blijft staan */ });
    }, 0);
    return `
    <h3 class="codex-kop">📼 Een Productief Leven™</h3>
    <p class="codex-loopbaan">Vijfentwintig jaar, in één proloog. <button type="button" class="knop-stil" data-pl-hoofdstuk="">📼 Proloog herbeleven</button></p>
    <div class="codex-pl-hoofdstukken" id="codex-pl-hfst" hidden></div>`;
  }
  /* één gedelegeerde handler: data-attribuut, nooit data in een onclick-string */
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('[data-pl-hoofdstuk]');
    if (!b) return;
    const v = b.dataset.plHoofdstuk;
    herbeleefProloog(v === '' ? undefined : v);
  });

  /* ============================================================
     OPSTART: de ?proloog=1-route (van de stub proloog/index.html) en het voorladen
     ============================================================ */
  function checkProloogLink() {
    let p;
    try { p = new URLSearchParams(location.search); } catch (e) { return; }
    if (!p.has('proloog')) return;
    p.delete('proloog');
    try {
      const q = p.toString();
      history.replaceState(history.state, '', location.pathname + (q ? '?' + q : '') + location.hash);
    } catch (e) { /* dan blijft de parameter staan; onschuldig */ }
    if (document.body.dataset.scherm !== 'titel') return;
    proloogKnop();
  }
  let _voorgeladen = false;   /* één poging per sessie (pointerover vuurt vaak) */
  function voorladen() {
    if (_voorgeladen || proloogBezig()) return;
    if (!opslagWerkt() || !proloogMoetSpelen()) return;
    _voorgeladen = true;
    laadProloog().catch(() => { _voorgeladen = false; /* bij de klik opnieuw */ });
  }
  window.addEventListener('DOMContentLoaded', () => {
    checkProloogLink();
    /* voorladen: bij de intentie (hover/focus/aanraking op de titelknoppen) en anders
       na een rustige pauze op de titel — zodat het zwart na de tik niet op het net wacht */
    const titel = $id('scherm-titel');
    if (titel) {
      const intentie = e => { if (e.target && e.target.closest && e.target.closest('.titel-knoppen button')) voorladen(); };
      titel.addEventListener('pointerover', intentie);
      titel.addEventListener('pointerdown', intentie);
      titel.addEventListener('focusin', intentie);
    }
    setTimeout(() => { if (document.body.dataset.scherm === 'titel') voorladen(); }, 6000);
  });

  /* ============================================================
     DEV-SHORTCUT: de landing afspelen zonder de proloog (DEV-menu → '🛬 De landing').
     Zet 'slayit_proloog_klaar' NIET. Zonder lopende run en als nieuwe speler start dit
     een nieuwe run (de poorten gelden gewoon), anders de heldkeuze met voorselectie.
     Vóór release weg: zie RELEASE-CHECKLIST.md.
     ============================================================ */
  function devLanding(held) {
    if (proloogBezig()) return;
    speelLanding({ x: window.innerWidth / 2, y: window.innerHeight * 0.6 }, heldGeldig(held) ? held : 'gifmagier', { dev: true });
  }

  /* ---------- naar buiten ---------- */
  Object.assign(window, {
    laadProloog, startProloog, herbeleefProloog, proloogKnop, landingNaProloog, speelLanding,
    proloogMoetSpelen, proloogMagDirect, proloogBezig, markeerHeldVoorkeur, proloogCodexBlok,
    devLanding   /* DEV-SHORTCUT */
  });
})();
