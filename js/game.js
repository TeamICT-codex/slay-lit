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

const RIJEN = 13, KOLS = 7;
const SAVE_SLEUTEL = 'slayit_save_v1';

/* ---------- acts (meerdere verdiepingen-ladders na elkaar) ---------- */
const ACTS_MAX = 2;                       /* verhoog naar 3 zodra Act 3 klaar is */
const ACT_NAMEN = { 1: 'De Diepte', 2: 'De Catacomben', 3: 'Het Slachtblok' };
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

const INST = Object.assign(
  /* op mobiel standaard 3D UIT (onspeelbaar daar), maar lite NIET geforceerd:
     lite dooft de animaties, en juist die geven het spel leven. Lite alleen
     bij echt zwakke hardware. Op laptop ongewijzigd want mobiel=false. */
  { lite: standaardLite, d3: !standaardLite && !mobiel, spraak: true },
  JSON.parse(localStorage.getItem('slayit_inst') || '{}')
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
  { relikwieen: [], dranken: [], metgezellen: [], gevallen: [], opgeladen: null, runs: 0, wins: 0, bestDiepte: {}, gesch: [], ascensie: {} },
  JSON.parse(localStorage.getItem(CODEX_SLEUTEL) || '{}')
);
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
function bewaarCodex() { localStorage.setItem(CODEX_SLEUTEL, JSON.stringify(Codex)); }

/* ---------- de Dagelijkse afdaling: iedereen speelt dezelfde dag-run ---------- */
const DAILY_SLEUTEL = 'slayit_daily';
const Daily = Object.assign(
  { laatsteVoltooid: null, laatsteStart: null, laatsteScore: 0, besteScore: 0, reeks: 0, besteReeks: 0, gesch: [] },
  JSON.parse(localStorage.getItem(DAILY_SLEUTEL) || '{}')
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

function nieuwSpel(heldId, seedTekst, ascensie) {
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
    gevecht: null
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
  /* Levend Vuur: licht- en vuurkaarten branden goedkoper */
  if ((def.licht || def.vuur) && heeftRelikwie('levend_vuur')) return Math.max(0, k - 1);
  return k;
}

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
const FAKKEL_KOST = { gevecht: 5, elite: 7, event: 4, schat: 5, winkel: 3, rust: 3, baas: 0 };
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
  if (bg) bg.style.filter = `brightness(${(0.45 + 0.55 * f).toFixed(2)})`;
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
  if (heeftRelikwie('smaragden_ring') && !actor.isSpeler) n += 1;
  geefStatus(actor, 'gif', n);
  Klank.sfx('gif');
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
  if (doel.dood) return;
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

/* vijand valt aan — meestal de speler, soms vangt de metgezel de klap op.
   gedwongenDoel: een intent kan een doelwit afdwingen (bv. de Erfprins die
   gericht Drops wegwuift). */
function vijandAanval(v, basis, gedwongenDoel) {
  if (v.dood) return;   /* een aan Doornen gesneuvelde vijand slaat niet meer */
  if (huidigeAct() > 1) basis = Math.ceil(basis * (1 + 0.15 * (huidigeAct() - 1)));   /* latere acts: hardere klappen */
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
  if (rest > 0) verliesHp(doel, rest);
  else if (dmg > 0) Klank.sfx('blok');
  if (bron && (doel.status.doornen || 0) > 0 && !bron.dood) {
    verliesHp(bron, doel.status.doornen);
  }
  return rest;
}

/* HP-verlies (negeert blok — gebruikt voor gif, doornen, zelfschade) */
function verliesHp(doel, n) {
  if (n <= 0) return;
  fxNummer(actorEl(doel), '-' + n, 'fx-schade');
  Klank.sfx(n >= 8 ? 'zwareklap' : 'klap');
  if (window.Vista && !doel.isMetgezel) Vista.raak(doel, n >= 8);   /* de metgezel is DOM-only, niet in de 3D-scène */
  pose2D(doel, 'hit', 0.45);
  const el = actorEl(doel);
  if (el) { el.classList.remove('raak'); void el.offsetWidth; el.classList.add('raak'); }
  if (doel.isMetgezel) {
    doel.hp = Math.max(0, doel.hp - n);
    if (S.metgezel) S.metgezel.hp = doel.hp;
    if (doel.hp <= 0 && !doel.dood) { doel.dood = true; metgezelVlucht(doel); }
    return;
  }
  if (doel.isSpeler) {
    S.hp = Math.max(0, S.hp - n);
    /* Feniksveer: één keer is de dood een misverstand */
    if (S.hp <= 0 && heeftRelikwie('feniksveer')) {
      S.relikwieen = S.relikwieen.filter(r => r !== 'feniksveer');
      S.hp = 1;
      melding('🪶 De Feniksveer verbrandt — je weigert te sterven!');
      Klank.sfx('schitter');
      heldFx('hfx-victory', 1600);
    }
    if (n >= 8) schudScherm();
    renderTopbalk();
    if (S.hp <= 0 && inGevecht()) nederlaag();
  } else {
    /* Pappies Invloed: zolang de gouden aegis staat is de baas ONAANTASTBAAR —
       aanvallen én gif ketsen af. Alleen Drops' vuur vreet aan de aegis zelf
       (dat loopt niet via verliesHp). */
    if ((doel.aegis || 0) > 0) {
      fxNummer(actorEl(doel), '✨ afgeweerd', 'fx-blok');
      Klank.sfx('blok');
      return;
    }
    doel.hp = Math.max(0, doel.hp - n);
    if (doel.hp <= 0 && !doel.dood) {
      doel.dood = true;
      Klank.sfx('dood');
      if (UITSPRAKEN[doel.id]) spreek(doel, UITSPRAKEN[doel.id].dood, 0.4);
      if (window.Vista) Vista.sterf(doel);
      pose2D(doel, 'death', 3);
      if (el) el.classList.add('sterft');
      /* Epidemie: een sterfgeval verspreidt gif onder de rest */
      if (inGevecht() && (sp().status.epidemie || 0) > 0) {
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
/* werf een metgezel voor de rest van de run (HP gaat mee tussen gevechten) */
function geefMetgezel(id) {
  const def = METGEZELLEN[id];
  if (!def) return;
  S.metgezel = { id, hp: def.maxHp, maxHp: def.maxHp, vluchtig: false };
  ontdek('metgezellen', id);
  renderTopbalk();
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
  pose2D(m, 'death', 2);
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
    return `<span class="intent intent-aanval" data-tip="${def.naam} schroeit een vijand voor ${dmg}">⚔️ ${dmg}</span>`;
  }
  if (it.type === 'blok') return `<span class="intent intent-blok" data-tip="${def.naam} geeft je ${it.blok} Blok">🛡️ ${it.blok}</span>`;
  if (it.type === 'heal') return `<span class="intent intent-buff" data-tip="${def.naam} geneest je ${it.n} HP">❤️ +${it.n}</span>`;
  if (it.type === 'aegis') return `<span class="intent intent-aegis" data-tip="${def.naam} vreet ${it.n} Pappies Invloed weg">🔥 −${it.n}🟡</span>`;
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
      m.dood = true;
      S.metgezel = null;                       /* permanent — niet 'vluchtig' */
      Codex.gevallen = Array.isArray(Codex.gevallen) ? Codex.gevallen : [];
      if (!Codex.gevallen.includes(m.id)) { Codex.gevallen.push(m.id); bewaarCodex(); }
      baasFaseMoment('DE LAATSTE VONK', `${def.naam} offert zich op — de diepte onthoudt zijn moed.`);
      melding(`✝ ${def.naam} is voorgoed heengegaan.`);
      const el = actorEl(m); if (el) el.classList.add('gevlucht');
      renderGevecht();
      if (alleVijanden().length === 0) gevechtGewonnen();
    },
    'Offer op 🔥'
  );
}

/* ---------- schermachtergronden (eigen platen, gedimd voor leesbaarheid) ---------- */
function schermAchtergrond(naam, pad, donker = 0.55, positie = 'center') {
  const el = $('#scherm-' + naam);
  if (!el) return;
  if (pad && window.ACHTERGRONDEN) {
    el.style.backgroundImage =
      `linear-gradient(rgba(13,10,18,${donker}), rgba(13,10,18,${Math.min(1, donker + 0.18)})), url("${ACHTERGRONDEN.basis + pad}")`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = positie;
  } else {
    el.style.backgroundImage = '';
  }
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
    if (S.pos === undefined) S.pos = null;
    if (typeof S.hp !== 'number') S.hp = huidigeHeld().hp;
    if (typeof S.maxHp !== 'number') S.maxHp = S.hp;
    if (typeof S.goud !== 'number') S.goud = 0;
    if (typeof S.verdieping !== 'number') S.verdieping = 0;
    if (!S.stats) S.stats = { gevechten: 0, kaarten: 0, schade: 0 };
    if (typeof S.uid !== 'number') S.uid = 0;
    /* metgezel-state: oude saves missen 'm (→ undefined, ok); een corrupte/onbekende
       metgezel neutraliseren zodat heeftMetgezel() veilig false geeft */
    if (S.metgezel && (typeof S.metgezel !== 'object' || !METGEZELLEN[S.metgezel.id] || typeof S.metgezel.hp !== 'number')) S.metgezel = null;
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
    n.type = gewogenKeuze(opties);
  }
  return nodes;
}

const NODE_ICONEN = { gevecht: '⚔️', elite: '😈', rust: '🔥', winkel: '💰', event: '❓', schat: '🎁', baas: '👑' };
const NODE_NAMEN = { gevecht: 'Gevecht', elite: 'Elite', rust: 'Rustplaats', winkel: 'Winkel', event: 'Onbekend', schat: 'Schat', baas: 'De Slijmkoning' };

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

  const doelY = S.pos ? nodePositie(S.kaart[S.pos]).y : 0;
  scroller.scrollTop = Math.max(0, doelY - scroller.clientHeight * 0.45);
  /* horizontaal centreren op de huidige knoop (telefoon: vlak is breder dan
     het scherm en swipebaar). Op desktop is er geen horizontale overloop,
     dus dit is daar een no-op. */
  if (S.pos) scroller.scrollLeft = Math.max(0, nodePositie(S.kaart[S.pos]).x - scroller.clientWidth * 0.5);
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
    top: Math.max(0, doel.y - scroller.clientHeight * 0.45),
    left: Math.max(0, doel.x - scroller.clientWidth * 0.5),  /* no-op op desktop */
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
        startGevecht(kiesUit(ONTMOETINGEN[moeilijkheid]), 'gevecht', n.r);
        break;
      }
      case 'elite': startGevecht(kiesUit(ONTMOETINGEN.elite), 'elite', n.r); break;
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
  if (!def.elite && !def.baas) hp += Math.floor(rij * 0.8);
  if (!def.baas && huidigeAct() > 1) hp = Math.ceil(hp * (1 + 0.30 * (huidigeAct() - 1)));   /* latere acts: taaier */
  if (asc() >= 2 && !def.baas) hp = Math.ceil(hp * 1.12);   /* ascension 2: taaiere vijanden */
  return { id, naam: def.naam, art: def.art, hp, maxHp: hp, blok: 0, status: {}, dood: false, beurtTeller: 0, intent: null, aegis: def.aegis || 0 };
}

/* eenmalige, vrijblijvende tip: liggend speelt comfortabeler. Geen blokkade —
   alleen een toast, en enkel op een touch-toestel in staande stand. */
/* gevechten dwingen liggend af (CSS toont de draai-prompt in staande stand).
   Een vluchtweg voor wie zijn scherm vergrendeld heeft: deze sessie toch staand. */
function speelTochStaand() {
  const el = document.getElementById('draai-blok');
  if (el) el.classList.add('weg');
}

function startGevecht(samenstelling, soort, rij) {
  const g = {
    soort,
    vijanden: samenstelling.map(vid => maakVijand(vid, rij || 0)),
    speler: { isSpeler: true, blok: 0, status: {} },
    trek: schud([...S.dek]),
    hand: [], afleg: [], uitgeput: [],
    energie: 3, maxEnergie: 3,
    beurt: 0, bezig: false, voorbij: false,
    gekozenKaart: null, gekozenDrank: null
  };
  S.gevecht = g;

  /* metgezel mee het gevecht in: eigen HP uit de run-state, verse blok/status */
  if (heeftMetgezel()) {
    const md = METGEZELLEN[S.metgezel.id];
    g.metgezel = {
      id: S.metgezel.id, naam: md.naam, isMetgezel: true,
      hp: Math.max(1, Math.min(S.metgezel.hp, md.maxHp)), maxHp: md.maxHp,
      blok: 0, status: {}, dood: false
    };
    g.metgezel.intent = md.intent ? md.intent(g.metgezel) : null;
  } else {
    g.metgezel = null;
  }

  if (heeftRelikwie('anker')) g.speler.blok = 10;
  if (heeftRelikwie('warme_mantel') && lichtNiveau() !== 'helder') g.speler.blok += 6;
  if (heeftRelikwie('krachtsteen')) g.speler.status.kracht = 1;
  if (heeftRelikwie('oorlogsbanier') && (g.soort === 'elite' || g.soort === 'baas')) {
    g.speler.status.kracht = (g.speler.status.kracht || 0) + 1;
  }
  if (heeftRelikwie('bronzen_schub')) g.speler.status.doornen = 3;
  if (heeftRelikwie('scherpe_dolk')) g.vijanden.forEach(v => v.status.kwetsbaar = 1);
  if (heeftRelikwie('bottenfluit')) g.vijanden.forEach(v => v.status.zwak = 1);
  if (heeftRelikwie('energiekristal')) g.energie += 1;
  /* de kronen tellen ook al in de allereerste beurt mee */
  const lichtStart = lichtNiveau();
  if (heeftRelikwie('schaduwkroon') && ['duister', 'gedoofd'].includes(lichtStart)) g.energie += 1;
  if (heeftRelikwie('kroon_van_sintels') && lichtStart === 'helder') g.energie += 1;
  if (heeftRelikwie('houten_been')) g.speler.status.doornen = (g.speler.status.doornen || 0) + 1;
  if (heeftRelikwie('duivelboomtak')) g.speler.status.kracht = (g.speler.status.kracht || 0) + 2;
  if (heeftRelikwie('slangenamulet')) {
    const n = 2 + (heeftRelikwie('smaragden_ring') ? 1 : 0);
    g.vijanden.forEach(v => v.status.gif = (v.status.gif || 0) + n);
  }
  /* gedoofde fakkel: vijanden feller, maar de buit is groter */
  g.gedoofd = lichtNiveau() === 'gedoofd';
  if (g.gedoofd) g.vijanden.forEach(v => v.status.kracht = (v.status.kracht || 0) + 1);
  g.heldArt = huidigeHeld().art;

  bouwGevechtDom(g);

  let eersteTrek = 5;
  if (heeftRelikwie('klavertje')) eersteTrek += 2;
  if (heeftRelikwie('oorlogstrommel')) eersteTrek += 1;
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
      el.classList.add('entree');
      el.style.animationDelay = (0.1 + i * 0.18) + 's';
    });
    $('#speler-zone').classList.add('entree-links');
  }
  if (gevechtTikAf) gevechtTikAf();
  gevechtTikAf = Tikker.abonneer(gevechtTik);

  Klank.muziek(soort === 'baas' ? 'baas' : (soort === 'elite' ? 'elite' : 'gevecht'));
  toonScherm('gevecht');
  zetLichtVisueel();
  renderGevecht();
  if (soort === 'baas') toonBaasIntro(g);

  /* de metgezel handelt ook op de éérste beurt — even na de entree, zodat
     je 'm ziet binnenkomen voordat hij toeslaat/schildt/geneest */
  if (g.metgezel) setTimeout(() => {
    if (S.gevecht !== g || g.voorbij) return;
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

/* cinematische bazenintro: titelkaart, dreun, beven */
function toonBaasIntro(g) {
  const b = g.vijanden.find(v => VIJANDEN[v.id].baas);
  if (!b) return;
  const el = document.createElement('div');
  el.id = 'baas-intro';
  el.innerHTML = `<div class="baas-intro-binnen">
    <small>Act ${huidigeAct()} — ${ACT_NAMEN[huidigeAct()] || 'De Diepte'}</small>
    <h1>${b.naam}</h1>
    <span>${VIJANDEN[b.id].titel || ''}</span>
  </div>`;
  $('#scherm-gevecht').appendChild(el);
  Klank.sfx('zwareklap');
  setTimeout(() => { Klank.sfx('dood'); schudScherm(); }, 700);
  setTimeout(() => el.remove(), 3600);
  setTimeout(() => { if (S.gevecht === g && !g.voorbij && VIJANDEN[b.id].baas) baasSpreekt(baasUitspraken(b.id).intro); }, 3900);
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
}

function stopGevechtLus() {
  if (gevechtTikAf) { gevechtTikAf(); gevechtTikAf = null; }
  if (window.Vista) Vista.gevechtEind();
  $('#scherm-gevecht').classList.remove('d3-actief');
}

/* eenmalige opbouw van de gevechts-DOM */
function bouwGevechtDom(g) {
  GDOM = { vijanden: [], speler: null, metgezel: null, hand: new Map(), bg: $('#gevecht-achtergrond') };

  const rij = $('#vijanden-rij');
  rij.innerHTML = '';
  g.vijanden.forEach((v, i) => {
    const def = VIJANDEN[v.id];
    const wrap = document.createElement('div');
    wrap.className = 'vijand' + (def.baas ? ' is-baas' : '') + (def.elite ? ' is-elite' : '');
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
      mz.hidden = false;
      mz.innerHTML = `
        <div class="metgezel-intent"></div>
        <div class="metgezel-art" data-tip="${md.naam} — ${md.tekst}">${md.icoon}</div>
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
    } else {
      mz.hidden = true;
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
  /* de Fluisterende Schedel ziet wat jij niet ziet */
  const niveau = heeftRelikwie('fluisterende_schedel') ? 'helder' : lichtNiveau();
  if (niveau === 'gedoofd') {
    return `<span class="intent intent-duister" data-tip="Het is te donker om de bedoeling te zien">❓</span>`;
  }
  const verborgen = niveau === 'duister';
  if (it.type === 'aanval') {
    if (verborgen) {
      return `<span class="intent intent-aanval" data-tip="${it.naam}: valt aan — te donker om te zien hoe hard">⚔️ ?</span>`;
    }
    const mDoel = it.doelMetgezel ? gMet() : null;
    const richtMet = !!(mDoel && !mDoel.dood);   /* viseert de metgezel (bv. Wegwuiven → Drops) */
    let dmg = it.dmg + (v.status.kracht || 0);
    if ((v.status.zwak || 0) > 0) dmg = Math.floor(dmg * 0.75);
    if (((richtMet ? mDoel : sp()).status.kwetsbaar || 0) > 0) dmg = Math.floor(dmg * 1.5);
    const merk = richtMet ? ` → ${METGEZELLEN[mDoel.id].icoon}` : '';
    const tipWie = richtMet ? METGEZELLEN[mDoel.id].naam : 'jou';
    return `<span class="intent intent-aanval${richtMet ? ' intent-viseert-mg' : ''}" data-tip="${it.naam}: valt ${tipWie} aan voor ${dmg}${it.hits ? '×' + it.hits : ''} schade">⚔️ ${dmg}${it.hits ? '×' + it.hits : ''}${merk}</span>`;
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
      bb.innerHTML = `
        <div class="bb-naam">👑 ${b.naam}</div>
        ${VIJANDEN[b.id].titel ? `<div class="bb-titel">~ ${VIJANDEN[b.id].titel} ~</div>` : ''}
        <div class="bb-balk ${(b.fase || 1) >= 3 ? 'bb-woede' : ''}">
          <div class="bb-vul" style="width:${Math.max(0, b.hp / b.maxHp * 100)}%"></div>
          <span class="bb-tekst">${b.hp}/${b.maxHp}</span>
        </div>
        <div class="bb-fases" data-tip="De baas vecht in drie bedrijven — verzwak hem en zie wat er gebeurt...">
          ${[1, 2, 3].map(f => `<span class="bb-pip ${(b.fase || 1) >= f ? 'aan' : ''}"></span>`).join('')}
        </div>
        ${(b.aegis || 0) > 0 ? `<div class="bb-aegis" data-tip="Pappies Invloed: de Erfprins is ONAANTASTBAAR tot Drops dit goud heeft weggevreten. Gewone aanvallen en gif ketsen af.">🟡 Pappies Invloed · ${b.aegis}</div>` : ''}`;
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
function toonCodex() {
  const volgorde = ['start', 'gewoon', 'ongewoon', 'zeldzaam', 'episch'];
  const rels = Object.keys(RELIKWIEEN).sort((a, b) =>
    volgorde.indexOf(RELIKWIEEN[a].zeld) - volgorde.indexOf(RELIKWIEEN[b].zeld));
  const relOntdekt = rels.filter(r => Codex.relikwieen.includes(r)).length;
  const dranks = Object.keys(DRANKEN);
  const drOntdekt = dranks.filter(d => Codex.dranken.includes(d)).length;
  const mgs = Object.keys(METGEZELLEN).sort((a, b) =>
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
      return `<div class="codex-slot rel-${d.zeld} ${gevallen ? 'gevallen' : ''}" data-mgart="${id}" data-tip="${d.naam}${gevallen ? ' · ✝ offerde zich op' : ''} — klik voor het verhaal" onclick="toonMetgezelBoek('${id}')">${d.icoon}${gevallen ? '<span class="codex-kruis">✝</span>' : ''}</div>`;
    }).join('') + `</div>
    <p class="codex-voet">Alles wat je ooit vond, over alle runs heen. ${relOntdekt + drOntdekt + mgOntdekt === rels.length + dranks.length + mgs.length ? 'De Codex is compleet — de diepte heeft geen geheimen meer voor jou! 🏆' : 'Vind ze allemaal...'}<br>
    <small>🗝️ = opgeladen: dit relikwie kun je bij een nieuwe run éénmalig meenemen uit het Schrijn.</small></p>`;
  verfraaiItemArt($('#overlay-codex'));   /* incl. het Codex-titelicoon (data-icoon) */
  $('#overlay-codex').classList.add('open');
  Klank.sfx('klik');
}

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
      <div class="boek-icoon" data-mgart="${id}">${d.icoon}</div>
      <span class="schaarste-chip" style="--relk:${rgb}">${SCHAARSTE_LABEL[d.zeld] || 'Metgezel'}</span>
      <h3>${d.naam}</h3>
      <p class="boek-effect">${d.tekst}</p>
      ${d.lore ? `<p class="boek-lore">„${d.lore}"</p>` : ''}
      ${(Codex.gevallen || []).includes(id) ? '<p class="boek-gevallen">✝ Offerde zich op. Voorgoed heen — de diepte onthield zijn moed.</p>' : ''}
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
}

function maakKaartEl(c) {
  const def = kdef(c);
  const el = document.createElement('div');
  el.dataset.uid = c.uid;
  el.innerHTML = `
    <div class="kaart-kost"></div>
    ${def.licht ? '<div class="kaart-lichtkost" data-tip="Verbrandt fakkellicht bij het spelen"></div>' : ''}
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
    + (el.classList.contains('nieuw') ? ' nieuw' : '');
  el.querySelector('.kaart-kost').textContent = kost === null ? '✕' : kost;
  const lichtEl = el.querySelector('.kaart-lichtkost');
  if (lichtEl) lichtEl.textContent = '🔥' + kval(c, 'licht');
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
  if (def.type === 'kracht' || def.uitputten) {
    g.uitgeput.push(c);
  } else {
    g.afleg.push(c);
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
  if (b.id === 'de_erfprins') { checkErfprinsFase(b, g); return; }
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

/* De Erfprins escaleert in drie bedrijven (geen splitsing zoals de slijmkoning,
   maar fellere klappen + vaker Drops wegwuiven; de aegis-puzzel blijft de kern). */
function checkErfprinsFase(b, g) {
  const pct = b.hp / b.maxHp;
  if ((b.fase || 1) < 2 && pct <= 0.6) {
    b.fase = 2;
    baasFaseMoment('PAPPIE WORDT GEBELD', UITSPRAKEN._erfprins.fase2);
    geefStatus(b, 'kracht', 1);
    if (window.Vista) Vista.pose(b, 'cast', 2.6);
    pose2D(b, 'cast', 2.6);
  }
  if ((b.fase || 1) < 3 && pct <= 0.3) {
    b.fase = 3;
    baasFaseMoment('VERWENDE WOEDE', UITSPRAKEN._erfprins.fase3);
    geefStatus(b, 'kracht', 2);
    b.intent = VIJANDEN[b.id].kies(b, g.beurt);
    const el = actorEl(b);
    if (el) el.classList.add('woede');
  }
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
    /* in 2D komt alleen de nieuwkomer het toneel op */
    const wraps = document.querySelectorAll('#vijanden-rij .vijand');
    const laatste = wraps[wraps.length - 1];
    if (laatste) laatste.classList.add('entree');
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

  /* Gebroken Zandloper: het zand valt omhoog, energie blijft */
  if (heeftRelikwie('gebroken_zandloper') && g.energie > 0) g.bewaardeEnergie = g.energie;

  if ((g.speler.status.metaalhuid || 0) > 0) geefBlok(g.speler, g.speler.status.metaalhuid);
  g.afleg.push(...g.hand);
  g.hand = [];
  renderGevecht();
  await slaap(350);
  if (gestopt()) return;

  for (const v of g.vijanden) {
    if (v.dood || gestopt()) continue;
    v.blok = 0;

    if ((v.status.gif || 0) > 0) {
      verliesHp(v, v.status.gif);
      v.status.gif--;
      renderGevecht();
      await slaap(380);
      if (gestopt()) return;
      if (v.dood) { if (alleVijanden().length === 0) { gevechtGewonnen(); return; } continue; }
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
      if (it.doe) it.doe(v);
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

  if (alleVijanden().length === 0) { gevechtGewonnen(); return; }
  beginSpelerBeurt();
}

function beginSpelerBeurt() {
  const g = S.gevecht;
  if (!g || g.voorbij) return;
  checkBaasFase(); /* gif-schade in de vijandbeurt kan een fasegrens passeren */
  g.beurt++;
  const s = g.speler;
  s.blok = 0;

  if ((s.status.gif || 0) > 0) {
    verliesHp(s, s.status.gif);
    s.status.gif--;
    if (g.voorbij) return;
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
  /* het Houten Been wortelt zich vast — ná de blok-reset van beurt 1 */
  if (g.beurt === 1 && heeftRelikwie('houten_been')) geefBlok(s, 4);
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

  metgezelBeurt();   /* de bondgenoot handelt aan het begin van je beurt (kan de laatste vijand vellen → onderstaande check vangt dat) */

  /* Zónder Drops vreet niets aan de Pappies Invloed — een trage mercy-decay houdt
     de Erfprins winbaar (maar bestraffend) i.p.v. een softlock als Drops weg is. */
  const _ep = g.vijanden.find(v => v.id === 'de_erfprins' && !v.dood);
  if (_ep && (_ep.aegis || 0) > 0 && (!gMet() || gMet().dood)) _ep.aegis = Math.max(0, _ep.aegis - 1);

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
  g.jongleurOp = false; /* Fakkeljongleur is weer klaar voor zijn act */

  if (alleVijanden().length === 0) { gevechtGewonnen(); return; }
  g.bezig = false;
  renderGevecht();
}

/* ---------- einde van het gevecht ---------- */
async function gevechtGewonnen() {
  const g = S.gevecht;
  if (!g || g.voorbij) return;
  g.voorbij = true;
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
  if (heeftRelikwie('kookpot_van_maxenzele')) geneesHpBuitenGevecht(3);

  if (g.soort === 'baas') {
    /* de doodsklap van een baas verdient een flits en een stilte */
    const verslagenBaas = huidigeBaas().naam;
    baasSpreekt(baasUitspraken(huidigeBaas().id).dood);
    const flits = document.createElement('div');
    flits.className = 'baas-doodflits';
    $('#scherm-gevecht').appendChild(flits);
    schudScherm();
    await slaap(1400);
    flits.remove();
    if (S.gevecht !== g) return;
    S.gevecht = null;
    if (huidigeAct() < ACTS_MAX) {
      volgendeAct(verslagenBaas);   /* nog een act → episch verder afdalen */
    } else {
      wisSave();
      toonEinde(true);             /* laatste act verslagen → echte overwinning */
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
    return !['basis', 'vloek'].includes(k.zeld) && (!k.held || k.held === S.held);
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
  return `<div class="kaart groot ktype-${def.type} zeld-${def.zeld} ${def.licht || def.vuur ? 'kaart-licht' : ''} ${klikbaar ? 'klikbaar' : ''}" data-uid="${c.uid}">
    <div class="kaart-kost">${kkost(c) === null ? '✕' : kkost(c)}</div>
    ${def.licht ? `<div class="kaart-lichtkost" data-tip="Verbrandt fakkellicht bij het spelen">🔥${kval(c, 'licht')}</div>` : ''}
    <div class="kaart-naam">${knaam(c)}</div>
    <div class="kaart-icoon" data-kicoon="${c.id}">${def.icoon}</div>
    <div class="kaart-tekst">${def.tekst(c)}</div>
    <div class="kaart-type">${def.type}</div>
  </div>`;
}

/* kaartkeuze met booster-onthulling en inspectie-zoom:
   opts.onthul  = kaarten beginnen gedekt en flippen open (beloningen)
   opts.bekijkAlleen = geen kies-knop in de zoomweergave (dek-overzicht) */
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
    if (kdef(c).zeld === 'zeldzaam') setTimeout(() => Klank.sfx('schitter'), 250);
  }

  function toonRij() {
    document.onkeydown = null;
    houder.classList.remove('focus-modus');
    houder.classList.toggle('weinig', kaarten.length <= 5);
    $('#kies-hint').textContent = 'Klik een kaart om hem van dichtbij te bekijken'
      + (opts.bekijkAlleen || !bijKeuze ? '.' : ' vóór je kiest.');
    houder.innerHTML = kaarten.map(c => `
      <div class="onthul-kaart ${onthuld.has(c.uid) ? 'open' : ''}" data-uid="${c.uid}">
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
    /* booster: kaarten flippen vanzelf één voor één open */
    if (opts.onthul) {
      kaarten.forEach((c, i) => {
        setTimeout(() => {
          if (onthuld.has(c.uid) || !ov.classList.contains('open')) return;
          const el = houder.querySelector(`.onthul-kaart[data-uid="${c.uid}"]`);
          if (el) onthul(el, c);
        }, 550 + i * 500);
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
    if (kiesKnop) kiesKnop.onclick = () => { document.onkeydown = null; ov.classList.remove('open'); bijKeuze(c); };
    $('#focus-terug').onclick = toonRij;
  }

  $('#kies-overslaan').onclick = () => { document.onkeydown = null; ov.classList.remove('open'); bijOverslaan && bijOverslaan(); };
  toonRij();
  ov.classList.add('open');
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
        <span class="rust-icoon" data-icoon="oppoken">🔥</span><b>Oppoken</b><small>+20 licht voor je fakkel</small>
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
  zetFakkel(20);
  melding('Je fakkel laait weer op (+20 licht).');
  Klank.sfx('buff');
  /* het vuur laait zichtbaar op voor we vertrekken */
  const scene = $('#kv-scene');
  if (scene) scene.classList.add('opgepookt');
  setTimeout(() => renderKaartScherm(), 1200);
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
  setTimeout(() => renderKaartScherm(), 1200);
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

function toonEvent() {
  let pool = EVENTS.filter(e => !S.gebruikteEvents.includes(e.id));
  if (pool.length === 0) { S.gebruikteEvents = []; pool = EVENTS; }
  const ev = kiesUit(pool);
  S.gebruikteEvents.push(ev.id);
  S.huidigEvent = ev.id;
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
  laadEventAfbeelding(ev.id, img => {
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
function volgendeAct(verslagenBaas) {
  S.act = huidigeAct() + 1;
  S.fakkel = 100;                 /* episch: het laatste licht van de baas → je fakkel laait op */
  /* uit het herrezen licht kruipt Drops — je eerste metgezel (alleen als je er nog geen hebt) */
  if (!heeftMetgezel() && (!S.metgezel || !S.metgezel.vluchtig)) {
    geefMetgezel('drops');
    melding('🔥 Uit het herrezen licht vormt zich Drops — een metgezel sluit zich bij je aan!');
  }
  S.pos = null;
  S.kaart = genereerKaart();      /* nieuwe ladder, act-bewust; de verdieping-teller loopt door */
  delete S.beloning; delete S.winkel; delete S.huidigEvent;
  toonActOvergang(verslagenBaas);
}
function toonActOvergang(verslagenBaas) {
  toonScherm('einde');            /* hergebruik het lege einde-scherm als overgangsdoek */
  schermAchtergrond('einde', actBg('kaart'), 0.42);
  Klank.sfx('schitter'); setTimeout(() => Klank.sfx('win'), 250);
  const naam = ACT_NAMEN[S.act] || ('Act ' + S.act);
  $('#scherm-einde').innerHTML = `
    <div class="einde-held einde-winst"><div class="schat-stralen einde-stralen"></div></div>
    <h2 class="scherm-titel einde-titel goud-tekst">ACT ${S.act} — ${naam}</h2>
    <p class="scherm-sub einde-regel">Je trekt het laatste licht uit ${verslagenBaas}. Het stroomt je fakkel in — die laait wonderbaarlijk op. 🔥</p>
    <p class="einde-loopbaan">Je dek, je relikwieën en je littekens dalen met je mee. De diepte wordt killer.</p>
    <div class="einde-knoppen">
      <button class="knop-groot" onclick="renderKaartScherm()">⬇️ Daal dieper af</button>
    </div>`;
}

function toonEinde(gewonnen) {
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
    <h2 class="scherm-titel einde-titel ${gewonnen ? 'goud-tekst' : 'rood-tekst'}">${gewonnen ? 'DE SLIJMKONING IS VERSLAGEN!' : 'JE BENT GEVALLEN...'}</h2>
    <p class="scherm-sub einde-regel">„${regel}"</p>
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
  const held = heldVanDag();
  nieuwSpel(held, dagSeed(), 0);            /* vaste seed, ascensie 0 → eerlijk veld */
  S.daily = true;
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
  const maxOnt = maxOntgrendeld();
  gekozenAscensie = Math.max(0, Math.min(gekozenAscensie, maxOnt));
  schermAchtergrond('held', ACHTERGRONDEN.titel, 0.55);
  $('#scherm-held').innerHTML = `
    <h2 class="scherm-titel">Kies je held</h2>
    <div class="held-rij">` +
    Object.entries(SPELERS).map(([id, h]) => {
      const rel = RELIKWIEEN[h.relikwie];
      const art = (window.karakterSvg && karakterSvg(h.art)) || h.icoon;
      return `<div class="held-kaart-wrap">
        <button class="held-kaart" data-held="${id}" style="--held-gloed:${h.kleur || '255,156,63'}" onclick="kiesHeld('${id}')">
        <div class="held-aura"></div>
        <div class="held-art" data-art="${h.art}">${art}</div>
        <b>${h.naam}</b>
        <small class="held-stijl">${h.stijl}</small>
        ${ontgrendeldNiveau(id) >= 1 ? `<span class="held-asc">🔥 ontgrendeld tot A${ontgrendeldNiveau(id)}</span>` : ''}
        <div class="held-info">❤️ ${h.hp} HP &nbsp;·&nbsp; 🃏 ${h.dek.length} startkaarten</div>
        <div class="held-info">${rel.icoon} <b>${rel.naam}</b><br><i>${rel.tekst}</i></div>
        <span class="held-kies">Speel als ${h.naam} ➤</span>
      </button>
        <button type="button" class="knop-stil held-dek-knop" onclick="bekijkStartdek('${id}', event)">Bekijk startdek</button>
      </div>`;
    }).join('') + `</div>
    <div class="schrijn-vak" id="schrijn-vak">${schrijnHtml()}</div>
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
}

function bekijkStartdek(id, e) {
  if (e) e.stopPropagation();
  const h = SPELERS[id];
  toonKaartKeuze(h.dek.map(k => nieuweKaart(k)), `Startdek — ${h.naam}`, null, () => {}, { bekijkAlleen: true });
}

function kiesHeld(id) {
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
  if ($('#inst-fullscreen')) $('#inst-fullscreen').checked = !!document.fullscreenElement;
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
function instWijzig() {
  Klank.zet('aan', $('#inst-geluid').checked);
  Klank.zet('muziek', parseFloat($('#inst-muziek').value));
  Klank.zet('sfx', parseFloat($('#inst-sfx').value));
  INST.d3 = $('#inst-d3').checked;
  INST.lite = $('#inst-lite').checked;
  if ($('#inst-spraak')) INST.spraak = $('#inst-spraak').checked;
  bewaarInst();
  pasInstToe();
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
    gaFullscreen();
    const naam = (S && S.scherm) || 'titel';
    Klank.muziek(SCHERM_MUZIEK[naam] || 'titel');
    document.removeEventListener('pointerdown', eersteGebaar);
    document.removeEventListener('keydown', eersteGebaar);
  };
  document.addEventListener('pointerdown', eersteGebaar);
  document.addEventListener('keydown', eersteGebaar);
  /* iOS kan de audio na backgrounding opnieuw 'suspenden' → bij elk later gebaar
     opnieuw hervatten (lichtgewicht: checkt enkel de context-state). */
  document.addEventListener('pointerdown', () => { if (window.Klank && Klank.hervat) Klank.hervat(); });

  /* PWA: alleen via http(s), file:// kan geen service worker */
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  naarTitel();
});
