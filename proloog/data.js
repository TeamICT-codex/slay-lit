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
  // telt pas als het in ART_MANIFEST.proloog staat. Fixer R3 F1: .claude/converteer_webp.py
  // kent de map 'proloog' (MAPPEN + een cap voor collega_*), dus na de eerste art-drop schrijft
  // het manifest de sleutel 'proloog' zelf en is de vlag hieronder overbodig. De vlag geldt
  // alleen zolang het manifest de map NIET kent (een drop zonder de converter: noodrem).
  // Zonder art — of als een beloofde plaat toch niet laadt — tekent proloog.js een silhouet
  // met één attribuut (Marleen: de warme lamp, Rudi: bril en archiefdoos, Karel: alleen zijn
  // tl-buis en zijn stem).
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
        wachtMs: 6000,   // telt vanaf dat STEMPEL kan (fixer R3 F1: ±450 ms tikgrens na 'noteer')
        archief: 'ARCHIEF',
        bon: 'Z-8 → ARCHIEF.',   // fixer R3 F1: B.A.A.S. typt na de buizenpost waar het formulier heen ging (altijd in beeld)
      },
      // de collega's praten in de terminal-log (naamkop), nooit onder de vouw. Karels tl
      // klakt uit midden in het woord: hij zegt alleen 'knip' (en dan een streep).
      collegas: [
        { wie: 'karel',   t: 'Zoals ik dus zei—', knip: 'Zoals ik dus z' },
        { wie: 'rudi',    t: 'Dat was Karel. Twaalf jaar.' },
        { wie: 'bart',    t: 'Niks aan de hand! Kop op!' },
        // rijmt op het warme frietkot in de val. Fixer R3 F1: 'afgebroken' = de oproep valt ±0,6 s
        // na haar vraag binnen (i.p.v. 1,5 s): de enige vraag die een mens je die dag stelt, blijft
        // onbeantwoord (ze blijft in de log staan tot BEVESTIG)
        { wie: 'marleen', t: 'Ik ga zo frieten halen. Wil je iets?', afgebroken: 600 },
      ],
      oproep: { t: 'Medewerker 0042. Uw aanwezigheid is vereist.', cta: 'BEVESTIG AANWEZIGHEID', knopNa: 2500 },
      // de goederenlift omhoog naar het dak (≤ 3 s, doortikbaar): het hek DICHT, geen blik
      // omlaag, geen dakrand (keuze 3). Dezelfde etages als de val, in omgekeerde richting.
      // Fixer R3 F1: het paneel noemt de etage zoals de val (namen[i] hoort bij etages[i]);
      // de lichtband per etage leest zijn kleur uit OutroFX.KLIMAAT (proloog.js liftKleur).
      lift: { etages: ['2', '3', '4', 'DAK'], namen: ['KANTOORTUIN', 'FACTURATIE', 'DIRECTIE', ''], stapMs: 560 },
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

    // 3 · HET FUNCTIONERINGSGESPREK (R4) — de indeling van het ECHTE gevechtstoneel van de game
    // (#scherm-gevecht), in beige, op het dak in onweer, zodat je het gevecht straks herkent.
    // Links 0042: de naamkaart aan een rood koord op een lege bureaustoel, met WELZIJN 40. Rechts
    // B.A.A.S. (een beige mainframekast met het groene oog) met AANDEELHOUDERSWAARDE ∞ en een
    // intentiepil. Onderaan de energiebol, de trekstapel, de borstzak met de foto (altijd in beeld),
    // een waaier van vijf kantoorkaarten, 'Eindig beurt' en de aflegstapel. Geen uitlegregels.
    // 4 · DE UITWEG — sprong: houd de foto vast (touch/muis: vasthouden of een tweede tik; laptop:
    // spatie vasthouden); geduwd: na beurt 3 (of WELZIJN 0) vuurt de OPTIMALISATIERONDE.
    // Keuze 3: de lift daalt, de mens valt niet — geen dakrand, geen blik omlaag, het hek dicht.
    {
      kind: 'gesprek',
      titel: 'Het Functioneringsgesprek',
      beurt: 'Functioneringsgesprek · beurt {n}',
      start: { welzijn: 40, energie: 3 },
      facturabiliteit: 78,
      held: { naam: 'Medewerker 0042', welzijn: 'WELZIJN', nr: '0042' },
      baas: { naam: 'B.A.A.S.', waarde: 'AANDEELHOUDERSWAARDE', oneindig: '∞', fact: 'FACT.' },
      eindig: 'Eindig beurt',
      // de intentiepil boven B.A.A.S., per beurt (zoals de pil boven een vijand in het spel)
      intenties: [
        { id: 'deadline',      icoon: '⚔', naam: 'DEADLINE',           waarde: '8',    soort: 'aanval', schade: 8 },
        { id: 'teambuilding',  icoon: '🫂', naam: 'TEAMBUILDING',       waarde: '−1 ⚡', soort: 'debuff' },
        { id: 'optimalisatie', icoon: '💀', naam: 'OPTIMALISATIERONDE', waarde: '',     soort: 'schedel' },
      ],
      // de hand: vijf kantoorkaarten in de vorm van de echte kaarten (kostbol, naam, venster, tekst, type).
      // Het dek is deze vijf, twee keer: elke beurt trek je ze opnieuw (de trekstapel telt af).
      hand: [
        { id: 'glimlach',    naam: 'Glimlach',                 kost: 0, type: 'verdediging', label: 'VERDEDIGING', src: A('kaart-glimlach.webp'),            tekst: 'Krijg <b>5</b> Blok.',                   eff: { blok: 5 } },
        { id: 'mailtje',     naam: 'Snel een mailtje',         kost: 1, type: 'aanval',      label: 'AANVAL',      src: A('kaart-mailtje.webp'),             tekst: 'Doe <b>6</b> schade. Cc: iedereen.',     eff: { schade: 6 } },
        { id: 'koffie',      naam: 'Koffie',                   kost: 0, type: 'vaardigheid', label: 'VAARDIGHEID', src: A('kaart-koffie.webp'),              tekst: 'Krijg <b>1</b> ⚡.',                      eff: { energie: 1 } },
        { id: 'overuren',    naam: 'Overuren',                 kost: 0, type: 'verbrand',    label: 'VERBRAND',    src: A('kaart-overuren.webp'),            tekst: 'Verbrand <b>6</b> Welzijn. Krijg <b>2</b> ⚡.', eff: { welzijn: -6, energie: 2 } },
        { id: 'verantwoord', naam: '“Verantwoordelijkheid”', kost: 1, type: 'vloek',       label: 'VLOEK',       src: A('kaart-verantwoordelijkheid.webp'), tekst: 'Doet niets. B.A.A.S. <b>+5</b> %.',      eff: { baasFact: 5 } },
      ],
      // B.A.A.S. spreekt in groen fosfor, in een ballon bij zijn kast (het systeem zegt u)
      zegt: {
        start: 'Fijn dat u er bent. Dit is een gesprek tussen gelijken.',
        glimlach: 'Glimlach geregistreerd: 0u06.',
        mailtje: 'Dank voor uw inzet.',
        koffie: 'Koffie wordt verrekend met uw pauze.',
        overuren: 'Toewijding genoteerd.',
        verantwoord: 'Wij nemen uw verantwoordelijkheid graag over.',
        teWeinig: 'Onvoldoende energie. Neem een koffie.',
        deadline: 'Deadline.',
        teambuilding: 'Verplichte teambuilding. Samen sterk.',
        optimalisatie: 'Optimalisatieronde.',
        vrijgesteld: 'U bent vrijgesteld.',
      },
      // de zwevende getallen (zoals de schade in het spel): een mailtje laat ∞ niet zakken
      fx: { mailtje: '+6 % FACTURABILITEIT', verantwoord: '+5 % FACTURABILITEIT', blok: '+{n} BLOK', geblokt: 'GEBLOKT', energie: '+{n} ⚡', diefstal: '−1 ⚡' },
      foto: { src: SLOTS.foto.src, stip: 'niet-factureerbaar' },
      // de uitweg van wie springt: drie je-regels met een Ken Burns, dan 'Laat los'
      kijk: { regels: ['Daar ben je.', 'Het sterretje brandt nog in je hand.', 'Dat licht was nooit te koop.'], cta: 'Laat los', slot: 'Niemand duwt je — je kiest zelf.' },
      lift: { bord: 'DAK' },
      krant: 'FUNCTIONERINGSGESPREK  -  UW WELZIJN IS ONZE KPI  -  ',   // de lichtkrant van de zeppelin (pixelfont)
    },

    // 4 · De Eindafrekening → De Val → De Afgrond (fasen in één scène, elk een checkpoint)
    {
      kind: 'breekpunt',
      titel: 'De Eindafrekening',
      // 5 · DE EINDAFREKENING (R4): de matrixprinter van B.A.A.S. voert één kettingvel met JOUW
      // cijfers (het contract: glimlachen, foto, jeugddroom, zelf/machinaal afgestempeld), regel per
      // regel met printergeratel; de jeugddroomregel print trager. Bij de warmte loopt de printer vast
      // ('IN BESL█'), het totaal zakt naar €0,00. Na de perforatie het BESLUIT (checkpoint 'ontslag').
      factuur: {
        kop: 'EINDAFREKENING · MEDEWERKER 0042',
        sub: 'Een Productief Leven™ · Afd. Loon & Lot · ingeklokt MA 06:42',
        glimlachen: 'Glimlachen vandaag: {n} × 0u06',   // waarde: n × 6 minuten (7 → 0u42)
        foto: { label: 'Foto bekeken: {n}×', ja: 'gemarkeerd', nee: 'in orde' },
        droom: { label: '“{droom}” — {hoe} afgestempeld', zelf: 'zelf', machine: 'machinaal', waarde: 'voorziening getroffen', leeg: 'iets belangrijks' },
        bonus: { label: 'Loyaliteitsbonus 25 jaar', waarde: '1 (één) pen, leeg' },
        warmte: { label: 'Niet-factureerbare warmte — borstzak', waarde: 'IN BESLAG', tot: 7 },   // de printer loopt vast na 'IN BESL'
        totaal: { label: 'TOTAAL VERSCHULDIGD AAN U', van: 9131, naar: 0 },   // € 9.131,00 → € 0,00
        afgerond: 'Facturabiliteit afgerond: 80 %. In ons voordeel.',
      },
      ontslag: {
        kop: 'BESLUIT TOT BEËINDIGING',
        regels: ['Geachte 0042, u was ons dierbaar.', 'Uw contract wordt per heden ge-end-of-life’d.'],
        namens: 'Namens de directie:',
        ondertekenaar: 'J. Devroe',
        stempel: 'ONMIDDELLIJK ONTSLAG',   // dezelfde KA-TSJONK als de prikklok
        tekenregel: 'Handtekening medewerker:',
        pen: 'Teken',                       // de lege pen (geduwd): alleen een groef
        geduwd: 'Uw handtekening is niet vereist. Wij hadden hem al.',
        sprong: 'U tekende niet. U had al losgelaten.',
        wachtMs: 6000,
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
  // R3: de namen van 1 en 2 volgen de film (de indices 0-4 blijven). Fixer R3 F1: hoofdstuk 1
  // heet 'De CRT degausst' — in de Codex stond 'Een Productief Leven™' onder een blok met
  // dezelfde naam
  const HOOFDSTUKKEN = [
    { hoofdstuk: 0,         naam: 'Maandag, 06:42' },
    { hoofdstuk: 1,         naam: 'De CRT degausst' },
    { hoofdstuk: 2,         naam: 'Het Glimlachquotum' },
    { hoofdstuk: 3,         naam: 'Het Functioneringsgesprek' },
    { hoofdstuk: 'factuur', naam: 'De Eindafrekening' },
    { hoofdstuk: 'val',     naam: 'In de wacht' },
    { hoofdstuk: 'afgrond', naam: 'De Afgrond' },
  ];

  return { BASE, scenes, SLOTS, HELD_MAP, MASKERS, HELDEN, maskerZin, HOOFDSTUKKEN };
})();
