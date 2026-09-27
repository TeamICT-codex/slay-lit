/* ============================================================================
   FINALE B4b · DE REGIE VAN DE EINDBAAS — ACCEPTATIESUITE
   Loopt de acceptatiecriteria af van .claude/notities/bazen_onderzoek/ontwerp/
   P_plaatsing_regie_plan.md §5 (B2.1-B2.4), plus de lage restpunten van het bazentoneel
   (v135) die de finale raken. Alles SOLO (geen metgezel).
     B2.1 hof3d  — in 3D staat het hof ACHTER de baas op een vaste plek per rol:
                   geen hoveling vóór de DICKtator, het hof ligt voor <= 20 % achter hem,
                   hof ~ hof <= 10 %, het midden van de baas verschuift over I, II, III en IV
                   <= 30 px, en een aantreding verschuift geen aanwezige figuur > 30 px
                   (1440x900-3D en 1366x768-3D);
     B2.2 datan  — de hofmaat telt de kolommen die er echt staan (#vijanden-rij[data-n]):
                   in IV (de baas alleen) is hij >= 1,5x de held, en 2,5 s na de
                   herverkiezing staat er geen gevluchte kiezer meer zonder .lijk-weg
                   (800x360, 846x381; 412x915 staand als controle);
     B2.3 hofpil — op 800x360 en 846x381, in II en III: geen afgekapte pil
                   (scrollWidth > clientWidth), geen pil over een andere pil of de bazenbalk;
     B2.4 dood   — de tweede dood gaat zonder JS-fout over in data-scherm="outro" en de
                   doodregel staat >= 1,0 s in beeld (800x360, 1440x900 2D en 3D);
     R1   doek   — geen baasspraak onder het toneeldoek (de stemming in de herverkiezing,
                   en de drie overgangen per 50 ms); de stemming komt wél in beeld;
     R2   factuur— de factuur-signatuurpose wordt in de echte flow niet meteen door
                   'attack' overschreven (2D en 3D);
     R3   chips  — de statuschips van het hof op 846x381 (en 800x360) niet achter de hand.

   Geen dev-server: de worktree wordt vanaf schijf bediend via route.fulfill op
   http://localhost:4173 (nooit een echte server). Service workers geblokkeerd.
   Draaien (Git Bash, vanuit een map met playwright in node_modules):
       NODE_PATH="$PWD/node_modules" SLAYIT_WORKTREE='C:\...\SLAY-IT-finale' \
         node tools/finale_regie_acceptatie.js
   SLAYIT_SHOTS=<map> bewaart screenshots; SLAYIT_PAR=<n> contexten tegelijk (standaard 2);
   SLAYIT_TAKEN=<regex> draait een deel (bv. 'hof3d|doek').
   ============================================================================ */
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');

const WORKTREE = process.env.SLAYIT_WORKTREE || path.resolve(__dirname, '..');
const SHOTS = process.env.SLAYIT_SHOTS || null;
const PAR = +(process.env.SLAYIT_PAR || 2);
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const MOB_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
const slaap = ms => new Promise(r => setTimeout(r, ms));

const FORMATEN = {
  M800: { naam: '800x360', w: 800, h: 360, mobiel: true },
  M846: { naam: '846x381', w: 846, h: 381, mobiel: true },
  P412: { naam: '412x915 staand', w: 412, h: 915, mobiel: true, staand: true },
  L1440: { naam: '1440x900-2D', w: 1440, h: 900, d3: false },
  L1440d3: { naam: '1440x900-3D', w: 1440, h: 900, d3: true },
  L1366d3: { naam: '1366x768-3D', w: 1366, h: 768, d3: true }
};

/* ---------- in-pagina meethaken (alleen LEZEN) ----------
   Het silhouet komt uit het alfamasker van de echte plaat; in 3D staat de quad waar
   Vista.schermPos en Vista.voetMeting hem zetten (dezelfde rekensom als het P-harnas en
   tools/bazentoneel_acceptatie.js). */
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
  /* de opake pixels die twee figuren delen (px2) */
  const samen = (a, b) => { if (!a || !b) return 0; const l = Math.max(a.sil.l, b.sil.l), t = Math.max(a.sil.t, b.sil.t), r = Math.min(a.sil.r, b.sil.r), bo = Math.min(a.sil.b, b.sil.b); if (r <= l || bo <= t) return 0; let n = 0; for (let y = t + STAP / 2; y < bo; y += STAP) for (let x = l + STAP / 2; x < r; x += STAP) if (opaak(a, x, y) && opaak(b, x, y)) n++; return n * STAP * STAP; };
  async function figuur(actor) {
    const g = S.gevecht; if (!g || !actor) return null;
    const d3 = document.getElementById('scherm-gevecht').classList.contains('d3-actief');
    const i = g.vijanden.indexOf(actor);
    const kol = actor.isSpeler ? document.getElementById('speler-zone') : (i >= 0 && GDOM.vijanden[i] ? GDOM.vijanden[i].wrap : null);
    const artEl = actor.isSpeler ? document.getElementById('speler-figuur') : (kol ? kol.querySelector('.vijand-art') : null);
    const imgEl = artEl ? artEl.querySelector('img') : null;
    let url = imgEl ? imgEl.getAttribute('src') : null;
    if (!url && actor.isSpeler && typeof huidigeHeld === 'function') url = 'assets/karakters/' + huidigeHeld().art + '.webp';
    const f = { m: await masker(url) };
    if (d3 && window.Vista) {
      const sp = Vista.schermPos(actor); const vm = (Vista.voetMeting ? Vista.voetMeting() : []).find(x => actor.isSpeler ? x.wie === 'speler' : (x.wie === actor.id && !x.dood));
      if (!sp || !vm) return null;
      const hq = vm.quadY - sp.topY; f.img = { l: sp.x - hq / 2, t: sp.topY, r: sp.x + hq / 2, b: vm.quadY }; f.voet = vm.y; f.cx = sp.x;
    } else {
      if (!artEl || !zicht(artEl)) return null;
      const r = (imgEl || artEl).getBoundingClientRect();
      if (imgEl && f.m) { const s = Math.min(r.width / f.m.nw, r.height / f.m.nh), iw = f.m.nw * s, ih = f.m.nh * s; f.img = { l: r.left + (r.width - iw) / 2, t: r.top + (r.height - ih) / 2 }; f.img.r = f.img.l + iw; f.img.b = f.img.t + ih; }
      else f.img = R(imgEl || artEl);
      f.cx = (f.img.l + f.img.r) / 2;
    }
    const bb = f.m ? f.m.bb : { x0: 0, y0: 0, x1: 1, y1: 1 }, W = f.img.r - f.img.l, H = f.img.b - f.img.t;
    f.sil = { l: f.img.l + bb.x0 * W, t: f.img.t + bb.y0 * H, r: f.img.l + bb.x1 * W, b: f.img.t + bb.y1 * H };
    if (f.voet == null) f.voet = f.sil.b;
    f.opaakPx = opaakIn(f, f.sil) || 1;
    return f;
  }
  /* B2.1: de formatie van dit moment - wie staat waar, wie staat vóór wie, en hoeveel dekken ze af */
  async function formatie() {
    const g = S.gevecht; if (!g) return null;
    const b = g.vijanden.find(v => v.id === 'de_dicktator' && !v.dood); if (!b) return null;
    const hof = g.vijanden.filter(v => v !== b && !v.dood);
    const fb = await figuur(b); if (!fb) return null;
    const fh = []; for (const h of hof) { const f = await figuur(h); if (f) fh.push({ id: h.id, f }); }
    const uit = { cx: Math.round(fb.cx), voet: +fb.voet.toFixed(1), hof: {}, voor: [], achterPct: 0, hofHofPct: 0, baasBedekt: 0 };
    for (const { id, f } of fh) {
      uit.hof[id] = Math.round(f.cx);
      const s = samen(fb, f);
      if (f.voet > fb.voet + 1) { uit.voor.push(id); uit.baasBedekt = Math.max(uit.baasBedekt, +(100 * s / fb.opaakPx).toFixed(1)); }
      uit.achterPct = Math.max(uit.achterPct, +(100 * s / f.opaakPx).toFixed(1));
    }
    for (let i = 0; i < fh.length; i++) for (let j = i + 1; j < fh.length; j++) {
      const s = samen(fh[i].f, fh[j].f);
      uit.hofHofPct = Math.max(uit.hofHofPct, +(100 * s / Math.min(fh[i].f.opaakPx, fh[j].f.opaakPx)).toFixed(1));
    }
    return uit;
  }
  window.__FR = { figuur, formatie, R, zicht, snij };
})();`;

/* ---------- pagina openen ---------- */
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
      return !g.bezig && !g.ceremonie && !document.getElementById('baas-intro') && !document.querySelector('.decreet-overlay, .vonnis, .baas-flits');
    });
    if (rust && Date.now() - t0 >= minMs) return true;
    await slaap(150);
  }
  return false;
}
/* een verse DICKtator (solo), in de gevraagde staat (opties van devDicktator), na de intro */
async function startProces(page, opties, tempo = 1) {
  await page.evaluate(([o, tp]) => {
    DEV_BUILDS.slachter_mid.metgezel = null; S.metgezel = null; DICK.tempo = tp;
    devDicktator('slachter_mid', o);
    if (document.querySelector('#draai-blok.toon') && typeof speelTochStaand === 'function') speelTochStaand();
  }, [opties || {}, tempo]);
  await slaap(800);
  await page.evaluate(() => { const b = document.getElementById('baas-intro'); if (b) b.click(); });
  await wachtRust(page, 1500, 45000);
  /* de DEV-landing zet zijn HP pas na de intro (_devNaIntro, 900 ms) */
  await slaap(1300);
  await page.evaluate(() => { S.maxHp = 5000; S.hp = 5000; document.querySelectorAll('#meldingen .toast').forEach(t => t.remove()); renderGevecht(); renderTopbalk(); });
  await wachtRust(page, 300, 20000);
}
async function shot(page, naam) { if (SHOTS) { try { await page.screenshot({ path: path.join(SHOTS, naam.replace(/[^\w.-]+/g, '_') + '.png') }); } catch (e) { } } }
const fouten = (page, vp) => [page.__f.length === 0, `${vp.naam}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : '')];

/* ---------- B2.1 · het hof achter de baas in 3D ---------- */
async function hof3d(browser, fk) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  const fm = () => page.evaluate(() => __FR.formatie());
  const cx = {};
  const toets = (naam, f) => {
    if (!f) { t(false, `B2.1 ${vp.naam} ${naam}: geen formatie gemeten`); return; }
    const n = Object.keys(f.hof).length;
    t(f.voor.length === 0, `B2.1 ${vp.naam} ${naam}: geen hoveling vóór de DICKtator ([${f.voor.join(', ')}]; ${n} hoveling(en))`);
    t(f.baasBedekt <= 5, `B2.1 ${vp.naam} ${naam}: het hof bedekt ${f.baasBedekt} % van de baas (<= 5)`);
    t(f.achterPct <= 20, `B2.1 ${vp.naam} ${naam}: een hoveling staat voor ${f.achterPct} % achter de baas (<= 20)`);
    t(f.hofHofPct <= 10, `B2.1 ${vp.naam} ${naam}: hof ~ hof ${f.hofHofPct} % (<= 10)`);
  };
  try {
    /* I zonder hof, I met de griffier */
    await startProces(page, {}, 0.5);
    let f = await fm(); cx.I0 = f && f.cx; toets('I (alleen)', f);
    await startProces(page, { netVoor: 2 });
    f = await fm(); cx.I = f && f.cx; toets('I (griffier)', f);
    const griffierI = f && f.hof.de_griffier;
    /* I -> II: de deurwaarder treedt aan (de echte regie) */
    await page.evaluate(() => _devKlapNu(DEV_KLAP));
    await slaap(4500); await wachtRust(page, 800, 20000); await slaap(1200);
    f = await fm(); cx.II = f && f.cx; toets('II (griffier + deurwaarder)', f);
    await shot(page, `${vp.naam}_hof3d_II`);
    t(f && griffierI != null && f.hof.de_griffier != null && Math.abs(f.hof.de_griffier - griffierI) <= 30 && Math.abs(f.cx - cx.I) <= 30,
      `B2.1 ${vp.naam} aantreding deurwaarder: griffier ${griffierI} -> ${f && f.hof.de_griffier}, baas ${cx.I} -> ${f && f.cx} (elk <= 30 px)`);
    /* II -> III: de griffier wordt geëxecuteerd, de claqueur treedt aan */
    await startProces(page, { netVoor: 3 });
    f = await fm(); const dwII = f && f.hof.de_deurwaarder, bII = f && f.cx;
    await page.evaluate(() => _devKlapNu(DEV_KLAP));
    await slaap(5600); await wachtRust(page, 800, 20000); await slaap(1200);
    f = await fm(); cx.III = f && f.cx; toets('III (deurwaarder + claqueur)', f);
    await shot(page, `${vp.naam}_hof3d_III`);
    t(f && dwII != null && f.hof.de_deurwaarder != null && Math.abs(f.hof.de_deurwaarder - dwII) <= 30 && Math.abs(f.cx - bII) <= 30,
      `B2.1 ${vp.naam} aantreding claqueur: deurwaarder ${dwII} -> ${f && f.hof.de_deurwaarder}, baas ${bII} -> ${f && f.cx} (elk <= 30 px)`);
    /* III -> IV: de herverkiezing (het hof vlucht als kiezers) */
    await startProces(page, { netVoor: 4 });
    await page.evaluate(() => _devKlapNu(DEV_KLAP));
    await slaap(5600); await wachtRust(page, 800, 20000); await slaap(1500);
    f = await fm(); cx.IV = f && f.cx; toets('IV (alleen)', f);
    await shot(page, `${vp.naam}_hof3d_IV`);
    const w = Object.values(cx).filter(x => x != null);
    t(w.length === 5 && Math.max(...w) - Math.min(...w) <= 30, `B2.1 ${vp.naam}: het midden van de baas over I, II, III en IV (${Object.entries(cx).map(([k, v]) => k + ' ' + v).join(', ')}) verschuift ${w.length ? Math.round(Math.max(...w) - Math.min(...w)) : '?'} px (<= 30)`);
  } catch (e) { t(false, `B2.1 ${vp.naam}: fout in de meting: ${e.message}`); }
  t(...fouten(page, vp));
  await ctx.close();
  return { kop: `B2.1 · het hof achter de baas in 3D · ${vp.naam}`, regels: R };
}

/* ---------- B2.2 · de baas krimpt alleen als het moet ---------- */
async function datan(browser, fk) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  const maat = () => page.evaluate(() => {
    const g = S.gevecht, b = g.vijanden.find(v => v.id === 'de_dicktator');
    const a = GDOM.vijanden[g.vijanden.indexOf(b)].wrap.querySelector('.vijand-art').getBoundingClientRect();
    const h = document.getElementById('speler-figuur').getBoundingClientRect();
    const rij = document.getElementById('vijanden-rij');
    const kolommen = [...rij.querySelectorAll(':scope > .vijand')];
    return {
      n: rij.dataset.n, verh: +(a.height / h.height).toFixed(2), baasTop: Math.round(a.top), baasOnder: Math.round(a.bottom), heldOnder: Math.round(h.bottom),
      kiezersZonderWeg: [...rij.querySelectorAll('.vijand.kiezer:not(.lijk-weg)')].length,
      kolZicht: kolommen.filter(k => getComputedStyle(k).display !== 'none').length
    };
  });
  try {
    /* II: het hof staat er echt (hofmaat blijft) */
    await startProces(page, { netVoor: 3 });
    const II = await maat();
    t(II.n === '3', `B2.2 ${vp.naam} II: #vijanden-rij[data-n] = ${II.n} (3 levende figuren; de baas op hofmaat ${II.verh}x de held)`);
    /* de herverkiezing met twee kiezers, dan 2,5 s na de regie */
    await startProces(page, { netVoor: 4 });
    await page.evaluate(() => _devKlapNu(DEV_KLAP));
    await slaap(5200); await wachtRust(page, 300, 20000); await slaap(2500);
    const IV = await maat();
    await shot(page, `${vp.naam}_datan_IV`);
    t(IV.kiezersZonderWeg === 0 && IV.kolZicht === 1 && IV.n === '1', `B2.2 ${vp.naam} IV: 2,5 s na de herverkiezing geen gevluchte kiezer zonder .lijk-weg (${IV.kiezersZonderWeg}), ${IV.kolZicht} zichtbare kolom, data-n ${IV.n}`);
    if (!vp.staand) t(IV.verh >= 1.5, `B2.2 ${vp.naam} IV: de baas alleen is ${IV.verh}x de held (>= 1,5; II: ${II.verh}x)`);
    else t(IV.baasOnder <= IV.heldOnder + 4, `B2.2 ${vp.naam} IV (staand): de baas zweeft niet boven zijn plek (onderkant ${IV.baasOnder}, held ${IV.heldOnder})`);
  } catch (e) { t(false, `B2.2 ${vp.naam}: fout in de meting: ${e.message}`); }
  t(...fouten(page, vp));
  await ctx.close();
  return { kop: `B2.2 · de baas krimpt alleen als het moet · ${vp.naam}`, regels: R };
}

/* ---------- B2.3 · de pillen van het hof niet afgekapt ---------- */
async function hofpil(browser, fk) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  const meet = () => page.evaluate(() => {
    const W = innerWidth, H = innerHeight;
    const pillen = [...document.querySelectorAll('#vijanden-rij .vijand:not(.lijk-weg):not(.sterft) .intent')].filter(e => __FR.zicht(e));
    /* de bazenbalk: de doos én wat eruit steekt (de beleidsstrook, de teller) */
    const bbs = [document.getElementById('baas-balk'), ...document.querySelectorAll('#baas-balk .bb-balk, #baas-balk .bb-extra > *, #baas-balk .bb-zitting')].filter(e => __FR.zicht(e)).map(__FR.R);
    const af = pillen.filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim());
    let pp = 0, pb = 0; const rs = pillen.map(e => ({ r: __FR.R(e), k: e.closest('.vijand') }));
    for (let i = 0; i < rs.length; i++) { pb += Math.max(0, ...bbs.map(b => __FR.snij(rs[i].r, b))); for (let j = i + 1; j < rs.length; j++) if (rs[i].k !== rs[j].k) pp += __FR.snij(rs[i].r, rs[j].r); }
    const uit = rs.filter(x => x.r.l < -1 || x.r.r > W + 1 || x.r.t < -1 || x.r.b > H + 1).length;
    return { tekst: pillen.map(e => e.textContent.trim()), af, pp: Math.round(pp), pb: Math.round(pb), uit };
  });
  for (const [naam, opt] of [['II', { hof: true }], ['III', { tirade: true }]]) {
    try {
      await startProces(page, opt, 0.25);
      const gezien = new Set(); let slecht = [];
      for (let k = 0; k < 4; k++) {
        const m = await meet();
        m.tekst.forEach(x => gezien.add(x));
        if (m.af.length || m.pp || m.pb || m.uit) slecht.push(`beurt ${k}: afgekapt [${m.af.join(', ')}], pil~pil ${m.pp}, pil~balk ${m.pb}, uit beeld ${m.uit}`);
        if (k === 0) await shot(page, `${vp.naam}_hofpil_${naam}`);
        await page.evaluate(() => { const g = S.gevecht; g.speler.blok = 0; S.hp = 5000; eindBeurt(); });
        await slaap(300); await wachtRust(page, 200, 30000);
        await page.evaluate(() => { S.hp = 5000; renderGevecht(); });
      }
      t(slecht.length === 0, `B2.3 ${vp.naam} ${naam}: over 4 beurten geen afgekapte pil, geen pil over een pil of de bazenbalk (pillen: ${[...gezien].join(' · ')})${slecht.length ? ' — ' + slecht.join(' | ') : ''}`);
    } catch (e) { t(false, `B2.3 ${vp.naam} ${naam}: fout in de meting: ${e.message}`); }
  }
  t(...fouten(page, vp));
  await ctx.close();
  return { kop: `B2.3 · de pillen van het hof · ${vp.naam}`, regels: R };
}

/* ---------- B2.4 · de tweede dood -> de outro ---------- */
async function tweedeDood(browser, fk) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  try {
    await startProces(page, { netVoor: 4 });
    await page.evaluate(() => _devKlapNu(DEV_KLAP));
    await slaap(5600); await wachtRust(page, 500, 20000);
    const her = await page.evaluate(() => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); return !!(b && b.herrezen && b.vorm2); });
    t(her, `B2.4 ${vp.naam}: de herverkiezing viel (vorm 2)`);
    await page.evaluate(() => { document.querySelectorAll('#meldingen .toast').forEach(t => t.remove()); _spraakStop(); });
    const r = await page.evaluate(async () => {
      const g = S.gevecht; const b = g.vijanden.find(v => v.id === 'de_dicktator');
      const dood = (baasUitspraken(b.id).dood || '').trim().slice(0, 20);
      const rec = []; const t0 = performance.now();
      const iv = setInterval(() => rec.push({ t: Math.round(performance.now() - t0), scherm: document.body.dataset.scherm, sp: [...document.querySelectorAll('.baas-spraak')].filter(e => +getComputedStyle(e).opacity > 0.2).map(e => e.textContent.trim().slice(0, 20)) }), 50);
      /* de laatste klap, langs het normale pad: DE ZITTING LOOPT in IV is een DEV-vlag weg */
      b.minVrij = true;
      verliesHp(b, b.hp + 5, sp()); renderGevecht();
      if (b.dood && !g.voorbij && alleVijanden().length === 0) gevechtGewonnen();
      for (let i = 0; i < 200 && document.body.dataset.scherm === 'gevecht'; i++) await new Promise(r => setTimeout(r, 100));
      await new Promise(r => setTimeout(r, 600));
      clearInterval(iv);
      const slot = rec.filter(x => x.sp.some(s => s.startsWith(dood.slice(0, 14))));
      return { scherm: document.body.dataset.scherm, slotMs: slot.length ? slot[slot.length - 1].t - slot[0].t : 0, wissel: (rec.find(x => x.scherm !== 'gevecht') || {}).t };
    });
    t(r.scherm === 'outro', `B2.4 ${vp.naam}: de tweede dood gaat over in data-scherm="outro" (nu "${r.scherm}", wissel op ${r.wissel} ms)`);
    t(r.slotMs >= 1000, `B2.4 ${vp.naam}: de doodregel staat ${r.slotMs} ms in beeld (>= 1,0 s)`);
    await shot(page, `${vp.naam}_tweede_dood_outro`);
  } catch (e) { t(false, `B2.4 ${vp.naam}: fout in de meting: ${e.message}`); }
  t(...fouten(page, vp));
  await ctx.close();
  return { kop: `B2.4 · de tweede dood en de outro · ${vp.naam}`, regels: R };
}

/* ---------- R1 · geen baasspraak onder het toneeldoek ---------- */
async function doek(browser, fk) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  for (const [nv, naam, venster] of [[2, 'I->II', 8000], [3, 'II->III', 8500], [4, 'de herverkiezing', 9000]]) {
    try {
      await startProces(page, { netVoor: nv });
      const o = await page.evaluate(async venster => {
        const d = document.getElementById('toneel-doek');
        const stemming = (UITSPRAKEN._dicktator.stemming || '').trim().slice(0, 18);
        const o = { onder: 0, max: 0, stem: 0, regels: {} };
        let vorig = performance.now();
        const iv = setInterval(() => {
          const nu = performance.now(), dt = nu - vorig; vorig = nu;
          const op = +getComputedStyle(d).opacity;
          for (const e of document.querySelectorAll('.baas-spraak')) {
            if (+getComputedStyle(e).opacity <= 0.2) continue;
            const k = e.textContent.trim().slice(0, 24); o.regels[k] = (o.regels[k] || 0) + dt;
            if (op > 0.1) { o.onder += dt; o.max = Math.max(o.max, op); o.wie = k; }
            if (k.startsWith(stemming)) o.stem += dt;
          }
        }, 50);
        _devKlapNu(DEV_KLAP);
        await new Promise(r => setTimeout(r, venster));
        clearInterval(iv);
        o.onder = Math.round(o.onder); o.stem = Math.round(o.stem);
        return o;
      }, venster);
      t(o.onder === 0, `R1 ${vp.naam} ${naam}: baasspraak onder het toneeldoek ${o.onder} ms (0; diepste doek ${o.max.toFixed(2)}${o.wie ? ', "' + o.wie + '…"' : ''}) — regels: ${Object.entries(o.regels).map(([k, v]) => k.slice(0, 16) + '… ' + Math.round(v) + ' ms').join(', ')}`);
      if (nv === 4) t(o.stem >= 600, `R1 ${vp.naam} ${naam}: „De stemmen worden geteld…" staat ${o.stem} ms in beeld (>= 600)`);
    } catch (e) { t(false, `R1 ${vp.naam} ${naam}: fout in de meting: ${e.message}`); }
  }
  t(...fouten(page, vp));
  await ctx.close();
  return { kop: `R1 · geen baasspraak onder het toneeldoek · ${vp.naam}`, regels: R };
}

/* ---------- R2 · de factuur-signatuurpose in de echte flow ---------- */
async function factuurPose(browser, fk) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  try {
    await startProces(page, { vorm2: true });
    await slaap(5200); await wachtRust(page, 500, 20000);
    const pil = await page.evaluate(() => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); return b && b.intent ? b.intent.type + ':' + b.intent.naam : '-'; });
    t(/^factuur/.test(pil), `R2 ${vp.naam}: de eerste zet van IV is een factuur (${pil})`);
    const r = await page.evaluate(async () => {
      const g = S.gevecht, b = g.vijanden.find(v => v.id === 'de_dicktator');
      const img = () => { const k = GDOM.vijanden[g.vijanden.indexOf(b)]; const im = k && k.wrap.querySelector('.vijand-art img'); const s = im ? im.getAttribute('src') || '' : ''; const m = s.match(/de_dicktator(?:_([a-z_]+))?\./); return m ? (m[1] || 'idle') : '?'; };
      const pose = () => (d3Actief() && window.Vista && Vista.poseNu) ? Vista.poseNu(b) : img();
      const rec = []; const t0 = performance.now();
      const iv = setInterval(() => rec.push({ t: Math.round(performance.now() - t0), p: pose() }), 30);
      g.speler.blok = 0; S.hp = 5000; eindBeurt();
      await new Promise(r => setTimeout(r, 2600));
      clearInterval(iv);
      return rec;
    });
    const i0 = r.findIndex(x => x.p === 'factuur');
    const na = i0 >= 0 ? r.slice(i0).filter(x => x.t - r[i0].t <= 450) : [];
    const factuurMs = r.filter(x => x.p === 'factuur').length * 30;
    t(i0 >= 0 && !na.some(x => x.p === 'attack'), `R2 ${vp.naam}: de factuurpose ${i0 >= 0 ? 'verschijnt op ' + r[i0].t + ' ms' : 'verschijnt NOOIT'} en 'attack' overschrijft haar niet in de 450 ms erna (reeks: ${[...new Set(r.map(x => x.p))].join(' > ')})`);
    t(factuurMs >= 400, `R2 ${vp.naam}: de factuurpose staat ${factuurMs} ms (>= 400)`);
  } catch (e) { t(false, `R2 ${vp.naam}: fout in de meting: ${e.message}`); }
  t(...fouten(page, vp));
  await ctx.close();
  return { kop: `R2 · de factuur-signatuurpose · ${vp.naam}`, regels: R };
}

/* ---------- R3 · de chips van het hof niet achter de hand ---------- */
async function hofChips(browser, fk) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  const SETS = {
    'hof 4': { held: { kracht: 2, zwak: 1, kwetsbaar: 1, gif: 3, doornen: 2 }, baas: { gif: 9, zwak: 2, kwetsbaar: 2, kracht: 2 }, hof: { gif: 4, zwak: 1, kwetsbaar: 2, kracht: 1 } },
    'hof 5': { held: { kracht: 2, zwak: 1, kwetsbaar: 1, gif: 3, doornen: 2 }, baas: { gif: 9, zwak: 2, kwetsbaar: 2, kracht: 2, doornen: 2 }, hof: { gif: 4, zwak: 1, kwetsbaar: 2, kracht: 1, doornen: 1 } }
  };
  for (const [naam, opt] of [['I', { netVoor: 2 }], ['II', { hof: true }], ['III', { tirade: true }]]) {
    try {
      await startProces(page, opt, 0.5);
      for (const [sn, s] of Object.entries(SETS)) {
        const m = await page.evaluate(async s => {
          const g = S.gevecht;
          g.speler.status = Object.assign({}, s.held);
          g.vijanden.forEach(v => { if (!v.dood) v.status = Object.assign({}, v.id === 'de_dicktator' ? s.baas : s.hof); });
          renderGevecht();
          await new Promise(r => setTimeout(r, 700));
          const W = innerWidth, H = innerHeight;
          const hand = [...document.querySelectorAll('#hand .kaart')].filter(__FR.zicht).map(__FR.R);
          const tb = __FR.R(document.getElementById('topbalk'));
          const eind = __FR.R(document.getElementById('knop-eindbeurt'));
          const bbs = [document.getElementById('baas-balk'), ...document.querySelectorAll('#baas-balk .bb-balk, #baas-balk .bb-extra > *, #baas-balk .bb-zitting')].filter(__FR.zicht).map(__FR.R);
          const lev = g.vijanden.filter(v => !v.dood);
          const kol = v => GDOM.vijanden[g.vijanden.indexOf(v)].wrap;
          const hofKol = lev.filter(v => v.id !== 'de_dicktator').map(kol);
          const chips = [...document.querySelectorAll('#scherm-gevecht .blok-status > *')].filter(__FR.zicht).map(e => ({ r: __FR.R(e), hof: hofKol.some(k => k.contains(e)), kol: e.closest('.vijand') }));
          const hofChips = chips.filter(c => c.hof);
          /* wat de chips van een hoveling niet mogen raken: een ander zijn lijf of pil, de bazenbalk, de knop */
          const anders = c => lev.map(kol).filter(k => k !== c.kol).flatMap(k => [k.querySelector('.vijand-art'), ...k.querySelectorAll('.intent')]).filter(__FR.zicht).map(__FR.R);
          const som = (A, B) => A.reduce((x, a) => x + B.reduce((y, b) => y + __FR.snij(a, b), 0), 0);
          const pillenBB = [...document.querySelectorAll('#vijanden-rij .vijand:not(.lijk-weg) .intent')].filter(__FR.zicht).map(__FR.R);
          return {
            hand: Math.round(som(chips.map(c => c.r), hand)), hofHand: Math.round(som(hofChips.map(c => c.r), hand)),
            top: tb ? Math.round(som(chips.map(c => c.r), [tb])) : 0, uit: chips.filter(c => c.r.l < -1 || c.r.t < -1 || c.r.r > W + 1 || c.r.b > H + 1).length, n: chips.length, hofN: hofChips.length,
            hofBB: Math.round(hofChips.reduce((x, c) => x + Math.max(0, ...bbs.map(b => __FR.snij(c.r, b))), 0)),
            hofEind: eind ? Math.round(som(hofChips.map(c => c.r), [eind])) : 0,
            hofAnder: Math.round(hofChips.reduce((x, c) => x + som([c.r], anders(c)), 0)),
            pilBB: Math.round(pillenBB.reduce((x, p) => x + Math.max(0, ...bbs.map(b => __FR.snij(p, b))), 0))
          };
        }, s);
        await shot(page, `${vp.naam}_hofchips_${naam}_${sn}`);
        t(m.hand === 0 && m.uit === 0 && m.top === 0, `R3 ${vp.naam} ${naam} (${sn}): chips ~ hand ${m.hand} px2 (het hof: ${m.hofHand}), uit beeld ${m.uit}, over de topbalk ${m.top} (${m.n} chips, ${m.hofN} van het hof)`);
        t(m.hofBB === 0 && m.hofEind === 0 && m.hofAnder === 0 && m.pilBB === 0, `R3 ${vp.naam} ${naam} (${sn}): de hofchips raken de bazenbalk ${m.hofBB}, de knop ${m.hofEind}, een ander lijf of pil ${m.hofAnder}; pil ~ bazenbalk ${m.pilBB} (alles 0)`);
      }
    } catch (e) { t(false, `R3 ${vp.naam} ${naam}: fout in de meting: ${e.message}`); }
  }
  t(...fouten(page, vp));
  await ctx.close();
  return { kop: `R3 · de chips van het hof · ${vp.naam}`, regels: R };
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const FILTER = process.env.SLAYIT_TAKEN ? new RegExp(process.env.SLAYIT_TAKEN) : null;
  const taken = [
    ...['L1440d3', 'L1366d3'].map(fk => ['hof3d ' + fk, () => hof3d(browser, fk)]),
    ...['M800', 'M846', 'P412'].map(fk => ['datan ' + fk, () => datan(browser, fk)]),
    ...['M800', 'M846'].map(fk => ['hofpil ' + fk, () => hofpil(browser, fk)]),
    ...['M800', 'L1440', 'L1440d3'].map(fk => ['dood ' + fk, () => tweedeDood(browser, fk)]),
    ...['M846', 'L1440d3'].map(fk => ['doek ' + fk, () => doek(browser, fk)]),
    ...['L1440', 'L1440d3'].map(fk => ['factuur ' + fk, () => factuurPose(browser, fk)]),
    ...['M846', 'M800'].map(fk => ['chips ' + fk, () => hofChips(browser, fk)])
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
  console.log(fout ? 'FINALE REGIE: ' + fout + ' FOUT(EN), ' + ok + ' ok' : 'FINALE REGIE: ALLES GROEN — ' + ok + ' ok');
  console.log('============================================');
  await browser.close();
  process.exit(fout ? 1 : 0);
})();
