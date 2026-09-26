/* HET PROCES — meetharnas v4 (Finale B4 stap 1, 26 sep 2026: het eerlijke instrument van
   F_finale_afwerkplan.md §3 en §7 stap 1; v3 = meetronde 23 sep, cache v127).
   Draait de ECHTE spelcode headless (Playwright) tegen de Act 3-eindbaas de DICKtator, met een
   greedy speler-AI in twee beleidsregels, voor alle drie de helden in drie sterktes, en meet
   per scène (sinds de finale-herbouw, sep 2026: I Aanklacht · II Factuur · III Tirade ·
   IV Mandaat; het veld heet om compatibiliteitsredenen nog 'bedrijf'/'bd'):
   rondes, binnengekregen schade per bron, nulschade-rondes, sterfscène, decreten, en de
   schadeverhouding. Optioneel dezelfde gemiddelde builds tegen de Act 1- en Act 2-baas.
   HET DECREET ALS KEUZE: window.__dickKeuze(A, B) beslist voor de bot welke van de twee
   aangezegde kaarten valt; standaard schrapt hij de kaart met de laagste (zeldzaamheid, kost).

   SLACHTBLOK-KAARTEN (R3, 24 sep 2026): een echte speler komt aan met gesmede kaarten, dus
   de 'gemiddeld'- en 'sterk'-dekken dragen er nu ook (veld `smeed` per build):
   - gemiddeld: ÉÉN altaarkaart (het Slachtblok vóór de troonzaal, modus 'altaar'): twee
     kaarten uit het dek geofferd (VERNIETIGD), uit hun offerwaarde (offerWaarde uit game.js:
     zeldzaamheid + 1 als opgewaardeerd; kost 2 = +2, kost 0 = -3) één kaart met max 2
     effecten (SMEED_MODULES). Netto: het dek wordt 1 kaart kleiner.
   - sterk: dezelfde altaarkaart met een iets rijker offer, plus één ERFSTUK uit het Schrijn
     (gesmeed bij een eerdere dood, 'gesmeed_codex_<held>', vervangt een startkaart).
   Het budget wordt IN DE PAGINA nagerekend met de echte offerWaarde; een spec die er boven
   gaat, laat de job falen (geen verzonnen kaarten). De vuurbonus (35% kans) blijft weg:
   de meting moet deterministisch blijven. De bot waardeert gesmede kaarten per module
   (de module-som in waarde()). 'matig' blijft zonder Slachtblok (wie zwak aankomt, smeedt zelden goed).
   Extra uitvoer: `doodsBron` (de bron van de laatste klap) en `haaldeIV`.

   HET EERLIJKE INSTRUMENT (v4; de aanvullingen van onderzoeker E en planner F, afwerkplan §3):
   1. SOLO is de standaard (DE NISSEN DICHT, METGEZELLEN_AAN = false): geen enkele build draagt
      een metgezel, en ELK gevecht toetst na startGevecht dat g.metgezel leeg is (de solo-assert;
      een afwijking = een foute job én exitcode 3). MEET_METGEZEL=drops is alleen de terugkeer:
      de pagina zet ze dan aan via devMetgezellen(true) en elke build krijgt die metgezel.
   2. De bot KENT DE REGEL die hij meet: ruimte(baas) = wat er deze ronde nog echt kan vallen
      (0 als hij geschorst is, hp - vloer onder DE ZITTING LOOPT, hp - drempel bij het scèneslot,
      het open deel van een plafond). Een klap op de baas telt hoogstens voor die ruimte; is de
      ruimte kleiner dan de helft van de klap, dan gaat hij naar het hof. Nachtschade verbruikt
      zijn gif niet meer in de leegte. Geldt 'het hof vangt de klap' (DICK.hofVangt in de
      spelcode, of de probe MEET_SPILL=1), dan telt de bot het overschot mee op de vanger en
      slaat hij gewoon op de baas als dat meer oplevert. Leest de regels uit de spelcode
      (dicktatorVloer, dicktatorDrempel, dicktatorOnschendbaarOpen zodra die bestaat) en valt
      pas op de harnashaken terug als de spelcode ze niet kent. MEET_BOTBLIND=1 = de oude,
      gretige bot (wat kost de regel aan wie hem niet ziet).
   3. Weggeknipte schade apart: slotWeg (scèneslot + vloer + plafond, per scène in slotWegBd),
      capWeg (alleen het plafond), slotNul (klappen die volledig in de leegte vielen), spill
      (wat het hof ving). uitBaas/kaartBaas tellen de HP die ECHT viel (na het slot).
   4. Per kaart en per soort: kaartBaas/kaartHof, baasSoort (direct / gif/overig / doornen).
   5. Een kleine POPULATIE per cel (MEET_POP=1, op MEET_POP_ST = gemiddeld,sterk): naast de
      build ('basis') drie varianten op dezelfde seeds: 'minDef' (het defensieve run-relikwie
      eruit; heeft de build er geen, dan de heeldrank), 'plusDef' (+ Mosamulet, of + Anker als
      hij die al heeft) en 'laster' (Laster 0 <-> 1). Veld `pv` per gevecht.
   6. 'STERK' IS PER HELD VERGELIJKBAAR (B2): de sterk-builds volgen één norm (zie STERK_NORM
      hieronder); de oude, ongelijke sterk-builds blijven meetbaar als 'sterk_oud'.
   7. Het BREEKPUNT per build (MEET_BREEK='0.7,0.8,...'): dezelfde basisbuilds op een reeks
      drukfactoren (alle klappen van baas en hof x factor, afgerond, per gevecht gezet); de
      analyse (breekpunt.py) interpoleert de factor waarop elke build 50 % haalt.
   8. Fakkel (MEET_FAKKEL=N), de Drempeltafel (MEET_TAFEL), elasticiteit (MEET_DMGX), ablatie
      (MEET_ABL), verse seeds (MEET_SEEDBASE), veerkracht (een gestorven browser herstart en de
      job draait opnieuw) en bossHp per ronde in log[] (voor stilstand.py).
   Verworpen probe, bewust NIET meer in dit harnas: MEET_LEK ('de Factuur lekt blok', planner F
   §4.5: helpt sterk niet, duwt het Factuur-aandeel naar 48-69 %). Bron: F_finale\harnas.

   - GEEN dev-server. Host localhost:4173, maar ELK verzoek wordt door Playwright vanaf SCHIJF
     bediend met route.fulfill (patroon uit tools/nissen_acceptatie.js) en al het andere wordt
     afgebroken: er gaat nooit iets naar een echte server op die poort. Eigen profiel per
     context (geen gedeelde opslag met Thomas' browser), service workers geblokkeerd.
   - DICK.tempo = 0.02 en window.slaap = () => Promise.resolve() maken de beats snel.
   - Wijzigt geen spelcode: alles wat hier gepatcht wordt, leeft alleen in de headless pagina.

   Gebruik (Git Bash, vanuit een map met node_modules/playwright):
     node tools/baas-meting/dick_meting.js [seeds=12] [label=meting] [opties]
   opties (env):
     MEET_HELDEN=slachter,gifmagier,thoverk   MEET_STERKTES=sterk,gemiddeld,matig (ook: sterk_oud)
     MEET_BELEID=gebalanceerd,bewust          MEET_REF=0 (Act 1/2-referentie overslaan)
     MEET_85=0 (de 85%-aankomstvariant van 'gemiddeld' overslaan)
     MEET_WERKERS=4 (parallelle pagina's)     SLAYIT_PLAYWRIGHT=<pad naar node_modules/playwright>
     MEET_SEEDBASE=10000 (verse seeds; standaard 1000 = de oude reeks van 23 sep)
     MEET_WORTEL=<map> (de spelcode; standaard deze werkboom)
     MEET_DICK='{"hp":300,"FACTUUR":{"tarief2":2}}'  (verkenning: DICK-knoppen in de pagina
       overschrijven, diep samengevoegd; hp gaat ook naar VIJANDEN.de_dicktator. De eindmeting
       draait ZONDER deze optie, op de waarden in game.js.)
     MEET_POP=1 [MEET_POP_ST=gemiddeld,sterk] [MEET_POP_VAR=minDef,plusDef,laster]   (populatie)
     MEET_BREEK=0.7,0.8,0.9,1,1.1 [MEET_BREEK_ST=gemiddeld,sterk]   (alleen de breekpuntzwaai)
     MEET_DMGX=1.05 (alle klappen x factor)   MEET_FAKKEL=35   MEET_BOTBLIND=1
     MEET_CAP=45 of '{"2":45,...}' (verkenning: plafond per ronde)   MEET_SPILL=1 (probe: het hof vangt)
     MEET_TAFEL=kroon,zeldzaam,verlies [MEET_TAFEL_ST=gemiddeld,sterk]   MEET_ABL='{"thoverk/sterk":{...}}'
     MEET_METGEZEL=drops (alleen de terugkeer van de metgezellen)
   Uitvoer: <werkboom>/.claude/notities/baas-meting/uit/<label>.json (gitignored, niet gedeployd;
   of MEET_UIT=<pad>) + een samenvatting op de console. Analyse: python tools/baas-meting/doeltabel.py
   <json> (alle doelen in één tabel), populatie.py, breekpunt.py, oorzaak.py, stilstand.py,
   kaarten.py, pool_winst.py, vat_samen.py; mdtabel.py zet dezelfde doeltabel als markdown in
   .claude/notities/baas-meting/meting_finale_R3.md (de voor/na-tabellen van R3). */
const fs = require('fs'), path = require('path');
function laadPlaywright() {
  const kandidaten = [process.env.SLAYIT_PLAYWRIGHT, 'playwright',
    'C:\\Users\\THOMAS~1\\AppData\\Local\\Temp\\claude\\C--Users-Thomas-Aelbrecht-Desktop-Workspace-SLAY-IT\\d5a4f6f7-f7ad-4aad-921d-259730d2111c\\scratchpad\\node_modules\\playwright'].filter(Boolean);
  for (const k of kandidaten) { try { return require(k); } catch (e) { /* volgende */ } }
  throw new Error('Playwright niet gevonden: zet SLAYIT_PLAYWRIGHT=<pad naar node_modules/playwright>');
}
const { chromium } = laadPlaywright();
/* de spelcode: standaard deze werkboom (tools/baas-meting/ → twee mappen omhoog); MEET_WORTEL
   wijst naar een andere kopie (bv. een git archive van een kandidaat). Host localhost:4173, maar
   ALLES via route.fulfill vanaf schijf: er draait geen server, en de Playwright-context is een
   eigen profiel (geen gedeelde opslag met Thomas' browser). */
const WORTEL = process.env.MEET_WORTEL ? path.resolve(process.env.MEET_WORTEL) : path.resolve(__dirname, '..', '..');
const HOST = 'localhost:4173';
const BASIS = 'http://' + HOST + '/';
const N = parseInt(process.argv[2] || '12', 10);
const LABEL = process.argv[3] || 'meting';
const lijst = (env, std) => (process.env[env] ? process.env[env].split(',').map(s => s.trim()).filter(Boolean) : std);
const HELDEN = lijst('MEET_HELDEN', ['slachter', 'gifmagier', 'thoverk']);
const STERKTES = lijst('MEET_STERKTES', ['sterk', 'gemiddeld', 'matig']);
const BELEID = lijst('MEET_BELEID', ['gebalanceerd', 'bewust']);
const REF = process.env.MEET_REF !== '0';
const WERKERS = parseInt(process.env.MEET_WERKERS || '4', 10);
const SEEDBASE = parseInt(process.env.MEET_SEEDBASE || '1000', 10);
/* DE NISSEN DICHT (M-plan §6): de metgezellen zijn geparkeerd, dus SOLO is de standaard en elk
   gevecht toetst dat (g.metgezel na startGevecht). MEET_METGEZEL=drops is alleen voor de TERUGKEER:
   de pagina zet ze dan aan via devMetgezellen(true) en elke build krijgt die metgezel. (De oude
   vorm MEET_METGEZEL=1 van planner F = 'drops'.) */
const MEET_METGEZEL = process.env.MEET_METGEZEL === '1' ? 'drops' : (process.env.MEET_METGEZEL || '');
const metMetgezel = b => Object.assign({}, b, { metgezel: MEET_METGEZEL || null });
/* DE POPULATIE per cel (afwerkplan §3 'de klif zit deels in de opzet'): één vaste build tegen een
   deterministische baas geeft een bijna vaste uitkomst; drie buren op dezelfde seeds verzachten dat. */
const POP = process.env.MEET_POP === '1';
const POP_ST = lijst('MEET_POP_ST', ['gemiddeld', 'sterk']);
const POP_VAR = lijst('MEET_POP_VAR', ['minDef', 'plusDef', 'laster']);
/* DE BREEKPUNTZWAAI: alleen de basisbuilds, op een reeks drukfactoren (MEET_DMGX per gevecht) */
const BREEK = lijst('MEET_BREEK', []).map(parseFloat).filter(x => x > 0);
const BREEK_ST = lijst('MEET_BREEK_ST', ['gemiddeld', 'sterk']);
const DMGX = process.env.MEET_DMGX ? parseFloat(process.env.MEET_DMGX) : 1;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };

/* ============================================================
   DE BUILDS — aankomstdekken voor het EINDE van Act 3.
   'dev:<id>' = exact de bestaande DEV_BUILDS uit game.js (in de pagina opgehaald), zodat
   slachter/gemiddeld en gifmagier/sterk vergelijkbaar blijven met de oudere metingen.
   ============================================================ */
/* STERK_NORM (B2, 26 sep 2026): 'sterk' betekent per held HETZELFDE bouwbudget, zodat een
   verschil tussen de sterke helden iets zegt over de held en niet over de build. Vóór deze norm
   droeg sterk-Kol drie defensieve relikwieën en sterk-Sla/-Gif geen, had sterk-Gif 9 upgrades
   tegen 13, en groeide de max-HP met +22 / +12 / +18 op de basis (afwerkplan §3 en §5).
   De norm:
   - max-HP = de basis-HP van de held (SPELERS[held].hp) + 18   (Sla 88, Gif 80, Kol 84);
   - 6 relikwieën: het startrelikwie + ÉÉN defensief run-relikwie, voor iedereen hetzelfde
     (Mosamulet) + vier niet-defensieve (Kracht, schade of held-synergie; het Stempelkussen);
   - 22 kaarten met 13 upgrades, laster 0, één heeldrank, één altaarkaart + één erfstuk.
   Sla = de oude sterke Slachter met Mosamulet i.p.v. de Oorlogsbanier (dubbele +1 Kracht) en
   88 HP i.p.v. 92. Gif = gif_opt met Mosamulet i.p.v. de Martelaarskroon (+4 Blok per
   getrokken vloek; dood gewicht met laster 0), vier upgrades erbij (Gifflits, Gifpamflet,
   Sluiproute, Verdediging) en 80 HP i.p.v. 74. Kol = de oude sterke Kolendruïde (hij voldeed al).
   De oude builds blijven meetbaar als 'sterk_oud' (brug naar de metingen van E en F).
   buildVan() toetst de norm en weigert een 'sterk'-build die ervan afwijkt. */
const STARTREL = { slachter: 'brandend_bloed', gifmagier: 'slangenamulet', thoverk: 'houten_been' };
/* defensief = verkleint de schade die je krijgt of geeft je HP/Blok in het gevecht */
const DEF_RELIKWIEEN = ['mosamulet', 'anker', 'warme_mantel', 'martelaarskroon', 'dossierklem', 'indexkaart', 'was_zegel', 'hartsteen', 'carbon_afdruk', 'feniksveer', 'verlopen_contract', 'houten_been'];
const STERK_NORM = { hpPlus: 18, relikwieen: 6, defensief: ['mosamulet'], kaarten: 22, upgrades: [13, 13], laster: 0 };
const BUILDS = {
  slachter: {
    sterk: {
      held: 'slachter', hp: 88, label: 'Slachter sterk-norm (22 kaarten, 6 relikwieën, Mosamulet)',
      relikwieen: ['brandend_bloed', 'mosamulet', 'krachtsteen', 'stalen_vuist', 'brandmerkijzer', 'stempelkussen'],
      dranken: ['heeldrank'], laster: 0, metgezel: null,
      dek: [['slag', 1], ['slag', 1], ['verdediging', 1], ['verdediging', 1], ['verdediging', 0],
            ['knal', 1], ['zware_klap', 1], ['zware_klap', 0], ['uithaal', 1], ['executie', 1], ['afgekeurd', 1],
            ['ontslagbrief', 1], ['in_drievoud', 1], ['originele_handtekening', 0], ['genadeslag', 0],
            ['vlammende_hartstocht', 0], ['het_hakblok', 1], ['metaalhuid', 0], ['schildmuur', 1], ['bolwerk', 0],
            ['tribunaal', 0], ['martelaarsbloed', 0]]
    },
    sterk_oud: {
      held: 'slachter', hp: 92, label: 'Slachter sterk (oud, vóór de norm; 22 kaarten, 6 relikwieën)',
      relikwieen: ['brandend_bloed', 'krachtsteen', 'oorlogsbanier', 'stalen_vuist', 'brandmerkijzer', 'stempelkussen'],
      dranken: ['heeldrank'], laster: 0, metgezel: null,   /* solo: metgezellen geparkeerd (DE NISSEN DICHT) */
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
    sterk: {
      held: 'gifmagier', hp: 80, label: 'Gifmagiër sterk-norm (gif_opt + Mosamulet, 13 upgrades)',
      relikwieen: ['slangenamulet', 'mosamulet', 'smaragden_ring', 'inktpot', 'oorlogsbanier', 'stempelkussen'],
      dranken: ['heeldrank'], laster: 0, metgezel: null,
      dek: [['prik', 0], ['prik', 1], ['dodelijke_kus', 1], ['gifflits', 1], ['gifflits', 1], ['gifpamflet', 1], ['gifpamflet', 1],
            ['inktklerk_steek', 0], ['snelle_steek', 1], ['slangenbeet', 0], ['giftand', 1], ['katalyse', 1], ['nachtschade', 0],
            ['karaktermoord', 0], ['de_gifbeker', 0], ['lastercampagne', 0], ['verlammend_gif', 0],
            ['sluiproute', 1], ['sluiproute', 1], ['verdediging', 1], ['verdediging', 1], ['verdediging', 0]]
    },
    sterk_oud: 'dev:gif_opt',
    gemiddeld: {
      held: 'gifmagier', hp: 72, label: 'Gifmagiër gemiddeld (22 kaarten, 4 relikwieën)',
      relikwieen: ['slangenamulet', 'smaragden_ring', 'oorlogsbanier', 'stempelkussen'],
      dranken: ['heeldrank'], laster: 1, metgezel: null,   /* solo: metgezellen geparkeerd (DE NISSEN DICHT) */
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
      held: 'thoverk', hp: 84, label: 'Kolendruïde sterk-norm (22 kaarten, 6 relikwieën, Mosamulet)',
      relikwieen: ['houten_been', 'bronzen_schub', 'krachtsteen', 'oorlogsbanier', 'stempelkussen', 'mosamulet'],
      dranken: ['heeldrank'], laster: 0, metgezel: null,
      dek: [['takkenslag', 1], ['takkenslag', 1], ['verdediging', 1], ['verdediging', 1], ['verdediging', 0],
            ['vonkenbeet', 1], ['wurgwortels', 1], ['sporenstoot', 1], ['doorslag_doornen', 1], ['perkamentslag', 1],
            ['het_origineel_kaart', 0], ['doornmantel', 1], ['duivelspact', 0], ['kolenstempel', 0], ['bastvel', 1], ['bastvel', 0],
            ['eikenhuid', 0], ['tegenvuur', 1], ['asregen', 1], ['knalsigaar', 0], ['wortelgreep', 0], ['stoofgeur', 0]]
    },
    sterk_oud: 'sterk',   /* de sterke Kolendruïde voldeed al aan de norm: dezelfde build */
    gemiddeld: {
      held: 'thoverk', hp: 80, label: 'Kolendruïde gemiddeld (22 kaarten, 5 relikwieën)',
      relikwieen: ['houten_been', 'bronzen_schub', 'oorlogsbanier', 'stempelkussen', 'anker'],
      dranken: ['heeldrank'], laster: 1, metgezel: null,   /* solo: metgezellen geparkeerd (DE NISSEN DICHT) */
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
/* ---- de Slachtblok-kaarten per build (zie de kop). offers = kaart-ids uit het dek (het
   eerste exemplaar met die upgrade-stand valt weg); vervangt = de startkaart die een erfstuk
   verdringt. modules in PUNTEN (zoals het smeedscherm), niet in effectwaarde. ---- */
const SMEED = {
  slachter: {
    gemiddeld: [{ naam: 'Het Vonnisbijl', kost: 1, icoon: '🪓', offers: [['slag', 1], ['uithaal', 0]], modules: [{ m: 'schade', p: 3 }, { m: 'kwetsbaar', p: 1 }] }],
    sterk: [{ naam: 'Het Vonnisbijl', kost: 1, icoon: '🪓', offers: [['slag', 1], ['afgekeurd', 1]], modules: [{ m: 'schade', p: 3 }, { m: 'woede', p: 2 }] },
            { naam: 'Het Erfschild', kost: 1, icoon: '🛡️', erfstuk: true, vervangt: ['verdediging', 0], modules: [{ m: 'schade', p: 2 }, { m: 'blok', p: 3 }] }]
  },
  gifmagier: {
    gemiddeld: [{ naam: 'De Giftige Pen', kost: 1, icoon: '☠️', offers: [['prik', 1], ['naaperij', 0]], modules: [{ m: 'gif', p: 2 }, { m: 'blok', p: 2 }] }],
    sterk: [{ naam: 'De Giftige Pen', kost: 2, icoon: '☠️', offers: [['prik', 1], ['lastercampagne', 0]], modules: [{ m: 'miasma', p: 3 }, { m: 'gif', p: 3 }] },
            { naam: 'Het Erfgif', kost: 1, icoon: '🌑', erfstuk: true, vervangt: ['verdediging', 0], modules: [{ m: 'gif', p: 2 }, { m: 'blok', p: 3 }] }]
  },
  thoverk: {
    gemiddeld: [{ naam: 'De Doornentak', kost: 1, icoon: '🌹', offers: [['takkenslag', 1], ['asregen', 0]], modules: [{ m: 'schade', p: 2 }, { m: 'doornen', p: 2 }] }],
    sterk: [{ naam: 'De Doornentak', kost: 1, icoon: '🌹', offers: [['takkenslag', 1], ['asregen', 1]], modules: [{ m: 'schade', p: 3 }, { m: 'doornen', p: 2 }] },
            { naam: 'De Erfbast', kost: 1, icoon: '🌱', erfstuk: true, vervangt: ['verdediging', 0], modules: [{ m: 'groei', p: 2 }, { m: 'blok', p: 3 }] }]
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
  const fakkel = (process.env.MEET_FAKKEL != null && process.env.MEET_FAKKEL !== '') ? parseInt(process.env.MEET_FAKKEL, 10) : null;
  const seed = i => 'M23-' + (SEEDBASE + i);
  /* DE BREEKPUNTZWAAI (MEET_BREEK): alleen de basisbuilds op 62 %, per drukfactor; niets anders */
  if (BREEK.length) {
    for (const held of HELDEN) for (const st of STERKTES.filter(s => BREEK_ST.includes(s))) for (const beleid of BELEID) for (const f of BREEK) for (let i = 0; i < N; i++) {
      jobs.push({ cel: `${held}/${st}/${beleid}~x${f}`, held, st, pv: 'basis', dmgx: f, beleid, hpPct: 0.62, baas: 'de_dicktator', seed: seed(i), fakkel });
    }
    return jobs;
  }
  for (const held of HELDEN) for (const st of STERKTES) for (const beleid of BELEID) {
    const varianten = [{ hpPct: 0.62, tag: '' }];
    if (st === 'gemiddeld' && process.env.MEET_85 !== '0') varianten.push({ hpPct: 0.85, tag: '@85' });
    /* de populatie (MEET_POP=1): de buren van de build, alleen op 62 % en alleen op MEET_POP_ST */
    const pvs = ['basis'].concat(POP && POP_ST.includes(st) ? POP_VAR : []);
    for (const v of varianten) for (const pv of (v.tag ? ['basis'] : pvs)) for (let i = 0; i < N; i++) {
      jobs.push({ cel: `${held}/${st}${v.tag}/${beleid}${pv === 'basis' ? '' : '#' + pv}`, held, st, pv, dmgx: DMGX, beleid, hpPct: v.hpPct, baas: 'de_dicktator', seed: seed(i), fakkel });
    }
  }
  /* de referentie draait alleen 'gebalanceerd': 'bewust' verschilt enkel in Proces-specifieke regels */
  if (REF) for (const held of HELDEN) for (const baas of ['de_erfprins', 'slijmkoning']) for (const beleid of ['gebalanceerd']) for (let i = 0; i < N; i++) {
    jobs.push({ cel: `REF-${baas}/${held}/gemiddeld/${beleid}`, held, st: 'gemiddeld', pv: 'basis', dmgx: 1, beleid, hpPct: 0.62, baas, seed: seed(i) });
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
    return 4;   /* IV · HET MANDAAT (de herverkiezing is een scharnier zonder eigen beurt) */
  };
  /* het bot-beleid voor HET DECREET ALS KEUZE: schrap de kaart met de laagste (zeldzaamheid,
     kost). Een meting kan dit vervangen door een eigen functie vóór eenGevecht. */
  const zRang = c => ({ basis: 0, start: 0, gewoon: 1, ongewoon: 2, gesmeed: 2, zeldzaam: 3, episch: 4 })[kdef(c).zeld] ?? 0;
  window.__dickKeuze = (A, B) => {
    const ra = [zRang(A), kval(A, 'kost') || 0], rb = [zRang(B), kval(B, 'kost') || 0];
    const aLager = ra[0] !== rb[0] ? ra[0] < rb[0] : ra[1] <= rb[1];
    return aLager ? A : B;
  };
  const bronLabel = (v, it) => {
    if (!it) return 'overig-vijand';
    if (v.id === 'de_dicktator') {
      const m = { 'DE AANZEGGING': 'Aanzegging', 'VONNISSLAG': 'Vonnisslag', 'HET VONNIS': 'Vonnis', 'EIGENHANDIG VONNIS': 'Eigenhandig vonnis', 'KARAKTERMOORD': 'Karaktermoord', 'EXECUTIE': 'Executie', 'DE FACTUUR': 'Factuur (baas zelf)', 'DONDERREDE': 'Donderrede', 'HET ONTSLAG': 'Ontslag' };
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
    /* [planner F] doornen apart van gif tellen: de kaats in doeSchade gaat naar de aanvaller */
    const oudD = window.__doornDoel;
    if (doel && doel.isSpeler && bron && !bron.isSpeler && !bron.isMetgezel && (doel.status.doornen || 0) > 0) window.__doornDoel = bron;
    try { return oDS(doel, dmg, bron); } finally { window.__doornDoel = oudD; }
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
        if (echt > 0 && S.hp - n <= 0 && !T.doodsBron) T.doodsBron = lab;   /* de laatste klap */
        T.inBd[bd] = (T.inBd[bd] || 0) + echt;
        if (lab !== 'zelf (eigen kaart)') T.rondeIn += echt;
      } else if (!doel.isMetgezel) {
        /* [planner F] de schade NA het scèneslot/de vloer/het plafond (review F7: vroeger telde dit
           de klap vóór het slot): HP vóór en na; een herverkiezing telt als de rest-HP */
        const voorHp = doel.hp, voorHerrezen = !!doel.herrezen;
        const r = oVH(doel, n, bron);
        const echt = (doel.herrezen && !voorHerrezen) ? Math.max(0, voorHp) : Math.max(0, voorHp - Math.max(0, doel.hp));
        const isBaas = VIJANDEN[doel.id] && VIJANDEN[doel.id].baas;
        if (isBaas) { T.uitBaas += echt; T.uitBd[bd] = (T.uitBd[bd] || 0) + echt; } else T.uitHof += echt;
        const soort = bron && bron.isSpeler ? 'direct' : (bron && bron.isMetgezel ? 'metgezel' : (window.__doornDoel && window.__doornDoel === doel ? 'doornen' : 'gif/overig'));
        T.uitSoort[soort] = (T.uitSoort[soort] || 0) + echt;
        if (isBaas) { T.baasSoort = T.baasSoort || {}; T.baasSoort[soort] = (T.baasSoort[soort] || 0) + echt; }
        /* [planner F] per kaart (de kaart die de bot op dat moment speelde), gif en doornen apart */
        const kk = soort === 'direct' ? (window.__kaartNu || 'direct-overig') : soort;
        const bak = isBaas ? T.kaartBaas : T.kaartHof;
        if (bak && echt > 0) bak[kk] = (bak[kk] || 0) + echt;
        return r;
      }
    }
    return oVH(doel, n, bron);
  };
  /* [onderzoeker E] hoeveel spelersschade gooit het sceneslot/de vloer weg? */
  const oSlot = window.dicktatorSlot;
  if (oSlot) window.dicktatorSlot = function (b, n) {
    const r = oSlot(b, n); const T = window.__T;
    if (T && n > r) { const bd = window.__bedrijf(); T.slotWeg = (T.slotWeg || 0) + (n - r); T.slotWegBd = T.slotWegBd || {}; T.slotWegBd[bd] = (T.slotWegBd[bd] || 0) + (n - r); T.slotHits = (T.slotHits || 0) + 1; if (r === 0) T.slotNul = (T.slotNul || 0) + 1; }
    return r;
  };
  const oDec = window.dicktatorDecreet;
  if (oDec) window.dicktatorDecreet = function (v) {
    const T = window.__T; const g = S.gevecht;
    const voor = S.dek.slice();
    const dossier = g && g.aangezegd ? [...g.aangezegd.values()].map(d => ({ id: d.id, naam: d.naam, sinds: Math.max(0, ((g.gespeeld && g.gespeeld[d.id]) || 0) - (d.start || 0)) })) : [];
    const bd = window.__bedrijf();
    /* sinds de finale is het decreet ASYNC (het wacht op de keuze): pas na de promise is de
       kaart echt weg */
    return Promise.resolve(oDec(v)).then(r => {
      if (T) {
        const weg = voor.filter(c => !S.dek.includes(c));
        weg.forEach(c => {
          const d = kdef(c);
          T.decreten.push({ id: c.id, naam: d.naam, kost: kval(c, 'kost'), zeld: d.zeld, up: !!c.up, bedrijf: bd, dossier, gekozen: dossier.some(x => x.sinds > 0), bewaarWens: T._bewaar || null });
        });
      }
      return r;
    });
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
  /* de DICK-waarden van DEZE job: de basis (spelcode + MEET_DICK) terug, dan zijn drukfactor */
  if (typeof window.__zetDick === 'function') window.__zetDick(job.dmgx || 1);
  nieuwSpel(build.held, job.seed);
  S.gevecht = null; S.act = bz.act; S.fakkel = (job.fakkel != null ? job.fakkel : fakkelMax()); S.pos = null; S.ascensie = 0; S.daily = false; S.dagwet = null;
  delete S.beloning; delete S.winkel; delete S.huidigEvent;
  S.maxHp = build.hp; S.hp = Math.round(build.hp * job.hpPct);
  S.relikwieen = build.relikwieen.slice();
  S.dek = build.dek.map(([id, up]) => { const c = nieuweKaart(id); c.up = !!up; return c; });
  S.dranken = (build.dranken || []).slice();
  for (let i = 0; i < (build.laster || 0); i++) S.dek.push(nieuweKaart('laster'));
  /* alleen via MEET_METGEZEL (terugkeer): de geparkeerde metgezellen eerst aanzetten, anders weigert geefMetgezel stil */
  if (build.metgezel && typeof metgezellenAan === 'function' && !metgezellenAan() && typeof devMetgezellen === 'function') devMetgezellen(true);
  S.metgezel = null;
  if (build.metgezel) { geefMetgezel(build.metgezel); if (S.metgezel) S.metgezel.hp = Math.max(1, Math.round(metgezelMaxHp(build.metgezel) * 0.6)); }
  /* ---- de Slachtblok-kaarten (zie de kop): budget nagerekend met de echte offerWaarde ---- */
  window.__smeedSpec = {};
  S.gesmeed = {};
  (build.smeed || []).forEach((sm, i) => {
    const neem = ([id, up]) => {
      const c = S.dek.find(x => x.id === id && !!x.up === !!up);
      if (!c) throw new Error('smeed: ' + id + (up ? '+' : '') + ' zit niet in het dek');
      S.dek = S.dek.filter(x => x !== c);
      return c;
    };
    const offers = (sm.offers || []).map(neem);
    if (sm.vervangt) neem(sm.vervangt);
    const budget = sm.erfstuk ? 5 : offers.reduce((t, c) => t + offerWaarde(c), 0) + (sm.kost === 2 ? 2 : 0) - (sm.kost === 0 ? 3 : 0);
    const besteed = sm.modules.reduce((t, m) => t + m.p, 0);
    if (besteed > budget || sm.modules.length > 2) throw new Error('smeed: ' + sm.naam + ' kost ' + besteed + ' punten, budget ' + budget);
    const id = sm.erfstuk ? 'gesmeed_codex_' + build.held : 'gesmeed_run_' + (900 + i);
    const spec = { naam: sm.naam, icoon: sm.icoon, kost: sm.kost, maker: build.held, modules: sm.modules.map(m => ({ m: m.m, p: m.p })), offers: offers.map(knaam), datum: 'meting' };
    registreerGesmeed(id, spec);
    if (!sm.erfstuk) S.gesmeed[id] = spec;
    window.__smeedSpec[id] = spec;
    S.dek.push(nieuweKaart(id));
  });
  /* [planner F] DE DREMPELTAFEL (v128, einde Act 1) als gevoeligheid: 'kroon' = sport II (de Kroon
     van Sintels, +1 Energie zolang de fakkel HELDER is, >= 60); 'zeldzaam:<id>' = de zeldzame
     kaart van sport I (in de code alleen bij de volle ladder, zie dtStop: de wand houdt de
     laagste sport); 'verlies' = een knal met kaartinzet: de bank neemt de kaart met de hoogste
     offerWaarde (dtBesteKaart), gesmede kaarten bestonden toen nog niet. */
  (build.tafel || []).forEach(t => {
    if (t === 'kroon' && !S.relikwieen.includes('kroon_van_sintels')) S.relikwieen.push('kroon_van_sintels');
    else if (t === 'verlies') {
      let best = null, bw = -1;
      S.dek.forEach(c => { if (/^gesmeed/.test(c.id) || kdef(c).type === 'vloek') return; const w = offerWaarde(c); if (w > bw) { bw = w; best = c; } });
      if (best) S.dek = S.dek.filter(x => x !== best);
    } else if (t.indexOf('zeldzaam:') === 0) S.dek.push(nieuweKaart(t.slice(9)));
  });
  S.kaart = genereerKaart();
  const hpStart = S.hp, dekStart = S.dek.length;
  const T = window.__T = { bron: {}, bronBd: {}, inBd: {}, uitBd: {}, uitBaas: 0, uitHof: 0, uitSoort: {}, rawIn: 0, geblokt: 0, metgezelVing: 0, decreten: [], rondeIn: 0, _zelf: false, _bewaar: null, kaartBaas: {}, kaartHof: {} };
  startGevecht([job.baas], 'baas', bz.rij);
  const g = S.gevecht;
  const gMetStart = g && g.metgezel ? g.metgezel.id : null;   /* DE NISSEN DICHT: solo wordt GEMETEN, niet aangenomen (M-plan §6) */
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
  /* [planner F] DE BOT KENT DE REGELS: hoeveel schade kan de baas deze ronde nog echt
     krijgen? Geschorst = 0; de vloer (minZetten) = hp - vloer; het scèneslot = hp - drempel
     (tot de drempel is vooruitgang, daarna weggegooid); het plafond (ONSCHENDBAAR) = wat er
     deze ronde nog open staat. MEET_BOTBLIND=1 zet dit uit (de oude, gretige bot van E). */
  const botBlind = !!window.__botBlind;
  const ruimte = x => {
    if (botBlind || !x || x.id !== 'de_dicktator' || x.dood) return Infinity;
    if (x._geschorst) return 0;
    let r = Infinity;
    const vl = (typeof dicktatorVloer === 'function') ? dicktatorVloer(x) : null;
    if (vl != null) r = Math.min(r, Math.max(0, x.hp - vl));
    const sc = (typeof dicktatorScene === 'function') ? dicktatorScene(x) : 3;
    if (!x.vorm2 && !x.herrezen && sc < 3 && typeof dicktatorDrempel === 'function') r = Math.min(r, Math.max(0, x.hp - dicktatorDrempel(x, sc + 1)));
    /* het plafond: uit de spelcode zodra de regel daar staat (afwerkplan §9B), anders de harnashaak */
    if (typeof dicktatorOnschendbaarOpen === 'function') r = Math.min(r, Math.max(0, dicktatorOnschendbaarOpen(x)));
    else if (typeof window.__capRuimte === 'function') r = Math.min(r, window.__capRuimte(x));
    return r;
  };
  /* HET HOF VANGT DE KLAP (afwerkplan §4.7/§9A): wat de regel van een klap op de baas wegknipt,
     valt op zijn eerste levende hoveling (van links naar rechts). Uit de spelcode (DICK.hofVangt)
     of uit de probe MEET_SPILL=1. De bot telt dat overschot mee; blind telt hij het niet. */
  const hofVangt = () => !botBlind && (!!(typeof DICK === 'object' && DICK && DICK.hofVangt) || !!window.__spillProbe);
  const vanger = () => g.vijanden.find(x => !x.dood && !isBaas(x) && x.hp > 0) || null;
  const spillW = over => {
    if (over <= 0 || !hofVangt()) return 0;
    const h = vanger(); if (!h) return 0;
    const echt = Math.min(over, h.hp);
    return echt * 0.8 + (over >= h.hp ? 6 : 0);
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
    /* HET DECREET ALS KEUZE (finale): speelde je er één van beide, dan kies je zelf (de bot
       schrapt via __dickKeuze de laagste); anders valt de duurste (gelijk -> B). 'veilig' =
       de kaart die de bot wil houden overleeft de zitting als hij niets meer doet. */
    const sh = sinds(houd), so = sinds(offer);
    const kh = kval(houdA ? ca : cb, 'kost') || 0, ko = kval(houdA ? cb : ca, 'kost') || 0;
    let veilig;
    if (sh + so > 0) veilig = true;
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
    /* [planner F] staat de baas (bijna) dicht - geschorst, op de vloer, op de drempel of aan
       zijn plafond - dan gaat een klap naar het hof in plaats van in de leegte */
    if (!isGif && ruimte(b) < Math.max(1, klap * 0.5)) {
      if (!hofVangt()) return h[0];
      /* onder 'het hof vangt': op de baas valt zijn ruimte en het overschot op de vanger; kies
         het doel dat het meest oplevert (een klap op de vanger zelf telt hetzelfde als de spill) */
      const rb = ruimte(b);
      const opBaas = Math.min(klap, rb) + spillW(klap - rb);
      const opHof = Math.min(klap, h[0].hp) * 0.8 + (klap >= h[0].hp ? 6 : 0);
      if (opHof > opBaas) return h[0];
    }
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
    const totGrens = b.vorm2 ? b.hp : Math.max(0, b.hp - ((b.fase || 1) >= 3 ? 0 : (typeof dicktatorDrempel === 'function' ? dicktatorDrempel(b, (b.fase || 1) + 1) : 0)));
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
      if (isBaas(x)) { const rb = ruimte(x); return Math.min(dm, rb) + spillW(dm - rb); }   /* wat in de leegte valt, is niets waard; wat het hof vangt wel */
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
    const smSpec = d.gesmeed ? (window.__smeedSpec || {})[c.id] : null;
    if (smSpec) {
      /* een gesmede kaart: de som van haar modules (zelfde waardering als de gewone kaarten) */
      for (const m of smSpec.modules) {
        const n = m.p * ((SMEED_MODULES[m.m] || { perPunt: 0 }).perPunt);
        if (m.m === 'schade') v += opDoel(hit(n));
        else if (m.m === 'gif') v += gw(n);
        else if (m.m === 'miasma') v += gwAlle(n);
        else if (m.m === 'zwak') v += zwakV(n);
        else if (m.m === 'kwetsbaar') v += kwV(n);
        else if (m.m === 'blok') v += blokV(n);
        else if (m.m === 'doornen') v += doornV(n);
        else if (m.m === 'woede') v += krachtV(n);
        else if (m.m === 'genees') v += heelV(n);
        else if (m.m === 'groei') v += heelV(n) + blokV(n);
        else if (m.m === 'trek') v += n * 4;
      }
    } else switch (c.id) {
      /* ---- Gifmagiër ---- */
      case 'nachtschade': { const dm = hit(gifNu * raw('maal'), t, -kr); v = opDoel(dm) - gifWaarde(gifNu, 0, R, isBaas(t)); if (t && isBaas(t) && Math.min(dm, ruimte(t)) >= t.hp) v = 999; break; }
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
      /* niet veilig = je speelde er nog geen: één van beide spelen koopt je de keuze */
      if (plan && !plan.veilig && (c.id === plan.houdId || c.id === plan.offerId)) {
        v += (boss() && boss().intent && boss().intent.type === 'decreet') ? 10 : 4;
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
        T._zelf = true; window.__kaartNu = c.id;
        try { await speelKaart(c, d.doel === 'vijand' ? doelwitVoor(c) : undefined); } finally { T._zelf = false; window.__kaartNu = null; }
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
    cel: job.cel, seed: job.seed, held: build.held, st: job.st, pv: job.pv || 'basis', dmgx: job.dmgx || 1, beleid, baas: job.baas, hpPct: job.hpPct,
    gMet: gMetStart, spillBron: typeof DICK === 'object' && DICK && DICK.hofVangt ? 'spelcode' : (window.__spillProbe ? 'probe' : null),
    maxHp: S.maxHp, hpStart, fout, gewonnen, dood, timeout: !gewonnen && !dood, rondes: ronde, hpOver: S.hp,
    sterfBedrijf: dood ? (rondes.length ? rondes[rondes.length - 1].bd : window.__bedrijf()) : null,
    eindBedrijf: window.__bedrijf(), bossHpOver: b ? Math.max(0, b.hp) : null,
    bron: T.bron, bronBd: T.bronBd, inBd: T.inBd, uitBd: T.uitBd, uitBaas: T.uitBaas, uitHof: T.uitHof, uitSoort: T.uitSoort,
    rawIn: T.rawIn, geblokt: T.geblokt, metgezelVing: T.metgezelVing, drank: T.drank || 0, offerRonde: T.offer || null,
    dranken: (build.dranken || []).length, laster: build.laster || 0,
    decreten: T.decreten, dekVerlies: T.decreten.length, lasters: b ? (b.lasters || 0) : 0,   /* de Laster van DE VACATURE landt in g.trek, niet in S.dek */
    doodsBron: dood ? (T.doodsBron || null) : null, haaldeIV: !!(b && b.herrezen), gesmeed: (build.smeed || []).map(x => x.naam),
    kiezers: b && b._kiezers != null ? b._kiezers : null, kracht: b ? ((b.status && b.status.kracht) || 0) : 0, herrezen: !!(b && b.herrezen),
    log: rondes, slotWeg: T.slotWeg || 0, slotWegBd: T.slotWegBd || {}, slotHits: T.slotHits || 0, slotNul: T.slotNul || 0,
    capWeg: T.capWeg || 0, capWegBd: T.capWegBd || {}, capHits: T.capHits || 0, spill: T.spill || 0, fakkel: S.fakkel, metgezel: build.metgezel || null,
    baasSoort: T.baasSoort || {}, kaartBaas: T.kaartBaas || {}, kaartHof: T.kaartHof || {}, tafel: build.tafel || [],
    relikwieen: S.relikwieen.slice(), dekN: dekStart
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
  /* [planner F] VARIANT 'PLAFOND' (ONSCHENDBAAR N, naar Invincible van de Corrupt Heart): hoogstens
     N schade op de baas per ronde (jouw beurt + de vijandbeurt erna; reset bij g.beurt++).
     MEET_CAP = een getal (elke scène) of JSON per scène, bv. {"1":40,"2":40,"3":40,"4":35}.
     Anders dan E's variant knipt het plafond VÓÓR het scèneslot: zo kan het slot de baas nooit
     schorsen op een klap die door het plafond niet tot op de drempel kwam. De weggeknipte schade
     telt apart (capWeg); de buitenste laag in installeer telt slot + vloer + plafond samen. */
  if (process.env.MEET_CAP) await page.evaluate(CAPS => {
    const o = window.dicktatorSlot;
    const capVan = b => { const sc = dicktatorScene(b); const c = (typeof CAPS === 'object') ? (CAPS[sc] ?? CAPS[String(sc)]) : CAPS; return (c == null || c <= 0) ? Infinity : c; };
    const reset = (b, g) => { if (b._capBeurt !== g.beurt) { b._capBeurt = g.beurt; b._capSom = 0; } };
    window.__capRuimte = b => { const g = S.gevecht; if (!g || !b) return Infinity; reset(b, g); return Math.max(0, capVan(b) - b._capSom); };
    window.dicktatorSlot = function (b, n) {
      const g = S.gevecht;
      if (!g || !b || b.dood || b._geschorst || n <= 0) return o(b, n);
      reset(b, g);
      const open = Math.max(0, capVan(b) - b._capSom);
      const n2 = Math.min(n, open);
      const T = window.__T;
      if (T && n2 < n) { const bd = window.__bedrijf(); T.capWeg = (T.capWeg || 0) + (n - n2); T.capWegBd = T.capWegBd || {}; T.capWegBd[bd] = (T.capWegBd[bd] || 0) + (n - n2); T.capHits = (T.capHits || 0) + 1; }
      if (n2 <= 0) return 0;
      const r = o(b, n2);
      b._capSom += r;
      return r;
    };
  }, (() => { const v = process.env.MEET_CAP; return /^\s*\{/.test(v) ? JSON.parse(v) : parseInt(v, 10); })());
  if (process.env.MEET_BOTBLIND === '1') await page.evaluate(() => { window.__botBlind = true; });
  await page.evaluate(installeer);
  if (process.env.MEET_DICK) await page.evaluate(over => {
    const meng = (doel, bron) => { for (const k of Object.keys(bron)) {
      if (bron[k] && typeof bron[k] === 'object' && !Array.isArray(bron[k]) && doel[k] && typeof doel[k] === 'object') meng(doel[k], bron[k]);
      else doel[k] = bron[k];
    } };
    meng(DICK, over);
    if (VIJANDEN.de_dicktator) VIJANDEN.de_dicktator.hp = [DICK.hp, DICK.hp];
  }, JSON.parse(process.env.MEET_DICK));
  /* DE DRUK PER GEVECHT (MEET_DMGX en de breekpuntzwaai MEET_BREEK): de DICK-basis (spelcode +
     MEET_DICK) wordt hier vastgelegd; __zetDick(x) zet vóór ELK gevecht die basis terug en
     vermenigvuldigt dan ALLE klappen van baas en hof met x (afgerond op hele getallen). Zo kan één
     pagina gevechten op verschillende drukfactoren na elkaar draaien zonder dat ze op elkaar
     stapelen. x = 1 = de basis ongewijzigd. */
  await page.evaluate(() => {
    const kloon = x => JSON.parse(JSON.stringify(x));
    window.__dickBasis = kloon(DICK);
    window.__zetDick = x => {
      const B = window.__dickBasis;
      for (const k of Object.keys(B)) DICK[k] = kloon(B[k]);
      if (x && x !== 1) {
        const r = v => Math.max(0, Math.round(v * x));
        ['AANZEGGING', 'VONNISSLAG', 'VONNIS', 'EIGENHANDIG', 'KARAKTERMOORD', 'KM_PER_VLOEK', 'EXECUTIE', 'APPLAUS', 'DONDERREDE'].forEach(k => { if (typeof DICK[k] === 'number') DICK[k] = r(DICK[k]); });
        DICK.ONTSLAG = (DICK.ONTSLAG || []).map(r);
        ['basis2', 'tarief2', 'basis3', 'tarief3', 'basis4', 'tarief4'].forEach(k => { if (DICK.FACTUUR && typeof DICK.FACTUUR[k] === 'number') DICK.FACTUUR[k] = r(DICK.FACTUUR[k]); });
      }
      if (VIJANDEN.de_dicktator) VIJANDEN.de_dicktator.hp = [DICK.hp, DICK.hp];
    };
  });
  /* [planner F] PROBE 'HET HOF VANGT DE KLAP' (MEET_SPILL=1): wat het scèneslot, de vloer (of het
     plafond) van een klap op de baas wegknipt, valt niet in de leegte maar op zijn eerste levende
     hoveling (links naar rechts). Eén generieke regel voor élke weggeknipte schade (gif, doornen,
     kaarten). Zonder levend hof blijft het weg. Buitenste laag, ná installeer: slotWeg telt de knip
     zoals altijd, de hoveling-schade telt als uitHof. Sinds v4 kent de bot de regel (spillW).
     Staat de regel al in de spelcode (DICK.hofVangt), dan doet de probe NIETS (geen dubbele vangst). */
  if (process.env.MEET_SPILL === '1') await page.evaluate(() => {
    if (typeof DICK === 'object' && DICK && DICK.hofVangt) { console.warn('MEET_SPILL genegeerd: DICK.hofVangt staat in de spelcode'); return; }
    window.__spillProbe = true;
    const o = window.dicktatorSlot;
    window.dicktatorSlot = function (b, n) {
      const r = o(b, n);
      const g = S.gevecht;
      if (g && b && !b.dood && n > r) {
        const hof = g.vijanden.find(x => x !== b && !x.dood && !(VIJANDEN[x.id] && VIJANDEN[x.id].baas));
        if (hof) {
          const T = window.__T; if (T) T.spill = (T.spill || 0) + (n - r);
          try { window.verliesHp(hof, n - r, g.speler); } catch (e) {}
        }
      }
      return r;
    };
  });
  return page;
}

async function main() {
  const t0 = Date.now();
  let browser = await chromium.launch({ headless: true });
  const fouten = [];
  const paginas = [];
  for (let i = 0; i < WERKERS; i++) paginas.push(await maakPagina(browser, fouten));
  /* DEV_BUILDS uit de pagina: de twee referentiebuilds blijven exact die van game.js */
  const dev = await paginas[0].evaluate(() => JSON.parse(JSON.stringify(DEV_BUILDS)));
  const versie = (fs.readFileSync(path.join(WORTEL, 'sw.js'), 'utf8').match(/const CACHE = '([^']+)'/) || [])[1] || '?';
  const dick = await paginas[0].evaluate(() => JSON.parse(JSON.stringify(window.__dickBasis || DICK)));
  const basisHp = await paginas[0].evaluate(() => Object.fromEntries(Object.entries(SPELERS).map(([k, v]) => [k, v.hp])));
  const relBestaat = await paginas[0].evaluate(ids => ids.filter(id => !RELIKWIEEN[id]), [].concat(DEF_RELIKWIEEN, Object.values(STARTREL)));
  if (relBestaat.length) throw new Error('onbekende relikwieën in DEF_RELIKWIEEN/STARTREL: ' + relBestaat.join(', '));
  /* de ruwe build van een cel: 'dev:<id>' = DEV_BUILDS uit game.js, een andere sterkte-naam = die build */
  const ruweBuild = (held, st) => {
    let b = BUILDS[held][st];
    if (typeof b === 'string' && !b.startsWith('dev:')) b = BUILDS[held][b];
    if (b == null) throw new Error('geen build voor ' + held + '/' + st);
    return typeof b === 'string' ? Object.assign({ bron: b }, JSON.parse(JSON.stringify(dev[b.slice(4)]))) : JSON.parse(JSON.stringify(b));
  };
  /* de norm-toets (STERK_NORM): een 'sterk'-build die afwijkt, laat de hele meting falen */
  const toetsNorm = (held, b) => {
    const N_ = STERK_NORM, fout = [];
    if (b.hp !== basisHp[held] + N_.hpPlus) fout.push(`hp ${b.hp} ≠ ${basisHp[held]} + ${N_.hpPlus}`);
    if (b.relikwieen.length !== N_.relikwieen) fout.push(`${b.relikwieen.length} relikwieën`);
    if (b.relikwieen[0] !== STARTREL[held]) fout.push('eerste relikwie is niet het startrelikwie');
    const def = b.relikwieen.filter(r => r !== STARTREL[held] && DEF_RELIKWIEEN.includes(r));
    if (def.join() !== N_.defensief.join()) fout.push(`defensief ${def.join('+') || 'geen'} ≠ ${N_.defensief.join('+')}`);
    if (b.dek.length !== N_.kaarten) fout.push(`${b.dek.length} kaarten`);
    const up = b.dek.filter(x => x[1]).length;
    if (up < N_.upgrades[0] || up > N_.upgrades[1]) fout.push(`${up} upgrades`);
    if ((b.laster || 0) !== N_.laster) fout.push(`laster ${b.laster}`);
    if (fout.length) throw new Error(`STERK_NORM geschonden voor ${held}/sterk: ${fout.join('; ')}`);
  };
  /* DE POPULATIE: de buren van een build (zie de kop, punt 5) */
  const variant = (held, basis, pv) => {
    if (!pv || pv === 'basis') return basis;
    const b = JSON.parse(JSON.stringify(basis));
    if (pv === 'minDef') {
      const d = b.relikwieen.find(r => r !== STARTREL[held] && DEF_RELIKWIEEN.includes(r));
      if (d) { b.relikwieen = b.relikwieen.filter(r => r !== d); b.pvTxt = '−' + d; }
      else { b.dranken = []; b.pvTxt = '−heeldrank (geen defensief run-relikwie)'; }
    } else if (pv === 'plusDef') {
      const d = ['mosamulet', 'anker', 'warme_mantel'].find(r => !b.relikwieen.includes(r));
      b.relikwieen = b.relikwieen.concat([d]); b.pvTxt = '+' + d;
    } else if (pv === 'laster') {
      b.laster = (b.laster || 0) ? 0 : 1; b.pvTxt = 'laster ' + b.laster;
    } else throw new Error('onbekende populatievariant ' + pv);
    b.label = (b.label || '') + ' [' + pv + ': ' + b.pvTxt + ']';
    return b;
  };
  const cacheB = {};
  const buildVan = (held, st, pv = 'basis') => {
    const sleutel = held + '/' + st + '/' + pv;
    if (cacheB[sleutel]) return cacheB[sleutel];
    const basis = ruweBuild(held, st);
    if (st === 'sterk') toetsNorm(held, basis);
    const sm = (SMEED[held] || {})[st === 'sterk_oud' ? 'sterk' : st];
    if (sm && sm.length) { basis.smeed = sm; basis.label = (basis.label || '') + ' + ' + sm.length + ' Slachtblok'; }
    /* SOLO IS DE STANDAARD (Thomas, 25 sep: "we doen eerst zonder metgezellen"; DE NISSEN DICHT):
       geen enkele build draagt een metgezel, behalve met MEET_METGEZEL=<id> (de terugkeer). */
    Object.assign(basis, metMetgezel(basis));
    /* [planner F] de Drempeltafel als gevoeligheid: MEET_TAFEL=kroon,verlies,zeldzaam op de
       sterktes in MEET_TAFEL_ST (standaard gemiddeld,sterk); zeldzaam kiest per held één vaste kaart */
    const ZELDZAAM = { slachter: 'vampiersbeet', gifmagier: 'nachtschade', thoverk: 'duivelspact' };
    const tafelSt = (process.env.MEET_TAFEL_ST || 'gemiddeld,sterk').split(',');
    if (process.env.MEET_TAFEL && tafelSt.includes(st)) basis.tafel = process.env.MEET_TAFEL.split(',').map(t => t === 'zeldzaam' ? 'zeldzaam:' + ZELDZAAM[held] : t);
    /* [planner F] ABLATIE (waarom verschillen de helden?): MEET_ABL='{"thoverk/sterk":{"minRel":["mosamulet"],
       "plusRel":[],"geenUp":true,"minKaart":["knalsigaar"],"plusKaart":[["bastvel",1]],"hp":80,"laster":1}}' */
    if (process.env.MEET_ABL) {
      const a = JSON.parse(process.env.MEET_ABL)[held + '/' + st];
      if (a) {
        basis.relikwieen = (basis.relikwieen || []).filter(r => !(a.minRel || []).includes(r)).concat(a.plusRel || []);
        let dek = (basis.dek || []).map(x => x.slice());
        (a.minKaart || []).forEach(id => { const i = dek.findIndex(x => x[0] === id); if (i >= 0) dek.splice(i, 1); });
        if (a.geenUp) {
          /* de offers van het Slachtblok houden hun stand (anders klopt het smeedbudget niet) */
          const houd = [].concat(...((basis.smeed || []).map(s => (s.offers || []).filter(o => o[1]))));
          dek = dek.map(([id, up]) => { const i = houd.findIndex(o => o[0] === id && up); if (i >= 0) { houd.splice(i, 1); return [id, up]; } return [id, 0]; });
        }
        dek = dek.concat(a.plusKaart || []);
        basis.dek = dek;
        if (a.hp) basis.hp = a.hp;
        if (a.laster != null) basis.laster = a.laster;
        if (a.geenSmeed) basis.smeed = [];
        basis.label = (basis.label || '') + ' [ablatie]';
      }
    }
    return (cacheB[sleutel] = variant(held, basis, pv));
  };
  const jobs = maakJobs();
  /* elke build één keer vooraf opbouwen: een norm- of variantfout breekt de meting vóór de eerste job */
  for (const j of jobs) buildVan(j.held, j.st, j.pv);
  console.log(`HET PROCES-meting '${LABEL}' · ${versie} · ${jobs.length} gevechten · ${WERKERS} werkers · ${N} seeds per cel · seeds ${SEEDBASE}-${SEEDBASE + N - 1}` +
    ` · ${MEET_METGEZEL ? 'MET metgezel ' + MEET_METGEZEL : 'SOLO'}${POP ? ' · populatie ' + POP_VAR.join('/') + ' op ' + POP_ST.join('/') : ''}${BREEK.length ? ' · breekpuntzwaai x' + BREEK.join('/') : ''}${DMGX !== 1 ? ' · druk x' + DMGX : ''}`);
  const resultaten = [];
  let volgende = 0, klaar = 0, soloFout = 0;
  /* [planner F] VEERKRACHT: sterft de browser (parallelle sessies ruimen soms chrome-processen
     op), dan start hij opnieuw en draait de job opnieuw - een meting mag geen gaten krijgen. */
  let herstart = null, herstarts = 0;
  const zorgBrowser = async () => {
    if (browser.isConnected()) return;
    if (!herstart) herstart = (async () => { herstarts++; try { browser = await chromium.launch({ headless: true }); } finally { herstart = null; } })();
    await herstart;
  };
  await Promise.all(paginas.map(async (page0, wi) => {
    let page = page0;
    while (volgende < jobs.length) {
      const job = jobs[volgende++];
      const build = buildVan(job.held, job.st, job.pv);
      /* een mislukte job draagt zijn celvelden mee, zodat de analyse hem als FOUT telt en niet stil laat vallen */
      const kaal = fout => ({ cel: job.cel, seed: job.seed, held: job.held, st: job.st, pv: job.pv, dmgx: job.dmgx, beleid: job.beleid, baas: job.baas, hpPct: job.hpPct, fout });
      let r = null;
      for (let poging = 0; poging < 5 && !r; poging++) {
        try { r = await page.evaluate(eenGevecht, { build, job }); }
        catch (e) {
          const msg = String(e.message || e);
          if (/closed|crash|Target|disconnected/i.test(msg)) {
            try { await zorgBrowser(); page = await maakPagina(browser, fouten); } catch (e2) { await new Promise(res => setTimeout(res, 1500)); }
            continue;
          }
          r = kaal('evaluate: ' + msg.slice(0, 300));
        }
      }
      if (!r) r = kaal('evaluate: browser bleef sterven');
      /* DE SOLO-ASSERT: zonder MEET_METGEZEL staat er nooit een metgezel in het gevecht */
      if (!r.fout && (r.gMet || null) !== (build.metgezel || null)) { r.fout = `metgezel-toets: verwacht ${build.metgezel || 'solo'}, gemeten g.metgezel ${r.gMet || null}`; soloFout++; }
      resultaten.push(r);
      if (r.fout) console.log(`  FOUT ${job.cel} ${job.seed}: ${String(r.fout).split('\n')[0]}`);
      if (++klaar % 25 === 0) console.log(`  ${klaar}/${jobs.length} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
  }));
  if (herstarts) console.log(`  (browser ${herstarts}× herstart)`);
  try { await browser.close(); } catch (e) {}
  /* de builds in de uitvoer: sleutel held/st of held/st#pv (dezelfde vorm als de cel) */
  const builds = {};
  for (const k of Object.keys(cacheB)) { const [h, st, pv] = k.split('/'); builds[h + '/' + st + (pv === 'basis' ? '' : '#' + pv)] = cacheB[k]; }
  /* standaard NIET naast het script (tools/ wordt gedeployd): in de gitignored notitiemap */
  const uitPad = process.env.MEET_UIT || path.join(WORTEL, '.claude', 'notities', 'baas-meting', 'uit', LABEL + '.json');
  fs.mkdirSync(path.dirname(uitPad), { recursive: true });
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => /^MEET_/.test(k)));
  fs.writeFileSync(uitPad, JSON.stringify({ meta: { label: LABEL, versie, datum: new Date().toISOString(), seeds: N, seedbase: SEEDBASE, beleid: BELEID, solo: !MEET_METGEZEL, env, dick, duurS: Math.round((Date.now() - t0) / 1000), paginafouten: [...new Set(fouten)].slice(0, 20), soloFout }, builds, resultaten }, null, 1));
  console.log(`klaar in ${((Date.now() - t0) / 1000).toFixed(0)} s → ${uitPad}`);
  const nFout = resultaten.filter(r => r.fout).length;
  console.log(`${resultaten.length} gevechten, ${nFout} fout, ${resultaten.filter(r => r.timeout).length} time-out, ${[...new Set(fouten)].length} verschillende paginafouten`);
  if (fouten.length) console.log('PAGINAFOUTEN:', [...new Set(fouten)].slice(0, 8));
  if (soloFout) { console.log(`SOLO-ASSERT GEBROKEN: ${soloFout} gevecht(en) met een metgezel die er niet hoorde`); process.exitCode = 3; }
}
main().catch(e => { console.error(e); process.exit(1); });
