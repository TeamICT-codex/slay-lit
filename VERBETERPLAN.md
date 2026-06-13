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

### R3.3 — Het lichtverhaal: 6 kaarten + 6 relikwieën (KLAAR, 2026-06-12)
Feedback: "kaarten die zaken combineren met het lichtverhaal + zotte
relikwieën". De fakkel betaalde alleen; nu betaalt hij ook terug.
Kaarten: Lichtdief (steelt licht), Vlamschild (helder-bonus),
Duisterklauw (schaalt op duisternis), Offervlam (licht → energie +
kaart), Brandmerk (Slachter), Lichtrot (Gifmagiër, gif schaalt op
duisternis). Relikwieën: Kaarsenstomp (+3 licht na gevecht),
Vonkenkluis (lichtwinst +1), Vuurvreter (verbranden = 2 schade aan
alles), Fakkeljongleur (1e verbrand-kaart per beurt gratis),
Mottenkroon (helder = +1 kaart per beurt), De Laatste Lucifer
(eenmalig: gedoofd → 50). Bewuste zotte combo: Fakkeljongleur +
Omarm het Duister (kracht zonder lichtverlies, 1×/beurt) — feature,
geen bug. Alles Playwright-geverifieerd op exacte getallen.

BEVINDING voor Thoverk-implementatie: trekKaartBeloning weegt enkel
gewoon/ongewoon/zeldzaam — épische KAARTEN droppen nooit. Wilde Oogst
en Hart van de Duivelboom dus als zeldzaam implementeren, óf een
episch-gewicht (~3) toevoegen aan de weging.

### R3.4 — Drie zaadjes geplant (2026-06-12)
1. **Held-gekleurde relikwieën als designprincipe** — vastgelegd in
   ONTWERP.md: universeel droppend, asymmetrisch waardevol, het
   Schrijn als doorgeefluik; geen UI-hints, ontdekking = de magie.
2. **Death-art standaardvijanden** — prompts voor alle 8 staan klaar
   in STATE-PROMPTS.txt (alleen _death, eigen kijkrichting, niet
   spiegelen). Werkt zonder code zodra gedropt; andere states kunnen
   later altijd nog per vijand.
3. **GEPARKEERD: emoji → echte UI-iconen.** Aanpak t.z.t. zoals alle
   art: drop-zone assets/ui/ + lader met emoji-terugval, dus iconen
   vervangen emoji vanzelf per drop. Inventaris (grootste effect
   eerst): rustknoppen (🛏️⚒️🔥), kaart-nodes (⚔️😈❓🔥💰🎁👑),
   statusiconen, intentiehints, topbalk (❤️🔥🪙🏔️), energie-orb,
   stapels. Promptbibliotheek schrijven we wanneer Thomas eraan
   begint — vaste stijl: klein leesbaar op 24px, donkere rand, warm
   palet.

### R3.5 — Eindscherm-achtergronden (KLAAR, 2026-06-12)
Winst toont nu de epische overwinningsplaat (bestond al); verlies is
bedraad op "Achtergrond nederlaag ACT1" en verschijnt vanzelf zodra
de plaat gedropt wordt. Prompts voor nederlaag-platen act 1/2/3 staan
in achtergronden/PROMPTS.txt (centrum donker/rustig houden — daar
staan held, titel en knoppen).

### R3.6 — GEPARKEERD: Het Slachtblok (eigen kaart smeden, Act 3)
Inscryption-achtige kaartcreatie met offer-twist: 2 geliefde kaarten
vernietigen om één zelfgenoemde kaart te smeden. Twee momenten: het
Act 3-altaar (levend, vóór de eindbaas) en de dood in de diepte
(kaart wacht in de Codex). Volledig ontwerp in ONTWERP.md; bouwen bij
Act 3, samen met de Slachtblok-art.

### R3.7 — Flame: Thoverks inside-classic (ONTWORPEN, 2026-06-12)
20e Thoverk-kaart, episch: 3 energie + verbrand 5 licht + uitputten
voor 18 schade aan alles + 2 Kracht. Epiek in de presentatie (eigen
pose thoverk_flame, oranje flits, gegarandeerde kreet "FLAME."),
balans in de prijs. Episch-dropgewicht 3 toegevoegd aan
trekKaartBeloning (al live, no-op tot Thoverk landt) — Wilde Oogst
en Hart van de Duivelboom blijven daardoor episch; de R3.3-
downgrade-aantekening vervalt. Prompts voor pose + kaart-art staan
klaar.

### R3.8 — Signature-moves voor álle helden (KLAAR, 2026-06-12)
Symmetrie met Flame: elke held één episch kaartmoment met eigen pose,
schermflits en kreet via nieuw signatuurMoment() (2D-terugval: gloed
op de spelerzone). LIVE: Beulswerk (Slachter, 3⚡, 32 schade één
doelwit, kost 4 eigen HP, uitputten — kreet "Kniel.") en Moederslang
(Gifmagiër, 2⚡, alle vijanden 6 Gif + 1 Zwak, uitputten — kreet
"Ssss... zij is wakker."). Eerste échte épische kaarten in de pools
(gewicht 3). Poses speler_beulswerk en gifmagier_moederslang: prompts
klaar, art verschijnt vanzelf bij drop (state-probe uitgebreid voor
helden). Geverifieerd: schade/zelfschade/gif/zwak exact, flits +
kreet aanwezig, geen fouten.

### R3.9 — THOVERK LIVE: derde speelbare held (KLAAR, 2026-06-12)
Act 1 is compleet met 3 helden. De Kolendruïde (66 HP, koperbrons):
20 eigen kaarten (incl. Flame met signatuurmoment), startrelikwie Het
Houten Been (1 Doornen + 4 Blok op beurt 1), 4 vindbare relikwieën
(Smeulbuidel, Kookpot van Maxenzele, Mosamulet, Tak van de
Duivelboom) en 3 drankjes (Maxenzeelse Stoofpot, Magische Sigaar,
Duivelshars). Nieuwe statussen Sporenkring en Duivelhart (het hart
vreet rechtstreeks uit de fakkel, bewust buiten jongleur/smeulbuidel
om). Art-drop verwerkt: 21 karakterbeelden (incl. 8 death-states
standaardvijanden + 2 signature-poses) + 2 kaart-arts, 49 MB → 4 MB.
Volledig geverifieerd: heldkeuze ×3, alle kaarteffecten exact, alle
relic-hooks, drankjes, art-loading, geen JS-fouten. Drops (metgezel)
volgt in Act 2.

### R3.10 — GEPARKEERD: victoriescherm groter + heldenontgrendeling
1. **Eindoverwinningsscherm**: voelt te klein/bescheiden — held-art
   en titel groter en centraler, statistieken meer presence, het
   moment vieren. Oppakken bij de volgende UI-ronde.
2. **Heldenontgrendeling met introqueeste**: volledige schets in
   ONTWERP.md (Slachter start, Gifmagiër via "De Gekooide"-event,
   Thoverk via 3-staps stoofpotqueeste, Codex-migratie zodat
   bestaande spelers niets verliezen).

### R3.11 — Witresten uit de karakter-art (KLAAR, 2026-06-12)
Feedback: wit oogt slordig, vooral aan Thoverks staf. Dambordscript
uitgebreid met drie regels: kleine ingesloten wit-zakjes (één
ruittint volstaat nu), verweesde witte eilandjes (half opgegeten
rookflarden los van de figuur) en uitstekende witte brokken (veel
rand aan transparantie = wegsnijden; interieur-highlights blijven).
Alle 20 nieuwste beelden herverwerkt vanaf de originelen en opnieuw
naar WebP. SW-cache v6→v7 zodat bestaande spelers de schone art ook
echt te zien krijgen (eenmalige hercache).

### R3.12 — Fix: startdek Kolendruïde was onklikbaar (KLAAR, 2026-06-12)
heeftRelikwie() las blind S.relikwieen, maar vóór een run bestaat die
lijst niet. Alleen Thoverks startdek raakte die route (lichtkaart
Vonkenbeet → Levend Vuur-korting in kkost). Nu null-veilig; alle drie
de startdekken geverifieerd (10 kaarten, geen fouten).

### R3.13 — GEPARKEERD: mobiel-optimalisatie (verkenning + 6-fasenplan)
Grondige codebase-verkenning gedaan (6 dimensies: viewport/responsive,
touch-input, gevecht-UI, 3D/perf, overige schermen, PWA). Volledig
gefaseerd plan in ONTWERP.md. Kern: doable, ~80% media-query-only dus
laptop blijft ongemoeid. 4 blokkers (afdaalkaart 700px, kaarthand te
breed, 3D default-aan op touch, tooltips muis-only). Aanrader startpunt:
Fase 1 (3D uit + lite aan op touch, 4 regels game.js, nul desktoprisico).

### R3.14 — Mobiel-optimalisatie UITGEVOERD: alle 6 fasen (KLAAR, 2026-06-13)
Het R3.13-plan volledig uitgevoerd, elke fase Playwright-geverifieerd
op telefoon (Pixel 5-emulatie) én desktop, met de laptopervaring bewezen
ongewijzigd. Commits: Fase 1 (3D uit + lite aan op touch), Fase 2
(480px-breakpoint + viewport-fit), Fase 3 (afdaalkaart swipebaar +
kaarthand/HUD passen — de blokkers), Fase 4 (touch-tooltips + drank-
long-press + tik-feedback), Fase 5 (schermen reflowen/scrollen + 2D-klem
koppelt onderbalk), Fase 6 (safe-area via env() + app-iconen + PWA-meta).
Desktop-veiligheid: media-query-only (≤480px) of @media(hover:none),
feature-detect (pointer:coarse), min()/clamp() en env() (=0 op desktop).
SW-cache bewust op v7 gehouden (geen art-wipe). Eindregressie desktop:
volledige run-flow zonder fouten. Mobiel nu speelbaar + installeerbaar.

### R3.15 — Mobiel-polish: tap-to-inspect handkaart (KLAAR, 2026-06-13)
Op touch tilt de eerste tik een handkaart groot omhoog (lezen, bij sterke
overlap), pas de tweede tik op dezelfde kaart speelt 'm; een gerichte
kaart gaat dan naar de richt-stand. window.mobiel-gated → desktop speelt
één klik = direct, ongewijzigd. Voorbeeld wordt gewist bij nieuwe beurt
en bij een vijand-tik zonder selectie. CSS-lift in @media(hover:none)
(telefoon + touch-tablet). Geverifieerd: touch preview→spelen (skill +
gerichte kaart, 6 schade), desktop direct spelen, geen fouten.

### R3.16 — Mobiel groter: liggend gepolijst + staand vergroot (KLAAR, 2026-06-13)
Speeltest: "alles te klein op mobiel, gevechten amper zichtbaar, kaarten
onleesbaar". Klopte — het spel is breed van opzet (rij personages +
kaartwaaier), staand propte alles te klein. Keuze "allebei":
- LIGGEND (aanrader): nieuwe @media(orientation:landscape) and
  (max-height:500px) and (pointer:coarse) comprimeert verticaal
  (onderbalk 150px, kaarten 100x140, HUD weer naast de hand) zodat de
  volle tablet-breedte past zonder afgekapte hand → speelt als op laptop.
- STAAND groter: vijanden wrappen naar 2 rijen (fors i.p.v. samengeperst),
  sprites + kaarten groter (104→116px), strijdveld verticaal gecentreerd.
- Vrijblijvende eenmalige rotatie-tip (toast, géén blokkade), enkel touch
  + portrait. Geverifieerd: desktop ongewijzigd (138px/235px/nowrap, geen
  toast), geen fouten.

### R3.17 — KRITIEKE FIX: 3D bleef aan op mobiel (onspeelbaar) (KLAAR, 2026-06-14)
Speeltest op echt toestel: gevecht onspeelbaar — reuze 3D-billboards,
kaarten zweefden over de scène. Oorzaak: bestaande spelers hadden een
OPGESLAGEN INST met d3=true (de oude default vóór de mobiel-update); die
saved-waarde overschreef de nieuwe mobiele default, dus 3D bleef aan —
verversen hielp niet (geen cache-, maar localStorage-kwestie). Mijn
emulatietests misten dit omdat een verse context geen oude INST heeft.
Fix: (1) d3Gewenst() geeft op window.mobiel altijd false → 3D hard uit op
telefoon, ongeacht instellingen; (2) eenmalige migratie forceert een
opgeslagen d3=true op mobiel naar false + lite aan. Geverifieerd met een
gesimuleerde oude INST: mobiel → 2D-gevecht, desktop → INST onaangeroerd
(blijft 3D). 2D-layout op telefoon nu speelbaar (speler + vijanden +
kaarten leesbaar).

### R3.18 — KERNBUG: mobiele CSS op breedte i.p.v. touch (gemist op bredere gsm's) (KLAAR, 2026-06-14)
Speeltest op echt toestel: "alles klein, gevechten onspeelbaar, desktop-
indeling op gsm". Oorzaak: alle mobiele CSS hing aan @media(max-width:480px),
maar telefoons rapporteren uiteenlopende CSS-breedtes (390–540px). Een gsm
van ~500–540px viel buiten 480 → kreeg de DESKTOP-indeling (figuren ver
uiteen, lege ruimte, kleine titel). Mijn emulatie draaide op 390px en zat
nét binnen de grens → nooit gezien. Gereproduceerd op 540px (flex-end,
nowrap, onderbalk 235 = desktop). Fix: mobiele CSS herstructureerd naar
(pointer: coarse)-queries i.p.v. breedte: A) universeel-touch (titel,
overlays, scrollbare schermen, map-swipe), B) staand-gevecht (wrap,
gecentreerd, HUD boven hand), C) liggend-gevecht (verticaal compact).
Globale 14px-tekstverkleining verwijderd (maakte alles klein) → 16px-basis,
grotere kaarttekst + titel. Geverifieerd op 360/412/540 staand + liggend
(allemaal de mobiele layout) en desktop (ongewijzigd: flex-end, 235px,
138px kaart, 16px). Nog open: muziek kraakt op gsm (apart na te kijken).

### R3.19 — Leven op mobiel: 2D-poses + animaties terug (KLAAR, 2026-06-14)
Speeltest: "geen enkele beweging of pose-verandering op mobiel, voelt dood".
Twee oorzaken: (1) ik forceerde lite-modus op mobiel, en lite zet via CSS
animation:none op de figuren → álle beweging dood; (2) de pose-art
(attack/cast/hit/block/death/victory) zat alleen in het 3D-systeem (Vista),
in 2D werd het basisplaatje nooit verwisseld. Fix: (1) lite niet meer
geforceerd op mobiel (alleen bij echt zwakke hardware) + migratie die de
eerder geforceerde lite weer uitzet op capabele toestellen → ademhaling,
lunge, hit-flits, death-fade werken weer; (2) nieuwe pose2D() verwisselt het
DOM-figuurplaatje tijdelijk naar <art>_<state> in 2D, ingehaakt bij blok,
speler/vijand-aanval, hit, death, cast, victory en signatuurmomenten; plus
een 2D-lunge voor vijand-aanvallen. Geverifieerd op mobiel: lite uit,
adem-animatie actief, attack-pose wisselt + lunge + keert terug, death-pose
blijft staan; geen fouten; cast-pose visueel bevestigd.

### R3.20 — Mobiel: kaarten niet meer afgekapt + art-overloop + draai-banner (KLAAR, 2026-06-14)
Speeltest: kaarten onderaan afgekapt (tekst onleesbaar), kaart-artwork loopt
over de rand, geen draai-indicatie. Gereproduceerd op 412/540/640px hoog
(liggend) + 430px (staand): kaart-onderkant viel 11–62px onder de schermrand.
Oorzaken + fixes: (1) flexbox min-height:auto duwde de onderbalk van het
scherm → onderbalk nu position:fixed aan de schermrand + #strijdveld
min-height:0 + padding-bottom (figuren erboven); (2) de waaier-vorm (--til)
spreidde de buitenste kaarten naar beneden → op mobiel een VLAKKE hand
(--til 0, nauwelijks rotatie); (3) kaart-art was vaste 116px breed = breder
dan de mobiele kaart → mee geschaald (84/98px). Resultaat: kaarten volledig
zichtbaar/leesbaar op alle telefoon-afmetingen, art binnen de kaart.
Plus een wegklikbare draai-banner die in staande stand verschijnt (onthoudt
de keuze) i.p.v. de gemiste toast. Geverifieerd op alle dims + desktop
ongewijzigd, geen fouten.

### R3.21 — Mobiel: transparante compacte topbalk + volle-hoogte gevecht (KLAAR, 2026-06-14)
Speeltest: de topbalk pakt te veel plaats in battle; in portrait moet het hele
scherm bruikbaar zijn; de header is bijzaak. Aangepakt op touch: topbalk
compact (40px) en transparant (fade i.p.v. massieve balk), logo + diepte
verborgen, kleinere iconen. Het gevechtscherm krijgt de VOLLE hoogte
(#scherm-gevecht top:safe-area) met de topbalk er transparant overheen →
~52px extra voor het strijdtoneel. Figuren in staand vergroot (speler 140,
vijand 122, baas 178) met de gewonnen ruimte. Geverifieerd: kaarten niet
afgekapt (staand+liggend, 6 kaarten/3 vijanden), gevecht-top 0, desktop
ongewijzigd (52px balk, logo zichtbaar), geen fouten.

### R3.22 — Gevechten dwingen liggend af (KLAAR, 2026-06-14)
Op verzoek: gevechten zijn voor dit spel echt een liggend-ervaring, dus
afdwingen. In staande stand tijdens een gevecht verschijnt nu een
schermvullende draai-prompt (pulserend ↻ + "Draai je toestel"); zodra je
draait verdwijnt hij (pure CSS-orientatiequery, robuust). Menu's/map/titel
blijven gewoon in portret. Vluchtweg "Toch staand spelen" (sessie) voor wie
zijn scherm vergrendeld heeft. Drankjes blijven in de (transparante) topbalk
beschikbaar in liggend. Vervangt de oude wegklikbare suggestie-banner.
Geverifieerd: prompt toont enkel bij staand+gevecht+touch, weg in
liggend/map/desktop, escape werkt, 2 drankjes zichtbaar in liggend, geen fouten.

### R3.23 — Mobiel: figuren onzichtbaar in liggend gevecht (gefixt) (KLAAR, 2026-06-14)
Speeltest: in liggend gevecht zag je wel de namen+HP maar NIET de speler/
vijand-sprites. Gediagnosticeerd via DOM-inspectie: de figuren stonden op
y −91..5 (vrijwel volledig boven de schermrand). Oorzaak: mijn eigen
overcomplicatie uit R3.20 — padding-bottom:160 (liggend) / 296 (staand) op
#strijdveld kneep de figuren in een strookje van ~34px, en met align flex-end
schoten ze omhoog buiten beeld. De onderbalk stond bovendien al gewoon in de
flow, dus de padding (en de position:fixed) reserveerden dubbel. Fix:
padding-bottom + position:fixed weggehaald; de min-height:0 (die het afkappen
oploste) volstaat. Geverifieerd: speler én vijand-sprites volledig zichtbaar
in liggend (71–168) én staand, kaarten niet afgekapt, geen fouten.

### R3.24 — Fullscreen op mobiel (statusbalk/klok weg) (KLAAR, 2026-06-14)
Twee sporen samen: (1) manifest display:fullscreen + display_override →
geïnstalleerde PWA start in echte fullscreen, geen statusbalk; (2) in de
browser roept de eerste-tik-handler (eersteGebaar, het audio-ontgrendelgebaar)
document.documentElement.requestFullscreen() aan, mobiel-gated, try/catch.
Android-browsers honoreren dit; iOS-browsers steunen de Fullscreen-API niet
voor pagina's → daar dekt de PWA-installatie het. Geverifieerd: geen JS-fouten
bij de eerste tik, mobiel-vlag actief, desktop ongemoeid (niet-mobiel = no-op).

### R3.25 — Mobiel: lange kaarttekst bloedt niet meer uit + leesbaar bij aantikken (KLAAR, 2026-06-14)
Speeltest: kaarten met meer tekst dan de basiskaarten (bv. Omarm het Duister)
lieten de tekst uit de kaart bloeden/afkappen — lelijk en onleesbaar. Fix
(idee van Thomas): op de kleine rustende handkaart de tekst netjes afknippen
met een zachte mask-fade (geen bleed); de aangetikte (voorbeeld) kaart groeit
nu in HOOGTE (height:auto) + wordt breder (172px) zodat de VOLLEDIGE tekst
leesbaar binnen de kaart past. Preview-transform van schaal naar pure lift
(de grootte komt nu uit width/auto-height). Geverifieerd: volledige tekst
binnen de kaart + kaart volledig op het scherm, staand én liggend, geen fouten.

### R3.26 — Mobiel baasgevecht: bazenbalk botste met Beurt-label (KLAAR, 2026-06-14)
Speeltest: in het baasgevecht liep het "Beurt"-label dwars door de bazenbalk
(De Slijmkoning-titel) — op laptop ok, op mobiel vloekte het. Oorzaak: de
fullscreen-wijziging zette #scherm-gevecht op top:0, waardoor de margin-top van
het Beurt-label niet meer onder de bazenbalk uitkwam. Fix op touch: Beurt-label
verbergen in baasgevechten (de bazenbalk ís de focus), en de bazenbalk compacter
(naam 1.15rem, dunne 15px-balk, kleinere pips, 65px i.p.v. ~110) zodat hij in de
krappe liggende hoogte past. Geverifieerd: label weg, balk compact, speler +
baas zichtbaar, geen fouten.
