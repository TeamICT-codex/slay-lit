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
<!-- ONTWERP (16 juni 2026, multi-agent ontwerp-pass) — v1-concept,
     nog te verfijnen met Thomas' antwoorden op de open vragen. -->
<!-- ============================================================ -->

# Het Metgezel-Mysterie (Act 2+)

> **⚠️ HERZIEN 17-06-2026 — lees met `WERKCONCEPT.md` ernaast.** De mysterie-
> *engine* hieronder blijft volledig geldig (MYSTERIES-template, scherven, rite,
> cross-run-unlock). Twee dingen zijn ge-her-thematiseerd en moeten bij het lezen
> mentaal vervangen worden:
> 1. **Drops = een hond-achtig wezen, géén levende vlam.** Overal waar hieronder
>    "levende vlam / vuurwezen / Drops ontwaakt uit het licht" staat: lees *trouw
>    wezen dat je in het tótale donker vindt*. De fakkel blijft de onfactureerbare
>    ruggengraat; de scherf-/orakel-/revealteksten draaien nu om **onkopieerbare
>    trouw** ("wat je niet kunt namaken") i.p.v. "wat uit zichzelf brandt". De
>    code (`js/data.js`, `js/game.js`) is al omgezet; de citaten hieronder tonen
>    nog de oude vlam-versie.
> 2. **Act 2-baas wordt The Copycat (kopieer-mechaniek), niet de gouden aegis.**
>    De "Pappies Invloed"-aegis + de aegis-vretende companion-rol zijn een
>    *placeholder* tot de Copycat-baas zijn eigen design+build krijgt (Track B).
>    Lees aegis-passages als "de huidige tijdelijke baasmechaniek".
>
> De **opoffering** heet nu **De Laatste Sprong** (was: De Laatste Vonk).

## 1. Visie (3 zinnen)
Metgezellen worden niet langer geschonken maar **ontrafeld over runs heen**: de eerste Act 2-runs hóór je te verliezen tegen de Erfprins, en élk verlies laat een leesbare scherf van een groter raadsel achter. Drie bronnen — de Erfprins die zijn eigen geheim uit grootspraak en paniek verklapt, mysterieuze figuren met raadsels, en eigen epische Catacomben-vijanden — sturen je naar de **dark twist**: tegen alles in wat het spel je leerde doof je op het juiste moment bewust je fakkel, en uit het totale duister ontwaakt de levende vlam (Drops). Het geheel is een data-gestuurd `MYSTERIES`-register dat als template dient, zodat elke toekomstige zeldzame metgezel zijn eigen mysterie en eigen "rite" krijgt — falen is nooit verlies, alleen kennis die de reset overleeft.

---

## 2. De mysterie-lus — van eerste falen tot unlock (stap voor stap)

1. **Act 1 → Act 2 zonder cadeau.** Het blok in `volgendeAct()` (game.js:3103-3106) dat nu gratis `geefMetgezel('drops')` doet, wordt vervangen door een gate: Drops komt alleen mee als hij al **ontgrendeld** is (`if (isOntgrendeld('drops') && !heeftMetgezel()) geefMetgezel('drops')`). Bij run 1 is hij dat niet → Act 2 start metgezel-loos.
2. **Je bereikt de Erfprins.** Bij `startGevecht(...,'baas',...)` tegen `de_erfprins` wordt `Codex.erfprinsOntmoetingen++` geteld (eenmalig per gevecht, guard zoals `S.runGeregistreerd`) en commit je meteen de **baas-scherf** van die ontmoeting via `noteerScherf('drops','drops_baas_<n>')`. Zo levert zelfs een gevecht dat je in 2 beurten verliest gegarandeerd progressie.
3. **De Erfprins verklapt cryptisch.** `toonBaasIntro` (1500) en `checkErfprinsFase` (2215) laten hem via `baasSpreekt` één regel uit `UITSPRAKEN._erfprins.orakel[]` zeggen, geïndexeerd op `Codex.erfprinsOntmoetingen`. Over opeenvolgende runs spelt hij het antwoord uit: van "geleend licht" naar "doof het NIET, ik dáág je".
4. **Je verliest — en dat leest als hint.** `nederlaag()` → `toonEinde(false)` toont in Act 2 een act-bewuste epitaaf + een **duiding-regel** die met `Codex.scherven.drops.length` meegroeit ("het goud kun je niet breken, alleen iets dat zélf brandt"). Geen "game over", maar "je zag iets in het donker (scherf 2/3)".
5. **Onderweg: extra scherven uit twee versnellers.** Mysterieuze-figuur-**events** (alleen Act 2, alleen bij open mysterie) en **epische vijanden** (zeldzame `episch`-node) dragen elk een scherf bij. Deze zijn optioneel maar duwen de speler sneller naar de waarheid.
6. **Het Codex-???-spoor groeit.** Een nieuwe Codex-sectie "🜂 Onopgeloste Mysteries" toont per scherf-slot de gevonden cryptische tekst of een bron-gelabelde `❓`. Zwart op wit: verlies wás progressie, en dít rest nog.
7. **Mysterie rijp.** Zodra alle vereiste scherven binnen zijn, verschijnt in de Codex de gloeiende regel "De scherven passen samen. Maar het antwoord voelt verkeerd...", en de Erfprins-orakelregel slaat om naar pure paniek ("Doof het NIET").
8. **De rite: bewust doven.** In de Erfprins-troonzaal breng je je fakkel naar `lichtNiveau()==='gedoofd'`. Een detector in `beginSpelerBeurt` vuurt — **mits het mysterie rijp is** — het ontwaak-moment: `signatuurMoment` + `baasFaseMoment` + `geefMetgezel('drops')` mid-fight, plus permanente unlock in de Codex.
9. **Voortaan gewoon.** `Codex.mysteries.drops.voltooid` staat op `true`; vanaf nu krijgt elke Act 2-run Drops normaal mee via de gate in stap 1. De grind is **eenmalig per metgezel**.

---

## 3. De scherven & hun bronnen

**Aantal (conflict opgelost):** facet 1 stelt 5 voor, facetten 2-4 stellen 3. Ik kies **3 vereiste scherven + de rite als verplichte 4e sleutel**, met **één gegarandeerde bron (baas) als ruggengraat** en twee versnellers. Reden: 5 scherven over 3 bronnen rekt het over te veel runs en riskeert "kapot/oneerlijk" (pijler a); 3 + rite landt in ~3-5 runs, met de baas-escalatie als vangnet zodat de unlock nooit afhangt van toevallige event-/episch-spawns. Het exacte aantal staat **tunebaar in data** (`MYSTERIES.drops.vereist`), niet hardcoded, zodat playtesting bijstuurt.

**De drie scherven van Drops:** `drops_baas` (gegarandeerd, baas-escalatie), `drops_figuur` (event), `drops_episch` (epische vijand). De **rite** (`fakkel_gedoofd_bij_erfprins`) is geen scherf maar de unlock-conditie.

### Bron 1 — BAAS-ESCALATIE (ruggengraat, gegarandeerd)
`UITSPRAKEN._erfprins` krijgt een `orakel:[]` (geïndexeerd op `Codex.erfprinsOntmoetingen`) en een `gedoofd`-reactie. De regels blijven in zijn komisch-nepotistische stem — hij verraadt het uit grootspraak en paniek, niet als plechtige ziener:

- **Ontmoeting 1 (intro):** „Pappies goud koopt álles. Zélfs jouw nederlaag."
- **Ontmoeting 1 (bij verlies-duiding):** „Staal verbuigt. Gif verdampt. Tegen GOUD heb je niks."
- **Ontmoeting 2:** „Eén ding koopt Pappie niet: wat uit zichzélf brandt."
- **Ontmoeting 2 (fluistering):** „Jouw fakkel? Pff. Geléénd licht. Dat dooft als ik blaas."
- **Ontmoeting 3:** „Wacht — waarom klem je dat lichtje zo vast? Bang in het donker?"
- **Ontmoeting 3 (fase 3, paniek):** „NEE. Doe dat licht NIET uit. Hoor je me? NÍET DOEN."
- **Ontmoeting 4+ (mysterie rijp):** „...het slaapt in jouw vlam. Houd haar brandend en het blijft slapen. Slím van Pappie."
- **`gedoofd`-reactie (sist hij op het moment dat jij in zijn zaal naar 0 licht gaat):** „Wat... WÁT DOE JE? Het wordt wakker! BEWAKING! BE—"

De scherf `drops_baas` wordt gecommit bij het bereiken van de baas (stap 2), dus ook een verloren run telt.

### Bron 2 — MYSTERIEUZE FIGUREN (events, versneller)
Twee nieuwe `EVENTS`-entries volgens het bestaande `{id,titel,icoon,tekst,opties:[{label,hint/detail,kan,reden,doe}]}`-contract. Juist antwoord → `noteerScherf` + poëtische `eventKlaar`-tekst; fout antwoord = sfeer, **geen straf** (mysterie, geen examen). `toonEvent` (3014) filtert deze op `S.act>=2` én op "scherf nog niet gevonden":

- **De Blinde Lantaarnman (🜃):** „Ik zie meer dan jij," zegt de oogloze man met gedoofde lantaarn. „Vraag de juiste vraag."
  - A (scherf): „Waarom is je lantaarn uit?" → „Omdat ik wilde zíen wat het licht verborg. Het kwam pas toen ik het dúrfde te doven." → `noteerScherf('drops','drops_figuur')`
  - B: „Geef me je lantaarn." → „Hij is voor wie hem niet nódig heeft." (weg, geen scherf)
  - C: „Loop door." → „Zijn lege oogkassen volgen je nog lang."
- **De Spiegel van Roet (🜃):** een spiegel zwart van roet; veeg je hem schoon, dan zie je jezelf met een dovende fakkel — en iets kleins en warms dat uit de duisternis naar je toe kruipt.
  - A (scherf, `kan:()=>S.fakkel>0`): „Doof je fakkel vóór de spiegel." → „In het volkomen donker licht het glas één tel op. Iets kijkt terug." → `noteerScherf('drops','drops_figuur')`
  - B: „Houd je fakkel hoog." → „Je ziet alleen jezelf, bang voor het donker."

> Beide events geven *dezelfde* `drops_figuur`-scherf (zie §5: een scherf-`id` is "gevonden of niet"). Twee figuren = twee kansen, schaarste-vriendelijk; de filter verbergt het tweede zodra de scherf binnen is.

### Bron 3 — EPISCHE VIJANDEN (versneller)
Eén Act 2-vijand met vlag `episch:true` + `scherf:'drops_episch'`, op een zeldzame `episch`-node (zie §7). In `gevechtGewonnen` (2413), in de niet-baas-tak, ná de win-afhandeling en vóór de goud-beloning: zoek een verslagen vijand met `.scherf`, en als die scherf nog niet in de Codex zit → `noteerScherf` + melding. Hint via zijn dood-uitspraak:

- **De Dovenaar (🕯️):** start „Ik snuit elke vlam. Behalve één. Díe snuit zichzelf — als jij durft." · dood „...je begrijpt het nu... bijna..." · scherf-melding: „🕯️ Uit de verkoolde resten rolt een zwarte scherf. Koud — alsof hij nooit licht zág."

---

## 4. De Dark-Twist reveal (hoe het episch verpakt wordt)

**De trigger (conflict opgelost):** facet 1/2 willen een organische `lichtNiveau()==='gedoofd'`-detector; facet 4 wil een apart "Gedoofd Altaar"-node. Ik kies de **organische detector in `beginSpelerBeurt`** als kern (epischer, écht "ontdekt", en hij werkt op het groots moment midden in de baasstrijd), en laat het altaar-node **vallen** als aparte unlock-weg om dubbele paden en lookup-risico te vermijden. Wel hergebruik ik de altaar-*toon* in de Codex-rijpregel en de figuur-events als signposting.

**De detector** (één regel toegevoegd aan `beginSpelerBeurt`, game.js:2346, vlak ná de mercy-decay op 2389-2390 zodat de baas-context al bekend is):

```
const _ep = g.vijanden.find(v => v.id === 'de_erfprins' && !v.dood);
if (_ep && mysterieRijp('drops') && lichtNiveau() === 'gedoofd'
    && !isOntgrendeld('drops') && !S.dropsOntwaakt) {
  S.dropsOntwaakt = true;            // eenmalig per run
  noteerRite('drops', 'fakkel_gedoofd_bij_erfprins');
  baasSpreekt(UITSPRAKEN._erfprins.gedoofd);
  revealDrops();                     // signatuurMoment + baasFaseMoment + geefMetgezel
}
```

`revealDrops()` voert de eindreveal uit (data komt uit `MYSTERIES.drops.eindreveal`):
- `baasFaseMoment('UIT HET GEDOOFDE LICHT', 'Iets in het donker haalt adem. En kiest jou.')` (hergebruikt de bestaande baas-flits, 2234)
- `signatuurMoment('drops_reveal','oranje','Waar je fakkel stierf, ontwaakt een levende vlam.')` (623)
- `geefMetgezel('drops')` (875) — die roept al `ontdek('metgezellen','drops')` aan
- `ontgrendelMetgezel('drops')` → zet `Codex.mysteries.drops.voltooid=true` + `bewaarCodex()`
- melding: „🔥 Drops klimt uit de duisternis — en hij blijft."

**Waarom dit episch en niet frustrerend is:** de speler stáát al in de Erfprins-zaal met een rijp mysterie en een Erfprins die in paniek "doe het NIET" schreeuwt — de contra-intuïtieve daad (doven = de game's grootste taboe) wordt zo precies op het hoogtepunt beloond. Drops verschijnt op het moment dat je hem nodig hebt: hij begint meteen de aegis weg te vreten (zijn bestaande `beurt()`-gedrag, data.js:863-876).

---

## 5. Het data-gestuurde multi-metgezel TEMPLATE

**Naamgeving (conflict opgelost):** de vier facetten gebruiken door elkaar `Codex.scherven` (array vs. map), `Codex.mysteries` (object), `ontgrendeld`/`voltooid`. Ik kies één coherent model: **`Codex.mysteries` als object per metgezel** (rijkste, meest template-vriendelijke vorm uit facet 2), met `voltooid` als unlock-bit (geen apart `ontgrendeld`-array nodig).

### Persistent op de Codex (`slayit_codex`)
Toevoegen aan de `Object.assign`-defaults (game.js:129):

```js
mysteries: {},            // { [mid]: { scherven:[], rite:{}, rijp:false, voltooid:false } }
erfprinsOntmoetingen: 0   // teller voor de baas-escalatie
```

Saniteer net als `Codex.gesch`/`ascensie` (139-152): coerce `scherven`/`rite` naar array/object, drop onbekende `mid`'s en scherf-`id`'s tegen een getamperde of oude codex. **Migratie is gratis** via `Object.assign` + deze guards (de bestaande `!Array.isArray`-guards op 153-154 zijn het precedent).

### Run-state (`slayit_save_v1`, S) — reset elke run
Eén vlag, toegevoegd aan `nieuwSpel` (336) en gesaniteerd in `laadSpel`:
- `S.dropsOntwaakt: false` — reveal-guard, eenmalig per run.

Geen verdere run-velden nodig: `S.fakkel`/`S.act`/`S.metgezel` bestaan al. (Optioneel `S.gedoofdBijErfprins` voor een epitaaf-stat "Je deed het ondenkbare".)

### Data-register (`js/data.js`, nieuw `const MYSTERIES`, na `METGEZELLEN` ~927)
Pure definitie, parallel aan `METGEZELLEN`/`EVENTS`, geëxposeerd via `window.MYSTERIES`:

```js
const MYSTERIES = {
  drops: {
    metgezel: 'drops', baasId: 'de_erfprins',
    vereist: ['drops_baas', 'drops_figuur', 'drops_episch'],   // tunebaar
    scherven: {
      drops_baas:   { bron: 'baas',   codexTekst: '„Wat uit zichzelf brandt, kun je niet kopen."' },
      drops_figuur: { bron: 'figuur', codexTekst: '„Het kwam pas toen ik het durfde te doven."' },
      drops_episch: { bron: 'episch', codexTekst: '„Die ene vlam snuit zichzelf — als jij durft."' }
    },
    rite: { vlag: 'fakkel_gedoofd_bij_erfprins',
            test: () => lichtNiveau() === 'gedoofd',
            hint: 'In de troonzaal, in het volslagen zwart...' },
    rijpAls: c => MYSTERIES.drops.vereist.every(s => (c.mysteries.drops?.scherven || []).includes(s)),
    unlock:  c => MYSTERIES.drops.rijpAls(c) && !!(c.mysteries.drops?.rite || {}).fakkel_gedoofd_bij_erfprins,
    unlockDoe: () => geefMetgezel('drops'),
    eindreveal: { titel: 'UIT HET GEDOOFDE LICHT',
                  kreet: 'Waar je fakkel stierf, ontwaakt een levende vlam.', kleur: 'oranje' }
  }
};
```

### Generieke helpers (game.js, vlak na `ontdek()`/`laadSchrijnOp()` ~180)
Alle vier null-veilig (lookup-bugklasse uit MEMORY: elke `OBJ[key]` met `|| {}` / guard):

```js
function mys(mid){ return (Codex.mysteries[mid] ||= {scherven:[],rite:{},rijp:false,voltooid:false}); }
function noteerScherf(mid, sid){
  const m = mys(mid);
  if (!MYSTERIES[mid] || !MYSTERIES[mid].scherven[sid] || m.scherven.includes(sid)) return;
  m.scherven.push(sid);
  if (MYSTERIES[mid].rijpAls(Codex)) m.rijp = true;
  bewaarCodex();
  melding('🜂 Een scherf van een groter geheim brandt zich in je geheugen...');
}
function noteerRite(mid, vlag){ mys(mid).rite[vlag] = true; bewaarCodex(); }
function mysterieRijp(mid){ return !!mys(mid).rijp; }
function isOntgrendeld(mid){ return !!mys(mid).voltooid; }
function ontgrendelMetgezel(mid){ mys(mid).voltooid = true; bewaarCodex(); }
```

### Een tweede metgezel z'n eigen mysterie geven
**Alleen data, geen engine-wijziging:**
1. Voeg een blok `MYSTERIES.vlamwachter = {...}` toe met eigen `baasId` (of een ander triggerpunt), eigen scherven en een **thematisch eigen rite** (b.v. vlamwachter ontwaakt door je fakkel juist op `helder` te houden gedurende een heel baasgevecht — het spiegelbeeld van Drops' twist).
2. Definieer zijn scherf-bronnen in dezelfde drie kanalen (extra `orakel`-pool voor zijn baas, 1-2 figuur-events, 1 episch-vijand met `scherf:'vlamwachter_*'`).
3. Klaar — de helpers, de Codex-sectie, de event-filter en de gate in `volgendeAct` zijn al generiek over `mid`.

**Conflict zwaarte-niveau (facet 1 open vraag d):** mijn aanbeveling — de twee bestaande `zeldzaam`-metgezellen (vlamwachter, mosgeest) krijgen een **lichter pad** (1 figuur-event + rite, geen volledige 3-bron-grind), en alleen `episch`-metgezellen zoals Drops krijgen het volledige mysterie. De template ondersteunt beide; het verschil zit puur in `vereist.length` en het aantal bronnen.

---

## 6. Failure-UX: bewaard, motiverend, pacing, "opnieuw vanaf Act 1"

**Wat élke run al achterlaat (bestaand, hergebruikt):** `Codex.relikwieen/dranken/metgezellen/gevallen/opgeladen` (Schrijn), `Codex.runs/wins/bestDiepte/gesch/ascensie`. **Nieuw erbij:** `Codex.mysteries[*].scherven` + `Codex.erfprinsOntmoetingen`. De Codex (`slayit_codex`) wordt **nooit** gewist door een run-einde — alleen `slayit_save_v1` verdwijnt via `wisSave()` in `nederlaag()` (2476) en bij eind-overwinning. Daardoor is de mysterie-as de enige progressie die élke reset overleeft.

**Hoe het motiveert i.p.v. frustreert:**
- **Elk verlies = leesbare hint.** `toonEinde(false)` wordt act-bewust: in Act 2 een aparte epitaaf-pool + een **duiding-regel** die met `(mys('drops').scherven).length` meegroeit:
  - 0 scherven: „Het goud van Pappie breek je niet met staal. Iets anders is nodig. Iets dat de Erfprins vréést."
  - 1-2: „De scherven fluisteren over geléénd licht en eigen vuur. Wat brandt uit zichzelf? En wat als je het jouwe... dooft?"
  - rijp: „Alles wijst één kant op — en het voelt verkeerd. Je hele reis leerde: doof nooit je fakkel. Misschien is dát precies het punt."
- **Zichtbare voortgang.** De Codex-sectie "🜂 Onopgeloste Mysteries" toont `1 / 3 scherven` + per slot de cryptische tekst of een bron-`❓`. Zwart op wit: falen wás vooruitgang.
- **Geen softlock-frustratie.** De bestaande trage **mercy-decay** (2389-2390, −1 aegis/beurt zonder Drops) blijft als anti-softlock-vangnet: de Erfprins is de facto onverslaanbaar zonder Drops, maar nooit een harde dead-end die crasht.

**Pacing.** Baas-escalatie is de **gegarandeerde ruggengraat** (één scherf + één orakelregel per ontmoeting, ook bij verlies); events/epische vijand zijn **versnellers**. Doel: na 1 verlies wéét de speler dat er een geheim is, na ~3 ruikt hij wát het is, rond ~3-5 runs is het mysterie rijp. Alle drempels staan in data (`vereist`), niet hardcoded.

**"Opnieuw vanaf Act 1" (conflict opgelost):** facetten zijn het eens dat de Codex behouden blijft; de twijfel zit in vrijwillig vs. afgedwongen. Ik kies **strikt vrijwillig** — de bestaande "⚔️ Opnieuw afdalen"-knop (`startNieuw()`, toonEinde:3195) is al precies dit en wist alleen de run-save. **Nooit afgedwongen** (afgedwongen reset jaagt spelers weg). Scherven **blijven altijd** staan — dat ís de pijler.

**Daily-modus.** Scherven tellen wél mee voor de Codex (kennis is kennis), maar `Codex.erfprinsOntmoetingen` **niet dubbel** (de daily heeft vaste seed/held → guard op `S.daily` bij de teller, niet bij `noteerScherf`).

**Anti-doof-relikwie-edge (lookup-/edge-bugklasse uit MEMORY):** `eeuwige_lont` klemt fakkel op ≥10 en `laatste_lucifer` vlamt eenmalig op naar 50 (`zetFakkel`, 524-529). Met die relics kan `lichtNiveau()==='gedoofd'` onmogelijk worden → de unlock zou permanent geblokkeerd zijn. **Oplossing:** de rite-test accepteert óók `lichtNiveau()==='duister'` **mits een anti-doof-relikwie de stand klemt** (`heeftRelikwie('eeuwige_lont')`), zodat die builds niet uitgesloten zijn. `laatste_lucifer` is eenmalig (`S.luciferOp`), dus na verbruik kan de speler alsnog echt doven — geen aanpassing nodig, alleen documenteren.

---

## 7. Act 2-content + het dark-twist-knooppunt

Act 2 ("De Catacomben") krijgt een **eigen roster** i.p.v. opgeschaalde Act 1-slijmen. Alle vijanden volgen de bestaande `VIJANDEN`-vorm (`{naam,art,hp:[min,max],kies(v,beurt)→{naam,type,dmg/blok/hits?,doe?}}`).

### Gewone Catacomben-vijanden (4)
- **knekelrakker 🦴** hp[20,26] — `kies`: 0.6 „Botworp" aanval dmg7, anders „Rammel" dmg4 + `geefStatus(sp(),'kwetsbaar',1)`.
- **grafmot 🦋** hp[16,20] (licht-vreter, haakt op de fakkel-economie) — 0.5 „Vlamhap" `verbrandLicht(6)` + dmg3, anders „Stofwolk" dmg5.
- **waskaarsdienaar 🕯️** hp[24,28] — `beurt%2===0` „Druipen" blok8, anders „Hete Was" dmg9 + `geefStatus(sp(),'zwak',1)`.
- **krochtkruiper 👁️** hp[18,22] — leest `lichtNiveau()`: bij `duister`/`gedoofd` „Donkergreep" dmg11, anders „Schichten" dmg4 hits2. (Thematische spanning met de twist: doven maakt deze gevaarlijker — eerlijke kost voor de sleutel.)

### Elite (1, + 1 optioneel)
- **grafvorst 🪦** hp[88,96] `elite:true` — 3-staps (`beurt%3`): „Grafkou" `geefStatus(sp(),'zwak',2)` → „Beenbreker" dmg13 → „Opdelven" `voegVijandToe('knekelrakker')` (hergebruikt bestaande functie, 2246). Start „HET GRAF GEEFT NIETS TERUG."
- *(optioneel later)* **wasgolem 🗿** hp[80,88] `elite:true` — blok + doornen, lekt licht.

### Epische vijand = scherf-bewaker (1)
- **De Dovenaar 🕯️** hp[110,130] `episch:true, scherf:'drops_episch'` — eigen 4-staps script (zwaarder dan elite, lichter dan baas). Dialoog en scherf-drop: zie §3 bron 3.

### ONTMOETINGEN act-bewust maken
`kiesNodeEcht` (1315) leidt de tier nu af via `er = n.r + (huidigeAct()-1)*5`. Voeg Act 2-eigen sleutels toe (`cata_vroeg/midden/laat/zwaar`) gevuld met het nieuwe roster, en kies in de `gevecht`-case de juiste sleutel op `huidigeAct()`. Plus een `episch`-tier: `[['de_dovenaar']]`.

### Het dark-twist-knooppunt (conflict opgelost)
Facet 4 wil een apart `altaar_zwart`-node; facetten 1/2 willen de twist organisch mid-baasgevecht. **Ik laat het aparte altaar-node vallen** (vermijdt een tweede unlock-pad, extra node-type-enums in `NODE_ICONEN`/`NODE_NAMEN`/`FAKKEL_KOST` — precies de lookup-crashplekken uit MEMORY — en het risico dat de twist búíten de epische baasstrijd "afgehandeld" wordt). De **enige** twist-trigger is de detector in `beginSpelerBeurt` (§4): bewust doven in de Erfprins-troonzaal. Dat is epischer en houdt het knooppunt-aantal beheersbaar.

Wel toevoegen voor de **epische vijand**: een zeldzaam **`episch`-nodetype** in `genereerKaart` (1176-1180), alleen Act 2, `rij>=8`, gewicht ~6; plus `NODE_ICONEN.episch='💀'`, `NODE_NAMEN.episch='Episch'`, `FAKKEL_KOST.episch=8`; en in `kiesNodeEcht` een `case 'episch': startGevecht(kiesUit(ONTMOETINGEN.episch),'episch',n.r); break;`. **Audit-checklist (MEMORY lookup-bugklasse):** elk nieuw type-string (`episch`) moet in `NODE_ICONEN`, `NODE_NAMEN`, `FAKKEL_KOST` én een `case` zitten — anders `undefined`-crash in `renderKaartScherm`/`fakkelKost`.

**Cruciale guard:** zet `.episch`/`.scherf` **nooit** op `de_erfprins` (de baas), anders dropt de baas een scherf én triggert hij episch-beloning. Houd `baas` en `episch` strikt gescheiden in de `gevechtGewonnen`-takken.

---

## 8. Art-plan (dropbare to-do)

Thomas levert PNG's in `assets/karakters/`, `assets/events/`, `assets/metgezellen/`; daarna draaien (MEMORY: asset-optimalisatie vóór deploy): `python .claude/verwijder_dambord.py` → `python .claude/converteer_webp.py`. De engine laadt de `.webp` automatisch (`laadKarakterAfbeelding`/`laadEventAfbeelding`/`laadMetgezelAfbeelding`). Zet bij elk nieuw element ook de prompt in de juiste `PROMPTS.txt` (MEMORY).

**Catacomben-vijanden** (`assets/karakters/<id>.png`, idle verplicht, `_death` aanbevolen):
- `knekelrakker.png` (+`_death`)
- `grafmot.png` (+`_death`)
- `waskaarsdienaar.png` (+`_death`)
- `krochtkruiper.png` (+`_death`)

**Elite:**
- `grafvorst.png` (+`_attack`, +`_cast`, +`_hit`, +`_death`)
- *(optioneel)* `wasgolem.png` (+`_block`, +`_hit`, +`_death`)

**Epische scherf-bewaker:**
- `de_dovenaar.png` (+`_attack`, +`_cast`, +`_hit`, +`_death`)

**Mysterieuze-figuur-events** (`assets/events/<id>.png`):
- `de_blinde_lantaarnman.png`
- `de_spiegel_van_roet.png`

**Drops-poses** (`assets/metgezellen/<id>_<pose>.png` — `drops.png` idle bestaat al):
- `drops_attack.png` (schroeit / aegis-vreet)
- `drops_hit.png`
- `drops_death.png` (vlucht / dooft)
- `drops_reveal.png` (het ontwaak-moment — grote glow-pose voor `signatuurMoment('drops_reveal',...)`)

**Template voor toekomstige metgezellen** (zelfde poses-set, zodra hun mysteries volgen):
- `vlamwachter_attack/_hit/_death/_reveal.png`, `mosgeest_attack/_hit/_death/_reveal.png`

> Volume: ~7 karakters (waarvan 2 met 4-5 poses) + 2 events + 4 Drops-poses. **Plan in batches**, WebP-pijplijn per batch vóór deploy.

---

## 9. Gefaseerd bouwplan (klein → groot, vroeg testbaar)

**Fase 0 — Datafundament (geen zichtbare gameplay, breekt niets).**
1. `MYSTERIES`-register in `data.js` met alleen `drops` (scherf-`id`'s + `vereist` + `eindreveal`), `window.MYSTERIES` exposen.
2. `Codex.mysteries`/`erfprinsOntmoetingen` aan de defaults + saniteer-lus; helpers `mys/noteerScherf/noteerRite/mysterieRijp/isOntgrendeld/ontgrendelMetgezel`. `S.dropsOntwaakt` in `nieuwSpel`/`laadSpel`. *Afh.: geen. Testbaar via console (`noteerScherf('drops','drops_baas')` → persisteert).*

**Fase 1 — De gate (maakt "meant to fail" mechanisch waar).**
3. In `volgendeAct` (3103-3106) én `devSprongAct2` (3093): vervang gratis Drops door `if (isOntgrendeld('drops') && !heeftMetgezel()) geefMetgezel('drops')`. Voeg een dev-flag toe die alle drops-scherven + rite zet, zodat testers de twist meteen kunnen oefenen. *Afh.: Fase 0. Nu is Act 2 metgezel-loos en de Erfprins de facto onwinbaar — de mercy-decay garandeert geen softlock.*

**Fase 2 — Baas-escalatie (de gegarandeerde ruggengraat; volledige lus al speelbaar).**
4. `UITSPRAKEN._erfprins.orakel[]` + `.gedoofd`. Teller `erfprinsOntmoetingen++` bij baas-start (`startGevecht`, guard). Orakelregel + `noteerScherf('drops','drops_baas')` in `toonBaasIntro`/`checkErfprinsFase`. *Afh.: Fase 0-1. Vanaf hier verzamelt elke run gegarandeerd ≥1 scherf.*

**Fase 3 — De reveal (de climax werkt).**
5. Detector in `beginSpelerBeurt` (§4) + `revealDrops()` (`baasFaseMoment`+`signatuurMoment`+`geefMetgezel`+`ontgrendelMetgezel`). Anti-doof-relikwie-edge in de rite-test. *Afh.: Fase 0-2. Nu is de complete lus eind-tot-eind speelbaar met alléén de baas-bron — vroeg integraal testbaar.*

**Fase 4 — Signposting (mysterie wordt leesbaar).**
6. `toonEinde(false)` act-bewust + duiding-regel. Codex-sectie "🜂 Onopgeloste Mysteries". *Afh.: Fase 0. Maakt falen leesbaar; verfijnbaar los van de mechaniek.*

**Fase 5 — Versnellers (rijkdom, optioneel voor de kern).**
7. Twee figuur-`EVENTS` + `toonEvent`-filter (`S.act>=2` + scherf-niet-gevonden). *Afh.: Fase 0.*
8. `episch`-nodetype (alle vier de tabellen + `case`) + `ONTMOETINGEN.episch` + scherf-drop in `gevechtGewonnen`. *Afh.: Fase 0 + Fase 6-roster.*

**Fase 6 — Act 2-roster (eigen vijanden).**
9. 4 gewone + 1 elite (`VIJANDEN`) + `cata_*`-tiers + act-bewuste mapping in `kiesNodeEcht`. *Afh.: geen (kan parallel); De Dovenaar nodig vóór Fase 5.8.*

**Fase 7 — Art + polish.**
10. Art-batches (§8) door de WebP-pijplijn; tuning van `vereist`-aantal en escalatie-tempo na playtest met een verse speler.

---

## 10. Open vragen voor Thomas

1. **Scherf-aantal:** ik koos **3 vereist + rite** (baas gegarandeerd, figuur/episch als versnellers), tunebaar in `MYSTERIES.drops.vereist`. Akkoord, of liever strakker (2) / langer (5)?
2. **Mag run 1 überhaupt zonder Drops gewonnen worden** (skill-ceiling via mercy-decay) of is het canon dat de eerste Erfprins-run áltijd verloren gaat? Dit bepaalt de decay-tuning.
3. **Twist-trigger:** ik koos de **organische gedoofd-detector** (epischer, écht ontdekt) en liet het aparte "Gedoofd Altaar"-node vallen. Akkoord, of wil je tóch een leesbaardere expliciete keuze-knop ("Doof je fakkel — voorgoed?") op het baasscherm zodra het mysterie rijp is?
4. **Lichtere metgezellen:** krijgen vlamwachter/mosgeest elk hun eigen (lichter) mysterie met een **eigen rite-soort**, of delen sommige de licht-twist? (Aanrader: elk een thematisch eigen rite.)
5. **Erfprins ná unlock:** zodra Drops via de twist is ontwaakt, verschijnt hij voortaan gratis bij Act 2 (grind eenmalig) — wil je dat de Erfprins dan een **nieuwe fase/mechaniek** krijgt (Drops sneller wegwuiven, tweede aegis-bron) zodat de winst niet triviaal wordt? (Apart balans-ontwerp.)
6. **Tweede Act 2-elite (wasgolem)** nu meenemen of pas later? Eén elite (grafvorst) volstaat voor variatie.


## Beslissingen (Thomas, 16 juni 2026) — open vragen beslecht
- **Scherven:** 3 + de rite (tunebaar in MYSTERIES.drops.vereist).
- **Twist-trigger:** organisch doven in de troonzaal (geen knop).
- **Erfprins zonder metgezel WINBAAR maar EXTREEM moeilijk** (skill-ceiling via mercy-decay) — niet onmogelijk.
- **Multi-metgezel is leidend (NIET enkel Drops):** de "aegis-vreter" is een ROL/capability, geen hardcoded id==="drops". Meerdere metgezellen kunnen de Erfprins counteren (elk op hun manier); Drops is de eerste invulling. => de aegis-erosie uit B2 generiek maken (companion-capability i.p.v. Drops-specifiek), en de baas-gate check op "heeft een geschikte counter-metgezel OF genoeg skill".
- **Elke metgezel een eigen, lichter mysterie met eigen rite** (bv. Vlamwacht ontwaakt door je fakkel net HELDER te houden — spiegelbeeld van Drops dark twist). De MYSTERIES-template draagt dit (verschil = vereist.length + #bronnen).
- **Geparkeerd:** Erfprins-herbalans NA unlock + 2e Act 2-elite (wasgolem) — later.


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
