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
- [ ] `assets/karakters/de_erfprins.png` — **combat-figuur: UITGESNEDEN op transparante achtergrond** (geen scène!)  ·  **prompt:** `assets/karakters/PROMPTS.txt` (blok `de_erfprins.png`)
- [ ] `assets/karakters/de_erfprins_intro.png` — **intro-splash: VOLLE SCÈNE** (de mooie scène-versie, mét achtergrond/spiegel-kopieën). Verschijnt **als speelkaart** in de boss-intro (al ingebouwd). Pijplijn: **alleen WebP, géén dambord-verwijdering.**

### Drops — de hele set (companion)  ·  **prompt:** `assets/metgezellen/PROMPTS.txt`
*Genereer de basis eerst, dan de poses in DEZELFDE sessie (zelfde hond, alleen de "Pose:"-regel anders).*
- [ ] `assets/metgezellen/drops.png` — basis/idle (magische **zwarte labrador**, ember-vonk in de vacht)
- [ ] `assets/metgezellen/drops_attack.png` — de beet
- [ ] `assets/metgezellen/drops_hit.png` — klap opvangen
- [ ] `assets/metgezellen/drops_death.png` — De Laatste Sprong (sterft-tijdens-offer; sprong + uiteenspatten)
- [ ] `assets/metgezellen/drops_geest.png` — spectrale geest (Codex-gedenkplek na het offer)
- [ ] `assets/metgezellen/drops_wit.png` — **Drops de Witte** (geascendeerd, wit-zilver, koud wit vuur)
  - optioneel: `drops_wit_attack.png` · `drops_wit_hit.png`  (GEEN `_death` — hij sterft niet meer)

---

## 🥈 PRIORITEIT 2 — Kopieerhel-vijanden (Act 2-roster) → `assets/karakters/<id>.png`

**Prompt in `assets/karakters/PROMPTS.txt` (sectie "ACT 2 — DE KOPIEERHEL"):**
- [ ] `echo` — De Echo (doorschijnende duplicaten van zichzelf)
- [ ] `doorslag` — Doorslag (carbon-copy-papierwezen)
  - [ ] `doorslag_kopie` — bleke zwakke kopie (spawn; optioneel/mag emoji blijven)
- [ ] `naaper` — De Naäper (spottende na-aap-imp)
- [ ] `inktklerk` — Inktklerk (inkt + stempel)
- [ ] `de_mal` — De Mal (elite: ijzeren matrijs/drukpers)
  - [ ] `mal_gietsel` — leeg blanco gietsel (spawn; optioneel)
- [ ] `het_origineel` — Het Origineel (episch: "jij bent maar een kopie van mij")

**Prompt in `ACT2-PROMPTBIB.md` (sectie 3 — extra vijanden):**
- [ ] `stempelaar` — De Stempelaar
- [ ] `dossierwurm` — De Dossierwurm
- [ ] `spiegelwachter` — De Spiegelwachter
- [ ] `de_deadline` — De Deadline (escalerende klap)
- [ ] `de_inktvlek` — De Inktvlek (gif)
- [ ] `de_redacteur` — De Redacteur (strijkt je Blok weg)
- [ ] `de_archivaris` — De Archivaris (2e elite, compoundt Kracht)

---

## 🥉 PRIORITEIT 3 — Achtergronden "Het Archief" → `assets/achtergronden/Act 2 achtergronden/`
**Prompt in `assets/achtergronden/PROMPTS.txt` (sectie "ACT 2: HET ARCHIEF (volledig)").**
**Volle scènes — GEEN dambord-verwijdering, alleen WebP. Houd de exacte bestandsnaam.**

**Bestaan al → hergenereren in Archief-stijl (zelfde naam):**
- [ ] `Startscherm ACT 2 achtergrond.webp` (kaart-plate, STAAND 9:16)
- [ ] `Gevechtstijl1act2.webp` … `Gevechtstijl5act2.webp` (5× gevecht, LIGGEND 16:9, open midden)
- [ ] `Gevechtstijl act2 EPISCH 1.webp` … `EPISCH 3.webp` (3× episch)
- [ ] `Achtergrondverkoper ACT2.webp` + `Achtergrondverkoper ACT2 easter egg.webp` (winkel)
- [ ] `Achtergrondvraagtekenencounter ACT2.webp` (event ❓)
- [ ] `Achtergrondvraagtekenrelikwieartefact ACT2.webp` (relikwie-event)

**Ontbreken nog → maken (ik wire de slot in `js/art.js` zodra je 'm dropt):**
- [ ] `Achtergrondrust2.webp` (rustplaats)
- [ ] `Achtergrondschatkist2.webp` (schat)
- [ ] `Overwinningsachtergrond2gewoon.webp` (beloning)
- [ ] `Overwinningsachtergrond2episch.webp` (epische overwinning)
- [ ] `Achtergrond nederlaag ACT2.webp` (nederlaagscherm)

---

## 🎴 PRIORITEIT 4 — Content-art (optioneel; emoji werkt nu prima)
**Prompt in `ACT2-PROMPTBIB.md` (secties 1, 2, 4).** Laagste prioriteit — pas oppakken als de rest staat.
- [ ] **15 Act 2-kaarten** → `assets/kaarten/<id>.png` (Doorslag/Stempel/Afgekeurd/Naäperij/…)
- [ ] **10 Act 2-relikwieën** → `assets/relikwieen/<id>.png`
- [ ] **4 Act 2-events** → `assets/events/<id>.png`

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
