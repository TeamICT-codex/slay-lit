# Drops de Witte — ontwerp ("De Vonk die Twee Wegen Terug Kent")

> Uit een 10-agent ontwerp-jurypanel (6 concepten · 3 juryleden · synthese). De jury
> zette unaniem Concept 1 (**De Weigering**) én Concept 2 (**De Laatste Sprong, andersom**)
> in hun top-2 en vroeg om een fusie. Resultaat: **één wonder, twee geheime poorten**, met
> de stille grief-beats uit C3/C6 en de tekst + Copycat-haak uit C5 eraan geënt.
> Kernregel die alle juryleden bewaakten: **geen enkele verborgen voortgangsteller** — geen
> scherven, geen marker, geen checklist. De rouw is dat het spel zich gedraagt alsof hij
> écht voorgoed weg is.

## Thema-anker
"Trouw is niet te indexeren", exact gespiegeld op de fakkel-spine. Eerste vondst = **DOVEN**
(donker als sleutel, "voor het licht dooft"). Terugkeer = **WEIGEREN te doven** óf
**gedoofd-sterven-en-tóch-terugkeren** — dezelfde fakkel, omgekeerd, zodat het rijmt zonder
te herhalen. Gandalf de Grijze → de Witte: hij viel in de machine en keert geascendeerd,
wit en stralend terug. "Dieper = donkerder" wordt éénmalig omgekeerd: liefde maakt de
afdaling lichter.

## 1. De grief (cross-run, géén teller)
Alles hangt aan de bestaande gate `Codex.gevallen.includes('drops')`:
1. **Het lege as-silhouet** — in elk gevecht waar Drops kon meekomen toont `#metgezel-zone`
   nu een gedimde hond-omtrek (hergebruik het `drops_geest`-portret op ~12% opacity),
   niet-doelbaar, geen HP, geen tooltip, geen tekst. De afwezigheid ÍS de tekst. Je mist ook
   mechanisch zijn 6-bijt elke beurt.
2. **Zaadje-nul + wegdovende pootafdruk** — de eerste keer dat je ná zijn dood doft: één wit
   vonkje dat meteen sterft (max 1× ooit). Daarna bij elke doof-keuze een gloeiende
   pootafdruk 🐾 in de as die over ~1,5s wegdooft. Nooit klikbaar, nooit becommentarieerd.
   Op het reünie-moment dooft hij voor het **eerst niet** (de payoff).
3. **De wrede orakel-regel** — in de Erfprins-zaal fluistert de baas één keer:
   *"Ik heb je hond geïndexeerd. Dossier gesloten."* (UITSPRAKEN._erfprins, alleen als
   `gevallen.includes('drops') && !isOntgrendeld('drops_wit')`). De vijand claimt de winst —
   dat is de wond die de reünie heelt.

De grief moet **≥1 volledige run** landen vóór de terugkeer kan vuren.

## 2. De unlock — twee geheime poorten (één boolean `Codex.drops_wit_keerde`)
**POORT A — DE WEIGERING (primair, poëtisch).** Terug in de Erfprins-zaal; je fakkel zakt
naar duister/gedoofd en het spel toont de doof-prompt die je hem ooit deed vinden. Maar je
brandt actief **HELDER** (light-kaart/relikwie, of expliciet "niet doven") — je doet het
tegenovergestelde van wat je leerde. Detectie in `zetFakkel` (naast `checkDropsOntwaak`):
fakkel STIJGT vanuit duister/gedoofd terwijl een levende Erfprins in beeld is, `drops`
gevallen, `drops_wit` nog niet ontgrendeld, en 'gedoofd' deze beurt nooit bereikt.
*Waarom het verrast:* er is GÉÉN "bewaar de vonk"-knop; het spel werkt het gebaar tegen. Je
verwacht "weer doven" — dit is precies andersom en niemand zei het. Robuust: accepteer
**elk** licht-pad dat de fakkel doet stijgen (incl. de Eeuwige-Lont-klem, net als
`checkDropsOntwaak` al een uitzondering heeft).

**POORT B — DE LAATSTE SPRONG, ANDERSOM (vangnet, episch).** Latere run, fakkel volledig
gedoofd (`S.fakkel===0`), de dodelijke slag landt, `S.hp→0`, en Feniksveer/Contract zijn op
of afwezig — een écht dieptepunt. Nieuwe hoogste-prioriteit dood-weigeringstak in de
`doeSchade`-keten, vóór Feniksveer/Contract, via helper `magWitTerugkeren()`. Het scherm
dooft naar absoluut zwart en uit dat zwart springt Drops de Witte tussen jou en de
doodslag. *De redding ÍS de reünie.* `S.hp` herstelt naar ~40% maxHp.

Geen van beide poorten gebruikt het MYSTERIES/scherven-register — bewust, zodat de unlock
in code aantoonbaar anders aanvoelt dan de eerste.

## 3. De reünie (beide → één `revealDropsWit(g)`, model `revealDrops`)
- **Poort A:** de vonk die je weigerde te doven scheurt los uit je fakkel en wórdt hem; uit
  dezelfde plek van zijn laatste sprong vouwt een wit-zilveren geest-hond open, licht van
  binnenuit. Hij legt even zijn kop tegen de hand die de vonk vasthield. De zaal kleurt
  eenmalig **WIT** i.p.v. zwart.
- **Poort B:** scherm naar absoluut zwart (hergebruik de dark-twist black-out), één tel
  stilte, dan een groeiende wit-zilveren vonk → vier poten → DROPS DE WITTE springt het
  beeld in; het zwart scheurt open in wit, je fakkel slaat vanzelf weer aan (hij ÍS nu het
  licht).
- **Gedeelde tekst** (3 beats met stiltes, via baasFaseMoment + melding):
  *"De vonk die nooit doofde, was nooit van de fakkel." … "Het was van hem." … "En hij was van jou."*
- **Pootafdruk-payoff:** de pootafdruk dooft nu NIET; een tweede, een derde — een spoor
  wit-zilveren poten naar de lege metgezel-zone, en het as-silhouet vult zich van onderaf
  met wit licht.
- **Copycat-haak** (rijmt op het offer-moment "CLASSIFICEREN… TROUW: GEEN PRECEDENT"):
  baasFaseMoment "HERINDEXEREN…" → faalt: *"TROUW: NOG STEEDS GEEN PRECEDENT."*
- **Codex-epiloog:** het portret transformeert stil van ✝/grijs-geest naar 🤍/wit-zilver;
  "Voorgoed heen" wordt *"Voorgoed heen — en toch teruggekeerd. De diepte gaf terug wat ze nam."*

## 4. Mechaniek — Drops de Witte
Nieuwe `METGEZELLEN.drops_wit` (kopie van `drops`), `zeld:'episch'`, `art:'drops_wit'`,
icoon 🤍, maxHp 26→**34**, rol 'breker/lichtdrager'. **GEEN opoffering-blok** — hij is al
door de dood; deze keer blijft hij (de emotionele betaling: je hoeft hem nooit meer te
offeren).
- **Beurt-hook:** bijt de baas (bij voorkeur de Copycat) voor een witklap die **vijand-blok
  negeert** (onkopieerbaar) + geeft jou **3 Blok**.
- **Duisternis voedt hem:** zijn klap schaalt met hoe donker je fakkel is — in 'gedoofd'
  **verdubbelt** zijn bijt. Hij is "het licht dat niet van de fakkel komt".
- **Blind-malus-immuniteit:** zolang hij leeft zie je alle intent-getallen óók bij fakkel 0
  (klem `intentTekst` op 'helder', net als fluisterende_schedel/indexkaart), én de
  +50%-goud van gedoofd blijft. Je rouw om de doof-keuze wordt een beloning.
- **Tegen de Copycat:** elke beurt dat hij leeft −1 kaart-diefstal (copyKracht−1, floor 0).
- **Persistentie:** na de eerste reünie `ontgrendelMetgezel('drops_wit')`; daarna komt hij
  vrij mee via de bestaande flow. De onaangekondigde terugkeer gebeurt **precies één keer
  per save** (`Codex.drops_wit_keerde`).

## 5. Art
- `assets/metgezellen/drops_wit.webp` — wit-zilveren geascendeerde geest-hond, doorschijnend,
  sereen, trouwe ogen, de ember-kool nu een kern van **koud wit vuur** dat van binnenuit
  gloeit; groter/imposanter dan de levende Drops; licht dat geen schaduw werpt maar er een
  verdrijft.
- **Poses (naar analogie met de levende Drops + de hoofdpersonages; de engine stuurt ze al aan):**
  `drops_wit_attack` (de witklap — speelt af bij zijn blok-negerende beet, data.js-beurt-hook),
  `drops_wit_hit` (klap opvangen — via `verliesHp`), en een **signatuur-pose**
  `drops_wit_terugkeer` (de sprong terug in het beeld — `revealDropsWit` speelt 'm 2D+3D af op
  de reünie; het geascendeerde spiegelbeeld van `drops_death`). Volledige prompts in
  `assets/metgezellen/PROMPTS.txt`.
- Codex-portret: hergebruik `drops_wit` (vervangt het ✝/grijze `drops_geest`).
- **Geen** `drops_wit_death` (kan niet meer sterven). **Geen** 8-traps geest-varianten.
- Pootafdruk + as-silhouet = CSS/emoji-fx (🐾 + `drops_geest` op 12% opacity) — geen nieuwe asset.
- Prompt toevoegen aan `assets/metgezellen/PROMPTS.txt` (conform prompt-bij-nieuw-art).

## 6. Code-haken (verifieer de exacte regelnrs vóór de bouw — workflow-schatting)
- `METGEZELLEN.drops_wit` in `js/data.js` (~1068) — witklap negeert blok, duisternis-schaling
  via `lichtNiveau()`, +3 Blok, copyKracht-afbouw, ZONDER opoffering.
- **Poort A:** `checkDropsWitWeigering()` in `zetFakkel` (~game.js:576-604), naast
  `checkDropsOntwaak`.
- **Poort B:** hoogste-prioriteit dood-weigeringstak in `doeSchade` isSpeler-blok
  (~game.js:894-912), vóór Feniksveer/Contract, gegate door `magWitTerugkeren()`.
- `revealDropsWit(g)` — kloon van `revealDrops` (~game.js:1088).
- Blind-immuniteit: `heeftMetgezel('drops_wit')`-guard in `intentTekst` (~game.js:1956).
- Codex ✝→🤍: twee render-plekken (rooster ~2246, metgezelboek ~2285) — ternary op
  `isOntgrendeld('drops_wit')` die `data-mgart` van `drops_geest` naar `drops_wit` wisselt.
- `Codex.drops_wit_keerde` (boolean, migreren rond game.js:178-181) via `bewaarCodex()`.
- Wrede orakel-regel in `UITSPRAKEN._erfprins` (~data.js:1202), getoond in baas-spreek-logica.
- **MYSTERIES/scherven NIET gebruiken** (bewust).
- **Lookup-bugklasse:** `'drops_wit'` moet in elke OBJ[key]-lookup bestaan vóór render
  (METGEZELLEN, laadMetgezelAfbeelding, SCHAARSTE_LABEL['episch'] bestaat al — verifiëren).

## 7. Open keuzes voor Thomas
1. **Poort-prioriteit:** A primair (agency + spiegel) + B als genadig vangnet — of beide
   volwaardig naast elkaar? (Aanbeveling: A primair, B vangnet.)
2. **Getallen** drops_wit: maxHp 34 · witklap 6 (×2 gedoofd) · 3 Blok/beurt · Poort-B-herstel
   40% maxHp → **playtest-kalibratie** (mechaniek weegt zwaarder dan rauwe getallen).
3. **Codex-epiloog-diepte:** alleen de stille ✝→🤍-transformatie, of óók "het portret stapt
   uit zijn lijst" bij Codex-openen met gedoofde fakkel?
4. **Duisternis-schaling buiten de Copycat?** Ook in Act 3 (DICKtator) / latere bazen, of
   Copycat-specifiek met terugval op puur Blok elders?
5. **Pootafdruk-frequentie:** elke doof-keuze (sterk maar vaak) of alleen gedoofd-bij-een-baas
   (zeldzamer, geladener)? En waar toont het as-silhouet (overal / alleen baas-zalen)?
6. **Robuustheid Poort A:** welke licht-bronnen tellen exact als "weigering" — vastleggen
   zodat de fragielste trigger niet stil onbereikbaar wordt.
