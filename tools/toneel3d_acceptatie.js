/* ============================================================================
   HET TONEEL IN 3D (v116/v117) — HERTEST-SUITE

   Draaien (Windows, vanuit de map waar `playwright` geïnstalleerd staat):
       node toneel3d_acceptatie.js
   Geen dev-server nodig: de worktree wordt rechtstreeks vanaf schijf bediend via
   route.fulfill op http://localhost:4173/**. Zet WORKTREE hieronder (of via
   SLAYIT_WORKTREE) op de map die je wil testen.

   Headless Chromium heeft WebGL via SwiftShader — vandaar de --use-gl-vlaggen.
   Zonder werkend 3D-toneel meldt de suite dat meteen als FOUT.

   Gemeten:
     1. alle 21 gevechtsplaten x 1440x900 en 1920x1080, 3D AAN:
        |sprite-voeten - geschilderde vloerrand| <= 2% vh, geen gat, crop <= 30%
     2. de 3D-knop mid-gevecht: aan -> uit -> aan, beide toneelvormen kloppen
     3. echte gevechten (Slijmkoning, Erfprins, DICKtator): 5 beurten in 3D,
        inclusief de arena-crossfade van Het Proces
     4. resize/draai: de plaat blijft op de voetlijn
     5. het versielabel: SW-bericht en de terugval via sw.js
   ============================================================================ */
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');

const WORKTREE = process.env.SLAYIT_WORKTREE ||
  'C:\\Users\\Thomas Aelbrecht\\Desktop\\Workspace\\SLAY-IT-toneel3d';
const SHOTS = process.env.SLAYIT_SHOTS || path.join(__dirname, 'toneel3d_shots');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, fout = 0;
const t = (goed, tekst) => { goed ? ok++ : fout++; console.log('   ' + (goed ? 'ok   ' : 'FOUT ') + tekst); };
const kop = s => console.log('\n== ' + s + ' ==');

/* de GROND-tabel uit het contract §2 — de meetreferentie */
const GRONDTABEL = [
  ['act1.gevecht[0]', 'Act 1 achtergronden/Gevechtstijl1act1.webp', 68],
  ['act1.gevecht[1]', 'Act 1 achtergronden/Gevechtsijl2act1.webp', 64],
  ['act1.gevecht[2]', 'Act 1 achtergronden/Gevechtstijl3act1.webp', 61],
  ['act1.episch[0]', 'Act 1 achtergronden/GevechtstijlEPISCHGEVECHTACT1.webp', 65],
  ['act1.episch[1]', 'Act 1 achtergronden/GevechtstijlEPISCHGEVECHT2ACT1.webp', 65],
  ['act2.gevecht[0]', 'Act 2 achtergronden/Gevechtstijl1act2.webp', 71],
  ['act2.gevecht[1]', 'Act 2 achtergronden/Gevechtstijl2act2.webp', 68],
  ['act2.gevecht[2]', 'Act 2 achtergronden/Gevechtstijl3act2.webp', 69],
  ['act2.gevecht[3]', 'Act 2 achtergronden/Gevechtstijl4act2.webp', 67],
  ['act2.gevecht[4]', 'Act 2 achtergronden/Gevechtstijl5act2.webp', 61],
  ['act2.episch[0]', 'Act 2 achtergronden/Gevechtstijl act2 EPISCH 1.webp', 69],
  ['act2.episch[1]', 'Act 2 achtergronden/Gevechtstijl act2 EPISCH 2.webp', 69],
  ['act2.episch[2]', 'Act 2 achtergronden/Gevechtstijl act2 EPISCH 3.webp', 64],
  ['act3.gevecht[0]', 'Act 3 achtergronden/Gevechtstijl Act 3 stijl 1.webp', 61],
  ['act3.gevecht[1]', 'Act 3 achtergronden/Gevechtstijl Act 3 stijl 2.webp', 63],
  ['act3.gevecht[2]', 'Act 3 achtergronden/Gevechtstijl Act 3 stijl 3.webp', 61],
  ['act3.gevecht[3]', 'Act 3 achtergronden/Gevechtstijl Act 3 stijl 4.webp', 66],
  ['act3.episch[0]', 'Act 3 achtergronden/Gevechtstijl Act 3 stijl EPISCH 1.webp', 62],
  ['act3.episch[1]', 'Act 3 achtergronden/Gevechtstijl Act 3 stijl EPISCH 2.webp', 66],
  ['act3.episch[2]', 'Act 3 achtergronden/Gevechtstijl Act 3 stijl EPISCH 3.webp', 62],
  ['act3.finale', 'Act 3 achtergronden/Gevechtstijl Act 3 FINALE 1 zitting.webp', 61]
];
/* lijn-overlay-screenshots voor de visuele beoordeling (contract §9.1) */
const SHOT_SLEUTELS = new Set(['act1.gevecht[0]', 'act2.gevecht[0]', 'act2.episch[1]', 'act3.gevecht[2]', 'act3.finale']);

async function open(browser, o) {
  const ctx = await browser.newContext({
    viewport: { width: o.w, height: o.h }, deviceScaleFactor: o.dpr || 1,
    isMobile: !!o.mobiel, hasTouch: !!o.mobiel,
    userAgent: o.mobiel ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' : undefined,
    serviceWorkers: 'block'
  });
  const page = await ctx.newPage();
  page.__f = [];
  page.on('pageerror', e => page.__f.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/rest\/v1|Failed to load resource|supabase/i.test(m.text())) page.__f.push('console: ' + m.text()); });
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url());
    if (/supabase\.co/i.test(u.host) || /\/rest\/v1\//.test(u.pathname)) return route.abort();
    if (u.host !== 'localhost:4173') return route.abort();
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
    const f = path.join(WORKTREE, rel.split('/').join(path.sep));
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) return route.fulfill({ status: 404, body: 'weg' });
    return route.fulfill({ status: 200, contentType: MIME[path.extname(rel).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('slayit_wipe', '1'); localStorage.setItem('slayit_nudge', 'weg'); localStorage.setItem('slayit_wereld', '0'); });
  await page.reload({ waitUntil: 'load' }); await slaap(600);
  if (o.d3 !== undefined) await page.evaluate(d => { INST.d3 = d; }, o.d3);
  await page.evaluate(() => { INST.lite = false; });
  await page.evaluate(() => { try { toonHeldKeuze(); } catch (e) {} }); await slaap(250);
  await page.evaluate(() => { const k = document.querySelector('.held-kies'); if (k) k.click(); }); await slaap(250);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /toch beginnen/i.test(x.textContent)); if (b) b.click(); }); await slaap(1200);
  return { ctx, page };
}
async function naarGevecht(page) {
  for (let i = 0; i < 6; i++) {
    if (await page.evaluate(() => document.body.dataset.scherm === 'gevecht')) return true;
    await page.evaluate(() => { try { kiesNodeEcht(beschikbareNodes()[0]); } catch (e) {} });
    await slaap(1400);
  }
  return page.evaluate(() => document.body.dataset.scherm === 'gevecht');
}

/* de gemeten waarheid van één plaat: waar staat de geschilderde vloerrand, waar
   staan de sprite-voeten? (Lees de LAYOUT-box: de parallax-transform hoort er niet in.) */
async function meetPlaat(page, pad, grond) {
  return page.evaluate(async ([pad, grond]) => {
    const bg = document.getElementById('gevecht-achtergrond');
    const url = ACHTERGRONDEN.basis + pad;
    if (S.gevecht) S.gevecht.achtergrond = url;
    bg.style.backgroundImage = `linear-gradient(rgba(13,10,18,.32), rgba(13,10,18,.5)), url("${url}")`;
    bg.classList.add('zichtbaar');
    bg.style.backgroundSize = ''; bg.style.backgroundPosition = '';
    const im = new Image(); im.src = url;
    try { await im.decode(); } catch (e) {}
    for (let k = 0; k < 60; k++) {
      plaatsGevechtsplaat();
      if (!/cover/.test(getComputedStyle(bg).backgroundSize)) break;
      await new Promise(r => setTimeout(r, 25));
    }
    const cs = getComputedStyle(bg);
    const d3 = document.getElementById('scherm-gevecht').classList.contains('d3-actief');
    const rect = bg.getBoundingClientRect();
    const box = d3
      ? { top: parseFloat(cs.top), left: parseFloat(cs.left), width: bg.offsetWidth, height: bg.offsetHeight }
      : { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
    let W, H;
    if (/cover/.test(cs.backgroundSize)) { const s = Math.max(box.width / im.naturalWidth, box.height / im.naturalHeight); W = im.naturalWidth * s; H = im.naturalHeight * s; }
    else { const p = cs.backgroundSize.split(' '); W = parseFloat(p[0]); H = parseFloat(p[1]); }
    const bp = cs.backgroundPosition.split(' ');
    const off = (v, e, i) => /%/.test(v) ? (e - i) * parseFloat(v) / 100 : parseFloat(v);
    const left = off(bp[0], box.width, W), top = off(bp[1], box.height, H);
    const grondY = box.top + top + grond / 100 * H;
    const figuren = [];
    if (d3) {
      /* v117: de GETEKENDE voet uit Vista.voetMeting() (quad + voetmarge, mee-ademend),
         niet schermPos().voetY - dat is per definitie de aangenomen vloerlijn en zou
         zichzelf bewijzen. Dode acteurs vallen/vervagen en tellen niet mee. */
      (Vista.voetMeting ? Vista.voetMeting() : []).forEach((m, i) => {
        if (!m.dood && m.zichtbaar !== false) figuren.push({ wie: m.wie + '#' + i, y: m.y, quadY: m.quadY, marge: m.marge });
      });
    } else {
      const f = document.querySelector('.speler-figuur');
      if (f) figuren.push({ wie: 'speler', y: f.getBoundingClientRect().bottom });
    }
    const info = d3 && Vista.voetlijnInfo ? Vista.voetlijnInfo() : null;
    return {
      cover: /cover/.test(cs.backgroundSize), grondY: +grondY.toFixed(1),
      voetlijn: info ? +info.y.toFixed(1) : null,
      spreiding: info ? +info.spreiding.toFixed(1) : null,
      spelerVoet: info && info.speler !== null ? +info.speler.toFixed(1) : null,
      vijandVoet: info && info.vijanden !== null ? +info.vijanden.toFixed(1) : null,
      perFiguur: figuren.map(f => ({ wie: f.wie, d: +(((f.y - grondY) / innerHeight) * 100).toFixed(2),
        quadD: f.quadY === undefined ? null : +(((f.quadY - grondY) / innerHeight) * 100).toFixed(2) })),
      cropX: +(((W - box.width) / W) * 100).toFixed(1),
      cropY: +(((H - box.height) / H) * 100).toFixed(1),
      gat: (left > 0.5) || (top > 0.5) || (left + W < box.width - 0.5) || (top + H < box.height - 0.5)
    };
  }, [pad, grond]);
}

/* rode lijn op de geschilderde vloerrand, cirkels op de sprite-voeten */
async function lijnOverlay(page, grondY, aan) {
  await page.evaluate(([grondY, aan]) => {
    document.querySelectorAll('.meetlijn').forEach(e => e.remove());
    if (!aan) return;
    const lijn = document.createElement('div');
    lijn.className = 'meetlijn';
    lijn.style.cssText = `position:fixed;left:0;right:0;top:${grondY}px;height:2px;background:rgba(255,40,40,.92);z-index:99999;pointer-events:none`;
    document.body.appendChild(lijn);
    const stip = (x, y, kleur) => {
      const d = document.createElement('div'); d.className = 'meetlijn';
      d.style.cssText = `position:fixed;left:${x - 8}px;top:${y - 8}px;width:16px;height:16px;border:2px solid ${kleur};border-radius:50%;z-index:99999;pointer-events:none`;
      document.body.appendChild(d);
    };
    (Vista.voetMeting ? Vista.voetMeting() : []).forEach(m => {
      if (m.dood) return;
      stip(m.x, m.y, m.wie === 'speler' ? 'rgba(90,255,120,.95)' : 'rgba(90,200,255,.95)');
    });
  }, [grondY, aan]);
}

/* huidige afwijking van elke figuur t.o.v. de vloerrand van de LOPENDE plaat */
async function huidigeAfwijking(page) {
  return page.evaluate(() => {
    const bg = document.getElementById('gevecht-achtergrond');
    const cs = getComputedStyle(bg);
    const d3 = document.getElementById('scherm-gevecht').classList.contains('d3-actief');
    if (/cover/.test(cs.backgroundSize)) return { cover: true };
    const rect = bg.getBoundingClientRect();
    const box = d3 ? { top: parseFloat(cs.top), height: bg.offsetHeight } : { top: rect.top, height: rect.height };
    const H = parseFloat(cs.backgroundSize.split(' ')[1]);
    const bp = cs.backgroundPosition.split(' ');
    const top = /%/.test(bp[1]) ? (box.height - H) * parseFloat(bp[1]) / 100 : parseFloat(bp[1]);
    const g = grondVan(S.gevecht.achtergrond).grond;
    const grondY = box.top + top + g * H;
    const ys = [];
    if (d3) {
      (Vista.voetMeting ? Vista.voetMeting() : []).forEach(m => { if (!m.dood && m.zichtbaar !== false) ys.push(m.y); });
    } else {
      const f = document.querySelector('.speler-figuur'); if (f) ys.push(f.getBoundingClientRect().bottom);
    }
    return { cover: false, d3, max: +Math.max(...ys.map(y => Math.abs((y - grondY) / innerHeight * 100))).toFixed(2) };
  });
}

(async () => {
  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });

  /* ---- 1. de 21 platen op het 3D-toneel ---- */
  for (const f of [{ naam: '1440x900', w: 1440, h: 900 }, { naam: '1920x1080', w: 1920, h: 1080 }]) {
    kop('3D-toneel ' + f.naam + ' — 21 gevechtsplaten');
    const { ctx, page } = await open(browser, { ...f, d3: true });
    await naarGevecht(page); await slaap(900);
    const staat = await page.evaluate(() => ({
      beschikbaar: Vista.beschikbaar(), d3: INST.d3,
      actief: document.getElementById('scherm-gevecht').classList.contains('d3-actief'),
      modus: document.body.dataset.modus
    }));
    t(staat.beschikbaar && staat.d3 && staat.actief && staat.modus === 'laptop',
      'WebGL + 3D-toneel actief (' + JSON.stringify(staat) + ')');
    let mis = 0, gaten = 0, cover = 0, crop = [], ergste = 0, ergsteNaam = '';
    for (const [sleutel, pad, grond] of GRONDTABEL) {
      const m = await meetPlaat(page, pad, grond);
      const maxFig = Math.max(...m.perFiguur.map(x => Math.abs(x.d)));
      if (maxFig > ergste) { ergste = maxFig; ergsteNaam = sleutel; }
      if (maxFig > 2) { mis++; console.log('        ' + sleutel + ' max ' + maxFig.toFixed(2) + '% vh — ' + JSON.stringify(m.perFiguur)); }
      if (m.gat) { gaten++; console.log('        ' + sleutel + ' GAT'); }
      if (m.cover) { cover++; console.log('        ' + sleutel + ' bleef op cover'); }
      if (m.cropX > 30) crop.push(sleutel + ' ' + m.cropX + '%');
      if (SHOT_SLEUTELS.has(sleutel)) {
        await lijnOverlay(page, m.grondY, true);
        await page.screenshot({ path: path.join(SHOTS, 'lijn-' + f.naam + '-' + sleutel.replace(/[^a-z0-9]/gi, '_') + '.png') });
        await lijnOverlay(page, 0, false);
      }
    }
    t(mis === 0, f.naam + ': alle 21 platen binnen 2% vh (ergste ' + ergste.toFixed(2) + '% — ' + ergsteNaam + ')');
    t(cover === 0, f.naam + ': geen plaat bleef op cover staan');
    t(gaten === 0, f.naam + ': geen plaat toont een gat');
    t(crop.length === 0, f.naam + ': horizontale crop <= 30%' + (crop.length ? ' — ' + crop.join(', ') : ''));
    t(page.__f.length === 0, f.naam + ': geen paginafouten' + (page.__f.length ? ' — ' + page.__f[0] : ''));
    await ctx.close();
  }

  /* ---- 2. de 3D-knop mid-gevecht, beide richtingen ---- */
  kop('3D-knop mid-gevecht (aan -> uit -> aan)');
  {
    const { ctx, page } = await open(browser, { w: 1440, h: 900, d3: true });
    await naarGevecht(page); await slaap(900);
    const aan1 = await huidigeAfwijking(page);
    t(aan1.d3 === true && !aan1.cover && aan1.max <= 2, '3D AAN: plaat op de sprite-voetlijn (' + aan1.max + '% vh)');
    await page.evaluate(() => { $('#inst-d3').checked = false; instWijzig(); }); await slaap(700);
    const uit = await huidigeAfwijking(page);
    const uitKlasse = await page.evaluate(() => document.getElementById('scherm-gevecht').classList.contains('d3-actief'));
    t(!uitKlasse && !uit.cover && uit.max <= 2, '3D UIT: 2D-toneel terug, plaat op de 2D-voetlijn (' + uit.max + '% vh)');
    await page.screenshot({ path: path.join(SHOTS, 'knop-3d-uit.png') });
    await page.evaluate(() => { $('#inst-d3').checked = true; instWijzig(); }); await slaap(900);
    const aan2 = await huidigeAfwijking(page);
    const aanKlasse = await page.evaluate(() => document.getElementById('scherm-gevecht').classList.contains('d3-actief'));
    t(aanKlasse && !aan2.cover && aan2.max <= 2, '3D weer AAN: plaat terug op de sprite-voetlijn (' + aan2.max + '% vh)');
    await page.screenshot({ path: path.join(SHOTS, 'knop-3d-aan.png') });
    /* resize/draai: de plaat moet meeschuiven */
    await page.setViewportSize({ width: 1280, height: 720 }); await slaap(700);
    const na = await huidigeAfwijking(page);
    t(!na.cover && na.max <= 2, 'na resize naar 1280x720: nog steeds op de voetlijn (' + na.max + '% vh)');
    t(page.__f.length === 0, 'geen paginafouten' + (page.__f.length ? ' — ' + page.__f[0] : ''));
    await ctx.close();
  }

  /* ---- 3. echte gevechten: 5 beurten in 3D ---- */
  kop('echte gevechten in 3D (5 beurten)');
  for (const gev of [
    { naam: 'Slijmkoning', start: () => { S.act = 1; startGevecht(['slijmkoning'], 'baas', 8); } },
    { naam: 'Erfprins', start: () => { devSprongAct2(); startGevecht(['de_erfprins'], 'baas', 10); } },
    { naam: 'DICKtator', start: () => { devDicktator('slachter_mid'); } }
  ]) {
    const { ctx, page } = await open(browser, { w: 1440, h: 900, d3: true });
    await naarGevecht(page); await slaap(600);
    await page.evaluate(new Function('return (' + gev.start.toString() + ')()')); await slaap(2600);
    const staat = await page.evaluate(() => ({
      scherm: document.body.dataset.scherm,
      d3: document.getElementById('scherm-gevecht').classList.contains('d3-actief'),
      vijand: S.gevecht ? S.gevecht.vijanden.map(v => v.id).join(',') : ''
    }));
    let beurten = 0;
    for (let i = 0; i < 5; i++) {
      const voorbij = await page.evaluate(() => !S.gevecht || S.gevecht.voorbij);
      if (voorbij) break;
      await page.evaluate(() => { try { eindBeurt(); } catch (e) {} });
      await slaap(2200); beurten++;
    }
    const m = await huidigeAfwijking(page);
    t(staat.d3 && staat.scherm === 'gevecht', gev.naam + ': start op het 3D-toneel (' + staat.vijand + ')');
    t(beurten >= 3, gev.naam + ': ' + beurten + ' beurten gespeeld');
    t(m.cover === false && m.max <= 2, gev.naam + ': plaat op de voetlijn na de beurten (' + m.max + '% vh)');
    await page.screenshot({ path: path.join(SHOTS, 'gevecht-' + gev.naam.toLowerCase() + '.png') });
    /* Het Proces: de arena-crossfade (in 3D een harde wissel) mag de grondlijn niet lossen */
    if (gev.naam === 'DICKtator') {
      await page.evaluate(() => { toonArenaWissel(ACHTERGRONDEN.basis + ACHTERGRONDEN.act3.finaleFasen.verschuiving); }); await slaap(900);
      const w = await huidigeAfwijking(page);
      t(!w.cover && w.max <= 2, 'DICKtator: na de arenawissel nog op de voetlijn (' + w.max + '% vh)');
      await page.screenshot({ path: path.join(SHOTS, 'gevecht-dicktator-arenawissel.png') });
    }
    t(page.__f.length === 0, gev.naam + ': geen paginafouten' + (page.__f.length ? ' — ' + page.__f[0] : ''));
    await ctx.close();
  }

  /* ---- 4. het versielabel ---- */
  kop('versielabel in de instellingen');
  {
    const { ctx, page } = await open(browser, { w: 1440, h: 900, d3: true });
    /* terugval: geen service worker (geblokkeerd) -> sw.js ophalen en de CACHE-regel lezen */
    await page.evaluate(() => { toonInstellingen(); });
    await page.waitForFunction(() => document.getElementById('inst-versie').textContent.trim().length > 0, null, { timeout: 5000 }).catch(() => {});
    const terugval = await page.evaluate(() => document.getElementById('inst-versie').textContent.trim());
    t(/^v\d+$/.test(terugval), 'terugval zonder SW toont een versie: "' + terugval + '"');
    const swVersie = (fs.readFileSync(path.join(WORKTREE, 'sw.js'), 'utf8').match(/CACHE\s*=\s*'([^']+)'/) || [])[1];
    t(terugval === 'v' + (swVersie || '').replace(/^slayit-v/, ''), 'terugval toont dezelfde versie als sw.js (' + swVersie + ')');
    await page.screenshot({ path: path.join(SHOTS, 'versielabel.png') });
    /* SW-bericht simuleren (zoals de service worker het bij activate stuurt) */
    const naBericht = await page.evaluate(async () => {
      navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: { type: 'versie', cache: 'slayit-v999' } }));
      await new Promise(r => setTimeout(r, 60));
      return document.getElementById('inst-versie').textContent.trim();
    });
    t(naBericht === 'v999', 'SW-bericht bij activate zet het label (' + naBericht + ')');
    t(page.__f.length === 0, 'geen paginafouten' + (page.__f.length ? ' — ' + page.__f[0] : ''));
    await ctx.close();
  }
  t(/const CACHE = 'slayit-v117'/.test(fs.readFileSync(path.join(WORKTREE, 'sw.js'), 'utf8')), "sw.js staat op slayit-v117");

  await browser.close();
  console.log('\nSAMENVATTING ok ' + ok + ' fout ' + fout + '   (screenshots: ' + SHOTS + ')');
  process.exit(fout ? 1 : 0);
})();
