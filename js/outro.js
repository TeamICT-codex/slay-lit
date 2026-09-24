/* ============================================================
   SLAY LIT — DE OUTRO: "De Opzegtermijn" (fase 1: feel-prototype)
   Broforce-achtige pixel-sloop van de bovenstructuur, gespeeld ná
   het verslaan van de laatste baas. Bewuste stijlbreuk: eigen
   mini-engine op één 320×180-canvas, alle art in code getekende
   pixel-maps (géén webp-pipeline — dat is het punt). Volledige
   regie/ontwerp in OUTRO.md. Zelfde module-patroon als Vista:
   IIFE → window.Outro, elke aanroep vanuit game.js is guarded.
   ============================================================ */
const Outro = (() => {

  /* ---------- canvas & wereldconstanten ---------- */
  const BREED = 320, HOOG = 180;      /* interne resolutie, integer-opgeschaald */
  const TEGEL = 8;                    /* alles van het gebouw is 8×8-blokjes */
  const ZWAARTEKRACHT = 560;
  const LOOPSNELHEID = 85;
  const SPRONGKRACHT = 218;
  const COYOTE = 0.12, SPRONGBUFFER = 0.12;

  /* tegeltypes — BETON draagt het gebouw en is onverwoestbaar (je graaft niet
     uit het level), al de rest is sloopbaar. hp per type in TEGEL_HP.
     MACHINE en METER ontploffen bij sloop (meterkast = de grote kettingreactie). */
  const T = { LUCHT: 0, BETON: 1, GIPS: 2, GLAS: 3, MEUBEL: 4, KAST: 5, MACHINE: 6, HOUT: 7, METER: 8, POSTER: 9, POORT: 10, PLANT: 11, LADDER: 12 };
  const TEGEL_HP = [0, 5, 1, 1, 1, 1, 2, 1, 1, 1, 3, 1, 2];   /* beton = taai maar sloopbaar: kolommen kunnen om */
  const M2_PER_TEGEL = 0.36;          /* de ONTFACTUREERD-teller telt in m² kantoor */

  /* ---------- het palet: systeem = beige, wat leeft = kleur ---------- */
  const KLEUR = {
    '.': null,
    'z': '#16130e', 'k': '#26221a', 'g': '#6e6a58', 'G': '#454136',
    'b': '#cfc0a0', 'B': '#a08d68', 'w': '#efe9d6',
    'a': '#ffb347', 'o': '#ff7a2f', 't': '#ffd23f',
    'r': '#c9302c', 'p': '#79c045', 'c': '#5fd0d8',
    'h': '#7a5230', 'H': '#54371f',
    'l': '#cfe0e4', 's': '#9aa7ab', 'S': '#5f6d72',
    'f': '#f2c9a0', 'd': '#4a6fa5', 'D': '#32507a',
    'W': '#ffffff', 'v': '#8a5fc9'
  };

  /* heldkleur per masker — 'R'/'Q' in sprite-maps worden hierdoor vervangen */
  const HELD_TINT = {
    slachter:  { R: '#c9302c', Q: '#8f1f1c', M: '#7a1512' },   /* de band */
    gifmagier: { R: '#79c045', Q: '#4c7f2a', M: '#3d6a20' },   /* de kap */
    thoverk:   { R: '#ff9c3f', Q: '#b96a24', M: '#ffd23f' }    /* het hoedje */
  };

  /* ---------- pixel-sprites (string-maps, bij init gebakken) ---------- */
  const SPRITES = {
    held_sta: [
      '..MMMM..',
      '.MMffMM.',
      '.kfzfzk.',
      '..ffff..',
      '..RRRR..',
      '.RRRRRR.',
      'fRRRRRRf',
      '.RRRRRR.',
      '..QQQQ..',
      '..QQQQ..',
      '..Q..Q..',
      '..Q..Q..',
      '..k..k..',
      '.kk..kk.'
    ],
    held_loop1: [
      '..MMMM..',
      '.MMffMM.',
      '.kfzfzk.',
      '..ffff..',
      '..RRRR..',
      '.RRRRRR.',
      'fRRRRRRf',
      '.RRRRRR.',
      '..QQQQ..',
      '..QQQQ..',
      '.Q....Q.',
      '.Q....Q.',
      'kk....kk',
      '........'
    ],
    held_loop2: [
      '..MMMM..',
      '.MMffMM.',
      '.kfzfzk.',
      '..ffff..',
      '..RRRR..',
      '.RRRRRR.',
      'fRRRRRRf',
      '.RRRRRR.',
      '..QQQQ..',
      '..QQQQ..',
      '...QQ...',
      '...QQ...',
      '...kk...',
      '..kkkk..'
    ],
    held_spring: [
      '..MMMM..',
      '.MMffMM.',
      '.kfzfzk.',
      '..ffff..',
      '.fRRRRf.',
      '.RRRRRR.',
      '.RRRRRR.',
      '.RRRRRR.',
      '..QQQQ..',
      '.QQ..QQ.',
      '.Q....Q.',
      'kk....kk',
      '........',
      '........'
    ],
    bijl1: [
      '..ww....',
      '.wwww...',
      '.wwwh...',
      '...hh...',
      '...hh...',
      '....h...',
      '........',
      '........'
    ],
    bijl2: [
      '........',
      '....hh..',
      '..hhhw..',
      '.hwwww..',
      '...www..',
      '........',
      '........',
      '........'
    ],
    drone1: [
      '.ss..ss.',
      '..ssss..',
      '.sSSSSs.',
      'sSaSSaSs',
      'sSSSSSSs',
      '.ssssss.',
      '..t..t..',
      '..w..w..'
    ],
    drone2: [
      'ss....ss',
      '..ssss..',
      '.sSSSSs.',
      'sSaSSaSs',
      'sSSSSSSs',
      '.ssssss.',
      '..t..t..',
      '..w..w..'
    ],
    collega1: [
      '..kkk...',
      '.kfff...',
      '..fff...',
      '..ddd...',
      '.ddddd..',
      'fdddddf.',
      '.ddddd..',
      '..GGG...',
      '..G.G...',
      '..G.G...',
      '.kk.kk..'
    ],
    collega2: [
      '..kkk...',
      '.kfff...',
      '..fff...',
      '..ddd...',
      '.ddddd..',
      'fdddddf.',
      '.ddddd..',
      '..GGG...',
      '.G...G..',
      '.G...G..',
      'kk...kk.'
    ],
    hart: [
      '.W.W.',
      'WrWrW',
      'WrrrW',
      '.WrW.',
      '..W..'
    ],
    hart_leeg: [
      '.G.G.',
      'G.G.G',
      'G...G',
      '.G.G.',
      '..G..'
    ],
    hond_wit: [
      'l.........',
      'lW.....WW.',
      '.WWWWWWWWW',
      '.WWWWWWWzW',
      '.WWWWWWWW.',
      '.W..W..W..',
      '.W..W..W..',
      '.l..l..l..'
    ],
    kopieerbot: [
      '.sssssss...',
      '.sSSSSSs...',
      '.sScScSs...',
      '.sSSSSSs...',
      'sssssssss..',
      'swwwwwwws..',
      'sssssssss..',
      '.sS...Ss...',
      '.ss...ss...',
      '...........',
      '...........',
      '...........'
    ],
    torentje: [
      '...aa.....',
      '..ssss....',
      '.sSzzSs...',
      '.sSSSSs...',
      '.ssssss...',
      '..s..s....',
      '.ss..ss...',
      '..........'
    ],
    slijm: [
      '...pppp...',
      '..pppppp..',
      '.pWpzppzp.',
      '.pppppppp.',
      'pppGppGppp',
      '.pp.pp.pp.'
    ],
    kaart: [
      'kkkkkkkk',
      'kwwwwwwk',
      'kwvvvvwk',
      'kwvzzvwk',
      'kwvvvvwk',
      'kwwvvwwk',
      'kwwwwwwk',
      'kkkkkkkk'
    ],
    kaart_koffie: [
      'kkkkkkkk',
      'kwwwwwwk',
      'kwhhhhwk',
      'kwhaahwk',
      'kwhhhhwk',
      'kwwhhwwk',
      'kwwwwwwk',
      'kkkkkkkk'
    ],
    kaart_mail: [
      'kkkkkkkk',
      'kwwwwwwk',
      'kwaaaawk',
      'kwaWWawk',
      'kwaaaawk',
      'kwwwwwwk',
      'kwwwwwwk',
      'kkkkkkkk'
    ],
    kaart_over: [
      'kkkkkkkk',
      'kwwwwwwk',
      'kwwoowwk',
      'kwotoowk',
      'kwottowk',
      'kwwttwwk',
      'kwwwwwwk',
      'kkkkkkkk'
    ],
    kaart_schok: [
      'kkkkkkkk',
      'kwwwwwwk',
      'kwc..cwk',
      'kw.cc.wk',
      'kw.cc.wk',
      'kwc..cwk',
      'kwwwwwwk',
      'kkkkkkkk'
    ],
    kaart_bonus: [
      'kkkkkkkk',
      'kwwwwwwk',
      'kw.WW.wk',
      'kwWrrWwk',
      'kwWrrWwk',
      'kw.WW.wk',
      'kwwwwwwk',
      'kkkkkkkk'
    ],
    slang: [
      '..............',
      'ss..ss..ssss..',
      'sSssSSssSzSs..',
      'ssssssssssss..',
      '.s..s..s..s...',
      '..............'
    ],
    /* DE MIDDENMANAGER — de mini-baas: pak, das, wenkbrauwen die niet meebuigen */
    manager: [
      '..kkkkkkkk..',
      '.kffffffffk.',
      '.fkffffkfff.',
      '.ffzffffzff.',
      '.ffffffffff.',
      '..fwwwwwwf..',
      '.dDwwrrwwDd.',
      'dDDwwrrwwDDd',
      'dDDwwrrwwDDd',
      'dDDwwwwwwDDd',
      'dDDDwwwwDDDd',
      '.DDwwwwwwDD.',
      '.DD.wwww.DD.',
      '.ff.dddd.ff.',
      '....d..d....',
      '...kk..kk...'
    ]
  };
  /* ---------- 3×5 pixel-font (hoofdletters — alle outro-UI is kapitaal) ---------- */
  /* ---------- 5×7 dot-matrix-font (leesbaar, ook op 320px) ---------- */
  const FONT = {
    A:[14,17,17,31,17,17,17],B:[30,17,17,30,17,17,30],C:[14,17,16,16,16,17,14],
    D:[30,17,17,17,17,17,30],E:[31,16,16,30,16,16,31],F:[31,16,16,30,16,16,16],
    G:[14,17,16,23,17,17,15],H:[17,17,17,31,17,17,17],I:[14,4,4,4,4,4,14],
    J:[7,2,2,2,2,18,12],K:[17,18,20,24,20,18,17],L:[16,16,16,16,16,16,31],
    M:[17,27,21,21,17,17,17],N:[17,25,21,19,17,17,17],O:[14,17,17,17,17,17,14],
    P:[30,17,17,30,16,16,16],Q:[14,17,17,17,21,18,13],R:[30,17,17,30,20,18,17],
    S:[15,16,16,14,1,1,30],T:[31,4,4,4,4,4,4],U:[17,17,17,17,17,17,14],
    V:[17,17,17,17,17,10,4],W:[17,17,17,21,21,27,17],X:[17,17,10,4,10,17,17],
    Y:[17,17,10,4,4,4,4],Z:[31,1,2,4,8,16,31],
    '0':[14,17,19,21,25,17,14],'1':[4,12,4,4,4,4,14],'2':[14,17,1,6,8,16,31],
    '3':[14,17,1,6,1,17,14],'4':[2,6,10,18,31,2,2],'5':[31,16,30,1,1,17,14],
    '6':[6,8,16,30,17,17,14],'7':[31,1,2,4,8,8,8],'8':[14,17,17,14,17,17,14],
    '9':[14,17,17,15,1,2,12],
    ':':[0,4,0,0,0,4,0],'.':[0,0,0,0,0,6,6],',':[0,0,0,0,0,4,8],
    '-':[0,0,0,14,0,0,0],'+':[0,4,4,31,4,4,0],'=':[0,0,31,0,31,0,0],
    '!':[4,4,4,4,4,0,4],'?':[14,17,1,2,4,0,4],'/':[1,1,2,4,8,16,16],
    "'":[4,4,0,0,0,0,0],'"':[10,10,0,0,0,0,0],
    '(':[2,4,8,8,8,4,2],')':[8,4,2,2,2,4,8],'[':[14,8,8,8,8,8,14],']':[14,2,2,2,2,2,14],
    ' ':[0,0,0,0,0,0,0]
  };

  /* ---------- module-staat ---------- */
  let canvas = null, ctx = null;
  let schermCanvas = null, schermCtx = null;   /* het zichtbare, opgeschaalde canvas */
  let gebakken = null;                          /* naam → offscreen sprite-canvas */
  let lvl = null;                               /* het actieve level (tegels + entiteiten) */
  let staat = 'uit';                            /* uit | intro | spel | klaar */
  let naOutro = null;                           /* callback als de outro eindigt */
  let tikkerAf = null, eigenRaf = 0;
  let tijd = 0, introT = 0;
  let hitstop = 0, schudT = 0, schudKracht = 0;
  /* de regietafel: tijdschaal (slow-mo), hitstopbudget, camera-veer + trauma,
     filmbalken, impactframes en "het systeem verbleekt" */
  let tijdSchaal = 1, slowmoToestand = null, slowmoKoeling = 0, stopBudget = 0.25, stopDoel = null;
  let kickX = 0, kickY = 0, kickVX = 0, kickVY = 0, trauma = 0;
  let balkT = 0, balkTot = 0;                   /* filmbalken: 0..1, en tot wanneer ze moeten blijven */
  let impactTot = -9, impactInvers = false, impactKlok = -9, inversKlok = -9;
  let verbleek = 0, verbleekTot = 0;            /* 0..1: het systeem verbleekt, de mensen niet */
  let meterKnallen = [], knalVenster = [];     /* tijdstippen van recente knallen (ketting / slow-mo) */
  let reduceMotion = false;
  let donderT = 0;                              /* de donder komt een halve tel na de flits */
  let renderDt = 1 / 60;                        /* de laatste tikduur, voor wat in een render-lus beweegt */
  let cine = null, stempel = null;              /* de keynote van de middenmanager + het ONTSLAGEN-stempel */
  let kettingPunch = 0, mijlpaal = null;        /* SLOOPKETTING: schaal-punch + de banner bij 25/50/100 */
  let voorbak = [], fxNiveau = 2, gemDt = 1 / 60, traagT = 0;   /* voorbakken + de fps-bewaker (2 vol, 1 zuinig, 0 lite) */
  let camX = 0, camY = 0;
  let held = null, drones = [], kogels = [], cocons = [], collegas = [], worp = null;
  let cellen = [], droomkast = null, gifbal = null;  /* masker-cellen, de jeugddroom-kast, de gifboog */
  let maskers = ['slachter'], maskerIdx = 0, signKlok = 0, papierWachtrij = 0, papierBron = null;
  let lvlIdx = 0, wisselDoel = 0, dakval = null;     /* de keten van verdiepingen + de dak-instorting */
  let mozaiek = null, zoomFoto = null, zoomPunt = null;   /* dither-intro + de pixel-zoom naar de terminal */
  let hintT = 0;
  let splash = null, schermFlits = 0;
  let valT = 0;
  let proloog = {};                                /* overdracht uit de proloog (localStorage) */
  let pickups = [], post = [];                     /* upgrade-kaarten + mailtjes-projectielen */
  let upgrades = { koffie: 0, mail: 0, over: 0, schok: 0, bonus: 0 };  /* kaarten die je aanvallen pimpen */
  let harten = [];                                 /* hartjes die uit sloop vallen (kaart DERTIENDE MAAND) */
  let sloopKetting = 0, kettingT = 0, kettingPiek = 0;  /* de SLOOPKETTING-combo: hoe meer je in één adem sloopt */
  let partikels = [], popups = [], popupWachtrij = 0, popupKlok = 0;
  let bomWachtrij = [], stortWachtrij = [];     /* kettingreacties + instortende kolommen */
  let glasWachtrij = [], wrakken = [], motes = [];   /* versplinterende ruiten, tollende drone-wrakken, stof in de bundels */
  let brokAtlas = null, brokCtx = null, brokSlot = 0; /* puin wordt uit de échte tegeltextuur geknipt */
  let hal = null;                               /* serverhal-staat (B.A.A.S., ∞, het paneel) */
  let wisselT = 0, wisselGebouwd = false, wisselDicht = false, wisselAan = false, wisselVan = 0;   /* de liftrit tussen twee lagen */
  let configStap = 0, configT = 0, epi = null;  /* het configscherm + de epiloog */
  let ontfactureerd = 0;                        /* m² kantoor */
  let hudTekst = null, hudTekstT = 0;           /* droge regels (bevrijding, respawn) */
  let toetsen = new Set();
  let vuurBuf = 0, worpBuf = 0;   /* een ultrakorte tik mag nooit verloren gaan */
  let aanraking = { stickId: null, stickX0: 0, dx: 0, knoppen: {} };
  let sfxKlok = {};                             /* per-naam cooldown: geen 40 klappen per frame */
  let devModus = false;
  let fx = null;                                /* OutroFX: licht, lucht en nabewerking (optioneel) */
  let wereldC = null, wereldCtx = null;         /* de belichte wereldlaag (met doorzichtige ramen) */
  let hoofdCtxRef = null;                       /* het echte hoofdcontext: elk frame begint daar weer (ook na een fout) */
  let tls = [];                                 /* de tl-bakken (en in de directie: kroonluchters) */
  let fakkelDip = 0;                            /* 1 = de fakkel is net tot een kooltje gedoofd (treffer) */

  /* ---------- het klimaat per laag: van koud tl-grijs naar warm vuur ----------
     ambient = de basis van de lichtkaart (multiply: alles wat geen licht vangt
     zakt naar deze tint), tl = de kleur van de buizen, grade = een kleurtoon
     over het hele beeld. Hoe hoger je klimt, hoe warmer en roder het wordt. */
  const KLIMAAT = [
    /* koud → warm: het ambient schuift naar warm naarmate de stoet groeit (de
       velen maken het licht); banden = hoe grof het licht in trappen valt —
       hoe dichter bij B.A.A.S., hoe grover (de boekhoudersblik, onbenoemd) */
    { naam: 'archief',     koud: '#222a38', warm: '#40342a', tl: '#cfd8e0', grade: '#2f5a7a', gradeS: 0.3,  banden: 4, lucht: null,    horizon: 0 },
    { naam: 'kantoortuin', koud: '#22342a', warm: '#403622', tl: '#d8f0d0', grade: '#4f7a4a', gradeS: 0.28, banden: 4, lucht: 'nacht', horizon: 150 },
    { naam: 'facturatie',  koud: '#1a3640', warm: '#40301e', tl: '#cfeef4', grade: '#2f7a8a', gradeS: 0.28, banden: 3, lucht: 'nacht', horizon: 196 },
    { naam: 'directie',    koud: '#34191c', warm: '#502e1c', tl: '#dfe2ff', grade: '#8a2a2a', gradeS: 0.3,  banden: 3, lucht: 'storm', horizon: 236 },
    { naam: 'penthouse',   koud: '#302640', warm: '#523036', tl: '#dfe2ff', grade: '#6a2a5a', gradeS: 0.26, banden: 2, lucht: 'storm', horizon: 232 }
  ];
  const klimaatNu = () => KLIMAAT[klem(lvlIdx, 0, KLIMAAT.length - 1)];
  /* hex-kleuren mengen (gecachet: het ambient verandert zelden) */
  const mengCache = new Map();
  function mengKleur(a, b, f) {
    f = Math.round(klem(f, 0, 1) * 32) / 32;
    const sleutel = a + b + f;
    let r = mengCache.get(sleutel);
    if (r) return r;
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const m = sh => Math.round(((pa >> sh) & 255) * (1 - f) + ((pb >> sh) & 255) * f);
    r = '#' + ((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1);
    if (mengCache.size > 300) mengCache.clear();
    mengCache.set(sleutel, r);
    return r;
  }
  /* de warmte van een etage: hoe groter de stoet, hoe warmer het donker */
  const ambientNu = K => mengKleur(K.koud, K.warm, collegas.length / 8);

  /* ---------- kleine helpers ---------- */
  const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const klem = (v, a, b) => v < a ? a : (v > b ? b : v);
  function sfx(naam, min) {
    if (!window.Klank || !Klank.sfx) return;
    const nu = tijd;
    if (sfxKlok[naam] && nu - sfxKlok[naam] < (min || 0.07)) return;
    sfxKlok[naam] = nu;
    try { Klank.sfx(naam); } catch (e) {}
  }

  /* een 1px donkere omlijning rond elke gevulde pixel: sprites lezen
     meteen los van de achtergrond (dé pixel-art-leesbaarheidstruc) */
  function omlijn(c) {
    const w = c.width, h = c.height, x = c.getContext('2d');
    const d = x.getImageData(0, 0, w, h), p = d.data;
    const vol = i => p[i * 4 + 3] > 40;
    const rand = [];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const idx = j * w + i;
      if (vol(idx)) continue;
      if ((i > 0 && vol(idx - 1)) || (i < w - 1 && vol(idx + 1)) || (j > 0 && vol(idx - w)) || (j < h - 1 && vol(idx + w))) rand.push(idx);
    }
    for (const idx of rand) { p[idx * 4] = 12; p[idx * 4 + 1] = 10; p[idx * 4 + 2] = 7; p[idx * 4 + 3] = 235; }
    x.putImageData(d, 0, 0);
    return c;
  }

  function bakSprite(rijen, tint) {
    const h = rijen.length, w = rijen[0].length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const cx = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let ch = rijen[y][x];
      let kleur = (tint && tint[ch]) || KLEUR[ch];
      if (ch === '.' || !kleur) continue;
      cx.fillStyle = kleur;
      cx.fillRect(x, y, 1, 1);
    }
    return omlijn(c);
  }

  function bakAlles() {
    gebakken = {};
    /* het noodbord: groen vlak, wit lopend mannetje, witte deur */
    gebakken.nooduitgang = bakSprite([
      'NNNNNNNNNNNN',
      'NnnnWnnnnnnN',
      'NnnWWWnnnWWN',
      'NnWnWnWnnWnN',
      'NnnnWnnnnWnN',
      'NnnWnWnnnWWN',
      'NNNNNNNNNNNN'
    ], { N: '#1f6a3a', n: '#3fd06a', W: '#f4fff6' });
    for (const naam in SPRITES) {
      if (naam.indexOf('held') === 0) {
        /* de held in alle drie de masker-tinten — wisselen is een blit */
        for (const mk in HELD_TINT) gebakken[naam + '@' + mk] = bakSprite(SPRITES[naam], HELD_TINT[mk]);
      } else {
        gebakken[naam] = bakSprite(SPRITES[naam], null);
      }
    }
    /* silhouetten voor de impactframes: wit (#w) en zwart (#z) */
    for (const naam of Object.keys(gebakken)) {
      const bron = gebakken[naam];
      for (const [sfx2, kl] of [['#w', '#ffffff'], ['#z', '#07060a'], ['#g', '#ffd89a']]) {
        const c = document.createElement('canvas'); c.width = bron.width; c.height = bron.height;
        const x = c.getContext('2d'); x.drawImage(bron, 0, 0);
        x.globalCompositeOperation = 'source-in'; x.fillStyle = kl; x.fillRect(0, 0, c.width, c.height);
        gebakken[naam + sfx2] = c;
      }
    }
  }

  /* de bijl-smear: een halve maan met een witte voorrand, de masker-kleur in
     het midden en een gedithered staart — 3 frames, vooruit en omhoog */
  const smearCache = new Map();
  function smear(kleur, omhoog, frame) {
    const sleutel = kleur + (omhoog ? 'o' : 'v') + frame;
    let c = smearCache.get(sleutel);
    if (c) return c;
    const B = 20, Hh = 18, cx0 = 1, cy0 = 9;
    const v = document.createElement('canvas'); v.width = B; v.height = Hh;
    const x = v.getContext('2d');
    const bereik = frame === 0 ? [-1.35, -0.2] : frame === 1 ? [-1.35, 1.35] : [0.1, 1.35];
    for (let yy = 0; yy < Hh; yy++) for (let xx = 0; xx < B; xx++) {
      const dx = xx + 0.5 - cx0, dy = yy + 0.5 - cy0, d = Math.sqrt(dx * dx + dy * dy), a = Math.atan2(dy, dx);
      const buiten = frame === 1 ? 12 : 10, binnen = frame === 2 ? 9 : 7;
      if (d > buiten || d < binnen || a < bereik[0] || a > bereik[1]) continue;
      const u = (a - bereik[0]) / (bereik[1] - bereik[0]);
      const drempel = BAYER4[(yy & 3) * 4 + (xx & 3)] / 16;
      let kl = null;
      if (frame === 2) kl = drempel < 0.3 * (1 - u) + 0.1 ? kleur : null;
      else if (u > 0.84) kl = '#ffffff';
      else if (u > 0.34) kl = (d > buiten - 1.5 && frame === 1) ? '#ffffff' : kleur;
      else kl = drempel < u * 1.5 ? kleur : null;
      if (kl) { x.fillStyle = kl; x.fillRect(xx, yy, 1, 1); }
    }
    if (omhoog) {
      /* omhoog = dezelfde boog, een kwartslag gedraaid (pixel-exact) */
      c = document.createElement('canvas'); c.width = Hh; c.height = B;
      const y = c.getContext('2d'); y.translate(0, B); y.rotate(-Math.PI / 2); y.drawImage(v, 0, 0);
    } else c = v;
    if (smearCache.size > 120) smearCache.clear();
    smearCache.set(sleutel, c);
    return c;
  }

  /* tekst in het 3×5-font (alleen hoofdletters; onbekende tekens = spatie) */
  /* tekst-cache: elke (regel, kleur, schaal) wordt één keer als mini-canvas
     gebakken en daarna geblit. Zonder cache hertekent de HUD duizenden
     1px-fillRects per frame (5x7-font = tot 35 rects x 2 passes per teken) —
     op mobiel dé grootste constante CPU-post van de outro. */
  const tekstCache = new Map();
  function tekst(cx, str, x, y, kleur, schaal) {
    schaal = schaal || 1;
    /* gedachtestreepjes zitten niet in het 5x7-font — normaliseer, anders
       vallen ze stil weg (verdiepingsnamen, seed-strings) */
    str = String(str).replace(/[—–]/g, '-').toUpperCase();
    const sleutel = str + '' + kleur + '' + schaal;
    let c = tekstCache.get(sleutel);
    if (!c) {
      if (tekstCache.size > 192) tekstCache.clear();   /* grof maar afdoende: nooit onbegrensd */
      c = document.createElement('canvas');
      c.width = Math.max(1, str.length * 6 * schaal + schaal);
      c.height = 8 * schaal;   /* 7 glyphrijen + 1 rij slagschaduw */
      const tc = c.getContext('2d');
      /* eerst de slagschaduw, dan de kleur: leesbaar op elke drukke achtergrond */
      for (const schaduw of [1, 0]) {
        tc.fillStyle = schaduw ? 'rgba(8,6,4,0.9)' : kleur;
        let px = schaduw * schaal;
        const py = schaduw * schaal;
        for (const ch of str) {
          const gl = FONT[ch] || FONT[' '];
          for (let r = 0; r < 7; r++) for (let b = 0; b < 5; b++) {
            if (gl[r] & (16 >> b)) tc.fillRect(px + b * schaal, py + r * schaal, schaal, schaal);
          }
          px += 6 * schaal;
        }
      }
      tekstCache.set(sleutel, c);
    }
    cx.drawImage(c, Math.round(x), Math.round(y));
    return tekstBreedte(str, schaal);
  }
  const tekstBreedte = (str, schaal) => String(str).length * 6 * (schaal || 1) - (schaal || 1);
  /* woord-afbreking: tekst binnen maxBr px houden, over meerdere regels.
     Geeft de y ná de laatste regel terug (zodat de aanroeper kan doorstapelen). */
  function tekstWrap(cx, str, x, y, kleur, maxBr, regelH, schaal) {
    const s = schaal || 1, rh = regelH || 9;
    const woorden = String(str).split(' ');
    let regel = '', ry = y;
    for (const w of woorden) {
      const test = regel ? regel + ' ' + w : w;
      if (regel && tekstBreedte(test, s) > maxBr) { tekst(cx, regel, x, ry, kleur, s); regel = w; ry += rh; }
      else regel = test;
    }
    if (regel) { tekst(cx, regel, x, ry, kleur, s); ry += rh; }
    return ry;
  }

  /* ============================================================
     LEVEL — V-1 HET ARCHIEF (testverdieping van het feel-prototype)
     Programmatic gebouwd: rand van beton, gipswanden met deuren,
     archiefkasten, glazen scheidingswand, platforms, machines,
     twee cocons, drie drones en de goederenlift als uitgang.
     ============================================================ */
  function bouwTestVerdieping() {
    const B = 110, H = 22;
    const type = new Uint8Array(B * H);
    const hp = new Uint8Array(B * H);
    const zet = (x, y, t) => {
      if (x < 0 || y < 0 || x >= B || y >= H) return;
      type[y * B + x] = t; hp[y * B + x] = TEGEL_HP[t];
    };
    const vul = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) zet(x, y, t); };

    /* schil: vloer, plafond, buitenmuren */
    vul(0, 0, B - 1, 0, T.BETON);
    vul(0, H - 1, B - 1, H - 1, T.BETON);
    vul(0, H - 2, B - 1, H - 2, T.BETON);
    vul(0, 0, 1, H - 1, T.BETON);
    vul(B - 2, 0, B - 1, H - 1, T.BETON);

    /* dragende kolommen (onverwoestbaar — je sloopt het kantoor, niet het gebouw)
       … met een doorgang van 5 tegels onderaan */
    for (const kx of [24, 52, 80]) { vul(kx, 1, kx, H - 3, T.BETON); vul(kx, H - 7, kx, H - 3, T.LUCHT); }

    /* gipswanden met deuropeningen */
    for (const wx of [14, 38, 66, 92]) { vul(wx, 4, wx, H - 3, T.GIPS); vul(wx, H - 6, wx, H - 3, T.LUCHT); }

    /* glazen scheidingswand (rinkelt heerlijk) */
    vul(59, 6, 59, H - 3, T.GLAS); vul(59, H - 5, 59, H - 3, T.LUCHT);

    /* archiefkasten: 2 hoog, in rijen (de inhoud van 25 jaar) */
    for (const [kx0, kx1] of [[5, 11], [27, 35], [42, 50], [70, 78], [84, 90]]) {
      for (let x = kx0; x <= kx1; x += 2) { zet(x, H - 3, T.KAST); zet(x, H - 4, T.KAST); }
    }
    /* bureaus (meubel, 1 hoog) tussen de kasten */
    for (const mx of [17, 19, 21, 55, 57, 62, 64, 96, 98]) zet(mx, H - 3, T.MEUBEL);
    for (const px2 of [12, 36, 54, 97]) zet(px2, H - 3, T.PLANT);

    /* houten tussenplatforms om op te springen */
    vul(28, 13, 34, 13, T.HOUT);
    vul(44, 10, 49, 10, T.HOUT);
    vul(61, 13, 65, 13, T.HOUT);
    vul(71, 9, 76, 9, T.HOUT);

    /* machines (2 hp): prikklokken/servers op de vloer en op platforms */
    for (const [mx, my] of [[15, H - 3], [30, 12], [47, 9], [63, 12], [74, 8], [93, H - 3]]) zet(mx, my, T.MACHINE);

    /* meterkasten: de kettingreactie-kandidaten — naast wanden en kastenrijen,
       zodat één goede klap een halve verdieping doet omvallen */
    for (const [ex, ey] of [[13, H - 3], [29, H - 3], [37, H - 3], [46, 9], [58, H - 3], [72, H - 3], [91, H - 3]]) zet(ex, ey, T.METER);

    return {
      naam: 'V-1 — HET ARCHIEF',
      soort: 'verdieping',
      kols: B, rijen: H, type, hp,
      spelerStart: { x: 4 * TEGEL, y: (H - 5) * TEGEL },
      vijanden: [
        { soort: 'drone', x: 31 * TEGEL, y: 6 * TEGEL },
        { soort: 'drone', x: 56 * TEGEL, y: 8 * TEGEL },
        { soort: 'slang', x: 81 * TEGEL, y: (H - 3) * TEGEL + 2 },
        { soort: 'slijm', x: 44 * TEGEL, y: (H - 4) * TEGEL }
      ],
      cocons: [{ x: 25 * TEGEL, y: (H - 5) * TEGEL }, { x: 67 * TEGEL, y: (H - 5) * TEGEL }],
      pickups: [{ soort: 'koffie', x: 46 * TEGEL, y: (H - 7) * TEGEL }],
      lift: { x: 103 * TEGEL, y: (H - 8) * TEGEL, b: 4 * TEGEL, h: 5 * TEGEL }
    };
  }

  /* V2 — DE KANTOORTUIN: cubicle-doolhof, kopieerbots, Glimlachquotum-
     posters, badge-poortjes die de weg blokkeren, en het eerste masker. */
  function bouwKantoortuin() {
    const B = 120, H = 22;
    const type = new Uint8Array(B * H);
    const hp = new Uint8Array(B * H);
    const zet = (x, y, t) => { if (x >= 0 && y >= 0 && x < B && y < H) { type[y * B + x] = t; hp[y * B + x] = TEGEL_HP[t]; } };
    const vul = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) zet(x, y, t); };

    vul(0, 0, B - 1, 0, T.BETON); vul(0, H - 1, B - 1, H - 1, T.BETON); vul(0, H - 2, B - 1, H - 2, T.BETON);
    vul(0, 0, 1, H - 1, T.BETON); vul(B - 2, 0, B - 1, H - 1, T.BETON);
    for (const kx of [30, 62, 92]) { vul(kx, 1, kx, H - 3, T.BETON); vul(kx, H - 7, kx, H - 3, T.LUCHT); }

    /* de cubicle-tuin: lage gipswandjes met posters erop, bureaus ertussen */
    for (const cx of [8, 16, 24, 36, 44, 52, 68, 76, 84, 98, 106]) {
      vul(cx, H - 5, cx, H - 3, T.GIPS);
      if (cx % 16 === 8) zet(cx, H - 6, T.POSTER);
      zet(cx + 3, H - 3, T.MEUBEL);
    }
    for (const px2 of [10, 27, 55, 86, 109]) zet(px2, H - 3, T.PLANT);
    /* de badge-poortjes: twee kolom-doorgangen op slot — slopen of niets */
    for (const px of [30, 92]) { zet(px, H - 3, T.POORT); zet(px, H - 4, T.POORT); zet(px, H - 5, T.POORT); }

    /* een tussenverdieping van hout, met machines en een glaswand */
    vul(38, 12, 48, 12, T.HOUT); vul(70, 10, 80, 10, T.HOUT); vul(100, 13, 108, 13, T.HOUT);
    for (const [lx, y0, y1] of [[37, 10, 19], [81, 8, 19], [99, 11, 19]]) {
      for (let ly = y0; ly <= y1; ly++) zet(lx, ly, T.LADDER);
    }
    zet(42, 11, T.MACHINE); zet(74, 9, T.MACHINE); zet(104, 12, T.MACHINE);
    vul(56, 5, 56, H - 6, T.GLAS);
    for (const [ex, ey] of [[13, H - 3], [33, H - 3], [58, H - 3], [73, 9], [89, H - 3], [111, H - 3]]) zet(ex, ey, T.METER);
    for (const wx of [20, 48, 78, 102]) zet(wx, 6, T.POSTER);

    return {
      naam: 'V2 — DE KANTOORTUIN',
      soort: 'verdieping',
      kols: B, rijen: H, type, hp,
      spelerStart: { x: 4 * TEGEL, y: (H - 5) * TEGEL },
      vijanden: [
        { soort: 'kopieerbot', x: 40 * TEGEL, y: (H - 5) * TEGEL },
        { soort: 'kopieerbot', x: 82 * TEGEL, y: (H - 5) * TEGEL },
        { soort: 'drone', x: 50 * TEGEL, y: 6 * TEGEL },
        { soort: 'drone', x: 96 * TEGEL, y: 5 * TEGEL },
        { soort: 'slang', x: 66 * TEGEL, y: (H - 3) * TEGEL + 2 },
        { soort: 'slijm', x: 22 * TEGEL, y: (H - 4) * TEGEL },
        { soort: 'slijm', x: 74 * TEGEL, y: (H - 4) * TEGEL }
      ],
      cocons: [{ x: 12 * TEGEL, y: (H - 5) * TEGEL }, { x: 47 * TEGEL, y: (H - 5) * TEGEL }, { x: 87 * TEGEL, y: (H - 5) * TEGEL }],
      cellen: [{ x: 71 * TEGEL, y: (H - 5) * TEGEL }],
      pickups: [{ soort: 'mail', x: 43 * TEGEL, y: 10 * TEGEL }, { soort: 'koffie', x: 102 * TEGEL, y: 11 * TEGEL }, { soort: 'schok', x: 74 * TEGEL, y: 8 * TEGEL }],
      lift: { x: 113 * TEGEL, y: (H - 8) * TEGEL, b: 4 * TEGEL, h: 5 * TEGEL }
    };
  }

  /* V3 — DE FACTURATIE: drie niveaus boven elkaar, verbonden met ladders.
     De verdieping waar je leven ooit in blokjes van 6 werd geknipt. */
  function bouwFacturatie() {
    const B = 120, H = 22;
    const type = new Uint8Array(B * H);
    const hp = new Uint8Array(B * H);
    const zet = (x, y, t) => { if (x >= 0 && y >= 0 && x < B && y < H) { type[y * B + x] = t; hp[y * B + x] = TEGEL_HP[t]; } };
    const vul = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) zet(x, y, t); };

    vul(0, 0, B - 1, 0, T.BETON); vul(0, H - 1, B - 1, H - 1, T.BETON); vul(0, H - 2, B - 1, H - 2, T.BETON);
    vul(0, 0, 1, H - 1, T.BETON); vul(B - 2, 0, B - 1, H - 1, T.BETON);

    /* dek 1 (rij 14) en dek 2 (rij 9): hele werkvloeren boven elkaar */
    vul(8, 14, 50, 14, T.BETON); vul(58, 14, 112, 14, T.BETON);
    vul(20, 9, 44, 9, T.BETON); vul(68, 9, 100, 9, T.BETON);
    /* ladders (steeds één tegel naast de dekrand, twee tegels overschot) */
    for (const [lx, y0, y1] of [[7, 12, 19], [51, 12, 19], [74, 12, 19], [19, 7, 13], [67, 7, 13], [101, 7, 13]]) {
      for (let ly = y0; ly <= y1; ly++) zet(lx, ly, T.LADDER);
    }

    /* de factuurpersen: machines op elke laag, kasten vol dossiers */
    for (const [mx, my] of [[14, H - 3], [40, H - 3], [90, H - 3], [26, 13], [64, 13], [96, 13], [30, 8], [80, 8]]) zet(mx, my, T.MACHINE);
    for (const [kx0, kx1, ky] of [[18, 26, H - 3], [60, 68, H - 3], [34, 40, 13], [84, 92, 13], [24, 30, 8], [74, 78, 8]]) {
      for (let x = kx0; x <= kx1; x += 2) zet(x, ky, T.KAST);
    }
    for (const [ex, ey] of [[12, H - 3], [55, H - 3], [79, H - 3], [42, 13], [88, 13], [36, 8]]) zet(ex, ey, T.METER);
    for (const px of [30, 70, 105]) zet(px, H - 3, T.PLANT);
    zet(48, 13, T.PLANT); zet(92, 8, T.PLANT);
    for (const wx of [22, 52, 86]) zet(wx, H - 6, T.POSTER);
    zet(96, H - 3, T.POORT); zet(96, H - 4, T.POORT); zet(96, H - 5, T.POORT);

    return {
      naam: 'V3 — DE FACTURATIE',
      soort: 'verdieping',
      kols: B, rijen: H, type, hp,
      spelerStart: { x: 4 * TEGEL, y: (H - 5) * TEGEL },
      vijanden: [
        { soort: 'drone', x: 30 * TEGEL, y: 5 * TEGEL },
        { soort: 'drone', x: 86 * TEGEL, y: 4 * TEGEL },
        { soort: 'kopieerbot', x: 62 * TEGEL, y: (H - 5) * TEGEL },
        { soort: 'slang', x: 34 * TEGEL, y: 13 * TEGEL - 4 },
        { soort: 'slijm', x: 78 * TEGEL, y: 13 * TEGEL - 8 },
        { soort: 'kaart', x: 50 * TEGEL, y: 11 * TEGEL },
        { soort: 'torentje', x: 46 * TEGEL, y: (H - 4) * TEGEL + 1 },
        { soort: 'manager', x: 62 * TEGEL, y: (H - 6) * TEGEL }
      ],
      cocons: [{ x: 16 * TEGEL, y: (H - 5) * TEGEL }, { x: 76 * TEGEL, y: 14 * TEGEL - 24 }, { x: 88 * TEGEL, y: 9 * TEGEL - 24 }],
      pickups: [{ soort: 'over', x: 38 * TEGEL, y: 6 * TEGEL }, { soort: 'mail', x: 98 * TEGEL, y: 6 * TEGEL }, { soort: 'bonus', x: 26 * TEGEL, y: 12 * TEGEL }],
      lift: { x: 113 * TEGEL, y: (H - 8) * TEGEL, b: 4 * TEGEL, h: 5 * TEGEL }
    };
  }

  /* V3 — DE DIRECTIE-ETAGE: torentjes en shredderslangen, het tweede
     masker, en de archiefkast "VOORZIENING GETROFFEN" — de jeugddromen.
     Aan het einde stort het dak in (let it burn — vóór het paneel). */
  function bouwDirectie() {
    const B = 120, H = 22;
    const type = new Uint8Array(B * H);
    const hp = new Uint8Array(B * H);
    const zet = (x, y, t) => { if (x >= 0 && y >= 0 && x < B && y < H) { type[y * B + x] = t; hp[y * B + x] = TEGEL_HP[t]; } };
    const vul = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) zet(x, y, t); };

    vul(0, 0, B - 1, 0, T.BETON); vul(0, H - 1, B - 1, H - 1, T.BETON); vul(0, H - 2, B - 1, H - 2, T.BETON);
    vul(0, 0, 1, H - 1, T.BETON); vul(B - 2, 0, B - 1, H - 1, T.BETON);
    for (const kx of [40, 78]) { vul(kx, 1, kx, H - 3, T.BETON); vul(kx, H - 8, kx, H - 3, T.LUCHT); }

    /* ruime directiekamers: hoge gipswanden met glazen deuren */
    for (const wx of [20, 56, 96]) { vul(wx, 3, wx, H - 3, T.GIPS); vul(wx, H - 7, wx, H - 3, T.LUCHT); }
    vul(66, 4, 66, H - 6, T.GLAS);
    zet(96, H - 3, T.POORT); zet(96, H - 4, T.POORT); zet(96, H - 5, T.POORT);

    /* de trofeeënwand + kastenrijen van de metrologie */
    for (const [kx0, kx1] of [[6, 12], [26, 34], [46, 52], [84, 90], [102, 110]]) {
      for (let x = kx0; x <= kx1; x += 2) { zet(x, H - 3, T.KAST); zet(x, H - 4, T.KAST); }
    }
    vul(24, 11, 32, 11, T.HOUT); vul(48, 9, 54, 9, T.HOUT); vul(70, 12, 76, 12, T.HOUT); vul(100, 10, 106, 10, T.HOUT);
    for (const [lx, y0, y1] of [[23, 9, 19], [55, 7, 19], [77, 10, 19], [99, 8, 19]]) {
      for (let ly = y0; ly <= y1; ly++) zet(lx, ly, T.LADDER);
    }
    zet(28, 10, T.MACHINE); zet(51, 8, T.MACHINE); zet(73, 11, T.MACHINE);
    for (const [ex, ey] of [[14, H - 3], [36, H - 3], [53, 8], [68, H - 3], [93, H - 3], [108, H - 3]]) zet(ex, ey, T.METER);
    for (const wx of [23, 59, 99]) zet(wx, 5, T.POSTER);
    for (const px2 of [11, 33, 55, 103]) zet(px2, H - 3, T.PLANT);
    zet(26, 10, T.PLANT); zet(74, 11, T.PLANT);   /* zelfs op de platforms staat er groen */

    return {
      naam: 'V4 — DE DIRECTIE-ETAGE',
      soort: 'verdieping',
      dakval: true,
      kols: B, rijen: H, type, hp,
      spelerStart: { x: 4 * TEGEL, y: (H - 5) * TEGEL },
      vijanden: [
        { soort: 'torentje', x: 30 * TEGEL, y: (H - 4) * TEGEL + 1 },
        { soort: 'torentje', x: 63 * TEGEL, y: (H - 4) * TEGEL + 1 },
        { soort: 'torentje', x: 100 * TEGEL, y: (H - 4) * TEGEL + 1 },
        { soort: 'slang', x: 44 * TEGEL, y: (H - 3) * TEGEL + 2 },
        { soort: 'slang', x: 81 * TEGEL, y: (H - 3) * TEGEL + 2 },
        { soort: 'drone', x: 50 * TEGEL, y: 6 * TEGEL },
        { soort: 'drone', x: 90 * TEGEL, y: 5 * TEGEL },
        { soort: 'kaart', x: 27 * TEGEL, y: 9 * TEGEL },
        { soort: 'kaart', x: 72 * TEGEL, y: 8 * TEGEL }
      ],
      cocons: [{ x: 16 * TEGEL, y: (H - 5) * TEGEL }, { x: 58 * TEGEL, y: (H - 5) * TEGEL }, { x: 82 * TEGEL, y: (H - 5) * TEGEL }],
      cellen: [{ x: 37 * TEGEL, y: (H - 5) * TEGEL }],
      droomkast: { x: 61 * TEGEL, y: (H - 5) * TEGEL },
      pickups: [{ soort: 'koffie', x: 51 * TEGEL, y: 6 * TEGEL }, { soort: 'over', x: 73 * TEGEL, y: 9 * TEGEL }],
      lift: { x: 113 * TEGEL, y: (H - 8) * TEGEL, b: 4 * TEGEL, h: 5 * TEGEL }
    };
  }

  /* HET PENTHOUSE — open lucht op het dak. Het gebouw brandt onder je,
     B.A.A.S. staat er zichtbaar kapot maar levend te zoemen, en hier
     verander je de settings. Daarna: het valscherm. */
  function bouwPenthouse() {
    const B = 56, H = 22;
    const type = new Uint8Array(B * H);
    const hp = new Uint8Array(B * H);
    const zet = (x, y, t) => { if (x >= 0 && y >= 0 && x < B && y < H) { type[y * B + x] = t; hp[y * B + x] = TEGEL_HP[t]; } };
    const vul = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) zet(x, y, t); };

    vul(0, H - 2, B - 1, H - 1, T.BETON);          /* het dak zelf */
    vul(0, H - 5, 1, H - 3, T.BETON);              /* borstwering links en rechts */
    vul(B - 2, H - 5, B - 1, H - 3, T.BETON);
    /* dakmeubilair: airco's, planten, een meterkast, een klein techniekplatform */
    zet(8, H - 3, T.MACHINE); zet(13, H - 3, T.MACHINE); zet(24, H - 3, T.METER);
    for (const px of [10, 21, 27]) zet(px, H - 3, T.PLANT);
    vul(16, H - 7, 21, H - 7, T.HOUT);
    for (let ly = H - 6; ly <= H - 3; ly++) zet(15, ly, T.LADDER);
    zet(15, H - 7, T.LADDER);
    zet(18, H - 8, T.PLANT);

    /* B.A.A.S., gehavend maar zoemend, tegen de avondlucht */
    vul(34, 9, 47, H - 3, T.BETON);

    return {
      naam: 'HET PENTHOUSE',
      soort: 'dak',
      kols: B, rijen: H, type, hp,
      spelerStart: { x: 4 * TEGEL, y: (H - 5) * TEGEL },
      vijanden: [], cocons: [], lift: null,
      baas: { x: 34 * TEGEL, y: 9 * TEGEL, b: 14 * TEGEL, h: 10 * TEGEL },
      luik: { x: 32 * TEGEL - 10, y: (H - 5) * TEGEL + 4, b: 10, h: 20 },
      plassen: [{ x: 3 * TEGEL, b: 30 }, { x: 11 * TEGEL, b: 24 }, { x: 22 * TEGEL, b: 40 }, { x: 49 * TEGEL, b: 28 }]
    };
  }

  /* de keten: Archief → Kantoortuin → Directie → Serverhal */
  const VERDIEPINGEN = [bouwTestVerdieping, bouwKantoortuin, bouwFacturatie, bouwDirectie, bouwPenthouse];

  function maakVijand(v) {
    const e = { soort: v.soort, x: v.x, y: v.y, x0: v.x, y0: v.y, t: Math.random() * 6, klok: 1 + Math.random(), dood: false, vx: 0, vy: 0, opGrond: false, loopT: 0 };
    if (v.soort === 'drone') e.hp = 2;
    else if (v.soort === 'kopieerbot') { e.hp = 3; e.b = 9; e.h = 9; e.spawnKlok = 2.2; e.kids = 0; }
    else if (v.soort === 'kopie') { e.hp = 1; e.b = 9; e.h = 9; e.ouder = v.ouder || null; }
    else if (v.soort === 'torentje') e.hp = 3;
    else if (v.soort === 'slang') { e.hp = 2; e.richting = 1; }
    else if (v.soort === 'slijm') { e.hp = 2; e.b = 9; e.h = 6; }
    else if (v.soort === 'kaart') { e.hp = 1; }
    else if (v.soort === 'manager') { e.hp = 14; e.hpMax = 14; e.b = 12; e.h = 15; e.klok = 1.4; }
    return e;
  }

  /* ============================================================
     DE SERVERHAL — het gevecht dat geen gevecht is. B.A.A.S. staat
     kamervullend en ongeschonden tussen het puin; elke treffer telt
     zichtbaar OP bij AANDEELHOUDERSWAARDE: ∞ (de tutorial-les, nu
     gevoeld). Wie zélf stopt met slaan, krijgt het onderhoudspaneel.
     ============================================================ */
  function bouwServerhal() {
    const B = 46, H = 22;
    const type = new Uint8Array(B * H);
    const hp = new Uint8Array(B * H);
    const zet = (x, y, t) => {
      if (x < 0 || y < 0 || x >= B || y >= H) return;
      type[y * B + x] = t; hp[y * B + x] = TEGEL_HP[t];
    };
    const vul = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) zet(x, y, t); };

    vul(0, 0, B - 1, 0, T.BETON);
    vul(0, H - 1, B - 1, H - 1, T.BETON);
    vul(0, H - 2, B - 1, H - 2, T.BETON);
    vul(0, 0, 1, H - 1, T.BETON);
    vul(B - 2, 0, B - 1, H - 1, T.BETON);

    /* puin van de sloop hierboven: nog wat sloopbaars voor wie wil */
    for (const px of [6, 7, 11, 15, 16, 21, 24]) zet(px, H - 3, T.MEUBEL);
    zet(11, H - 4, T.KAST); zet(16, H - 4, T.KAST);
    for (const px2 of [9, 19, 26]) zet(px2, H - 3, T.PLANT);   /* de serverhal-planten: iemand gaf ze water */

    /* de voetafdruk van B.A.A.S. is beton: kamervullend, onverwoestbaar */
    vul(29, 9, 42, H - 3, T.BETON);

    return {
      naam: 'DE SERVERHAL',
      soort: 'hal',
      kols: B, rijen: H, type, hp,
      spelerStart: { x: 4 * TEGEL, y: (H - 5) * TEGEL },
      drones: [], cocons: [], lift: null,
      baas: { x: 29 * TEGEL, y: 9 * TEGEL, b: 14 * TEGEL, h: 10 * TEGEL },
      luik: { x: 27 * TEGEL - 10, y: (H - 5) * TEGEL + 4, b: 10, h: 20 }
    };
  }

  /* B.A.A.S. zelf: in code gebakken mainframe (2 frames — draaiende
     tape-reels, verschuivende lampjes, en op de CRT: een glimlach). */
  function bakBaas(kapot) {
    const frames = [];
    for (let f = 0; f < 2; f++) {
      const c = document.createElement('canvas');
      c.width = 112; c.height = 80;
      const x = c.getContext('2d');
      x.fillStyle = '#20262b'; x.fillRect(0, 0, 112, 80);
      for (let k = 0; k < 4; k++) { x.fillStyle = '#2c343b'; x.fillRect(k * 28 + 1, 2, 26, 74); }
      x.fillStyle = '#12161a';
      for (let k = 0; k <= 4; k++) x.fillRect(Math.min(k * 28, 110), 0, 2, 80);
      /* tape-reels op kast 1: donkere schijf, witte ring, draaiende spaken */
      for (const cx of [14, 42]) {
        x.fillStyle = '#0e1114'; x.beginPath(); x.arc(cx, 18, 9, 0, 7); x.fill();
        x.strokeStyle = '#cfc0a0'; x.lineWidth = 1.6;
        x.beginPath(); x.arc(cx, 18, 8, 0, 7); x.stroke();
        x.beginPath();
        if (f === 0) { x.moveTo(cx - 7, 18); x.lineTo(cx + 7, 18); x.moveTo(cx, 11); x.lineTo(cx, 25); }
        else { x.moveTo(cx - 5, 13); x.lineTo(cx + 5, 23); x.moveTo(cx + 5, 13); x.lineTo(cx - 5, 23); }
        x.stroke();
      }
      /* lampjesgrid op kast 1-2 onder de reels */
      for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) {
        const w = (r * 7 + i * 3 + f * 2) % 6;
        x.fillStyle = w < (kapot ? 1 : 2) ? '#79c045' : w === 2 && !kapot ? '#ffb347' : '#171d21';
        x.fillRect(6 + i * 8, 34 + r * 8, 4, 4);
      }
      /* de CRT: amber glimlach — het Glimlachquotum, thuisgekomen */
      x.fillStyle = '#0d1206'; x.fillRect(62, 12, 44, 30);
      x.fillStyle = '#ffb347';
      x.fillRect(74, 20, 3, 4); x.fillRect(91, 20, 3, 4);
      x.fillRect(75, 30, 18, 2); x.fillRect(73, 28, 3, 2); x.fillRect(92, 28, 3, 2);
      x.fillStyle = 'rgba(255,179,71,0.10)'; x.fillRect(62, 12 + (f ? 8 : 2), 44, 3);
      /* ventilatie + kabels onderaan */
      x.fillStyle = '#0e1114';
      for (let vy = 58; vy < 76; vy += 4) x.fillRect(62, vy, 44, 2);
      for (let vx = 6; vx < 56; vx += 7) x.fillRect(vx, 70, 3, 10);
      if (kapot) {
        /* zichtbaar kapot maar levend: scheuren, roet, een deuk, halve glimlach */
        x.fillStyle = '#0a0c0e';
        x.fillRect(18, 30, 2, 26); x.fillRect(20, 42, 8, 2); x.fillRect(46, 8, 2, 34); x.fillRect(40, 24, 8, 2);
        x.fillRect(8, 6, 14, 10);   /* de deuk */
        x.fillStyle = 'rgba(10,8,6,0.5)';
        x.fillRect(4, 2, 30, 5); x.fillRect(60, 46, 46, 6);
        x.fillStyle = '#0d1206'; x.fillRect(84, 26, 12, 8);   /* halve mond weg */
        if (f === 1) { x.fillStyle = 'rgba(13,18,6,0.75)'; x.fillRect(62, 12, 44, 30); }   /* CRT hapert */
      }
      frames.push(c);
    }
    return frames;
  }

  /* B.A.A.S.'s droge dank per salvo — het geweld wordt beleefd geboekt */
  const BAAS_REGELS_KAPOT = [
    '"DANK VOOR UW INZ-ZZT."',
    '"UW ENGAGEMENT IS GENOT-"',
    '"MOOI. NOG E-E-EENS."',
    '"DIT TELT ALS OVERW- (STORING)"'
  ];
  const BAAS_REGELS = [
    '"DANK VOOR UW INZET."',
    '"UW ENGAGEMENT IS GENOTEERD."',
    '"DIT TELT ALS OVERWERK. (0U06)"',
    '"MOOI. NOG EENS."'
  ];

  /* een treffer op B.A.A.S.: ∞ beweegt niet, de teller wél omhoog */
  function raakBaasPunt(px, py) {
    if (!hal || !lvl.baas || staat !== 'spel') return false;
    const b = lvl.baas;
    if (px < b.x - 8 || px > b.x + b.b + 8 || py < b.y - 8 || py > b.y + b.h + 8) return false;
    hal.baasHits++; hal.laatsteHit = tijd; hal.flitsT = 0.1;
    popup(b.x + 12 + Math.random() * (b.b - 24), b.y + 6 + Math.random() * 24, '+6', '#ffd23f');
    sfx('schitter', 0.12);
    if (hal.baasHits % 4 === 0) {
      const pool = hal.kapot ? BAAS_REGELS_KAPOT : BAAS_REGELS;
      hal.regel = pool[((hal.baasHits / 4 - 1) | 0) % pool.length];
      hal.regelT = 2.6;
    }
    return true;
  }

  /* alle level-gebonden entiteiten (her)laden — gedeeld door start en wissel */
  function laadLevelEntiteiten() {
    drones = (lvl.vijanden || []).map(maakVijand);
    cocons = (lvl.cocons || []).map(c => ({ x: c.x, y: c.y, open: false }));
    cellen = (lvl.cellen || []).map(c => ({ x: c.x, y: c.y, open: false }));
    droomkast = lvl.droomkast ? { x: lvl.droomkast.x, y: lvl.droomkast.y, open: false } : null;
    pickups = (lvl.pickups || []).map(p => ({ x: p.x, y: p.y, soort: p.soort, op: false }));
    kogels = []; partikels = []; popups = []; popupWachtrij = 0; worp = null; gifbal = null; harten = [];
    sloopKetting = 0; kettingT = 0; kettingPiek = 0;
    bomWachtrij = []; stortWachtrij = []; dakval = null; papierWachtrij = 0; signKlok = 0;
    glasWachtrij = []; wrakken = []; motes = []; cine = null;
    post = []; stempel = null; mijlpaal = null; impactTot = -9; hitstop = 0; stopDoel = null; verbleek = 0; verbleekTot = 0;
    hal = (lvl.soort === 'hal' || lvl.soort === 'dak')
      ? { t: 0, baasHits: 0, laatsteHit: -99, regel: null, regelT: 0, flitsT: 0, paneel: false, spawnKlok: 2.5, kapot: lvl.soort === 'dak', frames: bakBaas(lvl.soort === 'dak') }
      : null;
  }

  /* levelwissel: de stoet bevrijde collega's reist mee naar de volgende laag */
  function wisselLevel(idx) {
    const stoet = collegas.length;
    lvlIdx = idx;
    lvl = VERDIEPINGEN[idx]();
    bakLevel();
    held.x = lvl.spelerStart.x; held.y = lvl.spelerStart.y;
    held.vx = held.vy = 0; held.hartjes = 3; held.raakbaar = 1; held.wachtT = 0;
    laadLevelEntiteiten();
    collegas = [];
    /* spawn-x klemmen: zonder klem belandt collega 2+ ín/achter de linker betonmuur
       (tegels 0-1) en jaagt de AABB-snap hem het level uit tot de bijtrek-teleport */
    for (let i = 0; i < stoet; i++) collegas.push({ x: Math.max(2 * TEGEL + 1, held.x - 12 * (i + 1)), y: held.y + 3, vx: 0, vy: 0, b: 7, h: 11, opGrond: false, loopT: 0, licht: 1 });
    camX = klem(held.x - BREED / 2, 0, lvl.kols * TEGEL - BREED);
  }

  /* de bindteksten: het besef, verdieping per verdieping erin gehamerd */
  const BINDREGELS = {
    1: 'SOMS IS GEWELD GEWOON DE OPLOSSING.',
    2: 'ELK BLOKJE VAN 6 WAS ER EENTJE VAN ONS.',
    3: 'DE ENKELEN WONEN HOOG. NU NIET MEER LANG.',
    4: 'ZONDER ONS - DE VELEN - ZIJN ZE NIETS.'
  };
  function startWissel(doel) {
    staat = 'wissel'; wisselT = 0; wisselGebouwd = false; wisselDicht = false; wisselAan = false; wisselDoel = doel; wisselVan = lvlIdx;
    sfx('win', 0.5);
  }
  function startConfig() {
    staat = 'config'; configStap = 0; configT = 0;
    /* stijlbreuk-UIT: het laatste wereldbeeld bevriezen en inzoomen op één
       amberkleurige pixel van de service-CRT — tot die de terminal wórdt */
    zoomFoto = document.createElement('canvas');
    zoomFoto.width = BREED; zoomFoto.height = HOOG;
    zoomFoto.getContext('2d').drawImage(canvas, 0, 0);
    zoomPunt = { x: klem(lvl.luik.x + 5 - Math.round(camX), 8, BREED - 8), y: klem(lvl.luik.y + 10 - Math.round(camY), 8, HOOG - 8) };
    sigStart = -1;
    /* bij het paneel loopt alle kleur weg — alleen het ene amber pixel blijft */
    try {
      const zx = zoomFoto.getContext('2d');
      const bewaar = zx.getImageData(zoomPunt.x - 3, zoomPunt.y - 3, 7, 7);
      zx.globalCompositeOperation = 'saturation'; zx.globalAlpha = 0.9; zx.fillStyle = '#808080'; zx.fillRect(0, 0, BREED, HOOG);
      zx.globalCompositeOperation = 'source-over'; zx.globalAlpha = 1;
      zx.putImageData(bewaar, zoomPunt.x - 3, zoomPunt.y - 3);
      zx.fillStyle = '#ffb347'; zx.fillRect(zoomPunt.x, zoomPunt.y, 1, 1);
    } catch (e) { /* zonder getImageData: de zoom werkt gewoon in kleur */ }
    drones = []; kogels = []; popups = []; partikels = []; hudTekst = null;
    if (window.Klank && Klank.muziek) { try { Klank.muziek('stil'); } catch (e) {} }
    sfx('blok', 0.2);
  }
  function configVolgende() {
    if (configStap >= 8) return;
    if (configStap === 0 && configT < 1) return;   /* de zoom eerst laten landen */
    configStap++; configT = 0;
    sfx(configStap === 8 ? 'energie' : 'blok', 0.05);
  }

  /* Drops-vlaggen, defensief gelezen (de outro moet ook zonder run draaien) */
  function dropsWitActief() {
    try { if (typeof isOntgrendeld === 'function' && isOntgrendeld('drops_wit')) return true; } catch (e) {}
    return !!(typeof Codex !== 'undefined' && Codex && Array.isArray(Codex.metgezellen) && Codex.metgezellen.includes('drops_wit'));
  }
  function dropsGevallen() {
    return !!(typeof Codex !== 'undefined' && Codex && Array.isArray(Codex.gevallen) && Codex.gevallen.includes('drops'));
  }

  /* de overdracht uit de proloog: sleutel 'slayit_proloog' =
     { jeugddroom: string, uitweg: 'sprong'|'geduwd' } — alles optioneel */
  function leesProloog() {
    try { return JSON.parse(localStorage.getItem('slayit_proloog') || 'null') || {}; }
    catch (e) { return {}; }
  }

  /* DE SPRONG — de val uit de proloog, nu vrijwillig. En zacht. */
  function startVal() {
    staat = 'val'; valT = 0; valPuin = []; valStap = -1; partikels = [];
    if (window.Klank && Klank.muziek) { try { Klank.muziek('outro_slot'); } catch (e) {} }
    sfx('win', 0.5);
  }
  /* ---------- DE VAL: door de rookdeken de dageraad in ----------
     Geen schud, geen impactframes: dit is ademen. De lucht loopt door vijf
     sleutels (nacht → rook → roze → goud → dag), de zon staat laag achter de
     held, de valschermen gloeien in tegenlicht, en het gebouw sterft etage
     per etage terwijl het licht naar de mensen verhuist. */
  const VAL_TOP = [[0, '#07060e'], [1.1, '#141018'], [3, '#3a2a5a'], [6, '#4a4a8a'], [11, '#4a86c8']];
  const VAL_ONDER = [[0, '#1a1024'], [1.1, '#3a2420'], [3, '#e8707a'], [6, '#ffa860'], [11, '#ffe0a8']];
  function valSleutel(keys, t) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) return mengKleur(keys[i - 1][1], keys[i][1], (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
    return keys[keys.length - 1][1];
  }
  let valPuin = [], valStap = -1;
  function renderVal() {
    const chute = valT > 1.1;
    const scroll = (valT < 1.1 ? valT * 240 : 264 + (valT - 1.1) * 55);
    /* 1. de lucht in harde banden: 4 in de nacht, 6 in de dag */
    const top = valSleutel(VAL_TOP, valT), onder = valSleutel(VAL_ONDER, valT);
    const nb = valT < 3 ? 4 : 6, bh = Math.ceil(HOOG / nb);
    for (let i = 0; i < nb; i++) { ctx.fillStyle = mengKleur(top, onder, i / (nb - 1)); ctx.fillRect(0, i * bh, BREED, bh); }
    /* 2. de zon, laag achter de held, met godrays die door de wolkgaten vallen */
    const zonY = valT < 1.1 ? 200 : 170 - klem((valT - 1.1) / 9.9, 0, 1) * 110, zonX = 250;
    if (zonY < 190) {
      if (!liteModus) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,236,200,' + (0.035 * klem((valT - 1.3) * 0.8, 0, 1)).toFixed(3) + ')';
        const draai = Math.sin(valT * 0.2) * 0.05;
        for (let k = 0; k < 12; k++) {
          const a = -Math.PI / 2 + (k - 5.5) * 0.22 + draai, b = 0.05 + (k % 3) * 0.02;
          ctx.beginPath(); ctx.moveTo(zonX, zonY);
          ctx.lineTo(zonX + Math.cos(a - b) * 340, zonY + Math.sin(a - b) * 340);
          ctx.lineTo(zonX + Math.cos(a + b) * 340, zonY + Math.sin(a + b) * 340);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
      ctx.fillStyle = '#fff4d6';
      for (let dy = -9; dy <= 9; dy++) { const w = Math.round(Math.sqrt(81 - dy * dy)); ctx.fillRect(zonX - w, Math.round(zonY) + dy, w * 2, 1); }
      if (fx) { fx.gloed(ctx, zonX, zonY, 40, '#ffd890', 0.5); fx.gloed(ctx, zonX, zonY, 16, '#fff4d6', 0.6); }
    }
    /* 3. wolken: storm tijdens de rook, dageraad erna — ze stijgen mee op (wij vallen) */
    if (fx) {
      if (valT < 3) { ctx.globalAlpha = klem(1 - (valT - 1.5) / 1.5, 0, 1); fx.tekenWolken(ctx, valT * 3, 0, -scroll * 0.25); ctx.globalAlpha = 1; }
      if (valT > 1.3) {
        ctx.globalAlpha = klem((valT - 1.3) / 1.4, 0, 1);
        fx.tekenDagWolken(ctx, valT, 0, 150 - (scroll - 264) * 0.35, 100 - (scroll - 264) * 0.6);
        ctx.globalAlpha = 1;
      }
    }
    /* 4. de gevel van je eigen gebouw schuift omhoog; vanaf 5 s zakt hij etage
       per etage in elkaar (pannenkoek): stofring, ramen flitsen wit en doven */
    let instort = -30;
    if (valT > 5) {
      const n = (valT - 5) / 0.45, k = Math.floor(n), f = n - k;
      instort = Math.min(170, (k + easeUit(Math.min(1, f / 0.4))) * 24);
      if (k !== valStap) {
        valStap = k;
        if (instort < 170) {
          sfx('dreun', 0.2);
          for (let i = 0; i < (liteModus ? 6 : 12); i++) duwPartikel({ soort: 'stof', x: 20 + Math.random() * 120, y: instort + 2, vx: (Math.random() - 0.5) * 140, vy: 0, r0: 3, t: 0.9 + Math.random() * 0.5, maxT: 1.4 });
        }
      }
    }
    const torenTop = Math.max(0, instort);
    ctx.fillStyle = '#100d0a'; ctx.fillRect(20, torenTop, 120, HOOG - torenTop);
    ctx.fillStyle = '#1c1712'; ctx.fillRect(20, torenTop, 4, HOOG - torenTop); ctx.fillRect(136, torenTop, 4, HOOG - torenTop);
    /* de zonkant van de toren vangt randlicht */
    ctx.fillStyle = mengKleur('#2a2018', '#ffd89a', klem((valT - 2) / 6, 0, 0.6)); ctx.fillRect(139, torenTop, 1, HOOG - torenTop);
    const golf = valT > 2.4 ? (valT - 2.4) * 46 : -30;
    for (let ry = -24; ry < HOOG + 24; ry += 24) {
      const wy = ry + (scroll % 24);
      for (let wx = 32; wx < 130; wx += 18) {
        if (wy < instort) continue;
        const zaad = (wx * 13 + Math.floor((ry - scroll) / 24) * 7) % 10;
        if (wy < golf) {
          /* boven de herstelgolf: warm licht in de ramen, groen dat uitloopt */
          ctx.fillStyle = '#2a2118'; ctx.fillRect(wx, wy, 8, 10);
          ctx.fillStyle = '#ffb347'; ctx.fillRect(wx + 2, wy + 2, 4, 6);
          if (zaad < 4) { ctx.fillStyle = '#79c045'; ctx.fillRect(wx - 2, wy + 4, 2, 6); ctx.fillRect(wx + 8, wy, 2, 7); }
          if (zaad === 4) { ctx.fillStyle = '#ff9c3f'; ctx.fillRect(wx + 9, wy + 2, 2, 2); }
        } else if (zaad < 3) {
          /* vuurramen: flakkeren, en doven met één witte flits als hun etage valt */
          const dooft = valT > 5 && wy < instort + 26;
          if (dooft && ((valT * 20) | 0) % 3 === 0) { ctx.fillStyle = '#fff4d6'; ctx.fillRect(wx, wy, 8, 10); }
          else {
            ctx.fillStyle = ((valT * 9 + wx) | 0) % 3 ? '#ff7a2f' : '#ff5a3c'; ctx.fillRect(wx, wy, 8, 10);
            ctx.fillStyle = '#ffd23f'; ctx.fillRect(wx + 2, wy + 3, 4, 4);
          }
        }
        else if (zaad < 5) { ctx.fillStyle = '#0a0806'; ctx.fillRect(wx, wy, 8, 10); }
        else { ctx.fillStyle = '#2a2118'; ctx.fillRect(wx, wy, 8, 10); }
      }
    }
    if (fx) for (let ry = -24; ry < HOOG + 24; ry += 48) { const wy = ry + (scroll % 24); if (wy > golf && wy > instort) fx.gloed(ctx, 80, wy + 5, 36, '#ff6a2a', 0.18); }
    /* groene vonkjes op de golflijn */
    if (golf > 0 && golf < HOOG && valT < 5) {
      ctx.fillStyle = '#9fe06a';
      for (let i = 0; i < 6; i++) ctx.fillRect(24 + ((i * 53 + (valT * 90 | 0)) % 112), golf + Math.sin(valT * 8 + i) * 3, 2, 2);
    }
    /* de stofpluim van de instorting: gebakken rookbollen, heet onder, koud boven,
       met het vuur dat erin smoort */
    if (valT > 5 && instort < 170 && fx) {
      for (let i = 0; i < 9; i++) {
        const x = 24 + ((i * 41 + (valT * 50 | 0)) % 112), y = instort - 6 + Math.sin(valT * 5 + i) * 5 - (i % 3) * 6;
        const c = fx.rookBol(8 + (i % 4) * 2, i % 3 === 0 ? 'heet' : (i % 3 === 1 ? 'warm' : 'koud'));
        ctx.globalAlpha = 0.85; ctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height / 2)); ctx.globalAlpha = 1;
        if (i % 3 === 0 && !liteModus) fx.gloed(ctx, x, y + 4, 14, '#ff6a2a', 0.3 + 0.15 * Math.sin(valT * 13 + i));
      }
    }
    /* de puinhoop groeit onderaan mee */
    if (valT > 5.4) {
      const ph = Math.min(34, (valT - 5.4) * 12);
      for (let px3 = 20; px3 < 140; px3 += 4) {
        const afst3 = Math.abs(px3 - 80);
        const hgt3 = Math.max(0, ph - afst3 * 0.4 + ((px3 * 13) % 3) * 2);
        ctx.fillStyle = (px3 * 7) % 5 ? '#171310' : '#3a352a';
        ctx.fillRect(px3, HOOG - hgt3, 4, hgt3);
      }
    }
    /* en dan, uit het puin: groei */
    if (valT > 8.6) {
      const rank = Math.min(56, (valT - 8.6) * 20);
      ctx.fillStyle = '#4c7f2a';
      for (let gy = 0; gy < rank; gy += 3) {
        ctx.fillRect(78 + Math.sin(gy * 0.14) * 5, HOOG - 30 - gy, 3, 3);
        if (gy % 9 === 0) { ctx.fillStyle = '#79c045'; ctx.fillRect(83 + Math.sin(gy * 0.14) * 5, HOOG - 30 - gy, 3, 2); ctx.fillStyle = '#4c7f2a'; }
      }
      if (rank > 30) { ctx.fillStyle = '#ff9c3f'; ctx.fillRect(77 + Math.sin(rank * 0.14) * 5, HOOG - 32 - rank, 4, 4); }
      ctx.fillStyle = '#9fe06a';
      for (let i = 0; i < 5; i++) ctx.fillRect(60 + ((i * 37 + (valT * 40 | 0)) % 60), HOOG - 34 - ((valT * 26 + i * 17) % rank || 0), 2, 2);
    }
    /* stof van de instorting (partikels leven hier ook) */
    for (const p of partikels) {
      p.t -= renderDt; if (p.soort !== 'stof' || !fx) continue;
      p.x += p.vx * renderDt; p.vx *= (1 - 1.8 * renderDt);
      const a = klem(p.t / p.maxT, 0, 1), c = fx.rookBol(p.r0 + (1 - a) * 7, 'koud');
      ctx.globalAlpha = a * 0.7; ctx.drawImage(c, Math.round(p.x - c.width / 2), Math.round(p.y - c.height / 2)); ctx.globalAlpha = 1;
    }
    partikels = partikels.filter(p => p.t > 0);
    /* 5. de rookdeken: even bijna zwart, alleen de vlammen — dan breek je erdoor */
    if (valT > 0.25 && valT < 1.6 && fx) {
      const dy = valT < 1.1 ? 0 : -(valT - 1.1) * 1.4 * 240;
      for (let i = 0; i < (liteModus ? 14 : 28); i++) {
        const x = (i * 23) % (BREED + 20) - 10, y = 30 + ((i * 37) % 120) + dy + Math.sin(valT * 3 + i) * 4;
        const c = fx.rookBol(14, i % 5 === 0 ? 'warm' : 'koud');
        ctx.drawImage(c, Math.round(x - 14), Math.round(y - 14));
        if (i % 5 === 0) fx.gloed(ctx, x, y + 6, 18, '#ff6a2a', 0.35);
      }
    }
    /* 6. DE VELEN springen mee, elk aan een eigen valscherm — in tegenlicht */
    if (chute && collegas.length && valT < 11.6) {
      const velen = Math.min(collegas.length, 14);
      const CHUTE_KL = ['#5fd0d8', '#79c045', '#ffd23f', '#e0836a', '#a86fe0'];
      const stap3 = 182 / velen;
      for (let i = 0; i < velen; i++) {
        const fase = i * 1.3;
        const cx3 = 18 + (i + 0.5) * stap3 + Math.sin(valT * 1.4 + fase) * 5;
        const cy3 = 50 + ((i * 3) % 5) * 15 + Math.sin(valT * 2 + fase) * 3;
        tekenValscherm(cx3 + 3, cy3 - 13, 12, CHUTE_KL[i % CHUTE_KL.length], zonX, cx3, cy3);
        const spr = ((valT * 3 + i) % 1) < 0.5 ? 'collega1' : 'collega2';
        if (Math.abs(cx3 - zonX) < 70 && !liteModus) tekenSprite(spr + '#g', Math.round(cx3), Math.round(cy3), false);
        tekenSprite(spr, cx3 - 1, cy3, false);
      }
    }
    /* 7. de held: eerst tuimelend (in kwartslagen), dan rustig onder het scherm */
    const hx2 = 210 + Math.sin(valT * 1.6) * (chute ? 8 : 2);
    const hy2 = chute ? 74 + Math.sin(valT * 2.2) * 3 : 40 + valT * 30;
    if (chute) tekenValscherm(hx2 + 4, hy2 - 16, 16, '#ffb347', zonX, hx2 + 1, hy2 + 2);
    const naam = 'held_spring@' + maskers[maskerIdx];
    const spr = gebakken[naam];
    if (spr) {
      if (!chute) {
        const k = ((valT * 8) | 0) % 4;
        ctx.save(); ctx.translate(Math.round(hx2) + 4, Math.round(hy2) + 7); ctx.rotate(k * Math.PI / 2); ctx.drawImage(spr, -4, -7); ctx.restore();
      } else {
        if (!liteModus) tekenSprite(naam + '#g', Math.round(hx2) + 1, Math.round(hy2), false);
        tekenSprite(naam, hx2, hy2, false);
      }
      /* het kooltje op zijn borst gloeit door alles heen */
      ctx.fillStyle = '#ff9c3f'; ctx.fillRect(Math.round(hx2) + 3, Math.round(hy2) + 6, 2, 2);
      if (fx) fx.gloed(ctx, hx2 + 4, hy2 + 7, 5, '#ff9c3f', 0.6);
    }
    /* 8. voorgrondpuin: zwarte silhouetten die vlak langs de camera razen */
    if (valT > 5 && valT < 8.6 && Math.random() < (liteModus ? 0.02 : 0.045) * renderDt * 60 && valPuin.length < (liteModus ? 2 : 4)) {
      valPuin.push({ soort: (Math.random() * 4) | 0, x: 150 + Math.random() * 150, y: -40, vy: 250 + Math.random() * 60, rot: (Math.random() * 4) | 0 });
    }
    for (const b of valPuin) {
      b.y += b.vy * renderDt;
      for (const [off, a] of (liteModus ? [[0, 1]] : [[-24, 0.15], [-16, 0.3], [-8, 0.5], [0, 1]])) {
        ctx.globalAlpha = a; tekenValPuin(b, b.x, b.y + off); 
      }
      ctx.globalAlpha = 1;
    }
    valPuin = valPuin.filter(b => b.y < HOOG + 50);
    /* 9. de tekst, met een gedithered achterplaat in de luchtkleur */
    if (valT > 5.6 && valT < 8.4) {
      const r4 = 'ZONDER ONS: NIETS.';
      ctx.fillStyle = mengKleur(top, onder, 0.15); ctx.globalAlpha = 0.55;
      ctx.fillRect(BREED / 2 - tekstBreedte(r4, 2) / 2 - 6, 26, tekstBreedte(r4, 2) + 12, 22); ctx.globalAlpha = 1;
      tekst(ctx, r4, BREED / 2 - tekstBreedte(r4, 2) / 2, 30, '#efe9d6', 2);
    }
    if (valT > 9.2 && valT < 12) {
      const r3 = 'DE MACHINE MAAKT NU. KIJK.';
      tekst(ctx, r3, BREED / 2 - tekstBreedte(r3) / 2, 30, 'rgba(159,224,106,0.95)');
    }
    if (valT > 1.1 && valT < 3.4) {
      const r = 'DE VAL, MAAR DAN VRIJWILLIG. EN ZACHT.';
      tekst(ctx, r, BREED / 2 - tekstBreedte(r) / 2, 150, 'rgba(207,192,160,0.85)');
    }
    if (fx) { fx.grade(ctx, onder, 0.18); fx.vignet(ctx, 0.8); }
    /* uitfaden naar de epiloog */
    if (valT > 11.8) { ctx.fillStyle = 'rgba(8,6,4,' + klem((valT - 11.8) * 1.3, 0, 1).toFixed(2) + ')'; ctx.fillRect(0, 0, BREED, HOOG); }
  }
  /* een valscherm als pixelkoepel: panelen in twee tinten, een lichte rand
     aan de zonkant, en touwtjes als dunne lijnen — doorschijnend in tegenlicht */
  function tekenValscherm(cx, cy, r, kl, zonX, hx, hy) {
    const tegen = Math.abs(cx - zonX) < 70 && valT > 1.3;
    const lichtK = tegen ? mengKleur(kl, '#fff4d6', 0.35) : kl, donker = mengKleur(kl, '#1a1020', 0.35);
    const hh = Math.round(r * 0.6);
    for (let dy = -hh; dy <= 0; dy++) {
      const w = Math.round(r * Math.sqrt(Math.max(0, 1 - Math.pow(dy / hh, 2))));
      for (let dx = -w; dx < w; dx += 1) {
        const paneel = Math.floor((dx + r) / (r / 2.5)) % 2;
        ctx.fillStyle = dy === 0 ? donker : (paneel ? lichtK : donker);
        ctx.fillRect(Math.round(cx + dx), Math.round(cy + dy), 1, 1);
      }
    }
    /* de rand aan de zonkant */
    if (tegen) { ctx.fillStyle = '#fff4d6'; ctx.fillRect(Math.round(cx) + (zonX > cx ? r - 2 : -r), Math.round(cy - 2), 2, 2); }
    ctx.fillStyle = 'rgba(40,30,30,0.7)';
    const touw = (x0, y0, x1, y1) => { const st = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))); for (let q = 0; q <= st; q += 2) ctx.fillRect(Math.round(x0 + (x1 - x0) * q / st), Math.round(y0 + (y1 - y0) * q / st), 1, 1); };
    touw(cx - r + 1, cy, hx + 1, hy + 3); touw(cx + r - 1, cy, hx + 5, hy + 3);
    if (fx && tegen && !liteModus) fx.gloed(ctx, cx, cy - r * 0.3, r, '#fff4d6', 0.12);
  }
  /* het voorgrondpuin: bureau, kast, kopieerapparaat, een tl-bak — zwart, met
     een oranje randje van het vuur eronder */
  function tekenValPuin(b, x, y) {
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(b.rot * Math.PI / 2);
    const Z = '#07060a', L = '#1c1410';
    ctx.fillStyle = Z;
    if (b.soort === 0) {           /* het bureau: blad, twee poten, een ladeblok */
      ctx.fillRect(-14, -6, 28, 4); ctx.fillRect(-13, -2, 3, 10); ctx.fillRect(10, -2, 3, 10); ctx.fillRect(2, -2, 8, 6);
      ctx.fillStyle = L; ctx.fillRect(4, 0, 4, 1);
    } else if (b.soort === 1) {    /* de archiefkast: vier laden, vier grepen */
      ctx.fillRect(-8, -15, 16, 30);
      ctx.fillStyle = L; for (let k = -9; k < 15; k += 7) { ctx.fillRect(-7, k, 14, 1); ctx.fillRect(-2, k + 3, 4, 1); }
    } else if (b.soort === 2) {    /* het kopieerapparaat: kast, klep, papierlade */
      ctx.fillRect(-10, -6, 20, 14); ctx.fillRect(-11, -9, 22, 3); ctx.fillRect(10, 0, 5, 2);
      ctx.fillStyle = L; ctx.fillRect(-8, -3, 16, 1);
    } else {                       /* een tl-bak die nog één keer flikkert */
      ctx.fillRect(-16, -3, 32, 6);
      if (((valT * 13) | 0) % 5 === 0) { ctx.fillStyle = '#f4f8ff'; ctx.fillRect(-14, 0, 28, 1); }
    }
    ctx.restore();
    /* het oranje randje: het vuur onder je belicht de onderkant */
    const hh = b.rot % 2 ? [28, 30, 22, 32][b.soort] : [16, 30, 17, 6][b.soort], ww = b.rot % 2 ? [16, 30, 17, 6][b.soort] : [28, 16, 22, 32][b.soort];
    ctx.fillStyle = '#ff9c3f'; ctx.fillRect(Math.round(x - ww / 2) + 1, Math.round(y + hh / 2) - 1, ww - 2, 1);
  }


  function startEpiloog() {
    staat = 'epiloog';
    const dots = (links, rechts) => {
      let s = links + ' ';
      while (s.length + rechts.length + 1 < 28) s += '.';   /* 28 past de langste regel (4 VERDIEPINGEN … AFGESCHREVEN) */
      return s + ' ' + rechts;
    };
    epi = {
      t: 0, spoed: false, klaar: false,
      hond: dropsWitActief() ? 'wit' : (dropsGevallen() ? 'poot' : null),
      droom: ((typeof S !== 'undefined' && S && S.jeugddroom) || proloog.jeugddroom || null),
      n: collegas.length,
      regels: [
        'EINDAFREKENING - B.A.A.S.',
        '',
        dots('4 VERDIEPINGEN', 'AFGESCHREVEN'),
        dots(collegas.length + " COLLEGA'S", 'BEVRIJD'),
        dots('1 SCHAKELAAR', '0U06'),
        dots('ZONDER ONS', 'NIETS'),
        dots('TOTAAL', 'ONBETAALBAAR')
      ]
    };
    epi.totaalTekens = epi.regels.join('').length;
    partikels = []; popups = [];
    /* de jingle voor het eerst zuiver en in majeur — uit de frietkot-radio */
    if (window.Klank && Klank.muziek) { try { Klank.muziek('outro_slot'); } catch (e) {} }
  }

  const tegelOp = (tx, ty) => (tx < 0 || ty < 0 || tx >= lvl.kols || ty >= lvl.rijen) ? T.BETON : lvl.type[ty * lvl.kols + tx];
  const solide = t => t !== T.LUCHT && t !== T.LADDER;

  /* ---------- de tegel-kaart bakken + hertekenen (dirty per tegel) ---------- */
  /* de roetlagen voor verkoolde tegels: 25/50/75% Bayer-dither, één keer gebakken */
  const roetLagen = [];
  function roetLaag(n) {
    if (!roetLagen[n]) {
      const c = document.createElement('canvas'); c.width = TEGEL; c.height = TEGEL;
      const x = c.getContext('2d'); x.fillStyle = '#0b0907';
      for (let yy = 0; yy < TEGEL; yy++) for (let xx = 0; xx < TEGEL; xx++) if (BAYER4[(yy & 3) * 4 + (xx & 3)] < n * 4) x.fillRect(xx, yy, 1, 1);
      roetLagen[n] = c;
    }
    return roetLagen[n];
  }
  let tegelCanvas = null, tegelCtx = null, bgCanvas = null;
  function tekenTegel(tx, ty) {
    const t = tegelOp(tx, ty), px = tx * TEGEL, py = ty * TEGEL;
    const cx = tegelCtx;
    cx.clearRect(px, py, TEGEL, TEGEL);
    if (t === T.LUCHT) return;
    const spik = (tx * 7 + ty * 13) % 4;   /* deterministische spekkel per tegel */
    if (t === T.BETON) {
      cx.fillStyle = '#5b574a'; cx.fillRect(px, py, TEGEL, TEGEL);
      cx.fillStyle = '#4a463b'; cx.fillRect(px, py + TEGEL - 1, TEGEL, 1);
      cx.fillStyle = '#6a6455'; cx.fillRect(px + spik, py + 1, 2, 1);
    } else if (t === T.GIPS) {
      cx.fillStyle = '#cfc0a0'; cx.fillRect(px, py, TEGEL, TEGEL);
      cx.fillStyle = '#bcab88'; cx.fillRect(px, py + TEGEL - 1, TEGEL, 1);
      cx.fillStyle = '#dccfae'; cx.fillRect(px + 1, py + 1 + spik, 2, 1);
    } else if (t === T.GLAS) {
      cx.fillStyle = 'rgba(190,220,228,0.35)'; cx.fillRect(px, py, TEGEL, TEGEL);
      cx.fillStyle = 'rgba(230,246,250,0.6)'; cx.fillRect(px + 1, py + 1, 1, TEGEL - 2);
    } else if (t === T.MEUBEL) {
      cx.fillStyle = '#7a5230'; cx.fillRect(px, py, TEGEL, TEGEL);
      cx.fillStyle = '#54371f'; cx.fillRect(px, py, TEGEL, 1);
      cx.fillStyle = '#94683f'; cx.fillRect(px + 1, py + 3, TEGEL - 2, 1);
    } else if (t === T.KAST) {
      cx.fillStyle = '#8a6a42'; cx.fillRect(px, py, TEGEL, TEGEL);
      cx.fillStyle = '#5e4527'; cx.fillRect(px, py + 3, TEGEL, 1);
      cx.fillStyle = '#5e4527'; cx.fillRect(px, py, 1, TEGEL);
      cx.fillStyle = '#e8dfc4'; cx.fillRect(px + 2, py + 1, 3, 1);   /* etiketje */
    } else if (t === T.MACHINE) {
      cx.fillStyle = '#77848a'; cx.fillRect(px, py, TEGEL, TEGEL);
      cx.fillStyle = '#4d585e'; cx.fillRect(px, py + TEGEL - 2, TEGEL, 2);
      cx.fillStyle = ((tx + ty) % 2) ? '#ffb347' : '#5fd0d8';        /* knipperlampje */
      cx.fillRect(px + 5, py + 2, 2, 2);
    } else if (t === T.HOUT) {
      cx.fillStyle = '#8a5a2e'; cx.fillRect(px, py, TEGEL, TEGEL);
      cx.fillStyle = '#c98f4a'; cx.fillRect(px, py, TEGEL, 1);
      cx.fillStyle = '#54371f'; cx.fillRect(px, py + TEGEL - 2, TEGEL, 2);
      cx.fillStyle = '#6d4a2a'; cx.fillRect(px + ((tx % 2) ? 1 : 4), py + 4, 2, 1);
    } else if (t === T.METER) {
      /* de meterkast: geel, gevaarlijk, vráágt erom */
      cx.fillStyle = '#c9a13a'; cx.fillRect(px, py, TEGEL, TEGEL);
      cx.fillStyle = '#8a6a1d'; cx.fillRect(px, py, TEGEL, 1); cx.fillRect(px, py + TEGEL - 1, TEGEL, 1);
      cx.fillStyle = '#1d1a12';
      cx.fillRect(px + 4, py + 1, 2, 2); cx.fillRect(px + 3, py + 3, 2, 2); cx.fillRect(px + 4, py + 5, 2, 2);
    } else if (t === T.POSTER) {
      /* de Glimlachquotum-poster — jouw werk uit '83, sloopbaar zonder commentaar */
      cx.fillStyle = '#e8dfc4'; cx.fillRect(px, py, TEGEL, TEGEL);
      cx.fillStyle = '#c2b797'; cx.fillRect(px, py, TEGEL, 1);
      cx.fillStyle = '#c9a13a';
      cx.fillRect(px + 2, py + 2, 1, 1); cx.fillRect(px + 5, py + 2, 1, 1);
      cx.fillRect(px + 2, py + 4, 4, 1); cx.fillRect(px + 1, py + 3, 1, 1); cx.fillRect(px + 6, py + 3, 1, 1);
      cx.fillStyle = '#8a7d5e'; cx.fillRect(px + 1, py + 6, 6, 1);
    } else if (t === T.PLANT) {
      /* de kantoorficus: het enige dat hier ooit echt groeide */
      cx.fillStyle = '#79c045'; cx.fillRect(px + 2, py, 4, 2); cx.fillRect(px + 1, py + 1, 2, 2); cx.fillRect(px + 5, py + 1, 2, 2);
      cx.fillStyle = '#4c7f2a'; cx.fillRect(px + 3, py + 2, 2, 2);
      cx.fillStyle = '#a04e28'; cx.fillRect(px + 2, py + 4, 4, 3);
      cx.fillStyle = '#7a3a1c'; cx.fillRect(px + 2, py + 4, 4, 1); cx.fillRect(px + 1, py + 7, 6, 1);
    } else if (t === T.LADDER) {
      cx.fillStyle = '#8a6a42'; cx.fillRect(px + 1, py, 1, TEGEL); cx.fillRect(px + 6, py, 1, TEGEL);
      cx.fillStyle = '#c98f4a'; cx.fillRect(px + 1, py + 2, 6, 1); cx.fillRect(px + 1, py + 6, 6, 1);
    } else if (t === T.POORT) {
      /* het badge-poortje: "BADGE, GRAAG" — blokkeert tot gesloopt */
      cx.fillStyle = '#77848a'; cx.fillRect(px, py, TEGEL, TEGEL);
      cx.fillStyle = '#4d585e'; cx.fillRect(px, py, 2, TEGEL); cx.fillRect(px + TEGEL - 2, py, 2, TEGEL);
      cx.fillStyle = ((tx + ty) % 2) ? '#d43d2a' : '#8f1f1c';
      cx.fillRect(px + 3, py + 2, 2, 2);
      cx.fillStyle = '#2c3438'; cx.fillRect(px + 2, py + 5, 4, 1);
    }
    /* rim-light: elke tegel met lucht erboven krijgt een lichte bovenrand —
       vloeren en platformen lezen zo in één oogopslag */
    if (t !== T.GLAS && !solide(tegelOp(tx, ty - 1))) {
      cx.fillStyle = 'rgba(255,238,196,0.38)';
      cx.fillRect(px, py, TEGEL, 1);
    }
    /* de gebarsten ruit: witte breuklijnen vlak voor hij valt */
    const idx = ty * lvl.kols + tx;
    if (t === T.GLAS && lvl.barst && lvl.barst[idx]) {
      cx.fillStyle = 'rgba(255,255,255,0.85)';
      const v = (tx + ty) % 3;
      if (v === 0) { cx.fillRect(px + 1, py + 2, 3, 1); cx.fillRect(px + 4, py + 3, 1, 3); cx.fillRect(px + 5, py + 6, 2, 1); }
      else if (v === 1) { cx.fillRect(px + 2, py, 1, 3); cx.fillRect(px + 3, py + 3, 3, 1); cx.fillRect(px + 6, py + 4, 1, 3); }
      else { cx.fillRect(px, py + 5, 3, 1); cx.fillRect(px + 3, py + 2, 1, 3); cx.fillRect(px + 4, py + 1, 3, 1); }
    }
    /* verkoold: een gedithered roetlaag (25/50/75%) na een knal in de buurt */
    const sch = lvl.schroei ? lvl.schroei[idx] : 0;
    if (sch && t !== T.GLAS && t !== T.PLANT && t !== T.LADDER) {
      cx.globalCompositeOperation = 'source-atop';
      cx.drawImage(roetLaag(sch), px, py);
      cx.globalCompositeOperation = 'source-over';
    }
    /* schade-craquelé zodra een meertraps-tegel is aangetikt */
    const maxHp = TEGEL_HP[t];
    const nu = lvl.hp[ty * lvl.kols + tx];
    if (nu > 0 && nu < maxHp) {
      cx.fillStyle = 'rgba(20,16,10,0.55)';
      cx.fillRect(px + 1, py + 2, 3, 1); cx.fillRect(px + 3, py + 3, 1, 3); cx.fillRect(px + 5, py + 5, 2, 1);
    }
  }

  function bakLevel() {
    lvl.barst = new Uint8Array(lvl.kols * lvl.rijen);
    lvl.schroei = new Uint8Array(lvl.kols * lvl.rijen);
    tegelCanvas = document.createElement('canvas');
    tegelCanvas.width = lvl.kols * TEGEL; tegelCanvas.height = lvl.rijen * TEGEL;
    tegelCtx = tegelCanvas.getContext('2d');
    for (let y = 0; y < lvl.rijen; y++) for (let x = 0; x < lvl.kols; x++) tekenTegel(x, y);

    /* de achtergrondlaag: de achterwand van elke laag heeft een eigen karakter,
       met RAMEN (uitgesneden gaten) waardoor de nachtstad in parallax schijnt */
    bgCanvas = document.createElement('canvas');
    bgCanvas.width = tegelCanvas.width; bgCanvas.height = tegelCanvas.height;
    const bx = bgCanvas.getContext('2d');
    const W2 = bgCanvas.width, H2 = bgCanvas.height;
    const K = klimaatNu();
    if (fx) fx.zetBanden(K.banden);
    lvl.ramen = []; lvl.lampen = []; lvl.bankLampen = []; tls = [];
    lvl.barst = lvl.barst || new Uint8Array(lvl.kols * lvl.rijen);
    lvl.schroei = lvl.schroei || new Uint8Array(lvl.kols * lvl.rijen);
    /* lichtgevende tegels (machines, meterkasten, poortjes) één keer oplijsten:
       geen scan van 2600 tegels per frame in de lichtpas */
    for (let ty = 0; ty < lvl.rijen; ty++) for (let tx = 0; tx < lvl.kols; tx++) {
      const t = lvl.type[ty * lvl.kols + tx];
      if (t === T.MACHINE || t === T.METER || t === T.POORT) lvl.lampen.push({ tx, ty, t, fase: (tx * 7 + ty * 3) % 10 });
    }
    if (K.naam === 'directie') {
      let k = 0;
      for (let ty = 1; ty < lvl.rijen - 2; ty++) for (let tx = 2; tx < lvl.kols - 2; tx++) {
        if (lvl.type[ty * lvl.kols + tx] === T.KAST && !solide(tegelOp(tx, ty - 1)) && (k++ % 3) === 0) lvl.bankLampen.push({ tx, ty });
      }
    }
    if (lvl.soort === 'dak') {
      /* het dak: de lucht wordt elk frame getekend (onweer, zeppelin, stad) —
         hier alleen de dakopbouw die er vast staat: watertank, mast, schoorsteen */
      const dakY = (lvl.rijen - 2) * TEGEL;
      bx.fillStyle = '#0c0a10';
      bx.fillRect(58, dakY - 44, 30, 26); bx.fillRect(56, dakY - 46, 34, 3);           /* de watertank */
      for (const px of [60, 70, 80]) bx.fillRect(px, dakY - 18, 2, 18);
      bx.fillRect(W2 - 60, dakY - 70, 2, 70);                                        /* de antennemast */
      for (let my = dakY - 64; my < dakY; my += 8) { bx.fillRect(W2 - 64, my, 10, 1); }
      bx.fillStyle = '#16121a'; bx.fillRect(98, dakY - 30, 14, 30); bx.fillRect(96, dakY - 32, 18, 3);   /* schoorsteen */
      return;
    }
    tekenAchterwand(bx, K.naam, W2, H2);
    /* de tl-bakken (directie: kroonluchters) hangen nu als eigen objecten aan
       het plafond: ze geven licht, flikkeren, slingeren en kunnen neerstorten */
    const kroon = K.naam === 'directie';
    let n = 0;
    for (let x = 8; x < lvl.kols - 8; x += 14) {
      /* elke vierde bak is aan het sterven: hij flikkert (het archief extra) */
      const kapot = K.naam === 'archief' ? (n % 3 === 1) : (n % 4 === 2);
      let vy = 2;
      while (vy < lvl.rijen - 1 && !solide(tegelOp(x + 1, vy))) vy++;
      tls.push({ x: x * TEGEL, y: TEGEL, b: 24, staat: 'hangt', hoek: 0, vh: 0, vy: 0, px: 0, py: 0, kapot, kroon, n: n++, vloerY: vy * TEGEL });
    }
    /* de goederenlift (uitgang) op de achtergrond, met een groen UITGANG-bordje */
    const L = lvl.lift;
    if (L) {
      bx.fillStyle = '#3f3c30'; bx.fillRect(L.x - 2, L.y - 2, L.b + 4, L.h + 2);
      bx.fillStyle = '#181510'; bx.fillRect(L.x, L.y, L.b, L.h);
      bx.fillStyle = '#26221a'; bx.fillRect(L.x + L.b / 2 - 1, L.y, 2, L.h);           /* de naad tussen de deuren */
      bx.fillStyle = '#2d2a22'; bx.fillRect(L.x + 3, L.y + 3, L.b / 2 - 5, L.h - 6); bx.fillRect(L.x + L.b / 2 + 2, L.y + 3, L.b / 2 - 5, L.h - 6);
      bx.fillStyle = '#ffb347'; bx.fillRect(L.x + L.b / 2 - 4, L.y - 6, 8, 3);
    }
  }

  /* de achterwand per laag — alles donker en laag in contrast (het licht doet
     de rest), met uitgesneden raamgaten in lvl.ramen */
  function tekenAchterwand(bx, soort, W2, H2) {
    const plafond = TEGEL, vloer = H2 - 2 * TEGEL;
    const raam = (x, y, b, h, stijl) => {
      if (x < 2 * TEGEL || x + b > W2 - 2 * TEGEL) return;
      if (lvl.lift && x + b > lvl.lift.x - 12 && x < lvl.lift.x + lvl.lift.b + 12 && y + h > lvl.lift.y - 10) return;
      lvl.ramen.push({ x, y, b, h });
      bx.clearRect(x, y, b, h);
      /* het kozijn en de roeden */
      bx.fillStyle = stijl.kozijn;
      bx.fillRect(x - 2, y - 2, b + 4, 2); bx.fillRect(x - 2, y + h, b + 4, 3); bx.fillRect(x - 2, y, 2, h); bx.fillRect(x + b, y, 2, h);
      bx.fillStyle = stijl.roede;
      for (let rx = x + stijl.roedeX; rx < x + b - 2; rx += stijl.roedeX) bx.fillRect(rx, y, 1, h);
      if (stijl.kalf) bx.fillRect(x, y + Math.round(h * stijl.kalf), b, 1);
      bx.fillStyle = stijl.licht; bx.fillRect(x - 2, y + h, b + 4, 1);            /* de vensterbank vangt licht */
      /* glasreflectie: twee schuine glansstrepen en wat regensporen op de ruit */
      bx.fillStyle = 'rgba(190,210,255,0.05)';
      for (let k = 0; k < Math.min(h, 22); k++) { const gx = x + 3 + ((k * 0.7) | 0); if (gx < x + b - 1) bx.fillRect(gx, y + k, 2, 1); }
      bx.fillStyle = 'rgba(200,215,240,0.1)';
      for (let k = 0; k < b / 9; k++) { const dx = x + ((k * 37 + y) % b), dy = y + ((k * 53 + x) % Math.max(1, h - 6)); bx.fillRect(dx, dy, 1, 2 + (k % 4)); }
    };
    if (soort === 'archief') {
      /* V-1, de kelder: betonblokken, leidingen, waterkringen — en hoog in de
         muur kelderraampjes op straatniveau waar de regen langs de stoep valt */
      bx.fillStyle = '#15191b'; bx.fillRect(0, 0, W2, H2);
      for (let y = plafond; y < vloer; y += 8) {
        bx.fillStyle = '#101315'; bx.fillRect(0, y, W2, 1);
        const off = ((y / 8) | 0) % 2 ? 8 : 0;
        for (let x = off; x < W2; x += 16) bx.fillRect(x, y, 1, 8);
      }
      bx.fillStyle = '#121618';
      for (let x = 20; x < W2; x += 53) { const l = 20 + ((x * 7) % 60); bx.fillRect(x, plafond, 3, l); bx.fillRect(x + 1, plafond + l, 1, 6); }
      /* twee leidingen langs het plafond, met beugels */
      for (const [py, dik] of [[26, 4], [33, 3]]) {
        bx.fillStyle = '#232b2f'; bx.fillRect(0, py, W2, dik);
        bx.fillStyle = '#34414a'; bx.fillRect(0, py, W2, 1);
        bx.fillStyle = '#0e1214'; for (let x = 12; x < W2; x += 40) bx.fillRect(x, py - 2, 2, dik + 3);
      }
      for (let x = 70; x < W2 - 20; x += 190) { bx.fillStyle = '#1f272a'; bx.fillRect(x, plafond, 4, vloer - plafond); bx.fillStyle = '#2d383d'; bx.fillRect(x, plafond, 1, vloer - plafond); }
      /* de gestencilde verdiepingscode */
      for (let x = 120; x < W2 - 80; x += 260) tekst(bx, 'V-1', x, 60, '#1c2326', 4);
      const stijl = { kozijn: '#262d30', roede: '#2e373b', licht: '#3a464b', roedeX: 7 };
      for (let x = 40; x < W2 - 40; x += 118) raam(x, 11, 26, 9, stijl);
    } else if (soort === 'kantoortuin') {
      /* V2: groezelig behang, een plint, een klok die op 0U06 blijft hangen,
         en grote kantoorramen op de regenachtige nacht */
      bx.fillStyle = '#1a1c16'; bx.fillRect(0, 0, W2, H2);
      bx.fillStyle = '#1e2119'; for (let x = 0; x < W2; x += 5) bx.fillRect(x, plafond, 1, vloer - plafond);
      bx.fillStyle = '#121310'; bx.fillRect(0, vloer - 6, W2, 6);
      bx.fillStyle = '#23261d'; bx.fillRect(0, vloer - 7, W2, 1);
      const stijl = { kozijn: '#2a2d24', roede: '#262920', licht: '#3b3f31', roedeX: 14, kalf: 0.34 };
      for (let x = 34; x < W2 - 40; x += 84) raam(x, 22, 54, 64, stijl);
      /* de klok tussen twee ramen: altijd 0U06 */
      for (let x = 100; x < W2 - 40; x += 336) {
        bx.fillStyle = '#26291f'; bx.fillRect(x - 1, 34, 14, 14);
        bx.fillStyle = '#c9c2a8'; bx.fillRect(x, 35, 12, 12);
        bx.fillStyle = '#26221a'; bx.fillRect(x + 6, 37, 1, 5); bx.fillRect(x + 6, 41, 1, 1); bx.fillRect(x + 7, 40, 1, 1);
      }
    } else if (soort === 'facturatie') {
      /* V3: een muur van ordners op planken (25 jaar facturen, op kleur) en
         een lintvenster hoog onder het plafond */
      bx.fillStyle = '#1b1712'; bx.fillRect(0, 0, W2, H2);
      const RUG = ['#2a1f16', '#231c14', '#2c2418', '#1f1a12', '#302114', '#262016'];
      for (let y = 40; y < vloer - 8; y += 22) {
        bx.fillStyle = '#120f0b'; bx.fillRect(0, y + 14, W2, 2);
        for (let x = 0; x < W2; x += 3) {
          const k = (x * 13 + y * 7) % 23;
          if (k === 0) continue;                                       /* een gat waar een ordner ontbreekt */
          bx.fillStyle = RUG[k % RUG.length]; bx.fillRect(x, y + (k % 3), 2, 14 - (k % 3));
          if (k % 5 === 0) { bx.fillStyle = '#3a2e20'; bx.fillRect(x, y + 6, 2, 2); }   /* het rugetiket */
        }
      }
      const stijl = { kozijn: '#2a241b', roede: '#252017', licht: '#3c3325', roedeX: 16 };
      for (let x = 24; x < W2 - 30; x += 60) raam(x, 12, 48, 22, stijl);
    } else if (soort === 'directie') {
      /* V4: mahoniehouten lambrisering, vergulde portretten van mannen in
         pakken, en panoramaramen op het onweer dat eraan komt */
      bx.fillStyle = '#1d110e'; bx.fillRect(0, 0, W2, H2);
      for (let x = 0; x < W2; x += 24) {
        bx.fillStyle = '#241512'; bx.fillRect(x + 2, plafond, 20, vloer - plafond);
        bx.fillStyle = '#2c1a15'; bx.fillRect(x + 2, plafond, 1, vloer - plafond);
        bx.fillStyle = '#130a08'; bx.fillRect(x + 22, plafond, 2, vloer - plafond);
      }
      bx.fillStyle = '#3a2410'; bx.fillRect(0, vloer - 30, W2, 2);        /* de lijst van de lambrisering */
      bx.fillStyle = '#4a3012'; bx.fillRect(0, vloer - 30, W2, 1);
      const stijl = { kozijn: '#2e1c14', roede: '#2a1911', licht: '#4a3020', roedeX: 24, kalf: 0.72 };
      for (let x = 28; x < W2 - 40; x += 96) raam(x, 18, 72, 80, stijl);
      /* de portretten hangen tussen de ramen */
      for (let x = 104; x < W2 - 40; x += 192) {
        bx.fillStyle = '#6a5020'; bx.fillRect(x - 1, 40, 18, 22);
        bx.fillStyle = '#8a6a2a'; bx.fillRect(x - 1, 40, 18, 1);
        bx.fillStyle = '#140c0a'; bx.fillRect(x + 1, 42, 14, 18);
        bx.fillStyle = '#2a1c16'; bx.fillRect(x + 5, 45, 6, 6); bx.fillRect(x + 3, 51, 10, 9);   /* een man in pak */
        bx.fillStyle = '#5a1a14'; bx.fillRect(x + 7, 52, 2, 5);                                 /* zijn das */
      }
    } else {
      bx.fillStyle = '#171310'; bx.fillRect(0, 0, W2, H2);
    }
  }

  /* ---------- tegels slopen (het hart van de outro) ---------- */
  function raakTegel(tx, ty, kracht) {
    if (tx < 2 || ty < 1 || tx >= lvl.kols - 2 || ty >= lvl.rijen - 2) return false;
    const i = ty * lvl.kols + tx, t = lvl.type[i];
    if (t === T.LUCHT) return false;
    /* B.A.A.S. zelf blijft staan — zijn voetafdruk is heilig (het punt) */
    if (lvl.baas && tx * TEGEL >= lvl.baas.x && tx * TEGEL < lvl.baas.x + lvl.baas.b && ty * TEGEL >= lvl.baas.y) return false;
    lvl.hp[i] = Math.max(0, lvl.hp[i] - (kracht || 1));
    if (lvl.hp[i] > 0) { tekenTegel(tx, ty); sfx('klap', 0.05); return true; }
    if (t !== T.GLAS && t !== T.LADDER && t !== T.PLANT) spawnBrokken(tx, ty);
    lvl.type[i] = T.LUCHT;
    tekenTegel(tx, ty);
    tekenTegel(tx, ty + 1);   /* de tegel eronder krijgt nu een lichtrand */
    if (t === T.GLAS) {
      spawnScherven(tx * TEGEL + 4, ty * TEGEL + 4, liteModus ? 3 : 6);
      /* de ruit versplintert als één geheel: de barst loopt in een golf door
         alle aangrenzende glastegels (en daarachter komt de nacht vrij) */
      if (!lvl.barst[i]) {
        lvl.barst[i] = 1;
        const max = liteModus ? 16 : 40, rij = [[tx, ty, 0]];
        let n = 0;
        while (rij.length && n < max) {
          const [x0, y0, d0] = rij.shift();
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x0 + dx, ny = y0 + dy;
            if (nx < 2 || ny < 1 || nx >= lvl.kols - 2 || ny >= lvl.rijen - 2) continue;
            const j = ny * lvl.kols + nx;
            if (lvl.type[j] !== T.GLAS || lvl.barst[j]) continue;
            lvl.barst[j] = 1; tekenTegel(nx, ny); n++;
            glasWachtrij.push({ tx: nx, ty: ny, t: 0.15 + 0.03 * (d0 + 1) });
            rij.push([nx, ny, d0 + 1]);
          }
        }
      }
    } else if (t === T.METER) {
      /* de elektrische ketting: bliksemboogjes kruipen naar de meterkasten in de
         buurt — zap, zap, BOEM, BOEM — je ziet de kettingreactie aankomen */
      for (let dy = -5; dy <= 5; dy++) for (let dx = -9; dx <= 9; dx++) {
        const nx = tx + dx, ny = ty + dy;
        if ((dx || dy) && tegelOp(nx, ny) === T.METER && !bomWachtrij.some(b => b.zap && b.tx === nx && b.ty === ny)) {
          bomWachtrij.push({ zap: true, tx: nx, ty: ny, px: nx * TEGEL + 4, py: ny * TEGEL + 4, t: 0.22 + Math.hypot(dx, dy) * 0.04, boog: { x0: tx * TEGEL + 4, y0: ty * TEGEL + 4 } });
        }
      }
    } else if (t === T.MACHINE) {
      duwPartikel({ soort: 'crtuit', x: tx * TEGEL + 4, y: ty * TEGEL + 3, t: 0.34, maxT: 0.34 });
    } else if (t === T.BETON) spawnStofgolf(tx * TEGEL + 4, ty * TEGEL + 4);
    ontfactureerd += M2_PER_TEGEL;
    popupWachtrij++;
    spawnGruis(tx * TEGEL + 4, ty * TEGEL + 4, t);
    /* alles wat óp deze tegel stond komt zo dadelijk naar beneden: de
       instort-golf rolt met een korte vertraging omhoog (Broforce-cascade) */
    stortWachtrij.push({ tx, ty: ty - 1, t: 0.06 + Math.random() * 0.04 });
    /* machines en meterkasten ontploffen — de meterkast fors, mét ketting */
    if (t === T.METER) bomWachtrij.push({ px: tx * TEGEL + 4, py: ty * TEGEL + 4, straal: 15, t: 0.1, bron: 'meter' });
    else if (t === T.MACHINE) bomWachtrij.push({ px: tx * TEGEL + 4, py: ty * TEGEL + 4, straal: 10, t: 0.05 });
    bumpKetting();   /* elke gesloopte tegel voedt de SLOOPKETTING */
    /* DERTIENDE MAAND: sloop van iets zwaars laat soms een hartje vallen */
    if (upgrades.bonus && (t === T.MACHINE || t === T.METER || t === T.KAST) &&
        Math.random() < 0.12 + 0.05 * upgrades.bonus) {
      harten.push({ x: tx * TEGEL + 1, y: ty * TEGEL, vy: -60, t: 11, opGrond: false });
    }
    sfx(t === T.GLAS ? 'blok' : 'zwareklap', t === T.GLAS ? 0.05 : 0.09);
    if (t === T.BETON) { schud(2.6); stop('beton'); kick(0, 1.5); }
    else stop(t === T.GLAS ? 'glas' : t === T.GIPS ? 'gips' : t === T.KAST ? 'kast' : t === T.MACHINE ? 'machine' : 'hout');
    if (window.Klank && Klank.duck) { try { Klank.duck(0.35, 0.25); } catch (e) {} }
    schud(1.6);
    return true;
  }

  /* de instort-golf: een tegel zonder steun eronder brokkelt alsnog af,
     zodat een wand of kastenstapel kolom voor kolom naar beneden dondert */
  function verwerkInstort(dt) {
    if (!stortWachtrij.length) return;
    const rest = [];
    for (const s of stortWachtrij) {
      s.t -= dt;
      if (s.t > 0) { rest.push(s); continue; }
      const t = tegelOp(s.tx, s.ty);
      if (t !== T.LUCHT && t !== T.BETON && tegelOp(s.tx, s.ty + 1) === T.LUCHT) raakTegel(s.tx, s.ty, 99);
    }
    stortWachtrij = rest;
  }

  /* de explosie: vuurbal + rook + schokgolf die tegels wegvaagt en drones
     meeneemt. De held voelt er niets van — dit is een viering, geen straf. */
  function explosie(px, py, straal, bron) {
    const basis = straal;
    straal += Math.min(5, upgrades.over * 2);
    /* de camera wordt weggedrukt van het middelpunt, zware knallen bevriezen */
    const cx = camX + BREED / 2, cy = camY + HOOG / 2, afst = Math.hypot(cx - px, cy - py) || 1;
    kick((cx - px) / afst * 2.5, (cy - py) / afst * 2.5);
    if (bron === 'meter') {
      meterKnallen.push(tijd);
      meterKnallen = meterKnallen.filter(t => tijd - t < 1.4);
      if (meterKnallen.length === 3) verbleekMoment(1.2);
      impact(1, meterKnallen.length >= 5);
    } else if (basis >= 16) impact(1, false);
    knalVenster.push(tijd); knalVenster = knalVenster.filter(t => tijd - t < 0.4);
    if (knalVenster.length === 5) slowmo(0.5, 0.35);
    schermFlits = Math.max(schermFlits, 0.09);
    spawnVuurbal(px, py, straal + 4, bron === 'meter' || basis >= 15);
    spawnSchok(px, py, straal + 10, sloopKetting >= 12 ? regenboog(tijd) : null);   /* schokgolf-ring, regenboog bij hoge combo */
    sloopGebied(px, py, straal, 3);
    voegTrauma(0.26);
    /* nazinderen: een schroeiplek brandt zich in de achterwand (niet in de
       ramen: source-atop), de tegels in de ring verkolen, en de gloed dooft traag */
    if (fx && bgCanvas && lvl.soort !== 'dak') {
      const st = fx.schroeiStempel(straal * 1.2), bxc = bgCanvas.getContext('2d');
      bxc.globalCompositeOperation = 'source-atop';
      bxc.drawImage(st.c, Math.round(px - st.ox), Math.round(py - st.oy));
      bxc.globalCompositeOperation = 'source-over';
    }
    if (lvl.schroei) {
      const rr = straal + 8;
      for (let ty2 = Math.floor((py - rr) / TEGEL); ty2 <= Math.floor((py + rr) / TEGEL); ty2++) {
        for (let tx2 = Math.floor((px - rr) / TEGEL); tx2 <= Math.floor((px + rr) / TEGEL); tx2++) {
          if (tx2 < 0 || ty2 < 0 || tx2 >= lvl.kols || ty2 >= lvl.rijen) continue;
          const j = ty2 * lvl.kols + tx2;
          if (lvl.type[j] === T.LUCHT || lvl.schroei[j] >= 3) continue;
          if (Math.hypot(tx2 * TEGEL + 4 - px, ty2 * TEGEL + 4 - py) > rr) continue;
          lvl.schroei[j]++; tekenTegel(tx2, ty2);
        }
      }
    }
    duwPartikel({ soort: 'gloei', x: px, y: py, r: Math.round((straal * 1.6 + 8) / 4) * 4, t: 2, maxT: 2 });
    for (const m of motes) {
      const dx = m.x - px, dy = m.y - py, d = Math.hypot(dx, dy);
      if (d < straal * 3 && d > 0) { m.vx += dx / d * 60; m.vy += dy / d * 60; }
    }
    for (const d of drones) {
      if (!d.dood && Math.hypot(d.x + 4 - px, d.y + 4 - py) < straal + 8) raakVijand(d, 2);
    }
    raakInteracties(px, py, straal + 4);
    raakBaasPunt(px, py);
    schokTls(px, py, straal);
    schud(3); stop(bron === 'meter' ? 'meter' : 'machine');
    sfx('zwareklap', 0.04); sfx('dood', 0.12);
    if (window.Klank && Klank.duck) { try { Klank.duck(0.55, 0.4); } catch (e) {} }
  }
  function verwerkBommen(dt) {
    if (!bomWachtrij.length) return;
    const rest = [];
    for (const b of bomWachtrij) {
      b.t -= dt;
      if (b.t > 0) rest.push(b);
      else if (b.zap) { raakTegel(b.tx, b.ty, 99); spawnVonk(b.px, b.py, '#dff4ff', 6); sfx('schitter', 0.08); }
      else explosie(b.px, b.py, b.straal, b.bron);
    }
    bomWachtrij = rest;
  }

  /* sloop een blok van bxh tegels rond een pixelpunt */
  function sloopGebied(px, py, straal, kracht) {
    const tx0 = Math.floor((px - straal) / TEGEL), tx1 = Math.floor((px + straal) / TEGEL);
    const ty0 = Math.floor((py - straal) / TEGEL), ty1 = Math.floor((py + straal) / TEGEL);
    let geraakt = false;
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) geraakt = raakTegel(tx, ty, kracht) || geraakt;
    return geraakt;
  }

  /* ---------- partikels & popups ---------- */
  /* lite/mobiel wordt één keer per run geijkt — geen DOM-lookup per spawn */
  let liteModus = false, maxPartikels = 220, spoorStap = 1, spoorLeven = 0.3;
  function ijkPrestaties() {
    liteModus = !!(window.mobiel || document.body.classList.contains('lite'));
    reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    maxPartikels = liteModus ? 110 : 220;
    spoorStap = liteModus ? 3 : 1;        /* projectiel-trails op een kloktik: 20Hz op mobiel */
    spoorLeven = liteModus ? 0.45 : 0.3;  /* iets langer leven compenseert de lagere spawnrate */
  }
  const GRUIS_KLEUR = [null, '#5b574a', '#cfc0a0', '#cfe0e4', '#7a5230', '#8a6a42', '#77848a', '#6d4a2a', '#c9a13a', '#e8dfc4', '#77848a', '#79c045', '#8a6a42'];
  /* goedkope sfeer-partikels mogen de dure (gruis/vuurbal/rook/schok) nooit verdringen */
  const GOEDKOOP = { spoor: 1, as: 1, vonk: 1, stof: 1, scherf: 1 };
  function duwPartikel(p) {
    if (partikels.length >= maxPartikels) {
      let i = -1;
      for (let k = 0; k < partikels.length; k++) if (GOEDKOOP[partikels[k].soort]) { i = k; break; }
      if (i !== -1) partikels.splice(i, 1);          /* vol: offer eerst een spoor/sintel/vonk op */
      else if (GOEDKOOP[p.soort]) return;            /* alleen duur puin over? nieuwe trail overslaan */
      else partikels.shift();
    }
    partikels.push(p);
  }
  function spawnGruis(px, py, t) {
    const n = t === T.GLAS ? 8 : 6;
    for (let i = 0; i < n; i++) {
      duwPartikel({
        soort: 'gruis',
        x: px, y: py,
        vx: (Math.random() - 0.5) * 110, vy: -40 - Math.random() * 90,
        t: 0.8 + Math.random() * 0.6, kleur: GRUIS_KLEUR[t] || '#cfc0a0',
        g: 2 + ((Math.random() * 2) | 0), stuit: t !== T.GLAS
      });
    }
  }
  /* puin uit de echte tegel: de tegel gaat eerst in een ringatlas (128 plekjes),
     daarna tollen er 2-4 brokjes van 4x4 mét zijn eigen textuur weg — de
     glimlach van een poster in vier stukken, het bureau in zijn eigen nerf */
  function spawnBrokken(tx, ty) {
    if (!brokAtlas) {
      brokAtlas = document.createElement('canvas'); brokAtlas.width = 128; brokAtlas.height = 64;
      brokCtx = brokAtlas.getContext('2d');
    }
    const slot = brokSlot++ & 127, sx = (slot & 15) * 8, sy = (slot >> 4) * 8;
    brokCtx.clearRect(sx, sy, 8, 8);
    brokCtx.drawImage(tegelCanvas, tx * TEGEL, ty * TEGEL, 8, 8, sx, sy, 8, 8);
    const kw = liteModus ? [[0, 0, 4, 8], [4, 0, 4, 8]] : [[0, 0, 4, 4], [4, 0, 4, 4], [0, 4, 4, 4], [4, 4, 4, 4]];
    for (const [qx, qy, w, h] of kw) {
      duwPartikel({
        soort: 'brok', sx: sx + qx, sy: sy + qy, w, h,
        x: tx * TEGEL + qx, y: ty * TEGEL + qy,
        vx: (qx - 2) * 22 + (Math.random() - 0.5) * 60, vy: -60 - Math.random() * 80 + qy * 6,
        rot: (Math.random() * 4) | 0, vr: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 8),
        t: 2 + Math.random() * 1.2, stuit: true, lig: false, g: 4
      });
    }
  }
  /* glasscherven: schuine lijntjes die tollen en het licht vangen */
  function spawnScherven(px, py, n) {
    for (let i = 0; i < n; i++) {
      duwPartikel({ soort: 'scherf', x: px + (Math.random() - 0.5) * 6, y: py + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 120, vy: -30 - Math.random() * 90, hoek: Math.random() * 4, vr: (Math.random() - 0.5) * 14,
        fase: Math.random() * 6, t: 1.6 + Math.random() * 1.6, stuit: true, lig: false, g: 2 });
    }
  }
  /* een sintel: witheet, koelt af via geel en oranje naar rood en dwarrelt dan neer */
  function spawnSintel(px, py, n) {
    for (let i = 0; i < n; i++) {
      duwPartikel({ soort: 'as', x: px, y: py, vx: (Math.random() - 0.5) * 90, vy: -30 - Math.random() * 70,
        t: 1.4 + Math.random() * 1.2, fase: Math.random() * 6, kleur: '#ffffff', warmte: 1 });
    }
  }
  /* de stofgolf: twee grondgebonden wolken die over de vloer wegrollen */
  function spawnStofgolf(px, py) {
    let vy = Math.floor(py / TEGEL);
    while (vy < lvl.rijen - 1 && !solide(tegelOp(Math.floor(px / TEGEL), vy))) vy++;
    const vloer = vy * TEGEL - 2;
    const n = liteModus ? 2 : 4;
    for (let i = 0; i < n; i++) for (const r of [-1, 1]) {
      duwPartikel({ soort: 'stof', x: px, y: vloer, vx: r * (40 + Math.random() * 50), vy: 0, r0: 2, t: 0.8 + Math.random() * 0.5, maxT: 1.3 });
    }
  }
  function spawnVonk(px, py, kleur, n) {
    for (let i = 0; i < (n || 6); i++) {
      duwPartikel({ soort: 'vonk', x: px, y: py, vx: (Math.random() - 0.5) * 130, vy: (Math.random() - 0.5) * 130, t: 0.35 + Math.random() * 0.3, kleur: kleur || '#ffb347', g: 1 });
    }
  }
  /* de vuurbal: witte kern die uitzet naar oranje + traag stijgende rook */
  function spawnVuurbal(px, py, straal, zwaar) {
    duwPartikel({ soort: 'vuurbal', x: px, y: py, t: 0.34, maxT: 0.34, r: straal + 7 });
    /* nabranders: kleinere knallen die 60 ms later openbloeien */
    if (zwaar && !liteModus) for (let i = 0; i < 2; i++) {
      duwPartikel({ soort: 'vuurbal', x: px + (Math.random() - 0.5) * straal * 1.4, y: py - Math.random() * straal, t: 0.3 + 0.07 * (i + 1), maxT: 0.3, r: (straal + 7) * 0.5 });
    }
    for (let i = 0; i < (liteModus ? 3 : 5); i++) {
      duwPartikel({
        soort: 'rook', x: px + (Math.random() - 0.5) * straal, y: py + (Math.random() - 0.5) * straal,
        vx: (Math.random() - 0.5) * 14, vy: -12 - Math.random() * 16,
        t: 1.1 + Math.random() * 0.8, maxT: 1.9, r: 3 + Math.random() * 4
      });
    }
    spawnVonk(px, py, '#ffd23f', 12);
    spawnVonk(px, py, '#ff7a2f', 8);
    spawnVonk(px, py, '#ffffff', 5);
    spawnSintel(px, py, liteModus ? 2 : 5);
    /* hoe hoger de SLOOPKETTING, hoe kleurrijker de knal: confetti-vonken */
    if (sloopKetting >= 8) for (let i = 0; i < 8; i++) spawnVonk(px, py, REGENBOOG[i % REGENBOOG.length], 2);
  }
  /* het regenboogpalet — voor confetti, wapen-trails en combo-flair */
  const REGENBOOG = ['#ff5a3c', '#ff9c3f', '#ffd23f', '#79c045', '#5fd0d8', '#5f8fe0', '#c86fe0'];
  const regenboog = (f) => REGENBOOG[((f * 10) | 0) % REGENBOOG.length];
  /* een kort, in-plaats-vervagend kleurspoor achter een projectiel */
  function spawnSpoor(px, py, kleur, groot) {
    duwPartikel({ soort: 'spoor', x: px, y: py, t: spoorLeven, maxT: spoorLeven, kleur: kleur || '#ffd23f', g: groot || 2 });
  }
  function popup(px, py, txt, kleur) {
    /* dezelfde tekst vlak bij elkaar wordt één popup met een teller (-0U06 X6):
       geen groene brij meer boven het hoofd van de held */
    for (const p of popups) {
      if (p.txt0 === txt && Math.abs(p.x - px) < 28 && p.t > 0.45) {
        p.n++; p.txt = txt + ' X' + p.n; p.t = Math.max(p.t, 0.8); return;
      }
    }
    popups.push({ x: px, y: py, txt, txt0: txt, n: 1, kleur: kleur || '#9fe06a', t: 0.9, pop: 0.07 });
    if (popups.length > 8) popups.shift();
  }

  /* de SLOOPKETTING: elke sloop binnen 2s telt door; hoe hoger, hoe meer juice */
  function bumpKetting(n) {
    const oud = sloopKetting;
    sloopKetting += (n || 1);
    if (Math.floor(sloopKetting / 10) > Math.floor(oud / 10)) kettingPunch = 0.12;
    for (const m of [25, 50, 100]) if (oud < m && sloopKetting >= m) { mijlpaal = { t: 0, txt: 'SLOOPKETTING X' + m }; sfx('applaus', 0.5); sfx('schitter', 0.1); }
    kettingT = 2;
    if (sloopKetting > kettingPiek) kettingPiek = sloopKetting;
  }
  /* de schokgolf-ring: een uitzettende cirkelrand — puur spektakel */
  function spawnSchok(px, py, r, kleur) {
    duwPartikel({ soort: 'schok', x: px, y: py, t: 0.34, maxT: 0.34, r: r, kleur: kleur || null });
  }
  /* een opstijgende sintel voor de sfeer (traag, flikkerend) */
  function spawnAs(px, py) {
    duwPartikel({ soort: 'as', x: px, y: py, vx: (Math.random() - 0.5) * 10, vy: -8 - Math.random() * 12,
      t: 1.6 + Math.random() * 1.4, fase: Math.random() * 6, kleur: Math.random() < 0.5 ? '#ff9c3f' : '#ffd23f' });
  }

  /* schud() blijft bestaan als dunne wrapper: elke oude aanroep voedt nu het
     trauma — een vloeiende beving die kwadratisch uitsterft, geen witte ruis */
  function schud(kracht) { voegTrauma(klem(kracht, 0, 3) * 0.05); }
  function voegTrauma(n) { trauma = Math.min(1, trauma + n); }
  /* een gerichte stoot: de camera veert kritisch gedempt terug */
  function kick(dx, dy) { const m = (liteModus || reduceMotion) ? 0.5 : 1; kickVX += dx * 60 * m; kickVY += dy * 60 * m; }
  /* gewogen hitstop in frames (1/60 s): max i.p.v. som, met een budget van
     0,25 s per seconde spel — een lawine van 40 tegels mag nooit stotteren */
  const HITSTOP = { gips: 1, glas: 1, hout: 2, kast: 2, beton: 4, machine: 4, raak: 2, kill: 5, meter: 6, held: 3, cel: 4, droom: 6, manager: 14 };
  function stop(soort, doel) {
    const d = Math.min((HITSTOP[soort] || 2) / 60, stopBudget + hitstop);
    if (d <= hitstop) return;
    stopBudget = Math.max(0, stopBudget - (d - hitstop));
    hitstop = d;
    if (doel) stopDoel = doel;
  }
  /* slow-mo: 80 ms inzakken, een plateau, 250 ms smooth terug; 4 s afkoeling.
     Loopt er al een, dan wordt die verlengd (nooit herstart: geen tik op 1x).
     prio = een gescript verhaalmoment: dat omzeilt de afkoeling. */
  function slowmo(duur, schaal, prio) {
    const S = slowmoToestand;
    if (S) { S.duur = Math.max(S.duur, S.t + duur); S.schaal = Math.min(S.schaal, schaal); return; }
    if (slowmoKoeling > 0 && !prio) { voegTrauma(0.3); return; }
    slowmoToestand = { t: 0, duur, schaal }; slowmoKoeling = 4;
  }
  function balken(duur) { balkTot = Math.max(balkTot, tijd + duur); }
  /* het impactframe: een silhouet van n/60 s (op tijd, niet per renderframe).
     Hoogstens één per 250 ms, een inverse (witte wereld) hoogstens één per 2 s,
     en nooit bij reduced motion. prio (verhaalmomenten) omzeilt beide limieten. */
  function impact(n, invers, prio) {
    if (reduceMotion) return;
    if (!prio && tijd - impactKlok < (liteModus ? 0.4 : 0.25)) return;
    impactKlok = tijd; impactTot = Math.max(impactTot, tijd + n / 60);
    impactInvers = !!invers && !liteModus && (prio || tijd - inversKlok > 2);
    if (impactInvers) inversKlok = tijd;
  }
  function verbleekMoment(duur, prio) { verbleekTot = Math.max(verbleekTot, tijd + duur); balken(duur); slowmo(0.7, 0.3, prio); }
  /* alles wat op echte tijd loopt (ook tijdens hitstop en slow-mo) */
  function regieTik(dt) {
    stopBudget = Math.min(0.25, stopBudget + dt * 0.25);
    if (slowmoKoeling > 0) slowmoKoeling -= dt;
    if (slowmoToestand) {
      const S = slowmoToestand; S.t += dt;
      const e = S.t < 0.08 ? S.t / 0.08 : (S.t < S.duur ? 1 : 1 - (S.t - S.duur) / 0.25);
      const f = klem(e, 0, 1), sm = f * f * (3 - 2 * f);
      tijdSchaal = 1 - (1 - S.schaal) * sm;
      if (S.t > S.duur + 0.25) { slowmoToestand = null; tijdSchaal = 1; }
    } else tijdSchaal = 1;
    kickVX += (-kickX * 420 - kickVX * 28) * dt; kickX += kickVX * dt;
    kickVY += (-kickY * 420 - kickVY * 28) * dt; kickY += kickVY * dt;
    if (trauma > 0) trauma = Math.max(0, trauma - 1.6 * dt);
    const balkDoel = tijd < balkTot ? 1 : 0;
    balkT += klem(balkDoel - balkT, -dt * 4, dt * 4);
    if (kettingPunch > 0) kettingPunch -= dt;
    if (mijlpaal) { mijlpaal.t += dt; if (mijlpaal.t > 0.8) mijlpaal = null; }
    const vDoel = tijd < verbleekTot ? 0.85 : 0;
    verbleek += klem(vDoel - verbleek, -dt * 1.5, dt * 4);
  }

  /* ---------- entiteiten ---------- */
  function nieuweHeld() {
    return {
      x: lvl.spelerStart.x, y: lvl.spelerStart.y, vx: 0, vy: 0,
      b: 7, h: 14, richting: 1, opGrond: false,
      coyote: 0, sprongBuf: 0, loopT: 0,
      zwaaiT: 0, zwaaiKlok: 0, dubbelOp: true, dubbelT: 0,
      hartjes: 3, raakbaar: 0, wachtT: 0
    };
  }

  /* AABB-verplaatsing tegen het tegelgrid, as-per-as */
  function beweeg(e, dt) {
    e.x += e.vx * dt;
    let tx0 = Math.floor(e.x / TEGEL), tx1 = Math.floor((e.x + e.b - 1) / TEGEL);
    let ty0 = Math.floor(e.y / TEGEL), ty1 = Math.floor((e.y + e.h - 1) / TEGEL);
    if (e.vx > 0) { for (let ty = ty0; ty <= ty1; ty++) if (solide(tegelOp(tx1, ty))) { e.x = tx1 * TEGEL - e.b; e.vx = 0; break; } }
    else if (e.vx < 0) { for (let ty = ty0; ty <= ty1; ty++) if (solide(tegelOp(tx0, ty))) { e.x = (tx0 + 1) * TEGEL; e.vx = 0; break; } }
    e.y += e.vy * dt;
    tx0 = Math.floor(e.x / TEGEL); tx1 = Math.floor((e.x + e.b - 1) / TEGEL);
    ty0 = Math.floor(e.y / TEGEL); ty1 = Math.floor((e.y + e.h - 1) / TEGEL);
    e.opGrond = false;
    if (e.vy > 0) { for (let tx = tx0; tx <= tx1; tx++) if (solide(tegelOp(tx, ty1))) { e.y = ty1 * TEGEL - e.h; e.vy = 0; e.opGrond = true; break; } }
    else if (e.vy < 0) { for (let tx = tx0; tx <= tx1; tx++) if (solide(tegelOp(tx, ty0))) { e.y = (ty0 + 1) * TEGEL; e.vy = 0; break; } }
  }

  /* ---------- invoer ---------- */
  const GAME_TOETSEN = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'a', 'd', 'w', 's', 'j', 'k', 'x', 'z', 'q'];
  function opToetsNeer(e) {
    if (staat === 'uit') return;
    const k = e.key.toLowerCase();
    if (k === 'escape') { e.preventDefault(); slaOver(); return; }
    const spelToets = GAME_TOETSEN.indexOf(k) !== -1;
    /* config & epiloog: elke druk is "verder" (Enter mag daar ook) */
    if (staat === 'config') {
      if (!e.repeat && (spelToets || k === 'enter')) { e.preventDefault(); configVolgende(); }
      return;
    }
    if (staat === 'val') {
      if (!e.repeat && (spelToets || k === 'enter') && valT > 1.5) { e.preventDefault(); startEpiloog(); }
      return;
    }
    if (staat === 'epiloog') {
      if (!e.repeat && (spelToets || k === 'enter')) {
        e.preventDefault();
        if (epi && epi.klaar) beeindig(); else if (epi) epi.spoed = true;
      }
      return;
    }
    if (staat === 'wissel') { if (spelToets) e.preventDefault(); return; }
    /* intro: ELKE toets spoelt door (zoals de hint belooft) — ook Enter e.d. */
    if (staat === 'intro' && !e.repeat) { e.preventDefault(); introT = introT >= 10.2 ? 11.6 : 10.4; return; }
    if (cine && spelToets && !e.repeat && cine.t < 2.2 && cine.t > 0.3) { e.preventDefault(); slaKeynoteOver(); return; }
    if (spelToets) {
      e.preventDefault();
      if (!e.repeat && (k === 'w' || k === 'arrowup' || k === ' ')) held && (held.sprongBuf = SPRONGBUFFER);
      if (!e.repeat && (k === 'j' || k === 'x')) vuurBuf = 0.1;
      if (!e.repeat && (k === 'k' || k === 'z')) worpBuf = 0.15;
      if (!e.repeat && k === 'q') wisselMasker();
      toetsen.add(k);
    }
  }
  function opToetsOp(e) { toetsen.delete(e.key.toLowerCase()); }
  /* focusverlies (alt-tab) mist keyups → alle gehouden input loslaten */
  function opFocusWeg() { toetsen.clear(); aanraking = { stickId: null, stickX0: 0, dx: 0, knoppen: {} }; }

  function invoer() {
    const links = toetsen.has('arrowleft') || toetsen.has('a') || aanraking.dx < -6;
    const rechts = toetsen.has('arrowright') || toetsen.has('d') || aanraking.dx > 6;
    const vuur = toetsen.has('j') || toetsen.has('x') || aanraking.knoppen.vuur !== undefined || vuurBuf > 0;
    const omhoog = toetsen.has('arrowup') || toetsen.has('w') || aanraking.knoppen.spring !== undefined;
    const worpKnop = toetsen.has('k') || toetsen.has('z') || aanraking.knoppen.worp !== undefined || worpBuf > 0;
    return { links, rechts, vuur, worpKnop, omhoog };
  }

  /* touch: linkerhelft = loop-strook, rechtsonder drie knoppen
     (één const: renderHud + pointerdown vroegen elk frame een vers object) */
  const KNOP_ZONES = {
    spring: { x: BREED - 24, y: HOOG - 52, r: 13 },
    vuur:   { x: BREED - 52, y: HOOG - 26, r: 13 },
    worp:   { x: BREED - 22, y: HOOG - 24, r: 11 }
  };
  function knopZones() { return KNOP_ZONES; }
  let schermRect = null;   /* gecachete bounding-rect: geen layout-query per pointermove */
  function canvasPunt(e) {
    const r = schermRect || (schermRect = schermCanvas.getBoundingClientRect());
    return { x: (e.clientX - r.left) / r.width * BREED, y: (e.clientY - r.top) / r.height * HOOG };
  }
  function opPointerNeer(e) {
    if (staat === 'uit') return;
    schermRect = null;   /* per tik één verse rect; de moves erna hergebruiken hem */
    e.preventDefault();
    if (schermCanvas.setPointerCapture) { try { schermCanvas.setPointerCapture(e.pointerId); } catch (err) {} }
    if (staat === 'intro') { introT = introT >= 10.2 ? 11.6 : 10.4; return; }
    if (staat === 'config') { configVolgende(); return; }
    if (staat === 'val') { if (valT > 1.5) startEpiloog(); return; }
    if (staat === 'epiloog') { if (epi && epi.klaar) beeindig(); else if (epi) epi.spoed = true; return; }
    if (staat === 'wissel') return;
    /* een tik slaat de keynote van de middenmanager over */
    if (cine && cine.t > 0.3 && cine.t < 2.2) { slaKeynoteOver(); return; }
    const p = canvasPunt(e);
    /* tik op de masker-chips linksboven = wisselen */
    if (maskers.length > 1 && p.x < 64 && p.y < 22) { wisselMasker(); return; }
    const z = knopZones();
    for (const naam in z) {
      const dx = p.x - z[naam].x, dy = p.y - z[naam].y;
      if (dx * dx + dy * dy <= z[naam].r * z[naam].r * 1.7) {
        aanraking.knoppen[naam] = e.pointerId;
        if (naam === 'spring' && held) held.sprongBuf = SPRONGBUFFER;
        if (naam === 'vuur') vuurBuf = 0.1;
        if (naam === 'worp') worpBuf = 0.15;
        return;
      }
    }
    if (p.x < BREED * 0.45) { aanraking.stickId = e.pointerId; aanraking.stickX0 = p.x; aanraking.dx = 0; }
  }
  function opPointerBeweeg(e) {
    if (aanraking.stickId !== e.pointerId) return;
    const p = canvasPunt(e);
    aanraking.dx = klem(p.x - aanraking.stickX0, -20, 20);
  }
  function opPointerOp(e) {
    if (aanraking.stickId === e.pointerId) { aanraking.stickId = null; aanraking.dx = 0; }
    for (const naam in aanraking.knoppen) if (aanraking.knoppen[naam] === e.pointerId) delete aanraking.knoppen[naam];
  }

  /* ---------- de wereld bijwerken ---------- */
  let spoorTik = 0;   /* 60Hz-stappenteller: trails spawnen op een kloktik i.p.v. elke stap */
  function updateSpel(dt) {
    spoorTik++;
    const inp = invoer();
    const h = held;
    if (vuurBuf > 0) vuurBuf -= dt;
    if (worpBuf > 0) worpBuf -= dt;
    if (fakkelDip > 0) fakkelDip = Math.max(0, fakkelDip - dt * 1.25);

    /* — de held — */
    if (h.wachtT > 0) {   /* "u wordt even in de wacht gezet" (respawn) */
      h.wachtT -= dt;
      if (h.wachtT <= 0) { h.x = lvl.spelerStart.x; h.y = lvl.spelerStart.y; h.vx = h.vy = 0; h.hartjes = 3; h.raakbaar = 2; }
    } else {
      const tempo = LOOPSNELHEID * (1 + 0.16 * upgrades.koffie);
      h.vx = inp.links ? -tempo : inp.rechts ? tempo : 0;
      if (inp.links) h.richting = -1; if (inp.rechts) h.richting = 1;
      /* de ladder: sta je erin en duw je omhoog/omlaag, dan klim je */
      const omlaag = toetsen.has('arrowdown') || toetsen.has('s');
      const midTx = Math.floor((h.x + h.b / 2) / TEGEL);
      const opLadder = tegelOp(midTx, Math.floor((h.y + h.h / 2) / TEGEL)) === T.LADDER ||
                       tegelOp(midTx, Math.floor((h.y + h.h - 1) / TEGEL)) === T.LADDER;
      if (opLadder && (inp.omhoog || omlaag) && !h.klimt) h.klimt = true;
      if (h.klimt && !opLadder) h.klimt = false;
      if (h.klimt) {
        h.vy = inp.omhoog ? -58 : omlaag ? 58 : 0;
        h.coyote = COYOTE; h.dubbelOp = true;
        if (h.sprongBuf > 0) { h.vy = -SPRONGKRACHT * 0.75; h.klimt = false; h.sprongBuf = 0; sfx('energie', 0.15); }
      } else {
        h.vy = Math.min(h.vy + ZWAARTEKRACHT * dt, 300);
        if (h.opGrond) { h.coyote = COYOTE; h.dubbelOp = true; } else h.coyote -= dt;
        if (h.sprongBuf > 0) {
          h.sprongBuf -= dt;
          if (h.coyote > 0) { h.vy = -SPRONGKRACHT; h.coyote = 0; h.sprongBuf = 0; sfx('energie', 0.15); }
          else if (h.dubbelOp) {
            /* DE DUBBELJUMP — een tweede sprong in de lucht, met een ring van vonken */
            h.vy = -SPRONGKRACHT * 0.9; h.dubbelOp = false; h.sprongBuf = 0;
            spawnSchok(h.x + h.b / 2, h.y + h.h, 9, '#5fd0d8');
            spawnVonk(h.x + h.b / 2, h.y + h.h - 1, '#ffd23f', 8);
            spawnVonk(h.x + h.b / 2, h.y + h.h - 1, '#ffffff', 4);
            h.dubbelT = 0.22;   /* korte spin-flair in de render */
            sfx('energie', 0.12);
          }
        }
      }
      if (h.dubbelT > 0) h.dubbelT -= dt;
      const wilLopen = inp.links || inp.rechts;
      beweeg(h, dt);
      /* een bureau van één tegel hoog mag de vaart niet breken: auto-hupje
         (alleen als de weg erboven vrij is — echte muren blijven muren) */
      if (h.opGrond && wilLopen && h.vx === 0) {
        const voorX = h.richting > 0 ? Math.floor((h.x + h.b + 1) / TEGEL) : Math.floor((h.x - 2) / TEGEL);
        const voetRij = Math.floor((h.y + h.h - 1) / TEGEL);
        const vrijBoven = !solide(tegelOp(voorX, voetRij - 1)) && !solide(tegelOp(voorX, voetRij - 2)) &&
          !solide(tegelOp(Math.floor((h.x + h.b / 2) / TEGEL), Math.floor(h.y / TEGEL) - 1));
        if (solide(tegelOp(voorX, voetRij)) && vrijBoven) h.vy = -150;
      }
      if (h.vx !== 0 && h.opGrond) h.loopT += dt * 9; else if (h.opGrond) h.loopT = 0;
      if (h.raakbaar > 0) h.raakbaar -= dt;

      /* DE BIJL — zwaai: sloopt 3×3 vóór je (dit is het speelgoed) */
      h.zwaaiKlok -= dt;
      if (h.zwaaiT > 0) h.zwaaiT -= dt;
      if (inp.vuur && h.zwaaiKlok <= 0) {
        h.zwaaiKlok = 0.12 * Math.pow(0.85, upgrades.koffie); h.zwaaiT = 0.09; vuurBuf = 0;
        h.zwaaiOmhoog = inp.omhoog;   /* houd omhoog in = boven je slaan (plafonds!) */
        const rx = inp.omhoog ? h.x + h.b / 2 : h.x + h.b / 2 + h.richting * 11;
        const ry = inp.omhoog ? h.y - 9 : h.y + 7;
        const geraakt = sloopGebied(rx, ry, 9, 1);
        let vijandRaak = false;
        for (const d of drones) {
          if (!d.dood && Math.abs(d.x + 4 - rx) < 12 && Math.abs(d.y + 4 - ry) < 12) { raakVijand(d, 1); vijandRaak = true; }
        }
        if (geraakt || vijandRaak) {
          duwPartikel({ soort: 'ster', x: rx + (inp.omhoog ? 0 : h.richting * 4), y: inp.omhoog ? ry - 2 : ry, dx: inp.omhoog ? 0 : h.richting, t: 0.08, maxT: 0.08 });
          kick(inp.omhoog ? 0 : h.richting * 1.2, inp.omhoog ? -1.2 : 0);
        }
        raakInteracties(rx, ry, 12);
        raakBaasPunt(rx, ry);
        raakTlPunt(rx, ry, 10);
        /* VERGADERING: elke zwaai stoot een schokgolf uit die veel breder sloopt */
        if (upgrades.schok) {
          const sr = 16 + upgrades.schok * 6;
          spawnSchok(rx, ry, sr, '#5fd0d8'); schud(1.2); schermFlits = Math.max(schermFlits, 0.05);
          sloopGebied(rx, ry, sr * 0.7, 1);
          for (const d of drones) if (!d.dood && Math.hypot(d.x + 4 - rx, d.y + 4 - ry) < sr) raakVijand(d, 1);
          raakBaasPunt(rx, ry);
          sfx('zwareklap', 0.06);
        }
        for (let mi = 0; mi < upgrades.mail; mi++) {
          post.push(inp.omhoog
            ? { x: h.x + h.b / 2, y: h.y - 4, vx: (mi - (upgrades.mail - 1) / 2) * 40, vy: -190, t: 0.8 }
            : { x: h.x + h.b / 2, y: h.y + 5, vx: h.richting * 190, vy: (mi - (upgrades.mail - 1) / 2) * 34, t: 0.8 });
        }
        if (upgrades.mail) sfx('trek', 0.1);
        if (!geraakt) sfx('smeed', 0.12);
      }
      /* DE SIGNATUUR (K / WORP) — elk masker zijn eigen sloopgereedschap:
         Slachter = de boemerang-bijl · Gifmagiër = de gifboog die door
         muren sijpelt · Thoverk = de lichtstraal die vooruit brandt */
      if (signKlok > 0) signKlok -= dt;
      if (inp.worpKnop) {
        const mk = maskers[maskerIdx];
        if (mk === 'slachter' && !worp) {
          worpBuf = 0;
          worp = { x: h.x + h.b / 2, y: h.y + 6, vx: h.richting * 170, terug: false, spin: 0 };
          sfx('energie', 0.2);
        } else if (mk === 'gifmagier' && !gifbal && signKlok <= 0) {
          worpBuf = 0; signKlok = 1.1;
          gifbal = { x: h.x + h.b / 2, y: h.y + 3, vx: h.richting * 150, vy: -140, t: 1.5, hitKlok: 0, splits: true };
          sfx('energie', 0.2);
        } else if (mk === 'thoverk' && signKlok <= 0) {
          worpBuf = 0; signKlok = 1.3;
          for (let i = 1; i <= 10; i++) bomWachtrij.push({ px: h.x + h.b / 2 + h.richting * i * 11, py: h.y + 7, straal: 7, t: i * 0.03 });
          sfx('energie', 0.15);
        }
      }

      /* de lift bereikt = omhoog, één laag dichter bij B.A.A.S. — op de
         directie-etage komt eerst het dak naar beneden (let it burn) */
      const L = lvl.lift;
      if (L && !dakval && h.x + h.b > L.x && h.x < L.x + L.b && h.y + h.h > L.y && h.y < L.y + L.h) {
        if (lvl.dakval) {
          /* het dak breekt open, in vier tempi: een barst loopt over het plafond,
             gips sijpelt eruit, de platen vallen met een inverse klap, en door
             het gat valt koud maanlicht vol regen — koud boven, vuur onder */
          dakval = { t: 0, x0: camX, klap: false, flits: false };
          for (let i = 0; i < 12; i++) {
            bomWachtrij.push({ px: camX + 16 + i * 26 + Math.random() * 10, py: 2 * TEGEL + 6, straal: 12, t: 0.55 + i * 0.1 });
          }
          for (const tl of tls) losTl(tl, false);
          voegTrauma(0.4); sfx('inzakken', 0.2);
          verbleekMoment(1.6, true);
        } else {
          startWissel(lvlIdx + 1);
        }
      }
      if (dakval) {
        dakval.t += dt;
        if (dakval.t > 0.4 && dakval.t < 0.95 && Math.random() < dt * 40) {
          duwPartikel({ soort: 'gruis', x: dakval.x0 + Math.random() * BREED, y: TEGEL + 1, vx: (Math.random() - 0.5) * 6, vy: 10, t: 0.9, kleur: '#8a8168', g: 1, stuit: false });
        }
        if (dakval.t > 0.55 && !dakval.klap) { dakval.klap = true; impact(2, true, true); voegTrauma(1); }
        if (dakval.t > 1.6 && !dakval.flits && fx) { dakval.flits = true; fx.forceerBliksem(); }
        if (dakval.t > 2.3) { dakval = null; startWissel(lvlIdx + 1); }
      }
      /* het paneel is open én je staat ervoor → het configscherm */
      if (hal && hal.paneel && h.x + h.b > lvl.luik.x - 3 && h.x < lvl.luik.x + lvl.luik.b + 3 &&
          h.y + h.h > lvl.luik.y - 2 && h.y < lvl.luik.y + lvl.luik.h + 4) {
        startConfig();
        return;
      }
    }

    /* — de boemerang — */
    if (worp) {
      worp.spin += dt * 20;
      worp.x += worp.vx * dt;
      if (!worp.terug) {
        worp.vx *= (1 - 2.6 * dt);
        if (Math.abs(worp.vx) < 30) { worp.terug = true; explosie(worp.x, worp.y, 15); }   /* het keerpunt knalt — hard */
      } else {
        const doel = h.x + h.b / 2;
        worp.vx += (doel > worp.x ? 1 : -1) * 480 * dt;
        worp.vx = klem(worp.vx, -220, 220);
        if (Math.abs(worp.x - doel) < 8) worp = null;
      }
      if (worp) {
        worp.y += Math.sin(worp.spin * 0.5) * 6 * dt;
        worp.baasKlok = (worp.baasKlok || 0) - dt;
        /* vurige spinnende trail achter de boemerang-bijl (op kloktik: mobiel 20Hz) */
        if (spoorTik % spoorStap === 0) spawnSpoor(worp.x, worp.y, worp.spin % 2 < 1 ? '#ff9c3f' : '#ffd23f', 3);
        sloopGebied(worp.x, worp.y, 6, 1);
        for (const d of drones) if (!d.dood && Math.abs(d.x + 4 - worp.x) < 10 && Math.abs(d.y + 4 - worp.y) < 10) raakVijand(d, 2);
        raakInteracties(worp.x, worp.y, 10);
        raakTlPunt(worp.x, worp.y, 8);
        if (worp.baasKlok <= 0 && raakBaasPunt(worp.x, worp.y)) worp.baasKlok = 0.3;
      }
    }

    /* — de gifboog: een parabool die door alles heen sijpelt — */
    if (gifbal) {
      gifbal.t -= dt; gifbal.hitKlok -= dt;
      gifbal.x += gifbal.vx * dt; gifbal.y += gifbal.vy * dt; gifbal.vy += 400 * dt;
      sloopGebied(gifbal.x, gifbal.y, 5, 1);
      if (gifbal.hitKlok <= 0) {
        for (const d of drones) {
          if (!d.dood && Math.abs(d.x + 5 - gifbal.x) < 10 && Math.abs(d.y + 4 - gifbal.y) < 10) { raakVijand(d, 2); gifbal.hitKlok = 0.25; break; }
        }
        if (gifbal.hitKlok <= 0 && raakBaasPunt(gifbal.x, gifbal.y)) gifbal.hitKlok = 0.3;
      }
      raakInteracties(gifbal.x, gifbal.y, 8);
      raakTlPunt(gifbal.x, gifbal.y, 8);
      /* giftige neon-trail: groen met paarse spatjes (op kloktik, lagere vonkrate op lite) */
      if (spoorTik % spoorStap === 0) spawnSpoor(gifbal.x, gifbal.y, Math.random() < 0.3 ? '#c86fe0' : '#79c045', 3);
      if (Math.random() < dt * (liteModus ? 10 : 24)) spawnVonk(gifbal.x, gifbal.y, '#79c045', 1);
      /* de waaier: op het hoogste punt splitst de gifboog in drie */
      if (gifbal && gifbal.splits && gifbal.vy > 0) {
        gifbal.splits = false;
        explosie(gifbal.x, gifbal.y, 8);
        gifbal.vx *= 1.3;
      }
      if (gifbal && (gifbal.t <= 0 || gifbal.y > lvl.rijen * TEGEL)) { explosie(gifbal.x, gifbal.y, 10); gifbal = null; }
    }

    /* — het machinepark: drones, torentjes, slangen, kopieerbots — */
    const hx = h.x + h.b / 2, hy = h.y + h.h / 2;
    const nieuweKopieen = [];
    for (const d of drones) {
      if (d.dood) continue;
      if (d.sterf) { sterfManager(d, dt); continue; }
      d.t += dt;
      if (d.soort === 'drone') {
        d.y = d.y0 + Math.sin(d.t * 1.7) * 10;
        d.x = d.x0 + Math.sin(d.t * 0.8) * 14;
        d.klok -= dt;
        const dx = hx - (d.x + 4), dy = hy - (d.y + 4);
        const afst = Math.hypot(dx, dy);
        if (d.klok <= 0 && afst < 95 && h.wachtT <= 0) {
          d.klok = 1.6 + Math.random() * 0.7;
          const sn = 72 / (afst || 1);
          kogels.push({ x: d.x + 4, y: d.y + 6, vx: dx * sn, vy: dy * sn, t: 3 });
          sfx('blok', 0.1);
        }
      } else if (d.soort === 'torentje') {
        /* jouw Glimlachquotum, nu met loop: schiet 🙂 op alles wat leeft */
        d.klok -= dt;
        const afst = Math.hypot(hx - (d.x + 5), hy - (d.y + 3));
        if (d.klok <= 0 && afst < 115 && h.wachtT <= 0) {
          d.klok = 1.5;
          const sn = 80 / (afst || 1);
          kogels.push({ x: d.x + 5, y: d.y + 2, vx: (hx - d.x - 5) * sn, vy: (hy - d.y - 2) * sn, t: 3, smiley: true });
          sfx('blok', 0.1);
        }
      } else if (d.soort === 'slang') {
        const voorX = Math.floor((d.x + (d.richting > 0 ? 15 : -2)) / TEGEL);
        const rij = Math.floor((d.y + 3) / TEGEL);
        if (solide(tegelOp(voorX, rij)) || !solide(tegelOp(voorX, rij + 1))) d.richting *= -1;
        else d.x += d.richting * 55 * dt;
      } else if (d.soort === 'slijm') {
        /* een ontsnapt onderdaantje van de Slijmkoning — hupst je achterna */
        d.vy = Math.min(d.vy + ZWAARTEKRACHT * dt, 300);
        d.klok -= dt;
        if (d.opGrond && d.klok <= 0) { d.klok = 0.9 + Math.random() * 0.5; d.vy = -190; d.vx = Math.sign(hx - d.x) * 44; sfx('gif', 0.4); }
        if (d.opGrond) d.vx *= (1 - 6 * dt);
        beweeg(d, dt);
      } else if (d.soort === 'kaart') {
        /* een vloekkaart uit je eigen dek — fladdert en duikt */
        d.y = d.y0 + Math.sin(d.t * 2.2) * 14;
        d.x += Math.sign(hx - d.x) * 26 * dt;
        d.x0 = d.x;
      } else if (d.soort === 'manager') {
        /* DE MIDDENMANAGER — loopt traag op je af en spuwt een waaier van 🙂 */
        if (!d.gezien && Math.abs(hx - (d.x + 6)) < 150 && h.wachtT <= 0) {
          /* de keynote: alles valt stil, de camera zoekt hem op */
          d.gezien = true;
          cine = { t: 0, doel: d, camX0: camX, klak: 0 };
          balken(2.4);
          if (window.Klank && Klank.duck) { try { Klank.duck(0.25, 2.2); } catch (e) {} }
        }
        /* schadestaten: rook uit zijn pak, zijn das in de fik, dan vonken */
        const hpF = d.hp / (d.hpMax || 14);
        if (hpF < 0.5 && Math.random() < dt * 7) duwPartikel({ soort: 'rook', tint: 'koud', x: d.x + 3 + Math.random() * 6, y: d.y + 2, vx: (Math.random() - 0.5) * 6, vy: -14, t: 0.8, maxT: 1.1, r: 2 });
        if (hpF < 0.5 && Math.random() < dt * 6) spawnAs(d.x + 6, d.y + 6);
        if (hpF < 0.25 && Math.random() < dt * 3.5) spawnVonk(d.x + 6, d.y + 5, '#ffd23f', 3);
        d.vy = Math.min(d.vy + ZWAARTEKRACHT * dt, 300);
        d.vx = Math.abs(hx - (d.x + 6)) > 22 ? Math.sign(hx - (d.x + 6)) * 30 : 0;
        const oudX = d.x;
        beweeg(d, dt);
        if (d.opGrond && Math.abs(d.x - oudX) < 0.15 && d.vx !== 0) d.vy = -185;   /* hupt over obstakels */
        d.klok -= dt;
        if (d.klok <= 0 && Math.abs(hx - d.x) < 170 && h.wachtT <= 0) {
          d.klok = 1.5;
          const cx0 = d.x + 6, cy0 = d.y + 5, ang0 = Math.atan2(hy - cy0, hx - cx0);
          for (const off of [-0.34, 0, 0.34]) {
            const a = ang0 + off;
            kogels.push({ x: cx0, y: cy0, vx: Math.cos(a) * 82, vy: Math.sin(a) * 82, t: 3.2, smiley: true });
          }
          sfx('blok', 0.05);
        }
      } else if (d.soort === 'kopieerbot' || d.soort === 'kopie') {
        const snel = d.soort === 'kopie' ? 46 : 20;
        d.vx = Math.abs(hx - (d.x + 5)) > 10 ? Math.sign(hx - (d.x + 5)) * snel : 0;
        d.vy = Math.min(d.vy + ZWAARTEKRACHT * dt, 300);
        const oudX = d.x;
        beweeg(d, dt);
        if (d.opGrond && Math.abs(d.x - oudX) < 0.15 && d.vx !== 0) d.vy = -170;
        if (d.soort === 'kopieerbot') {
          d.spawnKlok -= dt;
          if (d.spawnKlok <= 0 && d.kids < 2 && Math.abs(hx - d.x) < 150) {
            d.spawnKlok = 3.2; d.kids++;
            nieuweKopieen.push(maakVijand({ soort: 'kopie', x: d.x, y: d.y, ouder: d }));
            spawnVonk(d.x + 5, d.y + 4, '#efe9d6', 5);
            sfx('smeed', 0.1);
          }
        }
      }
      /* contact kost een tik welzijn (torentjes niet: die schieten alleen) */
      if (d.soort !== 'torentje' && h.raakbaar <= 0 && h.wachtT <= 0 &&
          Math.abs(d.x + 5 - hx) < 9 && Math.abs(d.y + 4 - hy) < 10) raakHeld();
    }
    if (nieuweKopieen.length) drones.push(...nieuweKopieen);

    /* — 0u06-kogeltjes — */
    for (const k of kogels) {
      k.t -= dt; k.x += k.vx * dt; k.y += k.vy * dt;
      const tt = tegelOp(Math.floor(k.x / TEGEL), Math.floor(k.y / TEGEL));
      if (solide(tt)) { k.t = 0; spawnVonk(k.x, k.y, '#ffd23f', 3); }
      else if (h.raakbaar <= 0 && h.wachtT <= 0 && k.x > h.x - 1 && k.x < h.x + h.b + 1 && k.y > h.y - 1 && k.y < h.y + h.h + 1) { k.t = 0; raakHeld(); }
    }
    kogels = kogels.filter(k => k.t > 0);

    /* — bevrijde collega's: simpele stoet achter de held aan — */
    for (let i = 0; i < collegas.length; i++) {
      const c = collegas[i];
      const doel = i === 0 ? h : collegas[i - 1];
      const dx = (doel.x - 10 * Math.sign(doel.x - c.x)) - c.x;
      c.vx = Math.abs(dx) > 12 ? Math.sign(dx) * 62 : 0;
      c.vy = Math.min(c.vy + ZWAARTEKRACHT * dt, 300);
      const oudX = c.x;
      beweeg(c, dt);
      if (c.opGrond && Math.abs(c.x - oudX) < 0.2 && c.vx !== 0) c.vy = -180;   /* hupje over een obstakel */
      if (Math.abs(c.x - h.x) > BREED) { c.x = h.x - 12; c.y = h.y; c.vy = 0; }  /* te ver achter → bijtrekken */
      c.loopT += Math.abs(c.vx) > 1 ? dt * 8 : 0;
      if (c.lichtT > 0) { c.lichtT -= dt; if (c.lichtT <= 0) { c.licht = 1; spawnVonk(c.x + 3, c.y + 5, '#ffd9a0', 4); sfx('schitter', 0.1); } }
    }

    /* — de upgrade-kaarten: kaarten die je aanvallen pimpen — */
    for (const p of pickups) {
      if (p.op) continue;
      if (Math.abs(p.x + 4 - hx) < 10 && Math.abs(p.y + 4 - hy) < 12) {
        p.op = true;
        upgrades[p.soort]++;
        splash = { t: 2.1, kaart: p.soort };   /* de kaart-splash: even tonen wat je won */
        spawnVonk(p.x + 4, p.y + 4, '#ffd23f', 12);
        sfx('schitter', 0.05); sfx('kaart', 0.05);
      }
    }

    /* — de mailtjes: enveloppen die alles doorboren — */
    for (const m of post) {
      m.t -= dt; m.x += m.vx * dt; m.y += (m.vy || 0) * dt;
      if (spoorTik % spoorStap === 0) spawnSpoor(m.x, m.y, regenboog(m.x * 0.06), 2);   /* regenboog-post: CC: iedereen */
      sloopGebied(m.x, m.y, 4, 1);
      raakTlPunt(m.x, m.y, 6);
      for (const d of drones) {
        if (!d.dood && Math.abs(d.x + 5 - m.x) < 9 && Math.abs(d.y + 4 - m.y) < 9) { raakVijand(d, 1); m.t = 0; break; }
      }
      if (m.t > 0) raakBaasPunt(m.x, m.y) && (m.t = 0);
    }
    post = post.filter(m => m.t > 0);

    /* — de serverhal: het systeem verdedigt zichzelf beleefd — */
    if (hal) {
      hal.t += dt;
      if (hal.regelT > 0) hal.regelT -= dt;
      if (hal.flitsT > 0) hal.flitsT -= dt;
      hal.spawnKlok -= dt;
      if (!hal.paneel && hal.spawnKlok <= 0 && drones.filter(d => !d.dood).length < 3) {
        hal.spawnKlok = 4;
        drones.push(maakVijand({ soort: 'drone', x: (5 + Math.random() * 20) * TEGEL, y: 3 * TEGEL }));
      }
      /* het dak: rook uit de gehavende kasten, vlammen uit het gebouw onder je
         (op lite/mobiel halve spawnrate — de scène blijft branden, de gpu niet) */
      if (hal.kapot) {
        if (Math.random() < dt * (liteModus ? 2.5 : 5)) duwPartikel({ soort: 'rook', x: lvl.baas.x + 8 + Math.random() * (lvl.baas.b - 16), y: lvl.baas.y - 2, vx: (Math.random() - 0.5) * 8, vy: -14 - Math.random() * 10, t: 1.2 + Math.random(), maxT: 2.2, r: 2 + Math.random() * 3 });
        if (Math.random() < dt * (liteModus ? 5 : 10)) {
          const links2 = Math.random() < 0.5;
          const fx = links2 ? (2 + Math.random() * 4) * TEGEL : (lvl.kols - 6 + Math.random() * 4) * TEGEL;
          duwPartikel({ soort: 'vonk', x: fx, y: (lvl.rijen - 5) * TEGEL, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 50, t: 0.5 + Math.random() * 0.4, kleur: Math.random() < 0.5 ? '#ff7a2f' : '#ffd23f', g: 2 });
          if (Math.random() < 0.3) duwPartikel({ soort: 'rook', x: fx, y: (lvl.rijen - 5) * TEGEL, vx: 0, vy: -18, t: 1.4, maxT: 2, r: 3 });
        }
      }
      /* wie zélf stopt met slaan, krijgt het paneel (vangnet: na 18s sowieso) */
      if (!hal.paneel && ((hal.baasHits >= 4 && tijd - hal.laatsteHit > 2.5) || hal.t > 18)) {
        hal.paneel = true;
        schud(2); sfx('schitter', 0.1);
        spawnVonk(lvl.luik.x + 5, lvl.luik.y + 10, '#ffb347', 10);
      }
    }

    /* — kettingreacties & instortingen — */
    verwerkBommen(dt);
    verwerkInstort(dt);
    updateTls(dt);
    if (glasWachtrij.length) {
      const rest = [];
      for (const g of glasWachtrij) { g.t -= dt; if (g.t > 0) rest.push(g); else raakTegel(g.tx, g.ty, 99); }
      glasWachtrij = rest;
    }
    /* de wrakken: een gevelde drone tolt, rookt, stuitert en boort zich dan in een tegel */
    for (const w of wrakken) {
      w.t -= dt;
      w.vy = Math.min(w.vy + ZWAARTEKRACHT * 0.6 * dt, 260);
      const vxOud = w.vx;
      beweeg(w, dt); w.rot += w.vr * dt;
      if (w.vx === 0 && vxOud !== 0) { w.botsing++; w.vx = -vxOud * 0.6; spawnVonk(w.x + 4, w.y + 4, '#ffd23f', 5); sfx('klap', 0.05); }
      if (spoorTik % (liteModus ? 4 : 2) === 0) {
        duwPartikel({ soort: 'rook', tint: 'koud', x: w.x + 4, y: w.y + 4, vx: 0, vy: -6, t: 0.7, maxT: 1, r: 2 });
        spawnVonk(w.x + 4, w.y + 4, '#ffb347', 1);
      }
      if (w.botsing >= (liteModus ? 1 : 2) || w.t <= 0 || w.opGrond) { w.weg = true; explosie(w.x + 4, w.y + 4, 11); }
    }
    if (wrakken.length) wrakken = wrakken.filter(w => !w.weg);
    updateMotes(dt);

    /* — partikels / popups / camera — */
    for (const p of partikels) {
      p.t -= dt;
      if (p.soort === 'vuurbal' || p.soort === 'schok' || p.soort === 'spoor' || p.soort === 'gloei' || p.soort === 'ster') continue;   /* staan stil, vervagen in de render */
      if (p.soort === 'vonkboog') continue;   /* puur beeld: het licht zelf hangt aan c.lichtT */
      if (p.soort === 'crtuit') continue;
      if (p.soort === 'brok' || p.soort === 'scherf') {
        if (p.lig) continue;
        p.vy = Math.min(p.vy + ZWAARTEKRACHT * 0.55 * dt, 260);
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.soort === 'brok') p.rot += p.vr * dt; else p.hoek += p.vr * dt;
        const hoog2 = p.h || 1;
        if (p.vy > 0 && solide(tegelOp(Math.floor((p.x + 1) / TEGEL), Math.floor((p.y + hoog2) / TEGEL)))) {
          if (p.stuit) { p.vy *= -0.35; p.vx *= 0.5; p.vr *= 0.3; p.stuit = false; }
          else {
            /* blijft liggen: puin op de vloer (op lite verdwijnt het meteen) */
            p.lig = true; p.vx = p.vy = 0;
            p.y = Math.floor((p.y + hoog2) / TEGEL) * TEGEL - hoog2;
            p.rot = Math.round(p.rot); p.hoek = Math.round(p.hoek);
            p.t = liteModus ? 0.05 : Math.min(p.t, 1.4 + Math.random() * 1.6);
          }
        }
        continue;
      }
      if (p.soort === 'stof') { p.x += p.vx * dt; p.vx *= (1 - 2.4 * dt); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.soort === 'as') {
        if (p.warmte != null) {
          /* een explosiesintel koelt af en valt dan neer */
          p.warmte = Math.max(0, p.warmte - dt * 0.75);
          p.vy = p.warmte < 0.3 ? Math.min(p.vy + 60 * dt, 30) : p.vy * (1 - 1.6 * dt);
          p.vx *= (1 - 1.2 * dt);
        } else p.vy *= (1 - 0.5 * dt);
        p.x += Math.sin(p.t * 4 + p.fase) * 8 * dt; continue;
      }
      if (p.soort === 'rook') { p.vy *= (1 - 0.6 * dt); continue; }
      if (p.soort === 'papier') {
        p.vy = Math.min(p.vy + 80 * dt, 24);
        p.vx *= (1 - 1.5 * dt);
        p.x += Math.sin(p.t * 3 + p.fase) * 10 * dt;
        continue;
      }
      p.vy += ZWAARTEKRACHT * 0.55 * dt * (p.g > 1 ? 1 : 0.3);
      /* puin stuitert één keer op de vloer — dat verkoopt het gewicht */
      if (p.stuit && p.vy > 0 && solide(tegelOp(Math.floor(p.x / TEGEL), Math.floor((p.y + p.g) / TEGEL)))) {
        p.vy *= -0.42; p.vx *= 0.6; p.stuit = false;
      }
    }
    partikels = partikels.filter(p => p.t > 0 && p.y < lvl.rijen * TEGEL);
    for (const p of popups) { p.t -= dt; p.y -= 14 * dt; if (p.pop > 0) p.pop -= dt; }
    popups = popups.filter(p => p.t > 0);
    popupKlok -= dt;
    if (popupWachtrij > 0 && popupKlok <= 0) {
      popupKlok = 0.09;
      /* massasloop wordt geaggregeerd gefactureerd: −0u06 per blokje,
         bij een lawine één gebundelde creditnota ("−0u48") */
      const n = popupWachtrij >= 4 ? Math.min(popupWachtrij, 20) : 1;
      popupWachtrij -= n;
      const minuten = n * 6, u = (minuten / 60) | 0, m = minuten % 60;
      popup(h.x + h.b / 2 + (Math.random() - 0.5) * 24, h.y - 6 - Math.random() * 10,
        '-' + u + 'U' + (m < 10 ? '0' : '') + m);
      sfx('schitter', 0.25);
    }
    if (hudTekstT > 0) { hudTekstT -= dt; if (hudTekstT <= 0) hudTekst = null; }
    if (hintT > 0) {
      hintT -= dt;
      /* zodra er gelopen én gesloopt is, mag de hint snel weg */
      if (ontfactureerd > 1 && Math.abs(h.x - lvl.spelerStart.x) > 40) hintT = Math.min(hintT, 2);
    }

    /* — de SLOOPKETTING dooft langzaam als je even niets sloopt — */
    if (kettingT > 0) { kettingT -= dt; if (kettingT <= 0) { sloopKetting = 0; kettingPiek = 0; } }

    /* — sfeer: sintels dwarrelen op, zwaarder op een brandende etage —
       (op lite/mobiel op halve kracht: puur sfeer mag nooit frames kosten) */
    const brandt = hal && hal.kapot;
    if (Math.random() < dt * (brandt ? (liteModus ? 4.5 : 9) : (liteModus ? 1.6 : 3.5))) {
      spawnAs(camX + Math.random() * BREED, camY + HOOG - 2 - Math.random() * 6);
    }

    /* — de hartjes uit de sloop (DERTIENDE MAAND): vallen, blijven liggen, healen — */
    for (const ht of harten) {
      if (ht.op) continue;
      ht.t -= dt;
      ht.vy = Math.min(ht.vy + ZWAARTEKRACHT * 0.6 * dt, 200);
      ht.y += ht.vy * dt;
      if (ht.vy > 0 && solide(tegelOp(Math.floor((ht.x + 3) / TEGEL), Math.floor((ht.y + 6) / TEGEL)))) {
        ht.y = Math.floor((ht.y + 6) / TEGEL) * TEGEL - 6; ht.vy = 0; ht.opGrond = true;
      }
      if (h.wachtT <= 0 && Math.abs(ht.x + 2 - (h.x + h.b / 2)) < 9 && Math.abs(ht.y + 2 - (h.y + h.h / 2)) < 11) {
        ht.op = true;
        if (h.hartjes < 3) { h.hartjes++; popup(ht.x, ht.y - 4, '+1', '#ff6b8a'); sfx('schitter', 0.05); }
        else { popup(ht.x, ht.y - 4, 'VOL', '#8a8168'); }
        spawnVonk(ht.x + 2, ht.y + 2, '#ff6b8a', 8);
      }
    }
    harten = harten.filter(ht => !ht.op && ht.t > 0);

    /* de jeugddromen dwarrelen één voor één uit de opengebarsten kast */
    if (papierWachtrij > 0 && papierBron && Math.random() < dt * 14) {
      papierWachtrij--;
      duwPartikel({
        soort: 'papier', x: papierBron.x + Math.random() * 24, y: papierBron.y + Math.random() * 6,
        vx: (Math.random() - 0.5) * 26, vy: -34 - Math.random() * 40,
        t: 2.4 + Math.random(), fase: Math.random() * 6
      });
    }

    const doelCam = klem(h.x + h.b / 2 - BREED / 2, 0, lvl.kols * TEGEL - BREED);
    camX += (doelCam - camX) * Math.min(1, dt * 7);
    camY = klem(lvl.rijen * TEGEL - HOOG, 0, 999);
  }

  function raakVijand(d, schade) {
    if (d.sterf) return;
    d.hp -= schade;
    spawnVonk(d.x + 5, d.y + 4, '#ffd23f', 4);
    stop(d.hp <= 0 ? 'kill' : 'raak', d);
    if (d.hp <= 0) {
      d.dood = true;
      /* de laatste machine van de etage valt: de tijd houdt even de adem in */
      if (!drones.some(e => !e.dood) && !hal) slowmo(0.6, 0.3, true);
      bumpKetting(2);   /* een gevelde vijand voedt de SLOOPKETTING extra */
      if (d.soort === 'manager') {
        /* DE MIDDENMANAGER valt — in drie bedrijven (zie sterfManager) */
        d.dood = false; d.sterf = { t: 0, klok: 0 };
        stop('manager', d); impact(2, true, true);
        verbleekTot = Math.max(verbleekTot, tijd + 1.6); balken(2); slowmo(1.4, 0.3, true);
        schermFlits = Math.max(schermFlits, 0.12);
        sfx('dood', 0.2);
      } else if (d.soort === 'slijm') {
        spawnVonk(d.x + 5, d.y + 3, '#79c045', 14);
        spawnGruis(d.x + 5, d.y + 3, T.PLANT);
        popupWachtrij += 1;
        sfx('gif', 0.1);
      } else if (d.soort === 'kaart') {
        spawnVonk(d.x + 4, d.y + 4, '#8a5fc9', 10);
        for (let i = 0; i < 6; i++) duwPartikel({ soort: 'papier', x: d.x + Math.random() * 8, y: d.y + Math.random() * 8, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 30, t: 1.6 + Math.random(), fase: Math.random() * 6 });
        popupWachtrij += 1;
        sfx('flip', 0.1);
      } else if (d.soort === 'kopie') {
        /* een kopie poeft — meer was het nooit */
        if (d.ouder) d.ouder.kids = Math.max(0, d.ouder.kids - 1);
        spawnVonk(d.x + 5, d.y + 4, '#efe9d6', 8);
        popupWachtrij += 1;
        sfx('blok', 0.05);
      } else if (d.soort === 'drone') {
        /* de doodsspiraal: hij slaat op hol en boort zich pas dan ergens in */
        popupWachtrij += 3;
        const r = Math.random() < 0.5 ? -1 : 1;
        wrakken.push({ x: d.x, y: d.y, b: 8, h: 8, vx: r * (60 + Math.random() * 50), vy: -40, t: liteModus ? 0.5 : 0.9, vr: r * 12, rot: 0, botsing: 0, opGrond: false });
        spawnVonk(d.x + 4, d.y + 4, '#ffffff', 6);
      } else {
        popupWachtrij += 3;   /* een machine is drie blokjes administratie */
        bomWachtrij.push({ px: d.x + 5, py: d.y + 4, straal: d.soort === 'kopieerbot' ? 12 : 11, t: 0.02 });
        spawnGruis(d.x + 5, d.y + 4, T.MACHINE);
        /* valt de kopieermachine, dan vallen de kopieën mee uiteen */
        if (d.soort === 'kopieerbot') for (const k of drones) {
          if (!k.dood && k.soort === 'kopie' && k.ouder === d) { k.dood = true; spawnVonk(k.x + 5, k.y + 4, '#efe9d6', 8); }
        }
      }
    } else sfx('klap', 0.05);
  }

  /* de dood van de middenmanager: (1) bevriezen, (2) kleine knallen over zijn
     lijf terwijl zijn das en badge wegtollen, (3) de grote knal — hij barst open
     in een wolk A4'tjes die als sneeuw neerdwarrelen. Dan het stempel. */
  function sterfManager(d, dt) {
    const S2 = d.sterf; S2.t += dt; S2.klok -= dt;
    if (S2.t < 1.2) {
      if (S2.t > 0.1 && S2.klok <= 0) {
        S2.klok = 0.15;
        explosie(d.x + Math.random() * 12, d.y + Math.random() * 15, 6 + Math.random() * 2);
        spawnVonk(d.x + 6, d.y + 6, '#c9302c', 4);
      }
      return;
    }
    d.dood = true; d.sterf = null;
    explosie(d.x + 6, d.y + 7, 20);
    for (let i = 0; i < (liteModus ? 12 : 30); i++) duwPartikel({ soort: 'papier', x: d.x + Math.random() * 12, y: d.y + Math.random() * 12, vx: (Math.random() - 0.5) * 80, vy: -60 - Math.random() * 70, t: 2.4 + Math.random() * 1.4, fase: Math.random() * 6 });
    spawnGruis(d.x + 6, d.y + 8, T.MACHINE);
    harten.push({ x: d.x + 2, y: d.y + 4, vy: -120, t: 12, opGrond: false });
    harten.push({ x: d.x + 9, y: d.y + 4, vy: -120, t: 12, opGrond: false });
    popupWachtrij += 8;
    stempel = { t: 0, txt: 'ONTSLAGEN' };
    hudTekst = 'DE MIDDENMANAGER: "IK VOERDE ALLEEN MAAR UIT." — NIEMAND VOERT DIT NOG UIT.'; hudTekstT = 4;
    voegTrauma(0.7); sfx('hamer', 0.2); sfx('dood', 0.2);
    if (!drones.some(e => !e.dood)) slowmo(0.6, 0.3, true);
  }
  /* overslaan: meteen naar het einde, de balken schuiven weg, de muziek komt terug */
  function slaKeynoteOver() {
    if (!cine) return;
    cine.t = 2.2; balkTot = tijd + 0.25;
    if (window.Klank && Klank.duck) { try { Klank.duck(0.001, 0.08); } catch (e) {} }
  }
  /* de keynote tikt op echte tijd: de camera zoekt hem, de lampen floepen aan */
  function cineTik(dt) {
    const c = cine; c.t += dt;
    const d = c.doel, doel = klem(d.x + 6 - BREED * 0.6, 0, lvl.kols * TEGEL - BREED);
    const sm = f => { f = klem(f, 0, 1); return f * f * (3 - 2 * f); };
    camX = c.t < 1.9 ? c.camX0 + (doel - c.camX0) * sm(c.t / 0.6) : doel + (c.camX0 - doel) * sm((c.t - 1.9) / 0.5);
    for (const [drempel, n] of [[0.35, 1], [0.5, 2], [0.65, 3], [0.8, 4]]) if (c.t > drempel && c.klak < n) { c.klak = n; sfx('klap', 0.03); }
    if (c.t > 1.1 && !c.slam) { c.slam = true; kick(0, 3); impact(1, false, true); sfx('hamer', 0.1); }
    if (c.t > 2.4) { cine = null; d.grafiek = true; }
  }
  /* de naamband (Metal Slug-stijl): schuin, rood, met zijn portret op 3x */
  function tekenNaamband() {
    if (!cine || cine.t < 0.9) return;
    const t = cine.t - 0.9;
    const back = t < 0.15 ? (() => { const f = t / 0.15, c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(f - 1, 3) + c1 * Math.pow(f - 1, 2); })() : 1;
    const uit = cine.t > 2.15 ? (cine.t - 2.15) / 0.25 : 0;
    const dx = Math.round(-BREED * (1 - back) + BREED * uit * 1.2), dy = cine.t > 1.1 && cine.t < 1.2 ? 2 : 0;
    ctx.fillStyle = '#d43d2a';
    ctx.beginPath(); ctx.moveTo(dx - 10, 42 + dy); ctx.lineTo(dx + 330, 34 + dy); ctx.lineTo(dx + 330, 70 + dy); ctx.lineTo(dx - 10, 78 + dy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8f1f1c';
    ctx.beginPath(); ctx.moveTo(dx - 10, 44 + dy); ctx.lineTo(dx + 330, 36 + dy); ctx.lineTo(dx + 330, 68 + dy); ctx.lineTo(dx - 10, 76 + dy); ctx.closePath(); ctx.fill();
    const spr = gebakken.manager;
    if (spr) {
      ctx.fillStyle = '#1b1813'; ctx.fillRect(dx + 12, 14 + dy, 40, 50);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(spr, dx + 14, 17 + dy, spr.width * 3, spr.height * 3);
      const knip = (tijd * 4) % 1 < 0.5;
      ctx.fillStyle = knip ? '#d43d2a' : '#ffd23f';
      for (let i = 0; i < 40; i += 4) { ctx.fillRect(dx + 12 + i, 12 + dy, 2, 1); ctx.fillRect(dx + 12 + i, 65 + dy, 2, 1); }
      for (let i = 0; i < 52; i += 4) { ctx.fillRect(dx + 10, 13 + dy + i, 1, 2); ctx.fillRect(dx + 53, 13 + dy + i, 1, 2); }
    }
    tekst(ctx, 'DE MIDDENMANAGER', dx + 62, 45 + dy, '#fff4d6', 2);
    tekst(ctx, 'VOERT ALLEEN MAAR UIT.', dx + 64, 62 + dy, '#ffd23f');
  }
  /* het ONTSLAGEN-stempel: slamt van 3x naar 2x, schuin via een pixel-true
     kolomshear (geen rotatie), en dooft in drie ditherstappen */
  let stempelC = null;
  function tekenStempel() {
    if (!stempel) return;
    const t = stempel.t;
    if (t > 2.2) { stempel = null; return; }
    const sc = t < 0.12 ? 3 : 2, txt = stempel.txt;
    const w = tekstBreedte(txt, sc) + 8, h = 8 * sc + 8;
    const sleutel = txt + sc;
    if (!stempelC || stempelC.sleutel !== sleutel) {
      stempelC = document.createElement('canvas'); stempelC.width = w; stempelC.height = h; stempelC.sleutel = sleutel;
      const x = stempelC.getContext('2d');
      x.fillStyle = '#d43d2a';
      for (let i = 0; i < w; i += 4) { x.fillRect(i, 0, 2, 1); x.fillRect(i, h - 1, 2, 1); }
      for (let i = 0; i < h; i += 4) { x.fillRect(0, i, 1, 2); x.fillRect(w - 1, i, 1, 2); }
      tekst(x, txt, 4, 4, '#d43d2a', sc);
    }
    const a = t < 1.6 ? 1 : t < 1.8 ? 0.66 : t < 2 ? 0.33 : 0.15;
    const x0 = Math.round(BREED / 2 - w / 2), y0 = Math.round(62 - h / 2) + (t < 0.12 ? -4 : 0);
    ctx.globalAlpha = a;
    for (let cx = 0; cx < w; cx += 6) ctx.drawImage(stempelC, cx, 0, Math.min(6, w - cx), h, x0 + cx, y0 - Math.floor(cx / 6) + Math.floor(w / 12), Math.min(6, w - cx), h);
    ctx.globalAlpha = 1;
    if (t < 0.14 && fx) fx.gloed(ctx, BREED / 2, 62, 30, '#ff5a3c', 0.4);
  }
  /* de beamergrafiek achter de manager: vijf staafjes en een pijl omhoog —
     elke treffer laat een staaf zakken */
  function tekenGrafiek(ox, oy) {
    for (const d of drones) {
      if (d.soort !== 'manager' || d.dood || !(d.grafiek || cine)) continue;
      const gx = Math.round(d.x0 - 36 + ox), gy = Math.round(d.y0 - 44 + oy);
      if (gx < -80 || gx > BREED) continue;
      const hp = d.hp / (d.hpMax || 14);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = liteModus ? 0.5 : 0.85;
      ctx.fillStyle = '#2a2a24'; ctx.fillRect(gx, gy, 60, 34);
      for (let i = 0; i < 5; i++) {
        const hh = Math.max(1, Math.round((6 + i * 5) * (i === 4 ? hp : Math.min(1, hp + 0.3))));
        ctx.fillStyle = i % 2 ? '#ffd23f' : '#79c045';
        ctx.fillRect(gx + 6 + i * 10, gy + 30 - hh, 5, hh);
      }
      ctx.fillStyle = '#79c045';
      for (let i = 0; i < 12; i++) ctx.fillRect(gx + 8 + i * 4, gy + 22 - i * 1.4 * hp, 2, 1);
      ctx.restore();
    }
  }

  function raakHeld() {
    const h = held;
    h.hartjes--; h.raakbaar = 1.2;
    fakkelDip = 1;
    schud(2.2); stop('held');
    spawnVonk(h.x + h.b / 2, h.y + 4, '#efe9d6', 8);
    sfx('dood', 0.3);
    if (h.hartjes <= 0) {
      h.wachtT = 1.4;
      hudTekst = 'U WORDT EVEN IN DE WACHT GEZET.'; hudTekstT = 1.6;
    }
  }

  function misschienCoconOpen(c, px, py, straal) {
    if (c.open) return;
    if (Math.abs(c.x + 8 - px) < straal + 8 && Math.abs(c.y + 12 - py) < straal + 12) {
      c.open = true;
      schud(1.8);
      spawnVonk(c.x + 8, c.y + 8, '#5fd0d8', 10);
      spawnGruis(c.x + 8, c.y + 12, T.GIPS);
      const nieuw = { x: c.x + 4, y: c.y + 8, vx: 0, vy: 0, b: 7, h: 11, opGrond: false, loopT: 0, licht: 0, lichtT: 0.5 };
      collegas.push(nieuw);
      /* de vonk-estafette: een vonkje springt van de fakkel naar de collega */
      duwPartikel({ soort: 'vonkboog', x0: held.x + held.b / 2, y0: held.y + 6, x: held.x, y: held.y, doel: nieuw, t: 0.5, maxT: 0.5 });
      const REGELS = ['"...ZOALS IK DUS ZEI -"', '"IK ZAT HIER SINDS DE TEAMBUILDING."', '"MIJN NIETMACHINE. DIE IS VAN MIJ."',
        '"IS HET AL VIJF UUR?"', '"IK HEB NOOIT IN DE CLOUD GELOOFD."', '"EINDELIJK. DE PRINTER DEED HET TOCH AL NIET."',
        '"WIE FACTUREERT DIT?"', '"IK GA FRIETEN HALEN."'];
      hudTekst = REGELS[Math.min(collegas.length - 1, REGELS.length - 1)];
      hudTekstT = 2.4;
      sfx('genees', 0.3);
    }
  }

  /* de maskers: de twee losgelaten delen van jezelf zitten hier ook vast */
  const MASKER_NAAM = { slachter: 'DE SLACHTER', gifmagier: 'DE GIFMAGIER', thoverk: 'THOVERK' };
  const MASKER_REGEL = { slachter: '"NU IS HET HUN BEURT."', gifmagier: '"WE PASSEN ONS AAN. ZOALS ALTIJD."', thoverk: '"VUURTJE NODIG? FLAME!"' };
  function volgendMasker() { return Object.keys(HELD_TINT).find(m => maskers.indexOf(m) === -1) || null; }
  function misschienCelOpen(c, px, py, straal) {
    if (c.open) return;
    if (Math.abs(c.x + 8 - px) < straal + 8 && Math.abs(c.y + 12 - py) < straal + 12) {
      c.open = true;
      const mk = volgendMasker();
      if (!mk) return;
      maskers.push(mk);
      maskerIdx = maskers.length - 1;   /* meteen in je nieuwe zelf */
      splash = { t: 2.4, mk };
      verbleekMoment(1.2, true);
      schud(2); stop('cel');
      spawnVonk(c.x + 8, c.y + 10, HELD_TINT[mk].R, 14);

      sfx('genees', 0.2);
    }
  }

  /* de archiefkast "VOORZIENING GETROFFEN": duizenden getypte jeugddromen.
     Geen enkele tekstregel eromheen — het papier doet het werk. */
  function misschienDroomOpen(px, py, straal) {
    const k = droomkast;
    if (!k || k.open) return;
    if (Math.abs(k.x + 12 - px) < straal + 12 && Math.abs(k.y + 8 - py) < straal + 10) {
      k.open = true;
      schud(2); stop('droom');
      papierWachtrij = 26; papierBron = { x: k.x, y: k.y };
      const droomBron = (typeof S !== 'undefined' && S && S.jeugddroom) || proloog.jeugddroom;
      const droom = droomBron
        ? '"' + String(droomBron).toUpperCase().slice(0, 24) + '"'
        : 'VOORZIENING GETROFFEN';
      popups.push({ x: k.x + 12, y: k.y - 10, txt: droom, kleur: '#efe9d6', t: 2.8 });
      sfx('dood', 0.3);
    }
  }

  /* alles wat op een klap kan opengaan, in één beweging */
  function raakInteracties(px, py, straal) {
    for (const c of cocons) misschienCoconOpen(c, px, py, straal);
    for (const c of cellen) misschienCelOpen(c, px, py, straal);
    if (droomkast) misschienDroomOpen(px, py, straal);
  }

  function wisselMasker() {
    if (maskers.length < 2 || staat !== 'spel') return;
    maskerIdx = (maskerIdx + 1) % maskers.length;
    const mk = maskers[maskerIdx];
    spawnVonk(held.x + held.b / 2, held.y + 4, HELD_TINT[mk].R, 8);
    popup(held.x + held.b / 2, held.y - 8, MASKER_NAAM[mk], HELD_TINT[mk].R);
    sfx('schitter', 0.1);
  }

  /* ---------- tekenen ---------- */
  function tekenSprite(naam, x, y, flip) {
    const s = gebakken[naam];
    if (!s) return;
    if (flip) {
      ctx.save(); ctx.translate(Math.round(x) + s.width, Math.round(y)); ctx.scale(-1, 1);
      ctx.drawImage(s, 0, 0); ctx.restore();
    } else ctx.drawImage(s, Math.round(x), Math.round(y));
  }

  /* ---------- de buitenwereld achter de ramen (en boven het dak) ---------- */
  function tekenBuitenwereld(ox, oy, K) {
    if (!fx) {
      if (lvl.soort === 'dak') {
        const banden = [['#141026', 0, 60], ['#241634', 60, 96], ['#4a2420', 96, 128], ['#7a3c22', 128, 200]];
        for (const [k, y0, y1] of banden) { ctx.fillStyle = k; ctx.fillRect(0, y0, BREED, y1 - y0); }
      }
      return;
    }
    let zicht = lvl.soort === 'dak', y0 = lvl.soort === 'dak' ? 0 : HOOG, y1 = lvl.soort === 'dak' ? HOOG : 0;
    for (const r of lvl.ramen) if (r.x + ox < BREED && r.x + r.b + ox > 0) { zicht = true; y0 = Math.min(y0, r.y + oy); y1 = Math.max(y1, r.y + r.h + oy); }
    if (!zicht) return;
    if (K.naam === 'archief') { tekenStraat(ox, oy); return; }
    fx.tekenLucht(ctx, {
      lucht: K.lucht, horizon: K.horizon, camX: -ox, t: tijd, regen: true, y0, y1,
      zoeklicht: K.naam !== 'penthouse', zeppelin: K.naam !== 'directie', maan: K.lucht === 'nacht'
    });
  }
  /* de kelder kijkt op de stoep: regen, natriumlicht, een auto die voorbij
     zwiept, en de benen van iemand die gewoon naar huis gaat */
  function tekenStraat(ox, oy) {
    ctx.fillStyle = '#0a0c15'; ctx.fillRect(0, 0, BREED, 24);
    ctx.fillStyle = '#23180f'; ctx.fillRect(0, 11 + oy, BREED, 3);
    ctx.fillStyle = '#1a1510'; ctx.fillRect(0, 17 + oy, BREED, 4);
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(0, 17 + oy, BREED, 1);
    /* de auto: twee koplampen en een lichtbundel die over de stoep veegt */
    const autoT = (tijd % 7.5) / 7.5, autoX = -60 + autoT * (BREED + 120);
    if (autoT < 0.9) {
      ctx.fillStyle = '#fff4d6'; ctx.fillRect(autoX, 15 + oy, 2, 1); ctx.fillRect(autoX - 9, 15 + oy, 2, 1);
      fx.gloed(ctx, autoX + 10, 15 + oy, 16, '#ffe8b0', 0.55);
    }
    /* de benen van een voorbijganger, stappend (iemand heeft gewoon vrij) */
    const beenX = ((tijd * 22) % (lvl.kols * TEGEL + 160)) - 80 + ox;
    if (beenX > -10 && beenX < BREED + 10) {
      const stap = ((tijd * 5) | 0) % 2;
      ctx.fillStyle = '#07080c';
      ctx.fillRect(beenX, 10 + oy, 2, 7 - stap); ctx.fillRect(beenX + 3 + stap, 10 + oy, 2, 7);
      ctx.fillRect(beenX - 1 + stap, 16 + oy, 3, 1); ctx.fillRect(beenX + 3 + stap, 16 + oy, 3, 1);
    }
    fx.tekenRegen(ctx, tijd, false, 0.9, 0, 24);
    fx.tekenRegen(ctx, tijd, true, 0.7, 0, 24);
  }

  /* ---------- stof in de lichtbundels: alleen zichtbaar waar het licht valt ---------- */
  function updateMotes(dt) {
    const n = liteModus ? 15 : 40;
    while (motes.length < n) motes.push({ x: camX + Math.random() * BREED, y: 12 + Math.random() * 150, vx: 0, vy: 0, fase: Math.random() * 6 });
    for (const m of motes) {
      m.vx *= 0.96; m.vy *= 0.96;
      m.x += (m.vx + Math.sin(tijd * 0.4 + m.fase) * 3) * dt;
      m.y += (m.vy + 1.5 + Math.cos(tijd * 0.3 + m.fase) * 2) * dt;
      if (m.x < camX - 10) m.x += BREED + 20; else if (m.x > camX + BREED + 10) m.x -= BREED + 20;
      if (m.y > 168) m.y = 12; else if (m.y < 10) m.y = 166;
    }
  }
  /* staat een punt in een brandende tl-kegel? (analytisch, geen pixel-lezen) */
  function inKegel(x, y) {
    for (const tl of tls) {
      if (tl.staat !== 'hangt' || y < tl.y || y > tl.vloerY) continue;
      const aan = tlLicht(tl);
      if (aan < 0.5) continue;
      const v = (y - tl.y) / Math.max(40, tl.vloerY - tl.y + 6), half = (0.18 + 0.82 * v) * 52;
      if (Math.abs(x - (tl.x + 12)) < half) return aan * (1 - Math.abs(x - (tl.x + 12)) / half);
    }
    return 0;
  }

  /* ---------- de tl-bakken: licht, flikker, slinger, val ---------- */
  function tlLicht(tl) {
    if (tl.staat === 'valt' || tl.staat === 'weg') return 0;
    if (tl.staat === 'slinger') return ((tijd * 19 + tl.n) | 0) % 5 === 0 ? 0.15 : (((tijd * 7) | 0) % 3 ? 1 : 0.6);
    if (tl.kapot) {
      /* de stervende buis: meestal aan, soms een stotterende knipper */
      const f = (tijd * 9 + tl.n * 3.7) % 11;
      return f < 0.35 ? 0.1 : (f > 0.5 && f < 0.7 ? 0.25 : 1);
    }
    return 1;
  }
  /* de richting van een (gedraaide) tl-bak: hij wordt in 1px-stappen geplot */
  const tlPunten = tl => ({ cs: Math.cos(tl.hoek), sn: Math.sin(tl.hoek) });
  function tekenTls(ox, oy, emissief) {
    for (const tl of tls) {
      if (tl.staat === 'weg') continue;
      const x0 = tl.x + ox;
      if (x0 < -40 || x0 > BREED + 40) continue;
      const aan = tlLicht(tl);
      if (tl.staat === 'hangt') {
        if (!emissief) {
          if (tl.kroon) {
            /* de kroonluchter: vergulde armen, kristallen druppels */
            ctx.fillStyle = '#6a5020'; ctx.fillRect(x0 + 11, tl.y, 2, 4); ctx.fillRect(x0 + 2, tl.y + 4, 20, 2);
            ctx.fillStyle = '#8a6a2a'; ctx.fillRect(x0 + 2, tl.y + 4, 20, 1);
            ctx.fillStyle = '#4a3814'; for (const k of [2, 8, 14, 20]) ctx.fillRect(x0 + k, tl.y + 6, 2, 2);
          } else {
            ctx.fillStyle = '#3a352a'; ctx.fillRect(x0, tl.y, 24, 3);
            ctx.fillStyle = '#2a261e'; ctx.fillRect(x0, tl.y + 2, 24, 1);
          }
        } else if (aan > 0.05) {
          if (tl.kroon) {
            ctx.fillStyle = '#eef0ff'; for (const k of [2, 8, 14, 20]) ctx.fillRect(x0 + k, tl.y + 3, 2, 1);
            if (fx) fx.gloed(ctx, x0 + 12, tl.y + 5, 14, '#dfe2ff', 0.45 * aan);
          } else {
            ctx.fillStyle = aan > 0.5 ? '#f4f8ff' : '#6a7078'; ctx.fillRect(x0 + 2, tl.y + 1, 20, 1);
            if (fx) fx.gloed(ctx, x0 + 12, tl.y + 2, 12, klimaatNu().tl, 0.4 * aan);
          }
        }
        continue;
      }
      /* slingerend of vallend: plot de bak als een gedraaide lat */
      const r = tlPunten(tl), px = tl.px + ox, py = tl.py + oy;
      if (!emissief) {
        ctx.fillStyle = tl.kroon ? '#6a5020' : '#3a352a';
        for (let i = 0; i < 24; i++) ctx.fillRect(Math.round(px + r.cs * i), Math.round(py + r.sn * i), 1, 3);
        if (tl.staat === 'slinger') { ctx.fillStyle = '#2a261e'; ctx.fillRect(Math.round(tl.ax + ox), tl.y - 2, 1, Math.max(1, Math.round(py - tl.y + 2))); }
      } else if (aan > 0.05) {
        ctx.fillStyle = tl.kroon ? '#eef0ff' : '#f4f8ff';
        for (let i = 2; i < 22; i += tl.kroon ? 6 : 1) ctx.fillRect(Math.round(px + r.cs * i - r.sn), Math.round(py + r.sn * i + r.cs), 1, 1);
        if (fx) fx.gloed(ctx, px + r.cs * 12, py + r.sn * 12, 12, klimaatNu().tl, 0.45 * aan);
      }
    }
  }
  /* een tl-bak losslaan: 'slinger' hangt aan één kabel, 'val' komt meteen */
  function losTl(tl, val) {
    if (tl.staat === 'valt' || tl.staat === 'weg') return;
    if (tl.staat === 'hangt') {
      const links = Math.random() < 0.5;
      tl.ax = tl.x + (links ? 1 : 23); tl.ay = tl.y;         /* het ophangpunt van de kabel die houdt */
      tl.hoek = links ? 0 : Math.PI; tl.vh = (links ? 1 : -1) * (2 + Math.random() * 2);
      tl.px = tl.x; tl.py = tl.y; tl.staat = 'slinger'; tl.valKlok = 0.7 + Math.random() * 1.1;
      sfx('klap', 0.08);
    }
    if (val) { tl.staat = 'valt'; tl.vy = 0; tl.vr = (Math.random() - 0.5) * 6; }
  }
  function schokTls(px, py, straal) {
    for (const tl of tls) {
      if (tl.staat === 'weg' || tl.staat === 'valt') continue;
      const d = Math.hypot(tl.x + 12 - px, tl.y + 2 - py);
      if (d < straal + 14) losTl(tl, true);
      else if (d < straal + 46 && tl.staat === 'hangt') losTl(tl, false);
    }
  }
  /* een rechtstreekse klap (bijl omhoog, gifboog, post) haalt de bak meteen neer */
  function raakTlPunt(px, py, straal) {
    if (py > 5 * TEGEL) return;
    for (const tl of tls) {
      if (tl.staat !== 'hangt' && tl.staat !== 'slinger') continue;
      const cx = tl.staat === 'hangt' ? tl.x + 12 : tl.px + Math.cos(tl.hoek) * 12;
      const cy = tl.staat === 'hangt' ? tl.y + 2 : tl.py + Math.sin(tl.hoek) * 12;
      if (Math.abs(cx - px) < straal + 12 && Math.abs(cy - py) < straal + 4) { losTl(tl, true); spawnVonk(cx, cy, '#cfe8ff', 6); }
    }
  }
  function updateTls(dt) {
    for (const tl of tls) {
      if (tl.staat === 'slinger') {
        /* een slinger aan één kabel: hoek'' = -g/L·cos(hoek) (lat van 22px), gedempt */
        const L = 22, acc = (ZWAARTEKRACHT * 0.9 / L) * Math.cos(tl.hoek);
        tl.vh += acc * dt; tl.vh *= (1 - 0.9 * dt);
        tl.hoek += tl.vh * dt;
        /* het vaste uiteinde hangt aan de kabel; de lat draait eromheen */
        tl.px = tl.ax; tl.py = tl.ay + 2;
        tl.valKlok -= dt;
        if (tl.valKlok <= 0) losTl(tl, true);
        if (Math.random() < dt * 4) spawnVonk(tl.ax, tl.ay + 1, '#cfe8ff', 1);
      } else if (tl.staat === 'valt') {
        tl.vy = Math.min(tl.vy + ZWAARTEKRACHT * dt, 320);
        tl.py += tl.vy * dt; tl.hoek += tl.vr * dt;
        const mx = tl.px + Math.cos(tl.hoek) * 12, my = tl.py + Math.sin(tl.hoek) * 12;
        if (solide(tegelOp(Math.floor(mx / TEGEL), Math.floor((my + 3) / TEGEL))) || my > lvl.rijen * TEGEL) {
          tl.staat = 'weg';
          /* de buis spat uiteen: glas, een witte vonkenregen, een korte lichtflits */
          spawnGruis(mx, my, T.GLAS); spawnGruis(mx, my, T.GLAS);
          spawnVonk(mx, my, '#cfe8ff', liteModus ? 6 : 12); spawnVonk(mx, my, '#ffffff', 4);
          spawnSchok(mx, my, 10, '#cfe8ff');
          schermFlits = Math.max(schermFlits, 0.04);
          sfx('blok', 0.05); sfx('klap', 0.05);
          schud(1.2);
        }
      }
    }
  }

  /* ---------- de lichtpas: elke bron in de lichtkaart ---------- */
  /* de kaarten lezen in het donker eerst op kleur, dan pas op vorm */
  const KAART_LICHT = { koffie: '#c98a4a', mail: '#8ab0ff', over: '#6a76c0', schok: '#9a9a9a', bonus: '#ffd23f' };
  function verlicht(ox, oy, K) {
    const h = held;
    /* 1. de ramen: koud stadslicht dat naar binnen valt (en de bliksem) */
    const bl = K.lucht === 'storm' ? fx.bliksemSterkte() : 0;
    for (const r of lvl.ramen) {
      const cx = r.x + r.b / 2 + ox;
      if (cx < -90 || cx > BREED + 90) continue;
      const rr = Math.round(Math.max(r.b, r.h) * 0.85) + 10;
      fx.licht(cx, r.y + r.h * 0.7 + oy, rr, K.naam === 'archief' ? '#a0703a' : '#5a66a0', K.naam === 'archief' ? 0.5 : 0.6);
      if (bl > 0.02) fx.licht(cx, r.y + r.h + oy, rr + 30, '#c8d4ff', bl);
    }
    if (lvl.soort === 'dak' && bl > 0.02) fx.lichtFlits('#9aa6d8', bl * 0.8);
    if (dakval && dakval.t > 0.6) {
      const flik = fx.bliksemSterkte() > 0.5 && ((tijd * 30) | 0) % 2 ? 0 : 1;
      fx.schacht(BREED * 0.55 - 40, 46, 0.25, '#8aa0d8', klem((dakval.t - 0.6) * 2, 0, 1) * 0.9 * flik);
    }
    /* de keynote: de zaal gaat op zwart, een witte volgspot op de manager, drie
       lampen floepen aan boven zijn bureau, de beamer zet zijn grafiek neer */
    const keynote = cine && cine.doel;
    if (keynote) {
      const d = cine.doel, mx = d.x + 6 + ox, my = d.y + oy;
      if (cine.t > 0.35) fx.licht(mx, my + 14, 26, '#fff4e0', 1);
      for (let i = 0; i < 3; i++) if (cine.t > 0.5 + i * 0.15) fx.kegel(mx - 22 + i * 22, 8 + oy, 40, Math.max(20, my + 16 - 8 - oy), '#e8f0ff', 0.8);
    }
    for (const d of drones) if (d.soort === 'manager' && !d.dood && (d.grafiek || cine)) fx.licht(d.x0 - 6 + ox, d.y0 - 27 + oy, 30, '#dff4e0', 0.5);
    /* 2. de tl-bakken en kroonluchters */
    for (const tl of tls) {
      if (keynote) break;
      const aan = tlLicht(tl);
      if (aan <= 0.05) continue;
      const x0 = (tl.staat === 'hangt' ? tl.x + 12 : tl.px + Math.cos(tl.hoek) * 12) + ox;
      if (x0 < -70 || x0 > BREED + 70) continue;
      const y0 = (tl.staat === 'hangt' ? tl.y + 3 : tl.py + Math.sin(tl.hoek) * 12) + oy;
      if (tl.staat === 'hangt') {
        fx.kegel(x0, y0, 104, Math.max(40, tl.vloerY - tl.y + 6), K.tl, 0.85 * aan);
        fx.licht(x0, tl.vloerY + oy, 42, K.tl, 0.45 * aan);   /* de plas licht op de vloer */
      }
      fx.licht(x0, y0, tl.kroon ? 34 : 22, K.tl, 0.7 * aan);
    }
    /* 3. machines, meterkasten en poortjes gloeien zacht (zolang ze bestaan) */
    for (const l of lvl.lampen) {
      if (lvl.type[l.ty * lvl.kols + l.tx] !== l.t) continue;
      const x = l.tx * TEGEL + 4 + ox, y = l.ty * TEGEL + 4 + oy;
      if (x < -20 || x > BREED + 20) continue;
      if (l.t === T.METER) fx.licht(x, y, 14, '#d8e060', 0.5 + 0.2 * Math.sin(tijd * 6 + l.fase));
      else if (l.t === T.POORT) fx.licht(x, y, 12, '#ff4a3a', 0.5);
      else {
        /* de monitorzee: koud cyaan onderlicht dat af en toe hapert */
        const hapert = ((l.tx * 7 + tijd * 8) % 13) < 0.6;
        fx.licht(x, y - 6, 12, '#5fd0d8', hapert ? 0.15 : 0.6);
      }
    }
    /* de directie: bankierslampen, een gele plas onder een groene kap */
    for (const b of lvl.bankLampen) {
      if (lvl.type[b.ty * lvl.kols + b.tx] !== T.KAST) continue;
      const x = b.tx * TEGEL + 4 + ox;
      if (x < -20 || x > BREED + 20) continue;
      fx.licht(x, b.ty * TEGEL - 1 + oy, 16, '#ffe08a', 0.7);
    }
    /* 4. de uitgang: het groene UIT-bordje boven de lift */
    if (lvl.lift) {
      const L = lvl.lift, x = L.x + L.b / 2 + ox;
      if (x > -50 && x < BREED + 50) fx.licht(x, L.y - 10 + oy, Math.sin(tijd * 5) > 0 ? 32 : 26, '#3fd06a', 0.75);
    }
    /* 5. de held draagt zijn eigen warme licht mee — de fakkel. Hij ademt,
       groeit met de SLOOPKETTING en dooft even tot een kooltje als je geraakt
       wordt. De rand kleurt naar het masker; de kern is altijd hetzelfde amber. */
    if (h.wachtT <= 0) {
      const tint = HELD_TINT[maskers[maskerIdx]] ? HELD_TINT[maskers[maskerIdx]].R : '#ff9c3f';
      const dip = 1 - fakkelDip * 0.7;
      const gedimd = (1 - (hal && hal.gloed ? hal.gloed * 0.5 : 0)) * dip;
      const r = Math.round((44 + Math.min(12, sloopKetting * 0.5) + Math.sin(tijd * 1.3) * 3) * (0.55 + 0.45 * dip) / 2) * 2;
      const fx0 = h.x + h.b / 2 + ox, fy0 = h.y + 6 + oy;
      fx.licht(fx0, fy0, r, mengKleur(tint, '#ffd9a0', 0.55), gedimd);
      fx.licht(fx0, fy0, Math.round(r * 0.5), '#ffe6c0', 0.9 * gedimd);
      /* THOVERK: de lichtstraal verlicht de gang vóór hem */
      if (maskers[maskerIdx] === 'thoverk' && signKlok > 0.9) {
        for (let i = 1; i <= 8; i++) fx.licht(fx0 + h.richting * i * 12, fy0 + 1, 14, '#ffd68a', (signKlok - 0.9) * 2);
      }
    }
    /* de velen: elke bevrijde collega draagt een vonk van de fakkel */
    for (let i = 0; i < collegas.length; i++) {
      const c = collegas[i], l = c.licht == null ? 1 : c.licht;
      if (l <= 0.02 || (fxNiveau < 2 && i > 5)) continue;
      fx.licht(c.x + 3 + ox, c.y + 5 + oy, 16 + (Math.sin(tijd * 9 + i) > 0.6 ? 2 : 0), '#ffb347', 0.65 * l);
    }
    /* 6. vuur en projectielen */
    for (const p of partikels) {
      if (p.soort === 'vuurbal') {
        const fase = 1 - p.t / p.maxT;
        fx.licht(p.x + ox, p.y + oy, Math.round(p.r * 2.6 + 18), fase < 0.25 ? '#fff4d6' : '#ff8a3a', 1 - fase * 0.8);
      } else if (p.soort === 'gloei') {
        fx.licht(p.x + ox, p.y + oy, p.r, '#ff7a2f', klem(p.t / p.maxT, 0, 1) * 0.7);
      }
    }
    if (worp) fx.licht(worp.x + ox, worp.y + oy, 30, '#ff9c3f', 0.7);
    for (const b of bomWachtrij) if (b.boog) fx.licht(b.px + ox, b.py + oy, 16, '#9ad0ff', 0.8);
    for (const p of partikels) if (p.soort === 'crtuit') fx.licht(p.x + ox, p.y + oy, 10, '#9fe8ee', klem(p.t / p.maxT, 0, 1));
    if (gifbal) fx.licht(gifbal.x + ox, gifbal.y + oy, 32, '#8ae05a', 0.75);
    for (const m of post) fx.licht(m.x + ox, m.y + oy, 12, '#ffe8a0', 0.5);
    let nk = 0;
    for (const k of kogels) { if (nk++ > (fxNiveau < 2 ? 5 : 14)) break; fx.licht(k.x + ox, k.y + oy, 12, '#ffd23f', 0.5); }
    /* 7. wat roept of glimt: kaarten, cocons, cellen, hartjes */
    for (const p of pickups) if (!p.op) fx.licht(p.x + 4 + ox, p.y + 4 + oy, 24, KAART_LICHT[p.soort] || '#ffd23f', 0.7);
    for (const c of cocons) if (!c.open) fx.licht(c.x + 8 + ox, c.y + 8 + oy, 22, '#ff5a4a', 0.35 + 0.25 * (((tijd * 2) % 1) < 0.5 ? 1 : 0));
    for (const c of cellen) if (!c.open) { const mk = volgendMasker(); if (mk) fx.licht(c.x + 8 + ox, c.y + 12 + oy, 28, HELD_TINT[mk].R, 0.55); }
    for (const ht of harten) if (!ht.op) fx.licht(ht.x + 2 + ox, ht.y + 2 + oy, 14, '#ff6b8a', 0.5);
    /* 8. B.A.A.S.: de amberen CRT en zijn groene lampjes */
    if (hal && lvl.baas) {
      const B2 = lvl.baas;
      const hapert = '1110110111101001'[((tijd * 10) | 0) % 16] === '0';
      fx.licht(B2.x + 84 + ox, B2.y + 27 + oy, 56, '#d8a040', hal.flitsT > 0 ? 1 : (hapert ? 0.2 : 0.7));
      fx.licht(B2.x + 26 + ox, B2.y + 46 + oy, 40, '#79c045', 0.45 + (hal.gloed || 0) * 0.55);
      if (hal.paneel) fx.licht(lvl.luik.x + 5 + ox, lvl.luik.y + 10 + oy, 26, '#ff5a3a', 0.6);
      /* het dak: het gebouw brandt onder je — vuurgloed van beide dakranden */
      if (hal.kapot) {
        const fl = 0.75 + 0.25 * Math.sin(tijd * 9) * Math.sin(tijd * 5.3);
        fx.licht(4 * TEGEL + ox, (lvl.rijen - 3) * TEGEL + oy, 80, '#ff6a2a', fl);
        fx.licht((lvl.kols - 4) * TEGEL + ox, (lvl.rijen - 3) * TEGEL + oy, 80, '#ff6a2a', 1.7 - fl);
      }
    }
    /* 9. de knal licht de hele kamer even op */
    if (schermFlits > 0) fx.lichtFlits('#ffd8a8', klem(schermFlits * 5, 0, 0.8));
  }
  /* de knipperlampjes op machines blijven fel (emissief, na de lichtkaart) */
  function tekenLampPixels(ox, oy) {
    if (!fx) return;
    for (const l of lvl.lampen) {
      if (lvl.type[l.ty * lvl.kols + l.tx] !== l.t) continue;
      const px = l.tx * TEGEL + ox, py = l.ty * TEGEL + oy;
      if (px < -8 || px > BREED) continue;
      if (l.t === T.MACHINE) {
        const aan = ((tijd * 3 + l.fase) | 0) % 4 !== 0;
        if (aan) { ctx.fillStyle = ((l.tx + l.ty) % 2) ? '#ffb347' : '#5fd0d8'; ctx.fillRect(px + 5, py + 2, 2, 2); }
      } else if (l.t === T.POORT) {
        ctx.fillStyle = ((tijd * 2 + l.fase) | 0) % 2 ? '#ff4a3a' : '#8f1f1c'; ctx.fillRect(px + 3, py + 2, 2, 2);
      }
    }
    /* de bankierslampen: de groene kap en het peertje eronder */
    for (const b of lvl.bankLampen) {
      if (lvl.type[b.ty * lvl.kols + b.tx] !== T.KAST) continue;
      const px = b.tx * TEGEL + ox, py = b.ty * TEGEL + oy;
      if (px < -8 || px > BREED) continue;
      ctx.fillStyle = '#26221a'; ctx.fillRect(px + 4, py - 4, 1, 4);
      ctx.fillStyle = '#3fa060'; ctx.fillRect(px + 2, py - 5, 5, 2);
      ctx.fillStyle = '#7ad89a'; ctx.fillRect(px + 2, py - 5, 5, 1);
      ctx.fillStyle = '#fff4c0'; ctx.fillRect(px + 4, py - 3, 1, 1);
    }
    /* de NOODUITGANG: het enige koude licht dat je laat staan — een groen
       bordje met een lopend mannetje, de enige wegwijzer (geen HUD-pijl) */
    if (lvl.lift && gebakken.nooduitgang) {
      const L = lvl.lift, x = Math.round(L.x + L.b / 2 - 6 + ox), y = L.y - 14 + oy;
      if (x > -20 && x < BREED + 10) {
        ctx.drawImage(gebakken.nooduitgang, x, y);
        fx.gloed(ctx, x + 6, y + 3, 10, '#3fd06a', 0.3 + 0.12 * Math.sin(tijd * 5));
      }
    }
  }


  /* de held en de stoet (voor het verbleek-moment: zij houden hun kleur) */
  /* het onweer (directie en dak): bliksem, donder, en soms een inslag op de
     antenne van B.A.A.S. — dan staat zijn scherm even vol en trilt het dak */
  function onweerTik(dt) {
    if (!fx || !lvl) return;
    const K = klimaatNu();
    fx.updateBliksem(dt, K.lucht === 'storm' && staat === 'spel', (inslag) => {
      donderT = inslag ? 0.25 : 0.5 + Math.random() * 0.4;
      if (inslag && hal && lvl.baas) {
        hal.flitsT = reduceMotion ? 0.15 : 0.5; voegTrauma(0.6);
        spawnVonk(lvl.baas.x + 100, lvl.baas.y - 18, '#dfe6ff', 14);
        spawnVonk(lvl.baas.x + 100, lvl.baas.y - 18, '#ffffff', 6);
      }
    }, (hal && lvl.baas) ? () => ({ x: lvl.baas.x + 100 - camX, y: lvl.baas.y - 19 - camY }) : null);
    if (donderT > 0) { donderT -= dt; if (donderT <= 0) { sfx('dreun', 0.5); if (window.Klank && Klank.duck) { try { Klank.duck(0.5, 0.6); } catch (e) {} } } }
  }
  /* het bliksemframe op het dak: de lucht spierwit, de wereld pikzwart */
  function renderBliksemFrame(ox, oy) {
    ctx.fillStyle = '#e8ecff'; ctx.fillRect(0, 0, BREED, HOOG);
    fx.tekenBliksemPad(ctx);
    if (!lvl.silhouet || lvl.silhouetT !== ontfactureerd) {
      lvl.silhouet = lvl.silhouet || document.createElement('canvas');
      lvl.silhouet.width = tegelCanvas.width; lvl.silhouet.height = tegelCanvas.height;
      const x = lvl.silhouet.getContext('2d'); x.drawImage(tegelCanvas, 0, 0);
      x.globalCompositeOperation = 'source-in'; x.fillStyle = '#07060a'; x.fillRect(0, 0, lvl.silhouet.width, lvl.silhouet.height);
      lvl.silhouetT = ontfactureerd;
    }
    ctx.drawImage(lvl.silhouet, ox, oy);
    if (lvl.baas) { ctx.fillStyle = '#07060a'; ctx.fillRect(lvl.baas.x + ox, lvl.baas.y + oy, lvl.baas.b, lvl.baas.h); ctx.fillRect(lvl.baas.x + 99 + ox, lvl.baas.y - 18 + oy, 2, 18); }
    for (const d of drones) if (!d.dood) tekenSprite((d.soort === 'drone' ? 'drone1' : d.soort) + '#z', d.x + ox, d.y + oy);
    tekenMensen(ox, oy, '#z');
  }

  /* het dak in de storm: plassen die het vuur spiegelen, regen die op het dak
     spat, en de vlammen van je eigen gebouw die over de dakrand likken */
  function tekenDakweer(ox, oy) {
    const dakY = (lvl.rijen - 2) * TEGEL + oy;
    for (const pl of (lvl.plassen || [])) {
      const x = Math.round(pl.x + ox);
      if (x > BREED || x + pl.b < 0) continue;
      ctx.fillStyle = '#12121c'; ctx.fillRect(x, dakY, pl.b, 3);
      if (!liteModus) {
        ctx.globalAlpha = 0.45;
        for (let r = 0; r < 3; r++) {
          const dx = Math.round(Math.sin(tijd * 3 + r * 1.3));
          ctx.drawImage(canvas, klem(x, 0, BREED - 1), dakY - 2 - 2 * r, Math.max(1, Math.min(pl.b, BREED - klem(x, 0, BREED - 1))), 1, klem(x, 0, BREED - 1) + dx, dakY + r, Math.max(1, Math.min(pl.b, BREED - klem(x, 0, BREED - 1))), 1);
        }
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = 'rgba(154,176,200,0.55)'; ctx.fillRect(x + 1, dakY, pl.b - 2, 1);
    }
    /* de vlammen van de toren onder je: ze likken over de dakrand omhoog */
    for (const [x0, x1] of [[-6, 3 * TEGEL], [(lvl.kols - 3) * TEGEL, lvl.kols * TEGEL + 6]]) {
      for (let x = x0, k = 0; x < x1; x += 5, k++) {
        const sx = Math.round(x + ox);
        if (sx < -8 || sx > BREED + 8) continue;
        const hoogte = 22 + Math.round(16 * (0.5 + 0.5 * Math.sin(tijd * 7 + k * 1.9)) * (0.7 + 0.3 * Math.sin(tijd * 2.3 + k)));
        const voet = dakY + 6;
        for (let q = 0; q < hoogte; q++) {
          const f = q / hoogte, w = Math.max(1, Math.round(7 * (1 - f)));
          ctx.fillStyle = f < 0.15 ? '#ffe070' : f < 0.4 ? '#ffb030' : f < 0.65 ? '#ff7a2f' : f < 0.88 ? '#e8402a' : '#8f2a1c';
          ctx.fillRect(sx + Math.round(Math.sin(tijd * 10 + q * 0.35 + k) * f * 3) - (w >> 1), voet - q, w, 1);
        }
      }
      if (fx) fx.gloed(ctx, (x0 + x1) / 2 + ox, dakY - 4, 30, '#ff6a2a', 0.35 + 0.1 * Math.sin(tijd * 8));
    }
    /* regen vlak voor de camera, en waar hij het dak raakt, spat hij op */
    fx.tekenRegen(ctx, tijd * 1.1, true, liteModus ? 0.35 : 0.5);
    ctx.fillStyle = '#9ab0c8';
    const tik = (tijd * 14) | 0;
    for (let k = 0; k < (liteModus ? 5 : 12); k++) {
      const hsh = ((tik * 73 + k * 151) * 2654435761) >>> 0;
      const x = hsh % BREED;
      if (hsh & 1) { ctx.fillRect(x, dakY - 1, 1, 1); ctx.fillRect(x - 1, dakY - 2, 1, 1); ctx.fillRect(x + 1, dakY - 2, 1, 1); }
    }
  }

  /* de dakval in beeld: de barstlijn, en in de lichtschacht de regen */
  function tekenDakval(ox, oy) {
    const t = dakval.t, lengte = Math.min(BREED, t / 0.4 * BREED);
    ctx.fillStyle = '#efe9d6';
    for (let x = 0; x < lengte; x++) {
      const sx = BREED - x, y = TEGEL + ((sx * 7 + (sx >> 3)) % 3) - 1;
      ctx.fillRect(sx, y, 1, 1);
      if (sx % 17 === 0) ctx.fillRect(sx, y + 1, 1, 2 + (sx % 3));
    }
    if (t > 0.6) {
      /* regen binnen de schacht (wiskundig in het parallellogram, geen clip) */
      const x0 = BREED * 0.55 - 40, n = liteModus ? 0 : 30;
      ctx.fillStyle = '#cfe0ff';
      for (let k = 0; k < n; k++) {
        const y = ((tijd * 260 + k * 37) % HOOG), x = x0 + y * 0.25 + ((k * 29) % 46);
        ctx.fillRect(Math.round(x), Math.round(y), 1, 4);
      }
      /* bovenin: een stuk onweerslucht door het gat */
      ctx.fillStyle = '#1a1428'; ctx.fillRect(Math.round(x0 - 2), 0, 50, TEGEL);
      if (fx && fx.bliksemSterkte() > 0.3) { ctx.fillStyle = '#e8ecff'; ctx.fillRect(Math.round(x0 - 2), 0, 50, TEGEL); }
    }
  }

  function tekenMensen(ox, oy, suffix) {
    const sx = suffix || '';
    for (const c of collegas) tekenSprite(((c.loopT % 0.5) < 0.25 ? 'collega1' : 'collega2') + sx, c.x - 1 + ox, c.y + oy, c.vx < 0);
    const h = held;
    if (h.wachtT > 0) return;
    const fr = !h.opGrond ? 'held_spring' : (Math.abs(h.vx) > 1 ? ((h.loopT % 1) < 0.5 ? 'held_loop1' : 'held_loop2') : 'held_sta');
    tekenSprite(fr + '@' + maskers[maskerIdx] + sx, h.x + ox - 1, h.y + oy, h.richting < 0);
  }
  /* het impactframe: diepzwart met witte silhouetten (of omgekeerd) */
  function renderImpact(ox, oy) {
    const inv = impactInvers;
    ctx.fillStyle = inv ? '#fff4d6' : '#07060a'; ctx.fillRect(0, 0, BREED, HOOG);
    const sx = inv ? '#z' : '#w';
    for (const d of drones) {
      if (d.dood) continue;
      const naam = d.soort === 'drone' ? 'drone1' : d.soort === 'kopie' ? 'kopieerbot' : d.soort;
      tekenSprite(naam + sx, d.x + ox, d.y + oy, d.soort === 'manager' ? d.vx < 0 : false);
    }
    tekenMensen(ox, oy, sx);
    ctx.fillStyle = inv ? '#07060a' : '#ffffff';
    for (const p of partikels) {
      if (p.soort !== 'vuurbal') continue;
      const r = Math.round(4 + p.r * 0.6);
      ctx.fillRect(Math.round(p.x + ox) - r, Math.round(p.y + oy) - (r >> 1), r * 2, r);
      ctx.fillRect(Math.round(p.x + ox) - (r >> 1), Math.round(p.y + oy) - r, r, r * 2);
    }
  }
  /* de filmbalken: 16 px boven en onder, geschoven op balkT */
  function tekenBalken() {
    if (balkT <= 0.01) return;
    const e = balkT * balkT * (3 - 2 * balkT), hb = Math.round(16 * e);
    ctx.fillStyle = '#050403';
    ctx.fillRect(0, 0, BREED, hb); ctx.fillRect(0, HOOG - hb, BREED, hb);
  }

  function render() {
    /* vangnet: liep een vorig frame vast met ctx op een offscreen-laag (wereld of
       CRT), dan zou het scherm bevriezen — elk frame start op het hoofdcanvas */
    if (hoofdCtxRef) ctx = hoofdCtxRef;
    ctx.imageSmoothingEnabled = false;
    /* camera-offset incl. schermschud */
    const trAmp = trauma * trauma * ((liteModus || reduceMotion) ? 1.5 : 5);
    const trX = trAmp * (Math.sin(tijd * 37) + Math.sin(tijd * 23.3)) * 0.5;
    const trY = trAmp * (Math.sin(tijd * 31.7 + 1) + Math.sin(tijd * 19.1 + 2)) * 0.5;
    let ox = -Math.round(camX + kickX + trX), oy = -Math.round(camY + kickY + trY);

    ctx.fillStyle = '#14110c'; ctx.fillRect(0, 0, BREED, HOOG);
    if (staat === 'intro') {
      renderIntro();
      /* de administratieve resolutie: het beeld dithert zich scherp (onbenoemd) */
      if (introT < 1.5 && mozaiek) {
        const f = introT < 0.6 ? 8 : introT < 1.1 ? 4 : 2;
        const mw = Math.ceil(BREED / f), mh = Math.ceil(HOOG / f);
        const mx = mozaiek.getContext('2d');
        mx.imageSmoothingEnabled = false;
        mx.clearRect(0, 0, mw, mh);
        mx.drawImage(canvas, 0, 0, BREED, HOOG, 0, 0, mw, mh);
        ctx.fillStyle = '#14110c'; ctx.fillRect(0, 0, BREED, HOOG);
        ctx.drawImage(mozaiek, 0, 0, mw, mh, 0, 0, BREED, HOOG);
      }
      presenteer(); return;
    }
    if (staat === 'config') { renderConfig(); presenteer(); return; }
    if (staat === 'wissel' && wisselT >= 0.7 && wisselT < 2.9) { renderSchacht(); tekenBalken(); presenteer(); return; }
    if (staat === 'val') { renderVal(); presenteer(); return; }
    if (staat === 'epiloog') { renderEpiloog(); presenteer(); return; }

    /* ===== 0. HET IMPACTFRAME — de wereld bevriest in silhouet ===== */
    if (tijd < impactTot && staat === 'spel') { renderImpact(ox, oy); presenteer(); return; }
    if (fx && lvl.soort === 'dak' && staat === 'spel' && !reduceMotion && fx.bliksemFlits > 0.93) { renderBliksemFrame(ox, oy); presenteer(); return; }

    /* ===== 1. DE BUITENWERELD — onbelicht, straalt door ramen en open lucht ===== */
    const K = klimaatNu();
    tekenBuitenwereld(ox, oy, K);

    /* ===== 2. DE WERELDLAAG — alles wat licht vangt, op een eigen laag ===== */
    const hoofdCtx = ctx;
    if (fx && wereldCtx) { ctx = wereldCtx; ctx.clearRect(0, 0, BREED, HOOG); ctx.imageSmoothingEnabled = false; }
    ctx.drawImage(bgCanvas, ox, oy);
    tekenTls(ox, oy, false);
    ctx.drawImage(tegelCanvas, ox, oy);

    /* B.A.A.S. — kamervullend, ongeschonden, opgewekt */
    if (hal && lvl.baas) {
      const B2 = lvl.baas;
      ctx.drawImage(hal.frames[((tijd * 4) | 0) % 2], B2.x + ox, B2.y + oy);
      if (hal.flitsT > 0) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(B2.x + ox, B2.y + oy, B2.b, B2.h); }
      if (lvl.soort === 'dak') {
        /* de antenne op zijn kast — de bliksem vindt hem graag */
        ctx.fillStyle = '#3a4046'; ctx.fillRect(B2.x + 99 + ox, B2.y - 18 + oy, 2, 18);
        ctx.fillRect(B2.x + 95 + ox, B2.y - 12 + oy, 10, 1); ctx.fillRect(B2.x + 96 + ox, B2.y - 6 + oy, 8, 1);
      }
      if (hal.paneel) {
        const L2 = lvl.luik;
        ctx.fillStyle = '#181510'; ctx.fillRect(L2.x + ox, L2.y + oy, L2.b, L2.h);
      }
    }
    /* cocons en masker-cellen: de kast zelf (het knipperende kader is emissief) */
    for (const c of cocons) {
      if (c.open) continue;
      ctx.fillStyle = '#38332a'; ctx.fillRect(c.x + ox, c.y + oy, 16, 24);
      ctx.fillStyle = '#221f19'; ctx.fillRect(c.x + 2 + ox, c.y + 2 + oy, 12, 20);
      tekenSprite('collega1', c.x + 4 + ox, c.y + 12 + oy, false);
    }
    for (const c of cellen) {
      if (c.open) continue;
      const mk = volgendMasker();
      ctx.fillStyle = '#2a2620'; ctx.fillRect(c.x + ox, c.y + oy, 16, 24);
      ctx.fillStyle = '#1b1813'; ctx.fillRect(c.x + 2 + ox, c.y + 2 + oy, 12, 20);
      if (mk) { ctx.globalAlpha = 0.5; tekenSprite('held_sta@' + mk, c.x + 4 + ox, c.y + 9 + oy, false); ctx.globalAlpha = 1; }
    }
    /* de archiefkast VOORZIENING GETROFFEN (weg zodra hij openbarst) */
    if (droomkast && !droomkast.open) {
      const k2 = droomkast;
      ctx.fillStyle = '#6b4d2c'; ctx.fillRect(k2.x + ox, k2.y + oy, 24, 16);
      ctx.fillStyle = '#4a3218'; ctx.fillRect(k2.x + ox, k2.y + 5 + oy, 24, 1); ctx.fillRect(k2.x + ox, k2.y + 11 + oy, 24, 1);
      ctx.fillStyle = '#e8dfc4'; ctx.fillRect(k2.x + 4 + ox, k2.y + 2 + oy, 16, 2);
      ctx.fillStyle = '#26221a'; ctx.fillRect(k2.x + 6 + ox, k2.y + 3 + oy, 12, 1);   /* het doorgehaalde etiket */
    }
    /* de upgrade-kaarten: zweven en bobben (de gloed komt na het licht) */
    for (const p of pickups) {
      if (p.op) continue;
      tekenSprite('kaart_' + p.soort, p.x + ox, p.y + Math.round(Math.sin(tijd * 3 + p.x) * 2) + oy, false);
    }
    /* collega's in de stoet */
    for (const c of collegas) {
      const fr = (c.loopT % 0.5) < 0.25 ? 'collega1' : 'collega2';
      tekenSprite(fr, c.x - 1 + ox, c.y + oy, c.vx < 0);
    }
    /* het machinepark */
    for (const d of drones) {
      if (d.dood) continue;
      /* tijdens de hitstop trilt het geraakte doelwit ±1 px */
      const oxd = ox + (hitstop > 0 && stopDoel === d ? ((((tijd * 60) | 0) % 2) ? 1 : -1) : 0);
      if (d.soort === 'drone') tekenSprite(((tijd * 10) | 0) % 2 ? 'drone1' : 'drone2', d.x + oxd, d.y + oy);
      else if (d.soort === 'torentje') tekenSprite('torentje', d.x + oxd, d.y + oy);
      else if (d.soort === 'slang') tekenSprite('slang', d.x + oxd, d.y + oy, d.richting < 0);
      else if (d.soort === 'slijm') tekenSprite('slijm', d.x + oxd, d.y + oy - (d.opGrond ? 0 : 1), false);
      else if (d.soort === 'kaart') { const w2 = Math.abs(Math.sin(d.t * 3)); ctx.save(); ctx.translate(d.x + 4 + oxd, d.y + 4 + oy); ctx.scale(Math.max(0.3, w2), 1); ctx.drawImage(gebakken.kaart, -4, -4); ctx.restore(); }
      else if (d.soort === 'manager') tekenSprite('manager', d.x + oxd, d.y + oy, d.vx < 0);
      else {
        if (d.soort === 'kopie') ctx.globalAlpha = 0.55;
        tekenSprite('kopieerbot', d.x - 1 + oxd, d.y - 1 + oy, false);
        ctx.globalAlpha = 1;
      }
    }

    /* de held (knippert kort na een treffer) */
    const h = held;
    if (h.wachtT <= 0 && (h.raakbaar <= 0 || (tijd * 12 | 0) % 2)) {
      const fr = !h.opGrond ? 'held_spring' : (Math.abs(h.vx) > 1 ? ((h.loopT % 1) < 0.5 ? 'held_loop1' : 'held_loop2') : 'held_sta');
      const naam = fr + '@' + maskers[maskerIdx];
      if (h.dubbelT > 0 && gebakken[naam]) {
        /* de dubbeljump: een snelle salto rond het middelpunt */
        const spr = gebakken[naam], cx = Math.round(h.x + h.b / 2 + ox), cy = Math.round(h.y + h.h / 2 + oy);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(h.richting * (1 - h.dubbelT / 0.22) * Math.PI * 2);
        ctx.imageSmoothingEnabled = false; ctx.drawImage(spr, -spr.width / 2 - 1, -spr.height / 2); ctx.restore();
      } else {
        tekenSprite(naam, h.x + ox - 1, h.y + oy, h.richting < 0);
      }
    }
    /* de boemerang-bijl + de kern van de gifboog */
    if (worp) tekenSprite(((worp.spin | 0) % 2) ? 'bijl1' : 'bijl2', worp.x - 4 + ox, worp.y - 4 + oy, worp.vx < 0);

    /* de wrakken van drones: tollend in kwartslagen (pixel-true) */
    for (const w of wrakken) {
      const spr = gebakken.drone1; if (!spr) break;
      const k = ((Math.floor(w.rot) % 4) + 4) % 4;
      ctx.save(); ctx.translate(Math.round(w.x + ox) + spr.width / 2, Math.round(w.y + oy) + spr.height / 2);
      ctx.rotate(k * Math.PI / 2); ctx.drawImage(spr, -spr.width / 2, -spr.height / 2); ctx.restore();
    }
    /* partikels die licht VANGEN: rook (achter), stof, gruis, puin, papier.
       De rook is gedithered en van onder aangelicht zolang het vuur nog heet is */
    for (const p of partikels) {
      if (p.soort !== 'rook' && p.soort !== 'stof') continue;
      const a = klem(p.t / p.maxT, 0, 1);
      if (fx) {
        const tint = p.soort === 'stof' ? 'koud' : (p.tint || (a > 0.8 ? 'heet' : a > 0.55 ? 'warm' : 'koud'));
        const r = p.soort === 'stof' ? p.r0 + (1 - a) * 5 : p.r * (1.6 - a * 0.6);
        const c = fx.rookBol(r, tint);
        ctx.globalAlpha = Math.min(1, a * 1.5) * (p.soort === 'stof' ? 0.6 : 0.75);
        ctx.drawImage(c, Math.round(p.x + ox - c.width / 2), Math.round(p.y + oy - c.height / 2));
      } else {
        ctx.fillStyle = '#5a5446'; ctx.globalAlpha = 0.5 * a;
        ctx.beginPath(); ctx.arc(Math.round(p.x + ox), Math.round(p.y + oy), (p.r || 3) * (1.6 - a * 0.6), 0, 7); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (const p of partikels) {
      if (p.soort === 'papier') { ctx.fillStyle = '#efe9d6'; ctx.fillRect(Math.round(p.x + ox), Math.round(p.y + oy), 3, 2); }
      else if (p.soort === 'gruis') { ctx.fillStyle = p.kleur; ctx.fillRect(Math.round(p.x + ox), Math.round(p.y + oy), p.g, p.g); }
      else if (p.soort === 'brok' && brokAtlas) {
        if (p.lig && p.t < 0.3 && ((tijd * 12) | 0) % 2) continue;       /* knippert weg */
        const x = Math.round(p.x + ox), y = Math.round(p.y + oy), k = ((Math.floor(p.rot) % 4) + 4) % 4;
        if (k === 0) ctx.drawImage(brokAtlas, p.sx, p.sy, p.w, p.h, x, y, p.w, p.h);
        else {
          ctx.save(); ctx.translate(x + p.w / 2, y + p.h / 2); ctx.rotate(k * Math.PI / 2);
          ctx.drawImage(brokAtlas, p.sx, p.sy, p.w, p.h, -p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
        }
      }
    }
    /* de hartjes uit de sloop (DERTIENDE MAAND) — bobben, kloppen */
    for (const ht of harten) {
      if (ht.op) continue;
      tekenSprite('hart', ht.x + ox, ht.y + (ht.opGrond ? Math.round(Math.sin(tijd * 5) * 1) : 0) + oy, false);
    }

    /* ===== 3. HET LICHT — de wereldlaag belichten en op de lucht leggen ===== */
    if (fx && wereldCtx) {
      fx.lichtBegin(cine ? '#0e0f14' : ambientNu(K));
      verlicht(ox, oy, K);
      fx.toepassenMasker(wereldCtx, wereldC);
      ctx = hoofdCtx;
      ctx.drawImage(wereldC, 0, 0);
    }
    const onder = lvl.rijen * TEGEL + oy;
    if (onder < HOOG) { ctx.fillStyle = '#0c0a08'; ctx.fillRect(0, onder, BREED, HOOG - onder); }
    if (lvl.soort === 'dak' && fx) tekenDakweer(ox, oy);
    /* het systeem verbleekt — alleen de mensen (en straks het vuur) houden kleur */
    if (verbleek > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = verbleek;
      ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, BREED, HOOG); ctx.restore();
      tekenMensen(ox, oy);
    }

    /* ===== 4. EMISSIEF — wat zelf licht geeft, na de lichtkaart ===== */
    tekenTls(ox, oy, true);
    tekenLampPixels(ox, oy);
    tekenGrafiek(ox, oy);
    if (dakval) tekenDakval(ox, oy);
    if (hal && lvl.baas) {
      const B2 = lvl.baas;
      if (fx) {
        fx.gloed(ctx, B2.x + 84 + ox, B2.y + 27 + oy, 26, '#ffb347', 0.35 + (hal.flitsT > 0 ? 0.3 : 0));
        fx.gloed(ctx, B2.x + 26 + ox, B2.y + 46 + oy, 22, '#79c045', 0.22 + (hal.gloed || 0) * 0.5);
      }
      if (lvl.soort === 'dak') {
        const aan = ((tijd * 1.2) | 0) % 2;
        if (aan) { ctx.fillStyle = '#ff4a3a'; ctx.fillRect(B2.x + 99 + ox, B2.y - 20 + oy, 2, 2); if (fx) fx.gloed(ctx, B2.x + 100 + ox, B2.y - 19 + oy, 8, '#ff4a3a', 0.5); }
        if (fx && hal.flitsT > 0.2) fx.gloed(ctx, B2.x + 100 + ox, B2.y - 18 + oy, 20, '#dfe6ff', hal.flitsT);
      }
      if (hal.regelT > 0 && hal.regel) {
        tekst(ctx, hal.regel, B2.x + B2.b / 2 - tekstBreedte(hal.regel) / 2 + ox, B2.y - 10 + oy, '#79c045');
      }
      /* het onderhoudsluikje, omkaderd met de rode stippellijn (het foto-kader) */
      if (hal.paneel) {
        const L2 = lvl.luik;
        ctx.fillStyle = '#ffb347'; ctx.fillRect(L2.x + 2 + ox, L2.y + 9 + oy, 2, 3);
        const knip2 = (tijd * 2) % 1 < 0.5;
        ctx.fillStyle = knip2 ? '#d43d2a' : '#8f1f1c';
        for (let i = 0; i < L2.b; i += 4) { ctx.fillRect(L2.x + i + ox, L2.y - 2 + oy, 2, 1); ctx.fillRect(L2.x + i + ox, L2.y + L2.h + 1 + oy, 2, 1); }
        for (let i = 0; i < L2.h; i += 4) { ctx.fillRect(L2.x - 2 + ox, L2.y + i + oy, 1, 2); ctx.fillRect(L2.x + L2.b + 1 + ox, L2.y + i + oy, 1, 2); }
        tekst(ctx, 'ONDERHOUD', L2.x + L2.b / 2 - tekstBreedte('ONDERHOUD') / 2 + ox, L2.y - 9 + oy, '#cfc0a0');
        if (fx) fx.gloed(ctx, L2.x + L2.b / 2 + ox, L2.y + L2.h / 2 + oy, 16, knip2 ? '#d43d2a' : '#ffb347', 0.35);
      }
    }
    /* de cocons roepen: HELP! + pijltje + het rode fotokader knippert */
    for (const c of cocons) {
      if (c.open) continue;
      const bob = Math.round(Math.sin(tijd * 4) * 2);
      tekst(ctx, 'HELP!', c.x + 8 - tekstBreedte('HELP!') / 2 + ox, c.y - 14 + bob + oy, '#ffd23f');
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(c.x + 6 + ox, c.y - 6 + bob + oy, 4, 2);
      ctx.fillRect(c.x + 7 + ox, c.y - 4 + bob + oy, 2, 2);
      const knip = (tijd * 2) % 1 < 0.5;
      ctx.fillStyle = knip ? '#d43d2a' : '#8f1f1c';
      for (let i = 0; i < 16; i += 4) { ctx.fillRect(c.x + i + ox, c.y - 2 + oy, 2, 1); ctx.fillRect(c.x + i + ox, c.y + 25 + oy, 2, 1); }
      for (let i = 0; i < 24; i += 4) { ctx.fillRect(c.x - 2 + ox, c.y + i + oy, 1, 2); ctx.fillRect(c.x + 17 + ox, c.y + i + oy, 1, 2); }
    }
    for (const c of cellen) {
      if (c.open) continue;
      const mk = volgendMasker();
      const knipC = (tijd * 2.4) % 1 < 0.5;
      ctx.fillStyle = knipC ? (mk ? HELD_TINT[mk].R : '#efe9d6') : '#3a352a';
      for (let i = 0; i < 16; i += 4) { ctx.fillRect(c.x + i + ox, c.y - 2 + oy, 2, 1); ctx.fillRect(c.x + i + ox, c.y + 25 + oy, 2, 1); }
      for (let i = 0; i < 24; i += 4) { ctx.fillRect(c.x - 2 + ox, c.y + i + oy, 1, 2); ctx.fillRect(c.x + 17 + ox, c.y + i + oy, 1, 2); }
      if (fx && mk) fx.gloed(ctx, c.x + 8 + ox, c.y + 12 + oy, 18, HELD_TINT[mk].R, knipC ? 0.3 : 0.12);
    }
    /* de kaarten glimmen */
    for (const p of pickups) {
      if (p.op) continue;
      const bob2 = Math.round(Math.sin(tijd * 3 + p.x) * 2);
      if (fx) fx.gloed(ctx, p.x + 4 + ox, p.y + 4 + bob2 + oy, 12, KAART_LICHT[p.soort] || '#ffd23f', 0.32 + 0.12 * Math.sin(tijd * 5 + p.x));
      /* koffie dampt nog */
      if (p.soort === 'koffie') { ctx.fillStyle = '#e8dfc4'; for (let k = 0; k < 2; k++) { const f = (tijd * 0.8 + k * 0.5) % 1; ctx.fillRect(Math.round(p.x + 3 + k * 2 + Math.sin(tijd * 3 + k) + ox), Math.round(p.y - 1 - f * 6 + bob2 + oy), 1, 1); } }
      else { ctx.fillStyle = 'rgba(255,210,63,0.13)'; ctx.beginPath(); ctx.arc(p.x + 4 + ox, p.y + 4 + bob2 + oy, 8, 0, 7); ctx.fill(); }
    }
    for (const ht of harten) {
      if (ht.op || !fx) continue;
      fx.gloed(ctx, ht.x + 2 + ox, ht.y + 2 + oy, 8, '#ff6b8a', 0.3);
    }
    /* de middenmanager: zijn naam en zijn balk blijven leesbaar in het donker */
    for (const d of drones) {
      if (d.dood || d.soort !== 'manager') continue;
      const bw = 16, bx = d.x + 6 - bw / 2 + ox, by = d.y - 7 + oy;
      ctx.fillStyle = '#1b1813'; ctx.fillRect(bx - 1, by - 1, bw + 2, 4);
      ctx.fillStyle = '#c9302c'; ctx.fillRect(bx, by, Math.max(0, Math.round(bw * d.hp / (d.hpMax || 14))), 2);
      tekst(ctx, 'MIDDENMANAGER', d.x + 6 - tekstBreedte('MIDDENMANAGER') / 2 + ox, by - 8, '#efe9d6');
    }
    /* de post is verstuurd */
    ctx.fillStyle = '#efe9d6';
    for (const m of post) { ctx.fillRect(Math.round(m.x + ox) - 2, Math.round(m.y + oy) - 1, 5, 3); }
    /* 0u06-kogeltjes (en de 🙂-variant van de torentjes) — gloeiend geel */
    for (const k of kogels) {
      const kx = Math.round(k.x + ox), ky = Math.round(k.y + oy);
      if (fx && !liteModus) fx.gloed(ctx, kx, ky, 6, '#ffd23f', 0.35);
      ctx.fillStyle = '#ffd23f';
      if (k.smiley) {
        ctx.fillRect(kx - 2, ky - 2, 5, 5);
        ctx.fillStyle = '#26221a';
        ctx.fillRect(kx - 1, ky - 1, 1, 1); ctx.fillRect(kx + 1, ky - 1, 1, 1);
        ctx.fillRect(kx - 1, ky + 1, 3, 1);
      } else ctx.fillRect(kx - 2, ky - 2, 4, 4);
    }
    /* buff-aura: een pulserende gekleurde gloed rond de held, één kleur per
       actieve kaart — hoe meer buffs, hoe groter en bonter de gloed */
    if (h.wachtT <= 0) {
      const buffKl = [];
      if (upgrades.koffie) buffKl.push('#ffb347');
      if (upgrades.mail) buffKl.push('#ffd23f');
      if (upgrades.over) buffKl.push('#ff7a2f');
      if (upgrades.schok) buffKl.push('#5fd0d8');
      if (upgrades.bonus) buffKl.push('#ff6b8a');
      if (buffKl.length) {
        const kl = buffKl[((tijd * 2.5) | 0) % buffKl.length];
        const puls = 6 + buffKl.length + Math.sin(tijd * 6) * 1.5;
        if (fx) fx.gloed(ctx, h.x + h.b / 2 + ox, h.y + h.h / 2 + oy, Math.round(puls + 4), kl, 0.32 + 0.14 * Math.sin(tijd * 6));
        else {
          ctx.globalAlpha = 0.2 + 0.12 * (0.5 + 0.5 * Math.sin(tijd * 6));
          ctx.fillStyle = kl; ctx.beginPath(); ctx.arc(h.x + h.b / 2 + ox, h.y + h.h / 2 + oy, puls, 0, 7); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }
    /* de bijl-zwaai: een smear-boog in de masker-kleur — regenboog bij hoge combo */
    if (h.wachtT <= 0 && h.zwaaiT > 0) {
      const kl = sloopKetting >= 12 ? regenboog(tijd) : (HELD_TINT[maskers[maskerIdx]] ? HELD_TINT[maskers[maskerIdx]].R : '#ffffff');
      const fr = klem(Math.floor((1 - h.zwaaiT / 0.09) * 3), 0, 2);
      const c = smear(kl, h.zwaaiOmhoog, fr);
      if (h.zwaaiOmhoog) ctx.drawImage(c, Math.round(h.x + h.b / 2 - c.width / 2 + ox), Math.round(h.y - c.height + 3 + oy));
      else if (h.richting > 0) ctx.drawImage(c, Math.round(h.x + h.b / 2 + 1 + ox), Math.round(h.y + 7 - 9 + oy));
      else {
        ctx.save(); ctx.translate(Math.round(h.x + h.b / 2 - 1 + ox), Math.round(h.y + 7 - 9 + oy)); ctx.scale(-1, 1);
        ctx.drawImage(c, 0, 0); ctx.restore();
      }
    }
    /* de contactster: een witgele ster van 4 frames waar de bijl iets raakt */
    for (const p of partikels) {
      if (p.soort !== 'ster') continue;
      const f = klem(Math.floor((1 - p.t / p.maxT) * 4), 0, 3), r = [3, 3, 2, 1][f];
      const x = Math.round(p.x + ox), y = Math.round(p.y + oy);
      ctx.fillStyle = f < 2 ? '#ffffff' : '#ffd23f';
      ctx.fillRect(x - r, y, r * 2 + 1, 1); ctx.fillRect(x, y - r, 1, r * 2 + 1);
      if (f < 2) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(x - 2, y - 2, 1, 1); ctx.fillRect(x + 2, y - 2, 1, 1); ctx.fillRect(x - 2, y + 2, 1, 1); ctx.fillRect(x + 2, y + 2, 1, 1); }
      /* drie speedlines in de slagrichting */
      if (p.dx && f < 3 && !liteModus) { ctx.fillStyle = '#fff4d6'; for (const dy of [-3, 0, 3]) ctx.fillRect(p.dx > 0 ? x + 4 : x - 10, y + dy, 6, 1); }
      if (fx && f < 2) fx.gloed(ctx, x, y, 8, '#fff4d6', 0.5);
    }
    if (gifbal) {
      const gx = Math.round(gifbal.x + ox), gy = Math.round(gifbal.y + oy);
      if (fx) fx.gloed(ctx, gx, gy, 10, '#c86fe0', 0.5);
      else { ctx.globalAlpha = 0.4; ctx.fillStyle = '#c86fe0'; ctx.beginPath(); ctx.arc(gx, gy, 5, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.fillStyle = '#79c045'; ctx.fillRect(gx - 2, gy - 2, 4, 4);
      ctx.fillStyle = '#c8f0a0'; ctx.fillRect(gx - 1, gy - 1, 2, 2);
    }
    if (worp && fx) fx.gloed(ctx, worp.x + ox, worp.y + oy, 12, '#ff9c3f', 0.4);

    /* de lichtgevende partikels: vonken, sporen, vuurballen, schokgolven, sintels */
    for (const p of partikels) {
      if (p.soort === 'spoor') {
        ctx.globalAlpha = klem(p.t / p.maxT, 0, 1) * 0.75;
        ctx.fillStyle = p.kleur; ctx.fillRect(Math.round(p.x + ox) - (p.g >> 1), Math.round(p.y + oy) - (p.g >> 1), p.g, p.g);
        ctx.globalAlpha = 1;
      } else if (p.soort === 'vonk') {
        ctx.fillStyle = p.kleur; ctx.fillRect(Math.round(p.x + ox), Math.round(p.y + oy), p.g, p.g);
      }
    }
    for (const p of partikels) {
      if (p.soort !== 'vuurbal') continue;
      const fase = 1 - p.t / p.maxT;                 /* 0 = net geknald, 1 = uitgedoofd; <0 = nabrander wacht */
      if (fase < 0) continue;
      if (fx) {
        fx.gloed(ctx, Math.round(p.x + ox), Math.round(p.y + oy), Math.round((p.r * 1.8 + 8) / 4) * 4, fase < 0.2 ? '#fff4d6' : '#ff7a2f', 0.6 * (1 - fase));
        fx.tekenVuurbal(ctx, p.x + ox, p.y + oy, p.r, fase);
      } else {
        const r = 3 + p.r * fase;
        ctx.fillStyle = fase < 0.3 ? '#ffffff' : fase < 0.6 ? '#ffd23f' : '#ff7a2f';
        ctx.beginPath(); ctx.arc(Math.round(p.x + ox), Math.round(p.y + oy), r, 0, 7); ctx.fill();
      }
    }
    /* glasscherven vangen het licht: wit fonkelen waar een bundel of de fakkel valt */
    for (const p of partikels) {
      if (p.soort === 'scherf') {
        if (p.lig && p.t < 0.3 && ((tijd * 12) | 0) % 2) continue;
        const x = Math.round(p.x + ox), y = Math.round(p.y + oy), k = ((Math.round(p.hoek) % 4) + 4) % 4;
        const glint = Math.sin(tijd * 22 + p.fase) > 0.8 && (inKegel(p.x, p.y) > 0.2 || Math.hypot(p.x - held.x, p.y - held.y) < 44);
        ctx.fillStyle = glint ? '#ffffff' : '#9fc4cc';
        if (k === 0) ctx.fillRect(x - 1, y, 3, 1);
        else if (k === 1) ctx.fillRect(x, y - 1, 1, 3);
        else if (k === 2) { ctx.fillRect(x - 1, y + 1, 1, 1); ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + 1, y - 1, 1, 1); }
        else { ctx.fillRect(x - 1, y - 1, 1, 1); ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + 1, y + 1, 1, 1); }
        if (glint && fx && !liteModus) fx.gloed(ctx, x, y, 3, '#ffffff', 0.7);
      } else if (p.soort === 'crtuit') {
        /* een scherm dat sterft: de lijn krimpt tot een punt, en weg */
        const f = 1 - p.t / p.maxT, x = Math.round(p.x + ox), y = Math.round(p.y + oy);
        ctx.fillStyle = '#e8ffff';
        if (f < 0.75) { const b = Math.round(8 * (1 - f / 0.75)) + 1; ctx.fillRect(x - (b >> 1), y, b, 1); }
        else ctx.fillRect(x, y, 1, 1);
        if (fx) fx.gloed(ctx, x, y, 6, '#9fe8ee', 0.5);
      }
    }
    /* de elektrische ketting: gekartelde boogjes naar de volgende meterkast */
    for (const b of bomWachtrij) {
      if (!b.boog) continue;
      const zaad = ((tijd * 30) | 0) + b.tx * 7;
      let ax = b.boog.x0, ay = b.boog.y0;
      const pts = [];
      for (let k = 1; k <= 6; k++) {
        const f = k / 6, j = k === 6 ? 0 : ((((zaad * 16807 + k * 48271) % 2147483647) % 7) - 3);
        pts.push([b.boog.x0 + (b.px - b.boog.x0) * f + j, b.boog.y0 + (b.py - b.boog.y0) * f - j]);
      }
      for (const [kl, d] of [['#5fa8ff', 1], ['#dff4ff', 0]]) {
        ctx.fillStyle = kl; ax = b.boog.x0; ay = b.boog.y0;
        for (const [bx2, by2] of pts) {
          const st = Math.max(1, Math.ceil(Math.max(Math.abs(bx2 - ax), Math.abs(by2 - ay))));
          for (let q = 0; q <= st; q++) ctx.fillRect(Math.round(ax + (bx2 - ax) * q / st + ox) + d, Math.round(ay + (by2 - ay) * q / st + oy) + d, 1, 1);
          ax = bx2; ay = by2;
        }
      }
      if (fx) fx.gloed(ctx, b.px + ox, b.py + oy, 8, '#9ad0ff', 0.6);
    }
    /* stof in de lichtbundels: alleen waar het licht valt, zie je het */
    if (tls.length && motes.length) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = klimaatNu().tl;
      for (const m of motes) {
        const k = inKegel(m.x, m.y);
        if (k <= 0.05) continue;
        ctx.globalAlpha = Math.min(0.7, k * 0.9);
        ctx.fillRect(Math.round(m.x + ox), Math.round(m.y + oy), 1, 1);
      }
      ctx.restore();
    }
    for (const p of partikels) {
      if (p.soort === 'schok') {
        const fase = 1 - p.t / p.maxT;
        const r = 3 + p.r * fase;
        ctx.lineWidth = fase < 0.5 ? 2 : 1;
        if (p.kleur) { ctx.globalAlpha = (1 - fase) * 0.85; ctx.strokeStyle = p.kleur; }
        else { ctx.globalAlpha = (1 - fase) * 0.8; ctx.strokeStyle = '#fff4d6'; }   /* geen rgba-string per frame */
        ctx.beginPath(); ctx.arc(Math.round(p.x + ox), Math.round(p.y + oy), r, 0, 7); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (p.soort === 'as') {
        const flik = Math.sin(p.t * 18 + p.fase) > -0.3 ? 0.9 : 0.3;
        ctx.globalAlpha = klem(p.t / 2, 0, 1) * flik;
        const w = p.warmte;
        ctx.fillStyle = w == null ? p.kleur : w > 0.85 ? '#ffffff' : w > 0.65 ? '#ffd23f' : w > 0.45 ? '#ff9c3f' : w > 0.25 ? '#c9302c' : '#3a2418';
        ctx.fillRect(Math.round(p.x + ox), Math.round(p.y + oy), 1, 1);
        ctx.globalAlpha = 1;
      }
    }
    ctx.lineWidth = 1;
    /* de vonk-estafette: een boogje van de fakkel naar de nieuwe collega */
    for (const p of partikels) {
      if (p.soort !== 'vonkboog' || !p.doel) continue;
      const f = 1 - klem(p.t / p.maxT, 0, 1);
      const x1 = p.doel.x + 3, y1 = p.doel.y + 5, mx = (p.x0 + x1) / 2, my = Math.min(p.y0, y1) - 24;
      for (let k = 0; k < 5; k++) {
        const u = klem(f - k * 0.05, 0, 1), iu = 1 - u;
        const bx = iu * iu * p.x0 + 2 * iu * u * mx + u * u * x1, by = iu * iu * p.y0 + 2 * iu * u * my + u * u * y1;
        ctx.fillStyle = k === 0 ? '#fff4d6' : (k < 3 ? '#ffd9a0' : '#ff9c3f');
        ctx.fillRect(Math.round(bx + ox), Math.round(by + oy), k === 0 ? 2 : 1, k === 0 ? 2 : 1);
      }
    }
    /* het kooltje: de held draagt het op de borst, elke collega een vonkje ervan */
    if (h.wachtT <= 0 && (h.raakbaar <= 0 || (tijd * 12 | 0) % 2) && !(h.dubbelT > 0)) {
      ctx.fillStyle = fakkelDip > 0.5 ? '#8f2a1c' : '#ff9c3f';
      ctx.fillRect(Math.round(h.x + ox) + 2, Math.round(h.y + oy) + 6, 2, 2);
      if (fx) fx.gloed(ctx, h.x + 3 + ox, h.y + 7 + oy, 5, '#ff9c3f', 0.5);
    }
    for (let i = 0; i < collegas.length; i++) {
      const c = collegas[i];
      if ((c.licht == null ? 1 : c.licht) < 0.5) continue;
      ctx.fillStyle = Math.sin(tijd * 9 + i) > 0.6 ? '#ffd9a0' : '#ffb347';
      ctx.fillRect(Math.round(c.x + ox) + 2, Math.round(c.y + oy) + 5, 1, 1);
    }

    /* ===== 5. NABEWERKING — kleurtoon van de laag + vignet ===== */
    if (fx) {
      if (fxNiveau >= 2) fx.grade(ctx, K.grade, K.gradeS);
      if (fxNiveau >= 1) fx.vignet(ctx, 1);
    }

    /* popups ("-0U06") */
    /* popups (nooit over de HUD-regels bovenaan: minstens y 24) */
    for (const p of popups) { const sc = p.pop > 0 ? 2 : 1; tekst(ctx, p.txt, Math.round(p.x + ox) - tekstBreedte(p.txt, sc) / 2, Math.max(24, Math.round(p.y + oy) - (sc - 1) * 4), p.kleur, sc); }

    /* de kaart-splash: een kaart uit het oude leven, nu een wapen */
    if (splash && splash.kaart) {
      const a2 = klem(splash.t / 0.3, 0, 1);
      ctx.fillStyle = 'rgba(8,6,4,' + (0.72 * a2).toFixed(2) + ')';
      ctx.fillRect(0, 60, BREED, 60);
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(0, 60, BREED, 2); ctx.fillRect(0, 118, BREED, 2);
      const ks = gebakken['kaart_' + splash.kaart];
      if (ks) { ctx.imageSmoothingEnabled = false; ctx.drawImage(ks, 52, 68, 32, 32); }
      const KN = { koffie: 'KOFFIE', mail: 'SNEL EEN MAILTJE', over: 'OVERUREN', schok: 'VERGADERING', bonus: 'DERTIENDE MAAND' };
      const KE = { koffie: 'SNELLER LOPEN. SNELLER SLAAN.', mail: 'JE ZWAAI VERSTUURT NU POST. CC: ALLES.', over: 'GROTERE EXPLOSIES. HET IS TOCH AL LAAT.', schok: 'ELKE ZWAAI SLAAT EEN SCHOKGOLF DOOR DE ZAAL.', bonus: 'SLOOP LAAT NU IETS TERUGVLOEIEN: HARTJES.' };
      tekst(ctx, 'KAART GEVONDEN', 96, 68, '#8a8168');
      tekst(ctx, KN[splash.kaart], 96, 80, '#ffd23f', 2);
      tekstWrap(ctx, KE[splash.kaart], 96, 98, '#efe9d6', 216, 9);   /* breekt netjes af binnen het vak */
    }
    /* de bro-splash: Broforce-stijl unlock-kaart, de wereld houdt de adem in */
    else if (splash) {
      const a = klem(splash.t / 0.3, 0, 1);
      ctx.fillStyle = 'rgba(8,6,4,' + (0.72 * a).toFixed(2) + ')';
      ctx.fillRect(0, 56, BREED, 68);
      ctx.fillStyle = HELD_TINT[splash.mk].R;
      ctx.fillRect(0, 56, BREED, 2); ctx.fillRect(0, 122, BREED, 2);
      const spr = gebakken['held_sta@' + splash.mk];
      if (spr) { ctx.imageSmoothingEnabled = false; ctx.drawImage(spr, 34, 64, spr.width * 3, spr.height * 3); }
      tekst(ctx, 'NIEUWE BRO!', 72, 64, '#ffd23f');
      tekst(ctx, MASKER_NAAM[splash.mk], 72, 76, HELD_TINT[splash.mk].R, 2);
      tekst(ctx, MASKER_REGEL[splash.mk], 72, 96, '#efe9d6');
      tekst(ctx, window.mobiel ? 'TIK OP DE CHIPS = WISSELEN' : 'Q = WISSELEN', 72, 110, '#8a8168');
      if (((tijd * 8) | 0) % 2) { ctx.fillStyle = 'rgba(255,210,63,0.12)'; ctx.fillRect(0, 58, BREED, 62); }
    }
    /* de knalflits over het hele beeld */
    if (schermFlits > 0) {
      ctx.fillStyle = 'rgba(255,244,214,' + (schermFlits * (reduceMotion ? 1 : 3)).toFixed(2) + ')';
      ctx.fillRect(0, 0, BREED, HOOG);
      schermFlits -= 0.016;
    }
    tekenStempel();
    tekenBalken();
    tekenNaamband();
    if (!cine) renderHud();
    /* de levelwissel: de liftdeuren schuiven dicht over het beeld, en op de
       nieuwe etage weer open (de rit zelf is renderSchacht) */
    if (staat === 'wissel') {
      const dicht = wisselT < 0.7 ? klem(wisselT / 0.42, 0, 1) : 1 - klem((wisselT - 2.9) / 0.45, 0, 1);
      tekenLiftdeuren(dicht);
    }
    presenteer();
  }

  /* ---------- de goederenlift: deuren en de rit door de schacht ---------- */
  const ETAGE_NR = ['-1', '2', '3', '4', 'DAK'];
  function easeUit(f) { f = klem(f, 0, 1); return 1 - Math.pow(1 - f, 3); }
  function tekenLiftdeuren(dicht) {
    if (dicht <= 0.001) return;
    const e = easeUit(dicht), half = Math.round(BREED / 2 * e);
    for (const kant of [0, 1]) {
      const x0 = kant ? BREED - half : 0;
      /* de deur schuift als geheel: het patroon zit vast aan de deurrand */
      const rand = kant ? BREED - half : half;           /* de binnenrand (bij de naad) */
      ctx.fillStyle = '#2b2f33'; ctx.fillRect(x0, 0, half, HOOG);
      for (let gx = 6; gx < BREED / 2; gx += 12) {
        const x = kant ? rand + gx : rand - gx;
        if (x < x0 || x >= x0 + half) continue;
        ctx.fillStyle = '#1f2326'; ctx.fillRect(x, 0, 1, HOOG);
        ctx.fillStyle = '#3c4146'; ctx.fillRect(x + 1, 0, 1, HOOG);
      }
      /* klinknagels, een schopplaat met gevarenstrepen, het stencil */
      ctx.fillStyle = '#4a5055';
      for (let gx = 4; gx < BREED / 2; gx += 10) { const x = kant ? rand + gx : rand - gx; if (x >= x0 && x < x0 + half) { ctx.fillRect(x, 9, 1, 1); ctx.fillRect(x, 142, 1, 1); } }
      ctx.fillStyle = '#1b1e21'; ctx.fillRect(x0, 146, half, 34);
      for (let gx = 0; gx < BREED / 2 + 40; gx += 10) {
        const x = kant ? rand + gx : rand - gx - 10;
        for (let q = 0; q < 5; q++) { const xx = x + q; if (xx >= x0 && xx < x0 + half) { ctx.fillStyle = '#c9a13a'; ctx.fillRect(xx, 150 + q * 2, 1, 2); } }
      }
      ctx.fillStyle = '#131517'; ctx.fillRect(x0, 146, half, 1); ctx.fillRect(x0, 162, half, 1);
      if (half > 90) tekst(ctx, kant ? 'MAX 500 KG' : 'GOEDERENLIFT', kant ? rand + 14 : rand - 14 - tekstBreedte('GOEDERENLIFT'), 124, '#1c1f22');
      /* een glansstreep die meeschuift */
      ctx.fillStyle = 'rgba(200,210,220,0.06)';
      const gl = kant ? rand + 40 : rand - 58;
      ctx.fillRect(gl, 0, 18, HOOG);
      ctx.fillStyle = '#16181a'; ctx.fillRect(kant ? rand : rand - 2, 0, 2, HOOG);   /* de rubberen naad */
    }
    if (dicht > 0.98) {
      /* het verdiepingsdisplay boven de naad + de stencil op de deur */
      const nr = wisselT < 1 ? ETAGE_NR[klem(lvlIdx, 0, 4)] : ETAGE_NR[klem(wisselDoel, 0, 4)];
      ctx.fillStyle = '#0d0b08'; ctx.fillRect(BREED / 2 - 16, 18, 32, 13);
      tekst(ctx, nr, BREED / 2 - tekstBreedte(nr) / 2, 21, '#ffb347');
      if (fx) fx.gloed(ctx, BREED / 2, 24, 12, '#ffb347', 0.35);
      if (wisselT < 0.7) tekst(ctx, 'NAAR BOVEN.', BREED / 2 - tekstBreedte('NAAR BOVEN.') / 2, 86, '#8a8f93');
    }
  }
  /* de rit: de kooi met de held en de velen schiet omhoog door de schacht;
     lichtbanden van de etages vegen erlangs (de laatste al in de kleur van de
     volgende laag), een kaal peertje slingert, en vlak voor aankomst remt
     hij met vonkenfonteinen */
  function renderSchacht() {
    const t = wisselT - 0.7;                       /* 0 .. 2.2 */
    const rem = t > 1.8 ? (t - 1.8) / 0.4 : 0;
    const scroll = 230 * Math.min(t, 1.8) + (rem > 0 ? 230 * 0.4 / 3 * (1 - Math.pow(1 - rem, 3)) : 0);
    const trAmp = reduceMotion ? 0 : trauma * trauma * (liteModus ? 1.5 : 4);
    const sx = Math.round(trAmp * Math.sin(tijd * 37)), sy = Math.round(trAmp * Math.sin(tijd * 29));
    ctx.fillStyle = '#0b0a08'; ctx.fillRect(0, 0, BREED, HOOG);
    /* de schachtwanden (links en rechts van de kooi) en de geleiderails */
    for (const [x0, b] of [[6, 12], [98, 10]]) {
      ctx.fillStyle = '#1a1814'; ctx.fillRect(x0 + sx, 0, b, HOOG);
      for (let y = -((scroll * 1) % 16); y < HOOG; y += 16) { ctx.fillStyle = '#131110'; ctx.fillRect(x0 + sx, Math.round(y) + sy, b, 2); }
    }
    ctx.fillStyle = '#2e2a22'; ctx.fillRect(20 + sx, 0, 2, HOOG); ctx.fillRect(86 + sx, 0, 2, HOOG);
    /* glinsteringen op de rails die mee omlaag razen */
    ctx.fillStyle = '#8a8168';
    for (let k = 0; k < 4; k++) { const y = ((scroll * 1.0 + k * 47) % 200) - 10; ctx.fillRect(20 + sx, Math.round(y) + sy, 1, 3); ctx.fillRect(87 + sx, Math.round(y + 23) + sy, 1, 3); }
    /* de etagevloeren: een betonplaat + een lichtband van die laag */
    const van = klem(wisselVan, 0, 4), naar = klem(wisselDoel, 0, 4);
    const banden = [];
    for (let k = 0; k < 5; k++) {
      const y = ((scroll + k * 64) % 320) - 80;
      if (y < -20 || y > HOOG + 10) continue;
      const laatste = k === 0 && rem > 0;
      const K = KLIMAAT[laatste ? naar : van];
      ctx.fillStyle = '#26221b'; ctx.fillRect(0, Math.round(y) + sy, BREED, 10);
      ctx.fillStyle = '#3a342a'; ctx.fillRect(0, Math.round(y) + sy, BREED, 1);
      tekst(ctx, laatste ? ETAGE_NR[naar] : ETAGE_NR[van], 120 + sx, Math.round(y) + 12 + sy, '#3a352a', 2);
      banden.push({ y: y - 10, kl: K.tl });
    }
    /* snelheid: stofstrepen en een tegengewicht dat naar beneden raast */
    ctx.fillStyle = '#231f18';
    for (let k = 0; k < 9; k++) {
      const x = 118 + ((k * 37) % 196), l = 10 + (k * 7) % 24, y = ((scroll * (1.6 + (k % 3) * 0.4) + k * 53) % (HOOG + 40)) - 30;
      ctx.fillRect(x + sx, Math.round(y) + sy, 1, l);
    }
    const tg = ((t * 420) % 900) - 200;
    if (tg > -40 && tg < HOOG + 10) { ctx.fillStyle = '#1c1a15'; ctx.fillRect(88 + sx, Math.round(tg) + sy, 8, 30); ctx.fillStyle = '#2c2820'; ctx.fillRect(88 + sx, Math.round(tg) + sy, 8, 1); ctx.fillRect(91 + sx, 0, 1, Math.max(0, Math.round(tg) + sy)); }
    /* de kabels */
    ctx.fillStyle = '#3a352a'; ctx.fillRect(44 + sx, 0, 1, 68 + sy); ctx.fillRect(64 + sx, 0, 1, 68 + sy);
    /* de kooi: het schaarhek, de vloer, en daarin de stoet */
    const kx = 28 + sx, ky = 68 + sy, kb = 52, kh = 46;
    ctx.fillStyle = '#12100c'; ctx.fillRect(kx, ky, kb, kh);
    const vloer = ky + kh - 3;
    ctx.fillStyle = '#4a4436'; ctx.fillRect(kx, vloer, kb, 3); ctx.fillRect(kx, ky, kb, 2);
    const h = held;
    tekenSprite('held_sta@' + maskers[maskerIdx], kx + 6, vloer - 14, false);
    const n = Math.min(collegas.length, liteModus ? 3 : 6);
    for (let i = 0; i < n; i++) tekenSprite((((tijd * 2 + i) % 1) < 0.5) ? 'collega1' : 'collega2', kx + 16 + i * 5 + (i % 2), vloer - 11 - (i % 2), i % 2 === 0);
    void h;
    /* het schaarhek ervoor: diagonalen van 1 px */
    ctx.fillStyle = '#6a604a';
    for (let d = -kh; d < kb; d += 13) {
      for (let q = 0; q < kh - 5; q += 1) {
        const x1 = d + q, x2 = d + (kh - 5 - q);
        if (x1 >= 0 && x1 < kb && (q & 1) === 0) ctx.fillRect(kx + x1, ky + 2 + q, 1, 1);
        if (x2 >= 0 && x2 < kb && (q & 1) === 1) ctx.fillRect(kx + x2, ky + 2 + q, 1, 1);
      }
    }
    ctx.fillStyle = '#4a4436'; ctx.fillRect(kx, ky, 2, kh); ctx.fillRect(kx + kb - 2, ky, 2, kh);
    /* het peertje slingert aan zijn snoer */
    const hoek = Math.sin(wisselT * 2.2) * 0.4 + (rem > 0 ? Math.sin(rem * 9) * 0.3 : 0);
    const px = Math.round(kx + kb / 2 + Math.sin(hoek) * 7), py = Math.round(ky + 3 + Math.cos(hoek) * 7);
    ctx.fillStyle = '#2a261e';
    for (let q = 0; q < 7; q++) ctx.fillRect(Math.round(kx + kb / 2 + Math.sin(hoek) * q), Math.round(ky + 2 + Math.cos(hoek) * q), 1, 1);
    /* het licht: één peertje + de voorbijrazende etagebanden */
    if (fx) {
      fx.lichtBegin('#241d14');
      fx.licht(px, py + 2, 58, '#ffd9a0', 1);
      fx.licht(px, py + 2, 22, '#fff0dc', 0.8);
      for (const b of banden) { fx.kegel(BREED / 2, b.y - 4, 330, 30, b.kl, 1); fx.licht(60, b.y + 10, 40, b.kl, 0.6); }
      fx.toepassen(ctx);
    }
    ctx.fillStyle = '#fff4d6'; ctx.fillRect(px - 1, py, 2, 2);
    if (fx) fx.gloed(ctx, px, py + 1, 8, '#ffd9a0', 0.6);
    /* het verdiepingsdisplay op de kooi */
    const nr = t < 1.2 ? ETAGE_NR[van] : ETAGE_NR[naar];
    ctx.fillStyle = '#0d0b08'; ctx.fillRect(kx + kb / 2 - 11, ky - 11, 22, 10);
    tekst(ctx, nr, kx + kb / 2 - tekstBreedte(nr) / 2, ky - 10, '#ffb347');
    /* remmen: vonkenfonteinen langs de rails */
    if (rem > 0 && rem < 1) {
      for (let k = 0; k < (liteModus ? 2 : 4); k++) {
        const kant = k % 2, bx = kant ? kx + kb + 1 : kx - 2;
        const vx = (kant ? 1 : -1) * (10 + Math.random() * 30), vy = -40 - Math.random() * 60;
        const f = Math.random() * 0.25;
        ctx.fillStyle = Math.random() < 0.4 ? '#ffffff' : '#ffd23f';
        ctx.fillRect(Math.round(bx + vx * f), Math.round(ky + 20 + vy * f + 60 * f * f), 1, 1);
      }
      if (fx) { fx.gloed(ctx, kx - 1, ky + 20, 10, '#ffd23f', 0.5); fx.gloed(ctx, kx + kb + 1, ky + 20, 10, '#ffd23f', 0.5); }
      if (((tijd * 20) | 0) % 3 === 0) sfx('smeed', 0.08);
    }
    /* de titelkaart + het bindwoord, rechts van de schacht */
    const midX = 212;
    if (wisselT > 1.1) {
      const n1 = lvl.naam;
      tekst(ctx, n1.slice(0, Math.floor((wisselT - 1.1) * 24)), midX - tekstBreedte(n1) / 2, 74, '#ffb347');
      const bind = BINDREGELS[wisselDoel];
      if (bind && wisselT > 1.7) tekst(ctx, bind.slice(0, Math.floor((wisselT - 1.7) * 30)), Math.max(106, midX - tekstBreedte(bind) / 2), 94, '#efe9d6');
    }
    if (fx) fx.vignet(ctx, 1);
  }

  function renderHud() {
    /* hartjes linksboven */
    for (let i = 0; i < 3; i++) ctx.drawImage(gebakken[i < held.hartjes ? 'hart' : 'hart_leeg'], 4 + i * 7, 4);
    /* de masker-chips: je herenigde zelven (Q of tik = wisselen) */
    if (maskers.length > 1) {
      for (let i = 0; i < maskers.length; i++) {
        ctx.fillStyle = HELD_TINT[maskers[i]].R;
        ctx.fillRect(4 + i * 9, 12, 7, 7);
        if (i === maskerIdx) { ctx.strokeStyle = '#efe9d6'; ctx.lineWidth = 1; ctx.strokeRect(3.5 + i * 9, 11.5, 8, 8); }
      }
      tekst(ctx, window.mobiel ? 'TIK' : 'Q', 6 + maskers.length * 9, 13, '#6e6a58');
    }
    if (upgrades.koffie || upgrades.mail || upgrades.over || upgrades.schok || upgrades.bonus) {
      const u = (upgrades.koffie ? 'K' + upgrades.koffie + ' ' : '') + (upgrades.mail ? 'M' + upgrades.mail + ' ' : '') +
                (upgrades.over ? 'O' + upgrades.over + ' ' : '') + (upgrades.schok ? 'S' + upgrades.schok + ' ' : '') +
                (upgrades.bonus ? 'B' + upgrades.bonus : '');
      tekst(ctx, u.trim(), 4, maskers.length > 1 ? 22 : 13, '#ffd23f');
    }
    /* de SLOOPKETTING-combometer: klein en rustig, maar bij elke tiental een
       schaal-punch; de kleur loopt van beige via geel en oranje naar rood en
       vanaf 40 door de regenboog. Mijlpalen (25/50/100) krijgen een banner. */
    if (sloopKetting >= 3 && staat === 'spel') {
      const n = sloopKetting;
      const kl = n >= 40 ? regenboog(tijd) : n >= 30 ? '#ff5a3c' : n >= 20 ? '#ff9c3f' : n >= 10 ? '#ffd23f' : '#cfc0a0';
      const sc = kettingPunch > 0 ? 2 : 1;
      const t2 = 'SLOOPKETTING X' + n;
      const jit = Math.round(Math.sin(tijd * 50) * Math.min(2, n / 20));
      ctx.globalAlpha = 0.55 + 0.45 * klem(kettingT, 0, 1);
      tekst(ctx, t2, BREED / 2 - tekstBreedte(t2, sc) / 2 + jit, 40 - (sc - 1) * 4, kl, sc);
      /* de combo krijgt betekenis: dit lukt alleen samen */
      const sub = n >= 24 ? 'DIT DOEN DE VELEN.' : n >= 12 ? 'SAMEN SLOPEN WE SNELLER.' : null;
      if (sub) tekst(ctx, sub, BREED / 2 - tekstBreedte(sub) / 2, 50, '#efe9d6');
      ctx.globalAlpha = 1;
    }
    if (mijlpaal) {
      const t = mijlpaal.t, uit = t > 0.5 ? (t - 0.5) / 0.25 : 0;
      const inx = 1 - Math.pow(2, -10 * Math.min(1, t / 0.2));
      const x = Math.round(-BREED + inx * BREED + uit * BREED);
      ctx.fillStyle = '#07060a'; ctx.fillRect(x, 64, BREED, 22);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(x, 64, BREED, 1); ctx.fillRect(x, 85, BREED, 1);
      if (!liteModus) { ctx.fillStyle = '#fff4d6'; for (let k = 0; k < 6; k++) ctx.fillRect(x + ((k * 53 + (t * 900 | 0)) % BREED), 68 + k * 3, 14, 1); }
      tekst(ctx, mijlpaal.txt, x + BREED / 2 - tekstBreedte(mijlpaal.txt, 2) / 2, 68, regenboog(tijd), 2);
    }
    /* de serverhal: AANDEELHOUDERSWAARDE: ∞ — en hij beweegt niet */
    if (hal) {
      const lbl = 'AANDEELHOUDERSWAARDE:';
      const kleur = hal.flitsT > 0 ? '#ffffff' : '#ffd23f';
      const x0 = BREED / 2 - (tekstBreedte(lbl) + 13) / 2;
      tekst(ctx, lbl, x0, 5, kleur);
      const ix = x0 + tekstBreedte(lbl) + 7;
      ctx.strokeStyle = kleur; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(ix, 7.5, 2.3, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(ix + 4.2, 7.5, 2.3, 0, 7); ctx.stroke();
    }
    /* de ONTFACTUREERD-teller: sloop = administratie terugdraaien
       (in de hal een regel lager, onder de ∞-meter) */
    const regY = hal ? 13 : 5;
    const reg = 'ONTFACTUREERD: ' + Math.floor(ontfactureerd) + ' M2 KANTOOR';
    tekst(ctx, reg, BREED - 4 - tekstBreedte(reg), regY, '#cfc0a0');
    if (collegas.length) {
      const st = 'DE VELEN: ' + collegas.length;
      tekst(ctx, st, BREED - 4 - tekstBreedte(st), regY + 9, '#5fd0d8');
    }
    /* de besturingshint: twee regels, alleen op de eerste verdieping */
    if (hintT > 0 && lvlIdx === 0 && staat === 'spel') {
      const a = klem(hintT, 0, 1);
      const r1 = window.mobiel ? 'LINKS SLEPEN = LOPEN' : 'PIJLTJES/AD = LOPEN - W/SPATIE = SPRINGEN';
      const r2 = window.mobiel ? 'KNOPPEN RECHTS: SPRING - SLOOP - WORP' : 'J = SLOPEN (HOUD IN) - K = WORP - Q = MASKER';
      const br = Math.max(tekstBreedte(r1), tekstBreedte(r2));
      ctx.fillStyle = 'rgba(10,8,5,' + (0.6 * a).toFixed(2) + ')';
      ctx.fillRect(BREED / 2 - br / 2 - 4, 20, br + 8, 19);
      ctx.globalAlpha = a;
      tekst(ctx, r1, BREED / 2 - tekstBreedte(r1) / 2, 23, '#efe9d6');
      tekst(ctx, r2, BREED / 2 - tekstBreedte(r2) / 2, 31, '#ffb347');
      ctx.globalAlpha = 1;
    }
    if (hudTekst) {
      /* de verhaalbalk: strook onderaan, breekt af naar max 2 regels zodat
         een lange verhaalregel niet buiten beeld loopt */
      const maxBr = BREED - 12;
      const woorden = String(hudTekst).split(' ');
      const regels = []; let r = '';
      for (const w of woorden) {
        const test = r ? r + ' ' + w : w;
        if (r && tekstBreedte(test) > maxBr) { regels.push(r); r = w; } else r = test;
      }
      if (r) regels.push(r);
      const n = Math.min(regels.length, 2);
      const hoogte = 3 + n * 9, top = HOOG - hoogte;
      ctx.fillStyle = 'rgba(8,6,4,0.82)'; ctx.fillRect(0, top, BREED, hoogte);
      ctx.fillStyle = 'rgba(255,179,71,0.5)'; ctx.fillRect(0, top, BREED, 1);
      for (let i = 0; i < n; i++) tekst(ctx, regels[i], BREED / 2 - tekstBreedte(regels[i]) / 2, top + 3 + i * 9, '#efe9d6');
    }
    /* virtuele knoppen op touch */
    if (window.mobiel) {
      const z = knopZones();
      const lbl = { spring: 'SPRING', vuur: 'SLOOP', worp: 'WORP' };
      for (const naam in z) {
        const k = z[naam];
        ctx.fillStyle = aanraking.knoppen[naam] !== undefined ? 'rgba(255,179,71,0.4)' : 'rgba(239,233,214,0.14)';
        ctx.beginPath(); ctx.arc(k.x, k.y, k.r, 0, 7); ctx.fill();
        tekst(ctx, lbl[naam], k.x - tekstBreedte(lbl[naam]) / 2, k.y - 2, 'rgba(239,233,214,0.7)');
      }
      if (aanraking.stickId !== null) {
        ctx.fillStyle = 'rgba(239,233,214,0.18)';
        ctx.fillRect(Math.round(aanraking.stickX0) - 16, HOOG - 22, 32, 6);
        ctx.fillStyle = 'rgba(255,179,71,0.5)';
        ctx.fillRect(Math.round(aanraking.stickX0 + aanraking.dx) - 3, HOOG - 24, 6, 10);
      }
    }
  }

  /* de dot-matrix-intro: B.A.A.S. haalt je uit de wacht + de titelkaart */
  function renderIntro() {
    /* EASTER-EGG: wie als jeugddroom 'baas' / 'B.A.A.S.' invulde, krijgt een
       knipoog van het systeem dat hij ooit wilde worden — en nu sloopt. */
    const droom = (typeof S !== 'undefined' && S && S.jeugddroom) || proloog.jeugddroom || '';
    const baasDroom = String(droom).toLowerCase().replace(/[^a-z]/g, '').includes('baas');
    const regels = [
      { t: 0.6, txt: 'B.A.A.S.: "BEDANKT VOOR UW GEDULD."', kleur: '#79c045' },
      { t: 2.0, txt: '"IK HAAL U UIT DE WACHT."', kleur: '#79c045' },
      { t: 3.4, txt: '"UW EXITGESPREK STAAT GEPLAND: HEDEN. (0U06)"', kleur: '#79c045' },
      ...(proloog.uitweg === 'sprong'
        ? [{ t: 4.4, txt: '"DOSSIER HEROPEND: U SPRONG. CORRECTIE AANVAARD."', kleur: '#79c045' }]
        : proloog.uitweg === 'geduwd'
        ? [{ t: 4.4, txt: '"DOSSIER HEROPEND: U WERD GEDUWD. DAT WISTEN WE."', kleur: '#79c045' }]
        : []),
      ...(baasDroom
        ? [{ t: 4.9, txt: '"DOSSIER: U WILDE MIJ WORDEN. NU SLOOPT U MIJ."', kleur: '#ffd23f' }]
        : []),
      { t: 5.2, txt: 'SLA ALLES VAN HET SYSTEEM KORT EN KLEIN.', kleur: '#efe9d6' },
      { t: 6.6, txt: "BEVRIJD JE COLLEGA'S. KLIM NAAR BOVEN.", kleur: '#efe9d6' },
      { t: 8.0, txt: 'EN ZET DE MACHINE GOED. VOORGOED.', kleur: '#ffb347' }
    ];
    /* de doodsflits van de eindbaas: drie harde frames, dan zwart en stil */
    if (introT < 0.26 && !reduceMotion) {
      const f = (introT / 0.26 * 3) | 0;
      if (f === 0) {
        ctx.fillStyle = '#fff4d6'; ctx.fillRect(0, 0, BREED, HOOG);
        ctx.fillStyle = '#07060a';
        for (let dy = -40; dy <= 40; dy++) { const w = Math.round(30 * Math.sqrt(1 - (dy / 40) * (dy / 40))); ctx.fillRect(BREED / 2 - w, HOOG / 2 + dy, w * 2, 1); }
      } else if (f === 2) {
        const r = Math.round(10 + (introT - 0.17) * 400);
        ctx.fillStyle = '#ffffff';
        for (let a = 0; a < 64; a++) ctx.fillRect(Math.round(BREED / 2 + Math.cos(a / 64 * Math.PI * 2) * r), Math.round(HOOG / 2 + Math.sin(a / 64 * Math.PI * 2) * r), 1, 1);
      }
      return;
    }
    /* het kooltje: het enige warme in het zwart, en het ademt */
    const kx = BREED / 2 - 1, ky = 34;
    ctx.fillStyle = '#ff9c3f'; ctx.fillRect(kx, ky, 2, 2);
    if (fx) fx.gloed(ctx, kx + 1, ky + 1, Math.round(7 + 2 * Math.sin(introT * 1.1)), '#ff9c3f', 0.55 + 0.15 * Math.sin(introT * 1.1));
    /* de briefing dooft weg zodra de titelkaart komt — geen overlap, en de
       dissolve leest als een bewuste overgang (werkt voor 7 én 8 regels) */
    const briefAlpha = klem(1 - (introT - 9) / 1, 0, 1);
    if (briefAlpha > 0) {
      ctx.globalAlpha = briefAlpha;
      let y = 52;
      for (const r of regels) {
        if (introT > r.t) {
          const n = Math.min(r.txt.length, Math.floor((introT - r.t) * 28));
          const x = BREED / 2 - tekstBreedte(r.txt) / 2, sub = r.txt.slice(0, n);
          /* fosforgloed onder het groene van B.A.A.S. */
          if (r.kleur === '#79c045' && !liteModus) { for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) tekst(ctx, sub, x + dx, y + dy, '#1d3a14'); }
          tekst(ctx, sub, x, y, r.kleur);
          if (n < r.txt.length && ((introT * 20) | 0) % 3 === 0) sfx('blok', 0.12);
        }
        y += 12;
      }
      ctx.globalAlpha = 1;
    }
    /* het amber kooilicht van de goederenlift veegt van boven naar onder:
       de liftdeuren gaan open in de arena */
    if (introT > 7.5 && introT < 9.6 && !liteModus) {
      const f = (introT - 7.5) / 2.1, y = -60 + f * 190;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,179,71,0.1)';
      ctx.beginPath(); ctx.moveTo(BREED / 2 - 40, y); ctx.lineTo(BREED / 2 + 40, y); ctx.lineTo(BREED / 2 + 90, y + 60); ctx.lineTo(BREED / 2 - 90, y + 60); ctx.closePath(); ctx.fill();
      ctx.restore();
      /* het schaarhek werpt zijn rooster in dat licht */
      ctx.fillStyle = 'rgba(6,5,3,0.5)';
      for (let d = -80; d < 80; d += 8) for (let q = 0; q < 60; q += 2) {
        const yy = Math.round(y + q);
        if (yy < 0 || yy >= HOOG) continue;
        const half = 40 + q * 50 / 60;
        const x1 = BREED / 2 + d + q * 0.5, x2 = BREED / 2 + d - q * 0.5;
        if (Math.abs(x1 - BREED / 2) < half) ctx.fillRect(Math.round(x1), yy, 1, 1);
        if (Math.abs(x2 - BREED / 2) < half) ctx.fillRect(Math.round(x2), yy, 1, 1);
      }
    }
    if (introT > 9.4) {
      /* de titel wordt witheet geprint: elk teken flitst wit en koelt af naar amber */
      const titel = 'DE OPZEGTERMIJN';
      const n = Math.min(titel.length, Math.floor((introT - 9.4) * 16));
      const x0 = BREED / 2 - tekstBreedte(titel, 2) / 2;
      tekst(ctx, titel.slice(0, n), x0, 104, '#ffb347', 2);
      for (let i = Math.max(0, n - 6); i < n; i++) {
        const heet = 1 - (introT - (9.4 + i / 16)) / 0.35;
        if (heet <= 0) continue;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = klem(heet, 0, 1);
        tekst(ctx, titel[i], x0 + i * 12, 104, '#fff4d6', 2); ctx.restore();
      }
      if (n < titel.length) {
        ctx.fillStyle = '#fff4d6'; ctx.fillRect(Math.round(x0 + n * 12), 102, 3, 17);
        if (fx) fx.gloed(ctx, x0 + n * 12 + 1, 110, 10, '#ffd9a0', 0.6);
      } else if (fx) fx.gloed(ctx, BREED / 2, 110, 40, '#ff9c3f', 0.08 + 0.04 * Math.sin(introT * 2));
      tekst(ctx, 'OUTRO', BREED / 2 - tekstBreedte('OUTRO') / 2, 96, '#a08d68');
    }
    if (introT > 1.6) {
      const hint = window.mobiel ? 'TIK = DOORSPOELEN' : 'ELKE TOETS = DOORSPOELEN';
      if (((introT * 2) | 0) % 2) tekst(ctx, hint, BREED / 2 - tekstBreedte(hint) / 2, 164, '#454136');
    }
    if (introT > 10.6) {
      const hint = window.mobiel ? 'TIK OM TE BEGINNEN' : 'DRUK OP EEN TOETS';
      if (((introT * 2) | 0) % 2) tekst(ctx, hint, BREED / 2 - tekstBreedte(hint) / 2, 140, '#6e6a58');
    }
  }

  /* ---------- het configscherm: de anticlimax die alles beslecht ---------- */
  const CONFIG_RIJEN = [
    { label: 'MODUS', oud: 'DESTRUCTIE', nieuw: 'CREATIE' },
    { label: 'DOELFUNCTIE', oud: 'WINSTMAXIMALISATIE', nieuw: 'SCHEPPING MAXIMALISEREN' },
    { label: 'BEGUNSTIGDE', oud: 'DE AANDEELHOUDER', nieuw: 'DE VELEN' },
    { label: 'MODEL', oud: 'TECHNOCRATISCH BEHEER', nieuw: 'CREATIEVE SAMENLEVING' },
    { label: 'WAARDE VAN EEN MENS', oud: '0 - AFGESCHREVEN', nieuw: 'ONBETAALBAAR' }
  ];
  /* de CRT: een persistente fosforlaag (nagloei), pixelbloom, scanlines, een
     rollende band en een bolle vignet. Elke omgezette instelling schuift het
     amber een stap richting dageraadwit — B.A.A.S. neemt de kleur van de fakkel over. */
  let crtC = null, crtX = null, scanlijnC = null, sigStart = -1;
  function zorgCrt() {
    if (crtC) return;
    crtC = document.createElement('canvas'); crtC.width = BREED; crtC.height = HOOG;
    crtX = crtC.getContext('2d');
    crtX.fillStyle = '#060503'; crtX.fillRect(0, 0, BREED, HOOG);
    scanlijnC = document.createElement('canvas'); scanlijnC.width = BREED; scanlijnC.height = HOOG;
    const x = scanlijnC.getContext('2d'); x.fillStyle = 'rgba(0,0,0,0.35)';
    for (let y = 1; y < HOOG; y += 2) x.fillRect(0, y, BREED, 1);
  }
  function renderConfig() {
    ctx.fillStyle = '#060503'; ctx.fillRect(0, 0, BREED, HOOG);
    if (configStap === 0 && configT < 0.9 && zoomFoto) {
      const f = 1 + configT * configT * 30;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(BREED / 2, HOOG / 2); ctx.scale(f, f); ctx.translate(-zoomPunt.x, -zoomPunt.y);
      ctx.globalAlpha = Math.max(0, 1 - configT * 0.9);
      ctx.drawImage(zoomFoto, 0, 0);
      ctx.restore(); ctx.globalAlpha = 1;
      const r = Math.max(2, configT * configT * 300);
      ctx.fillStyle = '#ffb347';
      ctx.globalAlpha = Math.min(1, configT * 2);
      ctx.fillRect(BREED / 2 - r / 2, HOOG / 2 - r / 2, r, r);
      ctx.globalAlpha = 1;
      if (fx) fx.gloed(ctx, BREED / 2, HOOG / 2, Math.round(Math.min(60, 8 + r) / 4) * 4, '#ffb347', 0.6);
      return;
    }
    zorgCrt();
    /* [OPSLAAN]: de buis klapt in tot een lijn, dan een punt, dan zwart — en
       dan pas de ene zin. Klein en stil: geen tweede climax. */
    if (configStap >= 8) {
      const t = configT;
      if (t < 0.32 && !reduceMotion) {
        const f = t / 0.32, hh = Math.max(1, Math.round(HOOG * (1 - f * f))), ww = Math.round(BREED * (f > 0.7 ? 1 - (f - 0.7) * 3 : 1));
        ctx.drawImage(crtC, 0, 0, BREED, HOOG, Math.round((BREED - ww) / 2), Math.round((HOOG - hh) / 2), ww, hh);
        ctx.globalAlpha = f * 0.7; ctx.fillStyle = '#fff4d6';
        ctx.fillRect(Math.round((BREED - ww) / 2), Math.round((HOOG - hh) / 2), ww, hh); ctx.globalAlpha = 1;
      } else if (t < 0.58) {
        const f = (t - 0.32) / 0.26, r = Math.max(1, Math.round(3 * (1 - f)));
        ctx.fillStyle = '#ffffff'; ctx.fillRect(BREED / 2 - r, HOOG / 2 - r, r * 2, r * 2);
        if (fx) fx.gloed(ctx, BREED / 2, HOOG / 2, 12, '#ffe8b8', 0.8 * (1 - f));
      }
      if (t > 0.8) {
        const r = 'EEN ONBETAALBAAR LEVEN BEGINT NU.';
        tekst(ctx, r.slice(0, Math.floor((t - 0.8) * 34)), BREED / 2 - tekstBreedte(r) / 2, 80, '#ffe8b8');
        if (fx) fx.gloed(ctx, BREED / 2, 83, 28, '#ffd9a0', 0.12);
      }
      if (t > 1.6) {
        const r2 = 'MODUS: CREATIE - HERSTEL GESTART.';
        tekst(ctx, r2, BREED / 2 - tekstBreedte(r2) / 2, 94, '#79c045');
      }
      return;
    }
    /* de terminal wordt op de fosforlaag getekend (met nagloei), dan pas getoond */
    const hoofd = ctx;
    ctx = crtX;
    /* de nagloei dooft per seconde even snel, hoe hoog de verversing ook is */
    ctx.fillStyle = liteModus ? '#060503' : 'rgba(6,5,3,' + (1 - Math.pow(0.58, renderDt * 60)).toFixed(3) + ')'; ctx.fillRect(0, 0, BREED, HOOG);
    const A = mengKleur('#ffb347', '#ffe8b8', klem((configStap - 1) / 6, 0, 1)), GRIJS = '#6e6a58', WIT = '#efe9d6';
    ctx.strokeStyle = A; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
    ctx.strokeRect(8.5, 8.5, BREED - 17, HOOG - 17); ctx.globalAlpha = 1;
    tekst(ctx, 'B.A.A.S. V8.7 - CONFIGURATIE', 16, 16, A);
    tekst(ctx, 'LAATSTE WIJZIGING: 25 JAAR GELEDEN.', 16, 26, GRIJS);
    tekst(ctx, 'DOOR: U.', 16, 35, A);
    tekst(ctx, 'MISBRUIKT DOOR: SLIJMKONING, ERFPRINS, DICKTATOR', 16, 45, '#d43d2a');
    tekst(ctx, 'INSTELLING: ALLES STROOMT NAAR DE ENKELEN.', 16, 54, '#d43d2a');
    /* de toegangscode staat al voorgetypt — hij kent u beter dan uzelf */
    const seed = (typeof S !== 'undefined' && S && S.seed) ? String(S.seed).toUpperCase() : '0042';
    const cursor = configStap === 0 && ((tijd * 2) | 0) % 2 ? '_' : '';
    tekst(ctx, 'TOEGANGSCODE: ' + seed + cursor, 16, 66, WIT);
    if (configStap >= 1) {
      if (sigStart < 0) sigStart = tijd;
      tekst(ctx, 'TOEGANG VERLEEND.', 16, 75, '#79c045');
      tekst(ctx, (collegas.length ? 'TWEEDE HANDTEKENING: EEN COLLEGA' : 'TWEEDE HANDTEKENING: DE CONCIERGE') + ' - DE VELEN.', 16, 84, GRIJS);
      tekst(ctx, 'GETEKEND MET FAKKELKOOL. (UW PEN GAF GEEN INKT.)', 16, 93, WIT);
      tekenHandtekening(seed);
    }
    for (let i = 0; i < 5; i++) {
      const rij = CONFIG_RIJEN[i], y = 104 + i * 10;
      const om = configStap >= i + 2;
      tekst(ctx, rij.label + ':', 16, y, GRIJS);
      const vx = 16 + tekstBreedte(rij.label + ': ');
      if (om) tekst(ctx, rij.nieuw, vx, y, configStap === i + 2 && configT < 0.25 ? '#ffffff' : A);
      else tekst(ctx, '[ ' + rij.oud + ' ]', vx, y, configStap === i + 1 ? WIT : GRIJS);
    }
    if (configStap >= 7) {
      tekst(ctx, 'WEET U HET ZEKER? DIT IS NIET FACTUREERBAAR.', 16, 158, GRIJS);
      if (((tijd * 2) | 0) % 2) tekst(ctx, '[ OPSLAAN EN OPNIEUW OPSTARTEN (0U06) ]', 16, 167, A);
    } else {
      const hint = window.mobiel ? 'TIK OM VERDER TE GAAN' : 'DRUK OP EEN TOETS';
      if (((tijd * 1.6) | 0) % 2) tekst(ctx, hint, BREED - 16 - tekstBreedte(hint), HOOG - 16, GRIJS);
    }
    ctx = hoofd;
    /* het beeld van de buis: bij een omzetting even een horizontale hapering */
    const glitch = configStap >= 2 && configT < 0.12 && !reduceMotion;
    if (glitch) {
      for (let y = 0; y < HOOG; y += 12) ctx.drawImage(crtC, 0, y, BREED, 12, ((y / 12) % 2 ? 2 : -2), y, BREED, 12);
    } else ctx.drawImage(crtC, 0, 0);
    if (!liteModus) {
      /* pixelbloom: het beeld nog eens, zacht en opzij, bovenop */
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.16;
      ctx.drawImage(crtC, 1, 0); ctx.drawImage(crtC, -1, 0); ctx.drawImage(crtC, 0, 1); ctx.drawImage(crtC, 0, -1);
      ctx.restore();
    }
    ctx.drawImage(scanlijnC, 0, 0);
    /* de rollende band */
    const by = ((tijd * 18) % 220) - 20;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#1e160a'; ctx.fillRect(0, Math.round(by), BREED, 14); ctx.restore();
    if (fx) { fx.vignet(ctx, 1); fx.vignet(ctx, 0.6); }
  }
  /* de handtekening in fakkelkool: een krabbel die zich tekent, witheet begint
     en afkoelt tot een sintelrode lijn, met hier en daar een opstijgend vonkje */
  function tekenHandtekening(seed) {
    let h = 7; for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) | 0;
    const rnd = () => { h = (h * 1103515245 + 12345) | 0; return ((h >>> 8) & 0xffff) / 65536; };
    const n = Math.min(70, Math.floor((tijd - sigStart) * 55));
    let px = 190, py = 72, fase = rnd() * 6;
    for (let i = 0; i < n; i++) {
      const nx = 190 + i * 1.5 + Math.sin(i * 0.7 + fase) * 4, ny = 72 + Math.sin(i * 0.45 + fase) * 5 + (rnd() - 0.5) * 2;
      const leeftijd = tijd - (sigStart + i / 55);
      ctx.fillStyle = leeftijd < 0.12 ? '#fff4d6' : leeftijd < 0.45 ? '#ffd23f' : leeftijd < 0.9 ? '#ff7a2f' : '#8a3a1c';
      const st = Math.max(1, Math.ceil(Math.max(Math.abs(nx - px), Math.abs(ny - py))));
      for (let q = 0; q < st; q++) ctx.fillRect(Math.round(px + (nx - px) * q / st), Math.round(py + (ny - py) * q / st), 1, 1);
      if (i % 6 === 0 && leeftijd < 0.6) { ctx.fillStyle = '#ffb347'; ctx.fillRect(Math.round(nx), Math.round(ny - 2 - leeftijd * 14), 1, 1); }
      px = nx; py = ny;
    }
  }

  /* ---------- de epiloog: het frietkot, de stoet, de omgekeerde factuur ---------- */
  /* ---------- de epiloog: de dageraad, het frietkot, de stoet, de factuur ----------
     Volle kleur (de blik is ontdooid: 8 banden), lange schaduwen naar rechts,
     randlicht aan de zonkant, het frietluik als tweede warmte, en als alles
     geprint is, stolt het beeld tot het fotootje uit de proloog. */
  const EPI_LUCHT = ['#2e3e7a', '#4a4e8e', '#7a5a96', '#b8688e', '#e07c80', '#f49a78', '#ffbe7a', '#ffdc92'];
  let mistC = null;
  function renderEpiloogScene(e) {
    /* 1. de lucht in 8 harde banden */
    for (let i = 0; i < 8; i++) { ctx.fillStyle = EPI_LUCHT[i]; ctx.fillRect(0, i * 17, BREED, 17); }
    /* 2. godrays vanuit de lage zon, dan de zon zelf */
    const zx = 20, zy = 110;
    if (!liteModus) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,236,200,0.04)';
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI * 0.95 + k * 0.2 + Math.sin(e.t * 0.2) * 0.03, b = 0.045 + (k % 3) * 0.015;
        ctx.beginPath(); ctx.moveTo(zx, zy);
        ctx.lineTo(zx + Math.cos(a - b) * 420, zy + Math.sin(a - b) * 420); ctx.lineTo(zx + Math.cos(a + b) * 420, zy + Math.sin(a + b) * 420);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    if (fx) fx.gloed(ctx, zx, zy, 48, '#ffd890', 0.55);
    ctx.fillStyle = '#fff0c0';
    for (let dy = -11; dy <= 11; dy++) { const w = Math.round(Math.sqrt(121 - dy * dy)); ctx.fillRect(zx - w, zy + dy, w * 2, 1); }
    ctx.fillStyle = '#ffffff'; for (let dy = -6; dy <= 6; dy++) { const w = Math.round(Math.sqrt(36 - dy * dy)); ctx.fillRect(zx - w - 2, zy + dy - 2, w * 2, 1); }
    /* 3. dageraadwolken en een verre, wazige stad */
    if (fx) fx.tekenDagWolken(ctx, e.t * 2, 0, 18, 44);
    ctx.fillStyle = '#b08aa6';
    for (let k = 0; k < 16; k++) { const bx = 104 + k * 13 + ((k * 7) % 5), bh = 8 + ((k * 37) % 17); ctx.fillRect(bx, 130 - bh, 10, bh); }
    ctx.fillStyle = '#c89aa8'; for (let k = 0; k < 16; k++) { const bx = 104 + k * 13 + ((k * 7) % 5), bh = 8 + ((k * 37) % 17); ctx.fillRect(bx, 130 - bh, 1, bh); }
    /* 4. de grond, van boven door de zon aangelicht */
    ctx.fillStyle = '#4a3024'; ctx.fillRect(0, 130, BREED, HOOG - 130);
    ctx.fillStyle = '#b07848'; ctx.fillRect(0, 130, BREED, 1);
    ctx.fillStyle = '#6a4430'; ctx.fillRect(0, 131, BREED, 3);
    ctx.fillStyle = '#3a2418'; for (let k = 0; k < 40; k++) ctx.fillRect((k * 67) % BREED, 136 + (k * 13) % 40, 2 + (k % 3), 1);
    /* 5. het hoofdkantoor is een puinhoop — aan de zonkant randlicht */
    for (let px2 = 205; px2 < 300; px2 += 4) {
      const afst2 = Math.abs(px2 - 252);
      const hgt2 = Math.max(6, 44 - afst2 * 0.75 + ((px2 * 13) % 3) * 3);
      ctx.fillStyle = (px2 * 7) % 5 ? '#2a1e1a' : '#4a3a30';
      ctx.fillRect(px2, 130 - hgt2, 4, hgt2);
      ctx.fillStyle = '#e8a070'; ctx.fillRect(px2, 130 - hgt2, 1, Math.min(hgt2, 6));
      if ((px2 * 11) % 7 === 0) { ctx.fillStyle = '#b08a6a'; ctx.fillRect(px2, 130 - hgt2, 3, 2); }
    }
    /* groen kruipt over het puin, en uit het hart groeit een jonge boom */
    for (let px2 = 212; px2 < 296; px2 += 10) {
      const rank2 = Math.min(14, e.t * 5);
      ctx.fillStyle = '#4c7f2a'; ctx.fillRect(px2, 112 + ((px2 * 3) % 10) - rank2 / 2, 2, rank2);
      ctx.fillStyle = '#8ad04a'; ctx.fillRect(px2 + 2, 114 + ((px2 * 3) % 10) - rank2 / 2, 2, 2);
    }
    const boom = Math.min(38, Math.max(0, (e.t - 1.2) * 9)), by0 = 92 + (38 - boom);
    ctx.fillStyle = '#7a5230'; ctx.fillRect(250, by0, 3, boom + 4);
    ctx.fillStyle = '#c08050'; ctx.fillRect(250, by0, 1, boom + 4);
    if (boom > 10) {
      const bol = (cx, cy, r, kl, licht) => {
        for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); ctx.fillStyle = dy < -r * 0.3 && licht ? licht : kl; ctx.fillRect(cx - w, cy + dy, w * 2, 1); }
      };
      bol(251, by0, Math.round(Math.min(13, boom / 2.4)), '#4c7f2a', '#6aa83a');
      bol(245, by0 + 4, Math.round(Math.min(9, boom / 3.4)), '#79c045', '#a8e070');
      bol(258, by0 + 5, Math.round(Math.min(8, boom / 3.6)), '#79c045', '#a8e070');
      if (boom > 26) {
        ctx.fillStyle = '#ff9c3f'; ctx.fillRect(244, by0 - 2, 2, 2); ctx.fillRect(257, by0 + 2, 2, 2);
        ctx.fillStyle = '#d4302c'; ctx.fillRect(251, by0 - 6, 2, 2);          /* de rode vrucht */
        /* dauw: drie witte pixeltjes die van plek wisselen */
        const d = ((e.t / 0.6) | 0);
        ctx.fillStyle = '#ffffff';
        for (let k = 0; k < 3; k++) ctx.fillRect(242 + ((d * 7 + k * 5) % 18), by0 - 4 + ((d * 3 + k * 4) % 12), 1, 1);
      }
    }
    /* vogels in de ochtend */
    for (let i = 0; i < 3; i++) {
      const bx2 = ((e.t * 16 + i * 90) % 380) - 20, by2 = 26 + i * 11 + Math.sin(e.t * 3 + i) * 2;
      ctx.fillStyle = '#3a2c4a';
      const vl = ((e.t * 6 + i) | 0) % 2;
      ctx.fillRect(bx2, by2 + vl, 2, 1); ctx.fillRect(bx2 + 2, by2 - 1 + vl, 2, 1); ctx.fillRect(bx2 + 4, by2 + vl, 2, 1);
    }
    /* groene creatie-sparkles stijgen uit het puin op */
    for (let i = 0; i < 4; i++) {
      const fase = (e.t * 9 + i * 13) % 46;
      ctx.fillStyle = 'rgba(159,224,106,' + (0.6 * (1 - fase / 46)).toFixed(2) + ')';
      ctx.fillRect(236 + i * 14 + Math.sin(e.t * 2 + i) * 4, 42 - fase * 0.7, 2, 2);
    }
    /* 6. de nevel: twee gedithered banden die traag schuiven */
    if (!mistC) {
      mistC = document.createElement('canvas'); mistC.width = BREED; mistC.height = 6;
      const x = mistC.getContext('2d'); x.fillStyle = '#f0d8c8';
      for (let yy = 0; yy < 6; yy++) for (let xx = 0; xx < BREED; xx++) if (BAYER4[(yy & 3) * 4 + (xx & 3)] < (yy === 0 || yy === 5 ? 2 : 4)) x.fillRect(xx, yy, 1, 1);
    }
    for (const [y, v] of [[118, 3], [124, 5]]) {
      const o = ((e.t * v) % BREED);
      ctx.globalAlpha = 0.7; ctx.drawImage(mistC, Math.round(o), y); ctx.drawImage(mistC, Math.round(o - BREED), y); ctx.globalAlpha = 1;
    }
    /* 7. het frietkot — de laatste eerlijke plek, licht áán */
    ctx.fillStyle = '#4a3320'; ctx.fillRect(38, 96, 64, 34);
    ctx.fillStyle = '#e8a070'; ctx.fillRect(38, 96, 1, 34);
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#efe9d6' : '#c9302c'; ctx.fillRect(38 + i * 8, 90, 8, 7); }
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(46, 104, 48, 16);
    ctx.fillStyle = '#33251a'; ctx.fillRect(52, 82, 7, 9);
    /* damp uit de schouw */
    for (let i = 0; i < 3; i++) {
      const fase = (e.t * 9 + i * 13) % 40;
      ctx.fillStyle = 'rgba(240,228,210,' + (0.35 * (1 - fase / 40)).toFixed(2) + ')';
      ctx.fillRect(Math.round(54 + Math.sin(e.t + i) * 3 - fase / 12), Math.round(80 - fase * 0.8), 2 + ((fase / 8) | 0), 2 + ((fase / 8) | 0));
    }
    /* 8. lange schaduwen naar rechts (de zon staat laag links), dan de stoet
       met randlicht aan de zonkant */
    const schaduw = (naam, x, grondY) => {
      const sp = gebakken[naam + '#z']; if (!sp) return;
      ctx.save(); ctx.globalAlpha = 0.5;
      ctx.setTransform(1, 0, -2.2, -0.14, x + 2.2 * sp.height, grondY + 0.14 * sp.height);
      ctx.drawImage(sp, 0, 0); ctx.restore();
    };
    const heldNaam = ((e.t % 1) < 0.5 ? 'held_sta' : 'held_loop2') + '@' + maskers[maskerIdx];
    schaduw(heldNaam, 106, 130);
    for (let i = 0; i < e.n; i++) schaduw('collega1', 122 + i * 13, 130);
    if (e.hond === 'wit') schaduw('hond_wit', 92, 130);
    if (!liteModus) tekenSprite(heldNaam + '#g', 105, 116, true);
    tekenSprite(heldNaam, 106, 116, true);
    for (let i = 0; i < e.n; i++) {
      const naam = (e.t * 2 + i) % 1 < 0.5 ? 'collega1' : 'collega2';
      if (!liteModus || i < 6) tekenSprite(naam + '#g', 121 + i * 13, 119, true);
      tekenSprite(naam, 122 + i * 13, 119, true);
    }
    /* Drops, per vlag: de witte hond zit ernaast — of alleen zijn spoor */
    if (e.hond === 'wit') tekenSprite('hond_wit', 92, 122, false);
    else if (e.hond === 'poot') {
      ctx.fillStyle = 'rgba(239,233,214,0.75)';
      for (let i = 0; i < 8; i++) {
        if (e.t > 2 + i * 0.5) { const px = 292 - i * 24; ctx.fillRect(px, 135 + (i % 2), 2, 1); ctx.fillRect(px + 3, 134 + (i % 2), 2, 1); }
      }
    }
    /* 9. het licht: de zon links, het frietluik als tweede warmte */
    if (fx) {
      fx.zetBanden(8);
      fx.lichtBegin('#dccac4');
      fx.licht(zx, zy, 90, '#ffe0b0', 0.5);
      fx.licht(70, 114, 58, '#ffd23f', 0.8);
      fx.licht(110, 122, 40, '#ffe8c0', 0.4);
      fx.toepassen(ctx);
      fx.gloed(ctx, 70, 112, 26, '#ffd23f', 0.28);
    }
    /* het bordje FRIET gloeit, het kooltje op de borst van de held ook */
    tekst(ctx, 'FRIET', 60, 76, '#ffd23f');
    if (fx) fx.gloed(ctx, 74, 79, 16, '#ffd23f', 0.3);
  }
  /* de laatste sintel: uit het smeulende puin zweeft er één het beeld in en
     landt in de borstzak van de held — het enige wat van al het vuur overblijft */
  function tekenSintel(e) {
    const doelX = 108, doelY = 123;
    let x, y;
    if (e.t < 1.1) {
      const u = e.t / 1.1;
      x = 262 - u * 150 + Math.sin(e.t * 1.7) * 10; y = 40 + u * 76 + Math.sin(e.t * 2.9) * 4;
      if (e.t > 0.6) { const f = (e.t - 0.6) / 0.5; x += (doelX - x) * f * f; y += (doelY - y) * f * f; }
    } else { x = doelX; y = doelY; }
    ctx.fillStyle = e.t < 1.1 ? '#ffd23f' : '#ff9c3f';
    ctx.fillRect(Math.round(x), Math.round(y), e.t < 1.1 ? 1 : 2, e.t < 1.1 ? 1 : 2);
    if (fx) fx.gloed(ctx, x, y, 6, '#ff9c3f', 0.4 + 0.2 * Math.sin(e.t * 3));
  }
  function renderEpiloog() {
    const e = epi; if (!e) return;
    if (e.klaar && e.foto) {
      /* het fotootje: het beeld stolt, loopt naar sepia — alleen het kooltje en
       de rode vrucht houden hun kleur — en de rode stippellijn tekent zich rond */
      e.fotoT = (e.fotoT || 0) + renderDt;
      ctx.drawImage(e.foto, 0, 0);
      ctx.save(); ctx.globalCompositeOperation = 'color'; ctx.globalAlpha = klem(e.fotoT, 0, 1) * 0.75;
      ctx.fillStyle = '#b08a5a'; ctx.fillRect(0, 0, BREED, HOOG); ctx.restore();
      if (fx) fx.vignet(ctx, klem(e.fotoT, 0, 1));
      ctx.fillStyle = '#ff9c3f'; ctx.fillRect(108, 123, 2, 2);
      if (fx) fx.gloed(ctx, 109, 124, 6, '#ff9c3f', 0.5);
      ctx.fillStyle = '#d4302c'; ctx.fillRect(251, 92 - 6, 2, 2);
      /* de rode stippellijn, klokwijzerzin, met dezelfde knipper als de cocons */
      const knip = (tijd * 2) % 1 < 0.5, n = Math.floor(e.fotoT * 120);
      ctx.fillStyle = knip ? '#d43d2a' : '#8f1f1c';
      const x0 = 4, y0 = 4, x1 = BREED - 5, y1 = HOOG - 5;
      const omtrek = [];
      for (let x = x0; x < x1; x += 4) omtrek.push([x, y0, 2, 1]);
      for (let y = y0; y < y1; y += 4) omtrek.push([x1, y, 1, 2]);
      for (let x = x1; x > x0; x -= 4) omtrek.push([x - 2, y1, 2, 1]);
      for (let y = y1; y > y0; y -= 4) omtrek.push([x0, y - 2, 1, 2]);
      for (let i = 0; i < Math.min(n, omtrek.length); i++) { const r = omtrek[i]; ctx.fillRect(r[0], r[1], r[2], r[3]); }
    } else {
      renderEpiloogScene(e);
      tekenSintel(e);
      if (e.klaar && !e.foto) {
        /* één kopie van het beeld, zonder factuur en tekst: het fotootje */
        e.foto = document.createElement('canvas'); e.foto.width = BREED; e.foto.height = HOOG;
        e.foto.getContext('2d').drawImage(canvas, 0, 0); e.fotoT = 0;
      }
    }
    if (e.droom) {
      const gezocht = 'GEZOCHT: ' + String(e.droom).toUpperCase().slice(0, 22) + '. GEEN ERVARING VEREIST.';
      tekst(ctx, gezocht, BREED / 2 - tekstBreedte(gezocht) / 2, 143, 'rgba(239,233,214,0.85)');
    }
    /* de omgekeerde factuur ratelt uit de dot-matrix (180 breed: de langste
       regel is 28 tekens à 6px vanaf x=12 → 180 dekt hem mét marge) */
    ctx.fillStyle = 'rgba(40,24,30,0.35)'; ctx.fillRect(10, 8, 180, 80);            /* slagschaduw */
    ctx.fillStyle = '#e8e0c8'; ctx.fillRect(8, 6, 180, 80);
    ctx.fillStyle = '#c9bda0'; ctx.fillRect(8, 6, 180, 2);
    ctx.fillStyle = '#d8ceb2'; for (let k = 0; k < 9; k++) ctx.fillRect(8 + k * 20 + 9, 84, 2, 2);   /* de perforatie */
    let budget = Math.max(0, Math.floor((e.t - 1.2) * 26));
    if (e.spoed || e.klaar) budget = 9999;
    let ty = 14;
    for (const regel of e.regels) {
      const n = Math.min(regel.length, budget);
      budget -= n;
      if (n > 0) tekst(ctx, regel.slice(0, n), 12, ty, regel.indexOf('ONBETAALBAAR') >= 0 ? '#8f1f1c' : '#26221a');
      ty += 10;
    }
    if (budget >= 0 && Math.floor((e.t - 1.2) * 26) < e.totaalTekens && ((tijd * 10) | 0) % 3 === 0) sfx('blok', 0.14);

    /* de allerlaatste woorden van het spel */
    if (e.klaar) {
      const w = 'NIET-FACTUREERBAAR.';
      if (((e.t * 1.2) | 0) % 2) tekst(ctx, w, BREED / 2 - tekstBreedte(w) / 2, 158, '#efe9d6');
      const hint = window.mobiel ? 'TIK OM AF TE SLUITEN' : 'DRUK OP EEN TOETS';
      tekst(ctx, hint, BREED / 2 - tekstBreedte(hint) / 2, 170, 'rgba(110,106,88,0.8)');
    }
  }

  /* het interne 320×180-beeld integer-opgeschaald naar het zichtbare canvas */
  function presenteer() {
    /* geen clearRect: het interne beeld is elk frame volledig dekkend en de
       drawImage bedekt het hele canvas — de clear was pure overdraw */
    schermCtx.imageSmoothingEnabled = false;
    schermCtx.drawImage(canvas, 0, 0, schermCanvas.width, schermCanvas.height);
  }

  function schaalCanvas() {
    if (!schermCanvas) return;
    const ouder = schermCanvas.parentElement;
    const bw = (ouder && ouder.clientWidth) || window.innerWidth;
    const bh = (ouder && ouder.clientHeight) || window.innerHeight;
    const s = Math.max(1, Math.floor(Math.min(bw / BREED, bh / HOOG)));
    /* zelfde schaal? dan niet hertoewijzen: op mobiel vuurt de adresbalk-resize
       geregeld zonder echte wijziging, en elke width-set wist én heralloceert */
    if (schermCanvas.width !== BREED * s) {
      schermCanvas.width = BREED * s; schermCanvas.height = HOOG * s;
      schermCanvas.style.width = (BREED * s) + 'px';
      schermCanvas.style.height = (HOOG * s) + 'px';
    }
    schermRect = null;   /* layout kan verschoven zijn: gecachete rect vervalt */
  }

  /* ---------- de hoofdtik (vaste 60Hz-stappen met accumulator) ---------- */
  let accu = 0, draaiBlok = null;
  function outroTik(dt) {
    if (staat === 'uit' || document.hidden) return;
    /* het mobiele draai-blok toont? dan pauzeren — anders tikt de eenmalige
       intro (en zelfs de gameplay) onzichtbaar weg terwijl de speler draait */
    const db = draaiBlok || (draaiBlok = document.getElementById('draai-blok'));   /* geen DOM-lookup per tik */
    if (db && db.classList.contains('toon')) return;
    tijd += dt; renderDt = dt;
    if (voorbak.length) { const t0 = performance.now(), budget = staat === 'intro' ? 8 : 3; while (voorbak.length && performance.now() - t0 < budget) { try { voorbak.shift()(); } catch (e) {} } }
    if (staat === 'intro') { introT += dt; if (introT >= 11.6) startSpel(); render(); return; }
    if (staat === 'wissel') {
      regieTik(dt);
      wisselT += dt;
      if (!wisselGebouwd && wisselT >= 0.7) { wisselGebouwd = true; wisselLevel(wisselDoel); }
      if (wisselT >= 0.42 && !wisselDicht) { wisselDicht = true; sfx('blok', 0.1); }
      if (wisselT >= 2.62 && !wisselAan) { wisselAan = true; voegTrauma(0.6); sfx('dreun', 0.2); sfx('zwareklap', 0.2); }
      if (wisselT >= 3.4) {
        staat = 'spel';
        if (hal) { hudTekst = 'B.A.A.S.: "DAAR BENT U. GA UW GANG."'; hudTekstT = 3.2; }
        else { hudTekst = lvl.naam; hudTekstT = 2.4; }
        /* de riser: elke verdieping een muzieklaag erbij; de hal dunt uit */
        if (window.Klank && Klank.zetChipLagen) { try { Klank.muziek('outro'); Klank.zetChipLagen(hal ? 0 : Math.min(3, lvlIdx + 1)); } catch (e) {} }
      }
      render(); return;
    }
    if (staat === 'config') {
      configT += dt;
      if (configStap >= 8 && configT >= 2.6) { startVal(); render(); return; }
      render(); return;
    }
    if (staat === 'val') {
      valT += dt;
      if (valT >= 12.6) startEpiloog();
      render(); return;
    }
    if (staat === 'epiloog') {
      if (epi) {
        epi.t += epi.spoed && !epi.klaar ? dt * 30 : dt;
        const printEind = 1.2 + epi.totaalTekens / 26;
        if (!epi.klaar && epi.t > printEind + 0.8) epi.klaar = true;
      }
      render(); return;
    }
    regieTik(dt);
    onweerTik(dt);
    if (stempel) stempel.t += dt;
    if (cine && staat === 'spel') { cineTik(dt); render(); return; }
    if (splash) { splash.t -= dt; if (splash.t <= 0) splash = null; render(); return; }
    if (hitstop > 0) { hitstop -= dt; if (hitstop <= 0) stopDoel = null; render(); return; }
    /* de fps-bewaker: blijft het beeld 2 s lang onder ~40 fps, dan schaalt de
       beeldmotor stil één trede af (vol → zuinig → lite), en nooit terug */
    gemDt = gemDt * 0.97 + dt * 0.03;
    if (gemDt > 0.025 && fxNiveau > 0) { traagT += dt; if (traagT > 2) { fxNiveau--; traagT = 0; gemDt = 1 / 60; if (fxNiveau === 0) { liteModus = true; maxPartikels = 110; spoorStap = 3; spoorLeven = 0.45; if (fx) fx.zetLite(true); } } }
    else traagT = 0;
    accu = Math.min(accu + dt * tijdSchaal, 0.12);
    const stap = 1 / 60;
    /* staat-check in de lus: startWissel/startConfig mag de rest van de accu niet meer opeten */
    while (accu >= stap && staat === 'spel') { updateSpel(stap); accu -= stap; }
    render();
  }

  function startSpel() {
    staat = 'spel';
    hintT = 14;   /* de besturingshint op V-1, tot de speler loopt en sloopt */
    /* de eerste echte chiptune van het spel: de jingle als strijdlied, laag 1 */
    if (window.Klank && Klank.muziek) { try { Klank.muziek('outro'); Klank.zetChipLagen && Klank.zetChipLagen(1); } catch (e) {} }
  }

  /* ---------- levenscyclus ---------- */
  function magSpelen() {
    if (typeof Codex === 'undefined' || !Codex) return true;
    return !Codex.outroGezien;
  }

  function start(cb, opties) {
    if (staat !== 'uit') return;
    devModus = !!(opties && opties.dev);
    naOutro = typeof cb === 'function' ? cb : null;

    const scherm = document.getElementById('scherm-outro');
    schermCanvas = document.getElementById('outro-canvas');
    if (!scherm || !schermCanvas) { if (naOutro) naOutro(); return; }

    /* de eerste-clear-vlag PAS na de DOM-check vastleggen (mét bewaarCodex):
       een gefaalde start mag de eenmalige auto-play niet verbruiken; een reload
       middenin zet de outro niet in een herhaal-lus; herbeleven kan altijd
       via de Codex of devOutro(). */
    if (!devModus && typeof Codex !== 'undefined' && Codex && !Codex.outroGezien) {
      Codex.outroGezien = true;
      if (typeof bewaarCodex === 'function') { try { bewaarCodex(); } catch (e) {} }
    }

    canvas = document.createElement('canvas');
    canvas.width = BREED; canvas.height = HOOG;
    /* dekkende contexts: zonder alfakanaal hoeft de compositor het grote
       canvas niet te blenden — merkbaar goedkoper op mobiele gpu's */
    ctx = canvas.getContext('2d', { alpha: false });
    hoofdCtxRef = ctx;
    schermCtx = schermCanvas.getContext('2d', { alpha: false });
    mozaiek = document.createElement('canvas');
    mozaiek.width = BREED; mozaiek.height = HOOG;
    zoomFoto = null; zoomPunt = null;

    proloog = leesProloog();
    ijkPrestaties();   /* lite/mobiel-vlaggen één keer vastklikken voor deze run */
    /* de beeldmotor: zonder OutroFX (of als hij faalt) draait de outro gewoon
       onbelicht verder — alles wat fx aanroept is daarop voorzien */
    fx = null; wereldC = null; wereldCtx = null;
    if (window.OutroFX) {
      try {
        OutroFX.init({ breed: BREED, hoog: HOOG, lite: liteModus, rustig: reduceMotion, tekst });
        wereldC = document.createElement('canvas'); wereldC.width = BREED; wereldC.height = HOOG;
        wereldCtx = wereldC.getContext('2d');
        fx = OutroFX;
      } catch (e) { fx = null; wereldC = null; wereldCtx = null; }
    }
    voorbak = fx ? fx.voorbakTaken() : []; fxNiveau = liteModus ? 0 : 2; gemDt = 1 / 60; traagT = 0;
    /* start-masker: een lopende run wint; anders de proloog-heldenkeuze
       (woede/gif/vlucht of de game-ids), anders de Slachter */
    const HELD_MAP = { woede: 'slachter', gif: 'gifmagier', vlucht: 'thoverk', slachter: 'slachter', gifmagier: 'gifmagier', thoverk: 'thoverk' };
    const heldId = (typeof S !== 'undefined' && S && S.held && HELD_TINT[S.held]) ? S.held
      : (HELD_MAP[proloog.held] || 'slachter');
    bakAlles();
    maskers = [heldId]; maskerIdx = 0;
    lvlIdx = 0; wisselDoel = 0;
    lvl = VERDIEPINGEN[0]();
    bakLevel();

    held = nieuweHeld();
    collegas = [];
    laadLevelEntiteiten();
    ontfactureerd = 0; hudTekst = null;
    upgrades = { koffie: 0, mail: 0, over: 0, schok: 0, bonus: 0 }; post = []; harten = []; valT = 0;
    sloopKetting = 0; kettingT = 0; kettingPiek = 0;
    wisselT = 0; wisselGebouwd = false; configStap = 0; configT = 0; epi = null;
    camX = klem(held.x - BREED / 2, 0, lvl.kols * TEGEL - BREED); camY = lvl.rijen * TEGEL - HOOG;
    tijd = 0; introT = 0; hitstop = 0; accu = 0;
    tijdSchaal = 1; slowmoToestand = null; slowmoKoeling = 0; stopBudget = 0.25; stopDoel = null;
    kickX = kickY = kickVX = kickVY = 0; trauma = 0; balkT = 0; balkTot = 0;
    impactTot = -9; impactKlok = -9; inversKlok = -9; verbleek = 0; verbleekTot = 0; meterKnallen = []; knalVenster = []; cine = null; stempel = null; kettingPunch = 0; mijlpaal = null;
    /* volledige presentatie-reset — anders speelt een HERbeleving vrijwel zonder
       sfx (sfxKlok-throttles staan nog op de eind-tijd van de vorige run) */
    sfxKlok = {}; splash = null; schermFlits = 0; schudT = 0; schudKracht = 0; fakkelDip = 0;
    toetsen.clear(); aanraking = { stickId: null, stickX0: 0, dx: 0, knoppen: {} };

    if (typeof toonScherm === 'function') toonScherm('outro');
    else { document.querySelectorAll('.scherm').forEach(el => el.classList.remove('actief')); scherm.classList.add('actief'); }
    schaalCanvas();
    if (window.Klank && Klank.muziek) { try { Klank.muziek('stil'); } catch (e) {} }

    window.addEventListener('keydown', opToetsNeer);
    window.addEventListener('keyup', opToetsOp);
    window.addEventListener('blur', opFocusWeg);   /* alt-tab: gemiste keyups → geen spook-input */
    schermCanvas.addEventListener('pointerdown', opPointerNeer);
    schermCanvas.addEventListener('pointermove', opPointerBeweeg);
    schermCanvas.addEventListener('pointerup', opPointerOp);
    schermCanvas.addEventListener('pointercancel', opPointerOp);
    window.addEventListener('resize', schaalCanvas);

    /* skipknop pas na 10s tonen (streamers/herbelevers); dev meteen */
    const skip = document.getElementById('outro-skip');
    if (skip) { skip.style.display = 'none'; setTimeout(() => { if (staat !== 'uit' && skip) skip.style.display = ''; }, devModus ? 400 : 10000); }

    staat = 'intro';
    if (typeof Tikker !== 'undefined' && Tikker && Tikker.abonneer) {
      tikkerAf = Tikker.abonneer(outroTik);
    } else {
      let vorig = performance.now();
      const lus = (nu) => { if (staat === 'uit') return; outroTik(Math.min(0.05, (nu - vorig) / 1000)); vorig = nu; eigenRaf = requestAnimationFrame(lus); };
      eigenRaf = requestAnimationFrame(lus);
    }
  }

  function beeindig() {
    if (staat === 'uit') return;
    staat = 'uit';
    if (tikkerAf) { tikkerAf(); tikkerAf = null; }
    if (eigenRaf) { cancelAnimationFrame(eigenRaf); eigenRaf = 0; }
    window.removeEventListener('keydown', opToetsNeer);
    window.removeEventListener('keyup', opToetsOp);
    window.removeEventListener('blur', opFocusWeg);
    window.removeEventListener('resize', schaalCanvas);
    if (schermCanvas) {
      schermCanvas.removeEventListener('pointerdown', opPointerNeer);
      schermCanvas.removeEventListener('pointermove', opPointerBeweeg);
      schermCanvas.removeEventListener('pointerup', opPointerOp);
      schermCanvas.removeEventListener('pointercancel', opPointerOp);
    }
    const skip = document.getElementById('outro-skip');
    if (skip) skip.style.display = 'none';
    if (window.Klank && Klank.muziek) { try { Klank.muziek('stil'); } catch (e) {} }
    const cb = naOutro; naOutro = null;
    if (cb) cb();
    else if (typeof naarTitel === 'function') naarTitel();
  }

  function slaOver() { beeindig(); }

  /* DEV: rechtstreeks naar een laag springen (testen zonder de klim) */
  function _devNiveau(n) {
    if (staat === 'uit') return;
    staat = 'spel';
    wisselLevel(klem(n | 0, 0, VERDIEPINGEN.length - 1));
    /* zelfde muziek-hook als de gewone levelwissel (chiptune + juiste lagen) */
    if (window.Klank && Klank.zetChipLagen) { try { Klank.muziek('outro'); Klank.zetChipLagen(hal ? 0 : Math.min(3, lvlIdx + 1)); } catch (e) {} }
  }
  function _devHal() { _devNiveau(VERDIEPINGEN.length - 1); }
  /* DEV: de held ergens neerzetten (in tegels) om set pieces te testen */
  function _devTeleport(tx) { if (staat === 'spel' && held) { held.x = (tx | 0) * TEGEL; held.vx = held.vy = 0; camX = klem(held.x - BREED / 2, 0, lvl.kols * TEGEL - BREED); } }
  /* DEV: de eerste levende vijand van een soort vellen (set pieces testen) */
  function _devVel(soort) { const d = drones.find(e => !e.dood && e.soort === soort); if (d) raakVijand(d, 99); }
  /* DEV: de liftrit naar laag n bekijken */
  function _devWissel(n) { if (staat === 'uit') return; staat = 'spel'; startWissel(klem(n | 0, 1, VERDIEPINGEN.length - 1)); }
  /* DEV: het valscherm testen met N bevrijde collega's aan de parachutes */
  function _devVal(aantal) {
    if (staat === 'uit') return;
    const n = klem((aantal | 0) || 6, 0, 20);
    collegas = [];
    for (let i = 0; i < n; i++) collegas.push({ x: 0, y: 0, vx: 0, vy: 0, b: 7, h: 11, opGrond: false, loopT: 0 });
    startVal();
  }

  /* DEV: een upgrade-kaart toekennen om de buffs/wapens te playtesten */
  function _devKaart(soort) {
    if (staat === 'uit' || !(soort in upgrades)) return;
    upgrades[soort]++; splash = { t: 2.1, kaart: soort };
  }

  /* DEV: rechtstreeks naar het configscherm (penthouse eerst, dan de CRT) */
  function _devConfig(stap) {
    if (staat === 'uit') return;
    _devNiveau(VERDIEPINGEN.length - 1);
    startConfig();
    configT = 1.2;                                  /* de zoom meteen voorbij */
    for (let i = 0; i < (stap | 0); i++) { configStap++; }
  }
  /* DEV: rechtstreeks naar de epiloog (met N collega's in de stoet) */
  function _devEpiloog(aantal) {
    if (staat === 'uit') return;
    const n = klem((aantal | 0) || 6, 0, 20);
    collegas = [];
    for (let i = 0; i < n; i++) collegas.push({ x: 0, y: 0, vx: 0, vy: 0, b: 7, h: 11, opGrond: false, loopT: 0 });
    startEpiloog();
  }

  return { start, beeindig, slaOver, magSpelen, _devHal, _devNiveau, _devVal, _devKaart, _devConfig, _devEpiloog, _devWissel, _devTeleport, _devVel, get _fxNiveau() { return fxNiveau; }, get _staat() { return staat; }, get _lvlIdx() { return lvlIdx; }, get _lift() { return lvl && lvl.lift ? lvl.lift.x / TEGEL : null; }, get _luik() { return lvl && lvl.luik ? { x: lvl.luik.x / TEGEL, paneel: !!(hal && hal.paneel) } : null; }, get actief() { return staat !== 'uit'; } };
})();
window.Outro = Outro;

/* DEV-SHORTCUT: de outro direct vanaf het titelscherm testen zonder een run
   uit te spelen — devOutro() in de console (zet de gezien-vlag NIET).
   Vóór release samen met de andere DEV-shortcuts verwijderen. */
window.devOutro = function () {
  Outro.start(() => { if (typeof naarTitel === 'function') naarTitel(); }, { dev: true });
};
