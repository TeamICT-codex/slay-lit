/* ============================================================
   SLAY LIT — spelmotor
   v2: incrementele rendering, rAF-klok, Klank (audio),
   Vista (3D-strijdtoneel), 2.5D-kaarten, lite-modus.
   ============================================================ */

/* ---------- hulpfuncties ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ---------- Toeval: seeded generator voor ALLE spellogica ----------
   Zelfde seed = exact dezelfde run (map, vijanden, beloningen, winkels).
   Presentatie-willekeur (fx, deeltjes) gebruikt bewust Math.random,
   zodat visuele franje geen spelrolls opeet. */
const Toeval = (() => {
  let staat = (Math.random() * 0xFFFFFFFF) >>> 0;
  function volgende() {
    staat = (staat + 0x6D2B79F5) | 0;
    let t = Math.imul(staat ^ (staat >>> 15), 1 | staat);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    volgende,
    zetZaad(z) { staat = z >>> 0; },
    get staat() { return staat >>> 0; },
    zetStaat(s) { staat = s >>> 0; }
  };
})();

function zaadVanTekst(tekst) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < tekst.length; i++) {
    h ^= tekst.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function maakSeedTekst() {
  const letters = 'BCDFGHJKLMNPRSTVWZ';
  let s = '';
  for (let i = 0; i < 4; i++) s += letters[Math.floor(Math.random() * letters.length)];
  return s + '-' + String(Math.floor(Math.random() * 9000) + 1000);
}

const willekeurig = () => Toeval.volgende();
const rnd = (a, b) => a + Math.floor(Toeval.volgende() * (b - a + 1));
const kiesUit = arr => arr[Math.floor(Toeval.volgende() * arr.length)];
function schud(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Toeval.volgende() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const RIJEN = 15, KOLS = 7;   /* afdaling iets langer (13→15): meer gevechten/encounters per act */
const SAVE_SLEUTEL = 'slayit_save_v1';

/* ---------- acts (meerdere verdiepingen-ladders na elkaar) ---------- */
const ACTS_MAX = 2;                       /* verhoog naar 3 zodra Act 3 klaar is */
const ACT_NAMEN = { 1: 'De Diepte', 2: 'Het Archief', 3: 'Het Slachtblok' };
const BAAS_PER_ACT = {
  1: { id: 'slijmkoning', naam: 'De Slijmkoning' },
  2: { id: 'de_erfprins', naam: 'De Erfprins' }
};
function huidigeAct() { return (S && S.act) || 1; }
function huidigeBaas() { return BAAS_PER_ACT[huidigeAct()] || BAAS_PER_ACT[1]; }
/* act-bewuste achtergrond: pak de plaat van de huidige act, val terug op act1 */
function actBg(slot) {
  const A = window.ACHTERGRONDEN;
  if (!A) return null;
  const set = A['act' + huidigeAct()] || A.act1;
  return (set && set[slot]) || (A.act1 && A.act1[slot]) || null;
}

/* ---------- instellingen ---------- */
const standaardLite =
  (navigator.hardwareConcurrency || 8) <= 4 ||
  (navigator.deviceMemory || 8) <= 4 ||
  (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

/* mobiel/touch staat los van de hardware-heuristiek: een coarse pointer
   (vinger) of een mobiele user-agent. Op een laptop is dit false, dus de
   defaults hieronder blijven exact zoals voorheen. Globaal beschikbaar zodat
   scene3d zijn renderer kan verzachten en latere touch-fixes hem hergebruiken. */
const mobiel =
  (window.matchMedia && matchMedia('(pointer: coarse)').matches) ||
  /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent || '');
window.mobiel = mobiel;

/* het presentatiespoor: laptop (gedeelde basis) of mobiel (css/mobiel.css).
   Synchroon hier gezet — game.js draait als laatste body-script, vóór de
   eerste paint — zodat de mobiele stijl er meteen staat, zonder flits.
   css/mobiel.css koppelt alles aan body[data-modus="mobiel"], dus dit
   attribuut bepaalt welk spoor zichtbaar is. */
document.body.dataset.modus = mobiel ? 'mobiel' : 'laptop';

/* DEV-SHORTCUT: het mobiele spoor forceren op de laptop om te previewen
   zonder apparaat-emulatie. Toggle via Ctrl+Shift+M of devMobiel() in de
   console. Wisselt het CSS-spoor (data-modus) én de JS-vlag (window.mobiel),
   en hertekent het lopende gevecht zodat de JS-layouttakken meewisselen.
   Vóór release samen met de andere DEV-shortcuts verwijderen. */
window.devMobiel = function (forceer) {
  const aan = (forceer !== undefined) ? !!forceer : (document.body.dataset.modus !== 'mobiel');
  document.body.dataset.modus = aan ? 'mobiel' : 'laptop';
  window.mobiel = aan;
  try { if (typeof S !== 'undefined' && S && S.gevecht && typeof renderGevecht === 'function') renderGevecht(); } catch (e) {}
  try { if (typeof melding === 'function') melding('DEV: mobiel-spoor ' + (aan ? 'AAN' : 'uit')); } catch (e) {}
  console.info('[DEV] mobiel-spoor', aan ? 'AAN' : 'uit', '(data-modus=' + document.body.dataset.modus + ')');
};
window.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.shiftKey && (e.key === 'M' || e.key === 'm')) { e.preventDefault(); window.devMobiel(); }
});

/* Three.js (~600 KB) alleen laden waar 3D überhaupt kán draaien: desktop op http.
   Op mobiel en file:// is 3D altijd uit (zie d3Gewenst), dus daar nooit de
   download+parse betalen. Async geïnjecteerd → blokkeert de eerste render niet en
   is ruim vóór het eerste gevecht klaar; lukt het toch niet op tijd, dan valt dat
   ene gevecht netjes terug op 2D (Vista.beschikbaar checkt window.THREE op call-time). */
if (location.protocol !== 'file:' && !window.mobiel) {
  const _three = document.createElement('script');
  _three.src = 'js/lib/three.min.js';
  _three.async = true;
  document.head.appendChild(_three);
}

/* veilige lezer voor de persistente localStorage-stores. Een getamperde of corrupte
   waarde (bv. handmatig gezette ongeldige JSON, of storage-corruptie) mag de module-
   evaluatie NIET breken: gooit JSON.parse hier op module-niveau, dan wordt de rest van
   game.js nooit geëvalueerd → geen enkele functie bestaat → volledig dode pagina zonder
   uitweg. Bij een vangst ruimt hij de corrupte sleutel meteen op (zoals wisSave bij de
   save) zodat de fout zichzelf heelt op de volgende load. NB: de `|| '{}'` ving enkel een
   ONTBREKENDE sleutel op, niet een aanwezige-maar-malformde waarde. */
function veiligLees(sleutel) {
  try { return JSON.parse(localStorage.getItem(sleutel) || '{}'); }
  catch (e) { try { localStorage.removeItem(sleutel); } catch (_) {} return {}; }
}
const INST = Object.assign(
  /* op mobiel standaard 3D UIT (onspeelbaar daar), maar lite NIET geforceerd:
     lite dooft de animaties, en juist die geven het spel leven. Lite alleen
     bij echt zwakke hardware. Op laptop ongewijzigd want mobiel=false. */
  { lite: standaardLite, d3: !standaardLite && !mobiel, spraak: true, daglicht: mobiel },
  veiligLees('slayit_inst')
);
/* eenmalige mobiel-migratie: forceer 3D uit (onspeelbaar op telefoon) en zet de
   eerder geforceerde lite-modus weer uit op capabele toestellen — anders blijven
   alle gevechtsanimaties dood. Vlag zodat het maar één keer ingrijpt. */
if (mobiel && !INST.mobielHersteld) {
  INST.mobielHersteld = true;
  INST.d3 = false;
  if (!standaardLite) INST.lite = false;
  try { localStorage.setItem('slayit_inst', JSON.stringify(INST)); } catch (e) {}
}
function bewaarInst() { localStorage.setItem('slayit_inst', JSON.stringify(INST)); }

/* ---------- de Codex: alles wat je ooit ontdekte, over alle runs heen ---------- */
const CODEX_SLEUTEL = 'slayit_codex';
const Codex = Object.assign(
  /* loopbaan over alle runs heen: runs/wins/diepterecord per held, laatste runs,
     en het hoogst-ontgrendelde ascensieniveau per held. Bestaande saves missen
     deze sleutels → Object.assign houdt dan deze defaults aan (migratie). */
  { relikwieen: [], dranken: [], metgezellen: [], gevallen: [], opgeladen: null, runs: 0, wins: 0, bestDiepte: {}, gesch: [], ascensie: {}, mysteries: {}, scherven: [], gezien: [], erfprinsOntmoetingen: 0, copycatGebroken: false },
  veiligLees(CODEX_SLEUTEL)
);
/* relikwieen/dranken hard naar array klemmen VÓÓR de filter-migratie hieronder: een
   getamperde codex met bv. "relikwieen": null overschrijft de default [] met null →
   Codex.relikwieen.filter(...) zou een TypeError op module-niveau gooien (dode pagina).
   Zelfde defensieve patroon als metgezellen/gevallen/gezien verderop. */
if (!Array.isArray(Codex.relikwieen)) Codex.relikwieen = [];
if (!Array.isArray(Codex.dranken)) Codex.dranken = [];
/* migratie: wie al ontdekkingen had, krijgt ze meteen opgeladen in het Schrijn */
if (!Array.isArray(Codex.opgeladen)) {
  Codex.opgeladen = Codex.relikwieen.filter(r => window.RELIKWIEEN && RELIKWIEEN[r] && RELIKWIEEN[r].zeld !== 'start');
}
/* saniteer de opgeslagen loopbaan-gesch: held/seed komen in het Codex-boek in
   innerHTML, dus een getamperde slayit_codex mag daar niets kunnen injecteren
   (zelfde whitelist-aanpak als de seed). */
Codex.gesch = (Array.isArray(Codex.gesch) ? Codex.gesch : []).map(g => ({
  held: String((g && g.held) || '').replace(/[^a-z]/g, '') || 'slachter',
  seed: String((g && g.seed) || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20) || '—',
  diepte: +(g && g.diepte) || 0,
  gewonnen: !!(g && g.gewonnen),
  asc: +(g && g.asc) || 0
}));
/* numerieke loopbaan-velden coërceren → geen 'rij NaN' / 'niveau NaN' bij een
   getamperde of oude codex (alleen bestaande helden behouden). */
const _geldigeHeld = k => typeof SPELERS !== 'undefined' && SPELERS[k];
Codex.runs = +Codex.runs || 0;
Codex.wins = +Codex.wins || 0;
Codex.ascensie = Object.fromEntries(Object.entries(Codex.ascensie || {}).filter(([k]) => _geldigeHeld(k)).map(([k, v]) => [k, Math.max(0, +v || 0)]));
Codex.bestDiepte = Object.fromEntries(Object.entries(Codex.bestDiepte || {}).filter(([k]) => _geldigeHeld(k)).map(([k, v]) => [k, Math.max(0, +v || 0)]));
if (!Array.isArray(Codex.metgezellen)) Codex.metgezellen = [];   /* migratie: oude codex mist deze sleutel */
if (!Array.isArray(Codex.gevallen)) Codex.gevallen = [];         /* metgezellen die zich opofferden (gedenkplek) */
if (!Array.isArray(Codex.gezien)) Codex.gezien = [];             /* bestiarium: vijanden die je écht tegenkwam (artbook-gating) */
Codex.dropsZaadjeNul = !!Codex.dropsZaadjeNul;                    /* grief: is het 'zaadje-nul'-vonkje (eerste doof ná Drops' dood) al ooit getoond? */
Codex.dropsOfferRun = Math.max(0, +Codex.dropsOfferRun || 0);    /* ijkpunt Drops-de-Witte-grief-gate: numeriek klemmen (corrupte save mag de reünie niet blokkeren) */
/* het Metgezel-Mysterie: per-metgezel voortgang (scherven/rijp/voltooid) + baas-teller */
if (typeof Codex.mysteries !== 'object' || !Codex.mysteries || Array.isArray(Codex.mysteries)) Codex.mysteries = {};
Codex.erfprinsOntmoetingen = Math.max(0, +Codex.erfprinsOntmoetingen || 0);
function bewaarCodex() { localStorage.setItem(CODEX_SLEUTEL, JSON.stringify(Codex)); }

/* artbook: onthoud welke vijanden je écht hebt ontmoet (cross-run, persistent) — gate voor het
   Bestiarium. Alleen vijanden met een BESTIARIUM-lore-entry tellen (spawns/naamloze tellen niet). */
function markeerGezien(id) {
  if (typeof BESTIARIUM === 'undefined' || !BESTIARIUM[id]) return;
  if (!Array.isArray(Codex.gezien)) Codex.gezien = [];
  if (!Codex.gezien.includes(id)) { Codex.gezien.push(id); bewaarCodex(); }
}

/* ---------- de Dagelijkse afdaling: iedereen speelt dezelfde dag-run ---------- */
const DAILY_SLEUTEL = 'slayit_daily';
const Daily = Object.assign(
  { laatsteVoltooid: null, laatsteStart: null, laatsteScore: 0, besteScore: 0, reeks: 0, besteReeks: 0, gesch: [] },
  veiligLees(DAILY_SLEUTEL)
);
/* saniteer opgeslagen gesch (defensief — getamperde slayit_daily mag niets injecteren) */
Daily.gesch = (Array.isArray(Daily.gesch) ? Daily.gesch : []).map(g => ({
  dag: String((g && g.dag) || '').replace(/[^0-9-]/g, ''),
  score: +(g && g.score) || 0, gewonnen: !!(g && g.gewonnen), diepte: +(g && g.diepte) || 0
}));
function bewaarDaily() { localStorage.setItem(DAILY_SLEUTEL, JSON.stringify(Daily)); }
function ontdek(soort, id) {
  if (!id || !Codex[soort] || Codex[soort].includes(id)) return;
  Codex[soort].push(id);
  bewaarCodex();
}
/* het Schrijn: een in het spel gevonden relikwie laadt zijn schrijn-lading op */
function laadSchrijnOp(id) {
  const d = RELIKWIEEN[id];
  if (!d || d.zeld === 'start' || Codex.opgeladen.includes(id)) return;
  Codex.opgeladen.push(id);
  bewaarCodex();
}

/* ---------- Het Metgezel-Mysterie (cross-run unlock; generiek over 'mid') ---------- */
/* null-veilige toegang tot de voortgang van één mysterie op de Codex */
function mys(mid) {
  const M = Codex.mysteries || (Codex.mysteries = {});
  if (!M[mid] || typeof M[mid] !== 'object') M[mid] = {};
  const m = M[mid];
  if (!Array.isArray(m.scherven)) m.scherven = [];
  if (typeof m.rite !== 'object' || !m.rite) m.rite = {};
  m.rijp = !!m.rijp; m.voltooid = !!m.voltooid;
  return m;
}
function mysterieRijp(mid) { return !!mys(mid).rijp; }
function isOntgrendeld(mid) { return !!mys(mid).voltooid; }
/* commit een gevonden scherf (idempotent); markeert 'rijp' zodra alle vereiste binnen zijn */
function noteerScherf(mid, sid) {
  const def = window.MYSTERIES && MYSTERIES[mid];
  if (!def || !def.scherven || !def.scherven[sid]) return;   /* onbekend mysterie/scherf → veilig niets */
  const m = mys(mid);
  if (m.voltooid || m.scherven.includes(sid)) return;
  m.scherven.push(sid);
  if ((def.vereist || []).every(s => m.scherven.includes(s))) m.rijp = true;
  bewaarCodex();
  melding('🜂 Een scherf van een groter geheim brandt zich in je geheugen...');
}
function noteerRite(mid, vlag) { mys(mid).rite[vlag] = true; bewaarCodex(); }
function ontgrendelMetgezel(mid) { mys(mid).voltooid = true; bewaarCodex(); }

/* SEQUENTIEEL ontdekken: je verzamelt telkens naar ÉÉN metgezel toe. Het actieve mysterie
   is het eerstvolgende nog-niet-vrijgespeelde in deze vaste volgorde. Zo blijft de voortgang
   duidelijk (één balk tegelijk) en verklap je niet meteen de hele roster. */
const MYSTERIE_VOLGORDE = ['drops', 'vlamwachter', 'mosgeest'];
function actiefMysterie() {
  return MYSTERIE_VOLGORDE.find(mid => window.MYSTERIES && MYSTERIES[mid] && !isOntgrendeld(mid)) || null;
}
/* de scherf-id binnen het actieve mysterie die bij een gegeven bron hoort ('baas'|'figuur'|'episch'),
   of null als die bron al binnen is of er geen actief mysterie meer is. Bouwblok voor de generieke bronnen. */
function actiefMysScherf(bron) {
  const mid = actiefMysterie();
  if (!mid) return null;
  const def = MYSTERIES[mid];
  const sid = (def.vereist || []).find(s => def.scherven[s] && def.scherven[s].bron === bron);
  if (!sid) return null;
  if (mys(mid).scherven.includes(sid)) return null;   /* al verzameld → bron is hier 'op' */
  return { mid, sid };
}

/* ====== SCHERVEN 2.0 — een platte, inzetbare stash (verbruikbaar; geplaatst bij de Drempel) ======
   De 9 scherven (3 per metgezel) staan al als 'recept' in MYSTERIES[mid].scherven. Hierover een
   platte bag-laag: Codex.scherven = multiset van scherf-ids die je bezit. Bij de Drempel (Act 1→2)
   plaats je er 3; een kloppend trio roept de metgezel op, een fout trio wekt de Drempelwachter. */
function scherfDef(sid) {
  const M = window.MYSTERIES; if (!M) return null;
  for (const mid in M) { const s = M[mid].scherven && M[mid].scherven[sid]; if (s) return { sid, mid, bron: s.bron, codexTekst: s.codexTekst, metgezel: M[mid].metgezel }; }
  return null;
}
function alleScherfIds() {
  const M = window.MYSTERIES || {}; const ids = [];
  Object.keys(M).forEach(mid => (M[mid].vereist || []).forEach(s => ids.push(s)));
  return ids;
}
/* TWEE bakken: de STASH = Codex.scherven (veilig, cross-run); GEDRAGEN = S.scherven (wat je
   DÉZE run draagt — inzet, kwijt bij dood). Unieke sets (geen dupes — een trio = 3 verschillende). */
function scherfStash() { if (!Array.isArray(Codex.scherven)) Codex.scherven = []; return Codex.scherven; }
function gedragen() { if (!S) return []; if (!Array.isArray(S.scherven)) S.scherven = []; return S.scherven; }
function bezitScherf(sid) { return scherfStash().includes(sid) || gedragen().includes(sid); }   /* heb je 'm ergens? */
function bankScherf(sid) { if (!scherfDef(sid)) return false; const a = scherfStash(); if (!a.includes(sid)) { a.push(sid); bewaarCodex(); } return true; }
function draagScherf(sid) { if (!scherfDef(sid)) return false; const a = gedragen(); if (!a.includes(sid)) a.push(sid); return true; }   /* in je gedragen tas (at risk) */
function neemUitStash(sid) { const a = scherfStash(); const i = a.indexOf(sid); if (i >= 0) { a.splice(i, 1); bewaarCodex(); return true; } return false; }
function neemGedragen(sid) { const a = gedragen(); const i = a.indexOf(sid); if (i >= 0) { a.splice(i, 1); return true; } return false; }
/* bank alle gedragen scherven veilig op de stash (bij het verlaten van de Drempel + bij winst) */
function bankGedragen() { gedragen().slice().forEach(bankScherf); if (S) S.scherven = []; }
/* run-start loadout: verplaats gekozen scherven van de stash naar je gedragen tas (nu staan ze op het spel) */
function laadScherfLoadout(ids) { (ids || []).forEach(sid => { if (neemUitStash(sid)) draagScherf(sid); }); }
/* welke metgezel hoort bij 3 geplaatste scherf-ids? (exact, nog-niet-vrij trio) → mid of null */
function scherfTrio(ids) {
  const set = (ids || []).filter(Boolean);
  if (set.length !== 3 || new Set(set).size !== 3) return null;
  const M = window.MYSTERIES || {};
  for (const mid in M) {
    const ver = M[mid].vereist || [];
    if (ver.length === 3 && ver.every(s => set.includes(s))) return mid;
  }
  return null;
}
/* drop tijdens een run: een willekeurige scherf van 'bron' die je nog NIET bezit → in je GEDRAGEN
   tas (at risk). Geeft de gevonden scherf-id terug (of null). */
function vindScherf(bron) {
  const alle = alleScherfIds().filter(sid => { const d = scherfDef(sid); return d && (!bron || d.bron === bron); });
  if (!alle.length) return null;
  const nieuw = alle.filter(sid => !bezitScherf(sid));
  if (!nieuw.length) return null;   /* je hebt al alles van deze bron → niets te vinden */
  const sid = kiesUit(nieuw);
  draagScherf(sid);
  return sid;
}
/* is er nog een scherf van deze bron die je NIET bezit? (gate voor de figuur-events) */
function scherfTeVinden(bron) {
  return alleScherfIds().some(sid => { const d = scherfDef(sid); return d && (!bron || d.bron === bron) && !bezitScherf(sid); });
}

/* ---------- loopbaan: het spoor dat élke run achterlaat (retentiemotor) ---------- */
const HELDNAAM = id => (window.SPELERS && SPELERS[id] && SPELERS[id].naam) || id;
function registreerRun(gewonnen) {
  const h = (S && S.held) || 'slachter';
  const diepte = (S && S.verdieping) || 0;
  Codex.runs = (Codex.runs || 0) + 1;
  if (gewonnen) Codex.wins = (Codex.wins || 0) + 1;
  Codex.bestDiepte = Codex.bestDiepte || {};
  const nieuwRecord = diepte > (Codex.bestDiepte[h] || 0);
  if (nieuwRecord) Codex.bestDiepte[h] = diepte;
  /* ascension-ladder: een win op het huidige niveau ontgrendelt het volgende */
  Codex.ascensie = Codex.ascensie || {};
  if (gewonnen) {
    const niv = (S && S.ascensie) || 0;
    if (niv >= (Codex.ascensie[h] || 0)) Codex.ascensie[h] = Math.min(ASCENSIE_MAX, niv + 1);
  }
  Codex.gesch = Array.isArray(Codex.gesch) ? Codex.gesch : [];
  Codex.gesch.unshift({ held: h, seed: (S && S.seed) || '—', diepte, gewonnen: !!gewonnen, asc: (S && S.ascensie) || 0 });
  Codex.gesch = Codex.gesch.slice(0, 10);
  bewaarCodex();
  return { nieuwRecord, beste: Codex.bestDiepte[h] || 0 };
}
function loopbaanRegel() {
  const runs = Codex.runs || 0;
  if (!runs) return '';
  const wins = Codex.wins || 0;
  const best = Codex.bestDiepte ? Math.max(0, ...Object.values(Codex.bestDiepte)) : 0;
  return `🗺️ ${runs} afdaling${runs === 1 ? '' : 'en'} · 👑 ${wins} overwinning${wins === 1 ? '' : 'en'}${best ? ` · ⛏️ diepste val: rij ${best}` : ''}`;
}

/* ---------- ascension: gestapelde uitdaagmodifiers per held (de herspeelmotor).
   Win op niveau N → niveau N+1 ontgrendelt (geregistreerd in registreerRun).
   Puur skill-gated, geen tijd/geld: ethisch zuiver. ---------- */
const ASCENSIE_MAX = 6;
const ASCENSIE = [
  { n: 1, naam: 'Krapper licht',    tekst: 'Je begint met 10 minder fakkel.' },
  { n: 2, naam: 'Taaiere vijanden', tekst: 'Vijanden hebben ~12% meer HP.' },
  { n: 3, naam: 'Duurdere diepte',  tekst: 'Elke kamer kost 1 extra licht.' },
  { n: 4, naam: 'Schrale buit',     tekst: 'Gevechten geven 25% minder goud.' },
  { n: 5, naam: 'Belast begin',     tekst: 'Je start met de vloek "Pijn" in je dek.' },
  { n: 6, naam: 'Het ware donker',  tekst: 'Je start met 6 minder max-HP.' },
];
function asc() { return (S && S.ascensie) || 0; }
function ontgrendeldNiveau(heldId) { return Math.min(ASCENSIE_MAX, (Codex.ascensie && Codex.ascensie[heldId]) || 0); }
function maxOntgrendeld() { return Math.min(ASCENSIE_MAX, Math.max(0, ...Object.values(Codex.ascensie || {}), 0)); }
/* past de startstaat-modifiers toe; S.ascensie moet al gezet zijn, S.dek gevuld */
function pasAscensieToe() {
  const a = asc();
  if (a >= 1) S.fakkel = Math.max(1, S.fakkel - 10);
  if (a >= 5) S.dek.push(nieuweKaart('pijn'));
  if (a >= 6) { S.maxHp = Math.max(1, S.maxHp - 6); S.hp = Math.max(1, S.hp - 6); }
}

/* ---------- daily-helpers: datum, dag-seed, held van de dag, score ---------- */
function datumSleutel(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function vandaagSleutel() { return datumSleutel(new Date()); }
function vorigeDag(sleutel) {
  const [y, m, d] = sleutel.split('-').map(Number);
  const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() - 1);
  return datumSleutel(dt);
}
function dagSeed() { return 'DAILY-' + vandaagSleutel().replace(/-/g, ''); }
/* held van de dag: deterministisch uit de datum → voor iedereen dezelfde */
function heldVanDag() {
  const ids = Object.keys(SPELERS);
  return ids[zaadVanTekst(vandaagSleutel()) % ids.length];
}
/* vandaag al voltooid OF al begonnen (een afgebroken poging blokkeert een verse
   herstart met dezelfde seed → geen score-farmen; hervatten kan via Doorgaan). */
function dailyAlGespeeld() {
  const v = vandaagSleutel();
  return Daily.laatsteVoltooid === v || Daily.laatsteStart === v;
}
/* transparante scoreformule (op het eindescherm uitgesplitst) */
function dagscore(gewonnen) {
  const diepte = (S.verdieping || 0) * 10;
  const winst = gewonnen ? 150 : 0;
  const relikwieen = (S.relikwieen || []).length * 8;
  const goud = Math.floor((S.goud || 0) / 5);
  return { diepte, winst, relikwieen, goud, totaal: diepte + winst + relikwieen + goud };
}
function registreerDaily(gewonnen) {
  const dag = vandaagSleutel();   /* anker op de echte kalenderdag (niet de opgeslagen startdag) */
  /* al gescoord vandaag? dan niet opnieuw (beschermt tegen hervat-en-herscoren) */
  if (Daily.laatsteVoltooid === dag) {
    return { totaal: Daily.laatsteScore, reeks: Daily.reeks, besteReeks: Daily.besteReeks, nieuweTop: false };
  }
  const totaal = dagscore(gewonnen).totaal;
  const nieuweTop = totaal > (Daily.besteScore || 0);
  if (Daily.laatsteVoltooid !== dag) {
    Daily.reeks = (Daily.laatsteVoltooid === vorigeDag(dag)) ? (Daily.reeks || 0) + 1 : 1;
    Daily.besteReeks = Math.max(Daily.besteReeks || 0, Daily.reeks);
    Daily.laatsteVoltooid = dag;
  }
  Daily.laatsteScore = totaal;
  Daily.besteScore = Math.max(Daily.besteScore || 0, totaal);
  Daily.gesch = Array.isArray(Daily.gesch) ? Daily.gesch : [];
  Daily.gesch.unshift({ dag, score: totaal, gewonnen: !!gewonnen, diepte: S.verdieping || 0 });
  Daily.gesch = Daily.gesch.slice(0, 10);
  bewaarDaily();
  return { totaal, reeks: Daily.reeks, besteReeks: Daily.besteReeks, nieuweTop };
}
function pasInstToe() {
  document.body.classList.toggle('lite', INST.lite);
  document.body.classList.toggle('daglicht', !!INST.daglicht);
}

/* ---------- de Tikker: rAF-klok met achtergrond-fallback ----------
   Zichtbaar: 60 fps via requestAnimationFrame. Verborgen tab: een trage
   interval-tik zodat lopende beurten netjes afronden (rendering stopt vanzelf). */
const Tikker = (() => {
  const subs = new Set();
  let laatst = performance.now(), tijd = 0;
  function stap(nu, cap) {
    const dt = Math.min(cap, (nu - laatst) / 1000);
    laatst = nu;
    if (dt > 0) {
      tijd += dt;
      subs.forEach(f => { try { f(dt, tijd); } catch (e) { console.error(e); } });
    }
  }
  function lus(ts) {
    if (!document.hidden) stap(ts, 0.05);
    requestAnimationFrame(lus);
  }
  requestAnimationFrame(lus);
  setInterval(() => { if (document.hidden) stap(performance.now(), 0.4); }, 120);
  return {
    abonneer(f) { subs.add(f); return () => subs.delete(f); },
    get tijd() { return tijd; }
  };
})();

function slaap(ms) {
  return new Promise(r => {
    const eind = Tikker.tijd + ms / 1000;
    const af = Tikker.abonneer(() => { if (Tikker.tijd >= eind) { af(); r(); } });
  });
}

/* ---------- globale staat ---------- */
let S = null;

function nieuwSpel(heldId, seedTekst, ascensie, daily) {
  _tbBezitSig = null;   /* nieuwe run → topbalk-bezit zeker opnieuw opbouwen */
  if (!SPELERS[heldId]) heldId = 'slachter';
  const held = SPELERS[heldId];
  /* whitelist: alleen A-Z 0-9 en '-'. Voorkomt dat een getypte seed HTML/JS
     injecteert wanneer de seed later in innerHTML belandt (eindescherm). */
  const seed = (seedTekst && String(seedTekst).trim())
    ? (String(seedTekst).trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20) || maakSeedTekst())
    : maakSeedTekst();
  Toeval.zetZaad(zaadVanTekst(seed));
  S = {
    held: heldId,
    seed,
    daily: !!daily,        /* meteen gezet (niet post-hoc in startDaily) zodat de scherf-loadout-gate hieronder betrouwbaar is */
    fakkel: 80,
    hp: held.hp, maxHp: held.hp, goud: 99,
    dek: [],
    relikwieen: [held.relikwie],
    dranken: [],
    kaart: genereerKaart(),
    pos: null,
    act: 1,
    verdieping: 0,
    gebruikteEvents: [],
    stats: { gevechten: 0, kaarten: 0, schade: 0 },
    uid: 0,
    gevecht: null,
    dropsOntwaakt: false,  /* het Metgezel-Mysterie: dark-twist reveal-guard, eenmalig per run */
    contractGebruikt: false,   /* Het Verlopen Contract: eenmalig-per-run dood-weigering */
    scherven: []           /* GEDRAGEN scherven deze run (inzet — kwijt bij dood; geplaatst bij de Drempel) */
  };
  held.dek.forEach(id => S.dek.push(nieuweKaart(id)));

  /* het Schrijn: gekozen relikwieën gaan mee en verbruiken hun lading */
  const meegenomen = schrijnKeuzes.filter(r => Codex.opgeladen.includes(r));
  if (meegenomen.length) {
    Codex.opgeladen = Codex.opgeladen.filter(r => !meegenomen.includes(r));
    bewaarCodex();
    meegenomen.forEach(r => geefRelikwie(r, true));
    melding(`🗝️ Uit het Schrijn: ${meegenomen.map(r => RELIKWIEEN[r].naam).join(' · ')}`);
  }
  /* scherf-loadout: gekozen scherven uit de stash MEENEMEN (komen nu op het spel — kwijt bij dood,
     te plaatsen bij de Drempel). Niet op een daily (eerlijk veld, zoals het Schrijn). */
  if (!S.daily && scherfKeuzes.length) {
    laadScherfLoadout(scherfKeuzes.filter(sid => scherfStash().includes(sid)));
    if (gedragen().length) melding(`🜂 Je neemt ${gedragen().length} scherf${gedragen().length === 1 ? '' : 'ven'} mee de diepte in.`);
  }
  scherfKeuzes = [];
  /* ascension: klem op wat déze held ontgrendeld heeft, dan de modifiers toepassen */
  S.ascensie = Math.max(0, Math.min(ascensie || 0, ontgrendeldNiveau(heldId)));
  pasAscensieToe();
  if (S.ascensie > 0) melding(`🔥 Ascensie ${S.ascensie} — de diepte is genadelozer.`);
  schrijnKeuzes = [];
}

function huidigeHeld() { return SPELERS[(S && S.held) || 'slachter'] || SPELERS.slachter; }

function nieuweKaart(id) {
  if (!S) S = { uid: 0 };
  return { id, up: false, uid: ++S.uid };
}

/* ---------- kaart(spel)hulpjes ---------- */
const kdef = c => KAARTEN[c.id];
function kval(c, veld) {
  const d = kdef(c);
  return (c.up && d.up && d.up[veld] !== undefined) ? d.up[veld] : d[veld];
}
const knaam = c => kdef(c).naam + (c.up ? '+' : '');
function kkost(c) {
  const k = kval(c, 'kost');
  if (k === null) return null;
  const def = KAARTEN[c.id];
  let kost = k;
  /* Levend Vuur: licht- en vuurkaarten branden goedkoper */
  if ((def.licht || def.vuur) && heeftRelikwie('levend_vuur')) kost = Math.max(0, kost - 1);
  /* Aangetast (door de Erfprins gecorrumpeerd): loodzwaar — +1 Energie */
  if (c.aangetast) kost += 1;
  return kost;
}
/* VONK-ENTING (het Vonkaltaar): per-kaart fakkelkracht. c.vonk > 0 = Heldering
   (+licht bij spelen), c.vonk < 0 = Verduistering (verbrandt licht + geeft Blok).
   Magnitude per |niveau|. Defensief geklemd tegen een getamperde save. */
const VONK_BEDRAG = { 1: 5, 2: 9 };
const vonkBedrag = c => (c && c.vonk) ? (VONK_BEDRAG[Math.min(2, Math.abs(c.vonk))] || 0) : 0;

function inGevecht() { return S && S.gevecht && !S.gevecht.voorbij; }
function sp() { return S.gevecht.speler; }
function alleVijanden() { return S.gevecht ? S.gevecht.vijanden.filter(v => !v.dood) : []; }
/* de metgezel-actor in het huidige gevecht (of null), en run-niveau-checks */
function gMet() { return S.gevecht ? S.gevecht.metgezel : null; }
function metgezelDef() { return (S && S.metgezel && METGEZELLEN[S.metgezel.id]) || null; }
function heeftMetgezel() { return !!(S && S.metgezel && !S.metgezel.vluchtig && METGEZELLEN[S.metgezel.id]); }

/* schade-preview voor kaartteksten (incl. Kracht, Zwak, relikwie).
   LET OP: Kracht/Zwak/Stalen Vuist beïnvloeden ALLEEN echte aanvalsschade ('dmg').
   Voor blok/gif/kracht-gain/doornen/zwak/heel/licht (de overige velden) is dat
   onjuist en toonde de kaarttekst opgeblazen of te lage getallen — geef daar de
   rauwe waarde. De licht-schadekaarten gebruiken óók 'dmg', dus geen regressie. */
function pv(c, veld) {
  const basis = kval(c, veld);
  if (veld !== 'dmg' || !inGevecht()) return `${basis}`;
  let d = basis + (sp().status.kracht || 0) + relikwieSchadeBonus();
  if ((sp().status.zwak || 0) > 0) d = Math.floor(d * 0.75);
  if (d > basis) return `<b class="plus">${d}</b>`;
  if (d < basis) return `<b class="min">${d}</b>`;
  return `${d}`;
}

/* null-veilig: wordt ook vóór een run aangeroepen (startdek bekijken) */
function heeftRelikwie(id) { return !!(S && S.relikwieen && S.relikwieen.includes(id)); }
function relikwieSchadeBonus() { return heeftRelikwie('stalen_vuist') ? 1 : 0; }
function drankSlots() { return heeftRelikwie('veldfles') ? 3 : 2; }

function geefRelikwie(id, vanSchrijn) {
  if (!S.relikwieen.includes(id)) S.relikwieen.push(id);
  if (id === 'spaarvarken') S.goud += 100;
  if (id === 'bloedrobijn') { S.maxHp += 8; S.hp += 8; }
  if (id === 'het_grootboek') { S.maxHp += 12; S.hp += 12; }   /* Act 2: Het Grootboek */
  /* echt gevonden (niet uit het Schrijn meegenomen) = lading herladen */
  if (!vanSchrijn) laadSchrijnOp(id);
  renderTopbalk();
}
/* gewogen op schaarste; geef een eigen weging mee voor rijkere bronnen (elites) */
const SCHAARSTE_LABEL = { start: 'Heldenrelikwie', gewoon: 'Gewoon', ongewoon: 'Ongewoon', zeldzaam: 'Zeldzaam', episch: 'Episch' };
function willekeurigRelikwie(weging) {
  const w = weging || { gewoon: 50, ongewoon: 32, zeldzaam: 14, episch: 4 };
  const beschikbaar = Object.keys(RELIKWIEEN).filter(r => !RELIKWIEEN[r].start && !heeftRelikwie(r));
  if (!beschikbaar.length) return null;
  const lagen = Object.keys(w).filter(t => beschikbaar.some(r => RELIKWIEEN[r].zeld === t));
  if (!lagen.length) return kiesUit(beschikbaar);
  const totaal = lagen.reduce((s, t) => s + w[t], 0);
  let r = willekeurig() * totaal;
  let laag = lagen[lagen.length - 1];
  for (const t of lagen) { if ((r -= w[t]) <= 0) { laag = t; break; } }
  return kiesUit(beschikbaar.filter(x => RELIKWIEEN[x].zeld === laag));
}

/* ---------- 3D-strijdtoneel ---------- */
/* file://: WebGL mag lokale PNG's niet als texture laden (cross-origin-regel),
   dus daar draait het spel in de volwaardige 2D-modus */
function d3Gewenst() {
  if (location.protocol === 'file:') return false;
  if (window.mobiel) return false;   /* 3D is op een telefoon onspeelbaar — altijd 2D */
  return INST.d3 && window.Vista && Vista.beschikbaar();
}
function d3Actief() { return $('#scherm-gevecht').classList.contains('d3-actief'); }

/* ---------- meldingen & effecten ---------- */
function melding(tekst) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = tekst;
  $('#meldingen').appendChild(el);
  setTimeout(() => el.classList.add('weg'), 2100);
  setTimeout(() => el.remove(), 2600);
}

function fxNummer(doelEl, tekst, klasse) {
  if (!doelEl) return;
  const r = doelEl.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'fx-nummer ' + klasse;
  el.textContent = tekst;
  /* presentatie: bewust Math.random, niet de seeded generator */
  el.style.left = (r.left + r.width / 2 + (Math.random() * 36 - 18)) + 'px';
  el.style.top = (r.top + r.height / 3) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

function schudScherm() {
  const el = $('#scherm-gevecht');
  el.classList.remove('beef'); void el.offsetWidth; el.classList.add('beef');
}

function actorEl(actor) {
  if (!S.gevecht) return null;
  if (actor.isSpeler) return $('#speler-zone');
  if (actor.isMetgezel) return GDOM.metgezel ? GDOM.metgezel.wrap : null;
  const i = S.gevecht.vijanden.indexOf(actor);
  return GDOM.vijanden[i] ? GDOM.vijanden[i].wrap : null;
}

/* ============================================================
   DE FAKKEL — licht als zicht en valuta
   ============================================================ */
const FAKKEL_KOST = { gevecht: 5, elite: 7, event: 4, schat: 5, winkel: 3, rust: 3, baas: 0, episch: 6 };
const LICHT_FACTOR = { helder: 1, schemer: 0.62, duister: 0.34, gedoofd: 0.16 };

function lichtNiveau() {
  if (!S || S.fakkel === undefined) return 'helder';
  if (S.fakkel >= 60) return 'helder';
  if (S.fakkel >= 30) return 'schemer';
  if (S.fakkel >= 1) return 'duister';
  return 'gedoofd';
}

function fakkelKost(type, rij) {
  let kost = FAKKEL_KOST[type] || 0;
  /* hoe dieper, hoe donkerder: de diepte vreet aan je fakkel */
  if (kost > 0 && rij !== undefined) {
    if (rij >= 10) kost += 2;
    else if (rij >= 7) kost += 1;
  }
  if (kost > 0 && asc() >= 3) kost += 1;   /* ascension 3: duurdere diepte */
  if (kost > 0 && heeftRelikwie('gloeiende_lantaarn')) kost = Math.max(0, kost - 1);
  /* de Tak van de Duivelboom eist zijn deel van het licht */
  if (kost > 0 && heeftRelikwie('duivelboomtak')) kost += 1;
  return kost;
}

function zetFakkel(delta) {
  const voor = lichtNiveau();
  /* Vonkenkluis: elke lichtwinst klettert er dubbel uit */
  if (delta > 0 && heeftRelikwie('vonkenkluis')) delta += 1;
  S.fakkel = Math.max(0, Math.min(100, S.fakkel + delta));
  /* de Eeuwige Lont weigert te doven */
  if (delta < 0 && S.fakkel < 10 && heeftRelikwie('eeuwige_lont')) S.fakkel = 10;
  /* De Laatste Lucifer: één keer per run vlamt het donker weer op */
  if (S.fakkel === 0 && delta < 0 && heeftRelikwie('laatste_lucifer') && !S.luciferOp) {
    S.luciferOp = true;
    S.fakkel = 50;
    melding('🎇 De Laatste Lucifer vlamt op!');
  }
  const na = lichtNiveau();
  if (voor !== na) {
    const teksten = {
      schemer: 'Je fakkel flakkert... het wordt schemerig.',
      duister: 'Het duister dringt op — je leest je vijanden amper nog.',
      gedoofd: 'Je fakkel is gedoofd! Je klimt blind verder.',
      helder: 'Je fakkel brandt weer helder.'
    };
    melding(teksten[na]);
    Klank.sfx(delta < 0 ? 'debuff' : 'buff');
    if (na === 'duister' && delta < 0 && inGevecht()) {
      setTimeout(() => spreek(sp(), UITSPRAKEN._held.duister, 0.6), 500);
    }
    if (inGevecht()) renderGevecht(); /* intent-weergave kan veranderen */
  }
  /* (checkDropsOntwaak — de oude doof-unlock voor Drops — vervangen door het Drempel-ritueel) */
  if (typeof checkDropsWitWeigering === 'function') checkDropsWitWeigering(voor, delta);   /* Poort A (grief-arc): weiger je juist te doven? */
  if (delta < 0 && inGevecht() && typeof toonRouwPoot === 'function') toonRouwPoot();        /* grief: pootafdruk in de as bij elke doof-keuze */
  zetLichtVisueel();
  renderTopbalk();
}

function verbrandLicht(n) {
  if (n <= 0) return;
  /* Fakkeljongleur: de eerste verbrand-kaart per beurt kost niets */
  const g = S.gevecht;
  if (g && !g.voorbij && heeftRelikwie('fakkeljongleur') && !g.jongleurOp) {
    g.jongleurOp = true;
    fxNummer($('#speler-zone') || $('#topbalk'), '🤹 0', 'fx-buff');
    return;
  }
  /* Smeulbuidel: de kolen vangen een deel van de brand op */
  if (heeftRelikwie('smeulbuidel')) n = Math.max(1, n - 1);
  fxNummer($('#speler-zone') || $('#topbalk'), '🔥-' + n, 'fx-debuff');
  zetFakkel(-n);
  /* Zwarte Kaars: verbrand licht wordt bescherming */
  if (inGevecht() && heeftRelikwie('zwarte_kaars')) geefBlok(sp(), n);
  /* Vuurvreter: de vlam spuwt de pijn door naar alle vijanden */
  if (inGevecht() && heeftRelikwie('vuurvreter')) alleVijanden().forEach(v => verliesHp(v, 2));
}

/* VONK-ENTING: een via het Vonkaltaar gebrandmerkte kaart raakt de fakkel bij elke
   beurt dat ze gespeeld wordt. Heldering schenkt licht (heldere builds); Verduistering
   verbrandt licht (triggert dark-relikwieen + jaagt naar gedoofd) maar hardt je met Blok. */
function pasVonkToe(c) {
  if (!c || !c.vonk || !inGevecht()) return;
  const n = vonkBedrag(c);
  if (!n) return;
  if (c.vonk > 0) {
    zetFakkel(n);                                          /* Heldering: +fakkellicht */
    fxNummer($('#speler-zone') || $('#topbalk'), '🔥+' + n, 'fx-buff');
  } else {
    verbrandLicht(n);                                     /* Verduistering: verbrand licht (incl. dark-relic-haken) */
    geefBlok(sp(), n);                                    /* ...maar het donker hardt je */
  }
}

/* ---------- fluistertekst: stemmen uit de diepte ----------
   Bewust met Math.random (presentationeel): tekstkeuze mag de
   seeded spelstroom nooit beïnvloeden — zo blijven dailies eerlijk. */
let laatsteSpraak = 0;
function spreek(actor, pool, kans) {
  if (INST.spraak === false || !pool) return;
  if (kans !== undefined && Math.random() > kans) return;
  const nu = performance.now();
  if (nu - laatsteSpraak < 2800) return; /* nooit twee tegelijk */
  const el = actorEl(actor);
  if (!el) return;
  laatsteSpraak = nu;
  const s = document.createElement('div');
  s.className = 'spraak' + (actor.isSpeler ? ' spraak-held' : '');
  s.textContent = Array.isArray(pool) ? pool[Math.floor(Math.random() * pool.length)] : pool;
  el.appendChild(s);
  setTimeout(() => s.remove(), 3600);
}

/* de koninklijke uitroep: groot, gecentreerd, alleen voor de baas */
function baasSpreekt(tekst) {
  if (INST.spraak === false || !tekst) return;
  const el = document.createElement('div');
  el.className = 'baas-spraak';
  el.innerHTML = `<span>${tekst}</span>`;
  $('#scherm-gevecht').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}
/* het juiste baas-script (per baas een eigen stem) */
function baasUitspraken(id) { return (id === 'de_erfprins') ? UITSPRAKEN._erfprins : UITSPRAKEN._baas; }

function zetLichtVisueel() {
  const niveau = lichtNiveau();
  const f = LICHT_FACTOR[niveau];
  if (window.Vista && Vista.zetLicht) Vista.zetLicht(f);
  const bg = $('#gevecht-achtergrond');
  if (bg) {
    let bgB = 0.45 + 0.55 * f;
    if (INST.daglicht) bgB = Math.min(1.35, bgB + 0.45);   /* daglicht: de gevechtsplaat flink lichter */
    bg.style.filter = `brightness(${bgB.toFixed(2)})`;
  }
  const vignet = $('#licht-vignet');
  if (vignet) {
    /* glijdend met de fakkelstand mee: elk verloren punt licht schuift
       het donker een tikje verder naar binnen (niet in trappen) */
    const fk = (S && S.fakkel !== undefined) ? S.fakkel : 100;
    let sterkte;
    if (fk >= 60) sterkte = 0.2 * (100 - fk) / 40;
    else if (fk >= 30) sterkte = 0.26 + 0.24 * (60 - fk) / 30;
    else if (fk >= 1) sterkte = 0.56 + 0.24 * (30 - fk) / 29;
    else sterkte = 0.92;
    if (INST.daglicht) sterkte *= 0.22;                 /* daglicht: het duister-vignet véél zachter */
    vignet.style.opacity = sterkte.toFixed(2);
    vignet.classList.toggle('flikker', fk < 30);
  }
  if (window.Klank && Klank.zetDuister) Klank.zetDuister(niveau === 'duister' || niveau === 'gedoofd');
}

/* het signatuurmoment: eigen pose + schermflits + kreet (de epische heldkaarten) */
function signatuurMoment(poseNaam, kleur, kreet) {
  const g = S.gevecht;
  if (!g) return;
  if (window.Vista && Vista.pose) Vista.pose(g.speler, poseNaam, 2.4);
  pose2D(g.speler, poseNaam, 2.4);
  heldFx('hfx-cast', 1400); /* 2D-terugval: gloed op de spelerzone */
  const flits = document.createElement('div');
  flits.className = 'signatuur-flits sf-' + kleur;
  $('#scherm-gevecht').appendChild(flits);
  setTimeout(() => flits.remove(), 1100);
  if (typeof schudScherm === 'function') schudScherm();
  if (INST.spraak !== false && kreet) {
    const el = document.createElement('div');
    el.className = 'held-kreet';
    el.style.setProperty('--hk', huidigeHeld().kleur);
    el.innerHTML = `<span>${kreet}</span>`;
    $('#scherm-gevecht').appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }
}

/* tijdelijke FX-klasse op de spelerzone (schild, cast, victory) */
const heldFxTimers = {};
function heldFx(klasse, duur) {
  const zone = $('#speler-zone');
  if (!zone) return;
  zone.classList.add(klasse);
  clearTimeout(heldFxTimers[klasse]);
  heldFxTimers[klasse] = setTimeout(() => zone.classList.remove(klasse), duur);
}

/* ---------- 2D-poses (mobiel/2D) ----------
   In 3D wisselt Vista de billboard-textuur naar de toestand-pose. In 2D deden
   we dat niet → figuren stonden roerloos. pose2D verwisselt het DOM-plaatje
   tijdelijk naar <art>_<state> (attack/cast/hit/block/death/victory) en zet het
   daarna terug. Bestaat de pose-art niet (veel gewone vijanden), dan gebeurt er
   niets met het beeld — de beweging (lunge/schud) speelt sowieso. */
function pose2DArtEl(actor) {
  if (!actor) return null;
  if (actor.isSpeler) return $('#speler-figuur');
  if (actor.isMetgezel) return GDOM.metgezel ? GDOM.metgezel.wrap.querySelector('.metgezel-art') : null;
  const i = S.gevecht ? S.gevecht.vijanden.indexOf(actor) : -1;
  return (i >= 0 && GDOM.vijanden[i]) ? GDOM.vijanden[i].wrap.querySelector('.vijand-art') : null;
}
const pose2DTimers = new WeakMap();
function pose2D(actor, state, duur) {
  if (!actor || d3Actief() || !window.laadKarakterAfbeelding) return;
  const el = pose2DArtEl(actor); if (!el) return;
  const basis = actor.isSpeler ? huidigeHeld().art
    : (actor.isMetgezel ? METGEZELLEN[actor.id].art : actor.id);
  const lader = actor.isMetgezel && window.laadMetgezelAfbeelding ? laadMetgezelAfbeelding : laadKarakterAfbeelding;
  lader(basis + '_' + state, img => {
    const im = el.querySelector('img');
    if (!img || !im) return;             /* geen pose-art voor dit figuur */
    im.src = img.src;
    clearTimeout(pose2DTimers.get(actor));
    /* de blok-pose is een VASTGEHOUDEN verdedigende houding: geen auto-revert.
       Ze blijft staan tot een volgende pose (aanval/cast/treffer) haar vervangt —
       een volledig geblokte klap laat de stand dus mooi staan. */
    if (state === 'block') return;
    pose2DTimers.set(actor, setTimeout(() => {
      if (actor.dood) return;            /* dood blijft op de death-pose */
      lader(basis, terug => {
        const i2 = el.querySelector('img');
        if (i2 && terug) i2.src = terug.src;
      });
    }, (duur || 0.8) * 1000));
  });
}

/* ---------- statussen, schade, blok ---------- */
function geefStatus(actor, naam, n) {
  actor.status[naam] = (actor.status[naam] || 0) + n;
  const info = STATUSINFO[naam];
  if (info) {
    fxNummer(actorEl(actor), `${info.icoon} ${n > 0 ? '+' + n : n} ${info.naam}`, info.goed ? 'fx-buff' : 'fx-debuff');
    Klank.sfx(info.goed ? 'buff' : 'debuff');
  }
}

function geefGif(actor, n) {
  if (!actor.isSpeler) {
    const gd = VIJANDEN[actor.id] || {};
    const lantaarn = heeftRelikwie('zielslantaarn');   /* De Zielslantaarn breekt alle gif-afweer */
    /* GIF-IMMUUN (sporen/inkt) — tenzij de Zielslantaarn de afweer breekt */
    if (!lantaarn && gd.gifImmuun) {
      fxNummer(actorEl(actor), '🚫 gif-immuun', 'fx-blok');
      pose2D(actor, 'gif', 0.8);   /* immuun-reactie-pose: de sporen/inkt verteren het gif */
      zwarteZielHint(actor);       /* per-wezen hint (GIFHINTS), 1× per gevecht */
      return;
    }
    n += (heeftRelikwie('smaragden_ring') ? 1 : 0);   /* inktpot is nu een gif-verspreider (begin v/d beurt), geen +1 meer */
    /* GIF-KAATS (Copycat 'Plagiaat: Gif') / Zwarte-Ziel-COUNTER: kopieert een deel terug op JOU */
    const frac = lantaarn ? 0 : (gd.gifkaats || (gd.zwarteZiel === 'counter' ? 0.5 : 0));
    if (frac && inGevecht() && n > 0) {
      const terug = Math.max(1, Math.ceil(n * frac));
      geefStatus(sp(), 'gif', terug);
      fxNummer($('#speler-zone') || $('#topbalk'), '🪞 Plagiaat: Gif +' + terug, 'fx-debuff');
      pose2D(actor, 'plagiaat', 0.7);   /* reflecterende vijand toont z'n kaats-pose (Erfprins: plagiaat-art) */
      zwarteZielHint(actor);            /* per-wezen counter-hint, 1× per gevecht */
    }
  }
  geefStatus(actor, 'gif', n);
  Klank.sfx('gif');
}

/* per-wezen gif-reactie-hint: verschijnt 1× per gevecht in de log (GIFHINTS in data.js),
   zodat de speler ziet dát/hóé een Zwarte Ziel je gif vermindert/absorbeert/countert. */
function zwarteZielHint(actor) {
  if (!actor || actor._gifHintGemeld) return;
  const h = (typeof GIFHINTS !== 'undefined' ? GIFHINTS : {})[actor.id];
  if (h) { melding(h); actor._gifHintGemeld = true; }
}

/* LICHT-VLOEK toekennen (verwerving via de Archief-events): willekeurig uit de drie,
   pusht 'm naar het dek en geeft de naam terug voor de event-tekst. */
function geefLichtVloek() {
  const id = kiesUit(['schaduwsmet', 'mottenvlam', 'doofpot']);
  S.dek.push(nieuweKaart(id));
  return KAARTEN[id].naam;
}

/* GENERIEKE VLOEK (incl. Pijn + de licht-vloeken) — voor vloek-bronnen door het hele
   spel verweven (Act 1+). Alle vloeken zijn weg te slopen bij de Oude Smid. */
function geefVloek() {
  const id = kiesUit(['pijn', 'schaduwsmet', 'mottenvlam', 'doofpot']);
  S.dek.push(nieuweKaart(id));
  return KAARTEN[id].naam;
}

/* VLOEK-REVEAL: toon een nieuw verworven vloek dramatisch als grote kaart (card-flip, à la
   de Erfprins-intro) zodat het écht binnenkomt i.p.v. enkel een vluchtige melding. Modaal,
   wegklikbaar + auto-dismiss; toont de kaart-art via de gewone focus-kaart-render. */
function toonVloekReveal(kaartId, flavor) {
  const c = (typeof nieuweKaart === 'function') ? nieuweKaart(kaartId) : { id: kaartId, uid: 'vloekreveal' };
  document.querySelectorAll('.vloek-reveal-overlay').forEach(n => n.remove());
  const ov = document.createElement('div');
  ov.className = 'vloek-reveal-overlay';
  ov.innerHTML = `
    <div class="vloek-reveal-binnen">
      <div class="vloek-reveal-kop">🌑 EEN VLOEK NESTELT ZICH IN JE DEK</div>
      <div class="vloek-reveal-kaartwrap">
        <div class="kaart-focus-houder"><div class="focus-rij">
          ${kaartHtml(c, false).replace('kaart groot', 'kaart groot kaart-focus zeldglans-vloek')}
        </div></div>
      </div>
      ${flavor ? `<div class="vloek-reveal-flavor">${flavor}</div>` : ''}
      <button class="knop-stil vloek-reveal-sluit">Verder ↓</button>
    </div>`;
  document.body.appendChild(ov);
  if (typeof verfraaiKaartIconen === 'function') verfraaiKaartIconen(ov);
  Klank.sfx('debuff'); setTimeout(() => Klank.sfx('dood'), 280); schudScherm();
  const sluit = () => { if (!ov.isConnected) return; clearTimeout(ov._timer); ov.classList.add('weg'); setTimeout(() => ov.remove(), 360); };
  ov.querySelector('.vloek-reveal-sluit').onclick = sluit;
  ov.addEventListener('click', e => { if (e.target === ov) sluit(); });
  ov._timer = setTimeout(sluit, 6500);
  return ov;
}

/* KAART-REVEAL (boon): een VERKREGEN kaart (offer/altaar/event) komt groot en met GEWICHT in beeld —
   slam-in + schittering + rariteits-gloed, à la de vloek-reveal maar feestelijk i.p.v. duister. */
function toonKaartReveal(kaartId, opts) {
  opts = opts || {};
  const c = (typeof nieuweKaart === 'function') ? nieuweKaart(kaartId) : { id: kaartId, uid: 'kreveal' };
  const zeld = (kdef(c) && kdef(c).zeld) || 'gewoon';
  document.querySelectorAll('.kaart-reveal-overlay, .vloek-reveal-overlay').forEach(n => n.remove());
  const ov = document.createElement('div');
  ov.className = 'kaart-reveal-overlay zeld-' + zeld;
  ov.innerHTML = `
    <div class="kaart-reveal-binnen">
      <div class="kaart-reveal-kop">${opts.kop || '✨ EEN KAART KOMT TOT JE'}</div>
      <div class="kaart-reveal-kaartwrap">
        <div class="kreveal-straal"></div>
        <div class="kaart-focus-houder"><div class="focus-rij">
          ${kaartHtml(c, false).replace('kaart groot', 'kaart groot kaart-focus zeldglans-' + zeld)}
        </div></div>
      </div>
      ${opts.flavor ? `<div class="kaart-reveal-flavor">${opts.flavor}</div>` : ''}
      <button class="knop-stil kaart-reveal-sluit">Verder ↓</button>
    </div>`;
  document.body.appendChild(ov);
  if (typeof verfraaiKaartIconen === 'function') verfraaiKaartIconen(ov);
  Klank.sfx(opts.klank || 'schitter'); setTimeout(() => Klank.sfx('schitter'), 220); schudScherm();
  const sluit = () => { if (!ov.isConnected) return; clearTimeout(ov._timer); ov.classList.add('weg'); setTimeout(() => ov.remove(), 360); };
  ov.querySelector('.kaart-reveal-sluit').onclick = sluit;
  ov.addEventListener('click', e => { if (e.target === ov) sluit(); });
  ov._timer = setTimeout(sluit, 6500);
  return ov;
}

/* SCHERF-REVEAL: een gevonden scherf-fragment komt groot en mysterieus in beeld (i.p.v. een vluchtige
   melding) — de fragment-art slamt in met een violette gloed + de cryptische codextekst eronder. */
function toonScherfReveal(sid, opts) {
  opts = opts || {};
  const d = (typeof scherfDef === 'function') ? scherfDef(sid) : null;
  document.querySelectorAll('.scherf-reveal-overlay').forEach(n => n.remove());
  const ov = document.createElement('div');
  ov.className = 'scherf-reveal-overlay';
  ov.innerHTML = `
    <div class="scherf-reveal-binnen">
      <div class="scherf-reveal-kop">${opts.kop || '🜂 EEN SCHERF KIEST JOU'}</div>
      <div class="scherf-reveal-art" data-shart="${sid}">${d ? bronIcoon(d.bron) : '🜂'}</div>
      <div class="scherf-reveal-flavor"><i>${(d && d.codexTekst) || 'Een fragment van iets groters…'}</i></div>
      <div class="scherf-reveal-sub">Je draagt nu een scherf — neem 'm mee naar de Drempel.</div>
      <button class="knop-stil scherf-reveal-sluit">Verder ↓</button>
    </div>`;
  document.body.appendChild(ov);
  if (window.laadScherfAfbeelding) {
    ov.querySelectorAll('[data-shart]').forEach(el => laadScherfAfbeelding(el.dataset.shart, img => {
      if (img && !el.querySelector('img')) el.innerHTML = `<img src="${img.src}" alt="">`;
    }));
  }
  Klank.sfx('schitter'); setTimeout(() => Klank.sfx('klik'), 260); schudScherm();
  const sluit = () => { if (!ov.isConnected) return; clearTimeout(ov._timer); ov.classList.add('weg'); setTimeout(() => ov.remove(), 360); };
  ov.querySelector('.scherf-reveal-sluit').onclick = sluit;
  ov.addEventListener('click', e => { if (e.target === ov) sluit(); });
  ov._timer = setTimeout(sluit, 7000);
  return ov;
}

function geefBlok(actor, n) {
  actor.blok = (actor.blok || 0) + n;
  fxNummer(actorEl(actor), `+${n} Blok`, 'fx-blok');
  if (actor.isSpeler) {
    Klank.sfx('blok');
    if (window.Vista) Vista.pose(actor, 'block', 1.3);
    pose2D(actor, 'block', 1.3);
    heldFx('hfx-blok', 1100);
  }
}

/* speler valt vijand aan */
function aanvalOp(doel, basis) {
  if (!doel || doel.dood) return;
  if (window.Vista) Vista.aanval(sp(), doel);
  pose2D(sp(), 'attack', 0.5);
  const fig = $('#speler-figuur');
  if (fig && !d3Actief()) {
    fig.classList.remove('valt-aan'); void fig.offsetWidth; fig.classList.add('valt-aan');
  }
  let dmg = basis + (sp().status.kracht || 0) + relikwieSchadeBonus();
  /* Wetsteen: de eerste snede van elk gevecht is de scherpste */
  if (heeftRelikwie('wetsteen') && !S.gevecht.wetsteenGebruikt) {
    dmg += 4;
    S.gevecht.wetsteenGebruikt = true;
  }
  if ((sp().status.zwak || 0) > 0) dmg = Math.floor(dmg * 0.75);
  if ((doel.status.kwetsbaar || 0) > 0) dmg = Math.floor(dmg * 1.5);
  if (S.gevecht) S.gevecht.laatsteSpelerDmg = dmg;   /* Het Origineel kaatst dit terug */
  const echt = doeSchade(doel, Math.max(0, dmg), sp());
  S.stats.schade += echt;
  if (echt >= 18) spreek(sp(), UITSPRAKEN._held.overkill, 0.5);
  /* Etterende Wonden: aanvallen vergiftigen het doelwit */
  if (!doel.dood && (sp().status.etterende || 0) > 0) geefGif(doel, sp().status.etterende);
}

/* meerdere klappen op één doelwit — zichtbaar als reeks */
async function reeksAanval(doel, dmg, keren) {
  for (let i = 0; i < keren; i++) {
    if (!inGevecht() || doel.dood) return;
    aanvalOp(doel, dmg);
    renderGevecht();
    if (i < keren - 1) await slaap(200);
  }
}

/* klap op alle vijanden — golft van links naar rechts */
async function reeksAanvalAlle(dmg, naSlag) {
  const doelen = alleVijanden();
  for (let i = 0; i < doelen.length; i++) {
    const v = doelen[i];
    if (!inGevecht()) return;
    if (v.dood) continue;
    aanvalOp(v, dmg);
    if (naSlag && !v.dood) naSlag(v);
    renderGevecht();
    if (i < doelen.length - 1) await slaap(150);
  }
}

/* act-schaling op rauwe aanvalsschade — ÉÉN bron van waarheid voor de echte klap
   (vijandAanval) én de telegraaf (intentTekst), zodat het getal nooit liegt */
function actDmg(basis) {
  return huidigeAct() > 1 ? Math.ceil(basis * (1 + 0.15 * (huidigeAct() - 1))) : basis;
}
/* vijand valt aan — meestal de speler, soms vangt de metgezel de klap op.
   gedwongenDoel: een intent kan een doelwit afdwingen (bv. de Erfprins die
   gericht Drops wegwuift). */
function vijandAanval(v, basis, gedwongenDoel) {
  if (v.dood) return;   /* een aan Doornen gesneuvelde vijand slaat niet meer */
  basis = actDmg(basis);   /* latere acts: hardere klappen (zelfde bron als de telegraaf) */
  const doel = (gedwongenDoel && !gedwongenDoel.dood) ? gedwongenDoel : kiesAanvalDoel(v);
  if (window.Vista) Vista.aanval(v, sp());   /* visueel altijd richting het heldenvak (de metgezel staat ernaast) */
  pose2D(v, 'attack', 0.5);
  /* 2D-lunge: de vijand schiet even naar de speler toe (naar links) */
  if (!d3Actief()) {
    const evf = pose2DArtEl(v);
    if (evf) { evf.classList.remove('valt-aan-v'); void evf.offsetWidth; evf.classList.add('valt-aan-v'); }
  }
  let dmg = basis + (v.status.kracht || 0);
  if ((v.status.zwak || 0) > 0) dmg = Math.floor(dmg * 0.75);
  if ((doel.status.kwetsbaar || 0) > 0) dmg = Math.floor(dmg * 1.5);
  if (doel.isMetgezel) melding(`🛡️ ${METGEZELLEN[doel.id].naam} vangt de klap voor je op!`);
  doeSchade(doel, Math.max(0, dmg), v);
}

/* aanvalsschade toepassen: blok absorbeert, doornen kaatsen terug */
function doeSchade(doel, dmg, bron) {
  let rest = dmg;
  if ((doel.blok || 0) > 0) {
    const op = Math.min(doel.blok, rest);
    doel.blok -= op; rest -= op;
    if (op > 0) fxNummer(actorEl(doel), '🛡️-' + op, 'fx-blok');
  }
  if (rest > 0) verliesHp(doel, rest, bron);
  else if (dmg > 0) Klank.sfx('blok');
  if (bron && (doel.status.doornen || 0) > 0 && !bron.dood) {
    verliesHp(bron, doel.status.doornen);
  }
  /* Carbon-afdruk: word je als speler door een vijand geraakt, dan sla je een afdruk —
     2 extra Doornen-schade terug én je doornen-laag dijt uit (+1). Reactief & uniek.
     (verliesHp ≠ doeSchade → geen recursie via deze haak.) */
  if (doel.isSpeler && bron && !bron.isSpeler && !bron.isMetgezel && !bron.dood && heeftRelikwie('carbon_afdruk')) {
    verliesHp(bron, 2);
    geefStatus(doel, 'doornen', 1);
  }
  return rest;
}

/* HP-verlies (negeert blok — gebruikt voor gif, doornen, zelfschade).
   bron (optioneel): de actor die de schade veroorzaakte — de Copycat gebruikt 'm
   om voeding bron-te-gaten (speler voedt/piekt, breker voedt niet, gif voedt half). */
function verliesHp(doel, n, bron) {
  if (n <= 0) return;
  fxNummer(actorEl(doel), '-' + n, 'fx-schade');
  Klank.sfx(n >= 8 ? 'zwareklap' : 'klap');
  if (window.Vista && !doel.isMetgezel) Vista.raak(doel, n >= 8);   /* de metgezel is DOM-only, niet in de 3D-scène */
  pose2D(doel, 'hit', 0.45);
  const el = actorEl(doel);
  if (el) { el.classList.remove('raak'); void el.offsetWidth; el.classList.add('raak'); }
  if (doel.isMetgezel) {
    /* Drops de Witte is al door de dood gegaan: hij sterft/vlucht niet meer (kaarttekst-
       belofte + blind-immuniteit). Klem hem op minimaal 1 HP zodat de vlucht-tak nooit vuurt. */
    const bodem = doel.id === 'drops_wit' ? 1 : 0;
    doel.hp = Math.max(bodem, doel.hp - n);
    if (S.metgezel) S.metgezel.hp = doel.hp;
    if (doel.hp <= 0 && !doel.dood) { doel.dood = true; metgezelVlucht(doel); }
    return;
  }
  if (doel.isSpeler) {
    S.hp = Math.max(0, S.hp - n);
    /* POORT B — DE LAATSTE SPRONG, ANDERSOM: op een écht dieptepunt (gedoofd, geen
       feniks/contract meer, Drops geofferd, latere run) springt Drops de Witte uit het
       zwart tussen jou en de doodslag. De redding ÍS de reünie. Vóór feniks/contract,
       maar streng gegate zodat het nooit hun moment steelt. */
    if (S.hp <= 0 && lichtNiveau() === 'gedoofd'
        && !heeftRelikwie('feniksveer') && !(heeftRelikwie('verlopen_contract') && !S.contractGebruikt)
        && magWitTerugkeren()) {
      S.hp = Math.max(1, Math.round(S.maxHp * 0.4));
      revealDropsWit(S.gevecht, 'sprong');
      renderTopbalk();
      return;
    }
    /* Feniksveer: één keer is de dood een misverstand */
    if (S.hp <= 0 && heeftRelikwie('feniksveer')) {
      S.relikwieen = S.relikwieen.filter(r => r !== 'feniksveer');
      S.hp = 1;
      melding('🪶 De Feniksveer verbrandt — je weigert te sterven!');
      Klank.sfx('schitter');
      heldFx('hfx-victory', 1600);
    }
    /* Het Verlopen Contract: eenmalig per run de dood weigeren + Zwak/Kwetsbaar wissen */
    if (S.hp <= 0 && heeftRelikwie('verlopen_contract') && !S.contractGebruikt) {
      S.contractGebruikt = true; S.hp = 1;
      const sps = S.gevecht && S.gevecht.speler;
      if (sps) { sps.status.zwak = 0; sps.status.kwetsbaar = 0; }
      melding('📜 Het Verlopen Contract verscheurt zichzelf — je blijft op 1 HP!');
      Klank.sfx('schitter');
    }
    if (n >= 8) schudScherm();
    renderTopbalk();
    if (S.hp <= 0 && inGevecht()) nederlaag();
  } else {
    doel.hp = Math.max(0, doel.hp - n);
    /* THE COPYCAT voedt zich met jouw schade — chokepoint, dus ook gif loopt hierlangs.
       copycatNaSchade regelt voeding (bron-gegate) + terugwin van je gestolen kaarten. */
    if (doel.hp > 0 && VIJANDEN[doel.id] && VIJANDEN[doel.id].copycat
        && S.gevecht && !S.gevecht.copycatGebroken) copycatNaSchade(doel, n, bron);
    if (doel.hp <= 0 && !doel.dood) {
      doel.dood = true;
      Klank.sfx('dood');
      if (UITSPRAKEN[doel.id]) spreek(doel, UITSPRAKEN[doel.id].dood, 0.4);
      if (window.Vista) Vista.sterf(doel);
      pose2D(doel, 'death', 3);
      if (el) el.classList.add('sterft');
      /* Epidemie: een sterfgeval verspreidt gif onder de rest — max 1× per beurt
         (anders kettingt een AoE-kill exponentieel door). */
      if (inGevecht() && (sp().status.epidemie || 0) > 0 && !S.gevecht._epidemieGespreid) {
        S.gevecht._epidemieGespreid = true;
        alleVijanden().forEach(v => geefGif(v, sp().status.epidemie));
      }
    }
  }
}

function geneesHp(n) {
  const oud = S.hp;
  S.hp = Math.min(S.maxHp, S.hp + n);
  if (S.hp > oud) {
    fxNummer($('#speler-zone') || $('#topbalk'), '+' + (S.hp - oud), 'fx-genees');
    Klank.sfx('genees');
  }
  renderTopbalk();
}
function geneesHpBuitenGevecht(n) { S.hp = Math.min(S.maxHp, S.hp + n); renderTopbalk(); }
function verliesHpBuitenGevecht(n) {
  S.hp = Math.max(1, S.hp - n); // buiten gevechten kun je niet sterven
  renderTopbalk();
}

/* ---------- metgezellen (bondgenoten met eigen HP) ---------- */
/* SYNERGIE metgezel × held: basis/goed/optimaal → factor op HP + per-beurt-getallen (data: SYNERGIE) */
function synergieTier(mgid, held) {
  held = held || (S && S.held);
  const s = window.SYNERGIE && SYNERGIE[mgid];
  if (!s || !held) return 'basis';
  if (s.optimaal === held) return 'optimaal';
  if ((s.goed || []).includes(held)) return 'goed';
  return 'basis';
}
function synergieFactor(mgid, held) { return (window.SYNERGIE_FACTOR || {})[synergieTier(mgid, held)] || 1; }
function synergieOptimaal(mgid) { return synergieTier(mgid) === 'optimaal'; }   /* het signatuur-perkje vuurt enkel bij de optimale held */
/* schaal een metgezel-getal (blok/heal/schade) met de synergie; min. 1. Gebruikt in de beurt-hooks. */
function synergieN(mgid, basis) { return Math.max(1, Math.round((basis || 0) * synergieFactor(mgid))); }
function metgezelMaxHp(id) { const def = METGEZELLEN[id]; return def ? Math.max(1, Math.round((def.maxHp || 1) * synergieFactor(id))) : 1; }
/* korte UI-regel over de band met de huidige held */
function synergieLabel(mgid, held) {
  const t = synergieTier(mgid, held);
  if (t === 'optimaal') return '✨ optimale band (+30%)';
  if (t === 'goed') return '◆ goede band (+15%)';
  return '';
}
/* synergie-blok voor het metgezelboek (Codex): de paren + het optimaal-perk */
function synergieBoekHtml(mgid) {
  const s = window.SYNERGIE && SYNERGIE[mgid];
  if (!s) return '';
  const opt = s.optimaal ? HELDNAAM(s.optimaal) : null;
  const goed = (s.goed || []).map(HELDNAAM);
  let h = '<div class="boek-synergie"><b>🔗 Synergie</b>';
  if (opt) h += `<p>✨ <b>Optimale band</b> met <b>${opt}</b> — +30% effect & HP${s.perk ? `, en ${s.perk}` : ''}.</p>`;
  if (goed.length) h += `<p>◆ Goede band met ${goed.join(' · ')} — +15%.</p>`;
  h += '<p class="boek-synergie-rest">Bij elke andere held nog steeds een volwaardige bondgenoot.</p></div>';
  return h;
}

/* werf een metgezel voor de rest van de run (HP gaat mee tussen gevechten) */
function geefMetgezel(id) {
  const def = METGEZELLEN[id];
  if (!def) return;
  const mx = metgezelMaxHp(id);
  S.metgezel = { id, hp: mx, maxHp: mx, vluchtig: false };
  ontdek('metgezellen', id);
  const lab = synergieLabel(id);
  if (lab) melding(`${def.icoon || '🜂'} ${def.naam} — ${lab} met ${HELDNAAM(S.held)}.`);
  renderTopbalk();
}
/* de vrijgespeelde, "meeneembare" metgezellen voor de auto-rotatie. drops_wit zit hier BEWUST
   NIET in: hij is geen vaste reisgenoot maar een EENMALIG grief-moment (zie revealDropsWit) — hij
   keert enkel terug uit het gedoofde licht, nooit automatisch bij act-start. Heb je Drops geofferd
   (→ drops_wit ontgrendeld), dan is de gewone Drops weg; enkel Vlamwachter/Mosgeest rouleren dan nog. */
function ontgrendeldeMetgezellen() {
  const lijst = [];
  if (isOntgrendeld('drops') && !isOntgrendeld('drops_wit')) lijst.push('drops');
  if (isOntgrendeld('vlamwachter')) lijst.push('vlamwachter');
  if (isOntgrendeld('mosgeest')) lijst.push('mosgeest');
  return lijst;
}
/* welke vrijgespeelde metgezel daalt déze run mee? Rotatie per run (Codex.runs) zodat élke
   ontgrendelde metgezel aan bod komt over je afdalingen heen. Null als er nog niets vrij is. */
function kiesRunMetgezel() {
  const lijst = ontgrendeldeMetgezellen();
  if (!lijst.length) return null;
  return lijst[(Codex.runs || 0) % lijst.length];
}
function metgezelInstapMelding(id, teruggekeerd) {
  switch (id) {
    case 'drops_wit':   return '🤍 Drops de Witte daalt met je mee — hij wijkt niet meer van je zij.';
    case 'vlamwachter': return '🔥 De Vlamwachter zweeft geruisloos mee de diepte in — je stille schild.';
    case 'mosgeest':    return '🌿 De Mosgeest rankt met je mee naar beneden — waar jij heel blijft, bloeit hij.';
    default:            return teruggekeerd
      ? '🐾 Drops kruipt uit het donker terug aan je zij en daalt mee het Archief in.'
      : '🐾 Drops daalt met je mee het Archief in.';
  }
}
/* de metgezel haalt uit naar een vijand (zelfde modifiers als een spelersaanval) */
function metgezelAanval(m, doel, basis) {
  if (!doel || doel.dood) return;
  pose2D(m, 'attack', 0.5);
  if (!d3Actief()) {
    const el = pose2DArtEl(m);
    if (el) { el.classList.remove('uithaal'); void el.offsetWidth; el.classList.add('uithaal'); }
  }
  let dmg = basis + (m.status.kracht || 0);
  if ((m.status.zwak || 0) > 0) dmg = Math.floor(dmg * 0.75);
  if ((doel.status.kwetsbaar || 0) > 0) dmg = Math.floor(dmg * 1.5);
  doeSchade(doel, Math.max(0, dmg), m);
}
/* aan het begin van elke spelersbeurt: blok reset, status-afname, dan zijn effect */
function metgezelBeurt() {
  const m = gMet();
  if (!m || m.dood) return;
  m.blok = 0;
  if ((m.status.gif || 0) > 0) { verliesHp(m, m.status.gif); m.status.gif--; if (m.dood) return; }
  if ((m.status.kwetsbaar || 0) > 0) m.status.kwetsbaar--;
  if ((m.status.zwak || 0) > 0) m.status.zwak--;
  const def = METGEZELLEN[m.id];
  if (def && def.beurt) def.beurt(m);
}
/* HP op → de metgezel vlucht het donker in (geen echte dood; later terug te vinden) */
function metgezelVlucht(m) {
  if (S.metgezel) S.metgezel.vluchtig = true;
  Klank.sfx('dood');
  pose2D(m, 'hit', 2);   /* een vlucht = gewond terugtrekken, niet de heroïsche offer-sprong */
  const el = actorEl(m);
  if (el) el.classList.add('gevlucht');
  melding(`💨 ${METGEZELLEN[m.id].naam} vlucht het donker in — je kunt hem later terugvinden.`);
}
/* wie krijgt de klap: meestal de speler, soms de metgezel (hij vangt 'm op) */
function kiesAanvalDoel(v) {
  const m = gMet();
  if (m && !m.dood && METGEZELLEN[m.id].doelbaar
      && willekeurig() < (METGEZELLEN[m.id].dreiging || 0.22)) return m;
  return sp();
}
/* intentie-hint van de metgezel voor de UI */
function metgezelIntentTekst(m) {
  const def = METGEZELLEN[m.id];
  const it = def && def.intent && def.intent(m);
  if (!it) return '';
  if (it.type === 'aanval') {
    let dmg = it.dmg + (m.status.kracht || 0);
    if ((m.status.zwak || 0) > 0) dmg = Math.floor(dmg * 0.75);
    return `<span class="intent intent-aanval" data-tip="${def.naam} valt een vijand aan voor ${dmg}">⚔️ ${dmg}</span>`;
  }
  if (it.type === 'blok') return `<span class="intent intent-blok" data-tip="${def.naam} geeft je ${it.blok} Blok">🛡️ ${it.blok}</span>`;
  if (it.type === 'heal') return `<span class="intent intent-buff" data-tip="${def.naam} geneest je ${it.n} HP">❤️ +${it.n}</span>`;
  return '';
}

/* generieke bevestig-dialoog — voor onomkeerbare keuzes (zoals de opoffering) */
function bevestig(tekst, onJa, jaLabel) {
  const ov = document.createElement('div');
  ov.className = 'overlay open bevestig-overlay';
  ov.innerHTML = `<div class="bevestig-kaart">
      <p>${tekst}</p>
      <div class="bevestig-knoppen">
        <button class="knop-stil" type="button" data-nee>Annuleer</button>
        <button class="knop-groot bevestig-ja" type="button" data-ja>${jaLabel || 'Ja'}</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  const sluit = () => ov.remove();
  ov.querySelector('[data-nee]').onclick = sluit;
  ov.querySelector('[data-ja]').onclick = () => { sluit(); onJa(); };
  ov.onclick = e => { if (e.target === ov) sluit(); };
  Klank.sfx('klik');
}

/* DE OPOFFERING — bewuste, PERMANENTE keuze (geen vlucht; voorgoed weg).
   Generiek: elke metgezel met een opoffering-blok kan dit. */
function metgezelOpoffering() {
  const g = S.gevecht, m = gMet();
  if (!g || g.voorbij || g.bezig || !m || m.dood) return;
  const def = METGEZELLEN[m.id];
  if (!def.opoffering || !def.opoffering.beschikbaar(g)) return;
  bevestig(
    `<b>${def.naam} — ${def.opoffering.naam}</b><br><br>${def.opoffering.tekst}<br><br>Hierna is ${def.naam} <b>VOORGOED</b> weg. Geen terugkeer.`,
    () => {
      if (S.gevecht !== g || g.voorbij || !gMet() || gMet().dood) return;
      def.opoffering.doe(m, g);
      baasFaseMoment('DE LAATSTE SPRONG', `${def.naam} offert zich op — de diepte onthoudt zijn moed.`);
      /* TOON de dood: speel eerst de offer-pose (<art>_death) zichtbaar af — de sprong
         recht in de machine — en verwijder Drops pas DAARNA permanent. Voorheen verdween
         hij meteen (S.metgezel=null + renderGevecht), zodat je zijn offer nooit zag. */
      g.bezig = true;
      /* 2-beats-dood (als de art bestaat): beat 1 = de SPRONG (<art>_death, nog heel),
         beat 2 = de BURST (<art>_offer, uiteenspattend). Ontbreekt _offer, dan blijft de
         death-pose staan — pose2D no-opt netjes op ontbrekende art. */
      if (window.Vista) Vista.pose(m, 'death', 1.6);
      pose2D(m, 'death', 1.6);
      schudScherm(); Klank.sfx('dood');
      setTimeout(() => {
        if (S.gevecht !== g || !gMet()) return;
        if (window.Vista) Vista.pose(m, 'offer', 1.6);
        pose2D(m, 'offer', 1.6);
        schudScherm();
      }, 620);
      setTimeout(() => {
        m.dood = true;
        if (S.gevecht !== g) return;
        g.bezig = false;
        S.metgezel = null;                       /* permanent — niet 'vluchtig' */
        Codex.gevallen = Array.isArray(Codex.gevallen) ? Codex.gevallen : [];
        if (!Codex.gevallen.includes(m.id)) {
          Codex.gevallen.push(m.id);
          if (m.id === 'drops') Codex.dropsOfferRun = (Codex.runs || 0);   /* ijkpunt voor de Drops-de-Witte-grief-gate */
          bewaarCodex();
        }
        melding(`✝ ${def.naam} is voorgoed heengegaan.`);
        const el = actorEl(m); if (el) el.classList.add('gevlucht');
        renderGevecht();
        if (alleVijanden().length === 0) gevechtGewonnen();
      }, 1500);
    },
    'Offer op 🐾'
  );
}

/* ---------- DARK TWIST: Drops ontwaakt uit het gedoofde licht ----------
   Mysterie rijp + je laat je fakkel DOVEN in de Erfprins-zaal (de rite) →
   Drops ontwaakt midden in het gevecht. Eenmalig per run. Aangeroepen waar het
   licht verandert (zetFakkel) en aan het begin van je beurt. */
function checkDropsOntwaak() {
  if (!inGevecht() || S.dropsOntwaakt || heeftMetgezel() || isOntgrendeld('drops')) return;
  if (!mysterieRijp('drops')) return;
  const g = S.gevecht;
  const ep = g.vijanden.find(v => v.id === 'de_erfprins' && !v.dood);
  if (!ep) return;
  const niveau = lichtNiveau();
  /* gedoofd = de zuivere rite; met Eeuwige Lont (klemt op 10) telt 'duister' ook,
     zodat die build de unlock niet permanent blokkeert */
  const riteOk = niveau === 'gedoofd' || (niveau === 'duister' && heeftRelikwie('eeuwige_lont'));
  if (!riteOk) return;
  S.dropsOntwaakt = true;
  noteerRite('drops', 'fakkel_gedoofd_bij_erfprins');
  revealDrops(g);
}
function revealDrops(g) {
  const rev = (window.MYSTERIES && MYSTERIES.drops.eindreveal) || { titel: 'UIT HET GEDOOFDE LICHT', kreet: 'Iets warms kruipt uit het zwart.' };
  baasFaseMoment(rev.titel, 'Iets in het donker haalt adem. En kiest jou.');
  baasSpreekt(UITSPRAKEN._erfprins.gedoofd);
  Klank.sfx('schitter');
  geefMetgezel('drops');            /* run-state + Codex.ontdek */
  ontgrendelMetgezel('drops');      /* voortaan komt hij gewoon mee — de grind is eenmalig */
  /* injecteer hem MIDDEN in het lopende gevecht (zelfde vorm als startGevecht) */
  const def = METGEZELLEN.drops;
  const dmx = metgezelMaxHp('drops');
  g.metgezel = {
    id: 'drops', naam: def.naam, isMetgezel: true,
    hp: dmx, maxHp: dmx, blok: 0, status: {}, dood: false,
  };
  g.metgezel.intent = def.intent ? def.intent(g.metgezel) : null;
  bouwGevechtDom(g);                /* herbouw de gevecht-DOM incl. de metgezel-zone */
  renderGevecht();
  melding(`🐾 ${rev.kreet} Drops kruipt uit de duisternis — en hij wijkt niet meer van je zij.`);
}

/* WIN-RITES voor de látere mysteries (Vlamwachter, Mosgeest): hun metgezel ontwaakt niet
   midden in het gevecht zoals Drops, maar bij het VERSLAAN van de Erfprins onder de juiste
   voorwaarde. Mysterie moet rijp zijn (alle 3 scherven). Eenmalig — daarna komt de metgezel
   in volgende runs gewoon mee. Geeft true terug als er net iets ontgrendelde (voor de pauze). */
function checkBaasRite(g) {
  const mid = actiefMysterie();
  if (!mid || mid === 'drops') return false;          /* Drops heeft z'n eigen doof-rite */
  if (!mysterieRijp(mid) || isOntgrendeld(mid)) return false;
  if (!g.vijanden.some(v => v.id === 'de_erfprins')) return false;   /* enkel de Erfprins telt */
  const def = MYSTERIES[mid];
  let voldaan = false;
  if (def.rite === 'fakkel_helder') voldaan = (lichtNiveau() === 'helder');   /* tunebaar: fakkel hoog houden */
  if (def.rite === 'baas_hoge_hp')  voldaan = (S.hp / S.maxHp >= 0.70);        /* tunebaar: gedijen, niet bloeden */
  if (!voldaan) return false;
  noteerRite(mid, def.rite);
  ontgrendelMetgezel(mid);
  if (typeof ontdek === 'function') ontdek('metgezellen', def.metgezel);   /* Codex-ontdekking (komt vanaf nu in runs mee) */
  const rev = def.eindreveal || { titel: 'EEN NIEUWE BONDGENOOT', kreet: 'Iets koos jou.' };
  const naam = (window.METGEZELLEN && METGEZELLEN[def.metgezel] && METGEZELLEN[def.metgezel].naam) || '';
  baasFaseMoment(rev.titel, rev.kreet);
  Klank.sfx('schitter');
  melding(`🜂 ${naam} sluit zich voortaan bij je aan — in elke volgende afdaling.`);
  return true;
}

/* ---------- DROPS-GRIEF: de stille rouw-atmosfeer (zie DROPS-DE-WITTE.md §1) ----------
   Géén teller — puur de bestaande gevallen-gate + de voltooid-vlag van drops_wit. Het spel
   gedraagt zich alsof hij écht voorgoed weg is; de afwezigheid ÍS de tekst. */
function dropsInRouw() {
  return Array.isArray(Codex.gevallen) && Codex.gevallen.includes('drops') && !isOntgrendeld('drops_wit');
}
/* een gloeiende pootafdruk in de as bij elke doof-keuze; de allereerste doof ná zijn dood
   is een wit vonkje dat meteen sterft (zaadje-nul, max 1× per save). Presentatie: bewust
   Math.random/performance.now — dit raakt de seeded spelstroom niet. */
let _laatsteRouwPoot = 0;
function toonRouwPoot() {
  if (!dropsInRouw()) return;
  const mz = $('#metgezel-zone');
  if (!mz || mz.hidden || !mz.classList.contains('rouw-zone')) return;
  const nu = performance.now();
  if (nu - _laatsteRouwPoot < 700) return;   /* niet strobe-en bij snel licht-verbranden */
  _laatsteRouwPoot = nu;
  if (!Codex.dropsZaadjeNul) {                /* zaadje-nul: één wit vonkje dat meteen dooft */
    Codex.dropsZaadjeNul = true; bewaarCodex();
    const v = document.createElement('div');
    v.className = 'rouw-vonk'; mz.appendChild(v);
    setTimeout(() => v.remove(), 1300);
    return;
  }
  const p = document.createElement('div');
  p.className = 'rouw-poot'; p.textContent = '🐾';
  p.style.left = (28 + Math.random() * 44) + '%';
  p.style.bottom = (8 + Math.random() * 30) + '%';
  mz.appendChild(p);
  setTimeout(() => p.remove(), 1700);
}
/* reünie-payoff: de pootafdruk dooft nu NIET meer — een spoor wit-zilveren poten in de zone
   waar Drops de Witte zojuist verscheen. */
function pootSpoorPayoff() {
  const mz = $('#metgezel-zone');
  if (!mz) return;
  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      const p = document.createElement('div');
      p.className = 'rouw-poot wit'; p.textContent = '🐾';
      p.style.left = (24 + i * 16 + Math.random() * 8) + '%';
      p.style.bottom = (6 + i * 7) + '%';
      mz.appendChild(p);
      setTimeout(() => p.remove(), 2000);
    }, i * 260);
  }
}

/* ---------- DROPS DE WITTE: de geascendeerde terugkeer (zie DROPS-DE-WITTE.md) ----------
   Twee geheime poorten, één wonder; eenmalig permanent via isOntgrendeld('drops_wit').
   Bewust GEEN scherven-mysterie (alleen de voltooid-vlag), zodat het anders aanvoelt. */
function magWitTerugkeren() {
  return inGevecht() && S.gevecht
    && !heeftMetgezel()                                       /* 'terugkeer uit het zwart' alléén als er GEEN levende Drops staat — anders zou drops_wit een nog-aanwezige companion mid-gevecht overschrijven */
    && Array.isArray(Codex.gevallen) && Codex.gevallen.includes('drops')
    && !isOntgrendeld('drops_wit')
    && (Codex.runs || 0) > (Codex.dropsOfferRun || 0)        /* grief moet ≥1 volle run landen */
    && S.gevecht.vijanden.some(v => v.id === 'de_erfprins' && !v.dood);
}
function revealDropsWit(g, poort) {
  if (!g || g.voorbij || isOntgrendeld('drops_wit')) return;
  ontgrendelMetgezel('drops_wit');     /* eenmalig + permanent (Codex), geen scherven */
  Klank.sfx('schitter');
  const sc = document.getElementById('scherm-gevecht');
  if (sc) { sc.classList.remove('wit-flits'); void sc.offsetWidth; sc.classList.add('wit-flits'); setTimeout(() => sc.classList.remove('wit-flits'), 2400); }
  if (poort === 'sprong') baasFaseMoment('UIT HET ZWART', 'De slag landt — en het zwart scheurt open in wit.');
  else baasFaseMoment('DE VONK DIE JE NIET LIET DOVEN', 'Wat trouw is, gaat niet uit.');
  /* de drie beats, met stiltes ertussen */
  setTimeout(() => melding('🤍 „De vonk die nooit doofde, was nooit van de fakkel."'), 900);
  setTimeout(() => melding('🤍 „Het was van hem."'), 2100);
  setTimeout(() => melding('🤍 „En hij was van jou."'), 3300);
  setTimeout(() => { if (S.gevecht === g && !g.voorbij) baasFaseMoment('HERINDEXEREN…', 'TROUW: NOG STEEDS GEEN PRECEDENT.'); }, 4500);
  /* injecteer Drops de Witte midden in het gevecht (zelfde patroon als revealDrops) */
  geefMetgezel('drops_wit');
  const def = METGEZELLEN.drops_wit;
  { const wmx = metgezelMaxHp('drops_wit'); g.metgezel = { id: 'drops_wit', naam: def.naam, isMetgezel: true, hp: wmx, maxHp: wmx, blok: 0, status: {}, dood: false }; }
  g.metgezel.intent = def.intent ? def.intent(g.metgezel) : null;
  bouwGevechtDom(g);
  renderGevecht();
  /* signatuur-pose: hij SPRINGT het beeld in (spiegelt drops_death) — 2D + 3D, valt
     stil terug op het basis-beeld zolang drops_wit_terugkeer-art nog niet bestaat */
  if (window.Vista) Vista.pose(g.metgezel, 'terugkeer', 2.6);
  pose2D(g.metgezel, 'terugkeer', 2.6);
  pootSpoorPayoff();                  /* de pootafdruk dooft nu NIET meer: een wit-zilver spoor */
  melding('🤍 Drops de Witte keert terug — hij overleefde het donker, zoals jij hem nooit liet doven.');
}
/* POORT A — DE WEIGERING: vanuit het diepste donker je licht juist VERHOGEN (spiegelt de
   doof-rite die hem ooit wekte). Aangeroepen vanuit zetFakkel. */
function checkDropsWitWeigering(voorNiveau, delta) {
  if (delta <= 0 || !magWitTerugkeren()) return;
  const vlak = voorNiveau === 'gedoofd' || (voorNiveau === 'duister' && heeftRelikwie('eeuwige_lont'));
  if (!vlak) return;
  revealDropsWit(S.gevecht, 'weigering');
}

/* ---------- schermachtergronden (eigen platen, gedimd voor leesbaarheid) ---------- */
const _schermBg = {};   /* basis-args per scherm onthouden zodat Daglichtmodus live kan herhelderen */
function schermAchtergrond(naam, pad, donker = 0.55, positie = 'center') {
  const el = $('#scherm-' + naam);
  if (!el) return;
  if (pad && window.ACHTERGRONDEN) {
    _schermBg[naam] = { pad, donker, positie };       /* de BASIS-donker (vóór daglicht) */
    /* Daglichtmodus: de verdonkering-overlay flink lichter zetten zodat de plaat
       overdag/buiten leesbaar blijft. Veilig — enkel de gradient-alpha, geen
       filter (die zou de containing-block voor fixed-elementen breken). */
    const d = INST.daglicht ? donker * 0.32 : donker;
    el.style.backgroundImage =
      `linear-gradient(rgba(13,10,18,${d}), rgba(13,10,18,${Math.min(1, d + 0.16)})), url("${ACHTERGRONDEN.basis + pad}")`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = positie;
  } else {
    delete _schermBg[naam];
    el.style.backgroundImage = '';
  }
}
/* her-teken alle scherm-platen met de huidige Daglichtmodus (na een toggle), zodat
   het beeld waar je nú op staat meteen mee verheldert i.p.v. pas bij navigatie. */
function herpasSchermAchtergronden() {
  Object.keys(_schermBg).forEach(naam => {
    const b = _schermBg[naam];
    schermAchtergrond(naam, b.pad, b.donker, b.positie);
  });
}

/* gevechtsplaat kiezen (willekeurige variant; episch voor elite/baas) */
function kiesGevechtAchtergrond(soort) {
  const A = window.ACHTERGRONDEN;
  if (!A) return null;
  const set = A['act' + huidigeAct()] || A.act1;
  const pool = (soort === 'elite' || soort === 'baas') ? set.episch : set.gevecht;
  if (!pool || !pool.length) return null;
  return ACHTERGRONDEN.basis + kiesUit(pool);
}

/* ---------- schermen & muziekscènes ---------- */
const SCHERM_MUZIEK = {
  titel: 'titel', held: 'titel', kaart: 'kaart', rust: 'rust',
  winkel: 'kaart', event: 'kaart', schat: 'kaart', beloning: 'kaart'
};
function toonScherm(naam) {
  $$('.scherm').forEach(el => el.classList.remove('actief'));
  $('#scherm-' + naam).classList.add('actief');
  $('#topbalk').style.display = (naam === 'titel') ? 'none' : 'flex';
  document.body.dataset.scherm = naam;   /* o.a. voor het fakkel-vignet */
  zetLichtVisueel();
  evalueerDraaiBlok();                    /* combat=liggend, encounters=staand */
  if (S) S.scherm = naam;
  if (SCHERM_MUZIEK[naam]) Klank.muziek(SCHERM_MUZIEK[naam]);
}

/* ---------- opslaan / laden ---------- */
function saveSpel() {
  try {
    const kopie = { ...S, gevecht: null, toevalStaat: Toeval.staat };
    localStorage.setItem(SAVE_SLEUTEL, JSON.stringify(kopie));
  } catch (e) { /* opslag optioneel */ }
}
function laadSpel() {
  try {
    const data = localStorage.getItem(SAVE_SLEUTEL);
    if (!data) return false;
    S = JSON.parse(data);
    S.gevecht = null;
    if (!S.held) S.held = 'slachter';            /* oudere saves */
    if (S.fakkel === undefined) S.fakkel = 100;
    /* saniteer de seed óók bij laden: een getamperde save kan hier HTML smokkelen
       (de seed wordt op het eindescherm via innerHTML getoond). */
    S.seed = (typeof S.seed === 'string' ? S.seed : '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '') || '—';
    /* over-nacht meegesleepte daily? behandel als gewone, niet-scorende run —
       anders scoort hij op de verkeerde dag of dubbel. */
    if (S.daily && S.dailyDag && S.dailyDag !== vandaagSleutel()) S.daily = false;
    /* structurele integriteit: een corrupte/oude save mag renderKaartScherm niet
       laten crashen. Ontbreekt de kern-shape → veilig falen (doorgaan() vangt
       false op met een melding + terug naar de titel). */
    const kaartOk = S.kaart && typeof S.kaart === 'object' && !Array.isArray(S.kaart) && Object.keys(S.kaart).length > 0;
    if (!kaartOk || !Array.isArray(S.dek) || !Array.isArray(S.relikwieen) || !Array.isArray(S.dranken)) {
      wisSave(); return false;
    }
    /* saniteer bezit tegen verdwenen/hernoemde ids — renderTopbalk derefereert
       RELIKWIEEN[r]/DRANKEN[d] zonder fallback, een stale id zou de run bricken. */
    S.relikwieen = S.relikwieen.filter(r => RELIKWIEEN[r]);
    S.dranken = S.dranken.filter(d => DRANKEN[d]);
    /* gedragen scherven: gooi onbekende/hernoemde ids weg (anders een loze ❓ in de
       Drempel), én verwijder wat al veilig in de stash zit — een stale save (tab dicht
       tussen baas-win en Drempel) zou anders al-gebankte scherven dubbel herstellen
       (gedragen + stash) → herplaatsbaar/herbankbaar → oneindige scherf-duplicatie. */
    S.scherven = (Array.isArray(S.scherven) ? S.scherven : []).filter(sid => scherfDef(sid) && !scherfStash().includes(sid));
    if (S.pos === undefined) S.pos = null;
    if (S.pos !== null && !S.kaart[S.pos]) S.pos = null;   /* pos wijst naar onbestaande node → terug naar de ingang */
    if (typeof S.hp !== 'number') S.hp = huidigeHeld().hp;
    if (typeof S.maxHp !== 'number') S.maxHp = S.hp;
    if (typeof S.goud !== 'number') S.goud = 0;
    if (typeof S.verdieping !== 'number') S.verdieping = 0;
    if (!S.stats) S.stats = { gevechten: 0, kaarten: 0, schade: 0 };
    if (typeof S.uid !== 'number') S.uid = 0;
    /* metgezel-state: oude saves missen 'm (→ undefined, ok); een corrupte/onbekende
       metgezel neutraliseren zodat heeftMetgezel() veilig false geeft */
    if (S.metgezel && (typeof S.metgezel !== 'object' || !METGEZELLEN[S.metgezel.id] || typeof S.metgezel.hp !== 'number')) S.metgezel = null;
    if (S.runMetgezel === 'drops_wit') S.runMetgezel = null;   /* stale cache uit oude saves: de Witte hoort nooit in de auto-rotatie (enkel via het grief-moment) */
    if (S.toevalStaat !== undefined) Toeval.zetStaat(S.toevalStaat);
    return true;
  } catch (e) { return false; }
}
function wisSave() { try { localStorage.removeItem(SAVE_SLEUTEL); } catch (e) {} }

/* ---------- topbalk ---------- */
let _tbBezitSig = null;   /* dirty-guard: bezit-rijen alleen herbouwen bij wijziging */
function renderTopbalk() {
  if (!S || !S.dek) return;
  $('#tb-hp').innerHTML = `❤️ ${S.hp}/${S.maxHp}`;
  const tbF = $('#tb-fakkel');
  if (tbF && S.fakkel !== undefined) {
    tbF.innerHTML = `🔥 ${S.fakkel}`;
    tbF.className = 'licht-' + lichtNiveau();
    tbF.style.background = `linear-gradient(90deg, rgba(255,140,60,.30) ${S.fakkel}%, rgba(0,0,0,.35) ${S.fakkel}%)`;
    tbF.dataset.tip = 'Fakkel: kamers kosten licht (dieper = duurder). Helder (60+) geeft 4 kaartkeuzes na een gevecht, schemer 3, donker 2. Onder 30 zie je geen intent-getallen; gedoofd = vijanden +1 Kracht maar +50% goud.';
  }
  $('#tb-goud').innerHTML = `🪙 ${S.goud}`;
  $('#tb-verdieping').innerHTML = `🏔️ ${S.verdieping}`;
  /* alles wat je bezit is ontdekt — dekt elke verwervingsroute */
  S.relikwieen.forEach(r => ontdek('relikwieen', r));
  S.dranken.forEach(d => ontdek('dranken', d));
  /* de relikwie-/drankrijen alleen herbouwen als het bezit écht wijzigde — anders
     sloopt elke render (per klap in een gevecht!) de img's en zwapt ze opnieuw. */
  const sig = S.relikwieen.join(',') + '|' + S.dranken.join(',') + '|' + drankSlots();
  if (sig !== _tbBezitSig) {
    _tbBezitSig = sig;
    $('#tb-relikwieen').innerHTML = S.relikwieen.map(r => {
      const d = RELIKWIEEN[r];
      return `<span class="relikwie rel-${d.zeld || 'gewoon'}" data-rart="${r}" data-tip="${d.naam} — ${d.tekst} (klik voor het verhaal)" onclick="toonRelikwieBoek('${r}')">${d.icoon}</span>`;
    }).join('');
    $('#tb-dranken').innerHTML = S.dranken.map((d, i) => {
      const def = DRANKEN[d];
      return `<button class="drank" data-dart="${d}" data-tip="${def.naam} — ${def.tekst} (gebruiken: tik · verhaal: vasthouden of rechtsklik)"
        style="--dkleur:${def.kleur}" onclick="gebruikDrank(${i})" oncontextmenu="return bekijkDrank(event, '${d}')">${def.icoon}</button>`;
    }).join('') + `<span class="drank-leeg">${'◌'.repeat(Math.max(0, drankSlots() - S.dranken.length))}</span>`;
    verfraaiItemArt($('#topbalk'));
  }
}

/* Vijzel en Stamper: elk drankje werkt dubbel */
function drinkEffect(id, doel) {
  DRANKEN[id].drink(doel);
  if (heeftRelikwie('vijzel_en_stamper')) {
    DRANKEN[id].drink(doel);
    melding('De vijzel maalde dubbel zo fijn!');
  }
}

function gebruikDrank(i) {
  const id = S.dranken[i];
  const def = DRANKEN[id];
  if (!def) return;
  /* een nieuwe drank-tik breekt een lopende doelkeuze af: anders blijft gekozenDrank op een
     nu-stale slot-index staan terwijl een splice de tas hieronder inkrimpt → een latere
     vijand-klik leest S.dranken[stale]=undefined → DRANKEN[undefined].drink() crasht. */
  if (inGevecht()) { S.gevecht.gekozenDrank = null; S.gevecht.gekozenKaart = null; }
  if (def.doel === 'vijand') {
    if (!inGevecht()) { melding('Alleen bruikbaar in een gevecht.'); return; }
    if (S.gevecht.bezig) return;
    const levend = alleVijanden();
    if (levend.length === 1) {
      S.dranken.splice(i, 1);
      Klank.sfx('drank');
      drinkEffect(id, levend[0]);
      naActie();
    } else {
      S.gevecht.gekozenDrank = i;
      S.gevecht.gekozenKaart = null;
      melding('Kies een doelwit.');
      renderGevecht();
    }
    return;
  }
  if (id !== 'heeldrank' && !inGevecht()) {
    melding('Alleen bruikbaar in een gevecht.'); return;
  }
  if (inGevecht() && S.gevecht.bezig) return;
  S.dranken.splice(i, 1);
  Klank.sfx('drank');
  drinkEffect(id);
  melding(`${def.naam} gebruikt!`);
  if (inGevecht()) naActie(); else renderTopbalk();
}

/* ============================================================
   KAART VAN DE DIEPTE (de map)
   ============================================================ */
function gewogenKeuze(opties) {
  const totaal = opties.reduce((s, o) => s + o[1], 0);
  let r = Toeval.volgende() * totaal;
  for (const [naam, gewicht] of opties) {
    r -= gewicht;
    if (r <= 0) return naam;
  }
  return opties[0][0];
}

function genereerKaart() {
  const nodes = {};
  const startKols = schud([0, 1, 2, 3, 4, 5, 6]).slice(0, 4);
  for (const sk of startKols) {
    let c = sk, vorige = null;
    for (let r = 0; r < RIJEN; r++) {
      if (r > 0) c = Math.max(0, Math.min(KOLS - 1, c + rnd(-1, 1)));
      const sleutel = r + '_' + c;
      if (!nodes[sleutel]) nodes[sleutel] = { id: sleutel, r, c, type: null, verb: [] };
      if (vorige && !nodes[vorige].verb.includes(sleutel)) nodes[vorige].verb.push(sleutel);
      vorige = sleutel;
    }
    if (!nodes[vorige].verb.includes('baas')) nodes[vorige].verb.push('baas');
  }
  nodes['baas'] = { id: 'baas', r: RIJEN, c: 3, type: 'baas', verb: [] };

  for (const n of Object.values(nodes)) {
    if (n.type) continue;
    if (n.r === 0) { n.type = 'gevecht'; continue; }
    if (n.r === RIJEN - 1) { n.type = 'rust'; continue; }
    if (n.r === 6) { n.type = 'schat'; continue; }
    const opties = [['gevecht', 45]];
    if (n.r >= 2) opties.push(['event', 22]);
    if (n.r >= 3) opties.push(['rust', 12], ['winkel', 10]);
    if (n.r >= 4) opties.push(['elite', 11]);
    /* Act 2+: een zeldzame episch-node (mysterie-vijand "Het Origineel") */
    if (n.r >= 4 && huidigeAct() >= 2) opties.push(['episch', 8]);
    n.type = gewogenKeuze(opties);
  }
  /* garandeer ≥1 episch-node zolang je nog episch-scherven mist — anders hangt die bron
     aan een mapseed-loterij */
  if (huidigeAct() >= 2 && typeof scherfTeVinden === 'function' && scherfTeVinden('episch')
      && !Object.values(nodes).some(n => n.type === 'episch')) {
    const kand = Object.values(nodes).filter(n => n.r >= 4 && n.r < RIJEN - 1 && (n.type === 'gevecht' || n.type === 'event'));
    if (kand.length) kiesUit(kand).type = 'episch';
  }
  return nodes;
}

const NODE_ICONEN = { gevecht: '⚔️', elite: '😈', rust: '🔥', winkel: '💰', event: '❓', schat: '🎁', baas: '👑', episch: '🜂' };
const NODE_NAMEN = { gevecht: 'Gevecht', elite: 'Elite', rust: 'Rustplaats', winkel: 'Winkel', event: 'Onbekend', schat: 'Schat', baas: 'De Slijmkoning', episch: 'Epische Vijand' };

function beschikbareNodes() {
  if (S.pos === null) return Object.values(S.kaart).filter(n => n.r === 0).map(n => n.id);
  return S.kaart[S.pos] ? S.kaart[S.pos].verb : [];
}

function nodePositie(n) {
  const B = 700, RAND = 70;
  const x = RAND + n.c * (B - 2 * RAND) / (KOLS - 1);
  /* een echte AFDALING: verdieping 1 bovenaan, de baas onderin de diepte */
  const y = n.r * 92 + 90;
  return { x, y };
}

let _kaartZoom = 1;   /* schaalfactor van de afdaalkaart op smalle schermen (zoom) */
function renderKaartScherm() {
  toonScherm('kaart');
  saveSpel();
  const vlak = $('#kaart-vlak');
  const hoogte = (RIJEN + 1) * 92 + 120;
  vlak.style.height = hoogte + 'px';
  const beschikbaar = beschikbareNodes();

  let svg = `<svg width="700" height="${hoogte}" xmlns="http://www.w3.org/2000/svg">`;
  for (const n of Object.values(S.kaart)) {
    const p1 = nodePositie(n);
    for (const v of n.verb) {
      const p2 = nodePositie(S.kaart[v]);
      const actiefPad = (n.id === S.pos && beschikbaar.includes(v));
      svg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}"
        stroke="${actiefPad ? 'var(--ember)' : 'rgba(214,178,120,.18)'}"
        stroke-width="${actiefPad ? 3 : 2}" stroke-dasharray="2 7" stroke-linecap="round"/>`;
    }
  }
  svg += '</svg>';

  let knoppen = '';
  for (const n of Object.values(S.kaart)) {
    const p = nodePositie(n);
    const isHuidig = n.id === S.pos;
    const kan = beschikbaar.includes(n.id);
    const kost = fakkelKost(n.type, n.r);
    const naam = n.type === 'baas' ? huidigeBaas().naam : NODE_NAMEN[n.type];
    knoppen += `<button class="knoop knoop-${n.type} ${kan ? 'kan' : ''} ${isHuidig ? 'huidig' : ''}"
      style="left:${p.x}px; top:${p.y}px"
      data-tip="${naam}${kost > 0 ? ` (−${kost} 🔥)` : ''}"
      aria-label="${naam}${kost > 0 ? `, kost ${kost} licht` : ''}"
      ${kan ? `onclick="kiesNode('${n.id}')"` : 'disabled'}>${NODE_ICONEN[n.type]}</button>`;
  }
  vlak.innerHTML = svg + knoppen;

  /* de held staat op de kaart: bij zijn huidige kamer, of bij de ingang */
  const heldPos = S.pos ? nodePositie(S.kaart[S.pos]) : { x: 350, y: 50 };
  vlak.insertAdjacentHTML('beforeend',
    `<div class="kaart-held" id="kaart-held" style="left:${heldPos.x}px; top:${heldPos.y}px"></div>`);
  if (window.laadKarakterAfbeelding) {
    laadKarakterAfbeelding(huidigeHeld().art, img => {
      const el = $('#kaart-held');
      if (img && el && !el.querySelector('img')) el.innerHTML = `<img src="${img.src}" alt="">`;
    });
  }

  /* act-overzichtsplaat scrollt mee met de route: onderaan de vallei, bovenaan de baas */
  const scroller = $('#kaart-scroll');
  const schermEl = $('#scherm-kaart');
  /* smal scherm: de hele 700px-kaart op breedte schalen met zoom (reflowt de
     layout → géén horizontale scroll meer; je ziet je route in één oogopslag en
     scrollt enkel verticaal, de natuurlijke afdaling). Op een breed scherm s=1
     (no-op, laptop ongewijzigd). De scroll-rekenkunde verderop schaalt mee. */
  const cw = scroller.clientWidth || window.innerWidth;
  _kaartZoom = Math.min(1, (cw - 6) / 700);
  vlak.style.zoom = _kaartZoom < 1 ? _kaartZoom : '';
  if (window.ACHTERGRONDEN && actBg('kaart')) {
    schermEl.style.backgroundImage =
      `linear-gradient(rgba(13,10,18,.40), rgba(13,10,18,.55)), url("${ACHTERGRONDEN.basis + actBg('kaart')}")`;
    schermEl.style.backgroundSize = 'cover';
    const zetPlaatPositie = () => {
      const max = scroller.scrollHeight - scroller.clientHeight;
      const pct = max > 0 ? (scroller.scrollTop / max * 100) : 100;
      schermEl.style.backgroundPosition = `center ${pct}%`;
    };
    scroller.onscroll = zetPlaatPositie;
    requestAnimationFrame(zetPlaatPositie);
  }

  const doelY = (S.pos ? nodePositie(S.kaart[S.pos]).y : 0) * _kaartZoom;
  scroller.scrollTop = Math.max(0, doelY - scroller.clientHeight * 0.45);
  /* horizontaal centreren alleen nog op een breed scherm; geschaald past de
     kaart exact op de breedte (geen horizontale overloop meer). */
  if (S.pos && _kaartZoom >= 1) scroller.scrollLeft = Math.max(0, nodePositie(S.kaart[S.pos]).x - scroller.clientWidth * 0.5);
  $('#seed-label').textContent = 'Seed: ' + (S.seed || '—') + (S.ascensie ? ' · Ascensie ' + S.ascensie : '');
  zetLichtVisueel();
  renderTopbalk();
}

/* eerst reist de held zichtbaar over het pad, dan pas opent de kamer */
let reisBezig = false;
function kiesNode(id) {
  const n = S.kaart[id];
  if (reisBezig || !n || !beschikbareNodes().includes(id)) return;
  const held = $('#kaart-held');
  if (!held) { kiesNodeEcht(id); return; }
  reisBezig = true;
  const doel = nodePositie(n);
  held.classList.add('reist');
  held.style.left = doel.x + 'px';
  held.style.top = doel.y + 'px';
  const scroller = $('#kaart-scroll');
  if (scroller) scroller.scrollTo({
    top: Math.max(0, doel.y * _kaartZoom - scroller.clientHeight * 0.45),
    left: _kaartZoom >= 1 ? Math.max(0, doel.x - scroller.clientWidth * 0.5) : 0,
    behavior: 'smooth'
  });
  Klank.sfx('stap');
  setTimeout(() => Klank.sfx('stap'), 450);
  setTimeout(() => Klank.sfx('stap'), 880);
  setTimeout(() => { reisBezig = false; kiesNodeEcht(id); }, 1250);
}

function kiesNodeEcht(id) {
  const n = S.kaart[id];
  if (!n) return;
  S.pos = id;
  S.verdieping++;
  const kost = fakkelKost(n.type, n.r);
  if (kost > 0) zetFakkel(-kost);
  if (n.type === 'rust' && heeftRelikwie('vuurvliegenpot')) zetFakkel(15);
  /* vangnet: gooit het openen van een kamer onverwacht, dan is S.pos al verzet
     maar wisselt het scherm niet → de map toont nog de oude (nu geblokkeerde)
     nodes en de speler 'hangt' eindeloos. We renderen dan de map opnieuw zodat
     de nu-beschikbare nodes klikbaar worden: kamer overgeslagen i.p.v. freeze. */
  try {
    switch (n.type) {
      case 'gevecht': {
        /* latere acts schuiven de moeilijkheidstier omhoog (Act 2 begint al in 'midden') */
        const er = n.r + (huidigeAct() - 1) * 5;
        const moeilijkheid = er < 3 ? 'vroeg' : (er < 6 ? 'midden' : (er < 9 ? 'laat' : 'zwaar'));
        /* Act 2+ trekt uit z'n eigen roster (de kopieerhel) i.p.v. opgeschaalde Act 1-vijanden */
        const tabel = (huidigeAct() >= 2 && ONTMOETINGEN.act2) ? ONTMOETINGEN.act2 : ONTMOETINGEN;
        startGevecht(kiesUit(tabel[moeilijkheid] || ONTMOETINGEN[moeilijkheid]), 'gevecht', n.r);
        break;
      }
      case 'elite': {
        const eliteTabel = (huidigeAct() >= 2 && ONTMOETINGEN.act2 && ONTMOETINGEN.act2.elite) ? ONTMOETINGEN.act2.elite : ONTMOETINGEN.elite;
        startGevecht(kiesUit(eliteTabel), 'elite', n.r);
        break;
      }
      case 'episch': {
        /* de mysterie-vijand; bij winst valt z'n scherf (zie gevechtGewonnen) */
        startGevecht(kiesUit(ONTMOETINGEN.episch || [['het_origineel']]), 'elite', n.r);
        if (S.gevecht) S.gevecht.epischScherf = true;   /* bij winst valt een episch-scherf (zie gevechtGewonnen) */
        break;
      }
      case 'baas': startGevecht([huidigeBaas().id], 'baas', n.r); break;
      case 'rust': toonRust(); break;
      case 'winkel': toonWinkel(); break;
      case 'schat': toonSchat(); break;
      case 'event': toonEvent(); break;
    }
  } catch (e) {
    console.error('Kamer openen mislukte:', n.type, e);
    melding('Er ging iets mis bij het betreden van de kamer — je gaat verder.');
    renderKaartScherm();
  }
}

/* ============================================================
   GEVECHT — opbouw (eenmalig) en gerichte updates
   ============================================================ */
let GDOM = { vijanden: [], speler: null, metgezel: null, hand: new Map() };
let gevechtTikAf = null;

function maakVijand(id, rij) {
  const def = VIJANDEN[id];
  let hp = rnd(def.hp[0], def.hp[1]);
  if (!def.elite && !def.baas && !def.episch) hp += Math.floor(rij * 0.8);   /* episch krijgt geen rij-bonus bovenop ×act */
  if (!def.baas && huidigeAct() > 1) hp = Math.ceil(hp * (1 + 0.30 * (huidigeAct() - 1)));   /* latere acts: taaier */
  if (asc() >= 2 && !def.baas) hp = Math.ceil(hp * 1.12);   /* ascension 2: taaiere vijanden */
  const v = { id, naam: def.naam, art: def.art, hp, maxHp: hp, blok: 0, status: {}, dood: false, beurtTeller: 0, intent: null, aegis: def.aegis || 0 };
  if (def.copycat) {
    /* THE COPYCAT-state. Overal elders lui geguard ((v.gestolen||[]), v.gevoed||0, …)
       want Drops kan midden in het gevecht verschijnen — zie [[lookup-bugklasse]]. */
    v.gestolen = []; v.gevoed = 0; v.fase = 1; v.terugwinMeter = 0;
    v.maxKlap = 0; v.copyKracht = 0; v.totaalGestolen = 0;
  }
  markeerGezien(id);   /* artbook: deze vijand staat nu vrij in het Bestiarium */
  return v;
}

/* oriëntatie-routing: bijna alles (gevecht, beloning/kaartkeuze ná de battle,
   winkel, rust) speelt prima LIGGEND en blijft dat. ALLEEN de echte map-
   encounters waar landscape brak — de schatkist en de event-scènes — vragen
   STAAND (knop viel weg / visual niet zichtbaar). Per richting eenmalig per
   sessie weg te klikken ("toch zo spelen"). */
const _draaiGenegeerd = { liggend: false, staand: false };
const _DRAAI_STAAND_SCHERMEN = ['schat', 'event'];
function evalueerDraaiBlok() {
  const el = document.getElementById('draai-blok');
  if (!el) return;
  const scherm = document.body.dataset.scherm;
  const liggend = !!(window.matchMedia && matchMedia('(orientation: landscape)').matches);
  const kiesO = document.getElementById('overlay-kies');
  const kiesOpen = !!(kiesO && kiesO.classList.contains('open'));   /* kaartoverzicht / smid */
  /* sommige events (de smid) leiden naar het smeden en spelen dus LIGGEND, niet staand */
  const eventLiggend = scherm === 'event' && typeof EVENTS !== 'undefined' && typeof S !== 'undefined' && S && S.huidigEvent
    ? (() => { const ev = EVENTS.find(e => e.id === S.huidigEvent); return !!(ev && ev.liggend); })()
    : false;
  let richting = null;
  if (window.mobiel) {
    if (kiesOpen) { if (!liggend) richting = 'liggend'; }                   /* een kaartoverzicht (smid/keuze/dek) wil LIGGEND — ook bovenop een portret-encounter */
    else if (scherm === 'gevecht' && !liggend) richting = 'liggend';        /* gevecht wil liggend */
    else if (eventLiggend && !liggend) richting = 'liggend';                /* het smid-event wil liggend (anders dekt de prompt het artwork af) */
    else if (_DRAAI_STAAND_SCHERMEN.includes(scherm) && !eventLiggend && liggend) richting = 'staand'; /* andere encounter wil staand */
  }
  if (!richting || _draaiGenegeerd[richting]) {
    el.classList.remove('toon'); el.dataset.richting = '';
    misschienBaasIntro(typeof S !== 'undefined' && S && S.gevecht);   /* slagveld zichtbaar → wachtende baas-intro mag nu spelen */
    return;
  }
  const naarLiggend = richting === 'liggend';
  const h2 = el.querySelector('h2'), p = el.querySelector('p'), knop = el.querySelector('button');
  if (h2) h2.textContent = 'Draai je toestel';
  if (p) p.textContent = naarLiggend
    ? 'Gevechten speel je liggend — zo zie je het slagveld en je kaarten groot en duidelijk.'
    : 'Dit scherm speelt prettiger rechtop — zo zie je alles in één blik.';
  if (knop) knop.textContent = naarLiggend ? 'Toch staand spelen' : 'Toch liggend spelen';
  el.dataset.richting = richting;
  el.classList.add('toon');
}
/* "toch zo spelen": deze richting deze sessie niet meer vragen */
function speelTochStaand() {
  const el = document.getElementById('draai-blok');
  const r = el && el.dataset.richting;
  if (r) _draaiGenegeerd[r] = true;
  if (el) el.classList.remove('toon');
  misschienBaasIntro(typeof S !== 'undefined' && S && S.gevecht);   /* slagveld nu zichtbaar → wachtende baas-intro spelen */
}

/* een baasgevecht onthult de baas met een korte intro — die mag NIET achter de
   full-screen draai-prompt (z-index 2000) spelen. Daarom enkel starten als het
   slagveld echt zichtbaar is; anders wacht 'ie tot de prompt weg is (draaien of
   "toch zo spelen"). Eén keer per gevecht via g.baasIntroGespeeld. */
function misschienBaasIntro(g) {
  if (!g || g.voorbij || g.baasIntroGespeeld || g.soort !== 'baas') return;
  const db = document.getElementById('draai-blok');
  if (db && db.classList.contains('toon')) return;
  g.baasIntroGespeeld = true;
  toonBaasIntro(g);
}

let _draaiHertekenTimer = null;
function opSchermDraai() {
  evalueerDraaiBlok();
  /* afdaalkaart herschalen bij draaien: de zoom hangt aan de schermbreedte, en
     zonder hertekenen blijft 'ie stale → te klein (na portret→liggend) of
     overlopend/afgeknipt (liggend→portret). Licht gedebounced tegen resize-burst. */
  clearTimeout(_draaiHertekenTimer);
  _draaiHertekenTimer = setTimeout(() => {
    if (document.body.dataset.scherm === 'kaart' && typeof S !== 'undefined' && S && S.kaart) renderKaartScherm();
  }, 140);
}
window.addEventListener('orientationchange', opSchermDraai);
window.addEventListener('resize', opSchermDraai);

function startGevecht(samenstelling, soort, rij) {
  const g = {
    soort,
    vijanden: samenstelling.map(vid => maakVijand(vid, rij || 0)),
    speler: { isSpeler: true, blok: 0, status: {} },
    trek: schud([...S.dek]),
    hand: [], afleg: [], uitgeput: [],
    energie: 3, maxEnergie: 3,
    beurt: 0, bezig: false, voorbij: false,
    gekozenKaart: null, gekozenDrank: null,
    /* THE COPYCAT: zijn observatie-buffer + breekstatus leven op het gevecht */
    laatstGespeeld: [], vorigeId: null, copycatGebroken: false, raakteCopycat: false
  };
  S.gevecht = g;

  /* metgezel mee het gevecht in: eigen HP uit de run-state, verse blok/status */
  if (heeftMetgezel()) {
    const md = METGEZELLEN[S.metgezel.id];
    g.metgezel = {
      id: S.metgezel.id, naam: md.naam, isMetgezel: true,
      hp: Math.max(1, Math.min(S.metgezel.hp, metgezelMaxHp(S.metgezel.id))), maxHp: metgezelMaxHp(S.metgezel.id),
      blok: 0, status: {}, dood: false
    };
    g.metgezel.intent = md.intent ? md.intent(g.metgezel) : null;
  } else {
    g.metgezel = null;
  }

  if (heeftRelikwie('anker')) g.speler.blok = 10;
  if (heeftRelikwie('warme_mantel') && lichtNiveau() !== 'helder') g.speler.blok += 6;
  if (heeftRelikwie('krachtsteen')) g.speler.status.kracht = (g.speler.status.kracht || 0) + 1;   /* optellen i.p.v. zetten: stapelt veilig met oorlogsbanier/duivelboomtak, ongeacht volgorde */
  if (heeftRelikwie('oorlogsbanier') && (g.soort === 'elite' || g.soort === 'baas')) {
    g.speler.status.kracht = (g.speler.status.kracht || 0) + 1;
  }
  if (heeftRelikwie('bronzen_schub')) g.speler.status.doornen = 3;
  if (heeftRelikwie('scherpe_dolk')) g.vijanden.forEach(v => v.status.kwetsbaar = 1);
  /* Act 2 — Het Archief (elk een unieke functie; geen dubbels meer) */
  /* Was-zegel: blok-behoud i.p.v. start-blok — zie beginSpelerBeurt (beurt 1 reset niet). */
  /* Stempelkussen: stempelt Kwetsbaar op je eerste aanval per beurt — zie speelKaart. */
  if (heeftRelikwie('rode_lint')) {                       /* bindt enkel de ZWAKSTE vijand vast */
    const z = g.vijanden.slice().sort((a, b) => a.hp - b.hp)[0];
    if (z) { z.status.zwak = (z.status.zwak || 0) + 2; z.status.kwetsbaar = (z.status.kwetsbaar || 0) + 2; }
  }
  if (heeftRelikwie('indexkaart')) g.speler.status.geindexeerd = (g.speler.status.geindexeerd || 0) + 1;   /* elke aanval → 1 Blok */
  if (heeftRelikwie('bottenfluit')) g.vijanden.forEach(v => v.status.zwak = 1);
  if (heeftRelikwie('energiekristal')) g.energie += 1;
  /* de kronen tellen ook al in de allereerste beurt mee */
  const lichtStart = lichtNiveau();
  if (heeftRelikwie('schaduwkroon') && ['duister', 'gedoofd'].includes(lichtStart)) g.energie += 1;
  if (heeftRelikwie('kroon_van_sintels') && lichtStart === 'helder') g.energie += 1;
  if (heeftRelikwie('houten_been')) { g.speler.status.doornen = (g.speler.status.doornen || 0) + 1; g.speler.blok += 4; }   /* +1 Doornen én +4 Blok bij start — direct (geen geefBlok: DOM bestaat nog niet) */
  if (heeftRelikwie('duivelboomtak')) g.speler.status.kracht = (g.speler.status.kracht || 0) + 2;
  /* via geefGif zodat de smaragden_ring/inktpot-bonus ÉN gif-immuun/gif-kaats meegerekend
     worden (basis 1; geefGif telt de relic-bonus er zelf bij) */
  if (heeftRelikwie('slangenamulet')) g.vijanden.forEach(v => geefGif(v, 1));
  /* gedoofde fakkel: vijanden feller, maar de buit is groter */
  g.gedoofd = lichtNiveau() === 'gedoofd';
  if (g.gedoofd) g.vijanden.forEach(v => v.status.kracht = (v.status.kracht || 0) + 1);
  g.heldArt = huidigeHeld().art;

  bouwGevechtDom(g);

  let eersteTrek = 5;
  if (heeftRelikwie('klavertje')) eersteTrek += 2;
  if (heeftRelikwie('oorlogstrommel')) eersteTrek += 1;
  /* doorslagpapier trekt niet meer extra — het kopieert nu je eerste kaart (zie speelKaart) */
  trekKaarten(eersteTrek);

  g.vijanden.forEach(v => v.intent = VIJANDEN[v.id].kies(v, 0));
  S.stats.gevechten++;

  /* eigen gevechtsplaat: fullscreen op natuurlijke schaal (ook in 2D-modus) */
  g.achtergrond = kiesGevechtAchtergrond(soort);
  const bgEl = $('#gevecht-achtergrond');
  if (g.achtergrond) {
    bgEl.style.backgroundImage =
      `linear-gradient(rgba(13,10,18,.32), rgba(13,10,18,.5)), url("${g.achtergrond}")`;
    bgEl.style.transform = '';
    bgEl.classList.add('zichtbaar');
  } else {
    bgEl.classList.remove('zichtbaar');
  }

  /* 3D-toneel */
  const scherm = $('#scherm-gevecht');
  if (d3Gewenst() && Vista.start($('#vista-canvas'))) {
    scherm.classList.add('d3-actief');
    Vista.gevechtStart(g, soort, !!g.achtergrond);
  } else {
    scherm.classList.remove('d3-actief');
  }

  /* entree in 2D-modus: vijanden glijden vanuit het donker binnen, de held van links
     (in 3D regelt Vista de opkomst van de sprites zelf) */
  if (!d3Actief()) {
    document.querySelectorAll('#vijanden-rij .vijand').forEach((el, i) => {
      triggerEntree(el, 0.1 + i * 0.18);
    });
    $('#speler-zone').classList.add('entree-links');
  }
  if (gevechtTikAf) gevechtTikAf();
  gevechtTikAf = Tikker.abonneer(gevechtTik);

  Klank.muziek(soort === 'baas' ? 'baas' : (soort === 'elite' ? 'elite' : 'gevecht'));
  toonScherm('gevecht');
  zetLichtVisueel();
  renderGevecht();
  /* Het Metgezel-Mysterie: de Erfprins-ontmoeting telt mee (cross-run escalatie)
     en levert gegarandeerd de baas-scherf — zo is zelfs een verloren run progressie. */
  if (soort === 'baas' && g.vijanden.some(v => v.id === 'de_erfprins')) {
    /* teller NIET meer daily-gated: de scherven + de finale unlock vuren óók in daily
       (noteerScherf/checkDropsOntwaak hebben geen daily-gate), dus moet de orakel-
       escalatie consistent meelopen — anders blijft de doof-rite-hint in daily op idx 0. */
    Codex.erfprinsOntmoetingen = (Codex.erfprinsOntmoetingen || 0) + 1; bewaarCodex();
    const sid = vindScherf('baas'); if (sid) g.baasScherf = sid;   /* bankt op je stash; de weighty reveal volgt bij de overwinning (botst niet met de baas-intro) */
    /* DE ROOF gebeurt NIET meer hier — ze wordt nu cinematisch getriggerd door je eerste aanval
       (copycatNaSchade → speelKaart → copycatDeRoof), met een vangnet bovenin eindBeurt. */
  }
  if (soort === 'baas') misschienBaasIntro(g);   /* enkel als het slagveld zichtbaar is (niet achter de draai-prompt) */

  /* de metgezel handelt ook op de éérste beurt — even na de entree, zodat
     je 'm ziet binnenkomen voordat hij toeslaat/schildt/geneest */
  if (g.metgezel) setTimeout(() => {
    if (S.gevecht !== g || g.voorbij || g.bezig) return;   /* g.bezig: speler klikte 'Einde beurt' binnen 650ms → metgezel niet mid-vijandbeurt laten handelen (concurrente mutatie); beginSpelerBeurt draait 'm toch elke beurt */
    metgezelBeurt();
    if (alleVijanden().length === 0) { gevechtGewonnen(); return; }
    renderGevecht();
  }, 650);

  /* openingswoorden: in het donker fluistert de diepte, anders sneert een vijand */
  if (soort !== 'baas') {
    setTimeout(() => {
      if (S.gevecht !== g || g.voorbij) return;
      const niveau = lichtNiveau();
      if (niveau === 'gedoofd') {
        spreek(g.speler, UITSPRAKEN._held.gedoofd, 0.7);
      } else if (niveau === 'duister') {
        const v = alleVijanden()[0];
        if (v) spreek(v, UITSPRAKEN._duister, 0.6);
      } else {
        const v = alleVijanden()[Math.floor(Math.random() * alleVijanden().length)];
        if (v && UITSPRAKEN[v.id]) spreek(v, UITSPRAKEN[v.id].start, 0.45);
      }
    }, 700);
  }
}

/* DE SLIJMKONING — metamorfose-intro: Glenn (de eeuwige ja-knikker uit de proloog) →
   Senior Instemmer (de hand op zijn schouder) → verslijmd → de gekroonde Slijmkoning.
   De afdaling ÍS de corruptie. Cross-fade per stadium + slijm-drip, klik = overslaan. */
function toonSlijmkoningIntro(g, b, el) {
  el.classList.add('baas-intro-morf');
  const stadia = [
    { id: 'glenn',           tekst: 'GLENN · medewerker 0042.<br>Hij knikte. Hij glimlachte. Hij stemde overal mee in.' },
    { id: 'glenn_instemmer', tekst: 'Bevorderd tot <b>Senior Instemmer</b> — voor zijn enige talent: ja-zeggen.<br>De hand op zijn schouder liet nooit meer los.' },
    { id: 'glenn_slijm',     tekst: 'Hij boog, en boog… tot zijn ruggengraat oploste.<br>Wie altijd meebuigt, verliest zijn vorm.' },
    { id: 'slijmkoning',     tekst: 'Het systeem dat hem opslokte, kroonde hem koning.<br>Dít blijft er over als je nóóit nee zegt:' },
  ];
  el.innerHTML = `<div class="baas-intro-binnen morf-wrap">
    <small>Act ${huidigeAct()} — ${ACT_NAMEN[huidigeAct()] || 'De Diepte'}</small>
    <div class="morf-podium">
      ${stadia.map((s, i) => `<div class="morf-fase${i === 3 ? ' morf-koning' : ''}" data-i="${i}"></div>`).join('')}
      <div class="morf-drip"></div>
    </div>
    <div class="morf-tekst"></div>
    <div class="morf-titel"><h1>${b.naam}</h1><span>${VIJANDEN[b.id].titel || ''}</span></div>
    <div class="morf-hint">tik om over te slaan</div>
  </div>`;
  $('#scherm-gevecht').appendChild(el);
  const faseEls = Array.from(el.querySelectorAll('.morf-fase'));
  const tekstEl = el.querySelector('.morf-tekst');
  const drip = el.querySelector('.morf-drip');
  stadia.forEach((s, i) => { if (window.laadKarakterAfbeelding) laadKarakterAfbeelding(s.id, img => { if (img) faseEls[i].style.backgroundImage = `url("${img.src}")`; }); });
  let timers = [];
  const STAP = 3900;   /* ms per stadium — ~3,3s leestijd na de tekst-fade (tunebaar); tik = overslaan */
  const toonFase = (i) => {
    faseEls.forEach((f, j) => f.classList.toggle('actief', j === i));
    if (i >= 1) { const pod = el.querySelector('.morf-podium'); if (pod) { pod.classList.remove('flits'); void pod.offsetWidth; pod.classList.add('flits'); } }   /* punctueert de verandering */
    tekstEl.innerHTML = stadia[i].tekst;
    tekstEl.classList.remove('in'); void tekstEl.offsetWidth; tekstEl.classList.add('in');
    if (i >= 2) { drip.classList.remove('drup'); void drip.offsetWidth; drip.classList.add('drup'); Klank.sfx('gif'); }
    else Klank.sfx('klik');
    if (i === 3) {
      el._koning = true;
      Klank.sfx('zwareklap'); setTimeout(() => { if (el.isConnected) { Klank.sfx('dood'); schudScherm(); } }, 480);
      el.querySelector('.morf-titel').classList.add('toon');
      timers.push(setTimeout(() => { if (S.gevecht === g && !g.voorbij) baasSpreekt(baasUitspraken(b.id).intro); }, 1500));
    }
  };
  const sluit = () => { if (el._dicht) return; el._dicht = true; timers.forEach(clearTimeout); el.classList.add('weg'); setTimeout(() => el.remove(), 500); };
  stadia.forEach((s, i) => timers.push(setTimeout(() => { if (!el._dicht && !el._koning) toonFase(i); }, 120 + i * STAP)));
  timers.push(setTimeout(sluit, 120 + 4 * STAP + 1400));
  el.addEventListener('click', () => {
    if (el._dicht) return;
    if (!el._koning) { timers.forEach(clearTimeout); timers = []; toonFase(3); timers.push(setTimeout(sluit, 2600)); }
    else sluit();
  });
}

/* cinematische bazenintro: titelkaart, dreun, beven */
function toonBaasIntro(g) {
  const b = g.vijanden.find(v => VIJANDEN[v.id].baas);
  if (!b) return;
  const el = document.createElement('div');
  el.id = 'baas-intro';
  if (b.id === 'slijmkoning') { toonSlijmkoningIntro(g, b, el); return; }   /* metamorfose i.p.v. de generieke titelkaart */
  const isErf = (b.id === 'de_erfprins');
  if (isErf) {
    /* THE COPYCAT presenteert zichzelf als een SPEELKAART — de enige die hij nooit
       hoefde te stelen. De volle introplaat (assets/karakters/de_erfprins_intro) zit
       in het kaart-frame; emoji-terugval tot de art bestaat. */
    el.classList.add('baas-intro-erfprins');
    el.innerHTML = `<div class="baas-intro-binnen bik-wrap">
      <small>Act ${huidigeAct()} — ${ACT_NAMEN[huidigeAct()] || 'Het Archief'}</small>
      <div class="bik-kaart">
        <div class="bik-tag">ORIGINEEL · GESTOLEN · GEPERFECTIONEERD</div>
        <div class="bik-art">🃏</div>
        <div class="bik-naam">${b.naam}</div>
        <div class="bik-titel">${VIJANDEN[b.id].titel || ''}</div>
        <div class="bik-flavor">„De enige kaart die hij nooit hoefde te stelen — zichzelf."</div>
      </div>
    </div>`;
  } else {
    el.innerHTML = `<div class="baas-intro-binnen">
      <small>Act ${huidigeAct()} — ${ACT_NAMEN[huidigeAct()] || 'De Diepte'}</small>
      <h1>${b.naam}</h1>
      <span>${VIJANDEN[b.id].titel || ''}</span>
    </div>`;
  }
  $('#scherm-gevecht').appendChild(el);
  if (isErf && window.laadKarakterAfbeelding) {
    laadKarakterAfbeelding('de_erfprins_intro', img => {
      const bik = el.querySelector('.bik-art');
      if (img && bik) { bik.style.backgroundImage = `url("${img.src}")`; bik.textContent = ''; bik.classList.add('heeft-art'); }
    });
  }
  /* de baas doemt groot op en zakt naar zijn gevechtsmaat — niet bij de Erfprins (de KAART is de onthulling) */
  const baasArt = isErf ? null : document.querySelector('#scherm-gevecht .is-baas .vijand-art');
  if (baasArt) {
    baasArt.classList.remove('baas-onthuld'); void baasArt.offsetWidth;
    baasArt.classList.add('baas-onthuld');
    setTimeout(() => baasArt.classList.remove('baas-onthuld'), 2800);
  }
  Klank.sfx('zwareklap');
  setTimeout(() => { Klank.sfx('dood'); schudScherm(); }, 700);
  setTimeout(() => el.remove(), 3600);
  setTimeout(() => { if (S.gevecht === g && !g.voorbij && VIJANDEN[b.id].baas) baasSpreekt(baasUitspraken(b.id).intro); }, 3900);
  /* de Erfprins verklapt cryptisch méér naarmate je hem vaker ontmoette (mysterie-escalatie) */
  if (b.id === 'de_erfprins' && UITSPRAKEN._erfprins.orakel && !isOntgrendeld('drops')) {
    const ork = UITSPRAKEN._erfprins.orakel;
    const idx = Math.max(0, Math.min((Codex.erfprinsOntmoetingen || 1) - 1, ork.length - 1));
    setTimeout(() => { if (S.gevecht === g && !g.voorbij) baasSpreekt(ork[idx]); }, 6400);
    /* mysterie rijp maar nog niet ontgrendeld? één omkerende verbod-regel maakt de
       doof-rite leesbaar zonder een knop te tonen (reverse psychology) */
    if (mysterieRijp('drops')) {
      setTimeout(() => { if (S.gevecht === g && !g.voorbij) baasSpreekt('„En blijf van dat lichtje AF. Het hóórt te branden. NIET DOVEN. Begrepen?"'); }, 9200);
    }
  }
  /* látere mysteries (Vlamwachter/Mosgeest): fluister cryptisch de rite zodra rijp — de Codex
     toont hem ook, dit is de in-zaal-nudge. Verklapt de wélke-metgezel niet. */
  if (b.id === 'de_erfprins' && typeof actiefMysterie === 'function') {
    const am = actiefMysterie();
    if (am && am !== 'drops' && mysterieRijp(am)) {
      const fluister = MYSTERIES[am].rite === 'fakkel_helder'
        ? '„Je vlam… hou hem maar hóóg. Iets wáákt erin — en het wacht net op déze slag."'
        : '„Blijf maar héél, jij. Wie híér niet bloedt… díé komt straks iets groens tegemoet."';
      setTimeout(() => { if (S.gevecht === g && !g.voorbij) baasSpreekt(fluister); }, 9200);
    }
  }
  /* GRIEF: heb je Drops geofferd maar is de Witte nog niet terug? De Erfprins claimt de
     overwinning — de wond die de reünie later heelt (zie DROPS-DE-WITTE.md). */
  if (b.id === 'de_erfprins' && Array.isArray(Codex.gevallen) && Codex.gevallen.includes('drops')
      && !isOntgrendeld('drops_wit') && UITSPRAKEN._erfprins.dossier) {
    setTimeout(() => { if (S.gevecht === g && !g.voorbij) baasSpreekt(UITSPRAKEN._erfprins.dossier); }, 6400);
  }
}

/* per frame: 3D renderen + DOM-overlays op spriteposities zetten */
function gevechtTik(dt) {
  if (!S || !S.gevecht) return;
  if (!d3Actief() || !window.Vista) return;
  Vista.tik(dt);
  /* camerazwaai doorvertalen naar parallax op de achtergrondplaat */
  if (S.gevecht.achtergrond && GDOM.bg) {
    const zw = Vista.zwaai();
    GDOM.bg.style.transform = `translate(${(-zw.x * 30).toFixed(1)}px, ${(zw.y * 30).toFixed(1)}px)`;
  }
  const g = S.gevecht;
  /* veilige lijn: naam/hp/statussen mogen nooit de handzone in zakken.
     Afgeleid van de werkelijke onderbalk-hoogte (235px desktop = 252 zoals
     voorheen; 270px telefoon → klopt mee) i.p.v. een vaste 252. */
  const lijn = window.innerHeight - ((GDOM.onderbalkH || 235) + 17);
  g.vijanden.forEach((v, i) => {
    const d = GDOM.vijanden[i];
    const p = Vista.schermPos(v);
    if (!d || !p) return;
    const top = p.topY - 34;
    d.wrap.style.left = p.x + 'px';
    d.wrap.style.top = top + 'px';
    const spacerH = Math.max(0, p.voetY - p.topY);
    const maxSpacer = Math.max(36, lijn - top - (d.infoH || 130));
    d.spacer.style.height = Math.min(spacerH, maxSpacer) + 'px';
  });
  const ps = Vista.schermPos(g.speler);
  if (ps && GDOM.speler) {
    const ds = GDOM.speler;
    ds.wrap.style.left = ps.x + 'px';
    ds.wrap.style.top = ps.topY + 'px';
    const spacerH = Math.max(0, ps.voetY - ps.topY);
    const maxSpacer = Math.max(36, lijn - ps.topY - (ds.infoH || 130));
    ds.spacer.style.height = Math.min(spacerH, maxSpacer) + 'px';
  }
  /* de metgezel heeft GÉÉN 3D-sprite (Vista kent 'm niet) → de DOM-art ís de figuur. Plaats 'm
     links NÁÁST de held op de grondlijn i.p.v. 'm boven op de held te laten vallen (offsets tunebaar). */
  if (ps && GDOM.metgezel && g.metgezel && !g.metgezel.dood) {
    const mw = GDOM.metgezel.wrap;
    mw.style.left = Math.max(78, ps.x - 168) + 'px';   /* genoeg tussenruimte (held ~178px breed) → geen overlap */
    mw.style.top = (ps.voetY - 112) + 'px';             /* voeten op de grondlijn (art begint ~24px in de zone, art = 88px) */
  }
}

function stopGevechtLus() {
  if (gevechtTikAf) { gevechtTikAf(); gevechtTikAf = null; }
  if (window.Vista) Vista.gevechtEind();
  $('#scherm-gevecht').classList.remove('d3-actief');
}

/* grootte-variatie: kleine basics krimpen, een paar imposante wezens groeien (puur
   visueel via transform-scale, origin bottom → geen reflow/grondlijn-breuk). Tunebaar. */
const VIJAND_KLEIN = new Set(['groene_slijm', 'blauwe_slijm', 'grotrat', 'naaper', 'mal_gietsel', 'doorslag_kopie', 'echo', 'pekziel']);
const VIJAND_GROOT = new Set(['steengolem', 'dossierwurm', 'de_deadline', 'de_inktvlek', 'grombaard']);
/* ENTREE-VARIANT per vijand (2D): een eigen binnenkomst op maat van het wezen. Niet vermeld
   = de standaard glij-in-van-rechts. 'geest' = materialiseert traag, ijl, vanuit de zijkant;
   'opborrel' = rijst op uit de grond (vloeistof/slijm). Vrij uit te breiden — zie css .entree-*. */
const VIJAND_ENTREE = {
  echo: 'geest', spiegelwachter: 'geest', pekziel: 'geest', de_uitgewiste: 'geest', de_verzwolgene: 'geest',
  de_inktvlek: 'opborrel', inktklerk: 'opborrel', groene_slijm: 'opborrel', blauwe_slijm: 'opborrel', mal_gietsel: 'opborrel',
};
/* speel de binnenkomst-animatie en ruim de .entree-trigger daarna weer op. Het opruimen is
   nodig omdat de variant-entree op .vijand-art draait (waar ook de idle-'adem' zit): zolang
   .entree blijft staan bezet de entree-animatie die slot → de adem zou nooit terugkeren. */
function triggerEntree(el, delaySec) {
  if (!el) return;
  el.classList.add('entree');
  if (delaySec) el.style.animationDelay = delaySec + 's';
  setTimeout(() => { el.classList.remove('entree'); el.style.animationDelay = ''; }, 2000 + (delaySec || 0) * 1000);
}

/* eenmalige opbouw van de gevechts-DOM */
function bouwGevechtDom(g) {
  GDOM = { vijanden: [], speler: null, metgezel: null, hand: new Map(), bg: $('#gevecht-achtergrond') };

  const rij = $('#vijanden-rij');
  rij.innerHTML = '';
  g.vijanden.forEach((v, i) => {
    const def = VIJANDEN[v.id];
    const wrap = document.createElement('div');
    wrap.className = 'vijand' + (def.baas ? ' is-baas' : '') + (def.elite ? ' is-elite' : '') + (def.episch ? ' is-episch' : '')
      + (VIJAND_KLEIN.has(v.id) ? ' vijand-klein' : '') + (VIJAND_GROOT.has(v.id) ? ' vijand-groot' : '')   /* grootte-variatie (transform-scale, origin bottom → breekt de grondlijn niet) */
      + (VIJAND_ENTREE[v.id] ? ' entree-' + VIJAND_ENTREE[v.id] : '')   /* binnenkomst-variant (de .entree-trigger zet startGevecht/voegVijandToe erbij) */
      + (v.dood ? ' sterft' : '');   /* al gesneuvelde vijand blijft verborgen na een herbouw (voegVijandToe/reveal) — anders 'herrijst' hij zichtbaar */
    wrap.dataset.i = i;
    const art = (window.karakterSvg && karakterSvg(v.id))
      || `${v.art}${def.baas ? '<span class="kroon">👑</span>' : ''}`;
    wrap.innerHTML = `
      <div class="intent-rij"></div>
      <div class="vijand-art">${art}</div>
      <div class="sprite-ruimte"></div>
      <div class="vijand-naam">${v.naam}</div>
      <div class="hp-balk"><div class="hp-vulling"></div><span class="hp-tekst"></span><span class="blok-schild" data-tip="Blok: vangt aanvalsschade op, verdwijnt aan het begin van de eigen beurt"><svg viewBox="0 0 24 28" aria-hidden="true"><path fill="url(#blokgrad)" stroke="#0c1c2e" stroke-width="1.6" d="M12 1 L22 5 V12 C22 19.5 17.5 24.8 12 27 C6.5 24.8 2 19.5 2 12 V5 Z"/></svg><b></b></span></div>
      <div class="blok-status"></div>`;
    rij.appendChild(wrap);
    GDOM.vijanden.push({
      wrap,
      intent: wrap.querySelector('.intent-rij'),
      spacer: wrap.querySelector('.sprite-ruimte'),
      hpV: wrap.querySelector('.hp-vulling'),
      hpT: wrap.querySelector('.hp-tekst'),
      blok: wrap.querySelector('.blok-schild'),
      badges: wrap.querySelector('.blok-status')
    });
    /* eigen karakter-PNG? dan die tonen in de 2D-weergave */
    if (window.laadKarakterAfbeelding) {
      laadKarakterAfbeelding(v.id, img => {
        if (img) wrap.querySelector('.vijand-art').innerHTML = `<img src="${img.src}" alt="${v.naam}">`;
      });
    }
  });

  const zone = $('#speler-zone');
  const heldDef = huidigeHeld();
  const spelerArt = (window.karakterSvg && karakterSvg(heldDef.art)) || '🤺';
  /* FX-lagen over de spelersprite (presentatie: bewust Math.random) */
  const mr = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const bellen = n => Array.from({ length: n }, () =>
    `<span class="bel" style="left:${mr(15, 75)}%; bottom:${mr(5, 30)}%; width:${mr(5, 13)}px; height:${mr(5, 13)}px; --dur:${(2 + Math.random() * 2).toFixed(1)}s; --delay:${(Math.random() * 2.4).toFixed(1)}s; --drift:${mr(-30, 30)}px"></span>`
  ).join('');
  zone.innerHTML = `
    <div id="speler-figuur" class="speler-figuur">${spelerArt}</div>
    <div class="sprite-ruimte"><div id="held-fx">
      <div class="hfx hfx-schild"></div>
      <div class="hfx hfx-cast"><span class="cast-ring"></span><span class="cast-ring" style="--delay:.8s"></span><span class="cast-ring" style="--delay:1.6s"></span></div>
      <div class="hfx hfx-victory"><span class="victory-stralen"></span></div>
      <div class="hfx hfx-vonken">${bellen(8).replaceAll('class="bel"', 'class="bel goud"')}</div>
      <div class="hfx hfx-gif">${bellen(12)}</div>
      <div class="hfx hfx-wond"></div>
    </div></div>
    <div class="speler-naam">${heldDef.naam}</div>
    <div class="hp-balk speler-hp"><div class="hp-vulling"></div><span class="hp-tekst"></span><span class="blok-schild" data-tip="Blok: vangt aanvalsschade op, verdwijnt aan het begin van je beurt"><svg viewBox="0 0 24 28" aria-hidden="true"><path fill="url(#blokgrad)" stroke="#0c1c2e" stroke-width="1.6" d="M12 1 L22 5 V12 C22 19.5 17.5 24.8 12 27 C6.5 24.8 2 19.5 2 12 V5 Z"/></svg><b></b></span></div>
    <div class="blok-status"></div>`;
  GDOM.speler = {
    wrap: zone,
    spacer: zone.querySelector('.sprite-ruimte'),
    hpV: zone.querySelector('.hp-vulling'),
    hpT: zone.querySelector('.hp-tekst'),
    blok: zone.querySelector('.blok-schild'),
    badges: zone.querySelector('.blok-status')
  };
  if (window.laadKarakterAfbeelding) {
    laadKarakterAfbeelding(heldDef.art, img => {
      const fig = $('#speler-figuur');
      if (img && fig) fig.innerHTML = `<img src="${img.src}" alt="${heldDef.naam}">`;
    });
  }

  /* metgezel-zone: staat naast de held. Alleen opgebouwd als er een metgezel meevecht. */
  const mz = $('#metgezel-zone');
  if (mz) {
    if (g.metgezel) {
      const md = METGEZELLEN[g.metgezel.id];
      const synT = synergieTier(g.metgezel.id);
      const synPerk = (window.SYNERGIE && SYNERGIE[g.metgezel.id] && SYNERGIE[g.metgezel.id].perk) || '';
      const synBadge = synT === 'optimaal'
        ? `<span class="metgezel-syn syn-optimaal" data-tip="✨ Optimale band met ${HELDNAAM(S.held)} — +30% effect & HP${synPerk ? ', en ' + synPerk : ''}.">✨</span>`
        : synT === 'goed' ? `<span class="metgezel-syn syn-goed" data-tip="◆ Goede band met ${HELDNAAM(S.held)} — +15% effect & HP.">◆</span>` : '';
      const synTip = synergieLabel(g.metgezel.id);
      mz.hidden = false;
      mz.classList.remove('rouw-zone');
      mz.innerHTML = `
        ${synBadge}
        <div class="metgezel-intent"></div>
        <div class="metgezel-art" data-tip="${md.naam} — ${md.tekst}${synTip ? ' · ' + synTip : ''}">${md.icoon}</div>
        <div class="metgezel-naam">${md.naam}</div>
        <div class="hp-balk metgezel-hp"><div class="hp-vulling"></div><span class="hp-tekst"></span><span class="blok-schild" data-tip="Blok: vangt aanvalsschade op"><svg viewBox="0 0 24 28" aria-hidden="true"><path fill="url(#blokgrad)" stroke="#0c1c2e" stroke-width="1.6" d="M12 1 L22 5 V12 C22 19.5 17.5 24.8 12 27 C6.5 24.8 2 19.5 2 12 V5 Z"/></svg><b></b></span></div>
        <div class="blok-status"></div>
        <button class="metgezel-offer" type="button" onclick="metgezelOpoffering()" hidden></button>`;
      GDOM.metgezel = {
        wrap: mz,
        intent: mz.querySelector('.metgezel-intent'),
        hpV: mz.querySelector('.hp-vulling'),
        hpT: mz.querySelector('.hp-tekst'),
        blok: mz.querySelector('.blok-schild'),
        badges: mz.querySelector('.blok-status'),
        offer: mz.querySelector('.metgezel-offer')
      };
      if (window.laadMetgezelAfbeelding) {
        laadMetgezelAfbeelding(md.art, img => {
          const a = mz.querySelector('.metgezel-art');
          if (img && a) a.innerHTML = `<img src="${img.src}" alt="${md.naam}">`;
        });
      }
    } else if (dropsInRouw()) {
      /* De afwezigheid ÍS de tekst: een gedimd as-silhouet waar Drops stond — niet
         doelbaar, geen HP, geen tooltip. Hergebruikt drops_geest; valt terug op 🐕. */
      mz.hidden = false;
      mz.classList.add('rouw-zone');
      mz.innerHTML = `<div class="rouw-silhouet" aria-hidden="true">🐕</div>`;
      GDOM.metgezel = null;
      if (window.laadMetgezelAfbeelding) {
        laadMetgezelAfbeelding('drops_geest', img => {
          const s = mz.querySelector('.rouw-silhouet');
          if (img && s) { s.textContent = ''; s.style.backgroundImage = `url("${img.src}")`; }
        });
      }
    } else {
      mz.hidden = true;
      mz.classList.remove('rouw-zone');
      mz.innerHTML = '';
      GDOM.metgezel = null;
    }
  }

  $('#hand').innerHTML = '';
}

function trekKaarten(n) {
  const g = S.gevecht;
  for (let i = 0; i < n; i++) {
    if (g.hand.length >= 10) { melding('Je hand is vol!'); break; }
    if (g.trek.length === 0) {
      if (g.afleg.length === 0) break;
      g.trek = schud(g.afleg);
      g.afleg = [];
    }
    g.hand.push(g.trek.pop());
    Klank.sfx('trek');
  }
}

/* intentie-weergave: bereken echte schade incl. modifiers.
   Bij weinig licht zie je minder: duister = geen getallen, gedoofd = niets. */
function intentTekst(v) {
  const it = v.intent;
  if (!it) return '';
  /* de Fluisterende Schedel ziet wat jij niet ziet; Drops de Witte is je levende licht
     (ook blind zie je elke intent zolang hij leeft) */
  const witLeeft = !!(gMet() && !gMet().dood && gMet().id === 'drops_wit');
  const niveau = (witLeeft || heeftRelikwie('fluisterende_schedel')) ? 'helder' : lichtNiveau();
  if (niveau === 'gedoofd') {
    return `<span class="intent intent-duister" data-tip="Het is te donker om de bedoeling te zien">❓</span>`;
  }
  const verborgen = niveau === 'duister';
  if (it.type === 'aanval') {
    if (verborgen) {
      return `<span class="intent intent-aanval" data-tip="${it.naam}: valt aan — te donker om te zien hoe hard">⚔️ ?</span>`;
    }
    const mDoel = it.doelMetgezel ? gMet() : null;
    const richtMet = !!(mDoel && !mDoel.dood);   /* een intent kan de metgezel viseren (it.doelMetgezel) */
    let dmg = actDmg(it.dmg) + (v.status.kracht || 0);   /* zelfde act-schaling als de echte klap */
    if ((v.status.zwak || 0) > 0) dmg = Math.floor(dmg * 0.75);
    if (((richtMet ? mDoel : sp()).status.kwetsbaar || 0) > 0) dmg = Math.floor(dmg * 1.5);
    const merk = richtMet ? ` → ${METGEZELLEN[mDoel.id].icoon}` : '';
    const tipWie = richtMet ? METGEZELLEN[mDoel.id].naam : 'jou';
    return `<span class="intent intent-aanval${richtMet ? ' intent-viseert-mg' : ''}" data-tip="${it.naam}: valt ${tipWie} aan voor ${dmg}${it.hits ? '×' + it.hits : ''} schade">⚔️ ${dmg}${it.hits ? '×' + it.hits : ''}${merk}</span>`;
  }
  if (it.type === 'steel') {
    return `<span class="intent intent-steel" data-tip="De Copycat kijkt je sterkste recente kaart af om die te stelen">👀 steelt</span>`;
  }
  if (it.type === 'plagiaat') {
    if (verborgen) return `<span class="intent intent-debuff" data-tip="Plagiaat — te donker om te zien wát hij terugspeelt">🎭 ?</span>`;
    const pips = (it.plan || []).map(k => k.soort === 'aanval'
      ? `<span class="intent intent-aanval" data-tip="Plagiaat — JOUW ${k.naam} voor ${k.eindDmg} schade">🎭 ${k.eindDmg}</span>`
      : `<span class="intent intent-debuff" data-tip="Plagiaat — JOUW ${k.naam}">🎭 ${k.naam}</span>`).join(' ');
    return pips || `<span class="intent intent-debuff" data-tip="Plagiaat">🎭</span>`;
  }
  if (it.type === 'blok') {
    return `<span class="intent intent-blok" data-tip="${it.naam}: verdedigt zich">🛡️ ${verborgen ? '?' : it.blok}</span>`;
  }
  if (it.type === 'buff') return `<span class="intent intent-buff" data-tip="${it.naam}: versterkt zichzelf">💪</span>`;
  return `<span class="intent intent-debuff" data-tip="${it.naam}: verzwakt jou">🌀</span>`;
}

function statusBadges(actor) {
  return Object.entries(actor.status)
    .filter(([k, n]) => n > 0 && STATUSINFO[k])
    .map(([k, n]) => {
      const i = STATUSINFO[k];
      return `<span class="status ${i.goed ? 's-goed' : 's-slecht'}" data-tip="${i.naam}: ${i.uitleg}">${i.icoon}<b>${n}</b></span>`;
    }).join('');
}

/* gerichte update: muteert alleen wat veranderd is */
function renderGevecht() {
  const g = S.gevecht;
  if (!g) return;

  /* bazenbalk: grote levensbalk + fase-pips bovenin */
  const bb = $('#baas-balk');
  if (bb) {
    const b = g.soort === 'baas' ? g.vijanden.find(v => VIJANDEN[v.id].baas) : null;
    $('#scherm-gevecht').classList.toggle('baas-actief', !!b);
    if (b) {
      bb.style.display = 'block';
      bb.dataset.baas = b.id;   /* per-baas kleuring van het HP-hart/de balk (zie css) */
      bb.innerHTML = `
        <div class="bb-naam">👑 ${b.naam}</div>
        ${VIJANDEN[b.id].titel ? `<div class="bb-titel">~ ${VIJANDEN[b.id].titel} ~</div>` : ''}
        <div class="bb-balk ${(b.fase || 1) >= 3 ? 'bb-woede' : ''}" style="--hp:${Math.max(0, Math.round(b.hp / b.maxHp * 100))}">
          <div class="bb-vul" style="width:${Math.max(0, b.hp / b.maxHp * 100)}%"></div>
          <span class="bb-tekst">${b.hp}/${b.maxHp}</span>
        </div>
        <div class="bb-fases" data-tip="De baas vecht in drie bedrijven — verzwak hem en zie wat er gebeurt...">
          ${[1, 2, 3].map(f => `<span class="bb-pip ${(b.fase || 1) >= f ? 'aan' : ''}"></span>`).join('')}
        </div>
        ${VIJANDEN[b.id] && VIJANDEN[b.id].copycat ? copycatBalk(b) : ((b.aegis || 0) > 0 ? `<div class="bb-aegis" data-tip="Onaantastbaar.">🟡 ${b.aegis}</div>` : '')}`;
    } else {
      bb.style.display = 'none';
    }
  }

  /* blok-schild op de hp-balk: tonen, bijwerken, en 'plop' bij toename;
     de hele hp-balk kleurt staalblauw zolang er blok staat */
  const zetBlokSchild = (el, blok) => {
    if (!el) return;
    const oud = parseInt(el.dataset.w || '0', 10);
    el.style.display = blok > 0 ? 'flex' : 'none';
    el.querySelector('b').textContent = blok;
    const balk = el.closest('.hp-balk');
    if (balk) balk.classList.toggle('geblokt', blok > 0);
    if (blok > oud) { el.classList.remove('blok-plop'); void el.offsetWidth; el.classList.add('blok-plop'); }
    el.dataset.w = blok;
  };

  g.vijanden.forEach((v, i) => {
    const d = GDOM.vijanden[i];
    if (!d) return;
    const doelbaar = (g.gekozenKaart !== null || g.gekozenDrank !== null) && !v.dood;
    d.wrap.classList.toggle('sterft', v.dood);
    d.wrap.classList.toggle('doelbaar', doelbaar);
    d.intent.innerHTML = v.dood ? '' : intentTekst(v);
    d.hpV.style.width = Math.max(0, v.hp / v.maxHp * 100) + '%';
    d.hpT.textContent = `${v.hp}/${v.maxHp}`;
    zetBlokSchild(d.blok, v.blok);
    d.badges.innerHTML = statusBadges(v);
  });

  const s = g.speler, ds = GDOM.speler;
  ds.hpV.style.width = (S.hp / S.maxHp * 100) + '%';
  ds.hpT.textContent = `${S.hp}/${S.maxHp}`;
  zetBlokSchild(ds.blok, s.blok);
  ds.badges.innerHTML = statusBadges(s);
  /* status-FX: gifbellen zolang vergiftigd, wond-puls onder 30% HP */
  ds.wrap.classList.toggle('hfx-gif-aan', (s.status.gif || 0) > 0);
  ds.wrap.classList.toggle('hfx-wond-aan', S.hp / S.maxHp < 0.3);

  /* metgezel: eigen HP-balk, blok, statussen, intentie-hint en opoffer-knop */
  if (g.metgezel && GDOM.metgezel) {
    const m = g.metgezel, dm = GDOM.metgezel;
    dm.wrap.classList.toggle('gevlucht', m.dood);
    dm.hpV.style.width = Math.max(0, m.hp / m.maxHp * 100) + '%';
    dm.hpT.textContent = `${m.hp}/${m.maxHp}`;
    zetBlokSchild(dm.blok, m.blok);
    dm.badges.innerHTML = statusBadges(m);
    dm.intent.innerHTML = m.dood ? '' : metgezelIntentTekst(m);
    if (dm.offer) {
      const def = METGEZELLEN[m.id];
      const kan = !m.dood && def.opoffering && def.opoffering.beschikbaar(g);
      dm.offer.hidden = !kan;
      if (kan && !dm.offer.textContent) {
        dm.offer.textContent = '🔥 ' + def.opoffering.naam;
        dm.offer.dataset.tip = def.opoffering.tekst + ' Hierna is ' + def.naam + ' VOORGOED weg.';
      }
    }
  }

  /* LEES-fase: pas NA alle DOM-schrijfacties de hoogtes meten — zo dwingt de
     infoblok-/onderbalk-meting hoogstens één layout-flush af i.p.v. een reflow
     per vijand. infoH voedt de 2D-spacer-klem (gelezen in positioneerActors). */
  g.vijanden.forEach((v, i) => {
    const d = GDOM.vijanden[i];
    if (d) d.infoH = d.wrap.offsetHeight - d.spacer.offsetHeight;
  });
  ds.infoH = ds.wrap.offsetHeight - ds.spacer.offsetHeight;
  const ob = $('#onderbalk');
  if (ob) GDOM.onderbalkH = ob.offsetHeight;

  renderHand();

  $('#energie-orb').innerHTML = `<b>${g.energie}</b>/${g.maxEnergie}`;
  $('#stapel-trek').innerHTML = `🂠 ${g.trek.length}`;
  $('#stapel-afleg').innerHTML = `🗂️ ${g.afleg.length}`;
  $('#knop-eindbeurt').disabled = g.bezig;
  $('#beurt-label').textContent = 'Beurt ' + (g.beurt + 1);
  renderTopbalk();
}

/* ---------- hand: verzoening op uid (kaarten behouden hun element) ---------- */
/* kaart-icoon: eigen art uit assets/kaarten/ indien aanwezig, anders emoji */
function zetKaartIcoon(icoonEl, kaartId) {
  if (!window.laadKaartAfbeelding) return;
  laadKaartAfbeelding(kaartId, img => {
    if (img) icoonEl.innerHTML = `<img src="${img.src}" alt="">`;
  });
}

function verfraaiKaartIconen(wortel) {
  (wortel || document).querySelectorAll('.kaart-icoon[data-kicoon]').forEach(el => {
    zetKaartIcoon(el, el.dataset.kicoon);
  });
}

/* het relikwieënboek: groot beeld, schaarste, effect en het verhaal erachter */
function toonRelikwieBoek(id) {
  const d = RELIKWIEEN[id];
  if (!d) return;
  $('#relikwie-boek').innerHTML = `
    <div class="boek-kaart rel-${d.zeld || 'gewoon'}">
      <div class="boek-icoon" data-rart="${id}">${d.icoon}</div>
      <span class="schaarste-chip rel-${d.zeld || 'gewoon'}">${SCHAARSTE_LABEL[d.zeld] || 'Relikwie'}</span>
      <h3>${d.naam}</h3>
      <p class="boek-effect">${d.tekst}</p>
      ${d.lore ? `<p class="boek-lore">„${d.lore}"</p>` : ''}
      <button class="knop-groot" onclick="$('#overlay-relikwie').classList.remove('open')">Sluit</button>
    </div>`;
  verfraaiItemArt($('#relikwie-boek'));
  $('#overlay-relikwie').classList.add('open');
  Klank.sfx('klik');
}

/* ---------- het Codex-scherm: verzamel ze allemaal ---------- */
/* ---------- Fase 4: signposting van het Metgezel-Mysterie ----------
   Maakt zichtbaar dat verliezen/ontmoeten progressie is: een Codex-sectie met de
   gevonden scherven (of een bron-gelabelde ❓) en een duiding-regel op het
   nederlaagscherm. Generiek over alle MYSTERIES; toont een mysterie pas zodra je
   er minstens één scherf van vond, en verbergt het zodra het is opgelost. */
function mysterieBronLabel(bron) {
  return bron === 'baas' ? 'nog te horen uit de mond van de baas'
    : bron === 'figuur' ? 'nog te vinden bij een mysterieuze figuur'
    : bron === 'episch' ? 'nog te winnen van een epische vijand'
    : 'nog ergens in het donker';
}
/* het sterkst gevorderde nog-open mysterie (of null) */
function meestGevorderdeMysterie() {
  const M = window.MYSTERIES; if (!M) return null;
  /* live platte stash lezen (gebankte + gedragen scherven), NIET het dode
     Codex.mysteries[mid].scherven dat de Drempel-aanpak niet meer vult — anders bleef de
     nederlaag-duidingregel ('Verlies wás progressie — n/3') altijd leeg. Zelfde bron als scherfCodexBlok. */
  const heeft = sid => scherfStash().includes(sid) || gedragen().includes(sid);
  let best = null;
  Object.keys(M).forEach(mid => {
    if (isOntgrendeld(mid)) return;
    const vereist = M[mid].vereist || [];
    const aantal = vereist.filter(heeft).length;
    if (!aantal) return;
    if (!best || aantal > best.aantal) best = { mid, aantal, rijp: aantal >= vereist.length };
  });
  return best;
}
/* hoe voltooi je een rijp mysterie? Wél richtinggevend (de speler verdiende het door alle
   scherven te vinden), maar nog steeds thematisch — verklapt de WÉLKE-metgezel niet. */
function mysterieRiteHint(mid) {
  const def = window.MYSTERIES && MYSTERIES[mid];
  const rite = def && def.rite;
  if (rite === 'fakkel_helder') return 'Versla de Erfprins met je fakkel nog <b>helder</b> brandend.';
  if (rite === 'baas_hoge_hp')  return 'Versla de Erfprins <b>zonder zwaar te bloeden</b> — blijf heel.';
  return 'Het antwoord wacht in het <b>donker dat je niet dúrft te maken</b> — bij de Erfprins.';
}
/* de Codex-sectie "Onopgeloste Mysteries" (lege string als er niets te tonen is) */
/* SCHERVEN-COLLECTIE in de Codex: alle 9 (3 trio's) — gevonden = fragment-art, rest = ❓.
   Leest de PLATTE stash (Codex.scherven) + de gedragen tas; het oude mysterieCodexBlok hing aan
   Codex.mysteries[mid].scherven dat de Drempel-aanpak niet meer vult (→ leeg). Spoilt niet WELKE
   metgezel een trio wekt (geen namen), wél hoeveel je hebt + dat 3-die-passen een bondgenoot roept. */
function scherfCodexBlok() {
  const M = window.MYSTERIES; if (!M) return '';
  const heeft = sid => scherfStash().includes(sid) || gedragen().includes(sid);
  const alle = alleScherfIds();
  const gevonden = alle.filter(heeft).length;
  const trios = Object.keys(M).map(mid => {
    const vereist = M[mid].vereist || [];
    if (!vereist.length) return '';
    const ontg = isOntgrendeld(mid);
    const n = vereist.filter(heeft).length;
    const slots = vereist.map(sid => {
      const d = scherfDef(sid);
      return heeft(sid)
        ? `<div class="scherf-cx-slot vol" data-shart="${sid}" data-tip="${(d && d.codexTekst) || ''}">${d ? bronIcoon(d.bron) : '🜂'}</div>`
        : `<div class="scherf-cx-slot leeg" data-tip="??? — nog te vinden (${mysterieBronLabel(d && d.bron)})">❓</div>`;
    }).join('');
    const klasse = ontg ? 'ontgrendeld' : (n === vereist.length ? 'compleet' : '');
    const label = ontg ? '✓ bondgenoot ontwaakt' : (n === vereist.length ? '✦ trio compleet — naar De Drempel' : n + '/' + vereist.length);
    return `<div class="scherf-cx-trio ${klasse}"><div class="scherf-cx-slots">${slots}</div><small>${label}</small></div>`;
  }).join('');
  return `<h3 class="codex-kop">🜂 Scherven <small>${gevonden} / ${alle.length}</small></h3>
    <p class="codex-scherf-uitleg">Drie scherven die samenpassen roepen bij De Drempel (Act 1→2) een bondgenoot op. Wat je veilig bankt, blijft over al je afdalingen heen.</p>
    <div class="scherf-cx-rooster">${trios}</div>`;
}

function mysterieCodexBlok() {
  const M = window.MYSTERIES; if (!M) return '';
  const blokken = [];
  Object.keys(M).forEach(mid => {
    const def = M[mid];
    const m = Codex.mysteries && Codex.mysteries[mid];
    const gevonden = (m && Array.isArray(m.scherven)) ? m.scherven : [];
    if (!gevonden.length || (m && m.voltooid)) return;   /* toon enkel met ≥1 scherf en nog niet opgelost */
    const vereist = def.vereist || [];
    const slots = vereist.map(sid => {
      const sdef = (def.scherven && def.scherven[sid]) || {};
      return gevonden.includes(sid)
        ? `<div class="mys-scherf gevonden"><span class="mys-scherf-art" data-shart="scherf_${sdef.bron}">🜂</span> <i>${sdef.codexTekst || '…'}</i></div>`
        : `<div class="mys-scherf"><span class="mys-vraag">❓</span> <small>${mysterieBronLabel(sdef.bron)}</small></div>`;
    }).join('');
    const balk = '▰'.repeat(gevonden.length) + '▱'.repeat(Math.max(0, vereist.length - gevonden.length));
    const voortgang = `<p class="mys-voortgang"><span class="mys-balk">${balk}</span> <b>${gevonden.length}/${vereist.length}</b> scherven</p>`;
    const staart = (m && m.rijp)
      ? `<p class="mys-rijp">De scherven passen samen. ${mysterieRiteHint(mid)}</p>`
      : `<p class="mys-rest"><i>Verlies wás progressie — er ontbreekt nog een scherf.</i></p>`;
    blokken.push(`<div class="mys-blok ${(m && m.rijp) ? 'rijp' : ''}"><h4 class="mys-titel">🜂 Een onopgelost mysterie</h4>${slots}${voortgang}${staart}</div>`);
  });
  if (!blokken.length) return '';
  return `<h3 class="codex-kop">🜂 Onopgeloste Mysteries</h3><div class="mys-lijst">${blokken.join('')}</div>`;
}
/* de duiding-regel op het nederlaagscherm (Act 2+, bij een open mysterie) */
function mysterieDuiding() {
  if (typeof huidigeAct === 'function' && huidigeAct() < 2) return '';
  const best = meestGevorderdeMysterie();
  if (!best) return '';
  const totaal = ((window.MYSTERIES[best.mid].vereist) || []).length;
  const regel = best.rijp
    ? 'De scherven passen samen — maar het antwoord wacht in het donker dat je niet dúrft te maken.'
    : best.aantal >= 2
      ? 'Twee scherven nu. Het beeld wordt scherper — en vreemder.'
      : 'Je zag iets in het donker. Dit was geen einde, maar een scherf.';
  return `<p class="einde-mysterie">🜂 ${regel} <b>(${best.aantal}/${totaal})</b></p>`;
}

function toonCodex() {
  const volgorde = ['start', 'gewoon', 'ongewoon', 'zeldzaam', 'episch'];
  const rels = Object.keys(RELIKWIEEN).sort((a, b) =>
    volgorde.indexOf(RELIKWIEEN[a].zeld) - volgorde.indexOf(RELIKWIEEN[b].zeld));
  const relOntdekt = rels.filter(r => Codex.relikwieen.includes(r)).length;
  const dranks = Object.keys(DRANKEN);
  const drOntdekt = dranks.filter(d => Codex.dranken.includes(d)).length;
  /* alleen DAADWERKELIJK vrijspeelbare metgezellen tellen mee: drops_wit is een variant van
     'drops' (geen apart slot, dus niet apart geteld). drops/vlamwachter/mosgeest hebben elk een
     eigen mysterie (scherven + rite) → ze tellen mee. Voeg een id toe aan VRIJSPEELBARE_MG zodra
     zijn unlock-bron bestaat, anders is de Codex onafmaakbaar (100% onbereikbaar). */
  const VRIJSPEELBARE_MG = new Set(['drops', 'vlamwachter', 'mosgeest']);
  const mgs = Object.keys(METGEZELLEN).filter(id => VRIJSPEELBARE_MG.has(id)).sort((a, b) =>
    volgorde.indexOf(METGEZELLEN[a].zeld) - volgorde.indexOf(METGEZELLEN[b].zeld));
  const mgOntdekt = mgs.filter(m => Codex.metgezellen.includes(m)).length;
  /* loopbaan-blok: totalen + de laatste afdalingen (het opstapelende spoor) */
  const loop = loopbaanRegel();
  const gesch = (Codex.gesch || []).slice(0, 5);
  const loopbaanBlok = loop ? `
    <h3 class="codex-kop">🗺️ Loopbaan</h3>
    <p class="codex-loopbaan">${loop}</p>` +
    (gesch.length ? `<div class="codex-runs">` + gesch.map(g =>
      `<div class="codex-run ${g.gewonnen ? 'gewonnen' : ''}"><span>${g.gewonnen ? '👑' : '💀'} ${HELDNAAM(g.held)}</span><small>rij ${g.diepte}${g.asc ? ` · A${g.asc}` : ''} · ${g.seed}</small></div>`
    ).join('') + `</div>` : '') : '';
  $('#codex-inhoud').innerHTML = loopbaanBlok + `
    <h3 class="codex-kop">🏺 Relikwieën <small>${relOntdekt} / ${rels.length}</small></h3>
    <div class="codex-rooster">` +
    rels.map(r => {
      const d = RELIKWIEEN[r];
      if (!Codex.relikwieen.includes(r)) {
        return `<div class="codex-slot leeg" data-tip="??? — nog niet ontdekt">❓</div>`;
      }
      const start = d.zeld === 'start';
      const geladen = !start && Codex.opgeladen.includes(r);
      const schrijnTip = start ? '' : (geladen ? ' · 🗝️ opgeladen voor het Schrijn' : ' · lading opgebruikt — vind hem opnieuw');
      return `<div class="codex-slot rel-${d.zeld} ${!start && !geladen ? 'verbruikt' : ''}" data-rart="${r}" data-tip="${d.naam}${schrijnTip} (klik voor het verhaal)" onclick="toonRelikwieBoek('${r}')">${d.icoon}${geladen ? '<span class="codex-lading">🗝️</span>' : ''}</div>`;
    }).join('') + `</div>
    <h3 class="codex-kop">🧪 Drankjes <small>${drOntdekt} / ${dranks.length}</small></h3>
    <div class="codex-rooster">` +
    dranks.map(id => {
      const d = DRANKEN[id];
      if (!Codex.dranken.includes(id)) {
        return `<div class="codex-slot leeg" data-tip="??? — nog niet ontdekt">❓</div>`;
      }
      return `<div class="codex-slot" style="--dkleur:${d.kleur}" data-dart="${id}" data-tip="${d.naam} — klik voor het verhaal" onclick="bekijkDrank(event, '${id}')">${d.icoon}</div>`;
    }).join('') + `</div>
    <h3 class="codex-kop">🐾 Metgezellen <small>${mgOntdekt} / ${mgs.length}</small></h3>
    <div class="codex-rooster">` +
    mgs.map(id => {
      const d = METGEZELLEN[id];
      if (!Codex.metgezellen.includes(id)) {
        return `<div class="codex-slot leeg" data-tip="??? — nog niet ontmoet">❓</div>`;
      }
      const gevallen = Codex.gevallen.includes(id);
      const wit = (id === 'drops') && isOntgrendeld('drops_wit');   /* de gedenkplek transformeert van ✝ naar 🤍 */
      const mgart = wit ? 'drops_wit' : (gevallen ? id + '_geest' : id);
      const tip = wit ? ' · 🤍 keerde terug uit het zwart' : (gevallen ? ' · ✝ offerde zich op' : '');
      return `<div class="codex-slot rel-${d.zeld} ${gevallen && !wit ? 'gevallen' : ''}" data-mgart="${mgart}" data-tip="${d.naam}${tip} — klik voor het verhaal" onclick="toonMetgezelBoek('${id}')">${wit ? '🤍' : d.icoon}${gevallen && !wit ? '<span class="codex-kruis">✝</span>' : ''}</div>`;
    }).join('') + `</div>` + scherfCodexBlok() + `
    <p class="codex-voet">Alles wat je ooit vond, over alle runs heen. ${relOntdekt + drOntdekt + mgOntdekt === rels.length + dranks.length + mgs.length ? 'De Codex is compleet — de diepte heeft geen geheimen meer voor jou! 🏆' : 'Vind ze allemaal...'}<br>
    <small>🗝️ = opgeladen: dit relikwie kun je bij een nieuwe run éénmalig meenemen uit het Schrijn.</small></p>`;
  verfraaiItemArt($('#overlay-codex'));   /* incl. het Codex-titelicoon (data-icoon) */
  $('#overlay-codex').classList.add('open');
  Klank.sfx('klik');
}

/* ============================================================
   HET BESTIARIUM — een doorbladerbaar artbook van de vijanden.
   Een vijand verschijnt PAS nadat je 'm écht hebt ontmoet (Codex.gezien).
   ============================================================ */
function bestiariumLijst(act) {
  return Object.keys(BESTIARIUM).filter(id => (BESTIARIUM[id].act || 1) === act);   /* roster-volgorde */
}
function toonBestiarium(act) {
  act = act || 1;
  const lijst = bestiariumLijst(act);
  const gezien = id => (Codex.gezien || []).includes(id);
  const gezienN = lijst.filter(gezien).length;
  const slots = lijst.map(id => {
    const def = VIJANDEN[id], b = BESTIARIUM[id];
    if (!gezien(id)) return `<div class="best-slot leeg" data-tip="??? — nog niet tegengekomen"><span class="best-art">❓</span><span class="best-naam">???</span></div>`;
    return `<button class="best-slot" onclick="toonBestiariumPagina('${id}')">
        <span class="best-art" data-vart="${id}">${def.art || '❓'}</span>
        <span class="best-naam">${def.naam}</span>
        <span class="best-soort">${b.soort || ''}</span>
      </button>`;
  }).join('');
  /* act-tabs: zodra het Bestiarium meerdere acts bevat, kun je tussen Act 1/Act 2 wisselen */
  const acts = [...new Set(Object.values(BESTIARIUM).map(b => b.act || 1))].sort((a, b) => a - b);
  const tabs = acts.length > 1
    ? `<div class="best-tabs">` + acts.map(a => `<button class="best-tab${a === act ? ' actief' : ''}" onclick="toonBestiarium(${a})">Act ${a} · ${ACT_NAMEN[a] || ''}</button>`).join('') + `</div>`
    : '';
  const klaarTekst = act >= 2 ? 'Je kent elke kopie van het Archief. 🏆' : 'Je kent elke schaduw van de eerste afdaling. 🏆';
  $('#bestiarium-inhoud').innerHTML = `
    ${tabs}
    <p class="best-intro">Wat in de diepte huist — maar enkel wat jij met eigen ogen zag. <b>${gezienN} / ${lijst.length}</b> ontdekt.</p>
    <div class="best-rooster">${slots}</div>
    <p class="best-voet">${gezienN < lijst.length ? 'Daal verder af om de rest te ontmoeten…' : klaarTekst}</p>`;
  verfraaiItemArt($('#overlay-bestiarium'));
  $('#overlay-bestiarium').classList.add('open');
  Klank.sfx('klik');
}
const _BEST_POSES = ['attack', 'hit', 'cast', 'block', 'death'];
let _bestPoseStand = {};   /* cyclische pose-stand per vijand-id (bestiarium-portret, à la heldPose) */
function toonBestiariumPagina(id) {
  const def = VIJANDEN[id], b = BESTIARIUM[id];
  if (!def || !b || !(Codex.gezien || []).includes(id)) return;
  const lijst = bestiariumLijst(b.act || 1).filter(x => (Codex.gezien || []).includes(x));   /* blader enkel door wat je zag */
  const idx = lijst.indexOf(id);
  const vorige = lijst[(idx - 1 + lijst.length) % lijst.length];
  const volgende = lijst[(idx + 1) % lijst.length];
  const u = (typeof UITSPRAKEN !== 'undefined' && UITSPRAKEN[id]) || null;
  const citaat = (u && u.start && u.start[0]) || '';
  const poseWoord = document.body.dataset.modus === 'mobiel' ? '👆 tik' : '🖱️ klik';
  $('#bestiarium-inhoud').innerHTML = `
    <div class="best-pagina">
      <button type="button" class="best-portret" data-vart="${id}" onclick="bestPose('${id}', event)" aria-label="Toon ${def.naam} in actie (tik voor z'n poses)">${def.art || '❓'}</button>
      <div class="best-pose-hint" hidden>${poseWoord} voor z'n poses</div>
      <span class="best-soort-chip">${b.soort || ''}${def.hp ? ` · ❤️ ${def.hp[0]}${def.hp[1] !== def.hp[0] ? '–' + def.hp[1] : ''}` : ''}</span>
      <h3 class="best-titel">${def.naam}${def.titel ? ` <small>— ${def.titel}</small>` : ''}</h3>
      ${citaat ? `<p class="best-citaat">„${citaat}"</p>` : ''}
      <p class="best-lore">${b.lore}</p>
      ${b.notitie ? `<p class="best-notitie">— ${b.notitie}</p>` : ''}
      <div class="best-nav">
        <button class="knop-stil" onclick="toonBestiariumPagina('${vorige}')" data-tip="${VIJANDEN[vorige].naam}">◀</button>
        <button class="knop-stil" onclick="toonBestiarium(${b.act || 1})">Overzicht</button>
        <button class="knop-stil" onclick="toonBestiariumPagina('${volgende}')" data-tip="${VIJANDEN[volgende].naam}">▶</button>
      </div>
    </div>`;
  verfraaiItemArt($('#overlay-bestiarium'));   /* basis-portret-art inladen (data-vart) */
  /* ontdek welke poses deze vijand écht heeft → toon de tik-hint pas dan (anders misleidt
     de hint bij een vijand met enkel een basis-portret). De pose-strip is vervangen door
     het tikbare portret (cyclt door de bestaande poses, net als de heldenkeuze). */
  _bestPoseStand[id] = 0;
  const portretEl = document.querySelector('#bestiarium-inhoud .best-portret');
  const hintEl = document.querySelector('#bestiarium-inhoud .best-pose-hint');
  if (window.laadKarakterAfbeelding && portretEl) {
    _BEST_POSES.forEach(p => laadKarakterAfbeelding(id + '_' + p, img => {
      if (img && hintEl && hintEl.hidden) { hintEl.hidden = false; portretEl.classList.add('heeft-poses'); }
    }));
  }
  $('#overlay-bestiarium').classList.add('open');
  Klank.sfx('klik');
}

/* tik op het bestiarium-portret → speel de volgende bestaande pose (attack/hit/cast/block/death),
   cyclisch, met auto-terug naar de basis — precies zoals de levende heldenkeuze (heldPose).
   Ontbrekende pose-art wordt overgeslagen (laadKarakterAfbeelding geeft null) zodat een tik altijd
   op een bestaande pose landt; bestaat er geen enkele, dan blijft de basis staan. */
const _BEST_POSE_SFX = { attack: 'kaart', cast: 'buff', block: 'buff', hit: 'fout', death: 'fout' };
function bestPose(id, e) {
  if (e) e.stopPropagation();
  const def = VIJANDEN[id];
  const el = document.querySelector('#bestiarium-inhoud .best-portret');
  if (!def || !el || !window.laadKarakterAfbeelding) return;
  if (!el.querySelector('img')) return;   /* nog emoji/geen basis-art geladen → niets te poseren */
  const hint = document.querySelector('#bestiarium-inhoud .best-pose-hint');
  if (hint) hint.style.visibility = 'hidden';
  let pogingen = 0;
  const probeer = () => {
    if (pogingen++ >= _BEST_POSES.length) return;   /* geen enkele pose-art gevonden → laat de basis staan */
    const i = (_bestPoseStand[id] || 0) % _BEST_POSES.length;
    _bestPoseStand[id] = i + 1;
    const pose = _BEST_POSES[i];
    laadKarakterAfbeelding(id + '_' + pose, img => {
      const im = el.querySelector('img');
      if (!img || !im) { probeer(); return; }       /* deze pose bestaat niet → volgende proberen */
      im.src = img.src;
      el.classList.remove('best-portret-poseert'); void el.offsetWidth; el.classList.add('best-portret-poseert');
      Klank.sfx(_BEST_POSE_SFX[pose] || 'klik');
      clearTimeout(el._poseTimer);
      el._poseTimer = setTimeout(() => {
        laadKarakterAfbeelding(id, terug => {
          const im3 = el.querySelector('img');
          if (terug && im3) im3.src = terug.src;
        });
        el.classList.remove('best-portret-poseert');
      }, 1100);
    });
  };
  probeer();
}
window.bestPose = bestPose;

/* het drankjesboek: zelfde altaarkaart, met de kleur van het brouwsel */
function bekijkDrank(e, id) {
  if (e) e.preventDefault();
  const d = DRANKEN[id];
  if (!d) return;
  const kl = d.kleur || '#9fb8c8';
  const rgb = `${parseInt(kl.slice(1, 3), 16)}, ${parseInt(kl.slice(3, 5), 16)}, ${parseInt(kl.slice(5, 7), 16)}`;
  $('#relikwie-boek').innerHTML = `
    <div class="boek-kaart" style="--relk:${rgb}">
      <div class="boek-icoon" data-dart="${id}">${d.icoon}</div>
      <span class="schaarste-chip" style="--relk:${rgb}">Drankje</span>
      <h3>${d.naam}</h3>
      <p class="boek-effect">${d.tekst}${d.doel === 'vijand' ? ' <i>(richt op een vijand)</i>' : ''}</p>
      ${d.lore ? `<p class="boek-lore">„${d.lore}"</p>` : ''}
      <button class="knop-groot" onclick="$('#overlay-relikwie').classList.remove('open')">Sluit</button>
    </div>`;
  verfraaiItemArt($('#relikwie-boek'));
  $('#overlay-relikwie').classList.add('open');
  Klank.sfx('klik');
  return false;
}

/* het metgezelboek: portret, effect en het verhaal erachter */
function toonMetgezelBoek(id) {
  const d = METGEZELLEN[id];
  if (!d) return;
  const rgb = '255, 156, 63';   /* ember */
  $('#relikwie-boek').innerHTML = `
    <div class="boek-kaart" style="--relk:${rgb}">
      <div class="boek-icoon" data-mgart="${(id === 'drops' && isOntgrendeld('drops_wit')) ? 'drops_wit' : ((Codex.gevallen || []).includes(id) ? id + '_geest' : id)}">${(id === 'drops' && isOntgrendeld('drops_wit')) ? '🤍' : d.icoon}</div>
      <span class="schaarste-chip" style="--relk:${rgb}">${SCHAARSTE_LABEL[d.zeld] || 'Metgezel'}</span>
      <h3>${d.naam}</h3>
      <p class="boek-effect">${d.tekst}</p>
      ${synergieBoekHtml(id)}
      ${d.lore ? `<p class="boek-lore">„${d.lore}"</p>` : ''}
      ${(id === 'drops' && isOntgrendeld('drops_wit'))
        ? '<p class="boek-gevallen">🤍 Offerde zich op — en kwam terug. Voorgoed heen, en toch teruggekeerd: de diepte gaf terug wat ze nam. Trouw is niet te indexeren, en de dood houdt haar niet.</p>'
        : ((Codex.gevallen || []).includes(id) ? '<p class="boek-gevallen">✝ Offerde zich op. Voorgoed heen — de diepte onthield zijn moed.</p>' : '')}
      <button class="knop-groot" onclick="$('#overlay-relikwie').classList.remove('open')">Sluit</button>
    </div>`;
  verfraaiItemArt($('#relikwie-boek'));
  $('#overlay-relikwie').classList.add('open');
  Klank.sfx('klik');
}

/* relikwie-/drankjes-art: vervang emoji's door eigen afbeeldingen waar die bestaan */
function verfraaiItemArt(wortel) {
  const w = wortel || document;
  if (window.laadRelikwieAfbeelding) {
    w.querySelectorAll('[data-rart]').forEach(el => {
      laadRelikwieAfbeelding(el.dataset.rart, img => {
        if (img && !el.querySelector('img')) {
          /* badges (zoals het schrijn-sleuteltje) overleven de art-swap */
          const badge = el.querySelector('.codex-lading');
          el.innerHTML = `<img src="${img.src}" alt="">`;
          if (badge) el.appendChild(badge);
        }
      });
    });
  }
  if (window.laadDrankAfbeelding) {
    w.querySelectorAll('[data-dart]').forEach(el => {
      laadDrankAfbeelding(el.dataset.dart, img => {
        if (img && !el.querySelector('img')) el.innerHTML = `<img src="${img.src}" alt="">`;
      });
    });
  }
  /* vijand/karakter-art (bestiarium): data-vart = "<id>" of "<id>_<pose>". Pose-slots zonder
     eigen art verbergen zich (data-optioneel), zodat alleen bestaande poses tonen. */
  if (window.laadKarakterAfbeelding) {
    w.querySelectorAll('[data-vart]').forEach(el => {
      laadKarakterAfbeelding(el.dataset.vart, img => {
        if (img && !el.querySelector('img')) el.innerHTML = `<img src="${img.src}" alt="">`;
        else if (!img && el.dataset.optioneel) el.remove();
      });
    });
  }
  /* UI-iconen (rust-opties enz.): eigen plaat uit assets/iconen/ waar die bestaat */
  if (window.laadIcoonAfbeelding) {
    w.querySelectorAll('[data-icoon]').forEach(el => {
      laadIcoonAfbeelding(el.dataset.icoon, img => {
        if (img && !el.querySelector('img')) el.innerHTML = `<img src="${img.src}" alt="">`;
      });
    });
  }
  /* metgezel-art uit assets/metgezellen/ (Codex-roster + detailboek) */
  if (window.laadMetgezelAfbeelding) {
    w.querySelectorAll('[data-mgart]').forEach(el => {
      const art = (METGEZELLEN[el.dataset.mgart] && METGEZELLEN[el.dataset.mgart].art) || el.dataset.mgart;
      laadMetgezelAfbeelding(art, img => {
        if (img && !el.querySelector('img')) el.innerHTML = `<img src="${img.src}" alt="">`;
      });
    });
  }
  /* mysterie-scherf-art uit assets/scherven/ (cryptisch fragment per bron; 🜂-emoji blijft terugval) */
  if (window.laadScherfAfbeelding) {
    w.querySelectorAll('[data-shart]').forEach(el => {
      laadScherfAfbeelding(el.dataset.shart, img => {
        if (img && !el.querySelector('img')) el.innerHTML = `<img src="${img.src}" alt="">`;
      });
    });
  }
}

function maakKaartEl(c) {
  const def = kdef(c);
  const el = document.createElement('div');
  el.dataset.uid = c.uid;
  el.innerHTML = `
    <div class="kaart-kost"></div>
    ${def.licht ? '<div class="kaart-lichtkost" data-tip="Verbrandt fakkellicht bij het spelen"></div>' : ''}
    <div class="kaart-vonk" style="display:none"></div>
    <div class="kaart-aangetast" style="display:none"></div>
    <div class="kaart-naam"></div>
    <div class="kaart-icoon" data-kicoon="${c.id}">${def.icoon}</div>
    <div class="kaart-tekst"></div>
    <div class="kaart-type">${def.type}</div>`;
  zetKaartIcoon(el.querySelector('.kaart-icoon'), c.id);
  return el;
}

function bijwerkKaartEl(el, c, klikbaar) {
  const def = kdef(c);
  const g = S.gevecht;
  const kost = kkost(c);
  const lichtTekort = def.licht && S.fakkel < kval(c, 'licht');
  el.className = `kaart ktype-${def.type} zeld-${def.zeld}`
    + (def.licht || def.vuur ? ' kaart-licht' : '')
    + (g && ((kost !== null && kost > g.energie) || lichtTekort) ? ' te-duur' : '')
    + (g && g.gekozenKaart === c.uid ? ' gekozen' : '')
    + (g && g.voorbeeldKaart === c.uid ? ' voorbeeld' : '')
    + (g && (sp().status.verduisterd || 0) > 0 ? ' kaart-verduisterd' : '')   /* Verduisterd: toon de rug, speel blind */
    + (c.aangetast ? ' kaart-aangetast-art' : '')   /* door de Erfprins gecorrumpeerd */
    + (el.classList.contains('nieuw') ? ' nieuw' : '');
  el.querySelector('.kaart-kost').textContent = kost === null ? '✕' : kost;
  const lichtEl = el.querySelector('.kaart-lichtkost');
  if (lichtEl) lichtEl.textContent = '🔥' + kval(c, 'licht');
  /* Vonkaltaar-brandmerk: toon de vonk-badge óók op de gevechtskaart (stond enkel in het dek) */
  const vonkEl = el.querySelector('.kaart-vonk');
  if (vonkEl) {
    if (c.vonk) {
      vonkEl.style.display = '';
      vonkEl.className = 'kaart-vonk ' + (c.vonk > 0 ? 'vonk-helder' : 'vonk-duister');
      vonkEl.textContent = (c.vonk > 0 ? '🔥' : '🜂') + vonkBedrag(c);
      vonkEl.dataset.tip = c.vonk > 0
        ? 'Heldering: +' + vonkBedrag(c) + ' fakkellicht telkens je deze kaart speelt'
        : 'Verduistering: verbrandt ' + vonkBedrag(c) + ' fakkellicht bij het spelen, maar geeft je evenveel Blok';
    } else {
      vonkEl.style.display = 'none';
    }
  }
  /* Aangetast-badge (door de Erfprins gecorrumpeerd) — spiegelt de vonk-toggle hierboven,
     anders verschijnt het 🩸 wél bij inspecteren/zoomen maar niet op de handkaart zelf */
  const aangetastEl = el.querySelector('.kaart-aangetast');
  if (aangetastEl) {
    if (c.aangetast) {
      aangetastEl.style.display = '';
      aangetastEl.textContent = '🩸';
      aangetastEl.dataset.tip = 'Aangetast: door de Erfprins gecorrumpeerd — +1 Energie en uitputtend (eenmalig speelbaar)';
    } else {
      aangetastEl.style.display = 'none';
    }
  }
  el.querySelector('.kaart-naam').textContent = knaam(c);
  el.querySelector('.kaart-tekst').innerHTML = def.tekst(c);
}

function renderHand() {
  const g = S.gevecht;
  const houder = $('#hand');

  for (const [uid, el] of GDOM.hand) {
    if (!g.hand.some(c => c.uid === uid)) {
      GDOM.hand.delete(uid);
      el.classList.add('weg-kaart');
      setTimeout(() => el.remove(), 280);
    }
  }

  const n = g.hand.length, mid = (n - 1) / 2;
  g.hand.forEach((c, i) => {
    let el = GDOM.hand.get(c.uid);
    if (!el) {
      el = maakKaartEl(c);
      el.classList.add('nieuw');
      setTimeout(() => el.classList.remove('nieuw'), 500);
      GDOM.hand.set(c.uid, el);
      houder.appendChild(el);
    }
    bijwerkKaartEl(el, c);
    /* op mobiel een VLAKKE hand: geen verticale spreiding (--til), nauwelijks
       rotatie — anders splayen de buitenste kaarten onder de schermrand */
    const fanRot = window.mobiel ? 1.5 : 4;
    const fanTil = window.mobiel ? 0 : 7;
    el.style.setProperty('--rot', ((i - mid) * fanRot) + 'deg');
    el.style.setProperty('--til', (Math.abs(i - mid) * fanTil) + 'px');
    el.style.zIndex = i + 1;
  });
  /* volgorde herstellen; wegvliegende (afgelegde) kaarten tellen niet mee */
  g.hand.forEach((c, i) => {
    const el = GDOM.hand.get(c.uid);
    const levend = [...houder.children].filter(k => !k.classList.contains('weg-kaart'));
    if (levend[i] !== el) houder.insertBefore(el, levend[i] || null);
  });
}

/* kaart vliegt naar zijn doelwit */
function vliegKaart(el, doelEl) {
  if (!el) return;
  const van = el.getBoundingClientRect();
  const kloon = el.cloneNode(true);
  kloon.className = el.className + ' kloon-vlieg';
  kloon.style.cssText = `position:fixed; left:${van.left}px; top:${van.top}px; width:${van.width}px; height:${van.height}px; margin:0; z-index:600; transform:none;`;
  document.body.appendChild(kloon);
  const naar = doelEl ? doelEl.getBoundingClientRect() : { left: innerWidth / 2 - 60, top: innerHeight / 2 - 120, width: 120, height: 120 };
  requestAnimationFrame(() => {
    kloon.style.transition = 'transform .38s cubic-bezier(.5,-0.2,.7,1), opacity .38s';
    const dx = naar.left + naar.width / 2 - (van.left + van.width / 2);
    const dy = naar.top + naar.height / 2 - (van.top + van.height / 2);
    kloon.style.transform = `translate(${dx}px, ${dy}px) scale(.35) rotate(8deg)`;
    kloon.style.opacity = '0';
  });
  setTimeout(() => kloon.remove(), 450);
}

/* ---------- invoer (event-delegatie) ---------- */
function klikKaart(uid) {
  const g = S.gevecht;
  if (!g || g.bezig || g.voorbij) return;
  const c = g.hand.find(k => k.uid === uid);
  if (!c) return;

  /* TOUCH: kaarten overlappen sterk op een smal scherm. De eerste tik tilt de
     kaart groot omhoog om te lezen; pas de tweede tik op dezelfde kaart speelt
     'm. Een doelwit-kaart die al geselecteerd is (gekozenKaart) heeft zijn
     leesmoment gehad. Desktop (muis) speelt zoals altijd meteen. */
  if (window.mobiel && g.gekozenKaart !== uid && g.voorbeeldKaart !== uid) {
    g.voorbeeldKaart = uid;
    renderHand();
    Klank.sfx('klik');
    return;
  }
  g.voorbeeldKaart = null;

  const def = kdef(c);

  if (def.type === 'vloek') { melding('Onbespeelbaar!'); Klank.sfx('fout'); return; }
  const kost = kkost(c);
  if (kost > g.energie) { melding('Niet genoeg energie!'); Klank.sfx('fout'); return; }
  if (def.licht && S.fakkel < kval(c, 'licht')) {
    melding('Niet genoeg licht in je fakkel!'); Klank.sfx('fout'); return;
  }

  if (g.gekozenKaart === uid) { g.gekozenKaart = null; renderGevecht(); return; }

  if (def.doel === 'vijand') {
    const levend = alleVijanden();
    if (levend.length === 1) { speelKaart(c, levend[0]); return; }
    g.gekozenKaart = uid;
    g.gekozenDrank = null;
    renderGevecht();
    return;
  }
  speelKaart(c, null);
}

function klikVijand(i) {
  const g = S.gevecht;
  if (!g || g.bezig || g.voorbij) return;
  const v = g.vijanden[i];
  if (!v || v.dood) return;
  /* een lopende kaart-voorbeschouwing (touch) wegtikken door op een vijand te
     tikken zonder dat er een kaart/drank gericht wordt */
  if (g.voorbeeldKaart != null && g.gekozenKaart === null && g.gekozenDrank === null) {
    g.voorbeeldKaart = null; renderHand(); return;
  }
  if (g.gekozenDrank !== null) {
    const di = g.gekozenDrank;
    g.gekozenDrank = null;
    const id = S.dranken[di];
    if (!DRANKEN[id]) { renderGevecht(); return; }   /* vangnet: stale/out-of-bounds index → geen drinkEffect(undefined) */
    S.dranken.splice(di, 1);
    Klank.sfx('drank');
    drinkEffect(id, v);
    naActie();
    return;
  }
  if (g.gekozenKaart !== null) {
    const c = g.hand.find(k => k.uid === g.gekozenKaart);
    g.gekozenKaart = null;
    if (c) speelKaart(c, v);
  }
}

async function speelKaart(c, doel) {
  const g = S.gevecht;
  const def = kdef(c);
  g.energie -= kkost(c);
  vliegKaart(GDOM.hand.get(c.uid), doel ? actorEl(doel) : $('#speler-zone'));
  g.hand = g.hand.filter(k => k.uid !== c.uid);
  Klank.sfx('kaart');
  if (def.type === 'kracht') {
    if (window.Vista) Vista.pose(sp(), 'cast', 1.4);
    pose2D(sp(), 'cast', 1.4);
    heldFx('hfx-cast', 1400);
  }
  S.stats.kaarten++;
  const resultaat = def.speel(c, doel);
  if (resultaat && resultaat.then) {
    /* meertraps kaarteffect: invoer kort vergrendelen tijdens de animatie */
    g.bezig = true;
    renderGevecht();
    try { await resultaat; } finally { if (S.gevecht === g) g.bezig = false; }
  }
  baasZietKaart(c);   /* THE COPYCAT ziet wat je speelt (observeren) */
  /* Act 2-kaarthaken (Het Archief): teller + Geïndexeerd-blok, dán de Doorslag-verdubbeling.
     Increment vóór de recast (anders telt Originele Handtekening de recast dubbel als
     'eerste aanval'); de recast wordt geawait (async multi-hit niet fire-and-forget). */
  if (def.type === 'aanval') {
    g.aanvalDezeBeurt = (g.aanvalDezeBeurt || 0) + 1;
    if (g.aanvalDezeBeurt === 1 && heeftRelikwie('stempelkussen')) {   /* je eerste aanval per beurt stempelt Kwetsbaar */
      const stempelDoel = (doel && !doel.dood) ? doel : alleVijanden()[0];
      if (stempelDoel) { geefStatus(stempelDoel, 'kwetsbaar', 1); fxNummer(actorEl(stempelDoel), '🟥 Kwetsbaar', 'fx-debuff'); }
    }
    if ((sp().status.geindexeerd || 0) > 0) geefBlok(sp(), sp().status.geindexeerd);
    if (c.id !== 'doorslag_kaart' && (sp().status.doorslag || 0) > 0) {
      const doel2 = (doel && doel.dood) ? alleVijanden()[0] : doel;   /* doel net gedood? mik op een levend */
      /* laatste vijand net geveld? dan is er niets meer om de recast op te mikken →
         sla 'm over, anders crasht aanvalOp op een undefined doel (won-but-frozen). */
      if (def.doel !== 'vijand' || (doel2 && !doel2.dood)) {
        sp().status.doorslag--;
        const r2 = def.speel(c, doel2);
        if (r2 && r2.then) { g.bezig = true; renderGevecht(); try { await r2; } finally { if (S.gevecht === g) g.bezig = false; } }
        if ((sp().status.geindexeerd || 0) > 0) geefBlok(sp(), sp().status.geindexeerd);
      }
    }
  }
  /* Doorslagpapier: de allereerste kaart van het gevecht laat een doorslag na — een verse
     kopie (mét upgrade) glijdt bovenop je trekstapel. Eenmalig per gevecht. */
  if (heeftRelikwie('doorslagpapier') && !g.doorslagGebruikt && def.type !== 'vloek') {
    g.doorslagGebruikt = true;
    const kopie = nieuweKaart(c.id); kopie.up = c.up;
    g.trek.push(kopie);
    melding('📄 Doorslagpapier: een kopie glijdt bovenop je trekstapel.');
  }
  pasVonkToe(c);   /* het Vonkaltaar: gebrandmerkte kaart raakt de fakkel (+licht of verbrand+Blok) */
  if (def.type === 'kracht' || def.uitputten || c.uitputtend) {   /* c.uitputtend = per-instance (bv. een door de Erfprins teruggestoken kaart) */
    g.uitgeput.push(c);
  } else {
    g.afleg.push(c);
  }
  /* DE ROOF: je eerste aanval op de Erfprins ontketent het ritueel — het onderbreekt je beurt,
     waarna hij meteen je kaarten begint terug te spelen (eindBeurt). */
  if (g.roofPending && !g.roofGedaan && !g.voorbij) {
    g.roofPending = false;
    g.bezig = true; renderGevecht();
    await copycatDeRoof(g);
    if (S.gevecht === g) g.bezig = false;
    if (S.gevecht === g && !g.voorbij) eindBeurt();
    return;
  }
  naActie();
}

function naActie() {
  if (!S.gevecht || S.gevecht.voorbij) return;
  if (alleVijanden().length === 0) { gevechtGewonnen(); return; }
  checkBaasFase();
  renderGevecht();
}

/* ---------- bazenfases: de Slijmkoning vecht in drie bedrijven ---------- */
function checkBaasFase() {
  const g = S.gevecht;
  if (!g || g.voorbij || g.soort !== 'baas') return;
  const b = g.vijanden.find(v => VIJANDEN[v.id].baas && !v.dood);
  if (!b) return;
  if (VIJANDEN[b.id].copycat) { checkCopycatFase(b, g); return; }
  if (b.id !== 'slijmkoning') return;   /* andere bazen: (nog) geen fase-script */
  const pct = b.hp / b.maxHp;
  if ((b.fase || 1) < 2 && pct <= 0.5) {
    b.fase = 2;
    baasFaseMoment('DE KONING SPLIJT!', UITSPRAKEN._baas.fase2);
    voegVijandToe('groene_slijm');
    voegVijandToe('groene_slijm');
    geefStatus(b, 'kracht', 1);
    if (window.Vista) Vista.pose(b, 'cast', 2.6);
    pose2D(b, 'cast', 2.6);
  }
  if ((b.fase || 1) < 3 && pct <= 0.25) {
    b.fase = 3;
    baasFaseMoment('KONINKLIJKE WOEDE', UITSPRAKEN._baas.fase3);
    geefStatus(b, 'kracht', 2);
    b.intent = VIJANDEN[b.id].kies(b, g.beurt); /* nieuw aanvalspatroon meteen tonen */
    const el = actorEl(b);
    if (el) el.classList.add('woede');
  }
}

/* ============ THE COPYCAT — Act 2-eindbaas (kopieer-mechaniek) ============
   De Erfprins maakt nooit iets zelf: hij STEELT je kaarten (uit de gevecht-kopie
   van je trek/afleg — S.dek blijft heilig), kaatst ze opgewaardeerd terug, en
   GROEIT (v.gevoed) naarmate jij optimaler speelt. Voeding loopt via verliesHp
   (de chokepoint — dus ook gif voedt). Drops (rol:'breker') breekt de machine.
   Volledig ontwerp: ONTWERP.md "The Copycat — Act 2-eindbaasmechaniek". */

const COPYCAT_CAP_DMG = { 1: 20, 2: 30, 3: 40 };   /* fase-afhankelijke cap op teruggekaatste schade. Roof-rework: half je dek is al weg → de burst moest terug omlaag (60 was verpletterend tegen een gehalveerd dek). 'Zeer moeilijk maar net winbaar solo'; tunebaar. */
const COPYCAT_STEEL_CAP = 12;    /* max ooit gestolen per gevecht (anti-leegtrekken) */
const COPYCAT_ARSENAAL_CAP = 5;  /* max gelijktijdig in het arsenaal */
const COPYCAT_TERUGWIN = 20;     /* schade aan de baas per teruggewonnen kaart */
const COPYCAT_F2 = 6, COPYCAT_F3 = 13;   /* voedings-drempels voor fase 2 / 3 (verlaagd: hij ramt nu sneller op) */

function copycatBaas(g) {
  return (g && g.vijanden) ? g.vijanden.find(v => !v.dood && VIJANDEN[v.id] && VIJANDEN[v.id].copycat) : null;
}
function copycatFaseBodem(fase) { return fase >= 3 ? COPYCAT_F3 : (fase >= 2 ? COPYCAT_F2 : 0); }
function snapSterkte(s) { return s.soort === 'aanval' ? (s.n || 0) * 2 : (s.n || 0); }
function levendeBrekerCompanion() {
  const m = gMet();
  return (m && !m.dood && METGEZELLEN[m.id] && METGEZELLEN[m.id].rol === 'breker') ? m : null;
}

/* KANAAL 1 — observeren: elke stelbare kaart die je speelt landt in de buffer + voedt traag */
function baasZietKaart(c) {
  const g = S.gevecht; if (!g || g.copycatGebroken) return;
  const baas = copycatBaas(g); if (!baas) return;
  const recept = kdef(c).kopie; if (!recept) return;
  const n = Math.max(0, kval(c, recept.veld) || 0);
  if (recept.soort === 'aanval' && n <= 0) return;
  const kost = Math.max(1, kkost(c) || 1);
  if (!Array.isArray(g.laatstGespeeld)) g.laatstGespeeld = [];
  g.laatstGespeeld.push({ id: c.id, naam: kdef(c).naam, soort: recept.soort, n, kost });
  while (g.laatstGespeeld.length > 3) g.laatstGespeeld.shift();
  /* observatie-voeding: aanvallen voeden naar schade/kost; herhaalde dure bommen +50% */
  let voer = recept.soort === 'aanval' ? Math.round(n / kost) : 0;
  if (c.id === g.vorigeId && kost >= 2) voer = Math.round(voer * 1.5);
  baas.gevoed = (baas.gevoed || 0) + voer;
  g.vorigeId = c.id;
}

/* ---- ZICHTBARE STEEL: een kaart vliegt over het scherm (van je hand-zone naar de
   Erfprins bij het grissen; van hem naar jou bij het terugspelen). Puur cosmetisch. ---- */
function kaartVliegFx(kaartId, bronEl, doelEl, opts) {
  opts = opts || {};
  if (!bronEl || !doelEl || typeof bronEl.getBoundingClientRect !== 'function') return;
  const br = bronEl.getBoundingClientRect(), dr = doelEl.getBoundingClientRect();
  if (!br.width || !dr.width) return;
  const bx = br.left + br.width / 2, by = br.top + br.height / 2;
  const dx = dr.left + dr.width / 2, dy = dr.top + dr.height / 2;
  const def = kaartId && KAARTEN[kaartId];
  const fly = document.createElement('div');
  fly.className = 'steel-vlieger' + (opts.vloek ? ' vloek' : '') + (opts.terug ? ' terug' : '') + (opts.verbrand ? ' verbrand' : '');
  fly.innerHTML = `<span class="sv-icoon">${(def && def.icoon) || '🎴'}</span><span class="sv-naam">${(def && def.naam) || ''}</span>`;
  fly.style.left = bx + 'px'; fly.style.top = by + 'px';
  fly.style.transform = `translate(-50%,-50%) scale(.5) rotate(${opts.terug ? 8 : -8}deg)`;
  document.body.appendChild(fly);
  void fly.offsetWidth;                       /* reflow → de transitie pakt */
  fly.classList.add('vliegt');
  fly.style.transform = `translate(calc(-50% + ${Math.round(dx - bx)}px), calc(-50% + ${Math.round(dy - by)}px)) scale(1.06) rotate(${opts.terug ? -10 : 10}deg)`;
  setTimeout(() => {
    if (doelEl.classList) { doelEl.classList.remove('steel-flits'); void doelEl.offsetWidth; doelEl.classList.add('steel-flits'); setTimeout(() => doelEl.classList.remove('steel-flits'), 480); }
    fly.classList.add('weg');
    setTimeout(() => fly.remove(), 220);
  }, 560);
}
function copycatBronEl() { return $('#hand') || $('#onderbalk') || $('#speler-zone'); }

/* VLOEK-GREEP: de Erfprins grijpt blind — een vloek in je stapels keert zich tégen hem.
   Hij loopt er zélf schade van op (zonder zich eraan te voeden) en de vloek is geconsumeerd.
   → "neem bewust vloeken mee" wordt een echte counter. Tunebaar via VLOEK_BACKFIRE. */
const VLOEK_BACKFIRE = (v) => 12 + (v.fase || 1) * 5 + Math.max(0, huidigeAct() - 1) * 4;   /* ~17–31 */
function copycatGristVloek(v, g) {
  for (const p of ['afleg', 'trek']) {
    const i = (g[p] || []).findIndex(k => kdef(k).type === 'vloek');
    if (i < 0) continue;
    const c = g[p][i]; g[p].splice(i, 1);
    const def = kdef(c);
    const schade = VLOEK_BACKFIRE(v);
    v.totaalGestolen = (v.totaalGestolen || 0) + 1;   /* telt mee tegen de steel-cap (niet oneindig curse-farmen tégen hem) */
    kaartVliegFx(c.id, copycatBronEl(), actorEl(v), { vloek: true });   /* cosmetisch — loopt los van de schade */
    melding(`🎭 De Erfprins grist blind je ${def.naam} weg — en de vloek keert zich tégen hém!`);
    Klank.sfx('debuff');
    g._vloekGreep = true;                  /* deze schade voedt hem NIET + geen terugwin */
    try { verliesHp(v, schade); } finally { g._vloekGreep = false; }   /* throw in verliesHp (fx/audio/death-tak) mag de vlag niet laten hangen → anders voedt/terugwint hij nooit meer */
    if (!v.dood) { fxNummer(actorEl(v), `🌑 ${def.naam}! −${schade}`, 'fx-schade'); pose2D(v, 'hit', 0.5); }
    renderGevecht();
    return true;
  }
  return false;
}

/* KANAAL 2 — stelen: grist één instance van het sterkste recent gespeelde type
   uit je trek/afleg (NOOIT S.dek). Faalt stil als er geen instance beschikbaar is. */
function copycatSteel(v, g) {
  if (g.copycatGebroken) return false;
  if ((v.totaalGestolen || 0) >= COPYCAT_STEEL_CAP || (v.gestolen || []).length >= COPYCAT_ARSENAAL_CAP) return false;
  /* GREEDY: ligt er een vloek in je stapels? Hij grijpt 'm blind en bezeert zichzelf. */
  if (copycatGristVloek(v, g)) return true;
  const pool = (g.laatstGespeeld || []).slice().sort((a, b) => snapSterkte(b) - snapSterkte(a));
  for (const snap of pool) {
    let bron = g.trek, idx = g.trek.findIndex(k => k.id === snap.id);
    if (idx < 0) { bron = g.afleg; idx = g.afleg.findIndex(k => k.id === snap.id); }
    if (idx < 0) continue;                       /* alle instances in je hand → probeer 't volgende type */
    bron.splice(idx, 1);
    if (!Array.isArray(v.gestolen)) v.gestolen = [];
    v.gestolen.push({ id: snap.id, naam: snap.naam, soort: snap.soort, n: snap.n });
    v.totaalGestolen = (v.totaalGestolen || 0) + 1;
    v.gevoed = (v.gevoed || 0) + (snap.kost || 1);
    const li = g.laatstGespeeld.indexOf(snap); if (li >= 0) g.laatstGespeeld.splice(li, 1);
    pose2D(v, 'cast', 0.8);
    kaartVliegFx(snap.id, copycatBronEl(), actorEl(v));        /* zichtbaar: de kaart vliegt naar hem toe */
    fxNummer(actorEl(v), `🎭 steelt je ${snap.naam}!`, 'fx-debuff');
    Klank.sfx('debuff');
    melding(`🎭 De Erfprins grist je ${snap.naam} weg — hij speelt 'm straffer terug!`);
    renderGevecht();
    return true;
  }
  return false;
}

/* de eind-schade van een teruggespeelde aanval: +65%, +copyKracht, act-scaling, fase-cap */
function copycatPlagiaatDmg(v, n) {
  let d = Math.round(n * 1.65) + (v.copyKracht || 0);
  if (huidigeAct() > 1) d = Math.ceil(d * (1 + 0.15 * (huidigeAct() - 1)));
  return Math.min(COPYCAT_CAP_DMG[v.fase || 1] || 46, Math.max(1, d));
}
/* kies de N sterkste gestolen kaarten + bereken hun eind-getallen (voor telegraaf én uitvoer) */
function copycatPlagiaatPlan(v, aantal) {
  return (v.gestolen || []).slice().sort((a, b) => snapSterkte(b) - snapSterkte(a)).slice(0, aantal)
    .map(s => ({ id: s.id, naam: s.naam, soort: s.soort, n: s.n, eindDmg: s.soort === 'aanval' ? copycatPlagiaatDmg(v, s.n) : 0 }));
}
/* ---- DE ROOF (opening): de Erfprins grist meteen een willekeurige HELFT van je dek in
   zijn kopie-stapel en maakt je af met de jouwe. Per gevecht — je trek/afleg worden elk
   gevecht vers uit S.dek gebouwd, dus na de baas is je dek weer compleet. ---- */
function _erfprinsRoofKaart(c) {
  const def = kdef(c);
  if (def.type === 'vloek') return { soort: 'vloek', n: 0 };
  const rec = def.kopie;
  if (rec) { const n = Math.max(0, kval(c, rec.veld) || 0); if (n > 0 || rec.soort !== 'aanval') return { soort: rec.soort, n }; }
  const dmg = kval(c, 'dmg') || 0; if (dmg > 0) return { soort: 'aanval', n: dmg };
  const blok = kval(c, 'blok') || 0; if (blok > 0) return { soort: 'blok', n: blok };
  return { soort: 'overig', n: 0 };
}
/* gedeelde graai: verplaats `aantal` willekeurige kaarten uit je trek naar zijn arsenaal
   (laat ALTIJD ≥2 in je trek → nooit meteen droogtrekken). Geeft het aantal echt geroofde
   kaarten terug. */
function _copycatGraai(v, g, aantal) {
  const trek = g.trek || [];
  aantal = Math.max(0, Math.min(trek.length - 2, aantal | 0));
  if (aantal <= 0) return 0;
  const idxs = schud(trek.map((_, i) => i)).slice(0, aantal).sort((a, b) => b - a);   /* hoog→laag → splice-veilig; seeded schud */
  v.gestolen = v.gestolen || [];
  idxs.forEach(i => {
    const c = trek[i]; trek.splice(i, 1);
    const info = _erfprinsRoofKaart(c);
    v.gestolen.push({ id: c.id, naam: kdef(c).naam, soort: info.soort, n: info.n, up: !!c.up });
  });
  v.totaalGeroofd = (v.totaalGeroofd || 0) + idxs.length;
  return idxs.length;
}
/* DE ROOF (opening): grist een HELFT van je dek vóór je eerste beurt. */
function copycatOpeningsroof(g) {
  const v = copycatBaas(g); if (!v || g.copycatGebroken) return;
  const n = _copycatGraai(v, g, Math.round((S.dek.length || (g.trek || []).length) / 2));
  if (!n) return;
  v.gestolen.slice(-n).forEach((s, i) => setTimeout(() => kaartVliegFx(s.id, copycatBronEl(), actorEl(v)), 140 + i * 90));
  baasFaseMoment('DE ROOF', `🎭 „Jouw werk? Het is nu MÍJN werk." — hij grist ${n} kaart${n === 1 ? '' : 'en'} uit je dek!`);
  Klank.sfx('debuff');
  renderGevecht();
}
/* DE NAROOF: raakt zijn geroofde stapel op, dan grist hij OPNIEUW (de helft van wat je nú hebt) →
   de onslaught deflater niet, je kunt 'm solo niet uitzitten. Dooft pas als je trek te klein is om
   nog te grissen (<3) → dán valt hij zwak uit (jouw window). De Drops-breker stopt de machine
   volledig. Geen schade deze beurt (hij her-stockt); telegrafeert als '👀 steelt'. */
function copycatHerroof(v, g) {
  if (!v || g.copycatGebroken) return;
  const n = _copycatGraai(v, g, Math.ceil((g.trek || []).length / 2));
  if (!n) { fxNummer(actorEl(v), '🎭 niks meer te grissen…', 'fx-debuff'); return; }
  v.gestolen.slice(-n).forEach((s, i) => setTimeout(() => kaartVliegFx(s.id, copycatBronEl(), actorEl(v)), i * 90));
  baasFaseMoment('NAROOF', `🎭 „Nog niet leeg?" — hij grist nóg ${n} kaart${n === 1 ? '' : 'en'} uit je dek!`);
  Klank.sfx('debuff');
  renderGevecht();
}

/* ============================================================================
   DE ROOF — CINEMATISCH (Roof-rework v2). NIET meer bij gevechtsstart, maar het
   moment je je EERSTE aanval op de Erfprins landt: hij ontsteekt in woede, je dek
   OPENT zich, en hij plukt er één voor één (met een vieze vinger) een willekeurige
   HELFT uit die in zijn arsenaal verbrandt. Daarna onderbreekt het je beurt en
   speelt hij ze beurt na beurt GROOT in beeld terug — elk gecorrumpeerd retour in
   je dek (+1 kost, uitputtend, zwart aangetast). copycatDeRoof is idempotent
   (g.roofGedaan) en wordt getriggerd vanuit speelKaart (na je 1e aanval) óf — als
   je je beurt zonder aanval eindigt — als vangnet bovenin eindBeurt. ============ */
const ROOF_KAART_MS = 760;   /* pacing per geplukte kaart in de cutscene (tunebaar) */

async function copycatDeRoof(g) {
  const v = copycatBaas(g);
  if (!v || g.roofGedaan || g.copycatGebroken) return;
  g.roofGedaan = true;
  /* 1 — WOEDE: hij voelt je klap en ontsteekt */
  const el = actorEl(v); if (el) el.classList.add('woede');
  if (window.Vista) Vista.pose(v, 'cast', 2.4);
  pose2D(v, 'cast', 2.4);
  baasFaseMoment('WOEDE', UITSPRAKEN._erfprins.woede);
  Klank.sfx('zwareklap');
  await slaap(1250);
  if (S.gevecht !== g || g.voorbij) return;
  /* 2 — HET RITUEEL: je dek opent, hij plukt de helft */
  await copycatRoofCutscene(g, v, Math.round((S.dek.length || (g.trek || []).length) / 2));
  if (S.gevecht !== g || g.voorbij) return;
  /* 3 — zijn eerstvolgende zet = jouw kaarten terugspelen */
  v.intent = VIJANDEN[v.id].kies(v, v.beurtTeller);
  renderGevecht();
}

/* het zichtbare ritueel: toon je trek als open waaier, pluk er `wil` willekeurig uit
   (laat ALTIJD ≥2 over), elk met de vieze vinger → verbrandt → in zijn arsenaal. */
async function copycatRoofCutscene(g, v, wil) {
  const trek = g.trek || [];
  const aantal = Math.max(0, Math.min(trek.length - 2, wil | 0));
  if (aantal <= 0) {
    baasFaseMoment('DE ROOF', '🎭 „Te mager om te plunderen… voor nu."');
    Klank.sfx('debuff');
    return;
  }
  const teRoven = schud(trek.map((_, i) => i)).slice(0, aantal);   /* seeded → reproduceerbaar */
  const roofSet = new Set(teRoven);
  const ov = document.createElement('div');
  ov.className = 'roof-overlay';
  ov.innerHTML = `<div class="roof-kop">🎭 DE ERFPRINS OPENT JE DEK<small>${UITSPRAKEN._erfprins.roof}</small></div>
    <div class="roof-waaier"></div>
    <div class="vieze-vinger">🫳</div>`;
  document.body.appendChild(ov);
  const waaier = ov.querySelector('.roof-waaier');
  const vinger = ov.querySelector('.vieze-vinger');
  trek.forEach((c, i) => {
    const def = kdef(c);
    const k = document.createElement('div');
    k.className = 'roof-kaart' + (roofSet.has(i) ? '' : ' veilig');
    k.dataset.idx = i;
    k.innerHTML = `<div class="rk-art kaart-icoon" data-kicoon="${c.id}">${def.icoon}</div><span class="rk-naam">${knaam(c)}</span>`;
    waaier.appendChild(k);
  });
  if (typeof verfraaiKaartIconen === 'function') verfraaiKaartIconen(waaier);   /* echte kaart-art laden i.p.v. de emoji-terugval */
  await slaap(40);
  ov.classList.add('open');
  Klank.sfx('kaart');
  await slaap(640);
  for (const idx of teRoven) {
    if (S.gevecht !== g || g.voorbij) break;
    const kEl = waaier.querySelector(`.roof-kaart[data-idx="${idx}"]`);
    if (!kEl) continue;
    const kr = kEl.getBoundingClientRect();
    vinger.style.left = (kr.left + kr.width / 2) + 'px';
    vinger.style.top = (kr.top - 4) + 'px';
    vinger.classList.add('wijst');
    kEl.classList.add('gekozen');
    Klank.sfx('klik');
    await slaap(ROOF_KAART_MS * 0.5);
    vinger.classList.add('tik');
    kEl.classList.add('verbrandt');
    Klank.sfx('debuff');
    await slaap(140);
    vinger.classList.remove('tik');
    await slaap(ROOF_KAART_MS * 0.45);
    kEl.classList.add('weg');
  }
  vinger.classList.remove('wijst');
  await slaap(160);
  /* DATA: verplaats de geplukte kaarten naar zijn arsenaal (hoog→laag = splice-veilig) */
  v.gestolen = v.gestolen || [];
  teRoven.slice().sort((a, b) => b - a).forEach(i => {
    const c = trek[i]; if (!c) return;
    trek.splice(i, 1);
    const info = _erfprinsRoofKaart(c);
    v.gestolen.push({ id: c.id, naam: kdef(c).naam, soort: info.soort, n: info.n, up: !!c.up });
  });
  v.totaalGeroofd = (v.totaalGeroofd || 0) + teRoven.length;
  ov.classList.add('sluit');
  baasFaseMoment('DE ROOF', `🎭 ${teRoven.length} van je beste kaarten — nu MÍJN werk. Je dek sluit zich.`);
  Klank.sfx('zwareklap');
  await slaap(720);
  ov.remove();
}

/* één geroofde kaart groot in beeld terwijl hij 'm speelt (slam-in + hold) */
async function copycatToonGespeeld(k, s) {
  const c = nieuweKaart(k.id); c.up = !!(s && s.up);
  const wrap = document.createElement('div');
  wrap.className = 'roof-speel-kaart';
  const sub = k.soort === 'aanval' ? `🔥 +${k.eindDmg} schade` : `🎭 jouw eigen ${k.naam}`;
  wrap.innerHTML = `<div class="rs-kop">🎭 HIJ SPEELT JOUW KAART</div>
    <div class="kaart-focus-houder"><div class="focus-rij">
      ${kaartHtml(c, false).replace('kaart groot', 'kaart groot kaart-focus zeldglans-corrupt')}
    </div></div>
    <div class="rs-sub">${sub}</div>`;
  document.body.appendChild(wrap);
  if (typeof verfraaiKaartIconen === 'function') verfraaiKaartIconen(wrap);
  Klank.sfx('debuff');
  void wrap.offsetWidth;
  wrap.classList.add('in');
  await slaap(820);
  return wrap;
}

/* KANAAL 3 — terugspelen (Roof-rework v2): beurt na beurt speelt hij zijn geroofde kaarten
   GROOT in beeld met de Erfprins-bonus, en stuurt elke kaart daarna GECORRUMPEERD retour in
   je dek (aangetast: +1 kost + uitputtend). Een geroofde VLOEK laat zich niet kopiëren en
   bijt HÉM. Async → wordt geawait vanuit de vijandbeurt-lus (it.doe). */
async function copycatSpeelTerug(v, g, plan) {
  pose2D(v, Math.random() < 0.5 ? 'plagiaat' : 'plagiaat_variant', 0.9);   /* cosmetisch → Math.random raakt de seeded RNG niet */
  for (let i = 0; i < (plan || []).length; i++) {
    if (S.gevecht !== g || g.voorbij || v.dood) break;   /* dode baas speelt niet door (vloek-backfire/doornen kunnen 'm mid-beurt vellen) */
    const k = plan[i];
    const ai = (v.gestolen || []).findIndex(s => s.id === k.id && s.soort === k.soort);
    if (ai < 0) continue;                          /* al weg (bv. door de breker) → skip */
    const s = v.gestolen[ai]; v.gestolen.splice(ai, 1);   /* hij verbruikt de instance */
    if (k.soort === 'vloek') {
      kaartVliegFx(k.id, actorEl(v), copycatBronEl(), { vloek: true });
      const schade = VLOEK_BACKFIRE(v);
      g._vloekGreep = true;
      try { verliesHp(v, schade); } finally { g._vloekGreep = false; }
      if (!v.dood) { fxNummer(actorEl(v), `🌑 jouw ${k.naam} keert! −${schade}`, 'fx-schade'); pose2D(v, 'hit', 0.5); }
      melding(`🎭 Hij speelt je ${k.naam} — maar een vloek laat zich niet kopiëren, en bijt hém!`);
      renderGevecht();
      if (v.dood) break;   /* de vloek-backfire velde de Erfprins → stop; eindBeurt regelt de victory */
      await slaap(720);
      continue;
    }
    /* 1 — de kaart groot in beeld */
    const wrap = await copycatToonGespeeld(k, s);
    if (S.gevecht !== g || g.voorbij || v.dood) { wrap.remove(); return; }
    /* 2 — het effect landt (aanvallen met de Erfprins-bonus) */
    if (k.soort === 'aanval') {
      doeSchade(sp(), k.eindDmg, v);
      fxNummer(actorEl(v), `🔥 jouw ${k.naam}! −${k.eindDmg}`, 'fx-schade');
    } else if (k.soort === 'blok') {
      geefBlok(v, k.n); fxNummer(actorEl(v), `🛡️ jouw ${k.naam}!`, 'fx-blok');
    } else if (k.soort === 'gif') {
      geefGif(sp(), k.n); fxNummer(actorEl(v), `🧪 jouw ${k.naam}!`, 'fx-debuff');
    } else if (k.soort === 'zwak') {
      geefStatus(sp(), 'zwak', k.n); fxNummer(actorEl(v), `🎭 jouw ${k.naam}!`, 'fx-debuff');
    } else {
      fxNummer(actorEl(v), `🎭 jouw ${k.naam}!`, 'fx-debuff');
    }
    renderGevecht();
    if (S.gevecht !== g || g.voorbij || v.dood) { wrap.classList.add('weg'); setTimeout(() => wrap.remove(), 300); return; }   /* doornen-kaats velde de baas → stop, geen corruptie-retour meer */
    /* 3 — gecorrumpeerd retour in je dek (+1 kost, uitputtend, zwart aangetast) */
    wrap.classList.add('corrupt-weg');
    setTimeout(() => wrap.remove(), 620);
    kaartVliegFx(k.id, actorEl(v), copycatBronEl(), { terug: true, corrupt: true });
    const kaart = nieuweKaart(k.id); kaart.up = !!s.up; kaart.uitputtend = true; kaart.aangetast = true;
    g.afleg.push(kaart);
    melding(`🩸 Je ${k.naam} valt aangetast terug in je dek — loodzwaar en eenmalig.`);
    Klank.sfx('debuff');
    await slaap(560);
  }
  if ((plan || []).length >= 2 && !g.copycatDubbelGezien) {
    g.copycatDubbelGezien = true;
    baasFaseMoment('JOUW BESTE WERK', '„Twee tegelijk. Allebei van JOU."');
  }
  renderGevecht();
}

/* aangeroepen uit verliesHp telkens de Copycat échte schade oploopt: terugwin (alle
   schade) + voeding (bron-gegate: speler piekt, gif voedt half, breker voedt NIET) */
function copycatNaSchade(v, n, bron) {
  const g = S.gevecht; if (!g) return;
  if (g._vloekGreep) return;   /* vloek-backfire: bezeert hem, maar voedt hem NIET (geen win-back in de Roof-rework) */
  if (bron === sp()) {
    g.raakteCopycat = true;
    if (!g.roofGedaan) g.roofPending = true;   /* je EERSTE aanval op de Erfprins ontketent de Roof (afgehandeld in speelKaart) */
    if (n > (v.maxKlap || 0)) { v.gevoed = (v.gevoed || 0) + Math.floor((n - (v.maxKlap || 0)) / 4); v.maxKlap = n; }
  } else if (!bron) {
    v.gevoed = (v.gevoed || 0) + Math.round(n / 2);   /* gif/doornen: voedt half */
  }
  /* bron.isMetgezel (de breker): telt alleen voor terugwin, voedt NIET — trouw voedt de dief niet */
}

/* de beurtkeuze van de Erfprins (Roof-rework): speel geroofde kaarten per fase, óf — als zijn
   geroofde stapel op is — een zwakke eigen uithaal (jouw window om hem af te maken).
   Puur (geen mutatie) — alle mutatie zit in de it.doe()-haken. */
function copycatKies(v, beurt) {
  const g = S.gevecht; if (!g) return { type: 'aanval', naam: 'Geschreeuw', dmg: 6 };
  /* vóór DE ROOF: hij neemt je op en wácht tot je toeslaat — je eerste aanval ontketent
     de Roof (zie speelKaart); eindig je je beurt zonder aanval, dan rooft het vangnet in
     eindBeurt alsnog. Telegrafeert dus geen schade die eerste beurt. */
  if (!g.roofGedaan && !g.copycatGebroken) {
    return { type: 'buff', naam: 'Neemt je op…', doe: () => {} };
  }
  const fase = v.fase || 1;
  const arsenaal = (v.gestolen || []).length;
  const t = v.beurtTeller || 0;
  if (g.copycatGebroken) return { type: 'aanval', naam: 'Wanhoopsklap', dmg: 6 + (fase >= 3 ? 2 : 0) };
  if (arsenaal > 0) {
    /* fase 1 → 1 kaart/beurt · fase 2 → om de beurt 2 · fase 3 → 2 kaarten/beurt */
    const aantal = fase >= 3 ? Math.min(2, arsenaal)
      : (fase === 2 && (t % 2 === 1) ? Math.min(2, arsenaal) : 1);
    const plan = copycatPlagiaatPlan(v, aantal);
    return { type: 'plagiaat', naam: 'Plagiaat', plan, doe: vv => copycatSpeelTerug(vv, g, plan) };
  }
  /* arsenaal leeg → grist OPNIEUW als je trek het toelaat (sustain: solo niet uit te zitten —
     je hebt de breker/metgezel nodig); telegrafeert als 👀 steelt, doet die beurt geen schade. */
  if (!g.copycatGebroken && (g.trek || []).length >= 3) {
    return { type: 'steel', naam: 'Naroof', doe: vv => copycatHerroof(vv, g) };
  }
  /* trek te klein om nog te grissen → hij is uitgeput en haalt zelf nog zwak uit (jouw window) */
  return { type: 'aanval', naam: fase >= 2 ? 'Wild Geschreeuw' : 'Pappie Bellen', dmg: 4 + fase * 4,
    doe: vv => {
      fxNummer(actorEl(vv), '🎭 niks meer te grissen!', 'fx-debuff');
      if (!g._copycatLeeggemeld) { melding('🎭 Je dek is te uitgedund om nog te grissen — hij is uitgeput. Maak hem af.'); g._copycatLeeggemeld = true; }
    } };
}

/* fase-escalatie: puur voedings-gedreven, sticky (eenrichting) — vervangt de aegis-fases */
function checkCopycatFase(b, g) {
  const gevoed = b.gevoed || 0;
  if ((b.fase || 1) < 2 && gevoed >= COPYCAT_F2) {
    b.fase = 2;
    b.copyKracht = (b.copyKracht || 0) + 1;
    baasFaseMoment('PAPPIE KIJKT TOE', UITSPRAKEN._erfprins.fase2);
    if (window.Vista) Vista.pose(b, 'cast', 2.4);
    pose2D(b, 'cast', 2.4);
  }
  if ((b.fase || 1) < 3 && gevoed >= COPYCAT_F3) {
    b.fase = 3;
    b.copyKracht = (b.copyKracht || 0) + 2;
    baasFaseMoment('HET IS ALLEMAAL VAN MIJ', UITSPRAKEN._erfprins.fase3);
    const el = actorEl(b); if (el) el.classList.add('woede');
    if (window.Vista) Vista.pose(b, 'cast', 2.4);
    pose2D(b, 'cast', 2.4);
  }
}

/* begin van je beurt: stall-straf + afkoeling tot de fase-bodem + tijds-vloer + fase-check.
   GEEN mercy-lek meer (Roof-rework: geen win-back — je krijgt enkel de niet-aanval-kaarten
   uitputtend terug doordat hij ze speelt). Bij een gebroken machine: tel af tot de
   herindexering (alleen bij herhaal-runs). */
function copycatBeurtStart(g) {
  const b = copycatBaas(g); if (!b) return;
  if (g.copycatGebroken) {
    if (g.copycatHerstelBeurt && (g.beurt || 0) >= g.copycatHerstelBeurt) {
      g.copycatGebroken = false; g.copycatHerstelBeurt = null;
      baasFaseMoment('HERINDEXEREN…', '„Ik kopieer gewoon opnieuw."');
    }
    return;
  }
  const raakte = g.raakteCopycat;
  /* stall-straf: deed je vorige beurt geen schade aan hem, dan leert hij traag bij;
     anders koelt zijn voeding licht af (nooit onder de huidige fase-bodem) */
  if (!raakte) b.gevoed = (b.gevoed || 0) + 1;
  else b.gevoed = Math.max(copycatFaseBodem(b.fase || 1), (b.gevoed || 0) - 1);
  g.raakteCopycat = false;
  /* tijds-vloer: hij blijft niet eeuwig in een lage fase hangen door stalling */
  if (g.beurt >= 5 && (b.fase || 1) < 2) b.gevoed = Math.max(b.gevoed || 0, COPYCAT_F2);
  if (g.beurt >= 10 && (b.fase || 1) < 3) b.gevoed = Math.max(b.gevoed || 0, COPYCAT_F3);
  checkCopycatFase(b, g);
}

/* anti-softlock: je houdt altijd minstens één speelbare kaart in de hand */
function copycatAntiSoftlock(g) {
  const b = copycatBaas(g); if (!b || g.copycatGebroken) return;
  const speelbaar = g.hand.some(c => {
    const d = kdef(c); if (!d || d.type === 'vloek') return false;
    return (kval(c, 'dmg') || 0) > 0 || d.type === 'vaardigheid' || d.type === 'kracht';
  });
  if (speelbaar) return;
  /* GEEN kaart uit zijn arsenaal trekken (dat zou win-back zijn) — enkel een echt vangnet
     zodat je niet vastloopt: herschud je afleg, of geef energie als zelfs dat leeg is. */
  if (g.afleg.length) {
    g.trek = schud(g.afleg); g.afleg = []; trekKaarten(1);
    melding('↩️ Je herschikt wat je nog hebt.');
  } else {
    g.energie += 1;
  }
}

/* de bazenbalk-indicator: het gestolen arsenaal (vervangt de oude aegis-badge) */
function copycatBalk(b) {
  if (S.gevecht && S.gevecht.copycatGebroken) {
    return `<div class="bb-aegis bb-gebroken" data-tip="De kopieermachine is gebroken — trouw was niet te indexeren.">🎭 machine gebroken</div>`;
  }
  const arsenaal = (b.gestolen || []);
  const lijst = arsenaal.length ? ` (${arsenaal.map(s => s.naam).join(', ')})` : '';
  return `<div class="bb-aegis" data-tip="Geroofd arsenaal: kaarten die de Erfprins uit je dek griste. Aanvallen speelt hij opgewaardeerd terug en verbrandt ze dan; de rest stuurt hij uitgeput naar je trek. Overleef tot zijn stapel op is (fase ${b.fase || 1}).">🎭 Geroofd · ${arsenaal.length}${lijst}</div>`;
}

function baasFaseMoment(titel, sub) {
  schudScherm();
  Klank.sfx('zwareklap');
  setTimeout(() => Klank.sfx('debuff'), 350);
  const el = document.createElement('div');
  el.className = 'baas-flits';
  el.innerHTML = `<h2>${titel}</h2><span>${sub}</span>`;
  $('#scherm-gevecht').appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

/* vijand toevoegen midden in het gevecht (de splijtende koning) */
function voegVijandToe(id) {
  const g = S.gevecht;
  if (!g || g.vijanden.filter(v => !v.dood).length >= 4) return;
  const v = maakVijand(id, 0);
  v.intent = VIJANDEN[id].kies(v, g.beurt);
  if (g.gedoofd) v.status.kracht = (v.status.kracht || 0) + 1;
  g.vijanden.push(v);
  bouwGevechtDom(g);
  if (d3Actief() && window.Vista) {
    Vista.gevechtStart(g, g.soort, !!g.achtergrond);
  } else {
    /* in 2D komt alleen de nieuwkomer het toneel op (eigen entree-variant indien gezet) */
    const wraps = document.querySelectorAll('#vijanden-rij .vijand');
    triggerEntree(wraps[wraps.length - 1], 0);
  }
  renderGevecht();
}

/* ---------- beurtverloop ---------- */
async function eindBeurt() {
  const g = S.gevecht;
  if (!g || g.bezig || g.voorbij) return;
  /* gestopt(): dit gevecht is intussen voorbij of vervangen door een nieuw */
  const gestopt = () => S.gevecht !== g || g.voorbij;
  g.bezig = true;
  g.gekozenKaart = null; g.gekozenDrank = null; g.voorbeeldKaart = null;

  /* DE ROOF — vangnet: eindigde je je eerste beurt zonder de Erfprins te raken, dan rooft hij
     nu alsnog (zelfde cinematic) vóór hij je kaarten begint te spelen. */
  if (!g.roofGedaan && copycatBaas(g) && !g.copycatGebroken) {
    await copycatDeRoof(g);
    if (gestopt()) { g.bezig = false; return; }
  }

  /* Gebroken Zandloper: het zand valt omhoog, energie blijft */
  if (heeftRelikwie('gebroken_zandloper') && g.energie > 0) g.bewaardeEnergie = g.energie;

  if ((g.speler.status.metaalhuid || 0) > 0) geefBlok(g.speler, g.speler.status.metaalhuid);
  /* DOOFPOT (licht-vloek): smoort je vlam aan het einde van elke beurt dat ze in je hand zit */
  const doofpotN = g.hand.filter(c => c.id === 'doofpot').length;
  if (doofpotN > 0) {
    fxNummer($('#speler-zone'), '🫥 Doofpot −' + (2 * doofpotN) + ' licht', 'fx-debuff');
    zetFakkel(-2 * doofpotN);
  }
  /* Verduisterd neemt aan het EINDE van de blind-beurt af (zo blijft de hand de hele beurt donker) */
  if ((g.speler.status.verduisterd || 0) > 0) g.speler.status.verduisterd--;
  g.afleg.push(...g.hand);
  g.hand = [];
  renderGevecht();
  await slaap(350);
  if (gestopt()) return;

  try {
  for (const v of g.vijanden) {
    if (v.dood || gestopt()) continue;
    v.blok = 0;

    if ((v.status.gif || 0) > 0) {
      const gd = VIJANDEN[v.id] || {};
      const lantaarn = heeftRelikwie('zielslantaarn');        /* breekt alle gif-afweer */
      const zz = lantaarn ? null : gd.zwarteZiel;
      const gif = v.status.gif;
      if (zz === 'absorbeer') {
        /* ZWARTE ZIEL (episch): de corruptie VERZWELGT het gif → het wezen HEELT i.p.v. schade. */
        v.hp = Math.min(v.maxHp || v.hp, v.hp + gif);
        fxNummer(actorEl(v), '🕳️ verzwelgt +' + gif, 'fx-blok');
        pose2D(v, 'gif', 0.9);          /* reactie-pose: de leegte slurpt je gif op en zwelt */
        zwarteZielHint(v);              /* per-wezen hint, 1× per gevecht */
      } else {
        /* verminder (Zwarte Ziel, gewone) OF baas/gifWeerstand → halve gif-tik. De Zielslantaarn
           breekt de SITUATIONELE counters (immuun/kaats/absorbeer/verminder, via zz=null hierboven)
           maar NIET de statische baas-halvering: een baas blijft innerlijk sterk tegen gif. */
        const halveer = (zz === 'verminder') || gd.baas || gd.gifWeerstand;
        if (halveer && zz === 'verminder') {
          fxNummer(actorEl(v), '🕳️ ½ gif', 'fx-blok');
          pose2D(v, 'gif', 0.9);        /* reactie-pose: het wezen dempt de helft van je gif */
          zwarteZielHint(v);
        } else if (halveer && !g._gifWeerstandGemeld) {
          melding('🛡️ De baas weerstaat de helft van het gif.'); g._gifWeerstandGemeld = true;
        }
        verliesHp(v, halveer ? Math.ceil(gif / 2) : gif);
      }
      v.status.gif--;
      renderGevecht();
      await slaap(380);
      if (gestopt()) return;
      if (v.dood) {
        /* De Zielslantaarn vangt de vrijgekomen ziel van een vergiftigde-corrupte vijand → +2 Kracht */
        if (lantaarn && (gd.zwarteZiel || gd.gifImmuun || gd.gifkaats || gd.gifWeerstand)) {
          geefStatus(sp(), 'kracht', 2); fxNummer($('#speler-zone'), '🏮 +2 Kracht', 'fx-buff');
        }
        if (alleVijanden().length === 0) { gevechtGewonnen(); return; }
        continue;
      }
    }
    if ((v.status.ritueel || 0) > 0) v.status.kracht = (v.status.kracht || 0) + v.status.ritueel;

    const el = actorEl(v);
    if (el) el.classList.add('actief');
    await slaap(420);
    if (gestopt()) return;

    const it = v.intent;
    if (it) {
      if (it.type === 'aanval') {
        const slagen = it.hits || 1;
        const gericht = it.doelMetgezel ? gMet() : null;   /* bv. de Erfprins die Drops wegwuift */
        for (let h = 0; h < slagen; h++) {
          vijandAanval(v, it.dmg, gericht);
          renderGevecht();
          if (gestopt()) return;
          if (v.dood) break;                 /* doodgegaan aan Doornen mid-reeks → stop de reeks */
          if (h < slagen - 1) await slaap(260);
          if (gestopt()) return;
        }
      } else if (it.type === 'blok') {
        geefBlok(v, it.blok);
        const bd = VIJANDEN[v.id].baas ? 2.6 : (VIJANDEN[v.id].elite ? 1.9 : 1.5);
        if (window.Vista) Vista.pose(v, 'block', bd);
        pose2D(v, 'block', bd);
      }
      if (it.type === 'buff' || it.type === 'debuff') {
        const cd = VIJANDEN[v.id].baas ? 2.6 : (VIJANDEN[v.id].elite ? 1.9 : 1.5);
        if (window.Vista) Vista.pose(v, 'cast', cd);
        pose2D(v, 'cast', cd);
      }
      if (it.doe) { const r = it.doe(v); if (r && r.then) await r; }   /* async intent (de Erfprins-plagiaat) wordt geawait, anders loopt 'ie door in de beurt */
      if (gestopt()) return;
    }
    if (el) el.classList.remove('actief');

    v.beurtTeller++;
    if ((v.status.kwetsbaar || 0) > 0) v.status.kwetsbaar--;
    if ((v.status.zwak || 0) > 0) v.status.zwak--;
    if (v.dood && alleVijanden().length === 0) { gevechtGewonnen(); return; }
    v.intent = VIJANDEN[v.id].kies(v, v.beurtTeller);
    renderGevecht();
    await slaap(380);
    if (gestopt()) return;
  }
  } catch (e) {
    /* een throw uit een data-hook (it.doe/kies, lookup-bugklasse) mag de beurt niet
       bevriezen: log, en val door naar het normale herstel (beurt netjes teruggeven). */
    console.error('Fout tijdens de vijandbeurt — beurt veilig teruggeven i.p.v. bevriezen:', e);
    if (gestopt()) return;
  }

  if (alleVijanden().length === 0) { gevechtGewonnen(); return; }
  beginSpelerBeurt();
}

function beginSpelerBeurt() {
  const g = S.gevecht;
  if (!g || g.voorbij) return;
  checkBaasFase(); /* gif-schade in de vijandbeurt kan een fasegrens passeren */
  g.beurt++;
  const s = g.speler;
  s.blok = (heeftRelikwie('was_zegel') && g.beurt === 1) ? s.blok : 0;   /* Was-zegel: behoud de overgebleven Blok van je openingsbeurt één beurt langer */
  g.aanvalDezeBeurt = 0;   /* Act 2: Originele Handtekening telt of dit je eerste aanval is */
  g._epidemieGespreid = false;   /* Epidemie mag deze beurt weer 1× verspreiden */
  s.status.doorslag = 0;   /* Doorslag vervalt per beurt — geen carry-over (de kaart zegt "deze beurt") */

  if ((s.status.gif || 0) > 0) {
    verliesHp(s, s.status.gif);
    s.status.gif--;
    if (g.voorbij) return;
  }
  /* SCHADUWSMET (licht-vloek): bijt elke beurt buiten helder licht (negeert Blok),
     enkel helder licht zuivert er 1 per beurt. Groei gebeurt na de trek (zie onder). */
  if ((s.status.schaduwsmet || 0) > 0) {
    if (lichtNiveau() === 'helder') {
      s.status.schaduwsmet--;
      fxNummer($('#speler-zone'), '✨ Schaduwsmet −1', 'fx-buff');
    } else {
      fxNummer($('#speler-zone'), '🌑 Schaduwsmet', 'fx-debuff');
      verliesHp(s, s.status.schaduwsmet);
      if (g.voorbij) return;
    }
  }
  if ((s.status.kwetsbaar || 0) > 0) s.status.kwetsbaar--;
  if ((s.status.zwak || 0) > 0) s.status.zwak--;
  if ((s.status.demonenvorm || 0) > 0) geefStatus(s, 'kracht', s.status.demonenvorm);
  if ((s.status.gifklieren || 0) > 0) alleVijanden().forEach(v => geefGif(v, s.status.gifklieren));
  if ((s.status.sporenkring || 0) > 0) alleVijanden().forEach(v => geefStatus(v, 'zwak', s.status.sporenkring));
  if ((s.status.duivelhart || 0) > 0) {
    geefStatus(s, 'kracht', s.status.duivelhart);
    /* het hart vreet rechtstreeks uit de fakkel (géén kaart-verbranding,
       dus jongleur/smeulbuidel/vuurvreter blijven erbuiten) */
    zetFakkel(-s.status.duivelhart);
    fxNummer($('#speler-zone'), '🔥-' + s.status.duivelhart, 'fx-debuff');
  }
  if (heeftRelikwie('mosamulet')) geefBlok(s, 3);
  /* Act 2 — Het Archief (elk uniek) */
  if (heeftRelikwie('dossierklem')) geefStatus(s, 'metaalhuid', 3);   /* groeiende Blok i.p.v. vaste +4 */
  /* Carbon-afdruk is nu reactief (zie doeSchade), geen start-van-beurt-blok meer */
  if (heeftRelikwie('inktpot')) alleVijanden().forEach(v => { if ((v.status.gif || 0) > 0) geefGif(v, 1); });   /* inkt verspreidt zich */
  /* het Houten Been geeft zijn +4 Blok nu bij gevechtsstart (zie startGevecht), niet hier —
     de g.beurt===1-haak vuurde pas op je TWEEDE beurt (off-by-one), terwijl de tekst "begin van elk gevecht" belooft */
  if ((s.status.bloedzuiger || 0) > 0) {
    const vergiftigd = alleVijanden().filter(v => (v.status.gif || 0) > 0).length;
    if (vergiftigd > 0) geneesHp(s.status.bloedzuiger * vergiftigd);
  }
  if ((s.status.innerlijkvuur || 0) > 0) verbrandLicht(2 * s.status.innerlijkvuur);
  if ((s.status.baken || 0) > 0) {
    zetFakkel(2 * s.status.baken);
    fxNummer($('#speler-zone'), '🔥+' + (2 * s.status.baken), 'fx-buff');
  }
  if (heeftRelikwie('hartsteen')) geneesHp(1);

  /* (checkDropsOntwaak verwijderd — Drops unlock je nu via het Drempel-ritueel) */
  metgezelBeurt();   /* de bondgenoot handelt aan het begin van je beurt (kan de laatste vijand vellen → onderstaande check vangt dat) */

  /* THE COPYCAT: mercy-lek (geen breker) óf breker-terugwin, stall-straf, fase-check */
  copycatBeurtStart(g);

  const lichtNu = lichtNiveau();
  g.energie = g.maxEnergie + (s.status.energiekern || 0) + (s.status.innerlijkvuur || 0)
    + (heeftRelikwie('energiekristal') ? 1 : 0)
    + (heeftRelikwie('schaduwkroon') && ['duister', 'gedoofd'].includes(lichtNu) ? 1 : 0)
    + (heeftRelikwie('kroon_van_sintels') && lichtNu === 'helder' ? 1 : 0)
    + (g.bewaardeEnergie || 0);
  if (g.bewaardeEnergie) {
    melding(`⏳ ${g.bewaardeEnergie} bewaarde Energie uit de zandloper.`);
    g.bewaardeEnergie = 0;
  }
  trekKaarten(5 + (heeftRelikwie('oorlogstrommel') ? 1 : 0));
  /* Mottenkroon: de motten brengen nieuws zolang het licht brandt */
  if (heeftRelikwie('mottenkroon') && lichtNu === 'helder') trekKaarten(1);
  /* LICHT-VLOEKEN in de hand (onspeelbaar) — sturen je fakkel-gedrag */
  const smetN = g.hand.filter(c => c.id === 'schaduwsmet').length;
  if (smetN > 0 && ['duister', 'gedoofd'].includes(lichtNu)) {
    geefStatus(s, 'schaduwsmet', smetN);   /* in het donker vreet de smet zich dieper in */
    melding('🌑 De Schaduwsmet vreet zich dieper in het donker.');
  }
  const motN = g.hand.filter(c => c.id === 'mottenvlam').length;
  if (motN > 0 && lichtNu === 'helder') {
    geefStatus(s, 'kwetsbaar', motN);      /* je felle vlam maakt je een doelwit voor de motten */
    melding('🦟 Je felle vlam lokt de Mottenvlam — je staat in het volle licht.');
  }
  g.jongleurOp = false; /* Fakkeljongleur is weer klaar voor zijn act */
  copycatAntiSoftlock(g);   /* THE COPYCAT: je houdt altijd minstens 1 speelbare kaart */

  if (alleVijanden().length === 0) { gevechtGewonnen(); return; }
  g.bezig = false;
  renderGevecht();
}

/* ---------- einde van het gevecht ---------- */
async function gevechtGewonnen() {
  const g = S.gevecht;
  if (!g || g.voorbij) return;
  g.voorbij = true;
  /* een episch-vijand-gevecht laat bij winst een episch-scherf vallen (bankt op je stash) */
  if (g.epischScherf) { const sid = vindScherf('episch'); if (sid) toonScherfReveal(sid, { kop: '🜂 DE EPISCHE VIJAND LAAT IETS NA' }); }
  /* Act 1+: elite-winst kan een willekeurige scherf opleveren → je verzamelt ze gaandeweg, ook in Act 1 */
  else if (g.soort === 'elite' && huidigeAct() >= 2 && willekeurig() < 0.5) { const sid = vindScherf(); if (sid) toonScherfReveal(sid, { kop: '🜂 TUSSEN DE RESTEN GLINSTERT IETS' }); }
  /* metgezel-HP uit dit gevecht meenemen naar de run-state (gaat mee naar het volgende) */
  if (g.metgezel && !g.metgezel.dood && S.metgezel && !S.metgezel.vluchtig) S.metgezel.hp = g.metgezel.hp;
  if (window.Vista) Vista.pose(g.speler, 'victory', 2.5);
  pose2D(g.speler, 'victory', 2.5);
  heldFx('hfx-victory', 2500);
  renderGevecht();
  await slaap(700);
  /* intussen een nieuw gevecht gestart? dan is deze afronding verouderd */
  if (S.gevecht !== g) return;
  Klank.sfx('win');
  stopGevechtLus();

  if (heeftRelikwie('brandend_bloed')) geneesHpBuitenGevecht(6);
  if (heeftRelikwie('het_grootboek')) geneesHpBuitenGevecht(8);
  if (heeftRelikwie('kookpot_van_maxenzele')) geneesHpBuitenGevecht(3);

  /* HET DONKER TEKENT JE — win je in volslagen duister (fakkel gedoofd), dan kan de
     schaduw zich in je dek nestelen. Verweven licht-vloek-bron (elke act); stuurt je
     weg van blind-vechten. Weg te slopen bij de Oude Smid. */
  if (lichtNiveau() === 'gedoofd' && willekeurig() < 0.3) {
    S.dek.push(nieuweKaart('schaduwsmet'));
    toonVloekReveal('schaduwsmet', 'Je versloeg ze in volslagen duister — en het donker tekende je. De Schaduwsmet groeit met elke donkere beurt; enkel helder licht zuivert haar. Sloop haar bij de Oude Smid.');
  }

  if (g.soort === 'baas') {
    /* de doodsklap van een baas verdient een flits en een stilte */
    const verslagenBaas = huidigeBaas().naam;
    const _du = baasUitspraken(huidigeBaas().id);
    baasSpreekt(g.copycatGebroken && _du.doodGebroken ? _du.doodGebroken : _du.dood);
    const flits = document.createElement('div');
    flits.className = 'baas-doodflits';
    $('#scherm-gevecht').appendChild(flits);
    schudScherm();
    await slaap(1400);
    flits.remove();
    if (S.gevecht !== g) return;
    if (g.baasScherf) toonScherfReveal(g.baasScherf, { kop: '🜂 UIT DE NALATENSCHAP VAN DE ERFPRINS' });   /* de baas-scherf krijgt nu pas zijn gewicht — op de kill, na de flits */
    /* (win-rites verwijderd — Vlamwachter/Mosgeest unlock je nu via het Drempel-ritueel) */
    if (S.gevecht !== g) return;
    S.gevecht = null;
    if (huidigeAct() < ACTS_MAX) {
      volgendeAct(verslagenBaas);   /* nog een act → episch verder afdalen */
    } else {
      wisSave();
      toonEinde(true, verslagenBaas);   /* laatste act verslagen → echte overwinning (toon de juiste baasnaam) */
    }
    return;
  }

  let goud = g.soort === 'elite' ? rnd(28, 40) : rnd(12, 22);
  if (asc() >= 4) goud = Math.floor(goud * 0.75);   /* ascension 4: schrale buit */
  if (g.gedoofd) goud = Math.floor(goud * 1.5);
  if (heeftRelikwie('gelukspoot')) goud = Math.floor(goud * 1.25);
  if (heeftRelikwie('leren_buidel')) goud += 10;
  if (heeftRelikwie('kaarsenstomp')) zetFakkel(3);

  S.beloning = {
    goud,
    kaarten: trekKaartBeloning(),
    relikwie: g.soort === 'elite' ? willekeurigRelikwie({ ongewoon: 50, zeldzaam: 38, episch: 12 }) : null,
    drank: (willekeurig() < 0.3 && S.dranken.length < drankSlots()) ? kiesUit(Object.keys(DRANKEN)) : null
  };
  S.gevecht = null;
  renderBeloning();
}

function nederlaag() {
  const g = S.gevecht;
  if (!g || g.voorbij) return;
  g.voorbij = true;
  g.bezig = true;
  Klank.sfx('verlies');
  wisSave();
  setTimeout(() => {
    if (S.gevecht !== g) return; /* verouderde afronding */
    stopGevechtLus();
    toonEinde(false);
  }, 900);
}

/* kaartenpool van de huidige held: eigen kaarten + neutrale */
function heldPool() {
  return Object.keys(KAARTEN).filter(id => {
    const k = KAARTEN[id];
    return !['basis', 'vloek'].includes(k.zeld) && (!k.held || k.held === S.held) && (!k.act || k.act <= huidigeAct());
  });
}

function trekKaartBeloning() {
  const pool = heldPool();
  const gewicht = id => ({ gewoon: 60, ongewoon: 32, zeldzaam: 8, episch: 3 })[KAARTEN[id].zeld] || 0;
  /* licht = opties: bij helder zie je méér van de buit, in het donker minder */
  const niveau = lichtNiveau();
  const aantal = niveau === 'helder' ? 4 : (niveau === 'schemer' ? 3 : 2);
  const keuzes = [];
  let poging = 0;
  while (keuzes.length < aantal && poging++ < 200) {
    const totaal = pool.reduce((s, id) => s + gewicht(id), 0);
    let r = Toeval.volgende() * totaal;
    let gekozen = pool[0];
    for (const id of pool) { r -= gewicht(id); if (r <= 0) { gekozen = id; break; } }
    if (!keuzes.includes(gekozen)) keuzes.push(gekozen);
  }
  return keuzes;
}

/* ---------- beloningscherm ---------- */
function renderBeloning() {
  toonScherm('beloning');
  schermAchtergrond('beloning', actBg('beloning'), 0.5);
  const b = S.beloning;
  let html = `<h2 class="scherm-titel">Overwinning!</h2>
    <p class="scherm-sub">De buit neem je automatisch mee — alleen de kaartkeuze is aan jou.</p>
    <div class="beloning-lijst">`;
  if (b.goud > 0) html += `<button class="beloning-item" onclick="pakGoud()">🪙 ${b.goud} goud</button>`;
  if (b.relikwie) {
    const rd = RELIKWIEEN[b.relikwie];
    html += `<button class="beloning-item" onclick="pakRelikwie()"><span class="art-mini rel-${rd.zeld}" data-rart="${b.relikwie}">${rd.icoon}</span> ${rd.naam} <span class="schaarste-chip rel-${rd.zeld}">${SCHAARSTE_LABEL[rd.zeld]}</span><small>${rd.tekst}</small></button>`;
  }
  if (b.drank) html += `<button class="beloning-item" onclick="pakDrank()"><span class="art-mini" data-dart="${b.drank}">${DRANKEN[b.drank].icoon}</span> ${DRANKEN[b.drank].naam}<small>${DRANKEN[b.drank].tekst}</small></button>`;
  if (b.kaarten) html += `<button class="beloning-item beloning-kaartkeuze" onclick="toonKaartBeloning()">🃏 Kies een kaart <small>${b.kaarten.length} opties — je fakkel bepaalt hoeveel je er ziet</small></button>`;
  html += `</div><button class="knop-groot" onclick="verderNaBeloning()">Verder ➤</button>`;
  $('#scherm-beloning').innerHTML = html;
  verfraaiItemArt($('#scherm-beloning'));
  renderTopbalk();
}

/* "Verder" raapt alle resterende buit automatisch op — niets blijft liggen */
function verderNaBeloning() {
  const b = S.beloning || {};
  const mee = [];
  if (b.goud > 0) { S.goud += b.goud; mee.push(`🪙 ${b.goud} goud`); b.goud = 0; Klank.sfx('goud'); }
  if (b.relikwie) { geefRelikwie(b.relikwie); mee.push(RELIKWIEEN[b.relikwie].naam); b.relikwie = null; }
  if (b.drank) {
    if (S.dranken.length < drankSlots()) { S.dranken.push(b.drank); mee.push(DRANKEN[b.drank].naam); }
    else mee.push(`${DRANKEN[b.drank].naam} achtergelaten (geen vak vrij)`);
    b.drank = null;
  }
  if (mee.length) melding('Meegenomen: ' + mee.join(' · '));
  renderKaartScherm();
}
function pakGoud() { Klank.sfx('goud'); S.goud += S.beloning.goud; S.beloning.goud = 0; renderBeloning(); }
function pakRelikwie() { geefRelikwie(S.beloning.relikwie); melding('Relikwie opgepakt!'); S.beloning.relikwie = null; renderBeloning(); }
function pakDrank() {
  if (S.dranken.length >= drankSlots()) { melding('Geen drankjesvak vrij!'); return; }
  S.dranken.push(S.beloning.drank); S.beloning.drank = null; renderBeloning();
}
function toonKaartBeloning() {
  const keuzes = S.beloning.kaarten;
  toonKaartKeuze(keuzes.map(id => nieuweKaart(id)), 'Voeg een kaart toe aan je dek', c => {
    S.dek.push(c);
    melding(`${knaam(c)} toegevoegd!`);
    S.beloning.kaarten = null;
    renderBeloning();
  }, () => { S.beloning.kaarten = null; renderBeloning(); }, { onthul: true });
}

/* ---------- kaartkeuze-overlay ---------- */
function kaartHtml(c, klikbaar) {
  const def = kdef(c);
  return `<div class="kaart groot ktype-${def.type} zeld-${def.zeld} ${def.licht || def.vuur ? 'kaart-licht' : ''} ${c.aangetast ? 'kaart-aangetast-art' : ''} ${klikbaar ? 'klikbaar' : ''}" data-uid="${c.uid}">
    <div class="kaart-kost">${kkost(c) === null ? '✕' : kkost(c)}</div>
    ${def.licht ? `<div class="kaart-lichtkost" data-tip="Verbrandt fakkellicht bij het spelen">🔥${kval(c, 'licht')}</div>` : ''}
    ${c.vonk ? `<div class="kaart-vonk ${c.vonk > 0 ? 'vonk-helder' : 'vonk-duister'}" data-tip="${c.vonk > 0 ? 'Heldering: +' + vonkBedrag(c) + ' fakkellicht telkens je deze kaart speelt' : 'Verduistering: verbrandt ' + vonkBedrag(c) + ' fakkellicht bij het spelen, maar geeft je evenveel Blok'}">${c.vonk > 0 ? '🔥' : '🜂'}${vonkBedrag(c)}</div>` : ''}
    ${c.aangetast ? `<div class="kaart-aangetast" data-tip="Aangetast: door de Erfprins gecorrumpeerd — +1 Energie en uitputtend (eenmalig speelbaar)">🩸</div>` : ''}
    <div class="kaart-naam">${knaam(c)}</div>
    <div class="kaart-icoon" data-kicoon="${c.id}">${def.icoon}</div>
    <div class="kaart-tekst">${def.tekst(c)}</div>
    <div class="kaart-type">${def.type}</div>
  </div>`;
}

/* kaartkeuze met booster-onthulling en inspectie-zoom:
   opts.onthul  = kaarten beginnen gedekt en flippen open (beloningen)
   opts.bekijkAlleen = geen kies-knop in de zoomweergave (dek-overzicht) */
/* "specialere kaarten" = de betere zeldzaamheden (niet basis/gewoon/vloek):
   die blijven in een keuzemoment omgedraaid tot de speler ze zelf onthult. */
function bijzondereKaart(c) { return ['ongewoon', 'zeldzaam', 'episch'].includes(kdef(c).zeld); }
function toonKaartKeuze(kaarten, titel, bijKeuze, bijOverslaan, opts = {}) {
  const ov = $('#overlay-kies');
  const houder = $('#kies-kaarten');
  $('#kies-titel').textContent = titel;
  const onthuld = new Set(opts.onthul ? [] : kaarten.map(c => c.uid));

  function zetRugArt() {
    if (!window.laadKaartAfbeelding) return;
    laadKaartAfbeelding('rug', img => {
      if (img) houder.querySelectorAll('.kaart-rug').forEach(r => {
        r.style.backgroundImage = `url("${img.src}")`;
        r.classList.add('met-art');
      });
    });
  }

  function onthul(el, c) {
    onthuld.add(c.uid);
    el.classList.add('open');
    Klank.sfx('flip');
    if (bijzondereKaart(c)) {                                  /* SIGNATURE: een speciale reveal-flourish (gouden burst + schitter) */
      el.classList.add('signatuur-reveal');
      setTimeout(() => Klank.sfx('schitter'), 200);
    }
  }

  function toonRij() {
    document.onkeydown = null;
    houder.classList.remove('focus-modus');
    houder.classList.toggle('weinig', kaarten.length <= 5);
    $('#kies-hint').textContent = 'Klik een kaart om hem van dichtbij te bekijken'
      + (opts.bekijkAlleen || !bijKeuze ? '.' : ' vóór je kiest.');
    houder.innerHTML = kaarten.map(c => `
      <div class="onthul-kaart ${onthuld.has(c.uid) ? 'open' : ''} ${bijzondereKaart(c) ? 'bijzonder' : ''}" data-uid="${c.uid}">
        <div class="onthul-binnen">
          <div class="onthul-voor zeldglans-${kdef(c).zeld}">${kaartHtml(c, true)}</div>
          <div class="kaart-rug"></div>
        </div>
      </div>`).join('');
    verfraaiKaartIconen(houder);
    zetRugArt();
    houder.querySelectorAll('.onthul-kaart').forEach(el => {
      el.onclick = () => {
        const c = kaarten.find(k => k.uid == el.dataset.uid);
        if (!c) return;
        if (!onthuld.has(c.uid)) onthul(el, c);
        else focus(c);
      };
    });
    /* reveal-gedrag PER PLATFORM:
       — LAPTOP: alle kaarten flippen vanzelf gespreid open (incl. de signature-kaarten, die
         hun eigen flourish krijgen in onthul()). Gewone eerst, signature als climax laatst.
       — MOBIEL: niets auto-flippen → alles blijft GEDEKT mét de gloed; de speler tikt elke
         kaart zelf open (tactiel onthul-moment — geluidjes + signature-flourish blijven). */
    if (opts.onthul && document.body.dataset.modus !== 'mobiel') {
      const volgorde = kaarten.slice().sort((a, b) => (bijzondereKaart(a) ? 1 : 0) - (bijzondereKaart(b) ? 1 : 0));
      volgorde.forEach((c, i) => {
        setTimeout(() => {
          if (onthuld.has(c.uid) || !ov.classList.contains('open')) return;
          const el = houder.querySelector(`.onthul-kaart[data-uid="${c.uid}"]`);
          if (el) onthul(el, c);
        }, 450 + i * 420);
      });
    }
  }

  function focus(c) {
    const idx = kaarten.findIndex(k => k.uid === c.uid);
    onthuld.add(c.uid);
    houder.classList.add('focus-modus');
    const meer = kaarten.length > 1;
    $('#kies-hint').textContent = meer
      ? 'Blader met ◀ ▶ of de pijltjestoetsen.'
      : 'Beweeg je muis over de kaart voor de glans.';
    houder.innerHTML = `
      <div class="kaart-focus-houder">
        <div class="focus-rij">
          ${meer ? '<button class="focus-pijl" id="focus-vorige" aria-label="Vorige kaart">◀</button>' : ''}
          ${kaartHtml(c, false).replace('kaart groot', 'kaart groot kaart-focus zeldglans-' + kdef(c).zeld)}
          ${meer ? '<button class="focus-pijl" id="focus-volgende" aria-label="Volgende kaart">▶</button>' : ''}
        </div>
        ${meer ? `<div class="focus-teller">${idx + 1} / ${kaarten.length}</div>` : ''}
        <div class="focus-knoppen">
          ${(opts.bekijkAlleen || !bijKeuze) ? '' : '<button class="knop-groot" id="focus-kies">✓ Kies deze kaart</button>'}
          <button class="knop-stil" id="focus-terug">← Terug</button>
        </div>
      </div>`;
    verfraaiKaartIconen(houder);
    Klank.sfx('trek');
    const blader = stap => focus(kaarten[(idx + stap + kaarten.length) % kaarten.length]);
    if (meer) {
      $('#focus-vorige').onclick = () => blader(-1);
      $('#focus-volgende').onclick = () => blader(1);
    }
    /* pijltjestoetsen bladeren mee; Esc gaat terug naar de rij */
    document.onkeydown = e => {
      if (!ov.classList.contains('open')) { document.onkeydown = null; return; }
      if (meer && e.key === 'ArrowLeft') { e.preventDefault(); blader(-1); }
      else if (meer && e.key === 'ArrowRight') { e.preventDefault(); blader(1); }
      else if (e.key === 'Escape') { e.preventDefault(); toonRij(); }
    };
    const kiesKnop = $('#focus-kies');
    if (kiesKnop) kiesKnop.onclick = () => { document.onkeydown = null; ov.classList.remove('open'); evalueerDraaiBlok(); bijKeuze(c); };
    $('#focus-terug').onclick = toonRij;
  }

  $('#kies-overslaan').onclick = () => { document.onkeydown = null; ov.classList.remove('open'); evalueerDraaiBlok(); bijOverslaan && bijOverslaan(); };
  toonRij();
  ov.classList.add('open');
  evalueerDraaiBlok();   /* een kaartoverzicht (smid/keuze/dek) speelt liggend */
}

/* ---------- MEERVOUDIGE KAARTKEUZE (de altaren) ----------
   Kaarten liggen meteen OPEN; je TIKT om te (de)selecteren — duidelijke gekozen-staat
   (✓-badge + gouden gloed + lift) + een VASTE actiebalk onderaan (teller + bevestig +
   overslaan) die altijd bereikbaar blijft (geen scroll door het hele dek meer). Een 🔍 per
   kaart opent een grote bekijk-weergave. opts: { aantal, knop, hint, bijKeuze(array), bijOverslaan } */
function toonMeerKeuze(kaarten, titel, opts) {
  opts = opts || {};
  const aantal = Math.max(1, opts.aantal || 1);
  const ov = $('#overlay-kies');
  const houder = $('#kies-kaarten');
  $('#kies-titel').textContent = titel;
  $('#kies-hint').textContent = opts.hint || (aantal > 1 ? `Tik ${aantal} kaarten aan om te kiezen.` : 'Tik een kaart aan om te kiezen.');
  $('#kies-overslaan').style.display = 'none';                 /* eigen overslaan in de actiebalk */
  const gekozen = new Set();
  let balk = ov.querySelector('.kies-actiebalk');
  if (!balk) { balk = document.createElement('div'); balk.className = 'kies-actiebalk'; ov.appendChild(balk); }

  function sluit() {
    document.onkeydown = null;
    ov.classList.remove('open');
    houder.classList.remove('meer-modus', 'focus-modus');
    const b = ov.querySelector('.kies-actiebalk'); if (b) b.remove();
    $('#kies-overslaan').style.display = '';
    evalueerDraaiBlok();
  }

  function renderBalk() {
    const n = gekozen.size, klaar = n === aantal;
    balk.innerHTML = `
      <span class="kies-teller ${klaar ? 'klaar' : ''}">Gekozen: <b>${n}</b> / ${aantal}</span>
      <button class="knop-groot kies-bevestig" ${klaar ? '' : 'disabled'}>${opts.knop || '✓ Bevestig'}</button>
      <button class="knop-stil kies-annuleer">Overslaan</button>`;
    balk.querySelector('.kies-bevestig').onclick = () => {
      if (gekozen.size !== aantal) return;
      const sel = kaarten.filter(c => gekozen.has(c.uid));
      sluit(); opts.bijKeuze && opts.bijKeuze(sel);
    };
    balk.querySelector('.kies-annuleer').onclick = () => { sluit(); opts.bijOverslaan && opts.bijOverslaan(); };
  }

  function syncGekozen() {                                    /* markeer ALLE kaarten tegen de set (een 1-keuze vervangt → de oude moet ook ontmarkeren) */
    houder.querySelectorAll('.meer-kaart').forEach(el => {
      const cc = kaarten.find(k => k.uid == el.dataset.uid);
      el.classList.toggle('gekozen', !!cc && gekozen.has(cc.uid));
    });
  }
  function kiesToggle(c) {
    if (gekozen.has(c.uid)) { gekozen.delete(c.uid); Klank.sfx('trek'); return; }
    if (gekozen.size >= aantal) {
      if (aantal === 1) gekozen.clear();                       /* één-keuze: vervang meteen */
      else { melding(`Je kunt er maar ${aantal} kiezen — tik er eerst één weg.`); Klank.sfx('fout'); return; }
    }
    gekozen.add(c.uid); Klank.sfx('flip');
  }

  function render() {
    houder.classList.remove('focus-modus');
    houder.classList.add('meer-modus');
    houder.classList.toggle('weinig', kaarten.length <= 5);
    houder.innerHTML = kaarten.map(c => `
      <div class="meer-kaart ${gekozen.has(c.uid) ? 'gekozen' : ''}" data-uid="${c.uid}">
        ${kaartHtml(c, true)}
        <div class="meer-vink" aria-hidden="true">✓</div>
        <button class="meer-zoom-knop" data-uid="${c.uid}" aria-label="Bekijk groot">🔍</button>
      </div>`).join('');
    verfraaiKaartIconen(houder);
    houder.querySelectorAll('.meer-kaart').forEach(el => {
      el.onclick = e => {
        if (e.target.closest('.meer-zoom-knop')) return;
        const c = kaarten.find(k => k.uid == el.dataset.uid); if (!c) return;
        kiesToggle(c);
        syncGekozen();
        renderBalk();
      };
    });
    houder.querySelectorAll('.meer-zoom-knop').forEach(b => {
      b.onclick = e => { e.stopPropagation(); const c = kaarten.find(k => k.uid == b.dataset.uid); if (c) zoom(c); };
    });
    renderBalk();
  }

  function zoom(c) {
    houder.classList.add('focus-modus');
    const isSel = gekozen.has(c.uid);
    $('#kies-hint').textContent = 'Bekijk de kaart van dichtbij.';
    houder.innerHTML = `<div class="kaart-focus-houder"><div class="focus-rij">
        ${kaartHtml(c, false).replace('kaart groot', 'kaart groot kaart-focus zeldglans-' + kdef(c).zeld)}
      </div>
      <div class="focus-knoppen">
        <button class="knop-groot" id="zoom-kies">${isSel ? '✗ Haal uit selectie' : '✓ Kies deze'}</button>
        <button class="knop-stil" id="zoom-terug">← Terug naar het overzicht</button>
      </div></div>`;
    verfraaiKaartIconen(houder);
    Klank.sfx('trek');
    $('#zoom-kies').onclick = () => { kiesToggle(c); render(); };
    $('#zoom-terug').onclick = () => { $('#kies-hint').textContent = opts.hint || ''; render(); };
  }

  render();
  ov.classList.add('open');
  evalueerDraaiBlok();
}

function toonDek() {
  toonKaartKeuze(S.dek, `Jouw dek (${S.dek.length} kaarten)`, null, () => {}, { bekijkAlleen: true });
}

function kiesKaartUitDek(modus, titel, naKeuze) {
  let kandidaten = S.dek;
  if (modus === 'upgrade') kandidaten = S.dek.filter(c => !c.up && kdef(c).up);
  if (kandidaten.length === 0) { melding('Geen geschikte kaarten.'); naKeuze && naKeuze(null); return; }
  toonKaartKeuze(kandidaten, titel, c => {
    if (modus === 'upgrade') {
      smeedCeremonie(c, () => {
        if (naKeuze) naKeuze(c);
        else if (S.scherm === 'event') eventKlaar('De smid bewondert zijn werk. "Da\'s beter staal."');
      });
      return;
    }
    if (modus === 'verwijder') { S.dek = S.dek.filter(k => k.uid !== c.uid); melding(`${kdef(c).naam} verwijderd.`); }
    if (naKeuze) naKeuze(c);
    else if (S.scherm === 'event') eventKlaar('Gedaan! De smid knikt tevreden.');
  }, () => {
    if (naKeuze) naKeuze(null);
    else if (S.scherm === 'event') eventKlaar('Je bedenkt je.');
  });
}

/* de smeed-ceremonie: hamerslag, vonken, en de upgrade zichtbaar als voor → na */
function smeedCeremonie(c, daarna) {
  const ov = $('#overlay-kies');
  const houder = $('#kies-kaarten');
  const oudeTekst = kdef(c).tekst(c);
  const oudeNaam = knaam(c);
  $('#kies-titel').textContent = 'De smidse';
  $('#kies-hint').textContent = 'Het vuur loeit op... de hamer wordt geheven.';
  $('#kies-overslaan').style.display = 'none';
  houder.classList.add('focus-modus');
  houder.innerHTML = `<div class="kaart-focus-houder" id="smeed-houder">
    ${kaartHtml(c, false).replace('kaart groot', 'kaart groot kaart-focus')}
  </div>`;
  verfraaiKaartIconen(houder);
  ov.classList.add('open');

  setTimeout(() => {
    /* DE HAMERSLAG */
    c.up = true;
    Klank.sfx('smeed');
    Klank.sfx('zwareklap');
    ov.classList.remove('smeed-dreun'); void ov.offsetWidth; ov.classList.add('smeed-dreun');
    const vonken = Array.from({ length: 16 }, () =>
      `<span class="vonk" style="--vx:${(Math.random() * 320 - 160).toFixed(0)}px; --vy:${(-Math.random() * 260 - 40).toFixed(0)}px; --vd:${(0.5 + Math.random() * 0.5).toFixed(2)}s; left:50%; top:45%"></span>`
    ).join('');
    $('#kies-hint').textContent = 'KLANG!';
    houder.innerHTML = `<div class="kaart-focus-houder" id="smeed-houder">
      ${kaartHtml(c, false).replace('kaart groot', 'kaart groot kaart-focus gesmeed')}
      <div class="smeed-diff"><s>${oudeNaam} — ${oudeTekst}</s><span class="smeed-pijl">⤷</span><b>${knaam(c)} — ${kdef(c).tekst(c)}</b></div>
      <button class="knop-groot" id="smeed-klaar">Prachtig ➤</button>
      ${vonken}
    </div>`;
    verfraaiKaartIconen(houder);
    setTimeout(() => Klank.sfx('schitter'), 250);
    $('#smeed-klaar').onclick = () => {
      ov.classList.remove('open', 'smeed-dreun');
      $('#kies-overslaan').style.display = '';
      melding(`${knaam(c)} gesmeed!`);
      daarna && daarna();
    };
  }, 1100);
}

/* ---------- HET VONKALTAAR: brand fakkelkracht (±) in een kaart — een GOK ----------
   Mysterieus & random: je kiest de kaart, de vlam kiest de aard. gevoed=true (25 licht
   geofferd) kantelt de kansen naar Heldering. Seeded (willekeurig) → dailies eerlijk. */
function vonkAltaarKies(gevoed) {
  const kandidaten = S.dek.filter(c => !c.vonk && KAARTEN[c.id] && KAARTEN[c.id].kost !== null);
  if (!kandidaten.length) { eventKlaar('Geen enkele kaart vat nog vlam — alles is al gebrandmerkt of te koud.'); return; }
  toonMeerKeuze(kandidaten, gevoed ? 'Leg een kaart in de gevoede vlam' : 'Leg een kaart in de vlam', {
    aantal: 1, knop: '🔥 In de vlam', hint: 'Tik de kaart aan die je in de vlam legt — de vlam kiest zelf de aard.',
    bijKeuze: sel => vonkAltaarBrand(sel[0], gevoed),
    bijOverslaan: () => eventKlaar('Je trekt je hand terug van de hitte. De vlam knettert teleurgesteld na.')
  });
}
function vonkAltaarBrand(c, gevoed) {
  const ov = $('#overlay-kies'); if (ov) ov.classList.remove('open');
  evalueerDraaiBlok();
  if (gevoed) zetFakkel(-25);                  /* de offergave wordt pas hier betaald (geen kost bij annuleren) */
  const r = willekeurig();
  /* gevoed schuift de tabel naar Heldering/jackpot; blind is een echte gok */
  const niveau = gevoed
    ? (r < 0.24 ? 2 : r < 0.64 ? 1 : r < 0.84 ? -1 : r < 0.94 ? -2 : 0)
    : (r < 0.10 ? 2 : r < 0.42 ? 1 : r < 0.74 ? -1 : r < 0.90 ? -2 : 0);
  if (niveau === 0) {                          /* de dud — met een schrale troost */
    zetFakkel(8);
    Klank.sfx('debuff');
    eventKlaar(`De vlam likt aan <b>${knaam(c)}</b>… en dooft sissend. Niets gebrand — de kaart blijft koud. (Je fakkel pikt nog 8 licht op uit de nagloed.)`);
    return;
  }
  c.vonk = niveau;
  saveSpel();
  schudScherm();
  Klank.sfx(niveau > 0 ? 'schitter' : 'smeed');
  const n = vonkBedrag(c);
  const tekst = niveau > 0
    ? `🔥 De vlam <b>OMHELST</b> ${knaam(c)}! <b>Heldering${niveau === 2 ? ' (groot)' : ''}</b> — telkens je deze kaart speelt laait je fakkel <b>+${n} licht</b> op. Een geschenk voor wie in het licht vecht.`
    : `🜂 De vlam <b>HONGERT</b> in ${knaam(c)}. <b>Verduistering${niveau === -2 ? ' (diep)' : ''}</b> — bij het spelen verbrandt ze <b>${n} licht</b>, maar geeft je <b>${n} Blok</b>. Wie het donker omarmt, wordt erdoor gehard.`;
  eventKlaar(tekst);
}

/* HET VONKALTAAR — een VLOEK als brandstof: de vlam verslindt haar (uit je dek) en het
   vrijgekomen duister slaat om in GEGARANDEERD Heldering op een willekeurige kaart (de vlam
   kiest, niet jij). Zo wordt je grootste tegenslag licht — de licht-economie rond. Tweede
   uitweg voor vloeken náást de Oude Smid (die kost goud, geen beloning). */
function vonkAltaarVloek() {
  const vloeken = S.dek.filter(c => KAARTEN[c.id] && KAARTEN[c.id].type === 'vloek');
  if (!vloeken.length) { eventKlaar('Je draagt geen vloek om te offeren.'); return; }
  toonMeerKeuze(vloeken, 'Welke vloek werp je in de vlam?', {
    aantal: 1, knop: '🔥 Werp in de vlam', hint: 'Tik de vloek aan — de vlam verslindt haar en slaat het duister om in licht.',
    bijKeuze: sel => vonkAltaarVerteer(sel[0]),
    bijOverslaan: () => eventKlaar('Je houdt de vloek tegen je borst. Nog niet.')
  });
}
function vonkAltaarVerteer(vloek) {
  const ov = $('#overlay-kies'); if (ov) ov.classList.remove('open');
  evalueerDraaiBlok();
  S.dek = S.dek.filter(k => k.uid !== vloek.uid);          /* de vloek wordt verslonden */
  schudScherm();
  Klank.sfx('schitter');
  /* de vlam grijpt een willekeurige nog-niet-gebrandmerkte speelbare kaart en brandt er licht in */
  const doelen = S.dek.filter(c => !c.vonk && KAARTEN[c.id] && KAARTEN[c.id].kost !== null);
  if (!doelen.length) {
    zetFakkel(25);                                          /* geen kaart om te zegenen → de gloed gaat naar je fakkel */
    saveSpel();
    eventKlaar(`De vlam <b>VERSLINDT</b> ${knaam(vloek)} en laait hoog op — geen kaart vat de gloed, dus je fakkel drinkt het licht. <b>(+25 licht)</b>`);
    return;
  }
  const doel = kiesUit(doelen);
  const niveau = willekeurig() < 0.4 ? 2 : 1;               /* gegarandeerd Heldering; soms groot */
  doel.vonk = niveau;
  saveSpel();
  const n = vonkBedrag(doel);
  eventKlaar(`De vlam <b>VERSLINDT</b> ${knaam(vloek)} — en het vrijgekomen duister slaat om in licht. Ze brandt <b>Heldering${niveau === 2 ? ' (groot)' : ''}</b> in <b>${knaam(doel)}</b>: telkens je die kaart speelt laait je fakkel <b>+${n} licht</b> op.`);
}

/* ---------- HET OFFERALTAAR: offer kaarten (of vloeken) → smeed er een BETERE van ----------
   De steen verslindt je offers en baart één willekeurige kaart hoger op de ladder (zij kiest
   het resultaat — mysterieus). Een vloek is potente brandstof: +1 extra tier. Náást de smid
   (verwijderen) en het Vonkaltaar (vonk branden) — een derde, eigen smaak: transmutatie. */
const ZELD_LADDER = ['gewoon', 'ongewoon', 'zeldzaam', 'episch'];
function zeldOmhoog(zeld, stappen) {
  const i = ZELD_LADDER.indexOf(zeld);
  if (i < 0) return ZELD_LADDER[Math.min(ZELD_LADDER.length - 1, stappen - 1)];   /* basis/vloek → start onderaan */
  return ZELD_LADDER[Math.min(ZELD_LADDER.length - 1, i + stappen)];
}
function willekeurigeKaartVanZeld(doelZeld) {
  for (let z = ZELD_LADDER.indexOf(doelZeld); z >= 0; z--) {   /* val terug naar lagere tier als de pool leeg is */
    const kand = heldPool().filter(id => KAARTEN[id].zeld === ZELD_LADDER[z]);
    if (kand.length) return kiesUit(kand);
  }
  return null;
}
function offeraltaarVersmelt() {
  if (S.dek.length < 2) { eventKlaar('Je dek is te dun om te versmelten.'); return; }
  toonMeerKeuze(S.dek.slice(), 'Offer 2 kaarten aan de steen', {
    aantal: 2, knop: '🔥 Versmelt deze 2', hint: 'Tik 2 kaarten aan — de steen verslindt ze en smeedt er één betere van.',
    bijKeuze: sel => offeraltaarSmeed(sel, 1),
    bijOverslaan: () => eventKlaar('Je houdt je kaarten tegen je borst. De steen verkilt.')
  });
}
function offeraltaarBloed() {
  if (!(S.hp > 8 && S.dek.length > 1)) { eventKlaar('De steen wijst je bloedoffer af.'); return; }
  toonMeerKeuze(S.dek.slice(), 'Offer 1 kaart in bloed', {
    aantal: 1, knop: '🩸 Offer in bloed (−8 HP)', hint: 'Tik 1 kaart aan — ze stijgt twee tiers, maar het kost je 8 HP.',
    bijKeuze: sel => { verliesHpBuitenGevecht(8); offeraltaarSmeed(sel, 2); },
    bijOverslaan: () => eventKlaar('Je deinst terug van de hongerige muil.')
  });
}
function offeraltaarSmeed(offers, tiers) {
  const ov = $('#overlay-kies'); if (ov) ov.classList.remove('open');
  evalueerDraaiBlok();
  const uids = new Set(offers.map(c => c.uid));
  const vloekBonus = offers.some(c => kdef(c).type === 'vloek') ? 1 : 0;    /* een vloek voedt de honger: +1 tier */
  const echteZeld = offers.map(c => kdef(c).zeld).filter(z => ZELD_LADDER.includes(z))
    .sort((x, y) => ZELD_LADDER.indexOf(y) - ZELD_LADDER.indexOf(x));
  const basisZeld = echteZeld[0] || 'gewoon';
  const doelZeld = zeldOmhoog(basisZeld, tiers + vloekBonus);
  S.dek = S.dek.filter(c => !uids.has(c.uid));                              /* verteer de offers */
  const nieuwId = willekeurigeKaartVanZeld(doelZeld);
  schudScherm();
  Klank.sfx('schitter');
  const offerNamen = offers.map(c => knaam(c)).join(' + ');
  if (!nieuwId) { zetFakkel(20); saveSpel(); eventKlaar(`De steen verslindt <b>${offerNamen}</b> maar baart niets — de gloed slaat terug in je fakkel. <b>(+20 licht)</b>`); return; }
  const nk = nieuweKaart(nieuwId); S.dek.push(nk); saveSpel();
  toonKaartReveal(nk.id, { kop: '🔥 DE STEEN SMEEDT', flavor: '„Dít," fluistert ze, „heb ik voor je gekozen."' });
  eventKlaar(`De steen verslindt <b>${offerNamen}</b>${vloekBonus ? ' (de vloek voedt haar honger)' : ''} en smeedt er één <b>${kdef(nk).zeld}</b> kaart van: <b>${knaam(nk)}</b>. „Dít," fluistert ze, „heb ik voor je gekozen."`);
}

/* ============================================================
   RUSTPLAATS / SCHAT / WINKEL / EVENTS / EINDE
   ============================================================ */
let rustKlaar = false;
function toonRust() {
  toonScherm('rust');
  rustKlaar = false;
  /* de vloer van de plaat onderin houden, zodat het vuur erop staat */
  schermAchtergrond('rust', actBg('rust'), 0.42, 'center bottom');
  const heel = Math.floor(S.maxHp * 0.3) + (heeftRelikwie('levenskruik') ? 10 : 0);
  const kanSmeden = S.dek.some(c => !c.up && kdef(c).up);
  const kanPoken = S.fakkel < 100;
  /* dwarrelende vonken met eigen koers en tempo (presentationeel) */
  const vonken = Array.from({ length: 14 }, () =>
    `<span class="kv-vonk" style="--vx:${(Math.random() * 70 - 35).toFixed(0)}px; --vzw:${(Math.random() * 50 - 25).toFixed(0)}px; --vd:${(1.6 + Math.random() * 2.2).toFixed(2)}s; animation-delay:${(Math.random() * 3).toFixed(2)}s"></span>`
  ).join('');
  $('#scherm-rust').innerHTML = `
    <h2 class="scherm-titel">Rustplaats</h2>
    ${S.act === 2 ? '<p class="scherm-sub">De enige minuut die niemand archiveert.</p>' : ''}
    <p class="scherm-sub">Het vuur knettert zachtjes. Even op adem komen.</p>
    <div class="kv-scene" id="kv-scene">
      <div class="kv-gloed"></div>
      <div class="kv-held" id="kv-held"></div>
      <div class="kv-vuurplek">
        ${vonken}
        <span class="kv-vlam kvv1"></span>
        <span class="kv-vlam kvv2"></span>
        <span class="kv-vlam kvv3"></span>
        <span class="kv-kern"></span>
        <span class="kv-hout kvh1"></span>
        <span class="kv-hout kvh2"></span>
      </div>
    </div>
    <div class="rust-opties">
      <button class="rust-knop" onclick="rustGenees(${heel})">
        <span class="rust-icoon" data-icoon="rusten">🛌</span><b>Rusten</b><small>Genees ${heel} HP</small></button>
      <button class="rust-knop" ${kanSmeden ? 'onclick="rustSmeed()"' : 'disabled'}>
        <span class="rust-icoon" data-icoon="smeden">⚒️</span><b>Smeden</b><small>Verbeter een kaart</small>
        ${kanSmeden ? '' : '<small class="reden-uit">✕ Al je kaarten zijn al gesmeed.</small>'}</button>
      <button class="rust-knop" ${kanPoken ? 'onclick="rustPook()"' : 'disabled'}>
        <span class="rust-icoon" data-icoon="oppoken">🔥</span><b>Oppoken</b><small>+50 licht voor je fakkel</small>
        ${kanPoken ? '' : '<small class="reden-uit">✕ Je fakkel is al vol.</small>'}</button>
    </div>`;
  verfraaiItemArt($('#scherm-rust'));   /* eigen iconen-art uit assets/iconen/ inladen (emoji blijft als terugval) */
  if (window.laadKarakterAfbeelding) {
    /* zit er een rust-pose (<held>_rest.png)? die eerst, anders de basis */
    const zet = img => {
      const el = $('#kv-held');
      if (img && el) el.innerHTML = `<img src="${img.src}" alt="">`;
    };
    laadKarakterAfbeelding(huidigeHeld().art + '_rest', img => {
      if (img) zet(img);
      else laadKarakterAfbeelding(huidigeHeld().art, zet);
    });
  }
  renderTopbalk();
}

function rustPook() {
  if (rustKlaar) return;
  rustKlaar = true;
  zetFakkel(50);   /* vertrekwaarde — een halve balk, zodat oppoken een echte keuze is naast heal/smeden */
  melding('Je fakkel laait fel op (+50 licht).');
  Klank.sfx('buff');
  /* het vuur laait zichtbaar op voor we vertrekken */
  const scene = $('#kv-scene');
  if (scene) scene.classList.add('opgepookt');
  setTimeout(() => { if (document.body.dataset.scherm === 'rust') renderKaartScherm(); }, 1200);   /* guard: niet de map over een intussen gestart gevecht/scherm renderen (vertraagde timer-race) */
}
function rustGenees(n) {
  if (rustKlaar) return;
  rustKlaar = true;
  geneesHpBuitenGevecht(n);
  /* je metgezel komt mee op adem aan het vuur */
  if (heeftMetgezel() && S.metgezel.hp < S.metgezel.maxHp) {
    const m = Math.ceil(S.metgezel.maxHp * 0.5);
    S.metgezel.hp = Math.min(S.metgezel.maxHp, S.metgezel.hp + m);
    melding(`${metgezelDef().naam} rust mee uit (+${m} HP).`);
  }
  melding(`Je geneest ${n} HP.`);
  Klank.sfx('genees');
  const scene = $('#kv-scene');
  if (scene) scene.classList.add('heelt');
  setTimeout(() => { if (document.body.dataset.scherm === 'rust') renderKaartScherm(); }, 1200);   /* guard: niet de map over een intussen gestart gevecht/scherm renderen (vertraagde timer-race) */
}
function rustSmeed() {
  kiesKaartUitDek('upgrade', 'Kies een kaart om te smeden', c => {
    if (c) renderKaartScherm(); else toonRust();
  });
}

/* de schatkist: eerst spanning, dan de onthulling */
let schatBuit = null;
function toonSchat() {
  toonScherm('schat');
  schermAchtergrond('schat', actBg('schat'), 0.45);
  schatBuit = willekeurigRelikwie();   /* vooraf bepaald — seeded volgorde blijft gelijk */
  $('#scherm-schat').innerHTML = `
    <h2 class="scherm-titel">Een schatkist!</h2>
    <p class="scherm-sub">Het slot is oud. Wat erachter wacht niet.</p>
    <div class="schat-toneel" id="schat-toneel">
      <button class="knop-groot schat-open-knop" onclick="onthulSchat()">🗝️ Open de kist</button>
    </div>`;
  renderTopbalk();
}

function onthulSchat() {
  const toneel = $('#schat-toneel');
  if (!toneel) return;
  /* akte 1: de kist kraakt en het scherm dreunt */
  toneel.innerHTML = '';
  schudScherm();
  Klank.sfx('zwareklap');
  setTimeout(() => { if ($('#schat-toneel')) Klank.sfx('flip'); }, 450);
  setTimeout(() => {
    const t = $('#schat-toneel');
    if (!t) return;
    /* akte 2: lichtflits en de buit rijst op */
    Klank.sfx('schitter');
    Klank.sfx('goud');
    const r = schatBuit;
    let buit;
    if (r) {
      geefRelikwie(r);
      const d = RELIKWIEEN[r];
      buit = `
        <div class="schat-buit rel-${d.zeld}" onclick="toonRelikwieBoek('${r}')" data-tip="Klik voor het volledige verhaal">
          <div class="schat-stralen"></div>
          <div class="schat-icoon" data-rart="${r}">${d.icoon}</div>
          <span class="schaarste-chip rel-${d.zeld}">${SCHAARSTE_LABEL[d.zeld]}</span>
          <h3>${d.naam}</h3>
          <p class="boek-effect">${d.tekst}</p>
          ${d.lore ? `<p class="boek-lore">„${d.lore}"</p>` : ''}
        </div>`;
    } else {
      S.goud += 50;
      buit = `
        <div class="schat-buit rel-zeldzaam">
          <div class="schat-stralen"></div>
          <div class="schat-icoon">🪙</div>
          <h3>+50 goud</h3>
          <p class="boek-lore">„De kist was al eens geplunderd. Maar niet grondig."</p>
        </div>`;
    }
    t.innerHTML = `<div class="schat-flits"></div>${buit}
      <button class="knop-groot schat-verder" onclick="renderKaartScherm()">Verder ➤</button>`;
    verfraaiItemArt(t);
    renderTopbalk();
  }, 950);
}

function toonWinkel() {
  /* let op: 'episch' MOET erin — épische kaarten zitten in heldPool(); zonder
     deze regel was prijs[zeld] undefined → crash → winkel opende niet. Fallback
     voor de zekerheid bij toekomstige zeldzaamheden. */
  const prijs = { gewoon: () => rnd(45, 55), ongewoon: () => rnd(65, 80), zeldzaam: () => rnd(90, 110), episch: () => rnd(135, 175) };
  const kaarten = schud(heldPool()).slice(0, 5).map(id => ({
    kaart: nieuweKaart(id),
    prijs: (prijs[KAARTEN[id].zeld] || prijs.ongewoon)()
  }));
  const relPool = Object.keys(RELIKWIEEN).filter(r => !RELIKWIEEN[r].start && !heeftRelikwie(r));
  const relPrijs = { gewoon: () => rnd(75, 95), ongewoon: () => rnd(110, 140), zeldzaam: () => rnd(155, 185), episch: () => rnd(215, 255) };
  const relikwieen = schud([...relPool]).slice(0, 2)
    .map(id => ({ id, prijs: (relPrijs[RELIKWIEEN[id].zeld] || relPrijs.ongewoon)() }));
  const dranken = schud(Object.keys(DRANKEN)).slice(0, 2).map(id => ({ id, prijs: rnd(38, 48) }));
  S.winkel = {
    kaarten, relikwieen, dranken,
    verwijderPrijs: 75, verwijderd: false,
    olie: { prijs: rnd(35, 45), gekocht: false },
    ei: willekeurig() < 0.07
  };
  renderWinkel();
}

function renderWinkel() {
  toonScherm('winkel');
  const w = S.winkel;
  schermAchtergrond('winkel', w.ei ? actBg('winkelEasterEgg') : actBg('winkel'), 0.62);
  let html = `<h2 class="scherm-titel"><span data-icoon="winkel">💰</span> De Winkel</h2>
    <p class="scherm-sub">"Alles te koop, niets te geef," grijnst de koopman.</p>`;

  html += `<div class="winkel-kaarten">` + w.kaarten.map((item, i) => {
    if (!item) return '';
    const kan = S.goud >= item.prijs;
    return `<div class="winkel-item ${kan ? '' : 'te-duur-item'}" onclick="koopKaart(${i})">
      ${kaartHtml(item.kaart, false)}<div class="prijs">🪙 ${item.prijs}</div></div>`;
  }).join('') + `</div>`;

  html += `<div class="winkel-rij">`;
  html += w.relikwieen.map((item, i) => {
    if (!item) return '';
    const d = RELIKWIEEN[item.id];
    const kan = S.goud >= item.prijs;
    return `<button class="winkel-blok ${kan ? '' : 'te-duur-item'}" onclick="koopRelikwie(${i})">
      <span class="winkel-icoon rel-${d.zeld}" data-rart="${item.id}">${d.icoon}</span><b>${d.naam}</b><span class="schaarste-chip rel-${d.zeld}">${SCHAARSTE_LABEL[d.zeld]}</span><small>${d.tekst}</small><div class="prijs">🪙 ${item.prijs}</div></button>`;
  }).join('');
  html += w.dranken.map((item, i) => {
    if (!item) return '';
    const d = DRANKEN[item.id];
    const kan = S.goud >= item.prijs;
    return `<button class="winkel-blok ${kan ? '' : 'te-duur-item'}" onclick="koopDrank(${i})" oncontextmenu="return bekijkDrank(event, '${item.id}')">
      <span class="winkel-icoon" data-dart="${item.id}" style="--dkleur:${d.kleur}">${d.icoon}</span><b>${d.naam}</b><small>${d.tekst}</small><div class="prijs">🪙 ${item.prijs}</div></button>`;
  }).join('');
  if (w.olie && !w.olie.gekocht) {
    const kan = S.goud >= w.olie.prijs;
    html += `<button class="winkel-blok ${kan ? '' : 'te-duur-item'}" onclick="koopOlie()">
      <span class="winkel-icoon" data-icoon="lantaarnolie">🛢️</span><b>Lantaarnolie</b><small>+20 licht voor je fakkel</small><div class="prijs">🪙 ${w.olie.prijs}</div></button>`;
  }
  if (!w.verwijderd) {
    const kan = S.goud >= w.verwijderPrijs && S.dek.length > 5;
    html += `<button class="winkel-blok ${kan ? '' : 'te-duur-item'}" onclick="koopVerwijdering()">
      <span class="winkel-icoon" data-icoon="kaart_verwijderen">✂️</span><b>Kaart verwijderen</b><small>Haal een kaart uit je dek</small><div class="prijs">🪙 ${w.verwijderPrijs}</div></button>`;
  }
  html += `</div><button class="knop-groot" onclick="renderKaartScherm()">Verlaat winkel ➤</button>`;
  $('#scherm-winkel').innerHTML = html;
  verfraaiKaartIconen($('#scherm-winkel'));
  verfraaiItemArt($('#scherm-winkel'));
  renderTopbalk();
}
function koopKaart(i) {
  const item = S.winkel.kaarten[i];
  if (!item || S.goud < item.prijs) { melding('Niet genoeg goud!'); return; }
  S.goud -= item.prijs; Klank.sfx('goud');
  S.dek.push(item.kaart);
  melding(`${kdef(item.kaart).naam} gekocht!`);
  S.winkel.kaarten[i] = null;
  renderWinkel();
}
function koopRelikwie(i) {
  const item = S.winkel.relikwieen[i];
  if (!item || S.goud < item.prijs) { melding('Niet genoeg goud!'); return; }
  S.goud -= item.prijs; Klank.sfx('goud');
  geefRelikwie(item.id);
  melding(`${RELIKWIEEN[item.id].naam} gekocht!`);
  S.winkel.relikwieen[i] = null;
  renderWinkel();
}
function koopDrank(i) {
  const item = S.winkel.dranken[i];
  if (!item || S.goud < item.prijs) { melding('Niet genoeg goud!'); return; }
  if (S.dranken.length >= drankSlots()) { melding('Geen drankjesvak vrij!'); return; }
  S.goud -= item.prijs; Klank.sfx('goud');
  S.dranken.push(item.id);
  S.winkel.dranken[i] = null;
  renderWinkel();
}
function koopOlie() {
  const w = S.winkel;
  if (!w.olie || w.olie.gekocht) return;
  if (S.goud < w.olie.prijs) { melding('Niet genoeg goud!'); return; }
  S.goud -= w.olie.prijs;
  w.olie.gekocht = true;
  Klank.sfx('goud');
  zetFakkel(20);
  melding('Je fakkel brandt feller (+20 licht).');
  renderWinkel();
}

function koopVerwijdering() {
  const w = S.winkel;
  if (S.goud < w.verwijderPrijs || S.dek.length <= 5) { melding('Dat kan nu niet.'); return; }
  kiesKaartUitDek('verwijder', 'Kies een kaart om te verwijderen', c => {
    if (c) { S.goud -= w.verwijderPrijs; w.verwijderd = true; }
    renderWinkel();
  });
}

/* sommige events hebben meerdere art-VARIANTEN (assets/events/<id>.webp, <id>2, <id>3, ...);
   de game toont er willekeurig één per ontmoeting voor variatie. Puur cosmetisch → Math.random
   (raakt de seeded/daily-stroom NIET). Variant 1 = <id> zelf, 2..n = <id>2..<id>n. */
const EVENT_VARIANTEN = { koopman: 4 };
let _eventArtId = null;
function kiesEventArt(id) {
  const n = EVENT_VARIANTEN[id] || 1;
  if (n < 2) return id;
  const k = 1 + Math.floor(Math.random() * n);
  return k === 1 ? id : id + k;
}

function toonEvent() {
  let pool = EVENTS.filter(e => !S.gebruikteEvents.includes(e.id) && (!e.toon || e.toon()));
  if (pool.length === 0) { S.gebruikteEvents = []; pool = EVENTS.filter(e => !e.toon || e.toon()); }
  const ev = kiesUit(pool);
  S.gebruikteEvents.push(ev.id);
  S.huidigEvent = ev.id;
  _eventArtId = kiesEventArt(ev.id);   /* welk art-beeld deze ontmoeting toont (1 vaste keuze voor renderEvent + eventKlaar) */
  toonScherm('event');
  schermAchtergrond('event',
    ev.id === 'altaar' ? actBg('eventRelikwie') : actBg('event'), 0.5);
  renderEvent(ev);
}

/* groot sfeerbeeld per event (assets/events/<id>.png), terugval = icoon */
function eventArtHtml(ev) {
  return `<div class="event-art" data-eart="${ev.id}"><span class="event-icoon">${ev.icoon}</span></div>`;
}
function laadEventArt(ev) {
  if (!window.laadEventAfbeelding) return;
  laadEventAfbeelding(_eventArtId || ev.id, img => {     /* de deze-ontmoeting-gekozen variant */
    const el = document.querySelector(`.event-art[data-eart="${ev.id}"]`);
    if (img && el) el.innerHTML = `<img src="${img.src}" alt="">`;
  });
}

function renderEvent(ev) {
  let html = `${eventArtHtml(ev)}
    <h2 class="scherm-titel">${ev.titel}</h2>
    <p class="scherm-sub event-tekst">${ev.tekst}</p>
    <div class="event-opties">`;
  ev.opties.forEach((o, i) => {
    const kan = !o.kan || o.kan();
    const reden = (!kan && o.reden) ? o.reden() : null;
    const onder = o.hint
      ? `<small class="event-hint">❓ ${o.hint}</small>`
      : `<small>${o.detail}</small>`;
    html += `<button class="event-knop" ${kan ? `onclick="kiesEventOptie(${i})"` : 'disabled'}>
      <b>${o.label}</b>${onder}
      ${reden ? `<small class="reden-uit">✕ ${reden}</small>` : ''}</button>`;
  });
  html += `</div>`;
  $('#scherm-event').innerHTML = html;
  laadEventArt(ev);
  renderTopbalk();
}

function kiesEventOptie(i) {
  const ev = EVENTS.find(e => e.id === S.huidigEvent);
  const resultaat = ev.opties[i].doe();
  if (resultaat !== null && resultaat !== undefined) eventKlaar(resultaat);
}

function eventKlaar(tekst) {
  toonScherm('event');
  const ev = EVENTS.find(e => e.id === S.huidigEvent);
  Klank.sfx('flip');
  $('#scherm-event').innerHTML = `${eventArtHtml(ev)}
    <h2 class="scherm-titel">${ev.titel}</h2>
    <p class="scherm-sub event-tekst event-onthul">${tekst}</p>
    <button class="knop-groot" onclick="renderKaartScherm()">Verder ➤</button>`;
  laadEventArt(ev);
  renderTopbalk();
}

/* ---------- act-overgang: de verslagen baas levert het licht voor de volgende afdaling ---------- */
/* ============================================================
   DEV-SHORTCUT — VOORLOPIG. Verwijderen vóór release.
   Klik op het logo (linksboven) → spring meteen naar het begin van Act 2,
   zodat testen geen volledige Act 1-run kost. Zoek 'DEV-SHORTCUT' om alles
   (deze functie + de onclick op .tb-logo in index.html) in één keer te wissen.
   ============================================================ */
function devSprongAct2() {
  if (!S) nieuwSpel('slachter');
  if (inGevecht()) stopGevechtLus();
  S.gevecht = null;
  S.act = 2;
  S.fakkel = 100;
  S.pos = null;
  /* DEV-testbuffer: ruime HP + volle heeldrank-slots zodat je Act 2-vijanden grondig kunt
     bekijken/uittesten zonder meteen te sneuvelen (DEV-SHORTCUT — weg vóór release). */
  S.maxHp = Math.max(S.maxHp || 0, 150);
  S.hp = S.maxHp;
  S.dranken = [];
  while (S.dranken.length < drankSlots()) S.dranken.push('heeldrank');
  delete S.beloning; delete S.winkel; delete S.huidigEvent;
  S.kaart = genereerKaart();   /* act-bewust → de Act 2-ladder */
  /* DEV: zet het Drops-mysterie 'rijp' (alle scherven) maar NIET voltooid + geen
     metgezel, zodat je de dark-twist meteen kunt oefenen: doof je fakkel bij de Erfprins. */
  S.metgezel = null; S.dropsOntwaakt = false;
  const _m = mys('drops');
  _m.scherven = (window.MYSTERIES && MYSTERIES.drops.vereist || []).slice();
  _m.rijp = true; _m.voltooid = false;
  bewaarCodex();
  saveSpel();
  melding('⚡ DEV: Act 2 + Drops-mysterie RIJP — 150 HP + 2 heeldranken. (Alt+klik = meteen de Erfprins · Shift+klik = Drops-testcyclus)');
  renderKaartScherm();
}

/* DEV-SHORTCUT (Alt+klik op het logo): spring meteen SOLO tegen de Erfprins, zodat je de
   Roof-rework niet door een hele Act 2-run hoeft te bevechten. Geen metgezel/Drops-mutatie
   (schone solo-test) + een geloofwaardig Act-2-dek (de Roof grist de helft, dus een kaal
   startdek van 10 maakt de test onspeelbaar) + ruime HP/heeldranken. Weg vóór release. */
function devErfprins() {
  if (!S) nieuwSpel('slachter');
  if (inGevecht()) stopGevechtLus();
  S.gevecht = null; S.act = 2; S.fakkel = 100;
  S.maxHp = Math.max(S.maxHp || 0, 150); S.hp = S.maxHp;
  S.dranken = []; while (S.dranken.length < drankSlots()) S.dranken.push('heeldrank');
  if (S.dek.length < 16) {
    const pool = heldPool();
    let veiligheid = 0;
    while (S.dek.length < 18 && pool.length && veiligheid++ < 40) S.dek.push(nieuweKaart(kiesUit(pool)));
  }
  saveSpel();
  startGevecht(['de_erfprins'], 'baas', 15);   /* betreedt zelf het gevechtscherm */
  melding('⚡ DEV: meteen tegen de Erfprins (SOLO, geen metgezel) — 150 HP + 2 heeldranken + opgevuld dek. Test "De Roof".');
}

/* ============================================================
   DEV-SHORTCUT — DROPS-TESTCYCLUS (VOORLOPIG, weg vóór release).
   Elke klik op het logo schakelt naar het volgende Drops-testscenario, zodat
   de hele boog (levend → offer/dood → grief → reünie → de Witte) snel te testen
   is zonder een echte run. Zoek 'DEV-SHORTCUT' om alles in één keer te wissen.
   ============================================================ */
function _devDropsFight(samenstelling, soort) {
  if (!S) nieuwSpel('slachter');
  if (inGevecht()) stopGevechtLus();
  S.act = 2; S.gevecht = null;
  startGevecht(samenstelling, soort || 'gevecht', 1);   /* startGevecht betreedt zelf het gevechtscherm */
}
function _devDropsReset() {
  if (Codex.mysteries) { delete Codex.mysteries.drops; delete Codex.mysteries.drops_wit; }
  Codex.gevallen = (Codex.gevallen || []).filter(x => x !== 'drops');
  Codex.metgezellen = (Codex.metgezellen || []).filter(x => x !== 'drops' && x !== 'drops_wit');
  Codex.dropsZaadjeNul = false; Codex.dropsOfferRun = 0; Codex.drops_wit_keerde = false;
  if (S) S.metgezel = null;
  bewaarCodex();
}
let _devDropsStap = 0;
const _DEV_DROPS = [
  () => devSprongAct2(),                                            /* 0: oud gedrag — Act 2 + mysterie rijp (dark-twist oefenen) */
  () => {                                                           /* 1: levende Drops vs Erfprins */
    _devDropsReset(); ontgrendelMetgezel('drops'); geefMetgezel('drops');
    _devDropsFight(['de_erfprins'], 'baas');
    melding('⚡ DEV 1/5 — Levende Drops vs Erfprins: test de bijt + de offer-knop (De Laatste Sprong) + de 2-beats-dood (sprong→burst)');
  },
  () => {                                                           /* 2: grief — silhouet + pootafdruk */
    _devDropsReset(); Codex.gevallen = ['drops']; Codex.dropsOfferRun = 0; Codex.runs = 2; bewaarCodex();
    _devDropsFight(['groene_slijm'], 'gevecht');
    S.fakkel = 60; zetLichtVisueel(); renderTopbalk();
    melding('⚡ DEV 2/5 — GRIEF: verbrand licht (een kaart) en kijk in de lege metgezel-zone → as-silhouet + wegdovende pootafdruk');
  },
  () => {                                                           /* 3: reünie NU (cinematic + de Witte verschijnt) */
    _devDropsReset(); Codex.gevallen = ['drops']; Codex.dropsOfferRun = 0; Codex.runs = 2; bewaarCodex();
    _devDropsFight(['de_erfprins'], 'baas');
    setTimeout(() => { if (inGevecht() && S.gevecht.vijanden.some(v => v.id === 'de_erfprins' && !v.dood)) revealDropsWit(S.gevecht, 'weigering'); }, 900);
    melding('⚡ DEV 3/5 — REÜNIE: de Witte keert direct terug (wit-flits + 3 beats + signatuur-sprong)');
  },
  () => {                                                           /* 4: Drops de Witte vecht mee */
    _devDropsReset(); Codex.gevallen = ['drops']; ontgrendelMetgezel('drops'); ontgrendelMetgezel('drops_wit'); bewaarCodex();
    geefMetgezel('drops_wit');
    _devDropsFight(['de_erfprins'], 'baas');
    S.fakkel = 0; zetLichtVisueel(); renderTopbalk();
    melding('⚡ DEV 4/5 — Drops de Witte vecht mee: test de blok-negerende witklap (gedoofd = ×2) + blind-immuniteit (intent zichtbaar bij fakkel 0)');
  },
  () => {                                                           /* 5: reset → schone lei */
    _devDropsReset();
    melding('⚡ DEV 5/5 — Drops-Codex GERESET (gevallen/mysterie/Witte/zaadje weg). Volgende klik = Act 2-sprong.');
  },
];
function devDropsTest() {
  if (!S) nieuwSpel('slachter');
  try { _DEV_DROPS[_devDropsStap % _DEV_DROPS.length](); }
  catch (e) { melding('DEV-fout: ' + e.message); }
  _devDropsStap++;
}
/* logo-klik: GEWONE klik = veilige Act 2-sprong (géén Drops spawnen/ontgrendelen, dus je
   playtest-save blijft schoon). SHIFT+klik = de Drops-testcyclus (die bewust spawnt/schrijft).
   devDropsWis() in de console reset de (cross-run) Drops-Codex weer naar nul. */
function devLogo(e) {
  if (e && e.altKey) { devErfprins(); return; }       /* Alt+klik = meteen SOLO tegen de Erfprins (schone Roof-test) */
  if (e && e.shiftKey) { devDropsTest(); return; }     /* Shift+klik = Drops-testcyclus (spawnt/schrijft) */
  devSprongAct2();                                     /* gewone klik = veilige Act 2-sprong */
}
function devDropsWis() {
  _devDropsReset();
  _devDropsStap = 0;
  melding('⚡ DEV: Drops-Codex gewist (gevallen/mysterie/Witte/zaadje/offer weg).');
}

/* ============================================================
   DE DREMPEL — het scherven-ritueel tussen Act 1 en Act 2.
   Plaats 3 scherven: een kloppend trio roept een metgezel op, een fout trio wekt de
   Drempelwachter (de scherven zijn dan verbrand). Altijd over te slaan → direct Act 2.
   ============================================================ */
let drempelGeplaatst = [];   /* scherf-ids in de 3 nissen (null = leeg) */
function bronIcoon(bron) { return bron === 'baas' ? '👑' : bron === 'figuur' ? '🪞' : bron === 'episch' ? '🜂' : '❓'; }

function toonDrempel() {
  drempelGeplaatst = [null, null, null];
  toonScherm('einde');
  /* eigen poortscène (de drie nissen + de slapende Wachter) i.p.v. de Act 1-kaartplaat */
  schermAchtergrond('einde', 'achtergronddrempel.webp', 0.5, 'center');
  Klank.muziek('stil');
  renderDrempel();
}
function renderDrempel() {
  /* de pool = wat je DRAAGT (gedragen tas) minus wat al in de nissen ligt */
  const tel = {};
  gedragen().forEach(sid => { tel[sid] = (tel[sid] || 0) + 1; });
  drempelGeplaatst.forEach(sid => { if (sid && tel[sid]) tel[sid]--; });
  const pool = [];
  Object.keys(tel).forEach(sid => { for (let i = 0; i < tel[sid]; i++) pool.push(sid); });

  const nissen = [0, 1, 2].map(i => {
    const sid = drempelGeplaatst[i];
    if (sid) { const d = scherfDef(sid); return `<button class="drempel-nis vol" onclick="drempelHaalWeg(${i})"><span class="dn-icoon" data-shart="${sid}">${bronIcoon(d && d.bron)}</span><i>${(d && d.codexTekst) || '…'}</i></button>`; }
    return `<div class="drempel-nis leeg">◇</div>`;
  }).join('');
  const poolHtml = pool.length
    ? pool.map(sid => { const d = scherfDef(sid); return `<button class="drempel-scherf" onclick="drempelPlaats('${sid}')"><span class="ds-icoon" data-shart="${sid}">${bronIcoon(d && d.bron)}</span><i>${(d && d.codexTekst) || '…'}</i></button>`; }).join('')
    : `<p class="drempel-leeg">Je draagt nog geen scherven. Ze liggen verspreid in de diepte — verzamel er drie, en wáág de drempel.</p>`;
  const vol = drempelGeplaatst.filter(Boolean).length === 3;
  $('#scherm-einde').innerHTML = `
    <div class="drempel-scene">
      <h2 class="scherm-titel goud-tekst">🜂 De Drempel</h2>
      <p class="scherm-sub drempel-lore">Voor je gaapt de poort naar de diepte. Drie lege nissen, koud en geduldig. „Voed de drempel met drie scherven," fluistert iets ouds, „en het zwart antwoordt. Maar niet alles dat ontwaakt, is je gunstig gezind — dat besef je pas als het je aankijkt."</p>
      <div class="drempel-nissen">${nissen}</div>
      <p class="drempel-poollabel">${pool.length ? 'Je scherven — plaats er drie:' : ''}</p>
      <div class="drempel-pool">${poolHtml}</div>
      <div class="einde-knoppen">
        <button class="knop-groot" ${vol ? '' : 'disabled'} onclick="drempelRoepOp()">🜂 Roep op</button>
        <button class="knop-stil" onclick="drempelSlaOver()">Sla over → daal af naar Act 2</button>
      </div>
    </div>`;
  verfraaiItemArt($('#scherm-einde'));
}
function drempelPlaats(sid) {
  let slot = drempelGeplaatst.indexOf(null);
  if (slot < 0) return;                 /* nissen vol */
  drempelGeplaatst[slot] = sid;
  Klank.sfx('klik');
  renderDrempel();
}
function drempelHaalWeg(slot) { drempelGeplaatst[slot] = null; Klank.sfx('klik'); renderDrempel(); }
function drempelSlaOver() { bankGedragen(); saveSpel(); toonActOvergang(S._verslagenBaas); }   /* niet-geplaatste scherven zijn nu veilig (gebankt) + meteen gepersisteerd */
function drempelRoepOp() {
  const ids = drempelGeplaatst.filter(Boolean);
  if (ids.length !== 3) return;
  const mid = scherfTrio(ids);
  if (mid && isOntgrendeld(mid)) {
    /* kloppend trio van een AL ontwaakte bondgenoot → niet bestraffen, niets verbruiken:
       leg de scherven terug zodat de speler een ander trio kiest of overslaat. */
    melding('Deze bondgenoot is al ontwaakt — je scherven blijven veilig.');
    Klank.sfx('klik');
    drempelGeplaatst = [null, null, null];
    renderDrempel();
    return;
  }
  ids.forEach(sid => neemGedragen(sid));        /* de geplaatste 3 zijn verbruikt — weg uit je tas */
  drempelGeplaatst = [null, null, null];
  if (mid) {
    const def = MYSTERIES[mid];
    ontgrendelMetgezel(mid);
    if (typeof ontdek === 'function') ontdek('metgezellen', def.metgezel);
    geefMetgezel(def.metgezel);                 /* hij daalt nu mee Act 2 in (overschrijft de rotatie) */
    Klank.sfx('schitter');
    bankGedragen();                             /* de rest van je tas is nu veilig */
    saveSpel();                                 /* persisteer act-2-state + lege tas meteen — geen stale Act-1-save → geen scherf-duplicatie */
    const rev = def.eindreveal || { titel: 'EEN BONDGENOOT ONTWAAKT', kreet: 'Iets koos jou.' };
    toonActOvergang(S._verslagenBaas, rev);
  } else {
    melding('🔥 De verkeerde scherven! De Drempelwachter ontwaakt — je inzet is verbrand.');
    Klank.sfx('debuff');
    bankGedragen();                             /* de niet-geplaatste rest blijft veilig */
    saveSpel();                                 /* idem: leg de gebankte stash + act-2-state vast vóór het gevecht */
    S.gevecht = null;
    startGevecht(['de_drempelwachter'], 'elite', 1);   /* win → beloning → Act 2-kaart; rotatie-metgezel kreeg je al */
  }
}

function volgendeAct(verslagenBaas) {
  S.act = huidigeAct() + 1;
  S.fakkel = 100;                 /* episch: het laatste licht van de baas → je fakkel laait op */
  /* Drops komt mee zodra je 'm hebt VRIJGESPEELD (zie het Metgezel-Mysterie) én er
     geen actieve metgezel is. Een in de vorige act gevluchte Drops (heeftMetgezel()
     is dan false want vluchtig) sluit hier weer aan — zo lost de 'later terugvinden'-
     belofte zich in i.p.v. in permanente limbo te blijven hangen. */
  if (!heeftMetgezel()) {
    /* een gevluchte metgezel sluit weer aan; anders de voor déze run gekozen vrijgespeelde
       metgezel (één keer per run vastgezet via S.runMetgezel zodat hij niet per act wisselt).
       OP EEN DAILY RUN komt er GÉÉN cross-run-vrijgespeelde metgezel mee — net als de Schrijn
       die in de daily uit staat (eerlijk veld voor het leaderboard). Een binnen-de-run gevluchte
       metgezel mag wél weer aansluiten. */
    const teruggekeerd = !!(S.metgezel && S.metgezel.vluchtig);
    let mgid = teruggekeerd ? S.metgezel.id
      : (S.daily ? null : (S.runMetgezel || (S.runMetgezel = kiesRunMetgezel())));
    /* een VOORGOED geofferde metgezel (Codex.gevallen) mag NIET via de stale S.runMetgezel-cache
       herrijzen bij een latere act-overgang — dat breekt de 'geen terugkeer'-belofte van de opoffering.
       Nu dormant (ACTS_MAX=2 → na de Erfprins volgt toonEinde, niet volgendeAct), maar een landmijn
       zodra Act 3 live gaat; daarom de cache mee resetten zodat de rotatie een ander kiest. */
    if (mgid && !teruggekeerd && Array.isArray(Codex.gevallen) && Codex.gevallen.includes(mgid)) {
      mgid = null; S.runMetgezel = null;
    }
    /* Drops de Witte is NOOIT een auto-reisgenoot bij act-start — enkel via zijn grief-terugkeer
       (revealDropsWit, mid-gevecht). Vangt ook een stale S.runMetgezel='drops_wit' uit oudere saves. */
    if (mgid === 'drops_wit') { mgid = null; S.runMetgezel = null; }
    if (mgid && METGEZELLEN[mgid]) {
      geefMetgezel(mgid);
      melding(metgezelInstapMelding(mgid, teruggekeerd));
    }
  }
  S.pos = null;
  S.kaart = genereerKaart();      /* nieuwe ladder, act-bewust; de verdieping-teller loopt door */
  delete S.beloning; delete S.winkel; delete S.huidigEvent;
  S._verslagenBaas = verslagenBaas;
  if (S.act === 2) { toonDrempel(); return; }   /* Act 1→2: eerst het scherven-ritueel (altijd skipbaar) */
  toonActOvergang(verslagenBaas);
}
function toonActOvergang(verslagenBaas, reveal) {
  toonScherm('einde');            /* hergebruik het lege einde-scherm als overgangsdoek */
  schermAchtergrond('einde', actBg('kaart'), 0.42);
  Klank.sfx('schitter'); setTimeout(() => Klank.sfx('win'), 250);
  const naam = ACT_NAMEN[S.act] || ('Act ' + S.act);
  $('#scherm-einde').innerHTML = `
    <div class="einde-held einde-winst"><div class="schat-stralen einde-stralen"></div></div>
    ${reveal ? `<h2 class="scherm-titel einde-titel goud-tekst">${reveal.titel}</h2>
       <p class="scherm-sub einde-regel">${reveal.kreet}</p>` : `
       <h2 class="scherm-titel einde-titel goud-tekst">ACT ${S.act} — ${naam}</h2>
       <p class="scherm-sub einde-regel">Je trekt het laatste licht uit ${verslagenBaas}. Het stroomt je fakkel in — die laait wonderbaarlijk op. 🔥</p>`}
    <p class="einde-loopbaan">Je dek, je relikwieën en je littekens dalen met je mee. De diepte wordt killer.</p>
    <div class="einde-knoppen">
      <button class="knop-groot" onclick="renderKaartScherm()">⬇️ Daal dieper af</button>
    </div>`;
}

function toonEinde(gewonnen, verslagenBaas) {
  toonScherm('einde');
  /* winst = de epische plaat, verlies = de nederlaag-plaat (per act) */
  schermAchtergrond('einde', gewonnen ? actBg('overwinning') : actBg('nederlaag'),
    gewonnen ? 0.45 : 0.5);
  Klank.muziek('stil');
  const st = S.stats;
  const held = huidigeHeld();
  /* loopbaan bijwerken — exact één keer per run (guard op S) */
  let uitslag = { nieuwRecord: false, beste: 0 };
  if (!S.runGeregistreerd) {
    uitslag = registreerRun(gewonnen);
    if (S.daily) { const du = registreerDaily(gewonnen); S.dailyNieuweTop = du.nieuweTop; wisSave(); }
    if (gewonnen) bankGedragen();   /* overleefd → gedragen scherven (bv. in Act 2 gevonden) bankt veilig op de stash */
    S.runGeregistreerd = true;
  }
  const besteHeld = (Codex.bestDiepte && Codex.bestDiepte[S.held]) || 0;
  const dScore = S.daily ? dagscore(gewonnen) : null;
  /* een epitaaf of lofregel uit de poel (presentationeel) */
  const epitafen = [
    'Hier eindigde een afdaling. De diepte telt geen namen.',
    'Zijn fakkel doofde. Het donker onthield zijn moed.',
    'De diepte gaf niets terug. Zoals altijd.',
    'Een held minder. Een legende meer.',
    'Het slijm vergeet nooit een gezicht.'
  ];
  const lofregels = [
    'De duisternis kent nu jouw naam — en vreest hem.',
    'Boven brandt de zon. Beneden brandt jouw legende.',
    'De diepte boog. Voor één keer.'
  ];
  const poel = gewonnen ? lofregels : epitafen;
  const regel = poel[Math.floor(Math.random() * poel.length)];
  const statRegels = [
    [S.verdieping, 'verdiepingen'],
    [st.gevechten, 'gevechten'],
    [st.kaarten, 'kaarten gespeeld'],
    [st.schade, 'schade gedaan'],
    [S.goud, 'goud op zak'],
    [S.relikwieen.length, 'relikwieën']
  ];
  const as = gewonnen ? '' : '<div class="einde-as">' + Array.from({ length: 14 }, () =>
    `<span class="asje" style="left:${(Math.random() * 100).toFixed(0)}%; animation-duration:${(4 + Math.random() * 5).toFixed(1)}s; animation-delay:${(Math.random() * 4).toFixed(1)}s"></span>`
  ).join('') + '</div>';
  $('#scherm-einde').innerHTML = `
    ${as}
    <div class="einde-held ${gewonnen ? 'einde-winst' : 'einde-dood'}" id="einde-held">
      ${gewonnen ? '<div class="schat-stralen einde-stralen"></div>' : ''}
    </div>
    <h2 class="scherm-titel einde-titel ${gewonnen ? 'goud-tekst' : 'rood-tekst'}">${gewonnen ? ((verslagenBaas || (typeof huidigeBaas === 'function' && huidigeBaas() && huidigeBaas().naam) || 'De baas') + ' IS VERSLAGEN!').toUpperCase() : 'JE BENT GEVALLEN...'}</h2>
    <p class="scherm-sub einde-regel">„${regel}"</p>
    ${!gewonnen ? mysterieDuiding() : ''}
    <div class="einde-stats einde-onthul">
      ${statRegels.map(([w, l], i) => `<div style="animation-delay:${(0.7 + i * 0.25).toFixed(2)}s"><b>${w}</b><small>${l}</small></div>`).join('')}
    </div>
    ${!gewonnen && Codex.opgeladen.length ? '<p class="einde-troost">🗝️ Je vondsten wachten opgeladen in het Schrijn.</p>' : ''}
    ${dScore ? `
    <div class="daily-paneel">
      <h3 class="daily-kop">🗓️ Dagelijkse afdaling — score ${dScore.totaal}${S.dailyNieuweTop ? ' <span class="einde-record">🏆 nieuwe topscore!</span>' : ''}</h3>
      <div class="daily-breakdown">
        <span>diepte ${S.verdieping} × 10</span><b>${dScore.diepte}</b>
        ${gewonnen ? `<span>overwinning</span><b>${dScore.winst}</b>` : ''}
        <span>relikwieën ${S.relikwieen.length} × 8</span><b>${dScore.relikwieen}</b>
        <span>goud ${S.goud} ÷ 5</span><b>${dScore.goud}</b>
      </div>
      <p class="daily-reeks">🔥 Speelreeks: ${Daily.reeks} dag${Daily.reeks === 1 ? '' : 'en'}${Daily.besteReeks > Daily.reeks ? ` · beste: ${Daily.besteReeks}` : ''}</p>
    </div>` : ''}
    <p class="einde-loopbaan">${loopbaanRegel()}${uitslag.nieuwRecord ? ' <span class="einde-record">🏆 nieuw diepterecord!</span>' : ''}</p>
    <p class="einde-seed">Seed: ${S.seed} · ${held.naam}</p>
    <div class="einde-knoppen">
      ${S.daily ? '' : '<button class="knop-groot" onclick="startNieuw()">⚔️ Opnieuw afdalen</button>'}
      <button class="knop-stil" onclick="kopieerUitdaagcode()" data-tip="Deel deze seed — speel dezelfde run">📋 Uitdaagcode</button>
      <button class="knop-stil" onclick="naarTitel()">Naar het begin</button>
    </div>
    ${besteHeld ? `<p class="einde-doel">Diepste val met ${held.naam}: rij ${besteHeld}${!gewonnen ? ' — versla de baas op rij 13' : ''}</p>` : ''}`;
  /* de held in zijn laatste pose: gevallen of triomferend */
  if (window.laadKarakterAfbeelding) {
    const zet = img => {
      const el = $('#einde-held');
      if (img && el) el.insertAdjacentHTML('beforeend', `<img src="${img.src}" alt="">`);
    };
    laadKarakterAfbeelding(held.art + (gewonnen ? '_victory' : '_death'), img => {
      if (img) zet(img);
      else laadKarakterAfbeelding(held.art, zet);
    });
  }
  if (gewonnen) Klank.sfx('win'); else Klank.sfx('dood');
}

/* ============================================================
   TITEL, INSTELLINGEN & OPSTART
   ============================================================ */
function naarTitel() {
  toonScherm('titel');
  schermAchtergrond('titel', ACHTERGRONDEN.titel, 0.32);
  $('#knop-doorgaan').style.display = localStorage.getItem(SAVE_SLEUTEL) ? 'inline-block' : 'none';
  if (window.verfraaiItemArt) verfraaiItemArt($('#scherm-titel'));   /* Codex-knopicoon (data-icoon) */
  const ts = $('#titel-stats');
  if (ts) ts.textContent = loopbaanRegel();   /* textContent = injectie-veilig */
  const db = $('#knop-daily');
  if (db) {
    const klaar = Daily.laatsteVoltooid === vandaagSleutel();
    db.textContent = klaar ? `🗓️ Dagelijks voltooid · score ${Daily.laatsteScore}` : '🗓️ Dagelijkse afdaling';
    db.classList.toggle('daily-klaar', klaar);
    if (Daily.reeks > 0) db.setAttribute('data-tip', `🔥 Speelreeks: ${Daily.reeks} dag${Daily.reeks === 1 ? '' : 'en'}${Daily.besteReeks > Daily.reeks ? ` · beste: ${Daily.besteReeks}` : ''}`);
  }
}

function startNieuw() { toonHeldKeuze(); }

/* ---------- de Dagelijkse afdaling: vaste dag-seed, held van de dag, Schrijn UIT,
   score telt mee. Eén scorende poging per dag. ---------- */
function startDaily() {
  if (dailyAlGespeeld()) {
    if (Daily.laatsteVoltooid === vandaagSleutel())
      melding(`🗓️ Je maakte de afdaling van vandaag al — score ${Daily.laatsteScore}. Morgen wacht een nieuwe.`);
    else
      melding(`🗓️ Je bent vandaag al begonnen — hervat 'm via 🗺️ Doorgaan. Een nieuwe afdaling wacht morgen.`);
    return;
  }
  Klank.sfx('klik');
  wisSave();
  Daily.laatsteStart = vandaagSleutel(); bewaarDaily();   /* poging verbruikt bij START → geen farmen */
  schrijnKeuzes = [];                       /* geen Schrijn-meeneem in de daily */
  scherfKeuzes = [];                        /* idem geen scherf-loadout in de daily (eerlijk veld) — anders lekte een eerder in 'Kies je held' geselecteerde scherf de daily in én uit je stash */
  const held = heldVanDag();
  nieuwSpel(held, dagSeed(), 0, true);      /* vaste seed, ascensie 0, daily=true → eerlijk veld */
  S.dailyDag = vandaagSleutel();
  melding(`🗓️ Dagelijkse afdaling — held van de dag: ${SPELERS[held].naam}. Geen Schrijn; je score telt mee.`);
  renderKaartScherm();
}

function kopieerUitdaagcode() {
  const code = (S && S.seed) || '';
  const klaar = () => melding('📋 Uitdaagcode gekopieerd: ' + code + ' — deel hem en speel dezelfde run!');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(klaar).catch(() => melding('Uitdaagcode: ' + code));
  } else {
    melding('Uitdaagcode: ' + code);
  }
}

/* ---------- het Schrijn: neem tot 3 gevonden relikwieën mee ---------- */
const SCHRIJN_MAX = 3;
let schrijnKeuzes = [];
const SCHERF_LOADOUT_MAX = 6;   /* max scherven mee per run (je plaatst er 3; ruimte voor een trio + reserve) */
let scherfKeuzes = [];

function schrijnHtml() {
  const beschikbaar = Codex.opgeladen.filter(r => RELIKWIEEN[r]);
  if (!beschikbaar.length) {
    return `<small class="schrijn-leeg">🗝️ Het Schrijn is leeg — relikwieën die je in de diepte vindt, kun je hier éénmalig meenemen in een latere run.</small>`;
  }
  return `<div class="schrijn-titel">🗝️ Het Schrijn <span class="schrijn-teller">${schrijnKeuzes.length}/${SCHRIJN_MAX}</span>
      <small>neem tot ${SCHRIJN_MAX} gevonden relikwieën mee — elke lading is eenmalig, vind het relikwie opnieuw om te herladen</small></div>
    <div class="schrijn-rij">` + beschikbaar.map(r => {
      const d = RELIKWIEEN[r];
      return `<button class="schrijn-slot rel-${d.zeld} ${schrijnKeuzes.includes(r) ? 'gekozen' : ''}" data-rart="${r}"
        data-tip="${d.naam} — ${d.tekst}" onclick="kiesSchrijn('${r}')">${d.icoon}</button>`;
    }).join('') + `</div>`;
}

function kiesSchrijn(id) {
  if (schrijnKeuzes.includes(id)) {
    schrijnKeuzes = schrijnKeuzes.filter(r => r !== id);
  } else if (schrijnKeuzes.length >= SCHRIJN_MAX) {
    melding(`Het Schrijn draagt maximaal ${SCHRIJN_MAX} relikwieën per afdaling.`);
    return;
  } else {
    schrijnKeuzes.push(id);
  }
  const vak = $('#schrijn-vak');
  if (vak) { vak.innerHTML = schrijnHtml(); verfraaiItemArt(vak); }
  Klank.sfx('klik');
}

/* SCHERF-LOADOUT: kies welke scherven uit je stash je meeneemt (inzet — kwijt bij dood). */
function scherfLoadoutHtml() {
  const bezit = scherfStash();
  if (!bezit.length) {
    return `<small class="schrijn-leeg">🜂 Je hebt nog geen scherven. Vind ze in je afdalingen (elite-winst, de Erfprins, epische vijanden, mysterieuze figuren) en breng er drie die samenpassen naar De Drempel tussen Act 1 en 2 — dat roept een metgezel op.</small>`;
  }
  return `<div class="schrijn-titel">🜂 Scherven <span class="schrijn-teller">${scherfKeuzes.length}/${SCHERF_LOADOUT_MAX}</span>
      <small>neem scherven mee voor De Drempel (Act 1→2) — wat je meeneemt staat op het spel: <b>kwijt bij dood</b></small></div>
    <div class="schrijn-rij">` + bezit.map(sid => {
      const d = scherfDef(sid); if (!d) return '';
      return `<button class="schrijn-slot scherf-slot ${scherfKeuzes.includes(sid) ? 'gekozen' : ''}" data-shart="${sid}"
        data-tip="${d.codexTekst}" onclick="kiesScherfLoadout('${sid}')">${bronIcoon(d.bron)}</button>`;
    }).join('') + `</div>`;
}
function kiesScherfLoadout(sid) {
  if (scherfKeuzes.includes(sid)) {
    scherfKeuzes = scherfKeuzes.filter(s => s !== sid);
  } else if (scherfKeuzes.length >= SCHERF_LOADOUT_MAX) {
    melding(`Je kunt maximaal ${SCHERF_LOADOUT_MAX} scherven meenemen.`);
    return;
  } else {
    scherfKeuzes.push(sid);
  }
  const vak = $('#scherf-vak');
  if (vak) { vak.innerHTML = scherfLoadoutHtml(); verfraaiItemArt(vak); }
  Klank.sfx('klik');
}

let gekozenAscensie = 0;
function ascensieHtml(maxOnt) {
  const a = gekozenAscensie;
  const actief = ASCENSIE.filter(m => a >= m.n);
  return `<div class="ascensie-kop">🔥 Ascensie <span class="ascensie-niveau">niveau ${a} / ${maxOnt}</span>
      <small>gestapelde uitdaging — elke gewonnen run ontgrendelt het volgende niveau</small></div>
    <div class="ascensie-stepper">
      <button class="asc-knop" onclick="wijzigAscensie(-1)" ${a <= 0 ? 'disabled' : ''} aria-label="Ascensie omlaag">−</button>
      <span class="asc-getal">${a}</span>
      <button class="asc-knop" onclick="wijzigAscensie(1)" ${a >= maxOnt ? 'disabled' : ''} aria-label="Ascensie omhoog">+</button>
    </div>` +
    (actief.length
      ? `<ul class="ascensie-lijst">` + actief.map(m => `<li><b>A${m.n} · ${m.naam}</b> — ${m.tekst}</li>`).join('') + `</ul>`
      : `<p class="ascensie-geen">Niveau 0 — de gewone afdaling.</p>`);
}
function wijzigAscensie(delta) {
  const maxOnt = maxOntgrendeld();
  gekozenAscensie = Math.max(0, Math.min(gekozenAscensie + delta, maxOnt));
  const vak = $('#ascensie-vak');
  if (vak) vak.innerHTML = ascensieHtml(maxOnt);
  Klank.sfx('klik');
}

function toonHeldKeuze() {
  toonScherm('held');
  schrijnKeuzes = [];
  scherfKeuzes = [];
  const maxOnt = maxOntgrendeld();
  gekozenAscensie = Math.max(0, Math.min(gekozenAscensie, maxOnt));
  schermAchtergrond('held', ACHTERGRONDEN.titel, 0.55);
  const poseWoord = document.body.dataset.modus === 'mobiel' ? '👆 tik' : '🖱️ klik';
  $('#scherm-held').innerHTML = `
    <h2 class="scherm-titel">Kies je held</h2>
    <div class="held-rij">` +
    Object.entries(SPELERS).map(([id, h]) => {
      const rel = RELIKWIEEN[h.relikwie];
      const art = (window.karakterSvg && karakterSvg(h.art)) || h.icoon;
      return `<div class="held-kaart-wrap">
        <div class="held-kaart" data-held="${id}" style="--held-gloed:${h.kleur || '255,156,63'}">
        <div class="held-aura"></div>
        <button type="button" class="held-art" data-art="${h.art}" onclick="heldPose('${id}', event)" aria-label="Toon ${h.naam} in actie (tik voor z'n aanval/cast)">${art}</button>
        <div class="held-pose-hint" data-hint="${h.art}">${poseWoord} voor z'n move</div>
        <b>${h.naam}</b>
        <small class="held-stijl">${h.stijl}</small>
        ${ontgrendeldNiveau(id) >= 1 ? `<span class="held-asc">🔥 ontgrendeld tot A${ontgrendeldNiveau(id)}</span>` : ''}
        <div class="held-info">❤️ ${h.hp} HP &nbsp;·&nbsp; 🃏 ${h.dek.length} startkaarten</div>
        <div class="held-info">${rel.icoon} <b>${rel.naam}</b><br><i>${rel.tekst}</i></div>
        <button type="button" class="held-kies" onclick="kiesHeld('${id}')">Speel als ${h.naam} ➤</button>
      </div>
        <button type="button" class="knop-stil held-dek-knop" onclick="bekijkStartdek('${id}', event)">Bekijk startdek</button>
      </div>`;
    }).join('') + `</div>
    <div class="schrijn-vak" id="schrijn-vak">${schrijnHtml()}</div>
    ${scherfStash().length ? `<div class="schrijn-vak scherf-vak" id="scherf-vak">${scherfLoadoutHtml()}</div>` : ''}
    ${maxOnt >= 1 ? `<div class="ascensie-vak" id="ascensie-vak">${ascensieHtml(maxOnt)}</div>` : ''}
    <div class="seed-vak">
      <label>Seed (optioneel, voor een gedeelde run):
        <input id="seed-invoer" placeholder="bv. KRDF-2941" maxlength="20" spellcheck="false"></label>
    </div>
    <button class="knop-stil" onclick="naarTitel()">← Terug</button>`;
  if (window.laadKarakterAfbeelding) {
    Object.values(SPELERS).forEach(h => laadKarakterAfbeelding(h.art, img => {
      const el = document.querySelector(`.held-art[data-art="${h.art}"]`);
      if (img && el) el.innerHTML = `<img src="${img.src}" alt="${h.naam}">`;
    }));
  }
  verfraaiItemArt($('#schrijn-vak'));
  verfraaiItemArt($('#scherf-vak'));   /* scherf-art meteen inladen (stond eerder als emoji tot je een scherf aanklikte) */
}

function bekijkStartdek(id, e) {
  if (e) e.stopPropagation();
  const h = SPELERS[id];
  toonKaartKeuze(h.dek.map(k => nieuweKaart(k)), `Startdek — ${h.naam}`, null, () => {}, { bekijkAlleen: true });
}

/* levende heldenkeuze: tik op het portret → speel z'n aanval/cast/signature-pose,
   cyclisch (elke tik de volgende). De 'Speel als'-knop eronder start pas écht. */
const HELD_SIGNATUUR_POSE = { speler: 'beulswerk', gifmagier: 'moederslang', thoverk: 'flame' };
let _heldPoseStand = {};
function heldPose(id, e) {
  if (e) e.stopPropagation();
  const h = SPELERS[id]; if (!h || !window.laadKarakterAfbeelding) return;
  const el = document.querySelector(`.held-art[data-art="${h.art}"]`);
  const im = el && el.querySelector('img');
  if (!im) return;   /* nog emoji/geen art geladen → niets te poseren */
  const hint = document.querySelector(`.held-pose-hint[data-hint="${h.art}"]`);
  if (hint) hint.style.visibility = 'hidden';
  const reeks = ['attack', 'cast'];
  if (HELD_SIGNATUUR_POSE[h.art]) reeks.push(HELD_SIGNATUUR_POSE[h.art]);
  const i = (_heldPoseStand[id] || 0) % reeks.length;
  _heldPoseStand[id] = i + 1;
  const state = reeks[i];
  laadKarakterAfbeelding(h.art + '_' + state, img => {
    const im2 = el.querySelector('img');
    if (!img || !im2) return;        /* deze pose-art bestaat niet → laat 'm staan */
    im2.src = img.src;
    el.classList.remove('held-art-poseert'); void el.offsetWidth; el.classList.add('held-art-poseert');
    Klank.sfx(state === 'attack' ? 'kaart' : (state === 'cast' ? 'buff' : 'schitter'));
    clearTimeout(el._poseTimer);
    el._poseTimer = setTimeout(() => {
      laadKarakterAfbeelding(h.art, terug => {
        const im3 = el.querySelector('img');
        if (terug && im3) im3.src = terug.src;
      });
      el.classList.remove('held-art-poseert');
    }, 1000);
  });
}
window.heldPose = heldPose;

function kiesHeld(id, bevestigd) {
  /* Schrijn-nudge: opgeladen relikwieën liggen klaar maar er is er geen gekozen.
     De held-keuze komt vóór het Schrijn (eronder op het scherm), dus makkelijk
     vergeten — herinner de speler er één keer aan vóór de afdaling begint. */
  if (!bevestigd && schrijnKeuzes.length === 0) {
    const besch = Codex.opgeladen.filter(r => RELIKWIEEN[r]).length;
    if (besch > 0) {
      bevestig(
        `🗝️ <b>Het Schrijn wacht</b><br><br>Je hebt <b>${besch}</b> opgeladen relikwie${besch > 1 ? 'ën' : ''} klaarliggen, maar nam er nog geen mee. Toch zonder beginnen?<br><br><small>Annuleer om er onderaan eerst één uit het Schrijn te kiezen.</small>`,
        () => kiesHeld(id, true),
        'Toch beginnen ➤'
      );
      return;
    }
  }
  Klank.sfx('klik');
  const paneel = document.querySelector(`.held-kaart[data-held="${id}"]`);
  if (paneel && !paneel.classList.contains('gekozen-held')) {
    /* korte heldenmoment-animatie, dan de afdaling in */
    document.querySelectorAll('.held-kaart').forEach(p => p.classList.add(p === paneel ? 'gekozen-held' : 'afgewezen-held'));
    Klank.sfx('schitter');
    setTimeout(() => kiesHeldEcht(id), 600);
    return;
  }
  kiesHeldEcht(id);
}

function kiesHeldEcht(id) {
  /* deze nieuwe run clobbert de save; was dat een onafgemaakte daily, rol dan de
     daily-claim terug zodat de speler 'm later vers kan herstarten (geen brick). */
  try {
    const oud = JSON.parse(localStorage.getItem(SAVE_SLEUTEL) || 'null');
    if (oud && oud.daily && Daily.laatsteVoltooid !== oud.dailyDag) { Daily.laatsteStart = null; bewaarDaily(); }
  } catch (e) {}
  wisSave();
  const invoer = $('#seed-invoer');
  /* klem de gekozen ascensie op wat DEZE held ontgrendeld heeft (de stepper toont
     het globale max) en zeg het als het verlaagd wordt — geen stille downgrade. */
  const asc = Math.max(0, Math.min(gekozenAscensie, ontgrendeldNiveau(id)));
  if (asc < gekozenAscensie) melding(`🔥 ${SPELERS[id].naam} heeft Ascensie ${gekozenAscensie} nog niet ontgrendeld — gestart op niveau ${asc}.`);
  nieuwSpel(id, invoer ? invoer.value : '', asc);
  renderKaartScherm();
}

function doorgaan() {
  if (laadSpel()) renderKaartScherm();
  else { melding('Geen opgeslagen spel gevonden.'); naarTitel(); }
}

function toonHelp() { $('#overlay-help').classList.add('open'); }
function sluitHelp() { $('#overlay-help').classList.remove('open'); }

function toonInstellingen() {
  $('#inst-geluid').checked = Klank.vol.aan;
  $('#inst-muziek').value = Klank.vol.muziek;
  $('#inst-sfx').value = Klank.vol.sfx;
  $('#inst-d3').checked = INST.d3;
  $('#inst-lite').checked = INST.lite;
  if ($('#inst-spraak')) $('#inst-spraak').checked = INST.spraak !== false;
  if ($('#inst-daglicht')) $('#inst-daglicht').checked = !!INST.daglicht;
  if ($('#inst-fullscreen')) $('#inst-fullscreen').checked = !!document.fullscreenElement;
  /* install-knop: toon wanneer installeerbaar (Android: prompt klaar) of op iOS
     (daar via de Deel-instructie), en nog niet geïnstalleerd */
  const ib = $('#inst-install');
  if (ib) {
    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    ib.style.display = (!appGeinstalleerd() && (_installPrompt || (window.mobiel && ios))) ? '' : 'none';
  }
  $('#overlay-instellingen').classList.add('open');
}
function sluitInstellingen() { $('#overlay-instellingen').classList.remove('open'); }

/* volledig scherm aan/uit (statusbalk/klok weg). Werkt betrouwbaar omdat de
   speler de schakelaar zelf aantikt = direct gebruikersgebaar. */
function wisselFullscreen(aan) {
  const el = document.documentElement;
  if (aan && !document.fullscreenElement) {
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (req) { try { const r = req.call(el); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
  } else if (!aan && document.fullscreenElement) {
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if (exit) { try { const r = exit.call(document); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
  }
}
/* checkbox in sync houden als de gebruiker via een veeg fullscreen verlaat */
document.addEventListener('fullscreenchange', () => {
  const cb = document.getElementById('inst-fullscreen');
  if (cb) cb.checked = !!document.fullscreenElement;
});

/* draait de game als geïnstalleerde app / op volledig scherm? */
function appGeinstalleerd() {
  /* display-mode:fullscreen telt alleen als ECHT geïnstalleerd, niet wanneer de
     Fullscreen-API (wisselFullscreen) tijdelijk fullscreen forceert — anders
     verdween de install-knop onterecht nadat je in browser-fullscreen ging. */
  return (window.matchMedia &&
      (matchMedia('(display-mode: standalone)').matches ||
       (matchMedia('(display-mode: fullscreen)').matches && !document.fullscreenElement))) ||
    !!navigator.standalone;
}

/* Chrome vuurt geen automatische install-banner meer: we vangen het event zelf op
   en bieden onze eigen 'Installeer'-knop (nudge + ⚙️ Instellingen). */
let _installPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _installPrompt = e;
  /* nudge die al toonde (fullscreen-variant) → upgraden naar 'Installeer' */
  const n = document.getElementById('scherm-nudge');
  if (n) { n.remove(); toonSchermNudge(); }
  /* install-knop in een open instellingenpaneel meteen tonen */
  const knop = document.getElementById('inst-install');
  if (knop && $('#overlay-instellingen') && $('#overlay-instellingen').classList.contains('open') && !appGeinstalleerd()) {
    knop.style.display = '';
  }
});
window.addEventListener('appinstalled', () => {
  _installPrompt = null;
  const n = document.getElementById('scherm-nudge'); if (n) n.remove();
  const knop = document.getElementById('inst-install'); if (knop) knop.style.display = 'none';
  try { localStorage.setItem('slayit_nudge_v2', 'weg'); } catch (e) {}
  if (typeof melding === 'function') melding('📲 SLAY LIT is geïnstalleerd!');
});

/* mobiel: éénmalige, sluitbare nudge. Volgorde van wat ze aanbiedt: native
   install (Android/Chrome, als beforeinstallprompt er is) → iOS-instructie ("Zet
   op beginscherm") → volledig scherm als terugval. Permanente toegang zit ook in
   ⚙️ Instellingen (installeerApp). Onthoudt 'weg'; niet als al geïnstalleerd. */
function toonSchermNudge() {
  if (!window.mobiel || document.getElementById('scherm-nudge')) return;
  try { if (localStorage.getItem('slayit_nudge_v2') === 'weg') return; } catch (e) {}
  if (appGeinstalleerd()) return;
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  const docEl = document.documentElement;
  const kanFS = !!(docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen) && !document.fullscreenElement;

  /* Volledig scherm (de directe winst — cruciaal voor Thomas) staat ALTIJD als
     actie wanneer het kan, óók als installeren beschikbaar is; installeren staat
     ernáást als de duurzame optie. Vroeger verving 'Installeer' de fullscreen-knop. */
  const acties = [];
  if (kanFS) acties.push({ label: '📲 Volledig scherm', primair: true, doe: () => wisselFullscreen(true) });
  if (_installPrompt) acties.push({ label: '📥 Installeer app', doe: () => { const p = _installPrompt; _installPrompt = null; try { p.prompt(); } catch (e) {} } });

  let tekst;
  if (acties.length) {
    tekst = 'Speel op <b>volledig scherm</b> voor de beste ervaring' + (_installPrompt ? ' — of installeer als app.' : '.');
  } else if (ios) {
    tekst = '📲 Voeg toe aan je beginscherm: tik <b>Deel</b> ▸ <b>Zet op beginscherm</b> — speelt dan als app op volledig scherm.';
  } else { return; }

  const wrap = document.createElement('div');
  wrap.id = 'scherm-nudge';
  wrap.innerHTML = `<div class="nudge-tekst">${tekst}</div>
    <div class="nudge-acties">
      ${acties.map((a, i) => `<button type="button" class="nudge-ja${a.primair ? '' : ' nudge-tweede'}" data-i="${i}">${a.label}</button>`).join('')}
      <button type="button" class="nudge-x" aria-label="Sluiten">✕</button>
    </div>`;
  document.body.appendChild(wrap);
  /* een actie sluit de nudge maar onthoudt 'weg' NIET (komt terug zolang je niet
     fullscreen/geïnstalleerd bent); alleen de ✕ zet 'm voorgoed weg. */
  const sluit = onthoud => { wrap.remove(); if (onthoud) { try { localStorage.setItem('slayit_nudge_v2', 'weg'); } catch (e) {} } };
  wrap.querySelectorAll('.nudge-ja').forEach(b => b.onclick = () => { const a = acties[+b.dataset.i]; if (a) a.doe(); sluit(false); });
  wrap.querySelector('.nudge-x').onclick = () => sluit(true);
}

/* permanent bereikbaar vanuit ⚙️ Instellingen: installeer als app — of de
   iOS-instructie tonen wanneer er geen install-prompt beschikbaar is. */
function installeerApp() {
  if (_installPrompt) { const p = _installPrompt; _installPrompt = null; try { p.prompt(); } catch (e) {} return; }
  bevestig('📲 <b>Voeg toe aan beginscherm</b><br><br>Tik op <b>Deel</b> (het deel-icoon van je browser) en kies <b>Zet op beginscherm</b>. SLAY LIT opent dan als een echte app, op volledig scherm.', () => {}, 'Begrepen');
}
function instWijzig() {
  Klank.zet('aan', $('#inst-geluid').checked);
  Klank.zet('muziek', parseFloat($('#inst-muziek').value));
  Klank.zet('sfx', parseFloat($('#inst-sfx').value));
  INST.d3 = $('#inst-d3').checked;
  INST.lite = $('#inst-lite').checked;
  if ($('#inst-spraak')) INST.spraak = $('#inst-spraak').checked;
  if ($('#inst-daglicht')) INST.daglicht = $('#inst-daglicht').checked;
  bewaarInst();
  pasInstToe();
  zetLichtVisueel();              /* Daglichtmodus live: vignet + gevechtsplaat */
  herpasSchermAchtergronden();    /* én de menu-/scherm-platen meteen herhelderen */
  /* 3D aan/uit midden in een gevecht: toneel wisselen */
  if (inGevecht()) {
    const scherm = $('#scherm-gevecht');
    if (d3Gewenst() && Vista.start($('#vista-canvas'))) {
      scherm.classList.add('d3-actief');
      Vista.gevechtStart(S.gevecht, S.gevecht.soort, !!S.gevecht.achtergrond);
    } else {
      if (window.Vista) Vista.gevechtEind();
      scherm.classList.remove('d3-actief');
      /* posities terugzetten naar de flexbox-indeling */
      GDOM.vijanden.forEach(d => { d.wrap.style.left = ''; d.wrap.style.top = ''; d.spacer.style.height = ''; });
      if (GDOM.speler) { GDOM.speler.wrap.style.left = ''; GDOM.speler.wrap.style.top = ''; GDOM.speler.spacer.style.height = ''; }
      if (GDOM.metgezel) { GDOM.metgezel.wrap.style.left = ''; GDOM.metgezel.wrap.style.top = ''; }   /* terug naar de 2D flex-indeling */
    }
  }
}

/* ---------- tooltips (data-tip) ---------- */
function _plaatsTip(t) {
  const tip = $('#tooltip');
  if (!tip) return;
  tip.textContent = t.dataset.tip;
  tip.style.display = 'block';
  const r = t.getBoundingClientRect();
  const tipH = tip.offsetHeight;
  /* onderaan geen plek? dan boven het element tonen */
  let top = r.bottom + 8;
  if (top + tipH > window.innerHeight - 8) top = r.top - tipH - 8;
  tip.style.left = Math.max(8, Math.min(window.innerWidth - 268, r.left + r.width / 2 - 130)) + 'px';
  tip.style.top = Math.max(8, top) + 'px';
}
function _verbergTip() { const tip = $('#tooltip'); if (tip) tip.style.display = 'none'; }
document.addEventListener('mouseover', e => {
  const t = e.target.closest('[data-tip]');
  if (!t) { _verbergTip(); return; }
  _plaatsTip(t);
});
/* toetsenbord/screenreader: dezelfde tip bij focus zodat tab-navigatie de uitleg
   óók krijgt (muis-hover bestaat niet voor een toetsenbordgebruiker). */
document.addEventListener('focusin', e => {
  const t = e.target.closest && e.target.closest('[data-tip]');
  if (t) _plaatsTip(t);
});
document.addEventListener('focusout', _verbergTip);

/* touch: een tik op een uitleg-icoon toont dezelfde tip (hover bestaat niet op
   een vinger). Auto-verbergen na ~2.8s of bij een tik elders. De klik wordt
   NIET geblokkeerd, dus tikbare elementen blijven gewoon werken. De offsets
   leiden we af van de echte tip-breedte zodat hij op een smal scherm past. */
let _tipTouchTimer = null;
document.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch') return;
  const t = e.target.closest('[data-tip]');
  const tip = $('#tooltip');
  if (!tip) return;
  if (!t) { tip.style.display = 'none'; return; }
  tip.textContent = t.dataset.tip;
  tip.style.display = 'block';
  const r = t.getBoundingClientRect();
  const tipW = tip.offsetWidth, tipH = tip.offsetHeight;
  let top = r.bottom + 8;
  if (top + tipH > window.innerHeight - 8) top = r.top - tipH - 8;
  tip.style.left = Math.max(8, Math.min(window.innerWidth - tipW - 8, r.left + r.width / 2 - tipW / 2)) + 'px';
  tip.style.top = Math.max(8, top) + 'px';
  clearTimeout(_tipTouchTimer);
  _tipTouchTimer = setTimeout(() => { tip.style.display = 'none'; }, 2800);
});

/* touch: een drankje lang vasthouden toont het verhaal zonder te verbruiken
   (rechtsklik bestaat niet op een gsm). Een korte tik verbruikt zoals altijd.
   Desktop blijft op de oncontextmenu-route — deze takken zijn touch-only. */
(() => {
  let timer = null, langIngedrukt = false, doel = null;
  const annuleer = () => { clearTimeout(timer); doel = null; };
  document.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    const knop = e.target.closest('.drank');
    if (!knop) return;
    langIngedrukt = false; doel = knop;
    timer = setTimeout(() => {
      langIngedrukt = true;
      if (knop.dataset.dart) bekijkDrank(null, knop.dataset.dart);
    }, 450);
  });
  document.addEventListener('pointerup', annuleer);
  document.addEventListener('pointermove', () => { if (doel) annuleer(); });
  /* de klik die ná een long-press komt onderdrukken, anders verbruik je het
     drankje toch. Capture-fase: vóór de inline onclick van de knop. */
  document.addEventListener('click', e => {
    if (langIngedrukt && e.target.closest('.drank')) {
      e.preventDefault(); e.stopPropagation();
      langIngedrukt = false;
    }
  }, true);
})();

/* onderdruk het native context-/'afbeelding opslaan'-menu op het spel zelf:
   lang-indrukken op art (relikwie, vijand, kaart…) opende anders dat menu en
   blokkeerde de uitleg/peek. Inputs (zoals het seed-veld) houden hun menu zodat
   plakken blijft werken. De desktop-drank-lore loopt via de eigen inline
   oncontextmenu-handler (die vuurt vóór deze) en blijft dus gewoon werken. */
document.addEventListener('contextmenu', e => {
  if (!e.target.closest('input, textarea')) e.preventDefault();
});

/* touch: een relikwie/uitleg-item lang vasthouden toont de uitleg ZONDER te
   kiezen — zo kun je afwegen vóór je beslist (de tip verschijnt al bij aanraken;
   dit houdt 'm vast en onderdrukt de keuze-klik die normaal zou selecteren). */
(() => {
  let timer = null, lang = false;
  const SEL = '.schrijn-slot, .relikwie, .boek-kaart';
  document.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    const knop = e.target.closest(SEL);
    if (!knop) return;
    lang = false;
    timer = setTimeout(() => {
      const t = knop.matches('[data-tip]') ? knop : knop.closest('[data-tip]');
      if (!t || !t.dataset.tip) return;     /* niets te tonen → laat de tik gewoon kiezen */
      lang = true;
      clearTimeout(_tipTouchTimer);
      _plaatsTip(t);
      if (window.Klank && Klank.sfx) Klank.sfx('klik');
    }, 420);
  });
  const stop = () => { clearTimeout(timer); if (lang) { clearTimeout(_tipTouchTimer); _tipTouchTimer = setTimeout(_verbergTip, 1800); } };
  document.addEventListener('pointerup', stop);
  document.addEventListener('pointercancel', stop);
  document.addEventListener('pointermove', () => clearTimeout(timer));
  /* de klik ná een long-press onderdrukken zodat de relikwie NIET gekozen wordt */
  document.addEventListener('click', e => {
    if (lang && e.target.closest(SEL)) { e.preventDefault(); e.stopPropagation(); lang = false; }
  }, true);
})();

/* touch: je held of een vijand VASTHOUDEN maakt de kaarthand even doorzichtig,
   zodat je de statussen, hp en intenties eronder duidelijk ziet (op een smal
   gsm-scherm dekken de kaarten die soms af). Loslaten herstelt meteen. Een korte
   tik blijft gewoon 'richten/aanvallen' (vandaar de hold-drempel); een peek op
   een vijand mag dus géén kaart spelen — de klik erna onderdrukken we. */
(() => {
  let timer = null, actief = false, gekeken = false;
  const scherm = () => $('#scherm-gevecht');
  const opFiguur = t => t && t.closest && t.closest('#speler-zone, #vijanden-rij .vijand');
  const toon = () => { const s = scherm(); if (s) { s.classList.add('statuskijk'); actief = true; gekeken = true; } };
  const verberg = () => {
    clearTimeout(timer); timer = null; actief = false;
    const s = scherm(); if (s) s.classList.remove('statuskijk');
  };
  document.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    if (!opFiguur(e.target)) return;
    gekeken = false;
    clearTimeout(timer);
    timer = setTimeout(toon, 240);
  });
  document.addEventListener('pointerup', verberg);
  document.addEventListener('pointercancel', verberg);
  /* beweegt de vinger vóór de peek begint, dan was het een swipe → afbreken;
     is de peek al actief, dan laten we 'm staan tot loslaten */
  document.addEventListener('pointermove', () => { if (!actief && timer) { clearTimeout(timer); timer = null; } });
  /* capture-fase, vóór de #vijanden-rij-klik: na een peek geen aanval triggeren */
  document.addEventListener('click', e => {
    if (gekeken && e.target.closest('#vijanden-rij .vijand')) {
      e.preventDefault(); e.stopPropagation();
    }
    gekeken = false;
  }, true);
})();

/* ---------- 2.5D: kaart-tilt + glans ---------- */
(() => {
  const hand = () => $('#hand');
  document.addEventListener('pointermove', e => {
    const el = e.target.closest('#hand .kaart, .kaart-focus');
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;   /* 0..1 */
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', ((px - 0.5) * 18) + 'deg');
    el.style.setProperty('--rx', ((0.5 - py) * 14) + 'deg');
    el.style.setProperty('--gx', (px * 100) + '%');
    el.style.setProperty('--gy', (py * 100) + '%');
  });
  document.addEventListener('pointerout', e => {
    const el = e.target.closest && e.target.closest('#hand .kaart, .kaart-focus');
    if (!el) return;
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--rx', '0deg');
  });
})();

/* ---------- opstart ---------- */
window.addEventListener('DOMContentLoaded', () => {
  pasInstToe();

  /* event-delegatie voor hand en vijanden */
  $('#hand').addEventListener('click', e => {
    const el = e.target.closest('.kaart');
    if (el) klikKaart(parseInt(el.dataset.uid, 10));
  });
  $('#vijanden-rij').addEventListener('click', e => {
    const el = e.target.closest('.vijand');
    if (el) klikVijand(parseInt(el.dataset.i, 10));
  });

  /* fullscreen op mobiel: weg met de statusbalk/klok tijdens het spelen.
     Vereist een gebruikersgebaar (vandaar hier). Android-browsers steunen dit;
     iOS-browsers niet — daar dekt de PWA-installatie (manifest display:fullscreen)
     het. Geïnstalleerd als app start het sowieso fullscreen. */
  function gaFullscreen() {
    if (!window.mobiel || document.fullscreenElement) return;
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (req) { try { const r = req.call(el); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
  }

  /* audio mag pas starten na een gebruikersgebaar */
  const eersteGebaar = () => {
    Klank.init();
    const naam = (S && S.scherm) || 'titel';
    Klank.muziek(SCHERM_MUZIEK[naam] || 'titel');
    document.removeEventListener('pointerdown', eersteGebaar);
    document.removeEventListener('keydown', eersteGebaar);
  };
  document.addEventListener('pointerdown', eersteGebaar);
  document.addEventListener('keydown', eersteGebaar);

  /* volledig scherm zó vroeg mogelijk én BETROUWBAAR: een browser mag fullscreen niet
     bij het laden forceren (vereist een gebaar), maar wél bij de eerste tik. Sommige
     Android-browsers wijzen die eerste aanvraag echter af → daarom proberen we 't bij
     ELK gebaar opnieuw tot het één keer lukt, en stoppen dan (zodat een bewuste veeg-
     om-te-verlaten niet telkens wordt teruggevochten). iOS-browsers hebben geen
     Fullscreen-API → daar dekt de PWA-install (manifest display:fullscreen) het, die
     start sowieso meteen schermvullend. */
  const _docEl = document.documentElement;
  if (window.mobiel && (_docEl.requestFullscreen || _docEl.webkitRequestFullscreen || _docEl.msRequestFullscreen)) {
    const fsProberen = () => { if (!document.fullscreenElement) gaFullscreen(); };
    document.addEventListener('pointerdown', fsProberen);
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) document.removeEventListener('pointerdown', fsProberen);
    });
  }
  /* iOS kan de audio na backgrounding opnieuw 'suspenden' → bij elk later gebaar
     opnieuw hervatten (lichtgewicht: checkt enkel de context-state). */
  document.addEventListener('pointerdown', () => { if (window.Klank && Klank.hervat) Klank.hervat(); });

  /* PWA: alleen via http(s), file:// kan geen service worker */
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  naarTitel();
  if (window.mobiel) setTimeout(toonSchermNudge, 1200);
});
