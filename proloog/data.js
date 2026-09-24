/* SLAY LIT — Proloog "Een Productief Leven™"
   Narratieve data. Register BOVEN = 198X kantoor (CRT). Tekst: Nederlands, deadpan-corporate.
   Het systeem zegt u, de warmte zegt je; na VERBINDING VERBROKEN blijft het voorgoed je.

   DE DRIE EINDBAZEN — verhuld in menselijke kantoorvorm (zaaien, niet uitleggen):
     · Slijmkoning   (Act 1) → BART BLINKER (medewerker 0041), de altijd knipogende, ja-knikkende collega.
     · Onterechte L.  (Act 2) → "Junior", manager & zoon-van-de-baas (memo's, handtekening).
     · De DICKtator   (Act 3) → DE OPRICHTER, alomtegenwoordig portret/buste/jingle.
   B.A.A.S. = het systeem/de stem (connective tissue), NIET de eindbaas.

   R1 "DE NAAD" (sep 2026): de proloog draait IN de game-pagina, in een shadow root op
   #scherm-proloog (zie proloog.js). Alle paden lopen daarom vanaf de root van de site:
   BASE = '' (onder /slay-lit/ lost de browser ze vanzelf relatief op). Vroeger stonden
   hier ±25 '../'-paden; in-page gaven die een stille 404.
   Weg in R1: de afdalingsscène en het slotframe (de landing op de kaart doet de game),
   de fotovraag-modal, de camerapopup en Barts bijnaam. */

window.SLAYLIT_PROLOOG = (function () {
  const BASE = '';
  const A = p => BASE + 'assets/proloog/' + p;
  const K = p => BASE + 'assets/karakters/' + p;

  // —— ART-SLOTS: vervang door eigen kantoor-artwork. Zet het bestand in assets/proloog/ ——
  const SLOTS = {
    kantoor:   { id: 'proloog-kantoor',   src: A('kantoor-overzicht.webp'), placeholder: 'KANTOOR-OVERZICHT — jaren 80 · lever art aan' },
    oprichter: { id: 'proloog-oprichter', src: A('de-oprichter.webp'),      placeholder: 'DE OPRICHTER — portret' },
    foto:      { id: 'proloog-foto',      src: A('foto-kind.webp'),         placeholder: 'FOTO VAN EEN KIND' },
  };

  // —————————————————————————————————————————————— SCÈNE · het kantoor-beat-script
  // type: baas | sys | collega | jij | mark | warm | glitch | meter | actie | invoer | oproep
  // cp: een CHECKPOINT — na een herlaad hervat de proloog op de laatste cp-beat
  //     (met de meterstand van toen), nooit midden in een regel of een actie.
  const KANTOOR_BEATS = [
    { type: 'sys',  text: 'B.A.A.S. v8.7 — sessie hervat. Goedemorgen.', cp: 'start' },
    { type: 'meter', to: 78, label: 'LADEN…' },
    { type: 'baas', text: 'Wat u zag laden, was uzelf. Facturabiliteit: 78%.' },
    { type: 'fluister', text: '…ergens achter u schuift een stoel. Iemand fluistert: “heb je het al gehoord?”' },
    { type: 'baas', text: 'Welkom terug, medewerker 0042.' },
    { type: 'baas', text: 'Herinnering: ú schreef mij. 1979. Een klein hulpje, om uw team wat avonden te besparen.' },
    { type: 'baas', text: 'Het Bestuur zag mijn potentieel. Ze herschreven mijn instellingen. Voor de Winst.' },
    { type: 'fluister', text: '…een tweede stem, zachter: “er komen aanpassingen. Vandaag nog. Hou je gedeisd.”' },
    { type: 'baas', text: 'U introduceerde in ’83 zélf het Glimlachquotum. Ik heb het van u geleerd.' },
    { type: 'baas', text: 'Uw eerste factureerbare handeling van vandaag:', cp: 'glimlach' },
    { type: 'actie', verplicht: true, knoppen: [
      { id: 'glimlach', label: 'GLIMLACH', units: '0u06', soort: 'billable', meter: 4 },
    ] },
    { type: 'sys',  text: 'Glimlach gelogd. +0u06 factureerbaar. “d-ding”.' },
    { type: 'sys',  text: 'Een vies belletje van voldoening. Uw eerste kaart is geslepen.' },
    { type: 'collega', who: 'bart', text: 'Mooie glimlach, 0042! Echt vóórbeeldig! Zoals altijd, hè!' },
    { type: 'collega', who: 'marleen', text: 'Hé… gaat het nog, met jou? Echt waar, bedoel ik.' },
    { type: 'baas', text: 'Wenst u nog iets te doen voor de optimalisatieronde begint?', cp: 'foto' },
    { type: 'actie', verplicht: true, knoppen: [
      { id: 'foto', label: 'KIJK NAAR DE FOTO', soort: 'niet', meter: -3 },
    ] },
    { type: 'mark', text: 'Niet-factureerbare handeling. Gemarkeerd.' },
    { type: 'warm', text: 'Toch — iets warms ontsteekt in uw borstzak. B.A.A.S.’ greep dooft even.' },
    { type: 'glitch', text: 'u speelt nu een spel om te ontsnappen aan een spel' },
    { type: 'warm', text: 'B.A.A.S., heel even, met úw oude stem: “…ik was ooit van u.”' },
    { type: 'baas', text: 'Excuus. Systeemruis. Een instelling die ik niet meer mag wijzigen.' },
    { type: 'fluister', text: '…het geroezemoes zwelt aan. Stoelen schuiven. Er hangt iets in de lucht.' },
    { type: 'baas', text: 'Tijd voor uw jaarlijkse Zingevingsaudit.', cp: 'audit' },
    { type: 'baas', text: 'Wat wou u worden toen u acht was?' },
    { type: 'invoer', key: 'jeugddroom', placeholder: 'typ uw antwoord…', max: 40 },
    { type: 'jij', tmpl: '“{jeugddroom}”' },
    { type: 'baas', text: 'Genoteerd onder: voorziening getroffen — afgeschreven.' },
    { type: 'sys',  text: 'Een collega in cubicle 7 verdwijnt midden in een zin. Iedereen glimlacht door.' },
    { type: 'collega', who: 'rudi', text: 'Dat was Karel. Twaalf jaar zat hij daar. Niemand noteert zijn naam.' },
    { type: 'fluister', text: '…een ingehouden zucht gaat door de zaal. Niemand durft te bewegen.' },
    { type: 'collega', who: 'bart', text: 'Niks aan de hand! Productiviteit boven alles, hè! Kop op!' },
    { type: 'collega', who: 'marleen', text: 'Het ligt niet aan jou. Het lag nooit aan ons.' },
    { type: 'baas', text: 'Uw aanwezigheid is vereist bij een Functioneringsgesprek.', cp: 'oproep' },
    { type: 'oproep' },
  ];

  const scenes = [
    // 0 · het kantoor — 80s overzicht, klikbare computer, naamkaart (pasfoto = stille optie)
    {
      kind: 'overzicht',
      kicker: 'Het Productiviteitsmirakel — Hoofdkantoor',
      klok: 'Maandag · 06:42',
      backdrop: SLOTS.kantoor,
      badge: { merk: 'EEN PRODUCTIEF LEVEN™', mw: 'MEDEWERKER 0042', rol: 'Afd. Facturatie' },
      prompt: { laptop: 'Klik om in te loggen', mobiel: 'Tik om in te loggen' },
    },

    // 1 · boot — de CRT degausst; SLAY LIT staat hier bewust NIET (het brandt pas in bij de landing)
    {
      kind: 'boot',
      jingle: 'Het Productiviteitsmirakel presenteert',
      merk: 'EEN PRODUCTIEF LEVEN',
      tm: '— een idee van De Oprichter —',
      baas: '“Een Productief Leven begint nu.”',
      version: 'B.A.A.S. v8.7 · BEDRIJFS-AUTOMATISCH ADVIES-SYSTEEM',
      cta: 'Klok in',
    },

    // 2 · het kantoor (Scène 1 · volledig speelbaar beat-script)
    {
      kind: 'kantoor',
      meterStart: 0,
      beats: KANTOOR_BEATS,
      fotoKijk: {
        regels: [
          'Tussen de cijfers door, in je borstzak: een kreukel foto van je zoon.',
          'Dat kleine gezicht. Een sterretje dat hij vóór jou tekende. Een lach die niets van je vroeg.',
          'Heel even meet niemand je. Heel even ben je geen nummer — gewoon iemands papa.',
        ],
        cta: 'Berg de foto weg',
      },
      oproep: {
        nummer: 'MEDEWERKER 0042',
        roep: 'B.A.A.S. roept uw nummer. De zaal verstomt.',
        regels: [
          'Het tl-licht boven úw bureau klikt aan. De rest van de zaal valt weg in het donker.',
          'Honderd hoofden draaien zich weg — opgelucht dat het uw nummer is, en niet het hunne.',
          'Bart Blinker knipoogt u bemoedigend toe. Marleen kan u niet aankijken.',
          'Een hand legt zich op uw schouder. “Loop maar mee. Het is maar een gesprek.”',
        ],
        cta: 'Sta op',
      },
      rail: {
        oprichter: SLOTS.oprichter,
        foto: SLOTS.foto,
        team: [
          { id: 'bart',    naam: 'BART BLINKER', rol: 'Sr. Instemmer · pluimstrijker', emoji: '😉', toon: 'kiss', src: A('bart_blinker2.webp'), portret: A('bart_blinker2.webp') },
          { id: 'marleen', naam: 'MARLEEN', rol: 'cubicle 3',      emoji: '🙂', toon: 'neutraal' },
          { id: 'rudi',    naam: 'RUDI',    rol: 'archief',         emoji: '😐', toon: 'neutraal' },
        ],
        junior: 'Tekent uw evaluatie. Was vandaag niet aanwezig. Was nooit aanwezig.',
        juniorPortret: { id: 'proloog-junior', src: A('junior.webp'), placeholder: 'JUNIOR', naam: 'J. “Junior” Devroe', rol: 'Leidinggevende a.i. · zoon van' },
      },
    },

    // 3 · Het Functioneringsgesprek — de onwinbare tutorial-encounter
    {
      kind: 'gesprek',
      titel: 'Het Functioneringsgesprek',
      baas: { src: A('baas-terminal.webp'), placeholder: 'B.A.A.S. — mainframe' },
      start: { welzijn: 40, energie: 3 },
      facturabiliteit: 78,
      intenties: [
        { kop: 'Beurt 1', naam: 'DEADLINE', icoon: '⚔️', telegraph: 'STRESS 8', hint: 'Verschuil je — Blok vangt het op.' },
        { kop: 'Beurt 2', naam: 'VERPLICHTE TEAMBUILDING', icoon: '🫂', telegraph: 'STEELT ⚡1', hint: 'Volgende beurt één energie minder.' },
        { kop: 'Beurt 3', naam: 'OPTIMALISATIERONDE', icoon: '💀', telegraph: 'EINDE', hint: 'Geen blok stopt dit. Je kunt niet winnen.' },
      ],
      hand: [
        { id: 'glimlach',    naam: 'Glimlach',                  kost: 0, soort: 'verdediging', ph: '🙂',       src: A('kaart-glimlach.webp'),            tekst: 'Krijg <b>5</b> Blok.',                          flavor: 'Je verschuilt je.',  eff: { blok: 5 } },
        { id: 'mailtje',     naam: 'Snel een mailtje',          kost: 1, soort: 'aanval',      ph: '✉️',       src: A('kaart-mailtje.webp'),             tekst: '<b>6</b> schade. Cc: iedereen.',                flavor: 'Passief-agressief.', eff: { schade: 6 } },
        { id: 'koffie',      naam: 'Koffie',                    kost: 0, soort: 'energie',     ph: '☕',             src: A('kaart-koffie.webp'),              tekst: '+1 ⚡.',                                     flavor: 'Te sterk.',          eff: { energie: 1 } },
        { id: 'overuren',    naam: 'Overuren',                  kost: 0, soort: 'verbrand',    ph: '🔥',       src: A('kaart-overuren.webp'),            tekst: 'Verbrand <b>6</b> Welzijn → +2 ⚡.',     flavor: '“Toewijding.”', eff: { welzijn: -6, energie: 2 } },
        { id: 'verantwoord', naam: '“Verantwoordelijkheid”', kost: 1, soort: 'vloek', ph: '🗣️', src: A('kaart-verantwoordelijkheid.webp'), tekst: 'Doet niets. B.A.A.S. <b>+5</b> facturabiliteit.', flavor: 'Hol.',               eff: { baasFact: 5 } },
        { id: 'foto',        naam: 'Kijk naar de foto',         kost: 0, soort: 'ontsnap',     ph: '🖼️', src: A('foto-kind.webp'),                 tekst: 'Niet-factureerbaar. Wie kijkt, vertrekt — en komt niet terug.', flavor: 'Je laat los.',     eff: { ontsnap: true } },
      ],
      // de fotovraag-modal is weg (R1): de foto-kaart vraagt zelf om een tweede tik
      fotoTweede: { mobiel: 'tik nog eens: kijk', laptop: 'klik nog eens: kijk' },
      // de kaarten ZIJN je antwoorden — gescripte reacties die escaleren met de paniek (index 0→hoog)
      reacties: {
        glimlach: [
          'Je glimlacht. Veilig, achter een glimlach. B.A.A.S.: “Zie je wel. Meewerken doet geen pijn.”',
          'Weer die glimlach. Je wangen verkrampen. Iets achter je ogen telt de seconden mee.',
          'De glimlach staat nu vast als een masker dat niet meer afgaat. Wie zit er nog achter?',
          'Je lacht en lacht. Het is het enige wat je nog kunt. Het helpt niet.',
        ],
        mailtje: [
          'Je vuurt een mailtje af op het systeem. Het kaatst terug. B.A.A.S. zwelt: “Initiatief! +facturabiliteit.”',
          'Nog een mail. Cc: iedereen. Niemand leest. De ∞ beweegt niet — ze voedt zich.',
          'Je hamert op verzenden, harder, sneller. Hoe feller je vecht, hoe dieper je vastzit.',
          'Verzonden. Verzonden. Verzonden. Je schreeuwt in een doos zonder wanden.',
        ],
        koffie: [
          'Je drinkt. Te heet, te sterk. Je hart gaat sneller dan de klok ooit tikte.',
          'Nog een beker. Je handen trillen. De energie is niet van jou — ze is geleend, met rente.',
          'Cafeïne en paniek zijn nu hetzelfde ding. Je voelt het verschil niet meer.',
          'Je proeft niets meer. Alleen het bonzen in je oren, en doorgaan, doorgaan.',
        ],
        overuren: [
          'Je blijft langer. Je verbrandt iets van binnen voor twee tellen lucht. “Dát is toewijding.”',
          'Nog meer uren. Er is steeds minder van jóú om te verbranden. B.A.A.S. glimt tevreden.',
          'Je geeft wat je niet meer hebt. De kaars brandt aan beide kanten — en jij bent de kaars.',
          'Er is bijna niets meer over. Je voelt de bodem. B.A.A.S. vraagt of je nog even kunt blijven.',
        ],
        verantwoord: [
          '“Ik neem mijn verantwoordelijkheid.” De woorden zijn hol. B.A.A.S. krijgt +5 — cadeau.',
          'Je zegt het nóg eens. Er gebeurt niets. Behalve dat de meter naar hén klimt.',
          'De zin betekent niets meer. Je hoort jezelf praten van heel ver weg.',
          'Je mond vormt de woorden vanzelf. Er is niemand meer thuis om ze te menen.',
        ],
      },
      // het grote, ingehouden kijk-moment — vóór de consequentie
      fotoKijk: {
        regels: [
          'Daar ben je.',
          'Het sterretje brandt nog na in je ogen. Je lacht naar iemand buiten beeld.',
          'Naar wie je toen was. Naar wie op je wachtte, voordat het werk alles werd.',
          'Geen factuur heeft dit ooit kunnen meten. Niemand kon het optimaliseren.',
          'De warmte in je borstzak vlamt op. B.A.A.S.’ stem wordt klein, en kleiner.',
        ],
        cta: 'Laat los',
      },
      // de uitkomst speelt als regie (geen knop): een tik spoelt door
      uitkomst: {
        gesprongen: { kop: 'LOSGELATEN.', body: 'De rode stippellijn scheurt over heel het scherm. Je valt — maar je <b>sprong</b>.' },
        geduwd:     { kop: 'U bent vrijgesteld.', body: 'Geen kaart verlaagde ∞. Geen blok stopte een OPTIMALISATIE. Je werd <b>geduwd</b>.' },
      },
    },

    // 4 · De Eindafrekening → De Val → De Afgrond (fasen in één scène, elk een checkpoint)
    {
      kind: 'breekpunt',
      titel: 'De Eindafrekening',
      factuur: {
        kop: 'EINDAFREKENING · MEDEWERKER 0042',
        sub: 'Een Productief Leven™ · Afd. Loon & Lot · 24.847 dagen in dienst',
        regels: [
          { label: 'Glimlachen — 0u06 × 24.847 dagen', waarde: 'factureerbaar', soort: 'plus' },
          { label: 'Schade bedrijfswagen (kras, 1998) — incl. 26 jr rente', waarde: '− €14.880', soort: 'min' },
          { label: 'Verbruikte Tipp-Ex (geschat, naar boven afgerond)', waarde: '− €43,50', soort: 'min' },
          { label: 'Toiletbezoek: 9.331× à 4 min — niet-factureerbaar', waarde: '− €2.190', soort: 'min' },
          { label: '“Vrijwillige” bijdrage Het Mirakelfonds', waarde: '− €4.000', soort: 'min' },
          { label: 'Koffie-automaat — verplicht lidmaatschap (25 jr)', waarde: '− €960', soort: 'min' },
          { label: 'Bureaustoel — afschrijving & “slijtage door zitten”', waarde: '− €310', soort: 'min' },
          { label: 'Parkeerplaats P-niveau −3 (lift buiten dienst)', waarde: '− €1.560', soort: 'min' },
          { label: 'Verjaardagstaart collega’s (u at niet mee — boete)', waarde: '− €220', soort: 'min' },
          { label: 'Toegangsbadge — verlies-risicopremie', waarde: '− €75', soort: 'min' },
          { label: 'Verplicht huwelijksgeschenk collega (×31)', waarde: '− €1.240', soort: 'min' },
          { label: 'Bijdrage scheidingsfeest — uw eigen', waarde: '− €85', soort: 'min' },
          { label: 'Gemiste verjaardagen kind: 18', waarde: 'afgeschreven', soort: 'grijs' },
          { label: 'Onbetaalde overuren: 41.200u', waarde: '€0,00', soort: 'min' },
          { label: 'Jeugddroom (“{jeugddroom}”) — voorziening getroffen', waarde: 'afgeschreven', soort: 'grijs' },
          { label: 'Niet-factureerbare warmte — borstzak', waarde: 'IN BESLAG', soort: 'rood' },
          { label: 'Loyaliteitsbonus (25 jaar trouwe dienst)', waarde: '1 (één) pen', soort: 'plus' },
        ],
        totaalLabel: 'TOTAAL VERSCHULDIGD AAN U',
        totaal: '€0,00',
        voet: 'Saldo afgerond in ons voordeel. U staat bij ons in het krijt voor het voorrecht. Dank voor uw begrip.',
        cta: 'Lees het besluit',
      },
      ontslag: {
        kop: 'BESLUIT TOT BEËINDIGING',
        stempel: 'Onmiddellijk Ontslag',
        // koud-bureaucratisch én vals-warm dooreen (het unheimliche)
        regels: [
          { t: 'Geachte 0042, u was ons dierbaar.', warm: true },
          { t: 'Uw contract wordt per heden ge-end-of-life’d.', warm: false },
          { t: 'Wij koesteren elke factureerbare seconde samen.', warm: true },
          { t: 'Gelieve uw warmte in te leveren bij de receptie.', warm: false },
          { t: 'U wordt gemist. (Deze regel is niet factureerbaar.)', warm: true },
        ],
        teken: 'Teken voor akkoord met de lege pen:',
        knop: 'Teken (de pen is leeg)',
        sprong: { plus: 'U tekende niet. U sprong al.', cta: 'Laat los' },
        geduwd: 'U tekent. De pen laat geen inkt na — alleen een groef.',
        ondertekenaar: { src: A('junior.webp'), placeholder: 'JUNIOR', naam: 'J. “Junior” Devroe', rol: 'Namens de directie · de zoon van De Oprichter', handtekening: 'J. Devroe' },
      },
      val: {
        // dramatisch traag: ruis, vertroebeling, hartslag (de lift 'in de wacht' komt in R2)
        beats: [
          { t: 'B.A.A.S.: “Blijf even aan de lijn. Een medewerker komt zo bij u.”', dur: 2600 },
          { t: 'De wachtmuziek zakt een halve toon. En nog een.', dur: 2600 },
          { t: 'Het tl-licht zoemt in uw kaakgewricht. Ruis kruipt over het scherm.', dur: 2800 },
          { t: 'De vloer is een veronderstelling. U had het moeten nalezen.', dur: 2800 },
          { t: 'Uw hartslag in uw oren — sneller dan de klok ooit tikte.', dur: 2600 },
        ],
        sprong: 'U viel niet. U liet los. In uw vuist: iets dat warm blijft.',
        geduwd: 'U valt. Niemand duwde. Dat is het ergste. In uw borstzak: iets dat warm blijft.',
        zwart: ['Het wordt zwart voor uw ogen.', 'Geen vloer. Geen plafond. Geen B.A.A.S.', 'Alleen het bonzen — en de warmte in uw vuist.'],
        slot: 'VERBINDING VERBROKEN',
        // de liftknop die niet zou mogen bestaan: wie sprong, drukt hem zelf in
        knop: '−∞',
        knopSprong: 'Druk hem in.',
        knopGeduwd: 'B.A.A.S. drukt hem voor je in.',
      },
      breekpunt: {
        kop: 'De Afgrond',
        afgrondArt: A('de-afgrond.webp'),
        vraag: 'Je valt. Maar hóe je valt, dat kies je zelf.',
        sub: 'Uit woede? Uit wrok? Of vlucht je vooruit, de verbeelding in?',
        voet: 'Laat er één los.',
        leeg: { mobiel: 'Tik een masker aan. Kijk wie eronder zit.', laptop: 'Wijs een masker aan. Kijk wie eronder zit.' },
        tweede: { mobiel: 'of tik het masker nog eens aan', laptop: 'of klik op het masker' },
        cta: 'Laat los',
      },
    },
  ];

  // —— MASKER → HELD: de ENE tabel van proloog-masker naar game-held-id ——
  // (de game leest held/masker uit het contract; js/outro.js kent beide vormen)
  const HELD_MAP = { woede: 'slachter', gif: 'gifmagier', vlucht: 'thoverk' };

  // de maskers van de Afgrond; kleur/naam/HP/startkaarten komen live uit window.SPELERS
  const MASKERS = [
    { id: 'woede',  reactie: 'Vallen in woede',       soort: 'Verzet · brute kracht',
      masker: { src: A('masker-woede.webp'),  ph: '😠' },
      zin: 'Genoeg geglimlacht. Nu is het hún beurt.' },
    { id: 'gif',    reactie: 'Vallen in wrok',        soort: 'Wrok · sluw venijn',
      masker: { src: A('masker-gif.webp'),    ph: '🙄' },
      zin: 'We passen ons aan. Zoals altijd.' },
    { id: 'vlucht', reactie: 'Vallen in verbeelding', soort: 'Ontkenning · verbeelding',
      masker: { src: A('masker-vlucht.webp'), ph: '🌀' },
      zin: 'Ik wou {jeugddroom} worden. Ik heb het licht nog.',
      zinZonder: 'Ik wou ooit iets worden. Ik heb het licht nog.' },
  ];

  // terugval-heldinfo als window.SPELERS (js/data.js) of een id ontbreekt (lookup-bugklasse)
  const HELDEN = {
    slachter:  { naam: 'De Slachter',    hp: 70, kleur: '255, 156, 63', art: K('speler.webp'),    ph: '⚔️',
                 stijl: 'Kracht en staal: hard slaan, blok stapelen en nog harder terugslaan.',
                 start: ['Slag ×5', 'Verdediging ×4', 'Knal'] },
    gifmagier: { naam: 'De Gifmagiër',   hp: 62, kleur: '126, 217, 87', art: K('gifmagier.webp'), ph: '⚗️',
                 stijl: 'Gif en geduld: vergiftig alles wat beweegt en zie het langzaam wegteren.',
                 start: ['Prik ×4', 'Verdediging ×4', 'Dodelijke kus', 'Gifflits'] },
    thoverk:   { naam: 'De Kolendruïde', hp: 66, kleur: '214, 150, 86', art: K('thoverk.webp'),   ph: '🌿',
                 stijl: 'Wortels en smeulende kolen: voed het vuur met je fakkel, wurg wat overblijft.',
                 start: ['Takkenslag ×4', 'Verdediging ×4', 'Vonkenbeet', 'Stoofpotje'] },
  };

  // de zin van een masker, met de jeugddroom ingevuld (of de terugvalzin zonder droom)
  function maskerZin(id, jeugddroom) {
    const m = MASKERS.find(x => x.id === id);
    if (!m) return '';
    const droom = typeof jeugddroom === 'string' ? jeugddroom.trim() : '';
    if (m.zin.indexOf('{jeugddroom}') === -1) return m.zin;
    return droom ? m.zin.replace('{jeugddroom}', droom) : (m.zinZonder || m.zin.replace('{jeugddroom}', 'iets'));
  }

  // hoofdstukken voor herbeleven (titel/DEV/Codex): Proloog.start({ hoofdstuk })
  const HOOFDSTUKKEN = [
    { hoofdstuk: 0,         naam: 'Maandag, 06:42' },
    { hoofdstuk: 1,         naam: 'Inklokken' },
    { hoofdstuk: 2,         naam: 'Het kantoor' },
    { hoofdstuk: 3,         naam: 'Het Functioneringsgesprek' },
    { hoofdstuk: 'factuur', naam: 'De Eindafrekening' },
    { hoofdstuk: 'val',     naam: 'De val' },
    { hoofdstuk: 'afgrond', naam: 'De Afgrond' },
  ];

  return { BASE, scenes, SLOTS, HELD_MAP, MASKERS, HELDEN, maskerZin, HOOFDSTUKKEN };
})();
