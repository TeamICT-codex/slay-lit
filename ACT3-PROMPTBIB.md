# ACT 3-PROMPTBIBLIOTHEEK — HET SLACHTBLOK

*Canonieke bron voor alle Act 3-content (vijanden, baas, achtergronden, kaarten,
relikwieën, events). Zelfde opzet als `ACT2-PROMPTBIB.md`: Engelse painterly prompts,
Nederlandse flavor/namen, bouw-data-tabellen voor de latere `data.js`-bouw. Art kan
volledig NU gegenereerd worden; het spel haakt pas in zodra Act 3 gebouwd wordt
(`ACTS_MAX` 2→3). Alle 42 ids zijn gecheckt tegen `data.js` — botsingvrij.*

## Overzicht

| Categorie | Aantal | Art-slots |
|---|---|---|
| Vijanden | **12** (8 gewoon/zwaar · 2 elite · 1 episch · 1 baas) + poses | `assets/karakters/<id>.webp` |
| Baas-extra's | intro-plaat + signature "het Decreet" | `assets/karakters/de_dicktator_intro/-_decreet.webp` |
| Achtergronden (ontbrekende slots) | **6** (event · rust · schat · beloning · overwinning · nederlaag) | `assets/achtergronden/Act 3 achtergronden/` |
| Kaarten | **16** (15 speelbaar + 1 vloek) | `assets/kaarten/<id>.webp` |
| Relikwieën | **10** (3 gewoon · 4 ongewoon · 2 zeldzaam · 1 episch) | `assets/relikwieen/<id>.webp` |
| Events | **4** (alle `huidigeAct()>=3`-gegate) | `assets/events/<id>.webp` |

**Thematische rode draad:** *het schavot van het systeem.* Waar Act 1 de pluimstrijker
was en Act 2 de namaak, is Act 3 het eindstation van de bazenladder: **de demagoog**.
Het Slachtblok is de ontslagronde als openbaar spektakel — schuld wordt doorgeschoven,
menigten klappen op bevel, processen zijn shows, en bovenaan de trap wacht **de
DICKtator**, die niet steelt zoals de Erfprins maar **afneemt, voorgoed** (permanente
kaartverwijdering) en je dek volpompt met **vloeken** — die jij leert terugwerpen.
Satire-echo's uit de proloog: de getypte **jeugddroom komt hier terug** (PROLOOG.md,
vastgeklikte beslissing) en "u bent vrijgesteld" krijgt zijn gezicht.

**De bestaande platen zetten de wereld al neer** (13 achtergronden gestaged in
`assets/achtergronden/Act 3 achtergronden/`): zwart gebarsten bazalt met **gesmolten
rood dat door de naden gloeit**, bloedrode stormluchten vol **violette bliksem**, een
gotische spitscitadel met een rood baken, **kolossale standbeelden van de tiran zelf**,
kettingen en schavot-platforms. Alle nieuwe art ijkt daarop.

---

## 0. STIJLKADER — het Act 3-anker (in élke prompt)

**Basis-lock (identiek aan Act 1/2 — opent én sluit elke prompt):**

```
Stylized painterly digital illustration for a dark fantasy card game,
hand-painted fantasy concept art with expressive visible brushwork, rich
colors and soft painted shading. NOT photorealistic, not a photograph,
no photo textures, no 3D render.
[...onderwerp...]
Painted illustration style only. [transparantie/canvas-regel per categorie]
No text, no frame, no UI.
```

**Het Act 3-palet (vervangt de Act 1-warmte / Act 2-kilte):**

```
Palette of black basalt and black iron, molten ember-red light glowing UP
from cracks and vents BELOW (harsh hellish footlight — the light of the
slaughter-block), storm-violet lightning accents in the darkness, and
arrogant polished GOLD for everything the regime touches (banners, armor,
seals, statues). The world itself burns harsh and red; the hero's torch
remains the only SOFT amber light.
```

- **Onderlicht is de handtekening van Act 3**: figuren worden van ónder aanglicht
  (theaterlicht, tribunaallicht) — Act 1 had warme zij-rand, Act 2 koud klerkenlicht.
- **Goud = het regime.** Hoe dichter bij de macht, hoe meer goud. Gewone wezens dragen
  hooguit één gouden detail (insigne, zegel); de garde en de baas baden erin.
- **Violet-bliksem** spaarzaam als accent (de storm boven de citadel).
- De **vloek-motieven**: brandmerken, zegels, kettingen, doorgehaalde namen.

**Vijand-conventies (identiek aan Act 1/2):** single full-body creature, centered,
facing **LEFT** (richting de held), isolated on a fully transparent background, no
ground/shadow/text/frame/UI, vult ~90% van een 1024x1024 canvas, mét marge (nooit tot
de randen). Begin elke prompt met het **unieke silhouet**, niet met "a creature".
Mechaniek-signalen tussen haakjes mag je in beeld brengen. Elke pose = een **aparte
losse afbeelding** — nooit een grid/collage/sheet.

**Transparantie-uitzondering:** `de_fluisteraar` (rook-randen) op **EFFEN ZWARTE
achtergrond** genereren (zelfde alpha-nabewerking als echo/spiegelwachter). De rest
gewoon transparant; dambord/witte bg is oké — de pijplijn poetst het weg.

**POSE-STATES (conventie van Act 1/2, ongewijzigd):**
- **GEWONE wezens** → minstens `<id>_death` (themabewust uiteenvallen — zie de
  death-tabel per wezen hieronder). `_attack`/`_hit` vallen terug op de basis.
- **ELITES** (`de_rechter`, `de_hofnar`) **+ EPISCH** (`het_spreekgestoelte`) →
  `_attack` + `_hit` + `_death` + `_cast` (het 'maak'-moment) — de rechter ook `_block`.
- **BAAS** (`de_dicktator`) → `_attack` + `_cast` + `_hit` + `_death` + `_intro`
  (titelkaart-plaat) + `_decreet` (signature — zie zijn blok).
- Zelfde wezen + stijl + kijkrichting (LINKS) + zelfde sessie; verander **alleen** de
  "Pose:"-regel. Het Bestiarium toont álle poses (tik-cyclus), dus elke pose is content.

**Pipeline per drop:** PNG op `<id>.png` → werkt meteen (png-terugval) →
`verwijder_dambord.py` (cut-outs: vijanden) → `converteer_webp.py` → cache-bump bij de
commit. Kaarten/relikwieën/events/achtergronden zijn scènes (géén cut-out).

---

## 1. Vijanden — prompts (12)

> Elke prompt = basis-lock + Act 3-palet + onderstaand silhouet-blok. Volgorde =
> oplopend in dreiging. Differentiatie-tabel onderaan — let op: zes wezens zijn
> humanoïde; forceer per stuk een ander silhouet, materiaal en accentkleur.

```
--- de_omroeper.png   (De Omroeper — schreeuwt het regime de zaal in; buff-roeper) ---
  A gaunt town-crier construct whose right arm has FUSED into a huge verdigris
  bronze speaking-horn, mouth stretched impossibly wide mid-proclamation, a
  tattered regime tabard with one gold seal, spittle and glowing red sound-waves
  blasting LEFT out of the horn (his decree makes his allies stronger). Molten
  red footlight from below, one thin violet storm-accent.
  Accent: verdigris bronze horn + glowing red sound-waves.

--- het_klapvee.png   (Het Klapvee — de menigte als één wezen; sterker in groep) ---
  A shambling MOUND-creature fused from dozens of clapping hands and identical
  blank grinning faces stacked like a human haystack, all palms mid-applause,
  a few hands waving tiny regime pennants, no single head — the crowd IS the
  body. Pathetic alone, menacing in mass. Molten red underlight catches every
  identical smile.
  Accent: pale flesh-grey mass + tiny gold pennants.

--- de_zondebok.png   (De Zondebok — draagt andermans schuld; vangt klappen op) ---
  A gaunt pitch-black goat-beast standing upright under a crushing load of
  strapped-on satchels, ledgers and stones labelled with OTHERS' guilt, a crude
  WHITE TARGET painted on its chest, heavy chains from its collar leading off-
  frame to unseen masters, sad knowing eyes. It did nothing — it carries
  everything. Molten red footlight, one violet accent.
  Accent: white painted target on black fur + rust-brown chains.

--- de_aanklager.png   (De Aanklager — wijst je aan; stapelt Kwetsbaar) ---
  A hunched prosecutor-wraith whose entire right arm tapers into ONE enormous
  accusing INDEX FINGER of bleached bone, pointing damningly LEFT, a scroll of
  charges unrolling from its other hand down to the floor, robes stitched from
  verdict-slips. The pointing finger glows hot at the tip like a brand.
  Accent: bone-white finger + wax-red verdict ribbons.

--- de_fluisteraar.png   (De Fluisteraar — stopt de vloek 'Laster' in je stapel) ---
  (EFFEN ZWARTE achtergrond — rook-randen) A faceless cloaked whisperer, hood
  utterly empty except a faint violet glow, LONG RIBBONS OF SMOKE curling from
  where a mouth should be — the smoke forming half-legible slanderous words
  drifting LEFT toward an unseen ear, fingers to where lips should be in a
  'hush' gesture. Robes dissolve into smoke at the hem.
  Accent: violet whisper-smoke on near-black robes.

--- de_vaandeldrager.png   (De Vaandeldrager — het vaandel geeft bondgenoten Kracht) ---
  An armoured standard-bearer holding aloft a HUGE crimson war-banner bearing
  the stern GOLDEN FACE of the tyrant (stylised, laurel-crowned, self-satisfied),
  the cloth catching molten updraft, the bearer's own face hidden behind a
  featureless iron slit-visor — he is nothing, the banner is everything.
  Accent: crimson banner + the golden woven face.

--- de_ophitser.png   (De Ophitser — gooit fakkels; brandt jóuw licht weg) ---
  A wiry manic agitator mid-throw, hurling a STOLEN burning torch LEFT, a
  bandolier of more stolen torches across its chest, ash-grey skin cracked with
  ember veins, a too-eager grin — it burns what others need for warmth. The
  thrown torch trails harsh red fire (not the hero's soft amber).
  Accent: ember-crack skin + a bandolier of stolen flames.

--- de_gouden_garde.png   (De Gouden Garde — zware muur; loyaal tot in het absurde) ---
  A towering ceremonial guard in ABSURDLY over-polished gold parade armor,
  mirror-bright and impractical, a huge gilded halberd planted like a flag, a
  featureless golden mask with no eye-holes at all (loyalty needs no sight),
  medals covering the breastplate like fish-scales. Molten red underlight
  blazing off every gilded edge.
  Accent: blinding parade-gold + red underlight reflections.

--- de_rechter.png   (ELITE — De Rechter: showproces; telegrafeert het VONNIS) ---
  A monumental judge-executioner hybrid enthroned in standing position, wine-red
  robes with a black iron collar-yoke, one hand a massive BLACK IRON GAVEL the
  size of an anvil, the other holding brass SCALES with a golden thumb pressing
  one pan down (the verdict was never in doubt), a blindfold worn PUSHED UP onto
  the forehead — he sees exactly what he wants. Molten red footlight, violet storm
  behind the shoulders.
  Accent: wine-red robes + black iron gavel + cheating gold thumb.

--- de_hofnar.png   (ELITE — De Hofnar: lacht je uit; vloeken als grappen) ---
  A sinister court jester in regime colours (black, crimson, gold), bells
  replaced with TINY GRINNING SKULLS, one legging patterned with doorgehaalde
  namen (struck-through names), juggling three glowing CURSE-SIGILS like
  knives mid-arc toward the LEFT, an enormous painted smile over a mouth that
  is not smiling. Court-approved cruelty.
  Accent: crimson-gold motley + sickly green curse-sigils.

--- het_spreekgestoelte.png   (EPISCH — Het Spreekgestoelte: de levende katheder) ---
  A LIVING gilded PODIUM-PULPIT on a scaffold of black iron, grown into a
  creature: carved mouths opening across its golden front panel all speaking at
  once, banner-poles jutting from its back like a crown, a storm of glowing
  slogan-ribbons spiralling out over an unseen crowd, two heavy manuscript-lecterns
  raised like fists. It has absorbed decades of speeches — and it speaks with HIS
  voice. Violet lightning cracks above it; molten red floods up from the grate below.
  Accent: regime-gold panels + a vortex of glowing slogan-ribbons.

--- de_dicktator.png   (BAAS — de DICKtator, heerser van het Slachtblok) ---
  The gilded demagogue-king of the slaughter-block: a broad-chested tyrant in
  gold-drowned armor, an extravagant swept GOLDEN MANE of hair like a lion's
  combover crowned by a laurel he clearly awarded himself, an ABSURDLY LONG
  crimson sash-banner (like an endless tie) spilling from his throat down past
  his feet and off-frame, conspicuously SMALL hands in oversized golden
  gauntlets, one tiny finger POINTING damningly LEFT ("JIJ."), medals he minted
  for himself armouring the chest, a smirk of total unearned certainty. Behind
  his shoulders the faint suggestion of banner-poles and violet storm. Harsh
  molten red underlight; he is genuinely menacing AND faintly ridiculous — the
  ladder's final form.
  Accent: self-awarded gold + the endless crimson sash + storm-violet.
```

**POSE-STATES van de baas** (zelfde sessie/stijl/links; alleen de Pose-regel wisselt):

```
de_dicktator_attack — de wijzende executie-uithaal. Pose: a sweeping downward
  CHOP of the arm as if his pointing finger were an axe-blade, the crimson sash
  whipping, molten sparks erupting where the gesture lands (his word IS the blade).
de_dicktator_cast — het DECREET voorbereiden / vloeken zaaien. Pose: both small
  gauntlets raised theatrical-wide, a swarm of glowing sickly-green curse-seals
  and stamped decrees spiralling up around him, head thrown back mid-tirade.
de_dicktator_hit — geraakt: de laurier verschuift. Pose: staggering back a half-
  step, one hand catching the slipping self-awarded laurel, the smirk cracking
  into indignant fury — HOW DARE YOU.
de_dicktator_death — de val van de demagoog. Pose: collapsing to one knee on the
  block itself, the golden mane deflating, the endless crimson sash tangling
  around him like a noose, self-minted medals raining off, the underlight dying
  to embers — small hands, at last, empty.
de_dicktator_intro — TITELKAART-PLAAT (mag als scène, zoals de_erfprins_intro):
  the DICKtator high on the slaughter-block platform above a sea of clapping
  klapvee-silhouettes, colossal statues of himself flanking, violet lightning
  crowning the citadel — pure rally-spektakel, hij vult het frame.
de_dicktator_decreet — SIGNATURE ("JIJ. BENT. ONTSLAGEN."): het permanent-
  verwijderen-moment. Pose: he holds up a glowing DECREE bearing the ghostly
  image of a PLAYING CARD and tears it slowly in half with two tiny hands, the
  card's light guttering out between the halves, his grin at maximum smugness —
  grander and crueller than _attack; dit is zijn pronkstuk. (Wordt afgespeeld op
  het kaart-executie-moment, zoals de_erfprins_plagiaat bij de Roof.)
```

**DEATH-POSE per wezen** (`<id>_death` — themabewust uiteenvallen, doffe kleuren):

| wezen | sterft zó |
|---|---|
| de_omroeper | de hoorn barst; zijn laatste schreeuw komt er als dunne rook uit — dan klapt hij dicht als een leeggelopen blaasbalg |
| het_klapvee | de handen stoppen één voor één met klappen, de glimlachjes vallen af als maskers, de hoop zakt uiteen tot losse, stille handen |
| de_zondebok | de kettingen knappen, de last glijdt af — hij zakt bevrijd neer, de witte roos op zijn borst dooft (bijna een genade) |
| de_aanklager | de reuzenvinger verkruimelt van de punt af tot botstof; de aanklachtenrol waait leeg weg |
| de_fluisteraar | de rook trekt de kap ín in plaats van eruit — het gewaad valt plat neer, leeg; het laatste woord onafgemaakt |
| de_vaandeldrager | het vaandel vat vlam en het gouden gezicht smelt tot druppels; de drager knielt en houdt de kale stok vast |
| de_ophitser | zijn eigen bandolier vat vlam; hij dooft in zijn gestolen vuur tot een as-silhouet |
| de_gouden_garde | het parade-goud loopt als was van hem af; eronder blijkt het harnas hol — het kletterend in elkaar |
| de_rechter | de weegschaal slaat eindelijk de éérlijke kant op — het gewicht sleurt hem om; de hamer valt en splijt zijn eigen sokkel |
| de_hofnar | de geverfde glimlach bladdert af; de schedelbelletjes rinkelen één voor één stil; hij buigt — écht, één keer |
| het_spreekgestoelte | alle monden schreeuwen door elkaar tot de gouden panelen barsten; de slogan-linten vallen als dode slierten |
| de_dicktator | zie POSE-STATES hierboven (de val van de demagoog) |

**DIFFERENTIATIE-TABEL** (zes humanoïden — forceer het verschil):

| wezen | silhouet | materiaal | accent | houding |
|---|---|---|---|---|
| de_omroeper | dun + reuzenhoorn-arm | brons/vodden | verdigris + rood geluid | schreeuwt voorover |
| de_aanklager | gebogen + reuzenvinger | bot/gewaad | botwit + waszegel-rood | wijst |
| de_fluisteraar | vormloos/rokerig | rook/stof | violet | fluistert, vinger op 'lippen' |
| de_vaandeldrager | rechtop + reuzenbanier | ijzer/doek | karmozijn + gouden gezicht | draagt |
| de_ophitser | pezig, mid-worp | as-huid/leer | ember-aders | gooit |
| de_gouden_garde | breed, torenhoog | spiegelgoud | goud + rood schijnsel | staat als muur |

### Bouw-data vijanden (voor `data.js VIJANDEN` — vertrekwaarden, playtest-tunebaar)

| id | naam | art | hp | gedrag (kies) | UITSPRAKEN start / dood |
|---|---|---|---|---|---|
| `de_omroeper` | De Omroeper | 📯 | [22,27] | beurt 0 'Afkondiging' (alle vijanden +1 Kracht); daarna 60% 'Schreeuw' (dmg 8) anders 'Oproep' (blok 7) | „HOORT! De heerser spreekt door mij!" / „...wie roept er... nu om..." |
| `het_klapvee` | Het Klapvee | 👏 | [26,32] | 'Applaus' (dmg 4 + 2 per andere levende vijand); alleen over → 'Aarzelend klapje' (dmg 3) | „*klapt omdat de rest klapt*" / „...mag ik... stoppen...?" |
| `de_zondebok` | De Zondebok | 🐐 | [18,24] | dreiging-mechaniek: vangt 50% van je klappen op anderen op; zelf 'Kopstoot' (dmg 6). Bij dood: alle andere vijanden +1 Kracht ("de schuld is weggedragen") | „Ik heb het niet gedaan. Ik doe het nooit." / „...eindelijk... niet mijn schuld..." |
| `de_aanklager` | De Aanklager | ☝️ | [24,29] | 'Beschuldiging' (dmg 5 + Kwetsbaar 1); elke 3e 'Requisitoir' (dmg 4 + Kwetsbaar 2 + Zwak 1) | „JIJ daar. Ja, JIJ." / „...bezwaar... toegewezen..." |
| `de_fluisteraar` | De Fluisteraar | 🌫️ | [20,26] | om de beurt 'Laster' (vloek `laster` in je AFLEG); anders 'Steek in de rug' (dmg 9) | „Ze zeggen dingen over je..." / „...wie fluistert er... over mij..." |
| `de_vaandeldrager` | De Vaandeldrager | 🚩 | [28,34] | begin van zíjn beurt: alle andere vijanden +1 Kracht ('Het vaandel hoog'); zelf 'Vaandelstoot' (dmg 8). Prioridoelwit | „Het gezicht op het doek ziet álles." / „...het doek... scheurt..." |
| `de_ophitser` | De Ophitser | 🔥 | [23,28] | 55% 'Fakkelroof' (dmg 4 + `zetFakkel(-6)` — hij brandt je LICHT weg); anders 'Opruiing' (+1 Kracht zelf + 1 willekeurige bondgenoot) | „Brandt het al? Het moet branden!" / „...zo koud... ineens..." |
| `de_gouden_garde` | De Gouden Garde | 🛡️ | [34,40] | 'Gouden muur' (blok 12) · 'Hellebaardslag' (dmg 12) · elke 3e 'Formatie' (+Metaalhuid 2) | „Voor de heerser. Wat de vraag ook was." / „...het goud... was hol..." |
| `de_rechter` | De Rechter | ⚖️ | [86,94] elite | 'Bewijslast' (Kwetsbaar 1 + Zwak 1 op jou); elke 3e beurt 'VONNIS' (dmg 8 + 4 per Zwak/Kwetsbaar-stack op jou — getelegrafeerd) | „De uitspraak stond al vast. De zitting is beleefdheid." / „...in beroep... gaan ze... in beroep..." |
| `de_hofnar` | De Hofnar | 🃏 | [78,86] elite | 'Spotlied' (vloek `laster` in je TREK + zelf +1 Kracht) · 'Kwinkslag' (dmg 6 ×2) · trek jíj een vloek → hij lacht: +6 Blok | „Lach dan. Iederéén lacht." / „...die was... goed..." |
| `het_spreekgestoelte` | Het Spreekgestoelte | 🎙️ | [84,92] episch | 'Slogan' (alle: Zwak 1; zelf +2 Kracht) · 'Donderrede' (dmg 14) · 'Bijval eisen' (blok 12 + `laster` in je afleg). Spreekt met de STEM van de DICKtator (foreshadow) | „WIE MAAKTE JULLIE GROOT? — HIJ." / „...de stem... was nooit... van mij..." |
| `de_dicktator` | de DICKtator | 👑 | *(bouw-ronde)* | GEPARKEERD ontwerp: permanente kaartverwijdering ('het Decreet') + vloeken-as; de jeugddroom-regel uit de proloog keert hier terug | *(krijgt een eigen `_dicktator`-blok in UITSPRAKEN, zoals `_erfprins`)* |

---

## 2. Achtergronden — de 6 ontbrekende slots

> Liggend 16:9 (~1920x1080), géén transparantie. IJk op de bestaande platen: zwart
> gebarsten bazalt + gesmolten rode naden + bloedrode stormlucht + violette bliksem +
> kolossale tirannenstandbeelden + kettingen. Bestandsnaam-suggesties volgen de
> bestaande Act 3-reeks. **Mapping-notitie voor de bouw:** `Achtergrond ACT 3
> laadscherm` → het `kaart`-slot; `Achtergrond ACT 3 FINALE` → reserveer als
> baas-arena/finale-plaat (aparte keuze bij de bouw).

```
== Achtergrondvraagtekenencounter ACT3.webp ==  (event)
Epic dark fantasy environment, painterly concept art. A deserted gallows-square
of black cracked basalt between colossal chained statue-feet, an abandoned
proclamation-board plastered with torn gold-sealed decrees, one crossroads
lantern burning SOFT AMBER (the only gentle light) against molten red seams in
the ground and a violet storm sky. Somewhere to linger — and to choose. No
characters, no text.

== Achtergrondrust3.webp ==  (rust)
A sheltered hollow behind the FALLEN HAND of a toppled colossus statue, the
giant stone fingers curling overhead like a cave, a small campfire of soft warm
amber (not the harsh red of the world), a bedroll and a whetstone, molten light
and the storm kept OUTSIDE the hand's shadow. The only kind place in Act 3.

== Achtergrondschatkist3.webp ==  (schat)
A confiscation-vault carved into black basalt: shelves of seized treasures
tagged with little gold seals, a great iron-banded chest at center still locked
with a chain of office, molten red light seeping through floor grates, one
violet lightning-flash through a high grate. Stolen wealth waiting to be
stolen back. No characters, no text.

== Overwinningsachtergrond3gewoon.webp ==  (beloning)
The aftermath of a rally-square skirmish: a torn regime banner smouldering on
the basalt, dropped pennants and a cracked golden mask on the ground, the
molten seams cooling to ember, the violet storm calming at the horizon — a
small won silence. No characters, no text.

== Overwinningsachtergrond3episch.webp ==  (overwinning)
The slaughter-block platform itself CONQUERED: the executioner's block empty,
the great axe abandoned, chains hanging slack, banners fallen, warm amber dawn
breaking impossibly through the blood-red storm above the gothic citadel — the
first soft light this deep. Triumphant, quiet. No characters, no text.

== Achtergrond nederlaag ACT3.webp ==  (nederlaag)
The view FROM the block: extreme low angle across the scarred wood of the
slaughter-block, the shadow of a raised axe falling over it, a sea of blurred
clapping silhouettes beyond, molten red footlights and a gold-faced banner
overhead — the last thing the condemned see. Grim, final. No characters, no text.
```

---

## 3. Kaarten — prompts (15 + 1 vloek)

> Liggend ~1024x576, geen transparantie. Type-accent zoals altijd: aanval =
> crimson/ember, vaardigheid = steel blue/teal, kracht = arcane violet — bovenop het
> Act 3-palet (bazalt + gesmolten onderlicht + goud). 3-alineastructuur van de Act 1/2-bib.

```
############ ACT 3 — HET SLACHTBLOK ############
Schuld, spektakel, demagogie — en verzet. Scènes ademen schavotten,
zegels, banieren, kettingen, brandmerken en doorgehaalde namen. Gesmolten
rood onderlicht; goud = het regime; de fakkel blijft de enige zachte vlam.

#### NEUTRAAL ####

== volkswoede.png ==  [aanval]
Scene: a wave of clenched fists and broken chains surging LEFT like a single
weapon, torn regime pennants trampled underfoot, molten red underlight turning
the crowd's anger into one blade-shaped surge.

== brandstapel.png ==  [vaardigheid, steel blue/teal + vloek-groen dat verbrandt]
Scene: a pyre of glowing sickly-green curse-seals and stamped decrees going up
in CLEANSING amber flame, the green corruption crackling apart, sparks rising
as freed embers against black basalt.

== schuldverschuiving.png ==  [vaardigheid]
Scene: a glowing green guilt-seal being peeled off an armoured chest like a
label and slapped onto a shadowy accuser mid-gesture, the seal searing into
its new owner, scales of justice tipping in the background.

#### DE SLACHTER #### (accent crimson/ember)

== ontslagbrief.png ==
Scene: a heavy executioner's blade slamming down THROUGH a gold-sealed
dismissal letter pinned to a chopping block, the wax seal exploding, the words
severed mid-sentence — the axe answers the letter.

== het_hakblok.png ==  [kracht, arcane violet]
Scene: a scarred oaken slaughter-block claimed as the hero's OWN whetstone, a
sword resting across it newly sharpened, violet arcane light pooling in the old
axe-grooves — their block, your edge now.

== martelaarsbloed.png ==
Scene: a warrior's gauntleted fist squeezing a fresh wound so drops of glowing
blood fall onto a blade and IGNITE along its edge, pain traded for fire,
crimson light flaring against black iron.

== tribunaal.png ==
Scene: a sweeping arc of blade-light cutting across an entire row of shadowy
accusers at once, their verdict-scrolls shredding mid-air, benches splintering,
one great horizontal crimson stroke.

#### DE GIFMAGIËR #### (accent crimson/ember + sickly green undertone)

== lastercampagne.png ==
Scene: a flock of paper pamphlets folding themselves into wasp-like darts
mid-flight, each dripping luminous green venom, swarming LEFT toward unseen
targets, ink and poison indistinguishable.

== gifpamflet.png ==
Scene: a single innocent-looking pamphlet lying on basalt, its printed letters
crawling and rearranging into a green venomous sigil as it is read, one corner
already dissolving the stone beneath it.

== karaktermoord.png ==
Scene: a shadowy portrait-bust of a proud figure being overpainted by a poisoned
brush, the green paint eating through the face like acid, the original features
sagging — the man intact, the name destroyed.

== de_gifbeker.png ==
Scene: an ornate golden state-goblet presented on a velvet cushion, the wine
inside luminous green and gently steaming, a gold seal of office stamped on the
cup — an execution disguised as an honour.

#### THOVERK — DE KOLENDRUÏDE #### (accent crimson/ember, wortels + warm licht)

== fakkeloptocht.png ==
Scene: a single SOFT AMBER torch raised against a street of harsh red regime
fires, its gentle light spreading like a wave that dims the cruel flames,
thorny roots marching alongside like a quiet crowd.

== tegenvuur.png ==  [vaardigheid, steel blue/teal + warm ember]
Scene: a low wall of woven thorn-roots catching and swallowing a thrown regime
torch, the harsh red fire dying INTO the roots and re-emerging as small safe
amber flames along the barricade.

== de_laatste_vonk.png ==  [kracht, arcane violet + warm amber kern]
Scene: a tiny amber spark cupped in two bark-skinned hands in total darkness,
impossibly alive, violet arcane motes orbiting it — the one flame no storm, no
regime and no ledger ever put out. (De proloog-vonk, nu als kaart.)

== asregen.png ==
Scene: a slow rain of grey ash settling over a proud regime banner until its
golden face is buried and dull, while beneath the ash-layer thin ember-veins
creep like roots reclaiming the square.

#### VLOEK (vijand-bron: de Fluisteraar / de Hofnar / de DICKtator) ####

== laster.png ==  [vloek — grauw/ontkleurd zoals pijn.png, met ziek-groen accent]
Scene: a whispering mouth of grey smoke pressed against a stone ear, sickly
green ink-words worming INTO the stone and cracking it from within, everything
drained of colour except the green lie.
```

### Bouw-data kaarten (voor `data.js KAARTEN` — alle `act: 3`)

| id | naam | klasse | effect (kost·zeld·type → werking; up) | flavor |
|---|---|---|---|---|
| `volkswoede` | Volkswoede | neutraal | 1·gewoon·aanval · dmg 5, +3 per vloek in je hand (up dmg 7, +4) | Ze noemden het oproer. Het was gewoon iedereen tegelijk. |
| `brandstapel` | Brandstapel | neutraal | 1·ongewoon·vaardigheid · put álle vloeken uit je hand uit; 6 schade aan alle vijanden per verbrande vloek (up 8) | Wat ze je aansmeerden, brandt uitstekend. |
| `schuldverschuiving` | Schuldverschuiving | neutraal | 1·ongewoon·vaardigheid · put 1 vloek uit je hand uit → doelwit Zwak 2 + Kwetsbaar 2 (up 3/3); `kan` alleen mét vloek in de hand | Iemand moet hangen. Waarom jij? |
| `ontslagbrief` | Ontslagbrief | slachter | 1·ongewoon·aanval · dmg 12 (up 16); doodt dit het doelwit → trek 2 | „U bent vrijgesteld." — Nee. Jíj bent vrijgesteld. |
| `het_hakblok` | Het Hakblok | slachter | 1·ongewoon·kracht · je éérste aanval per beurt +4 schade (up +6) | Hun blok. Jouw snijplank. |
| `martelaarsbloed` | Martelaarsbloed | slachter | 0·zeldzaam·aanval · verlies 3 HP → dmg 16 (up 20) | Bloed dat je zélf geeft, kan niemand je afnemen. |
| `tribunaal` | Tribunaal | slachter | 2·gewoon·aanval · dmg 7 op alle vijanden (up 9), +2 op Kwetsbare | Iedereen tegelijk terecht. Zo doen zij het toch ook? |
| `lastercampagne` | Lastercampagne | gifmagier | 1·ongewoon·vaardigheid · alle vijanden Gif 3 + Zwak 1 (up Gif 4, Zwak 2) | Een leugen per pamflet. Een pamflet per deur. |
| `gifpamflet` | Gifpamflet | gifmagier | 0·gewoon·aanval · dmg 3, Gif 3 (up Gif 5), trek 1 | Gratis meegenomen. Duur gelezen. |
| `karaktermoord` | Karaktermoord | gifmagier | 1·zeldzaam·aanval · dmg 6; verdubbel het Gif op het doelwit, tot max +8 (up dmg 9, max +12) | De man overleeft het. De naam niet. |
| `de_gifbeker` | De Gifbeker | gifmagier | 2·ongewoon·aanval · dmg 10, Gif 6 (up 13/8) | Op uw gezondheid. Op úw gezondheid, drink. |
| `fakkeloptocht` | Fakkeloptocht | thoverk | 1·ongewoon·vaardigheid · verbrand 4 licht → 8 schade op alle vijanden (up 10) | Eén zachte vlam de straat op. Toen nog één. |
| `tegenvuur` | Tegenvuur | thoverk | 1·gewoon·vaardigheid · blok 8, Doornen 2 (up 11/3) | Hun vuur vreet. Het onze verwarmt — en prikt. |
| `de_laatste_vonk` | De Laatste Vonk | thoverk | 2·zeldzaam·kracht · einde van elke beurt: +5 licht (up +8) | Ze factureerden alles. Behalve dit. |
| `asregen` | Asregen | thoverk | 1·ongewoon·aanval · dmg 10, Zwak 1 (up 13, Zwak 2) | Alles wat opgaat in rook, komt neer als as. |
| `laster` | Laster | **vloek** | onbespeelbaar; neemt ruimte in je hand in (zoals `pijn`) | Je hebt het niet gedaan. Dat doet er niet toe. |

*Type-mix speelbaar: 8 aanval, 5 vaardigheid, 2 kracht. Vloek-synergie bewust bij
neutraal (iedereen kan de DICKtator-counter draften). Alle effecten hergebruiken
bestaande haken (uitputten, geefStatus, zetFakkel, reeks/AoE); alleen `het_hakblok`
deelt de wetsteen-vlag en `de_laatste_vonk` een eind-beurt-tick (~3 regels hook).
**Lookup-bugklasse:** geen nieuwe statussen → geen STATUSINFO-entry nodig.*

---

## 4. Relikwieën — prompts (10)

> Vierkant ~512x512, geen transparantie. Palet: bazalt-zwart + gesmolten onderlicht;
> goud = regime-buit, warm amber = verzet. Intensiteit GEWOON→EPISCH.

```
########## ACT 3 — HET SLACHTBLOK (nieuwe relikwieën) ##########

zondebokvel.png      GEWOON — a folded square of coarse black goat-hide with a
                     faded white target painted on it, worn soft at the creases,
                     one rusted chain-link still stitched to a corner, lit by a
                     modest ember glow; humble, heavy with borrowed guilt
galgentouw.png       GEWOON — a coiled length of frayed gallows-rope, the noose
                     CUT open and unraveling, molten red light through the
                     fibres, a single gold regime seal still knotted in — the
                     sentence that stopped early; quiet, ominous, no float
propagandaposter.png GEWOON — a torn regime poster half-peeled off basalt, the
                     golden face on it ripped through the smile, fresh charcoal
                     letters scrawled beneath by an unseen hand, one ember
                     lantern-glow raking across; defiant street-corner object
martelaarskroon.png  ONGEWOON — a crown of blackened thorn-iron with small warm
                     amber lights caught between the barbs like trapped sparks,
                     resting on cracked basalt, each spark pulsing gently;
                     painful and holy at once
brandmerkijzer.png   ONGEWOON — a branding iron with a seal-shaped head still
                     glowing molten red, resting across an anvil's edge, the
                     brand shaped like an accusing eye, heat-shimmer rising;
                     tool of the regime, ready to change hands
kop_van_jut.png      ONGEWOON — a carnival strongman-striker reimagined grim: a
                     gilded tyrant-bust as the striking pad, dented deep, the
                     hammer resting against it, molten light in the dents;
                     everyone gets one swing
oorkonde_van_verzet.png ONGEWOON — an illegal charter of thick parchment signed
                     in dozens of different humble hands, sealed not with wax
                     but with a smear of torch-ash, rolled loosely with a red
                     ribbon torn from a banner; warm amber light, hope on paper
de_gouden_handdruk.png ZELDZAAM — two clasped gauntlets cast ENTIRELY in gold,
                     severed at both wrists, presented on a velvet cushion —
                     a handshake with nobody attached, coins leaking from the
                     hollow wrists, cold and gleaming; generous and mutilating
het_volkslied.png    ZELDZAAM — a battered brass horn passed through many hands,
                     dents polished by use, faint golden musical notes rising
                     from its bell and turning WARM AMBER as they climb, molten
                     red light below, violet storm above; the song they banned
kroon_der_martelaren.png EPISCH — a floating crown of pure warm amber light woven
                     from dozens of small flames, each flame a remembered name,
                     hovering above a scorched slaughter-block, gold seals and
                     broken chains orbiting it, violet lightning bowing around
                     it; reverent, unbought, unbuyable
```

### Bouw-data relikwieën (voor `data.js RELIKWIEEN` — allemaal effect-uniek t.o.v. de bestaande 55)

| id | naam | icoon | zeld | tekst (effect) | hook |
|---|---|---|---|---|---|
| `zondebokvel` | Het Zondebokvel | 🐐 | gewoon | De eerste vloek die je elke run zou ontvangen, wordt geweigerd. | vlag in de vloek-geef-helper |
| `galgentouw` | Het Galgentouw | 🪢 | gewoon | Vijanden onder 10% HP sterven meteen. | drempel-check in verliesHp (executie!) |
| `propagandaposter` | De Overschreven Poster | 📰 | gewoon | Je eerste kaart elk gevecht kost 0. | vlag in startGevecht + kkost |
| `martelaarskroon` | De Martelaarskroon | 👑 | ongewoon | Telkens je een vloek trekt: +4 Blok. | tick in trekKaarten |
| `brandmerkijzer` | Het Brandmerkijzer | 🔥 | ongewoon | Je aanvallen op Kwetsbare doelwitten doen +3 schade. | check in aanvalOp |
| `kop_van_jut` | De Kop van Jut | 🔨 | ongewoon | Begin elk gevecht: het sterkste doelwit krijgt Kwetsbaar 2 + Zwak 1. | startGevecht (spiegel rode_lint) |
| `oorkonde_van_verzet` | De Oorkonde van Verzet | 📜 | ongewoon | Na elke elite-winst: +1 Max HP en +10 goud. | gevechtGewonnen (soort==='elite') |
| `de_gouden_handdruk` | De Gouden Handdruk | 🤝 | zeldzaam | Bij oppakken: +120 goud, −8 Max HP. | oppak-effect (de afkoopsom) |
| `het_volkslied` | Het Volkslied | 🎺 | zeldzaam | Begin van je beurt met ≥2 vloeken in je hand: +1 energie. | beginSpelerBeurt |
| `kroon_der_martelaren` | De Kroon der Martelaren | ✨ | episch | Telkens een vloek wordt uitgeput: 4 schade aan alle vijanden. | tick op het uitput-pad |

*Elk effect is gecheckt tegen de dedup-regel (geen functionele dubbels met de bestaande
55). De vloek-synergie-as (zondebokvel/martelaarskroon/het_volkslied/kroon_der_martelaren)
is de bewuste DICKtator-counter-build. Optioneel baas-gebonden idee, pas bij de bouw:
`de_vrijbrief` (episch) — weiger 1× per gevecht een permanente kaartverwijdering.*

---

## 5. Events — prompts (4)

> Liggend ~1024x576, onderwerp verticaal gecentreerd; één zachte amberen fakkelvlam
> als enige warme licht tegen het gesmolten rood.

```
DE SCENES (ACT 3 — HET SLACHTBLOK):

het_schavot.png
  Scene: a lone prisoner-silhouette kneeling at the slaughter-block on an empty
  night-square, the great axe leaning UNATTENDED against the block, chains slack,
  a ring of unlit regime torches around — and one soft amber lantern within
  reach; the choice hangs in the air, subject vertically centred.

de_verkiezing.png
  Scene: two great gilded ballot-urns on a basalt dais under torn bunting, both
  urns ALREADY overflowing with identical gold-sealed ballots, a heavy thumb-shaped
  shadow across the counting table — and beneath the dais, half-hidden, a small
  third slot cut crudely into the stone; molten red light, one warm lantern.

het_pamflet.png
  Scene: a hidden hand-press in a basalt cellar mid-print, fresh pamphlets hanging
  to dry on twine like washing, ink-pots and a burnt candle, the trapdoor above
  rimmed with harsh red light while the cellar itself glows soft amber; danger
  upstairs, courage down here, subject vertically centred.

de_overloper.png
  Scene: a golden-armoured guard in a shadowed archway, helmet OFF and held under
  one arm (a human face at last, tired), offering out a ring of keys and a folded
  map, his gilded halberd left leaning against the wall behind him; molten red
  square beyond the arch, soft amber torchlight on his face.
```

### Bouw-data events (voor `data.js EVENTS`, alle `toon: () => huidigeAct() >= 3`)

| id | titel | icoon | opties (samengevat) |
|---|---|---|---|
| `het_schavot` | Het Schavot | 🪓 | (1) **Bevrijd de veroordeelde** (`kan: S.hp>10`) — −8 HP; 60% relikwie, anders +40 goud + een gered gevoel · (2) **Neem de bijl** — willekeurige kaart uit je dek wordt PERMANENT verwijderd (kaartverwijdering als *keuze* — de DICKtator-echo) + +60 goud · (3) Loop stil voorbij |
| `de_verkiezing` | De Verkiezing | 🗳️ | (1) **Stem urne A** — vast: +30 goud, 50% vloek `laster` · (2) **Stem urne B** — vast: +30 goud, 50% vloek `laster` (identiek — dát is de grap; de teksten verschillen, de uitkomst niet) · (3) **De derde gleuf** (verborgen toon-eis: `S.fakkel>=60`) — je stopt je LICHT erin: −20 licht → relikwie |
| `het_pamflet` | Het Pamflet | 🖨️ | (1) **Druk mee** — smeed 1 kaart (gratis upgrade); 35% gesnapt → vloek `laster` · (2) **Verklik de drukker** — +80 goud + vloek `laster` (gegarandeerd; verraad kost je naam) · (3) Duik terug de schaduw in |
| `de_overloper` | De Overloper | 🗝️ | (1) **Koop de sleutels** (`kan: goud>=40`) — −40 goud → volgende schat-/elite-kamer geeft dubbel · (2) **Vraag de route** — onthul de hele kaartlaag (alle ?-nodes tonen hun type) · (3) **Meld hem aan** — +100 goud + vloek `laster` + hij is weg (de duurste keuze van de act) |

*Alle opties leunen op bestaande haken; `de_verkiezing` optie 3 en `de_overloper`
optie 1/2 vragen elk een kleine nieuwe vlag (~5 regels). De verraad-opties geven
BEWUST altijd `laster` — goud kopen met je naam is het act-thema.*

---

## Bouwnotities (voor wanneer Act 3 in `data.js`/`game.js` gaat)

**A. Volgorde van bouwen:** eerst `ACTS_MAX` 2→3 + `BAAS_PER_ACT[3]` + `ONTMOETINGEN.act3`
(tiers: vroeg = omroeper/klapvee/zondebok · midden = aanklager/fluisteraar/ophitser ·
laat/zwaar = vaandeldrager/gouden_garde-combinaties · elite = rechter/hofnar · episch =
spreekgestoelte) + de achtergrond-manifest-slots in `art.js` (act3-blok; `laadscherm` →
kaart, ontbrekende slots vallen tot de drop via `actBg()` terug op act2/act1).

**B. De DICKtator zelf:** mechanisch ontwerp is bewust GEPARKEERD (permanente
kaartverwijdering + vloeken-as — zie het geheugen/ontwerp); de art hierboven staat er
los van en kan nu al gegenereerd. De **jeugddroom-terugkeer** (PROLOOG.md) hoort bij
zijn gevecht — reserveer een `baasSpreekt`-regel die `S.jeugddroom`/Codex citeert.

**C. Vijand-gedrag (vertrekwaarden, playtest-tunebaar):** klapvee schaalt op
mede-vijanden · zondebok = dreiging-mechaniek (vangt klappen op; bij dood +1 Kracht
voor de rest — satire: de schuld is 'weggedragen') · fluisteraar/hofnar/spreekgestoelte
stoppen `laster` in afleg/trek (spiegel de Redacteur-verduisterd-flow) · ophitser
raakt je LICHT (`zetFakkel(-6)` — nieuw dreigingstype, hook bestaat) · rechter =
telegrafeer-elite (elke 3e beurt VONNIS, schaalt op jouw Zwak/Kwetsbaar-stacks) ·
UITSPRAKEN voor alle 12 + BESTIARIUM-lore (act:3) mee in dezelfde bouw-ronde — het
spreekgestoelte spreekt met de STEM van de DICKtator (foreshadow, zoals het_origineel
de Erfprins foreshadowde).

**D. Vloek `laster`:** volg het `pijn`-patroon (type 'vloek', onbespeelbaar) — geen
STATUSINFO nodig. Overweeg bij de bouw een mild passief (à la doofpot) pas NA playtest.

**E. Lookup-bugklasse (verplichte check bij de bouw):** nieuwe ids door alle
OBJ[key]-sweeps halen (VIJAND_KLEIN/GROOT-sets, VIJAND_ENTREE, gifkaats-hints,
BESTIARIUM, UITSPRAKEN, SYNERGIE n.v.t.) + `markeerGezien` pakt ze automatisch zodra
de BESTIARIUM-entries bestaan.

**F. Pipeline per drop:** PNG op exact `<id>.png` → `verwijder_dambord.py` (alleen de
12 vijanden + poses; fluisteraar via de zwarte-bg-alpha-route zoals echo) →
`converteer_webp.py` → cache-bump. Achtergronden/kaarten/relikwieën/events = scènes,
geen cut-out. Bestandsnamen mét spaties zijn oké voor achtergronden (bestaande
conventie), vijanden/kaarten/relikwieën/events lowercase zonder spaties.
