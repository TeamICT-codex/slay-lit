# SLAY LIT — Ontwerprichting: "De Fakkel"

*Hernoemd van SLAY IT naar SLAY LIT (11-06-2026) — de fakkel werd de
identiteit, de naam mocht mee. Opslag-sleutels behouden de oude naam
zodat saves blijven werken.*

*Vastgelegd 11-06-2026. Doel: het spel een eigen identiteit geven naast
Slay the Spire, met als verplichte onderdelen een dagelijkse run-modus en
een bijbehorende leaderboard-challenge. Browser eerst, mobiel later.*

## Kernidee: licht als tweede economie

De identiteit van SLAY IT wordt **informatie en licht**. Je daalt af met
een fakkel; licht is tegelijk brandstof, valuta en zicht.

### De Fakkel
- Start: 100 licht. Elke kamer op de kaart kost licht (omwegen kosten meer).
- **Licht = informatie**: onder een drempel dimt het toneel (Vista dimt de
  fakkels/belichting) en worden vijand-intents verborgen. Het lezen van
  intents — het fundament van het genre — wordt iets dat je kunt verliezen.
- **Licht = valuta**: kaarteffecten kunnen "Verbrand X licht" kosten i.p.v.
  energie; de winkel verkoopt olie; het kampvuur krijgt een derde keuze
  (genezen / smeden / fakkel bijvullen).
- **Fakkel op ≠ dood**: "blind klimmen" — intents verborgen, vijanden
  feller, loot beter. Comeback mogelijk, spanning gegarandeerd.
- Relikwieën/events rond licht (lantaarn-relikwie, vuurvliegjes-event...).

### Waarom dit past
- De volledige artset is al fakkelverlicht; de 3D-scene kan al dimmen.
- Goedkoop incrementeel te bouwen op de bestaande engine.
- Geeft de daily-score een unieke strategische as (greed kost zicht).

## Daily Run: "Het Dagdecreet"
- **Seed = datum** (Europe/Brussels). Eén seeded PRNG (bv. mulberry32)
  door alle spellogica → iedereen exact dezelfde run. Art/FX-randomness
  blijft ongeseed.
- **2-3 dagmodifiers** uit een pool, getoond vóór de start, bv.:
  - "Halve fakkel, dubbel goud"
  - "Elites dragen een extra relikwie"
  - "Start met de vloek Pijn"
  - "Drankjes zijn gratis maar je hebt één vak"
- **Eén scorende poging per dag** (localStorage-slot); daarna vrij oefenen
  op dezelfde seed zonder score.
- **Scoreformule (transparant op eindscherm):**
  verdiepingen×10 + baasbonus 100 + resterend licht×2 + resterende HP×1
  + efficiëntiebonus (minder beurten = meer) − gebruikte hulp.

## Leaderboard: gefaseerd
1. **Uitdaagcodes (geen server)** — na de daily een compacte code
   (dagseed + score + checksum + mini-samenvatting). Vergelijkscherm waar
   je codes van vrienden plakt → lokaal bord. Deelbaar via chat-apps.
2. **Online bord (later)** — gratis micro-backend (Supabase of Cloudflare
   Worker + KV): naam + score per dagseed. Dankzij de deterministische
   engine is **replay-verificatie** mogelijk als anti-cheat (actielijst
   meesturen, naspeelbaar).

## Mobiel (na browser)
- Is al een PWA → "zet op beginscherm" werkt nu al.
- Te doen t.z.t.: touch-interactie voor de hand (tap-tap), portrait-layout,
  auto-lite op mobiel, grotere knoppen.
- App stores later via Capacitor-wrapper om dezelfde codebase. Geen rewrite.

## Bouwvolgorde
1. ✅ GEBOUWD (11-06): Seeded PRNG (Toeval-module) door de spellogica,
   seed-invoer bij heldenkeuze, seed-label op de kaart, generator-staat
   in de save. Presentatie-willekeur bewust losgekoppeld.
2. ✅ GEBOUWD (11-06): Fakkelsysteem — kamerkosten (rust/winkel 3,
   gevecht/event/schat 4, elite 5), drempels 60/30/0 met visuele dimming
   (Vista-lerp + CSS-brightness), intent-getallen verborgen bij duister,
   alles verborgen bij gedoofd (+1 Kracht vijanden, +50% goud),
   kampvuur-Oppoken (+25), Lantaarnolie in winkel (+20), kaarten
   Vlamstoot/Verlichting/Innerlijk Vuur, relikwieën Gloeiende Lantaarn
   en Vuurvliegenpot, event De Vuurvliegjes, muziekverduistering.
3. Daily-scherm (decreet van vandaag, één poging, scoreformule + endscreen).
4. Uitdaagcodes + vergelijkscherm.
5. (Later) micro-backend voor het echte bord.

## Overige ideeën (parkeerplaats)
- Pact-systeem: elites bieden een deal (skip het gevecht: vloek + relikwie).
- Kaart-evolutie: veelgespeelde kaarten transformeren naar keuzevarianten.
- "Schimmen": runs van vrienden per verdieping vergelijken op het endscreen.

## Metgezellen & Familiars (Act 2-feature, idee van Thomas 13-06)

Zodra ontgrendeld blijft een metgezel permanent bij je, voor een
beperkte duur (bv. N gevechten, of tot het einde van de act). Klein
wezen naast de held op het strijdtoneel, met één duidelijk
per-beurt-effect — geen tweede held, wel een bondgenoot met smoel.

**Alignment** (gekoppeld aan keuzes en verhaallijn):
- GOED — bv. de Vuurgeest: +1 licht per beurt, of de Tempelmuis:
  geneest 1 HP per gevecht. Ontgrendeld via barmhartige keuzes
  (avonturier laten rusten, altaar weigeren...).
- NEUTRAAL — bv. de Grotrat: steelt 2 goud per gedode vijand, of
  de Schim: 1 Blok per beurt. Via handel/events.
- KWAADAARDIG — bv. de Imp: 2 schade per beurt aan een willekeurige
  vijand maar vreet 1 licht per beurt, of het Bloedwicht: +1 Kracht,
  kost 1 HP per gevecht. Via duistere keuzes (offers, plunderen).

**Systeemideeën:**
- Keuzes tellen een verborgen alignment-score; events tonen andere
  opties naargelang je reputatie ("de imp ruikt bloed aan je handen").
- Metgezel = sprite naast de held (Vista heeft voegVijandToe-achtige
  infrastructuur al; een bondgenoot-acteur is dezelfde techniek).
- Eigen art-slot: assets/karakters/metgezel_<id>.png + states.
- Codex-sectie "Metgezellen" met silhouetten -> verzameldoel.
- Schrijn-interactie: metgezellen NIET via het Schrijn (te sterk),
  wel her-ontmoetbaar in latere runs zodra eenmaal ontgrendeld.


---

# Thoverk Racht — De Kolendruïde (derde speelbare held)

Tiefling-druïde uit Maxenzele. Verloor een oog aan een ontplofte
magische sigaar, ruilde een been met een pratende duivelboom in een
andere dimensie — en kreeg er zijn druïdische krachten voor terug.
Lokale legende dankzij één paddenstoelenstoofpot die een compleet
cafégevecht beëindigde. Het ludieke is in de game gedoseerd: hij is
een gehavende, sluwe natuurmagiër; de humor zit in kaartnamen en lore.

**Drops** (magische zwarte labrador, verschijnt/verdwijnt op commando)
is bewust GEPARKEERD: wordt de eerste vindbare metgezel/familiar in
Act 2 (zie sectie Metgezellen & Familiars — alignment: goed).

## Speldefinitie (SPELERS-entry)

| veld | waarde |
|---|---|
| id | `thoverk` |
| naam | De Kolendruïde |
| art | `thoverk` |
| icoon | 🌿 |
| hp | 66 (tussen Slachter 70 en Gifmagiër 62) |
| kleur | `214, 150, 86` (koperbrons) |
| relikwie | `houten_been` |
| stijl | "Wortels en smeulende kolen: voed het vuur met je fakkel, wurg wat overblijft." |
| dek | takkenslag ×4, verdediging ×4, vonkenbeet, stoofpotje |

Identiteit t.o.v. de anderen: Slachter = kracht/staal, Gifmagiër =
gif/geduld, **Thoverk = fakkel-economie + wortels/doornen + een snuif
risico**. Hij is dé held die licht als brandstof gebruikt (meerdere
verbrand-kaarten + relikwieën die dat verzachten) en de enige met
(bescheiden!) genezing in het dek — gebalanceerd door lage getallen.

## Eigen kaarten (19 — `KAARTEN[id].held = 'thoverk'`)

| id | naam | type | zeld | kost | effect (up) |
|---|---|---|---|---|---|
| takkenslag | Takkenslag | aanval | basis | 1 | 6 schade (9) |
| vonkenbeet | Vonkenbeet | aanval | gewoon | 1 | verbrand 1 licht; 8 schade (11) |
| stoofpotje | Stoofpotje | vaardigheid | gewoon | 1 | 4 Blok + genees 1 (6 + 2) |
| wortelgreep | Wortelgreep | aanval | gewoon | 1 | 5 schade + 1 Zwak (7 + 2) |
| doornzweep | Doornzweep | aanval | gewoon | 1 | 3× 3 schade, reeksAanval (3× 4) |
| bastvel | Bastvel | vaardigheid | gewoon | 1 | 7 Blok + 1 Doornen (9 + 2) |
| sporenstoot | Sporenstoot | aanval | gewoon | 1 | 6 schade; +4 als doelwit Zwak of Kwetsbaar is (8; +5) |
| stoofgeur | Stoofgeur | vaardigheid | ongewoon | 1 | ALLE vijanden 2 Zwak (3) |
| wurgwortels | Wurgwortels | aanval | ongewoon | 2 | 11 schade + 2 Kwetsbaar (14 + 2) |
| kolengloed | Kolengloed | vaardigheid | ongewoon | 1 | verbrand 3 licht; +2 Kracht (verbrand 2) |
| paddenstoelenstoofpot | Paddenstoelenstoofpot | vaardigheid | ongewoon | 2 | genees 5 (7) |
| asadem | Asadem | aanval | ongewoon | 1 | verbrand 2 licht; 5 schade aan ALLE vijanden (7) |
| eikenhuid | Eikenhuid | vaardigheid | ongewoon | 2 | 12 Blok (16) |
| doornmantel | Doornmantel | kracht | zeldzaam | 1 | 3 Doornen (5) |
| duivelspact | Duivelspact | kracht | zeldzaam | 1 | +3 Kracht, jij krijgt 1 Kwetsbaar (+4 Kracht) |
| knalsigaar | Knalsigaar | aanval | zeldzaam | 0 | 14 schade; 30% kans: ontploft, 4 schade aan jezelf (18; 20% kans) — Toeval.kans, seeded |
| sporenkring | Sporenkring | kracht | zeldzaam | 1 | begin van elke beurt: alle vijanden 1 Zwak (2 Zwak) |
| wilde_oogst | Wilde Oogst | aanval | episch | 2 | 3× 5 schade op ALLE vijanden, reeksAanvalAlle (3× 6) |
| hart_van_de_duivelboom | Hart van de Duivelboom | kracht | episch | 2 | elke beurt: +1 Kracht én verbrand 1 licht (+1 Kracht + 2 Blok, verbrand 1) |

Bouwstenen bestaan al: reeksAanval(Alle), verbrandLicht, Doornen-status,
Toeval.kans. Enige nieuwe speel-logica: conditionele bonus (sporenstoot),
zelf-Kwetsbaar (duivelspact), begin-beurt-hook voor sporenkring en
hart_van_de_duivelboom (analoog aan demonenvorm/gifklieren).

## Nieuwe relikwieën

| id | zeld | effect |
|---|---|---|
| houten_been | start (Thoverk) | Aan het begin van elk gevecht: 4 Blok + 1 Doornen — het been wortelt zich vast. |
| smeulbuidel | gewoon | Kaarten die licht verbranden, verbranden 1 minder (minimum 1). |
| kookpot_van_maxenzele | ongewoon | Na elk gevecht: genees 3 HP. |
| mosamulet | zeldzaam | Begin je je beurt zonder Blok: krijg 3 Blok. |
| duivelboomtak | episch | +2 Kracht aan het begin van elk gevecht, maar elke kamer kost +1 licht. |

Lore-hints: houten_been = de ruil met de duivelboom; smeulbuidel = de
kolen van zijn staf; kookpot = het cafégevecht van Maxenzele;
duivelboomtak = het pact zelf, voor wie de prijs durft te betalen.
De drie niet-startrelikwieën zijn voor ALLE helden vindbaar.

## Nieuwe drankjes

| id | effect |
|---|---|
| maxenzeelse_stoofpot | Genees 10 HP en verwijder Zwak & Kwetsbaar. |
| magische_sigaar | 16 schade aan één vijand; 25% kans dat hij in jouw gezicht ontploft: 4 schade aan jezelf (Toeval.kans, seeded). |
| duivelshars | 10 Blok + 2 Doornen. |

## Implementatie-checklist (volgende sessie)

1. data.js: 19 kaarten + held-toewijzing, SPELERS.thoverk, 5
   RELIKWIEEN (incl. lore), 3 DRANKEN (incl. lore).
2. game.js: begin-beurt-hooks (sporenkring, hart_van_de_duivelboom,
   mosamulet), smeulbuidel-hook in verbrandLicht, duivelboomtak in
   startGevecht + fakkelKost, kookpot na wonGevecht, houten_been in
   startGevecht.
3. UITSPRAKEN-pool voor thoverk (data.js) — culinair/droog: "Riekt
   naar stoofpot.", "M'n been jeukt. Slecht teken.", enz.
4. kiesHeld-scherm: derde paneel; codex/schrijn werken automatisch.
5. Art-drop: thoverk (+9 states, NIET spiegelen!), 19 kaarten, 5
   relikwieën, 3 drankjes → dambord (alleen karakters) + WebP + check.
6. Balanstest: fakkel-verbrand-tempo (vonkenbeet/asadem/kolengloed +
   hart) mag een run niet structureel donker duwen; smeulbuidel is de
   ventiel.

---

# Designprincipe: held-gekleurde relikwieën (cross-character synergie)

Speeltest-observatie (Thomas): een relikwie vinden dat niet bij je
HUIDIGE held past maar wél bij een andere, voelt heerlijk — het zaait
meteen een volgende run. Het Schrijn is daarvoor de motor: je neemt
zo'n vondst mee als startbonus voor precies dié andere held.

**Principe vanaf nu:** bij elke nieuwe lichting relikwieën bewust een
paar held-gekleurde stuks toevoegen — universeel droppend, maar met
asymmetrische waarde (bv. een gif-relikwie is goud voor de Gifmagiër
en hoogstens aardig voor de Slachter; een verbrand-relikwie zingt pas
echt bij Thoverk). GEEN "past bij held X"-hints in de UI: de
ontdekking en het plannetje smeden ("dit bewaar ik in het Schrijn
voor...") zijn nu net de magie. Bestaat al organisch (Slangenamulet,
Vuurvreter, Mottenkroon...); vanaf Thoverk-implementatie bewust
doseren: per lichting ±1 per held + meerderheid universeel.

---

# Het Slachtblok — je eigen kaart smeden (Act 3, geparkeerd)

Inscryption-knipoog, maar met een eigen twist: kaartcreatie kost je
geliefde kaarten. Het Schrijn onthoudt vondsten; het Slachtblok
onthoudt OFFERS. Héél uitzonderlijk houden — dit moet één van de
zwaarste, meest memorabele beslissingen van het spel zijn.

## De twee momenten

1. **Het altaar (Act 3, levend).** Eén vast Slachtblok-moment vóór de
   eindbaas. Je legt 2 kaarten uit je dek op het blok — ze worden
   VERNIETIGD voor de rest van de run (dat is de echte prijs: je
   loopt verzwakt de finale in). In ruil smeed je één eigen kaart die
   meteen meespeelt. Win je de run, dan wordt de kaart "gebrandmerkt"
   in de Codex.
2. **De dood in de diepte (Inscryption-moment).** Sterf je in Act 3
   (of voorbij verdieping X), dan verschijnt het Slachtblok eenmalig
   op het doodsscherm: "De diepte biedt een laatste ruil." Je offert
   2 kaarten uit je gevallen dek en smeedt een kaart die in de Codex
   WACHT op een volgende run. De dood wordt zo een begin.

## Het smeden (compositie uit modules)

- **Offerbudget** = waarde van de 2 geofferde kaarten (zeld-tier in
  punten: gewoon 1 / ongewoon 2 / zeldzaam 4; +1 per upgrade). Hoe
  meer je koestert, hoe meer je mag bouwen.
- Kies: type (aanval/vaardigheid) → 1-2 effectmodules uit bestaande
  bouwstenen (schade, blok, multi-hit, Zwak/Kwetsbaar/Gif/Doornen,
  verbrand licht, win licht, trek kaart, genees klein) → energiekost
  (lager = duurder in budget).
- **Eigen naam typen** + icoon kiezen — dít is de ziel van de
  mechaniek. ("Vlammenkras", "Moederslag", noem maar op.)
- Budget begrenst alles: een gesmede kaart mag goed zijn, nooit
  gebroken. Richtlijn: max ~125% waarde van één zeldzame kaart.

## Codex-regels (balans)

- De Codex onthoudt er **maar één** — een nieuwe smeden laat de oude
  vergaan ("de diepte onthoudt slechts één naam"). Per held één slot.
- Meenemen in een nieuwe run: de kaart VERVANGT een startkaart (een
  Slag/Prik eruit), zodat het basisdek nooit groeit. Eventueel via
  een Schrijn-achtige lading: opnieuw verdienen na gebruik.
- In daily runs/uitdaagcodes: uitgeschakeld, net als het Schrijn
  (eerlijkheid van de seed).
- Eigen Codex-sectie "Het Slachtblok" met de kaart, de namen van de
  geofferde kaarten en de datum — kleine grafsteen-vibe.

## Open keuzes (bij implementatie beslissen)

- Alleen Act 3-altaar, alleen doods-smeden, of beide (voorstel: beide,
  zelfde UI, ander vervolg).
- Offer 2 vast, of 2-3 met groter budget (voorstel: vast 2, strak).
- Art: het Slachtblok verdient een eigen plaat + event-art (prompts
  schrijven we bij de Act 3-batch).
