/* ============================================================================
   PROLOOG R1 · DE NAAD + R2 · DE VAL EN DE KLANK — ACCEPTATIESUITE (de ECHTE proloog + de echte brug)
   Loopt de R1-criteria uit .claude/notities/proloog_herwerking_plan.md §5 af, van
   'Nieuw avontuur' op de titel tot en met de landing op de Act 1-kaart, op
   1440x900 (laptop), 800x360 (liggend, isMobile/hasTouch) en 412x915 (staand).
   Anders dan tools/proloog_landing_acceptatie.js (de game-kant met een STUB-proloog)
   draait hier de echte proloog/*.js in de shadow root: dit is de naad zelf.

   Draaien (Windows, vanuit een map met playwright + pngjs in node_modules):
       NODE_PATH="$PWD/node_modules" SLAYIT_WORKTREE="...\SLAY-IT-proloog" \
       SLAYIT_SHOTS="$PWD/proloog_shots" node "...\SLAY-IT-proloog\tools\proloog_acceptatie.js"
   Optioneel een filter als argument: hoofd | skip | herbeleef | wipe | poort | stub | rustig |
   glimlach | lite | val | outro | statisch (meerdere mogen, komma-gescheiden). Zonder argument
   draait alles (±12 min).

   WAT HET MEET (plan §5 R1 'klaar als', per formaat waar het ertoe doet):
   1 hoofd     de hele proloog gespeeld (drie formaten, sprong/geduwd/sprong, drie maskers):
               titel → proloog → kaart, 0x framenavigated, geen oude nav/bolletjes/Verder/
               DAAL AF, nergens scroll, elke zichtbare CTA in beeld en raak (shadow root én
               document), S.held = het masker, jeugddroomTekst() = het getypte, 1 AudioContext,
               plaatdiff < 2/255, CSS-tokens/titelfont vóór = tijdens = na, fakkel 80,
               de sluier neemt over op T 1,5 s op exact het kooltje, lege drankslots.
   2 skip      Esc (laptop) en de ring (touch) 0,8 s vasthouden; kort = niets; ook wie
               overslaat landt; de nudge van de titel hangt niet over de proloog.
   3 herbeleef titelknop, Codex-hoofdstuk en midden in een run: opslag byte-gelijk.
   4 wipe      hervatten na een herlaad; na een WIPE weer scène 0.
   5 poort     veteraan en lopende run → de heldkeuze met voorselectie.
   6 stub      proloog/ → ../?proloog=1 onder /slay-lit/, zonder lek of 404.
   7 rustig    reduced motion: klaar op 0,9 s, statische titel, overvloeier.
   8 statisch  wat R1 wegnam blijft weg (grep op de bronnen).
   9 glimlach  (F1) een herlaad telt geen glimlach dubbel (gesprek en kantoor).
  10 lite      (F1) body.lite geldt ook in de proloog: geen blur, geen flikker, rustig pad.
   F1 (review-fixes) meet daarnaast in de hoofdroute: het naadframe (token ≤ 12 px of ≤ .15),
   de klankknop, het doek #07060a, de voorgeladen Afgrond-art, de onthulling (ease-out) en de
   fakkelvonk; in 2c overslaan + herladen in de Afgrond; de nudge niet over de verse kaart;
   herbeleven vanuit de Codex eindigt in de Codex.
   R2 (plan §5 R2 'klaar als', + de interface tussen de bouwers V en K):
   1 hoofd     per formaat de klank op de juiste momenten (spionnen op Klank): de jingle
               { vals: true } één keer in de boot, de wachtmuziek één keer vanaf de oproep,
               in de val 0, −1 … −7 (één halve toon per etage, op −7 de vaste noot), de stilte
               hangt de lijn op, wachtStop in de Afgrond; "VERBINDING VERBROKEN" precies 1x
               in de hele proloog (DOM + canvas); 0042 blijft in de kooi.
  11 val       de val ONAANGERAAKT (geduwd) per formaat: 12,6 ± 0,3 s; de transponering valt
               precies op elke etage; stilte(≈1500) na de vloer; VERBINDING 1x; de 0042-sprite
               staat elk beeld op dezelfde plek in de kooi, ook als de vloer weg is (geen vrij
               vallende figuur). Sprong bij CPU x4 (CDP): mediaan ≥ 50 fps, de knop −∞ licht op
               en wacht op jou. Reduced motion korter maar leesbaar. Lite waar de game hem
               aanzet (zwakke hardware → body.lite → de val lite vanaf beeld 1) en de
               fps-bewaker onder zware last. 1 AudioContext, geen paginafouten.
  12 outro     de outro-intro hervat de wachtmuziek op −7 en buigt omhoog; de reünie citeert
               "IK HEB HET LICHT NOG."; de maskerzinnen hebben één bron (proloog = outro).
   8 statisch  + 'OPGEHANGEN' en 'Rechtstreeks afdalen' nergens in proloog/*; de OutroFX-exports
               met één regel per constante in outro.js; val.js zonder audio-code.
   FIXER R2 (review-fixes, elk met een eigen controle):
   1/11a..e    VERBINDING VERBROKEN ≥ 900 ms op het canvas, ook voor wie doortikt.
  11a          het schaarhek dicht van bij het eerste beeld; na de vloer blijft 0042 zichtbaar staan
               (kruin + schoenen in de gloed van zijn kooltje, pixels); de vellen dwarrelen omhoog
               (niets onder de kooivloer); de lift houdt halt op 2 KANTOORTUIN; brom (vertrek → tl),
               verre donder bij de bliksem, het slot van het hek.
  11b          de gevallen foto ligt naast de knop −∞, niet eronder.
  11f          echte telefoons (DPR 3, 750x340 en 360x560): de schaal in fysieke pixels, ≥ 1,5x.
  11g          verborgen tab pauzeert klok én wachtmuziek; klank uit/aan rond −7 geeft de vaste
               noot terug; een dichte context bij de stilte hangt de lijn toch op; skip in de stilte
               heft de stilte op (Klank.stilteWeg).
   SLOT R2 (merge-sessie):
  11h          de inkeer na −∞: het licht trekt zich terug in het kooltje (randlicht, foto, knop)
               vóór de snit naar de Afgrond; 0042 verdwijnt niet meer in één beeld.
   Het script heeft GEEN server nodig: het bedient de worktree rechtstreeks vanaf
   schijf via route.fulfill op http://localhost:4173/** (ook onder /slay-lit/).
   Elke regel toont de GEMETEN waarde. Exit 1 bij minstens één fout.
   ============================================================================ */
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
let PNG = null; try { PNG = require('pngjs').PNG; } catch (e) { /* de plaatdiff meldt dan een fout */ }

const WORKTREE = process.env.SLAYIT_WORKTREE ||
  'C:\\Users\\Thomas Aelbrecht\\Desktop\\Workspace\\SLAY-IT-proloog';
const UIT = process.env.SLAYIT_SHOTS || path.join(__dirname, 'proloog_shots');
fs.mkdirSync(UIT, { recursive: true });
const HOST = 'localhost:4173';
const FILTER = (process.argv[2] || '').split(',').map(s => s.trim()).filter(Boolean);
const doe = naam => !FILTER.length || FILTER.includes(naam);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));

let ok = 0, fout = 0; const fouten = [];
const t = (goed, tekst) => { if (goed) ok++; else { fout++; fouten.push(tekst); } console.log('   ' + (goed ? 'ok   ' : 'FOUT ') + tekst); };
const kop = s => console.log('\n== ' + s + ' ==');

/* de drie formaten; per formaat een ander pad en een ander masker, zodat de drie
   helden en beide uitwegen allemaal minstens één keer echt landen */
const VPS = {
  laptop: { n: 'laptop', w: 1440, h: 900, pad: 'sprong', masker: 'woede', held: 'slachter', droom: 'brandweerman' },
  liggend: { n: 'liggend', w: 800, h: 360, m: true, pad: 'geduwd', masker: 'vlucht', held: 'thoverk', droom: 'zeeën bevaren' },
  staand: { n: 'staand', w: 412, h: 915, m: true, pad: 'sprong', masker: 'gif', held: 'gifmagier', droom: "piloot van d'Artagnan" }
};
const HELD_VAN = { woede: 'slachter', gif: 'gifmagier', vlucht: 'thoverk' };

/* ---------- de browsercontext: de worktree vanaf schijf, met meters ---------- */
async function open(browser, vp, o) {
  o = o || {};
  const prefix = o.prefix || '/';
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: o.dpr || 1,   /* fixer R2: echte telefoons (DPR 3) */
    isMobile: !!vp.m, hasTouch: !!vp.m, serviceWorkers: 'block',
    reducedMotion: o.rustig ? 'reduce' : 'no-preference'
  });
  /* fullscreen dat stil niets doet (zoals iOS / een geweigerde vraag): de nudge sluit dan niet vanzelf */
  if (o.geenFullscreen) await ctx.addInitScript(() => { Element.prototype.requestFullscreen = function () { return Promise.resolve(); }; });
  /* R2: zwakke hardware (2 kernen) — daar zet de game zelf lite aan (standaardLite in js/game.js) */
  if (o.zwak) await ctx.addInitScript(() => { try { Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { configurable: true, get: () => 2 }); } catch (e) {} });
  /* precies één AudioContext? tel elke constructie */
  await ctx.addInitScript(() => {
    window.__acN = 0;
    const O = window.AudioContext || window.webkitAudioContext;
    if (O) {
      const W = class extends O { constructor(...a) { super(...a); window.__acN++; } };
      window.AudioContext = W; window.webkitAudioContext = W;
    }
  });
  const page = await ctx.newPage();
  page.__f = []; page.__404 = []; page.__nav = 0; page.__load = 0;
  page.on('pageerror', e => page.__f.push(e.message));
  page.on('load', () => { page.__load++; });   /* echte documentladingen (framenavigated telt ook history.replaceState) */
  page.on('console', m => { if (m.type() === 'error' && !/rest\/v1|Failed to load resource|supabase/i.test(m.text())) page.__f.push('console: ' + m.text()); });
  page.on('framenavigated', f => { if (f === page.mainFrame()) page.__nav++; });
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url());
    if (/supabase\.co/i.test(u.host) || /\/rest\/v1\//.test(u.pathname)) return route.abort();
    if (u.host !== HOST) return route.abort();
    const p = decodeURIComponent(u.pathname);
    if (!p.startsWith(prefix)) { page.__404.push(p); return route.fulfill({ status: 404, body: 'buiten de site' }); }
    let rel = p.slice(prefix.length) || 'index.html';
    let f = path.join(WORKTREE, rel.split('/').join(path.sep));
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) { page.__404.push(p); return route.fulfill({ status: 404, body: 'weg' }); }
    return route.fulfill({ status: 200, contentType: MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  await page.goto('http://' + HOST + prefix, { waitUntil: 'load' });
  await page.evaluate(([opslag, nudge]) => {
    localStorage.clear();
    localStorage.setItem('slayit_wipe', '1'); localStorage.setItem('slayit_wereld', '0');
    if (nudge) localStorage.setItem('slayit_nudge_v2', 'weg');
    Object.entries(opslag || {}).forEach(([k, v]) => localStorage.setItem(k, v));
  }, [o.opslag || null, !!o.geenNudge]);
  await page.goto('http://' + HOST + prefix + (o.pad || ''), { waitUntil: 'load' });
  await slaap(800);
  page.__nav = 0;
  await volgSchermen(page);
  return { ctx, page };
}
/* body.dataset.scherm door de tijd heen (titel → proloog → kaart) */
async function volgSchermen(page) {
  await page.evaluate(() => {
    window.__schermLog = [document.body.dataset.scherm];
    new MutationObserver(() => {
      const s = document.body.dataset.scherm;
      if (window.__schermLog[window.__schermLog.length - 1] !== s) window.__schermLog.push(s);
    }).observe(document.body, { attributes: true, attributeFilter: ['data-scherm'] });
  });
}

/* ---------- CSS-lek: de tokens en fonts van de game, gemeten op het document ---------- */
const LEK = () => {
  const r = getComputedStyle(document.documentElement);
  const tok = ['--paars', '--nacht', '--goud', '--tekst', '--vuur', '--rand'].map(k => k + '=' + r.getPropertyValue(k).trim()).join(';');
  const tg = document.querySelector('.titel-groot'), kn = document.querySelector('#scherm-titel .knop-groot');
  return {
    tokens: tok,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyFont: getComputedStyle(document.body).fontFamily,
    titelFont: tg ? getComputedStyle(tg).fontFamily : null,
    titelMaat: tg ? getComputedStyle(tg).fontSize : null,
    knopFont: kn ? getComputedStyle(kn).fontFamily : null,
    sheets: document.styleSheets.length,
    htmlFs: getComputedStyle(document.documentElement).fontSize
  };
};

/* ---------- de sonde: scroll, CTA's in beeld en raak, verboden elementen ---------- */
const SONDE = () => {
  const host = document.getElementById('scherm-proloog');
  const R = host && host.shadowRoot;
  const vw = innerWidth, vh = innerHeight;
  const desc = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.classList && e.classList.length ? '.' + [...e.classList].slice(0, 2).join('.') : '');
  const app = R && R.getElementById('pl-app');
  const se = document.scrollingElement;
  const res = {
    scherm: document.body.dataset.scherm,
    scene: host && host.dataset.plScene, fase: app && app.dataset.fase,
    doc: { sh: se.scrollHeight, ch: se.clientHeight, sw: se.scrollWidth, cw: se.clientWidth, sy: scrollY, sx: scrollX },
    scroll: [], uitBeeld: [], geblokt: [], ctas: [], verboden: [], nudge: !!document.getElementById('scherm-nudge'), clip: []
  };
  /* de oude nav, de bolletjes, 'Verder', 'DAAL AF' en 'Rechtstreeks afdalen': nergens meer */
  const VERBODEN_SEL = '#proloog-nav, .proloog-nav, .nav-dots, .dot, .nav-knop, #knop-daalaf, #knop-skip, .knop-daalaf';
  const VERBODEN_TXT = /^\s*(◂\s*)?verder\b|daal af|rechtstreeks afdalen/i;
  if (document.querySelector(VERBODEN_SEL)) res.verboden.push('pagina: ' + desc(document.querySelector(VERBODEN_SEL)));
  if (R && R.querySelector(VERBODEN_SEL)) res.verboden.push('shadow: ' + desc(R.querySelector(VERBODEN_SEL)));
  const zichtbaarEl = (e, wortel) => {
    for (let x = e; x && x !== wortel; x = x.parentNode || x.host) {
      if (!(x instanceof Element)) break;
      const cs = getComputedStyle(x);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    }
    return true;
  };
  if (R) R.querySelectorAll('button, a').forEach(b => { if (VERBODEN_TXT.test(b.textContent || '') && zichtbaarEl(b, R)) res.verboden.push('shadow-knop "' + b.textContent.trim().slice(0, 30) + '"'); });
  if (res.scherm === 'proloog') document.querySelectorAll('button, a').forEach(b => {
    if (!b.getClientRects().length) return;
    if (VERBODEN_TXT.test(b.textContent || '') && zichtbaarEl(b, document)) res.verboden.push('pagina-knop "' + b.textContent.trim().slice(0, 30) + '"');
  });
  if (!R) return res;
  /* scroll: host, app en scène mogen NOOIT overlopen; een auto/scroll-vak ook niet;
     niets mag verschoven staan. overflow:hidden mag bewust clippen (de log, de bon). */
  const kan = v => v === 'auto' || v === 'scroll';
  const streng = [host, app, R.getElementById('scene')].filter(Boolean);
  streng.forEach(e => {
    if (e.scrollHeight > e.clientHeight + 1) res.scroll.push(desc(e) + ' h ' + e.scrollHeight + '>' + e.clientHeight);
    if (e.scrollWidth > e.clientWidth + 1) res.scroll.push(desc(e) + ' w ' + e.scrollWidth + '>' + e.clientWidth);
  });
  R.querySelectorAll('*').forEach(e => {
    const cs = getComputedStyle(e);
    if (cs.display === 'none') return;
    if (kan(cs.overflowY) && e.clientHeight > 0 && e.scrollHeight > e.clientHeight + 1) res.scroll.push(desc(e) + ' h ' + e.scrollHeight + '>' + e.clientHeight);
    if (kan(cs.overflowX) && e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1) res.scroll.push(desc(e) + ' w ' + e.scrollWidth + '>' + e.clientWidth);
    if (e.scrollTop > 0 || e.scrollLeft > 0) res.scroll.push(desc(e) + ' verschoven ' + e.scrollTop + '/' + e.scrollLeft);
    if (cs.overflowY === 'hidden' && e.clientHeight > 0 && e.scrollHeight > e.clientHeight + 1) res.clip.push(desc(e));
  });
  /* elke zichtbare CTA: volledig in beeld, en raak — in de shadow root (R.elementFromPoint)
     én in het document (niets van de game erover, bv. de nudge of een melding) */
  R.querySelectorAll('button, input').forEach(b => {
    if (b.type === 'file' || b.disabled) return;
    if (b.classList.contains('pl-skip') && !b.classList.contains('zichtbaar')) return;
    if (!zichtbaarEl(b, R)) return;
    if (b.closest('.valt-links, .valt-rechts, .uitverkoren, [inert]')) return;
    const r = b.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
    const naam = desc(b) + ' "' + (b.textContent || b.placeholder || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 24) + '"';
    res.ctas.push(naam);
    if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) { res.uitBeeld.push(naam + ' [' + [r.left, r.top, r.right, r.bottom].map(Math.round) + ']'); return; }
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = R.elementFromPoint(x, y);
    const top = document.elementFromPoint(x, y);
    if (!hit || !(hit === b || b.contains(hit))) res.geblokt.push(naam + ' <- ' + (hit ? desc(hit) : 'niets'));
    else if (top !== host) res.geblokt.push(naam + ' <- pagina ' + (top ? desc(top) : 'niets'));
  });
  return res;
};
async function sonde(page, label) {
  const m = await page.evaluate(SONDE);
  const p = [];
  if (m.doc.sh > m.doc.ch + 1 || m.doc.sw > m.doc.cw + 1 || m.doc.sy || m.doc.sx) p.push('document scrolt ' + JSON.stringify(m.doc));
  if (m.scroll.length) p.push('scroll: ' + m.scroll.join(' | '));
  if (m.uitBeeld.length) p.push('uit beeld: ' + m.uitBeeld.join(' | '));
  if (m.geblokt.length) p.push('geblokkeerd: ' + m.geblokt.join(' | '));
  if (m.verboden.length) p.push('verboden: ' + m.verboden.join(' | '));
  if (m.scherm === 'proloog' && m.nudge) p.push('de nudge ligt over de proloog');
  t(!p.length, label + ' [' + (m.scene || m.scherm) + (m.fase ? '/' + m.fase : '') + '] geen scroll, geen oude nav, ' + m.ctas.length + ' CTA in beeld en raak' + (p.length ? ' — ' + p.join(' ;; ') : ''));
  return m;
}

/* ---------- hulpjes in de shadow root ---------- */
const sr = (page, src, arg) => page.evaluate(([s, a]) => {
  const h = document.getElementById('scherm-proloog'); const R = h && h.shadowRoot;
  return (new Function('R', 'arg', s))(R, a);
}, [src, arg]);
const scene = page => page.evaluate(() => {
  const h = document.getElementById('scherm-proloog'); if (!h || !h.shadowRoot) return null;
  const a = h.shadowRoot.getElementById('pl-app');
  return (h.dataset.plScene || '') + (a && a.dataset.fase && h.dataset.plScene === 'breekpunt' ? '/' + a.dataset.fase : '');
});
async function wachtScene(page, doel, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 15000)) { const s = await scene(page); if (s && s.indexOf(doel) === 0) return true; await slaap(100); }
  return false;
}
async function wachtOp(page, fn, ms, arg) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return Date.now() - t0; await slaap(60); }
  return -1;
}
async function tik(page, vp, sel, o) {
  const l = page.locator(sel).first();
  if (vp.m) await l.tap(o || {}); else await l.click(o || {});
}
async function shot(page, naam) { await page.screenshot({ path: path.join(UIT, naam + '.png') }).catch(() => {}); }
const opslag = page => page.evaluate(() => {
  const o = {};
  ['slayit_proloog', 'slayit_proloog_over', 'slayit_proloog_klaar', 'slaylit_proloog_v3', 'slaylit_proloog_v2', 'slayit_save_v1', 'slayit_codex', 'slayit_daily']
    .forEach(k => { o[k] = localStorage.getItem(k); });
  return o;
});
const STAND = () => {
  const tb = document.getElementById('topbalk');
  const sl = document.getElementById('proloog-sluier');
  const chip = document.getElementById('tb-fakkel');
  const dl = document.querySelector('#tb-dranken .drank-leeg');
  let jd; try { jd = jeugddroomTekst(); } catch (e) { jd = 'FOUT ' + e.message; }
  const host = document.getElementById('scherm-proloog');
  return {
    scherm: document.body.dataset.scherm, log: (window.__schermLog || []).join(' > '),
    held: (typeof S !== 'undefined' && S) ? S.held : null, fakkel: (typeof S !== 'undefined' && S) ? S.fakkel : null,
    seed: (typeof S !== 'undefined' && S) ? S.seed : null,
    jeugddroom: jd, chip: chip ? chip.textContent.trim() : null,
    tb: getComputedStyle(tb).display, tbTf: getComputedStyle(tb).transform,
    sluier: sl ? sl.classList.contains('toon') : null, sluierKind: sl ? sl.children.length : null,
    bodyPl: [...document.body.classList].filter(c => /^pl-/.test(c)).join(','),
    kaartTf: document.getElementById('scherm-kaart').style.transform || '',
    bezig: typeof proloogBezig === 'function' ? proloogBezig() : 'geen',
    actief: !!(window.Proloog && Proloog.actief),
    appLeeg: !!(host && host.shadowRoot && host.shadowRoot.getElementById('pl-app') && !host.shadowRoot.getElementById('pl-app').children.length),
    acN: window.__acN, klank: window.Klank ? Klank.huidigeScene : null,
    drankLeeg: dl ? { tip: dl.dataset.tip, n: dl.querySelectorAll('i').length } : null,
    voorkeur: [...document.querySelectorAll('.held-kaart.voorkeur')].map(e => e.dataset.held).join(','),
    url: location.pathname + location.search
  };
};
const stand = page => page.evaluate(STAND);
const vt323 = page => page.evaluate(async () => { try { await document.fonts.ready; } catch (e) {} return document.fonts.check('16px VT323'); });

/* ---------- R2: spionnen op de klank, de val, het pixelfont en het canvas ----------
   Alles in window.__r2, met tijden op performance.now():
   klank  elke aanroep van Klank.jingle / stilte / wachtHervat / wacht.start / stop / transponeer
          (+ de stand van de wacht erna, en waar de proloog op dat moment stond)
   val    de gebeurtenissen van proloog/val.js (ProloogVal.start omwikkeld: opts.bij)
   tekst  elke keer dat het pixelfont "VERBROKEN" tekent (OutroFX.tekst; de val tekent ermee)
   dom    elke DOM-invoeging met "VERBINDING VERBROKEN" (document + de shadow root)
   held   elke tekenbeurt van de 0042-sprite (het 24x66-canvas) + de kooi die er vlak vóór
          op dezelfde context getekend werd (val.js: eerst de kooi, dan 0042)
   fase   scène/fase door de tijd (rAF), frames = beeldtijden zolang de fase 'val' is */
const R2_SPION = (o) => {
  if (window.__r2) return;
  o = o || {};
  const r2 = window.__r2 = { klank: [], val: [], tekst: [], dom: [], held: [], hek: [], pk: [], fase: [], frames: [], valStart: null, valLite: null, oproepT: null, handle: null };
  const nu = () => performance.now();
  const plek = () => {
    const h = document.getElementById('scherm-proloog'), R = h && h.shadowRoot, a = R && R.getElementById('pl-app');
    return { scene: (h && h.dataset.plScene) || null, fase: (a && a.dataset.fase) || null, oproep: !!(R && R.querySelector('.oproep')) };
  };
  const K = window.Klank;
  const spion = (obj, naam, label) => {
    const f = obj && obj[naam];
    if (typeof f !== 'function') return;
    obj[naam] = function (...a) {
      const r = f.apply(this, a);
      let st = null; try { st = JSON.parse(JSON.stringify(K.wacht.stand)); } catch (e) {}
      r2.klank.push(Object.assign({ t: nu(), k: label, a: JSON.stringify(a), r, stand: st }, plek()));
      return r;
    };
  };
  if (K) {
    spion(K, 'jingle', 'jingle'); spion(K, 'stilte', 'stilte'); spion(K, 'wachtHervat', 'hervat'); spion(K, 'stilteWeg', 'stilteWeg');
    if (K.wacht) { spion(K.wacht, 'start', 'start'); spion(K.wacht, 'stop', 'stop'); spion(K.wacht, 'transponeer', 'transponeer'); spion(K.wacht, 'pauzeer', 'pauzeer'); }
  }
  /* fixer R2: de klanklaag van de proloog (ProloogKlank: sfx, brom, pauzeer, stilteWeg), ook als proloog/audio.js pas later (lui) laadt */
  const wikkelPK = pk => {
    if (!pk || pk.__r2) return pk;
    const uit = Object.create(pk);
    ['sfx', 'brom', 'pauzeer', 'stilteWeg'].forEach(n => {
      if (typeof pk[n] !== 'function') return;
      uit[n] = function (...a) { const r = pk[n].apply(pk, a); r2.pk.push(Object.assign({ t: nu(), k: n, a: JSON.stringify(a), r }, plek())); return r; };
    });
    uit.__r2 = true;
    return uit;
  };
  let echtePK = wikkelPK(window.ProloogKlank);
  Object.defineProperty(window, 'ProloogKlank', { configurable: true, get() { return echtePK; }, set(v) { echtePK = wikkelPK(v); } });
  /* de val: ProloogVal.start omwikkelen, ook als val.js pas later (lui) laadt */
  const wikkel = v => {
    if (!v || v.__r2 || typeof v.start !== 'function') return v;
    const st = v.start;
    return Object.assign({}, v, { __r2: true, start(opts) {
      opts = opts || {};
      const bij = opts.bij;
      opts.bij = (naam, arg, laat) => { r2.val.push({ t: nu(), naam, arg, laat }); return typeof bij === 'function' ? bij(naam, arg, laat) : undefined; };
      const h = st.call(v, opts);
      r2.valStart = nu(); r2.valLite = h ? h.lite : null; r2.handle = h || null;
      return h;
    } });
  };
  let echte = wikkel(window.ProloogVal);
  Object.defineProperty(window, 'ProloogVal', { configurable: true, get() { return echte; }, set(v) { echte = wikkel(v); } });
  /* het pixelfont: wanneer tekent het canvas VERBINDING VERBROKEN? */
  const FX = window.OutroFX;
  if (FX && typeof FX.tekst === 'function') {
    const tk = FX.tekst;
    FX.tekst = function (cx, str, ...a) { if (/VERBROKEN/i.test(String(str))) r2.tekst.push({ t: nu(), fase: plek().fase }); return tk.call(this, cx, str, ...a); };
  }
  /* de 0042-sprite en de kooi (niet bij de fps-meting: die meet de val zonder ballast) */
  if (!o.zonderCanvas) {
    const di = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) {
      if (img && img.width === 24 && img.height === 66 && a.length === 2) {
        const v = this.__r2vorige;
        r2.held.push({ t: nu(), x: a[0], y: a[1], cw: this.canvas.width, ch: this.canvas.height, kooi: v || null });
      }
      /* fixer R2: het schaarhek (liggend 90x101, staand 84x105) — hoe breed het getekend wordt */
      if (img && ((img.width === 90 && img.height === 101) || (img.width === 84 && img.height === 105))) {
        r2.hek.push({ t: nu(), w: a.length >= 8 ? a[6] : img.width, vol: img.width });
      }
      this.__r2vorige = (img && a.length === 2) ? { x: a[0], y: a[1], w: img.width, h: img.height } : null;
      return di.call(this, img, ...a);
    };
  }
  /* VERBINDING VERBROKEN in de DOM (document en, zodra hij bestaat, de shadow root) */
  const telDom = muts => {
    for (const m of muts) {
      const lijst = m.type === 'characterData' ? [m.target] : [...m.addedNodes];
      for (const n of lijst) {
        if (/VERBINDING\s+VERBROKEN/i.test(n.textContent || '')) {
          const p = n.nodeType === 1 ? n : n.parentNode;
          r2.dom.push({ t: nu(), fase: plek().fase, waar: p ? (p.className || p.nodeName) : '?' });
        }
      }
    }
  };
  const moOpties = { childList: true, subtree: true, characterData: true };
  new MutationObserver(telDom).observe(document.body, moOpties);
  let wortel = null;
  const lus = () => {
    const h = document.getElementById('scherm-proloog'), R = h && h.shadowRoot;
    if (R && R !== wortel) { wortel = R; new MutationObserver(telDom).observe(R, moOpties); }
    const p = plek(), k = (p.scene || '') + '/' + (p.fase || ''), l = r2.fase[r2.fase.length - 1];
    const t = nu();
    if (!l || l.k !== k) r2.fase.push({ t, k, fase: p.fase });
    if (p.oproep && r2.oproepT == null) r2.oproepT = t;   /* het eerste beeld met de oproep */
    if (p.fase === 'val' && document.body.dataset.scherm === 'proloog') r2.frames.push(t);
    requestAnimationFrame(lus);
  };
  requestAnimationFrame(lus);
};
const r2Spion = (page, o) => page.evaluate(R2_SPION, o || {});
const r2Lees = page => page.evaluate(() => window.__r2 || null);
/* het begin en het einde van de val (fase 'val' → 'afgrond'), uit het rAF-faselog */
function valVenster(r2) {
  const i = r2.fase.findIndex(f => f.fase === 'val');
  if (i < 0) return null;
  const j = r2.fase.findIndex((f, n) => n > i && f.fase !== 'val');
  return { t0: r2.fase[i].t, t1: j > 0 ? r2.fase[j].t : null, naar: j > 0 ? r2.fase[j].fase : null };
}
/* episodes: tijden gegroepeerd (een gat > 400 ms = een nieuwe keer) */
function episodes(ts) {
  const e = [];
  for (const t of ts) { const l = e[e.length - 1]; if (l && t - l.t1 <= 400) l.t1 = t; else e.push({ t0: t, t1: t }); }
  return e;
}
/* de klank-criteria van R2 (hoofdroute en de onaangeraakte val) */
function toetsKlankVal(r2, label, o) {
  o = o || {};
  const vv = valVenster(r2);
  /* de fase zoals de proloog hem op het moment van de aanroep zelf zette (het rAF-log ziet hem pas een beeld later) */
  const inVal = r2.klank.filter(k => k.fase === 'val');
  const trans = inVal.filter(k => k.k === 'transponeer');
  const reeks = trans.map(k => JSON.parse(k.a)[0]);
  t(JSON.stringify(reeks) === JSON.stringify([0, -1, -2, -3, -4, -5, -6, -7]),
    `${label}: de wachtmuziek zakt een halve toon per etage: Klank.wacht.transponeer ${JSON.stringify(reeks)} (0, −1 … −7)`);
  /* elke stap valt op zijn etage: val.js meldt 'etage' k, en in hetzelfde ogenblik zakt de lijn naar −(k+1) */
  const et = r2.val.filter(v => v.naam === 'etage');
  const paren = et.map(e => { const k = trans.find(x => JSON.parse(x.a)[0] === -(e.arg + 1)); return k ? Math.round(k.t - e.t) : null; });
  t(et.length === 7 && et.every((e, i) => e.arg === i) && paren.every(d => d !== null && d >= 0 && d <= 30),
    `${label}: 7 etages (DAK, 4, 3, 2, −1, −2, −3), elke transponering op haar etage (vertraging ${JSON.stringify(paren)} ms)`);
  const zeven = trans.find(k => JSON.parse(k.a)[0] === -7);
  if (o.audio !== false) t(!!zeven && zeven.r === true && zeven.stand && zeven.stand.toon === -7 && zeven.stand.vast === true,
    `${label}: op −7 hangt de lijn vast op de vaste noot (stand ${zeven ? JSON.stringify(zeven.stand) : 'geen'})`);
  const stil = inVal.filter(k => k.k === 'stilte');
  const stilArg = stil.length ? JSON.parse(stil[0].a)[0] : null;
  const vloer = r2.val.find(v => v.naam === 'vloer');
  const [slo, shi] = o.spoel ? [120, 1500] : [1400, 1500];
  t(stil.length === 1 && stilArg >= slo && stilArg <= shi && !!vloer && stil[0].t >= vloer.t && (o.audio === false || (stil[0].stand && stil[0].stand.actief === false)),
    `${label}: na de vloer valt de lijn weg: ${stil.length}x Klank.stilte(${stilArg}) (${slo}-${shi} ms), ${vloer && stil[0] ? Math.round(stil[0].t - vloer.t) + ' ms na de vloer' : '?'}, wacht daarna actief ${stil[0] && stil[0].stand ? stil[0].stand.actief : '?'}`);
  /* wachtStop bij de overgang naar de Afgrond (zetFase('afgrond') roept hem, net vóór de fase wisselt) */
  const laatsteVal = r2.val[r2.val.length - 1];
  const stop = r2.klank.filter(k => k.k === 'stop' && laatsteVal && k.t >= laatsteVal.t);
  const dStop = stop[0] && vv && vv.t1 !== null ? Math.round(vv.t1 - stop[0].t) : null;
  t(stop.length >= 1 && !!vv && vv.naar === 'afgrond' && dStop !== null && dStop >= -5 && dStop <= 150,
    `${label}: wachtStop bij de overgang naar de Afgrond (${stop.length}x, ${dStop} ms vóór het eerste beeld van de Afgrond; de lijn liep nog: ${stop[0] ? stop[0].r : '-'})`);
}
/* VERBINDING VERBROKEN: precies één keer, in de val, in de DOM (de spiegel) én op het canvas */
function toetsVerbinding(r2, label, heel) {
  const vv = valVenster(r2);
  const dom = r2.dom, cv = episodes(r2.tekst.map(x => x.t));
  const inVal = x => vv && x >= vv.t0 && (vv.t1 === null || x <= vv.t1);
  t(dom.length === 1 && cv.length === 1 && inVal(dom[0].t) && inVal(cv[0].t0) && r2.tekst.every(x => x.fase === 'val'),
    `${label}: "VERBINDING VERBROKEN" verschijnt precies 1x${heel ? ' in de hele proloog' : ''}: DOM ${dom.length}x (${dom.map(d => d.waar).join(',') || '-'}), canvas ${cv.length} keer (${cv.map(e => Math.round(e.t1 - e.t0) + ' ms').join(',') || '-'})` + (vv && dom[0] ? `, ${((dom[0].t - vv.t0) / 1000).toFixed(2)} s na het begin van de val` : ''));
  /* fixer R2: het scharnier naar het je blijft minstens 1 s staan, ook voor wie doortikt (review: 450 ms) */
  const duur = cv.length ? Math.round(cv[0].t1 - cv[0].t0) : 0;
  t(duur >= 900, `${label}: VERBINDING VERBROKEN staat ${duur} ms op het canvas (≥ 900, ook bij doortikken)`);
}
/* fixer R2 · pixels van het liftcanvas (in de pagina): het silhouet van 0042 na de vloer, en waar de
   factuurvellen zijn. De geometrie komt uit de spion: de laatste tekenbeurt van 0042 (x, y) en de
   kooi die er vlak vóór getekend werd (bakKooi: x = K.x, w = K.w, h = K.y + K.h = de kooivloer). */
const PIXELS = () => {
  const R = document.getElementById('scherm-proloog').shadowRoot, c = R && R.querySelector('.val-scherm');
  const h = window.__r2.held[window.__r2.held.length - 1];
  if (!c || !h || !h.kooi) return null;
  const W = c.width, H = c.height, d = c.getContext('2d').getImageData(0, 0, W, H).data;
  const px = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
  const tel = (x0, y0, x1, y1, f) => { let n = 0; for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) if (f(px(x, y))) n++; return n; };
  const licht = p => Math.max(p[0], p[1], p[2]) >= 40;
  const papier = p => p[0] >= 100 && p[1] >= 85 && p[2] >= 60;
  const K = h.kooi, vloer = K.h, sx = h.x, sy = h.y;   /* K.y is hier 0: de kooi wordt vanaf de bovenrand getekend */
  const onder = W > H ? 161 : 266;   /* L.onder.y (val.js): daar begint het onderschrift */
  return {
    t: window.__r2.handle ? +window.__r2.handle.t.toFixed(2) : null,
    kruin: tel(sx - 1, sy - 1, sx + 25, sy + 12, licht), schoen: tel(sx - 1, sy + 56, sx + 25, sy + 67, licht),
    naast: tel(K.x + K.w + 8, sy + 56, K.x + K.w + 32, sy + 67, licht),
    velBoven: tel(K.x, sy, K.x + K.w, vloer, papier), velOnder: tel(K.x, vloer, K.x + K.w, onder, papier)
  };
};
/* geen vrij vallende figuur: elke tekenbeurt van 0042 staat binnen de kooi, op dezelfde plek,
   met de voeten op de vloer van de kooi, ook als de vloer uiteenvalt */
function toetsSprite(r2, label) {
  const vv = valVenster(r2);
  const beurten = r2.held.filter(h => vv && h.t >= vv.t0 && (vv.t1 === null || h.t <= vv.t1));
  const perLayout = {};
  for (const h of beurten) (perLayout[h.cw + 'x' + h.ch] = perLayout[h.cw + 'x' + h.ch] || []).push(h);
  const fout = [], samen = [];
  for (const [lay, lijst] of Object.entries(perLayout)) {
    const plekken = [...new Set(lijst.map(h => h.x + ',' + h.y))];
    const buiten = lijst.filter(h => !h.kooi || h.x < h.kooi.x || h.x + 24 > h.kooi.x + h.kooi.w || h.y < h.kooi.y || h.y + 66 > h.kooi.y + h.kooi.h);
    const k = lijst[0].kooi, voet = k ? (k.y + k.h) - (lijst[0].y + 66) : null;
    if (plekken.length !== 1) fout.push(lay + ': ' + plekken.length + ' plekken');
    if (buiten.length) fout.push(lay + ': ' + buiten.length + ' beelden buiten de kooi');
    if (voet === null || voet < 0 || voet > 8) fout.push(lay + ': voeten ' + voet + ' px boven de kooivloer');
    samen.push(`${lay} ${lijst.length} beelden op (${plekken.join(' | ')}) in de kooi [${k ? [k.x, k.y, k.w, k.h].join(',') : '?'}], voeten ${voet} px boven de kooivloer`);
  }
  const vloer = r2.val.find(v => v.naam === 'vloer');
  const naVloer = vloer ? beurten.filter(h => h.t > vloer.t).length : 0;
  t(beurten.length > 0 && !fout.length && naVloer >= 5,
    `${label}: geen vrij vallende figuur — 0042 staat elk beeld op dezelfde plek in de kooi, ook ${naVloer} beelden na de vloer: ${samen.join(' ;; ')}` + (fout.length ? ' — ' + fout.join(' ;; ') : ''));
}

/* ---------- de proloog spelen (de echte, geen stub) ---------- */
async function klikNieuw(page, vp) {
  const k = page.locator('#scherm-titel .knop-groot', { hasText: 'Nieuw avontuur' });
  if (vp.m) await k.tap(); else await k.click();
}
async function naarProloog(page, vp, label) {
  await klikNieuw(page, vp);
  await slaap(250);
  const dooft = await page.evaluate(() => document.body.classList.contains('pl-dooft') && document.body.dataset.scherm === 'titel');
  /* F1: het doek van de heenweg is puur #07060a, hetzelfde zwart als de sluier van de landing */
  await wachtOp(page, () => { const d = document.getElementById('toneel-doek'); return !!d && d.classList.contains('aan'); }, 1500);
  const doekKleur = await page.evaluate(() => { const d = document.getElementById('toneel-doek'); return d && d.classList.contains('aan') ? getComputedStyle(d).backgroundColor : 'niet gezien'; });
  const w = await wachtOp(page, () => document.body.dataset.scherm === 'proloog' && !!(window.Proloog && Proloog.actief), 6000);
  t(dooft && w >= 0, `${label}: 'Nieuw avontuur' → het titelvuur dooft (${dooft}) → scherm 'proloog' na ${w < 0 ? 'NOOIT' : (w + 250) + ' ms'}`);
  t(doekKleur === 'rgb(7, 6, 10)', `${label}: het doek van de heenweg is puur #07060a (${doekKleur})`);
  return w >= 0;
}
/* het kantoor: elke handeling (glimlach, foto, invoer, oproep) + doorspoelen tot het gesprek */
async function speelKantoor(page, vp, droom, label) {
  const gezien = {};
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const st = await sr(page, `
      const q = s => R.querySelector(s);
      const a = q('.term-acties button[data-actie]');
      return { scene: R.host.dataset.plScene, actie: a ? a.dataset.actie : null, invoer: !!q('.term-invoer input'),
        fk: !!q('.foto-kijk'), fkCta: !!q('.fk-cta'), op: !!q('.oproep'), opCta: !!q('.op-cta'),
        spreker: !!q('.spreker-kaart'), glitch: !!q('.glitch-frame'), collega: R.querySelectorAll('.tl-collega').length };`);
    if (st.scene !== 'kantoor') break;
    const eerste = k => { if (gezien[k]) return false; gezien[k] = 1; return true; };
    if (eerste('start')) { await slaap(700); await sonde(page, `${label} kantoor`); await shot(page, `${vp.n}-03-kantoor`); }
    if (st.collega && eerste('collega')) await sonde(page, `${label} kantoor, een collega spreekt in de log`);
    if (st.spreker && eerste('spreker')) await sonde(page, `${label} kantoor, Barts kaart`);
    if (st.actie) {
      await slaap(200);
      if (eerste('actie-' + st.actie)) { await sonde(page, `${label} kantoor, handeling "${st.actie}"`); await shot(page, `${vp.n}-04-kantoor-${st.actie}`); }
      await tik(page, vp, '.term-acties button[data-actie]');
      await slaap(250); continue;
    }
    if (st.fkCta) { if (eerste('fk')) await sonde(page, `${label} kantoor, de foto`); await tik(page, vp, '.fk-cta'); await slaap(300); continue; }
    if (st.invoer) {
      await sonde(page, `${label} kantoor, de jeugddroom-invoer`);
      await shot(page, `${vp.n}-05-kantoor-invoer`);
      await page.locator('.term-invoer input').fill(droom);
      await page.keyboard.press('Enter'); await slaap(300); continue;
    }
    if (st.opCta) { await sonde(page, `${label} kantoor, de oproep`); await shot(page, `${vp.n}-06-oproep`); await tik(page, vp, '.op-cta'); await slaap(500); continue; }
    /* doorspoelen: laptop met een toets, touch met een tik op de log of de overlay */
    n++;
    if (!vp.m) await page.keyboard.press(n % 2 ? 'Space' : 'ArrowRight');
    else {
      const doel = st.op ? '.oproep' : st.fk ? '.foto-kijk' : '.term-log';
      await page.locator(doel).first().tap({ position: { x: 16, y: 16 }, force: true }).catch(() => {});
    }
    await slaap(150);
  }
  t(!!(gezien.collega && gezien.spreker && gezien['actie-glimlach'] && gezien['actie-foto']), `${label}: kantoor doorlopen (glimlach, foto, collega-regels in de log, Barts kaart: ${Object.keys(gezien).join(',')})`);
}
async function speelGesprek(page, vp, pad, label) {
  await slaap(700);
  await sonde(page, `${label} gesprek`);
  await shot(page, `${vp.n}-07-gesprek`);
  const kaart = async (id, toets) => {
    if (!vp.m && toets) await page.keyboard.press(toets);
    else await tik(page, vp, `.kkaart[data-kaart="${id}"]`);
    await slaap(450);
  };
  if (pad === 'sprong') {
    await kaart('glimlach', '1'); await kaart('koffie', '3');
    if (!vp.m) await page.keyboard.press('e'); else await tik(page, vp, '.knop-eindig');
    await slaap(600);
    await kaart('foto');
    t(await sr(page, `return !!R.querySelector('.kkaart.kk-klaar') && !R.querySelector('.foto-kijk');`), `${label}: eerste tik op de foto tilt hem op (geen modal)`);
    await sonde(page, `${label} gesprek, foto opgetild`);
    await kaart('foto');
    await slaap(700);
    if (vp.m) await page.locator('.foto-kijk').tap({ position: { x: 10, y: 10 }, force: true }); else await page.keyboard.press('Space');
    await slaap(400);
    await sonde(page, `${label} gesprek, de foto (vasthouden)`);
    await tik(page, vp, '.fk-cta');
  } else {
    await kaart('glimlach', '1'); await kaart('mailtje', '2');
    for (let b = 0; b < 3; b++) {
      if (b === 1) await sonde(page, `${label} gesprek, beurt 2`);
      await tik(page, vp, '.knop-eindig'); await slaap(550);
    }
  }
  await slaap(400);
  await sonde(page, `${label} de uitkomst (regie, geen knop)`);
  const c = JSON.parse((await opslag(page)).slayit_proloog || 'null');
  t(!!c && c.v === 2 && c.uitweg === pad, `${label}: contract na het gesprek: v ${c && c.v}, uitweg "${c && c.uitweg}"`);
  t(await wachtScene(page, 'breekpunt/factuur', 6000), `${label}: de uitkomst loopt zelf door naar de Eindafrekening`);
}
async function speelBreekpunt(page, vp, pad, label) {
  await slaap(600);
  if (vp.m) await page.locator('.bon-venster').tap({ force: true }); else await page.keyboard.press('Enter');
  await slaap(400);
  await sonde(page, `${label} de factuur`);
  await shot(page, `${vp.n}-08-factuur`);
  await tik(page, vp, '.fase-factuur .knop-groot');
  await slaap(700);
  await sonde(page, `${label} het ontslag`);
  if (pad === 'sprong') await tik(page, vp, '.brief-cta');
  else await tik(page, vp, '.knop-pen');
  t(await wachtScene(page, 'breekpunt/val', 5000), `${label}: naar de val`);
  await slaap(1200);
  await sonde(page, `${label} de val`);
  for (let i = 0; i < 24; i++) {
    if (await sr(page, `return !!R.querySelector('.val-knop');`)) break;
    if (vp.m) await page.locator('.fase-val').tap({ position: { x: 12, y: 12 }, force: true }).catch(() => {}); else await page.keyboard.press('Space');
    await slaap(220);
  }
  await slaap(250);
  if (pad === 'sprong') { await sonde(page, `${label} de liftknop −∞`); await tik(page, vp, '.val-knop'); }
  t(await wachtScene(page, 'breekpunt/afgrond', 5000), `${label}: naar de Afgrond (${pad === 'sprong' ? 'zelf ingedrukt' : 'B.A.A.S. drukt'})`);
}
/* de Afgrond: pellen (hover/tik) en kiezen; meet de overname door de sluier */
async function kiesMasker(page, vp, masker, label, o) {
  o = o || {};
  await slaap(900);
  await sonde(page, `${label} de Afgrond`);
  await shot(page, `${vp.n}-09-afgrond`);
  const knop = page.locator(`.afg-masker[data-masker="${masker}"]`);
  if (vp.m) await knop.tap(); else { await page.mouse.move(2, 2); await knop.hover(); }
  await slaap(550);
  const verwacht = await page.evaluate(id => ({ naam: SPELERS[id].naam, hp: SPELERS[id].hp, kleur: 'rgb(' + SPELERS[id].kleur.replace(/\s+/g, '') .split(',').join(', ') + ')' }), HELD_VAN[masker]);
  const info = await sr(page, `
    const b = R.querySelector('.afg-masker[data-masker="' + arg + '"]'); const ring = b.querySelector('.afg-ring');
    return { gepeld: b.classList.contains('gepeld'), naam: (R.querySelector('.afg-naam') || {}).textContent, hp: (R.querySelector('.afg-hp') || {}).textContent,
      kaarten: (R.querySelector('.afg-kaarten') || {}).textContent, zin: (R.querySelector('.afg-zin') || {}).textContent, ring: getComputedStyle(ring).borderTopColor };`, masker);
  t(info.gepeld && info.naam === verwacht.naam && String(info.hp).indexOf(String(verwacht.hp)) !== -1 && /Startkaarten/.test(info.kaarten || ''),
    `${label}: de eerste ${vp.m ? 'tik' : 'hover'} pelt "${masker}" af tot ${info.naam} (${info.hp}) met startkaarten uit SPELERS`);
  t(info.ring === verwacht.kleur, `${label}: ring in SPELERS[${HELD_VAN[masker]}].kleur (${info.ring})`);
  if (o.zin) t(o.zin.test(info.zin || ''), `${label}: maskerzin "${(info.zin || '').trim()}"`);
  await sonde(page, `${label} de Afgrond, afgepeld`);
  await shot(page, `${vp.n}-10-afgrond-gepeld`);
  /* meet: het moment van de keuze (+ waar het kooltje staat) en het moment dat de sluier dichtgaat */
  await page.evaluate(() => {
    const R = document.getElementById('scherm-proloog').shadowRoot;
    window.__keuze = null; window.__overname = null; window.__tok = [];
    const sl = document.getElementById('proloog-sluier');
    R.addEventListener('click', e => {
      if (window.__keuze || !(e.target.closest && e.target.closest('.afg-masker, .afg-kies'))) return;
      const k = R.querySelector('.afg-kool-kern'); const r = k && k.getBoundingClientRect();
      window.__keuze = { t: performance.now(), x: r ? r.left + r.width / 2 : null, y: r ? r.top + r.height / 2 : null };
      /* F1: een rAF-sampler op het gekozen token, tot het frame waarin de sluier dichtgaat */
      const loop = () => {
        const toon = sl.classList.contains('toon');
        const sch = R.querySelector('.afg-masker.uitverkoren .afg-schijf');
        if (sch) { const b = sch.getBoundingClientRect(); window.__tok.push({ t: Math.round(performance.now() - window.__keuze.t), b: Math.round(b.width), o: +(+getComputedStyle(sch).opacity).toFixed(2), sluier: toon }); }
        if (!toon && performance.now() - window.__keuze.t < 3000) requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }, true);
    const mo = new MutationObserver(() => {
      if (window.__overname || !sl.classList.contains('toon')) return;
      const k = sl.querySelector('.pl-kooltje'); const r = k && k.getBoundingClientRect();
      window.__overname = { t: performance.now(), x: r ? r.left + r.width / 2 : null, y: r ? r.top + r.height / 2 : null, scherm: document.body.dataset.scherm };
      mo.disconnect();
    });
    mo.observe(sl, { attributes: true, attributeFilter: ['class'] });
  });
  if (o.viaKnop) await tik(page, vp, '.afg-kies'); else if (vp.m) await knop.tap(); else await knop.click();
  const w = await wachtOp(page, () => !!window.__overname, 4000);
  const m = await page.evaluate(() => ({ k: window.__keuze, o: window.__overname }));
  const dt = m.k && m.o ? Math.round(m.o.t - m.k.t) : null;
  const d = m.k && m.o ? Math.hypot(m.o.x - m.k.x, m.o.y - m.k.y) : null;
  const [lo, hi] = o.rustig ? [850, 1150] : [1450, 1750];
  t(w >= 0 && dt >= lo && dt <= hi, `${label}: de sluier neemt over ${dt} ms na de keuze (plan-T ${o.rustig ? '0,9' : '1,5'} s)`);
  t(d !== null && d <= 2, `${label}: het kooltje van de sluier staat op het kooltje van de Afgrond (afstand ${d === null ? '?' : d.toFixed(1)} px)`);
  /* F1 (review, vondst 1): in het laatste frame vóór de sluier is het token weg in het kooltje
     (≤ 12 px of opacity ≤ .15) — ook op laptop, waar het vroeger nog 61-69 px op .6 stond */
  const tok = await page.evaluate(() => window.__tok);
  const laatste = (tok || []).filter(s => !s.sluier).pop();
  t(!!laatste && (laatste.b <= 12 || laatste.o <= 0.15), `${label}: het naadframe is naadloos: laatste frame vóór de sluier (t ${laatste ? laatste.t : '?'} ms) token ${laatste ? laatste.b + ' px op opacity ' + laatste.o : 'niet gemeten'} (≤ 12 px of ≤ .15)`);
}
/* F1: meters voor de landing zelf — de onthulling (het radiale masker van .pl-doek) en de fakkelvonk */
async function meetLanding(page) {
  await page.evaluate(() => {
    const sl = document.getElementById('proloog-sluier');
    window.__onthul = []; window.__vonk = { max: 0, staart: 0 };
    const t0 = performance.now();
    const loop = () => {
      const d = sl.querySelector('.pl-doek');
      const m = d && (d.style.maskImage || d.style.webkitMaskImage);
      if (m && d.style.display !== 'none') window.__onthul.push({ t: Math.round(performance.now() - t0), m });
      sl.querySelectorAll('.pl-fakkelvonk').forEach(v => {
        if (v.classList.contains('pl-staart')) window.__vonk.staart = Math.max(window.__vonk.staart, sl.querySelectorAll('.pl-staart').length);
        else window.__vonk.max = Math.max(window.__vonk.max, v.offsetWidth);
      });
      if (performance.now() - t0 < 9000 && sl.classList.contains('toon')) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}
async function toetsLanding(page, vp, label) {
  const r = await page.evaluate(() => ({ o: window.__onthul || [], v: window.__vonk || {} }));
  /* de buitenrand = de laatste stop (de browser normaliseert #000 tot rgb(0, 0, 0)) */
  const buiten = s => { const m = /([\d.]+)px\)\s*$/.exec(s.m); return m ? +m[1] : null; };
  const eerste = r.o[0], max = Math.max(0, ...r.o.map(buiten).filter(x => x !== null));
  const op250 = eerste ? r.o.find(s => s.t - eerste.t >= 250) : null;
  const frac = op250 && max ? buiten(op250) / max : null;
  t(!!eerste && max > 0 && buiten(eerste) <= 0.1 * max && frac !== null && frac >= 0.3,
    `${label}: de onthulling begint op het kooltje (eerste buitenrand ${eerste ? buiten(eerste) : '?'} van ${Math.round(max)} px) en gaat meteen open: na 250 ms ${frac === null ? '?' : Math.round(frac * 100)} % van de straal (ease-out, ≥ 30 %)`);
  const minVonk = vp.m ? 7 : 10;
  t(r.v.max >= minVonk && r.v.staart === 2, `${label}: de fakkelvonk is ${r.v.max} px (≥ ${minVonk}) met een staart van ${r.v.staart} kopieën`);
}
/* F1: wordt de Afgrond-art vóór haar eerste frame al geladen? (vroeger ±150 ms lege schijven) */
async function meetAfgrondArt(page) {
  await page.evaluate(() => {
    const R = document.getElementById('scherm-proloog').shadowRoot;
    window.__afgArt = null;
    const mo = new MutationObserver(() => {
      if (window.__afgArt) return;
      const imgs = [...R.querySelectorAll('.afg-masker img, .afg-art img')];
      if (imgs.length < 7) return;
      window.__afgArt = { n: imgs.length, klaar: imgs.filter(i => i.complete && i.naturalWidth > 0).length };
      mo.disconnect();
    });
    mo.observe(R, { childList: true, subtree: true });
  });
}
/* wacht tot de landing voorbij is: speelbaar */
async function wachtLanding(page, ms) {
  return wachtOp(page, () => typeof proloogBezig === 'function' && !proloogBezig() && !document.getElementById('proloog-sluier').classList.contains('toon'), ms || 12000);
}
/* de vasthoud-skip: Esc 0,95 s op laptop, de ring 0,95 s vasthouden op touch */
async function houdSkip(page, vp, ms) {
  if (vp.m) {
    const b = await page.locator('.pl-skip').boundingBox();
    if (!b) return false;
    /* touch: een echte aanraking via CDP (pointerdown + vasthouden + loslaten) */
    const cdp = await page.context().newCDPSession(page);
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await slaap(ms);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.keyboard.down('Escape'); await slaap(ms); await page.keyboard.up('Escape');
  }
  return true;
}
/* plaatdiff: gemiddeld verschil per kanaal (0-255) over het vlak van #scherm-kaart */
function diffPng(a, b) {
  if (!PNG) return null;
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return 255;
  let som = 0;
  for (let i = 0; i < A.data.length; i += 4) som += Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]);
  return som / (A.width * A.height * 3);
}
async function kaartPlaat(page, vp) {
  await page.evaluate(() => { const n = document.getElementById('scherm-nudge'); if (n) n.remove(); document.querySelectorAll('#meldingen > *').forEach(m => m.remove()); });
  if (vp.m) await page.mouse.move(vp.w - 2, vp.h - 2); else await page.mouse.move(vp.w - 3, Math.round(vp.h * 0.55));
  await slaap(300);
  const r = await page.evaluate(() => { const b = document.getElementById('scherm-kaart').getBoundingClientRect(); return { x: Math.max(0, b.left), y: Math.max(0, b.top), w: Math.min(innerWidth, b.right) - Math.max(0, b.left), h: Math.min(innerHeight, b.bottom) - Math.max(0, b.top) }; });
  return page.screenshot({ animations: 'disabled', clip: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.w), height: Math.round(r.h) } });
}

/* ============================================================================ */
(async () => {
  const browser = await chromium.launch();
  const t00 = Date.now();

  /* ==========================================================================
     1 · DE HOOFDROUTE: 'Nieuw avontuur' → de hele proloog → de Afgrond → de kaart
     ========================================================================== */
  if (doe('hoofd')) for (const vp of [VPS.laptop, VPS.liggend, VPS.staand]) {
    kop(`1 · hoofdroute ${vp.n} ${vp.w}x${vp.h} · pad ${vp.pad} · masker ${vp.masker}`);
    const L = vp.n;
    const { ctx, page } = await open(browser, vp);
    await r2Spion(page);   /* R2: de klank, de val, het pixelfont en de 0042-sprite, de hele proloog lang */
    const lekVoor = await page.evaluate(LEK);
    if (!(await naarProloog(page, vp, L))) { await ctx.close(); continue; }
    const inP = await page.evaluate(() => {
      const h = document.getElementById('scherm-proloog'); const r = h.getBoundingClientRect();
      return { shadow: !!h.shadowRoot, rect: [r.left, r.top, r.width, r.height].map(Math.round), tb: getComputedStyle(document.getElementById('topbalk')).display,
        modus: h.getAttribute('data-modus'), body: document.body.dataset.modus };
    });
    t(inP.shadow && inP.rect.join() === [0, 0, vp.w, vp.h].join(), `${L}: de proloog draait in een shadow root op #scherm-proloog, schermvullend [${inP.rect}]`);
    t(inP.tb === 'none' && inP.modus === inP.body, `${L}: topbalk verborgen (${inP.tb}), data-modus gespiegeld op de host (${inP.modus} = body ${inP.body})`);
    await slaap(900);
    t(await vt323(page), `${L}: VT323 staat in het document (fonts.css) en is geladen`);
    const crt = await sr(page, `const p = R.querySelector('.ovm-prompt'); return p ? getComputedStyle(p).fontFamily : null;`);
    t(/VT323/.test(crt || ''), `${L}: de CRT-prompt in de shadow root gebruikt VT323 (${crt})`);
    const lekTijdens = await page.evaluate(LEK);
    t(JSON.stringify(lekTijdens) === JSON.stringify(lekVoor), `${L}: geen CSS-lek terwijl de proloog draait (tokens, body, titelfont, #sheets gelijk)` + (JSON.stringify(lekTijdens) === JSON.stringify(lekVoor) ? '' : ' — voor ' + JSON.stringify(lekVoor) + ' tijdens ' + JSON.stringify(lekTijdens)));
    const klank = await page.evaluate(() => ({ scene: window.Klank ? Klank.huidigeScene : null, gekoppeld: !!(window.SLAYLIT_AUDIO && SLAYLIT_AUDIO.gekoppeld), acN: window.__acN }));
    t(klank.scene === 'stil' && klank.gekoppeld && klank.acN === 1, `${L}: klank: de game-muziek staat op "${klank.scene}", de proloog hangt aan Klank.koppel() (${klank.gekoppeld}), ${klank.acN} AudioContext`);
    await sonde(page, `${L} overzicht`);
    await shot(page, `${vp.n}-01-overzicht`);
    /* F1 (review, vondst 2): de klankknop naast de skip — de game-mute, gesynchroniseerd met ⚙️ */
    const klankKnop = () => page.evaluate(() => {
      const R = document.getElementById('scherm-proloog').shadowRoot; const k = R && R.querySelector('.pl-klank');
      return { er: !!k, aan: Klank.vol.aan, cb: document.getElementById('inst-geluid').checked, pressed: k && k.getAttribute('aria-pressed'), icoon: k && k.textContent.trim(), scene: R.host.dataset.plScene };
    });
    const k0 = await klankKnop();
    await tik(page, vp, '.pl-klank'); await slaap(150);
    const k1 = await klankKnop();
    if (vp.m) await tik(page, vp, '.pl-klank'); else await page.keyboard.press('m');
    await slaap(150);
    const k2 = await klankKnop();
    t(k0.er && k0.aan && !k1.aan && !k1.cb && k1.pressed === 'true' && k1.icoon === '🔇' && k2.aan && k2.cb && k2.icoon === '🔊' && k2.scene === 'overzicht',
      `${L}: de klankknop dempt (${k0.aan} → ${k1.aan}, ⚙️ ${k1.cb}, ${k1.icoon}) en ${vp.m ? 'een tweede tik' : 'M'} zet het weer aan (${k2.aan}, ${k2.icoon}); de scène spoelt niet door (${k2.scene})`);
    await tik(page, vp, '.ov-monitor');
    t(await wachtScene(page, 'boot', 5000), `${L}: de monitor → de boot`);
    await slaap(1100);
    await sonde(page, `${L} boot`);
    const boot = await sr(page, `return R.querySelector('.boot').textContent;`);
    t(!/SLAY/.test(boot), `${L}: de boot toont SLAY LIT niet ("${boot.replace(/\s+/g, ' ').slice(0, 40)}…")`);
    await shot(page, `${vp.n}-02-boot`);
    await tik(page, vp, '.boot-cta .knop-groot');
    t(await wachtScene(page, 'kantoor', 5000), `${L}: Klok in → het kantoor`);
    await speelKantoor(page, vp, vp.droom, L);
    t(await wachtScene(page, 'gesprek', 5000), `${L}: de oproep → het gesprek`);
    await speelGesprek(page, vp, vp.pad, L);
    await meetAfgrondArt(page);
    await speelBreekpunt(page, vp, vp.pad, L);
    const afgArt = await page.evaluate(() => window.__afgArt);
    t(!!afgArt && afgArt.klaar === afgArt.n, `${L}: de Afgrond-art is al geladen in haar eerste frame (${afgArt ? afgArt.klaar + '/' + afgArt.n : 'niet gemeten'} beelden klaar, voorgeladen tijdens de val)`);
    const zin = vp.masker === 'vlucht' ? new RegExp('Ik wou ' + vp.droom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' worden') : null;
    await kiesMasker(page, vp, vp.masker, L, { zin, viaKnop: vp.n === 'liggend' });
    await meetLanding(page);
    /* de landing */
    await slaap(1400);
    await shot(page, `${vp.n}-11-landing-titel`);
    const tijdens = await stand(page);
    t(tijdens.scherm === 'kaart' && tijdens.sluier && tijdens.held === vp.held && !tijdens.actief,
      `${L}: achter de sluier al op de kaart (scherm "${tijdens.scherm}", S.held "${tijdens.held}", Proloog.actief ${tijdens.actief})`);
    const w = await wachtLanding(page, 12000);
    t(w >= 0, `${L}: de landing is klaar (nog ${w} ms na T 2,9)`);
    await toetsLanding(page, vp, L);
    await slaap(400);
    await shot(page, `${vp.n}-12-kaart`);
    const s = await stand(page);
    const ls = await opslag(page);
    const c = JSON.parse(ls.slayit_proloog || 'null') || {};
    t(s.log === 'titel > proloog > kaart', `${L}: body.dataset.scherm: ${s.log}`);
    t(page.__nav === 0, `${L}: 0x framenavigated tijdens de hele doorloop (gemeten ${page.__nav}), url "${s.url}"`);
    t(s.held === vp.held, `${L}: S.held = "${s.held}" = de held van masker "${vp.masker}"`);
    t(s.jeugddroom === vp.droom, `${L}: jeugddroomTekst() = "${s.jeugddroom}" (getypt: "${vp.droom}")`);
    t(c.v === 2 && c.held === vp.held && c.masker === vp.masker && c.uitweg === vp.pad && c.jeugddroom === vp.droom && c.glimlachen >= 1 && c.fotoKantoor === true && c.wachtToon === -7 && c.echo === 0,
      `${L}: contract compleet ${JSON.stringify(c)}`);
    t(ls.slayit_proloog_klaar === '1' && !ls.slayit_proloog_over, `${L}: slayit_proloog_klaar = ${ls.slayit_proloog_klaar}, geen _over-vlag (${ls.slayit_proloog_over})`);
    t(s.acN === 1 && s.klank === 'kaart', `${L}: precies 1 AudioContext (${s.acN}), de muziek glijdt door naar "${s.klank}"`);
    t(s.fakkel === 80 && /80/.test(s.chip || ''), `${L}: fakkel na de landing ${s.fakkel}, chip "${s.chip}"`);
    t(s.tb === 'flex' && s.tbTf === 'none' && !s.sluier && s.bodyPl === '' && s.kaartTf === '' && s.bezig === false,
      `${L}: speelbaar: topbalk ${s.tb}/${s.tbTf}, sluier ${s.sluier}, pl-klassen "${s.bodyPl}", kaart-transform "${s.kaartTf}", proloogBezig ${s.bezig}`);
    t(!s.actief && s.appLeeg, `${L}: Proloog gestopt (actief ${s.actief}) en de shadow root leeg (${s.appLeeg})`);
    t(!!s.drankLeeg && s.drankLeeg.n === 3 && /lege flesplaats/.test(s.drankLeeg.tip || ''), `${L}: lege drankslots = ${s.drankLeeg ? s.drankLeeg.n + ' flesjesomtrekken, data-tip "' + s.drankLeeg.tip + '"' : 'GEEN'}`);
    const lekNa = await page.evaluate(LEK);
    t(JSON.stringify(lekNa) === JSON.stringify(lekVoor), `${L}: CSS-tokens, titelfont en #sheets vóór = na` + (JSON.stringify(lekNa) === JSON.stringify(lekVoor) ? '' : ' — voor ' + JSON.stringify(lekVoor) + ' na ' + JSON.stringify(lekNa)));
    await sonde(page, `${L} de kaart na de landing`);
    t(page.__f.length === 0, `${L}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
    const miss = page.__404.filter(p => !/rest\/v1|supabase|favicon/.test(p));
    t(miss.length === 0, `${L}: geen 404's` + (miss.length ? ' — ' + miss.slice(0, 5).join(', ') : ''));
    /* R2 · de klank op de juiste momenten, VERBINDING VERBROKEN één keer, 0042 in de kooi */
    {
      const r2 = await r2Lees(page);
      const jingle = r2.klank.filter(k => k.k === 'jingle');
      t(jingle.length === 1 && jingle[0].a === '[{"vals":true}]' && jingle[0].scene === 'boot' && jingle[0].r > 4,
        `${L}: de bedrijfsjingle klinkt één keer, in de boot, één maat te lang en net vals: ${jingle.length}x ${jingle[0] ? jingle[0].a + ' in "' + jingle[0].scene + '" → ' + jingle[0].r + ' s' : ''}`);
      const start = r2.klank.filter(k => k.k === 'start');
      const dOproep = start[0] && r2.oproepT != null ? Math.round(r2.oproepT - start[0].t) : null;
      t(start.length === 1 && start[0].scene === 'kantoor' && dOproep !== null && dOproep >= 0 && dOproep <= 200 && start[0].r === true,
        `${L}: de wachtmuziek begint bij de oproep en loopt door tot de val (${start.length}x Klank.wacht.start${start[0] ? ', in "' + start[0].scene + '", ' + dOproep + ' ms vóór het eerste beeld met de oproep' : ''})`);
      const voorOproep = r2.klank.filter(k => (k.k === 'transponeer' || k.k === 'stilte') && start[0] && k.t < start[0].t);
      t(voorOproep.length === 0, `${L}: vóór de oproep geen wachtmuziek-aanroepen (${voorOproep.length})`);
      toetsKlankVal(r2, L, { spoel: true });
      toetsVerbinding(r2, L, true);
      toetsSprite(r2, L);
      const naLanding = await page.evaluate(() => ({ stand: Klank.wacht.stand, hervat: (window.__r2.klank || []).filter(k => k.k === 'hervat').length }));
      t(naLanding.stand.actief === false && naLanding.hervat === 0, `${L}: na de landing zwijgt de wacht (${JSON.stringify(naLanding.stand)}), geen outro-hervatting (${naLanding.hervat})`);
    }
    /* de plaat: identiek aan een rechtstreekse kiesHeldEcht met dezelfde seed */
    await slaap(1400);
    const A = await kaartPlaat(page, vp);
    fs.writeFileSync(path.join(UIT, vp.n + '-13-plaat-na-landing.png'), A);
    const ref = await open(browser, vp, { opslag: { slayit_proloog_klaar: '1' }, geenNudge: true });
    await ref.page.evaluate(([sd, h]) => { toonHeldKeuze(); document.getElementById('seed-invoer').value = sd; kiesHeldEcht(h); }, [s.seed, vp.held]);
    await slaap(2600);
    const B = await kaartPlaat(ref.page, vp);
    fs.writeFileSync(path.join(UIT, vp.n + '-13-plaat-referentie.png'), B);
    const d = diffPng(A, B);
    t(d !== null && d < 2, `${L}: plaatdiff van #scherm-kaart na de landing vs. rechtstreeks (seed ${s.seed}): ${d === null ? 'n.v.t. (pngjs ontbreekt)' : d.toFixed(3)}/255 (< 2)`);
    await ref.ctx.close();
    await ctx.close();
  }

  /* ==========================================================================
     2 · DE VASTHOUD-SKIP (0,8 s): kort indrukken doet niets; vasthouden snijdt naar
         de Afgrond, en ook wie overslaat kiest een masker en LANDT
     ========================================================================== */
  if (doe('skip')) {
    /* 2a · laptop: Esc. Kort Esc (0,3 s) is ook 'fullscreen uit' en mag nooit overslaan */
    {
      const vp = VPS.laptop, L = 'skip laptop';
      kop('2a · ' + L + ' · Esc vasthouden, maskerkeuze met het toetsenbord');
      const { ctx, page } = await open(browser, vp);
      await naarProloog(page, vp, L);
      await tik(page, vp, '.ov-monitor'); await wachtScene(page, 'boot', 5000);
      await tik(page, vp, '.boot-cta .knop-groot'); await wachtScene(page, 'kantoor', 5000);
      const zicht = await wachtOp(page, () => { const R = document.getElementById('scherm-proloog').shadowRoot; const s = R && R.querySelector('.pl-skip.zichtbaar'); return !!s && getComputedStyle(s).opacity > 0.2; }, 6000);
      t(zicht >= 0, `${L}: de skip-ring verschijnt (na ${zicht} ms in het kantoor; plan: 4 s na de start)`);
      await sonde(page, `${L} kantoor met de skip in beeld`);
      await houdSkip(page, vp, 300);
      await slaap(700);
      const naKort = await scene(page);
      t(naKort === 'kantoor' && !(await opslag(page)).slayit_proloog_over, `${L}: Esc 0,3 s → niets (scène "${naKort}", geen _over-vlag)`);
      await houdSkip(page, vp, 950);
      t(await wachtScene(page, 'breekpunt/afgrond', 3000), `${L}: Esc 0,95 s vasthouden → de Afgrond`);
      const ls = await opslag(page);
      const c = JSON.parse(ls.slayit_proloog || 'null') || {};
      /* F1 (review, vondst 4): _over komt pas bij de landing — in de Afgrond is er nog geen held */
      t(ls.slayit_proloog_over === null && c.v === 2 && c.uitweg === 'geduwd' && c.jeugddroom === null,
        `${L}: in de Afgrond nog geen _over-vlag (${ls.slayit_proloog_over}); contract v${c.v} uitweg "${c.uitweg}" jeugddroom ${c.jeugddroom}`);
      await slaap(900);
      const skipWeg = await sr(page, `const s = R.querySelector('.pl-skip'); return !s || !s.classList.contains('zichtbaar') || getComputedStyle(s).display === 'none' || getComputedStyle(s).opacity < 0.05;`);
      t(skipWeg, `${L}: geen skip meer in de Afgrond (dat ÍS de keuze)`);
      await sonde(page, `${L} de Afgrond`);
      /* toetsenbord: → → → pelt de Kolendruïde (terugvalzin zonder jeugddroom), ← de Gifmagiër, Enter kiest */
      await page.mouse.move(2, 2);
      for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowRight'); await slaap(160); }
      const zin = await sr(page, `return { held: (R.querySelector('.afg-info') || {}).dataset ? R.querySelector('.afg-info').dataset.held : null, zin: (R.querySelector('.afg-zin') || {}).textContent };`);
      t(zin.held === 'thoverk' && /Ik wou ooit iets worden/.test(zin.zin || ''), `${L}: →→→ pelt de Kolendruïde, terugvalzin zonder jeugddroom: ${zin.zin}`);
      await page.keyboard.press('ArrowLeft'); await slaap(250);
      await page.evaluate(() => {
        window.__overname = null;
        const sl = document.getElementById('proloog-sluier');
        const mo = new MutationObserver(() => { if (sl.classList.contains('toon') && !window.__overname) { window.__overname = { t: performance.now() }; mo.disconnect(); } });
        mo.observe(sl, { attributes: true, attributeFilter: ['class'] });
        window.__keuzeT = performance.now();
      });
      await page.keyboard.press('Enter');
      const w = await wachtOp(page, () => !!window.__overname, 4000);
      t(w >= 0, `${L}: ← + Enter kiest de Gifmagiër (sluier dicht na ${w} ms)`);
      /* een toets tijdens de landing springt naar het eind */
      await slaap(1500);
      await page.keyboard.press('Enter');
      await slaap(250);
      const s = await stand(page);
      t(s.scherm === 'kaart' && s.held === 'gifmagier' && !s.sluier && s.bezig === false && /80/.test(s.chip || ''),
        `${L}: Enter tijdens de landing → meteen speelbaar op de kaart met ${s.held} (sluier ${s.sluier}, chip "${s.chip}")`);
      t(s.jeugddroom === null, `${L}: overgeslagen vóór de audit → jeugddroomTekst() ${JSON.stringify(s.jeugddroom)} (het eindgevecht zwijgt er dan netjes over)`);
      const lsNa = await opslag(page);
      t(lsNa.slayit_proloog_over === '1' && lsNa.slayit_proloog_klaar === '1', `${L}: na de landing: _over = ${lsNa.slayit_proloog_over}, _klaar = ${lsNa.slayit_proloog_klaar}`);
      t(s.log === 'titel > proloog > kaart' && page.__nav === 0 && s.acN === 1, `${L}: ${s.log}, ${page.__nav}x framenavigated, ${s.acN} AudioContext`);
      t(page.__f.length === 0, `${L}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
      await ctx.close();
    }
    /* 2b · staand: de ring vasthouden met een echte aanraking; de nudge stond al op de titel */
    {
      const vp = VPS.staand, L = 'skip staand';
      kop('2b · ' + L + ' · de ring vasthouden (touch), met de nudge al op de titel');
      const { ctx, page } = await open(browser, vp, { geenFullscreen: true });
      await slaap(1600);   /* de fullscreen-nudge verschijnt 1,2 s na de boot, óp de titel */
      const nudgeVoor = await page.evaluate(() => !!document.getElementById('scherm-nudge'));
      await naarProloog(page, vp, L);
      await slaap(600);
      const nudgeTijdens = await page.evaluate(() => !!document.getElementById('scherm-nudge'));
      t(!nudgeTijdens, `${L}: de nudge (op de titel: ${nudgeVoor}) hangt niet over de proloog (${nudgeTijdens})`);
      await tik(page, vp, '.ov-monitor'); await wachtScene(page, 'boot', 5000);
      await tik(page, vp, '.boot-cta .knop-groot'); await wachtScene(page, 'kantoor', 5000);
      for (let i = 0; i < 60; i++) {
        if (await sr(page, `return !!R.querySelector('.term-acties button[data-actie="glimlach"]');`)) break;
        await page.locator('.term-log').first().tap({ position: { x: 16, y: 16 }, force: true }).catch(() => {});
        await slaap(160);
      }
      await tik(page, vp, '.term-acties button[data-actie="glimlach"]');
      await wachtOp(page, () => { const R = document.getElementById('scherm-proloog').shadowRoot; return !!(R && R.querySelector('.pl-skip.zichtbaar')); }, 6000);
      await sonde(page, `${L} kantoor met de skip in beeld`);
      await houdSkip(page, vp, 350);
      await slaap(600);
      t((await scene(page)) === 'kantoor', `${L}: de ring 0,35 s aanraken → niets (scène "${await scene(page)}")`);
      await houdSkip(page, vp, 950);
      t(await wachtScene(page, 'breekpunt/afgrond', 3000), `${L}: de ring 0,95 s vasthouden → de Afgrond`);
      const c = JSON.parse((await opslag(page)).slayit_proloog || 'null') || {};
      t(c.uitweg === 'geduwd' && c.glimlachen === 1, `${L}: het contract telt de ene glimlach (${c.glimlachen}) en zegt "geduwd"`);
      await kiesMasker(page, vp, 'woede', L);
      const w = await wachtLanding(page, 12000);
      const s = await stand(page);
      t(w >= 0 && s.scherm === 'kaart' && s.held === 'slachter' && s.fakkel === 80, `${L}: geland op "${s.scherm}" met ${s.held}, fakkel ${s.fakkel}`);
      t(s.log === 'titel > proloog > kaart' && page.__nav === 0 && s.acN === 1, `${L}: ${s.log}, ${page.__nav}x framenavigated, ${s.acN} AudioContext`);
      if (nudgeVoor) {
        /* fullscreen weigert hier (zoals op iOS): de nudge sloot dus niet vanzelf. Hij moet
           weg zijn tijdens de proloog, NIET over de verse kaart vallen (F1, vondst 8), en pas
           bij de volgende rustige schermwissel terugkomen (hier: terug naar de titel) */
        const fs0 = await page.evaluate(() => !!document.fullscreenElement);
        const opKaart = await wachtOp(page, () => !!document.getElementById('scherm-nudge'), 3500);
        await page.evaluate(() => naarTitel());
        const terug = await wachtOp(page, () => !!document.getElementById('scherm-nudge'), 4000);
        t(opKaart < 0 && (fs0 ? terug < 0 : terug >= 0), `${L}: na de landing: niet over de kaart (${opKaart < 0 ? 'weg' : 'VERSCHEEN na ' + opKaart + ' ms'}); fullscreen ${fs0} → op de titel ${fs0 ? 'blijft hij weg' : 'komt hij terug'} (${terug < 0 ? 'weg' : 'na ' + terug + ' ms'})`);
      }
      t(page.__f.length === 0, `${L}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
      await ctx.close();
    }
    /* 2c · overslaan en dan herladen vóór de maskerkeuze (F1, vondst 4): 'Nieuw avontuur'
       brengt je terug in de Afgrond, en de directe landing met de held van het masker blijft */
    {
      const vp = VPS.laptop, L = 'skip + herlaad';
      kop('2c · ' + L + ' · overslaan, herladen in de Afgrond, dan toch direct landen');
      const { ctx, page } = await open(browser, vp, { geenNudge: true });
      await naarProloog(page, vp, L);
      await wachtOp(page, () => { const R = document.getElementById('scherm-proloog').shadowRoot; return !!(R && R.querySelector('.pl-skip.zichtbaar')); }, 6000);
      await houdSkip(page, vp, 950);
      t(await wachtScene(page, 'breekpunt/afgrond', 3000), `${L}: skip → de Afgrond`);
      await page.reload({ waitUntil: 'load' }); await slaap(800); await volgSchermen(page); page.__nav = 0;
      const gate = await page.evaluate(() => ({ moet: proloogMoetSpelen(), over: localStorage.getItem('slayit_proloog_over'), v3: JSON.parse(localStorage.getItem('slaylit_proloog_v3') || 'null') }));
      t(gate.moet && gate.over === null && gate.v3 && gate.v3.checkpoint === 'afgrond', `${L}: na de herlaad zegt de gate nog 'spelen' (${gate.moet}), geen _over (${gate.over}), save op "${gate.v3 && gate.v3.checkpoint}"`);
      await naarProloog(page, vp, L + ' (herladen)');
      t(await wachtScene(page, 'breekpunt/afgrond', 4000), `${L}: 'Nieuw avontuur' → meteen terug in de Afgrond`);
      await kiesMasker(page, vp, 'gif', L);
      const w = await wachtLanding(page, 12000);
      const s = await stand(page);
      const ls = await opslag(page);
      t(w >= 0 && s.scherm === 'kaart' && s.held === 'gifmagier' && s.log === 'titel > proloog > kaart' && ls.slayit_proloog_klaar === '1',
        `${L}: direct geland op "${s.scherm}" met ${s.held} (${s.log}), _klaar ${ls.slayit_proloog_klaar}`);
      t(page.__f.length === 0 && page.__nav === 0, `${L}: geen paginafouten, ${page.__nav}x framenavigated` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
      await ctx.close();
    }
  }

  /* ==========================================================================
     3 · HERBELEVEN: laat save, contract en proloog-save byte-gelijk; nooit kiesHeldEcht
     ========================================================================== */
  if (doe('herbeleef')) {
    const vp = VPS.laptop, L = 'herbeleven';
    kop('3 · ' + L + ' · titelknop, Codex-hoofdstuk en midden in een run');
    const contract = { v: 2, jeugddroom: 'astronaut', uitweg: 'sprong', held: 'thoverk', masker: 'vlucht', glimlachen: 3, fotoKantoor: true, zelfGestempeld: false, wachtToon: -7, echo: 0 };
    const v3 = { scene: 4, checkpoint: 'afgrond', choices: { jeugddroom: 'astronaut', val: 'gesprongen', held: 'thoverk', masker: 'vlucht' }, gezien: [0, 1, 2, 3, 4] };
    const { ctx, page } = await open(browser, vp, { opslag: { slayit_proloog_klaar: '1', slayit_proloog: JSON.stringify(contract), slaylit_proloog_v3: JSON.stringify(v3) } });
    const dump = () => page.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().filter(k => /proloog|save|codex|daily/.test(k)).map(k => [k, localStorage.getItem(k)])));
    const voor = await dump();
    /* 3a · de titelknop 'Proloog' (al gekend → herbeleven), een stukje spelen, dan de skip = terug */
    await page.locator('#scherm-titel .knop-stil', { hasText: 'Proloog' }).click();
    const w = await wachtOp(page, () => document.body.dataset.scherm === 'proloog' && !!(window.Proloog && Proloog.actief), 6000);
    t(w >= 0 && (await scene(page)) === 'overzicht', `${L}: titelknop 'Proloog' → herbeleven vanaf scène 0 (${await scene(page)})`);
    await tik(page, vp, '.ov-monitor'); await wachtScene(page, 'boot', 5000);
    await tik(page, vp, '.boot-cta .knop-groot'); await wachtScene(page, 'kantoor', 5000);
    await wachtOp(page, () => { const R = document.getElementById('scherm-proloog').shadowRoot; return !!(R && R.querySelector('.pl-skip.zichtbaar')); }, 6000);
    await houdSkip(page, vp, 950);
    const terug = await wachtOp(page, () => document.body.dataset.scherm === 'titel' && !proloogBezig(), 5000);
    let s = await stand(page);
    t(terug >= 0 && s.log === 'titel > proloog > titel', `${L}: vasthouden tijdens het herbeleven → terug naar de titel (${s.log})`);
    t((await dump()) === voor, `${L}: na de titelknop + skip is de opslag byte-gelijk (contract, proloog-save, geen run, geen _over)`);
    /* 3b · de Codex: hoofdstuk 'De Afgrond' → een masker kiezen → terug, geen run */
    await page.evaluate(() => toonCodex()); await slaap(1200);
    const hfst = await page.evaluate(() => [...document.querySelectorAll('#codex-inhoud [data-pl-hoofdstuk]')].map(b => b.dataset.plHoofdstuk));
    t(hfst.includes('afgrond') && hfst.length >= 8, `${L}: de Codex toont 'Proloog herbeleven' + de hoofdstukken (${hfst.join(',')})`);
    await page.locator('#codex-inhoud [data-pl-hoofdstuk="afgrond"]').click();
    t(await wachtScene(page, 'breekpunt/afgrond', 6000), `${L}: Codex → rechtstreeks de Afgrond`);
    await slaap(900);
    const zin = await (async () => { await page.locator('.afg-masker[data-masker="vlucht"]').hover(); await slaap(400); return sr(page, `return (R.querySelector('.afg-zin') || {}).textContent;`); })();
    t(/Ik wou astronaut worden/.test(zin || ''), `${L}: de Afgrond leest de jeugddroom uit het contract (${zin})`);
    await page.locator('.afg-masker[data-masker="vlucht"]').click();
    const t2 = await wachtOp(page, () => document.body.dataset.scherm === 'titel' && !proloogBezig(), 7000);
    s = await stand(page);
    t(t2 >= 0 && s.scherm === 'titel' && !s.sluier && s.tb === 'none', `${L}: na de keuze onthult de sluier het vorige scherm: "${s.scherm}", sluier ${s.sluier}`);
    /* F1 (vondst 9): wie vanuit de Codex herbeleeft, staat daarna weer IN de Codex */
    const codexOpen = await wachtOp(page, () => { const o = document.getElementById('overlay-codex'); return !!o && o.classList.contains('open') && !!o.querySelector('[data-pl-hoofdstuk="afgrond"]'); }, 2000);
    t(codexOpen >= 0, `${L}: terug in de Codex, met de hoofdstukken (${codexOpen >= 0 ? 'open' : 'NIET open'})`);
    await page.evaluate(() => { const o = document.getElementById('overlay-codex'); if (o) o.classList.remove('open'); });
    t((await dump()) === voor, `${L}: na het Codex-hoofdstuk + maskerkeuze is de opslag byte-gelijk (geen contract, geen save, geen kiesHeldEcht)`);
    /* 3c · midden in een run: herbeleven en terug op de kaart, de run onaangeroerd */
    await page.evaluate(() => { nieuwSpel('slachter', 'HERBELEEF-1', 0); saveSpel(); renderKaartScherm(); });
    await slaap(500);
    const runVoor = await dump();
    await page.evaluate(() => herbeleefProloog(2));
    t(await wachtScene(page, 'kantoor', 6000), `${L}: herbeleefProloog(2) midden in een run → het kantoor`);
    await wachtOp(page, () => { const R = document.getElementById('scherm-proloog').shadowRoot; return !!(R && R.querySelector('.pl-skip.zichtbaar')); }, 6000);
    await houdSkip(page, vp, 950);
    await wachtOp(page, () => document.body.dataset.scherm === 'kaart' && !proloogBezig(), 5000);
    s = await stand(page);
    t(s.scherm === 'kaart' && s.held === 'slachter' && s.tb === 'flex' && s.seed === 'HERBELEEF-1', `${L}: terug op de kaart met dezelfde run (${s.held}, seed ${s.seed}, topbalk ${s.tb})`);
    t((await dump()) === runVoor, `${L}: de save van de lopende run is byte-gelijk gebleven`);
    t(page.__nav === 0 && s.acN === 1, `${L}: ${page.__nav}x framenavigated, ${s.acN} AudioContext over drie herbelevingen`);
    t(page.__f.length === 0, `${L}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
    await ctx.close();
  }

  /* ==========================================================================
     4 · HERVATTEN en de WIPE: na een herlaad het laatste checkpoint; na een WIPE scène 0
     ========================================================================== */
  if (doe('wipe')) {
    const vp = VPS.liggend, L = 'wipe';
    kop('4 · hervatten na een herlaad, dan een WIPE (liggend)');
    const { ctx, page } = await open(browser, vp, { geenNudge: true });
    await naarProloog(page, vp, L);
    await tik(page, vp, '.ov-monitor'); await wachtScene(page, 'boot', 5000);
    await tik(page, vp, '.boot-cta .knop-groot'); await wachtScene(page, 'kantoor', 5000);
    for (let i = 0; i < 60; i++) {
      if (await sr(page, `return !!R.querySelector('.term-acties button[data-actie="glimlach"]');`)) break;
      await page.locator('.term-log').first().tap({ position: { x: 16, y: 16 }, force: true }).catch(() => {});
      await slaap(160);
    }
    await tik(page, vp, '.term-acties button[data-actie="glimlach"]');
    await slaap(400);
    const save1 = JSON.parse((await opslag(page)).slaylit_proloog_v3 || 'null') || {};
    t(save1.scene === 2, `${L}: de proloog-save staat in het kantoor (scène ${save1.scene}, checkpoint ${save1.checkpoint})`);
    await page.reload({ waitUntil: 'load' }); await slaap(800); await volgSchermen(page);
    await naarProloog(page, vp, L + ' (herladen)');
    await slaap(600);
    t((await scene(page)) === 'kantoor', `${L}: na een herlaad hervat 'Nieuw avontuur' in het kantoor (${await scene(page)}), niet op scène 0`);
    /* ook een oude v2-save (de proloog vóór R1) moet mee weg, anders migreert hij terug in de proloog */
    await page.evaluate(() => { localStorage.setItem('slayit_proloog_klaar', '1'); localStorage.setItem('slayit_proloog_over', '1'); localStorage.setItem('slaylit_proloog_v2', JSON.stringify({ idx: 5, choices: { val: 'gesprongen', jeugddroom: 'oud' }, maxReached: 5 })); localStorage.setItem('slayit_wipe', '0'); });
    await page.reload({ waitUntil: 'load' }); await slaap(800); await volgSchermen(page);
    const naWipe = await opslag(page);
    t(!naWipe.slayit_proloog && !naWipe.slayit_proloog_klaar && !naWipe.slayit_proloog_over && !naWipe.slaylit_proloog_v3 && !naWipe.slaylit_proloog_v2,
      `${L}: de WIPE wist contract, klaar, over, de proloog-save en de oude v2-save (over: ${Object.keys(naWipe).filter(k => naWipe[k] !== null).join(',') || 'niets'})`);
    await naarProloog(page, vp, L + ' (na de WIPE)');
    await slaap(500);
    const s0 = await scene(page);
    const save0 = JSON.parse((await opslag(page)).slaylit_proloog_v3 || 'null') || {};
    t(s0 === 'overzicht' && save0.scene === 0, `${L}: na de WIPE start de proloog weer op scène 0 (${s0}, save scène ${save0.scene})`);
    await sonde(page, `${L} scène 0 na de WIPE`);
    t(page.__f.length === 0, `${L}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
    await ctx.close();
  }

  /* ==========================================================================
     5 · DE POORTEN: een veteraan of een lopende run landt op de heldkeuze met voorselectie
     ========================================================================== */
  if (doe('poort')) for (const geval of [
    { n: 'veteraan (Codex.runs 3) liggend', vp: VPS.liggend, opslag: { slayit_codex: JSON.stringify({ runs: 3 }) }, masker: 'vlucht' },
    { n: 'lopende run laptop', vp: VPS.laptop, run: true, masker: 'gif' }
  ]) {
    const vp = geval.vp, L = 'poort ' + geval.n;
    kop('5 · ' + L);
    const { ctx, page } = await open(browser, vp, { opslag: geval.opslag, geenNudge: true });
    let runVoor = null;
    if (geval.run) runVoor = await page.evaluate(() => { nieuwSpel('slachter', 'POORT-1', 0); saveSpel(); naarTitel(); return localStorage.getItem('slayit_save_v1'); });
    await naarProloog(page, vp, L);
    await wachtOp(page, () => { const R = document.getElementById('scherm-proloog').shadowRoot; return !!(R && R.querySelector('.pl-skip.zichtbaar')); }, 6000);
    await houdSkip(page, vp, 950);
    t(await wachtScene(page, 'breekpunt/afgrond', 3000), `${L}: skip → de Afgrond`);
    await kiesMasker(page, vp, geval.masker, L);
    await wachtLanding(page, 12000);
    await slaap(300);
    const s = await stand(page);
    const held = HELD_VAN[geval.masker];
    t(s.scherm === 'held' && s.voorkeur === held && s.log === 'titel > proloog > held', `${L}: de heldkeuze (${s.log}) met de ember-rand op "${s.voorkeur}"`);
    const kies = await page.evaluate(() => {
      const k = document.querySelector('.held-kaart.voorkeur .held-kies'); if (!k) return null;
      const r = k.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { in: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, raak: !!(el && el.closest('.held-kies')), tekst: k.textContent.trim(), y: [Math.round(r.top), Math.round(r.bottom)] };
    });
    t(!!kies && kies.in && kies.raak, `${L}: "${kies && kies.tekst}" staat volledig in beeld (y ${kies && kies.y.join('-')} van ${vp.h}) en is raak`);
    if (geval.run) t((await page.evaluate(() => localStorage.getItem('slayit_save_v1'))) === runVoor, `${L}: de save van de lopende run is byte-gelijk (kiesHeldEcht liep niet)`);
    else t(!(await page.evaluate(() => localStorage.getItem('slayit_save_v1'))), `${L}: geen run gestart vóór de klik`);
    /* nog één klik: 'Speel als …' */
    if (!geval.run) {
      await tik(page, vp, '.held-kaart.voorkeur .held-kies');
      await slaap(500);
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /toch beginnen/i.test(x.textContent) && x.getClientRects().length); if (b) b.click(); });
      await wachtOp(page, () => document.body.dataset.scherm === 'kaart', 4000);
      const s2 = await stand(page);
      t(s2.scherm === 'kaart' && s2.held === held, `${L}: één klik later op de kaart met ${s2.held}`);
    }
    t(page.__nav === 0 && page.__f.length === 0, `${L}: ${page.__nav}x framenavigated, geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
    await ctx.close();
  }

  /* ==========================================================================
     6 · DE STUB proloog/index.html → ../?proloog=1, onder /slay-lit/ (GitHub Pages-pad)
     ========================================================================== */
  if (doe('stub')) {
    const vp = VPS.staand, L = 'stub /slay-lit/';
    kop('6 · ' + L + ' · oude link proloog/ → de proloog in de game-pagina');
    const { ctx, page } = await open(browser, vp, { prefix: '/slay-lit/', geenNudge: true });
    const lekVoor = await page.evaluate(LEK);
    page.__nav = 0; page.__load = 0;
    await page.goto('http://' + HOST + '/slay-lit/proloog/', { waitUntil: 'load' });
    const w = await wachtOp(page, () => document.body && document.body.dataset.scherm === 'proloog' && !!(window.Proloog && Proloog.actief), 8000);
    const url = await page.evaluate(() => location.pathname + location.search);
    t(w >= 0 && url === '/slay-lit/', `${L}: proloog/ → location.replace('../?proloog=1') → de proloog start in de game (url nu "${url}", parameter weg)`);
    t(page.__load === 1 && page.__nav === 3, `${L}: de stub stuurt door vóór hij zelf uitlaadt: 1 documentlading (de game: ${page.__load}); framenavigated ${page.__nav} = stub + game + history.replaceState die de parameter wist`);
    const navNaStart = page.__nav, loadNaStart = page.__load;
    await slaap(900);
    await sonde(page, `${L} scène 0`);
    await wachtOp(page, () => { const R = document.getElementById('scherm-proloog').shadowRoot; return !!(R && R.querySelector('.pl-skip.zichtbaar')); }, 6000);
    await houdSkip(page, vp, 950);
    t(await wachtScene(page, 'breekpunt/afgrond', 3000), `${L}: skip → de Afgrond`);
    await kiesMasker(page, vp, 'vlucht', L);
    await wachtLanding(page, 12000);
    const s = await stand(page);
    t(s.scherm === 'kaart' && s.held === 'thoverk' && s.fakkel === 80, `${L}: geland op "${s.scherm}" met ${s.held}, fakkel ${s.fakkel}`);
    t(page.__nav === navNaStart && page.__load === loadNaStart && s.acN === 1, `${L}: geen herlaad of navigatie sinds de start (${page.__nav - navNaStart}/${page.__load - loadNaStart}), ${s.acN} AudioContext`);
    const lekNa = await page.evaluate(LEK);
    t(JSON.stringify(lekNa) === JSON.stringify(lekVoor), `${L}: geen CSS-lek onder /slay-lit/ (tokens, fonts, #sheets vóór = na)` + (JSON.stringify(lekNa) === JSON.stringify(lekVoor) ? '' : ' — ' + JSON.stringify(lekVoor) + ' / ' + JSON.stringify(lekNa)));
    const miss = page.__404.filter(p => !/rest\/v1|supabase|favicon/.test(p));
    t(miss.length === 0, `${L}: geen 404's en niets buiten /slay-lit/ opgevraagd` + (miss.length ? ' — ' + miss.slice(0, 5).join(', ') : ''));
    t(page.__f.length === 0, `${L}: geen paginafouten (ook niet zonder gebaar: geen fullscreen-weigering)` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
    await ctx.close();
  }

  /* ==========================================================================
     7 · REDUCED MOTION: klaar na 0,9 s, geen schaal, geen vonken, overvloeier 800 ms
     ========================================================================== */
  if (doe('rustig')) {
    const vp = VPS.laptop, L = 'reduced motion';
    kop('7 · ' + L + ' (laptop)');
    const { ctx, page } = await open(browser, vp, { rustig: true });
    await naarProloog(page, vp, L);
    await wachtOp(page, () => { const R = document.getElementById('scherm-proloog').shadowRoot; return !!(R && R.querySelector('.pl-skip.zichtbaar')); }, 6000);
    await houdSkip(page, vp, 950);
    t(await wachtScene(page, 'breekpunt/afgrond', 3000), `${L}: skip → de Afgrond`);
    await kiesMasker(page, vp, 'gif', L, { rustig: true });
    await slaap(300);
    const r = await page.evaluate(() => ({
      statisch: !!document.querySelector('#proloog-sluier .pl-titel.statisch'),
      tf: document.getElementById('scherm-kaart').style.transform, vonken: document.querySelectorAll('.pl-vonk-deeltje').length,
      pl: [...document.body.classList].filter(c => /^pl-/.test(c)).join(',')
    }));
    t(r.statisch && r.tf === '' && r.vonken === 0 && r.pl === '', `${L}: statische titel (${r.statisch}), geen schaal ("${r.tf}"), ${r.vonken} vonken, geen pl-landt ("${r.pl}")`);
    const w = await wachtLanding(page, 4000);
    t(w >= 0 && w <= 2300, `${L}: de rustige landing is klaar na ~${w + 300} ms (1,2 s titel + 0,8 s overvloeier)`);
    const s = await stand(page);
    t(s.scherm === 'kaart' && s.held === 'gifmagier' && s.fakkel === 80 && /80/.test(s.chip || ''), `${L}: geland op "${s.scherm}" met ${s.held}, chip "${s.chip}"`);
    t(page.__f.length === 0, `${L}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
    await ctx.close();
  }

  /* ==========================================================================
     9 · GLIMLACHEN (F1, vondst 5): een herlaad telt geen glimlach dubbel — niet in het
         gesprek (dat na een herlaad opnieuw begint) en niet in het kantoor (checkpoint vóór de knop)
     ========================================================================== */
  if (doe('glimlach')) {
    const vp = VPS.laptop, L = 'glimlachen';
    kop('9 · ' + L + ' · een herlaad telt niets dubbel (gesprek en kantoor)');
    const v3g = { scene: 3, checkpoint: 'start', choices: { jeugddroom: 'astronaut', glimlachen: 2, glimCp: 2, meter: 80 }, gezien: [0, 1, 2, 3] };
    const cG = { v: 2, jeugddroom: 'astronaut', uitweg: null, held: null, masker: null, glimlachen: 2, fotoKantoor: false, zelfGestempeld: false, wachtToon: -7, echo: 0 };
    const { ctx, page } = await open(browser, vp, { opslag: { slaylit_proloog_v3: JSON.stringify(v3g), slayit_proloog: JSON.stringify(cG) }, geenNudge: true });
    await naarProloog(page, vp, L);
    t(await wachtScene(page, 'gesprek', 5000), `${L}: 'Nieuw avontuur' hervat in het gesprek`);
    await slaap(700);
    await page.keyboard.press('1'); await slaap(450);
    let ls = await opslag(page);
    const va = JSON.parse(ls.slaylit_proloog_v3 || 'null') || {}, ca = JSON.parse(ls.slayit_proloog || 'null') || {};
    t(va.choices && va.choices.glimlachen === 2 && ca.glimlachen === 2, `${L}: een glimlach in het lopende gesprek telt nog niet (save ${va.choices && va.choices.glimlachen}, contract ${ca.glimlachen})`);
    await page.reload({ waitUntil: 'load' }); await slaap(800); await volgSchermen(page);
    await naarProloog(page, vp, L + ' (herladen)');
    t(await wachtScene(page, 'gesprek', 5000), `${L}: na de herlaad begint het gesprek opnieuw`);
    await slaap(700);
    await page.keyboard.press('1'); await slaap(450);
    for (let b = 0; b < 3; b++) { await page.keyboard.press('e'); await slaap(600); }
    t(await wachtScene(page, 'breekpunt/factuur', 6000), `${L}: geduwd → de Eindafrekening`);
    ls = await opslag(page);
    const vb = JSON.parse(ls.slaylit_proloog_v3 || 'null') || {}, cb = JSON.parse(ls.slayit_proloog || 'null') || {};
    t(cb.glimlachen === 3 && vb.choices && vb.choices.glimlachen === 3 && cb.uitweg === 'geduwd',
      `${L}: herlaad + één glimlach + einde: contract ${cb.glimlachen}, save ${vb.choices && vb.choices.glimlachen} (2 uit het kantoor + 1; vroeger 4)`);
    /* het kantoor: de save staat op het checkpoint vóór de GLIMLACH-knop, maar de knop was al
       ingedrukt (glimlachen 1). Hervatten moet de teller van het checkpoint terugzetten. */
    const v3k = { scene: 2, checkpoint: 'beat:9', choices: { glimlachen: 1, glimCp: 0, meter: 78 }, gezien: [0, 1, 2] };
    await page.evaluate(v => { localStorage.removeItem('slayit_proloog'); localStorage.setItem('slaylit_proloog_v3', v); }, JSON.stringify(v3k));
    await page.reload({ waitUntil: 'load' }); await slaap(800); await volgSchermen(page);
    await naarProloog(page, vp, L + ' (kantoor)');
    t(await wachtScene(page, 'kantoor', 5000), `${L}: hervat in het kantoor, op het checkpoint 'glimlach'`);
    for (let i = 0; i < 40; i++) {
      if (await sr(page, `return !!R.querySelector('.term-acties button[data-actie="glimlach"]');`)) break;
      await page.keyboard.press('Space'); await slaap(150);
    }
    await tik(page, vp, '.term-acties button[data-actie="glimlach"]'); await slaap(400);
    const vk = JSON.parse((await opslag(page)).slaylit_proloog_v3 || 'null') || {};
    t(vk.choices && vk.choices.glimlachen === 1, `${L}: kantoor hervat + GLIMLACH: ${vk.choices && vk.choices.glimlachen} glimlach (niet 2)`);
    t(page.__f.length === 0, `${L}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
    await ctx.close();
  }

  /* ==========================================================================
     10 · LITE (F1, vondst 3): de prestatiemodus geldt ook IN de proloog — geen blur over de
          val, geen CRT-flikker, het rustige pad bij de keuze (klaar op 0,9 s)
     ========================================================================== */
  if (doe('lite')) {
    const vp = VPS.liggend, L = 'lite';
    kop('10 · ' + L + ' (liggend, body.lite)');
    const v3 = { scene: 4, checkpoint: 'val', choices: { jeugddroom: 'piloot', val: 'geduwd', glimlachen: 1 }, gezien: [0, 1, 2, 3, 4] };
    const { ctx, page } = await open(browser, vp, { opslag: { slayit_inst: JSON.stringify({ lite: true, d3: false, mobielHersteld2: true }), slaylit_proloog_v3: JSON.stringify(v3) }, geenNudge: true });
    const bodyLite = await page.evaluate(() => document.body.classList.contains('lite'));
    await naarProloog(page, vp, L);
    t(await wachtScene(page, 'breekpunt/val', 5000), `${L}: hervat in de val`);
    await slaap(2600);
    const m = await sr(page, `const v = R.querySelector('.bs-vak'); const g = R.getElementById('crt-glow');
      return { lite: R.host.hasAttribute('data-lite'), filter: v ? getComputedStyle(v).filter : null, glow: g ? getComputedStyle(g).animationName : null };`);
    t(bodyLite && m.lite && m.filter === 'none' && m.glow === 'none', `${L}: body.lite ${bodyLite} → host data-lite ${m.lite}; de val zonder blur (filter "${m.filter}"), de CRT-gloed zonder flikker ("${m.glow}")`);
    const live = await page.evaluate(() => new Promise(ok => {
      const h = document.getElementById('scherm-proloog');
      document.body.classList.remove('lite');
      setTimeout(() => { const uit = !h.hasAttribute('data-lite'); document.body.classList.add('lite'); setTimeout(() => ok({ uit, weer: h.hasAttribute('data-lite') }), 60); }, 60);
    }));
    t(live.uit && live.weer, `${L}: de host volgt body.lite live (uit: ${live.uit}, weer aan: ${live.weer})`);
    for (let i = 0; i < 40; i++) {
      if ((await scene(page)) === 'breekpunt/afgrond') break;
      await page.locator('.fase-val').tap({ position: { x: 12, y: 12 }, force: true }).catch(() => {});
      await slaap(250);
    }
    t(await wachtScene(page, 'breekpunt/afgrond', 6000), `${L}: doorgespoeld tot de Afgrond`);
    await kiesMasker(page, vp, 'woede', L, { rustig: true });
    await slaap(300);
    const r = await page.evaluate(() => ({ statisch: !!document.querySelector('#proloog-sluier .pl-titel.statisch'), tf: document.getElementById('scherm-kaart').style.transform }));
    t(r.statisch && r.tf === '', `${L}: de landing kiest het rustige pad (statische titel ${r.statisch}, geen schaal "${r.tf}")`);
    const w = await wachtLanding(page, 5000);
    const s = await stand(page);
    t(w >= 0 && s.scherm === 'kaart' && s.held === 'slachter' && s.fakkel === 80, `${L}: geland op "${s.scherm}" met ${s.held}, fakkel ${s.fakkel}`);
    t(page.__f.length === 0, `${L}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
    await ctx.close();
  }

  /* ==========================================================================
     11 · R2 · IN DE WACHT: DE VAL — onaangeraakt, per formaat. Hervat in de val (proloog-save
          op checkpoint 'val') via 'Nieuw avontuur'; alle metingen via window.__r2.
     ========================================================================== */
  if (doe('val')) {
    const valSave = (val, extra) => JSON.stringify(Object.assign({ scene: 4, checkpoint: 'val', choices: { jeugddroom: 'brandweerman', val, glimlachen: 2 }, gezien: [0, 1, 2, 3, 4] }, extra || {}));
    /* de spiegel (aria-live) door de tijd: wat het canvas zegt, moet ook leesbaar zijn voor wie het niet ziet */
    const volgSpiegel = page => page.evaluate(() => {
      window.__spiegel = [];
      const lus = () => {
        const h = document.getElementById('scherm-proloog'), R = h && h.shadowRoot, s = R && R.querySelector('.val-sr');
        const tx = s ? s.textContent : null;
        if (tx && window.__spiegel[window.__spiegel.length - 1] !== tx) window.__spiegel.push(tx);
        requestAnimationFrame(lus);
      };
      requestAnimationFrame(lus);
    });
    /* fixer R2: wachten tot de klok van de val (handle.t, pauzebewust) op s seconden staat */
    const valOp = (page, s, ms) => wachtOp(page, x => !!(window.__r2 && window.__r2.handle && window.__r2.handle.t >= x), ms || 16000, s);
    const inAfgrond = () => { const R = document.getElementById('scherm-proloog').shadowRoot; const a = R && R.getElementById('pl-app'); return !!a && a.dataset.fase === 'afgrond'; };

    /* 11a · onaangeraakt, geduwd: de regie van 12,6 s, de klank, VERBINDING, 0042 in de kooi */
    for (const vp of [VPS.laptop, VPS.liggend, VPS.staand]) {
      const L = 'val ' + vp.n;
      kop(`11a · ${L} ${vp.w}x${vp.h} · onaangeraakt (geduwd): regie, klank, VERBINDING, geen vallende figuur`);
      const { ctx, page } = await open(browser, vp, { opslag: { slaylit_proloog_v3: valSave('geduwd') }, geenNudge: true });
      await r2Spion(page);
      await volgSpiegel(page);
      await klikNieuw(page, vp);
      t(await wachtScene(page, 'breekpunt/val', 6000), `${L}: 'Nieuw avontuur' hervat in de val`);
      await slaap(1500);
      const lay = await sr(page, `const v = R.querySelector('.fase-val'); const c = R.querySelector('.val-scherm'); const b = c && c.getBoundingClientRect();
        return { layout: v && v.dataset.valLayout, fase: v && v.dataset.valFase, canvas: c ? [c.width, c.height] : null, rect: b ? [b.left, b.top, b.width, b.height].map(Math.round) : null };`);
      const staand = vp.h > vp.w;
      t(lay.layout === (staand ? 'staand' : 'liggend') && lay.canvas && lay.canvas.join('x') === (staand ? '180x320' : '320x180') && lay.fase === 'daal' && lay.rect[2] > 0 && lay.rect[0] >= 0 && lay.rect[0] + lay.rect[2] <= vp.w + 1,
        `${L}: het liftcanvas ${lay.canvas && lay.canvas.join('x')} (${lay.layout}), opgeschaald tot [${lay.rect}] binnen het scherm, fase "${lay.fase}"`);
      await sonde(page, `${L} de lift daalt`);
      /* fixer R2 · gevoeligheid: pixels na de vloer — de vellen (9,1 s) en het silhouet (9,7 s) */
      await valOp(page, 9.1);
      const pv = await page.evaluate(PIXELS);
      await valOp(page, 9.7);
      const ps = await page.evaluate(PIXELS);
      await shot(page, `${vp.n}-val-silhouet`);
      const tot = await wachtOp(page, inAfgrond, 18000);
      await slaap(700);
      const r2 = await r2Lees(page);
      const vv = valVenster(r2);
      const duur = vv && vv.t1 !== null ? (vv.t1 - vv.t0) / 1000 : null;
      t(tot >= 0 && duur !== null && Math.abs(duur - 12.6) <= 0.3 && vv.naar === 'afgrond',
        `${L}: de val duurt onaangeraakt ${duur === null ? '?' : duur.toFixed(2)} s (12,6 ± 0,3), dan de Afgrond (B.A.A.S. drukt)`);
      const ev = r2.val.map(v => v.naam);
      const volg = ['hek', 'etage', 'tl', 'verbinding', 'ledUit', 'vloer', 'stilte', 'kooltje', 'slot', 'knop', 'baasDrukt'];
      const idx = volg.map(n => ev.indexOf(n));
      t(idx.every((x, i) => x >= 0 && (i === 0 || x > idx[i - 1])),
        `${L}: de momenten in volgorde: ${volg.map((n, i) => n + (idx[i] >= 0 ? '@' + ((r2.val[idx[i]].t - vv.t0) / 1000).toFixed(2) : '(NIET)')).join(' ')}`);
      toetsKlankVal(r2, L);
      toetsVerbinding(r2, L);
      toetsSprite(r2, L);
      /* de kooi-tl sterft bij −3, en dan is het laatste gekochte licht de meter-LED */
      const tl = r2.val.find(v => v.naam === 'tl'), e6 = r2.val.find(v => v.naam === 'etage' && v.arg === 6), vb = r2.val.find(v => v.naam === 'verbinding');
      t(!!tl && !!e6 && Math.abs(tl.t - e6.t) < 30 && !!vb && vb.t > tl.t,
        `${L}: de kooi-tl sterft bij −3 (${tl && e6 ? Math.round(tl.t - e6.t) : '?'} ms na etage −3), daarna pas VERBINDING VERBROKEN op de meter-LED`);
      /* ---- fixer R2 ---- */
      /* gevoeligheid 1: het schaarhek staat dicht van bij het eerste beeld (nooit een open kooi op het dak) */
      const hk = r2.hek.filter(h => h.t >= r2.valStart - 300 && (!vv || vv.t1 === null || h.t <= vv.t1));
      t(hk.length > 50 && hk.every(h => h.w === h.vol) && Math.abs(hk[0].t - r2.valStart) < 60,
        `${L}: het schaarhek staat dicht van bij het eerste beeld: ${hk.length} tekenbeurten, ${hk.filter(h => h.w === h.vol).length} op volle breedte, de eerste ${hk[0] ? Math.round(hk[0].t - r2.valStart) : '?'} ms na de start`);
      /* gevoeligheid 2: na de vloer blijft 0042 zichtbaar staan (kruin én schoenen in de gloed), en de vellen gaan omhoog */
      t(!!ps && ps.kruin >= 10 && ps.schoen >= 6 && ps.naast <= 2,
        `${L}: 0042 blijft staan in de gloed van zijn kooltje (${ps ? ps.t : '?'} s, de vloer is weg): kruin ${ps ? ps.kruin : '?'} en schoenen ${ps ? ps.schoen : '?'} lichte pixels, naast de kooi ${ps ? ps.naast : '?'}`);
      t(!!pv && pv.velBoven >= 20 && pv.velOnder === 0,
        `${L}: de factuurvellen dwarrelen gewichtloos omhoog, in de kooi: ${pv ? pv.velBoven : '?'} vel-pixels boven de kooivloer, ${pv ? pv.velOnder : '?'} eronder (${pv ? pv.t : '?'} s)`);
      /* creatief 7: de lift houdt halt op 2 KANTOORTUIN (je stoel draait nog) */
      const eT = k => { const e = r2.val.find(v => v.naam === 'etage' && v.arg === k); return e ? e.t / 1000 : NaN; };
      const g12 = eT(2) - eT(1), g23 = eT(3) - eT(2);
      t(g23 >= g12 + 0.2, `${L}: de lift houdt halt op 2 KANTOORTUIN: ${g23.toFixed(2)} s tussen het doven van 3 en 2 (tussen 4 en 3: ${g12.toFixed(2)} s)`);
      /* creatief 6: de brom van motor en kabels valt stil met de kooi-tl; een verre donder bij de bliksem; het hek vergrendelt */
      const evN = n => r2.val.find(v => v.naam === n);
      const pkBij = (e, f) => e ? r2.pk.find(p => p.t >= e.t - 1 && p.t <= e.t + 60 && f(p)) : null;
      const bromAan = pkBij(evN('vertrek'), p => p.k === 'brom' && p.a === '[true]'), bromUit = pkBij(tl, p => p.k === 'brom' && p.a === '[false]');
      const donder = pkBij(evN('bliksem'), p => p.k === 'sfx' && p.a === '["bliksem"]'), grendel = pkBij(evN('hek'), p => p.k === 'sfx' && p.a === '["hek"]');
      const bromLaatst = r2.pk.filter(p => p.k === 'brom').pop();
      t(!!bromAan && bromAan.r === true && !!bromUit && !!donder && donder.r === true && !!grendel && grendel.r === true && !!bromLaatst && bromLaatst.a === '[false]',
        `${L}: de klank van de lift: brom aan bij het vertrek (${bromAan ? 'ja' : 'NEE'}), stil met de kooi-tl (${bromUit ? 'ja' : 'NEE'}); verre donder bij de bliksem (${donder ? 'ja' : 'NEE'}); het slot van het hek (${grendel ? 'ja' : 'NEE'}); na de val geen brom meer (${bromLaatst ? bromLaatst.a : '-'})`);
      const sp = await page.evaluate(() => window.__spiegel);
      const moet = [/EEN OGENBLIKJE/, /BLIJF EVEN AAN DE LIJN/, /UW OPROEP IS BELANGRIJK/, /^VERBINDING VERBROKEN$/, /DE VLOER IS EEN VERONDERSTELLING/, /VOOR HET EERST IN VIJFENTWINTIG JAAR/];
      t(moet.every(re => sp.some(s => re.test(s))), `${L}: de spiegel (aria-live) zegt alles wat het canvas zegt: ${sp.map(s => '"' + s.slice(0, 28) + '"').join(' → ')}`);
      const s = await stand(page);
      t(s.acN === 1, `${L}: precies 1 AudioContext (${s.acN})`);
      t(page.__f.length === 0, `${L}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
      const miss = page.__404.filter(p => !/rest\/v1|supabase|favicon/.test(p));
      t(miss.length === 0, `${L}: geen 404's` + (miss.length ? ' — ' + miss.slice(0, 5).join(', ') : ''));
      await ctx.close();
    }

    /* 11b · sprong bij CPU x4: ≥ 50 fps mediaan; de knop −∞ licht op en wacht op jou */
    for (const vp of [VPS.laptop, VPS.liggend, VPS.staand]) {
      const L = 'val x4 ' + vp.n;
      kop(`11b · ${L} · sprong, CPU-throttling x4 (CDP): fps, lite-bewaker, de knop −∞`);
      const { ctx, page } = await open(browser, vp, { opslag: { slaylit_proloog_v3: valSave('gesprongen') }, geenNudge: true });
      await r2Spion(page, { zonderCanvas: true });
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await klikNieuw(page, vp);
      t(await wachtScene(page, 'breekpunt/val', 8000), `${L}: hervat in de val`);
      const knopNa = await wachtOp(page, () => { const R = document.getElementById('scherm-proloog').shadowRoot; const k = R && R.querySelector('.val-knop'); return !!k; }, 16000);
      await slaap(1800);   /* de knop wacht: geen B.A.A.S. die drukt als je sprong */
      const r2 = await r2Lees(page);
      const fr = r2.frames.slice(1), d = [];
      for (let i = 1; i < fr.length; i++) d.push(fr[i] - fr[i - 1]);
      d.sort((a, b) => a - b);
      const med = d.length ? 1000 / d[d.length >> 1] : 0;
      const vv = valVenster(r2);
      const liteM = await sr(page, `const v = R.querySelector('.fase-val'); return v ? (v.dataset.valLite || null) : 'weg';`);
      t(d.length > 300 && med >= 50, `${L}: mediaan ${med.toFixed(1)} fps over ${d.length} beelden van de val (≥ 50); de fps-bewaker: ${liteM === null ? 'niet nodig' : 'lite (' + liteM + ')'}`);
      const knop = r2.val.find(v => v.naam === 'knop');
      const kT = knop && vv ? (knop.t - vv.t0) / 1000 : null;
      t(knopNa >= 0 && kT !== null && Math.abs(kT - 11.2) <= 0.4, `${L}: de knop −∞ licht op na ${kT === null ? '?' : kT.toFixed(2)} s (11,2 ± 0,4)`);
      const nog = await scene(page);
      const baas = r2.val.some(v => v.naam === 'baasDrukt') ? await sr(page, `const k = R.querySelector('.val-knop'); return k ? k.classList.contains('ingedrukt') : null;`) : false;
      t(nog === 'breekpunt/val' && baas === false, `${L}: wie sprong, drukt zelf: 1,8 s na de knop nog in de val ("${nog}"), de knop niet ingedrukt (${baas})`);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      /* fixer R2: de gevallen foto ligt NAAST de knop −∞ (niet half eronder): de heldere foto-pixels
         links van de knop, omgerekend naar het scherm, liggen buiten de knop en zijn ring van 5 px */
      const foto = await page.evaluate(() => {
        const R = document.getElementById('scherm-proloog').shadowRoot, c = R.querySelector('.val-scherm'), k = R.querySelector('.val-knop');
        if (!c || !k) return null;
        const cr = c.getBoundingClientRect(), kr = k.getBoundingClientRect(), S = cr.width / c.width;
        const kx = kr.left + kr.width / 2, ky = kr.top + kr.height / 2, straal = k.offsetWidth / 2 + 5;
        const cx = Math.round((kx - cr.left) / S), cy = Math.round((ky - cr.top) / S);
        const W = c.width, H = c.height, d = c.getContext('2d').getImageData(0, 0, W, H).data;
        let n = 0, vrij = 0;
        for (let y = Math.max(0, cy - 14); y < Math.min(H, cy + 14); y++) for (let x = Math.max(0, cx - 44); x < Math.min(W, cx); x++) {
          const i = (y * W + x) * 4;
          if (Math.min(d[i], d[i + 1], d[i + 2]) < 170) continue;
          n++;
          if (Math.hypot(cr.left + (x + 0.5) * S - kx, cr.top + (y + 0.5) * S - ky) > straal) vrij++;
        }
        return { n, vrij, straal: Math.round(straal), S: +S.toFixed(2) };
      });
      t(!!foto && foto.n >= 15 && foto.vrij >= 0.9 * foto.n,
        `${L}: de gevallen foto ligt naast de knop −∞, niet eronder: ${foto ? foto.vrij + '/' + foto.n : '?'} foto-pixels buiten de knop (straal ${foto ? foto.straal : '?'} px met ring, schaal ${foto ? foto.S : '?'})`);
      await sonde(page, `${L} de liftknop −∞`);
      await tik(page, vp, '.val-knop');
      t(await wachtScene(page, 'breekpunt/afgrond', 4000), `${L}: zelf ingedrukt → de Afgrond`);
      const s = await stand(page);
      t(s.acN === 1 && page.__f.length === 0, `${L}: 1 AudioContext (${s.acN}), geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
      await cdp.detach().catch(() => {});
      await ctx.close();
    }

    /* 11c · reduced motion (laptop): korter en statischer, maar leesbaar */
    {
      const vp = VPS.laptop, L = 'val rustig';
      kop(`11c · ${L} · reduced motion: korter/statischer, nog altijd leesbaar`);
      const { ctx, page } = await open(browser, vp, { rustig: true, opslag: { slaylit_proloog_v3: valSave('geduwd') }, geenNudge: true });
      await r2Spion(page);
      await volgSpiegel(page);
      await klikNieuw(page, vp);
      t(await wachtScene(page, 'breekpunt/val', 6000), `${L}: hervat in de val`);
      await wachtOp(page, () => { const R = document.getElementById('scherm-proloog').shadowRoot; const a = R && R.getElementById('pl-app'); return !!a && a.dataset.fase === 'afgrond'; }, 18000);
      await slaap(500);
      const r2 = await r2Lees(page);
      const vv = valVenster(r2);
      const duur = vv && vv.t1 !== null ? (vv.t1 - vv.t0) / 1000 : null;
      t(duur !== null && duur >= 11.5 && duur <= 12.9, `${L}: de rustige val duurt ${duur === null ? '?' : duur.toFixed(2)} s (mag korter, ≤ 12,9)`);
      const sp = await page.evaluate(() => window.__spiegel);
      t([/EEN OGENBLIKJE/, /^VERBINDING VERBROKEN$/, /DE VLOER IS EEN VERONDERSTELLING/, /VOOR HET EERST IN VIJFENTWINTIG JAAR/].every(re => sp.some(s => re.test(s))),
        `${L}: nog altijd leesbaar: ${sp.length} berichten (${sp.map(s => s.slice(0, 16)).join(' · ')})`);
      toetsKlankVal(r2, L);
      toetsVerbinding(r2, L);
      toetsSprite(r2, L);
      t(page.__f.length === 0, `${L}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
      await ctx.close();
    }

    /* 11d · lite waar de game hem aanzet: zwakke hardware (2 kernen) → body.lite → de val lite vanaf het eerste beeld */
    {
      const vp = VPS.liggend, L = 'val lite (zwak toestel)';
      kop(`11d · ${L} · hardwareConcurrency 2 → de game zet lite aan → de val volgt`);
      const { ctx, page } = await open(browser, vp, { zwak: true, opslag: { slaylit_proloog_v3: valSave('geduwd') }, geenNudge: true });
      const game = await page.evaluate(() => ({ lite: document.body.classList.contains('lite'), kernen: navigator.hardwareConcurrency }));
      await r2Spion(page);
      await volgSpiegel(page);
      await klikNieuw(page, vp);
      t(await wachtScene(page, 'breekpunt/val', 6000), `${L}: hervat in de val`);
      await slaap(400);
      const m = await page.evaluate(() => {
        const R = document.getElementById('scherm-proloog').shadowRoot, v = R.querySelector('.fase-val'), sc = R.querySelector('.val-scan');
        return { host: R.host.hasAttribute('data-lite'), val: v && v.dataset.valLite, fx: OutroFX.isLite(), scan: sc ? sc.hidden : null, handle: window.__r2.valLite };
      });
      t(game.lite && game.kernen === 2 && m.host && m.val === 'instelling' && m.fx && m.scan === true && m.handle === true,
        `${L}: ${game.kernen} kernen → body.lite ${game.lite} → host data-lite ${m.host} → de val lite vanaf beeld 1 (data-val-lite "${m.val}", OutroFX lite ${m.fx}, scanlines verborgen ${m.scan})`);
      await wachtOp(page, () => { const R = document.getElementById('scherm-proloog').shadowRoot; const a = R && R.getElementById('pl-app'); return !!a && a.dataset.fase === 'afgrond'; }, 18000);
      await slaap(500);
      const r2 = await r2Lees(page);
      const vv = valVenster(r2);
      const duur = vv && vv.t1 !== null ? (vv.t1 - vv.t0) / 1000 : null;
      const sp = await page.evaluate(() => window.__spiegel);
      t(duur !== null && duur >= 11.5 && duur <= 12.9 && [/^VERBINDING VERBROKEN$/, /DE VLOER IS/, /VOOR HET EERST/].every(re => sp.some(s => re.test(s))),
        `${L}: lite is ook rustig: ${duur === null ? '?' : duur.toFixed(2)} s, leesbaar (${sp.length} berichten)`);
      toetsVerbinding(r2, L);
      t(page.__f.length === 0, `${L}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
      await ctx.close();
    }

    /* 11e · de fps-bewaker onder zware last (laptop, CPU x16): de val schakelt zelf naar lite */
    {
      const vp = VPS.laptop, L = 'val bewaker';
      kop(`11e · ${L} · CPU x16: de fps-bewaker zet de lichtmotor op lite`);
      const { ctx, page } = await open(browser, vp, { opslag: { slaylit_proloog_v3: valSave('geduwd') }, geenNudge: true });
      await r2Spion(page, { zonderCanvas: true });
      await klikNieuw(page, vp);
      t(await wachtScene(page, 'breekpunt/val', 6000), `${L}: hervat in de val`);
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 16 });
      const w = await wachtOp(page, () => { const R = document.getElementById('scherm-proloog').shadowRoot; const v = R && R.querySelector('.fase-val'); return !!v && v.dataset.valLite === 'fps'; }, 10000);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const fx = await page.evaluate(() => OutroFX.isLite());
      t(w >= 0 && fx, `${L}: onder zware last schakelt de val naar lite (data-val-lite "fps" na ${w} ms, OutroFX lite ${fx}), zoals de outro met haar fps-bewaker`);
      await cdp.detach().catch(() => {});
      await ctx.close();
    }

    /* 11f · fixer R2: echte telefoons met browserbalken (DPR 3). De schaal is een geheel aantal FYSIEKE
       pixels per pixel: nooit meer 1x (320x180 css-px, een postzegel) op een telefoon */
    for (const vp of [{ n: 'iphone-liggend', w: 750, h: 340, m: true }, { n: 'android-staand', w: 360, h: 560, m: true }]) {
      const L = 'val ' + vp.n + ' DPR 3';
      kop(`11f · ${L} ${vp.w}x${vp.h} · de schaal in fysieke pixels`);
      const { ctx, page } = await open(browser, vp, { dpr: 3, opslag: { slaylit_proloog_v3: valSave('geduwd') }, geenNudge: true });
      await r2Spion(page, { zonderCanvas: true });
      await klikNieuw(page, vp);
      t(await wachtScene(page, 'breekpunt/val', 6000), `${L}: hervat in de val`);
      await slaap(1200);
      const m = await sr(page, `const c = R.querySelector('.val-scherm'), s = R.querySelector('.val-scan'), b = c.getBoundingClientRect();
        return { cw: c.width, ch: c.height, r: [b.left, b.top, b.width, b.height], dpr: devicePixelRatio, scan: s.hidden, lijn: parseFloat(s.style.getPropertyValue('--val-lijn')) };`);
      const fys = m.r[2] * m.dpr / m.cw, fysH = m.r[3] * m.dpr / m.ch;
      t(m.r[2] >= 1.5 * m.cw && Math.abs(fys - Math.round(fys)) < 0.02 && Math.abs(fysH - Math.round(fys)) < 0.02 && m.r[0] >= -0.5 && m.r[0] + m.r[2] <= vp.w + 0.5 && m.r[1] >= -0.5 && m.r[1] + m.r[3] <= vp.h + 0.5,
        `${L}: het liftcanvas ${m.cw}x${m.ch} op [${m.r.map(v => v.toFixed(1)).join(', ')}] css-px: ${(m.r[2] / m.cw).toFixed(2)}x (≥ 1,5x; was 1x) = ${fys.toFixed(2)} fysieke px per pixel (geheel: scherp), binnen het scherm`);
      t(m.scan === false && Math.abs(m.lijn * m.dpr - 1) < 0.02, `${L}: de scanlines blijven (vanaf 3 fysieke px per pixel), één fysieke pixel dik (${(m.lijn * m.dpr).toFixed(2)})`);
      await shot(page, `${vp.n}-val-dpr3`);
      t(page.__f.length === 0, `${L}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
      await ctx.close();
    }

    /* 11g · fixer R2: de klank-randjes van de val — een verborgen tab pauzeert klok én klank; klank uit
       en weer aan rond −7 geeft de vaste noot terug; een dichte context bij de stilte hangt de lijn
       toch op; wie in de stilte overslaat, hoort de Afgrond meteen */
    {
      const vp = VPS.laptop, L = 'val klank-randjes';
      kop(`11g · ${L} · verborgen tab, klank uit/aan rond −7, dichte context bij de stilte, skip in de stilte`);
      let { ctx, page } = await open(browser, vp, { opslag: { slaylit_proloog_v3: valSave('geduwd') }, geenNudge: true });
      await r2Spion(page, { zonderCanvas: true });
      await klikNieuw(page, vp);
      t(await wachtScene(page, 'breekpunt/val', 6000), `${L}: hervat in de val`);
      const verberg = v => page.evaluate(aan => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => aan });
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (aan ? 'hidden' : 'visible') });
        document.dispatchEvent(new Event('visibilitychange'));
      }, v);
      const lees = () => page.evaluate(() => ({ vt: window.__r2.handle.t, st: Klank.wacht.stand, klok: Klank.koppel().ctx.currentTime }));
      await valOp(page, 2.5);
      await verberg(true);
      await slaap(300);
      const a = await lees();
      await slaap(1500);
      const b = await lees();
      const pz = await page.evaluate(() => window.__r2.pk.filter(p => p.k === 'pauzeer').map(p => p.a + '=' + p.r));
      t(Math.abs(b.vt - a.vt) < 0.05 && a.st.pauze === true && b.st.pauze === true && b.st.actief === true && pz[0] === '[true]=true',
        `${L}: tab verborgen → de klok staat stil (${a.vt.toFixed(3)} → ${b.vt.toFixed(3)} s in 1,5 s) en de wachtmuziek ook (pauze ${b.st.pauze}, de lijn blijft: ${b.st.actief}; ProloogKlank.pauzeer ${pz.join(', ')}; audioklok +${(b.klok - a.klok).toFixed(2)} s)`);
      await verberg(false);
      await slaap(400);
      const c = await lees();
      t(c.st.pauze === false && c.st.actief === true && c.vt > b.vt + 0.2, `${L}: weer zichtbaar → klok en wacht lopen verder (pauze ${c.st.pauze}, de val op ${c.vt.toFixed(2)} s)`);
      /* klank uit vóór −7 (±6,87 s), weer aan erna: vasteNoot() speelde niets zolang de klank uit stond */
      await valOp(page, 6.5);
      await page.evaluate(() => Klank.zet('aan', false));
      await valOp(page, 7.3);
      const m1 = await page.evaluate(() => Klank.wacht.stand);
      await page.evaluate(() => Klank.zet('aan', true));
      await slaap(150);
      const m2 = await page.evaluate(() => Klank.wacht.stand);
      t(m1.vast === true && m1.toon === -7 && m1.vastKlinkt === false && m2.vastKlinkt === true && m2.actief === true,
        `${L}: klank uit vóór −7 en weer aan erna → de vaste noot klinkt weer (voor het aanzetten ${m1.vastKlinkt}, erna ${m2.vastKlinkt}; stand ${JSON.stringify(m2)})`);
      /* een dichte context (iOS na backgrounden) op het moment van de stilte */
      await valOp(page, 8.3);
      await page.evaluate(() => Klank.koppel().ctx.suspend());
      await valOp(page, 9.2);
      const s1 = await page.evaluate(() => ({ st: Klank.wacht.stand, ctx: Klank.koppel().ctx.state, stil: window.__r2.klank.filter(k => k.k === 'stilte').map(k => k.r) }));
      await page.evaluate(() => Klank.koppel().ctx.resume());
      t(s1.ctx === 'suspended' && s1.stil.length === 1 && s1.stil[0] === false && s1.st.actief === false,
        `${L}: bij een dichte context (${s1.ctx}) hangt de stilte de lijn toch op: Klank.stilte → ${s1.stil.join(',')}, de wacht daarna actief: ${s1.st.actief}`);
      await wachtOp(page, inAfgrond, 8000);
      t(page.__f.length === 0, `${L}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
      await ctx.close();
      /* skip in de stilte: de Afgrond hoeft niet op het einde van de stilte te wachten */
      ({ ctx, page } = await open(browser, vp, { opslag: { slaylit_proloog_v3: valSave('geduwd') }, geenNudge: true }));
      await r2Spion(page, { zonderCanvas: true });
      await klikNieuw(page, vp);
      t(await wachtScene(page, 'breekpunt/val', 6000), `${L}: opnieuw hervat in de val`);
      await valOp(page, 9.05);
      const voor = await page.evaluate(() => Klank.stil);
      await houdSkip(page, vp, 950);
      const naar = await wachtOp(page, inAfgrond, 3000);
      await slaap(250);
      const s2 = await page.evaluate(() => ({ stil: Klank.stil, weg: window.__r2.klank.filter(k => k.k === 'stilteWeg').map(k => k.r), vt: window.__r2.handle.t }));
      t(voor === true && naar >= 0 && s2.weg.indexOf(true) !== -1 && s2.stil === false,
        `${L}: skip in de stilte (de val op ${s2.vt.toFixed(2)} s) → de Afgrond klinkt meteen: de stilte liep (${voor}), Klank.stilteWeg → ${s2.weg.join(',') || '-'}, 250 ms later nog stil: ${s2.stil}`);
      t(page.__f.length === 0, `${L}: geen paginafouten (skip)` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
      await ctx.close();
    }

    /* 11h · slot R2: de inkeer na −∞. Na het drukken trekt het licht zich terug in het kooltje
       (randlicht, foto, knop), zodat er op de snit naar de Afgrond alleen het kooltje staat —
       0042 verdwijnt niet meer in één beeld. Echte tijd; per beeld het licht op het canvas
       buiten het kooltje (> 14 px) en erbij (< 5 px), via een eigen kopie (geen readback-waarschuwing). */
    for (const r of [{ vp: VPS.laptop, pad: 'gesprongen' }, { vp: VPS.liggend, pad: 'geduwd' }]) {
      const vp = r.vp, L = 'val inkeer ' + vp.n + ' ' + (r.pad === 'geduwd' ? 'geduwd' : 'sprong');
      kop(`11h · ${L} · na −∞ trekt het licht zich terug in het kooltje, dan pas de snit`);
      const { ctx, page } = await open(browser, vp, { opslag: { slaylit_proloog_v3: valSave(r.pad) }, geenNudge: true });
      await r2Spion(page, { zonderCanvas: true });
      await klikNieuw(page, vp);
      t(await wachtScene(page, 'breekpunt/val', 6000), `${L}: hervat in de val`);
      await valOp(page, 11.35);
      await page.evaluate(() => {
        const ik = window.__ik = { s: [], druk: null };
        const kopie = document.createElement('canvas'), kx = kopie.getContext('2d', { willReadFrequently: true });
        const lus = () => {
          const h = document.getElementById('scherm-proloog'), R = h && h.shadowRoot;
          const c = R && R.querySelector('.val-scherm'), laag = R && R.querySelector('.val-laag');
          if (!c || !window.__r2.handle) { ik.klaar = true; return; }
          if (ik.druk == null && laag && laag.classList.contains('ingedrukt')) ik.druk = performance.now();
          kopie.width = c.width; kopie.height = c.height; kx.drawImage(c, 0, 0);
          const d = kx.getImageData(0, 0, c.width, c.height).data, k = window.__r2.handle.kooltje(), b = c.getBoundingClientRect();
          const px = (k.x - b.left) * c.width / b.width, py = (k.y - b.top) * c.height / b.height;
          let bu = 0, nb = 0, bi = 0, ni = 0;
          for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
            const i = (y * c.width + x) * 4, lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2], af = Math.hypot(x - px, y - py);
            if (af > 14) { bu += lum; nb++; } else if (af < 5) { bi += lum; ni++; }
          }
          const hg = R.querySelector('.val-hanger');
          ik.s.push({ t: performance.now(), buiten: bu / nb, kool: bi / ni, knop: hg ? +getComputedStyle(hg).opacity : 0 });
          requestAnimationFrame(lus);
        };
        requestAnimationFrame(lus);
      });
      await slaap(250);
      if (r.pad === 'gesprongen') await page.locator('#scherm-proloog .val-knop').click();
      t(await wachtOp(page, inAfgrond, 4000) >= 0, `${L}: de Afgrond volgt`);
      const ik = await page.evaluate(() => window.__ik);
      const voor = ik.s.filter(s => ik.druk != null && s.t < ik.druk).pop(), na = ik.s.filter(s => ik.druk != null && s.t >= ik.druk), eind = na[na.length - 1];
      t(!!voor && !!eind && eind.t - ik.druk >= 350 && eind.buiten <= 0.5 * voor.buiten && eind.knop < 0.1 && eind.kool > 40,
        `${L}: het laatste valbeeld (${eind ? Math.round(eind.t - ik.druk) : '?'} ms na het drukken, ${na.length} beelden): licht buiten het kooltje ${voor ? voor.buiten.toFixed(2) : '?'} → ${eind ? eind.buiten.toFixed(2) : '?'} (≤ de helft), de knop op opacity ${eind ? eind.knop.toFixed(2) : '?'} (< 0,1), het kooltje brandt nog (${eind ? eind.kool.toFixed(0) : '?'} > 40)`);
      await shot(page, `${vp.n}-inkeer-afgrond`);
      t(page.__f.length === 0, `${L}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
      await ctx.close();
    }
  }

  /* ==========================================================================
     12 · R2 · DE OUTRO (keuze 5): de intro hervat de wachtmuziek op −7 en buigt omhoog; de
          reünie citeert de Kolendruïde; de maskerzinnen hebben één bron
     ========================================================================== */
  if (doe('outro')) {
    const vp = VPS.laptop, L = 'outro';
    kop('12 · ' + L + ' · de wacht hervat, IK HEB HET LICHT NOG., één bron voor de maskerzinnen');
    const contract = { v: 2, jeugddroom: 'astronaut', uitweg: 'sprong', held: 'thoverk', masker: 'vlucht', glimlachen: 3, fotoKantoor: true, zelfGestempeld: false, wachtToon: -7, echo: 0 };
    const { ctx, page } = await open(browser, vp, { opslag: { slayit_proloog: JSON.stringify(contract), slayit_proloog_klaar: '1' }, geenNudge: true });
    await r2Spion(page, { zonderCanvas: true });
    await page.mouse.click(5, 5);   /* een gebaar: de AudioContext mag spelen */
    await slaap(200);
    const voorOutro = await page.evaluate(() => typeof SLAYLIT_PROLOOG === 'undefined');
    await page.evaluate(() => devOutro());
    await slaap(1400);
    const o = await page.evaluate(() => ({ h: window.__r2.klank.filter(k => k.k === 'hervat'), stand: Klank.wacht.stand, scherm: document.body.dataset.scherm, staat: Outro._staat, reunie: OutroFX.REUNIE }));
    const h = o.h[0];
    t(o.h.length === 1 && h.a === '[7,{"buig":true}]' && h.r === true && o.stand.actief === true && o.stand.toon === 0,
      `${L}: de outro-intro haalt je uit de wacht: ${o.h.length}x Klank.wachtHervat${h ? h.a : '(niet)'} → de lijn loopt (${o.stand.actief}) en buigt naar ${o.stand.toon} (staat "${o.staat}")`);
    t(voorOutro, `${L}: de outro heeft de proloog niet nodig (SLAYLIT_PROLOOG niet geladen: ${voorOutro})`);
    t(o.reunie.thoverk === '"IK HEB HET LICHT NOG."' && o.reunie.slachter === '"NU IS HET HUN BEURT."' && o.reunie.gifmagier === '"WE PASSEN ONS AAN. ZOALS ALTIJD."',
      `${L}: de reünie citeert de kern van de maskerzinnen: ${JSON.stringify(o.reunie)}`);
    await page.evaluate(() => Outro.slaOver());
    await slaap(900);
    const na = await page.evaluate(() => Klank.wacht.stand);
    t(na.actief === false, `${L}: na de outro zwijgt de wacht (${JSON.stringify(na)})`);
    /* één bron: de Afgrond leest dezelfde zinnen als de reünie (OutroFX.MASKERZINNEN) */
    await page.evaluate(() => laadProloog());
    await wachtOp(page, () => typeof SLAYLIT_PROLOOG !== 'undefined' && typeof SLAYLIT_PROLOOG.maskerZin === 'function', 6000);
    const z = await page.evaluate(() => {
      const M = OutroFX.MASKERZINNEN, Z = SLAYLIT_PROLOOG.maskerZin;
      const voor = { woede: Z('woede', 'x'), gif: Z('gif', 'x'), vlucht: Z('vlucht', 'astronaut'), zonder: Z('vlucht', ''), onbekend: Z('bestaat-niet', 'x') };
      M.thoverk.kern = 'PROEF.';   /* wijzig de bron → de Afgrond volgt */
      const na = Z('vlucht', 'astronaut');
      M.thoverk.kern = 'Ik heb het licht nog.';
      return { voor, na };
    });
    t(z.voor.woede === 'Genoeg geglimlacht. Nu is het hún beurt.' && z.voor.gif === 'We passen ons aan. Zoals altijd.' && z.voor.vlucht === 'Ik wou astronaut worden. Ik heb het licht nog.' && z.voor.zonder === 'Ik wou ooit iets worden. Ik heb het licht nog.' && z.voor.onbekend === '' && z.na === 'Ik wou astronaut worden. PROEF.',
      `${L}: één bron: de Afgrond leest OutroFX.MASKERZINNEN (${JSON.stringify(z.voor)}; bron gewijzigd → "${z.na}")`);
    t(page.__f.length === 0, `${L}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
    await ctx.close();
  }

  /* ==========================================================================
     8 · STATISCH: wat R1 wegnam, blijft weg (grep op de bronnen)
     ========================================================================== */
  if (doe('statisch')) {
    kop('8 · statisch (bronnen)');
    const lees = p => fs.readFileSync(path.join(WORKTREE, p), 'utf8');
    const pjs = lees('proloog/proloog.js'), pcss = lees('proloog/proloog.css'), stub = lees('proloog/index.html'), sw = lees('sw.js'), idx = lees('index.html'), fcss = lees('assets/fonts/fonts.css');
    const code = pjs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    t(!/location\.href|DOMContentLoaded|proloog-nav|knop-daalaf|knop-skip/.test(code), `proloog.js: geen location.href, DOMContentLoaded, #proloog-nav, DAAL AF of 'Rechtstreeks afdalen'-knop meer`);
    const pcssCode = pcss.replace(/\/\*[\s\S]*?\*\//g, '');
    t(!/@font-face/.test(pcssCode) && /:host\s*\{[^}]*all:\s*initial/.test(pcssCode), `proloog.css: geen @font-face (shadow root negeert die) en :host { all: initial }`);
    t(/font-family:\s*'VT323'/.test(fcss), `assets/fonts/fonts.css: VT323 staat in het document`);
    const pau = lees('proloog/audio.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    t(!/new\s+(window\.)?(webkit)?AudioContext|slaylit_audio_mute/.test(pau) && /Klank\.koppel|K\.koppel/.test(pau), `proloog/audio.js: geen eigen AudioContext en geen eigen mute-sleutel; een laag op Klank.koppel()`);
    t(/location\.replace\(['"]\.\.\/\?proloog=1['"]\)/.test(stub) && /<noscript>/.test(stub), `proloog/index.html is een stub: location.replace('../?proloog=1') + noscript`);
    t(['js/proloog-brug.js', 'proloog/proloog.js', 'proloog/data.js', 'proloog/audio.js', 'proloog/proloog.css', 'assets/fonts/fonts.css'].every(f => sw.indexOf("'" + f + "'") !== -1), `sw.js: de brug, de proloogbestanden en fonts.css staan in de cache-lijsten`);
    t(/id="scherm-proloog"/.test(idx) && /id="proloog-sluier"/.test(idx) && /js\/proloog-brug\.js/.test(idx) && !/location\.href='proloog\//.test(idx), `index.html: #scherm-proloog, #proloog-sluier en de brug; geen location.href naar proloog/ meer`);
    /* F1-reviewfixes die statisch te bewaken zijn */
    const scss = lees('css/style.css'), mob = lees('css/mobiel.css'), brug = lees('js/proloog-brug.js');
    t(!/@keyframes\s+plAdem\b/.test(scss) && /@keyframes\s+plSluierAdem\b/.test(scss) && /@keyframes\s+plAdem\b/.test(pcss),
      `@keyframes plAdem bestaat maar één keer (proloog.css); de sluier ademt op plSluierAdem (style.css)`);
    t(!/\bconst esc\s*=/.test(brug), `js/proloog-brug.js: de dode helper esc() is weg`);
    const naad = mob.indexOf('DE NAAD (proloog R1)'), drempel = mob.indexOf('G. DE DREMPELTAFEL');
    t(naad > 0 && drempel > naad, `css/mobiel.css: het proloogblok staat vóór de Drempeltafel, niet onderaan (de finale-tak voegt daar toe; geen mergeconflict)`);
    t(/:host\(\[data-lite\]\)\s*\.crt-laag/.test(pcss) && /toggleAttribute\('data-lite'/.test(pjs), `proloog: body.lite wordt gespiegeld als data-lite op de host, en :host([data-lite]) zet de CRT-lagen stil`);
    /* R2 · de val en de klank */
    const proloogDir = path.join(WORKTREE, 'proloog');
    const pBestanden = fs.readdirSync(proloogDir).filter(f => fs.statSync(path.join(proloogDir, f)).isFile());
    const verboden = pBestanden.filter(f => /OPGEHANGEN|Rechtstreeks afdalen/i.test(fs.readFileSync(path.join(proloogDir, f), 'latin1')));
    t(verboden.length === 0, `proloog/* (${pBestanden.length} bestanden): 'OPGEHANGEN' en 'Rechtstreeks afdalen' komen nergens meer voor` + (verboden.length ? ' — in ' + verboden.join(', ') : ''));
    const vjs = lees('proloog/val.js'), vcode = vjs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    t(!/Klank|AudioContext|createOscillator|createGain|SLAYLIT_AUDIO/.test(vcode) && /bij\(/.test(vcode), `proloog/val.js schrijft geen audio-code: hij meldt zijn momenten (opts.bij), proloog.js zet ze om in klank`);
    const pcode = pjs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const kAanroepen = (pcode.match(/ProloogKlank/g) || []).length, kGuard = /function klank\(naam, \.\.\.args\) \{\s*const K = window\.ProloogKlank;\s*if \(!K \|\| typeof K\[naam\] !== 'function'\) return;/.test(pcode);
    t(kAanroepen === 1 && kGuard, `proloog.js roept ProloogKlank alleen via de guard klank() aan (${kAanroepen} verwijzing, guard ${kGuard})`);
    const ojs = lees('js/outro.js'), fxjs = lees('js/outro-fx.js');
    const eenRegel = ['const KLIMAAT = OutroFX.KLIMAAT;', 'const ETAGE_NR = OutroFX.ETAGE_NR;', 'const tekst = OutroFX.tekst;', 'const tekstBreedte = OutroFX.tekstBreedte;', 'const MASKER_REGEL = OutroFX.REUNIE;'];
    t(eenRegel.every(r => ojs.indexOf(r) !== -1) && !/const FONT\s*=\s*\{/.test(ojs) && !/const KLIMAAT\s*=\s*\[/.test(ojs) && !/ETAGE_NR\s*=\s*\['-1'/.test(ojs),
      `js/outro.js: KLIMAAT, ETAGE_NR, het pixelfont en de reüniezinnen als OutroFX-exports, één regel per constante (geen eigen kopie meer)`);
    t(/const FONT = \{/.test(fxjs) && /const KLIMAAT = \[/.test(fxjs) && /const ETAGE_NR = \['-1', '2', '3', '4', 'DAK'\]/.test(fxjs) && /KLIMAAT, ETAGE_NR, FONT, tekst, tekstBreedte, MASKERZINNEN, REUNIE/.test(fxjs),
      `js/outro-fx.js: KLIMAAT, ETAGE_NR (['-1','2','3','4','DAK']), FONT + tekst/tekstBreedte en de maskerzinnen staan hier en worden geëxporteerd`);
    t(/const sleutel = naam \+ hoog \+ 'x' \+ W;/.test(fxjs), `js/outro-fx.js: de luchtCache heeft W in de sleutel (de val bakt ook op 180 breed)`);
    t(!/VUURTJE NODIG/.test(ojs + fxjs) && /IK HEB HET LICHT NOG|Ik heb het licht nog/.test(fxjs) && !/Ik heb het licht nog/.test(lees('proloog/data.js')),
      `de reünie citeert "IK HEB HET LICHT NOG." (niet meer "VUURTJE NODIG? FLAME!"); de zin staat alleen in js/outro-fx.js, niet in proloog/data.js`);
    t(/Klank\.wachtHervat\(/.test(ojs) && /window\.Klank && Klank\.wachtHervat/.test(ojs), `js/outro.js: Outro.start hervat de wachtmuziek (Klank.wachtHervat), achter een guard`);
    t(sw.indexOf("'proloog/val.js'") !== -1 && /BRONNEN = \[[^\]]*'proloog\/val\.js'/.test(brug) && sw.indexOf("'js/outro-fx.js'") !== -1,
      `sw.js en de brug kennen proloog/val.js (BESTANDEN, BRONNEN); js/outro-fx.js staat in BESTANDEN`);
    const vbData = (lees('proloog/data.js').match(/VERBINDING VERBROKEN/g) || []).length;
    const dcode = lees('proloog/data.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    t((dcode.match(/'VERBINDING VERBROKEN'/g) || []).length === 1, `proloog/data.js: 'VERBINDING VERBROKEN' staat er als tekst precies één keer (de meter-LED van de val; ${vbData} vermeldingen incl. commentaar)`);
  }

  await browser.close();
  console.log(`\n============================================\nSAMENVATTING PROLOOG R1+R2: ${ok} ok, ${fout} FOUT  (${Math.round((Date.now() - t00) / 1000)} s)\n============================================`);
  if (fout) { console.log(fouten.map(f => ' - ' + f).join('\n')); }
  process.exit(fout ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
