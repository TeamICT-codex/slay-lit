/* ============================================================================
   DE NISSEN DICHT (B1) — ACCEPTATIE
   De metgezellen zijn GEPARKEERD: `METGEZELLEN_AAN = false` in js/game.js, gelezen via
   `metgezellenAan()`. Deze suite bewijst dat er langs geen enkel pad nog een metgezel of een
   metgezel-tekst binnenkomt, dat een lopende run zijn metgezel netjes wegstuurt (één regel,
   één keer), dat de Codex-data bewaard blijft, en dat de DEV-schakelaar heen en terug werkt.
   Contract: .claude/notities/bazen_onderzoek/ontwerp/M_metgezel_parkering_plan.md §4.3.
   Elke regel toont de GEMETEN waarde.

   Draaien (vanuit de map waar playwright staat, bv. de scratchpad):
     NODE_PATH="$PWD/node_modules" SLAYIT_WORKTREE='C:\...\SLAY-IT-nissen' \
       SLAYIT_SHOTS="$PWD/nissen_shots" node "C:\...\SLAY-IT-nissen\tools\nissen_acceptatie.js"
   Geen server: route.fulfill vanaf schijf op localhost:4173, service workers geblokkeerd.
   Blokken filteren: SLAYIT_NISSEN=bron,scherven,doorloop,save,dev,builds,erfprins,beeld
   ============================================================================ */
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');

const WT = process.env.SLAYIT_WORKTREE || path.resolve(__dirname, '..');
const HOST = 'localhost:4173';
const UIT = process.env.SLAYIT_SHOTS || path.join(__dirname, 'nissen_shots'); fs.mkdirSync(UIT, { recursive: true });
const BLOKKEN = (process.env.SLAYIT_NISSEN || 'bron,scherven,doorloop,save,dev,builds,erfprins,beeld').split(',').map(s => s.trim());
const doe = b => BLOKKEN.includes(b);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.glb': 'model/gltf-binary' };
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
const slaap = ms => new Promise(r => setTimeout(r, ms));

let okN = 0, foutN = 0;
const t = (goed, tekst) => { if (goed) { okN++; console.log('   ok   ' + tekst); } else { foutN++; console.log('   FOUT ' + tekst); } };
const kop = s => console.log('\n== ' + s + ' ==');

/* wat een speler met de metgezellen geparkeerd NOOIT mag lezen (zichtbare tekst + data-tips) */
const VERBODEN = /metgezel|\bdrops\b|bondgenoot|\bhond\b|daalt deze run met je mee|\btrouw|poort had|vlamwacht|mosgeest|nissen zijn dichtgelast/i;
/* een scherftekst noemt geen vindplaats: dezelfde scherf valt uit een elite, een kist, een baas of de tafel */
const VINDPLAATS = /\bbaas\b|raadsel|geschenk|gevecht|\bfiguur\b|\belite\b|\bkist/i;
/* de metgezelsleutels van de Codex: nooit gewist, nooit bijgeschreven zolang de vlag uit staat */
const MG_SLEUTELS = ['metgezellen', 'gevallen', 'mysteries', 'copycatGebroken', 'sigOntdekt', 'dropsOfferRun', 'dropsZaadjeNul', 'drops_wit_keerde'];
/* inhoudelijk vergelijken NA de normalisatie die game.js al op module-niveau doet (r~275-281):
   dropsOfferRun numeriek, dropsZaadjeNul booleaans, lege lijsten/objecten — geen schrijfactie */
const normaliseer = c => {
  c = c || {};
  const lijst = x => (Array.isArray(x) ? x.slice().sort() : []);
  const obj = x => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  return JSON.stringify({
    metgezellen: lijst(c.metgezellen), gevallen: lijst(c.gevallen), mysteries: obj(c.mysteries),
    copycatGebroken: !!c.copycatGebroken, sigOntdekt: obj(c.sigOntdekt),
    dropsOfferRun: Math.max(0, +c.dropsOfferRun || 0), dropsZaadjeNul: !!c.dropsZaadjeNul, drops_wit_keerde: !!c.drops_wit_keerde
  });
};

/* de Codexen (M-plan §1): wie Drops al wekte, wie hem offerde, en de speler van vandaag */
const CODEX = {
  ontwaakt: { metgezellen: ['drops', 'vlamwachter'], gevallen: [], mysteries: { drops: { voltooid: true }, vlamwachter: { voltooid: true } },
    runs: 4, wins: 1, erfprinsOntmoetingen: 2, scherven: ['mosgeest_baas', 'drops_figuur', 'vlamwachter_episch'], relikwieen: [], dranken: [], opgeladen: [], gezien: [], copycatGebroken: true, sigOntdekt: { drops: true } },
  rouw: { metgezellen: ['drops', 'mosgeest'], gevallen: ['drops'], mysteries: { drops: { voltooid: true }, mosgeest: { voltooid: true } },
    runs: 4, wins: 1, dropsOfferRun: 1, erfprinsOntmoetingen: 2, scherven: ['mosgeest_baas'], relikwieen: [], dranken: [], opgeladen: [], gezien: [], copycatGebroken: true },
  nieuw: { metgezellen: [], gevallen: [], mysteries: {}, runs: 2, wins: 0, erfprinsOntmoetingen: 2, scherven: ['mosgeest_baas', 'mosgeest_figuur'], relikwieen: [], dranken: [], opgeladen: [], gezien: [] }
};

/* ============================================================================
   DE GREP-WACHT — een mini-lexer over de bron (strings, templates met ${}, commentaar,
   regex-literals). Elke string of template met een spatie die een metgezel noemt, moet in
   een functie staan waarvan we WETEN dat ze achter de vlag zit (of DEV is). Een nieuwe
   verwijzing ergens anders — ook in proloog/*.js — is FOUT: de bazen- en proloogrondes mogen
   er geen binnensmokkelen.
   ============================================================================ */
const WOORD = /metgezel|\bdrops\b|bondgenoot|\bhond\b|vlamwacht|mosgeest/i;
function literals(src) {
  const uit = [];
  let i = 0, regel = 1, vorige = '';
  const n = src.length;
  const stapel = [];   /* open templates: { start, regel, diepte, inExpr } */
  const leesString = q => {
    const start = regel; let s = ''; i++;
    while (i < n && src[i] !== q) {
      if (src[i] === '\\') { s += src[i] + (src[i + 1] || ''); i += 2; continue; }
      if (src[i] === '\n') { regel++; break; }
      s += src[i++];
    }
    i++;
    uit.push({ regel: start, tekst: s });
  };
  const leesTemplate = () => {   /* i staat NA de backtick, of na de sluitende } van ${...} */
    while (i < n) {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { i++; const tp = stapel.pop(); uit.push({ regel: tp.regel, tekst: src.slice(tp.start, i) }); return; }
      if (c === '$' && src[i + 1] === '{') { i += 2; const tp = stapel[stapel.length - 1]; tp.diepte = 0; tp.inExpr = true; return; }
      if (c === '\n') regel++;
      i++;
    }
  };
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '\n') { regel++; i++; continue; }
    if (c === '/' && d === '*') {
      const e = src.indexOf('*/', i + 2); const blok = src.slice(i, e < 0 ? n : e + 2);
      regel += (blok.match(/\n/g) || []).length; i = e < 0 ? n : e + 2; continue;
    }
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '\'' || c === '"') { leesString(c); vorige = 'a'; continue; }
    if (c === '`') { stapel.push({ start: i, regel, diepte: 0, inExpr: false }); i++; leesTemplate(); vorige = 'a'; continue; }
    if (c === '/' && (vorige === '' || /[(,=:[!&|?{};+\-*%<>~^]/.test(vorige))) {   /* regex-literal */
      i++; let klasse = false;
      while (i < n && src[i] !== '\n') {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '[') klasse = true; else if (src[i] === ']') klasse = false;
        else if (src[i] === '/' && !klasse) break;
        i++;
      }
      i++; while (i < n && /[a-z]/i.test(src[i])) i++;
      vorige = 'a'; continue;
    }
    const top = stapel.length ? stapel[stapel.length - 1] : null;
    if (top && top.inExpr) {
      if (c === '{') top.diepte++;
      else if (c === '}') {
        if (top.diepte === 0) { top.inExpr = false; i++; leesTemplate(); vorige = 'a'; continue; }
        top.diepte--;
      }
    }
    if (/[\w$]/.test(c)) {
      let j = i; while (j < n && /[\w$]/.test(src[j])) j++;
      vorige = /^(return|typeof|case|in|of|new|delete|void|throw)$/.test(src.slice(i, j)) ? '(' : 'a';
      i = j; continue;
    }
    if (!/\s/.test(c)) vorige = c;
    i++;
  }
  return uit;
}
/* per regel: de omhullende top-level declaratie, plus een datasleutel op twee spaties (KAARTEN.de_roddel) */
function contexten(src) {
  const ctx = []; let fn = '(top)', sub = '';
  src.split('\n').forEach(r => {
    const top = /^(?:async\s+)?function\s+([\w$]+)/.exec(r) || /^(?:const|let|var)\s+([\w$]+)/.exec(r);
    if (top) { fn = top[1]; sub = ''; }
    const sl = /^  ([\w$]+):\s*[{[]/.exec(r) || /^  \{ id:\s*'([\w$]+)'/.exec(r) || /^    id:\s*'([\w$]+)'/.exec(r);
    if (sl) sub = sl[1];
    ctx.push(fn + (sub ? '.' + sub : ''));
  });
  return ctx;
}
function grepWacht(rel) {
  const src = fs.readFileSync(path.join(WT, rel), 'utf8').replace(/\r\n/g, '\n');
  const ctx = contexten(src);
  const uit = [];
  literals(src).forEach(x => {
    if (!/\s/.test(x.tekst) || !WOORD.test(x.tekst)) return;
    x.tekst.split('\n').forEach((stuk, k) => {
      if (WOORD.test(stuk)) uit.push({ rel, regel: x.regel + k, sleutel: rel + ':' + ctx[x.regel + k - 1], s: stuk.replace(/\s+/g, ' ').trim().slice(0, 100) });
    });
  });
  return uit;
}
/* De ALLOWLIST: bestand:functie(.datasleutel) → waarom die tekst met de vlag uit onbereikbaar is.
   Een nieuwe sleutel hier toevoegen = bewust bewijzen dat hij achter metgezellenAan() zit. */
const TOEGESTAAN = {
  'js/data.js:KAARTEN.de_roddel': 'tekst leest metgezellenAan() (T16)',
  'js/data.js:METGEZELLEN.drops': 'metgezel-data: alleen via een metgezel (V2-V4)',
  'js/data.js:METGEZELLEN.drops_wit': 'metgezel-data (V2-V6)',
  'js/data.js:METGEZELLEN.vlamwachter': 'metgezel-data (V2-V4)',
  'js/data.js:METGEZELLEN.mosgeest': 'metgezel-data (V2-V4)',
  'js/data.js:UITSPRAKEN._erfprins': 'dossier (T15) en orakel (T13 → orakelSolo) zijn vlag-gegate in toonBaasIntro',
  'js/data.js:BESTIARIUM.het_klapvee': '"bondgenoot" = het hof van de vijand, geen metgezel',
  'js/game.js:vijandAanval': 'Vlamwacht vangt de klap: alleen met g.metgezel (V2)',
  'js/game.js:copycatSpeelTerug': 'Vlamwacht vangt de klap: alleen met g.metgezel (V2)',
  'js/game.js:synergieBoekHtml': 'metgezelboek: onbereikbaar (roster en chip weg, T7/T8)',
  'js/game.js:toonMetgezelBoek': 'metgezelboek: onbereikbaar (T8)',
  'js/game.js:metgezelInstapMelding': 'alleen uit het act-instapblok (V5)',
  'js/game.js:metgezelVlucht': 'alleen met g.metgezel (V2)',
  'js/game.js:revealDropsWit': 'poort V6',
  'js/game.js:zetVoetschaduwen': 'CSS-selector, geen speler-tekst',
  'js/game.js:wisselInzage': 'CSS-selector, geen speler-tekst',
  'js/game.js:renderTopbalk': 'chip (V8) + scherven-tip leest metgezellenAan() (T19)',
  'js/game.js:bouwGevechtDom': 'de metgezel-zone: alleen met g.metgezel (V2)',
  'js/game.js:intentTekst': 'it.doelMetgezel: wordt nooit gezet (impactkaart A2)',
  'js/game.js:toonCodex': 'het Metgezellen-blok zit achter metgezellenAan() (T7)',
  'js/game.js:rustGenees': 'heeftMetgezel() (V2)',
  'js/game.js:devErfprins': 'DEV',
  'js/game.js:devMetgezellen': 'DEV-schakelaar',
  'js/game.js:_devMgMag': 'DEV-weigering',
  'js/game.js:devMetgezel': 'DEV (weigert geparkeerd)',
  'js/game.js:devDropsLevend': 'DEV (weigert geparkeerd)',
  'js/game.js:devDropsGrief': 'DEV (weigert geparkeerd)',
  'js/game.js:devDropsReunie': 'DEV (weigert geparkeerd)',
  'js/game.js:devDropsWitVecht': 'DEV (weigert geparkeerd)',
  'js/game.js:devDropsWis': 'DEV (opruimen)',
  'js/game.js:DEV_MENU': 'DEV-menu'
};

/* ============================================================================
   BROWSER
   ============================================================================ */
async function context(browser, o = {}) {
  const ctx = await browser.newContext({
    viewport: { width: o.w || 1440, height: o.h || 900 }, deviceScaleFactor: o.dpr || 1,
    isMobile: !!o.mobiel, hasTouch: !!o.mobiel, userAgent: o.mobiel ? UA : undefined,
    serviceWorkers: 'block', locale: 'nl-BE'
  });
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.host !== HOST) return route.abort();
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
    const f = path.join(WT, rel.split('/').join(path.sep));
    try { if (fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ status: 200, contentType: MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(f) }); } catch (e) {}
    return route.fulfill({ status: 404, contentType: 'text/plain', body: 'weg' });
  });
  /* één keer zaaien per tab (sessionStorage overleeft een herlaad): herladen houdt de save */
  await ctx.addInitScript(([cx, inst]) => {
    try {
      if (!sessionStorage.getItem('nissen_gezaaid')) {
        localStorage.clear();
        localStorage.setItem('slayit_wipe', '1'); localStorage.setItem('slayit_proloog_over', '1'); localStorage.setItem('slayit_nudge', 'weg');
        localStorage.setItem('slayit_inst', JSON.stringify(inst));
        if (cx) localStorage.setItem('slayit_codex', JSON.stringify(cx));
        sessionStorage.setItem('nissen_gezaaid', '1');
      }
    } catch (e) {}
  }, [o.codex || null, Object.assign({ lite: true, d3: false, spraak: true, autoPor: false, mobielHersteld2: true }, o.inst || {})]);
  const page = await ctx.newPage();
  page.__f = [];
  page.on('pageerror', e => page.__f.push(e.message.slice(0, 240)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon|supabase|rest\/v1/i.test(m.text())) page.__f.push('console: ' + m.text().slice(0, 200)); });
  return { ctx, page };
}
async function laad(page) {
  await page.goto('http://' + HOST + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof startGevecht === 'function' && typeof nieuwSpel === 'function' && typeof metgezellenAan === 'function');
  await slaap(300);
  await page.evaluate(() => {
    window.__log = [];
    const om = melding; window.melding = function (x) { window.__log.push('MELDING ' + x); return om.apply(this, arguments); };
    const ob = baasSpreekt; window.baasSpreekt = function (x) { window.__log.push('BAAS ' + x); return ob.apply(this, arguments); };
  });
}
const leesLog = page => page.evaluate(() => { const l = (window.__log || []).slice(); if (window.__log) window.__log.length = 0; return l; });
const leesMgCodex = page => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('slayit_codex') || '{}'); } catch (e) { return { fout: e.message }; } });
const staat = page => page.evaluate(() => ({
  act: (typeof S !== 'undefined' && S) ? S.act : null,
  sMet: (typeof S !== 'undefined' && S && S.metgezel) ? S.metgezel.id : null,
  runMet: (typeof S !== 'undefined' && S && S.runMetgezel) || null,
  gMet: (typeof S !== 'undefined' && S && S.gevecht && S.gevecht.metgezel) ? S.gevecht.metgezel.id : null,
  zone: (() => { const z = document.getElementById('metgezel-zone'); return z ? (z.hidden ? 'verborgen' : 'ZICHTBAAR') : '-'; })(),
  chip: (() => { const c = document.getElementById('tb-metgezel'); return c ? (c.style.display === 'none' ? 'verborgen' : 'ZICHTBAAR') : '-'; })(),
  wereldMet: (() => { const w = document.getElementById('w-metgezel'); return w ? w.innerHTML.length : 0; })()
}));
const zichtbareTekst = page => page.evaluate(() => {
  const zicht = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const stukken = [];
  document.querySelectorAll('body *').forEach(el => {
    if (!zicht(el)) return;
    for (const nd of el.childNodes) if (nd.nodeType === 3 && nd.textContent.trim()) stukken.push(nd.textContent.trim());
    if (el.dataset && el.dataset.tip) stukken.push('[tip] ' + el.dataset.tip);
  });
  return stukken.join(' | ');
});
/* één stap van de doorloop: geen metgezel in de staat, geen verboden woord in beeld */
async function stap(page, scen, naam, uitzondering) {   /* uitzondering: de ene bedoelde regel (het afscheid) */
  const st = await staat(page);
  const tekst = await zichtbareTekst(page);
  const treffers = tekst.split(' | ').filter(s => VERBODEN.test(s) && !(uitzondering && uitzondering.test(s)));
  const log = await leesLog(page);
  t(st.sMet === null && st.runMet === null && st.gMet === null && st.zone !== 'ZICHTBAAR' && st.chip !== 'ZICHTBAAR' && st.wereldMet === 0,
    `${scen} · ${naam}: geen metgezel (S.metgezel ${st.sMet}, runMetgezel ${st.runMet}, g.metgezel ${st.gMet}, zone ${st.zone}, chip ${st.chip}, #w-metgezel ${st.wereldMet} tekens)`);
  t(treffers.length === 0, `${scen} · ${naam}: 0 verboden woorden in beeld en in de tips` + (treffers.length ? ' — ' + treffers.slice(0, 3).map(s => s.slice(0, 120)).join(' || ') : ''));
  return { st, log, tekst };
}

(async () => {
  const browser = await chromium.launch();
  const fouten = [];   /* paginafouten over alle contexten */
  const sluit = async (ctx, page, wat) => { if (page.__f.length) fouten.push(wat + ': ' + page.__f.slice(0, 3).join(' | ')); await ctx.close(); };

  /* ============================================================
     A · DE BRON
     ============================================================ */
  if (doe('bron')) {
    kop('A · de bron: één vlag, één lezer, de grep-wacht');
    const game = fs.readFileSync(path.join(WT, 'js/game.js'), 'utf8');
    const vlag = (game.match(/^const METGEZELLEN_AAN = (true|false);/mg) || []);
    t(vlag.length === 1 && /false/.test(vlag[0]), `js/game.js zet de vlag precies één keer: ${JSON.stringify(vlag)}`);
    t((game.match(/^function metgezellenAan\(\)/mg) || []).length === 1, 'metgezellenAan() is één keer gedefinieerd');
    /* de DEV-override leeft alleen in het geheugen: nergens in localStorage of een URL */
    const codeRegels = game.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(r => /_devMetgezellen/.test(r.replace(/\/\/.*$/, '')));
    t(codeRegels.length === 3 && !codeRegels.some(r => /localStorage|sessionStorage|location|URLSearchParams/.test(r)),
      `_devMetgezellen: ${codeRegels.length} coderegels (declaratie, lezer, schakelaar), geen opslag: ${codeRegels.map(r => r.trim().slice(0, 60)).join(' || ')}`);
    /* de grep-wacht */
    const bestanden = fs.readdirSync(path.join(WT, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f)
      .concat(fs.existsSync(path.join(WT, 'proloog')) ? fs.readdirSync(path.join(WT, 'proloog')).filter(f => f.endsWith('.js')).map(f => 'proloog/' + f) : []);
    const treffers = [].concat(...bestanden.map(grepWacht));
    const vreemd = treffers.filter(x => !TOEGESTAAN[x.sleutel]);
    t(vreemd.length === 0, `grep-wacht over ${bestanden.length} bestanden (js/*.js + proloog/*.js): ${treffers.length} metgezel-strings, allemaal in een vlag-gegate of DEV-functie` +
      (vreemd.length ? ' — BUITEN DE ALLOWLIST: ' + vreemd.slice(0, 6).map(x => `${x.rel}:${x.regel} [${x.sleutel.split(':')[1]}] "${x.s}"`).join(' || ') : ''));
    const proloog = treffers.filter(x => /^proloog\/|proloog-brug/.test(x.rel));
    t(proloog.length === 0, `de proloog (proloog/*.js + js/proloog-brug.js) noemt geen metgezel: ${proloog.length} treffers`);
    const ongebruikt = Object.keys(TOEGESTAAN).filter(k => !treffers.some(x => x.sleutel === k));
    console.log('   (info) allowlist-sleutels zonder treffer vandaag: ' + (ongebruikt.join(', ') || '—'));
    /* de zelftest van de lexer: een meerregelige template met een geneste template en een regex */
    const proef = literals("const a = `x\n ${b ? 'c d' : `e ${f} g`} h`; // 'nee'\n/* 'nee' */ const r = /ab'c/g; 'ja'").map(x => x.tekst);
    t(proef.includes('c d') && proef.includes('ja') && !proef.includes('nee') && proef.some(x => /^`x/.test(x)), `de lexer leest strings en templates, slaat commentaar en regex over: ${JSON.stringify(proef)}`);
  }

  /* ============================================================
     B · DE SCHERVEN — negen tafelTeksten
     ============================================================ */
  if (doe('scherven')) {
    kop('B · de negen scherfteksten (bron-neutraal)');
    const { ctx, page } = await context(browser, { codex: CODEX.nieuw });
    await laad(page);
    const sch = await page.evaluate(() => alleScherfIds().map(sid => { const d = scherfDef(sid); return { sid, tekst: scherfTekst(sid), tafel: d.tafelTekst, codex: d.codexTekst }; }));
    t(sch.length === 9, `${sch.length} scherven`);
    t(sch.every(x => x.tafel && x.tekst === x.tafel), 'scherfTekst(sid) = de tafelTekst met de vlag uit, voor alle negen');
    t(sch.every(x => x.tafel !== x.codex), 'de codexTekst (lore) blijft ernaast staan, ongewijzigd');
    const verb = sch.filter(x => VERBODEN.test(x.tekst));
    t(verb.length === 0, `0 van ${sch.length} met een verboden woord` + (verb.length ? ': ' + verb.map(x => x.sid).join(', ') : ''));
    const plek = sch.filter(x => VINDPLAATS.test(x.tekst));
    t(plek.length === 0, `geen enkele noemt een vindplaats (baas/raadsel/geschenk/gevecht/figuur/elite/kist)` + (plek.length ? ': ' + plek.map(x => x.sid + ' "' + x.tekst + '"').join(' || ') : ''));
    /* de poorten: elke gegate functie leest de vlag */
    const poorten = await page.evaluate(() => {
      const namen = ['heeftMetgezel', 'geefMetgezel', 'kiesRunMetgezel', 'volgendeAct', 'dropsInRouw', 'magWitTerugkeren', 'revealDropsWit',
        'toonRust', 'renderTopbalk', 'laadSpel', 'scherfTekst', 'toonBaasIntro', 'meestGevorderdeMysterie', 'scherfCodexBlok', 'toonCodex'];
      return namen.map(n => ({ n, ok: typeof window[n] === 'function' && /metgezellenAan\(\)/.test(window[n].toString()) }));
    });
    const zonder = poorten.filter(p => !p.ok).map(p => p.n);
    t(zonder.length === 0, `de ${poorten.length} gegate functies lezen metgezellenAan()` + (zonder.length ? ' — ZONDER: ' + zonder.join(', ') : ''));
    const roddel = await page.evaluate(() => ({ tekst: KAARTEN.de_roddel.tekst({ id: 'de_roddel' }), flavor: KAARTEN.de_roddel.flavor }));
    t(roddel.tekst === 'Onbespeelbaar. Neemt ruimte in je hand in.' && !VERBODEN.test(roddel.flavor), `De Roddel: "${roddel.tekst}" / "${roddel.flavor}"`);
    const orakel = await page.evaluate(() => UITSPRAKEN._erfprins.orakelSolo);
    t(Array.isArray(orakel) && orakel.length === 4 && !orakel.some(r => VERBODEN.test(r) || /poort|breker|vóédt/i.test(r)), `orakelSolo: ${orakel.length} regels, geen belofte van een breker`);
    t(await page.evaluate(() => metgezellenAan() === false && METGEZELLEN_AAN === false), 'metgezellenAan() === false bij het laden');
    await sluit(ctx, page, 'scherven');
  }

  /* ============================================================
     C · DE DOORLOOP — drie Codexen, van heldkeuze tot de Codex
     ============================================================ */
  if (doe('doorloop')) {
    for (const scen of ['ontwaakt', 'rouw', 'nieuw']) {
      kop('C · doorloop met Codex "' + scen + '"');
      const { ctx, page } = await context(browser, { codex: CODEX[scen] });
      await laad(page);
      /* heldkeuze + de scherf-loadout (de tips lezen scherfTekst) */
      await page.evaluate(() => toonHeldKeuze()); await slaap(500);
      await stap(page, scen, 'heldkeuze');
      const lo = await page.evaluate(() => [...document.querySelectorAll('.scherf-slot[data-shart]')].map(b => ({ sid: b.dataset.shart, tip: b.dataset.tip, moet: scherfTekst(b.dataset.shart) })));
      t(lo.length === CODEX[scen].scherven.length && lo.every(x => x.tip === x.moet), `${scen} · heldkeuze: ${lo.length} scherven in de loadout, elke tip = scherfTekst (de tafelTekst)`);
      /* Act 1 → de Drempeltafel → Act 2 */
      await page.evaluate(() => { nieuwSpel('slachter', 'NISSEN-DOORLOOP'); S.act = 1; ['drops_baas', 'vlamwachter_figuur', 'mosgeest_episch'].forEach(s => draagScherf(s)); renderTopbalk(); });
      await page.evaluate(() => volgendeAct('De Slijmkoning')); await slaap(900);
      await stap(page, scen, 'Drempeltafel (einde Act 1)');
      await page.evaluate(() => dtLoopVoorbij()); await slaap(900);
      const overgang = await stap(page, scen, 'Act 2-overgang na Loop voorbij');
      t(!overgang.log.some(l => /met je mee|daalt mee|rankt met je mee|zweeft .* mee/i.test(l)), `${scen} · geen instapmelding bij Act 2 (V5): ${overgang.log.filter(l => /MELDING/.test(l)).map(l => l.slice(8, 70)).join(' | ') || '—'}`);
      await page.evaluate(() => renderKaartScherm()); await slaap(600);
      await stap(page, scen, 'Act 2-kaart');
      await page.evaluate(() => startGevecht(['echo', 'naaper'], 'gevecht', 1)); await slaap(1600);
      await stap(page, scen, 'Act 2-gevecht');
      await page.evaluate(() => { stopGevechtLus(); S.gevecht = null; toonRust(); }); await slaap(700);
      await stap(page, scen, 'kampvuur Act 2');
      t(await page.evaluate(() => !document.getElementById('kv-geest')), `${scen} · geen geest aan het kampvuur (V7)`);
      /* de Erfprins: orakel op 6,4 s, nudge op 9,2 s */
      await page.evaluate(() => startGevecht(['de_erfprins'], 'baas', 14)); await slaap(11500);
      const erfStap = await stap(page, scen, 'Erfprins-gevecht (11,5 s, niet aangevallen)');
      const erf = await page.evaluate(() => ({ solo: UITSPRAKEN._erfprins.orakelSolo, oud: UITSPRAKEN._erfprins.orakel, dossier: UITSPRAKEN._erfprins.dossier, gebroken: !!(S.gevecht && S.gevecht.copycatGebroken) }));
      const baas = erfStap.log.filter(l => l.startsWith('BAAS ')).map(l => l.slice(5));
      const orakelGezegd = baas.filter(l => erf.solo.includes(l) || erf.oud.includes(l));
      t(orakelGezegd.length === 1 && erf.solo.includes(orakelGezegd[0]), `${scen} · het orakel is een orakelSolo-regel: "${orakelGezegd[0] || '—'}"`);
      t(!baas.some(l => l === erf.dossier || /pássen|Gooi\. Het\. Weg|DICHT gemoeten|geïndexeerd/.test(l)), `${scen} · geen scherven-nudge, geen dossier: ${baas.map(l => l.slice(0, 50)).join(' | ')}`);
      t(!erf.gebroken, `${scen} · copycatGebroken false in het Erfprins-gevecht`);
      /* de scherf-reveal in Act 2: tafelTekst, geen Drempel die al voorbij is */
      await page.evaluate(() => toonScherfReveal('drops_episch', { kop: 'TEST' })); await slaap(500);
      const rev = await page.evaluate(() => ({ tekst: (document.querySelector('.scherf-reveal-overlay') || {}).textContent || '', moet: scherfTekst('drops_episch') }));
      await stap(page, scen, 'scherf-reveal in Act 2');
      t(rev.tekst.includes(rev.moet) && /bankt bij het einde van je run/.test(rev.tekst) && !/neem 'm mee naar de Drempel/.test(rev.tekst),
        `${scen} · de reveal leest de tafelTekst en zegt in Act 2 dat hij bankt: "${rev.tekst.replace(/\s+/g, ' ').trim().slice(0, 140)}"`);
      await page.evaluate(() => { document.querySelectorAll('.scherf-reveal-overlay').forEach(nd => nd.remove()); stopGevechtLus(); S.gevecht = null; volgendeAct('De Erfprins'); }); await slaap(900);
      await stap(page, scen, 'Act 3-overgang');
      await page.evaluate(() => startGevecht(['de_omroeper', 'het_klapvee'], 'gevecht', 3)); await slaap(1600);
      await stap(page, scen, 'Act 3-gevecht');
      await page.evaluate(() => { stopGevechtLus(); S.gevecht = null; S.hp = Math.max(1, S.hp - 20); toonRust(); }); await slaap(700);
      await stap(page, scen, 'kampvuur Act 3');
      /* de figuur-events (T11/T12) en de nederlaag-duiding (T20) */
      const ev = await page.evaluate(() => {
        const E = (typeof EVENTS !== 'undefined' ? EVENTS : []);
        const l = E.find(e => e.id === 'lantaarndrager'), sp = E.find(e => e.id === 'spiegelaar');
        const keuze = l ? l.opties[0].doe() : '';
        document.querySelectorAll('.scherf-reveal-overlay').forEach(nd => nd.remove());
        const tafel = alleScherfIds().map(sid => scherfDef(sid).tafelTekst);
        return { lTekst: l ? l.tekst : '', keuze, sTekst: sp ? sp.tekst : '', tafelInKeuze: tafel.some(x => keuze.includes(x)), duiding: mysterieDuiding(1) };
      });
      t(/wát je bij je draagt/.test(ev.lTekst) && /ligt straks op tafel/.test(ev.sTekst) && !VERBODEN.test(ev.lTekst + ev.sTekst), `${scen} · Lantaarndrager en Spiegelaar volgen de tafel, niet een wezen`);
      t(ev.tafelInKeuze && !VERBODEN.test(ev.keuze), `${scen} · het afscheid van de Lantaarndrager is een tafelTekst: "${ev.keuze.slice(0, 110)}"`);
      t(!VERBODEN.test(ev.duiding), `${scen} · de nederlaag-duiding noemt geen metgezel: "${ev.duiding.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 110)}"`);
      /* de Codex (T7/T9) */
      await page.evaluate(() => toonCodex()); await slaap(500);
      await stap(page, scen, 'Codex');
      const cx = await page.evaluate(() => ({
        mgKop: [...document.querySelectorAll('#overlay-codex .codex-kop')].some(h => /Metgezellen/.test(h.textContent)),
        verbruikt: document.querySelectorAll('#overlay-codex .scherf-cx-slot.verbruikt').length,
        doorgrond: /doorgrond/.test((document.getElementById('overlay-codex') || {}).textContent || ''),
        voet: ((document.querySelector('#overlay-codex .codex-voet') || {}).textContent || '').replace(/\s+/g, ' ').trim()
      }));
      t(!cx.mgKop && cx.verbruikt === 0 && !cx.doorgrond, `${scen} · Codex: geen blok Metgezellen, geen 'doorgrond'/'verbruikt' trio (kop ${cx.mgKop}, verbruikt ${cx.verbruikt}, doorgrond ${cx.doorgrond})`);
      await page.screenshot({ path: path.join(UIT, `codex-${scen}.png`) });
      const cxNa = await leesMgCodex(page);
      t(normaliseer(cxNa) === normaliseer(CODEX[scen]), `${scen} · de metgezelsleutels van de Codex zijn na de doorloop inhoudelijk gelijk (niets gewist, niets bijgeschreven)` +
        (normaliseer(cxNa) === normaliseer(CODEX[scen]) ? '' : ` — voor ${normaliseer(CODEX[scen])} na ${normaliseer(cxNa)}`));
      t(page.__f.length === 0, `${scen} · geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 2).join(' | ') : ''));
      await sluit(ctx, page, 'doorloop ' + scen);
    }
  }

  /* ============================================================
     D · EEN LOPENDE RUN MET EEN METGEZEL (van vóór de parkering)
     ============================================================ */
  if (doe('save')) {
    for (const mgid of ['drops', 'vlamwachter']) {
      kop('D · lopende save met ' + mgid + ': wegsturen, één regel, één keer');
      const { ctx, page } = await context(browser, { codex: CODEX.ontwaakt });
      await laad(page);
      /* de save maken zoals de oude code hem schreef: vlag even aan, metgezel erin, bewaren */
      const naam = await page.evaluate(id => {
        _devMetgezellen = true;
        nieuwSpel('slachter', 'NISSEN-SAVE'); S.act = 2; S.kaart = genereerKaart(); geefMetgezel(id); S.runMetgezel = id; S.metgezel.hp = 17; saveSpel();
        _devMetgezellen = false;
        return METGEZELLEN[id].naam;
      }, mgid);
      const saveMet = () => page.evaluate(() => { try { const s = JSON.parse(localStorage.getItem('slayit_save_v1')); return { metgezel: s.metgezel ? s.metgezel.id : null, runMetgezel: s.runMetgezel || null, vlag: '_mgAfscheid' in s }; } catch (e) { return { fout: e.message }; } });
      const voor = await saveMet();
      t(voor.metgezel === mgid && voor.runMetgezel === mgid, `de save vóór het laden draagt ${JSON.stringify(voor)}`);
      /* herlaad 1 */
      await laad(page);
      await page.evaluate(() => doorgaan()); await slaap(2300);
      const toast1 = await page.evaluate(() => [...document.querySelectorAll('#meldingen .toast')].map(e => e.textContent).filter(x => /blijft achter/.test(x)));
      const na1 = await saveMet();
      const s1 = await stap(page, 'save/' + mgid, 'herlaad 1 (de afscheidsregel is de enige bedoelde treffer)', /^🐾 .+ blijft achter\. Vanaf hier daal je alleen af\.$/);
      await page.screenshot({ path: path.join(UIT, `save-${mgid}-herlaad1.png`) });
      /* herlaad 2 — ZONDER tussentijdse save */
      await laad(page);
      await page.evaluate(() => doorgaan()); await slaap(2300);
      const na2 = await saveMet();
      const s2 = await stap(page, 'save/' + mgid, 'herlaad 2 (zonder save ertussen)');
      const regels = [...s1.log, ...s2.log].filter(l => /blijft achter/.test(l));
      const moet = 'MELDING 🐾 ' + naam + ' blijft achter. Vanaf hier daal je alleen af.';
      t(regels.length === 1 && regels[0] === moet, `de afscheidsregel verschijnt precies één keer over twee herlaadbeurten: ${regels.length}× "${(regels[0] || '').slice(8)}"`);
      t(regels.length === 1 && !/nissen/i.test(regels[0]), 'de regel noemt geen nissen (de Drempeltafel laat je nissen juist voeden)');
      t(toast1.length === 1, `de regel staat ook echt in beeld na herlaad 1: ${JSON.stringify(toast1)}`);
      t(na1.metgezel === null && na1.runMetgezel === null && !na1.vlag && na2.metgezel === null && na2.runMetgezel === null && !na2.vlag,
        `de save is na herlaad 1 al schoon: ${JSON.stringify(na1)} · na herlaad 2: ${JSON.stringify(na2)}`);
      await page.evaluate(() => startGevecht(['echo', 'naaper'], 'gevecht', 1)); await slaap(1500);
      await stap(page, 'save/' + mgid, 'Act 2-gevecht na de herlaad');
      t(page.__f.length === 0, `save/${mgid} · geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 2).join(' | ') : ''));
      await sluit(ctx, page, 'save ' + mgid);
    }
    kop('D · een stale S.runMetgezel (V5) en een save zonder metgezel');
    {
      const { ctx, page } = await context(browser, { codex: CODEX.ontwaakt });
      await laad(page);
      /* V5: een run met alleen een gecachete runMetgezel mag bij de act-overgang niets aankondigen */
      await page.evaluate(() => { nieuwSpel('slachter', 'NISSEN-V5'); S.act = 1; S.metgezel = null; S.runMetgezel = 'drops'; volgendeAct('De Slijmkoning'); try { dtLoopVoorbij(); } catch (e) {} });
      await slaap(900);
      const v5 = await page.evaluate(() => ({ sMet: S.metgezel ? S.metgezel.id : null }));
      const v5log = (await leesLog(page)).filter(l => /MELDING/.test(l));
      t(v5.sMet === null && !v5log.some(l => /met je mee|daalt mee|rankt|zweeft/i.test(l)), `stale runMetgezel 'drops' + volgendeAct → geen metgezel, geen instapmelding (${v5log.map(l => l.slice(8, 60)).join(' | ') || 'geen meldingen'})`);
      /* een save met alleen een runMetgezel (Act 1, de metgezel zou pas in Act 2 instappen) */
      await page.evaluate(() => { nieuwSpel('slachter', 'NISSEN-RUN'); S.act = 1; S.metgezel = null; S.runMetgezel = 'vlamwachter'; saveSpel(); });
      await laad(page);
      await page.evaluate(() => doorgaan()); await slaap(2300);
      const r = await page.evaluate(() => ({ run: S.runMetgezel || null, sMet: S.metgezel ? S.metgezel.id : null }));
      const rlog = (await leesLog(page)).filter(l => /blijft achter/.test(l));
      t(r.run === null && r.sMet === null && rlog.length === 0, `een save met alleen runMetgezel: in het geheugen gewist (${JSON.stringify(r)}), geen afscheidsregel (er stond niemand naast je): ${rlog.length}×`);
      t(page.__f.length === 0, 'geen paginafouten' + (page.__f.length ? ' — ' + page.__f.slice(0, 2).join(' | ') : ''));
      await sluit(ctx, page, 'save V5');
    }
  }

  /* ============================================================
     E · DE DEV-SCHAKELAAR — heen en terug
     ============================================================ */
  if (doe('dev')) {
    kop('E · de DEV-schakelaar: geparkeerd, aan, uit, herlaad');
    const { ctx, page } = await context(browser, { codex: CODEX.rouw });
    await laad(page);
    const cxVoor = await leesMgCodex(page);
    await page.evaluate(() => { nieuwSpel('slachter', 'NISSEN-DEV'); devMetgezel('drops'); devDropsLevend(); });
    await slaap(400);
    const geweigerd = await page.evaluate(() => ({ aan: metgezellenAan(), sMet: S.metgezel ? S.metgezel.id : null, gevecht: !!S.gevecht }));
    const wlog = (await leesLog(page)).filter(l => /geparkeerd/.test(l));
    const cxNa = await leesMgCodex(page);
    t(!geweigerd.aan && geweigerd.sMet === null && !geweigerd.gevecht && wlog.length === 2,
      `geparkeerd: devMetgezel('drops') en devDropsLevend() weigeren ZICHTBAAR (${wlog.length}× "geparkeerd"), S.metgezel ${geweigerd.sMet}, geen gevecht gestart`);
    t(normaliseer(cxNa) === normaliseer(cxVoor), 'de geweigerde Drops-boog schreef niets in de Codex');
    await page.evaluate(() => { devMetgezellen(true); devMetgezel('drops'); startGevecht(['echo'], 'gevecht', 1); });
    await slaap(1500);
    let st = await staat(page);
    t(await page.evaluate(() => metgezellenAan()) && st.gMet === 'drops' && st.zone === 'ZICHTBAAR' && st.chip === 'ZICHTBAAR',
      `schakelaar AAN + devMetgezel('drops') + gevecht → g.metgezel ${st.gMet}, zone ${st.zone}, chip ${st.chip}`);
    await page.evaluate(() => { devMetgezellen(false); stopGevechtLus(); S.gevecht = null; startGevecht(['echo'], 'gevecht', 1); });
    await slaap(1500);
    st = await staat(page);
    t(!(await page.evaluate(() => metgezellenAan())) && st.sMet === null && st.gMet === null && st.zone !== 'ZICHTBAAR' && st.chip !== 'ZICHTBAAR',
      `schakelaar UIT → S.metgezel ${st.sMet}, volgend gevecht g.metgezel ${st.gMet}, zone ${st.zone}, chip ${st.chip}`);
    await page.evaluate(() => devMetgezellen(true));
    await laad(page);
    t(await page.evaluate(() => metgezellenAan() === false), 'herlaad → weer geparkeerd (de override leeft alleen in het geheugen)');
    t(page.__f.length === 0, 'geen paginafouten' + (page.__f.length ? ' — ' + page.__f.slice(0, 2).join(' | ') : ''));
    await sluit(ctx, page, 'dev');
  }

  /* ============================================================
     G · DE DEV-BUILDS EN DE SPRONGEN ZIJN SOLO (M-plan §6: meten, niet aannemen)
     ============================================================ */
  if (doe('builds')) {
    kop('G · DEV_BUILDS, devDicktator en devErfprins zijn solo');
    const { ctx, page } = await context(browser, { codex: CODEX.ontwaakt });
    await laad(page);
    const keys = await page.evaluate(() => Object.keys(DEV_BUILDS));
    const metMg = await page.evaluate(() => Object.keys(DEV_BUILDS).filter(k => DEV_BUILDS[k].metgezel));
    t(metMg.length === 0, `geen enkele DEV_BUILD draagt een metgezel (${keys.length} builds: ${keys.join(', ')})`);
    for (const k of keys) {
      const r = await page.evaluate(k2 => { devDicktator(k2); return { g: !!S.gevecht, gMet: S.gevecht && S.gevecht.metgezel ? S.gevecht.metgezel.id : null, sMet: S.metgezel ? S.metgezel.id : null }; }, k);
      t(r.g && r.gMet === null && r.sMet === null, `devDicktator('${k}') → het proces staat solo: g.metgezel ${r.gMet}, S.metgezel ${r.sMet}`);
      await slaap(600);
      await page.evaluate(() => { try { S.gevecht.voorbij = true; stopGevechtLus(); } catch (e) {} try { regieOpruimAlles(); } catch (e) {} S.gevecht = null; });
    }
    const e = await page.evaluate(() => { devErfprins(); return { gMet: S.gevecht && S.gevecht.metgezel ? S.gevecht.metgezel.id : null, sMet: S.metgezel ? S.metgezel.id : null }; });
    t(e.gMet === null && e.sMet === null, `devErfprins() → solo: g.metgezel ${e.gMet}, S.metgezel ${e.sMet}`);
    await slaap(600);
    t(page.__f.length === 0, 'geen paginafouten' + (page.__f.length ? ' — ' + page.__f.slice(0, 2).join(' | ') : ''));
    await sluit(ctx, page, 'builds');
  }

  /* ============================================================
     F · DE ERFPRINS — volledige gevechten met een Codex in rouw, op fakkel 0
     (de twee geheime poorten van de Witte: weer licht maken na gedoofd, en sterven in het donker)
     ============================================================ */
  if (doe('erfprins')) {
    kop('F · de Erfprins: drie volledige gevechten (Codex in rouw), plus de twee Witte-poorten');
    const { ctx, page } = await context(browser, { codex: CODEX.rouw });
    await laad(page);
    const cxVoor = await leesMgCodex(page);
    const solo = await page.evaluate(() => UITSPRAKEN._erfprins.orakelSolo);
    const dossier = await page.evaluate(() => UITSPRAKEN._erfprins.dossier);
    await page.evaluate(() => {
      window.slaap = () => Promise.resolve();
      try { Klank.sfx = () => {}; Klank.muziek = () => {}; Klank.duck = () => {}; } catch (e) {}
      window.schudScherm = () => {};
      window.gevechtGewonnen = async function () { const g = S.gevecht; if (!g || g.voorbij) return; g.voorbij = true; g._gewonnen = true; };
      window.nederlaag = function () { const g = S.gevecht; if (!g || g.voorbij) return; g.voorbij = true; g._verloren = true; };
      window.__ontgrendel = 0;
      const oo = ontgrendelMetgezel; window.ontgrendelMetgezel = function () { window.__ontgrendel++; return oo.apply(this, arguments); };
    });
    for (const seed of ['NISSEN-ERF-1', 'NISSEN-ERF-2', 'NISSEN-ERF-3']) {
      const r = await Promise.race([
        page.evaluate(async sd => {
          const wacht = ms => new Promise(res => setTimeout(res, ms));
          if (S && S.gevecht) { try { S.gevecht.voorbij = true; stopGevechtLus(); } catch (e) {} }
          nieuwSpel('slachter', sd);
          S.gevecht = null; S.act = 2; S.fakkel = fakkelMax(); S.pos = null; S.maxHp = 90; S.hp = 80; S.dranken = ['heeldrank'];
          let v = 0; while (S.dek.length < 18 && v++ < 40) S.dek.push(nieuweKaart(kiesUit(heldPool())));
          S.kaart = genereerKaart();
          startGevecht(['de_erfprins'], 'baas', 15);
          const g = S.gevecht;
          const boss = () => g.vijanden.find(x => x.id === 'de_erfprins');
          const vrij = async () => { let w = 0; while ((g.ceremonie || g.bezig || g._regieBezig) && w++ < 600 && S.gevecht === g && !g.voorbij) await wacht(15); };
          await wacht(300); await vrij();
          document.querySelectorAll('#baas-intro, .baas-intro').forEach(nd => { try { nd.remove(); } catch (e) {} });
          let gMetOoit = !!g.metgezel, ronde = 0, fout = null;
          /* poort A: gedoofd, en dan weer licht maken (de oude code liet de Witte hier terugkeren) */
          S.fakkel = 0; zetLichtVisueel(); zetFakkel(15); zetFakkel(-15);
          gMetOoit = gMetOoit || !!g.metgezel;
          try {
            while (!g.voorbij && S.gevecht === g && S.hp > 0 && ronde < 30) {
              await vrij(); if (g.voorbij) break;
              ronde++; const beurt = g.beurt; let guard = 0;
              while (guard++ < 20 && !g.voorbij && g.beurt === beurt) {
                await vrij(); if (g.voorbij || g.beurt !== beurt) break;
                const c = g.hand.find(k => { const d = kdef(k), kost = kkost(k); return d && d.type !== 'vloek' && kost !== null && kost <= g.energie && (!d.kan || d.kan(k)); });
                if (!c) break;
                await speelKaart(c, kdef(c).doel === 'vijand' ? boss() : undefined);
                gMetOoit = gMetOoit || !!g.metgezel;
              }
              await vrij(); if (g.voorbij) break;
              if (S.hp < S.maxHp * 0.35) { const i = S.dranken.indexOf('heeldrank'); if (i >= 0) { try { gebruikDrank(i); } catch (e) {} } }
              let pog = 0;
              while (g.beurt === beurt && !g.voorbij && pog++ < 5) { await vrij(); await eindBeurt(); await vrij(); }
              gMetOoit = gMetOoit || !!g.metgezel;
              if (g.beurt === beurt && !g.voorbij) { fout = 'eindBeurt kwam niet door (ronde ' + ronde + ')'; break; }
            }
          } catch (e) { fout = String((e && e.stack) || e).slice(0, 300); }
          const b = boss();
          const uit = { ronde, gewonnen: !!g._gewonnen, verloren: !!g._verloren || S.hp <= 0, gebroken: !!g.copycatGebroken, gMetOoit,
            ontgrendel: window.__ontgrendel, wit: !!(Codex.mysteries && Codex.mysteries.drops_wit && Codex.mysteries.drops_wit.voltooid), fout, baasHp: b ? b.hp : null, hp: S.hp };
          try { g.voorbij = true; stopGevechtLus(); } catch (e) {}
          S.gevecht = null;
          document.querySelectorAll('#baas-intro, .baas-flits, .baas-spraak, .roof-overlay, .roof-speel-kaart, .steel-vlieger').forEach(nd => { try { nd.remove(); } catch (e) {} });
          return uit;
        }, seed),
        slaap(150000).then(() => ({ fout: 'TIMEOUT 150 s' }))
      ]);
      const log = (await leesLog(page)).filter(l => l.startsWith('BAAS ')).map(l => l.slice(5));
      t(!r.fout && (r.gewonnen || r.verloren || r.ronde >= 30), `${seed}: volledig gevecht — ${r.gewonnen ? 'gewonnen' : r.verloren ? 'verloren' : 'na ' + r.ronde + ' rondes gestopt'} in ${r.ronde} rondes (baas ${r.baasHp} HP, jij ${r.hp} HP)` + (r.fout ? ' — ' + r.fout : ''));
      t(!r.gMetOoit && !r.gebroken && r.ontgrendel === 0 && !r.wit, `${seed}: nooit een metgezel (${r.gMetOoit}), copycatGebroken ${r.gebroken}, de Witte niet teruggekeerd (ontgrendelMetgezel ${r.ontgrendel}×) — ook niet na gedoofd → weer licht`);
      const vreemd = log.filter(l => l === dossier || /pássen|Gooi\. Het\. Weg|DICHT gemoeten|geïndexeerd/.test(l));
      const oudOrakel = log.filter(l => /trouw blíjft zonder loon|wat die poort wakker maakt/.test(l));
      t(vreemd.length === 0 && oudOrakel.length === 0, `${seed}: geen dossier, geen nudge, geen oud orakel (${log.length} baasregels; orakelSolo gezegd: ${log.filter(l => solo.includes(l)).length}×)`);
    }
    /* poort B: sterven in het donker (de oude code: de Witte springt ertussen en je staat op 40 %) */
    const pb = await page.evaluate(async () => {
      nieuwSpel('slachter', 'NISSEN-POORTB'); S.act = 2; S.maxHp = 90; S.hp = 1; S.relikwieen = [];
      startGevecht(['de_erfprins'], 'baas', 15);
      const g = S.gevecht;
      await new Promise(res => setTimeout(res, 300));
      S.fakkel = 0; zetLichtVisueel();
      verliesHp(sp(), 6, g.vijanden[0]);
      await new Promise(res => setTimeout(res, 200));
      return { hp: S.hp, verloren: !!g._verloren || g.voorbij, gMet: !!g.metgezel, ontgrendel: window.__ontgrendel, wit: !!(Codex.mysteries && Codex.mysteries.drops_wit && Codex.mysteries.drops_wit.voltooid) };
    });
    t(pb.hp === 0 && pb.verloren && !pb.gMet && pb.ontgrendel === 0 && !pb.wit, `poort B: sterven op fakkel 0 is gewoon sterven — HP ${pb.hp}, verloren ${pb.verloren}, geen Witte (ontgrendelMetgezel ${pb.ontgrendel}×)`);
    const cxNa = await leesMgCodex(page);
    t(normaliseer(cxNa) === normaliseer(cxVoor), 'de metgezelsleutels van de Codex zijn na drie Erfprins-gevechten inhoudelijk gelijk' +
      (normaliseer(cxNa) === normaliseer(cxVoor) ? '' : ` — voor ${normaliseer(cxVoor)} na ${normaliseer(cxNa)}`));
    t(page.__f.length === 0, 'geen paginafouten' + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
    await sluit(ctx, page, 'erfprins');
  }

  /* ============================================================
     H · DE BEELDCONTROLE (M-plan §5): Thomas' scherm = de solo-opstelling van een nieuwe speler
     ============================================================ */
  if (doe('beeld')) {
    kop('H · beeldcontrole: Codex met Drops tegen een verse Codex, zelfde seed, echte act-overgang');
    const FORMATEN = [
      { id: '800x360', w: 800, h: 360, mobiel: true, dpr: 2 },
      { id: '846x381', w: 846, h: 381, mobiel: true, dpr: 2 },
      { id: '1440x900 2D', w: 1440, h: 900, d3: false },
      { id: '1440x900 3D', w: 1440, h: 900, d3: true },
      { id: '1366x768 2D', w: 1366, h: 768, d3: false },
      { id: '1366x768 3D', w: 1366, h: 768, d3: true },
      { id: '412x915 staand', w: 412, h: 915, mobiel: true, dpr: 2 }
    ];
    for (const f of FORMATEN) {
      const meet = {};
      for (const cx of ['ontwaakt', 'nieuw']) {
        const { ctx, page } = await context(browser, { w: f.w, h: f.h, dpr: f.dpr, mobiel: f.mobiel, codex: CODEX[cx], inst: { lite: false, d3: !!f.d3 } });
        await laad(page);
        await page.evaluate(() => {
          nieuwSpel('slachter', 'NISSEN-BEELD'); S.act = 1; S.kaart = genereerKaart();
          volgendeAct('De Slijmkoning'); try { dtLoopVoorbij(); } catch (e) {}
          startGevecht(['echo', 'naaper'], 'gevecht', 1);
        });
        await slaap(2600);
        meet[cx] = await page.evaluate(() => {
          const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return b.width ? [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)] : null; };
          const z = document.getElementById('metgezel-zone'), c = document.getElementById('tb-metgezel');
          return {
            d3: !!document.querySelector('#scherm-gevecht.d3-actief'), gMet: S.gevecht && S.gevecht.metgezel ? S.gevecht.metgezel.id : null,
            zone: z ? z.hidden : true, chip: c ? c.style.display === 'none' : true,
            held: r(document.querySelector('#speler-zone .held-art') || document.querySelector('#speler-zone')), vijand: r(document.querySelector('.vijand')),
            hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth
          };
        });
        if (cx === 'ontwaakt') await page.screenshot({ path: path.join(UIT, `beeld-${f.id.replace(/\s+/g, '_')}.png`) });
        meet[cx].fouten = page.__f.length;
        await sluit(ctx, page, 'beeld ' + f.id + ' ' + cx);
      }
      const a = meet.ontwaakt, b = meet.nieuw;
      const bijna = (p, q) => !!p && !!q && p.every((x, i) => Math.abs(x - q[i]) <= 1);
      t(a.gMet === null && a.zone && a.chip && a.hscroll <= 0, `${f.id}: Codex met Drops → geen metgezel (g.metgezel ${a.gMet}, zone verborgen ${a.zone}, chip weg ${a.chip}), horizontale scroll ${a.hscroll}px`);
      t(bijna(a.held, b.held) && bijna(a.vijand, b.vijand), `${f.id}: held ${JSON.stringify(a.held)} en vijand ${JSON.stringify(a.vijand)} staan waar ze bij een verse Codex staan (${JSON.stringify(b.held)} / ${JSON.stringify(b.vijand)}, ±1 px)`);
      if (f.d3 !== undefined && !f.mobiel) t(a.d3 === !!f.d3, `${f.id}: het toneel draait ${a.d3 ? '3D' : '2D'} zoals gevraagd`);
    }
  }

  /* ============================================================ */
  kop('paginafouten over de hele ronde');
  t(fouten.length === 0, fouten.length ? 'PAGINAFOUTEN: ' + fouten.slice(0, 5).join(' || ') : 'geen paginafouten in de hele ronde');
  console.log(`\n============================================\nNISSEN ACCEPTATIE: ${okN} ok, ${foutN} FOUT   (shots in ${UIT})\n============================================`);
  await browser.close();
  process.exit(foutN ? 1 : 0);
})();
