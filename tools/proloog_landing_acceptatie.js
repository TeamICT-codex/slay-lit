// PROLOOG R1 · DE NAAD — acceptatie van de GAME-KANT (js/proloog-brug.js), met een STUB-proloog.
// De echte proloog (proloog/*.js) wordt hier bewust vervangen door een stub die na 500 ms
// klaar() roept met een vaste uitkomst, zodat deze suite de brug meet los van de inhoud:
// titel -> proloog -> kaart zonder herlaad, de landing (plan par. 3), de poorten, de gate,
// herbeleven, de ?proloog=1-route, de laadfout, reduced motion, de drankslots en de Codex.
// Elke regel toont de GEMETEN waarde.
//
// Draaien (vanuit de scratchpad met playwright + pngjs in node_modules):
//   NODE_PATH="$PWD/node_modules" SLAYIT_WORKTREE="...\SLAY-IT-proloog" \
//   SLAYIT_SHOTS="$PWD/proloog_landing_shots" node "...\SLAY-IT-proloog\tools\proloog_landing_acceptatie.js"
// Serveert de worktree vanaf schijf via route.fulfill op localhost:4173 (geen echte server).
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
let PNG = null; try { PNG = require('pngjs').PNG; } catch (e) { /* plaatdiff wordt dan overgeslagen */ }
const WT = process.env.SLAYIT_WORKTREE || 'C:\\Users\\Thomas Aelbrecht\\Desktop\\Workspace\\SLAY-IT-proloog';
const UIT = process.env.SLAYIT_SHOTS || path.join(__dirname, 'proloog_landing_shots'); fs.mkdirSync(UIT, { recursive: true });
const HOST = 'localhost:4173';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));
let okN = 0, foutN = 0;
const t = (goed, tekst) => { if (goed) { okN++; console.log('   ok   ' + tekst); } else { foutN++; console.log('   FOUT ' + tekst); } };

/* ---------- de stub: gedraagt zich naar het contract van window.Proloog ---------- */
const STUB = `/* STUB-proloog (tools/proloog_landing_acceptatie.js) */
window.Proloog = (function () {
  var actief = false, o = null, tm = null;
  window.__plLog = window.__plLog || [];
  function kool() { return { x: window.innerWidth / 2, y: window.innerHeight * 0.6 }; }
  return {
    start: function (opts) {
      o = opts; actief = true;
      window.__plLog.push({ start: { herbeleef: !!opts.herbeleef, hoofdstuk: opts.hoofdstuk === undefined ? null : opts.hoofdstuk, host: opts.host && opts.host.id, modus: opts.host && opts.host.dataset.modus } });
      var R = opts.host.shadowRoot || opts.host.attachShadow({ mode: 'open' });
      var k = kool();
      R.innerHTML = '<style>:host{all:initial}.s{position:fixed;inset:0;background:#07060a}.k{position:absolute;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:#ffb35c;box-shadow:0 0 10px 3px rgba(255,140,50,.75)}</style><div class="s"><div class="k" style="left:' + k.x + 'px;top:' + k.y + 'px"></div></div>';
      try { var kp = window.Klank && Klank.koppel && Klank.koppel(); window.__plKoppel = kp && kp.ctx ? 'ctx' : 'geen'; window.__plBus = !!(kp && (kp.bus || kp.uit)); } catch (e) { window.__plKoppel = 'fout ' + e.message; }
      var modus = window.__plStubModus || 'klaar';
      tm = setTimeout(function () {
        window.__plKlaarT = performance.now();
        if (modus === 'over') { if (o.over) o.over(); return; }
        if (!o.herbeleef) {
          var c = { v: 2, held: 'gifmagier', masker: 'gif', uitweg: 'sprong', jeugddroom: 'brandweerman', glimlachen: 7, fotoKantoor: 1, zelfGestempeld: true, wachtToon: -7, echo: 0 };
          try { localStorage.setItem('slayit_proloog', JSON.stringify(c)); } catch (e) {}
          o.klaar({ held: window.__plStubHeld || 'gifmagier', masker: 'gif', kooltje: kool(), contract: c });
        } else o.klaar({ held: 'gifmagier', masker: 'gif', kooltje: kool(), contract: null });
      }, 500);
    },
    stop: function () { actief = false; clearTimeout(tm); window.__plLog.push({ stop: true }); if (o && o.host && o.host.shadowRoot) o.host.shadowRoot.innerHTML = ''; },
    slaOver: function () {},
    hoofdstukken: [{ hoofdstuk: 0, naam: 'Maandag, 06:42' }, { hoofdstuk: 1, naam: 'De CRT degausst' }, { hoofdstuk: 2, naam: 'Het Glimlachquotum' }, { hoofdstuk: 3, naam: 'Het Functioneringsgesprek' }, { hoofdstuk: 'factuur', naam: 'De Eindafrekening' }, { hoofdstuk: 'val', naam: 'In de wacht' }, { hoofdstuk: 'afgrond', naam: 'De Afgrond' }],   /* R3: de namen van 1 en 2 volgen proloog/data.js */
    get actief() { return actief; }
  };
})();`;

async function open(browser, vp, opties) {
  opties = opties || {};
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: !!vp.m, hasTouch: !!vp.m, serviceWorkers: 'block', reducedMotion: opties.rustig ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(() => {
    window.__acN = 0;
    const O = window.AudioContext || window.webkitAudioContext;
    if (O) {
      const W = class extends O { constructor(...a) { super(...a); window.__acN++; } };
      window.AudioContext = W; window.webkitAudioContext = W;
    }
  });
  const page = await ctx.newPage(); page.__f = []; page.__nav = 0; page.__proloogReq = 0;
  page.on('pageerror', e => page.__f.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/rest\/v1|Failed to load resource|supabase/i.test(m.text())) page.__f.push('console: ' + m.text()); });
  page.on('framenavigated', f => { if (f === page.mainFrame()) page.__nav++; });
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.host !== HOST) return route.abort();
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
    if (/^proloog\/.+\.js$/.test(rel)) {
      page.__proloogReq++;
      if (opties.laadFout && rel === 'proloog/proloog.js') return route.fulfill({ status: 404, body: 'weg' });
      if (rel === 'proloog/proloog.js') return route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB });
      return route.fulfill({ status: 200, contentType: 'text/javascript', body: '/* stub: ' + rel + ' */' });
    }
    let f = path.join(WT, rel.split('/').join(path.sep));
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) return route.fulfill({ status: 404, body: 'weg' });
    return route.fulfill({ status: 200, contentType: MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  await page.goto('http://' + HOST + '/', { waitUntil: 'load' });
  await page.evaluate(opslag => {
    localStorage.clear();
    localStorage.setItem('slayit_wipe', '1'); localStorage.setItem('slayit_nudge_v2', 'weg'); localStorage.setItem('slayit_wereld', '0');
    Object.entries(opslag || {}).forEach(([k, v]) => localStorage.setItem(k, v));
  }, opties.opslag || null);
  await page.goto('http://' + HOST + '/' + (opties.query || ''), { waitUntil: 'load' });
  await slaap(700);
  page.__nav = 0;
  page.__proloogReq = 0;
  await page.evaluate(() => {
    window.__schermLog = [document.body.dataset.scherm];
    new MutationObserver(() => {
      const s = document.body.dataset.scherm;
      if (window.__schermLog[window.__schermLog.length - 1] !== s) window.__schermLog.push(s);
    }).observe(document.body, { attributes: true, attributeFilter: ['data-scherm'] });
  });
  return { ctx, page };
}

const knopNieuw = async (page, vp) => {
  const k = page.locator('#scherm-titel .knop-groot', { hasText: 'Nieuw avontuur' });
  if (vp.m) await k.tap(); else await k.click();
};
const wachtOp = async (page, fn, ms, arg) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return Date.now() - t0; await slaap(50); }
  return -1;
};
const STAND = () => {
  const tb = document.getElementById('topbalk');
  const tbs = getComputedStyle(tb);
  const sl = document.getElementById('proloog-sluier');
  const chip = document.getElementById('tb-fakkel');
  const dl = document.querySelector('#tb-dranken .drank-leeg');
  let jd = null; try { jd = jeugddroomTekst(); } catch (e) { jd = 'FOUT'; }
  return {
    scherm: document.body.dataset.scherm,
    log: (window.__schermLog || []).join(' > '),
    held: (typeof S !== 'undefined' && S) ? S.held : null,
    fakkel: (typeof S !== 'undefined' && S) ? S.fakkel : null,
    save: !!localStorage.getItem('slayit_save_v1'),
    klaar: localStorage.getItem('slayit_proloog_klaar'),
    contract: localStorage.getItem('slayit_proloog'),
    jeugddroom: jd,
    tbDisplay: tbs.display, tbTransform: tbs.transform, tbTop: Math.round(tb.getBoundingClientRect().top),
    chip: chip ? chip.textContent.trim() : null,
    sluierToon: sl ? sl.classList.contains('toon') : null, sluierKind: sl ? sl.children.length : null,
    bodyPl: [...document.body.classList].filter(c => /^pl-/.test(c)).join(','),
    kaartTransform: document.getElementById('scherm-kaart').style.transform || '',
    vignet: getComputedStyle(document.getElementById('licht-vignet')).opacity,
    bezig: typeof proloogBezig === 'function' ? proloogBezig() : 'geen',
    stops: (window.__plLog || []).filter(x => x.stop).length,
    starts: (window.__plLog || []).filter(x => x.start).map(x => x.start),
    acN: window.__acN, koppel: window.__plKoppel || null, bus: !!window.__plBus,
    scrollH: document.documentElement.scrollHeight, scrollTop: document.scrollingElement.scrollTop, innerH: window.innerHeight,
    drankLeeg: dl ? { tip: dl.dataset.tip, n: dl.querySelectorAll('i').length } : null,
    voorkeur: [...document.querySelectorAll('.held-kaart.voorkeur')].map(e => e.dataset.held).join(','),
    url: location.pathname + location.search
  };
};
const stand = page => page.evaluate(STAND);

function diffPng(a, b) {
  if (!PNG) return null;
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return 255;
  let som = 0;
  for (let i = 0; i < A.data.length; i += 4) som += Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]);
  return som / (A.width * A.height * 3);
}

(async () => {
  const browser = await chromium.launch();
  const VPS = [{ n: 'laptop', w: 1440, h: 900 }, { n: 'liggend', w: 800, h: 360, m: true }, { n: 'staand', w: 412, h: 915, m: true }];

  /* ============================================================
     1 · DE HOOFDROUTE per viewport: titel -> proloog -> kaart, zonder herlaad
     ============================================================ */
  for (const vp of VPS) {
    console.log(`\n== 1 · ${vp.n} ${vp.w}x${vp.h} · titel -> proloog -> kaart ==`);
    const { ctx, page } = await open(browser, vp);
    const tTik = Date.now();
    await knopNieuw(page, vp);
    /* de heenweg: het titelvuur dooft, 400 ms zwart, dan scherm 'proloog' */
    await slaap(350);
    const heen = await page.evaluate(() => ({ dooft: document.body.classList.contains('pl-dooft'), scherm: document.body.dataset.scherm }));
    t(heen.dooft && heen.scherm === 'titel', `${vp.n}: na de tik dooft eerst het titelvuur (body.pl-dooft ${heen.dooft}, scherm "${heen.scherm}")`);
    const totProloog = await wachtOp(page, () => document.body.dataset.scherm === 'proloog', 4000);
    t(totProloog >= 0, `${vp.n}: scherm 'proloog' na ${totProloog + 350} ms (plan: 500 ms doven + 400 ms zwart)`);
    const inP = await page.evaluate(() => ({
      host: !!document.getElementById('scherm-proloog').shadowRoot,
      hostRect: (r => [r.left, r.top, r.width, r.height].map(Math.round))(document.getElementById('scherm-proloog').getBoundingClientRect()),
      tb: getComputedStyle(document.getElementById('topbalk')).display,
      modus: document.getElementById('scherm-proloog').dataset.modus, body: document.body.dataset.modus,
      muziek: window.Klank && Klank.huidigeScene
    }));
    t(inP.host && inP.hostRect[0] === 0 && inP.hostRect[1] === 0 && inP.hostRect[2] === vp.w && inP.hostRect[3] === vp.h,
      `${vp.n}: de proloog draait in een shadow root op #scherm-proloog, schermvullend ${JSON.stringify(inP.hostRect)}`);
    t(inP.tb === 'none' && inP.modus === inP.body && inP.muziek === 'stil', `${vp.n}: topbalk verborgen (${inP.tb}), data-modus gespiegeld op de host (${inP.modus}), muziekscène "${inP.muziek}"`);
    await page.screenshot({ path: path.join(UIT, vp.n + '-1-proloog.png') });
    /* de landing: klaar() komt na 500 ms; screenshots op de plan-momenten */
    const kT = await wachtOp(page, () => !!window.__plKlaarT, 3000);
    t(kT >= 0, `${vp.n}: de stub riep klaar() (${kT} ms na scherm 'proloog')`);
    const tKlaar = Date.now();
    const opT = async ms => { const w = ms - (Date.now() - tKlaar); if (w > 0) await slaap(w); };
    await opT(60);
    let s = await stand(page);
    t(s.sluierToon && s.scherm === 'kaart' && s.save && s.held === 'gifmagier', `${vp.n}: T 1,5 — sluier dicht (${s.sluierToon}), erachter al kiesHeldEcht: scherm "${s.scherm}", S.held "${s.held}", save ${s.save}`);
    t(/pl-landt/.test(s.bodyPl) && s.stops >= 1 && s.klaar === '1', `${vp.n}: body.pl-landt (${s.bodyPl}), Proloog.stop() ${s.stops}x, slayit_proloog_klaar = ${s.klaar}`);
    await opT(1150);
    await page.screenshot({ path: path.join(UIT, vp.n + '-2-titel-brandt.png') });
    const titel = await page.evaluate(() => {
      const ti = document.querySelector('#proloog-sluier .pl-titel'), tg = document.querySelector('#proloog-sluier .pl-tagline');
      const k = document.querySelector('#proloog-sluier .pl-kooltje');
      return {
        letters: document.querySelectorAll('#proloog-sluier .pl-letter.brand').length,
        font: ti ? Math.round(parseFloat(getComputedStyle(ti).fontSize)) : null,
        tagFont: tg ? Math.round(parseFloat(getComputedStyle(tg).fontSize)) : null,
        titelOnder: ti ? Math.round(ti.getBoundingClientRect().bottom) : null,
        tagOnder: tg ? Math.round(tg.getBoundingClientRect().bottom) : null,
        tagRechts: tg ? Math.round(tg.getBoundingClientRect().right) : null, tagLinks: tg ? Math.round(tg.getBoundingClientRect().left) : null,
        titelRechts: ti ? Math.round(ti.getBoundingClientRect().right) : null, titelLinks: ti ? Math.round(ti.getBoundingClientRect().left) : null,
        koolY: k ? Math.round(k.getBoundingClientRect().top + k.getBoundingClientRect().height / 2) : null
      };
    });
    t(titel.letters === 7, `${vp.n}: T 2,6 — alle 7 letters van SLAY LIT ingebrand (${titel.letters})`);
    t(titel.tagOnder < titel.koolY && titel.titelLinks >= 0 && titel.titelRechts <= vp.w && titel.tagLinks >= 0 && titel.tagRechts <= vp.w,
      `${vp.n}: titel ${titel.font} px / tagline ${titel.tagFont} px, volledig in beeld (x ${titel.titelLinks}-${titel.titelRechts}) en boven het kooltje (tagline tot y ${titel.tagOnder} < kooltje ${titel.koolY})`);
    await opT(3300);
    await page.screenshot({ path: path.join(UIT, vp.n + '-3-vonken.png') });
    await opT(4400);
    await page.screenshot({ path: path.join(UIT, vp.n + '-4-onthulling.png') });
    const onthul = await page.evaluate(() => ({
      mask: (document.querySelector('#proloog-sluier .pl-doek') || {}).style ? document.querySelector('#proloog-sluier .pl-doek').style.maskImage || document.querySelector('#proloog-sluier .pl-doek').style.webkitMaskImage : '',
      tf: document.getElementById('scherm-kaart').style.transform, origin: document.getElementById('scherm-kaart').style.transformOrigin,
      held: (r => [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)])(document.getElementById('kaart-held').getBoundingClientRect())
    }));
    t(/radial-gradient/.test(onthul.mask) && onthul.tf === 'scale(1)' && !!onthul.origin,
      `${vp.n}: T 5,1-6,7 — radiaal masker vanuit het kooltje en #scherm-kaart 1,35 -> 1 met oorsprong ${onthul.origin} (held op ${onthul.held.join(',')})`);
    await opT(6400);
    await page.screenshot({ path: path.join(UIT, vp.n + '-5-topbalk-fakkel.png') });
    await opT(8600);
    s = await stand(page);
    await page.screenshot({ path: path.join(UIT, vp.n + '-6-speelbaar.png') });
    t(s.log === 'titel > proloog > kaart', `${vp.n}: body.dataset.scherm: ${s.log}`);
    t(page.__nav === 0, `${vp.n}: 0x framenavigated (gemeten ${page.__nav}), url "${s.url}"`);
    t(s.held === 'gifmagier' && s.jeugddroom === 'brandweerman', `${vp.n}: S.held = "${s.held}" (het masker), jeugddroomTekst() = "${s.jeugddroom}"`);
    t(!s.sluierToon && s.sluierKind === 0 && s.bodyPl === '' && s.kaartTransform === '' && s.bezig === false,
      `${vp.n}: T 8,5 — sluier weg (${s.sluierToon}, ${s.sluierKind} kinderen), geen pl-klassen ("${s.bodyPl}"), kaart zonder transform, proloogBezig ${s.bezig}`);
    t(s.tbDisplay === 'flex' && s.tbTransform === 'none' && s.tbTop === 0, `${vp.n}: topbalk terug (display ${s.tbDisplay}, transform ${s.tbTransform}, top ${s.tbTop})`);
    t(s.fakkel === 80 && /80/.test(s.chip), `${vp.n}: fakkel ${s.fakkel}, chip "${s.chip}"`);
    t(s.acN <= 1 && s.koppel === 'ctx' && s.bus, `${vp.n}: ${s.acN} AudioContext, Klank.koppel() gaf de context (${s.koppel}) en een bus (${s.bus})`);
    t(s.scrollH <= s.innerH + 1 && s.scrollTop === 0, `${vp.n}: geen paginascroll (scrollHeight ${s.scrollH} / ${s.innerH}, scrollTop ${s.scrollTop})`);
    t(!!s.drankLeeg && s.drankLeeg.n === 3 && /lege flesplaats/.test(s.drankLeeg.tip || ''), `${vp.n}: lege drankslots: ${s.drankLeeg ? s.drankLeeg.n + ' flesjesomtrekken, tip "' + s.drankLeeg.tip + '"' : 'GEEN .drank-leeg'}`);
    const dlZicht = await page.evaluate(() => { const i = document.querySelector('#tb-dranken .drank-leeg i'); if (!i) return null; const r = i.getBoundingClientRect(); return { b: Math.round(r.width), h: Math.round(r.height), bg: getComputedStyle(i).backgroundImage.slice(0, 26), rechts: Math.round(r.right) }; });
    t(!!dlZicht && dlZicht.b >= 10 && dlZicht.h >= 14 && /svg/.test(dlZicht.bg) && dlZicht.rechts <= vp.w, `${vp.n}: een flesjesomtrek is ${dlZicht && dlZicht.b}x${dlZicht && dlZicht.h}px, svg-achtergrond, in beeld (rechts ${dlZicht && dlZicht.rechts})`);
    await slaap(1600);   /* het vignet vloeit in 1,2 s terug */
    const vg = await page.evaluate(() => { const v = document.getElementById('licht-vignet'); return { css: getComputedStyle(v).opacity, inline: v.style.opacity }; });
    t(vg.inline !== '' && Math.abs(parseFloat(vg.css) - parseFloat(vg.inline)) < 0.01, `${vp.n}: het vignet is terug op zijn fakkelstand (opacity ${vg.css}, zetLichtVisueel zegt ${vg.inline})`);
    t(page.__f.length === 0, `${vp.n}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
    /* PLAAT IDENTIEK: dezelfde seed, rechtstreeks via kiesHeldEcht, moet pixel-gelijk zijn */
    const seed = await page.evaluate(() => S.seed);
    await page.mouse.move(vp.w - 3, Math.round(vp.h * 0.55));
    await slaap(300);
    const A = await page.screenshot({ animations: 'disabled' });
    fs.writeFileSync(path.join(UIT, vp.n + '-7-na-landing.png'), A);
    const ref = await open(browser, vp, { opslag: { slayit_proloog_klaar: '1' } });
    await ref.page.evaluate(sd => { toonHeldKeuze(); document.getElementById('seed-invoer').value = sd; kiesHeldEcht('gifmagier'); }, seed);
    await slaap(2400);
    await ref.page.mouse.move(vp.w - 3, Math.round(vp.h * 0.55));
    await slaap(300);
    const B = await ref.page.screenshot({ animations: 'disabled' });
    fs.writeFileSync(path.join(UIT, vp.n + '-7-referentie.png'), B);
    const d = diffPng(A, B);
    t(d !== null && d < 2, `${vp.n}: plaat identiek aan een rechtstreekse kiesHeldEcht met seed ${seed}: gemiddeld verschil ${d === null ? 'n.v.t.' : d.toFixed(3)}/255 (< 2)`);
    await ref.ctx.close();
    await ctx.close();
  }

  /* ============================================================
     2 · TIK = NAAR HET EIND (vanaf T 1,5)
     ============================================================ */
  for (const vp of [VPS[0], VPS[2]]) {
    console.log(`\n== 2 · ${vp.n} · een tik springt naar het eind ==`);
    const { ctx, page } = await open(browser, vp);
    await knopNieuw(page, vp);
    await wachtOp(page, () => !!window.__plKlaarT, 5000);
    await slaap(900);
    if (vp.m) await page.touchscreen.tap(Math.round(vp.w / 2), Math.round(vp.h / 2)); else await page.mouse.click(Math.round(vp.w / 2), Math.round(vp.h / 2));
    await slaap(150);
    const s = await stand(page);
    t(!s.sluierToon && s.bodyPl === '' && s.scherm === 'kaart' && s.tbTransform === 'none' && /80/.test(s.chip) && s.bezig === false,
      `${vp.n}: T 2,4 + tik → meteen de eindstaat: sluier ${s.sluierToon}, pl "${s.bodyPl}", scherm "${s.scherm}", topbalk ${s.tbTransform}, chip "${s.chip}"`);
    const kamers = await page.evaluate(() => document.querySelectorAll('#scherm-einde.actief, #scherm-gevecht.actief, #scherm-event.actief').length);
    t(kamers === 0, `${vp.n}: de tik viel NIET door naar een kaartknoop (geen kamer geopend: ${kamers})`);
    t(page.__f.length === 0, `${vp.n}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f[0] : ''));
    await ctx.close();
  }
  {
    console.log('\n== 2b · laptop · Enter springt naar het eind ==');
    const { ctx, page } = await open(browser, VPS[0]);
    await knopNieuw(page, VPS[0]);
    await wachtOp(page, () => !!window.__plKlaarT, 5000);
    await slaap(1500);
    await page.keyboard.press('Enter'); await slaap(150);
    const s = await stand(page);
    t(!s.sluierToon && s.scherm === 'kaart' && s.bezig === false, `Enter tijdens de landing → eindstaat (sluier ${s.sluierToon}, scherm "${s.scherm}")`);
    await ctx.close();
  }

  /* ============================================================
     3 · DE POORTEN: veteraan / lopende run → heldkeuze met voorselectie
     ============================================================ */
  for (const geval of [
    { n: 'veteraan (Codex.runs 3)', vp: VPS[0], opslag: { slayit_codex: JSON.stringify({ runs: 3 }) } },
    { n: 'veteraan (ascensie 1) staand', vp: VPS[2], opslag: { slayit_codex: JSON.stringify({ ascensie: { slachter: 1 } }) } },
    { n: 'lopende run', vp: VPS[1], run: true }
  ]) {
    console.log(`\n== 3 · poort dicht: ${geval.n} ==`);
    const { ctx, page } = await open(browser, geval.vp, { opslag: geval.opslag });
    let voorSave = null;
    if (geval.run) {
      voorSave = await page.evaluate(() => { nieuwSpel('slachter', 'POORT-1', 0); saveSpel(); naarTitel(); return localStorage.getItem('slayit_save_v1'); });
    }
    await knopNieuw(page, geval.vp);
    await wachtOp(page, () => !!window.__plKlaarT, 5000);
    await slaap(7000);
    const s = await stand(page);
    await page.screenshot({ path: path.join(UIT, 'poort-' + geval.vp.n + '.png') });
    const inBeeld = await page.evaluate(() => {
      const k = document.querySelector('.held-kaart.voorkeur'); if (!k) return null;
      const r = k.getBoundingClientRect(), b = k.querySelector('.held-kies').getBoundingClientRect();
      const el = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), knopRaak: !!(el && el.closest('.held-kies')), knopY: Math.round(b.top), knopOnder: Math.round(b.bottom) };
    });
    t(s.scherm === 'held' && s.voorkeur === 'gifmagier', `${geval.n}: heldkeuze (scherm "${s.scherm}") met ember-rand op "${s.voorkeur}"`);
    t(!!inBeeld && inBeeld.knopRaak && inBeeld.knopOnder <= geval.vp.h, `${geval.n}: het voorgeselecteerde portret staat in beeld en 'Speel als' is volledig zichtbaar en raak via elementFromPoint (knop y ${inBeeld && inBeeld.knopY}-${inBeeld && inBeeld.knopOnder} van ${geval.vp.h})`);
    if (geval.run) {
      const naSave = await page.evaluate(() => localStorage.getItem('slayit_save_v1'));
      t(naSave === voorSave, `lopende run: de save is byte-gelijk gebleven (${naSave === voorSave}) — kiesHeldEcht is NIET gelopen`);
    } else t(!s.save, `${geval.n}: geen nieuwe run gestart (save ${s.save})`);
    t(s.klaar === '1' && !s.sluierToon && s.bezig === false, `${geval.n}: klaar-vlag ${s.klaar}, sluier weg, proloogBezig ${s.bezig}`);
    t(page.__f.length === 0, `${geval.n}: geen paginafouten` + (page.__f.length ? ' — ' + page.__f[0] : ''));
    await ctx.close();
  }

  /* ============================================================
     4 · DE GATE: wie de proloog al kent, gaat meteen naar de heldkeuze
     ============================================================ */
  for (const geval of [
    { n: "'slayit_proloog_klaar'", opslag: { slayit_proloog_klaar: '1' } },
    { n: "'slayit_proloog_over'", opslag: { slayit_proloog_over: '1' } },
    { n: 'oud contract zonder v:2 met uitweg', opslag: { slayit_proloog: JSON.stringify({ jeugddroom: 'astronaut', uitweg: 'sprong', held: 'vlucht' }) } }
  ]) {
    const { ctx, page } = await open(browser, VPS[0], { opslag: geval.opslag });
    await knopNieuw(page, VPS[0]); await slaap(700);
    const s = await stand(page);
    t(s.scherm === 'held' && page.__proloogReq === 0 && s.log === 'titel > held', `gate ${geval.n}: meteen de heldkeuze (${s.log}), ${page.__proloogReq} proloogbestanden geladen`);
    await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, VPS[0], { opslag: { slayit_proloog: JSON.stringify({ v: 2, jeugddroom: 'piloot' }) } });
    await knopNieuw(page, VPS[0]);
    const w = await wachtOp(page, () => document.body.dataset.scherm === 'proloog', 3000);
    t(w >= 0, `gate: een half v:2-contract (proloog niet uitgespeeld) → de proloog hervat (scherm 'proloog' na ${w} ms)`);
    await ctx.close();
  }

  /* ============================================================
     5 · HERBELEVEN: titelknop 'Proloog' (voor wie hem kent), Codex per hoofdstuk, DEV-menu
     ============================================================ */
  {
    console.log('\n== 5 · herbeleven ==');
    const opslag = { slayit_proloog_klaar: '1', slayit_proloog: JSON.stringify({ v: 2, jeugddroom: 'piloot', uitweg: 'geduwd', held: 'thoverk' }), slaylit_proloog_v3: JSON.stringify({ scene: 5, checkpoint: 5, choices: {}, gezien: [0, 2, 3] }) };
    const { ctx, page } = await open(browser, VPS[0], { opslag });
    const voor = await page.evaluate(() => ({ c: localStorage.getItem('slayit_proloog'), s: localStorage.getItem('slayit_save_v1'), v3: localStorage.getItem('slaylit_proloog_v3') }));
    await page.locator('#scherm-titel .knop-stil', { hasText: 'Proloog' }).click();
    await wachtOp(page, () => document.body.dataset.scherm === 'proloog', 3000);
    await wachtOp(page, () => !!window.__plKlaarT, 3000);
    await slaap(2400);
    let s = await stand(page);
    const na = await page.evaluate(() => ({ c: localStorage.getItem('slayit_proloog'), s: localStorage.getItem('slayit_save_v1'), v3: localStorage.getItem('slaylit_proloog_v3') }));
    t(s.log === 'titel > proloog > titel' && s.starts[0] && s.starts[0].herbeleef === true, `titelknop 'Proloog' (al gekend) → herbeleven: ${s.log}, start(herbeleef ${s.starts[0] && s.starts[0].herbeleef})`);
    t(na.c === voor.c && na.s === voor.s && na.v3 === voor.v3 && !s.save, `herbeleven laat contract, save en proloog-save byte-gelijk (${na.c === voor.c}/${na.s === voor.s}/${na.v3 === voor.v3}), geen run gestart`);
    t(!s.sluierToon && s.bezig === false && s.tbDisplay === 'none', `na het herbeleven: sluier weg, proloogBezig ${s.bezig}, terug op de titel`);
    /* de Codex: een blok met de gezien-hoofdstukken */
    await page.evaluate(() => toonCodex()); await slaap(900);
    const cx = await page.evaluate(() => [...document.querySelectorAll('#codex-inhoud [data-pl-hoofdstuk]')].map(b => ({ h: b.dataset.plHoofdstuk, t: b.textContent.trim() })));
    t(cx.length === 8 && cx.some(c => c.h === 'factuur'), `Codex (uitgespeeld): 'Proloog herbeleven' + alle 7 hoofdstukken uit Proloog.hoofdstukken: ${cx.map(c => '[' + c.h + '] ' + c.t).join(' · ')}`);
    await page.locator('#codex-inhoud .pl-hfst', { hasText: 'Eindafrekening' }).click().catch(() => {});
    await wachtOp(page, () => document.body.dataset.scherm === 'proloog', 3000);
    s = await stand(page);
    const laatste = s.starts[s.starts.length - 1] || {};
    t(laatste.herbeleef === true && laatste.hoofdstuk === 'factuur' && !(await page.evaluate(() => document.getElementById('overlay-codex').classList.contains('open'))),
      `Codex-hoofdstuk 'De Eindafrekening' → Proloog.start({ herbeleef: ${laatste.herbeleef}, hoofdstuk: '${laatste.hoofdstuk}' }), Codex dicht`);
    await wachtOp(page, () => !document.body.classList.contains('pl-dooft') && typeof proloogBezig === 'function' && !proloogBezig(), 5000);
    /* DEV-menu: herbeleven midden in een run → terug naar de kaart, run onaangeroerd */
    await page.evaluate(() => { nieuwSpel('thoverk', 'DEV-1', 0); renderKaartScherm(); });
    await slaap(400);
    const runVoor = await page.evaluate(() => localStorage.getItem('slayit_save_v1'));
    await page.evaluate(() => { const l = document.querySelector('.tb-logo'); if (l) l.click(); }); await slaap(300);
    await page.evaluate(() => { const b = [...document.querySelectorAll('#dev-menu .dev-k')].find(x => /De Proloog/.test(x.textContent)); if (b) b.click(); });
    await wachtOp(page, () => document.body.dataset.scherm === 'proloog', 3000);
    await wachtOp(page, () => typeof proloogBezig === 'function' && !proloogBezig() && document.body.dataset.scherm !== 'proloog', 6000);
    s = await stand(page);
    const runNa = await page.evaluate(() => localStorage.getItem('slayit_save_v1'));
    t(s.scherm === 'kaart' && s.held === 'thoverk' && runNa === runVoor && s.tbDisplay === 'flex', `DEV-menu '📼 De Proloog' midden in een run → terug op "${s.scherm}", held ${s.held}, save byte-gelijk ${runNa === runVoor}, topbalk ${s.tbDisplay}`);
    t(page.__nav === 0 && page.__f.length === 0, `herbeleven: 0x framenavigated (${page.__nav}), geen paginafouten` + (page.__f.length ? ' — ' + page.__f[0] : ''));
    await ctx.close();
  }

  {
    const { ctx, page } = await open(browser, VPS[0], { opslag: { slaylit_proloog_v3: JSON.stringify({ scene: 2, checkpoint: 'start', choices: {}, gezien: [0, 2] }) } });
    await page.evaluate(() => toonCodex()); await slaap(200);
    const voorLaden = await page.evaluate(() => [...document.querySelectorAll('#codex-inhoud .pl-hfst')].map(b => b.dataset.plHoofdstuk).join(','));
    await slaap(1200);
    const naLaden = await page.evaluate(() => [...document.querySelectorAll('#codex-inhoud .pl-hfst')].map(b => b.dataset.plHoofdstuk + '=' + b.textContent.trim()).join(' · '));
    t(voorLaden === '0,2' && /^0=1 · Maandag, 06:42 · 2=3 · Het Glimlachquotum$/.test(naLaden), `Codex (half gespeeld, gezien [0,2]): vóór het laden ${voorLaden}, daarna "${naLaden}"`);
    t(page.__f.length === 0, `Codex half gespeeld: geen paginafouten` + (page.__f.length ? ' — ' + page.__f[0] : ''));
    await ctx.close();
  }

  /* ============================================================
     6 · DE ?proloog=1-ROUTE (de stub proloog/index.html) en de laadfout
     ============================================================ */
  {
    console.log('\n== 6 · ?proloog=1 en de laadfout ==');
    const { ctx, page } = await open(browser, VPS[2], { query: '?proloog=1' });
    const w = await wachtOp(page, () => document.body.dataset.scherm === 'proloog' || !!window.__plKlaarT, 4000);
    const url = await page.evaluate(() => location.search);
    t(w >= 0 && url === '', `?proloog=1 → de proloog start na de boot (${w} ms) en de parameter is weg (search "${url}")`);
    await wachtOp(page, () => !!window.__plKlaarT, 3000);
    await slaap(8000);
    const s = await stand(page);
    t(s.scherm === 'kaart' && s.held === 'gifmagier' && page.__nav === 0, `?proloog=1 → landt op "${s.scherm}" met ${s.held}, ${page.__nav}x framenavigated`);
    t(page.__f.length === 0, `?proloog=1: geen paginafouten (ook geen fullscreen-weigering zonder gebaar)` + (page.__f.length ? ' — ' + page.__f.slice(0, 2).join(' | ') : ''));
    await ctx.close();
    /* de stub-pagina zelf zou naar '../?proloog=1' sturen: die bestaat (proloog/index.html) */
    const stubBestaat = fs.existsSync(path.join(WT, 'proloog', 'index.html'));
    t(stubBestaat, `proloog/index.html bestaat (de stub van bouwer A stuurt door naar ../?proloog=1)`);
  }
  {
    const { ctx, page } = await open(browser, VPS[0], { laadFout: true });
    await knopNieuw(page, VPS[0]);
    const w = await wachtOp(page, () => document.body.dataset.scherm === 'held', 5000);
    const s = await stand(page);
    t(w >= 0 && s.bezig === false && !/pl-/.test(s.bodyPl), `laadfout (proloog.js 404) → toch de heldkeuze na ${w} ms (${s.log}), proloogBezig ${s.bezig}`);
    const doekWeg = await page.evaluate(() => !document.getElementById('toneel-doek').classList.contains('aan'));
    t(doekWeg, `laadfout: #toneel-doek is weer open (${doekWeg})`);
    await ctx.close();
  }

  /* ============================================================
     7 · REDUCED MOTION: geen schaal, geen vonken, overvloeier 800 ms, titel 1,2 s statisch
     ============================================================ */
  for (const vp of [VPS[0], VPS[1]]) {
    console.log(`\n== 7 · ${vp.n} · reduced motion ==`);
    const { ctx, page } = await open(browser, vp, { rustig: true });
    await knopNieuw(page, vp);
    await wachtOp(page, () => !!window.__plKlaarT, 5000);
    await slaap(400);
    const r = await page.evaluate(() => ({
      statisch: !!document.querySelector('#proloog-sluier .pl-titel.statisch'),
      tf: document.getElementById('scherm-kaart').style.transform,
      vonken: document.querySelectorAll('.pl-vonk-deeltje').length,
      pl: [...document.body.classList].filter(c => /^pl-/.test(c)).join(',')
    }));
    await page.screenshot({ path: path.join(UIT, vp.n + '-rustig-titel.png') });
    t(r.statisch && r.tf === '' && r.vonken === 0 && r.pl === '', `${vp.n}: statische titel (${r.statisch}), geen schaal ("${r.tf}"), 0 vonken, geen pl-landt ("${r.pl}")`);
    const eind = await wachtOp(page, () => !document.getElementById('proloog-sluier').classList.contains('toon'), 4000);
    t(eind >= 0 && eind + 400 <= 2400, `${vp.n}: de rustige landing is klaar na ~${eind + 400} ms (1,2 s titel + 0,8 s overvloeier)`);
    const s = await stand(page);
    t(s.scherm === 'kaart' && s.held === 'gifmagier' && /80/.test(s.chip), `${vp.n}: rustig geland op "${s.scherm}", ${s.held}, chip "${s.chip}"`);
    await ctx.close();
  }

  await browser.close();
  console.log(`\n============================================\nPROLOOG-LANDING (game-kant, stub): ${okN} ok, ${foutN} FOUT\n============================================`);
  process.exit(foutN ? 1 : 0);
})();
