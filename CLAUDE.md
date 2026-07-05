# SLAY IT — werkafspraken

Roguelike deckbuilder in vanilla JS/HTML/CSS, als PWA gedeployed via git push
naar `main` (geen build-stap). Eén ontwikkelaar (Thomas), alles in het
Nederlands.

## Taal & communicatie

- Alle output, commitboodschappen en code-comments in het Nederlands (Vlaams
  mag). Korte imperatieven van Thomas ("check eens even", "ga verder",
  "do your thing") zijn go-signalen, geen vragen.
- Bij een playtest-feedbacklijst (screenshots + issues): eerst een duidelijk
  stap-voor-stap-plan voorleggen, pas bouwen na expliciete "go".
- Wees grondig zonder dat erom gevraagd wordt: doe zelf extra controle-passes;
  audits liever te diep dan te oppervlakkig.

## Git & deploy

- Direct committen en pushen naar `main`; geen branches of PR's.
- Git-author: `Thomas Aelbrecht <ict@hetleercollectief.be>` (globaal
  geconfigureerd; nodig voor deploys).
- Elke wijziging die live zichtbaar moet zijn vraagt een cache-bump in
  `sw.js`: `const CACHE = 'slayit-vNN'` + korte NL-comment. Zonder bump blijft
  de oude shell geserveerd.

## Art-pipeline

- Bij elke art-drop: volg de `/art-drop`-skill (dambord-verwijdering → visuele
  check → WebP-conversie → integratie-check → preview-verificatie →
  cache-bump → commit + push). Nooit rauwe PNG's in de repo laten staan;
  originelen horen in `assets-bron/`.
- Elke pose = een APARTE afbeelding, bestandsnaam `{id}_{pose}`.
  Facing: helden kijken naar RECHTS, vijanden/metgezellen naar LINKS
  (ze staan in het gevecht tegenover elkaar).
- Elk nieuw art-vereist element (vijand, kaart, relikwie, icoon, metgezel,
  achtergrond…) krijgt meteen zijn prompt in de juiste
  `assets/**/PROMPTS.txt`, met stijlanker per act (Act 3-handtekening:
  gesmolten rood onderlicht) om prompt-convergentie tegen te gaan.

## Code-conventies & bekende bugklassen

- CSS rijdt op twee sporen: `css/style.css` = basis + laptop,
  `css/mobiel.css` = alles onder `body[data-modus="mobiel"]`. Lees vóór
  mobiel/CSS-werk het geheugenbestand `mobiel-laptop-sporen.md`.
- Geen kale module-level `JSON.parse` (bracked ooit `audio.js`): parse in een
  try/catch of lazy.
- Bij elke nieuwe enum-achtige waarde (bv. een nieuwe zeldzaamheid): audit
  alle `OBJ[sleutel]`-lookups die de oude waardenset aannemen.
- `drops_wit` (Drops de Witte) hoort nooit in de gewone metgezel-rotatie —
  alleen via het grief-moment.

## Spelstand

- `ACTS_MAX = 2`: Act 3 (het Slachtblok, eindbaas de DICKtator) is ontworpen
  (ACT3-PROMPTBIB.md) maar bewust nog niet gebouwd.
- DEV-shortcuts zitten er bewust nog in voor het playtesten; zie
  RELEASE-CHECKLIST.md vóór een echte release.
