/* DE ERFPRINS — meetharnas (B3 "De Roof, eerlijk", ijking 27 sep 2026).
   Naar het model van dick_meting.js en het O1-harnas (bazen_onderzoek/ontwerp/O1-roof-eerlijk.md
   §7, O1-roof-eerlijk_hermeting.md §4, jury_bouw.md W2). Draait de ECHTE spelcode headless
   (Playwright) tegen de Act 2-baas, SOLO, en meet per gevecht: winst, rondes, HP-verlies, de
   schadebronnen (plagiaat, driftbui, gif-tik, zijn gespiegelde Doornen, zijn eigen zet, je eigen
   kaarten), de Roof (buit en worp), het Spiegelrecht, de vloek-beet, het noodrantsoen en de
   eerlijkheid van de pil (pil aan het einde van je beurt tegen wat er in zijn beurt landt).

   ERF in js/game.js is de bron van waarheid voor alle getallen. Dit harnas leest ERF uit de pagina
   en zet per variant andere waarden (MEET_VAR + MEET_VARIANTEN); het wijzigt geen spelcode.

   - GEEN server: de bestanden komen via route.fulfill vanaf SCHIJF op een verzonnen host
     (localhost:4173, geen netwerk). Service workers geblokkeerd.
   - window.slaap = () => Promise.resolve() maakt de beats snel; klank, schok en saves staan uit.
   - SOLO: de metgezellen zijn geparkeerd (METGEZELLEN_AAN = false); elk gevecht toetst dat.

   DE DEKKEN — D's realistische Act 2-aankomst (85 % HP, fakkel vol) met de Drempeltafel-uitkomst:
     matig      = niets van de tafel (geknald of niet gespeeld), 1 Laster
     gemiddeld  = sport I: + een zeldzame kaart
     kroon      = sport II: het gemiddelde dek + de Kroon van Sintels (+1 Energie elke beurt; telt als 'sterk')
     sterk      = sport III: het sterke dek + een zeldzame kaart + een gesmede kaart (twee basiskaarten geofferd)
     sterkkroon = de échte sport III-uitbetaling (de wand houdt enkel de laagste sport): sterk + de Kroon
   DE BELEIDSREGELS (dezelfde seeds voor elk beleid → gepaard):
     naief     = greedy waarde-bot (D): leest de pil, weet niets van de Roof-regels
     bewust    = kent de regels: in beurt 1 eerst wat iets oplevert, de aanval (die de Roof ontketent)
                 als laatste; rekent zijn gespiegelde Doornen mee; blokt zoals D (gewicht 1,05)
     schild    = bewust + blokt PRECIES het blokbare deel van de pil weg (gewicht 2,2) en geeft Zwak
                 dubbel waarde als er een klap op de pil staat (O1-hermeting §4)
     slim      = schild + plant zijn hele hand in één keer (beste combinatie binnen zijn energie, niet
                 kaart per kaart), telt het onblokbare deel en de Doornen-prijs per treffer exact
     nietslaan = CONTROLE: bewust, maar slaat NIET in beurt 1 (de Roof valt dan op het einde van je
                 beurt). Mag nooit beter scoren dan bewust — Thomas' "de eerste aanval gaat door".

   Gebruik (Git Bash, vanuit de scratchpad met NODE_PATH naar node_modules):
     node tools/baas-meting/erfprins_meting.js [seeds=24] [label=meting]
     node tools/baas-meting/erfprins_meting.js --analyse <uitvoer.json> [<nog.json> …] [variant]   (meerdere = gepoold)
   opties (env):
     MEET_HELDEN=slachter,gifmagier,thoverk
     MEET_STERKTES=matig,gemiddeld,sterk,kroon          (+ sterkkroon als gevoeligheid)
     MEET_BELEID=naief,bewust,schild,slim,nietslaan
     MEET_VAR=basis[,naam…]  MEET_VARIANTEN=<json-bestand {naam:{knoppen:{…ERF…},mods:[…]}}>
       mods: vloek1 · vloek2 (extra Lasters)
     MEET_SEEDBASE=70000 (seeds 'ERF-<base+i>')   MEET_HP=0.85   MEET_WERKERS=8   MEET_RECYCLE=40
     MEET_UIT=<pad> (standaard: <label>.json naast dit script)
     MEET_TUSSEN=1000 (tussenstand elke zoveel gevechten)   MEET_HERVAT=1 (ga verder op de tussenstand in MEET_UIT)
     SLAYIT_WORKTREE=<map met index.html> (standaard: de repo van dit script)
     SLAYIT_PLAYWRIGHT=<pad naar node_modules/playwright> (anders: require('playwright') via NODE_PATH) */
const fs = require('fs'), path = require('path');

/* ============================================================ DOELEN (bazen_plan.md §5) */
const DOEL = {
  matig: [10, 25], gemiddeld: [45, 60], sterk: [70, 85], kroon: [0, 85],
  spreiding: 20, rondes: [6, 10], beleid: ['bewust', 'schild', 'slim'],
  /* DE MARGE (architectbeslissing B3, 27 sep): een doel telt als GEHAALD als de gepoolde waarde in de
     band ligt of er hoogstens 3 pp buiten valt — de marge van een gepoold blok is ~ ±7 pp. Dat geldt
     voor de winstbanden, de spreiding en de controle 'nietslaan ≤ bewust'; de rondes blijven strikt
     6-10. MEET_MARGE=0 geeft het strikte oordeel. */
  marge: parseFloat(process.env.MEET_MARGE || '3')
};

/* ============================================================ ANALYSE (ook los: --analyse) */
function pct(a, n) { return n ? (100 * a / n) : 0; }
function med(xs) { if (!xs.length) return 0; const s = xs.slice().sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function gem(xs) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
function fmt(x, d = 0) { return (Math.round(x * 10 ** d) / 10 ** d).toFixed(d); }
function wilson(k, n) {
  if (!n) return [0, 0];
  const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), r = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [100 * (c - r) / d, 100 * (c + r) / d];
}
const HELD_KORT = { slachter: 'Slachter', gifmagier: 'Gifmagiër', thoverk: 'Kolendruïde' };
const ST_VOLG = ['matig', 'gemiddeld', 'sterk', 'kroon', 'sterkkroon'];
const BEL_VOLG = ['naief', 'bewust', 'schild', 'slim', 'nietslaan'];

function analyseer(resultaten, variant) {
  const R = resultaten.filter(r => !r.fout && (!variant || r.variant === variant));
  const fouten = resultaten.filter(r => r.fout && (!variant || r.variant === variant));
  const regels = [];
  const zeg = s => regels.push(s);
  const groep = (f) => { const m = new Map(); for (const r of R) { const k = f(r); if (!m.has(k)) m.set(k, []); m.get(k).push(r); } return m; };
  const helden = [...new Set(R.map(r => r.held))];
  const sterktes = ST_VOLG.filter(s => R.some(r => r.st === s));
  const beleiden = BEL_VOLG.filter(b => R.some(r => r.beleid === b));
  const cel = groep(r => `${r.beleid}|${r.held}|${r.st}`);
  const winPct = rs => pct(rs.filter(r => r.gewonnen).length, rs.length);
  zeg(`gevechten ${R.length} · fouten ${fouten.length} · time-outs ${R.filter(r => r.timeout).length} · solo ${R.filter(r => r.soloOk && !r.metgezelGezien).length}/${R.length}`);
  /* ---- hoofdtabel ---- */
  zeg('');
  zeg('| beleid | held · sterkte | n | winst [95 %-BI] | rondes med. (winst) | HP-verlies bij winst med. | op jou per gevecht: plagiaat · driftbui · gif-tik · 🌵spiegel · zijn zet · eigen | op hem: direct · gif · doornen · vloek | noodrantsoen | spiegel vuurt | vloek bijt |');
  zeg('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const b of beleiden) for (const st of sterktes) for (const h of helden) {
    const rs = cel.get(`${b}|${h}|${st}`); if (!rs) continue;
    const n = rs.length, w = rs.filter(r => r.gewonnen);
    const [lo, hi] = wilson(w.length, n);
    const som = (veld, k) => gem(rs.map(r => ((r[veld] || {})[k] || 0)));
    zeg(`| ${b} | ${HELD_KORT[h] || h} · ${st} | ${n} | **${fmt(pct(w.length, n))} %** [${fmt(lo)}-${fmt(hi)}] | ${fmt(med(rs.map(r => r.rondes)), 1)} (${fmt(med(w.map(r => r.rondes)), 1)}) | ${fmt(med(w.map(r => r.hpStart - r.hpOver)))} | ${fmt(som('bron', 'plagiaat'))} · ${fmt(som('bron', 'driftbui'))} · ${fmt(som('bron', 'gif-tik'))} · ${fmt(som('bron', 'spiegel-doornen'))} · ${fmt(som('bron', 'eigen zet'))} · ${fmt(som('bron', 'zelf'))} | ${fmt(som('uit', 'direct'))} · ${fmt(som('uit', 'gif'))} · ${fmt(som('uit', 'doornen'))} · ${fmt(som('uit', 'vloek-backfire'))} | ${fmt(pct(rs.filter(r => r.nr).length, n))} % | ${fmt(pct(rs.filter(r => (r.spiegel || []).length).length, n))} % | ${fmt(pct(rs.filter(r => (r.backfire || []).length).length, n))} % |`);
  }
  /* ---- gepoold per beleid en sterkte + spreiding ---- */
  zeg('');
  zeg('| beleid | ' + sterktes.map(s => s).join(' | ') + ' | spreiding gemiddeld (per held) | rondes med. per sterkte |');
  zeg('|---|' + sterktes.map(() => '---').join('|') + '|---|---|');
  const oordeel = {};
  for (const b of beleiden) {
    const cellen = sterktes.map(st => {
      const rs = R.filter(r => r.beleid === b && r.st === st);
      /* gepoold = het gemiddelde van de helden (elke held telt even zwaar) */
      const perHeld = helden.map(h => winPct(rs.filter(r => r.held === h)));
      return { st, w: gem(perHeld), perHeld, n: rs.length, rondes: med(rs.map(r => r.rondes)) };
    });
    const gm = cellen.find(c => c.st === 'gemiddeld');
    const spr = gm ? Math.max(...gm.perHeld) - Math.min(...gm.perHeld) : 0;
    oordeel[b] = { cellen, spr };
    zeg(`| ${b} | ` + cellen.map(c => `${fmt(c.w)} %`).join(' | ') + ` | ${fmt(spr)} pp (${gm ? gm.perHeld.map(x => fmt(x)).join(' / ') : '-'}) | ${cellen.map(c => fmt(c.rondes, 1)).join(' / ')} |`);
  }
  /* ---- doelen ---- */
  zeg('');
  zeg('DOELEN (' + DOEL.beleid.join(', ') + '): matig 10-25 · gemiddeld 45-60 · sterk 70-85 · kroon ≤ 85 · spreiding gemiddeld ≤ 20 pp · rondes 6-10 (mediaan per sterkte)');
  zeg(`MARGE ${fmt(DOEL.marge)} pp: een doel telt als GEHAALD als de gepoolde waarde in de band ligt of er hoogstens ${fmt(DOEL.marge)} pp buiten valt (winst, spreiding, nietslaan); de rondes strikt.`);
  let alles = true;
  const tekort = [], krap = [];
  const M = DOEL.marge + 1e-9;
  for (const b of DOEL.beleid) {
    if (!oordeel[b]) { alles = false; tekort.push(`${b}: niet gemeten`); continue; }
    for (const c of oordeel[b].cellen) {
      const band = DOEL[c.st]; if (!band) continue;
      const buiten = c.w < band[0] ? band[0] - c.w : (c.w > band[1] ? c.w - band[1] : 0);
      if (buiten > M) { alles = false; tekort.push(`${b} ${c.st} ${fmt(c.w)} % (doel ${band[0]}-${band[1]})`); }
      else if (buiten > 1e-9) krap.push(`${b} ${c.st} ${fmt(c.w, 1)} % (${fmt(buiten, 1)} pp buiten de band)`);
      if (c.st !== 'sterkkroon' && (c.rondes < DOEL.rondes[0] || c.rondes > DOEL.rondes[1])) { alles = false; tekort.push(`${b} ${c.st} rondes ${fmt(c.rondes, 1)} (doel 6-10)`); }
    }
    if (oordeel[b].spr > DOEL.spreiding + M) { alles = false; tekort.push(`${b} spreiding ${fmt(oordeel[b].spr)} pp`); }
    else if (oordeel[b].spr > DOEL.spreiding) krap.push(`${b} spreiding ${fmt(oordeel[b].spr, 1)} pp`);
  }
  /* de controle: niet slaan in beurt 1 mag nooit beter zijn dan bewust (per sterkte, gepaard) */
  if (oordeel.nietslaan && oordeel.bewust) {
    for (const st of sterktes) {
      const a = R.filter(r => r.beleid === 'bewust' && r.st === st), z = R.filter(r => r.beleid === 'nietslaan' && r.st === st);
      const wa = a.filter(r => r.gewonnen).length, wz = z.filter(r => r.gewonnen).length;
      const kA = new Map(a.map(r => [r.held + r.seed, r.gewonnen])); let gered = 0, verloren = 0;
      for (const r of z) { const x = kA.get(r.held + r.seed); if (x === undefined) continue; if (r.gewonnen && !x) gered++; if (!r.gewonnen && x) verloren++; }
      const d = pct(wz, z.length) - pct(wa, a.length);
      const ok = d <= 1e-9, binnen = d <= M;
      if (!binnen) { alles = false; tekort.push(`nietslaan ${st} ${fmt(pct(wz, z.length))} % > bewust ${fmt(pct(wa, a.length))} %`); }
      else if (!ok) krap.push(`nietslaan ${st} +${fmt(d, 1)} pp boven bewust`);
      zeg(`controle nietslaan · ${st}: ${fmt(pct(wz, z.length))} % tegen bewust ${fmt(pct(wa, a.length))} % (gepaard: ${gered} gered, ${verloren} verloren) ${ok ? 'ok' : (binnen ? 'binnen de marge' : 'FOUT')}`);
    }
  } else { alles = false; tekort.push('controle nietslaan niet gemeten'); }
  zeg(alles ? `GEHAALD (marge ${fmt(DOEL.marge)} pp): alle doelen voor bewust, schild en slim, en nietslaan ≤ bewust.` : 'NIET GEHAALD: ' + tekort.join(' · '));
  if (krap.length) zeg('binnen de marge, buiten de strikte band: ' + krap.join(' · '));
  /* ---- beslist de kern? ---- */
  zeg('');
  const kern = R.filter(r => r.st !== 'sterkkroon');
  const verl = kern.filter(r => r.dood);
  const doods = {}; verl.forEach(r => { const k = r.doodsBron || '?'; doods[k] = (doods[k] || 0) + 1; });
  zeg('laatste klap op jou (verliezen): ' + Object.entries(doods).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${fmt(pct(v, verl.length))} %`).join(' · '));
  const winst = kern.filter(r => r.gewonnen);
  zeg(`noodrantsoen vuurt in ${fmt(pct(kern.filter(r => r.nr).length, kern.length))} % van de gevechten; ${fmt(pct(winst.filter(r => r.nr).length, winst.length))} % van de winsten vroeg een tweede kill; ♥+N = HP bij het opstaan: ${kern.filter(r => r.nr && r.nr.pil === r.nr.hp).length}/${kern.filter(r => r.nr).length}`);
  zeg(`het Spiegelrecht vuurt in ${fmt(pct(kern.filter(r => (r.spiegel || []).length).length, kern.length))} % van de gevechten; spiegelschade op jou gemiddeld ${fmt(gem(kern.map(r => r.spiegelSchade || 0)), 1)} HP per gevecht (Doornen ${fmt(gem(kern.map(r => (r.bron || {})['spiegel-doornen'] || 0)), 1)} · Kracht op zijn klappen ${fmt(gem(kern.map(r => r.krachtDeel || 0)), 1)} · Gifklieren-gif ${fmt(gem(kern.map(r => (r.gifOpJou || {}).klieren || 0)), 1)})`);
  zeg(`de vloek bijt hem in ${fmt(pct(kern.filter(r => (r.backfire || []).length).length, kern.length))} % van de gevechten (${fmt(gem(kern.filter(r => (r.backfire || []).length).map(r => r.backfire.reduce((a, x) => a + x.n, 0))), 1)} HP als hij bijt); driftbuien per gevecht ${fmt(gem(kern.map(r => r.drift || 0)), 2)}`);
  /* de worp van de Roof: tercielen van de buitwaarde binnen cellen waar 15-85 % wint */
  const terc = [[0, 0], [0, 0], [0, 0]];
  for (const [k, rs] of cel) {
    const w = winPct(rs); if (w < 15 || w > 85 || rs.length < 12) continue;
    const s = rs.filter(r => r.roof).slice().sort((a, b) => a.roof.waarde - b.roof.waarde);
    s.forEach((r, i) => { const t = Math.min(2, Math.floor(3 * i / s.length)); terc[t][0] += r.gewonnen ? 1 : 0; terc[t][1]++; });
  }
  zeg(`de worp van de Roof (winst per terciel van de buitwaarde, laag → hoog): ${terc.map(([a, n]) => fmt(pct(a, n)) + ' %').join(' → ')}`);
  /* de pil: eerlijk? */
  const pc = kern.flatMap(r => r.pilChecks || []).filter(p => !p.nr && !p.dood);
  const pcOk = pc.filter(p => p.pil === p.klap && p.pilGif === p.gif).length;
  const wis = kern.filter(r => (r.wissels || []).length);
  zeg(`de pil = wat landt: ${pcOk}/${pc.length} plagiaatbeurten (schade én gif); zet-wissels binnen jouw beurt: ${wis.length} gevechten (${wis.filter(r => r.wissels.every(x => x.nr)).length} na een noodrantsoen)`);
  zeg(`de Roof: via je klap ${kern.filter(r => r.roof && r.roof.viaAanval).length}, op het einde van je beurt ${kern.filter(r => r.roof && !r.roof.viaAanval).length}; buit gemiddeld ${fmt(gem(kern.filter(r => r.roof).map(r => r.roof.aantal)), 1)} kaarten`);
  return { tekst: regels.join('\n'), gehaald: alles, tekort, oordeel };
}

/* als module (require) doet het harnas niets zelf: tools/erfprins_acceptatie.js hergebruikt de dekken,
   de beleidsregels en één gevecht (module.exports onderaan) */
if (require.main === module && process.argv[2] === '--analyse') {
  /* meerdere uitvoerbestanden = gepoold (bv. twee bevestigingsblokken met verse seeds) */
  const bestanden = process.argv.slice(3).filter(a => /\.json$/i.test(a));
  const variant = process.argv.slice(3).find(a => !/\.json$/i.test(a));
  const res = [];
  for (const f of bestanden) JSON.parse(fs.readFileSync(f, 'utf8')).resultaten.forEach(r => res.push(r));
  const varianten = variant ? [variant] : [...new Set(res.map(r => r.variant))];
  console.log(`gepoold uit ${bestanden.join(' + ')}`);
  for (const v of varianten) { console.log(`\n=== variant ${v} ===`); console.log(analyseer(res, v).tekst); }
  return;
}

/* ============================================================ OPZET */
function laadPlaywright() {
  const kandidaten = [process.env.SLAYIT_PLAYWRIGHT, 'playwright',
    'C:\\Users\\THOMAS~1\\AppData\\Local\\Temp\\claude\\C--Users-Thomas-Aelbrecht-Desktop-Workspace-SLAY-IT\\d5a4f6f7-f7ad-4aad-921d-259730d2111c\\scratchpad\\node_modules\\playwright'].filter(Boolean);
  for (const k of kandidaten) { try { return require(k); } catch (e) { /* volgende */ } }
  throw new Error('Playwright niet gevonden: zet NODE_PATH of SLAYIT_PLAYWRIGHT=<pad naar node_modules/playwright>');
}
const { chromium } = laadPlaywright();
const WORTEL = process.env.SLAYIT_WORKTREE || path.resolve(__dirname, '..', '..');
const HOST = 'localhost:4173';
const BASIS = 'http://' + HOST + '/';
const N = parseInt(process.argv[2] || '24', 10);
const LABEL = process.argv[3] || 'meting';
const lijst = (env, std) => (process.env[env] ? process.env[env].split(',').map(s => s.trim()).filter(Boolean) : std);
const HELDEN = lijst('MEET_HELDEN', ['slachter', 'gifmagier', 'thoverk']);
const STERKTES = lijst('MEET_STERKTES', ['matig', 'gemiddeld', 'sterk', 'kroon']);
const BELEID = lijst('MEET_BELEID', ['naief', 'bewust', 'schild', 'slim', 'nietslaan']);
const VARS = lijst('MEET_VAR', ['basis']);
const WERKERS = parseInt(process.env.MEET_WERKERS || '8', 10);
const HPPCT = parseFloat(process.env.MEET_HP || '0.85');
const SEEDBASE = parseInt(process.env.MEET_SEEDBASE || '70000', 10);
const RECYCLE = parseInt(process.env.MEET_RECYCLE || '40', 10);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.glb': 'model/gltf-binary' };
const VARIANTEN = Object.assign({ basis: { knoppen: {} } },
  (() => { if (!process.env.MEET_VARIANTEN) return {}; return JSON.parse(fs.readFileSync(process.env.MEET_VARIANTEN, 'utf8')); })());

/* ============================================================
   DE ACT 2-AANKOMSTDEKKEN (onderzoeker D, O1 §7.1) — alleen kaarten met act <= 2
   ============================================================ */
const D_BUILDS = {
  slachter: {
    matig: { held: 'slachter', hp: 76, relikwieen: ['brandend_bloed', 'wetsteen', 'anker'], dranken: [], laster: 1,
      dek: [['slag', 0], ['slag', 0], ['slag', 0], ['slag', 0], ['slag', 0], ['verdediging', 0], ['verdediging', 0], ['verdediging', 0], ['verdediging', 0], ['knal', 1],
            ['dubbelslag', 0], ['zware_klap', 0], ['ijzeren_golf', 0], ['klingenstorm', 0], ['schildmuur', 0], ['uithaal', 0], ['executie', 0], ['molensteen', 0]] },
    gemiddeld: { held: 'slachter', hp: 80, relikwieen: ['brandend_bloed', 'krachtsteen', 'stempelkussen', 'oorlogsbanier'], dranken: ['heeldrank'], laster: 0,
      dek: [['slag', 1], ['slag', 0], ['slag', 0], ['slag', 0], ['verdediging', 1], ['verdediging', 0], ['verdediging', 0], ['verdediging', 0], ['knal', 0],
            ['zware_klap', 1], ['afgekeurd', 0], ['executie', 0], ['uithaal', 0], ['in_drievoud', 0], ['dubbelslag', 0], ['schildmuur', 1], ['schildmuur', 0],
            ['metaalhuid', 0], ['vlammende_hartstocht', 0], ['ijzeren_golf', 0], ['bolwerk', 0]] },
    sterk: { held: 'slachter', hp: 86, relikwieen: ['brandend_bloed', 'krachtsteen', 'stalen_vuist', 'stempelkussen', 'brandmerkijzer', 'oorlogsbanier'], dranken: ['heeldrank', 'heeldrank'], laster: 0,
      dek: [['slag', 1], ['slag', 1], ['slag', 0], ['verdediging', 1], ['verdediging', 1], ['verdediging', 0], ['knal', 1],
            ['zware_klap', 1], ['originele_handtekening', 0], ['afgekeurd', 1], ['executie', 0], ['uithaal', 1], ['in_drievoud', 0], ['bloedoffer', 0],
            ['genadeslag', 0], ['vlammende_hartstocht', 1], ['metaalhuid', 0], ['schildmuur', 1], ['bolwerk', 0], ['geindexeerd', 0], ['dubbelslag', 0], ['schildmuur', 0]] }
  },
  gifmagier: {
    matig: { held: 'gifmagier', hp: 68, relikwieen: ['slangenamulet', 'bottenfluit', 'anker'], dranken: [], laster: 1,
      dek: [['prik', 0], ['prik', 0], ['prik', 0], ['prik', 0], ['verdediging', 0], ['verdediging', 0], ['verdediging', 0], ['verdediging', 0], ['dodelijke_kus', 0], ['gifflits', 1],
            ['giftige_steek', 0], ['slangenbeet', 0], ['venijnregen', 0], ['sluiproute', 0], ['gifwolk', 0], ['snelle_steek', 0], ['verlammend_gif', 0], ['schildmuur', 0]] },
    gemiddeld: { held: 'gifmagier', hp: 72, relikwieen: ['slangenamulet', 'smaragden_ring', 'oorlogsbanier', 'stempelkussen'], dranken: ['heeldrank'], laster: 0,
      dek: [['prik', 1], ['prik', 0], ['prik', 0], ['verdediging', 1], ['verdediging', 0], ['verdediging', 0], ['verdediging', 0], ['dodelijke_kus', 1], ['gifflits', 1], ['gifflits', 0],
            ['giftige_steek', 0], ['slangenbeet', 0], ['giftand', 0], ['inktklerk_steek', 0], ['naaperij', 0], ['sluiproute', 1], ['sluiproute', 0], ['verlammend_gif', 0],
            ['gifwolk', 0], ['katalyse', 0], ['snelle_steek', 0]] },
    sterk: { held: 'gifmagier', hp: 76, relikwieen: ['slangenamulet', 'smaragden_ring', 'inktpot', 'oorlogsbanier', 'stempelkussen', 'bloedrobijn'], dranken: ['heeldrank', 'heeldrank'], laster: 0,
      dek: [['prik', 1], ['prik', 0], ['verdediging', 1], ['verdediging', 0], ['verdediging', 0], ['dodelijke_kus', 1], ['gifflits', 1], ['gifflits', 1],
            ['inktklerk_steek', 0], ['inktklerk_steek', 0], ['giftand', 1], ['katalyse', 1], ['nachtschade', 0], ['naaperij', 1], ['slangenbeet', 0], ['registerrot', 0],
            ['gifklieren', 0], ['sluiproute', 1], ['sluiproute', 0], ['bolwerk', 0], ['verlammend_gif', 0], ['snelle_steek', 1]] }
  },
  thoverk: {
    matig: { held: 'thoverk', hp: 72, relikwieen: ['houten_been', 'warme_mantel', 'anker'], dranken: [], laster: 1,
      dek: [['takkenslag', 0], ['takkenslag', 0], ['takkenslag', 0], ['takkenslag', 0], ['verdediging', 0], ['verdediging', 0], ['verdediging', 0], ['verdediging', 0], ['vonkenbeet', 1], ['stoofpotje', 0],
            ['wortelgreep', 0], ['doornzweep', 0], ['bastvel', 0], ['sporenstoot', 0], ['stoofgeur', 0], ['perkamentslag', 0], ['eikenhuid', 0], ['schildmuur', 0]] },
    gemiddeld: { held: 'thoverk', hp: 76, relikwieen: ['houten_been', 'bronzen_schub', 'oorlogsbanier', 'stempelkussen'], dranken: ['heeldrank'], laster: 0,
      dek: [['takkenslag', 1], ['takkenslag', 0], ['takkenslag', 0], ['verdediging', 1], ['verdediging', 0], ['verdediging', 0], ['verdediging', 0], ['vonkenbeet', 1], ['stoofpotje', 0],
            ['wurgwortels', 0], ['sporenstoot', 0], ['perkamentslag', 0], ['doorslag_doornen', 0], ['bastvel', 1], ['bastvel', 0], ['eikenhuid', 0], ['kolengloed', 0],
            ['doornzweep', 0], ['wortelgreep', 0], ['stoofgeur', 0], ['doornmantel', 0]] },
    sterk: { held: 'thoverk', hp: 82, relikwieen: ['houten_been', 'bronzen_schub', 'krachtsteen', 'oorlogsbanier', 'stempelkussen', 'mosamulet'], dranken: ['heeldrank', 'heeldrank'], laster: 0,
      dek: [['takkenslag', 1], ['takkenslag', 0], ['verdediging', 1], ['verdediging', 0], ['verdediging', 0], ['vonkenbeet', 1], ['wurgwortels', 1], ['sporenstoot', 1],
            ['doorslag_doornen', 0], ['perkamentslag', 1], ['het_origineel_kaart', 0], ['doornmantel', 1], ['duivelspact', 0], ['kolenstempel', 0], ['bastvel', 1], ['bastvel', 0],
            ['eikenhuid', 0], ['knalsigaar', 0], ['wortelgreep', 0], ['stoofgeur', 0], ['stoofpotje', 0], ['doornzweep', 0]] }
  }
};
/* DE DREMPELTAFEL (v128): sport I = een zeldzame kaart naar keuze; sport II = de Kroon van Sintels;
   sport III = het Slachtblok (twee basiskaarten geofferd → één gesmede kaart, 6 punten). */
const TAFEL = {
  slachter: { zeldzaam: { gemiddeld: 'genadeslag', sterk: 'demonenvorm' }, offers: ['slag', 'verdediging'],
    smeed: { naam: 'Het Gesmede Werk', icoon: '🪓', kost: 2, maker: 'slachter', modules: [{ m: 'schade', p: 4 }, { m: 'blok', p: 2 }], offers: ['Slag', 'Verdediging'] } },
  gifmagier: { zeldzaam: { gemiddeld: 'nachtschade', sterk: 'energiekern' }, offers: ['prik', 'verdediging'],
    smeed: { naam: 'Het Gesmede Werk', icoon: '☠️', kost: 2, maker: 'gifmagier', modules: [{ m: 'schade', p: 2 }, { m: 'gif', p: 4 }], offers: ['Prik', 'Verdediging'] } },
  thoverk: { zeldzaam: { gemiddeld: 'knalsigaar', sterk: 'sporenkring' }, offers: ['takkenslag', 'verdediging'],
    smeed: { naam: 'Het Gesmede Werk', icoon: '🌹', kost: 2, maker: 'thoverk', modules: [{ m: 'schade', p: 3 }, { m: 'groei', p: 3 }], offers: ['Takkenslag', 'Verdediging'] } }
};
function tafelBuild(held, st) {
  const basisSt = (st === 'kroon') ? 'gemiddeld' : (st === 'sterkkroon' ? 'sterk' : st);
  const b = JSON.parse(JSON.stringify(D_BUILDS[held][basisSt]));
  const t = TAFEL[held];
  b.uitkomst = { matig: 'niets', gemiddeld: 'sport I (zeldzame kaart)', kroon: 'sport II (de Kroon van Sintels)', sterk: 'sport III (zeldzame kaart + gesmede kaart)', sterkkroon: 'sport III zoals de wand uitbetaalt (Kroon + gesmede kaart + zeldzame)' }[st];
  if (st === 'gemiddeld' || st === 'sterk' || st === 'sterkkroon') b.dek.push([t.zeldzaam[basisSt], 0]);
  if (st === 'sterk' || st === 'sterkkroon') {
    for (const off of t.offers) { const i = b.dek.findIndex(([id, up]) => id === off && !up); if (i >= 0) b.dek.splice(i, 1); }
    b.gesmeed = t.smeed;
  }
  if (st === 'kroon' || st === 'sterkkroon') b.relikwieen.push('kroon_van_sintels');
  return b;
}

function maakJobs() {
  const jobs = [];
  for (const variant of VARS) for (const held of HELDEN) for (const st of STERKTES) for (const beleid of BELEID) for (let i = 0; i < N; i++) {
    const vdef = VARIANTEN[variant]; if (!vdef) throw new Error('onbekende variant ' + variant);
    jobs.push({ cel: `${variant}/${beleid}/${held}/${st}`, variant, held, st, beleid, hpPct: HPPCT, seed: 'ERF-' + (SEEDBASE + i),
      knoppen: vdef.knoppen || {}, mods: vdef.mods || [], build: tafelBuild(held, st) });
  }
  return jobs;
}

/* ============================================================ IN DE PAGINA: instrumentatie (eenmalig) */
function installeer() {
  window.slaap = () => Promise.resolve();
  try { Klank.sfx = () => {}; Klank.muziek = () => {}; Klank.duck = () => {}; } catch (e) {}
  window.schudScherm = () => {};
  window.saveSpel = () => {};
  window.wisSave = () => {};
  window.bewaarCodex = () => {};
  try { INST.d3 = false; INST.lite = true; INST.spraak = false; } catch (e) {}
  document.body.classList.add('lite');
  window.__ERF_STD = JSON.parse(JSON.stringify(ERF));
  window.gevechtGewonnen = async function () { const g = S.gevecht; if (!g || g.voorbij) return; g.voorbij = true; g._gewonnen = true; };
  window.nederlaag = function () { const g = S.gevecht; if (!g || g.voorbij) return; g.voorbij = true; g._verloren = true; };
  window.__T = null; window.__lab = null; window.__inActie = false; window.__doornTerug = false; window.__inDS = 0;
  const T = () => window.__T;
  const baasVan = g => g ? g.vijanden.find(v => v.id === 'de_erfprins') : null;

  /* DE ROOF: wat hij neemt (samenstelling en waarde — de worp) */
  const oCut = window.copycatRoofCutscene;
  window.copycatRoofCutscene = async function (g, v, wil, viaEindBeurt) {
    const t = T(); const voor = (v.gestolen || []).length; const trekVoor = (g.trek || []).length;
    const r = await oCut(g, v, wil, viaEindBeurt);
    if (t) {
      const nieuw = (v.gestolen || []).slice(voor);
      const f2 = { fase: 2, copyKracht: ERF.toeslag[2] };
      const gifSom = n => { let s = 0; for (let i = Math.min(n, 6); i > 0; i--) s += i; return s; };   /* gif op jou tikt n, n-1, … (6 beurten) */
      const waarde = nieuw.reduce((som, s) => som + (s.soort === 'aanval' ? copycatPlagiaatDmg(f2, s.n)
        : s.soort === 'gif' ? gifSom(Math.round((s.n || 0) * ERF.gifMult)) * 0.6
        : s.soort === 'overig' ? erfDriftbui(f2) : s.soort === 'spiegel' ? 6 * ((s.kr || 0) + (s.dr || 0) + (s.kl || 0)) : 0), 0);
      const tel = so => nieuw.filter(s => s.soort === so).length;
      t.roof = { beurt: g.beurt, viaAanval: !viaEindBeurt, wil, trekVoor, aantal: nieuw.length, waarde,
        aanval: tel('aanval'), blok: tel('blok'), gif: tel('gif'), spiegel: tel('spiegel'), zwak: tel('zwak'), vloek: tel('vloek'), overig: tel('overig') };
    }
    return r;
  };
  const oHer = window.copycatHerroof;
  window.copycatHerroof = function (v, g) {
    const t = T(); const voor = (v.gestolen || []).length;
    const r = oHer(v, g);
    if (t) t.naroof.push({ beurt: g.beurt, n: (v.gestolen || []).length - voor });
    return r;
  };
  /* elk teruggespeeld effect: het label van de schade (plagiaat of driftbui) en het Spiegelrecht */
  const oToon = window.copycatToonGespeeld;
  window.copycatToonGespeeld = async function (k, s, e, v) {
    const t = T();
    window.__lab = (e && e.soort === 'drift') ? 'driftbui' : 'plagiaat';
    if (t && e) {
      if (e.soort === 'drift') t.drift++;
      if (e.soort === 'spiegel') t.spiegel.push({ beurt: S.gevecht.beurt, kr: e.kr || 0, dr: e.dr || 0, kl: e.kl || 0 });
      if ((e.soort === 'klap' || e.soort === 'drift') && v) t.krachtDeel += Math.max(0, (v.status.kracht || 0)) * (e.klap ? e.klap.treffers : 1);
      if (e.soort === 'blok') t.blokVoorHem += e.n || 0;
    }
    return oToon(k, s, e, v);
  };
  const oSpeel = window.copycatSpeelTerug;
  window.copycatSpeelTerug = async function (v, g, plan) {
    const t = T(); const oud = window.__lab; window.__lab = 'plagiaat'; window.__inActie = true;
    try { return await oSpeel(v, g, plan); }
    finally { window.__lab = oud; window.__inActie = false; if (t) { t.plagiaatBeurten++; t.plagiaatKaarten += (plan || []).length; } }
  };
  const oVA = window.vijandAanval;
  window.vijandAanval = function (v, basis, gedwongen, opts) {
    const oud = window.__lab; window.__lab = 'eigen zet'; window.__inActie = true;
    try { return oVA(v, basis, gedwongen, opts); } finally { window.__lab = oud; window.__inActie = false; }
  };
  const oGG = window.geefGif;
  window.geefGif = function (doel, n) {
    const t = T(); const g = S.gevecht;
    if (t && doel && doel.isSpeler && n > 0) {
      const b = baasVan(g);
      if (window.__lab === 'plagiaat' || window.__lab === 'driftbui') { t.gifOpJou.plagiaat += n; t.rGif += n; }
      else if (g && g.vijandAanZet && b && (b.status.gifklieren || 0) === n) t.gifOpJou.klieren += n;
      else t.gifOpJou.ander += n;
    }
    return oGG(doel, n);
  };
  const oDS = window.doeSchade;
  window.doeSchade = function (doel, dmg, bron) {
    const t = T(); const g = S.gevecht;
    if (t && doel && doel.isSpeler && bron && !bron.isSpeler) {
      if (window.__lab === 'plagiaat' || window.__lab === 'driftbui') t.rPlag += glasDmg(dmg);
      t.geblokt += Math.min(doel.blok || 0, glasDmg(dmg));
    }
    const oudD = window.__doornTerug;
    if (doel && doel.id === 'de_erfprins' && bron && bron.isSpeler) window.__doornTerug = true;
    window.__inDS++;
    try { return oDS(doel, dmg, bron); } finally { window.__inDS--; window.__doornTerug = oudD; }
  };
  const oVH = window.verliesHp;
  window.verliesHp = function (doel, n, bron) {
    const t = T(); const g = S.gevecht;
    if (t && doel && n > 0) {
      if (doel.isSpeler) {
        const echt = Math.min(n, S.hp);
        let lab;
        if (window.__doornTerug && !bron) lab = 'spiegel-doornen';
        else if (window.__lab) lab = window.__lab;
        else if (t._inBeurtStart) lab = 'gif-tik';
        else if (t._zelf) lab = 'zelf';
        else if (bron && !bron.isSpeler) lab = 'overig-vijand';
        else lab = 'overig';
        t.bron[lab] = (t.bron[lab] || 0) + echt;
        /* het onblokbare deel van een klap (rechtstreeks verliesHp, niet via doeSchade) */
        if (window.__inDS === 0 && (lab === 'plagiaat' || lab === 'driftbui')) t.rPlag += n;
        if (echt > 0 && S.hp - n <= 0 && !t.doodsBron) t.doodsBron = lab;
      } else if (doel.id === 'de_erfprins') {
        const echt = Math.max(0, Math.min(n, doel.hp));
        let soort;
        if (g && g._vloekGreep) soort = 'vloek-backfire';
        else if (bron && bron.isSpeler) soort = 'direct';
        else if (window.__inActie) soort = 'doornen';
        else soort = 'gif';
        t.uit[soort] = (t.uit[soort] || 0) + echt;
        if (soort === 'vloek-backfire') t.backfire.push({ beurt: g.beurt, n: echt });
      }
    }
    return oVH(doel, n, bron);
  };
  /* HET NOODRANTSOEN: ♥+N op de pil tegen de HP waarmee hij opstaat */
  const oNR = window.copycatNoodrantsoenVuurt;
  window.copycatNoodrantsoenVuurt = function (doel) {
    const t = T(); const g = S.gevecht;
    const voor = (typeof copycatNoodrantsoen === 'function') ? copycatNoodrantsoen(doel) : null;
    const r = oNR(doel);
    if (t && r) t.nr = { beurt: g.beurt, hp: doel.hp, pil: voor ? voor.hp : null, kaarten: voor ? voor.kaarten : null, inVijandbeurt: !!(g && g.vijandAanZet) };
    return r;
  };
  const oFase = window.checkCopycatFase;
  window.checkCopycatFase = function (b, g) {
    const t = T(); const voor = b.fase || 1;
    const r = oFase(b, g);
    if (t && (b.fase || 1) > voor) t.fases.push({ fase: b.fase, beurt: g.beurt, hpPct: Math.round(100 * b.hp / b.maxHp) });
    return r;
  };
  const oBSB = window.beginSpelerBeurt;
  window.beginSpelerBeurt = function () {
    const t = T(); if (t) t._inBeurtStart = true;
    try { return oBSB(); } finally { if (t) t._inBeurtStart = false; }
  };
}

/* ============================================================ IN DE PAGINA: één gevecht */
async function eenGevecht({ job }) {
  const build = job.build;
  const beleid = job.beleid;
  if (S && S.gevecht) { try { S.gevecht.voorbij = true; stopGevechtLus(); } catch (e) {} }
  /* ERF: de standaard uit game.js + de knoppen van deze variant (geneste objecten samengevoegd) */
  const std = JSON.parse(JSON.stringify(window.__ERF_STD));
  const kn = JSON.parse(JSON.stringify(job.knoppen || {}));
  for (const k of Object.keys(ERF)) delete ERF[k];
  Object.assign(ERF, std);
  for (const [k, v] of Object.entries(kn)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && ERF[k] && typeof ERF[k] === 'object' && !Array.isArray(ERF[k])) ERF[k] = Object.assign({}, ERF[k], v);
    else ERF[k] = v;
  }
  VIJANDEN.de_erfprins.hp = [ERF.hp, ERF.hp];

  nieuwSpel(build.held, job.seed);
  S.gevecht = null; S.act = 2; S.fakkel = fakkelMax(); S.pos = null; S.ascensie = 0; S.daily = false; S.dagwet = null;
  delete S.beloning; delete S.winkel; delete S.huidigEvent;
  S.maxHp = build.hp; S.hp = Math.round(build.hp * job.hpPct);
  S.relikwieen = build.relikwieen.slice();
  S.dek = build.dek.map(([id, up]) => { const c = nieuweKaart(id); c.up = !!up; return c; });
  if (build.gesmeed) {
    const id = 'gesmeed_run_900';
    S.gesmeed = {}; S.gesmeed[id] = JSON.parse(JSON.stringify(build.gesmeed));
    registreerGesmeed(id, S.gesmeed[id]);
    S.dek.push(nieuweKaart(id));
  }
  S.dranken = (build.dranken || []).slice();
  const lasters = (build.laster || 0) + (job.mods.includes('vloek2') ? 2 : 0) + (job.mods.includes('vloek1') ? 1 : 0);
  for (let i = 0; i < lasters; i++) S.dek.push(nieuweKaart('laster'));
  S.metgezel = null; S.runMetgezel = null;
  Codex.erfprinsOntmoetingen = 3;   /* niet de eerste ontmoeting: de korte kaart-intro, geen Inventaris-verhaal */
  S.kaart = genereerKaart();
  const hpStart = S.hp, dekStart = S.dek.length;
  const T = window.__T = { bron: {}, uit: {}, geblokt: 0, roof: null, naroof: [], nr: null, backfire: [], fases: [], spiegel: [], drift: 0, krachtDeel: 0, blokVoorHem: 0,
    gifOpJou: { plagiaat: 0, klieren: 0, ander: 0 }, plagiaatBeurten: 0, plagiaatKaarten: 0, rPlag: 0, rGif: 0,
    _zelf: false, _inBeurtStart: false, doodsBron: null, wissels: [], pilChecks: [], metgezelGezien: false };
  startGevecht(['de_erfprins'], 'baas', 15);
  const g = S.gevecht;
  const soloOk = !(typeof gMet === 'function' && gMet()) && !g.metgezel;
  const boss = () => g.vijanden.find(v => v.id === 'de_erfprins');
  const spl = () => g.speler;
  const vrij = async () => { let w = 0; while ((g.ceremonie || g.bezig || g._regieBezig) && w++ < 600 && S.gevecht === g && !g.voorbij) await new Promise(r => setTimeout(r, 15)); };
  await new Promise(r => setTimeout(r, 120));
  await vrij();
  document.querySelectorAll('#baas-intro, .baas-intro').forEach(n => { try { n.remove(); } catch (e) {} });

  /* ---------------- SPELER-AI ---------------- */
  const bewustig = beleid !== 'naief';
  const precies = beleid === 'schild' || beleid === 'slim';
  /* de pil van zijn zet, opgesplitst: blokbaar · dwars door je Blok · Gif (één bron: erfEffecten) */
  const pilVan = v => {
    const it = v && v.intent; const P = { blokbaar: 0, door: 0, gif: 0, klap: false };
    if (!it || v.dood) return P;
    if (it.type === 'plagiaat') {
      for (const e of erfEffecten(v, it.plan)) {
        if (e.vervalt) continue;
        if (e.klap) { P.blokbaar += glasDmg(e.klap.blokbaar) * e.klap.treffers; P.door += glasDmg(e.klap.door) * e.klap.treffers; P.klap = true; }
        if (e.soort === 'gif') P.gif += e.n;
      }
      return P;
    }
    if (it.type === 'aanval') { P.blokbaar = (typeof intentVerwachteSchade === 'function') ? intentVerwachteSchade(v) : (it.dmg || 0); P.klap = P.blokbaar > 0; }
    return P;
  };
  const R_ = () => { const b = boss(); return Math.max(2, Math.min(6, Math.ceil(((b && b.hp) || 60) / 28))); };
  const gifWaarde = (add, huidig, R, halveer) => {
    let met = 0, zonder = 0;
    for (let t = 0; t < R; t++) {
      const a = Math.max(0, huidig + add - t), z = Math.max(0, huidig - t);
      met += halveer ? Math.ceil(a / 2) : a; zonder += halveer ? Math.ceil(z / 2) : z;
    }
    return met - zonder;
  };
  /* treffers op hem per kaart (voor de Doornen-prijs): reeksAanval(t, x, N) = N, elke andere aanval 1 */
  const trefCache = {};
  const treffersVan = c => {
    const d = kdef(c); if (!d || d.type !== 'aanval') return 0;
    if (trefCache[c.id] != null) return trefCache[c.id];
    const m = String(d.speel || '').match(/reeksAanval\([^,]+,[^,]+,\s*(\d+)/);
    return (trefCache[c.id] = m ? parseInt(m[1], 10) : 1);
  };
  const ctxNu = () => {
    const b = boss(); const s = spl();
    const P = pilVan(b);
    const blok = (s.blok || 0) + (s.status.metaalhuid || 0);
    const ink = P.blokbaar + P.door;
    /* naïef leest één getal; wie de regels kent, weet welk deel door je Blok gaat */
    const nodig = bewustig ? Math.max(0, P.blokbaar - blok) : Math.max(0, ink - blok);
    const dodelijk = (bewustig ? nodig + P.door : nodig) >= S.hp;
    return { P, ink, nodig, dodelijk };
  };
  /* de waarde van één kaart: { v (alles behalve Blok), blok (hoeveel Blok ze geeft) } */
  const waarde = (c, R, ctx) => {
    const b = boss(); const d = kdef(c); const raw = veld => kval(c, veld) || 0;
    const t = b; const s = spl();
    const kr = (s.status.kracht || 0) + relikwieSchadeBonus();
    const zw = (s.status.zwak || 0) > 0 ? 0.75 : 1;
    const eerste = !(g.aanvalDezeBeurt > 0);
    const wet = (heeftRelikwie('wetsteen') && !g.wetsteenGebruikt) ? 4 : 0;
    const kwVan = x => (x.status.kwetsbaar || 0) > 0 || (eerste && heeftRelikwie('stempelkussen') && d.type === 'aanval');
    const hit = (basis, x, extra = 0) => {
      x = x || t; if (!x) return 0;
      let dm = Math.floor((basis + kr + extra) * zw);
      if (kwVan(x)) dm = Math.floor(dm * 1.5) + (heeftRelikwie('brandmerkijzer') ? 3 : 0);
      return Math.max(0, dm - (x.blok || 0) * 0.5);
    };
    const aoe = (dm1, keer = 1) => hit(dm1) * keer;
    const gifNu = (t && t.status.gif) || 0;
    const gifB = heeftRelikwie('smaragden_ring') ? 1 : 0;
    const gw = add => t ? gifWaarde(add + gifB, t.status.gif || 0, R, true) : 0;
    const ink = ctx.ink;
    const hpFrac = S.hp / S.maxHp;
    const doornV = n => n * Math.min(R, 5) * 0.9;
    const krachtV = n => n * 2.2 * Math.min(R, 5) * 0.8;
    const zwakV = n => Math.min(n, R) * Math.max(2, ink * 0.25) * (precies && ctx.P.klap ? 2 : 1);
    const kwV = n => Math.min(n, R) * 3.5;
    const heelV = n => Math.min(n, S.maxHp - S.hp) * (hpFrac < 0.5 ? 1.2 : 0.7);
    let v = 0;
    const blok = raw('blok');
    if (d.gesmeed) {
      const spec = (S.gesmeed || {})[c.id];
      if (spec) {
        const F = spec.dubbel ? 2 : 1;
        const som = m => spec.modules.filter(x => x.m === m).reduce((tt, x) => tt + x.p * ((SMEED_MODULES[x.m] || {}).perPunt || 0) * F, 0);
        v = hit(som('schade')) + gw(som('gif')) + heelV(som('genees') + som('groei')) + doornV(som('doornen'));
        return { v, blok: som('blok') + som('groei') };
      }
      return { v: 0, blok: 0 };
    }
    switch (c.id) {
      case 'nachtschade': { const dm = hit(gifNu * raw('maal'), t, -kr); v = dm - gifWaarde(gifNu, 0, R, true); if (t && dm >= t.hp) v = 999; break; }
      case 'katalyse': v = gifNu >= 3 ? gifWaarde(gifNu * (raw('maal') - 1), gifNu, R, true) : -1; break;
      case 'giftand': v = hit(raw('dmg')) + (gifNu > 0 ? gifWaarde(gifNu, gifNu, R, true) : 0); break;
      case 'slangenbeet': v = hit(raw('dmg') + (gifNu > 0 ? raw('bonus') : 0)); break;
      case 'naaperij': v = hit(raw('dmg')) + gw(raw('gif') * (gifNu > 0 ? 2 : 1)); break;
      case 'venijnregen': v = aoe(raw('dmg')) + gw(raw('gif')); break;
      case 'gifwolk': v = gw(raw('gif')); break;
      case 'verlammend_gif': v = gw(raw('gif')) + zwakV(raw('zwak')); break;
      case 'etterende_wonden': v = raw('n') * 2 * R; break;
      case 'gifklieren': v = gw(raw('n') * Math.min(R, 4)) * 0.6; break;
      case 'registerrot': v = gw(raw('gif')) + 2; break;
      case 'executie': case 'afgekeurd': v = hit(raw('dmg') + (t && kwVan(t) ? raw('bonus') : 0)); break;
      case 'knal': v = hit(raw('dmg')) + kwV(raw('kw')); break;
      case 'uithaal': v = hit(raw('dmg')) + kwV(raw('st')) + zwakV(raw('st')); break;
      case 'dubbelslag': v = hit(raw('dmg')) + hit(raw('dmg'), t, -wet); break;
      case 'in_drievoud': v = hit(raw('dmg')) + 2 * hit(raw('dmg'), t, -wet); break;
      case 'klingenstorm': case 'wervelwind': case 'asadem': v = aoe(raw('dmg')); break;
      case 'originele_handtekening': v = hit(raw('dmg')) + (eerste ? krachtV(raw('kr')) : 0); break;
      case 'bloedoffer': v = hit(raw('dmg')) - (raw('zelf') || raw('prijs') || 2) * (hpFrac < 0.3 ? 3 : 1.1); break;
      case 'molensteen': v = hit(raw('basis') + g.afleg.length); break;
      case 'ijzeren_golf': v = hit(raw('dmg')); break;
      case 'vampiersbeet': v = hit(raw('dmg')) + heelV(raw('heel')); break;
      case 'metaalhuid': v = raw('n') * Math.min(R, 5) * 0.9; break;
      case 'vlammende_hartstocht': case 'demonenvorm': v = krachtV(raw('n')) * (c.id === 'demonenvorm' ? R / 2 : 1); break;
      case 'geindexeerd': v = raw('n') * 1.8 * R * 0.7; break;
      case 'doornzweep': v = hit(raw('dmg')) + 2 * hit(raw('dmg'), t, -wet); break;
      case 'het_origineel_kaart': v = hit(raw('dmg') + raw('maal') * (s.status.doornen || 0)); break;
      case 'perkamentslag': v = hit(raw('dmg')) + doornV(raw('dr')); break;
      case 'doorslag_doornen': case 'sporenstoot': v = hit(raw('dmg') + (t && ((t.status.zwak || 0) > 0 || kwVan(t)) ? raw('bonus') : 0)); break;
      case 'wortelgreep': v = hit(raw('dmg')) + zwakV(raw('zw')); break;
      case 'wurgwortels': v = hit(raw('dmg')) + kwV(raw('kw')); break;
      case 'knalsigaar': v = hit(raw('dmg')) - raw('kans') / 100 * 4; break;
      case 'bastvel': v = doornV(raw('dr')); break;
      case 'doornmantel': v = doornV(raw('dr')); break;
      case 'duivelspact': v = krachtV(raw('kr')) - 4; break;
      case 'kolengloed': v = krachtV(raw('kr')) - 0.3 * raw('licht'); break;
      case 'kolenstempel': v = krachtV(raw('kr')) + doornV(raw('dr')) - 0.3 * raw('licht'); break;
      case 'stoofpotje': v = heelV(raw('heel')); break;
      case 'stoofgeur': v = zwakV(raw('zw')) * 0.8; break;
      case 'vonkenbeet': v = hit(raw('dmg')) - 0.3 * raw('licht'); break;
      case 'energiekern': v = Math.min(R, 5) * 2.6; break;
      case 'sporenkring': v = Math.min(R, 5) * Math.max(1.5, ink * 0.2); break;
      case 'krijgslist': v = 2; break;
      case 'adrenaline': v = 5; break;
      default: {
        if (d.type === 'aanval') v += hit(raw('dmg'));
        if (raw('gif') > 0) v += gw(raw('gif'));
      }
    }
    /* het Spiegelrecht: elke treffer op hem kost je zijn Doornen (zichtbaar op zijn chip) */
    if (bewustig && t && (t.status.doornen || 0) > 0) {
      const tr = treffersVan(c);
      if (tr > 0) v -= tr * t.status.doornen * (hpFrac < 0.4 ? 1.6 : 1.0) * (beleid === 'slim' && tr * t.status.doornen >= S.hp ? 100 : 1);
    }
    return { v, blok };
  };
  const blokWaarde = (n, ctx) => {
    const hpFrac = S.hp / S.maxHp;
    const blokW = precies ? 2.2 : (hpFrac < 0.4 ? 1.5 : 1.05);
    return Math.min(n, ctx.nodig) * (ctx.dodelijk ? 3 : blokW) + Math.max(0, n - ctx.nodig) * 0.05;
  };
  const speelbaar = c => { const d = kdef(c); const k = kkost(c); return d && d.type !== 'vloek' && k !== null && k <= g.energie && !(d.kan && !d.kan(c)); };
  /* vóór de Roof: wie de regels kent, speelt eerst wat NU iets oplevert en slaat als laatste */
  const nutZonderRoof = (c, R, ctx) => { const oud = g.roofGedaan; g.roofGedaan = true; try { const w = waarde(c, R, ctx); return w.v + blokWaarde(w.blok, ctx); } finally { g.roofGedaan = oud; } };
  const kiesGreedy = () => {
    const b = boss(); if (!b || b.dood) return null;
    const R = R_(); const ctx = ctxNu();
    let best = null, bestS = 0.2;
    for (const c of g.hand) {
      if (!speelbaar(c)) continue;
      const d = kdef(c); const k = kkost(c);
      const w = waarde(c, R, ctx);
      let tot = w.v + blokWaarde(w.blok, ctx);
      if (bewustig && !g.roofGedaan && d.type === 'aanval') {
        if (beleid === 'nietslaan') continue;   /* de controle: in beurt 1 nooit slaan */
        const anders = g.hand.some(x => x !== c && speelbaar(x) && kdef(x).type !== 'aanval' && nutZonderRoof(x, R, ctx) > 1.0);
        if (anders) tot = Math.min(tot, 0.1);
      }
      const sc = tot / Math.max(0.6, k);
      if (sc > bestS) { bestS = sc; best = c; }
    }
    return best;
  };
  /* SLIM: de beste combinatie van je hand binnen je energie (niet kaart per kaart); vóór de Roof
     hooguit één aanval, en die als laatste. Na elke kaart plant hij opnieuw (trek, energie). */
  const kiesSlim = () => {
    const b = boss(); if (!b || b.dood) return null;
    const R = R_(); const ctx = ctxNu();
    const kand = g.hand.filter(speelbaar).slice(0, 11).map(c => {
      const w = waarde(c, R, ctx); const d = kdef(c);
      return { c, v: w.v, blok: w.blok, k: kkost(c), aanval: d.type === 'aanval', kracht: d.type === 'kracht' };
    });
    const n = kand.length; if (!n) return null;
    let best = null, bestV = 0.3;
    for (let m = 1; m < (1 << n); m++) {
      let kost = 0, v = 0, blok = 0, aanv = 0;
      for (let i = 0; i < n; i++) if (m & (1 << i)) { const x = kand[i]; kost += x.k; v += x.v; blok += x.blok; if (x.aanval) aanv++; }
      if (kost > g.energie) continue;
      if (!g.roofGedaan && aanv > 1) continue;
      const tot = v + blokWaarde(blok, ctx);
      if (tot > bestV + 1e-9) { bestV = tot; best = m; }
    }
    if (best == null) return null;
    const gekozen = kand.filter((_, i) => best & (1 << i));
    /* volgorde: krachten, dan wat niet slaat (Zwak, gif, Blok), dan de aanvallen (sterkste eerst) */
    const rang = x => x.kracht ? 0 : (!x.aanval ? 1 : 2);
    gekozen.sort((a, b2) => rang(a) - rang(b2) || b2.v - a.v);
    const eerste = gekozen[0];
    if (eerste.v + blokWaarde(eerste.blok, ctx) <= 0.05 && gekozen.length === 1) return null;
    return eerste.c;
  };
  const kiesKaart = beleid === 'slim' ? kiesSlim : kiesGreedy;
  const drinkIndien = (noodgeval) => {
    const i = S.dranken.indexOf('heeldrank'); if (i < 0 || g.ceremonie || g.bezig) return false;
    const ctx = ctxNu();
    const drempel = S.hp < S.maxHp * 0.35 || (noodgeval && ctx.dodelijk);
    if (!drempel) return false;
    try { gebruikDrank(i); T.drank = (T.drank || 0) + 1; return true; } catch (e) { return false; }
  };

  /* ---------------- DE LUS ---------------- */
  const rondes = []; let fout = null; let ronde = 0;
  const MAX = 45;
  const sigVan = x => x ? (x.type + ':' + (x.plan || []).map(k => (k.uid != null ? k.uid : k.id) + '/' + k.soort + '/' + (k.eindDmg || 0) + '/' + (k.eindGif || 0) + (k.vuil ? '!' : '')).join(',')) : '-';
  try {
    while (!g.voorbij && S.gevecht === g && S.hp > 0 && ronde < MAX) {
      await vrij();
      if (g.voorbij) break;
      ronde++;
      const b0 = boss();
      const hpVoor = S.hp; const bossVoor = b0 ? b0.hp : 0;
      const beurtStart = g.beurt;
      const it0 = b0 && b0.intent; const sig0 = sigVan(it0);
      if ((typeof gMet === 'function' && gMet()) || S.metgezel || S.runMetgezel) T.metgezelGezien = true;
      const nrStart = T.nr ? 1 : 0;
      drinkIndien(false);
      let guard = 0; const kaarten = [];
      while (guard++ < 30 && !g.voorbij && S.gevecht === g) {
        await vrij();
        if (g.voorbij || g.beurt !== beurtStart) break;
        const c = kiesKaart(); if (!c) break;
        const d = kdef(c);
        kaarten.push(c.id + (c.aangetast ? '*' : ''));
        T._zelf = true;
        try { await speelKaart(c, d.doel === 'vijand' ? boss() : undefined); } finally { T._zelf = false; }
      }
      await vrij();
      if (g.voorbij || S.gevecht !== g) { rondes.push({ r: ronde, hpVoor, hp: S.hp, bossVoor, bossHp: Math.max(0, (boss() || {}).hp || 0), k: kaarten }); break; }
      drinkIndien(true);
      const b1 = boss(); const it1 = b1 && b1.intent; const sig1 = sigVan(it1);
      const beurtLoopt = g.beurt === beurtStart && !g.voorbij;
      if (beurtLoopt && b1 && !b1.dood && sig1 !== sig0 && !(it0 && it0.type === 'roof')) T.wissels.push({ r: ronde, van: sig0, naar: sig1, nr: (T.nr ? 1 : 0) > nrStart });
      const pil = (beurtLoopt && b1 && it1 && it1.type === 'plagiaat') ? { klap: copycatVerwacht(b1), gif: copycatVerwachtGif(b1) } : null;
      const blokNaSpel = spl().blok || 0;
      T.rPlag = 0; T.rGif = 0;
      const nrVoorVijand = T.nr ? 1 : 0;
      const intentTxt = it1 ? (it1.type === 'plagiaat' ? 'P[' + (it1.plan || []).map(k => k.id + (k.vuil ? '!' : '') + (k.eindDmg ? ':' + k.eindDmg : '')).join(',') + ']' : it1.naam) : '?';
      if (g.beurt === beurtStart) {
        let pog = 0;
        while (g.beurt === beurtStart && !g.voorbij && pog++ < 5) { await vrij(); await eindBeurt(); await vrij(); }
        if (g.beurt === beurtStart && !g.voorbij) { fout = 'eindBeurt kwam niet door (ronde ' + ronde + ')'; break; }
      }
      const bb = boss();
      if (pil) T.pilChecks.push({ r: ronde, pil: pil.klap, klap: T.rPlag, pilGif: pil.gif, gif: T.rGif, nr: (T.nr ? 1 : 0) > nrVoorVijand, dood: !bb || bb.dood || g.voorbij || S.hp <= 0 });
      rondes.push({ r: ronde, hpVoor, hp: S.hp, bossVoor, bossHp: Math.max(0, (bb && bb.hp) || 0), it: intentTxt, blok: blokNaSpel, k: kaarten, f: bb && bb.fase });
    }
  } catch (e) { fout = (e && e.stack) ? String(e.stack).slice(0, 600) : String(e); }
  await vrij();
  const b = boss();
  const gewonnen = !!g._gewonnen && S.hp > 0;
  const dood = !gewonnen && (S.hp <= 0 || !!g._verloren);
  const spiegelSchade = (T.bron['spiegel-doornen'] || 0) + T.krachtDeel + T.gifOpJou.klieren;
  const uit = {
    cel: job.cel, seed: job.seed, variant: job.variant, held: build.held, st: job.st, beleid, hpPct: job.hpPct, soloOk,
    maxHp: S.maxHp, hpStart, dekStart, fout, gewonnen, dood, timeout: !gewonnen && !dood, rondes: ronde, hpOver: S.hp,
    bossHpOver: b ? Math.max(0, b.hp) : null, bossFase: b ? b.fase : null, buitEind: b ? (b.gestolen || []).length : null,
    bron: T.bron, uit: T.uit, geblokt: T.geblokt, drank: T.drank || 0, doodsBron: dood ? T.doodsBron : null,
    roof: T.roof, naroof: T.naroof.length, nr: T.nr, backfire: T.backfire, fases: T.fases, spiegel: T.spiegel, drift: T.drift,
    krachtDeel: T.krachtDeel, spiegelSchade, gifOpJou: T.gifOpJou, blokVoorHem: T.blokVoorHem,
    plagiaatBeurten: T.plagiaatBeurten, plagiaatKaarten: T.plagiaatKaarten, stik: g._stikTeller || 0,
    wissels: T.wissels, pilChecks: T.pilChecks, metgezelGezien: T.metgezelGezien,
    log: rondes
  };
  window.__T = null;
  try { g.voorbij = true; stopGevechtLus(); } catch (e) {}
  S.gevecht = null;
  document.querySelectorAll('.overlay, #baas-intro, .baas-flits, .baas-spraak, .roof-overlay, .roof-speel-kaart, .steel-vlieger, #scherm-einde .einde').forEach(n => { try { n.remove(); } catch (e) {} });
  return uit;
}

/* ============================================================ NODE: pagina's en jobs */
async function maakPagina(browser, fouten) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block', locale: 'nl-BE' });
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.host !== HOST) return route.abort();
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
    const f = path.join(WORTEL, rel.split('/').join(path.sep));
    try { if (fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ status: 200, contentType: MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(f) }); } catch (e) {}
    return route.fulfill({ status: 404, contentType: 'text/plain', body: 'weg' });
  });
  await ctx.addInitScript(() => {
    try { localStorage.clear(); localStorage.setItem('slayit_wipe', '1'); localStorage.setItem('slayit_proloog_over', '1'); localStorage.setItem('slayit_nudge', 'weg');
      localStorage.setItem('slayit_inst', JSON.stringify({ lite: true, d3: false, spraak: false, autoPor: false, mobielHersteld2: true })); } catch (e) {}
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => fouten.push(e.message.slice(0, 300)));
  await page.goto(BASIS, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof startGevecht === 'function' && typeof nieuwSpel === 'function' && typeof KAARTEN !== 'undefined' && typeof ERF === 'object');
  await page.waitForTimeout(300);
  await page.evaluate(installeer);
  return page;
}

async function main() {
  const t0 = Date.now();
  const fouten = [];
  const uitPad = process.env.MEET_UIT || path.join(__dirname, LABEL + '.json');
  const resultaten = [];
  /* HERVATTEN: een lange meting die sterft, verliest niets. Elke MEET_TUSSEN gevechten schrijft het
     harnas een tussenstand naar MEET_UIT (meta.onvolledig = true); met MEET_HERVAT=1 leest het die
     terug en slaat het de gevechten over die er al in staan (zelfde variant, beleid, held, sterkte, seed). */
  let jobs = maakJobs();
  const sleutel = r => `${r.variant}/${r.beleid}/${r.held}/${r.st}|${r.seed}`;
  if (process.env.MEET_HERVAT && fs.existsSync(uitPad)) {
    try {
      const oud = JSON.parse(fs.readFileSync(uitPad, 'utf8'));
      (oud.resultaten || []).filter(r => !r.fout).forEach(r => resultaten.push(r));
      const al = new Set(resultaten.map(sleutel));
      jobs = jobs.filter(j => !al.has(sleutel(j)));
      console.log(`hervat: ${resultaten.length} gevechten uit ${uitPad}, nog ${jobs.length} te gaan`);
    } catch (e) { console.log('hervat: de tussenstand is onleesbaar, alles opnieuw (' + e.message + ')'); }
  }
  const TUSSEN = parseInt(process.env.MEET_TUSSEN || '1000', 10);
  const browser = await chromium.launch({ headless: true });
  const versie = (fs.readFileSync(path.join(WORTEL, 'sw.js'), 'utf8').match(/const CACHE = '([^']+)'/) || [])[1] || '?';
  console.log(`ERFPRINS-meting '${LABEL}' · ${versie} · ${jobs.length} gevechten · ${WERKERS} werkers · ${N} seeds/cel · seeds ERF-${SEEDBASE}.. · varianten ${VARS.join(',')}`);
  const builds = {};
  for (const h of HELDEN) for (const st of STERKTES) builds[h + '/' + st] = tafelBuild(h, st);
  let volgende = 0, klaar = 0, erf = null;
  const bewaar = onvolledig => fs.writeFileSync(uitPad, JSON.stringify({ meta: { label: LABEL, versie, datum: new Date().toISOString(), seeds: N, seedbase: SEEDBASE, hpPct: HPPCT, beleid: BELEID, sterktes: STERKTES,
    erf, varianten: VARS.map(v => ({ naam: v, def: VARIANTEN[v] })), duurS: Math.round((Date.now() - t0) / 1000), onvolledig: !!onvolledig, paginafouten: [...new Set(fouten)].slice(0, 20) }, builds, resultaten }));
  const werkers = [];
  for (let w = 0; w < WERKERS; w++) werkers.push((async () => {
    let page = await maakPagina(browser, fouten), gedaan = 0;
    if (!erf) erf = await page.evaluate(() => JSON.parse(JSON.stringify(ERF)));
    while (volgende < jobs.length) {
      const job = jobs[volgende++];
      let r;
      for (let poging = 0; poging < 3; poging++) {
        if (gedaan >= RECYCLE) { try { await page.context().close(); } catch (e) {} page = await maakPagina(browser, fouten); gedaan = 0; }
        try { r = await page.evaluate(eenGevecht, { job }); gedaan++; break; }
        catch (e) {
          r = { cel: job.cel, seed: job.seed, variant: job.variant, held: job.held, st: job.st, beleid: job.beleid, fout: 'evaluate: ' + String(e.message || e).slice(0, 300) };
          try { await page.context().close(); } catch (e2) {}
          page = await maakPagina(browser, fouten); gedaan = 0;
        }
      }
      if (!r.fout && !r.soloOk) r.fout = 'solo-toets: er stond een metgezel in het gevecht';
      resultaten.push(r);
      if (r.fout) console.log(`  FOUT ${job.cel} ${job.seed}: ${String(r.fout).split('\n')[0]}`);
      if (++klaar % 200 === 0) console.log(`  ${klaar}/${jobs.length} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
      if (TUSSEN > 0 && klaar % TUSSEN === 0) { try { bewaar(true); } catch (e) { console.log('  tussenstand niet bewaard: ' + e.message); } }
    }
    try { await page.context().close(); } catch (e) {}
  })());
  await Promise.all(werkers);
  await browser.close();
  bewaar(false);
  console.log(`klaar in ${((Date.now() - t0) / 1000).toFixed(0)} s → ${uitPad}`);
  if (fouten.length) console.log('PAGINAFOUTEN:', [...new Set(fouten)].slice(0, 8));
  for (const v of VARS) { console.log(`\n=== variant ${v} ===`); console.log(analyseer(resultaten, v).tekst); }
}
module.exports = { tafelBuild, installeer, eenGevecht, maakPagina, analyseer, DOEL, D_BUILDS, TAFEL };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
