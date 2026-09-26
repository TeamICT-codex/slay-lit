/* ============================================================================
   B2 · HET BAZENTONEEL — ACCEPTATIESUITE
   Loopt de acceptatiecriteria af van .claude/notities/bazen_onderzoek/ontwerp/
   P_plaatsing_regie_plan.md §3 (B0.1-B0.13), plus de bannerwachtrij en de
   intent-assert uit de jury (jury_bouw.md W3/W4). Alles SOLO (geen metgezel).

   Draaien (Windows, vanuit een map met playwright + pngjs in node_modules):
       NODE_PATH="$PWD/node_modules" SLAYIT_WORKTREE='C:\...\SLAY-IT-bazentoneel' \
         node tools/bazentoneel_acceptatie.js
   Geen dev-server: de worktree wordt vanaf schijf bediend via route.fulfill op
   http://localhost:4173. SLAYIT_SHOTS=<map> bewaart screenshots per moment;
   SLAYIT_PAR=<n> zet het aantal browsercontexten tegelijk (standaard 3).

   Formaten: 800x360 en 846x381 (Thomas' toestel, isMobile/hasTouch), 740x360,
   1440x900 en 1366x768 in 2D en 3D, en 412x915 staand als controle.
   Elk criterium is een getal of een lege lijst, geen oordeel.
   ============================================================================ */
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
let PNG = null; try { PNG = require('pngjs').PNG; } catch (e) { /* zonder pngjs slaat de HUD-helderheid over */ }

const WORKTREE = process.env.SLAYIT_WORKTREE || 'C:\\Users\\Thomas Aelbrecht\\Desktop\\Workspace\\SLAY-IT-bazentoneel';
const SHOTS = process.env.SLAYIT_SHOTS || null;
const PAR = +(process.env.SLAYIT_PAR || 3);
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const MOB_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
const slaap = ms => new Promise(r => setTimeout(r, ms));

const FORMATEN = {
  M800: { naam: '800x360', w: 800, h: 360, mobiel: true },
  M846: { naam: '846x381', w: 846, h: 381, mobiel: true },
  M740: { naam: '740x360', w: 740, h: 360, mobiel: true },
  P412: { naam: '412x915 staand', w: 412, h: 915, mobiel: true, staand: true },
  L1440: { naam: '1440x900-2D', w: 1440, h: 900, d3: false },
  L1440d3: { naam: '1440x900-3D', w: 1440, h: 900, d3: true },
  L1366: { naam: '1366x768-2D', w: 1366, h: 768, d3: false },
  L1366d3: { naam: '1366x768-3D', w: 1366, h: 768, d3: true }
};
const BAZEN = { slijmkoning: 'Slijmkoning', erfprins: 'Erfprins', dicktator: 'DICKtator', hof: 'DICKtator + hof' };

/* ---------- in-pagina meethaken (alleen LEZEN) ----------
   Het silhouet komt uit het alfamasker van de echte plaat (in 3D uit Vista.schermPos en
   voetMeting), zoals het P-harnas mat: een rechthoek rond een figuur is te grof voor
   'pil naast zijn hoofd' of 'label op zijn lijf'. */
const HELPER = `(() => {
  const masks = {}; const N = 160; const STAP = 2;
  async function masker(url) {
    if (!url) return null; if (masks[url]) return masks[url];
    const im = new Image(); im.src = url; try { await im.decode(); } catch (e) { return null; }
    const w = N, h = Math.max(1, Math.round(N * im.naturalHeight / im.naturalWidth));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data; const a = new Uint8Array(w * h);
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (d[(j * w + i) * 4 + 3] > 24) { a[j * w + i] = 1; if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
    return (masks[url] = { w, h, a, nw: im.naturalWidth, nh: im.naturalHeight, bb: { x0: x0 / w, y0: y0 / h, x1: (x1 + 1) / w, y1: (y1 + 1) / h } });
  }
  const R = e => { if (!e) return null; const q = e.getBoundingClientRect(); return q.width > 0 && q.height > 0 ? { l: q.left, t: q.top, r: q.right, b: q.bottom } : null; };
  const zicht = e => { if (!e || !e.isConnected) return false; let p = e; while (p && p !== document.body) { const c = getComputedStyle(p); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return false; p = p.parentElement; } return !!R(e); };
  const snij = (a, b) => { if (!a || !b) return 0; const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t); return (w > 0 && h > 0) ? w * h : 0; };
  const opaak = (f, x, y) => { const m = f.m; if (!m) return x >= f.sil.l && x <= f.sil.r && y >= f.sil.t && y <= f.sil.b; const u = Math.floor((x - f.img.l) / (f.img.r - f.img.l) * m.w), v = Math.floor((y - f.img.t) / (f.img.b - f.img.t) * m.h); return u >= 0 && v >= 0 && u < m.w && v < m.h && m.a[v * m.w + u] === 1; };
  const opaakIn = (f, r) => { if (!f || !f.sil || !r) return 0; const l = Math.max(f.sil.l, r.l), t = Math.max(f.sil.t, r.t), rr = Math.min(f.sil.r, r.r), b = Math.min(f.sil.b, r.b); if (rr <= l || b <= t) return 0; let n = 0; for (let y = t + STAP / 2; y < b; y += STAP) for (let x = l + STAP / 2; x < rr; x += STAP) if (opaak(f, x, y)) n++; return n * STAP * STAP; };
  async function figuur(actor, artEl, imgEl) {
    const d3 = document.getElementById('scherm-gevecht').classList.contains('d3-actief');
    let url = imgEl ? imgEl.getAttribute('src') : null;
    if (!url && actor && actor.isSpeler && typeof huidigeHeld === 'function') url = 'assets/karakters/' + huidigeHeld().art + '.webp';
    const f = { m: await masker(url) };
    if (d3 && window.Vista && actor) {
      const sp = Vista.schermPos(actor); const vm = (Vista.voetMeting ? Vista.voetMeting() : []).find(x => actor.isSpeler ? x.wie === 'speler' : x.wie === actor.id);
      if (!sp || !vm) return null;
      const hq = vm.quadY - sp.topY; f.img = { l: sp.x - hq / 2, t: sp.topY, r: sp.x + hq / 2, b: vm.quadY }; f.voet = vm.y;
    } else {
      if (!artEl || !zicht(artEl)) return null;
      const r = (imgEl || artEl).getBoundingClientRect();
      if (imgEl && f.m) { const s = Math.min(r.width / f.m.nw, r.height / f.m.nh), iw = f.m.nw * s, ih = f.m.nh * s; f.img = { l: r.left + (r.width - iw) / 2, t: r.top + (r.height - ih) / 2 }; f.img.r = f.img.l + iw; f.img.b = f.img.t + ih; }
      else f.img = R(imgEl || artEl);
    }
    const bb = f.m ? f.m.bb : { x0: 0, y0: 0, x1: 1, y1: 1 }, W = f.img.r - f.img.l, H = f.img.b - f.img.t;
    f.sil = { l: f.img.l + bb.x0 * W, t: f.img.t + bb.y0 * H, r: f.img.l + bb.x1 * W, b: f.img.t + bb.y1 * H };
    if (f.voet == null) f.voet = f.sil.b;
    f.opaakPx = opaakIn(f, f.sil) || 1;
    return f;
  }
  function grondY() {
    const g = S.gevecht; if (!g) return null;
    for (const id of ['gevecht-achtergrond-2', 'gevecht-achtergrond']) {
      const el = document.getElementById(id); if (!el) continue;
      const cs = getComputedStyle(el);
      if (id === 'gevecht-achtergrond-2' && !(parseFloat(cs.opacity) > 0.5)) continue;
      if (!cs.backgroundSize || /cover|auto/.test(cs.backgroundSize)) continue;
      const box = (typeof _plaatLayoutBox === 'function') ? _plaatLayoutBox(el) : el.getBoundingClientRect();
      const H = parseFloat(cs.backgroundSize.split(' ')[1]), top = parseFloat(cs.backgroundPosition.split(' ')[1]);
      const url = el.dataset.plaat || g.achtergrond; const gr = (typeof grondVan === 'function') ? grondVan(url) : { grond: .62 };
      const gf = (gr && typeof gr === 'object') ? gr.grond : gr;
      return box.top + top + (gf > 1 ? gf / 100 : gf) * H;
    }
    return null;
  }
  async function meet() {
    const g = S.gevecht; if (!g) return { geen: true };
    const W = innerWidth, H = innerHeight;
    const d3 = document.getElementById('scherm-gevecht').classList.contains('d3-actief');
    const baas = g.vijanden.find(v => VIJANDEN[v.id] && VIJANDEN[v.id].baas);
    const bi = g.vijanden.indexOf(baas); const kol = bi >= 0 && GDOM.vijanden[bi] ? GDOM.vijanden[bi].wrap : null;
    const held = await figuur(g.speler, document.getElementById('speler-figuur'), document.querySelector('#speler-figuur img'));
    const bf = kol ? await figuur(baas, kol.querySelector('.vijand-art'), kol.querySelector('.vijand-art img')) : null;
    const alle = s => [...document.querySelectorAll(s)].filter(zicht).map(R);
    const een = s => { const e = document.querySelector(s); return zicht(e) ? R(e) : null; };
    const hand = alle('#hand .kaart'), chips = alle('#scherm-gevecht .blok-status > *');
    const heldChips = alle('#speler-zone .blok-status > *'), baasChips = kol ? [...kol.querySelectorAll('.blok-status > *')].filter(zicht).map(R) : [];
    const pillen = kol ? [...kol.querySelectorAll('.intent')].filter(zicht).map(R) : [];
    const tb = een('#topbalk'), bb = een('#baas-balk'), rel = alle('#tb-relikwieen > *');
    /* de andere levende vijanden (het hof, een splitsing): hun pillen en hun art-doos */
    const anderen = g.vijanden.filter(v => v !== baas && !v.dood).map(v => GDOM.vijanden[g.vijanden.indexOf(v)]).filter(Boolean);
    const anderPillen = anderen.flatMap(d => [...d.wrap.querySelectorAll('.intent')].filter(zicht).map(R));
    const anderArts = anderen.map(d => d.wrap.querySelector('.vijand-art')).filter(zicht).map(R);
    const som = (A, B) => A.reduce((s, a) => s + B.reduce((t, b) => t + snij(a, b), 0), 0);
    const pct = (f, rs) => f ? +(100 * rs.reduce((s, r) => s + opaakIn(f, r), 0) / f.opaakPx).toFixed(2) : 0;
    /* eigen labels op het eigen lijf (3D: naam/hp/chips/pil van de baas, hp/chips van de held) */
    const eigenBaas = kol ? pct(bf, [kol.querySelector('.vijand-naam'), kol.querySelector('.hp-balk'), ...kol.querySelectorAll('.blok-status > *'), ...kol.querySelectorAll('.intent')].filter(zicht).map(R)) : 0;
    const eigenHeld = pct(held, [...document.querySelectorAll('#speler-zone .hp-balk, #speler-zone .blok-status > *')].filter(zicht).map(R));
    const spraak = alle('.baas-spraak span').filter((r, i) => +getComputedStyle(document.querySelectorAll('.baas-spraak')[i] || document.body).opacity > 0.2);
    const sp = spraak[0] || null;
    let regels = 0; const spEl = document.querySelector('.baas-spraak span');
    if (sp && spEl) { const cs = getComputedStyle(spEl); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2; regels = Math.round((spEl.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / lh); }
    const flits = alle('.baas-flits h2, .baas-flits span');
    const gy = grondY();
    return {
      W, H, d3, intent: kol ? [...kol.querySelectorAll('.intent')].map(e => e.textContent.trim()).join(' | ') : '',
      zij: !!(kol && kol.classList.contains('pil-zij')),
      voetBaas: bf ? +bf.voet.toFixed(1) : null, voetHeld: held ? +held.voet.toFixed(1) : null, grondY: gy == null ? null : +gy.toFixed(1),
      chipsN: chips.length, chipsHand: Math.round(som(chips, hand)), chipsUit: chips.filter(c => c.l < -1 || c.t < -1 || c.r > W + 1 || c.b > H + 1).length, chipsBB: bb ? Math.round(som(chips, [bb])) : 0,
      pilTop: tb ? Math.round(som(pillen, [tb])) : 0, pilRel: Math.round(som(pillen, rel)), pilBB: bb ? Math.round(som(pillen, [bb])) : 0,
      pilHeldChips: Math.round(som(pillen, heldChips)), pilHeld: pct(held, pillen), pilBaas: pct(bf, pillen),
      chipsAnderPil: Math.round(som(baasChips, anderPillen)), chipsAnderArt: anderArts.length ? Math.max(...anderArts.map(a => +(100 * som(baasChips, [a]) / ((a.r - a.l) * (a.b - a.t))).toFixed(1))) : 0,
      eigenBaas, eigenHeld,
      spraak: !!sp, spRegels: regels, spBaas: pct(bf, sp ? [sp] : []), spPil: Math.round(som(sp ? [sp] : [], pillen)), spHeld: pct(held, sp ? [sp] : []),
      spBB: bb && sp ? Math.round(snij(sp, bb)) : 0, spTop: tb && sp ? Math.round(snij(sp, tb)) : 0, spUit: sp ? (sp.l < 0 || sp.r > W) : false,
      flits: flits.length, flitsBaas: pct(bf, flits), flitsHeld: pct(held, flits),
      beurtBots: (() => { const b = een('#baas-balk .bb-beurt'); if (!b) return 0; return Math.round(som([b], [een('#baas-balk .bb-proces'), een('#baas-balk .bb-aegis'), een('#baas-balk .bb-naam'), een('#baas-balk .bb-balk'), een('#beurt-label'), ...pillen].filter(Boolean))); })(),
      bbBeurt: (een('#baas-balk .bb-beurt') ? document.querySelector('#baas-balk .bb-beurt').textContent : null), beurtLabel: !!een('#beurt-label'),
      baasbalkRect: bb, scroll: document.documentElement.scrollWidth - W,
      kader: (d3 && window.Vista && Vista.kaderStand) ? Vista.kaderStand() : null
    };
  }
  window.__BT = { meet, grondY, masker };
})();`;

/* ---------- pagina openen en een baas zetten ---------- */
async function open(browser, fk) {
  const vp = FORMATEN[fk];
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1, isMobile: !!vp.mobiel, hasTouch: !!vp.mobiel, userAgent: vp.mobiel ? MOB_UA : undefined, serviceWorkers: 'block' });
  await ctx.addInitScript(HELPER);
  const page = await ctx.newPage();
  page.__f = [];
  page.on('pageerror', e => page.__f.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/rest\/v1|Failed to load resource|supabase/i.test(m.text())) page.__f.push('console: ' + m.text()); });
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.host !== 'localhost:4173') return route.abort();
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
    const f = path.join(WORKTREE, rel.split('/').join(path.sep));
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) return route.fulfill({ status: 404, body: 'weg' });
    return route.fulfill({ status: 200, contentType: MIME[path.extname(rel).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('slayit_wipe', '1'); localStorage.setItem('slayit_nudge', 'weg'); localStorage.setItem('slayit_nudge_v2', 'weg'); localStorage.setItem('slayit_wereld', '0'); });
  await page.reload({ waitUntil: 'load' }); await slaap(700);
  if (vp.mobiel) await page.evaluate(() => { document.body.dataset.modus = 'mobiel'; window.mobiel = true; });
  else await page.evaluate(d => { INST.d3 = d; INST.lite = false; document.body.classList.remove('lite'); }, !!vp.d3);
  await page.evaluate(() => { try { toonHeldKeuze(); } catch (e) { } }); await slaap(250);
  await page.evaluate(() => { const k = document.querySelector('.held-kies'); if (k) k.click(); }); await slaap(250);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /toch beginnen/i.test(x.textContent)); if (b) b.click(); }); await slaap(1200);
  /* eerst één gewoon gevecht (Vista warm) */
  for (let i = 0; i < 6; i++) {
    if (await page.evaluate(() => document.body.dataset.scherm === 'gevecht')) break;
    await page.evaluate(() => { try { kiesNodeEcht(beschikbareNodes()[0]); } catch (e) { } });
    await slaap(1400);
  }
  await page.evaluate(() => { if (document.querySelector('#draai-blok.toon') && typeof speelTochStaand === 'function') speelTochStaand(); });
  return { ctx, page, vp };
}
async function wachtRust(page, minMs = 0, max = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < max) {
    const rust = await page.evaluate(() => {
      if (document.querySelector('#draai-blok.toon') && typeof speelTochStaand === 'function') speelTochStaand();
      const g = S.gevecht; if (!g) return true;
      const sc = document.getElementById('scherm-gevecht');
      return !g.bezig && !g.ceremonie && !document.getElementById('baas-intro') && !document.querySelector('.decreet-overlay, .roof-overlay:not(.dt-overlay, .slachtblok-overlay), .roof-speel-kaart, .vonnis, .baas-flits, .baas-spraak')
        && !sc.classList.contains('beef') && !sc.classList.contains('slowmo');
    });
    if (rust && Date.now() - t0 >= minMs) return true;
    await slaap(150);
  }
  return false;
}
async function startBaas(page, baas) {
  await page.evaluate(baas => {
    Codex.erfprinsOntmoetingen = 3;
    if (typeof DICK !== 'undefined') DICK.tempo = 1;
    S.metgezel = null;
    if (baas === 'slijmkoning') devSlijmkoning();
    else if (baas === 'erfprins') devErfprins();
    else { DEV_BUILDS.slachter_mid.metgezel = null; devDicktator('slachter_mid', baas === 'hof' ? { hof: true } : {}); }
    if (document.querySelector('#draai-blok.toon') && typeof speelTochStaand === 'function') speelTochStaand();
  }, baas);
  await slaap(1200);
  await page.evaluate(() => { const b = document.getElementById('baas-intro'); if (b && !/inv/.test(b.className)) b.click(); });
  await wachtRust(page, 7000, 40000);
  await page.evaluate(() => { document.querySelectorAll('#meldingen .toast').forEach(t => t.remove()); if (typeof _spraakStop === 'function') _spraakStop(); });
  await slaap(300);
}
const STATUS = {
  geen: { baas: {}, held: {} },
  een: { baas: { kracht: 2 }, held: { kracht: 2 } },
  vier: { baas: { gif: 9, zwak: 2, kwetsbaar: 2, kracht: 2 }, held: { kracht: 2, zwak: 1, kwetsbaar: 1, gif: 3 } },
  vijf: { baas: { gif: 9, zwak: 2, kwetsbaar: 2, kracht: 2, doornen: 2 }, held: { kracht: 2, zwak: 1, kwetsbaar: 1, gif: 3, doornen: 2 } },
  held5: { baas: {}, held: { kracht: 2, zwak: 1, kwetsbaar: 1, gif: 3, doornen: 2 } }
};
async function zetStatus(page, soort) {
  await page.evaluate(s => {
    const g = S.gevecht; if (!g) return;
    g.speler.status = Object.assign({}, s.held);
    g.vijanden.forEach(v => { if (!v.dood) v.status = (VIJANDEN[v.id] && VIJANDEN[v.id].baas) ? Object.assign({}, s.baas) : {}; });
    renderGevecht(); try { zetVoetschaduwen(); } catch (e) { }
  }, STATUS[soort]);
  await slaap(250);
}
async function zetFakkel(page, n) {
  await page.evaluate(n => { S.fakkel = (n === 'max') ? fakkelMax() : n; try { zetLichtVisueel(); } catch (e) { } renderGevecht(); renderTopbalk(); }, n);
  await slaap(450);
}
async function helderheid(page, r) {   /* p98-luminantie van een rechthoek (screenshot) */
  if (!PNG || !r) return null;
  const vp = page.viewportSize();
  const clip = { x: Math.max(0, r.l), y: Math.max(0, r.t), width: Math.min(vp.width - Math.max(0, r.l), r.r - r.l), height: Math.min(vp.height - Math.max(0, r.t), r.b - r.t) };
  if (clip.width < 2 || clip.height < 2) return null;
  const png = PNG.sync.read(await page.screenshot({ clip }));
  const L = []; for (let i = 0; i < png.data.length; i += 4) L.push(0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2]);
  L.sort((a, b) => a - b); return Math.round(L[Math.floor(L.length * 0.98)]);
}
async function shot(page, naam) { if (SHOTS) { try { await page.screenshot({ path: path.join(SHOTS, naam.replace(/[^\w.-]+/g, '_') + '.png') }); } catch (e) { } } }

/* ---------- de secties: elke taak geeft { kop, regels: [[goed, tekst]] } terug ---------- */
const max = (a, f) => a.length ? Math.max(...a.map(f)) : 0;

/* 1 · per formaat: de rustmatrix (B0.1, B0.2, B0.8, B0.9, B0.12), de fasebanner (B0.13), de
   spraakplaat in rust (B0.5), de HUD en de telegraaf (B0.10, B0.11) en de schok (B0.3) */
async function perFormaat(browser, fk) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  const laptop = !vp.mobiel, mobielLiggend = vp.mobiel && !vp.staand;
  const statussen = laptop ? ['geen', 'een', 'vier', 'vijf'] : ['geen', 'een', 'vier', 'vijf', 'held5'];
  for (const baas of ['slijmkoning', 'erfprins', 'dicktator', 'hof']) {
    const B = BAZEN[baas];
    try {
      await startBaas(page, baas);
      /* --- de rustmatrix --- */
      const rijen = [];
      for (const st of (baas === 'hof' ? ['geen', 'vier'] : statussen)) for (const f of ['max', 0]) {
        await zetStatus(page, st); await zetFakkel(page, f);
        if (vp.d3) await page.evaluate(() => kaderFit3D());   /* de fit loopt vanzelf; hier synchroon, zodat de meting niet wacht */
        await slaap(vp.d3 ? 300 : 150);
        const m = await page.evaluate(() => __BT.meet()); m.st = st; m.f = f; rijen.push(m);
      }
      await shot(page, `${vp.naam}_${baas}_vijf`);
      const n = rijen.length;
      if (laptop && !vp.d3 && baas !== 'hof') {
        t(max(rijen, m => Math.abs(m.voetBaas - m.voetHeld)) <= 2, `B0.1 ${vp.naam} ${B}: |zool baas - zool held| <= 2 px over ${n} staten (0-5 statussen, fakkel 100/0): max ${max(rijen, m => Math.abs(m.voetBaas - m.voetHeld)).toFixed(1)}`);
        t(max(rijen, m => Math.max(Math.abs(m.voetBaas - m.grondY), Math.abs(m.voetHeld - m.grondY))) <= 2, `B0.1 ${vp.naam} ${B}: |zool - grondlijn| <= 2 px: max ${max(rijen, m => Math.max(Math.abs(m.voetBaas - m.grondY), Math.abs(m.voetHeld - m.grondY))).toFixed(1)}`);
      }
      if (laptop) {
        t(max(rijen, m => m.chipsHand) === 0, `B0.1 ${vp.naam} ${B}: geen statuschip snijdt een handkaart (max ${max(rijen, m => m.chipsHand)} px2)`);
        t(max(rijen, m => m.beurtBots) === 0 && rijen.every(m => !m.beurtLabel && /^Beurt \d+$/.test(m.bbBeurt || '')), `B0.2 ${vp.naam} ${B}: 'Beurt N' staat in de bazenbalk (${rijen[0].bbBeurt}), #beurt-label weg, 0 botsingen met strook/pil/naam/balk`);
      } else if (mobielLiggend) {
        t(rijen.every(m => m.bbBeurt === null), `B0.2 ${vp.naam} ${B}: mobiel toont geen beurtnummer (zoals voorheen)`);
      }
      if (vp.d3) {
        t(max(rijen, m => Math.max(m.eigenBaas, m.eigenHeld)) <= 1, `B0.12 ${vp.naam} ${B}: eigen label op eigen lijf <= 1 % (max ${max(rijen, m => Math.max(m.eigenBaas, m.eigenHeld))} %)`);
        t(max(rijen, m => m.pilBB) === 0, `B0.12 ${vp.naam} ${B}: pil ~ bazenbalk = 0 (max ${max(rijen, m => m.pilBB)} px2)`);
        t(max(rijen, m => Math.abs(m.voetBaas - m.grondY) / m.H * 100) <= 2, `B0.12 ${vp.naam} ${B}: |voet - grondlijn| <= 2 % vh (max ${max(rijen, m => Math.abs(m.voetBaas - m.grondY) / m.H * 100).toFixed(2)} %)`);
        t(rijen.every(m => m.kader && m.kader.eigen && m.kader.fov <= 70), `B0.12 ${vp.naam} ${B}: eigen kader, fov ${[...new Set(rijen.map(m => m.kader && m.kader.fov.toFixed(1)))].join('/')} (<= 70)`);
      }
      if (mobielLiggend) {
        t(max(rijen, m => m.chipsHand) === 0 && max(rijen, m => m.chipsUit) === 0 && max(rijen, m => m.chipsBB) === 0, `B0.8 ${vp.naam} ${B}: chips ~ hand 0, uit beeld 0, ~ bazenbalk 0 over ${n} staten (max ${max(rijen, m => m.chipsHand)}/${max(rijen, m => m.chipsUit)}/${max(rijen, m => m.chipsBB)})`);
        t(max(rijen, m => m.pilTop) === 0 && max(rijen, m => m.pilRel) === 0, `B0.9 ${vp.naam} ${B}: pil ~ topbalk 0 en ~ relikwieen 0 (${rijen.filter(m => m.zij).length}/${n} staten pil-zij)`);
        t(max(rijen, m => m.pilBaas) <= 2, `B0.9 ${vp.naam} ${B}: pil ~ baassilhouet <= 2 % (max ${max(rijen, m => m.pilBaas)} %)`);
        t(max(rijen, m => m.pilHeldChips) === 0 && max(rijen, m => m.pilHeld) === 0, `B0.8xB0.9 ${vp.naam} ${B}: pil ~ heldchips 0 en ~ held 0 (max ${max(rijen, m => m.pilHeldChips)} px2 / ${max(rijen, m => m.pilHeld)} %)`);
        t(max(rijen, m => m.scroll) <= 0, `${vp.naam} ${B}: geen horizontale scroll`);
        if (baas === 'hof') t(max(rijen, m => m.chipsAnderPil) === 0 && max(rijen, m => m.chipsAnderArt) <= 2, `B0.8 ${vp.naam} ${B}: de chipkolom van de baas ligt niet over het hof (pil ${max(rijen, m => m.chipsAnderPil)} px2, lijf ${max(rijen, m => m.chipsAnderArt)} % van een art-doos)`);
      }
      if (vp.staand) t(max(rijen, m => m.chipsUit) === 0, `controle ${vp.naam} ${B}: geen chip uit beeld (noodpad)`);

      /* --- B0.5: de spraakplaat in rust (de echte introregel van de baas) --- */
      await zetStatus(page, 'vier'); await zetFakkel(page, 'max');
      await page.evaluate(() => { _spraakStop(); const b = S.gevecht.vijanden.find(v => VIJANDEN[v.id].baas); baasSpreekt(baasUitspraken(b.id).intro, 2600); });
      await slaap(800);
      const s = await page.evaluate(() => __BT.meet());
      await shot(page, `${vp.naam}_${baas}_spraak`);
      if (!vp.staand) {
        t(s.spraak && s.spBaas <= 1 && s.spPil === 0, `B0.5 ${vp.naam} ${B}: plaat ~ baas ${s.spBaas} % (<= 1), ~ pil ${s.spPil} px2`);
        t(s.spHeld === 0 && s.spBB === 0 && s.spTop === 0 && !s.spUit, `B0.5 ${vp.naam} ${B}: plaat ~ held ${s.spHeld} %, ~ bazenbalk ${s.spBB}, ~ topbalk ${s.spTop}, binnen beeld`);
        if (vp.w === 800) t(s.spRegels <= 2, `B0.5 ${vp.naam} ${B}: de plaat telt ${s.spRegels} regels (<= 2)`);
        const dataBaas = await page.evaluate(() => { const e = document.querySelector('.baas-spraak'); return e ? (e.dataset.baas || '') : null; });
        if (baas === 'erfprins' || baas === 'dicktator') t(dataBaas === (baas === 'erfprins' ? 'de_erfprins' : 'de_dicktator'), `B0.4 ${vp.naam} ${B}: eigen stem (.baas-spraak[data-baas="${dataBaas}"])`);
      }
      await page.evaluate(() => _spraakStop());

      /* --- B0.13: de fasebanner dekt de figuren niet --- */
      if (!vp.staand && baas !== 'hof') {
        /* een korte (WOEDE) en de langste echte ondertitel (DE ROOF) */
        for (const [titel, sub] of [['WOEDE', '„Au — je SLÁÁT me?! Onbeschofte parvenu. Goed dan."'], ['DE ROOF', '🎭 7 van je beste kaarten — nu MÍJN werk. Je dek sluit zich.']]) {
          await page.evaluate(([a, b]) => baasFaseMoment(a, b), [titel, sub]);
          await slaap(500);
          const b = await page.evaluate(() => __BT.meet());
          await shot(page, `${vp.naam}_${baas}_banner_${titel.replace(' ', '')}`);
          t(b.flits > 0 && b.flitsBaas <= 2 && b.flitsHeld <= 2, `B0.13 ${vp.naam} ${B}: bannertekst '${titel}' ~ baas ${b.flitsBaas} %, ~ held ${b.flitsHeld} % (<= 2)`);
          await wachtRust(page, 0, 6000);
        }
      }

      /* --- B0.10 + B0.11: fakkel 0 zonder daglicht --- */
      if (baas !== 'hof' && !vp.staand) {
        await zetStatus(page, 'geen');
        await page.evaluate(() => { INST.daglicht = false; try { pasInstToe(); } catch (e) { } });
        const intents = {};
        for (const f of ['max', 45, 20, 0]) { await zetFakkel(page, f); intents[f] = (await page.evaluate(() => __BT.meet())).intent; }
        t(new Set(Object.values(intents)).size === 1 && !/❓|\?/.test(intents[0]), `B0.11 ${vp.naam} ${B}: de telegraaf is gelijk bij fakkel 100/45/20/0 ("${intents[0]}")`);
        const bbR = (await page.evaluate(() => __BT.meet())).baasbalkRect;
        const lum = await helderheid(page, bbR);
        if (lum != null) t(lum >= 150, `B0.10 ${vp.naam} ${B}: bazenbalk bij fakkel 0 zonder daglicht p98 ${lum} (>= 150)`);
        await shot(page, `${vp.naam}_${baas}_f0`);
        await zetFakkel(page, 'max');
      }

      /* --- B0.3: de schok schudt het toneel, niet het scherm (laptop) --- */
      if (laptop && baas !== 'hof') {
        const sch = await page.evaluate(async () => {
          const top = id => { const e = document.getElementById(id); return e ? e.getBoundingClientRect().top : null; };
          const bbTop = () => document.getElementById('baas-balk').getBoundingClientRect().top;
          const rust = { bg: top('gevecht-achtergrond'), cv: top('vista-canvas'), bb: bbTop() };
          let bg = 0, cv = 0, bb = 0;
          const neem = () => { bg = Math.max(bg, Math.abs(top('gevecht-achtergrond') - rust.bg)); cv = Math.max(cv, Math.abs(top('vista-canvas') - rust.cv)); bb = Math.max(bb, Math.abs(bbTop() - rust.bb)); };
          schudScherm();
          for (let i = 0; i < 8; i++) { await new Promise(r => setTimeout(r, 45)); neem(); }
          await new Promise(r => setTimeout(r, 400));
          const sc = document.getElementById('scherm-gevecht'); sc.classList.add('slowmo');
          for (let i = 0; i < 6; i++) { await new Promise(r => setTimeout(r, 45)); neem(); }
          sc.classList.remove('slowmo');
          return { bg: +bg.toFixed(1), cv: +cv.toFixed(1), bb: +bb.toFixed(1) };
        });
        t(sch.bg <= 9 && sch.cv <= 9 && sch.bb === 0, `B0.3 ${vp.naam} ${B}: schok + slowmo: plaat ${sch.bg} px, canvas ${sch.cv} px (<= 9, was 52), bazenbalk ${sch.bb} px (0)`);
      }
    } catch (e) { t(false, `${vp.naam} ${B}: fout in de meting: ${e.message}`); }
  }
  t(page.__f.length === 0, `${vp.naam}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
  await ctx.close();
  return { kop: `Rust, spraak, banner, HUD, telegraaf, schok · ${vp.naam}`, regels: R };
}

/* 2 · de tekstsluis, het slotwoord-venster, vervallen, de pauze en de bannerwachtrij (synthetisch) */
async function sluisEnWachtrij(browser, fk) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  await startBaas(page, 'erfprins');
  /* een regel tijdens een banner: niet zichtbaar zolang de banner staat; daarna volledig */
  const a = await page.evaluate(async () => {
    const rec = []; const t0 = performance.now();
    const iv = setInterval(() => {
      const sp = [...document.querySelectorAll('.baas-spraak')].filter(e => +getComputedStyle(e).opacity > 0.2);
      rec.push({ t: performance.now() - t0, sp: sp.length, fl: document.querySelectorAll('.baas-flits').length, vo: document.querySelectorAll('.vonnis').length });
    }, 50);
    baasFaseMoment('TOETS', 'de sluis'); baasSpreekt('„EEN — tijdens de banner."', 1500);
    await new Promise(r => setTimeout(r, 5200));
    vonnisSlam('TOETS', 'de titel', { duur: 1500, schok: false, sfx: false }); baasSpreekt('„TWEE — tijdens de titel."', 1500);
    await new Promise(r => setTimeout(r, 4200));
    clearInterval(iv);
    return rec;
  });
  const samen = a.filter(x => x.sp && (x.fl || x.vo)).length * 50;
  const zichtbaar = a.filter(x => x.sp).length * 50;
  t(samen === 0, `B0.4 ${vp.naam}: een regel speelt nooit tegelijk met een banner of titel (${samen} ms samen)`);
  t(zichtbaar >= 2 * 1500 * 0.8 - 150, `B0.4 ${vp.naam}: beide regels komen daarna nog (samen ${zichtbaar} ms in beeld, verwacht ~${2 * 1500} ms minus in- en uitfade)`);
  /* een staande plaat pauzeert tijdens een banner en is daarna even lang leesbaar */
  const b = await page.evaluate(async () => {
    let zicht = 0, vorig = performance.now(), weg = false; const t0 = performance.now();
    baasSpreekt('„DRIE — ik word onderbroken."', 2000);
    const iv = setInterval(() => { const nu = performance.now(); const e = document.querySelector('.baas-spraak'); if (e && +getComputedStyle(e).opacity > 0.2) zicht += nu - vorig; vorig = nu; }, 25);
    await new Promise(r => setTimeout(r, 700));
    baasFaseMoment('ONDERBREKING', 'de plaat pauzeert');
    await new Promise(r => setTimeout(r, 5000));
    clearInterval(iv);
    weg = !document.querySelector('.baas-spraak');
    return { zicht: Math.round(zicht), weg };
  });
  t(b.weg && Math.abs(b.zicht - 2000 * 0.88) <= 350, `B0.4 ${vp.naam}: een onderbroken plaat pauzeert en is daarna even lang leesbaar (${b.zicht} ms zichtbaar van 2000 ms)`);
  /* flavor vervalt: een orakelregel die langer dan 2,5 s op de sluis wacht, komt niet meer */
  const c = await page.evaluate(async () => {
    vonnisSlam('LANG', 'een lange titel', { duur: 3200, schok: false, sfx: false });
    baasSpreekt('„VIER — flavor die vervalt."', 1500, { vervalt: 2500 });
    let gezien = false; const t0 = performance.now();
    while (performance.now() - t0 < 5500) { await new Promise(r => setTimeout(r, 60)); if ([...document.querySelectorAll('.baas-spraak')].some(e => /VIER/.test(e.textContent))) gezien = true; }
    return { gezien };
  });
  t(!c.gezien, `B0.4 ${vp.naam}: een flavorregel die > 2,5 s moet wachten, vervalt (gezien: ${c.gezien})`);
  /* de bannerwachtrij: drie banners binnen een halve seconde */
  const d = await page.evaluate(async () => {
    const rec = []; const t0 = performance.now(); let beefs = 0, wasBeef = false;
    const iv = setInterval(() => {
      const fl = [...document.querySelectorAll('.baas-flits')];
      const beef = document.getElementById('scherm-gevecht').classList.contains('beef'); if (beef && !wasBeef) beefs++; wasBeef = beef;
      rec.push({ t: Math.round(performance.now() - t0), n: fl.length, titels: fl.map(f => f.querySelector('h2').textContent) });
    }, 40);
    baasFaseMoment('EEN', '1'); await new Promise(r => setTimeout(r, 250));
    baasFaseMoment('TWEE', '2'); await new Promise(r => setTimeout(r, 200));
    baasFaseMoment('DRIE', '3');
    await new Promise(r => setTimeout(r, 6400));
    clearInterval(iv);
    const van = {}; rec.forEach(x => x.titels.forEach(tt => { if (!van[tt]) van[tt] = [x.t, x.t]; van[tt][1] = x.t; }));
    return { maxN: Math.max(...rec.map(x => x.n)), van, beefs, html: (() => { baasFaseMoment('X', 'y'); const e = document.querySelector('.baas-flits'); return e ? e.outerHTML : ''; })() };
  });
  const v = d.van;
  t(d.maxN === 1, `bannerwachtrij ${vp.naam}: nooit meer dan één banner tegelijk (max ${d.maxN})`);
  t(v.EEN && v.TWEE && v.DRIE && v.EEN[0] < v.TWEE[0] && v.TWEE[0] < v.DRIE[0], `bannerwachtrij ${vp.naam}: volgorde behouden (EEN ${v.EEN && v.EEN[0]}, TWEE ${v.TWEE && v.TWEE[0]}, DRIE ${v.DRIE && v.DRIE[0]} ms)`);
  t(['EEN', 'TWEE'].every(k => v[k] && v[k][1] - v[k][0] >= 1300), `bannerwachtrij ${vp.naam}: elke banner >= 1,4 s leesbaar (EEN ${v.EEN && v.EEN[1] - v.EEN[0]}, TWEE ${v.TWEE && v.TWEE[1] - v.TWEE[0]} ms)`);
  t(d.beefs === 3, `bannerwachtrij ${vp.naam}: elke banner schudt pas als hij verschijnt (${d.beefs} schokken, verwacht 3)`);
  t(d.html === '<div class="baas-flits"><h2>X</h2><span>y</span></div>', `bannerwachtrij ${vp.naam}: de DOM van een banner is onveranderd (${d.html})`);
  t(page.__f.length === 0, `${vp.naam}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
  await ctx.close();
  return { kop: `Tekstsluis, pauze, vervallen en bannerwachtrij · ${vp.naam}`, regels: R };
}

/* 3 · een echte bedrijfsovergang (DICKtator I->II): plaat ~ titel, ~ spreker, ~ held per 50 ms */
async function overgang(browser, fk) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  await page.evaluate(() => { DEV_BUILDS.slachter_mid.metgezel = null; DICK.tempo = 1; devDicktator('slachter_mid', { netVoor: 2 }); if (document.querySelector('#draai-blok.toon') && typeof speelTochStaand === 'function') speelTochStaand(); });
  await slaap(800); await page.evaluate(() => { const b = document.getElementById('baas-intro'); if (b) b.click(); });
  await wachtRust(page, 9000, 45000);
  const o = await page.evaluate(async () => {
    document.querySelectorAll('#meldingen .toast').forEach(t => t.remove());
    const R = e => { const q = e.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom }; };
    const snij = (a, b) => { const l = Math.max(a.l, b.l), t = Math.max(a.t, b.t), r = Math.min(a.r, b.r), bb = Math.min(a.b, b.b); return (r > l && bb > t) ? (r - l) * (bb - t) : 0; };
    const o = { titel: 0, baas: 0, baasMax: 0, pil: 0, held: 0, regels: {} };
    let vorig = performance.now(); const t0 = vorig;
    const iv = setInterval(() => {
      const nu = performance.now(), dt = nu - vorig; vorig = nu;
      const sp = [...document.querySelectorAll('.baas-spraak')].filter(e => +getComputedStyle(e).opacity > 0.2).map(e => R(e.querySelector('span') || e));
      const tit = [...document.querySelectorAll('.vonnis h2, .vonnis span, .baas-flits h2, .baas-flits span')].map(R);
      const g = S.gevecht; const b = g && g.vijanden.find(v => !v.dood && v.id === 'de_dicktator');
      let br = null;
      if (b) { if (d3Actief() && window.Vista) { const p = Vista.schermPos(b); if (p) { const h = p.voetY - p.topY; br = { l: p.x - h * 0.36, r: p.x + h * 0.36, t: p.topY, b: p.voetY }; } } else { const a = GDOM.vijanden[g.vijanden.indexOf(b)].wrap.querySelector('.vijand-art'); if (a) br = R(a); } }
      const pil = b ? [...GDOM.vijanden[g.vijanden.indexOf(b)].wrap.querySelectorAll('.intent')].map(R) : [];
      let hr = null; if (d3Actief() && window.Vista) { const p = Vista.schermPos(g.speler); if (p) { const h = p.voetY - p.topY; hr = { l: p.x - h * 0.3, r: p.x + h * 0.3, t: p.topY, b: p.voetY }; } } else { const hf = document.getElementById('speler-figuur'); if (hf) hr = R(hf); }
      for (const s of sp) {
        if (tit.some(x => snij(s, x) > 0)) o.titel += dt;
        if (br) { const x = snij(s, br); if (x > 0) { o.baas += dt; o.baasMax = Math.max(o.baasMax, Math.round(x)); } }
        if (pil.some(p => snij(s, p) > 0)) o.pil += dt;
        if (hr && snij(s, hr) > 0) o.held += dt;
      }
      [...document.querySelectorAll('.baas-spraak')].filter(e => +getComputedStyle(e).opacity > 0.2).forEach(e => { const k = e.textContent.slice(0, 30); const r = o.regels[k] || (o.regels[k] = { van: nu - t0, tot: nu - t0 }); r.tot = nu - t0; });
    }, 50);
    _devKlapNu(DEV_KLAP);
    await new Promise(r => setTimeout(r, 7000));
    clearInterval(iv);
    for (const k of ['titel', 'baas', 'pil', 'held']) o[k] = Math.round(o[k]);
    return o;
  });
  const regels = Object.entries(o.regels).map(([k, r]) => `${k.slice(0, 18)}… ${Math.round(r.tot - r.van)} ms`).join(', ');
  t(o.titel === 0, `B0.4 ${vp.naam} I->II: plaat ~ scènetitel/banner ${o.titel} ms (0)`);
  t(Object.keys(o.regels).length >= 1 && Object.values(o.regels).every(r => r.tot - r.van >= 900), `B0.4 ${vp.naam} I->II: elke regel volledig leesbaar (${regels})`);
  t(o.baas <= 250 && o.pil <= 250, `B0.5 ${vp.naam} I->II: plaat ~ DICKtator ${o.baas} ms (max ${o.baasMax} px2), ~ zijn pil ${o.pil} ms (<= 250)`);
  t(o.held === 0, `B0.5 ${vp.naam} I->II: plaat ~ held ${o.held} ms (0)`);
  t(page.__f.length === 0, `${vp.naam}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
  await ctx.close();
  return { kop: `Bedrijfsovergang I->II (DICKtator) · ${vp.naam}`, regels: R };
}

/* 4 · de dood: de verslagen baas blijft liggen, het slotwoord staat erbij (B0.7 + B0.4) */
async function dood(browser, fk) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  const REC = () => {
    window.__rec = [];
    const g = S.gevecht; const b = g.vijanden.find(v => VIJANDEN[v.id] && VIJANDEN[v.id].baas); const kol = GDOM.vijanden[g.vijanden.indexOf(b)].wrap; const art = kol.querySelector('.vijand-art');
    const R = e => { const q = e.getBoundingClientRect(); return { b: q.bottom, h: q.height }; };
    window.__rust = R(art); window.__t0 = performance.now();
    window.__iv = setInterval(() => {
      const cs = getComputedStyle(kol), a = R(art);
      window.__rec.push({ t: Math.round(performance.now() - window.__t0), zicht: kol.isConnected && cs.display !== 'none' && +cs.opacity >= 0.5 && a.h > 4, h: a.h, b: a.b, scherm: document.body.dataset.scherm,
        beef: document.getElementById('scherm-gevecht').classList.contains('beef') || !!document.querySelector('#strijdveld.toneelschok'),
        spraak: [...document.querySelectorAll('.baas-spraak')].filter(e => +getComputedStyle(e).opacity > 0.2).map(e => e.textContent.slice(0, 40)) });
    }, 50);
  };
  const scen = [['slijmkoning', () => { const g = S.gevecht; const b = g.vijanden.find(v => VIJANDEN[v.id].baas); b._geenSplit = true; b.gesplitst = true; verliesHp(b, b.hp + 5, sp()); g.vijanden.filter(v => !v.dood).forEach(v => { v.dood = true; }); renderGevecht(); if (!g.voorbij) gevechtGewonnen(); }],
    ['erfprins', () => { const g = S.gevecht; const v = g.vijanden[0]; v.gestolen = []; verliesHp(v, v.hp + 5, sp()); if (v.dood && !g.voorbij && g.vijanden.every(x => x.dood)) gevechtGewonnen(); }],
    ['dicktator', null]];
  for (const [baas, klap] of scen) {
    const B = BAZEN[baas];
    try {
      if (baas === 'dicktator') {
        /* de TWEEDE dood: eerst de herverkiezing laten spelen, dan de laatste klap -> de outro */
        await page.evaluate(() => { DEV_BUILDS.slachter_mid.metgezel = null; DICK.tempo = 1; devDicktator('slachter_mid', { netVoor: 4 }); if (document.querySelector('#draai-blok.toon') && typeof speelTochStaand === 'function') speelTochStaand(); });
        await slaap(800); await page.evaluate(() => { const b = document.getElementById('baas-intro'); if (b) b.click(); });
        await wachtRust(page, 9000, 45000);
        for (let k = 0; k < 3; k++) {
          if (await page.evaluate(() => !!S.gevecht.vijanden.find(v => v.id === 'de_dicktator').herrezen)) break;
          await page.evaluate(() => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); verliesHp(b, Math.max(DEV_KLAP, b.hp + 5), sp()); renderGevecht(); });
          await wachtRust(page, 3000, 30000);
        }
        await page.evaluate(() => { document.querySelectorAll('#meldingen .toast').forEach(t => t.remove()); _spraakStop(); });
        await page.evaluate(REC);
        await page.evaluate(() => { const g = S.gevecht; const b = g.vijanden.find(v => v.id === 'de_dicktator'); g.vijanden.filter(v => v !== b && !v.dood).forEach(v => { v.dood = true; }); verliesHp(b, b.hp + 5, sp()); renderGevecht(); if (b.dood && !g.voorbij) gevechtGewonnen(); });
      } else {
        await startBaas(page, baas);
        await page.evaluate(REC);
        await page.evaluate(klap);
      }
      const t0 = Date.now(); let rec = [];
      while (Date.now() - t0 < 9000) { await slaap(300); rec = await page.evaluate(() => window.__rec); if (rec.some(x => x.scherm !== 'gevecht') && Date.now() - t0 > 3500) break; }
      await page.evaluate(() => clearInterval(window.__iv));
      const rust = await page.evaluate(() => window.__rust);
      const wissel = (rec.find(x => x.scherm !== 'gevecht') || {}).t;
      const inGevecht = rec.filter(x => x.scherm === 'gevecht');
      const slot = {}; inGevecht.forEach(x => x.spraak.forEach(s => { if (!slot[s]) slot[s] = [x.t, x.t]; slot[s][1] = x.t; }));
      const doodregel = Object.entries(slot).sort((a, b) => b[1][1] - a[1][1])[0];
      t(wissel != null, `B0.7 ${vp.naam} ${B}: het scherm wisselt na de doodsklap (op ${wissel} ms naar ${wissel != null ? rec.find(x => x.scherm !== 'gevecht').scherm : '?'})`);
      t(doodregel && doodregel[1][1] - doodregel[1][0] >= 1000, `B0.4 ${vp.naam} ${B}: het slotwoord staat >= 1,0 s in beeld (${doodregel ? Math.round(doodregel[1][1] - doodregel[1][0]) + ' ms, "' + doodregel[0].slice(0, 30) + '…"' : 'geen'})`);
      if (!vp.d3) {
        const laatste = inGevecht.length ? inGevecht[inGevecht.length - 1].t : 0;
        const zicht = inGevecht.filter(x => x.t > 200);
        t(zicht.length > 0 && zicht.every(x => x.zicht && x.h >= 0.75 * rust.h), `B0.7 ${vp.naam} ${B}: de baas blijft zichtbaar in zijn doodspose tot de schermwissel (tot ${laatste} ms, hoogte >= ${(Math.min(...zicht.map(x => x.h)) / rust.h).toFixed(2)}x)`);
        const voet = inGevecht.filter(x => !x.beef).map(x => Math.abs(x.b - rust.b));
        t(voet.length && Math.max(...voet) <= 3, `B0.7 ${vp.naam} ${B}: zool binnen +-3 px van de grondlijn buiten de schok (max ${voet.length ? Math.max(...voet).toFixed(1) : '?'} px)`);
      }
      if (baas === 'dicktator') t(rec.some(x => x.scherm === 'outro'), `B0.7 ${vp.naam} DICKtator: de tweede dood gaat over in data-scherm="outro"`);
      await shot(page, `${vp.naam}_${baas}_na_dood`);
    } catch (e) { t(false, `B0.7 ${vp.naam} ${B}: fout in de meting: ${e.message}`); }
    await slaap(400);
    /* na de Slijmkoning opent de Drempeltafel: dicht, zodat de volgende baas een schoon toneel heeft */
    if (baas !== 'dicktator') { await page.evaluate(() => { document.querySelectorAll('.dt-overlay').forEach(e => e.remove()); try { toonScherm('kaart'); } catch (e) { } }); }
  }
  t(page.__f.length === 0, `${vp.naam}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
  await ctx.close();
  return { kop: `De dood en het slotwoord · ${vp.naam}`, regels: R };
}
/* het gevecht gaat DOOR (Slijmkoning met een levende splitsing): na 2,4 s komt zijn kolom vrij */
async function lijkWeg(browser, fk) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  {
    try {
      await startBaas(page, 'slijmkoning');
      const r = await page.evaluate(async () => {
        const g = S.gevecht; const b = g.vijanden.find(v => VIJANDEN[v.id].baas);
        const nieuw = voegVijandToe('groene_slijm'); if (!nieuw) return { geen: true };
        renderGevecht();
        b._geenSplit = true; b.gesplitst = true; verliesHp(b, b.hp + 5, sp()); renderGevecht();
        const kol = GDOM.vijanden[g.vijanden.indexOf(b)].wrap;
        await new Promise(r => setTimeout(r, 1200)); const na12 = kol.classList.contains('lijk-weg');
        await new Promise(r => setTimeout(r, 1700)); const na29 = kol.classList.contains('lijk-weg');
        return { na12, na29, voorbij: !!g.voorbij };
      });
      t(r.geen || (!r.voorbij && !r.na12 && r.na29), `B0.7 ${vp.naam} Slijmkoning: gaat het gevecht door, dan komt zijn kolom pas na 2,4 s vrij (1,2 s: ${r.na12}, 2,9 s: ${r.na29})`);
    } catch (e) { t(false, `B0.7 ${vp.naam} lijk-weg: fout: ${e.message}`); }
  }
  t(page.__f.length === 0, `${vp.naam}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
  await ctx.close();
  return { kop: `De kolom van een verslagen baas als het gevecht doorgaat · ${vp.naam}`, regels: R };
}

/* 5 · 3D: signatuurposes (B0.6) en de gewone camera buiten een baasgevecht (B0.12) */
async function driedee(browser, fk) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  for (const [baas, poses] of [['erfprins', ['plagiaat', 'plagiaat_variant']], ['dicktator', ['decreet', 'factuur', 'herkozen']]]) {
    await startBaas(page, baas); await slaap(1500);
    for (const p of poses) {
      const r = await page.evaluate(async p => {
        const b = S.gevecht.vijanden.find(v => VIJANDEN[v.id].baas);
        const voet = () => { const m = Vista.voetMeting().find(x => x.wie === b.id); return m ? m.y : null; };
        const v0 = voet(); const t0 = performance.now(); pose2D(b, p, 1.4);
        let tZien = null, dv = 0;
        for (let i = 0; i < 14; i++) { await new Promise(r => setTimeout(r, 25)); if (tZien == null && Vista.poseNu(b) === p) tZien = Math.round(performance.now() - t0); dv = Math.max(dv, Math.abs(voet() - v0)); }
        return { tZien, dv: +dv.toFixed(1) };
      }, p);
      t(r.tZien != null && r.tZien <= 300 && r.dv <= 3, `B0.6 ${vp.naam} ${BAZEN[baas]}: pose '${p}' in 3D na ${r.tZien} ms (<= 300), voet +-${r.dv} px (<= 3, de adem is +-2,25)`);
      await slaap(1600);
    }
  }
  /* een gewoon 3D-gevecht na een baas: de vaste camera terug */
  const gewoon = await page.evaluate(async () => {
    const voor = Vista.kaderStand();
    try { startGevecht(['grotrat'], 'gevecht', 1); } catch (e) { return { err: e.message }; }
    await new Promise(r => setTimeout(r, 600));
    return { voor, na: Vista.kaderStand(), namen: [...document.querySelectorAll('#vijanden-rij .vijand-naam')].filter(e => getComputedStyle(e).display !== 'none').length };
  });
  t(!gewoon.err && gewoon.voor.eigen && !gewoon.na.eigen && Math.abs(gewoon.na.fov - 50) < 0.01 && gewoon.namen > 0, `B0.12 ${vp.naam}: een gewoon gevecht krijgt de vaste camera terug (fov ${gewoon.voor && gewoon.voor.fov.toFixed(1)} -> ${gewoon.na && gewoon.na.fov}) en zijn naamlabels (${gewoon.namen})${gewoon.err ? ' — ' + gewoon.err : ''}`);
  t(page.__f.length === 0, `${vp.naam}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
  await ctx.close();
  return { kop: `3D: signatuurposes en de camera · ${vp.naam}`, regels: R };
}

/* 6 · de HUD buiten het gevecht, in de tirade, en het hof in het donker (B0.10, B0.11) */
async function hudEnHof(browser, fk) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  await page.evaluate(() => { DEV_BUILDS.slachter_mid.metgezel = null; DICK.tempo = 1; devDicktator('slachter_mid', { tirade: true }); if (document.querySelector('#draai-blok.toon') && typeof speelTochStaand === 'function') speelTochStaand(); });
  await slaap(800); await page.evaluate(() => { const b = document.getElementById('baas-intro'); if (b) b.click(); });
  await wachtRust(page, 9000, 45000);
  const tir = await page.evaluate(() => ({ tirade: document.body.classList.contains('tirade'), ouder: document.getElementById('baas-balk').parentElement.tagName }));
  const lum = await helderheid(page, (await page.evaluate(() => __BT.meet())).baasbalkRect);
  t(tir.ouder === 'BODY', `B0.10 ${vp.naam}: #baas-balk is een body-kind (${tir.ouder})`);
  if (lum != null) t(lum >= 150, `B0.10 ${vp.naam}: bazenbalk in de tirade (body.tirade: ${tir.tirade}) p98 ${lum} (>= 150)`);
  await shot(page, `${vp.naam}_tirade`);
  /* het hof blijft in het donker, de baas niet */
  await page.evaluate(() => { DEV_BUILDS.slachter_mid.metgezel = null; devDicktator('slachter_mid', { hof: true }); });
  await slaap(800); await page.evaluate(() => { const b = document.getElementById('baas-intro'); if (b) b.click(); });
  await wachtRust(page, 9000, 45000);
  await zetFakkel(page, 0);
  const hof = await page.evaluate(() => S.gevecht.vijanden.filter(v => !v.dood).map(v => ({ id: v.id, baas: !!VIJANDEN[v.id].baas, pil: intentTekst(v).replace(/<[^>]+>/g, '').trim() })));
  t(hof.filter(h => h.baas).every(h => !/❓/.test(h.pil)) && hof.filter(h => !h.baas).every(h => /❓/.test(h.pil)), `B0.11 ${vp.naam}: bij fakkel 0 telegrafeert de baas ("${(hof.find(h => h.baas) || {}).pil}"), het hof niet (${hof.filter(h => !h.baas).map(h => h.pil).join(', ')})`);
  /* buiten het gevecht bestaat de balk niet */
  await page.evaluate(() => { stopGevechtLus(); S.gevecht = null; toonScherm('kaart'); try { renderKaartScherm(); } catch (e) { } });
  await slaap(300);
  const weg = await page.evaluate(() => getComputedStyle(document.getElementById('baas-balk')).display);
  t(weg === 'none', `B0.10 ${vp.naam}: buiten het gevecht is #baas-balk weg (display ${weg})`);
  t(page.__f.length === 0, `${vp.naam}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
  await ctx.close();
  return { kop: `HUD in de tirade en buiten het gevecht, het hof in het donker · ${vp.naam}`, regels: R };
}

/* 7 · de intent-assert (jury W3): elke intent-soort heeft een eigen tak in intentTekst */
async function intents(browser) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  /* statisch: elke `type: '...'` in een intent-object van VIJANDEN/game.js */
  const bron = ['js/data.js', 'js/game.js'].map(f => fs.readFileSync(path.join(WORKTREE, f), 'utf8')).join('\n');
  const game = fs.readFileSync(path.join(WORKTREE, 'js/game.js'), 'utf8');
  const kop = game.indexOf('function intentTekst('), staart = game.indexOf('\nfunction ', kop + 10);
  const tak = game.slice(kop, staart);
  const takken = new Set([...tak.matchAll(/it\.type === '([a-z_]+)'/g)].map(m => m[1]));
  const soorten = new Set();
  for (const m of bron.matchAll(/\{[^{}]*?\btype:\s*'([a-z_]+)'[^{}]*?\}/g)) {
    const blok = m[0];
    if (/\b(naam|dmg|blok|doe|kort|icoon)\s*:/.test(blok) && !/\bkost\s*:/.test(blok)) soorten.add(m[1]);
  }
  const zonderTak = [...soorten].filter(s => !takken.has(s) && s !== 'debuff');
  t(zonderTak.length === 0, `intent-assert (statisch): elke intent-soort in de code heeft een eigen tak in intentTekst — soorten: ${[...soorten].sort().join(', ')}; zonder tak: [${zonderTak.join(', ')}] ('debuff' mag de default-tak gebruiken)`);
  /* dynamisch: de echte zetten van de drie bazen (en hun hof) over 12 beurten */
  const { ctx, page } = await open(browser, 'L1440');
  const res = [];
  for (const baas of ['slijmkoning', 'erfprins', 'dicktator', 'hof']) {
    await startBaas(page, baas);
    res.push(...await page.evaluate(() => {
      const uit = [];
      for (const v of S.gevecht.vijanden.filter(x => !x.dood)) {
        const oud = v.intent;
        for (let b = 0; b < 12; b++) {
          let it; try { it = VIJANDEN[v.id].kies(v, b); } catch (e) { continue; }
          if (!it) continue;
          v.intent = it;
          const html = intentTekst(v);
          const d = document.createElement('div'); d.innerHTML = html;
          const pillen = [...d.querySelectorAll('.intent')];
          uit.push({ id: v.id, type: it.type, tips: pillen.map(p => p.dataset.tip || ''), tekst: pillen.map(p => p.textContent.trim()) });
        }
        v.intent = oud;
      }
      renderGevecht();
      return uit;
    }));
  }
  const liegt = res.filter(r => r.type !== 'debuff' && r.tips.some(tp => /verzwakt jou/.test(tp)));
  const leeg = res.filter(r => !r.tips.length || r.tips.some(tp => !tp.trim()));
  const getal = res.filter(r => (r.type === 'aanval' || r.type === 'factuur') && r.tekst.some((tx, i) => { const n = (tx.match(/\d+/g) || []).pop(); return n && !r.tips[i].includes(n); }));
  t(liegt.length === 0, `intent-assert (dynamisch, ${res.length} zetten van 3 bazen + hof): geen pil valt terug op "verzwakt jou" tenzij het een debuff is ([${[...new Set(liegt.map(r => r.id + ':' + r.type))].join(', ')}])`);
  t(leeg.length === 0, `intent-assert: elke pil heeft een niet-lege data-tip ([${[...new Set(leeg.map(r => r.id + ':' + r.type))].join(', ')}])`);
  t(getal.length === 0, `intent-assert: elke schadepil noemt haar getal ook in de tip ([${[...new Set(getal.map(r => r.id + ':' + r.type))].join(', ')}])`);
  t(page.__f.length === 0, `intent-assert: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
  await ctx.close();
  return { kop: 'Intent-assert (jury W3)', regels: R };
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  /* SLAYIT_TAKEN=<regex> draait een deel (bv. 'rust|dood'), op de naam hieronder */
  const FILTER = process.env.SLAYIT_TAKEN ? new RegExp(process.env.SLAYIT_TAKEN) : null;
  const taken = [
    ...['M800', 'M846', 'M740', 'L1440', 'L1440d3', 'L1366', 'L1366d3', 'P412'].map(fk => ['rust ' + fk, () => perFormaat(browser, fk)]),
    ...['M800', 'L1440'].map(fk => ['sluis ' + fk, () => sluisEnWachtrij(browser, fk)]),
    ...['M800', 'M846', 'L1366', 'L1366d3'].map(fk => ['overgang ' + fk, () => overgang(browser, fk)]),
    ...['M800', 'L1440', 'L1366d3'].map(fk => ['dood ' + fk, () => dood(browser, fk)]),
    ...['M800', 'L1440'].map(fk => ['lijkweg ' + fk, () => lijkWeg(browser, fk)]),
    ...['L1440d3', 'L1366d3'].map(fk => ['3d ' + fk, () => driedee(browser, fk)]),
    ...['M800', 'L1440'].map(fk => ['hud ' + fk, () => hudEnHof(browser, fk)]),
    ['intents', () => intents(browser)]
  ].filter(([n]) => !FILTER || FILTER.test(n)).map(([, f]) => f);
  const uit = new Array(taken.length); let i = 0;
  const t0 = Date.now();
  await Promise.all(Array.from({ length: PAR }, async () => {
    while (i < taken.length) {
      const k = i++;
      try { uit[k] = await taken[k](); } catch (e) { uit[k] = { kop: 'taak ' + k, regels: [[false, 'taak brak af: ' + e.message]] }; }
      process.stderr.write(`  [${Math.round((Date.now() - t0) / 1000)} s] klaar: ${uit[k].kop}\n`);
    }
  }));
  let ok = 0, fout = 0;
  for (const u of uit) {
    console.log('\n== ' + u.kop + ' ==');
    for (const [g, s] of u.regels) { g ? ok++ : fout++; console.log('   ' + (g ? 'ok   ' : 'FOUT ') + s); }
  }
  console.log('\n============================================');
  console.log(fout ? fout + ' FOUT(EN), ' + ok + ' ok' : 'ALLES GROEN — ' + ok + ' controles');
  console.log('============================================');
  await browser.close();
  process.exit(fout ? 1 : 0);
})();
