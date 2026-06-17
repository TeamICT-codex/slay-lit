# Act 2 — Geprioriteerd reviewrapport (audit + 3 verdiepingen)

> Uit een 10-agent multi-agent audit (6 dimensies + balans-uitdager + setting-ontwerper
> + bug-verificateur + synthese), 17-06-2026. 39 bevindingen, 11 hoog/kritiek. Beslissings-
> document: Thomas kiest de setting-richting en geeft groen licht voor de fixes.

## TL;DR

Act 2 staat er mechanisch solide bij: de Copycat-architectuur is crash- en savecorruptie-vrij
(mid-fight-state wordt bewust niet gepersisteerd), de lookup-bugklasse is overal vermeden, en
de kern-these ("wie optimaal speelt voedt de baas") is écht in code waargemaakt. **Geen softlocks
of savecorruptie** — het echte werk zit in *eerlijkheid* (telegraaf liegt), *dode beurten*, en
één diepe scheefte: de Copycat-mechaniek werkt vandaag bijna alleen tegen de Slachter, omdat
slechts 7 kaarten een `kopie`-veld hebben. Top 3: (1) Act-2 aanval-telegraaf gelijktrekken met
de echte schade (game.js:1791), (2) genoeg `kopie`-kaarten voor Gifmagiër + Kolendruïde, (3) de
fase-cap fase-afhankelijk maken. Daarnaast: de Drops-rite is praktisch onontdekbaar (hoog, niet
kritiek). Setting-aanbeveling: **Richting 1 (Het Archief)** als nu-te-bouwen basislaag.

## 🟥 Must-fix (feel/fairness — geen crashes/softlocks/savecorruptie)

Drie verifieerders bevestigden: de save-architectuur sluit alle mid-fight Copycat-state uit van
persistentie (`saveSpel` game.js:1092 `{...S, gevecht:null}`) en alle hooksites guarden lui. De
lijst gaat over **oneerlijkheid en dode beurten**, niet over technische blokkers.

1. **Telegraaf liegt** (`game.js:1791` mist de scaling van `:805`). In Act 2 toont élke aanval-intent
   ~15% te laag (Echo 8→10; Spiegelslag 11→13; Persen 13→15). → `actDmg(b)`-helper, gebruik in
   `vijandAanval` (805) én `intentTekst` (1791). Eén bron van waarheid.
2. **Plagiaat-intent lekt in duister** (`game.js:1801-1805`). De plagiaat-tak toont in duister nog
   exacte `eindDmg` + kaartnamen, terwijl het licht-contract dat verbiedt. → bij `verborgen`: `🎭 ?`.
3. **de_mal verspilt Gieten bij 4-cap** (`data.js` de_mal.kies + `voegVijandToe`). Bij ≥4 vijanden
   no-opt voegVijandToe → lege beurt. → vol-check in de_mal.kies vóór Gieten.
4. **Failed steal = dode beurt** (`copycatSteel` faalt stil als alle instances in de hand zitten;
   intent toonde al "steelt"). → schade-vangnet in de steel-doe.
5. **Anti-softlock-bodem garandeert geen speelbare kaart** (alleen +1 energie bij enkel vloeken).
   → eerst reshuffle van afleg proberen.
6. **Latente offer-gate** (gate't op generieke `.baas` i.p.v. `.copycat`). Nu onbereikbaar; bug
   zodra een 2e niet-copycat Act-baas bijkomt. → parkeren tot Act 3, genoteerd.

## ⚖️ Balans-bijstellingen (na de uitdager; alleen de echte, held-overschrijdende)

Rode draad: bijna elk "te makkelijk/plat"-probleem is een **Slachter-fenomeen**; gif/kolen ervaren
de Copycat anders.

1. **Slechts 7 `kopie`-kaarten → eindbaas werkt alleen tegen de Slachter** (zwaarste breuk).
   Gifmagiër heeft effectief 1 stelbare dreigingskaart; een gif/kolen-build voedt niet en er is
   niets te stelen → baas valt terug op "Pappie Bellen" (~7 dmg) = triviaal voor 2/3 helden.
   → `kopie:{soort:'aanval',veld:'dmg'}` op 3-4 stevige aanvallen per held; pathetische zet van
   vast 6 → `6+fase·3`.
2. **Plagiaat-cap 30 bindt al in F1 → escalatie plat (Slachter)**. → `{1:22, 2:28, 3:36}` per fase.
3. **het_origineel stapelt rij-HP-bonus ÉN ×1.30 → taaier dan je elite** (held-neutraal). →
   `game.js:1424`: `if (!def.elite && !def.baas && !def.episch) hp += …`. Hoogste prioriteit/effort.
4. **TERUGWIN=14 + onvoorwaardelijke mercy-lek → loop neutraliseert zichzelf**. → TERUGWIN→20 +
   mercy-lek alleen bij `!g.raakteCopycat`.
5. **Mono-goedkope-spam stalt de baas in F1**. → turn-floor in copycatBeurtStart (beurt 5→F2, 10→F3).

**Genuanceerd/verworpen:** baas-HP 245 (Slachter-burst-cijfer; 210 klopt al voor gif/kolen — niet
ophogen tenzij playtest); piek-voer `/2` (verfijning, ná #1); offer 25/herindex +4 (Slachter-randgeval).

## 🧩 Mysterie & flow

- **De doof-rite is praktisch onvindbaar** (je komt altijd op fakkel=100 binnen; niets zegt "doof").
  Een deck zonder lichtkaarten kan de rite niet eens voltrekken. → geen knop, maar een **omkerende
  verbod-regel** van de Erfprins in `toonBaasIntro` bij rijp mysterie ("En blijf van dat lichtje AF.
  NIET DOVEN."). Reverse psychology. Voor lichtloze decks: optionele doof-actie alleen bij rijp.
- **drops_episch is een mapseed-loterij** (episch-node ~8%/rij). Een run kan 0 episch-nodes hebben →
  unlock onafmaakbaar. → garandeer ≥1 bereikbare episch-node bij open mysterie, óf 2e bron (de_mal).
- **drops_figuur is bijna onvermijdelijk** (3 bronnen). → schrap de copycat-dubbel-bron.
- **Nederlaag-duiding groeit niet mee** (2 takken). → herstel 3-traps (0 / 1-2 / rijp).

## 🎭 Thematische aanscherpingen

- **De Erfprins-dood verzwijgt de these** (`„...waarom verlies ík...?"`). → split op `copycatGebroken`:
  na een Drops-breuk-win een these-sluitende regel ("Trouw... dát stond niet in de catalogus...").
- **De kopieerhel kopieert een THEMA, niet JOU.** → geef "Het Origineel" een mini-plagiaat als
  voorproef. **⚠️ bug-verificateur:** de naïeve fix verwijst naar niet-bestaande velden
  (`sp().laatsteAanvalDmg`) → NaN. Track éérst een `g.laatsteSpelerDmg` in `aanvalOp`.
- **Observatie-voeding negeert blok/gif/status.** → klein voer-aandeel voor niet-aanval (ná balans #1).
- **Reveal-"vlam"-rest: VERWORPEN** — data.js:994 is al dier-neutraal. Geen actie.

## 🏚️ Setting: dystopischer & relevanter

De content (Inktklerk ✒️, De Mal 🖨️) draagt het kopieer/papier-thema al, maar de **setting**
(achtergronden + schermtaal) is een generieke necropolis. De drie richtingen zijn **cumulatief**;
géén raakt de Copycat-balansconsts of roster-IDs.

| Richting | Kost | Kern | Code? |
|---|---|---|---|
| **1. Het Archief** — catacombe als verrotte bureaucratie die lijken indexeert | Klein | Nissen vol vergeelde contracten; botten gestapeld als ledgers; "Jij bent het volgende dossier." | Geen |
| **3. Het Koude Register** — systeem-licht vs. jouw onfactureerbare vlam | Middel | Koud klinisch blauw-grijs systeem-licht; jouw warme fakkel het enige onfactureerbare. Lost rite-ontdekbaarheid op. | Alleen tekst |
| **2. De Doorslagwereld** — namaak-architectuur die de baas foreshadowt | Middel | Identieke nissen in oneindige rijen, spiegelgangen. Hoogste payoff. | Ja (mini-plagiaat) |

**Aanbeveling — bouw nu Richting 1 (Het Archief):** laagste kost (PROMPTS.txt-herschrijving +
copy-pass), hoogste relevantie. Verzoent de Copycat-rosterart met de muur waar hij voor staat, en
geeft B.A.A.S./billability eindelijk een setting-echo. **Wijzig ACT_NAMEN[2] NIET** — laad "Het
Archief" via een subtitel-string in de act-overgang (saves/refs breken niet). Daarna stapelen:
(3) Koude Register als belichtings/signpost-laag, dan (2) Doorslagwereld (na een balans-testronde).

## ✅ Wat goed is (niet aankomen)

- Save-architectuur sluit mid-fight Copycat-state uit persistentie — hele bugklasse weg-ontworpen.
- Lookup-bugklasse vermeden: alle velden in maakVijand geïnit, élke hooksite guardt lui.
- Plagiaat exact één keer act-geschaald (omzeilt vijandAanval) — telegraaf-pips kloppen.
- Anti-degeneratie: STEEL_CAP/ARSENAAL_CAP/stall-straf/sticky fases; NaN-dichte formules.
- These mechanisch waargemaakt: bron-gegate voeding, "Pappie Bellen" bij lege buffer, Drops
  onindexeerbaar (passeert speelKaart nooit).
- Codex-signposting + "verlies = progressie"; eeuwige_lont-edge correct afgevangen.
- Slot-systeem data-gestuurd met act1-fallback (art.js) — setting omgooien = puur art + copy.

## 📋 Voorgestelde uitvoervolgorde

1. **het_origineel rij-bonus-fix** (game.js:1424, `&& !def.episch`) — one-liner, nul risico.
2. **Telegraaf-fix** (`actDmg()` in 805 + 1791) — breekt nu fair-play, raakt elke ontmoeting.
3. **Plagiaat-intent duister-lek** (1801-1805).
4. **Dode beurten:** de_mal vol-check, failed-steal vangnet, anti-softlock reshuffle.
5. **Copycat held-dekking** (`kopie`-velden + pathetische zet `6+fase·3`) — zwaarste cross-held breuk.
6. **Fase-cap `{1:22,2:28,3:36}`** — escalatie voelbaar. Speeltest tegen laag-HP.
7. **TERUGWIN→20 + voorwaardelijke mercy-lek + turn-floor**.
8. **Mysterie:** rite-signpost, drops_episch-garantie, 3-traps duiding, dood-regel-split.
9. **Setting Richting 1 (Het Archief)** — PROMPTS-herschrijving + re-generatie + copy-pass + webp.
10. **Later/na playtest:** voer-herbalans, Echo-derde-patroon, Doorslagwereld + mini-plagiaat (nieuw
    `g.laatsteSpelerDmg`-veld eerst), latente offer-gate (Act 3).

**Speculatief / playtest-afhankelijk:** exacte fase-cap-waarden, TERUGWIN=20, baas-HP (waarschijnlijk
niet omhoog) — richtingen, geen zekerheden; valideer per held.
