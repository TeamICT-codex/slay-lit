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
