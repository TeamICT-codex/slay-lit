# SLAY LIT — Verbeterplan (speeltest-feedback 11-06-2026)

*Feedback uit de eerste echte speelronden van Thomas. Stap voor stap
afwerken; het spel blijft na elke stap speelbaar. Volgorde = prioriteit.*

## ✅ Stap 0a — Gifmagiër-oriëntatie (GEFIXT)
De hergenereerde gifmagier.png keek al naar rechts; de automatische
spiegeling (bedoeld voor de eerste versie) draaide hem daardoor verkeerd.
Spiegeling uitgeschakeld en herverwerkt — snavel wijst weer naar de
vijanden.

## ✅ Stap 0b — Tooltips afgekapt onderaan (GEFIXT)
Tooltips van trek-/aflegstapel liepen van het scherm (tekst onleesbaar).
Tooltips klappen nu automatisch naar boven wanneer er onderaan geen
ruimte is, en de lettergrootte ging van .85 naar .95rem.

## ✅ Stap 0c — Statussen duidelijker zichtbaar (GEFIXT)
Het Zwak-icoon (🌫️) rendert als kleurloos blokje → vervangen door 🥀.
Badges groter (1.05rem) met sterker contrast: gouden rand + warme
achtergrond voor buffs, rode rand + donkerrode achtergrond voor debuffs,
witte vette getallen. Bij het oplopen van een status verschijnt nu de
volledige naam in beeld ("🎯 +2 Kwetsbaar") i.p.v. alleen een icoontje.

## ✅ EXTRA — Fakkel-impact verhoogd (GEBOUWD 11-06)
Start 80 (was 100), kosten omhoog (gevecht 5, elite 7, schat 5) plus
diepte-toeslag (+1 vanaf verdieping 7, +2 vanaf 10). Nieuwe positieve
kant: HELDER licht = 4 kaartkeuzes na een gevecht, schemer 3, donker 2.
Vignet kruipt vanaf de randen binnen bij duister; fakkelmeter in de
topbalk toont nu een vulbalkje. Oppoken +20 (was 25).

## ✅ EXTRA — Relikwie- en drankjes-art-slots (GEBOUWD 11-06)
assets/relikwieen/ en assets/dranken/ zijn drop-zones (id.png/jpg).
Art verschijnt in topbalk, winkel, schat en beloningen; emoji blijft de
terugval. PROMPTS.txt in beide mappen (17 relikwieën + 6 drankjes).
Ook assets/events/PROMPTS.txt aangemaakt (7 sfeerbeelden).

## ✅ Stap 1 — Heldenkeuze cooler en dichterbij (GEBOUWD 11-06)
Probleem: de helden "staan ver", het scherm mag spectaculairder.
Aanpak:
- Heldenpanelen veel groter; held-art ~2,5× huidige formaat, deels
  bóven het paneel uitstekend (overlap-effect).
- Held in beeld met idle-adem + aura in heldkleur (ember vs. gifgroen);
  bij hover: uitval-pose-preview of gloed-flare + naam groter.
- Selectie = korte "stap naar voren"-animatie vóór de run start.
- Startdek-knopje per held: bekijk de 10 startkaarten (hergebruik
  kaartkeuze-overlay in bekijk-modus).

## ✅ Stap 2 — Beloningsscherm: niets laten liggen (GEBOUWD 11-06)
Probleem: onduidelijk dat je op alles moet klikken; goud blijft soms
liggen.
Aanpak:
- "Verder ➤" raapt automatisch alle resterende buit op (goud, drankje
  als er een vak vrij is, relikwie) en toont kort wat je meekreeg.
- Alleen de kaartkeuze blijft een echte keuze (met expliciete
  overslaan-knop).
- Visueel: items krijgen een ✓-vinkje zodra geclaimd; onopgehaalde
  items pulseren zacht.

## ✅ Stap 3 — Events 2.0 (GEBOUWD 11-06; art aanleveren via assets/events/)
Probleem: events zijn visueel zwak (emoji-icoon), en je ziet meteen
exact wat elke optie doet — geen spanning, geen wendingen.
Aanpak:
- Art-slot per event: assets/events/<id>.png (groot sfeerbeeld boven de
  tekst, zoals de gevechtsachtergronden). Promptblokken toevoegen aan
  een nieuwe PROMPTS.txt in die map.
- Mysterie-laag: opties kunnen een vage hint tonen i.p.v. exacte
  uitkomst ("Drink ervan — het ruikt zoet...") met de uitkomst pas na
  de keuze. Per optie instelbaar (sommige mogen transparant blijven).
- Wendingen: events krijgen een kleine uitkomst-pool (bv. bloedfontein:
  70% genees, 20% +max HP, 10% vloek) — seeded, dus eerlijk in dailies.
- Onthulling met dezelfde dramatiek als de booster (flits + geluid).

## ✅ Stap 4 — Multi-hit zichtbaar (GEBOUWD 11-06)
Probleem: "Doe 4 schade, twee keer" oogt als één klap.
Aanpak:
- Kaarteffecten met meerdere slagen krijgen pauzes (~180 ms) tussen de
  klappen: aparte uitval-tikken, aparte schadegetallen, apart geluid.
- Technisch: speelKaart laat async kaart-effecten toe (await def.speel),
  met een hulpfunctie reeksAanval(doel, dmg, n) voor alle ×N-kaarten
  (dubbelslag, klingenstorm per vijand al ok?, slijmregen vijandzijde
  heeft al pauzes — spelerzijde nu ook).

## ✅ Stap 5 — Smeden epischer (GEBOUWD 11-06)
Probleem: smeden voelt vlak en je ziet niet wat de upgrade echt doet.
Aanpak:
- Smeed-ceremonie: gekozen kaart groot in beeld op een aambeeld-scherm,
  hamerslag (schermschok + vonken + smeed-geluid), kaart flitst →
  upgrade-onthulling.
- Voor/na zichtbaar: oude waarden doorgestreept naast nieuwe ("6 → 9
  schade"), naam krijgt de +, gouden gloed.
- Zelfde behandeling voor winkel-verwijderen? (kaart verbrandt) — later.

## ✅ EXTRA — Relikwieën 2.0 (GEBOUWD 12-06)
33 relikwieën (was 17) met schaarste: gewoon (9) / ongewoon (11) /
zeldzaam (7) / episch (4) + 2 heldenrelikwieën. Gewogen drops
(elites geven betere lagen), winkelprijzen per laag, schaarste-chips
en kleurringen overal, en een relikwieënboek (klik in topbalk):
groot beeld + schaarste + effect + lore-regel. Nieuwe toppers:
Feniksveer (eenmalig de dood weigeren), Gebroken Zandloper
(energie-overdracht), Schaduwkroon/Kroon van Sintels (energie in
donker/licht), Zwarte Kaars (verbrand licht → Blok), Fluisterende
Schedel (intenties lezen in het donker), Vijzel en Stamper
(drankjes dubbel). PROMPTS.txt herschreven met epische sjablonen
per schaarste-laag.

## ✅ EXTRA — Baasgevecht 2.0 (GEBOUWD 12-06)
De Slijmkoning vecht nu in drie bedrijven: cinematische intro-titelkaart
("verdieping 13 — de troonzaal"), grote bazenbalk met fase-pips bovenin.
Fase 2 (≤50%): DE KONING SPLIJT — twee slijmpjes verschijnen, +1 Kracht.
Fase 3 (≤25%): KONINKLIJKE WOEDE — +2 Kracht, agressiever aanvalspatroon
(Razende Verplettering 19, Zure Vloedgolf 6×3), rode pulserende balk en
gloed. Doodsklap = gouden flits + stilte voor het eindscherm. Engine
kreeg voegVijandToe() (vijanden mid-gevecht toevoegen, hergebruikbaar
voor Act 2/3-bazen).

## ✅ EXTRA — Stemmen uit de diepte (GEBOUWD 12-06, stijl B+C gekozen)
Fluistertekst (frameloos, paarsig, drijft omhoog en verdampt) bij
vijanden: openingssneren per vijand, sterfwoorden, en in het donker
fluistert de gedeelde duister-pool. De held reageert droog (ember-
kleurig) op overkills (18+) en fakkelverlies. De Slijmkoning kreeg een
koninklijk script (groot groen, gecentreerd): intro, fase 2/3-regels
en laatste woorden. Anti-irritatie: max 1 bubbel per 2,8 s, kort,
kans-gestuurd (Math.random — bewust presentationeel zodat de seeded
spelstroom onaangetast blijft), uitschakelbaar via "💬 Stemmen uit de
diepte" in instellingen. Tekstpoelen in UITSPRAKEN (data.js).

## ✅ EXTRA — Rustplaats met levend kampvuur (GEBOUWD 12-06)
Procedureel geanimeerd kampvuur (CSS): drie flakkerende vlamtongen +
witgele kern, gekruiste houtblokken, pulserende gloed en 14 dwarrelende
vonken met eigen koers. De eigen held staat ademend bij het vuur
(karakter-art). Oppoken laat het vuur 1,2 s écht oplaaien (sneller,
groter, vonkenregen) vóór vertrek; Rusten geeft een groene heelgloed
over de held + groene vonken. Dubbelklik-bescherming. Nieuw
achtergrond-slot: Achtergrondrust1.png in Act 1 achtergronden
(verschijnt automatisch zodra gedropt).

## ✅ EXTRA — De held reist over de kaart (GEBOUWD 12-06)
Held-medaillon (eigen karakter-art in ember-ring) staat op de huidige
kamer, of bij de ingang bovenaan bij een nieuwe run. Bij het kiezen
van een kamer reist hij zichtbaar over het pad (1,2 s, zwevend met
stap-wiebel, drie voetstap-geluiden, kaart scrollt soepel mee) en pas
bij aankomst opent de kamer. Dubbelklik-bescherming tijdens de reis.

## ✅ EXTRA — Entree-animaties (GEBOUWD 12-06)
Vijanden staan niet langer kant-en-klaar opgesteld: ze glijden bij de
gevechtsstart vanuit het duister rechts het toneel op (gespreid, met
fade, huppeltje en stof-poef bij de landing); de held komt van links.
Werkt in 3D (Vista) én 2D (CSS-fallback). Eenmalig per wezen: bij het
splijten van de Slijmkoning komen alleen de nieuwe slijmpjes binnen,
de koning zelf blijft staan.

## ✅ EXTRA — De Codex + kaart-carrousel (GEBOUWD 13-06)
Codex (📖-knop op het titelscherm): verzamelboek over alle runs heen
voor relikwieën (33) en drankjes (6). Ontdekt = ooit bezeten (auto-
geregistreerd via de topbalk-render, dekt elke verwervingsroute;
localStorage 'slayit_codex'). Niet-ontdekt = ❓-silhouet met gestippelde
rand. Klik op een ontdekt item opent het relikwieën-/drankjesboek
bovenop de codex. Compleet = trofee-regel.
Carrousel: in elke focus-weergave (dek, beloningen, galerijen) blader
je nu met ◀ ▶-knoppen, pijltjestoetsen (Esc = terug) en een teller
("3 / 14") door de kaarten.

## ✅ EXTRA — Het Schrijn: meta-progressie via de Codex (GEBOUWD 13-06)
Elk relikwie dat je in een run vindt, laadt zijn "schrijn-lading" op
(Codex.opgeladen, persistent). Op het heldenkeuze-scherm staat het
Schrijn: kies één opgeladen relikwie als startbonus bovenop het
heldenrelikwie. De lading is eenmalig — vind het relikwie opnieuw in
een run om het te herladen. Verzamelen → uitgeven → herjagen.
Codex toont 🗝️ bij opgeladen en dimt opgebruikte. Heldenrelikwieën
doen niet mee (identiteit). LET OP: bij de daily run (ONTWERP stap 3)
moet het Schrijn uitgeschakeld worden voor eerlijke vergelijking.

## SPEELTEST-FEEDBACK RONDE 2 (13-06)

### ✅ R2.1 — Kroon van Sintels/Schaduwkroon pas vanaf beurt 2 (BUG, GEFIXT)
De energiebonus werd alleen in beginSpelerBeurt toegepast, niet bij de
gevechtsstart. Nu ook in startGevecht — boost vanaf beurt 1.

### ✅ R2.2 — Schrijn: tot 3 relikwieën meenemen (GEBOUWD)
schrijnKeuze werd een lijst (max 3), teller in de titel ("2/3").
Eigen input: de balans bewaakt zichzelf — drie ladingen verbruiken per
run terwijl je er hooguit een paar terugvindt, dus de voorraad slinkt
vanzelf en herjagen blijft nodig. Daily blijft zonder Schrijn.

### ✅ R2.3 — Gevallen Avonturier: 35 → 60 goud (GEFIXT)
Eigen input: 60 maakt het een echte duivelse deal — de vloek Pijn is
een dode kaart die je hele run meedraagt, dat mag stevig betalen.

### ✅ R2.4 — Rustplaats: held groter + zit-pose (DEELS — art aan Thomas)
Held op de rustplaats 200 → 256 px. De rest-pose-prompts stonden al
klaar in STATE-PROMPTS.txt en zijn aangescherpt: de held zit nu op een
houtblok/boomstam bij het vuur (speler_rest.png / gifmagier_rest.png).
Zodra gedropt wisselt de scène automatisch naar de zithouding.

### ✅ R2.5 — Block/cast-poses langer (GEFIXT)
Vijand-blok en -cast: 0.9 s → 1.5 s (elites 1.9 s, bazen 2.6 s).
Spelerblok 1.3 s, kracht-cast 1.4 s, splijt-cast van de koning 2.6 s.

### ✅ R2.6 — Death/victory screen 2.0 (GEBOUWD)
Het einde is nu een ceremonie: held groot in death- of victory-pose,
gestaffeld onthullende reisstatistieken (verdiepingen, gevechten,
kaarten, schade, goud, relikwieën), een epitaaf/lofregel uit een poel,
de seed, en bij een dood de schrijn-troost ("je vondsten wachten").
Dalende as-deeltjes bij verlies, gouden stralen bij winst.
Knoppen: "Opnieuw afdalen ➤" (direct naar heldenkeuze) + terug.

### 📌 R2.7 — Metgezellen/Familiars (ACT 2-ONTWERP, in ONTWERP.md)
Permanent gezelschap zodra ontgrendeld, voor een beperkte duur (bv. N
gevechten of tot het einde van de act). Soorten: goed / neutraal /
kwaadaardig, gekoppeld aan keuzes en verhaallijn. Eigen input: klein
hulpje naast de held met één duidelijk per-beurt-effect (schim geeft
1 Blok, rat steelt goud bij kills, imp 2 schade maar vreet 1 licht per
beurt...), ontgrendeld via events; alignment stuurt welke events je
daarna tegenkomt. Volledige schets in ONTWERP.md.

### R3.1 — Fakkel-vignet 2.0 (KLAAR, 2026-06-12)
Feedback: "het effect van de fakkel meer laten zien aan de zijkanten,
subtiel, niet gameplay-storend". Vignet van gevecht-only naar
body-niveau (kaart/rust/winkel/event/gevecht), glijdende sterkte per
fakkelpunt, nadruk op de zijkanten, naflakkeren bij duister/gedoofd,
onderaan uitgemaskeerd zodat hand en knoppen vrij blijven.

## Geparkeerd
- **Seed-uitleg/UX**: wordt pas echt zinvol samen met de daily run en
  uitdaagcodes (ONTWERP.md stap 3-4). Dan: uitleg-tooltip, "kopieer
  seed"-knop, "speel deze seed opnieuw".

## Werkwijze
Per stap: bouwen → Playwright-verificatie → screenshot ter goedkeuring.
Stappen 1, 2 en 4 zijn klein-middelgroot; 3 en 5 zijn grotere brokken.

### R3.2 — Thoverk Racht, derde held: ONTWORPEN (2026-06-12)
Volledig ontwerp in ONTWERP.md: De Kolendruïde (fakkel-economie +
wortels/doornen + risico), 19 eigen kaarten, 5 relikwieën, 3 drankjes.
Promptbibliotheek volledig aangevuld (STATE-PROMPTS + kaarten +
relikwieen + dranken). Drops geparkeerd als eerste Act 2-metgezel.
Wacht op art-drop van Thomas; implementatie daarna (checklist in
ONTWERP.md).
