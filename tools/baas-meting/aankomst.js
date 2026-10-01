/* DE RUN-WALKER — wat draagt een echte run bij aankomst aan de DICKtator? (30 sep 2026)
   Waarom: alle baasmetingen t/m v140 draaiden op DEV-builds met 4-6 relikwieën (DEV_BUILDS
   'slachter_mid', "de MEDIAAN-speler"), terwijl een echte run aan de eindbaas er 12-20 draagt
   (Thomas, 30 sep: "soms zelfs een 20-tal"). Dit harnas speelt met de ECHTE spelcode volledige
   runs - Act 1 t/m de aankomst aan de Act 3-baasnode - en legt per run de AANKOMSTSTAAT vast:
   relikwieën (met hun bron), dek, upgrades, vloeken, HP, goud, fakkel, dranken, wat er onderweg
   bezocht/gekocht/gekozen werd, en een korte tijdlijn. Daarna ijken we de finale op die staten.

   DE AANKOMSTSTAAT = de staat op de afdaalkaart van Act 3 wanneer de baasnode ('baas') bereikbaar
   is, NA de rustplaats van rij 14 en VOOR kiesNodeEcht('baas'). Het Slachtblok (toonSlachtblok
   'altaar', dat de baasnode eerst opent) zit er dus NIET in: de finale krijgt het Slachtblok later
   apart (dick_meting.js modelleert het al via SMEED/offerWaarde).

   Opzet (zoals dick_meting.js, waarvan de pagina-opzet hier gekopieerd is; dat bestand zelf blijft
   onaangeroerd):
   - GEEN server: host localhost:4173, maar ELK verzoek wordt door Playwright vanaf SCHIJF bediend
     (route.fulfill), al het andere wordt afgebroken. Eigen profiel per context, service workers
     geblokkeerd, localStorage leeg bij elke pagina.
   - window.slaap = () => Promise.resolve(); klank, schok, saves, reveal-ceremonies en de
     kaartkeuze-overlays zijn in de pagina vervangen door stille haken (zie installeerWalker): de
     walker beslist zelf, deterministisch, in plaats van te klikken.
   - De GEVECHTEN speelt de bestaande bot ('bewust') uit speler_bot.js (een kopie van het beleid van
     dick_meting.js per v140). gevechtGewonnen is de ECHTE (beloning, act-overgang, Drempeltafel);
     nederlaag is een vlag (de run is dan voorbij; geen eindscherm, geen loopbaan).
   - SOLO (DE NISSEN DICHT: metgezellenAan() is false), geen daily, geen dagwet, ascensie 0; de
     Codex (Schrijn, scherven-stash, ...) wordt vóór ELKE run teruggezet op de verse pagina-stand,
     zodat een run niet afhangt van welke run er eerder op dezelfde pagina liep.
   - Reproduceerbaar: nieuwSpel(held, seed) zet het zaad (Toeval.zetZaad); de walker gebruikt NOOIT
     Math.random in een beslissing (alle keuzes zijn functies van de staat en van de seed-tekst).

   HET BELEID (knoppen via env; de standaard = een redelijke speler: elites jagen voor relikwieën,
   rusten als het moet, relikwieën kopen als het kan):
   - PROFIEL (MEET_PROFIEL=veteraan|vers; herstel 30 sep, bevinding 'appels met peren'): de referentie
     '12-20 relikwieën' is Thomas, een VETERAAN. veteraan (standaard) = het Schrijn draagt SCHRIJN_MAX (3)
     opgeladen relikwieën mee de run in (MEET_SCHRIJN=<ids> legt ze vast; leeg = per run 3 uit de pool
     ongewoon+zeldzaam, gekozen met hash(seed|held) - een vaste maar seed-afhankelijke keuze) en de
     Codex heeft alle episch-scherven al op de stash (dus GEEN gegarandeerde episch-node in Act 2/3,
     genereerKaart ~4851). vers = een lege Codex en een leeg Schrijn (de oude standaard).
   - PAD (MEET_PAD=gretig|voorzichtig): een score per kamertype en een VOLLEDIGE vooruitblik over de
     verbindingen tot aan de baas (waarde = eigen score + 0,75 x de beste vervolgwaarde), zodat een
     schat/winkel/rust die alleen via één node bereikbaar is gepakt wordt. Gelijke waarde = kleinste
     node-id. De HP REIST MEE over het pad (herstel 30 sep: de elitescore hing alleen aan de huidige
     HP): een gevecht kost een verwachte 7 %, een elite/episch 18 %, een rust onder de rustdrempel
     geneest 30 %; elke node wordt gescoord op de VERWACHTE hp bij aankomst daar (memo per node x
     hp-emmer van 5 %). Een elite na een rust telt dus mee als die rust je boven de drempel brengt.
       scores:  schat 10 · elite/episch 8 als hp >= de elitedrempel, anders -10 · rust 9 onder de
                rustdrempel, anders 1,5 · winkel 9 bij goud >= 200, 6 bij >= 120, anders 0,5 ·
                gevecht 3 (1,5 onder 50 % hp, -2 onder 35 %) · event 2,5
       gretig:      elitedrempel 60 %, rustdrempel 55 %;   voorzichtig: 85 % en 65 %.
   - KAARTKEUZE na een gevecht: neem de beste kaart tenzij het dek al >= 30 kaarten telt; score =
     zeldzaamheid x 10 (episch 4 > zeldzaam 3 > ongewoon 2 > gewoon 1) + een lichte heldvoorkeur
     (Slachter: aanval +3, blok +2, kracht +2; Gifmagiër: Gif +4, blok +1; Kolendruïde: Doornen +4,
     Kracht/Groei +2, blok +1 - gelezen uit type/velden/kaarttekst), + 5 voor een aanval zolang het dek
     minder dan 6 aanvallen telt, en - 40 voor een kaart die de BOT NIET KAN SPELEN (geen eigen tak in
     zijn waarde-switch en geen schade/Gif/Blok-veld: hij zou ze nooit spelen, dood gewicht). Is zelfs
     de beste score <= 0, dan wordt de kaart geweigerd. Gelijk = de eerste optie.
   - VERVLOEKTE BUIT (MEET_VERVLOEKT=1|0): 1 = nemen (standaard sinds het herstel van 30 sep: elke vloek
     uit de pool van pakRelikwie - pijn, de_vergadering, de_handtekening, de_cc, de_naheffing,
     het_dossier - is een gewone dekkaart zonder verwijderverbod, dus sloopbaar bij de Oude Smid of in
     de winkel; een relikwiejager neemt ze); 0 = laten liggen (de oude standaard).
   - WINKEL (MEET_WINKEL=relikwie|kaart): relikwie = eerst relikwieën (goedkoopste betaalbare eerst,
     zolang het kan), dan een verwijdering (vloek > basis-aanval > basis-verdediging, alleen als het dek
     > 12 kaarten telt en er zo'n doel is; de laatste vijf aanvallen blijven), dan een heeldrank als er
     een vak vrij is, dan een kaart (>= ongewoon, bruikbaar voor de bot, geen koopje-met-clausule, dek
     < 30) als er na aankoop >= 60 goud overblijft. kaart = eerst die kaart (zonder de 60-goud-rest),
     dan de relikwieën, verwijdering en drank. LANTAARNOLIE (MEET_OLIE=<n>, standaard 30; 0 = nooit):
     bij binnenkomst eerst olie (+20 licht) als de fakkel < n en het goud > 100.
   - RUST: genees als hp < 60 % (voorzichtig: 70 %), aan de LAATSTE rust vóór een baas (rij 14, ook
     vóór de DICKtator) al onder 75 % (voorzichtig: 85 %), of als er niets te smeden valt; anders smeed
     (de duurste niet-opgewaardeerde aanval/vaardigheid; gelijk = de hoogste zeldzaamheid, dan de
     eerste in het dek). MEET_POOK=<n> (standaard 30 sinds het herstel van 30 sep; 0 = nooit): pook op
     (+50 licht) als de fakkel < n en er niet genezen hoeft te worden - de fakkelregel van een speler
     die in het donker zijn vijanden niet meer leest.
   - EVENT (MEET_EVENT=relikwie|hash|eerste): relikwie (standaard sinds het herstel van 30 sep) = een
     relikwiejager: elke toegestane optie (kan() waar) krijgt een waarde uit wat haar doe() doet
     (gelezen uit de brontekst van de functie: een relikwie +12 zolang de HP-prijs betaalbaar is (hp >
     40 % en de prijs < de helft van je hp), smeden +4, slopen +3 als er een verwijderdoel is, max-HP
     +2, genezen +3 onder 70 % hp, goud +goud/30 (een goudprijs -goud/40), een drank +2, licht +3 onder
     30 licht; HP-prijs -0,4 per HP (-1,5
     onder 40 % hp), max-HP-verlies -0,8 per punt, licht-prijs -0,08 per licht, een vloek -4, een
     gevecht +2 of -8 naar de elitedrempel); de hoogste waarde wint, gelijk = de hash hieronder over
     de gelijke. hash = de optie met index hash(seed, act, rij) mod het aantal toegestane opties (de
     oude standaard: blind, ook 'loop weg'); eerste = altijd de eerste toegestane optie. Kaartkeuzes
     binnen een event (smid, altaren, klerk) volgen dezelfde regels als hierboven (smeden = de
     upgrade-regel, slopen = het verwijderdoel, offeren/versmelten = de slechtste kaarten: vloek >
     basis > laagste score).
   - DREMPELTAFEL (MEET_TAFEL=geen): de tafel verlaten zonder inzet (dtLoopVoorbij: de gedragen
     scherven banken, geen ladder). Andere waarden bestaan nog niet.
   - SCHRIJN (MEET_SCHRIJN=<ids, komma>): de relikwieën die opgeladen in het Schrijn staan en meegaan
     (bv. anker,kroon_van_sintels,hartsteen); leeg = de keuze van het profiel (zie PROFIEL).
   - GEVECHTEN: de bot 'bewust' (speler_bot.js) met walker-toevoegingen die tegen de DICKtator
     niets veranderen: MEET_DRANK=alle (standaard; 'heel' = alleen de heeldrank) drinkt ook de andere
     dranken (zwaar gevecht: ronde 1; anders in nood) - dick_meting.js doet dat sinds het herstel van
     30 sep ook in de aankomstmodus; en MEET_BOTALG=1 (standaard; 0 = uit) kent het Gif op jezelf, de
     gif-afweer van gewone vijanden (gif-immuun, Zwarte Ziel, gif-kaats) en ziet in het DONKER niet
     meer dan een speler (duister: het soort intent maar niet het getal; gedoofd: niets - de bot
     rekent dan met de verwachting over de intentpool van die vijand). MEET_BOTRACE=1 (standaard; 0 =
     uit) = DE WEDLOOP: verliest de bot de wedloop (beurten tot hij valt < beurten tot de vijanden
     vallen), dan telt het nodige Blok zwaarder (x1..2,5); nooit tegen de DICKtator. Zie de kop van
     speler_bot.js.
   - DE DOOD: standaard eindigt de run (dood = {act, rij, type, vijanden, ronde, reden}). Een gevecht
     dat na 45 rondes niet beslist is, telt als dood met reden 'onbeslist' (de bot kan het niet
     winnen). MEET_REDDING=<fractie> (bv. 0.3) is de 'betere vechter': de dood wordt een misverstand
     zoals de Feniksveer - je staat op met die fractie van je max-HP en het gevecht loopt door; elke
     redding wordt geteld (reddingen/gered). Een onbeslist gevecht wordt in die modus AFGEDWONGEN (de
     vijanden op 0, dan de echte gevechtGewonnen; veld afgedwongen[]) zodat de run niet wegvalt uit de
     steekproef. Dat meet de BUITSTROOM van een run los van de zwakte van de bot; de HP bij aankomst is
     dan geen speler-HP meer. ZO'N RUN IS GEEN ECHTE AANKOMST: aangekomen = de baasnode gehaald,
     aangekomenEcht = gehaald ZONDER redding en zonder afgedwongen gevecht. De lader (dick_meting.js
     MEET_AANKOMST) weigert geredde runs tenzij MEET_AANKOMST_REDDING=1.

   Gebruik (Git Bash, vanuit een map met node_modules/playwright; zie ook de NODE_PATH-variant):
     node tools/baas-meting/aankomst.js [N=24] [label=aankomst]
   opties (env):
     MEET_HELDEN=slachter,gifmagier,thoverk   MEET_WERKERS=6   MEET_SEEDBASE=200000 (seeds 'A23-<base+i>')
     MEET_PROFIEL=veteraan|vers   MEET_PAD=gretig|voorzichtig   MEET_VERVLOEKT=1|0   MEET_WINKEL=relikwie|kaart
     MEET_EVENT=relikwie|hash|eerste   MEET_SCHRIJN=anker,kroon_van_sintels,hartsteen   MEET_TAFEL=geen
     MEET_POOK=30   MEET_OLIE=30
     MEET_DRANK=alle|heel   MEET_BOTALG=1|0   MEET_BOTRACE=1|0   MEET_REDDING=0 (of bv. 0.3: de dood = opstaan op 30 % max-HP)
     MEET_SCHADE=1 (of bv. 0.5: DE VAARDIGHEIDSKNOP - elke klap van een vijand op de speler onderweg x 0,5; de bot haalt
       strikt nooit de DICKtator. De ijkset (ijkset_v141.json) = de overlevers van 0,65 / 0,5 / 0,35; maken: python ijkset.py)
     MEET_RUN_S=420 (time-out per run, s)   MEET_STIL_S=20 (geen vooruitgang = fout)   MEET_MAXNODES=80   MEET_BOTLOG=1 (diagnose: rondelog van zware/dodelijke gevechten in botlogs)
     MEET_UIT=<pad>   SLAYIT_WORKTREE / MEET_WORTEL=<map met index.html>   SLAYIT_PLAYWRIGHT=<pad>
   Uitvoer: <werkboom>/.claude/notities/baas-meting/uit/<label>.json (gitignored) of MEET_UIT:
     { meta: {label, versie, N, helden, profiel, pad, schrijn, vervloekt, winkel, event, tafel, pook, olie, drank,
       botAlgemeen, redding, seeds, solo, paginafouten, ...}, runs: [ {seed, held, profiel, schrijn, aangekomen,
       aangekomenEcht, dood, fout, act, hp, maxHp, hpPct, goud, fakkel, licht, relikwieen, relBron,
       dek [[id, up, vonk]] (vonk = het brandmerk van het Vonkaltaar: >0 Heldering, <0 Verduistering, 0 geen),
       gesmeed {id: spec} (alleen als het dek gesmede kaarten draagt), dekN, upgrades, vloeken, vonkN, dranken,
       bezocht, rustKeuzes, gekocht, goudUit, kaartenGenomen, kaartenGeweigerd, gevechten, reddingen, gered,
       afgedwongen, duurMs, tijdlijn, ...} ] }
   Analyse: python tools/baas-meting/aankomst_analyse.py <json> [<json> ...] */
const fs = require('fs'), path = require('path');
const { installeerSpelerBot } = require('./speler_bot.js');
/* de kaart-ids met een eigen tak in de waarde-switch van de bot (voor de kaartkeuze: 'kan de bot dit spelen?') */
const BOT_KENT = [...new Set([...installeerSpelerBot.toString().matchAll(/case '([a-z_0-9]+)'/g)].map(m => m[1]))];
function laadPlaywright() {
  const kandidaten = [process.env.SLAYIT_PLAYWRIGHT, 'playwright',
    'C:\\Users\\THOMAS~1\\AppData\\Local\\Temp\\claude\\C--Users-Thomas-Aelbrecht-Desktop-Workspace-SLAY-IT\\d5a4f6f7-f7ad-4aad-921d-259730d2111c\\scratchpad\\node_modules\\playwright'].filter(Boolean);
  for (const k of kandidaten) { try { return require(k); } catch (e) { /* volgende */ } }
  throw new Error('Playwright niet gevonden: zet SLAYIT_PLAYWRIGHT=<pad naar node_modules/playwright>');
}
const { chromium } = laadPlaywright();
const WORTEL = path.resolve(process.env.MEET_WORTEL || process.env.SLAYIT_WORKTREE || path.resolve(__dirname, '..', '..'));
const HOST = 'localhost:4173';
const BASIS = 'http://' + HOST + '/';
const N = parseInt(process.argv[2] || '24', 10);
const LABEL = process.argv[3] || 'aankomst';
const lijst = (env, std) => (process.env[env] ? process.env[env].split(',').map(s => s.trim()).filter(Boolean) : std);
const HELDEN = lijst('MEET_HELDEN', ['slachter', 'gifmagier', 'thoverk']);
const WERKERS = parseInt(process.env.MEET_WERKERS || '6', 10);
const SEEDBASE = parseInt(process.env.MEET_SEEDBASE || '200000', 10);
const PROFIEL = process.env.MEET_PROFIEL || 'veteraan';
const PAD = process.env.MEET_PAD || 'gretig';
const VERVLOEKT = process.env.MEET_VERVLOEKT !== '0';   /* standaard nemen (herstel 30 sep) */
const WINKEL = process.env.MEET_WINKEL || 'relikwie';
const EVENT = process.env.MEET_EVENT || 'relikwie';
const TAFEL = process.env.MEET_TAFEL || 'geen';
const SCHRIJN = lijst('MEET_SCHRIJN', []);
const POOK = parseInt(process.env.MEET_POOK != null && process.env.MEET_POOK !== '' ? process.env.MEET_POOK : '30', 10);
const OLIE = parseInt(process.env.MEET_OLIE != null && process.env.MEET_OLIE !== '' ? process.env.MEET_OLIE : '30', 10);
const DRANK = process.env.MEET_DRANK || 'alle';
const BOTALG = process.env.MEET_BOTALG !== '0';
const BOTRACE = process.env.MEET_BOTRACE !== '0';
const REDDING = parseFloat(process.env.MEET_REDDING || '0');
/* MEET_SCHADE=<factor> (standaard 1): DE VAARDIGHEIDSKNOP. De bot vecht de gewone gevechten slechter dan een
   mens (strikt haalt hij de DICKtator nooit: 0/72, 38x dood aan de Slijmkoning). Met een factor < 1 doet elke
   klap van een vijand op de speler ONDERWEG x factor (afgerond, minstens 1; ook het onblokbare deel, opts.door) - een speler die beter blokt en
   leest dan de bot. Geen verrijzenis: de dood blijft de dood, de HP-huishouding (rusten, smeden, elites) blijft
   echt, en alleen overlevers komen aan. Geldt NOOIT in de finale (de lader/dick_meting.js kent de knop niet). */
const SCHADE = parseFloat(process.env.MEET_SCHADE || '1');
const BOTLOG = process.env.MEET_BOTLOG === '1';
const RUN_S = parseInt(process.env.MEET_RUN_S || '420', 10);
const STIL_S = parseInt(process.env.MEET_STIL_S || '20', 10);
const MAXNODES = parseInt(process.env.MEET_MAXNODES || '80', 10);
if (!['gretig', 'voorzichtig'].includes(PAD)) throw new Error('MEET_PAD moet gretig of voorzichtig zijn, niet ' + PAD);
if (!['relikwie', 'kaart'].includes(WINKEL)) throw new Error('MEET_WINKEL moet relikwie of kaart zijn, niet ' + WINKEL);
if (!['relikwie', 'hash', 'eerste'].includes(EVENT)) throw new Error('MEET_EVENT moet relikwie, hash of eerste zijn, niet ' + EVENT);
if (!['veteraan', 'vers'].includes(PROFIEL)) throw new Error('MEET_PROFIEL moet veteraan of vers zijn, niet ' + PROFIEL);
if (!['alle', 'heel'].includes(DRANK)) throw new Error('MEET_DRANK moet alle of heel zijn, niet ' + DRANK);
if (TAFEL !== 'geen') throw new Error('MEET_TAFEL: alleen \'geen\' bestaat (de tafel verlaten zonder inzet)');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };

/* ============================================================
   IN DE PAGINA: de stille haken (eenmalig per pagina)
   ============================================================ */
function installeerWalker() {
  window.slaap = () => Promise.resolve();
  try { Klank.sfx = () => {}; Klank.muziek = () => {}; Klank.duck = () => {}; } catch (e) {}
  window.schudScherm = () => {};
  window.saveSpel = () => {};
  window.wisSave = () => {};
  window.checkGrafsteen = () => {};
  window.toonDecreetReveal = () => {};
  /* de reveal-ceremonies zijn puur presentatie (de buit valt al vóór de aanroep): stil */
  window.toonRelikwieReveal = () => null;
  window.toonScherfReveal = () => null;
  window.toonVloekReveal = () => null;
  window.toonKaartReveal = () => null;
  try { INST.d3 = false; INST.lite = true; INST.spraak = false; } catch (e) {}
  document.body.classList.add('lite');
  if (typeof DICK === 'object' && DICK) DICK.tempo = 0.02;
  /* nederlaag = alleen de vlag: de run is voorbij (geen eindscherm, geen loopbaan, geen Slachtblok-dood) */
  /* MEET_SCHADE (de vaardigheidsknop): elke klap van een vijand op de speler x window.__schade */
  window.__schade = 1;
  const oDS = window.doeSchade;
  window.doeSchade = function (doel, dmg, bron, opts) {
    if (window.__schade !== 1 && doel && doel.isSpeler && bron && !bron.isSpeler && !bron.isMetgezel) {
      if (dmg > 0) dmg = Math.max(1, Math.round(dmg * window.__schade));
      /* het ONBLOKBARE deel (opts.door: de Erfprins slaat 60 % door je Blok) schaalt mee - anders stond de Erfprins op
         ~x0,74 terwijl elke andere vijand op x0,35 stond (tegenlezing 1 okt). Gif dat een vijand op je legt tikt via
         verliesHp en blijft ongeschaald. */
      if (opts && opts.door > 0) opts = Object.assign({}, opts, { door: Math.max(1, Math.round(opts.door * window.__schade)) });
    }
    return oDS.call(this, doel, dmg, bron, opts);
  };
  window.__redding = 0; window.__reddingen = [];
  window.nederlaag = function (reden) {
    const g = S.gevecht; if (!g || g.voorbij) return;
    /* MEET_REDDING (de 'betere vechter'): de dood wordt een misverstand, zoals de Feniksveer - je staat
       op met een fractie van je max-HP en het gevecht loopt door; de walker telt elke redding */
    if (window.__redding > 0) {
      S.hp = Math.max(1, Math.round(S.maxHp * window.__redding));
      window.__reddingen.push({ act: S.act, beurt: g.beurt, vijanden: g.vijanden.map(v => v.id) });
      try { renderTopbalk(); } catch (e) {}
      return;
    }
    g.voorbij = true; g._verloren = true; g.bezig = true;
    window.__doodVlag = { reden: reden || null };
    try { stopGevechtLus(); } catch (e) {}
  };
  /* de kaartkeuzes: niet tonen maar klaarzetten; de walker beslist (losKeuze) */
  window.__keuze = null; window.__kModus = null;
  window.toonKaartKeuze = function (kaarten, titel, bijKeuze, bijOverslaan, opts) {
    window.__keuze = { soort: 'kaart', kaarten: kaarten || [], titel, bijKeuze, bijOverslaan, opts: opts || {}, modus: window.__kModus || 'kies' };
    window.__kModus = null;
  };
  window.toonMeerKeuze = function (kaarten, titel, opts) {
    opts = opts || {};
    window.__keuze = { soort: 'meer', kaarten: kaarten || [], titel, aantal: Math.max(1, opts.aantal || 1), bijKeuze: opts.bijKeuze, bijOverslaan: opts.bijOverslaan, opts, modus: 'meer' };
  };
  const oKUD = window.kiesKaartUitDek;
  window.kiesKaartUitDek = function (modus) { window.__kModus = modus; try { return oKUD.apply(this, arguments); } finally { window.__kModus = null; } };
  window.smeedCeremonie = function (c, daarna) { c.up = true; if (daarna) daarna(); };
  /* DE BRON van elk relikwie: de walker zet window.__bronNu vóór hij een kamer opent */
  window.__relBron = {}; window.__bronNu = 'anders';
  const oGR = window.geefRelikwie;
  window.geefRelikwie = function (id) {
    const nieuw = !!(S && S.relikwieen && !S.relikwieen.includes(id));
    const r = oGR.apply(this, arguments);
    if (nieuw && S.relikwieen.includes(id) && !window.__relBron[id]) window.__relBron[id] = window.__bronNu || 'anders';
    return r;
  };
  /* de Codex van een verse pagina: vóór elke run terug (Schrijn, scherven-stash, erfprins-teller, ...) */
  window.__codexBasis = JSON.parse(JSON.stringify(Codex));
  window.__herstelCodex = () => {
    const b = JSON.parse(JSON.stringify(window.__codexBasis));
    for (const k of Object.keys(Codex)) delete Codex[k];
    Object.assign(Codex, b);
  };
  window.__opruim = () => {
    document.querySelectorAll('#overlay-drempeltafel, .relikwie-reveal-overlay, .scherf-reveal-overlay, .vloek-reveal-overlay, .kaart-reveal-overlay, #baas-intro, .baas-flits, .baas-spraak, .bevestig-overlay, .roof-overlay, .decreet-overlay, .vonnis').forEach(n => { try { n.remove(); } catch (e) {} });
    try { if (typeof dtWisTimers === 'function') dtWisTimers(); } catch (e) {}
    try { _dt = null; } catch (e) {}
  };
}

/* ============================================================
   IN DE PAGINA: één volledige run tot de aankomst (of de dood)
   ============================================================ */
async function speelRun(cfg) {
  const t0 = performance.now();
  const wacht = ms => new Promise(r => setTimeout(r, ms));
  const Z = { basis: 0, start: 0, gewoon: 1, ongewoon: 2, gesmeed: 2, zeldzaam: 3, episch: 4, vloek: -5 };
  const HELDREL = SPELERS[cfg.held] ? SPELERS[cfg.held].relikwie : null;
  /* ---------- de beleidsregels (deterministisch; geen Math.random) ---------- */
  const fnv = t => { let h = 2166136261 >>> 0; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const tekstVan = d => { try { return String(d.tekst({ id: '', up: false, uid: 0 }) || ''); } catch (e) { return ''; } };
  /* kan de bot deze kaart spelen? (een eigen tak in zijn waarde-switch, of de standaardtak: een aanval
     met schade, Gif of Blok). Een kaart die hij niet waardeert, speelt hij nooit: dood gewicht. */
  const botKent = new Set(cfg.botKent || []);
  const botBruikbaar = d => botKent.has(d.id) || (d.type === 'aanval' && (d.dmg || 0) > 0) || (d.gif || 0) > 0 || (d.blok || 0) > 0;
  const aanvallenInDek = () => S.dek.filter(c => kdef(c) && kdef(c).type === 'aanval').length;
  const kaartScore = id => {
    const d = KAARTEN[id];
    if (!d || d.type === 'vloek' || d.kost === null) return -99;
    let s = (Z[d.zeld] || 0) * 10;
    if (!botBruikbaar(Object.assign({ id }, d))) s -= 40;
    if (d.type === 'aanval' && aanvallenInDek() < 6) s += 5;   /* een dek zonder schade wint niets */
    const t = tekstVan(d);
    const blok = (d.blok || 0) > 0 || /Blok/.test(t);
    if (cfg.held === 'slachter') { if (d.type === 'aanval') s += 3; if (blok) s += 2; if (d.type === 'kracht' || /Kracht/.test(t)) s += 2; }
    else if (cfg.held === 'gifmagier') { if ((d.gif || 0) > 0 || /Gif/.test(t)) s += 4; if (blok) s += 1; }
    else if (cfg.held === 'thoverk') { if ((d.dr || 0) > 0 || (d.doorn || 0) > 0 || /Doornen/.test(t)) s += 4; if (/Kracht|Groei/.test(t)) s += 2; if (blok) s += 1; }
    return s;
  };
  /* de beste kaart; null (= overslaan) als zelfs de beste een dood gewicht is voor de bot */
  const besteKaart = kaarten => { let best = null, bs = -Infinity; for (const c of kaarten) { const s = kaartScore(c.id); if (s > bs) { bs = s; best = c; } } return bs > 0 ? best : null; };
  const besteUpgrade = kaarten => {
    let best = null, bs = -Infinity;
    for (const c of kaarten) {
      const d = kdef(c); if (!d || c.up || !d.up || d.type === 'vloek') continue;
      const s = (['aanval', 'vaardigheid'].includes(d.type) ? 1000 : 0) + (typeof d.kost === 'number' ? d.kost : 0) * 10 + (Z[d.zeld] || 0);
      if (s > bs) { bs = s; best = c; }
    }
    return best;
  };
  /* het verwijderdoel: vloek > basis-aanval (niet opgewaardeerd eerst) > basis-verdediging; anders null */
  const verwijderDoel = kaarten => {
    const aanv = aanvallenInDek();
    const r = c => { const d = kdef(c); if (!d) return 99; if (d.type === 'vloek') return 0;
      if (d.zeld === 'basis' && d.type === 'aanval') return aanv <= 5 ? 99 : (c.up ? 2 : 1);   /* de laatste vijf aanvallen blijven */
      if (d.zeld === 'basis') return c.up ? 4 : 3; return 99; };
    let best = null, br = 99; for (const c of kaarten) { const x = r(c); if (x < br) { br = x; best = c; } }
    return br < 99 ? best : null;
  };
  /* de slechtste n kaarten (offers aan de altaren): vloek > basis > laagste score */
  const slechtste = (kaarten, n) => {
    const aanv = aanvallenInDek();
    const w = c => { const d = kdef(c); if (!d) return 999; if (d.type === 'vloek') return -100;
      if (d.zeld === 'basis' && !(d.type === 'aanval' && aanv <= 5)) return (c.up ? 5 : 0) - 50;
      return kaartScore(c.id) + (c.up ? 3 : 0); };
    return kaarten.map((c, i) => ({ c, i, w: w(c) })).sort((a, b) => a.w - b.w || a.i - b.i).slice(0, n).map(x => x.c);
  };
  const P = cfg.pad === 'voorzichtig' ? { elite: 0.85, rust: 0.65, genees: 0.70, baasRust: 0.85 } : { elite: 0.60, rust: 0.55, genees: 0.60, baasRust: 0.75 };
  const nodeScore = (type, hpF) => {
    switch (type) {
      case 'schat': return 10;
      case 'elite': case 'episch': return hpF >= P.elite ? 8 : -10;
      case 'rust': return hpF < P.rust ? 9 : 1.5;
      case 'winkel': return S.goud >= 200 ? 9 : (S.goud >= 120 ? 6 : 0.5);
      case 'event': return 2.5;
      case 'gevecht': return hpF < 0.35 ? -2 : (hpF < 0.5 ? 1.5 : 3);
      default: return 0;
    }
  };
  /* de waarde van een pad: eigen score + 0,75 x de beste vervolgwaarde, tot aan de baas (volledige
     vooruitblik over de verbindingen). HERSTEL 30 sep: de HP REIST MEE - elke node wordt gescoord op
     de verwachte hp bij aankomst daar (een gevecht kost 7 %, een elite/episch 18 %, een rust onder de
     rustdrempel geneest 30 %), zodat 'rust, dan elite' niet meer als 'elite op je huidige lage hp'
     telt. Memo per node x hp-emmer van 5 %. */
  const HP_KOST = { gevecht: 0.07, elite: 0.18, episch: 0.18 };
  const hpNa = (type, hpF) => {
    if (type === 'rust' && hpF < P.rust) return Math.min(1, hpF + 0.30);
    return Math.max(0.05, hpF - (HP_KOST[type] || 0));
  };
  const kiesPad = ids => {
    const memo = {};
    const padWaarde = (id, hpF) => {
      const k = id + '|' + Math.round(hpF * 20);
      if (memo[k] != null) return memo[k];
      const n = S.kaart[id]; if (!n) return 0;
      let v = nodeScore(n.type, hpF);
      const verder = hpNa(n.type, hpF);
      if (n.verb && n.verb.length) v += 0.75 * Math.max(...n.verb.map(x => padWaarde(x, verder)));
      return (memo[k] = v);
    };
    const hp0 = S.hp / S.maxHp;
    let best = null, bv = -Infinity;
    for (const id of ids.slice().sort()) { const v = padWaarde(id, hp0); if (v > bv) { bv = v; best = id; } }
    return best;
  };
  const bronVan = type => ({ schat: 'schat', elite: 'elite', episch: 'episch', winkel: 'winkel', event: 'event', baas: 'baas' })[type] || 'anders';

  /* ---------- de staat van de run ---------- */
  const tijdlijn = [];
  const bezocht = {};
  const rustKeuzes = { genees: 0, smeed: 0, pook: 0 };
  const gekocht = { relikwieen: 0, kaarten: 0, dranken: 0, verwijderingen: 0 };
  const gevechten = { n: 0, gewonnen: 0, rondesTotaal: 0, hpVerlies: 0 };
  let goudUit = 0, kaartenGenomen = 0, kaartenGeweigerd = 0, nodes = 0;
  let kamer = null, laatsteGevecht = null, dood = null, fout = null, aangekomen = false;
  const laatsteRegel = () => tijdlijn.length ? tijdlijn[tijdlijn.length - 1] : '(nog geen kamer)';

  /* een kamer afsluiten: één regel in de tijdlijn met wat er veranderde */
  const sluitKamer = () => {
    if (!kamer || kamer.gesloten) return;
    kamer.gesloten = true;
    const relNu = S.relikwieen.filter(r => !kamer.rel.includes(r));
    const uidVoor = new Set(kamer.dek);
    const kaartNu = S.dek.filter(c => !uidVoor.has(c.uid)).map(c => c.id);
    const kaartWeg = kamer.dekIds.filter(([uid]) => !S.dek.some(c => c.uid === uid)).map(([, id]) => id);
    let r = `A${kamer.act} r${kamer.r} ${kamer.type}`;
    if (kamer.extra) r += ' ' + kamer.extra;
    r += ` hp ${kamer.hp}->${S.hp}/${S.maxHp} g ${kamer.goud}->${S.goud} f ${kamer.fakkel}->${S.fakkel}`;
    if (relNu.length) r += ' +R ' + relNu.join(',');
    if (kaartNu.length) r += ' +K ' + kaartNu.join(',');
    if (kaartWeg.length) r += ' -K ' + kaartWeg.join(',');
    tijdlijn.push(r);
  };
  const losKeuze = () => {
    const k = window.__keuze; window.__keuze = null;
    if (!k) return;
    if (k.soort === 'meer') {
      const sel = slechtste(k.kaarten, k.aantal);
      if (sel.length === k.aantal && k.bijKeuze) k.bijKeuze(sel); else if (k.bijOverslaan) k.bijOverslaan();
      if (kamer) kamer.extra = (kamer.extra || '') + ` [offer ${sel.map(c => c.id).join('+')}]`;
      return;
    }
    if (k.opts && k.opts.bekijkAlleen) { if (k.bijOverslaan) k.bijOverslaan(); return; }
    let c = null;
    if (k.modus === 'upgrade') c = besteUpgrade(k.kaarten);
    else if (k.modus === 'verwijder') c = verwijderDoel(k.kaarten) || slechtste(k.kaarten, 1)[0] || null;
    else c = besteKaart(k.kaarten);
    if (kamer && c) kamer.extra = (kamer.extra || '') + ` [${k.modus} ${c.id}${c.up && k.modus !== 'upgrade' ? '+' : ''}]`;
    if (c && k.bijKeuze) k.bijKeuze(c); else if (k.bijOverslaan) k.bijOverslaan();
  };

  /* ---------- de kamers ---------- */
  const doeBeloning = () => {
    const b = S.beloning || {};
    if (b.kaarten && b.kaarten.length) {
      if (S.dek.length >= 30) { kaartenGeweigerd++; kamer.extra = (kamer.extra || '') + ' [kaart geweigerd: dek 30]'; }
      else {
        const c = besteKaart(b.kaarten.map(id => ({ id })));
        if (c) { S.dek.push(nieuweKaart(c.id)); kaartenGenomen++; } else kaartenGeweigerd++;
      }
      S.beloning.kaarten = null;
    }
    if (b.relikwie && b.vervloekt) {
      if (cfg.vervloekt) { pakRelikwie(); kamer.extra = (kamer.extra || '') + ' [vervloekt genomen]'; }
      else kamer.extra = (kamer.extra || '') + ` [vervloekt ${b.relikwie} laten liggen]`;
    }
    verderNaBeloning();
  };
  const doeRust = () => {
    const hpF = S.hp / S.maxHp;
    const heel = Math.floor(S.maxHp * 0.3) + (heeftRelikwie('levenskruik') ? 10 : 0);
    const kanSmeden = S.dek.some(c => !c.up && kdef(c).up);
    /* de laatste rust vóór een baas (rij 14; ook vóór de DICKtator): een speler gaat daar liefst vol in */
    const voorBaas = (S.kaart[S.pos] || { verb: [] }).verb.includes('baas');
    if (hpF < (voorBaas ? P.baasRust : P.genees) || !kanSmeden) {
      rustKeuzes.genees++; kamer.extra = 'genees';
      rustGenees(heel); renderKaartScherm();
    } else if (cfg.pook > 0 && S.fakkel < cfg.pook && S.fakkel < fakkelMax()) {
      rustKeuzes.pook++; kamer.extra = 'pook';
      rustPook(); renderKaartScherm();
    } else {
      rustKeuzes.smeed++; kamer.extra = 'smeed';
      rustSmeed();   /* -> kiesKaartUitDek('upgrade') -> klaargezette keuze -> losKeuze -> renderKaartScherm */
      losKeuze();
    }
  };
  const doeWinkel = () => {
    const w = S.winkel; const goudVoor = S.goud;
    const koopRelikwieen = () => {
      for (let pog = 0; pog < 3; pog++) {
        const opties = w.relikwieen.map((it, i) => ({ it, i })).filter(x => x.it && S.goud >= x.it.prijs)
          .sort((a, b) => a.it.prijs - b.it.prijs || (a.it.id < b.it.id ? -1 : 1));
        if (!opties.length) return;
        window.__bronNu = 'winkel';
        koopRelikwie(opties[0].i); gekocht.relikwieen++;
      }
    };
    const koopVerw = () => {
      if (w.verwijderd || S.goud < w.verwijderPrijs || S.dek.length <= 12 || !verwijderDoel(S.dek)) return;
      koopVerwijdering();   /* -> kiesKaartUitDek('verwijder') -> klaargezette keuze */
      losKeuze();
      if (w.verwijderd) gekocht.verwijderingen++;
    };
    const koopDrankje = () => {
      const i = w.dranken.findIndex(it => it && it.id === 'heeldrank' && S.goud >= it.prijs);
      if (i >= 0 && S.dranken.length < drankSlots()) { koopDrank(i); gekocht.dranken++; }
    };
    const koopKaartje = minRest => {
      if (S.dek.length >= 30) return;
      let best = -1, bs = -Infinity;
      w.kaarten.forEach((it, i) => {
        if (!it || it.clausule || S.goud - it.prijs < minRest) return;
        const d = kdef(it.kaart); if (!d || (Z[d.zeld] || 0) < 2) return;
        const s = kaartScore(it.kaart.id); if (s > bs && s > 0) { bs = s; best = i; }
      });
      if (best >= 0) { koopKaart(best); gekocht.kaarten++; }
    };
    /* de fakkelregel (MEET_OLIE, herstel 30 sep): in het donker eerst olie, als er goud genoeg is */
    if (cfg.olie > 0 && w.olie && !w.olie.gekocht && S.fakkel < cfg.olie && S.goud > 100 && S.goud >= w.olie.prijs && S.fakkel < fakkelMax()) {
      koopOlie(); gekocht.olie = (gekocht.olie || 0) + 1;
    }
    if (cfg.winkel === 'kaart') { koopKaartje(0); koopRelikwieen(); koopVerw(); koopDrankje(); }
    else { koopRelikwieen(); koopVerw(); koopDrankje(); koopKaartje(60); }
    goudUit += Math.max(0, goudVoor - S.goud);
    kamer.extra = `uit ${goudVoor - S.goud}`;
    renderKaartScherm();
  };
  /* HET EVENTBELEID 'relikwie' (herstel 30 sep; zie de kop): de waarde van een optie uit wat haar
     doe() doet, gelezen uit de brontekst (plus label/detail/hint voor de prijzen die alleen daar staan) */
  const getallen = (t, re) => [...t.matchAll(re)].map(m => parseInt(m[1], 10)).filter(n => !isNaN(n));
  const optieWaarde = o => {
    const src = (() => { try { return String(o.doe); } catch (e) { return ''; } })();
    const lab = [o.label, o.detail, o.hint].filter(x => typeof x === 'string').join(' ');
    const hpF = S.hp / S.maxHp;
    const hpKost = Math.max(0, ...getallen(src, /S\.hp\s*-=\s*(\d+)/g), ...getallen(src, /verliesHpBuitenGevecht\((\d+)\)/g), ...getallen(lab, /[−-]\s*(\d+)\s*HP\b/g));
    const maxHpMin = Math.max(0, ...getallen(src, /S\.maxHp\s*-\s*(\d+)/g));
    const lichtMin = Math.max(0, ...getallen(src, /zetFakkel\(\s*-\s*(\d+)\)/g), ...getallen(lab, /[−-]\s*(\d+)\s*licht/g));
    const lichtPlus = Math.max(0, ...getallen(src, /zetFakkel\(\s*(\d+)\)/g));
    const goud = Math.max(0, ...getallen(src, /geefGoud\((\d+)\)/g));
    const genees = Math.max(0, ...getallen(src, /geneesHpBuitenGevecht\((\d+)\)/g));
    let v = 0;
    const relikwie = /willekeurigRelikwie\(|geefRelikwie\(/.test(src);
    if (relikwie && hpF > 0.4 && hpKost < S.hp * 0.5) v += 12;
    if (/kiesKaartUitDek\(\s*'upgrade'/.test(src) || /\.up\s*=\s*true/.test(src)) v += 4;   /* ook een upgrade die doe() zelf zet (het pamflet) */
    if (/kiesKaartUitDek\(\s*'verwijder'/.test(src) && verwijderDoel(S.dek)) v += 3;
    if (/S\.maxHp\s*\+=/.test(src)) v += 2;
    if (genees > 0 && hpF < 0.7) v += 3;
    if (goud > 0) v += goud / 30;
    const goudKost = Math.max(0, ...getallen(src, /S\.goud\s*-=\s*(\d+)/g));
    if (goudKost > 0) v -= goudKost / 40;
    if (/S\.dranken\.push\(/.test(src)) v += 2;
    if (lichtPlus > 0 && S.fakkel < 30) v += 3;
    v -= hpKost * (hpF < 0.4 ? 1.5 : 0.4);
    v -= maxHpMin * 0.8;
    v -= lichtMin * 0.08;
    if (/geef(Dek|Licht)?Vloek\(/.test(src)) v -= 4;   /* tegenlezing 1 okt: geefVloek( (de avonturier) werd niet als vloek gezien */
    if (/startGevecht\(/.test(src)) v += (hpF >= P.elite ? 2 : -8);
    return Math.round(v * 100) / 100;
  };
  const doeEvent = () => {
    const ev = EVENTS.find(e => e.id === S.huidigEvent);
    const mag = ev.opties.map((o, i) => ({ o, i })).filter(x => !x.o.kan || x.o.kan());
    const h = fnv(cfg.seed + '|' + S.act + '|' + kamer.r);
    let keuze;
    if (cfg.event === 'eerste') keuze = mag[0];
    else if (cfg.event === 'hash') keuze = mag[h % mag.length];
    else {
      const w = mag.map(x => ({ ...x, w: optieWaarde(x.o) }));
      const top = Math.max(...w.map(x => x.w));
      const gelijk = w.filter(x => x.w === top);
      keuze = gelijk[h % gelijk.length];
    }
    kamer.extra = `${ev.id}#${keuze.i}`;
    kiesEventOptie(keuze.i);
  };

  /* ---------- opstart ---------- */
  try { if (S && S.gevecht) { S.gevecht.voorbij = true; stopGevechtLus(); } } catch (e) {}
  window.__opruim();
  window.__doodVlag = null; window.__keuze = null; window.__kModus = null; window.__relBron = {};
  window.__redding = cfg.redding || 0; window.__reddingen = [];
  window.__schade = cfg.schade || 1;
  const reddingen = [], afgedwongen = [], botlogs = [];
  window.__herstelCodex();
  /* HET PROFIEL (herstel 30 sep): de veteraan draagt SCHRIJN_MAX opgeladen relikwieën mee (MEET_SCHRIJN,
     of 3 uit ongewoon+zeldzaam via hash(seed|held|k)) en heeft alle episch-scherven al (geen
     gegarandeerde episch-node); de verse speler niets van dat alles */
  let schrijn = cfg.schrijn.slice();
  if (cfg.profiel === 'veteraan') {
    if (!schrijn.length) {
      const pool = Object.keys(RELIKWIEEN).filter(r => !RELIKWIEEN[r].start && ['ongewoon', 'zeldzaam'].includes(RELIKWIEEN[r].zeld) && r !== HELDREL).sort();
      for (let k = 0; schrijn.length < SCHRIJN_MAX && k < 50; k++) {
        const r = pool[fnv(cfg.seed + '|' + cfg.held + '|schrijn|' + k) % pool.length];
        if (!schrijn.includes(r)) schrijn.push(r);
      }
    }
    const episch = alleScherfIds().filter(sid => { const d = scherfDef(sid); return d && d.bron === 'episch'; });
    Codex.scherven = [...new Set([...(Codex.scherven || []), ...episch])];
  }
  if (schrijn.length) Codex.opgeladen = schrijn.slice();
  schrijnKeuzes = schrijn.slice(); slachtblokKeuzes = []; scherfKeuzes = [];
  window.__bronNu = 'schrijn';
  nieuwSpel(cfg.held, cfg.seed, 0, false);
  window.__bronNu = 'anders';
  if (HELDREL) window.__relBron[HELDREL] = 'start';
  S.ascensie = 0;
  renderKaartScherm();

  /* ---------- de lus: kijk welk scherm er staat en handel het af ---------- */
  let sig0 = '', sigTijd = performance.now();
  try {
    while (true) {
      const nu = performance.now();
      if (nu - t0 > cfg.deadlineMs) throw new Error('time-out van de run (' + Math.round(cfg.deadlineMs / 1000) + ' s) na: ' + laatsteRegel());
      const sig = [S.scherm, S.act, S.verdieping, S.pos, S.hp, S.goud, S.dek.length, S.relikwieen.length, S.gevecht ? S.gevecht.beurt : -1, !!window.__keuze, typeof _dt !== 'undefined' && !!_dt, nodes].join('|');
      if (sig !== sig0) { sig0 = sig; sigTijd = nu; }
      else if (nu - sigTijd > cfg.stilMs) throw new Error('geen vooruitgang in ' + Math.round(cfg.stilMs / 1000) + ' s op scherm ' + S.scherm + ' na: ' + laatsteRegel());
      if (window.__doodVlag || (S.hp <= 0 && S.gevecht)) {
        const lg = laatsteGevecht || {};
        dood = { act: S.act, rij: kamer ? kamer.r : null, type: kamer ? kamer.type : null, vijanden: lg.vijanden || [], ronde: lg.rondes || null,
          reden: (window.__doodVlag && window.__doodVlag.reden) || null };
        if (kamer) kamer.extra = (kamer.extra || '') + ' DOOD';
        sluitKamer();
        break;
      }
      if (window.__keuze) { losKeuze(); continue; }
      if (typeof _dt !== 'undefined' && _dt) {   /* DE DREMPELTAFEL (einde Act 1): verlaten zonder inzet */
        if (typeof dtFase === 'function' && dtFase() === 'nissen' && !_dt.bezig) { sluitKamer(); dtLoopVoorbij(); tijdlijn.push(`A${S.act} Drempeltafel: voorbij gelopen (${(Codex.scherven || []).length} scherven op de stash)`); }
        else await wacht(40);
        continue;
      }
      const sc = S.scherm;
      if (sc === 'kaart') {
        sluitKamer();
        const besch = beschikbareNodes();
        if (S.act >= 3 && besch.includes('baas')) { aangekomen = true; break; }
        if (!besch.length) throw new Error('geen bereikbare node op de kaart (pos ' + S.pos + ')');
        if (nodes >= cfg.maxNodes) throw new Error('meer dan ' + cfg.maxNodes + ' kamers');
        const id = besch.length === 1 ? besch[0] : kiesPad(besch);
        const n = S.kaart[id];
        kamer = { id, type: n.type, r: n.r, act: S.act, hp: S.hp, goud: S.goud, fakkel: S.fakkel, rel: S.relikwieen.slice(), dek: S.dek.map(c => c.uid), dekIds: S.dek.map(c => [c.uid, c.id]), extra: '' };
        const b = bezocht[S.act] = bezocht[S.act] || { gevecht: 0, elite: 0, episch: 0, rust: 0, winkel: 0, schat: 0, event: 0, baas: 0 };
        b[n.type] = (b[n.type] || 0) + 1;
        window.__bronNu = bronVan(n.type);
        nodes++;
        kiesNodeEcht(id);
        continue;
      }
      if (sc === 'gevecht') {
        const g = S.gevecht;
        if (g && !g.voorbij && kamer && !kamer.gevochten) {
          kamer.gevochten = true;
          if (g.metgezel) throw new Error('solo-toets: een metgezel (' + g.metgezel.id + ') in het gevecht');
          const zwaar = g.soort === 'baas' || g.soort === 'episch' || g.soort === 'elite';
          const blog = cfg.botlog ? [] : null;   /* MEET_BOTLOG=1 (diagnose): de rondelog van de zware en de dodelijke gevechten */
          const r = await window.__speelGevecht({ beleid: 'bewust', maxRondes: 45, startWacht: zwaar ? 720 : 200, dranken: cfg.dranken, algemeen: cfg.algemeen, race: cfg.race, log: blog });
          if (blog && (zwaar || r.dood || (r.hpVerlies || 0) >= 15)) botlogs.push({ act: S.act, rij: kamer.r, type: kamer.type, vijanden: r.vijanden, uitkomst: r.gewonnen ? 'W' : (r.dood ? 'V' : '?'), log: blog });
          laatsteGevecht = r;
          const nieuwGered = window.__reddingen.splice(0);
          if (nieuwGered.length) { nieuwGered.forEach(x => reddingen.push(Object.assign({ rij: kamer.r, type: kamer.type }, x))); }
          gevechten.n++; gevechten.rondesTotaal += r.rondes || 0; gevechten.hpVerlies += r.hpVerlies || 0;
          if (r.gewonnen) gevechten.gewonnen++;
          kamer.extra = `[${(r.vijanden || []).join(',')}] ${r.gewonnen ? 'W' : (r.dood ? 'V' : '?')} ${r.rondes}r${nieuwGered.length ? ' GERED x' + nieuwGered.length : ''}`;
          if (r.fout) throw new Error('gevecht: ' + String(r.fout).split('\n')[0]);
          /* 45 rondes zonder beslissing: de bot kan dit gevecht niet winnen (bv. een gifdek tegen de
             Verzwolgene, die gif opslorpt). Strikt: een uitkomst, de run eindigt als dood met reden
             'onbeslist'. Met MEET_REDDING (herstel 30 sep): AFDWINGEN - anders vallen precies de runs
             met zo'n elite (een relikwiebron) weg uit de steekproef. De vijanden gaan op 0 en de ECHTE
             gevechtGewonnen deelt de buit uit; de run draagt het in afgedwongen[] (en telt dus niet
             als echte aankomst). */
          if (r.timeout) {
            if (cfg.redding > 0 && S.gevecht === g && !g.voorbij) {
              afgedwongen.push({ act: S.act, rij: kamer.r, type: kamer.type, vijanden: (r.vijanden || []).slice(), rondes: r.rondes });
              g.vijanden.forEach(v => { v.hp = 0; v.dood = true; });
              kamer.extra += ' AFGEDWONGEN';
              try { await gevechtGewonnen(); } catch (e) { throw new Error('afdwingen: ' + ((e && e.message) || e)); }
            } else { window.__doodVlag = { reden: 'onbeslist (' + r.rondes + ' rondes)' }; try { g.voorbij = true; g._verloren = true; stopGevechtLus(); } catch (e) {} }
          }
          continue;
        }
        await wacht(25);   /* het gevecht is voorbij: wachten op de beloning / de act-overgang */
        continue;
      }
      if (sc === 'beloning') {
        if (!kamer.beloningGedaan) { kamer.beloningGedaan = true; doeBeloning(); } else await wacht(25);
        continue;
      }
      if (sc === 'rust') {
        if (!kamer.rustGedaan) { kamer.rustGedaan = true; doeRust(); } else await wacht(25);
        continue;
      }
      if (sc === 'winkel') {
        if (!kamer.winkelGedaan) { kamer.winkelGedaan = true; doeWinkel(); } else await wacht(25);
        continue;
      }
      if (sc === 'schat') {
        if (!kamer.schatOpen) { kamer.schatOpen = true; onthulSchat(); }
        else if (document.querySelector('#scherm-schat .schat-verder')) renderKaartScherm();
        else await wacht(25);
        continue;
      }
      if (sc === 'event') {
        if (!kamer.eventGekozen) { kamer.eventGekozen = true; doeEvent(); }
        else if (document.querySelector('#scherm-event .event-onthul')) renderKaartScherm();
        else await wacht(25);
        continue;
      }
      if (sc === 'einde') {   /* de act-overgang (het doek) - de Drempeltafel is hierboven al afgehandeld */
        sluitKamer();
        tijdlijn.push(`=== Act ${S.act} (fakkel ${S.fakkel}) ===`);
        renderKaartScherm();
        continue;
      }
      await wacht(40);
    }
  } catch (e) {
    fout = (e && e.message) ? e.message : String(e);
    try { sluitKamer(); } catch (e2) {}
  }
  /* ---------- de snapshot ---------- */
  /* het dek als [id, up, vonk]: vonk = het brandmerk van het Vonkaltaar (c.vonk, >0 Heldering, <0
     Verduistering, 0 geen) - herstel 30 sep: het viel eerst stil weg uit de aankomstbuild */
  const dek = S.dek.map(c => [c.id, c.up ? 1 : 0, c.vonk || 0]);
  /* gesmede kaarten (gesmeed_*) reizen met hun spec, anders kent de lader ze niet */
  const gesmeed = {};
  S.dek.forEach(c => { if (/^gesmeed_/.test(c.id) && S.gesmeed && S.gesmeed[c.id]) gesmeed[c.id] = JSON.parse(JSON.stringify(S.gesmeed[c.id])); });
  const relBron = {};
  S.relikwieen.forEach(r => { relBron[r] = window.__relBron[r] || (r === HELDREL ? 'start' : 'anders'); });
  const gehaald = aangekomen && !fout;
  return {
    seed: cfg.seed, held: cfg.held, profiel: cfg.profiel, pad: cfg.pad, schrijn,
    /* aangekomen = de baasnode gehaald (ook met redding: de buitstroom); aangekomenEcht = gehaald zonder
       één redding en zonder afgedwongen gevecht - alleen DAT is een echte aankomst */
    aangekomen: gehaald, aangekomenEcht: gehaald && reddingen.length === 0 && afgedwongen.length === 0, dood, fout,
    scherm: fout ? S.scherm : undefined,
    act: S.act, verdieping: S.verdieping, hp: S.hp, maxHp: S.maxHp, hpPct: Math.round(1000 * S.hp / S.maxHp) / 1000,
    goud: S.goud, fakkel: S.fakkel, licht: lichtNiveau(),
    relikwieen: S.relikwieen.slice(), relBron,
    dek, dekN: dek.length, upgrades: S.dek.filter(c => c.up).length,
    vloeken: S.dek.filter(c => kdef(c) && kdef(c).type === 'vloek').length,
    vonkN: S.dek.filter(c => c.vonk).length,
    ...(Object.keys(gesmeed).length ? { gesmeed } : {}),
    dranken: S.dranken.slice(), scherven: (S.scherven || []).slice(), metgezel: S.metgezel ? S.metgezel.id : null,
    redding: cfg.redding || 0, reddingen, gered: reddingen.length, afgedwongen, schade: cfg.schade || 1,
    bezocht, rustKeuzes, gekocht, goudUit, kaartenGenomen, kaartenGeweigerd, gevechten, kamers: nodes,
    duurMs: Math.round(performance.now() - t0), tijdlijn, ...(cfg.botlog ? { botlogs } : {})
  };
}

/* ============================================================
   NODE: pagina's opzetten en de runs verdelen
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
  page.on('pageerror', e => fouten.push(String(e.message).slice(0, 200) + ' @ ' + String(e.stack || '').split('\n').slice(1, 4).map(x => x.trim().replace(/https?:\/\/localhost:4173\//, '')).join(' < ')));
  await page.goto(BASIS, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof startGevecht === 'function' && typeof nieuwSpel === 'function' && typeof KAARTEN !== 'undefined' && typeof DICK === 'object' && typeof toonDrempeltafel === 'function');
  await page.waitForTimeout(500);
  await page.evaluate(installeerWalker);
  await page.evaluate(installeerSpelerBot);
  return page;
}

const pct = (xs, p) => { if (!xs.length) return null; const s = xs.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p / 100 * s.length) - 1))]; };
const gem = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const f1 = x => x == null ? '-' : (Math.round(x * 10) / 10).toFixed(1);

function vatSamen(runs) {
  const regels = [];
  for (const held of HELDEN) {
    const rs = runs.filter(r => r.held === held);
    if (!rs.length) continue;
    const aan = rs.filter(r => r.aangekomen), dd = rs.filter(r => r.dood), ft = rs.filter(r => r.fout);
    const waar = {};
    dd.forEach(r => { const k = `A${r.dood.act} ${r.dood.type}${r.dood.type === 'baas' ? '' : ' r' + r.dood.rij}${r.dood.reden ? ' (' + r.dood.reden + ')' : ''}`; waar[k] = (waar[k] || 0) + 1; });
    const rel = aan.map(r => r.relikwieen.length);
    const gered = rs.map(r => r.gered || 0);
    const echt = rs.filter(r => r.aangekomenEcht).length, afg = rs.reduce((s, r) => s + ((r.afgedwongen || []).length), 0);
    regels.push(`${held}: ${rs.length} runs · aangekomen ${aan.length} (echt, zonder redding: ${echt}) · dood ${dd.length}${gered.some(x => x) ? ' · reddingen gem ' + f1(gem(gered)) : ''}${afg ? ' · afgedwongen gevechten ' + afg : ''}${dd.length ? ' (' + Object.entries(waar).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' x' + v).join(', ') + ')' : ''} · fout ${ft.length}`);
    if (aan.length) {
      regels.push(`   relikwieën p10/p50/p90 ${pct(rel, 10)}/${pct(rel, 50)}/${pct(rel, 90)} · dek ${f1(gem(aan.map(r => r.dekN)))} · upgrades ${f1(gem(aan.map(r => r.upgrades)))} · vloeken ${f1(gem(aan.map(r => r.vloeken)))}` +
        ` · hp ${f1(100 * gem(aan.map(r => r.hpPct)))} % (maxHp ${f1(gem(aan.map(r => r.maxHp)))}) · goud over ${f1(gem(aan.map(r => r.goud)))} · fakkel ${f1(gem(aan.map(r => r.fakkel)))}`);
    }
    const g = rs.reduce((s, r) => s + ((r.gevechten && r.gevechten.n) || 0), 0), rt = rs.reduce((s, r) => s + ((r.gevechten && r.gevechten.rondesTotaal) || 0), 0);
    regels.push(`   gevechten ${g} · rondes per gevecht ${f1(g ? rt / g : null)} · duur per run ${f1(gem(rs.filter(r => r.duurMs != null).map(r => r.duurMs / 1000)))} s`);
  }
  return regels;
}

async function main() {
  const t0 = Date.now();
  let browser = await chromium.launch({ headless: true });
  const fouten = [];
  const paginas = [];
  for (let i = 0; i < Math.max(1, WERKERS); i++) paginas.push(await maakPagina(browser, fouten));
  const versie = (fs.readFileSync(path.join(WORTEL, 'sw.js'), 'utf8').match(/const CACHE = '([^']+)'/) || [])[1] || '?';
  const onbekend = await paginas[0].evaluate(ids => ids.filter(id => !RELIKWIEEN[id]), SCHRIJN);
  if (onbekend.length) throw new Error('onbekende relikwieën in MEET_SCHRIJN: ' + onbekend.join(', '));
  const helOnb = await paginas[0].evaluate(ids => ids.filter(id => !SPELERS[id]), HELDEN);
  if (helOnb.length) throw new Error('onbekende helden in MEET_HELDEN: ' + helOnb.join(', '));
  const solo = await paginas[0].evaluate(() => typeof metgezellenAan === 'function' ? !metgezellenAan() : true);
  const seeds = []; for (let i = 0; i < N; i++) seeds.push('A23-' + (SEEDBASE + i));
  const jobs = []; for (const held of HELDEN) for (const seed of seeds) jobs.push({ held, seed });
  console.log(`RUN-WALKER '${LABEL}' · ${versie} · ${jobs.length} runs (${HELDEN.join('/')} x ${N}) · ${WERKERS} werkers · seeds ${seeds[0]}..${seeds[seeds.length - 1]}` +
    ` · profiel ${PROFIEL} · pad ${PAD} · drank ${DRANK}${BOTALG ? '' : ' · bot ZONDER algemene regels'}${BOTRACE ? '' : ' · bot ZONDER wedloop'} · winkel ${WINKEL} · event ${EVENT} · vervloekt ${VERVLOEKT ? 'nemen' : 'laten'} · schrijn ${SCHRIJN.join('+') || '-'} · tafel ${TAFEL}${POOK ? ' · pook < ' + POOK : ''}${OLIE ? ' · olie < ' + OLIE : ''}${REDDING ? ' · REDDING ' + REDDING + ' (de dood = opstaan)' : ''}${SCHADE !== 1 ? ' · SCHADE x' + SCHADE + ' onderweg' : ''} · ${solo ? 'SOLO' : 'LET OP: metgezellen AAN'}`);
  const cfgVan = job => ({ held: job.held, seed: job.seed, profiel: PROFIEL, pad: PAD, schrijn: SCHRIJN, vervloekt: VERVLOEKT, winkel: WINKEL, event: EVENT, pook: POOK, olie: OLIE, dranken: DRANK, algemeen: BOTALG, race: BOTRACE, botKent: BOT_KENT, redding: REDDING, schade: SCHADE, botlog: BOTLOG,
    deadlineMs: Math.max(30, RUN_S - 15) * 1000, stilMs: STIL_S * 1000, maxNodes: MAXNODES });
  const runs = [];
  let volgende = 0, klaar = 0, herstarts = 0, herstart = null;
  const zorgBrowser = async () => {
    if (browser.isConnected()) return;
    if (!herstart) herstart = (async () => { herstarts++; try { browser = await chromium.launch({ headless: true }); } finally { herstart = null; } })();
    await herstart;
  };
  const nieuwePagina = async oud => {
    try { await oud.context().close(); } catch (e) {}
    for (let p = 0; p < 4; p++) {
      try { await zorgBrowser(); return await maakPagina(browser, fouten); } catch (e) { await new Promise(r => setTimeout(r, 1500)); }
    }
    throw new Error('geen nieuwe pagina te maken');
  };
  await Promise.all(paginas.map(async (page0) => {
    let page = page0;
    while (volgende < jobs.length) {
      const job = jobs[volgende++];
      const kaal = fout => ({ seed: job.seed, held: job.held, profiel: PROFIEL, pad: PAD, schrijn: SCHRIJN, aangekomen: false, aangekomenEcht: false, dood: null, fout, tijdlijn: [] });
      let r = null;
      for (let poging = 0; poging < 3 && !r; poging++) {
        let timer = null;
        try {
          r = await Promise.race([
            page.evaluate(speelRun, cfgVan(job)),
            new Promise((_, nee) => { timer = setTimeout(() => nee(new Error('HARDE-TIMEOUT')), (RUN_S + 30) * 1000); })
          ]);
        } catch (e) {
          const msg = String((e && e.message) || e);
          page = await nieuwePagina(page);
          if (/HARDE-TIMEOUT/.test(msg)) r = kaal('harde time-out (' + (RUN_S + 30) + ' s): de pagina hing; pagina herladen');
          else if (/closed|crash|Target|disconnected/i.test(msg)) continue;
          else r = kaal('evaluate: ' + msg.slice(0, 300));
        } finally { clearTimeout(timer); }
      }
      if (!r) r = kaal('evaluate: browser bleef sterven');
      /* na een fout: een verse pagina, zodat een half afgehandeld scherm de volgende run niet besmet */
      if (r.fout && !/harde time-out|evaluate/.test(r.fout)) page = await nieuwePagina(page);
      runs.push(r);
      if (r.fout) console.log(`  FOUT ${job.held} ${job.seed}: ${String(r.fout).split('\n')[0]}`);
      if (++klaar % 5 === 0 || klaar === jobs.length) console.log(`  ${klaar}/${jobs.length} runs (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
  }));
  if (herstarts) console.log(`  (browser ${herstarts}x herstart)`);
  try { await browser.close(); } catch (e) {}
  const volg = new Map(jobs.map((j, i) => [j.held + '|' + j.seed, i]));
  runs.sort((a, b) => volg.get(a.held + '|' + a.seed) - volg.get(b.held + '|' + b.seed));
  const uitPad = process.env.MEET_UIT || path.join(WORTEL, '.claude', 'notities', 'baas-meting', 'uit', LABEL + '.json');
  fs.mkdirSync(path.dirname(uitPad), { recursive: true });
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => /^MEET_/.test(k)));
  const meta = { label: LABEL, versie, datum: new Date().toISOString(), N, helden: HELDEN, profiel: PROFIEL, pad: PAD, schrijn: SCHRIJN, vervloekt: VERVLOEKT, winkel: WINKEL, event: EVENT, tafel: TAFEL, pook: POOK, olie: OLIE, drank: DRANK, botAlgemeen: BOTALG, botRace: BOTRACE, redding: REDDING, schade: SCHADE,
    seeds, seedbase: SEEDBASE, solo, env, duurS: Math.round((Date.now() - t0) / 1000), paginafouten: [...new Set(fouten)].slice(0, 20) };
  fs.writeFileSync(uitPad, JSON.stringify({ meta, runs }, null, 1));
  console.log(`klaar in ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${uitPad}`);
  vatSamen(runs).forEach(r => console.log(r));
  const nFout = runs.filter(r => r.fout).length;
  console.log(`totaal: ${runs.length} runs, ${runs.filter(r => r.aangekomen).length} aangekomen, ${runs.filter(r => r.dood).length} dood, ${nFout} fout, ${[...new Set(fouten)].length} verschillende paginafouten`);
  if (fouten.length) console.log('PAGINAFOUTEN:', [...new Set(fouten)].slice(0, 8));
  if (nFout) process.exitCode = 2;
}
main().catch(e => { console.error(e); process.exit(1); });
