/* RELIKWIE-SONDE v139: speelt elk aangepast relikwie in een echt gevecht na (via de echte beurtwissel,
   eindBeurt -> vijandbeurt -> beginSpelerBeurt) en toetst zijn effect per beurt tegen de nieuwe tekst.
   Gebruik (vanuit de scratchpad): NODE_PATH=<scratchpad>/node_modules SLAYIT_WORKTREE='<pad>' node relikwie_sonde.js */
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const WT = process.env.SLAYIT_WORKTREE;
const HOST = 'localhost:4173';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, fout = 0;
const t = (c, m) => { if (c) { ok++; console.log('   ok   ' + m); } else { fout++; console.log('   FOUT ' + m); } };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const pfouten = [];
  page.on('pageerror', e => pfouten.push(e.message));
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url()); if (u.host !== HOST) return route.abort();
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
    const f = path.join(WT, rel.split('/').join(path.sep));
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ status: 200, contentType: MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(f) });
    return route.fulfill({ status: 404, body: 'weg' });
  });
  await page.goto('http://' + HOST + '/', { waitUntil: 'load' });
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('slayit_wipe', '1'); localStorage.setItem('slayit_nudge', 'weg'); localStorage.setItem('slayit_wereld', '0'); });
  await page.reload({ waitUntil: 'load' }); await slaap(700);
  await page.evaluate(() => { INST.d3 = false; try { bewaarInst(); } catch (e) {} });

  const start = async (rel, fakkel, extra) => {
    await page.evaluate(({ rel, fakkel, extra }) => {
      nieuwSpel('slachter');
      S.relikwieen = rel.slice(); S.fakkel = fakkel; S.hp = S.maxHp - 20;
      if (extra === 'vloeken') S.dek = S.dek.slice(0, 3).concat(['laster', 'laster', 'laster', 'laster', 'laster', 'laster', 'laster'].map(id => ({ id, uid: 'v' + Math.random() })));
      startGevecht(['groene_slijm'], 'gevecht', 1);
    }, { rel, fakkel, extra });
    await slaap(900);
  };
  const staat = () => page.evaluate(() => {
    const g = S.gevecht; if (!g) return null;
    return { beurt: g.beurt, energie: g.energie, max: g.maxEnergie, blok: g.speler.blok || 0, metaal: g.speler.status.metaalhuid || 0,
      hand: g.hand.length, hp: S.hp, bezig: !!g.bezig, voorbij: !!g.voorbij,
      zwak: g.vijanden.map(v => v.status.zwak || 0), vloeken: g.hand.filter(c => kdef(c).type === 'vloek').length };
  });
  const volgende = async () => {
    const b0 = (await staat()).beurt;
    await page.evaluate(() => eindBeurt());
    for (let i = 0; i < 80; i++) { await slaap(150); const s = await staat(); if (!s || s.voorbij || (s.beurt > b0 && !s.bezig)) break; }
    await slaap(300);
    return staat();
  };
  const reeks = async n => { const r = [await staat()]; for (let i = 1; i < n; i++) r.push(await volgende()); return r; };

  console.log('\n== basis (geen relikwie) ==');
  await start([], 100); const basis = await reeks(4);
  const E0 = basis[0].max;
  t(basis.every(s => s.energie === E0), `basis-energie ${basis.map(s => s.energie).join('/')} (max ${E0})`);

  console.log('\n== de Kroon van Sintels (helder) ==');
  await start(['kroon_van_sintels'], 100); let r = await reeks(4);
  t(r.map(s => s.energie).join('/') === [E0 + 1, E0 + 1, E0 + 1, E0].join('/'), `+1 Energie in je eerste 3 beurten: ${r.map(s => s.energie).join('/')}`);

  console.log('\n== het Energiekristal ==');
  await start(['energiekristal'], 100); r = await reeks(4);
  t(r.map(s => s.energie).join('/') === [E0 + 1, E0 + 1, E0 + 1, E0].join('/'), `+1 Energie in je eerste 3 beurten: ${r.map(s => s.energie).join('/')}`);

  console.log('\n== de Schaduwkroon (duister: fakkel 20) en de controle (helder) ==');
  await start(['schaduwkroon'], 20); r = await reeks(4);
  t(r.map(s => s.energie).join('/') === [E0 + 1, E0 + 1, E0 + 1, E0].join('/'), `duister: +1 Energie in je eerste 3 beurten: ${r.map(s => s.energie).join('/')}`);
  await start(['schaduwkroon'], 100); r = await reeks(2);
  t(r.every(s => s.energie === E0), `helder: niets: ${r.map(s => s.energie).join('/')}`);

  console.log('\n== de Mosamulet ==');
  await start(['mosamulet'], 100); r = await reeks(4);
  t(r[0].blok === 3 && r[1].blok >= 3 && r[2].blok >= 3 && r[3].blok === 0, `3 Blok aan het begin van beurt 1-3, niet in beurt 4: Blok ${r.map(s => s.blok).join('/')}`);

  console.log('\n== de Dossierklem ==');
  await start(['dossierklem'], 100); r = await reeks(4);
  t(r.every(s => s.metaal === 1), `1 Metaalhuid bij de start, groeit niet: ${r.map(s => s.metaal).join('/')}`);

  console.log('\n== de Verloren Index-kaart ==');
  await start(['indexkaart'], 100);
  const idx = await page.evaluate(async () => {
    const g = S.gevecht; const uit = [];
    for (let i = 0; i < 2; i++) {
      const c = g.hand.find(k => kdef(k).type === 'aanval' && kdef(k).kost <= g.energie && !/blok/i.test(kdef(k).tekst ? String(typeof kdef(k).tekst === 'function' ? kdef(k).tekst(k) : kdef(k).tekst) : ''));
      if (!c) break;
      const voor = g.speler.blok || 0;
      await speelKaart(c, alleVijanden()[0]);
      await new Promise(r => setTimeout(r, 500));
      uit.push((g.speler.blok || 0) - voor);
    }
    return { uit, status: g.speler.status.geindexeerd || 0 };
  });
  t(idx.uit[0] === 1 && (idx.uit.length < 2 || idx.uit[1] === 0) && idx.status === 0, `eerste aanval +1 Blok, tweede +0, geen status Geïndexeerd: ${JSON.stringify(idx)}`);

  console.log('\n== de Hartsteen (beurt 1) ==');
  const hp0 = await page.evaluate(() => { nieuwSpel('slachter'); S.relikwieen = ['hartsteen']; S.hp = S.maxHp - 20; return S.hp; });
  await page.evaluate(() => startGevecht(['groene_slijm'], 'gevecht', 1)); await slaap(900);
  const hp1 = (await staat()).hp;
  t(hp1 === hp0 + 1, `+1 HP bij de start van je eerste beurt: ${hp0} -> ${hp1}`);

  console.log('\n== de Mottenkroon (beurt 1, helder) ==');
  await start([], 100); const h0 = (await staat()).hand;
  await start(['mottenkroon'], 100); const h1 = (await staat()).hand;
  t(h1 === h0 + 1, `1 extra kaart in je eerste hand: ${h0} -> ${h1}`);

  console.log('\n== het Volkslied (beurt 1, >= 2 vloeken in de hand) ==');
  await start(['het_volkslied'], 100, 'vloeken'); const vs = await staat();
  t(vs.vloeken < 2 || vs.energie === E0 + 1, `met ${vs.vloeken} vloeken in je eerste hand: Energie ${vs.energie} (max ${E0})`);

  console.log('\n== de Bottenfluit + het Rode Lint ==');
  await start(['rode_lint', 'bottenfluit'], 100); const bf = await staat();
  t(Math.max(...bf.zwak) >= 2, `het Rode Lint houdt zijn 2 Zwak: Zwak per vijand ${bf.zwak.join('/')}`);

  console.log('\n== het Houten Been niet in de pools ==');
  const hb = await page.evaluate(() => ({ start: !!RELIKWIEEN.houten_been.start, inPool: Object.keys(RELIKWIEEN).filter(r => !RELIKWIEEN[r].start).includes('houten_been') }));
  t(hb.start && !hb.inPool, `start: true, niet in de winkel-/buitpool: ${JSON.stringify(hb)}`);

  console.log('\n== de teksten ==');
  const tk = await page.evaluate(() => ['dossierklem', 'mosamulet', 'kroon_van_sintels', 'energiekristal', 'schaduwkroon', 'indexkaart'].map(id => id + ': ' + RELIKWIEEN[id].tekst));
  tk.forEach(x => console.log('   · ' + x));
  t(pfouten.length === 0, pfouten.length ? 'PAGINAFOUTEN: ' + pfouten.slice(0, 3).join(' | ') : 'geen paginafouten');
  console.log(`\nRELIKWIE-SONDE: ${ok} ok, ${fout} FOUT`);
  await browser.close();
  process.exit(fout ? 1 : 0);
})();
