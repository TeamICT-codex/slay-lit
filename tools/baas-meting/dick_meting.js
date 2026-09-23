/* HET PROCES — meetharnas v3 (meetronde 23 sep 2026, cache v127).
   Draait de ECHTE spelcode headless (Playwright) tegen de Act 3-eindbaas de DICKtator, met een
   greedy speler-AI in twee beleidsregels, voor alle drie de helden in drie sterktes, en meet
   per bedrijf (I Zitting · II Proces · III Tirade · IV Herverkiezing · V Mandaat):
   rondes, binnengekregen schade per bron, nulschade-rondes, sterfbedrijf, decreten, en de
   schadeverhouding. Optioneel dezelfde gemiddelde builds tegen de Act 1- en Act 2-baas.

   - GEEN dev-server en NOOIT :4173 (Thomas' playtest). Een verzonnen host (localhost:4199)
     wordt door Playwright vanaf SCHIJF bediend met route.fulfill (patroon uit
     tools/drama_stap_c_matrix.js / tools/devmenu_acceptatie.js). Service workers geblokkeerd.
   - DICK.tempo = 0.02 en window.slaap = () => Promise.resolve() maken de beats snel.
   - Wijzigt geen spelcode: alles wat hier gepatcht wordt, leeft alleen in de headless pagina.

   Gebruik (Git Bash):
     node tools/baas-meting/dick_meting.js [seeds=12] [label=meting] [opties]
   opties (env):
     MEET_HELDEN=slachter,gifmagier,thoverk   MEET_STERKTES=sterk,gemiddeld,matig
     MEET_BELEID=gebalanceerd,bewust          MEET_REF=0 (Act 1/2-referentie overslaan)
     MEET_WERKERS=4 (parallelle pagina's)     SLAYIT_PLAYWRIGHT=<pad naar node_modules/playwright>
   Uitvoer: <label>.json naast het script (of MEET_UIT=<pad>) + een samenvatting op de console. */
const fs = require('fs'), path = require('path');
function laadPlaywright() {
  const kandidaten = [process.env.SLAYIT_PLAYWRIGHT, 'playwright',
    'C:\\Users\\THOMAS~1\\AppData\\Local\\Temp\\claude\\C--Users-Thomas-Aelbrecht-Desktop-Workspace-SLAY-IT\\d5a4f6f7-f7ad-4aad-921d-259730d2111c\\scratchpad\\node_modules\\playwright'].filter(Boolean);
  for (const k of kandidaten) { try { return require(k); } catch (e) { /* volgende */ } }
  throw new Error('Playwright niet gevonden: zet SLAYIT_PLAYWRIGHT=<pad naar node_modules/playwright>');
}
const { chromium } = laadPlaywright();
const WORTEL = path.resolve(__dirname, '..', '..');
const HOST = 'localhost:4199';
const BASIS = 'http://' + HOST + '/';
const N = parseInt(process.argv[2] || '12', 10);
const LABEL = process.argv[3] || 'meting';
const lijst = (env, std) => (process.env[env] ? process.env[env].split(',') : std);
const HELDEN = lijst('MEET_HELDEN', ['slachter', 'gifmagier', 'thoverk']);
const STERKTES = lijst('MEET_STERKTES', ['sterk', 'gemiddeld', 'matig']);
const BELEID = lijst('MEET_BELEID', ['gebalanceerd', 'bewust']);
const REF = process.env.MEET_REF !== '0';
const WERKERS = parseInt(process.env.MEET_WERKERS || '4', 10);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };

/* ============================================================
   DE BUILDS — aankomstdekken voor het EINDE van Act 3.
   'dev:<id>' = exact de bestaande DEV_BUILDS uit game.js (in de pagina opgehaald), zodat
   slachter/gemiddeld en gifmagier/sterk vergelijkbaar blijven met de oudere metingen.
   ============================================================ */
const BUILDS = {
  slachter: {
    sterk: {
      held: 'slachter', hp: 92, label: 'Slachter sterk (22 kaarten, 6 relikwieën)',
      relikwieen: ['brandend_bloed', 'krachtsteen', 'oorlogsbanier', 'stalen_vuist', 'brandmerkijzer', 'stempelkussen'],
      dranken: ['heeldrank'], laster: 0, metgezel: 'drops',
      dek: [['slag', 1], ['slag', 1], ['verdediging', 1], ['verdediging', 1], ['verdediging', 0],
            ['knal', 1], ['zware_klap', 1], ['zware_klap', 0], ['uithaal', 1], ['executie', 1], ['afgekeurd', 1],
            ['ontslagbrief', 1], ['in_drievoud', 1], ['originele_handtekening', 0], ['genadeslag', 0],
            ['vlammende_hartstocht', 0], ['het_hakblok', 1], ['metaalhuid', 0], ['schildmuur', 1], ['bolwerk', 0],
            ['tribunaal', 0], ['martelaarsbloed', 0]]
    },
    gemiddeld: 'dev:slachter_mid',
    matig: {
      held: 'slachter', hp: 80, label: 'Slachter matig (20 kaarten, 2 relikwieën)',
      relikwieen: ['brandend_bloed', 'wetsteen'], dranken: [], laster: 1, metgezel: null,
      dek: [['slag', 1], ['slag', 0], ['slag', 0], ['slag', 0], ['verdediging', 0], ['verdediging', 0], ['verdediging', 0], ['verdediging', 0],
            ['knal', 0], ['dubbelslag', 0], ['ijzeren_golf', 0], ['zware_klap', 0], ['klingenstorm', 0], ['executie', 0],
            ['schildmuur', 0], ['uithaal', 0], ['molensteen', 0], ['archiefstof', 0], ['tribunaal', 0], ['bloedoffer', 0]]
    }
  },
  gifmagier: {
    sterk: 'dev:gif_opt',
    gemiddeld: {
      held: 'gifmagier', hp: 72, label: 'Gifmagiër gemiddeld (22 kaarten, 4 relikwieën)',
      relikwieen: ['slangenamulet', 'smaragden_ring', 'oorlogsbanier', 'stempelkussen'],
      dranken: ['heeldrank'], laster: 1, metgezel: 'drops',
      dek: [['prik', 1], ['prik', 0], ['prik', 0], ['verdediging', 1], ['verdediging', 0], ['verdediging', 0],
            ['dodelijke_kus', 1], ['gifflits', 1], ['gifflits', 0], ['giftige_steek', 0], ['slangenbeet', 0], ['gifpamflet', 0],
            ['giftand', 0], ['venijnregen', 0], ['sluiproute', 1], ['sluiproute', 0], ['verlammend_gif', 0], ['lastercampagne', 0],
            ['de_gifbeker', 0], ['katalyse', 0], ['gifwolk', 0], ['naaperij', 0]]
    },
    matig: {
      held: 'gifmagier', hp: 68, label: 'Gifmagiër matig (20 kaarten, 2 relikwieën)',
      relikwieen: ['slangenamulet', 'bottenfluit'], dranken: [], laster: 1, metgezel: null,
      dek: [['prik', 0], ['prik', 0], ['prik', 0], ['prik', 0], ['verdediging', 0], ['verdediging', 0], ['verdediging', 0], ['verdediging', 0],
            ['dodelijke_kus', 0], ['gifflits', 0], ['giftige_steek', 0], ['slangenbeet', 0], ['venijnregen', 0], ['sluiproute', 0],
            ['gifwolk', 0], ['snelle_steek', 0], ['inktklerk_steek', 0], ['gifpamflet', 0], ['schildmuur', 0], ['ontwijken', 0]]
    }
  },
  thoverk: {
    sterk: {
      held: 'thoverk', hp: 84, label: 'Kolendruïde sterk (22 kaarten, 6 relikwieën)',
      relikwieen: ['houten_been', 'bronzen_schub', 'krachtsteen', 'oorlogsbanier', 'stempelkussen', 'mosamulet'],
      dranken: ['heeldrank'], laster: 0, metgezel: 'drops',
      dek: [['takkenslag', 1], ['takkenslag', 1], ['verdediging', 1], ['verdediging', 1], ['verdediging', 0],
            ['vonkenbeet', 1], ['wurgwortels', 1], ['sporenstoot', 1], ['doorslag_doornen', 1], ['perkamentslag', 1],
            ['het_origineel_kaart', 0], ['doornmantel', 1], ['duivelspact', 0], ['kolenstempel', 0], ['bastvel', 1], ['bastvel', 0],
            ['eikenhuid', 0], ['tegenvuur', 1], ['asregen', 1], ['knalsigaar', 0], ['wortelgreep', 0], ['stoofgeur', 0]]
    },
    gemiddeld: {
      held: 'thoverk', hp: 80, label: 'Kolendruïde gemiddeld (22 kaarten, 5 relikwieën)',
      relikwieen: ['houten_been', 'bronzen_schub', 'oorlogsbanier', 'stempelkussen', 'anker'],
      dranken: ['heeldrank'], laster: 1, metgezel: 'drops',
      dek: [['takkenslag', 1], ['takkenslag', 0], ['takkenslag', 0], ['verdediging', 1], ['verdediging', 0], ['verdediging', 0],
            ['vonkenbeet', 0], ['wurgwortels', 0], ['sporenstoot', 0], ['perkamentslag', 0], ['doorslag_doornen', 0],
            ['bastvel', 1], ['bastvel', 0], ['tegenvuur', 0], ['asregen', 0], ['eikenhuid', 0], ['kolengloed', 0],
            ['doornzweep', 0], ['wortelgreep', 0], ['stoofpotje', 0], ['doornmantel', 0], ['stoofgeur', 0]]
    },
    matig: {
      held: 'thoverk', hp: 74, label: 'Kolendruïde matig (20 kaarten, 2 relikwieën)',
      relikwieen: ['houten_been', 'warme_mantel'], dranken: [], laster: 1, metgezel: null,
      dek: [['takkenslag', 0], ['takkenslag', 0], ['takkenslag', 0], ['takkenslag', 0], ['verdediging', 0], ['verdediging', 0], ['verdediging', 0], ['verdediging', 0],
            ['vonkenbeet', 0], ['stoofpotje', 0], ['wortelgreep', 0], ['doornzweep', 0], ['bastvel', 0], ['sporenstoot', 0],
            ['asadem', 0], ['stoofgeur', 0], ['perkamentslag', 0], ['tegenvuur', 0], ['schildmuur', 0], ['eikenhuid', 0]]
    }
  }
};
const BAZEN = {
  de_dicktator: { act: 3, rij: 12, naam: 'de DICKtator (Act 3)' },
  de_erfprins: { act: 2, rij: 15, naam: 'De Erfprins (Act 2)' },
  slijmkoning: { act: 1, rij: 13, naam: 'De Slijmkoning (Act 1)' }
};

/* ---------- de jobs ---------- */
function maakJobs() {
  const jobs = [];
  for (const held of HELDEN) for (const st of STERKTES) for (const beleid of BELEID) {
    const varianten = [{ hpPct: 0.62, tag: '' }];
    if (st === 'gemiddeld') varianten.push({ hpPct: 0.85, tag: '@85' });
    for (const v of varianten) for (let i = 0; i < N; i++) {
      jobs.push({ cel: `${held}/${st}${v.tag}/${beleid}`, held, st, beleid, hpPct: v.hpPct, baas: 'de_dicktator', seed: 'M23-' + (1000 + i) });
    }
  }
  /* de referentie draait alleen 'gebalanceerd': 'bewust' verschilt enkel in Proces-specifieke regels */
  if (REF) for (const held of HELDEN) for (const baas of ['de_erfprins', 'slijmkoning']) for (const beleid of ['gebalanceerd']) for (let i = 0; i < N; i++) {
    jobs.push({ cel: `REF-${baas}/${held}/gemiddeld/${beleid}`, held, st: 'gemiddeld', beleid, hpPct: 0.62, baas, seed: 'M23-' + (1000 + i) });
  }
  return jobs;
}

/* ============================================================
   IN DE PAGINA: instrumentatie (eenmalig per pagina)
   ============================================================ */
function installeer() {
  window.slaap = () => Promise.resolve();
  try { Klank.sfx = () => {}; Klank.muziek = () => {}; Klank.duck = () => {}; } catch (e) {}
  window.schudScherm = () => {};
  window.saveSpel = () => {};
  window.wisSave = () => {};
  window.toonDecreetReveal = () => {};
  try { INST.d3 = false; INST.lite = true; INST.spraak = false; } catch (e) {}
  document.body.classList.add('lite');
  if (typeof DICK === 'object' && DICK) DICK.tempo = 0.02;
  /* win/verlies: alleen de vlag, geen eindscherm/outro/beloning */
  window.gevechtGewonnen = async function () { const g = S.gevecht; if (!g || g.voorbij) return; g.voorbij = true; g._gewonnen = true; };
  window.nederlaag = function () { const g = S.gevecht; if (!g || g.voorbij) return; g.voorbij = true; g._verloren = true; };

  window.__T = null;
  window.__bron = null;
  const bossVan = g => g ? g.vijanden.find(v => VIJANDEN[v.id] && VIJANDEN[v.id].baas) : null;
  window.__bedrijf = () => {
    const g = S.gevecht; const b = bossVan(g);
    if (!b) return 0;
    if (b.id !== 'de_dicktator') return b.fase || 1;
    if (!b.herrezen) return Math.min(3, b.fase || 1);
    return b.vorm2Start == null ? 4 : 5;
  };
  const bronLabel = (v, it) => {
    if (!it) return 'overig-vijand';
    if (v.id === 'de_dicktator') {
      const m = { 'DE AANZEGGING': 'Aanzegging', 'KARAKTERMOORD': 'Karaktermoord', 'EXECUTIE': 'Executie', 'DE FACTUUR': 'Factuur (baas zelf)', 'DONDERREDE': 'Donderrede', 'HET ONTSLAG': 'Ontslag' };
      return m[it.naam] || ('baas:' + it.naam);
    }
    if (v.id === 'de_deurwaarder') return it.type === 'factuur' ? 'Invordering (deurwaarder)' : 'deurwaarder:' + it.naam;
    if (v.id === 'de_claqueur') return 'Applaus (claqueur)';
    if (VIJANDEN[v.id] && VIJANDEN[v.id].baas) return 'baas:' + (it.naam || '?');
    return (v.id || '?') + ':' + (it.naam || '?');
  };
  const oVA = window.vijandAanval;
  window.vijandAanval = function (v, basis, gedwongen, opts) {
    const it = v && v.intent;
    const lab = bronLabel(v, it);
    let vloekDeel = 0;
    if (lab === 'Karaktermoord' && S.gevecht && typeof vloekenInGevecht === 'function') {
      const vl = Math.min(DICK.KM_VLOEK_CAP || Infinity, vloekenInGevecht(S.gevecht));
      const totaal = (basis || 0) + (v.status.kracht || 0);
      vloekDeel = totaal > 0 ? (DICK.KM_PER_VLOEK * vl) / totaal : 0;
    }
    const oud = window.__bron; window.__bron = { lab, vloekDeel };
    try { return oVA(v, basis, gedwongen, opts); } finally { window.__bron = oud; }
  };
  const oDS = window.doeSchade;
  window.doeSchade = function (doel, dmg, bron) {
    const T = window.__T;
    if (T && doel && bron && !bron.isSpeler && !bron.isMetgezel) {
      if (doel.isSpeler) { T.rawIn += dmg; T.geblokt += Math.min(doel.blok || 0, glasDmg(dmg)); }
      else if (doel.isMetgezel) T.metgezelVing += dmg;
    }
    return oDS(doel, dmg, bron);
  };
  const oVH = window.verliesHp;
  window.verliesHp = function (doel, n, bron) {
    const T = window.__T;
    if (T && doel && n > 0) {
      const bd = window.__bedrijf();
      if (doel.isSpeler) {
        const echt = Math.min(n, S.hp);
        const br = window.__bron;
        let lab;
        if (br) lab = br.lab;
        else if (bron && !bron.isSpeler && !bron.isMetgezel) lab = 'overig-vijand';
        else lab = T._zelf ? 'zelf (eigen kaart)' : 'gif/vloek/overig';
        const add = (l, x) => {
          if (x <= 0) return;
          T.bron[l] = (T.bron[l] || 0) + x;
          T.bronBd[bd] = T.bronBd[bd] || {}; T.bronBd[bd][l] = (T.bronBd[bd][l] || 0) + x;
        };
        if (br && br.vloekDeel > 0) { const vd = Math.round(echt * br.vloekDeel); add('Karaktermoord', echt - vd); add('Laster/vloeken (via Karaktermoord)', vd); }
        else add(lab, echt);
        T.inBd[bd] = (T.inBd[bd] || 0) + echt;
        if (lab !== 'zelf (eigen kaart)') T.rondeIn += echt;
      } else if (!doel.isMetgezel) {
        const echt = Math.max(0, Math.min(n, doel.hp));
        const isBaas = VIJANDEN[doel.id] && VIJANDEN[doel.id].baas;
        if (isBaas) { T.uitBaas += echt; T.uitBd[bd] = (T.uitBd[bd] || 0) + echt; } else T.uitHof += echt;
        const soort = bron && bron.isSpeler ? 'direct' : (bron && bron.isMetgezel ? 'metgezel' : 'gif/doornen');
        T.uitSoort[soort] = (T.uitSoort[soort] || 0) + echt;
      }
    }
    return oVH(doel, n, bron);
  };
  const oDec = window.dicktatorDecreet;
  if (oDec) window.dicktatorDecreet = function (v) {
    const T = window.__T; const g = S.gevecht;
    const voor = S.dek.slice();
    const dossier = g && g.aangezegd ? [...g.aangezegd.values()].map(d => ({ id: d.id, naam: d.naam, sinds: Math.max(0, ((g.gespeeld && g.gespeeld[d.id]) || 0) - (d.start || 0)) })) : [];
    const r = oDec(v);
    if (T) {
      const weg = voor.filter(c => !S.dek.includes(c));
      weg.forEach(c => {
        const d = kdef(c);
        T.decreten.push({ id: c.id, naam: d.naam, kost: kval(c, 'kost'), zeld: d.zeld, up: !!c.up, bedrijf: window.__bedrijf(), dossier, bewaarWens: T._bewaar || null });
      });
    }
    return r;
  };
}

/* ============================================================
   IN DE PAGINA: één gevecht (opzet + speler-AI + lus)
   ============================================================ */
async function eenGevecht({ build, job }) {
  const bazen = { de_dicktator: { act: 3, rij: 12 }, de_erfprins: { act: 2, rij: 15 }, slijmkoning: { act: 1, rij: 13 } };
  const bz = bazen[job.baas];
  const beleid = job.beleid;
  /* ---- opzet: zoals devDicktator(profiel) ---- */
  if (S && S.gevecht) { try { S.gevecht.voorbij = true; stopGevechtLus(); } catch (e) {} }
  nieuwSpel(build.held, job.seed);
  S.gevecht = null; S.act = bz.act; S.fakkel = fakkelMax(); S.pos = null; S.ascensie = 0; S.daily = false; S.dagwet = null;
  delete S.beloning; delete S.winkel; delete S.huidigEvent;
  S.maxHp = build.hp; S.hp = Math.round(build.hp * job.hpPct);
  S.relikwieen = build.relikwieen.slice();
  S.dek = build.dek.map(([id, up]) => { const c = nieuweKaart(id); c.up = !!up; return c; });
  S.dranken = (build.dranken || []).slice();
  for (let i = 0; i < (build.laster || 0); i++) S.dek.push(nieuweKaart('laster'));
  S.metgezel = null;
  if (build.metgezel) { geefMetgezel(build.metgezel); if (S.metgezel) S.metgezel.hp = Math.max(1, Math.round(metgezelMaxHp(build.metgezel) * 0.6)); }
  S.kaart = genereerKaart();
  const hpStart = S.hp, dekStart = S.dek.length;
  const T = window.__T = { bron: {}, bronBd: {}, inBd: {}, uitBd: {}, uitBaas: 0, uitHof: 0, uitSoort: {}, rawIn: 0, geblokt: 0, metgezelVing: 0, decreten: [], rondeIn: 0, _zelf: false, _bewaar: null };
  startGevecht([job.baas], 'baas', bz.rij);
  const g = S.gevecht;
  const isBaas = v => VIJANDEN[v.id] && VIJANDEN[v.id].baas;
  /* de levende baas; is hij dood maar leeft zijn gevolg nog (de Slijmkoning splijt), dan het eerste levende doelwit */
  const boss = () => g.vijanden.find(v => isBaas(v) && !v.dood) || alleVijanden()[0] || g.vijanden.find(isBaas);
  const hof = () => alleVijanden().filter(v => !isBaas(v));
  const spl = () => g.speler;
  const vrij = async () => { let w = 0; while ((g.ceremonie || g.bezig || g._regieBezig) && w++ < 600 && S.gevecht === g && !g.voorbij) await new Promise(r => setTimeout(r, 15)); };
  /* de intro/metgezel-openingsbeat laten landen (Drops bijt op 650 ms) */
  await new Promise(r => setTimeout(r, 720));   /* de metgezel bijt op een vaste setTimeout van 650 ms: altijd vóór ronde 1 laten landen (determinisme) */
  await vrij();

  /* ---------------- SPELER-AI ---------------- */
  const R_ = () => { const b = boss(); return Math.max(2, Math.min(6, Math.ceil(((b && b.hp) || 60) / 28))); };
  const gifWaarde = (add, huidig, R, halveer) => {
    let met = 0, zonder = 0;
    for (let t = 0; t < R; t++) {
      const a = Math.max(0, huidig + add - t), z = Math.max(0, huidig - t);
      met += halveer ? Math.ceil(a / 2) : a; zonder += halveer ? Math.ceil(z / 2) : z;
    }
    return met - zonder;
  };
  const verwacht = v => {
    const it = v && v.intent;
    /* de Erfprins speelt je GESTOLEN kaarten terug: zijn plan draagt de eindschade per kaart */
    if (it && it.type === 'plagiaat' && Array.isArray(it.plan)) {
      let d = it.plan.reduce((s, x) => s + (x.eindDmg || 0), 0);
      if ((spl().status.kwetsbaar || 0) > 0) d = Math.floor(d * 1.5);
      return d;
    }
    return (typeof intentVerwachteSchade === 'function') ? intentVerwachteSchade(v) : 0;
  };
  const inkomend = () => alleVijanden().reduce((s, v) => s + verwacht(v), 0);
  const factuurBron = () => (typeof dicktatorFactuurBron === 'function') ? dicktatorFactuurBron(g) : null;
  const postenVan = c => { const k = kval(c, 'kost'); const pw = (typeof DICK === 'object' && DICK.POSTEN) || { gratis: 2, een: 1 }; return k === 0 ? pw.gratis : (k === 1 ? pw.een : 0); };
  /* marginale factuurkost van een kaart (alleen bewust): wat de rekening stijgt, na zwak/kwetsbaar */
  const factuurMarge = c => {
    const fb = factuurBron(); if (!fb) return 0;
    const p = postenVan(c); if (!p) return 0;
    const nu = dicktatorFactuurBedrag(g, fb.intent);
    const na = dicktatorFactuurBedrag({ posten: (g.posten || 0) + p, vijanden: g.vijanden }, fb.intent);
    let d = na - nu;
    if ((fb.status.zwak || 0) > 0) d *= 0.75;
    if ((spl().status.kwetsbaar || 0) > 0) d *= 1.5;
    /* staat er al meer blok dan er binnenkomt, dan is een deel van de marge gratis */
    const overschot = (spl().blok || 0) + (spl().status.metaalhuid || 0) - inkomend();
    if (overschot > d) return d * 0.25;
    return d;
  };
  /* de shortlist: welke van de twee wil de bot houden? (hoogste rang, dan kost, dan upgrade) */
  const kaartRang = c => (({ basis: 0, start: 0, gewoon: 1, ongewoon: 2, gesmeed: 2, zeldzaam: 3, episch: 4 })[kdef(c).zeld] ?? 0) * 3 + (kval(c, 'kost') || 0) + (c.up ? 1 : 0);
  const shortlistPlan = () => {
    if (!g.aangezegd || g.aangezegd.size < 2) return null;
    const [a, b] = [...g.aangezegd.values()];
    const ca = S.dek.find(x => x.uid === a.uid) || S.dek.find(x => x.id === a.id);
    const cb = S.dek.find(x => x.uid === b.uid) || S.dek.find(x => x.id === b.id);
    if (!ca || !cb) return null;
    const sinds = d => Math.max(0, ((g.gespeeld && g.gespeeld[d.id]) || 0) - (d.start || 0));
    const houdA = kaartRang(ca) >= kaartRang(cb);
    const houd = houdA ? a : b, offer = houdA ? b : a;
    /* wint 'houd' vandaag? minst gespeeld valt; gelijk -> de duurste; gelijk -> B (de tweede naam) valt */
    const sh = sinds(houd), so = sinds(offer);
    const kh = kval(houdA ? ca : cb, 'kost') || 0, ko = kval(houdA ? cb : ca, 'kost') || 0;
    let veilig;
    if (sh !== so) veilig = sh > so;
    else if (kh !== ko) veilig = kh < ko;
    else veilig = (offer === b);
    return { houdId: houd.id, offerId: offer.id, veilig, sh, so };
  };

  const doelwitVoor = c => {
    const b = boss(); const h = hof().sort((x, y) => x.hp - y.hp);
    if (!h.length) return b;
    const d = kdef(c);
    const kr = (spl().status.kracht || 0) + relikwieSchadeBonus();
    const klap = (kval(c, 'dmg') || 0) + kr;
    const isGif = (kval(c, 'gif') || 0) > 0 || /nachtschade|katalyse|giftand|karaktermoord|slangenbeet/.test(c.id);
    if (beleid === 'gebalanceerd' || job.baas !== 'de_dicktator') {
      /* het oude, naïeve beleid: wat in één klap valt gaat eraf, verder de baas */
      if (isGif) return b;
      if (h[0].hp <= klap) return h[0];
      return (b.hp > 70 && h[0].hp <= klap * 2) ? h[0] : b;
    }
    /* BEWUST: prioriteiten per hoveling (de griffier alleen als hij er in één klap aan gaat en
       er géén decreet op tafel ligt dat de bot wil laten vallen) */
    if (isGif && d.type !== 'aanval') return b;
    const naam = id => h.find(x => x.id === id);
    const cl = naam('de_claqueur'), dw = naam('de_deurwaarder'), gr = naam('de_griffier');
    const ontslagNabij = b.vorm2 && b.intent && b.intent.ontslag;
    const klok = (typeof dicktatorKlok === 'function' && b.vorm2) ? dicktatorKlok(b) : 9;
    if (dw && b.vorm2 && !isGif && ((ontslagNabij && dw.hp <= klap * 1.5) || (klok <= 2 && b.hp > 60))) return dw;   /* V: de uitknop van HET ONTSLAG */
    /* het betaald applaus (4 per beurt): alleen ruimen als het in één klap kan, of als er nog
       minstens drie rondes tot de volgende bedrijfsgrens zitten (anders kost de omweg meer dan hij spaart) */
    const totGrens = b.vorm2 ? b.hp : Math.max(0, b.hp - (b.maxHp || 240) * ((b.fase || 1) >= 3 ? 0 : ((b.fase || 1) >= 2 ? 0.33 : 0.66)));
    if (cl && !isGif && (cl.hp <= klap || (cl.hp <= klap * 2 && totGrens > 90))) return cl;
    if (!b.vorm2 && (b.fase || 1) >= 3 && b.hp <= 30 && !isGif && h[0].hp <= klap) return h[0];   /* vóór de herverkiezing: geen kiezers laten staan */
    if (dw && !isGif && dw.hp <= klap && factuurBron() === dw) return dw;
    if (gr && !isGif && gr.hp <= klap && !(b.intent && b.intent.type === 'decreet')) return b;  /* griffier laten leven: dood = +1 Kracht */
    return b;
  };

  const waarde = (c, R) => {
    const b = boss(); const d = kdef(c); const raw = veld => kval(c, veld) || 0;
    const t = d.doel === 'vijand' ? doelwitVoor(c) : b;
    const s = spl();
    const kr = (s.status.kracht || 0) + relikwieSchadeBonus();
    const zw = (s.status.zwak || 0) > 0 ? 0.75 : 1;
    const eerste = !(g.aanvalDezeBeurt > 0);
    const hak = ((s.status.hakblok || 0) > 0 && !g._hakblokGebruikt) ? s.status.hakblok : 0;
    const wet = (heeftRelikwie('wetsteen') && !g.wetsteenGebruikt) ? 4 : 0;
    const kwVan = x => (x.status.kwetsbaar || 0) > 0 || (eerste && heeftRelikwie('stempelkussen') && d.type === 'aanval');
    const hit = (basis, x, extra = 0) => {
      x = x || t; if (!x) return 0;
      let dm = Math.floor((basis + kr + extra) * zw);
      if (kwVan(x)) dm = Math.floor(dm * 1.5) + (heeftRelikwie('brandmerkijzer') ? 3 : 0);
      return Math.max(0, dm - (x.blok || 0) * 0.5);
    };
    const opDoel = (dm, x) => {
      x = x || t; if (!x) return 0;
      if (isBaas(x)) return dm;
      const echt = Math.min(dm, x.hp);
      return echt * 0.8 + (dm >= x.hp ? 6 : 0);
    };
    const aoe = (dm1, keer = 1) => alleVijanden().reduce((som, x) => som + opDoel(hit(dm1, x) * keer, x), 0);
    const gifNu = (t && t.status.gif) || 0;
    const gifB = heeftRelikwie('smaragden_ring') ? 1 : 0;
    const gw = (add, x) => { x = x || t; return x ? (isBaas(x) ? gifWaarde(add + gifB, x.status.gif || 0, R, true) : Math.min(x.hp, gifWaarde(add + gifB, x.status.gif || 0, R, false))) : 0; };
    const gwAlle = add => alleVijanden().reduce((som, x) => som + gw(add, x), 0);
    const ink = inkomend();
    const nodig = Math.max(0, ink - (s.blok || 0) - (s.status.metaalhuid || 0));
    const hpFrac = S.hp / S.maxHp;
    const blokW = hpFrac < 0.4 ? 1.5 : 1.05;
    const dodelijk = nodig >= S.hp;   /* wat er nu op het bord staat, kost je het leven */
    const blokV = n => Math.min(n, nodig) * (dodelijk ? 3 : blokW) + Math.max(0, n - nodig) * 0.05;
    const hitsPerBeurt = Math.max(1, alleVijanden().filter(x => x.intent && (x.intent.type === 'aanval' || x.intent.type === 'factuur')).length);
    const doornV = n => n * Math.min(R, 5) * 0.9 * Math.max(1, hitsPerBeurt * 0.8);
    const krachtV = n => n * 2.2 * Math.min(R, 5) * 0.8;
    const zwakV = n => Math.min(n, R) * Math.max(2, ink * 0.25);
    const kwV = n => Math.min(n, R) * 3.5;
    const heelV = n => Math.min(n, S.maxHp - S.hp) * (hpFrac < 0.5 ? 1.2 : 0.7);
    let v = 0;
    switch (c.id) {
      /* ---- Gifmagiër ---- */
      case 'nachtschade': { const dm = hit(gifNu * raw('maal'), t, -kr); v = opDoel(dm) - gifWaarde(gifNu, 0, R, isBaas(t)); if (t && dm >= t.hp && isBaas(t)) v = 999; break; }
      case 'katalyse': v = gifNu >= 3 ? gifWaarde(gifNu * (raw('maal') - 1), gifNu, R, isBaas(t)) : -1; break;
      case 'giftand': v = opDoel(hit(raw('dmg'))) + (gifNu > 0 ? gifWaarde(gifNu, gifNu, R, isBaas(t)) : 0); break;
      case 'karaktermoord': v = opDoel(hit(raw('dmg'))) + gifWaarde(Math.min(gifNu, raw('max')) + (gifNu > 0 ? gifB : 0), gifNu, R, isBaas(t)); break;
      case 'slangenbeet': v = opDoel(hit(raw('dmg') + (gifNu > 0 ? raw('bonus') : 0))); break;
      case 'naaperij': v = opDoel(hit(raw('dmg'))) + gw(raw('gif') * (gifNu > 0 ? 2 : 1)); break;
      case 'venijnregen': v = aoe(raw('dmg')) + gwAlle(raw('gif')); break;
      case 'gifwolk': v = gwAlle(raw('gif')); break;
      case 'lastercampagne': v = gwAlle(raw('gif')) + zwakV(raw('zw')); break;
      case 'verlammend_gif': v = gw(raw('gif')) + zwakV(raw('zwak')); break;
      case 'gifpamflet': v = opDoel(hit(raw('dmg'))) + gw(raw('gif')) + 2; break;
      case 'etterende_wonden': v = raw('n') * 2 * R; break;
      case 'gifklieren': v = gwAlle(raw('n') * Math.min(R, 4)) * 0.6; break;
      case 'bloedzuiger': v = raw('n') * R * 0.8; break;
      case 'epidemie': v = hof().length ? 6 : 1; break;
      case 'registerrot': v = gw(raw('gif')) + 2; break;
      case 'moederslang': v = gw(raw('gif')) + zwakV(raw('zw')); break;
      /* ---- Slachter ---- */
      case 'executie': case 'afgekeurd': v = opDoel(hit(raw('dmg') + (t && kwVan(t) ? raw('bonus') : 0))); break;
      case 'knal': v = opDoel(hit(raw('dmg'))) + kwV(raw('kw')); break;
      case 'uithaal': v = opDoel(hit(raw('dmg'))) + kwV(raw('st')) + zwakV(raw('st')); break;
      case 'dubbelslag': v = opDoel(hit(raw('dmg')) + hit(raw('dmg'), t, -hak - wet)); break;
      case 'in_drievoud': v = opDoel(hit(raw('dmg')) + 2 * hit(raw('dmg'), t, -hak - wet)); break;
      case 'klingenstorm': case 'wervelwind': case 'asadem': v = aoe(raw('dmg')); break;
      case 'tribunaal': v = alleVijanden().reduce((som, x) => som + opDoel(hit(raw('dmg') + (kwVan(x) ? raw('bonus') : 0), x), x), 0); break;
      case 'originele_handtekening': v = opDoel(hit(raw('dmg'))) + (eerste ? krachtV(raw('kr')) : 0); break;
      case 'bloedoffer': case 'martelaarsbloed': v = opDoel(hit(raw('dmg'))) - (raw('zelf') || raw('prijs')) * (hpFrac < 0.3 ? 3 : 1.1); break;
      case 'molensteen': v = opDoel(hit(raw('basis') + g.afleg.length)); break;
      case 'ijzeren_golf': v = opDoel(hit(raw('dmg'))) + blokV(raw('blok')); break;
      case 'vampiersbeet': v = opDoel(hit(raw('dmg'))) + heelV(raw('heel')); break;
      case 'het_hakblok': v = raw('n') * Math.min(R, 5) * 0.9; break;
      case 'metaalhuid': v = raw('n') * Math.min(R, 5) * 0.9; break;
      case 'vlammende_hartstocht': case 'demonenvorm': v = krachtV(raw('n')) * (c.id === 'demonenvorm' ? R / 2 : 1); break;
      case 'geindexeerd': v = raw('n') * 1.8 * R * 0.7; break;
      case 'beulswerk': v = opDoel(hit(raw('dmg'))) - raw('zelf') * 1.1; break;
      /* ---- Kolendruïde ---- */
      case 'doornzweep': v = opDoel(hit(raw('dmg')) + 2 * hit(raw('dmg'), t, -hak - wet)); break;
      case 'het_origineel_kaart': v = opDoel(hit(raw('dmg') + raw('maal') * (s.status.doornen || 0))); break;
      case 'perkamentslag': v = opDoel(hit(raw('dmg'))) + doornV(raw('dr')); break;
      case 'doorslag_doornen': case 'sporenstoot': v = opDoel(hit(raw('dmg') + (t && ((t.status.zwak || 0) > 0 || kwVan(t)) ? raw('bonus') : 0))); break;
      case 'wortelgreep': case 'asregen': v = opDoel(hit(raw('dmg'))) + zwakV(raw('zw')); break;
      case 'wurgwortels': v = opDoel(hit(raw('dmg'))) + kwV(raw('kw')); break;
      case 'knalsigaar': v = opDoel(hit(raw('dmg'))) - raw('kans') / 100 * 4; break;
      case 'wilde_oogst': v = aoe(raw('dmg'), 3); break;
      case 'flame': v = aoe(raw('dmg')) + krachtV(2); break;
      case 'fakkeloptocht': v = aoe(raw('dmg')); break;
      case 'bastvel': v = blokV(raw('blok')) + doornV(raw('dr')); break;
      case 'tegenvuur': v = blokV(raw('blok')) + doornV(raw('doorn')); break;
      case 'doornmantel': v = doornV(raw('dr')); break;
      case 'duivelspact': v = krachtV(raw('kr')) - 4; break;
      case 'kolengloed': v = krachtV(raw('kr')) - 0.3 * raw('licht'); break;
      case 'kolenstempel': v = krachtV(raw('kr')) + doornV(raw('dr')) - 0.3 * raw('licht'); break;
      case 'stoofpotje': v = blokV(raw('blok')) + heelV(raw('heel')); break;
      case 'paddenstoelenstoofpot': case 'tweede_adem': v = heelV(raw('heel')); break;
      case 'stoofgeur': v = zwakV(raw('zw')) * Math.max(1, hitsPerBeurt * 0.7); break;
      case 'sporenkring': v = zwakV(raw('n')) * 1.5; break;
      case 'hart_van_de_duivelboom': v = krachtV(1) * R / 2; break;
      case 'de_laatste_vonk': v = 1; break;
      case 'vonkenbeet': v = opDoel(hit(raw('dmg'))) - 0.3 * raw('licht'); break;
      /* ---- neutraal ---- */
      case 'brandstapel': { const vl = g.hand.filter(k => kdef(k).type === 'vloek').length; v = vl ? aoe(raw('dmg') * vl) + vl * 3 : -1; break; }
      case 'volkswoede': { const vl = g.hand.filter(k => kdef(k).type === 'vloek').length; v = opDoel(hit(raw('dmg') + raw('per') * vl)); break; }
      case 'schuldverschuiving': v = zwakV(raw('n')) + kwV(raw('n')) + 3; break;
      case 'stempel': v = kwV(raw('kw')) + zwakV(raw('zw')); break;
      case 'doornenhuid': v = doornV(raw('n')); break;
      case 'krijgslist': v = 2; break;
      case 'adrenaline': v = 5; break;
      default: {
        if (d.type === 'aanval') v += opDoel(hit(raw('dmg')));
        if (raw('gif') > 0) v += gw(raw('gif'));
      }
    }
    /* blok staat los van de switch (verdediging, schildmuur, sluiproute, bolwerk, archiefstof, eikenhuid, ...) */
    if (raw('blok') > 0 && !['bastvel', 'tegenvuur', 'stoofpotje', 'ijzeren_golf'].includes(c.id)) v += blokV(raw('blok'));
    /* ---- BEWUST: de rekening en de shortlist ---- */
    if (beleid === 'bewust' && job.baas === 'de_dicktator') {
      const marge = factuurMarge(c);
      v -= marge * (nodig + marge >= S.hp ? 3 : (hpFrac < 0.4 ? 1.8 : 1.2));
      const plan = shortlistPlan();
      if (plan && boss() && boss().intent && boss().intent.type === 'decreet') {
        if (c.id === plan.houdId && !plan.veilig) v += 10;       /* speel de kaart die je wil houden */
        if (c.id === plan.offerId && (plan.so + 1 >= plan.sh)) v -= 6;  /* en laat de offerkaart liggen */
      } else if (plan) {
        if (c.id === plan.houdId && !plan.veilig) v += 4;
      }
    }
    return v;
  };
  const kiesKaart = () => {
    const b = boss(); if (!b || b.dood) return null;
    const R = R_();
    let best = null, bestS = 0.2;
    for (const c of g.hand) {
      const d = kdef(c); const k = kkost(c);
      if (!d || d.type === 'vloek' || k === null || k > g.energie) continue;
      if (d.kan && !d.kan(c)) continue;
      const s = waarde(c, R) / Math.max(0.6, k);
      if (s > bestS) { bestS = s; best = c; }
    }
    return best;
  };
  const drinkIndien = (noodgeval) => {
    const i = S.dranken.indexOf('heeldrank'); if (i < 0 || g.ceremonie || g.bezig) return false;
    const drempel = S.hp < S.maxHp * 0.35 || (noodgeval && Math.max(0, inkomend() - (spl().blok || 0)) >= S.hp);
    if (!drempel) return false;
    try { gebruikDrank(i); T.drank = (T.drank || 0) + 1; return true; } catch (e) { return false; }
  };

  /* ---------------- DE LUS ---------------- */
  const rondes = []; let fout = null; let ronde = 0;
  const MAX = 45;
  try {
    while (!g.voorbij && S.gevecht === g && S.hp > 0 && ronde < MAX) {
      await vrij();
      if (g.voorbij) break;
      ronde++;
      const b0 = boss();
      const bd = window.__bedrijf();
      const hpVoor = S.hp; T.rondeIn = 0;
      const beurtStart = g.beurt;
      const intent = b0 && b0.intent ? b0.intent.naam : '?';
      const hofTxt = hof().map(x => x.id.replace(/^de_/, '').slice(0, 4) + ':' + ((x.intent && x.intent.naam) || '').slice(0, 8)).join(',');
      const inkNu = inkomend();
      drinkIndien(false);
      /* Act 2-referentie: DE LAATSTE SPRONG van Drops (breekt de kopieermachine) zodra hij
         beschikbaar is - zonder dat is de Erfprins voor een bot niet eerlijk te meten */
      if (job.baas === 'de_erfprins' && gMet() && !gMet().dood && !g.copycatGebroken) {
        const md = METGEZELLEN[gMet().id];
        if (md && md.opoffering && md.opoffering.beschikbaar(g)) {
          const oudB = window.bevestig; window.bevestig = (t, ja) => ja();
          try { metgezelOpoffering(); T.offer = ronde; } catch (e) {} finally { window.bevestig = oudB; }
          await vrij();
        }
      }
      let guard = 0, kaarten = [];
      const plan0 = beleid === 'bewust' ? shortlistPlan() : null;
      T._bewaar = plan0 ? plan0.houdId : null;
      while (guard++ < 30 && !g.voorbij && S.gevecht === g) {
        await vrij();
        if (g.voorbij || g.beurt !== beurtStart) break;
        const c = kiesKaart(); if (!c) break;
        const d = kdef(c);
        kaarten.push(c.id);
        T._zelf = true;
        try { await speelKaart(c, d.doel === 'vijand' ? doelwitVoor(c) : undefined); } finally { T._zelf = false; }
      }
      await vrij();
      if (g.voorbij || S.gevecht !== g) { rondes.push({ r: ronde, bd, hpVoor, hp: S.hp, in: T.rondeIn, intent, hof: hofTxt, ink: inkNu, k: kaarten, posten: g.posten || 0, bossHp: Math.max(0, (boss() || {}).hp || 0) }); break; }
      drinkIndien(true);
      const postenNu = g.posten || 0;
      if (g.beurt === beurtStart) {
        let pog = 0;
        while (g.beurt === beurtStart && !g.voorbij && pog++ < 5) { await vrij(); await eindBeurt(); await vrij(); }
        if (g.beurt === beurtStart && !g.voorbij) { fout = 'eindBeurt kwam niet door (ronde ' + ronde + ')'; break; }
      }
      const bb = boss();
      rondes.push({ r: ronde, bd, hpVoor, hp: S.hp, in: T.rondeIn, intent, hof: hofTxt, ink: inkNu, k: kaarten, posten: postenNu, bossHp: Math.max(0, (bb && bb.hp) || 0), gif: (bb && bb.status.gif) || 0, blok: 0 });
    }
  } catch (e) { fout = (e && e.stack) ? String(e.stack).slice(0, 600) : String(e); }
  await vrij();
  const b = g.vijanden.find(isBaas);
  const gewonnen = !!g._gewonnen && S.hp > 0;
  const dood = !gewonnen && (S.hp <= 0 || !!g._verloren);
  const uit = {
    cel: job.cel, seed: job.seed, held: build.held, st: job.st, beleid, baas: job.baas, hpPct: job.hpPct,
    maxHp: S.maxHp, hpStart, fout, gewonnen, dood, timeout: !gewonnen && !dood, rondes: ronde, hpOver: S.hp,
    sterfBedrijf: dood ? (rondes.length ? rondes[rondes.length - 1].bd : window.__bedrijf()) : null,
    eindBedrijf: window.__bedrijf(), bossHpOver: b ? Math.max(0, b.hp) : null,
    bron: T.bron, bronBd: T.bronBd, inBd: T.inBd, uitBd: T.uitBd, uitBaas: T.uitBaas, uitHof: T.uitHof, uitSoort: T.uitSoort,
    rawIn: T.rawIn, geblokt: T.geblokt, metgezelVing: T.metgezelVing, drank: T.drank || 0, offerRonde: T.offer || null,
    decreten: T.decreten, dekVerlies: T.decreten.length, lasters: b ? (b.lasters || 0) : 0,   /* de Laster van DE VACATURE landt in g.trek, niet in S.dek */
    kiezers: b && b._kiezers != null ? b._kiezers : null, krachtVast: b ? (b.krachtVast || 0) : 0, herrezen: !!(b && b.herrezen),
    log: rondes
  };
  window.__T = null;
  try { g.voorbij = true; stopGevechtLus(); } catch (e) {}
  S.gevecht = null;
  document.querySelectorAll('.overlay, #baas-intro, .baas-flits, .baas-spraak, .vloek-reveal-overlay, .decreet-overlay, #scherm-einde .einde, #gevecht-achtergrond-2, .vonnis').forEach(n => { try { n.remove(); } catch (e) {} });
  return uit;
}

/* ============================================================
   NODE: pagina's opzetten en de jobs verdelen
   ============================================================ */
async function maakPagina(browser, fouten) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block', locale: 'nl-BE' });
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.host !== HOST) return route.abort();
    let rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
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
  await page.waitForFunction(() => typeof startGevecht === 'function' && typeof nieuwSpel === 'function' && typeof KAARTEN !== 'undefined' && typeof DICK === 'object');
  await page.waitForTimeout(500);
  await page.evaluate(installeer);
  return page;
}

async function main() {
  const t0 = Date.now();
  const browser = await chromium.launch({ headless: true });
  const fouten = [];
  const paginas = [];
  for (let i = 0; i < WERKERS; i++) paginas.push(await maakPagina(browser, fouten));
  /* DEV_BUILDS uit de pagina: de twee referentiebuilds blijven exact die van game.js */
  const dev = await paginas[0].evaluate(() => JSON.parse(JSON.stringify(DEV_BUILDS)));
  const versie = (fs.readFileSync(path.join(WORTEL, 'sw.js'), 'utf8').match(/const CACHE = '([^']+)'/) || [])[1] || '?';
  const dick = await paginas[0].evaluate(() => JSON.parse(JSON.stringify(DICK)));
  const buildVan = (held, st) => { const b = BUILDS[held][st]; return typeof b === 'string' ? Object.assign({ bron: b }, dev[b.slice(4)]) : b; };
  const jobs = maakJobs();
  console.log(`HET PROCES-meting '${LABEL}' · ${versie} · ${jobs.length} gevechten · ${WERKERS} werkers · ${N} seeds per cel`);
  const resultaten = [];
  let volgende = 0, klaar = 0;
  await Promise.all(paginas.map(async page => {
    while (volgende < jobs.length) {
      const job = jobs[volgende++];
      const build = buildVan(job.held, job.st);
      let r;
      try { r = await page.evaluate(eenGevecht, { build, job }); }
      catch (e) { r = { cel: job.cel, seed: job.seed, fout: 'evaluate: ' + String(e.message || e).slice(0, 300) }; }
      resultaten.push(r);
      if (r.fout) console.log(`  FOUT ${job.cel} ${job.seed}: ${String(r.fout).split('\n')[0]}`);
      if (++klaar % 25 === 0) console.log(`  ${klaar}/${jobs.length} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
  }));
  await browser.close();
  const builds = {};
  for (const h of HELDEN) for (const st of STERKTES) builds[h + '/' + st] = buildVan(h, st);
  const uitPad = process.env.MEET_UIT || path.join(__dirname, LABEL + '.json');
  fs.writeFileSync(uitPad, JSON.stringify({ meta: { label: LABEL, versie, datum: new Date().toISOString(), seeds: N, beleid: BELEID, dick, duurS: Math.round((Date.now() - t0) / 1000), paginafouten: [...new Set(fouten)].slice(0, 20) }, builds, resultaten }, null, 1));
  console.log(`klaar in ${((Date.now() - t0) / 1000).toFixed(0)} s → ${uitPad}`);
  if (fouten.length) console.log('PAGINAFOUTEN:', [...new Set(fouten)].slice(0, 8));
}
main().catch(e => { console.error(e); process.exit(1); });
