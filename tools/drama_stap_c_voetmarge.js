// STAP C4 (v120) - de VOETMARGE-scan als acceptatietest: wijkt de GRONDLIJN bij een
// pose-wissel minder dan 1% van de viewporthoogte af, in 2D EN in 3D?
//
// Methode (dezelfde in beide sporen, en volledig onafhankelijk van de tabel):
//   1. de alfa-marge van de ECHTE plaat wordt in de pagina gemeten (canvas, drempel
//      10/255) - dus niet uit js/art.js overgenomen;
//   2. 2D: geschilderde voetlijn = imgRect.bottom - alfa% * imgRect.height. imgRect
//      draagt de --voetc-translate al, dus dit IS wat je ziet;
//      3D: afwijking_px = (alfa - marge_in_gebruik) * (voetY - topY) / (1 - margeBasis).
//      De schaal van de sprite valt uit die breuk weg (voetY-topY spant
//      schaal*(1-margeBasis) wereld-eenheden), dus er is geen enkele interne waarde
//      nodig behalve wat Vista.schermPos/voetMeting al publiek geven;
//   3. de POSE-WISSEL is het verschil tussen de pose en de basisplaat van hetzelfde
//      figuur - precies de sprong die de speler ziet.
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const WT = process.env.SLAYIT_WORKTREE || 'C:/Users/Thomas Aelbrecht/Desktop/Workspace/SLAY-IT-drama';
const HOST = 'localhost:4184';
const UIT = process.env.SLAYIT_SHOTS || path.join(__dirname, 'drama_c_shots'); fs.mkdirSync(UIT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));
let okN = 0, foutN = 0;
const t = (goed, tekst) => { if (goed) { okN++; console.log('   ok   ' + tekst); } else { foutN++; console.log('   FOUT ' + tekst); } };

const FIGUREN = [
  { id: 'de_dicktator', poses: ['hit', 'death', 'cast', 'attack', 'herkozen', 'factuur'] },
  { id: 'de_griffier', poses: ['cast', 'death', 'hit'] },
  { id: 'de_deurwaarder', poses: ['attack', 'death', 'hit'] },
  { id: 'de_claqueur', poses: ['attack', 'death', 'hit'] }
];
/* scene3d.js (r376) laadt maar NEGEN state-texturen per acteur. 'herkozen' en 'factuur'
   zitten daar niet bij: in 3D toont de sprite voor die twee gewoon de basisplaat, dus er
   valt daar ook geen voetlijn te verspringen. (Bestaand gedrag sinds v109/v117 - de regie
   weet dat en gebruikt in 3D bewust Vista.pose(doel,'cast') bij DE HERRIJZENIS.) */
const STATES_3D = ['attack', 'hit', 'death', 'poison', 'gif', 'block', 'victory', 'cast', 'wounded'];

// ---- gedeelde hulpjes die in de pagina worden geinstalleerd ----
const HULP = `window.__alfaCache = {};
window.__alfa = async function (url) {
  if (window.__alfaCache[url] !== undefined) return window.__alfaCache[url];
  const img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = url; });
  if (!img || !img.naturalHeight) { window.__alfaCache[url] = null; return null; }
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let uit = null;
  for (let y = c.height - 1; y >= 0 && uit === null; y--) {
    for (let px = 0; px < c.width; px++) { if (d[(y * c.width + px) * 4 + 3] > 10) { uit = (c.height - 1 - y) / c.height * 100; break; } }
  }
  window.__alfaCache[url] = uit; return uit;
};
window.__url = function (id, st) {
  const vol = st ? id + '_' + st : id;
  const echt = window.artTerugval ? artTerugval(vol) : vol;
  return 'assets/karakters/' + echt + '.webp';
};`;

async function opzet(browser, d3) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
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
  await page.reload({ waitUntil: 'load' }); await slaap(600);
  await page.evaluate(v => { INST.d3 = v; INST.lite = false; document.body.classList.remove('lite'); try { bewaarInst(); } catch (e) {} try { toonHeldKeuze(); } catch (e) {} }, d3);
  await slaap(300);
  await page.evaluate(() => { const k = document.querySelector('.held-kies'); if (k) k.click(); }); await slaap(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /toch beginnen/i.test(x.textContent)); if (b) b.click(); }); await slaap(800);
  await page.evaluate(() => { devDicktator('slachter_mid'); });
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => document.body.dataset.scherm === 'gevecht' && !!S.gevecht && !document.querySelector('#baas-intro'))) break; await slaap(400); }
  await slaap(1200);
  await page.evaluate(() => { dicktatorRoep('de_griffier'); dicktatorRoep('de_deurwaarder'); dicktatorRoep('de_claqueur', { hp: 16 }); });
  await slaap(1600);
  await page.evaluate(HULP);
  return { ctx, page, fouten };
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const rapport = { '2D': {}, '3D': {} };

  /* ============================ 2D ============================ */
  console.log('\n======== 2D (laptop 1440x900) ========');
  {
    const { ctx, page, fouten } = await opzet(browser, false);
    // alle poses voorladen zodat de te-laat-guard van pose2D (r2506) niets wegdrukt
    await page.evaluate(() => { try { preloadPoses2D(S.gevecht); } catch (e) {} });
    await slaap(2500);
    for (const fig of FIGUREN) {
      const r = await page.evaluate(async ([id, poses]) => {
        const wacht = ms => new Promise(r2 => setTimeout(r2, ms));
        const g = S.gevecht;
        const v = g.vijanden.find(x => x.id === id);
        if (!v) return { id, fout: 'niet in het gevecht' };
        const i = g.vijanden.indexOf(v);
        const art = GDOM.vijanden[i].wrap.querySelector('.vijand-art');
        const img = art.querySelector('img');
        if (!img) return { id, fout: 'geen <img> (emoji-terugval)' };
        const vm = window.VOETMARGE || {};
        const basisSleutel = window.artTerugval ? artTerugval(id) : id;
        const naarBasis = async () => {
          await new Promise(r2 => laadKarakterAfbeelding(id, im => { if (im) img.src = im.src; r2(); }));
          if (vm[basisSleutel] != null) art.style.setProperty('--voetc', vm[basisSleutel] + '%'); else art.style.removeProperty('--voetc');
          await wacht(220);
        };
        const meet = async () => {
          const rc = img.getBoundingClientRect();
          const url = img.currentSrc || img.src;
          const a = await window.__alfa(url);
          return { bestand: url.split('/').pop(), alfa: a, hoogte: rc.height,
            voetY: a === null ? null : rc.bottom - (a / 100) * rc.height,
            voetc: getComputedStyle(art).getPropertyValue('--voetc').trim() || '(geen)' };
        };
        const uit = { id, vh: window.innerHeight, poses: [] };
        await naarBasis();
        uit.basis = await meet();
        for (const st of poses) {
          await naarBasis();
          pose2D(v, st, 8);
          await wacht(700);
          const m = await meet();
          m.pose = st;
          m.tabel = (vm[(window.artTerugval ? artTerugval(id + '_' + st) : id + '_' + st)] != null)
            ? vm[window.artTerugval ? artTerugval(id + '_' + st) : id + '_' + st] : null;
          m.gewisseld = m.bestand.indexOf('_' + st) >= 0;
          uit.poses.push(m);
        }
        await naarBasis();
        return uit;
      }, [fig.id, fig.poses]);
      rapport['2D'][fig.id] = r;
      if (r.fout) { console.log('   ' + fig.id + ': ' + r.fout); continue; }
      console.log('   ' + fig.id.padEnd(16) + ' basis "' + r.basis.bestand + '"  alfa ' + r.basis.alfa.toFixed(2) + '%  --voetc ' + r.basis.voetc + '  voetlijn y=' + r.basis.voetY.toFixed(1) + 'px');
      r.poses.forEach(p => {
        const d = p.voetY - r.basis.voetY;
        p.dPx = d; p.dVh = d / r.vh * 100;
        console.log('      ' + (p.pose + '').padEnd(9) + ' "' + p.bestand.padEnd(26) + '" alfa ' + (p.alfa === null ? ' n/b ' : p.alfa.toFixed(2) + '%')
          + '  tabel ' + (p.tabel === null ? ' geen ' : String(p.tabel).padStart(5)) + '  --voetc ' + (p.voetc + '').padEnd(6)
          + '  voetlijn y=' + p.voetY.toFixed(1) + 'px  afwijking ' + (d >= 0 ? '+' : '') + d.toFixed(2) + 'px = ' + (p.dVh >= 0 ? '+' : '') + p.dVh.toFixed(3) + '% vh'
          + (p.gewisseld ? '' : '   <-- PLAAT NIET GEWISSELD'));
      });
      rapport['2D'][fig.id].fouten = fouten.slice();
    }
    await page.screenshot({ path: path.join(UIT, 'c4-2d.png') });
    rapport['2D'].__fouten = fouten;
    await ctx.close();
  }

  /* ============================ 3D ============================ */
  console.log('\n======== 3D (Vista, swiftshader) ========');
  {
    const { ctx, page, fouten } = await opzet(browser, true);
    const d3 = await page.evaluate(() => !!(window.Vista && Vista.klaar && d3Actief()));
    console.log('   Vista actief: ' + d3);
    if (d3) {
      for (const fig of FIGUREN) {
        const buiten3d = fig.poses.filter(p => STATES_3D.indexOf(p) < 0);
        if (buiten3d.length) console.log('   ' + fig.id + ': ' + buiten3d.join(', ') + ' worden in 3D NIET als textuur geladen (scene3d r376) - de sprite houdt daar de basisplaat, dus geen voetlijn-risico');
        const r = await page.evaluate(async ([id, poses]) => {
          const wacht = ms => new Promise(r2 => setTimeout(r2, ms));
          const g = S.gevecht;
          const v = g.vijanden.find(x => x.id === id);
          if (!v) return { id, fout: 'niet in het gevecht' };
          const vm = window.VOETMARGE || {};
          const basisSleutel = window.artTerugval ? artTerugval(id) : id;
          const margeBasis = (vm[basisSleutel] != null ? vm[basisSleutel] : 0) / 100;
          const sp = Vista.schermPos(v);
          if (!sp) return { id, fout: 'geen sprite in Vista' };
          const spanPx = sp.voetY - sp.topY;                 /* = schaal * (1 - margeBasis) in schermpixels */
          const regel = async st => {
            if (st) { Vista.pose(v, st, 8); await wacht(500); } else { await wacht(500); }
            const m = (Vista.voetMeting() || []).find(x => x.wie === id) || {};
            const url = window.__url(id, st);
            const a = await window.__alfa(url);
            /* De afwijking van de GESCHILDERDE voet t.o.v. de voetlijn waar Vista hem plaatst.
               In wereldcoordinaten: voet = VOET_WERELD_Y + (alfa - marge) * schaal. Op het
               SCHERM wijst y omlaag, dus het teken keert om - en dan leest deze kolom exact
               zoals de 2D-kolom: + = de voet landt LAGER in beeld (in de vloer), - = hij zweeft. */
            const dev = (a === null || m.marge == null) ? null : (m.marge - a / 100) * spanPx / (1 - margeBasis);
            return { pose: st || '(basis)', bestand: url.split('/').pop(), alfa: a, margeInGebruik: m.marge,
              devPx: dev, devVh: dev === null ? null : dev / window.innerHeight * 100,
              tabel: vm[window.artTerugval ? artTerugval(id + '_' + st) : id + '_' + st] };
          };
          const uit = { id, vh: window.innerHeight, spanPx, margeBasis, poses: [] };
          uit.basis = await regel(null);
          for (const st of poses) { uit.poses.push(await regel(st)); await wacht(300); }
          return uit;
        }, [fig.id, fig.poses]);
        rapport['3D'][fig.id] = r;
        if (r.fout) { console.log('   ' + fig.id + ': ' + r.fout); continue; }
        console.log('   ' + fig.id.padEnd(16) + ' sprite-span ' + r.spanPx.toFixed(1) + 'px  basisplaat alfa ' + (r.basis.alfa === null ? 'n/b' : r.basis.alfa.toFixed(2) + '%')
          + '  marge in gebruik ' + r.basis.margeInGebruik + '  afwijking ' + (r.basis.devPx === null ? 'n/b' : r.basis.devPx.toFixed(2) + 'px = ' + r.basis.devVh.toFixed(3) + '% vh'));
        r.poses.forEach(p => {
          p.in3d = STATES_3D.indexOf(p.pose) >= 0;
          p.dVh = (p.devVh === null || r.basis.devVh === null || !p.in3d) ? null : p.devVh - r.basis.devVh;
          console.log('      ' + p.pose.padEnd(9) + ' "' + p.bestand.padEnd(26) + '" alfa ' + (p.alfa === null ? ' n/b ' : p.alfa.toFixed(2) + '%')
            + '  marge in gebruik ' + String(p.margeInGebruik).padStart(6)
            + (p.in3d
              ? ('  afwijking ' + (p.devPx === null ? 'n/b' : (p.devPx >= 0 ? '+' : '') + p.devPx.toFixed(2) + 'px')
                + '  pose-wissel ' + (p.dVh === null ? 'n/b' : (p.dVh >= 0 ? '+' : '') + p.dVh.toFixed(3) + '% vh')
                + (p.margeInGebruik === r.basis.margeInGebruik && p.tabel != null ? '   <-- TABELWAARDE NIET GEBRUIKT' : ''))
              : '   (geen 3D-textuur: de sprite toont hier de basisplaat)'));
        });
      }
      await page.screenshot({ path: path.join(UIT, 'c4-3d.png') });
    }
    rapport['3D'].__fouten = fouten;
    await ctx.close();
  }

  fs.writeFileSync(path.join(UIT, 'c4-voetmarge.json'), JSON.stringify(rapport, null, 1));

  /* ============================ oordeel ============================ */
  console.log('\n======== C4 · oordeel: grondlijn-afwijking per pose-wissel < 1 % vh ========');
  for (const spoor of ['2D', '3D']) {
    const R = rapport[spoor];
    const rijen = [];
    Object.keys(R).forEach(id => {
      const f = R[id]; if (!f || !f.poses) return;
      f.poses.forEach(p => { const d = (spoor === '2D') ? p.dVh : p.dVh; if (d !== null && d !== undefined) rijen.push({ id, pose: p.pose, d }); });
    });
    if (!rijen.length) { t(false, spoor + ': geen enkele meting gelukt'); continue; }
    const ergste = rijen.reduce((a, r) => Math.abs(r.d) > Math.abs(a.d) ? r : a, rijen[0]);
    t(Math.abs(ergste.d) < 1, `${spoor}: ${rijen.length} pose-wissels gemeten, GROOTSTE grondlijn-afwijking ${ergste.d >= 0 ? '+' : ''}${ergste.d.toFixed(3)} % vh (${ergste.id} -> ${ergste.pose}); eis < 1 %`);
    const boven = rijen.filter(r => Math.abs(r.d) >= 0.5).map(r => `${r.id}_${r.pose} ${r.d.toFixed(3)}%`);
    console.log('        ' + (boven.length ? 'boven 0,5 % vh: ' + boven.join(', ') : 'geen enkele wissel komt zelfs boven 0,5 % vh'));
  }
  // werd elke plaat ook echt gewisseld in 2D?
  const nietGewisseld = [];
  Object.keys(rapport['2D']).forEach(id => { const f = rapport['2D'][id]; if (f && f.poses) f.poses.forEach(p => { if (!p.gewisseld) nietGewisseld.push(id + '_' + p.pose + ' (toonde "' + p.bestand + '")'); }); });
  t(nietGewisseld.length === 0, nietGewisseld.length ? '2D: deze poses toonden hun eigen plaat NIET: ' + nietGewisseld.join(', ') : '2D: alle 15 poses toonden hun eigen plaat (geen terugval, geen te-laat-guard die wegdrukte)');
  // gebruikt 3D de nieuwe tabelregels echt?
  const drie = rapport['3D'];
  const nieuw = [['de_dicktator', 'herkozen', 0.009], ['de_griffier', 'death', 0.026], ['de_claqueur', 'death', 0.035]];
  nieuw.forEach(([id, st, verwacht]) => {
    const f = drie[id]; const p = f && f.poses && f.poses.find(x => x.pose === st);
    if (!p) return;
    if (!p.in3d) { console.log('        3D: ' + id + '_' + st + ' heeft geen 3D-textuur (scene3d r376 laadt ' + STATES_3D.join('/') + ') - de sprite houdt de basisplaat, dus de tabelregel is daar per definitie niet in gebruik en er is geen voetlijn-risico'); return; }
    t(Math.abs((p.margeInGebruik || 0) - verwacht) < 0.0005, `3D leest de nieuwe tabelregel ${id}_${st}: marge in gebruik ${p.margeInGebruik} (tabel ${p.tabel}%)`);
  });
  const alleFouten = (rapport['2D'].__fouten || []).concat(rapport['3D'].__fouten || []);
  t(alleFouten.length === 0, alleFouten.length ? 'paginafouten: ' + alleFouten.slice(0, 5).join(' | ') : 'geen paginafouten in 2D noch 3D');

  console.log('\n======== TOTAAL ========');
  console.log('   ' + okN + ' ok, ' + foutN + ' FOUT   (json+shots in ' + UIT + ')');
  await browser.close();
  process.exit(foutN ? 1 : 0);
})();
