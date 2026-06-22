# ACT 2-PROMPTBIBLIOTHEEK — HET ARCHIEF

*Canonieke bron voor alle nieuwe Act 2-content (kaarten, relikwieën, vijanden, events).
Naar analogie met de Act 1-bib, gelijkgetrokken op naam-stijl, toon, prompt-format en
lengte. Engelse painterly prompts, Nederlandse flavor/namen. De per-categorie
`assets/*/PROMPTS.txt` verwijzen hiernaar.*

## Overzicht

| Categorie | Aantal | Art-slots |
|---|---|---|
| Kaarten | **15** (4 Slachter · 4 Gifmagiër · 3 Thoverk · 4 neutraal) | `assets/kaarten/<id>.webp` |
| Relikwieën | **10** (3 gewoon · 4 ongewoon · 2 zeldzaam · 1 episch) | `assets/relikwieen/<id>.webp` |
| Vijanden (extra) | **3** (alle gewoon) | `assets/karakters/<id>.webp` |
| Events | **4** (alle `huidigeAct()>=2`-gegate) | `assets/events/<id>.webp` |

**Thematische rode draad:** *namaak, indexering, doorslag, bureaucratie.* Alles in Het
Archief is een tweedehands kopie — doorslagen, was-zegels, stempels, dossiers,
index-kaarten, contracten. Het koude blauw-grijze "systeem-licht" is het enige licht
behalve jouw warme fakkel (de enige warme, onkopieerbare bron). De Copycat steelt je
beste werk; daarom dragen de stevige aanvallen bewust de `kopie:`-vlag (9 kaarten),
terwijl situationele/buff/AoE-kaarten ongevlagd blijven.

**Geschrapt bij synthese:** `blauwdruk` (kaart) — was een pure reskin van `etterende_wonden`,
voegde geen mechaniek/identiteit toe. **Id-veiligheid:** kaart-ids `doorslag_kaart` /
`het_origineel_kaart` botsen NIET met de vijanden `doorslag` / `het_origineel` (aparte
naamruimtes KAARTEN vs VIJANDEN); alle 32 ids geverifieerd vrij.

> **Totaal nieuwe art-slots: 32** (15 kaarten + 10 relikwieën + 3 vijanden + 4 events).
> Bestandsnaam = id, lowercase, `.png` → de pipeline maakt `.webp`. Draai
> `converteer_webp.py` mee bij elke drop. Iconen blijven emoji tot de `.webp` er is.

---

## 1. Kaarten — prompts
> Liggend ~1024x576, geen transparantie. Accent per type: aanval = crimson/ember,
> vaardigheid = steel blue/teal, kracht = arcane violet.

```
############ ACT 2 — HET ARCHIEF ############
Namaak / index / doorslag / bureaucratie. Scenes ademen doorslagen,
stempels, was-zegels, inkt, index-kaarten, perkament en dossiers. Koud
blauw-grijs systeem-licht waar passend; de warme fakkel/ember blijft de
enige warme lichtbron. Verder identiek aan de Act 1-stijl: 3 alinea's,
accent per type.

#### NEUTRAAL ####

== doorslag_kaart.png ==
Painterly dark fantasy card art for a deckbuilder game, hand-painted
concept art with expressive brushwork and dramatic lighting, palette of
deep purples and charcoal with crimson and ember red accents. NOT
photorealistic, no photo, no 3D render. Landscape composition, subject
centered, no text, no frame, no UI.
Scene: a sheet of blue carbon paper pressed by a heavy iron stylus, an
identical ghost-imprint of a blade-stroke bleeding through onto a second
page beneath, faint duplicated ink lines glowing.
Painted illustration only, rich color, clean readable silhouette.

== stempel.png ==
[type-accent: steel blue/teal] Scene: a massive bronze bureaucratic stamp
slamming down onto a bone-coloured dossier, a wax-red wound of ink
splattering outward, the imprint of a grimacing seal burned into the
parchment.

== rode_tape.png ==
[type-accent: steel blue/teal] Scene: long strips of blood-red ribbon and
seal-wax binding a struggling armoured arm to a stone filing cabinet, knots
of tape cinched tight, cold clerical light glinting on the wax.

== archiefstof.png ==
[type-accent: steel blue/teal] Scene: a thick drifting cloud of pale grey
archive dust settling over a stack of ancient bone-bound ledgers, motes
catching cold blue-grey light, the topmost ledger half-buried and protected.

#### DE SLACHTER #### (accent crimson/ember)

== afgekeurd.png ==
Scene: a heavy executioner's cleaver crashing down through a red-stamped
paper document, the word-shaped ink seal torn apart, embers and shredded
parchment exploding from the cut.

== in_drievoud.png ==
Scene: three identical sword-strokes layered in fanned offset like
carbon-copies of one another, the rearmost blades fading to pale washed-out
ink, glowing red trails marking each duplicate cut.

== originele_handtekening.png ==
Scene: a sword driven point-first through the centre of an ornate
wax-sealed contract, the blood-red signature flourish at the base flaring
with ember light, a single authentic stroke no forgery could match.

== geindexeerd.png == [type-accent: arcane violet]
Scene: an endless wall of index card slots glowing faint violet, one card
sliding home with a soft arcane flare, ghostly catalogue numbers etched
into the brass tabs around it.

#### DE GIFMAGIËR #### (accent crimson/ember + sickly green ink undertone)

== naaperij.png ==
Scene: a venom-dripping stylus mimicking the exact curve of a snake's fang,
a second mirrored fang of green ink copying the strike a half-beat behind,
droplets of poison doubling as they fall onto a dossier.

== inktklerk_steek.png ==
Scene: a long iron quill-nib stabbing forward like a dagger, a bead of
luminous green poison-ink swelling at its tip, a smeared signature trailing
behind the thrust.

== registerrot.png == [type-accent: steel blue/teal + green rot undertone]
Scene: a towering shelf of rotting bone-bound files, luminous green mould
creeping ledger to ledger, spores drifting through cold archive light as
the entire register decays at once.

#### THOVERK — DE KOLENDRUÏDE #### (accent crimson/ember, warm torchlight)

== perkamentslag.png ==
Scene: a curled sheet of ancient parchment whipping forward like a blade,
its razor edge slicing the air, thorny brambles growing along its torn
margin and catching warm torchlight.

== doorslag_doornen.png ==
Scene: gnarled thorned roots erupting from a cracked filing-cabinet drawer,
mimicking the shape of grasping hands, lashing at a faltering shadowy foe,
warm ember rim-light on the barbs.

== kolenstempel.png == [type-accent: steel blue/teal + one warm ember glow]
Scene: a glowing coal-hot iron stamp pressed into a sheet of cold blue-grey
parchment, the smouldering seal-mark searing through and curling thorny
embers from the burn.

== het_origineel_kaart.png ==
Scene: a single vivid thorn-wreathed branch wielded like a club, fully
saturated and warmly lit, while pale washed-out duplicate copies of it fade
into the dark behind, the original unmistakably the brightest.
```

### Bouw-data kaarten (voor `data.js KAARTEN`)

| id | naam | klasse | effect (kost·zeld·type → werking; up) | kopie: | flavor |
|---|---|---|---|---|---|
| `doorslag_kaart` | Doorslag | neutraal | 1·ongewoon·aanval · dmg 6 (up 8); zet vlag 'doorslag' → eerstvolgende aanval deze beurt speelt 1× extra af | `{soort:'aanval',veld:'dmg'}` | Druk hard genoeg en de tweede pagina onthoudt alles wat de eerste deed. |
| `stempel` | Stempel | neutraal | 1·gewoon·vaardigheid · kw 2, zw 1 (up kw 3, zw 2) | `{soort:'zwak',veld:'zw'}` | Eén klap van het zegel en je bent officieel een geval. |
| `rode_tape` | Rode Tape | neutraal | 1·ongewoon·vaardigheid · zw 1, kw 1, n 2 (up zw 2, kw 2, n 3); geef Zwak+Kwetsbaar en `t.blok -= n` | — | Niets beweegt meer zodra de juiste vier formulieren ontbreken. |
| `archiefstof` | Archiefstof | neutraal | 1·gewoon·vaardigheid · blok 6, trek 1 (up blok 9) | — | Onder genoeg stof wordt elk dossier onaantastbaar. |
| `afgekeurd` | Afgekeurd | slachter | 1·ongewoon·aanval · dmg 8, bonus 6 (up dmg 11, bonus 8); +bonus als doelwit Kwetsbaar | `{soort:'aanval',veld:'dmg'}` | Het stempel viel al. Wat ik nu doe is gewoon de afhandeling. |
| `in_drievoud` | In Drievoud | slachter | 1·gewoon·aanval · dmg 4 ×3 (up dmg 6); `reeksAanval(t,dmg,3)` | `{soort:'aanval',veld:'dmg'}` | Eén voor het archief, één voor de baas, één voor jou — en jij krijgt de slechtste kopie. |
| `originele_handtekening` | Originele Handtekening | slachter | 2·zeldzaam·aanval · dmg 16, kr 2 (up dmg 20); +2 Kracht als nog géén aanval deze beurt gespeeld | `{soort:'aanval',veld:'dmg'}` | Een echte handtekening kun je natrekken, maar nooit navoelen. |
| `geindexeerd` | Geïndexeerd | slachter | 1·ongewoon·kracht · n 2 (up n 3); status 'geindexeerd' → per herhaalde aanval-hit n Blok | — | Wie eenmaal in de index staat, wordt door het systeem beschermd — voor zolang het duurt. |
| `naaperij` | Naäperij | gifmagier | 1·ongewoon·aanval · dmg 7, gif 4 (up dmg 9, gif 6); was doelwit al vergiftigd → nogmaals `gif` | `{soort:'aanval',veld:'dmg'}` | Het wezen bootst je dosis na, en de na-aper doseert altijd te gul. |
| `inktklerk_steek` | Inktsteek | gifmagier | 0·gewoon·aanval · dmg 4, gif 2 (up dmg 5, gif 4) | `{soort:'aanval',veld:'dmg'}` | De klerk schrijft je naam in inkt — en de inkt is gif. |
| `registerrot` | Registerrot | gifmagier | 1·zeldzaam·vaardigheid · gif 3 (up gif 4); alle vijanden +gif, +1 extra per reeds-vergiftigde | — | Eén verrot dossier en de hele kast schimmelt mee. |
| `perkamentslag` | Perkamentslag | thoverk | 1·gewoon·aanval · dmg 8, dr 1 (up dmg 11, dr 2); +Doornen | `{soort:'aanval',veld:'dmg'}` | Onderschat een vel perkament niet: de rand snijdt dieper dan een mes. |
| `doorslag_doornen` | Naäpende Wortels | thoverk | 1·ongewoon·aanval · dmg 6, bonus 5 (up dmg 8, bonus 7); +bonus als doelwit Zwak OF Kwetsbaar | `{soort:'aanval',veld:'dmg'}` | De wortels leren je trucjes en spelen ze harder terug. |
| `kolenstempel` | Kolenstempel | thoverk | 1·ongewoon·vaardigheid · licht 3, kr 2, dr 1 (up licht 2); verbrand licht → +Kracht +Doornen | — | Het zegel van de Kolendruïde brandt door elk dossier heen — onuitwisbaar. |
| `het_origineel_kaart` | Het Origineel | thoverk | 2·zeldzaam·aanval · dmg 12, maal 2 (up dmg 16); +maal per Doornen die je hebt | `{soort:'aanval',veld:'dmg'}` | Kopieer maar raak — het origineel slaat altijd net iets harder. |

*Type-mix: 8 aanval, 5 vaardigheid, 2 kracht. Waarden afgeleid van Act 1-equivalenten op
gelijke kost/zeld zodat de Copycat-fase-cap (22/28/36) niet wordt overschreden.*

---

## 2. Relikwieën — prompts
> Lijststijl (sjabloon ongewijzigd). Vierkant ~512x512, geen transparantie. Palet koud
> blauw-grijs "clerical light"; warme gloed alleen thematisch. Intensiteit volgt
> GEWOON→EPISCH.

```
########## ACT 2 — HET ARCHIEF (nieuwe relikwieën) ##########

was_zegel.png        GEWOON — a thick blob of blood-red sealing wax pressed
                     onto a torn strip of yellowed parchment, a heavy bone
                     signet ring beside it, the wax faintly warm and
                     glistening, one cold blue-grey clerical light raking
                     across it; quiet, modest, no float
stempelkussen.png    GEWOON — a square wooden-framed ink stamp pad, felt
                     soaked deep crimson-black, a drip of ink rolling off the
                     corner, a heavy iron rubber-stamp lying half on it, cold
                     light, faint wet sheen; humble desk object, no glow
doorslagpapier.png   GEWOON — a fanned stack of thin blue carbon-copy sheets,
                     the top page a ghost-imprint pressed through from above,
                     faint dark-ink smudges, cold clerical light, the
                     duplicate text barely legible and doubled; flat, papery
dossierklem.png      ONGEWOON — a large heavy iron bulldog-clip clamping a
                     thick bundle of tagged bone-files and contracts, biting
                     down hard, a faint cold-blue gleam along its sprung jaw,
                     loose index-tabs trembling as if just snapped shut
rode_lint.png        ONGEWOON — long loops of crimson bureaucratic ribbon (red
                     tape) coiling and tangling in mid-air around an unseen
                     bundle, knotting itself into endless slow bows, cold light
                     behind making the red glow deep wine-dark; alive, slow
inktpot.png          ONGEWOON — a squat black glass inkwell brimming over, a
                     slow tongue of sickly green-black ink crawling up over the
                     rim against gravity into a serpent-shape, a bone quill
                     upright in it, cold light on the wet meniscus; alive
indexkaart.png       ONGEWOON — a single yellowed index-card floating free from
                     an open card-catalogue drawer, faint cold-blue shorthand
                     writing itself across it line by line, a hair-thin beam of
                     pale clerical light reading down it; a quiet revelation
carbon_afdruk.png    ZELDZAAM — a sheet of dark carbon-paper floating upright,
                     the impression of a thorned shield pressed through it
                     glowing cold-blue, ghost-duplicates fanning out behind like
                     after-images, paper-dust spiralling off; levitates, repeats
verlopen_contract.png ZELDZAAM — an ancient sealed contract scroll hovering and
                     TEARING itself slowly down the middle, the broken red wax
                     seal floating apart, expired clauses dissolving into cold
                     motes, a faint WARM spark escaping the rip; rends on its own
het_grootboek.png    EPISCH — a colossal ancient ledger floating open on a
                     velvet altar cushion in cold god-rays, endless names
                     writing themselves in glowing pale-blue ink, a storm of
                     index-tabs and red wax seals orbiting it, one WARM golden
                     line threading among the cold; reverent clerical power
```

### Bouw-data relikwieën (voor `data.js RELIKWIEEN`)

| id | naam | icoon | zeld | tekst (effect) | hergebruik-patroon |
|---|---|---|---|---|---|
| `was_zegel` | Het Was-zegel | 🔴 | gewoon | Begin elk gevecht met 8 Blok. | `anker` |
| `stempelkussen` | Het Stempelkussen | 🟥 | gewoon | Vijanden beginnen elk gevecht met 1 Kwetsbaar. | `scherpe_dolk` |
| `doorslagpapier` | Doorslagpapier | 📄 | gewoon | Trek op je eerste beurt 1 extra kaart. | `klavertje` |
| `dossierklem` | De Dossierklem | 📎 | ongewoon | Aan het begin van je beurt: +4 Blok. | `mosamulet` |
| `rode_lint` | Het Rode Lint | 🎀 | ongewoon | Vijanden beginnen elk gevecht met 1 Zwak. | `bottenfluit` |
| `inktpot` | De Bodemloze Inktpot | 🖋️ | ongewoon | Wanneer je Gif toedient, dien je 1 extra toe. | IDENTIEK aan `smaragden_ring` |
| `indexkaart` | De Verloren Index-kaart | 🗂️ | ongewoon | Je leest vijand-intenties zelfs in het donker. | IDENTIEK aan `fluisterende_schedel` |
| `carbon_afdruk` | De Carbon-afdruk | 🩹 | zeldzaam | Aan het begin van je beurt: 3 Blok én 1 Doornen. | `mosamulet`+`houten_been` |
| `verlopen_contract` | Het Verlopen Contract | 📜 | zeldzaam | Zou je sterven: blijf op 1 HP en wis alle Zwak/Kwetsbaar. Eénmalig per run. | `feniksveer`-tak + status-reset |
| `het_grootboek` | Het Grootboek | 📕 | episch | Bij oppakken: +12 Max HP. Genees 8 HP na elk gevecht. | `bloedrobijn`+`brandend_bloed` |

*Geen enkele relikwie introduceert een nieuwe status → geen STATUSINFO-entry nodig. 9/10
zijn puur data-only via bestaande id-patronen; alleen `verlopen_contract` leunt op de
bestaande `feniksveer`-verbruiktak.*

---

## 3. Vijanden (extra) — prompts
> Append onder de bestaande kopieerhel-roster in `assets/karakters/PROMPTS.txt`. Facing
> LEFT, ~90% van 1024x1024. `stempelaar`/`dossierwurm` = transparant. **`spiegelwachter`
> = doorschijnend glas → EFFEN ZWARTE achtergrond** (zelfde uitzondering als echo/schaduw).

```
stempelaar.png   a gaunt clerk-construct fused with a giant brass-and-iron
                 approval stamp where one arm should be, hunched and grey,
                 ink-stained parchment robes hung with red wax seals and
                 dangling carbon-copy slips, a flat smudged face like an
                 over-printed form, the stamp-head glowing cold blue-grey,
                 identical duplicated stamp-marks floating around it. Cold
                 bureaucratic menace, everything rubber-stamped and second-hand.

dossierwurm.png  a long segmented archive-worm built from hundreds of stacked
                 bone-yellow dossier sheets and curled parchment scrolls bound
                 with red string and wax seals, sharp torn paper-edges along its
                 flanks like blades, a blunt eyeless head of crumpled rolled
                 documents with a circular ink-stained maw, rusted index-tabs
                 jutting from each segment, rearing to bite. Cold blue-grey light
                 glows from between the pages. Derivative, bureaucratic horror.

spiegelwachter.png  (doorschijnend glas — EFFEN ZWARTE achtergrond) a tall
                 sentinel of polished black mirror-glass shaped like a faceless
                 armoured guardian, its surface a dark reflective pane throwing
                 back warped cold reflections of an unseen attacker, hairline
                 cracks webbing across its chest, shards of broken mirror
                 orbiting it each showing a different stolen pose, a single cold
                 blue-grey glow behind the glass where a face should be, sharp
                 glass edges. Reflective, hollow, derivative.

de_deadline.png  a gaunt clock-tower creature, a hunched figure whose torso is a
                 cracked iron hourglass leaking black sand, clock-hands for
                 fingers, a face of a stopped clock, overdue red stamps and frayed
                 calendar pages fluttering off it, cold blue-grey light.
                 Relentless, oppressive — time running out.

de_inktvlek.png  a low crawling ink-blot ooze given malice, a spreading puddle of
                 glistening black-and-sickly-green ink rising into a vaguely
                 reaching shape, dripping corrosive droplets, smeared signatures
                 dissolving in its body, cold light on the wet sheen. Formless,
                 corrosive, derivative.

de_redacteur.png a stern censor-construct in ink-stained clerical robes, one hand
                 a giant pair of black redaction-shears, the other a dripping
                 black marker, its own face half blacked-out with redaction bars,
                 strips of censored paper hanging off it, cold blue-grey light.
                 Cold, controlling, bureaucratic.

de_archivaris.png  (elite) a towering head-archivist, a tall robed figure buried
                 under and fused with endless shelves of tagged bone-files and
                 ledgers growing from its back like a mountain, spectacles stacked
                 over its eyes and a stamp in each hand, cold authoritative
                 blue-grey light, index-tabs and wax seals orbiting. Inevitable,
                 all-remembering — the bureaucracy made flesh.

POSE-STATES (volledige conventie + richtlijnen: assets/karakters/PROMPTS.txt → "POSE-STATES"):
  - stempelaar / dossierwurm / spiegelwachter / de_deadline / de_inktvlek / de_redacteur =
    GEWOON → maak minstens <id>_death (een uiteenvallende kopie). _attack/_hit vallen terug op de basis.
  - de_archivaris = ELITE → meerdere poses: <id>_attack + <id>_hit + <id>_death + <id>_cast
    (z'n dossier BIJWERKEN) + optioneel <id>_block (zich indekken achter opgestapelde dossiers).
  Zelfde wezen + stijl + kijkrichting (LINKS) + transparant; verander alleen de "Pose:"-regel.
```

### Bouw-data vijanden (voor `data.js VIJANDEN`, in het kopieerhel-blok)

| id | naam | art (placeholder) | hp | gedrag (kies) | UITSPRAKEN |
|---|---|---|---|---|---|
| `stempelaar` | De Stempelaar | 🖋️ | [25,30] | beurt 0 = 'Goedkeuringsstempel' (`geefStatus(sp(),'kwetsbaar',2)`); daarna 60% 'Tegendruk' (dmg 7 + Kwetsbaar 1) anders 'Inktstapel' (blok 8) | start: „Even afstempelen, graag." / „In drievoud. Met merk." · dood: „...het zegel... breekt..." |
| `dossierwurm` | De Dossierwurm | 🐛 | [28,34] | elke 2e beurt 'Inrollen' (+Kracht 1 +Doornen 2); anders 55% 'Papierbeet' (dmg 6 ×2) anders 'Bladsnede' (dmg 10) | start: „Geregistreerd. Geklasseerd." / „Jouw blad ontbreekt nog." · dood: „...uit... het... archief..." |
| `spiegelwachter` | De Spiegelwachter | 🔮 | [24,29] | beurt 0 = 'Oppoetsen' (blok 9); daarna `echo=min(10,laatsteSpelerDmg)`; ≥5 → 'Weerkaatsing' (dmg echo) anders 'Glasscherf' (dmg 7) | start: „Ik geef enkel terug." / „Sla mij — sla jezelf." · dood: „...het glas... barst..." |
| `de_deadline` | De Deadline | ⏳ | [26,32] | escaleert: elke 4e beurt 'Verlengen' (+Kracht 1), anders 'Termijn' (dmg 6 + min(beurt,6)·2) | start: „De termijn verstreek. Lang geleden." / „Tik. Tik. Tik." · dood: „...eindelijk... uitstel..." |
| `de_inktvlek` | De Inktvlek | 🩸 | [20,25] | 55% 'Inktspat' (dmg 5 + Gif 3), anders 'Uitvloeien' (Gif 4) | start: „Alles wordt vlek." / „Ik kruip in je dossier." · dood: „...opdrogen..." |
| `de_redacteur` | De Redacteur | ✂️ | [24,29] | 50% 'Wegstrepen' (dmg 6 + verwijder 6 Blok), anders 'Censuur' (dmg 9) | start: „Dat keuren we niet goed." / „Doorgehaald. Volgende." · dood: „...geschrapt... ikzelf..." |
| `de_archivaris` (elite) | De Archivaris | 📚 | [80,88] | elke 2e beurt 'Bijwerken' (+Kracht 2); anders 60% 'Dossier-dreun' (dmg 12), anders 'Indexeren' (blok 10) | start: „Ik vergeet NIETS." / „Elke regel telt mee." · dood: „Mijn... archief... brandt..." |

*Alle gewone-tier, leunen op bestaande haken (`S.gevecht.laatsteSpelerDmg` leest
`het_origineel` al). Voeg toe aan `ONTMOETINGEN.act2`: stempelaar→midden+laat;
dossierwurm→laat+zwaar; spiegelwachter→midden+zwaar.*

---

## 4. Events — prompts
> Sjabloon ongewijzigd; palet koud blauw-grijs systeem-licht, warme fakkel als enige
> warme licht. Liggend ~1024x576, onderwerp VERTICAAL GECENTREERD.

```
DE SCENES (ACT 2 — HET ARCHIEF):

onafgewerkte_dossier.png
  Scene: an open half-written dossier on a stone lectern in a cold archive
  alcove, the candidate's name inked at the top in an alien hand, the lower half
  still blank, a goose-quill resting in wet ink beside a guttering wax seal; cold
  blue-grey clerical light, one small WARM torch-flame off to the side as the only
  warm light, subject vertically centred.

kopieermachine.png
  Scene: a hulking mechanical copying-organ of brass gears, ink-rollers and
  stacked parchment deep in a cold records-vault, a single sheet feeding in one
  side and a paler duplicate sliding out the other, drifting ink-mist; cold
  systeem-light on the brass, one warm torch-flame reflected dimly in an ink-roller
  as the only warmth, subject vertically centred.

naamloze_klerk.png
  Scene: a faceless clerk behind a stone stamp-counter, where a face should be only
  smoothed blank parchment, a wax-stamp raised over a ledger, pneumatic file-tubes
  and tagged bone-folders behind the wicket; cold clerical light, one warm
  torch-flame glinting on the wet wax as the only warm light, figure centred.

verloren_origineel.png
  Scene: a corridor of pale mirror-image carbon-copy parchments receding into cold
  blue-grey infinity, and at the centre ONE single sheet glowing warm and golden,
  faintly alive, lifting at one corner as if breathing; the duplicates bleed grey
  and lifeless, the warm sheet the only warm light, subject vertically centred.
```

### Bouw-data events (voor `data.js EVENTS`, alle `toon: () => huidigeAct() >= 2`)

| id | titel | icoon | opties (samengevat) |
|---|---|---|---|
| `onafgewerkte_dossier` | Het Onafgewerkte Dossier | 📂 | (1) **Teken het af** — +25 goud, 50% vloek `pijn` in dek · (2) **Wis je naam uit** (`kan: S.hp>8`) — −7 HP + `zetFakkel(20)` · (3) Laat liggen |
| `kopieermachine` | De Kopieermachine | 🖨️ | (1) **Dupliceer een kaart** (`kan: dek<30`) — `S.dek.push(nieuweKaart(c.id))` · (2) **Dupliceer je goud** (`kan: goud>=20`) — 70% +40% / anders −25% · (3) Laat ratelen |
| `naamloze_klerk` | De Naamloze Klerk | 🖋️ | (1) **Laat je stempelen** — +14 HP + smeed willekeurige kaart · (2) **Vraag je dossier** — 55% relikwie (else +50 goud); anders −5 HP + vloek · (3) Loop weg |
| `verloren_origineel` | Het Verloren Origineel | 📜 | (1) **Neem het origineel** — 55% relikwie/+4 Max HP / else −8 HP · (2) **Brand in je fakkel** (`kan: fakkel<100`) — `zetFakkel(30)` · (3) Laat liggen |

*Alle opties leunen op bestaande event-haken (`verliesHpBuitenGevecht`,
`geneesHpBuitenGevecht`, `willekeurigRelikwie`/`geefRelikwie`, `nieuweKaart`+`S.dek.push`,
`zetFakkel`). Bij `willekeurigRelikwie()===null` → goud-compensatie (zoals `altaar`).*

---

## Bouwnotities (voor wanneer we dit in `data.js` bouwen)

**A. `data.js`-toevoegingen:** 15 kaarten in `KAARTEN` (volg het `executie`-patroon voor
`up`/`tekst`/`speel`); held-toewijzing via de bestaande pool-`forEach`-arrays (regel
~622-636) — slachter: afgekeurd/in_drievoud/originele_handtekening/geindexeerd · gifmagier:
naaperij/inktklerk_steek/registerrot · thoverk: perkamentslag/doorslag_doornen/kolenstempel/
het_origineel_kaart · de 4 neutrale in géén pool. · 3 vijanden in het kopieerhel-blok +
hun `UITSPRAKEN` + `ONTMOETINGEN.act2`-tiers. · 10 relikwieën in `RELIKWIEEN` (`tekst` =
plain string, geen closure). · 4 events in `EVENTS` met `toon: () => huidigeAct() >= 2`.

**B. `kopie:`-vlaggen (Copycat-stelbaar) — 9 kaarten:** alle stevige aanvallen
`{soort:'aanval',veld:'dmg'}` (afgekeurd, in_drievoud, originele_handtekening, naaperij,
inktklerk_steek, perkamentslag, doorslag_doornen, het_origineel_kaart, doorslag_kaart) +
`stempel` als `{soort:'zwak',veld:'zw'}`. **Bewust ongevlagd** (situationeel/buff/AoE):
rode_tape, archiefstof, geindexeerd, registerrot, kolenstempel.

**C. STATUSINFO (Lookup-bugklasse — VERPLICHT of crash):** twee nieuwe statussen vereisen
een `STATUSINFO`-entry: `doorslag` → `{naam:'Doorslag',icoon:'📑',goed:true,uitleg:'De
eerstvolgende aanval die je speelt, speel je een tweede keer af.'}` en `geindexeerd` →
`{naam:'Geïndexeerd',icoon:'🗄️',goed:true,uitleg:'Elke aanval die je deze beurt herhaalt,
geeft zoveel Blok.'}`. Overige effecten hergebruiken bestaande statussen.

**D. Kleine `game.js`-hooks (~5 regels elk; nul-hook-alternatief bestaat):** `doorslag_kaart`
(per-beurt vlag → volgende aanval 1× extra), `geindexeerd` (status-tick → Blok per herhaalde
hit), `originele_handtekening` (vlag `aanvalGespeeldDezeBeurt`), `verlopen_contract` (id in de
`feniksveer`-verbruiktak + status-reset). Wil je game.js niet raken → herschrijf die 3 kaarten
naar onvoorwaardelijke reuse.

**E. Pipeline per drop:** PNG op `<id>.png` → werkt meteen (png-fallback) →
`verwijder_dambord.py` (alleen cut-outs: vijanden — NIET kaarten/relikwieën/events, die zijn
scènes/objecten op donker) → `converteer_webp.py`. `spiegelwachter` op zwarte achtergrond
genereren (glas-uitzondering).
