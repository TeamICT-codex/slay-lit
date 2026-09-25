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
   de fotovraag-modal, de camerapopup en Barts bijnaam.
   R2 "DE VAL EN DE KLANK": de val is een pixelcanvas (proloog/val.js, de lichtmotor van
   de outro); hieronder staan alleen nog haar teksten. De maskerzinnen hebben één bron
   met de outro: OutroFX.MASKERZINNEN (js/outro-fx.js, altijd geladen in de game-pagina).
   R3 "HET KANTOOR ALS FILM": scènes 0-2 zijn geen diavoorstelling (de beat-machine met
   ±1560 woorden) meer, maar een film met één handeling per beat: inklokken (prikklok +
   tl-golf), de CRT degausst, het Glimlachquotum aan één bureau, de Zingevingsaudit, Karel,
   de oproep en de lift omhoog. Hieronder alleen de TEKST en de maten; de regie staat in
   proloog.js (sceneOverzicht, sceneBoot, sceneKantoor). Gemeten door de suite (deel 13):
   174-191 woorden zichtbaar in 0-2 per formaat, 198 in de strings hieronder (labels en
   cijfers meegeteld; plan: ≈400, max 450). */

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

  // —— R3: nieuwe art die nog MOET komen (de prompts staan in assets/proloog/PROMPTS.txt).
  // Nooit blind een bestand opvragen dat er niet is (een 404-probe per collega): een slot
  // telt pas als het in ART_MANIFEST.proloog staat, of — zolang het manifest die map niet
  // kent — als de vlag hieronder op true staat. BIJ DE ART-DROP: zet de vlag op true.
  // Zonder art tekent proloog.js een silhouet met één attribuut (Marleen: de warme lamp,
  // Rudi: bril en archiefdoos, Karel: alleen zijn tl-buis en zijn stem).
  const NIEUWE_ART = { collega_marleen: false, collega_rudi: false, collega_karel: false };
  function heeftArt(stam) {
    const m = window.ART_MANIFEST && window.ART_MANIFEST.proloog;
    if (Array.isArray(m)) return m.indexOf(stam) !== -1;
    return Object.prototype.hasOwnProperty.call(NIEUWE_ART, stam) && NIEUWE_ART[stam] === true;
  }
  const artAls = stam => (heeftArt(stam) ? A(stam + '.webp') : null);

  // —— R3: de echte Act 1-plaat van de game, voor de twee frames van de scheur (de énige
  // knipoog). Uit window.ACHTERGRONDEN (js/art.js, altijd geladen in de game-pagina), met
  // de vaste paden als terugval (lookup-bugklasse: nooit blind een sleutel lezen).
  function gamePlaten() {
    const G = window.ACHTERGRONDEN;
    const basis = (G && typeof G.basis === 'string') ? G.basis : 'assets/achtergronden/';
    const a1 = G && G.act1;
    const kaart = (a1 && typeof a1.kaart === 'string') ? a1.kaart : 'Act 1 achtergronden/Achtergrond ACT 1.webp';
    const gevecht = (a1 && Array.isArray(a1.gevecht) && typeof a1.gevecht[0] === 'string') ? a1.gevecht[0] : 'Act 1 achtergronden/Gevechtstijl1act1.webp';
    return [BASE + basis + kaart, BASE + basis + gevecht];
  }

  const scenes = [
    // 0 · 06:42, INKLOKKEN — regen op glas; een tl-starter tikt drie keer (tik… tik… TING)
    // en één tl-bak springt aan boven de prikklok. Sleep of tik de tijdkaart in de gleuf
    // (Enter): KA-TSJONK. Dan klakken de tl-rijen bank per bank aan en onthullen het
    // kantoor; de camera duikt in de gloeiende terminal. De pasfoto is een stille optie op
    // de badge. SLAY LIT staat nergens (het brandt één keer in, bij de landing).
    {
      kind: 'overzicht',
      backdrop: SLOTS.kantoor,
      // waar op kantoor-overzicht.webp (1586x992) de terminal gloeit: daar duikt de camera in
      duik: { x: 1140 / 1586, y: 415 / 992 },
      // de tl-rijen van de plaat, van voor naar achter (y op de plaat, 0-1): de tl-golf
      banken: [0.11, 0.19, 0.24, 0.275, 0.3, 0.325],
      klok: { merk: 'PRODUCTIVITEITSMIRAKEL', dag: 'MA', tijd: '06:42', gleuf: 'STEEK UW KAART IN', kaart: '0042', dagen: ['MA', 'DI', 'WO', 'DO', 'VR'] },
      badge: { merk: 'EEN PRODUCTIEF LEVEN™', mw: 'MEDEWERKER 0042', rol: 'Afd. Facturatie' },
    },

    // 1 · DE CRT DEGAUSST — het merk van De Oprichter, niet SLAY LIT. Regie, geen knop:
    // de jingle speelt één maat te lang en eindigt net vals (klinkt door in het bureau).
    {
      kind: 'boot',
      jingle: 'Het Productiviteitsmirakel presenteert',
      merk: 'EEN PRODUCTIEF LEVEN',
      tm: '— een idee van De Oprichter —',
      version: 'B.A.A.S. v8.7 · BEDRIJFS-AUTOMATISCH ADVIES-SYSTEEM',
      duur: 2600,   // ms tot het bureau (een tik spoelt door)
    },

    // 2 · HET GLIMLACHQUOTUM → DE ZINGEVINGSAUDIT → KAREL → DE OPROEP (→ de lift omhoog).
    // Eén vast bureaushot. Checkpoints: 'start' · 'glimlach' · 'audit' · 'oproep'.
    {
      kind: 'kantoor',
      tel: 750,   // de maat van de kantoormuzak (ms): de naald en de tl pulseren erop; op de tel glimlachen klinkt zuiverder
      meter: { start: 78, stap: 4, label: 'FACTURABILITEIT' },
      quotum: { start: 5, bijgesteld: 8, bijstelOp: 3, bartOp: 4, scheurOp: 5 },
      knop: { label: 'GLIMLACH', units: '0u06' },
      kop: 'B.A.A.S. v8.7',
      intro: ['Goedemorgen, 0042.', 'Ú schreef mij, in 1979.', 'Quotum vandaag: 5.'],
      bijgesteld: 'Quotum bijgesteld: 8. Dank voor uw flexibiliteit.',
      bart: 'Mooie glimlach, 0042! Vóórbeeldig!',
      knipoog: 'u speelt nu een spel om te ontsnappen aan een spel',   // de ÉNIGE meta-knipoog van de proloog
      platen: gamePlaten(),   // twee frames van de echte Act 1-plaat, in de scheur
      scheurFrames: [0.22, 0.67],   // wanneer (s) die frames in beeld komen (= proloog.css plFrame0/plFrame1: 18 % en 56 % van 1,2 s)
      warm: '…ik was ooit van u.',
      ruis: 'Excuus. Systeemruis.',
      foto: { src: SLOTS.foto.src, placeholder: SLOTS.foto.placeholder, stip: 'niet-factureerbaar',
              zin: 'Dat kleine gezicht.', snit: ['NIET-FACTUREERBAAR.', 'GEMARKEERD.'] },
      audit: {
        kop: 'FORMULIER Z-8 · ZINGEVINGSAUDIT',
        vraag: 'Wat wou u worden toen u acht was?',
        placeholder: 'typ uw antwoord…', max: 40, noteer: 'noteer',
        zelf: 'Gelieve zelf af te stempelen.',
        stempelKnop: 'STEMPEL',
        stempel: 'VOORZIENING GETROFFEN',   // dezelfde woorden als de archiefkast in de val (en de outro)
        machine: 'Geen probleem. Ik doe het wel.',
        wachtMs: 6000,
        archief: 'ARCHIEF',
      },
      // de collega's praten in de terminal-log (naamkop), nooit onder de vouw. Karels tl
      // klakt uit midden in het woord: hij zegt alleen 'knip' (en dan een streep).
      collegas: [
        { wie: 'karel',   t: 'Zoals ik dus zei—', knip: 'Zoals ik dus z' },
        { wie: 'rudi',    t: 'Dat was Karel. Twaalf jaar.' },
        { wie: 'bart',    t: 'Niks aan de hand! Kop op!' },
        { wie: 'marleen', t: 'Ik ga zo frieten halen. Wil je iets?' },   // rijmt op het warme frietkot in de val
      ],
      oproep: { t: 'Medewerker 0042. Uw aanwezigheid is vereist.', cta: 'BEVESTIG AANWEZIGHEID', knopNa: 2500 },
      // de goederenlift omhoog naar het dak (≤ 3 s, doortikbaar): het hek DICHT, geen blik
      // omlaag, geen dakrand (keuze 3). Dezelfde etages als de val, in omgekeerde richting.
      lift: { etages: ['2', '3', '4', 'DAK'], stapMs: 560 },
      wand: {
        oprichter: SLOTS.oprichter, plaquette: '◆ De Oprichter ◆',
        memo: { kop: 'MEMO · J. Devroe', t: 'Afwezig vandaag. Tekent uw evaluatie.', portret: A('junior.webp') },
        friet: ['Frituur ’t Hoekske', 'open tot 23u'],
      },
      // de collega's als hoofden boven de scheidingswand (x = plaats langs de wand, 0-1)
      team: [
        { id: 'bart',    naam: 'BART BLINKER', plaat: 'BART',      x: 0.2,  toon: 'kiss', portret: A('bart_blinker2.webp') },
        { id: 'rudi',    naam: 'RUDI',         plaat: 'RUDI',      x: 0.4,  toon: 'neutraal', src: artAls('collega_rudi'),    attribuut: 'doos' },
        { id: 'marleen', naam: 'MARLEEN',      plaat: 'MARLEEN',   x: 0.63, toon: 'warm',     src: artAls('collega_marleen'), attribuut: 'lamp' },
        { id: 'karel',   naam: 'KAREL',        plaat: 'KAREL · 7', x: 0.85, toon: 'neutraal', src: artAls('collega_karel'),   attribuut: 'tl' },
      ],
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
        { kop: 'Beurt 3', naam: 'OPTIMALISATIERONDE', icoon: '💀', telegraph: 'EINDE', hint: 'Geen blok stopt dit.' },
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
          'Je hamert op verzenden, harder, sneller. Het systeem stuurt een ontvangstbevestiging.',
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
        gesprongen: { kop: 'LOSGELATEN.', body: 'De rode stippellijn scheurt over heel het scherm. Niemand duwt je — je <b>kiest</b> zelf.' },
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
        sprong: { plus: 'U tekende niet. U had al losgelaten.', cta: 'Laat los' },
        geduwd: 'U tekent. De pen laat geen inkt na — alleen een groef.',
        ondertekenaar: { src: A('junior.webp'), placeholder: 'JUNIOR', naam: 'J. “Junior” Devroe', rol: 'Namens de directie · de zoon van De Oprichter', handtekening: 'J. Devroe' },
      },
      // IN DE WACHT (R2): de goederenlift daalt door de etages van de outro (proloog/val.js).
      // Keuze 3 (gevoeligheid): geen raam naar buiten, geen gevel, geen blik omlaag, geen
      // vrij vallende figuur, geen inslag — de lift daalt, de mens valt niet.
      // Alles hieronder staat in het pixelfont (hoofdletters, zonder accenten).
      val: {
        wacht: 'Een ogenblikje. Ik zet u even in de wacht.',          // de lichtkrant, bij het dichtschuiven van het hek
        krant: ['Blijf even aan de lijn.', 'Uw oproep is belangrijk voor ons.'],   // de lichtkrant, om beurten
        zeppelin: 'UW WELZIJN IS ONZE KPI  -  ',                     // op de romp, boven het dak
        verbinding: 'VERBINDING VERBROKEN',   // de meter-LED op 80 %: de ENIGE keer in de hele proloog
        vloer: 'De vloer is een veronderstelling. U had het moeten nalezen.',
        slot: 'Voor het eerst in vijfentwintig jaar wordt er niets gefactureerd.',
        // de bordjes op de etages
        deur: 'J. DEVROE', kast: ['VOORZIENING', 'GETROFFEN'], cubicle: '7', friet: 'FRIET', poster: 'GLIMLACH!',
        // de liftknop die niet zou mogen bestaan: wie sprong, drukt hem zelf in (beschenen
        // door de gevallen foto); wie geduwd werd, ziet B.A.A.S. hem indrukken
        knop: '−∞',
        knopSprong: 'Druk hem in.',
        knopGeduwd: 'B.A.A.S. drukt hem voor je in.',
      },
      breekpunt: {
        kop: 'De Afgrond',
        afgrondArt: A('de-afgrond.webp'),
        vraag: 'Je bent beneden. Maar hóe je verdergaat, dat kies je zelf.',
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

  // de maskers van de Afgrond; kleur/naam/HP/startkaarten komen live uit window.SPELERS,
  // hun zinnen uit OutroFX.MASKERZINNEN (R2: één bron met de reünie in de outro)
  const MASKERS = [
    { id: 'woede',  reactie: 'Uit woede',              soort: 'Verzet · brute kracht',
      masker: { src: A('masker-woede.webp'),  ph: '😠' } },
    { id: 'gif',    reactie: 'Uit wrok',               soort: 'Wrok · sluw venijn',
      masker: { src: A('masker-gif.webp'),    ph: '🙄' } },
    { id: 'vlucht', reactie: 'De verbeelding in',      soort: 'Ontkenning · verbeelding',
      masker: { src: A('masker-vlucht.webp'), ph: '🌀' } },
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

  // de zin van een masker (aanloop + kern), met de jeugddroom ingevuld of de terugvalzin
  // zonder droom. De tekst leeft in OutroFX.MASKERZINNEN (sleutel = game-held-id): de outro
  // citeert er de kern van. Ontbreekt die bron (of het masker), dan '' — de Afgrond laat de
  // regel dan weg (lookup-bugklasse: nooit blind een onbekende sleutel lezen).
  function maskerZin(id, jeugddroom) {
    const bron = window.OutroFX && window.OutroFX.MASKERZINNEN;
    const held = Object.prototype.hasOwnProperty.call(HELD_MAP, id) ? HELD_MAP[id] : null;
    const z = bron && held && Object.prototype.hasOwnProperty.call(bron, held) ? bron[held] : null;
    if (!z || typeof z.kern !== 'string') return '';
    const droom = typeof jeugddroom === 'string' ? jeugddroom.trim() : '';
    let aanloop = typeof z.aanloop === 'string' ? z.aanloop : '';
    if (aanloop.indexOf('{jeugddroom}') !== -1) {
      aanloop = droom ? aanloop.replace('{jeugddroom}', droom) : (z.aanloopZonder || aanloop.replace('{jeugddroom}', 'iets'));
    }
    return (aanloop ? aanloop + ' ' : '') + z.kern;
  }

  // hoofdstukken voor herbeleven (titel/DEV/Codex): Proloog.start({ hoofdstuk })
  // R3: de namen van 1 en 2 volgen de film (de indices 0-4 blijven)
  const HOOFDSTUKKEN = [
    { hoofdstuk: 0,         naam: 'Maandag, 06:42' },
    { hoofdstuk: 1,         naam: 'Een Productief Leven™' },
    { hoofdstuk: 2,         naam: 'Het Glimlachquotum' },
    { hoofdstuk: 3,         naam: 'Het Functioneringsgesprek' },
    { hoofdstuk: 'factuur', naam: 'De Eindafrekening' },
    { hoofdstuk: 'val',     naam: 'In de wacht' },
    { hoofdstuk: 'afgrond', naam: 'De Afgrond' },
  ];

  return { BASE, scenes, SLOTS, HELD_MAP, MASKERS, HELDEN, maskerZin, HOOFDSTUKKEN };
})();
