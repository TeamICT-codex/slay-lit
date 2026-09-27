/* ============================================================================
   B3 · DE ROOF, EERLIJK — ACCEPTATIESUITE (de Erfprins, SOLO)
   Loopt de acceptatiecriteria af van .claude/notities/bazen_onderzoek/ontwerp/
   P_plaatsing_regie_plan.md §4 (B1.1-B1.7, de regie van de Erfprins) op de nieuwe mechaniek
   (O1 + de enten, bazen_plan.md §5), plus de eerlijkheid die de jury eiste (jury_bouw.md
   W3/W5/W6/W7/W13, jury_thomas.md §6): de pil zegt wat er landt, elke Erfprins-zet heeft een
   eigen tak in intentTekst, het noodrantsoen houdt zijn belofte, geen liegende tekst.

   Draaien (Windows, vanuit een map met playwright + pngjs in node_modules):
       NODE_PATH="$PWD/node_modules" SLAYIT_WORKTREE='C:\...\SLAY-IT-erfprins' \
         node tools/erfprins_acceptatie.js
   Geen dev-server: de worktree wordt vanaf schijf bediend via route.fulfill op
   http://localhost:4173. SLAYIT_SHOTS=<map> bewaart screenshots per moment;
   SLAYIT_PAR=<n> zet het aantal browsercontexten tegelijk (standaard 3);
   SLAYIT_TAKEN=<regex> draait een deel (bv. 'regie M800|eerlijk').
   Een volledige run duurt ~12 min. Draai hem niet naast andere zware suites.

   Formaten: 800x360 en 846x381 (Thomas' toestel, isMobile/hasTouch), 1440x900 en 1366x768 in
   2D en 3D, en 412x915 staand als controle (staand is een noodpad: daar gelden alleen de
   Roof, de buit-beat en de Inventaris). Elk criterium is een getal of een lege lijst.

   Wat hij controleert:
   - REGIE per formaat, in rust (geen / vijf statussen x fakkel vol / 0):
     B1.1 held en prins elk hun helft (mobiel liggend: silhouetafstand >= 140 px, midden van
     de prins >= 63 %, geen horizontale scroll); B1.2 de vaste arena (ACHTERGRONDEN.act2.finale)
     en zijn zool op de grondlijn (<= 2 px, 2D); na de Roof (buit 0/6/12, fase 2/3, vijf
     statussen) B1.6 de Buit-pil op één regel (<= 34 px, niets afgekapt, alle namen in de tip,
     niet over zijn chipkolom, niet over 'Beurt N'), zijn breedste pil niet over de held en niet
     in de topbalk (W7);
   - DE ROOF (B1.3) met de echte trekstapel en met 6 en 22 kaarten, en in het donker (fakkel 0,
     vier statussen): waaier en kop raken zijn silhouet niet (0 px), geen tegel buiten beeld,
     geen scroll, zijn lijf in het gat >= 0,9x zo helder als in rust, de vinger landt ÓP de
     gekozen kaart en niet op de kop, de tik-hint ligt niet op de waaier;
   - DE BUIT-BEAT (W5): dezelfde layout en dezelfde criteria, en de vinger tikt zijn eerste kaart;
   - DE PLAGIAATKAART (B1.4), fase 2 (1 kaart) en fase 3 (2 kaarten): kaart op zijn silhouet
     <= 2 % (liggend en laptop), kop volledig in beeld en niet over de bazenbalk, de topbalk of
     zijn pil, schaal >= 0,72 (laptop) / 0,92 (mobiel), de KOPIE-stempel binnen de kaart;
   - DE INVENTARIS (B1.5), de eerste ontmoeting: de climaxkaart binnen beeld, geen introtekst
     erover;
   - EERLIJKHEID (headless gevechten, drie helden, een eenvoudige bot): de pil op het einde van
     je beurt (copycatVerwacht / copycatVerwachtGif, dezelfde bron als de pil) tegen wat er in
     zijn beurt echt landt (vóór je Blok), elke afwijking verklaard (hij of jij dood, opstaan);
     zijn plan wisselt niet binnen jouw beurt; ♥+N == zijn HP als hij opstaat; nooit een
     metgezel in het gevecht;
   - TEKST EN REGELS: elke Erfprins-zet (roof, buit, plagiaat, opstaan, steel, uitputting) heeft
     een eigen pil met een niet-lege tip (geen 'verzwakt jou'); geen verboden woord (beste
     kaarten, verbrandt, Overleef tot, Drops, poort) in zijn teksten; terugspelen matcht op uid;
     de tik-om-over-te-slaan pas vanaf de tweede ontmoeting; devErfprins realistisch (85 % HP,
     1 heeldrank); B1.7 het orakel en de scherven-nudge (solo, geteld zoals de Drempeltafel telt,
     de stille baas-scherf telt niet, nooit een poort).
   ============================================================================ */
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
let PNG = null; try { PNG = require('pngjs').PNG; } catch (e) { /* zonder pngjs slaat de helderheid over */ }

const WORKTREE = process.env.SLAYIT_WORKTREE || 'C:\\Users\\Thomas Aelbrecht\\Desktop\\Workspace\\SLAY-IT-erfprins';
const SHOTS = process.env.SLAYIT_SHOTS || null;
const PAR = +(process.env.SLAYIT_PAR || 3);
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const MOB_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
const slaap = ms => new Promise(r => setTimeout(r, ms));

const FORMATEN = {
  M800: { naam: '800x360', w: 800, h: 360, mobiel: true },
  M846: { naam: '846x381', w: 846, h: 381, mobiel: true },
  L1440: { naam: '1440x900-2D', w: 1440, h: 900, d3: false },
  L1440d3: { naam: '1440x900-3D', w: 1440, h: 900, d3: true },
  L1366: { naam: '1366x768-2D', w: 1366, h: 768, d3: false },
  L1366d3: { naam: '1366x768-3D', w: 1366, h: 768, d3: true },
  P412: { naam: '412x915 staand', w: 412, h: 915, mobiel: true, staand: true }
};

/* ---------- in-pagina meethaken (alleen LEZEN) ----------
   Het silhouet komt uit het alfamasker van de echte plaat (in 3D uit Vista.schermPos en
   voetMeting), zoals de bazentoneel-suite: een rechthoek rond een figuur is te grof voor
   'de waaier raakt hem niet'. */
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
  const snij = (a, b) => { if (!a || !b) return 0; const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t); return (w > 0 && h > 0) ? Math.round(w * h) : 0; };
  const opaak = (f, x, y) => { const m = f.m; if (!m) return x >= f.sil.l && x <= f.sil.r && y >= f.sil.t && y <= f.sil.b; const u = Math.floor((x - f.img.l) / (f.img.r - f.img.l) * m.w), v = Math.floor((y - f.img.t) / (f.img.b - f.img.t) * m.h); return u >= 0 && v >= 0 && u < m.w && v < m.h && m.a[v * m.w + u] === 1; };
  const opaakIn = (f, r) => { if (!f || !f.sil || !r) return 0; const l = Math.max(f.sil.l, r.l), t = Math.max(f.sil.t, r.t), rr = Math.min(f.sil.r, r.r), b = Math.min(f.sil.b, r.b); if (rr <= l || b <= t) return 0; let n = 0; for (let y = t + STAP / 2; y < b; y += STAP) for (let x = l + STAP / 2; x < rr; x += STAP) if (opaak(f, x, y)) n++; return n * STAP * STAP; };
  async function figuur(actor) {
    const g = S.gevecht; if (!g || !actor) return null;
    const d3 = document.getElementById('scherm-gevecht').classList.contains('d3-actief');
    let artEl, imgEl;
    if (actor.isSpeler) { artEl = document.getElementById('speler-figuur'); imgEl = document.querySelector('#speler-figuur img'); }
    else { const i = g.vijanden.indexOf(actor); const w = GDOM.vijanden[i] && GDOM.vijanden[i].wrap; artEl = w && w.querySelector('.vijand-art'); imgEl = w && w.querySelector('.vijand-art img'); }
    let url = imgEl ? imgEl.getAttribute('src') : null;
    if (!url && actor.isSpeler && typeof huidigeHeld === 'function') url = 'assets/karakters/' + huidigeHeld().art + '.webp';
    const f = { m: await masker(url) };
    if (d3 && window.Vista) {
      const sp = Vista.schermPos(actor); const vm = (Vista.voetMeting ? Vista.voetMeting() : []).find(x => actor.isSpeler ? x.wie === 'speler' : x.wie === actor.id);
      if (!sp || !vm) return null;
      const hq = vm.quadY - sp.topY; f.img = { l: sp.x - hq / 2, t: sp.topY, r: sp.x + hq / 2, b: vm.quadY }; f.voet = vm.y;
    } else {
      if (!artEl) return null;
      const r = (imgEl || artEl).getBoundingClientRect();
      if (imgEl && f.m) { const s = Math.min(r.width / f.m.nw, r.height / f.m.nh), iw = f.m.nw * s, ih = f.m.nh * s; f.img = { l: r.left + (r.width - iw) / 2, t: r.top + (r.height - ih) / 2 }; f.img.r = f.img.l + iw; f.img.b = f.img.t + ih; }
      else f.img = R(imgEl || artEl);
      if (!f.img) return null;
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
  const pct = (f, rs) => f ? +(100 * rs.filter(Boolean).reduce((s, r) => s + opaakIn(f, r), 0) / f.opaakPx).toFixed(2) : 0;
  const baasV = () => { const g = S.gevecht; return g ? (g.vijanden.find(v => v.id === 'de_erfprins' && !v.dood) || g.vijanden.find(v => v.id === 'de_erfprins')) : null; };
  const kolom = v => { const g = S.gevecht; const i = g.vijanden.indexOf(v); return GDOM.vijanden[i] ? GDOM.vijanden[i].wrap : null; };
  const alle = s => [...document.querySelectorAll(s)].filter(zicht).map(R);
  const een = s => { const e = document.querySelector(s); return zicht(e) ? R(e) : null; };
  const som = (A, B) => A.reduce((s, a) => s + B.reduce((t, b) => t + snij(a, b), 0), 0);
  async function rust() {
    const g = S.gevecht; if (!g) return { geen: true };
    const W = innerWidth, H = innerHeight;
    const b = baasV(); const kol = b ? kolom(b) : null;
    const held = await figuur(g.speler), bf = b ? await figuur(b) : null;
    const pillen = kol ? [...kol.querySelectorAll('.intent')].filter(zicht).map(R) : [];
    const baasChips = kol ? [...kol.querySelectorAll('.blok-status > *')].filter(zicht).map(R) : [];
    const heldChips = alle('#speler-zone .blok-status > *');
    const tb = een('#topbalk'), aeg = een('#baas-balk .bb-aegis'), aegEl = document.querySelector('#baas-balk .bb-aegis');
    const beurt = een('#baas-balk .bb-beurt');
    const gy = grondY();
    return {
      W, H, achtergrond: g.achtergrond || '', finale: (ACHTERGRONDEN.act2 && ACHTERGRONDEN.act2.finale) || '',
      afstand: (held && bf) ? +(bf.sil.l - held.sil.r).toFixed(1) : null, midden: bf ? +(100 * ((bf.sil.l + bf.sil.r) / 2) / W).toFixed(1) : null,
      voetBaas: bf ? +bf.voet.toFixed(1) : null, voetHeld: held ? +held.voet.toFixed(1) : null, grondY: gy == null ? null : +gy.toFixed(1),
      scroll: document.documentElement.scrollWidth - W,
      pilTekst: kol ? [...kol.querySelectorAll('.intent')].map(e => e.textContent.trim()).join(' | ') : '',
      pilTop: tb ? som(pillen, [tb]) : 0, pilHeld: pct(held, pillen), pilHeldChips: som(pillen, heldChips),
      chipsHand: som(baasChips.concat(heldChips), alle('#hand .kaart')),
      aegis: aeg, aegisH: aeg ? +(aeg.b - aeg.t).toFixed(1) : null, aegisTekst: aegEl ? aegEl.textContent : null, aegisTip: aegEl ? (aegEl.getAttribute('data-tip') || '') : null,
      aegisAfgekapt: aegEl ? aegEl.scrollWidth - aegEl.clientWidth : null, aegisChips: aeg ? som([aeg], baasChips) : 0,
      beurtBots: beurt ? som([beurt], [aeg, een('#baas-balk .bb-naam'), een('#baas-balk .bb-balk'), een('#beurt-label')].filter(Boolean).concat(pillen)) : 0,
      buitNamen: b ? (b.gestolen || []).map(s => erfNaam(s)) : [], baasSil: bf && bf.sil
    };
  }
  async function roof() {
    const g = S.gevecht; if (!g) return { geen: true };
    const W = innerWidth, H = innerHeight;
    const ov = document.querySelector('.roof-overlay:not(.dt-overlay):not(.slachtblok-overlay)');
    if (!ov) return { geenOverlay: true };
    const b = baasV(); const bf = b ? await figuur(b) : null;
    const kop = R(ov.querySelector('.roof-kop'));
    const vingerEl = ov.querySelector('.vieze-vinger.wijst'); const vinger = vingerEl ? R(vingerEl) : null;
    const gekozen = R(ov.querySelector('.roof-kaart.gekozen'));
    const hint = R(ov.querySelector('.roof-hint'));
    const tegels = [...ov.querySelectorAll('.roof-kaart')].map(R).filter(Boolean);
    return {
      metPrins: ov.classList.contains('met-prins'), kaartenN: tegels.length,
      waaierBaas: pct(bf, tegels), kopBaas: pct(bf, [kop]),
      tegelsUit: tegels.filter(t => t.l < -0.5 || t.t < -0.5 || t.r > W + 0.5 || t.b > H + 0.5).length,
      scrollOv: Math.max(ov.scrollHeight - ov.clientHeight, ov.scrollWidth - ov.clientWidth),
      vingerInKaart: (vinger && gekozen) ? (() => { const cx = (vinger.l + vinger.r) / 2, cy = (vinger.t + vinger.b) / 2; return cx >= gekozen.l && cx <= gekozen.r && cy >= gekozen.t && cy <= gekozen.b; })() : null,
      vingerKop: snij(vinger, kop), hintWaaier: hint ? som([hint], tegels) : 0, fit: ov.dataset.fit || ''
    };
  }
  async function speel(wrap) {
    const g = S.gevecht; if (!g || !wrap) return { geen: true };
    const W = innerWidth, H = innerHeight;
    const b = baasV(); const bf = b ? await figuur(b) : null; const kol = b ? kolom(b) : null;
    const kaart = R(wrap.querySelector('.kaart-focus')), kop = R(wrap.querySelector('.rs-kop')), stempel = R(wrap.querySelector('.rs-stempel'));
    const bb = een('#baas-balk'), tb = een('#topbalk');
    const pillen = kol ? [...kol.querySelectorAll('.intent')].filter(zicht).map(R) : [];
    const binnen = r => !!r && r.l >= -0.5 && r.t >= -0.5 && r.r <= W + 0.5 && r.b <= H + 0.5;
    return {
      schaal: +(getComputedStyle(wrap).getPropertyValue('--rs-s') || 1), kaartBaas: pct(bf, [kaart]),
      kopBB: bb ? snij(kop, bb) : 0, kopTop: tb ? snij(kop, tb) : 0, kopPil: som(kop ? [kop] : [], pillen), kopBinnen: binnen(kop), stempelBinnen: binnen(stempel),
      stempelInKaart: (stempel && kaart) ? (stempel.l >= kaart.l - 14 && stempel.r <= kaart.r + 14 && stempel.t >= kaart.t && stempel.b <= kaart.b) : null,
      stempelTekst: (wrap.querySelector('.rs-stempel') || {}).textContent || ''
    };
  }
  function speelRecorder() {
    window.__speelMetingen = [];
    if (window.__speelObs) window.__speelObs.disconnect();
    const obs = new MutationObserver(ms => {
      for (const m of ms) for (const n of m.addedNodes) {
        if (!(n instanceof HTMLElement) || !n.classList.contains('roof-speel-kaart')) continue;
        let klaar = false;
        const neem = async () => { if (klaar) return; klaar = true; window.__speelMetingen.push(await speel(n)); };
        n.addEventListener('transitionend', e => { if (e.target === n && e.propertyName === 'transform' && n.classList.contains('in')) neem(); });
        setTimeout(neem, 700);
      }
    });
    obs.observe(document.body, { childList: true });
    window.__speelObs = obs;
  }
  function inv() {
    const W = innerWidth, H = innerHeight;
    const klap = een('.inv-klap');
    const teksten = ['#baas-intro small', '.inv-tekst', '#baas-intro .morf-hint'].map(s => een(s)).filter(Boolean);
    return { klap, klapBinnen: !!klap && klap.t >= -0.5 && klap.b <= H + 0.5 && klap.l >= -0.5 && klap.r <= W + 0.5, tekstOpKlap: som(klap ? [klap] : [], teksten) };
  }
  window.__EA = { rust, roof, speel, speelRecorder, inv };
})();`;

/* ---------- pagina openen en de Erfprins zetten ---------- */
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
  for (let i = 0; i < 6; i++) {   /* eerst één gewoon gevecht (Vista warm) */
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
async function wacht(page, fn, max = 8000, stap = 60) { const t0 = Date.now(); while (Date.now() - t0 < max) { if (await page.evaluate(fn)) return true; await slaap(stap); } return false; }
async function startErf(page, ontmoeting = 3) {
  await page.evaluate(o => {
    Codex.erfprinsOntmoetingen = o; S.metgezel = null; devErfprins();
    if (document.querySelector('#draai-blok.toon') && typeof speelTochStaand === 'function') speelTochStaand();
  }, ontmoeting);
  await slaap(1200);
  await page.evaluate(() => { const b = document.getElementById('baas-intro'); if (b && !/inv/.test(b.className)) b.click(); });
  await wachtRust(page, 7000, 40000);
  await page.evaluate(() => { document.querySelectorAll('#meldingen .toast').forEach(t => t.remove()); if (typeof _spraakStop === 'function') _spraakStop(); });
  await slaap(300);
}
const STATUS = {
  geen: { baas: {}, held: {} },
  vier: { baas: { gif: 9, zwak: 2, kwetsbaar: 2, kracht: 2 }, held: { kracht: 2, zwak: 1, kwetsbaar: 1, gif: 3 } },
  vijf: { baas: { gif: 9, zwak: 2, kwetsbaar: 2, kracht: 2, doornen: 2 }, held: { kracht: 2, zwak: 1, kwetsbaar: 1, gif: 3, doornen: 2 } }
};
async function zetStatus(page, soort) {
  await page.evaluate(s => {
    const g = S.gevecht; if (!g) return;
    g.speler.status = Object.assign({}, s.held);
    g.vijanden.forEach(v => { if (!v.dood) v.status = Object.assign({}, s.baas); });
    renderGevecht(); try { zetVoetschaduwen(); } catch (e) { }
  }, STATUS[soort]);
  await slaap(250);
}
async function zetFakkel(page, n) {
  await page.evaluate(n => { S.fakkel = (n === 'max') ? fakkelMax() : n; try { zetLichtVisueel(); } catch (e) { } renderGevecht(); renderTopbalk(); }, n);
  await slaap(450);
}
async function lum(page, r) {   /* mediane luminantie in een rechthoek (screenshot) */
  if (!PNG || !r) return null;
  const vp = page.viewportSize();
  const l = Math.max(0, r.l), t = Math.max(0, r.t), w = Math.min(vp.width, r.r) - l, h = Math.min(vp.height, r.b) - t;
  if (w < 2 || h < 2) return null;
  const png = PNG.sync.read(await page.screenshot({ clip: { x: l, y: t, width: w, height: h } }));
  const L = []; for (let i = 0; i < png.data.length; i += 4) L.push(0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2]);
  L.sort((a, b) => a - b); return L[Math.floor(L.length / 2)];
}
const kern = r => r ? { l: r.l + (r.r - r.l) * 0.3, r: r.l + (r.r - r.l) * 0.7, t: r.t + (r.b - r.t) * 0.2, b: r.t + (r.b - r.t) * 0.8 } : null;   /* zijn lijf, zonder de achtergrond */
async function shot(page, naam) { if (SHOTS) { try { await page.screenshot({ path: path.join(SHOTS, naam.replace(/[^\w.-]+/g, '_') + '.png') }); } catch (e) { } } }
const fouten = (page, t, vp, wat) => { t(page.__f.length === 0, `${vp.naam} ${wat}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : '')); page.__f.length = 0; };

/* een Erfprins NA de Roof, zonder regie: buit van N kaarten (unieke uids), fase f */
const NA_ROOF = ([N, fase]) => {
  const g = S.gevecht; const v = g.vijanden.find(x => x.id === 'de_erfprins');
  g.roofGedaan = true; g.roofBeurt = false; v.fase = fase; v.copyKracht = ERF.toeslag[fase];
  const bron = S.dek.slice(); const buit = [];
  for (let i = 0; i < N; i++) { const c = Object.assign({}, bron[i % bron.length]); c.uid = 900000 + i; buit.push(erfBuitKaart(c)); }
  v.gestolen = buit; v.intent = VIJANDEN[v.id].kies(v, v.beurtTeller); renderGevecht();
};

/* ============================================================
   1 · REGIE per formaat: rust (B1.1, B1.2), na de Roof (B1.6, W7), de Roof (B1.3), de buit-beat
   (W5) en de plagiaatkaart (B1.4)
   ============================================================ */
async function regie(browser, fk) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  const liggend = vp.mobiel && !vp.staand, laptop = !vp.mobiel;
  await startErf(page);
  /* --- rust --- */
  const rust = [];
  for (const st of ['geen', 'vijf']) for (const f of ['max', 0]) {
    await zetStatus(page, st); await zetFakkel(page, f);
    if (vp.d3) await page.evaluate(() => { try { kaderFit3D(); } catch (e) { } });
    await slaap(vp.d3 ? 300 : 150);
    const m = await page.evaluate(() => __EA.rust()); m.st = st; m.f = f; rust.push(m);
    if (st === 'geen' && f === 'max') await shot(page, `${vp.naam}_rust`);
  }
  const lijst = f => rust.map(f).join(' / ');
  if (liggend) t(rust.every(m => m.afstand >= 140 && m.midden >= 63), `B1.1 ${vp.naam}: held en prins elk hun helft — afstand ${lijst(m => m.afstand)} px (>= 140), midden van de prins ${lijst(m => m.midden)} % (>= 63)`);
  t(rust.every(m => m.scroll <= 0), `B1.1 ${vp.naam}: geen horizontale scroll (${lijst(m => m.scroll)})`);
  t(rust.every(m => m.finale && m.achtergrond.endsWith(m.finale)), `B1.2 ${vp.naam}: de vaste arena ("${(rust[0].achtergrond || '').split('/').pop()}" = ACHTERGRONDEN.act2.finale)`);
  if (!vp.d3) t(rust.every(m => m.grondY != null && Math.abs(m.voetBaas - m.grondY) <= 2 && Math.abs(m.voetBaas - m.voetHeld) <= 2), `B1.2 ${vp.naam}: zijn zool op de grondlijn van de plaat en op die van de held (|zool - grond| ${lijst(m => m.grondY == null ? '?' : (m.voetBaas - m.grondY).toFixed(1))} px, |baas - held| ${lijst(m => (m.voetBaas - m.voetHeld).toFixed(1))}; <= 2)`);
  t(rust.every(m => m.pilTop === 0 && m.pilHeld === 0 && m.chipsHand === 0), `${vp.naam} rust: zijn pil ("${rust[0].pilTekst}") niet in de topbalk (${lijst(m => m.pilTop)} px2) en niet op de held (${lijst(m => m.pilHeld)} %), geen chip achter de hand (${lijst(m => m.chipsHand)})`);
  /* --- na de Roof: de Buit-pil (B1.6) en zijn breedste pil (W7) --- */
  const na = [];
  for (const [N, fase] of [[0, 2], [6, 2], [12, 3]]) for (const st of ['geen', 'vijf']) {
    await zetStatus(page, st); await zetFakkel(page, 'max');
    await page.evaluate(NA_ROOF, [N, fase]); await slaap(vp.d3 ? 350 : 200);
    if (vp.d3) await page.evaluate(() => { try { kaderFit3D(); } catch (e) { } });
    await slaap(150);
    const m = await page.evaluate(() => __EA.rust()); m.N = N; m.st = st; na.push(m);
  }
  await shot(page, `${vp.naam}_buitpil_N12`);
  t(na.every(m => m.aegisH != null && m.aegisH <= 34 && m.aegisAfgekapt <= 0), `B1.6 ${vp.naam}: de Buit-pil is één regel en niets is afgekapt bij 0/6/12 kaarten (hoogte ${na.map(m => m.aegisH).join('/')} px <= 34; "${(na[na.length - 1].aegisTekst || '').trim()}")`);
  t(na.every(m => m.buitNamen.every(n => m.aegisTip.includes(n))), `B1.6 ${vp.naam}: de tip noemt elke geroofde kaart (${na.map(m => m.buitNamen.length).join('/')} namen)`);
  t(na.every(m => m.aegisChips === 0 && m.beurtBots === 0), `B1.6 ${vp.naam}: de Buit-pil niet over zijn chipkolom (${na.map(m => m.aegisChips).join('/')} px2, vijf statussen) en 'Beurt N' botst nergens (${na.map(m => m.beurtBots).join('/')})`);
  t(na.every(m => m.pilHeld === 0 && m.pilTop === 0 && m.pilHeldChips === 0), `W7 ${vp.naam}: zijn breedste pil ("${na[na.length - 1].pilTekst}") niet op de held (${na.map(m => m.pilHeld).join('/')} %), zijn chips of de topbalk`);
  /* --- W12: een aangetaste kaart in je hand verliest niet méér van haar tekst dan dezelfde kaart gewoon --- */
  const w12 = await page.evaluate(async () => {
    const g = S.gevecht; const oud = g.hand;
    const ids = ['schildmuur', 'in_drievoud', 'offervlam', 'zuivering', 'duisterklauw', 'metaalhuid', 'demonenvorm'].filter(id => KAARTEN[id]).slice(0, 5);
    const meet = async aangetast => {
      g.hand = ids.map(id => { const c = nieuweKaart(id); if (aangetast) { c.aangetast = true; c.uitputtend = true; } return c; });
      renderGevecht(); await new Promise(r => setTimeout(r, 80));
      return g.hand.map(c => { const el = document.querySelector(`#hand .kaart[data-uid="${c.uid}"] .kaart-tekst`); return el ? el.scrollHeight - el.clientHeight : null; });
    };
    const gewoon = await meet(false), aangetast = await meet(true);
    g.hand = oud; renderGevecht();
    return { ids, gewoon, aangetast };
  });
  const erger = w12.ids.filter((id, i) => w12.gewoon[i] != null && w12.aangetast[i] != null && w12.aangetast[i] > w12.gewoon[i] + 1);
  if (vp.mobiel) t(w12.gewoon.every(x => x != null) && erger.length === 0, `W12 ${vp.naam}: een aangetaste handkaart verliest niet meer tekst dan de gewone (${w12.ids.map((id, i) => id + ' ' + w12.gewoon[i] + '->' + w12.aangetast[i]).join(', ')} px overloop)`);
  else t(true, `W12 ${vp.naam} (ter info): overloop van de handtekst gewoon -> aangetast: ${w12.ids.map((id, i) => id + ' ' + w12.gewoon[i] + '->' + w12.aangetast[i]).join(', ')} px`);
  fouten(page, t, vp, 'rust en Buit-pil');
  /* --- de Roof (B1.3): echte trekstapel, 6 en 22 kaarten; op Thomas' toestel en 3D ook in het donker --- */
  const donker = ['M800', 'M846', 'L1440d3'].includes(fk);
  const gevallen = [[0, 'geen', 'max'], [6, 'geen', 'max'], [22, 'geen', 'max']].concat(donker ? [[0, 'vier', 0]] : []);
  for (const [N, st, f] of gevallen) {
    await startErf(page);
    if (st !== 'geen') await zetStatus(page, st);
    if (f !== 'max') await zetFakkel(page, f);
    if (vp.d3) await page.evaluate(() => { try { kaderFit3D(); } catch (e) { } });
    await slaap(300);
    const r0 = await page.evaluate(() => __EA.rust());
    const lumRust = await lum(page, kern(r0.baasSil));
    await page.evaluate(N => {
      const g = S.gevecht;
      if (N > 0) { const bron = S.dek.slice(); g.trek = Array.from({ length: N }, (_, i) => { const c = Object.assign({}, bron[i % bron.length]); c.uid = 800000 + i; return c; }); }
      window.__roof = copycatDeRoof(g);
    }, N);
    await wacht(page, () => !!document.querySelector('.roof-overlay.open .vieze-vinger.wijst') && !!document.querySelector('.roof-kaart.gekozen'), 9000);
    await slaap(380);
    const m = await page.evaluate(() => __EA.roof());
    const lumRoof = await lum(page, kern(r0.baasSil));
    const zichtR = (lumRust && lumRoof) ? +(lumRoof / Math.max(1, lumRust)).toFixed(2) : null;
    const wat = `de Roof ${N ? N + ' kaarten' : 'echte trekstapel (' + m.kaartenN + ')'}${f !== 'max' ? ', fakkel 0 + vier statussen' : ''}`;
    await shot(page, `${vp.naam}_roof_${N || 'echt'}${f !== 'max' ? '_donker' : ''}`);
    t(m.metPrins && m.waaierBaas === 0 && m.kopBaas === 0, `B1.3 ${vp.naam} ${wat}: waaier en kop naast hem (waaier ${m.waaierBaas} %, kop ${m.kopBaas} % van zijn silhouet; tegels ${m.fit})`);
    t(m.tegelsUit === 0 && m.scrollOv <= 0, `B1.3 ${vp.naam} ${wat}: elke tegel in beeld (${m.tegelsUit} erbuiten), geen scroll (${m.scrollOv})`);
    t(zichtR == null || zichtR >= 0.9, `B1.3 ${vp.naam} ${wat}: hij staat in het gat, zijn lijf ${zichtR}x zo helder als in rust (>= 0,9)`);
    t(m.vingerInKaart === true && m.vingerKop === 0 && m.hintWaaier === 0, `B1.3 ${vp.naam} ${wat}: de vinger ÓP de gekozen kaart (${m.vingerInKaart}), niet op de kop (${m.vingerKop} px2), de tik-hint niet op de waaier (${m.hintWaaier})`);
    await page.evaluate(async () => { try { await window.__roof; } catch (e) { } });
    if (N !== 0 || f !== 'max') continue;
    await slaap(500);
    /* --- de buit-beat (W5) --- */
    const it = await page.evaluate(() => { const v = S.gevecht.vijanden[0]; return v.intent && v.intent.type; });
    await page.evaluate(() => { const v = S.gevecht.vijanden[0]; if (v.intent && v.intent.doe) window.__buit = v.intent.doe(v); });
    await wacht(page, () => !!document.querySelector('.roof-overlay.buit-overlay.open'), 4000);
    await slaap(1150);   /* de vinger tikt zijn eerste kaart aan (420 + 320 ms transitie) */
    const bu = await page.evaluate(() => __EA.roof());
    const lumBuit = await lum(page, kern(r0.baasSil));
    const zichtB = (lumRust && lumBuit) ? +(lumBuit / Math.max(1, lumRust)).toFixed(2) : null;
    await shot(page, `${vp.naam}_buit`);
    t(it === 'buit', `W5 ${vp.naam}: na de Roof bekijkt hij eerst zijn buit (zet "${it}")`);
    t(bu.metPrins && bu.waaierBaas === 0 && bu.kopBaas === 0 && bu.tegelsUit === 0 && bu.scrollOv <= 0, `W5 ${vp.naam} buit-beat (${bu.kaartenN} kaarten, ${bu.fit}): waaier ${bu.waaierBaas} % en kop ${bu.kopBaas} % op zijn silhouet, ${bu.tegelsUit} tegels buiten beeld, scroll ${bu.scrollOv}`);
    t((zichtB == null || zichtB >= 0.9) && bu.vingerInKaart === true, `W5 ${vp.naam} buit-beat: hij in het gat (${zichtB}x), de vinger op zijn eerste kaart (${bu.vingerInKaart})`);
    await page.evaluate(async () => { try { await window.__buit; } catch (e) { } });
    await slaap(300);
    /* --- de plagiaatkaart (B1.4): fase 2 (1 kaart) en fase 3 (2 kaarten) --- */
    for (const fase of [2, 3]) {
      await page.evaluate(fase => { const g = S.gevecht; const v = g.vijanden[0]; g.roofBeurt = false; v.gestolen = (v.gestolen || []).filter(s => s.soort !== 'vloek'); v.fase = fase; v.copyKracht = ERF.toeslag[fase]; v.hp = Math.max(v.hp, 60); if (fase === 3) v.plagN = 1; v.intent = VIJANDEN[v.id].kies(v, v.beurtTeller); renderGevecht(); }, fase);
      await slaap(250);
      await page.evaluate(() => { __EA.speelRecorder(); const v = S.gevecht.vijanden[0]; S.gevecht.vijandAanZet = true; if (v.intent && v.intent.doe) window.__zet = v.intent.doe(v); });
      await wacht(page, () => (window.__speelMetingen || []).length > 0, 5000);
      await shot(page, `${vp.naam}_plagiaat_f${fase}`);
      await page.evaluate(async () => { try { await window.__zet; } catch (e) { } S.gevecht.vijandAanZet = false; });
      const ms = await page.evaluate(() => window.__speelMetingen || []);
      const min = laptop ? 0.72 : (vp.staand ? 0.6 : 0.92);
      t(ms.length >= 1, `B1.4 ${vp.naam} fase ${fase}: ${ms.length} grote kaart(en) gemeten`);
      if (!vp.staand) t(ms.every(m => m.kaartBaas <= 2), `B1.4 ${vp.naam} fase ${fase}: de kaart naast hem (${ms.map(m => m.kaartBaas).join('/')} % van zijn silhouet, <= 2)`);
      t(ms.every(m => m.kopBinnen && m.kopBB === 0 && m.kopTop === 0 && m.kopPil === 0), `B1.4 ${vp.naam} fase ${fase}: de kop in beeld (${ms.map(m => m.kopBinnen).join('/')}), niet over de bazenbalk (${ms.map(m => m.kopBB).join('/')}), de topbalk (${ms.map(m => m.kopTop).join('/')}) of zijn pil (${ms.map(m => m.kopPil).join('/')})`);
      t(ms.every(m => m.schaal >= min - 0.001 && m.stempelInKaart && m.stempelBinnen), `B1.4 ${vp.naam} fase ${fase}: schaal ${ms.map(m => m.schaal).join('/')} (>= ${min}), de stempel op de kaart ("${ms.map(m => m.stempelTekst).join('" / "')}")`);
      await slaap(300);
    }
  }
  fouten(page, t, vp, 'Roof, buit-beat en plagiaatkaart');
  await ctx.close();
  return { kop: `Regie van de Erfprins (B1.1-B1.4, B1.6) · ${vp.naam}`, regels: R };
}

/* ============================================================
   2 · DE INVENTARIS (B1.5): de eerste ontmoeting, de climaxkaart in beeld
   ============================================================ */
async function inventaris(browser, fk) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  await page.evaluate(() => { Codex.erfprinsOntmoetingen = 0; S.metgezel = null; devErfprins(); if (document.querySelector('#draai-blok.toon') && typeof speelTochStaand === 'function') speelTochStaand(); });
  const inv = await page.evaluate(() => !!document.querySelector('.baas-intro-inventaris'));
  await wacht(page, () => !!document.querySelector('.inv-klap'), 20000, 120);
  await slaap(300);
  await wacht(page, () => { const k = document.querySelector('.inv-klap'); return !k || k.getAnimations({ subtree: true }).every(a => a.playState !== 'running'); }, 4000, 80);
  await slaap(120);
  const m = await page.evaluate(() => __EA.inv());
  await shot(page, `${vp.naam}_inventaris`);
  t(inv, `B1.5 ${vp.naam}: de eerste ontmoeting speelt de Inventaris-intro`);
  t(m.klapBinnen && m.tekstOpKlap === 0, `B1.5 ${vp.naam}: de climaxkaart binnen beeld (${m.klap ? Math.round(m.klap.t) + '..' + Math.round(m.klap.b) : '?'} van ${vp.h}), geen introtekst erover (${m.tekstOpKlap} px2)`);
  await wachtRust(page, 3000, 20000);
  fouten(page, t, vp, 'Inventaris');
  await ctx.close();
  return { kop: `De Inventaris-climax (B1.5) · ${vp.naam}`, regels: R };
}

/* ============================================================
   3 · EERLIJKHEID: echte gevechten, headless (slaap = 0), een eenvoudige bot.
   Op het einde van jouw beurt: wat zijn pil belooft (copycatVerwacht/-Gif). In zijn beurt: wat
   er echt landt vóór je Blok (per treffer glasDmg(blokbaar) + glasDmg(door)) en het Gif. Elke
   afwijking moet verklaard zijn: jij of hij sterft in die beurt, of hij staat op.
   ============================================================ */
async function eerlijk(browser) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page } = await open(browser, 'L1440');
  const res = await page.evaluate(async () => {
    window.slaap = () => Promise.resolve();
    try { Klank.sfx = () => { }; Klank.muziek = () => { }; } catch (e) { }
    window.schudScherm = () => { }; window.saveSpel = () => { }; window.bewaarCodex = () => { };
    try { INST.d3 = false; INST.lite = true; } catch (e) { }
    document.body.classList.add('lite');
    const oGG = window.gevechtGewonnen, oNed = window.nederlaag;
    window.gevechtGewonnen = async function () { const g = S.gevecht; if (!g || g.voorbij) return; g.voorbij = true; g._gewonnen = true; };
    window.nederlaag = function () { const g = S.gevecht; if (!g || g.voorbij) return; g.voorbij = true; g._verloren = true; };
    /* instrumentatie: wat landt er in zijn plagiaatbeurt */
    let inPlag = false, inDS = false, landt = 0, gif = 0;
    const oSpeel = window.copycatSpeelTerug;
    window.copycatSpeelTerug = async function (v, g, plan) { inPlag = true; try { return await oSpeel(v, g, plan); } finally { inPlag = false; } };
    const oDS = window.doeSchade;
    window.doeSchade = function (doel, dmg, bron) { if (inPlag && doel && doel.isSpeler && bron && !bron.isSpeler) landt += glasDmg(dmg); inDS = true; try { return oDS(doel, dmg, bron); } finally { inDS = false; } };
    const oVH = window.verliesHp;
    window.verliesHp = function (doel, n, bron) { if (inPlag && !inDS && doel && doel.isSpeler && bron && !bron.isSpeler) landt += n; return oVH(doel, n, bron); };
    const oGif = window.geefGif;
    window.geefGif = function (actor, n) { if (inPlag && actor && actor.isSpeler) { const voor = actor.status.gif || 0; const r = oGif(actor, n); gif += (actor.status.gif || 0) - voor; return r; } return oGif(actor, n); };
    const uit = { checks: 0, gelijk: 0, gifChecks: 0, gifGelijk: 0, afw: [], verklaard: {}, wissels: [], opstaan: 0, opstaanOk: 0, metgezel: 0, gevechten: 0, winst: 0, rondes: [], soorten: {} };
    for (const held of ['slachter', 'gifmagier', 'thoverk']) for (let s = 0; s < 3; s++) {
      nieuwSpel(held, 'ERF-ACC-' + held + '-' + s);
      S.metgezel = null; Codex.erfprinsOntmoetingen = 3;
      if (s === 2) S.maxHp = 240;   /* één lang gevecht per held: zo haalt de bot ook zijn noodrantsoen en de naroof */
      devErfprins();
      const g = S.gevecht; uit.gevechten++;
      document.querySelectorAll('#baas-intro').forEach(n => n.remove());
      const boss = () => g.vijanden.find(v => v.id === 'de_erfprins');
      const vrij = async () => { let w = 0; while ((g.ceremonie || g.bezig) && w++ < 400 && !g.voorbij) await new Promise(r => setTimeout(r, 10)); };
      await vrij();
      let ronde = 0;
      while (!g.voorbij && S.hp > 0 && ronde++ < 40) {
        await vrij();
        const b0 = boss(); if (!b0) break;
        const sig = it => it ? it.type + ':' + (it.plan || []).map(k => k.uid).join(',') : '-';
        const sig0 = sig(b0.intent), beurtStart = g.beurt;
        if (g.metgezel || S.metgezel) uit.metgezel++;
        /* de bot: eerst wat geen aanval is (de Roof sluit je beurt bij je eerste klap), dan de klappen */
        let guard = 0;
        while (guard++ < 25 && !g.voorbij) {
          await vrij();
          const speelbaar = g.hand.filter(c => { const d = kdef(c); const k = kkost(c); return d && d.type !== 'vloek' && k !== null && k <= g.energie && (!d.kan || d.kan(c)); });
          if (!speelbaar.length) break;
          const b = boss(); if (!b || b.dood) break;
          const nietAanval = speelbaar.filter(c => kdef(c).type !== 'aanval');
          const c = (nietAanval.length && !g.roofGedaan ? nietAanval : speelbaar).sort((a, z) => (kval(z, 'dmg') || kval(z, 'blok') || 1) - (kval(a, 'dmg') || kval(a, 'blok') || 1))[0];
          const beurt = g.beurt;
          await speelKaart(c, kdef(c).doel === 'vijand' ? b : undefined);
          if (g.beurt !== beurt) break;
        }
        await vrij();
        if (g.voorbij) break;
        const b1 = boss(); if (!b1) break;
        /* je eerste klap ontketende de Roof en die sloot je beurt (speelKaart -> eindBeurt): zijn
           beurt (de buit-beat, geen schade) is dan al gespeeld — niets te vergelijken */
        if (g.beurt !== beurtStart) { uit.verklaard['de Roof sloot je beurt'] = (uit.verklaard['de Roof sloot je beurt'] || 0) + 1; continue; }
        if (!b1.dood && sig(b1.intent) !== sig0 && b1.intent && b1.intent.type !== 'opstaan') uit.wissels.push(sig0 + ' -> ' + sig(b1.intent));
        const it = b1.intent; uit.soorten[it ? it.type : '?'] = (uit.soorten[it ? it.type : '?'] || 0) + 1;
        const pil = it && it.type === 'plagiaat' ? copycatVerwacht(b1) : null;
        const pilGif = it && it.type === 'plagiaat' ? copycatVerwachtGif(b1) : null;
        const nr = copycatNoodrantsoen(b1).hp, plagVoor = !!b1.plagiaat;
        landt = 0; gif = 0;
        const beurt = g.beurt; let pog = 0;
        while (g.beurt === beurt && !g.voorbij && pog++ < 5) { await vrij(); await eindBeurt(); await vrij(); }
        const b2 = boss();
        if (b2 && !plagVoor && b2.plagiaat) { uit.opstaan++; if (b2.hp === nr || b2.dood) uit.opstaanOk++; }
        if (pil != null) {
          const dood = g.voorbij || S.hp <= 0 || !b2 || b2.dood;
          const opgestaan = b2 && !plagVoor && b2.plagiaat;
          if (dood || opgestaan) { const k = dood ? 'iemand sterft in die beurt' : 'hij staat op'; uit.verklaard[k] = (uit.verklaard[k] || 0) + 1; continue; }
          uit.checks++; if (pil === landt) uit.gelijk++; else if (uit.afw.length < 6) uit.afw.push(`${held}/${s} r${ronde}: pil ${pil}, landt ${landt}`);
          uit.gifChecks++; if (pilGif === gif) uit.gifGelijk++; else if (uit.afw.length < 6) uit.afw.push(`${held}/${s} r${ronde}: gif-pil ${pilGif}, gif ${gif}`);
        }
      }
      if (g._gewonnen) uit.winst++;
      uit.rondes.push(ronde);
      stopGevechtLus(); S.gevecht = null;
    }
    window.gevechtGewonnen = oGG; window.nederlaag = oNed;
    return uit;
  });
  t(res.checks >= 20 && res.gelijk === res.checks, `eerlijkheid: pil == wat landt (vóór je Blok) in ${res.gelijk}/${res.checks} plagiaatbeurten (${res.gevechten} gevechten, 3 helden; zetten ${JSON.stringify(res.soorten)})` + (res.afw.length ? ' — ' + res.afw.join(' | ') : ''));
  t(res.gifGelijk === res.gifChecks, `eerlijkheid: het Gif op de pil == het Gif dat je krijgt in ${res.gifGelijk}/${res.gifChecks} plagiaatbeurten`);
  t(true, `eerlijkheid: verklaarde uitzonderingen ${JSON.stringify(res.verklaard)} (de pil geldt tot iemand sterft of hij opstaat); ${res.winst}/${res.gevechten} gewonnen door de eenvoudige bot, rondes ${res.rondes.join(',')}`);
  t(res.wissels.length === 0, `eerlijkheid: zijn plan wisselt niet binnen jouw beurt (${res.wissels.length}${res.wissels.length ? ': ' + res.wissels.slice(0, 3).join(' | ') : ''})`);
  t(res.opstaan === res.opstaanOk, `noodrantsoen: ♥+N == zijn HP als hij opstaat (${res.opstaanOk}/${res.opstaan})`);
  t(res.metgezel === 0, `solo: nooit een metgezel in het gevecht (${res.metgezel})`);
  t(page.__f.length === 0, `eerlijkheid: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
  await ctx.close();
  return { kop: 'Eerlijkheid: de pil zegt wat er landt (jury W3, bazen_plan §5 ent 6)', regels: R };
}

/* ============================================================
   4 · TEKST EN REGELS: de takken van intentTekst, verboden woorden, uid, tik-hint, devErfprins,
   B1.7 (orakel en nudge)
   ============================================================ */
async function tekst(browser) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page } = await open(browser, 'L1440');
  await startErf(page);
  /* --- elke Erfprins-zet heeft een eigen pil (W3) --- */
  const pillen = await page.evaluate(() => {
    const g = S.gevecht; const v = g.vijanden.find(x => x.id === 'de_erfprins'); const uit = [];
    const neem = (naam) => { const d = document.createElement('div'); d.innerHTML = intentTekst(v); const ps = [...d.querySelectorAll('.intent')]; uit.push({ naam, type: v.intent && v.intent.type, tekst: ps.map(p => p.textContent.trim()).join(' | '), tips: ps.map(p => p.dataset.tip || '') }); };
    neem('vóór de Roof');
    g.roofGedaan = true; g.roofBeurt = true; v.fase = 2; v.copyKracht = ERF.toeslag[2];
    v.gestolen = S.dek.slice(0, 8).map((c, i) => erfBuitKaart(Object.assign({}, c, { uid: 700000 + i })));
    v.intent = VIJANDEN[v.id].kies(v, 1); neem('de buit-beat');
    g.roofBeurt = false; v.intent = VIJANDEN[v.id].kies(v, 2); neem('plagiaat');
    v.intent = { type: 'opstaan', naam: 'Opstaan', doe: () => { } }; neem('opstaan');
    v.gestolen = []; g.trek = S.dek.slice(0, 8); v.intent = VIJANDEN[v.id].kies(v, 3); neem('naroof');
    g.trek = S.dek.slice(0, 1); v.intent = VIJANDEN[v.id].kies(v, 4); neem('uitputting');
    return uit;
  });
  for (const p of pillen) {
    const leeg = !p.tips.length || p.tips.some(x => !x.trim());
    t(!leeg && !p.tips.some(x => /verzwakt jou/.test(x)), `W3 ${p.naam} (${p.type}): eigen pil "${p.tekst}" met een eigen tip ("${(p.tips[0] || '').slice(0, 70)}…")`);
  }
  const getal = pillen.filter(p => p.type === 'plagiaat').every(p => p.tekst.split(' | ').every((tx, i) => { const n = (tx.match(/\d+/g) || []).pop(); return !n || p.tips[i].includes(n); }));
  t(getal, 'W3 plagiaat: elke pil noemt haar getal ook in de tip');
  /* --- verboden woorden in zijn teksten (jury W11) --- */
  const teksten = await page.evaluate(() => {
    const u = UITSPRAKEN._erfprins; const b = (typeof BESTIARIUM !== 'undefined' && BESTIARIUM.de_erfprins) || null;
    const lijst = [u.intro, u.woede, u.roof, ...(u.buit || []), u.retour, u.vloek, u.fase3, u.dood, u.plagiaat, ...(u.orakelSolo || []), ...Object.values(u.nudgeSolo || {})];
    if (b) lijst.push(b.lore, b.notitie);
    lijst.push(copycatFaseTip(S.gevecht.vijanden[0]));
    return lijst.filter(Boolean);
  });
  const verboden = /beste kaarten|verbrandt|Overleef tot|\bDrops\b|metgezel|bondgenoot|\bpoort\b/i;
  const fout = teksten.filter(x => verboden.test(x));
  t(teksten.length >= 15 && fout.length === 0, `W11 ${teksten.length} Erfprins-teksten (uitspraken, orakel, nudge, Bestiarium, fasetip): geen verboden woord` + (fout.length ? ' — ' + fout.map(x => x.slice(0, 60)).join(' | ') : ''));
  /* --- terugspelen matcht op uid (ent 5) --- */
  const uid = await page.evaluate(async () => {
    const g = S.gevecht; const v = g.vijanden.find(x => x.id === 'de_erfprins');
    const oud = window.slaap; window.slaap = () => Promise.resolve();
    try {
      const a = nieuweKaart('slag'), bk = nieuweKaart('slag'); bk.up = true;
      v.gestolen = [erfBuitKaart(a), erfBuitKaart(bk)];
      const plan = [erfPlanKaart(v, v.gestolen[1])];   /* de verbeterde */
      v.plagiaat = false; v.hp = Math.max(v.hp, 80);
      await copycatSpeelTerug(v, g, plan);
      return { over: v.gestolen.map(s => s.uid), a: a.uid, b: bk.uid };
    } finally { window.slaap = oud; document.querySelectorAll('.roof-speel-kaart').forEach(n => n.remove()); }
  });
  t(uid.over.length === 1 && uid.over[0] === uid.a, `ent 5: terugspelen matcht op uid (de verbeterde Slag+ gespeeld, de gewone Slag bleef: ${JSON.stringify(uid)})`);
  /* --- het noodrantsoen als belofte (ent 3): ♥+N klopt, zijn pil blijft heel, opstaan in zijn beurt ÍS zijn zet --- */
  const nr = await page.evaluate(() => {
    const uit = [];
    for (const zijnBeurt of [false, true]) {
      const g = S.gevecht; const v = g.vijanden.find(x => x.id === 'de_erfprins');
      v.dood = false; v.plagiaat = false; v.hp = 40; v.status = { gif: 3, zwak: 1 }; g.roofGedaan = true; g.roofBeurt = false; v.fase = 2; v.copyKracht = ERF.toeslag[2];
      v.gestolen = S.dek.slice(0, 8).map((c, i) => erfBuitKaart(Object.assign({}, c, { uid: 710000 + i + (zijnBeurt ? 100 : 0) })));
      v.intent = VIJANDEN[v.id].kies(v, 2);
      const pil = (v.intent.plan || []).map(k => k.uid);
      const belofte = copycatNoodrantsoen(v);
      renderGevecht();
      const aeg = document.querySelector('#baas-balk .bb-aegis'); const tip = aeg ? (aeg.dataset.tip || '') : '';
      g.vijandAanZet = zijnBeurt;
      verliesHp(v, v.hp + 5, sp());
      g.vijandAanZet = false;
      uit.push({ zijnBeurt, beloofd: belofte.hp, hp: v.hp, dood: !!v.dood, opgestaan: !!v.plagiaat,
        pilHeel: pil.every(u => (v.gestolen || []).some(s => s.uid === u)), zet: v.intent && v.intent.type,
        wis: ERF.rantsoenWist, gifNa: v.status.gif || 0, tipWis: /Gif, Zwak en Kwetsbaar/.test(tip) });
    }
    renderGevecht();
    return uit;
  });
  for (const x of nr) {
    t(!x.dood && x.opgestaan && x.hp === x.beloofd && x.pilHeel, `ent 3 noodrantsoen (${x.zijnBeurt ? 'in zijn beurt' : 'in jouw beurt'}): hij staat op met ${x.hp} HP = ♥+${x.beloofd} op zijn pil, en de kaarten van zijn pil zijn niet verscheurd (${x.pilHeel})`);
    t(x.zijnBeurt ? x.zet === 'opstaan' : x.zet === 'plagiaat', `ent 3 noodrantsoen (${x.zijnBeurt ? 'in zijn beurt' : 'in jouw beurt'}): zijn zet is daarna "${x.zet}" (${x.zijnBeurt ? 'opstaan ÍS zijn zet' : 'de zet op zijn pil blijft staan'})`);
    t(x.wis ? (x.gifNa === 0 && x.tipWis) : x.gifNa > 0, `ent 3 noodrantsoen: geen stille statuswis (ERF.rantsoenWist ${x.wis}: gif na het opstaan ${x.gifNa}, de wis staat op de Buit-pil: ${x.tipWis})`);
  }
  /* --- tik-om-over-te-slaan pas vanaf de tweede ontmoeting --- */
  const hint = await page.evaluate(async () => {
    const uit = {};
    for (const o of [1, 2]) {
      Codex.erfprinsOntmoetingen = o;
      const ov = document.createElement('div'); document.body.appendChild(ov);
      erfOverslaan(ov); uit[o] = !!ov.querySelector('.roof-hint'); ov.remove();
    }
    return uit;
  });
  t(hint[1] === false && hint[2] === true, `ent 5: de tik-hint pas vanaf de tweede ontmoeting (1e: ${hint[1]}, 2e: ${hint[2]})`);
  /* --- de Inventaris alleen bij de EERSTE ontmoeting (de teller telt vóór de intro speelt) --- */
  const intro = await page.evaluate(() => {
    const uit = {};
    for (const o of [0, 1, 2]) {
      Codex.erfprinsOntmoetingen = o; S.metgezel = null; devErfprins();
      uit[o + 1] = { intro: ((document.getElementById('baas-intro') || {}).className || ''), teller: Codex.erfprinsOntmoetingen };
      document.querySelectorAll('#baas-intro').forEach(x => x.remove());
    }
    return uit;
  });
  t(/inventaris/.test(intro[1].intro) && !/inventaris/.test(intro[2].intro) && /erfprins/.test(intro[2].intro) && !/inventaris/.test(intro[3].intro) && intro[1].teller === 1 && intro[2].teller === 2,
    `de Inventaris-intro alleen bij de eerste ontmoeting, daarna de snelle speelkaart (1e "${intro[1].intro}", 2e "${intro[2].intro}", 3e "${intro[3].intro}")`);
  /* --- devErfprins realistisch (W13) --- */
  const dev = await page.evaluate(() => { nieuwSpel('slachter', 'ERF-ACC-DEV'); devErfprins(); return { hp: S.hp, max: S.maxHp, dranken: S.dranken.slice(), dek: S.dek.length }; });
  t(dev.hp === Math.round(dev.max * 0.85) && dev.dranken.length === 1 && dev.dranken[0] === 'heeldrank' && dev.dek >= 16, `W13 devErfprins realistisch: ${dev.hp}/${dev.max} HP (85 %), dranken [${dev.dranken}], dek ${dev.dek}`);
  /* --- B1.7: orakel en nudge --- */
  const b17 = await page.evaluate(async () => {
    const u = UITSPRAKEN._erfprins;
    const uit = { orakel: u.orakelSolo.slice(), nudge: {} };
    const oud = window.baasSpreekt; const gezegd = [];
    window.baasSpreekt = (tk) => { gezegd.push(tk); };
    const oudTO = window.setTimeout;
    /* de nudge in toonBaasIntro komt op 9,2 s: vang de timers op en voer ze meteen uit */
    for (const [n, baasScherfInTas, daily] of [[0, false], [1, false], [2, false], [3, false], [2, true], [3, false, true]]) {
      gezegd.length = 0;
      nieuwSpel('slachter', 'ERF-ACC-NUDGE-' + n); S.metgezel = null; Codex.erfprinsOntmoetingen = 3; S.daily = !!daily;
      const ids = alleScherfIds().slice(0, n + 1);
      window.setTimeout = (f, ms) => (ms >= 5000 ? (f(), 0) : oudTO(f, ms));
      try {
        devErfprins();
        const g = S.gevecht;
        S.scherven = ids.slice(0, n);
        if (baasScherfInTas) { g.baasScherf = ids[n]; S.scherven.push(ids[n]); } else g.baasScherf = null;
        document.querySelectorAll('#baas-intro').forEach(x => x.remove());
        toonBaasIntro(g);
      } finally { window.setTimeout = oudTO; }
      S.daily = false;
      uit.nudge[n + (baasScherfInTas ? '+baas' : '') + (daily ? '+daily' : '')] = gezegd.filter(x => x === u.nudgeSolo.twee || x === u.nudgeSolo.rijp).map(x => x === u.nudgeSolo.rijp ? 'rijp' : 'twee');
      document.querySelectorAll('#baas-intro').forEach(x => x.remove());
    }
    window.baasSpreekt = oud;
    return uit;
  });
  t(/tafel/.test(b17.orakel[3]) && !b17.orakel.some(r => /poort|breker|vóédt/i.test(r)), `B1.7 orakel: regel 4 wijst naar de tafel ("${b17.orakel[3].slice(0, 70)}…"), geen poort of breker`);
  t(JSON.stringify(b17.nudge) === JSON.stringify({ 0: [], 1: [], 2: ['twee'], 3: ['rijp'], '2+baas': ['twee'], '3+daily': [] }), `B1.7 nudge telt wat de tafel telt: 0/1 scherf -> niets, 2 -> nerveus, 3 -> rijp, de stille baas-scherf telt niet, niet op de daily (geen tafel) (${JSON.stringify(b17.nudge)})`);
  t(page.__f.length === 0, `tekst en regels: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
  await ctx.close();
  return { kop: 'Tekst en regels (W3, W11, W13, ent 5, B1.7)', regels: R };
}

/* ============================================================
   5 · B1.7 het orakel valt niet samen met een banner (orakel ∩ .baas-flits = 0 ms)
   ============================================================ */
async function orakelTijd(browser, fk, klap) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, fk);
  const r = await page.evaluate(async klap => {
    S.metgezel = null; Codex.erfprinsOntmoetingen = 1;   /* wordt 2 bij de start: de snelle intro + orakelSolo[1] */
    const rec = []; const t0 = performance.now();
    const iv = setInterval(() => rec.push({ t: Math.round(performance.now() - t0), sp: [...document.querySelectorAll('.baas-spraak')].filter(e => +getComputedStyle(e).opacity > 0.2).map(e => e.textContent.trim()), flits: !!document.querySelector('.baas-flits') }), 50);
    devErfprins();
    if (document.querySelector('#draai-blok.toon') && typeof speelTochStaand === 'function') speelTochStaand();
    /* klap: de speler slaat toe op 6,0 s, de woede-banner valt dan vlak voor het orakel (6,4 s);
       zonder klap moet het orakel gewoon te lezen zijn */
    await new Promise(r => setTimeout(r, 6000));
    const g = S.gevecht; const roof = klap ? copycatDeRoof(g) : null;
    await new Promise(r => setTimeout(r, 9000));
    if (roof) await roof;
    clearInterval(iv);
    const ork = UITSPRAKEN._erfprins.orakelSolo[1];
    const samen = rec.filter(x => x.flits && x.sp.some(s => s.startsWith(ork.slice(0, 20)))).length * 50;
    const gezien = rec.filter(x => x.sp.some(s => s.startsWith(ork.slice(0, 20)))).length * 50;
    return { samen, gezien };
  }, klap);
  t(r.samen === 0, `B1.7 ${vp.naam} ${klap ? 'met je eerste klap op 6 s' : 'zonder klap'}: het orakel nooit tegelijk met een banner (${r.samen} ms samen, ${r.gezien} ms in beeld)`);
  if (!klap) t(r.gezien >= 1500, `B1.7 ${vp.naam} zonder klap: het orakel is te lezen (${r.gezien} ms in beeld, >= 1,5 s)`);
  t(page.__f.length === 0, `${vp.naam}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
  await ctx.close();
  return { kop: `Het orakel en de woede-banner (B1.7) · ${vp.naam} · ${klap ? 'klap op 6 s' : 'geen klap'}`, regels: R };
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const FILTER = process.env.SLAYIT_TAKEN ? new RegExp(process.env.SLAYIT_TAKEN) : null;
  const taken = [
    ...['M800', 'M846', 'L1440', 'L1440d3', 'L1366', 'L1366d3', 'P412'].map(fk => ['regie ' + fk, () => regie(browser, fk)]),
    ...['M800', 'M846', 'L1440', 'L1440d3', 'L1366d3', 'P412'].map(fk => ['inventaris ' + fk, () => inventaris(browser, fk)]),
    ['eerlijk', () => eerlijk(browser)],
    ['tekst', () => tekst(browser)],
    ...[['M800', true], ['M800', false], ['L1440', true], ['L1440d3', false]].map(([fk, klap]) => ['orakel ' + fk, () => orakelTijd(browser, fk, klap)])
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
