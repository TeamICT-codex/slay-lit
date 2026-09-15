// STAP A (v120) - controlepas: de BESTAANDE DICKtator-beats (fase-overgang II/III en de
// herrijzenis) moeten nog draaien, en de vier bugfixes van stap A moeten er ZICHTBAAR in
// landen: kiezers blijven staan, de woede-gloed overleeft de claqueur-oproep.
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const WT = process.env.SLAYIT_WORKTREE || 'C:/Users/Thomas Aelbrecht/Desktop/Workspace/SLAY-IT-drama';
const HOST = 'localhost:4184';
const UIT = process.env.SLAYIT_SHOTS || path.join(__dirname, 'drama_a_shots_reg'); fs.mkdirSync(UIT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));
let okN = 0, foutN = 0;
const t = (goed, tekst) => { if (goed) { okN++; console.log('   ok   ' + tekst); } else { foutN++; console.log('   FOUT ' + tekst); } };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage(); const fouten = [];
  page.on('pageerror', e => fouten.push(e.message));
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url()); if (u.host !== HOST) return route.abort();
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
    const f = path.join(WT, rel.split('/').join(path.sep));
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ status: 200, contentType: MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(f) });
    return route.fulfill({ status: 404, body: 'weg' });
  });
  await page.goto('http://' + HOST + '/', { waitUntil: 'load' });
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('slayit_wipe', '1'); localStorage.setItem('slayit_nudge', 'weg'); localStorage.setItem('slayit_wereld', '0'); });
  await page.reload({ waitUntil: 'load' }); await slaap(600);
  await page.evaluate(() => { INST.d3 = false; try { bewaarInst(); } catch (e) {} try { toonHeldKeuze(); } catch (e) {} }); await slaap(300);
  await page.evaluate(() => { const k = document.querySelector('.held-kies'); if (k) k.click(); }); await slaap(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /toch beginnen/i.test(x.textContent)); if (b) b.click(); }); await slaap(800);

  console.log('\n== bestaande fase-overgang II -> III (met hof) ==');
  await page.evaluate(() => devDicktator('slachter_mid', { hof: true }));
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => document.body.dataset.scherm === 'gevecht' && !!S.gevecht && !document.querySelector('#baas-intro'))) break; await slaap(400); }
  await slaap(1500);
  const f2 = await page.evaluate(() => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); return { fase: b.fase, hp: b.hp, hof: S.gevecht.vijanden.filter(v => v.hof && !v.dood).map(v => v.id) }; });
  t(f2.fase === 2, `bedrijf II staat: fase ${f2.fase}, hp ${f2.hp}, hof ${f2.hof.join('+')}`);
  await page.screenshot({ path: path.join(UIT, 'reg-1-bedrijf2.png') });

  const f3 = await page.evaluate(async () => {
    const g = S.gevecht, b = g.vijanden.find(v => v.id === 'de_dicktator');
    b.hp = Math.floor(b.maxHp * 0.30);
    checkBaasFase();
    await new Promise(r => setTimeout(r, 2600));
    const bw = [...document.querySelectorAll('#vijanden-rij .vijand')][g.vijanden.indexOf(b)];
    return { fase: b.fase, woede: bw.classList.contains('woede'), claqueur: g.vijanden.some(v => v.id === 'de_claqueur'), griffier: (g.vijanden.find(v => v.id === 'de_griffier') || {}).dood, arena: (g.achtergrond || '').split('/').pop() };
  });
  t(f3.fase === 3, `bedrijf III staat: fase ${f3.fase}, griffier dood = ${f3.griffier}, arena "${f3.arena}"`);
  t(f3.woede === true, `de woede-gloed staat op de baas-wrap NA de claqueur-oproep (claqueur aanwezig = ${f3.claqueur}): .woede = ${f3.woede}`);
  await page.screenshot({ path: path.join(UIT, 'reg-2-bedrijf3.png') });

  console.log('\n== bestaande herrijzenis (bedrijf IV) ==');
  const h = await page.evaluate(async () => {
    const g = S.gevecht, b = g.vijanden.find(v => v.id === 'de_dicktator');
    const idx = g.vijanden.indexOf(b);
    const levend = g.vijanden.filter(v => v.hof && !v.dood).length;
    verliesHp(b, b.hp + 50);
    await new Promise(r => setTimeout(r, 600));
    const wraps = [...document.querySelectorAll('#vijanden-rij .vijand')];
    const kiezers = wraps.filter(w => w.classList.contains('kiezer'));
    const vroeg = { n: kiezers.length, opacity: kiezers.map(w => getComputedStyle(w).opacity), lijk: kiezers.filter(w => w.classList.contains('lijk-weg')).length, ceremonie: !!g.ceremonie, bbToonBestaat: b._bbToon !== undefined };
    await new Promise(r => setTimeout(r, 1400));
    const laat = { lijk: kiezers.filter(w => w.classList.contains('lijk-weg')).length, opacity: kiezers.map(w => getComputedStyle(w).opacity) };
    await new Promise(r => setTimeout(r, 3200));
    const na = { hp: b.hp, herrezen: !!b.herrezen, vorm2: !!b.vorm2, dood: !!b.dood, fase: b.fase, ceremonie: !!g.ceremonie, herverkozen: wraps[idx].classList.contains('herverkozen'), woede: wraps[idx].classList.contains('woede'), src: (wraps[idx].querySelector('img') || {}).src, vonnis: !!document.querySelector('.vonnis'), doek: document.getElementById('toneel-doek').classList.contains('aan'), hitstop: document.getElementById('scherm-gevecht').classList.contains('hitstop') };
    return { levend, vroeg, laat, na };
  });
  t(h.na.herrezen && h.na.hp === 96 && !h.na.dood, `de herrijzenis draait ONGEWIJZIGD: herrezen=${h.na.herrezen}, hp ${h.na.hp}/240 (40%), vorm2=${h.na.vorm2}, fase ${h.na.fase}, dood=${h.na.dood}`);
  t(h.vroeg.n > 0 && h.vroeg.opacity.every(o => parseFloat(o) > 0.5), `de KIEZERS blijven zichtbaar tijdens de ceremonie (${h.vroeg.n} kiezers, opacity ${h.vroeg.opacity.join('/')}) - dit is bugfix A4`);
  t(h.laat.lijk === 0, `geen enkele kiezer wordt na 750ms op display:none gezet: .lijk-weg = ${h.laat.lijk} (opacity ${h.laat.opacity.join('/')})`);
  t(h.na.herverkozen && h.na.woede, `de herkozen stand staat afgedwongen op de wrap: .herverkozen=${h.na.herverkozen}, .woede=${h.na.woede}`);
  t(/_herkozen/.test(h.na.src || ''), `de baas draagt zijn herkozen-plaat: ${(h.na.src || '').split('/').pop()}`);
  t(h.na.ceremonie === false, `de invoer is na de ceremonie weer vrij: g.ceremonie = ${h.na.ceremonie}`);
  t(!h.na.vonnis && !h.na.doek && !h.na.hitstop, `geen achtergebleven regielagen: .vonnis=${h.na.vonnis}, #toneel-doek.aan=${h.na.doek}, .hitstop=${h.na.hitstop}`);
  await page.screenshot({ path: path.join(UIT, 'reg-3-herrezen.png') });

  console.log('\n== de beurt loopt door na de ceremonie ==');
  const beurt = await page.evaluate(async () => {
    const g = S.gevecht;
    const voor = g.beurt;
    await eindBeurt();
    await new Promise(r => setTimeout(r, 2500));
    return { voor, na: g.beurt, ceremonie: !!g.ceremonie, knop: document.getElementById('knop-eindbeurt').disabled, voorbij: !!g.voorbij };
  });
  t(beurt.na > beurt.voor && !beurt.voorbij, `de beurt draait door: beurt ${beurt.voor} -> ${beurt.na}, gevecht voorbij = ${beurt.voorbij}`);
  t(beurt.ceremonie === false && beurt.knop === false, `invoer vrij na de beurtwissel: g.ceremonie=${beurt.ceremonie}, eindbeurt-knop disabled=${beurt.knop}`);

  t(fouten.length === 0, fouten.length ? 'PAGINAFOUTEN: ' + fouten.slice(0, 4).join(' | ') : 'geen paginafouten in de hele ronde');
  console.log(`\n============================================\nSTAP A REGRESSIE: ${okN} ok, ${foutN} FOUT\n============================================`);
  await ctx.close(); await browser.close();
  process.exit(foutN ? 1 : 0);
})();
