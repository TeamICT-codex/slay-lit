/* ============================================================================
   HET PROCES — FINALE (R1 + R2) · ACCEPTATIESUITE
   Loopt §7.2 van .claude/notities/eindbaas_finale_contract.md af:
     - het scèneslot (één enorme klap vanaf DICK.hp → hij staat op de drempel van II, geschorst, de cyclus
       reset via HERSCHIKT DE ZAAL), ook via een gif-tik in de vijandbeurt;
     - geen baasbeurt met 0 schade behalve de zitting en HERSCHIKT DE ZAAL (een volledig
       gevecht van I tot en met IV, zet per zet gelogd);
     - hoogstens 2 decreten, nooit een in III;
     - het keuzescherm verschijnt ALLEEN als een van de twee gespeeld is, en schrapt de
       gekozen kaart; anders valt de duurste zonder scherm;
     - de herverkiezing houdt DICK.gifRest van het gif over en geeft +DICK.krachtPerKiezer
       Kracht per kiezer;
     - HET ONTSLAG volgt DICK.ONTSLAG (voorbij het einde blijft het laatste bedrag);
     - geen JS-fouten; de strook, de schorsing en het keuzescherm passen op laptop 1440×900
       en mobiel 800×360 + 412×915.
   Sinds B4 stap 2 (afwerkplan §6) ook de reviewfixes van R1+R2, elk met zijn blok:
     7 F2 (hetzelfde exemplaar) · 8 F1 (met metgezel, via de DEV-schakelaar van main) ·
     9 F3+F5 (elke scènewissel sluit het dossier) · 10 F4 (zonder griffier geen dossier) ·
     11 F6 (het keuzescherm overleeft de reveals) · 12 F7 (schade na het slot) ·
     13 F8 (solo zonder handwerk) · 14 F9 + F11 (teksten volgen de knoppen).
   Sinds B4 stap 3 (afwerkplan §9A, F10, B5): 15 DE ZITTING LOOPT + HET HOF VANGT DE KLAP (de
     teller, de inkeping, de vangst met zijn fx op de hoveling, GESCHORST alleen bij het slot, gif
     in de vloer, IV met zijn teken, de teller en de telegraaf nooit onder de duisternis) ·
     16 de teller op drie formaten.
   Sinds de review van B4a (27 sep 2026): 17 de telegraaf liegt niet in zijn eigen beurt (vondst 1:
     T1, T1b en de vangrail) · 18 A4 (de griffier sterft niet aan een vangst; de rest valt op de
     volgende hoveling of vervalt; het Galgentouw) · 19 de ouverture wijkt voor de regie van II.
   Review F9: de suite leest elk balansgetal uit DICK (R3 draait aan die knoppen).

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
   en elke ceremonie weg is. De speler krijgt een onsterfelijke HP-pot, zodat de gemeten schade
   alleen van de baas en zijn hof komt. Solo zonder handwerk (review F8): DEV_BUILDS dragen
   geen metgezel meer en de metgezellen zijn geparkeerd; de suite zette S.metgezel vroeger met
   de hand op null. Nu telt ze elke start die toch een metgezel had (slot: blok 13). */
let nietSolo = [];
async function startProces(page, opties) {
  const solo = await page.evaluate(o => {
    DICK.tempo = 0.1;
    window.__dickKeuze = undefined;
    devDicktator('slachter_mid', o || {});
    const g = S.gevecht;
    S.maxHp = 5000; S.hp = 5000;
    renderGevecht(); renderTopbalk();
    return !!g && g.metgezel === null && !S.metgezel && !metgezellenAan();
  }, opties || {});
  if (!solo) nietSolo.push(JSON.stringify(opties || {}));
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
  /* de balansgetallen van dit moment (F9): nooit letterlijk in de suite */
  const DK = await page.evaluate(() => { const b = dicktatorBaas(S.gevecht); return { hp: DICK.hp, d2: dicktatorDrempel(b, 2), d3: dicktatorDrempel(b, 3), vorm2Pct: DICK.vorm2Pct, gifRest: DICK.gifRest ?? 0.5, K: DICK.krachtPerKiezer, L: (DICK.ONTSLAG || []).slice() }; });
  let s = await sonde(page);
  t(s.scene === 1 && s.intent === 'DE AANZEGGING' && s.hp === DK.hp, `start: scène ${s.scene}, pil "${s.intent}", ${s.hp}/${s.maxHp}`);
  await page.evaluate(() => { const b = dicktatorBaas(S.gevecht); verliesHp(b, 999, sp()); checkBaasFase(); renderGevecht(); });
  s = await sonde(page);
  t(s.hp === DK.d2 && s.geschorst && s.scene === 2, `één klap van 999 vanaf ${DK.hp} → ${s.hp}/${s.maxHp}, geschorst ${s.geschorst}, scène ${s.scene}`);
  t(s.herschik && s.intent === 'HERSCHIKT DE ZAAL', `de pil slaat om naar HERSCHIKT DE ZAAL (0 schade): "${s.intent}"`);
  t(s.chip, 'de GESCHORST-chip staat op de baas');
  await page.evaluate(() => { const b = dicktatorBaas(S.gevecht); verliesHp(b, 50, sp()); verliesHp(b, 7); renderGevecht(); });
  s = await sonde(page);
  t(s.hp === DK.d2, `geschorst: een klap van 50 en een tik van 7 doen niets → ${s.hp}`);
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
  t(s.hp === DK.d2 - 5, `niet meer geschorst: een klap van 5 → ${s.hp}`);

  /* het slot via gif, midden in de vijandbeurt */
  kop('1b · het scèneslot via een gif-tik in de vijandbeurt');
  await startProces(page);
  await page.evaluate(d2 => { const b = dicktatorBaas(S.gevecht); b.hp = d2 + 5; b.status.gif = 40; renderGevecht(); }, DK.d2);
  z = await beurt(page, 0);
  s = await sonde(page);
  t(s.hp === DK.d2 && s.scene === 2 && s.intent === 'HERSCHIKT DE ZAAL', `gif 40 (baas: de helft) vanaf ${DK.d2 + 5} → ${s.hp}, scène ${s.scene}, pil "${s.intent}"`);
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
  kop(`4 · de herverkiezing: gif × ${DK.gifRest}, +${DK.K} per kiezer, alleen de baas`);
  ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
  await startProces(page, { tirade: true });
  s = await sonde(page);
  t(s.scene === 3 && /deurwaarder/.test(s.hof) && /claqueur/.test(s.hof) && !/griffier/.test(s.hof), `scène III: hof "${s.hof}"`);
  await page.evaluate(() => { const b = dicktatorBaas(S.gevecht); b.status.gif = 7; b.status.zwak = 2; b.status.kwetsbaar = 1; verliesHp(b, b.hp, sp()); checkBaasFase(); renderGevecht(); });
  s = await sonde(page);
  const K = DK.K;
  t(s.herrezen && s.vorm2 && s.hp === Math.ceil(DK.hp * DK.vorm2Pct), `herrezen op ${s.hp}/${s.maxHp} (vorm2 ${s.vorm2}, DICK.vorm2Pct ${DK.vorm2Pct})`);
  const gifNa = Math.floor(7 * DK.gifRest);
  t((s.status.gif || 0) === gifNa && !s.status.zwak && !s.status.kwetsbaar, `gif 7 → ${s.status.gif || 0} (× DICK.gifRest ${DK.gifRest}, naar beneden: ${gifNa}), zwak/kwetsbaar gewist: ${JSON.stringify(s.status)}`);
  t(K > 0 && (s.status.kracht || 0) === 2 * K, `twee kiezers → +${s.status.kracht} Kracht (DICK.krachtPerKiezer ${K} per kiezer)`);
  t(s.hof === '', `het hof is gevlucht: "${s.hof}"`);
  t(s.intent === 'DE FACTUUR', `de eerste vorm-2-zet is de AANLOOP: "${s.intent}"`);
  await wachtVrij(page);
  s = await sonde(page);
  t(/IV · HET MANDAAT/.test(s.strook) && /ONTSLAG over 1/.test(s.strook) && new RegExp('ONTSLAG ' + DK.L[0] + '\\b').test(s.strook), `de strook: "${s.strook}" (DICK.ONTSLAG[0] = ${DK.L[0]})`);

  /* de verwachte reeks uit DICK.ONTSLAG: het n-de Ontslag, voorbij het einde het laatste bedrag */
  const ontslagVerwacht = [1, 2, 3, 4].map(n => DK.L[Math.min(n, DK.L.length) - 1]);
  kop('5 · HET ONTSLAG ' + ontslagVerwacht.join(' → ') + ' (DICK.ONTSLAG ' + JSON.stringify(DK.L) + ')');
  const v2 = [];
  for (let i = 0; i < 8; i++) { const r = await beurt(page, 0); v2.push(r); if (r.voorbij) break; }
  console.log('   zetten: ' + v2.map(r => `${r.naam}(${r.dmg}+${r.kracht}K → -${r.verloren})`).join(' → '));
  const ontslagen = v2.filter(r => r.naam === 'HET ONTSLAG');
  t(JSON.stringify(ontslagen.map(r => r.dmg)) === JSON.stringify(ontslagVerwacht), `ontslagbedragen: ${ontslagen.map(r => r.dmg).join(' → ')} (verwacht ${ontslagVerwacht.join(' → ')})`);
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
  /* B4 stap 3: de wissels hieronder zijn klappen van precies tot op de drempel. Een klap van 999
     zou het overschot op de griffier laten vallen (HET HOF VANGT DE KLAP) en hem doden - dan sloot
     zijn dood het dossier (F4) en niet de wissel (F3), en dat is niet wat dit blok bewijst. */
  const wissel = await page.evaluate(() => { const g = S.gevecht, b = dicktatorBaas(g); verliesHp(b, b.hp - dicktatorDrempel(b, 2), sp()); checkBaasFase(); return { n: g.aangezegd.size, dossierScene: b.dossierScene == null ? null : b.dossierScene, scene: dicktatorScene(b), zegels: S.dek.filter(c => kaartAangezegd(c)).length }; });
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
  const wissel3 = await page.evaluate(() => { const g = S.gevecht, b = dicktatorBaas(g); b.minVrij = true; verliesHp(b, b.hp - dicktatorDrempel(b, 3), sp()); checkBaasFase(); return { n: g.aangezegd.size, dossierScene: b.dossierScene == null ? null : b.dossierScene, scene: dicktatorScene(b), zegels: S.dek.filter(c => kaartAangezegd(c)).length }; });
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
  /* is het scherm toch weg (de regressie), dan geen klik in het niets: de controle hieronder faalt */
  if (await page.$('.decreet-keuze-overlay .decreet-kies[data-decreet="A"]')) await page.click('.decreet-keuze-overlay .decreet-kies[data-decreet="A"]');
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

  /* ================= 12 · F7 · SCHADE TELT NA HET SLOT ================= */
  kop('12 · F7 · S.stats.schade en de overkill-uitspraak tellen alleen wat echt viel');
  ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
  await startProces(page);
  /* aanvalOp = de klap van een kaart (Kracht, relikwieën en Kwetsbaar erbij); de spion
     telt elke overkill-oproep, los van de toevalskans in spreek() */
  const klap12 = (page, voorbereid) => page.evaluate(v => {
    const g = S.gevecht, b = dicktatorBaas(g);
    b.blok = 0; b.status = {};
    if (v.hp) b.hp = v.hp;
    b._geschorst = !!v.geschorst;
    if (!window.__overkill) {
      window.__overkill = 0;
      const o = window.spreek;
      window.spreek = function (actor, pool, kans) { if (pool === UITSPRAKEN._held.overkill) window.__overkill++; return o.apply(this, arguments); };
    }
    const ok0 = window.__overkill, st0 = S.stats.schade, hp0 = b.hp;
    aanvalOp(b, 30);
    return { viel: hp0 - b.hp, stats: S.stats.schade - st0, overkill: window.__overkill - ok0, hp0, hp: b.hp };
  }, voorbereid);
  const vrij12 = await klap12(page, {});
  t(vrij12.viel >= 18 && vrij12.stats === vrij12.viel && vrij12.overkill === 1, `vrije klap: ${vrij12.hp0} → ${vrij12.hp} (viel ${vrij12.viel}), stats +${vrij12.stats}, overkill-oproepen ${vrij12.overkill}`);
  const drempel12 = await page.evaluate(() => dicktatorDrempel(dicktatorBaas(S.gevecht), 2));
  const deel12 = await klap12(page, { hp: drempel12 + 5 });
  t(deel12.viel === 5 && deel12.stats === 5 && deel12.overkill === 0, `klap tot op de drempel: ${deel12.hp0} → ${deel12.hp} (viel ${deel12.viel}), stats +${deel12.stats}, overkill ${deel12.overkill}`);
  await wachtVrij(page);
  const gesch12 = await klap12(page, { geschorst: true });
  t(gesch12.viel === 0 && gesch12.stats === 0 && gesch12.overkill === 0, `geschorste baas, klap 30: viel ${gesch12.viel}, stats +${gesch12.stats}, overkill ${gesch12.overkill}`);
  t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);
  await ctx.close();

  /* ================= 13 · F8 · SOLO ZONDER HANDWERK ================= */
  kop('13 · F8 · elke devDicktator van deze suite stond solo, zonder dat de suite de metgezel wegzette');
  t(nietSolo.length === 0, `starts met een metgezel: ${nietSolo.length} ${nietSolo.length ? JSON.stringify(nietSolo) : ''}`);

  /* ================= 14 · F9 + F11 · TEKSTEN VOLGEN DE KNOPPEN ================= */
  kop('14 · F9 · de teksten van het Proces volgen DICK (draai aan de knop, de tekst draait mee)');
  ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
  const tx = await page.evaluate(() => {
    const oud = { A: DICK.APPLAUS, D: DICK.decreetCap, K: DICK.krachtPerKiezer };
    /* zonder dickTekst (de regressie) blijft de tekst ruw: de controles hieronder falen, de suite breekt niet af */
    const vul = s => (typeof dickTekst === 'function' ? dickTekst(s) : String(s));
    const lees = () => ({ claq: vul(BESTIARIUM.de_claqueur.notitie), dick: vul(BESTIARIUM.de_dicktator.notitie), herv: vul(UITSPRAKEN._dicktator.duiding.herverkiezing) });
    const nu = lees();
    DICK.APPLAUS = oud.A + 2; DICK.decreetCap = oud.D + 1; DICK.krachtPerKiezer = oud.K + 3;
    const gedraaid = lees();
    Object.assign(DICK, { APPLAUS: oud.A, decreetCap: oud.D, krachtPerKiezer: oud.K });
    Codex.gezien = (Codex.gezien || []).concat(['de_claqueur']);
    toonBestiariumPagina('de_claqueur');
    const pagina = (document.querySelector('#bestiarium-inhoud .best-notitie') || {}).textContent || '';
    return { oud, nu, gedraaid, pagina, rauw: BESTIARIUM.de_claqueur.notitie + ' | ' + BESTIARIUM.de_dicktator.notitie + ' | ' + UITSPRAKEN._dicktator.duiding.herverkiezing };
  });
  t(!/\d+ schade per beurt|max \d+ per gevecht|\+\d+ Kracht per kiezer/.test(tx.rauw) && /\{A\}/.test(tx.rauw) && /\{D\}/.test(tx.rauw) && /\{K\}/.test(tx.rauw),
    'de ruwe teksten (data.js) noemen APPLAUS, decreetCap en krachtPerKiezer niet letterlijk maar als {A}, {D}, {K}');
  t(tx.nu.claq.includes(tx.oud.A + ' schade per beurt') && tx.nu.dick.includes('max ' + tx.oud.D + ' per gevecht') && tx.nu.herv.includes('+' + tx.oud.K + ' Kracht') && !/[{}]/.test(tx.nu.claq + tx.nu.dick + tx.nu.herv),
    `ingevuld: "${tx.nu.claq.slice(0, 40)}…", "max ${tx.oud.D} per gevecht", "${tx.nu.herv}"`);
  t(tx.gedraaid.claq.includes((tx.oud.A + 2) + ' schade per beurt') && tx.gedraaid.dick.includes('max ' + (tx.oud.D + 1) + ' per gevecht') && tx.gedraaid.herv.includes('+' + (tx.oud.K + 3) + ' Kracht'),
    `knoppen gedraaid (APPLAUS ${tx.oud.A + 2}, decreetCap ${tx.oud.D + 1}, krachtPerKiezer ${tx.oud.K + 3}): de teksten volgen`);
  t(tx.pagina.includes(tx.oud.A + ' schade per beurt') && !/[{}]/.test(tx.pagina), `de Bestiarium-pagina van de claqueur: "${tx.pagina.trim()}"`);
  t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);
  await ctx.close();
  kop('14b · F11 · niets belooft "één volle cyclus": DE ZITTING LOOPT telt DICK.minZetten zetten');
  const bron14 = ['js/game.js', 'js/data.js'].map(f => fs.readFileSync(path.join(WORKTREE, f), 'utf8')).join('\n');
  const cyclus = (bron14.match(/[^\n]*volle cyclus[^\n]*/gi) || []);
  t(cyclus.length === 0, `"volle cyclus" in game.js/data.js: ${cyclus.length}× ${cyclus.map(r => r.trim().slice(0, 70)).join(' | ')}`);
  /* de teller die stap 3 zichtbaar maakt, rekent met het getal uit DICK - niet met de cyclus
     van drie: met minZetten[2] = 2 zegt hij na de overgang 2, na zijn eerste zet 1, dan 0 */
  ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
  await startProces(page);
  const nog = [];
  nog.push(await page.evaluate(() => { DICK.minZetten = Object.assign({}, DICK.minZetten, { 2: 2 }); const b = dicktatorBaas(S.gevecht); verliesHp(b, 999, sp()); checkBaasFase(); return dicktatorZittingNog(b); }));
  await wachtVrij(page);
  for (let i = 0; i < 3; i++) { await beurt(page, 0); nog.push(await page.evaluate(() => dicktatorZittingNog(dicktatorBaas(S.gevecht)))); }
  t(JSON.stringify(nog) === JSON.stringify([2, 2, 1, 0]), `met DICK.minZetten[2] = 2: nog ${nog.join(' → ')} (overgang → HERSCHIKT → 1e zet → 2e zet; verwacht 2 → 2 → 1 → 0)`);
  t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);
  await ctx.close();

  /* ================= 15 · DE ZITTING LOOPT + HET HOF VANGT DE KLAP (B4 stap 3, F10, B5) ================= */
  /* De regel ZICHTBAAR (afwerkplan §9A): de vloer met zijn teller op de bazenbalk en een eerlijke
     tekst (GESCHORST alleen bij het scèneslot, "de scène is uit" alleen als ze uit is), wat de regel
     van een klap wegknipt valt op de eerste levende hoveling (met de vang-fx op DIE hoveling), in
     IV een teken, gif dat in de vloer tikt valt op het hof, en B5: telegraaf en teller nooit onder
     de duisternis. Alle getallen uit DICK en uit de spelcode (dicktatorVloer, dicktatorZittingNog). */
  const zit = page => page.evaluate(() => {
    const g = S.gevecht, b = dicktatorBaas(g);
    const z = document.querySelector('#baas-balk .bb-zitting'), k = document.querySelector('#baas-balk .bb-vloer');
    const chip = document.querySelector('.status-geschorst');
    const st = document.querySelector('#baas-balk .bb-proces');
    const h = (typeof dicktatorHofVanger === 'function' ? dicktatorHofVanger(g, b) : null);
    return {
      hp: b.hp, maxHp: b.maxHp, scene: dicktatorScene(b), geschorst: !!b._geschorst, vloer: dicktatorVloer(b), nog: dicktatorZittingNog(b),
      N: dicktatorMinZetten(dicktatorScene(b)), v2: b.v2Zet || 0, pil: b.intent ? b.intent.naam : '-',
      teller: z && !z.hidden ? z.textContent : null, tip: z && !z.hidden ? (z.dataset.tip || '') : '', kerf: k && !k.hidden ? parseFloat(k.style.left) : null,
      chip: !!chip, chipTip: chip ? (chip.dataset.tip || '') : '', strook: st ? st.textContent : '', strookTip: st ? (st.dataset.tip || '') : '',
      vanger: h ? { id: h.id, hp: h.hp } : null, hof: g.vijanden.filter(x => x !== b && !x.dood).map(x => x.id).join(',')
    };
  });
  /* één klap langs het normale pad; geeft de vang-fx terug die in DEZE tick verscheen, met zijn
     positie tegenover de vanger en de baas (de fx leeft 950 ms) */
  const klapVang = (page, n, vooraf) => page.evaluate(([n, vooraf]) => {
    const g = S.gevecht, b = dicktatorBaas(g);
    document.querySelectorAll('.fx-nummer').forEach(e => e.remove());
    const h = (typeof dicktatorHofVanger === 'function' ? dicktatorHofVanger(g, b) : null);
    if (h && vooraf && vooraf.vangerHp) { h.hp = vooraf.vangerHp; h.maxHp = Math.max(h.maxHp, vooraf.vangerHp); }
    const hVoor = h ? h.hp : null, bVoor = b.hp, st0 = S.stats.schade;
    if (vooraf && vooraf.kaart) aanvalOp(b, n); else verliesHp(b, n, sp());
    checkBaasFase(); renderGevecht();
    const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
    const hr = h ? rect(actorEl(h)) : null, br = rect(actorEl(b));
    const fx = [...document.querySelectorAll('.fx-nummer.fx-vang')].map(e => ({ tekst: e.textContent, x: parseFloat(e.style.left) }));
    const binnen = (x, r) => r && x >= r.l - 20 && x <= r.r + 20;
    return {
      bVoor, bNa: b.hp, hId: h ? h.id : null, hVoor, hNa: h ? Math.max(0, h.hp) : null, hDood: h ? !!h.dood : null,
      stats: S.stats.schade - st0, fx, fxOpVanger: fx.length > 0 && fx.every(f => binnen(f.x, hr)), fxOpBaas: fx.some(f => binnen(f.x, br) && !binnen(f.x, hr)),
      geschorst: !!b._geschorst, toast: [...document.querySelectorAll('#meldingen .toast')].map(e => e.textContent).join(' | ')
    };
  }, [n, vooraf || null]);

  kop('15a · DE ZITTING LOOPT in II: de teller, de inkeping, de vangst (laptop 1440×900)');
  ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
  await startProces(page);
  await beurt(page, 0);   /* DE AANZEGGING roept de griffier */
  const DZ = await page.evaluate(() => { const b = dicktatorBaas(S.gevecht); return { d2: dicktatorDrempel(b, 2), d3: dicktatorDrempel(b, 3), N2: dicktatorMinZetten(2), N3: dicktatorMinZetten(3), N4: dicktatorMinZetten(4), hofVangt: !!DICK.hofVangt }; });
  t(DZ.hofVangt && DZ.N2 > 0 && DZ.N3 > 0 && DZ.N4 > 0, `DICK: hofVangt ${DZ.hofVangt}, minZetten II/III/IV ${DZ.N2}/${DZ.N3}/${DZ.N4}`);
  let zs = await zit(page);
  t(zs.scene === 1 && zs.teller === null && zs.kerf === null && zs.vanger && zs.vanger.id === 'de_griffier', `scène I heeft geen vloer: geen teller, geen inkeping (vanger nu: ${zs.vanger && zs.vanger.id})`);
  /* het scèneslot: 10 te veel → de griffier vangt 10; GESCHORST met een eerlijke tekst */
  let kv = await klapVang(page, (zs.hp - DZ.d2) + 10);
  t(kv.bNa === DZ.d2 && kv.hId === 'de_griffier' && kv.hVoor - kv.hNa === 10, `het slot: ${kv.bVoor} → ${kv.bNa} (drempel ${DZ.d2}), de griffier vangt de 10 te veel: ${kv.hVoor} → ${kv.hNa}`);
  t(kv.fx.length === 1 && /⚖️ vangt 10/.test(kv.fx[0].tekst) && kv.fxOpVanger && !kv.fxOpBaas, `de vang-fx "${kv.fx.map(f => f.tekst).join(',')}" staat op de griffier, niet op de baas`);
  zs = await zit(page);
  t(zs.chip && /de scène is uit/.test(zs.chipTip) && /vangt zijn hof/.test(zs.chipTip), `GESCHORST (het slot, de scène IS uit): chip "${zs.chipTip}" (de strook bevriest tot de banner valt)`);
  await wachtVrij(page);
  zs = await zit(page);
  const vloer2 = DZ.d3 + 1;
  t(zs.scene === 2 && zs.vloer === vloer2 && zs.nog === DZ.N2 && zs.teller === '⚖ ZITTING LOOPT · nog ' + DZ.N2 && zs.chip && /GESCHORST/.test(zs.strook), `na de regie: GESCHORST in de strook ("${zs.strook}") en de teller "${zs.teller}" van de nieuwe zitting, vloer ${zs.vloer} (= drempel III + 1 = ${vloer2}), nog ${zs.nog}`);
  t(zs.kerf != null && Math.abs(zs.kerf - vloer2 / zs.maxHp * 100) < 0.2, `de inkeping staat op de vloer: ${zs.kerf && zs.kerf.toFixed(2)}% (verwacht ${(vloer2 / zs.maxHp * 100).toFixed(2)}%)`);
  t(new RegExp('minstens ' + DZ.N2 + ' zet').test(zs.tip) && new RegExp('niet onder ' + vloer2 + ' HP').test(zs.tip) && /HERSCHIKT DE ZAAL telt niet mee/.test(zs.tip) && !/cyclus/.test(zs.tip), `de tooltip: "${zs.tip}"`);
  let zb = await beurt(page, 0);
  zs = await zit(page);
  t(zb.naam === 'HERSCHIKT DE ZAAL' && zs.nog === DZ.N2 && !zs.chip && !/GESCHORST/.test(zs.strook), `HERSCHIKT telt niet mee: nog ${zs.nog}, de GESCHORST-chip is weg (${zs.chip})`);
  /* de vloer: 200 op de baas → hij stopt OP zijn vloer, de rest valt op de eerste levende hoveling */
  kv = await klapVang(page, 200, { vangerHp: 400 });
  t(kv.bNa === vloer2 && kv.hVoor - kv.hNa === 200 - (kv.bVoor - vloer2), `de vloer: ${kv.bVoor} → ${kv.bNa}, ${kv.hId} vangt ${kv.hVoor - kv.hNa} (= 200 − ${kv.bVoor - vloer2})`);
  t(!kv.geschorst && kv.fxOpVanger && !kv.fxOpBaas && /DE ZITTING LOOPT/.test(kv.toast), `F10: de vloer schorst niet (${kv.geschorst}); de vang-fx op ${kv.hId}; één melding: "${kv.toast}"`);
  zs = await zit(page);
  t(!zs.chip && !/GESCHORST/.test(zs.strook) && zs.teller === '⚖ ZITTING LOOPT · nog ' + DZ.N2 && /vangt zijn hof/.test(zs.tip), `op de vloer geen GESCHORST (chip ${zs.chip}, strook "${zs.strook}"), wel de teller: "${zs.teller}"`);
  /* F7: wat het hof vangt, telt als schade (op het hof) */
  kv = await klapVang(page, 30, { kaart: true });
  t(kv.bNa === vloer2 && kv.stats > 0 && kv.stats === kv.hVoor - kv.hNa, `F7: een kaartklap op de vloer: baas ${kv.bVoor} → ${kv.bNa}, S.stats.schade +${kv.stats} = wat ${kv.hId} verloor (${kv.hVoor - kv.hNa})`);
  /* de volgorde: van links naar rechts - valt de eerste, dan vangt de volgende */
  const volg = await page.evaluate(() => { const g = S.gevecht, b = dicktatorBaas(g); const levend = g.vijanden.filter(x => x !== b && !x.dood); const eerste = levend[0]; verliesHp(eerste, 9999, sp()); renderGevecht(); const nu = (typeof dicktatorHofVanger === 'function' ? dicktatorHofVanger(g, b) : null); return { eerste: eerste.id, volgende: levend[1] ? levend[1].id : null, nu: nu ? nu.id : null }; });
  t(volg.nu === volg.volgende, `de eerste hoveling (${volg.eerste}) valt → de vanger wordt de volgende van links: ${volg.nu} (verwacht ${volg.volgende})`);
  if (volg.nu) {
    kv = await klapVang(page, 25);
    t(kv.hId === volg.nu && kv.hVoor - kv.hNa === 25 && kv.bNa === vloer2, `${volg.nu} vangt nu de 25: ${kv.hVoor} → ${kv.hNa}`);
  }
  /* de teller telt af met zijn zetten; na de laatste is de vloer weg en valt de scène */
  const aftel = [];
  for (let i = 0; i < DZ.N2; i++) { await beurt(page, 0); const s2 = await zit(page); aftel.push((s2.teller || '-') + '/' + s2.nog); }
  zs = await zit(page);
  t(zs.nog === 0 && zs.vloer === null && zs.teller === null && zs.kerf === null, `teller na elke zet: ${aftel.join(' → ')}; daarna geen teller en geen inkeping`);
  kv = await klapVang(page, (zs.hp - DZ.d3) + 5);
  zs = await zit(page);
  t(kv.bNa === DZ.d3 && zs.scene === 3 && kv.geschorst, `de zitting is uit: een klap brengt hem op de drempel van III (${kv.bNa}), scène ${zs.scene}, geschorst ${kv.geschorst}`);
  t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);

  kop('15b · III: 1 HP tot na zijn zetten; gif dat in de vloer tikt, valt op het hof');
  await wachtVrij(page);
  zb = await beurt(page, 0);   /* HERSCHIKT van III */
  zs = await zit(page);
  t(zb.naam === 'HERSCHIKT DE ZAAL' && zs.scene === 3 && zs.vloer === 1 && zs.nog === DZ.N3 && zs.teller === '⚖ ZITTING LOOPT · nog ' + DZ.N3, `III: vloer ${zs.vloer} HP, teller "${zs.teller}", hof ${zs.hof}`);
  const gifIII = await page.evaluate(() => {
    const g = S.gevecht, b = dicktatorBaas(g);
    const h = (typeof dicktatorHofVanger === 'function' ? dicktatorHofVanger(g, b) : null);
    if (h) { h.hp = 400; h.maxHp = Math.max(h.maxHp, 400); h.blok = 0; }
    b.hp = 5; b.status = { gif: 20 }; renderGevecht();
    return { h: h ? h.id : null, hVoor: h ? h.hp : null, tik: Math.ceil(20 / 2) };
  });
  zb = await beurt(page, 0);
  const naGif = await page.evaluate(id => { const g = S.gevecht, b = dicktatorBaas(g); const h = g.vijanden.find(x => x.id === id); return { hp: b.hp, hHp: h ? h.hp : null, herrezen: !!b.herrezen }; }, gifIII.h);
  t(gifIII.h && naGif.hp === 1 && !naGif.herrezen && gifIII.hVoor - naGif.hHp === gifIII.tik - 4, `gif ${gifIII.tik} in de vijandbeurt vanaf 5 HP: de baas op ${naGif.hp} (geen herverkiezing), ${gifIII.h} vangt ${gifIII.hVoor - naGif.hHp} (= ${gifIII.tik} − 4)`);
  t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);

  /* B5: HET PROCES IS OPENBAAR - de teller valt niet onder de duisternis (het gat in het vignet),
     ook niet in DE TIRADE bij een gedoofde fakkel. Gemeten op de schermafdruk (pngjs, optioneel). */
  kop('15c · B5: de teller bij fakkel 0 in DE TIRADE (het gat in het fakkelvignet)');
  const gat = await page.evaluate(() => {
    S.fakkel = 0; zetLichtVisueel(); renderGevecht();
    const vig = document.getElementById('licht-vignet'), bb = document.getElementById('baas-balk');
    const cs = getComputedStyle(vig), r = bb.getBoundingClientRect();
    const px = k => parseFloat(vig.style.getPropertyValue(k));
    const g = { x: px('--gat-x'), y: px('--gat-y'), w: px('--gat-w'), h: px('--gat-h') };
    return { klasse: vig.classList.contains('proces-open'), tirade: document.body.classList.contains('tirade'), licht: lichtNiveau(), lagen: (cs.maskImage || cs.webkitMaskImage || '').split('linear-gradient').length - 1,
      dekt: g.x <= r.left && g.y <= r.top && g.x + g.w >= r.right && g.y + g.h >= r.bottom, opac: parseFloat(cs.opacity) };
  });
  t(gat.klasse && gat.lagen === 3 && gat.dekt && gat.licht === 'gedoofd', `het vignet draagt het gat (klasse ${gat.klasse}, ${gat.lagen} maskerlagen, dekt de bazenbalk ${gat.dekt}); fakkel gedoofd, tirade ${gat.tirade}, vignet ${gat.opac}`);
  let PNGm = null; try { PNGm = require('pngjs').PNG; } catch (e) { /* zonder pngjs: alleen de geometrie hierboven */ }
  if (PNGm) {
    await slaap(1400);   /* het vignet schuift in 1,2 s naar zijn donkerte */
    const clipT = await page.evaluate(() => { const e = document.querySelector('#baas-balk .bb-zitting'); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return r.width ? { x: Math.floor(r.left), y: Math.floor(r.top), width: Math.ceil(r.width), height: Math.ceil(r.height) } : null; });
    const p90 = buf => { const p = PNGm.sync.read(buf); const l = []; for (let i = 0; i < p.data.length; i += 4) l.push(0.2126 * p.data[i] + 0.7152 * p.data[i + 1] + 0.0722 * p.data[i + 2]); l.sort((a, b) => a - b); return Math.round(l[Math.floor(l.length * 0.9)]); };
    if (!clipT) t(false, 'de teller bij fakkel 0 in de tirade: er staat geen teller (dus ook geen helderheid)');
    else {
    const met = p90(await page.screenshot({ clip: clipT }));
    await page.evaluate(() => document.getElementById('licht-vignet').classList.remove('proces-open'));
    await slaap(150);
    const zonder = p90(await page.screenshot({ clip: clipT }));
    await page.evaluate(() => renderGevecht());   /* het gat komt terug */
    await page.screenshot({ path: path.join(UIT, 'zitting-fakkel0-1440x900.png') }).catch(() => {});
    t(met >= 150 && met >= zonder, `de teller bij fakkel 0 in de tirade: helderheid (p90) ${met} met het gat, ${zonder} zonder (doel ≥ 150; mobiel rechtsboven is het verschil het grootst, zie de beeldcontrole)`);
    }
  } else console.log('   (pngjs ontbreekt: de helderheidsmeting van 15c overgeslagen)');
  /* de telegraaf: geen '?' of '❓' op de pillen van de baas en het hof, hoe donker ook */
  const tel0 = await page.evaluate(() => { const out = []; for (const f of [20, 0]) { S.fakkel = f; renderGevecht(); out.push({ f, licht: lichtNiveau(), pillen: S.gevecht.vijanden.filter(x => !x.dood).map(x => x.id.replace(/^de_/, '') + ':' + (actorEl(x) && actorEl(x).querySelector('.intent') ? actorEl(x).querySelector('.intent').textContent.trim() : '-')) }); } S.fakkel = 100; zetLichtVisueel(); renderGevecht(); return out; });
  t(tel0.every(o => o.pillen.length && o.pillen.every(p => !/[?❓]/.test(p))), `de telegraaf onder de duisternis: ${tel0.map(o => o.licht + ' → ' + o.pillen.join(' | ')).join(' ;; ')}`);
  t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);
  await ctx.close();

  kop('15d · IV: de vloer tot na zijn eerste ONTSLAG, met een teken (zonder hof: niets vangt)');
  ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
  await startProces(page, { tirade: true });   /* de DEV-landing in III zet de vloer voor III uit; IV is een nieuwe scène */
  await page.evaluate(() => { const b = dicktatorBaas(S.gevecht); verliesHp(b, b.hp, sp()); checkBaasFase(); renderGevecht(); });
  await wachtVrij(page);
  zs = await zit(page);
  t(zs.scene === 4 && zs.vloer === 1 && zs.nog === DZ.N4 && zs.hof === '', `IV: vloer ${zs.vloer} HP, nog ${zs.nog}, hof "${zs.hof}"`);
  const totOntslag = DZ.N4 % 2 === 0;   /* de zitting van IV loopt af met een even zet = HET ONTSLAG */
  t(totOntslag ? (zs.teller === '⚖ valt na zijn ONTSLAG' && /valt pas na zijn ONTSLAG/.test(zs.tip)) : /nog /.test(zs.teller || ''), `het teken in IV: "${zs.teller}" (tip: "${zs.tip}")`);
  t(/gaat verloren/.test(zs.tip) && !/vangt zijn hof/.test(zs.tip), 'zonder hof belooft de tekst geen vangst: "wat je klap te veel heeft, gaat verloren"');
  kv = await klapVang(page, 999);
  t(kv.bNa === 1 && kv.hId === null && kv.fx.length === 0 && !kv.geschorst, `een klap van 999 in IV: ${kv.bVoor} → ${kv.bNa}, geen vanger, geen vang-fx, niet geschorst`);
  const ivZet = [];
  for (let i = 0; i < DZ.N4; i++) { const r = await beurt(page, 0); const s2 = await zit(page); ivZet.push(r.naam + ' → ' + (s2.teller || 'geen teller')); }
  zs = await zit(page);
  t(zs.vloer === null && zs.teller === null && (!totOntslag || /HET ONTSLAG/.test(ivZet[ivZet.length - 1])), `IV: ${ivZet.join(' ; ')}`);
  kv = await klapVang(page, 999);
  const ivEind = await page.evaluate(() => ({ voorbij: !S.gevecht || !!S.gevecht.voorbij, dood: !!(dicktatorBaas(S.gevecht) || {}).dood }));
  t(ivEind.dood || ivEind.voorbij, `na zijn ONTSLAG valt hij: dood ${ivEind.dood}, gevecht voorbij ${ivEind.voorbij}`);
  t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);
  await ctx.close();

  /* ================= 16 · DE TELLER OP DRIE FORMATEN ================= */
  for (const vp of [{ w: 1440, h: 900, naam: 'laptop 1440×900' }, { w: 800, h: 360, mobiel: true, naam: 'mobiel 800×360' }, { w: 412, h: 915, mobiel: true, naam: 'mobiel 412×915' }]) {
    kop('16 · de teller en de inkeping (' + vp.naam + ')');
    ({ ctx, page } = await open(browser, vp));
    await startProces(page);
    await page.evaluate(() => { const b = dicktatorBaas(S.gevecht); verliesHp(b, 999, sp()); checkBaasFase(); renderGevecht(); });
    await wachtVrij(page);
    const geo = await page.evaluate(() => {
      const r = s => { const e = document.querySelector(s); if (!e || e.hidden) return null; const x = e.getBoundingClientRect(); return x.width ? { l: x.left, r: x.right, t: x.top, b: x.bottom, w: x.width, h: x.height } : null; };
      const tekstEl = document.querySelector('#baas-balk .bb-tekst');
      let tekst = null;
      if (tekstEl && tekstEl.firstChild) { const rg = document.createRange(); rg.selectNodeContents(tekstEl); const x = rg.getBoundingClientRect(); tekst = { l: x.left, r: x.right, t: x.top, b: x.bottom }; }
      const ov = (a, b) => !!(a && b) && !(a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t);
      const z = r('#baas-balk .bb-zitting'), balk = r('#baas-balk .bb-balk'), label = r('#beurt-label'), strook = r('#baas-balk .bb-proces');
      const W = innerWidth, H = innerHeight;
      return {
        z, W, H, tekstZ: ov(z, tekst), labelZ: ov(z, label), strookZ: ov(z, strook), inBalk: !!(z && balk && z.l >= balk.l - 1 && z.r <= balk.r + 1),
        binnen: !!(z && z.l >= 0 && z.t >= 0 && z.r <= W && z.b <= H), tekst: (document.querySelector('#baas-balk .bb-zitting') || {}).textContent || '',
        kerf: r('#baas-balk .bb-vloer'), links: !!(z && tekst && z.r <= tekst.l + 1)
      };
    });
    t(geo.z && geo.binnen, `de teller staat binnen ${geo.W}×${geo.H}: "${geo.tekst}" (${geo.z && Math.round(geo.z.w)}×${geo.z && Math.round(geo.z.h)} op ${geo.z && Math.round(geo.z.l)},${geo.z && Math.round(geo.z.t)})`);
    t(!geo.tekstZ && !geo.labelZ && !geo.strookZ, `geen overlap met het HP-getal (${geo.tekstZ}), #beurt-label (${geo.labelZ}) of de strook (${geo.strookZ})`);
    if (vp.mobiel) t(/^⚖\d+$/.test(geo.tekst) && geo.links && !geo.kerf, `mobiel: "${geo.tekst}" links van het HP-getal, geen inkeping (${!!geo.kerf})`);
    else t(geo.inBalk && !!geo.kerf, `laptop: de teller in de HP-balk (${geo.inBalk}) en de inkeping staat (${!!geo.kerf})`);
    await page.screenshot({ path: path.join(UIT, `zitting-${vp.w}x${vp.h}.png`) }).catch(() => {});
    t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);
    await ctx.close();
  }

  /* ================= 17 · REVIEW B4a VONDST 1 · DE TELEGRAAF LIEGT NIET IN ZIJN EIGEN BEURT ================= */
  /* Vroeger: zijn gif-tik viel op de vloer (II) of op het scèneslot (I), het hof ving de tik, de
     griffier stierf eraan, bijDood liet de baas opnieuw kiezen - vóór eindBeurt de pil las - en HET
     DECREET ("geen schade") werd stil EIGENHANDIG VONNIS. T1 en T1b zijn de naspelingen van de
     review (rev_b4a_breek.js); 17c dwingt de dood van de griffier in dat venster af (de vangrail
     achter A4: dan geen herkeuze, en een zitting zonder griffier kost geen schade en geen kaart). */
  const vijandbeurt = async (page, vooraf) => {
    const voor = await page.evaluate(v => {
      const g = S.gevecht, b = dicktatorBaas(g);
      if (v) (new Function('g', 'b', v))(g, b);
      g.speler.blok = 0; g.speler.status = {};
      document.querySelectorAll('#meldingen .toast').forEach(e => e.remove());
      renderGevecht();
      const verwacht = g.vijanden.filter(x => !x.dood).reduce((s, x) => s + intentVerwachteSchade(x), 0);
      window.__uitgevoerd = [];
      if (!window.__wrapAanval) {
        window.__wrapAanval = true;
        const oud = window.vijandAanval;
        window.vijandAanval = function (x, basis) { window.__uitgevoerd.push({ wie: x.id, basis, pil: x.intent ? x.intent.naam : '-' }); return oud.apply(this, arguments); };
      }
      const gr = hofLid(g, 'de_griffier');
      return { pil: b.intent ? b.intent.naam : '-', verwacht, sHp: S.hp, dek: S.dek.length, dec: b.decreten || 0, gr: gr ? gr.hp : null };
    }, vooraf || null);
    await page.evaluate(() => { if (typeof window.__dickKeuze !== 'function') window.__dickKeuze = (A, B) => A; eindBeurt(); });
    await slaap(200);
    await wachtVrij(page, 30000);
    const na = await page.evaluate(() => {
      const g = S.gevecht, b = dicktatorBaas(g), gr = g.vijanden.find(x => x.id === 'de_griffier'), dw = g.vijanden.find(x => x.id === 'de_deurwaarder');
      return {
        sHp: S.hp, dek: S.dek.length, dec: b.decreten || 0, pil: b.intent ? b.intent.naam : '-', uit: window.__uitgevoerd || [],
        gr: gr ? { hp: gr.hp, dood: !!gr.dood } : null, dw: dw ? { hp: dw.hp, dood: !!dw.dood } : null,
        toasts: [...document.querySelectorAll('#meldingen .toast')].map(e => e.textContent).join(' | ')
      };
    });
    return { voor, na, verloren: voor.sHp - na.sHp, uitTekst: na.uit.map(x => x.wie.replace(/^de_/, '') + ':' + x.pil + ' ' + x.basis).join(', ') || 'geen klap' };
  };
  const naarDecreetII = async page => {
    await startProces(page);
    await vijandbeurt(page);   /* DE AANZEGGING roept de griffier */
    await page.evaluate(() => { const b = dicktatorBaas(S.gevecht); verliesHp(b, b.hp - dicktatorDrempel(b, 2), sp()); checkBaasFase(); renderGevecht(); });
    await wachtVrij(page, 30000);
    for (let i = 0; i < 3; i++) await vijandbeurt(page);   /* HERSCHIKT, KARAKTERMOORD (dossier van II), de rekening */
    return page.evaluate(() => { const g = S.gevecht, b = dicktatorBaas(g); return { pil: b.intent.naam, vloer: dicktatorVloer(b), dossier: g.aangezegd ? g.aangezegd.size : 0, griffier: !!hofLid(g, 'de_griffier'), dw: !!hofLid(g, 'de_deurwaarder') }; });
  };

  kop('17a · T1 · II: zijn gif tikt in de vloer, het hof vangt, HET DECREET blijft HET DECREET');
  ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
  let st17 = await naarDecreetII(page);
  if (st17.pil === 'HET DECREET' && st17.vloer && st17.griffier && st17.dw) {
    const r = await vijandbeurt(page, "b.hp = dicktatorVloer(b); b.status.gif = 30; const gr = hofLid(g, 'de_griffier'); gr.hp = 10; gr.blok = 0;");
    t(r.voor.pil === 'HET DECREET' && r.verloren === r.voor.verwacht && !r.na.uit.some(x => x.wie === 'de_dicktator'), `de pil zei "${r.voor.pil}" (${r.voor.verwacht} schade op het bord); je verloor ${r.verloren} (${r.uitTekst})`);
    t(r.na.gr && !r.na.gr.dood && r.na.gr.hp === 1 && r.na.dw && r.na.dw.hp > 0, `A4: de griffier vangt tot op 1 HP (10 → ${r.na.gr && r.na.gr.hp}), de rest valt op de deurwaarder (${r.na.dw && r.na.dw.hp} HP)`);
    t(r.na.dec === r.voor.dec + 1 && r.na.dek === r.voor.dek - 1, `het decreet viel zoals getelegrafeerd: decreten ${r.voor.dec} → ${r.na.dec}, dek ${r.voor.dek} → ${r.na.dek}`);
  } else t(false, 'opzet 17a mislukt: ' + JSON.stringify(st17));
  t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);
  await ctx.close();

  kop('17b · T1b · I: zijn gif duwt hem op het scèneslot, de griffier vangt, HET DECREET blijft HET DECREET');
  ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
  await startProces(page);
  await vijandbeurt(page); await vijandbeurt(page);   /* DE AANZEGGING, VONNISSLAG */
  st17 = await page.evaluate(() => { const g = S.gevecht, b = dicktatorBaas(g); return { pil: b.intent.naam, griffier: !!hofLid(g, 'de_griffier'), dossier: g.aangezegd ? g.aangezegd.size : 0 }; });
  if (st17.pil === 'HET DECREET' && st17.griffier) {
    const r = await vijandbeurt(page, "b.hp = dicktatorDrempel(b, 2) + 2; b.status.gif = 12; const gr = hofLid(g, 'de_griffier'); gr.hp = 3; gr.blok = 0;");
    t(r.voor.pil === 'HET DECREET' && r.verloren === r.voor.verwacht && !r.na.uit.some(x => x.wie === 'de_dicktator'), `I: de pil zei "${r.voor.pil}" (${r.voor.verwacht}); je verloor ${r.verloren} (${r.uitTekst})`);
    t(r.na.gr && !r.na.gr.dood && r.na.gr.hp === 1 && r.na.dec === r.voor.dec + 1, `A4: de griffier (3 HP) vangt 2 en leeft (${r.na.gr && r.na.gr.hp} HP), de rest vervalt; het decreet viel (${r.voor.dec} → ${r.na.dec})`);
  } else t(false, 'opzet 17b mislukt: ' + JSON.stringify(st17));
  t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);
  await ctx.close();

  kop('17c · de vangrail: sterft de griffier TOCH in zijn beurt (vóór zijn zet), dan geen herkeuze, geen schade, geen kaart');
  ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
  st17 = await naarDecreetII(page);
  if (st17.pil === 'HET DECREET' && st17.griffier) {
    /* eenmalige haak: net na de gif-tik van de baas sterft de griffier (welke weg dan ook) */
    await page.evaluate(() => {
      const oud = window.verliesHp;
      window.__doodNaTik = true;
      window.verliesHp = function (d) {
        const r = oud.apply(this, arguments);
        if (window.__doodNaTik && d && d.id === 'de_dicktator') { window.__doodNaTik = false; const gr = hofLid(S.gevecht, 'de_griffier'); if (gr) oud(gr, 999); }
        return r;
      };
    });
    const r = await vijandbeurt(page, 'b.status.gif = 4;');
    t(r.voor.pil === 'HET DECREET' && r.verloren === r.voor.verwacht && !r.na.uit.some(x => x.wie === 'de_dicktator'), `de pil zei "${r.voor.pil}" (${r.voor.verwacht}); de griffier stierf vóór de zet (${JSON.stringify(r.na.gr)}); je verloor ${r.verloren} (${r.uitTekst})`);
    t(r.na.gr && r.na.gr.dood && r.na.dek === r.voor.dek && r.na.dec === r.voor.dec, `zonder griffier geen decreet - en geen kaart: dek ${r.voor.dek} → ${r.na.dek}, decreten ${r.voor.dec} → ${r.na.dec}`);
    t(/Zonder griffier geen decreet/.test(r.na.toasts), `een melding zegt het: "${r.na.toasts}"`);
    const verder = await vijandbeurt(page);
    t(verder.verloren === verder.voor.verwacht, `de volgende zet staat gewoon op de pil ("${verder.voor.pil}": ${verder.verloren} = ${verder.voor.verwacht})`);
  } else t(false, 'opzet 17c mislukt: ' + JSON.stringify(st17));
  t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);
  await ctx.close();

  /* ================= 18 · A4 · HET HOF VANGT DE KLAP, MAAR DE GRIFFIER STERFT ER NIET AAN ================= */
  kop('18 · A4 · de griffier vangt tot op zijn bodem, de rest valt op de volgende hoveling of vervalt');
  ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
  await startProces(page, { hof: true });   /* II: griffier + deurwaarder (in die volgorde); de DEV-landing zet de vloer uit */
  const vang18 = (page, n, zet) => page.evaluate(([n, zet]) => {
    const g = S.gevecht, b = dicktatorBaas(g);
    const gr = hofLid(g, 'de_griffier'), dw = hofLid(g, 'de_deurwaarder');
    if (zet) (new Function('g', 'b', 'gr', 'dw', zet))(g, b, gr, dw);
    document.querySelectorAll('.fx-nummer').forEach(e => e.remove());
    const vl = (typeof dicktatorVloer === 'function') ? dicktatorVloer(b) : null;
    const weg = n - Math.max(0, b.hp - (vl == null ? 0 : vl));
    const verdeling = (typeof dicktatorHofVangst === 'function') ? dicktatorHofVangst(g, b, weg).map(x => x.h.id.replace(/^de_/, '') + ':' + x.n).join(',') : 'geen dicktatorHofVangst';
    const voor = { gr: gr ? gr.hp : null, dw: dw ? dw.hp : null, b: b.hp };
    verliesHp(b, n, sp()); renderGevecht();
    const fx = [...document.querySelectorAll('.fx-nummer.fx-vang')].map(e => e.textContent);
    const v = (typeof dicktatorHofVanger === 'function') ? dicktatorHofVanger(g, b) : null;
    return { voor, na: { gr: gr ? gr.hp : null, grDood: gr ? !!gr.dood : null, dw: dw ? dw.hp : null, b: b.hp }, gevangen: b._slotGevangenLaatst || 0, fx, verdeling, vanger: v ? v.id : null };
  }, [n, zet || null]);
  /* de vloer aanzetten zoals na een echte overgang: minVrij uit, de zitting net begonnen */
  const r18a = await vang18(page, 60, 'b.minVrij = false; b.sceneStart = (b.beurtTeller || 0) + 1; b.hp = dicktatorVloer(b) || b.hp; gr.hp = 10; dw.hp = 200; dw.maxHp = Math.max(dw.maxHp, 200);');
  t(r18a.na.b === r18a.voor.b && r18a.na.gr === 1 && !r18a.na.grDood && r18a.voor.dw - r18a.na.dw === 51 && r18a.gevangen === 60, `60 op de vloer: de griffier 10 → ${r18a.na.gr} (vangt 9), de deurwaarder vangt ${r18a.voor.dw - r18a.na.dw} (51), samen ${r18a.gevangen}; verdeling uit de spelcode "${r18a.verdeling}"`);
  t(r18a.fx.length === 2 && /vangt 9\b/.test(r18a.fx.join()) && /vangt 51\b/.test(r18a.fx.join()), `twee vang-fx, elk op wie ving: ${JSON.stringify(r18a.fx)}`);
  const r18b = await vang18(page, 20);
  t(r18b.na.gr === 1 && r18b.voor.dw - r18b.na.dw === 20 && r18b.vanger === 'de_deurwaarder', `de griffier op zijn bodem vangt niets meer: de deurwaarder vangt ${r18b.voor.dw - r18b.na.dw}, de vanger is nu ${r18b.vanger}`);
  const r18c = await vang18(page, 30, 'dw.hp = 5;');
  /* een andere hoveling vangt wat er over is, zoals vóór A4 de eerste vanger alles ving: wat hij
     niet draagt, is overkill zoals bij elke klap (geen ketting naar de volgende) */
  t(r18c.na.gr === 1 && r18c.na.dw === 0 && r18c.gevangen === 30 && r18c.verdeling === 'deurwaarder:30', `de deurwaarder (5 HP) vangt de 30 en sterft eraan; de griffier blijft op ${r18c.na.gr} (verdeling "${r18c.verdeling}", gevangen ${r18c.gevangen})`);
  const tip18 = await page.evaluate(() => { const b = dicktatorBaas(S.gevecht); const t2 = dicktatorZittingTeller(b); return { vanger: (typeof dicktatorHofVanger === 'function' && dicktatorHofVanger(S.gevecht, b) || {}).id || null, tip: t2 ? t2.tip : '', gesch: dicktatorGeschorstTip(b) }; });
  t(tip18.vanger === null && /gaat verloren/.test(tip18.tip) && !/vangt zijn hof/.test(tip18.gesch), `met enkel een griffier op zijn bodem belooft geen tekst een vangst: teller "…${tip18.tip.slice(-44)}", GESCHORST "…${tip18.gesch.slice(-16)}"`);
  /* het Galgentouw executeert de griffier niet op een vangst, wel op jouw klap */
  const galg = await page.evaluate(() => {
    const g = S.gevecht, b = dicktatorBaas(g), gr = hofLid(g, 'de_griffier');
    if (!S.relikwieen.includes('galgentouw')) S.relikwieen.push('galgentouw');
    gr.hp = 6; b.hp = dicktatorVloer(b) || b.hp;
    verliesHp(b, 40, sp());
    const naVangst = { hp: gr.hp, dood: !!gr.dood };
    const drempel = Math.ceil((gr.maxHp || 1) * 0.1);
    gr.hp = drempel + 1; verliesHp(gr, 1, sp());
    return { naVangst, naKlap: { hp: gr.hp, dood: !!gr.dood }, drempel };
  });
  t(galg.naVangst.hp === 1 && !galg.naVangst.dood && galg.naKlap.dood, `Galgentouw: na een vangst leeft de griffier (${JSON.stringify(galg.naVangst)}); jouw klap tot op ${galg.drempel} HP executeert hem wel (${JSON.stringify(galg.naKlap)})`);
  t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);
  await ctx.close();

  /* ================= 19 · REVIEW B4a · DE OUVERTURE WIJKT VOOR DE REGIE ================= */
  kop('19 · de openingsklap valt TERWIJL "I · DE AANKLACHT" staat: de regie van II ruimt de banner op t=0 op');
  ({ ctx, page } = await open(browser, { w: 1440, h: 900 }));
  await startProces(page);
  let ouv = false;
  for (let i = 0; i < 200 && !ouv; i++) { ouv = await page.evaluate(() => [...document.querySelectorAll('.baas-flits')].some(e => /AANKLACHT/.test(e.textContent))); if (!ouv) await slaap(50); }
  const o19 = await page.evaluate(() => {
    DICK.tempo = 1;   /* de regie op spelsnelheid, zoals de speler hem ziet */
    const b = dicktatorBaas(S.gevecht); verliesHp(b, 999, sp()); checkBaasFase(); renderGevecht();
    return { meteen: [...document.querySelectorAll('.baas-flits')].filter(e => /AANKLACHT/.test(e.textContent)).length, scene: dicktatorScene(b) };
  });
  const later19 = [];
  for (const ms of [300, 700, 500]) {
    await slaap(ms);
    later19.push(await page.evaluate(() => ({ aanklacht: [...document.querySelectorAll('.baas-flits')].filter(e => /AANKLACHT/.test(e.textContent)).length, factuur: [...document.querySelectorAll('[class*="vonnis"]')].some(e => /FACTUUR/.test(e.textContent || '')) })));
  }
  t(ouv && o19.scene === 2 && o19.meteen === 0 && later19.every(x => x.aanklacht === 0), `de banner stond (${ouv}); na de klap (scène ${o19.scene}): AANKLACHT meteen ${o19.meteen}, na 0,3 / 1,0 / 1,5 s ${later19.map(x => x.aanklacht).join(' / ')}`);
  t(later19.some(x => x.factuur), `de regie van II speelt wel ("II · DE FACTUUR" in beeld: ${later19.map(x => x.factuur).join(' / ')})`);
  await page.screenshot({ path: path.join(UIT, 'ouverture-1440x900.png') }).catch(() => {});
  t(page.__f.length === 0, `geen JS-fouten (${JSON.stringify(page.__f.slice(0, 3))})`);
  await ctx.close();

  await browser.close();
  console.log('\n============================================');
  console.log(fout === 0 ? `FINALE ACCEPTATIE: ALLES GROEN — ${ok} ok` : `FINALE ACCEPTATIE: ${ok} ok, ${fout} FOUT`);
  console.log('============================================');
  process.exit(fout ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
