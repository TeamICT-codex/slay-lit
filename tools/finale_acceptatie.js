/* ============================================================================
   HET PROCES — FINALE (R1 + R2) · ACCEPTATIESUITE
   Loopt §7.2 van .claude/notities/eindbaas_finale_contract.md af:
     - het scèneslot (één enorme klap vanaf 240 → hij staat op 160, geschorst, de cyclus
       reset via HERSCHIKT DE ZAAL), ook via een gif-tik in de vijandbeurt;
     - geen baasbeurt met 0 schade behalve de zitting en HERSCHIKT DE ZAAL (een volledig
       gevecht van I tot en met IV, zet per zet gelogd);
     - hoogstens 2 decreten, nooit een in III;
     - het keuzescherm verschijnt ALLEEN als een van de twee gespeeld is, en schrapt de
       gekozen kaart; anders valt de duurste zonder scherm;
     - de herverkiezing halveert het gif en geeft +2 Kracht per kiezer;
     - HET ONTSLAG 20 → 30 → 40 (→ 40);
     - geen JS-fouten; de strook, de schorsing en het keuzescherm passen op laptop 1440×900
       en mobiel 800×360 + 412×915.

   GEEN dev-server en NOOIT poort 4173: een verzonnen host (localhost:4198) wordt vanaf
   SCHIJF bediend met route.fulfill. Service workers geblokkeerd.

   Draaien (Git Bash):
     NODE_PATH=<map met playwright> SLAYIT_WORKTREE=<worktree> node tools/finale_acceptatie.js
   ============================================================================ */
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');

const WORKTREE = process.env.SLAYIT_WORKTREE || path.resolve(__dirname, '..');
const HOST = 'localhost:4198';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const slaap = ms => new Promise(r => setTimeout(r, ms));
const UIT = process.env.SLAYIT_SHOTS || path.join(__dirname, 'finale_shots');   /* tools/*_shots/ staat in .gitignore */
fs.mkdirSync(UIT, { recursive: true });

let ok = 0, fout = 0;
const t = (goed, tekst) => { goed ? ok++ : fout++; console.log('   ' + (goed ? 'ok   ' : 'FOUT ') + tekst); };
const kop = s => console.log('\n== ' + s + ' ==');

async function open(browser, o) {
  const ctx = await browser.newContext({
    viewport: { width: o.w, height: o.h },
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
    if (u.host !== HOST) return route.abort();
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
    const f = path.join(WORKTREE, rel.split('/').join(path.sep));
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) return route.fulfill({ status: 404, body: 'weg' });
    return route.fulfill({ status: 200, contentType: MIME[path.extname(rel).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  await page.goto('http://' + HOST + '/', { waitUntil: 'load' });
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('slayit_wipe', '1'); localStorage.setItem('slayit_nudge', 'weg'); localStorage.setItem('slayit_wereld', '0'); });
  await page.reload({ waitUntil: 'load' }); await slaap(700);
  if (o.mobiel) await page.evaluate(() => { document.body.dataset.modus = 'mobiel'; window.mobiel = true; });
  return { ctx, page };
}

/* een verse DICKtator (tempo 0.1: de regie raast, de logica is dezelfde). Wacht tot de intro
   en elke ceremonie weg is. De speler krijgt een onsterfelijke HP-pot en geen metgezel, zodat
   de gemeten schade alleen van de baas en zijn hof komt. */
async function startProces(page, opties) {
  await page.evaluate(o => {
    DICK.tempo = 0.1;
    window.__dickKeuze = undefined;
    devDicktator('slachter_mid', o || {});
    S.metgezel = null;
    const g = S.gevecht;
    if (g) { g.metgezel = null; }
    S.maxHp = 5000; S.hp = 5000;
    renderGevecht(); renderTopbalk();
  }, opties || {});
  await wachtVrij(page, 30000);
  /* staand gevecht op mobiel: de draai-prompt wegklikken zoals een speler die 'toch staand' kiest */
  await page.evaluate(() => { if (document.querySelector('#draai-blok.toon') && typeof speelTochStaand === 'function') speelTochStaand(); });
}
async function wachtVrij(page, max = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < max) {
    const vrij = await page.evaluate(() => {
      const g = S.gevecht;
      if (!g || g.voorbij) return true;
      return !g.bezig && !g.ceremonie && !document.getElementById('baas-intro') && !document.querySelector('.decreet-overlay');
    });
    if (vrij) return true;
    await slaap(120);
  }
  return false;
}
/* één spelersbeurt: optioneel schade op de baas (langs het normale pad: verliesHp +
   checkBaasFase, exact wat speelKaart/naActie doen), dan de vijandbeurt. Geeft de zet van
   de baas en de werkelijke schade op jou terug. */
async function beurt(page, schade, opts = {}) {
  const voor = await page.evaluate(([n, o]) => {
    const g = S.gevecht, b = dicktatorBaas(g);
    if (n > 0 && b && !b.dood) { verliesHp(b, n, sp()); checkBaasFase(); renderGevecht(); }
    if (o.speelA || o.speelB) {
      const d = [...g.aangezegd.values()];
      const k = d[o.speelA ? 0 : 1]; if (k) g.gespeeld[k.id] = (g.gespeeld[k.id] || 0) + 1;
    }
    return { hp: S.hp };
  }, [schade, opts]);
  await wachtVrij(page, 20000);
  const zet = await page.evaluate(() => {
    const g = S.gevecht, b = dicktatorBaas(g);
    g.speler.blok = 0; g.speler.status = {};   /* schone meting: geen blok, geen kwetsbaar */
    const it = b && b.intent;
    return {
      scene: b ? dicktatorScene(b) : 0, naam: it ? it.naam : '-', type: it ? it.type : '-',
      dmg: it ? (it.type === 'factuur' ? dicktatorFactuurBedrag(g, it) : (it.dmg || 0)) : 0,
      kracht: b ? (b.status.kracht || 0) : 0, hp: b ? b.hp : 0, v2: b ? (b.v2Zet || 0) : 0,
      hof: g.vijanden.filter(x => x.hof && !x.dood).map(x => ({ id: x.id, naam: x.intent && x.intent.naam, type: x.intent && x.intent.type, dmg: x.intent ? (x.intent.type === 'factuur' ? dicktatorFactuurBedrag(g, x.intent) : (x.intent.dmg || 0)) : 0 })),
      sHp: S.hp
    };
  });
  await page.evaluate(() => { const b = document.getElementById('knop-eindbeurt'); eindBeurt(); });
  await slaap(200);
  await wachtVrij(page, 30000);
  const na = await page.evaluate(() => ({ hp: S.hp, voorbij: !S.gevecht || S.gevecht.voorbij }));
  return Object.assign(zet, { verloren: zet.sHp - na.hp, voorbij: na.voorbij });
}
const sonde = page => page.evaluate(() => {
  const g = S.gevecht, b = dicktatorBaas(g);
  return {
    hp: b.hp, maxHp: b.maxHp, fase: b.fase || 1, scene: dicktatorScene(b), geschorst: !!b._geschorst,
    herschik: !!b.herschik, intent: b.intent ? b.intent.naam : '-', sceneStart: b.sceneStart || 0,
    beurtTeller: b.beurtTeller || 0, vorm2: !!b.vorm2, herrezen: !!b.herrezen,
    status: Object.assign({}, b.status), decreten: b.decreten || 0,
    hof: g.vijanden.filter(x => x.hof && !x.dood).map(x => x.id.replace(/^de_/, '') + ':' + (x.intent ? x.intent.naam : '-')).join(','),
    strook: (document.querySelector('#baas-balk .bb-proces') || {}).textContent || '',
    chip: !!document.querySelector('.status-geschorst')
  };
});

(async () => {
  const browser = await chromium.launch();

  /* ================= 1 · HET SCÈNESLOT ================= */
  kop('1 · het scèneslot (laptop 1440×900)');
  let { ctx, page } = await open(browser, { w: 1440, h: 900 });
  await startProces(page);
  let s = await sonde(page);
  t(s.scene === 1 && s.intent === 'DE AANZEGGING' && s.hp === 240, `start: scène ${s.scene}, pil "${s.intent}", ${s.hp}/${s.maxHp}`);
  await page.evaluate(() => { const b = dicktatorBaas(S.gevecht); verliesHp(b, 999, sp()); checkBaasFase(); renderGevecht(); });
  s = await sonde(page);
  t(s.hp === 160 && s.geschorst && s.scene === 2, `één klap van 999 vanaf 240 → ${s.hp}/${s.maxHp}, geschorst ${s.geschorst}, scène ${s.scene}`);
  t(s.herschik && s.intent === 'HERSCHIKT DE ZAAL', `de pil slaat om naar HERSCHIKT DE ZAAL (0 schade): "${s.intent}"`);
  t(s.chip, 'de GESCHORST-chip staat op de baas');
  await page.evaluate(() => { const b = dicktatorBaas(S.gevecht); verliesHp(b, 50, sp()); verliesHp(b, 7); renderGevecht(); });
  s = await sonde(page);
  t(s.hp === 160, `geschorst: een klap van 50 en een tik van 7 doen niets → ${s.hp}`);
  await wachtVrij(page);
  s = await sonde(page);
  t(/deurwaarder:TREEDT AAN/.test(s.hof), `de deurwaarder treedt aan bij de start van II: hof "${s.hof}"`);
  t(/GESCHORST/.test(s.strook), `de strook zegt GESCHORST: "${s.strook}"`);
  let z = await beurt(page, 0);
  t(z.naam === 'HERSCHIKT DE ZAAL' && z.verloren === 0, `de eerste vijandbeurt na de overgang: "${z.naam}", jij verloor ${z.verloren} HP`);
  s = await sonde(page);
  t(!s.geschorst && s.intent === 'KARAKTERMOORD' && !s.herschik, `daarna: schorsing voorbij (${!s.geschorst}), de cyclus van II begint bij slot 1: "${s.intent}" (sceneStart ${s.sceneStart}, teller ${s.beurtTeller})`);
  await page.evaluate(() => { const b = dicktatorBaas(S.gevecht); verliesHp(b, 5, sp()); renderGevecht(); });
  s = await sonde(page);
  t(s.hp === 155, `niet meer geschorst: een klap van 5 → ${s.hp}`);

  /* het slot via gif, midden in de vijandbeurt */
  kop('1b · het scèneslot via een gif-tik in de vijandbeurt');
  await startProces(page);
  await page.evaluate(() => { const b = dicktatorBaas(S.gevecht); b.hp = 165; b.status.gif = 40; renderGevecht(); });
  z = await beurt(page, 0);
  s = await sonde(page);
  t(s.hp === 160 && s.scene === 2 && s.intent === 'HERSCHIKT DE ZAAL', `gif 40 (baas: de helft) vanaf 165 → ${s.hp}, scène ${s.scene}, pil "${s.intent}"`);
  t(z.naam === 'DE AANZEGGING', `de baas speelde de zet die op de pil stond ("${z.naam}"), de overgang herschreef hem niet`);
  await ctx.close();

  /* ================= 2 · EEN VOLLEDIG GEVECHT ================= */
  kop('2 · een volledig gevecht I → IV: elke zet, elk decreet');
  ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
  await startProces(page);
  await page.evaluate(() => { window.__dickKeuze = (A, B) => A; });
  const log = [];
  for (let i = 0; i < 40; i++) {
    const r = await beurt(page, 18);
    log.push(r);
    if (r.voorbij) break;
  }
  const regel = r => `${['', 'I', 'II', 'III', 'IV'][r.scene] || '?'}:${r.naam}${r.dmg ? '(' + r.dmg + ')' : ''}`;
  console.log('   zetten: ' + log.map(regel).join(' → '));
  const scenes = new Set(log.map(r => r.scene));
  t([1, 2, 3, 4].every(n => scenes.has(n)), `alle vier de scènes gespeeld: ${[...scenes].join(',')}`);
  const nul = log.filter(r => !(r.dmg > 0) && !['HET DECREET', 'HERSCHIKT DE ZAAL', 'LAAT INNEN'].includes(r.naam));
  t(nul.length === 0, `geen baasbeurt met 0 schade behalve de zitting en HERSCHIKT DE ZAAL (fout: ${JSON.stringify(nul.map(regel))})`);
  const laatInnen = log.filter(r => r.naam === 'LAAT INNEN');
  t(laatInnen.every(r => r.hof.some(h => h.id === 'de_deurwaarder' && h.type === 'factuur' && h.dmg > 0)), `LAAT INNEN valt altijd samen met de INVORDERING van de deurwaarder (${laatInnen.length}×)`);
  const decreten = log.filter(r => r.naam === 'HET DECREET');
  t(decreten.length >= 1 && decreten.length <= 2, `decreten in het gevecht: ${decreten.length} (max 2)`);
  t(decreten.every(r => r.scene <= 2), `geen decreet in III of IV (scènes: ${decreten.map(r => r.scene).join(',')})`);
  const perScene = {}; decreten.forEach(r => { perScene[r.scene] = (perScene[r.scene] || 0) + 1; });
  t(Object.values(perScene).every(n => n <= 1), `hoogstens één decreet per scène: ${JSON.stringify(perScene)}`);
  const herschik = log.filter(r => r.naam === 'HERSCHIKT DE ZAAL');
  t(herschik.length === 2, `HERSCHIKT DE ZAAL precies na de twee overgangen: ${herschik.length}×`);
  const facturenI = log.filter(r => r.scene === 1 && (r.type === 'factuur' || r.hof.some(h => h.type === 'factuur')));
  t(facturenI.length === 0, `geen Factuur in scène I (${facturenI.length})`);
  const eindS = await page.evaluate(() => ({ voorbij: !!(S.gevecht && S.gevecht.voorbij) || !S.gevecht, dood: (dicktatorBaas(S.gevecht) || {}).dood }));
  t(log[log.length - 1].voorbij, `het gevecht eindigt (baas definitief dood): voorbij ${log[log.length - 1].voorbij}`);
  t(page.__f.length === 0, `geen JS-fouten in het volledige gevecht (${JSON.stringify(page.__f.slice(0, 3))})`);
  await ctx.close();

  /* ================= 3 · HET DECREET ALS KEUZE ================= */
  const naarZitting = async page => {
    await startProces(page, { hof: true });
    return page.evaluate(() => {
      const g = S.gevecht, b = dicktatorBaas(g);
      b.sceneStart = (b.beurtTeller || 0) - 2;       /* slot 3: de zitting staat op de pil */
      b.intent = VIJANDEN[b.id].kies(b, b.beurtTeller); dicktatorHersync(false);
      const d = [...g.aangezegd.values()];
      const n = id => S.dek.filter(c => c.id === id).length;
      const kost = x => { const c = S.dek.find(k => k.uid === x.uid); return c ? kval(c, 'kost') : 0; };
      return { intent: b.intent.naam, A: d[0] && { id: d[0].id, n: n(d[0].id), kost: kost(d[0]) }, B: d[1] && { id: d[1].id, n: n(d[1].id), kost: kost(d[1]) }, dek: S.dek.length };
    });
  };
  kop('3a · niets gespeeld → geen keuzescherm, de duurste valt');
  ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
  let zi = await naarZitting(page);
  t(zi.intent === 'HET DECREET' && zi.A && zi.B, `de zitting staat op de pil: "${zi.intent}" (A ${zi.A && zi.A.id} kost ${zi.A && zi.A.kost}, B ${zi.B && zi.B.id} kost ${zi.B && zi.B.kost})`);
  let zagKeuze = false;
  await page.evaluate(() => { eindBeurt(); });
  for (let k = 0; k < 60; k++) { if (await page.evaluate(() => !!document.querySelector('.decreet-keuze-overlay'))) zagKeuze = true; await slaap(100); }
  await wachtVrij(page);
  let na = await page.evaluate(([a, b]) => ({ a: S.dek.filter(c => c.id === a).length, b: S.dek.filter(c => c.id === b).length, dec: dicktatorBaas(S.gevecht).decreten }), [zi.A.id, zi.B.id]);
  const duurste = zi.A.kost > zi.B.kost ? 'A' : 'B';
  const viel = na.a < zi.A.n ? 'A' : (na.b < zi.B.n ? 'B' : '-');
  t(!zagKeuze, `geen keuzescherm als je geen van beide speelde (gezien: ${zagKeuze})`);
  t(viel === duurste && na.dec === 1, `de duurste van de twee viel: ${viel} (verwacht ${duurste}), decreten ${na.dec}`);
  await ctx.close();

  for (const vp of [{ w: 1440, h: 900, naam: 'laptop 1440×900' }, { w: 800, h: 360, mobiel: true, naam: 'mobiel 800×360' }, { w: 412, h: 915, mobiel: true, naam: 'mobiel 412×915' }]) {
    kop('3b · gespeeld → keuzescherm, de gekozen kaart valt (' + vp.naam + ')');
    ({ ctx, page } = await open(browser, vp));
    zi = await naarZitting(page);
    /* de speler speelde B sinds de aanzegging; hij KIEST A (niet de standaard) */
    await page.evaluate(() => { const g = S.gevecht; const d = [...g.aangezegd.values()]; g.gespeeld[d[1].id] = (g.gespeeld[d[1].id] || 0) + 1; });
    const hpVoor = await page.evaluate(() => S.hp);
    await page.evaluate(() => { eindBeurt(); });
    let ov = null;
    for (let k = 0; k < 80 && !ov; k++) { ov = await page.$('.decreet-keuze-overlay'); if (!ov) await slaap(100); }
    t(!!ov, 'het keuzescherm verschijnt');
    if (ov) {
      await slaap(500);
      const geo = await page.evaluate(() => {
        const knoppen = [...document.querySelectorAll('.decreet-keuze-overlay .decreet-kies')].map(k => k.getBoundingClientRect());
        const kaarten = [...document.querySelectorAll('.decreet-keuze-overlay .decreet-keuze-kaart .kaart')].map(k => k.getBoundingClientRect());
        const kopEl = document.querySelector('.decreet-keuze-overlay .vloek-reveal-kop');
        const kr = kopEl ? kopEl.getBoundingClientRect() : null;
        const W = innerWidth, H = innerHeight;
        const binnen = r => r.left >= -1 && r.top >= -1 && r.right <= W + 1 && r.bottom <= H + 1;
        const overlap = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
        return {
          n: knoppen.length, knoppenBinnen: knoppen.every(binnen), kaartenBinnen: kaarten.every(binnen), kopBinnen: kr ? binnen(kr) : false,
          kaartOverlap: kaarten.length === 2 && overlap(kaarten[0], kaarten[1]),
          knopH: Math.min(...knoppen.map(r => r.height)), W, H,
          maat: kaarten.map(r => Math.round(r.width) + '×' + Math.round(r.height)).join(', '),
          bezig: S.gevecht.bezig, hp: S.hp
        };
      });
      t(geo.n === 2 && geo.knoppenBinnen && geo.kaartenBinnen && geo.kopBinnen && !geo.kaartOverlap,
        `twee knoppen + twee kaarten + kop binnen ${geo.W}×${geo.H}, geen overlap (kaarten ${geo.maat})`);
      t(geo.knopH >= (vp.mobiel ? 40 : 30), `knoppen zijn raakbaar: ${Math.round(geo.knopH)}px hoog`);
      t(geo.bezig && geo.hp === hpVoor, `de vijandbeurt wacht op je keuze (bezig ${geo.bezig}, geen klap: ${geo.hp} = ${hpVoor})`);
      await page.screenshot({ path: path.join(UIT, `keuze-${vp.w}x${vp.h}.png`) }).catch(() => {});
      await page.click('.decreet-keuze-overlay .decreet-kies[data-decreet="A"]');
    }
    await wachtVrij(page);
    na = await page.evaluate(([a, b]) => ({ a: S.dek.filter(c => c.id === a).length, b: S.dek.filter(c => c.id === b).length }), [zi.A.id, zi.B.id]);
    t(na.a === zi.A.n - 1 && na.b === zi.B.n, `de gekozen kaart (A = ${zi.A.id}) viel, B bleef: A ${zi.A.n}→${na.a}, B ${zi.B.n}→${na.b}`);
    t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);
    await ctx.close();
  }

  kop('3c · het scherm staat open en het gevecht verdwijnt → de beurt hangt niet');
  ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
  zi = await naarZitting(page);
  await page.evaluate(() => { const g = S.gevecht; const d = [...g.aangezegd.values()]; g.gespeeld[d[0].id] = (g.gespeeld[d[0].id] || 0) + 1; });
  await page.evaluate(() => { eindBeurt(); });
  let open1 = false;
  for (let k = 0; k < 80 && !open1; k++) { open1 = await page.evaluate(() => !!document.querySelector('.decreet-keuze-overlay')); if (!open1) await slaap(100); }
  await page.evaluate(() => { S.gevecht.voorbij = true; });
  await slaap(900);
  const weg = await page.evaluate(() => !document.querySelector('.decreet-keuze-overlay'));
  t(open1 && weg, `scherm open (${open1}) → gevecht voorbij → scherm weg en de promise opgelost (${weg})`);
  await ctx.close();

  /* ================= 4 · DE HERVERKIEZING ================= */
  kop('4 · de herverkiezing: gif gehalveerd, +2 per kiezer, alleen de baas');
  ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
  await startProces(page, { tirade: true });
  s = await sonde(page);
  t(s.scene === 3 && /deurwaarder/.test(s.hof) && /claqueur/.test(s.hof) && !/griffier/.test(s.hof), `scène III: hof "${s.hof}"`);
  await page.evaluate(() => { const b = dicktatorBaas(S.gevecht); b.status.gif = 7; b.status.zwak = 2; b.status.kwetsbaar = 1; verliesHp(b, b.hp, sp()); checkBaasFase(); renderGevecht(); });
  s = await sonde(page);
  const K = await page.evaluate(() => DICK.krachtPerKiezer);
  t(s.herrezen && s.vorm2 && s.hp === Math.ceil(240 * 0.42), `herrezen op ${s.hp}/${s.maxHp} (vorm2 ${s.vorm2})`);
  t(s.status.gif === 3 && !s.status.zwak && !s.status.kwetsbaar, `gif 7 → ${s.status.gif} (gehalveerd, naar beneden), zwak/kwetsbaar gewist: ${JSON.stringify(s.status)}`);
  t(s.status.kracht === 2 * K && K === 2, `twee kiezers → +${s.status.kracht} Kracht (${K} per kiezer)`);
  t(s.hof === '', `het hof is gevlucht: "${s.hof}"`);
  t(s.intent === 'DE FACTUUR', `de eerste vorm-2-zet is de AANLOOP: "${s.intent}"`);
  await wachtVrij(page);
  s = await sonde(page);
  t(/IV · HET MANDAAT/.test(s.strook) && /ONTSLAG over 1/.test(s.strook) && /ONTSLAG 20/.test(s.strook), `de strook: "${s.strook}"`);

  kop('5 · HET ONTSLAG 20 → 30 → 40 → 40');
  const v2 = [];
  for (let i = 0; i < 8; i++) { const r = await beurt(page, 0); v2.push(r); if (r.voorbij) break; }
  console.log('   zetten: ' + v2.map(r => `${r.naam}(${r.dmg}+${r.kracht}K → -${r.verloren})`).join(' → '));
  const ontslagen = v2.filter(r => r.naam === 'HET ONTSLAG');
  t(JSON.stringify(ontslagen.map(r => r.dmg)) === JSON.stringify([20, 30, 40, 40]), `ontslagbedragen: ${ontslagen.map(r => r.dmg).join(' → ')}`);
  t(JSON.stringify(v2.map(r => r.naam)) === JSON.stringify(['DE FACTUUR', 'HET ONTSLAG', 'DONDERREDE', 'HET ONTSLAG', 'DE FACTUUR', 'HET ONTSLAG', 'DONDERREDE', 'HET ONTSLAG']), 'de cyclus van twee: AANLOOP (Factuur/Donderrede afwisselend) → ONTSLAG');
  t(ontslagen.every(r => r.verloren === r.dmg + r.kracht), `het Ontslag slaat vast + Kracht: ${ontslagen.map(r => r.verloren).join(', ')}`);
  t(v2.filter(r => r.naam === 'DE FACTUUR').every(r => r.verloren === r.dmg), 'de Factuur telt geen Kracht mee');
  t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);
  await ctx.close();

  /* ================= 6 · LAYOUT: strook + chip op drie formaten ================= */
  for (const vp of [{ w: 1440, h: 900, naam: 'laptop 1440×900' }, { w: 800, h: 360, mobiel: true, naam: 'mobiel 800×360' }, { w: 412, h: 915, mobiel: true, naam: 'mobiel 412×915' }]) {
    kop('6 · de strook en de schorsing (' + vp.naam + ')');
    ({ ctx, page } = await open(browser, vp));
    await startProces(page, { hof: true });
    await page.evaluate(() => { const b = dicktatorBaas(S.gevecht); verliesHp(b, 999, sp()); checkBaasFase(); renderGevecht(); });
    await wachtVrij(page);
    const geo = await page.evaluate(() => {
      const st = document.querySelector('#baas-balk .bb-proces');
      const chip = document.querySelector('.status-geschorst');
      const r = st ? st.getBoundingClientRect() : null;
      const c = chip ? chip.getBoundingClientRect() : null;
      return { st: !!st, tekst: st ? st.textContent : '', r: r && { l: r.left, t: r.top, rr: r.right, b: r.bottom }, chip: !!chip, c: c && { l: c.left, rr: c.right, w: c.width }, W: innerWidth, H: innerHeight };
    });
    t(geo.st && geo.r && geo.r.l >= -1 && geo.r.rr <= geo.W + 1 && geo.r.t >= 0, `strook binnen beeld: "${geo.tekst}" (${geo.r && Math.round(geo.r.l)}-${geo.r && Math.round(geo.r.rr)} van ${geo.W})`);
    t(geo.chip && geo.c && geo.c.l >= -1 && geo.c.rr <= geo.W + 1, `GESCHORST-chip binnen beeld (${geo.c && Math.round(geo.c.w)}px breed)`);
    await page.screenshot({ path: path.join(UIT, `geschorst-${vp.w}x${vp.h}.png`) }).catch(() => {});
    t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);
    await ctx.close();
  }

  /* ================= 7 · F2 · HETZELFDE EXEMPLAAR (review R1+R2) ================= */
  /* het dossier noemt één EXEMPLAAR (uid, de kaart met het zegel). Het scherm toont dat
     exemplaar en precies dat exemplaar verbrandt - ook als er een opgewaardeerde kopie naast
     ligt (vroeger verbrandde altijd de opgewaardeerde). */
  const dossierOp = (page, up) => page.evaluate(up => {
    const g = S.gevecht, b = dicktatorBaas(g);
    const slag = S.dek.find(c => c.id === 'slag' && !!c.up === up);
    const ander = S.dek.find(c => c.id !== 'slag' && kdef(c).type !== 'vloek');
    g.aangezegd.clear();
    g.aangezegd.set(slag.uid, { uid: slag.uid, id: slag.id, naam: knaam(slag), start: 0, reden: 'suite' });
    g.aangezegd.set(ander.uid, { uid: ander.uid, id: ander.id, naam: knaam(ander), start: 0, reden: 'suite' });
    g.gespeeld.slag = 1;   /* gespeeld sinds de aanzegging → het keuzescherm */
    b.intent = VIJANDEN[b.id].kies(b, b.beurtTeller); dicktatorHersync(false);
    const slagen = S.dek.filter(c => c.id === 'slag');
    return { intent: b.intent.naam, uid: slag.uid, n: slagen.length, nUp: slagen.filter(c => c.up).length };
  }, up);
  const slagNa = (page, uid) => page.evaluate(uid => {
    const slagen = S.dek.filter(c => c.id === 'slag');
    return { weg: !S.dek.some(c => c.uid === uid), n: slagen.length, nUp: slagen.filter(c => c.up).length };
  }, uid);
  for (const up of [false, true]) {
    kop('7 · F2 · dossier op ' + (up ? 'Slag+' : 'Slag') + ' (met ' + (up ? 'Slag' : 'Slag+') + ' ernaast) → scherm en verbranding hetzelfde exemplaar');
    ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
    await naarZitting(page);
    const o = await dossierOp(page, up);
    t(o.intent === 'HET DECREET' && o.n >= 2 && o.nUp >= 1 && o.nUp < o.n, `de zitting staat op de pil ("${o.intent}"), het dek heeft ${o.n}× Slag waarvan ${o.nUp} opgewaardeerd`);
    await page.evaluate(() => { eindBeurt(); });
    let ov = null;
    for (let k = 0; k < 80 && !ov; k++) { ov = await page.$('.decreet-keuze-overlay'); if (!ov) await slaap(100); }
    const knop = ov ? await page.evaluate(() => (document.querySelector('.decreet-keuze-overlay .decreet-kies[data-decreet="A"]') || {}).textContent || '') : '';
    t(!!ov && (up ? /Schrap Slag\+/.test(knop) : /Schrap Slag(?!\+)/.test(knop)), `het scherm toont het exemplaar uit het dossier: "${knop.trim()}"`);
    if (ov) await page.click('.decreet-keuze-overlay .decreet-kies[data-decreet="A"]');
    await wachtVrij(page);
    const na7 = await slagNa(page, o.uid);
    t(na7.weg && na7.n === o.n - 1 && na7.nUp === o.nUp - (up ? 1 : 0),
      `precies dat exemplaar verbrandde: uid weg ${na7.weg}, Slag ${o.n}→${na7.n}, waarvan opgewaardeerd ${o.nUp}→${na7.nUp}`);
    t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);
    await ctx.close();
  }
  kop('7b · F2 · het meetharnas (__dickKeuze) krijgt hetzelfde exemplaar');
  ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
  await naarZitting(page);
  const o7 = await dossierOp(page, false);
  await page.evaluate(() => { window.__zag = null; window.__dickKeuze = (A, B) => { window.__zag = { uid: A.uid, up: !!A.up }; return A; }; eindBeurt(); });
  await slaap(300);
  await wachtVrij(page);
  const zag = await page.evaluate(() => window.__zag);
  const na7b = await slagNa(page, o7.uid);
  t(zag && zag.uid === o7.uid && !zag.up, `de hook kreeg het exemplaar uit het dossier (uid gelijk: ${zag && zag.uid === o7.uid}, opgewaardeerd ${zag && zag.up})`);
  t(na7b.weg && na7b.nUp === o7.nUp, `en dat exemplaar verbrandde, de opgewaardeerde kopieën bleven (${o7.nUp}→${na7b.nUp})`);
  t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);
  await ctx.close();

  /* ================= 8 · F1 · MET METGEZEL (de DEV-override van DE NISSEN DICHT) ================= */
  /* Solo onbereikbaar: tussen de schorsingswis en de check in beginSpelerBeurt raakt niets de
     baas. Met een metgezel wel: zijn beet komt NA die check. Echte overgangen, geen DEV-landing
     (die zet minVrij en verbergt de vloer; les 3 van E). De metgezel staat via devMetgezellen
     (de schakelaar van main), niet via S.metgezel met de hand. */
  kop('8 · F1 · met metgezel (DEV-override): een schorsing vóór je eerste actie geldt niet voor je beurt');
  ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
  const mg8 = await page.evaluate(() => {
    DICK.tempo = 0.1;
    window.__dickKeuze = (A, B) => B;
    devDicktator('slachter_mid');
    const solo = { g: S.gevecht ? S.gevecht.metgezel : 'geen gevecht', s: S.metgezel };
    devMetgezellen(true);                     /* DEV-SHORTCUT (main): alleen deze sessie */
    devMetgezel('drops');                     /* stapt in vanaf het volgende gevecht */
    stopGevechtLus(); S.gevecht = null;
    startGevecht(baasSamenstelling('de_dicktator'), 'baas', 12);
    S.maxHp = 5000; S.hp = 5000;
    const m = S.gevecht.metgezel;
    if (m) { m.hp = 999; m.maxHp = 999; }   /* we meten zijn beet, niet zijn overleving */
    renderGevecht(); renderTopbalk();
    return { soloG: solo.g === null, soloS: solo.s === null, aan: metgezellenAan(), mg: m ? m.id : null };
  });
  t(mg8.soloG && mg8.soloS, `devDicktator('slachter_mid') is solo zonder handwerk (F8, main): g.metgezel null ${mg8.soloG}, S.metgezel null ${mg8.soloS}`);
  t(mg8.aan && mg8.mg === 'drops', `met de DEV-override: metgezellenAan ${mg8.aan}, in het gevecht: ${mg8.mg}`);
  await wachtVrij(page, 30000);
  /* 8a · scène I: de baas op drempel + 1, Drops bijt hem bij het begin van je beurt op de drempel */
  let f8 = await page.evaluate(() => {
    const g = S.gevecht, b = dicktatorBaas(g);
    b.hp = dicktatorDrempel(b, 2) + 1; b._geschorst = false; renderGevecht();
    const voor = b.hp;
    beginSpelerBeurt();
    return { voor, hp: b.hp, fase: b.fase || 1, geschorst: !!b._geschorst, pil: b.intent ? b.intent.naam : '-', drempel: dicktatorDrempel(b, 2), alleen: g.vijanden.filter(x => !x.dood).length };
  });
  t(f8.alleen === 1 && f8.hp === f8.drempel && f8.fase === 2 && !f8.geschorst && f8.pil === 'HERSCHIKT DE ZAAL',
    `I: baas op ${f8.voor}, Drops bijt bij het begin van je beurt → ${f8.hp}: de overgang vuurt meteen (fase ${f8.fase}, pil "${f8.pil}"), geschorst ${f8.geschorst}`);
  await wachtVrij(page);
  f8 = await page.evaluate(() => { const b = dicktatorBaas(S.gevecht); const voor = b.hp; verliesHp(b, 10, sp()); checkBaasFase(); renderGevecht(); return { voor, na: b.hp }; });
  t(f8.na === f8.voor - 10, `je beurt blijft van jou: een klap van 10 → ${f8.voor} → ${f8.na}`);
  /* de HERSCHIKT-beurt, en het hof van het toneel (Drops bijt een willekeurige vijand) */
  await beurt(page, 0);
  await page.evaluate(() => { S.gevecht.vijanden.filter(x => x.hof && !x.dood).forEach(x => verliesHp(x, 999, sp())); renderGevecht(); });
  /* 8b · op de vloer van II (DE ZITTING LOOPT): de beet raakt de vloer; geen GESCHORST voor jouw beurt */
  f8 = await page.evaluate(() => {
    const g = S.gevecht, b = dicktatorBaas(g);
    const vloer = dicktatorVloer(b);
    if (vloer == null) return { vloer: null };
    b.hp = vloer + 1; b._geschorst = false; renderGevecht();
    beginSpelerBeurt(); renderGevecht();
    return { vloer, hp: b.hp, fase: b.fase || 1, geschorst: !!b._geschorst, strook: (document.querySelector('#baas-balk .bb-proces') || {}).textContent || '', alleen: g.vijanden.filter(x => !x.dood).length };
  });
  t(f8.vloer != null && f8.alleen === 1 && f8.hp === f8.vloer && f8.fase === 2 && !f8.geschorst && !/GESCHORST/.test(f8.strook),
    `II op de vloer (${f8.vloer}): Drops bijt → ${f8.hp}, fase ${f8.fase}, geschorst ${f8.geschorst}, strook "${f8.strook}"`);
  /* 8c · de sonde van E (P1): de vloer van II is net weg, de baas op drempel(III) + 1, Drops
     bijt hem op de drempel → de overgang naar III vuurt meteen en een klap doet schade */
  let p1 = null;
  for (let i = 0; i < 8 && !p1; i++) {
    await page.evaluate(() => { const b = dicktatorBaas(S.gevecht); b.hp = dicktatorDrempel(b, 3) + 1; b._geschorst = false; renderGevecht(); });
    const r = await beurt(page, 0);
    const st = await page.evaluate(() => { const b = dicktatorBaas(S.gevecht); return { hp: b.hp, fase: b.fase || 1, geschorst: !!b._geschorst, pil: b.intent ? b.intent.naam : '-', drempel: dicktatorDrempel(b, 3) }; });
    if (st.fase >= 3 || r.voorbij) p1 = Object.assign(st, { zet: r.naam, i });
  }
  t(p1 && p1.fase === 3 && p1.hp === p1.drempel && !p1.geschorst && p1.pil === 'HERSCHIKT DE ZAAL',
    `II → III: na zijn laatste zet van de zitting ("${p1 && p1.zet}", beurt ${p1 && p1.i + 1}) bijt Drops hem op ${p1 && p1.hp}: fase ${p1 && p1.fase}, pil "${p1 && p1.pil}", geschorst ${p1 && p1.geschorst}`);
  await wachtVrij(page);
  f8 = await page.evaluate(() => { const b = dicktatorBaas(S.gevecht); const voor = b.hp; verliesHp(b, 30, sp()); checkBaasFase(); renderGevecht(); return { voor, na: b.hp }; });
  t(f8.na === f8.voor - 30, `en een klap van 30 doet schade: ${f8.voor} → ${f8.na} (was: ${f8.voor} → ${f8.voor}, een verloren beurt)`);
  await page.evaluate(() => devMetgezellen(false));
  t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);
  await ctx.close();

  /* ================= 9 · F3 + F5 · ELKE SCÈNEWISSEL SLUIT HET DOSSIER ================= */
  kop('9 · F3 + F5 · elke scènewissel sluit het dossier (echte overgangen)');
  ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
  await startProces(page);
  const dossierStand = page => page.evaluate(() => {
    const g = S.gevecht, b = dicktatorBaas(g);
    const zegels = [...document.querySelectorAll('.kaart-zegel')].filter(e => e.style.display !== 'none' && e.offsetParent !== null).length;
    return {
      n: g.aangezegd ? g.aangezegd.size : 0, scene: dicktatorScene(b), dossierScene: b.dossierScene == null ? null : b.dossierScene,
      zegelsDek: S.dek.filter(c => kaartAangezegd(c)).length, zegelsDom: zegels,
      strook: (document.querySelector('#baas-balk .bb-proces') || {}).textContent || ''
    };
  });
  let z9 = await beurt(page, 0);
  let d9 = await dossierStand(page);
  t(z9.naam === 'DE AANZEGGING' && d9.n === 2 && d9.dossierScene === 1 && d9.zegelsDek === 2 && /📜/.test(d9.strook), `I: de aanzegging zet een dossier (${d9.n} kaarten, scène ${d9.dossierScene}, strook "${d9.strook}")`);
  const wissel = await page.evaluate(() => { const g = S.gevecht, b = dicktatorBaas(g); verliesHp(b, 999, sp()); checkBaasFase(); return { n: g.aangezegd.size, dossierScene: b.dossierScene == null ? null : b.dossierScene, scene: dicktatorScene(b), zegels: S.dek.filter(c => kaartAangezegd(c)).length }; });
  t(wissel.scene === 2 && wissel.n === 0 && wissel.dossierScene === null && wissel.zegels === 0, `I → II: op het moment van de wissel is het dossier dicht (${wissel.n} kaarten, dossierScene ${wissel.dossierScene}, ${wissel.zegels} zegels)`);
  await wachtVrij(page);
  d9 = await dossierStand(page);
  t(d9.n === 0 && d9.zegelsDom === 0 && !/📜|zitting over/.test(d9.strook), `de eerste beurt van II: geen 📜 en geen "zitting over" in de strook ("${d9.strook}"), ${d9.zegelsDom} zegels in beeld (F5)`);
  z9 = await beurt(page, 0);
  t(z9.naam === 'HERSCHIKT DE ZAAL', `de eerste vijandbeurt van II: "${z9.naam}"`);
  z9 = await beurt(page, 0);
  d9 = await dossierStand(page);
  t(z9.naam === 'KARAKTERMOORD' && d9.n === 2 && d9.dossierScene === 2 && /📜/.test(d9.strook), `de eerste KARAKTERMOORD van II zet een nieuw dossier (${d9.n} kaarten, scène ${d9.dossierScene}, strook "${d9.strook}")`);
  /* II → III met een open dossier. DE ZITTING LOOPT houdt hem nu nog op zijn vloer; minVrij
     (de DEV-vlag van de landing) zet de vloer voor deze ene scène uit, zodat de wissel met
     een open dossier valt - de toestand die zonder vloer (of na zijn zetten) gewoon kan. */
  const wissel3 = await page.evaluate(() => { const g = S.gevecht, b = dicktatorBaas(g); b.minVrij = true; verliesHp(b, 999, sp()); checkBaasFase(); return { n: g.aangezegd.size, dossierScene: b.dossierScene == null ? null : b.dossierScene, scene: dicktatorScene(b), zegels: S.dek.filter(c => kaartAangezegd(c)).length }; });
  t(wissel3.scene === 3 && wissel3.n === 0 && wissel3.dossierScene === null && wissel3.zegels === 0, `II → III met een open dossier: bij de wissel dicht (${wissel3.n} kaarten, ${wissel3.zegels} zegels)`);
  await wachtVrij(page);
  const iii = [];
  for (let i = 0; i < 4; i++) { const r = await beurt(page, 0); const d = await dossierStand(page); iii.push(r.naam + ':' + d.n + '/' + d.zegelsDom); }
  t(iii.every(x => /:0\/0$/.test(x)), `in III nooit een dossier of zegel: ${iii.join(' → ')}`);
  t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);
  /* de DEV-landing volgt dezelfde regel (geen uitzondering meer) */
  await startProces(page, { tirade: true });
  d9 = await dossierStand(page);
  t(d9.scene === 3 && d9.n === 0 && d9.zegelsDek === 0, `devDicktator({tirade}) landt in III zonder dossier (${d9.n} kaarten)`);
  await startProces(page, { hof: true });
  d9 = await dossierStand(page);
  t(d9.scene === 2 && d9.n === 2 && d9.dossierScene === 2, `devDicktator({hof}) landt in II met een dossier van II (${d9.n} kaarten, scène ${d9.dossierScene})`);
  await ctx.close();

  /* ================= 10 · F4 · ZONDER GRIFFIER GEEN DOSSIER ================= */
  kop('10 · F4 · de griffier sterft met een open dossier → dicht; in II geen shortlist, de zitting is EIGENHANDIG VONNIS');
  ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
  await startProces(page);
  let z10 = await beurt(page, 0);
  let d10 = await dossierStand(page);
  t(z10.naam === 'DE AANZEGGING' && d10.n === 2 && /griffier/.test((await sonde(page)).hof), `I: de aanzegging roept de griffier en zet een dossier (${d10.n} kaarten)`);
  const gd = await page.evaluate(() => {
    const g = S.gevecht; document.querySelectorAll('#meldingen .toast').forEach(e => e.remove());
    verliesHp(hofLid(g, 'de_griffier'), 999, sp()); renderGevecht();
    return { n: g.aangezegd.size, zegels: S.dek.filter(c => kaartAangezegd(c)).length, toast: [...document.querySelectorAll('#meldingen .toast')].map(e => e.textContent).join(' | '), dood: !hofLid(g, 'de_griffier') };
  });
  d10 = await dossierStand(page);
  t(gd.dood && gd.n === 0 && gd.zegels === 0 && !/📜/.test(d10.strook) && /griffier is dood/.test(gd.toast), `de griffier sterft → het dossier verdwijnt meteen (${gd.n} kaarten, ${gd.zegels} zegels, strook "${d10.strook}"), één melding: "${gd.toast}"`);
  await page.evaluate(() => { const b = dicktatorBaas(S.gevecht); verliesHp(b, 999, sp()); checkBaasFase(); renderGevecht(); });
  await wachtVrij(page);
  const zet10 = [];
  for (let i = 0; i < 4; i++) { const r = await beurt(page, 0); const d = await dossierStand(page); zet10.push({ naam: r.naam, dmg: r.dmg, n: d.n, strook: d.strook }); }
  const EIG = await page.evaluate(() => DICK.EIGENHANDIG);
  console.log('   II zonder griffier: ' + zet10.map(x => x.naam + (x.dmg ? '(' + x.dmg + ')' : '') + ' · dossier ' + x.n).join(' → '));
  t(zet10[1].naam === 'KARAKTERMOORD' && zet10.every(x => x.n === 0 && !/📜/.test(x.strook)), `II: de KARAKTERMOORD zet geen shortlist, nergens een 📜 (${zet10.map(x => x.n).join('/')})`);
  const zit10 = zet10.find(x => /VONNIS|DECREET/.test(x.naam));
  t(zit10 && zit10.naam === 'EIGENHANDIG VONNIS' && zit10.dmg === EIG, `de zitting van II is EIGENHANDIG VONNIS met het getal uit DICK.EIGENHANDIG (${zit10 && zit10.naam} ${zit10 && zit10.dmg}, DICK ${EIG})`);
  t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);
  await ctx.close();

  /* ================= 11 · F6 · HET KEUZESCHERM OVERLEEFT DE REVEALS ================= */
  /* de reveal-kop van het decreet (niet het keuzescherm zelf) */
  const decreetKop = async page => {
    for (let k = 0; k < 40; k++) {
      const s = await page.evaluate(() => { const e = document.querySelector('.decreet-overlay:not(.decreet-keuze-overlay) .decreet-shortlist'); return e ? e.textContent : null; });
      if (s) return s;
      await slaap(50);
    }
    return '';
  };
  const naarKeuze = async page => {
    const zi11 = await naarZitting(page);
    await page.evaluate(() => { const g = S.gevecht; const d = [...g.aangezegd.values()]; g.gespeeld[d[0].id] = (g.gespeeld[d[0].id] || 0) + 1; eindBeurt(); });
    let open11 = false;
    for (let k = 0; k < 80 && !open11; k++) { open11 = await page.evaluate(() => !!document.querySelector('.decreet-keuze-overlay')); if (!open11) await slaap(100); }
    return Object.assign(zi11, { open: open11 });
  };
  kop('11 · F6 · een vloek- en een kaart-reveal ruimen het keuzescherm niet op; de klik telt');
  ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
  let k11 = await naarKeuze(page);
  const rv = await page.evaluate(async () => {
    toonVloekReveal('laster');
    await new Promise(r => setTimeout(r, 400));
    const naVloek = !!document.querySelector('.decreet-keuze-overlay') && !!document.querySelector('.vloek-reveal-overlay:not(.decreet-overlay)');
    toonKaartReveal('slag');
    await new Promise(r => setTimeout(r, 400));
    const naKaart = !!document.querySelector('.decreet-keuze-overlay') && !!document.querySelector('.kaart-reveal-overlay');
    document.querySelectorAll('.kaart-reveal-overlay, .vloek-reveal-overlay:not(.decreet-overlay)').forEach(n => n.remove());   /* de speler klikt ze weg */
    return { naVloek, naKaart, bezig: S.gevecht.bezig };
  });
  t(k11.open && rv.naVloek && rv.naKaart && rv.bezig, `keuzescherm open (${k11.open}) → toonVloekReveal: blijft (${rv.naVloek}) → toonKaartReveal: blijft (${rv.naKaart}), de vijandbeurt wacht nog (${rv.bezig})`);
  await page.click('.decreet-keuze-overlay .decreet-kies[data-decreet="A"]');
  let kop11 = await decreetKop(page);
  await wachtVrij(page);
  let na11 = await page.evaluate(([a, b]) => ({ a: S.dek.filter(c => c.id === a).length, b: S.dek.filter(c => c.id === b).length }), [k11.A.id, k11.B.id]);
  t(/^U KOOS/.test(kop11) && na11.a === k11.A.n - 1 && na11.b === k11.B.n, `de klik op A telt: kop "${kop11}", A ${k11.A.n}→${na11.a}, B ${k11.B.n}→${na11.b}`);
  await ctx.close();
  kop('11b · F6 · het scherm verdwijnt zonder klik (vangnet) → B valt, de kop zegt geen "U KOOS"');
  ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
  k11 = await naarKeuze(page);
  await page.evaluate(() => { const ov = document.querySelector('.decreet-keuze-overlay'); if (ov) ov.remove(); });
  kop11 = await decreetKop(page);
  await wachtVrij(page);
  na11 = await page.evaluate(([a, b]) => ({ a: S.dek.filter(c => c.id === a).length, b: S.dek.filter(c => c.id === b).length }), [k11.A.id, k11.B.id]);
  t(k11.open && /^HET DECREET · /.test(kop11) && !/U KOOS/.test(kop11) && na11.b === k11.B.n - 1 && na11.a === k11.A.n, `vangnet: kop "${kop11}", B ${k11.B.n}→${na11.b}, A ${k11.A.n}→${na11.a}`);
  t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);
  await ctx.close();

  await browser.close();
  console.log('\n============================================');
  console.log(fout === 0 ? `FINALE ACCEPTATIE: ALLES GROEN — ${ok} ok` : `FINALE ACCEPTATIE: ${ok} ok, ${fout} FOUT`);
  console.log('============================================');
  process.exit(fout ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
