/* ============================================================================
   HET TONEEL (v114) — HERTEST-SUITE
   Loopt de acceptatie uit .claude/notities/toneel_contract.md §9 automatisch af.

   Draaien (Windows, vanuit de map waar `playwright` geïnstalleerd staat):
       node toneel_acceptatie.js
   Het script heeft GEEN dev-server nodig: het bedient de worktree rechtstreeks
   vanaf schijf via route.fulfill op http://localhost:4173/**. Zet WORKTREE
   hieronder op de map die je wil testen.

   Vereist: `npm i playwright` (chromium) in de map van dit script, of draaien
   met NODE_PATH naar een node_modules waar playwright in zit.
   ============================================================================ */
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');

const WORKTREE = process.env.SLAYIT_WORKTREE ||
  'C:\\Users\\Thomas Aelbrecht\\Desktop\\Workspace\\SLAY-IT-toneel';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));

let ok = 0, fout = 0;
const t = (goed, tekst) => { goed ? ok++ : fout++; console.log('   ' + (goed ? 'ok   ' : 'FOUT ') + tekst); };
const kop = s => console.log('\n== ' + s + ' ==');

/* ---------- de GROND-tabel uit het contract §2 (de meetreferentie) ---------- */
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
/* platen waarvan de compositie tegen het toneel vecht (contract §8): hun horizontale
   crop mag boven de 30% uitkomen tot hun nieuwe plaat er is. */
const HERGENEREER = new Set(['act2.gevecht[0]', 'act2.gevecht[2]', 'act2.episch[0]', 'act2.episch[1]']);

async function open(browser, o) {
  const ctx = await browser.newContext({
    viewport: { width: o.w, height: o.h },
    deviceScaleFactor: o.dpr || 1,
    isMobile: !!o.mobiel, hasTouch: !!o.mobiel,
    userAgent: o.mobiel ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' : undefined,
    serviceWorkers: 'block'
  });
  if (o.kernen || o.geheugen) {
    await ctx.addInitScript(([k, g]) => {
      if (k) Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => k });
      if (g) Object.defineProperty(navigator, 'deviceMemory', { get: () => g });
    }, [o.kernen || 0, o.geheugen || 0]);
  }
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
    for (let k = 0; k < 60; k++) {          /* de plaatverhouding wordt async gemeten */
      plaatsGevechtsplaat();
      if (!/cover/.test(getComputedStyle(bg).backgroundSize)) break;
      await new Promise(r => setTimeout(r, 25));
    }
    const r = bg.getBoundingClientRect(), cs = getComputedStyle(bg);
    let W, H;
    if (/cover/.test(cs.backgroundSize)) { const s = Math.max(r.width / im.naturalWidth, r.height / im.naturalHeight); W = im.naturalWidth * s; H = im.naturalHeight * s; }
    else { const p = cs.backgroundSize.split(' '); W = parseFloat(p[0]); H = parseFloat(p[1]); }
    const bp = cs.backgroundPosition.split(' ');
    const off = (v, e, i) => /%/.test(v) ? (e - i) * parseFloat(v) / 100 : parseFloat(v);
    const left = off(bp[0], r.width, W), top = off(bp[1], r.height, H);
    const fig = document.querySelector('.speler-figuur');
    const voetY = fig ? fig.getBoundingClientRect().bottom : null;
    const grondY = r.top + top + grond / 100 * H;
    return {
      deltaPctVh: +(((voetY - grondY) / innerHeight) * 100).toFixed(2),
      cropX: +(((W - r.width) / W) * 100).toFixed(1),
      gat: (left > 0.5) || (top > 0.5) || (left + W < r.width - 0.5) || (top + H < r.height - 0.5)
    };
  }, [pad, grond]);
}

(async () => {
  const browser = await chromium.launch();

  /* ---- §9.1 + §9.2 — voetlijn op de vloerrand, geen gaten, crop <= 30% ---- */
  kop('§9.1/9.2 grondlijn per plaat (21 platen x 5 formaten)');
  for (const f of [
    { naam: '1440x900 d3-uit', w: 1440, h: 900, dpr: 1, mobiel: false, d3: false },
    { naam: '1920x1080 d3-uit', w: 1920, h: 1080, dpr: 1, mobiel: false, d3: false },
    { naam: '800x360', w: 800, h: 360, dpr: 3, mobiel: true },
    { naam: '915x412', w: 915, h: 412, dpr: 3, mobiel: true },
    { naam: '412x915 (portret)', w: 412, h: 915, dpr: 3, mobiel: true }
  ]) {
    const { ctx, page } = await open(browser, f);
    await naarGevecht(page); await slaap(400);
    let mis = 0, gaten = 0, crop = [], cropLet = [];
    for (const [sleutel, pad, grond] of GRONDTABEL) {
      const m = await meetPlaat(page, pad, grond);
      if (Math.abs(m.deltaPctVh) > 2) { mis++; console.log('        ' + sleutel + ' delta ' + m.deltaPctVh + '% vh'); }
      if (m.gat) { gaten++; console.log('        ' + sleutel + ' GAT'); }
      /* Een hergeneratie-kandidaat mag boven de 30% uitkomen tot zijn nieuwe plaat er
         is, maar hij wordt NIET stil weggefilterd: dan zou de test groen worden door de
         falende casus uit te sluiten. Hij komt als WAARSCHUWING met het gemeten getal
         in beeld, zodat de afwijking zichtbaar blijft zolang ze bestaat. */
      if (m.cropX > 30 && f.h < f.w) {
        (HERGENEREER.has(sleutel) ? cropLet : crop).push(sleutel + ' ' + m.cropX + '%');
      }
    }
    t(mis === 0, f.naam + ': alle 21 platen binnen 2% vh' + (mis ? ' (' + mis + ' mis)' : ''));
    t(gaten === 0, f.naam + ': geen plaat toont een gat');
    if (cropLet.length) console.log('   LET OP ' + f.naam + ': crop > 30% bij een hergeneratie-kandidaat — ' + cropLet.join(', ') +
      '  (contract §8 laat dit toe tot de nieuwe plaat er is; §9.2 noemt die uitzondering niet — open punt, zie RELEASE-CHECKLIST §2)');
    t(crop.length === 0, f.naam + ': horizontale crop <= 30% (portret uitgezonderd; hergeneratie-kandidaten apart gemeld)' + (crop.length ? ' — ' + crop.join(', ') : ''));
    t(page.__f.length === 0, f.naam + ': geen paginafouten' + (page.__f.length ? ' — ' + page.__f[0] : ''));
    await ctx.close();
  }

  /* ---- §9.3 + §9.4 — figuurmaat en de Chromebook-heuristiek ---- */
  kop('§9.3/9.4 figuurmaat (--toneel-k) en lite-drempel');
  const maten = {};
  for (const o of [
    { naam: 'Chromebook 1920x1080 (4 kernen/4 GB, eigen keuze)', w: 1920, h: 1080, dpr: 1, mobiel: false, kernen: 4, geheugen: 4 },
    { naam: 'Chromebook 1920x1080 d3 UIT', w: 1920, h: 1080, dpr: 1, mobiel: false, kernen: 4, geheugen: 4, d3: false },
    { naam: 'laptop 1440x900 d3 UIT', w: 1440, h: 900, dpr: 1, mobiel: false, d3: false }
  ]) {
    const { ctx, page } = await open(browser, o);
    await naarGevecht(page); await slaap(400);
    maten[o.naam] = await page.evaluate(() => {
      const rij = document.getElementById('vijanden-rij');
      const echt = [...rij.children]; echt.forEach(e => e.remove());
      const meet = kl => {
        const d = document.createElement('div'); d.className = 'vijand ' + kl;
        const a = document.createElement('div'); a.className = 'vijand-art';
        d.appendChild(a); rij.appendChild(d);
        const w = Math.round(a.getBoundingClientRect().width); d.remove(); return w;
      };
      const r = {
        speler: Math.round(document.querySelector('.speler-figuur').getBoundingClientRect().width),
        vijand: meet(''), elite: meet('is-elite'), episch: meet('is-episch'), baas: meet('is-baas'),
        k: parseFloat(getComputedStyle(document.getElementById('scherm-gevecht')).getPropertyValue('--toneel-k')),
        d3: INST.d3, d3Actief: document.getElementById('scherm-gevecht').classList.contains('d3-actief'),
        lite: document.body.classList.contains('lite')
      };
      echt.forEach(e => rij.appendChild(e));
      return r;
    });
    await ctx.close();
  }
  const cb = maten['Chromebook 1920x1080 (4 kernen/4 GB, eigen keuze)'];
  const cbu = maten['Chromebook 1920x1080 d3 UIT'];
  const lap = maten['laptop 1440x900 d3 UIT'];
  t(cb.d3 === true && cb.d3Actief === true && cb.lite === false, '§9.4 Chromebook (4/4) krijgt standaard het 3D-toneel, niet lite');
  t(cbu.baas >= 200, '§9.3 baas op 1920x1080 met d3 uit >= 200px (gemeten ' + cbu.baas + 'px)');
  t(Math.abs(lap.baas - 176 * lap.k) <= 2, '§9.3 baas op 1440x900 ~= 176 x k (gemeten ' + lap.baas + 'px, k=' + lap.k + ')');
  const verhouding = m => [m.vijand / m.baas, m.elite / m.baas, m.episch / m.baas, m.speler / m.baas];
  const v1 = verhouding(cbu), v2 = verhouding(lap);
  t(v1.every((x, i) => Math.abs(x - v2[i]) < 0.02), '§9.3 verhoudingen speler/vijand/elite/episch/baas ongewijzigd tussen de twee schermen');

  /* ---- §9.5 — contactschaduw onder elke figuur ---- */
  kop('§9.5 contactschaduw');
  for (const f of [
    { naam: 'laptop 1440x900 d3 uit', w: 1440, h: 900, dpr: 1, mobiel: false, d3: false },
    { naam: 'laptop 1440x900 d3 aan', w: 1440, h: 900, dpr: 1, mobiel: false, d3: true },
    { naam: 'telefoon 412x915', w: 412, h: 915, dpr: 3, mobiel: true }
  ]) {
    const { ctx, page } = await open(browser, f);
    await naarGevecht(page); await slaap(300);
    await page.evaluate(() => { try { devMetgezel('drops'); } catch (e) {} S.act = 3; startGevecht(['de_dicktator', 'de_griffier', 'de_deurwaarder', 'de_zondebok'], 'baas'); });
    await slaap(2600);
    const r = await page.evaluate(() => {
      const d3 = document.getElementById('scherm-gevecht').classList.contains('d3-actief');
      const rij = [];
      const kijk = (naam, fig, sch) => {
        if (!fig) return;
        const kl = parseFloat(getComputedStyle(fig).scale);
        const breed = Math.round(fig.offsetWidth * (isFinite(kl) && kl > 0 ? kl : 1));
        const zicht = !!sch && getComputedStyle(sch).display !== 'none';
        rij.push({
          naam, breed, voet: Math.round(fig.getBoundingClientRect().bottom), zicht,
          vsB: zicht ? parseFloat(getComputedStyle(sch).getPropertyValue('--vs-b')) : null,
          ovaalY: zicht ? Math.round(sch.getBoundingClientRect().top) : null
        });
      };
      kijk('held', document.querySelector('#speler-zone .speler-figuur'), document.querySelector('#speler-zone .voetschaduw'));
      const mz = document.getElementById('metgezel-zone');
      if (mz && !mz.hidden) kijk('metgezel', mz.querySelector('.metgezel-art'), mz.querySelector('.voetschaduw'));
      document.querySelectorAll('#vijanden-rij .vijand').forEach((v, i) => kijk('vijand' + i, v.querySelector('.vijand-art'), v.querySelector('.voetschaduw')));
      /* drop-shadow-vrij: de ovaal zelf mag geen filter dragen */
      const s0 = document.querySelector('.voetschaduw');
      const filter = s0 ? getComputedStyle(s0).filter : 'none';
      return { d3, rij, filter };
    });
    const moet = n => r.d3 ? n === 'metgezel' : true;
    const mis = r.rij.filter(x => x.zicht !== moet(x.naam) ||
      (x.zicht && (Math.abs(x.vsB - Math.round(x.breed * 0.7)) > 1 || Math.abs(x.ovaalY - x.voet) > 3)));
    t(mis.length === 0, f.naam + ': elke figuur heeft zijn ovaal op de voetlijn, op maat' + (mis.length ? ' — ' + mis.map(x => x.naam).join(', ') : ''));
    t(r.filter === 'none', f.naam + ': de contactschaduw is drop-shadow-vrij');
    await ctx.close();
  }


  /* ---- §9.5b — de wegen waarop de suite eerder BLIND was ----
     (1) de arena-crossfade van Het Proces MIDDEN in de fade: beide lagen moeten op
         dezelfde grondlijn staan, niet pas na afloop (de oude meting keek 1800 ms
         later en alleen naar laag 1, en zag de sprong van 9,9% vh op 800x360 dus niet);
     (2) een figuur die MIDDEN in het gevecht bijkomt (splijtende Slijmkoning,
         dicktatorRoep/het hof, het Drops-de-Witte-moment): bouwGevechtDom vervangt de
         hele rij, dus alle contactschaduwen moeten daarna opnieuw op maat staan;
     (3) de 3D-knop in de instellingen tijdens een gevecht (staat letterlijk in het
         testrecept): plaat en schaduwen moeten meeschakelen zonder resize. */
  kop('§9.5b crossfade tijdens de fade, nieuwkomers en de 3D-knop');
  for (const f of [
    { naam: 'laptop 1440x900 d3 uit', w: 1440, h: 900, dpr: 1, mobiel: false, d3: false },
    { naam: 'telefoon 800x360', w: 800, h: 360, dpr: 3, mobiel: true },
    { naam: 'telefoon 412x915', w: 412, h: 915, dpr: 3, mobiel: true }
  ]) {
    const { ctx, page } = await open(browser, f);
    await naarGevecht(page); await slaap(300);
    await page.evaluate(async () => {
      try { devMetgezel('drops'); } catch (e) {}
      S.act = 3; startGevecht(['de_dicktator'], 'baas');
      await new Promise(r => setTimeout(r, 2000));
    });
    /* (1) crossfade, gemeten op vier momenten TIJDENS de fade */
    const xf = await page.evaluate(async () => {
      const bg = document.getElementById('gevecht-achtergrond');
      const url = ACHTERGRONDEN.basis + ACHTERGRONDEN.act3.finaleFasen.verschuiving;
      const im = new Image(); im.src = url; try { await im.decode(); } catch (e) {}
      const vloerY = el => {
        if (!el) return null;
        const cs = getComputedStyle(el), r = el.getBoundingClientRect();
        let W, H;
        if (/cover/.test(cs.backgroundSize)) { const s = Math.max(r.width / im.naturalWidth, r.height / im.naturalHeight); W = im.naturalWidth * s; H = im.naturalHeight * s; }
        else { const p = cs.backgroundSize.split(' '); W = parseFloat(p[0]); H = parseFloat(p[1]); }
        const bp = cs.backgroundPosition.split(' ');
        const off = (v, e, i) => /%/.test(v) ? (e - i) * parseFloat(v) / 100 : parseFloat(v);
        return r.top + off(bp[1], r.height, H) + grondVan(url).grond * H;
      };
      const voet = document.querySelector('.speler-figuur').getBoundingClientRect().bottom;
      const ys = [];
      toonArenaWissel(url);
      for (const wacht of [60, 250, 400, 400, 700]) {
        await new Promise(r => setTimeout(r, wacht));
        const l2 = document.getElementById('gevecht-achtergrond-2');
        const y = vloerY(l2 || bg);
        if (y !== null) ys.push(+y.toFixed(1));
      }
      return { ys, voet: +voet.toFixed(1), vh: innerHeight };
    });
    const sprong = Math.max(...xf.ys) - Math.min(...xf.ys);
    const afw = Math.max(...xf.ys.map(y => Math.abs(y - xf.voet)));
    t(sprong / xf.vh * 100 <= 1 && afw / xf.vh * 100 <= 2,
      f.naam + ': de arena-crossfade springt niet (sprong ' + sprong.toFixed(1) + 'px = ' + (sprong / xf.vh * 100).toFixed(2) + '% vh, max afwijking van de voetlijn ' + afw.toFixed(1) + 'px)');
    /* (2) nieuwkomers midden in het gevecht */
    const nieuw = await page.evaluate(async () => {
      voegVijandToe('de_griffier'); voegVijandToe('de_deurwaarder');
      await new Promise(r => setTimeout(r, 900));
      const uit = [];
      const kijk = (naam, fig, sch) => {
        if (!fig || !sch) return;
        const kl = parseFloat(getComputedStyle(fig).scale);
        const breed = Math.round(fig.offsetWidth * (isFinite(kl) && kl > 0 ? kl : 1));
        const cs = getComputedStyle(sch);
        if (cs.display === 'none') return;
        uit.push({ naam, breed, vsB: cs.getPropertyValue('--vs-b').trim(), dy: Math.round(sch.getBoundingClientRect().top - fig.getBoundingClientRect().bottom) });
      };
      kijk('held', document.querySelector('#speler-zone .speler-figuur'), document.querySelector('#speler-zone .voetschaduw'));
      const mz = document.getElementById('metgezel-zone');
      if (mz && !mz.hidden) kijk('metgezel', mz.querySelector('.metgezel-art'), mz.querySelector('.voetschaduw'));
      document.querySelectorAll('#vijanden-rij .vijand').forEach((v, i) => kijk('vijand' + i, v.querySelector('.vijand-art'), v.querySelector('.voetschaduw')));
      return uit;
    });
    const stuk = nieuw.filter(x => !x.vsB || Math.abs(parseFloat(x.vsB) - Math.round(x.breed * 0.7)) > 1 || Math.abs(x.dy) > 3);
    t(nieuw.length > 0 && stuk.length === 0,
      f.naam + ': na voegVijandToe staat elke contactschaduw nog op maat en op de voetlijn (' + nieuw.length + ' figuren)' +
      (stuk.length ? ' — ' + stuk.map(x => x.naam + ' vs-b=' + x.vsB + ' dy=' + x.dy).join(', ') : ''));
    /* (3) de 3D-knop tijdens het gevecht */
    const knop = await page.evaluate(async () => {
      const zet = async d => {
        const cb = document.getElementById('inst-d3'); if (cb) cb.checked = d;
        INST.d3 = d; instWijzig();
        await new Promise(r => setTimeout(r, 800));
        const bg = document.getElementById('gevecht-achtergrond');
        const sch = document.querySelector('#speler-zone .voetschaduw');
        const fig = document.querySelector('#speler-zone .speler-figuur');
        return {
          d3: document.getElementById('scherm-gevecht').classList.contains('d3-actief'),
          cover: /cover/.test(getComputedStyle(bg).backgroundSize),
          ovaal: sch && getComputedStyle(sch).display !== 'none' ? Math.round(parseFloat(getComputedStyle(sch, '::after').width) || 0) : null,
          breed: fig ? Math.round(fig.offsetWidth) : 0
        };
      };
      return { aan: await zet(true), uit: await zet(false) };
    });
    /* op het mobiele spoor is 3D per definitie uit (d3Gewenst() weigert window.mobiel):
       daar hoort de knop NIETS te veranderen aan plaat of schaduw. */
    if (f.mobiel) {
      t(knop.aan.d3 === false && knop.aan.cover === false && knop.aan.ovaal > 0,
        f.naam + ': 3D AAN laat het mobiele spoor ongemoeid (blijft 2D, plaat op haar grondlijn, ovaal ' + knop.aan.ovaal + 'px)');
    } else {
      t(knop.aan.d3 === true && knop.aan.cover === true, f.naam + ': 3D AAN in het gevecht geeft de plaat terug aan Vista (cover)');
    }
    t(knop.uit.d3 === false && knop.uit.cover === false && knop.uit.ovaal > 0 && Math.abs(knop.uit.ovaal - Math.round(knop.uit.breed * 0.7)) <= 2,
      f.naam + ': 3D UIT in het gevecht zet de plaat terug op haar grondlijn EN de contactschaduw op maat (ovaal ' + knop.uit.ovaal + 'px van ' + Math.round(knop.uit.breed * 0.7) + 'px)');
    t(page.__f.length === 0, f.naam + ': geen paginafouten' + (page.__f.length ? ' — ' + page.__f[0] : ''));
    await ctx.close();
  }

  /* ---- §9.6 — portret-matrix + lijk-kolom ---- */
  kop('§9.6 portret-matrix (412x915 / 360x800 x 3/4/5 figuren x met/zonder metgezel)');
  for (const s of [{ w: 412, h: 915 }, { w: 360, h: 800 }]) {
    const { ctx, page } = await open(browser, { w: s.w, h: s.h, dpr: 3, mobiel: true });
    await naarGevecht(page); await slaap(300);
    for (const o of [
      { n: 3, ids: ['de_dicktator', 'de_griffier', 'de_deurwaarder'], dood: -1 },
      { n: 4, ids: ['de_dicktator', 'de_griffier', 'de_deurwaarder', 'de_zondebok'], dood: -1 },
      { n: 5, ids: ['de_dicktator', 'de_griffier', 'de_deurwaarder', 'de_zondebok', 'de_griffier'], dood: 4 }
    ]) {
      for (const mg of [false, true]) {
        const r = await page.evaluate(async ([ids, dood, mg]) => {
          try { devMetgezel(mg ? 'drops' : null); } catch (e) {}
          S.act = 3; startGevecht(ids, 'baas');
          await new Promise(r => setTimeout(r, 600));
          if (dood >= 0 && S.gevecht.vijanden[dood]) { const v = S.gevecht.vijanden[dood]; verliesHp(v, v.hp + 50); renderGevecht(); }
          await new Promise(r => setTimeout(r, 1400));
          const tbh = parseFloat(getComputedStyle(document.body).getPropertyValue('--tbh')) || 40;
          const balk = document.getElementById('baas-balk');
          const br = (balk && balk.style.display !== 'none') ? balk.getBoundingClientRect() : null;
          const kols = [...document.querySelectorAll('#vijanden-rij .vijand')].map(v => {
            const a = v.querySelector('.vijand-art').getBoundingClientRect();
            return { lijk: v.classList.contains('sterft'), weg: getComputedStyle(v).display === 'none', top: a.top, bot: a.bottom, l: a.left, r: a.right };
          });
          return { tbh, vw: innerWidth, vh: innerHeight, balkTop: br ? br.top : null, kols, docW: document.documentElement.scrollWidth };
        }, [o.ids, o.dood, mg]);
        const levend = r.kols.filter(k => !k.lijk);
        const goed = levend.every(k => k.top >= r.tbh && k.bot <= r.vh && k.l >= 0 && k.r <= r.vw) &&
          (r.balkTop === null || r.balkTop >= r.tbh) && r.docW <= r.vw &&
          (o.dood < 0 || r.kols.filter(k => k.lijk).every(k => k.weg));
        t(goed, s.w + 'x' + s.h + ' · ' + o.n + ' figuren · ' + (mg ? 'met' : 'zonder') + ' metgezel' + (o.dood >= 0 ? ' (incl. lijk)' : ''));
      }
    }
    await ctx.close();
  }

  /* ---- §9.7 — kaarttitels ---- */
  kop('§9.7 kaarttitels');
  for (const b of [360, 412]) {
    const { ctx, page } = await open(browser, { w: b, h: b === 360 ? 800 : 915, dpr: 3, mobiel: true });
    await naarGevecht(page); await slaap(300);
    const r = await page.evaluate(async () => {
      const namen = Object.values(KAARTEN).map(k => k.naam);
      const langste = namen.slice().sort((a, b) => b.length - a.length)[0];
      const proef = ['Originele Handtekening', 'De Schaduwboekhouding', 'Pad Tho', langste].filter((x, i, a) => x && a.indexOf(x) === i);
      const slecht = [];
      /* 1. de handkaarten */
      const alle = Object.keys(KAARTEN);
      for (let i = 0; i < alle.length; i += 8) {
        S.gevecht.hand = alle.slice(i, i + 8).map(id => nieuweKaart(id));
        GDOM.hand = new Map(); document.getElementById('hand').innerHTML = '';
        renderGevecht();
        await new Promise(r => setTimeout(r, 70));
        document.querySelectorAll('#hand .kaart-naam').forEach(el => {
          const cs = getComputedStyle(el);
          if (cs.overflowWrap !== 'normal' || cs.wordBreak !== 'normal' ||
            el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) slecht.push('hand: ' + el.textContent);
        });
      }
      /* 2. de grote kaarten (dek, altaren, winkel, smid) */
      toonKaartKeuze(alle.map(id => nieuweKaart(id)), 'hertest', () => {}, null, {});
      await new Promise(r => setTimeout(r, 900));
      document.querySelectorAll('#kies-kaarten .kaart-naam').forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.overflowWrap !== 'normal' || cs.wordBreak !== 'normal' ||
          el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) slecht.push('groot: ' + el.textContent);
      });
      return { proef, slecht };
    });
    t(r.slecht.length === 0, b + 'px: geen enkele kaarttitel breekt/kapt af (hand + grote kaarten, alle kaarten)' + (r.slecht.length ? ' — ' + r.slecht.slice(0, 3).join(', ') : ''));
    console.log('        gecontroleerde voorbeelden: ' + r.proef.map(x => '"' + x + '"').join(', '));
    await ctx.close();
  }


  /* ---- §9.7b — krimpen is de UITZONDERING ----
     De trede-klasse werd blind op het langste woord gezet, ook op de grote kaarten
     waar ruimte zat is: 63 van de 125 titels kromp daar van 16 naar 13,44px terwijl
     ze op één regel pasten, en 59 titels liepen 1px over hun clamp-box (onderrand van
     de Pirata-letters afgesneden). Deze toets bewaakt de nieuwe regel: een titel die
     op VOLLE maat past én geen regeltekst opeet, mag niet gekrompen zijn. */
  kop('§9.7b geen titel krimpt zonder reden (laptop 1440x900)');
  {
    const { ctx, page } = await open(browser, { w: 1440, h: 900, dpr: 1, mobiel: false, d3: false });
    await naarGevecht(page); await slaap(300);
    const r = await page.evaluate(async () => {
      const alle = Object.keys(KAARTEN);
      const lees = el => {
        const kl = ['lange-naam', 'xl-naam', 'xxl-naam'].filter(k => el.classList.contains(k))[0] || null;
        const k = el.closest('.kaart'), tk = k && k.querySelector('.kaart-tekst');
        /* even kaal meten: paste hij op volle maat? en kostte dat regeltekst? */
        const bewaar = { kl, fs: el.style.fontSize };
        el.classList.remove('lange-naam', 'xl-naam', 'xxl-naam'); el.style.fontSize = '';
        const paste = el.scrollWidth <= el.clientWidth + 0.5 && el.scrollHeight <= el.clientHeight + 1.5;
        const kostte = !!(tk && tk.scrollHeight > tk.clientHeight + 1);
        if (bewaar.kl) el.classList.add(bewaar.kl);
        el.style.fontSize = bewaar.fs;
        return { naam: el.textContent, kl: bewaar.kl, paste, kostte, over: el.scrollHeight - el.clientHeight };
      };
      const onnodig = [], over = [];
      const keur = el => {
        const x = lees(el);
        if (x.kl && x.paste && !x.kostte) onnodig.push(x.naam);
        if (x.over > 0.5) over.push(x.naam);
      };
      for (let i = 0; i < alle.length; i += 8) {
        S.gevecht.hand = alle.slice(i, i + 8).map(id => nieuweKaart(id));
        GDOM.hand = new Map(); document.getElementById('hand').innerHTML = '';
        renderGevecht();
        await new Promise(r => setTimeout(r, 220));
        document.querySelectorAll('#hand .kaart-naam').forEach(keur);
      }
      toonKaartKeuze(alle.map(id => nieuweKaart(id)), 'hertest', () => {}, null, {});
      await new Promise(r => setTimeout(r, 900));
      document.querySelectorAll('#kies-kaarten .kaart-naam').forEach(keur);
      return { onnodig, over };
    });
    t(r.onnodig.length === 0, '1440x900: geen titel krimpt terwijl hij op volle maat past' + (r.onnodig.length ? ' — ' + r.onnodig.length + ', bv. ' + r.onnodig.slice(0, 4).join(', ') : ''));
    t(r.over.length === 0, '1440x900: geen titel loopt over zijn clamp-box (afgesneden letterstaarten)' + (r.over.length ? ' — ' + r.over.length + ', bv. ' + r.over.slice(0, 4).join(', ') : ''));
    t(page.__f.length === 0, '1440x900: geen paginafouten' + (page.__f.length ? ' — ' + page.__f[0] : ''));
    await ctx.close();
  }

  /* ---- §9.8 — regressie: Het Proces, de klassieke kaart, de andere bazen ---- */
  kop('§9.8 regressie');
  {
    const { ctx, page } = await open(browser, { w: 1440, h: 900, dpr: 1, mobiel: false, d3: false });
    /* de klassieke kaart en een gewoon gevecht */
    t(await page.evaluate(() => document.body.dataset.scherm === 'kaart' && !document.body.classList.contains('wereld')), 'klassieke kaart opent (wereldvlag uit)');
    t(await naarGevecht(page), 'een gewoon gevecht start via de kaart');
    /* de drie bazen */
    for (const [naam, ids, soort] of [
      ['Slijmkoning', ['slijmkoning'], 'baas'],
      ['Erfprins', ['de_erfprins'], 'baas'],
      ['DICKtator + hof', ['de_dicktator', 'de_griffier', 'de_deurwaarder'], 'baas']
    ]) {
      const r = await page.evaluate(async ([ids, soort]) => {
        try { startGevecht(ids, soort); } catch (e) { return { err: e.message }; }
        await new Promise(r => setTimeout(r, 2200));
        return { scherm: document.body.dataset.scherm, n: S.gevecht ? S.gevecht.vijanden.length : 0, plaat: S.gevecht ? S.gevecht.achtergrond : null };
      }, [ids, soort]);
      t(!r.err && r.scherm === 'gevecht' && r.n === ids.length, naam + '-gevecht start zonder fout (' + (r.err || r.n + ' vijanden') + ')');
    }
    /* Het Proces: fases + arena-crossfade + decreet-intent ongewijzigd in gedrag */
    const proces = await page.evaluate(async () => {
      try { devDicktator('slachter_mid'); } catch (e) { return { err: e.message }; }
      await new Promise(r => setTimeout(r, 2500));
      const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator');
      const fase1 = b.fase || 1;
      b.hp = Math.floor(b.maxHp * 0.6); checkDicktatorFase(b, S.gevecht);
      await new Promise(r => setTimeout(r, 1800));
      const laag2 = document.getElementById('gevecht-achtergrond-2');
      return {
        fase1, fase2: b.fase, plaat: S.gevecht.achtergrond,
        crossfadeGrond: laag2 ? laag2.style.backgroundSize : null,
        bgGrond: document.getElementById('gevecht-achtergrond').style.backgroundSize
      };
    });
    t(!proces.err && proces.fase1 === 1 && proces.fase2 === 2, 'Het Proces: fase 1 -> 2 schakelt (bedrijf II)');
    t(/FINALE 2 verschuiving/.test(proces.plaat || ''), 'Het Proces: de arena wisselt naar de verschuivings-plaat');
    t(/px/.test(proces.bgGrond || ''), 'Het Proces: de nieuwe arena staat op haar grondlijn (expliciete background-size)');
    t(page.__f.length === 0, 'geen paginafouten in de hele regressieronde' + (page.__f.length ? ' — ' + page.__f[0] : ''));
    await ctx.close();
  }

  console.log('\n============================================');
  console.log(fout ? fout + ' FOUT(EN), ' + ok + ' ok' : 'ALLES GROEN — ' + ok + ' controles');
  console.log('============================================');
  await browser.close();
  process.exit(fout ? 1 : 0);
})();
