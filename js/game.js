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
/* ====== SCHONE LEI (eenmalig per WIPE_VERSIE) ======
   Wist bij ELKE speler de volledige spelvoortgang — run, Codex (relikwieën/
   scherven/mysteries/slachtblok/loopbaan), daily-reeksen en de proloog — zodat
   iedereen de playtest fris herstart (Thomas, 27 aug 2026). Instellingen, audio,
   de fullscreen-nudge-keuze en de syndicaat-identiteit (strijdnaam + groepscode)
   blijven staan: de groep her-registreert zichzelf bij het eerste bordbezoek.
   Hoort bij de server-wipe in SUPABASE-SETUP.md (stap WIPE-1). Volgende schone
   lei? Verhoog alleen WIPE_VERSIE. */
const WIPE_VERSIE = 1;
try {
  if ((parseInt(localStorage.getItem('slayit_wipe') || '0', 10) || 0) < WIPE_VERSIE) {
    ['slayit_save_v1', 'slayit_codex', 'slayit_daily', 'slayit_einde_pending',
     'slayit_porren_gezien', 'slayit_proloog', 'slayit_proloog_over']
      .forEach(k => localStorage.removeItem(k));
    localStorage.setItem('slayit_wipe', String(WIPE_VERSIE));
  }
} catch (e) { /* opslag optioneel (privé-modus) */ }

const SAVE_SLEUTEL = 'slayit_save_v1';

/* ---------- acts (meerdere verdiepingen-ladders na elkaar) ---------- */
const ACTS_MAX = 3;                       /* Act 3 is LIVE — de outro speelt nu ná de DICKtator */
const ACT_NAMEN = { 1: 'De Diepte', 2: 'Het Archief', 3: 'Het Slachtblok' };
const BAAS_PER_ACT = {
  1: { id: 'slijmkoning', naam: 'De Slijmkoning' },
  2: { id: 'de_erfprins', naam: 'De Erfprins' },
  3: { id: 'de_dicktator', naam: 'de DICKtator' }
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
/* mobiel/touch staat los van de hardware-heuristiek: een coarse pointer
   (vinger) of een mobiele user-agent. Op een laptop is dit false, dus de
   defaults hieronder blijven exact zoals voorheen. Globaal beschikbaar zodat
   scene3d zijn renderer kan verzachten en latere touch-fixes hem hergebruiken.
   Wordt VÓÓR standaardLite bepaald zodat de lite-drempel mobiel-bewust kan zijn. */
const mobiel =
  (window.matchMedia && matchMedia('(pointer: coarse)').matches) ||
  /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent || '');
window.mobiel = mobiel;

/* lite = zwakke hardware of OS-reduced-motion. Op MOBIEL is de RAM/cores-drempel
   te streng: Chrome clampt navigator.deviceMemory grof (talloze capabele telefoons
   melden gewoon 4) -> daar enkel bij écht zwak (<=1 GB / <=2 cores) of expliciete
   reduced-motion naar lite. Op laptop ongewijzigd (<=4). */
const standaardLite =
  (navigator.hardwareConcurrency || 8) <= (mobiel ? 2 : 4) ||
  (navigator.deviceMemory || 8) <= (mobiel ? 1 : 4) ||
  (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

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
  { lite: standaardLite, d3: !standaardLite && !mobiel, spraak: true, daglicht: mobiel, autoPor: true },
  veiligLees('slayit_inst')
);
/* mobiel-migratie: forceer 3D uit (onspeelbaar op telefoon) en zet lite weer uit op
   capabele toestellen — anders blijven alle gevechtsanimaties dood. De vlag heet
   bewust 'mobielHersteld2' (opvolger van v1): zo herevalueert deze migratie ééns
   opnieuw met de VERSOEPELDE mobiele lite-drempel, zodat telefoons die eerder
   onterecht in lite bleven hangen (deviceMemory==4) hun animaties terugkrijgen. */
if (mobiel && !INST.mobielHersteld2) {
  INST.mobielHersteld2 = true;
  INST.d3 = false;
  if (!standaardLite) INST.lite = false;
  try { localStorage.setItem('slayit_inst', JSON.stringify(INST)); } catch (e) {}
}
function bewaarInst() { try { localStorage.setItem('slayit_inst', JSON.stringify(INST)); } catch (e) { /* opslag optioneel (quota/privé-modus) — mag het eindscherm nooit breken */ } }

/* ---------- de Codex: alles wat je ooit ontdekte, over alle runs heen ---------- */
const CODEX_SLEUTEL = 'slayit_codex';
const Codex = Object.assign(
  /* loopbaan over alle runs heen: runs/wins/diepterecord per held, laatste runs,
     en het hoogst-ontgrendelde ascensieniveau per held. Bestaande saves missen
     deze sleutels → Object.assign houdt dan deze defaults aan (migratie). */
  { relikwieen: [], dranken: [], metgezellen: [], gevallen: [], opgeladen: null, runs: 0, wins: 0, bestDiepte: {}, gesch: [], ascensie: {}, mysteries: {}, scherven: [], gezien: [], erfprinsOntmoetingen: 0, copycatGebroken: false, outroGezien: false },
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
  Codex.opgeladen = Codex.relikwieen.filter(r => typeof RELIKWIEEN !== 'undefined' && RELIKWIEEN[r] && RELIKWIEEN[r].zeld !== 'start');
}
/* HERSTEL (debug-sweep 27 aug): de oude migratie testte op window.RELIKWIEEN — dat
   bestaat niet (const staat niet op window) — en zette ieders Schrijn op leeg. Eén
   herstelpass laadt de ontdekkingen opnieuw op; wie zijn ladingen legitiem opbruikte
   krijgt ze eenmalig terug — de prijs van het herstel. */
if (!Codex.schrijnHersteld) {
  Codex.schrijnHersteld = true;
  const her = Codex.relikwieen.filter(r => typeof RELIKWIEEN !== 'undefined' && RELIKWIEEN[r]
    && RELIKWIEEN[r].zeld !== 'start' && !Codex.opgeladen.includes(r));
  if (her.length) Codex.opgeladen = Codex.opgeladen.concat(her);
  bewaarCodex();
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
Codex.outroGezien = !!Codex.outroGezien;   /* de outro ("De Opzegtermijn") speelt één keer, bij de eerste clear */
function bewaarCodex() { try { localStorage.setItem(CODEX_SLEUTEL, JSON.stringify(Codex)); } catch (e) { /* opslag optioneel (quota/privé-modus) — nooit de scherf-/codex-flow laten crashen */ } }

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
  score: +(g && g.score) || 0, gewonnen: !!(g && g.gewonnen), diepte: +(g && g.diepte) || 0,
  held: String((g && g.held) || 'slachter').replace(/[^a-z_]/g, '')
}));
function bewaarDaily() { try { localStorage.setItem(DAILY_SLEUTEL, JSON.stringify(Daily)); } catch (e) { /* opslag optioneel (quota/privé-modus) — mag het eindscherm nooit breken */ } }
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
  /* scherven/rite/rijp zijn legacy-velden uit het geschrapte rite-systeem: ze worden
     alleen nog genormaliseerd zodat oude saves geldig blijven — gelezen wordt enkel 'voltooid'. */
  if (!Array.isArray(m.scherven)) m.scherven = [];
  if (typeof m.rite !== 'object' || !m.rite) m.rite = {};
  m.rijp = !!m.rijp; m.voltooid = !!m.voltooid;
  return m;
}
function isOntgrendeld(mid) { return !!mys(mid).voltooid; }
/* (noteerScherf + noteerRite — de oude per-mysterie-voortgang — zijn verwijderd:
   Scherven 2.0 werkt met de platte stash + het Drempel-ritueel hieronder) */
function ontgrendelMetgezel(mid) { mys(mid).voltooid = true; bewaarCodex(); }

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
function bankGedragen() { gedragen().slice().forEach(bankScherf); if (S) { S.scherven = []; S.loadoutScherven = []; } }   /* na een veilige bank is niks meer 'inzet' → wis de loadout-markering (anders kapt een later HERvonden scherf met een stale loadout-id ten onrechte weg bij dood) */
/* run-start loadout: verplaats gekozen scherven van de stash naar je gedragen tas (nu staan ze op het spel).
   We onthouden WELKE bewust zijn meegebracht (S.loadoutScherven): die zijn de inzet → kwijt bij dood. Wat je
   NADIEN tíjdens de run vindt is GEEN loadout en blijft bij dood behouden (zie toonEinde). */
function laadScherfLoadout(ids) {
  const gebracht = [];
  (ids || []).forEach(sid => { if (neemUitStash(sid)) { draagScherf(sid); gebracht.push(sid); } });
  if (S) S.loadoutScherven = gebracht;
}
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
  /* filtert óók op voltooid: de (verbruikte) scherven van een al-ontwaakte metgezel
     droppen niet opnieuw — anders verdunnen dode stash-items de pool na elke unlock */
  const alle = alleScherfIds().filter(sid => { const d = scherfDef(sid); return d && (!bron || d.bron === bron) && !isOntgrendeld(d.mid); });
  if (!alle.length) return null;
  const nieuw = alle.filter(sid => !bezitScherf(sid));
  if (!nieuw.length) return null;   /* je hebt al alles van deze bron → niets te vinden */
  const sid = kiesUit(nieuw);
  draagScherf(sid);
  if (typeof saveSpel === 'function') saveSpel();   /* meteen persisteren: geen verlies meer bij herladen vóór de volgende save */
  return sid;
}
/* is er nog een scherf van deze bron die je NIET bezit? (gate voor de figuur-events) */
function scherfTeVinden(bron) {
  return alleScherfIds().some(sid => { const d = scherfDef(sid); return d && (!bron || d.bron === bron) && !bezitScherf(sid) && !isOntgrendeld(d.mid); });
}

/* ---------- loopbaan: het spoor dat élke run achterlaat (retentiemotor) ---------- */
const HELDNAAM = id => (window.SPELERS && SPELERS[id] && SPELERS[id].naam) || id;
function registreerRun(gewonnen) {
  const h = (S && S.held) || 'slachter';
  const diepte = (S && S.verdieping) || 0;
  Codex.runs = (Codex.runs || 0) + 1;
  if (gewonnen) Codex.wins = (Codex.wins || 0) + 1;
  /* HET SLACHTBLOK: win je mét een op het altaar gesmede kaart, dan wordt die
     GEBRANDMERKT in de Codex (één slot per held — de diepte onthoudt één naam) */
  if (gewonnen && S && S.gesmeed) {
    const runKaart = (S.dek || []).find(c => S.gesmeed[c.id]);
    if (runKaart) {
      Codex.slachtblok = Codex.slachtblok || {};
      Codex.slachtblok[h] = Object.assign({}, S.gesmeed[runKaart.id], { gebrandmerkt: true, charges: 3 });
    }
  }
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
function dagSeed(dag) { return 'DAILY-' + (dag || vandaagSleutel()).replace(/-/g, ''); }
/* held van de dag: deterministisch uit de datum → voor iedereen dezelfde */
function heldVanDag() {
  const ids = Object.keys(SPELERS);
  return ids[zaadVanTekst(vandaagSleutel()) % ids.length];
}
/* DE NALATENSCHAP: welke kaart laat een gevallene na? Zijn beste — hoogste
   zeldzaamheid, geen basis/vloek/gesmeed (gesmeed is te persoonlijk). */
function nalatenschapKaart() {
  const orde = { episch: 4, zeldzaam: 3, ongewoon: 2, gewoon: 1 };
  let beste = null;
  (S.dek || []).forEach(c => {
    const z = kdef(c) && kdef(c).zeld;
    if (orde[z] && (!beste || orde[z] > orde[beste.z])) beste = { id: c.id, z };
  });
  return beste && beste.id;
}
/* de laatste n dagen als sleutels (vandaag eerst) — voor de groepsgeschiedenis */
function laatsteDagen(n) {
  const uit = []; const d = new Date();
  for (let i = 0; i < n; i++) { uit.push(datumSleutel(d)); d.setDate(d.getDate() - 1); }
  return uit;
}
/* HET DUELDECREET: dag-seeded duo's binnen de posse. Deterministisch uit
   (dag, groepscode, gesorteerde ledenlijst) — iedereen ziet dezelfde paren.
   Oneven aantal → de laatste is die dag 'vrijgesteld van het decreet'. */
function duelParen(namen, dag, code) {
  const lijst = namen.slice().sort((a, b) => a.localeCompare(b));
  let z = (zaadVanTekst('DUEL-' + dag + '-' + code) || 1) >>> 0;
  const rnd = () => ((z = (z * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = lijst.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [lijst[i], lijst[j]] = [lijst[j], lijst[i]];
  }
  const paren = [];
  for (let i = 0; i + 1 < lijst.length; i += 2) paren.push([lijst[i], lijst[i + 1]]);
  return { paren, vrijgesteld: lijst.length % 2 ? lijst[lijst.length - 1] : null };
}
/* DE EEUWIGE VLAM: hoeveel dagen op rij daalde minstens één genoot af?
   Telt terug vanaf vandaag; is vandaag nog leeg, dan flakkert ze (reeks
   t/m gisteren) tot iemand haar redt. */
function vlamReeks(gesch) {
  const dagenMet = new Set((gesch || []).map(r => r.dag));
  const d = new Date();
  const vandaagGedekt = dagenMet.has(datumSleutel(d));
  if (!vandaagGedekt) d.setDate(d.getDate() - 1);
  let reeks = 0;
  while (reeks < 60 && dagenMet.has(datumSleutel(d))) { reeks++; d.setDate(d.getDate() - 1); }
  return { reeks, vandaagGedekt };
}

/* de VREEMDE held van de dag (≠ je eigen): voedt DE VIJANDIGE OVERNAME (wiens
   startdek krijg je) en DE DETACHERING (uit wiens gilde komen je beloningen).
   Eigen salt, deterministisch — in de daily speelt iedereen dezelfde held,
   dus ook dezelfde vreemde held: eerlijk bord. */
function vreemdeHeldVanDag() {
  const ids = Object.keys(SPELERS).filter(h => !S || h !== S.held);
  return ids[zaadVanTekst('VREEMD-' + vandaagSleutel()) % ids.length];
}

/* ---------- DE DAGWETTEN: elke dagelijkse afdaling valt onder één wet ----------
   Deterministisch uit de datum (aparte salt, los van de held-keuze) → iedereen
   in het syndicaat speelt vandaag onder DEZELFDE wet. De risico-wetten betalen
   een transparante scorebonus uit (uitgesplitst op het eindescherm). */
/* elke wet wordt UITGEVAARDIGD door een van de drie eindbazen (afzender +
   citaat voeden de proclamatie-overlay bij de start van de daily) */
const DAGWETTEN = {
  amalgaam: {
    naam: 'HET AMALGAAM', icoon: '🎭',
    kort: 'De gilden mengen hun kunsten: drie vreemde kaarten in je startdek, en elke kaartbeloning en winkel put uit ALLE helden.',
    baas: 'de_erfprins', baasArt: 'de_erfprins_intro',
    quote: 'Gilden-grenzen? Afgeschaft. Alles is toch al van MIJ — vandaag mag jij er heel even bij.'
  },
  glas: {
    naam: 'GLAZEN ZIELEN', icoon: '💥',
    kort: 'Alles breekt sneller: elke klap doet anderhalf keer zoveel pijn — ook die op jou.',
    scoreBonus: 0.10,
    baas: 'slijmkoning', baasArt: 'slijmkoning',
    quote: 'Alles smelt. Alles breekt. Vandaag… ietsje sneller.'
  },
  duister: {
    naam: 'HET DONKER KRUIPT', icoon: '🕯️',
    kort: 'De diepte vreet licht: elk fakkelverlies telt dubbel. Wie het haalt, scoort een kwart extra.',
    scoreBonus: 0.25,
    baas: 'de_dicktator', baasArt: 'de_dicktator_intro',
    quote: 'Licht is een voorrecht. Bij decreet: INGETROKKEN.'
  },
  stormloop: {
    naam: 'DE STORMLOOP', icoon: '⚡',
    kort: 'Vier energie per beurt — maar de diepte stuurt taaiere vijanden (+25% HP).',
    baas: 'de_dicktator', baasArt: 'de_dicktator_intro',
    quote: 'Vier tandjes hoger! Wie achterblijft, wordt afgeschreven.'
  },
  goudkoorts: {
    naam: 'DE GOUDKOORTS', icoon: '🪙',
    kort: 'Je start berooid (0 goud), maar gevechten betalen dubbel en de koopman geeft 30% korting.',
    scoreBonus: 0.10,
    baas: 'de_erfprins', baasArt: 'de_erfprins_intro',
    quote: 'Berooid beginnen — zo voelt het als iemand je erfenis rooft. Wen eraan.'
  },
  besmetting: {
    naam: 'DE BESMETTING', icoon: '☣️',
    kort: 'Een Laster-vloek nestelt zich in je startdek — maar de dag schenkt een dérde relikwie en een vijfde extra score.',
    scoreBonus: 0.20,
    baas: 'slijmkoning', baasArt: 'slijmkoning',
    quote: 'Eén druppel van mij reist mee in je dek. Voel je het al kriebelen?'
  },
  /* --- de kaartvloei-wetten (meesterplan fase 3): kaarten van helden vloeien
     door elkaar — gerichter en asymmetrischer dan HET AMALGAAM (dat alles
     gelijk blendt). Beide leunen op vreemdeHeldVanDag() — dag-seeded, dus
     iedereen speelt dezelfde swap (eerlijk bord). --- */
  overname: {
    naam: 'DE VIJANDIGE OVERNAME', icoon: '🔀',
    kort: 'Je gilde is geannexeerd: je begint met het VOLLEDIGE startdek van een andere held. Je passief en HP blijven de jouwe.',
    scoreBonus: 0.15,
    baas: 'de_erfprins', baasArt: 'de_erfprins_intro',
    quote: 'Uw gilde is per heden geannexeerd. Het personeel mag blijven; de gereedschapskist is van de nieuwe eigenaar.'
  },
  detachering: {
    naam: 'DE DETACHERING', icoon: '🧳',
    kort: 'Je start met je eigen dek, maar élke kaartbeloning en winkelkaart komt uit het gilde van een andere held. Je build wordt onderweg een hybride.',
    baas: 'de_dicktator', baasArt: 'de_dicktator_intro',
    quote: 'U bent gedetacheerd. Uw vaardigheden zijn niet vergeten — ze zijn hergealloceerd.'
  }
};
/* de rotatie weegt HET AMALGAAM dubbel: de blend-dag is het pronkstuk */
const DAGWET_ROTATIE = ['amalgaam', 'glas', 'overname', 'duister', 'stormloop', 'detachering', 'amalgaam', 'goudkoorts', 'besmetting'];
function wetVanDag() {
  if (wetVanDag._force && DAGWETTEN[wetVanDag._force]) return wetVanDag._force;   /* dev-haak */
  return DAGWET_ROTATIE[zaadVanTekst('WET' + vandaagSleutel()) % DAGWET_ROTATIE.length];
}
/* geldt wet <id> in de LOPENDE run? (alleen dailies dragen een wet; oude saves
   hebben geen S.dagwet → overal netjes false, zie [[lookup-bugklasse]]) */
const dagwetActief = id => !!(S && S.daily && S.dagwet === id);
/* dev: devDagwet('amalgaam') vóór de daily-start forceert een wet (null wist) */
function devDagwet(id) { wetVanDag._force = id || null; return id ? DAGWETTEN[id] : 'gewist'; }

/* ---------- DE PROCLAMATIE: de eindbaas vaardigt de dagwet uit ----------
   Fullscreen-moment bij de start van elke daily (i.p.v. wegdrijvende toasts):
   zegel-slam, de wet in kapitalen, het citaat van de uitvaardigende baas, de
   geschenken van de dag en één knop: DAAL AF. Herlezen kan via de 📜-chip. */
function toonDagwetProclamatie(replay) {
  const wet = (S && S.daily && S.dagwet && DAGWETTEN[S.dagwet]) || null;
  if (!wet) return;
  const oud = document.getElementById('dagwet-proc');
  if (oud) oud.remove();
  const baasNaam = (VIJANDEN[wet.baas] && VIJANDEN[wet.baas].naam) || 'de diepte';
  const geschenken = Array.isArray(S.dagwetGeschenken) ? S.dagwetGeschenken : [];
  const vreemd = Array.isArray(S.dagwetVreemd) ? S.dagwetVreemd : [];
  const synRegel = (window.Online && Online.isLid())
    ? 'Heel het syndicaat vecht vandaag onder deze wet — je score telt mee op het bord.'
    : 'Iedereen daalt vandaag onder dezelfde wet af. Hoe diep durf jij?';
  const el = document.createElement('div');
  el.id = 'dagwet-proc';
  el.innerHTML = `
    <div class="dwp-vignet"></div>
    <div class="dwp-kaart">
      <small class="dwp-boven">— DE DIEPTE VAARDIGT UIT —</small>
      <div class="dwp-zegel"><span>${wet.icoon}</span></div>
      <h1 class="dwp-naam">${wet.naam}</h1>
      <div class="dwp-baas">
        <div class="dwp-portret">${(VIJANDEN[wet.baas] && VIJANDEN[wet.baas].art) || '👁️'}</div>
        <blockquote class="dwp-quote">„${wet.quote}"<cite>— ${baasNaam}</cite></blockquote>
      </div>
      <p class="dwp-effect">${wet.kort}</p>
      <div class="dwp-chips">
        ${wet.scoreBonus ? `<span class="dwp-chip dwp-bonus">⚖️ +${Math.round(wet.scoreBonus * 100)}% score</span>` : ''}
        ${geschenken.length ? `<span class="dwp-chip">🎁 ${geschenken.join(' · ')}</span>` : ''}
        ${vreemd.length ? `<span class="dwp-chip">🎭 in je dek: ${vreemd.join(' · ')}</span>` : ''}
        <span class="dwp-chip">🗡️ ${SPELERS[S.held] ? SPELERS[S.held].naam : ''}</span>
      </div>
      <button class="knop-groot dwp-knop" onclick="sluitDagwetProclamatie()">⚔️ DAAL AF</button>
      <small class="dwp-syn">${synRegel}</small>
    </div>`;
  document.body.appendChild(el);
  /* het staatsieportret van de afzender laadt asynchroon in (emoji-terugval) */
  if (window.laadKarakterAfbeelding && wet.baasArt) {
    laadKarakterAfbeelding(wet.baasArt, img => {
      const p = el.querySelector('.dwp-portret');
      if (img && p) { p.style.backgroundImage = `url("${img.src}")`; p.textContent = ''; p.classList.add('heeft-art'); }
    });
  }
  /* geforceerde reflow i.p.v. requestAnimationFrame: rAF vuurt niet in een
     verborgen/achtergrond-tab → de overlay bleef dan onzichtbaar op opacity 0 */
  void el.offsetWidth;
  el.classList.add('toon');
  if (!replay && !INST.lite) {
    Klank.sfx('zwareklap');
    setTimeout(() => { Klank.sfx('dood'); if (typeof schudScherm === 'function') schudScherm(); }, 620);
  } else {
    Klank.sfx('klik');
  }
}
function sluitDagwetProclamatie() {
  const el = document.getElementById('dagwet-proc');
  if (!el) return;
  Klank.sfx('klik');
  el.classList.add('weg');
  setTimeout(() => el.remove(), 480);
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
  const sub = diepte + winst + relikwieen + goud;
  /* de risico-dagwetten betalen een bonus over het subtotaal uit */
  const wet = (S.daily && S.dagwet && DAGWETTEN[S.dagwet]) || null;
  const wetBonus = (wet && wet.scoreBonus) ? Math.round(sub * wet.scoreBonus) : 0;
  return { diepte, winst, relikwieen, goud, wetBonus, wet, totaal: sub + wetBonus };
}
function registreerDaily(gewonnen) {
  /* anker op de dag waarop de daily GESTART is: over middernacht heen scoorde hij
     anders op 'morgen' en verbrandde die dag ongespeeld (debug-sweep 27 aug) */
  const dag = (S && S.dailyDag) || vandaagSleutel();
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
  Daily.gesch.unshift({ dag, score: totaal, gewonnen: !!gewonnen, diepte: S.verdieping || 0, held: S.held || 'slachter' });
  Daily.gesch = Daily.gesch.slice(0, 30);   /* het leaderboard toont een maand geschiedenis */
  bewaarDaily();
  /* ONLINE: de score meteen de borden op (fire-and-forget — offline of zonder
     identiteit gebeurt er stilletjes niets). Syndicaat-leden voeden posse- én
     wereldbord; zwervers alleen het wereldbord. Auto-por blijft posse-werk. */
  if (window.Online && Online.identiteit()) {
    const payload = { dag, score: totaal, held: S.held, diepte: S.verdieping || 0, gewonnen: !!gewonnen, seed: S.seed };
    Online.stuurScore(payload)
      .then(ok2 => {
        if (ok2) return true;
        /* geen verbinding? één eerlijke herkansing + duidelijkheid i.p.v. stilte (debug-sweep) */
        melding('📡 Score kon niet naar het syndicaat — nog één poging…');
        return new Promise(r => setTimeout(() => r(Online.stuurScore(payload)), 2600))
          .then(ok3 => { if (!ok3) melding('📡 Niet gelukt — je score telt lokaal, maar het dagbord mist haar.'); return ok3; });
      })
      .then(ok => { if (ok) melding(Online.isLid() ? '🔥 Je score staat op het syndicaats- én wereldbord.' : '🌍 Je score staat op het wereldbord.'); });
    if (Online.isLid() && INST.autoPor) autoPorNaDaily(dag, totaal);
    /* DE NALATENSCHAP: val je in de daily, dan reist je beste kaart naar de
       volgende genoot die afdaalt (best-effort; kolom = SQL 1g) */
    if (!gewonnen && Online.isLid()) {
      const na = nalatenschapKaart();
      if (na) Online.stuurNalatenschap(dag, na);
    }
  }
  return { totaal, reeks: Daily.reeks, besteReeks: Daily.besteReeks, nieuweTop };
}
/* na je eigen daily: elke genoot die vandaag nog niet afdaalde krijgt een por.
   Bewust ná je eigen afdaling — je stoeft mét je score. Anti-spam: 1×/dag/koppel. */
async function autoPorNaDaily(dag, score) {
  try {
    const [leden, top] = await Promise.all([Online.leden(), Online.dagTop(dag)]);
    if (!Array.isArray(leden)) return;   /* sociale tabellen bestaan nog niet */
    const gespeeld = {}; (top || []).forEach(r => { gespeeld[r.naam] = true; });
    const ik = Online.lid().naam;
    const doelen = leden.filter(l => l.naam !== ik && !gespeeld[l.naam]);
    if (!doelen.length) return;
    doelen.forEach(l => Online.stuurPor(l.naam, dag, `Ik daalde net af (${score} pt). Jouw beurt — of geef je op?`));
    setTimeout(() => melding(`📣 Auto-por: ${doelen.length} genoot${doelen.length === 1 ? '' : 'en'} uitgedaagd.`), 1600);
  } catch (e) {}
}
/* ---------- DE UITNODIGINGSLINK: ?syndicaat=CODE&van=NAAM ----------
   Eén link doet alles (playtest: "als leek is dit een raadsel"): wie het spel
   al heeft wordt met één tik + strijdnaam lid; wie het nog niet heeft krijgt
   via dezelfde link meteen het spel (PWA) én de uitnodiging. Niemand typt
   ooit nog een code over. */
function checkSyndicaatUitnodiging() {
  if (!window.Online || !Online.actief()) return;
  let code = null, van = null;
  try {
    const p = new URLSearchParams(location.search);
    code = Online.normCode(p.get('syndicaat') || '');
    van = (p.get('van') || '').slice(0, 20);
  } catch (e) {}
  if (!code) return;
  /* de parameter is afgehandeld: schoon de URL zodat een reload niet opnieuw vraagt */
  const wisParam = () => { try { history.replaceState({}, '', location.pathname); } catch (e) {} };
  if (Online.isLid() && Online.lid().code === code) {
    melding(`⚔️ Je vecht al onder ${code}.`);
    wisParam();
    return;
  }
  toonUitnodiging(code, van, wisParam);
}
function toonUitnodiging(code, van, klaar) {
  const oud = document.getElementById('syn-uitnodiging'); if (oud) oud.remove();
  const alLid = Online.isLid() ? Online.lid() : null;
  const vanRegel = van ? `<b>${escSyn(van)}</b> roept je bij het syndicaat` : 'Je bent geroepen bij het syndicaat';
  const el = document.createElement('div');
  el.id = 'syn-uitnodiging';
  el.className = 'overlay open';   /* .overlay start display:none — 'open' toont hem */
  el.innerHTML = `
    <div class="uitn-kaart">
      <div class="uitn-vlam">🔥</div>
      <h2 class="scherm-titel">Een uitnodiging</h2>
      <p class="uitn-regel">${vanRegel} <span class="syn-codechip">${escSyn(code)}</span>.<br>
      Elke dagelijkse afdaling telt mee op jullie gezamenlijke bord — wie durft, stoeft.</p>
      ${alLid ? `<p class="uitn-waarschuwing">⚠️ Je verlaat daarmee je huidige syndicaat <b>${escSyn(alLid.code)}</b>.</p>` : ''}
      <div class="uitn-formulier">
        <input id="uitn-naam" maxlength="20" placeholder="Je strijdnaam…" value="${alLid ? escSyn(alLid.naam) : ''}">
        <button class="knop-groot" id="uitn-join">⚔️ Sluit je aan</button>
      </div>
      <button class="knop-stil uitn-later" onclick="document.getElementById('syn-uitnodiging').remove()">Nee, later</button>
    </div>`;
  document.body.appendChild(el);
  /* de code via een closure i.p.v. een inline onclick-string (bugklasse: backslash-verminking) */
  el.querySelector('#uitn-join').onclick = () => doeUitnodigingJoin(code);
  el._klaar = klaar || null;
  setTimeout(() => { const i = document.getElementById('uitn-naam'); if (i && !i.value) i.focus(); }, 250);
  Klank.sfx('schitter');
}
function doeUitnodigingJoin(code) {
  const el = document.getElementById('syn-uitnodiging');
  const naam = Online.normNaam((document.getElementById('uitn-naam') || {}).value || '');
  if (!naam) { melding('Kies eerst een strijdnaam.'); return; }
  if (!Online.wordLid(naam, code)) { melding('Dat lukte niet — probeer een andere naam.'); return; }
  Online.meldAan();
  if (el) { if (el._klaar) el._klaar(); el.remove(); }
  Klank.sfx('schitter');
  melding(`🔥 Welkom bij ${code}, ${naam} — je volgende dagelijkse afdaling telt mee!`);
  setTimeout(toonLeaderboard, 700);
}

/* ---------- DE RESET-LINK: ?reset=1 ----------
   De makkelijkste route om meerdere toestellen te resetten: open de link
   één keer per toestel. Wist (na bevestiging) alle voortgang op DIT toestel;
   instellingen, proloog-status en syndicaat-lidmaatschap blijven staan. */
function checkResetLink() {
  let wil = false;
  try { wil = new URLSearchParams(location.search).get('reset') === '1'; } catch (e) {}
  if (!wil) return;
  /* de parameter pas schonen ná de keuze: een sw-update-reload vlak na de boot
     mag de vraag niet opeten (de dialoog komt dan gewoon terug) */
  vraagVoortgangReset();
}
/* gedeeld door de reset-link én de knop in ⚙️ Instellingen */
function vraagVoortgangReset() {
  bevestig(
    `Dit wist op dit toestel <b>alle voortgang</b>: de lopende run, je dagelijkse scores en reeksen, en de hele Codex (runs, ontdekkingen, scherven, het Schrijn, gesmede kaarten).<br><br>Instellingen, de proloog en je syndicaat-lidmaatschap blijven staan. <b>Dit kan niet ongedaan worden gemaakt.</b>`,
    () => {
      [SAVE_SLEUTEL, DAILY_SLEUTEL, CODEX_SLEUTEL, 'slayit_porren_gezien'].forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
      location.replace(location.pathname);   /* vers booten, zonder parameter */
    },
    '🧹 Wis mijn voortgang'
  );
}

/* por-inbox: bij het opstarten checken of iemand jou vandaag heeft gepord */
async function checkPorInbox() {
  if (!window.Online || !Online.isLid()) return;
  Online.meldAan();
  try {
    const dag = vandaagSleutel();
    const porren = await Online.mijnPorren(dag);
    if (!Array.isArray(porren) || !porren.length) return;
    /* de gezien-set is DAG-GESCOPET: de oude vorm ({id:1, …}) groeide
       onbeperkt (±72 KB na een jaar porren) omdat er nooit iets uit ging.
       We bewaren nu alleen de id's van vandaag — de query is toch per dag. */
    let bak = {};
    try { bak = JSON.parse(localStorage.getItem('slayit_porren_gezien') || '{}'); } catch (e) {}
    const gezien = (bak && bak.dag === dag && bak.ids && typeof bak.ids === 'object') ? bak.ids : {};
    const nieuw = porren.filter(p => p && p.id && !gezien[p.id]);
    if (!nieuw.length) return;
    const alGespeeld = Daily.laatsteVoltooid === dag;
    const vanNamen = [...new Set(nieuw.map(p => escSyn(p.van)))];
    if (!alGespeeld) {
      const wie = vanNamen.length > 1 ? `${vanNamen.length} syndicaatsgenoten porren` : `${vanNamen[0]} port`;
      setTimeout(() => melding(`📣 ${wie} je: doe je dagelijkse afdaling! 🗓️`), 1800);
    }
    nieuw.forEach(p => { gezien[p.id] = 1; });
    try { localStorage.setItem('slayit_porren_gezien', JSON.stringify({ dag, ids: gezien })); } catch (e) {}
  } catch (e) {}
}

/* ============================================================
   HET LEADERBOARD (lokaal) — jouw dagelijkse scores + beste runs op dit
   toestel, met een deelbare scoreregel. (Een écht online bord vraagt een
   backend — zie de monetisatie-route; dit is de eerlijke eerste trap.)
   ============================================================ */
function toonLeaderboard() {
  const dailies = (Daily.gesch || []).slice().sort((a, b) => b.score - a.score);
  const dailyRijen = dailies.slice(0, 10).map((g, i) => `
    <div class="lb-rij ${i === 0 ? 'lb-top' : ''}">
      <span class="lb-rang">${['🥇', '🥈', '🥉'][i] || (i + 1) + '.'}</span>
      <b>${g.score}</b>
      <span>${g.gewonnen ? '👑' : '💀'} ${HELDNAAM(g.held || 'slachter')} · rij ${g.diepte}</span>
      <small>${g.dag}</small>
    </div>`).join('') || '<p class="lb-leeg">Nog geen dagelijkse afdalingen — de diepte wacht.</p>';
  const runs = (Codex.gesch || []).slice(0, 10).map(g => `
    <div class="lb-rij">
      <span class="lb-rang">${g.gewonnen ? '👑' : '💀'}</span>
      <b>rij ${g.diepte}</b>
      <span>${HELDNAAM(g.held)}${g.asc ? ` · A${g.asc}` : ''}</span>
      <small>${g.seed}</small>
    </div>`).join('') || '<p class="lb-leeg">Nog geen runs geregistreerd.</p>';
  const besteHelden = Object.entries(Codex.bestDiepte || {}).map(([h, d]) => `${HELDNAAM(h)}: rij ${d}`).join(' · ');
  let ov = document.getElementById('overlay-leaderboard');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'overlay-leaderboard';
    ov.className = 'overlay';
    document.body.appendChild(ov);
  }
  const wetVandaag = DAGWETTEN[wetVanDag()];
  ov.innerHTML = `
    <h2 class="scherm-titel">🏆 Het Leaderboard</h2>
    <p class="lb-vandaag" data-tip="${wetVandaag.kort}">${wetVandaag.icoon} Vandaag geldt <b>${wetVandaag.naam}</b> · held van de dag: ${SPELERS[heldVanDag()].naam}</p>
    ${!dailyAlGespeeld() ? `<button class="knop-groot lb-daily-cta" onclick="document.getElementById('overlay-leaderboard').classList.remove('open'); startDaily();">⚔️ Daal vandaag nog af — ${wetVandaag.icoon} ${wetVandaag.naam} wacht</button>` : ''}
    ${synSectieHtml()}
    ${wereldSectieHtml()}
    <div class="lb-kolommen">
      <div class="lb-kolom">
        <h3 class="codex-kop">🗓️ Dit toestel <small>beste ${Math.min(10, dailies.length)} · reeks ${Daily.reeks || 0} · beste reeks ${Daily.besteReeks || 0}</small></h3>
        ${dailyRijen}
      </div>
      <div class="lb-kolom">
        <h3 class="codex-kop">⚔️ Laatste runs</h3>
        ${runs}
        ${besteHelden ? `<p class="lb-records">🏔️ Diepterecords — ${besteHelden}</p>` : ''}
      </div>
    </div>
    <p class="lb-voet">${window.Online && Online.isLid() ? 'Het syndicaat ziet alles. Stoef verstandig.' : 'Scores leven op dít toestel. Deel je beste dag met de kopieerknop en daag je vrienden uit met dezelfde seed.'}</p>
    <div class="einde-knoppen">
      ${dailies.length ? `<button class="knop-stil" onclick="kopieerLeaderboardScore()">📋 Deel je topscore</button>` : ''}
      <button class="knop-groot" onclick="document.getElementById('overlay-leaderboard').classList.remove('open')">Sluiten</button>
    </div>`;
  ov.classList.add('open');
  /* één delegated handler voor alle por-knoppen (de namen zitten in
     data-por, niet in een inline JS-string — zie porKlik) */
  if (!ov._porHaak) {
    ov._porHaak = true;
    ov.addEventListener('click', e => {
      const k = e.target.closest && e.target.closest('.syn-por-knop[data-por]');
      if (k && !k.disabled) porKlik(k);
    });
  }
  if (window.Online && Online.isLid()) vulSyndicaat();
  if (window.Online && Online.actief()) vulWereldbord();   /* iedereen mag kijken */
  checkPorInbox();   /* verse porren ook zien als de app al openstond (gezien-set dedupet) */
  Klank.sfx('klik');
}

/* ---------- HET WERELDBORD: alle posses en zwervers samen ----------
   Dag-klassement (iedereen speelt dezelfde wet + seed = eerlijke wedstrijd)
   + aller tijden (beste dag per speler, client-side gededupt). Spelers
   zonder posse kunnen als ZWERVER meedoen: alleen een strijdnaam kiezen. */
function wereldSectieHtml() {
  if (!(window.Online && Online.actief())) return '';
  const ik = Online.identiteit();
  const intro = ik
    ? `Je vecht als <b>${escSyn(ik.naam)}</b>${Online.isLid() ? ` van <span class="syn-codechip">${escSyn(ik.code)}</span>` : ' <small>(zwerver — zonder posse)</small>'}.`
    : 'Je scores blijven nu op dit toestel. Kies een strijdnaam en je telt wereldwijd mee — een posse is niet verplicht.';
  const zwerverForm = ik ? '' : `
    <div class="wb-zwerver">
      <input id="wb-naam" maxlength="20" placeholder="Je strijdnaam…" autocomplete="off">
      <button class="knop-stil" onclick="doeZwerverJoin()">🥾 Sta op het wereldbord</button>
    </div>`;
  return `<div class="wb-vak">
    <h3 class="codex-kop">🌍 De hele diepte <small>alle posses en zwervers samen</small></h3>
    <p class="wb-intro">${intro}</p>
    ${zwerverForm}
    <div id="wb-inhoud"><p class="syn-laadt">De diepte telt de gevallenen…</p></div>
  </div>`;
}
function wereldRij(r, i, metDag) {
  const ik = Online.identiteit();
  const eigen = ik && r.naam === ik.naam && r.groep === ik.code;
  const posse = /^ZW-/.test(r.groep || '')
    ? '<small class="wb-zw" data-tip="een zwerver — vecht zonder posse">🥾</small>'
    : `<small class="wb-posse">${escSyn(r.groep || '')}</small>`;
  return `<div class="lb-rij wb-rij ${eigen ? 'wb-eigen' : ''} ${i === 0 ? 'lb-top' : ''}">
    <span class="lb-rang">${['🥇', '🥈', '🥉'][i] || (i + 1) + '.'}</span>
    <b>${r.score | 0}</b>
    <span>${r.gewonnen ? '👑' : '💀'} ${escSyn(r.naam)} ${posse}</span>
    <small>${metDag ? escSyn(r.dag || '') : escSyn(HELDNAAM(r.held || 'slachter'))}</small>
  </div>`;
}
async function vulWereldbord() {
  const el = document.getElementById('wb-inhoud');
  if (!el) return;
  try {
    const dag = vandaagSleutel();
    const [vandaag, ooit] = await Promise.all([Online.wereldDag(dag), Online.wereldOoit()]);
    if (!document.getElementById('wb-inhoud')) return;   /* overlay intussen dicht */
    const dagRijen = (vandaag || []).slice(0, 10).map((r, i) => wereldRij(r, i, false)).join('')
      || '<p class="lb-leeg">Vandaag daalde nog niemand af — pak de wereldkroon. 👑</p>';
    const ooitRijen = (ooit || []).slice(0, 10).map((r, i) => wereldRij(r, i, true)).join('')
      || '<p class="lb-leeg">Nog geen scores. De diepte wacht op de eerste.</p>';
    el.innerHTML = `<div class="lb-kolommen">
      <div class="lb-kolom"><h4>🗓️ Vandaag <small>zelfde wet, zelfde seed — eerlijke strijd</small></h4>${dagRijen}</div>
      <div class="lb-kolom"><h4>🏛️ Aller tijden <small>beste dag per speler</small></h4>${ooitRijen}</div>
    </div>`;
  } catch (e) {
    if (el) el.innerHTML = '<p class="lb-leeg">⚠️ De diepte is onbereikbaar (offline?). Je lokale bord hieronder werkt gewoon.</p>';
  }
}
/* zwerver worden: naam kiezen volstaat. Speelde je vandaag al? Dan gaat die
   score meteen retroactief het wereldbord op. */
function doeZwerverJoin() {
  const z = Online.wordZwerver((document.getElementById('wb-naam') || {}).value || '');
  if (!z) { melding('Kies eerst een strijdnaam.'); return; }
  Klank.sfx('schitter');
  melding(`🥾 ${z.naam} — vanaf nu tel je wereldwijd mee.`);
  const dag = vandaagSleutel();
  if (Daily.laatsteVoltooid === dag && (Daily.laatsteScore || 0) > 0) {
    const g = (Daily.gesch || []).find(x => x.dag === dag) || {};
    Online.stuurScore({ dag, score: Daily.laatsteScore, held: g.held || 'slachter', diepte: g.diepte || 0, gewonnen: !!g.gewonnen, seed: dagSeed(dag) })
      .then(ok => { if (ok) setTimeout(() => melding('🔥 Je score van vandaag staat er meteen op.'), 900); vulWereldbord(); });
  }
  toonLeaderboard();
}

/* ============================================================
   HET SYNDICAAT — de sociale laag van het leaderboard (js/online.js).
   Vrienden stichten een syndicaat met een code, stoefen op het
   dagpodium en dagen elkaar uit met een strijdkreet.
   ============================================================ */
/* remote strings komen van andere spelers → ALTIJD escapen vóór innerHTML */
function escSyn(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function synSectieHtml() {
  if (!window.Online || !Online.actief()) return '';
  if (!Online.isLid()) {
    return `<div class="syn-vak syn-join">
      <h3 class="codex-kop">🔥 Het Syndicaat <small>het onderlinge verzet — stoef met je vrienden</small></h3>
      <p class="syn-uitleg">Sticht een syndicaat en deel de code, of sluit je aan bij dat van je vrienden. Elke dagelijkse afdaling telt mee op jullie gezamenlijke podium.</p>
      <div class="syn-formulier">
        <input id="syn-naam" maxlength="20" placeholder="Je strijdnaam…" autocomplete="off">
        <span class="syn-code-rij">
          <input id="syn-code" maxlength="24" placeholder="Syndicaat-code…" autocomplete="off">
          <button class="knop-stil" data-tip="Verzin een verse code — deel hem daarna met je vrienden" onclick="document.getElementById('syn-code').value = Online.verzinCode()">🎲</button>
        </span>
        <button class="knop-groot" onclick="doeSynJoin()">⚔️ Sluit je aan</button>
      </div>
      <p class="syn-leek-hint">💡 Makkelijker: kreeg je een <b>uitnodigingslink</b> van een vriend? Tik die gewoon aan — naam kiezen en klaar, geen code nodig.</p>
    </div>`;
  }
  const l = Online.lid();
  return `<div class="syn-vak">
    <h3 class="codex-kop">🔥 Het Syndicaat <small>⚔️ ${escSyn(l.naam)}
      <button class="syn-hernoem" onclick="vraagHernoem()" data-tip="Wijzig je strijdnaam — je scores en geschiedenis verhuizen mee">✏️</button>
      · code <b class="syn-codechip" data-tip="Deel deze code — wie hem invoert, vecht op jullie bord">${escSyn(l.code)}</b></small></h3>
    <div id="syn-inhoud"><p class="syn-laadt">De duiven zijn onderweg…</p></div>
    <div class="syn-knoppen">
      <button class="knop-groot" onclick="deelSyndicaat()">📣 Nodig vrienden uit</button>
      <button class="knop-stil" onclick="kopieerStrijdkreet()">📋 Kopieer de code</button>
      <label class="syn-autopor" data-tip="Na je eigen dagelijkse afdaling porren we automatisch iedereen die nog niet speelde.">
        <input type="checkbox" ${INST.autoPor ? 'checked' : ''} onchange="INST.autoPor = this.checked; bewaarInst(); melding(this.checked ? '📣 Auto-por aan.' : 'Auto-por uit.');"> auto-por na mijn afdaling
      </label>
      <button class="knop-stil syn-verlaat" onclick="synVerlaat()">Verlaat</button>
    </div>
  </div>`;
}

/* je strijdnaam wijzigen ZONDER een spook achter te laten: alle scores,
   porren en je lidmaatschap verhuizen mee naar de nieuwe naam. (Vroeger kon
   je alleen verlaten + opnieuw joinen — dat maakte je tot een tweede speler
   met een lege geschiedenis, en je oude naam bleef als eeuwige achterblijver
   in de ledenlijst hangen.) */
function vraagHernoem() {
  if (!(window.Online && Online.identiteit())) return;
  const huidig = Online.identiteit().naam;
  const ov = document.createElement('div');
  ov.className = 'overlay open';
  ov.id = 'hernoem-overlay';
  ov.innerHTML = `<div class="uitn-kaart">
      <div class="uitn-vlam">✏️</div>
      <h2 class="scherm-titel">Nieuwe strijdnaam</h2>
      <p class="uitn-regel">Je vecht nu als <b>${escSyn(huidig)}</b>.<br>
      Je scores, je grafschriften en je plek op het bord <b>verhuizen mee</b> — je blijft dezelfde strijder.</p>
      <div class="uitn-formulier">
        <input id="hernoem-naam" maxlength="20" placeholder="Je nieuwe strijdnaam…" value="${escSyn(huidig)}">
        <button class="knop-groot" id="hernoem-ok" onclick="doeHernoem()">✏️ Wijzig mijn naam</button>
      </div>
      <button class="knop-stil uitn-later" onclick="document.getElementById('hernoem-overlay').remove()">Toch niet</button>
    </div>`;
  document.body.appendChild(ov);
  setTimeout(() => { const i = document.getElementById('hernoem-naam'); if (i) { i.focus(); i.select(); } }, 200);
  Klank.sfx('klik');
}
function doeHernoem() {
  const veld = document.getElementById('hernoem-naam');
  const knop = document.getElementById('hernoem-ok');
  const nieuw = (veld && veld.value || '').trim();
  if (!nieuw) { melding('Kies eerst een naam.'); return; }
  if (nieuw === Online.identiteit().naam) { document.getElementById('hernoem-overlay').remove(); return; }
  if (knop) { knop.disabled = true; knop.textContent = '⏳ verhuizen…'; }
  Online.hernoem(nieuw).then(r => {
    const ov = document.getElementById('hernoem-overlay');
    if (r === true) {
      if (ov) ov.remove();
      melding(`✏️ Je heet nu ${Online.identiteit().naam} — je geschiedenis verhuisde mee.`);
      Klank.sfx('schitter');
      toonLeaderboard();
    } else if (r === 'bezet') {
      if (knop) { knop.disabled = false; knop.textContent = '✏️ Wijzig mijn naam'; }
      melding('Die naam is al van een genoot in dit syndicaat — kies een andere.');
    } else {
      if (knop) { knop.disabled = false; knop.textContent = '✏️ Wijzig mijn naam'; }
      melding('Naam wijzigen lukte niet (offline?). Je oude naam blijft gewoon geldig.');
    }
  });
}

function doeSynJoin() {
  const naam = (document.getElementById('syn-naam') || {}).value;
  const code = (document.getElementById('syn-code') || {}).value;
  const l = Online.wordLid(naam, code);
  if (!l) { melding('⚠️ Kies een strijdnaam én een code van minstens 3 tekens.'); return; }
  melding(`🔥 Welkom bij syndicaat ${l.code}, ${l.naam}. Deel de code — en laat ze bloeden.`);
  Klank.sfx('schitter');
  toonLeaderboard();
}
function synVerlaat() {
  if (!(window.Online && Online.isLid())) return;   /* geen lid → niets te verlaten (las anders lid.code van null) */
  /* wie alleen een andere naam wil, moet NIET verlaten — dat maakte een tweede
     speler met een lege geschiedenis en liet de oude naam als spook in de
     ledenlijst achter. Wijs expliciet de ✏️-route aan vóór het weggaan. */
  bevestig(
    `Je verlaat <b>${escSyn(Online.lid().code)}</b> als <b>${escSyn(Online.lid().naam)}</b>.<br><br>Je scores blijven op het bord staan onder je huidige naam.<br><br><i>Wou je enkel een andere strijdnaam? Sluit dit en gebruik het ✏️ naast je naam — dan verhuist je geschiedenis mee.</i>`,
    () => {
      Online.verlaat();
      melding('Je verliet het syndicaat. De code blijft werken voor wie blijft.');
      toonLeaderboard();
    },
    '🚪 Toch verlaten'
  );
}
/* de deep-link die alles doet: spel openen/installeren ÉN meteen de
   uitnodiging tonen (?syndicaat=CODE&van=NAAM → checkSyndicaatUitnodiging) */
function syndicaatLink() {
  const l = Online.lid(); if (!l) return 'https://teamict-codex.github.io/slay-lit/';
  return `https://teamict-codex.github.io/slay-lit/?syndicaat=${encodeURIComponent(l.code)}&van=${encodeURIComponent(l.naam)}`;
}
function syndicaatUitnodiging() {
  const l = Online.lid(); if (!l) return '';
  const top = (Daily.gesch || []).slice().sort((a, b) => b.score - a.score)[0];
  const scoreDeel = top ? ` Mijn beste dag: ${top.score} punten.` : '';
  return `⚔️ SLAY LIT — sluit je aan bij mijn syndicaat "${l.code}".${scoreDeel} Eén tik en je staat op ons bord (nog geen SLAY LIT? De link opent meteen het spel): ${syndicaatLink()}`;
}
function kopieerStrijdkreet() {
  const tekst = syndicaatUitnodiging(); if (!tekst) return;
  try { navigator.clipboard.writeText(tekst); melding('📋 Code + uitnodiging gekopieerd — plak en provoceer!'); }
  catch (e) { melding('Kopiëren lukte niet: ' + tekst); }
}
/* vrienden toevoegen = de code delen. Op mobiel opent dit de deel-sheet
   (WhatsApp/SMS/…); op laptop valt het terug op kopiëren. */
function deelSyndicaat() {
  const tekst = syndicaatUitnodiging(); if (!tekst) return;
  if (navigator.share) {
    navigator.share({ title: 'SLAY LIT — Het Syndicaat', text: tekst }).catch(() => {});
  } else {
    kopieerStrijdkreet();
  }
}

/* een wapenfeit → een stoef-regel (het sociale hart: laat ze elkaar jennen).
   Een achtergelaten grafschrift (kolom 'boodschap') spreekt mee in de feed. */
function synStoefRegel(r) {
  const n = escSyn(r.naam);
  const graf = (!r.gewonnen && r.boodschap) ? ` ⚰️ „${escSyn(String(r.boodschap).slice(0, 90))}"` : '';
  if (r.gewonnen) return kiesUit([
    `👑 ${n} onthoofdde de DICKtator — ${r.score} punten. Buig.`,
    `👑 ${n} liep de outro binnen met ${r.score} punten. Applaus is verplicht.`,
    `👑 ${n} won. Alweer. ${r.score} punten. Irritant, hè.`
  ]);
  if ((r.diepte || 0) >= 10) return kiesUit([
    `⚔️ ${n} vocht tot rij ${r.diepte} — ${r.score} punten. Respect.`,
    `⚔️ ${n} kwam tot rij ${r.diepte} (${r.score} pt). Zó dichtbij.`
  ]) + graf;
  return kiesUit([
    `💀 ${n} viel op rij ${r.diepte || 0} (${r.score} pt). De diepte lacht.`,
    `💀 ${n} — rij ${r.diepte || 0}, ${r.score} punten. Morgen beter?`
  ]) + graf;
}

/* de ledenlijst-status leeft even in het geheugen zodat de por-knoppen weten
   wie er vandaag nog moet (en wie je al gepord hebt) */
let _synLeden = { dag: null, gespeeld: {}, gepord: {} };

async function vulSyndicaat() {
  const el = document.getElementById('syn-inhoud');
  if (!el) return;
  Online.meldAan();   /* jezelf als lid registreren + 'laatst gezien' verversen */
  try {
    const dag = vandaagSleutel();
    const [vandaag, ooit, recent, leden, gesch] = await Promise.all([Online.dagTop(dag), Online.allerTijden(), Online.feed(), Online.leden().catch(() => null), Online.groepGeschiedenis(laatsteDagen(30)).catch(() => null)]);
    if (!document.getElementById('syn-inhoud')) return;   /* overlay intussen dicht */
    /* wie speelde vandaag al? (kruis de dag-scores tegen de ledenlijst) */
    const gespeeldVandaag = {};
    (vandaag || []).forEach(r => { gespeeldVandaag[r.naam] = r; });
    _synLeden = { dag, gespeeld: gespeeldVandaag, gepord: _synLeden.dag === dag ? _synLeden.gepord : {} };
    const ledenBlok = ledenlijstHtml(leden, gespeeldVandaag, dag);
    const podium = (vandaag || []).slice(0, 3);
    const rest = (vandaag || []).slice(3);
    const treden = [1, 0, 2].map(i => {
      const r = podium[i];
      if (!r) return `<div class="syn-trede syn-leeg p${i + 1}"><span class="syn-vraag">?</span><small>vrij</small></div>`;
      return `<div class="syn-trede p${i + 1}">
        <span class="syn-kroon">${['🥇', '🥈', '🥉'][i]}</span>
        <b class="syn-naam">${escSyn(r.naam)}</b>
        <span class="syn-score">${r.score | 0}</span>
        <small>${r.gewonnen ? '👑 won' : 'rij ' + (r.diepte | 0)} · ${HELDNAAM(escSyn(r.held))}</small>
      </div>`;
    }).join('');
    const restRijen = rest.map((r, i) => `<div class="lb-rij"><span class="lb-rang">${i + 4}.</span><b>${r.score | 0}</b><span>${escSyn(r.naam)}</span><small>${r.gewonnen ? '👑' : 'rij ' + (r.diepte | 0)}</small></div>`).join('');
    const ooitRijen = (ooit || []).slice(0, 5).map((r, i) => `<div class="lb-rij ${i === 0 ? 'lb-top' : ''}"><span class="lb-rang">${['🥇', '🥈', '🥉'][i] || (i + 1) + '.'}</span><b>${r.score | 0}</b><span>${escSyn(r.naam)}</span><small>${escSyn(r.dag)}</small></div>`).join('') || '<p class="lb-leeg">Nog geen scores — wees de eerste.</p>';
    const stoef = (recent || []).slice(0, 5).map(r => `<p class="syn-stoef">${synStoefRegel(r)}</p>`).join('') || '<p class="lb-leeg">Nog geen wapenfeiten. Iemand moet de eerste zijn…</p>';
    /* DE EEUWIGE VLAM: de posse-reeks als bandje boven het podium */
    let vlamHtml = '';
    if (Array.isArray(gesch)) {
      const v = vlamReeks(gesch);
      vlamHtml = v.reeks === 0
        ? `<div class="syn-vlam vlam-uit">🕯️ <b>De Eeuwige Vlam</b> is gedoofd — de eerste afdaling van vandaag herontsteekt haar.</div>`
        : v.vandaagGedekt
          ? `<div class="syn-vlam">🔥 <b>De Eeuwige Vlam</b> brandt <b>${v.reeks >= 60 ? '60+' : v.reeks}</b> ${v.reeks === 1 ? 'dag' : 'dagen'} — vandaag al gered.</div>`
          : `<div class="syn-vlam vlam-flakkert">🔥 <b>De Eeuwige Vlam</b> brandt ${v.reeks} ${v.reeks === 1 ? 'dag' : 'dagen'} — maar <b>flakkert</b>: nog niemand daalde vandaag af!</div>`;
    }
    /* HET DUELDECREET: dag-seeded duo's + weekstand uit de geschiedenis */
    let duelHtml = '';
    if (Array.isArray(leden) && leden.length >= 2) {
      const namen = leden.map(l => l.naam);
      const code = Online.lid().code;
      const { paren, vrijgesteld } = duelParen(namen, dag, code);
      const duelRijen = paren.map(([a, b]) => {
        const sa = gespeeldVandaag[a] ? gespeeldVandaag[a].score | 0 : null;
        const sb = gespeeldVandaag[b] ? gespeeldVandaag[b].score | 0 : null;
        const leidt = (sa !== null || sb !== null) ? ((sa || 0) >= (sb || 0) ? a : b) : null;
        const kant = (n, s) => `<span class="duel-kant ${leidt === n ? 'duel-leidt' : ''}">${escSyn(n)} <b>${s === null ? '—' : s}</b></span>`;
        return `<div class="duel-rij">${kant(a, sa)}<span class="duel-vs">⚔️</span>${kant(b, sb)}</div>`;
      }).join('');
      /* weekstand: wins tellen over de laatste 7 dagen (alleen dagen waarop
         beide duellisten een score hadden; paren gereconstrueerd met de
         ledenlijst van nú — goed genoeg op vriendenschaal) */
      const wins = {};
      if (Array.isArray(gesch)) {
        laatsteDagen(7).slice(1).forEach(d7 => {
          const scoresDag = {};
          gesch.filter(r => r.dag === d7).forEach(r => { scoresDag[r.naam] = r.score | 0; });
          duelParen(namen, d7, code).paren.forEach(([a, b]) => {
            if (scoresDag[a] === undefined || scoresDag[b] === undefined) return;
            const w = scoresDag[a] >= scoresDag[b] ? a : b;
            wins[w] = (wins[w] || 0) + 1;
          });
        });
      }
      const stand = Object.entries(wins).sort((a, b) => b[1] - a[1]).slice(0, 3)
        .map(([n, w]) => `${escSyn(n)} ${w}`).join(' · ');
      duelHtml = `<div class="syn-duel"><h4>⚔️ Het Dueldecreet van vandaag</h4>${duelRijen}
        ${vrijgesteld ? `<p class="duel-vrij">${escSyn(vrijgesteld)} is vandaag vrijgesteld van het decreet.</p>` : ''}
        ${stand ? `<p class="duel-stand">Weekstand: ${stand}</p>` : ''}</div>`;
    }
    el.innerHTML = `
      ${vlamHtml}
      <div class="syn-podium">${treden}</div>
      ${podium.length === 0 ? '<p class="syn-podium-leeg">Het podium van vandaag staat leeg — de eerste afdaling pakt goud. 🥇</p>' : ''}
      ${restRijen}
      ${duelHtml}
      ${ledenBlok}
      <div class="syn-onder">
        <div class="syn-kolom"><h4>🏛️ Aller tijden</h4>${ooitRijen}</div>
        <div class="syn-kolom"><h4>📣 Het gestoef</h4>${stoef}</div>
      </div>`;
  } catch (e) {
    if (el) el.innerHTML = '<p class="lb-leeg">⚠️ Het syndicaat is onbereikbaar (offline?). Je lokale bord hieronder werkt gewoon.</p>';
  }
}

/* de ledenlijst: wie zit erin, wie speelde vandaag al (✅) en wie lummelt nog
   (⏳ — met een por-knop). leden==null → de sociale tabellen bestaan nog niet
   (SQL deel 1b), dan tonen we een korte hint i.p.v. de lijst. */
function ledenlijstHtml(leden, gespeeld, dag) {
  if (!Array.isArray(leden)) {
    return `<div class="syn-leden syn-leden-uit"><h4>👥 Ledenlijst</h4>
      <p class="lb-leeg">Zet de sociale laag aan: draai <b>deel 1b</b> van de SQL (leden + porren) uit SUPABASE-SETUP.md.</p></div>`;
  }
  const ik = Online.lid().naam;
  /* achterblijvers bovenaan (die kun je porren), dan wie al speelde */
  const gesorteerd = leden.slice().sort((a, b) => (!!gespeeld[a.naam]) - (!!gespeeld[b.naam]));
  const achterblijvers = leden.filter(l => l.naam !== ik && !gespeeld[l.naam]).map(l => l.naam);
  const rijen = gesorteerd.map(l => {
    const klaar = !!gespeeld[l.naam];
    const isIk = l.naam === ik;
    const alGepord = _synLeden.gepord[l.naam];
    /* de naam reist via een data-attribuut, NIET via een inline JS-string:
       een naam met een backslash porde anders de verkeerde persoon
       ("Pad\Naam" → "PadNaam") en een naam die op \ eindigt brak de knop
       volledig (SyntaxError → klik deed niets). Zie porKlik hieronder. */
    const knop = (!klaar && !isIk)
      ? `<button class="syn-por-knop ${alGepord ? 'gepord' : ''}" ${alGepord ? 'disabled' : ''} data-por="${escSyn(l.naam)}">${alGepord ? '✓ gepord' : '📣 Por'}</button>`
      : '';
    return `<div class="syn-lid ${klaar ? 'klaar' : 'wacht'}" data-lid="${escSyn(l.naam)}">
      <span class="syn-lid-status">${klaar ? '✅' : '⏳'}</span>
      <b>${escSyn(l.naam)}${isIk ? ' <small>(jij)</small>' : ''}</b>
      <span class="syn-lid-info">${klaar ? `${gespeeld[l.naam].score} pt · ${gespeeld[l.naam].gewonnen ? '👑' : 'rij ' + (gespeeld[l.naam].diepte | 0)}` : 'nog niet afgedaald'}</span>
      ${knop}
    </div>`;
  }).join('') || '<p class="lb-leeg">Nog niemand aangemeld. Deel de code!</p>';
  const porAllesKnop = achterblijvers.length
    ? `<button class="knop-stil syn-por-alle" onclick="porAchterblijvers()">📣 ${achterblijvers.length === 1 ? 'Por de achterblijver' : `Por alle ${achterblijvers.length} achterblijvers`}</button>`
    : '';
  return `<div class="syn-leden"><h4>👥 Ledenlijst <small>${leden.length} lid${leden.length === 1 ? '' : 'den'} · ✅ speelde vandaag</small></h4>
    ${rijen}
    ${porAllesKnop}</div>`;
}

/* klik-afhandeling voor de por-knoppen: de naam komt uit het data-attribuut
   (de DOM levert hem exact terug, ongeacht quotes/backslashes) */
function porKlik(knop) {
  const naam = knop && knop.dataset ? knop.dataset.por : '';
  if (!naam) return;
  knop.disabled = true; knop.textContent = '✓ gepord'; knop.classList.add('gepord');
  porLid(naam);
}
/* por één lid — schrijft een por naar de inbox (anti-spam: 1×/dag/koppel) */
function porLid(naam) {
  const dag = vandaagSleutel();
  const bericht = kiesUit([
    'De diepte roept. En ik sta al hoger dan jij.',
    'Vandaag nog niet afgedaald? De DICKtator lacht.',
    'Je plek op het podium koelt af. Doe je afdaling!',
    'Ik heb goud gepakt. Durf jij het te evenaren?'
  ]);
  _synLeden.gepord[naam] = true;
  Online.stuurPor(naam, dag, bericht).then(ok => {
    melding(ok ? `📣 ${naam} is gepord — nu maar hopen dat 'ie durft.` : `Kon ${naam} niet porren (offline?).`);
  });
  Klank.sfx('klik');
}
/* por iedereen die vandaag nog niet afdaalde, in één klap */
function porAchterblijvers() {
  const dag = vandaagSleutel();
  const ik = Online.lid().naam;
  /* de achterblijvers = leden zonder score vandaag; de naam komt uit het
     data-attribuut (tekst uitlezen brak op namen met spaties/tekens) */
  const knoppen = [...document.querySelectorAll('.syn-lid.wacht')];
  let n = 0;
  knoppen.forEach(rij => {
    const naam = rij.dataset ? rij.dataset.lid : '';
    if (!naam || naam === ik || _synLeden.gespeeld[naam]) return;
    _synLeden.gepord[naam] = true;
    Online.stuurPor(naam, dag, 'Het hele syndicaat wacht. Doe je dagelijkse afdaling!');
    n++;
  });
  melding(n ? `📣 ${n} achterblijver${n === 1 ? '' : 's'} gepord. Geen excuses meer.` : 'Iedereen speelde al — knap syndicaat.');
  Klank.sfx('schitter');
  vulSyndicaat();
}
function kopieerLeaderboardScore() {
  const top = (Daily.gesch || []).slice().sort((a, b) => b.score - a.score)[0];
  if (!top) return;
  const tekst = `SLAY LIT 🗓️ ${top.dag} — ${top.score} punten (${top.gewonnen ? 'overwinning 👑' : 'rij ' + top.diepte} met ${HELDNAAM(top.held || 'slachter')}). Durf jij dieper?`;
  try { navigator.clipboard.writeText(tekst); melding('📋 Scoreregel gekopieerd — plak en daag uit!'); }
  catch (e) { melding('Kopiëren lukte niet — noteer hem ouderwets: ' + tekst); }
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
    kaart: null,               /* ná de S-toewijzing gegenereerd — anders leest huidigeAct() de act van de VORIGE run (review 27 aug) */
    pos: null,
    act: 1,
    verdieping: 0,
    gebruikteEvents: [],
    stats: { gevechten: 0, kaarten: 0, schade: 0 },
    uid: 0,
    gevecht: null,
    contractGebruikt: false,   /* Het Verlopen Contract: eenmalig-per-run dood-weigering */
    scherven: []           /* GEDRAGEN scherven deze run (inzet — kwijt bij dood; geplaatst bij de Drempel) */
  };
  S.kaart = genereerKaart();   /* nu pas: huidigeAct() leest S.act = 1 van DEZE run */
  held.dek.forEach(id => S.dek.push(nieuweKaart(id)));

  /* HET SLACHTBLOK: de gesmede kaart reist alleen mee als je haar KIEST op het
     heldkeuze-scherm (zoals het Schrijn) en ze nog ladingen heeft — elke inzet
     verbruikt er één van drie. Ze VERVANGT een startkaart (het basisdek groeit
     nooit). Niet op een daily (eerlijk veld). */
  const sbMaker = (!daily && slachtblokKeuzes.length)
    ? slachtblokKeuzes.find(mk => Codex.slachtblok && Codex.slachtblok[mk] && (Codex.slachtblok[mk].charges || 0) > 0)
    : null;
  if (sbMaker) {
    /* het ERFSTUK: gesmeed door één held, draagbaar door elke held die het aandurft
       (was held-gebonden; playtest 27 aug) */
    const spec = Codex.slachtblok[sbMaker];
    spec.charges -= 1;
    bewaarCodex();
    const gid = 'gesmeed_codex_' + sbMaker;
    registreerGesmeed(gid, spec);
    const idx = S.dek.findIndex(c => kdef(c).type !== 'vloek');   /* de eerste basiskaart sneuvelt */
    if (idx >= 0) S.dek.splice(idx, 1);
    S.dek.push(nieuweKaart(gid));
    const maker = spec.maker || sbMaker;
    /* de dramatische onthulling: het werk komt uit het Schrijn het licht in */
    setTimeout(() => toonKaartReveal(gid, {
      kop: `🪓 HET WERK VAN ${HELDNAAM(maker).toUpperCase()}`,
      klank: 'zwareklap',
      flavor: maker === heldId
        ? `„Gesmeed met eigen handen op het blok voor de troonzaal — nog ${spec.charges} lading${spec.charges === 1 ? '' : 'en'}."`
        : `„Gesmeed door ${HELDNAAM(maker)}, gedragen door ${HELDNAAM(heldId)}. Een wapen vraagt niet wíé het heft — nog ${spec.charges} lading${spec.charges === 1 ? '' : 'en'}."`
    }), 700);
  }
  slachtblokKeuzes = [];

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
  /* De Vergadering (vloek): zolang ze in je hand zit, kost je éérste kaart per
     beurt +1 — vóór de poster-regel, zodat de gratis eerste kaart gratis blijft */
  if (S.gevecht && !S.gevecht.kaartGespeeldDezeBeurt
      && S.gevecht.hand && S.gevecht.hand.some(k => k.id === 'de_vergadering')) kost += 1;
  /* De Overschreven Poster: het eerste woord is altijd gratis */
  if (heeftRelikwie('propagandaposter') && S.gevecht && !S.gevecht.posterGebruikt) kost = 0;
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
  d = glasDmg(d);   /* GLAZEN ZIELEN kleurt ook het kaartgetal mee */
  if (d > basis) return `<b class="plus">${d}</b>`;
  if (d < basis) return `<b class="min">${d}</b>`;
  return `${d}`;
}

/* null-veilig: wordt ook vóór een run aangeroepen (startdek bekijken) */
function heeftRelikwie(id) { return !!(S && S.relikwieen && S.relikwieen.includes(id)); }
function relikwieSchadeBonus() { return heeftRelikwie('stalen_vuist') ? 1 : 0; }
function drankSlots() { return heeftRelikwie('veldfles') ? 4 : 3; }   /* basis 3 (playtest); veldfles +1 → 4 */

/* stil=true onderdrukt de reveal-ceremonie: voor bronnen met een EIGEN ceremonie
   (de schatkist) en bulk-toekenningen bij runstart (Schrijn, daily-startrelikwieën). */
function geefRelikwie(id, vanSchrijn, stil) {
  const isNieuw = !S.relikwieen.includes(id);
  if (isNieuw) S.relikwieen.push(id);
  if (id === 'spaarvarken') geefGoud(100);
  if (id === 'bloedrobijn') { S.maxHp += 8; S.hp += 8; }
  if (id === 'het_grootboek') { S.maxHp += 12; S.hp += 12; }   /* Act 2: Het Grootboek */
  if (id === 'de_gouden_handdruk') {   /* Act 3: de afkoopsom — genereus en verminkend */
    geefGoud(120);
    S.maxHp = Math.max(1, S.maxHp - 8);
    if (S.hp > S.maxHp) S.hp = S.maxHp;
  }
  /* echt gevonden (niet uit het Schrijn meegenomen) = lading herladen */
  if (!vanSchrijn) laadSchrijnOp(id);
  renderTopbalk();
  /* de ceremonie — alleen bij een ECHT nieuwe vondst (een duplicaat-toekenning
     mag niet opnieuw het scherm vullen) en niet bij runstart-bulk/schatkist */
  if (isNieuw && !vanSchrijn && !stil) toonRelikwieReveal(id);
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

/* het werkelijke fakkelplafond: De Schaduwboekhouding (dek-vloek) klemt op 60 */
function fakkelMax() { return (S && S.dek && S.dek.some(c => c.id === 'de_schaduwboekhouding')) ? 60 : 100; }
function zetFakkel(delta) {
  const voor = lichtNiveau();
  /* HET DONKER KRUIPT (dagwet): elk lichtverlies telt dubbel */
  if (delta < 0 && dagwetActief('duister')) delta *= 2;
  /* Vonkenkluis: elke lichtwinst klettert er dubbel uit */
  if (delta > 0 && heeftRelikwie('vonkenkluis')) delta += 1;
  S.fakkel = Math.max(0, Math.min(fakkelMax(), S.fakkel + delta));
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
function baasUitspraken(id) {
  if (id === 'de_erfprins') return UITSPRAKEN._erfprins;
  if (id === 'de_dicktator') return UITSPRAKEN._dicktator;
  return UITSPRAKEN._baas;
}

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
  /* de METGEZEL heeft géén Vista-sprite — zijn DOM-figuur (.metgezel-art) ís het beeld,
     óók in 3D. Zonder deze uitzondering waren al zijn poses (incl. de Laatste Sprong-
     offer-cinematic) onzichtbaar zodra het 3D-toneel draaide. */
  if (!actor || (d3Actief() && !actor.isMetgezel) || !window.laadKarakterAfbeelding) return;
  const el = pose2DArtEl(actor); if (!el) return;
  const basis = actor.isSpeler ? huidigeHeld().art
    : (actor.isMetgezel ? METGEZELLEN[actor.id].art : actor.id);
  const lader = actor.isMetgezel && window.laadMetgezelAfbeelding ? laadMetgezelAfbeelding : laadKarakterAfbeelding;
  const t0 = Date.now();
  lader(basis + '_' + state, img => {
    /* GUARD (v89): komt de pose-art pas ná de beweging binnen (trage verbinding,
       ondanks preloadPoses2D), sla de wissel dan over — een aanvalspose die
       seconden te laat over het beeld klapt oogt kapot. Vastgehouden standen
       (block/death) mogen wél laat binnenkomen. */
    if (Date.now() - t0 > 400 && state !== 'block' && state !== 'death') return;
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

/* v89 (mobiele race): pose-art werd pas bij de éérste pose-wissel geladen — op een
   trage verbinding speelde de lunge-beweging eerst en klapte de aanvalspose er los
   overheen ("de vijand bewoog eerst en toonde de animatie pas later"). Alle poses
   van de aanwezige vechters voorladen bij de gevechtsstart maakt de wissel in
   pose2D een synchrone cache-hit; poses die niet bestaan vallen in de bestaande
   mislukt-TTL-cache (art.js) en kosten één stille 404 per stuk. */
function preloadPoses2D(g) {
  if (!window.laadKarakterAfbeelding) return;
  const stil = () => {};
  ['attack', 'cast', 'hit', 'block', 'death', 'victory'].forEach(s => laadKarakterAfbeelding(huidigeHeld().art + '_' + s, stil));
  g.vijanden.forEach(v => ['attack', 'cast', 'hit', 'block', 'death', 'gif'].forEach(s => laadKarakterAfbeelding(v.id + '_' + s, stil)));
  if (g.metgezel && window.laadMetgezelAfbeelding) {
    const mArt = METGEZELLEN[g.metgezel.id].art;
    ['attack', 'cast', 'hit', 'block', 'death', 'victory'].forEach(s => laadMetgezelAfbeelding(mArt + '_' + s, stil));
  }
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
  if (!actor || actor.dood) return;   /* een lijk vergiftig je niet — zijn kaats/counter raakte jou anders alsnog (debug-sweep) */
  if (!actor.isSpeler) {
    const gd = VIJANDEN[actor.id] || {};
    const lantaarn = heeftRelikwie('zielslantaarn');   /* De Zielslantaarn breekt alle gif-afweer */
    /* GIF-IMMUUN (sporen/inkt) — tenzij de Zielslantaarn de afweer breekt */
    if (!lantaarn && gd.gifImmuun) {
      fxNummer(actorEl(actor), '🚫 gif-immuun', 'fx-blok');
      if (window.Vista) Vista.pose(actor, 'gif', 0.8);
      pose2D(actor, 'gif', 0.8);   /* immuun-reactie-pose (2D + 3D): de sporen/inkt verteren het gif */
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
/* DE CENTRALE VLOEK-POORT: elke PERMANENTE vloek (dek-toevoeging) loopt hierlangs.
   Het Zondebokvel (Act 3) weigert de eerste per run. Geeft de kaartnaam terug,
   of null als het vel de vloek droeg. */
/* DE CENTRALE GOUD-POORT: elke goud-ONTVANGST loopt hierlangs (uitgaven niet).
   De Naheffing (dek-vloek) houdt hier 20% in. Init-waarden (nieuwSpel) blijven
   directe toewijzingen — je 'ontvangt' je startkapitaal niet. */
function geefGoud(n) {
  n = Math.max(0, Math.round(n));
  if (n > 0 && S && S.dek && S.dek.some(c => c.id === 'de_naheffing')) {
    const inhouding = Math.ceil(n * 0.2);
    n -= inhouding;
    melding(`🧾 De Naheffing houdt ${inhouding} goud in.`);
  }
  S.goud += n;
  return n;
}

function geefDekVloek(id) {
  if (heeftRelikwie('zondebokvel') && !S.zondebokGebruikt) {
    S.zondebokGebruikt = true;
    melding('🐐 Het Zondebokvel draagt de vloek in jouw plaats.');
    return null;
  }
  S.dek.push(nieuweKaart(id));
  return KAARTEN[id].naam;
}
function geefLichtVloek() {
  return geefDekVloek(kiesUit(['schaduwsmet', 'mottenvlam', 'doofpot']));
}

/* GENERIEKE VLOEK (incl. Pijn + de licht-vloeken) — voor vloek-bronnen door het hele
   spel verweven (Act 1+). Alle vloeken zijn weg te slopen bij de Oude Smid. */
function geefVloek() {
  return geefDekVloek(kiesUit(['pijn', 'de_vergadering', 'de_handtekening', 'de_cc', 'de_naheffing', 'de_schaduwboekhouding', 'de_roddel', 'het_dossier', 'schaduwsmet', 'mottenvlam', 'doofpot']));
}

/* een vloek uit de hand UITPUTTEN (Brandstapel/Schuldverschuiving) — en de
   Kroon der Martelaren laat elke verbrande vloek terugslaan */
function putVloekUit(c) {
  const g = S.gevecht;
  if (!g) return;
  g.hand = g.hand.filter(k => k.uid !== c.uid);
  g.uitgeput.push(c);
  if (heeftRelikwie('kroon_der_martelaren')) {
    alleVijanden().forEach(v => verliesHp(v, 4));
    fxNummer($('#speler-zone'), '✨ de namen slaan terug', 'fx-blok');
  }
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

/* RELIKWIE-REVEAL: ELK verworven relikwie komt groot en met gewicht in beeld, ongeacht
   de bron (event, gevechtsbeloning, winkel, elite-drop). Vroeger deed alleen de schatkist
   dat; events meldden hun vondst in één tekstregel tussen de rest — waardoor de beste
   vondst van je run visueel wegviel. Hangt centraal in geefRelikwie(), dus een NIEUW
   event dat een relikwie uitdeelt krijgt de ceremonie automatisch mee.
   Kleur/gloed volgen de zeldzaamheid (--relk uit .rel-*); zeldzaam/episch krijgen
   extra stralen, een zwaardere slam en een langere leespauze. */
function toonRelikwieReveal(id, opts) {
  opts = opts || {};
  const d = RELIKWIEEN[id];
  if (!d) return null;                      /* onbekend id: nooit een lege ceremonie tonen */
  const zeld = d.zeld || 'gewoon';
  const groots = zeld === 'zeldzaam' || zeld === 'episch';
  document.querySelectorAll('.relikwie-reveal-overlay').forEach(n => n.remove());
  const ov = document.createElement('div');
  ov.className = 'relikwie-reveal-overlay rel-' + zeld + (groots ? ' rr-groots' : '');
  ov.innerHTML = `
    <div class="rr-flits"></div>
    <div class="rr-binnen">
      <div class="rr-kop">${opts.kop || '⚜️ EEN RELIKWIE IS VAN JOU'}</div>
      <div class="rr-artwrap">
        <div class="rr-straal"></div>
        <div class="rr-ring"></div>
        <div class="rr-art" data-rart="${id}">${d.icoon}</div>
      </div>
      <span class="schaarste-chip rel-${zeld}">${SCHAARSTE_LABEL[zeld] || 'Relikwie'}</span>
      <h3 class="rr-naam">${d.naam}</h3>
      <p class="rr-effect">${d.tekst}</p>
      ${d.lore ? `<p class="rr-lore">„${d.lore}"</p>` : ''}
      <button class="knop-stil rr-sluit">Verder ↓</button>
    </div>`;
  document.body.appendChild(ov);
  verfraaiItemArt(ov);                      /* emoji → echte relikwie-art waar die bestaat */
  Klank.sfx('schitter');
  setTimeout(() => Klank.sfx('goud'), 180);
  if (groots) setTimeout(() => Klank.sfx('schitter'), 420);
  schudScherm();
  const sluit = () => {
    if (!ov.isConnected) return;
    clearTimeout(ov._timer);
    ov.classList.add('weg');
    setTimeout(() => ov.remove(), 360);
  };
  ov.querySelector('.rr-sluit').onclick = sluit;
  ov.addEventListener('click', e => { if (e.target === ov) sluit(); });
  ov._timer = setTimeout(sluit, groots ? 8000 : 6800);
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
  /* DE ZONDEBOK (Act 3): draagt andermans schuld — 50% van je klappen op
     ANDEREN belanden op hem. Vóór alle visuals/modifiers, zodat animatie,
     Kwetsbaar-berekening en terugkaats allemaal het echte doelwit zien. */
  if (S.gevecht && doel.id !== 'de_zondebok' && !doel.isSpeler && !doel.isMetgezel) {
    const bok = S.gevecht.vijanden.find(x => !x.dood && x.id === 'de_zondebok');
    if (bok && willekeurig() < 0.5) {
      fxNummer(actorEl(bok), '🐐 draagt de schuld', 'fx-blok');
      doel = bok;
    }
  }
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
  /* Het Hakblok (Act 3-kracht): je éérste aanval elke beurt hakt harder */
  if ((sp().status.hakblok || 0) > 0 && !S.gevecht._hakblokGebruikt) {
    dmg += sp().status.hakblok;
    S.gevecht._hakblokGebruikt = true;
  }
  if ((sp().status.zwak || 0) > 0) dmg = Math.floor(dmg * 0.75);
  if ((doel.status.kwetsbaar || 0) > 0) dmg = Math.floor(dmg * 1.5);
  /* Het Brandmerkijzer: je merk drukt door waar het pantser al openligt */
  if (heeftRelikwie('brandmerkijzer') && (doel.status.kwetsbaar || 0) > 0) dmg += 3;
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
  if (doel.isMetgezel) {
    melding(`🛡️ ${METGEZELLEN[doel.id].naam} vangt de klap voor je op!`);
    const iel = actorEl(doel);
    if (iel) { iel.classList.remove('mg-vangt'); void iel.offsetWidth; iel.classList.add('mg-vangt'); setTimeout(() => iel.classList.remove('mg-vangt'), 700); }
  }
  doeSchade(doel, Math.max(0, dmg), v);
}

/* GLAZEN ZIELEN: één waarheid voor de ×1.5, gedeeld door klap, telegraaf en kaarttekst */
function glasDmg(n) { return (n > 0 && typeof dagwetActief === 'function' && dagwetActief('glas')) ? Math.ceil(n * 1.5) : n; }

/* aanvalsschade toepassen: blok absorbeert, doornen kaatsen terug */
function doeSchade(doel, dmg, bron) {
  /* GLAZEN ZIELEN (dagwet): elke klap ×1.5 — vóór blok, beide richtingen */
  dmg = glasDmg(dmg);
  let rest = dmg;
  /* Het Dossier (vloek): een vijandaanval op de speler mag maar de HELFT van het
     Blok gebruiken; de rest van het Blok blijft staan maar vangt deze klap niet */
  const dossierKlap = doel.isSpeler && bron && !bron.isSpeler && !bron.isMetgezel
    && (doel.status.dossier || 0) > 0;
  const beschikbaar = dossierKlap ? Math.floor((doel.blok || 0) / 2) : (doel.blok || 0);
  if (beschikbaar > 0) {
    const op = Math.min(beschikbaar, rest);
    doel.blok -= op; rest -= op;
    if (op > 0) fxNummer(actorEl(doel), '🛡️-' + op, 'fx-blok');
  }
  if (dossierKlap) {
    doel.status.dossier--;
    fxNummer(actorEl(doel), '🗂️ blok gelekt', 'fx-debuff');
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
  if (el && !el.classList.contains('mg-vangt')) {   /* bij een interceptie is de schuif de beat (review) */
    el.classList.remove('raak'); void el.offsetWidth; el.classList.add('raak');
    if (el._raakT) clearTimeout(el._raakT);
    el._raakT = setTimeout(() => el.classList.remove('raak'), 420);   /* opruimen: 'raak' bleef anders eeuwig staan en doofde de adem-animatie (review) */
  }
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
    /* Het Galgentouw (Act 3): vijanden (geen bazen) onder 10% HP sterven meteen — de executie */
    if (doel.hp > 0 && heeftRelikwie('galgentouw') && VIJANDEN[doel.id] && !VIJANDEN[doel.id].baas
        && doel.hp <= Math.ceil((doel.maxHp || 1) * 0.1)) {
      doel.hp = 0;
      fxNummer(actorEl(doel), '🪢 de executie', 'fx-schade');
    }
    /* THE COPYCAT voedt zich met jouw schade — chokepoint, dus ook gif loopt hierlangs.
       copycatNaSchade regelt voeding (bron-gegate) + terugwin van je gestolen kaarten. */
    if (doel.hp > 0 && VIJANDEN[doel.id] && VIJANDEN[doel.id].copycat
        && S.gevecht && !S.gevecht.copycatGebroken) copycatNaSchade(doel, n, bron);
    /* DE PLAGIAATFASE: de Erfprins weigert éénmalig te sterven zolang hij jouw werk
       nog in voorraad heeft — hij verscheurt zijn gestolen arsenaal en verzilvert elke
       kaart in levenskracht (+12 HP per kaart, max 5; tunebaar). Counterplay: win je
       arsenaal terug vóór de kill, of breek de machine (Drops) → hij sterft gewoon. */
    if (doel.hp <= 0 && !doel.dood && doel.id === 'de_erfprins' && !doel.plagiaat
        && S.gevecht && !S.gevecht.copycatGebroken && (doel.gestolen || []).length) {
      doel.plagiaat = true;
      const buit = doel.gestolen.splice(0, 5);          /* verscheurd = dit gevecht nooit meer terug te winnen */
      doel.hp = Math.min(doel.maxHp || 180, buit.length * 12);
      doel.blok = 0;
      doel.status = {};                                  /* hij herrijst schoon — jouw gif stierf met de vorige versie */
      /* de intent is een momentopname van vóór de splice: zonder hersync pocht hij over
         kaarten die hij net verscheurde en landt de getelegrafeerde klap nooit (review) */
      if (VIJANDEN[doel.id] && typeof VIJANDEN[doel.id].kies === 'function') {
        doel.intent = VIJANDEN[doel.id].kies(doel, doel.beurtTeller || 0);
      }
      const g2 = S.gevecht;
      /* de beat: hij zákt (fake-dood, stilte)… en staat dan op met jouw leven in zijn handen */
      pose2D(doel, 'hit', 1.1);
      const elD = actorEl(doel);
      if (elD) { elD.classList.add('plagiaat-zakt'); }
      setTimeout(() => {
        /* de zak-klasse ALTIJD opruimen — ook als hij intussen alsnog stierf (multi-hit),
           anders blijft het lijk grijs-gezakt staan (review 27 aug) */
        if (elD && elD.isConnected) elD.classList.remove('plagiaat-zakt');
        if (S.gevecht !== g2 || g2.voorbij) return;
        baasFaseMoment('DE PLAGIAATFASE', '„Sterven? Ik? Ik heb JOUW leven nog op voorraad."');
        baasSpreekt(UITSPRAKEN._erfprins.plagiaat);
        if (window.Vista) Vista.pose(doel, 'cast', 2.2);
        pose2D(doel, 'cast', 2.2);
        buit.forEach((c, i) => setTimeout(() => {
          if (S.gevecht !== g2 || g2.voorbij) return;
          fxNummer(actorEl(doel), `🗞️ „${knaam(c)}" verscheurd · +12`, 'fx-genees');
          Klank.sfx('flip');
          renderGevecht();
        }, 500 + i * 380));
        setTimeout(() => { if (S.gevecht === g2 && !g2.voorbij) renderGevecht(); }, 700 + buit.length * 380);
      }, 950);
      renderGevecht();
    }
    /* DE HERVERKIEZING: de DICKtator herrijst éénmalig uit de dood — we leren
       niet uit de fouten van het verleden. HP terug naar 40%, meteen de
       wanhoopsfase; de gewone dood-tak hieronder ziet dan weer hp > 0. */
    if (doel.hp <= 0 && !doel.dood && doel.id === 'de_dicktator' && !doel.herrezen) {
      doel.herrezen = true;
      doel.hp = Math.ceil((doel.maxHp || 240) * 0.4);
      doel.blok = 0;
      doel.status = {};                       /* de wederopstanding wist je opgebouwde gif/zwak — vers bloed, oude leugens */
      doel.faseGezien = 3;
      baasFaseMoment('DE HERVERKIEZING', '„Jullie dachten dat het voorbij was? Dat denken jullie ELKE keer."');
      baasSpreekt(UITSPRAKEN._dicktator.herrijzenis);
      schudScherm(); Klank.sfx('dood'); setTimeout(() => Klank.sfx('zwareklap'), 450);
      if (window.Vista) Vista.pose(doel, 'cast', 2.2);
      pose2D(doel, 'cast', 2.2);
      renderGevecht();
    }
    if (doel.hp <= 0 && !doel.dood) {
      doel.dood = true;
      Klank.sfx('dood');
      if (UITSPRAKEN[doel.id]) spreek(doel, UITSPRAKEN[doel.id].dood, 0.4);
      /* per-vijand dood-haak (data-gestuurd; bv. de Zondebok: "de schuld is
         weggedragen" → de rest +1 Kracht). Defensief: nooit de dood-flow breken. */
      if (VIJANDEN[doel.id] && VIJANDEN[doel.id].bijDood) { try { VIJANDEN[doel.id].bijDood(doel); } catch (e) {} }
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
  if (t === 'optimaal') return '✨ optimale band';   /* percentages alleen in het metgezelboek (cryptisch-lijn) */
  if (t === 'goed') return '◆ goede band';
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
  /* een VOORGOED geofferde metgezel draait niet mee: in het rouwvenster (geofferd, de Witte
     nog niet terug) beloofde het heldkeuze-scherm anders een metgezel die volgendeAct()
     terecht weigert — en die run kwam er dan helemaal niemand (review 27 aug) */
  const gevallen = Array.isArray(Codex.gevallen) ? Codex.gevallen : [];
  return lijst.filter(id => !gevallen.includes(id));
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
  /* De Roddel (vloek): zolang ze in je hand zit doet de metgezel niets — hij twijfelt */
  if (S.gevecht && S.gevecht.hand.some(k => k.id === 'de_roddel')) {
    fxNummer(actorEl(m), '🐍 twijfelt aan je…', 'fx-debuff');
    return;
  }
  const def = METGEZELLEN[m.id];
  if (def && def.beurt) {
    /* de actie-beat: aura flitst op terwijl hij handelt, en wat hij JOU geeft
       (blok/heal) reist zichtbaar als sliert van hem naar jou (playtest 27 aug) */
    const el = actorEl(m);
    if (el) { el.classList.remove('mg-actie'); void el.offsetWidth; el.classList.add('mg-actie'); setTimeout(() => el.classList.remove('mg-actie'), 950); }
    const blokVoor = sp().blok || 0, hpVoor = S.hp;
    def.beurt(m);
    if (((sp().blok || 0) > blokVoor) || (S.hp > hpVoor)) mgSliert(m);
  }
}
/* een lichtbolletje in zijn familiekleur reist van de metgezel naar de held */
function mgSliert(m) {
  const van = actorEl(m), naar = $('#speler-zone');
  if (!van || !naar) return;
  const a = van.getBoundingClientRect(), b = naar.getBoundingClientRect();
  if (!a.width || !b.width) return;
  const bol = document.createElement('div');
  bol.className = 'mg-sliert';
  const mgk = getComputedStyle(van).getPropertyValue('--mgk');
  if (mgk) bol.style.setProperty('--mgk', mgk);
  bol.style.left = (a.left + a.width / 2) + 'px';
  bol.style.top = (a.top + a.height * 0.4) + 'px';
  document.body.appendChild(bol);
  requestAnimationFrame(() => {
    bol.style.transform = `translate(${(b.left + b.width / 2) - (a.left + a.width / 2)}px, ${(b.top + b.height * 0.4) - (a.top + a.height * 0.4)}px)`;
    bol.style.opacity = '0';
  });
  setTimeout(() => bol.remove(), 800);
}
/* ✦ DE SIGNATUURZET — de metgezel als levende kaart: klik hem aan (1⚡, 1× per
   gevecht) voor zijn unieke zet. Cryptisch tot de eerste keer (Codex.sigOntdekt);
   De Roddel-vloek blokkeert hem, net als zijn gewone beurt. */
function mgSignatuur() {
  const g = S.gevecht, m = gMet();
  if (!g || g.bezig || g.voorbij || !m || m.dood) return;
  const def = METGEZELLEN[m.id];
  if (!def || !def.signatuur) return;
  /* MOBIEL: de eerste tik toont alleen de tooltip (lezen), pas de tweede activeert —
     zelfde patroon als kaarten (klikKaart); reset bij de beurtwissel (review 9031c72) */
  if (window.mobiel && g.mgSigVoorbeeld !== m.id) { g.mgSigVoorbeeld = m.id; Klank.sfx('klik'); return; }
  if (m.signatuurGebruikt) { melding('✦ Zijn signatuurzet is dit gevecht al gespeeld.'); return; }
  if (g.hand && g.hand.some(k => k.id === 'de_roddel')) { fxNummer(actorEl(m), '🐍 twijfelt aan je…', 'fx-debuff'); Klank.sfx('fout'); return; }
  if ((g.energie || 0) < 1) { melding('Zijn zet vraagt 1 ⚡.'); Klank.sfx('fout'); return; }
  g.energie -= 1;
  m.signatuurGebruikt = true;
  Codex.sigOntdekt = Codex.sigOntdekt || {};
  if (!Codex.sigOntdekt[m.id]) { Codex.sigOntdekt[m.id] = true; bewaarCodex(); }
  /* de cut-in + de beat */
  mgFaseMoment(`${def.icoon} ${def.signatuur.naam}`);
  const el = actorEl(m);
  if (el) { el.classList.remove('mg-actie'); void el.offsetWidth; el.classList.add('mg-actie'); setTimeout(() => el.classList.remove('mg-actie'), 950); }
  pose2D(m, 'attack', 1.6);
  Klank.sfx('schitter');
  def.signatuur.doe(m);
  if (alleVijanden().length === 0) { gevechtGewonnen(); return; }   /* de zet kan de laatste vellen */
  checkBaasFase();   /* de zet kan een fasedrempel breken — zelfde invariant als naActie (review) */
  renderGevecht();
}
/* de bondgenoot-cut-in: klein broertje van baasFaseMoment, in familiekleur */
function mgFaseMoment(titel) {
  const el = document.createElement('div');
  el.className = 'mg-flits';
  el.innerHTML = `<h2>${titel}</h2>`;
  $('#scherm-gevecht').appendChild(el);
  Klank.sfx('zwareklap');
  setTimeout(() => el.remove(), 1900);
}

/* HP op → de metgezel vlucht het donker in (geen echte dood; later terug te vinden) */
function metgezelVlucht(m) {
  if (S.metgezel) S.metgezel.vluchtig = true;
  Klank.sfx('dood');
  pose2D(m, 'hit', 2);   /* een vlucht = gewond terugtrekken, niet de heroïsche offer-sprong */
  const el = actorEl(m);
  if (el) el.classList.add('gevlucht');
  const laatsteAct = typeof huidigeAct === 'function' && typeof ACTS_MAX !== 'undefined' && huidigeAct() >= ACTS_MAX;
  melding(`💨 ${METGEZELLEN[m.id].naam} vlucht het donker in — ${laatsteAct ? 'deze afdaling keert hij niet meer terug' : 'bij de volgende act sluit hij weer aan'}.`);
}
/* wie krijgt de klap: meestal de speler, soms de metgezel (hij vangt 'm op) */
function kiesAanvalDoel(v) {
  const m = gMet();
  if (m && !m.dood && m.muur) { m.muur = false; return m; }   /* ✦ DE MUUR: hij ving deze klap gegarandeerd */
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
    dmg = glasDmg(dmg);   /* GLAZEN ZIELEN geldt ook voor de metgezel-klap */
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

/* (checkDropsOntwaak + revealDrops + checkBaasRite — de oude doof-/win-rites — zijn
   verwijderd: alle metgezel-unlocks lopen nu via het Drempel-ritueel. De grief-arc
   van Drops de Witte (revealDropsWit) staat hieronder en blijft.) */

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
    && !S.daily                                               /* eerlijk veld: geen cross-run-wonder in de dagelijkse afdaling (debug-sweep) */
    && !heeftMetgezel()                                       /* 'terugkeer uit het zwart' alléén als er GEEN levende Drops staat — anders zou drops_wit een nog-aanwezige companion mid-gevecht overschrijven */
    && Array.isArray(Codex.gevallen) && Codex.gevallen.includes('drops')
    && !isOntgrendeld('drops_wit')
    && (Codex.runs || 0) > (Codex.dropsOfferRun || 0)        /* grief moet ≥1 volle run landen */
    && S.gevecht.vijanden.some(v => v.id === 'de_erfprins' && !v.dood);
}
function revealDropsWit(g, poort) {
  if (!g || g.voorbij || isOntgrendeld('drops_wit') || (S && S.daily)) return;   /* tweede net: nooit op een daily */
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
  const def = METGEZELLEN.drops_wit; if (!def) return;   /* defensief (zoals geefMetgezel): crash niet als de data ontbreekt */
  { const wmx = metgezelMaxHp('drops_wit'); g.metgezel = { id: 'drops_wit', naam: def.naam, isMetgezel: true, hp: wmx, maxHp: wmx, blok: 0, status: {}, dood: false }; }
  g.metgezel.intent = def.intent ? def.intent(g.metgezel) : null;
  bouwGevechtDom(g);
  renderGevecht();
  /* signatuur-pose: hij SPRINGT het beeld in (spiegelt drops_death) — drops_wit_terugkeer-art staat live */
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
  /* het eindgevecht van een act mag een eigen FINALE-plaat hebben (act 3: het
     slachtblok-platform van de DICKtator) — anders de epische pool */
  if (soort === 'baas' && set.finale) return ACHTERGRONDEN.basis + set.finale;
  const pool = (soort === 'elite' || soort === 'baas' || soort === 'episch') ? set.episch : set.gevecht;
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
  $('#topbalk').style.display = (naam === 'titel' || naam === 'outro') ? 'none' : 'flex';
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
    if (S.fakkel === undefined) S.fakkel = fakkelMax();
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
    /* GESMEDE kaarten (het Slachtblok) éérst herregistreren — hun dynamische
       defs bestaan niet in de statische KAARTEN, dus zonder dit gooit de
       sanering hieronder ze weg */
    laadGesmedeKaarten();
    /* idem het DEK: kdef(c).naam derefereert KAARTEN[c.id] zonder vangnet — één
       hernoemd/verwijderd kaart-id in een oude save brickt anders elke hand-render.
       Volledig leeggefilterd dek = onspeelbaar → structureel falen (nette melding). */
    S.dek = S.dek.filter(c => c && c.id && KAARTEN[c.id]);
    if (!S.dek.length) { wisSave(); return false; }
    /* gedragen scherven: gooi onbekende/hernoemde ids weg (anders een loze ❓ in de
       Drempel), én verwijder wat al veilig in de stash zit — een stale save (tab dicht
       tussen baas-win en Drempel) zou anders al-gebankte scherven dubbel herstellen
       (gedragen + stash) → herplaatsbaar/herbankbaar → oneindige scherf-duplicatie. */
    S.scherven = (Array.isArray(S.scherven) ? S.scherven : []).filter(sid => scherfDef(sid) && !scherfStash().includes(sid));
    if (S.pos === undefined) S.pos = null;
    if (S.pos !== null && !S.kaart[S.pos]) S.pos = null;   /* pos wijst naar onbestaande node → terug naar de ingang */
    /* HERBETREDING (debug-sweep 27 aug): staat pos op een node zonder uitgangen (de
       baasnode — er wordt dáár gesaved door slachtblok/baas-scherf/decreet), dan liet een
       reload de kaart zonder één klikbare knoop achter → run onherstelbaar. De vlag laat
       beschikbareNodes de kamer opnieuw aanbieden, zonder dubbele verdieping/fakkelkost. */
    if (S.pos !== null && S.kaart[S.pos] && !(S.kaart[S.pos].verb || []).length) S._herbetreed = S.pos;
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
  /* mysterie-scherven in de basis-UI (playtest: "waar zijn mijn scherven?"):
     gedragen = bij je (bankt bij Drempel/overwinning), stash = al veilig */
  const tbS = $('#tb-scherven');
  if (tbS) {
    const ged = (typeof gedragen === 'function') ? gedragen().length : 0;
    const veilig = (Codex.scherven || []).length;
    if (ged || veilig) {
      tbS.style.display = '';
      tbS.innerHTML = `🜂 ${ged}${veilig ? `<small class="tbs-stash">+${veilig}</small>` : ''}`;
      tbS.dataset.tip = `Mysterie-scherven: ${ged} bij je (banken bij de Drempel of een overwinning; gevonden scherven overleven ook een dood) · ${veilig} veilig in je stash. Klik voor de Codex.`;
    } else tbS.style.display = 'none';
  }
  /* de metgezel in de basis-UI (playtest: "leeft mijn Vlamwacht nog?"): HP tussen de
     kamers door + gevlucht-status; klik opent zijn boek-pagina */
  const tbM = $('#tb-metgezel');
  if (tbM) {
    const m = S.metgezel, mdef = m && METGEZELLEN[m.id];
    if (mdef) {
      const laatsteAct = huidigeAct() >= ACTS_MAX;
      tbM.style.display = '';
      tbM.classList.toggle('mg-gevlucht', !!m.vluchtig);
      const mobielCompact = document.body.dataset.modus === 'mobiel';   /* smalle topbalk: alleen icoon+HP */
      tbM.innerHTML = m.vluchtig ? `${mdef.icoon}💨`
        : mobielCompact ? `${mdef.icoon}${m.hp}`
        : `${mdef.icoon} ${m.hp}<small class="tbm-max">/${m.maxHp}</small>`;
      tbM.dataset.tip = m.vluchtig
        ? `${mdef.naam} is gevlucht — ${laatsteAct ? 'deze afdaling keert hij niet meer terug' : 'bij de volgende act sluit hij weer aan'}. Klik voor zijn verhaal.`
        : `${mdef.naam}: ${m.hp}/${m.maxHp} HP — vecht met je mee en rust mee aan het kampvuur. Klik voor zijn verhaal.`;
      tbM.onclick = () => { toonCodex(); setTimeout(() => toonMetgezelBoek(m.id), 60); };
    } else tbM.style.display = 'none';
  }
  /* de Dagwet-chip: alleen tijdens een dagelijkse afdaling zichtbaar;
     tikken heropent de proclamatie */
  const tbW = $('#tb-dagwet');
  if (tbW) {
    const wet = (S.daily && S.dagwet && DAGWETTEN[S.dagwet]) || null;
    if (wet) {
      tbW.style.display = '';
      tbW.innerHTML = `📜${wet.icoon}`;
      tbW.onclick = () => toonDagwetProclamatie(true);
      tbW.dataset.tip = `DAGWET — ${wet.naam}: ${wet.kort}${wet.scoreBonus ? ` (scorebonus +${Math.round(wet.scoreBonus * 100)}%)` : ''} · tik om de proclamatie te herlezen`;
    } else tbW.style.display = 'none';
  }
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
/* drank-drinkmoment: de fles verschijnt groot centraal in beeld met een kleur-
   explosie in de drankkleur (def.kleur), en dooft dan. Puur cosmetisch (pointer-
   events none), fixed t.o.v. het scherm → werkt in én buiten gevecht. */
function drankMoment(id, def) {
  def = def || DRANKEN[id];
  if (!def) return;
  const el = document.createElement('div');
  el.className = 'drank-moment';
  el.style.setProperty('--dkleur', def.kleur || '#ffd24a');
  el.innerHTML = `<span class="dm-gloed"></span>`
    + `<span class="dm-fles">${def.icoon || '🧪'}</span>`   /* emoji-terugval; wordt vervangen door de art als die er is */
    + `<span class="dm-naam">${def.naam || ''}</span>`;
  document.body.appendChild(el);
  /* toon de ÉCHTE drank-artwork groot i.p.v. de emoji (valt terug op emoji zonder art) */
  if (window.laadDrankAfbeelding) laadDrankAfbeelding(id, img => {
    const fles = el.querySelector('.dm-fles');
    if (img && fles) { fles.textContent = ''; fles.classList.add('dm-heeft-art'); fles.style.backgroundImage = `url("${img.src}")`; }
  });
  if (window.Klank) Klank.sfx('schitter');   /* korte glinster boven op de 'drank'-slok */
  setTimeout(() => el.remove(), 1100);
}

function drinkEffect(id, doel) {
  drankMoment(id);   /* toon het drink-moment (drank-artwork groot in beeld) vóór het effect landt */
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
  if (S._herbetreed && S.kaart[S._herbetreed]) return [S._herbetreed];   /* zie de herbetreding-vlag in laadSpel */
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
  /* HET GRAFSCHRIFT: passeer je op de kaart de val-verdieping van een
     possegenoot, dan rijst zijn steen op (na de map-render, één per genoot) */
  setTimeout(checkGrafsteen, 700);
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
  const herbetreding = S._herbetreed === id;   /* na een reload op deze kamer: niet dubbel aanrekenen */
  delete S._herbetreed;
  S.pos = id;
  if (!herbetreding) {
    S.verdieping++;
    const kost = fakkelKost(n.type, n.r);
    if (kost > 0) zetFakkel(-kost);
    if (n.type === 'rust' && heeftRelikwie('vuurvliegenpot')) zetFakkel(15);
  }
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
        /* elke act trekt uit z'n eigen roster (act2 = kopieerhel, act3 = slachtblok);
           ontbreekt een tier in de act-tabel, dan valt hij terug op de Act 1-laag */
        const tabel = ONTMOETINGEN['act' + huidigeAct()] || ONTMOETINGEN;
        startGevecht(kiesUit(tabel[moeilijkheid] || ONTMOETINGEN[moeilijkheid]), 'gevecht', n.r);
        break;
      }
      case 'elite': {
        const actTabel = ONTMOETINGEN['act' + huidigeAct()];
        const eliteTabel = (actTabel && actTabel.elite) ? actTabel.elite : ONTMOETINGEN.elite;
        startGevecht(kiesUit(eliteTabel), 'elite', n.r);
        break;
      }
      case 'episch': {
        /* de mysterie-vijand; bij winst valt z'n scherf (zie gevechtGewonnen).
           Per act een eigen episch-wezen (act3 = het Spreekgestoelte); terugval
           op de globale pool (het Origineel). */
        const actTabel = ONTMOETINGEN['act' + huidigeAct()];
        const epischPool = (actTabel && actTabel.episch) || ONTMOETINGEN.episch || [['het_origineel']];
        startGevecht(kiesUit(epischPool), 'episch', n.r);
        if (S.gevecht) S.gevecht.epischScherf = true;   /* bij winst valt een episch-scherf (zie gevechtGewonnen) */
        break;
      }
      case 'baas': {
        /* HET SLACHTBLOK: één vast smeed-moment vóór de Act 3-finale — de
           laatste keuze voor de troonzaal (niet in daily's; éénmalig per run) */
        if (huidigeAct() >= 3 && !S.slachtblokGedaan && !S.daily) {
          /* de vlag valt pas ná het ritueel: een reload tijdens het smeden geeft het
             Slachtblok opnieuw i.p.v. het stil over te slaan (debug-sweep 27 aug) */
          toonSlachtblok('altaar', () => { S.slachtblokGedaan = true; saveSpel(); startGevecht([huidigeBaas().id], 'baas', n.r); });
          break;
        }
        startGevecht([huidigeBaas().id], 'baas', n.r);
        break;
      }
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
  if (!def.baas && dagwetActief('stormloop')) hp = Math.ceil(hp * 1.25);   /* DE STORMLOOP: de tegenprijs van 4 energie */
  const v = { id, naam: def.naam, art: def.art, hp, maxHp: hp, blok: 0, status: {}, dood: false, beurtTeller: 0, intent: null };   /* (aegis-veld weg — geen enkele vijand-def heeft het nog; het oude schild is vervangen door de Copycat-machinerie) */
  if (def.copycat) {
    /* THE COPYCAT-state. Overal elders lui geguard ((v.gestolen||[]), v.gevoed||0, …)
       want Drops kan midden in het gevecht verschijnen — zie [[lookup-bugklasse]]. */
    v.gestolen = []; v.gevoed = 0; v.fase = 1; v.terugwinMeter = 0;
    v.maxKlap = 0; v.copyKracht = 0;   /* (totaalGestolen weg — hoorde bij de verwijderde steel-loop) */
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
  /* De kaartkeuze-overlay dwingt GEEN oriëntatie meer af: ze erft die van het scherm
     eronder. Zo kiest een altaar (nu een gewoon staand event) zijn kaarten in PORTRET,
     terwijl de belonings-kaartkeuze ná een gevecht LIGGEND blijft (beloning nudged niets)
     → geen constant heen-en-weer draaien tussen gevecht en beloning. Enkel de smid houdt
     via ev.liggend zijn liggende smeed-ceremonie. */
  const eventLiggend = scherm === 'event' && typeof EVENTS !== 'undefined' && typeof S !== 'undefined' && S && S.huidigEvent
    ? (() => { const ev = EVENTS.find(e => e.id === S.huidigEvent); return !!(ev && ev.liggend); })()
    : false;
  let richting = null;
  let liggReden = null;   /* WAAROM liggend gevraagd wordt → de juiste prompt-tekst (gevecht vs kaarten) */
  if (window.mobiel) {
    if ((scherm === 'gevecht' || scherm === 'outro') && !liggend) { richting = 'liggend'; liggReden = scherm === 'outro' ? 'outro' : 'gevecht'; }   /* het gevecht zelf + de outro-sloop */
    else if (eventLiggend && !liggend) { richting = 'liggend'; liggReden = 'kaarten'; }     /* de smid: het smeden speelt liggend */
    else if (_DRAAI_STAAND_SCHERMEN.includes(scherm) && !eventLiggend && liggend) richting = 'staand'; /* events/schat/altaren willen staand */
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
    ? (liggReden === 'outro'
        ? 'Dit slotstuk speel je liggend — zo zie je het hele gebouw.'
        : liggReden === 'gevecht'
        ? 'Gevechten speel je liggend — zo zie je het slagveld en je kaarten groot en duidelijk.'
        : 'Dit scherm speel je liggend — zo zie je je kaarten groot en duidelijk.')
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
  if (!g || g.voorbij || g.baasIntroGespeeld) return;
  if (g.soort !== 'baas' && g.soort !== 'episch') return;
  const db = document.getElementById('draai-blok');
  if (db && db.classList.contains('toon')) return;
  g.baasIntroGespeeld = true;
  if (g.soort === 'baas') toonBaasIntro(g); else toonEpischIntro(g);
}

/* de EPISCHE vijand krijgt zijn eigen onthulling (playtest: "de intro's voor de
   epische monsters mogen cooler") — zelfde doek als de baas-intro, maar met de
   violette episch-signatuur, de bestiarium-typering en zijn openingszin. */
function toonEpischIntro(g) {
  const b = g.vijanden[0];
  if (!b || !VIJANDEN[b.id]) return;
  const lore = (typeof BESTIARIUM !== 'undefined' && BESTIARIUM[b.id]) || {};
  const zin = (UITSPRAKEN[b.id] && UITSPRAKEN[b.id].start && UITSPRAKEN[b.id].start[0]) || '';
  const el = document.createElement('div');
  el.id = 'baas-intro';
  el.classList.add('episch-intro');
  el.innerHTML = `<div class="baas-intro-binnen">
    <small>✦ EPISCH GEVECHT ✦</small>
    <h1>${b.naam}</h1>
    <span>${lore.soort || VIJANDEN[b.id].titel || ''}</span>
    ${zin ? `<em class="ei-quote">„${zin}"</em>` : ''}
  </div>`;
  $('#scherm-gevecht').appendChild(el);
  /* het wezen doemt groot op, zoals de baas-onthulling */
  const art = actorEl(b) && actorEl(b).querySelector('.vijand-art');
  if (art) {
    art.classList.remove('baas-onthuld'); void art.offsetWidth;
    art.classList.add('baas-onthuld');
    setTimeout(() => art.classList.remove('baas-onthuld'), 2800);
  }
  Klank.sfx('schitter');
  setTimeout(() => { Klank.sfx('zwareklap'); schudScherm(); }, 600);
  setTimeout(() => el.remove(), 3200);
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
    /* DE STORMLOOP (dagwet): vier energie per beurt */
    energie: dagwetActief('stormloop') ? 4 : 3, maxEnergie: dagwetActief('stormloop') ? 4 : 3,
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
  if (heeftRelikwie('oorlogsbanier') && (g.soort === 'elite' || g.soort === 'baas' || g.soort === 'episch')) {
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
  if (heeftRelikwie('kop_van_jut')) {                     /* de STERKSTE krijgt de kermis-klap */
    const st = g.vijanden.slice().sort((a, b) => b.hp - a.hp)[0];
    if (st) { st.status.kwetsbaar = (st.status.kwetsbaar || 0) + 2; st.status.zwak = (st.status.zwak || 0) + 1; }
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
  preloadPoses2D(g);   /* poses warm vóór de eerste klap (mobiele race-fix v89) */

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
    /* GRONDANKER: leeg laten → CSS beslist per spoor (laptop center, mobiel
       center bottom). Uitzondering: de FINALE-plaat (887×1774, vogelvlucht
       de diepte in) heeft GEEN grondlijn — onder-ankeren zou er een
       willekeurige band uitsnijden, dus die blijft overal 'center'. */
    bgEl.style.backgroundPosition = /FINALE/i.test(g.achtergrond) ? 'center' : '';
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
    /* animatie HERSTARTEN via remove+reflow+add: de klasse bleef vroeger staan,
       waardoor de held-entree enkel in het allereerste gevecht van de sessie speelde */
    const sz = $('#speler-zone');
    sz.classList.remove('entree-links'); void sz.offsetWidth;
    sz.classList.add('entree-links');
  }
  if (gevechtTikAf) gevechtTikAf();
  gevechtTikAf = Tikker.abonneer(gevechtTik);

  Klank.muziek(soort === 'baas' ? 'baas' : (soort === 'elite' || soort === 'episch' ? 'elite' : 'gevecht'));
  toonScherm('gevecht');
  zetLichtVisueel();
  renderGevecht();
  /* Het Metgezel-Mysterie: de Erfprins-ontmoeting telt mee (cross-run escalatie)
     en levert gegarandeerd de baas-scherf — zo is zelfs een verloren run progressie. */
  if (soort === 'baas' && g.vijanden.some(v => v.id === 'de_erfprins')) {
    /* teller NIET daily-gated: scherfvondsten tellen óók in een daily (ze banken bij het
       einde), dus de orakel-escalatie loopt consistent mee. */
    Codex.erfprinsOntmoetingen = (Codex.erfprinsOntmoetingen || 0) + 1; bewaarCodex();
    const sid = vindScherf('baas'); if (sid) g.baasScherf = sid;   /* in je gedragen tas (bankt bij einde/Drempel); de weighty reveal volgt bij de overwinning (botst niet met de baas-intro) */
    /* DE ROOF gebeurt NIET meer hier — ze wordt nu cinematisch getriggerd door je eerste aanval
       (copycatNaSchade → speelKaart → copycatDeRoof), met een vangnet bovenin eindBeurt. */
  }
  if (soort === 'baas' || soort === 'episch') misschienBaasIntro(g);   /* enkel als het slagveld zichtbaar is (niet achter de draai-prompt) */

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
  stadia.forEach((s, i) => { if (window.laadKarakterAfbeelding) laadKarakterAfbeelding(s.id, img => { if (img && faseEls[i] && faseEls[i].isConnected) faseEls[i].style.backgroundImage = `url("${img.src}")`; }); });   /* isConnected: art die traag laadt terwijl je de intro al wegtikte, schrijft niet naar een losgekoppelde node */
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

/* DE INVENTARIS — de Erfprins introduceert zichzelf via andermans kaarten (eerste
   ontmoeting; wie hem al kent krijgt de snelle speelkaart-reveal). Zelfde skelet als
   de Slijmkoning-metamorfose: beats + tik-om-over-te-slaan + climax-dreun. */
function toonErfprinsInventaris(g, b, el) {
  el.classList.add('baas-intro-inventaris');
  const beats = [
    { ruggen: 1, tekst: 'Geboren met álles.<br>Verdiend: <b>niets</b>.' },
    { ruggen: 4, tekst: 'Pappies naam. Pappies goud. Pappies leger.<br>Alles geleend — niets gemaakt.' },
    { ruggen: 5, tekst: 'Toen het geld op was, bleef één talent over:<br><b>afkijken</b>.' },
  ];
  el.innerHTML = `<div class="baas-intro-binnen inv-wrap">
    <small>Act ${huidigeAct()} — ${ACT_NAMEN[huidigeAct()] || 'Het Archief'}</small>
    <div class="inv-podium">
      ${[0, 1, 2, 3, 4].map(i => `<div class="inv-rug" data-i="${i}"></div>`).join('')}
      <div class="inv-kaarthouder"></div>
    </div>
    <div class="inv-tekst"></div>
    <div class="morf-hint">tik om over te slaan</div>
  </div>`;
  $('#scherm-gevecht').appendChild(el);
  const ruggen = Array.from(el.querySelectorAll('.inv-rug'));
  const tekstEl = el.querySelector('.inv-tekst');
  if (window.laadKaartAfbeelding) laadKaartAfbeelding('rug', img => {
    if (img) ruggen.forEach(r => { if (r.isConnected) { r.style.backgroundImage = `url("${img.src}")`; r.classList.add('met-art'); } });
  });
  let timers = [];
  const STAP = 3600;
  const toonBeat = (i) => {
    ruggen.forEach((r, j) => r.classList.toggle('zichtbaar', j < beats[i].ruggen));
    if (i === 2) ruggen.forEach(r => r.classList.add('trilt'));   /* de nervositeit van de dief */
    tekstEl.innerHTML = beats[i].tekst;
    tekstEl.classList.remove('in'); void tekstEl.offsetWidth; tekstEl.classList.add('in');
    Klank.sfx(i === 2 ? 'flip' : 'klik');
  };
  const climax = () => {
    if (el._klaar) return;
    el._klaar = true;
    timers.forEach(clearTimeout); timers = [];
    /* de gestolen ruggen KLAPPEN samen tot de enige kaart die hij nooit hoefde te
       stelen — zichzelf (dezelfde speelkaart als de snelle reveal) */
    ruggen.forEach(r => r.classList.add('klapt'));
    tekstEl.innerHTML = '';
    const houder = el.querySelector('.inv-kaarthouder');
    houder.innerHTML = `<div class="bik-kaart inv-klap">
        <div class="bik-tag">ORIGINEEL · GESTOLEN · GEPERFECTIONEERD</div>
        <div class="bik-art">🃏</div>
        <div class="bik-naam">${b.naam}</div>
        <div class="bik-titel">${VIJANDEN[b.id].titel || ''}</div>
        <div class="bik-flavor">„De enige kaart die hij nooit hoefde te stelen — zichzelf."</div>
      </div>`;
    if (window.laadKarakterAfbeelding) laadKarakterAfbeelding('de_erfprins_intro', img => {
      const bik = houder.querySelector('.bik-art');
      if (img && bik && bik.isConnected) { bik.style.backgroundImage = `url("${img.src}")`; bik.textContent = ''; bik.classList.add('heeft-art'); }
    });
    Klank.sfx('zwareklap');
    setTimeout(() => { if (el.isConnected) { Klank.sfx('dood'); schudScherm(); } }, 480);
    timers.push(setTimeout(() => { if (S && S.gevecht === g && !g.voorbij) baasSpreekt(baasUitspraken(b.id).intro); }, 1600));
    timers.push(setTimeout(() => { if (S && S.gevecht === g && !g.voorbij && UITSPRAKEN._erfprins.orakel) baasSpreekt(UITSPRAKEN._erfprins.orakel[0]); }, 5200));
    timers.push(setTimeout(() => { el.classList.add('weg'); setTimeout(() => el.remove(), 500); }, 4600));
  };
  beats.forEach((bt, i) => timers.push(setTimeout(() => { if (!el._klaar) toonBeat(i); }, 140 + i * STAP)));
  timers.push(setTimeout(climax, 140 + beats.length * STAP));
  el.addEventListener('click', climax);
}

/* cinematische bazenintro: titelkaart, dreun, beven */
function toonBaasIntro(g) {
  const b = g.vijanden.find(v => VIJANDEN[v.id].baas);
  if (!b) return;
  const el = document.createElement('div');
  el.id = 'baas-intro';
  if (b.id === 'slijmkoning') { toonSlijmkoningIntro(g, b, el); return; }   /* metamorfose i.p.v. de generieke titelkaart */
  const isDick = (b.id === 'de_dicktator');
  if (isDick) {
    /* de DICKtator presenteert zichzelf als STAATSIEPORTRET — de introplaat
       (de_dicktator_intro, mét eigen achtergrond) in een vergulde lijst */
    el.classList.add('baas-intro-dicktator');
    el.innerHTML = `<div class="baas-intro-binnen bik-wrap">
      <small>Act ${huidigeAct()} — ${ACT_NAMEN[huidigeAct()] || 'Het Slachtblok'}</small>
      <div class="bik-kaart bik-goud">
        <div class="bik-tag">ZELFBENOEMD · ZELFGEKROOND · ZELFVOLDAAN</div>
        <div class="bik-art">👑</div>
        <div class="bik-naam">${b.naam}</div>
        <div class="bik-titel">${VIJANDEN[b.id].titel || ''}</div>
        <div class="bik-flavor">„Wat hij afschrijft, bestaat niet meer."</div>
      </div>
    </div>`;
    $('#scherm-gevecht').appendChild(el);
    if (window.laadKarakterAfbeelding) {
      laadKarakterAfbeelding('de_dicktator_intro', img => {
        const bik = el.querySelector('.bik-art');
        if (img && bik) { bik.style.backgroundImage = `url("${img.src}")`; bik.textContent = ''; bik.classList.add('heeft-art'); }
      });
    }
    Klank.sfx('zwareklap');
    setTimeout(() => { Klank.sfx('dood'); schudScherm(); }, 700);
    setTimeout(() => el.remove(), 3600);
    setTimeout(() => { if (S.gevecht === g && !g.voorbij) baasSpreekt(baasUitspraken(b.id).intro); }, 3900);
    return;
  }
  const isErf = (b.id === 'de_erfprins');
  if (isErf && (Codex.erfprinsOntmoetingen || 1) <= 1) {
    /* eerste kennismaking → het volledige Inventaris-verhaal (eigen afronding
       incl. intro-quote en orakel[0]; de gedeelde staart hieronder slaan we over) */
    toonErfprinsInventaris(g, b, el);
    return;
  }
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
  }
  /* scherven-nudge op ÉCHTE voortgang: draagt de speler ≥2 passende scherven, dan verraadt
     de Erfprins nerveus dat ze sámen ergens op passen (reverse psychology — de Drempel).
     De baas-scherf die startGevecht net STIL toekende telt niet mee: die kent de speler
     pas bij de kill-reveal (review 27 aug). */
  if (b.id === 'de_erfprins' && typeof meestGevorderdeMysterie === 'function') {
    const best = meestGevorderdeMysterie();
    let aantal = best ? best.aantal : 0, rijp = !!(best && best.rijp);
    if (best && g.baasScherf && (scherfDef(g.baasScherf) || {}).mid === best.mid) { aantal--; rijp = false; }
    if (best && aantal >= 2) {
      const fluister = rijp
        ? '„Drie die pássen?! Wie heeft je dat verteld?! Die poort had DICHT gemoeten."'
        : '„Je sleept daar iets mee dat op iets anders past. Gooi. Het. Weg."';
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
    /* GEMETEN i.p.v. hardgecodeerd (review 9031c72): de oude -112 was op de 88px-art
       gekalibreerd — de 110px-art zakte 22-32px onder de grondlijn. Eén keer cachen. */
    const dmc = GDOM.metgezel;
    if (!dmc.artVoet) {
      const a = mw.querySelector('.metgezel-art');
      if (a) dmc.artVoet = a.offsetTop + a.offsetHeight;
    }
    mw.style.left = Math.max(108, ps.x - 150) + 'px';   /* -150: de 'halve stap vóór' komt in 3D uit de JS (de 2D-margin is daar geneutraliseerd); klem op de bredere art */
    mw.style.top = (ps.voetY - (dmc.artVoet || 144)) + 'px';
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
const VIJAND_GROOT = new Set(['steengolem', 'dossierwurm', 'de_deadline', 'de_inktvlek', 'grombaard',
  /* Act 3: de imposante regime-cast oogde te klein op de basismaat (playtest 27 aug, laptop) —
     de dunne-massa-figuren (banier/hellebaard rekken het canvas) horen juist te tronen */
  'de_vaandeldrager', 'de_gouden_garde', 'de_aanklager', 'het_klapvee', 'de_omroeper']);
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
    /* voetcorrectie: de gemeten transparante marge onder de voeten wegdrukken (zie VOETMARGE in art.js) */
    const vm = window.VOETMARGE && VOETMARGE[v.id];
    if (vm) wrap.querySelector('.vijand-art').style.setProperty('--voetc', vm + '%');
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
    <div id="speler-figuur" class="speler-figuur"${(window.VOETMARGE && VOETMARGE[heldDef.art]) ? ` style="--voetc:${VOETMARGE[heldDef.art]}%"` : ''}>${spelerArt}</div>
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
      /* CRYPTISCH (playtest 27 aug): de hover verklapt niets — een karakterregel i.p.v.
         mechaniek/percentages. Wat hij doet leer je door hem te zien doen; de volle
         uitleg staat in het metgezelboek (naslagwerk ná de ontmoeting). */
      const synBadge = synT === 'optimaal'
        ? `<span class="metgezel-syn syn-optimaal" data-tip="✨ Deze twee horen bij elkaar.">✨</span>`
        : synT === 'goed' ? `<span class="metgezel-syn syn-goed" data-tip="◆ Ze begrijpen elkaar.">◆</span>` : '';
      void synPerk;
      mz.hidden = false;
      mz.classList.remove('rouw-zone');
      mz.className = mz.className.replace(/\bmg-fam-\S+/g, '').trim();
      mz.classList.add('mg-fam-' + g.metgezel.id);   /* familie-aura in zijn scherfkleur */
      mz.innerHTML = `
        ${synBadge}
        <div class="metgezel-intent"></div>
        <div class="metgezel-art" data-tip="${md.naam} — ${md.fluister || '…'}"${(window.VOETMARGE && VOETMARGE[g.metgezel.id]) ? ` style="--voetc:${VOETMARGE[g.metgezel.id]}%"` : ''}>${md.icoon}</div>
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
      /* ✦ signatuurzet: de metgezel zélf is klikbaar (als een levende kaart) */
      mz.querySelector('.metgezel-art').addEventListener('click', mgSignatuur);
      /* entree-beat: naamflits, één keer per gevecht */
      if (!g.mgEntreeGespeeld) {
        g.mgEntreeGespeeld = true;
        const fl = document.createElement('div');
        fl.className = 'mg-entree';
        fl.textContent = `${md.icoon} ${md.naam} loopt mee`;
        mz.appendChild(fl);
        setTimeout(() => fl.remove(), 2400);
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
    const c = g.trek.pop();
    g.hand.push(c);
    Klank.sfx('trek');
    /* DE HOFNAR (Act 3): trek jij een vloek, dan lacht hij — +6 Blok */
    if (kdef(c).type === 'vloek') {
      const nar = g.vijanden.find(x => !x.dood && x.id === 'de_hofnar');
      if (nar) { geefBlok(nar, 6); fxNummer(actorEl(nar), '🃏 lacht (+6🛡️)', 'fx-blok'); }
      /* De Martelaarskroon: wie de laster draagt zonder te knielen, draagt een kroon */
      if (heeftRelikwie('martelaarskroon')) { geefBlok(sp(), 4); fxNummer($('#speler-zone'), '👑 +4 Blok', 'fx-blok'); }
      vloekBijTrek(c, g);
    }
  }
}

/* ---------- vloeken met TREK-effecten (fase 1 bureaucratie-vloeken) ----------
   Vuurt vanuit trekKaarten voor elke getrokken vloek. De kaartinstanties in de
   gevechtsstapels delen hun referentie met S.dek, dus een teller op de kaart
   (De Handtekening) overleeft gevechten én de save. */
function vloekBijTrek(c, g) {
  if (c.id === 'pijn') {
    /* Pijn bijt bij elke trek: 1 schade, voorbij Blok (verliesHp raakt HP direct) */
    verliesHp(sp(), 1);
    fxNummer($('#speler-zone'), '💀 Pijn −1', 'fx-debuff');
  } else if (c.id === 'de_cc') {
    /* De CC vermenigvuldigt zich: kopie in de AFLEG (gevecht-lokaal — de stapels
       worden bij startGevecht uit S.dek herbouwd, dus kopieën verdwijnen na afloop) */
    const aantal = [g.trek, g.hand, g.afleg].reduce((n, st) => n + st.filter(k => k.id === 'de_cc').length, 0);
    if (aantal < 3) {
      g.afleg.push(nieuweKaart('de_cc'));
      fxNummer($('#speler-zone'), '📧 De CC verspreidt zich…', 'fx-debuff');
    }
  } else if (c.id === 'het_dossier') {
    /* je verdediging ligt op straat: de eerstvolgende vijandaanval mag maar de
       helft van je Blok gebruiken (stapelt per trek; zie doeSchade) */
    sp().status.dossier = (sp().status.dossier || 0) + 1;
    fxNummer($('#speler-zone'), '🗂️ je verdediging ligt op straat', 'fx-debuff');
  } else if (c.id === 'de_handtekening') {
    c.getekend = (c.getekend || 0) + 1;
    if (c.getekend >= 3) {
      /* de derde trek ONDERTEKENT: permanent litteken, dan verdwijnt ze — uit het
         run-dek (zelfde referentie) én uit alle gevechtsstapels */
      S.maxHp = Math.max(1, S.maxHp - 1);
      if (S.hp > S.maxHp) S.hp = S.maxHp;
      S.dek = S.dek.filter(k => k !== c);
      g.trek = g.trek.filter(k => k !== c);
      g.hand = g.hand.filter(k => k !== c);
      g.afleg = g.afleg.filter(k => k !== c);
      Klank.sfx('zwareklap');
      schudScherm();
      fxNummer($('#speler-zone'), '✒️ ONDERTEKEND — −1 Max HP', 'fx-debuff');
      melding('✒️ De Handtekening is gezet. Iets van je is nu voorgoed van hen.');
      renderTopbalk();
    } else {
      fxNummer($('#speler-zone'), `✒️ ${c.getekend}/3…`, 'fx-debuff');
    }
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
    dmg = glasDmg(dmg);   /* GLAZEN ZIELEN telegrafeert mee — de balk loog een derde te laag (debug-sweep) */
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
let _bbExtraSig = null;   /* dirty-guard voor de bazenbalk-extra (arsenaal-/copycat-strook) */
function renderGevecht() {
  const g = S.gevecht;
  if (!g) return;

  /* bazenbalk: grote levensbalk + fase-pips bovenin.
     INCREMENTEEL: de structuur bouwt één keer (per baas), daarna alleen waarden
     bijwerken — een innerHTML-rebuild per render liet de HP-drain-transition nooit
     spelen en herstartte de woede-puls continu. */
  const bb = $('#baas-balk');
  if (bb) {
    const b = g.soort === 'baas' ? g.vijanden.find(v => VIJANDEN[v.id].baas) : null;
    $('#scherm-gevecht').classList.toggle('baas-actief', !!b);
    if (b) {
      bb.style.display = 'block';
      if (bb.dataset.baas !== b.id) {   /* nieuwe baas → structuur (her)bouwen */
        bb.dataset.baas = b.id;         /* per-baas kleuring van het HP-hart/de balk (zie css) */
        _bbExtraSig = null;
        bb.innerHTML = `
          <div class="bb-naam">👑 ${b.naam}</div>
          ${VIJANDEN[b.id].titel ? `<div class="bb-titel">~ ${VIJANDEN[b.id].titel} ~</div>` : ''}
          <div class="bb-balk">
            <div class="bb-vul"></div>
            <span class="bb-tekst"></span>
          </div>
          <div class="bb-fases" data-tip="De baas vecht in drie bedrijven — verzwak hem en zie wat er gebeurt...">
            ${[1, 2, 3].map(() => `<span class="bb-pip"></span>`).join('')}
          </div>
          <div class="bb-extra"></div>`;
      }
      const pct = Math.max(0, b.hp / b.maxHp * 100);
      const balkEl = bb.querySelector('.bb-balk');
      balkEl.classList.toggle('bb-woede', (b.fase || 1) >= 3);
      balkEl.style.setProperty('--hp', Math.round(pct));
      bb.querySelector('.bb-vul').style.width = pct + '%';
      bb.querySelector('.bb-tekst').textContent = `${b.hp}/${b.maxHp}`;
      bb.querySelectorAll('.bb-pip').forEach((p, i) => p.classList.toggle('aan', (b.fase || 1) >= i + 1));
      /* de arsenaal-/copycat-strook alleen herbouwen als de inhoud écht wijzigde */
      const extra = VIJANDEN[b.id].copycat ? copycatBalk(b) : '';
      if (extra !== _bbExtraSig) { _bbExtraSig = extra; bb.querySelector('.bb-extra').innerHTML = extra; }
    } else {
      bb.style.display = 'none';
      bb.dataset.baas = '';
      _bbExtraSig = null;
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
    /* ✦ de gereed-rand van de signatuurzet + klik-hint in de hover */
    const mdef2 = METGEZELLEN[m.id];
    const sigKan = !m.dood && mdef2.signatuur && !m.signatuurGebruikt && !g.bezig && !g.voorbij
      && (g.energie || 0) >= 1 && !(g.hand || []).some(k => k.id === 'de_roddel');
    dm.wrap.classList.toggle('sig-gereed', !!sigKan);
    const artEl2 = dm.wrap.querySelector('.metgezel-art');
    if (artEl2) {
      const basis = `${mdef2.naam} — ${mdef2.fluister || '…'}`;
      artEl2.dataset.tip = sigKan
        ? basis + ((Codex.sigOntdekt || {})[m.id] ? ` · ✦ ${mdef2.signatuur.naam} gereed — klik (1⚡)` : ' · ✦ er broeit iets — klik hem aan (1⚡)')
        : basis;
    }
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
  const def = (typeof KAARTEN !== 'undefined') && KAARTEN[kaartId];
  if (def && def.gesmeed) {
    /* gesmede kaarten: geen kale emoji maar een smeed-visual — gloeiend vuurvak met
       het gekozen zegel erin gestanst; zodra de art 'gesmeed_kaart' bestaat (prompt
       staat klaar) wordt die de onderlaag (playtest 27 aug) */
    if (!icoonEl.classList.contains('gesmeed-visual')) {
      icoonEl.classList.add('gesmeed-visual');
      icoonEl.innerHTML = `<span class="gv-vuur"></span><span class="gv-zegel">${def.icoon || '🗡️'}</span>`;
    }
    if (window.laadKaartAfbeelding) laadKaartAfbeelding('gesmeed_kaart', img => {
      const v = icoonEl.querySelector('.gv-vuur');
      if (img && v) { v.style.backgroundImage = `url("${img.src}")`; v.classList.add('met-art'); }
    });
    return;
  }
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
  return bron === 'baas' ? 'nog te horen uit de mond van de Erfprins'
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
/* SCHERVEN-COLLECTIE in de Codex: alle 9 (3 trio's) — gevonden = fragment-art, rest = ❓.
   Leest de PLATTE stash (Codex.scherven) + de gedragen tas. Spoilt niet WELKE
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
      return (heeft(sid) || ontg)   /* bij een ontwaakte bondgenoot zijn de scherven verbruikt maar het trio is volbracht — toon het vervuld, niet als ❓ */
        ? `<div class="scherf-cx-slot vol ${ontg && !heeft(sid) ? 'verbruikt' : ''}" data-shart="${sid}" data-tip="${(d && d.codexTekst) || ''}">${d ? bronIcoon(d.bron) : '🜂'}</div>`
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

/* de duiding-regel op het nederlaagscherm (Act 2+, bij een open mysterie).
   PLAYTEST-LES: de oude tekst ("dit was geen einde, maar een scherf") toonde
   gewoon je oude stash-stand en suggereerde zo een beloning die deze run
   nooit viel. De tekst volgt nu de WERKELIJKHEID: het drama-register gaat
   alleen open als je déze run echt een scherf vond. Tikbaar → Codex. */
function mysterieDuiding(versAantal) {
  if (typeof huidigeAct === 'function' && huidigeAct() < 2) return '';
  const best = meestGevorderdeMysterie();
  if (!best) return '';
  const totaal = ((window.MYSTERIES[best.mid].vereist) || []).length;
  /* wat vond je DEZE run? — het registratieblok wist S.scherven vóór deze render,
     dus toonEinde geeft de stand van vóór het wissen mee (debug-sweep 27 aug) */
  const loadout = (S && Array.isArray(S.loadoutScherven)) ? S.loadoutScherven : [];
  const vers = (versAantal !== undefined) ? versAantal : gedragen().filter(sid => !loadout.includes(sid)).length;
  const regel = best.rijp
    ? 'De scherven passen samen — het antwoord wacht bij de Drempel, als je het dúrft te maken.'
    : vers > 0
      ? (vers === 1
        ? 'Dit was geen einde: je draagt een scherf uit het donker mee — je vondst overleeft je val.'
        : `Dit was geen einde: je draagt ${vers} scherven uit het donker mee — je vondsten overleven je val.`)
      : 'Een onopgelost mysterie wacht in de diepte.';
  return `<p class="einde-mysterie einde-mysterie-tik" onclick="toonCodex()">🜂 ${regel} <b>(${best.aantal}/${totaal})</b>
    <small>Scherven zijn aanwijzingen — verzamel er ${totaal} om het mysterie bij de Drempel te ontsluieren. Tik voor je Codex.</small></p>`;
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
  /* de outro: eenmaal gezien → voor altijd herbeleefbaar vanuit de Codex */
  const outroBlok = (Codex.outroGezien && window.Outro) ? `
    <h3 class="codex-kop">🕹️ De Opzegtermijn</h3>
    <p class="codex-loopbaan">Het exitgesprek, 25 jaar te laat. <button class="knop-stil" onclick="herbeleefOutro()">🕹️ Outro herbeleven</button></p>` : '';
  /* HET SLACHTBLOK: de gesmede kaart per held — grafsteen van de offers */
  const sbEntries = Object.entries(Codex.slachtblok || {});
  const slachtblokBlok = sbEntries.length ? `
    <h3 class="codex-kop">🪓 Het Slachtblok</h3>
    <div class="codex-slachtblok">${sbEntries.map(([h, sp2]) => `
      <div class="sb-grafsteen ${sp2.gebrandmerkt ? 'gebrandmerkt' : ''}">
        <b>${sp2.icoon} ${sp2.naam}${sp2.gebrandmerkt ? ' ✦' : ''}</b>
        <small>${HELDNAAM(h)} · gesmeed uit ${(sp2.offers || []).join(' en ')} · ${sp2.datum || ''}</small>
        <small class="sbg-regel">${(sp2.charges || 0) > 0
          ? `⚡ ${sp2.charges} lading${sp2.charges === 1 ? '' : 'en'} — kies haar op het heldkeuze-scherm.`
          : 'De kling is bot — smeed een nieuwe op het Slachtblok.'}${sp2.gebrandmerkt ? ' ✦ Gebrandmerkt.' : ''}</small>
      </div>`).join('')}</div>` : '';
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
    }).join('') + `</div>` + slachtblokBlok + outroBlok + scherfCodexBlok() + `
    <p class="codex-voet">Alles wat je ooit vond, over alle runs heen. ${relOntdekt + drOntdekt + mgOntdekt === rels.length + dranks.length + mgs.length ? 'De Codex is compleet — de diepte heeft geen geheimen meer voor jou! 🏆' : 'Vind ze allemaal...'}<br>
    <small>🗝️ = opgeladen: dit relikwie kun je bij een nieuwe run éénmalig meenemen uit het Schrijn.</small></p>`;
  verfraaiItemArt($('#overlay-codex'));   /* incl. het Codex-titelicoon (data-icoon) */
  $('#overlay-codex').classList.add('open');
  Klank.sfx('klik');
}

/* de outro herbeleven vanuit de Codex — draait ook zonder lopende run
   (js/outro.js leest S defensief; de gezien-vlag staat al) */
function herbeleefOutro() {
  if (!window.Outro || Outro.actief) return;
  $('#overlay-codex').classList.remove('open');
  Outro.start(() => naarTitel());
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
/* ALLE pose-states waarvoor vijand-art kan bestaan, in dramatische volgorde (acties →
   reacties → einde). 'gif' hoort erbij: paddenstoelman/pekziel/de_uitgewiste/
   de_verzwolgene hebben een gif-pose die anders nergens te bekijken valt. */
const _BEST_POSES = ['attack', 'cast', 'block', 'gif', 'hit', 'death'];
const _BEST_POSE_NAAM = { attack: 'aanval', cast: 'bezwering', block: 'verdediging', gif: 'vergiftigd', hit: 'geraakt', death: 'sneuvelt' };
let _bestPoseStand = {};   /* cyclische pose-stand per vijand-id (bestiarium-portret, à la heldPose) */
let _bestPosesVan = {};    /* per vijand-id: GESONDEERDE lijst van poses waarvoor écht art bestaat */
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
  /* SONDEER welke poses deze vijand écht heeft: de hint toont dan het juiste aantal en
     bestPose kan deterministisch door de bestaande poses cyclen (elke tik = een échte
     pose, in vaste volgorde — geen overslaan-hikjes meer). De lader cachet, dus dit is
     bij een herbezoek gratis. */
  _bestPoseStand[id] = 0;
  const portretEl = document.querySelector('#bestiarium-inhoud .best-portret');
  const hintEl = document.querySelector('#bestiarium-inhoud .best-pose-hint');
  const toonHint = () => {
    const n = (_bestPosesVan[id] || []).length;
    if (n && hintEl && portretEl) {
      hintEl.textContent = `${poseWoord} voor z'n poses (${n})`;
      hintEl.hidden = false;
      portretEl.classList.add('heeft-poses');
    }
  };
  if (window.laadKarakterAfbeelding && portretEl) {
    if (_bestPosesVan[id]) toonHint();
    else {
      const gevonden = new Set(); let klaar = 0;
      _BEST_POSES.forEach(p => laadKarakterAfbeelding(id + '_' + p, img => {
        if (img) gevonden.add(p);
        if (++klaar === _BEST_POSES.length) { _bestPosesVan[id] = _BEST_POSES.filter(x => gevonden.has(x)); toonHint(); }
      }));
    }
  }
  $('#overlay-bestiarium').classList.add('open');
  Klank.sfx('klik');
}

/* tik op het bestiarium-portret → de volgende bestaande pose, cyclisch en in vaste volgorde
   (aanval → bezwering → verdediging → gif → geraakt → sneuvelt), mét naam-label + teller,
   en auto-terug naar de basis — precies zoals de levende heldenkeuze (heldPose). De pose-
   lijst komt uit de sondering van toonBestiariumPagina; loopt die nog, dan valt een vroege
   tik terug op het oude sla-ontbrekende-over-gedrag. */
const _BEST_POSE_SFX = { attack: 'kaart', cast: 'buff', block: 'buff', gif: 'gif', hit: 'fout', death: 'dood' };
function bestPose(id, e) {
  if (e) e.stopPropagation();
  const el = document.querySelector('#bestiarium-inhoud .best-portret');
  if (!VIJANDEN[id] || !el || !window.laadKarakterAfbeelding) return;
  if (!el.querySelector('img')) return;   /* nog emoji/geen basis-art geladen → niets te poseren */
  const hint = document.querySelector('#bestiarium-inhoud .best-pose-hint');
  if (hint) hint.style.visibility = 'hidden';

  const toon = (pose, nr, totaal) => laadKarakterAfbeelding(id + '_' + pose, img => {
    const im = el.querySelector('img');
    if (!img || !im) return;
    im.src = img.src;
    /* naam-label (+ teller) zodat je wéét welke pose je ziet */
    let lbl = el.querySelector('.best-pose-label');
    if (!lbl) { lbl = document.createElement('span'); lbl.className = 'best-pose-label'; el.appendChild(lbl); }
    lbl.textContent = (_BEST_POSE_NAAM[pose] || pose) + (totaal > 1 ? ` · ${nr}/${totaal}` : '');
    lbl.hidden = false;
    el.classList.remove('best-portret-poseert'); void el.offsetWidth; el.classList.add('best-portret-poseert');
    Klank.sfx(_BEST_POSE_SFX[pose] || 'klik');
    clearTimeout(el._poseTimer);
    el._poseTimer = setTimeout(() => {
      laadKarakterAfbeelding(id, terug => {
        const im3 = el.querySelector('img');
        if (terug && im3) im3.src = terug.src;
      });
      el.classList.remove('best-portret-poseert');
      lbl.hidden = true;
    }, 1250);
  });

  const lijst = _bestPosesVan[id];
  if (lijst) {                             /* gesondeerd → deterministisch cyclen */
    if (!lijst.length) return;             /* deze vijand heeft géén pose-art */
    const i = (_bestPoseStand[id] || 0) % lijst.length;
    _bestPoseStand[id] = i + 1;
    toon(lijst[i], i + 1, lijst.length);
    return;
  }
  /* sondering nog bezig (trage schijf + snelle tik): sla-ontbrekende-over-vangnet */
  let pogingen = 0;
  const probeer = () => {
    if (pogingen++ >= _BEST_POSES.length) return;
    const i = (_bestPoseStand[id] || 0) % _BEST_POSES.length;
    _bestPoseStand[id] = i + 1;
    const pose = _BEST_POSES[i];
    laadKarakterAfbeelding(id + '_' + pose, img => { if (!img) { probeer(); return; } toon(pose, 0, 1); });
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
  const wit = (id === 'drops' && isOntgrendeld('drops_wit'));   /* de Witte nam het slot over: toon zíjn naam/effect/synergie (debug-sweep) */
  const d = METGEZELLEN[wit ? 'drops_wit' : id];
  if (!d) return;
  const rgb = '255, 156, 63';   /* ember */
  $('#relikwie-boek').innerHTML = `
    <div class="boek-kaart" style="--relk:${rgb}">
      <div class="boek-icoon" data-mgart="${(id === 'drops' && isOntgrendeld('drops_wit')) ? 'drops_wit' : ((Codex.gevallen || []).includes(id) ? id + '_geest' : id)}">${(id === 'drops' && isOntgrendeld('drops_wit')) ? '🤍' : d.icoon}</div>
      <span class="schaarste-chip" style="--relk:${rgb}">${SCHAARSTE_LABEL[d.zeld] || 'Metgezel'}</span>
      <h3>${d.naam}</h3>
      <p class="boek-effect">${d.tekst}</p>
      ${d.signatuur ? `<p class="boek-signatuur">✦ <b>${d.signatuur.naam}</b> — ${(Codex.sigOntdekt || {})[wit ? 'drops_wit' : id] ? d.signatuur.boek : 'nog niet ontdekt. Klik hem aan in het gevecht wanneer hij ✦ gereed is.'}</p>` : ''}
      ${synergieBoekHtml(wit ? 'drops_wit' : id)}
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
  const naamEl = el.querySelector('.kaart-naam');
  const nm = knaam(c);
  naamEl.textContent = nm;
  /* lange samengestelde namen iets verkleinen zodat ze netjes in 2 regels passen i.p.v. lelijk
     af te kappen (bv. "Paddenstoelenstoofpot") — tunebaar via de drempels/klassen in style.css */
  naamEl.classList.toggle('lange-naam', nm.length >= 15 && nm.length < 19);
  naamEl.classList.toggle('xl-naam', nm.length >= 19);
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
    /* direct spelen wist een eventuele EERDERE selectie: anders blijft die kaart
       'gekozen' staan terwijl de energie intussen daalt, en speelt een latere
       vijand-klik hem zonder dekking (negatieve energie). */
    if (levend.length === 1) { g.gekozenKaart = null; g.gekozenDrank = null; speelKaart(c, levend[0]); return; }
    g.gekozenKaart = uid;
    g.gekozenDrank = null;
    renderGevecht();
    return;
  }
  g.gekozenKaart = null; g.gekozenDrank = null;   /* idem: direct-speel-pad wist de stale selectie */
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
    if (!c) return;
    /* hercheck de dekking: sinds het selecteren kan een andere kaart de energie/fakkel
       verlaagd hebben — zonder deze check trok speelKaart de kost blind af (negatieve
       energie, of een licht-kaart die de fakkel door nul brandt). */
    const cdef = kdef(c);
    if (kkost(c) > g.energie) { melding('Niet genoeg energie!'); Klank.sfx('fout'); renderGevecht(); return; }
    if (cdef.licht && S.fakkel < kval(c, 'licht')) { melding('Niet genoeg licht in je fakkel!'); Klank.sfx('fout'); renderGevecht(); return; }
    speelKaart(c, v);
  }
}

async function speelKaart(c, doel) {
  const g = S.gevecht;
  const def = kdef(c);
  g.energie -= kkost(c);
  g.kaartGespeeldDezeBeurt = true;   /* De Vergadering belast alleen je éérste kaart */
  /* De Overschreven Poster: de gratis eerste kaart is nu verbruikt */
  if (heeftRelikwie('propagandaposter') && !g.posterGebruikt) g.posterGebruikt = true;
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
    /* try/finally (zelfde patroon als het gewone async-kaartpad hierboven): één throw
       in de cinematic mag g.bezig niet laten hangen — dat zou een harde softlock zijn. */
    try { await copycatDeRoof(g); }
    finally { if (S.gevecht === g) g.bezig = false; }
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
const COPYCAT_F2 = 6, COPYCAT_F3 = 13;   /* voedings-drempels voor fase 2 / 3 (verlaagd: hij ramt nu sneller op) */

function copycatBaas(g) {
  return (g && g.vijanden) ? g.vijanden.find(v => !v.dood && VIJANDEN[v.id] && VIJANDEN[v.id].copycat) : null;
}
function copycatFaseBodem(fase) { return fase >= 3 ? COPYCAT_F3 : (fase >= 2 ? COPYCAT_F2 : 0); }
function snapSterkte(s) { return s.soort === 'aanval' ? (s.n || 0) * 2 : (s.n || 0); }

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
/* (copycatGristVloek + copycatSteel — de oude reactieve per-beurt-steel-loop — zijn
   verwijderd: de Roof v2 grist in één cinematische graai (copycatDeRoof/_copycatGraai)
   en de vloek-backfire leeft nu in copycatSpeelTerug, met dezelfde VLOEK_BACKFIRE.) */

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
      /* óók deze klap loopt langs de doelkeuze: DE MUUR (en de gewone dreiging-vang)
         gold anders niet voor teruggespeelde kaarten (review 9031c72) */
      const doelC = kiesAanvalDoel(v);
      if (doelC.isMetgezel) {
        melding(`🛡️ ${METGEZELLEN[doelC.id].naam} vangt de klap voor je op!`);
        const ielC = actorEl(doelC);
        if (ielC) { ielC.classList.remove('mg-vangt'); void ielC.offsetWidth; ielC.classList.add('mg-vangt'); setTimeout(() => ielC.classList.remove('mg-vangt'), 700); }
      }
      doeSchade(doelC, k.eindDmg, v);
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
    if (!g.roofGedaan && !v.dood) g.roofPending = true;   /* je EERSTE aanval op de Erfprins ontketent de Roof (afgehandeld in speelKaart) — niet als die klap 'm meteen velt */
    if (n > (v.maxKlap || 0)) { v.gevoed = (v.gevoed || 0) + Math.floor((n - (v.maxKlap || 0)) / 4); v.maxKlap = n; }
  } else if (!bron) {
    v.gevoed = (v.gevoed || 0) + Math.round(n / 2);   /* gif/doornen: voedt half */
  }
  /* bron.isMetgezel (de breker): telt alleen voor terugwin, voedt NIET — trouw voedt de dief niet */
}

/* de beurtkeuze van de Erfprins (Roof-rework): speel geroofde kaarten per fase, óf — als zijn
   geroofde stapel op is — een zwakke eigen uithaal (jouw window om hem af te maken).
   Puur (geen mutatie) — alle mutatie zit in de it.doe()-haken. */
/* ============================================================
   DE DICKTATOR — het brein van de Act 3-eindbaas.
   Kern: HET DECREET (elke 3e beurt, getelegrafeerd) schrijft een kaart
   PERMANENT af — het bewaarde contrast met de Erfprins-roof 'per gevecht'.
   Daarnaast de vloeken-as: Karaktermoord schaalt op de laster in je stapels.
   Drie fases op HP (aankondiging + escalatie); bij fase 2 keert de
   JEUGDDROOM uit de proloog terug — voorziening getroffen, afgeschreven.
   ============================================================ */
function vloekenInGevecht(g) {
  return g.trek.concat(g.hand, g.afleg).filter(c => kdef(c).type === 'vloek').length;
}
function dicktatorFase(v) {
  const p = v.hp / (v.maxHp || 1);
  return p > 0.66 ? 1 : (p > 0.33 ? 2 : 3);
}
/* de jeugddroom: een lopende run wint, anders de proloog-overdracht */
function jeugddroomTekst() {
  if (S && S.jeugddroom) return S.jeugddroom;
  try {
    const p = JSON.parse(localStorage.getItem('slayit_proloog') || 'null');
    return (p && p.jeugddroom) || null;
  } catch (e) { return null; }
}
function dicktatorDecreet(v) {
  const g = S.gevecht; if (!g || g.voorbij) return;
  const kandidaten = S.dek.filter(c => kdef(c).type !== 'vloek');
  if (!kandidaten.length) return;
  const c = kiesUit(kandidaten);
  /* PERMANENT: uit je run-dek én uit alle gevechtsstapels (zelfde referentie) */
  S.dek = S.dek.filter(x => x !== c);
  g.trek = g.trek.filter(x => x !== c);
  g.hand = g.hand.filter(x => x !== c);
  g.afleg = g.afleg.filter(x => x !== c);
  g.uitgeput = g.uitgeput.filter(x => x !== c);
  pose2D(v, 'decreet', 2.2);   /* de signature-pose (de_dicktator_decreet-art) */
  if (window.Vista) Vista.pose(v, 'cast', 2.2);
  toonDecreetReveal(c);        /* de vernietigde kaart GROOT in beeld: stempel + verbranding */
  baasSpreekt(kiesUit(UITSPRAKEN._dicktator.decreet));
  saveSpel();
  renderGevecht();
}

/* HET DECREET-MOMENT: permanente vernietiging hoort te doen wankelen — de
   afgeschreven kaart komt GROOT in beeld, de rode stempel slaat erop neer,
   en dan verbrandt ze. (playtest: banner-alleen kwam niet hard genoeg aan) */
function toonDecreetReveal(c) {
  document.querySelectorAll('.decreet-overlay').forEach(n => n.remove());
  const ov = document.createElement('div');
  ov.className = 'vloek-reveal-overlay decreet-overlay';
  ov.innerHTML = `
    <div class="vloek-reveal-binnen">
      <div class="vloek-reveal-kop">👑 HET DECREET</div>
      <div class="vloek-reveal-kaartwrap decreet-kaartwrap">
        <div class="kaart-focus-houder"><div class="focus-rij">
          ${kaartHtml(c, false).replace('kaart groot', 'kaart groot kaart-focus')}
        </div></div>
        <div class="decreet-stempel">AFGESCHREVEN</div>
      </div>
      <div class="vloek-reveal-flavor">„${kdef(c).naam}" — voorgoed uit je dek. Zo is het besloten.</div>
    </div>`;
  document.body.appendChild(ov);
  if (typeof verfraaiKaartIconen === 'function') verfraaiKaartIconen(ov);
  schudScherm(); Klank.sfx('zwareklap'); setTimeout(() => Klank.sfx('dood'), 350);
  /* choreografie: kaart staat (0-1.2s) → stempel slaat neer (1.2s) → verbranding (2s) → weg */
  setTimeout(() => { const kw = ov.querySelector('.decreet-kaartwrap'); if (kw && ov.isConnected) { kw.classList.add('gestempeld'); schudScherm(); Klank.sfx('fout'); } }, 1200);
  setTimeout(() => { const kw = ov.querySelector('.decreet-kaartwrap'); if (kw && ov.isConnected) kw.classList.add('verbrandt'); }, 2100);
  setTimeout(() => { if (ov.isConnected) { ov.classList.add('weg'); setTimeout(() => ov.remove(), 400); } }, 3600);
}
function dicktatorKies(v, beurt) {
  const g = S.gevecht; if (!g) return { type: 'aanval', naam: 'Wijzend vonnis', dmg: 10 };
  /* fase-aankondiging (eenmalig per fase) + de jeugddroom-terugkeer bij fase 2 */
  const fase = dicktatorFase(v);
  if (fase > (v.faseGezien || 1)) {
    v.faseGezien = fase;
    baasFaseMoment(fase === 2 ? 'DE LAUWERKRANS VERSCHUIFT' : 'DE LAATSTE TIRADE', '');
    baasSpreekt(fase === 2 ? UITSPRAKEN._dicktator.fase2 : UITSPRAKEN._dicktator.fase3);
    if (fase === 2) {
      const droom = jeugddroomTekst();
      if (droom) setTimeout(() => {
        if (S.gevecht === g && !g.voorbij) baasSpreekt(`„Uw jeugddroom — ‚${droom}'. Voorziening getroffen. AFGESCHREVEN."`);
      }, 3400);
    }
  }
  const t = (v.beurtTeller || 0) + 1;   /* READ-ONLY: eindBeurt hoogt de teller al op — de oude dubbeltelling hield t altijd oneven en doofde HET DECREET in fase 3 (debug-sweep 27 aug) */
  /* HET DECREET: elke 3e beurt (fase 3: elke 2e) — getelegrafeerd. Bij een
     uitgemergeld dek (≤ 6 speelbare kaarten) valt hij terug op de Executie:
     hij kan je niet verder afschrijven, dus hij hakt zelf. */
  const decreetBeurt = fase >= 3 ? (t % 2 === 0) : (t % 3 === 0);
  if (decreetBeurt) {
    const speelbaar = S.dek.filter(c => kdef(c).type !== 'vloek').length;
    if (speelbaar > 6) return { naam: 'HET DECREET', type: 'buff', doe: () => dicktatorDecreet(v) };
    return { naam: 'EXECUTIE', type: 'aanval', dmg: 18 };
  }
  /* de vloeken-as + het gewone hof-repertoire */
  const vloeken = vloekenInGevecht(g);
  const r = willekeurig();
  if (r < 0.4) return { naam: 'Karaktermoord', type: 'aanval', dmg: 9 + 2 * vloeken };
  if (r < 0.7) return { naam: 'Lasterdecreet', type: 'buff', doe: () => {
    g.trek.splice(Math.floor(willekeurig() * (g.trek.length + 1)), 0, nieuweKaart('laster'));
    geefStatus(v, 'kracht', 1);
    melding('👑 Een gestempeld lasterdecreet schuift tussen je kaarten.');
  } };
  return { naam: 'Gouden garde', type: 'blok', blok: 14 };
}

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
  if (g.afleg.length || g.trek.length) {
    /* SAMENVOEGEN, niet overschrijven: de check hierboven kijkt enkel naar de hand,
       dus g.trek kan nog kaarten bevatten — die zouden anders stil verdwijnen. Ook als
       g.afleg leeg is maar g.trek nog kaarten heeft, trekken we (geen gratis energie). */
    g.trek = schud(g.afleg.concat(g.trek)); g.afleg = []; trekKaarten(1);
    melding('↩️ Je herschikt wat je nog hebt.');
  } else {
    g.energie += 1;   /* echt niks meer om te trekken → dan pas het energie-vangnet */
  }
}

/* de bazenbalk-indicator: het gestolen arsenaal (vervangt de oude aegis-badge) */
function copycatBalk(b) {
  if (S.gevecht && S.gevecht.copycatGebroken) {
    return `<div class="bb-aegis bb-gebroken" data-tip="De kopieermachine is gebroken — trouw was niet te indexeren.">🎭 machine gebroken</div>`;
  }
  const arsenaal = (b.gestolen || []);
  const namen = arsenaal.map(s => s.naam).join(', ');
  /* mobiel: alleen het aantal (de volle lijst maakte een brede sliert dwars door
     de prins — playtest); de namen verhuizen daar naar de tik-tooltip */
  const inline = (!window.mobiel && arsenaal.length) ? ` (${namen})` : '';
  const tipNamen = (window.mobiel && arsenaal.length) ? ` Nu in zijn greep: ${namen}.` : '';
  return `<div class="bb-aegis" data-tip="Geroofd arsenaal: kaarten die de Erfprins uit je dek griste. Aanvallen speelt hij opgewaardeerd terug en verbrandt ze dan; de rest stuurt hij uitgeput naar je trek. Overleef tot zijn stapel op is (fase ${b.fase || 1}).${tipNamen}">🎭 Geroofd · ${arsenaal.length}${inline}</div>`;
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

  /* De Laatste Vonk (Act 3-kracht): aan het einde van elke beurt gloeit je fakkel op */
  if ((g.speler.status.laatstevonk || 0) > 0) {
    zetFakkel(g.speler.status.laatstevonk);
    fxNummer($('#speler-zone'), '✨🔥+' + g.speler.status.laatstevonk, 'fx-buff');
  }

  /* DE ROOF — vangnet: eindigde je je eerste beurt zonder de Erfprins te raken, dan rooft hij
     nu alsnog (zelfde cinematic) vóór hij je kaarten begint te spelen. try/catch: een fout in
     de cinematic mag de beurt niet bevriezen (g.bezig staat hier al op true). */
  if (!g.roofGedaan && copycatBaas(g) && !g.copycatGebroken) {
    try { await copycatDeRoof(g); }
    catch (e) { console.error(e); }
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
  /* SNAPSHOT van de vijandlijst: intents als 'Doorslaan'/'Gieten' spawnen mid-lus een
     nieuwe vijand (voegVijandToe pusht op g.vijanden) en een live for-of zou die
     nieuwkomer nog DEZELFDE beurt laten toeslaan — een klap zonder telegraaf. Met de
     snapshot staat hij één volle spelersbeurt met zichtbare intentie klaar. */
  for (const v of [...g.vijanden]) {
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
        if (window.Vista) Vista.pose(v, 'gif', 0.9);
        pose2D(v, 'gif', 0.9);          /* reactie-pose (2D + 3D): de leegte slurpt je gif op en zwelt */
        zwarteZielHint(v);              /* per-wezen hint, 1× per gevecht */
      } else {
        /* verminder (Zwarte Ziel, gewone) OF baas/gifWeerstand → halve gif-tik. De Zielslantaarn
           breekt de SITUATIONELE counters (immuun/kaats/absorbeer/verminder, via zz=null hierboven)
           maar NIET de statische baas-halvering: een baas blijft innerlijk sterk tegen gif. */
        const halveer = (zz === 'verminder') || gd.baas;
        if (halveer && zz === 'verminder') {
          fxNummer(actorEl(v), '🕳️ ½ gif', 'fx-blok');
          if (window.Vista) Vista.pose(v, 'gif', 0.9);
          pose2D(v, 'gif', 0.9);        /* reactie-pose (2D + 3D): het wezen dempt de helft van je gif */
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
        if (lantaarn && (gd.zwarteZiel || gd.gifImmuun || gd.gifkaats)) {
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
      if (it.doe && !v.dood) { const r = it.doe(v); if (r && r.then) await r; }   /* async intent (de Erfprins-plagiaat) wordt geawait; een lijk (Doornen mid-aanval) voert zijn rider niet meer uit (debug-sweep) */
      if (gestopt()) return;
    }
    if (el) el.classList.remove('actief');

    v.beurtTeller++;
    if ((v.status.kwetsbaar || 0) > 0) v.status.kwetsbaar--;
    if ((v.status.zwak || 0) > 0) v.status.zwak--;
    if (v.dood && alleVijanden().length === 0) { gevechtGewonnen(); return; }
    if (!v.dood) v.intent = VIJANDEN[v.id].kies(v, v.beurtTeller);   /* een lijk telegrafeert niet (debug-sweep) */
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
  g.kaartGespeeldDezeBeurt = false;   /* De Vergadering: verse beurt, verse toeslag */
  g._epidemieGespreid = false;   /* Epidemie mag deze beurt weer 1× verspreiden */
  g._hakblokGebruikt = false;    /* Het Hakblok slijpt elke beurt een verse eerste snede */
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
  const mgM = gMet();
  if (mgM) mgM.muur = false;      /* DE MUUR geldt één vijandbeurt — niet-verzilverd = vervallen (review) */
  g.mgSigVoorbeeld = null;        /* mobiele leestap van de signatuurzet reset per beurt */
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
  /* de bondgenoot handelt NÁ de trek: De Roddel kijkt naar je hand, en die was hier
     vóór v84 op beurt 2+ altijd leeg — de vloek deed dus niets (debug-sweep 27 aug).
     Kan de laatste vijand vellen → de gewonnen-check verderop vangt dat. */
  metgezelBeurt();
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
  /* Het Volkslied (Act 3): waar de laster het dikst ligt, klinkt het lied het luidst */
  if (heeftRelikwie('het_volkslied') && g.hand.filter(c => kdef(c).type === 'vloek').length >= 2) {
    g.energie += 1;
    fxNummer($('#speler-zone'), '🎺 +1 energie', 'fx-buff');
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
  /* Act 2+: elite-winst kan een willekeurige scherf opleveren (Act 1 is bewust scherven-stil) */
  else if (g.soort === 'elite' && huidigeAct() >= 2 && willekeurig() < 0.5) { const sid = vindScherf(); if (sid) toonScherfReveal(sid, { kop: '🜂 TUSSEN DE RESTEN GLINSTERT IETS' }); }
  /* metgezel-HP uit dit gevecht meenemen naar de run-state (gaat mee naar het volgende) */
  if (g.metgezel && !g.metgezel.dood && S.metgezel && !S.metgezel.vluchtig) S.metgezel.hp = g.metgezel.hp;
  if (window.Vista) Vista.pose(g.speler, 'victory', 2.5);
  pose2D(g.speler, 'victory', 2.5);
  /* de metgezel viert mee — pose2D valt stil terug voor wie geen victory-art
     heeft (nu enkel drops_wit: de blije witte hond) */
  if (g.metgezel && !g.metgezel.dood) {
    if (window.Vista) Vista.pose(g.metgezel, 'victory', 2.5);
    pose2D(g.metgezel, 'victory', 2.5);
  }
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
    /* via de centrale poort: het Zondebokvel mag ook déze vloek éénmalig weigeren (debug-sweep) */
    const smetNaam = geefDekVloek('schaduwsmet');
    if (smetNaam) naReveals(() => toonVloekReveal('schaduwsmet', 'Je versloeg ze in volslagen duister — en het donker tekende je. De Schaduwsmet groeit met elke donkere beurt; enkel helder licht zuivert haar. Sloop haar bij de Oude Smid.'));
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
    } else if (window.Outro && Outro.magSpelen()) {
      /* eerste clear → de outro "De Opzegtermijn" (js/outro.js) speelt vóór het
         eindscherm. Loopbaan/daily/scherven EERST registreren: een reload
         middenin de outro mag de win nooit kosten (toonEinde blijft daarna
         idempotent via de S.runGeregistreerd-guard; de uitslag reist mee voor
         het diepterecord-lintje). */
      wisSave();
      if (!S.runGeregistreerd) {
        S._uitslagVooraf = registreerRun(true);
        if (S.daily) { const du = registreerDaily(true); S.dailyNieuweTop = du.nieuweTop; }
        bankGedragen();
        S.runGeregistreerd = true;
      }
      /* pending-einde: herlaadt de speler middenin de outro (save is gewist!),
         dan is de win geregistreerd maar het einde-scherm weg — bewaar de
         essentie zodat de boot er alsnog een felicitatie van kan maken.
         toonEinde ruimt de sleutel op bij het normale pad. */
      try {
        localStorage.setItem('slayit_einde_pending', JSON.stringify({
          held: S.held, baas: verslagenBaas || null,   /* is al een string (debug-sweep) */
          seed: S.seed, daily: !!S.daily,
          record: !!(S._uitslagVooraf && S._uitslagVooraf.nieuwRecord)
        }));
      } catch (e) {}
      /* eerst het scherf-/vloek-reveal-moment laten aflopen (auto-sluit na ±7s
         of een klik) — anders hangt die overlay over de startende outro én
         wordt het reveal-moment zelf platgewalst */
      const wachtOpReveal = () => {
        if (document.querySelector('.scherf-reveal-overlay, .vloek-reveal-overlay, .relikwie-reveal-overlay')) { setTimeout(wachtOpReveal, 250); return; }
        Outro.start(() => toonEinde(true, verslagenBaas));
      };
      wachtOpReveal();
    } else {
      wisSave();
      toonEinde(true, verslagenBaas);   /* laatste act verslagen → echte overwinning (toon de juiste baasnaam) */
    }
    return;
  }

  /* De Oorkonde van Verzet (Act 3): elke gevallen schrik van het regime zet een handtekening bij */
  if ((g.soort === 'elite' || g.soort === 'episch') && heeftRelikwie('oorkonde_van_verzet')) {
    S.maxHp += 1; S.hp = Math.min(S.maxHp, S.hp + 1); geefGoud(10);
    melding('📜 De Oorkonde van Verzet: +1 Max HP en +10 goud.');
  }
  let goud = (g.soort === 'elite' || g.soort === 'episch') ? rnd(34, 48) : rnd(16, 26);   /* iets guller na gevechten (playtest); episch beloont als elite */
  /* De Overloper (Act 3-event): zijn sleutels laten de eerstvolgende elite-kluis dubbel tellen */
  if (S.overloperDubbel && (g.soort === 'elite' || g.soort === 'episch')) {
    goud *= 2; S.overloperDubbel = false;
    melding('🗝️ De sleutels van de Overloper: de kluis telt dubbel.');
  }
  if (asc() >= 4) goud = Math.floor(goud * 0.75);   /* ascension 4: schrale buit */
  if (g.gedoofd) goud = Math.floor(goud * 1.5);
  if (heeftRelikwie('gelukspoot')) goud = Math.floor(goud * 1.25);
  if (heeftRelikwie('leren_buidel')) goud += 10;
  if (dagwetActief('goudkoorts')) goud *= 2;   /* DE GOUDKOORTS: gevechten betalen dubbel */
  if (heeftRelikwie('kaarsenstomp')) zetFakkel(3);

  const buitRelikwie = (g.soort === 'elite' || g.soort === 'episch') ? willekeurigRelikwie({ ongewoon: 50, zeldzaam: 38, episch: 12 }) : null;
  /* DE NALATENSCHAP: één keer per daily, bij de eerstvolgende overwinning —
     gegarandeerd vindbaar (geen ?-node-loterij). Guard op KAARTEN[..]:
     serverdata, een onbekend kaart-id mag nooit een leeg blok tonen. */
  const nalatenschap = (S.daily && S.nalatenschap && !S.nalatenschapGevonden && KAARTEN[S.nalatenschap.kaart])
    ? S.nalatenschap : null;
  S.beloning = {
    nalatenschap,
    goud,
    kaarten: trekKaartBeloning(),
    relikwie: buitRelikwie,
    /* VERVLOEKTE BUIT (40% van de elite-relikwieën): nemen = relikwie + vloek —
       een bewuste keuze, dus de Verder-knop raapt hem NIET automatisch mee */
    vervloekt: !!buitRelikwie && willekeurig() < 0.4,
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

/* kaartenpool van de huidige held: eigen kaarten + neutrale.
   HET AMALGAAM (dagwet): de held-grens valt weg — alle gilden mengen. */
function heldPool() {
  return Object.keys(KAARTEN).filter(id => {
    const k = KAARTEN[id];
    return !['basis', 'vloek', 'gesmeed'].includes(k.zeld)
      && (!k.held || dagwetActief('amalgaam')
        || k.held === (dagwetActief('detachering') ? vreemdeHeldVanDag() : S.held))
      && (!k.act || k.act <= huidigeAct());
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
  schermAchtergrond('beloning', actBg('beloning'), 0.5, 'center bottom');
  const b = S.beloning;
  let html = `<h2 class="scherm-titel">Overwinning!</h2>
    <p class="scherm-sub">De buit neem je automatisch mee — alleen de kaartkeuze is aan jou.</p>
    <div class="beloning-lijst">`;
  if (b.nalatenschap && KAARTEN[b.nalatenschap.kaart]) {
    const nk = KAARTEN[b.nalatenschap.kaart];
    html += `<button class="beloning-item beloning-nalatenschap" onclick="pakNalatenschap()">🪦 De nalatenschap van ${escSyn(b.nalatenschap.van)} — <b>${nk.naam}</b><small>Gevallen vandaag in de diepte. Zijn beste kaart reist met jou verder.</small></button>`;
  }
  if (b.goud > 0) html += `<button class="beloning-item" onclick="pakGoud()">🪙 ${b.goud} goud</button>`;
  if (b.relikwie) {
    const rd = RELIKWIEEN[b.relikwie];
    /* vervloekte buit: de clausule staat er VOORAF bij — pakken is een
       geïnformeerde keuze, geen hinderlaag (playtest 21 aug) */
    html += `<button class="beloning-item ${b.vervloekt ? 'beloning-vervloekt' : ''}" onclick="pakRelikwie()"><span class="art-mini rel-${rd.zeld}" data-rart="${b.relikwie}">${rd.icoon}</span> ${rd.naam} <span class="schaarste-chip rel-${rd.zeld}">${SCHAARSTE_LABEL[rd.zeld] || 'Relikwie'}</span><small>${rd.tekst}</small>${b.vervloekt ? '<span class="vervloekt-strik">⚠️ vervloekte buit — wie dit opeist, tekent ook voor de vloek. Laten liggen mag.</span>' : ''}</button>`;
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
  if (b.goud > 0) { geefGoud(b.goud); mee.push(`🪙 ${b.goud} goud`); b.goud = 0; Klank.sfx('goud'); }
  if (b.nalatenschap && KAARTEN[b.nalatenschap.kaart]) {
    const van = escSyn(String(b.nalatenschap.van || ''));   /* vóór pakNalatenschap lezen — die nult het veld (zelfde referentie); servernaam gesaneerd (debug-sweep) */
    pakNalatenschap();
    mee.push('de nalatenschap van ' + van);
  }
  if (b.relikwie && !b.vervloekt) { geefRelikwie(b.relikwie); mee.push(RELIKWIEEN[b.relikwie].naam); b.relikwie = null; }
  else if (b.relikwie && b.vervloekt) mee.push(`${RELIKWIEEN[b.relikwie].naam} LATEN LIGGEN (vervloekte buit vergt een bewuste keuze)`);
  if (b.drank) {
    if (S.dranken.length < drankSlots()) { S.dranken.push(b.drank); mee.push(DRANKEN[b.drank].naam); }
    else mee.push(`${DRANKEN[b.drank].naam} achtergelaten (geen vak vrij)`);
    b.drank = null;
  }
  if (mee.length) melding('Meegenomen: ' + mee.join(' · '));
  renderKaartScherm();
}
function pakNalatenschap() {
  const n = S.beloning && S.beloning.nalatenschap;
  if (!n || !KAARTEN[n.kaart]) return;
  S.dek.push(nieuweKaart(n.kaart));
  S.nalatenschapGevonden = true;
  S.beloning.nalatenschap = null;
  toonKaartReveal(n.kaart, {
    kop: `🪦 DE NALATENSCHAP VAN ${escSyn(String(n.van || '').toUpperCase())}`,
    flavor: 'Gevallen vandaag in de diepte. Wat van hem was, vecht nu met jou mee.',
    klank: 'schitter'
  });
  renderBeloning();
}
function pakGoud() { Klank.sfx('goud'); geefGoud(S.beloning.goud); S.beloning.goud = 0; renderBeloning(); }
function pakRelikwie() {
  geefRelikwie(S.beloning.relikwie);   /* geen melding: de reveal-ceremonie toont het relikwie zelf */
  if (S.beloning.vervloekt) {
    const vid = kiesUit(['pijn', 'de_vergadering', 'de_handtekening', 'de_cc', 'de_naheffing', 'het_dossier']);
    const naam = geefDekVloek(vid);
    if (naam) {
      /* pas NADAT de relikwie-ceremonie dicht is (klik of auto) — twee reveals
         over elkaar heen maakten onleesbaar wat er gebeurde (playtest 21 aug) */
      const wachtTotDicht = () => {
        if (document.querySelector('.relikwie-reveal-overlay')) { setTimeout(wachtTotDicht, 250); return; }
        toonVloekReveal(vid, 'De kleine lettertjes van de vervloekte buit — dit reisde mee met het relikwie.');
      };
      setTimeout(wachtTotDicht, 500);
    }
    S.beloning.vervloekt = false;
  }
  S.beloning.relikwie = null;
  renderBeloning();
}
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
  /* OFFER-NISSEN (laptop): je keuze ligt fysiek "op het altaar" i.p.v. enkel een teller —
     de kaart vliegt erheen bij het aantikken. Mobiel houdt de compacte teller (schermhoogte). */
  let slotsEl = null;
  if (document.body.dataset.modus !== 'mobiel') {
    slotsEl = ov.querySelector('.kies-slots');
    if (!slotsEl) { slotsEl = document.createElement('div'); slotsEl.className = 'kies-slots'; ov.insertBefore(slotsEl, houder); }
  }

  function sluit() {
    document.onkeydown = null;
    ov.classList.remove('open', 'kies-meervoud');
    houder.classList.remove('meer-modus', 'focus-modus');
    const b = ov.querySelector('.kies-actiebalk'); if (b) b.remove();
    const sl = ov.querySelector('.kies-slots'); if (sl) sl.remove();
    $('#kies-overslaan').style.display = '';
    evalueerDraaiBlok();
  }

  function renderSlots() {
    if (!slotsEl) return;
    /* tikvolgorde (Set-insertievolgorde), niet dekvolgorde: zo landt de kaart in de nis
       waar de vlieg-animatie heen wees en verspringen eerdere keuzes niet (review 27 aug) */
    const sel = [...gekozen].map(uid => kaarten.find(k => k.uid === uid)).filter(Boolean);
    slotsEl.innerHTML = Array.from({ length: aantal }, (_, i) => {
      const c = sel[i];
      return c
        ? `<div class="kies-slot vol" data-uid="${c.uid}" data-tip="Tik om terug te leggen">${kaartHtml(c, true)}</div>`
        : `<div class="kies-slot leeg">◇</div>`;
    }).join('');
    verfraaiKaartIconen(slotsEl);
    slotsEl.querySelectorAll('.kies-slot.vol').forEach(el => {
      el.onclick = () => {
        const c = kaarten.find(k => k.uid == el.dataset.uid);
        if (c) { kiesToggle(c); syncGekozen(); renderBalk(); renderSlots(); }
      };
    });
  }
  /* de gekozen kaart vliegt van de tafel naar zijn nis (puur presentationeel) */
  function vliegNaarSlot(bronEl) {
    if (!slotsEl) return;
    const bronKaart = bronEl.querySelector('.kaart');
    const doel = slotsEl.querySelector('.kies-slot.leeg') || slotsEl;
    if (!bronKaart || !doel) return;
    const b = bronKaart.getBoundingClientRect(), d = doel.getBoundingClientRect();
    if (!b.width || !d.width) return;
    const kloon = bronKaart.cloneNode(true);
    kloon.classList.add('kies-vlieger');
    Object.assign(kloon.style, { left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px' });
    document.body.appendChild(kloon);
    requestAnimationFrame(() => {
      const s = Math.min(d.width / b.width, d.height / b.height) * 0.94;
      kloon.style.transform = `translate(${(d.left + d.width / 2) - (b.left + b.width / 2)}px, ${(d.top + d.height / 2) - (b.top + b.height / 2)}px) scale(${s})`;
      kloon.style.opacity = '.35';
    });
    setTimeout(() => kloon.remove(), 430);
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
    houder.innerHTML = kaarten.map((c, i) => `
      <div class="meer-kaart ${gekozen.has(c.uid) ? 'gekozen' : ''}" data-uid="${c.uid}" style="--di:${i}">
        ${kaartHtml(c, true)}
        <div class="meer-vink" aria-hidden="true">✓</div>
        <button class="meer-zoom-knop" data-uid="${c.uid}" aria-label="Bekijk groot">🔍</button>
      </div>`).join('');
    verfraaiKaartIconen(houder);
    houder.querySelectorAll('.meer-kaart').forEach(el => {
      el.onclick = e => {
        if (e.target.closest('.meer-zoom-knop')) return;
        const c = kaarten.find(k => k.uid == el.dataset.uid); if (!c) return;
        const was = gekozen.has(c.uid);
        kiesToggle(c);
        if (!was && gekozen.has(c.uid)) vliegNaarSlot(el);
        syncGekozen();
        renderBalk();
        renderSlots();
      };
    });
    houder.querySelectorAll('.meer-zoom-knop').forEach(b => {
      b.onclick = e => { e.stopPropagation(); const c = kaarten.find(k => k.uid == b.dataset.uid); if (c) zoom(c); };
    });
    renderBalk();
    renderSlots();
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
  ov.classList.add('open', 'kies-meervoud');   /* .kies-meervoud → mobiele flex-kolom-layout (scrollend raster + vaste onderbalk) */
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
  const kanPoken = S.fakkel < fakkelMax();   /* vol = het ECHTE plafond (Schaduwboekhouding: 60) — anders was oppoken geblokkeerd terwijl je op 60 vastzit (debug-sweep) */
  /* dwarrelende vonken met eigen koers en tempo (presentationeel) */
  const vonken = Array.from({ length: 14 }, () =>
    `<span class="kv-vonk" style="--vx:${(Math.random() * 70 - 35).toFixed(0)}px; --vzw:${(Math.random() * 50 - 25).toFixed(0)}px; --vd:${(1.6 + Math.random() * 2.2).toFixed(2)}s; animation-delay:${(Math.random() * 3).toFixed(2)}s"></span>`
  ).join('');
  /* Drops' geest bij het kampvuur — alleen in het grief-venster: hij offerde zich
     (Codex.gevallen) en De Witte is nog niet teruggekeerd. Stil aanwezig, geen tekst. */
  const geestRouw = Array.isArray(Codex.gevallen) && Codex.gevallen.includes('drops')
    && !isOntgrendeld('drops_wit')
    && !(Array.isArray(Codex.metgezellen) && Codex.metgezellen.includes('drops_wit'));
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
      ${geestRouw ? '<div class="kv-geest" id="kv-geest"></div>' : ''}
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
  if (geestRouw && window.laadMetgezelAfbeelding) {
    /* de geest verschijnt pas als de art er echt is — mislukt de load, dan blijft de div leeg/onzichtbaar */
    laadMetgezelAfbeelding('drops_geest_rust', img => {
      const el = $('#kv-geest');
      if (img && el) el.innerHTML = `<img src="${img.src}" alt="">`;
    });
  }
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
  document.querySelectorAll('#scherm-rust .rust-knop').forEach(b => b.disabled = true);
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
  document.querySelectorAll('#scherm-rust .rust-knop').forEach(b => b.disabled = true);   /* het 1,2s-vertrekvenster dicht */
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
  if (rustKlaar) return;   /* één rustactie per kampvuur — dit gat gaf heal + gratis smeedbeurt (debug-sweep) */
  kiesKaartUitDek('upgrade', 'Kies een kaart om te smeden', c => {
    if (c) { rustKlaar = true; renderKaartScherm(); } else toonRust();
  });
}

/* de schatkist: eerst spanning, dan de onthulling */
let schatBuit = null;
function toonSchat() {
  toonScherm('schat');
  schermAchtergrond('schat', actBg('schat'), 0.45, 'center bottom');
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
      geefRelikwie(r, false, true);   /* stil: de schatkist heeft zijn eigen onthulling hieronder */
      const d = RELIKWIEEN[r];
      buit = `
        <div class="schat-buit rel-${d.zeld}" onclick="toonRelikwieBoek('${r}')" data-tip="Klik voor het volledige verhaal">
          <div class="schat-stralen"></div>
          <div class="schat-icoon" data-rart="${r}">${d.icoon}</div>
          <span class="schaarste-chip rel-${d.zeld}">${SCHAARSTE_LABEL[d.zeld] || 'Relikwie'}</span>
          <h3>${d.naam}</h3>
          <p class="boek-effect">${d.tekst}</p>
          ${d.lore ? `<p class="boek-lore">„${d.lore}"</p>` : ''}
        </div>`;
    } else {
      geefGoud(50);
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
  /* HET KOOPJE (30%): een zeldzame/epische kaart voor een prikkie — maar bij
     aankoop reist er een clausule (vloek) mee. De ⚠️ in de UI verklapt het. */
  if (willekeurig() < 0.3) {
    const top = schud(heldPool().filter(id => KAARTEN[id].zeld === 'zeldzaam' || KAARTEN[id].zeld === 'episch'))[0];
    if (top) kaarten.push({ kaart: nieuweKaart(top), prijs: rnd(25, 40), clausule: true });
  }
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
  /* DE GOUDKOORTS (dagwet): de koopman ruikt je honger — 30% korting op alles */
  if (dagwetActief('goudkoorts')) {
    const kort = p => Math.max(5, Math.floor(p * 0.7));
    S.winkel.kaarten.forEach(i => { i.prijs = kort(i.prijs); });
    S.winkel.relikwieen.forEach(i => { i.prijs = kort(i.prijs); });
    S.winkel.dranken.forEach(i => { i.prijs = kort(i.prijs); });
    S.winkel.olie.prijs = kort(S.winkel.olie.prijs);
    S.winkel.verwijderPrijs = kort(S.winkel.verwijderPrijs);
  }
  renderWinkel();
}

function renderWinkel() {
  toonScherm('winkel');
  const w = S.winkel;
  schermAchtergrond('winkel', w.ei ? actBg('winkelEasterEgg') : actBg('winkel'), 0.62, 'center bottom');
  let html = `<h2 class="scherm-titel"><span data-icoon="winkel">💰</span> De Winkel</h2>
    <p class="scherm-sub">"Alles te koop, niets te geef," grijnst de koopman.</p>`;

  html += `<div class="winkel-kaarten">` + w.kaarten.map((item, i) => {
    if (!item) return '';
    const kan = S.goud >= item.prijs;
    return `<div class="winkel-item ${kan ? '' : 'te-duur-item'} ${item.clausule ? 'met-clausule' : ''}" onclick="koopKaart(${i})">
      ${kaartHtml(item.kaart, false)}${item.clausule ? '<div class="clausule-strik" data-tip="Kleine lettertjes: bij aankoop reist er een vloek mee">⚠️ kleine lettertjes</div>' : ''}<div class="prijs">🪙 ${item.prijs}</div></div>`;
  }).join('') + `</div>`;

  html += `<div class="winkel-rij">`;
  html += w.relikwieen.map((item, i) => {
    if (!item) return '';
    const d = RELIKWIEEN[item.id];
    const kan = S.goud >= item.prijs;
    return `<button class="winkel-blok ${kan ? '' : 'te-duur-item'}" onclick="koopRelikwie(${i})">
      <span class="winkel-icoon rel-${d.zeld}" data-rart="${item.id}">${d.icoon}</span><b>${d.naam}</b><span class="schaarste-chip rel-${d.zeld}">${SCHAARSTE_LABEL[d.zeld] || 'Relikwie'}</span><small>${d.tekst}</small><div class="prijs">🪙 ${item.prijs}</div></button>`;
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
  if (item.clausule) {
    /* de kleine lettertjes: het koopje neemt zijn clausule mee */
    const vid = kiesUit(['de_vergadering', 'de_naheffing', 'het_dossier', 'de_cc']);
    const naam = geefDekVloek(vid);
    if (naam) toonVloekReveal(vid, 'De koopman tikt op het contract: „Artikel 7, lid 3. U tekende bij aankoop."');
  }
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
  /* 'center bottom' (net als rust/winkel/schat/beloning): de geschilderde vloer
     zit in de onderste ~30-38% van elke plaat — onder-ankeren houdt hem in beeld
     op elke aspectratio (cover snijdt liggend anders de vloer weg). */
  schermAchtergrond('event',
    ev.id === 'altaar' ? actBg('eventRelikwie') : actBg('event'), 0.5, 'center bottom');
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
    if (!img || !el) return;
    el.innerHTML = `<img src="${img.src}" alt="">`;
    /* oriëntatie-bewust kader: portret-art (bv. de koopman, 2:3) krijgt een STAAND paneel zodat
       kop + figuur heel blijven i.p.v. tot een middenstrook gecropt te worden in de landschap-band */
    const portret = img.naturalHeight > img.naturalWidth * 1.15;
    el.classList.toggle('is-portret', portret);
    el.classList.toggle('is-landschap', !portret);
  });
}

function renderEvent(ev) {
  /* art + tekstkolom als twee losse blokken: in portret onder elkaar (art groot bovenaan),
     in liggend naast elkaar (art links, tekst/knoppen rechts) — zie mobiel.css. */
  let html = `${eventArtHtml(ev)}
    <div class="event-tekstkolom">
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
  html += `</div></div>`;
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
    <div class="event-tekstkolom">
    <h2 class="scherm-titel">${ev.titel}</h2>
    <p class="scherm-sub event-tekst event-onthul">${tekst}</p>
    <button class="knop-groot" onclick="renderKaartScherm()">Verder ➤</button></div>`;
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
/* ============================================================
   HET SLACHTBLOK — je eigen kaart smeden (R3.6, de Inscryption-knipoog).
   Offer 2 kaarten uit je dek — VERNIETIGD voor de rest van de run — en
   smeed uit hun waarde één kaart met een ZELFGEKOZEN NAAM. Twee momenten:
   het altaar vóór de Act 3-baas (kaart speelt meteen mee) en de dood in
   de diepte (de kaart wacht in de Codex, één slot per held). Daily's: uit.
   ============================================================ */
const SMEED_MODULES = {
  schade:    { naam: 'Schade',      icoon: '⚔️', perPunt: 4, doel: true },
  /* HELD-ADEREN: elke held smeedt één eigen ader in het metaal (alleen beschikbaar
     als DIE held smeedt) — de kaart zelf blijft daarna voor iedereen draagbaar */
  woede:     { naam: 'Woede',       icoon: '🩸', perPunt: 1, held: 'slachter',  ader: '+Kracht dit gevecht' },
  miasma:    { naam: 'Miasma',      icoon: '🌫️', perPunt: 1, held: 'gifmagier', ader: 'Gif op ÁLLE vijanden' },
  groei:     { naam: 'Groeikracht', icoon: '🌱', perPunt: 2, held: 'thoverk',   ader: 'genees én Blok tegelijk' },
  gif:       { naam: 'Gif',         icoon: '☣️', perPunt: 2, doel: true },
  zwak:      { naam: 'Zwak',        icoon: '💫', perPunt: 1, doel: true },
  kwetsbaar: { naam: 'Kwetsbaar',   icoon: '🟥', perPunt: 1, doel: true },
  blok:      { naam: 'Blok',        icoon: '🛡️', perPunt: 4 },
  doornen:   { naam: 'Doornen',     icoon: '🌵', perPunt: 2 },
  trek:      { naam: 'Trek kaarten', icoon: '🃏', perPunt: 1 },
  genees:    { naam: 'Genees',      icoon: '💚', perPunt: 3 },
  licht:     { naam: 'Licht',       icoon: '🔥', perPunt: 8 }
};
const SMEED_ICONEN = ['🗡️', '🪓', '🔥', '☠️', '🌑', '⚡', '🐺', '🌹', '🦴', '👁️', '🕯️', '🖤'];
function offerWaarde(c) {
  /* uitputtende tabel (lookup-bugklasse): 'gesmeed' viel op de 1-punt-fallback — een
     erfstuk woog als een Slag (debug-sweep). Nieuwe zeldzaamheden hier meteen wegen. */
  const zp = { gewoon: 1, ongewoon: 2, zeldzaam: 4, episch: 4, gesmeed: 4, basis: 1, start: 1, vloek: 1 }[kdef(c).zeld] || 1;
  return zp + (c.up ? 1 : 0);
}
function gesmeedTekst(spec) {
  const delen = spec.modules.map(m => {
    const d = SMEED_MODULES[m.m], n = m.p * d.perPunt;
    if (m.m === 'schade') return `Doe <b>${n}</b> schade`;
    if (m.m === 'gif') return `Geef <b>${n}</b> Gif`;
    if (m.m === 'zwak') return `Geef Zwak <b>${n}</b>`;
    if (m.m === 'kwetsbaar') return `Geef Kwetsbaar <b>${n}</b>`;
    if (m.m === 'blok') return `Krijg <b>${n}</b> Blok`;
    if (m.m === 'doornen') return `Krijg Doornen <b>${n}</b>`;
    if (m.m === 'trek') return `Trek <b>${n}</b> kaart${n > 1 ? 'en' : ''}`;
    if (m.m === 'genees') return `Genees <b>${n}</b> HP`;
    if (m.m === 'licht') return `+<b>${n}</b> licht`;
    if (m.m === 'woede') return `Krijg <b>${n}</b> Kracht`;
    if (m.m === 'miasma') return `ALLE vijanden krijgen <b>${n}</b> Gif`;
    if (m.m === 'groei') return `Genees <b>${n}</b> HP en krijg <b>${n}</b> Blok`;
    return '';
  });
  let t = delen.join('. ') + '.';
  /* ✦ de vuur-bonus — het vuur sloeg er ongevraagd iets extra in */
  if (spec.bonus && SMEED_MODULES[spec.bonus.m]) {
    t += ` <span class="gesmeed-bonus">✦ ${gesmeedTekst({ modules: [spec.bonus] }).replace(/\.$/, '')}</span>`;
  }
  return t;
}
/* registreer de dynamische kaart-def — ook nodig bij het LADEN van een save
   (de dek-sanering in laadSpel gooit onbekende ids anders weg) */
function registreerGesmeed(id, spec) {
  KAARTEN[id] = {
    naam: spec.naam, zeld: 'gesmeed', gesmeed: true,
    kost: spec.kost, icoon: spec.icoon,
    type: spec.modules.some(m => SMEED_MODULES[m.m].doel) ? 'aanval' : 'vaardigheid',
    /* zonder doel-vlag routeert klikKaart NOOIT naar doelkeuze → schade/gif/zwak/
       kwetsbaar waren stille no-ops (review 27 aug; zat er al sinds de eerste versie).
       De verborgen vuur-bonus telt bewust NIET mee (zou hem in de UI verklappen). */
    doel: spec.modules.some(m => SMEED_MODULES[m.m].doel) ? 'vijand' : undefined,
    tekst: () => gesmeedTekst(spec),
    flavor: `Gesmeed op het Slachtblok, uit ${spec.offers.join(' en ')}.`,
    speel: (c, doel) => {
      const voer = (mid, n, d) => {
        const t = (d === undefined) ? doel : d;
        if (mid === 'schade') aanvalOp(t, n);
        else if (mid === 'gif') { if (t && !t.dood) geefGif(t, n); }
        else if (mid === 'zwak') { if (t && !t.dood) geefStatus(t, 'zwak', n); }
        else if (mid === 'kwetsbaar') { if (t && !t.dood) geefStatus(t, 'kwetsbaar', n); }
        else if (mid === 'blok') geefBlok(sp(), n);
        else if (mid === 'doornen') geefStatus(sp(), 'doornen', n);
        else if (mid === 'trek') trekKaarten(n);
        else if (mid === 'genees') geneesHp(n);
        else if (mid === 'licht') zetFakkel(n);
        else if (mid === 'woede') geefStatus(sp(), 'kracht', n);
        else if (mid === 'miasma') { if (S.gevecht) S.gevecht.vijanden.forEach(v => { if (!v.dood) geefGif(v, n); }); }
        else if (mid === 'groei') { geneesHp(n); geefBlok(sp(), n); }
      };
      spec.modules.forEach(m => voer(m.m, m.p * SMEED_MODULES[m.m].perPunt));
      /* ✦ de vuur-bonus: wat het vuur er ongevraagd in sloeg. Een doel-bonus op een
         doelloze kaart (bv. blok-kaart + schade-bonus) landt op de eerste levende vijand. */
      if (spec.bonus && SMEED_MODULES[spec.bonus.m]) {
        const bDoel = (SMEED_MODULES[spec.bonus.m].doel && !doel)
          ? ((S.gevecht && S.gevecht.vijanden.find(v => !v.dood)) || null) : doel;
        voer(spec.bonus.m, spec.bonus.p * SMEED_MODULES[spec.bonus.m].perPunt, bDoel);
      }
    }
  };
}
function laadGesmedeKaarten() {
  Object.entries((S && S.gesmeed) || {}).forEach(([id, spec]) => registreerGesmeed(id, spec));
  Object.entries(Codex.slachtblok || {}).forEach(([held, spec]) => registreerGesmeed('gesmeed_codex_' + held, spec));
}

/* wacht tot élke reveal-ceremonie gesloten is en voer dan fn uit — twee reveals
   over elkaar heen maakten de onderste onleesbaar (debug-sweep 27 aug) */
function naReveals(fn, eersteWacht) {
  const kijk = () => {
    if (document.querySelector('.scherf-reveal-overlay, .vloek-reveal-overlay, .kaart-reveal-overlay, .relikwie-reveal-overlay')) { setTimeout(kijk, 300); return; }
    fn();
  };
  setTimeout(kijk, eersteWacht || 350);
}

/* de smeedkamer-overlay. modus: 'altaar' (kaart meteen in het dek) of
   'dood' (kaart wacht in de Codex). naSluit = vervolg (bv. het baasgevecht). */
let _smeed = null;
function toonSlachtblok(modus, naSluit) {
  _smeed = { modus, naSluit, offers: [], punten: {}, kost: 1, icoon: SMEED_ICONEN[0], stap: 0 };
  let ov = document.getElementById('overlay-slachtblok');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'overlay-slachtblok';
    ov.className = 'roof-overlay slachtblok-overlay';
    document.body.appendChild(ov);
  }
  renderSlachtblok();
  requestAnimationFrame(() => ov.classList.add('open'));
  Klank.sfx('zwareklap');
}
/* kost-keuze weegt op het offer: 0⚡ is een ZWAAR privilege (−3 punten — gratis
   spelen is nooit gratis), 2⚡ verlicht het offer (+2 punten). Playtest: de
   oude −2 voelde als een gratis keuze. */
function smeedBudget() { return _smeed.offers.reduce((t, c) => t + offerWaarde(c), 0) + (_smeed.kost === 2 ? 2 : 0) - (_smeed.kost === 0 ? 3 : 0); }
function smeedBesteed() { return Object.values(_smeed.punten).reduce((t, p) => t + p, 0); }
function renderSlachtblok() {
  const ov = document.getElementById('overlay-slachtblok');
  const s = _smeed;
  if (!ov || !s) return;
  if (s.stap === 0) {
    /* stap 0: de PROLOOG — de speler staat eindelijk vóór de troonzaal van Act 3;
       dit moment mag epischer voelen dan een formulier (playtest 27 aug) */
    ov.innerHTML = `
      <div class="sb-proloog">
        <div class="sb-proloog-blok" data-vart="slachtblok_altaar">🪓</div>
        <h2 class="sb-proloog-titel">HET SLACHTBLOK</h2>
        ${s.modus === 'dood'
          ? `<p class="sb-proloog-tekst">Je ligt geveld — maar de diepte is nog niet klaar met je. Vóór het donker je opeist, gloeit naast je het blok waarop het regime alles slacht wat het afkeurt. <b>Eén laatste ruil.</b> Leg twee kaarten uit je gevallen dek op het blok: zij sterven met je mee, en uit hun as smeed je een wapen dat <b>verder leeft</b> — het wacht in het Schrijn op je volgende afdaling, draagbaar door elke held die het aandurft.</p>`
          : `<p class="sb-proloog-tekst">Vóór de troonzaal wacht geen wachter — maar een <b>blok</b>. Zwartgeblakerd, warm, geduldig. Hierop slacht het regime alles wat het afkeurt, en uit de resten smeedt het zijn wapens. Vannacht is de smid weg. Het vuur niet.<br><br>Leg twee kaarten op het blok. Zij sterven — voorgoed, deze afdaling. Uit hun as smeed jij <b>één wapen dat van jóú is</b>: jouw naam erin, jouw zegel erop. En dan: de DICKtator.</p>`}
        <div class="sb-balk">
          <button class="knop-stil" onclick="sluitSlachtblok(false)">Loop voorbij</button>
          <button class="knop-groot" onclick="_smeed.stap = 1; renderSlachtblok()">🪓 Treed naar het blok</button>
        </div>
      </div>`;
    if (typeof verfraaiItemArt === 'function') verfraaiItemArt(ov);
    return;
  }
  if (s.stap === 1) {
    /* stap 1: kies 2 offers uit je dek (vernietigd!) */
    ov.innerHTML = `
      <div class="roof-kop">🪓 HET SLACHTBLOK <span class="sb-stap">I · DE OFFERS</span><small>${s.modus === 'dood' ? '„De diepte biedt een laatste ruil." Offer twee kaarten uit je gevallen dek.' : 'Leg twee kaarten op het blok. Ze worden VERNIETIGD — voor de rest van de run.'}</small></div>
      <div class="roof-waaier">${S.dek.map(c => `
        <div class="roof-kaart sb-kaart ${s.offers.includes(c) ? 'gekozen' : ''}" data-uid="${c.uid}">
          <div class="rk-art">${kval(c, 'icoon') || '🃏'}</div>
          <div class="rk-naam">${knaam(c)}</div>
          <small class="sb-waarde">${offerWaarde(c)} pt</small>
        </div>`).join('')}</div>
      <div class="sb-balk">
        <button class="knop-stil" onclick="_smeed.stap = 0; renderSlachtblok()">◂ Terug</button>
        <button class="knop-groot" ${s.offers.length === 2 ? '' : 'disabled'} onclick="_smeed.stap = 2; renderSlachtblok()">🪓 Offer (${s.offers.length}/2)</button>
      </div>`;
    ov.querySelectorAll('.sb-kaart').forEach(el => el.onclick = () => {
      const c = S.dek.find(k => k.uid === +el.dataset.uid);
      if (!c) return;
      if (s.offers.includes(c)) s.offers = s.offers.filter(x => x !== c);
      else if (s.offers.length < 2) s.offers.push(c);
      Klank.sfx('klik');
      renderSlachtblok();
    });
    /* echte kaart-art in de offers (emoji is de terugval) — playtest: emoticons oogden kaal */
    if (window.laadKaartAfbeelding) S.dek.forEach(c => laadKaartAfbeelding(c.id, img => {
      const slot = ov.querySelector(`.sb-kaart[data-uid="${c.uid}"] .rk-art`);
      if (img && slot) slot.innerHTML = `<img src="${img.src}" alt="">`;
    }));
  } else {
    /* stap 2: verdeel het budget, kies kost + icoon, typ de naam — mét een LIVE
       voorvertoning: een tijdelijke kaart-def rendert door de échte kaart-render */
    const budget = smeedBudget(), besteed = smeedBesteed(), over = budget - besteed;
    registreerGesmeed('gesmeed_preview', {
      naam: (s.naam || '').trim().replace(/[<>&"]/g, '') || 'Naamloos',
      icoon: s.icoon, kost: s.kost,
      modules: Object.entries(s.punten).filter(([, p]) => p > 0).map(([m, p]) => ({ m, p })),
      offers: s.offers.map(knaam)
    });
    ov.innerHTML = `
      <div class="roof-kop">🪓 HET SLACHTBLOK <span class="sb-stap">II · HET SMEDEN</span><small>Offerwaarde: <b>${budget}</b> punten — nog <b class="${over < 0 ? 'sb-negatief' : ''}">${over}</b> te besteden. Max 2 effecten.</small></div>
      <div class="sb-werkbank">
        <div class="sb-preview ${besteed > 0 ? 'gloeit' : ''}">
          <div class="kaart-focus-houder"><div class="focus-rij">${kaartHtml({ id: 'gesmeed_preview', uid: 'sbpv', up: false }, false).replace('kaart groot', 'kaart groot kaart-focus')}</div></div>
          <small class="sb-preview-label">${besteed > 0 ? '— zo komt ze uit het vuur —' : 'kies je effecten…'}</small>
        </div>
        <div class="sb-modules">${Object.entries(SMEED_MODULES).filter(([, d]) => !d.held || d.held === S.held).map(([mid, d]) => {
          const p = s.punten[mid] || 0;
          const actieveModules = Object.keys(s.punten).filter(k => s.punten[k] > 0);
          const slotVol = actieveModules.length >= 2 && !p;
          return `<div class="sb-module ${p ? 'actief' : ''} ${slotVol ? 'uit' : ''} ${d.held ? 'sb-ader' : ''}" ${d.held ? `data-tip="De eigen ader van ${HELDNAAM(d.held)}: ${d.ader}. Alleen jíj kunt haar in het metaal slaan — daarna draagt iedereen haar."` : ''}>
            <span>${d.icoon} ${d.naam}${d.held ? ' <i class="sb-ader-ster">✦</i>' : ''}</span>
            <span class="sb-stepper">
              <button ${p ? '' : 'disabled'} onclick="smeedPunt('${mid}', -1)">−</button>
              <b>${p ? p * d.perPunt : '·'}</b>
              <button ${(over > 0 && !slotVol) ? '' : 'disabled'} onclick="smeedPunt('${mid}', 1)">+</button>
            </span>
          </div>`;
        }).join('')}</div>
      </div>
      <div class="sb-onder">
        <label class="sb-kost">Kost: ${[0, 1, 2].map(k => {
          const lbl = k === 0 ? '0⚡ −3pt' : k === 2 ? '2⚡ +2pt' : '1⚡';
          const tip = k === 0 ? 'Gratis spelen is nooit gratis: een 0-energie-kaart verzwaart het offer met 3 punten.' : k === 2 ? 'Een trage kaart verlicht het offer: +2 punten om te besteden.' : 'De standaardprijs van een slag.';
          return `<button class="${s.kost === k ? 'aan' : ''}" onclick="_smeed.kost=${k}; renderSlachtblok()" data-tip="${tip}">${lbl}</button>`;
        }).join('')}</label>
        <label class="sb-iconen">${SMEED_ICONEN.map(i => `<button class="${s.icoon === i ? 'aan' : ''}" onclick="_smeed.icoon='${i}'; renderSlachtblok()">${i}</button>`).join('')}</label>
        <input id="sb-naam" maxlength="20" placeholder="Geef je kaart een naam…" autocomplete="off">
      </div>
      <div class="sb-balk">
        <button class="knop-stil" onclick="_smeed.stap = 1; _smeed.punten = {}; renderSlachtblok()">◂ Andere offers</button>
        <button class="knop-groot" id="sb-smeed" ${(besteed > 0 && over >= 0) ? '' : 'disabled'} onclick="smeedKaart()">🔥 SMEED</button>
      </div>
      <p class="sb-bestemming">${s.modus === 'dood'
        ? '🕯️ Ze overleeft je val: ze wacht in het Schrijn — élke held mag haar bij een volgende afdaling dragen (vervangt een startkaart, 3 ladingen).'
        : '⚔️ Ze schuift meteen in je dek — en vecht zo dadelijk mee tegen de DICKtator.'}</p>`;
    const inp = ov.querySelector('#sb-naam');
    inp.value = s.naam || '';   /* via de property, nooit het attribuut: een "-teken brak de waarde stil (debug-sweep) */
    /* naam live op de preview-kaart meeschrijven zonder re-render (focusbehoud); markup-tekens meteen weren */
    inp.oninput = () => {
      if (/[<>&"]/.test(inp.value)) inp.value = inp.value.replace(/[<>&"]/g, '');
      s.naam = inp.value;
      const naamEl = ov.querySelector('.sb-preview .kaart-naam, .sb-preview .k-naam, .sb-preview b');
      if (naamEl) naamEl.textContent = (s.naam || '').trim() || 'Naamloos';
    };
    if (typeof verfraaiKaartIconen === 'function') verfraaiKaartIconen(ov);
  }
}
function smeedPunt(mid, d) {
  const s = _smeed;
  if (!s || !SMEED_MODULES[mid]) return;
  /* harde grenzen (de knoppen zijn al gedisabled, maar vertrouw ze niet):
     nooit boven het budget, nooit meer dan 2 actieve modules */
  if (d > 0) {
    if (smeedBesteed() >= smeedBudget()) return;
    const actief = Object.keys(s.punten).filter(k => s.punten[k] > 0);
    if (actief.length >= 2 && !s.punten[mid]) return;
  }
  s.punten[mid] = Math.max(0, (s.punten[mid] || 0) + d);
  if (!s.punten[mid]) delete s.punten[mid];
  Klank.sfx('klik');
  renderSlachtblok();
}
function smeedKaart() {
  const s = _smeed;
  if (!s || smeedBesteed() === 0 || smeedBesteed() > smeedBudget()) return;   /* nooit gratis of boven budget smeden */
  const naam = (s.naam || '').trim().replace(/[<>&"]/g, '') || 'De Naamloze';   /* naam belandt in innerHTML → strip markup-tekens */
  /* de overschrijf-vraag KOMT EERST — vóór er ook maar iets vernietigd wordt.
     Annuleren ná de vernietiging liet twee dode offers en een vastgelopen
     stap I ('Offer 2/2' zonder deselecteerbare kaarten) achter (debug-sweep). */
  if (s.modus === 'dood') {
    const oud = Codex.slachtblok && Codex.slachtblok[S.held];
    if (oud && (oud.charges || 0) > 0 && !s.overschrijfOk) {
      bevestig(`Het blok draagt al jouw „${oud.naam}" (nog ${oud.charges} lading${oud.charges === 1 ? '' : 'en'}). Een nieuw werk verdringt het oude — voorgoed. Doorzetten?`,
        () => { if (_smeed) { _smeed.overschrijfOk = true; smeedKaart(); } }, '🔥 Smeed toch');
      return;
    }
  }
  const spec = {
    naam, icoon: s.icoon, kost: s.kost,
    maker: S.held,                                   /* wie haar smeedde — de kaart blijft voor iedereen draagbaar */
    modules: Object.entries(s.punten).filter(([, p]) => p > 0).map(([m, p]) => ({ m, p })),
    offers: s.offers.map(knaam),
    datum: new Date().toLocaleDateString('nl-BE')
  };
  /* ✦ DE VUUR-BONUS: soms slaat het vuur er ongevraagd iets extra in — een kleine,
     onverwachte gift die je pas op de reveal ontdekt (ontwerplijn: ontdekkingen cryptisch) */
  if (willekeurig() < 0.35) {
    const pool = ['schade', 'blok', 'gif', 'genees', 'licht', 'trek'].filter(m2 => !spec.modules.some(md => md.m === m2));
    if (pool.length) spec.bonus = { m: kiesUit(pool), p: 1 };
  }
  /* de offers sterven — voorgoed deze run */
  S.dek = S.dek.filter(c => !s.offers.includes(c));
  schudScherm(); Klank.sfx('zwareklap'); setTimeout(() => Klank.sfx('schitter'), 400);
  if (s.modus === 'dood') {
    /* de kaart wacht in de Codex op je volgende run (één slot per held, 3 ladingen) */
    spec.charges = 3;
    Codex.slachtblok = Codex.slachtblok || {};
    Codex.slachtblok[S.held] = spec;
    bewaarCodex();
    registreerGesmeed('gesmeed_codex_' + S.held, spec);
    melding(`🪓 „${naam}" is gesmeed — ze wacht in het Schrijn met 3 ladingen, draagbaar voor élke held.${spec.bonus ? ' Het vuur siste na — alsof het er iets bij smeedde…' : ''}`);
  } else {
    const id = 'gesmeed_run_' + (++S.uid);
    S.gesmeed = S.gesmeed || {};
    S.gesmeed[id] = spec;
    registreerGesmeed(id, spec);
    S.dek.push(nieuweKaart(id));
    saveSpel();
    toonKaartReveal(id, { kop: '🪓 GESMEED OP HET SLACHTBLOK', klank: 'schitter', flavor: spec.bonus ? 'Het vuur sloeg er ongevraagd iets extra in.' : undefined });
  }
  sluitSlachtblok(true);
}
function sluitSlachtblok(gesmeed) {
  const ov = document.getElementById('overlay-slachtblok');
  const na = _smeed && _smeed.naSluit;
  _smeed = null;
  delete KAARTEN.gesmeed_preview;   /* de tijdelijke voorvertonings-def ruimt zichzelf op */
  if (ov) { ov.classList.remove('open'); setTimeout(() => ov.remove(), 450); }
  if (!gesmeed) Klank.sfx('klik');
  /* het vervolg (bv. de DICKtator-intro) wacht tot de kaart-reveal gesloten is —
     anders speelde de hele baasintro achter de reveal-overlay (debug-sweep) */
  if (na) { if (gesmeed) naReveals(na, 900); else setTimeout(na, 250); }
}
/* DEV: het Slachtblok direct testen — devSlachtblok() in de console */
function devSlachtblok() {
  if (!S) nieuwSpel('slachter');
  if (S.dek.length < 8) { const pool = heldPool(); let v = 0; while (S.dek.length < 12 && v++ < 30) S.dek.push(nieuweKaart(kiesUit(pool))); }
  toonSlachtblok('altaar', null);
}

function devSprongAct2() {
  if (!S) nieuwSpel('slachter');
  if (inGevecht()) stopGevechtLus();
  S.gevecht = null;
  S.act = 2;
  S.fakkel = fakkelMax();
  S.pos = null;
  /* DEV-testbuffer: ruime HP + volle heeldrank-slots zodat je Act 2-vijanden grondig kunt
     bekijken/uittesten zonder meteen te sneuvelen (DEV-SHORTCUT — weg vóór release). */
  S.maxHp = Math.max(S.maxHp || 0, 150);
  S.hp = S.maxHp;
  S.dranken = [];
  while (S.dranken.length < drankSlots()) S.dranken.push('heeldrank');
  delete S.beloning; delete S.winkel; delete S.huidigEvent;
  S.kaart = genereerKaart();   /* act-bewust → de Act 2-ladder */
  /* DEV: leg de drie Drops-scherven in je GEDRAGEN tas zodat je de Erfprins-fluister én het
     Drempel-trio kunt testen — maar NOOIT een verdiende unlock terugdraaien of een gratis
     trio geven aan wie Drops al wekte (dit hangt aan een gewone logo-klik; review 27 aug). */
  S.metgezel = null;
  const drempelTest = !isOntgrendeld('drops');
  if (drempelTest) (window.MYSTERIES && MYSTERIES.drops.vereist || []).forEach(sid => draagScherf(sid));
  saveSpel();
  melding(`⚡ DEV: Act 2 — 150 HP + 3 heeldranken${drempelTest ? ' + de 3 Drops-scherven in je tas' : ''}. (Alt+klik = meteen de Erfprins · Shift+klik = Drops-testcyclus)`);
  renderKaartScherm();
}
/* DEV: de Drempel direct testen — devDrempel() in de console geeft je desgewenst
   eerst testscherven mee: devDrempel(['drops_baas','drops_figuur','mosgeest_baas']).
   (DEV-SHORTCUT — weg vóór release) */
function devDrempel(testScherven) {
  if (!S) nieuwSpel('slachter');
  (testScherven || []).forEach(sid => draagScherf(sid));
  S.act = 2;
  toonDrempel();
}

/* DEV-SHORTCUT (Alt+klik op het logo): spring meteen SOLO tegen de Erfprins, zodat je de
   Roof-rework niet door een hele Act 2-run hoeft te bevechten. Geen metgezel/Drops-mutatie
   (schone solo-test) + een geloofwaardig Act-2-dek (de Roof grist de helft, dus een kaal
   startdek van 10 maakt de test onspeelbaar) + ruime HP/heeldranken. Weg vóór release. */
function devErfprins() {
  if (!S) nieuwSpel('slachter');
  if (inGevecht()) stopGevechtLus();
  S.gevecht = null; S.act = 2; S.fakkel = fakkelMax();
  S.maxHp = Math.max(S.maxHp || 0, 150); S.hp = S.maxHp;
  S.dranken = []; while (S.dranken.length < drankSlots()) S.dranken.push('heeldrank');
  if (S.dek.length < 16) {
    const pool = heldPool();
    let veiligheid = 0;
    while (S.dek.length < 18 && pool.length && veiligheid++ < 40) S.dek.push(nieuweKaart(kiesUit(pool)));
  }
  saveSpel();
  startGevecht(['de_erfprins'], 'baas', 15);   /* betreedt zelf het gevechtscherm */
  melding('⚡ DEV: meteen tegen de Erfprins (SOLO, geen metgezel) — 150 HP + 3 heeldranken + opgevuld dek. Test "De Roof".');
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
  if (e && e.ctrlKey && e.altKey) { devDicktator(); return; }   /* Ctrl+Alt+klik = meteen de DICKtator */
  if (e && e.altKey) { devErfprins(); return; }       /* Alt+klik = meteen SOLO tegen de Erfprins (schone Roof-test) */
  if (e && e.shiftKey) { devDropsTest(); return; }     /* Shift+klik = Drops-testcyclus (spawnt/schrijft) */
  if (e && e.ctrlKey) { devSprongAct3(); return; }     /* Ctrl+klik = Act 3-sprong (Slachtblok-test) */
  devMenu();                                           /* gewone klik = het DEV-menu (alles op een rij; een kale klik sprong vroeger meteen naar Act 2 — te gevaarlijk, zie debug-sweep) */
}

/* DEV-SHORTCUT: metgezel aan/uit voor tests (synergie, Roddel-vloek, topbalk-chip,
   victory-poses). In een lopend gevecht stapt hij pas het VOLGENDE gevecht in
   (g.metgezel wordt bij startGevecht gebouwd — de v70-les). Weg vóór release. */
function devMetgezel(id) {
  if (!S) nieuwSpel('slachter');
  if (!id) { S.metgezel = null; renderTopbalk(); melding('⚡ DEV: metgezel weggestuurd.'); return; }
  if (!METGEZELLEN[id]) { melding('⚡ DEV: onbekende metgezel: ' + id); return; }
  geefMetgezel(id);
  melding(`⚡ DEV: ${METGEZELLEN[id].naam} stapt in${inGevecht() ? ' — vanaf het volgende gevecht' : ''}.`);
}

/* DEV-SHORTCUT: meteen tegen de Slijmkoning (Act 1-baas) — met buffer zoals de
   andere baas-sprongen. Weg vóór release. */
function devSlijmkoning() {
  if (!S) nieuwSpel('slachter');
  if (inGevecht()) stopGevechtLus();
  S.gevecht = null; S.act = 1; S.fakkel = fakkelMax();
  S.maxHp = Math.max(S.maxHp || 0, 150); S.hp = S.maxHp;
  S.dranken = []; while (S.dranken.length < drankSlots()) S.dranken.push('heeldrank');
  if (S.dek.length < 14) { const pool = heldPool(); let v = 0; while (S.dek.length < 16 && v++ < 40) S.dek.push(nieuweKaart(kiesUit(pool))); }
  saveSpel();
  startGevecht(['slijmkoning'], 'baas', 13);
  melding('⚡ DEV: meteen tegen de Slijmkoning — 150 HP + heeldranken + opgevuld dek.');
}

/* DEV-SHORTCUT: de Erfprins als EERSTE ontmoeting — reset de teller zodat de
   Inventaris-intro (en orakel[0]) opnieuw speelt. Weg vóór release. */
function devErfprinsIntro() {
  Codex.erfprinsOntmoetingen = 0;
  bewaarCodex();
  devErfprins();
}

/* DEV-SHORTCUT — HET DEV-MENU (logo-klik): alle testsprongen op een rij, zodat de
   modifier-combinaties niet uit de hand lopen. Knoppen via listeners (nooit data in
   onclick-strings — bekende bugklasse). Zoek 'DEV-SHORTCUT' om alles te wissen. */
function devMenu() {
  const oud = document.getElementById('dev-menu');
  if (oud) { oud.remove(); return; }   /* tweede klik = toggle dicht */
  const groepen = [
    ['Spring', [
      ['🗺️ Act 2', () => devSprongAct2()],
      ['🌋 Act 3', () => devSprongAct3()],
    ]],
    ['Bazen', [
      ['🫠 Slijmkoning', () => devSlijmkoning()],
      ['🤴 Erfprins', () => devErfprins()],
      ['🃏 Erfprins · 1e ontmoeting (intro)', () => devErfprinsIntro()],
      ['👑 DICKtator', () => devDicktator()],
    ]],
    ['Metgezel (in gevecht: vanaf het volgende)', [
      ['🐕 Drops', () => devMetgezel('drops')],
      ['🛡️ Vlamwacht', () => devMetgezel('vlamwachter')],
      ['🍃 Mosgeest', () => devMetgezel('mosgeest')],
      ['🤍 De Witte', () => devMetgezel('drops_wit')],
      ['✕ weg', () => devMetgezel(null)],
    ]],
    ['Ritueel & boog', [
      ['🜂 Drempel + Drops-trio', () => devDrempel(['drops_baas', 'drops_figuur', 'drops_episch'])],
      ['🪓 Slachtblok', () => devSlachtblok()],
      ['🐾 Drops-cyclus', () => devDropsTest()],
      ['🎬 Outro', () => { if (typeof devOutro === 'function') devOutro(); }],
    ]],
  ];
  const ov = document.createElement('div');
  ov.id = 'dev-menu';
  ov.className = 'overlay open';
  ov.innerHTML = `<div class="dev-kaart"><h3>⚡ DEV-menu</h3>
    ${groepen.map(([kop]) => `<small class="dev-kop">${kop}</small><div class="dev-rij"></div>`).join('')}
    <button class="knop-stil dev-dicht" type="button">Sluit</button>
    <small class="dev-voet">modifiers op het logo blijven werken: Alt=Erfprins · Ctrl=Act 3 · Ctrl+Alt=DICKtator · Shift=Drops-cyclus</small>
  </div>`;
  document.body.appendChild(ov);
  const rijen = ov.querySelectorAll('.dev-rij');
  groepen.forEach(([, knoppen], i) => knoppen.forEach(([label, doe]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'knop-stil dev-k'; b.textContent = label;
    b.addEventListener('click', () => { ov.remove(); doe(); });
    rijen[i].appendChild(b);
  }));
  ov.querySelector('.dev-dicht').onclick = () => ov.remove();
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
}

/* DEV-SHORTCUT: meteen tegen de DICKtator — met een geloofwaardig dek (het Decreet
   vreet kaarten, dus een kaal startdek van 10 maakt de test zinloos) + ruime HP.
   Ook als devDicktator() in de console. Weg vóór release. */
function devDicktator() {
  if (!S) nieuwSpel('slachter');
  if (inGevecht()) stopGevechtLus();
  S.gevecht = null;
  S.act = 3;
  S.fakkel = fakkelMax();
  S.pos = null;
  S.maxHp = Math.max(S.maxHp || 0, 150);
  S.hp = S.maxHp;
  S.dranken = [];
  while (S.dranken.length < drankSlots()) S.dranken.push('heeldrank');
  delete S.beloning; delete S.winkel; delete S.huidigEvent;
  /* dek aandikken tot ±20 kaarten zodat het Decreet iets te vreten heeft
     (zelfde patroon als devErfprins: uit de eigen heldPool) */
  if (S.dek.length < 18) {
    const pool = heldPool();
    let veiligheid = 0;
    while (S.dek.length < 20 && pool.length && veiligheid++ < 40) S.dek.push(nieuweKaart(kiesUit(pool)));
  }
  S.kaart = genereerKaart();
  saveSpel();
  melding('⚡ DEV: rechtstreeks naar de DICKtator — 150 HP, dek aangedikt tot 20.');
  startGevecht(['de_dicktator'], 'baas', 12);
}

/* DEV-SHORTCUT: spring meteen naar Act 3 (het Slachtblok) om het roster te testen
   zonder Act 1-2 door te spelen. Act 3 is live (ACTS_MAX=3). Weg vóór release. */
function devSprongAct3() {
  if (!S) nieuwSpel('slachter');
  if (inGevecht()) stopGevechtLus();
  S.gevecht = null;
  S.act = 3;
  S.fakkel = fakkelMax();
  S.pos = null;
  S.maxHp = Math.max(S.maxHp || 0, 150);
  S.hp = S.maxHp;
  S.dranken = [];
  while (S.dranken.length < drankSlots()) S.dranken.push('heeldrank');
  delete S.beloning; delete S.winkel; delete S.huidigEvent;
  S.kaart = genereerKaart();   /* act-bewust → de Act 3-ladder */
  saveSpel();
  melding('⚡ DEV: Act 3 — Het Slachtblok. 150 HP + volle heeldranken. (Baas-node = nog de Slijmkoning tot de DICKtator er is.)');
  renderKaartScherm();
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
  /* gegroepeerd per maaksel (familie): scherven van één trio staan naast elkaar en delen
     hun gloedkleur — de eerlijke bescherming tegen de fout-trio-val (playtest) */
  const famVolgorde = ['drops', 'vlamwachter', 'mosgeest'];
  const fam = sid => { const d = scherfDef(sid); return Math.max(0, famVolgorde.indexOf(d && d.mid)); };
  pool.sort((a, b) => fam(a) - fam(b));
  const famKlasse = sid => { const d = scherfDef(sid); return d ? `fam-${d.mid}` : ''; };

  const nissen = [0, 1, 2].map(i => {
    const sid = drempelGeplaatst[i];
    if (sid) { const d = scherfDef(sid); return `<button class="drempel-nis vol ${famKlasse(sid)}" onclick="drempelHaalWeg(${i})"><span class="dn-icoon" data-shart="${sid}">${bronIcoon(d && d.bron)}</span><i>${(d && d.codexTekst) || '…'}</i></button>`; }
    return `<div class="drempel-nis leeg">◇</div>`;
  }).join('');
  /* de teksten kijken naar wat je DRAAGT (tas + nissen), niet naar de restpool — anders
     verscheen de beginnersuitleg precies wanneer je trio in de nissen lag en verdween de
     kleurhint op het beslismoment (review 27 aug) */
  const geplaatstIets = drempelGeplaatst.some(Boolean);
  const draagtIets = gedragen().length > 0 || geplaatstIets;
  const nooitIets = !draagtIets && !scherfStash().length
    && !Object.keys(window.MYSTERIES || {}).some(mid => isOntgrendeld(mid));
  const poolHtml = pool.length
    ? pool.map(sid => { const d = scherfDef(sid); return `<button class="drempel-scherf ${famKlasse(sid)}" onclick="drempelPlaats('${sid}')"><span class="ds-icoon" data-shart="${sid}">${bronIcoon(d && d.bron)}</span><i>${(d && d.codexTekst) || '…'}</i></button>`; }).join('')
    : (geplaatstIets
      ? `<p class="drempel-leeg">Al je scherven liggen in de nissen.</p>`
      : nooitIets
        ? `<p class="drempel-leeg">Je draagt nog geen scherven — maar ze bestáán. Voorbij deze poort liggen ze verscholen: bij wat groots en episch is <small>🜂</small>, bij figuren die je de weg wijzen <small>🪞</small>, en bij de prins die alles kopieert <small>👑</small>. Wat je vindt, overleeft zelfs je dood. Drie scherven van één maaksel, en het zwart antwoordt.</p>`
        : `<p class="drempel-leeg">Je draagt nog geen scherven. Ze liggen verspreid in de diepte — verzamel er drie, en wáág de drempel.</p>`);
  const vol = drempelGeplaatst.filter(Boolean).length === 3;
  $('#scherm-einde').innerHTML = `
    <div class="drempel-scene">
      <h2 class="scherm-titel goud-tekst">🜂 De Drempel</h2>
      <p class="scherm-sub drempel-lore">Voor je gaapt de poort naar de diepte. Drie lege nissen, koud en geduldig. „Voed de drempel met drie scherven," fluistert iets ouds, „en het zwart antwoordt. Maar niet alles dat ontwaakt, is je gunstig gezind — dat besef je pas als het je aankijkt."</p>
      <div class="drempel-nissen">${nissen}</div>
      <p class="drempel-poollabel">${(pool.length || geplaatstIets) ? 'Je scherven — plaats er drie. <span class="drempel-kleurhint">Scherven van één maaksel gloeien in dezelfde kleur.</span>' : ''}</p>
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
  if (!mid) {
    /* fout trio = een gok met echte inzet (3 scherven verbrand + de Wachter) — de kost is
       transparant VOORAF, de precieze straf blijft ontdekking (ontwerplijn 27 aug) */
    bevestig('De nissen verzetten zich — deze drie zijn niet van één maaksel. Wat je plaatst en fout gokt, ben je kwíjt… en iets achter de poort roert zich. Toch doorzetten?', () => drempelVoltrek(ids), '🔥 Doorzetten');
    return;
  }
  drempelVoltrek(ids);
}
function drempelVoltrek(ids) {
  const mid = scherfTrio(ids);
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
  S.fakkel = fakkelMax();         /* episch: het laatste licht van de baas → je fakkel laait op (Schaduwboekhouding klemt op 60) */
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
       BEWUST komt er deze run ook geen vervanger: na De Laatste Sprong daal je alleen
       verder af — de rouw is voelbaar. De rotatie draait de vólgende run gewoon weer. */
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
  /* het normale pad haalt het einde-scherm → de pending-felicitatie mag weg */
  try { localStorage.removeItem('slayit_einde_pending'); } catch (e) {}
  /* winst = de epische plaat, verlies = de nederlaag-plaat (per act) */
  schermAchtergrond('einde', gewonnen ? actBg('overwinning') : actBg('nederlaag'),
    gewonnen ? 0.45 : 0.5);
  Klank.muziek('stil');
  const st = S.stats;
  const held = huidigeHeld();
  /* loopbaan bijwerken — exact één keer per run (guard op S). Speelde de outro
     eerst, dan is er al geregistreerd en reist de uitslag mee via S._uitslagVooraf. */
  let uitslag = S._uitslagVooraf || { nieuwRecord: false, beste: 0 };
  const versGevonden = gedragen().filter(sid => !(S.loadoutScherven || []).includes(sid)).length;   /* vóór het wissen hieronder, voor mysterieDuiding */
  if (!S.runGeregistreerd) {
    uitslag = registreerRun(gewonnen);
    if (S.daily) { const du = registreerDaily(gewonnen); S.dailyNieuweTop = du.nieuweTop; wisSave(); }
    if (gewonnen) bankGedragen();   /* overleefd → ALLE gedragen scherven bankt veilig op de stash */
    else {
      /* DOOD: wat je tíjdens de run VOND blijft behouden (bank het), enkel de bewust MEEGEBRACHTE
         loadout is de inzet en gaat verloren. Zo groeit je verzameling ook bij een mislukte afdaling. */
      const loadout = (S.loadoutScherven || []);
      gedragen().slice().filter(sid => !loadout.includes(sid)).forEach(bankScherf);
      if (S) S.scherven = [];
    }
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
    ${!gewonnen ? mysterieDuiding(versGevonden) : ''}
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
        ${dScore.wetBonus ? `<span>${dScore.wet.icoon} dagwet ${dScore.wet.naam} +${Math.round(dScore.wet.scoreBonus * 100)}%</span><b>${dScore.wetBonus}</b>` : ''}
      </div>
      <p class="daily-reeks">🔥 Speelreeks: ${Daily.reeks} dag${Daily.reeks === 1 ? '' : 'en'}${Daily.besteReeks > Daily.reeks ? ` · beste: ${Daily.besteReeks}` : ''}</p>
      <div class="einde-syn">
        ${(window.Online && Online.isLid())
          ? `<button class="knop-stil einde-syn-knop" onclick="deelDagScore()">📣 Daag je syndicaat uit</button><span class="einde-syn-rang" id="einde-syn-rang"></span>`
          : `<button class="knop-stil einde-syn-knop" onclick="deelDagScore()">📣 Daag je vrienden uit</button>
             <button class="knop-stil" onclick="toonLeaderboard()" data-tip="Sticht een syndicaat: één code, en jullie vechten op hetzelfde dagbord.">🏴 Sticht een syndicaat</button>`}
      </div>
      ${(!gewonnen && window.Online && Online.actief()) ? `
      <div class="graf-blok" id="graf-blok">
        <div class="graf-kop">⚰️ Laat een grafschrift na <small>op rij ${S.verdieping}, de plek waar jij viel — wie vandaag dezelfde afdaling doet, vindt jouw zerk</small></div>
        ${Online.isLid() ? `
        <div class="graf-rij">
          <input id="graf-tekst" maxlength="120" placeholder="Je laatste woorden — daag ze uit…" autocomplete="off">
          <button class="knop-stil" onclick="grafSuggestie()" data-tip="rol een verse provocatie">🎲</button>
          <button class="knop-stil" id="graf-verstuur" onclick="stuurGrafschriftUI()">⚰️ Verstuur</button>
        </div>`
        : `
        <p class="graf-gate">${Online.isZwerver()
            ? 'Een zerk heeft <b>bezoekers</b> nodig: als zwerver daal je alleen af, dus niemand komt langs je graf. Sluit je aan bij een posse en je laatste woorden krijgen publiek.'
            : 'Je hebt eerst een <b>strijdnaam en een posse</b> nodig — dan vinden je genoten je zerk op de plek waar jij viel.'}</p>
        <button class="knop-stil graf-gate-knop" onclick="toonLeaderboard()">🏴 ${Online.isZwerver() ? 'Sluit je aan bij een posse' : 'Kies je strijdnaam'}</button>`}
      </div>` : ''}
    </div>` : ''}
    <p class="einde-loopbaan">${loopbaanRegel()}${uitslag.nieuwRecord ? ' <span class="einde-record">🏆 nieuw diepterecord!</span>' : ''}</p>
    <p class="einde-seed">Seed: ${S.seed} · ${held.naam}</p>
    <div class="einde-knoppen">
      ${S.daily ? '' : '<button class="knop-groot" onclick="startNieuw()">⚔️ Opnieuw afdalen</button>'}
      ${(!gewonnen && huidigeAct() >= 3 && !S.daily && S.dek.length >= 3 && !S.doodsSmeedGedaan)
        ? `<button class="knop-groot sb-doodsknop" onclick="S.doodsSmeedGedaan = true; toonSlachtblok('dood', null); this.remove()">🪓 De laatste ruil</button>` : ''}
      <button class="knop-stil" onclick="kopieerUitdaagcode()" data-tip="Deel deze seed — speel dezelfde run">📋 Uitdaagcode</button>
      <button class="knop-stil" onclick="naarTitel()">Naar het begin</button>
    </div>
    ${besteHeld ? `<p class="einde-doel">Diepste val met ${held.naam}: rij ${besteHeld}${!gewonnen ? ' — versla de baas op rij 13' : ''}</p>` : ''}`;
  /* daily + syndicaat: vul asynchroon je plek op het dagbord in */
  if (dScore && window.Online && Online.isLid()) vulEindeSynRang();
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
    /* de lokroep: laat vooraf zien wélke wet en held vandaag gelden */
    const wet = DAGWETTEN[wetVanDag()];
    const tipDelen = [`${wet.icoon} Vandaag: ${wet.naam} · held: ${SPELERS[heldVanDag()].naam}`];
    if (Daily.reeks > 0) tipDelen.push(`🔥 Speelreeks: ${Daily.reeks} dag${Daily.reeks === 1 ? '' : 'en'}${Daily.besteReeks > Daily.reeks ? ` · beste: ${Daily.besteReeks}` : ''}`);
    db.setAttribute('data-tip', tipDelen.join(' — '));
  }
}

function startNieuw() {
  /* de eerste keer gaat de proloog vóór de afdaling (PROLOOG.md: firstRun);
     wie hem al speelde (of bewust oversloeg) daalt meteen af.
     PROBE-WRITE eerst: als setItem gooit (vol/privé-modus) kan de proloog zijn
     sleutels nooit wegschrijven → zonder deze check zit je in een eeuwige
     redirect-lus proloog↔game. Storage kapot? Dan gewoon meteen afdalen. */
  try {
    localStorage.setItem('slayit_probe', '1');
    localStorage.removeItem('slayit_probe');
    if (!localStorage.getItem('slayit_proloog') && !localStorage.getItem('slayit_proloog_over')) {
      location.href = 'proloog/';
      return;
    }
  } catch (e) {}
  toonHeldKeuze();
}

/* de start-effecten van een dagwet — draait direct na nieuwSpel (Toeval staat
   dan al op de dag-seed → de dekswap is voor iedereen identiek) */
function pasDagwetStartToe(wetId) {
  if (wetId === 'amalgaam') {
    /* drie startkaarten wijken voor drie vreemde: gewoon/ongewoon van ANDERE
       helden, act-1-waardig — een voorproefje van de gemengde pools */
    const vreemd = Object.keys(KAARTEN).filter(id => {
      const k = KAARTEN[id];
      return ['gewoon', 'ongewoon'].includes(k.zeld) && k.held && k.held !== S.held && (!k.act || k.act <= 1);
    });
    const gekozen = [];
    let poging = 0;
    while (gekozen.length < 3 && poging++ < 60 && vreemd.length) {
      const id = vreemd[Math.floor(Toeval.volgende() * vreemd.length)];
      if (!gekozen.includes(id)) gekozen.push(id);
    }
    gekozen.forEach(id => {
      const idx = S.dek.findIndex(c => kdef(c).type !== 'vloek');
      if (idx >= 0) S.dek.splice(idx, 1);
      S.dek.push(nieuweKaart(id));
    });
    S.dagwetVreemd = gekozen.map(id => KAARTEN[id].naam);   /* de proclamatie toont ze */
  } else if (wetId === 'goudkoorts') {
    S.goud = 0;   /* berooid het duister in — de dubbele buit moet het goedmaken */
  } else if (wetId === 'besmetting') {
    S.dek.push(nieuweKaart('laster'));   /* de vloek zit er vanaf kamer één in */
  } else if (wetId === 'overname') {
    /* de annexatie: alle niet-vloek-kaarten wijken voor het volledige startdek
       van de vreemde held; vloeken (en wat er ooit nog vóór dit punt inkwam)
       verhuizen mee. Passief-relikwie en HP blijven van je eigen held. */
    const ander = vreemdeHeldVanDag();
    const vloeken = S.dek.filter(c => kdef(c).type === 'vloek');
    S.dek = SPELERS[ander].dek.map(id => nieuweKaart(id)).concat(vloeken);
    S.dagwetVreemd = [`het volledige startdek van ${SPELERS[ander].naam}`];
  } else if (wetId === 'detachering') {
    /* het effect zelf zit in heldPool(); hier alleen de proclamatie-chip */
    S.dagwetGeschenken = [`kaartaanbod uit het gilde van ${SPELERS[vreemdeHeldVanDag()].naam}`];
  }
}

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
  /* een LOPENDE gewone run niet stil vernietigen: de wisSave hieronder is permanent
     (incl. gedragen scherven). Eén bevestiging beschermt tegen een mis-klik op de titel. */
  const bestaande = (() => { try { return JSON.parse(localStorage.getItem(SAVE_SLEUTEL) || 'null'); } catch (e) { return null; } })();
  if (bestaande && !bestaande.daily && !startDaily._bevestigd) {
    bevestig(
      `Je hebt nog een <b>lopende afdaling</b> (verdieping ${(bestaande.verdieping || 0) + 1}).<br><br>De Dagelijkse afdaling <b>wist die run voorgoed</b> — ook de scherven die je bij je draagt.`,
      () => { startDaily._bevestigd = true; try { startDaily(); } finally { startDaily._bevestigd = false; } },
      '🗓️ Toch starten'
    );
    return;
  }
  Klank.sfx('klik');
  try {
    const oudeRun = JSON.parse(localStorage.getItem(SAVE_SLEUTEL) || 'null');
    if (oudeRun && Array.isArray(oudeRun.scherven)) {
      const lo2 = Array.isArray(oudeRun.loadoutScherven) ? oudeRun.loadoutScherven : [];
      oudeRun.scherven.filter(sid => !lo2.includes(sid)).forEach(sid => bankScherf(sid));   /* gevonden scherven overleven het wissen (debug-sweep) */
    }
  } catch (e) {}
  wisSave();
  Daily.laatsteStart = vandaagSleutel(); bewaarDaily();   /* poging verbruikt bij START → geen farmen */
  schrijnKeuzes = [];                       /* geen Schrijn-meeneem in de daily */
  scherfKeuzes = [];                        /* idem geen scherf-loadout in de daily (eerlijk veld) — anders lekte een eerder in 'Kies je held' geselecteerde scherf de daily in én uit je stash */
  slachtblokKeuzes = [];                    /* idem geen gesmede kaart in de daily */
  const held = heldVanDag();
  nieuwSpel(held, dagSeed(), 0, true);      /* vaste seed, ascensie 0, daily=true → eerlijk veld */
  S.dailyDag = vandaagSleutel();
  /* DE DAGWET: vandaag geldt één wet — vóór de dag-relikwieën toegepast zodat
     de Toeval-volgorde (dekswap → relikwieën) voor iedereen identiek is */
  const wetId = wetVanDag();
  S.dagwet = wetId;
  const wet = DAGWETTEN[wetId];
  pasDagwetStartToe(wetId);
  /* MEER RANDOM (playtest): dag-seeded relikwieën spicen het veld op — de seed
     staat al op de dag, dus iedereen krijgt vandaag DEZELFDE (Besmetting: 3) */
  const dagRelikwieen = [];
  const relAantal = wetId === 'besmetting' ? 3 : 2;
  for (let i = 0; i < relAantal; i++) { const r = willekeurigRelikwie(); if (r) { geefRelikwie(r, false, true); dagRelikwieen.push(RELIKWIEEN[r].naam); } }   /* stil: bulk bij runstart, de dagwet somt ze zelf op */
  /* CONCAT, niet overschrijven: pasDagwetStartToe kan al een chip gezet hebben
     (De Detachering noemt daar de vreemde held) — die mag niet verloren gaan */
  S.dagwetGeschenken = (Array.isArray(S.dagwetGeschenken) ? S.dagwetGeschenken : []).concat(dagRelikwieen);
  laadDagGraven();   /* de graven van je posse: wie viel vandaag al, en waar? */
  /* DE NALATENSCHAP: viel een genoot vandaag al, dan wacht zijn beste kaart
     onderweg op je (geïnjecteerd in je eerste gevechtsbeloning) */
  S.nalatenschap = null; S.nalatenschapGevonden = false;
  if (window.Online && Online.isLid()) {
    Online.haalNalatenschap(vandaagSleutel()).then(r => {
      if (r && S && S.daily && KAARTEN[r.kaart]) S.nalatenschap = { van: r.naam, kaart: r.kaart };
    }).catch(() => {});
  }
  renderKaartScherm();
  /* geen wegdrijvende toasts maar DE PROCLAMATIE: de baas vaardigt de wet uit */
  toonDagwetProclamatie();
}

/* ---------- HET GRAFSCHRIFT: je laatste woorden op de plek van je val ----------
   Bij een gevallen daily laat je een boodschap na; possegenoten die vandaag
   dezelfde afdaling doen vinden op JOUW verdieping een grafsteen met je
   uitdaging. Vrij veld + 🎲-themasuggesties. */
const GRAF_SUGGESTIES = [
  'Dieper dan rij {rij} kom jij nooit. Bewijs me ongelijk.',
  'Ik struikelde op rij {rij}. Jij gaat hier vallen.',
  'Mijn geest kijkt mee vanaf rij {rij}. Stel me niet teleur.',
  'Wat mij velde, wacht nog op jou. Veel plezier.',
  'Rij {rij} is van mij. Kom er maar eens voorbij.',
  'Laat mijn as liggen. Pak wél mijn wraak.',
  'De diepte nam mij. Jou neemt ze sneller.',
  'Wie dit leest: mijn score eerst verslaan, dan pas praten.'
];
function grafSuggestie() {
  const veld = document.getElementById('graf-tekst');
  if (!veld) return;
  veld.value = kiesUit(GRAF_SUGGESTIES).replace(/\{rij\}/g, S && S.verdieping ? S.verdieping : '?');
  Klank.sfx('klik');
}
function stuurGrafschriftUI() {
  const veld = document.getElementById('graf-tekst');
  const knop = document.getElementById('graf-verstuur');
  const tekst = (veld && veld.value || '').trim();
  if (!tekst) { melding('Schrijf eerst je laatste woorden (of rol de 🎲).'); return; }
  if (knop) { knop.disabled = true; knop.textContent = '⏳'; }
  Klank.sfx('klik');
  Online.stuurGrafschrift(vandaagSleutel(), tekst).then(ok => {
    if (ok) {
      stuurGrafschriftUI._verstuurd = tekst;   /* deelDagScore neemt het mee */
      const blok = document.getElementById('graf-blok');
      if (blok) blok.innerHTML = `
        <div class="graf-klaar">
          <div class="graf-mini-zerk">
            <span class="graf-mini-kruis">✝</span>
            <b>${escSyn(Online.identiteit() ? Online.identiteit().naam : 'Jij')}</b>
            <small>rij ${S && S.verdieping || '?'}</small>
            <em>„${escSyn(tekst)}"</em>
          </div>
          <p class="graf-klaar-tekst">⚰️ Je zerk staat op rij ${S && S.verdieping || '?'}. Je posse zal het vinden — en vrezen.</p>
        </div>`;
      melding('⚰️ Grafschrift gebeiteld. Laat ze maar komen.');
    } else {
      if (knop) { knop.disabled = false; knop.textContent = '⚰️ Verstuur'; }
      melding('Het grafschrift kon niet worden achtergelaten (offline, of de boodschap-kolom ontbreekt nog — zie SUPABASE-SETUP.md 1d).');
    }
  });
}
/* de graven van je posse voor déze dag ophalen (bij de daily-start) */
function laadDagGraven() {
  if (!(window.Online && Online.isLid())) return;
  Online.dagTop(vandaagSleutel()).then(r => {
    if (!S || !S.daily) return;
    const ik = Online.lid().naam;
    S.dagGraven = (r || []).filter(x => x && !x.gewonnen && x.naam !== ik && (x.diepte | 0) > 0)
      .map(x => ({ naam: String(x.naam || ''), diepte: x.diepte | 0, boodschap: String(x.boodschap || '').slice(0, 140) }));
    saveSpel();
  }).catch(() => {});
}
/* op de kaart: bereik (of passeer) je de verdieping waar een possegenoot viel
   vandaag? Dan rijst zijn grafsteen op — één keer per genoot. */
function checkGrafsteen() {
  if (!S || !S.daily || !Array.isArray(S.dagGraven) || !S.dagGraven.length) return;
  S.gravenGezien = Array.isArray(S.gravenGezien) ? S.gravenGezien : [];
  const graf = S.dagGraven.find(g => g.diepte <= (S.verdieping || 0) && !S.gravenGezien.includes(g.naam));
  if (!graf) return;
  S.gravenGezien.push(graf.naam);
  saveSpel();
  toonGrafsteen(graf);
}
function toonGrafsteen(graf) {
  const oud = document.getElementById('grafsteen'); if (oud) oud.remove();
  const el = document.createElement('div');
  el.id = 'grafsteen';
  el.className = 'overlay open gs-overlay';
  const asVlokken = INST.lite ? '' : Array.from({ length: 9 }, (_, i) =>
    `<span class="gs-as" style="left:${8 + i * 10}%;animation-delay:${(i * 0.5).toFixed(1)}s;animation-duration:${(4 + (i % 3)).toFixed(1)}s"></span>`).join('');
  el.innerHTML = `
    <div class="gs-tafereel">
      <div class="gs-spookgloed"></div>
      <div class="gs-mist"></div>
      <div class="gs-as-laag">${asVlokken}</div>
      <div class="gs-zerk">
        <div class="gs-kruis">✝</div>
        <div class="gs-graveer">
          <p class="gs-hier">HIER VIEL</p>
          <h2 class="gs-naam">${escSyn(graf.naam)}</h2>
          <p class="gs-plek">rij ${graf.diepte} · vandaag · jouw afdaling</p>
          <div class="gs-scheiding">⚜</div>
          <blockquote class="gs-boodschap">${graf.boodschap ? `„${escSyn(graf.boodschap)}"` : '<i>Geen laatste woorden.<br>Enkel stilte, en een gedoofde fakkel.</i>'}</blockquote>
        </div>
      </div>
      <div class="gs-heuvel"></div>
      <button class="knop-groot gs-wreek" onclick="document.getElementById('grafsteen').remove()">⚔️ Wreek ${escSyn(graf.naam)}</button>
    </div>`;
  document.body.appendChild(el);
  /* echte gebeitelde steen-textuur zodra assets/ui/grafzerk.webp bestaat;
     tot dan blijft de CSS-zerk staan (stille terugval) */
  laadPropAfbeelding('ui/grafzerk', img => {
    const zerk = el.querySelector('.gs-zerk');
    if (img && zerk) { zerk.style.backgroundImage = `url("${img.src}")`; zerk.classList.add('gs-heeft-art'); }
  });
  if (!INST.lite) { Klank.sfx('debuff'); setTimeout(() => Klank.sfx('debuff'), 260); schudScherm && schudScherm(); }
  else Klank.sfx('debuff');
}
/* generieke prop-art-loader (UI-losstaand): probeer webp, dan png, cache het
   resultaat (ook een mislukking → geen herhaald hameren), val stil terug op CSS */
const _propArt = {};
function laadPropAfbeelding(pad, cb) {
  if (pad in _propArt) { cb(_propArt[pad]); return; }
  const probeer = (ext, anders) => {
    const img = new Image();
    img.onload = () => { _propArt[pad] = img; cb(img); };
    img.onerror = anders;
    img.src = 'assets/' + pad + '.' + ext;
  };
  probeer('webp', () => probeer('png', () => { _propArt[pad] = null; cb(null); }));
}

/* de sociale nudge op het daily-eindescherm: deel je score als uitdaging
   (deel-sheet op mobiel, klembord op laptop) — mét dagwet en syndicaat-code */
function deelDagScore() {
  const wet = (S && S.dagwet && DAGWETTEN[S.dagwet]) || null;
  const score = Daily.laatsteScore || 0;
  const l = (window.Online && Online.isLid()) ? Online.lid() : null;
  const graf = stuurGrafschriftUI._verstuurd ? ` Mijn laatste woorden: „${stuurGrafschriftUI._verstuurd}"` : '';
  const tekst = `⚔️ SLAY LIT — dagelijkse afdaling: ${score} punten${wet ? ` onder ${wet.naam}` : ''}.${graf} `
    + (l ? `Versla me — één tik en je staat op ons bord: ${syndicaatLink()}`
         : 'Versla me: https://teamict-codex.github.io/slay-lit/');
  Klank.sfx('klik');
  if (navigator.share) {
    navigator.share({ title: 'SLAY LIT', text: tekst }).catch(() => {});
  } else {
    try { navigator.clipboard.writeText(tekst); melding('📋 Uitdaging gekopieerd — plak en provoceer!'); }
    catch (e) { melding(tekst); }
  }
}
/* jouw plek op het syndicaat-dagbord, asynchroon ingevuld op het eindescherm
   (de score-upload is fire-and-forget → even ademen vóór het ophalen) */
async function vulEindeSynRang() {
  try {
    await new Promise(r => setTimeout(r, 1500));
    const top = await Online.dagTop(vandaagSleutel());
    const el = document.getElementById('einde-syn-rang');
    if (!el || !Array.isArray(top)) return;
    const ik = Online.lid().naam;
    const idx = top.findIndex(r => r && r.naam === ik);
    if (idx >= 0) el.textContent = `Vandaag ${['🥇', '🥈', '🥉'][idx] || '#' + (idx + 1)} van ${top.length} in ${Online.lid().code}`;
  } catch (e) {}
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
/* HET SLACHTBLOK: welke gesmede kaarten (per held) je wil meenemen — mét ladingen,
   net als het Schrijn (playtest: de meename was onzichtbaar en oneindig) */
let slachtblokKeuzes = [];

function slachtblokKaartHtml() {
  const entries = Object.entries(Codex.slachtblok || {}).filter(([, sp2]) => (sp2.charges || 0) > 0);
  if (!entries.length) return '';
  return `<div class="schrijn-titel">🪓 Het Slachtblok
      <small>gesmede kaarten zijn ERFSTUKKEN: élke held mag er één dragen (vervangt een startkaart) — elke inzet kost 1 van de 3 ladingen</small></div>
    <div class="schrijn-rij">` + entries.map(([h, sp2]) => `
      <button type="button" class="schrijn-relikwie sb-meeneem ${slachtblokKeuzes.includes(h) ? 'gekozen' : ''}" onclick="toggleSlachtblokKaart('${h}')"
        data-tip="${sp2.icoon} ${sp2.naam} — gesmeed door ${HELDNAAM(sp2.maker || h)} uit ${(sp2.offers || []).join(' en ')}. Nog ${sp2.charges} lading${sp2.charges === 1 ? '' : 'en'}. Draagbaar voor wie het aandurft — welke held je ook kiest.">
        <span class="sb-meeneem-icoon">${sp2.icoon}</span>
        <span class="sb-meeneem-naam">${sp2.naam}</span>
        <small>door ${HELDNAAM(sp2.maker || h)} · ⚡${sp2.charges}</small>
      </button>`).join('') + `</div>`;
}
function toggleSlachtblokKaart(h) {
  /* één erfstuk per afdaling — een tweede keuze vervangt de eerste */
  if (slachtblokKeuzes.includes(h)) slachtblokKeuzes = slachtblokKeuzes.filter(x => x !== h);
  else slachtblokKeuzes = [h];
  const vak = $('#slachtblok-vak');
  if (vak) vak.innerHTML = slachtblokKaartHtml();
  Klank.sfx('klik');
}

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
  /* welke vrijgespeelde metgezel stapt déze run in bij Act 2? (deterministisch: Codex.runs)
     → de synergie-band is dan een echt heldkeuze-argument, niet pas een gevechts-verrassing */
  const runMg = (typeof kiesRunMetgezel === 'function') ? kiesRunMetgezel() : null;
  const runMgDef = runMg && METGEZELLEN[runMg];
  $('#scherm-held').innerHTML = `
    <h2 class="scherm-titel">Kies je held</h2>
    ${runMgDef ? `<p class="held-mg-regel">${runMgDef.icoon} <b>${runMgDef.naam}</b> daalt deze run met je mee vanaf Act 2.</p>` : ''}
    <div class="held-rij">` +
    Object.entries(SPELERS).map(([id, h]) => {
      const rel = RELIKWIEEN[h.relikwie];
      const art = (window.karakterSvg && karakterSvg(h.art)) || h.icoon;
      const synT = runMg ? synergieTier(runMg, id) : 'basis';
      const synHtml = runMg && synT !== 'basis'
        ? `<div class="held-syn ${synT === 'optimaal' ? 'syn-opt' : ''}" data-tip="${runMgDef.naam} ${synT === 'optimaal' ? 'vecht het felst aan de zijde van ' + h.naam + '.' : 'en ' + h.naam + ' begrijpen elkaar.'}">${runMgDef.icoon} ${synT === 'optimaal' ? '✨ optimale band' : '◆ goede band'}</div>`
        : '';
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
        ${synHtml}
        <button type="button" class="held-kies" onclick="kiesHeld('${id}')">Speel als ${h.naam} ➤</button>
      </div>
        <button type="button" class="knop-stil held-dek-knop" onclick="bekijkStartdek('${id}', event)">Bekijk startdek</button>
      </div>`;
    }).join('') + `</div>
    <div class="schrijn-vak" id="schrijn-vak">${schrijnHtml()}</div>
    ${slachtblokKaartHtml() ? `<div class="schrijn-vak slachtblok-vak" id="slachtblok-vak">${slachtblokKaartHtml()}</div>` : ''}
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
  /* een lopende dagelijkse afdaling wordt door een nieuw avontuur gewist — en je
     poging van vandaag is dan gespeeld (de claim blijft staan; debug-sweep 27 aug) */
  if (!bevestigd && !kiesHeld._dailyOk) {
    try {
      const oud = JSON.parse(localStorage.getItem(SAVE_SLEUTEL) || 'null');
      if (oud && oud.daily && Daily.laatsteVoltooid !== oud.dailyDag) {
        bevestig('🗓️ <b>Je dagelijkse afdaling loopt nog</b><br><br>Een nieuw avontuur wist haar — en je daily-poging van vandaag is dan voorbij (geen score op het bord).<br><br>Toch een nieuw avontuur beginnen?',
          () => { kiesHeld._dailyOk = true; kiesHeld(id); }, 'Wis mijn daily ➤');
        return;
      }
    } catch (e) {}
  }
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
  /* deze nieuwe run clobbert de save. Twee reddingen (debug-sweep 27 aug):
     1) GEVONDEN scherven uit de oude run banken (zoals bij een dood — alleen de
        bewuste loadout is de inzet), anders verdampen ze stil;
     2) de daily-claim blijft STAAN — de oude rollback maakte gratis seed-scouting
        mogelijk (starten, kaart/dagwet bekijken, herladen, opnieuw). De bevestiging
        hiervoor zit in kiesHeld. */
  try {
    const oud = JSON.parse(localStorage.getItem(SAVE_SLEUTEL) || 'null');
    if (oud && Array.isArray(oud.scherven)) {
      const lo = Array.isArray(oud.loadoutScherven) ? oud.loadoutScherven : [];
      oud.scherven.filter(sid => !lo.includes(sid)).forEach(sid => bankScherf(sid));
    }
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
  const sluit = onthoud => { wrap.remove(); document.removeEventListener('fullscreenchange', fsWeg); if (onthoud) { try { localStorage.setItem('slayit_nudge_v2', 'weg'); } catch (e) {} } };
  wrap.querySelectorAll('.nudge-ja').forEach(b => b.onclick = () => { const a = acties[+b.dataset.i]; if (a) a.doe(); sluit(false); });
  wrap.querySelector('.nudge-x').onclick = () => sluit(true);
  /* eenmaal fullscreen (hoe dan ook bereikt) is de nudge overbodig; en na 14s ruimt
     hij zichzelf op — hij bleef anders eeuwig over de speel-UI hangen (debug-sweep) */
  const fsWeg = () => { if (document.fullscreenElement) sluit(false); };
  document.addEventListener('fullscreenchange', fsWeg);
  setTimeout(() => { if (wrap.isConnected) sluit(false); }, 14000);
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

/* touch: je held of een vijand VASTHOUDEN maakt de kaarthand ÉN de bezit-rij
   (relikwieën + drankjes in de topbalk) even doorzichtig, zodat je de statussen,
   hp en intenties eronder duidelijk ziet — op een smal gsm-scherm dekken de
   kaarten die af, en een volle relikwieënrij dekt de intentie-iconen af (bv. bij
   de Slijmkoning). Loslaten herstelt meteen. De klasse staat op BODY (niet op
   #scherm-gevecht): de topbalk leeft buiten het gevechtsscherm. Een korte tik
   blijft gewoon 'richten/aanvallen' (vandaar de hold-drempel); een peek op een
   vijand mag dus géén kaart spelen — de klik erna onderdrukken we. */
(() => {
  let timer = null, actief = false, gekeken = false;
  const opFiguur = t => t && t.closest && t.closest('#speler-zone, #vijanden-rij .vijand');
  const toon = () => { document.body.classList.add('statuskijk'); actief = true; gekeken = true; };
  const verberg = () => {
    clearTimeout(timer); timer = null; actief = false;
    document.body.classList.remove('statuskijk');
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

/* ============================================================
   TOETSENBORD-BESTURING (laptop) — de muis blijft 100% werken.
   Eén globale keydown-listener die op het ACTIEVE scherm schakelt en de
   BESTAANDE klik-functies hergebruikt (klikKaart/klikVijand/eindBeurt/
   gebruikDrank + .click() op de menuknoppen), zodat muis en toets exact
   dezelfde state-machine delen — geen gedupliceerde logica. Een focus-cursor
   (.toets-focus) verschijnt zodra je een toets indrukt en verdwijnt weer bij
   de eerste muisbeweging. Op het mobiele spoor volledig uit.

   Overzicht van de toetsen:
   · GEVECHT   ← →  blader door je hand · Enter/Spatie = speel (of kies doel) ·
                bij doelkeuze ← → over de vijanden + Enter · Esc = doelkeuze af ·
                E = einde beurt · 1-9 = drankje.
   · MENU'S    ← → ↑ ↓ = door de knoppen/kaarten · Enter = kiezen · 1-9 = sprong ·
                Esc = 'Verder/Verlaat' (of Terug op de heldkeuze).
   · HELDKEUZE ← → held · ↑ ↓ = ascensie · Enter = spelen · Esc = terug.
   · OVERLAYS  Esc sluit · in het Bestiarium bladeren ← → door de pagina's.
   Vóór release samen met de andere laptop-hulpjes evalueren. */
(function () {
  let toetsIdx = 0;        /* focus-index binnen de huidige lijst */
  let cursorAan = false;   /* de ring verschijnt pas ná een toetsdruk */
  let laatstScherm = '';   /* scherm-wissel → focus resetten */
  let toetsCtx = '';       /* in welke lijst de cursor leeft ('hand'/'vijand'/'menu-…') —
                              zonder dit lekte een stale hand-index de doelkeuze in en
                              voelden de pijltjes omgekeerd (wrap vanaf een willekeurige plek) */

  /* context-wissel: nooit een index of ring uit een ándere lijst meenemen */
  function wisselCtx(ctx) {
    if (toetsCtx === ctx) return;
    toetsCtx = ctx;
    toetsIdx = 0;
    cursorAan = false;
    wisFocus();
  }

  function wisFocus() {
    document.querySelectorAll('.toets-focus').forEach(el => el.classList.remove('toets-focus'));
  }
  function zetFocus(el) {
    wisFocus();
    if (!el) return;
    el.classList.add('toets-focus');
    if (el.scrollIntoView) { try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {} }
  }
  /* muisbeweging → de toets-cursor verbergen (de selectie-state in het gevecht
     blijft staan; enkel de visuele ring verdwijnt) */
  window.addEventListener('pointermove', () => { if (cursorAan) { cursorAan = false; wisFocus(); } });

  const zichtbaar = el => el && el.offsetParent !== null && !el.disabled;

  /* hoogste open .overlay; overlay-kies regelt z'n eigen toetsen (met rust laten) */
  function bovensteOverlay() {
    const open = [...document.querySelectorAll('.overlay.open')].filter(o => o.id !== 'overlay-kies');
    return open.length ? open[open.length - 1] : null;
  }

  /* klikbare knoppen/kaarten per menu-/encounterscherm, in DOM-volgorde */
  function schermLijst(scherm) {
    let sel = null;
    if (scherm === 'event') {
      sel = '#scherm-event .event-knop:not([disabled])';
      if (!document.querySelector(sel)) sel = '#scherm-event .knop-groot';   /* onthul-fase: enkel 'Verder' */
    } else if (scherm === 'rust') sel = '#scherm-rust .rust-knop:not([disabled])';
    else if (scherm === 'schat') sel = '#scherm-schat .knop-groot';           /* dekt open-knop én 'Verder' */
    else if (scherm === 'winkel') sel = '#scherm-winkel .winkel-item, #scherm-winkel .winkel-blok, #scherm-winkel .knop-groot';
    else if (scherm === 'beloning') sel = '#scherm-beloning .beloning-item, #scherm-beloning .knop-groot';
    else if (scherm === 'kaart') sel = '#kaart-vlak .knoop.kan';
    else if (scherm === 'held') sel = '.held-kaart[data-held]';
    else if (scherm === 'titel') sel = '.titel-knoppen > button';
    else if (scherm === 'einde') sel = '#scherm-einde .knop-groot, #scherm-einde .knop-stil';
    if (!sel) return [];
    let lijst = [...document.querySelectorAll(sel)].filter(zichtbaar);
    if (scherm === 'kaart') lijst.sort((a, b) => (parseFloat(a.style.left) || 0) - (parseFloat(b.style.left) || 0));
    return lijst;
  }

  /* de 'Verder/Verlaat'-knop van een encounterscherm (Esc-doel) */
  function exitKnop(scherm) {
    if (scherm === 'event' || scherm === 'schat' || scherm === 'winkel' || scherm === 'beloning')
      return document.querySelector('#scherm-' + scherm + ' .knop-groot');
    return null;
  }

  /* activeer het gefocuste menu-item via zijn eigen onclick (held → 'Speel als') */
  function klikMenu(el, scherm) {
    if (!el) return;
    if (scherm === 'held') {
      const knop = el.querySelector('.held-kies');
      if (knop) knop.click();
      else if (el.dataset.held && typeof kiesHeld === 'function') kiesHeld(el.dataset.held);
      return;
    }
    el.click();
  }

  /* ---- GEVECHT ---- */
  function gevechtToets(e, g) {
    const k = e.key;
    if (k === 'e' || k === 'E') { e.preventDefault(); cursorAan = false; wisFocus(); eindBeurt(); return; }
    if (/^[1-9]$/.test(k)) {
      if (e.repeat) { e.preventDefault(); return; }   /* ingehouden cijfer mag niet meerdere drankjes leegdrinken */
      const di = parseInt(k, 10) - 1;
      if (S.dranken && S.dranken[di]) { e.preventDefault(); gebruikDrank(di); }
      return;
    }
    const doelModus = g.gekozenKaart !== null || g.gekozenDrank !== null;
    const vor = k === 'ArrowLeft' || k === 'ArrowUp';
    const vol = k === 'ArrowRight' || k === 'ArrowDown';

    if (doelModus) {
      /* de doelkeuze is een ANDERE lijst dan de hand: eigen cursor, altijd vanaf
         het eerste doelwit — nooit een meegelekte hand-index */
      wisselCtx('vijand');
      const vij = [...document.querySelectorAll('#vijanden-rij .vijand')].filter(el => !el.classList.contains('sterft'));
      if (k === 'Escape') {
        e.preventDefault();
        g.gekozenKaart = null; g.gekozenDrank = null; g.voorbeeldKaart = null;
        renderGevecht();
        wisselCtx('hand');
        const hand = [...document.querySelectorAll('#hand .kaart')].filter(el => !el.classList.contains('weg-kaart'));
        cursorAan = true; zetFocus(hand[0]);
        return;
      }
      if (vor || vol) {
        e.preventDefault();
        if (!vij.length) return;
        if (!cursorAan) { cursorAan = true; toetsIdx = 0; melding('🎯 Kies je doelwit: ◀ ▶ en Enter · Esc = terug'); }
        /* KLEMMEN, niet wrappen: → gaat altijd naar rechts, ← altijd naar links —
           met 2 vijanden wisselde de wrap-around bij élke pijl van kant (averechts-gevoel) */
        else toetsIdx = Math.max(0, Math.min(toetsIdx + (vol ? 1 : -1), vij.length - 1));
        zetFocus(vij[toetsIdx]);
        return;
      }
      if (k === 'Enter' || k === ' ') {
        e.preventDefault();
        if (!vij.length) return;
        /* geen zichtbare cursor (doelkeuze via de muis gestart, of een re-render
           veegde de ring weg)? Dan eerst richten — nooit blind vuren. */
        if (!cursorAan || !document.querySelector('.toets-focus')) {
          cursorAan = true; toetsIdx = 0; zetFocus(vij[0]);
          melding('🎯 Kies je doelwit: ◀ ▶ en Enter · Esc = terug');
          return;
        }
        const el = vij[Math.min(toetsIdx, vij.length - 1)];
        if (el) klikVijand(parseInt(el.dataset.i, 10));
        wisselCtx('hand');
        const hand = [...document.querySelectorAll('#hand .kaart')].filter(x => !x.classList.contains('weg-kaart'));
        cursorAan = true; zetFocus(hand[0]);
        return;
      }
      return;
    }

    /* hand-modus */
    wisselCtx('hand');
    const hand = [...document.querySelectorAll('#hand .kaart')].filter(el => !el.classList.contains('weg-kaart'));
    if (vor || vol) {
      e.preventDefault();
      if (!hand.length) return;
      if (!cursorAan) { cursorAan = true; if (toetsIdx >= hand.length) toetsIdx = 0; }
      /* ook hier klemmen: de hand is een ruimtelijke waaier — een pijl die aan de
         rand 'doorschiet' naar de overkant leest als omgekeerd */
      else toetsIdx = Math.max(0, Math.min(toetsIdx + (vol ? 1 : -1), hand.length - 1));
      zetFocus(hand[toetsIdx]);
      return;
    }
    if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      if (!hand.length) return;
      /* 1e druk (of ring weggeveegd door een re-render) = cursor tonen, nog niet spelen */
      if (!cursorAan || !document.querySelector('.toets-focus')) { cursorAan = true; toetsIdx = Math.min(toetsIdx, hand.length - 1); zetFocus(hand[toetsIdx]); return; }
      const el = hand[Math.min(toetsIdx, hand.length - 1)];
      if (!el) return;
      klikKaart(parseInt(el.dataset.uid, 10));
      if (S.gevecht && (S.gevecht.gekozenKaart !== null || S.gevecht.gekozenDrank !== null)) {
        /* doel-kaart → spring naar het EERSTE doelwit + zeg wat er verwacht wordt */
        wisselCtx('vijand');
        const vij = [...document.querySelectorAll('#vijanden-rij .vijand')].filter(x => !x.classList.contains('sterft'));
        cursorAan = true; zetFocus(vij[0]);
        melding('🎯 Kies je doelwit: ◀ ▶ en Enter · Esc = terug');
      } else {
        const nieuw = [...document.querySelectorAll('#hand .kaart')].filter(x => !x.classList.contains('weg-kaart'));
        toetsIdx = Math.min(toetsIdx, Math.max(0, nieuw.length - 1)); zetFocus(nieuw[toetsIdx]);
      }
      return;
    }
    if (k === 'Escape') { e.preventDefault(); cursorAan = false; wisFocus(); }
  }

  /* ---- MENU-/ENCOUNTERSCHERMEN ---- */
  function menuToets(e, scherm) {
    wisselCtx('menu-' + scherm);   /* eigen cursor per scherm — geen lek uit gevecht/ander menu */
    const k = e.key;
    if (scherm === 'held') {
      if (k === 'ArrowUp') { e.preventDefault(); if (typeof wijzigAscensie === 'function') wijzigAscensie(1); return; }
      if (k === 'ArrowDown') { e.preventDefault(); if (typeof wijzigAscensie === 'function') wijzigAscensie(-1); return; }
      if (k === 'Escape') { e.preventDefault(); if (typeof naarTitel === 'function') naarTitel(); return; }
    }
    const lijst = schermLijst(scherm);
    if (!lijst.length) {
      if (k === 'Escape') { const x = exitKnop(scherm); if (x) { e.preventDefault(); x.click(); } }
      return;
    }
    const vor = k === 'ArrowLeft' || k === 'ArrowUp';
    const vol = k === 'ArrowRight' || k === 'ArrowDown';
    if (vor || vol) {
      e.preventDefault();
      if (!cursorAan) { cursorAan = true; toetsIdx = Math.min(toetsIdx, lijst.length - 1); }
      else toetsIdx = Math.max(0, Math.min(toetsIdx + (vol ? 1 : -1), lijst.length - 1));   /* KLEMMEN i.p.v. wrappen — consistent met de gevecht-cursor (geen averechts-gevoel op korte rijen) */
      zetFocus(lijst[toetsIdx]);
      return;
    }
    if (/^[1-9]$/.test(k)) {
      if (e.repeat) { e.preventDefault(); return; }   /* ingehouden cijfer = één activatie */
      const idx = parseInt(k, 10) - 1;
      if (lijst[idx]) { e.preventDefault(); cursorAan = true; toetsIdx = idx; zetFocus(lijst[idx]); klikMenu(lijst[idx], scherm); }
      return;
    }
    if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      /* geen zichtbare ring (1e druk, of een re-render verving de DOM)? eerst tonen,
         dan pas activeren — nooit een onzichtbaar item aanklikken */
      if (!cursorAan || !document.querySelector('.toets-focus')) { cursorAan = true; toetsIdx = Math.min(toetsIdx, lijst.length - 1); zetFocus(lijst[toetsIdx]); return; }
      klikMenu(lijst[Math.min(toetsIdx, lijst.length - 1)], scherm);
      return;
    }
    if (k === 'Escape') { const x = exitKnop(scherm); if (x) { e.preventDefault(); x.click(); } }
  }

  /* ---- OVERLAYS (Codex/Bestiarium/Relikwie/Help + bevestig-dialogen) ---- */
  function overlayToets(e, ov) {
    const k = e.key;
    /* een bevestig-/nudge-dialoog: Enter = doorgaan, Esc = annuleren */
    if (ov.classList.contains('bevestig-overlay')) {
      const primair = ov.querySelector('.bevestig-ja')
        || [...ov.querySelectorAll('.nudge-ja')].find(b => !b.classList.contains('nudge-tweede'))
        || ov.querySelector('.knop-groot');
      const annuleer = ov.querySelector('.knop-stil') || ov.querySelector('.nudge-tweede');
      if (k === 'Enter' || k === ' ') { if (primair) { e.preventDefault(); primair.click(); } return; }
      if (k === 'Escape') { e.preventDefault(); if (annuleer) annuleer.click(); else ov.classList.remove('open'); return; }
      return;
    }
    if (k === 'Escape') {
      e.preventDefault();
      if (ov.id === 'overlay-help' && typeof sluitHelp === 'function') sluitHelp();
      else ov.classList.remove('open');
      return;
    }
    if (ov.id === 'overlay-bestiarium' && (k === 'ArrowLeft' || k === 'ArrowRight')) {
      const teken = k === 'ArrowLeft' ? '◀' : '▶';
      const knop = [...ov.querySelectorAll('button')].find(b => b.textContent.indexOf(teken) !== -1 && !b.disabled);
      if (knop) { e.preventDefault(); knop.click(); }
    }
    /* op een bestiarium-detailpagina: Enter/Spatie = het portret aantikken (volgende pose) */
    if (ov.id === 'overlay-bestiarium' && (k === 'Enter' || k === ' ')) {
      const portret = ov.querySelector('.best-portret');
      if (portret) { e.preventDefault(); portret.click(); }
    }
  }

  window.addEventListener('keydown', function (e) {
    if (window.mobiel) return;                    /* toetsbesturing is voor de laptop */
    if (e.ctrlKey || e.metaKey || e.altKey) return;   /* laat sneltoetsen (o.a. Ctrl+Shift+M) met rust */
    /* de outro (js/outro.js) heeft een eigen keydown/keyup-state-machine — de
       menu-router en de Enter/Spatie-repeat-onderdrukking blijven erbuiten */
    if (document.body.dataset.scherm === 'outro') return;
    /* vastgehouden Enter/Spatie mag niet door menu's/dialogen heen ratelen
       (pijltjes mogen wél herhalen — fijn om door een lange rij te bladeren) */
    if (e.repeat && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); return; }
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;

    /* een baas-intro/cinematic dekt het slagveld af: toetsen mogen er niet doorheen
       spelen (muisklikken vangt de full-screen overlay zelf al af, het toetsenbord
       niet). Enter/Spatie/Esc = overslaan via de eigen click-handler van de intro. */
    const intro = document.getElementById('baas-intro');
    if (intro && !intro.classList.contains('weg')) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); intro.click(); }
      return;
    }

    if (document.querySelector('#overlay-kies.open')) return;   /* kaartkeuze regelt zichzelf */
    const ov = bovensteOverlay();
    if (ov) { overlayToets(e, ov); return; }

    const scherm = document.body.dataset.scherm || '';
    if (scherm !== laatstScherm) { laatstScherm = scherm; toetsIdx = 0; cursorAan = false; wisFocus(); }

    if (scherm === 'gevecht') {
      const g = (typeof S !== 'undefined' && S) ? S.gevecht : null;
      if (g && !g.voorbij) gevechtToets(e, g);
      return;
    }
    if (['event', 'rust', 'schat', 'winkel', 'beloning', 'kaart', 'held', 'titel', 'einde'].indexOf(scherm) !== -1) {
      menuToets(e, scherm);
    }
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
     opnieuw hervatten (lichtgewicht: checkt enkel de context-state). Óók op keydown:
     wie na het terugkeren naar de tab enkel het toetsenbord gebruikt, kreeg anders
     geen geluid meer terug. */
  document.addEventListener('pointerdown', () => { if (window.Klank && Klank.hervat) Klank.hervat(); });
  document.addEventListener('keydown', () => { if (window.Klank && Klank.hervat) Klank.hervat(); });

  /* PWA: alleen via http(s), file:// kan geen service worker */
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').then(() => {
      /* een nieuwe SW doet skipWaiting()+clients.claim() → zodra hij de pagina overneemt
         herladen we één keer, zodat een deploy (nieuwe code/CSS/art) meteen landt i.p.v.
         pas na een cold start. Guard tegen de dubbel-reload-lus. MAAR nooit midden
         in een gevecht of de eenmalige outro (save is daar al gewist!): dan uitstellen
         tot een rustig scherm (titel/kaart/einde). */
      let herladen = false;
      const magHerladen = () => {
        const scherm = document.body.dataset.scherm;
        return !(scherm === 'gevecht' || scherm === 'outro' || (window.Outro && Outro.actief)
          || document.getElementById('overlay-slachtblok'));   /* niet middenin het smeed-ritueel (debug-sweep) */
      };
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (herladen) return;
        if (magHerladen()) { herladen = true; location.reload(); return; }
        /* uitgesteld: check elke 5s tot de speler het gevecht/de outro uit is */
        const wacht = setInterval(() => {
          if (!magHerladen()) return;
          clearInterval(wacht);
          if (!herladen) { herladen = true; location.reload(); }
        }, 5000);
      });
    }).catch(() => {});
  }

  naarTitel();
  /* herlaadde de speler middenin de outro? De win is geregistreerd maar het
     einde-scherm is nooit getoond — geef de felicitatie alsnog (compact). */
  try {
    const pending = JSON.parse(localStorage.getItem('slayit_einde_pending') || 'null');
    if (pending) {
      localStorage.removeItem('slayit_einde_pending');
      /* eigen langlevende toast (8s): dit is het enige spoor van de win die de
         reload opslokte — 2,6s standaard-melding is daarvoor te vluchtig */
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'toast';
        el.textContent = `👑 Overwinning geboekt: ${HELDNAAM(pending.held)} versloeg ${pending.baas || 'de eindbaas'}${pending.record ? ' — nieuw diepterecord!' : ''} (seed ${pending.seed || '—'})`;
        $('#meldingen').appendChild(el);
        setTimeout(() => el.classList.add('weg'), 8000);
        setTimeout(() => el.remove(), 8500);
      }, 900);
    }
  } catch (e) {}
  if (window.mobiel) setTimeout(toonSchermNudge, 1200);
  checkResetLink();              /* ?reset=1 in de URL → voortgang wissen (met bevestiging) */
  checkPorInbox();               /* HET SYNDICAAT: heeft iemand je vandaag gepord? */
  checkSyndicaatUitnodiging();   /* ?syndicaat=CODE in de URL → uitnodigings-overlay */
});
