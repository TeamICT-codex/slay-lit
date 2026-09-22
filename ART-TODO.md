# 🎨 ART-TODO — masterlijst art-achterstand

> **Stand: 22 september 2026, na v127** (HEAD `f7ea40f`). Eén overzicht van álle art die nog
> gegenereerd moet worden, met **bestandsnaam + dropmap + waar de prompt staat**. Vink af
> terwijl je werkt.
>
> De kopieerklare promptblokken staan in **`.claude/notities/art_achterstand_prompts.md`** —
> daar zit per item een codeblok met de exacte dropnaam en de volledige prompt, plus de
> aanbevolen genereervolgorde in sessies. Deze lijst is de checklist; die bundel is het
> werkblad.
>
> **Stand van de achterstand: 30 items.** Alle dertien RONDE 3-achtergronden zijn met v127
> geland; wat overblijft zijn gevechtsposes die de code al opvraagt, de traversal-frames van
> de twee niet-Slachter-helden, één optionele signatuurpose en vier Afdaling-objecten.

## Werkwijze (per drop)

1. **Genereer** met het promptblok uit de aangegeven bibliotheek → sla op als **PNG**,
   bestandsnaam = **exact de id** die de code verwacht (poses als `{id}_{pose}.png`).
2. **Drop** in de aangegeven map en zeg *"ruim de nieuwe art op"* → de **`/art-drop`-skill**
   draait de hele pijplijn: dambord-/chroma-verwijdering → visuele check → WebP-conversie →
   integratie-check → preview-verificatie → cache-bump in `sw.js` → commit + push.
   - **Personages/vijanden/bazen = cut-outs** → `verwijder_dambord.py` + `converteer_webp.py`.
     Stuur in de prompt op *"crisp coloured edges, NO white glow / bloom / haze"*.
   - **Achtergronden = volle scènes (GEEN cut-out)** → **alleen** `converteer_webp.py`.
     Exacte bestandsnaam behouden, inclusief spaties en hoofdletters.
3. **Controleer op magic bytes, niet op de extensie.** Een bestand dat `.png` heet kan
   perfect een JPEG of WebP zijn; de converter en de cutter gaan daarop stuk of leveren stil
   een verkeerd resultaat. Kijk naar de eerste bytes (`\x89PNG`), niet naar de naam.
4. **Elke pose is een APARTE afbeelding.** Eén blok = één bestand. Zeg dat expliciet in de
   generatie, anders plakt de generator er een sprite-sheet of een collage van.
5. **Facing-conventie:** helden **én** metgezellen kijken naar **RECHTS**, vijanden naar
   **LINKS** — de metgezel staat naast de held, samen tegenover de vijanden. De pijplijn
   spiegelt nooit; links blijft links (belangrijk bij Thoverk, die één houten been heeft).
6. **Nooit rauwe PNG's in de repo laten staan.** Originelen horen in `assets-bron/`. Een
   achtergebleven `.png` naast een `.webp` laat de converter het bestand overslaan.
7. **Alles wat live zichtbaar moet zijn vraagt een cache-bump** in `sw.js`
   (`const CACHE = 'slayit-vNN'` + korte NL-comment). Zonder bump blijft de oude shell staan.
8. **Elk nieuw art-vereist element krijgt meteen zijn prompt** in de juiste
   `assets/**/PROMPTS.txt`, mét stijlanker per act — ook als de bouw pas later volgt.

---

## 🥈 PRIORITEIT MIDDEL — 19 items

### Vijandposes die de code al opvraagt (11) → `assets/karakters/`

> De intent-runner wisselt bij `type: 'blok'` naar `<id>_block` en bij `type: 'buff'`/
> `'debuff'` naar `<id>_cast`. Ontbreekt die plaat, dan gebeurt er visueel niets: de beurt
> speelt door op de basispose. **Block is een VÁSTGEHOUDEN stand** (geen auto-revert) — die
> poses staan het langst van allemaal in beeld en moeten als een stabiele houding lezen.

- [ ] `blauwe_slijm_block.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `blauwe_slijm_block.png` (r2601) · blok-intent "Verdikken" (6 blok) zonder blokpose · **nieuw**
- [ ] `steengolem_block.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `steengolem_block.png` (r2609) · "Verstenen" (9 blok) elke even beurt = de helft van zijn beurten · **nieuw**
- [ ] `paddenstoelman_block.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `paddenstoelman_block.png` (r2628) · "Verschuilen" (7 blok): hij trekt zich in zijn hoed terug · **nieuw**
- [ ] `paddenstoelman_cast.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `paddenstoelman_cast.png` (r2670) · "Sporenwolk" (debuff) vraagt `_cast`; hij heeft alleen `_gif` · **nieuw**
- [ ] `naaper_block.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `naaper_block.png` (r2647) · "Nabootsen" (7 blok) — de pose die het personage verkoopt · **nieuw**
- [ ] `de_uitgewiste_block.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `de_uitgewiste_block.png` (r2656) · "Verstommen" (8 blok) zonder blokpose · **nieuw**
- [ ] `dossierwurm_cast.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `dossierwurm_cast.png` (r2679) · buff "Inrollen" om de beurt; halve beurten visueel dood · **nieuw**
- [ ] `de_deadline_cast.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `de_deadline_cast.png` (r2687) · buff "Verlengen" (elke 4e beurt). ⚠ flat white/magenta, niet zwart · **nieuw**
- [ ] `de_inktvlek_cast.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `de_inktvlek_cast.png` (r2696) · debuff "Uitvloeien" (4 gif) vraagt `_cast` · **nieuw**
- [ ] `doorslag_kopie_death.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `doorslag_kopie_death.png` (r2575) · enige figuren zonder `_death`: het lijk blijft rechtop staan · **nieuw**
- [ ] `mal_gietsel_death.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `mal_gietsel_death.png` (r2582) · zelfde gat; de Mal perst er tot 3 per gevecht uit. ⚠ pure-magenta · **nieuw**

### Held-wereldposes — De Afdaling (8) → `assets/karakters/`

> De Afdaling laadt zes traversal-frames voor de **actuele** held; alleen de Slachter heeft
> ze. Zonder eigen frames loopt de held als bevroren basisplaat op de CSS-marionet.
> `walk_a` / `walk_b` / `jump` / `land` zijn de vier verplichte frames per held. Genereer een
> held altijd als complete set in één sessie, anders flikkert de cyclus.

- [ ] `gifmagier_walk_a.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `gifmagier_walk_a.png` (r2401) · contactstap, frame A van de loopcyclus · **nieuw**
- [ ] `gifmagier_walk_b.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `gifmagier_walk_b.png` (r2409) · passeermoment; zonder dit frame staat de loop stil · **nieuw**
- [ ] `gifmagier_jump.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `gifmagier_jump.png` (r2421) · sprong- en valhouding · **nieuw**
- [ ] `gifmagier_land.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `gifmagier_land.png` (r2429) · landing (120-220 ms, squash + stofpufjes) · **nieuw**
- [ ] `thoverk_walk_a.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `thoverk_walk_a.png` (r2470) · contactstap. ⚠ houten linkerbeen per been benoemd, nooit spiegelen · **nieuw**
- [ ] `thoverk_jump.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `thoverk_jump.png` (r2490) · sprong/val voor Thoverk · **nieuw**
- [ ] `thoverk_land.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `thoverk_land.png` (r2498) · landingshurk met het houten been onder hem gevouwen · **nieuw**
- [ ] `thoverk_climb.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `thoverk_climb.png` (r2514) · klimframe; de ladder wordt niet getekend · **nieuw**

---

## 🥉 PRIORITEIT LAAG — 11 items

### Vijandposes (2) → `assets/karakters/`

- [ ] `schaduw_block.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `schaduw_block.png` (r2617) · "Vervagen" (8 blok). ⚠ op EFFEN ZWART genereren (luma-key) · **nieuw**
- [ ] `pekziel_block.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `pekziel_block.png` (r2636) · "Verharden" (7 blok). ⚠ flat white of magenta, NOOIT zwart · **nieuw**

### Held-wereldposes — De Afdaling (4) → `assets/karakters/`

- [ ] `gifmagier_roll.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `gifmagier_roll.png` (r2437) · rolframe; terugval is `_land` met rotate · **nieuw**
- [ ] `gifmagier_climb.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `gifmagier_climb.png` (r2445) · klimframe; terugval is basis + bob + flip · **nieuw**
- [ ] `thoverk_walk_b.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `thoverk_walk_b.png` (r2478) · passeermoment met het houten been los van de grond · **nieuw**
- [ ] `thoverk_roll.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `thoverk_roll.png` (r2506) · rolframe; optioneel, de flipbook-keuring beslist · **nieuw**

### Signatuurpose (1) → `assets/karakters/`

- [ ] `gifmagier_beulswerk.png` · `assets/karakters` · prompt: `assets/karakters/STATE-PROMPTS.txt` → kopregel `gifmagier_beulswerk.png` (r694) · Beulswerk draagt geen `held:`-veld, dus élke held kan hem trekken; nu flitst het signatuurmoment zonder posewissel · **nieuw (optioneel)**

### Afdaling — traversalobjecten Act 2/3 (4) → `assets/achtergronden/Afdaling/`

> `haakBioom` vraagt bordes/ladder/valgat/nis_rust **per act** op. Voor Act 2 en Act 3 bestaat
> er nog niets, dus valt de wereld daar terug op de kale CSS-vormen. De maten zijn hard: de
> CSS die deze platen snijdt heeft géén act-qualifier, dus een a2-/a3-plaat wordt exact zo
> gesneden als de Act 1-plaat (ladder 1024x1536 met negen sporten; valgat 1774x887 met de
> vloerlijn op 32%).

- [ ] `afdaling_a2_ladder.png` · `assets/achtergronden/Afdaling` · prompt: `assets/achtergronden/PROMPTS.txt` → kopregel `afdaling_a2_ladder.png` (r897) · klimbare kettingladder van het Archief (≠ het decorstuk `_prop_ladder`) · **nieuw**
- [ ] `afdaling_a2_valgat.png` · `assets/achtergronden/Afdaling` · prompt: `assets/achtergronden/PROMPTS.txt` → kopregel `afdaling_a2_valgat.png` (r909) · ingestorte archiefgalerij-rand; het gat blijft transparant · **nieuw**
- [ ] `afdaling_a3_ladder.png` · `assets/achtergronden/Afdaling` · prompt: `assets/achtergronden/PROMPTS.txt` → kopregel `afdaling_a3_ladder.png` (r919) · klimketting van het Slachtblok; naam blijft 'ladder' · **nieuw**
- [ ] `afdaling_a3_valgat.png` · `assets/achtergronden/Afdaling` · prompt: `assets/achtergronden/PROMPTS.txt` → kopregel `afdaling_a3_valgat.png` (r931) · opengebroken schavotrand met gloeiende naden · **nieuw**

> **Nog zonder promptblok in deze reeks:** `afdaling_a2_bordes`, `afdaling_a2_nis_rust`,
> `afdaling_a3_bordes`, `afdaling_a3_nis_rust` — zelfde lus, zelfde dropmap. Schrijf die
> blokken erbij vóór je de reeks afwerkt.

---

## ⏸ Geparkeerd — metgezellen (beslissing 22 september 2026)

De metgezellen worden geparkeerd: er wordt **geen metgezel-art meer gegenereerd**. Ze maken
plaats voor scherven → de gok-encounter aan de Drempel (zie hieronder). Deze acht stonden nog
op de lijst en zijn hiermee van tafel — niet genereren, ook niet "voor de volledigheid":

- `drops_terugkeer.png` · `drops_wit.png` · `drops_wit_death.png` · `drops_wit_offer.png`
- `mosgeest_offer.png` · `mosgeest_terugkeer.png`
- `vlamwachter_offer.png` · `vlamwachter_terugkeer.png`

De bestaande metgezel-art blijft gewoon staan en wordt niet verwijderd. Het verhaal van Drops
en Drops de Witte staat in `DROPS-DE-WITTE.md`, niet hier.

---

## 🧩 Nog zonder ontwerp — de gok-encounter aan de Drempel

Er liggen **drie concurrerende ontwerpen** van het ontwerppanel van 22 september 2026, en er
is nog geen keuze gemaakt:

| ontwerp | notitie | art die eruit zou volgen |
|---|---|---|
| A — Het Rad van Verdienste | `.claude/notities/gok_ontwerp_A_rad.md` | `rad_van_verdienste`, `rad_naaf`, `de_drempelwachter_spelleider`, `eenheid` |
| B — In Tweevoud | `.claude/notities/gok_ontwerp_B_memory.md` | `balie_dubbelarchief`, `tegel_rug_archief`, `stempel_goedgekeurd`/`_afgekeurd`, `doorslagrecht`, `de_klerk` |
| C — De Scherpe Kamer | `.claude/notities/gok_ontwerp_C_revolver.md` | `trommel`, `kamer_scherp`, `voorziening`, (optioneel) `rad_herplaatsing` |

**Art komt ná het ontwerp, niet ervoor.** De drie lijsten sluiten elkaar uit — hoogstens één
ervan wordt ooit gebouwd, en elk ontwerp noemt zijn eigen art bovendien expliciet
niet-blokkerend (emoji/CSS is overal de terugval). Nu genereren betekent ongeveer negen
platen weggooien. Volgorde: Thomas kiest een ontwerp → plan voorleggen → "go" → bouwen →
prompts schrijven → genereren. **Geen van deze namen is een TODO.**

---

## ✅ Al klaar (niet meer doen)

- **Alle basisplaten**: vijanden, helden, kaarten (128), relikwieën (65), dranken, events,
  iconen, scherven, UI-emblemen. Geen enkele basis-id uit `js/data.js` mist art.
- **Alle act-achtergronden.** Act 1, Act 2 (18/18) en Act 3 zijn compleet, inclusief het
  Raadzaal-drieluik van Het Proces.
- **RONDE 3 — de toneelstandaard, afgerond in v127** (22 sep 2026): `Gevechtstijl2act2`
  (re-roll), `Gevechtstijl act2 EPISCH 3` en de vijf Act 3-gevechtsplaten (`stijl 2`,
  `stijl 4`, `EPISCH 1`, `EPISCH 2`, `EPISCH 3`). Alle dertien platen van RONDE 3 staan live;
  hun promptblokken zijn bewaard in bijlage A van de bundel als re-roll-bron.
- **Het hof van de DICKtator** is compleet: `de_griffier` (+`_cast`/`_hit`/`_death`),
  `de_deurwaarder` (+`_attack`/`_hit`/`_death`), `de_claqueur` (+`_attack`/`_hit`/`_death`).
  Er is géén terugvalplaat meer.
- **De Afdaling, Act 1-bioom**: 18 platen, compleet (verte ×4, midden, grond, voorgrond,
  poort, vier rekwisieten, bordes, ladder, valgat, nis_rust, affiche, kist).
- **De oude openstaande vinkjes van 22 juni 2026 zijn allemaal geleverd**: `spiegelwachter`,
  `de_deadline`, `pekziel`, `de_uitgewiste`, `de_verzwolgene`, de 15 Act 2-kaarten, de 10
  Act 2-relikwieën, de 4 Act 2-events en `vonkaltaar`. Ook de oude regel "spawns hebben geen
  poses nodig" klopt niet meer — `doorslag_kopie` en `mal_gietsel` kregen `_attack` en `_hit`.
- **App-icoon** (vlammend zwaard, 512/192/180 + maskable) en favicon.

### Terugkerende valse meldingen (geverifieerd weerlegd — niet opnieuw opvoeren)

- **Een terugval is geen ontbrekende plaat.** `artIdVan`/`artTerugval` laat figuren zonder
  eigen plaat terugvallen op `VIJANDEN[id].artId`; dat is ontwerp, geen gat.
- **Een naam die de code nooit vormt, is geen art-slot.** Het bestiarium *sondeert* poses via
  het manifest en laat ontbrekende poses gewoon uit de cyclus — geen 404, geen lege plek.
  Zo zijn onder meer `grombaard_block`, `kultist_block`, `het_origineel_block`,
  `de_erfprins_block`, `de_erfprins_gif` en `de_drempelwachter_cast` bewust afwezig.
- **Kruis-held-signatuurposes bestaan niet en horen niet te bestaan.** Eén signatuurpose per
  held (`speler_beulswerk`, `gifmagier_moederslang`, `thoverk_flame`); de zes kruiscombinaties
  zijn geen gaten. Enige uitzondering die wél op de lijst staat: `gifmagier_beulswerk`, en dan
  nog als optioneel.
- **`de_deurwaarder_factuur` en `spiegelwachter_plagiaat` zijn geen ontbrekende art**: de
  platen bestaan al onder een andere naam (`de_deurwaarder_attack` resp. `spiegelwachter_gif`).
- **Art die eerst een code-wire nodig heeft, hoort hier niet.** `factuur_zegel`,
  `ontslag_zandloper`, `kaart_corruptie`, `erfprins_vinger`, het smeedkamer-doek en het hele
  Act 2-/Act 3-Afdalingsbioom (verte/midden/grond/voorgrond/poort + props) draaien op emoji of
  CSS; een drop verandert vandaag niets op het scherm. Eerst de wire, dan de art.

---

## Huishouden in de bibliotheek (geen generatie)

- `verduisterd.png` is de enige van de 128 kaartplaten **zonder promptblok** — niet in
  `assets/kaarten/PROMPTS.txt`, niet in `ACT2-PROMPTBIB.md`, niet in `ACT3-PROMPTBIB.md`. De
  plaat bestaat en is live, maar een re-roll heeft geen bron. Blok bijschrijven.
- `ACT2-ART.md`, `assets/karakters/KARAKTERPLAN.txt` en `assets/achtergronden/LEESMIJ.txt`
  zijn fossielen: ze beschrijven een roster en een koppel-status die niet meer bestaan.
  Niet als bron gebruiken.
- De statusmarkers `[⬜]` in `assets/achtergronden/PROMPTS.txt` en de secties "NOG
  ONTBREKEND — ACT 1/2/3" slaan allemaal op platen die intussen bestaan en gewired zijn.

## Waar de prompts leven

- `assets/karakters/PROMPTS.txt` — vijanden, bazen, het hof
- `assets/karakters/STATE-PROMPTS.txt` — alle poses en states (held én vijand)
- `assets/achtergronden/PROMPTS.txt` — act-achtergronden + De Afdaling
- `assets/kaarten/` · `relikwieen/` · `dranken/` · `iconen/` · `events/` · `scherven/` ·
  `ui/` · `metgezellen/` — elk een eigen `PROMPTS.txt`
- `ACT2-PROMPTBIB.md` · `ACT3-PROMPTBIB.md` — act-brede bibliotheken met bouwdata
- `.claude/skills/promptbib/SKILL.md` — het verplichte blokformat en de stijl-lock
