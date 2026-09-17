// STAP B (v121) - de randen: DICK.tempo (het balansharnas), twee fasegrenzen vlak na
// elkaar (het regie-token), een leeg hof en een fasegrens tijdens de vijandbeurt.
// Geen enkele beat mag blijven hangen en geen enkele regie mag de invoer van een
// LATERE regie vrijgeven.
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const WT = process.env.SLAYIT_WORKTREE || 'C:/Users/Thomas Aelbrecht/Desktop/Workspace/SLAY-IT-drama';
const HOST = 'localhost:4181';
const UIT = process.env.SLAYIT_SHOTS || path.join(__dirname, 'drama_b_shots_tempo'); fs.mkdirSync(UIT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));
let okN = 0, foutN = 0;
const t = (goed, tekst) => { if (goed) { okN++; console.log('   ok   ' + tekst); } else { foutN++; console.log('   FOUT ' + tekst); } };

const STAND = `(function(){
  const g = S.gevecht, sc = document.getElementById('scherm-gevecht');
  const b = g.vijanden.find(v => v.id === 'de_dicktator');
  const i = g.vijanden.indexOf(b);
  const w = GDOM.vijanden[i] ? GDOM.vijanden[i].wrap : null;
  return {
    ceremonie: !!g.ceremonie, bodyCer: document.body.classList.contains('ceremonie'),
    knop: document.getElementById('knop-eindbeurt').disabled,
    vonnis: document.querySelectorAll('.vonnis').length,
    flits: document.querySelectorAll('.tik-flits').length,
    doek: document.getElementById('toneel-doek').classList.contains('aan'),
    hitstop: sc.classList.contains('hitstop'),
    bedrijf: sc.dataset.bedrijf || '',
    klassen: w ? w.className : '',
    bbToon: b._bbToon,
    fase: b.fase, hp: b.hp, herrezen: !!b.herrezen, vorm2: !!b.vorm2,
    levend: g.vijanden.filter(v => !v.dood).map(v => v.id).join(',')
  };
})()`;

(async () => {
  const browser = await chromium.launch();
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
  await page.evaluate(() => { INST.d3 = false; try { bewaarInst(); } catch (e) {} try { toonHeldKeuze(); } catch (e) {} }); await slaap(300);
  await page.evaluate(() => { const k = document.querySelector('.held-kies'); if (k) k.click(); }); await slaap(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /toch beginnen/i.test(x.textContent)); if (b) b.click(); }); await slaap(800);

  const opzet = async (hof = true) => {
    await page.evaluate(() => { devDicktator('slachter_mid'); });
    for (let i = 0; i < 40; i++) { if (await page.evaluate(() => document.body.dataset.scherm === 'gevecht' && !!S.gevecht && !document.querySelector('#baas-intro'))) break; await slaap(400); }
    await slaap(1000);
    if (hof) { await page.evaluate(() => { dicktatorRoep('de_griffier'); dicktatorRoep('de_deurwaarder'); }); await slaap(900); }
  };

  /* ===================== DICK.tempo = 0.02 (het balansharnas) ===================== */
  console.log('\n== DICK.tempo = 0.02 · de hele ceremonie moet samenklappen ==');
  for (const [naam, trig] of [
    ['I->II', "const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.hp = Math.floor(b.maxHp * 0.50); checkBaasFase();"],
    ['II->III', "const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.fase = 2; b.hp = Math.floor(b.maxHp * 0.30); checkBaasFase();"],
    ['IV', "const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.fase = 3; b.hp = 6; verliesHp(b, 30);"]
  ]) {
    await opzet();
    await page.evaluate(`(function(){ DICK.tempo = 0.02; ${trig} })()`);
    await slaap(700);
    const st = await page.evaluate(STAND);
    await page.evaluate(() => { DICK.tempo = 1; });
    t(!st.ceremonie && !st.bodyCer && st.knop === false,
      `${naam} @tempo 0.02 na 700ms: g.ceremonie=${st.ceremonie}, body.ceremonie=${st.bodyCer}, eindbeurt disabled=${st.knop}`);
    t(st.vonnis === 0 && st.flits === 0 && !st.doek && !st.hitstop && st.bbToon == null,
      `${naam} @tempo 0.02: ${st.vonnis} vonnissen, ${st.flits} flitsen, doek.aan=${st.doek}, .hitstop=${st.hitstop}, _bbToon=${st.bbToon}`);
    t(!/baas-tik|oprijzen|knielt|deinst|stemt/.test(st.klassen), `${naam} @tempo 0.02: geen regieklasse blijft hangen ("${st.klassen}")`);
    t(st.bedrijf !== '', `${naam} @tempo 0.02: de blijvende bedrijfstint staat er wel (data-bedrijf="${st.bedrijf}")`);
  }

  /* ===================== DICK.tempo = 0.5 (alles schaalt mee) ===================== */
  console.log('\n== DICK.tempo = 0.5 · de invoerknip schaalt mee ==');
  await opzet();
  await page.evaluate(() => { DICK.tempo = 0.5; const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.hp = Math.floor(b.maxHp * 0.50); checkBaasFase(); });
  await slaap(1500);
  const halfA = await page.evaluate(STAND);
  await slaap(600);
  const halfB = await page.evaluate(STAND);
  await page.evaluate(() => { DICK.tempo = 1; });
  t(halfA.ceremonie === true, `@tempo 0.5 op t~1500ms: invoer nog dicht (g.ceremonie=${halfA.ceremonie}) - 3600*0.5 = 1800ms`);
  t(halfB.ceremonie === false, `@tempo 0.5 op t~2100ms: invoer vrij (g.ceremonie=${halfB.ceremonie})`);

  /* ===================== twee fasegrenzen vlak na elkaar ===================== */
  console.log('\n== twee fasegrenzen kort na elkaar (het regie-token) ==');
  await opzet();
  await page.evaluate(() => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.hp = Math.floor(b.maxHp * 0.50); checkBaasFase(); });
  await slaap(900);
  await page.evaluate(() => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.hp = Math.floor(b.maxHp * 0.30); checkBaasFase(); });
  await slaap(2900);                                  // t = 2900 in de TWEEDE regie (die tot 4600 dicht is)
  const dubbelA = await page.evaluate(STAND);
  await slaap(2200);                                  // t = 5100 in de tweede regie
  const dubbelB = await page.evaluate(STAND);
  t(dubbelA.ceremonie === true && dubbelA.knop === true,
    `de eerste regie geeft de invoer NIET vrij midden in de tweede: g.ceremonie=${dubbelA.ceremonie}, knop disabled=${dubbelA.knop} (t~2900 van regie 2, terwijl regie 1 op 3600 zou vrijgeven)`);
  t(dubbelB.ceremonie === false && dubbelB.bedrijf === '3',
    `de tweede regie sluit zelf netjes af: g.ceremonie=${dubbelB.ceremonie}, data-bedrijf="${dubbelB.bedrijf}", fase ${dubbelB.fase}`);
  t(!/baas-tik|oprijzen|knielt|deinst|stemt/.test(dubbelB.klassen), `geen regieklasse van de afgebroken regie blijft hangen ("${dubbelB.klassen}")`);

  /* ===================== leeg hof: geen griffier, geen claqueur-plek ===================== */
  console.log('\n== DE TIRADE zonder griffier (leeg hof) ==');
  await opzet(false);
  await page.evaluate(() => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.fase = 2; b.hp = Math.floor(b.maxHp * 0.30); checkBaasFase(); });
  await slaap(6200);
  const leeg = await page.evaluate(STAND);
  t(!leeg.ceremonie && leeg.fase === 3 && leeg.bedrijf === '3',
    `zonder griffier draait de regie volledig door: fase ${leeg.fase}, data-bedrijf="${leeg.bedrijf}", ceremonie=${leeg.ceremonie}, levend "${leeg.levend}"`);
  t(/de_claqueur/.test(leeg.levend), `de claqueur trad alsnog aan op het lege toneel: "${leeg.levend}"`);

  /* ===================== hof al vol: dicktatorRoep geeft null ===================== */
  console.log('\n== hof al vol (4 levenden): dicktatorRoep geeft null ==');
  await opzet();
  await page.evaluate(() => { dicktatorRoep('de_claqueur', { hp: DICK.claqueurHp }); });
  await slaap(600);
  await page.evaluate(() => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.fase = 2; b.hp = Math.floor(b.maxHp * 0.30); checkBaasFase(); });
  await slaap(6200);
  const vol = await page.evaluate(STAND);
  t(!vol.ceremonie && vol.fase === 3, `met een vol hof loopt DE TIRADE gewoon af: fase ${vol.fase}, ceremonie=${vol.ceremonie}, levend "${vol.levend}"`);

  /* ===================== body.lite: geen crash, de ceremonie loopt af ===================== */
  console.log('\n== body.lite · de arenawissel is hard, het doek dekt de knip ==');
  await page.evaluate(() => document.body.classList.add('lite'));
  await opzet();
  await page.evaluate(() => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.hp = Math.floor(b.maxHp * 0.50); checkBaasFase(); });
  await slaap(1000);
  const liteMid = await page.evaluate(STAND);
  await slaap(3600);
  const liteNa = await page.evaluate(STAND);
  await page.evaluate(() => document.body.classList.remove('lite'));
  t(liteMid.ceremonie === true && liteMid.vonnis === 1, `in lite valt het vonnis gewoon: ${liteMid.vonnis} plaat, doek.aan=${liteMid.doek}, ceremonie=${liteMid.ceremonie}`);
  t(liteNa.ceremonie === false && liteNa.vonnis === 0 && liteNa.bedrijf === '2', `in lite loopt de regie netjes af: ceremonie=${liteNa.ceremonie}, ${liteNa.vonnis} vonnissen, data-bedrijf="${liteNa.bedrijf}"`);

  console.log('\n== opruim ==');
  t(fouten.length === 0, fouten.length ? 'PAGINAFOUTEN: ' + fouten.slice(0, 4).join(' | ') : 'geen paginafouten in de hele ronde');
  t(mist.length === 0, mist.length ? '404: ' + [...new Set(mist)].slice(0, 6).join(', ') : 'geen 404');
  console.log(`\n============================================\nSTAP B RANDEN: ${okN} ok, ${foutN} FOUT\n============================================`);
  await ctx.close(); await browser.close();
  process.exit(foutN ? 1 : 0);
})();
