// STAP B (v120) - 3D-tak: draaien de drie regies ook op het Vista-toneel, zonder crash,
// met de schermlaag-effecten (doek, arena-tint, vonnis, tik-flits, bazenbalk, hitstop) en
// de camerabeats (Vista.raak/schud/pose/sterf/zetLicht)? Plaat-effecten zijn daar bewust
// hard: Vista tekent de achterwand zelf en gevechtTik overschrijft de laag elke frame.
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const WT = process.env.SLAYIT_WORKTREE || 'C:/Users/Thomas Aelbrecht/Desktop/Workspace/SLAY-IT-drama';
const HOST = 'localhost:4184';
const UIT = process.env.SLAYIT_SHOTS || path.join(__dirname, 'drama_b_shots3d'); fs.mkdirSync(UIT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));
let okN = 0, foutN = 0;
const t = (goed, tekst) => { if (goed) { okN++; console.log('   ok   ' + tekst); } else { foutN++; console.log('   FOUT ' + tekst); } };

// in-page sampler: alleen wat in 3D moet dragen
const sampler = trigger => `(function(){
  window.__log = [];
  const g = S.gevecht;
  const b = g.vijanden.find(v => v.id === 'de_dicktator');
  const t0 = performance.now();
  const tik = () => {
    const sc = document.getElementById('scherm-gevecht');
    const doek = document.getElementById('toneel-doek');
    const tint = document.getElementById('arena-tint');
    const von = document.querySelector('.vonnis');
    const balk = document.querySelector('#baas-balk .bb-balk');
    window.__log.push({
      t: Math.round(performance.now() - t0),
      doekOp: +getComputedStyle(doek).opacity,
      tintOp: +getComputedStyle(tint).opacity,
      bedrijf: sc.dataset.bedrijf || '',
      vonnis: von ? (von.querySelector('h2') || {}).textContent : null,
      flits: document.querySelectorAll('.tik-flits').length,
      hitstop: sc.classList.contains('hitstop'),
      eindDisabled: document.getElementById('knop-eindbeurt').disabled,
      hpVar: balk ? getComputedStyle(balk).getPropertyValue('--hp').trim() : null,
      camX: (window.Vista && Vista.schermPos) ? null : null,
      licht: window.__licht,
      tirade: document.body.classList.contains('tirade'),
      hp: b.hp, fase: b.fase, herrezen: !!b.herrezen
    });
  };
  window.__stop = () => clearInterval(window.__int);
  window.__int = setInterval(tik, 40);
  ${trigger}
  tik();
})()`;
const bij = (log, ms) => log.reduce((a, r) => Math.abs(r.t - ms) < Math.abs(a.t - ms) ? r : a, log[0]);

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage(); const fouten = []; const mist = [];
  page.on('pageerror', e => fouten.push(e.message));
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url()); if (u.host !== HOST) return route.abort();
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
    const f = path.join(WT, rel.split('/').join(path.sep));
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ status: 200, contentType: MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(f) });
    mist.push(rel); return route.fulfill({ status: 404, body: 'weg' });
  });
  await page.goto('http://' + HOST + '/', { waitUntil: 'load' });
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('slayit_wipe', '1'); localStorage.setItem('slayit_nudge', 'weg'); localStorage.setItem('slayit_wereld', '0'); });
  await page.reload({ waitUntil: 'load' }); await slaap(600);
  await page.evaluate(() => { INST.d3 = true; try { bewaarInst(); } catch (e) {} try { toonHeldKeuze(); } catch (e) {} }); await slaap(300);
  await page.evaluate(() => { const k = document.querySelector('.held-kies'); if (k) k.click(); }); await slaap(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /toch beginnen/i.test(x.textContent)); if (b) b.click(); }); await slaap(800);

  const opzet = async () => {
    await page.evaluate(() => { devDicktator('slachter_mid'); });
    for (let i = 0; i < 50; i++) { if (await page.evaluate(() => document.body.dataset.scherm === 'gevecht' && !!S.gevecht && !document.querySelector('#baas-intro') && window.Vista && Vista.actief && Vista.klaar)) break; await slaap(400); }
    await slaap(2000);
    await page.evaluate(() => { dicktatorRoep('de_griffier'); dicktatorRoep('de_deurwaarder'); });
    await slaap(1200);
    // de Vista-aanroepen tellen: raak/schud/pose/sterf/zetLicht
    await page.evaluate(() => {
      window.__tel = { raak: 0, schud: 0, pose: 0, sterf: 0, licht: [] };
      ['raak', 'schud', 'pose', 'sterf'].forEach(n => {
        const oud = Vista[n];
        Vista[n] = function () { window.__tel[n]++; return oud.apply(this, arguments); };
      });
      const oudL = Vista.zetLicht;
      Vista.zetLicht = function (f) { window.__tel.licht.push(+(+f).toFixed(3)); window.__licht = +(+f).toFixed(3); return oudL.apply(this, arguments); };
    });
  };

  const d3 = await page.evaluate(() => ({ actief: !!(window.Vista && Vista.actief) }));
  await opzet();
  const d3b = await page.evaluate(() => ({ actief: !!(window.Vista && Vista.actief), klaar: !!(window.Vista && Vista.klaar), d3A: d3Actief() }));
  t(d3b.actief && d3b.klaar && d3b.d3A, `het 3D-toneel draait: Vista.actief=${d3b.actief}, klaar=${d3b.klaar}, d3Actief()=${d3b.d3A}`);

  /* ============================ B1 in 3D ============================ */
  console.log('\n== B1 · I->II op het 3D-toneel ==');
  await page.evaluate(sampler("(function(){ const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.hp = Math.floor(b.maxHp * 0.50); checkBaasFase(); })();"));
  await slaap(5000);
  await page.evaluate(() => window.__stop());
  const L1 = await page.evaluate(() => window.__log);
  const T1 = await page.evaluate(() => window.__tel);
  const doekMax1 = L1.reduce((a, r) => r.doekOp > a.doekOp ? r : a, L1[0]);
  t(Math.abs(doekMax1.doekOp - 0.55) < 0.06, `het doek draagt ook in 3D: diepste ${doekMax1.doekOp.toFixed(2)} op t=${doekMax1.t}ms`);
  t(L1.some(r => r.flits > 0), `de tik-flits verschijnt (max ${Math.max(...L1.map(r => r.flits))} tegelijk)`);
  t(L1.some(r => r.hitstop), `.hitstop staat aan in 3D (${L1.filter(r => r.hitstop).length} samples)`);
  const von1 = L1.find(r => r.vonnis);
  t(!!von1 && /HET PROCES/.test(von1.vonnis || ''), `het vonnis landt: "${von1 ? von1.vonnis : '-'}" op t=${von1 ? von1.t : '-'}ms`);
  t(bij(L1, 3000).eindDisabled === true && bij(L1, 3800).eindDisabled === false, `invoerknip in 3D: disabled op t=${bij(L1, 3000).t}ms = ${bij(L1, 3000).eindDisabled}, op t=${bij(L1, 3800).t}ms = ${bij(L1, 3800).eindDisabled}`);
  const tintNa = L1[L1.length - 1];
  t(tintNa.bedrijf === '2' && tintNa.tintOp > 0.5, `#arena-tint brandt boven het canvas: data-bedrijf="${tintNa.bedrijf}", opacity ${tintNa.tintOp}`);
  t(T1.raak >= 1 && T1.schud >= 1, `camerabeats: Vista.raak x${T1.raak}, Vista.schud x${T1.schud}, Vista.pose x${T1.pose}`);
  await page.screenshot({ path: path.join(UIT, 'b1-3d.png') });

  /* ============================ B2 in 3D ============================ */
  console.log('\n== B2 · II->III op het 3D-toneel ==');
  await page.evaluate(() => { window.__tel.raak = 0; window.__tel.schud = 0; window.__tel.sterf = 0; });
  await page.evaluate(sampler("(function(){ const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.hp = Math.floor(b.maxHp * 0.30); checkBaasFase(); })();"));
  await slaap(6200);
  await page.evaluate(() => window.__stop());
  const L2 = await page.evaluate(() => window.__log);
  const T2 = await page.evaluate(() => window.__tel);
  t(T2.sterf >= 1, `de griffier sterft ook in de 3D-scene: Vista.sterf x${T2.sterf}`);
  t(T2.schud >= 2, `camerakicks in DE TIRADE: Vista.schud x${T2.schud} (190 + 1820)`);
  const bedr3 = L2.find(r => r.bedrijf === '3');
  t(!!bedr3 && bedr3.t >= 2600, `data-bedrijf="3" vanaf t=${bedr3 ? bedr3.t : 'nooit'}ms; tint-opacity ${bedr3 ? bedr3.tintOp : '-'}`);
  t(L2.some(r => r.tirade), `body.tirade (het dichtgeknepen vignet) staat ook in 3D`);
  t(bij(L2, 4000).eindDisabled === true && bij(L2, 4800).eindDisabled === false, `invoerknip: t=${bij(L2, 4000).t}ms disabled=${bij(L2, 4000).eindDisabled}, t=${bij(L2, 4800).t}ms disabled=${bij(L2, 4800).eindDisabled}`);
  await page.screenshot({ path: path.join(UIT, 'b2-3d.png') });

  /* ============================ B3 in 3D ============================ */
  console.log('\n== B3 · DE HERVERKIEZING op het 3D-toneel ==');
  await page.evaluate(() => { window.__tel.raak = 0; window.__tel.schud = 0; window.__tel.pose = 0; window.__tel.licht = []; });
  await page.evaluate(sampler("(function(){ const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.hp = 6; verliesHp(b, 30); })();"));
  await slaap(8200);
  await page.evaluate(() => window.__stop());
  const L3 = await page.evaluate(() => window.__log);
  const T3 = await page.evaluate(() => window.__tel);
  const doekMax3 = L3.reduce((a, r) => r.doekOp > a.doekOp ? r : a, L3[0]);
  t(Math.abs(doekMax3.doekOp - 0.92) < 0.04, `de black-out haalt ${doekMax3.doekOp.toFixed(2)} op t=${doekMax3.t}ms`);
  t(T3.licht.includes(0.08), `Vista.zetLicht(0.08) valt tijdens de black-out; hele reeks: [${T3.licht.join(', ')}]`);
  t(T3.licht.length >= 2 && T3.licht[T3.licht.length - 1] > 0.08, `het toneellicht komt daarna terug op de fakkelstand: ${T3.licht[T3.licht.length - 1]}`);
  t(bij(L3, 3000).hpVar === '0', `de bazenbalk bevriest op --hp "${bij(L3, 3000).hpVar}" op t=${bij(L3, 3000).t}ms`);
  const von5 = L3.find(r => r.vonnis && /MANDAAT/.test(r.vonnis));
  t(!!von5 && von5.t >= 6750, `V · HET MANDAAT op t=${von5 ? von5.t : 'nooit'}ms`);
  t(bij(L3, 5400).eindDisabled === true && bij(L3, 5800).eindDisabled === false, `invoerknip: t=${bij(L3, 5400).t}ms disabled=${bij(L3, 5400).eindDisabled}, t=${bij(L3, 5800).t}ms disabled=${bij(L3, 5800).eindDisabled}`);
  const eind3 = L3[L3.length - 1];
  t(eind3.bedrijf === '4' && eind3.herrezen, `na afloop: data-bedrijf="${eind3.bedrijf}", herrezen=${eind3.herrezen}, hp=${eind3.hp}`);
  await page.screenshot({ path: path.join(UIT, 'b3-3d.png') });

  console.log('\n== opruim ==');
  const rest = await page.evaluate(() => ({ vonnis: document.querySelectorAll('.vonnis').length, doek: document.getElementById('toneel-doek').classList.contains('aan'), hitstop: document.getElementById('scherm-gevecht').classList.contains('hitstop'), webgl: !!(window.Vista && Vista.actief) }));
  t(rest.vonnis === 0 && !rest.doek && !rest.hitstop, `na afloop: ${rest.vonnis} vonnissen, doek.aan=${rest.doek}, .hitstop=${rest.hitstop}`);
  t(rest.webgl, `de 3D-scene draait nog (geen context-verlies/crash): Vista.actief=${rest.webgl}`);
  t(fouten.length === 0, fouten.length ? 'PAGINAFOUTEN: ' + fouten.slice(0, 4).join(' | ') : 'geen paginafouten in de hele ronde');
  t(mist.length === 0, mist.length ? '404: ' + [...new Set(mist)].slice(0, 6).join(', ') : 'geen 404');
  console.log(`\n============================================\nSTAP B 3D: ${okN} ok, ${foutN} FOUT\n============================================`);
  await ctx.close(); await browser.close();
  process.exit(foutN ? 1 : 0);
})();
