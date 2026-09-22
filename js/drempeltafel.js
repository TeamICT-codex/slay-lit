/* ============================================================
   DE DREMPELTAFEL (v128) — het gokritueel aan de Drempel (Act 1 → 2).
   Drie scherven kopen geen bondgenoot meer, maar een PLAATS AAN DE TAFEL van de
   Drempelwachter. Vier sporten; sport III is een plaats aan het Slachtblok.

   Laden NA js/game.js. Stylesheet: css/drempeltafel.css (+ het mobiele blok in
   css/mobiel.css). Gebruikt uit game.js: S, toonScherm, schermAchtergrond, Klank,
   melding, schudScherm, saveSpel, willekeurig, kiesUit, schud, gedragen, scherfDef,
   neemGedragen, bankGedragen, neemUitStash, draagScherf, bronIcoon, offerWaarde,
   knaam, kdef, verliesHpBuitenGevecht, renderTopbalk, verfraaiItemArt,
   verfraaiKaartIconen, toonActOvergang, startGevecht.

   DRIE HUISREGELS DIE HIER ZICHTBAAR ZIJN:
   1. Geen data in een inline onclick (zie het geheugen 'inline-onclick-bugklasse'):
      alles loopt via data-attributen + ÉÉN delegerende handler (dtKlik).
   2. Elke OBJ[sleutel]-lookup heeft een terugval (zie 'lookup-bugklasse').
   3. Nooit Math.random voor spelkansen: alles via willekeurig()/kiesUit()/schud(),
      zodat een seed reproduceerbaar blijft.

   DE KERN VAN DE MECHANIEK — ÉÉN WORP, VIJF CHOREOGRAFIEËN.
   De uitslag valt precies één keer, in dtStartSpel(), en wordt METEEN gepersisteerd
   (S.drempeltafel.uitslag) vóór er iets beweegt. Elk van de vijf spellen is daarna
   alleen nog een ENSCENERING van die uitslag: geen enkel spel roept willekeurig()
   nog aan om te bepalen of u wint, alleen nog voor sier (welke sector, welke kamer,
   welke nis). Zo klopt de balans in één tabel (DT_KNALKANS), liegen de kanslabels
   niet, en levert herladen midden in een animatie niets op — de knal staat al op
   schijf. De inzet wordt bij het INZETTEN ingenomen en pas bij WINST teruggegeven.
   ============================================================ */

/* ---------- tuning: alles wat balans raakt staat hier ---------- */
/* Exacte twaalfden: zo klopt het rad-label tot op de sector (9/8/7/4 gevende sectoren)
   en is de getoonde kans nooit een afronding. P(sport III) ≈ 29 %, P(sport IV) ≈ 9,7 %. */
const DT_KNALKANS = [3 / 12, 4 / 12, 5 / 12, 8 / 12];   /* per ronde; ronde 5+ = de laatste waarde */
const DT_HP_INZET = 18;
const DT_ZWAARTE_PER_SPORT = 14;                        /* +HP op de encounter per gewonnen sport */
const DT_RUG_SCHERF = 'vlamwachter_episch';             /* het sigil op de achterkant van de paren-tegels */
/* DEKVLOER: de bank neemt nooit uw laatste kaart. Een dek van nul breekt namelijk meer dan
   de speelbaarheid — laadSpel() gooit een save met een leeg dek weg (game.js) en
   startGevecht schudt een lege trekstapel. Eén kaart is een harde ondergrens; de architect
   mag hem gerust optrekken als een dun dek ook zonder crash onspeelbaar voelt. */
const DT_DEKVLOER = 1;

/* de ladder — vier sporten. Sport I kreeg er op 22 sep een zeldzame kaartkeuze bij
   (beslissing Thomas): stoppen na twee sporten is dan ook zonder het blok iets waard. */
const DT_LADDER = [
  { id: 'beeltenis',  sport: 'I',   kort: 'beeltenissen + kaart', naam: 'Drie beeltenissen + een zeldzame kaart', emoji: '🖼️', artSoort: 'kaart',     artId: 'vlammenkling',      tekst: 'Drie platen die niemand anders op zijn kaarten krijgt — en u kiest er één zeldzame kaart bij.' },
  { id: 'relikwie',   sport: 'II',  kort: 'episch relikwie',      naam: 'De Kroon van Sintels',                   emoji: '👑', artSoort: 'relikwie',  artId: 'kroon_van_sintels', tekst: 'Een episch relikwie, nog warm van de vorige eigenaar. Nu wordt het interessant.' },
  { id: 'slachtblok', sport: 'III', kort: 'HET SLACHTBLOK',       naam: 'EEN PLAATS AAN HET SLACHTBLOK',          emoji: '🪓', artSoort: 'karakter',  artId: 'slachtblok_altaar', tekst: 'De wand schuift open naar het blok. Offer twee kaarten en smeed uw eigen wapen.' },
  { id: 'dubbel',     sport: 'IV',  kort: 'dubbel gesmeed',       naam: 'Gebrandmerkt — dubbel gesmeed',          emoji: '⚔️', artSoort: 'kaart',     artId: 'gesmeed_kaart',     tekst: 'Twee keer het effect, één keer de kost. Gebrandmerkt in de Codex.' }
];

const DT_SPELLEN = [
  { id: 'rad',      naam: 'Het Rad',        uitleg: 'Twaalf sectoren. U zet in, het rad kiest.' },
  { id: 'revolver', naam: 'De Revolver',    uitleg: 'Zes kamers, u weet hoeveel er geladen zijn.' },
  { id: 'paren',    naam: 'De Paren',       uitleg: 'Vind twee paren voor u een as-tegel omdraait.' },
  { id: 'hooglaag', naam: 'Hoog of Laag',   uitleg: 'De bank legt open. Twee keer goed raden.' },
  { id: 'nissen',   naam: 'De Drie Nissen', uitleg: 'Eén nis geeft. De rest neemt. U kiest blind.' }
];

const DT_ZINNEN = [
  '„Ga zitten. Alles wat u bij u draagt, is bespreekbaar."',
  '„Nog een ronde? De wand heeft geen haast."',
  '„U wint. Dat gebeurt. Het went nooit."',
  '„Twee keer geluk is een patroon. Drie keer is een schuld."'
];

/* DE ENCOUNTER-POEL — VASTE HP, buiten de act-schaling (via startGevecht-opts.vasteHp).
   Zonder die vaste HP spreidde dezelfde kiesUit-worp van 50 tot 251 HP: de act-schaling
   (×1.30 per act) en de elite/episch-vlaggen lopen hier te ver uiteen. De net verslagen
   Slijmkoning zit er bewust NIET in (hij verliest als 'elite' zijn hele machinerie) en de
   Act 3-elites evenmin. het_origineel start als 'episch' zodat hij zijn intro houdt. */
const DT_VIJANDEN = [
  { id: 'de_drempelwachter', soort: 'elite',  hp: 112, rang: 'wachter · de poort',   zin: '„U speelde met mijn tafel. Nu speel ik met u."' },
  { id: 'de_verzwolgene',    soort: 'elite',  hp: 104, rang: 'elite · de diepte',    zin: 'Iets dat te lang aan deze tafel zat en nooit meer opstond.' },
  { id: 'steengolem',        soort: 'elite',  hp: 94,  rang: 'elite · de wand',      zin: 'De wand die u opende, staat nu recht.' },
  { id: 'het_origineel',     soort: 'episch', hp: 104, rang: 'episch · de doorslag', zin: 'Het kijkt naar u zoals u naar een doorslag kijkt.' }
];

/* De drie relikwieën die bij het GEVEN maxHp verzetten (geefRelikwie in game.js). Neemt de
   bank er één in, dan moet die verzetting mee terug — en bij winst opnieuw vooruit. Geen
   tabel-lookup zonder terugval: een onbekend id geeft gewoon 0 (lookup-bugklasse). */
const DT_MAXHP_RELIKWIE = { bloedrobijn: 8, het_grootboek: 12, de_gouden_handdruk: -8 };

/* de kaart-art per paren-letter; 'as' is de knal-tegel */
const DT_PAREN_ART = { a: 'vlammenkling', b: 'doornenhuid', c: 'gifvlam', as: 'asregen' };

/* ---------- lopende zitting: alles wat de save NIET hoeft te kennen ----------
   Alle PERSISTENTE staat woont in S.drempeltafel — daardoor is 'hervatten' gewoon
   'opnieuw renderen', zonder herstelcode per fase. */
let _dt = null;

/* ============================================================
   KLEINE HELPERS
   ============================================================ */
function dtVerseState() {
  return {
    fase: null,        /* null = de nissen staan nog open (nog niets verbrand, nog niets te hervatten) */
    ronde: 1,
    pot: [],           /* ladder-ids: 'beeltenis' | 'relikwie' | 'slachtblok' | 'dubbel' */
    inzet: 'kaart',    /* 'kaart' | 'hp' | 'relikwie' */
    spel: null,        /* 'rad' | 'revolver' | 'paren' | 'hooglaag' | 'nissen' */
    uitslag: null,     /* true = winst, false = knal — DE ENIGE WORP, gezet vóór de animatie */
    inzetData: null,   /* wat de bank NU vasthoudt (kaart/HP/relikwie), zodat winst 'm terug kan geven */
    relInzet: null,    /* welk relikwie deze ronde op het spel staat (stabiel: geen her-rol-shopping) */
    vijand: null,      /* het id uit DT_VIJANDEN */
    uitTeKeren: null,  /* de pot die P3 ná de gewonnen encounter uitkeert */
    dekVerlies: 0,     /* hoeveel kaarten de bank deze zitting innam (voor de 'uw dek'-stat) */
    dubbel: false,     /* sport IV-intentie; toonSlachtblok leest 'm, smeedKaart wist 'm (P3 zet 'm) */
    gedaan: false      /* P3 zet dit op true bij de uitbetaling — daarna gaat hervatScherm weer naar de kaart */
  };
}
function dtSt() { return (typeof S !== 'undefined' && S && S.drempeltafel) || null; }
function dtFase() { const st = dtSt(); return (st && st.fase) || 'nissen'; }
function dtKnalkans() {
  const st = dtSt();
  const r = Math.max(1, (st && st.ronde) || 1);
  return DT_KNALKANS[Math.min(r - 1, DT_KNALKANS.length - 1)];
}
function dtWinTwaalfden() { return Math.round(12 * (1 - dtKnalkans())); }
function dtKansLabel() { return dtWinTwaalfden() + '/12 · ' + Math.round((1 - dtKnalkans()) * 100) + ' %'; }
function dtLadderDef(id) { return DT_LADDER.find(p => p.id === id) || DT_LADDER[0]; }          /* terugval, nooit undefined */
function dtSpelDef(id) { return DT_SPELLEN.find(p => p.id === id) || null; }
function dtVijandDef(id) { return DT_VIJANDEN.find(v => v.id === id) || DT_VIJANDEN[0]; }      /* terugval, nooit undefined */
function dtMaxHpDelta(id) { return DT_MAXHP_RELIKWIE[id] || 0; }                                /* onbekend relikwie = 0 */
/* data.js declareert RELIKWIEEN/VIJANDEN met const: die staan NIET op window (alleen MYSTERIES,
   SPELERS en SYNERGIE zijn expliciet geexporteerd). Guarden met window.RELIKWIEEN gaf dus stil
   'undefined' en zette de relikwie-inzet permanent uit. Daarom typeof-guards, geen window. */
function dtRelDef(id) { return (typeof RELIKWIEEN !== 'undefined' && RELIKWIEEN[id]) || null; }
function dtVijandNaam(id) { const d = (typeof VIJANDEN !== 'undefined' && VIJANDEN[id]) || null; return (d && d.naam) || id; }
/* de beste kaart van het dek: hoogste offerWaarde, bij gelijkspel de oudste (uid) — géén
   willekeur, zodat de waarschuwing op de tafel niet liegt over wat de bank zal pakken */
function dtBesteKaart() {
  if (!S || !Array.isArray(S.dek) || !S.dek.length) return null;
  return S.dek.slice().sort((a, b) => (offerWaarde(b) - offerWaarde(a)) || ((a.uid || 0) - (b.uid || 0)))[0];
}
/* symmetrisch verdeelde gevende sectoren, zodat het wiel niet in twee blokken valt.
   Het aantal true's is exact 12 − knal-twaalfden: het label klopt dus tot op de sector. */
function dtRadSectoren() {
  const geeft = dtWinTwaalfden();
  return Array.from({ length: 12 }, (_, i) => (i % 2 === 0)
    ? (i / 2) < Math.ceil(geeft / 2)
    : ((11 - i) / 2) < Math.floor(geeft / 2));
}
/* beweging uit: dezelfde twee luiken als de rest van het spel — dan valt de uitslag meteen */
function dtStil() {
  const rm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return !!(rm || document.body.classList.contains('lite'));
}
function dtTimer(fn, ms) {
  if (!_dt) return null;
  const id = setTimeout(() => { if (_dt) fn(); }, Math.max(0, ms || 0));
  _dt.timers.push(id);
  return id;
}
function dtWisTimers() { if (_dt) { _dt.timers.forEach(clearTimeout); _dt.timers = []; } }
function dtEsc(t) { return String(t == null ? '' : t).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c])); }

/* Art via de HUISLADERS (verfraaiItemArt / verfraaiKaartIconen), nooit een kale <img>
   zonder src: de span draagt het data-attribuut en de emoji-terugval, en de lader vervangt
   de inhoud alleen als de plaat bestaat. */
function dtArtSpan(soort, id, emoji, klasse) {
  const attr = { kaart: 'data-kicoon', relikwie: 'data-rart', karakter: 'data-vart', scherf: 'data-shart' }[soort] || 'data-vart';
  const basis = 'dt-art' + (soort === 'kaart' ? ' kaart-icoon' : '') + (klasse ? ' ' + klasse : '');
  return `<span class="${basis}" ${attr}="${dtEsc(id)}">${emoji || ''}</span>`;
}
/* een art-slot ná de bouw omwisselen (gok-nissen: dicht → gift/as). De laders vervangen de
   inhoud alleen als er nog geen <img> in zit, dus eerst leegmaken. */
function dtZetArt(el, soort, id, emoji) {
  if (!el) return;
  ['data-kicoon', 'data-rart', 'data-vart', 'data-shart'].forEach(a => el.removeAttribute(a));
  el.classList.toggle('kaart-icoon', soort === 'kaart');
  const attr = { kaart: 'data-kicoon', relikwie: 'data-rart', karakter: 'data-vart', scherf: 'data-shart' }[soort] || 'data-vart';
  el.innerHTML = emoji || '';
  el.setAttribute(attr, id);
  if (soort === 'kaart') { if (typeof verfraaiKaartIconen === 'function') verfraaiKaartIconen(el.parentNode || el); }
  else if (typeof verfraaiItemArt === 'function') verfraaiItemArt(el.parentNode || el);
}
function dtVerfraai(wortel) {
  if (!wortel) return;
  if (typeof verfraaiItemArt === 'function') verfraaiItemArt(wortel);
  if (typeof verfraaiKaartIconen === 'function') verfraaiKaartIconen(wortel);
}

/* ============================================================
   OPENEN / SLUITEN
   ============================================================ */
function toonDrempeltafel(naSluit) {
  if (typeof S === 'undefined' || !S) return;
  if (!S.drempeltafel) S.drempeltafel = dtVerseState();
  const st = S.drempeltafel;
  /* defensief aanvullen: een save van een oudere bouw (of een half object) mag niets breken */
  if (!Array.isArray(st.pot)) st.pot = [];
  if (!st.ronde || st.ronde < 1) st.ronde = 1;
  if (!st.inzet) st.inzet = 'kaart';
  if (typeof st.dekVerlies !== 'number') st.dekVerlies = 0;
  /* staat er een tafel open zonder relikwie-inzet (save van een oudere bouw, of een stuk dat
     intussen weg is), dan rolt hij hier één keer — bij het OPENEN, niet tijdens een render. */
  if (st.fase === 'tafel' && !st.relInzet) dtKiesRelInzet();
  /* PLAN §2.1: saveSpel() meteen bij de opening. Dit is de enige commit van de tafel-opening:
     volgendeAct saved vlak vóór toonActOvergang, maar die tak halen we nooit. Zonder deze
     save spoelt een herlaad hier terug tot vóór de Slijmkoning.
     REVIEW F1 — de verse state gaat MEE in die save (hij stond er vroeger vóór). fase blijft
     null, dus een herlaad op het nissenscherm verliest de tafel nog steeds; maar nu wéét
     hervatScherm dat er een tafel openstond en kan hij de gedragen tas alsnog bankieren in
     plaats van haar 'at risk' te laten hangen. */
  saveSpel();

  /* de scène: het gevecht-scherm loslaten, de poortplaat eronder, muziek stil */
  toonScherm('einde');
  schermAchtergrond('einde', 'achtergronddrempel.webp', 0.5, 'center');
  Klank.muziek('stil');
  const se = document.getElementById('scherm-einde');
  if (se) se.innerHTML = '';   /* geen stale act-overgang/nederlaag onder het doek */

  /* een tweede opening (DEV, of een hervat terwijl er nog een doek hangt) mag geen oude
     timer laten doorlopen: die zou op de NIEUWE zitting resolven. */
  dtWisTimers();
  _dt = { naSluit: naSluit || null, geplaatst: [], timers: [], bezig: false, tab: 'inzet', spelState: null };

  /* hervatten = gewoon renderen in de gepersisteerde fase. Alleen de spelfase heeft een
     werkstaat nodig; die bouwen we opnieuw uit de AL GEVALLEN uitslag, dus het spel begint
     visueel opnieuw maar de afloop ligt vast. */
  if (dtFase() === 'spel') {
    if (typeof st.uitslag !== 'boolean' || !dtSpelDef(st.spel)) st.fase = 'tafel';   /* halve save → veilig terug naar de tafel */
    else _dt.spelState = dtBouwSpelState(st.uitslag);
  }

  let ov = document.getElementById('overlay-drempeltafel');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'overlay-drempeltafel';
    ov.className = 'roof-overlay dt-overlay';
    ov.addEventListener('click', dtKlik);   /* ÉÉN delegerende handler — zie inline-onclick-bugklasse */
    document.body.appendChild(ov);
  }
  renderDrempeltafel();
  requestAnimationFrame(() => { const o = document.getElementById('overlay-drempeltafel'); if (o) o.classList.add('open'); });
  Klank.sfx('zwareklap');
}

/* alleen het doek opruimen (de encounter gaat hierlangs: die wil géén act-overgang) */
function dtVerwijderOverlay() {
  dtWisTimers();
  const ov = document.getElementById('overlay-drempeltafel');
  if (ov) { ov.classList.remove('open'); setTimeout(() => ov.remove(), 300); }
  _dt = null;
}

/* de tafel verlaten NAAR de afdaling. gedaan wordt hier NIET gezet: dat doet de
   uitbetaling (P3). Zonder naSluit dezelfde terugval als drempelSlaOver had. */
function sluitDrempeltafel() {
  const na = _dt && _dt.naSluit;
  dtVerwijderOverlay();
  if (na) na();
  else if (typeof toonActOvergang === 'function') toonActOvergang(S && S._verslagenBaas);
}

/* ============================================================
   RENDER — één functie per fase, net als renderSlachtblok()
   ============================================================ */
function renderDrempeltafel() {
  const ov = document.getElementById('overlay-drempeltafel');
  if (!ov || !_dt || !dtSt()) return;
  /* halve save of onbekend spel: veilig terug naar de tafel i.p.v. een dood scherm waarvan
     alle knoppen op hun fase-guard stuklopen (lookup-bugklasse: elke fase heeft een terugval) */
  if (dtFase() === 'spel' && !_dt.spelState) dtSt().fase = 'tafel';
  const fase = dtFase();
  const bouwer = { nissen: dtNissenHtml, tafel: dtTafelHtml, spel: dtRenderSpel, uitkomst: dtUitkomstHtml, encounter: dtEncounterHtml }[fase] || dtNissenHtml;
  /* BEWUST GEEN fase-pillen uit het prototype: dat was DEV-navigatie. Wie de fases wil
     springen gebruikt devDrempeltafelFase() — niet de speler. Niet 'terugrepareren'. */
  const kop = `<div class="dt-kop">
      <div class="dt-kop-tekst">
        <h2>DE DREMPELTAFEL</h2>
        <p>Drie scherven kopen u een plaats. Wat u daarna verliest, kiest de bank.</p>
      </div>
    </div>`;
  /* de fase op het doek: zo kan het mobiele spoor per fase inklappen. Op een liggende
     telefoon van 360px hoog vreet de kop anders een vijfde van het speelveld. */
  ov.innerHTML = '<div class="dt-doek dt-fase-' + fase + '">' + kop + bouwer() + '</div>';
  dtVerfraai(ov);
  if (fase === 'spel') dtMuteerSpel();
}

/* ============================================================
   FASE 1 — DE NISSEN
   ============================================================ */
function dtNissenHtml() {
  /* de poel is ALLEEN wat u DRAAGT; de bank (Codex-stash) blijft veilig en onaangeroerd */
  const geplaatst = _dt.geplaatst;
  const famVolgorde = ['drops', 'vlamwachter', 'mosgeest'];
  const fam = sid => { const d = scherfDef(sid); return Math.max(0, famVolgorde.indexOf(d && d.mid)); };
  const famKlasse = sid => { const d = scherfDef(sid); return d ? 'fam-' + d.mid : ''; };
  const pool = gedragen().filter(sid => !geplaatst.includes(sid)).sort((a, b) => fam(a) - fam(b));

  const nissen = [0, 1, 2].map(i => {
    const sid = geplaatst[i];
    if (!sid) return '<div class="dt-nis"><span class="dt-art"></span><small>leeg</small></div>';
    const d = scherfDef(sid);
    return `<button class="dt-nis vol ${famKlasse(sid)}" data-dt="nis-weg" data-sid="${dtEsc(sid)}">
      ${dtArtSpan('scherf', sid, bronIcoon(d && d.bron))}<small>gevoed</small></button>`;
  }).join('');

  const poolHtml = pool.length
    ? pool.map(sid => { const d = scherfDef(sid); return `<button class="dt-scherf ${famKlasse(sid)}" data-dt="nis-plaats" data-sid="${dtEsc(sid)}">${dtArtSpan('scherf', sid, bronIcoon(d && d.bron))}</button>`; }).join('')
    : `<p class="dt-leeg">${geplaatst.length ? 'Al uw scherven liggen in de nissen.' : 'U draagt geen scherven. De wand blijft dicht — voor deze afdaling.'}</p>`;

  const klaar = geplaatst.length === 3;
  return `<div class="dt-nissen">
    <div class="dt-nis-kolom">
      <div class="dt-oogje">de drempel · einde act 1</div>
      <p class="dt-lore">Drie koude nissen in de poortwand. Voed ze met <b>drie scherven, van welk maaksel ook</b>, en de wand geeft mee — niet naar een bondgenoot, maar naar een <b>tafel</b>. Daarachter zit iets dat al heel lang niemand meer heeft zien winnen.</p>
      <p class="dt-quote">„Drie scherven is geen sleutel. Het is een <b>inleg</b>."</p>
      <div class="dt-nis-rij">${nissen}</div>
      <div class="sb-balk">
        <button class="knop-stil" data-dt="loop-voorbij">Loop voorbij — de poort blijft dicht</button>
        <button class="knop-groot" ${klaar ? '' : 'disabled'} data-dt="voed">🜂 Voed de drempel (${geplaatst.length}/3)</button>
      </div>
    </div>
    <div class="dt-scherf-kolom">
      <div class="dt-oogje">uw scherven</div>
      <div class="dt-scherf-rooster">${poolHtml}</div>
      <p class="dt-fijn">Scherven van één maaksel gloeien in dezelfde kleur — maar de wand telt alleen dát het er drie zijn. Ze zijn na dit ritueel <b>verbrand</b>. Wat u niet plaatst, bankt veilig.</p>
    </div>
  </div>`;
}
function dtPlaatsScherf(sid) {
  if (!_dt || dtFase() !== 'nissen' || _dt.bezig) return;
  if (_dt.geplaatst.length >= 3 || _dt.geplaatst.includes(sid) || !gedragen().includes(sid)) return;
  _dt.geplaatst.push(sid);
  Klank.sfx('klik');
  renderDrempeltafel();
}
function dtHaalWegScherf(sid) {
  if (!_dt || dtFase() !== 'nissen' || _dt.bezig) return;
  _dt.geplaatst = _dt.geplaatst.filter(x => x !== sid);
  Klank.sfx('klik');
  renderDrempeltafel();
}
/* 'Loop voorbij' is GEEN doodlopend einde: de rest van uw tas bankt veilig en de act-overgang
   speelt zoals altijd. fase blijft null → een herlaad hierna gaat gewoon naar de kaart.
   'gedaan' valt hier wél (review F1): de tafel IS afgehandeld. Zonder die vlag zou de
   nissen-vangnet in hervatScherm bij élke latere herlaad in Act 2 opnieuw vuren en je
   tijdens de afdaling gevonden scherven ongevraagd bankieren. */
function dtLoopVoorbij() {
  if (!_dt || dtFase() !== 'nissen' || _dt.bezig) return;
  bankGedragen();
  const st = dtSt();
  if (st) { st.fase = null; st.gedaan = true; }
  saveSpel();
  sluitDrempeltafel();
}
function dtVoedDrempel() {
  if (!_dt || dtFase() !== 'nissen' || _dt.bezig || _dt.geplaatst.length !== 3) return;
  _dt.bezig = true;
  _dt.geplaatst.forEach(sid => neemGedragen(sid));   /* verbrand — precies zoals het oude ritueel */
  _dt.geplaatst = [];
  bankGedragen();                                     /* de rest van de tas is nu veilig */
  const st = dtSt();
  st.fase = 'tafel'; st.ronde = 1; st.pot = []; st.spel = null; st.uitslag = null;
  st.inzetData = null; st.relInzet = null; st.dekVerlies = 0;
  dtKiesRelInzet();   /* de relikwie-inzet rolt bij de RONDESTART, nooit tijdens een render */
  saveSpel();
  _dt.bezig = false;
  Klank.sfx('zwareklap');
  renderDrempeltafel();
}

/* ============================================================
   FASE 2 — DE TAFEL
   ============================================================ */
/* welk relikwie staat deze ronde op het spel? Eén keer per RONDESTART gerold en meteen
   gepersisteerd: anders kan de speler door heen en weer te klikken (of te herladen)
   net zo lang her-rollen tot de bank naar zijn minst geliefde relikwie kijkt.
   REVIEW F1: die worp zat vroeger IN dtRelInzetId, en die wordt vanuit dtTafelHtml
   aangeroepen — een pure render die dan muteerde en saveSpel() deed (elke re-render van de
   tafelfase raakte localStorage, en renderDrempeltafel() was niet idempotent). Rollen
   gebeurt nu alleen nog bij de rondestart (dtKiesRelInzet); dtRelInzetId LEEST uitsluitend. */
function dtKiesRelInzet() {
  const st = dtSt();
  if (!st || typeof S === 'undefined' || !S) return null;
  const kandidaten = (S.relikwieen || []).filter(r => { const d = dtRelDef(r); return d && !d.start; });
  st.relInzet = kandidaten.length ? kiesUit(kandidaten) : null;
  return st.relInzet;
}
function dtRelInzetId() {
  const st = dtSt();
  if (!st || typeof S === 'undefined' || !S || !st.relInzet) return null;
  /* het gekozen stuk moet nog in bezit zijn én nog inzetbaar (een relikwie dat intussen weg
     is, of een save van een andere bouw) — anders staat er deze ronde niets op het spel. */
  const d = dtRelDef(st.relInzet);
  return (d && !d.start && (S.relikwieen || []).indexOf(st.relInzet) >= 0) ? st.relInzet : null;
}
function dtMagKaartInzetten() { return !!(S && Array.isArray(S.dek) && S.dek.length > DT_DEKVLOER); }
function dtInzetOpties() {
  const beste = dtBesteKaart();
  const relId = dtRelInzetId();
  const relNaam = (relId && (dtRelDef(relId) || {}).naam) || 'een relikwie';
  return [
    { id: 'kaart',    icoon: '🃏', naam: 'Een kaart',           detail: !beste ? 'uw dek is leeg' : !dtMagKaartInzetten() ? 'uw laatste kaart blijft van u' : 'de bank kiest ' + knaam(beste), kan: !!beste && dtMagKaartInzetten() },
    { id: 'hp',       icoon: '❤️', naam: DT_HP_INZET + ' HP',   detail: 'u staat op ' + (S ? S.hp : 0),                              kan: !!(S && S.hp > DT_HP_INZET) },
    { id: 'relikwie', icoon: '👑', naam: 'Een relikwie',        detail: relId ? relNaam : 'niets af te staan',                       kan: !!relId }
  ];
}
function dtTafelHtml() {
  const st = dtSt();
  const kans = Math.round(dtKnalkans() * 100);
  const beste = dtBesteKaart();
  const opties = dtInzetOpties();
  /* de gekozen inzet moet ook echt kunnen: anders schuiven we naar de eerste die kan */
  if (!opties.some(o => o.id === st.inzet && o.kan)) { const eerste = opties.find(o => o.kan); st.inzet = eerste ? eerste.id : 'kaart'; }
  const relId = dtRelInzetId();

  const ladder = DT_LADDER.map((p, i) => {
    const gewonnen = st.pot.includes(p.id), nu = (st.ronde - 1) === i, sleutel = p.id === 'slachtblok';
    const merk = gewonnen ? '✓ binnen' : nu ? 'deze ronde' : sleutel ? 'de tafelprijs' : '';
    return `<div class="dt-sport${gewonnen ? ' gewonnen' : ''}${nu ? ' nu' : ''}${sleutel ? ' sleutel' : ''}">
      <i>${p.sport}</i>${dtArtSpan(p.artSoort, p.artId, p.emoji, 'dt-sport-art')}<b>${p.kort}</b><small>${merk}</small></div>`;
  }).join('');

  const inzetten = opties.map(o => `<button class="dt-keuze${st.inzet === o.id ? ' aan' : ''}" ${o.kan ? '' : 'disabled'} data-dt="inzet" data-id="${o.id}">
      <span class="dt-keuze-icoon">${o.icoon}</span><span class="dt-keuze-tekst"><b>${o.naam}</b><small>${dtEsc(o.detail)}</small></span></button>`).join('');

  /* ALLE VIJF spellen tonen dezelfde, ECHTE rondekans — het spel is een kleedje over één worp */
  const label = dtKansLabel();
  const spellen = DT_SPELLEN.map(sp => `<button class="dt-spel${st.spel === sp.id ? ' aan' : ''}" data-dt="spel" data-id="${sp.id}">
      <span class="dt-spel-rij"><strong>${sp.naam}</strong><em>${label}</em></span><small>${sp.uitleg}</small></button>`).join('');

  /* de spanningsdrager: toon altijd de ÉCHTE inzet die eraan gaat */
  let waarschuwing = '';
  if (st.inzet === 'kaart' && beste) {
    waarschuwing = `<div class="dt-waarschuwing">${dtArtSpan('kaart', beste.id, '🃏', 'dt-waarschuwing-art')}
      <p>De bank kijkt naar <b>${dtEsc(knaam(beste))}</b> — uw beste kaart. Knalt u, dan is die weg voor de rest van de afdaling.</p></div>`;
  } else if (st.inzet === 'relikwie' && relId) {
    const rn = (dtRelDef(relId) || {}).naam || 'uw relikwie';
    waarschuwing = `<div class="dt-waarschuwing">${dtArtSpan('relikwie', relId, '👑', 'dt-waarschuwing-art')}
      <p>De bank kijkt naar <b>${dtEsc(rn)}</b>. Knalt u, dan verdwijnt het in de nis alsof het er altijd hoorde.</p></div>`;
  }

  const kanStoppen = st.pot.length >= 2;
  /* HET NOODLUIK (review F1). Kan de bank NIETS meer innemen — dek op de vloer, te weinig HP
     en geen af te staan relikwie — dan is 'Zet in' een dode knop, terwijl 'Stoppen' uit stond
     zolang de pot < 2 was. Die save hield zichzelf in stand (hervatScherm stuurt terug naar
     deze tafel), dus de run was onherstelbaar dood. Nu sluit de tafel zonder tol. */
  const geenInzet = !opties.some(o => o.kan);
  const laagste = st.pot.length ? dtLadderDef(st.pot[0]).kort : '';
  /* de lange staart zit in een eigen span: op een smal/kort scherm verbergt mobiel.css 'm,
     want dezelfde uitleg staat dan al in de tafelvoet eronder. */
  const stopTekst = geenInzet
    ? 'De tafel verlaten<span class="dt-stop-lang"> — de bank kan niets meer innemen</span>'
    : kanStoppen
    ? `Stoppen<span class="dt-stop-lang"> — de wand houdt uw laagste sport (${laagste})</span>`
    : 'Stoppen<span class="dt-stop-lang"> — u hebt nog niets om te houden</span>';

  const potBlok = st.pot.length ? `<div class="dt-pot">
      <div class="dt-oogje">op de tafel</div>
      <div class="dt-pot-rij">${st.pot.map(id => { const p = dtLadderDef(id); return `<span class="dt-pot-item"><i>${p.emoji}</i>${p.kort}</span>`; }).join('')}</div>
    </div>` : '';

  const spelNaam = (dtSpelDef(st.spel) || {}).naam;
  const ladderZin = st.ronde < 3 ? `Nog ${3 - st.ronde} ronde${3 - st.ronde === 1 ? '' : 's'} tot het Slachtblok.`
    : st.ronde === 3 ? 'Deze ronde speelt u voor het Slachtblok.'
    : 'Voorbij het blok is er nog één sport.';

  return `<div class="dt-tafel">
    <div class="dt-bank">
      <div class="dt-bank-art"><div class="dt-bank-gloed"></div>${dtArtSpan('karakter', 'de_drempelwachter', '🔥')}</div>
      <div class="dt-bank-kop"><div class="dt-bank-naam">De Drempelwachter</div><div class="dt-oogje">bankhouder</div></div>
      <p class="dt-bank-quote">${DT_ZINNEN[Math.min(st.ronde - 1, DT_ZINNEN.length - 1)]}</p>
    </div>
    <div class="dt-paneel">
      <div class="dt-stats">
        <div class="dt-stat"><span>Ronde</span><b>${st.ronde}</b></div>
        <div class="dt-stat"><span>Uw winst</span><b class="${st.pot.length ? '' : 'dt-leeg-waarde'}">${st.pot.length || 'leeg'}</b></div>
        <div class="dt-stat dt-risico"><span>Kans op knal</span><b>${kans}%</b></div>
      </div>
      <div class="dt-ladder">
        <div class="dt-ladder-kop"><span>De ladder</span><span class="dt-ladder-zin">${ladderZin}</span></div>
        ${ladder}
        <p class="dt-ladder-voet">Elke gewonnen ronde klimt één sport. Knalt u, dan valt u van de hele ladder — u houdt niets.</p>
      </div>
      ${waarschuwing}
      <div class="dt-inleg" data-tab="${_dt.tab === 'spel' ? 'spel' : 'inzet'}">
        <div class="dt-tabs">
          <button class="dt-tab${_dt.tab !== 'spel' ? ' aan' : ''}" data-dt="tab" data-id="inzet">1 · wat legt u in</button>
          <button class="dt-tab${_dt.tab === 'spel' ? ' aan' : ''}" data-dt="tab" data-id="spel">2 · welk spel</button>
        </div>
        <div class="dt-sectie dt-sectie-inzet">
          <div class="dt-oogje">1 · wat legt u in</div>
          <div class="dt-keuzes">${inzetten}</div>
        </div>
        <div class="dt-sectie dt-sectie-spel">
          <div class="dt-oogje">2 · welk spel eist u</div>
          <div class="dt-spellen">${spellen}</div>
          <p class="dt-fijn">Alle vijf spellen delen dezelfde rondekans (${label} dat u klimt). Kies wat u het liefst ziet gebeuren.</p>
        </div>
      </div>
      ${potBlok}
      <p class="dt-tafelvoet">Ronde ${st.ronde}: knalkans ${kans}%. Wint u, dan klimt u een sport; knalt u, dan valt u van de hele ladder. Stoppen kan alleen tussen rondes: u houdt alles behalve uw laagste sport — de wand wil altijd iets.</p>
      <div class="sb-balk">
        <button class="knop-stil" ${(kanStoppen || geenInzet) ? '' : 'disabled'} data-dt="stop">${stopTekst}</button>
        <button class="knop-groot" ${(st.spel && !geenInzet) ? '' : 'disabled'} data-dt="zet-in">🜂 ${geenInzet ? 'De bank vindt niets' : st.spel ? 'Zet in — ' + spelNaam : 'Kies een spel'}</button>
      </div>
    </div>
  </div>`;
}
function dtZetInzet(id) {
  if (!_dt || dtFase() !== 'tafel' || _dt.bezig) return;
  dtSt().inzet = id;
  Klank.sfx('klik');
  renderDrempeltafel();
}
function dtZetSpel(id) {
  if (!_dt || dtFase() !== 'tafel' || _dt.bezig || !dtSpelDef(id)) return;
  dtSt().spel = id;
  Klank.sfx('klik');
  renderDrempeltafel();
}
function dtZetTab(id) {
  if (!_dt || dtFase() !== 'tafel') return;
  _dt.tab = (id === 'spel') ? 'spel' : 'inzet';
  Klank.sfx('klik');
  renderDrempeltafel();
}
/* stoppen kan pas vanaf TWEE sporten: na één winst is stoppen gelijk aan niets houden.
   ÉÉN uitzondering (review F1): kan de bank niets meer innemen, dan is dit het NOODLUIK uit
   dtTafelHtml. De tafel sluit dan zonder tol — er valt niets meer te spelen, en zonder die
   uitgang hield de save zichzelf in stand (hervatScherm stuurt terug naar deze tafel). */
function dtStop() {
  const st = dtSt();
  if (!_dt || dtFase() !== 'tafel' || _dt.bezig) return;
  if (!dtInzetOpties().some(o => o.kan)) {
    melding('De bank vindt niets meer om in te nemen. De tafel sluit — de gang erachter niet.');
    dtNaarEncounter();
    return;
  }
  if (st.pot.length < 2) return;
  const weg = dtLadderDef(st.pot[0]).kort;
  st.pot = st.pot.slice(1);              /* de wand houdt de LAAGSTE sport */
  Klank.sfx('debuff');
  melding('De wand houdt uw laagste sport (' + weg + '). De rest is van u — als u er levend langskomt.');
  dtNaarEncounter();
}

/* ============================================================
   DE WORP + DE INZET-INNAME
   ============================================================ */
/* de inzet wordt METEEN ingenomen. Daardoor levert herladen midden in een spel niets op:
   de kaart/HP/relikwie is al weg en komt alleen bij WINST terug. */
function dtNeemInzet() {
  const st = dtSt();
  if (st.inzet === 'kaart') {
    const c = dtMagKaartInzetten() ? dtBesteKaart() : null;
    if (!c) return null;
    S.dek = S.dek.filter(k => k !== c);
    st.dekVerlies = (st.dekVerlies || 0) + 1;
    renderTopbalk();
    return { soort: 'kaart', naam: knaam(c), kaartId: c.id, kaart: Object.assign({}, c) };
  }
  if (st.inzet === 'hp') {
    if (!(S.hp > DT_HP_INZET)) return null;
    const voor = S.hp;
    verliesHpBuitenGevecht(DT_HP_INZET);   /* doet zelf renderTopbalk() */
    return { soort: 'hp', n: voor - S.hp, naam: (voor - S.hp) + ' HP' };
  }
  const rid = dtRelInzetId();
  if (!rid) return null;
  const verzet = dtNeemRelikwie(rid);
  /* de WERKELIJKE verzetting mee in de inzetdata: alleen zo kan winst exact teruggeven wat de
     inname kostte, ook na een herlaad (zie dtGeefRelikwieTerug). */
  return { soort: 'relikwie', id: rid, naam: ((dtRelDef(rid) || {}).naam || 'Uw relikwie'),
    maxDelta: verzet.maxDelta, hpDelta: verzet.hpDelta };
}
/* het relikwie uit handen geven. NIET via geefRelikwie/verwijder-helpers: die zouden de
   reveal-ceremonie, het spaarvarken-goud en de schrijn-lading opnieuw afvuren.
   REVIEW F1 — GRATIS GENEZING: de inname verlaagde alleen maxHp (met een clamp), de teruggave
   verhoogde maxHp ÉN hp. Wie met 100/220 een bloedrobijn inzette en won, stond daarna op
   108/220: +8 HP uit het niets, per gewonnen ronde. Nu neemt de inname ook de HP terug die het
   relikwie ooit GAF, en geeft de winst exact die twee getallen weer terug. */
function dtNeemRelikwie(id) {
  S.relikwieen = (S.relikwieen || []).filter(r => r !== id);
  const d = dtMaxHpDelta(id), voorMax = S.maxHp, voorHp = S.hp;
  if (d) {
    S.maxHp = Math.max(1, S.maxHp - d);
    if (d > 0) S.hp = Math.max(1, S.hp - d);   /* het stuk gaf die HP bij het oppakken */
    if (S.hp > S.maxHp) S.hp = S.maxHp;
  }
  renderTopbalk();
  return { maxDelta: S.maxHp - voorMax, hpDelta: S.hp - voorHp };
}
function dtGeefRelikwieTerug(id, verzet) {
  if (!S.relikwieen) S.relikwieen = [];
  if (!S.relikwieen.includes(id)) S.relikwieen.push(id);
  if (verzet && typeof verzet.maxDelta === 'number') {
    /* exact de boekhouding van de inname terugdraaien (beide delta's zijn negatief bij een
       +maxHp-relikwie) — nooit een nieuwe berekening, die kan afwijken van wat er werkelijk
       is afgenomen zodra er een clamp tussen zat. */
    S.maxHp = Math.max(1, S.maxHp - verzet.maxDelta);
    S.hp = Math.max(1, S.hp - (verzet.hpDelta || 0));
    if (S.hp > S.maxHp) S.hp = S.maxHp;
  } else {
    /* terugval voor een save van vóór deze fix (inzetData zonder delta's): alleen maxHp terug,
       nooit gratis HP erbij. */
    const d = dtMaxHpDelta(id);
    if (d) { S.maxHp = Math.max(1, S.maxHp + d); if (S.hp > S.maxHp) S.hp = S.maxHp; }
  }
  renderTopbalk();
}
function dtGeefInzetTerug() {
  const st = dtSt(), d = st && st.inzetData;
  if (!d) return;
  if (d.soort === 'kaart' && d.kaart) { S.dek.push(d.kaart); st.dekVerlies = Math.max(0, (st.dekVerlies || 0) - 1); }
  else if (d.soort === 'hp') S.hp = Math.min(S.maxHp, S.hp + (d.n || 0));
  else if (d.soort === 'relikwie' && d.id) dtGeefRelikwieTerug(d.id, d);
  st.inzetData = null;
  renderTopbalk();
}

function dtStartSpel() {
  const st = dtSt();
  if (!_dt || dtFase() !== 'tafel' || _dt.bezig || !dtSpelDef(st.spel)) return;
  const inzet = dtNeemInzet();
  if (!inzet) { melding('De bank vindt niets om in te nemen — kies een andere inzet.'); return; }
  _dt.bezig = true;
  st.inzetData = inzet;
  /* ================= DE ENIGE WORP VAN DE RONDE ================= */
  st.uitslag = willekeurig() >= dtKnalkans();
  st.fase = 'spel';
  saveSpel();                                   /* vastleggen VÓÓR er iets beweegt */
  /* ============================================================== */
  _dt.spelState = dtBouwSpelState(st.uitslag);
  _dt.bezig = false;
  Klank.sfx('klik');
  renderDrempeltafel();
}

/* bouwt de choreografie die de AL GEVALLEN uitslag gaat uitbeelden. willekeurig() valt hier
   alleen nog voor SIER: welke sector, welke kamer, welke tegel, welke nis. */
function dtBouwSpelState(winst) {
  const st = dtSt(), spel = st.spel, p = dtKnalkans();
  if (spel === 'rad') {
    const sect = dtRadSectoren();
    const doelen = sect.map((w, i) => ({ w, i })).filter(o => o.w === winst).map(o => o.i);
    return { spel: 'rad', sect, doel: doelen.length ? kiesUit(doelen) : 0, hoek: 0, draait: false, uit: null };
  }
  if (spel === 'revolver') {
    /* HOOGSTENS vier geladen kamers: twee trekken ZONDER TERUGLEGGING vragen twee LEGE
       kamers, anders is een winst niet uit te beelden. Met de huidige tabel komt round(6p)
       nooit boven 4 (2/2/3/4) — de klem is puur een vangnet voor later tunen. */
    const geladen = Math.max(1, Math.min(4, Math.round(6 * p)));
    const leeg = [], vol = [];
    for (let i = 0; i < 6; i++) (i < geladen ? vol : leeg).push(i);
    const l = schud(leeg.slice()), v = schud(vol.slice());
    let volgorde;
    if (winst) volgorde = [l[0], l[1]];                                      /* twee keer overleven */
    else if (willekeurig() < 0.5) volgorde = [v[0]];                          /* meteen raak */
    else volgorde = [l[0], v[0]];                                             /* eerst overleven, dan raak */
    return { spel: 'revolver', geladen, volgorde, getrokken: [], hoek: 0 };
  }
  if (spel === 'paren') {
    return {
      spel: 'paren',
      gezicht: {},                                   /* tegelindex → 'a'|'b'|'c'|'as', pas bij het omdraaien */
      pool: ['a', 'a', 'b', 'b', 'c', 'c'],          /* de drie paren; 'as' komt uit asBij */
      open: [], weg: [], gevonden: 0, onthuld: 0,
      /* bij een knal ligt de as onder de n-de NIEUWE tegel (1..4). Met vier onthullingen zou
         de speler anders precies twee paren vinden — dus 4 is de laatste plek waar de as nog
         op tijd komt. Bij winst is er geen as in het spel. */
      asBij: winst ? 0 : (1 + Math.floor(willekeurig() * 4))
    };
  }
  if (spel === 'hooglaag') {
    /* de bank ligt ALTIJD in het midden (7 of 8): met een extreme bankkaart zou de geforceerde
       tweede kaart betrapbaar worden, en zonder forcering is Hoog of Laag een vaste 49,8 %. */
    return { spel: 'hooglaag', bank: kiesUit([7, 8]), uw: null, reeks: 0, foutBij: winst ? 0 : (1 + Math.floor(willekeurig() * 2)) };
  }
  if (spel === 'nissen') return { spel: 'nissen', keuze: null, gift: null };
  return null;
}

/* ============================================================
   FASE 3 — HET SPEL (markup één keer, daarna alleen classes/styles)
   ============================================================ */
/* DE SPELFASE WORDT HIER ÉÉN KEER OPGEBOUWD. Daarna muteert alleen dtMuteerSpel() nog
   classes en styles: een innerHTML-re-render per klik doodt het rad (3,4 s), de cilinder
   (0,55 s) en de 3D-flip (0,45 s) midden in hun transitie. */
function dtRenderSpel() {
  const st = dtSt(), s = _dt.spelState;
  if (!s) return dtTafelHtml();   /* kan alleen als renderDrempeltafel de fase al terugzette */
  const def = dtSpelDef(st.spel) || { naam: '' };
  const inzetLabel = st.inzet === 'kaart' ? ((st.inzetData && st.inzetData.naam) || 'uw beste kaart')
    : st.inzet === 'hp' ? DT_HP_INZET + ' HP'
    : ((st.inzetData && st.inzetData.naam) || 'een relikwie');
  let veld = '';
  if (s.spel === 'rad') veld = dtRadHtml(s);
  else if (s.spel === 'revolver') veld = dtRevolverHtml(s);
  else if (s.spel === 'paren') veld = dtParenHtml(s);
  else if (s.spel === 'hooglaag') veld = dtHoogLaagHtml(s);
  else if (s.spel === 'nissen') veld = dtGokNissenHtml(s);
  /* GEEN 'Terug naar de tafel' tijdens een spel: dat was een gratis ontsnapping uit een
     verlies (het resolve-venster is 0,8-1,1 s). De inzet is al ingenomen; u speelt 'm uit. */
  /* alleen het rad en de revolver hebben een aparte actieknop; bij de andere drie IS het
     speelveld de invoer — dan blijft de (sticky) balk weg i.p.v. leeg te plakken */
  const metKnop = s.spel === 'rad' || s.spel === 'revolver';
  return `<div class="dt-spelscene">
    <div class="dt-spelkop">
      <span class="dt-spel-titel">${def.naam}</span>
      <span class="dt-oogje">inzet: ${dtEsc(inzetLabel)}</span>
    </div>
    <p class="dt-spel-hint" id="dt-hint"></p>
    <div class="dt-spelveld">${veld}</div>
    ${metKnop ? '<div class="sb-balk"><button class="knop-groot" id="dt-spelactie" data-dt="spel-actie">🜂</button></div>' : ''}
  </div>`;
}
function dtRadHtml(s) {
  const gradient = 'radial-gradient(circle,transparent 27%,rgba(0,0,0,.55) 28%,transparent 30%),conic-gradient(' + s.sect.map((w, i) => {
    const a = i * 30, b = (i + 1) * 30;
    return (w ? 'rgba(126,60,16,.97)' : 'rgba(58,12,22,.97)') + ' ' + a + 'deg ' + (b - 1) + 'deg,rgba(12,7,7,.98) ' + (b - 1) + 'deg ' + b + 'deg';
  }).join(',') + ')';
  const vakken = s.sect.map((w, i) => `<div class="dt-vak${w ? ' geeft' : ''}" style="transform:rotate(${i * 30 + 15}deg) translateY(-235%)">${w
    ? dtArtSpan('relikwie', 'kroon_van_sintels', '👑')
    : dtArtSpan('kaart', 'asregen', '🜃')}</div>`).join('');
  const klinken = Array.from({ length: 12 }, (_, i) => `<span class="dt-klink" style="transform:rotate(${i * 30}deg) translateY(-1850%)"></span>`).join('');
  return `<div class="dt-rad-veld" id="dt-radveld">
    <div class="dt-rad" id="dt-rad" style="background:${gradient};transform:rotate(0deg)">${vakken}${klinken}</div>
    <div class="dt-rad-veeg"></div>
    <div class="dt-rad-flits" id="dt-radflits"></div>
    <div class="dt-naaf">${dtArtSpan('karakter', 'de_drempelwachter', '')}<b id="dt-radteken">🜂</b></div>
    <div class="dt-naald"><i></i><u></u></div>
  </div>`;
}
function dtRevolverHtml(s) {
  const kamers = Array.from({ length: 6 }, (_, i) => `<div class="dt-kamer${i < s.geladen ? ' geladen' : ''}" data-k="${i}" style="transform:rotate(${i * 60}deg) translateY(-118%)"><b style="transform:rotate(0deg)">${i < s.geladen ? '●' : ''}</b></div>`).join('');
  return `<div class="dt-cil-veld">
    <div class="dt-cilinder" id="dt-cilinder" style="transform:rotate(0deg)">${kamers}</div>
    <div class="dt-hamer"></div>
  </div>`;
}
function dtParenHtml() {
  const tegels = Array.from({ length: 8 }, (_, i) => `<div class="dt-tegel" data-dt="tegel" data-i="${i}">
    <div class="dt-tegel-binnen">
      <div class="dt-tegel-rug">${dtArtSpan('scherf', DT_RUG_SCHERF, '')}</div>
      <div class="dt-tegel-voor"><span class="dt-art dt-tegel-art"></span></div>
    </div></div>`).join('');
  return `<div class="dt-paren" id="dt-paren">${tegels}</div>`;
}
function dtHoogLaagHtml(s) {
  return `<div class="dt-hl">
    <div class="dt-hl-kaart dt-hl-bank">${dtArtSpan('kaart', 'schaduwdans', '', 'dt-hl-art')}<b id="dt-hl-bankwaarde">${s.bank}</b><small>de bank</small></div>
    <div class="dt-hl-knoppen">
      <button class="knop-groot dt-hl-knop" data-dt="hl" data-hoog="1">▲ Hoger</button>
      <button class="knop-groot dt-hl-knop" data-dt="hl" data-hoog="0">▼ Lager</button>
    </div>
    <div class="dt-hl-kaart dt-hl-uw" id="dt-hl-uw">
      ${dtArtSpan('scherf', DT_RUG_SCHERF, '', 'dt-hl-rug')}
      ${dtArtSpan('kaart', 'vlammenkling', '', 'dt-hl-art')}
      <b id="dt-hl-uwwaarde">?</b><small>uw kaart</small>
    </div>
  </div>`;
}
function dtGokNissenHtml() {
  return `<div class="dt-gok-nissen">${[0, 1, 2].map(i => `<button class="dt-gok-nis" data-dt="goknis" data-i="${i}">
    ${dtArtSpan('scherf', DT_RUG_SCHERF, '🜂')}<small>nis ${i + 1}</small></button>`).join('')}</div>`;
}

/* alleen tekst + knopstand bijwerken — NOOIT innerHTML: dat zou het rad (3,4 s), de cilinder
   en de 3D-flip midden in hun transitie doden. */
function dtMuteerSpel() {
  const s = _dt && _dt.spelState;
  if (!s) return;
  const hint = document.getElementById('dt-hint');
  const knop = document.getElementById('dt-spelactie');
  let tekst = '', knopTekst = '', knopAan = false, knopToon = false, rood = false;
  if (s.spel === 'rad') {
    const geeft = s.sect.filter(Boolean).length;
    tekst = s.draait ? 'Het rad draait…' : s.uit === null ? `Twaalf sectoren: ${geeft} geven, ${12 - geeft} nemen.` : s.uit ? 'WINST.' : 'AS.';
    rood = s.uit === false;
    knopToon = true; knopTekst = '🜂 Draai het rad'; knopAan = !s.draait && s.uit === null && !_dt.bezig;
  } else if (s.spel === 'revolver') {
    const raak = s.getrokken.some(x => x.raak);
    tekst = raak ? 'De kamer was niet leeg.' : `${s.geladen} van de 6 kamers zijn geladen. Twee keer overleven en de pot is van u.`;
    rood = raak;
    knopToon = true; knopTekst = `🜂 Trek (${s.getrokken.length}/2)`; knopAan = !raak && s.getrokken.length < 2 && !_dt.bezig;
  } else if (s.spel === 'paren') {
    tekst = `Twee paren vinden. Twee tegels zijn as — draai die om en het is voorbij. (${s.gevonden}/2)`;
  } else if (s.spel === 'hooglaag') {
    tekst = `Twee keer goed raden. (${s.reeks}/2)`;
    document.querySelectorAll('.dt-hl-knop').forEach(b => { b.disabled = _dt.bezig || s.uw !== null; });
  } else if (s.spel === 'nissen') {
    tekst = s.keuze === null ? 'Eén nis geeft, twee nemen. Kies.' : (dtSt().uitslag ? 'De gift lag waar u wees.' : 'De gift lag ergens anders.');
    rood = s.keuze !== null && !dtSt().uitslag;
  }
  if (hint) { hint.textContent = tekst; hint.classList.toggle('dt-hint-rood', rood); }
  if (knop) {
    knop.style.display = knopToon ? '' : 'none';
    knop.textContent = knopTekst;
    knop.disabled = !knopAan;
  }
}

function dtSpelActie() {
  const s = _dt && _dt.spelState;
  if (!s) return;
  if (s.spel === 'rad') dtDraaiRad();
  else if (s.spel === 'revolver') dtTrekRevolver();
}

/* ---------- HET RAD ---------- */
function dtDraaiRad() {
  const s = _dt && _dt.spelState;
  if (!s || s.spel !== 'rad' || _dt.bezig || s.draait || s.uit !== null) return;
  _dt.bezig = true;
  s.draait = true;
  s.hoek += 360 * 5 - (s.doel * 30 + 15);   /* de naald staat bovenaan: dit legt sector 'doel' eronder */
  const rad = document.getElementById('dt-rad'), veld = document.getElementById('dt-radveld');
  if (rad) { rad.classList.add('draait'); rad.style.transform = 'rotate(' + s.hoek + 'deg)'; }
  if (veld) veld.classList.add('draait');
  Klank.sfx('trek');
  dtMuteerSpel();
  dtTimer(() => {
    s.draait = false;
    s.uit = dtSt().uitslag;
    if (rad) rad.classList.remove('draait');
    if (veld) veld.classList.remove('draait');
    const flits = document.getElementById('dt-radflits');
    if (flits) flits.classList.add(s.uit ? 'winst' : 'knal');
    const teken = document.getElementById('dt-radteken');
    if (teken) teken.textContent = s.uit ? '✦' : '✖';
    Klank.sfx(s.uit ? 'schitter' : 'zwareklap');
    dtMuteerSpel();
    dtTimer(() => (s.uit ? dtWin() : dtKnal()), dtStil() ? 120 : 900);
  }, dtStil() ? 120 : 3400);
}

/* ---------- DE REVOLVER ---------- */
function dtTrekRevolver() {
  const s = _dt && _dt.spelState;
  if (!s || s.spel !== 'revolver' || _dt.bezig) return;
  if (s.getrokken.length >= s.volgorde.length) return;
  _dt.bezig = true;
  const k = s.volgorde[s.getrokken.length];
  const raak = k < s.geladen;
  s.getrokken.push({ kamer: k, raak });
  s.hoek = 360 * s.getrokken.length - k * 60;
  const cil = document.getElementById('dt-cilinder');
  if (cil) {
    cil.style.transform = 'rotate(' + s.hoek + 'deg)';
    cil.querySelectorAll('.dt-kamer > b').forEach(b => { b.style.transform = 'rotate(' + (-s.hoek) + 'deg)'; });
  }
  Klank.sfx('klik');
  dtMuteerSpel();
  dtTimer(() => {
    const kamer = cil && cil.querySelector('.dt-kamer[data-k="' + k + '"]');
    if (kamer) {
      kamer.classList.add(raak ? 'raak' : 'leeg-getrokken');
      const b = kamer.querySelector('b');
      if (b) b.textContent = raak ? '✖' : '○';
    }
    Klank.sfx(raak ? 'zwareklap' : 'blok');
    dtMuteerSpel();
    if (raak) dtTimer(dtKnal, dtStil() ? 120 : 800);
    else if (s.getrokken.length >= 2) dtTimer(dtWin, dtStil() ? 120 : 800);
    else { _dt.bezig = false; dtMuteerSpel(); }
  }, dtStil() ? 60 : 560);
}

/* ---------- DE PAREN ----------
   De tegels krijgen hun gezicht PAS bij het omdraaien, uit een pool die klopt (3 paren),
   en de as ligt op de plek die de uitslag vraagt. Een omgedraaide tegel verandert daarna
   nooit meer van gezicht — geheugen blijft dus eerlijk. Gevonden paren gaan in 'weg' (de
   weg-set): dat sluit de her-klik-bug van het prototype. */
function dtParenLetter(s, matchMet) {
  if (matchMet && s.pool.includes(matchMet)) return matchMet;
  const tel = {};
  s.pool.forEach(l => { tel[l] = (tel[l] || 0) + 1; });
  const keus = Object.keys(tel).sort((a, b) => tel[b] - tel[a])[0];
  return keus || 'a';
}
function dtToonTegel(i, open) {
  const el = document.querySelector('#dt-paren .dt-tegel[data-i="' + i + '"]');
  if (!el) return;
  el.classList.toggle('open', !!open);
}
function dtKlikTegel(i) {
  const s = _dt && _dt.spelState;
  if (!s || s.spel !== 'paren' || _dt.bezig) return;
  if (s.open.includes(i) || s.weg.includes(i) || s.open.length >= 2) return;
  if (s.gezicht[i] === undefined) {
    s.onthuld++;
    let g;
    if (s.asBij && s.onthuld === s.asBij) g = 'as';
    else if (!s.open.length) g = dtParenLetter(s, null);
    else g = dtParenLetter(s, s.gezicht[s.open[0]]);
    s.gezicht[i] = g;
    if (g !== 'as') { const p = s.pool.indexOf(g); if (p >= 0) s.pool.splice(p, 1); }
    const el = document.querySelector('#dt-paren .dt-tegel[data-i="' + i + '"]');
    const art = el && el.querySelector('.dt-tegel-art');
    if (el && g === 'as') el.classList.add('as');
    dtZetArt(art, 'kaart', DT_PAREN_ART[g] || DT_PAREN_ART.a, g === 'as' ? '🜃' : '🃏');
  }
  s.open.push(i);
  dtToonTegel(i, true);
  Klank.sfx('flip');
  if (s.gezicht[i] === 'as') {
    _dt.bezig = true;
    if (typeof schudScherm === 'function') schudScherm();
    dtMuteerSpel();
    dtTimer(dtKnal, dtStil() ? 120 : 900);
    return;
  }
  if (s.open.length === 2) {
    _dt.bezig = true;
    const a = s.open[0], b = s.open[1];
    if (s.gezicht[a] === s.gezicht[b]) {
      s.gevonden++;
      dtMuteerSpel();
      dtTimer(() => {
        s.weg.push(a, b); s.open = [];
        [a, b].forEach(x => { const el = document.querySelector('#dt-paren .dt-tegel[data-i="' + x + '"]'); if (el) el.classList.add('weg'); });
        Klank.sfx('schitter');
        dtMuteerSpel();
        if (s.gevonden >= 2) dtTimer(dtWin, dtStil() ? 60 : 400);
        else { _dt.bezig = false; dtMuteerSpel(); }
      }, dtStil() ? 80 : 700);
    } else {
      dtTimer(() => {
        s.open = [];
        dtToonTegel(a, false); dtToonTegel(b, false);
        _dt.bezig = false;
        dtMuteerSpel();
      }, dtStil() ? 80 : 800);
    }
  }
  dtMuteerSpel();
}

/* ---------- HOOG OF LAAG ---------- */
function dtGokHoogLaag(hoger) {
  const s = _dt && _dt.spelState;
  if (!s || s.spel !== 'hooglaag' || _dt.bezig || s.uw !== null) return;
  _dt.bezig = true;
  const beurt = s.reeks + 1;
  const goed = !s.foutBij || beurt !== s.foutBij;   /* de uitslag stuurt, niet de kaart */
  const opties = [];
  for (let v = 2; v <= 13; v++) {
    if (v === s.bank) continue;                      /* nooit gelijk: dat zou dubbelzinnig zijn */
    const hoog = v > s.bank;
    if (goed ? (hoog === hoger) : (hoog !== hoger)) opties.push(v);
  }
  s.uw = opties.length ? kiesUit(opties) : (hoger ? Math.min(13, s.bank + 1) : Math.max(2, s.bank - 1));
  const uwEl = document.getElementById('dt-hl-uw');
  const waarde = document.getElementById('dt-hl-uwwaarde');
  if (uwEl) uwEl.classList.add('open');
  if (waarde) waarde.textContent = String(s.uw);
  Klank.sfx(goed ? 'kaart' : 'zwareklap');
  dtMuteerSpel();
  dtTimer(() => {
    if (!goed) { dtKnal(); return; }
    s.reeks++;
    if (s.reeks >= 2) { dtWin(); return; }
    s.bank = kiesUit([7, 8]);
    s.uw = null;
    const bankEl = document.getElementById('dt-hl-bankwaarde');
    if (bankEl) bankEl.textContent = String(s.bank);
    if (uwEl) uwEl.classList.remove('open');
    if (waarde) waarde.textContent = '?';
    _dt.bezig = false;
    dtMuteerSpel();
  }, dtStil() ? 120 : 1100);
}

/* ---------- DE DRIE NISSEN ---------- */
function dtKiesGokNis(i) {
  const s = _dt && _dt.spelState;
  if (!s || s.spel !== 'nissen' || _dt.bezig || s.keuze !== null) return;
  _dt.bezig = true;
  const winst = dtSt().uitslag;
  s.keuze = i;
  s.gift = winst ? i : kiesUit([0, 1, 2].filter(x => x !== i));   /* de gift ligt waar de uitslag 'm vraagt */
  [0, 1, 2].forEach(n => {
    const el = document.querySelector('.dt-gok-nis[data-i="' + n + '"]');
    if (!el) return;
    const gift = n === s.gift;
    el.classList.add('open', gift ? 'gift' : 'as');
    if (n === i) el.classList.add('gekozen');
    el.disabled = true;
    const art = el.querySelector('.dt-art');
    if (gift) dtZetArt(art, 'relikwie', 'kroon_van_sintels', '👑');
    else dtZetArt(art, 'kaart', 'asregen', '🜃');
    const lab = el.querySelector('small');
    if (lab) lab.textContent = gift ? 'gift' : 'as';
  });
  Klank.sfx(winst ? 'schitter' : 'zwareklap');
  dtMuteerSpel();
  dtTimer(() => (winst ? dtWin() : dtKnal()), dtStil() ? 120 : 1000);
}

/* ============================================================
   RESOLVE — idempotent: alleen de EERSTE aanroep telt
   ============================================================ */
function dtWin() {
  if (!_dt || dtFase() !== 'spel') return;
  const st = dtSt();
  const prijs = DT_LADDER[Math.min(st.ronde - 1, DT_LADDER.length - 1)];
  dtGeefInzetTerug();                                   /* winst = de inzet komt terug */
  if (prijs && !st.pot.includes(prijs.id)) st.pot.push(prijs.id);
  st.fase = 'uitkomst';
  saveSpel();
  dtWisTimers();
  _dt.bezig = false;
  _dt.spelState = null;
  Klank.sfx('win');
  renderDrempeltafel();
}
function dtKnal() {
  if (!_dt || dtFase() !== 'spel') return;
  const st = dtSt();
  st.pot = [];                                          /* u valt van de HELE ladder */
  st.fase = 'uitkomst';                                 /* inzetData blijft staan: het scherm benoemt wat u kwijt bent */
  saveSpel();
  dtWisTimers();
  _dt.bezig = false;
  _dt.spelState = null;
  Klank.sfx('verlies');
  if (typeof schudScherm === 'function') schudScherm();
  renderDrempeltafel();
}

/* ============================================================
   FASE 4 — DE UITKOMST
   ============================================================ */
function dtUitkomstHtml() {
  const st = dtSt();
  if (st.uitslag) {
    const prijs = DT_LADDER[Math.min(st.ronde - 1, DT_LADDER.length - 1)];
    const blok = prijs.id === 'slachtblok';
    /* GEEN knop naar het blok: de prijs wordt pas ná de encounter uitgekeerd (P3). Dit
       scherm BELOOFT alleen — anders int de speler zijn prijs zonder de wacht te betalen. */
    const zin = blok
      ? '„Daar is het. Twee kaarten, uw naam erin." Erachter wacht het blok — en iets dat eerst betaald wil worden. Stopt u nu, dan houdt u het blok: de wand neemt enkel uw laagste sport. Gokt u door voor sport IV, dan brandmerkt hij uw kaart voorgoed, maar een knal kost u álles, ook het blok.'
      : `„Nog een ronde? De inzet stijgt. En het risico ook." — u staat op sport ${prijs.sport} van IV.`;
    const nogEenRonde = st.ronde < DT_LADDER.length;
    /* stoppen is pas iets waard vanaf TWEE sporten (de wand houdt altijd uw laagste);
       wie de hele ladder haalde, houdt alles en gaat sowieso de encounter in */
    const magStoppen = nogEenRonde && st.pot.length >= 2;
    const laagste = st.pot.length ? dtLadderDef(st.pot[0]).kort : '';
    return `<div class="dt-uitkomst">
      <div class="dt-uitkomst-kop winst">${blok ? '🪓 DE WAND SCHUIFT OPEN' : '✦ DE BANK BETAALT'}</div>
      <div class="dt-prijs${blok ? ' dt-prijs-blok' : ''}">
        ${blok ? '<div class="dt-stralen"></div>' : ''}
        ${dtArtSpan(prijs.artSoort, prijs.artId, prijs.emoji, 'dt-prijs-art')}
      </div>
      <div class="dt-uitkomst-tekst">
        <span class="dt-prijs-naam">${prijs.naam}</span>
        <p>${prijs.tekst}</p>
      </div>
      <p class="dt-uitkomst-zin">${zin}</p>
      <div class="sb-balk">
        ${magStoppen ? `<button class="knop-stil" data-dt="stop-uitkomst">Stoppen — de wand houdt ${laagste} ▸</button>` : ''}
        <button class="knop-groot" data-dt="verder">${nogEenRonde ? `Nog een ronde — sport ${DT_LADDER[Math.min(st.ronde, DT_LADDER.length - 1)].sport} ▸` : 'De encounter in ▸'}</button>
      </div>
    </div>`;
  }
  const d = st.inzetData || { soort: 'hp', naam: 'uw inleg' };
  const verliesArt = d.soort === 'kaart' ? { soort: 'kaart', id: d.kaartId || 'asregen', emoji: '🃏' }
    : d.soort === 'relikwie' ? { soort: 'relikwie', id: d.id || 'vonkenkluis', emoji: '👑' }
    : { soort: 'relikwie', id: 'feniksveer', emoji: '❤️' };
  const tekst = d.soort === 'kaart' ? `De bank koos uw beste kaart. ${dtEsc(d.naam)} is weg — voor de rest van deze afdaling.`
    : d.soort === 'relikwie' ? `${dtEsc(d.naam)} verdwijnt in de nis alsof het er altijd hoorde.`
    : `De wand neemt vlees als er geen kaart op tafel ligt. U staat nog op ${S ? S.hp : 0} HP.`;
  return `<div class="dt-uitkomst">
    <div class="dt-uitkomst-kop knal">✖ DE WAND NEEMT</div>
    <div class="dt-verlies">${dtArtSpan(verliesArt.soort, verliesArt.id, verliesArt.emoji, 'dt-verlies-art')}</div>
    <div class="dt-uitkomst-tekst">
      <span class="dt-verlies-naam">${dtEsc(d.naam)}</span>
      <p>${tekst}</p>
    </div>
    <p class="dt-uitkomst-zin">„De tafel is gesloten." U valt van de hele ladder — ook het Slachtblok. En iets achter de wand is klaarwakker.</p>
    <div class="sb-balk"><button class="knop-groot" data-dt="verder">De encounter in ▸</button></div>
  </div>`;
}
function dtVerder() {
  const st = dtSt();
  if (!_dt || dtFase() !== 'uitkomst' || _dt.bezig) return;
  if (st.uitslag && st.ronde < DT_LADDER.length) {
    st.ronde++;
    st.spel = null; st.uitslag = null; st.relInzet = null;
    dtKiesRelInzet();   /* nieuwe ronde = nieuwe worp voor het relikwie dat op het spel staat */
    st.fase = 'tafel';
    saveSpel();
    Klank.sfx('klik');
    renderDrempeltafel();
    return;
  }
  dtNaarEncounter();
}
/* 'De encounter in' vanaf het WINST-scherm = stoppen met wat u hebt. Vanaf sport 1 is dat
   niets extra's (de wand houdt uw laagste sport), dus die knop leidt door dezelfde poort. */
function dtStopVanafUitkomst() {
  const st = dtSt();
  if (!_dt || dtFase() !== 'uitkomst' || _dt.bezig || !st.uitslag || st.pot.length < 2) return;
  const weg = dtLadderDef(st.pot[0]).kort;
  st.pot = st.pot.slice(1);
  Klank.sfx('debuff');
  melding('De wand houdt uw laagste sport (' + weg + '). De rest is van u — als u er levend langskomt.');
  dtNaarEncounter();
}

/* ============================================================
   FASE 5 — DE ENCOUNTER (volgt ALTIJD: na stoppen én na een knal)
   ============================================================ */
function dtNaarEncounter() {
  const st = dtSt();
  if (!st.vijand || !DT_VIJANDEN.some(v => v.id === st.vijand)) st.vijand = kiesUit(DT_VIJANDEN).id;
  st.inzetData = null;
  st.spel = null;
  st.uitslag = null;
  st.fase = 'encounter';
  saveSpel();
  renderDrempeltafel();
}
function dtEncounterHtml() {
  const st = dtSt();
  const v = dtVijandDef(st.vijand);
  const naam = dtVijandNaam(v.id);
  const zwaarte = ['licht', 'zwaar', 'brutaal', 'wanhopig'][Math.min(st.pot.length, 3)];
  const hp = v.hp + st.pot.length * DT_ZWAARTE_PER_SPORT;
  const dekNu = (S && S.dek ? S.dek.length : 0);
  const dekWas = dekNu + (st.dekVerlies || 0);
  const stats = [
    { label: 'HP', waarde: String(hp), klasse: 'dt-stat-rood' },
    { label: 'Zwaarte', waarde: zwaarte, klasse: '' },
    { label: 'Uw dek', waarde: dekNu + '/' + dekWas, klasse: st.dekVerlies ? 'dt-stat-rood' : '' }
  ].map(s => `<div class="dt-enc-stat"><span>${s.label}</span><b class="${s.klasse}">${s.waarde}</b></div>`).join('');
  return `<div class="dt-encounter">
    <div class="dt-oogje dt-oogje-bloed">de tafel is gesloten · wat u wekte staat op</div>
    <div class="dt-vijand">
      <div class="dt-vijand-gloed"></div>
      ${dtArtSpan('karakter', v.id, '⚔️', 'dt-vijand-art')}
      <span class="dt-vonk" style="left:32%;bottom:14%"></span>
      <span class="dt-vonk" style="left:64%;bottom:9%;animation-delay:1.4s"></span>
    </div>
    <div class="dt-vijand-kop">
      <span class="dt-vijand-naam">${dtEsc(naam)}</span>
      <span class="dt-vijand-rang">${v.rang}</span>
    </div>
    <div class="dt-enc-stats">${stats}</div>
    <p class="dt-vijand-zin">${v.zin} Hoe meer u won, hoe zwaarder wat u wekte — de tafel betaalt nooit gratis.</p>
    <p class="dt-fijn">${st.pot.length ? 'Wint u, dan keert de wand uit wat op tafel ligt: ' + st.pot.map(id => dtLadderDef(id).kort).join(' · ') + '.' : 'Er ligt niets meer op tafel. Er staat alleen nog iets tussen u en Act 2.'}</p>
    <div class="sb-balk"><button class="knop-groot" data-dt="gevecht-in">⚔️ Het gevecht in</button></div>
  </div>`;
}
function dtHetGevechtIn() {
  const st = dtSt();
  if (!_dt || dtFase() !== 'encounter' || _dt.bezig) return;
  _dt.bezig = true;
  const v = dtVijandDef(st.vijand);
  st.vijand = v.id;
  st.uitTeKeren = st.pot.slice();     /* P3 keert dit uit in gevechtGewonnen, vóór de beloning */
  st.fase = 'encounter';
  saveSpel();
  dtVerwijderOverlay();
  if (S) S.gevecht = null;
  /* vasteHp zet de HP BUITEN de act-schaling; hpBonus is de zwaarte per gewonnen sport;
     tafel:true markeert het gevecht (eigen buit-regels bij P3 + eigen nederlaag-kop). */
  startGevecht([v.id], v.soort, 1, { vasteHp: v.hp, hpBonus: st.pot.length * DT_ZWAARTE_PER_SPORT, tafel: true });
}

/* ============================================================
   ÉÉN DELEGERENDE KLIK-HANDLER (nooit data in een inline onclick)
   ============================================================ */
function dtKlik(e) {
  if (!_dt || !e.target || !e.target.closest) return;
  const el = e.target.closest('[data-dt]');
  if (!el || el.disabled) return;
  const a = el.dataset.dt;
  if (a === 'nis-plaats') dtPlaatsScherf(el.dataset.sid);
  else if (a === 'nis-weg') dtHaalWegScherf(el.dataset.sid);
  else if (a === 'loop-voorbij') dtLoopVoorbij();
  else if (a === 'voed') dtVoedDrempel();
  else if (a === 'inzet') dtZetInzet(el.dataset.id);
  else if (a === 'spel') dtZetSpel(el.dataset.id);
  else if (a === 'tab') dtZetTab(el.dataset.id);
  else if (a === 'zet-in') dtStartSpel();
  else if (a === 'stop') dtStop();
  else if (a === 'spel-actie') dtSpelActie();
  else if (a === 'tegel') dtKlikTegel(+el.dataset.i);
  else if (a === 'hl') dtGokHoogLaag(el.dataset.hoog === '1');
  else if (a === 'goknis') dtKiesGokNis(+el.dataset.i);
  else if (a === 'verder') dtVerder();
  else if (a === 'stop-uitkomst') dtStopVanafUitkomst();
  else if (a === 'gevecht-in') dtHetGevechtIn();
}

/* ============================================================
   DEV
   ============================================================ */
/* DEV-SHORTCUT: de tafel meteen openen (naast devDrempel/devSlachtblok). Zet S._devRun,
   zodat isDevRun()/magErfstukSchrijven() deze run buiten de Codex en buiten elk erfstuk
   houden. Scherven komen eerst uit je BANK; alleen als die leeg is verschijnen ze uit het
   niets — en die worden apart genoteerd (S._devScherven), zodat bankGedragen ze straks niet
   alsnog in de cross-run-stash schuift. */
function devDrempeltafel(testScherven) {
  if (typeof S === 'undefined' || !S) { if (typeof nieuwSpel === 'function') nieuwSpel('slachter'); else return; }
  S._devRun = true;   /* DEV-TAINT — zie isDevRun in game.js */
  const wens = (testScherven && testScherven.length) ? testScherven : ['vlamwachter_baas', 'vlamwachter_figuur', 'vlamwachter_episch'];
  let uitNiets = 0;
  wens.forEach(sid => {
    if (gedragen().includes(sid)) return;
    if (neemUitStash(sid)) draagScherf(sid);
    else if (draagScherf(sid)) { uitNiets++; (S._devScherven = S._devScherven || []).push(sid); }
  });
  S.act = Math.max(2, S.act || 1);
  S._verslagenBaas = S._verslagenBaas || 'de Slijmkoning';
  S.drempeltafel = dtVerseState();
  saveSpel();
  if (uitNiets) melding('⚡ DEV: ' + uitNiets + ' scherf(en) uit het niets — deze run is getaint (geen Codex-schrijfacties).');
  toonDrempeltafel();
}
/* DEV-SHORTCUT: direct in een fase springen — 'nissen' | 'tafel' | 'spel' | 'uitkomst' | 'encounter'. */
function devDrempeltafelFase(fase, spel) {
  if (typeof S === 'undefined' || !S) { melding('⚡ DEV: start eerst een run.'); return; }
  S._devRun = true;   /* DEV-TAINT */
  if (!S.drempeltafel) S.drempeltafel = dtVerseState();
  const st = S.drempeltafel;
  st.gedaan = false;
  if (fase === 'nissen') st.fase = null;
  else if (fase === 'uitkomst') { st.fase = 'uitkomst'; st.uitslag = true; if (!st.pot.length) st.pot = ['beeltenis']; }
  else if (fase === 'encounter') { st.fase = 'encounter'; if (!st.vijand) st.vijand = kiesUit(DT_VIJANDEN).id; }
  else st.fase = 'tafel';
  if (fase === 'spel') st.spel = spel || st.spel || 'rad';
  if (document.getElementById('overlay-drempeltafel') && _dt) renderDrempeltafel();
  else toonDrempeltafel();
  if (fase === 'spel') dtStartSpel();
}
