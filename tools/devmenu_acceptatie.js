// DEV-MENU · ACCEPTATIE (v122)
// Opent het menu langs alle drie de wegen (logo-klik op laptop, lange druk en vijf tikken
// op het versielabel op mobiel staand en liggend), klikt ELKE knop uit DEV_MENU een keer en
// meet de staat erna. Elke regel toont de GEMETEN waarde, nooit "werkt".
//
// Draaien:
//   cd <scratchpad>
//   NODE_PATH="$PWD/node_modules" SLAYIT_WORKTREE="...\SLAY-IT-devmenu" \
//   SLAYIT_SHOTS="$PWD/devmenu_shots" node "...\SLAY-IT-devmenu\tools\devmenu_acceptatie.js"
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const WT = process.env.SLAYIT_WORKTREE || 'C:/Users/Thomas Aelbrecht/Desktop/Workspace/SLAY-IT-devmenu';
const HOST = 'localhost:4183';
const UIT = process.env.SLAYIT_SHOTS || path.join(__dirname, 'devmenu_shots'); fs.mkdirSync(UIT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));
let okN = 0, foutN = 0;
const t = (goed, tekst) => { if (goed) { okN++; console.log('   ok   ' + tekst); } else { foutN++; console.log('   FOUT ' + tekst); } };

/* ---------- de staatssonde: alles wat een dev-knop kan raken, in een lezing ---------- */
const SONDE = () => {
  const sc = document.getElementById('scherm-gevecht');
  const doek = document.getElementById('toneel-doek');
  const eind = document.getElementById('knop-eindbeurt');
  const b = (typeof S !== 'undefined' && S && S.gevecht) ? S.gevecht.vijanden.find(v => v.id === 'de_dicktator') : null;
  return {
    scherm: document.body.dataset.scherm || '',
    modus: document.body.dataset.modus || '',
    act: (typeof S !== 'undefined' && S) ? S.act : null,
    held: (typeof S !== 'undefined' && S) ? S.held : null,
    hp: (typeof S !== 'undefined' && S) ? S.hp : null,
    maxHp: (typeof S !== 'undefined' && S) ? S.maxHp : null,
    dek: (typeof S !== 'undefined' && S && S.dek) ? S.dek.length : null,
    relikwieen: (typeof S !== 'undefined' && S && S.relikwieen) ? S.relikwieen.length : null,
    metgezel: (typeof S !== 'undefined' && S && S.metgezel) ? S.metgezel.id : null,
    inGevecht: !!(typeof S !== 'undefined' && S && S.gevecht),
    vijanden: (typeof S !== 'undefined' && S && S.gevecht) ? S.gevecht.vijanden.map(v => v.id + (v.dood ? '\u2020' : '')).join(',') : '',
    baas: b ? { hp: b.hp, maxHp: b.maxHp, fase: b.fase || 1, vorm2: !!b.vorm2, herrezen: !!b.herrezen, krachtVast: b.krachtVast || 0 } : null,
    bedrijf: sc ? (sc.dataset.bedrijf || '') : '',
    tirade: document.body.classList.contains('tirade'),
    ceremonie: document.body.classList.contains('ceremonie'),
    hitstop: sc ? sc.classList.contains('hitstop') : false,
    doek: doek ? doek.classList.contains('aan') : false,
    vonnis: document.querySelectorAll('.vonnis').length,
    eindDisabled: eind ? !!eind.disabled : null,
    d3: INST.d3, lite: INST.lite,
    wereld: document.body.classList.contains('wereld'),
    tempo: DICK.tempo,
    devOpslag: (() => { try { return localStorage.getItem('slayit_dev'); } catch (e) { return 'ERR'; } })(),
    dagwet: wetVanDag._force || '',
    codex: {
      dropsGevallen: (Codex.gevallen || []).indexOf('drops') >= 0,
      dropsMysterie: !!(Codex.mysteries && Codex.mysteries.drops),
      metgezellen: (Codex.metgezellen || []).slice().sort().join(','),
      erfprins: Codex.erfprinsOntmoetingen || 0
    },
    menuOpen: !!document.getElementById('dev-menu'),
    overlays: [...document.querySelectorAll('.overlay.open')].map(e => e.id || e.className).join('|'),
    slachtblok: !!document.querySelector('#overlay-slachtblok'),
    url: location.pathname
  };
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const fouten = [], consoleFout = [], mist = [];
  page.on('pageerror', e => fouten.push(e.message));
  page.on('console', m => { if (m.type() === 'error') consoleFout.push(m.text()); });
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url()); if (u.host !== HOST) return route.abort();
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
    const f = path.join(WT, rel.split('/').join(path.sep));
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ status: 200, contentType: MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(f) });
    mist.push(rel); return route.fulfill({ status: 404, body: 'weg' });
  });

  const sonde = () => page.evaluate(SONDE);
  const boot = async () => {
    await page.goto('http://' + HOST + '/', { waitUntil: 'load' });
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('slayit_wipe', '1'); localStorage.setItem('slayit_nudge', 'weg'); localStorage.setItem('slayit_wereld', '0'); });
    await page.reload({ waitUntil: 'load' }); await slaap(600);
    await page.evaluate(() => { INST.d3 = false; try { bewaarInst(); } catch (e) {} try { toonHeldKeuze(); } catch (e) {} }); await slaap(300);
    await page.evaluate(() => { const k = document.querySelector('.held-kies'); if (k) k.click(); }); await slaap(300);
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /toch beginnen/i.test(x.textContent)); if (b) b.click(); }); await slaap(900);
  };
  const openLogo = async () => {
    await page.evaluate(() => { const l = document.querySelector('.tb-logo'); if (l) l.click(); });
    await slaap(260);
  };
  const dichtMenu = () => page.evaluate(() => { if (typeof devMenuSluit === 'function') devMenuSluit(); });

  await boot();

  /* ============================================================
     1 · TOEGANG
     ============================================================ */
  console.log('\n== 1 \u00b7 TOEGANG ==');
  await openLogo();
  await slaap(1700);   /* het versielabel komt van een fetch op sw.js: het kopje vult zich na */
  let s = await sonde();
  t(s.menuOpen, `laptop \u00b7 klik op het logo opent het menu: #dev-menu aanwezig = ${s.menuOpen}`);
  const kopTekst = await page.evaluate(() => { const h = document.querySelector('#dev-menu h3'); return h ? h.textContent.trim() : ''; });
  t(/^\u26a1 DEV-menu \u00b7 v\d+/.test(kopTekst), `kopje toont de shell-versie: "${kopTekst}"`);
  const koppen = await page.evaluate(() => [...document.querySelectorAll('#dev-menu .dev-kop')].map(e => e.textContent));
  t(koppen.length === 7, `${koppen.length} groepen in het menu: ${koppen.join(' \u00b7 ')}`);
  await page.screenshot({ path: path.join(UIT, 'menu-laptop.png') });

  /* tweede logo-klik = toggle dicht */
  await openLogo();
  s = await sonde();
  t(!s.menuOpen, `tweede logo-klik sluit het menu (toggle): menuOpen = ${s.menuOpen}`);
  /* Escape */
  await openLogo();
  await page.keyboard.press('Escape'); await slaap(200);
  s = await sonde();
  t(!s.menuOpen, `Escape sluit het menu: menuOpen = ${s.menuOpen}`);
  /* klik buiten de kaart */
  await openLogo();
  await page.mouse.click(30, 30); await slaap(220);
  s = await sonde();
  t(!s.menuOpen, `klik buiten de kaart sluit het menu: menuOpen = ${s.menuOpen}`);
  /* de sluitknop */
  await openLogo();
  await page.evaluate(() => document.querySelector('#dev-menu .dev-dicht').click()); await slaap(200);
  s = await sonde();
  t(!s.menuOpen, `de Sluit-knop sluit het menu: menuOpen = ${s.menuOpen}`);
  /* geen modifier-shortcuts meer: Alt+klik mag NIET naar de Erfprins springen */
  await page.keyboard.down('Alt');
  await page.evaluate(() => { const l = document.querySelector('.tb-logo'); if (l) l.dispatchEvent(new MouseEvent('click', { altKey: true, bubbles: true })); });
  await page.keyboard.up('Alt'); await slaap(400);
  s = await sonde();
  t(s.menuOpen && !s.inGevecht, `Alt+klik op het logo opent gewoon het menu (geen Erfprins-sprong): menuOpen=${s.menuOpen}, inGevecht=${s.inGevecht}`);
  await dichtMenu();

  /* het versielabel op de LAPTOP: lange druk en vijf tikken */
  const versieDoos = async () => {
    await page.evaluate(() => toonInstellingen()); await slaap(700);
    const el = await page.$('#inst-versie');
    if (!el) return null;
    /* liggend (800x360) staat het label onderaan een scrollende overlay: eerst in beeld */
    try { await el.scrollIntoViewIfNeeded(); } catch (e) {}
    await slaap(200);
    return await el.boundingBox();
  };
  let bb = await versieDoos();
  t(!!bb && bb.width > 4 && bb.height > 4, `#inst-versie is aanraakbaar: ${bb ? Math.round(bb.width) + '\u00d7' + Math.round(bb.height) + 'px' : 'GEEN doos'}`);
  if (bb) {
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await page.mouse.down(); await slaap(900); await page.mouse.up(); await slaap(300);
    s = await sonde();
    t(s.menuOpen && !/overlay-instellingen/.test(s.overlays), `laptop \u00b7 LANGE DRUK (900 ms) op het versielabel opent het menu en sluit \u2699\ufe0f: menuOpen=${s.menuOpen}, open overlays="${s.overlays}"`);
    await dichtMenu();
    bb = await versieDoos();
    for (let i = 0; i < 5; i++) { await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await slaap(90); }
    await slaap(300);
    s = await sonde();
    t(s.menuOpen, `laptop \u00b7 VIJF tikken binnen 2 s op het versielabel openen het menu: menuOpen = ${s.menuOpen}`);
    await dichtMenu();
    /* traag tikken mag NIET openen */
    bb = await versieDoos();
    for (let i = 0; i < 4; i++) { await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await slaap(700); }
    await slaap(200);
    s = await sonde();
    t(!s.menuOpen, `vier trage tikken (700 ms uit elkaar) openen het menu NIET: menuOpen = ${s.menuOpen}`);
    await page.evaluate(() => sluitInstellingen());
  }

  /* ============================================================
     2 · MOBIEL \u2014 staand 412x915 en liggend 800x360
     ============================================================ */
  for (const vp of [{ naam: 'staand', w: 412, h: 915 }, { naam: 'liggend', w: 800, h: 360 }]) {
    console.log(`\n== 2 \u00b7 MOBIEL ${vp.naam} ${vp.w}\u00d7${vp.h} ==`);
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.evaluate(() => devMobiel(true)); await slaap(400);
    const logoZicht = await page.evaluate(() => { const l = document.querySelector('.tb-logo'); return l ? getComputedStyle(l).display : 'geen'; });
    t(logoZicht === 'none', `het logo is op mobiel verborgen (display: ${logoZicht}) \u2014 de versielabel-haak is daar de enige weg`);
    /* lange druk */
    bb = await versieDoos();
    t(!!bb, `${vp.naam} \u00b7 #inst-versie zichtbaar: ${bb ? Math.round(bb.width) + '\u00d7' + Math.round(bb.height) + 'px op y=' + Math.round(bb.y) : 'GEEN doos'}`);
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await page.mouse.down(); await slaap(900); await page.mouse.up(); await slaap(350);
    s = await sonde();
    t(s.menuOpen, `${vp.naam} \u00b7 lange druk opent het menu: menuOpen = ${s.menuOpen}`);
    /* de mobiele maatvoering meten */
    const maat = await page.evaluate(() => {
      const kaart = document.querySelector('#dev-menu .dev-kaart');
      const knoppen = [...document.querySelectorAll('#dev-menu .dev-k, #dev-menu .dev-pil, #dev-menu .dev-kies select')];
      const hoogtes = knoppen.map(k => Math.round(k.getBoundingClientRect().height));
      const dicht = document.querySelector('#dev-menu .dev-dicht');
      const r = kaart.getBoundingClientRect();
      return {
        kaartH: Math.round(r.height), kaartB: Math.round(r.width),
        scrollH: kaart.scrollHeight, clientH: kaart.clientHeight,
        overflow: getComputedStyle(kaart).overflowY,
        minKnop: Math.min(...hoogtes), nKnop: hoogtes.length,
        dichtPos: getComputedStyle(dicht).position,
        paginaScrollB: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        padLinks: getComputedStyle(kaart).paddingLeft, padBoven: getComputedStyle(kaart).paddingTop
      };
    });
    t(maat.minKnop >= 44, `${vp.naam} \u00b7 kleinste raakdoel van ${maat.nKnop} knoppen/pillen: ${maat.minKnop}px (>= 44)`);
    t(maat.overflow === 'auto' || maat.overflow === 'scroll', `${vp.naam} \u00b7 de kaart scrollt zelf: overflow-y "${maat.overflow}", scrollHeight ${maat.scrollH} in clientHeight ${maat.clientH}`);
    t(maat.kaartH <= vp.h, `${vp.naam} \u00b7 de kaart past binnen 100dvh: ${maat.kaartH}px in ${vp.h}px`);
    t(maat.dichtPos === 'sticky', `${vp.naam} \u00b7 de sluitknop blijft bereikbaar: position "${maat.dichtPos}"`);
    t(maat.paginaScrollB === 0, `${vp.naam} \u00b7 geen horizontale paginascroll: ${maat.paginaScrollB}px`);
    /* echt naar de sluitknop scrollen en hem raken */
    await page.evaluate(() => { const k = document.querySelector('#dev-menu .dev-kaart'); k.scrollTop = k.scrollHeight; });
    await slaap(200);
    await page.screenshot({ path: path.join(UIT, `menu-mobiel-${vp.naam}.png`) });
    const dichtBB = await (await page.$('#dev-menu .dev-dicht')).boundingBox();
    t(!!dichtBB && dichtBB.y >= 0 && dichtBB.y + dichtBB.height <= vp.h + 1, `${vp.naam} \u00b7 de sluitknop staat helemaal in beeld: y=${Math.round(dichtBB.y)}..${Math.round(dichtBB.y + dichtBB.height)} in ${vp.h}px`);
    await page.mouse.click(dichtBB.x + dichtBB.width / 2, dichtBB.y + dichtBB.height / 2); await slaap(250);
    s = await sonde();
    t(!s.menuOpen, `${vp.naam} \u00b7 tik op de sluitknop sluit het menu: menuOpen = ${s.menuOpen}`);
    /* vijf tikken */
    bb = await versieDoos();
    for (let i = 0; i < 5; i++) { await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await slaap(90); }
    await slaap(300);
    s = await sonde();
    t(s.menuOpen, `${vp.naam} \u00b7 vijf tikken openen het menu: menuOpen = ${s.menuOpen}`);
    await dichtMenu();
    await page.evaluate(() => sluitInstellingen());
  }
  await page.evaluate(() => devMobiel(false)); await slaap(300);
  await page.setViewportSize({ width: 1440, height: 900 }); await slaap(300);

  /* ============================================================
     3 · ELKE KNOP EEN KEER
     ============================================================ */
  const tabel = await page.evaluate(() => DEV_MENU.map(g => ({
    kop: g.kop,
    items: g.items.map(i => ({ label: i.label || '', soort: i.soort || 'knop', opties: (i.opties || []).map(o => ({ v: String(o.v), label: o.label })) }))
  })));
  const DK = await page.evaluate(() => DEV_KLAP);
  const klik = async (gi, ii, extra) => {
    if (!(await sonde()).menuOpen) await openLogo();
    await page.evaluate(([g, i, e]) => {
      const rij = document.querySelectorAll('#dev-menu .dev-rij')[g];
      const el = rij.children[i];
      if (e && e.pil != null) el.querySelectorAll('.dev-pil')[e.pil].click();
      else if (e && e.sel != null) { const s2 = el.querySelector('select'); s2.value = e.sel; s2.dispatchEvent(new Event('change', { bubbles: true })); }
      else el.click();
    }, [gi, ii, extra || null]);
  };
  /* de klap langs het NORMALE schadepad, precies zoals speelKaart/naActie hem doen
     (en zoals tools/drama_stap_b_2d.js hem vuurt) */
  const klapNu = n => page.evaluate(m => {
    const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator');
    verliesHp(b, m); checkBaasFase();
  }, n);
  const wachtGevecht = async (ms) => {
    for (let i = 0; i < 40; i++) {
      if (await page.evaluate(() => document.body.dataset.scherm === 'gevecht' && !!S.gevecht && !document.querySelector('#baas-intro'))) break;
      await slaap(300);
    }
    await slaap(ms || 700);
  };

  /* ---------- 3a \u00b7 SPRINGEN ---------- */
  console.log('\n== 3a \u00b7 SPRINGEN ==');
  await klik(0, 0); await slaap(1200); s = await sonde();
  t(s.act === 2 && !s.inGevecht && /kaart|wereld/.test(s.scherm), `Act 2 \u00b7 kaart \u2192 scherm "${s.scherm}", act ${s.act}, inGevecht ${s.inGevecht}, ${s.hp}/${s.maxHp} HP`);
  await klik(0, 1); await slaap(1200); s = await sonde();
  t(s.act === 3 && !s.inGevecht && /kaart|wereld/.test(s.scherm), `Act 3 \u00b7 kaart \u2192 scherm "${s.scherm}", act ${s.act}, ${s.hp}/${s.maxHp} HP`);
  await klik(0, 2); await wachtGevecht(); s = await sonde();
  t(s.inGevecht && /slijmkoning/.test(s.vijanden) && s.act === 1, `Slijmkoning \u2192 act ${s.act}, vijanden "${s.vijanden}", ${s.hp}/${s.maxHp} HP`);
  await klik(0, 3); await wachtGevecht(); s = await sonde();
  t(s.inGevecht && /de_erfprins/.test(s.vijanden) && s.metgezel === null, `Erfprins \u2192 act ${s.act}, vijanden "${s.vijanden}", metgezel ${s.metgezel} (solo)`);
  await klik(0, 4); await wachtGevecht(); s = await sonde();
  t(s.inGevecht && /de_erfprins/.test(s.vijanden), `Erfprins \u00b7 eerste ontmoeting \u2192 vijanden "${s.vijanden}", Codex.erfprinsOntmoetingen = ${s.codex.erfprins}`);

  /* ---------- 3b \u00b7 HET PROCES ---------- */
  console.log('\n== 3b \u00b7 HET PROCES ==');
  const proces = tabel[1];
  /* de twee keuzerijen: elke pil een keer */
  for (let p = 0; p < proces.items[0].opties.length; p++) {
    await klik(1, 0, { pil: p }); await slaap(150);
    const st = await sonde();
    const wil = proces.items[0].opties[p].v;
    t(JSON.parse(st.devOpslag || '{}').build === wil, `BUILD-pil "${proces.items[0].opties[p].label}" \u2192 slayit_dev = ${st.devOpslag}`);
  }
  for (let p = 0; p < proces.items[1].opties.length; p++) {
    await klik(1, 1, { pil: p }); await slaap(150);
    const st = await sonde();
    const wil = +proces.items[1].opties[p].v;
    t(st.tempo === wil && JSON.parse(st.devOpslag || '{}').tempo === wil, `TEMPO-pil "${proces.items[1].opties[p].label}" \u2192 DICK.tempo = ${st.tempo}, slayit_dev = ${st.devOpslag}`);
  }
  /* terug op de standaard: 1x en de mediaan-Slachter */
  await klik(1, 1, { pil: 0 }); await slaap(120);
  await klik(1, 0, { pil: 0 }); await slaap(120);
  s = await sonde();
  t(s.tempo === 1, `terug op de standaard: DICK.tempo = ${s.tempo}, slayit_dev = ${s.devOpslag}`);
  /* het menu blijft open na een pil-klik (je kiest build en tempo achter elkaar) */
  t(s.menuOpen, `het menu blijft open na een keuze-pil: menuOpen = ${s.menuOpen}`);
  await dichtMenu();

  /* de onthouden keuze overleeft een herlaad */
  await klik(1, 0, { pil: 2 }); await slaap(150); await dichtMenu();
  await page.reload({ waitUntil: 'load' }); await slaap(900);
  const bewaard = await page.evaluate(() => ({ dev: localStorage.getItem('slayit_dev'), build: devInst().build, tempo: DICK.tempo }));
  t(bewaard.build === 'gif_matig', `de BUILD-keuze overleeft een herlaad: devInst().build = "${bewaard.build}" (slayit_dev ${bewaard.dev}), DICK.tempo = ${bewaard.tempo}`);
  await klik(1, 0, { pil: 0 }); await slaap(150); await dichtMenu();

  /* \u25b6 vanaf het begin */
  await klik(1, 2); await wachtGevecht(1200); s = await sonde();
  t(s.inGevecht && /de_dicktator/.test(s.vijanden) && s.held === 'slachter' && (s.baas || {}).fase === 1,
    `\u25b6 Vanaf het begin \u2192 held "${s.held}", ${s.hp}/${s.maxHp} HP, ${s.dek} kaarten, ${s.relikwieen} relikwie\u00ebn, baas ${s.baas.hp}/${s.baas.maxHp} fase ${s.baas.fase}, vijanden "${s.vijanden}"`);

  /* \u26a1 net v\u00f3\u00f3r I->II */
  await klik(1, 3); await wachtGevecht(1200); s = await sonde();
  const grens2 = Math.floor(s.baas.maxHp * 0.66), grens3 = Math.floor(s.baas.maxHp * 0.33);
  t(s.baas.hp === grens2 + DK && s.baas.fase === 1 && /de_griffier/.test(s.vijanden) && /de_deurwaarder/.test(s.vijanden),
    `\u26a1 Net v\u00f3\u00f3r I\u2192II \u2192 baas ${s.baas.hp}/${s.baas.maxHp} (drempel ${grens2} + ${DK}), fase ${s.baas.fase}, hof "${s.vijanden}"`);
  await klapNu(DK); await slaap(500);
  let mid = await sonde();
  t(mid.ceremonie && mid.eindDisabled === true, `\u2026 \u00e9\u00e9n klap van ${DK} start de regie: body.ceremonie=${mid.ceremonie}, invoer dicht=${mid.eindDisabled}`);
  await slaap(4600); s = await sonde();
  t(s.baas.fase === 2 && s.bedrijf === '2' && !s.ceremonie && s.eindDisabled === false && s.vonnis === 0 && !s.doek && !s.hitstop,
    `\u2026 en landt in bedrijf II: fase ${s.baas.fase}, data-bedrijf "${s.bedrijf}", ceremonie ${s.ceremonie}, invoer vrij ${s.eindDisabled === false}, ${s.vonnis} vonnissen, doek ${s.doek}, hitstop ${s.hitstop}`);

  /* \u26a1 net v\u00f3\u00f3r II->III */
  await klik(1, 4); await wachtGevecht(1200); s = await sonde();
  t(s.baas.hp === grens3 + DK && s.baas.fase === 2 && s.bedrijf === '2',
    `\u26a1 Net v\u00f3\u00f3r II\u2192III \u2192 baas ${s.baas.hp}/${s.baas.maxHp} (drempel ${grens3} + ${DK}), fase ${s.baas.fase}, data-bedrijf "${s.bedrijf}", hof "${s.vijanden}"`);
  await klapNu(DK); await slaap(600);
  mid = await sonde();
  t(mid.ceremonie, `\u2026 \u00e9\u00e9n klap van ${DK} start DE TIRADE: body.ceremonie = ${mid.ceremonie}`);
  await slaap(6000); s = await sonde();
  t(s.baas.fase === 3 && s.bedrijf === '3' && s.tirade && /de_griffier\u2020/.test(s.vijanden) && !s.ceremonie && s.eindDisabled === false && s.vonnis === 0,
    `\u2026 en landt in bedrijf III: fase ${s.baas.fase}, data-bedrijf "${s.bedrijf}", body.tirade ${s.tirade}, vijanden "${s.vijanden}", invoer vrij ${s.eindDisabled === false}, ${s.vonnis} vonnissen`);

  /* \u26a1 net v\u00f3\u00f3r IV */
  await klik(1, 5); await wachtGevecht(1200); s = await sonde();
  t(s.baas.hp === DK && s.baas.fase === 3 && s.bedrijf === '3' && s.tirade && /de_griffier\u2020/.test(s.vijanden) && /de_claqueur/.test(s.vijanden),
    `\u26a1 Net v\u00f3\u00f3r IV \u2192 baas ${s.baas.hp}/${s.baas.maxHp}, fase ${s.baas.fase}, data-bedrijf "${s.bedrijf}", tirade ${s.tirade}, vijanden "${s.vijanden}"`);
  await klapNu(DK); await slaap(600);
  mid = await sonde();
  t(mid.ceremonie && mid.baas.herrezen && mid.baas.vorm2, `\u2026 \u00e9\u00e9n klap van ${DK} = DE HERVERKIEZING: ceremonie=${mid.ceremonie}, herrezen=${mid.baas.herrezen}, vorm2=${mid.baas.vorm2}, hp ${mid.baas.hp}/${mid.baas.maxHp}`);
  await slaap(7600); s = await sonde();
  t(s.baas.fase === 3 && s.bedrijf === '4' && !s.ceremonie && s.eindDisabled === false && s.vonnis === 0 && !s.doek && !s.hitstop,
    `\u2026 en landt in V: data-bedrijf "${s.bedrijf}", herrezen ${s.baas.herrezen}, ${s.baas.hp}/${s.baas.maxHp} HP, invoer vrij ${s.eindDisabled === false}, ${s.vonnis} vonnissen, doek ${s.doek}, hitstop ${s.hitstop}`);

  /* \u23f3 V \u00b7 Het Mandaat (de staart) */
  await klik(1, 6); await wachtGevecht(1200); await slaap(9000); s = await sonde();
  t(s.baas.herrezen && s.baas.vorm2 && s.bedrijf === '4' && s.baas.krachtVast > 0 && s.hp === Math.round(88 * 0.40) && !s.ceremonie,
    `\u23f3 V \u00b7 Het Mandaat (de staart) \u2192 jij ${s.hp}/${s.maxHp} HP zonder dranken, baas ${s.baas.hp}/${s.baas.maxHp} herrezen ${s.baas.herrezen} vorm2 ${s.baas.vorm2} krachtVast ${s.baas.krachtVast}, data-bedrijf "${s.bedrijf}", ceremonie ${s.ceremonie}`);

  /* \u25b6\u25b6 de drie 'speel nu af'-knoppen */
  const speelAf = [
    { i: 7, naam: 'I\u2192II', wacht: 6000, na: st => st.baas.fase === 2 && st.bedrijf === '2' },
    { i: 8, naam: 'II\u2192III', wacht: 7400, na: st => st.baas.fase === 3 && st.bedrijf === '3' && st.tirade },
    { i: 9, naam: 'IV', wacht: 9000, na: st => st.baas.herrezen && st.baas.vorm2 && st.bedrijf === '4' }
  ];
  for (const sa of speelAf) {
    await klik(1, sa.i);
    await wachtGevecht(0);
    /* de ceremonie moet vanzelf beginnen \u2014 zonder dat wij slaan */
    let zagCeremonie = false, zagDicht = false;
    for (let k = 0; k < 40; k++) {
      const st = await page.evaluate(() => ({ c: document.body.classList.contains('ceremonie'), d: (document.getElementById('knop-eindbeurt') || {}).disabled }));
      if (st.c) zagCeremonie = true;
      if (st.d === true) zagDicht = true;
      if (zagCeremonie && !st.c) break;
      await slaap(200);
    }
    t(zagCeremonie && zagDicht, `\u25b6\u25b6 Speel ${sa.naam} nu af \u2192 de regie speelt vanzelf: body.ceremonie gezien = ${zagCeremonie}, invoer dicht gezien = ${zagDicht}`);
    await slaap(sa.wacht); s = await sonde();
    t(sa.na(s), `\u2026 eindstaat: fase ${s.baas.fase}, data-bedrijf "${s.bedrijf}", vorm2 ${s.baas.vorm2}, herrezen ${s.baas.herrezen}, tirade ${s.tirade}`);
    t(!s.ceremonie && s.eindDisabled === false && s.vonnis === 0 && !s.doek && !s.hitstop,
      `\u2026 schoon opgeruimd: ceremonie ${s.ceremonie}, invoer vrij ${s.eindDisabled === false}, ${s.vonnis} .vonnis, #toneel-doek.aan ${s.doek}, .hitstop ${s.hitstop}`);
  }

  /* ---------- 3c \u00b7 METGEZEL ---------- */
  console.log('\n== 3c \u00b7 METGEZEL ==');
  const mg = [['drops', 'Drops'], ['vlamwachter', 'Vlamwacht'], ['mosgeest', 'Mosgeest'], ['drops_wit', 'De Witte'], [null, 'weg']];
  for (let i = 0; i < mg.length; i++) {
    await klik(2, i); await slaap(700); s = await sonde();
    t(s.metgezel === mg[i][0], `${mg[i][1]} \u2192 S.metgezel = ${JSON.stringify(s.metgezel)}`);
  }

  /* ---------- 3d \u00b7 DROPS-BOOG ---------- */
  console.log('\n== 3d \u00b7 DROPS-BOOG ==');
  await klik(3, 0); await wachtGevecht(); s = await sonde();
  t(s.metgezel === 'drops' && /de_erfprins/.test(s.vijanden), `1 \u00b7 Levend vs Erfprins \u2192 metgezel ${s.metgezel}, vijanden "${s.vijanden}"`);
  await klik(3, 1); await wachtGevecht(); s = await sonde();
  t(s.codex.dropsGevallen && /groene_slijm/.test(s.vijanden), `2 \u00b7 Grief \u2192 Codex.gevallen bevat drops = ${s.codex.dropsGevallen}, vijanden "${s.vijanden}", fakkel-scherm "${s.scherm}"`);
  await klik(3, 2); await wachtGevecht(1400); s = await sonde();
  t(s.codex.dropsGevallen && /de_erfprins/.test(s.vijanden), `3 \u00b7 Re\u00fcnie \u2192 gevallen ${s.codex.dropsGevallen}, vijanden "${s.vijanden}", Codex.metgezellen "${s.codex.metgezellen}"`);
  await klik(3, 3); await wachtGevecht(); s = await sonde();
  t(s.metgezel === 'drops_wit' && /de_erfprins/.test(s.vijanden), `4 \u00b7 De Witte vecht mee \u2192 metgezel ${s.metgezel}, vijanden "${s.vijanden}"`);
  await klik(3, 4); await slaap(700); s = await sonde();
  t(!s.codex.dropsGevallen && !s.codex.dropsMysterie && !/drops/.test(s.codex.metgezellen), `5 \u00b7 \u26a0 Drops-Codex resetten \u2192 gevallen ${s.codex.dropsGevallen}, mysterie ${s.codex.dropsMysterie}, Codex.metgezellen "${s.codex.metgezellen}" (alleen de drops-sleutels gaan eruit)`);
  await openLogo();
  const warnKlassen = await page.evaluate(() => { const l = []; document.querySelectorAll('#dev-menu .dev-k').forEach(b => { if (/^\u26a0/.test(b.textContent)) l.push(b.textContent.slice(0, 30) + ' \u2192 .dev-warn=' + b.classList.contains('dev-warn')); }); return l; });
  t(warnKlassen.length === 2 && warnKlassen.every(x => /true$/.test(x)), `de destructieve knoppen dragen \u26a0 \u00e9n .dev-warn: ${warnKlassen.join(' | ')}`);
  await dichtMenu();

  /* ---------- 3e \u00b7 SC\u00c8NES ---------- */
  console.log('\n== 3e \u00b7 SC\u00c8NES ==');
  await klik(4, 0); await slaap(1400); s = await sonde();
  const nissen = await page.evaluate(() => document.querySelectorAll('.drempel-nis').length);
  t(s.scherm === 'einde' && nissen === 3, `Drempel + Drops-trio \u2192 scherm "${s.scherm}", ${nissen} nissen`);
  await klik(4, 1); await slaap(1200); s = await sonde();
  t(s.slachtblok, `Het Slachtblok \u2192 #overlay-slachtblok aanwezig = ${s.slachtblok}, dek ${s.dek} kaarten`);
  await page.evaluate(() => sluitSlachtblok(false)); await slaap(700);
  await klik(4, 2); await slaap(2200); s = await sonde();
  const outro = await page.evaluate(() => !!document.querySelector('#outro, .outro, [id^="outro"]') || document.body.dataset.scherm);
  t(!!outro, `De Outro \u2192 scherm "${s.scherm}", outro-haak: ${JSON.stringify(outro)}`);
  /* de Proloog verlaat de pagina: apart, en daarna opnieuw booten */
  await page.goto('http://' + HOST + '/', { waitUntil: 'load' }); await slaap(700);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /toch beginnen/i.test(x.textContent)); if (b) b.click(); }); await slaap(600);
  await klik(4, 3); await slaap(1500);
  const url = page.url();
  t(/proloog\//.test(url), `De Proloog \u2192 ditzelfde tabblad staat nu op "${url.replace('http://' + HOST, '')}"`);
  await boot();

  /* ---------- 3f \u00b7 SCHAKELAARS ---------- */
  console.log('\n== 3f \u00b7 SCHAKELAARS ==');
  const schakel = async (ii, naam, lees) => {
    await klik(5, ii); await slaap(700);
    const aan = await page.evaluate(lees);
    const lbl = await page.evaluate(i => document.querySelectorAll('#dev-menu .dev-rij')[5].children[i].textContent, ii);
    await klik(5, ii); await slaap(700);
    const uit = await page.evaluate(lees);
    const lbl2 = await page.evaluate(i => document.querySelectorAll('#dev-menu .dev-rij')[5].children[i].textContent, ii);
    t(aan === true && uit === false, `${naam}: aan \u2192 ${aan} ("${lbl}"), weer uit \u2192 ${uit} ("${lbl2}")`);
  };
  await openLogo();
  await schakel(0, 'Mobiel-spoor', () => document.body.dataset.modus === 'mobiel');
  await page.setViewportSize({ width: 1440, height: 900 });
  await schakel(1, 'De Wereld', () => document.body.classList.contains('wereld'));
  await schakel(2, '3D-toneel', () => !!INST.d3);
  await schakel(3, 'Lite-modus', () => !!INST.lite);
  s = await sonde();
  t(s.menuOpen, `het menu blijft open bij een schakelaar (je flipt er meerdere achter elkaar): menuOpen = ${s.menuOpen}`);
  /* de dagwet-select */
  const wetten = tabel[5].items[4].opties;
  await klik(5, 4, { sel: wetten[1].v }); await slaap(400); s = await sonde();
  t(s.dagwet === wetten[1].v, `Dagwet forceren \u2192 "${wetten[1].label}": wetVanDag._force = "${s.dagwet}"`);
  await klik(5, 4, { sel: '' }); await slaap(400); s = await sonde();
  t(s.dagwet === '', `Dagwet \u2192 "\u2014 geen \u2014": wetVanDag._force = "${s.dagwet}"`);
  const nWet = Object.keys(await page.evaluate(() => DAGWETTEN)).length;
  t(wetten.length === 1 + nWet, `de select draagt alle ${nWet} dagwetten + 'geen': ${wetten.length} opties (${wetten.map(w => w.label).join(' \u00b7 ')})`);

  /* ---------- 3g \u00b7 OPRUIMEN ---------- */
  console.log('\n== 3g \u00b7 OPRUIMEN ==');
  await page.evaluate(() => { Codex.gevallen = ['drops']; bewaarCodex(); });
  await klik(6, 0); await slaap(600); s = await sonde();
  t(!s.codex.dropsGevallen, `\u26a0 Drops-Codex wissen \u2192 Codex.gevallen bevat drops = ${s.codex.dropsGevallen}`);
  await klik(1, 1, { pil: 2 }); await slaap(200);   /* tempo 0,3x zetten */
  let voor = await sonde();
  await klik(6, 1); await slaap(400); s = await sonde();
  t(s.devOpslag === null && s.tempo === 1, `Dev-instellingen wissen \u2192 slayit_dev = ${s.devOpslag}, DICK.tempo ${voor.tempo} \u2192 ${s.tempo}`);

  /* ============================================================
     4 \u00b7 DICK.tempo raakt nergens anders aan
     ============================================================ */
  console.log('\n== 4 \u00b7 DICK.tempo ==');
  await klik(1, 1, { pil: 1 }); await slaap(200); await dichtMenu();
  const t1 = await page.evaluate(() => DICK.tempo);
  await page.evaluate(() => nieuwSpel('slachter'));
  const t2 = await page.evaluate(() => DICK.tempo);
  await page.evaluate(() => { startGevecht(['groene_slijm'], 'gevecht', 1); });
  await slaap(800);
  const t3 = await page.evaluate(() => DICK.tempo);
  t(t1 === 0.6 && t2 === 0.6 && t3 === 0.6, `de gekozen 0,6\u00d7 blijft staan: na de keuze ${t1}, na nieuwSpel ${t2}, na startGevecht ${t3} \u2014 alleen devInstZet/devInstWis raken hem aan`);
  await openLogo(); await klik(6, 1); await slaap(300);
  const t4 = await page.evaluate(() => DICK.tempo);
  t(t4 === 1, `'Dev-instellingen wissen' zet hem terug: DICK.tempo = ${t4}`);

  /* ============================================================
     5 \u00b7 FOUTEN
     ============================================================ */
  console.log('\n== 5 \u00b7 FOUTEN ==');
  t(fouten.length === 0, fouten.length ? 'PAGINAFOUTEN: ' + fouten.slice(0, 5).join(' | ') : 'geen paginafouten in de hele ronde');
  const echteConsole = consoleFout.filter(x => !/Failed to load resource|favicon/i.test(x));
  t(echteConsole.length === 0, echteConsole.length ? 'CONSOLEFOUTEN: ' + echteConsole.slice(0, 5).join(' | ') : `geen consolefouten (${consoleFout.length} genegeerde resource-regels)`);
  const mistU = [...new Set(mist)].filter(x => !/^proloog\//.test(x));
  t(mistU.length === 0, mistU.length ? '404: ' + mistU.slice(0, 8).join(', ') : 'geen 404');

  console.log(`\n============================================\nDEV-MENU ACCEPTATIE: ${okN} ok, ${foutN} FOUT\n============================================`);
  await ctx.close(); await browser.close();
  process.exit(foutN ? 1 : 0);
})();
