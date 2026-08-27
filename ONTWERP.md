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

---

# Flame — Thoverks inside-classic (20e kaart, episch)

De epiek zit in de presentatie, de balans in de prijs. Engelse naam
bewust behouden (inside joke inner circle).

## Kaartspec (bij Thoverk-implementatie mee)

| veld | waarde |
|---|---|
| id | `flame` |
| naam | Flame |
| held | thoverk |
| type / zeld | aanval / **episch** |
| kost | 3 ⚡ (je hele beurt) |
| licht | verbrand 5 |
| effect | 18 schade aan ALLE vijanden + 2 Kracht. Uitputten. |
| upgrade | 22 schade, verbrand 4 |
| icoon | 🔥 |

Waarom dit weinig impact heeft: 3 energie + 5 licht + uitputten =
één keer per gevecht, tegen een echte prijs. Vergelijkbare waarde
als Wilde Oogst, maar als klapstuk. Dropt op episch-gewicht 3
(≈3% per beloningsslot, alleen in Thoverks pool) — zeldzaam genoeg
dat het een gebeurtenis is als hij verschijnt.

## Het speelmoment (hier woont de epiek)

1. Eigen pose: `thoverk_flame` (2.6s) — prompt staat klaar in
   STATE-PROMPTS.txt; gewoon meedroppen met de states-batch.
2. Oranje schermflits + schudScherm (zelfde familie als de
   baas-flits, maar ember-oranje).
3. Thoverk roept gegarandeerd zijn kreet — groot in beeld via het
   spraaksysteem, kans 1: **"FLAME."** (Eén woord. Punt erachter.
   De inner circle weet genoeg.)

## Status episch-gewicht

OPGELOST: trekKaartBeloning kent nu `episch: 3` (al live, no-op tot
de eerste épische kaart bestaat). Wilde Oogst en Hart van de
Duivelboom blijven dus gewoon episch zoals ontworpen — de eerdere
R3.3-aantekening (downgraden naar zeldzaam) vervalt.

## Aanvulling Flame: speelmoment-implementatie ligt klaar

signatuurMoment() bestaat nu (game.js) en regisseert pose + flits +
kreet. Flame's speel-regel wordt simpelweg:
`signatuurMoment('flame', 'oranje', 'FLAME.')` — de oranje flits
(.sf-oranje) zit al in de CSS. Beulswerk (Slachter) en Moederslang
(Gifmagiër) draaien er al live op.

---

# Heldenontgrendeling & introqueeste (geparkeerd)

Speeltest-wens (Thomas): helden niet allemaal vanaf het begin
beschikbaar, maar ontgrendelbaar — met lore en eventueel een
introqueeste die verklaring brengt. Replay-driver + verhaalmoment.

## Schets

- **Start:** alleen De Slachter (de instap-kit). De andere panelen
  tonen als silhouet met "???" en een cryptische hint — je wéét dat
  er iets te verdienen valt.
- **De Gifmagiër — "De Gekooide":** eenmalig event dat verschijnt
  vanaf verdieping 4-5: een kooi van doornen in een nis, een gestalte
  met snavelmasker erin. Bevrijden kost iets (HP, goud óf je fakkel
  deels). Beloning: unlock + hij vecht het lopende gevecht níet mee
  (Act 2-metgezelsysteem niet voorschaduwen) maar staat bij de
  volgende run in de heldkeuze, met intro-regel.
- **Thoverk — "De geur van stoofpot" (introqueeste, 3 stappen):**
  verspreid over één of meerdere runs: (1) event: een verlaten
  kampvuur met een dampende pot — proeven geeft een mini-buff en de
  regel "iemand kookt hier beneden..."; (2) event dieper: borrelende
  kruiden + een houten-been-spoor; (3) finale: Thoverk gevonden bij
  zijn kookvuur — hij lacht, deelt stoofpot (genees) en sluit aan.
  Lore uit zijn backstory (Maxenzele, het cafégevecht, de duivelboom)
  druppelt mee in de eventteksten.
- **Opslag:** Codex uitbreiden met `helden: ['slachter', ...]` +
  queeste-voortgang. Migratie: bestaande spelers (Codex met
  ontdekkingen) krijgen alles wat ze al speelden ontgrendeld — geen
  demo-vrienden hun held afpakken.
- **Daily runs:** alle ontgrendelde helden; de daily kiest er
  eventueel zelf één voor — beslissen bij de daily-bouw.
- **Codex-sectie "De Gezellen":** per held het unlock-verhaal
  herlezen na ontgrendeling.

## Te beslissen bij de bouw
- Unlock-tempo (Gifmagiër snel = 1e sessie; Thoverk = 2-3 runs?).
- Of de introqueeste seeded meespeelt of buiten de seed valt
  (voorstel: queeste-events buiten de daily houden, zoals Schrijn).

---

# Mobiel-optimalisatie — verkenning & gefaseerd plan (geparkeerd)

Grondige codebase-verkenning (12 juni 2026) naar mobiel-gereedheid,
met als harde eis: de laptopversie mag NIET verslechteren.

## Kernoordeel
Doable, niet triviaal. De kernlus werkt al op touch (kaart klikken →
doelwit klikken, geen drag). Vier echte blokkers, los van elkaar te
fixen. ~80% van het werk kan in media-queries die de laptop nooit ziet.

## Desktop-veiligheid (de strategie)
1. **Media-query-only** (meeste werk): fixes in het BESTAANDE
   @media(max-width:860px)-blok óf een NIEUW @media(max-width:480px)
   eronder. Boven 860px = laptop = ziet die regels nooit. Harde regel:
   bestaande basiswaarden (700px map, 138px kaart, 400px held-kaart,
   min-width 420/170/130) NOOIT aanraken, enkel overriden in een query.
2. **Progressive enhancement** via min()/clamp(): vaste min-widths op
   de rand → min(420px,100%). Desktop kiest altijd de px-waarde =
   byte-identiek; mobiel krimpt. Titel-/eind-/schat-scherm doen dit al.
3. **Feature-detect** in gedeelde code (enige plekken die álle schermen
   raken): scheiden via matchMedia('(pointer: coarse)') /
   pointerType==='touch'. Op laptop false → lite/d3 blijven gelijk;
   touch-listeners NAAST de muis-listeners, nooit ter vervanging.
Risico-checklist na elke fase: open op laptop een gevecht met 1 baas +
3 vijanden, de map, de heldenkeuze en het eindscherm.

## De vier blokkers
- **Afdaalkaart** keihard 700px breed (#kaart-vlak, style.css:744) +
  body overflow:hidden → rechterhelft van het pad onbereikbaar op gsm.
- **Kaarthand** breder dan het scherm (5 kaarten ≈478px op 390px) →
  buitenste kaarten buiten beeld, overlappen orb + eindbeurt-knop.
- **3D staat standaard AAN op gsm**: standaardLite (game.js:62-65) mist
  touch-detectie → gemiddelde telefoon draait vol 3D (hapert/heet/leeg).
- **Tooltips** hangen aan één mouseover-listener (game.js:2603) die op
  touch nooit vuurt → je vecht blind (geen uitleg bij iconen/statussen).

## Gefaseerd plan
- **Fase 1 — 3D uit + lite aan op touch** (klein, risico laag). 4 regels
  in game.js:62-68 achter een mobiel-vlag. Grootste winst, nul desktop-
  risico. AANRADEN STARTPUNT.
- **Fase 2 — viewport-overflow + 480px-breakpoint** (klein, laag). Nieuw
  @media(max-width:480px)-blok als fundament; html{font-size:14px} erin;
  viewport-fit=cover in index.html.
- **Fase 3 — de twee speelbaarheidsblokkers** (middel, middel). Afdaal-
  kaart swipebaar (#kaart-scroll overflow-x:auto — géén transform:scale,
  dat breekt de scroll-rekenkunde); kaarthand agressievere overlap
  (104px, margin -30px); orb + eindbeurt-knop bóven de hand.
  > UPDATE (18 juni 2026): de afdaalkaart is NIET meer swipebaar — het
  > 700px-vlak wordt nu met CSS `zoom` op schermbreedte geschaald in
  > renderKaartScherm (de scroll-rekenkunde schaalt mee via _kaartZoom),
  > zodat de hele route in één oogopslag past en je enkel verticaal scrollt.
  > `zoom` reflowt de layout (anders dan transform:scale) → klikken klopt.
- **Fase 4 — touch-uitleg** (middel, laag). Tooltips op pointerdown
  (touch) naast mouseover; drank-lore via long-press naast rechtsklik;
  :active-feedback naast :hover; touch-action:manipulation.
- **Fase 5 — overige schermen + 2D-klem** (middel, laag). Heldenkeuze/
  event/einde reflow in de query; gevechtTik-klem (game.js:1039) koppelen
  aan onderbalk.offsetHeight i.p.v. magische 252.
- **Fase 6 — nette installeerbare PWA** (middel, geen). Safe-area via
  env(); theme-color + apple-meta; 192/512/maskable PNG-iconen;
  orientation bewust (aanrader: 'any', staand speelbaar maken); sw.js
  CACHE → v8.

## Effort
Een paar avonden voor "ruw speelbaar op gsm" (Fase 1-3); een week+ voor
"gepolijst + nette app" (Fase 4-6). Enige grotere brokken: kaarthand-
herindeling en (optioneel, polish) een tap-to-inspect voor handkaarten.

## Valkuilen
- Afdaalkaart: kies SCROLL, niet transform:scale (px-knoopposities).
- 2D-klem (252) is desktop-afgestemd → koppel aan offsetHeight, test op
  laptop.
- Long-press (lore) vs click (verbruik) mogen elkaar niet hinderen.
- GEEN user-scalable=no (toegankelijkheid); touch-action:manipulation.
- status-bar-style black-translucent vereist de safe-area-fix samen.
- Elk nieuw icoon/metabestand → sw.js CACHE bumpen én in BESTANDEN.
- Tap-to-inspect handkaart = polish, niet nodig voor "ruw speelbaar";
  strikt achter @media(hover:none)/(pointer:coarse), klikKaart-gedrag
  op desktop ongemoeid laten.

# De Proloog — "Een Productief Leven" (geparkeerd, ontwerp 14-06)

> **16-06 ingeweven (zie PROLOOG.md "De rode draad"); 17-06 herzien naar de hond:**
> de **opoffer-draad** — fakkel = de onkopieerbare warmte; **Drops = de trouw (een
> hond) die ze in het donker wékt** (niet langer een levende vlam). De proloog zaait
> die warmte, Act 2 oogst (het Mysterie wékt hem, de **Laatste Sprong** **offert**
> hem). Het enige onfactureerbare is ook het enige dat je ooit vrijwillig weggeeft —
> spiegel van "jíj werd weggegooid".

Volledig ontwerp in **`PROLOOG.md`** (brainstorm Thomas + Claude). Een proloog
vóór de afdaling: droge, tragische, absurde satire op de rat race in een
198X-AI-setting (de mainframe **B.A.A.S.**, "billability" als kernmotor), met de
afdaling als een **ontsnapping die geen ontsnapping is** (escapisme = illusie;
beneden = dezelfde rat race met zwaarden). Doel: opvallen en het stereotype
"burn-out vlucht naar fantasy" juist DOORBREKEN, en de bestaande deckbuilder
thematisch herladen.

**De spine (zie PROLOOG.md voor alles):**
- Opening (60s) → **Het Functioneringsgesprek** (de tutorial = de gevechtsengine
  herskind; B.A.A.S. is onverslaanbaar ∞ — je kunt de rat race niet winnen, enkel
  eruit vallen) → de **Eindafrekening** (factuur-van-je-leven) → de **Val**
  (wachtmuziek zakt) → het **Breekpunt** (split in 3 = heldenkeuze) → drie-
  gekleurde landing.
- **Bazenladder** (klimt de corruptie ín): Act 1 Slijmkoning (asskisser), Act 2
  Onterechte Leidinggevende (nepo-baby), Act 3 **De DICKtator**. B.A.A.S. =
  systeem/stem, NIET de eindbaas.
- **Heldenkeuze = 3 verdrongen delen** van één protagonist (Slachter = kapotmaken,
  Gifmagiër = plooien/overleven, Thoverk = het kind dat nog speelt).
- Hergebruikt de hele engine (combat/seed/save/audio/scanline); office-kaarten
  re-skinnen 1-op-1 naar kerkerkaarten — de re-skin ís de boodschap.
- **Gouden regel:** volledige proloog één keer (firstRun-vlag), daarna
  "⏭ Direct afdalen". Geen kantoorsim per run.

Past op de bouwvolgorde NA de retentie-trits (loopbaan/ascension/daily, ✓ gedaan)
en kan parallel met Act 2; de tutorial-encounter is goedkoop want het is de
bestaande engine met andere art + woorden.



<!-- ============================================================ -->
<!-- HET METGEZEL-SYSTEEM zoals het LIVE staat (herschreven 27 aug
     2026 — de oude rite-ontwerptekst beschreef een geschrapt systeem
     (doof-rite, noteerScherf, Dovenaar) en zette lezers op het
     verkeerde been; zie git-historie voor het originele concept). -->
<!-- ============================================================ -->

# Het Metgezel-Systeem: Scherven & De Drempel (live)

## Kernlus (één zin)
Je verzamelt over runs heen **9 scherven** (3 per metgezel, herkenbaar aan familie-kleur),
en plaatst bij **De Drempel** (het ritueel-scherm tussen Act 1 en 2) een kloppend **trio**
van één maaksel — dat wekt de metgezel permanent; de oude "rite"-unlocks (fakkel doven
enz.) bestaan niet meer.

## De data (js/data.js)
- `MYSTERIES` = drie entries (drops / vlamwachter / mosgeest), elk met `vereist` (3
  scherf-ids), `scherven` ({bron, codexTekst}) en een `eindreveal`. Bronnen: `baas`
  (alleen de Erfprins), `figuur` (Lantaarndrager/Spiegelaar-events), `episch` (🜂-nodes).
- `METGEZELLEN` + `SYNERGIE` (optimaal ×1.3 / goed ×1.15) — de band wordt op het
  heldkeuze-scherm getoond voor de metgezel die déze run instapt (rotatie op Codex.runs).
- Drops de Witte staat er volledig buiten: alleen via het grief-moment (revealDropsWit).

## De lus in de engine (js/game.js)
1. **Vinden (Act 2+, nooit Act 1):** Erfprins = gegarandeerd een baas-scherf bij de
   ontmoeting (verlies telt ook); 🜂-node = gegarandeerd episch (de kaartgenerator forceert
   zo'n node zolang een ONopgelost mysterie er een mist); elite-winst = 50% willekeurig;
   figuur-events = de figuur-scherf. `vindScherf`/`scherfTeVinden` filteren op bezit én op
   `voltooid` — scherven van ontwaakte metgezellen droppen nooit opnieuw.
2. **Dragen vs. bankje:** vondsten gaan in de GEDRAGEN tas (`S.scherven`), banken naar de
   stash (`Codex.scherven`) bij winst, dood (!) of het passeren van de Drempel. Alleen de
   bewust meegenomen loadout (max 6, heldkeuze-scherm) staat echt op het spel in Act 1.
3. **De Drempel:** pool gegroepeerd per familie-kleur, eerste-keer-uitleg bij een lege
   eerste Drempel, en een harde bevestiging vóór een gemengd trio (fout = 3 scherven
   verbrand + de Drempelwachter, 150 HP). Kloppend trio → eindreveal + metgezel daalt
   meteen mee. Daily's dragen nooit scherven de Drempel over (loadout uitgeschakeld).
4. **Signposting:** topbalk 🜂-teller + metgezel-chip (HP/gevlucht), Codex-trio-rooster,
   nederlaag-duiding, Erfprins-orakel (escaleert per ontmoeting; nudge zodra je ≥2
   passende scherven draagt).

## Vluchten / offeren
HP op = vluchten (terug bij de volgende act-overgang; in Act 3 definitief en dat zégt de
melding ook). De Laatste Sprong (alleen Drops) = permanent weg (Codex.gevallen) → rouw-
atmosfeer → Drops de Witte via de twee grief-poorten, minstens één volle run later.

---

# The Copycat — Act 2-eindbaasmechaniek (ontwerp 17-06-2026)

> **Bouwklaar ontwerp uit de multi-agent ontwerp-pass** (16 agenten: 4 engine-recon
> · 4 ontwerptheses · 3 juryleden — unaniem "De Dief" — · synthese · 3 adversariële
> lenzen die 30 problemen vonden, 8 hoog · revisie). Vervangt de gouden "Pappies
> Invloed"-aegis uit de B2-plak. Alle regelverwijzingen geverifieerd tegen de
> huidige `js/game.js` en `js/data.js`. Hangt samen met `WERKCONCEPT.md` (gelockte
> keuzes) en het Metgezel-Mysterie hierboven. **Nog bij te schaven door Thomas —
> zie de gemarkeerde smaakpunten onderaan deze sessie.**

## TL;DR
THE COPYCAT is de Erfprins (nepo-baby): hij steelt letterlijk jouw kaarten uit de
gevecht-kopie van je dek, waardeert ze op, en kaatst je eigen werk tegen je terug —
en hij groeit naarmate jij optimaler speelt (de DICKtator-foreshadow). De gouden
"Pappies Invloed"-aegis verdwijnt volledig; hij is gewoon aantastbaar maar voedt
zich met jouw vlijt. Drops (onkopieerbare hond-trouw) breekt de machine één keer
bij je first-clear omdat hij nooit langs `speelKaart()` komt en dus mechanisch
onindexeerbaar is. De review legde drie bouw-blokkers bloot, nu hard opgelost:
stelen werkt uitsluitend op de gevecht-kopie (S.dek blijft heilig, geen cross-run-
corruptie), alleen een handvol expliciet `kopie:`-gevlagde kaarten is stelbaar
(geen NaN/multi-hit-ravage), en gif voedt nu óók via `verliesHp` (de Gifmagiër kan
de baas niet meer omzeilen). Fase-escalatie loopt puur op voeding (geen HP-vangnet),
de teruggekaatste klap is na álle scaling gecapt en volledig getelegrafeerd, en een
bewezen-in-code speelbare-hand-bodem sluit de softlock uit.

## 1. Kernidee
THE COPYCAT is de Erfprins, het zoontje van de baas: hij maakte **nóóit iets zelf**.
Eerst leefde hij van pappies geld — nu dat op is, **steelt hij jouw kaarten** (uit
de speelpool van dít gevecht), waardeert ze op, en speelt jouw eigen beste werk
tegen je terug. De mechaniek *is* het argument: hoe optimaler jij speelt, hoe
gevaarlijker zijn arsenaal — de directe foreshadow van de Act 3-these "goed spelen
voedt de baas". De gouden aegis verdwijnt volledig: hij is gewoon aantastbaar, maar
hij **groeit met jouw vlijt** in plaats van zich te verstoppen. Cruciaal: hij is
**leeg zonder jou** — heeft hij niets gestolen, dan is zijn enige eigen zet
pathetisch zwak. Al zijn echte schade komt uit *jouw* kaarten. Dat maakt "hij maakt
nooit iets zelf" mechanisch waar (geen eigen 22-dmg Driftbui meer).

## 2. De kopieer-mechaniek (beurt voor beurt)
Eén **Plagiaat-lus** in drie kanalen (drie-kanaals voorraad-patroon: init in
`maakVijand` / aangroei in `speelKaart`+`doe()` / correctie in `beginSpelerBeurt`).

**KANAAL 1 — Observeren** (`baasZietKaart(c)`, één regel in `speelKaart` ná
`def.speel`, game.js:2245). Filter = **expliciete whitelist-vlag op de kaart-def**:
- Stelbaar ⇔ `kdef(c).kopie` bestaat. `kopie` = genormaliseerd snapshot-recept, bv.
  `{soort:'aanval', dmg:12}`, `{soort:'blok', blok:8}`, `{soort:'gif', gif:5}`.
- We taggen **6-8 single-target, single-effect basiskaarten** met `kopie:{…}` (Slag,
  Verdediging, een paar held-aanvallen/vaardigheden). Multi-hit, alle-vijand,
  conditionele bonus en `signatuurMoment` krijgen **géén** vlag → onstealbaar.
- `g.laatstGespeeld` (ringbuffer, max 3) bewaart **alleen het snapshot** `{id, kopie}`
  — nooit een referentie naar een levend deck-object.

**KANAAL 2 — Stelen** (STEEL-intent → `doe(v)`, ná de baasaanval): pakt de sterkste
kaart uit `g.laatstGespeeld`, zoekt **één instance op `uid` in `g.trek` óf `g.afleg`**
(NOOIT `S.dek`), verwijdert die, pusht het ge-cap'te snapshot in `v.gestolen[]`. Geen
uid-match (kaart in hand) → steelt niet → terugval op basis-zet. Lege buffer → STEEL
wordt nooit gekozen.

**KANAAL 3 — Terugspelen** (PLAGIAAT-intent zodra `v.gestolen.length > 0`): via een
**vertaallaag** die alleen het snapshot leest (nooit `def.speel`):
- `aanval` → **`doeSchade(sp(), dmg, v)` rechtstreeks** (gedwongen op de speler, niet
  via `kiesAanvalDoel` dat de hond zou raken). Scaling+krachten in de vertaallaag,
  daarna gecapt op de uitkomst (§8).
- `blok` → `geefBlok(v,n)`; `gif/zwak/kwetsbaar` → `geefGif/geefStatus(sp(),…)`.

**TERUGWINNEN** (`geefTerugwin(b,n,bron)`): elke **14 echte schade** ploft de
**onderste** gestolen kaart terug als **verse `nieuweKaart(id)` (nieuwe uid) in
`g.trek`** — kaal (`up:false`), thematisch én breekt de high-roll-loop.

## 3. Groeit met jouw optimalisatie (DICKtator-foreshadow)
Alle voeding loopt via **`verliesHp`** (de échte chokepoint, game.js:838) zodat geen
schadebron de spiraal omzeilt — inclusief gif. `geefVoeding(b,bron,c)` en
`geefTerugwin` zijn de enige schrijvers. Drie assen:
1. **Arsenaal-tempo:** combo's geven hem sneller een dodelijk arsenaal; chip voedt traag.
2. **Voeding-teller `v.gevoed`** (de enige fase-trigger): bij stelen `+= kkost`; bij
   observatie `+= round((kval(c,'dmg')||0)/max(1,kkost(c)||1))` — `||0`/`||1`-guards.
3. **Piek-voeding** (in `verliesHp`, alleen bron = speler-held): nieuwe piek →
   `v.gevoed += floor((n - v.maxKlap)/4); v.maxKlap = n`.

**Gif-voeding:** staande gif voedt óók (gif-tik game.js:2370-2372 → `+= round(gifTik/2)`
+ `geefTerugwin(b,gifTik,'gif')`). Gif blijft wincon (terugwint je dek), geen I-win-knop.

**Herhalings-bonus op ENERGIE i.p.v. kaart-id:** dezelfde dure bom (`kkost>=2`) 2+
beurten na elkaar → +50% voeding. Goedkope wegwerp-spam (Slag/Verdediging) wordt
nóóit extra bestraft — dat is de bedoelde "veilige voer"-counterplay.

> **Kracht-boekhouding:** `v.copyKracht` apart van fase-buffs; telt mee vóór de
> eind-cap zodat de breuk (`copyKracht=0`) de teruggespeelde schade meetbaar verlaagt.
> Eind-dmg = `cap(basis + v.status.kracht + v.copyKracht, na act-scaling, ≤30)`.
> **Breker voedt niet:** `geefVoeding`/piek gaten op `bron===g.speler`; de companion
> telt alleen voor `terugwinMeter`. Trouw voedt de dief niet.

## 4. Fases (puur voedings-gedreven)
Escalatie op **`v.gevoed` alleen** (geen HP-vangnet — dat ontkoppelt de these).
**Eenrichting via sticky `v.fase`-flag** (alle gedrag leest fase, nooit rauw
`v.gevoed`); `b.fase=N` vóór de kracht-buff (idempotentie). Tegen stall: voeding
koelt af tot **bodem = huidige fase-drempel**, plus passieve straf: elke beurt 0
schade op de baas → `v.gevoed += 1`. Uitwachten verliest op de klok.

- **Fase 1 — DE GRIJPER** (`gevoed < 8`): steelt 1/beurt, speelt ≤1/2 beurten terug.
  Lege zet = pathetische 6-8 dmg "Pappie Bellen". *intro:* „EINDELIJK — IEMAND OM VAN
  AF TE KIJKEN." · *steelt:* „Mooi gespeeld. Ik neem het."
- **Fase 2 — DE VERZAMELAAR** (`gevoed >= 8`, +1 Kracht): grist de duurste uit je
  laatste 2 zetten; speelt elke beurt terug. „Wéét je wel wie mijn váder is?! Ik
  hóéf niks zelf te maken."
- **Fase 3 — DE PLAGIATOR** (`gevoed >= 18`, +2 Kracht, `.woede`): speelt **TWEE**
  gestolen kaarten/beurt, grist uit je laatste 3 zetten. „ALLES wat jij kan, kan ik
  óók — ik kopieer het gewoon!" · *dood:* „Maar... ik kopieerde alles... waarom
  verlies ík...?"

> Voetnoot-vloek (derde verschralingsbron) **geschrapt** — diefstal + cap + herhaling
> is genoeg druk op een 10-kaart-starterdek.

## 5. Counterplay zónder companion (het "meant to fail"-pad)
Extreem moeilijk maar bewezen-in-code winbaar, nooit softlock/crash.
1. **Terugwinnen door te raken** — elke 14 schade (incl. gif) geeft een kaart terug.
2. **Kies wat je voert** — hij pakt de duurste recente *stelbare* kaart; voer hem
   goedkope wegwerpkaarten en bewaar je bommen. Skill = tempo en volgorde.
3. **Stall verliest** — afkoeling tot fase-bodem + passieve stall-straf.

**Getelegrafeerde, gefaseerde ontlading:** de ge-cap'te dmg staat in `it.dmg` vóór de
intent rendert, zodat `intentTekst` (game.js:1756) het exacte getal toont. In fase 3
twee aparte rode "PLAGIAAT GELADEN"-pips met elk hun getal. De arsenaalmeter-telegraaf
fade't pas in **ná het eerste besef-moment** (eerste herkende kaart terug, met JOUW
kaartnaam) — eerst de schok, dán de fair-play telegraaf.

**Mercy-vangnet** (vervangt de aegis-decay, game.js:2472-2473): in `beginSpelerBeurt`
één keer `const breker = levendeBrekerCompanion()` en kies dan **óf** mercy-lek **óf**
breker-terugwin, nooit beide. Zonder breker: `v.gestolen` lekt 1/beurt terug, voeding
koelt af, **harde cap `v.gestolen.length <= 5`**.

**Anti-softlock-invariant (in code):** eind `beginSpelerBeurt`, ná trekken — 0
speelbare kaarten in hand → lek extra 1 terug + trek door, of geef 1 energie. Je houdt
altijd ≥1 speelbare kaart. Plus **per-gevecht steel-cap (≤12 totaal)**. Diefstal werkt
alléén op de gevecht-kopie → verloren run laat `S.dek` volledig intact.

## 6. Drops' offer "De Laatste Sprong" (breekt de machine)
Drops = HOND = onkopieerbare trouw. **Waaróm een companion de machine breekt:** hij
staat niet in je dek, passeert `speelKaart()` nooit, komt nooit langs het
observatiepunt — *mechanisch onindexeerbaar*. **Generiek, rol-gebaseerd** (NIET
`id==='drops'`): companion-def krijgt `rol:'breker'`; engine zoekt via
`levendeBrekerCompanion()`. Per-beurt: Drops bijt voor 6 én voedt `terugwinMeter`
(`geefTerugwin(b,6,'breker')`), voedt `v.gevoed` níét.

**Offer `doe(m,g)`** (van `aegis=0` herschreven): (1) `g.copycatGebroken=true` →
observeren/stelen/plagiaat worden no-op; (2) leeg `v.gestolen`, plof alles als verse
`nieuweKaart(id)` in `g.trek`; (3) trek `v.copyKracht` terug (fase-Kracht blijft); (4)
40 schade + 15 blok.

**First-clear vs. herhaalbaar:** volledige breuk = first-clear-only (Codex-vlag). Latere
runs: 40+15 maar **géén permanente no-op** — de machine **herstelt na 3 beurten**. Gate:
**baas < 50% HP OF `v.fase >= 3`** (breekknop er precies wanneer hij 't gevaarlijkst is).

## 7. Mysterie-coherentie & orakel
`noteerScherf` is idempotent; de baas levert maar **1 van 3** scherven (`drops_baas`).
Voorbij run 1 geeft verliezen géén nieuwe baas-scherf — daarom vuurt de **eerste
DUBBELE TERUGKAATSING** een aparte `noteerScherf('drops','drops_figuur')`: de
mechaniek zelf voedt het mysterie. **Orakel (data.js:988-993) herschreven over twee
assen:**
1. *(kopieer)* „Ik hóéf niks zelf te maken — ik kijk gewoon af."
2. *(fakkel-rite, behouden)* „Eén ding namaken lukt me niet: wat trouw blíjft zonder loon."
3. *(fakkel-rite, behouden)* „Wacht — waarom klem je dat lichtje zo vast? Bang voor wat in het zwart meeloopt?"
4. *(synthese)* „Hoe beter jij speelt, hoe sterker ík word... maar het zwart dat jij niet dúrft te maken, daar leeft wat ik nooit kan kopiëren."

> ⚠️ Let op: deze orakel-herschrijving **wijkt af** van de huidige (in Track A al
> herthematiseerde) regels in data.js. Niet automatisch overnemen — Thomas kiest.

## 8. Startgetallen voor balans

| Knop | Startwaarde |
|---|---|
| Baas HP | **210** (behoud) |
| Stelbare kaarten | alleen `kopie:{…}`-gevlagd (6-8 stuks) |
| Steel-diepte (sticky fase) | laatste 1 / 2 / 3 zet |
| Opwaardering teruggespeeld | +50% op snapshot, **eind-dmg na ÁLLE scaling ≤ 30** |
| Terugwin-drempel | **14** schade (incl. gif) = 1 kaart terug |
| Teruggewonnen kaart | **kaal** (`up:false`), verse uid in `g.trek` |
| Fase-drempels (enige trigger) | `gevoed >= 8` → f2; `>= 18` → f3 (sticky) |
| Voeding-afkoeling | tot fase-bodem, nooit eronder |
| Stall-straf | +1 `gevoed`/beurt dat jij 0 schade doet |
| Fase-buffs | f2 +1, f3 +2 Kracht (in `v.copyKracht`) |
| Eigen zet (leeg arsenaal) | pathetisch 6-8 dmg |
| Arsenaal harde cap | **5** gelijktijdig |
| Per-gevecht steel-cap | **12** totaal ooit |
| Mercy-lek (geen breker) | 1 kaart/beurt terug + afkoeling |
| Herhalingsbonus | alleen `kkost>=2`, zelfde id 2+ beurten: ×1.5 |
| Drops bijt | 6/beurt (telt voor terugwin, NIET voor voeding); maxHp 26 |
| Laatste Sprong (first-clear) | 40 + 15 blok + permanente breuk + heel arsenaal terug |
| Laatste Sprong (herhaling) | 40 + 15 blok, breuk **herstelt na 3 beurten** |
| Offer-gate | baas < 50% HP **OF** `v.fase >= 3` |
| Plagiaat-cadans (sticky fase) | f1: 1/2 beurten · f2: 1/beurt · f3: 2/beurt |

> **Kritische CAP-noot:** `vijandAanval` bakt act-scaling in (`×(1+0.15·(act-1))`,
> game.js:805). Daarom kaatst de vertaallaag **niet via `vijandAanval`** maar via
> `doeSchade(sp(),dmg,v)` rechtstreeks, met eigen berekening (`basis + kracht +
> copyKracht`, act-scaling, **dán clamp op 30**). Cap op de **uitkomst**, niet de basis.

## 9. Het wow-moment
**DE DUBBELE TERUGKAATSING** (fase 3, eerste keer): twee gestolen kaarten achter
elkaar, met de naam van JOUW kaart in zijn intent. `baasFaseMoment`-flits: „Kijk —
JOUW beste zet. Nu is het MÍJN beste zet." Vuurt tegelijk de `drops_figuur`-scherf.
Besef: *hij vecht met mijn deck.*

**Tweede beat (offer):** de eerste "De Laatste Sprong" — de machine probeert de
hondensprong te classificeren en faalt: `CLASSIFICEREN... ONINDEXEERBAAR — TROUW: GEEN
PRECEDENT`, doorgestreepte arsenaalbalk, vlak vóór Drops je hele arsenaal terugrist.

## 10. Engine-bouwplan (per bestand, geverifieerd)
**Te slopen:** `data.js:808` `aegis:15`; `:818-824` Pappies Geld; `:826-831`
Wegwuiven · `game.js:866-873` aegis-afweer in `verliesHp` (volledig weg; Copycat
aantastbaar) · `2297-2314` `checkErfprinsFase`→`checkCopycatFase` (voeding, sticky) ·
`2472-2473` aegis-decay → Copycat-mercy-lek · `data.js:863-881` `drops.beurt` aegis-
knaag → `rol:'breker'`-bijt · `:898-909` `opoffering.doe` → breekt de machine ·
`game.js:1816` Pappies-badge → arsenaalmeter · Erfprins multi-hit eigen-aanvallen →
pathetische lege-zet; orakel herschreven.

**Nieuwe state (`maakVijand`, game.js:1416):** `if (def.copycat) { v.gestolen=[];
v.gevoed=0; v.terugwinMeter=0; v.maxKlap=0; v.copyKracht=0; v.totaalGestolen=0;
v.brokenTeller=0; }` — **lui guarden op élke leesplek** (`(v.gestolen||[])`) tegen
de mid-fight Drops-injectie (zie [[lookup-bugklasse]]).
**Nieuwe `g`-velden (`startGevecht`, 1428):** `g.laatstGespeeld=[]`, `g.vorigeId=null`,
`g.copycatGebroken=false`.

**Hooks:** `speelKaart`:2245 `baasZietKaart(c)` · `verliesHp`:838 voeding/terugwin/piek
(bron-gegate) · gif-tik:2370-2372 copycat-tak · dispatch:2273 `if (VIJANDEN[b.id].copycat)
checkCopycatFase` · `data.js` `de_erfprins` `copycat:true`, `kies()` puur (mutatie in
`doe()`) · **migreer ALLE `de_erfprins`-id-checks naar de copycat-vlag** (checkDropsOntwaak
:1023, mercy:2472, scherf:1528-1530, baasUitspraken:630, orakel-render:1578) + grep-
verificatie; `MYSTERIES.drops.baasId` blijft als **data** · `revealDrops`:1034 zet
`rol:'breker'` op de geïnjecteerde metgezel. Copycat-art-prompt in PROMPTS.txt.

## 11. Reviewfixes (samenvatting)
**Hoog (8):** steel uit gevecht-kopie i.p.v. `S.dek` (geen cross-run-corruptie) ·
whitelist `kopie:`-vlag (geen multi-hit-vertaal) · breker één-pad-per-beurt + lui
guarden (geen null-crash/flip) · gif voedt via `verliesHp` (mono-poison dicht) ·
per-gevecht netto-druk (steel niet kosmetisch) · HP-vangnet weg (these intact) ·
orakel behoudt fakkel-signposting · mysterie-progressie eerlijk (`drops_figuur` op de
mechaniek). **Midden:** gedwongen speler-doel + eind-cap + telegraaf · speelbare-hand-
bodem in code · sticky fase (geen oscillatie) · volledige id-migratie · één
`geefTerugwin`-bron · NaN-guards · `copyKracht` toegepast · first-clear vs.
herhaalbaar (geen cakewalk) · stall-straf · max twee verschralingsbronnen. **Laag:**
offer-gate `<50% OF f3` · herhalingsbonus op energie · kale terugwin · breker voedt
niet · lege-buffer-guard + pure `kies()`.
