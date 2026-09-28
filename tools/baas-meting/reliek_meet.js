/* DE RELIKWIE-KNOPPEN IN DE MEETHARNASSEN (relikwie-balans, 28 sep 2026).
   Gedeeld door dick_meting.js (de finale) en erfprins_meting.js (de Erfprins). De spelcode draagt
   de knoppen zelf: const RELIEK in js/game.js (standaard exact het gedrag van v138). Dit bestand
   wijzigt geen spelcode: het zet RELIEK per gevecht in de headless pagina en telt wat de relikwieën
   deden.

   OPTIES (env, in BEIDE harnassen dezelfde betekenis):
     MEET_RELIEK=<id>[,<id>...]   voeg deze relikwieën toe aan ELKE build (elke variant, elke cel);
                                  '-<id>' haalt er een weg (bv. MEET_RELIEK=-stempelkussen).
                                  Een relikwie dat de build al draagt, telt niet dubbel.
     MEET_RELIEK_VAR=<json>       varianten op dezelfde seeds (gepaard), zoals MEET_VARIANTEN bij de
                                  Erfprins. Vorm:
       { "klem_nu":   { "plus": ["dossierklem"] },
         "klem_n1":   { "plus": ["dossierklem"], "reliek": { "dossierklem": { "n": 1 } } },
         "klem_max9": { "plus": ["dossierklem"], "reliek": { "dossierklem": { "max": 9 } } },
         "geen_stempel": { "min": ["stempelkussen"] } }
       - reliek = knoppen in RELIEK (per relikwie; een onbekend relikwie, een onbekende knop of een
         verkeerd type laat de job falen: geen stille tikfout);
       - plus / min = relikwieën erbij / eraf voor deze variant (bovenop MEET_RELIEK);
       - 'basis' (geen knoppen, geen plus/min) draait ALTIJD mee, tenzij het bestand zelf een 'basis'
         definieert; de winstwinst van een variant = variant - basis op dezelfde (cel, seed);
       - bij de Erfprins mag een variant ook 'knoppen' (ERF) en 'mods' dragen (zie MEET_VARIANTEN).
     Varianten met knoppen falen op spelcode zonder RELIEK (een oude stand): dat is bewust.

   PER GEVECHT (veld 'rt' in de uitvoer; 'rv' = de naam van de relikwie-variant):
     rt.blok[id]  = { geleverd, ving, vingMin, vingMax } voor de Blok-relikwieën (mosamulet, dossierklem,
                    indexkaart): geleverd = alle Blok die het relikwie gaf; ving = het deel dat in de
                    vijandbeurt echt schade opving, evenredig verdeeld over de Blok die er toen lag
                    (vingMin: de relikwie-Blok wordt als LAATSTE gebruikt; vingMax: als EERSTE). De Blok
                    van de Dossierklem = de Metaalhuid die de klem zelf gaf, op het einde van elke beurt.
     rt.energie[id] = extra Energie (kroon_van_sintels, energiekristal); rt.trek = extra kaarten
                    (netto: de Oorlogstrommel min de prijs 'trek' van een energierelikwie);
     rt.inkt      = Gif dat de Inktpot gaf (incl. de Smaragden Ring);
     rt.carbon    = { treffers, terug, doornKaats, doornen }: treffers op jou met de afdruk, de directe
                    terugslag, wat de Doornen VAN DE AFDRUK terugkaatsten (nominaal, vóór het scèneslot
                    van de DICKtator) en hoeveel Doornen de afdruk op het einde gaf.
     rt.beurten   = het aantal spelersbeurten.
   Analyse: python tools/baas-meting/reliek_winst.py <uitvoer.json> [...] (beide harnassen, gepaard). */
const fs = require('fs');

const NAAM_OK = /^[A-Za-z0-9_.-]+$/;
const VAR_VELDEN = ['reliek', 'plus', 'min', 'knoppen', 'mods', 'uitleg'];

/* 'a,-b, c' -> { plus: ['a','c'], min: ['b'] } */
function parseLijst(s) {
  const plus = [], min = [];
  String(s || '').split(',').map(x => x.trim()).filter(Boolean).forEach(x => {
    if (x[0] === '-') min.push(x.slice(1)); else plus.push(x[0] === '+' ? x.slice(1) : x);
  });
  return { plus, min };
}

/* de opties uit env: { glob: {plus, min}, varianten: { naam: {reliek, plus, min, knoppen?, mods?, uitleg} } } */
function leesReliek(env) {
  const glob = parseLijst(env.MEET_RELIEK || '');
  const varianten = {};
  if (env.MEET_RELIEK_VAR) {
    const raw = JSON.parse(fs.readFileSync(env.MEET_RELIEK_VAR, 'utf8'));
    for (const [naam, v] of Object.entries(raw)) {
      if (!NAAM_OK.test(naam)) throw new Error(`MEET_RELIEK_VAR: ongeldige variantnaam '${naam}' (alleen letters, cijfers, _ . -)`);
      const vreemd = Object.keys(v || {}).filter(k => !VAR_VELDEN.includes(k));
      if (vreemd.length) throw new Error(`MEET_RELIEK_VAR ${naam}: onbekende velden ${vreemd.join(', ')} (toegelaten: ${VAR_VELDEN.join(', ')})`);
      const lijst = x => (Array.isArray(x) ? x : (x ? [x] : [])).map(String);
      varianten[naam] = { reliek: (v && v.reliek) || {}, plus: lijst(v && v.plus), min: lijst(v && v.min), uitleg: (v && v.uitleg) || '' };
      if (v && v.knoppen) varianten[naam].knoppen = v.knoppen;
      if (v && v.mods) varianten[naam].mods = v.mods;
    }
  }
  return { glob, varianten, actief: !!(glob.plus.length || glob.min.length || Object.keys(varianten).length) };
}

/* de relikwieën van een build na min en plus (volgorde: eerst min, dan plus; geen dubbels) */
function pasToe(lijst, plus, min) {
  const r = (lijst || []).filter(x => !(min || []).includes(x));
  for (const p of (plus || [])) if (!r.includes(p)) r.push(p);
  return r;
}
/* alle relikwie-ids die een meting noemt (om ze vooraf in de pagina te toetsen) */
function alleIds(opt) {
  const s = new Set([...opt.glob.plus, ...opt.glob.min]);
  for (const v of Object.values(opt.varianten)) [...v.plus, ...v.min].forEach(x => s.add(x));
  return [...s];
}
/* een korte tekst voor de console */
function omschrijf(opt) {
  const d = [];
  if (opt.glob.plus.length) d.push('+' + opt.glob.plus.join('+'));
  if (opt.glob.min.length) d.push('-' + opt.glob.min.join('-'));
  const vn = Object.keys(opt.varianten);
  if (vn.length) d.push('relikwie-varianten ' + vn.join(','));
  return d.length ? ' · RELIEK ' + d.join(' · ') : '';
}

/* ============================================================
   IN DE PAGINA (eenmalig per pagina, na de eigen installeer van het harnas). Zelfstandig: page.evaluate
   serialiseert de functie. Alle wikkels zijn doorzichtig: ze roepen het origineel met dezelfde argumenten
   en veranderen niets aan het spel.
   ============================================================ */
function installeerReliek() {
  window.__RELIEK_STD = (typeof RELIEK === 'object' && RELIEK) ? JSON.parse(JSON.stringify(RELIEK)) : null;
  window.__RT = null;
  /* RELIEK van deze job: eerst de standaard uit game.js terug, dan de knoppen van de variant */
  window.__zetReliek = kn => {
    kn = kn || {};
    const std = window.__RELIEK_STD;
    if (!std) {
      if (Object.keys(kn).length) throw new Error('RELIEK bestaat niet in deze spelcode (een stand van vóór de relikwie-knoppen?); knoppen voor ' + Object.keys(kn).join(', '));
      return;
    }
    for (const id of Object.keys(std)) RELIEK[id] = Object.assign({}, std[id]);
    for (const [id, o] of Object.entries(kn)) {
      if (!std[id]) throw new Error('RELIEK kent geen relikwie ' + id + ' (wel: ' + Object.keys(std).join(', ') + ')');
      for (const [k, v] of Object.entries(o || {})) {
        if (!(k in std[id])) throw new Error('RELIEK.' + id + ' kent geen knop ' + k + ' (wel: ' + Object.keys(std[id]).join(', ') + ')');
        if (typeof v !== typeof std[id][k]) throw new Error('RELIEK.' + id + '.' + k + ': verwacht een ' + typeof std[id][k] + ', kreeg ' + JSON.stringify(v));
        RELIEK[id][k] = v;
      }
    }
    if (RELIEK.dossierklem && !['stapel', 'start', 'blok'].includes(RELIEK.dossierklem.vorm)) throw new Error('RELIEK.dossierklem.vorm moet stapel, start of blok zijn');
  };
  window.__reliekStart = () => {
    window.__RT = { beurten: {}, klemMH: 0, energie: {}, trek: 0, inkt: 0, carbon: { treffers: 0, terug: 0, doornKaats: 0 }, carbonD: 0 };
  };
  const beurt = () => {
    const RT = window.__RT; const g = S.gevecht;
    if (!RT || !g) return null;
    const t = g.beurt || 0;
    return RT.beurten[t] || (RT.beurten[t] = { blok: {}, bTot: null, geblokt: 0, treffers: 0 });
  };
  const wikkel = (naam, maak) => { if (typeof window[naam] === 'function') window[naam] = maak(window[naam]); };
  wikkel('reliekBlok', o => function (s, n, id, direct) {
    const r = o(s, n, id, direct); const b = beurt();
    if (b && s && s.isSpeler && n > 0) b.blok[id] = (b.blok[id] || 0) + n;
    return r;
  });
  wikkel('reliekDossierklem', o => function (g, s, start) {
    const RT = window.__RT; const voor = (s && s.status && s.status.metaalhuid) || 0;
    const r = o(g, s, start);
    if (RT && s && s.status) RT.klemMH += Math.max(0, (s.status.metaalhuid || 0) - voor);
    return r;
  });
  /* de Metaalhuid-Blok valt in eindBeurt; het deel van de klem = de Metaalhuid die de klem gaf */
  wikkel('eindBeurt', o => function () {
    const RT = window.__RT; const g = S.gevecht;
    if (RT && g && !g.bezig && !g.voorbij && !g.ceremonie && RT.klemMH > 0) {
      const mh = (g.speler.status.metaalhuid || 0);
      const b = beurt();
      if (b && mh > 0) b.blok.dossierklem = (b.blok.dossierklem || 0) + Math.min(RT.klemMH, mh);
    }
    return o.apply(this, arguments);
  });
  wikkel('reliekIndexBlok', o => function (g) {
    const s = sp(); const tot = s.status.geindexeerd || 0;
    const R = (typeof RELIEK === 'object' && RELIEK.indexkaart) || { n: 0 };
    const deel = heeftRelikwie('indexkaart') ? Math.min(tot, R.n || 0) : 0;
    const blokVoor = s.blok || 0;
    const r = o(g);
    const relic = Math.max(0, ((s.blok || 0) - blokVoor) - (tot - deel));
    const b = beurt();
    if (b && relic > 0) b.blok.indexkaart = (b.blok.indexkaart || 0) + relic;
    return r;
  });
  wikkel('reliekEnergie', o => function (id, g) {
    const r = o(id, g); const RT = window.__RT;
    if (RT && r) RT.energie[id] = (RT.energie[id] || 0) + r;
    return r;
  });
  wikkel('reliekExtraTrek', o => function (g, licht) {
    const r = o(g, licht); const RT = window.__RT;
    if (RT && r) RT.trek += r;
    return r;
  });
  wikkel('reliekInktpot', o => function () {
    const som = () => alleVijanden().reduce((t, v) => t + (v.status.gif || 0), 0);
    const voor = som(); const r = o(); const RT = window.__RT;
    if (RT) RT.inkt += Math.max(0, som() - voor);
    return r;
  });
  wikkel('reliekCarbon', o => function (doel, bron, hpVerlies) {
    const RT = window.__RT; const voor = (doel && doel.status && doel.status.doornen) || 0;
    const R = (typeof RELIEK === 'object' && RELIEK.carbon_afdruk) || {};
    const vuurt = !(R.alleenHp && !(hpVerlies > 0));
    const r = o(doel, bron, hpVerlies);
    if (RT) {
      RT.carbonD += Math.max(0, ((doel && doel.status && doel.status.doornen) || 0) - voor);
      if (vuurt && R.terug > 0) RT.carbon.terug += R.terug;
    }
    return r;
  });
  /* de treffers van een vijand op jou: de Blok bij de eerste treffer van de vijandbeurt en wat er geblokt
     werd; plus de kaats van de Doornen die de Carbon-afdruk gaf (die kaats valt in doeSchade VÓÓR de afdruk
     er een Doorn bij legt) */
  wikkel('doeSchade', o => function (doel, dmg, bron, opts) {
    const RT = window.__RT; const g = S.gevecht;
    if (RT && g && doel && doel.isSpeler && bron && !bron.isSpeler && !bron.isMetgezel) {
      const b = beurt();
      if (b && g._vijandBeurt) {
        if (b.bTot == null) b.bTot = doel.blok || 0;
        const d = (typeof glasDmg === 'function') ? glasDmg(dmg) : dmg;
        b.geblokt += Math.min(doel.blok || 0, Math.max(0, d)); b.treffers++;
      }
      if (heeftRelikwie('carbon_afdruk') && !bron.dood) {
        RT.carbon.treffers++;
        RT.carbon.doornKaats += Math.min(RT.carbonD, doel.status.doornen || 0);
      }
    }
    return o(doel, dmg, bron, opts);
  });
  window.__reliekLees = () => {
    const RT = window.__RT; if (!RT) return null;
    const blok = {};
    const ts = Object.keys(RT.beurten);
    for (const t of ts) {
      const b = RT.beurten[t];
      const ids = Object.keys(b.blok); if (!ids.length) continue;
      const relic = ids.reduce((s, id) => s + b.blok[id], 0);
      const bTot = b.bTot || 0;
      const R = Math.min(relic, bTot), O = bTot - R, X = Math.min(b.geblokt, bTot);
      for (const id of ids) {
        const e = blok[id] || (blok[id] = { geleverd: 0, ving: 0, vingMin: 0, vingMax: 0 });
        e.geleverd += b.blok[id];
        if (bTot > 0 && relic > 0) {
          const deel = b.blok[id] / relic;
          e.ving += (X * R / bTot) * deel;
          e.vingMin += Math.max(0, X - O) * deel;
          e.vingMax += Math.min(X, R) * deel;
        }
      }
    }
    for (const e of Object.values(blok)) for (const k of ['ving', 'vingMin', 'vingMax']) e[k] = Math.round(e[k] * 10) / 10;
    const g = S.gevecht;
    return { blok, energie: RT.energie, trek: RT.trek, inkt: RT.inkt,
      carbon: Object.assign({}, RT.carbon, { doornen: RT.carbonD }), beurten: g ? (g.beurt || 0) + 1 : ts.length };
  };
}

module.exports = { leesReliek, pasToe, alleIds, omschrijf, parseLijst, installeerReliek };
