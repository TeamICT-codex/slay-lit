// STAP C (v120) - acceptatietests C1 (lite + OS-reduced-motion) en C2 (css/mobiel.css).
// Meet GECOMPUTEERDE waarden op de ECHTE elementen in een echt baasgevecht: de regie-
// helpers worden aangeroepen (vonnisSlam, tikFlits, plaatKick, baasTik, schokToneel,
// _pipKnapt, toneelDoek) en daarna leest het script getComputedStyle. Elke regel toont de
// gemeten waarde, nooit "werkt".
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const WT = process.env.SLAYIT_WORKTREE || 'C:/Users/Thomas Aelbrecht/Desktop/Workspace/SLAY-IT-drama';
const HOST = 'localhost:4183';
const UIT = process.env.SLAYIT_SHOTS || path.join(__dirname, 'drama_c_shots'); fs.mkdirSync(UIT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));
let okN = 0, foutN = 0;
const t = (goed, tekst) => { if (goed) { okN++; console.log('   ok   ' + tekst); } else { foutN++; console.log('   FOUT ' + tekst); } };

// ---- de meting draait als één blok IN de pagina: klassen erop, computed styles eraf ----
const METING = `(async function () {
  const wacht = ms => new Promise(r => setTimeout(r, ms));
  const g = S.gevecht;
  const b = g.vijanden.find(v => v.id === 'de_dicktator');
  const hof = g.vijanden.filter(v => v.id !== 'de_dicktator' && !v.dood);
  const wrapVan = a => { const i = g.vijanden.indexOf(a); const d = GDOM.vijanden[i]; return d ? d.wrap : null; };
  const cs = (el, p, pseudo) => el ? getComputedStyle(el, pseudo || null).getPropertyValue(p).trim() : null;
  const uit = {};

  // --- het vonnis (echte aanroep, zonder schok/sfx zodat de meting rustig blijft) ---
  vonnisSlam('TEST · HET VONNIS', 'een duidingsregel van voldoende lengte', { duur: 4000, schok: false, sfx: false });
  await wacht(260);
  const von = document.querySelector('.vonnis');
  const h2 = von && von.querySelector('h2'), sp = von && von.querySelector('span');
  uit.vonnis = { opacity: +cs(von, 'opacity'), anim: cs(von, 'animation-name'),
    h2Opacity: +cs(h2, 'opacity'), h2Anim: cs(h2, 'animation-name'), h2Transform: cs(h2, 'transform'), h2Font: cs(h2, 'font-size'),
    spOpacity: +cs(sp, 'opacity'), spAnim: cs(sp, 'animation-name'), spFont: cs(sp, 'font-size'),
    padTop: cs(von, 'padding-top') };
  if (von) von.remove();

  // --- de tik-flits ---
  tikFlits('rgba(255, 236, 214, .85)');
  await wacht(120);
  const fl = document.querySelector('.tik-flits');
  uit.flits = { opacity: +cs(fl, 'opacity'), anim: cs(fl, 'animation-name'), tikMax: cs(fl, '--tik-max') || '(niet gezet)' };
  if (fl) fl.remove();

  // --- de plaat: de blijvende inzoom van bedrijf III ---
  const bg = document.getElementById('gevecht-achtergrond');
  plaatKick('plaat-inzoom', 1200);
  await wacht(500);
  uit.inzoomTijdens = { anim: cs(bg, 'animation-name'), scale: cs(bg, 'scale'), klassen: bg.className };
  await wacht(1000);
  uit.inzoomNa = { anim: cs(bg, 'animation-name'), scale: cs(bg, 'scale'), klassen: bg.className };
  // en de twee varianten die op mobiel moesten worden ingeperkt
  plaatKick('plaat-kantel', 1300);
  await wacht(60);
  uit.kantel = { rot: cs(bg, '--plaat-rot'), schaal: cs(bg, '--plaat-schaal'), anim: cs(bg, 'animation-name'), origin: cs(bg, 'transform-origin'), grondY: cs(bg, '--grondY') };
  await wacht(1500);
  plaatKick('plaat-instort', 900);
  await wacht(60);
  uit.instort = { rot: cs(bg, '--plaat-rot'), schaal: cs(bg, '--plaat-schaal'), y: cs(bg, '--plaat-y'), anim: cs(bg, 'animation-name') };
  await wacht(1200);
  bg.classList.remove('plaat-beweeg', 'plaat-vast', 'plaat-dreun', 'plaat-kantel', 'plaat-inzoom', 'plaat-instort', 'zwaar');

  // --- het doek: diepte en duur ---
  toneelDoek(0.92, 350);
  await wacht(700);
  const doek = document.getElementById('toneel-doek');
  uit.doek = { opacity: +cs(doek, 'opacity'), doekVar: cs(doek, '--doek'), transDuur: cs(doek, 'transition-duration'), transProp: cs(doek, 'transition-property') };
  toneelDoek(0);
  await wacht(400);
  uit.doekOpen = +cs(doek, 'opacity');

  // --- de schok op de figurenlaag ---
  const sv = document.getElementById('strijdveld');
  schokToneel(1.6, 520);
  await wacht(80);
  uit.schok = { anim: cs(sv, 'animation-name'), schok: cs(sv, '--schok'), factor: cs(sv, '--schok-f') || '(niet gezet = 1)', translate: cs(sv, 'translate') };
  await wacht(700);

  // --- DE TIK op de baas (hit-pose + terugstoot) ---
  const bw = wrapVan(b), bimg = bw && bw.querySelector('.vijand-art img');
  baasTik(b, 2);
  await wacht(120);
  uit.tik = { anim: cs(bimg, 'animation-name'), translate: cs(bimg, 'translate'), rotate: cs(bimg, 'rotate'), voetc: cs(bw && bw.querySelector('.vijand-art'), '--voetc'), hitstop: document.getElementById('scherm-gevecht').classList.contains('hitstop') };
  uit.hitstopDip = cs(sv, 'filter');
  await wacht(900);

  // --- de figuurklassen: deinst / knielt / stemt / exit.geveld / herverkozen ---
  const hw = hof.length ? wrapVan(hof[0]) : null;
  if (hw) {
    hw.classList.add('deinst'); await wacht(80);
    uit.deinst = { anim: cs(hw, 'animation-name'), translate: cs(hw, 'translate') };
    hw.classList.remove('deinst');
    hw.classList.add('stemt'); await wacht(80);
    uit.stemt = { anim: cs(hw, 'animation-name'), scale: cs(hw, 'scale'), artAnim: cs(hw.querySelector('.vijand-art'), 'animation-name') };
    hw.classList.remove('stemt');
    hw.classList.add('exit', 'geveld'); await wacht(120);
    uit.geveld = { anim: cs(hw, 'animation-name'), opacity: +cs(hw, 'opacity') };
    await wacht(1100);
    uit.geveldNa = +cs(hw, 'opacity');
    hw.classList.remove('exit', 'geveld');
  }
  bw.classList.add('knielt'); await wacht(60);
  uit.knielt = { translate: cs(bw.querySelector('.vijand-art'), 'translate'), transDuur: cs(bw.querySelector('.vijand-art'), 'transition-duration') };
  bw.classList.remove('knielt');
  bw.classList.add('herverkozen', 'woede'); await wacht(120);
  uit.herverkozen = { anim: cs(bw.querySelector('.vijand-art'), 'animation-name'), filter: cs(bw.querySelector('.vijand-art'), 'filter'), scale: cs(bw.querySelector('.vijand-art'), 'scale') };
  bw.classList.remove('herverkozen', 'woede');

  // --- de goud-flits (het bestaande gaatje) ---
  const sc = document.getElementById('scherm-gevecht');
  sc.classList.add('goud-flits'); await wacht(500);
  uit.goudFlits = { anim: cs(sc, 'animation-name', '::after'), opacity: +cs(sc, 'opacity', '::after') };
  sc.classList.remove('goud-flits');

  // --- de bazenbalk: pip EN hart ---
  const balk = document.querySelector('#baas-balk .bb-balk');
  const pip = document.querySelectorAll('#baas-balk .bb-pip')[1];
  _pipKnapt(1); await wacht(80);
  uit.pip = { anim: cs(pip, 'animation-name'), transform: cs(pip, 'transform'), hartKlasse: balk.classList.contains('hart-knapt'), hartAnim: cs(balk, 'animation-name', '::before') };
  await wacht(700);
  const bb = document.getElementById('baas-balk');
  bb.dataset.vorm = '2';
  _pipKnapt(3); await wacht(80);
  const kroon = document.querySelector('#baas-balk .bb-pip.kroon');
  uit.kroon = { anim: cs(kroon, 'animation-name'), transform: cs(kroon, 'transform'), hartAnim: cs(balk, 'animation-name', '::before') };
  await wacht(700);
  delete bb.dataset.vorm;

  // --- de inzage-knop tijdens de ceremonie (mobiel) ---
  // het draai-blok ('draai je toestel') staat op een staande telefoon over het gevecht heen
  // en verbergt de knop al via zijn eigen :has()-regel; even weg voor een eerlijke meting.
  const db = document.getElementById('draai-blok');
  uit.draaiBlok = !!(db && db.classList.contains('toon'));
  if (uit.draaiBlok) { db.classList.remove('toon'); await wacht(60); }
  const inz = document.getElementById('inzage-knop');
  uit.inzageRust = inz ? cs(inz, 'display') : '(geen knop)';
  document.body.classList.add('ceremonie'); await wacht(60);
  uit.inzageCeremonie = inz ? cs(inz, 'display') : '(geen knop)';
  if (uit.draaiBlok && db) db.classList.add('toon');
  uit.amberkring = cs(document.getElementById('speler-zone'), 'isolation');
  document.body.classList.remove('ceremonie');

  // --- de bazenbalk-VRIES op --hp (mobiel rijdt volledig op --hp) ---
  b._bbToon = 0; renderGevecht(); await wacht(60);
  const hp0 = cs(balk, '--hp'), vul0 = (document.querySelector('#baas-balk .bb-vul') || {}).style;
  verliesHp(b, 20); renderGevecht(); await wacht(1000);
  uit.vries = { voor: hp0, na: cs(balk, '--hp'), bbVulVoor: vul0 ? vul0.width : null,
    bbVulNa: (document.querySelector('#baas-balk .bb-vul') || { style: {} }).style.width, hp: b.hp, maxHp: b.maxHp };
  b._bbToon = null; renderGevecht();

  // --- de zaalplaat: dekt hij het hele element, ook onder een kick? ---
  const el = bg.getBoundingClientRect();
  const bp = cs(bg, 'background-position'), bs = cs(bg, 'background-size');
  uit.plaat = { rect: { t: Math.round(el.top), l: Math.round(el.left), w: Math.round(el.width), h: Math.round(el.height) },
    bgPos: bp, bgSize: bs, bgPosTop: parseFloat((bp.split(' ')[1] || '0')), inset: cs(bg, 'inset') };
  uit.lite = document.body.classList.contains('lite');
  uit.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  uit.modus = document.body.dataset.modus;
  return uit;
})()`;

async function meet(browser, spoor) {
  const ctx = await browser.newContext(Object.assign({
    viewport: { width: spoor.w, height: spoor.h }, serviceWorkers: 'block',
    hasTouch: !!spoor.mobiel, isMobile: !!spoor.mobiel, deviceScaleFactor: spoor.mobiel ? 2 : 1
  }, spoor.reduced ? { reducedMotion: 'reduce' } : {}));
  const page = await ctx.newPage(); const fouten = []; const mist = [];
  page.on('pageerror', e => fouten.push(e.message));
  page.on('console', m => { if (m.type() === 'error') fouten.push('console: ' + m.text()); });
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
  if (spoor.mobiel) await page.evaluate(() => { document.body.dataset.modus = 'mobiel'; window.mobiel = true; });
  await page.evaluate(l => { INST.d3 = false; INST.lite = l; document.body.classList.toggle('lite', l); try { bewaarInst(); } catch (e) {} try { toonHeldKeuze(); } catch (e) {} }, !!spoor.lite);
  await slaap(300);
  await page.evaluate(() => { const k = document.querySelector('.held-kies'); if (k) k.click(); }); await slaap(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /toch beginnen/i.test(x.textContent)); if (b) b.click(); }); await slaap(800);
  await page.evaluate(() => { devDicktator('slachter_mid'); });
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => document.body.dataset.scherm === 'gevecht' && !!S.gevecht && !document.querySelector('#baas-intro'))) break; await slaap(400); }
  await slaap(1000);
  await page.evaluate(() => { dicktatorRoep('de_griffier'); dicktatorRoep('de_deurwaarder'); }); await slaap(900);
  // lite/reduced nog eens forceren: het gevecht kan INST opnieuw hebben toegepast
  await page.evaluate(l => { INST.lite = l; document.body.classList.toggle('lite', l); }, !!spoor.lite);
  await slaap(120);
  const uit = await page.evaluate(METING);
  await page.screenshot({ path: path.join(UIT, 'c-' + spoor.n + '.png') });
  fs.writeFileSync(path.join(UIT, 'c-' + spoor.n + '.json'), JSON.stringify(uit, null, 1));
  await ctx.close();
  return { uit, fouten, mist };
}

(async () => {
  const browser = await chromium.launch();
  const SPOREN = [
    { n: 'laptop', w: 1440, h: 900 },
    { n: 'lite', w: 1440, h: 900, lite: true },
    { n: 'reduced-lite-uit', w: 1440, h: 900, reduced: true, lite: false },
    { n: 'mobiel-staand', w: 390, h: 844, mobiel: true },
    { n: 'mobiel-liggend', w: 800, h: 360, mobiel: true },
    /* v120 (fixronde stap C): lite KRUIST met het landscape-blok, en de suite draaide die
       kruising nergens. Daar zat bevinding 3: `body.lite #toneel-doek { transition: none }`
       (style.css) en `body[data-modus="mobiel"] #toneel-doek` (mobiel.css, landscape) hebben
       allebei specificiteit (1,1,1), en mobiel.css laadt later - dus in lite BLEEF het doek
       daar faden i.p.v. de harde knip van §4.3 te maken. */
    { n: 'mobiel-liggend-lite', w: 800, h: 360, mobiel: true, lite: true }
  ];
  const R = {};
  for (const s of SPOREN) {
    console.log('\n======== spoor: ' + s.n + ' (' + s.w + 'x' + s.h + (s.lite ? ', lite' : '') + (s.reduced ? ', OS-reduced-motion' : '') + ') ========');
    const r = await meet(browser, s); R[s.n] = r.uit;
    const u = r.uit;
    console.log('   lite=' + u.lite + '  reduced=' + u.reduced + '  modus=' + u.modus);
    console.log('   vonnis   opacity=' + u.vonnis.opacity + ' anim=' + u.vonnis.anim + ' | h2 opacity=' + u.vonnis.h2Opacity + ' anim=' + u.vonnis.h2Anim + ' transform=' + u.vonnis.h2Transform + ' font=' + u.vonnis.h2Font);
    console.log('   flits    opacity=' + u.flits.opacity + ' anim=' + u.flits.anim + ' --tik-max=' + u.flits.tikMax);
    console.log('   inzoom   tijdens: anim=' + u.inzoomTijdens.anim + ' scale=' + u.inzoomTijdens.scale + ' | na: anim=' + u.inzoomNa.anim + ' scale=' + u.inzoomNa.scale + ' klassen="' + u.inzoomNa.klassen + '"');
    console.log('   kantel   rot=' + u.kantel.rot + ' schaal=' + u.kantel.schaal + ' anim=' + u.kantel.anim + ' origin=' + u.kantel.origin + ' --grondY=' + u.kantel.grondY);
    console.log('   instort  rot=' + u.instort.rot + ' schaal=' + u.instort.schaal + ' y=' + u.instort.y + ' anim=' + u.instort.anim);
    console.log('   doek     opacity=' + u.doek.opacity + ' (--doek=' + u.doek.doekVar + ') transitie=' + u.doek.transProp + ' ' + u.doek.transDuur + ' | open=' + u.doekOpen);
    console.log('   schok    anim=' + u.schok.anim + ' --schok=' + u.schok.schok + ' --schok-f=' + u.schok.factor + ' translate=' + u.schok.translate);
    console.log('   tik      anim=' + u.tik.anim + ' translate=' + u.tik.translate + ' rotate=' + u.tik.rotate + ' --voetc=' + u.tik.voetc + ' hitstop=' + u.tik.hitstop + ' dip=' + u.hitstopDip);
    if (u.deinst) console.log('   deinst   anim=' + u.deinst.anim + ' translate=' + u.deinst.translate + ' | stemt anim=' + u.stemt.anim + ' scale=' + u.stemt.scale + ' artAnim=' + u.stemt.artAnim);
    if (u.geveld) console.log('   geveld   anim=' + u.geveld.anim + ' opacity t=120: ' + u.geveld.opacity + ' -> t=1220: ' + u.geveldNa);
    console.log('   knielt   translate=' + u.knielt.translate + ' transitie=' + u.knielt.transDuur);
    console.log('   herkozen anim=' + u.herverkozen.anim + ' scale=' + u.herverkozen.scale + ' filter=' + u.herverkozen.filter);
    console.log('   goudflit anim=' + u.goudFlits.anim + ' opacity=' + u.goudFlits.opacity);
    console.log('   pip      anim=' + u.pip.anim + ' transform=' + u.pip.transform + ' | hart-knapt=' + u.pip.hartKlasse + ' ::before anim=' + u.pip.hartAnim);
    console.log('   kroon    anim=' + u.kroon.anim + ' transform=' + u.kroon.transform + ' | hart ::before anim=' + u.kroon.hartAnim);
    console.log('   inzage   rust=' + u.inzageRust + ' -> ceremonie=' + u.inzageCeremonie + ' | speler-zone isolation=' + u.amberkring);
    console.log('   vries    --hp voor=' + u.vries.voor + ' na 1000ms schade=' + u.vries.na + ' (hp ' + u.vries.hp + '/' + u.vries.maxHp + ') bb-vul ' + u.vries.bbVulVoor + ' -> ' + u.vries.bbVulNa);
    console.log('   plaat    rect=' + JSON.stringify(u.plaat.rect) + ' inset=' + u.plaat.inset + ' bgPos=' + u.plaat.bgPos + ' bgSize=' + u.plaat.bgSize);
    if (r.fouten.length) console.log('   PAGEERRORS: ' + r.fouten.slice(0, 4).join(' | '));
    if (r.mist.length) console.log('   404: ' + [...new Set(r.mist)].slice(0, 6).join(', '));
    r.__fouten = r.fouten; R[s.n].__fouten = r.fouten;
  }

  console.log('\n======== C1 · lite (body.lite) ========');
  const L = R['lite'];
  t(L.vonnis.h2Opacity === 1, `.vonnis h2 opacity in lite: ${L.vonnis.h2Opacity} (eis: 1) - animation "${L.vonnis.h2Anim}", transform ${L.vonnis.h2Transform}`);
  t(L.vonnis.opacity === 1 && L.vonnis.anim === 'none', `.vonnis zelf: opacity ${L.vonnis.opacity}, animation "${L.vonnis.anim}" (introVervaag uit, plaat blijft leesbaar tot JS hem opruimt)`);
  t(L.vonnis.spOpacity === 1 && L.vonnis.spAnim === 'none', `.vonnis span: opacity ${L.vonnis.spOpacity}, animation "${L.vonnis.spAnim}"`);
  t(L.flits.opacity === 0 && L.flits.anim === 'none', `.tik-flits opacity in lite: ${L.flits.opacity} (eis: 0) - animation "${L.flits.anim}"`);
  t(L.inzoomTijdens.anim === 'none' && Math.abs(parseFloat(L.inzoomTijdens.scale) - 1.06) < 0.005, `.plaat-inzoom in lite: animation "${L.inzoomTijdens.anim}", scale ${L.inzoomTijdens.scale} (eis ~1.06 als STAND)`);
  t(L.inzoomNa.klassen.indexOf('plaat-vast') >= 0 && Math.abs(parseFloat(L.inzoomNa.scale) - 1.06) < 0.005, `na de opruim houdt .plaat-vast de stand vast: scale ${L.inzoomNa.scale}, klassen "${L.inzoomNa.klassen}"`);
  t(L.doek.transDuur === '0s', `#toneel-doek transition-duration in lite: ${L.doek.transDuur} (harde knip, het doek zelf BLIJFT)`);
  t(L.doek.opacity > 0.5, `#toneel-doek dekt in lite wel degelijk: opacity ${L.doek.opacity} (--doek ${L.doek.doekVar})`);
  t(L.schok.anim === 'none', `#strijdveld.toneelschok animation in lite: "${L.schok.anim}" (translate ${L.schok.translate})`);
  t(L.tik.anim === 'none' && /var|0%|0px|none/.test(L.tik.translate + L.tik.rotate) === true, `.baas-tik img in lite: animation "${L.tik.anim}", translate ${L.tik.translate}, rotate ${L.tik.rotate} (--voetc ${L.tik.voetc} blijft in de eindstand)`);
  t(L.hitstopDip === 'none', `de hitstop-brightnessdip op #strijdveld in lite: filter ${L.hitstopDip}`);
  t(L.geveld && L.geveld.anim === 'none' && L.geveld.opacity === 0, `.vijand.exit.geveld in lite: animation "${L.geveld ? L.geveld.anim : '-'}", opacity ${L.geveld ? L.geveld.opacity : '-'} (de griffier verdwijnt alsnog)`);
  t(L.stemt && L.stemt.anim === 'none' && L.stemt.artAnim === 'none', `.vijand.stemt in lite: animation "${L.stemt ? L.stemt.anim : '-'}" / art "${L.stemt ? L.stemt.artAnim : '-'}", scale ${L.stemt ? L.stemt.scale : '-'}`);
  t(L.deinst && L.deinst.anim === 'none', `.vijand.deinst in lite: animation "${L.deinst ? L.deinst.anim : '-'}", translate ${L.deinst ? L.deinst.translate : '-'}`);
  t(L.pip.anim === 'none' && /matrix\(1, 0, 0, 1/.test(L.pip.transform), `.bb-pip.knapt in lite: animation "${L.pip.anim}", transform ${L.pip.transform} (eindstand scale 1)`);
  t(L.kroon.anim === 'none', `.bb-pip.kroon.knapt in lite: animation "${L.kroon.anim}", transform ${L.kroon.transform} (rotate 45deg blijft)`);
  t(L.herverkozen.anim === 'none' && /drop-shadow/.test(L.herverkozen.filter), `.herverkozen.woede in lite: animation "${L.herverkozen.anim}", filter ${L.herverkozen.filter} (de GOUDEN gloed blijft staan, geen rode woedeGloei)`);
  t(L.goudFlits.opacity === 0, `HET GAATJE: body.lite .goud-flits::after opacity ${L.goudFlits.opacity} (animation "${L.goudFlits.anim}"; vóór deze ronde 900ms op 1 = keiharde goudwas)`);
  t(L.knielt.transDuur === '0s', `.vijand.knielt transition-duration in lite: ${L.knielt.transDuur} (de STAND blijft: translate ${L.knielt.translate})`);

  console.log('\n======== C1 · OS-reduced-motion MET lite handmatig uit ========');
  const Rm = R['reduced-lite-uit'];
  t(Rm.lite === false && Rm.reduced === true, `body.lite=${Rm.lite}, prefers-reduced-motion=${Rm.reduced} (de twee sporen staan echt los)`);
  t(Rm.vonnis.h2Opacity === 1 && Rm.vonnis.h2Anim === 'none', `.vonnis h2: opacity ${Rm.vonnis.h2Opacity}, animation "${Rm.vonnis.h2Anim}"`);
  t(Rm.flits.opacity === 0 && Rm.flits.anim === 'none', `.tik-flits: opacity ${Rm.flits.opacity}, animation "${Rm.flits.anim}"`);
  t(Rm.inzoomTijdens.anim === 'none' && Math.abs(parseFloat(Rm.inzoomTijdens.scale) - 1.06) < 0.005, `.plaat-inzoom: animation "${Rm.inzoomTijdens.anim}", scale ${Rm.inzoomTijdens.scale}`);
  t(Rm.doek.transDuur === '0s', `#toneel-doek transition-duration: ${Rm.doek.transDuur}`);
  t(Rm.schok.anim === 'none', `#strijdveld.toneelschok: "${Rm.schok.anim}"`);
  t(Rm.tik.anim === 'none', `.baas-tik img: animation "${Rm.tik.anim}", translate ${Rm.tik.translate}`);
  t(Rm.geveld && Rm.geveld.opacity === 0, `.exit.geveld opacity: ${Rm.geveld ? Rm.geveld.opacity : '-'}`);
  t(Rm.goudFlits.opacity === 0, `.goud-flits::after opacity: ${Rm.goudFlits.opacity}`);
  t(Rm.herverkozen.anim === 'none' && /drop-shadow/.test(Rm.herverkozen.filter), `.herverkozen.woede: animation "${Rm.herverkozen.anim}", filter ${Rm.herverkozen.filter}`);
  t(Rm.pip.anim === 'none' && Rm.kroon.anim === 'none', `.bb-pip.knapt "${Rm.pip.anim}" / .kroon.knapt "${Rm.kroon.anim}"`);

  console.log('\n======== C1 · laptop (controle: het drama speelt daar WEL) ========');
  const A = R['laptop'];
  t(A.vonnis.h2Anim === 'vonnisSlag', `.vonnis h2 animeert op laptop: "${A.vonnis.h2Anim}"`);
  t(A.flits.anim === 'tikFlits' && A.flits.opacity > 0, `.tik-flits animeert: "${A.flits.anim}", opacity ${A.flits.opacity}`);
  t(A.inzoomTijdens.anim === 'plaatBlijft', `.plaat-inzoom animeert: "${A.inzoomTijdens.anim}" -> na afloop .plaat-vast scale ${A.inzoomNa.scale}`);
  t(A.schok.anim === 'toneelBeef', `#strijdveld.toneelschok animeert: "${A.schok.anim}" met --schok ${A.schok.schok}`);
  t(A.tik.anim === 'baasTerugstoot', `.baas-tik img animeert: "${A.tik.anim}"`);
  t(A.goudFlits.anim === 'goudFlits', `.goud-flits::after animeert: "${A.goudFlits.anim}"`);
  t(A.doek.transDuur !== '0s', `#toneel-doek faded op laptop: transition ${A.doek.transDuur}`);
  t(Math.abs(parseFloat(A.kantel.rot) - 1.2) < 0.005 && Math.abs(parseFloat(A.kantel.schaal) - 1.02) < 0.005, `.plaat-kantel op laptop: rot ${A.kantel.rot}, schaal ${A.kantel.schaal} (de bleed van -28px vangt dat op)`);
  t(/px/.test(A.kantel.origin), `plaat-transform-origin is de GEMETEN vloerrand: ${A.kantel.origin} (--grondY ${A.kantel.grondY})`);

  console.log('\n======== C2 · mobiel staand (390x844) ========');
  const M = R['mobiel-staand'];
  t(M.inzageRust === 'flex' && M.inzageCeremonie === 'none', `#inzage-knop: rust "${M.inzageRust}" -> tijdens body.ceremonie "${M.inzageCeremonie}" (draai-blok stond ${M.draaiBlok ? 'AAN (staand gevecht) en is voor de meting even weggezet' : 'uit'})`);
  t(Math.abs(M.doek.opacity - 0.80) < 0.005, `doek IV afgetopt: opacity ${M.doek.opacity} bij --doek ${M.doek.doekVar} (eis .80, laptop ${A.doek.opacity})`);
  t(M.vries.voor === M.vries.na, `--hp BEVRIEST op het hart: "${M.vries.voor}" -> na 1000 ms en ${M.vries.maxHp - M.vries.hp} schade nog steeds "${M.vries.na}"`);
  t(M.pip.hartKlasse === true && M.pip.hartAnim === 'hartKnapt', `.bb-balk::before animeert de breuk: klasse hart-knapt=${M.pip.hartKlasse}, animation "${M.pip.hartAnim}"`);
  t(M.kroon.hartAnim === 'hartKnaptKroon', `[data-vorm="2"]-variant: ::before animation "${M.kroon.hartAnim}"`);
  t(Math.abs(parseFloat(M.kantel.rot)) <= 0.3 && Math.abs(parseFloat(M.kantel.schaal) - 1.04) < 0.005, `.plaat-kantel op mobiel: rot ${M.kantel.rot} (laptop ${A.kantel.rot}), schaal ${M.kantel.schaal} - compenserend, |rot| <= .3deg`);
  t(Math.abs(parseFloat(M.instort.rot)) <= 0.3 && Math.abs(parseFloat(M.instort.schaal) - 1.05) < 0.005, `.plaat-instort op mobiel: rot ${M.instort.rot} (laptop ${A.instort.rot}), schaal ${M.instort.schaal}, y ${M.instort.y}`);
  t(M.plaat.bgPosTop <= 0.5, `de plaat toont geen kale ondergrond: background-position "${M.plaat.bgPos}" (verticaal ${M.plaat.bgPosTop} <= 0), inset ${M.plaat.inset}`);
  t(M.schok.factor === '(niet gezet = 1)' || parseFloat(M.schok.factor) === 1, `staand blijft de schok VOL: --schok-f ${M.schok.factor}`);

  console.log('\n======== C2 · mobiel liggend (800x360, <=600px hoog) ========');
  const Lg = R['mobiel-liggend'];
  t(parseFloat(Lg.schok.factor) === 0.5, `--schok-f liggend: ${Lg.schok.factor} (eis .5; --schok zelf blijft ${Lg.schok.schok})`);
  t(parseFloat(Lg.flits.tikMax) === 0.55, `--tik-max liggend: ${Lg.flits.tikMax} (eis .55); gemeten flits-opacity ${Lg.flits.opacity}`);
  /* v120 (fixronde stap C): de eis is niet meer "exact 0,3s" maar "een stap korter DAN
     STAAND, en meelopend met --doek-t". Het harde getal negeerde de inline --doek-t die JS
     uit dtempo voedt (§3.2/§10.11): liggend stond de doekduur daardoor vast, ook bij
     DICK.tempo != 1. De meting hierboven roept toneelDoek(0.92, 350) aan, dus staand 350ms
     en liggend de 70%-calc daarvan. */
  const dLg = parseFloat(Lg.doek.transDuur), dM = parseFloat(M.doek.transDuur);
  t(dLg < dM && Math.abs(dLg - dM * 0.7) < 0.01, `doekduur liggend: ${Lg.doek.transDuur} = 70% van staand ${M.doek.transDuur} - dus een stap korter EN gevoed door --doek-t, niet door een hard getal`);
  t(parseFloat(Lg.vonnis.h2Font) < parseFloat(M.vonnis.h2Font), `vonnis-typografie een stap kleiner: h2 ${Lg.vonnis.h2Font} tegen ${M.vonnis.h2Font} staand`);
  t(parseFloat(Lg.vonnis.spFont) <= parseFloat(M.vonnis.spFont), `duiding: ${Lg.vonnis.spFont} tegen ${M.vonnis.spFont} staand`);
  t(parseFloat(Lg.vonnis.padTop) < parseFloat(M.vonnis.padTop), `vonnis-padding boven: ${Lg.vonnis.padTop} tegen ${M.vonnis.padTop} staand`);
  t(Math.abs(Lg.doek.opacity - 0.80) < 0.005, `doek IV ook liggend afgetopt: ${Lg.doek.opacity}`);
  t(Lg.inzageCeremonie === 'none', `#inzage-knop tijdens de ceremonie: "${Lg.inzageCeremonie}"`);
  t(Lg.plaat.bgPosTop <= 0.5, `plaat-positie liggend: "${Lg.plaat.bgPos}" (verticaal ${Lg.plaat.bgPosTop})`);

  /* v120 (fixronde stap C): C1 x C2 - de terugval moet OOK op de krapste context staan.
     Precies deze kruising ontbrak, en daar zat de specificiteitsval van het doek. */
  console.log('\n======== C1 x C2 · mobiel liggend MET lite ========');
  const Ll = R['mobiel-liggend-lite'];
  t(Ll.lite === true && Ll.modus === 'mobiel', `spoor staat goed: body.lite=${Ll.lite}, modus=${Ll.modus}, viewport liggend <=600px`);
  t(Ll.doek.transDuur === '0s', `#toneel-doek transition-duration: ${Ll.doek.transDuur} (harde KNIP - de landscape-regel heeft een ID en won vóór deze fix van body.lite in style.css)`);
  t(Ll.doek.opacity > 0.5, `het doek dekt daar wel degelijk: opacity ${Ll.doek.opacity} (--doek ${Ll.doek.doekVar}) - de knip dekt in lite juist de harde arenawissel af (§4.3)`);
  t(Ll.vonnis.h2Opacity === 1 && Ll.vonnis.h2Anim === 'none', `.vonnis h2: opacity ${Ll.vonnis.h2Opacity}, animation "${Ll.vonnis.h2Anim}"`);
  t(Ll.flits.opacity === 0 && Ll.flits.anim === 'none', `.tik-flits: opacity ${Ll.flits.opacity}, animation "${Ll.flits.anim}"`);
  t(Ll.schok.anim === 'none', `#strijdveld.toneelschok animation: "${Ll.schok.anim}" (de spoorfactor --schok-f ${Ll.schok.factor} doet er in lite niet meer toe)`);
  t(parseFloat(Ll.vonnis.padTop) >= 40, `de vonnistitel begint ook hier ONDER de topbalk: padding-top ${Ll.vonnis.padTop}`);

  const alleFouten = Object.keys(R).reduce((a, k) => a.concat((R[k].__fouten || []).map(x => k + ': ' + x)), []);
  console.log('\n======== paginafouten ========');
  t(alleFouten.length === 0, alleFouten.length ? alleFouten.slice(0, 6).join('\n        ') : 'geen paginafouten in geen enkel spoor');

  console.log('\n======== TOTAAL ========');
  console.log('   ' + okN + ' ok, ' + foutN + ' FOUT   (shots+json in ' + UIT + ')');
  await browser.close();
  process.exit(foutN ? 1 : 0);
})();
