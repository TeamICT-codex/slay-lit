// STAP C3 (v120) - de PLAYTEST-MATRIX: elf scenario's, elk met de volledige regie van HET
// PROCES, en per scenario geteld wat er NA afloop nog aan het scherm hangt: .vonnis,
// .tik-flits, #toneel-doek.aan, .hitstop, .slowmo, .goud-flits, .toneelschok,
// body.ceremonie, g.ceremonie, g._regieBezig, de zes regieklassen op een LEVEND figuur,
// de plaat-kickklassen en de bazenbalk-vries b._bbToon - plus alle console- en
// paginafouten. Scenario 11 draait de twee bestaande toneel-acceptatiesuites tegen
// dezelfde worktree: die moeten GROEN BLIJVEN.
//
// Een nog lopende .baas-spraak vlak na afloop is GEEN fout: de laatste regel van elke
// regie valt bewust NA de invoervrijgave (§2.1 t=4000, §2.2 t=5600, §2.3 t=6400). Wat wel
// een fout is, is een spraakplaat die zijn eigen --spraak-duur overleeft - dus die wordt
// hier gemeten i.p.v. geteld: lees --spraak-duur uit het element, wacht die duur uit en
// tel opnieuw.
//
// Draaien (Git Bash, vanuit de scratchpad met node_modules/playwright):
//   NODE_PATH="$PWD/node_modules" SLAYIT_WORKTREE=<worktree> SLAYIT_SHOTS=<map> \
//   node tools/drama_stap_c_matrix.js
// SLAYIT_SUITES=0 slaat scenario 11 over (de matrix + de suites kosten samen ~12 min).
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path'); const fs = require('fs');
const WT = process.env.SLAYIT_WORKTREE || 'C:/Users/Thomas Aelbrecht/Desktop/Workspace/SLAY-IT-drama';
const HOST = 'localhost:4181';
const UIT = process.env.SLAYIT_SHOTS || path.join(__dirname, 'drama_c_shots'); fs.mkdirSync(UIT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));
let okN = 0, foutN = 0;
const t = (goed, tekst) => { if (goed) { okN++; console.log('   ok   ' + tekst); } else { foutN++; console.log('   FOUT ' + tekst); } };

const REST = `window.__rest = function () {
  const sc = document.getElementById('scherm-gevecht');
  const doek = document.getElementById('toneel-doek');
  const sv = document.getElementById('strijdveld');
  const g = S.gevecht;
  const REGIE = ['baas-tik', 'oprijzen', 'oprijzen-groot', 'knielt', 'deinst', 'stemt'];
  const fig = [];
  (GDOM.vijanden || []).forEach((d, i) => {
    const v = g && g.vijanden[i];
    if (!d || !d.wrap || !v || v.dood) return;        /* op een LIJK is .exit/.geveld/.vlucht de bedoeling */
    REGIE.forEach(k => { if (d.wrap.classList.contains(k)) fig.push(v.id + '.' + k); });
    const art = d.wrap.querySelector('.vijand-art');
    if (art && art.style.scale) fig.push(v.id + '.inline-scale=' + art.style.scale);
  });
  const plaat = [];
  ['gevecht-achtergrond', 'gevecht-achtergrond-2'].forEach(id => {
    const l = document.getElementById(id); if (!l) return;
    ['plaat-beweeg', 'plaat-dreun', 'plaat-kantel', 'plaat-instort', 'zwaar'].forEach(k => { if (l.classList.contains(k)) plaat.push(id + '.' + k); });
  });
  /* .plaat-inzoom hoort NIET in de restlijst en .plaat-vast al helemaal niet: de
     6%-camerakruip van bedrijf III is een BLIJVENDE stand (§2.2 t=2600). plaatKick zet hem
     na de animatie om naar de animatieloze .plaat-vast, dus dat is waar je hem terugvindt. */
  const vast = [];
  ['gevecht-achtergrond', 'gevecht-achtergrond-2'].forEach(id => {
    const l = document.getElementById(id); if (!l) return;
    if (l.classList.contains('plaat-vast')) vast.push(id + '=' + (getComputedStyle(l).scale || '(geen)'));
  });
  const sp = [...document.querySelectorAll('.baas-spraak')];
  const b = g && g.vijanden.find(v => v.id === 'de_dicktator');
  return {
    vonnis: document.querySelectorAll('.vonnis').length,
    tikFlits: document.querySelectorAll('.tik-flits').length,
    spraak: sp.length,
    spraakDuur: Math.max(0, ...sp.map(e => parseFloat(e.style.getPropertyValue('--spraak-duur')) || 0)),
    doekAan: doek ? doek.classList.contains('aan') : null,
    doekOpacity: doek ? +getComputedStyle(doek).opacity : null,
    hitstop: sc.classList.contains('hitstop'),
    slowmo: sc.classList.contains('slowmo'),
    goudFlits: sc.classList.contains('goud-flits'),
    schok: sv ? sv.classList.contains('toneelschok') : null,
    bodyCeremonie: document.body.classList.contains('ceremonie'),
    ceremonie: !!(g && g.ceremonie),
    regieBezig: g ? (g._regieBezig === null || g._regieBezig === undefined ? null : g._regieBezig) : null,
    bbToon: b ? (b._bbToon === null || b._bbToon === undefined ? null : b._bbToon) : '(geen baas)',
    eindDisabled: (document.getElementById('knop-eindbeurt') || {}).disabled,
    figuurKlassen: fig, plaatKlassen: plaat,
    bedrijf: sc.dataset.bedrijf || '', tirade: document.body.classList.contains('tirade'),
    plaatVast: vast,
    fase: b ? b.fase : null, hp: b ? b.hp : null, herrezen: b ? !!b.herrezen : null,
    levend: g ? g.vijanden.filter(v => !v.dood).map(v => v.id).join(',') : ''
  };
};
/* DE REGIE MOET OOK ECHT SPELEN. Zonder deze recorder meet de matrix alleen dat er niets
   BLIJFT hangen - en dat is in een spoor waar de hele regie stilvalt per definitie waar.
   Een sampler van 80ms noteert daarom wat er ONDERWEG te zien was: elke klasse, de
   diepste doekstand en elke baaspose die in beeld kwam. */
window.__kijkStart = function () {
  clearInterval(window.__kijkT);
  /* In 3D swapt pose2D de 2D-img NIET (Vista tekent de sprite), dus daar zegt de img-src
     niets over de figuurbeats. Tel dan de Vista-aanroepen zelf: dat is precies de
     ruggengraat die §4.3 voor het 3D-spoor belooft. Eén keer wikkelen, per meting nullen. */
  if (window.Vista && !window.Vista.__gewikkeld) {
    window.Vista.__gewikkeld = true;
    ['raak', 'pose', 'sterf', 'schud', 'zetLicht', 'aanval'].forEach(m => {
      const orig = window.Vista[m]; if (typeof orig !== 'function') return;
      window.Vista[m] = function (...a) { window.__vista[m] = (window.__vista[m] || 0) + 1; return orig.apply(this, a); };
    });
  }
  window.__vista = {};
  const z = window.__gezien = { doekMax: 0, klassen: {}, poses: {}, doekStanden: {} };
  const zet = k => { z.klassen[k] = (z.klassen[k] || 0) + 1; };
  window.__kijkT = setInterval(() => {
    const sc = document.getElementById('scherm-gevecht');
    const doek = document.getElementById('toneel-doek');
    const sv = document.getElementById('strijdveld');
    const g = S.gevecht; if (!sc || !g) return;
    if (document.querySelector('.vonnis')) zet('.vonnis');
    if (document.querySelector('.vonnis.goud')) zet('.vonnis.goud');
    if (document.querySelector('.tik-flits')) zet('.tik-flits');
    if (document.querySelector('.baas-spraak')) zet('.baas-spraak');
    if (doek && doek.classList.contains('aan')) {
      const o = +getComputedStyle(doek).opacity;
      if (o > z.doekMax) z.doekMax = o;
      const d = doek.style.getPropertyValue('--doek'); if (d) z.doekStanden[d.trim()] = 1;
      zet('#toneel-doek.aan');
    }
    if (sc.classList.contains('hitstop')) zet('.hitstop');
    if (sc.classList.contains('goud-flits')) zet('.goud-flits');
    if (sc.classList.contains('slowmo')) zet('.slowmo');
    if (sv && sv.classList.contains('toneelschok')) zet('#strijdveld.toneelschok');
    if (g.ceremonie) zet('g.ceremonie');
    if (document.body.classList.contains('ceremonie')) zet('body.ceremonie');
    if (document.querySelector('.bb-pip.knapt')) zet('.bb-pip.knapt');
    if (document.querySelector('.bb-balk.hart-knapt')) zet('.bb-balk.hart-knapt');
    ['plaat-dreun', 'plaat-kantel', 'plaat-inzoom', 'plaat-instort', 'plaat-vast', 'zwaar'].forEach(k => { if (document.querySelector('#gevecht-achtergrond.' + k + ', #gevecht-achtergrond-2.' + k)) zet('.' + k); });
    ['baas-tik', 'oprijzen', 'oprijzen-groot', 'knielt', 'deinst', 'stemt', 'exit', 'geveld', 'vlucht', 'kiezer', 'woede', 'herverkozen'].forEach(k => { if (document.querySelector('.vijand.' + k)) zet('.vijand.' + k); });
    (GDOM.vijanden || []).forEach((d, i) => {
      const v = g.vijanden[i]; if (!d || !d.wrap || !v || v.id !== 'de_dicktator') return;
      const img = d.wrap.querySelector('.vijand-art img');
      if (!img || !img.src) return;
      const m = /de_dicktator(_[a-z]+)?\.webp/.exec(img.src);
      if (m) z.poses[m[1] || '(basis)'] = 1;
    });
  }, 80);
};
window.__oogst = function () {
  clearInterval(window.__kijkT);
  const z = window.__gezien || { doekMax: 0, klassen: {}, poses: {}, doekStanden: {} };
  const v = window.__vista || {};
  return { doekMax: Math.round(z.doekMax * 1000) / 1000, doekStanden: Object.keys(z.doekStanden).sort(), klassen: Object.keys(z.klassen).sort(), poses: Object.keys(z.poses).sort(),
    vista: Object.keys(v).sort().map(k => k + '=' + v[k]) };
};`;

const SCENARIOS = [
  { n: '1 · laptop 2D', w: 1440, h: 900 },
  { n: '2 · lite (body.lite)', lite: true },
  { n: '3 · OS-reduced-motion MET lite handmatig uit', reduced: true },
  { n: '4 · 3D / Vista', d3: true },
  { n: '5 · mobiel staand', mobiel: true, w: 390, h: 844 },
  { n: '6 · mobiel liggend <=600px', mobiel: true, w: 800, h: 360 },
  { n: '7 · DICK.tempo = 0.02 (balansharnas)', tempo: 0.02 },
  { n: '8 · fase-skip >66% -> <33% (bedrijf II overgeslagen)', soort: 'skip' },
  { n: '9 · fasegrens tijdens de VIJANDBEURT (gif)', soort: 'gif' },
  { n: '10 · hof al vol (dicktatorRoep geeft null)', soort: 'hofvol' }
];

async function draai(browser, s) {
  const w = s.w || 1440, h = s.h || 900;
  const ctx = await browser.newContext(Object.assign({
    viewport: { width: w, height: h }, serviceWorkers: 'block',
    hasTouch: !!s.mobiel, isMobile: !!s.mobiel, deviceScaleFactor: s.mobiel ? 2 : 1
  }, s.reduced ? { reducedMotion: 'reduce' } : {}));
  const page = await ctx.newPage();
  const fouten = [], mist = [];
  page.on('pageerror', e => fouten.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') fouten.push('console: ' + m.text().slice(0, 200)); });
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
  if (s.mobiel) await page.evaluate(() => { document.body.dataset.modus = 'mobiel'; window.mobiel = true; });
  await page.evaluate(([d3, lite]) => { INST.d3 = d3; INST.lite = lite; document.body.classList.toggle('lite', lite); try { bewaarInst(); } catch (e) {} try { toonHeldKeuze(); } catch (e) {} }, [!!s.d3, !!s.lite]);
  await slaap(300);
  await page.evaluate(() => { const k = document.querySelector('.held-kies'); if (k) k.click(); }); await slaap(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /toch beginnen/i.test(x.textContent)); if (b) b.click(); }); await slaap(800);
  await page.evaluate(REST);

  const opzet = async () => {
    await page.evaluate(() => { devDicktator('slachter_mid'); });
    for (let i = 0; i < 40; i++) { if (await page.evaluate(() => document.body.dataset.scherm === 'gevecht' && !!S.gevecht && !document.querySelector('#baas-intro'))) break; await slaap(400); }
    await slaap(1000);
    await page.evaluate(REST);
    await page.evaluate(([lite, tempo]) => {
      INST.lite = lite; document.body.classList.toggle('lite', lite);
      DICK.tempo = tempo;
      dicktatorRoep('de_griffier'); dicktatorRoep('de_deurwaarder');
    }, [!!s.lite, s.tempo || 1]);
    await slaap(900);
  };

  /* NA DE REGIE. Eerst het rooster van §2 uitzitten (op tempo geschaald), dan wachten tot
     de regie zichzelf sluit (g._regieBezig === null), dan 500ms laten bezinken. Zonder die
     poll meet je bij tempo 1 een willekeurig punt en bij tempo 0,02 een leeg scherm.
     Daarna de spraak-nameting: leeft er nog een plaat, zit zijn --spraak-duur uit en tel
     opnieuw - zo staat in het rapport hoelang hij nog te gaan had. */
  const na = async ms => {
    await slaap(s.tempo ? Math.round(ms * s.tempo) + 500 : ms);
    let wacht = 0;
    while (wacht < 8000) {
      const bezig = await page.evaluate(() => { const g = S.gevecht; return !g ? false : (g._regieBezig != null || !!g.ceremonie); });
      if (!bezig) break;
      await slaap(250); wacht += 250;
    }
    await slaap(500);
    const rest = await page.evaluate(() => window.__rest());
    rest.gezien = await page.evaluate(() => window.__oogst());
    rest.wachtteOpRegie = wacht;
    if (rest.spraak > 0) {
      await slaap(Math.round(rest.spraakDuur) + 400);
      const nog = await page.evaluate(() => document.querySelectorAll('.baas-spraak').length);
      rest.spraakNa = nog;
    } else { rest.spraakNa = 0; }
    return rest;
  };

  const kijk = () => page.evaluate(() => window.__kijkStart());

  const stappen = [];
  if (s.soort === 'skip') {
    await opzet(); await kijk();
    // één klap van boven 66% naar onder 33%: dicktatorFase geeft direct 3 terug
    await page.evaluate(() => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.hp = Math.floor(b.maxHp * 0.20); checkBaasFase(); });
    stappen.push({ naam: 'I -> III (skip)', rest: await na(6400) });
  } else if (s.soort === 'gif') {
    await opzet(); await kijk();
    // de fasegrens valt tijdens de VIJANDBEURT: gif tikt af in de beurtwissel, niet in speelKaart
    await page.evaluate(() => {
      const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator');
      b.hp = Math.floor(b.maxHp * 0.68);
      geefStatus(b, 'gif', 30, true);
      eindBeurt();
    });
    stappen.push({ naam: 'gif tijdens de vijandbeurt', rest: await na(8000) });
  } else if (s.soort === 'hofvol') {
    await opzet();
    await page.evaluate(() => { dicktatorRoep('de_aanklager'); });   // boss + 3 hovelingen = 4 levenden -> dicktatorRoep geeft vanaf nu null
    await slaap(700);
    const vol = await page.evaluate(() => ({ levend: S.gevecht.vijanden.filter(v => !v.dood).length, roep: dicktatorRoep('de_claqueur', { hp: 16 }) === null }));
    stappen.push({ naam: 'controle: ' + vol.levend + ' levenden, dicktatorRoep geeft ' + (vol.roep ? 'null' : 'GEEN null'), rest: null, vol });
    await kijk();
    await page.evaluate(() => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.fase = 2; b.hp = Math.floor(b.maxHp * 0.30); checkBaasFase(); });
    stappen.push({ naam: 'II -> III met een vol hof', rest: await na(6400) });
  } else {
    await opzet(); await kijk();
    await page.evaluate(() => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.hp = Math.floor(b.maxHp * 0.50); checkBaasFase(); });
    stappen.push({ naam: 'I -> II · HET PROCES', rest: await na(5200) });
    await opzet(); await kijk();
    await page.evaluate(() => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.fase = 2; b.hp = Math.floor(b.maxHp * 0.30); checkBaasFase(); });
    stappen.push({ naam: 'II -> III · DE TIRADE', rest: await na(6400) });
    await opzet(); await kijk();
    await page.evaluate(() => { const b = S.gevecht.vijanden.find(v => v.id === 'de_dicktator'); b.fase = 3; b.hp = 6; verliesHp(b, 30); });
    stappen.push({ naam: 'IV · DE HERVERKIEZING', rest: await na(8200) });
  }
  await page.screenshot({ path: path.join(UIT, 'c3-' + s.n.split(' ')[0] + '.png') });
  await ctx.close();
  return { stappen, fouten, mist };
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const alles = {};
  for (const s of SCENARIOS) {
    console.log('\n======== ' + s.n + ' ========');
    const r = await draai(browser, s);
    alles[s.n] = r;
    r.stappen.forEach(st => {
      if (!st.rest) { console.log('   ' + st.naam); return; }
      const x = st.rest;
      console.log('   ' + st.naam.padEnd(30) + ' fase=' + x.fase + ' hp=' + x.hp + ' herrezen=' + x.herrezen + ' bedrijf="' + x.bedrijf + '" levend=[' + x.levend + ']');
      console.log('      rest: .vonnis=' + x.vonnis + ' .tik-flits=' + x.tikFlits + ' doek.aan=' + x.doekAan + '(opacity ' + x.doekOpacity + ')'
        + ' .hitstop=' + x.hitstop + ' .slowmo=' + x.slowmo + ' .goud-flits=' + x.goudFlits + ' .toneelschok=' + x.schok);
      console.log('      rest: body.ceremonie=' + x.bodyCeremonie + ' g.ceremonie=' + x.ceremonie + ' g._regieBezig=' + x.regieBezig
        + ' b._bbToon=' + x.bbToon + ' eindbeurt.disabled=' + x.eindDisabled
        + ' figuurklassen=[' + x.figuurKlassen.join(',') + '] plaatklassen=[' + x.plaatKlassen.join(',') + ']'
        + ' BLIJFT: plaat-vast=[' + x.plaatVast.join(',') + ']');
      console.log('      spraak: ' + x.spraak + ' plaat(en) direct na afloop, --spraak-duur ' + x.spraakDuur + 'ms -> na die duur nog ' + x.spraakNa
        + '   (gewacht op de regie: ' + x.wachtteOpRegie + 'ms)');
      console.log('      ONDERWEG gezien: doek tot opacity ' + x.gezien.doekMax + ' (--doek standen ' + (x.gezien.doekStanden.join('/') || '-') + '), 2D-poses ' + (x.gezien.poses.join(' ') || '-')
        + ', Vista ' + (x.gezien.vista.join(' ') || '-'));
      console.log('                       ' + (x.gezien.klassen.join(' ') || '(NIETS - de regie speelde niet)'));
    });
    if (r.fouten.length) console.log('   FOUTEN: ' + r.fouten.slice(0, 5).join('\n           '));
    if (r.mist.length) console.log('   404: ' + [...new Set(r.mist)].slice(0, 5).join(', '));
  }
  fs.writeFileSync(path.join(UIT, 'c3-matrix.json'), JSON.stringify(alles, null, 1));

  console.log('\n======== C3 · oordeel per scenario ========');
  Object.keys(alles).forEach(n => {
    const r = alles[n];
    const metRest = r.stappen.filter(y => y.rest);
    const rest = [];
    metRest.forEach(st => {
      const x = st.rest, s = st.naam;
      if (x.vonnis) rest.push(s + ': ' + x.vonnis + 'x .vonnis');
      if (x.tikFlits) rest.push(s + ': ' + x.tikFlits + 'x .tik-flits');
      if (x.doekAan) rest.push(s + ': #toneel-doek.aan (opacity ' + x.doekOpacity + ')');
      if (x.hitstop) rest.push(s + ': .hitstop');
      if (x.slowmo) rest.push(s + ': .slowmo');
      if (x.goudFlits) rest.push(s + ': .goud-flits');
      if (x.schok) rest.push(s + ': .toneelschok');
      if (x.bodyCeremonie) rest.push(s + ': body.ceremonie');
      if (x.ceremonie) rest.push(s + ': g.ceremonie');
      if (x.regieBezig !== null) rest.push(s + ': g._regieBezig=' + x.regieBezig);
      if (x.bbToon !== null && x.bbToon !== '(geen baas)') rest.push(s + ': b._bbToon=' + x.bbToon + ' (bazenbalk blijft bevroren)');
      if (x.eindDisabled) rest.push(s + ': eindbeurt-knop blijft disabled');
      if (x.figuurKlassen.length) rest.push(s + ': figuurklassen ' + x.figuurKlassen.join(','));
      if (x.plaatKlassen.length) rest.push(s + ': plaatklassen ' + x.plaatKlassen.join(','));
      /* de spraak mag nog lopen, maar niet zijn eigen duur overleven */
      if (x.spraakNa) rest.push(s + ': ' + x.spraakNa + 'x .baas-spraak OVERLEEFT zijn --spraak-duur van ' + x.spraakDuur + 'ms');
    });
    const spraakInfo = metRest.map(st => st.rest.spraak + '@' + st.rest.spraakDuur + 'ms->' + st.rest.spraakNa).join(' , ');
    t(rest.length === 0, n + ' - niets blijft hangen na afloop' + (rest.length ? ':\n        ' + rest.join('\n        ')
      : ' (' + metRest.length + ' overgang(en) gemeten; lopende .baas-spraak ' + spraakInfo + ')'));
    t(r.fouten.length === 0, n + ' - console-/paginafouten: ' + (r.fouten.length ? r.fouten.slice(0, 3).join(' | ') : 'geen'));
  });

  /* DE REGIE MOET OOK ECHT GESPEELD HEBBEN. "Niets blijft hangen" is in een spoor waar de
     hele regie stilvalt per definitie waar - deze controle sluit dat gat. Scenario 7
     (tempo 0.02) valt er bewust buiten: de hele overgang duurt daar ~140ms en een sampler
     van 80ms mist dan beats; dat scenario wordt op zijn EINDstand beoordeeld. */
  console.log('\n======== C3 · speelde de regie ook echt? (sampler 80 ms) ========');
  const MOET = ['g.ceremonie', 'body.ceremonie', '#toneel-doek.aan', '.vonnis', '.tik-flits', '.vijand.baas-tik', '#strijdveld.toneelschok'];
  Object.keys(alles).forEach(n => {
    if (/tempo = 0.02/.test(n)) return;
    const metRest = alles[n].stappen.filter(y => y.rest);
    const mankeert = [];
    metRest.forEach(st => {
      const k = st.rest.gezien.klassen;
      const weg = MOET.filter(m => !k.includes(m));
      if (weg.length) mankeert.push(st.naam + ': ' + weg.join(' '));
    });
    const doeken = metRest.map(st => st.rest.gezien.doekMax).join(' / ');
    t(mankeert.length === 0, n + ' - elke overgang toonde ceremonie, doek, vonnis, tik-flits, baas-tik en schok (doek tot ' + doeken + ')'
      + (mankeert.length ? ':\n        MANKEERT ' + mankeert.join('\n        MANKEERT ') : ''));
  });

  // scenario-eigen controles
  const skip = alles['8 · fase-skip >66% -> <33% (bedrijf II overgeslagen)'].stappen[0].rest;
  t(skip.fase === 3 && skip.bedrijf === '3', `8 · het vangnet: fase ${skip.fase}, data-bedrijf "${skip.bedrijf}", body.tirade=${skip.tirade} (bedrijf II is overgeslagen, de zaal staat NIET meer op DE ZITTING)`);
  const gif = alles['9 · fasegrens tijdens de VIJANDBEURT (gif)'].stappen[0].rest;
  t(gif.fase >= 2 && !gif.ceremonie, `9 · gif tijdens de vijandbeurt: fase ${gif.fase}, hp ${gif.hp}, ceremonie na afloop ${gif.ceremonie}, bedrijf "${gif.bedrijf}" (A6: beginSpelerBeurt heft de verse ceremonie niet meer in dezelfde tick op)`);
  const hv = alles['10 · hof al vol (dicktatorRoep geeft null)'];
  t(hv.stappen[0].vol.levend === 4 && hv.stappen[0].vol.roep === true, `10 · ${hv.stappen[0].vol.levend} levenden -> dicktatorRoep('de_claqueur') geeft null: ${hv.stappen[0].vol.roep}`);
  const tempo = alles['7 · DICK.tempo = 0.02 (balansharnas)'].stappen;
  t(tempo.every(s => !s.rest || (!s.rest.ceremonie && !s.rest.doekAan)), `7 · bij tempo 0.02 loopt elke overgang helemaal af: ceremonie/doek na afloop ${tempo.map(s => s.rest ? (s.rest.ceremonie + '/' + s.rest.doekAan) : '-').join(' , ')}`);
  /* 3D: pose2D swapt daar de 2D-img niet (de sprite is van Vista), dus de figuurbeats zijn
     alleen zichtbaar als Vista-aanroepen. §4.3 belooft raak/pose/sterf/schud/zetLicht. */
  const d3 = alles['4 · 3D / Vista'].stappen.filter(s => s.rest);
  const d3v = d3.map(s => s.rest.gezien.vista.join('+') || '(NIETS)');
  t(d3.length === 3 && d3.every(s => ['pose=', 'raak=', 'schud='].every(m => s.rest.gezien.vista.some(x => x.startsWith(m)))),
    `4 · 3D: ${d3.length} overgangen, bedrijven ${d3.map(s => '"' + s.rest.bedrijf + '"').join(' ')}; Vista-aanroepen per overgang: ${d3v.join('  |  ')}`);

  /* keuze §9.2: doek IV 92% op laptop, 80% op mobiel. De inline --doek is in beide sporen
     dezelfde waarde; mobiel.css topt hem af met min(), dus het verschil zit in de GEMETEN
     opacity, niet in wat JS zet. */
  const lapIV = alles['1 · laptop 2D'].stappen.filter(s => s.rest)[2].rest.gezien;
  const mobIV = alles['5 · mobiel staand'].stappen.filter(s => s.rest)[2].rest.gezien;
  t(lapIV.doekMax >= 0.85, `IV laptop: --doek standen [${lapIV.doekStanden.join(' ')}], diepste GEMETEN opacity ${lapIV.doekMax} (eis >= .85, regieblad 92%)`);
  t(mobIV.doekMax <= 0.82 && mobIV.doekMax >= 0.7, `IV mobiel staand: --doek standen [${mobIV.doekStanden.join(' ')}] (dezelfde inline waarde), diepste GEMETEN opacity ${mobIV.doekMax} (eis <= .82, keuze 9.2: 80%)`);
  const lapIII = alles['1 · laptop 2D'].stappen.filter(s => s.rest)[1].rest;
  t(lapIII.plaatVast.length > 0 && /1\.06/.test(lapIII.plaatVast.join(' ')), `III laptop: de camerakruip BLIJFT staan als .plaat-vast -> [${lapIII.plaatVast.join(', ')}] (regieblad §2.2 t=2600: scale 1.06, forwards)`);

  /* ======== scenario 11: de twee bestaande toneel-suites moeten GROEN blijven ========
     SLAYIT_SUITES=0 slaat ze over (dan draai je ze zelf naast dit script - handig omdat de
     matrix + de suites samen ruim tien minuten kosten). */
  console.log('\n======== 11 · de twee toneel-acceptatiesuites tegen de drama-worktree ========');
  for (const suite of (process.env.SLAYIT_SUITES === '0' ? [] : ['toneel_acceptatie.js', 'toneel3d_acceptatie.js'])) {
    let uit = '', code = 0;
    try {
      uit = execFileSync(process.execPath, [path.join(WT, 'tools', suite)], {
        cwd: __dirname, encoding: 'utf8', maxBuffer: 40 * 1024 * 1024,
        env: Object.assign({}, process.env, { NODE_PATH: path.join(__dirname, 'node_modules'), SLAYIT_WORKTREE: WT, SLAYIT_SHOTS: path.join(UIT, suite.replace('.js', '')) })
      });
    } catch (e) { uit = (e.stdout || '') + (e.stderr || ''); code = e.status === undefined ? -1 : e.status; }
    const staart = uit.trim().split('\n').slice(-4).join('\n        ');
    fs.writeFileSync(path.join(UIT, 'c3-' + suite.replace('.js', '') + '.txt'), uit);
    t(code === 0, suite + ' exitcode ' + code + '\n        ' + staart);
  }

  console.log('\n======== TOTAAL ========');
  console.log('   ' + okN + ' ok, ' + foutN + ' FOUT   (json+shots in ' + UIT + ')');
  await browser.close();
  process.exit(foutN ? 1 : 0);
})();
