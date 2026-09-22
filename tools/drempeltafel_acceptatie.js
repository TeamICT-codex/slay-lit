/* ============================================================================
   DE DREMPELTAFEL (v128) — ACCEPTATIESUITE

   Loopt de acceptatie van .claude/notities/drempeltafel_plan.md automatisch af:
   de nissen, de tafel, de vijf spellen (de ÉÉN-WORP-invariant), hervatten na een
   herlaad in elke fase, dubbeltik, de encounter, de uitbetaling van de pot, de
   nederlaag aan de tafel, de daily-gate, de dev-taint, de Act 1-scherfbronnen en
   het mobiele spoor.

   Draaien (Windows, vanuit de map waar `playwright` geïnstalleerd staat):
       NODE_PATH="$PWD/node_modules" \
       SLAYIT_WORKTREE="C:\...\SLAY-IT-drempeltafel" \
       SLAYIT_SHOTS="$PWD/dt_shots" \
       node "C:\...\SLAY-IT-drempeltafel/tools/drempeltafel_acceptatie.js"

   GEEN DEV-SERVER: het script bedient de worktree rechtstreeks vanaf schijf via
   route.fulfill op http://localhost:4173/**. Start daar dus NOOIT een echte
   server op — die zou de route-laag overschaduwen.

   DE KERNCONTROLE IS DE ÉÉN-WORP-INVARIANT. Per spel wordt na dtStartSpel() de
   seed-RNG VERGIFTIGD (Toeval.volgende geeft een vaste waarde die de uitslag zou
   omkeren als ze nog een rol speelde) en tegelijk geteld. Blijft de ZICHTBARE
   uitkomst dan nog steeds gelijk aan de gepersisteerde S.drempeltafel.uitslag,
   dan heeft geen enkel spel zijn eigen afloop gerold — precies wat plan §1 eist.
   De zichtbare uitkomst wordt uit de DOM gelezen op het resolve-moment, door
   window.dtWin/window.dtKnal te onderscheppen (functiedeclaraties in een klassiek
   script staan op window; zet iemand ze ooit om naar const/let, dan breekt deze
   test — niet het spel).
   ============================================================================ */
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');

const WORKTREE = process.env.SLAYIT_WORKTREE ||
  'C:\\Users\\Thomas Aelbrecht\\Desktop\\Workspace\\SLAY-IT-drempeltafel';
const SHOTS = process.env.SLAYIT_SHOTS || path.join(__dirname, 'drempeltafel_shots');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));

let ok = 0, fout = 0;
const rood = [];
const t = (goed, tekst) => { goed ? ok++ : (fout++, rood.push(tekst)); console.log('   ' + (goed ? 'ok   ' : 'FOUT ') + tekst); };
const kop = s => console.log('\n== ' + s + ' ==');

const POEL = ['de_drempelwachter', 'de_verzwolgene', 'steengolem', 'het_origineel'];
const POEL_HP = { de_drempelwachter: 112, de_verzwolgene: 104, steengolem: 94, het_origineel: 104 };
const SPELLEN = ['rad', 'revolver', 'paren', 'hooglaag', 'nissen'];

/* ============================================================
   HARNAS
   ============================================================ */
async function open(browser, o) {
  o = o || {};
  const ctx = await browser.newContext({
    viewport: { width: o.w || 1440, height: o.h || 900 },
    deviceScaleFactor: o.dpr || 1,
    isMobile: !!o.mobiel, hasTouch: !!o.mobiel,
    userAgent: o.mobiel ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' : undefined,
    serviceWorkers: 'block'
  });
  const page = await ctx.newPage();
  page.__f = [];
  page.on('pageerror', e => page.__f.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/rest\/v1|Failed to load resource|supabase/i.test(m.text())) page.__f.push('console: ' + m.text()); });
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url());
    if (/supabase\.co/i.test(u.host) || /\/rest\/v1\//.test(u.pathname)) return route.abort();
    if (u.host !== 'localhost:4173') return route.abort();
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
    const f = path.join(WORKTREE, rel.split('/').join(path.sep));
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) return route.fulfill({ status: 404, body: 'weg' });
    return route.fulfill({ status: 200, contentType: MIME[path.extname(rel).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('slayit_wipe', '1'); localStorage.setItem('slayit_nudge', 'weg'); localStorage.setItem('slayit_nudge_v2', 'weg'); localStorage.setItem('slayit_wereld', '0'); });
  await page.reload({ waitUntil: 'load' }); await slaap(600);
  await page.evaluate(() => { INST.d3 = false; });
  await page.evaluate(() => { try { toonHeldKeuze(); } catch (e) {} }); await slaap(250);
  await page.evaluate(() => { const k = document.querySelector('.held-kies'); if (k) k.click(); }); await slaap(250);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /toch beginnen/i.test(x.textContent)); if (b) b.click(); }); await slaap(1200);
  await spionnen(page, !o.traag);
  return { ctx, page };
}

/* de spionnen + de snelmodus. Moet ná ELKE herlaad opnieuw: het zijn gewone
   window-eigenschappen, geen init-script (die zou vóór game.js draaien). */
async function spionnen(page, lite) {
  await page.evaluate(l => {
    if (l) document.body.classList.add('lite');   /* dtStil() -> directe resultaten, 30 rondes blijven betaalbaar */
    else document.body.classList.remove('lite');

    window.__dt = () => (typeof _dt !== 'undefined' ? _dt : null);
    window.__hlGok = true;

    /* DE ZICHTBARE UITKOMST — uit de DOM, niet uit de state. Per spel precies het
       beeld dat de speler op dat moment ziet. */
    window.__zichtbaar = function () {
      const d = window.__dt(); const s = d && d.spelState;
      if (!s) return null;
      if (s.spel === 'rad') {
        const tk = document.getElementById('dt-radteken'), fl = document.getElementById('dt-radflits');
        if (!tk || !fl) return null;
        if (fl.classList.contains('winst') && tk.textContent === '✦') return true;
        if (fl.classList.contains('knal') && tk.textContent === '✖') return false;
        return null;
      }
      if (s.spel === 'revolver') {
        if (document.querySelector('.dt-kamer.raak')) return false;
        return document.querySelectorAll('.dt-kamer.leeg-getrokken').length >= 2 ? true : null;
      }
      if (s.spel === 'paren') {
        if (document.querySelector('.dt-tegel.as')) return false;
        return document.querySelectorAll('.dt-tegel.weg').length >= 4 ? true : null;
      }
      if (s.spel === 'hooglaag') {
        const uw = parseInt((document.getElementById('dt-hl-uwwaarde') || {}).textContent, 10);
        const bank = parseInt((document.getElementById('dt-hl-bankwaarde') || {}).textContent, 10);
        if (!isFinite(uw) || !isFinite(bank)) return null;
        const goed = ((uw > bank) === !!window.__hlGok);
        if (!goed) return false;
        return s.reeks >= 2 ? true : null;
      }
      if (s.spel === 'nissen') {
        const gek = document.querySelector('.dt-gok-nis.gekozen');
        if (!gek) return null;
        return gek.classList.contains('gift');
      }
      return null;
    };

    /* dtWin/dtKnal onderscheppen: het EERSTE effectieve resolve-moment bewaren en
       alle aanroepen tellen (voor de dubbeltik-proef). */
    window.__resetResolve = function () { window.__resolve = null; window.__resolveTel = 0; window.__resolveEff = 0; };
    window.__resetResolve();
    if (!window.__resolveGehaakt) {
      window.__resolveGehaakt = true;
      const win0 = window.dtWin, knal0 = window.dtKnal;
      window.dtWin = function () {
        window.__resolveTel++;
        const d = window.__dt();
        if (d && (S.drempeltafel || {}).fase === 'spel') { window.__resolveEff++; if (!window.__resolve) window.__resolve = { soort: 'win', zichtbaar: window.__zichtbaar() }; }
        return win0.apply(this, arguments);
      };
      window.dtKnal = function () {
        window.__resolveTel++;
        const d = window.__dt();
        if (d && (S.drempeltafel || {}).fase === 'spel') { window.__resolveEff++; if (!window.__resolve) window.__resolve = { soort: 'knal', zichtbaar: window.__zichtbaar() }; }
        return knal0.apply(this, arguments);
      };
    }

    /* de RNG-vergiftiging: Toeval.volgende is een gewone, schrijfbare eigenschap. */
    window.__rngAan = function (waarde) {
      if (!window.__rngOrig) window.__rngOrig = Toeval.volgende;
      window.__rngTel = 0;
      Toeval.volgende = function () { window.__rngTel++; return waarde; };
    };
    window.__rngUit = function () { if (window.__rngOrig) { Toeval.volgende = window.__rngOrig; window.__rngOrig = null; } return window.__rngTel || 0; };
  }, !!lite);
}

async function wachtOp(page, fn, arg, ms) {
  const eind = Date.now() + (ms || 9000);
  while (Date.now() < eind) {
    if (await page.evaluate(fn, arg)) return true;
    await slaap(160);
  }
  return false;
}

/* sluit elke openstaande reveal-ceremonie (anders blijft naReveals pollen) */
async function sluitReveals(page, rondes) {
  for (let i = 0; i < (rondes || 8); i++) {
    const weg = await page.evaluate(() => {
      document.querySelectorAll('.scherf-reveal-sluit, .rr-sluit, .kaart-reveal-overlay .knop-stil, .vloek-reveal-overlay .knop-stil').forEach(b => b.click());
      return !document.querySelector('.scherf-reveal-overlay, .vloek-reveal-overlay, .kaart-reveal-overlay, .relikwie-reveal-overlay');
    });
    if (weg) return true;
    await slaap(350);
  }
  return page.evaluate(() => !document.querySelector('.scherf-reveal-overlay, .vloek-reveal-overlay, .kaart-reveal-overlay, .relikwie-reveal-overlay'));
}

/* een verse tafel klaarzetten in fase 'tafel' met een gekozen ronde/inzet/spel */
async function zetTafel(page, spel, inzet, ronde, pot) {
  return page.evaluate(([spel, inzet, ronde, pot]) => {
    S.act = 2; S.maxHp = 220; S.hp = 220;
    while (S.dek.length < 10) S.dek.push(nieuweKaart('slag'));
    /* één niet-startrelikwie, zodat dtRelInzetId deterministisch is. Bloedrobijn
       verzet maxHp: zo loopt de heen-en-terugweg van DT_MAXHP_RELIKWIE mee. */
    const relId = (typeof RELIKWIEEN !== 'undefined' && RELIKWIEEN.bloedrobijn && !RELIKWIEEN.bloedrobijn.start)
      ? 'bloedrobijn'
      : Object.keys(RELIKWIEEN).find(id => !RELIKWIEEN[id].start);
    S.relikwieen = [relId];
    S.drempeltafel = dtVerseState();
    const st = S.drempeltafel;
    st.fase = 'tafel'; st.ronde = ronde; st.inzet = inzet; st.spel = spel;
    st.pot = (pot || []).slice();
    toonDrempeltafel();
    const beste = dtBesteKaart();
    return {
      relId, besteUid: beste ? beste.uid : null, besteNaam: beste ? knaam(beste) : null,
      dekUids: S.dek.map(k => k.uid), hp: S.hp, maxHp: S.maxHp, rel: S.relikwieen.slice(),
      inzet: st.inzet, spel: st.spel, pot: st.pot.slice()
    };
  }, [spel, inzet, ronde, pot || []]);
}

/* het spel uitspelen tot de fase niet langer 'spel' is */
async function speelUit(page, spel, stappen) {
  for (let i = 0; i < (stappen || 20); i++) {
    const fase = await page.evaluate(() => (S.drempeltafel || {}).fase);
    if (fase !== 'spel') return true;
    await page.evaluate(sp => {
      if (sp === 'rad' || sp === 'revolver') { const b = document.getElementById('dt-spelactie'); if (b && !b.disabled) b.click(); }
      else if (sp === 'paren') { const el = document.querySelector('#dt-paren .dt-tegel:not(.open):not(.weg)'); if (el) el.click(); }
      else if (sp === 'hooglaag') { const b = document.querySelector('.dt-hl-knop[data-hoog="1"]'); if (b && !b.disabled) b.click(); }
      else if (sp === 'nissen') { const b = document.querySelector('.dt-gok-nis:not([disabled])'); if (b) b.click(); }
    }, spel);
    await slaap(230);
  }
  return (await page.evaluate(() => (S.drempeltafel || {}).fase)) !== 'spel';
}

/* 'Zet in' klikken, eventueel met een geforceerde worp (0 = knal, ~1 = winst) */
async function zetIn(page, gedwongen) {
  await page.evaluate(() => window.__resetResolve());
  if (gedwongen !== undefined) await page.evaluate(w => window.__rngAan(w ? 0.9999999 : 0), gedwongen);
  await page.evaluate(() => { const b = document.querySelector('[data-dt="zet-in"]'); if (b && !b.disabled) b.click(); });
  if (gedwongen !== undefined) await page.evaluate(() => window.__rngUit());
  await slaap(120);
  return page.evaluate(() => ({
    fase: (S.drempeltafel || {}).fase, uitslag: (S.drempeltafel || {}).uitslag,
    inzetData: (S.drempeltafel || {}).inzetData, dekUids: S.dek.map(k => k.uid),
    hp: S.hp, maxHp: S.maxHp, rel: S.relikwieen.slice()
  }));
}

/* ============================================================================
   DE SUITE
   ============================================================================ */
(async () => {
  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();

  /* ==========================================================================
     1 — devDrempeltafel opent de tafel
     ========================================================================== */
  kop('1 · devDrempeltafel opent de tafel op het einde-scherm');
  let { ctx, page } = await open(browser);
  await page.evaluate(() => { devDrempeltafel(); });
  await slaap(600);
  const opening = await page.evaluate(() => ({
    scherm: document.body.dataset.scherm,
    bg: (document.getElementById('scherm-einde') || {}).style ? document.getElementById('scherm-einde').style.backgroundImage : '',
    muziek: Klank.huidigeScene,
    open: !!document.querySelector('#overlay-drempeltafel.open'),
    fase: [...(document.querySelector('.dt-doek') || { classList: [] }).classList].find(c => c.indexOf('dt-fase-') === 0) || null,
    stateFase: (S.drempeltafel || {}).fase,
    taint: !!S._devRun,
    scherven: (S.scherven || []).length,
    kop: (document.querySelector('.dt-kop h2') || {}).textContent || ''
  }));
  t(opening.scherm === 'einde', `de tafel staat op het einde-scherm (gemeten '${opening.scherm}')`);
  t(/achtergronddrempel/.test(opening.bg || ''), 'de poortplaat achtergronddrempel.webp ligt eronder');
  t(opening.muziek === 'stil', `de muziek staat stil (gemeten '${opening.muziek}')`);
  t(opening.open && opening.fase === 'dt-fase-nissen' && opening.stateFase === null,
    `het doek is open in de nissenfase, S.drempeltafel.fase is nog null (niets te hervatten) — gemeten ${opening.fase}/${opening.stateFase}`);
  t(opening.taint === true, 'devDrempeltafel zet de dev-taint S._devRun');
  t(opening.scherven === 3 && /DREMPELTAFEL/.test(opening.kop), 'drie scherven in de tas en de kop leest DE DREMPELTAFEL');
  await page.screenshot({ path: path.join(SHOTS, '01-nissen.png') });

  /* ==========================================================================
     2 — de nissen
     ========================================================================== */
  kop("2 · de nissen: 'Voed' pas bij 3, 'Loop voorbij' bankt en gaat naar de act-overgang");
  const voedStanden = [];
  for (let i = 0; i < 3; i++) {
    voedStanden.push(await page.evaluate(() => ({
      uit: !!(document.querySelector('[data-dt="voed"]') || {}).disabled,
      label: (document.querySelector('[data-dt="voed"]') || {}).textContent || ''
    })));
    await page.evaluate(() => { const b = document.querySelector('[data-dt="nis-plaats"]'); if (b) b.click(); });
    await slaap(140);
  }
  const naDrie = await page.evaluate(() => ({
    uit: !!(document.querySelector('[data-dt="voed"]') || {}).disabled,
    label: (document.querySelector('[data-dt="voed"]') || {}).textContent || '',
    nissen: document.querySelectorAll('.dt-nis.vol').length
  }));
  t(voedStanden.every(v => v.uit === true), `'Voed' staat uit bij 0, 1 en 2 scherven (gemeten ${voedStanden.map(v => v.uit).join('/')})`);
  t(naDrie.uit === false && /3\/3/.test(naDrie.label) && naDrie.nissen === 3, `'Voed' staat aan bij 3/3 — label '${naDrie.label.trim()}'`);
  await page.evaluate(() => { const b = document.querySelector('[data-dt="nis-weg"]'); if (b) b.click(); });
  await slaap(140);
  t(await page.evaluate(() => !!(document.querySelector('[data-dt="voed"]') || {}).disabled),
    "een scherf terugnemen zet 'Voed' meteen weer uit");

  const voorbij = await page.evaluate(() => {
    const stashVoor = (Codex.scherven || []).length;
    const b = document.querySelector('[data-dt="loop-voorbij"]'); if (b) b.click();
    return { stashVoor };
  });
  await slaap(700);
  const naVoorbij = await page.evaluate(() => ({
    scherm: document.body.dataset.scherm,
    html: ($('#scherm-einde') || {}).innerHTML || '',
    gedragen: (S.scherven || []).length,
    stash: (Codex.scherven || []).length,
    fase: (S.drempeltafel || {}).fase,
    doek: !!document.querySelector('#overlay-drempeltafel.open')
  }));
  t(naVoorbij.scherm === 'einde' && /ACT 2/.test(naVoorbij.html) && !naVoorbij.doek,
    "'Loop voorbij' valt door naar toonActOvergang (ACT 2) en sluit het doek");
  t(naVoorbij.gedragen === 0 && naVoorbij.stash === voorbij.stashVoor + 3,
    `de drie scherven zijn veilig gebankt (stash ${voorbij.stashVoor} -> ${naVoorbij.stash})`);
  t(naVoorbij.fase === null, "S.drempeltafel.fase blijft null — een herlaad hierna gaat naar de kaart, niet terug naar de tafel");
  t(page.__f.length === 0, 'geen paginafouten in de nissen' + (page.__f.length ? ': ' + page.__f[0] : ''));
  await ctx.close();

  /* ==========================================================================
     3 — de tafel: kanslabels en de stop-knop
     ========================================================================== */
  kop('3 · de tafel: de kanslabels liegen niet, stoppen kan pas vanaf twee sporten');
  ({ ctx, page } = await open(browser));
  await zetTafel(page, 'rad', 'kaart', 1, []);
  const r1 = await page.evaluate(() => ({
    knal: (document.querySelector('.dt-risico b') || {}).textContent || '',
    labels: [...document.querySelectorAll('.dt-spel em')].map(e => e.textContent),
    stopUit: !!(document.querySelector('[data-dt="stop"]') || {}).disabled,
    stopTekst: (document.querySelector('[data-dt="stop"]') || {}).textContent || ''
  }));
  t(r1.knal === '25%', `ronde 1: 'Kans op knal' toont 25% (gemeten '${r1.knal}')`);
  t(r1.labels.length === 5 && r1.labels.every(l => l === r1.labels[0]), `alle vijf spellen tonen hetzelfde kanslabel: '${r1.labels[0]}'`);
  t(r1.labels[0] === '9/12 · 75 %', `het label is de ECHTE rondekans in twaalfden (gemeten '${r1.labels[0]}')`);
  t(r1.stopUit === true && /niets om te houden/.test(r1.stopTekst), "stoppen staat uit bij pot 0 — 'u hebt nog niets om te houden'");

  await zetTafel(page, 'rad', 'kaart', 4, ['beeltenis', 'relikwie', 'slachtblok']);
  const r4 = await page.evaluate(() => ({
    knal: (document.querySelector('.dt-risico b') || {}).textContent || '',
    label: (document.querySelector('.dt-spel em') || {}).textContent || '',
    stopUit: !!(document.querySelector('[data-dt="stop"]') || {}).disabled,
    potItems: document.querySelectorAll('.dt-pot-item').length
  }));
  t(r4.knal === '67%' && r4.label === '4/12 · 33 %', `ronde 4: knalkans 67% en label '${r4.label}' (8/12 knal)`);
  t(r4.stopUit === false && r4.potItems === 3, 'met drie sporten in de pot staat stoppen aan');

  await zetTafel(page, 'rad', 'kaart', 1, ['beeltenis']);
  t(await page.evaluate(() => !!(document.querySelector('[data-dt="stop"]') || {}).disabled),
    'met ÉÉN sport in de pot staat stoppen nog steeds uit (stoppen vanaf twee, plan §1)');

  /* de sectoren/kamers moeten het label uitbeelden */
  await zetTafel(page, 'rad', 'hp', 1, []);
  await zetIn(page);
  const sect = await page.evaluate(() => ({ geeft: document.querySelectorAll('.dt-vak.geeft').length, totaal: document.querySelectorAll('.dt-vak').length }));
  t(sect.totaal === 12 && sect.geeft === 9, `het rad beeldt het label uit: ${sect.geeft}/12 gevende sectoren in ronde 1`);
  await speelUit(page, 'rad');
  await zetTafel(page, 'revolver', 'hp', 1, []);
  await zetIn(page);
  const kamers = await page.evaluate(() => ({ geladen: document.querySelectorAll('.dt-kamer.geladen').length, totaal: document.querySelectorAll('.dt-kamer').length }));
  t(kamers.totaal === 6 && kamers.geladen >= 1 && kamers.geladen <= 4, `de revolver houdt altijd minstens twee lege kamers: ${kamers.geladen}/6 geladen in ronde 1`);
  await speelUit(page, 'revolver');
  await page.screenshot({ path: path.join(SHOTS, '03-tafel.png') });
  t(page.__f.length === 0, 'geen paginafouten op de tafel' + (page.__f.length ? ': ' + page.__f[0] : ''));
  await ctx.close();

  /* ==========================================================================
     4 — de vijf spellen: ÉÉN WORP, zes rondes per spel
     ========================================================================== */
  kop('4 · de vijf spellen — zes rondes elk met een vaste Toeval-seed');
  for (const spel of SPELLEN) {
    ({ ctx, page } = await open(browser));
    await page.evaluate(sp => { Toeval.zetZaad(zaadVanTekst('DREMPELTAFEL-' + sp)); }, spel);
    const inzetten = ['kaart', 'hp', 'relikwie'];
    const rondes = [1, 2, 3, 4, 1, 2];
    let gelijk = 0, ingenomen = 0, teruggegeven = 0, ingehouden = 0, winsten = 0, knallen = 0,
      potOk = 0, rngTotaal = 0, resolveEen = 0, stabiel = 0, mislukt = [];
    for (let i = 0; i < 6; i++) {
      const inzet = inzetten[i % 3];
      const voor = await zetTafel(page, spel, inzet, rondes[i], []);
      const na = await zetIn(page);
      /* de inzet moet AL weg zijn voordat er iets beweegt (plan §1) */
      const wegOk = inzet === 'kaart' ? (na.dekUids.indexOf(voor.besteUid) < 0 && na.dekUids.length === voor.dekUids.length - 1)
        : inzet === 'hp' ? (na.hp === voor.hp - 18)
          : (na.rel.indexOf(voor.relId) < 0);
      if (wegOk) ingenomen++; else mislukt.push(`r${i + 1} inname ${inzet}`);

      /* VERGIFTIG de RNG met de waarde die de uitslag zou OMKEREN als ze nog telde */
      await page.evaluate(u => window.__rngAan(u ? 0 : 0.9999999), na.uitslag);
      const klaar = await speelUit(page, spel);
      const rng = await page.evaluate(() => window.__rngUit());
      rngTotaal += rng;
      const res = await page.evaluate(() => ({
        resolve: window.__resolve, eff: window.__resolveEff,
        fase: (S.drempeltafel || {}).fase, uitslag: (S.drempeltafel || {}).uitslag,
        pot: (S.drempeltafel || {}).pot.slice(), inzetData: (S.drempeltafel || {}).inzetData,
        dekUids: S.dek.map(k => k.uid), hp: S.hp, maxHp: S.maxHp, rel: S.relikwieen.slice()
      }));
      if (!klaar || !res.resolve) { mislukt.push(`r${i + 1} kwam niet tot een resolve`); continue; }
      if (res.resolve.zichtbaar === na.uitslag) gelijk++; else mislukt.push(`r${i + 1} zichtbaar ${res.resolve.zichtbaar} vs uitslag ${na.uitslag}`);
      if (res.eff === 1) resolveEen++; else mislukt.push(`r${i + 1} ${res.eff} effectieve resolves`);
      /* de worp valt ÉÉN keer: de op schijf gezette uitslag verandert niet meer
         terwijl de choreografie loopt (ook niet onder een vergiftigde RNG) */
      if (res.uitslag === na.uitslag) stabiel++; else mislukt.push(`r${i + 1} uitslag verschoof ${na.uitslag} -> ${res.uitslag}`);

      if (na.uitslag) {
        winsten++;
        const terug = inzet === 'kaart' ? (res.dekUids.indexOf(voor.besteUid) >= 0 && res.dekUids.length === voor.dekUids.length)
          : inzet === 'hp' ? (res.hp === voor.hp)
            : (res.rel.indexOf(voor.relId) >= 0 && res.maxHp === voor.maxHp);
        if (terug) teruggegeven++; else mislukt.push(`r${i + 1} teruggave ${inzet}`);
        if (res.pot.length === 1) potOk++; else mislukt.push(`r${i + 1} pot ${res.pot.length} na winst`);
      } else {
        knallen++;
        const weg = inzet === 'kaart' ? (res.dekUids.indexOf(voor.besteUid) < 0)
          : inzet === 'hp' ? (res.hp === voor.hp - 18)
            : (res.rel.indexOf(voor.relId) < 0);
        if (weg) ingehouden++; else mislukt.push(`r${i + 1} de bank gaf de inzet terug na een knal`);
        if (res.pot.length === 0) potOk++; else mislukt.push(`r${i + 1} pot niet leeg na knal`);
      }
    }
    t(gelijk === 6, `${spel}: ${gelijk}/6 zichtbare uitkomsten gelijk aan de gepersisteerde S.drempeltafel.uitslag — gemeten met een VERGIFTIGDE RNG (elke willekeurig() geeft de waarde die de uitslag zou omkeren)`);
    t(ingenomen === 6, `${spel}: ${ingenomen}/6 inzetten meteen ingenomen bij 'Zet in' (dek-uid / 18 HP / relikwie)`);
    t(teruggegeven === winsten && ingehouden === knallen, `${spel}: ${teruggegeven}/${winsten} teruggegeven bij winst, ${ingehouden}/${knallen} ingehouden bij knal`);
    /* NUL aanroepen is hier de BESTE uitslag, geen gebrek: dan rolt de choreografie
       zelfs niet meer voor de sier. Wat moet kloppen is dat de al gevallen worp niet
       meer verschuift — daarom telt deze controle de stabiliteit, niet de aanroepen. */
    t(stabiel === 6, `${spel}: ${stabiel}/6 keer blijft de op schijf gezette uitslag onveranderd tijdens de choreografie (${rngTotaal} willekeurig()-aanroepen ná dtStartSpel, allemaal sier)`);
    t(potOk === 6 && resolveEen === 6, `${spel}: de pot klimt bij winst en valt leeg bij een knal; telkens precies één resolve` + (mislukt.length ? ' — ' + mislukt.join('; ') : ''));
    await page.screenshot({ path: path.join(SHOTS, '04-' + spel + '.png') });
    t(page.__f.length === 0, `${spel}: geen paginafouten` + (page.__f.length ? ': ' + page.__f[0] : ''));
    await ctx.close();
  }

  /* ==========================================================================
     5 — de ECHTE animatie (niet-lite): het rad draait 3,4 s en houdt zijn uitslag
     ========================================================================== */
  kop('5 · zonder lite: de volle choreografie verandert de uitslag niet');
  ({ ctx, page } = await open(browser, { traag: true }));
  await zetTafel(page, 'rad', 'hp', 1, []);
  const traagNa = await zetIn(page);
  await page.evaluate(u => window.__rngAan(u ? 0 : 0.9999999), traagNa.uitslag);
  const t0 = Date.now();
  await page.evaluate(() => { const b = document.getElementById('dt-spelactie'); if (b) b.click(); });
  const traagKlaar = await wachtOp(page, () => (S.drempeltafel || {}).fase === 'uitkomst', null, 12000);
  const duur = Date.now() - t0;
  await page.evaluate(() => window.__rngUit());
  const traagRes = await page.evaluate(() => window.__resolve);
  t(traagKlaar && duur > 3000, `de raddraai duurt de volle choreografie (gemeten ${duur} ms, verwacht > 3000)`);
  t(!!traagRes && traagRes.zichtbaar === traagNa.uitslag, `ook zonder lite is het zichtbare resultaat de gepersisteerde uitslag (${traagNa.uitslag})`);
  await ctx.close();

  /* ==========================================================================
     6 — hervatten na een herlaad in elke fase
     ========================================================================== */
  kop('6 · herlaad midden in de fases tafel / spel / uitkomst');
  for (const doelFase of ['tafel', 'spel', 'uitkomst']) {
    ({ ctx, page } = await open(browser));
    await zetTafel(page, 'paren', 'kaart', 2, ['beeltenis']);
    let voor;
    if (doelFase === 'tafel') {
      voor = await page.evaluate(() => { saveSpel(); return { fase: S.drempeltafel.fase, uitslag: S.drempeltafel.uitslag, pot: S.drempeltafel.pot.slice(), ronde: S.drempeltafel.ronde }; });
    } else {
      await zetIn(page);
      if (doelFase === 'uitkomst') await speelUit(page, 'paren');
      voor = await page.evaluate(() => ({ fase: S.drempeltafel.fase, uitslag: S.drempeltafel.uitslag, pot: S.drempeltafel.pot.slice(), ronde: S.drempeltafel.ronde, dek: S.dek.length, hp: S.hp }));
    }
    await page.reload({ waitUntil: 'load' }); await slaap(800);
    await spionnen(page, true);
    await page.evaluate(() => { doorgaan(); });
    await slaap(800);
    const na = await page.evaluate(() => ({
      fase: (S.drempeltafel || {}).fase, uitslag: (S.drempeltafel || {}).uitslag,
      pot: ((S.drempeltafel || {}).pot || []).slice(), ronde: (S.drempeltafel || {}).ronde,
      dek: S.dek.length, hp: S.hp,
      doek: !!document.querySelector('#overlay-drempeltafel.open'),
      doekFase: [...(document.querySelector('.dt-doek') || { classList: [] }).classList].find(c => c.indexOf('dt-fase-') === 0) || null
    }));
    t(na.doek && na.fase === voor.fase && na.doekFase === 'dt-fase-' + voor.fase,
      `herlaad in fase '${doelFase}': doorgaan() zet de tafel terug in dezelfde fase (gemeten ${na.fase}/${na.doekFase})`);
    t(na.uitslag === voor.uitslag && JSON.stringify(na.pot) === JSON.stringify(voor.pot) && na.ronde === voor.ronde,
      `herlaad in fase '${doelFase}': dezelfde uitslag (${na.uitslag}) en dezelfde pot [${na.pot.join(', ')}]`);
    if (doelFase === 'spel') {
      /* de knal is niet te ontlopen: opnieuw uitspelen levert exact dezelfde afloop */
      await page.evaluate(() => window.__resetResolve());
      await page.evaluate(u => window.__rngAan(u ? 0 : 0.9999999), na.uitslag);
      await speelUit(page, 'paren');
      await page.evaluate(() => window.__rngUit());
      const res = await page.evaluate(() => ({ resolve: window.__resolve, dek: S.dek.length }));
      t(!!res.resolve && res.resolve.zichtbaar === voor.uitslag,
        `herlaad midden in de worp ontloopt de uitslag niet: opnieuw uitgespeeld blijft het ${voor.uitslag ? 'winst' : 'een knal'}`);
      t(na.dek === voor.dek && na.hp === voor.hp, 'de al ingenomen inzet is ná de herlaad nog steeds ingenomen (geen gratis herkansing)');
    }
    t(page.__f.length === 0, `herlaad '${doelFase}': geen paginafouten` + (page.__f.length ? ': ' + page.__f[0] : ''));
    await ctx.close();
  }

  /* ==========================================================================
     7 — dubbeltik
     ========================================================================== */
  kop('7 · dubbeltik: twee snelle kliks geven één inname en één resolve');
  ({ ctx, page } = await open(browser));
  const dtVoor = await zetTafel(page, 'rad', 'kaart', 1, []);
  await page.evaluate(() => { window.__resetResolve(); const b = document.querySelector('[data-dt="zet-in"]'); if (b) { b.click(); b.click(); } });
  await slaap(200);
  const dubbelIn = await page.evaluate(() => ({ dek: S.dek.length, fase: S.drempeltafel.fase }));
  t(dubbelIn.dek === dtVoor.dekUids.length - 1 && dubbelIn.fase === 'spel',
    `twee snelle kliks op 'Zet in' nemen precies één kaart in (${dtVoor.dekUids.length} -> ${dubbelIn.dek})`);
  await page.evaluate(() => { const b = document.getElementById('dt-spelactie'); if (b) { b.click(); b.click(); } });
  await wachtOp(page, () => (S.drempeltafel || {}).fase === 'uitkomst', null, 8000);
  t(await page.evaluate(() => window.__resolveEff === 1), `rad: twee snelle kliks op 'Draai' geven precies één resolve (gemeten ${await page.evaluate(() => window.__resolveEff)})`);

  await zetTafel(page, 'revolver', 'hp', 1, []);
  await zetIn(page);
  await page.evaluate(() => { const b = document.getElementById('dt-spelactie'); if (b) { b.click(); b.click(); } });
  await slaap(40);
  t(await page.evaluate(() => { const d = window.__dt(); return d && d.spelState && d.spelState.getrokken.length === 1; }),
    'revolver: twee snelle kliks op Trek trekken precies één kamer');
  await speelUit(page, 'revolver');

  await zetTafel(page, 'paren', 'hp', 1, []);
  await zetIn(page);
  await page.evaluate(() => { const el = document.querySelector('#dt-paren .dt-tegel[data-i="0"]'); if (el) { el.click(); el.click(); } });
  await slaap(40);
  t(await page.evaluate(() => { const d = window.__dt(); return d && d.spelState && d.spelState.open.length === 1 && d.spelState.onthuld === 1; }),
    'paren: twee snelle kliks op dezelfde tegel draaien hem één keer om');
  await speelUit(page, 'paren');

  await zetTafel(page, 'nissen', 'hp', 1, []);
  await zetIn(page);
  await page.evaluate(() => {
    window.__resetResolve();
    const a = document.querySelector('.dt-gok-nis[data-i="0"]'), b = document.querySelector('.dt-gok-nis[data-i="1"]');
    if (a) a.click(); if (b) b.click();
  });
  await slaap(60);
  const nisDubbel = await page.evaluate(() => { const d = window.__dt(); return d && d.spelState ? d.spelState.keuze : null; });
  await wachtOp(page, () => (S.drempeltafel || {}).fase === 'uitkomst', null, 8000);
  t(nisDubbel === 0 && await page.evaluate(() => window.__resolveEff === 1),
    'nissen: twee snelle kliks op twee nissen tellen alleen de eerste, en resolven één keer');
  t(page.__f.length === 0, 'geen paginafouten bij de dubbeltikproef' + (page.__f.length ? ': ' + page.__f[0] : ''));
  await ctx.close();

  /* ==========================================================================
     8 — knal -> uitkomst -> encounter (lege pot)
     ========================================================================== */
  kop('8 · knal -> uitkomst -> encounter: de vaste pool zonder zwaarte');
  ({ ctx, page } = await open(browser));
  await zetTafel(page, 'rad', 'kaart', 1, []);
  const knalNa = await zetIn(page, false);
  t(knalNa.uitslag === false, 'een geforceerde worp van 0 geeft gegarandeerd een knal');
  await speelUit(page, 'rad');
  const knalScherm = await page.evaluate(() => ({
    fase: S.drempeltafel.fase,
    kop: (document.querySelector('.dt-uitkomst-kop') || {}).textContent || '',
    knalKlasse: !!document.querySelector('.dt-uitkomst-kop.knal'),
    pot: S.drempeltafel.pot.slice(),
    naam: (document.querySelector('.dt-verlies-naam') || {}).textContent || ''
  }));
  t(knalScherm.fase === 'uitkomst' && knalScherm.knalKlasse && /DE WAND NEEMT/.test(knalScherm.kop),
    `het knalscherm benoemt het verlies: '${knalScherm.kop.trim()}' (${knalScherm.naam})`);
  t(knalScherm.pot.length === 0, 'na een knal is de pot leeg — u valt van de hele ladder');
  await page.evaluate(() => { const b = document.querySelector('[data-dt="verder"]'); if (b) b.click(); });
  await slaap(400);
  const enc0 = await page.evaluate(() => ({
    fase: S.drempeltafel.fase, vijand: S.drempeltafel.vijand,
    hpLabel: (document.querySelector('.dt-enc-stat b') || {}).textContent || '',
    naam: (document.querySelector('.dt-vijand-naam') || {}).textContent || ''
  }));
  t(enc0.fase === 'encounter' && POEL.indexOf(enc0.vijand) >= 0, `de encounter kiest uit de vaste pool: ${enc0.vijand} (${enc0.naam})`);
  t(enc0.hpLabel === String(POEL_HP[enc0.vijand] || 0), `de getoonde HP is de vaste pool-HP zonder zwaarte: ${enc0.hpLabel} (verwacht ${POEL_HP[enc0.vijand]})`);
  await page.evaluate(() => { const b = document.querySelector('[data-dt="gevecht-in"]'); if (b) b.click(); });
  await slaap(1400);
  const gev0 = await page.evaluate(() => {
    const g = S.gevecht, v = g && g.vijanden[0];
    return { scherm: document.body.dataset.scherm, tafel: !!(g && g.tafel), id: v && v.id, hp: v && v.hp, maxHp: v && v.maxHp, doek: !!document.getElementById('overlay-drempeltafel') };
  });
  t(gev0.scherm === 'gevecht' && gev0.tafel === true && !gev0.doek, 'het gevecht start met g.tafel gezet en zonder doek eronder');
  t(gev0.hp === POEL_HP[enc0.vijand] && gev0.maxHp === gev0.hp,
    `de vijand draagt zijn vaste HP buiten de act-schaling: ${gev0.hp}/${gev0.maxHp} (verwacht ${POEL_HP[enc0.vijand]})`);
  await page.screenshot({ path: path.join(SHOTS, '08-encounter.png') });

  /* 9 — de encounter VERLIEZEN: eigen kop op het nederlaagscherm */
  kop('9 · de encounter verliezen: de tafel-kop op het eindescherm');
  await page.evaluate(() => { S.hp = 0; nederlaag(); });
  const dood = await wachtOp(page, () => document.body.dataset.scherm === 'einde' && !!document.querySelector('.einde-titel'), null, 8000);
  const eind = await page.evaluate(() => ({
    titel: (document.querySelector('.einde-titel') || {}).textContent || '',
    regel: (document.querySelector('.einde-regel') || {}).textContent || ''
  }));
  t(dood && /DE TAFEL IS GESLOTEN/.test(eind.titel), `het nederlaagscherm draagt de tafel-kop: '${eind.titel.trim()}'`);
  t(/tafel|wand|bank|wekte|ronde/i.test(eind.regel), `de epitaaf komt uit de tafel-poel: ${eind.regel.trim()}`);
  t(page.__f.length === 0, 'geen paginafouten in de knal-/nederlaagdoorloop' + (page.__f.length ? ': ' + page.__f[0] : ''));
  await ctx.close();

  /* ==========================================================================
     10 — de volle ladder + de encounter winnen + de uitbetaling
     ========================================================================== */
  kop('10 · de volle ladder (vier geforceerde winsten) en de uitbetaling na de encounter');
  ({ ctx, page } = await open(browser));
  const codexVoor = await page.evaluate(() => JSON.stringify(Codex.slachtblok || {}));
  await page.evaluate(() => { devDrempeltafel(); });
  await slaap(500);
  for (let i = 0; i < 3; i++) { await page.evaluate(() => { const b = document.querySelector('[data-dt="nis-plaats"]'); if (b) b.click(); }); await slaap(120); }
  await page.evaluate(() => { const b = document.querySelector('[data-dt="voed"]'); if (b) b.click(); });
  await slaap(300);
  t(await page.evaluate(() => S.drempeltafel.fase === 'tafel' && (S.scherven || []).length === 0),
    "'Voed de drempel' verbrandt de drie scherven en opent de tafel");
  await page.evaluate(() => { S.act = 2; S.maxHp = 260; S.hp = 260; while (S.dek.length < 12) S.dek.push(nieuweKaart('slag')); });
  const ladder = [];
  for (let r = 1; r <= 4; r++) {
    await page.evaluate(() => { const b = document.querySelector('.dt-spel[data-id="nissen"]'); if (b) b.click(); });
    await slaap(120);
    await page.evaluate(() => { const b = document.querySelector('.dt-keuze[data-id="hp"]'); if (b) b.click(); });
    await slaap(120);
    const na = await zetIn(page, true);
    await speelUit(page, 'nissen');
    const st = await page.evaluate(() => ({ fase: S.drempeltafel.fase, pot: S.drempeltafel.pot.slice(), ronde: S.drempeltafel.ronde }));
    ladder.push(st.pot.length);
    if (r < 4) { await page.evaluate(() => { const b = document.querySelector('[data-dt="verder"]'); if (b) b.click(); }); await slaap(300); }
  }
  const volleLadder = await page.evaluate(() => ({
    pot: S.drempeltafel.pot.slice(), fase: S.drempeltafel.fase,
    knop: (document.querySelector('[data-dt="verder"]') || {}).textContent || '',
    stop: !!document.querySelector('[data-dt="stop-uitkomst"]')
  }));
  t(JSON.stringify(volleLadder.pot) === JSON.stringify(['beeltenis', 'relikwie', 'slachtblok', 'dubbel']),
    `vier winsten klimmen de hele ladder in volgorde: [${volleLadder.pot.join(', ')}]`);
  t(/De encounter in/.test(volleLadder.knop) && !volleLadder.stop,
    'na sport IV is er geen stop-knop meer — de hele ladder halen betekent alles houden');
  await page.screenshot({ path: path.join(SHOTS, '10-uitkomst-sport4.png') });

  await page.evaluate(() => { const b = document.querySelector('[data-dt="verder"]'); if (b) b.click(); });
  await slaap(400);
  const enc4 = await page.evaluate(() => ({
    vijand: S.drempeltafel.vijand,
    hpLabel: (document.querySelector('.dt-enc-stat b') || {}).textContent || '',
    zwaarte: [...document.querySelectorAll('.dt-enc-stat b')].map(b => b.textContent)
  }));
  t(enc4.hpLabel === String((POEL_HP[enc4.vijand] || 0) + 4 * 14),
    `de zwaarte telt op: ${enc4.hpLabel} = vaste HP ${POEL_HP[enc4.vijand]} + 14 x 4 sporten`);
  await page.evaluate(() => { const b = document.querySelector('[data-dt="gevecht-in"]'); if (b) b.click(); });
  await slaap(1500);
  const gev4 = await page.evaluate(() => {
    const g = S.gevecht, v = g && g.vijanden[0];
    return { tafel: !!(g && g.tafel), hp: v && v.hp, maxHp: v && v.maxHp, uitTeKeren: (S.drempeltafel.uitTeKeren || []).slice(), goud: S.goud };
  });
  t(gev4.tafel && gev4.hp === (POEL_HP[enc4.vijand] || 0) + 56 && gev4.maxHp === gev4.hp,
    `het gevecht draagt vasteHp + hpBonus: ${gev4.hp}/${gev4.maxHp}`);
  t(JSON.stringify(gev4.uitTeKeren) === JSON.stringify(['beeltenis', 'relikwie', 'slachtblok', 'dubbel']),
    'de pot staat vóór het gevecht in S.drempeltafel.uitTeKeren, in klimvolgorde');

  await page.evaluate(() => { const v = S.gevecht.vijanden[0]; verliesHp(v, v.hp + 5); if (alleVijanden().length === 0) gevechtGewonnen(); });
  const opBeloning = await wachtOp(page, () => document.body.dataset.scherm === 'beloning', null, 14000);
  t(opBeloning, 'na de winst staat het beloningscherm als doek onder de ceremonies');
  const buit = await page.evaluate(() => ({
    tafel: !!(S.beloning && S.beloning.tafel), bezig: !!(S.beloning && S.beloning.tafelBezig),
    goud: S.goud, bGoud: S.beloning && S.beloning.goud, bRel: S.beloning && S.beloning.relikwie,
    bKaarten: S.beloning && S.beloning.kaarten, bDrank: S.beloning && S.beloning.drank,
    verderUit: !!(document.querySelector('#scherm-beloning .knop-groot') || {}).disabled,
    scherven: (S.scherven || []).length,
    scherfKop: (document.querySelector('.scherf-reveal-kop') || {}).textContent || ''
  }));
  t(buit.goud === gev4.goud && buit.bGoud === 0 && !buit.bRel && !buit.bKaarten && !buit.bDrank,
    `geen standaard elite-buit: goud blijft ${buit.goud}, geen relikwie/kaart/drank`);
  t(buit.scherven === 1 && /SCHERF TERUG/.test(buit.scherfKop), `100 % één scherf terug — kop '${buit.scherfKop.trim()}'`);
  t(buit.tafel === true && buit.bezig === true && buit.verderUit === true, "de Verder-knop staat op slot zolang de pot uitbetaalt");
  t(await page.evaluate(() => !!(S.drempeltafel && S.drempeltafel.dubbel)),
    'de sport IV-intentie S.drempeltafel.dubbel staat METEEN aan, vóór het blok opengaat');
  await sluitReveals(page);

  const keuzeOpen = await wachtOp(page, () => { const ov = document.getElementById('overlay-kies'); return !!(ov && ov.classList.contains('open')); }, null, 12000);
  const keuze = await page.evaluate(() => ({
    titel: (document.getElementById('kies-titel') || {}).textContent || '',
    aantal: document.querySelectorAll('#kies-kaarten .onthul-kaart').length,
    zeld: [...document.querySelectorAll('#kies-kaarten .onthul-kaart .kaart')].map(k => [...k.classList].find(c => c.indexOf('zeld-') === 0)),
    beeltenissen: (S.beeltenissen || []).slice()
  }));
  t(keuzeOpen && keuze.aantal === 3 && /sport I/i.test(keuze.titel), `sport I: kaartkeuze 1 uit ${keuze.aantal} — '${keuze.titel}'`);
  t(keuze.zeld.length === 3 && keuze.zeld.every(z => z === 'zeld-zeldzaam'), 'de drie kaarten zijn zeldzaam: ' + keuze.zeld.join(', '));
  t(keuze.beeltenissen.length === 3, `sport I speelt drie beeltenissen vrij: ${keuze.beeltenissen.join(', ')}`);
  const dekVoorKeuze = await page.evaluate(() => S.dek.length);
  await slaap(2200);
  await page.evaluate(() => { const el = document.querySelector('#kies-kaarten .onthul-kaart'); if (el) el.click(); });
  await slaap(400);
  await page.evaluate(() => { const b = document.getElementById('focus-kies'); if (b) b.click(); });
  await slaap(700);
  t(await page.evaluate(d => S.dek.length === d + 1, dekVoorKeuze), 'de gekozen kaart belandt in het dek');

  const relOpen = await wachtOp(page, () => !!document.querySelector('.relikwie-reveal-overlay'), null, 12000);
  const rel = await page.evaluate(() => ({
    kop: (document.querySelector('.relikwie-reveal-overlay .rr-kop') || {}).textContent || '',
    heeft: (S.relikwieen || []).indexOf('kroon_van_sintels') >= 0,
    ceremonies: document.querySelectorAll('.relikwie-reveal-overlay').length
  }));
  t(relOpen && rel.heeft, 'sport II: kroon_van_sintels staat in S.relikwieen');
  t(/SPORT II/.test(rel.kop) && rel.ceremonies === 1, `sport II: één ceremonie met de kop van de tafel — '${rel.kop.trim()}'`);
  await sluitReveals(page);

  const sbOpen = await wachtOp(page, () => { const ov = document.getElementById('overlay-slachtblok'); return !!(ov && ov.classList.contains('open')); }, null, 14000);
  const sb = await page.evaluate(() => ({
    modus: (typeof _smeed !== 'undefined' && _smeed) ? _smeed.modus : null,
    dubbel: !!(typeof _smeed !== 'undefined' && _smeed && _smeed.dubbel),
    gedaanVoor: !!S.slachtblokGedaan,
    proloog: (document.querySelector('.sb-proloog-tekst') || {}).textContent || ''
  }));
  t(sbOpen && sb.modus === 'tafel', `sport III: het Slachtblok opent in modus 'tafel' (gemeten ${sb.modus})`);
  t(sb.dubbel === true, 'de voorvertoning weet van het brandmerk: _smeed.dubbel === true');
  t(sb.gedaanVoor === false && /wand/i.test(sb.proloog) && !/troonzaal/i.test(sb.proloog),
    'de proloogtekst is die van de wand, en S.slachtblokGedaan staat nog uit zolang het blok open is');
  await page.screenshot({ path: path.join(SHOTS, '10-slachtblok-tafel.png') });
  await page.evaluate(() => sluitSlachtblok(false));
  await slaap(1300);
  t(await page.evaluate(() => !!S.slachtblokGedaan), 'na het sluiten staat S.slachtblokGedaan aan — Act 3 biedt het blok niet nog eens aan');

  await sluitReveals(page, 10);
  const klaar = await wachtOp(page, () => !!(S.drempeltafel && S.drempeltafel.gedaan), null, 15000);
  const slot = await page.evaluate(() => ({
    gedaan: !!(S.drempeltafel && S.drempeltafel.gedaan), fase: S.drempeltafel && S.drempeltafel.fase,
    rest: ((S.drempeltafel || {}).uitTeKeren || []).length, pot: ((S.drempeltafel || {}).pot || []).length,
    bezig: !!(S.beloning && S.beloning.tafelBezig), goud: S.goud,
    verderUit: !!(document.querySelector('#scherm-beloning .knop-groot') || {}).disabled,
    codex: JSON.stringify(Codex.slachtblok || {})
  }));
  t(klaar && slot.gedaan && slot.fase === null, 'S.drempeltafel.gedaan valt pas ná de laatste sport, fase wordt gewist');
  t(slot.rest === 0 && slot.pot === 0, 'uitTeKeren én pot zijn leeggelopen — een herlaad kan niets dubbel uitbetalen');
  t(slot.bezig === false && slot.verderUit === false && slot.goud === gev4.goud, 'de Verder-knop is weer vrij en er is nog altijd geen goud uitgekeerd');
  t(slot.codex === codexVoor, 'DEV-TAINT: het erfstukslot Codex.slachtblok is ongewijzigd na de volledige dev-uitbetaling');
  await page.evaluate(() => { verderNaBeloning(); });
  await slaap(1000);
  t(await page.evaluate(() => document.body.dataset.scherm === 'kaart'), 'Verder brengt de speler op de afdaalkaart van Act 2');
  t(await page.evaluate(() => { S.drempeltafel.fase = 'encounter'; return (hervatScherm(), document.body.dataset.scherm === 'kaart'); }),
    "met gedaan:true gaat hervatScherm naar de kaart, ook al staat er nog een fase in de save");
  t(page.__f.length === 0, 'geen paginafouten in de volledige ladder+uitbetaling' + (page.__f.length ? ': ' + page.__f.join(' | ') : ''));
  await ctx.close();

  /* ==========================================================================
     11 — daily-gate
     ========================================================================== */
  kop('11 · daily: de tafel blijft dicht');
  ({ ctx, page } = await open(browser));
  const daily = await page.evaluate(() => {
    S.daily = true; S.act = 1; S.verdieping = 13;
    volgendeAct('de Slijmkoning');
    return { act: S.act, doek: !!document.getElementById('overlay-drempeltafel'), tafel: !!(S.drempeltafel && S.drempeltafel.fase), html: ($('#scherm-einde') || {}).innerHTML || '' };
  });
  t(daily.act === 2 && !daily.doek && !daily.tafel, 'op een dagelijkse afdaling opent volgendeAct de tafel niet');
  t(/ACT 2/.test(daily.html), 'de daily valt door naar de normale act-overgang');
  const dailyPoort = await page.evaluate(() => { S.daily = true; S._devRun = false; return codexSchrijfToegestaan(); });
  t(dailyPoort === false, 'codexSchrijfToegestaan() sluit ook de daily uit van cross-run-schrijfacties');
  await ctx.close();

  /* ==========================================================================
     12 — dev-taint op het brandmerk
     ========================================================================== */
  kop('12 · dev-taint: het dubbel-brandmerk bereikt de Codex niet vanuit een dev-run');
  ({ ctx, page } = await open(browser));
  const taint = await page.evaluate(() => {
    const maak = dev => {
      Codex.slachtblok = {};
      S.daily = false; S._devRun = dev;
      S.gesmeed = { proef_kling: { naam: 'De Proef', dubbel: true, punten: { schade: 2 } } };
      S.dek = S.dek.filter(c => c.id !== 'proef_kling');
      S.dek.push({ id: 'proef_kling', uid: 90001 });
      registreerRun(true);
      const h = S.held || 'slachter';
      return Codex.slachtblok[h] || null;
    };
    const metTaint = maak(true);
    const zonder = maak(false);
    return { poortDev: (S._devRun = true, codexSchrijfToegestaan()), metTaint, zonder };
  });
  t(taint.poortDev === false, 'codexSchrijfToegestaan() is false zodra S._devRun staat');
  t(!!taint.metTaint && taint.metTaint.dubbel === false && taint.metTaint.charges === 3,
    `dev-run: het erfstuk erft dubbel:false en de normale 3 ladingen (gemeten dubbel=${taint.metTaint && taint.metTaint.dubbel}, charges=${taint.metTaint && taint.metTaint.charges})`);
  t(!!taint.zonder && taint.zonder.dubbel === true && taint.zonder.charges === 1,
    `schone run: het brandmerk erft mét dubbel:true en ÉÉN lading (gemeten charges=${taint.zonder && taint.zonder.charges})`);
  t(page.__f.length === 0, 'geen paginafouten bij de taint-proef' + (page.__f.length ? ': ' + page.__f[0] : ''));
  await ctx.close();

  /* ==========================================================================
     13 — Act 1-scherfbronnen
     ========================================================================== */
  kop('13 · Act 1 levert scherven: de schatkist en de Slijmkoning');
  ({ ctx, page } = await open(browser));
  await page.evaluate(() => { S.act = 1; S.verdieping = 6; S.scherven = []; Codex.scherven = []; toonSchat(); onthulSchat(); });
  await slaap(2600);
  const kist = await page.evaluate(() => ({ gedragen: (S.scherven || []).length }));
  t(kist.gedragen === 1, `de Act 1-schatkist legt precies één scherf neer (gemeten ${kist.gedragen})`);
  await sluitReveals(page);
  const slijm = await page.evaluate(() => {
    S.scherven = []; S.gevecht = null;
    startGevecht(['slijmkoning'], 'baas', 13);
    const g = S.gevecht;
    return { kop: g && g.baasScherfKop, scherf: g && g.baasScherf, gedragen: (S.scherven || []).length };
  });
  t(!!slijm.scherf && slijm.gedragen === 1, `de Slijmkoning laat gegarandeerd één scherf vallen (${slijm.scherf})`);
  t(/SLIJM GLINSTERT/.test(slijm.kop || ''), `de reveal krijgt zijn eigen kop: '${slijm.kop}'`);
  t(page.__f.length === 0, 'geen paginafouten bij de scherfbronnen' + (page.__f.length ? ': ' + page.__f[0] : ''));
  await ctx.close();

  /* ==========================================================================
     14 — mobiel
     ========================================================================== */
  for (const scherm of [{ naam: '800x360', w: 800, h: 360 }, { naam: '412x915', w: 412, h: 915 }]) {
    kop('14 · mobiel ' + scherm.naam);
    ({ ctx, page } = await open(browser, { w: scherm.w, h: scherm.h, dpr: 3, mobiel: true }));
    t(await page.evaluate(() => document.body.dataset.modus === 'mobiel'), `${scherm.naam}: het mobiele CSS-spoor staat aan (body[data-modus="mobiel"])`);
    await zetTafel(page, 'rad', 'hp', 1, ['beeltenis', 'relikwie']);
    await slaap(400);
    const balk = await page.evaluate(() => {
      const b = document.querySelector('#overlay-drempeltafel .sb-balk');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      const knoppen = [...b.querySelectorAll('button')].map(k => { const kr = k.getBoundingClientRect(); return { boven: kr.top, onder: kr.bottom, h: kr.height }; });
      return {
        sticky: getComputedStyle(b).position, top: r.top, bottom: r.bottom, hoogte: r.height,
        vh: window.innerHeight, vw: window.innerWidth,
        knoppen,
        docBreed: document.documentElement.scrollWidth, ovBreed: (document.querySelector('.dt-doek') || {}).scrollWidth || 0
      };
    });
    t(!!balk && balk.sticky === 'sticky', `${scherm.naam}: de knoppenbalk is sticky`);
    t(!!balk && balk.bottom <= balk.vh + 1 && balk.top >= 0 && balk.hoogte > 0 && balk.knoppen.every(k => k.onder <= balk.vh + 1 && k.boven >= 0),
      `${scherm.naam}: de knoppenbalk staat volledig in beeld zonder scrollen (balk ${Math.round(balk.top)}-${Math.round(balk.bottom)} in ${balk.vh} px)`);
    t(!!balk && balk.docBreed <= balk.vw + 1 && balk.ovBreed <= balk.vw + 1,
      `${scherm.naam}: geen horizontale scroll (document ${balk.docBreed} px, doek ${balk.ovBreed} px in ${balk.vw} px)`);
    await page.screenshot({ path: path.join(SHOTS, '14-mobiel-tafel-' + scherm.naam + '.png') });

    await zetIn(page);
    const rad = await page.evaluate(() => { const el = document.getElementById('dt-radveld'); const r = el && el.getBoundingClientRect(); return r ? { h: r.height, b: r.bottom, t: r.top, vh: window.innerHeight } : null; });
    t(!!rad && rad.h <= rad.vh && rad.h > 40, `${scherm.naam}: het rad past binnen de viewporthoogte (${Math.round(rad.h)} px in ${rad.vh} px)`);
    await speelUit(page, 'rad');

    await zetTafel(page, 'revolver', 'hp', 1, []);
    await zetIn(page);
    const cil = await page.evaluate(() => { const el = document.querySelector('.dt-cil-veld'); const r = el && el.getBoundingClientRect(); return r ? { h: r.height, vh: window.innerHeight } : null; });
    t(!!cil && cil.h <= cil.vh && cil.h > 40, `${scherm.naam}: de cilinder past binnen de viewporthoogte (${Math.round(cil.h)} px in ${cil.vh} px)`);
    await speelUit(page, 'revolver');

    await zetTafel(page, 'paren', 'hp', 1, []);
    await zetIn(page);
    const tegels = await page.evaluate(() => [...document.querySelectorAll('#dt-paren .dt-tegel')].map(e => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }));
    t(tegels.length === 8 && tegels.every(x => x.w >= 44 && x.h >= 44),
      `${scherm.naam}: alle acht tegels halen de 44 px-tikmaat (kleinste ${Math.min.apply(null, tegels.map(x => Math.min(x.w, x.h)))} px)`);
    await page.screenshot({ path: path.join(SHOTS, '14-mobiel-paren-' + scherm.naam + '.png') });
    await speelUit(page, 'paren');
    t(page.__f.length === 0, `${scherm.naam}: geen paginafouten` + (page.__f.length ? ': ' + page.__f[0] : ''));
    await ctx.close();
  }

  console.log('\n============================================');
  console.log(fout ? fout + ' FOUT(EN), ' + ok + ' ok' : 'ALLES GROEN — ' + ok + ' controles');
  console.log('============================================');
  console.log('SAMENVATTING ok ' + ok + ' fout ' + fout + '   (screenshots: ' + SHOTS + ')');
  if (rood.length) { console.log('\nRODE CONTROLES:'); rood.forEach(r => console.log('  - ' + r)); }
  await browser.close();
  process.exit(fout ? 1 : 0);
})();
