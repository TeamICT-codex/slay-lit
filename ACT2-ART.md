# Act 2 — Art-checklist ("Het Archief")

> Eén overzicht van álle Act 2-art: bestandsnaam, status, waar de prompt staat.
> **Loaders:** vijanden/baas laden op hun **id** → `assets/karakters/<id>.webp`
> (of `.png`; pose-states `<id>_attack/_hit/_death`). Companions →
> `assets/metgezellen/<art>.webp`. Achtergronden → manifest in `js/art.js`.
> De loader probeert eerst `.webp`, dan `.png`, dus een **rauwe PNG-drop werkt
> meteen** — draai daarna `verwijder_dambord.py` (alleen cut-outs) +
> `converteer_webp.py` vóór je pusht (zie [asset-optimalisatie-vooraf] in geheugen).

## 🎨 Stijl-noordster (Het Archief)
De catacombe als verrotte **bureaucratische onderwereld** / oneindig dodenarchief.
Thema **NAMAAK & INDEXERING**. Palet **koud blauw-grijs "systeem-licht"**; jouw
**warme fakkel** is het enige warme, onkopieerbare licht. Identieke/gespiegelde/
gedupliceerde architectuur foreshadowt The Copycat. In-game blijft dark-fantasy
(géén stijlbreuk — die is proloog/outro-only).

---

## 1. Achtergronden — `assets/achtergronden/Act 2 achtergronden/`
Prompts: **`assets/achtergronden/PROMPTS.txt`** (sectie "ACT 2: HET ARCHIEF (volledig)").

**✅ Bestaan al (in OUDE catacombe-stijl) → her-genereren voor Het Archief (zelfde naam):**
- [ ] `Startscherm ACT 2 achtergrond.webp` — kaart-plate (staand 9:16)
- [ ] `Gevechtstijl1act2.webp` … `Gevechtstijl5act2.webp` — 5 battle-tiles (liggend)
- [ ] `Gevechtstijl act2 EPISCH 1.webp` … `EPISCH 3.webp` — 3 epische battle-tiles
- [ ] `Achtergrondverkoper ACT2.webp` + `… easter egg.webp` — winkel
- [ ] `Achtergrondvraagtekenencounter ACT2.webp` — event ❓
- [ ] `Achtergrondvraagtekenrelikwieartefact ACT2.webp` — relikwie-event

**⬜ Ontbreken nog (vallen nu terug op Act 1) → maken + ik wire de slot in `js/art.js`:**
- [ ] `Achtergrondrust2.webp` — rustplaats
- [ ] `Achtergrondschatkist2.webp` — schat
- [ ] `Overwinningsachtergrond2gewoon.webp` — beloning (gewone winst)
- [ ] `Overwinningsachtergrond2episch.webp` — epische overwinning
- [ ] `Achtergrond nederlaag ACT2.webp` — nederlaagscherm (prompt staat in de nederlaag-sectie)

---

## 2. Vijanden (kopieerhel) — `assets/karakters/<id>.webp`
Prompts: **`assets/karakters/PROMPTS.txt`** (sectie "ACT 2 — DE KOPIEERHEL").
Optioneel per figuur: pose-states `<id>_attack` / `<id>_hit` / `<id>_death`.
- [ ] `echo` — De Echo (overlappende doorschijnende duplicaten van zichzelf)
- [ ] `doorslag` — Doorslag (carbon-copy-papierwezen) + `doorslag_kopie` (bleke zwakke kopie)
- [ ] `naaper` — De Naäper (spottende na-aap-imp)
- [ ] `inktklerk` — Inktklerk (gantse klerk, inkt + stempel)
- [ ] `de_mal` — De Mal (elite: ijzeren matrijs/drukpers die gietsels baart) + `mal_gietsel` (leeg blanco gietsel)
- [ ] `het_origineel` — Het Origineel (episch: "jij bent maar een kopie van mij")

## 3. Baas — `assets/karakters/de_erfprins.webp`
Prompt: **`assets/karakters/PROMPTS.txt`** (blok `de_erfprins.png`, herschreven naar The Copycat).
- [ ] `de_erfprins` — THE COPYCAT (nepo-baby met maskerscepter, gestolen kaarten + spiegel-scherven om hem heen, mid-mimic)

## 4. Companion — `assets/metgezellen/drops.webp`
Prompt: **`assets/metgezellen/PROMPTS.txt`** (blok `drops.png`, de hond).
Optioneel: `drops_attack` (beet) / `drops_hit` / `drops_death` (de Laatste Sprong).
- [ ] `drops` — Drops, het trouwe hond-wezen (kijkt naar RECHTS, ember-knipoog in de vacht)

---

## Pijplijn per drop
1. PNG droppen op de juiste naam → werkt meteen (png-fallback).
2. `python .claude/verwijder_dambord.py` (alleen cut-outs: vijanden/baas/companion — NIET de achtergronden).
3. `python .claude/converteer_webp.py` (PNG → WebP, originelen → assets-bron/).
4. Nieuwe achtergrond-slot (de ⬜'s)? → zeg het me, dan voeg ik 'm toe aan het manifest in `js/art.js`.
