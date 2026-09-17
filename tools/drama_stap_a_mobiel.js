// Controlepas na de reviewronde (v121): de maat-gevoelige wijzigingen op het MOBIELE spoor.
// Staand 390x844 en liggend 800x360: de herkozen tiran mag niet zweven, naam/hp-balk mogen
// niet meeschalen, en de blijvende plaat-inzoom mag geen kale ondergrond tonen.
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const WT = process.env.SLAYIT_WORKTREE || 'C:/Users/Thomas Aelbrecht/Desktop/Workspace/SLAY-IT-drama';
const HOST = 'localhost:4184';
const UIT = process.env.SLAYIT_SHOTS || path.join(__dirname, 'fix_mobiel_shots'); fs.mkdirSync(UIT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));
let okN = 0, foutN = 0;
const t = (goed, tekst) => { if (goed) { okN++; console.log('   ok   ' + tekst); } else { foutN++; console.log('   FOUT ' + tekst); } };

(async () => {
  const browser = await chromium.launch();
  for (const vp of [{ naam: 'staand', width: 390, height: 844 }, { naam: 'liggend', width: 800, height: 360 }]) {
    console.log(`\n== mobiel ${vp.naam} ${vp.width}x${vp.height} ==`);
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, serviceWorkers: 'block', hasTouch: true, isMobile: true });
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
    await page.reload({ waitUntil: 'load' }); await slaap(700);
    await page.evaluate(() => { INST.d3 = false; try { bewaarInst(); } catch (e) {} try { toonHeldKeuze(); } catch (e) {} }); await slaap(300);
    await page.evaluate(() => { const k = document.querySelector('.held-kies'); if (k) k.click(); }); await slaap(300);
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /toch beginnen/i.test(x.textContent)); if (b) b.click(); }); await slaap(900);
    await page.evaluate(() => { devDicktator('slachter_mid'); });
    for (let i = 0; i < 40; i++) { if (await page.evaluate(() => document.body.dataset.scherm === 'gevecht' && !!S.gevecht && !document.querySelector('#baas-intro'))) break; await slaap(400); }
    await slaap(1400);

    const modus = await page.evaluate(() => document.body.dataset.modus);
    t(modus === 'mobiel', `het mobiele spoor draait: body[data-modus] = "${modus}"`);

    const m = await page.evaluate(() => {
      const g = S.gevecht, b = g.vijanden.find(v => v.id === 'de_dicktator');
      const bw = [...document.querySelectorAll('#vijanden-rij .vijand')][g.vijanden.indexOf(b)];
      const art = bw.querySelector('.vijand-art'), hp = bw.querySelector('.hp-balk'), naam = bw.querySelector('.vijand-naam');
      const meet = () => ({ voet: art.getBoundingClientRect().bottom, hp: hp ? hp.getBoundingClientRect().width : 0, naam: naam ? naam.getBoundingClientRect().width : 0 });
      bw.classList.remove('herverkozen'); void bw.offsetWidth; const zonder = meet();
      bw.classList.add('herverkozen'); void bw.offsetWidth; const met = meet();
      const schaal = { wrapScale: getComputedStyle(bw).scale, artScale: getComputedStyle(art).scale };
      bw.classList.remove('herverkozen');
      return { zonder, met, ...schaal };
    });
    const dvh = Math.abs(m.met.voet - m.zonder.voet) / vp.height * 100;
    t(dvh < 1, `de herkozen tiran blijft op de vloer: ${m.zonder.voet.toFixed(2)}px -> ${m.met.voet.toFixed(2)}px = ${Math.abs(m.met.voet - m.zonder.voet).toFixed(2)}px = ${dvh.toFixed(2)}% vh (< 1%)`);
    t(Math.abs(m.met.hp - m.zonder.hp) < 0.6 && Math.abs(m.met.naam - m.zonder.naam) < 0.6, `naam en hp-balk schalen niet mee: hp ${m.zonder.hp.toFixed(1)} -> ${m.met.hp.toFixed(1)}, naam ${m.zonder.naam.toFixed(1)} -> ${m.met.naam.toFixed(1)} (kolom scale ${m.wrapScale}, figuur ${m.artScale})`);

    const p = await page.evaluate(async () => {
      const bg = document.getElementById('gevecht-achtergrond');
      const lees = () => { const cs = getComputedStyle(bg); const s = bg.style.backgroundPosition.split(' ').map(parseFloat); return { top: s[1], klasse: bg.className, scale: cs.scale, origin: cs.transformOrigin, grondY: cs.getPropertyValue('--grondY').trim(), inset: cs.top }; };
      plaatsGevechtsplaat();
      const voor = lees();
      plaatKick('plaat-inzoom', 500);
      await new Promise(r => setTimeout(r, 800));
      const vast = lees();
      plaatKick('plaat-dreun', 400);
      await new Promise(r => setTimeout(r, 120));
      const stoot = { anim: getComputedStyle(bg).animationName };
      await new Promise(r => setTimeout(r, 700));
      return { voor, vast, stoot, na: lees() };
    });
    t(p.voor.top <= 0, `de plaat toont geen kale ondergrond: backgroundPosition.top = ${p.voor.top}px (<= 0), laag-inset ${p.voor.inset}`);
    t(/plaat-vast/.test(p.vast.klasse) && parseFloat(p.vast.scale) >= 1, `de blijvende inzoom is ook op mobiel INzoomen (scale ${p.vast.scale}), origin "${p.vast.origin}" vs --grondY ${p.vast.grondY}`);
    t(p.stoot.anim === 'plaatStoot', `een latere kick speelt ook op mobiel: animation-name "${p.stoot.anim}"`);
    t(!/plaat-(vast|beweeg|inzoom|dreun)/.test(p.na.klasse) && p.na.top <= 0, `na afloop opgeruimd en nog steeds geen kale rand: klasse "${p.na.klasse}", top ${p.na.top}px`);

    await page.screenshot({ path: path.join(UIT, `mobiel-${vp.naam}.png`) });
    t(fouten.length === 0, fouten.length ? 'PAGINAFOUTEN: ' + fouten.slice(0, 3).join(' | ') : 'geen paginafouten');
    await ctx.close();
  }
  console.log(`\n============================================\nMOBIELE CONTROLEPAS: ${okN} ok, ${foutN} FOUT\n============================================`);
  await browser.close();
  process.exit(foutN ? 1 : 0);
})();
