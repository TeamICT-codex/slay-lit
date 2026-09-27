/* ============================================================================
   B3 · DE ROOF, EERLIJK — ACCEPTATIESUITE (de Erfprins, SOLO)
   De integratie van release B3 (bazen_plan.md §5 en §8): de mechaniek (O1 + de enten), de regie
   (P_plaatsing_regie_plan.md §4, B1.1-B1.7) en de ijking (ERF in js/game.js). Vijf delen:
   (a) de STRENGE EERLIJKHEIDSCONTROLE over honderden echte gevechten, (b) de TEKSTCATALOGUS (elke
   speler-tekst over de Erfprins, opgelijst en getoetst aan de code), (c) de REGIE op alle
   formaten, (d) zijn BEAT ('slaat niet in beurt 1' nooit beter dan 'bewust') en (e) solo, fakkel
   0 en 100, vier statussen op held en baas, 0 paginafouten.

   Draaien (Windows, vanuit een map met playwright + pngjs in node_modules):
       NODE_PATH="$PWD/node_modules" SLAYIT_WORKTREE='C:\...\SLAY-IT-erfprins' \
         node tools/erfprins_acceptatie.js
   Geen dev-server: de worktree wordt vanaf schijf bediend via route.fulfill op
   http://localhost:4173. SLAYIT_SHOTS=<map> bewaart screenshots per moment; SLAYIT_PAR=<n> zet
   het aantal browsercontexten voor de regie (standaard 3); SLAYIT_WERKERS=<n> het aantal pagina's
   voor de gevechten (standaard 6); SLAYIT_TAKEN=<regex> draait een deel (bv. 'gevechten|catalogus'
   of 'regie M800'); SLAYIT_SNEL=1 draait maar een handvol gevechten (om de suite zelf te testen).
   Een volledige run duurt ~15 min: eerst de gevechten (±950, headless), dan de regie. Draai hem
   niet naast andere zware suites.

   (a) EERLIJKHEID (fase A, headless, met de dekken en de beleidsregels van het meetharnas
   tools/baas-meting/erfprins_meting.js: D's Act 2-aankomst op 85 % HP met de Drempeltafel,
   naïef / bewust / schild / slim, verse seeds ERF-93000..): per vijandbeurt de pil ZOALS JE HEM
   ZIET (de DOM van zijn intent-kolom als je beurt eindigt) tegen wat er echt gebeurt — de klap
   vóór je Blok, Gif, Zwak, zijn Blok, zijn Kracht/Doornen/Gifklieren, de beet van een vloek, de
   Roof, de naroof, zijn eigen klap en de Gifklieren-tik. Elke afwijking verklaard (jij sterft,
   hij sterft, hij staat op) en nooit méér dan de pil. Plus: de DOM-pil is nooit verouderd, elke
   tip noemt het getal van zijn pip, de stempel op de grote kaart is de pip, zijn zet wisselt
   niet binnen jouw beurt (faseLock), het noodrantsoen houdt zijn belofte, na het opstaan of het
   verslikken speelt hij niets meer, elke banner noemt de echte getallen, de buit-beat wijst zijn
   eerste kaart aan. Met fakkel 0, vier statussen, Glazen Zielen, extra vloeken en lange
   gevechten (naroof, uitputting).
   (b) TEKSTCATALOGUS (tekst + catalogus): elke tekst wordt getoond zoals het spel hem nu toont en
   in een gecontroleerd gevecht nagespeeld — de pillen en tips, de banners, de meldingen, de
   stempel en de ondertitel, de Buit-pil, de chips op zijn lijf, de fasetip en de streep, de
   naroof en de uitputting, de aangetaste kaart, het Bestiarium, de fakkeltip, de DEV-sprong, de
   tik-om-over-te-slaan; geen verboden woord in alles wat hij zegt (ook uit de echte gevechten).
   (c) REGIE per formaat — 800x360 en 846x381 (Thomas' toestel, isMobile/hasTouch), 1440x900 en
   1366x768 in 2D en 3D, 412x915 staand als controle (daar gelden alleen de Roof, de buit-beat en
   de Inventaris): B1.1 held en prins elk hun helft; B1.2 de vaste arena en zijn zool op de
   grondlijn; B1.6 de Buit-pil op één regel; W7 zijn breedste pil (fase 3, drie soorten, vijf
   statussen) niet op de held, de chips of de topbalk; B1.3 de Roof met 6, 13 en 22 kaarten en de
   echte trekstapel, ook bij fakkel 0 met vier statussen; W5 de buit-beat; B1.4 de plagiaatkaart
   (fase 2 en 3), ook in het donker; B1.5 de Inventaris; B0.13 zijn échte banners (de langste
   ondertitel uit de gevechten) niet over de figuren; B1.7 het orakel niet samen met een banner.
   (d) BEAT: bewust en 'slaat niet in beurt 1' op dezelfde seeds, gepaard.
   (e) SOLO / FAKKEL / STATUSSEN / 0 PAGINAFOUTEN: in elk deel.
   ============================================================================ */
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
let PNG = null; try { PNG = require('pngjs').PNG; } catch (e) { /* zonder pngjs slaat de helderheid over */ }

const WORKTREE = process.env.SLAYIT_WORKTREE || 'C:\\Users\\Thomas Aelbrecht\\Desktop\\Workspace\\SLAY-IT-erfprins';
const SHOTS = process.env.SLAYIT_SHOTS || null;
const PAR = +(process.env.SLAYIT_PAR || 3);
const WERKERS = +(process.env.SLAYIT_WERKERS || 6);
const SNEL = !!process.env.SLAYIT_SNEL;
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
      pilUit: pillen.filter(p => p.l < -0.5 || p.r > W + 0.5 || p.t < -0.5 || p.b > H + 0.5).length,
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
  /* de vinger per frame volgen, van de eerste gekozen kaart tot die verbrandt (tijdecht, ook onder
     last): landt hij ÓP de kaart, en raakt hij ooit de kop? */
  async function vingerVolg(max) {
    const t0 = performance.now();
    let kEl = null;
    while (!(kEl = document.querySelector('.roof-overlay .roof-kaart.gekozen')) && performance.now() - t0 < (max || 9000)) await new Promise(r => setTimeout(r, 20));
    if (!kEl) return { geen: true };
    let op = false, kop = 0; const t1 = performance.now();
    while (kEl.isConnected && !kEl.classList.contains('verbrandt') && performance.now() - t1 < 2000) {
      const ov = document.querySelector('.roof-overlay'); const vi = ov && ov.querySelector('.vieze-vinger.wijst');
      const v = R(vi), k = R(kEl), kp = R(ov && ov.querySelector('.roof-kop'));
      if (v && k) { const cx = (v.l + v.r) / 2, cy = (v.t + v.b) / 2; if (cx >= k.l && cx <= k.r && cy >= k.t && cy <= k.b) op = true; }
      kop = Math.max(kop, snij(v, kp));
      await new Promise(r => requestAnimationFrame(r));
    }
    return { op, kop };
  }
  /* B0.13: een fasebanner (titel en ondertitel) op zijn silhouet en op dat van de held */
  async function flits() {
    const g = S.gevecht; if (!g) return { geen: true };
    const W = innerWidth, H = innerHeight;
    const b = baasV(); const held = await figuur(g.speler), bf = b ? await figuur(b) : null;
    const fl = alle('.baas-flits h2, .baas-flits span');
    return { n: fl.length, baas: pct(bf, fl), held: pct(held, fl), uit: fl.filter(r => r.l < -0.5 || r.r > W + 0.5 || r.t < -0.5 || r.b > H + 0.5).length,
      titel: (document.querySelector('.baas-flits h2') || {}).textContent || '' };
  }
  window.__EA = { rust, roof, speel, speelRecorder, inv, vingerVolg, flits };
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

/* zijn BREEDSTE pil (jury W7): fase 3, drie kaarten van drie soorten — het Spiegelrecht (Kracht en
   Doornen), een klap met een onblokbaar deel, Blok met Doornen — of met een vloek vooraan (de rest
   valt dan weg maar blijft op de pil staan), en een Buit-pil met 🌑 en het volle ♥+N */
const BREED = metVloek => {
  const g = S.gevecht; const v = g.vijanden.find(x => x.id === 'de_erfprins');
  g.roofGedaan = true; g.roofBeurt = false; v.fase = 3; v.copyKracht = ERF.toeslag[3]; v.plagN = 1; v.plagiaat = false;
  const ids = ['kolenstempel', 'zware_klap', 'bastvel', 'gifflits', 'stoofgeur', 'verdediging', 'verdediging', 'verdediging'].concat(metVloek ? ['laster'] : []);
  v.gestolen = ids.map(id => { const c = nieuweKaart(id); c.up = id !== 'laster'; return erfBuitKaart(c); });
  v.intent = VIJANDEN[v.id].kies(v, v.beurtTeller); renderGevecht();
};

/* ============================================================
   1 · REGIE per formaat: rust (B1.1, B1.2), na de Roof (B1.6, W7), de Roof (B1.3), de buit-beat
   (W5) en de plagiaatkaart (B1.4)
   ============================================================ */
async function regie(browser, fk, BANNERS) {
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
  /* --- W7 met zijn breedste pil (vijf statussen op held en baas) --- */
  const breed = [];
  for (const metVloek of [false, true]) {
    await zetStatus(page, 'vijf'); await zetFakkel(page, 'max');
    await page.evaluate(BREED, metVloek); await slaap(vp.d3 ? 350 : 200);
    if (vp.d3) await page.evaluate(() => { try { kaderFit3D(); } catch (e) { } });
    await slaap(150);
    breed.push(await page.evaluate(() => __EA.rust()));
  }
  await shot(page, `${vp.naam}_breedste_pil`);
  t(breed.every(m => m.pilHeld === 0 && m.pilTop === 0 && m.pilHeldChips === 0 && m.pilUit === 0), `W7 ${vp.naam}: zijn breedste pil ("${breed.map(m => m.pilTekst).join('" / "')}") niet op de held (${breed.map(m => m.pilHeld).join('/')} %), zijn chips (${breed.map(m => m.pilHeldChips).join('/')}) of de topbalk (${breed.map(m => m.pilTop).join('/')}), en binnen beeld (${breed.map(m => m.pilUit).join('/')} pips erbuiten)`);
  t(breed.every(m => m.aegisH != null && m.aegisH <= 34 && m.aegisAfgekapt <= 0 && m.aegisChips === 0), `B1.6 ${vp.naam}: de Buit-pil met 🌑 en het volle ♥+N ("${(breed[1].aegisTekst || '').trim()}") is één regel (${breed.map(m => m.aegisH).join('/')} px), niets afgekapt, niet over zijn chips`);
  if (vp.mobiel) t(w12.gewoon.every(x => x != null) && erger.length === 0, `W12 ${vp.naam}: een aangetaste handkaart verliest niet meer tekst dan de gewone (${w12.ids.map((id, i) => id + ' ' + w12.gewoon[i] + '->' + w12.aangetast[i]).join(', ')} px overloop)`);
  else t(true, `W12 ${vp.naam} (ter info): overloop van de handtekst gewoon -> aangetast: ${w12.ids.map((id, i) => id + ' ' + w12.gewoon[i] + '->' + w12.aangetast[i]).join(', ')} px`);
  fouten(page, t, vp, 'rust en Buit-pil');
  /* --- de Roof (B1.3): echte trekstapel, 6 en 22 kaarten; op Thomas' toestel en 3D ook in het donker --- */
  /* P B1.3: 6, 13 en 22 kaarten en de echte trekstapel; en op ELK formaat ook in het donker (fakkel 0, vier statussen op held en baas) */
  const gevallen = [[0, 'geen', 'max'], [6, 'geen', 'max'], [13, 'geen', 'max'], [22, 'geen', 'max'], [0, 'vier', 0]];
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
    const vin = await page.evaluate(() => __EA.vingerVolg(9000));
    const m = await page.evaluate(() => __EA.roof());
    m.vingerInKaart = vin.op; m.vingerKop = vin.kop;
    const lumRoof = await lum(page, kern(r0.baasSil));
    const zichtR = (lumRust && lumRoof) ? +(lumRoof / Math.max(1, lumRust)).toFixed(2) : null;
    const wat = `de Roof ${N ? N + ' kaarten' : 'echte trekstapel (' + m.kaartenN + ')'}${f !== 'max' ? ', fakkel 0 + vier statussen' : ''}`;
    await shot(page, `${vp.naam}_roof_${N || 'echt'}${f !== 'max' ? '_donker' : ''}`);
    t(m.metPrins && m.waaierBaas === 0 && m.kopBaas === 0, `B1.3 ${vp.naam} ${wat}: waaier en kop naast hem (waaier ${m.waaierBaas} %, kop ${m.kopBaas} % van zijn silhouet; tegels ${m.fit})`);
    t(m.tegelsUit === 0 && m.scrollOv <= 0, `B1.3 ${vp.naam} ${wat}: elke tegel in beeld (${m.tegelsUit} erbuiten), geen scroll (${m.scrollOv})`);
    t(zichtR == null || zichtR >= 0.9, `B1.3 ${vp.naam} ${wat}: hij staat in het gat, zijn lijf ${zichtR}x zo helder als in rust (>= 0,9)`);
    t(m.vingerInKaart === true && m.vingerKop === 0 && m.hintWaaier === 0, `B1.3 ${vp.naam} ${wat}: de vinger ÓP de gekozen kaart (${m.vingerInKaart}), niet op de kop (${m.vingerKop} px2), de tik-hint niet op de waaier (${m.hintWaaier})`);
    await page.evaluate(async () => { try { await window.__roof; } catch (e) { } });
    if (N !== 0) continue;
    const dk = f !== 'max' ? ' (fakkel 0, vier statussen)' : '';
    await slaap(500);
    /* --- de buit-beat (W5) --- */
    const it = await page.evaluate(() => { const v = S.gevecht.vijanden[0]; return v.intent && v.intent.type; });
    await page.evaluate(() => { const v = S.gevecht.vijanden[0]; if (v.intent && v.intent.doe) window.__buit = v.intent.doe(v); });
    await wacht(page, () => !!document.querySelector('.roof-overlay.buit-overlay.open'), 4000);
    /* de vinger tikt zijn eerste kaart aan (na 420 ms + 320 ms transitie; onder last later): wacht
       tot hij staat (of tot de beat bijna om is, 2,1 s), dan meten */
    const t0b = Date.now(); let bu = null;
    while (Date.now() - t0b < 2100) { bu = await page.evaluate(() => __EA.roof()); if (bu.vingerInKaart && Date.now() - t0b >= 800) break; await slaap(80); }
    const lumBuit = await lum(page, kern(r0.baasSil));
    const zichtB = (lumRust && lumBuit) ? +(lumBuit / Math.max(1, lumRust)).toFixed(2) : null;
    await shot(page, `${vp.naam}_buit${dk ? '_donker' : ''}`);
    t(it === 'buit', `W5 ${vp.naam}${dk}: na de Roof bekijkt hij eerst zijn buit (zet "${it}")`);
    t(bu.metPrins && bu.waaierBaas === 0 && bu.kopBaas === 0 && bu.tegelsUit === 0 && bu.scrollOv <= 0, `W5 ${vp.naam}${dk} buit-beat (${bu.kaartenN} kaarten, ${bu.fit}): waaier ${bu.waaierBaas} % en kop ${bu.kopBaas} % op zijn silhouet, ${bu.tegelsUit} tegels buiten beeld, scroll ${bu.scrollOv}`);
    t((zichtB == null || zichtB >= 0.9) && bu.vingerInKaart === true, `W5 ${vp.naam}${dk} buit-beat: hij in het gat (${zichtB}x), de vinger op zijn eerste kaart (${bu.vingerInKaart})`);
    await page.evaluate(async () => { try { await window.__buit; } catch (e) { } });
    await slaap(300);
    /* --- de plagiaatkaart (B1.4): fase 2 (1 kaart) en fase 3 (2 kaarten) --- */
    /* fase 2 (1 kaart) en fase 3 (3 kaarten) uit zijn echte buit, plus de LANGSTE stempels: Zware Klap+ en Kolenstempel+
       in fase 3 ("KOPIE · Junior — 10+16🩸", "… — 💪+1 🌵+1"), zodat de breedte niet van de worp afhangt */
    for (const [fase, lang] of [[2, false], [3, false], [3, true]]) {
      await page.evaluate(([fase, lang]) => { const g = S.gevecht; const v = g.vijanden[0]; g.roofBeurt = false; S.maxHp = Math.max(S.maxHp, 400); S.hp = S.maxHp; /* drie klappen na elkaar (in het donker, Kwetsbaar): de held mag niet sterven */ v.gestolen = (v.gestolen || []).filter(s => s.soort !== 'vloek'); v.fase = fase; v.copyKracht = ERF.toeslag[fase]; v.hp = Math.max(v.hp, 60); if (fase === 3) v.plagN = 1;
        if (lang) { v.plagN = 0; v.gestolen = ['zware_klap', 'kolenstempel'].map(id => { const c = nieuweKaart(id); c.up = true; return erfBuitKaart(c); }).concat(v.gestolen); }
        v.intent = VIJANDEN[v.id].kies(v, v.beurtTeller); renderGevecht(); }, [fase, lang]);
      await slaap(250);
      await page.evaluate(() => { __EA.speelRecorder(); const v = S.gevecht.vijanden[0]; S.gevecht.vijandAanZet = true; if (v.intent && v.intent.doe) window.__zet = v.intent.doe(v); });
      await wacht(page, () => (window.__speelMetingen || []).length > 0, 5000);
      await shot(page, `${vp.naam}_plagiaat_f${fase}${lang ? '_lang' : ''}${dk ? '_donker' : ''}`);
      await page.evaluate(async () => { try { await window.__zet; } catch (e) { } S.gevecht.vijandAanZet = false; });
      const ms = await page.evaluate(() => window.__speelMetingen || []);
      const min = laptop ? 0.72 : (vp.staand ? 0.6 : 0.92);
      const fz = `fase ${fase}${lang ? ' (de langste stempels)' : ''}`;
      t(ms.length >= 1, `B1.4 ${vp.naam}${dk} ${fz}: ${ms.length} grote kaart(en) gemeten`);
      if (!vp.staand) t(ms.every(m => m.kaartBaas <= 2), `B1.4 ${vp.naam}${dk} ${fz}: de kaart naast hem (${ms.map(m => m.kaartBaas).join('/')} % van zijn silhouet, <= 2)`);
      t(ms.every(m => m.kopBinnen && m.kopBB === 0 && m.kopTop === 0 && m.kopPil === 0), `B1.4 ${vp.naam}${dk} ${fz}: de kop in beeld (${ms.map(m => m.kopBinnen).join('/')}), niet over de bazenbalk (${ms.map(m => m.kopBB).join('/')}), de topbalk (${ms.map(m => m.kopTop).join('/')}) of zijn pil (${ms.map(m => m.kopPil).join('/')})`);
      t(ms.every(m => m.schaal >= min - 0.001 && m.stempelInKaart && m.stempelBinnen), `B1.4 ${vp.naam}${dk} ${fz}: schaal ${ms.map(m => m.schaal).join('/')} (>= ${min}), de stempel op de kaart ("${ms.map(m => m.stempelTekst).join('" / "')}")`);
      await slaap(300);
    }
  }
  fouten(page, t, vp, 'Roof, buit-beat en plagiaatkaart');
  /* --- B0.13 met zijn ECHTE banners: de langste ondertitel per titel uit de gevechten (anders de tekst uit de code) --- */
  if (!vp.staand) {
    await startErf(page);
    const std = await page.evaluate(() => { const u = UITSPRAKEN._erfprins; return {
      'WOEDE': u.woede, 'DE ROOF': '🎭 22 van je 44 kaarten — allemaal uit je trekstapel — nu MÍJN werk. Je beurt is om.',
      'HET IS ALLEMAAL VAN MIJ': `${u.fase3} · vanaf zijn volgende zet ${erfPerBeurt(3)} kaarten per beurt, harder`,
      'HET NOODRANTSOEN': `🗞️ Hij verscheurt ${ERF.rantsoenMax} van je kaarten en staat op met ${Math.min(ERF.hp, ERF.rantsoenMax * ERF.rantsoenPerKaart)} HP.`,
      'NAROOF': '🎭 „Nog niet leeg?” — hij grist nóg 12 kaarten uit je trekstapel.', 'TWEE TEGELIJK': '„Twee tegelijk. Allebei van JOU.”', 'DRIE TEGELIJK': '„Drie tegelijk. Alle drie van JOU.”' }; });
    const lijstB = Object.keys(std).map(k => [k, (BANNERS && BANNERS[k]) || std[k]]);
    const uitB = [];
    for (const [titel, sub] of lijstB) {
      await page.evaluate(([a, b]) => baasFaseMoment(a, b), [titel, sub]);
      await page.waitForFunction(ti => [...document.querySelectorAll('.baas-flits')].some(e => +getComputedStyle(e).opacity > 0.9 && (e.querySelector('h2') || {}).textContent === ti), titel, { timeout: 2500, polling: 50 }).catch(() => { });
      await slaap(150);
      const b = await page.evaluate(() => __EA.flits());
      uitB.push([titel, sub, b]);
      if (titel === 'HET IS ALLEMAAL VAN MIJ') await shot(page, `${vp.naam}_banner_fase3`);
      await wachtRust(page, 0, 6000);
    }
    t(uitB.every(([ti, s, b]) => b.n > 0 && b.titel === ti && b.baas <= 2 && b.held <= 2 && b.uit === 0), `B0.13 ${vp.naam}: zijn ${uitB.length} echte banners dekken de figuren niet (baas / held in %): ${uitB.map(([ti, s, b]) => `${ti} ${b.baas}/${b.held}${b.uit ? ' BUITEN BEELD' : ''}${b.titel !== ti ? ' NIET GEZIEN' : ''}`).join(' · ')} (<= 2)`);
    fouten(page, t, vp, 'banners');
  }
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
   3 · DE STRENGE EERLIJKHEIDSCONTROLE (bazen_plan §5 ent 6, jury_bouw E5, jury_speler §5.2): echte
   gevechten, headless, met de dekken en de beleidsregels van het meetharnas
   (tools/baas-meting/erfprins_meting.js: D's Act 2-aankomst op 85 % HP + de Drempeltafel, naïef /
   bewust / schild / slim / nietslaan). Per vijandbeurt leest de suite de pil ZOALS DE SPELER HEM
   ZIET (de DOM van zijn intent-kolom op het moment dat je beurt eindigt) en zet ze de getallen
   van elke pip tegen wat er in zijn beurt echt gebeurt: de klap vóór je Blok (per treffer
   glasDmg van het blokbare en het onblokbare deel), het Gif, de Zwak op jou, zijn Blok, zijn
   Kracht/Doornen/Gifklieren (het Spiegelrecht), de beet van een vloek, de Roof, de naroof, zijn
   eigen klap en de tik van zijn Gifklieren. Elke afwijking moet verklaard zijn — jij sterft, hij
   sterft of hij staat op (opstaan ís zijn zet) — en ook dan mag er nooit méér landen dan de pil
   zei. Daarnaast: de DOM-pil is nooit verouderd (== intentTekst), elke tip noemt het getal van
   zijn pip, de stempel op de grote kaart is de pip, zijn zet wisselt niet binnen jouw beurt
   (faseLock), ♥+N == zijn HP bij het opstaan en hij verscheurt nooit een kaart van zijn pil, na
   het opstaan of het verslikken speelt hij niets meer, elke banner noemt de echte getallen.
   Met fakkel 0 (gedoofd: +1 Kracht op hem), vier statussen op held én baas, Glazen Zielen, extra
   vloeken en lange gevechten (naroof, uitputting). Solo, 0 paginafouten.
   ============================================================ */
function installeerEerlijk() {
  if (window.__EEgeinstalleerd) return;
  window.__EEgeinstalleerd = true;
  window.__EEnieuw = () => ({
    gevechten: 0, beurten: 0, ok: 0, verklaard: {}, afw: [], domFout: [], pilTekstFout: [], wissels: [], soorten: {}, pips: {},
    stempelN: 0, stempelFout: [], nr: 0, nrZijn: 0, nrJouw: 0, nrFout: [], naOpstaan: [], naStik: [], roof: 0, roofVia: { klap: 0, eindBeurt: 0 },
    roofFout: [], naroof: 0, buitBeat: 0, buitEersteFout: [], bannerN: {}, bannerFout: [], bannerLangst: {}, teksten: [], fase3: 0, faseLock: 0,
    optieFout: [], fakkel0: 0, glas: 0, status4: 0, klierTik: 0, vervalt: 0
  });
  window.__EE = window.__EEnieuw();
  const E = () => window.__EE;
  const opt = () => window.__erfOpties || {};
  const waar = () => `${opt().cel || '?'} beurt ${(S.gevecht && S.gevecht.beurt) || 0}`;
  const kort = (a, x) => { if (a.length < 40) a.push(x); };
  let M = null, inPlag = false, inDS = 0, sig0 = null, it0 = null, _roof = null, _deRoofVia = null, _naroof = null, _nrLaatst = null;
  const baas = () => { const g = S.gevecht; return g ? g.vijanden.find(v => v.id === 'de_erfprins') : null; };
  const isBaas = x => !!x && x.id === 'de_erfprins';
  const intentEl = v => { const g = S.gevecht; if (!g || !GDOM.vijanden) return null; const d = GDOM.vijanden[g.vijanden.indexOf(v)]; return d ? d.intent : null; };
  const sig = it => it ? it.type + ':' + (it.plan || []).map(k => [k.uid, k.soort, k.eindDmg || 0, k.eindGif || 0, k.eindBlok || 0, k.bf || 0].join('/')).join(',') : '-';
  const noteer = s => {
    if (s == null || !S.gevecht || !baas()) return;
    s = String(s).trim();
    if (!s || !/[A-Za-zÀ-ÿ]/.test(s)) return;
    const e = E(); if (e.teksten.length < 400 && !e.teksten.includes(s)) e.teksten.push(s);
  };
  /* na het opstaan (in zijn beurt) of het verslikken in een vloek speelt hij geen kaart meer */
  const tag = () => {
    if (!M) return;
    if (M.opKaart != null && M.kaart > M.opKaart) kort(E().naOpstaan, waar());
    if (M.stikKaart != null && M.kaart > M.stikKaart) kort(E().naStik, waar());
  };

  /* ---- opties per gevecht: fakkel 0, Glazen Zielen, een taai gevecht; vier statussen op held en baas ---- */
  const zetVier = () => {
    const g = S.gevecht, b = baas(); if (!g || !b || b.dood || !opt().status4) return;
    const s = g.speler.status, t = b.status;
    s.zwak = Math.max(s.zwak || 0, 1); s.kwetsbaar = Math.max(s.kwetsbaar || 0, 1); s.gif = Math.max(s.gif || 0, 1); s.doornen = Math.max(s.doornen || 0, 1);
    t.zwak = Math.max(t.zwak || 0, 1); t.kwetsbaar = Math.max(t.kwetsbaar || 0, 1); t.gif = Math.max(t.gif || 0, 2); t.doornen = Math.max(t.doornen || 0, 1);
    renderGevecht();
  };
  const noteerStart = () => { const b = baas(); sig0 = b ? sig(b.intent) : null; it0 = b && b.intent ? b.intent.type : null; };
  const oStart = window.startGevecht;
  window.startGevecht = function () {
    const o = opt();
    if (o.fakkel0) S.fakkel = 0;
    if (o.glas) { S.daily = true; S.dagwet = 'glas'; }
    if (o.taai) { S.maxHp = 500; S.hp = 500; }
    M = null; inPlag = false; inDS = 0; _roof = null; _deRoofVia = null; _naroof = null; _nrLaatst = null;
    const r = oStart.apply(this, arguments);
    const g = S.gevecht;
    if (g && baas()) {
      const e = E(); e.gevechten++;
      if (o.fakkel0) { e.fakkel0++; if (!g.gedoofd) kort(e.optieFout, waar() + ': fakkel 0 maar het gevecht is niet gedoofd'); }
      if (o.glas) { e.glas++; if (glasDmg(10) !== 15) kort(e.optieFout, waar() + ': Glazen Zielen staat niet aan'); }
      if (o.status4) e.status4++;
      zetVier(); noteerStart();
    }
    return r;
  };
  const oBSB = window.beginSpelerBeurt;
  window.beginSpelerBeurt = function () { const r = oBSB.apply(this, arguments); zetVier(); noteerStart(); return r; };

  /* ---- de pil zoals de speler hem ziet: elke pip, met zijn tip ---- */
  function leesPil(el, b) {
    const V = { type: b.intent ? b.intent.type : null, klap: 0, gif: 0, zwak: 0, blok: 0, doornen: 0, kracht: 0, klieren: 0, bf: 0, eigen: 0, roof: 0, naroof: 0,
      klierTik: (b.status.gifklieren || 0), stempels: [], subs: [], fout: [], pips: [] };
    const spans = el ? [...el.querySelectorAll('.intent')] : [];
    const e = E();
    const pip = s => { e.pips[s] = (e.pips[s] || 0) + 1; V.pips.push(s); };
    for (const sp of spans) {
      const t = sp.textContent.trim(), tip = sp.dataset.tip || '', cls = sp.className;
      let m;
      if (/intent-vervalt/.test(cls)) {
        pip('vervalt');
        if (!/^Valt deze beurt weg — hij verslikt zich eerst in je vloek/.test(tip)) V.fout.push('vervalt-tip "' + tip.slice(0, 80) + '"');
        continue;
      }
      if (V.type === 'roof') {
        m = tip.match(/pakt hij (?:de helft van je dek: )?(\d+) kaart(?:en)?\b/);
        if (m) V.roof = +m[1]; else if (!/te mager om te plunderen/.test(tip)) V.fout.push('roof-tip "' + tip.slice(0, 80) + '"');
        continue;
      }
      if (V.type === 'steel') {
        m = tip.match(/grist (\d+) kaart(?:en)? uit je trekstapel/);
        if (m) V.naroof = +m[1]; else V.fout.push('naroof-tip "' + tip.slice(0, 80) + '"');
        continue;
      }
      if (V.type === 'buit' || V.type === 'opstaan') continue;
      if (V.type === 'aanval') {
        m = t.match(/^⚔️ (\d+)(?:×(\d+))?$/);
        if (!m) { V.fout.push('aanval-pil "' + t + '"'); continue; }
        V.eigen = +m[1] * (+m[2] || 1);
        if (!tip.includes('valt jou aan voor ' + m[1])) V.fout.push('aanval-tip "' + tip.slice(0, 80) + '"');
        continue;
      }
      if (V.type !== 'plagiaat') { V.fout.push('onbekende zet ' + V.type + ' "' + t + '"'); continue; }
      if ((m = t.match(/^(🎭|💢) (\d+)(?:\+(\d+)🩸)?(?:×(\d+))?$/)) && /intent-aanval/.test(cls)) {
        const bl = +m[2], door = +m[3] || 0, T = +m[4] || 1, tot = (bl + door) * T, drift = m[1] === '💢';
        pip(drift ? 'drift' : 'klap');
        V.klap += tot;
        if (!tip.includes((drift ? 'driftbui voor ' : 'voor ') + tot + ' schade')) V.fout.push(`klap-tip "${tip.slice(0, 90)}" (pip ${t} = ${tot})`);
        if (door && !tip.includes(`waarvan ${door * T} dwars door je Blok`)) V.fout.push(`door-tip "${tip.slice(0, 90)}" (pip ${t})`);
        V.stempels.push(drift ? t : t.replace(/^🎭 /, ''));
        V.subs.push((drift ? 'Driftbui: ' : '') + tot + ' schade op jou');
      } else if ((m = t.match(/^🧪 (\d+)$/))) {
        pip('gif'); V.gif += +m[1];
        if (!tip.includes(`: ${m[1]} Gif op jou`)) V.fout.push('gif-tip "' + tip.slice(0, 80) + '"');
        V.stempels.push(t); V.subs.push(`${m[1]} Gif op JOU`);
      } else if ((m = t.match(/^🛡️ (\d+)(?: 🌵(\d+))?$/))) {
        pip('blok'); V.blok += +m[1]; V.doornen += +m[2] || 0;
        if (!tip.includes(`hij krijgt ${m[1]} Blok`) || (m[2] && !tip.includes(`en ${m[2]} Doornen`))) V.fout.push('blok-tip "' + tip.slice(0, 80) + '"');
        V.stempels.push(t); V.subs.push(`${m[1]} Blok voor hém`);
      } else if ((m = t.match(/^🥀 (\d+)$/))) {
        pip('zwak'); V.zwak += +m[1];
        if (!tip.includes(`: ${m[1]} Zwak op jou`)) V.fout.push('zwak-tip "' + tip.slice(0, 80) + '"');
        V.stempels.push(t); V.subs.push(`${m[1]} Zwak op JOU`);
      } else if ((m = t.match(/^🌑 −(\d+)$/))) {
        pip('vloek'); V.bf += +m[1];
        if (!tip.includes(`bijt hém voor ${m[1]} en hij verslikt zich`)) V.fout.push('vloek-tip "' + tip.slice(0, 80) + '"');
      } else if (/intent-buff/.test(cls) && (m = t.match(/^🎭 (?:💪\+(\d+))? ?(?:🌵\+(\d+))? ?(?:🧫\+(\d+))?$/)) && (m[1] || m[2] || m[3])) {
        pip('spiegel');
        const kr = +m[1] || 0, dr = +m[2] || 0, kl = +m[3] || 0;
        V.kracht += kr; V.doornen += dr; V.klieren += kl;
        if ((kr && !tip.includes(`+${kr} Kracht voor hém`)) || (dr && !tip.includes(`+${dr} Doornen voor hém`)) || (kl && !tip.includes(`jij krijgt ${kl} Gif aan het begin van elke beurt van hem`))) V.fout.push('spiegel-tip "' + tip.slice(0, 90) + '"');
        V.stempels.push(t.replace(/^🎭 /, '')); V.subs.push('nu de zijne');
      } else if (/^🎭 /.test(t) && /intent-debuff/.test(cls)) {
        pip('niks');
        if (!/geen effect/.test(tip)) V.fout.push('niks-tip "' + tip.slice(0, 80) + '"');
        V.stempels.push('niks'); V.subs.push('geen effect');
      } else if (t === '🎭' && /buit is leeg/.test(tip)) {
        pip('leeg');
      } else V.fout.push('onbekende pip "' + t + '" (' + cls + ')');
    }
    return V;
  }

  /* ---- DE KERN: elke vijandbeurt, van het einde van jouw beurt tot jij weer aan zet bent ---- */
  const VELDEN = ['klap', 'gif', 'zwak', 'blok', 'doornen', 'kracht', 'klieren', 'bf', 'eigen', 'roof', 'naroof', 'klierTik'];
  const kies = (o) => VELDEN.filter(k => o[k]).map(k => k + ' ' + o[k]).join(', ') || 'niets';
  const oEB = window.eindBeurt;
  window.eindBeurt = async function () {
    const g = S.gevecht, b = baas();
    if (!g || g.bezig || g.voorbij || g.ceremonie || !b || b.dood) return oEB.apply(this, arguments);
    const e = E();
    const el = intentEl(b);
    const tmp = document.createElement('div'); tmp.innerHTML = intentTekst(b);
    if (!el || el.innerHTML !== tmp.innerHTML) kort(e.domFout, `${waar()}: DOM "${el ? el.textContent.trim() : '-'}" ≠ intentTekst "${tmp.textContent.trim()}"`);
    if (sig0 != null && it0 !== 'roof' && sig(b.intent) !== sig0) kort(e.wissels, `${waar()}: ${sig0} -> ${sig(b.intent)}`);
    const V = leesPil(el, b);
    e.soorten[V.type] = (e.soorten[V.type] || 0) + 1;
    V.fout.forEach(f => kort(e.pilTekstFout, waar() + ': ' + f));
    M = { klap: 0, gif: 0, zwak: 0, blok: 0, doornen: 0, kracht: 0, klieren: 0, bf: 0, eigen: 0, roof: 0, naroof: 0, klierTik: 0,
      kaart: 0, opKaart: null, stikKaart: null, stempels: [], subs: [], buitBeat: 0, buitEerste: null };
    const beurt0 = g.beurt;
    try { return await oEB.apply(this, arguments); }
    finally {
      const m = M; M = null;
      if (g.beurt !== beurt0 || g.voorbij) {
        e.beurten++;
        e.klierTik += m.klierTik;
        const verschil = VELDEN.filter(k => (V[k] || 0) !== (m[k] || 0));
        const meer = VELDEN.filter(k => (m[k] || 0) > (V[k] || 0));
        const stOk = m.stempels.length <= V.stempels.length && m.stempels.every((s, i) => s === 'KOPIE · Junior — ' + V.stempels[i]);
        const subOk = m.subs.every((s, i) => s.includes(V.subs[i] || '§'));
        e.stempelN += m.stempels.length;
        if (!stOk || !subOk) kort(e.stempelFout, `${waar()}: pil [${V.stempels.join(' | ')}] / stempel [${m.stempels.join(' | ')}]${subOk ? '' : ' / sub [' + m.subs.join(' | ') + ']'}`);
        /* de buit-beat: "Zijn eerste kaart staat daarna op de pil" */
        if (V.type === 'buit' && m.buitEerste != null && !b.dood && g === S.gevecht && !g.voorbij) {
          const eerste = b.intent && b.intent.type === 'plagiaat' && b.intent.plan[0];
          if (!eerste || eerste.uid !== m.buitEerste) kort(e.buitEersteFout, `${waar()}: de buit-beat wees ${m.buitEerste} aan, zijn pil begint met ${eerste ? eerste.uid : '-'}`);
        }
        if (!verschil.length && m.stempels.length === V.stempels.length && stOk && subOk) e.ok++;
        else {
          const jijDood = S.hp <= 0 || !!g._verloren, hijDood = !!b.dood || !!g._gewonnen, op = m.opKaart != null;
          const reden = jijDood ? 'jij sterft in zijn beurt' : (hijDood ? 'hij sterft in zijn beurt' : (op ? 'hij staat op (opstaan is zijn zet)' : null));
          if (reden && !meer.length && stOk) e.verklaard[reden] = (e.verklaard[reden] || 0) + 1;
          else kort(e.afw, `${waar()}: ${V.type} — pil {${kies(V)}} · landde {${kies(m)}}${reden ? ' (' + reden + ', maar méér dan de pil: ' + meer.join(', ') + ')' : ''}`);
        }
      }
    }
  };

  /* ---- wat er in zijn beurt echt gebeurt ---- */
  const oSpeel = window.copycatSpeelTerug;
  window.copycatSpeelTerug = async function () { const o = inPlag; inPlag = true; try { return await oSpeel.apply(this, arguments); } finally { inPlag = o; } };
  const oDS = window.doeSchade;
  window.doeSchade = function (doel, dmg, bron) {
    if (M && doel && doel.isSpeler && isBaas(bron)) { const n = glasDmg(Math.max(0, dmg)); if (inPlag) { M.klap += n; tag(); } else M.eigen += n; }
    inDS++;
    try { return oDS.apply(this, arguments); } finally { inDS--; }
  };
  const oVH = window.verliesHp;
  window.verliesHp = function (doel, n, bron) {
    const g = S.gevecht;
    if (M && n > 0) {
      if (doel && doel.isSpeler && isBaas(bron) && !inDS) { if (inPlag) { M.klap += n; tag(); } else M.eigen += n; }
      if (isBaas(doel) && g && g._vloekGreep) { M.kaart++; tag(); M.bf += n; M.stikKaart = M.kaart; }
    }
    return oVH.apply(this, arguments);
  };
  const oGG = window.geefGif;
  window.geefGif = function (actor, n) {
    const g = S.gevecht;
    if (M && actor && actor.isSpeler && g && g.vijandAanZet && n > 0) { if (inPlag) { M.gif += n; tag(); } else M.klierTik += n; }
    return oGG.apply(this, arguments);
  };
  const oGS = window.geefStatus;
  window.geefStatus = function (actor, naam, n) {
    if (M && inPlag && n > 0) {
      if (actor && actor.isSpeler && naam === 'zwak') { M.zwak += n; tag(); }
      else if (isBaas(actor) && naam === 'kracht') { M.kracht += n; tag(); }
      else if (isBaas(actor) && naam === 'doornen') { M.doornen += n; tag(); }
      else if (isBaas(actor) && naam === 'gifklieren') { M.klieren += n; tag(); }
    }
    return oGS.apply(this, arguments);
  };
  const oBl = window.geefBlok;
  window.geefBlok = function (actor, n) { if (M && inPlag && isBaas(actor) && n > 0) { M.blok += n; tag(); } return oBl.apply(this, arguments); };
  const oToon = window.copycatToonGespeeld;
  window.copycatToonGespeeld = async function () {
    if (M) { M.kaart++; tag(); }
    const wrap = await oToon.apply(this, arguments);
    if (M && wrap && wrap.querySelector) {
      const st = wrap.querySelector('.rs-stempel'), sub = wrap.querySelector('.rs-sub');
      M.stempels.push(st ? st.textContent.trim() : '?'); M.subs.push(sub ? sub.textContent.trim() : '');
    }
    return wrap;
  };

  /* ---- de Roof: de pil (ROOF, N kaarten) tegen wat de vinger echt pakt, en waar vandaan ---- */
  const oDeRoof = window.copycatDeRoof;
  window.copycatDeRoof = async function (g, via) { _deRoofVia = !!via; try { return await oDeRoof.apply(this, arguments); } finally { _deRoofVia = null; } };
  const oCut = window.copycatRoofCutscene;
  window.copycatRoofCutscene = async function (g, v, wil, via) {
    const el = intentEl(v); const pil = el ? el.querySelector('.intent-roof') : null;
    const tip = pil ? (pil.dataset.tip || '') : '';
    const m = tip.match(/pakt hij (?:de helft van je dek: )?(\d+) kaart(?:en)?\b/);
    const beloofd = m ? +m[1] : (/te mager om te plunderen/.test(tip) ? 0 : null);
    const trekU = (g.trek || []).map(c => c.uid), andersU = g.hand.concat(g.afleg, g.uitgeput || []).map(c => c.uid);
    _roof = { voor: (v.gestolen || []).length, via: !!via };
    const r = await oCut.apply(this, arguments);
    const nieuw = (v.gestolen || []).slice(_roof.voor);
    const e = E(); e.roof++; e.roofVia[via ? 'eindBeurt' : 'klap']++;
    const fout = [];
    if (beloofd == null) fout.push('geen ROOF-pil in beeld ("' + (el ? el.textContent.trim() : '-') + '")');
    else if (nieuw.length !== beloofd) fout.push(`pil ${beloofd} kaarten, geroofd ${nieuw.length}`);
    if (!nieuw.every(s => trekU.includes(s.uid))) fout.push('niet alles uit je trekstapel');
    if (nieuw.some(s => andersU.includes(s.uid))) fout.push('uit je hand of aflegstapel');
    if ((g.trek || []).length < Math.min(ERF.roofRest, trekU.length)) fout.push('minder dan ' + ERF.roofRest + ' kaarten over in je trekstapel');
    if (fout.length) kort(e.roofFout, `${waar()} (${via ? 'einde beurt' : 'je klap'}): ${fout.join('; ')}`);
    if (M) M.roof += nieuw.length;
    return r;
  };
  const oHer = window.copycatHerroof;
  window.copycatHerroof = function (v, g) {
    _naroof = { voor: (v.gestolen || []).length };
    const r = oHer.apply(this, arguments);
    if (M) M.naroof += (v.gestolen || []).length - _naroof.voor;
    E().naroof++;
    return r;
  };
  const oBuit = window.copycatBekijktBuit;
  window.copycatBekijktBuit = async function (v, g) {
    const eerste = (v.gestolen || []).length ? copycatPlagiaatPlan(v, 1)[0] : null;
    const r = await oBuit.apply(this, arguments);
    if (M) { M.buitBeat++; M.buitEerste = eerste ? eerste.uid : null; }
    E().buitBeat++;
    return r;
  };

  /* ---- het noodrantsoen: de belofte ---- */
  const oNR = window.copycatNoodrantsoenVuurt;
  window.copycatNoodrantsoenVuurt = function (doel) {
    const g = S.gevecht;
    const voor = copycatNoodrantsoen(doel);
    const aeg = document.querySelector('#baas-balk .bb-aegis');
    const hart = aeg ? (aeg.textContent.match(/♥\+(\d+)/) || [])[1] : undefined;
    const it = doel.intent; const plan = new Set(((it && it.type === 'plagiaat' && it.plan) || []).map(k => k.uid));
    const st0 = Object.assign({}, doel.status), s0 = sig(it), buitVoor = (doel.gestolen || []).slice();
    const r = oNR.apply(this, arguments);
    if (r) {
      const e = E(); e.nr++;
      const fout = [];
      if (doel.hp !== voor.hp) fout.push(`staat op met ${doel.hp} HP, ♥+${voor.hp} beloofd`);
      if (hart == null) fout.push('geen ♥+N op de Buit-pil');
      else if (+hart !== voor.hp) fout.push(`de Buit-pil toonde ♥+${hart}, hij kreeg ${voor.hp}`);
      const rest = new Set((doel.gestolen || []).map(s => s.uid));
      const weg = buitVoor.filter(s => !rest.has(s.uid));
      if (weg.some(s => plan.has(s.uid))) fout.push('verscheurde een kaart van zijn pil');
      if (weg.some(s => s.soort === 'vloek')) fout.push('verscheurde een vloek (vloeken tellen niet)');
      if (weg.length !== voor.kaarten) fout.push(`verscheurde ${weg.length}, beloofd ${voor.kaarten}`);
      for (const st of ['gif', 'zwak', 'kwetsbaar']) if (ERF.rantsoenWist ? (doel.status[st] || 0) > 0 : (doel.status[st] || 0) !== (st0[st] || 0)) fout.push(`${st} ${st0[st] || 0} -> ${doel.status[st] || 0}`);
      for (const st of ['kracht', 'doornen', 'gifklieren']) if ((doel.status[st] || 0) !== (st0[st] || 0)) fout.push(`zijn ${st} ${st0[st] || 0} -> ${doel.status[st] || 0}`);
      if (g && g.vijandAanZet) {
        e.nrZijn++;
        if (!doel.intent || doel.intent.type !== 'opstaan') fout.push('opstaan in zijn beurt is niet zijn zet');
        if (M) M.opKaart = M.kaart;
      } else {
        e.nrJouw++;
        if (sig(doel.intent) !== s0) fout.push('zijn zet wisselde bij het opstaan in jouw beurt');
      }
      _nrLaatst = { k: weg.length, hp: doel.hp };
      if (fout.length) kort(e.nrFout, `${waar()}: ${fout.join('; ')}`);
    }
    return r;
  };
  const oFase = window.checkCopycatFase;
  window.checkCopycatFase = function (b, g) {
    const voor = b.fase || 1, s = sig(b.intent);
    const r = oFase.apply(this, arguments);
    if ((b.fase || 1) === 3 && voor < 3) {
      const e = E(); e.fase3++;
      if (!(g && g.vijandAanZet) && b.intent && b.intent.type === 'plagiaat') { e.faseLock++; if (sig(b.intent) !== s) kort(e.wissels, waar() + ': fase 3 veranderde de zet op zijn pil'); }
    }
    return r;
  };

  /* ---- teksten: elke banner noemt de echte getallen; alles wat hij zegt, wordt verzameld ---- */
  const oB = window.baasFaseMoment;
  window.baasFaseMoment = function (titel, sub) {
    noteer(titel); noteer(sub);
    const b = baas();
    if (b) {
      const e = E(); e.bannerN[titel] = (e.bannerN[titel] || 0) + 1;
      if (!e.bannerLangst[titel] || String(sub).length > e.bannerLangst[titel].length) e.bannerLangst[titel] = String(sub);
      const f = x => kort(e.bannerFout, `${waar()} ${titel}: ${x} ("${String(sub).slice(0, 100)}")`);
      let m;
      if (titel === 'DE ROOF' && _roof) {
        if ((m = String(sub).match(/🎭 (\d+) van je (\d+) kaarten/))) {
          const n = (b.gestolen || []).length - _roof.voor;
          if (+m[1] !== n) f(`noemt ${m[1]} kaarten, geroofd ${n}`);
          if (+m[2] !== S.dek.length) f(`noemt een dek van ${m[2]}, je dek telt ${S.dek.length}`);
          if (/Je beurt is om/.test(sub) === _roof.via) f('"Je beurt is om." klopt niet met hoe de Roof viel');
          if (!/allemaal uit je trekstapel/.test(sub)) f('zegt niet "allemaal uit je trekstapel"');
        } else if (!/Te mager/.test(sub)) f('onbekende ondertitel');
      }
      if (titel === 'WOEDE' && _deRoofVia != null && /SLÁÁT/.test(sub) === _deRoofVia) f(_deRoofVia ? 'zegt "je SLÁÁT me" terwijl je niet sloeg' : 'de klap-regel ontbreekt terwijl je sloeg');
      if (titel === 'NAROOF' && _naroof) { m = String(sub).match(/grist nóg (\d+) kaart/); const n = (b.gestolen || []).length - _naroof.voor; if (!m || +m[1] !== n) f(`noemt ${m ? m[1] : '?'}, grist ${n}`); }
      if (titel === 'HET NOODRANTSOEN' && _nrLaatst) { m = String(sub).match(/verscheurt (\d+) van je kaarten en staat op met (\d+) HP/); if (!m || +m[1] !== _nrLaatst.k || +m[2] !== _nrLaatst.hp) f(`verwacht ${_nrLaatst.k} kaarten en ${_nrLaatst.hp} HP`); }
      if (/TEGELIJK$/.test(titel) && M) { const n = M.kaart; const w = { 2: 'TWEE TEGELIJK', 3: 'DRIE TEGELIJK' }[n] || (n + ' TEGELIJK'); if (titel !== w) f(`hij speelde ${n} kaarten`); }
      if (titel === 'HET IS ALLEMAAL VAN MIJ') {
        if (!String(sub).includes(`vanaf zijn volgende zet ${erfPerBeurt(3)} kaarten per beurt`)) f('noemt niet wat ERF.plan[3] zegt');
        if (!(b.hp <= b.maxHp * ERF.fase3Hp)) f('fase 3 boven de streep');
      }
    }
    return oB.apply(this, arguments);
  };
  const oMel = window.melding; window.melding = function (x) { noteer(x); return oMel.apply(this, arguments); };
  const oSpr = window.baasSpreekt; window.baasSpreekt = function (x) { noteer(x); return oSpr.apply(this, arguments); };
  const oFx = window.fxNummer; window.fxNummer = function (el, x) { noteer(x); return oFx.apply(this, arguments); };
}

/* ---------- fase A: de gevechten (eerlijkheid, beat, solo/fakkel/statussen), via het meetharnas ---------- */
function nieuwTotaal() { return { tekstSet: new Set(), bannerLangst: {} }; }
function voegToe(T, e) {
  for (const [k, v] of Object.entries(e || {})) {
    if (k === 'teksten') { v.forEach(x => T.tekstSet.add(x)); continue; }
    if (k === 'bannerLangst') { for (const [a, b] of Object.entries(v)) if (!T.bannerLangst[a] || b.length > T.bannerLangst[a].length) T.bannerLangst[a] = b; continue; }
    if (typeof v === 'number') T[k] = (T[k] || 0) + v;
    else if (Array.isArray(v)) { T[k + 'N'] = (T[k + 'N'] || 0) + v.length; T[k] = T[k] || []; for (const x of v) if (T[k].length < 8) T[k].push(x); }
    else if (v && typeof v === 'object') { T[k] = T[k] || {}; for (const [a, b] of Object.entries(v)) T[k][a] = (T[k][a] || 0) + b; }
  }
}
async function gevechten(browser) {
  const H = require(path.join(__dirname, 'baas-meting', 'erfprins_meting.js'));
  const HELDEN = ['slachter', 'gifmagier', 'thoverk'];
  const [NE, NX, NX2, NT, NB] = SNEL ? [1, 1, 1, 1, 2] : [5, 5, 4, 3, 24];
  const jobs = [];
  const add = (soort, beleid, held, st, seed, opties = {}, knoppen = {}, mods = []) => jobs.push({ soort, opties, job: { cel: `${soort}/${beleid}/${held}/${st}`, variant: 'basis', held, st, beleid, hpPct: 0.85, seed: 'ERF-' + seed, knoppen, mods, build: H.tafelBuild(held, st) } });
  for (const held of HELDEN) {
    for (const st of ['matig', 'gemiddeld', 'sterk', 'kroon']) for (const beleid of ['naief', 'bewust', 'schild', 'slim']) for (let i = 0; i < NE; i++) add('eerlijk', beleid, held, st, 93000 + i);
    for (const st of ['gemiddeld', 'sterk']) for (let i = 0; i < NX; i++) add('fakkel 0', 'bewust', held, st, 93100 + i, { fakkel0: true });
    for (const st of ['matig', 'gemiddeld']) for (const beleid of ['bewust', 'schild']) for (let i = 0; i < NX; i++) add('4 statussen', beleid, held, st, 93200 + i, { status4: true });
    for (let i = 0; i < NX2; i++) add('fakkel 0 + 4 statussen', 'schild', held, 'gemiddeld', 93300 + i, { fakkel0: true, status4: true });
    for (let i = 0; i < NX2; i++) add('Glazen Zielen', 'bewust', held, 'gemiddeld', 93400 + i, { glas: true });
    for (let i = 0; i < NX; i++) add('2 extra Lasters', 'bewust', held, 'gemiddeld', 93500 + i, {}, {}, ['vloek2']);
    for (let i = 0; i < NT; i++) add('lang (naroof, uitputting)', 'bewust', held, 'gemiddeld', 93600 + i, { taai: true }, { hp: 400 });
    for (const st of ['matig', 'gemiddeld', 'sterk', 'kroon']) for (const beleid of ['bewust', 'nietslaan']) for (let i = 0; i < NB; i++) add('beat', beleid, held, st, 95000 + i);
  }
  const fouten = [], T = nieuwTotaal(), res = [];
  let volgende = 0; const t0 = Date.now();
  await Promise.all(Array.from({ length: WERKERS }, async () => {
    let page = null, gedaan = 0;
    const nieuw = async () => { if (page) { try { await page.context().close(); } catch (e) { } } page = await H.maakPagina(browser, fouten); await page.evaluate(installeerEerlijk); gedaan = 0; };
    await nieuw();
    while (volgende < jobs.length) {
      const j = jobs[volgende++];
      if (gedaan >= 40) await nieuw();
      let r = null;
      for (let poging = 0; poging < 2 && !r; poging++) {
        try {
          await page.evaluate(o => { window.__erfOpties = o; window.__EE = window.__EEnieuw(); }, Object.assign({ cel: `${j.job.cel} ${j.job.seed}` }, j.opties));
          r = await page.evaluate(H.eenGevecht, { job: j.job });
          voegToe(T, await page.evaluate(() => { const e = window.__EE; window.__EE = window.__EEnieuw(); window.__erfOpties = null; return e; }));
          gedaan++;
        } catch (err) {
          if (poging === 1) r = { fout: 'evaluate: ' + String(err.message || err).slice(0, 200) };
          await nieuw();
        }
      }
      r.soort = j.soort; r.opties = j.opties; res.push(r);
      if (res.length % 150 === 0) process.stderr.write(`  [gevechten] ${res.length}/${jobs.length} (${Math.round((Date.now() - t0) / 1000)} s)\n`);
    }
    try { await page.context().close(); } catch (e) { }
  }));
  const duur = Math.round((Date.now() - t0) / 1000);
  const ok = res.filter(r => !r.fout);
  const pct = (a, n) => n ? 100 * a / n : 0, f1 = x => (Math.round(x * 10) / 10).toFixed(1);

  /* ---- (a) de strenge eerlijkheidscontrole ---- */
  const A = []; const ta = (g, s) => A.push([!!g, s]);
  ta(res.length === jobs.length && ok.length === res.length && res.every(r => !r.timeout), `${res.length} echte gevechten (${duur} s, ${WERKERS} werkers): ${res.filter(r => r.fout).length} fouten, ${res.filter(r => r.timeout).length} time-outs` + (res.find(r => r.fout) ? ' — ' + res.find(r => r.fout).fout.split('\n')[0] : ''));
  ta(T.beurten >= (SNEL ? 100 : 3000) && T.ok + Object.values(T.verklaard || {}).reduce((a, b) => a + b, 0) === T.beurten && !(T.afwN > 0),
    `de pil op het einde van je beurt == wat er in zijn beurt landt: ${T.ok}/${T.beurten} vijandbeurten exact, verklaard ${JSON.stringify(T.verklaard || {})}, ONVERKLAARD ${T.afwN || 0}` + (T.afw ? ' — ' + T.afw.slice(0, 3).join(' | ') : ''));
  ta(!(T.domFoutN > 0), `de pil in beeld is nooit verouderd (DOM == intentTekst) in ${T.beurten} vijandbeurten (${T.domFoutN || 0} afwijkingen)` + (T.domFout ? ' — ' + T.domFout.slice(0, 2).join(' | ') : ''));
  ta(!(T.pilTekstFoutN > 0), `elke tip noemt het getal van zijn pip (klap, dwars door je Blok, Gif, Blok, Zwak, Spiegelrecht, vloek, naroof, Roof, uitputting): ${T.pilTekstFoutN || 0} fouten` + (T.pilTekstFout ? ' — ' + T.pilTekstFout.slice(0, 2).join(' | ') : ''));
  ta(T.stempelN >= (SNEL ? 20 : 1500) && !(T.stempelFoutN > 0), `de stempel "KOPIE · Junior — …" en de ondertitel op de grote kaart = zijn pip, in ${T.stempelN || 0} teruggespeelde kaarten (${T.stempelFoutN || 0} fouten)` + (T.stempelFout ? ' — ' + T.stempelFout.slice(0, 2).join(' | ') : ''));
  ta(!(T.wisselsN > 0), `zijn zet wisselt nooit binnen jouw beurt, ook niet als de streep valt (faseLock hield ${T.faseLock || 0} keer stand; ${T.wisselsN || 0} wissels)` + (T.wissels ? ' — ' + T.wissels.slice(0, 2).join(' | ') : ''));
  ta(T.nr >= (SNEL ? 3 : 150) && T.nrZijn > 0 && T.nrJouw > 0 && !(T.nrFoutN > 0), `het noodrantsoen als belofte: ${T.nr} keer opgestaan (${T.nrJouw} in jouw beurt, ${T.nrZijn} in zijn beurt) — ♥+N op de Buit-pil == zijn HP, nooit een kaart van zijn pil of een vloek verscheurd, ${'de wis zoals aangekondigd'}, opstaan in zijn beurt ís zijn zet (${T.nrFoutN || 0} fouten)` + (T.nrFout ? ' — ' + T.nrFout.slice(0, 2).join(' | ') : ''));
  ta(!(T.naOpstaanN > 0) && !(T.naStikN > 0), `na het opstaan (in zijn beurt) en na het verslikken in een vloek speelt hij geen kaart meer (${T.naOpstaanN || 0} / ${T.naStikN || 0})`);
  ta(T.roof >= ok.length && !(T.roofFoutN > 0) && T.roofVia.klap > 0 && T.roofVia.eindBeurt > 0, `de Roof: ${T.roof} keer (${T.roofVia.klap} via je klap, ${T.roofVia.eindBeurt} op het einde van je beurt) — het aantal van de ROOF-pil, allemaal uit je trekstapel, nooit uit je hand of aflegstapel, altijd ${'≥ 2'} over (${T.roofFoutN || 0} fouten)` + (T.roofFout ? ' — ' + T.roofFout.slice(0, 2).join(' | ') : ''));
  ta(!(T.buitEersteFoutN > 0) && T.buitBeat > 0, `de buit-beat (${T.buitBeat} keer): de kaart die de vinger aanwijst, staat daarna vooraan op zijn pil (${T.buitEersteFoutN || 0} fouten)`);
  ta(!(T.bannerFoutN > 0), `elke banner noemt de echte getallen (${Object.entries(T.bannerN || {}).map(([k, v]) => k + ' ' + v).join(', ')}): ${T.bannerFoutN || 0} fouten` + (T.bannerFout ? ' — ' + T.bannerFout.slice(0, 2).join(' | ') : ''));
  const zetten = ['roof', 'buit', 'plagiaat', 'steel', 'aanval'], soorten = ['klap', 'drift', 'gif', 'blok', 'zwak', 'spiegel', 'vloek', 'vervalt'];
  ta(zetten.every(z => (T.soorten || {})[z] > 0) && soorten.every(s => (T.pips || {})[s] > 0) && T.fase3 > 0 && T.klierTik > 0 && T.naroof > 0,
    `dekking: zetten ${JSON.stringify(T.soorten || {})}, pips ${JSON.stringify(T.pips || {})}, fase 3 ${T.fase3 || 0}×, Gifklieren-tik ${T.klierTik || 0} Gif, naroof ${T.naroof || 0}×`);

  /* ---- (e) solo, fakkel 0 en 100, vier statussen, 0 paginafouten ---- */
  const Z = []; const tz = (g, s) => Z.push([!!g, s]);
  tz(ok.every(r => r.soloOk && !r.metgezelGezien), `solo: in geen enkel van de ${ok.length} gevechten een metgezel (${ok.filter(r => !r.soloOk || r.metgezelGezien).length})`);
  const tel = s => ok.filter(r => r.soort === s).length;
  tz(T.fakkel0 >= tel('fakkel 0') + tel('fakkel 0 + 4 statussen') && T.fakkel0 > 0 && !(T.optieFoutN > 0), `fakkel 0 (gedoofd, +1 Kracht op hem): ${T.fakkel0 || 0} gevechten, pil en uitvoering eerlijk zoals bij fakkel 100 (${ok.length - (T.fakkel0 || 0)} gevechten)` + (T.optieFout ? ' — ' + T.optieFout.slice(0, 2).join(' | ') : ''));
  tz(T.status4 >= tel('4 statussen') && T.status4 > 0, `vier statussen op held (Zwak, Kwetsbaar, Gif, Doornen) én baas (Zwak, Kwetsbaar, Gif, Doornen), elke beurt opnieuw: ${T.status4 || 0} gevechten, eerlijk`);
  tz(T.glas > 0, `Glazen Zielen (×1,5 op elke klap, ook op de pil): ${T.glas || 0} gevechten, eerlijk`);
  tz(fouten.length === 0, `0 paginafouten in ${ok.length} gevechten` + (fouten.length ? ' — ' + [...new Set(fouten)].slice(0, 3).join(' | ') : ''));

  /* ---- (d) zijn beat: 'slaat niet in beurt 1' nooit beter dan 'bewust' ---- */
  const B = []; const tb = (g, s) => B.push([!!g, s]);
  const beat = ok.filter(r => r.soort === 'beat');
  const bew = beat.filter(r => r.beleid === 'bewust'), niet = beat.filter(r => r.beleid === 'nietslaan');
  const winst = rs => pct(rs.filter(r => r.gewonnen).length, rs.length);
  const sleutel = r => `${r.held}|${r.st}|${r.seed}`;
  const kB = new Map(bew.map(r => [sleutel(r), r.gewonnen]));
  let gered = 0, verloren = 0; for (const r of niet) { const x = kB.get(sleutel(r)); if (x === undefined) continue; if (r.gewonnen && !x) gered++; if (!r.gewonnen && x) verloren++; }
  const d = winst(niet) - winst(bew);
  const perSt = ['matig', 'gemiddeld', 'sterk', 'kroon'].map(st => `${st} ${f1(winst(niet.filter(r => r.st === st)))} / ${f1(winst(bew.filter(r => r.st === st)))}`).join(' · ');
  /* eenzijdige tekentoets op de gepaarde verschillen: is 'niet slaan' SIGNIFICANT beter? */
  const binom = (k, n) => { let p = 0; for (let i = k; i <= n; i++) { let c = 1; for (let j = 0; j < i; j++) c = c * (n - j) / (j + 1); p += c * Math.pow(0.5, n); } return p; };
  const pNiet = binom(gered, gered + verloren);
  tb(bew.length >= (SNEL ? 10 : 250) && d <= H.DOEL.marge + 1e-9 && pNiet >= 0.05, `slaat niet in beurt 1: ${f1(winst(niet))} % tegen bewust ${f1(winst(bew))} % (${niet.length} tegen ${bew.length} gevechten, gepaard ${gered} gered / ${verloren} verloren, verschil ${d >= 0 ? '+' : ''}${f1(d)} pp; mag hoogstens ${H.DOEL.marge} pp boven bewust (architectmarge) en nooit significant beter: p = ${pNiet.toFixed(2)})`);
  tb(true, `per sterkte, niet slaan / bewust: ${perSt} (ter info; de ijking mat 14.400 gevechten: gemiddeld 45,1 / 44,4)`);
  const rooft = rs => rs.filter(r => r.roof);
  tb(rooft(niet).length > 0 && rooft(niet).every(r => !r.roof.viaAanval) && pct(rooft(bew).filter(r => r.roof.viaAanval).length, rooft(bew).length) >= 80,
    `de controle meet wat ze zegt: 'niet slaan' laat de Roof altijd op het einde van je beurt vallen (${rooft(niet).filter(r => !r.roof.viaAanval).length}/${rooft(niet).length}), 'bewust' slaat in ${f1(pct(rooft(bew).filter(r => r.roof.viaAanval).length, rooft(bew).length))} % in beurt 1`);
  const vechtTeksten = [...T.tekstSet];
  return {
    blokken: [
      { kop: `Eerlijkheid, streng: de pil zoals je hem ziet tegen wat er landt (bazen_plan §5 ent 6, jury E5) · ${ok.length} gevechten`, regels: A },
      { kop: 'Solo, fakkel 0 en 100, vier statussen op held en baas, 0 paginafouten', regels: Z },
      { kop: "Zijn beat: 'slaat niet in beurt 1' nooit beter dan 'bewust' (jury_thomas §6.3)", regels: B }
    ],
    vechtTeksten, bannerLangst: T.bannerLangst
  };
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
  t(dev.hp === Math.round(dev.max * 0.85) && dev.dranken.length === 1 && dev.dranken[0] === 'heeldrank' && dev.dek >= 18, `W13 devErfprins realistisch: ${dev.hp}/${dev.max} HP (85 %), dranken [${dev.dranken}], dek ${dev.dek} (>= 18, zoals de melding belooft)`);
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
   5 · DE TEKSTCATALOGUS (bazen_plan §8: "geen liegende tekst"): elke speler-tekst over de Erfprins
   wordt opgelijst (met de tekst zoals het spel hem nu toont) en getoetst aan de code: de pillen en
   hun tips, de banners, de meldingen, de stempel en de ondertitel op de grote kaart, de Buit-pil,
   de chips op zijn lijf, de fasetip en de streep, de naroof en de uitputting, de aangetaste kaart,
   het Bestiarium, de fakkeltip en de DEV-sprong. Elke claim met een getal of een regel wordt in
   een gecontroleerd gevecht nagespeeld; de formules staan hier uitgeschreven zoals ERF ze
   documenteert (een tweede, onafhankelijke rekensom).
   ============================================================ */
async function catalogusInPagina(arg) {
  const R = []; const t = (ok, s) => R.push([!!ok, s]);
  const lijst = []; const cat = (waar, tekst) => lijst.push([waar, String(tekst)]);
  const echteSlaap = window.slaap;
  const snel = () => { window.slaap = () => Promise.resolve(); };
  const traag = () => { window.slaap = echteSlaap; };
  const wachtTot = async (f, ms = 6000) => { const t0 = performance.now(); while (!f() && performance.now() - t0 < ms) await new Promise(r => setTimeout(r, 15)); return !!f(); };
  const vrij = g => wachtTot(() => !(g.bezig || g.ceremonie), 8000);
  const banners = [], meldingen = [], fx = [], spraak = [], stempels = [];
  const oB = window.baasFaseMoment, oM = window.melding, oF = window.fxNummer, oS = window.baasSpreekt, oT = window.copycatToonGespeeld, oCut = window.copycatRoofCutscene;
  window.baasFaseMoment = function (a, b) { banners.push([a, String(b)]); return oB.apply(this, arguments); };
  window.melding = function (x) { meldingen.push(String(x)); return oM.apply(this, arguments); };
  window.fxNummer = function (el, x) { fx.push(String(x)); return oF.apply(this, arguments); };
  window.baasSpreekt = function (x) { spraak.push(String(x)); return oS.apply(this, arguments); };
  window.copycatToonGespeeld = async function () { const w = await oT.apply(this, arguments); if (w && w.querySelector) stempels.push({ stempel: (w.querySelector('.rs-stempel') || {}).textContent || '', sub: (w.querySelector('.rs-sub') || {}).textContent || '', kop: (w.querySelector('.rs-kop') || {}).textContent || '' }); return w; };
  let naRoof = null;
  window.copycatRoofCutscene = async function (g, v) { const r = await oCut.apply(this, arguments); naRoof = { hand: g.hand.map(c => c.uid), afleg: g.afleg.map(c => c.uid), trek: g.trek.map(c => c.uid), buit: (v.gestolen || []).map(s => s.uid) }; return r; };
  const leeg = () => { banners.length = 0; meldingen.length = 0; fx.length = 0; spraak.length = 0; stempels.length = 0; };
  const mob0 = window.mobiel;
  const vers = async (held, seed) => {
    if (S && S.gevecht) { try { S.gevecht.voorbij = true; stopGevechtLus(); } catch (e) { } }
    document.querySelectorAll('#baas-intro, .roof-overlay, .roof-speel-kaart').forEach(n => n.remove());
    nieuwSpel(held, seed); S.metgezel = null; S.runMetgezel = null; Codex.erfprinsOntmoetingen = 3; S.daily = false; S.dagwet = null;
    devErfprins();
    document.querySelectorAll('#baas-intro').forEach(n => n.remove());
    const g = S.gevecht, v = g.vijanden.find(x => x.id === 'de_erfprins');
    await vrij(g); leeg();
    return { g, v };
  };
  const intentEl = v => GDOM.vijanden[S.gevecht.vijanden.indexOf(v)].intent;
  const pips = v => [...intentEl(v).querySelectorAll('.intent')].map(e => ({ t: e.textContent.trim(), tip: e.dataset.tip || '', cls: e.className }));
  const tekstVan = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.trim(); };
  const kolomChips = v => [...GDOM.vijanden[S.gevecht.vijanden.indexOf(v)].wrap.querySelectorAll('.blok-status > *')].map(e => ({ t: e.textContent.trim(), tip: e.dataset.tip || '' }));
  const u = UITSPRAKEN._erfprins;
  /* de formules zoals ERF ze documenteert (een tweede rekensom, los van erfKlap) */
  const act = () => huidigeAct();
  const actS = d => act() > 1 ? Math.ceil(d * (1 + ERF.actSchaal * (act() - 1))) : d;
  const TR = Math.max(1, Math.round(ERF.treffers || 1));
  const klapVan = (basis, v) => {
    let per = TR > 1 ? Math.ceil(basis / TR) : basis;
    per += (v.status.kracht || 0);
    if ((v.status.zwak || 0) > 0) per = Math.floor(per * 0.75);
    if ((sp().status.kwetsbaar || 0) > 0) per = Math.floor(per * 1.5);
    const door = Math.min(per, Math.round(per * ERF.onblokbaar)), bl = per - door, g1 = glasDmg(bl), g2 = glasDmg(door);
    return { label: (door ? `${g1}+${g2}🩸` : `${g1 + g2}`) + (TR > 1 ? `×${TR}` : ''), totaal: (g1 + g2) * TR, door: g2 * TR };
  };
  const deel = (n, f) => (n > 0 && f > 0) ? Math.max(1, Math.round(n * f)) : 0;
  try {
    snel();
    /* ---------- A · DE ROOF via je eerste klap ---------- */
    {
      const { g, v } = await vers('slachter', 'ERF-ACC-CAT-A');
      const slag = nieuweKaart('slag'); g.hand.push(slag); g.energie = Math.max(g.energie, 3); renderGevecht();
      const pil = intentEl(v).querySelector('.intent-roof');
      const tekstL = pil ? pil.textContent.trim() : '-', tip = pil ? pil.dataset.tip : '';
      window.mobiel = true; const tekstM = tekstVan(intentTekst(v)); window.mobiel = mob0;
      cat('pil vóór de Roof (laptop · mobiel)', tekstL + ' · ' + tekstM);
      cat('pil vóór de Roof, tip', tip);
      const N = +((tip.match(/pakt hij (?:de helft van je dek: )?(\d+) kaart(?:en)?\b/) || [])[1]);
      const dek = S.dek.length, trekU = g.trek.map(c => c.uid), speelU = [slag.uid];
      const verwachtN = Math.max(0, Math.min(g.trek.length - ERF.roofRest, Math.round(dek * ERF.roofDeel)));
      t(tekstL === '🎭 ROOF bij je 1e klap' && tekstM === '🎭 ROOF', `ROOF-pil: "${tekstL}" (laptop) en "${tekstM}" (mobiel)`);
      t(N === verwachtN && ERF.roofDeel === 0.5 && /de helft van je dek/.test(tip), `ROOF-tip "de helft van je dek: ${N} kaarten": round(je dek ${dek} × ERF.roofDeel ${ERF.roofDeel}), met altijd ${ERF.roofRest} over (${verwachtN})`);
      const beurt = g.beurt, hp0 = S.hp; naRoof = null;
      await speelKaart(slag, v);
      await wachtTot(() => g.beurt > beurt || g.voorbij, 8000); await vrij(g);
      const nb = naRoof || { buit: [], hand: [], afleg: [] };
      t(nb.buit.length === N && nb.buit.every(x => trekU.includes(x)), `ROOF-tip "allemaal uit je trekstapel": ${nb.buit.length} kaarten, ${nb.buit.filter(x => trekU.includes(x)).length} uit je trekstapel`);
      t(nb.afleg.some(x => speelU.includes(x)) && !nb.buit.some(x => nb.hand.includes(x) || nb.afleg.includes(x)), `ROOF-tip "je hand en wat je al speelde, steelt hij niet": je klap lag al in je aflegstapel, niets uit je hand (${nb.hand.length}) of aflegstapel geroofd`);
      t(g.beurt === beurt + 1 && S.hp === hp0 && v.intent && v.intent.type === 'plagiaat', `ROOF-tip "je beurt stopt meteen … daarna bekijkt hij eerst zijn buit: die beurt geen schade": beurt ${beurt} -> ${g.beurt}, jouw HP ${hp0} -> ${S.hp}, daarna "${v.intent && v.intent.type}"`);
      const woede = banners.find(b => b[0] === 'WOEDE'), roof = banners.find(b => b[0] === 'DE ROOF');
      cat('banner WOEDE (je sloeg)', woede ? woede[1] : '-');
      cat('banner DE ROOF (je sloeg)', roof ? roof[1] : '-');
      t(woede && woede[1] === u.woede, `WOEDE na je klap: "${woede && woede[1]}"`);
      t(roof && roof[1] === `🎭 ${N} van je ${dek} kaarten — allemaal uit je trekstapel — nu MÍJN werk. Je beurt is om.`, `DE ROOF: "${roof && roof[1]}" (${N} geroofd, je dek telt ${dek})`);
      const kop = document.querySelector('.roof-overlay .roof-kop');
      cat('het Roof-doek, kop', '🎭 DE ERFPRINS OPENT JE DEK · ' + u.roof);
    }
    /* ---------- B · DE ROOF zonder klap (het vangnet op het einde van je beurt) ---------- */
    {
      const { g, v } = await vers('gifmagier', 'ERF-ACC-CAT-B');
      const tip = intentEl(v).querySelector('.intent-roof').dataset.tip;
      const N = +((tip.match(/pakt hij (?:de helft van je dek: )?(\d+) kaart(?:en)?\b/) || [])[1]), dek = S.dek.length, trekU = g.trek.map(c => c.uid), handU = g.hand.map(c => c.uid), hp0 = S.hp;
      naRoof = null;
      await eindBeurt(); await vrij(g);
      const nb = naRoof || { buit: [] };
      t(/Val je niet aan, dan rooft hij op het einde van je beurt/.test(tip) && nb.buit.length === N && nb.buit.every(x => trekU.includes(x)) && !nb.buit.some(x => handU.includes(x)), `ROOF-tip "val je niet aan, dan rooft hij op het einde van je beurt": ${nb.buit.length}/${N} kaarten, allemaal uit je trekstapel, niets uit je hand`);
      const woede = banners.find(b => b[0] === 'WOEDE'), roof = banners.find(b => b[0] === 'DE ROOF');
      cat('banner WOEDE (je sloeg niet)', woede ? woede[1] : '-');
      cat('banner DE ROOF (je sloeg niet)', roof ? roof[1] : '-');
      t(woede && woede[1] === u.woedeNiet && !/SLÁÁT/.test(woede[1]), `WOEDE zonder klap zegt niet "je SLÁÁT me": "${woede && woede[1]}"`);
      t(roof && roof[1] === `🎭 ${N} van je ${dek} kaarten — allemaal uit je trekstapel — nu MÍJN werk.`, `DE ROOF zonder klap, zonder "Je beurt is om.": "${roof && roof[1]}"`);
      t(S.hp === hp0 && v.intent && v.intent.type === 'plagiaat', `zonder klap: Roof en buit-beat in dezelfde beurt, geen schade (HP ${hp0} -> ${S.hp}), daarna "${v.intent && v.intent.type}"`);
    }
    /* ---------- C · ELKE SOORT: pip, tip, stempel, ondertitel, uitvoering en retour ---------- */
    {
      const { g, v } = await vers('thoverk', 'ERF-ACC-CAT-C');
      const overig = Object.keys(KAARTEN).find(id => { const d = KAARTEN[id]; if (!d || d.gesmeed || d.type === 'vloek' || !d.tekst) return false; try { return erfBuitKaart(nieuweKaart(id)).soort === 'overig'; } catch (e) { return false; } });
      const gevallen = [['zware_klap', 'klap'], ['gifflits', 'gif'], ['bastvel', 'blok'], ['stoofgeur', 'zwak'], ['kolenstempel', 'spiegel'], ['gifklieren', 'spiegel'], [overig, 'drift'], ['laster', 'vloek']];
      let aangetastKaart = null;
      for (const fase of [2, 3]) for (const statussen of [false, true]) for (const [id, soort] of gevallen) {
        if (!id) { t(false, `geen kaart gevonden voor de soort ${soort}`); continue; }
        g.roofGedaan = true; g.roofBeurt = false; g.voorbij = false; v.dood = false; v.plagiaat = false; v.fase = fase; v.copyKracht = ERF.toeslag[fase]; v.plagN = 0;
        v.hp = v.maxHp; v.blok = 0; v.status = statussen ? { zwak: 1, kracht: 1 } : {};
        S.hp = S.maxHp; g.speler.blok = 0; g.speler.status = statussen ? { kwetsbaar: 1 } : {}; g.copycatDubbelGezien = false;
        const c = nieuweKaart(id), buit = erfBuitKaart(c);
        v.gestolen = [buit];
        v.intent = VIJANDEN[v.id].kies(v, 5); renderGevecht();
        const p = pips(v)[0] || { t: '-', tip: '' };
        const naam = erfNaam(buit);
        let exp;
        if (soort === 'klap') { const b0 = Math.min(ERF.cap[fase], Math.max(1, actS(Math.round(kval(c, 'dmg') * ERF.mult) + ERF.toeslag[fase]))); const k = klapVan(b0, v); exp = { pip: `🎭 ${k.label}`, stempel: k.label, sub: `${k.totaal} schade op jou`, tip: `voor ${k.totaal} schade`, hp: k.totaal }; }
        else if (soort === 'drift') { const k = klapVan(actS(ERF.driftbui[0] + ERF.driftbui[1] * fase), v); exp = { pip: `💢 ${k.label}`, stempel: `💢 ${k.label}`, sub: `Driftbui: ${k.totaal} schade op jou`, tip: `een driftbui voor ${k.totaal} schade`, hp: k.totaal }; }
        else if (soort === 'gif') { const n = Math.max(1, Math.round(kval(c, 'gif') * ERF.gifMult)); exp = { pip: `🧪 ${n}`, stempel: `🧪 ${n}`, sub: `${n} Gif op JOU`, tip: `${n} Gif op jou`, gif: n }; }
        else if (soort === 'blok') { const n = Math.max(1, Math.round(kval(c, 'blok') * ERF.blokMult)), dr = deel(kval(c, 'dr') || 0, ERF.spiegel.doornen); exp = { pip: `🛡️ ${n}${dr ? ' 🌵' + dr : ''}`, stempel: `🛡️ ${n}${dr ? ' 🌵' + dr : ''}`, sub: `${n} Blok voor hém`, tip: `hij krijgt ${n} Blok`, blok: n, dr }; }
        else if (soort === 'zwak') { const n = deel(kval(c, 'zw'), ERF.spiegel.zwak); exp = { pip: `🥀 ${n}`, stempel: `🥀 ${n}`, sub: `${n} Zwak op JOU`, tip: `${n} Zwak op jou`, zwak: n }; }
        else if (soort === 'spiegel') {
          const kr = deel(kval(c, 'kr') || (id === 'gifklieren' ? 0 : 0), ERF.spiegel.kracht), dr = deel(kval(c, 'dr') || 0, ERF.spiegel.doornen), kl = id === 'gifklieren' ? deel(kval(c, 'n'), ERF.spiegel.klieren) : 0;
          const delen = [kr ? `💪+${kr}` : '', dr ? `🌵+${dr}` : '', kl ? `🧫+${kl}` : ''].filter(Boolean).join(' ');
          exp = { pip: `🎭 ${delen}`, stempel: delen, sub: 'nu de zijne', tip: kr ? `+${kr} Kracht voor hém` : (kl ? `jij krijgt ${kl} Gif aan het begin van elke beurt van hem` : `+${dr} Doornen voor hém`), kr, dr, kl };
        }
        else if (soort === 'vloek') { const bf = ERF.vloek[0] + ERF.vloek[1] * fase + ERF.vloek[2] * Math.max(0, act() - 1); exp = { pip: `🌑 −${bf}`, tip: `bijt hém voor ${bf}`, bf }; }
        const wie = `${soort} (${naam}, fase ${fase}${statussen ? ', Zwak+Kracht op hem, Kwetsbaar op jou' : ''})`;
        if (fase === 2 && !statussen) { cat(`pip ${soort}`, p.t); cat(`tip ${soort}`, p.tip); }
        t(buit.soort === (soort === 'klap' ? 'aanval' : (soort === 'drift' ? 'overig' : soort)) && p.t === exp.pip && p.tip.includes(exp.tip), `${wie}: pip "${p.t}" = "${exp.pip}" (de formule van ERF), tip noemt "${exp.tip}"`);
        /* de uitvoering */
        const hp0 = S.hp, gif0 = sp().status.gif || 0, zw0 = sp().status.zwak || 0, vhp0 = v.hp, st0 = Object.assign({}, v.status), afl0 = g.afleg.length;
        leeg();
        g.vijandAanZet = true;
        try { const r = v.intent.doe(v); if (r && r.then) await r; } finally { g.vijandAanZet = false; }
        const st = stempels[0];
        if (soort !== 'vloek') {
          if (fase === 2 && !statussen) { cat(`grote kaart ${soort}: stempel`, st ? st.stempel : '-'); cat(`grote kaart ${soort}: ondertitel`, st ? st.sub : '-'); }
          t(st && st.stempel.trim() === `KOPIE · Junior — ${exp.stempel}` && st.sub.includes(exp.sub) && /HIJ SPEELT JOUW KAART/.test(st.kop), `${wie}: de grote kaart zegt "${st && st.stempel.trim()}" · "${st && st.sub}"`);
          const dhp = hp0 - S.hp, dgif = (sp().status.gif || 0) - gif0, dzw = (sp().status.zwak || 0) - zw0;
          const dbl = v.blok, dkr = (v.status.kracht || 0) - (st0.kracht || 0), ddr = (v.status.doornen || 0) - (st0.doornen || 0), dkl = (v.status.gifklieren || 0) - (st0.gifklieren || 0);
          const ok = dhp === (exp.hp || 0) && dgif === (exp.gif || 0) && dzw === (exp.zwak || 0) && dbl === (exp.blok || 0) && dkr === (exp.kr || 0) && ddr === ((exp.dr || 0)) && dkl === (exp.kl || 0);
          t(ok, `${wie}: wat landt = de pil (HP −${dhp}, Gif +${dgif}, Zwak +${dzw}; bij hem Blok ${dbl}, Kracht +${dkr}, Doornen +${ddr}, Gifklieren +${dkl})`);
          const terug = g.afleg[g.afleg.length - 1], gewoon = nieuweKaart(id);
          const retour = meldingen.find(m => /aangetast in je aflegstapel/.test(m));
          if (fase === 2 && !statussen && soort === 'klap') cat('melding bij de retour', retour || '-');
          t(g.afleg.length === afl0 + 1 && terug && terug.id === id && terug.aangetast && terug.uitputtend && kkost(terug) === kkost(gewoon) + 1 && retour === `🩸 Je ${naam} valt aangetast in je aflegstapel — +1 ⚡, eenmalig.`, `${wie}: "${retour}" — de kaart ligt aangetast in je aflegstapel, kost ${kkost(terug)} (${kkost(gewoon)} + 1), eenmalig`);
          if (soort === 'klap' && !aangetastKaart) aangetastKaart = terug;
        } else {
          const beet = fx.find(x => /bijt hém!/.test(x)), mel = meldingen.find(m => /een vloek laat zich niet kopiëren/.test(m));
          if (fase === 2 && !statussen) { cat('vloek: fx', beet || '-'); cat('vloek: melding', mel || '-'); }
          t(vhp0 - v.hp === exp.bf && beet === `🌑 jouw ${naam} bijt hém! −${exp.bf}` && fx.includes('🤢 verslikt zich') && mel === `🌑 Hij speelt je ${naam} — een vloek laat zich niet kopiëren. Ze bijt hém.` && g.afleg.length === afl0 && S.hp === hp0,
            `${wie}: hij verliest ${vhp0 - v.hp} HP (pil ${exp.bf}), verslikt zich, en de vloek komt niet terug (aflegstapel ${afl0} -> ${g.afleg.length})`);
        }
      }
      /* de vloek eerst en de rest valt weg (vervalt), en de banner telt wat hij echt speelde */
      for (const [ids, fase, plagN, titel] of [[['laster', 'zware_klap'], 2, 1, null], [['zware_klap', 'slag'], 2, 1, 'TWEE TEGELIJK'], [['zware_klap', 'slag', 'dubbelslag'], 3, 1, 'DRIE TEGELIJK']]) {
        g.roofGedaan = true; v.dood = false; v.plagiaat = false; v.fase = fase; v.copyKracht = ERF.toeslag[fase]; v.plagN = plagN; v.hp = v.maxHp; v.status = {}; S.hp = S.maxHp; g.speler.blok = 0; g.speler.status = {}; g.copycatDubbelGezien = false;
        v.gestolen = ids.map(id => erfBuitKaart(nieuweKaart(id)));
        v.intent = VIJANDEN[v.id].kies(v, 5); renderGevecht();
        const ps = pips(v); const verwacht = copycatVerwacht(v); const hp0 = S.hp;
        leeg(); g.vijandAanZet = true;
        try { const r = v.intent.doe(v); if (r && r.then) await r; } finally { g.vijandAanZet = false; }
        const tb = banners.filter(b => /TEGELIJK$/.test(b[0])).map(b => b[0]);
        if (ids[0] === 'laster') {
          cat('pip die wegvalt (na een vloek), tip', ps[1] ? ps[1].tip : '-');
          t(ps.length === 2 && /intent-vuil/.test(ps[0].cls) && /intent-vervalt/.test(ps[1].cls) && /^Valt deze beurt weg — hij verslikt zich eerst in je vloek/.test(ps[1].tip) && v.gestolen.some(s => s.id === 'zware_klap') && S.hp === hp0 && verwacht === 0 && tb.length === 0,
            `vloek eerst: "${ps.map(p => p.t).join(' ')}" — de tweede kaart valt weg en blijft in zijn buit, geen schade (pil ${verwacht}), geen "TEGELIJK"-banner (${tb.join(',') || 'geen'})`);
        } else {
          t(ps.length === ids.length && tb.length === 1 && tb[0] === titel && hp0 - S.hp === verwacht, `plan van ${ids.length} (fase ${fase}): pil "${ps.map(p => p.t).join(' ')}" = ${verwacht} schade, landt ${hp0 - S.hp}; banner ${tb.join(',') || 'geen'} (${titel})`);
          if (titel) cat(`banner ${titel}`, (banners.find(b => b[0] === titel) || [0, '-'])[1]);
        }
      }
      /* de aangetaste kaart: eenmalig, +1 Energie, en zo staat ze in je hand */
      if (aangetastKaart) {
        g.voorbij = false; v.dood = false; v.hp = v.maxHp; g.afleg = g.afleg.filter(c => c !== aangetastKaart); g.hand = [aangetastKaart]; g.energie = 5; g.kaartGespeeldDezeBeurt = true; renderGevecht();
        const el = document.querySelector(`#hand .kaart[data-uid="${aangetastKaart.uid}"]`);
        const kt = el ? el.querySelector('.kaart-tekst').textContent.trim() : '', badge = el && el.querySelector('.kaart-aangetast') ? el.querySelector('.kaart-aangetast').dataset.tip : '';
        cat('aangetaste handkaart: tekst', kt); cat('aangetaste handkaart: 🩸-tip', badge);
        const k0 = kkost(aangetastKaart), e0 = g.energie;
        await speelKaart(aangetastKaart, v); await vrij(g);
        t(/^🩸 Eenmalig\./.test(kt) && /kost 1 Energie meer en is eenmalig \(daarna uitgeput\)/.test(badge) && e0 - g.energie === k0 && (g.uitgeput || []).some(c => c.uid === aangetastKaart.uid) && !g.afleg.some(c => c.uid === aangetastKaart.uid),
          `aangetaste kaart: "${kt.slice(0, 40)}…" / tip — ze kostte ${e0 - g.energie} (= ${k0}) en ligt daarna bij je uitgeputte kaarten, niet in je aflegstapel`);
      }
    }
    /* ---------- D · DE BUIT-PIL, DE CHIPS EN HET NOODRANTSOEN ---------- */
    {
      const { g, v } = await vers('slachter', 'ERF-ACC-CAT-D');
      const zet = (ids, fase) => { g.roofGedaan = true; g.roofBeurt = false; v.dood = false; v.plagiaat = false; v.fase = fase || 2; v.copyKracht = ERF.toeslag[v.fase]; v.plagN = 0; v.hp = v.maxHp; v.gestolen = ids.map(id => erfBuitKaart(nieuweKaart(id))); v.intent = VIJANDEN[v.id].kies(v, 3); renderGevecht(); };
      zet(['zware_klap', 'slag', 'slag', 'verdediging', 'verdediging', 'knal', 'dubbelslag', 'laster']);
      const aeg = () => document.querySelector('#baas-balk .bb-aegis');
      const tekst = aeg().textContent.trim(), tip = aeg().dataset.tip || '';
      cat('Buit-pil', tekst); cat('Buit-pil, tip', tip);
      const plan = v.intent.plan.map(k => k.uid);
      const schoon = v.gestolen.filter(s => s.soort !== 'vloek' && !plan.includes(s.uid)).length;
      const hpN = Math.min(v.maxHp, Math.min(ERF.rantsoenMax, schoon) * ERF.rantsoenPerKaart);
      t(tekst === `🎭 Buit · 8 · 🌑1 · ♥+${hpN}`, `Buit-pil "${tekst}": 8 kaarten, 1 vloek, ♥+${hpN} = min(${ERF.rantsoenMax}, ${schoon} schone naast zijn plan) × ${ERF.rantsoenPerKaart}`);
      const wisZin = ERF.rantsoenWist ? 'schoon: jouw Gif, Zwak en Kwetsbaar op hem zijn dan weg' : 'met al zijn statussen, ook jouw Gif en Zwak op hem';
      t(tip.includes(`tot ${ERF.rantsoenMax} kaarten en staat op met ${ERF.rantsoenPerKaart} HP per kaart (nu +${hpN})`) && tip.includes(wisZin) && tip.includes('Wat op zijn pil staat, verscheurt hij nooit.') && tip.includes('Valt hij in zijn eigen beurt, dan is opstaan zijn zet.') && tip.includes('Vloeken tellen niet.'),
        `Buit-tip: tot ${ERF.rantsoenMax} kaarten, ${ERF.rantsoenPerKaart} HP per kaart (nu +${hpN}), "${wisZin}" (ERF.rantsoenWist ${ERF.rantsoenWist}), zijn pil blijft heel, opstaan is zijn zet, vloeken tellen niet`);
      t(tip.includes(`Elke beurt speelt hij er ${erfPerBeurt(2)} terug`) && erfPerBeurt(2) === [...new Set(ERF.plan[2])].sort((a, b) => a - b).join(' of ') && tip.includes('Er zit 1 vloek in: die speelt hij eerst, en die bijt hém.') && v.intent.plan[0].soort === 'vloek' && tip.includes('(' + v.gestolen.map(erfNaam).join(', ') + ')'),
        `Buit-tip: "${erfPerBeurt(2)} per beurt" (ERF.plan[2] = [${ERF.plan[2]}]), de vloek staat eerst op zijn pil (${v.intent.plan[0].naam}), alle namen in de tip`);
      /* fase 2: de cyclus van zijn plan */
      const maten = []; zet(['zware_klap', 'slag', 'slag', 'verdediging', 'verdediging', 'knal', 'dubbelslag']);
      for (let n = 0; n < 4; n++) { v.plagN = n; maten.push(VIJANDEN[v.id].kies(v, 3).plan.length); }
      t(maten.every((m, i) => m === ERF.plan[2][i % ERF.plan[2].length]), `"${erfPerBeurt(2)} per beurt" in fase 2: zijn plannen tellen ${maten.join(', ')} kaarten (ERF.plan[2] = [${ERF.plan[2]}])`);
      /* de chips op zijn lijf */
      zet(['zware_klap', 'slag', 'slag', 'verdediging', 'verdediging', 'knal', 'dubbelslag', 'laster']);
      v.status = { gif: 5, zwak: 2, kwetsbaar: 1, kracht: 2, doornen: 1, gifklieren: 1 }; renderGevecht();
      const chips = kolomChips(v); const tipVan = ic => (chips.find(c => c.t.startsWith(ic)) || {}).tip || '';
      for (const [ic, nm] of [['☠️', 'gif'], ['🥀', 'zwak'], ['🎯', 'kwetsbaar'], ['💪', 'kracht'], ['🌵', 'doornen'], ['🧫', 'gifklieren']]) cat(`chip ${nm} op hem`, tipVan(ic));
      const weg = `Staat hij op uit zijn noodrantsoen (♥+${hpN}), dan is dit weg.`;
      t(tipVan('☠️').includes(`de helft hiervan (naar boven afgerond, nu ${Math.ceil(5 / 2)} HP)`) && ['☠️', '🥀', '🎯'].every(ic => tipVan(ic).includes(weg) === !!ERF.rantsoenWist) && ['💪', '🌵', '🧫'].every(ic => !tipVan(ic).includes('noodrantsoen')),
        `chips op hem: gif "de helft … nu 3 HP"; Gif, Zwak en Kwetsbaar zeggen "${weg}", Kracht, Doornen en Gifklieren niet`);
      t(/Aanvallen doen zoveel extra schade/.test(tipVan('💪')) && /Aanvallers krijgen zoveel schade terug/.test(tipVan('🌵')) && /de tegenstanders zoveel Gif/.test(tipVan('🧫')), 'chips op hem: Kracht (op elke klap), Doornen (jouw klap kost je) en Gifklieren (jij krijgt Gif) zeggen wat ze bij hem doen');
      /* de gif-chip: een baas weerstaat de helft */
      { const hpA = v.hp; v.intent = { type: 'buit', naam: 'Zijn buit', doe: () => { } }; g.roofBeurt = false; const vg = v.gestolen; v.gestolen = [];
        const hpS = S.hp; await eindBeurt(); await vrij(g); v.gestolen = vg;
        t(hpA - v.hp === 3, `gif 5 op hem: hij verliest ${hpA - v.hp} HP aan het begin van zijn beurt (de chip zei 3)`); S.hp = hpS; }
      /* het Spiegelrecht op zijn Doornen: jouw klap kost je */
      { zet(['zware_klap', 'slag', 'slag']); v.status = { doornen: 2 }; g.speler.blok = 0; const hpS = S.hp; aanvalOp(v, 5); t(hpS - S.hp === 2, `Doornen 2 op hem: jouw klap kost je ${hpS - S.hp} HP`); S.hp = hpS; }
      /* het noodrantsoen in JOUW beurt */
      zet(['zware_klap', 'slag', 'slag', 'verdediging', 'verdediging', 'knal', 'dubbelslag', 'laster']);
      v.status = { gif: 5, zwak: 2, kwetsbaar: 1, kracht: 2, doornen: 1, gifklieren: 1 }; renderGevecht();
      const st0 = Object.assign({}, v.status), sig0 = JSON.stringify(v.intent.plan.map(k => k.uid)), planU = v.intent.plan.map(k => k.uid), buitV = v.gestolen.slice();
      leeg(); g.vijandAanZet = false; g.speler.status = {};
      verliesHp(v, v.hp + 5, sp());
      const rest = new Set(v.gestolen.map(s => s.uid)), weg2 = buitV.filter(s => !rest.has(s.uid));
      t(!v.dood && v.plagiaat && v.hp === hpN && weg2.length === Math.min(ERF.rantsoenMax, schoon) && !weg2.some(s => planU.includes(s.uid) || s.soort === 'vloek') && JSON.stringify(v.intent.plan.map(k => k.uid)) === sig0,
        `noodrantsoen in jouw beurt: staat op met ${v.hp} HP (♥+${hpN}), verscheurt ${weg2.length} schone kaarten, geen van zijn pil en geen vloek, en zijn zet blijft staan`);
      t(['gif', 'zwak', 'kwetsbaar'].every(s => ERF.rantsoenWist ? !(v.status[s] > 0) : v.status[s] === st0[s]) && ['kracht', 'doornen', 'gifklieren'].every(s => v.status[s] === st0[s]), `noodrantsoen: ${ERF.rantsoenWist ? 'jouw Gif, Zwak en Kwetsbaar op hem zijn weg' : 'zijn statussen blijven'}, zijn Kracht/Doornen/Gifklieren blijven (${JSON.stringify(v.status)})`);
      traag(); await new Promise(r => setTimeout(r, 3600)); snel();   /* de banner komt na 950 ms, de laatste 'verscheurd' na 950 + 500 + 4 x 380 ms */
      const nrB = banners.find(b => b[0] === 'HET NOODRANTSOEN');
      cat('banner HET NOODRANTSOEN', nrB ? nrB[1] : '-');
      cat('fx bij het verscheuren', fx.filter(x => /verscheurd/.test(x)).join(' · '));
      t(nrB && nrB[1] === `🗞️ Hij verscheurt ${weg2.length} van je kaarten en staat op met ${hpN} HP.` && weg2.every(s => fx.includes(`🗞️ „${erfNaam(s)}” verscheurd · +${ERF.rantsoenPerKaart}`)), `HET NOODRANTSOEN: "${nrB && nrB[1]}", per kaart "🗞️ „…” verscheurd · +${ERF.rantsoenPerKaart}"`);
      renderGevecht();
      const tipNa = aeg().dataset.tip || '';
      cat('Buit-pil na het opstaan, tip (slot)', tipNa.split('. ').slice(-1)[0]);
      t(!/♥/.test(aeg().textContent) && tipNa.includes('Zijn noodrantsoen is op: valt hij nog eens, dan blijft hij liggen.'), `na het opstaan: geen ♥ meer ("${aeg().textContent.trim()}"), "zijn noodrantsoen is op"`);
      verliesHp(v, v.hp + 5, sp());
      t(v.dood, 'Bestiarium "staat hij één keer op": de tweede val is de laatste');
      /* het noodrantsoen in ZIJN beurt: opstaan is zijn zet */
      { const r2 = await vers('slachter', 'ERF-ACC-CAT-D2'); const g2 = r2.g, v2 = r2.v;
        g2.roofGedaan = true; v2.fase = 2; v2.copyKracht = ERF.toeslag[2]; v2.plagN = 1;
        v2.gestolen = ['zware_klap', 'slag', 'slag', 'verdediging', 'knal', 'dubbelslag'].map(id => erfBuitKaart(nieuweKaart(id)));
        v2.intent = VIJANDEN[v2.id].kies(v2, 3); renderGevecht();
        const plan2 = v2.intent.plan.slice(); g2.speler.status = { doornen: 500 }; g2.speler.blok = 0; S.hp = S.maxHp;
        leeg(); g2.vijandAanZet = true;
        try { const r = v2.intent.doe(v2); if (r && r.then) await r; } finally { g2.vijandAanZet = false; }
        const opTekst = tekstVan(intentTekst(v2)), opTip = (() => { const d = document.createElement('div'); d.innerHTML = intentTekst(v2); const s = d.querySelector('.intent'); return s ? s.dataset.tip : ''; })();
        cat('pil na het opstaan in zijn beurt', opTekst + ' — ' + opTip);
        t(v2.plagiaat && !v2.dood && v2.intent.type === 'opstaan' && plan2.length === 2 && v2.gestolen.some(s => s.uid === plan2[1].uid) && stempels.length === 1 && fx.includes('🗞️ opstaan was zijn zet') && opTekst === '🗞️ opgestaan' && /dat was zijn zet: deze beurt doet hij niets meer/.test(opTip),
          `noodrantsoen in zijn beurt (jouw Doornen vellen hem op zijn eerste kaart): "${opTekst}", zijn tweede kaart speelt hij niet (${stempels.length} grote kaart), "🗞️ opstaan was zijn zet"`);
        g2.speler.status = {};
      }
      /* vloeken tellen niet: geen schoon werk naast zijn plan = geen tweede leven */
      { const r3 = await vers('slachter', 'ERF-ACC-CAT-D3'); const g3 = r3.g, v3 = r3.v;
        g3.roofGedaan = true; v3.fase = 2; v3.copyKracht = ERF.toeslag[2]; v3.plagN = 0;
        v3.gestolen = ['laster', 'laster'].map(id => erfBuitKaart(nieuweKaart(id))); v3.intent = VIJANDEN[v3.id].kies(v3, 3); renderGevecht();
        const tk = document.querySelector('#baas-balk .bb-aegis');
        t(!/♥/.test(tk.textContent) && (tk.dataset.tip || '').includes('Geen schoon werk naast zijn plan: valt hij nu, dan blijft hij liggen.'), `alleen vloeken in zijn buit: "${tk.textContent.trim()}", "geen schoon werk naast zijn plan"`);
        verliesHp(v3, v3.hp + 5, sp());
        t(v3.dood && !v3.plagiaat, '"Vloeken tellen niet": met alleen vloeken blijft hij liggen');
      }
    }
    /* ---------- E · DE FASES, DE STREEP EN DE BELOFTE (faseLock) ---------- */
    {
      const { g, v } = await vers('slachter', 'ERF-ACC-CAT-E');
      g.roofGedaan = true; v.fase = 2; v.copyKracht = ERF.toeslag[2]; v.plagN = 0;
      v.gestolen = ['zware_klap', 'slag', 'slag', 'verdediging', 'knal', 'dubbelslag', 'uithaal'].map(id => erfBuitKaart(nieuweKaart(id)));
      v.intent = VIJANDEN[v.id].kies(v, 3); renderGevecht();
      const bf = document.querySelector('#baas-balk .bb-fases'), tip = bf ? bf.dataset.tip : '';
      cat('fase-puntjes, tip', tip);
      const X = +((tip.match(/onder de streep \((\d+) HP\)/) || [])[1]);
      const ink = document.querySelector('#baas-balk .bb-inkeping');
      t(tip.includes(`Fase 2: WOEDE, vanaf de Roof — ${erfPerBeurt(2)} van jouw kaarten per beurt.`) && tip.includes(`— ${erfPerBeurt(3)} per beurt, harder.`) && ink && ink.style.left === Math.round(ERF.fase3Hp * 100) + '%',
        `fasetip: fase 2 "${erfPerBeurt(2)}", fase 3 "${erfPerBeurt(3)}" (ERF.plan), de streep op ${ink && ink.style.left}`);
      v.hp = X; checkCopycatFase(v, g); const opX = v.fase;
      v.hp = X - 1; checkCopycatFase(v, g); const onder = v.fase;
      t(opX === 2 && onder === 3, `"onder de streep (${X} HP)": op ${X} HP fase ${opX}, op ${X - 1} HP fase ${onder}`);
      /* de belofte: de streep in jouw beurt verandert zijn zet niet, de volgende zet is fase 3 */
      v.fase = 2; v.copyKracht = ERF.toeslag[2]; v.hp = X + 5; v.plagN = 0; v.intent = VIJANDEN[v.id].kies(v, 3); renderGevecht();
      const s0 = JSON.stringify(v.intent.plan), pil0 = pips(v).map(p => p.t).join(' ');
      leeg(); verliesHp(v, 10, sp());
      const fb = banners.find(b => b[0] === 'HET IS ALLEMAAL VAN MIJ');
      cat('banner HET IS ALLEMAAL VAN MIJ', fb ? fb[1] : '-');
      t(v.fase === 3 && JSON.stringify(v.intent.plan) === s0 && fb && fb[1] === `${u.fase3} · vanaf zijn volgende zet ${erfPerBeurt(3)} kaarten per beurt, harder`, `fase 3 in jouw beurt: de banner zegt "vanaf zijn volgende zet ${erfPerBeurt(3)} kaarten per beurt", en zijn pil blijft "${pil0}" (faseLock)`);
      v.plagN = 1; const nieuw = VIJANDEN[v.id].kies(v, 4);
      const k0 = nieuw.plan.find(k => k.soort === 'aanval');
      const n0 = k0 ? kval(Object.assign(nieuweKaart(k0.id), { up: k0.up }), 'dmg') : 0;
      t(ERF.plan[3].includes(nieuw.plan.length) && k0 && k0.eindDmg === Math.min(ERF.cap[3], Math.max(1, actS(Math.round(n0 * ERF.mult) + ERF.toeslag[3]))), `zijn volgende zet: ${nieuw.plan.length} kaarten (ERF.plan[3] = [${ERF.plan[3]}]), ${k0 && k0.naam} voor ${k0 && k0.eindDmg} (cap ${ERF.cap[3]}, toeslag ${ERF.toeslag[3]}: "harder")`);
    }
    /* ---------- F · NAROOF EN UITPUTTING ---------- */
    {
      const { g, v } = await vers('slachter', 'ERF-ACC-CAT-F');
      g.roofGedaan = true; g.roofBeurt = false; v.fase = 2; v.copyKracht = ERF.toeslag[2]; v.gestolen = []; v.status = {}; g.speler.status = {};
      g.trek = ['slag', 'slag', 'verdediging', 'verdediging', 'knal', 'zware_klap', 'slag', 'laster'].map(id => nieuweKaart(id));
      v.intent = VIJANDEN[v.id].kies(v, 3); renderGevecht();
      const p = pips(v)[0] || {}; cat('pil naroof', p.t + ' — ' + p.tip);
      const N = +((p.tip || '').match(/grist (\d+) kaart/) || [])[1], verwacht = Math.max(0, Math.min(8 - ERF.roofRest, Math.ceil(8 * ERF.naroofDeel)));
      t(v.intent.type === 'steel' && p.t === '👀 naroof' && N === verwacht && ERF.naroofDeel === 0.5 && /\(de helft\)/.test(p.tip) && /geen schade deze beurt/.test(p.tip), `naroof: "${p.t}", "hij grist ${N} kaarten (de helft)" = ceil(8 × ${ERF.naroofDeel}) = ${verwacht}`);
      leeg(); const hp0 = S.hp; v.intent.doe(v);
      const nb = banners.find(b => b[0] === 'NAROOF'); cat('banner NAROOF', nb ? nb[1] : '-');
      t(v.gestolen.length === N && nb && nb[1] === `🎭 „Nog niet leeg?” — hij grist nóg ${N} kaarten uit je trekstapel.` && S.hp === hp0, `NAROOF: "${nb && nb[1]}", hij grist er ${v.gestolen.length}, geen schade`);
      v.gestolen = []; g.trek = [nieuweKaart('slag'), nieuweKaart('slag')];
      v.intent = VIJANDEN[v.id].kies(v, 4); renderGevecht();
      const q = pips(v)[0] || {}; cat('pil uitputting', q.t + ' — ' + q.tip);
      const D = glasDmg(actDmg(ERF.uitput[0] + v.fase * ERF.uitput[1]) + (v.status.kracht || 0));
      t(v.intent.type === 'aanval' && g.trek.length < ERF.naroofMin && q.t === `⚔️ ${D}` && q.tip === `${v.intent.naam}: valt jou aan voor ${D} schade`, `uitputting (trekstapel ${g.trek.length} < ${ERF.naroofMin}): "${q.t}" = (${ERF.uitput[0]} + ${ERF.uitput[1]} × fase ${v.fase}) act-geschaald`);
      leeg(); g.speler.blok = 0; const hp1 = S.hp; vijandAanval(v, v.intent.dmg); v.intent.doe(v);
      const mel = meldingen.find(m => /te dun om nog te grissen/.test(m)); cat('melding uitputting', mel || '-');
      t(hp1 - S.hp === D && mel === '🎭 Je trekstapel is te dun om nog te grissen — hij is uitgeput. Maak hem af.', `uitputting: landt ${hp1 - S.hp} (pil ${D}), "${mel}"`);
    }
    /* ---------- G · BESTIARIUM, FAKKELTIP, DEV ---------- */
    {
      const b = (typeof BESTIARIUM !== 'undefined' && BESTIARIUM.de_erfprins) || {};
      cat('Bestiarium, lore', b.lore); cat('Bestiarium, notitie', b.notitie);
      t(/halve dek/.test(b.lore) && /de helft van je dek/.test(b.notitie) && ERF.roofDeel === 0.5 && /Je eerste klap sluit je beurt/.test(b.notitie), 'Bestiarium: "je halve dek" / "je eerste klap sluit je beurt en kost je de helft van je dek" (ERF.roofDeel 0,5)');
      t(/jouw Kracht en Doornen worden de zijne/.test(b.notitie) && ERF.spiegel.kracht > 0 && ERF.spiegel.doornen > 0 && /Een vloek laat zich niet kopiëren/.test(b.notitie) && erfBuitKaart(nieuweKaart('laster')).soort === 'vloek' && /staat hij één keer op/.test(b.notitie),
        'Bestiarium: het Spiegelrecht (Kracht en Doornen), de vloek en "één keer op" kloppen met ERF en de code');
      const { g, v } = await vers('slachter', 'ERF-ACC-CAT-G');
      renderTopbalk(); const ft = (document.getElementById('tb-fakkel') || {}).dataset || {};
      cat('fakkeltip', ft.tip || '-');
      S.fakkel = 0; const donker = tekstVan(intentTekst(v)); S.fakkel = fakkelMax();
      t(/een baas telegrafeert altijd/.test(ft.tip || '') && !/❓/.test(donker) && lichtNiveau() !== 'gedoofd', `fakkeltip "een baas telegrafeert altijd": bij fakkel 0 blijft zijn pil "${donker}"`);
      const devItem = DEV_MENU.flatMap(s => s.items || []).find(i => i.label === '🤴 Erfprins');
      const res = [];
      for (const extra of [0, 6, 7]) {
        nieuwSpel('slachter', 'ERF-ACC-DEV-' + extra);
        for (let i = 0; i < extra; i++) S.dek.push(nieuweKaart('slag'));
        const voor = S.dek.length; meldingen.length = 0; devErfprins();
        res.push({ voor, na: S.dek.length, hp: S.hp, max: S.maxHp, dranken: S.dranken.slice(), mel: meldingen.find(m => /DEV: meteen tegen de Erfprins/.test(m)) || '' });
        document.querySelectorAll('#baas-intro').forEach(n => n.remove());
      }
      cat('DEV-menu, tip', devItem ? devItem.tip : '-'); cat('DEV-melding', res[0].mel);
      t(devItem && /85 % HP, 1 heeldrank\) en een dek van minstens 18/.test(devItem.tip) && res.every(r => r.na >= 18 && r.hp === Math.round(r.max * 0.85) && r.dranken.length === 1 && r.dranken[0] === 'heeldrank' && /85 % HP, 1 heeldrank, dek van minstens 18/.test(r.mel)),
        `DEV-sprong (W13): 85 % HP, 1 heeldrank, dek van minstens 18 — dekken ${res.map(r => r.voor + '->' + r.na).join(', ')}, HP ${res.map(r => r.hp + '/' + r.max).join(', ')}`);
    }
    /* ---------- H · TIK OM OVER TE SLAAN (vanaf de tweede ontmoeting), in echte tijd ---------- */
    traag();
    {
      const { g, v } = await vers('slachter', 'ERF-ACC-CAT-H');
      const tip = intentEl(v).querySelector('.intent-roof').dataset.tip;
      const N = +((tip.match(/pakt hij (?:de helft van je dek: )?(\d+) kaart(?:en)?\b/) || [])[1]);
      const t0 = performance.now(); const p = copycatDeRoof(g);
      await wachtTot(() => !!document.querySelector('.roof-overlay.open:not(.buit-overlay)'), 6000);
      const ov = document.querySelector('.roof-overlay.open'); const hint = ov ? ov.querySelector('.roof-hint') : null;
      cat('tik-hint op het Roof-doek', hint ? hint.textContent : '-');
      if (ov) ov.click();
      await p; const dt = (performance.now() - t0) / 1000;
      t(hint && hint.textContent === 'tik om over te slaan' && dt < 4.5 && v.gestolen.length === N, `"tik om over te slaan" op de Roof (3e ontmoeting): na een tik klaar in ${dt.toFixed(1)} s (zonder tik ±${(1.9 + N * ERF.roofKaartMs / 1000).toFixed(0)} s), dezelfde ${v.gestolen.length}/${N} kaarten`);
      await vrij(g);
      if (v.intent && v.intent.type === 'buit') {
        const t1 = performance.now(); const p2 = v.intent.doe(v);
        await wachtTot(() => !!document.querySelector('.buit-overlay.open'), 4000);
        const ov2 = document.querySelector('.buit-overlay.open'); const h2 = ov2 ? ov2.querySelector('.roof-hint') : null;
        /* meteen de tegels lezen: de aangewezen kaart = de eerste van zijn pil straks */
        const kop = ov2 ? ov2.querySelector('.roof-kop').childNodes[0].textContent.trim() : '', klein = ov2 ? (ov2.querySelector('.roof-kop small') || {}).textContent : '';
        const gek = ov2 ? [...ov2.querySelectorAll('.roof-kaart.gekozen')] : [];
        const tegel = gek[0] ? gek[0].querySelector('.rk-naam') : null;
        const tNaam = tegel ? tegel.childNodes[0].textContent.trim() : '', tGetal = tegel && tegel.querySelector('b') ? tegel.querySelector('b').textContent.trim() : '';
        const tegels = ov2 ? ov2.querySelectorAll('.roof-kaart').length : 0;
        cat('buit-beat, kop', kop + ' · ' + klein); cat('buit-beat, de aangewezen tegel', tNaam + ' · ' + tGetal);
        if (ov2) ov2.click();
        await p2; const dt2 = (performance.now() - t1) / 1000;
        v.intent = VIJANDEN[v.id].kies(v, 2); renderGevecht();
        const e0 = v.intent.plan[0], pip0 = (pips(v)[0] || {}).t || '';
        const stempel0 = e0.soort === 'aanval' ? '⚔️ ' + pip0.replace(/^🎭 /, '') : (e0.soort === 'spiegel' ? pip0.replace(/^🎭 /, '') : pip0);
        t(h2 && dt2 < 1.6, `"tik om over te slaan" op de buit-beat: klaar in ${dt2.toFixed(1)} s (zonder tik ${((ERF.buitMs + 520) / 1000).toFixed(1)} s)`);
        t(kop === `🧐 ZIJN BUIT · ${v.gestolen.length} KAARTEN` && (u.buit || []).includes(klein) && gek.length === 1 && tegels === v.gestolen.length && tNaam === erfNaam(e0) && tGetal === stempel0,
          `buit-beat: "${kop}", de vinger wijst "${tNaam} · ${tGetal}" aan = de eerste kaart van zijn pil ("${pip0}")`);
      } else t(false, `na de Roof verwacht de buit-beat, kreeg "${v.intent && v.intent.type}"`);
    }
    /* ---------- I · VERBODEN WOORDEN in alles wat hij zegt en toont ---------- */
    {
      snel();
      const alle = [...lijst.map(x => x[1]), ...Object.values(u).flatMap(x => Array.isArray(x) ? x : (typeof x === 'object' ? Object.values(x) : [x])),
        ...(arg && arg.vechtTeksten || [])].filter(x => typeof x === 'string');
      /* de oude, geparkeerde metgezel-regels (orakel, doodGebroken, dossier) blijven als data staan, achter metgezellenAan() */
      const geparkeerd = new Set([...(u.orakel || []), u.doodGebroken, u.dossier]);
      const verboden = /beste kaarten|verbrandt ze|Overleef tot|\bDrops\b|metgezel|bondgenoot|\bpoort\b|kaatst|×\s?2,5|PLAGIAATFASE|versterkt zichzelf|verzwakt jou|Wanhoopsklap|HERINDEX|machine gebroken/i;
      const fout = [...new Set(alle.filter(x => !geparkeerd.has(x) && verboden.test(x)))];
      t(fout.length === 0 && alle.length > 60, `geen verboden woord in ${alle.length} teksten (catalogus, al zijn uitspraken, ${(arg && arg.vechtTeksten || []).length} teksten uit de echte gevechten)` + (fout.length ? ' — ' + fout.slice(0, 4).map(x => '"' + x.slice(0, 70) + '"').join(' | ') : ''));
    }
  } catch (e) {
    t(false, 'de catalogus brak af: ' + (e && e.stack ? String(e.stack).slice(0, 400) : e));
  } finally {
    traag(); window.mobiel = mob0;
    window.baasFaseMoment = oB; window.melding = oM; window.fxNummer = oF; window.baasSpreekt = oS; window.copycatToonGespeeld = oT; window.copycatRoofCutscene = oCut;
  }
  return { R, lijst };
}

async function catalogus(browser, vechtTeksten) {
  const R = []; const t = (g, s) => R.push([!!g, s]);
  const { ctx, page, vp } = await open(browser, 'L1440');
  const res = await page.evaluate(catalogusInPagina, { vechtTeksten: vechtTeksten || [] });
  for (const [w, x] of res.lijst) R.push([true, `TEKST · ${w}: "${x.length > 170 ? x.slice(0, 170) + '…' : x}"`]);
  for (const r of res.R) R.push(r);
  fouten(page, t, vp, 'tekstcatalogus');
  await ctx.close();
  return { kop: `De tekstcatalogus: ${res.lijst.length} speler-teksten over de Erfprins, getoetst aan de code (bazen_plan §8)`, regels: R };
}

/* ============================================================
   6 · B1.7 het orakel valt niet samen met een banner (orakel ∩ .baas-flits = 0 ms)
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
  const t0 = Date.now();
  /* fase A: de gevechten eerst en alleen (ze vullen de CPU; de regie meet tijd en licht) */
  let A = { blokken: [], vechtTeksten: [], bannerLangst: {} };
  if (!FILTER || FILTER.test('gevechten')) {
    try { A = await gevechten(browser); }
    catch (e) { A = { blokken: [{ kop: 'De gevechten', regels: [[false, 'de gevechten braken af: ' + (e.stack || e.message)]] }], vechtTeksten: [], bannerLangst: {} }; }
    process.stderr.write(`  [${Math.round((Date.now() - t0) / 1000)} s] klaar: de gevechten\n`);
  }
  const taken = [
    ...['M800', 'M846', 'L1440', 'L1440d3', 'L1366', 'L1366d3', 'P412'].map(fk => ['regie ' + fk, () => regie(browser, fk, A.bannerLangst)]),
    ...['M800', 'M846', 'L1440', 'L1440d3', 'L1366d3', 'P412'].map(fk => ['inventaris ' + fk, () => inventaris(browser, fk)]),
    ['tekst', () => tekst(browser)],
    ['catalogus', () => catalogus(browser, A.vechtTeksten)],
    ...[['M800', true], ['M800', false], ['L1440', true], ['L1440d3', false]].map(([fk, klap]) => ['orakel ' + fk, () => orakelTijd(browser, fk, klap)])
  ].filter(([n]) => !FILTER || FILTER.test(n)).map(([, f]) => f);
  const uit = new Array(taken.length); let i = 0;
  await Promise.all(Array.from({ length: PAR }, async () => {
    while (i < taken.length) {
      const k = i++;
      try { uit[k] = await taken[k](); } catch (e) { uit[k] = { kop: 'taak ' + k, regels: [[false, 'taak brak af: ' + e.message]] }; }
      process.stderr.write(`  [${Math.round((Date.now() - t0) / 1000)} s] klaar: ${uit[k].kop}\n`);
    }
  }));
  let ok = 0, fout = 0;
  for (const u of A.blokken.concat(uit)) {
    console.log('\n== ' + u.kop + ' ==');
    for (const [g, s] of u.regels) { g ? ok++ : fout++; console.log('   ' + (g ? 'ok   ' : 'FOUT ') + s); }
  }
  console.log('\n============================================');
  console.log(fout ? fout + ' FOUT(EN), ' + ok + ' ok' : 'ALLES GROEN — ' + ok + ' controles');
  console.log(`(${Math.round((Date.now() - t0) / 1000)} s)`);
  console.log('============================================');
  await browser.close();
  process.exit(fout ? 1 : 0);
})();
