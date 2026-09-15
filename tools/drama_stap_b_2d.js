// STAP B (v120) - acceptatietests B1..B5 in 2D, laptop 1440x900, DICK.tempo = 1.
// Meet met een in-page sampler (40ms) vanaf het frame waarin de ceremonie start, zodat de
// gemeten tijden niet door Playwright-roundtrips vervuild raken. Elke regel toont de
// GEMETEN waarde, nooit "werkt".
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const WT = process.env.SLAYIT_WORKTREE || 'C:/Users/Thomas Aelbrecht/Desktop/Workspace/SLAY-IT-drama';
const HOST = 'localhost:4182';
const UIT = process.env.SLAYIT_SHOTS || path.join(__dirname, 'drama_b_shots'); fs.mkdirSync(UIT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));
let okN = 0, foutN = 0;
const t = (goed, tekst) => { if (goed) { okN++; console.log('   ok   ' + tekst); } else { foutN++; console.log('   FOUT ' + tekst); } };

// de in-page sampler: draait als string in de pagina
const sampler = trigger => `(function(){
  window.__log = [];
  const g = S.gevecht;
  const b = g.vijanden.find(v => v.id === 'de_dicktator');
  const wrapVan = a => { const i = g.vijanden.indexOf(a); const d = GDOM.vijanden[i]; return d ? d.wrap : null; };
  const t0 = performance.now();
  const tik = () => {
    const bw = wrapVan(b);
    const img = bw ? bw.querySelector('img') : null;
    const gr = g.vijanden.find(v => v.id === 'de_griffier');
    const grw = gr ? wrapVan(gr) : null;
    const pips = [...document.querySelectorAll('#baas-balk .bb-pip')];
    const balk = document.querySelector('#baas-balk .bb-balk');
    const doek = document.getElementById('toneel-doek');
    const von = document.querySelector('.vonnis');
    const sc = document.getElementById('scherm-gevecht');
    window.__log.push({
      t: Math.round(performance.now() - t0),
      src: img ? img.src.split('/').pop() : (bw ? '(geen img)' : '(geen wrap)'),
      eindDisabled: document.getElementById('knop-eindbeurt').disabled,
      ceremonie: !!g.ceremonie,
      pipAan: pips.map(p => p.classList.contains('aan')),
      pipKnapt: pips.map(p => p.classList.contains('knapt')),
      hpVar: balk ? getComputedStyle(balk).getPropertyValue('--hp').trim() : null,
      bbVul: document.querySelector('#baas-balk .bb-vul') ? document.querySelector('#baas-balk .bb-vul').style.width : null,
      bbExtra: document.querySelector('#baas-balk .bb-extra') ? document.querySelector('#baas-balk .bb-extra').textContent : '',
      doekAan: doek.classList.contains('aan'),
      doekOp: +getComputedStyle(doek).opacity,
      vonnis: von ? (von.querySelector('h2') || {}).textContent : null,
      vonnisSub: von ? ((von.querySelector('span') || {}).textContent || '') : null,
      vonnisKlein: von ? von.classList.contains('klein') : false,
      bedrijf: sc.dataset.bedrijf || '',
      tirade: document.body.classList.contains('tirade'),
      bodyCeremonie: document.body.classList.contains('ceremonie'),
      hitstop: sc.classList.contains('hitstop'),
      schermTransform: getComputedStyle(sc).transform,
      beef: sc.classList.contains('beef') || sc.classList.contains('slowmo'),
      baasKlassen: bw ? bw.className : '',
      grKlassen: grw ? grw.className : null,
      grOpacity: grw ? +getComputedStyle(grw).opacity : null,
      levend: g.vijanden.filter(v => !v.dood).map(v => v.id).join(','),
      achtergrond: (g.achtergrond || '').split('/').pop(),
      fx: [...document.querySelectorAll('.fx-nummer')].map(e => e.textContent).join(' | '),
      hp: b.hp, fase: b.fase, vorm2: !!b.vorm2, herrezen: !!b.herrezen
    });
  };
  window.__stop = () => clearInterval(window.__int);
  window.__int = setInterval(tik, 40);
  ${trigger}
  tik();
})()`;

// lees uit het log het sample dat het dichtst bij ms ligt
const bij = (log, ms) => log.reduce((a, r) => Math.abs(r.t - ms) < Math.abs(a.t - ms) ? r : a, log[0]);
const tussen = (log, a, b2) => log.filter(r => r.t >= a && r.t <= b2);

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

  // vers baasgevecht met compleet hof, wachten tot de intro weg is
  const opzet = async () => {
    await page.evaluate(() => { devDicktator('slachter_mid'); });
    for (let i = 0; i < 40; i++) { if (await page.evaluate(() => document.body.dataset.scherm === 'gevecht' && !!S.gevecht && !document.querySelector('#baas-intro'))) break; await slaap(400); }
    await slaap(1000);
    await page.evaluate(() => { dicktatorRoep('de_griffier'); dicktatorRoep('de_deurwaarder'); });
    await slaap(900);
  };

  /* ============================ B1 · I -> II ============================ */
  console.log('\n== B1 · I->II · HET PROCES (4200 ms, invoer dicht 0-3600) ==');
  await opzet();
  await page.evaluate(sampler("(function(){ const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.hp = Math.floor(b.maxHp * 0.50); checkBaasFase(); })();"));
  await slaap(5200);
  await page.evaluate(() => window.__stop());
  const L1 = await page.evaluate(() => window.__log);
  fs.writeFileSync(path.join(UIT, 'b1-log.json'), JSON.stringify(L1, null, 1));

  const hitVenster = tussen(L1, 0, 1000).filter(r => /_hit\./.test(r.src));
  t(hitVenster.length > 0, `hit-pose tussen t=0 en t=1000: ${hitVenster.length} samples, eerste op t=${hitVenster.length ? hitVenster[0].t : '-'}ms, src "${hitVenster.length ? hitVenster[0].src : '-'}"`);
  const b1_3000 = bij(L1, 3000), b1_3800 = bij(L1, 3800);
  t(b1_3000.eindDisabled === true, `#knop-eindbeurt.disabled op t=${b1_3000.t}ms: ${b1_3000.eindDisabled} (g.ceremonie=${b1_3000.ceremonie})`);
  t(b1_3800.eindDisabled === false, `#knop-eindbeurt.disabled op t=${b1_3800.t}ms: ${b1_3800.eindDisabled} (g.ceremonie=${b1_3800.ceremonie})`);
  const pip2Eerst = L1.find(r => r.pipAan[1]);
  t(!!pip2Eerst && pip2Eerst.t >= 850, `pip 2 krijgt .aan voor het eerst op t=${pip2Eerst ? pip2Eerst.t : 'nooit'}ms (>= 850)`);
  const pip2Knapt = L1.find(r => r.pipKnapt[1]);
  t(!!pip2Knapt, `pip 2 krijgt .knapt op t=${pip2Knapt ? pip2Knapt.t : 'nooit'}ms`);
  const von1 = L1.find(r => r.vonnis);
  t(!!von1 && /II · HET PROCES/.test(von1.vonnis || ''), `vonnis verschijnt op t=${von1 ? von1.t : '-'}ms: "${von1 ? von1.vonnis : '-'}"`);
  t(!!von1 && (von1.vonnisSub || '').length > 20, `B5 · duiding onder de titel: "${von1 ? (von1.vonnisSub || '').slice(0, 64) : '-'}..." (${von1 ? (von1.vonnisSub || '').length : 0} tekens)`);
  const doekMax1 = L1.reduce((a, r) => r.doekOp > a.doekOp ? r : a, L1[0]);
  t(Math.abs(doekMax1.doekOp - 0.55) < 0.06, `diepste doek in I->II: ${doekMax1.doekOp.toFixed(2)} op t=${doekMax1.t}ms (verwacht .55)`);
  const doekWeg1 = L1.filter(r => r.t > 2600 && r.doekOp < 0.02);
  t(doekWeg1.length > 0, `doek weer open vanaf t=${doekWeg1.length ? doekWeg1[0].t : '-'}ms (opacity ${doekWeg1.length ? doekWeg1[0].doekOp : '-'})`);
  const b1_eind = L1[L1.length - 1];
  t(b1_eind.bedrijf === '2', `#scherm-gevecht[data-bedrijf] op t=${b1_eind.t}ms: "${b1_eind.bedrijf}"`);
  t(bij(L1, 3400).bedrijf === '', `bedrijf-tint staat NIET vroeger dan de vrijgave: data-bedrijf op t=${bij(L1, 3400).t}ms = "${bij(L1, 3400).bedrijf}"`);
  const rustig1 = L1.filter(r => !r.beef);
  const transforms = [...new Set(rustig1.map(r => r.schermTransform))];
  t(transforms.every(x => x === 'none'), `#scherm-gevecht heeft BUITEN .beef/.slowmo nooit een eigen transform (${rustig1.length} van ${L1.length} samples): ${transforms.join(' / ')}`);
  const hitstopVenster = L1.filter(r => r.hitstop);
  t(hitstopVenster.length > 0 && hitstopVenster[hitstopVenster.length - 1].t <= 300, `.hitstop stond aan van t=${hitstopVenster[0].t} tot t=${hitstopVenster[hitstopVenster.length - 1].t}ms (140ms venster)`);
  t(!b1_eind.bodyCeremonie, `body.ceremonie is na afloop weg: ${b1_eind.bodyCeremonie}`);
  await page.screenshot({ path: path.join(UIT, 'b1-na.png') });

  /* ============================ B2 · II -> III ============================ */
  console.log('\n== B2 · II->III · DE TIRADE (5600 ms, invoer dicht 0-4600) ==');
  await opzet();
  await page.evaluate(sampler("(function(){ const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.fase = 2; b.hp = Math.floor(b.maxHp * 0.30); checkBaasFase(); })();"));
  await slaap(6400);
  await page.evaluate(() => window.__stop());
  const L2 = await page.evaluate(() => window.__log);
  fs.writeFileSync(path.join(UIT, 'b2-log.json'), JSON.stringify(L2, null, 1));

  const geveld = tussen(L2, 1700, 2600).filter(r => /(^| )exit( |$)/.test(' ' + (r.grKlassen || '')) && /geveld/.test(r.grKlassen || ''));
  const geveldZichtbaar = geveld.filter(r => r.grOpacity > 0);
  t(geveld.length > 0 && geveldZichtbaar.length > 0,
    `griffier .exit.geveld tussen t=1700-2600: ${geveld.length} samples, opacity van ${geveldZichtbaar.length ? geveldZichtbaar[0].grOpacity.toFixed(2) : '-'} (t=${geveldZichtbaar.length ? geveldZichtbaar[0].t : '-'}) tot ${geveld[geveld.length - 1].grOpacity.toFixed(2)} (t=${geveld[geveld.length - 1].t})`);
  const grVoor = bij(L2, 1600);
  t(!/geveld/.test(grVoor.grKlassen || ''), `de griffier staat op t=${grVoor.t}ms nog overeind (klassen: "${(grVoor.grKlassen || '').replace('vijand ', '')}")`);
  const na4200 = tussen(L2, 4300, 6400);
  t(na4200.length > 0 && na4200.every(r => /woede/.test(r.baasKlassen)), `.woede staat op ALLE ${na4200.length} samples na t=4200 (na de DOM-herbouw van de claqueur-oproep)`);
  const claqEerst = L2.find(r => /de_claqueur/.test(r.levend));
  t(!!claqEerst && claqEerst.t >= 4200, `de claqueur treedt aan op t=${claqEerst ? claqEerst.t : 'nooit'}ms (>= 4200); levend daarvoor: "${bij(L2, 4000).levend}"`);
  const b2_4000 = bij(L2, 4000), b2_4800 = bij(L2, 4800);
  t(b2_4000.eindDisabled === true, `invoer dicht op t=${b2_4000.t}ms: disabled=${b2_4000.eindDisabled}`);
  t(b2_4800.eindDisabled === false, `invoer vrij op t=${b2_4800.t}ms: disabled=${b2_4800.eindDisabled}`);
  const tiradeEerst = L2.find(r => r.tirade);
  t(!!tiradeEerst && tiradeEerst.t >= 450 && tiradeEerst.t < 900, `body.tirade vanaf t=${tiradeEerst ? tiradeEerst.t : 'nooit'}ms (beat 450)`);
  const knielVenster = L2.filter(r => /knielt/.test(r.baasKlassen));
  t(knielVenster.length > 0 && knielVenster[0].t >= 450 && knielVenster[knielVenster.length - 1].t < 1800,
    `.knielt van t=${knielVenster.length ? knielVenster[0].t : '-'} tot t=${knielVenster.length ? knielVenster[knielVenster.length - 1].t : '-'}ms (450 -> 1700: hij WANKELT, hij blijft niet liggen)`);
  const bedr3 = L2.find(r => r.bedrijf === '3');
  t(!!bedr3 && bedr3.t >= 2600, `data-bedrijf="3" vanaf t=${bedr3 ? bedr3.t : 'nooit'}ms (beat 2600)`);
  const pip3 = L2.find(r => r.pipAan[2]);
  t(!!pip3 && pip3.t >= 2550, `pip 3 krijgt .aan op t=${pip3 ? pip3.t : 'nooit'}ms (>= 2600)`);
  const von2 = L2.find(r => r.vonnis);
  t(!!von2 && /III · DE TIRADE/.test(von2.vonnis || '') && (von2.vonnisSub || '').length > 20,
    `vonnis "${von2 ? von2.vonnis : '-'}" op t=${von2 ? von2.t : '-'}ms met duiding "${von2 ? (von2.vonnisSub || '').slice(0, 56) : '-'}..."`);
  const driester = L2.filter(r => /driester/.test(r.fx));
  t(driester.length > 0 && driester[0].t >= 2850, `het 'driester'-cijfer valt op t=${driester.length ? driester[0].t : 'nooit'}ms (uit de executieklap op 1700 getrokken naar 2900)`);
  const doekMax2 = L2.reduce((a, r) => r.doekOp > a.doekOp ? r : a, L2[0]);
  t(Math.abs(doekMax2.doekOp - 0.70) < 0.06, `diepste doek in II->III: ${doekMax2.doekOp.toFixed(2)} op t=${doekMax2.t}ms (verwacht .70)`);
  await page.screenshot({ path: path.join(UIT, 'b2-na.png') });

  /* ============================ B3 · IV ============================ */
  console.log('\n== B3 · IV · DE HERVERKIEZING (7200 ms, invoer dicht 0-5600) ==');
  await opzet();
  await page.evaluate(sampler("(function(){ const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.fase = 3; b.hp = 6; verliesHp(b, 30); })();"));
  await slaap(8200);
  await page.evaluate(() => window.__stop());
  const L3 = await page.evaluate(() => window.__log);
  fs.writeFileSync(path.join(UIT, 'b3-log.json'), JSON.stringify(L3, null, 1));

  const b3_0 = L3[0];   // de eerste tik draait NA de trigger: dit is het frame van de klap zelf
  t(b3_0.herrezen && b3_0.hp === 96 && b3_0.vorm2 && b3_0.fase === 3,
    `mechaniek op t=${b3_0.t}ms ONGEWIJZIGD: herrezen=${b3_0.herrezen}, hp=${b3_0.hp}/240 (40%), vorm2=${b3_0.vorm2}, fase=${b3_0.fase}`);
  const b3_3000 = bij(L3, 3000);
  t(b3_3000.hpVar === '0', `--hp op t=${b3_3000.t}ms: "${b3_3000.hpVar}" (bb-vul breedte "${b3_3000.bbVul}") - de balk verklapt de herrijzenis niet`);
  const hpVrij = L3.find(r => r.hpVar !== '0');
  t(!!hpVrij && hpVrij.t >= 3350, `--hp komt vrij op t=${hpVrij ? hpVrij.t : 'nooit'}ms -> "${hpVrij ? hpVrij.hpVar : '-'}" (beat 3400)`);
  const BILJET = String.fromCodePoint(0x1F5F3);
  const stemmen = L3.filter(r => r.fx.indexOf(BILJET) >= 0);
  const stemT = [...new Set(stemmen.map(r => r.t))];
  t(stemmen.length > 0 && stemT[0] >= 850 && stemT[stemT.length - 1] <= 900 + 260 * 3 + 950,
    `stem-cijfers zichtbaar van t=${stemT[0]} tot t=${stemT[stemT.length - 1]}ms (venster 900 + 260*n); eerste tekst: "${stemmen[0].fx}"`);
  const herkozenSrc = L3.filter(r => /_herkozen\./.test(r.src));
  t(herkozenSrc.length > 0 && herkozenSrc[0].t >= 3150, `img.src bevat "_herkozen" vanaf t=${herkozenSrc.length ? herkozenSrc[0].t : 'nooit'}ms: "${herkozenSrc.length ? herkozenSrc[0].src : '-'}"`);
  const hervEerst = L3.find(r => /herverkozen/.test(r.baasKlassen));
  t(!!hervEerst && hervEerst.t >= 3150, `.herverkozen (scale 1.12 + gouden gloed) pas vanaf t=${hervEerst ? hervEerst.t : 'nooit'}ms - niet over zijn eigen lijk op t=0`);
  const b3_5400 = bij(L3, 5400), b3_5800 = bij(L3, 5800);
  t(b3_5400.eindDisabled === true, `invoer dicht op t=${b3_5400.t}ms: disabled=${b3_5400.eindDisabled}`);
  t(b3_5800.eindDisabled === false, `invoer vrij op t=${b3_5800.t}ms: disabled=${b3_5800.eindDisabled}`);
  const doekMax3 = L3.reduce((a, r) => r.doekOp > a.doekOp ? r : a, L3[0]);
  t(Math.abs(doekMax3.doekOp - 0.92) < 0.04, `diepste doek in IV: ${doekMax3.doekOp.toFixed(2)} op t=${doekMax3.t}ms (verwacht .92)`);
  const stilte = tussen(L3, 2980, 3180);
  t(stilte.length > 0 && stilte.every(r => r.doekOp >= 0.90), `de 600ms-stilte ligt in het zwart: doek ${Math.min(...stilte.map(r => r.doekOp)).toFixed(2)}-${Math.max(...stilte.map(r => r.doekOp)).toFixed(2)} over ${stilte.length} samples tussen t=2980-3180ms`);
  const von4 = L3.find(r => r.vonnis && /HERVERKIEZING/.test(r.vonnis));
  t(!!von4 && von4.t >= 3550 && (von4.vonnisSub || '').length > 20, `vonnis "${von4 ? von4.vonnis : '-'}" op t=${von4 ? von4.t : '-'}ms met duiding "${von4 ? (von4.vonnisSub || '').slice(0, 56) : '-'}..."`);
  const von5 = L3.find(r => r.vonnis && /MANDAAT/.test(r.vonnis));
  t(!!von5 && von5.t >= 6750 && von5.vonnisKlein, `V · HET MANDAAT op t=${von5 ? von5.t : 'nooit'}ms, klein kaartje=${von5 ? von5.vonnisKlein : '-'}, doek op dat moment ${von5 ? von5.doekOp.toFixed(2) : '-'} (geen doek, geen klap)`);
  const mandaatLabel = L3.find(r => /MANDAAT/.test(r.bbExtra));
  t(!!mandaatLabel && mandaatLabel.t >= 6750, `permanent strooklabel in de bazenbalk vanaf t=${mandaatLabel ? mandaatLabel.t : 'nooit'}ms: "${mandaatLabel ? mandaatLabel.bbExtra.slice(0, 70) : '-'}"`);
  const kroon = L3.find(r => r.pipAan[3]);
  t(!!kroon && kroon.t >= 3350, `de KROON-pip knapt aan op t=${kroon ? kroon.t : 'nooit'}ms (beat 3400)`);
  const b3_eind = L3[L3.length - 1];
  t(b3_eind.bedrijf === '4', `data-bedrijf op t=${b3_eind.t}ms: "${b3_eind.bedrijf}"`);
  t(/herverkiezing/i.test(b3_eind.achtergrond), `de zaal is gewisseld naar "${b3_eind.achtergrond}"`);
  await page.screenshot({ path: path.join(UIT, 'b3-na.png') });

  /* ============================ B4 · fase-skip ============================ */
  console.log('\n== B4 · fase-skip-vangnet (240 -> 60 in een klap) ==');
  await opzet();
  await page.evaluate(sampler("(function(){ const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.hp = 240; b.fase = 1; b.hp = 60; checkBaasFase(); })();"));
  await slaap(4000);
  await page.evaluate(() => window.__stop());
  const L4 = await page.evaluate(() => window.__log);
  fs.writeFileSync(path.join(UIT, 'b4-log.json'), JSON.stringify(L4, null, 1));
  const b4_200 = bij(L4, 200), b4_3000 = bij(L4, 3000);
  t(/FINALE 2 verschuiving/.test(b4_200.achtergrond), `op t=${b4_200.t}ms staat de overgeslagen zaal er al HARD op: "${b4_200.achtergrond}"`);
  t(b4_3000.bedrijf === '3', `op t=${b4_3000.t}ms draagt het scherm de bedrijf-3-tint: data-bedrijf="${b4_3000.bedrijf}"`);
  const von4b = L4.find(r => r.vonnis);
  t(!!von4b && /TIRADE/.test(von4b.vonnis || ''), `het enige vonnis is "${von4b ? von4b.vonnis : '-'}" op t=${von4b ? von4b.t : '-'}ms (geen banner II erbij)`);
  await page.screenshot({ path: path.join(UIT, 'b4-na.png') });

  /* ============================ opruim ============================ */
  console.log('\n== opruim & regressie ==');
  const rest = await page.evaluate(() => ({
    vonnis: document.querySelectorAll('.vonnis').length,
    doek: document.getElementById('toneel-doek').classList.contains('aan'),
    hitstop: document.getElementById('scherm-gevecht').classList.contains('hitstop'),
    spraak: document.querySelectorAll('.baas-spraak').length,
    baasKlassen: (GDOM.vijanden[0] || {}).wrap ? GDOM.vijanden[0].wrap.className : ''
  }));
  t(rest.vonnis === 0 && !rest.doek && !rest.hitstop, `na afloop: ${rest.vonnis} vonnissen, doek.aan=${rest.doek}, .hitstop=${rest.hitstop}`);
  t(rest.spraak <= 1, `hoogstens een spraakplaat tegelijk (FIFO): ${rest.spraak}`);
  t(!/baas-tik|oprijzen|knielt|deinst|stemt/.test(rest.baasKlassen), `geen achtergebleven regieklassen op de baas: "${rest.baasKlassen}"`);
  t(fouten.length === 0, fouten.length ? 'PAGINAFOUTEN: ' + fouten.slice(0, 4).join(' | ') : 'geen paginafouten in de hele ronde');
  t(mist.length === 0, mist.length ? '404: ' + [...new Set(mist)].slice(0, 6).join(', ') : 'geen 404');
  console.log(`\n============================================\nSTAP B 2D: ${okN} ok, ${foutN} FOUT\n============================================`);
  await ctx.close(); await browser.close();
  process.exit(foutN ? 1 : 0);
})();
