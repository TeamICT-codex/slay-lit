// CONTACTVEL van HET PROCES (v121) - een framestrook per bedrijfsovergang, op de kernbeats
// uit regieblad §2, op laptop 1440x900 (2D) en op mobiel liggend 800x360. DICK.tempo = 1,
// animaties AAN. Dit is GEEN acceptatietest maar een KIJKDOCUMENT: iets wat je bekijkt en
// beoordeelt, naast de suites die getallen toetsen.
//
// WAT ZE OPLEVERT (in SLAYIT_SHOTS):
//   f_<overgang>_<viewport>_NN.png   losse frames, één per beat
//   frames.json                      tijdstempels, bijschriften en de DOM-sonde per frame
// Daarna plakt tools/drama_contactvel_plak.py daar de drie contactvellen van (zelfde map).
//
// EEN RUN PER FRAME. Een page.screenshot kost tijdens de zware opening ~450ms; een strook
// die in één doorloop wordt geschoten mist daardoor precies de beats die er het meest toe
// doen (hitstop 140, schok 150, doek 270 liggen dichter op elkaar dan de sluitertijd). Dus:
// per beat een vers gevecht opzetten, exact tot die beat wachten en één keer schieten.
// Trager (~8 min voor beide viewports), maar de tijdstempel op het vel is dan ook echt waar.
//
// DRAAIEN (Git Bash, vanuit de scratchpad met node_modules/playwright):
//   NODE_PATH="$PWD/node_modules" SLAYIT_WORKTREE="...\SLAY-IT-drama" \
//     SLAYIT_SHOTS="$PWD/drama_shots_v121" node "...\SLAY-IT-drama/tools/drama_contactvel.js"
//   python "...\SLAY-IT-drama/tools/drama_contactvel_plak.py"   (zelfde SLAYIT_SHOTS)
// SLAYIT_WORKTREE = de boom die van schijf geserveerd wordt (nooit poort 4173; ctx.route
// bedient elk bestand rechtstreeks), SLAYIT_SHOTS = de uitvoermap.
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const WT = process.env.SLAYIT_WORKTREE || 'C:/Users/Thomas Aelbrecht/Desktop/Workspace/SLAY-IT-drama';
const HOST = 'localhost:4181';                       // nooit 4173; er luistert niets, ctx.route bedient van schijf
const UIT = process.env.SLAYIT_SHOTS || path.join(__dirname, 'drama_shots'); fs.mkdirSync(UIT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));

// De kernbeats per overgang (§2.1 / §2.2 / §2.3), met het bijschrift dat op het vel komt.
const OVERGANGEN = [
  {
    sleutel: 'I-II', naam: 'I->II · HET PROCES', totaal: 4200,
    trigger: () => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.hp = Math.floor(b.maxHp * 0.50); checkBaasFase(); },
    beats: [
      [60, 'tik + hitstop 140'], [200, 'schok losbreekt'], [330, 'hof deinst, doek .55'],
      [1200, 'VONNIS II staat + pip 2'], [1600, 'oprijzen + wissel'], [2300, 'spraak fase2'],
      [2900, 'plaat 2 landt'], [3700, 'invoer vrij'], [4400, 'na afloop']
    ]
  },
  {
    sleutel: 'II-III', naam: 'II->III · DE TIRADE', totaal: 5600,
    trigger: () => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.fase = 2; b.hp = Math.floor(b.maxHp * 0.30); checkBaasFase(); },
    beats: [
      [90, 'tik zwaar + hitstop 190'], [260, 'schok 1.6'], [520, 'KNIEVAL, doek .70'],
      [1400, 'VONNIS III staat'], [1760, 'omhoog + executie'], [1900, 'contact: hitstop 120'],
      [2700, 'voetlicht door, doek op'], [4300, 'claqueur treedt aan'], [5700, 'na afloop']
    ]
  },
  {
    sleutel: 'IV', naam: 'IV · DE HERVERKIEZING', totaal: 7200,
    trigger: () => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.fase = 3; b.hp = 6; verliesHp(b, 30); },
    beats: [
      [110, 'doodsklap, hitstop 220'], [330, 'DE VAL, doek .80'], [1000, 'DE STEMMING'],
      [1500, 'aankondiging'], [2700, 'ZWART .92 + stilte'], [3300, 'goud + HERRIJZENIS'],
      [3950, 'VONNIS IV staat'], [4100, 'zaal stort in'], [5700, 'invoer vrij'],
      /* v121 (P1): bedrijf V is geen kaartje meer maar de aankomstpuls op de strook */
      [6900, 'V · puls op de strook'], [7400, 'puls uit, label blijft']
    ]
  }
];

const VIEWPORTS = [
  { n: 'laptop', w: 1440, h: 900, mobiel: false },
  { n: 'liggend', w: 800, h: 360, mobiel: true }
];

// Wat er op het beslissende moment in de DOM staat - dat leest een mens niet van een plaatje af.
const SONDE = `window.__sonde = function () {
  const g = S.gevecht; if (!g) return {};
  const b = g.vijanden.find(v => v.id === 'de_dicktator');
  const sc = document.getElementById('scherm-gevecht');
  const doek = document.getElementById('toneel-doek');
  const eb = document.getElementById('knop-eindbeurt') || document.querySelector('#eindbeurt, .eindbeurt-knop');
  const wrap = (GDOM.vijanden || []).map((d, i) => ({ d, v: g.vijanden[i] })).find(x => x.v && x.v.id === 'de_dicktator');
  const img = wrap && wrap.d && wrap.d.wrap ? wrap.d.wrap.querySelector('.vijand-art img') : null;
  const von = document.querySelector('.vonnis');
  const ex = document.querySelector('#baas-balk .bb-extra');
  const int = document.querySelector('.intent');
  return {
    fase: b && b.fase, hp: b && b.hp, herrezen: !!(b && b.herrezen), bbToon: b ? String(b._bbToon) : '-',
    bedrijf: sc ? (sc.dataset.bedrijf || '-') : '-',
    ceremonie: !!g.ceremonie,
    eindDisabled: eb ? !!eb.disabled : null,
    doek: doek ? (doek.classList.contains('aan') ? getComputedStyle(doek).opacity : '0') : '-',
    hitstop: !!(sc && sc.classList.contains('hitstop')),
    flits: document.querySelectorAll('.tik-flits').length,
    vonnis: von ? (von.querySelector('h2') ? von.querySelector('h2').textContent.trim().slice(0, 40) : '(geen h2)') : '-',
    vonnisKop: von ? (von.style.getPropertyValue('--vonnis-kop') || '(clamp)') : '-',
    /* v121 (P2/P1): is de titelband vrij, en komt het mandaatlabel aan? */
    intentOp: int ? +getComputedStyle(int).opacity : null,
    strookOp: ex ? +getComputedStyle(ex).opacity : null,
    strookPuls: !!(ex && ex.classList.contains('mandaat-aan')),
    strook: ex ? (ex.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 44) : '-',
    baasPose: img ? (img.currentSrc || img.src).split('/').pop() : '-',
    baasKlassen: wrap && wrap.d && wrap.d.wrap ? [...wrap.d.wrap.classList].filter(k => k !== 'vijand').join('.') : '-',
    spraak: document.querySelectorAll('.baas-spraak').length,
    levend: g.vijanden.filter(v => !v.dood).map(v => v.id.replace('de_', '')).join(',')
  };
};`;

async function draaiViewport(browser, vp) {
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h }, serviceWorkers: 'block',
    hasTouch: vp.mobiel, isMobile: vp.mobiel, deviceScaleFactor: 1
  });
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', e => fouten.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') fouten.push('console: ' + m.text().slice(0, 160)); });
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
  if (vp.mobiel) await page.evaluate(() => { document.body.dataset.modus = 'mobiel'; window.mobiel = true; });
  await page.evaluate(() => { INST.d3 = false; INST.lite = false; document.body.classList.remove('lite'); try { bewaarInst(); } catch (e) {} try { toonHeldKeuze(); } catch (e) {} });
  await slaap(300);
  await page.evaluate(() => { const k = document.querySelector('.held-kies'); if (k) k.click(); }); await slaap(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /toch beginnen/i.test(x.textContent)); if (b) b.click(); }); await slaap(800);
  await page.evaluate(SONDE);

  // Een vers baasgevecht met hof, ceremoniestil: de regie van de vorige beat moet eerst uit zijn.
  const opzet = async () => {
    let w = 0;
    while (w < 9000) { const bezig = await page.evaluate(() => { const g = S.gevecht; return !g ? false : (g._regieBezig != null || !!g.ceremonie); }); if (!bezig) break; await slaap(250); w += 250; }
    await page.evaluate(() => { devDicktator('slachter_mid'); });
    for (let i = 0; i < 40; i++) { if (await page.evaluate(() => document.body.dataset.scherm === 'gevecht' && !!S.gevecht && !document.querySelector('#baas-intro'))) break; await slaap(400); }
    await slaap(900);
    await page.evaluate(SONDE);
    await page.evaluate(() => { DICK.tempo = 1; dicktatorRoep('de_griffier'); dicktatorRoep('de_deurwaarder'); });
    await slaap(900);
    await page.screenshot({ path: path.join(UIT, '_warm.png') });   // sluiter warmdraaien, anders kost de eerste ~450ms
  };

  const gemeten = {};
  for (const ov of OVERGANGEN) {
    console.log('  ' + vp.n + ' · ' + ov.naam);
    const rij = [];
    for (let i = 0; i < ov.beats.length; i++) {
      const [doel, bijschrift] = ov.beats[i];
      await opzet();
      const t0 = Date.now();
      await page.evaluate('(' + ov.trigger.toString() + ')()');
      const wacht = doel - (Date.now() - t0);
      if (wacht > 0) await slaap(wacht);
      const echt = Date.now() - t0;
      const sonde = await page.evaluate(() => window.__sonde());
      const bestand = path.join(UIT, 'f_' + ov.sleutel + '_' + vp.n + '_' + String(i).padStart(2, '0') + '.png');
      await page.screenshot({ path: bestand, animations: 'allow' });
      rij.push({ bestand, doel, echt, bijschrift, sonde });
      console.log('     t=' + String(doel).padStart(4) + 'ms (echt ' + String(echt).padStart(4) + ') ' + bijschrift.padEnd(26)
        + ' fase=' + sonde.fase + ' bedrijf=' + sonde.bedrijf + ' doek=' + sonde.doek + ' hitstop=' + sonde.hitstop
        + ' cer=' + sonde.ceremonie + ' pose=' + sonde.baasPose + ' [' + sonde.baasKlassen + ']'
        + ' vonnis="' + sonde.vonnis + '"@' + sonde.vonnisKop
        + ' intent=' + sonde.intentOp + ' strook=' + sonde.strookOp + (sonde.strookPuls ? ' PULS' : '')
        + ' levend=' + sonde.levend);
    }
    gemeten[ov.sleutel] = rij;
  }
  await ctx.close();
  return { gemeten, fouten };
}

(async () => {
  const browser = await chromium.launch();
  const uit = {};
  const alleFouten = [];
  for (const vp of VIEWPORTS) {
    console.log('======== ' + vp.n + ' (' + vp.w + 'x' + vp.h + ') ========');
    const r = await draaiViewport(browser, vp);
    uit[vp.n] = r.gemeten;
    r.fouten.forEach(f => alleFouten.push(vp.n + ': ' + f));
  }
  await browser.close();
  fs.writeFileSync(path.join(UIT, 'frames.json'), JSON.stringify({ overgangen: OVERGANGEN.map(o => ({ sleutel: o.sleutel, naam: o.naam, totaal: o.totaal })), uit }, null, 1));
  console.log('\nfouten: ' + (alleFouten.length ? alleFouten.join('\n  ') : 'geen'));
  console.log('frames.json geschreven in ' + UIT);
})();
