// PROLOOG R1 · DE NAAD — acceptatie van de GAME-KANT (js/proloog-brug.js), met een STUB-proloog.
// De echte proloog (proloog/*.js) wordt hier bewust vervangen door een stub die na 500 ms
// klaar() roept met een vaste uitkomst, zodat deze suite de brug meet los van de inhoud:
// titel -> proloog -> kaart zonder herlaad, de landing (plan par. 3), de poorten, de gate,
// herbeleven, de ?proloog=1-route, de laadfout, reduced motion, de drankslots en de Codex.
// Elke regel toont de GEMETEN waarde.
// R5 (deel 8 'echo'): DE ECHO IN DE EERSTE KAMER (plan par. 2 scène 9, par. 5 R5): het eerste
// gevecht na de landing is een solo Groene Slijm; de eerste hand komt binnen als de kantoorvellen
// van het gesprek (per held de juiste kaart), die na <= 1,5 s weg zijn en nooit terugkomen (ook
// niet na een herlaad midden in het gevecht); de zin precies 1x op de spraakplaat; contract.echo
// 0 -> 1, nooit een tweede keer; herbeleven, de daily en de DEV-landing raken het contract niet;
// reduced motion en lite: geen animatie in de landing of de echo langer dan 800 ms. Op 1440x900
// (2D en 3D), 1366x768, 800x360 en 846x381 (touch) en 412x915 (touch, achter het draai-blok),
// natuurlijk, doortikkend, met een kaart spelen, herladen; met contactvellen (CDP-screencast).
//
// Draaien (vanuit de scratchpad met playwright + pngjs in node_modules):
//   NODE_PATH="$PWD/node_modules" SLAYIT_WORKTREE="...\SLAY-IT-proloog" \
//   SLAYIT_SHOTS="$PWD/proloog_landing_shots" node "...\SLAY-IT-proloog\tools\proloog_landing_acceptatie.js" [landing|echo]
// Zonder argument draait alles; 'landing' = de delen 1-7 (R1), 'echo' = deel 8 (R5).
// Serveert de worktree vanaf schijf via route.fulfill op localhost:4173 (geen echte server).
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
let PNG = null; try { PNG = require('pngjs').PNG; } catch (e) { /* plaatdiff wordt dan overgeslagen */ }
const WT = process.env.SLAYIT_WORKTREE || 'C:\\Users\\Thomas Aelbrecht\\Desktop\\Workspace\\SLAY-IT-proloog';
const UIT = process.env.SLAYIT_SHOTS || path.join(__dirname, 'proloog_landing_shots'); fs.mkdirSync(UIT, { recursive: true });
const HOST = 'localhost:4173';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));
let okN = 0, foutN = 0;
const t = (goed, tekst) => { if (goed) { okN++; console.log('   ok   ' + tekst); } else { foutN++; console.log('   FOUT ' + tekst); } };

/* ---------- de stub: gedraagt zich naar het contract van window.Proloog ---------- */
const STUB = `/* STUB-proloog (tools/proloog_landing_acceptatie.js) */
window.Proloog = (function () {
  var actief = false, o = null, tm = null;
  window.__plLog = window.__plLog || [];
  function kool() { return { x: window.innerWidth / 2, y: window.innerHeight * 0.6 }; }
  return {
    start: function (opts) {
      o = opts; actief = true;
      window.__plLog.push({ start: { herbeleef: !!opts.herbeleef, hoofdstuk: opts.hoofdstuk === undefined ? null : opts.hoofdstuk, host: opts.host && opts.host.id, modus: opts.host && opts.host.dataset.modus } });
      var R = opts.host.shadowRoot || opts.host.attachShadow({ mode: 'open' });
      var k = kool();
      R.innerHTML = '<style>:host{all:initial}.s{position:fixed;inset:0;background:#07060a}.k{position:absolute;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:#ffb35c;box-shadow:0 0 10px 3px rgba(255,140,50,.75)}</style><div class="s"><div class="k" style="left:' + k.x + 'px;top:' + k.y + 'px"></div></div>';
      try { var kp = window.Klank && Klank.koppel && Klank.koppel(); window.__plKoppel = kp && kp.ctx ? 'ctx' : 'geen'; window.__plBus = !!(kp && (kp.bus || kp.uit)); } catch (e) { window.__plKoppel = 'fout ' + e.message; }
      var modus = window.__plStubModus || 'klaar';
      tm = setTimeout(function () {
        window.__plKlaarT = performance.now();
        if (modus === 'over') { if (o.over) o.over(); return; }
        if (!o.herbeleef) {
          var c = { v: 2, held: 'gifmagier', masker: 'gif', uitweg: 'sprong', jeugddroom: 'brandweerman', glimlachen: 7, fotoKantoor: 1, zelfGestempeld: true, wachtToon: -7, echo: 0 };
          try { localStorage.setItem('slayit_proloog', JSON.stringify(c)); } catch (e) {}
          o.klaar({ held: window.__plStubHeld || 'gifmagier', masker: 'gif', kooltje: kool(), contract: c });
        } else o.klaar({ held: 'gifmagier', masker: 'gif', kooltje: kool(), contract: null });
      }, 500);
    },
    stop: function () { actief = false; clearTimeout(tm); window.__plLog.push({ stop: true }); if (o && o.host && o.host.shadowRoot) o.host.shadowRoot.innerHTML = ''; },
    slaOver: function () {},
    hoofdstukken: [{ hoofdstuk: 0, naam: 'Maandag, 06:42' }, { hoofdstuk: 1, naam: 'De CRT degausst' }, { hoofdstuk: 2, naam: 'Het Glimlachquotum' }, { hoofdstuk: 3, naam: 'Het Functioneringsgesprek' }, { hoofdstuk: 'factuur', naam: 'De Eindafrekening' }, { hoofdstuk: 'val', naam: 'In de wacht' }, { hoofdstuk: 'afgrond', naam: 'De Afgrond' }],   /* R3: de namen van 1 en 2 volgen proloog/data.js */
    get actief() { return actief; }
  };
})();`;

async function open(browser, vp, opties) {
  opties = opties || {};
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: !!vp.m, hasTouch: !!vp.m, serviceWorkers: 'block', reducedMotion: opties.rustig ? 'reduce' : 'no-preference' });
  if (opties.meter) await ctx.addInitScript(opties.meter);   /* R5: de echo-meter (deel 8), vanaf het eerste script en na elke herlaad */
  await ctx.addInitScript(() => {
    window.__acN = 0;
    const O = window.AudioContext || window.webkitAudioContext;
    if (O) {
      const W = class extends O { constructor(...a) { super(...a); window.__acN++; } };
      window.AudioContext = W; window.webkitAudioContext = W;
    }
  });
  const page = await ctx.newPage(); page.__f = []; page.__nav = 0; page.__proloogReq = 0;
  page.on('pageerror', e => page.__f.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/rest\/v1|Failed to load resource|supabase/i.test(m.text())) page.__f.push('console: ' + m.text()); });
  page.on('framenavigated', f => { if (f === page.mainFrame()) page.__nav++; });
  page.on('crash', () => { page.__f.push('de renderer crashte'); console.log('   (de renderer crashte — ' + vp.w + 'x' + vp.h + ')'); });   /* R5: een gesloten pagina moet een reden hebben */
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.host !== HOST) return route.abort();
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
    if (/^proloog\/.+\.js$/.test(rel)) {
      page.__proloogReq++;
      if (opties.laadFout && rel === 'proloog/proloog.js') return route.fulfill({ status: 404, body: 'weg' });
      if (rel === 'proloog/proloog.js') return route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB });
      return route.fulfill({ status: 200, contentType: 'text/javascript', body: '/* stub: ' + rel + ' */' });
    }
    let f = path.join(WT, rel.split('/').join(path.sep));
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) return route.fulfill({ status: 404, body: 'weg' });
    return route.fulfill({ status: 200, contentType: MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  await page.goto('http://' + HOST + '/', { waitUntil: 'load' });
  await page.evaluate(opslag => {
    localStorage.clear();
    localStorage.setItem('slayit_wipe', '1'); localStorage.setItem('slayit_nudge_v2', 'weg'); localStorage.setItem('slayit_wereld', '0');
    Object.entries(opslag || {}).forEach(([k, v]) => localStorage.setItem(k, v));
  }, opties.opslag || null);
  await page.goto('http://' + HOST + '/' + (opties.query || ''), { waitUntil: 'load' });
  await slaap(700);
  page.__nav = 0;
  page.__proloogReq = 0;
  await page.evaluate(() => {
    window.__schermLog = [document.body.dataset.scherm];
    new MutationObserver(() => {
      const s = document.body.dataset.scherm;
      if (window.__schermLog[window.__schermLog.length - 1] !== s) window.__schermLog.push(s);
    }).observe(document.body, { attributes: true, attributeFilter: ['data-scherm'] });
  });
  return { ctx, page };
}

const knopNieuw = async (page, vp) => {
  const k = page.locator('#scherm-titel .knop-groot', { hasText: 'Nieuw avontuur' });
  if (vp.m) await k.tap(); else await k.click();
};
const wachtOp = async (page, fn, ms, arg) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return Date.now() - t0; await slaap(50); }
  return -1;
};
const STAND = () => {
  const tb = document.getElementById('topbalk');
  const tbs = getComputedStyle(tb);
  const sl = document.getElementById('proloog-sluier');
  const chip = document.getElementById('tb-fakkel');
  const dl = document.querySelector('#tb-dranken .drank-leeg');
  let jd = null; try { jd = jeugddroomTekst(); } catch (e) { jd = 'FOUT'; }
  return {
    scherm: document.body.dataset.scherm,
    log: (window.__schermLog || []).join(' > '),
    held: (typeof S !== 'undefined' && S) ? S.held : null,
    fakkel: (typeof S !== 'undefined' && S) ? S.fakkel : null,
    save: !!localStorage.getItem('slayit_save_v1'),
    klaar: localStorage.getItem('slayit_proloog_klaar'),
    contract: localStorage.getItem('slayit_proloog'),
    jeugddroom: jd,
    tbDisplay: tbs.display, tbTransform: tbs.transform, tbTop: Math.round(tb.getBoundingClientRect().top),
    chip: chip ? chip.textContent.trim() : null,
    sluierToon: sl ? sl.classList.contains('toon') : null, sluierKind: sl ? sl.children.length : null,
    bodyPl: [...document.body.classList].filter(c => /^pl-/.test(c)).join(','),
    kaartTransform: document.getElementById('scherm-kaart').style.transform || '',
    vignet: getComputedStyle(document.getElementById('licht-vignet')).opacity,
    bezig: typeof proloogBezig === 'function' ? proloogBezig() : 'geen',
    stops: (window.__plLog || []).filter(x => x.stop).length,
    starts: (window.__plLog || []).filter(x => x.start).map(x => x.start),
    acN: window.__acN, koppel: window.__plKoppel || null, bus: !!window.__plBus,
    scrollH: document.documentElement.scrollHeight, scrollTop: document.scrollingElement.scrollTop, innerH: window.innerHeight,
    drankLeeg: dl ? { tip: dl.dataset.tip, n: dl.querySelectorAll('i').length } : null,
    voorkeur: [...document.querySelectorAll('.held-kaart.voorkeur')].map(e => e.dataset.held).join(','),
    url: location.pathname + location.search
  };
};
const stand = page => page.evaluate(STAND);

function diffPng(a, b) {
  if (!PNG) return null;
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return 255;
  let som = 0;
  for (let i = 0; i < A.data.length; i += 4) som += Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]);
  return som / (A.width * A.height * 3);
}

/* ============================================================
   8 · R5 — DE ECHO IN DE EERSTE KAMER (hulpjes; de scenario's staan in deelEcho)
   ============================================================ */
const vm = require('vm');
const ECHO_ZIN = 'Fijn dat je er bent. Ik hou je een plekje warm.';
/* welke kantoorkaart elke echte kaart was (js/proloog-brug.js, ECHO_KAART / ECHO_TYPE) */
const ECHO_PER_KAART = { slag: 'mailtje', prik: 'mailtje', takkenslag: 'mailtje', verdediging: 'glimlach', knal: 'verantwoord', dodelijke_kus: 'glimlach', gifflits: 'koffie', vonkenbeet: 'overuren', stoofpotje: 'koffie' };
const ECHO_PER_TYPE = { aanval: 'mailtje', vaardigheid: 'koffie', kracht: 'overuren', vloek: 'verantwoord' };
const verwachtKantoor = (id, type) => ECHO_PER_KAART[id] || ECHO_PER_TYPE[type] || 'mailtje';
/* de kantoorkaarten van het gesprek uit de ECHTE bron (proloog/data.js, in node geladen): de stub-proloog
   van deze suite laadt data.js niet, dus de brug valt hier altijd terug op haar eigen tabel — en die moet
   letterlijk gelijk zijn aan data.js */
const PL_HAND = (() => {
  try {
    const w = {};
    vm.runInNewContext(fs.readFileSync(path.join(WT, 'proloog', 'data.js'), 'utf8'), { window: w, self: w });
    const uit = {};
    w.SLAYLIT_PROLOOG.scenes.find(s => s.kind === 'gesprek').hand.forEach(k => { uit[k.id] = k; });
    return uit;
  } catch (e) { console.log('   (proloog/data.js niet leesbaar: ' + e.message + ')'); return {}; }
})();

/* DE METER, in de pagina vanaf het eerste script (ook na een herlaad): wanneer het gevecht IN BEELD komt
   (niet achter het draai-blok), elk vel dat verschijnt (met zijn echte kaart), het laatste beeld waarin nog
   een vel stond, de spraakplaten en -bellen, en op vraag (samplen) de animaties van de landing en de echo:
   de langste actieve duur per animatie of overgang. */
const ECHO_METER = `(${function () {
  const E = window.__e = { vel: [], plaat: [], spraak: [], anim: {}, samplenLanding: false, samplenGevecht: false, eersteBeeld: null, zichtbaarVanaf: null, velEerst: null, velLaatst: null, velMax: 0, fakkelPuls: null, toasts: [], zinBedekt: 0 };
  /* per gevecht opnieuw meten (twee gevechten in één pagina: de daily, dan een gewone run) */
  window.__eReset = () => Object.assign(E, { vel: [], plaat: [], spraak: [], eersteBeeld: null, zichtbaarVanaf: null, velEerst: null, velLaatst: null, velMax: 0, fakkelPuls: null, toasts: [], zinBedekt: 0 });
  const nu = () => Math.round(performance.now());
  const BINNEN = '#proloog-sluier, .kaart-kantoorvel, .baas-spraak.pl-echo-zin';
  const IDS = ['scherm-kaart', 'topbalk', 'kaart-held', 'tb-fakkel', 'licht-vignet', 'toneel-doek'];
  function sample(fase) {
    let lijst = [];
    try { lijst = document.getAnimations(); } catch (e) { return; }
    for (const a of lijst) {
      const el = a.effect && a.effect.target;
      if (!el || !el.closest) continue;
      if (!el.closest(BINNEN) && IDS.indexOf(el.id) === -1) continue;
      const soort = a.animationName ? 'animatie ' + a.animationName : (a.transitionProperty ? 'overgang ' + a.transitionProperty : 'waapi');
      const wie = el.id ? '#' + el.id : '.' + String(el.className || '').split(' ')[0];
      const sleutel = fase + ': ' + soort + ' op ' + wie + (a.effect.pseudoElement || '');
      let d = -1; try { d = a.effect.getComputedTiming().activeDuration; } catch (e) { d = -1; }
      if (!(sleutel in E.anim) || d > E.anim[sleutel]) E.anim[sleutel] = d;
    }
  }
  function lus() {
    const b = document.body;
    if (b && b.dataset.scherm === 'gevecht') {
      if (!E.eersteBeeld) E.eersteBeeld = { t: nu(), kaarten: document.querySelectorAll('#hand .kaart').length, metVel: document.querySelectorAll('#hand .kaart > .kaart-kantoorvel').length };
      const db = document.getElementById('draai-blok');
      if (E.zichtbaarVanaf === null && !(db && db.classList.contains('toon'))) E.zichtbaarVanaf = nu();
    }
    const n = document.querySelectorAll('.kaart-kantoorvel').length;
    if (n) { if (E.velEerst === null) E.velEerst = nu(); E.velLaatst = nu(); if (n > E.velMax) E.velMax = n; }
    /* ligt er een melding (toast) over de zin? */
    const zp = document.querySelector('.baas-spraak.pl-echo-zin span');
    if (zp) {
      const r = zp.getBoundingClientRect();
      document.querySelectorAll('#meldingen .toast').forEach(el => {
        const q = el.getBoundingClientRect();
        if (q.width && r.width && q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top && getComputedStyle(el).opacity > 0.1) E.zinBedekt++;
      });
    }
    const f = document.getElementById('tb-fakkel');
    if (f && E.fakkelPuls === null && f.classList.contains('pl-fakkel-vol') && E.zichtbaarVanaf !== null) E.fakkelPuls = nu();
    /* de landing (zolang proloogBezig) en de echo (het gevecht) — niet de tocht over de kaart ertussen */
    const bezig = typeof proloogBezig === 'function' && proloogBezig();
    if (E.samplenLanding && bezig) sample('landing');
    else if (E.samplenGevecht && b && b.dataset.scherm === 'gevecht') sample('echo');
    requestAnimationFrame(lus);
  }
  function start() {
    new MutationObserver(ms => {
      for (const m of ms) m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        const vels = n.classList.contains('kaart-kantoorvel') ? [n] : [...n.querySelectorAll('.kaart-kantoorvel')];
        vels.forEach(v => {
          const k = v.closest('.kaart'); const uid = k ? parseInt(k.dataset.uid, 10) : NaN;
          let c = null; try { c = S.gevecht.hand.find(x => x.uid === uid) || null; } catch (e) { c = null; }
          E.vel.push({ t: nu(), kantoor: v.dataset.kantoor, naam: (v.querySelector('.kv-naam') || {}).textContent || '',
            kaart: c ? c.id : null, type: (c && typeof KAARTEN !== 'undefined' && KAARTEN[c.id]) ? KAARTEN[c.id].type : null,
            echt: k ? ((k.querySelector('.kaart-naam') || {}).textContent || '') : '', hand: !!v.closest('#hand'), kloon: !!v.closest('.kloon-vlieg') });
        });
        if (n.classList.contains('baas-spraak')) { const cs = getComputedStyle(n); E.plaat.push({ t: nu(), tekst: n.textContent, cls: n.className, anim: cs.animationName, duur: cs.animationDuration }); }
        if (n.classList.contains('spraak')) E.spraak.push({ t: nu(), tekst: n.textContent });
        if (n.classList.contains('toast')) E.toasts.push({ t: nu(), tekst: n.textContent });
      });
    }).observe(document.body, { childList: true, subtree: true });
    requestAnimationFrame(lus);
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
}.toString()})();`;

const ECHO_STAND = () => {
  const E = window.__e || {};
  const ok = typeof S !== 'undefined' && !!S;
  let c = null; try { c = JSON.parse(localStorage.getItem('slayit_proloog') || 'null'); } catch (e) { c = 'FOUT'; }
  return {
    scherm: document.body.dataset.scherm,
    vijanden: ok && S.gevecht ? S.gevecht.vijanden.map(v => v.id) : null,
    hp: ok && S.gevecht ? S.gevecht.vijanden.map(v => v.hp) : null,
    seed: ok ? S.seed : null, daily: ok ? !!S.daily : null, gevechten: ok && S.stats ? S.stats.gevechten : null,
    contractRuw: localStorage.getItem('slayit_proloog'), contract: c,
    vel: E.vel || [], plaat: E.plaat || [], spraak: E.spraak || [], anim: E.anim || {},
    eersteBeeld: E.eersteBeeld || null, zichtbaarVanaf: E.zichtbaarVanaf, velEerst: E.velEerst, velLaatst: E.velLaatst, velMax: E.velMax || 0,
    fakkelPuls: E.fakkelPuls, toasts: E.toasts || [], zinBedekt: E.zinBedekt || 0,
    inzageHint: typeof INST !== 'undefined' ? INST.inzageHintGezien : null, inzageHintOpslag: (() => { try { return !!JSON.parse(localStorage.getItem('slayit_inst') || '{}').inzageHintGezien; } catch (e) { return null; } })(),
    velNu: document.querySelectorAll('.kaart-kantoorvel').length,
    acN: window.__acN, scrollH: document.documentElement.scrollHeight, innerH: innerHeight,
    draai: document.getElementById('draai-blok').classList.contains('toon'),
    brandt: document.querySelectorAll('.kaart-kantoorvel.brandt').length,
    tijdWand: performance.timeOrigin
  };
};
const echoStand = page => page.evaluate(ECHO_STAND);
/* het contract zonder de twee echo-velden: al de rest moet byte-gelijk blijven */
const zonderEcho = ruw => { try { const c = JSON.parse(ruw); delete c.echo; delete c.echoSeed; return JSON.stringify(c); } catch (e) { return 'FOUT'; } };

/* CONTACTVEL via een CDP-screencast: echt, niet ingegrepen — de beelden komen zoals de browser ze tekent */
async function echoFilm(page, vp) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', f => { frames.push({ ts: f.metadata.timestamp, data: f.data }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'png', maxWidth: Math.round(vp.w / 2), maxHeight: Math.round(vp.h / 2), everyNthFrame: 1 });
  return { stop: async () => { await cdp.send('Page.stopScreencast').catch(() => {}); await cdp.detach().catch(() => {}); return frames; } };
}
const CONTACT_MS = [0, 150, 300, 450, 600, 750, 900, 1050, 1200, 1350, 1500, 1800];
function contactvel(frames, t0Wand, bestand) {
  if (!PNG || !frames.length) return 0;
  /* per moment het eerste beeld dat de browser op of na dat moment tekende */
  const kies = CONTACT_MS.map(o => frames.find(f => f.ts * 1000 >= t0Wand + o) || frames[frames.length - 1]);
  const beelden = kies.map(f => PNG.sync.read(Buffer.from(f.data, 'base64')));
  const w = Math.max(...beelden.map(b => b.width)), h = Math.max(...beelden.map(b => b.height)), K = 4, R = 3, G = 4;
  const vel = new PNG({ width: K * w + (K + 1) * G, height: R * h + (R + 1) * G });
  for (let i = 0; i < vel.data.length; i += 4) { vel.data[i] = 20; vel.data[i + 1] = 16; vel.data[i + 2] = 24; vel.data[i + 3] = 255; }
  beelden.forEach((b, i) => {
    const x0 = G + (i % K) * (w + G), y0 = G + Math.floor(i / K) * (h + G);
    for (let y = 0; y < Math.min(h, b.height); y++) for (let x = 0; x < Math.min(w, b.width); x++) {
      const s = (y * b.width + x) * 4, d = ((y0 + y) * vel.width + x0 + x) * 4;
      vel.data[d] = b.data[s]; vel.data[d + 1] = b.data[s + 1]; vel.data[d + 2] = b.data[s + 2]; vel.data[d + 3] = 255;
    }
  });
  fs.writeFileSync(bestand, PNG.sync.write(vel));
  return frames.length;
}

async function echoOpen(browser, vp, o) {
  o = o || {};
  const opslag = Object.assign({}, o.opslag || {});
  if (o.lite) opslag.slayit_inst = JSON.stringify({ lite: true, d3: false, mobielHersteld2: true });
  else if (vp.d3 !== undefined) opslag.slayit_inst = JSON.stringify({ d3: !!vp.d3, mobielHersteld2: true });
  return open(browser, vp, { rustig: !!o.rustig, opslag, meter: ECHO_METER });
}
/* 'Nieuw avontuur' → de stub-proloog → de landing (een tik springt naar het eind, of natuurlijk) → de kaart */
async function landOpKaart(page, vp, o) {
  o = o || {};
  await page.evaluate(h => { window.__plStubHeld = h; }, o.held || 'gifmagier');
  await knopNieuw(page, vp);
  await wachtOp(page, () => !!window.__plKlaarT, 6000);
  if (o.samplen) await page.evaluate(() => { window.__e.samplenLanding = true; });
  if (!o.natuurlijk) {
    await slaap(300);
    if (vp.m) await page.touchscreen.tap(Math.round(vp.w / 2), Math.round(vp.h / 2)); else await page.mouse.click(Math.round(vp.w / 2), Math.round(vp.h / 2));
  }
  await wachtOp(page, () => typeof proloogBezig === 'function' && !proloogBezig(), 12000);
  /* 'Nieuw avontuur' vraagt op mobiel fullscreen: headless is het venster dan groter dan de viewport
     (de screencast filmt dat mee) en kan het niet meer draaien. Uit fullscreen: de viewport blijft gelijk. */
  if (vp.m) await page.evaluate(() => (document.fullscreenElement && document.exitFullscreen) ? document.exitFullscreen().catch(() => {}) : null);
  await slaap(300);
  return page.evaluate(() => document.body.dataset.scherm);
}
async function naarEersteKamer(page, vp) {
  const k = page.locator('#kaart-vlak .knoop.kan').first();
  if (vp.m) await k.tap(); else await k.click();
  return wachtOp(page, () => document.body.dataset.scherm === 'gevecht', 8000);
}
/* de vaste toetsen van een echo die gespeeld heeft (o: { L, voor (het contract vóór), zacht, minDuur, maxDuur, rustig }) */
function toetsEcho(s, o) {
  const L = o.L;
  t(JSON.stringify(s.vijanden) === '["groene_slijm"]', `${L}: het eerste gevecht is ["groene_slijm"] (solo): ${JSON.stringify(s.vijanden)}`);
  const eb = s.eersteBeeld || {};
  t(eb.kaarten >= 5 && eb.metVel === eb.kaarten, `${L}: in het eerste beeld van het gevecht draagt elke handkaart een kantoorvel (${eb.metVel}/${eb.kaarten})`);
  const eerste = s.vel.filter(v => v.t <= (s.velEerst === null ? 0 : s.velEerst) + 50);
  const mis = eerste.filter(v => { const wil = verwachtKantoor(v.kaart, v.type); return v.kantoor !== wil || v.naam !== (PL_HAND[wil] || {}).naam; });
  t(eerste.length >= 5 && !mis.length, `${L}: elk vel is de juiste kantoorkaart: ${eerste.map(v => `${v.echt || v.kaart} ← ${v.naam}`).join(' · ')}` + (mis.length ? ' — FOUT: ' + JSON.stringify(mis) : ''));
  const duur = (s.velLaatst === null || s.zichtbaarVanaf === null) ? null : s.velLaatst - s.zichtbaarVanaf;
  const max = o.maxDuur || 1500, min = o.minDuur || 0;
  t(duur !== null && duur <= max && duur >= min, `${L}: .kaart-kantoorvel na ${duur} ms weg, gemeten vanaf het gevecht in beeld (≤ ${max}${min ? ', ≥ ' + min : ''} ms)`);
  t(s.vel.length === eerste.length && !s.vel.some(v => v.kloon || !v.hand) && s.velNu === 0,
    `${L}: geen vel kwam terug: ${s.vel.length} toegevoegd, allemaal in het eerste beeld, nu ${s.velNu}, geen in een wegvliegende kopie`);
  const zin = s.plaat.filter(p => p.tekst === ECHO_ZIN);
  const zinNa = zin[0] && s.zichtbaarVanaf !== null ? zin[0].t - s.zichtbaarVanaf : null;
  t(zin.length === 1 && /pl-echo-zin/.test(zin[0].cls) && s.plaat.length === 1, `${L}: de zin precies 1x op de spraakplaat (${zin.length}x, ${s.plaat.length} platen in totaal), na ${zinNa} ms: "${zin[0] ? zin[0].tekst : ''}"`);
  if (zin[0]) t(o.rustig ? zin[0].anim === 'plEchoZin' : zin[0].anim === 'spraakKoning', `${L}: de spraakplaat ${o.rustig ? 'rustig: een korte inkomst' : 'met haar gewone plaatanimatie'} (${zin[0].anim}, ${zin[0].duur})`);
  t(!s.spraak.length, `${L}: de slijm blubt niet door de zin heen (spraakbellen: ${s.spraak.length ? s.spraak.map(x => x.tekst).join(' | ') : 'geen'})`);
  t(s.zinBedekt === 0, `${L}: geen melding over de zin (${s.zinBedekt} beelden bedekt; meldingen in het gevecht: ${s.toasts.length ? s.toasts.map(x => x.tekst.slice(0, 40)).join(' | ') : 'geen'})`);
  const c = s.contract || {};
  t(c.echo === 1 && c.echoSeed === s.seed && (!o.voor || zonderEcho(s.contractRuw) === zonderEcho(o.voor)),
    `${L}: contract.echo ${o.voorEcho === undefined ? '0' : o.voorEcho} → ${c.echo}, echoSeed "${c.echoSeed}" = de run "${s.seed}", de rest van het contract byte-gelijk`);
  t(s.scrollH <= s.innerH + 1 && s.acN <= 1, `${L}: geen paginascroll (${s.scrollH}/${s.innerH}), ${s.acN} AudioContext`);
}

async function deelEcho(browser) {
  console.log('\n== 8 · R5 · DE ECHO IN DE EERSTE KAMER ==');
  const F = {
    laptop2d: { n: 'laptop-2d', w: 1440, h: 900, d3: false },
    laptop3d: { n: 'laptop-3d', w: 1440, h: 900, d3: true },
    l1366: { n: '1366x768', w: 1366, h: 768 },
    liggend: { n: 'liggend-800x360', w: 800, h: 360, m: true },
    thomas: { n: 'thomas-846x381', w: 846, h: 381, m: true },
    staand: { n: 'staand-412x915', w: 412, h: 915, m: true }
  };
  const fouten = (L, page) => t(page.__f.length === 0, `${L}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
  const dir = path.join(UIT, 'echo'); fs.mkdirSync(dir, { recursive: true });
  /* SLAYIT_ECHO=8A,8C (komma-gescheiden) draait alleen die stukken — een optie van dit testscript, geen haak in de game */
  const STUK = (process.env.SLAYIT_ECHO || '').split(',').map(x => x.trim()).filter(Boolean);
  const stuk = x => !STUK.length || STUK.includes(x);

  /* ---- 8A · natuurlijk, per formaat en per held (+ een dek met de bijzondere kaarten en de type-terugval) ---- */
  const A = [
    { vp: F.laptop2d, held: 'slachter' },
    { vp: F.laptop3d, held: 'gifmagier' },
    { vp: F.l1366, held: 'thoverk', dek: ['knal', 'dodelijke_kus', 'gifflits', 'vonkenbeet', 'stoofpotje'] },
    { vp: F.liggend, held: 'slachter', dek: ['slag', 'prik', 'takkenslag', 'metaalhuid', 'pijn'] },
    { vp: F.thomas, held: 'gifmagier' },
    { vp: F.staand, held: 'thoverk', draai: true }
  ];
  if (stuk('8A')) for (const a of A) {
    const L = `8A ${a.vp.n} ${a.held}${a.dek ? ' (dek ' + a.dek.join(',') + ')' : ''}`;
    const { ctx, page } = await echoOpen(browser, a.vp);
    const sch = await landOpKaart(page, a.vp, { held: a.held });
    const voor = await page.evaluate(() => localStorage.getItem('slayit_proloog'));
    const cv = JSON.parse(voor || '{}');
    t(sch === 'kaart' && cv.echo === 0 && cv.echoSeed === undefined, `${L}: geland op "${sch}", contract.echo ${cv.echo} (nog geen echoSeed)`);
    if (a.dek) await page.evaluate(ids => { S.dek = ids.map(id => nieuweKaart(id)); saveSpel(); }, a.dek);
    let film = a.draai ? null : await echoFilm(page, a.vp);
    const w = await naarEersteKamer(page, a.vp);
    t(w >= 0, `${L}: de eerste kamer na ${w} ms`);
    if (a.draai) {
      /* telefoon staand: 'Gevechten speel je liggend' — de vellen wachten stil tot het gevecht in beeld is */
      await slaap(2000);
      const b = await echoStand(page);
      t(b.draai && b.velNu >= 5 && b.brandt === 0 && b.contract.echo === 0 && b.contract.echoSeed === b.seed && b.zichtbaarVanaf === null && !b.plaat.length,
        `${L}: achter het draai-blok liggen de ${b.velNu} vellen stil (brandt ${b.brandt}), contract.echo nog ${b.contract.echo} (echoSeed "${b.contract.echoSeed}" = de run), geen zin`);
      film = await echoFilm(page, { w: a.vp.h, h: a.vp.w });   /* gefilmd op de maat van het gedraaide toestel */
      /* het toestel draait (headless kan een schermvullend venster niet van maat veranderen: eerst uit fullscreen) */
      await page.evaluate(() => (document.fullscreenElement && document.exitFullscreen) ? document.exitFullscreen().catch(() => {}) : null);
      await slaap(150);
      await page.setViewportSize({ width: a.vp.h, height: a.vp.w });
      await slaap(200);
    }
    await slaap(3800);
    const s = await echoStand(page);
    const frames = await film.stop();
    const n = contactvel(frames, s.tijdWand + (s.zichtbaarVanaf || 0), path.join(dir, `contactvel-8A-${a.vp.n}-${a.held}.png`));
    toetsEcho(s, { L, voor, minDuur: 1100 });
    if (a.vp.m) t(s.inzageHint === false && s.inzageHintOpslag === false && !s.toasts.some(x => /inzage/.test(x.tekst)),
      `${L}: de inzage-hint van het eerste mobiele gevecht schuift door naar het volgende gevecht (INST.inzageHintGezien ${s.inzageHint}, bewaard ${s.inzageHintOpslag})`);
    t(s.fakkelPuls !== null && s.fakkelPuls - s.zichtbaarVanaf >= 1000 && s.fakkelPuls - s.zichtbaarVanaf <= 1500, `${L}: het opgebrande papier voedt de fakkel: één warme puls op de fakkelchip na ${s.fakkelPuls === null ? '—' : s.fakkelPuls - s.zichtbaarVanaf} ms`);
    console.log(`   info ${L}: contactvel ${n} screencastbeelden → ${path.join('echo', `contactvel-8A-${a.vp.n}-${a.held}.png`)} (op ${CONTACT_MS.join(' · ')} ms)`);
    /* nooit terug: 'Einde beurt' → de slijm → een nieuwe hand: geen vel, geen tweede zin */
    await page.evaluate(() => { const k = document.getElementById('knop-eindbeurt'); if (k) k.click(); });
    await wachtOp(page, () => S.gevecht && !S.gevecht.bezig && S.gevecht.beurt >= 1, 6000);
    await slaap(900);
    const s2 = await echoStand(page);
    t(s2.vel.length === s.vel.length && s2.velNu === 0 && s2.plaat.filter(p => p.tekst === ECHO_ZIN).length === 1, `${L}: na 'Einde beurt' en een nieuwe hand: nog altijd ${s2.vel.length} vellen ooit, nu ${s2.velNu}, de zin 1x`);
    fouten(L, page);
    await ctx.close();
  }

  /* ---- 8B · doortikken (een tik om de 150 ms vanaf het begin) en een kaart spelen midden in de echo ---- */
  if (stuk('8B')) for (const b of [{ vp: F.laptop2d, held: 'slachter' }, { vp: F.thomas, held: 'thoverk' }]) {
    const L = `8B ${b.vp.n} doortikken`;
    const { ctx, page } = await echoOpen(browser, b.vp);
    await landOpKaart(page, b.vp, { held: b.held });
    const voor = await page.evaluate(() => localStorage.getItem('slayit_proloog'));
    await naarEersteKamer(page, b.vp);
    const tik0 = await page.evaluate(() => Math.round(performance.now()));
    for (let i = 0; i < 12; i++) {   /* in het slagveld, boven de slijm: niets om te spelen, alleen doorspoelen */
      if (b.vp.m) await page.touchscreen.tap(Math.round(b.vp.w * 0.5), Math.round(b.vp.h * 0.22)); else await page.mouse.click(Math.round(b.vp.w * 0.5), Math.round(b.vp.h * 0.22));
      await slaap(150);
    }
    await slaap(2500);
    const s = await echoStand(page);
    toetsEcho(s, { L, voor, maxDuur: 700 });
    t(s.velLaatst - tik0 <= 600, `${L}: de eerste tik laat de vellen opbranden: weg ${s.velLaatst - tik0} ms na de eerste tik (≤ 600)`);
    fouten(L, page);
    await ctx.close();
  }
  if (stuk('8B')) {
    const L = '8B laptop-2d een kaart spelen tijdens de echo';
    const { ctx, page } = await echoOpen(browser, F.laptop2d);
    await landOpKaart(page, F.laptop2d, { held: 'slachter' });
    await page.evaluate(() => { S.dek = ['slag', 'slag', 'slag', 'slag', 'slag'].map(id => nieuweKaart(id)); saveSpel(); });
    await naarEersteKamer(page, F.laptop2d);
    await slaap(650);   /* de vellen staan in brand */
    const hp0 = await page.evaluate(() => S.gevecht.vijanden[0].hp);
    const k = page.locator('#hand .kaart').first();
    const bb = await k.boundingBox();
    await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height * 0.3);
    await slaap(120);
    const kloon = await page.evaluate(() => ({ klonen: document.querySelectorAll('.kloon-vlieg').length, metVel: document.querySelectorAll('.kloon-vlieg .kaart-kantoorvel').length }));
    await slaap(3000);
    const s = await echoStand(page);
    t(s.hp[0] < hp0 && kloon.klonen >= 1 && kloon.metVel === 0, `${L}: de Slag raakt de slijm (HP ${hp0} → ${s.hp[0]}), de wegvliegende kaart (${kloon.klonen}) draagt geen vel (${kloon.metVel})`);
    t(s.velNu === 0 && s.velLaatst - s.zichtbaarVanaf <= 1500 && !s.vel.some(v => v.kloon) && s.plaat.filter(p => p.tekst === ECHO_ZIN).length === 1,
      `${L}: de rest brandt op en is na ${s.velLaatst - s.zichtbaarVanaf} ms weg; de zin 1x`);
    fouten(L, page);
    await ctx.close();
  }

  /* ---- 8C · herladen midden in het eerste gevecht ---- */
  if (stuk('8C')) for (const h of [{ vp: F.laptop2d, na: 700 }, { vp: F.thomas, na: 3000 }]) {
    const L = `8C ${h.vp.n} herladen ${h.na} ms in het eerste gevecht`;
    const { ctx, page } = await echoOpen(browser, h.vp);
    await landOpKaart(page, h.vp, { held: 'gifmagier' });
    await naarEersteKamer(page, h.vp);
    await slaap(h.na);
    const voor = await echoStand(page);
    t(voor.contract.echo === 1 && voor.velEerst !== null, `${L}: de echo liep (contract.echo ${voor.contract.echo}, vellen gezien)`);
    await page.reload({ waitUntil: 'load' });
    await slaap(900);
    await page.evaluate(() => doorgaan());
    await slaap(700);
    const w = await naarEersteKamer(page, h.vp);
    await slaap(3200);
    const s = await echoStand(page);
    t(w >= 0 && JSON.stringify(s.vijanden) === '["groene_slijm"]' && s.gevechten === 1 && s.seed === voor.seed,
      `${L}: na de herlaad (Doorgaan) is de eerste kamer wéér de Groene Slijm (${JSON.stringify(s.vijanden)}, dezelfde run ${s.seed})`);
    t(s.vel.length === 0 && s.velEerst === null && !s.plaat.some(p => p.tekst === ECHO_ZIN), `${L}: geen kantoorvel (${s.vel.length}) en geen zin (${s.plaat.filter(p => p.tekst === ECHO_ZIN).length}x) na de herlaad`);
    t(s.contractRuw === voor.contractRuw, `${L}: het contract is byte-gelijk gebleven (echo ${s.contract.echo})`);
    fouten(L, page);
    await ctx.close();
  }
  if (stuk('8C')) {
    /* herladen achter het draai-blok: de echo speelde nog niet, dus hij komt na de herlaad */
    const L = '8C staand-412x915 herladen achter het draai-blok';
    const { ctx, page } = await echoOpen(browser, F.staand);
    await landOpKaart(page, F.staand, { held: 'slachter' });
    await naarEersteKamer(page, F.staand);
    await slaap(1200);
    const voor = await echoStand(page);
    t(voor.draai && voor.contract.echo === 0 && voor.contract.echoSeed === voor.seed, `${L}: achter het draai-blok: contract.echo ${voor.contract.echo}, echoSeed = de run`);
    await page.reload({ waitUntil: 'load' });
    await slaap(900);
    await page.evaluate(() => doorgaan());
    await slaap(700);
    await naarEersteKamer(page, F.staand);
    await slaap(800);
    await page.locator('#draai-blok button').tap();   /* 'Toch staand spelen' */
    await slaap(3800);
    const s = await echoStand(page);
    toetsEcho(s, { L: L + ' → Toch staand spelen', voor: voor.contractRuw, minDuur: 900 });
    fouten(L, page);
    await ctx.close();
  }

  /* ---- 8D · herbeleven raakt het niet; de echo speelt nooit een tweede keer ---- */
  if (stuk('8D')) {
    const L = '8D laptop-2d herbeleven';
    const vp = F.laptop2d;
    const { ctx, page } = await echoOpen(browser, vp);
    await landOpKaart(page, vp, { held: 'slachter' });
    const c0 = await page.evaluate(() => localStorage.getItem('slayit_proloog'));
    await page.evaluate(() => herbeleefProloog());
    await wachtOp(page, () => typeof proloogBezig === 'function' && proloogBezig(), 3000);
    await wachtOp(page, () => !proloogBezig() && document.body.dataset.scherm === 'kaart', 8000);
    const c1 = await page.evaluate(() => localStorage.getItem('slayit_proloog'));
    t(c1 === c0 && JSON.parse(c1).echo === 0, `${L}: herbeleven vóór de eerste kamer: het contract byte-gelijk (echo ${JSON.parse(c1).echo})`);
    await naarEersteKamer(page, vp);
    await slaap(3800);
    let s = await echoStand(page);
    toetsEcho(s, { L: L + ' → de echo speelt daarna gewoon', voor: c0, minDuur: 1100 });
    const c2 = s.contractRuw;
    await page.reload({ waitUntil: 'load' });
    await slaap(900);
    await page.locator('#scherm-titel .knop-stil', { hasText: 'Proloog' }).click();
    await wachtOp(page, () => document.body.dataset.scherm === 'proloog', 3000);
    await wachtOp(page, () => typeof proloogBezig === 'function' && !proloogBezig() && document.body.dataset.scherm === 'titel', 8000);
    const c3 = await page.evaluate(() => localStorage.getItem('slayit_proloog'));
    t(c3 === c2, `${L}: herbeleven ná de echo (titelknop 'Proloog'): het contract byte-gelijk (echo ${JSON.parse(c3).echo})`);
    /* een tweede run: geen echo meer */
    await page.evaluate(() => { wisSave(); toonHeldKeuze(); kiesHeldEcht('thoverk'); });
    await slaap(1200);
    await naarEersteKamer(page, vp);
    await slaap(3000);
    s = await echoStand(page);
    t(s.vel.length === 0 && !s.plaat.some(p => p.tekst === ECHO_ZIN) && s.contractRuw === c2,
      `${L}: een tweede run: geen kantoorvel (${s.vel.length}), geen zin, contract byte-gelijk — de eerste kamer is gewoon ${JSON.stringify(s.vijanden)}`);
    fouten(L, page);
    await ctx.close();
  }

  /* ---- 8E · de daily raakt het niet ---- */
  if (stuk('8E')) {
    const L = '8E laptop-2d de daily';
    const vp = F.laptop2d;
    const c0 = JSON.stringify({ v: 2, jeugddroom: 'astronaut', uitweg: 'geduwd', held: 'thoverk', masker: 'vlucht', glimlachen: 3, fotoKantoor: false, zelfGestempeld: true, wachtToon: -7, echo: 0 });
    const { ctx, page } = await echoOpen(browser, vp, { opslag: { slayit_proloog_klaar: '1', slayit_proloog: c0 } });
    await page.evaluate(() => startDaily());
    await slaap(1200);
    await page.evaluate(() => { if (typeof sluitDagwetProclamatie === 'function') sluitDagwetProclamatie(); });   /* de proclamatie van de dagwet dicht */
    await slaap(400);
    const dag = await page.evaluate(() => ({ daily: !!(S && S.daily), scherm: document.body.dataset.scherm }));
    await page.evaluate(() => { const n = Object.values(S.kaart).find(k => k.r === 0); kiesNodeEcht(n.id); });
    await slaap(3000);
    let s = await echoStand(page);
    t(dag.daily && s.scherm === 'gevecht' && s.vel.length === 0 && !s.plaat.some(p => p.tekst === ECHO_ZIN) && s.contractRuw === c0,
      `${L}: de eerste kamer van de daily (S.daily ${dag.daily}): geen kantoorvel (${s.vel.length}), geen zin, contract byte-gelijk (echo ${s.contract.echo}) — ${JSON.stringify(s.vijanden)}`);
    /* daarna een gewone run: de echo wachtte */
    await page.evaluate(() => { stopGevechtLus(); S.gevecht = null; wisSave(); toonHeldKeuze(); kiesHeldEcht('slachter'); window.__eReset(); });
    await slaap(1200);
    await naarEersteKamer(page, vp);
    await slaap(3800);
    s = await echoStand(page);
    toetsEcho(s, { L: L + ' → daarna een gewone run: de echo', voor: c0, minDuur: 1100 });
    fouten(L, page);
    await ctx.close();
  }

  /* ---- 8F · reduced motion en lite: geen animatie in de landing of de echo langer dan 800 ms ---- */
  if (stuk('8F')) for (const r of [{ vp: F.laptop2d, rustig: true, n: 'reduced motion' }, { vp: F.thomas, lite: true, n: 'lite' }]) {
    const L = `8F ${r.vp.n} ${r.n}`;
    const { ctx, page } = await echoOpen(browser, r.vp, { rustig: r.rustig, lite: r.lite });
    const lite = await page.evaluate(() => document.body.classList.contains('lite'));
    const sch = await landOpKaart(page, r.vp, { held: 'gifmagier', natuurlijk: true, samplen: true });
    const voor = await page.evaluate(() => { window.__e.samplenGevecht = true; return localStorage.getItem('slayit_proloog'); });
    const film = await echoFilm(page, r.vp);
    await naarEersteKamer(page, r.vp);
    await slaap(4200);
    const s = await echoStand(page);
    const frames = await film.stop();
    contactvel(frames, s.tijdWand + (s.zichtbaarVanaf || 0), path.join(dir, `contactvel-8F-${r.vp.n}-${r.lite ? 'lite' : 'reduced'}.png`));
    t(sch === 'kaart' && (r.lite ? lite : true), `${L}: rustig geland op "${sch}"${r.lite ? ', body.lite ' + lite : ''}`);
    toetsEcho(s, { L, voor, rustig: true, minDuur: 900 });
    const lang = Object.entries(s.anim).filter(([, d]) => !(d <= 800));
    const fasen = ['landing', 'echo'].map(f => Object.keys(s.anim).filter(k => k.indexOf(f + ':') === 0).length);
    t(fasen[0] > 0 && fasen[1] > 0 && !lang.length, `${L}: ${fasen[0]} animaties/overgangen in de landing en ${fasen[1]} in de echo, de langste ${Math.max(...Object.values(s.anim).filter(isFinite))} ms (≤ 800)` + (lang.length ? ' — TE LANG: ' + lang.map(([k, d]) => k + ' ' + d).join(' | ') : ''));
    console.log(`   info ${L}: ${Object.entries(s.anim).map(([k, d]) => k + ' ' + Math.round(d)).join(' · ')}`);
    fouten(L, page);
    await ctx.close();
  }

  /* ---- 8G · DEV-landing: de echo nog eens, alleen in het geheugen ---- */
  if (stuk('8G')) {
    const L = '8G laptop-2d DEV-landing';
    const vp = F.laptop2d;
    const c0 = JSON.stringify({ v: 2, jeugddroom: 'kok', uitweg: 'sprong', held: 'slachter', masker: 'woede', glimlachen: 5, fotoKantoor: true, zelfGestempeld: false, wachtToon: -7, echo: 1, echoSeed: 'OUDE-RUN' });
    const { ctx, page } = await echoOpen(browser, vp, { opslag: { slayit_proloog_klaar: '1', slayit_proloog: c0 } });
    await page.evaluate(() => devLanding('gifmagier'));
    await slaap(400);
    await page.mouse.click(Math.round(vp.w / 2), Math.round(vp.h / 2));
    await wachtOp(page, () => !proloogBezig() && document.body.dataset.scherm === 'kaart', 5000);
    await slaap(300);
    await naarEersteKamer(page, vp);
    await slaap(3800);
    const s = await echoStand(page);
    const zin = s.plaat.filter(p => p.tekst === ECHO_ZIN).length;
    t(JSON.stringify(s.vijanden) === '["groene_slijm"]' && s.vel.length >= 5 && s.velNu === 0 && zin === 1 && s.contractRuw === c0,
      `${L}: de echo speelt (${s.vel.length} vellen, de zin ${zin}x, ${JSON.stringify(s.vijanden)}) en het contract blijft byte-gelijk (echo ${s.contract.echo}, echoSeed "${s.contract.echoSeed}")`);
    fouten(L, page);
    await ctx.close();
  }

  /* ---- 8S · statisch ---- */
  if (stuk('8S')) {
    const game = fs.readFileSync(path.join(WT, 'js', 'game.js'), 'utf8');
    const brug = fs.readFileSync(path.join(WT, 'js', 'proloog-brug.js'), 'utf8');
    const css = fs.readFileSync(path.join(WT, 'css', 'style.css'), 'utf8');
    const rc = fs.readFileSync(path.join(WT, 'RELEASE-CHECKLIST.md'), 'utf8');
    const haken = game.split('\n').filter(r => /proloogEcho/.test(r));
    const sg = game.indexOf('function startGevecht(');
    const haak = game.indexOf('proloogEcho(samenstelling, soort, rij)');
    t(haken.length === 1 && haak > sg && haak - sg < 700, `8S: game.js roept proloogEcho één keer aan, bovenaan startGevecht (${haken.length} regel, ${haak - sg} tekens na de kop)`);
    let terugval = null;
    try { const m = brug.match(/const KANTOOR_TERUGVAL = (\{[\s\S]*?\n  \});/); terugval = vm.runInNewContext('(' + m[1] + ')'); } catch (e) { terugval = null; }
    const verschil = [];
    Object.keys(PL_HAND).forEach(id => {
      const d = PL_HAND[id], b = terugval && terugval[id];
      if (!b) { verschil.push(id + ' ontbreekt'); return; }
      if (b.naam !== d.naam || b.kost !== d.kost || b.label !== d.label || b.src !== d.src || b.tekst !== d.tekst.replace(/<[^>]*>/g, '')) verschil.push(id);
    });
    t(Object.keys(PL_HAND).length === 5 && terugval && Object.keys(terugval).length === 5 && !verschil.length, `8S: de terugvaltabel van de brug is letterlijk de hand van het gesprek in proloog/data.js (${Object.keys(PL_HAND).join(', ')})` + (verschil.length ? ' — VERSCHIL: ' + verschil.join(', ') : ''));
    t(/\.kaart-kantoorvel\.rustig\.brandt \.kv-papier/.test(css) && /prefers-reduced-motion[\s\S]{0,400}\.baas-spraak\.pl-echo-zin/.test(css) && /body\.lite \.baas-spraak\.pl-echo-zin/.test(css),
      `8S: style.css heeft het rustige pad van de echo (het vel vloeit weg, de spraakplaat kort bij reduced motion én lite)`);
    t(/echo/i.test(rc) && /DEV-landing|De landing/.test(rc), `8S: RELEASE-CHECKLIST.md noemt de echo bij de DEV-landing`);
  }
}

(async () => {
  const browser = await chromium.launch();
  const VPS = [{ n: 'laptop', w: 1440, h: 900 }, { n: 'liggend', w: 800, h: 360, m: true }, { n: 'staand', w: 412, h: 915, m: true }];
  const DEEL = (process.argv[2] || '').split(',').map(s => s.trim()).filter(Boolean);
  const doe = d => !DEEL.length || DEEL.includes(d);

  if (doe('landing')) {   /* R5: de delen 1-7 (R1) als filter 'landing'; deel 8 is 'echo' */

  /* ============================================================
     1 · DE HOOFDROUTE per viewport: titel -> proloog -> kaart, zonder herlaad
     ============================================================ */
  for (const vp of VPS) {
    console.log(`\n== 1 · ${vp.n} ${vp.w}x${vp.h} · titel -> proloog -> kaart ==`);
    const { ctx, page } = await open(browser, vp);
    const tTik = Date.now();
    await knopNieuw(page, vp);
    /* de heenweg: het titelvuur dooft, 400 ms zwart, dan scherm 'proloog' */
    await slaap(350);
    const heen = await page.evaluate(() => ({ dooft: document.body.classList.contains('pl-dooft'), scherm: document.body.dataset.scherm }));
    t(heen.dooft && heen.scherm === 'titel', `${vp.n}: na de tik dooft eerst het titelvuur (body.pl-dooft ${heen.dooft}, scherm "${heen.scherm}")`);
    const totProloog = await wachtOp(page, () => document.body.dataset.scherm === 'proloog', 4000);
    t(totProloog >= 0, `${vp.n}: scherm 'proloog' na ${totProloog + 350} ms (plan: 500 ms doven + 400 ms zwart)`);
    const inP = await page.evaluate(() => ({
      host: !!document.getElementById('scherm-proloog').shadowRoot,
      hostRect: (r => [r.left, r.top, r.width, r.height].map(Math.round))(document.getElementById('scherm-proloog').getBoundingClientRect()),
      tb: getComputedStyle(document.getElementById('topbalk')).display,
      modus: document.getElementById('scherm-proloog').dataset.modus, body: document.body.dataset.modus,
      muziek: window.Klank && Klank.huidigeScene
    }));
    t(inP.host && inP.hostRect[0] === 0 && inP.hostRect[1] === 0 && inP.hostRect[2] === vp.w && inP.hostRect[3] === vp.h,
      `${vp.n}: de proloog draait in een shadow root op #scherm-proloog, schermvullend ${JSON.stringify(inP.hostRect)}`);
    t(inP.tb === 'none' && inP.modus === inP.body && inP.muziek === 'stil', `${vp.n}: topbalk verborgen (${inP.tb}), data-modus gespiegeld op de host (${inP.modus}), muziekscène "${inP.muziek}"`);
    await page.screenshot({ path: path.join(UIT, vp.n + '-1-proloog.png') });
    /* de landing: klaar() komt na 500 ms; screenshots op de plan-momenten */
    const kT = await wachtOp(page, () => !!window.__plKlaarT, 3000);
    t(kT >= 0, `${vp.n}: de stub riep klaar() (${kT} ms na scherm 'proloog')`);
    const tKlaar = Date.now();
    const opT = async ms => { const w = ms - (Date.now() - tKlaar); if (w > 0) await slaap(w); };
    await opT(60);
    let s = await stand(page);
    t(s.sluierToon && s.scherm === 'kaart' && s.save && s.held === 'gifmagier', `${vp.n}: T 1,5 — sluier dicht (${s.sluierToon}), erachter al kiesHeldEcht: scherm "${s.scherm}", S.held "${s.held}", save ${s.save}`);
    t(/pl-landt/.test(s.bodyPl) && s.stops >= 1 && s.klaar === '1', `${vp.n}: body.pl-landt (${s.bodyPl}), Proloog.stop() ${s.stops}x, slayit_proloog_klaar = ${s.klaar}`);
    await opT(1150);
    await page.screenshot({ path: path.join(UIT, vp.n + '-2-titel-brandt.png') });
    const titel = await page.evaluate(() => {
      const ti = document.querySelector('#proloog-sluier .pl-titel'), tg = document.querySelector('#proloog-sluier .pl-tagline');
      const k = document.querySelector('#proloog-sluier .pl-kooltje');
      return {
        letters: document.querySelectorAll('#proloog-sluier .pl-letter.brand').length,
        font: ti ? Math.round(parseFloat(getComputedStyle(ti).fontSize)) : null,
        tagFont: tg ? Math.round(parseFloat(getComputedStyle(tg).fontSize)) : null,
        titelOnder: ti ? Math.round(ti.getBoundingClientRect().bottom) : null,
        tagOnder: tg ? Math.round(tg.getBoundingClientRect().bottom) : null,
        tagRechts: tg ? Math.round(tg.getBoundingClientRect().right) : null, tagLinks: tg ? Math.round(tg.getBoundingClientRect().left) : null,
        titelRechts: ti ? Math.round(ti.getBoundingClientRect().right) : null, titelLinks: ti ? Math.round(ti.getBoundingClientRect().left) : null,
        koolY: k ? Math.round(k.getBoundingClientRect().top + k.getBoundingClientRect().height / 2) : null
      };
    });
    t(titel.letters === 7, `${vp.n}: T 2,6 — alle 7 letters van SLAY LIT ingebrand (${titel.letters})`);
    t(titel.tagOnder < titel.koolY && titel.titelLinks >= 0 && titel.titelRechts <= vp.w && titel.tagLinks >= 0 && titel.tagRechts <= vp.w,
      `${vp.n}: titel ${titel.font} px / tagline ${titel.tagFont} px, volledig in beeld (x ${titel.titelLinks}-${titel.titelRechts}) en boven het kooltje (tagline tot y ${titel.tagOnder} < kooltje ${titel.koolY})`);
    await opT(3300);
    await page.screenshot({ path: path.join(UIT, vp.n + '-3-vonken.png') });
    await opT(4400);
    await page.screenshot({ path: path.join(UIT, vp.n + '-4-onthulling.png') });
    const onthul = await page.evaluate(() => ({
      mask: (document.querySelector('#proloog-sluier .pl-doek') || {}).style ? document.querySelector('#proloog-sluier .pl-doek').style.maskImage || document.querySelector('#proloog-sluier .pl-doek').style.webkitMaskImage : '',
      tf: document.getElementById('scherm-kaart').style.transform, origin: document.getElementById('scherm-kaart').style.transformOrigin,
      held: (r => [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)])(document.getElementById('kaart-held').getBoundingClientRect())
    }));
    t(/radial-gradient/.test(onthul.mask) && onthul.tf === 'scale(1)' && !!onthul.origin,
      `${vp.n}: T 5,1-6,7 — radiaal masker vanuit het kooltje en #scherm-kaart 1,35 -> 1 met oorsprong ${onthul.origin} (held op ${onthul.held.join(',')})`);
    await opT(6400);
    await page.screenshot({ path: path.join(UIT, vp.n + '-5-topbalk-fakkel.png') });
    await opT(8600);
    s = await stand(page);
    await page.screenshot({ path: path.join(UIT, vp.n + '-6-speelbaar.png') });
    t(s.log === 'titel > proloog > kaart', `${vp.n}: body.dataset.scherm: ${s.log}`);
    t(page.__nav === 0, `${vp.n}: 0x framenavigated (gemeten ${page.__nav}), url "${s.url}"`);
    t(s.held === 'gifmagier' && s.jeugddroom === 'brandweerman', `${vp.n}: S.held = "${s.held}" (het masker), jeugddroomTekst() = "${s.jeugddroom}"`);
    t(!s.sluierToon && s.sluierKind === 0 && s.bodyPl === '' && s.kaartTransform === '' && s.bezig === false,
      `${vp.n}: T 8,5 — sluier weg (${s.sluierToon}, ${s.sluierKind} kinderen), geen pl-klassen ("${s.bodyPl}"), kaart zonder transform, proloogBezig ${s.bezig}`);
    t(s.tbDisplay === 'flex' && s.tbTransform === 'none' && s.tbTop === 0, `${vp.n}: topbalk terug (display ${s.tbDisplay}, transform ${s.tbTransform}, top ${s.tbTop})`);
    t(s.fakkel === 80 && /80/.test(s.chip), `${vp.n}: fakkel ${s.fakkel}, chip "${s.chip}"`);
    t(s.acN <= 1 && s.koppel === 'ctx' && s.bus, `${vp.n}: ${s.acN} AudioContext, Klank.koppel() gaf de context (${s.koppel}) en een bus (${s.bus})`);
    t(s.scrollH <= s.innerH + 1 && s.scrollTop === 0, `${vp.n}: geen paginascroll (scrollHeight ${s.scrollH} / ${s.innerH}, scrollTop ${s.scrollTop})`);
    t(!!s.drankLeeg && s.drankLeeg.n === 3 && /lege flesplaats/.test(s.drankLeeg.tip || ''), `${vp.n}: lege drankslots: ${s.drankLeeg ? s.drankLeeg.n + ' flesjesomtrekken, tip "' + s.drankLeeg.tip + '"' : 'GEEN .drank-leeg'}`);
    const dlZicht = await page.evaluate(() => { const i = document.querySelector('#tb-dranken .drank-leeg i'); if (!i) return null; const r = i.getBoundingClientRect(); return { b: Math.round(r.width), h: Math.round(r.height), bg: getComputedStyle(i).backgroundImage.slice(0, 26), rechts: Math.round(r.right) }; });
    t(!!dlZicht && dlZicht.b >= 10 && dlZicht.h >= 14 && /svg/.test(dlZicht.bg) && dlZicht.rechts <= vp.w, `${vp.n}: een flesjesomtrek is ${dlZicht && dlZicht.b}x${dlZicht && dlZicht.h}px, svg-achtergrond, in beeld (rechts ${dlZicht && dlZicht.rechts})`);
    await slaap(1600);   /* het vignet vloeit in 1,2 s terug */
    const vg = await page.evaluate(() => { const v = document.getElementById('licht-vignet'); return { css: getComputedStyle(v).opacity, inline: v.style.opacity }; });
    t(vg.inline !== '' && Math.abs(parseFloat(vg.css) - parseFloat(vg.inline)) < 0.01, `${vp.n}: het vignet is terug op zijn fakkelstand (opacity ${vg.css}, zetLichtVisueel zegt ${vg.inline})`);
    t(page.__f.length === 0, `${vp.n}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
    /* PLAAT IDENTIEK: dezelfde seed, rechtstreeks via kiesHeldEcht, moet pixel-gelijk zijn */
    const seed = await page.evaluate(() => S.seed);
    await page.mouse.move(vp.w - 3, Math.round(vp.h * 0.55));
    await slaap(300);
    const A = await page.screenshot({ animations: 'disabled' });
    fs.writeFileSync(path.join(UIT, vp.n + '-7-na-landing.png'), A);
    const ref = await open(browser, vp, { opslag: { slayit_proloog_klaar: '1' } });
    await ref.page.evaluate(sd => { toonHeldKeuze(); document.getElementById('seed-invoer').value = sd; kiesHeldEcht('gifmagier'); }, seed);
    await slaap(2400);
    await ref.page.mouse.move(vp.w - 3, Math.round(vp.h * 0.55));
    await slaap(300);
    const B = await ref.page.screenshot({ animations: 'disabled' });
    fs.writeFileSync(path.join(UIT, vp.n + '-7-referentie.png'), B);
    const d = diffPng(A, B);
    t(d !== null && d < 2, `${vp.n}: plaat identiek aan een rechtstreekse kiesHeldEcht met seed ${seed}: gemiddeld verschil ${d === null ? 'n.v.t.' : d.toFixed(3)}/255 (< 2)`);
    await ref.ctx.close();
    await ctx.close();
  }

  /* ============================================================
     2 · TIK = NAAR HET EIND (vanaf T 1,5)
     ============================================================ */
  for (const vp of [VPS[0], VPS[2]]) {
    console.log(`\n== 2 · ${vp.n} · een tik springt naar het eind ==`);
    const { ctx, page } = await open(browser, vp);
    await knopNieuw(page, vp);
    await wachtOp(page, () => !!window.__plKlaarT, 5000);
    await slaap(900);
    if (vp.m) await page.touchscreen.tap(Math.round(vp.w / 2), Math.round(vp.h / 2)); else await page.mouse.click(Math.round(vp.w / 2), Math.round(vp.h / 2));
    await slaap(150);
    const s = await stand(page);
    t(!s.sluierToon && s.bodyPl === '' && s.scherm === 'kaart' && s.tbTransform === 'none' && /80/.test(s.chip) && s.bezig === false,
      `${vp.n}: T 2,4 + tik → meteen de eindstaat: sluier ${s.sluierToon}, pl "${s.bodyPl}", scherm "${s.scherm}", topbalk ${s.tbTransform}, chip "${s.chip}"`);
    const kamers = await page.evaluate(() => document.querySelectorAll('#scherm-einde.actief, #scherm-gevecht.actief, #scherm-event.actief').length);
    t(kamers === 0, `${vp.n}: de tik viel NIET door naar een kaartknoop (geen kamer geopend: ${kamers})`);
    t(page.__f.length === 0, `${vp.n}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f[0] : ''));
    await ctx.close();
  }
  {
    console.log('\n== 2b · laptop · Enter springt naar het eind ==');
    const { ctx, page } = await open(browser, VPS[0]);
    await knopNieuw(page, VPS[0]);
    await wachtOp(page, () => !!window.__plKlaarT, 5000);
    await slaap(1500);
    await page.keyboard.press('Enter'); await slaap(150);
    const s = await stand(page);
    t(!s.sluierToon && s.scherm === 'kaart' && s.bezig === false, `Enter tijdens de landing → eindstaat (sluier ${s.sluierToon}, scherm "${s.scherm}")`);
    await ctx.close();
  }

  /* ============================================================
     3 · DE POORTEN: veteraan / lopende run → heldkeuze met voorselectie
     ============================================================ */
  for (const geval of [
    { n: 'veteraan (Codex.runs 3)', vp: VPS[0], opslag: { slayit_codex: JSON.stringify({ runs: 3 }) } },
    { n: 'veteraan (ascensie 1) staand', vp: VPS[2], opslag: { slayit_codex: JSON.stringify({ ascensie: { slachter: 1 } }) } },
    { n: 'lopende run', vp: VPS[1], run: true }
  ]) {
    console.log(`\n== 3 · poort dicht: ${geval.n} ==`);
    const { ctx, page } = await open(browser, geval.vp, { opslag: geval.opslag });
    let voorSave = null;
    if (geval.run) {
      voorSave = await page.evaluate(() => { nieuwSpel('slachter', 'POORT-1', 0); saveSpel(); naarTitel(); return localStorage.getItem('slayit_save_v1'); });
    }
    await knopNieuw(page, geval.vp);
    await wachtOp(page, () => !!window.__plKlaarT, 5000);
    await slaap(7000);
    const s = await stand(page);
    await page.screenshot({ path: path.join(UIT, 'poort-' + geval.vp.n + '.png') });
    const inBeeld = await page.evaluate(() => {
      const k = document.querySelector('.held-kaart.voorkeur'); if (!k) return null;
      const r = k.getBoundingClientRect(), b = k.querySelector('.held-kies').getBoundingClientRect();
      const el = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), knopRaak: !!(el && el.closest('.held-kies')), knopY: Math.round(b.top), knopOnder: Math.round(b.bottom) };
    });
    t(s.scherm === 'held' && s.voorkeur === 'gifmagier', `${geval.n}: heldkeuze (scherm "${s.scherm}") met ember-rand op "${s.voorkeur}"`);
    t(!!inBeeld && inBeeld.knopRaak && inBeeld.knopOnder <= geval.vp.h, `${geval.n}: het voorgeselecteerde portret staat in beeld en 'Speel als' is volledig zichtbaar en raak via elementFromPoint (knop y ${inBeeld && inBeeld.knopY}-${inBeeld && inBeeld.knopOnder} van ${geval.vp.h})`);
    if (geval.run) {
      const naSave = await page.evaluate(() => localStorage.getItem('slayit_save_v1'));
      t(naSave === voorSave, `lopende run: de save is byte-gelijk gebleven (${naSave === voorSave}) — kiesHeldEcht is NIET gelopen`);
    } else t(!s.save, `${geval.n}: geen nieuwe run gestart (save ${s.save})`);
    t(s.klaar === '1' && !s.sluierToon && s.bezig === false, `${geval.n}: klaar-vlag ${s.klaar}, sluier weg, proloogBezig ${s.bezig}`);
    t(page.__f.length === 0, `${geval.n}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f[0] : ''));
    await ctx.close();
  }

  /* ============================================================
     4 · DE GATE: wie de proloog al kent, gaat meteen naar de heldkeuze
     ============================================================ */
  for (const geval of [
    { n: "'slayit_proloog_klaar'", opslag: { slayit_proloog_klaar: '1' } },
    { n: "'slayit_proloog_over'", opslag: { slayit_proloog_over: '1' } },
    { n: 'oud contract zonder v:2 met uitweg', opslag: { slayit_proloog: JSON.stringify({ jeugddroom: 'astronaut', uitweg: 'sprong', held: 'vlucht' }) } }
  ]) {
    const { ctx, page } = await open(browser, VPS[0], { opslag: geval.opslag });
    await knopNieuw(page, VPS[0]); await slaap(700);
    const s = await stand(page);
    t(s.scherm === 'held' && page.__proloogReq === 0 && s.log === 'titel > held', `gate ${geval.n}: meteen de heldkeuze (${s.log}), ${page.__proloogReq} proloogbestanden geladen`);
    await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, VPS[0], { opslag: { slayit_proloog: JSON.stringify({ v: 2, jeugddroom: 'piloot' }) } });
    await knopNieuw(page, VPS[0]);
    const w = await wachtOp(page, () => document.body.dataset.scherm === 'proloog', 3000);
    t(w >= 0, `gate: een half v:2-contract (proloog niet uitgespeeld) → de proloog hervat (scherm 'proloog' na ${w} ms)`);
    await ctx.close();
  }

  /* ============================================================
     5 · HERBELEVEN: titelknop 'Proloog' (voor wie hem kent), Codex per hoofdstuk, DEV-menu
     ============================================================ */
  {
    console.log('\n== 5 · herbeleven ==');
    const opslag = { slayit_proloog_klaar: '1', slayit_proloog: JSON.stringify({ v: 2, jeugddroom: 'piloot', uitweg: 'geduwd', held: 'thoverk' }), slaylit_proloog_v3: JSON.stringify({ scene: 5, checkpoint: 5, choices: {}, gezien: [0, 2, 3] }) };
    const { ctx, page } = await open(browser, VPS[0], { opslag });
    const voor = await page.evaluate(() => ({ c: localStorage.getItem('slayit_proloog'), s: localStorage.getItem('slayit_save_v1'), v3: localStorage.getItem('slaylit_proloog_v3') }));
    await page.locator('#scherm-titel .knop-stil', { hasText: 'Proloog' }).click();
    await wachtOp(page, () => document.body.dataset.scherm === 'proloog', 3000);
    await wachtOp(page, () => !!window.__plKlaarT, 3000);
    await slaap(2400);
    let s = await stand(page);
    const na = await page.evaluate(() => ({ c: localStorage.getItem('slayit_proloog'), s: localStorage.getItem('slayit_save_v1'), v3: localStorage.getItem('slaylit_proloog_v3') }));
    t(s.log === 'titel > proloog > titel' && s.starts[0] && s.starts[0].herbeleef === true, `titelknop 'Proloog' (al gekend) → herbeleven: ${s.log}, start(herbeleef ${s.starts[0] && s.starts[0].herbeleef})`);
    t(na.c === voor.c && na.s === voor.s && na.v3 === voor.v3 && !s.save, `herbeleven laat contract, save en proloog-save byte-gelijk (${na.c === voor.c}/${na.s === voor.s}/${na.v3 === voor.v3}), geen run gestart`);
    t(!s.sluierToon && s.bezig === false && s.tbDisplay === 'none', `na het herbeleven: sluier weg, proloogBezig ${s.bezig}, terug op de titel`);
    /* de Codex: een blok met de gezien-hoofdstukken */
    await page.evaluate(() => toonCodex()); await slaap(900);
    const cx = await page.evaluate(() => [...document.querySelectorAll('#codex-inhoud [data-pl-hoofdstuk]')].map(b => ({ h: b.dataset.plHoofdstuk, t: b.textContent.trim() })));
    t(cx.length === 8 && cx.some(c => c.h === 'factuur'), `Codex (uitgespeeld): 'Proloog herbeleven' + alle 7 hoofdstukken uit Proloog.hoofdstukken: ${cx.map(c => '[' + c.h + '] ' + c.t).join(' · ')}`);
    await page.locator('#codex-inhoud .pl-hfst', { hasText: 'Eindafrekening' }).click().catch(() => {});
    await wachtOp(page, () => document.body.dataset.scherm === 'proloog', 3000);
    s = await stand(page);
    const laatste = s.starts[s.starts.length - 1] || {};
    t(laatste.herbeleef === true && laatste.hoofdstuk === 'factuur' && !(await page.evaluate(() => document.getElementById('overlay-codex').classList.contains('open'))),
      `Codex-hoofdstuk 'De Eindafrekening' → Proloog.start({ herbeleef: ${laatste.herbeleef}, hoofdstuk: '${laatste.hoofdstuk}' }), Codex dicht`);
    await wachtOp(page, () => !document.body.classList.contains('pl-dooft') && typeof proloogBezig === 'function' && !proloogBezig(), 5000);
    /* DEV-menu: herbeleven midden in een run → terug naar de kaart, run onaangeroerd */
    await page.evaluate(() => { nieuwSpel('thoverk', 'DEV-1', 0); renderKaartScherm(); });
    await slaap(400);
    const runVoor = await page.evaluate(() => localStorage.getItem('slayit_save_v1'));
    await page.evaluate(() => { const l = document.querySelector('.tb-logo'); if (l) l.click(); }); await slaap(300);
    await page.evaluate(() => { const b = [...document.querySelectorAll('#dev-menu .dev-k')].find(x => /De Proloog/.test(x.textContent)); if (b) b.click(); });
    await wachtOp(page, () => document.body.dataset.scherm === 'proloog', 3000);
    await wachtOp(page, () => typeof proloogBezig === 'function' && !proloogBezig() && document.body.dataset.scherm !== 'proloog', 6000);
    s = await stand(page);
    const runNa = await page.evaluate(() => localStorage.getItem('slayit_save_v1'));
    t(s.scherm === 'kaart' && s.held === 'thoverk' && runNa === runVoor && s.tbDisplay === 'flex', `DEV-menu '📼 De Proloog' midden in een run → terug op "${s.scherm}", held ${s.held}, save byte-gelijk ${runNa === runVoor}, topbalk ${s.tbDisplay}`);
    t(page.__nav === 0 && page.__f.length === 0, `herbeleven: 0x framenavigated (${page.__nav}), geen paginafouten` + (page.__f.length ? ' — ' + page.__f[0] : ''));
    await ctx.close();
  }

  {
    const { ctx, page } = await open(browser, VPS[0], { opslag: { slaylit_proloog_v3: JSON.stringify({ scene: 2, checkpoint: 'start', choices: {}, gezien: [0, 2] }) } });
    await page.evaluate(() => toonCodex()); await slaap(200);
    const voorLaden = await page.evaluate(() => [...document.querySelectorAll('#codex-inhoud .pl-hfst')].map(b => b.dataset.plHoofdstuk).join(','));
    await slaap(1200);
    const naLaden = await page.evaluate(() => [...document.querySelectorAll('#codex-inhoud .pl-hfst')].map(b => b.dataset.plHoofdstuk + '=' + b.textContent.trim()).join(' · '));
    t(voorLaden === '0,2' && /^0=1 · Maandag, 06:42 · 2=3 · Het Glimlachquotum$/.test(naLaden), `Codex (half gespeeld, gezien [0,2]): vóór het laden ${voorLaden}, daarna "${naLaden}"`);
    t(page.__f.length === 0, `Codex half gespeeld: geen paginafouten` + (page.__f.length ? ' — ' + page.__f[0] : ''));
    await ctx.close();
  }

  /* ============================================================
     6 · DE ?proloog=1-ROUTE (de stub proloog/index.html) en de laadfout
     ============================================================ */
  {
    console.log('\n== 6 · ?proloog=1 en de laadfout ==');
    const { ctx, page } = await open(browser, VPS[2], { query: '?proloog=1' });
    const w = await wachtOp(page, () => document.body.dataset.scherm === 'proloog' || !!window.__plKlaarT, 4000);
    const url = await page.evaluate(() => location.search);
    t(w >= 0 && url === '', `?proloog=1 → de proloog start na de boot (${w} ms) en de parameter is weg (search "${url}")`);
    await wachtOp(page, () => !!window.__plKlaarT, 3000);
    await slaap(8000);
    const s = await stand(page);
    t(s.scherm === 'kaart' && s.held === 'gifmagier' && page.__nav === 0, `?proloog=1 → landt op "${s.scherm}" met ${s.held}, ${page.__nav}x framenavigated`);
    t(page.__f.length === 0, `?proloog=1: geen paginafouten (ook geen fullscreen-weigering zonder gebaar)` + (page.__f.length ? ' — ' + page.__f.slice(0, 2).join(' | ') : ''));
    await ctx.close();
    /* de stub-pagina zelf zou naar '../?proloog=1' sturen: die bestaat (proloog/index.html) */
    const stubBestaat = fs.existsSync(path.join(WT, 'proloog', 'index.html'));
    t(stubBestaat, `proloog/index.html bestaat (de stub van bouwer A stuurt door naar ../?proloog=1)`);
  }
  {
    const { ctx, page } = await open(browser, VPS[0], { laadFout: true });
    await knopNieuw(page, VPS[0]);
    const w = await wachtOp(page, () => document.body.dataset.scherm === 'held', 5000);
    const s = await stand(page);
    t(w >= 0 && s.bezig === false && !/pl-/.test(s.bodyPl), `laadfout (proloog.js 404) → toch de heldkeuze na ${w} ms (${s.log}), proloogBezig ${s.bezig}`);
    const doekWeg = await page.evaluate(() => !document.getElementById('toneel-doek').classList.contains('aan'));
    t(doekWeg, `laadfout: #toneel-doek is weer open (${doekWeg})`);
    await ctx.close();
  }

  /* ============================================================
     7 · REDUCED MOTION: geen schaal, geen vonken, overvloeier 800 ms, titel 1,2 s statisch
     ============================================================ */
  for (const vp of [VPS[0], VPS[1]]) {
    console.log(`\n== 7 · ${vp.n} · reduced motion ==`);
    const { ctx, page } = await open(browser, vp, { rustig: true });
    await knopNieuw(page, vp);
    await wachtOp(page, () => !!window.__plKlaarT, 5000);
    await slaap(400);
    const r = await page.evaluate(() => ({
      statisch: !!document.querySelector('#proloog-sluier .pl-titel.statisch'),
      tf: document.getElementById('scherm-kaart').style.transform,
      vonken: document.querySelectorAll('.pl-vonk-deeltje').length,
      pl: [...document.body.classList].filter(c => /^pl-/.test(c)).join(',')
    }));
    await page.screenshot({ path: path.join(UIT, vp.n + '-rustig-titel.png') });
    t(r.statisch && r.tf === '' && r.vonken === 0 && r.pl === '', `${vp.n}: statische titel (${r.statisch}), geen schaal ("${r.tf}"), 0 vonken, geen pl-landt ("${r.pl}")`);
    const eind = await wachtOp(page, () => !document.getElementById('proloog-sluier').classList.contains('toon'), 4000);
    t(eind >= 0 && eind + 400 <= 2400, `${vp.n}: de rustige landing is klaar na ~${eind + 400} ms (1,2 s titel + 0,8 s overvloeier)`);
    const s = await stand(page);
    t(s.scherm === 'kaart' && s.held === 'gifmagier' && /80/.test(s.chip), `${vp.n}: rustig geland op "${s.scherm}", ${s.held}, chip "${s.chip}"`);
    await ctx.close();
  }
  }   /* einde 'landing' (delen 1-7) */

  if (doe('echo')) await deelEcho(browser);

  await browser.close();
  console.log(`\n============================================\nPROLOOG-LANDING (game-kant, stub): ${okN} ok, ${foutN} FOUT\n============================================`);
  process.exit(foutN ? 1 : 0);
})();
