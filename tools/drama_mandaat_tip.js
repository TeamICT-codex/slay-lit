// ACCEPTATIESUITE: is de duiding van V · HET MANDAAT écht BEREIKBAAR? (eindpolish v121)
//
// Bedrijf V heeft sinds P1 geen eigen vonnis-kaartje meer; de duiding "Hij int nu zelf.
// De opzegtermijn loopt." leeft nu in de data-tip van de beleidspil (.bb-aegis). Die pil
// hangt in #baas-balk, en dat element staat op pointer-events:none - wat doorerft. Zonder
// een eigen `pointer-events: auto` op de pil is die tip met muis noch vinger te bereiken
// en is de regel dus alsnog stil uit het stuk verdwenen. GEEN ANDERE SUITE DEKT DIT:
// drama_stap_b_* meten de puls, drama_vonnis_geometrie meet de plaatsing. Vandaar deze.
//
// Per spoor, ná de volledige herverkiezing-regie (t=9000):
//   - pointer-events van de pil + elementFromPoint op haar midden
//   - een ECHTE muisbeweging (page.mouse.move) -> #tooltip zichtbaar mét de duiding
//   - op mobiel ook een ECHTE tik (touchscreen.tap) -> dezelfde tip
//   - DE PRIJS van die auto: de pil geeft haar tikken niet meer door. Negen peilpunten
//     over de bazenfiguur moeten raakbaar blijven (>= 8 van de 9, en het midden altijd) -
//     op 800x360 dekt het breedste label een hoek van 18x22px van de bazendoos af.
// En tijdens body.ceremonie (t=1500): pil op opacity 0 én pointer-events:none, en
// #beurt-label uit de titelband (P2 + eindpolish).
//
// DRAAIEN (Git Bash, vanuit de scratchpad met node_modules/playwright):
//   NODE_PATH="$PWD/node_modules" SLAYIT_WORKTREE="...\SLAY-IT-drama" \
//     SLAYIT_SHOTS="$PWD/tip_shots" node "...\SLAY-IT-drama/tools/drama_mandaat_tip.js"
// SLAYIT_SHOTS is optioneel: zonder die variabele wordt er niets weggeschreven.
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const WT = process.env.SLAYIT_WORKTREE || 'C:/Users/Thomas Aelbrecht/Desktop/Workspace/SLAY-IT-drama';
const HOST = 'localhost:4182';
const UIT = process.env.SLAYIT_SHOTS;
if (UIT) fs.mkdirSync(UIT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));
let okN = 0, foutN = 0;
const t = (goed, tekst) => { if (goed) { okN++; console.log('    ok   ' + tekst); } else { foutN++; console.log('    FOUT ' + tekst); } };

const SPOREN = [
  { n: 'laptop normaal', w: 1440, h: 900, mobiel: false, lite: false, rm: 'no-preference' },
  { n: 'laptop lite', w: 1440, h: 900, mobiel: false, lite: true, rm: 'no-preference' },
  { n: 'laptop reduced', w: 1440, h: 900, mobiel: false, lite: false, rm: 'reduce' },
  { n: 'mobiel liggend 915x412', w: 915, h: 412, mobiel: true, lite: false, rm: 'no-preference' },
  /* de krapste liggende telefoon: hier én alleen hier legt het breedste label een hoek
     over de bazendoos, dus dit is het spoor dat de raakzone-eis echt op de proef stelt */
  { n: 'mobiel liggend 800x360', w: 800, h: 360, mobiel: true, lite: false, rm: 'no-preference' }
];

async function spoor(browser, sp) {
  const ctx = await browser.newContext({ viewport: { width: sp.w, height: sp.h }, serviceWorkers: 'block', hasTouch: sp.mobiel, isMobile: sp.mobiel, deviceScaleFactor: 1, reducedMotion: sp.rm });
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
  if (sp.mobiel) await page.evaluate(() => { document.body.dataset.modus = 'mobiel'; window.mobiel = true; });
  await page.evaluate(l => { INST.d3 = false; INST.lite = l; document.body.classList.toggle('lite', l); try { bewaarInst(); } catch (e) {} try { toonHeldKeuze(); } catch (e) {} }, sp.lite); await slaap(300);
  await page.evaluate(() => { const k = document.querySelector('.held-kies'); if (k) k.click(); }); await slaap(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /toch beginnen/i.test(x.textContent)); if (b) b.click(); }); await slaap(800);
  await page.evaluate(() => { devDicktator('slachter_mid'); });
  for (let i = 0; i < 20; i++) { if (await page.evaluate(() => document.body.dataset.scherm === 'gevecht' && !!S.gevecht)) break; await slaap(200); }
  await page.evaluate(() => { const db = document.getElementById('draai-blok'); if (db && db.classList.contains('toon')) { try { speelTochStaand(); } catch (e) { db.classList.remove('toon'); } } }); await slaap(200);
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => document.body.dataset.scherm === 'gevecht' && !!S.gevecht && !document.querySelector('#baas-intro'))) break; await slaap(400); }
  await slaap(900);
  await page.evaluate(() => { DICK.tempo = 1; dicktatorRoep('de_griffier'); dicktatorRoep('de_deurwaarder'); }); await slaap(900);

  // --- de herverkiezing, en een meting MIDDEN in de ceremonie ---
  await page.evaluate(() => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.fase = 3; b.hp = 6; verliesHp(b, 30); });
  await slaap(1500);
  const mid = await page.evaluate(() => {
    const pil = document.querySelector('#baas-balk .bb-aegis');
    const bl = document.getElementById('beurt-label');
    const it = document.querySelector('.intent');
    const cs = e => e ? getComputedStyle(e) : null;
    return {
      ceremonie: document.body.classList.contains('ceremonie'),
      pilPe: pil ? cs(pil).pointerEvents : '(geen pil)',
      pilOp: pil ? cs(pil.closest('.bb-extra')).opacity : '-',
      beurtOp: bl ? cs(bl).opacity : '(geen)',
      beurtDisplay: bl ? cs(bl).display : '(geen)',
      intentOp: it ? cs(it).opacity : '(geen)'
    };
  });
  console.log('  TIJDENS de ceremonie: body.ceremonie=' + mid.ceremonie + '  pil pointer-events=' + mid.pilPe
    + ' strook-opacity=' + mid.pilOp + '  #beurt-label opacity=' + mid.beurtOp + ' (display ' + mid.beurtDisplay + ')  intent opacity=' + mid.intentOp);
  t(mid.ceremonie, 'de ceremonie loopt op t=1500');
  t(mid.pilPe === 'none', 'tijdens de ceremonie vangt de onzichtbare pil geen tip (pointer-events=' + mid.pilPe + ')');
  t(parseFloat(mid.pilOp) < 0.05, 'tijdens de ceremonie is de strook weg (opacity=' + mid.pilOp + ')');
  t(mid.beurtDisplay === 'none' || parseFloat(mid.beurtOp) < 0.05, '#beurt-label staat niet in de titelband (opacity=' + mid.beurtOp + ', display=' + mid.beurtDisplay + ')');

  // --- ná de regie: is de tip bereikbaar? ---
  await slaap(7500);
  const rust = await page.evaluate(() => {
    const pil = document.querySelector('#baas-balk .bb-aegis');
    if (!pil) return { pil: false };
    const b = pil.getBoundingClientRect();
    const x = Math.round(b.x + b.width / 2), y = Math.round(b.y + b.height / 2);
    const raak = document.elementFromPoint(x, y);
    return {
      pil: true, x: x, y: y,
      pe: getComputedStyle(pil).pointerEvents,
      op: window.getComputedStyle(pil.closest('.bb-extra')).opacity,
      label: (pil.textContent || '').trim(),
      tip: pil.dataset.tip || '',
      raak: raak ? (raak.tagName.toLowerCase() + '.' + (raak.className || '(geen klasse)')) : '(niets)',
      raakIsPil: !!(raak && raak.closest('[data-tip]') === pil)
    };
  });
  console.log('  IN RUSTSTAND (t=9000): pil "' + rust.label + '"');
  console.log('    pointer-events=' + rust.pe + '  strook-opacity=' + rust.op + '  elementFromPoint(' + rust.x + ',' + rust.y + ') = ' + rust.raak);
  t(rust.pil, 'de beleidspil staat in beeld');
  t(/V . HET MANDAAT/.test(rust.label), 'de pil draagt het label V · HET MANDAAT: "' + rust.label + '"');
  t(/Hij int nu zelf/.test(rust.tip), 'de data-tip draagt de duiding "Hij int nu zelf. De opzegtermijn loopt."');
  t(rust.pe === 'auto', 'pointer-events van de pil = auto (gemeten "' + rust.pe + '")');
  t(rust.raakIsPil, 'elementFromPoint op het midden van de pil levert de pil zelf (gemeten ' + rust.raak + ')');

  // ECHTE muisbeweging: de haak is document.mouseover + closest('[data-tip]')
  await page.mouse.move(rust.x - 6, rust.y - 4);
  await page.mouse.move(rust.x, rust.y); await slaap(250);
  const muis = await page.evaluate(() => {
    const tip = document.getElementById('tooltip');
    return { display: tip ? getComputedStyle(tip).display : '(geen tooltip)', tekst: tip ? (tip.textContent || '') : '' };
  });
  console.log('    muis-hover -> #tooltip display=' + muis.display + '  "' + muis.tekst.slice(0, 150) + '..."');
  t(muis.display === 'block' && /Hij int nu zelf/.test(muis.tekst), 'muis-hover toont de tip MET de duiding');
  if (UIT) await page.screenshot({ path: path.join(UIT, 'tip_' + sp.n.replace(/[^a-z0-9]+/gi, '-') + '_muis.png') });

  if (sp.mobiel) {
    await page.evaluate(() => { const tip = document.getElementById('tooltip'); if (tip) tip.style.display = 'none'; });
    await page.touchscreen.tap(rust.x, rust.y); await slaap(250);
    const tik = await page.evaluate(() => {
      const tip = document.getElementById('tooltip');
      return { display: tip ? getComputedStyle(tip).display : '(geen tooltip)', tekst: tip ? (tip.textContent || '') : '' };
    });
    console.log('    vinger-tik -> #tooltip display=' + tik.display + '  "' + tik.tekst.slice(0, 150) + '..."');
    t(tik.display === 'block' && /Hij int nu zelf/.test(tik.tekst), 'een tik met de vinger toont dezelfde tip');
    if (UIT) await page.screenshot({ path: path.join(UIT, 'tip_' + sp.n.replace(/[^a-z0-9]+/gi, '-') + '_tik.png') });
  }

  /* DE PRIJS VAN pointer-events:auto — een pil die tikken vangt, geeft ze niet door aan de
     figuur eronder. #vijanden-rij werkt met click-delegatie op .vijand, dus een tik die op
     de pil landt, mist zijn doel. Negen peilpunten over de bazenfiguur: het MIDDEN moet
     altijd raakbaar zijn en minstens 8 van de 9. Met het breedste label (⚖ V · HET MANDAAT
     · ⏳ ONTSLAG · 🧾) dekt de pil op 800x360 een hoek van 18x22px van de bazendoos af; in
     de gewone gevechtsstand is ze smal ("🧾 6+3") en overlapt ze nergens iets. De dode
     hovelingen (opacity 0) tellen niet mee - die zijn sowieso niet aanklikbaar. */
  const zone = await page.evaluate(() => {
    const pil = document.querySelector('#baas-balk .bb-aegis');
    const pr = pil ? pil.getBoundingClientRect() : null;
    const inVijand = (x, y) => { const e = document.elementFromPoint(Math.round(x), Math.round(y)); return !!(e && e.closest && e.closest('.vijand')); };
    const uit = [];
    [...document.querySelectorAll('#vijanden-rij .vijand')].forEach((v, i) => {
      if (parseFloat(getComputedStyle(v).opacity) < 0.01) return;
      const a = v.querySelector('.vijand-art'); if (!a) return;
      const b = a.getBoundingClientRect(); if (!(b.width > 0)) return;
      let n = 0;
      for (const fy of [0.15, 0.5, 0.85]) for (const fx of [0.15, 0.5, 0.85]) if (inVijand(b.x + b.width * fx, b.y + b.height * fy)) n++;
      const ov = pr ? Math.max(0, Math.min(pr.right, b.right) - Math.max(pr.x, b.x)) * Math.max(0, Math.min(pr.bottom, b.bottom) - Math.max(pr.y, b.y)) : 0;
      uit.push({ naam: 'vijand ' + i + (v.classList.contains('is-baas') ? ' (baas)' : ''), n: n, midden: inVijand(b.x + b.width / 2, b.y + b.height / 2), overlap: Math.round(ov) });
    });
    return uit;
  });
  for (const z of zone) {
    console.log('    raakzone ' + z.naam.padEnd(16) + ' ' + z.n + '/9 peilpunten in .vijand, midden=' + z.midden + ', pil dekt ' + z.overlap + 'px²');
    t(z.midden && z.n >= 8, 'raakzone ' + z.naam + ' blijft staan (' + z.n + '/9, midden=' + z.midden + ')');
  }
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  for (const sp of SPOREN) { console.log('\n======== ' + sp.n + ' ========'); await spoor(browser, sp); }
  await browser.close();
  console.log('\n== ' + okN + ' ok, ' + foutN + ' fout ==');
  process.exit(foutN ? 1 : 0);
})();
