// STAP A (v120) - acceptatietests A1..A10 + A13 in 2D, laptop 1440x900, DICK.tempo = 1.
// Meet letterlijke waarden; elke regel begint met ok/FOUT + de gemeten getallen.
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const WT = process.env.SLAYIT_WORKTREE || 'C:/Users/Thomas Aelbrecht/Desktop/Workspace/SLAY-IT-drama';
const HOST = 'localhost:4181';
const UIT = process.env.SLAYIT_SHOTS || path.join(__dirname, 'drama_a_shots'); fs.mkdirSync(UIT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));
let okN = 0, foutN = 0;
const t = (goed, tekst) => { if (goed) { okN++; console.log('   ok   ' + tekst); } else { foutN++; console.log('   FOUT ' + tekst); } };

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
  await page.evaluate(() => { devDicktator('slachter_mid'); });
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => document.body.dataset.scherm === 'gevecht' && !!S.gevecht && !document.querySelector('#baas-intro'))) break; await slaap(400); }
  await slaap(1200);
  await page.evaluate(() => { dicktatorRoep('de_griffier'); dicktatorRoep('de_deurwaarder'); }); await slaap(900);

  console.log('\n== A1 · --grondY in _plaatsLaag (2D-tak) ==');
  const a1 = await page.evaluate(() => {
    plaatsGevechtsplaat();
    const bg = document.getElementById('gevecht-achtergrond');
    const ruw = getComputedStyle(bg).getPropertyValue('--grondY').trim();
    const px = parseFloat(ruw);
    const r = bg.getBoundingClientRect();
    const voet = _voetlijnVan(r.top);                 // de gemeten voetlijn (relatief aan de laag)
    const fig = document.querySelector('.speler-figuur');
    const figOnder = fig ? _layoutOnder(fig) : null;  // de layout-onderkant van de held op het scherm
    return { ruw, px, voet, schermY: r.top + px, figOnder, bgTop: r.top, bgSize: bg.style.backgroundSize };
  });
  t(/px$/.test(a1.ruw) && a1.px > 0, `--grondY is een px-waarde > 0: "${a1.ruw}"`);
  t(Math.abs(a1.px - a1.voet) <= 2, `--grondY ${a1.px}px vs gemeten voetlijn ${a1.voet.toFixed(2)}px -> afwijking ${Math.abs(a1.px - a1.voet).toFixed(2)}px (<= 2)`);
  t(Math.abs(a1.schermY - a1.figOnder) <= 2, `--grondY op het scherm ${a1.schermY.toFixed(1)}px vs voet van de held ${a1.figOnder.toFixed(1)}px -> afwijking ${Math.abs(a1.schermY - a1.figOnder).toFixed(2)}px (<= 2)`);

  console.log('\n== A2 · #toneel-doek en #arena-tint ==');
  const a2 = await page.evaluate(() => {
    const d = document.getElementById('toneel-doek'), ti = document.getElementById('arena-tint');
    const cd = getComputedStyle(d), ct = ti ? getComputedStyle(ti) : null;
    toneelDoek(0.92, 300);
    return {
      doekBestaat: !!d, doekOuder: d && d.parentElement.tagName,
      doekZ: cd.zIndex, doekPos: cd.position, doekPE: cd.pointerEvents,
      tintBestaat: !!ti, tintOuder: ti && ti.parentElement.id, tintZ: ct && ct.zIndex, tintPos: ct && ct.position,
      tintNaCanvas: ti && !!(ti.previousElementSibling && ti.previousElementSibling.id === 'vista-canvas'),
      topbalkZ: getComputedStyle(document.getElementById('topbalk')).zIndex
    };
  });
  await slaap(500);
  const a2b = await page.evaluate(() => {
    const d = document.getElementById('toneel-doek');
    const tb = document.getElementById('topbalk').getBoundingClientRect();
    const raak = document.elementFromPoint(tb.left + tb.width / 2, tb.top + tb.height / 2);
    return { doekOpacity: getComputedStyle(d).opacity, boven: raak ? (raak.id || raak.className || raak.tagName) : null, inTopbalk: !!(raak && raak.closest('#topbalk')) };
  });
  t(a2.doekBestaat && a2.doekOuder === 'BODY', `#toneel-doek bestaat en is een body-kind (ouder: ${a2.doekOuder})`);
  t(a2.doekZ === '45' && a2.doekPos === 'fixed' && a2.doekPE === 'none', `#toneel-doek: z-index ${a2.doekZ}, position ${a2.doekPos}, pointer-events ${a2.doekPE}`);
  t(a2.tintBestaat && a2.tintOuder === 'scherm-gevecht' && a2.tintNaCanvas, `#arena-tint bestaat, zit in #${a2.tintOuder} en staat NA <canvas id="vista-canvas">`);
  t(a2.tintPos === 'absolute' && a2.tintZ === '0', `#arena-tint: position ${a2.tintPos}, z-index ${a2.tintZ}`);
  t(Math.abs(parseFloat(a2b.doekOpacity) - 0.92) < 0.01, `doek op --doek:.92 geeft opacity ${a2b.doekOpacity}`);
  t(a2b.inTopbalk, `bij --doek:.92 ligt de topbalk (z ${a2.topbalkZ}) nog boven het doek (raakpunt: ${a2b.boven})`);
  await page.screenshot({ path: path.join(UIT, 'a2-doek-92.png') });
  await page.evaluate(() => toneelDoek(0)); await slaap(400);

  console.log('\n== A3 · bazenbalk-vries via b._bbToon ==');
  const a3 = await page.evaluate(async () => {
    const g = S.gevecht, b = g.vijanden.find(v => v.id === 'de_dicktator');
    b._bbToon = 0; b.hp = 240; renderGevecht();
    const lees = () => {
      const bb = document.getElementById('baas-balk');
      return {
        hp: getComputedStyle(bb.querySelector('.bb-balk')).getPropertyValue('--hp').trim(),
        vul: bb.querySelector('.bb-vul').style.width,
        tekst: bb.querySelector('.bb-tekst').textContent,
        pips: [...bb.querySelectorAll('.bb-pip')].map(p => p.classList.contains('aan') ? 1 : 0).join('')
      };
    };
    const voor = lees();
    b.hp = 96; b.fase = 2; renderGevecht();
    const na0 = lees();
    await new Promise(r => setTimeout(r, 1000));
    renderGevecht();
    const na1000 = lees();
    b._bbToon = null; renderGevecht();
    const vrij = lees();
    return { voor, na0, na1000, vrij };
  });
  t(a3.na0.hp === a3.voor.hp && a3.na1000.hp === a3.voor.hp, `--hp bevriest: ${a3.voor.hp} -> ${a3.na0.hp} (t=0) -> ${a3.na1000.hp} (t=1000) na 240->96 HP`);
  t(a3.na0.vul === a3.voor.vul && a3.na1000.vul === a3.voor.vul, `.bb-vul breedte bevriest: "${a3.voor.vul}" -> "${a3.na0.vul}" -> "${a3.na1000.vul}"`);
  t(a3.na0.tekst === a3.voor.tekst, `.bb-tekst bevriest: "${a3.voor.tekst}" -> "${a3.na0.tekst}"`);
  t(a3.na0.pips === a3.voor.pips, `pips bevriezen bij fase 1->2: ${a3.voor.pips} -> ${a3.na0.pips}`);
  t(a3.vrij.hp === '40' && a3.vrij.tekst === '96/240' && a3.vrij.pips !== a3.voor.pips, `vrijgave (_bbToon = null) laat alles los: --hp ${a3.vrij.hp}, tekst "${a3.vrij.tekst}", pips ${a3.vrij.pips}`);

  console.log('\n== A4 · ceremonie-uitzondering op .sterft / .lijk-weg ==');
  const a4 = await page.evaluate(async () => {
    const g = S.gevecht;
    const gr = g.vijanden.find(v => v.id === 'de_griffier');
    const wrap = () => [...document.querySelectorAll('#vijanden-rij .vijand')][g.vijanden.indexOf(gr)];
    // 1) MET ceremonie + exit-klasse: de regie speelt de afgang uit
    g.ceremonie = true; gr.dood = true; gr.hp = 0;
    wrap().classList.add('exit', 'geveld');
    renderGevecht();
    await new Promise(r => setTimeout(r, 100));
    const t100 = { op: getComputedStyle(wrap()).opacity, sterft: wrap().classList.contains('sterft'), lijk: wrap().classList.contains('lijk-weg') };
    await new Promise(r => setTimeout(r, 700));
    renderGevecht();
    const t800 = { op: getComputedStyle(wrap()).opacity, sterft: wrap().classList.contains('sterft'), lijk: wrap().classList.contains('lijk-weg') };
    // 2) ZONDER ceremonie: het bestaande gedrag moet ongewijzigd zijn
    wrap().classList.remove('exit', 'geveld');
    g.ceremonie = false; renderGevecht();
    const zonder = { sterft: wrap().classList.contains('sterft') };
    await new Promise(r => setTimeout(r, 900));
    const zonder800 = { lijk: wrap().classList.contains('lijk-weg') };
    gr.dood = false; gr.hp = 30; g.ceremonie = false; renderGevecht();
    return { t100, t800, zonder, zonder800 };
  });
  t(parseFloat(a4.t100.op) > 0.5, `t=100 met ceremonie+.exit: opacity ${a4.t100.op} (> 0.5), .sterft=${a4.t100.sterft}`);
  t(a4.t800.lijk === false, `t=800 met ceremonie+.exit: .lijk-weg = ${a4.t800.lijk}`);
  t(a4.zonder.sterft === true && a4.zonder800.lijk === true, `zonder ceremonie ONGEWIJZIGD: .sterft=${a4.zonder.sterft}, na 750ms .lijk-weg=${a4.zonder800.lijk}`);

  console.log('\n== A5 · fase-klassen afdwingen vanuit renderGevecht ==');
  const a5 = await page.evaluate(() => {
    const g = S.gevecht, b = g.vijanden.find(v => v.id === 'de_dicktator');
    const bw = () => [...document.querySelectorAll('#vijanden-rij .vijand')][g.vijanden.indexOf(b)];
    b.fase = 3;
    bw().classList.add('woede');
    const voorRoep = bw().classList.contains('woede');
    const n = dicktatorRoep('de_claqueur', { hp: 16 });   // bouwGevechtDom wist elke klasse
    const naRoep = bw().classList.contains('woede');
    b.herrezen = true; renderGevecht();
    const herv = bw().classList.contains('herverkozen');
    b.herrezen = false; b.fase = 1; renderGevecht();
    const terug = bw().classList.contains('woede');
    return { voorRoep, naRoep, herv, terug, claqueur: !!n };
  });
  t(a5.claqueur && a5.naRoep, `dicktatorRoep('de_claqueur') bij fase 3: .woede voor=${a5.voorRoep}, na de DOM-herbouw=${a5.naRoep}`);
  t(a5.herv === true, `herrezen=true -> .herverkozen op de wrap: ${a5.herv}`);
  t(a5.terug === false, `fase terug naar 1 -> .woede weer weg: ${a5.terug}`);

  console.log('\n== A6 · g.ceremonie vrijgeven VOOR checkBaasFase ==');
  const a6 = await page.evaluate(() => {
    const g = S.gevecht;
    const echt = window.checkBaasFase;
    let geroepen = 0;
    window.checkBaasFase = () => { geroepen++; S.gevecht.ceremonie = true; };
    g.ceremonie = false; g.herrijzenisNu = false;
    beginSpelerBeurt();
    const na = { ceremonie: g.ceremonie, geroepen };
    window.checkBaasFase = echt;
    g.ceremonie = false;
    return na;
  });
  t(a6.geroepen === 1, `checkBaasFase is 1x geroepen (${a6.geroepen}x)`);
  t(a6.ceremonie === true, `een ceremonie die in checkBaasFase start blijft staan na beginSpelerBeurt: g.ceremonie = ${a6.ceremonie}`);

  console.log('\n== A7 · hitstop / schokToneel / plaatKick / baasTik / hofDeinst ==');
  const a7 = await page.evaluate(async () => {
    const sc = document.getElementById('scherm-gevecht'), sv = document.getElementById('strijdveld');
    hitstop(200);
    await new Promise(r => setTimeout(r, 50));
    const t50 = { klasse: sc.classList.contains('hitstop'), scTransform: getComputedStyle(sc).transform, svFilter: getComputedStyle(sv).filter, figAnim: getComputedStyle(document.querySelector('.vijand-art img') || document.querySelector('.vijand-art')).animationPlayState };
    await new Promise(r => setTimeout(r, 200));
    const t250 = { klasse: sc.classList.contains('hitstop'), svFilter: getComputedStyle(sv).filter };
    return { t50, t250 };
  });
  t(a7.t50.klasse === true, `t=50 na hitstop(200): #scherm-gevecht heeft .hitstop (${a7.t50.klasse})`);
  t(a7.t250.klasse === false, `t=250 na hitstop(200): .hitstop weg (${a7.t250.klasse})`);
  t(a7.t50.figAnim === 'paused', `tijdens de hitstop staat de figuur-animatie op "${a7.t50.figAnim}"`);
  t(a7.t50.scTransform === 'none', `#scherm-gevecht heeft tijdens de hitstop GEEN eigen transform ("${a7.t50.scTransform}")`);
  t(a7.t50.svFilter !== 'none' && a7.t250.svFilter === 'none', `de brightness-dip zit op #strijdveld: "${a7.t50.svFilter}" -> "${a7.t250.svFilter}"`);

  const a7b = await page.evaluate(async () => {
    const sc = document.getElementById('scherm-gevecht'), sv = document.getElementById('strijdveld');
    const bg = document.getElementById('gevecht-achtergrond');
    schokToneel(1.8, 520);
    await new Promise(r => setTimeout(r, 120));
    const s = { sv: getComputedStyle(sv).translate, scTransform: getComputedStyle(sc).transform, schok: sv.style.getPropertyValue('--schok') };
    plaatKick('plaat-dreun', 520);
    await new Promise(r => setTimeout(r, 160));
    const p = { origin: getComputedStyle(bg).transformOrigin, scale: getComputedStyle(bg).scale, klasse: bg.className, grondY: getComputedStyle(bg).getPropertyValue('--grondY').trim(), hoogte: bg.getBoundingClientRect().height };
    await new Promise(r => setTimeout(r, 600));
    const pNa = { klasse: bg.className, scale: getComputedStyle(bg).scale };
    return { s, p, pNa };
  });
  t(a7b.s.sv !== 'none' && a7b.s.sv !== '0px', `schokToneel(1.8) zet een translate op #strijdveld: "${a7b.s.sv}" (--schok = ${a7b.s.schok})`);
  t(a7b.s.scTransform === 'none', `#scherm-gevecht blijft transform-loos tijdens de schok ("${a7b.s.scTransform}")`);
  const originY = parseFloat((a7b.p.origin.split(' ')[1] || '0'));
  t(Math.abs(originY - parseFloat(a7b.p.grondY)) <= 1, `plaatKick draait om --grondY: transform-origin "${a7b.p.origin}" vs --grondY ${a7b.p.grondY} (laaghoogte ${a7b.p.hoogte.toFixed(0)}px, 61% zou ${(a7b.p.hoogte * 0.61).toFixed(0)}px zijn)`);
  t(a7b.p.scale !== 'none' && a7b.p.scale !== '1', `de plaat schaalt tijdens de dreun: scale "${a7b.p.scale}"`);
  t(!/plaat-beweeg/.test(a7b.pNa.klasse) && (a7b.pNa.scale === 'none' || a7b.pNa.scale === '1'), `na afloop is de dreun opgeruimd: klasse "${a7b.pNa.klasse}", scale "${a7b.pNa.scale}"`);

  const a7c = await page.evaluate(async () => {
    const g = S.gevecht, b = g.vijanden.find(v => v.id === 'de_dicktator');
    const bw = [...document.querySelectorAll('#vijanden-rij .vijand')][g.vijanden.indexOf(b)];
    baasTik(b, 2);
    await new Promise(r => setTimeout(r, 60));
    const img = bw.querySelector('.vijand-art img');
    const st = { klasse: bw.classList.contains('baas-tik'), tikx: bw.style.getPropertyValue('--tikx'), tikr: bw.style.getPropertyValue('--tikr'), tikT: bw.style.getPropertyValue('--tik-t'), imgTranslate: img ? getComputedStyle(img).translate : null, imgRotate: img ? getComputedStyle(img).rotate : null, voetc: img ? getComputedStyle(img).getPropertyValue('--voetc').trim() : null, src: img ? (img.currentSrc || img.src).split('/').pop() : null, flits: !!document.querySelector('.tik-flits'), flitsZ: document.querySelector('.tik-flits') ? getComputedStyle(document.querySelector('.tik-flits')).zIndex : null, hitstop: document.getElementById('scherm-gevecht').classList.contains('hitstop') };
    await new Promise(r => setTimeout(r, 700));
    const na = { klasse: bw.classList.contains('baas-tik'), flits: !!document.querySelector('.tik-flits'), imgTranslate: img ? getComputedStyle(img).translate : null };
    return { st, na };
  });
  t(a7c.st.klasse && a7c.st.tikx === '38px' && a7c.st.tikr === '6deg', `baasTik(b,2): .baas-tik met --tikx ${a7c.st.tikx}, --tikr ${a7c.st.tikr}, --tik-t ${a7c.st.tikT}`);
  t(/_hit\./.test(a7c.st.src || ''), `de baas draagt zijn hit-plaat: ${a7c.st.src}`);
  t(a7c.st.hitstop === true, `de tik zet meteen een hitstop (${a7c.st.hitstop})`);
  t(a7c.st.flits && a7c.st.flitsZ === '70', `.tik-flits ligt op z-index ${a7c.st.flitsZ}`);
  t(a7c.st.imgTranslate !== null && a7c.st.imgTranslate !== 'none', `de img beweegt op de LOSSE translate: "${a7c.st.imgTranslate}" (rotate "${a7c.st.imgRotate}", --voetc "${a7c.st.voetc}")`);
  t(a7c.na.klasse === false && a7c.na.flits === false, `na 760ms opgeruimd: .baas-tik=${a7c.na.klasse}, .tik-flits=${a7c.na.flits}, eindtranslate "${a7c.na.imgTranslate}"`);

  const a7d = await page.evaluate(async () => {
    const g = S.gevecht;
    hofDeinst(g);
    await new Promise(r => setTimeout(r, 40));
    const vroeg = [...document.querySelectorAll('#vijanden-rij .vijand')].map(w => w.classList.contains('deinst') ? 1 : 0).join('');
    await new Promise(r => setTimeout(r, 260));
    const laat = [...document.querySelectorAll('#vijanden-rij .vijand')].map(w => w.classList.contains('deinst') ? 1 : 0).join('');
    await new Promise(r => setTimeout(r, 800));
    const na = [...document.querySelectorAll('#vijanden-rij .vijand')].map(w => w.classList.contains('deinst') ? 1 : 0).join('');
    return { vroeg, laat, na, hof: g.vijanden.filter(v => v.hof && !v.dood).length };
  });
  t(a7d.laat.split('1').length - 1 > a7d.vroeg.split('1').length - 1, `hofDeinst is een GOLF: t=40 ${a7d.vroeg}, t=300 ${a7d.laat} (${a7d.hof} hovelingen)`);
  t(a7d.na.indexOf('1') === -1, `na 1100ms is .deinst overal weg: ${a7d.na}`);

  console.log('\n== A8 · baasSpreekt: duur + FIFO-wachtrij ==');
  const a8 = await page.evaluate(async () => {
    document.querySelectorAll('.baas-spraak').forEach(e => e.remove());
    baasSpreekt('EERSTE REGEL', 700);
    baasSpreekt('TWEEDE REGEL', 700);
    const meet = [];
    for (let i = 0; i < 16; i++) {
      await new Promise(r => setTimeout(r, 100));
      const l = document.querySelectorAll('.baas-spraak');
      meet.push({ ms: (i + 1) * 100, n: l.length, tekst: l[0] ? l[0].textContent : '', duur: l[0] ? getComputedStyle(l[0]).animationDuration : '' });
    }
    return meet;
  });
  const max = Math.max(...a8.map(m => m.n));
  t(max <= 1, `nooit meer dan 1 .baas-spraak tegelijk (max gemeten: ${max}); reeks n = ${a8.map(m => m.n).join('')}`);
  const eerste = a8.find(m => m.tekst.includes('EERSTE')), tweede = a8.find(m => m.tekst.includes('TWEEDE'));
  t(!!eerste && !!tweede && a8.indexOf(eerste) < a8.indexOf(tweede), `FIFO: "EERSTE" op t=${eerste ? eerste.ms : '?'}ms, "TWEEDE" op t=${tweede ? tweede.ms : '?'}ms`);
  t(eerste && eerste.duur === '0.7s', `--spraak-duur voedt de CSS-animatie: animation-duration = ${eerste ? eerste.duur : '?'} bij baasSpreekt(..., 700)`);

  console.log('\n== A9 · vonnisSlam NAAST baasFaseMoment ==');
  const a9 = await page.evaluate(async () => {
    document.querySelectorAll('.baas-flits, .vonnis').forEach(e => e.remove());
    baasFaseMoment('II &middot; HET PROCES', 'de duiding');
    await new Promise(r => setTimeout(r, 60));
    const bf = document.querySelector('.baas-flits');
    const bfHtml = bf ? bf.outerHTML : null;
    const bron = baasFaseMoment.toString();
    bf && bf.remove();
    const el = vonnisSlam('II &middot; HET PROCES', 'De griffie loopt.', { duur: 900 });
    await new Promise(r => setTimeout(r, 60));
    const cs = getComputedStyle(el);
    const alphas = (cs.backgroundImage.match(/rgba?\([^)]*\)/g) || []).map(s => { const p = s.replace(/rgba?\(|\)/g, '').split(','); return p.length === 4 ? parseFloat(p[3]) : 1; });
    const h2 = el.querySelector('h2'), sp = el.querySelector('span');
    const r = { bfHtml, bronLen: bron.length, bronHeeftOpts: /opts|arguments\[2\]/.test(bron), vonnisZ: cs.zIndex, vonnisPE: cs.pointerEvents, alphas, duur: cs.animationDuration, h2Anim: getComputedStyle(h2).animationName, spAnim: getComputedStyle(sp).animationName, subTekst: sp.textContent };
    await new Promise(r2 => setTimeout(r2, 1000));
    r.opgeruimd = !document.querySelector('.vonnis');
    return r;
  });
  t(a9.bfHtml === '<div class="baas-flits"><h2>II · HET PROCES</h2><span>de duiding</span></div>', `baasFaseMoment produceert onveranderde DOM: ${a9.bfHtml}`);
  t(a9.bronHeeftOpts === false, `baasFaseMoment heeft geen opts-parameter gekregen (bron ${a9.bronLen} tekens, 21 aanroepers ongemoeid)`);
  t(Math.max(...a9.alphas) < 0.45, `.vonnis achtergrond-alpha max ${Math.max(...a9.alphas)} (< 0.45): ${a9.alphas.join(', ')}`);
  t(a9.vonnisZ === '55' && a9.vonnisPE === 'none', `.vonnis: z-index ${a9.vonnisZ}, pointer-events ${a9.vonnisPE}`);
  t(a9.duur === '0.9s', `--vonnis-duur voedt de CSS: animation-duration ${a9.duur} bij duur 900`);
  t(a9.h2Anim === 'vonnisSlag' && a9.spAnim === 'vonnisSub', `stempel + duiding animeren: h2 "${a9.h2Anim}", span "${a9.spAnim}" ("${a9.subTekst}")`);
  t(a9.opgeruimd, `de vonnisplaat ruimt zichzelf op na de duur (${a9.opgeruimd})`);

  console.log('\n== A10 · toonArenaWissel: promise-retour + grondlijn ==');
  const a10 = await page.evaluate(async () => {
    plaatsGevechtsplaat();
    const bg = document.getElementById('gevecht-achtergrond');
    const lees = () => { const r = bg.getBoundingClientRect(); return { y: r.top + parseFloat(getComputedStyle(bg).getPropertyValue('--grondY')), pos: bg.style.backgroundPosition, maat: bg.style.backgroundSize }; };
    const voor = lees();
    const url = ACHTERGRONDEN.basis + ACHTERGRONDEN.act3.finaleFasen.verschuiving;
    const t0 = performance.now();
    const res = await toonArenaWissel(url, { stijl: 'plaat-kantel' });
    const duur = performance.now() - t0;
    plaatsGevechtsplaat();
    const na = lees();
    return { voor, na, res, duur, url, vh: window.innerHeight, klasse: bg.className, leeg: !document.getElementById('gevecht-achtergrond-2') };
  });
  const afw = Math.abs(a10.na.y - a10.voor.y);
  t(a10.res === true, `toonArenaWissel geeft een Promise die op true resolvet (${a10.res}) na ${a10.duur.toFixed(0)}ms`);
  t(afw / a10.vh * 100 < 1, `grondlijn voor ${a10.voor.y.toFixed(1)}px -> na ${a10.na.y.toFixed(1)}px = ${afw.toFixed(2)}px = ${(afw / a10.vh * 100).toFixed(3)}% vh (< 1%)`);
  t(!/plaat-/.test(a10.klasse) && a10.leeg, `hard() ruimt de uitgaande stijl en de crossfade-laag op: klasse "${a10.klasse}", laag2 weg = ${a10.leeg}`);
  t(a10.na.maat !== '' && /px/.test(a10.na.maat), `de nieuwe plaat staat op een expliciete maat: ${a10.na.maat} @ ${a10.na.pos}`);

  console.log('\n== A13 · visuele check (screenshots) ==');
  await page.evaluate(() => {
    const g = S.gevecht, b = g.vijanden.find(v => v.id === 'de_dicktator');
    document.getElementById('scherm-gevecht').dataset.bedrijf = '3';
    document.body.classList.add('tirade', 'ceremonie');
    toneelDoek(0.55, 200);
    vonnisSlam('III &middot; DE TIRADE', 'Geen griffie meer. Hij tekent, int en slaat voortaan ZELF.', { duur: 6000, schok: false });
    document.querySelectorAll('.bb-pip')[2] && document.querySelectorAll('.bb-pip')[2].classList.add('aan', 'knapt');
  });
  await slaap(900);
  await page.screenshot({ path: path.join(UIT, 'a13-vonnis-doek-bedrijf3.png') });
  await page.evaluate(() => {
    document.getElementById('scherm-gevecht').dataset.bedrijf = '4';
    toneelDoek(0.92, 200);
    const g = S.gevecht, b = g.vijanden.find(v => v.id === 'de_dicktator');
    b.herrezen = true; b.fase = 3; renderGevecht();
  });
  await slaap(700);
  await page.screenshot({ path: path.join(UIT, 'a13-bedrijf4-herverkozen.png') });
  const a13 = await page.evaluate(() => {
    const g = S.gevecht, b = g.vijanden.find(v => v.id === 'de_dicktator');
    const bw = [...document.querySelectorAll('#vijanden-rij .vijand')][g.vijanden.indexOf(b)];
    const art = bw.querySelector('.vijand-art');
    return { wrapScale: getComputedStyle(bw).scale, artAnim: getComputedStyle(art).animationName, tint: getComputedStyle(document.getElementById('arena-tint')).opacity, vignet: getComputedStyle(document.getElementById('licht-vignet')).opacity, ring: getComputedStyle(document.getElementById('speler-zone'), '::before').backgroundImage.slice(0, 40), iso: getComputedStyle(document.getElementById('speler-zone')).isolation };
  });
  t(a13.wrapScale === '1.12', `de herkozen tiran schaalt op de WRAP: scale ${a13.wrapScale}`);
  t(a13.artAnim === 'woedeGloeiGoud', `de gouden gloed wint van .woede: animation-name "${a13.artAnim}"`);
  t(parseFloat(a13.tint) === 1, `#arena-tint staat aan in bedrijf 4: opacity ${a13.tint}`);
  t(Math.abs(parseFloat(a13.vignet) - 0.82) < 0.01, `body.tirade knijpt het vignet dicht: opacity ${a13.vignet}`);
  t(a13.iso === 'isolate' && /gradient/.test(a13.ring), `de ceremoniekring zit in een eigen stapelcontext (isolation: ${a13.iso}, ::before ${a13.ring}...)`);

  console.log('\n== opruim ==');
  t(fouten.length === 0, fouten.length ? 'PAGINAFOUTEN: ' + fouten.slice(0, 4).join(' | ') : 'geen paginafouten in de hele ronde');
  t(mist.length === 0, mist.length ? '404: ' + [...new Set(mist)].slice(0, 6).join(', ') : 'geen 404');
  console.log(`\n============================================\nSTAP A 2D: ${okN} ok, ${foutN} FOUT\n============================================`);
  await ctx.close(); await browser.close();
  process.exit(foutN ? 1 : 0);
})();
