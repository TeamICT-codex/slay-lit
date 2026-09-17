// DOEKSONDE bij het contactvel (v121) - twee dingen die je van een plaatje niet afleest.
//
//  1) HOE ZWART WORDT BEDRIJF IV ECHT? §9-keuze 2 zegt 92% op laptop en 80% op mobiel, maar
//     die stand krijgt maar ~600ms voordat hij naar .35 wordt teruggeroepen. Haalt de
//     transition dat, of zie je alleen een langzame schemering? De sonde meet per frame
//     (requestAnimationFrame) de computed opacity van #toneel-doek en drukt de PIEK plus de
//     curve rond de black-out af.
//  2) HOELANG LEEFT DE LEGACY-BANNER (baasFaseMoment, 'I · DE ZITTING') na de start van het
//     baasgevecht? Op het contactvel staat hij bij de vroege beats nog vaag in beeld; dat
//     hoort een harnas-artefact te zijn (het harnas triggert de overgang ~2s na de start),
//     geen botsing met vonnisSlam. Deze meting pint dat vast.
//
// Ze print getallen, geen oordeel - de suites toetsen, deze sonde laat kijken.
//
// DRAAIEN (Git Bash, vanuit de scratchpad met node_modules/playwright):
//   NODE_PATH="$PWD/node_modules" SLAYIT_WORKTREE="...\SLAY-IT-drama" \
//     node "...\SLAY-IT-drama/tools/drama_doeksonde.js"
// SLAYIT_WORKTREE = de boom die van schijf geserveerd wordt (nooit poort 4173).
// SLAYIT_SHOTS is optioneel: is hij gezet, dan landt er per viewport een controleschot.
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const WT = process.env.SLAYIT_WORKTREE || 'C:/Users/Thomas Aelbrecht/Desktop/Workspace/SLAY-IT-drama';
const HOST = 'localhost:4181';
const UIT = process.env.SLAYIT_SHOTS || null; if (UIT) fs.mkdirSync(UIT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));

const METER = `window.__meet = function () {
  window.__doekMax = 0; window.__doekReeks = []; window.__banner = { eersteZien: null, laatsteZien: null };
  const t0 = performance.now();
  const lus = () => {
    const d = document.getElementById('toneel-doek');
    if (d) {
      const o = parseFloat(getComputedStyle(d).opacity) || 0;
      if (o > window.__doekMax) window.__doekMax = o;
      window.__doekReeks.push([Math.round(performance.now() - t0), Math.round(o * 1000) / 1000]);
    }
    const b = document.querySelector('.baas-flits, .baas-fase-moment, #baas-fase');
    if (b) {
      const zicht = parseFloat(getComputedStyle(b).opacity) > 0.02;
      if (zicht) { if (window.__banner.eersteZien == null) window.__banner.eersteZien = Math.round(performance.now() - t0); window.__banner.laatsteZien = Math.round(performance.now() - t0); }
    }
    window.__lusId = requestAnimationFrame(lus);
  };
  lus();
};`;

(async () => {
  const browser = await chromium.launch();
  for (const vp of [{ n: 'laptop', w: 1440, h: 900, mobiel: false }, { n: 'liggend', w: 800, h: 360, mobiel: true }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, serviceWorkers: 'block', hasTouch: vp.mobiel, isMobile: vp.mobiel, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
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
    await page.evaluate(() => { INST.d3 = false; INST.lite = false; document.body.classList.remove('lite'); try { bewaarInst(); } catch (e) {} try { toonHeldKeuze(); } catch (e) {} }); await slaap(300);
    await page.evaluate(() => { const k = document.querySelector('.held-kies'); if (k) k.click(); }); await slaap(300);
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /toch beginnen/i.test(x.textContent)); if (b) b.click(); }); await slaap(800);
    await page.evaluate(METER);

    // (2) banner-levensduur: meten vanaf het moment dat het baasgevecht echt begint
    await page.evaluate(() => { devDicktator('slachter_mid'); });
    for (let i = 0; i < 40; i++) { if (await page.evaluate(() => document.body.dataset.scherm === 'gevecht' && !!S.gevecht && !document.querySelector('#baas-intro'))) break; await slaap(400); }
    await page.evaluate(() => window.__meet());
    await slaap(6000);
    const banner = await page.evaluate(() => window.__banner);
    console.log(vp.n + ' · legacy baasFaseMoment-banner na gevechtstart: zichtbaar van ' + banner.eersteZien + 'ms tot ' + banner.laatsteZien + 'ms');

    // (1) doek-piek in bedrijf IV
    await page.evaluate(() => { DICK.tempo = 1; dicktatorRoep('de_griffier'); dicktatorRoep('de_deurwaarder'); }); await slaap(900);
    await page.evaluate(() => { window.__meet(); const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.fase = 3; b.hp = 6; verliesHp(b, 30); });
    await slaap(2800);
    if (UIT) await page.screenshot({ path: path.join(UIT, 'doeksonde_' + vp.n + '_zwart.png') });
    await slaap(4800);
    const r = await page.evaluate(() => ({ max: window.__doekMax, reeks: window.__doekReeks.filter(([t]) => t >= 2400 && t <= 3800).filter((_, i) => i % 6 === 0) }));
    console.log(vp.n + ' · doek-PIEK in bedrijf IV: ' + Math.round(r.max * 1000) / 1000 + '   (§9: ' + (vp.mobiel ? '.80 mobiel' : '.92 laptop') + ')');
    console.log('   curve 2400-3800ms: ' + r.reeks.map(([t, o]) => t + ':' + o).join('  '));
    await ctx.close();
  }
  await browser.close();
})();
