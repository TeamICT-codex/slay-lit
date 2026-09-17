// GEOMETRIE-SONDE van HET PROCES (v121) — meet waar de vonnisplaat LANDT en wat hij raakt.
//
// WAT ZE MEET: per bedrijfsovergang (II · HET PROCES, III · DE TIRADE, IV · DE HERVERKIEZING)
// de rechthoek van de vonnistitel (.vonnis h2) en van de duiding (.vonnis span), en de
// OVERLAP daarvan met ELK ZICHTBAAR element in beeld: #topbalk, de bazenbalk (.bb-balk),
// de beleidsstrook (.bb-extra), elke .intent, de spraakplaat, de vijandfiguren en (mobiel)
// het hart. Elementen die op dat moment op opacity 0 staan — sinds v121 zijn dat tijdens
// body.ceremonie de intents en de strook — tellen NIET mee als botsing, maar worden wel
// gerapporteerd met hun gemeten opacity, zodat je ziet dát ze weg zijn.
// Bedrijf V heeft sinds v121 GEEN kaartje meer: daar meet ze in plaats daarvan de gouden
// aankomstpuls op de strook (klasse, scale, text-shadow) en de labeltekst.
//
// De twee eisen die ze hard toetst (architectbesluit P2):
//   laptop — .vonnis h2 begint volledig ONDER de bazenbalk: h2.top >= .bb-balk.onderkant + 8px
//            én de duiding blijft boven de figuren
//   mobiel — .vonnis h2 raakt geen zichtbaar UI-element (topbalk, hart/bazenbalk, strook,
//            zichtbare intents, spraakplaat); de figuren tellen niet mee, zie lager
//
// DRAAIEN (Git Bash, vanuit de scratchpad met node_modules/playwright):
//   NODE_PATH="$PWD/node_modules" SLAYIT_WORKTREE="...\SLAY-IT-drama" \
//     SLAYIT_SHOTS="$PWD/geo_shots" node "...\SLAY-IT-drama/tools/drama_vonnis_geometrie.js"
// SLAYIT_WORKTREE = de boom die van schijf geserveerd wordt (nooit poort 4173),
// SLAYIT_SHOTS    = waar de losse controleschoten landen (optioneel).
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const WT = process.env.SLAYIT_WORKTREE || 'C:/Users/Thomas Aelbrecht/Desktop/Workspace/SLAY-IT-drama';
const HOST = 'localhost:4181';
const UIT = process.env.SLAYIT_SHOTS || path.join(__dirname, 'geo_shots'); fs.mkdirSync(UIT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));
let okN = 0, foutN = 0;
const t = (goed, tekst) => { if (goed) { okN++; console.log('    ok   ' + tekst); } else { foutN++; console.log('    FOUT ' + tekst); } };

const VIEWPORTS = [
  { n: 'laptop 1440x900', w: 1440, h: 900, mobiel: false },
  { n: 'laptop 1920x1080', w: 1920, h: 1080, mobiel: false },
  { n: 'laptop 1366x662', w: 1366, h: 662, mobiel: false },
  { n: 'mobiel liggend 800x360', w: 800, h: 360, mobiel: true },
  { n: 'mobiel liggend 915x412', w: 915, h: 412, mobiel: true },
  { n: 'mobiel staand 412x915', w: 412, h: 915, mobiel: true }
];

// in-page meetgerei. zichtbaar() loopt de ouderketen af: een .intent in een wrap op
// opacity 0 is zelf niet doorzichtig maar staat wél onzichtbaar in beeld.
const METEN = `
window.__zichtbaar = function (el) {
  let o = 1, n = el;
  while (n && n.nodeType === 1) {
    const s = getComputedStyle(n);
    if (s.display === 'none' || s.visibility === 'hidden') return 0;
    o *= parseFloat(s.opacity);
    n = n.parentElement;
  }
  return Math.round(o * 1000) / 1000;
};
window.__rect = function (el, naam) {
  if (!el) return null;
  const b = el.getBoundingClientRect();
  if (b.width <= 0 || b.height <= 0) return null;
  return { naam: naam, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height),
           op: window.__zichtbaar(el), tekst: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 30) };
};
window.__overlap = function (a, b) {
  if (!a || !b) return null;
  const x = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const y = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return (x > 0 && y > 0) ? { x: x, y: y } : null;
};
// alles wat in beeld staat en waar een titel niet doorheen hoort te lopen
window.__scene = function () {
  const R = window.__rect, uit = [];
  const een = (sel, naam) => { const e = document.querySelector(sel); const r = R(e, naam); if (r) uit.push(r); };
  een('#topbalk', 'topbalk');
  een('#baas-balk .bb-balk', 'bazenbalk');
  een('#baas-balk .bb-extra', 'beleidsstrook');
  een('#baas-balk .bb-naam', 'baasnaam');
  een('.baas-spraak', 'spraakplaat');
  [...document.querySelectorAll('.intent')].forEach((e, i) => { const r = R(e, 'intent ' + i); if (r) uit.push(r); });
  [...document.querySelectorAll('.vijand .vijand-art')].forEach((e, i) => { const r = R(e, 'figuur ' + i); if (r) uit.push(r); });
  return uit;
};
window.__vonnis = function () {
  const von = document.querySelector('.vonnis');
  return {
    h2: window.__rect(von && von.querySelector('h2'), 'vonnis h2'),
    sub: window.__rect(von && von.querySelector('span'), 'vonnis sub'),
    klein: !!(von && von.classList.contains('klein')),
    goud: !!(von && von.classList.contains('goud')),
    scene: window.__scene(),
    vw: innerWidth, vh: innerHeight
  };
};
// bedrijf V: geen kaartje meer, maar de gouden aankomstpuls op de strook zelf
window.__mandaat = function () {
  const ex = document.querySelector('#baas-balk .bb-extra');
  const pil = ex ? ex.querySelector('.bb-proces') : null;
  const s = ex ? getComputedStyle(ex) : null;
  const sp = pil ? getComputedStyle(pil) : null;
  return {
    erIsEenKaartje: !!document.querySelector('.vonnis'),
    klasse: ex ? ex.className : '(geen strook)',
    puls: !!(ex && ex.classList.contains('mandaat-aan')),
    scale: s ? s.scale : '-',
    animatie: s ? s.animationName : '-',
    tekstschaduw: sp ? sp.textShadow : '-',
    label: ex ? (ex.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 60) : '-',
    op: ex ? window.__zichtbaar(ex) : 0
  };
};`;

const OVERGANGEN = [
  // wachttijden: ná de stempel. De titel animeert van scale(5) naar 1 over duur*0,125
  // (= 300ms bij duur 2400), dus een meting op de beat zelf meet de INSLAG en niet de
  // stand. II valt op t=900, III op t=1000, IV op t=3600.
  { sleutel: 'II', naam: 'II · HET PROCES', wacht: 1400,
    trigger: () => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.hp = Math.floor(b.maxHp * 0.50); checkBaasFase(); } },
  { sleutel: 'III', naam: 'III · DE TIRADE', wacht: 1400,
    trigger: () => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.fase = 2; b.hp = Math.floor(b.maxHp * 0.30); checkBaasFase(); } },
  { sleutel: 'IV', naam: 'IV · DE HERVERKIEZING', wacht: 4000,
    trigger: () => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.fase = 3; b.hp = 6; verliesHp(b, 30); } }
];

async function draaiViewport(browser, vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, serviceWorkers: 'block', hasTouch: vp.mobiel, isMobile: vp.mobiel, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url()); if (u.host !== HOST) return route.abort();
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
    const f = path.join(WT, rel.split('/').join(path.sep));
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ status: 200, contentType: MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(f) });
    return route.fulfill({ status: 404, body: 'weg' });
  });
  await page.goto('http://' + HOST + '/', { waitUntil: 'load' });
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('slayit_wipe', '1'); localStorage.setItem('slayit_nudge', 'weg'); localStorage.setItem('slayit_wereld', '0'); });
  await page.reload({ waitUntil: 'load' }); await slaap(600);
  if (vp.mobiel) await page.evaluate(() => { document.body.dataset.modus = 'mobiel'; window.mobiel = true; });
  await page.evaluate(() => { INST.d3 = false; INST.lite = false; document.body.classList.remove('lite'); try { bewaarInst(); } catch (e) {} try { toonHeldKeuze(); } catch (e) {} }); await slaap(300);
  await page.evaluate(() => { const k = document.querySelector('.held-kies'); if (k) k.click(); }); await slaap(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /toch beginnen/i.test(x.textContent)); if (b) b.click(); }); await slaap(800);
  await page.evaluate(METEN);

  const opzet = async () => {
    let w = 0; while (w < 9000) { const bezig = await page.evaluate(() => { const g = S.gevecht; return !g ? false : (g._regieBezig != null || !!g.ceremonie); }); if (!bezig) break; await slaap(250); w += 250; }
    await page.evaluate(() => { devDicktator('slachter_mid'); });
    for (let i = 0; i < 40; i++) { if (await page.evaluate(() => document.body.dataset.scherm === 'gevecht' && !!S.gevecht && !document.querySelector('#baas-intro'))) break; await slaap(400); }
    await slaap(900);
    await page.evaluate(() => { DICK.tempo = 1; dicktatorRoep('de_griffier'); dicktatorRoep('de_deurwaarder'); }); await slaap(900);
  };

  for (const ov of OVERGANGEN) {
    await opzet();
    await page.evaluate('(' + ov.trigger.toString() + ')()');
    await slaap(ov.wacht);
    const r = await page.evaluate(() => window.__vonnis());
    await page.screenshot({ path: path.join(UIT, 'geo_' + vp.n.replace(/[^a-z0-9]+/gi, '-') + '_' + ov.sleutel + '.png') });
    console.log('  ' + ov.naam + '  (t=' + ov.wacht + 'ms, ' + r.vw + 'x' + r.vh + ')');
    if (!r.h2) { console.log('    GEEN .vonnis h2 op dit moment'); foutN++; continue; }
    console.log('    h2  "' + r.h2.tekst + '"  y=' + r.h2.y + '..' + (r.h2.y + r.h2.h) + '  x=' + r.h2.x + '..' + (r.h2.x + r.h2.w));
    console.log('    sub ' + (r.sub ? '"' + r.sub.tekst + '" y=' + r.sub.y + '..' + (r.sub.y + r.sub.h) : '(geen)'));
    const balk = r.scene.find(e => e.naam === 'bazenbalk');
    const raken = [];
    for (const el of r.scene) {
      const o = await page.evaluate(([a, b]) => window.__overlap(a, b), [r.h2, el]);
      const regel = '      ' + el.naam.padEnd(14) + ' y=' + String(el.y).padStart(4) + '..' + String(el.y + el.h).padEnd(5)
        + ' op=' + String(el.op).padEnd(5) + ' "' + el.tekst + '"'
        + (o ? '   << OVERLAP ' + o.x + 'x' + o.y + 'px' : '');
      console.log(regel);
      // de FIGUREN tellen niet mee als botsing: de vonnisplaat hoort over het toneel te
      // liggen, en op 360px hoog bestaat er geen band tussen topbalk en figuren die een
      // titel van 35px kan dragen. De eis gaat over de UI-chroom (topbalk, hart/bazenbalk,
      // strook, zichtbare intents, spraakplaat). De overlap met een figuur wordt wel
      // gerapporteerd, zodat je ziet hoeveel het is.
      if (o && el.op > 0.01 && !/^figuur/.test(el.naam)) raken.push(el.naam + ' ' + o.x + 'x' + o.y + 'px (op=' + el.op + ')');
    }
    // eis 1 (laptop): de titel begint volledig onder de bazenbalk
    if (!vp.mobiel) {
      const marge = balk ? r.h2.y - (balk.y + balk.h) : null;
      t(marge != null && marge >= 8, ov.sleutel + ' · h2.top ' + r.h2.y + ' − bazenbalk.onder ' + (balk ? balk.y + balk.h : '?') + ' = ' + marge + 'px marge (eis >= 8)');
      const fig = r.scene.filter(e => /^figuur/.test(e.naam) && e.op > 0.01).map(e => e.y).sort((a, b) => a - b)[0];
      t(!r.sub || fig == null || r.sub.y + r.sub.h <= fig, ov.sleutel + ' · sub eindigt op ' + (r.sub ? r.sub.y + r.sub.h : '-') + ', hoogste figuur begint op ' + (fig == null ? '-' : fig) + ' (sub blijft erboven)');
    } else {
      t(raken.length === 0, ov.sleutel + ' · h2 raakt geen zichtbaar UI-element' + (raken.length ? ': ' + raken.join(', ') : ' (topbalk, hart/bazenbalk, strook, intents, spraakplaat)'));
    }
  }

  // bedrijf V — geen kaartje meer, wel de aankomstpuls op de strook
  await opzet();
  await page.evaluate(() => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.fase = 3; b.hp = 6; verliesHp(b, 30); });
  await slaap(7000);
  const m = await page.evaluate(() => window.__mandaat());
  await page.screenshot({ path: path.join(UIT, 'geo_' + vp.n.replace(/[^a-z0-9]+/gi, '-') + '_V.png') });
  console.log('  V · HET MANDAAT  (t=7000ms)');
  console.log('    kaartje in beeld: ' + m.erIsEenKaartje + ' | strookklasse "' + m.klasse + '" | animatie=' + m.animatie + ' scale=' + m.scale);
  console.log('    label "' + m.label + '" op=' + m.op);
  t(!m.erIsEenKaartje, 'V · geen eigen vonnis-kaartje meer in beeld');
  t(/V · HET MANDAAT/.test(m.label) || /V . HET MANDAAT/.test(m.label), 'V · het strooklabel draagt "⚖ V · HET MANDAAT": "' + m.label + '"');
  t(m.op > 0.9, 'V · de strook is weer volledig zichtbaar (op=' + m.op + ')');

  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  for (const vp of VIEWPORTS) {
    console.log('\n======== ' + vp.n + ' ========');
    await draaiViewport(browser, vp);
  }
  await browser.close();
  console.log('\n== ' + okN + ' ok, ' + foutN + ' fout ==');
  console.log('schoten in ' + UIT);
  process.exit(foutN ? 1 : 0);
})();
