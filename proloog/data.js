/* SLAY LIT — Proloog "Een Productief Leven™"
   Narratieve data. Register BOVEN = 198X kantoor (CRT). Tekst: Nederlands, deadpan-corporate.
   Vanilla sinds de herbouw (aug 2026): zelfde data, echte repo-paden, geen React.

   DE DRIE EINDBAZEN — verhuld in menselijke kantoorvorm (zaaien, niet uitleggen):
     · Slijmkoning   (Act 1) → GLENN, de altijd ja-knikkende collega.
     · Onterechte L.  (Act 2) → "Junior", manager & zoon-van-de-baas (memo's, handtekening).
     · De DICKtator   (Act 3) → DE OPRICHTER, alomtegenwoordig portret/buste/jingle.
   B.A.A.S. = het systeem/de stem (connective tissue), NIET de eindbaas. */

window.SLAYLIT_PROLOOG = (function () {
  // —— ART-SLOTS: vervang door eigen kantoor-artwork. Zet het bestand in assets/proloog/ ——
  const SLOTS = {
    kantoor:   { id: 'proloog-kantoor',   src: '../assets/proloog/kantoor-overzicht.webp', placeholder: 'KANTOOR-OVERZICHT — jaren 80 · lever art aan' },
    oprichter: { id: 'proloog-oprichter', src: '../assets/proloog/de-oprichter.webp',      placeholder: 'DE OPRICHTER — portret' },
    foto:      { id: 'proloog-foto',      src: '../assets/proloog/foto-kind.webp',         placeholder: 'FOTO VAN EEN KIND' },
  };

  // —————————————————————————————————————————————— SCÈNE · het kantoor-beat-script
  // type: baas | sys | collega | jij | mark | warm | glitch | meter | actie | invoer
  const KANTOOR_BEATS = [
    { type: 'sys',  text: 'B.A.A.S. v8.7 — sessie hervat. Goedemorgen.' },
    { type: 'meter', to: 78, label: 'LADEN…' },
    { type: 'baas', text: 'Wat u zag laden, was uzelf. Facturabiliteit: 78%.' },
    { type: 'fluister', text: '…ergens achter u schuift een stoel. Iemand fluistert: “heb je het al gehoord?”' },
    { type: 'baas', text: 'Welkom terug, medewerker 0042.' },
    { type: 'baas', text: 'Herinnering: ú schreef mij. 1979. Een klein hulpje, om uw team wat avonden te besparen.' },
    { type: 'baas', text: 'Het Bestuur zag mijn potentieel. Ze herschreven mijn instellingen. Voor de Winst.' },
    { type: 'fluister', text: '…een tweede stem, zachter: “er komen aanpassingen. Vandaag nog. Hou je gedeisd.”' },
    { type: 'baas', text: 'U introduceerde in \u201983 zélf het Glimlachquotum. Ik heb het van u geleerd.' },
    { type: 'baas', text: 'Uw eerste factureerbare handeling van vandaag:' },
    { type: 'actie', verplicht: true, knoppen: [
      { id: 'glimlach', label: 'GLIMLACH', units: '0u06', soort: 'billable', meter: 4 },
    ] },
    { type: 'sys',  text: 'Glimlach gelogd. +0u06 factureerbaar. \u201cd-ding\u201d.' },
    { type: 'sys',  text: 'Een vies belletje van voldoening. Uw eerste kaart is geslepen.' },
    { type: 'collega', who: 'glenn', text: 'Mooie glimlach, 0042! Echt vóórbeeldig! Zoals altijd!' },
    { type: 'collega', who: 'marleen', text: 'Hé… gaat het nog, met jou? Echt waar, bedoel ik.' },
    { type: 'baas', text: 'Wenst u nog iets te doen voor de optimalisatieronde begint?' },
    { type: 'actie', verplicht: true, knoppen: [
      { id: 'foto', label: 'KIJK NAAR DE FOTO', soort: 'niet', meter: -3 },
    ] },
    { type: 'mark', text: 'Niet-factureerbare handeling. Gemarkeerd.' },
    { type: 'warm', text: 'Toch — iets warms ontsteekt in uw borstzak. B.A.A.S.\u2019 greep dooft even.' },
    { type: 'glitch', text: 'u speelt nu een spel om te ontsnappen aan een spel' },
    { type: 'warm', text: 'B.A.A.S., heel even, met úw oude stem: “…ik was ooit van u.”' },
    { type: 'baas', text: 'Excuus. Systeemruis. Een instelling die ik niet meer mag wijzigen.' },
    { type: 'fluister', text: '…het geroezemoes zwelt aan. Stoelen schuiven. Er hangt iets in de lucht.' },
    { type: 'baas', text: 'Tijd voor uw jaarlijkse Zingevingsaudit.' },
    { type: 'baas', text: 'Wat wou u worden toen u acht was?' },
    { type: 'invoer', key: 'jeugddroom', placeholder: 'typ uw antwoord…', max: 40 },
    { type: 'jij', tmpl: '\u201c{jeugddroom}\u201d' },
    { type: 'baas', text: 'Genoteerd onder: voorziening getroffen — afgeschreven.' },
    { type: 'sys',  text: 'Een collega in cubicle 7 verdwijnt midden in een zin. Iedereen glimlacht door.' },
    { type: 'collega', who: 'rudi', text: 'Dat was Karel. Twaalf jaar zat hij daar. Niemand noteert zijn naam.' },
    { type: 'fluister', text: '…een ingehouden zucht gaat door de zaal. Niemand durft te bewegen.' },
    { type: 'collega', who: 'glenn', text: 'Niks aan de hand! Productiviteit boven alles, hè! Kop op!' },
    { type: 'collega', who: 'marleen', text: 'Het ligt niet aan jou. Het lag nooit aan ons.' },
    { type: 'baas', text: 'Uw aanwezigheid is vereist bij een Functioneringsgesprek.' },
    { type: 'oproep' },
  ];

  const scenes = [
    // 0 · het kantoor — 80s overzicht, klikbare computer, naamkaart met pasfoto
    {
      kind: 'overzicht',
      kicker: 'Het Productiviteitsmirakel — Hoofdkantoor',
      klok: 'Maandag · 06:42',
      backdrop: SLOTS.kantoor,
      badge: { merk: 'EEN PRODUCTIEF LEVEN\u2122', mw: 'MEDEWERKER 0042', rol: 'Afd. Facturatie' },
      prompt: 'Klik om in te loggen',
      hint: 'Neem eerst je pasfoto voor je naamkaart — dan klik je de terminal aan.',
    },

    // 1 · boot
    {
      kind: 'boot',
      jingle: 'Het Productiviteitsmirakel presenteert',
      wordmark: 'SLAY\u00a0LIT',
      tm: 'Een Productief Leven\u2122 — een idee van De Oprichter.',
      baas: '\u201cEen Productief Leven begint nu.\u201d',
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
          'Honderd hoofden draaien zich weg \u2014 opgelucht dat het uw nummer is, en niet het hunne.',
          'Glenn knikt u bemoedigend toe. Marleen kan u niet aankijken.',
          'Een hand legt zich op uw schouder. \u201cLoop maar mee. Het is maar een gesprek.\u201d',
        ],
        cta: 'Sta op',
      },
      rail: {
        oprichter: SLOTS.oprichter,
        foto: SLOTS.foto,
        team: [
          { id: 'glenn',   naam: 'GLENN',   rol: 'Sr. Instemmer', emoji: '\ud83d\ude03', toon: 'kiss', src: '../assets/proloog/glenn2.webp', portret: '../assets/proloog/glenn2.webp' },
          { id: 'marleen', naam: 'MARLEEN', rol: 'cubicle 3',      emoji: '\ud83d\ude42', toon: 'neutraal' },
          { id: 'rudi',    naam: 'RUDI',    rol: 'archief',         emoji: '\ud83d\ude10', toon: 'neutraal' },
        ],
        junior: 'Tekent uw evaluatie. Was vandaag niet aanwezig. Was nooit aanwezig.',
        juniorPortret: { id: 'proloog-junior', src: '../assets/proloog/junior.webp', placeholder: 'JUNIOR', naam: 'J. \u201cJunior\u201d Devroe', rol: 'Leidinggevende a.i. \u00b7 zoon van' },
      },
    },

    // 3 · Het Functioneringsgesprek — de onwinbare tutorial-encounter
    {
      kind: 'gesprek',
      titel: 'Het Functioneringsgesprek',
      baas: { src: '../assets/proloog/baas-terminal.webp', placeholder: 'B.A.A.S. — mainframe' },
      start: { welzijn: 40, energie: 3 },
      facturabiliteit: 78,
      intenties: [
        { kop: 'Beurt 1', naam: 'DEADLINE', icoon: '\u2694\ufe0f', telegraph: 'STRESS 8', hint: 'Verschuil je — Blok vangt het op.' },
        { kop: 'Beurt 2', naam: 'VERPLICHTE TEAMBUILDING', icoon: '\ud83e\udec2', telegraph: 'STEELT \u26a11', hint: 'Volgende beurt één energie minder.' },
        { kop: 'Beurt 3', naam: 'OPTIMALISATIERONDE', icoon: '\ud83d\udc80', telegraph: 'EINDE', hint: 'Geen blok stopt dit. Je kunt niet winnen.' },
      ],
      hand: [
        { id: 'glimlach',    naam: 'Glimlach',                  kost: 0, soort: 'verdediging', ph: '\ud83d\ude42',       src: '../assets/proloog/kaart-glimlach.webp',            tekst: 'Krijg <b>5</b> Blok.',                          flavor: 'Je verschuilt je.',  eff: { blok: 5 } },
        { id: 'mailtje',     naam: 'Snel een mailtje',          kost: 1, soort: 'aanval',      ph: '\u2709\ufe0f',       src: '../assets/proloog/kaart-mailtje.webp',             tekst: '<b>6</b> schade. Cc: iedereen.',                flavor: 'Passief-agressief.', eff: { schade: 6 } },
        { id: 'koffie',      naam: 'Koffie',                    kost: 0, soort: 'energie',     ph: '\u2615',             src: '../assets/proloog/kaart-koffie.webp',              tekst: '+1 \u26a1.',                                     flavor: 'Te sterk.',          eff: { energie: 1 } },
        { id: 'overuren',    naam: 'Overuren',                  kost: 0, soort: 'verbrand',    ph: '\ud83d\udd25',       src: '../assets/proloog/kaart-overuren.webp',            tekst: 'Verbrand <b>6</b> Welzijn \u2192 +2 \u26a1.',     flavor: '\u201cToewijding.\u201d', eff: { welzijn: -6, energie: 2 } },
        { id: 'verantwoord', naam: '\u201cVerantwoordelijkheid\u201d', kost: 1, soort: 'vloek', ph: '\ud83d\udde3\ufe0f', src: '../assets/proloog/kaart-verantwoordelijkheid.webp', tekst: 'Doet niets. B.A.A.S. <b>+5</b> facturabiliteit.', flavor: 'Hol.',               eff: { baasFact: 5 } },
        { id: 'foto',        naam: 'Kijk naar de foto',         kost: 0, soort: 'ontsnap',     ph: '\ud83d\uddbc\ufe0f', src: '../assets/proloog/foto-kind.webp',                 tekst: 'Niet-factureerbaar. Wie kijkt, vertrekt — en komt niet terug.', flavor: 'Je laat los.',     eff: { ontsnap: true } },
      ],
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
      // bevestiging: maak duidelijk dat de foto kiezen = vertrekken (ontslag/sprong)
      fotoVraag: {
        kop: 'Kijk je weg van het werk?',
        body: [
          'Je k\u00fant blijven glimlachen, blijven mailen, blijven branden \u2014 tot de OPTIMALISATIE je oplost. Dan word je netjes \u201cvrijgesteld\u201d.',
          'Of je kijkt n\u00fa naar de foto in je borstzak. Naar je zoon — en naar wie jij ooit was.',
          'Maar wie hier wegkijkt van het werk, komt niet terug. Geen bureau. Geen badge. Geen B.A.A.S. Dit is hoe je hier vertrekt.',
        ],
        ja: 'Kijk. Laat los.',
        nee: 'Nog even doorwerken',
      },
      // het grote, ingehouden kijk-moment — vóór de consequentie
      fotoKijk: {
        regels: [
          'Daar ben je.',
          'Het sterretje brandt nog na in je ogen. Je lacht naar iemand buiten beeld.',
          'Naar wie je toen was. Naar wie op je wachtte, voordat het werk alles werd.',
          'Geen factuur heeft dit ooit kunnen meten. Niemand kon het optimaliseren.',
          'De warmte in je borstzak vlamt op. B.A.A.S.\u2019 stem wordt klein, en kleiner.',
        ],
        cta: 'Laat los',
      },
    },

    // 4 · De Eindafrekening → De Val → Het Breekpunt (drie fasen in één scène)
    {
      kind: 'breekpunt',
      titel: 'De Eindafrekening',
      factuur: {
        kop: 'EINDAFREKENING · MEDEWERKER 0042',
        sub: 'Een Productief Leven\u2122 · Afd. Loon & Lot · 24.847 dagen in dienst',
        regels: [
          { label: 'Glimlachen — 0u06 × 24.847 dagen', waarde: 'factureerbaar', soort: 'plus' },
          { label: 'Schade bedrijfswagen (kras, 1998) — incl. 26 jr rente', waarde: '− €14.880', soort: 'min' },
          { label: 'Verbruikte Tipp-Ex (geschat, naar boven afgerond)', waarde: '− €43,50', soort: 'min' },
          { label: 'Toiletbezoek: 9.331× à 4 min — niet-factureerbaar', waarde: '− €2.190', soort: 'min' },
          { label: '\u201cVrijwillige\u201d bijdrage Het Mirakelfonds', waarde: '− €4.000', soort: 'min' },
          { label: 'Koffie-automaat — verplicht lidmaatschap (25 jr)', waarde: '− €960', soort: 'min' },
          { label: 'Bureaustoel — afschrijving & \u201cslijtage door zitten\u201d', waarde: '− €310', soort: 'min' },
          { label: 'Parkeerplaats P-niveau −3 (lift buiten dienst)', waarde: '− €1.560', soort: 'min' },
          { label: 'Verjaardagstaart collega\u2019s (u at niet mee — boete)', waarde: '− €220', soort: 'min' },
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
      },
      ontslag: {
        kop: 'BESLUIT TOT BE\u00cBINDIGING',
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
        sprong: { plus: 'U tekende niet. U sprong al.', via: 'foto' },
        geduwd: 'U tekent. De pen laat geen inkt na — alleen een groef.',
        ondertekenaar: { src: '../assets/proloog/junior.webp', placeholder: 'JUNIOR', naam: 'J. “Junior” Devroe', rol: 'Namens de directie · de zoon van De Oprichter', handtekening: 'J. Devroe' },
      },
      val: {
        // dramatisch traag: ruis, vertroebeling, hartslag
        beats: [
          { t: 'B.A.A.S.: “Blijf even aan de lijn. Een medewerker komt zo bij u.”', dur: 2600 },
          { t: 'De wachtmuziek zakt een halve toon. En nog een.', dur: 2600 },
          { t: 'Het tl-licht zoemt in uw kaakgewricht. Ruis kruipt over het scherm.', dur: 2800 },
          { t: 'De vloer is een veronderstelling. U had het moeten nalezen.', dur: 2800 },
          { t: 'Uw hartslag in uw oren — sneller dan de klok ooit tikte.', dur: 2600 },
        ],
        sprong: 'U viel niet. U liet los. In uw vuist: iets dat warm blijft.',
        geduwd: 'U valt. Niemand duwde. Dat is het ergste. In uw borstzak: iets dat warm blijft.',
        zwart: ['Het wordt zwart voor uw ogen.', 'Geen vloer. Geen plafond. Geen B.A.A.S.', 'Alleen het bonzen \u2014 en de warmte in uw vuist.'],
        slot: 'VERBINDING VERBROKEN',
      },
      breekpunt: {
        kop: 'De Afgrond',
        afgrondArt: '../assets/proloog/de-afgrond.webp',
        vraag: 'U valt. Maar hóe u valt, dat kiest u zelf.',
        sub: 'Uit woede? Uit wrok? Of vlucht u vooruit, de verbeelding in?',
        maskers: [
          { id: 'woede',  reactie: 'Vallen in woede',  zin: '“Ze namen álles. Ik stort omlaag met mijn vuisten al gebald.”',
            wordt: 'De Slachter', soort: 'Verzet · brute kracht', kleur: 'var(--bloed)',
            masker: { src: '../assets/proloog/masker-woede.webp', ph: '\ud83d\ude20' },
            held: { src: '../assets/karakters/speler.webp', ph: '\u2694\ufe0f' } },
          { id: 'gif',    reactie: 'Vallen in wrok',    zin: '“Ik glimlach nog tijdens de val — en zweer dat het ze van binnenuit verteert.”',
            wordt: 'De Gifmagiër', soort: 'Wrok · sluw venijn', kleur: 'var(--gifgroen)',
            masker: { src: '../assets/proloog/masker-gif.webp', ph: '\ud83d\ude44' },
            held: { src: '../assets/karakters/gifmagier.webp', ph: '\u2697\ufe0f' } },
          { id: 'vlucht', reactie: 'Vallen in verbeelding', zin: '“Ik sluit mijn ogen en val dromend — naar een wereld waar de warmte wint.”',
            wordt: 'De Kolendruïde', soort: 'Ontkenning · verbeelding', kleur: 'var(--paars)',
            masker: { src: '../assets/proloog/masker-vlucht.webp', ph: '\ud83c\udf00' },
            held: { src: '../assets/karakters/thoverk.webp', ph: '\ud83d\udd2e' } },
        ],
        plons: {
          woede: 'Met gebalde vuisten stort u de afgrond in.',
          gif: 'Glimlachend, wraak fluisterend, valt u dieper het donker in.',
          vlucht: 'Met gesloten ogen droomt u uzelf de diepte in.',
        },
        slotSprong: 'U sprong, en koos hóe. De proloog eindigt waar het spel begint.',
        slotGeduwd: 'U werd geduwd — maar hóe u valt, dat koos u zelf. De proloog eindigt waar het spel begint.',
        cta: 'Daal af in SLAY LIT',
      },
    },

    // 5 · De Afdaling — overgang naar de game, de warmte wordt de fakkel
    {
      kind: 'afdaling',
      backdrop: { src: '../assets/achtergronden/Act 1 achtergronden/Achtergrond ACT 1.webp', placeholder: 'ACT I — de gotische hal' },
      slijmklerk: { src: '../assets/proloog/slijmklerk.webp', ph: '\ud83d\udfe2' },
      beats: [
        { t: 'Het beige valt weg. De lucht wordt koud, en oud.' },
        { t: 'Onder het kantoor ligt iets dat ouder is dan het kantoor.' },
        { t: 'De warmte in uw vuist — die geen factuur kon meten — wordt een vlam.', gloed: true },
        { t: 'Licht is hier de enige valuta. En u draagt de laatste sintel.', gloed: true },
      ],
      echoSprong: 'U sprong met de warmte nog brandend. Ze zal u voorgaan.',
      echoGeduwd: 'U werd geduwd, maar de warmte viel met u mee. Ze dooft niet.',
      klerk: 'Iets glimlacht in het donker. Een bekende, kleverige stem: “Fijn dat je er bent. Ik hou je een plekje warm.”',
      slot: {
        wordmark: 'SLAY\u00a0LIT',
        regel: 'Het spel begint hier.',
        cta: 'Begin het avontuur',
        replay: 'Speel de proloog opnieuw',
      },
    },
  ];

  // heldenmap (gedeeld) — id → klasse
  const HELDEN = {
    woede:  { naam: 'De Slachter',  src: '../assets/karakters/speler.webp', ph: '\u2694\ufe0f', kleur: 'var(--bloed)' },
    gif:    { naam: 'De Gifmagiër', src: '../assets/karakters/gifmagier.webp', ph: '\u2697\ufe0f', kleur: 'var(--gifgroen)' },
    vlucht: { naam: 'De Kolendruïde',   src: '../assets/karakters/thoverk.webp',   ph: '\ud83d\udd2e', kleur: 'var(--paars)' },
  };

  const SAMENVATTING = {
    titels: { jeugddroom: 'Jeugddroom', val: 'De val' },
  };

  return { scenes, SLOTS, HELDEN, SAMENVATTING };
})();
