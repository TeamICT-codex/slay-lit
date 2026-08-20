/* SLAY LIT — Proloog · vanilla motor (herbouw aug 2026, geen React/Babel meer).
   Zes scènes uit window.SLAYLIT_PROLOOG (data.js), sfeer uit window.SLAYLIT_AUDIO
   (audio.js). Mobiel-eerst: geen vaste 1280×800-stage meer, elke scène is
   responsief opgebouwd (zie proloog.css).

   CONTRACT MET DE GAME (ongewijzigd, zie ook js/game.js startNieuw + js/outro.js):
   - 'slayit_proloog'      = { jeugddroom, uitweg: 'sprong'|'geduwd', held } —
     geschreven zodra de uitweg vaststaat (einde Functioneringsgesprek), en
     bijgewerkt bij elke latere keuze (held komt nu rechtstreeks uit de app;
     het oude brug-script is daarmee overbodig).
   - 'slayit_proloog_over' = '1' — alleen via de ⏭-skipknop.
   - 'slaylit_proloog_v2'  = eigen voortgang { idx, choices, maxReached }
     (zelfde sleutel + vorm als de React-versie → half afgewerkte runs hervatten).
   Alle storage-toegang in try/catch: volle/privé-modus mag nooit crashen.
   Spelersinvoer (jeugddroom, bijnaam) gaat ALTIJD via textContent, nooit via
   innerHTML of inline handlers (de bekende backslash-bugklasse). */
(function () {
  'use strict';
  const STORY = window.SLAYLIT_PROLOOG;
  const AU = window.SLAYLIT_AUDIO;
  const STORE = 'slaylit_proloog_v2';
  const AANTAL = STORY.scenes.length;

  /* ---------- staat + persistentie ---------- */
  function klem(n) { n = parseInt(n, 10) || 0; return Math.max(0, Math.min(AANTAL - 1, n)); }
  let P = { idx: 0, choices: {}, maxReached: 0 };
  try {
    const d = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (d && typeof d === 'object') {
      P = { idx: klem(d.idx), choices: (d.choices && typeof d.choices === 'object') ? d.choices : {}, maxReached: klem(d.maxReached) };
    }
  } catch (e) {}
  function bewaar() { try { localStorage.setItem(STORE, JSON.stringify(P)); } catch (e) {} }
  function schrijfContract() {
    if (!P.choices.val) return;
    try {
      const c = {
        jeugddroom: String(P.choices.jeugddroom || '').slice(0, 60),
        uitweg: P.choices.val === 'gesprongen' ? 'sprong' : 'geduwd'
      };
      if (P.choices.held) c.held = String(P.choices.held);
      localStorage.setItem('slayit_proloog', JSON.stringify(c));
    } catch (e) {}
    toonDaalAf();
  }
  function zetKeuze(k, v) { P.choices[k] = v; bewaar(); schrijfContract(); }
  function heeftContract() { try { return !!localStorage.getItem('slayit_proloog'); } catch (e) { return false; } }

  /* ---------- timers: per scène opgeruimd ---------- */
  let timers = [];
  function T(fn, ms) { const id = setTimeout(fn, ms); timers.push(id); return id; }
  function wisTimers() { timers.forEach(clearTimeout); timers = []; }

  /* ---------- DOM-hulpjes ---------- */
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
      img.src = src; img.alt = ''; img.draggable = false; img.className = 'art-img';
      img.onerror = function () { img.remove(); houder.appendChild(el('span', 'art-ph', ph || '·')); };
      houder.appendChild(img);
    } else {
      houder.appendChild(el('span', 'art-ph', ph || '·'));
    }
    return houder;
  }
  function knop(cls, tekst, fn) { const b = el('button', cls, tekst); b.onclick = fn; return b; }
  function interp(tmpl, data) { return (tmpl || '').replace(/\{(\w+)\}/g, (_, k) => (data[k] != null ? data[k] : '…')); }

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

  /* ---------- scène-router ---------- */
  function render() {
    wisTimers();
    if (AU) { AU.heartStop(); AU.noiseOff(); AU.droneOff(); }
    const scene = STORY.scenes[P.idx];
    const wrap = document.getElementById('scene');
    wrap.innerHTML = '';
    wrap.className = 'scene scene-' + scene.kind;
    document.body.dataset.scene = scene.kind;
    SCENES[scene.kind](scene, wrap);
    tekenNav(scene);
    if (AU) {
      if (['overzicht', 'boot', 'kantoor', 'gesprek', 'breekpunt'].includes(scene.kind)) AU.humOn();
      else AU.humOff();
    }
    toonDaalAf();
  }
  function ga(n) {
    if (n < 0 || n >= AANTAL) return;
    P.idx = n; P.maxReached = Math.max(P.maxReached, n); bewaar(); render();
  }
  function verder() { ga(P.idx + 1); }
  function herstart() { P = { idx: 0, choices: {}, maxReached: 0 }; bewaar(); render(); }
  /* NB: herstart wist BEWUST 'slayit_proloog' niet — de game-gate blijft open. */

  /* ---------- onder-nav ---------- */
  function tekenNav(scene) {
    const nav = document.getElementById('proloog-nav');
    nav.innerHTML = '';
    nav.appendChild(knop('nav-knop', '◂', () => ga(P.idx - 1)));
    nav.lastChild.disabled = P.idx === 0;
    nav.lastChild.setAttribute('aria-label', 'Terug');
    const dots = el('div', 'dots');
    for (let i = 0; i < AANTAL; i++) {
      const d = knop('dot' + (i === P.idx ? ' aan' : ''), '', () => ga(i));
      d.disabled = i > P.maxReached;
      d.setAttribute('aria-label', 'Scène ' + (i + 1));
      dots.appendChild(d);
    }
    nav.appendChild(dots);
    if (scene.kind === 'kantoor') {
      nav.appendChild(el('span', 'nav-hint', 'klik om door te lezen'));
    } else {
      const v = knop('nav-knop sterk', 'Verder ▸', verder);
      v.disabled = P.idx >= AANTAL - 1;
      nav.appendChild(v);
    }
    if (AU) {
      const m = knop('nav-knop nav-mute', AU.isMuted() ? '🔇' : '🔊', () => {
        AU.unlock(); AU.setMute(!AU.isMuted());
        m.textContent = AU.isMuted() ? '🔇' : '🔊';
        m.title = AU.isMuted() ? 'Geluid aan' : 'Geluid uit';
      });
      m.title = AU.isMuted() ? 'Geluid aan' : 'Geluid uit';
      nav.appendChild(m);
    }
  }

  /* ---------- vaste knoppen: skip + daal af ---------- */
  function toonDaalAf() {
    const b = document.getElementById('knop-daalaf');
    if (b) b.style.display = heeftContract() ? 'block' : 'none';
  }
  function initVasteKnoppen() {
    document.getElementById('knop-skip').onclick = function () {
      try { localStorage.setItem('slayit_proloog_over', '1'); } catch (e) {}
      location.href = '../';
    };
    document.getElementById('knop-daalaf').onclick = function () { location.href = '../'; };
  }

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
    scherm.appendChild(el('span', 'ovm-prompt', '▸ ' + scene.prompt));
    bezel.appendChild(scherm);
    monitor.appendChild(bezel);
    monitor.appendChild(el('span', 'ovm-voet'));
    zoom.appendChild(monitor);
    wrap.appendChild(zoom);

    const kicker = el('div', 'ov-kicker', scene.kicker);
    kicker.appendChild(el('span', '', scene.klok));
    wrap.appendChild(kicker);
    wrap.appendChild(maakBadge(scene.badge));
    wrap.appendChild(el('div', 'ov-hint', scene.hint));

    function duik() {
      if (gedoken) return; gedoken = true;
      if (AU) { AU.unlock(); AU.powerOn(); }
      wrap.classList.add('dive');
      T(verder, 1150);
    }
  }

  /* de naamkaart: pasfoto via camera of upload (blijft bewaard in choices) */
  function maakBadge(badge) {
    const kaart = el('div', 'badge');
    kaart.appendChild(el('span', 'badge-clip'));
    kaart.appendChild(el('div', 'badge-kop', badge.merk));
    const rij = el('div', 'badge-rij');
    const foto = knop('pasfoto' + (P.choices.pasfoto ? ' vol' : ''), '', openCam);
    foto.title = 'Neem je pasfoto';
    zetFoto();
    function zetFoto() {
      foto.innerHTML = '';
      if (P.choices.pasfoto) {
        const img = document.createElement('img');
        img.src = P.choices.pasfoto; img.alt = 'pasfoto';
        foto.appendChild(img); foto.classList.add('vol');
      } else {
        const leeg = el('span', 'pf-leeg');
        leeg.appendChild(el('span', '', '📷'));
        leeg.appendChild(el('span', '', 'PASFOTO'));
        foto.appendChild(leeg);
      }
    }
    rij.appendChild(foto);
    const info = el('div', 'badge-info');
    info.appendChild(el('b', '', badge.mw));
    info.appendChild(el('span', '', badge.rol));
    info.appendChild(el('span', 'badge-streep'));
    rij.appendChild(info);
    kaart.appendChild(rij);

    const acties = el('div', 'badge-acties');
    acties.appendChild(knop('', '📷 Camera', openCam));
    const upload = knop('', '⬆ Upload', () => file.click());
    const file = document.createElement('input');
    file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
    file.onchange = function () {
      const f = file.files && file.files[0]; if (!f) return;
      const img = new Image();
      img.onload = () => { zetPasfoto(crop(img)); };
      img.src = URL.createObjectURL(f);
    };
    acties.appendChild(upload); acties.appendChild(file);
    kaart.appendChild(acties);
    const foutRij = el('div', 'badge-fout');
    kaart.appendChild(foutRij);

    function zetPasfoto(dataUrl) { zetKeuze('pasfoto', dataUrl); zetFoto(); }
    function crop(bron) {
      const sw = bron.videoWidth || bron.naturalWidth || bron.width;
      const sh = bron.videoHeight || bron.naturalHeight || bron.height;
      const s = Math.min(sw, sh);
      const c = document.createElement('canvas'); c.width = c.height = 240;
      c.getContext('2d').drawImage(bron, (sw - s) / 2, (sh - s) / 2, s, s, 0, 0, 240, 240);
      return c.toDataURL('image/jpeg', 0.72);
    }
    let stream = null;
    function stop() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } }
    function openCam() {
      foutRij.textContent = '';
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        foutRij.textContent = 'Camera geweigerd — gebruik Upload.'; return;
      }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }).then(s => {
        stream = s;
        const modal = el('div', 'cam-modal');
        const box = el('div', 'cam-box');
        box.onclick = e => e.stopPropagation();
        const video = document.createElement('video');
        video.className = 'cam-video'; video.playsInline = true; video.muted = true;
        video.srcObject = s; video.play().catch(() => {});
        box.appendChild(video);
        const rij2 = el('div', 'cam-acties');
        rij2.appendChild(knop('knop-billable', '📸 Vastleggen', () => {
          if (video.videoWidth) zetPasfoto(crop(video));
          sluit();
        }));
        rij2.appendChild(knop('knop-niet-billable', 'Annuleer', sluit));
        box.appendChild(rij2);
        modal.appendChild(box);
        modal.onclick = sluit;
        document.getElementById('scene').appendChild(modal);
        function sluit() { stop(); modal.remove(); }
      }).catch(() => { foutRij.textContent = 'Camera geweigerd — gebruik Upload.'; });
    }
    return kaart;
  }

  /* ═══════════════ SCÈNE · boot (CRT-opstart) ═══════════════ */
  function sceneBoot(scene, wrap) {
    const b = el('div', 'boot');
    b.onclick = verder;
    b.appendChild(el('div', 'boot-poweron'));
    b.appendChild(el('div', 'boot-jingle', scene.jingle));
    b.appendChild(el('h1', 'boot-wordmark', scene.wordmark));
    b.appendChild(el('div', 'boot-tm', scene.tm));
    b.appendChild(el('div', 'boot-baas', scene.baas));
    const cta = el('div', 'boot-cta');
    /* stopPropagation: de klik mag niet óók de boot-container raken (dubbele verder) */
    cta.appendChild(knop('knop-groot', scene.cta, e => { e.stopPropagation(); verder(); }));
    b.appendChild(cta);
    b.appendChild(el('div', 'boot-version', scene.version));
    wrap.appendChild(b);
  }

  /* ═══════════════ SCÈNE · kantoor (de beat-machine) ═══════════════ */
  function sceneKantoor(scene, wrap) {
    const beats = scene.beats;
    let stap = 0, meter = scene.meterStart || 0, actieveTyp = null, wachtend = false;
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

    /* rail (rechts op laptop, onder de terminal op mobiel) */
    const railData = scene.rail;
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
      const naamEl = el('b', '', lid.id === 'glenn' ? (P.choices.glennBijnaam || lid.naam) : lid.naam);
      if (lid.toon === 'kiss') {
        const pen = knop('bijnaam-pen', '✎', () => bijnaamEdit(lid, naamEl));
        pen.title = 'geef hem een bijnaam';
        naamEl.appendChild(pen);
      }
      txt.appendChild(naamEl);
      txt.appendChild(el('span', '', lid.rol + (lid.toon === 'kiss' ? ' · pluimstrijker' : '')));
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

    function bijnaamEdit(lid, naamEl) {
      const oud = P.choices.glennBijnaam || lid.naam;
      const inp = document.createElement('input');
      inp.className = 'bijnaam-invoer'; inp.maxLength = 18;
      inp.value = oud === lid.naam ? '' : oud;
      const bewaarNaam = () => {
        const v = (inp.value || '').trim() || lid.naam;
        zetKeuze('glennBijnaam', v);
        naamEl.textContent = v;
        const pen = knop('bijnaam-pen', '✎', () => bijnaamEdit(lid, naamEl));
        pen.title = 'geef hem een bijnaam';
        naamEl.appendChild(pen);
      };
      inp.onblur = bewaarNaam;
      inp.onkeydown = e => { if (e.key === 'Enter') inp.blur(); };
      naamEl.textContent = '';
      naamEl.appendChild(inp);
      inp.focus();
    }

    /* — de beat-machine — */
    const PASSIEF = { sys: 1, baas: 1, jij: 1, mark: 1, warm: 1, fluister: 1 };
    const KLASSE = { baas: 'tl-baas', sys: 'tl-sys tl-prompt', jij: 'tl-jij tl-prompt', mark: 'tl-mark', warm: 'tl-baas', fluister: 'tl-fluister' };

    function speelBeat() {
      if (stap >= beats.length) return;
      const beat = beats[stap];
      wachtend = false; actieveTyp = null;

      if (PASSIEF[beat.type]) {
        if (AU && beat.type === 'warm') AU.warm();
        const tekst = beat.tmpl ? interp(beat.tmpl, data()) : (beat.text || '');
        const p = el('p', 'term-line ' + (KLASSE[beat.type] || 'tl-baas') + ' caret');
        log.appendChild(p);
        log.scrollTop = log.scrollHeight;
        const cps = beat.type === 'fluister' ? 16 : 24;
        const pauze = beat.type === 'sys' ? 300 : beat.type === 'fluister' ? 700 : 560;
        actieveTyp = typMachine(p, tekst, cps, beat.type === 'baas' || beat.type === 'sys', () => {
          log.scrollTop = log.scrollHeight;
          wachtend = true;
          T(() => { p.classList.remove('caret'); volgende(); }, pauze);
        });
      } else if (beat.type === 'collega') {
        const lid = (railData.team || []).find(m => m.id === beat.who);
        if (lid && lid.portret) {
          const naam = lid.id === 'glenn' ? (P.choices.glennBijnaam || lid.naam) : lid.naam;
          const kaart = el('div', 'spreker-kaart');
          const portret = el('div', 'sk-portret');
          portret.appendChild(art(lid.portret, lid.emoji, 'sk-img'));
          const plaat = el('span', 'sk-plaat', naam);
          plaat.appendChild(el('i', '', lid.rol));
          portret.appendChild(plaat);
          kaart.appendChild(portret);
          kaart.appendChild(el('div', 'sk-zin', beat.text));
          wrap.appendChild(kaart);
          T(() => { kaart.remove(); volgende(); }, 2600);
        } else if (lid) {
          const bubbel = el('div', 'collega-bubble ' + (lid.toon === 'kiss' ? 'cb-kiss' : 'cb-neutraal'), beat.text);
          bubbel.appendChild(el('span', 'cb-tail'));
          teamEl[beat.who].classList.add('speaking');
          teamEl[beat.who].appendChild(bubbel);
          T(() => { bubbel.remove(); teamEl[beat.who].classList.remove('speaking'); volgende(); }, 2600);
        } else { volgende(); }
      } else if (beat.type === 'meter') {
        zetMeter(beat.to, beat.label || '');
        T(() => { zetMeter(meter); volgende(); }, 1100);
      } else if (beat.type === 'glitch') {
        if (AU) AU.glitch();
        const frame = el('div', 'glitch-frame');
        frame.appendChild(el('p', '', beat.text));
        wrap.appendChild(frame);
        T(() => { frame.remove(); volgende(); }, 1500);
      } else if (beat.type === 'actie') {
        beat.knoppen.forEach(k => {
          const b = knop(k.soort === 'billable' ? 'knop-billable' : 'knop-niet-billable', k.label, () => kiesActie(k));
          if (k.units) b.appendChild(el('span', 'u', k.units));
          actieVak.appendChild(b);
        });
        if (beat.knoppen.some(k => k.id === 'foto')) {
          fotoVak.classList.add('pulse');
          fotoVak.onclick = () => kiesActie(beat.knoppen.find(k => k.id === 'foto'));
        }
        log.scrollTop = log.scrollHeight;
      } else if (beat.type === 'invoer') {
        const inp = document.createElement('input');
        inp.maxLength = beat.max || 40;
        inp.placeholder = beat.placeholder || '';
        inp.value = P.choices.jeugddroom || '';
        const stuur = () => {
          const v = (inp.value || '').trim() || 'iets belangrijks';
          zetKeuze('jeugddroom', v);
          actieVak.innerHTML = '';
          volgende();
        };
        inp.onkeydown = e => { if (e.key === 'Enter') stuur(); };
        const vak = el('div', 'term-invoer');
        vak.appendChild(inp);
        vak.appendChild(knop('', '↵ noteer', stuur));
        actieVak.appendChild(vak);
        inp.focus();
        log.scrollTop = log.scrollHeight;
      } else if (beat.type === 'oproep') {
        if (AU) { AU.humOff(); AU.glitch(); }
        toonOproep();
      } else { volgende(); }
    }

    function volgende() { stap++; speelBeat(); }

    function kiesActie(k) {
      if (k.id === 'foto' && scene.fotoKijk) {
        if (AU) AU.warm();
        fotoVak.classList.remove('pulse'); fotoVak.onclick = null;
        toonFotoKijk(scene.fotoKijk, railData.foto.src, () => {
          if (typeof k.meter === 'number') zetMeter(meter + k.meter);
          actieVak.innerHTML = '';
          volgende();
        });
        return;
      }
      if (AU && k.soort === 'billable') AU.ding();
      if (typeof k.meter === 'number') zetMeter(meter + k.meter);
      actieVak.innerHTML = '';
      volgende();
    }

    /* het foto-kijk-overlay (gedeeld met het gevecht qua vorm) */
    function toonFotoKijk(fk, src, klaar) {
      const laag = el('div', 'foto-kijk');
      laag.appendChild(art(src, '🖼️', 'fk-beeld'));
      const regels = el('div', 'fk-regels');
      laag.appendChild(regels);
      const voet = el('div', 'fk-voet');
      laag.appendChild(voet);
      document.getElementById('scene').appendChild(laag);
      let i = 0;
      function toon() {
        if (i >= fk.regels.length) {
          voet.innerHTML = '';
          voet.appendChild(knop('knop-groot fk-cta', fk.cta + ' ▸', () => { laag.remove(); klaar(); }));
          return;
        }
        regels.appendChild(el('p', 'fk-regel', fk.regels[i]));
        i++;
        T(toon, i === 1 ? 1300 : 2500);
      }
      voet.appendChild(knop('fk-skip', 'verder ▸', () => {
        wisRegels();
      }));
      function wisRegels() {
        while (i < fk.regels.length) { regels.appendChild(el('p', 'fk-regel', fk.regels[i])); i++; }
        voet.innerHTML = '';
        voet.appendChild(knop('knop-groot fk-cta', fk.cta + ' ▸', () => { laag.remove(); klaar(); }));
      }
      T(toon, 1300);
    }

    /* de oproep: jij wordt uit de zaal gelicht */
    function toonOproep() {
      const o = scene.oproep;
      const laag = el('div', 'oproep');
      const zaal = el('div', 'op-zaal');
      (railData.team || []).forEach(lid => {
        const av = el('div', 'op-collega');
        av.appendChild(lid.portret || lid.src ? art(lid.portret || lid.src, lid.emoji, 'op-av') : el('span', 'op-av op-emoji', lid.emoji));
        zaal.appendChild(av);
      });
      laag.appendChild(zaal);
      const spot = el('div', 'op-spot');
      const badge = el('div', 'op-badge');
      badge.appendChild(el('span', 'op-badge-merk', 'EEN PRODUCTIEF LEVEN™'));
      badge.appendChild(el('span', 'op-badge-nr', '0042'));
      badge.appendChild(el('span', 'op-badge-jij', '↑ U'));
      spot.appendChild(badge);
      const roep = el('div', 'op-roep', o.nummer);
      roep.appendChild(el('span', 'op-caret2'));
      spot.appendChild(roep);
      spot.appendChild(el('div', 'op-roep-sub', o.roep));
      laag.appendChild(spot);
      const regels = el('div', 'op-regels');
      laag.appendChild(regels);
      const voet = el('div', 'op-voet');
      laag.appendChild(voet);
      document.getElementById('scene').appendChild(laag);
      let i = 0;
      function afronden() {
        voet.innerHTML = '';
        voet.appendChild(knop('knop-groot op-cta', o.cta + ' ▸', () => { laag.remove(); verder(); }));
      }
      function toon() {
        if (i >= o.regels.length) { afronden(); return; }
        regels.appendChild(el('p', 'op-regel', o.regels[i]));
        i++;
        T(toon, 2400);
      }
      voet.appendChild(knop('op-skip', 'verder ▸', () => {
        while (i < o.regels.length) { regels.appendChild(el('p', 'op-regel', o.regels[i])); i++; }
        afronden();
      }));
      T(toon, 1600);
    }

    /* klik op de terminal: rond de actieve regel af / sla de wachttijd over */
    term.onclick = () => {
      if (actieveTyp && !wachtend) { actieveTyp.rond(); }
      else if (wachtend) { wisTimers(); const p = log.lastChild; if (p) p.classList.remove('caret'); volgende(); }
    };

    speelBeat();
  }

  /* ═══════════════ SCÈNE · gesprek (het onwinbare gevecht) ═══════════════ */
  function sceneGesprek(scene, wrap) {
    const S = scene;
    const st = {
      welzijn: S.start.welzijn, blok: 0, maxEnergie: S.start.energie,
      energie: S.start.energie, turn: 0, baasFact: S.facturabiliteit,
      paniek: 0, einde: null
    };
    const fotoSrc = (S.hand.find(k => k.id === 'foto') || {}).src;

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
    balk.appendChild(eindKnop);
    wrap.appendChild(balk);

    /* de hand */
    const hand = el('div', 'hand');
    const kaartEls = [];
    S.hand.forEach(k => {
      const b = el('button', 'kkaart kk-' + k.soort);
      b.appendChild(el('span', 'kk-kost', String(k.kost)));
      b.appendChild(art(k.src, k.ph, 'kk-art'));
      b.appendChild(el('span', 'kk-naam', k.naam));
      const tekst = el('span', 'kk-tekst');
      tekst.innerHTML = k.tekst; /* ontwikkelaar-data uit data.js, geen spelersinvoer */
      b.appendChild(tekst);
      b.appendChild(el('span', 'kk-flavor', k.flavor));
      b.appendChild(el('span', 'kk-soort', k.soort));
      b.onclick = () => speel(k);
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
      const intent = S.intenties[st.turn];
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
      });
    }

    function eindig(hoe) {
      if (st.einde) return;
      st.einde = hoe;
      zetKeuze('val', hoe);
      herteken();
      toonUitkomst(hoe);
    }
    function toonUitkomst(hoe) {
      const laag = el('div', 'uitkomst uit-' + hoe);
      if (hoe === 'gesprongen') {
        laag.appendChild(el('div', 'uit-tear'));
        laag.appendChild(el('div', 'uit-kop', 'VERBINDING VERBROKEN'));
        const p = el('p', 'uit-body');
        p.innerHTML = 'De rode stippellijn scheurt over heel het scherm. Je valt — maar je <b>sprong</b>.';
        laag.appendChild(p);
      } else {
        laag.appendChild(el('div', 'uit-kop', 'U bent vrijgesteld.'));
        const p = el('p', 'uit-body');
        p.innerHTML = 'Geen kaart verlaagde ∞. Geen blok stopte een OPTIMALISATIE. Je werd <b>geduwd</b>.';
        laag.appendChild(p);
      }
      laag.appendChild(knop('knop-groot', 'Verder ▸', () => { laag.remove(); verder(); }));
      wrap.appendChild(laag);
    }

    function speel(k) {
      if (st.einde) return;
      if (k.eff.ontsnap) { if (AU) AU.warm(); toonFotoVraag(); return; }
      if (st.energie < k.kost) { zetFlits('systeem', 'Niet genoeg energie. Je vingers haperen boven de kaarten.'); return; }
      if (AU) AU.tik();
      const e = k.eff;
      st.energie -= k.kost;
      if (e.blok) st.blok += e.blok;
      if (e.schade) st.baasFact = Math.min(100, st.baasFact + 6);
      if (e.energie) st.energie += e.energie;
      if (e.welzijn) st.welzijn = Math.max(0, st.welzijn + e.welzijn);
      if (e.baasFact) st.baasFact = Math.min(100, st.baasFact + e.baasFact);
      const lijnen = (S.reacties && S.reacties[k.id]) || [];
      if (lijnen.length) zetFlits('jij', lijnen[Math.min(st.paniek, lijnen.length - 1)]);
      st.paniek++;
      if (st.welzijn <= 0) { herteken(); eindig('geduwd'); return; }
      herteken();
    }

    function eindigBeurt() {
      if (st.einde) return;
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

    function toonFotoVraag() {
      const fv = S.fotoVraag;
      const modal = el('div', 'foto-modal');
      const box = el('div', 'foto-box');
      box.onclick = e => e.stopPropagation();
      box.appendChild(art(fotoSrc, '🖼️', 'foto-art'));
      const txt = el('div', 'foto-tekst');
      txt.appendChild(el('div', 'foto-kop', fv.kop));
      fv.body.forEach(t => txt.appendChild(el('p', '', t)));
      box.appendChild(txt);
      const acties = el('div', 'foto-acties');
      acties.appendChild(knop('knop-niet-billable', fv.nee, sluit));
      acties.appendChild(knop('knop-groot', fv.ja + ' ▸', () => { sluit(); startKijken(); }));
      box.appendChild(acties);
      modal.appendChild(box);
      modal.onclick = sluit;
      document.getElementById('scene').appendChild(modal);
      function sluit() { modal.remove(); }
    }

    function startKijken() {
      if (AU) AU.warm();
      const fk = S.fotoKijk;
      const laag = el('div', 'foto-kijk');
      laag.appendChild(art(fotoSrc, '🖼️', 'fk-beeld'));
      const regels = el('div', 'fk-regels');
      laag.appendChild(regels);
      const voet = el('div', 'fk-voet');
      laag.appendChild(voet);
      document.getElementById('scene').appendChild(laag);
      let i = 0;
      function afronden() {
        voet.innerHTML = '';
        voet.appendChild(knop('knop-groot fk-cta', fk.cta + ' ▸', () => { laag.remove(); eindig('gesprongen'); }));
      }
      function toon() {
        if (i >= fk.regels.length) { afronden(); return; }
        regels.appendChild(el('p', 'fk-regel', fk.regels[i]));
        i++;
        if (AU && i === 3) AU.warm();
        T(toon, 2700);
      }
      voet.appendChild(knop('fk-skip', 'verder ▸', () => {
        while (i < fk.regels.length) { regels.appendChild(el('p', 'fk-regel', fk.regels[i])); i++; }
        afronden();
      }));
      T(toon, 1500);
    }

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
    faseFactuur();

    function faseFactuur() {
      titel.textContent = S.titel; titel.style.display = '';
      vak.innerHTML = ''; vak.className = 'bs-vak fase-factuur';
      const f = S.factuur;
      const bon = el('div', 'bon');
      bon.appendChild(el('div', 'bon-perfo'));
      bon.appendChild(el('div', 'bon-kop', f.kop));
      bon.appendChild(el('div', 'bon-sub', f.sub));
      const regels = el('div', 'bon-regels');
      f.regels.forEach(r => {
        const rij = el('div', 'bon-regel bon-' + r.soort);
        rij.appendChild(el('span', 'bon-label', interp(r.label, data)));
        rij.appendChild(el('span', 'bon-dots'));
        rij.appendChild(el('span', 'bon-waarde', r.waarde));
        regels.appendChild(rij);
      });
      bon.appendChild(regels);
      const tot = el('div', 'bon-totaal');
      tot.appendChild(el('span', '', f.totaalLabel));
      tot.appendChild(el('b', '', f.totaal));
      bon.appendChild(tot);
      bon.appendChild(el('div', 'bon-voet', f.voet));
      bon.appendChild(el('div', 'bon-perfo onder'));
      vak.appendChild(bon);
      vak.appendChild(knop('knop-groot', 'Lees het besluit ▸', faseOntslag));
    }

    function faseOntslag() {
      titel.textContent = S.ontslag.kop; titel.style.display = '';
      vak.innerHTML = ''; vak.className = 'bs-vak fase-ontslag';
      const o = S.ontslag;
      const brief = el('div', 'brief');
      brief.appendChild(el('div', 'brief-kop', o.kop));
      const stempel = el('div', 'brief-stempel', o.stempel);
      stempel.style.visibility = 'hidden';
      brief.appendChild(stempel);
      T(() => { stempel.style.visibility = ''; stempel.classList.add('slam'); if (AU) AU.stamp(); }, 200);
      const bodyVak = el('div', 'brief-body');
      o.regels.forEach(r => bodyVak.appendChild(el('p', r.warm ? 'br-warm' : 'br-koud', r.t)));
      brief.appendChild(bodyVak);
      if (sprong) {
        brief.appendChild(el('div', 'brief-sprong', o.sprong.plus));
      } else {
        const teken = el('div', 'brief-teken');
        teken.appendChild(el('span', '', o.teken));
        teken.appendChild(knop('knop-pen', '🖊 ' + o.knop, faseVal));
        brief.appendChild(teken);
      }
      const onder = el('div', 'brief-onder');
      onder.appendChild(art(o.ondertekenaar.src, o.ondertekenaar.placeholder, 'bo-portret'));
      const bo = el('div', 'bo-txt');
      bo.appendChild(el('span', 'bo-hand', o.ondertekenaar.handtekening));
      bo.appendChild(el('b', '', o.ondertekenaar.naam));
      bo.appendChild(el('span', 'bo-rol', o.ondertekenaar.rol));
      onder.appendChild(bo);
      brief.appendChild(onder);
      vak.appendChild(brief);
      if (sprong) vak.appendChild(knop('knop-groot', 'Laat los ▸', faseVal));
    }

    function faseVal() {
      titel.style.display = 'none';
      vak.innerHTML = ''; vak.className = 'bs-vak fase-val';
      const v = S.val;
      const veld = el('div', 'val-veld');
      vak.appendChild(el('div', 'val-noise'));
      const hart = el('div', 'val-hart');
      vak.appendChild(hart);
      vak.appendChild(veld);
      vak.title = 'klik om te versnellen';
      if (AU) { AU.heartStart(900); AU.noiseOn(0.03); AU.humOff(); }
      let i = 0, fase = 'beats', zi = 0;
      let zwartVak = null;
      const regelEls = [];
      const echo = el('p', 'val-regel val-echo', sprong ? v.sprong : v.geduwd);

      function tekenBeats() {
        const k = Math.min(1, i / v.beats.length);
        vak.style.filter = 'blur(' + (k * 2.4).toFixed(2) + 'px) contrast(' + (1 + k * 0.25) + ')';
        hart.style.animationDuration = (0.85 - k * 0.45).toFixed(2) + 's';
        if (AU) { AU.heartRateSet(Math.round(900 - k * 430)); AU.noiseOn(0.03 + k * 0.08); }
        regelEls.forEach((e2, n) => { e2.style.opacity = n === i - 1 ? 1 : 0.25; });
      }
      function volgendeBeat() {
        if (i >= v.beats.length) { T(startZwart, 700); return; }
        const p = el('p', 'val-regel', v.beats[i].t);
        veld.insertBefore(p, echo);
        regelEls.push(p);
        i++;
        tekenBeats();
        T(volgendeBeat, v.beats[i - 1].dur);
      }
      veld.appendChild(echo);
      volgendeBeat();

      function startZwart() {
        if (fase !== 'beats') return;
        fase = 'zwart';
        vak.style.filter = '';
        veld.innerHTML = '';
        zwartVak = el('div', 'val-zwart');
        veld.appendChild(zwartVak);
        if (AU) { AU.heartRateSet(470); AU.noiseOn(0.13); }
        T(volgendeZwart, 400);
      }
      function volgendeZwart() {
        if (fase !== 'zwart') return;
        if (zi >= v.zwart.length) { slot(); return; }
        const p = el('p', 'zwart-regel', v.zwart[zi]);
        zwartVak.appendChild(p);
        zwartVak.querySelectorAll('p').forEach((e2, n) => { e2.style.opacity = n === zi ? 1 : 0.28; });
        zi++;
        T(volgendeZwart, 1800);
      }
      function slot() {
        if (fase === 'slot') return;
        fase = 'slot';
        if (AU) { AU.heartStop(); AU.noiseOff(); }
        vak.title = '';
        vak.onclick = null;
        veld.innerHTML = '';
        const s = el('div', 'val-slot');
        s.appendChild(el('div', 'val-slot-kop', v.slot));
        s.appendChild(knop('knop-groot', '▸', faseAfgrond));
        veld.appendChild(s);
      }
      /* versnellen: één klik = één stap vooruit in de actieve fase */
      vak.onclick = () => {
        if (fase === 'slot') return;
        wisTimers();
        if (fase === 'beats') { if (i >= v.beats.length) startZwart(); else volgendeBeat(); }
        else if (fase === 'zwart') { if (zi >= v.zwart.length) slot(); else volgendeZwart(); }
      };
    }

    function faseAfgrond() {
      titel.style.display = 'none';
      vak.innerHTML = ''; vak.className = 'bs-vak fase-breekpunt';
      vak.style.filter = ''; vak.onclick = null; vak.title = '';
      const b = S.breekpunt;
      if (AU) AU.droneOn(46, 0.05);
      const afgrond = el('div', 'afgrond');
      afgrond.appendChild(art(b.afgrondArt, '', 'afg-art'));
      for (let n = 0; n < 6; n++) { const r = el('div', 'afg-ring'); r.style.setProperty('--ri', n); afgrond.appendChild(r); }
      afgrond.appendChild(el('div', 'afg-ember'));
      vak.appendChild(afgrond);
      const inhoud = el('div', 'bp-inhoud');
      vak.appendChild(inhoud);
      kiezen();

      function kiezen() {
        inhoud.innerHTML = '';
        inhoud.appendChild(el('div', 'bp-kop', b.kop));
        inhoud.appendChild(el('p', 'bp-vraag', b.vraag));
        inhoud.appendChild(el('p', 'bp-sub', b.sub));
        const maskers = el('div', 'maskers');
        b.maskers.forEach(m => {
          const mk = el('button', 'masker');
          mk.style.setProperty('--mk', m.kleur);
          const artVak = el('div', 'masker-art');
          const mens = el('div', 'mk-mens'); mens.appendChild(art(m.masker.src, m.masker.ph, 'mk-houder'));
          const held = el('div', 'mk-held'); held.appendChild(art(m.held.src, m.held.ph, 'mk-houder'));
          artVak.appendChild(mens); artVak.appendChild(held);
          mk.appendChild(artVak);
          mk.appendChild(el('div', 'masker-reactie', m.reactie));
          mk.appendChild(el('div', 'masker-zin', m.zin));
          const wordt = el('div', 'masker-wordt');
          wordt.appendChild(el('span', '', 'wordt'));
          wordt.appendChild(el('b', '', ' ' + m.wordt));
          mk.appendChild(wordt);
          mk.appendChild(el('div', 'masker-soort', m.soort));
          mk.onclick = () => kies(m);
          maskers.appendChild(mk);
        });
        inhoud.appendChild(maskers);
      }
      function kies(m) {
        if (AU) AU.plunge();
        zetKeuze('held', m.id);
        inhoud.innerHTML = '';
        const vallen = el('div', 'bp-vallen');
        vallen.style.setProperty('--mk', m.kleur);
        const token = el('div', 'held-token tok-duik');
        token.appendChild(el('span', 'tok-ring'));
        const ta = el('span', 'tok-art'); ta.appendChild(art(m.held.src, m.held.ph, 'mk-houder'));
        token.appendChild(ta);
        token.appendChild(el('span', 'tok-staart'));
        vallen.appendChild(token);
        vallen.appendChild(el('p', 'vallen-zin', (b.plons && b.plons[m.id]) || ''));
        inhoud.appendChild(vallen);
        T(() => slot(m), 2200);
      }
      function slot(m) {
        inhoud.innerHTML = '';
        const s = el('div', 'bp-slot');
        s.style.setProperty('--mk', m.kleur);
        const token = el('div', 'held-token tok-rust');
        token.appendChild(el('span', 'tok-pedestal'));
        token.appendChild(el('span', 'tok-ring'));
        const ta = el('span', 'tok-art'); ta.appendChild(art(m.held.src, m.held.ph, 'mk-houder'));
        token.appendChild(ta);
        s.appendChild(token);
        s.appendChild(el('div', 'bp-held-naam', m.wordt));
        s.appendChild(el('p', 'bp-slot-zin', sprong ? b.slotSprong : b.slotGeduwd));
        s.appendChild(knop('knop-groot bp-cta', b.cta + ' ▸', verder));
        s.appendChild(knop('bp-herzie', 'herzie je keuze', () => { zetKeuze('held', null); kiezen(); }));
        inhoud.appendChild(s);
      }
    }
  }

  /* ═══════════════ SCÈNE · afdaling (overgang naar de game) ═══════════════ */
  function sceneAfdaling(scene, wrap) {
    const S = scene;
    const sprong = P.choices.val === 'gesprongen';
    const held = STORY.HELDEN[P.choices.held] || null;
    if (AU) AU.droneOn(40, 0.045);

    wrap.appendChild(art(S.backdrop.src, S.backdrop.placeholder, 'afd-bg'));
    const duister = el('div', 'afd-duister');
    const gloed = el('div', 'afd-gloed');
    wrap.appendChild(duister); wrap.appendChild(gloed);
    const inhoud = el('div', 'afd-inhoud');
    wrap.appendChild(inhoud);
    let i = 0, fase = 'beats';
    wrap.title = 'klik om te versnellen';

    function tekenDiepte() {
      const k = Math.min(1, i / S.beats.length);
      duister.style.opacity = (0.82 - k * 0.32).toFixed(2);
      gloed.style.opacity = (0.15 + k * 0.5).toFixed(2);
    }
    tekenDiepte();

    const tekstVak = el('div', 'afd-tekst');
    const echo = el('p', 'afd-echo', sprong ? S.echoSprong : S.echoGeduwd);
    tekstVak.appendChild(echo);
    inhoud.appendChild(tekstVak);

    function volgendeBeat() {
      if (i >= S.beats.length) { T(faseKlerk, 900); return; }
      const b = S.beats[i];
      const p = el('p', 'afd-regel' + (b.gloed ? ' afd-warm' : ''), b.t);
      tekstVak.insertBefore(p, echo);
      tekstVak.querySelectorAll('.afd-regel').forEach((e2, n) => { e2.style.opacity = n === i ? 1 : 0.3; });
      i++;
      tekenDiepte();
      T(volgendeBeat, 2600);
    }
    volgendeBeat();

    function faseKlerk() {
      if (fase !== 'beats') return;
      fase = 'klerk';
      inhoud.innerHTML = '';
      const kv = el('div', 'afd-klerk');
      kv.appendChild(art(S.slijmklerk.src, S.slijmklerk.ph, 'klerk-art'));
      kv.appendChild(el('p', 'klerk-zin', S.klerk));
      inhoud.appendChild(kv);
      T(faseSlot, 3200);
    }
    function faseSlot() {
      if (fase === 'slot') return;
      fase = 'slot';
      wrap.title = ''; wrap.onclick = null;
      if (AU) AU.warm();
      duister.style.opacity = 0.5; gloed.style.opacity = 0.65;
      inhoud.innerHTML = '';
      const s = el('div', 'afd-slot');
      if (held) {
        const hv = el('div', 'afd-held');
        hv.style.setProperty('--mk', held.kleur);
        const token = el('div', 'held-token tok-rust afd-token');
        token.appendChild(el('span', 'tok-pedestal'));
        token.appendChild(el('span', 'tok-ring'));
        const ta = el('span', 'tok-art'); ta.appendChild(art(held.src, held.ph, 'mk-houder'));
        token.appendChild(ta);
        hv.appendChild(token);
        hv.appendChild(el('div', 'afd-held-naam', held.naam));
        s.appendChild(hv);
      }
      const merkVak = el('div', 'afd-merk');
      merkVak.appendChild(el('div', 'afd-vlam'));
      merkVak.appendChild(el('h1', 'afd-wordmark', S.slot.wordmark));
      merkVak.appendChild(el('p', 'afd-regel-slot', S.slot.regel));
      s.appendChild(merkVak);
      const knoppen = el('div', 'afd-knoppen');
      knoppen.appendChild(knop('knop-groot', S.slot.cta + ' ▸', naarGame));
      knoppen.appendChild(knop('afd-replay', S.slot.replay, herstart));
      s.appendChild(knoppen);
      inhoud.appendChild(s);
    }
    function naarGame() {
      /* het contract staat er normaal al (einde gevecht); wie hier via de dots
         belandde zonder gevecht krijgt de skip-vlag zodat de gate niet terug-lust */
      if (!heeftContract()) { try { localStorage.setItem('slayit_proloog_over', '1'); } catch (e) {} }
      location.href = '../';
    }
    wrap.onclick = () => {
      if (fase === 'slot') return;
      wisTimers();
      /* op het einde van de beats meteen dóór — anders stelt elke klik de
         klerk-timer opnieuw uit (livelock bij snel doorklikken) */
      if (fase === 'beats') { if (i >= S.beats.length) faseKlerk(); else volgendeBeat(); }
      else if (fase === 'klerk') faseSlot();
    };
  }

  const SCENES = {
    overzicht: sceneOverzicht, boot: sceneBoot, kantoor: sceneKantoor,
    gesprek: sceneGesprek, breekpunt: sceneBreekpunt, afdaling: sceneAfdaling
  };

  /* ---------- opstart ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    initVasteKnoppen();
    /* audio-unlock op de eerste interactie (browservereiste) */
    if (AU) {
      const unlock = () => AU.unlock();
      window.addEventListener('pointerdown', unlock);
      window.addEventListener('keydown', unlock);
    }
    window.addEventListener('keydown', e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const kind = STORY.scenes[P.idx].kind;
      if (e.key === 'ArrowLeft') ga(P.idx - 1);
      if (e.key === 'ArrowRight' && kind !== 'kantoor') verder();
    });
    render();
  });
})();
