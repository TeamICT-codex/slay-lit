# RELEASE-CHECKLIST — SLAY IT

> Laatst bijgewerkt: 3 juli 2026 (na de totaal-audit + eerste playtest-ronde).
> Dit is de afvinklijst voor de stap van "openbare test-build" naar "echte release".
> Niets hieruit is al uitgevoerd — de DEV-shortcuts zijn er nu nog bewust voor het testen.

---

## 1. Blokkers — weg vóór release

### 1.1 DEV-shortcuts verwijderen (zoek op `DEV-SHORTCUT` — alles is gemarkeerd)

| Wat | Waar | Hoe |
|---|---|---|
| Logo-klik (Act 2-sprong · Alt = Erfprins-test · Shift = Drops-cyclus) | `index.html:23` | `onclick="devLogo(event)"` + `title`-attribuut + de `<!-- DEV-SHORTCUT -->`-comment weghalen; `style="cursor:pointer"` mee weg |
| `devLogo` / `devSprongAct2` / `devErfprinsTest` / `_DEV_DROPS`-cyclus / `devDropsWis` | `js/game.js` ~5140–5262 (één blok) | Volledige regio wissen — alle functies + `_devDropsStap` |
| `devMobiel` + Ctrl+Shift+M-listener (+ de enige `console.info`) | `js/game.js` ~100–115 | Blok wissen. NB: de CSS-comments die devMobiel noemen (style.css/mobiel.css) zijn documentatie — mogen blijven of meegeschoond |

**Waarom kritisch:** alles staat op `window`, dus elke speler kan via de console
`devSprongAct2()` aanroepen of — erger — de logo-klik per ongeluk raken. De Drops-reset
(`devDropsWis`) wist bovendien persistente Codex-voortgang.

**Na het wissen:** `grep -ri "dev" js/ index.html` moet enkel nog onschuldige treffers geven
(bv. `devicePixelRatio`), en `node --check js/game.js` moet slagen.

### 1.2 Cache-bump als release-markering
- `sw.js`: `slayit-v35` → volgende versie bij de release-commit (schone lei op elk toestel;
  de oude cache wordt bij activate gewist).

### 1.3 Laatste echte-toestel-doorloop
- Volledige run op de telefoon (portret-events + liggend gevecht) én op de laptop (toetsenbord).
- Installatie-flow als PWA (installeer-knop, fullscreen, offline start).

---

## 2. Open beslissingen — wachten op playtest (Thomas)

| Beslissing | Dials (klaar, alleen draaien) |
|---|---|
| Erfprins "zeer moeilijk maar nét winbaar solo"? | `COPYCAT_CAP_DMG` (20/30/40), HP 180 (data.js), herroof-drempel, `ROOF_KAART_MS` |
| Heal-na-elk-gevecht te mild? (tot +17 HP/gevecht) | de heal-hook in `gevechtGewonnen` (opties: <50%-HP-gate / halveren / enkel na elite+) |
| Slijmkoning-intro-pacing | `STAP` (nu 3900 ms per stadium) |
| Gifmagiër (co-)sterkste held | pas ná playtest; zo ja: tempo-hefboom (gifflits 0→1), niet de gif-getallen |

---

## 3. Nice-to-haves vóór release (geen blokkers)

- **Wachtende art** (prompts staan klaar in de PROMPTS.txt's): `erfprins_vinger`,
  `kaart_corruptie`-overlay, `de_redacteur_hit`-pose (engine valt nu netjes terug op basis-art).
  Bij een art-drop: WebP-pijplijn + cache-bump.
- **Dev-docs in de publieke repo** (ONTWERP.md, VERBETERPLAN.md, PROLOOG.md, …): bevatten
  spoilers en interne plannen. Overwegen: verplaatsen naar een privé-plek of accepteren
  (wie graaft, vindt).
- **Act 2-bestiarium-tab-label** en completion-teksten nog eens nalezen op toon.

---

## 4. Bewust zó gelaten (geen actie)

- **Act 3-achtergronden** staan al in `assets/achtergronden/Act 3 …/` — vooruit gestaged,
  ongebruikt tot `ACTS_MAX` omhoog gaat.
- **Emoji-art als terugval** voor figuren zonder geladen afbeelding — defensief, blijft.
- **Daily-claim-rollback** bij het starten van een gewone run (kiesHeldEcht): bewuste
  "geen brick"-keuze; de daily heeft een vaste dag-seed dus herstart = zelfde run.
- **three.min.js in de mobiele precache** (600 KB, 1× per cache-bump): UA-sniffing in de
  SW is fragieler dan de kost.
- **Niet-atomaire SW-shell-update**: transiënt (volgende load herstelt); geaccepteerd.

---

## 5. Al afgehandeld (ter referentie)

- ✅ Verouderde spelersteksten ("13 verdiepingen / versla De Slijmkoning") bijgewerkt
  in help + manifest — deze checklist-ronde.
- ✅ `design-system/` in `.gitignore` (nooit committen, afgedwongen). De proloog-art
  staat sinds de vanilla-herbouw als WebP in `assets/proloog/` (gecommit); de
  PNG-bronnen liggen in `assets-bron/proloog/` (gitignored, zoals alle bron-art).
- ✅ Totaal-audit: 19 fixes (combat/input/save/render/perf/PWA/audio) + ~200 regels dode
  code weg (`6b9b8be`).
- ✅ SW: fout-antwoorden vallen terug op cache; offline navigatie met query-string werkt.
- ✅ Corrupte localStorage brickt niets meer (zelfhelende lezers in game.js én audio.js).
- ✅ Daily-bescherming gecontroleerd: seed-whitelist, datum-anker, geen score-farmen.
- ✅ Bestiarium compleet (31/31, alle poses tikbaar) · toetsenbord + mobiel-portret live.
