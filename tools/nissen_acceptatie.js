/* ============================================================================
   DE NISSEN DICHT (B1) — ACCEPTATIE
   De metgezellen zijn GEPARKEERD: `METGEZELLEN_AAN = false` in js/game.js, gelezen via
   `metgezellenAan()`. Deze suite bewijst dat er langs geen enkel pad nog een metgezel of een
   metgezel-tekst binnenkomt, dat een lopende run zijn metgezel netjes wegstuurt (één regel,
   één keer), dat de Codex-data bewaard blijft, en dat de DEV-schakelaar heen en terug werkt.
   Contract: .claude/notities/bazen_onderzoek/ontwerp/M_metgezel_parkering_plan.md §4.3.
   Elke regel toont de GEMETEN waarde.

   Draaien (vanuit de map waar playwright staat, bv. de scratchpad):
     NODE_PATH="$PWD/node_modules" SLAYIT_WORKTREE='C:\...\SLAY-IT-nissen' \
       SLAYIT_SHOTS="$PWD/nissen_shots" node "C:\...\SLAY-IT-nissen\tools\nissen_acceptatie.js"
   Geen server: route.fulfill vanaf schijf op localhost:4173, service workers geblokkeerd.
   Blokken filteren: SLAYIT_NISSEN=bron,scherven,poorten,doorloop,save,dev,builds,erfprins,beeld,vel,outro
   Het blok 'vel' (M-plan §5, integratie) schrijft contactvel_nissen.jpg in SLAYIT_SHOTS: de
   heldkeuze, de Codex, de scherf-reveal en de afscheidsregel op Thomas' formaten.
   Stand bij de integratie (26 sep 2026, alle blokken): 376 ok / 0 FOUT in ±4,5 min.
   Hoort in de suitelijst van elke volgende bazenronde (Erfprins, finale, bazentoneel: M-plan
   §7.1) — wie als tweede merget, draait haar mee.
   ============================================================================ */
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');

const WT = process.env.SLAYIT_WORKTREE || path.resolve(__dirname, '..');
const HOST = 'localhost:4173';
const UIT = process.env.SLAYIT_SHOTS || path.join(__dirname, 'nissen_shots'); fs.mkdirSync(UIT, { recursive: true });
const BLOKKEN = (process.env.SLAYIT_NISSEN || 'bron,scherven,poorten,doorloop,save,dev,builds,erfprins,beeld,vel,outro').split(',').map(s => s.trim());
const doe = b => BLOKKEN.includes(b);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.glb': 'model/gltf-binary' };
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
const slaap = ms => new Promise(r => setTimeout(r, ms));

let okN = 0, foutN = 0;
const t = (goed, tekst) => { if (goed) { okN++; console.log('   ok   ' + tekst); } else { foutN++; console.log('   FOUT ' + tekst); } };
const kop = s => console.log('\n== ' + s + ' ==');

/* wat een speler met de metgezellen geparkeerd NOOIT mag lezen (zichtbare tekst + data-tips).
   Eén kern voor het beeld (VERBODEN) én de bron (WOORD, de grep-wacht hieronder), zodat ze niet
   uit elkaar groeien (review B1 F1: de grep-wacht zag 'trouw' en 'poort had' niet). Een kale
   'poort' staat er bewust NIET in: de Drempeltafel, de Steenwachter en de wereldkaart spreken
   terecht over een poort. */
const KERN = 'metgezel|\\bdrops\\b|bondgenoot|\\bhond\\b|daalt deze run met je mee|\\btrouw|poort had|poort onderin|die poort wakker|vlamwacht|mosgeest|nissen zijn dichtgelast';
const VERBODEN = new RegExp(KERN, 'i');
/* een scherftekst noemt geen vindplaats: dezelfde scherf valt uit een elite, een kist, een baas of de tafel */
const VINDPLAATS = /\bbaas\b|raadsel|geschenk|gevecht|\bfiguur\b|\belite\b|\bkist/i;
/* de metgezelsleutels van de Codex: nooit gewist, nooit bijgeschreven zolang de vlag uit staat */
const MG_SLEUTELS = ['metgezellen', 'gevallen', 'mysteries', 'copycatGebroken', 'sigOntdekt', 'dropsOfferRun', 'dropsZaadjeNul', 'drops_wit_keerde'];
/* inhoudelijk vergelijken NA de normalisatie die game.js al op module-niveau doet (r~275-281):
   dropsOfferRun numeriek, dropsZaadjeNul booleaans, lege lijsten/objecten — geen schrijfactie */
const normaliseer = c => {
  c = c || {};
  const lijst = x => (Array.isArray(x) ? x.slice().sort() : []);
  const obj = x => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  /* mys(mid) (game.js r~322) vult bij elke LEZING een mysterie aan met lege legacy-velden
     (scherven/rite/rijp, voltooid false) — ook voor een mysterie dat er nog niet was. Gelezen
     wordt alleen 'voltooid': de inhoud is dus de lijst van voltooide mysteries */
  const mysterie = x => Object.keys(obj(x)).filter(k => obj(x[k]).voltooid === true).sort();
  return JSON.stringify({
    metgezellen: lijst(c.metgezellen), gevallen: lijst(c.gevallen), mysteries: mysterie(c.mysteries),
    copycatGebroken: !!c.copycatGebroken, sigOntdekt: obj(c.sigOntdekt),
    dropsOfferRun: Math.max(0, +c.dropsOfferRun || 0), dropsZaadjeNul: !!c.dropsZaadjeNul, drops_wit_keerde: !!c.drops_wit_keerde
  });
};

/* de Codexen (M-plan §1): wie Drops al wekte, wie hem offerde, en de speler van vandaag */
const CODEX = {
  ontwaakt: { metgezellen: ['drops', 'vlamwachter'], gevallen: [], mysteries: { drops: { voltooid: true }, vlamwachter: { voltooid: true } },
    runs: 4, wins: 1, erfprinsOntmoetingen: 2, scherven: ['mosgeest_baas', 'drops_figuur', 'vlamwachter_episch'], relikwieen: [], dranken: [], opgeladen: [], gezien: [], copycatGebroken: true, sigOntdekt: { drops: true } },
  rouw: { metgezellen: ['drops', 'mosgeest'], gevallen: ['drops'], mysteries: { drops: { voltooid: true }, mosgeest: { voltooid: true } },
    runs: 4, wins: 1, dropsOfferRun: 1, erfprinsOntmoetingen: 2, scherven: ['mosgeest_baas'], relikwieen: [], dranken: [], opgeladen: [], gezien: [], copycatGebroken: true },
  nieuw: { metgezellen: [], gevallen: [], mysteries: {}, runs: 2, wins: 0, erfprinsOntmoetingen: 2, scherven: ['mosgeest_baas', 'mosgeest_figuur'], relikwieen: [], dranken: [], opgeladen: [], gezien: [] }
};
/* de daily loopt met de Codex waarin Drops ontwaakt is: het strengste geval (M-plan §2.4 — de
   daily kreeg nooit een cross-run-metgezel; dat moet zo blijven, zonder tafel en zonder tekst) */
const codexVan = scen => CODEX[scen === 'daily' ? 'ontwaakt' : scen];

/* ============================================================================
   DE GREP-WACHT — een mini-lexer over de bron (strings, templates met ${}, commentaar,
   regex-literals). Elke string of template met een spatie die een metgezel noemt (plus elke
   string met een 🐾, ook zonder spatie: dat is nooit een sleutel of CSS-klasse), moet in de
   ALLOWLIST staan: in een functie die als geheel achter de vlag zit (HEEL), of — in een
   gemengde functie — als GEKENDE string met zijn vingerafdruk (PER_STRING). Een nieuwe
   verwijzing ergens anders — ook in proloog/*.js, of een nieuwe string in een grote gemengde
   functie als toonCodex — is FOUT: de bazen- en proloogrondes mogen er geen binnensmokkelen.
   ============================================================================ */
const WOORD = new RegExp(KERN + '|🐾', 'i');
const crypto = require('crypto');
/* de vingerafdruk van één stuk bron-tekst: sha1 van de genormaliseerde regel, 10 tekens */
const vinger = s => crypto.createHash('sha1').update(s.replace(/\s+/g, ' ').trim(), 'utf8').digest('hex').slice(0, 10);
function literals(src) {
  const uit = [];
  let i = 0, regel = 1, vorige = '';
  const n = src.length;
  const stapel = [];   /* open templates: { start, regel, diepte, inExpr } */
  const leesString = q => {
    const start = regel; let s = ''; i++;
    while (i < n && src[i] !== q) {
      if (src[i] === '\\') { s += src[i] + (src[i + 1] || ''); i += 2; continue; }
      if (src[i] === '\n') { regel++; break; }
      s += src[i++];
    }
    i++;
    uit.push({ regel: start, tekst: s });
  };
  const leesTemplate = () => {   /* i staat NA de backtick, of na de sluitende } van ${...} */
    while (i < n) {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { i++; const tp = stapel.pop(); uit.push({ regel: tp.regel, tekst: src.slice(tp.start, i) }); return; }
      if (c === '$' && src[i + 1] === '{') { i += 2; const tp = stapel[stapel.length - 1]; tp.diepte = 0; tp.inExpr = true; return; }
      if (c === '\n') regel++;
      i++;
    }
  };
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '\n') { regel++; i++; continue; }
    if (c === '/' && d === '*') {
      const e = src.indexOf('*/', i + 2); const blok = src.slice(i, e < 0 ? n : e + 2);
      regel += (blok.match(/\n/g) || []).length; i = e < 0 ? n : e + 2; continue;
    }
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '\'' || c === '"') { leesString(c); vorige = 'a'; continue; }
    if (c === '`') { stapel.push({ start: i, regel, diepte: 0, inExpr: false }); i++; leesTemplate(); vorige = 'a'; continue; }
    if (c === '/' && (vorige === '' || /[(,=:[!&|?{};+\-*%<>~^]/.test(vorige))) {   /* regex-literal */
      i++; let klasse = false;
      while (i < n && src[i] !== '\n') {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '[') klasse = true; else if (src[i] === ']') klasse = false;
        else if (src[i] === '/' && !klasse) break;
        i++;
      }
      i++; while (i < n && /[a-z]/i.test(src[i])) i++;
      vorige = 'a'; continue;
    }
    const top = stapel.length ? stapel[stapel.length - 1] : null;
    if (top && top.inExpr) {
      if (c === '{') top.diepte++;
      else if (c === '}') {
        if (top.diepte === 0) { top.inExpr = false; i++; leesTemplate(); vorige = 'a'; continue; }
        top.diepte--;
      }
    }
    if (/[\w$]/.test(c)) {
      let j = i; while (j < n && /[\w$]/.test(src[j])) j++;
      vorige = /^(return|typeof|case|in|of|new|delete|void|throw)$/.test(src.slice(i, j)) ? '(' : 'a';
      i = j; continue;
    }
    if (!/\s/.test(c)) vorige = c;
    i++;
  }
  return uit;
}
/* per regel: de omhullende top-level declaratie, plus een datasleutel op twee spaties (KAARTEN.de_roddel) */
function contexten(src) {
  const ctx = []; let fn = '(top)', sub = '';
  src.split('\n').forEach(r => {
    const top = /^(?:async\s+)?function\s+([\w$]+)/.exec(r) || /^(?:const|let|var)\s+([\w$]+)/.exec(r);
    if (top) { fn = top[1]; sub = ''; }
    const sl = /^  ([\w$]+):\s*[{[]/.exec(r) || /^  \{ id:\s*'([\w$]+)'/.exec(r) || /^    id:\s*'([\w$]+)'/.exec(r);
    if (sl) sub = sl[1];
    ctx.push(fn + (sub ? '.' + sub : ''));
  });
  return ctx;
}
function grepWacht(rel) {
  const src = fs.readFileSync(path.join(WT, rel), 'utf8').replace(/\r\n/g, '\n');
  const ctx = contexten(src);
  const uit = [];
  literals(src).forEach(x => {
    if (!((/\s/.test(x.tekst) && WOORD.test(x.tekst)) || /🐾/.test(x.tekst))) return;
    x.tekst.split('\n').forEach((stuk, k) => {
      if (WOORD.test(stuk)) uit.push({ rel, regel: x.regel + k, sleutel: rel + ':' + ctx[x.regel + k - 1], hash: vinger(stuk), s: stuk.replace(/\s+/g, ' ').trim().slice(0, 100) });
    });
  });
  return uit;
}
/* De ALLOWLIST, in twee soorten (review B1 F1: per hele functie was te grof — een nieuwe
   string in toonCodex of renderTopbalk viel erdoor):
   - HEEL: een functie of datasleutel die met de vlag uit ALS GEHEEL onbereikbaar is
     (metgezel-data, metgezel-functies achter een poort, DEV-functies die geparkeerd weigeren).
     Elke string erin mag. Een sleutel toevoegen = bewijzen dat de hele functie gegate is.
   - PER_STRING: een GEMENGDE functie (ook solo bereikbaar). Alleen de gekende strings mogen,
     elk met zijn vingerafdruk (vinger(): sha1 van de genormaliseerde regel). Een nieuwe of
     gewijzigde string is FOUT tot iemand bewijst dat hij achter de vlag zit (of bewust solo
     mag, zoals het hof dat 'bondgenoot' is) en de vingerafdruk toevoegt. De FOUT-regel drukt
     de ontbrekende regels plakklaar af; SLAYIT_NISSEN=bron met SLAYIT_ALLOWLIST=druk drukt de
     hele tabel opnieuw. De tekst na de vingerafdruk is alleen leeshulp. */
const HEEL = {
  'js/data.js:METGEZELLEN.drops': 'metgezel-data: alleen via een metgezel (V2-V4)',
  'js/data.js:METGEZELLEN.drops_wit': 'metgezel-data (V2-V6)',
  'js/data.js:METGEZELLEN.vlamwachter': 'metgezel-data (V2-V4)',
  'js/data.js:METGEZELLEN.mosgeest': 'metgezel-data (V2-V4)',
  'js/game.js:synergieBoekHtml': 'metgezelboek: onbereikbaar (roster en chip weg, T7/T8)',
  'js/game.js:toonMetgezelBoek': 'metgezelboek: onbereikbaar (T8)',
  'js/game.js:metgezelInstapMelding': 'alleen uit het act-instapblok (V5)',
  'js/game.js:metgezelVlucht': 'alleen met g.metgezel (V2)',
  'js/game.js:metgezelOpoffering': 'leest zelf metgezellenAan() (review B1 F1) + alleen met g.metgezel (V2)',
  'js/game.js:toonRouwPoot': 'alleen in rouw: dropsInRouw() (V6)',
  'js/game.js:pootSpoorPayoff': 'alleen uit revealDropsWit (V6)',
  'js/game.js:revealDropsWit': 'poort V6',
  'js/game.js:devMetgezellen': 'DEV-schakelaar',
  'js/game.js:_devMgMag': 'DEV-weigering',
  'js/game.js:devMetgezel': 'DEV (weigert geparkeerd)',
  'js/game.js:devDropsLevend': 'DEV (weigert geparkeerd)',
  'js/game.js:devDropsGrief': 'DEV (weigert geparkeerd)',
  'js/game.js:devDropsReunie': 'DEV (weigert geparkeerd)',
  'js/game.js:devDropsWitVecht': 'DEV (weigert geparkeerd)',
  'js/game.js:devDropsWis': 'DEV (opruimen)'
};
const PER_STRING = {
  'js/data.js:BESTIARIUM.het_klapvee': { waarom: '"bondgenoot" = het hof van de vijand, geen metgezel (mag solo)', s: {
    '50205c7204': "Klapt harder per levende bondgenoot. Dun eerst de kudde uit.",
  } },
  'js/data.js:KAARTEN.de_roddel': { waarom: 'de metgezel-tak van tekst(): alleen met metgezellenAan() (T16)', s: {
    '2b1ca49676': "`Onbespeelbaar. Zolang ze in je hand zit, doet je metgezel n",
  } },
  'js/data.js:MYSTERIES.drops': { waarom: 'codexTekst (lore): alleen via scherfTekst() met de vlag aan (T9-T11); de tafelTekst ernaast mag geen treffer zijn', s: {
    '88e7ff2e57': "„Wat trouw blijft zonder loon, kun je niet kopen — en niet n",
    '49cbc452c0': "„Drie stukken van één trouw. De poort onderin weet welke sam",
  } },
  'js/data.js:RELIKWIEEN.gelukspoot': { waarom: 'de Gelukspoot is een relikwie (goud), geen metgezel (mag solo)', s: {
    'a1a791b3f5': "🐾",
  } },
  'js/data.js:UITSPRAKEN._erfprins': { waarom: "doodGebroken (alleen met g.copycatGebroken: enige schrijver Drops' offer, latent tot de Erfprins-ronde, M-plan §2.9), het oude orakel (T13) en het dossier (T15): vlag-gegate in toonBaasIntro", s: {
    '7de26135b7': "„Trouw... dát stond niet in mijn catalogus... dát kon ik nie",
    'c87e9d04be': "„Eén ding namaken lukt me niet: wat trouw blíjft zonder loon",
    'e76a1eb432': "„Hoe beter jij speelt, hoe sterker ík word... maar wat die p",
    '327825eac0': "„Ik heb je hond geïndexeerd. Dossier gesloten.\"",
  } },
  'js/game.js:DEV_MENU': { waarom: 'DEV: de metgezel-sectie (schakelaar + kiezer, die geparkeerd weigert), de Drops-boog (weigert geparkeerd) en de devErfprins-tip die SOLO zegt', s: {
    'e9d1957eab': "Overschrijft je lopende run en start het Act 2-baasgevecht S",
    '4a39b4e5e3': "🐾 Metgezel (geparkeerd) — in gevecht: vanaf het volgende",
    '570d22b688': "🐾 Metgezellen (geparkeerd)",
    'c66b3e5356': "Zet de geparkeerde metgezellen AAN voor deze sessie (niet be",
    '6ce36cdcf0': "🐕 Drops",
    '457a57d3bc': "Zet Drops in je lopende run (raakt je save, niet je Codex-ro",
    'db9b2ed5aa': "🛡️ Vlamwacht",
    '33367b3674': "Zet de Vlamwacht in je lopende run (raakt je save, niet je C",
    'e5991288df': "🍃 Mosgeest",
    'e6580059cb': "Zet de Mosgeest in je lopende run (raakt je save, niet je Co",
    '49832616f1': "Zet Drops de Witte in je lopende run (raakt je save, niet je",
    'a19b6724b0': "Stuurt je metgezel weg (raakt je save, niet je Codex).",
    '0f3db5e406': "🦴 Drops-boog — schrijft in de Codex",
    'b892d98a48': "⚠ Reset de Drops-Codex, wekt Drops en start het Erfprins-gev",
    'a8960c6cde': "⚠ Reset de Drops-Codex, zet Drops als gevallen (run 2) en st",
    '428e24d036': "⚠ Reset de Drops-Codex en laat de Witte 900 ms na de start v",
    '8c51961285': "⚠ Reset de Drops-Codex, ontgrendelt Drops + de Witte en star",
    '98fd18ee9e': "⚠ 5 · Drops-Codex resetten",
    '45cdc0f6af': "⚠ Drops-Codex wissen",
    'b2cefe0c6f': "⚠ DESTRUCTIEF: wist gevallen/mysterie/Witte/zaadje/offer uit",
  } },
  'js/game.js:bouwGevechtDom': { waarom: 'de metgezel-zone: alleen met g.metgezel (V2)', s: {
    '4f4a081b45': "`<span class=\"metgezel-syn syn-optimaal\" data-tip=\"✨ Deze tw",
    '98b7047573': "`<span class=\"metgezel-syn syn-goed\" data-tip=\"◆ Ze begrijpe",
    '4499bd4124': "` style=\"--voetc:${VOETMARGE[g.metgezel.id]}%\"`",
    '5b5b48196f': "<div class=\"metgezel-intent\"></div>",
    '5cba38999d': "<div class=\"metgezel-art\" data-tip=\"${md.naam} — ${md.fluist",
    '304cfba3fc': "<div class=\"metgezel-naam\">${md.naam}</div>",
    'd80c4d7382': "<div class=\"hp-balk metgezel-hp\"><div class=\"hp-vulling\"></d",
    'fee7a44e7d': "<button class=\"metgezel-offer\" type=\"button\" onclick=\"metgez",
  } },
  'js/game.js:copycatBalk': { waarom: "de pil 'machine gebroken': alleen met g.copycatGebroken (enige schrijver Drops' offer, latent tot de Erfprins-ronde, M-plan §2.9)", s: {
    '883151a2ae': "`<div class=\"bb-aegis bb-gebroken\" data-tip=\"De kopieermachi",
  } },
  'js/game.js:copycatSpeelTerug': { waarom: 'Vlamwacht vangt de klap: alleen met g.metgezel (V2)', s: {
    '63ef8ba482': "`🛡️ ${METGEZELLEN[doelC.id].naam} vangt de klap voor je op!",
  } },
  'js/game.js:devErfprins': { waarom: 'DEV-melding die juist zegt dat het gevecht SOLO is', s: {
    '1228446c44': "⚡ DEV: meteen tegen de Erfprins (SOLO, geen metgezel) — 150 ",
  } },
  'js/game.js:doorgaan': { waarom: 'de afscheidsregel (M-plan §3.2): alleen met een _mgAfscheid die laadSpel zelf zette', s: {
    'a1a791b3f5': "🐾",
  } },
  'js/game.js:intentTekst': { waarom: 'it.doelMetgezel: wordt nooit gezet (impactkaart A2)', s: {
    '3cd069852a': "` → ${METGEZELLEN[mDoel.id].icoon}`",
  } },
  'js/game.js:renderTopbalk': { waarom: "de scherven-tip leest metgezellenAan() (T19): geparkeerd 'Scherven'", s: {
    '3877699cb8': "`${metgezellenAan() ? 'Mysterie-scherven' : 'Scherven'}: ${g",
  } },
  'js/game.js:rustGenees': { waarom: 'heeftMetgezel() (V2)', s: {
    '98b791f331': "`${metgezelDef().naam} rust mee uit (+${m} HP).`",
  } },
  'js/game.js:toonBaasIntro': { waarom: 'de scherven-nudge: alleen met metgezellenAan() (T14)', s: {
    'ff7e5cebc9': "„Drie die pássen?! Wie heeft je dat verteld?! Die poort had ",
  } },
  'js/game.js:toonCodex': { waarom: 'het Metgezellen-blok zit achter metgezellenAan() (T7)', s: {
    '52f577094c': "<h3 class=\"codex-kop\">🐾 Metgezellen <small>${mgOntdekt} / $",
    'edef2a978a': "`<div class=\"codex-slot rel-${d.zeld} ${gevallen && !wit ? '",
    '9102cac40a': "<p class=\"codex-scherf-uitleg\">De nissen zijn dichtgelast. D",
  } },
  'js/game.js:toonHeldKeuze': { waarom: 'de metgezel-band: alleen met runMgDef = kiesRunMetgezel() (V4)', s: {
    '8f1871b0e2': "`<p class=\"held-mg-regel\">${runMgDef.icoon} <b>${runMgDef.na",
    'cee6910f37': "${runMgDef ? `<p class=\"held-mg-regel\">${runMgDef.icoon} <b>",
  } },
  'js/game.js:vijandAanval': { waarom: 'Vlamwacht vangt de klap: alleen met g.metgezel (V2)', s: {
    '0cc0ea788e': "`🛡️ ${METGEZELLEN[doel.id].naam} vangt de klap voor je op!`",
  } },
  'js/game.js:wisselInzage': { waarom: 'CSS-selector, geen speler-tekst', s: {
    '8ccd01af9e': ".vijand, #speler-zone, #metgezel-zone, #onderbalk, #topbalk,",
  } },
  'js/game.js:zetVoetschaduwen': { waarom: 'CSS-selector, geen speler-tekst', s: {
    'f6fac2012f': "#metgezel-zone .metgezel-art",
    'cb099b55f4': "#metgezel-zone .voetschaduw",
  } },
  'js/wereld.js:Wereld': { waarom: 'de wereld-volger #w-metgezel: alleen met heeftMetgezel() (V2)', s: {
    'a1a791b3f5': "🐾",
    '64afb13520': "`<div class=\"w-mfig\"><span class=\"w-schaduw\"></span><img alt",
  } },
  'proloog/data.js:(top)': { waarom: "'25 jaar trouwe dienst' = de kantoorsatire van de proloog, geen metgezel", s: {
    'b37b02afda': "Loyaliteitsbonus (25 jaar trouwe dienst)",
  } }
};
/* is een treffer toegestaan? */
const magTreffer = x => !!HEEL[x.sleutel] || !!(PER_STRING[x.sleutel] && PER_STRING[x.sleutel].s[x.hash]);
/* plakklare allowlist-regels voor een lijst treffers, per sleutel gegroepeerd */
const plakklaar = lijst => {
  const per = {};
  lijst.forEach(x => { (per[x.sleutel] = per[x.sleutel] || []).push(x); });
  return Object.keys(per).sort().map(k => `  '${k}': { waarom: '…', s: {\n` +
    per[k].map(x => `    '${x.hash}': ${JSON.stringify(x.s.slice(0, 60))},`).join('\n') + '\n  } },').join('\n');
};

/* ============================================================================
   BROWSER
   ============================================================================ */
async function context(browser, o = {}) {
  const ctx = await browser.newContext({
    viewport: { width: o.w || 1440, height: o.h || 900 }, deviceScaleFactor: o.dpr || 1,
    isMobile: !!o.mobiel, hasTouch: !!o.mobiel, userAgent: o.mobiel ? UA : undefined,
    serviceWorkers: 'block', locale: 'nl-BE'
  });
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.host !== HOST) return route.abort();
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
    const f = path.join(WT, rel.split('/').join(path.sep));
    try { if (fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ status: 200, contentType: MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(f) }); } catch (e) {}
    return route.fulfill({ status: 404, contentType: 'text/plain', body: 'weg' });
  });
  /* één keer zaaien per tab (sessionStorage overleeft een herlaad): herladen houdt de save */
  await ctx.addInitScript(([cx, inst]) => {
    try {
      if (!sessionStorage.getItem('nissen_gezaaid')) {
        localStorage.clear();
        localStorage.setItem('slayit_wipe', '1'); localStorage.setItem('slayit_proloog_over', '1'); localStorage.setItem('slayit_nudge', 'weg');
        localStorage.setItem('slayit_inst', JSON.stringify(inst));
        if (cx) localStorage.setItem('slayit_codex', JSON.stringify(cx));
        sessionStorage.setItem('nissen_gezaaid', '1');
      }
    } catch (e) {}
  }, [o.codex || null, Object.assign({ lite: true, d3: false, spraak: true, autoPor: false, mobielHersteld2: true }, o.inst || {})]);
  const page = await ctx.newPage();
  page.__f = [];
  page.on('pageerror', e => page.__f.push(e.message.slice(0, 240)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon|supabase|rest\/v1/i.test(m.text())) page.__f.push('console: ' + m.text().slice(0, 200)); });
  return { ctx, page };
}
async function laad(page) {
  await page.goto('http://' + HOST + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof startGevecht === 'function' && typeof nieuwSpel === 'function' && typeof metgezellenAan === 'function');
  await slaap(300);
  await page.evaluate(() => {
    window.__log = [];
    const om = melding; window.melding = function (x) { window.__log.push('MELDING ' + x); return om.apply(this, arguments); };
    const ob = baasSpreekt; window.baasSpreekt = function (x) { window.__log.push('BAAS ' + x); return ob.apply(this, arguments); };
  });
}
const leesLog = page => page.evaluate(() => { const l = (window.__log || []).slice(); if (window.__log) window.__log.length = 0; return l; });
const leesMgCodex = page => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('slayit_codex') || '{}'); } catch (e) { return { fout: e.message }; } });
const staat = page => page.evaluate(() => ({
  act: (typeof S !== 'undefined' && S) ? S.act : null,
  sMet: (typeof S !== 'undefined' && S && S.metgezel) ? S.metgezel.id : null,
  runMet: (typeof S !== 'undefined' && S && S.runMetgezel) || null,
  gMet: (typeof S !== 'undefined' && S && S.gevecht && S.gevecht.metgezel) ? S.gevecht.metgezel.id : null,
  zone: (() => { const z = document.getElementById('metgezel-zone'); return z ? (z.hidden ? 'verborgen' : 'ZICHTBAAR') : '-'; })(),
  chip: (() => { const c = document.getElementById('tb-metgezel'); return c ? (c.style.display === 'none' ? 'verborgen' : 'ZICHTBAAR') : '-'; })(),
  wereldMet: (() => { const w = document.getElementById('w-metgezel'); return w ? w.innerHTML.length : 0; })()
}));
const zichtbareTekst = page => page.evaluate(() => {
  const zicht = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const stukken = [];
  document.querySelectorAll('body *').forEach(el => {
    if (!zicht(el)) return;
    for (const nd of el.childNodes) if (nd.nodeType === 3 && nd.textContent.trim()) stukken.push(nd.textContent.trim());
    if (el.dataset && el.dataset.tip) stukken.push('[tip] ' + el.dataset.tip);
  });
  return stukken.join(' | ');
});
/* één stap van de doorloop: geen metgezel in de staat, geen verboden woord in beeld */
async function stap(page, scen, naam, uitzondering) {   /* uitzondering: de ene bedoelde regel (het afscheid) */
  const st = await staat(page);
  const tekst = await zichtbareTekst(page);
  const treffers = tekst.split(' | ').filter(s => VERBODEN.test(s) && !(uitzondering && uitzondering.test(s)));
  const log = await leesLog(page);
  t(st.sMet === null && st.runMet === null && st.gMet === null && st.zone !== 'ZICHTBAAR' && st.chip !== 'ZICHTBAAR' && st.wereldMet === 0,
    `${scen} · ${naam}: geen metgezel (S.metgezel ${st.sMet}, runMetgezel ${st.runMet}, g.metgezel ${st.gMet}, zone ${st.zone}, chip ${st.chip}, #w-metgezel ${st.wereldMet} tekens)`);
  t(treffers.length === 0, `${scen} · ${naam}: 0 verboden woorden in beeld en in de tips` + (treffers.length ? ' — ' + treffers.slice(0, 3).map(s => s.slice(0, 120)).join(' || ') : ''));
  return { st, log, tekst };
}

(async () => {
  const browser = await chromium.launch();
  const fouten = [];   /* paginafouten over alle contexten */
  const sluit = async (ctx, page, wat) => { if (page.__f.length) fouten.push(wat + ': ' + page.__f.slice(0, 3).join(' | ')); await ctx.close(); };

  /* ============================================================
     A · DE BRON
     ============================================================ */
  if (doe('bron')) {
    kop('A · de bron: één vlag, één lezer, de grep-wacht');
    const game = fs.readFileSync(path.join(WT, 'js/game.js'), 'utf8');
    const vlag = (game.match(/^const METGEZELLEN_AAN = (true|false);/mg) || []);
    t(vlag.length === 1 && /false/.test(vlag[0]), `js/game.js zet de vlag precies één keer: ${JSON.stringify(vlag)}`);
    t((game.match(/^function metgezellenAan\(\)/mg) || []).length === 1, 'metgezellenAan() is één keer gedefinieerd');
    /* de DEV-override leeft alleen in het geheugen: nergens in localStorage of een URL */
    const codeRegels = game.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(r => /_devMetgezellen/.test(r.replace(/\/\/.*$/, '')));
    t(codeRegels.length === 3 && !codeRegels.some(r => /localStorage|sessionStorage|location|URLSearchParams/.test(r)),
      `_devMetgezellen: ${codeRegels.length} coderegels (declaratie, lezer, schakelaar), geen opslag: ${codeRegels.map(r => r.trim().slice(0, 60)).join(' || ')}`);
    /* de grep-wacht */
    const bestanden = fs.readdirSync(path.join(WT, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f)
      .concat(fs.existsSync(path.join(WT, 'proloog')) ? fs.readdirSync(path.join(WT, 'proloog')).filter(f => f.endsWith('.js')).map(f => 'proloog/' + f) : []);
    const treffers = [].concat(...bestanden.map(grepWacht));
    if (process.env.SLAYIT_ALLOWLIST === 'druk') console.log('   (druk) PER_STRING-kandidaten (alles buiten HEEL):\n' + plakklaar(treffers.filter(x => !HEEL[x.sleutel])));
    const vreemd = treffers.filter(x => !magTreffer(x));
    const nHeel = treffers.filter(x => HEEL[x.sleutel]).length;
    t(vreemd.length === 0, `grep-wacht over ${bestanden.length} bestanden (js/*.js + proloog/*.js): ${treffers.length} metgezel-strings — ${nHeel} in een functie die als geheel gegate is, ${treffers.length - nHeel} als gekende string (vingerafdruk) in een gemengde functie` +
      (vreemd.length ? ' — BUITEN DE ALLOWLIST: ' + vreemd.slice(0, 6).map(x => `${x.rel}:${x.regel} [${x.sleutel.split(':')[1]}#${x.hash}] "${x.s}"`).join(' || ') : ''));
    if (vreemd.length) console.log('   (plakklaar, pas na bewijs dat ze achter de vlag zitten):\n' + plakklaar(vreemd));
    /* de proloog: elke treffer daar moet als gekende string (niet als hele functie) verantwoord zijn */
    const proloog = treffers.filter(x => /^proloog\/|proloog-brug/.test(x.rel));
    const proloogVreemd = proloog.filter(x => !magTreffer(x) || HEEL[x.sleutel]);
    t(proloogVreemd.length === 0, `de proloog (proloog/*.js + js/proloog-brug.js) noemt geen metgezel: ${proloog.length} treffers, ${proloog.length - proloogVreemd.length} daarvan gekend en verantwoord (${proloog.map(x => '"' + x.s.slice(0, 40) + '"').join(', ') || '—'})`);
    /* de fijnmazigheid zelf: een verzonnen nieuwe string in een grote gemengde functie valt NIET door */
    const nep = { rel: 'js/game.js', sleutel: 'js/game.js:toonCodex', hash: vinger('🐾 Je metgezel wacht hier op je.'), s: '🐾 Je metgezel wacht hier op je.' };
    t(WOORD.test(nep.s) && !magTreffer(nep) && !HEEL['js/game.js:toonCodex'], 'de allowlist is fijnmazig: een nieuwe metgezel-string in toonCodex zou FOUT geven (niet per hele functie toegestaan)');
    const ongebruikt = Object.keys(HEEL).filter(k => !treffers.some(x => x.sleutel === k))
      .concat(...Object.keys(PER_STRING).map(k => Object.keys(PER_STRING[k].s).filter(h => !treffers.some(x => x.sleutel === k && x.hash === h)).map(h => k + '#' + h)));
    console.log('   (info) allowlist-regels zonder treffer vandaag: ' + (ongebruikt.join(', ') || '—'));
    /* de zelftest van de lexer: een meerregelige template met een geneste template en een regex */
    const proef = literals("const a = `x\n ${b ? 'c d' : `e ${f} g`} h`; // 'nee'\n/* 'nee' */ const r = /ab'c/g; 'ja'").map(x => x.tekst);
    t(proef.includes('c d') && proef.includes('ja') && !proef.includes('nee') && proef.some(x => /^`x/.test(x)), `de lexer leest strings en templates, slaat commentaar en regex over: ${JSON.stringify(proef)}`);
  }

  /* ============================================================
     B · DE SCHERVEN — negen tafelTeksten
     ============================================================ */
  if (doe('scherven')) {
    kop('B · de negen scherfteksten (bron-neutraal)');
    const { ctx, page } = await context(browser, { codex: CODEX.nieuw });
    await laad(page);
    const sch = await page.evaluate(() => alleScherfIds().map(sid => { const d = scherfDef(sid); return { sid, tekst: scherfTekst(sid), tafel: d.tafelTekst, codex: d.codexTekst }; }));
    t(sch.length === 9, `${sch.length} scherven`);
    t(sch.every(x => x.tafel && x.tekst === x.tafel), 'scherfTekst(sid) = de tafelTekst met de vlag uit, voor alle negen');
    t(sch.every(x => x.tafel !== x.codex), 'de codexTekst (lore) blijft ernaast staan, ongewijzigd');
    const verb = sch.filter(x => VERBODEN.test(x.tekst));
    t(verb.length === 0, `0 van ${sch.length} met een verboden woord` + (verb.length ? ': ' + verb.map(x => x.sid).join(', ') : ''));
    const plek = sch.filter(x => VINDPLAATS.test(x.tekst));
    t(plek.length === 0, `geen enkele noemt een vindplaats (baas/raadsel/geschenk/gevecht/figuur/elite/kist)` + (plek.length ? ': ' + plek.map(x => x.sid + ' "' + x.tekst + '"').join(' || ') : ''));
    /* de poorten: elke gegate functie leest de vlag */
    const poorten = await page.evaluate(() => {
      const namen = ['heeftMetgezel', 'geefMetgezel', 'kiesRunMetgezel', 'volgendeAct', 'dropsInRouw', 'magWitTerugkeren', 'revealDropsWit',
        'toonRust', 'renderTopbalk', 'laadSpel', 'scherfTekst', 'toonBaasIntro', 'meestGevorderdeMysterie', 'scherfCodexBlok', 'toonCodex'];
      return namen.map(n => ({ n, ok: typeof window[n] === 'function' && /metgezellenAan\(\)/.test(window[n].toString()) }));
    });
    const zonder = poorten.filter(p => !p.ok).map(p => p.n);
    t(zonder.length === 0, `de ${poorten.length} gegate functies lezen metgezellenAan()` + (zonder.length ? ' — ZONDER: ' + zonder.join(', ') : ''));
    const roddel = await page.evaluate(() => ({ tekst: KAARTEN.de_roddel.tekst({ id: 'de_roddel' }), flavor: KAARTEN.de_roddel.flavor }));
    t(roddel.tekst === 'Onbespeelbaar. Neemt ruimte in je hand in.' && !VERBODEN.test(roddel.flavor), `De Roddel: "${roddel.tekst}" / "${roddel.flavor}"`);
    const orakel = await page.evaluate(() => UITSPRAKEN._erfprins.orakelSolo);
    t(Array.isArray(orakel) && orakel.length === 4 && !orakel.some(r => VERBODEN.test(r) || /poort|breker|vóédt/i.test(r)), `orakelSolo: ${orakel.length} regels, geen belofte van een breker`);
    t(await page.evaluate(() => metgezellenAan() === false && METGEZELLEN_AAN === false), 'metgezellenAan() === false bij het laden');
    await sluit(ctx, page, 'scherven');
  }

  /* ============================================================
     K · DE POORTEN ÉÉN VOOR ÉÉN (integratie) — elk van V2-V8 op zijn eigen gedrag, met een
     Codex in rouw (Drops gevallen, de Mosgeest ontwaakt) en een STALE S.metgezel die de oude
     code wél zou laten meevechten. Leegte-wacht: dezelfde aanroepen met de DEV-schakelaar AAN
     moeten de metgezel wél opleveren — anders meet een 'uit' niets.
     ============================================================ */
  if (doe('poorten')) {
    kop('K · de poorten één voor één (V2-V8), met een stale metgezel in de run');
    const { ctx, page } = await context(browser, { codex: CODEX.rouw });
    await laad(page);
    const cxVoor = await leesMgCodex(page);
    const meet = () => page.evaluate(async () => {
      nieuwSpel('slachter', 'NISSEN-POORTEN'); S.act = 2; S.kaart = genereerKaart();
      S.metgezel = { id: 'mosgeest', hp: 10, maxHp: 20, vluchtig: false };   /* stale: zoals een oude save hem droeg */
      const uit = {};
      uit.v2 = heeftMetgezel();
      renderTopbalk();
      const chip = document.getElementById('tb-metgezel');
      uit.v8 = !!chip && chip.style.display !== 'none';
      uit.v4 = kiesRunMetgezel();
      uit.v6rouw = dropsInRouw();
      startGevecht(['echo'], 'gevecht', 1);
      await new Promise(r => setTimeout(r, 400));
      uit.v2g = S.gevecht && S.gevecht.metgezel ? S.gevecht.metgezel.id : null;
      const mz = document.getElementById('metgezel-zone'); uit.zone = !!mz && !mz.hidden;
      try { S.gevecht.voorbij = true; stopGevechtLus(); } catch (e) {}
      S.gevecht = null;
      startGevecht(['de_erfprins'], 'baas', 15);
      await new Promise(r => setTimeout(r, 300));
      uit.v6wit = magWitTerugkeren();
      try { S.gevecht.voorbij = true; stopGevechtLus(); } catch (e) {}
      S.gevecht = null;
      document.querySelectorAll('#baas-intro, .baas-intro, .baas-flits, .baas-spraak').forEach(nd => { try { nd.remove(); } catch (e) {} });
      toonRust();
      uit.v7 = !!document.getElementById('kv-geest');
      uit.ontgrendeld = ontgrendeldeMetgezellen().length;
      return uit;
    });
    const uit = await meet();
    t(uit.ontgrendeld >= 1, `de Codex heeft echt een vrijgespeelde metgezel (${uit.ontgrendeld}) en Drops is gevallen — de poorten hebben iets om tegen te houden`);
    t(uit.v2 === false && uit.v2g === null && !uit.zone, `V2 heeftMetgezel(): ${uit.v2} met een stale Mosgeest in de run → het gevecht bouwt g.metgezel ${uit.v2g}, zone zichtbaar ${uit.zone}`);
    const v3 = await page.evaluate(() => {
      nieuwSpel('slachter', 'NISSEN-V3'); S.metgezel = null;
      const voor = JSON.stringify(Codex.metgezellen); const n = document.querySelectorAll('#meldingen .toast').length;
      geefMetgezel('vlamwachter');
      return { sMet: S.metgezel ? S.metgezel.id : null, codexGelijk: JSON.stringify(Codex.metgezellen) === voor, toasts: document.querySelectorAll('#meldingen .toast').length - n };
    });
    t(v3.sMet === null && v3.codexGelijk && v3.toasts === 0, `V3 geefMetgezel('vlamwachter') → S.metgezel ${v3.sMet}, Codex.metgezellen ongewijzigd ${v3.codexGelijk}, ${v3.toasts} meldingen`);
    t(uit.v4 === null, `V4 kiesRunMetgezel() → ${uit.v4} (geen heldkeuze-band, geen rotatie)`);
    t(uit.v6rouw === false && uit.v6wit === false, `V6 dropsInRouw() ${uit.v6rouw}, magWitTerugkeren() in het Erfprins-gevecht ${uit.v6wit}`);
    const v6r = await page.evaluate(async () => {
      nieuwSpel('slachter', 'NISSEN-V6'); S.act = 2; startGevecht(['de_erfprins'], 'baas', 15);
      await new Promise(r => setTimeout(r, 300));
      const g = S.gevecht; revealDropsWit(g, 'licht');
      const r = { wit: (Codex.metgezellen || []).includes('drops_wit') || !!(Codex.mysteries && Codex.mysteries.drops_wit && Codex.mysteries.drops_wit.voltooid), gMet: g.metgezel ? g.metgezel.id : null };
      try { g.voorbij = true; stopGevechtLus(); } catch (e) {}
      S.gevecht = null;
      return r;
    });
    t(!v6r.wit && v6r.gMet === null, `V6 revealDropsWit() is een no-op: de Witte niet ontgrendeld (${v6r.wit}), g.metgezel ${v6r.gMet}`);
    t(uit.v7 === false, `V7 kampvuur: geen geest van Drops (#kv-geest ${uit.v7})`);
    t(uit.v8 === false, `V8 topbalk-chip: verborgen met een stale metgezel in de run (zichtbaar ${uit.v8})`);
    /* de leegte-wacht: met de DEV-schakelaar AAN openen dezelfde poorten wél (alleen lezende aanroepen) */
    const aan = await page.evaluate(() => {
      devMetgezellen(true);
      nieuwSpel('slachter', 'NISSEN-POORTEN-AAN'); S.act = 2;
      S.metgezel = { id: 'mosgeest', hp: 10, maxHp: 20, vluchtig: false };
      renderTopbalk();
      const chip = document.getElementById('tb-metgezel');
      const r = { v2: heeftMetgezel(), v4: kiesRunMetgezel(), v6rouw: dropsInRouw(), v8: !!chip && chip.style.display !== 'none' };
      devMetgezellen(false);
      return r;
    });
    t(aan.v2 === true && !!aan.v4 && aan.v6rouw === true && aan.v8 === true,
      `leegte-wacht: met de DEV-schakelaar AAN gaan dezelfde poorten open (heeftMetgezel ${aan.v2}, kiesRunMetgezel ${aan.v4}, dropsInRouw ${aan.v6rouw}, chip ${aan.v8})`);
    const cxNa = await leesMgCodex(page);
    t(normaliseer(cxNa) === normaliseer(cxVoor), 'de metgezelsleutels van de Codex zijn na de poortproeven inhoudelijk gelijk' + (normaliseer(cxNa) === normaliseer(cxVoor) ? '' : ` — voor ${normaliseer(cxVoor)} na ${normaliseer(cxNa)}`));
    t(page.__f.length === 0, 'geen paginafouten' + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
    await sluit(ctx, page, 'poorten');
  }

  /* ============================================================
     C · DE DOORLOOP — drie Codexen + de daily, van heldkeuze tot de Codex
     ============================================================ */
  if (doe('doorloop')) {
    for (const scen of ['ontwaakt', 'rouw', 'nieuw', 'daily']) {
      const daily = scen === 'daily';
      kop('C · doorloop met Codex "' + scen + '"' + (daily ? ' (de dagelijkse afdaling, Codex met ontwaakte Drops)' : ''));
      const { ctx, page } = await context(browser, { codex: codexVan(scen) });
      await laad(page);
      /* heldkeuze + de scherf-loadout (de tips lezen scherfTekst) */
      await page.evaluate(() => toonHeldKeuze()); await slaap(500);
      await stap(page, scen, 'heldkeuze');
      const lo = await page.evaluate(() => [...document.querySelectorAll('.scherf-slot[data-shart]')].map(b => ({ sid: b.dataset.shart, tip: b.dataset.tip, moet: scherfTekst(b.dataset.shart) })));
      t(lo.length === codexVan(scen).scherven.length && lo.every(x => x.tip === x.moet), `${scen} · heldkeuze: ${lo.length} scherven in de loadout, elke tip = scherfTekst (de tafelTekst)`);
      /* Act 1 → de Drempeltafel → Act 2 (de daily: via startDaily, en daar staat de tafel uit) */
      if (daily) {
        const dg = await page.evaluate(() => { startDaily(); S.act = 1; ['drops_baas', 'vlamwachter_figuur', 'mosgeest_episch'].forEach(s => draagScherf(s)); renderTopbalk(); return { daily: !!S.daily, held: S.held, dagwet: S.dagwet || null }; });
        t(dg.daily === true, `daily · startDaily() zet een dagelijkse afdaling op (held ${dg.held}, dagwet ${dg.dagwet})`);
        await slaap(600);
        await stap(page, scen, 'daily-start (Act 1-kaart)');
      } else {
        await page.evaluate(() => { nieuwSpel('slachter', 'NISSEN-DOORLOOP'); S.act = 1; ['drops_baas', 'vlamwachter_figuur', 'mosgeest_episch'].forEach(s => draagScherf(s)); renderTopbalk(); });
      }
      await page.evaluate(() => volgendeAct('De Slijmkoning')); await slaap(900);
      if (!daily) {
        await stap(page, scen, 'Drempeltafel (einde Act 1)');
        await page.evaluate(() => dtLoopVoorbij()); await slaap(900);
      } else {
        t(await page.evaluate(() => !document.querySelector('#overlay-drempeltafel.open') && S.act === 2), 'daily · geen Drempeltafel: meteen de Act 2-overgang');
      }
      const overgang = await stap(page, scen, daily ? 'Act 2-overgang (daily, geen tafel)' : 'Act 2-overgang na Loop voorbij');
      t(!overgang.log.some(l => /met je mee|daalt mee|rankt met je mee|zweeft .* mee/i.test(l)), `${scen} · geen instapmelding bij Act 2 (V5): ${overgang.log.filter(l => /MELDING/.test(l)).map(l => l.slice(8, 70)).join(' | ') || '—'}`);
      await page.evaluate(() => renderKaartScherm()); await slaap(600);
      await stap(page, scen, 'Act 2-kaart');
      await page.evaluate(() => startGevecht(['echo', 'naaper'], 'gevecht', 1)); await slaap(1600);
      await stap(page, scen, 'Act 2-gevecht');
      await page.evaluate(() => { stopGevechtLus(); S.gevecht = null; toonRust(); }); await slaap(700);
      await stap(page, scen, 'kampvuur Act 2');
      t(await page.evaluate(() => !document.getElementById('kv-geest')), `${scen} · geen geest aan het kampvuur (V7)`);
      /* de Erfprins: orakel op 6,4 s, nudge op 9,2 s */
      await page.evaluate(() => startGevecht(['de_erfprins'], 'baas', 14)); await slaap(11500);
      const erfStap = await stap(page, scen, 'Erfprins-gevecht (11,5 s, niet aangevallen)');
      const erf = await page.evaluate(() => ({ solo: UITSPRAKEN._erfprins.orakelSolo, oud: UITSPRAKEN._erfprins.orakel, dossier: UITSPRAKEN._erfprins.dossier, gebroken: !!(S.gevecht && S.gevecht.copycatGebroken) }));
      const baas = erfStap.log.filter(l => l.startsWith('BAAS ')).map(l => l.slice(5));
      const orakelGezegd = baas.filter(l => erf.solo.includes(l) || erf.oud.includes(l));
      t(orakelGezegd.length === 1 && erf.solo.includes(orakelGezegd[0]), `${scen} · het orakel is een orakelSolo-regel: "${orakelGezegd[0] || '—'}"`);
      t(!baas.some(l => l === erf.dossier || /pássen|Gooi\. Het\. Weg|DICHT gemoeten|geïndexeerd/.test(l)), `${scen} · geen scherven-nudge, geen dossier: ${baas.map(l => l.slice(0, 50)).join(' | ')}`);
      t(!erf.gebroken, `${scen} · copycatGebroken false in het Erfprins-gevecht`);
      /* de scherf-reveal in Act 2: tafelTekst, geen Drempel die al voorbij is */
      await page.evaluate(() => toonScherfReveal('drops_episch', { kop: 'TEST' })); await slaap(500);
      const rev = await page.evaluate(() => ({ tekst: (document.querySelector('.scherf-reveal-overlay') || {}).textContent || '', moet: scherfTekst('drops_episch') }));
      await stap(page, scen, 'scherf-reveal in Act 2');
      t(rev.tekst.includes(rev.moet) && /bankt bij het einde van je run/.test(rev.tekst) && !/neem 'm mee naar de Drempel/.test(rev.tekst),
        `${scen} · de reveal leest de tafelTekst en zegt in Act 2 dat hij bankt: "${rev.tekst.replace(/\s+/g, ' ').trim().slice(0, 140)}"`);
      await page.evaluate(() => { document.querySelectorAll('.scherf-reveal-overlay').forEach(nd => nd.remove()); stopGevechtLus(); S.gevecht = null; volgendeAct('De Erfprins'); }); await slaap(900);
      await stap(page, scen, 'Act 3-overgang');
      await page.evaluate(() => startGevecht(['de_omroeper', 'het_klapvee'], 'gevecht', 3)); await slaap(1600);
      await stap(page, scen, 'Act 3-gevecht');
      await page.evaluate(() => { stopGevechtLus(); S.gevecht = null; S.hp = Math.max(1, S.hp - 20); toonRust(); }); await slaap(700);
      await stap(page, scen, 'kampvuur Act 3');
      /* de figuur-events (T11/T12) en de nederlaag-duiding (T20) */
      const ev = await page.evaluate(() => {
        const E = (typeof EVENTS !== 'undefined' ? EVENTS : []);
        const l = E.find(e => e.id === 'lantaarndrager'), sp = E.find(e => e.id === 'spiegelaar');
        const keuze = l ? l.opties[0].doe() : '';
        document.querySelectorAll('.scherf-reveal-overlay').forEach(nd => nd.remove());
        const tafel = alleScherfIds().map(sid => scherfDef(sid).tafelTekst);
        return { lTekst: l ? l.tekst : '', keuze, sTekst: sp ? sp.tekst : '', tafelInKeuze: tafel.some(x => keuze.includes(x)), duiding: mysterieDuiding(1) };
      });
      t(/wát je bij je draagt/.test(ev.lTekst) && /ligt straks op tafel/.test(ev.sTekst) && !VERBODEN.test(ev.lTekst + ev.sTekst), `${scen} · Lantaarndrager en Spiegelaar volgen de tafel, niet een wezen`);
      t(ev.tafelInKeuze && !VERBODEN.test(ev.keuze), `${scen} · het afscheid van de Lantaarndrager is een tafelTekst: "${ev.keuze.slice(0, 110)}"`);
      t(!VERBODEN.test(ev.duiding), `${scen} · de nederlaag-duiding noemt geen metgezel: "${ev.duiding.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 110)}"`);
      /* de Codex (T7/T9) */
      await page.evaluate(() => toonCodex()); await slaap(500);
      await stap(page, scen, 'Codex');
      const cx = await page.evaluate(() => ({
        mgKop: [...document.querySelectorAll('#overlay-codex .codex-kop')].some(h => /Metgezellen/.test(h.textContent)),
        verbruikt: document.querySelectorAll('#overlay-codex .scherf-cx-slot.verbruikt').length,
        doorgrond: /doorgrond/.test((document.getElementById('overlay-codex') || {}).textContent || ''),
        voet: ((document.querySelector('#overlay-codex .codex-voet') || {}).textContent || '').replace(/\s+/g, ' ').trim()
      }));
      t(!cx.mgKop && cx.verbruikt === 0 && !cx.doorgrond, `${scen} · Codex: geen blok Metgezellen, geen 'doorgrond'/'verbruikt' trio (kop ${cx.mgKop}, verbruikt ${cx.verbruikt}, doorgrond ${cx.doorgrond})`);
      await page.screenshot({ path: path.join(UIT, `codex-${scen}.png`) });
      if (daily) t(await page.evaluate(() => !!(S && S.daily)), 'daily · de run is tot in Act 3 een daily gebleven');
      const cxNa = await leesMgCodex(page);
      t(normaliseer(cxNa) === normaliseer(codexVan(scen)), `${scen} · de metgezelsleutels van de Codex zijn na de doorloop inhoudelijk gelijk (niets gewist, niets bijgeschreven)` +
        (normaliseer(cxNa) === normaliseer(codexVan(scen)) ? '' : ` — voor ${normaliseer(codexVan(scen))} na ${normaliseer(cxNa)}`));
      t(page.__f.length === 0, `${scen} · geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 2).join(' | ') : ''));
      await sluit(ctx, page, 'doorloop ' + scen);
    }
  }

  /* ============================================================
     D · EEN LOPENDE RUN MET EEN METGEZEL (van vóór de parkering)
     ============================================================ */
  if (doe('save')) {
    for (const mgid of ['drops', 'vlamwachter']) {
      kop('D · lopende save met ' + mgid + ': wegsturen, één regel, één keer');
      const { ctx, page } = await context(browser, { codex: CODEX.ontwaakt });
      await laad(page);
      /* de save maken zoals de oude code hem schreef: vlag even aan, metgezel erin, bewaren */
      const naam = await page.evaluate(id => {
        _devMetgezellen = true;
        nieuwSpel('slachter', 'NISSEN-SAVE'); S.act = 2; S.kaart = genereerKaart(); geefMetgezel(id); S.runMetgezel = id; S.metgezel.hp = 17; saveSpel();
        _devMetgezellen = false;
        return METGEZELLEN[id].naam;
      }, mgid);
      const saveMet = () => page.evaluate(() => { try { const s = JSON.parse(localStorage.getItem('slayit_save_v1')); return { metgezel: s.metgezel ? s.metgezel.id : null, runMetgezel: s.runMetgezel || null, vlag: '_mgAfscheid' in s }; } catch (e) { return { fout: e.message }; } });
      const voor = await saveMet();
      t(voor.metgezel === mgid && voor.runMetgezel === mgid, `de save vóór het laden draagt ${JSON.stringify(voor)}`);
      /* herlaad 1 */
      await laad(page);
      await page.evaluate(() => doorgaan()); await slaap(2300);
      const toast1 = await page.evaluate(() => [...document.querySelectorAll('#meldingen .toast')].map(e => e.textContent).filter(x => /blijft achter/.test(x)));
      const na1 = await saveMet();
      const s1 = await stap(page, 'save/' + mgid, 'herlaad 1 (de afscheidsregel is de enige bedoelde treffer)', /^🐾 .+ blijft achter\. Vanaf hier daal je alleen af\.$/);
      await page.screenshot({ path: path.join(UIT, `save-${mgid}-herlaad1.png`) });
      /* herlaad 2 — ZONDER tussentijdse save */
      await laad(page);
      await page.evaluate(() => doorgaan()); await slaap(2300);
      const na2 = await saveMet();
      const s2 = await stap(page, 'save/' + mgid, 'herlaad 2 (zonder save ertussen)');
      const regels = [...s1.log, ...s2.log].filter(l => /blijft achter/.test(l));
      const moet = 'MELDING 🐾 ' + naam + ' blijft achter. Vanaf hier daal je alleen af.';
      t(regels.length === 1 && regels[0] === moet, `de afscheidsregel verschijnt precies één keer over twee herlaadbeurten: ${regels.length}× "${(regels[0] || '').slice(8)}"`);
      t(regels.length === 1 && !/nissen/i.test(regels[0]), 'de regel noemt geen nissen (de Drempeltafel laat je nissen juist voeden)');
      t(toast1.length === 1, `de regel staat ook echt in beeld na herlaad 1: ${JSON.stringify(toast1)}`);
      t(na1.metgezel === null && na1.runMetgezel === null && !na1.vlag && na2.metgezel === null && na2.runMetgezel === null && !na2.vlag,
        `de save is na herlaad 1 al schoon: ${JSON.stringify(na1)} · na herlaad 2: ${JSON.stringify(na2)}`);
      await page.evaluate(() => startGevecht(['echo', 'naaper'], 'gevecht', 1)); await slaap(1500);
      await stap(page, 'save/' + mgid, 'Act 2-gevecht na de herlaad');
      t(page.__f.length === 0, `save/${mgid} · geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 2).join(' | ') : ''));
      await sluit(ctx, page, 'save ' + mgid);
    }
    kop('D · een stale S.runMetgezel (V5) en een save zonder metgezel');
    {
      const { ctx, page } = await context(browser, { codex: CODEX.ontwaakt });
      await laad(page);
      /* V5: een run met alleen een gecachete runMetgezel mag bij de act-overgang niets aankondigen */
      await page.evaluate(() => { nieuwSpel('slachter', 'NISSEN-V5'); S.act = 1; S.metgezel = null; S.runMetgezel = 'drops'; volgendeAct('De Slijmkoning'); try { dtLoopVoorbij(); } catch (e) {} });
      await slaap(900);
      const v5 = await page.evaluate(() => ({ sMet: S.metgezel ? S.metgezel.id : null }));
      const v5log = (await leesLog(page)).filter(l => /MELDING/.test(l));
      t(v5.sMet === null && !v5log.some(l => /met je mee|daalt mee|rankt|zweeft/i.test(l)), `stale runMetgezel 'drops' + volgendeAct → geen metgezel, geen instapmelding (${v5log.map(l => l.slice(8, 60)).join(' | ') || 'geen meldingen'})`);
      /* een save met alleen een runMetgezel (Act 1, de metgezel zou pas in Act 2 instappen) */
      await page.evaluate(() => { nieuwSpel('slachter', 'NISSEN-RUN'); S.act = 1; S.metgezel = null; S.runMetgezel = 'vlamwachter'; saveSpel(); });
      await laad(page);
      await page.evaluate(() => doorgaan()); await slaap(2300);
      const r = await page.evaluate(() => ({ run: S.runMetgezel || null, sMet: S.metgezel ? S.metgezel.id : null }));
      const rlog = (await leesLog(page)).filter(l => /blijft achter/.test(l));
      t(r.run === null && r.sMet === null && rlog.length === 0, `een save met alleen runMetgezel: in het geheugen gewist (${JSON.stringify(r)}), geen afscheidsregel (er stond niemand naast je): ${rlog.length}×`);
      t(page.__f.length === 0, 'geen paginafouten' + (page.__f.length ? ' — ' + page.__f.slice(0, 2).join(' | ') : ''));
      await sluit(ctx, page, 'save V5');
    }
  }

  /* ============================================================
     E · DE DEV-SCHAKELAAR — heen en terug
     ============================================================ */
  if (doe('dev')) {
    kop('E · de DEV-schakelaar: geparkeerd, aan, uit, herlaad');
    const { ctx, page } = await context(browser, { codex: CODEX.rouw });
    await laad(page);
    const cxVoor = await leesMgCodex(page);
    await page.evaluate(() => { nieuwSpel('slachter', 'NISSEN-DEV'); devMetgezel('drops'); devDropsLevend(); });
    await slaap(400);
    const geweigerd = await page.evaluate(() => ({ aan: metgezellenAan(), sMet: S.metgezel ? S.metgezel.id : null, gevecht: !!S.gevecht }));
    const wlog = (await leesLog(page)).filter(l => /geparkeerd/.test(l));
    const cxNa = await leesMgCodex(page);
    t(!geweigerd.aan && geweigerd.sMet === null && !geweigerd.gevecht && wlog.length === 2,
      `geparkeerd: devMetgezel('drops') en devDropsLevend() weigeren ZICHTBAAR (${wlog.length}× "geparkeerd"), S.metgezel ${geweigerd.sMet}, geen gevecht gestart`);
    t(normaliseer(cxNa) === normaliseer(cxVoor), 'de geweigerde Drops-boog schreef niets in de Codex');
    await page.evaluate(() => { devMetgezellen(true); devMetgezel('drops'); startGevecht(['echo'], 'gevecht', 1); });
    await slaap(1500);
    let st = await staat(page);
    t(await page.evaluate(() => metgezellenAan()) && st.gMet === 'drops' && st.zone === 'ZICHTBAAR' && st.chip === 'ZICHTBAAR',
      `schakelaar AAN + devMetgezel('drops') + gevecht → g.metgezel ${st.gMet}, zone ${st.zone}, chip ${st.chip}`);
    await page.evaluate(() => { devMetgezellen(false); stopGevechtLus(); S.gevecht = null; startGevecht(['echo'], 'gevecht', 1); });
    await slaap(1500);
    st = await staat(page);
    t(!(await page.evaluate(() => metgezellenAan())) && st.sMet === null && st.gMet === null && st.zone !== 'ZICHTBAAR' && st.chip !== 'ZICHTBAAR',
      `schakelaar UIT → S.metgezel ${st.sMet}, volgend gevecht g.metgezel ${st.gMet}, zone ${st.zone}, chip ${st.chip}`);
    await page.evaluate(() => devMetgezellen(true));
    await laad(page);
    t(await page.evaluate(() => metgezellenAan() === false), 'herlaad → weer geparkeerd (de override leeft alleen in het geheugen)');
    t(page.__f.length === 0, 'geen paginafouten' + (page.__f.length ? ' — ' + page.__f.slice(0, 2).join(' | ') : ''));
    await sluit(ctx, page, 'dev');
  }

  /* ============================================================
     G · DE DEV-BUILDS EN DE SPRONGEN ZIJN SOLO (M-plan §6: meten, niet aannemen)
     ============================================================ */
  if (doe('builds')) {
    kop('G · DEV_BUILDS, devDicktator en devErfprins zijn solo');
    const { ctx, page } = await context(browser, { codex: CODEX.ontwaakt });
    await laad(page);
    const keys = await page.evaluate(() => Object.keys(DEV_BUILDS));
    const metMg = await page.evaluate(() => Object.keys(DEV_BUILDS).filter(k => DEV_BUILDS[k].metgezel));
    t(metMg.length === 0, `geen enkele DEV_BUILD draagt een metgezel (${keys.length} builds: ${keys.join(', ')})`);
    for (const k of keys) {
      const r = await page.evaluate(k2 => { devDicktator(k2); return { g: !!S.gevecht, gMet: S.gevecht && S.gevecht.metgezel ? S.gevecht.metgezel.id : null, sMet: S.metgezel ? S.metgezel.id : null }; }, k);
      t(r.g && r.gMet === null && r.sMet === null, `devDicktator('${k}') → het proces staat solo: g.metgezel ${r.gMet}, S.metgezel ${r.sMet}`);
      await slaap(600);
      await page.evaluate(() => { try { S.gevecht.voorbij = true; stopGevechtLus(); } catch (e) {} try { regieOpruimAlles(); } catch (e) {} S.gevecht = null; });
    }
    const e = await page.evaluate(() => { devErfprins(); return { gMet: S.gevecht && S.gevecht.metgezel ? S.gevecht.metgezel.id : null, sMet: S.metgezel ? S.metgezel.id : null }; });
    t(e.gMet === null && e.sMet === null, `devErfprins() → solo: g.metgezel ${e.gMet}, S.metgezel ${e.sMet}`);
    await slaap(600);
    t(page.__f.length === 0, 'geen paginafouten' + (page.__f.length ? ' — ' + page.__f.slice(0, 2).join(' | ') : ''));
    await sluit(ctx, page, 'builds');
  }

  /* ============================================================
     F · DE ERFPRINS — volledige gevechten met een Codex in rouw, op fakkel 0
     (de twee geheime poorten van de Witte: weer licht maken na gedoofd, en sterven in het donker)
     ============================================================ */
  if (doe('erfprins')) {
    kop('F · de Erfprins: drie volledige gevechten (Codex in rouw), plus de twee Witte-poorten');
    const { ctx, page } = await context(browser, { codex: CODEX.rouw });
    await laad(page);
    const cxVoor = await leesMgCodex(page);
    const solo = await page.evaluate(() => UITSPRAKEN._erfprins.orakelSolo);
    const dossier = await page.evaluate(() => UITSPRAKEN._erfprins.dossier);
    await page.evaluate(() => {
      window.slaap = () => Promise.resolve();
      try { Klank.sfx = () => {}; Klank.muziek = () => {}; Klank.duck = () => {}; } catch (e) {}
      window.schudScherm = () => {};
      window.gevechtGewonnen = async function () { const g = S.gevecht; if (!g || g.voorbij) return; g.voorbij = true; g._gewonnen = true; };
      window.nederlaag = function () { const g = S.gevecht; if (!g || g.voorbij) return; g.voorbij = true; g._verloren = true; };
      window.__ontgrendel = 0;
      const oo = ontgrendelMetgezel; window.ontgrendelMetgezel = function () { window.__ontgrendel++; return oo.apply(this, arguments); };
    });
    for (const seed of ['NISSEN-ERF-1', 'NISSEN-ERF-2', 'NISSEN-ERF-3']) {
      const r = await Promise.race([
        page.evaluate(async sd => {
          const wacht = ms => new Promise(res => setTimeout(res, ms));
          if (S && S.gevecht) { try { S.gevecht.voorbij = true; stopGevechtLus(); } catch (e) {} }
          nieuwSpel('slachter', sd);
          S.gevecht = null; S.act = 2; S.fakkel = fakkelMax(); S.pos = null; S.maxHp = 90; S.hp = 80; S.dranken = ['heeldrank'];
          let v = 0; while (S.dek.length < 18 && v++ < 40) S.dek.push(nieuweKaart(kiesUit(heldPool())));
          S.kaart = genereerKaart();
          startGevecht(['de_erfprins'], 'baas', 15);
          const g = S.gevecht;
          const boss = () => g.vijanden.find(x => x.id === 'de_erfprins');
          const vrij = async () => { let w = 0; while ((g.ceremonie || g.bezig || g._regieBezig) && w++ < 600 && S.gevecht === g && !g.voorbij) await wacht(15); };
          await wacht(300); await vrij();
          document.querySelectorAll('#baas-intro, .baas-intro').forEach(nd => { try { nd.remove(); } catch (e) {} });
          let gMetOoit = !!g.metgezel, ronde = 0, fout = null;
          /* poort A: gedoofd, en dan weer licht maken (de oude code liet de Witte hier terugkeren) */
          S.fakkel = 0; zetLichtVisueel(); zetFakkel(15); zetFakkel(-15);
          gMetOoit = gMetOoit || !!g.metgezel;
          try {
            while (!g.voorbij && S.gevecht === g && S.hp > 0 && ronde < 30) {
              await vrij(); if (g.voorbij) break;
              ronde++; const beurt = g.beurt; let guard = 0;
              while (guard++ < 20 && !g.voorbij && g.beurt === beurt) {
                await vrij(); if (g.voorbij || g.beurt !== beurt) break;
                const c = g.hand.find(k => { const d = kdef(k), kost = kkost(k); return d && d.type !== 'vloek' && kost !== null && kost <= g.energie && (!d.kan || d.kan(k)); });
                if (!c) break;
                await speelKaart(c, kdef(c).doel === 'vijand' ? boss() : undefined);
                gMetOoit = gMetOoit || !!g.metgezel;
              }
              await vrij(); if (g.voorbij) break;
              if (S.hp < S.maxHp * 0.35) { const i = S.dranken.indexOf('heeldrank'); if (i >= 0) { try { gebruikDrank(i); } catch (e) {} } }
              let pog = 0;
              while (g.beurt === beurt && !g.voorbij && pog++ < 5) { await vrij(); await eindBeurt(); await vrij(); }
              gMetOoit = gMetOoit || !!g.metgezel;
              if (g.beurt === beurt && !g.voorbij) { fout = 'eindBeurt kwam niet door (ronde ' + ronde + ')'; break; }
            }
          } catch (e) { fout = String((e && e.stack) || e).slice(0, 300); }
          const b = boss();
          const uit = { ronde, gewonnen: !!g._gewonnen, verloren: !!g._verloren || S.hp <= 0, gebroken: !!g.copycatGebroken, gMetOoit,
            ontgrendel: window.__ontgrendel, wit: !!(Codex.mysteries && Codex.mysteries.drops_wit && Codex.mysteries.drops_wit.voltooid), fout, baasHp: b ? b.hp : null, hp: S.hp };
          try { g.voorbij = true; stopGevechtLus(); } catch (e) {}
          S.gevecht = null;
          document.querySelectorAll('#baas-intro, .baas-flits, .baas-spraak, .roof-overlay, .roof-speel-kaart, .steel-vlieger').forEach(nd => { try { nd.remove(); } catch (e) {} });
          return uit;
        }, seed),
        slaap(150000).then(() => ({ fout: 'TIMEOUT 150 s' }))
      ]);
      const log = (await leesLog(page)).filter(l => l.startsWith('BAAS ')).map(l => l.slice(5));
      t(!r.fout && (r.gewonnen || r.verloren || r.ronde >= 30), `${seed}: volledig gevecht — ${r.gewonnen ? 'gewonnen' : r.verloren ? 'verloren' : 'na ' + r.ronde + ' rondes gestopt'} in ${r.ronde} rondes (baas ${r.baasHp} HP, jij ${r.hp} HP)` + (r.fout ? ' — ' + r.fout : ''));
      t(!r.gMetOoit && !r.gebroken && r.ontgrendel === 0 && !r.wit, `${seed}: nooit een metgezel (${r.gMetOoit}), copycatGebroken ${r.gebroken}, de Witte niet teruggekeerd (ontgrendelMetgezel ${r.ontgrendel}×) — ook niet na gedoofd → weer licht`);
      const vreemd = log.filter(l => l === dossier || /pássen|Gooi\. Het\. Weg|DICHT gemoeten|geïndexeerd/.test(l));
      const oudOrakel = log.filter(l => /trouw blíjft zonder loon|wat die poort wakker maakt/.test(l));
      t(vreemd.length === 0 && oudOrakel.length === 0, `${seed}: geen dossier, geen nudge, geen oud orakel (${log.length} baasregels; orakelSolo gezegd: ${log.filter(l => solo.includes(l)).length}×)`);
    }
    /* poort B: sterven in het donker (de oude code: de Witte springt ertussen en je staat op 40 %) */
    const pb = await page.evaluate(async () => {
      nieuwSpel('slachter', 'NISSEN-POORTB'); S.act = 2; S.maxHp = 90; S.hp = 1; S.relikwieen = [];
      startGevecht(['de_erfprins'], 'baas', 15);
      const g = S.gevecht;
      await new Promise(res => setTimeout(res, 300));
      S.fakkel = 0; zetLichtVisueel();
      verliesHp(sp(), 6, g.vijanden[0]);
      await new Promise(res => setTimeout(res, 200));
      return { hp: S.hp, verloren: !!g._verloren || g.voorbij, gMet: !!g.metgezel, ontgrendel: window.__ontgrendel, wit: !!(Codex.mysteries && Codex.mysteries.drops_wit && Codex.mysteries.drops_wit.voltooid) };
    });
    t(pb.hp === 0 && pb.verloren && !pb.gMet && pb.ontgrendel === 0 && !pb.wit, `poort B: sterven op fakkel 0 is gewoon sterven — HP ${pb.hp}, verloren ${pb.verloren}, geen Witte (ontgrendelMetgezel ${pb.ontgrendel}×)`);
    const cxNa = await leesMgCodex(page);
    t(normaliseer(cxNa) === normaliseer(cxVoor), 'de metgezelsleutels van de Codex zijn na drie Erfprins-gevechten inhoudelijk gelijk' +
      (normaliseer(cxNa) === normaliseer(cxVoor) ? '' : ` — voor ${normaliseer(cxVoor)} na ${normaliseer(cxNa)}`));
    t(page.__f.length === 0, 'geen paginafouten' + (page.__f.length ? ' — ' + page.__f.slice(0, 3).join(' | ') : ''));
    await sluit(ctx, page, 'erfprins');
  }

  /* ============================================================
     H · DE BEELDCONTROLE (M-plan §5): Thomas' scherm = de solo-opstelling van een nieuwe speler
     ============================================================ */
  if (doe('beeld')) {
    kop('H · beeldcontrole: Codex met Drops tegen een verse Codex, zelfde seed, echte act-overgang');
    const FORMATEN = [
      { id: '800x360', w: 800, h: 360, mobiel: true, dpr: 2 },
      { id: '846x381', w: 846, h: 381, mobiel: true, dpr: 2 },
      { id: '1440x900 2D', w: 1440, h: 900, d3: false },
      { id: '1440x900 3D', w: 1440, h: 900, d3: true },
      { id: '1366x768 2D', w: 1366, h: 768, d3: false },
      { id: '1366x768 3D', w: 1366, h: 768, d3: true },
      { id: '412x915 staand', w: 412, h: 915, mobiel: true, dpr: 2 }
    ];
    for (const f of FORMATEN) {
      const meet = {};
      for (const cx of ['ontwaakt', 'nieuw']) {
        const { ctx, page } = await context(browser, { w: f.w, h: f.h, dpr: f.dpr, mobiel: f.mobiel, codex: CODEX[cx], inst: { lite: false, d3: !!f.d3 } });
        await laad(page);
        await page.evaluate(() => {
          nieuwSpel('slachter', 'NISSEN-BEELD'); S.act = 1; S.kaart = genereerKaart();
          volgendeAct('De Slijmkoning'); try { dtLoopVoorbij(); } catch (e) {}
          startGevecht(['echo', 'naaper'], 'gevecht', 1);
        });
        await slaap(2600);
        meet[cx] = await page.evaluate(() => {
          const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return b.width ? [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)] : null; };
          const z = document.getElementById('metgezel-zone'), c = document.getElementById('tb-metgezel');
          return {
            d3: !!document.querySelector('#scherm-gevecht.d3-actief'), gMet: S.gevecht && S.gevecht.metgezel ? S.gevecht.metgezel.id : null,
            zone: z ? z.hidden : true, chip: c ? c.style.display === 'none' : true,
            held: r(document.querySelector('#speler-zone .held-art') || document.querySelector('#speler-zone')), vijand: r(document.querySelector('.vijand')),
            hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth
          };
        });
        if (cx === 'ontwaakt') await page.screenshot({ path: path.join(UIT, `beeld-${f.id.replace(/\s+/g, '_')}.png`) });
        meet[cx].fouten = page.__f.length;
        await sluit(ctx, page, 'beeld ' + f.id + ' ' + cx);
      }
      const a = meet.ontwaakt, b = meet.nieuw;
      const bijna = (p, q) => !!p && !!q && p.every((x, i) => Math.abs(x - q[i]) <= 1);
      t(a.gMet === null && a.zone && a.chip && a.hscroll <= 0, `${f.id}: Codex met Drops → geen metgezel (g.metgezel ${a.gMet}, zone verborgen ${a.zone}, chip weg ${a.chip}), horizontale scroll ${a.hscroll}px`);
      t(bijna(a.held, b.held) && bijna(a.vijand, b.vijand), `${f.id}: held ${JSON.stringify(a.held)} en vijand ${JSON.stringify(a.vijand)} staan waar ze bij een verse Codex staan (${JSON.stringify(b.held)} / ${JSON.stringify(b.vijand)}, ±1 px)`);
      if (f.d3 !== undefined && !f.mobiel) t(a.d3 === !!f.d3, `${f.id}: het toneel draait ${a.d3 ? '3D' : '2D'} zoals gevraagd`);
    }
  }

  /* ============================================================
     J · HET CONTACTVEL (M-plan §5, integratie): wat Thomas na de parkering ziet, op zijn formaten.
     Per formaat vijf beelden met een Codex waarin Drops ontwaakt is — de heldkeuze (met de
     scherf-tip open op laptop), de Codex (boven + het schervenblok), de scherf-reveal in een
     Act 2-gevecht en de afscheidsregel na het laden van een lopende run met Drops. Elk beeld
     krijgt zijn meting (in beeld, geen horizontale scroll, 0 verboden woorden); daarna worden ze
     tot één contactvel geplakt (contactvel_nissen.jpg in SLAYIT_SHOTS).
     ============================================================ */
  if (doe('vel')) {
    kop('J · contactvel: heldkeuze, Codex, scherf-reveal en afscheidsregel op Thomas\' formaten');
    const FORMATEN = [
      { id: '800x360', w: 800, h: 360, mobiel: true, dpr: 2 },
      { id: '846x381', w: 846, h: 381, mobiel: true, dpr: 2 },
      { id: '1440x900 2D', w: 1440, h: 900, d3: false },
      { id: '1440x900 3D', w: 1440, h: 900, d3: true },
      { id: '1366x768 2D', w: 1366, h: 768, d3: false },
      { id: '1366x768 3D', w: 1366, h: 768, d3: true }
    ];
    const BEELDEN = ['heldkeuze', 'codex', 'codex-scherven', 'scherf-reveal', 'afscheid'];
    const vel = [];   /* { f, beeld, pad } */
    const naamVan = (f, b) => path.join(UIT, `vel-${f.id.replace(/\s+/g, '_')}-${b}.png`);
    /* past een element volledig in het venster? (de maat waarop een speler het leest) */
    const inBeeld = (page, sel) => page.evaluate(s => {
      const el = document.querySelector(s); if (!el) return { er: false };
      const r = el.getBoundingClientRect();
      return { er: true, r: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], vw: innerWidth, vh: innerHeight,
        past: r.width > 0 && r.height > 0 && r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
        hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    }, sel);
    for (const f of FORMATEN) {
      const inst = { lite: false, d3: !!f.d3 };
      /* 1+2+3 · heldkeuze en Codex (één context) */
      {
        const { ctx, page } = await context(browser, { w: f.w, h: f.h, dpr: f.dpr, mobiel: f.mobiel, codex: CODEX.ontwaakt, inst });
        await laad(page);
        await page.evaluate(() => toonHeldKeuze()); await slaap(1200);
        const hk = await page.evaluate(() => ({ band: !!document.querySelector('.held-mg-regel'), syn: document.querySelectorAll('.held-syn').length, slots: document.querySelectorAll('.scherf-slot[data-shart]').length }));
        /* de scherf-tip openen zoals een speler dat doet: hover op laptop, een vinger op de telefoon
           (alleen de pointerdown: een volle tik kiest de scherf ook en hertekent het vak) */
        const sidTip = await page.evaluate(() => { const s = document.querySelector('.scherf-slot[data-shart]'); return s ? s.dataset.shart : null; });
        const eerste = await page.$('.scherf-slot[data-shart]');
        if (eerste) {
          try {
            await eerste.scrollIntoViewIfNeeded(); await slaap(300);
            if (f.mobiel) await eerste.dispatchEvent('pointerdown', { pointerType: 'touch', bubbles: true, isPrimary: true });
            else await eerste.hover();
            await slaap(450);
          } catch (e) {}
        }
        await stap(page, 'vel ' + f.id, 'heldkeuze');
        t(!hk.band && hk.syn === 0 && hk.slots === 3 && !(await inBeeld(page, 'body')).hscroll,
          `vel ${f.id} · heldkeuze: geen metgezel-band (${hk.band}), ${hk.syn} synergie-badges, ${hk.slots} scherven in de loadout, geen horizontale scroll`);
        const tip = await page.evaluate(sid => { const el = document.getElementById('tooltip');
          return { open: !!el && getComputedStyle(el).display !== 'none', tekst: el ? el.textContent : '', moet: sid ? scherfTekst(sid) : '?' }; }, sidTip);
        t(tip.open && tip.tekst === tip.moet, `vel ${f.id} · heldkeuze: de scherf-tip staat open (${f.mobiel ? 'vinger' : 'hover'}) en leest de tafelTekst: "${tip.tekst}"`);
        await page.screenshot({ path: naamVan(f, 'heldkeuze') }); vel.push({ f, beeld: 'heldkeuze', pad: naamVan(f, 'heldkeuze') });
        await page.mouse.move(2, 2);
        await page.evaluate(() => toonCodex()); await slaap(700);
        await stap(page, 'vel ' + f.id, 'Codex (boven)');
        const cx = await page.evaluate(() => ({ mgKop: [...document.querySelectorAll('#overlay-codex .codex-kop')].some(h => /Metgezellen/.test(h.textContent)) }));
        const cxB = await inBeeld(page, '#overlay-codex .codex-kop');
        t(!cx.mgKop && cxB.er && cxB.past && cxB.hscroll <= 0, `vel ${f.id} · Codex: geen blok Metgezellen, de eerste kop in beeld ${JSON.stringify(cxB.r)}, horizontale scroll ${cxB.hscroll}px`);
        await page.screenshot({ path: naamVan(f, 'codex') }); vel.push({ f, beeld: 'codex', pad: naamVan(f, 'codex') });
        await page.evaluate(() => { const r = document.querySelector('#overlay-codex .scherf-cx-rooster'); if (r) r.scrollIntoView({ block: 'center' }); }); await slaap(400);
        await stap(page, 'vel ' + f.id, 'Codex (schervenblok)');
        const ro = await inBeeld(page, '#overlay-codex .scherf-cx-rooster');
        const ro2 = await page.evaluate(() => ({ verbruikt: document.querySelectorAll('#overlay-codex .scherf-cx-slot.verbruikt').length, doorgrond: /doorgrond/.test((document.querySelector('#overlay-codex .scherf-cx-rooster') || {}).textContent || '') }));
        t(ro.er && ro.past && ro2.verbruikt === 0 && !ro2.doorgrond, `vel ${f.id} · Codex: het schervenblok staat volledig in beeld ${JSON.stringify(ro.r)} (venster ${ro.vw}x${ro.vh}), geen 'doorgrond'/'verbruikt'`);
        await page.screenshot({ path: naamVan(f, 'codex-scherven') }); vel.push({ f, beeld: 'codex-scherven', pad: naamVan(f, 'codex-scherven') });
        t(page.__f.length === 0, `vel ${f.id} · heldkeuze/Codex: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 2).join(' | ') : ''));
        await sluit(ctx, page, 'vel ' + f.id + ' heldkeuze/codex');
      }
      /* 4 · de scherf-reveal in een Act 2-gevecht (de kop die een elite-vondst draagt) */
      {
        const { ctx, page } = await context(browser, { w: f.w, h: f.h, dpr: f.dpr, mobiel: f.mobiel, codex: CODEX.ontwaakt, inst });
        await laad(page);
        await page.evaluate(() => {
          nieuwSpel('slachter', 'NISSEN-VEL'); S.act = 1; S.kaart = genereerKaart();
          volgendeAct('De Slijmkoning'); try { dtLoopVoorbij(); } catch (e) {}
          startGevecht(['echo', 'naaper'], 'gevecht', 1);
        });
        await slaap(2600);
        /* de gevechtsmeldingen eerst laten uitdoven (in het echte spel komt de reveal pas na de
           overwinning; een toast van de gevechtsstart ligt anders over de kop) */
        for (let w = 0; w < 30 && await page.evaluate(() => document.querySelectorAll('#meldingen .toast').length > 0); w++) await slaap(200);
        const d3 = await page.evaluate(() => !!document.querySelector('#scherm-gevecht.d3-actief'));
        await page.evaluate(() => toonScherfReveal('vlamwachter_figuur', { kop: '🜂 TUSSEN DE RESTEN GLINSTERT IETS' })); await slaap(1000);
        await stap(page, 'vel ' + f.id, 'scherf-reveal (Act 2-gevecht)');
        const rv = await inBeeld(page, '.scherf-reveal-overlay .scherf-reveal-binnen');
        const rt = await page.evaluate(() => ({ flavor: ((document.querySelector('.scherf-reveal-flavor') || {}).textContent || '').trim(), sub: ((document.querySelector('.scherf-reveal-sub') || {}).textContent || '').trim(), moet: scherfTekst('vlamwachter_figuur') }));
        t(rv.er && rv.past && rv.hscroll <= 0, `vel ${f.id} · scherf-reveal volledig in beeld ${JSON.stringify(rv.r)} (venster ${rv.vw}x${rv.vh}), horizontale scroll ${rv.hscroll}px`);
        t(rt.flavor === rt.moet && /bankt bij het einde van je run/.test(rt.sub), `vel ${f.id} · de reveal leest de tafelTekst en zegt in Act 2 dat hij bankt: "${rt.flavor}" / "${rt.sub}"`);
        if (f.d3 !== undefined && !f.mobiel) t(d3 === !!f.d3, `vel ${f.id} · het gevecht onder de reveal draait ${d3 ? '3D' : '2D'} zoals gevraagd`);
        await page.screenshot({ path: naamVan(f, 'scherf-reveal') }); vel.push({ f, beeld: 'scherf-reveal', pad: naamVan(f, 'scherf-reveal') });
        t(page.__f.length === 0, `vel ${f.id} · scherf-reveal: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 2).join(' | ') : ''));
        await sluit(ctx, page, 'vel ' + f.id + ' reveal');
      }
      /* 5 · de afscheidsregel: een lopende Act 2-run met Drops (van vóór de parkering) laden */
      {
        const { ctx, page } = await context(browser, { w: f.w, h: f.h, dpr: f.dpr, mobiel: f.mobiel, codex: CODEX.ontwaakt, inst });
        await laad(page);
        await page.evaluate(() => {
          _devMetgezellen = true;
          nieuwSpel('slachter', 'NISSEN-VEL-SAVE'); S.act = 2; S.kaart = genereerKaart(); geefMetgezel('drops'); S.runMetgezel = 'drops'; S.metgezel.hp = 17; saveSpel();
          _devMetgezellen = false;
        });
        await laad(page);
        await page.evaluate(() => doorgaan()); await slaap(2100);
        const toast = await page.evaluate(() => [...document.querySelectorAll('#meldingen .toast')].filter(e => /blijft achter/.test(e.textContent)).map(e => {
          const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
          return { tekst: e.textContent, r: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], past: r.width > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, zicht: cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.5 };
        }));
        await stap(page, 'vel ' + f.id, 'afscheidsregel (na het laden)', /^🐾 Drops blijft achter\. Vanaf hier daal je alleen af\.$/);
        t(toast.length === 1 && toast[0].tekst === '🐾 Drops blijft achter. Vanaf hier daal je alleen af.' && toast[0].past && toast[0].zicht,
          `vel ${f.id} · de afscheidsregel staat één keer volledig in beeld: ${toast.length}× ${toast[0] ? JSON.stringify(toast[0].r) : ''}`);
        await page.screenshot({ path: naamVan(f, 'afscheid') }); vel.push({ f, beeld: 'afscheid', pad: naamVan(f, 'afscheid') });
        t(page.__f.length === 0, `vel ${f.id} · afscheid: geen paginafouten` + (page.__f.length ? ' — ' + page.__f.slice(0, 2).join(' | ') : ''));
        await sluit(ctx, page, 'vel ' + f.id + ' afscheid');
      }
    }
    /* het contactvel: een rij per formaat, een kolom per beeld (eigen context, zonder route) */
    const CEL = 330;
    const rijen = FORMATEN.map(f => `<tr><th>${f.id}</th>` + BEELDEN.map(b => {
      const x = vel.find(v => v.f === f && v.beeld === b);
      return `<td>${x && fs.existsSync(x.pad) ? `<img src="data:image/png;base64,${fs.readFileSync(x.pad).toString('base64')}">` : '—'}</td>`;
    }).join('') + '</tr>').join('');
    const html = `<!doctype html><meta charset="utf-8"><style>
      body{margin:0;background:#15110d;color:#e8dcc4;font:13px/1.3 'Segoe UI',Arial,sans-serif}
      h1{font-size:17px;margin:10px 12px 4px} p{margin:0 12px 8px;color:#b9a98c}
      table{border-collapse:collapse;margin:0 8px 10px} th,td{padding:4px;vertical-align:top}
      thead th{font-weight:600;text-align:left} tbody th{writing-mode:vertical-rl;transform:rotate(180deg);font-weight:600;white-space:nowrap}
      img{width:${CEL}px;display:block;border:1px solid #3a3026}</style>
      <h1>DE NISSEN DICHT (B1) — contactvel na de parkering</h1>
      <p>Codex met ontwaakte Drops (Thomas vandaag). Kolommen: heldkeuze · Codex · Codex-schervenblok · scherf-reveal (Act 2-gevecht) · afscheidsregel na het laden van een lopende run met Drops.</p>
      <table><thead><tr><th></th>${BEELDEN.map(b => `<th>${b}</th>`).join('')}</tr></thead><tbody>${rijen}</tbody></table>`;
    const vctx = await browser.newContext({ viewport: { width: 60 + BEELDEN.length * (CEL + 10), height: 400 }, deviceScaleFactor: 1 });
    const vp = await vctx.newPage();
    await vp.setContent(html, { waitUntil: 'load' });
    const velPad = path.join(UIT, 'contactvel_nissen.jpg');
    await vp.screenshot({ path: velPad, fullPage: true, type: 'jpeg', quality: 82 });
    await vctx.close();
    t(vel.length === FORMATEN.length * BEELDEN.length && fs.existsSync(velPad), `contactvel: ${vel.length} beelden (${FORMATEN.length} formaten × ${BEELDEN.length}) → ${velPad}`);
  }

  /* ============================================================
     I · DE OUTRO-EPILOOG (T18): geen witte hond, geen pootafdrukken
     outro.js leest de hond-vlaggen (Codex.metgezellen 'drops_wit' / Codex.gevallen 'drops') alleen
     met de metgezellen aan. Een sonde telt die lezingen bij de start van de epiloog; met de
     DEV-schakelaar AAN moet ze ze wél zien (leegte-wacht: anders meet de sonde niets).
     ============================================================ */
  if (doe('outro')) {
    kop('I · de outro-epiloog (T18): geen witte hond, geen pootafdrukken');
    const { ctx, page } = await context(browser, { codex: { metgezellen: ['drops', 'drops_wit'], gevallen: ['drops'], mysteries: { drops: { voltooid: true } },
      runs: 5, wins: 2, relikwieen: [], dranken: [], opgeladen: [], gezien: [] } });
    await laad(page);
    await page.evaluate(() => devOutro()); await slaap(1500);
    const epiloog = (aan, mg, gv) => page.evaluate(([aan, mg, gv]) => {
      devMetgezellen(aan);
      const m = mg.slice(), g = gv.slice(); let n = 0;
      const spion = a => new Proxy(a, { get(o, k) { return k === 'includes' ? (...x) => { n++; return o.includes(...x); } : o[k]; } });
      Codex.metgezellen = spion(m); Codex.gevallen = spion(g);
      try { Outro._devEpiloog(6); } finally { Codex.metgezellen = m; Codex.gevallen = g; }
      return { n, staat: Outro._staat, aan: metgezellenAan() };
    }, [aan, mg, gv]);
    let r = await epiloog(false, ['drops', 'drops_wit'], ['drops']);
    await slaap(4200); await page.screenshot({ path: path.join(UIT, 'outro-epiloog-witte-geparkeerd.png') });
    t(r.staat === 'epiloog' && r.aan === false && r.n === 0, `Codex waarin de Witte terugkeerde, geparkeerd: de epiloog leest de hond-vlaggen ${r.n}× (geen witte hond; staat ${r.staat})`);
    r = await epiloog(false, ['drops'], ['drops']);
    t(r.staat === 'epiloog' && r.aan === false && r.n === 0, `Codex waarin Drops viel, geparkeerd: de epiloog leest de hond-vlaggen ${r.n}× (geen pootafdrukken; staat ${r.staat})`);
    r = await epiloog(true, ['drops', 'drops_wit'], ['drops']);
    const r2 = await epiloog(true, ['drops'], ['drops']);
    t(r.aan === true && r.n >= 1 && r2.n >= 1, `leegte-wacht: met de DEV-schakelaar AAN leest de epiloog ze wél (Witte ${r.n}×, gevallen ${r2.n}×) — de sonde meet echt`);
    await page.evaluate(() => devMetgezellen(false));
    await sluit(ctx, page, 'outro');
  }

  /* ============================================================ */
  kop('paginafouten over de hele ronde');
  t(fouten.length === 0, fouten.length ? 'PAGINAFOUTEN: ' + fouten.slice(0, 5).join(' || ') : 'geen paginafouten in de hele ronde');
  console.log(`\n============================================\nNISSEN ACCEPTATIE: ${okN} ok, ${foutN} FOUT   (shots in ${UIT})\n============================================`);
  await browser.close();
  process.exit(foutN ? 1 : 0);
})();
