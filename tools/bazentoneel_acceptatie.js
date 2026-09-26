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
   SLAYIT_TAKEN=<regex> draait een deel (bv. 'rust|dood'); een volledige run duurt ~11 min.

   De eindverificatie van §6, zonder runtime-patches (de code zelf moet het halen):
   - rust: 3 bazen (+ het hof) x statussen {0, 1, 4, 5, held met 5} x fakkel {100, 0}:
     pil ~ topbalk 0, chip ~ hand 0, 2D-voet <= 2 px tussen held en baas, eigen label
     in 3D <= 0,2 % per label (en geen naamlabels), Beurt-botsingen 0;
   - de overgangen van de DICKtator per 50 ms: spraak ~ titel 0, spraak ~ held 0,
     spraak ~ spreker <= 250 ms per regel, zijn pil nooit in de topbalk;
   - de tweede dood -> de outro met de doodregel; de verslagen baas blijft liggen;
   - nooit twee banners tegelijk (de wachtrij), op elke baas en in de echte overgangen;
   - de baaspil ook bij fakkel 0 in beeld, zonder ❓, en te lezen onder het vignet;
   - de intent-assert: elke intent-soort heeft een eigen tak in intentTekst (statisch), en
     geen zet van een baas, het hof of een gewone vijand valt terug op 'verzwakt jou'.
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
    const eigenBaasEls = kol ? [kol.querySelector('.vijand-naam'), kol.querySelector('.hp-balk'), ...kol.querySelectorAll('.blok-status > *'), ...kol.querySelectorAll('.intent')].filter(zicht) : [];
    const eigenHeldEls = [...document.querySelectorAll('#speler-zone .hp-balk, #speler-zone .blok-status > *')].filter(zicht);
    const eigenBaas = kol ? pct(bf, eigenBaasEls.map(R)) : 0;
    const eigenHeld = pct(held, eigenHeldEls.map(R));
    /* per label (zoals het P-harnas: het grootste stuk lijf onder één naam, hp-balk, chip of pil) */
    let eigenLabel = 0, eigenLabelWie = '';
    const perLabel = (f, els, wie) => { if (!f) return; for (const e of els) { const p = pct(f, [R(e)]); if (p > eigenLabel) { eigenLabel = p; eigenLabelWie = wie + ':' + (e.className || e.tagName).toString().split(' ')[0] + ' "' + e.textContent.trim().slice(0, 12) + '"'; } } };
    perLabel(bf, eigenBaasEls, 'baas'); perLabel(held, eigenHeldEls, 'held');
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
      heldTB: tb ? Math.round(som(heldChips, [tb])) : 0, heldUit: heldChips.filter(c => c.l < -0.5 || c.t < -0.5 || c.r > W + 0.5).length, heldChipsN: heldChips.length,
      chipsAnderPil: Math.round(som(baasChips, anderPillen)), chipsAnderArt: anderArts.length ? Math.max(...anderArts.map(a => +(100 * som(baasChips, [a]) / ((a.r - a.l) * (a.b - a.t))).toFixed(1))) : 0,
      eigenBaas, eigenHeld, eigenLabel, eigenLabelWie,
      namen: [...document.querySelectorAll('#vijanden-rij .vijand-naam, #speler-zone .speler-naam')].filter(zicht).length,
      pilN: pillen.length, pilRect: pillen.length ? { l: Math.min(...pillen.map(p => p.l)), t: Math.min(...pillen.map(p => p.t)), r: Math.max(...pillen.map(p => p.r)), b: Math.max(...pillen.map(p => p.b)) } : null,
      spraak: !!sp, spRegels: regels, spBaas: pct(bf, sp ? [sp] : []), spPil: Math.round(som(sp ? [sp] : [], pillen)), spHeld: pct(held, sp ? [sp] : []), spHeldChips: Math.round(som(sp ? [sp] : [], heldChips)), spChips: Math.round(som(sp ? [sp] : [], chips)),
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
  held5: { baas: {}, held: { kracht: 2, zwak: 1, kwetsbaar: 1, gif: 3, doornen: 2 } },
  /* B2 F1: een power-build (Metaalhuid, Demonenvorm): 7 statussen op de held, 5 op de baas */
  held7: { baas: { gif: 9, zwak: 2, kwetsbaar: 2, kracht: 2, doornen: 2 }, held: { kracht: 2, zwak: 1, kwetsbaar: 1, gif: 3, doornen: 2, metaalhuid: 3, demonenvorm: 2 } }
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

/* B0.3: schudScherm en dan .slowmo, per animatieframe gemeten (in de pagina). Plaat, canvas en
   bazenbalk tegenover hun rustpositie; in 3D ook elke labelkolom (fixed in #strijdveld)
   tegenover de style.left/top die gevechtTik zet - in rust gelijk. B2 F1: een translate of
   filter op #strijdveld maakte hem hun containing block (140-177 px). */
async function labelSchok() {
  const top = id => { const e = document.getElementById(id); return e ? e.getBoundingClientRect().top : null; };
  const bbTop = () => document.getElementById('baas-balk').getBoundingClientRect().top;
  const d3 = document.getElementById('scherm-gevecht').classList.contains('d3-actief');
  const kol = () => [...document.querySelectorAll('#vijanden-rij .vijand:not(.sterft)'), document.getElementById('speler-zone')].filter(e => e && e.style.top);
  const afw = () => kol().map(e => { const q = e.getBoundingClientRect(); return Math.max(Math.abs(q.top - parseFloat(e.style.top)), Math.abs(q.left + q.width / 2 - parseFloat(e.style.left))); });
  const rust = { bg: top('gevecht-achtergrond'), cv: top('vista-canvas'), bb: bbTop() };
  const lab0 = d3 ? afw() : [];
  let bg = 0, cv = 0, bb = 0, lab = 0;
  const neem = () => {
    bg = Math.max(bg, Math.abs(top('gevecht-achtergrond') - rust.bg)); cv = Math.max(cv, Math.abs(top('vista-canvas') - rust.cv)); bb = Math.max(bb, Math.abs(bbTop() - rust.bb));
    if (d3) afw().forEach((a, i) => { if (isFinite(a)) lab = Math.max(lab, Math.abs(a - (lab0[i] || 0))); });
  };
  const lus = async ms => { const t0 = performance.now(); while (performance.now() - t0 < ms) { await new Promise(r => requestAnimationFrame(r)); neem(); } };
  schudScherm();
  await lus(420);
  await new Promise(r => setTimeout(r, 300));
  const sc = document.getElementById('scherm-gevecht'); sc.classList.add('slowmo');
  await lus(330);
  sc.classList.remove('slowmo');
  return { bg: +bg.toFixed(1), cv: +cv.toFixed(1), bb: +bb.toFixed(1), lab: Math.round(lab), n: lab0.length };
}

/* ---------- de secties: elke taak geeft { kop, regels: [[goed, tekst]] } terug ---------- */
const max = (a, f) => a.length ? Math.max(...a.map(f)) : 0;

/* 1 · per formaat: de rustmatrix (B0.1, B0.2, B0.8, B0.9, B0.12), de fasebanner (B0.13), de
   spraakplaat in rust (B0.5), de HUD en de telegraaf (B0.10, B0.11) en de schok (B0.3) */
async function perFormaat(browser, fk) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  const laptop = !vp.mobiel, mobielLiggend = vp.mobiel && !vp.staand;
  /* §6: {0, 4, 5 statussen, held met 5} op held en baas, plus 1 (B0.1) */
  const statussen = ['geen', 'een', 'vier', 'vijf', 'held5'].concat(laptop ? ['held7'] : []);   /* F1: laptop tot 7 statussen (B0.12); mobiel: zie held7Mobiel */
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
        const m = await page.evaluate(() => __BT.meet()); m.st = st; m.f = f;
        /* B0.11: de baaspil is ook bij fakkel 0 te LEZEN (p98 van de pil, onder het vignet) */
        if (baas !== 'hof' && (st === 'geen' || st === 'vijf')) m.pilLum = await helderheid(page, m.pilRect);
        rijen.push(m);
        if ((st === 'vijf' || (baas === 'hof' && st === 'vier')) && f === 'max') await shot(page, `${vp.naam}_${baas}_${st}`);
        if (st === 'vijf' && f === 0) await shot(page, `${vp.naam}_${baas}_${st}_f0`);
      }
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
        t(max(rijen, m => Math.max(m.eigenBaas, m.eigenHeld)) <= 1, `B0.12 ${vp.naam} ${B}: alle eigen labels samen op het eigen lijf <= 1 % (max ${max(rijen, m => Math.max(m.eigenBaas, m.eigenHeld))} %)`);
        { const w = rijen.reduce((a, m) => (m.eigenLabel > a.eigenLabel ? m : a), rijen[0]);
          t(w.eigenLabel <= 0.2, `B0.12 ${vp.naam} ${B}: eigen label op eigen lijf <= 0,2 % per label (max ${w.eigenLabel} %${w.eigenLabel ? ', ' + w.eigenLabelWie + ' bij ' + w.st + '/fakkel ' + w.f : ''})`); }
        t(max(rijen, m => m.pilBB) === 0, `B0.12 ${vp.naam} ${B}: pil ~ bazenbalk = 0 (max ${max(rijen, m => m.pilBB)} px2)`);
        t(max(rijen, m => Math.abs(m.voetBaas - m.grondY) / m.H * 100) <= 2, `B0.12 ${vp.naam} ${B}: |voet - grondlijn| <= 2 % vh (max ${max(rijen, m => Math.abs(m.voetBaas - m.grondY) / m.H * 100).toFixed(2)} %)`);
        t(max(rijen, m => m.namen) === 0, `B0.12 ${vp.naam} ${B}: geen naamlabels in een 3D-baasgevecht (max ${max(rijen, m => m.namen)} zichtbaar)`);
        t(rijen.every(m => m.kader && m.kader.eigen && m.kader.fov <= (m.st === 'held7' ? 75 : 70)), `B0.12 ${vp.naam} ${B}: eigen kader, fov ${[...new Set(rijen.map(m => m.kader && m.kader.fov.toFixed(1)))].join('/')} (<= 70; <= 75 met een tweede chiprij onder de held, F1)`);
      }
      if (mobielLiggend) {
        t(max(rijen, m => m.chipsHand) === 0 && max(rijen, m => m.chipsUit) === 0 && max(rijen, m => m.chipsBB) === 0, `B0.8 ${vp.naam} ${B}: chips ~ hand 0, uit beeld 0, ~ bazenbalk 0 over ${n} staten (max ${max(rijen, m => m.chipsHand)}/${max(rijen, m => m.chipsUit)}/${max(rijen, m => m.chipsBB)})`);
        t(max(rijen, m => m.pilTop) === 0 && max(rijen, m => m.pilRel) === 0, `B0.9 ${vp.naam} ${B}: pil ~ topbalk 0 en ~ relikwieen 0 (${rijen.filter(m => m.zij).length}/${n} staten pil-zij)`);
        t(max(rijen, m => m.pilBaas) <= 2, `B0.9 ${vp.naam} ${B}: pil ~ baassilhouet <= 2 % (max ${max(rijen, m => m.pilBaas)} %)`);
        t(max(rijen, m => m.pilHeldChips) === 0 && max(rijen, m => m.pilHeld) === 0, `B0.8xB0.9 ${vp.naam} ${B}: pil ~ heldchips 0 en ~ held 0 (max ${max(rijen, m => m.pilHeldChips)} px2 / ${max(rijen, m => m.pilHeld)} %)`);
        t(max(rijen, m => m.scroll) <= 0, `${vp.naam} ${B}: geen horizontale scroll`);
        if (baas === 'hof') t(max(rijen, m => m.chipsAnderPil) === 0 && max(rijen, m => m.chipsAnderArt) <= 2, `B0.8 ${vp.naam} ${B}: de chipkolom van de baas ligt niet over het hof (pil ${max(rijen, m => m.chipsAnderPil)} px2, lijf ${max(rijen, m => m.chipsAnderArt)} % van een art-doos)`);
      }
      if (vp.staand) {
        t(max(rijen, m => m.chipsUit) === 0, `controle ${vp.naam} ${B}: geen chip uit beeld (noodpad)`);
        t(max(rijen, m => m.pilTop) === 0 && max(rijen, m => m.chipsHand) === 0, `controle ${vp.naam} ${B}: pil ~ topbalk ${max(rijen, m => m.pilTop)} px2, chips ~ hand ${max(rijen, m => m.chipsHand)} px2 (noodpad, 0)`);
      }
      /* B0.11: de baaspil staat er ook bij fakkel 0 - zichtbaar, zonder ❓, en te lezen onder het vignet */
      if (baas !== 'hof') {
        const donker = rijen.filter(m => m.f === 0);
        t(donker.length && donker.every(m => m.pilN >= 1 && !/❓/.test(m.intent)), `B0.11 ${vp.naam} ${B}: bij fakkel 0 staat de baaspil in beeld in ${donker.filter(m => m.pilN >= 1).length}/${donker.length} staten, zonder ❓ ("${donker.length ? donker[0].intent : ''}")`);
        /* het vignet mag de pil niet onleesbaar maken: p98 bij fakkel 0 tegenover dezelfde staat
           bij fakkel 100 (een absolute drempel kan niet: de 🌀-pil is van zichzelf al donker, ~110).
           Ter vergelijking: de bazenbalk viel vóór B0.10 onder het vignet naar ~1/3. */
        const paren = ['geen', 'vijf'].map(st => [rijen.find(m => m.st === st && m.f === 0), rijen.find(m => m.st === st && m.f === 'max')]).filter(([a, b]) => a && b && a.pilLum && b.pilLum);
        if (paren.length) {
          const verh = Math.min(...paren.map(([a, b]) => a.pilLum / b.pilLum));
          t(verh >= 0.7, `B0.11 ${vp.naam} ${B}: de baaspil blijft bij fakkel 0 te lezen, p98 ${paren.map(([a, b]) => a.pilLum + '/' + b.pilLum).join(', ')} (fakkel 0 / 100: >= 0,7, min ${verh.toFixed(2)})`);
        }
      }

      /* --- B0.5: de spraakplaat in rust (de echte introregel van de baas) --- */
      await zetStatus(page, 'vier'); await zetFakkel(page, 'max');
      await page.evaluate(() => { _spraakStop(); const b = S.gevecht.vijanden.find(v => VIJANDEN[v.id].baas); baasSpreekt(baasUitspraken(b.id).intro, 2600); });
      await slaap(800);
      const s = await page.evaluate(() => __BT.meet());
      await shot(page, `${vp.naam}_${baas}_spraak`);
      if (!vp.staand) {
        t(s.spraak && s.spBaas <= 1 && s.spPil === 0, `B0.5 ${vp.naam} ${B}: plaat ~ baas ${s.spBaas} % (<= 1), ~ pil ${s.spPil} px2`);
        t(s.spHeld === 0 && s.spBB === 0 && s.spTop === 0 && !s.spUit, `B0.5 ${vp.naam} ${B}: plaat ~ held ${s.spHeld} %, ~ bazenbalk ${s.spBB}, ~ topbalk ${s.spTop}, binnen beeld`);
        /* F1: op de telefoon niet over de chips (B0.8; de introplaat van de Erfprins dekte op 846x381 de bovenste chiprij van de
           held, 1 252-5 376 px2). Op 846x381 is er altijd een schone plek; op 800x360 (DICKtator) en 740x360 niet binnen twee
           regels - dan hooguit één chip (~1 400 px2) bij 4 statussen (vóór F1: 1 392-3 157; met 5: tot 2 807 op 800x360 en 4 653 op 740x360). */
        if (mobielLiggend) {
          if (vp.w === 846) t(s.spHeldChips === 0 && s.spChips === 0, `B0.5 ${vp.naam} ${B}: plaat ~ heldchips ${s.spHeldChips} px2, ~ alle chips ${s.spChips} px2 (0; held en baas met 4 statussen)`);
          else t(s.spHeldChips <= 1400, `B0.5 ${vp.naam} ${B}: plaat ~ heldchips ${s.spHeldChips} px2, ~ alle chips ${s.spChips} px2 (heldchips <= 1 400: hooguit één chip)`);
        }
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
        const sch = await page.evaluate(labelSchok);
        t(sch.bg <= 9 && sch.cv <= 9 && sch.bb === 0, `B0.3 ${vp.naam} ${B}: schok + slowmo: plaat ${sch.bg} px, canvas ${sch.cv} px (<= 9, was 52), bazenbalk ${sch.bb} px (0)`);
        if (vp.d3) t(sch.n > 0 && sch.lab === 0, `B0.3 ${vp.naam} ${B}: in 3D wijkt geen labelkolom (${sch.n}) af van de plek die gevechtTik zet, per frame tijdens schok en slowmo: max ${sch.lab} px (0; F1 mat 140-177)`);
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
  /* de bannerwachtrij: drie banners binnen een halve seconde, op elke baas (jury W4, les 6) */
  for (const baas of ['erfprins', 'slijmkoning', 'dicktator']) {
    if (baas !== 'erfprins') await startBaas(page, baas);
    const B = BAZEN[baas];
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
    t(d.maxN === 1, `bannerwachtrij ${vp.naam} ${B}: nooit meer dan één banner tegelijk (max ${d.maxN})`);
    t(v.EEN && v.TWEE && v.DRIE && v.EEN[0] < v.TWEE[0] && v.TWEE[0] < v.DRIE[0], `bannerwachtrij ${vp.naam} ${B}: volgorde behouden (EEN ${v.EEN && v.EEN[0]}, TWEE ${v.TWEE && v.TWEE[0]}, DRIE ${v.DRIE && v.DRIE[0]} ms)`);
    t(['EEN', 'TWEE'].every(k => v[k] && v[k][1] - v[k][0] >= 1300), `bannerwachtrij ${vp.naam} ${B}: elke banner >= 1,4 s leesbaar (EEN ${v.EEN && v.EEN[1] - v.EEN[0]}, TWEE ${v.TWEE && v.TWEE[1] - v.TWEE[0]} ms)`);
    t(d.beefs === 3, `bannerwachtrij ${vp.naam} ${B}: elke banner schudt pas als hij verschijnt (${d.beefs} schokken, verwacht 3)`);
    t(d.html === '<div class="baas-flits"><h2>X</h2><span>y</span></div>', `bannerwachtrij ${vp.naam} ${B}: de DOM van een banner is onveranderd (${d.html})`);
    await page.evaluate(() => new Promise(r => setTimeout(r, 2600)));
  }
  t(page.__f.length === 0, `${vp.naam}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
  await ctx.close();
  return { kop: `Tekstsluis, pauze, vervallen en bannerwachtrij · ${vp.naam}`, regels: R };
}

/* 3 · de echte bedrijfsovergangen van de DICKtator (I->II, II->III, de herverkiezing):
   plaat ~ titel, ~ spreker, ~ held, per 50 ms in de pagina (zoals r_overgang2 van het P-harnas) */
async function overgang(browser, fk) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  for (const [nv, naam, venster] of [[2, 'I->II', 7000], [3, 'II->III', 7500], [4, 'III->IV', 9000]]) {
    await page.evaluate(nv => { DEV_BUILDS.slachter_mid.metgezel = null; DICK.tempo = 1; devDicktator('slachter_mid', { netVoor: nv }); if (document.querySelector('#draai-blok.toon') && typeof speelTochStaand === 'function') speelTochStaand(); }, nv);
    await slaap(800); await page.evaluate(() => { const b = document.getElementById('baas-intro'); if (b) b.click(); });
    await wachtRust(page, 9000, 45000);
    const o = await page.evaluate(async venster => {
      document.querySelectorAll('#meldingen .toast').forEach(t => t.remove());
      const R = e => { const q = e.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom }; };
      const snij = (a, b) => { const l = Math.max(a.l, b.l), t = Math.max(a.t, b.t), r = Math.min(a.r, b.r), bb = Math.min(a.b, b.b); return (r > l && bb > t) ? (r - l) * (bb - t) : 0; };
      const o = { titel: 0, baas: 0, baasMax: 0, baasPct: 0, pil: 0, held: 0, regels: {}, banners: 0, pilTop: 0, pilTopMax: 0 };
      const tbEl = document.getElementById('topbalk');
      let vorig = performance.now(); const t0 = vorig;
      const iv = setInterval(() => {
        const nu = performance.now(), dt = nu - vorig; vorig = nu;
        o.banners = Math.max(o.banners, document.querySelectorAll('.baas-flits').length);
        const spEls = [...document.querySelectorAll('.baas-spraak')].filter(e => +getComputedStyle(e).opacity > 0.2);
        const tit = [...document.querySelectorAll('.vonnis h2, .vonnis span, .baas-flits h2, .baas-flits span')].map(R);
        const g = S.gevecht; if (!g) return;
        const b = g.vijanden.find(v => !v.dood && v.id === 'de_dicktator');
        let br = null;
        if (b) { if (d3Actief() && window.Vista) { const p = Vista.schermPos(b); if (p) { const h = p.voetY - p.topY; br = { l: p.x - h * 0.36, r: p.x + h * 0.36, t: p.topY, b: p.voetY }; } } else { const a = GDOM.vijanden[g.vijanden.indexOf(b)].wrap.querySelector('.vijand-art'); if (a) br = R(a); } }
        const pil = b ? [...GDOM.vijanden[g.vijanden.indexOf(b)].wrap.querySelectorAll('.intent')].map(R) : [];
        /* B0.9: zijn pil valt ook tijdens de overgang (oprijzen, het hof dat opkomt) niet in de topbalk */
        if (b && tbEl) { const tb = R(tbEl); const zp = b ? [...GDOM.vijanden[g.vijanden.indexOf(b)].wrap.querySelectorAll('.intent')].filter(e => { for (let q = e; q && q !== document.body; q = q.parentElement) { const c = getComputedStyle(q); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return false; } return true; }) : []; const x = zp.reduce((a, e) => a + snij(R(e), tb), 0); if (x > 0) { o.pilTop += dt; o.pilTopMax = Math.max(o.pilTopMax, Math.round(x)); } }
        let hr = null; if (d3Actief() && window.Vista) { const p = Vista.schermPos(g.speler); if (p) { const h = p.voetY - p.topY; hr = { l: p.x - h * 0.3, r: p.x + h * 0.3, t: p.topY, b: p.voetY }; } } else { const hf = document.getElementById('speler-figuur'); if (hf) hr = R(hf); }
        for (const e of spEls) {
          const s = R(e.querySelector('span') || e);
          const k = e.textContent.slice(0, 30); const r = o.regels[k] || (o.regels[k] = { van: nu - t0, tot: nu - t0, baas: 0 }); r.tot = nu - t0;
          /* F1: een staande plaat springt niet (grootste sprong van haar midden tussen twee metingen) */
          const lx = parseFloat(e.style.left); if (isFinite(lx)) { if (r.lx != null) o.sprong = Math.max(o.sprong || 0, Math.abs(lx - r.lx)); r.lx = lx; }
          if (tit.some(x => snij(s, x) > 0)) o.titel += dt;
          if (br) { const x = snij(s, br); if (x > 0) { o.baas += dt; r.baas += dt; if (x > o.baasMax) { o.baasMax = Math.round(x); o.baasPct = +(100 * x / ((br.r - br.l) * (br.b - br.t))).toFixed(2); } } }
          if (pil.some(p => snij(s, p) > 0)) o.pil += dt;
          if (hr && snij(s, hr) > 0) o.held += dt;
        }
      }, 50);
      _devKlapNu(DEV_KLAP);
      await new Promise(r => setTimeout(r, venster));
      clearInterval(iv);
      for (const k of ['titel', 'baas', 'pil', 'held']) o[k] = Math.round(o[k]);
      o.venster = venster;
      return o;
    }, venster);
    /* een regel die aan het einde van het meetvenster nog stond, telt niet voor de leesduur */
    const af = Object.entries(o.regels).filter(([, r]) => r.tot < o.venster - 300);
    const regels = Object.entries(o.regels).map(([k, r]) => `${k.slice(0, 16)}… ${Math.round(r.tot - r.van)} ms`).join(', ');
    t(o.titel === 0, `B0.4 ${vp.naam} ${naam}: plaat ~ scènetitel/banner ${o.titel} ms (0)`);
    t(Object.keys(o.regels).length >= 1 && af.every(([, r]) => r.tot - r.van >= 700), `B0.4 ${vp.naam} ${naam}: elke regel leesbaar, >= 0,7 s (${regels})`);
    /* §3 B0.5: plaat ~ spreker <= 250 ms PER REGEL en <= 1 % van zijn figuur (hier de doos rond de
       art of de 3D-sprite, ruimer dan het silhouet: wat overblijft, zijn randpixels) */
    const perRegel = Math.round(Math.max(0, ...Object.values(o.regels).map(r => r.baas)));
    t(perRegel <= 250 && o.baasPct <= 1 && o.pil <= 250, `B0.5 ${vp.naam} ${naam}: plaat ~ DICKtator ${perRegel} ms per regel (${o.baas} ms samen, max ${o.baasMax} px2 = ${o.baasPct} % van zijn doos), ~ zijn pil ${o.pil} ms (<= 250 ms, <= 1 %)`);
    t(o.held === 0, `B0.5 ${vp.naam} ${naam}: plaat ~ held ${o.held} ms (0)`);
    t((o.sprong || 0) <= 40, `B0.5 ${vp.naam} ${naam}: een staande plaat springt niet - grootste verschuiving tussen twee metingen (50 ms) ${Math.round(o.sprong || 0)} px (<= 40; F1: 431 px van kant op 800x360)`);
    if (vp.mobiel && !vp.staand) t(o.pilTop === 0, `B0.9 ${vp.naam} ${naam}: zijn pil ~ topbalk ${Math.round(o.pilTop)} ms (max ${o.pilTopMax} px2) tijdens de overgang (0)`);
    t(o.banners <= 1, `bannerwachtrij ${vp.naam} ${naam}: nooit meer dan één banner tegelijk in de echte overgang (max ${o.banners})`);
  }
  t(page.__f.length === 0, `${vp.naam}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
  await ctx.close();
  return { kop: `Bedrijfsovergangen van de DICKtator · ${vp.naam}`, regels: R };
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
/* B2 F1: de genadeklap vlak na een banner. Geen banner meer na g.voorbij (ook niet uit de
   rij), en het slotwoord komt en staat >= 1,0 s. (a) De Slijmkoning van 60 % naar 20 % in één
   klap (DE KONING SPLIJT + KONINKLIJKE WOEDE in de rij) en 300 ms later alles dood; (b) de
   Erfprins sterft, herrijst in DE PLAGIAATFASE (banner na ~950 ms) en valt opnieuw na 1,2 s. */
async function bannerDood(browser, fk) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  const OPNAME = () => {
    const g = S.gevecht; const du = baasUitspraken(g.vijanden.find(v => VIJANDEN[v.id].baas).id);
    window.__bd = { rec: [], t0: performance.now(), vb: null, dood: [du.dood, du.doodGebroken].filter(Boolean).map(x => x.trim().slice(0, 24)) };
    window.__bd.iv = setInterval(() => {
      const t = Math.round(performance.now() - window.__bd.t0);
      if (window.__bd.vb == null && g.voorbij) window.__bd.vb = t;
      window.__bd.rec.push({ t, fl: [...document.querySelectorAll('.baas-flits h2')].map(e => e.textContent), beef: document.getElementById('scherm-gevecht').classList.contains('beef'), sp: [...document.querySelectorAll('.baas-spraak')].filter(e => +getComputedStyle(e).opacity > 0.2).map(e => e.textContent.trim().slice(0, 24)), sg: S.gevecht === g });
    }, 50);
  };
  const scen = [
    ['Slijmkoning, SPLIJT + WOEDE in de rij, kill na 300 ms', 'slijmkoning', async () => {
      const g = S.gevecht; const b = g.vijanden.find(v => VIJANDEN[v.id].baas);
      b.hp = Math.round(b.maxHp * 0.6); renderGevecht();
      b.hp = Math.round(b.maxHp * 0.2); checkBaasFase(); renderGevecht();
      window.__bd.klapNa = Math.round(performance.now() - window.__bd.t0);
      await new Promise(r => setTimeout(r, 300));
      g.vijanden.forEach(v => { if (!v.dood) verliesHp(v, 9999); }); renderGevecht();
      if (alleVijanden().length === 0) gevechtGewonnen();
    }],
    ['Erfprins, kill 1,2 s na zijn schijndood (DE PLAGIAATFASE)', 'erfprins', async () => {
      const g = S.gevecht; const b = g.vijanden.find(v => v.id === 'de_erfprins');
      b.gestolen = S.dek.slice(0, 3).map(c => ({ id: c.id, soort: 'geroofd' }));
      verliesHp(b, 9999); renderGevecht();
      await new Promise(r => setTimeout(r, 1200));
      verliesHp(b, 9999); renderGevecht(); if (alleVijanden().length === 0) gevechtGewonnen();
    }]
  ];
  for (const [naam, baas, klap] of scen) {
    try {
      await startBaas(page, baas);
      await page.evaluate(OPNAME);
      await page.evaluate(klap);
      await slaap(4600);
      const r = await page.evaluate(() => { clearInterval(window.__bd.iv); return window.__bd; });
      const na = r.rec.filter(x => r.vb != null && x.t > r.vb + 60 && x.sg);
      const nieuw = [...new Set(na.flatMap(x => x.fl))].filter(tt => !r.rec.some(x => x.t <= r.vb && x.fl.includes(tt)));
      const isSlot = tx => r.dood.some(d => tx === d || tx.startsWith(d.slice(0, 18)));
      const slot = na.filter(x => x.sp.some(isSlot));
      const slotMs = slot.length ? slot[slot.length - 1].t - slot[0].t : 0;
      /* een banner die bij de kill al stond, mag blijven tot het slotwoord komt - daarna niets meer */
      const bannerNa = slot.length ? r.rec.filter(x => x.t >= slot[0].t && x.fl.length) : [];
      t(r.vb != null && nieuw.length === 0 && bannerNa.length === 0, `bannerwachtrij ${vp.naam} ${naam}: geen nieuwe banner na de overwinning ([${nieuw.join(', ')}]), en geen enkele meer zodra het slotwoord staat (${bannerNa.length ? bannerNa.map(x => x.fl[0]).slice(0, 1) + ' op ' + (bannerNa[0].t - r.vb) + ' ms' : '-'})`);
      t(slotMs >= 1000, `B0.4 ${vp.naam} ${naam}: het slotwoord komt en staat ${slotMs} ms in beeld (>= 1,0 s${slot.length ? ', "' + slot[0].sp.find(isSlot) + '…"' : ', NOOIT'})`);
    } catch (e) { t(false, `${vp.naam} ${naam}: fout in de meting: ${e.message}`); }
    await slaap(500);
    await page.evaluate(() => { document.querySelectorAll('.dt-overlay').forEach(e => e.remove()); try { toonScherm('kaart'); } catch (e) { } });
  }
  t(page.__f.length === 0, `${vp.naam}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
  await ctx.close();
  return { kop: `De genadeklap vlak na een banner · ${vp.naam}`, regels: R };
}

/* B2 F1 · B0.4: de eerste ontmoeting met de Erfprins (de Inventaris-intro). orakel[0] wordt
   aangevraagd terwijl de introregel nog staat; de vervaltermijn (2,5 s) mag alleen de tijd
   aan de dichte sluis tellen, niet de tijd achter die plaat. Vroeger 0 van 4 in beeld.
   tik: na hoeveel ms de speler de intro wegtikt (0 = de intro loopt vanzelf af). */
async function orakel(browser, fk, tik) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  const r = await page.evaluate(async tik => {
    S.metgezel = null; if (typeof DICK !== 'undefined') DICK.tempo = 1;
    const ork = (UITSPRAKEN._erfprins.orakel || [])[0] || '';
    const intro = baasUitspraken('de_erfprins').intro || '';
    const rec = []; const t0 = performance.now();
    const iv = setInterval(() => rec.push({ t: Math.round(performance.now() - t0), sp: [...document.querySelectorAll('.baas-spraak')].filter(e => +getComputedStyle(e).opacity > 0.2).map(e => e.textContent.trim()) }), 50);
    devErfprinsIntro();
    if (document.querySelector('#draai-blok.toon') && typeof speelTochStaand === 'function') speelTochStaand();
    const inv = !!document.querySelector('.baas-intro-inventaris');
    if (tik) setTimeout(() => { const b = document.getElementById('baas-intro'); if (b) b.click(); }, tik);
    await new Promise(r => setTimeout(r, tik ? tik + 13000 : 24000));   /* intro weg ~5,1 s na de tik, dan twee platen van 3,2 s */
    clearInterval(iv);
    const duur = tx => { const z = rec.filter(x => x.sp.some(s => s.startsWith(tx.trim().slice(0, 20)))); return z.length ? z[z.length - 1].t - z[0].t : 0; };
    return { inv, ork: duur(ork), intro: duur(intro), orkTekst: ork.slice(0, 30) };
  }, tik);
  t(r.inv, `B0.4 ${vp.naam} eerste ontmoeting (tik ${tik ? tik + ' ms' : 'geen'}): de Inventaris-intro speelt`);
  t(r.intro >= 1500 && r.ork >= 1500, `B0.4 ${vp.naam} eerste ontmoeting (tik ${tik ? tik + ' ms' : 'geen'}): de introregel ${r.intro} ms en orakel[0] ${r.ork} ms in beeld (elk >= 1,5 s; "${r.orkTekst}…")`);
  t(page.__f.length === 0, `${vp.naam}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
  await ctx.close();
  return { kop: `Het orakel bij de eerste ontmoeting · ${vp.naam} · tik ${tik || 'geen'}`, regels: R };
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

/* B2 F1 · B0.8 op mobiel liggend met een power-build: 7 en 9 statussen op de held. Tussen de
   topbalk en zijn hoofd passen twee chiprijen; met 3 per rij liep de derde rij de topbalk in
   (934-1 602 px2), en bij 4 vijanden viel de blok links uit beeld. Nu: de rij wordt breder
   waar het moet (css C2) en de blok blijft op x >= 44 (heldChipsWijken). Op elke baas en in
   gewone gevechten met 1, 3 en 4 vijanden (die zelf 3 statussen dragen). */
async function held7Mobiel(browser, fk) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  const thomas = vp.w === 800 || vp.w === 846;
  const HELD = { h7: STATUS.held7.held, h9: Object.assign({ ritueel: 1, regeneratie: 2 }, STATUS.held7.held) };
  const zet = async hs => { await page.evaluate(hs => { const g = S.gevecht; g.speler.status = Object.assign({}, hs); g.vijanden.forEach(v => { if (!v.dood) v.status = (VIJANDEN[v.id] && VIJANDEN[v.id].baas) ? { gif: 9, zwak: 2, kwetsbaar: 2, kracht: 2, doornen: 2 } : { gif: 4, zwak: 1, kwetsbaar: 2 }; }); renderGevecht(); }, hs); await slaap(700); return page.evaluate(() => __BT.meet()); };
  for (const baas of ['slijmkoning', 'erfprins', 'dicktator']) {
    try {
      await startBaas(page, baas);
      for (const [hn, hs] of Object.entries(HELD)) {
        const m = await zet(hs);
        if (hn === 'h7') await shot(page, `${vp.naam}_${baas}_held7`);
        t(m.heldChipsN >= 7 && m.heldTB === 0 && m.heldUit === 0, `B0.8 ${vp.naam} ${BAZEN[baas]} ${hn}: heldchips (${m.heldChipsN}) ~ topbalk ${m.heldTB} px2, uit beeld ${m.heldUit} (0; F1: was 934-1 602 px2)`);
        t(m.chipsHand === 0 && m.chipsBB === 0, `B0.8 ${vp.naam} ${BAZEN[baas]} ${hn}: chips ~ hand ${m.chipsHand}, ~ bazenbalk ${m.chipsBB} (0)`);
        if (thomas) t(m.pilHeldChips === 0, `B0.8xB0.9 ${vp.naam} ${BAZEN[baas]} ${hn}: baaspil ~ heldchips ${m.pilHeldChips} px2 (0)`);
      }
    } catch (e) { t(false, `${vp.naam} ${BAZEN[baas]}: fout in de meting: ${e.message}`); }
  }
  for (const comp of [['grotrat'], ['grotrat', 'grotrat', 'grotrat'], ['grotrat', 'grotrat', 'grotrat', 'grotrat']]) {
    try {
      await page.evaluate(c => { S.metgezel = null; S.gevecht = null; startGevecht(c, 'gevecht'); if (document.querySelector('#draai-blok.toon') && typeof speelTochStaand === 'function') speelTochStaand(); }, comp);
      await slaap(1800); await wachtRust(page, 600, 12000);
      for (const [hn, hs] of Object.entries(HELD)) {
        const m = await zet(hs);
        const pil = await page.evaluate(() => { const R = e => { const q = e.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom }; }; const snij = (a, b) => { const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t); return (w > 0 && h > 0) ? w * h : 0; }; const hc = [...document.querySelectorAll('#speler-zone .blok-status > *')].map(R); const p = [...document.querySelectorAll('#vijanden-rij .vijand:not(.sterft) .intent')].map(R); return Math.round(hc.reduce((s, c) => s + p.reduce((u, q) => u + snij(c, q), 0), 0)); });
        if (hn === 'h7') await shot(page, `${vp.naam}_gewoon${comp.length}_held7`);
        t(m.heldChipsN >= 7 && m.heldTB === 0 && m.heldUit === 0, `B0.8 ${vp.naam} gewoon gevecht, ${comp.length} vijand(en), ${hn}: heldchips (${m.heldChipsN}) ~ topbalk ${m.heldTB} px2, uit beeld ${m.heldUit} (0)${pil ? ` [bekend: ~ vijandpil ${pil} px2 - de blok staat al tegen x = 44]` : ''}`);
        if (comp.length === 1) t(pil === 0, `B0.8 ${vp.naam} gewoon gevecht, 1 vijand, ${hn}: heldchips ~ vijandpil ${pil} px2 (0)`);
      }
    } catch (e) { t(false, `${vp.naam} gewoon ${comp.length}: fout in de meting: ${e.message}`); }
  }
  t(page.__f.length === 0, `${vp.naam}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
  await ctx.close();
  return { kop: `B0.8 met 7 en 9 statussen op de held (mobiel liggend) · ${vp.naam}`, regels: R };
}

/* B2 F1 · B0.1 in een GEWOON gevecht (laptop): 3 en 4 vijanden met 5 en 6 statussen, de held
   met 7 en 8. Geen chip achter een handkaart, en in 2D geen chip over die van een buurman.
   Vóór F1 kreeg een gewone vijand 2 chips per rij en zakte zijn derde rij achter de hand
   (1440-2D en 1366-2D: 3-6 chips, 4 095-7 734 px2). */
async function gewoonChips(browser, fk) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  await wachtRust(page, 800, 15000);
  const SETS = {
    v5h7: { v: { gif: 5, zwak: 2, kwetsbaar: 2, kracht: 2, doornen: 1 }, h: { kracht: 2, zwak: 1, kwetsbaar: 1, gif: 3, doornen: 2, metaalhuid: 3, demonenvorm: 2 } },
    v6h8: { v: { gif: 5, zwak: 2, kwetsbaar: 2, kracht: 2, doornen: 1, metaalhuid: 2 }, h: { kracht: 2, zwak: 1, kwetsbaar: 1, gif: 3, doornen: 2, metaalhuid: 3, demonenvorm: 2, ritueel: 1 } }
  };
  for (const n of [3, 4]) {
    const echt = await page.evaluate(n => { S.metgezel = null; let k = 0; while (S.gevecht.vijanden.filter(v => !v.dood).length < n && k++ < 6) voegVijandToe('grotrat'); return S.gevecht.vijanden.filter(v => !v.dood).length; }, n);
    await slaap(1500);
    for (const [naam, s] of Object.entries(SETS)) {
      const r = await page.evaluate(async s => {
        const g = S.gevecht; g.speler.status = Object.assign({}, s.h);
        g.vijanden.forEach(v => { if (!v.dood) v.status = Object.assign({}, s.v); });
        renderGevecht();
        await new Promise(r => setTimeout(r, 400));
        const R = e => { const q = e.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom }; };
        const zicht = e => { let p = e; while (p && p !== document.body) { const c = getComputedStyle(p); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return false; p = p.parentElement; } const q = e.getBoundingClientRect(); return q.width > 0 && q.height > 0; };
        const snij = (a, b) => { const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t); return (w > 0 && h > 0) ? w * h : 0; };
        const hand = [...document.querySelectorAll('#hand .kaart')].filter(zicht).map(R);
        const perKol = [...document.querySelectorAll('#scherm-gevecht #vijanden-rij .vijand:not(.sterft), #scherm-gevecht #speler-zone')].map(k => [...k.querySelectorAll('.blok-status > *')].filter(zicht).map(R));
        const chips = perKol.flat();
        let buur = 0; for (let i = 0; i < perKol.length; i++) for (let j = i + 1; j < perKol.length; j++) for (const a of perKol[i]) for (const b of perKol[j]) buur += snij(a, b);
        const perRij = (() => { const k = [...document.querySelectorAll('#vijanden-rij .vijand:not(.sterft):not(.is-baas) .blok-status')][0]; if (!k) return 0; const tops = [...k.children].map(c => Math.round(c.getBoundingClientRect().top)); return tops.filter(x => x === tops[0]).length; })();
        return { chips: chips.length, hand: Math.round(chips.reduce((s, c) => s + hand.reduce((u, k) => u + snij(c, k), 0), 0)), handN: chips.filter(c => hand.some(k => snij(c, k) > 0)).length, buur: Math.round(buur), perRij };
      }, s);
      await shot(page, `${vp.naam}_gewoon_${echt}v_${naam}`);
      t(r.chips > 0 && r.hand === 0, `B0.1 ${vp.naam} gewoon gevecht, ${echt} vijanden, ${naam}: geen statuschip achter een handkaart (${r.handN} van ${r.chips} chips, ${r.hand} px2; ${r.perRij} chips per rij bij een vijand)`);
      if (!vp.d3) t(r.buur === 0 && r.perRij >= 3, `B0.1 ${vp.naam} gewoon gevecht, ${echt} vijanden, ${naam}: 3 chips per rij (${r.perRij}) en geen chip over die van een buurman (${r.buur} px2)`);
    }
  }
  t(page.__f.length === 0, `${vp.naam}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
  await ctx.close();
  return { kop: `B0.1 in een gewoon gevecht · ${vp.naam}`, regels: R };
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
  /* B2 F1 · B0.6 in de ECHTE flow: dicktatorDecreet en dicktatorHerverkiezing zelf. Daar volgt
     op de signatuurpose meteen een Vista.pose(…, 'cast'), die haar vroeger in hetzelfde frame
     overschreef (poseNu: alleen 'cast'). Per 50 ms opgenomen. */
  const flow = async fn => page.evaluate(async fn => {
    const g = S.gevecht; const b = g.vijanden.find(v => v.id === 'de_dicktator');
    const rec = []; const t0 = performance.now();
    const iv = setInterval(() => { const p = Vista.poseNu(b); if (!rec.length || rec[rec.length - 1].p !== p) rec.push({ t: Math.round(performance.now() - t0), p }); }, 50);
    try { if (fn === 'decreet') dicktatorDecreet(b); else { b.hp = 0; dicktatorHerverkiezing(g, b); } } catch (e) { rec.push({ t: -1, p: 'FOUT ' + e.message }); }
    await new Promise(r => setTimeout(r, fn === 'decreet' ? 2600 : 7000)); clearInterval(iv);
    const doel = fn === 'decreet' ? 'decreet' : 'herkozen';
    const i = rec.findIndex(x => x.p === doel);
    return { rec: rec.map(x => x.t + ':' + x.p).join(' '), van: i >= 0 ? rec[i].t : null, duur: i >= 0 ? ((rec[i + 1] || { t: fn === 'decreet' ? 2600 : 7000 }).t - rec[i].t) : 0 };
  }, fn);
  try {
    const d = await flow('decreet');
    t(d.van != null && d.van <= 300 && d.duur >= 1500, `B0.6 ${vp.naam} DICKtator: in dicktatorDecreet zelf staat de textuur 'decreet' na ${d.van} ms, ${d.duur} ms lang (<= 300, >= 1,5 s; ${d.rec})`);
    await wachtRust(page, 1000, 20000);
    const h = await flow('herverkiezing');
    t(h.van != null && h.duur >= 1500, `B0.6 ${vp.naam} DICKtator: in dicktatorHerverkiezing zelf staat de textuur 'herkozen' ${h.duur} ms (>= 1,5 s; ${h.rec})`);
    await wachtRust(page, 1000, 30000);
  } catch (e) { t(false, `B0.6 ${vp.naam}: fout in de echte flow: ${e.message}`); }
  /* een gewoon 3D-gevecht na een baas: de vaste camera terug */
  const gewoon = await page.evaluate(async () => {
    const voor = Vista.kaderStand();
    try { startGevecht(['grotrat'], 'gevecht', 1); } catch (e) { return { err: e.message }; }
    await new Promise(r => setTimeout(r, 600));
    return { voor, na: Vista.kaderStand(), namen: [...document.querySelectorAll('#vijanden-rij .vijand-naam')].filter(e => getComputedStyle(e).display !== 'none').length };
  });
  t(!gewoon.err && gewoon.voor.eigen && !gewoon.na.eigen && Math.abs(gewoon.na.fov - 50) < 0.01 && gewoon.namen > 0, `B0.12 ${vp.naam}: een gewoon gevecht krijgt de vaste camera terug (fov ${gewoon.voor && gewoon.voor.fov.toFixed(1)} -> ${gewoon.na && gewoon.na.fov}) en zijn naamlabels (${gewoon.namen})${gewoon.err ? ' — ' + gewoon.err : ''}`);
  /* B0.3 (F1) ook in een gewoon 3D-gevecht: de labels blijven bij hun sprites tijdens schok en slowmo */
  if (!gewoon.err) {
    await wachtRust(page, 600, 15000);
    const sch = await page.evaluate(labelSchok);
    t(sch.n > 0 && sch.lab === 0, `B0.3 ${vp.naam} gewoon gevecht: geen labelkolom (${sch.n}) wijkt af tijdens schok en slowmo, per frame: max ${sch.lab} px (0)`);
  }
  /* een signatuurpose zonder art zet niets: de kaats van De Spiegelwachter ('plagiaat') liet
     vroeger een lopende gif-reactie vallen */
  const kaats = await page.evaluate(async () => {
    try { startGevecht(['spiegelwachter'], 'gevecht', 1); } catch (e) { return { err: e.message }; }
    await new Promise(r => setTimeout(r, 2500));
    const v = S.gevecht.vijanden.find(x => x.id === 'spiegelwachter'); if (!v) return { err: 'geen spiegelwachter' };
    Vista.pose(v, 'gif', 1.6); await new Promise(r => setTimeout(r, 150));
    const voor = Vista.poseNu(v);
    pose2D(v, 'plagiaat', 0.7); await new Promise(r => setTimeout(r, 200));
    return { voor, na: Vista.poseNu(v) };
  });
  t(!kaats.err && kaats.voor === 'gif' && kaats.na === 'gif', `B0.6 ${vp.naam} De Spiegelwachter: een 'plagiaat' zonder art onderbreekt zijn gifreactie niet (${kaats.voor} -> ${kaats.na})${kaats.err ? ' — ' + kaats.err : ''}`);
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
  /* en élke andere vijand uit VIJANDEN: zijn eigen zetten over 12 beurten, bij volle fakkel */
  const alle = await page.evaluate(() => {
    const uit = [], fout = [];
    S.fakkel = fakkelMax();
    for (const id of Object.keys(VIJANDEN)) {
      const def = VIJANDEN[id]; if (def.baas || typeof def.kies !== 'function') continue;
      let v; try { v = maakVijand(id, 0); } catch (e) { fout.push(id + ': ' + e.message); continue; }
      for (let b = 0; b < 12; b++) {
        let it; try { it = def.kies(v, b); } catch (e) { fout.push(id + ': ' + e.message); break; }
        if (!it) continue;
        v.intent = it;
        const d = document.createElement('div'); d.innerHTML = intentTekst(v);
        const pillen = [...d.querySelectorAll('.intent')];
        uit.push({ id, type: it.type, tips: pillen.map(p => p.dataset.tip || ''), tekst: pillen.map(p => p.textContent.trim()) });
      }
    }
    renderGevecht();
    return { uit, fout, n: new Set(uit.map(r => r.id)).size };
  });
  res.push(...alle.uit);
  t(alle.fout.length === 0 && alle.n >= 20, `intent-assert (dynamisch): de zetten van alle ${alle.n} gewone vijanden en elites gerenderd, soorten: ${[...new Set(alle.uit.map(r => r.type))].sort().join(', ')}${alle.fout.length ? ' — fouten: ' + alle.fout.slice(0, 3).join(' | ') : ''}`);
  const liegt = res.filter(r => r.type !== 'debuff' && r.tips.some(tp => /verzwakt jou/.test(tp)));
  const leeg = res.filter(r => !r.tips.length || r.tips.some(tp => !tp.trim()));
  const getal = res.filter(r => (r.type === 'aanval' || r.type === 'factuur') && r.tekst.some((tx, i) => { const n = (tx.match(/\d+/g) || []).pop(); return n && !r.tips[i].includes(n); }));
  t(liegt.length === 0, `intent-assert (dynamisch, ${res.length} zetten van 3 bazen + hof + alle gewone vijanden): geen pil valt terug op "verzwakt jou" tenzij het een debuff is ([${[...new Set(liegt.map(r => r.id + ':' + r.type))].join(', ')}])`);
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
    ...['M800', 'M846', 'L1366', 'L1366d3', 'L1440d3'].map(fk => ['overgang ' + fk, () => overgang(browser, fk)]),
    ...['M800', 'M846', 'L1440', 'L1440d3', 'L1366d3'].map(fk => ['dood ' + fk, () => dood(browser, fk)]),
    ...['M800', 'L1440'].map(fk => ['lijkweg ' + fk, () => lijkWeg(browser, fk)]),
    ...['M800', 'L1440', 'L1440d3'].map(fk => ['bannerdood ' + fk, () => bannerDood(browser, fk)]),
    ...['L1440', 'L1366', 'L1440d3', 'L1366d3'].map(fk => ['gewoon ' + fk, () => gewoonChips(browser, fk)]),
    ...['M800', 'M846', 'M740'].map(fk => ['held7 ' + fk, () => held7Mobiel(browser, fk)]),
    ...[['M846', 1500], ['M800', 400], ['L1440', 0], ['L1440d3', 6000]].map(([fk, tik]) => ['orakel ' + fk, () => orakel(browser, fk, tik)]),
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
