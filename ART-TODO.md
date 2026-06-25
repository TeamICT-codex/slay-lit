# 🎨 ART-TODO — master-checklist (alles op één plek)

> Eén overzicht van álle art die nog gegenereerd moet worden, met **bestandsnaam +
> map + waar de prompt staat**. Vink af terwijl je werkt. Stand: 22 juni 2026.

## Werkwijze (per drop)
1. **Genereer** (prompt uit de aangegeven doc) → drop als **PNG**, bestandsnaam = **exact de id**.
2. **Zeg me "ruim de nieuwe art op"** → ik draai de pijplijn + wire + verifieer + bump de cache.
   - **Personages/vijanden/baas/metgezel = cut-outs** → `verwijder_dambord.py` → `converteer_webp.py`.
     Stuur in de prompt op *"crisp coloured edges, NO white glow / bloom / haze"*.
   - **Achtergronden = volle scènes (GEEN cut-out)** → **alleen** `converteer_webp.py`. Exacte
     bestandsnaam (incl. spaties/hoofdletters) → ze slotten automatisch in.
3. Loader pakt eerst `.webp`, dan `.png` → een rauwe PNG werkt meteen; converteren doe ik vóór de push.

---

## 🥇 PRIORITEIT 1 — De centrale stukken (grootste impact)

### Copycat-eindbaas
- [x] `assets/karakters/de_erfprins.webp` — ✅ **combat-figuur** (uitgesneden + geverifieerd op het strijdveld)
- [x] `assets/karakters/de_erfprins_intro.webp` — ✅ **intro-splash** (toont als speelkaart in de boss-intro)
  - [x] poses: `de_erfprins_attack` · `de_erfprins_cast` · `de_erfprins_hit` · `de_erfprins_death` + **2 plagiaat-varianten** (`de_erfprins_plagiaat` + `_plagiaat_variant` — de game wisselt ertussen). ✅ alle 8 verwerkt + geverifieerd.

### Drops — de hele set (companion)  ✅ **VERWERKT** (10 webps, dambord-gestript + geverifieerd op donker strijdveld)
- [x] `assets/metgezellen/drops.webp` — basis/idle (magische **zwarte labrador**, ember-vonk in de vacht)
- [x] `assets/metgezellen/drops_attack.webp` — de beet
- [x] `assets/metgezellen/drops_hit.webp` — klap opvangen
- [x] `assets/metgezellen/drops_death.webp` — **De Laatste Sprong, beat 1** (de sprong de machine in, nog heel)
- [x] `assets/metgezellen/drops_offer.webp` — **beat 2** (de burst — uiteenspattend in ember-licht); de game speelt nu de **2-beats-dood** af (sprong → burst → weg)
- [x] `assets/metgezellen/drops_geest.webp` — spectrale geest (Codex-gedenkplek na het offer) · variant in reserve (`originelen/drops_geest_variant.png`)
- [x] `assets/metgezellen/drops_wit.webp` — **Drops de Witte** basis/idle (geascendeerd, wit-zilver, koud wit vuur) — óók het Codex-portret
  - [x] `drops_wit_attack.webp` — de witklap (beet)
  - [x] `drops_wit_hit.webp` — klap opvangen
  - [x] `drops_wit_terugkeer.webp` — **signatuur** (was `drops_wit_blij`): de sprong terug in het beeld; speelt af bij de reünie
  - *(GEEN `drops_wit_death` — hij sterft niet meer)*

---

## 🥈 PRIORITEIT 2 — Kopieerhel-vijanden (Act 2-roster) → `assets/karakters/<id>.png`

> **Poses (zelfde conventie als Act 1):** gewone vijanden = minstens een `_death`-pose;
> de **elites** (`de_mal`, `de_archivaris`) + het **episch** (`het_origineel`) = meerdere
> (`_attack`/`_hit`/`_death`/`_cast`, archivaris ook `_block`). Volledige richtlijnen staan in
> de prompt-docs. Spawns (`doorslag_kopie`, `mal_gietsel`) hebben geen poses nodig.

> ✅ **VERWERKT (24 juni 2026, v17):** 35 webps dambord/luma-gestript + geverifieerd op donker
> strijdveld. **2 moeten opnieuw** (zie ⚠️ onderaan): `de_deadline` (basis) + `spiegelwachter` (×2).

**Prompt in `assets/karakters/PROMPTS.txt` (sectie "ACT 2 — DE KOPIEERHEL"):**
- [x] `echo` — De Echo (luma-key, doorschijnend) + `echo_death` ✅
- [x] `doorslag` + `doorslag_death` ✅
  - [x] `doorslag_kopie` — bleke zwakke kopie (spawn) ✅
- [x] `naaper` + `naaper_death` ✅
- [x] `inktklerk` + `inktklerk_death` ✅
- [x] `de_mal` — De Mal (elite) volledige set: `_attack`/`_hit`/`_cast`/`_death` ✅
  - [x] `mal_gietsel` — leeg blanco gietsel (spawn) ✅
- [x] `het_origineel` — episch, volledige set `_attack`/`_hit`/`_cast`/`_death` ✅

**Prompt in `ACT2-PROMPTBIB.md` (sectie 3 — extra vijanden):**
- [x] `stempelaar` + `stempelaar_death` ✅
- [x] `dossierwurm` + `dossierwurm_death` ✅
- [ ] ⚠️ `spiegelwachter` (+ `_death`) — **opnieuw genereren** (origineel te donker glas-op-zwart, geen
      contrast om uit te snijden) → **op checkerboard** mét felle koude glow-randen, niet op zwart
- [ ] ⚠️ `de_deadline` (basis) — **opnieuw genereren op checkerboard** (kwam als donkere scène, niet
      uitsneedbaar); `de_deadline_death` ✅ is wél goed
- [x] `de_inktvlek` + `de_inktvlek_death` ✅
- [x] `de_redacteur` (herschreven) + `de_redacteur_death` ✅
- [x] `de_archivaris` — 2e elite, volledige set `_attack`/`_hit`/`_cast`/`_block`/`_death` ✅

**ZWARTE ZIEL — gif-counters (corruptie/leegte; prompts in `assets/karakters/ACT2-VIJANDEN-KLAAR.txt` blok 16-18):**
- [ ] `pekziel` — De Pekziel (Act 1, vermindert gif) — basis + **`_gif`** (gif-reactie) + `_death`
- [ ] `de_uitgewiste` — De Uitgewiste (Act 2, vermindert gif) — basis + **`_gif`** (gif-reactie) + `_death`
- [ ] `de_verzwolgene` — De Verzwolgene (elite, absorbeert gif) — volledige pose-set + **`_gif`** (gif-absorptie)
  - > **`_gif`-pose** = de reactie op binnenkomend gif (zie `ACT2-VIJANDEN-KLAAR.txt` blok 16-18). De code toont 'm automatisch tijdens de gif-tik zodra de webp bestaat.

---

## 🥉 PRIORITEIT 3 — Achtergronden "Het Archief" → `assets/achtergronden/Act 2 achtergronden/`
**Prompt in `assets/achtergronden/PROMPTS.txt` (sectie "ACT 2: HET ARCHIEF (volledig)").**
**Volle scènes — GEEN dambord-verwijdering, alleen WebP. Houd de exacte bestandsnaam.**

**Bestaan al → hergenereren in Archief-stijl (zelfde naam):**
- [x] `Startscherm ACT 2 achtergrond.webp` (kaart-plate, STAAND 9:16) ✅ verwerkt
- [x] `Gevechtstijl1act2.webp` … `Gevechtstijl5act2.webp` (5× gevecht, LIGGEND 16:9, open midden) ✅ verwerkt
- [x] `Gevechtstijl act2 EPISCH 1.webp` … `EPISCH 3.webp` (3× episch) ✅ verwerkt
- [x] `Achtergrondverkoper ACT2.webp` + `Achtergrondverkoper ACT2 easter egg.webp` (winkel — mét koopman) ✅ verwerkt
- [x] `Achtergrondvraagtekenencounter ACT2.webp` (event ❓) ✅ verwerkt
- [x] `Achtergrondvraagtekenrelikwieartefact ACT2.webp` (relikwie-event) ✅ verwerkt

**Ontbreken nog → maken (ik wire de slot in `js/art.js` zodra je 'm dropt):**
- [x] `Achtergrondrust2.webp` (rustplaats) ✅ verwerkt + gewired
- [x] `Achtergrondschatkist2.webp` (schat) ✅ verwerkt + gewired
- [x] `Overwinningsachtergrond2gewoon.webp` (beloning) ✅ verwerkt + gewired
- [x] `Overwinningsachtergrond2episch.webp` (epische overwinning) ✅ verwerkt + gewired
- [x] `Achtergrond nederlaag ACT2.webp` (nederlaagscherm) ✅ verwerkt + gewired → **Act 2-achtergronden 18/18 COMPLEET**

---

## 🎴 PRIORITEIT 4 — Content-art (optioneel; emoji werkt nu prima)
**Prompt in `ACT2-PROMPTBIB.md` (secties 1, 2, 4).** Laagste prioriteit — pas oppakken als de rest staat.
- [ ] **15 Act 2-kaarten** → `assets/kaarten/<id>.png` (Doorslag/Stempel/Afgekeurd/Naäperij/…)
- [ ] **10 Act 2-relikwieën** → `assets/relikwieen/<id>.png`
- [ ] **4 Act 2-events** → `assets/events/<id>.png`
- [ ] **`vonkaltaar.png`** → `assets/events/` — het Vonkaltaar (fakkel-smederij; prompt in `assets/events/PROMPTS.txt`, emoji 🪔 werkt nu)

---

## ✅ Al klaar (niet meer doen)
- App-icoon (vlammend zwaard, 512/192/180 + maskable) + favicon.
- Act 1-art (helden, vijanden, kaarten, relikwieën, achtergronden).

## Detail-prompts staan in:
- `assets/karakters/PROMPTS.txt` — vijanden + de Erfprins
- `assets/metgezellen/PROMPTS.txt` — Drops (alle poses) + Drops de Witte
- `assets/achtergronden/PROMPTS.txt` — alle Act 2-achtergronden
- `ACT2-PROMPTBIB.md` — extra vijanden + alle content-art (kaarten/relikwieën/events)
- `ACT2-ART.md` — beknopte Act 2-checklist (deze ART-TODO.md is de volledige master)
