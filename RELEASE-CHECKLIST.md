# RELEASE-CHECKLIST — SLAY IT

> Laatst bijgewerkt: 3 juli 2026 (na de totaal-audit + eerste playtest-ronde).
> Dit is de afvinklijst voor de stap van "openbare test-build" naar "echte release".
> Niets hieruit is al uitgevoerd — de DEV-shortcuts zijn er nu nog bewust voor het testen.

---

## 1. Blokkers — weg vóór release

### 1.1 DEV-shortcuts verwijderen (zoek op `DEV-SHORTCUT` — alles is gemarkeerd)

Sinds v122 staat zo goed als alles in één aaneengesloten blok in js/game.js. Wat er nog
buiten staat, staat daar met een reden die in de kop van dat blok ook genoemd wordt:
devMobiel en devWereld draaien vroeg in de boot, devDagwet hoort bij de tabel die hij
patcht, devOutro bij de outro — plus index.html en de twee CSS-sporen.

| Wat | Waar | Hoe |
|---|---|---|
| **HET DEV-BLOK**: `DEV_SLEUTEL`/`devInst`/`devInstZet`/`devInstWis`, `devSlachtblok`, `devSprongAct2`, `devDrempel`, `devErfprins(Intro)`, `devSlijmkoning`, `devMetgezel`, de Drops-boog (`_devDropsFight`, `_devDropsReset`, `devDropsLevend/Grief/Reunie/WitVecht/Wis`), `DEV_BUILDS`, `DEV_KLAP` + `_devProcesDrempel`/`_devBedrijfLanding`/`_devNaIntro`/`_devKlapNu`, `devDicktator`, `devSprongAct3`, `devInstVlag`, `DEV_MENU`, `devVersie`, `devMenu`/`devMenuSluit`/`devMenuEsc`/`devMenuItem`, `devVersieHaak` én de drie bootregels onderaan | `js/game.js` — van de comment `DEV-SHORTCUT — HET DEV-BLOK` tot en met `if (!document.getElementById('inst-versie')) document.addEventListener('DOMContentLoaded', devVersieHaak);` (~r10344–11091) | De hele regio in één keer wissen. Het blok is zo geknipt dat er niets van het spel tussen staat. **NB:** `vulInstPaneel()` (bij `toonInstellingen`) BLIJFT — dat is gewone code die het blok alleen gebruikte |
| Logo-klik | `index.html:23` | `onclick="devMenu()"` + `title="DEV-menu"` + `style="cursor:pointer"` + de `<!-- DEV-SHORTCUT -->`-comment weghalen |
| De CSS van het menu | `css/style.css` ~r5470–5516 (`DEV-SHORTCUT: HET DEV-MENU`, t/m `#dev-menu .dev-dicht { … }`) **en** `css/mobiel.css` ~r421–445 (`DEV-SHORTCUT: HET DEV-MENU op het mobiele spoor`) | Beide blokken wissen. Twee sporen, dus twee plekken |
| `devMobiel` + de Ctrl+Shift+M-listener (+ de enige `console.info`) | `js/game.js` ~r127–143 | Blok wissen. Staat bewust buiten het dev-blok: hij zet `data-modus` vóór de eerste paint. De CSS-comments die devMobiel noemen (style.css/mobiel.css) zijn documentatie — mogen blijven of meegeschoond |
| `devWereld` + de URL-sleutel (`WERELD_SLEUTEL_HASH`, `wereldParam`, `wereldWens`) | `js/game.js` ~r145–175 | Alleen wissen als DE WERELD zelf niet meegáát; hij leest de sleutel tijdens de boot, vóór de eerste `renderKaartScherm`. Anders enkel de `devWereld`-console-haak laten staan |
| `devDagwet` | `js/game.js` ~r599–600 | Eén regel (`wetVanDag._force`). Staat naast de DAGWETTEN-tabel die hij patcht; wis hem samen met de `_force`-tak in `wetVanDag()` |
| `devOutro` + de `_dev*`-haken van Outro (`_devHal`, `_devNiveau`, `_devVal`, `_devKaart`, `_devConfig`, `_devEpiloog`, `_devWissel`, `_devTeleport`, `_devVel`) en de testgetters (`_fxNiveau`, `_staat`, `_held`, `_lvlIdx`, `_lift`, `_luik`) | `js/outro.js` — onderaan (`devOutro`-blok) en in het `return`-object van de IIFE | Blok wissen; de `_dev*`-functies + hun vermelding in het `return`-object weghalen (het spel roept ze nergens aan) |
| `devDrempeltafel` + `devDrempeltafelFase` (v128) | `js/drempeltafel.js` — de `DEV-SHORTCUT`-regio; `devDrempel` in `js/game.js` is nog enkel een alias die ze aanroept | Die regio wissen samen met het dev-blok, plus de alias `devDrempel`. Ze zetten allebei `S._devRun` (de taint die `codexSchrijfToegestaan()` leest) — die poort zelf BLIJFT, want de daily-gate hangt er ook aan |
| `DICK.tempo` (ceremonieschaal voor het meetharnas) | `js/game.js`, `const DICK` | Mag blijven staan (hij is 1 in het spel — alleen `devInstZet`/`devInstWis` en de bootregel van het dev-blok raakten hem aan, en die gaan mee weg). Zet hem niet in een instellingenmenu |
| De haak op het versielabel | zit IN het dev-blok (`devVersieHaak`, `DEV_LANGEDRUK_MS`, `DEV_TIKKEN`, `DEV_TIKVENSTER`) | Verdwijnt vanzelf met het blok. Controleer daarna dat `#inst-versie` in `index.html:229` geen listeners meer krijgt — het label zelf blijft (v116) |
| De acceptatiesuite van het menu | `tools/devmenu_acceptatie.js` | Mag blijven (tools/ gaat niet mee in de shell), maar hij faalt na het wissen — schrap hem samen met het blok |

**Waarom kritisch:** alles staat op `window`, dus elke speler kan via de console
`devSprongAct2()` aanroepen of — erger — de logo-klik per ongeluk raken. Op mobiel opent
een **lange druk (≥ 700 ms) of vijf snelle tikken op het versielabel** onderaan ⚙️
Instellingen hetzelfde menu; dat is bewust zonder zichtbare hint, maar het is wel te
vínden. Het menu bevat knoppen die de lopende run én de persistente Codex overschrijven
(`devDropsWis` wist cross-run voortgang).

**Na het wissen:** `grep -ri "dev" js/ index.html css/` moet enkel nog onschuldige treffers
geven (bv. `devicePixelRatio`), `node --check js/game.js` moet slagen, en het spel moet
starten zonder dat er iets aan `#inst-versie` of `.tb-logo` hangt.

### 1.1b Nieuw in v128 — DE DREMPELTAFEL

Het metgezel-ritueel aan de Drempel (Act 1→2) is vervangen door de goktafel van de
Drempelwachter: vier sporten, sport III is het Slachtblok, sport IV brandmerkt je gesmede
kaart. Twee nieuwe bestanden (`js/drempeltafel.js` + `css/drempeltafel.css`, beide in
`index.html` én in de KERN-lijst van `sw.js`), de uitbetaling van de pot hangt in
`gevechtGewonnen` achter `g.tafel`, en de metgezellen zijn **geparkeerd**: er is vandaag geen
vrijspeelweg meer (bestaande Codexen blijven werken). Vóór release: die parkering bewust
beslissen (Drops/Copycat-breker — zie `.claude/notities/metgezel_impact.md`) en de dode
`.drempel-*`-regels in `css/style.css` (~r3549–3587) opruimen.

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
| HET PROCES: is de matige gifbuild te hard gestraft? (bot-meting: 0/12 winst, ook mét heeldrank en metgezel) | **GEEN dial helpt** — gemeten, 12 seeds per cel: hp 200 / 160 / 120 → 0-1/12, tarief 2/3 → 0/12, hofcap 2 → 0/12, 0-kostgewicht 1 → 0/12, claqueur vanaf II → 0/12, factuur bijna uit (2 + 1/post, cap 2) → 1/12. Pas met de Factuur VOLLEDIG uit wint hij 8-10/12. Ook **DE VRIJSTELLING** `DICK.FACTUUR.vrij` (v109, standaard 0 = uit, eerste N posten per beurt gratis) helpt niet: vrij 1 → gif_matig 0/12 én mens 0/12, vrij 2 → gif_matig 0/12 (mens 6/12 factuurbewust) maar gif_opt én kristal naar 12/12/12, vrij 3 → gif_matig 1/12. Dit is een ontwerpkeuze, geen knop: zie de drie ontwerpvragen onderaan §6 van `.claude/notities/eindbaas_contract.md` |
| HET PROCES: valt de mediaan-Slachter te makkelijk? (bot: 12/10/12 over drie beleidsregels, eindigt op ±25% HP) | `DICK.EXECUTIE` (18 → 22) **of** `DICK.FACTUUR.basis3` (7 → 10), niet allebei: samen zakt hij naar 8/12 agressief. `DICK.ONTSLAG` (18/22/26) is nog ongebruikt |
| HET PROCES: te veel lege rondes? | `DICK.claqueurVanaf` (3 → 2) is gemeten en **werkt niet**: nulschade blijft 32-48% (de vaste cyclus van drie zet zelf al één schadeloze decreetronde per drie = 33% bodem) en de mediaan-Slachter zakt naar 8/12 factuurbewust. Eerst de definitie vastleggen (§6, ontwerpvraag 2) |
| HET TONEEL (v114): Act 2 gevecht 1 (de schedelgang) moet 31,6% van haar breedte laten wegsnijden (gemeten op 1440×900; de hertest-suite meldt dit als LET OP-regel met het actuele getal) om de voeten op de geschilderde vloer te krijgen — hergenereren of de crop accepteren? | De prompt staat klaar (`assets/achtergronden/PROMPTS.txt`, sectie GEVECHTSTONEEL — RONDE 2, samen met Act 2 EPISCH 1 en 2). Genereren en overschrijven; daarna in `js/art.js` de GROND-entry op `{ grond: 61 }` zetten en `midden` schrappen. Niets genereren mag ook: de plaat klópt, ze zoomt alleen ver in |
| HET PROCES: dagwet GLAZEN ZIELEN × de Factuur | bewust brutaal gelaten (de speler kiest die dag zelf); de dagwettekst noemt het nu expliciet. Clampen kan in één regel: `glasDmg` overslaan voor `opts.vast` in `vijandAanval` |

---

### 2b. Bekende beperkingen van HET PROCES (v109) — bewust, geen blokkers

- **Herlaad midden in het baasgevecht**: het gevecht begint opnieuw, maar je HP, licht,
  dek en dranken worden hersteld uit het checkpoint dat bij de gevechtsstart gezet is
  (`S.checkpoint`, v108). Een herstart is dus gratis — dat was de baas-HP-reset altijd al.
- **Vista-pariteit (3D)**: de arena-crossfade tussen de drie Raadzaal-platen speelt alleen
  in 2D. In 3D tekent Vista de achtergrond zelf; daar is het een harde wissel. Idem in
  `body.lite` en bij `prefers-reduced-motion`.
- **Art**: de drie hovelingen spelen op terugvalplaten (Omroeper / Aanklager / Klapvee) tot
  hun eigen platen gedropt zijn; `artIdVan` schakelt per pose vanzelf om. Vóór een echte
  release zijn minstens `de_griffier(+_death)` en `de_deurwaarder(+_death)` gewenst —
  anders staat er een Omroeper onder een andere naam.
- **De metgezel slaat door de ceremonie heen**: valt DE HERVERKIEZING tijdens jouw beurt,
  dan kan je metgezel de verse vorm 2 nog één keer raken. Dat is een eigen actor, geen
  vervolgslag van jouw reeks (die wordt wél afgeknipt) — bewust zo gelaten.

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
