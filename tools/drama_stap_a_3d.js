// STAP A (v120) - 3D-tak: A1 (--grondY op de sprite-voetlijn), A7 (Vista.tik krijgt dt === 0
// tijdens de hitstop) en A12 (Vista.schud). Vista tekent de achterwand zelf; plaat-effecten
// zijn daar bewust hard - het doek en de schermlagen dragen de dramaturgie.
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const WT = process.env.SLAYIT_WORKTREE || 'C:/Users/Thomas Aelbrecht/Desktop/Workspace/SLAY-IT-drama';
const HOST = 'localhost:4183';
const UIT = process.env.SLAYIT_SHOTS || path.join(__dirname, 'drama_a_shots3d'); fs.mkdirSync(UIT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));
let okN = 0, foutN = 0;
const t = (goed, tekst) => { if (goed) { okN++; console.log('   ok   ' + tekst); } else { foutN++; console.log('   FOUT ' + tekst); } };

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
  await page.evaluate(() => { devDicktator('slachter_mid'); });
  for (let i = 0; i < 50; i++) { if (await page.evaluate(() => document.body.dataset.scherm === 'gevecht' && !!S.gevecht && !document.querySelector('#baas-intro') && window.Vista && Vista.actief && Vista.klaar)) break; await slaap(400); }
  await slaap(2000);
  await page.evaluate(() => { dicktatorRoep('de_griffier'); dicktatorRoep('de_deurwaarder'); }); await slaap(1200);
  const d3 = await page.evaluate(() => ({ actief: !!(window.Vista && Vista.actief), klaar: !!(window.Vista && Vista.klaar), scherm: document.getElementById('scherm-gevecht').classList.contains('d3-actief'), d3A: d3Actief(), heeftSchud: typeof Vista.schud === 'function' }));
  t(d3.actief && d3.klaar && d3.scherm && d3.d3A, `het 3D-toneel draait: Vista.actief=${d3.actief}, klaar=${d3.klaar}, #scherm-gevecht.d3-actief=${d3.scherm}, d3Actief()=${d3.d3A}`);
  t(d3.heeftSchud, `Vista exporteert schud(): ${d3.heeftSchud}`);
  await page.screenshot({ path: path.join(UIT, '3d-1-zitting.png') });

  console.log('\n== A1 · --grondY in de d3-tak van _plaatsLaag ==');
  const a1 = await page.evaluate(() => {
    plaatsGevechtsplaat();
    const bg = document.getElementById('gevecht-achtergrond');
    const ruw = getComputedStyle(bg).getPropertyValue('--grondY').trim();
    const px = parseFloat(ruw);
    const box = _plaatLayoutBox(bg);
    const voetY = Vista.voetlijnY();
    return { ruw, px, verwacht: voetY - box.top, voetY, boxTop: box.top, hoogte: box.height, maat: bg.style.backgroundSize, info: Vista.voetlijnInfo ? Vista.voetlijnInfo() : null };
  });
  t(/px$/.test(a1.ruw) && a1.px > 0, `--grondY in 3D is een px-waarde > 0: "${a1.ruw}" (Vista.voetlijnY ${a1.voetY.toFixed(1)}px, layoutbox top ${a1.boxTop.toFixed(1)}px)`);
  t(Math.abs(a1.px - a1.verwacht) <= 2, `--grondY ${a1.px}px vs de sprite-voetlijn ${a1.verwacht.toFixed(2)}px -> afwijking ${Math.abs(a1.px - a1.verwacht).toFixed(2)}px (<= 2); 61% van de laag zou ${(a1.hoogte * 0.61).toFixed(0)}px zijn`);
  t(/px/.test(a1.maat), `de plaat staat in 3D op een expliciete maat (geen cover): ${a1.maat}`);

  console.log('\n== A7 · hitstop: Vista.tik krijgt dt === 0 ==');
  const a7 = await page.evaluate(async () => {
    const echt = Vista.tik;
    const gezien = [];
    Vista.tik = dt => { gezien.push(dt); return echt(dt); };
    await new Promise(r => setTimeout(r, 200));
    const voor = gezien.slice(); gezien.length = 0;
    hitstop(240);
    const tijdens = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 200) { await new Promise(r => requestAnimationFrame(r)); }
    tijdens.push(...gezien); gezien.length = 0;
    /* wachten tot de hitstop ECHT voorbij is (240ms), pas dan de frames erna meten */
    while (document.getElementById('scherm-gevecht').classList.contains('hitstop')) await new Promise(r => setTimeout(r, 20));
    gezien.length = 0;
    await new Promise(r => setTimeout(r, 300));
    const na = gezien.slice();
    Vista.tik = echt;
    return {
      voorN: voor.length, voorNul: voor.filter(d => d === 0).length,
      tijdensN: tijdens.length, tijdensNul: tijdens.filter(d => d === 0).length,
      naN: na.length, naNul: na.filter(d => d === 0).length
    };
  });
  t(a7.voorN > 0 && a7.voorNul === 0, `voor de hitstop: ${a7.voorN} frames, waarvan ${a7.voorNul} met dt === 0`);
  t(a7.tijdensN > 0 && a7.tijdensNul === a7.tijdensN, `tijdens de hitstop: ${a7.tijdensN} frames, waarvan ${a7.tijdensNul} met dt === 0 (alle)`);
  t(a7.naN > 0 && a7.naNul === 0, `na de hitstop: ${a7.naN} frames, waarvan ${a7.naNul} met dt === 0`);

  console.log('\n== A12 · Vista.schud(k) ==');
  const a12 = await page.evaluate(async () => {
    await new Promise(r => setTimeout(r, 900));               // eerdere kicks laten uitdoven
    const rust = Vista.zwaai().x;
    Vista.schud(1);
    let max100 = 0, max100Ms = 0;
    const t0 = performance.now();
    while (performance.now() - t0 < 100) {
      await new Promise(r => requestAnimationFrame(r));
      const d = Math.abs(Vista.zwaai().x - rust);
      if (d > max100) { max100 = d; max100Ms = Math.round(performance.now() - t0); }
    }
    let maxNa = 0;
    while (performance.now() - t0 < 500) { await new Promise(r => requestAnimationFrame(r)); }
    for (let i = 0; i < 8; i++) { await new Promise(r => requestAnimationFrame(r)); maxNa = Math.max(maxNa, Math.abs(Vista.zwaai().x - rust)); }
    return { rust, max100, max100Ms, maxNa };
  });
  t(a12.max100 >= 0.2, `Vista.schud(1): camera-x wijkt binnen 100ms maximaal ${a12.max100.toFixed(3)} eenheid af (piek op t=${a12.max100Ms}ms, rustpositie ${a12.rust.toFixed(3)}) - eis >= 0.2`);
  t(a12.maxNa <= 0.06, `binnen 500ms terug: restafwijking ${a12.maxNa.toFixed(3)} eenheid (<= 0.06)`);

  console.log('\n== 3D-schermlagen: doek en tint boven het canvas ==');
  const lagen = await page.evaluate(async () => {
    document.getElementById('scherm-gevecht').dataset.bedrijf = '3';
    toneelDoek(0.7, 200);
    await new Promise(r => setTimeout(r, 1500));   // #arena-tint heeft een transition van 1.2s
    const doek = document.getElementById('toneel-doek'), tint = document.getElementById('arena-tint'), can = document.getElementById('vista-canvas');
    const r = can.getBoundingClientRect();
    const raak = document.elementFromPoint(r.left + r.width / 2, r.bottom - 40);
    return { doekOp: getComputedStyle(doek).opacity, tintOp: getComputedStyle(tint).opacity, canvasZichtbaar: getComputedStyle(can).display, bovenop: raak ? (raak.id || raak.className) : null };
  });
  t(parseFloat(lagen.doekOp) === 0.7 && parseFloat(lagen.tintOp) === 1, `in 3D werken beide schermlagen: doek opacity ${lagen.doekOp}, arena-tint opacity ${lagen.tintOp} (canvas display ${lagen.canvasZichtbaar})`);
  await page.screenshot({ path: path.join(UIT, '3d-2-doek70-bedrijf3.png') });
  await page.evaluate(() => { toneelDoek(0); delete document.getElementById('scherm-gevecht').dataset.bedrijf; });
  await slaap(600);
  await page.screenshot({ path: path.join(UIT, '3d-3-terug.png') });

  console.log('\n== REVIEWFIX · #strijdveld mag in 3D GEEN containing block worden ==');
  const cb = await page.evaluate(async () => {
    const kols = () => [
      ['speler-zone', document.getElementById('speler-zone')],
      ['metgezel-zone', document.getElementById('metgezel-zone')],
      ...[...document.querySelectorAll('#vijanden-rij .vijand')].map((e, i) => ['vijand' + i, e])
    ].filter(x => x[1] && getComputedStyle(x[1]).position === 'fixed')
     .map(([n, e]) => { const r = e.getBoundingClientRect(); return { n, top: Math.round(r.top), left: Math.round(r.left) }; });
    const rust = kols();
    hitstop(400); schokToneel(1.8, 600);
    await new Promise(r => setTimeout(r, 80));
    const sv = document.getElementById('strijdveld');
    const cs = getComputedStyle(sv);
    const tijdens = kols();
    const stijl = { filter: cs.filter, anim: cs.animationName, translate: cs.translate, hitstopKlasse: document.getElementById('scherm-gevecht').classList.contains('hitstop') };
    await new Promise(r => setTimeout(r, 900));
    return { rust, tijdens, stijl, na: kols() };
  });
  const sprong = Math.max(...cb.rust.map((r, i) => cb.tijdens[i] ? Math.max(Math.abs(cb.tijdens[i].top - r.top), Math.abs(cb.tijdens[i].left - r.left)) : 0));
  t(cb.stijl.hitstopKlasse === true && cb.stijl.filter === 'none' && cb.stijl.anim === 'none', `in 3D landt de hitstop-dip noch de schok op #strijdveld: filter "${cb.stijl.filter}", animation "${cb.stijl.anim}" (.hitstop staat wel aan: ${cb.stijl.hitstopKlasse})`);
  t(cb.rust.length >= 3 && sprong <= 3, `de ${cb.rust.length} fixed figuurkolommen blijven staan tijdens hitstop+schok: grootste sprong ${sprong}px (rust ${cb.rust.map(r => r.n + ' ' + r.left + ',' + r.top).join(' | ')})`);

  t(fouten.length === 0, fouten.length ? 'PAGINAFOUTEN: ' + fouten.slice(0, 4).join(' | ') : 'geen paginafouten in de hele ronde');
  t(mist.length === 0, mist.length ? '404: ' + [...new Set(mist)].slice(0, 6).join(', ') : 'geen 404');
  console.log(`\n============================================\nSTAP A 3D: ${okN} ok, ${foutN} FOUT\n============================================`);
  await ctx.close(); await browser.close();
  process.exit(foutN ? 1 : 0);
})();
