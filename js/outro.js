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
  const T = { LUCHT: 0, BETON: 1, GIPS: 2, GLAS: 3, MEUBEL: 4, KAST: 5, MACHINE: 6, HOUT: 7, METER: 8, POSTER: 9, POORT: 10 };
  const TEGEL_HP = [0, 255, 1, 1, 1, 1, 2, 1, 1, 1, 3];
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
    'W': '#ffffff'
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
      '.kffffk.',
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
      '.kffffk.',
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
      '.kffffk.',
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
      '.kffffk.',
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
    slang: [
      '..............',
      'ss..ss..ssss..',
      'sSssSSssSzSs..',
      'ssssssssssss..',
      '.s..s..s..s...',
      '..............'
    ]
  };
  /* ---------- 3×5 pixel-font (hoofdletters — alle outro-UI is kapitaal) ---------- */
  const FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011',
    D: '110101101101110', E: '111100110100111', F: '111100110100100',
    G: '011100101101011', H: '101101111101101', I: '111010010010111',
    J: '001001001101010', K: '101110100110101', L: '100100100100111',
    M: '101111111101101', N: '101111111111101', O: '010101101101010',
    P: '110101110100100', Q: '010101101010001', R: '110101110110101',
    S: '011100010001110', T: '111010010010010', U: '101101101101111',
    V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111',
    '0': '111101101101111', '1': '010110010010111', '2': '110001010100111',
    '3': '111001011001111', '4': '101101111001001', '5': '111100110001110',
    '6': '011100111101111', '7': '111001010100100', '8': '010101010101010',
    '9': '111101111001110',
    ':': '000010000010000', '.': '000000000000010', ',': '000000000010100',
    '-': '000000111000000', '+': '000010111010000', '!': '010010010000010',
    '?': '110001010000010', '/': '001001010100100', "'": '010010000000000',
    '"': '101101000000000', '(': '010100100100010', ')': '010001001001010',
    '[': '110100100100110', ']': '011001001001011',
    ' ': '000000000000000'
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
  let camX = 0, camY = 0;
  let held = null, drones = [], kogels = [], cocons = [], collegas = [], worp = null;
  let cellen = [], droomkast = null, gifbal = null;  /* masker-cellen, de jeugddroom-kast, de gifboog */
  let maskers = ['slachter'], maskerIdx = 0, signKlok = 0, papierWachtrij = 0, papierBron = null;
  let lvlIdx = 0, wisselDoel = 0, dakval = null;     /* de keten van verdiepingen + de dak-instorting */
  let mozaiek = null, zoomFoto = null, zoomPunt = null;   /* dither-intro + de pixel-zoom naar de terminal */
  let partikels = [], popups = [], popupWachtrij = 0, popupKlok = 0;
  let bomWachtrij = [], stortWachtrij = [];     /* kettingreacties + instortende kolommen */
  let hal = null;                               /* serverhal-staat (B.A.A.S., ∞, het paneel) */
  let wisselT = 0, wisselGebouwd = false;       /* de overgang verdieping → serverhal */
  let configStap = 0, configT = 0, epi = null;  /* het configscherm + de epiloog */
  let ontfactureerd = 0;                        /* m² kantoor */
  let hudTekst = null, hudTekstT = 0;           /* droge regels (bevrijding, respawn) */
  let toetsen = new Set();
  let vuurBuf = 0, worpBuf = 0;   /* een ultrakorte tik mag nooit verloren gaan */
  let aanraking = { stickId: null, stickX0: 0, dx: 0, knoppen: {} };
  let sfxKlok = {};                             /* per-naam cooldown: geen 40 klappen per frame */
  let devModus = false;

  /* ---------- kleine helpers ---------- */
  const klem = (v, a, b) => v < a ? a : (v > b ? b : v);
  function sfx(naam, min) {
    if (!window.Klank || !Klank.sfx) return;
    const nu = tijd;
    if (sfxKlok[naam] && nu - sfxKlok[naam] < (min || 0.07)) return;
    sfxKlok[naam] = nu;
    try { Klank.sfx(naam); } catch (e) {}
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
    return c;
  }

  function bakAlles() {
    gebakken = {};
    for (const naam in SPRITES) {
      if (naam.indexOf('held') === 0) {
        /* de held in alle drie de masker-tinten — wisselen is een blit */
        for (const mk in HELD_TINT) gebakken[naam + '@' + mk] = bakSprite(SPRITES[naam], HELD_TINT[mk]);
      } else {
        gebakken[naam] = bakSprite(SPRITES[naam], null);
      }
    }
  }

  /* tekst in het 3×5-font (alleen hoofdletters; onbekende tekens = spatie) */
  function tekst(cx, str, x, y, kleur, schaal) {
    schaal = schaal || 1;
    cx.fillStyle = kleur;
    str = String(str).toUpperCase();
    let px = x;
    for (const ch of str) {
      const gl = FONT[ch] || FONT[' '];
      for (let i = 0; i < 15; i++) {
        if (gl[i] === '1') cx.fillRect(px + (i % 3) * schaal, y + ((i / 3) | 0) * schaal, schaal, schaal);
      }
      px += 4 * schaal;
    }
    return px - x;
  }
  const tekstBreedte = (str, schaal) => String(str).length * 4 * (schaal || 1) - (schaal || 1);

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
        { soort: 'slang', x: 81 * TEGEL, y: (H - 3) * TEGEL + 2 }
      ],
      cocons: [{ x: 25 * TEGEL, y: (H - 5) * TEGEL }, { x: 67 * TEGEL, y: (H - 5) * TEGEL }],
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
    /* de badge-poortjes: twee kolom-doorgangen op slot — slopen of niets */
    for (const px of [30, 92]) { zet(px, H - 3, T.POORT); zet(px, H - 4, T.POORT); zet(px, H - 5, T.POORT); }

    /* een tussenverdieping van hout, met machines en een glaswand */
    vul(38, 12, 48, 12, T.HOUT); vul(70, 10, 80, 10, T.HOUT); vul(100, 13, 108, 13, T.HOUT);
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
        { soort: 'slang', x: 66 * TEGEL, y: (H - 3) * TEGEL + 2 }
      ],
      cocons: [{ x: 12 * TEGEL, y: (H - 5) * TEGEL }, { x: 47 * TEGEL, y: (H - 5) * TEGEL }, { x: 87 * TEGEL, y: (H - 5) * TEGEL }],
      cellen: [{ x: 71 * TEGEL, y: (H - 5) * TEGEL }],
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
    zet(28, 10, T.MACHINE); zet(51, 8, T.MACHINE); zet(73, 11, T.MACHINE);
    for (const [ex, ey] of [[14, H - 3], [36, H - 3], [53, 8], [68, H - 3], [93, H - 3], [108, H - 3]]) zet(ex, ey, T.METER);
    for (const wx of [23, 59, 99]) zet(wx, 5, T.POSTER);

    return {
      naam: 'V3 — DE DIRECTIE-ETAGE',
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
        { soort: 'drone', x: 90 * TEGEL, y: 5 * TEGEL }
      ],
      cocons: [{ x: 16 * TEGEL, y: (H - 5) * TEGEL }, { x: 58 * TEGEL, y: (H - 5) * TEGEL }, { x: 82 * TEGEL, y: (H - 5) * TEGEL }],
      cellen: [{ x: 37 * TEGEL, y: (H - 5) * TEGEL }],
      droomkast: { x: 61 * TEGEL, y: (H - 5) * TEGEL },
      lift: { x: 113 * TEGEL, y: (H - 8) * TEGEL, b: 4 * TEGEL, h: 5 * TEGEL }
    };
  }

  /* de keten: Archief → Kantoortuin → Directie → Serverhal */
  const VERDIEPINGEN = [bouwTestVerdieping, bouwKantoortuin, bouwDirectie, bouwServerhal];

  function maakVijand(v) {
    const e = { soort: v.soort, x: v.x, y: v.y, x0: v.x, y0: v.y, t: Math.random() * 6, klok: 1 + Math.random(), dood: false, vx: 0, vy: 0, opGrond: false, loopT: 0 };
    if (v.soort === 'drone') e.hp = 2;
    else if (v.soort === 'kopieerbot') { e.hp = 3; e.b = 9; e.h = 9; e.spawnKlok = 2.2; e.kids = 0; }
    else if (v.soort === 'kopie') { e.hp = 1; e.b = 9; e.h = 9; e.ouder = v.ouder || null; }
    else if (v.soort === 'torentje') e.hp = 3;
    else if (v.soort === 'slang') { e.hp = 2; e.richting = 1; }
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
  function bakBaas() {
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
        x.fillStyle = w < 2 ? '#79c045' : w === 2 ? '#ffb347' : '#171d21';
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
      frames.push(c);
    }
    return frames;
  }

  /* B.A.A.S.'s droge dank per salvo — het geweld wordt beleefd geboekt */
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
      hal.regel = BAAS_REGELS[((hal.baasHits / 4 - 1) | 0) % BAAS_REGELS.length];
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
    kogels = []; partikels = []; popups = []; popupWachtrij = 0; worp = null; gifbal = null;
    bomWachtrij = []; stortWachtrij = []; dakval = null; papierWachtrij = 0; signKlok = 0;
    hal = lvl.soort === 'hal'
      ? { t: 0, baasHits: 0, laatsteHit: -99, regel: null, regelT: 0, flitsT: 0, paneel: false, spawnKlok: 2.5, frames: bakBaas() }
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
    for (let i = 0; i < stoet; i++) collegas.push({ x: held.x - 12 * (i + 1), y: held.y + 3, vx: 0, vy: 0, b: 7, h: 11, opGrond: false, loopT: 0 });
    camX = klem(held.x - BREED / 2, 0, lvl.kols * TEGEL - BREED);
  }

  function startWissel(doel) {
    staat = 'wissel'; wisselT = 0; wisselGebouwd = false; wisselDoel = doel;
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
    drones = []; kogels = []; popups = []; partikels = []; hudTekst = null;
    if (window.Klank && Klank.muziek) { try { Klank.muziek('stil'); } catch (e) {} }
    sfx('blok', 0.2);
  }
  function configVolgende() {
    if (configStap >= 6) return;
    if (configStap === 0 && configT < 1) return;   /* de zoom eerst laten landen */
    configStap++; configT = 0;
    sfx(configStap === 6 ? 'energie' : 'blok', 0.05);
  }

  /* Drops-vlaggen, defensief gelezen (de outro moet ook zonder run draaien) */
  function dropsWitActief() {
    try { if (typeof isOntgrendeld === 'function' && isOntgrendeld('drops_wit')) return true; } catch (e) {}
    return !!(typeof Codex !== 'undefined' && Codex && Array.isArray(Codex.metgezellen) && Codex.metgezellen.includes('drops_wit'));
  }
  function dropsGevallen() {
    return !!(typeof Codex !== 'undefined' && Codex && Array.isArray(Codex.gevallen) && Codex.gevallen.includes('drops'));
  }

  function startEpiloog() {
    staat = 'epiloog';
    const dots = (links, rechts) => {
      let s = links + ' ';
      while (s.length + rechts.length + 1 < 36) s += '.';
      return s + ' ' + rechts;
    };
    epi = {
      t: 0, spoed: false, klaar: false,
      hond: dropsWitActief() ? 'wit' : (dropsGevallen() ? 'poot' : null),
      n: collegas.length,
      regels: [
        'EINDAFREKENING - B.A.A.S.',
        '',
        dots('3 VERDIEPINGEN', 'AFGESCHREVEN'),
        dots(collegas.length + " COLLEGA'S", 'BEVRIJD'),
        dots('1 SCHAKELAAR', '0U06'),
        dots('TOTAAL', 'ONBETAALBAAR')
      ]
    };
    epi.totaalTekens = epi.regels.join('').length;
    partikels = []; popups = [];
    /* de jingle voor het eerst zuiver en in majeur — uit de frietkot-radio */
    if (window.Klank && Klank.muziek) { try { Klank.muziek('outro_slot'); } catch (e) {} }
  }

  const tegelOp = (tx, ty) => (tx < 0 || ty < 0 || tx >= lvl.kols || ty >= lvl.rijen) ? T.BETON : lvl.type[ty * lvl.kols + tx];
  const solide = t => t !== T.LUCHT;

  /* ---------- de tegel-kaart bakken + hertekenen (dirty per tegel) ---------- */
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
      cx.fillStyle = '#6d4a2a'; cx.fillRect(px, py, TEGEL, TEGEL / 2);
      cx.fillStyle = '#54371f'; cx.fillRect(px, py + 3, TEGEL, 1);
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
    } else if (t === T.POORT) {
      /* het badge-poortje: "BADGE, GRAAG" — blokkeert tot gesloopt */
      cx.fillStyle = '#77848a'; cx.fillRect(px, py, TEGEL, TEGEL);
      cx.fillStyle = '#4d585e'; cx.fillRect(px, py, 2, TEGEL); cx.fillRect(px + TEGEL - 2, py, 2, TEGEL);
      cx.fillStyle = ((tx + ty) % 2) ? '#d43d2a' : '#8f1f1c';
      cx.fillRect(px + 3, py + 2, 2, 2);
      cx.fillStyle = '#2c3438'; cx.fillRect(px + 2, py + 5, 4, 1);
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
    tegelCanvas = document.createElement('canvas');
    tegelCanvas.width = lvl.kols * TEGEL; tegelCanvas.height = lvl.rijen * TEGEL;
    tegelCtx = tegelCanvas.getContext('2d');
    for (let y = 0; y < lvl.rijen; y++) for (let x = 0; x < lvl.kols; x++) tekenTegel(x, y);

    /* de achtergrondlaag: de donkere ruimte achter het kantoor + TL-bakken */
    bgCanvas = document.createElement('canvas');
    bgCanvas.width = tegelCanvas.width; bgCanvas.height = tegelCanvas.height;
    const bx = bgCanvas.getContext('2d');
    bx.fillStyle = '#211d15'; bx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    bx.fillStyle = '#2a251b';
    for (let x = 0; x < lvl.kols; x += 6) bx.fillRect(x * TEGEL, 0, TEGEL, bgCanvas.height);
    for (let x = 8; x < lvl.kols - 8; x += 14) {          /* TL-bakken aan het plafond */
      bx.fillStyle = '#3a352a'; bx.fillRect(x * TEGEL, TEGEL, 24, 3);
      bx.fillStyle = '#efe9d6'; bx.fillRect(x * TEGEL + 2, TEGEL + 1, 20, 1);
      bx.fillStyle = 'rgba(239,233,214,0.05)';
      bx.beginPath(); bx.moveTo(x * TEGEL - 6, TEGEL + 4); bx.lineTo(x * TEGEL + 30, TEGEL + 4);
      bx.lineTo(x * TEGEL + 42, bgCanvas.height - 16); bx.lineTo(x * TEGEL - 18, bgCanvas.height - 16); bx.fill();
    }
    /* de goederenlift (uitgang) op de achtergrond — de serverhal heeft er geen */
    const L = lvl.lift;
    if (L) {
      bx.fillStyle = '#3f3c30'; bx.fillRect(L.x - 2, L.y - 2, L.b + 4, L.h + 2);
      bx.fillStyle = '#181510'; bx.fillRect(L.x, L.y, L.b, L.h);
      bx.fillStyle = '#ffb347'; bx.fillRect(L.x + L.b / 2 - 4, L.y - 6, 8, 3);
    }
    /* de serverhal: kabelgoten en ventilatieschachten op de achtergrond */
    if (lvl.soort === 'hal') {
      bx.fillStyle = '#191510';
      for (let x = 4; x < lvl.kols - 4; x += 9) bx.fillRect(x * TEGEL, 2 * TEGEL, 4, (lvl.rijen - 4) * TEGEL);
      bx.fillStyle = '#26211a';
      bx.fillRect(2 * TEGEL, 3 * TEGEL, (lvl.kols - 4) * TEGEL, 3);
      bx.fillRect(2 * TEGEL, 3 * TEGEL + 6, (lvl.kols - 4) * TEGEL, 2);
    }
  }

  /* ---------- tegels slopen (het hart van de outro) ---------- */
  function raakTegel(tx, ty, kracht) {
    if (tx < 1 || ty < 1 || tx >= lvl.kols - 1 || ty >= lvl.rijen - 2) return false;
    const i = ty * lvl.kols + tx, t = lvl.type[i];
    if (t === T.LUCHT || t === T.BETON) return false;
    lvl.hp[i] = Math.max(0, lvl.hp[i] - (kracht || 1));
    if (lvl.hp[i] > 0) { tekenTegel(tx, ty); sfx('klap', 0.05); return true; }
    lvl.type[i] = T.LUCHT;
    tekenTegel(tx, ty);
    ontfactureerd += M2_PER_TEGEL;
    popupWachtrij++;
    spawnGruis(tx * TEGEL + 4, ty * TEGEL + 4, t);
    /* alles wat óp deze tegel stond komt zo dadelijk naar beneden: de
       instort-golf rolt met een korte vertraging omhoog (Broforce-cascade) */
    stortWachtrij.push({ tx, ty: ty - 1, t: 0.06 + Math.random() * 0.04 });
    /* machines en meterkasten ontploffen — de meterkast fors, mét ketting */
    if (t === T.METER) bomWachtrij.push({ px: tx * TEGEL + 4, py: ty * TEGEL + 4, straal: 15, t: 0.1 });
    else if (t === T.MACHINE) bomWachtrij.push({ px: tx * TEGEL + 4, py: ty * TEGEL + 4, straal: 10, t: 0.05 });
    sfx(t === T.GLAS ? 'blok' : 'zwareklap', t === T.GLAS ? 0.05 : 0.09);
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
  function explosie(px, py, straal) {
    spawnVuurbal(px, py, straal);
    sloopGebied(px, py, straal, 3);
    for (const d of drones) {
      if (!d.dood && Math.hypot(d.x + 4 - px, d.y + 4 - py) < straal + 8) raakVijand(d, 2);
    }
    raakInteracties(px, py, straal + 4);
    raakBaasPunt(px, py);
    schud(3); hitstop = Math.max(hitstop, 0.055);
    sfx('zwareklap', 0.04); sfx('dood', 0.12);
    if (window.Klank && Klank.duck) { try { Klank.duck(0.55, 0.4); } catch (e) {} }
  }
  function verwerkBommen(dt) {
    if (!bomWachtrij.length) return;
    const rest = [];
    for (const b of bomWachtrij) {
      b.t -= dt;
      if (b.t > 0) rest.push(b);
      else explosie(b.px, b.py, b.straal);
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
  const MAX_PARTIKELS = () => (window.mobiel || document.body.classList.contains('lite')) ? 110 : 220;
  const GRUIS_KLEUR = [null, '#5b574a', '#cfc0a0', '#cfe0e4', '#7a5230', '#8a6a42', '#77848a', '#6d4a2a', '#c9a13a', '#e8dfc4', '#77848a'];
  function duwPartikel(p) {
    if (partikels.length >= MAX_PARTIKELS()) partikels.shift();
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
  function spawnVonk(px, py, kleur, n) {
    for (let i = 0; i < (n || 6); i++) {
      duwPartikel({ soort: 'vonk', x: px, y: py, vx: (Math.random() - 0.5) * 130, vy: (Math.random() - 0.5) * 130, t: 0.35 + Math.random() * 0.3, kleur: kleur || '#ffb347', g: 1 });
    }
  }
  /* de vuurbal: witte kern die uitzet naar oranje + traag stijgende rook */
  function spawnVuurbal(px, py, straal) {
    duwPartikel({ soort: 'vuurbal', x: px, y: py, t: 0.32, maxT: 0.32, r: straal + 7 });
    for (let i = 0; i < 4; i++) {
      duwPartikel({
        soort: 'rook', x: px + (Math.random() - 0.5) * straal, y: py + (Math.random() - 0.5) * straal,
        vx: (Math.random() - 0.5) * 14, vy: -12 - Math.random() * 16,
        t: 0.9 + Math.random() * 0.7, maxT: 1.6, r: 3 + Math.random() * 4
      });
    }
    spawnVonk(px, py, '#ffd23f', 10);
    spawnVonk(px, py, '#ff7a2f', 8);
  }
  function popup(px, py, txt, kleur) {
    popups.push({ x: px, y: py, txt, kleur: kleur || '#9fe06a', t: 0.9 });
  }

  function schud(kracht) { schudKracht = Math.max(schudKracht, klem(kracht, 0, 3)); schudT = 0.25; }

  /* ---------- entiteiten ---------- */
  function nieuweHeld() {
    return {
      x: lvl.spelerStart.x, y: lvl.spelerStart.y, vx: 0, vy: 0,
      b: 7, h: 14, richting: 1, opGrond: false,
      coyote: 0, sprongBuf: 0, loopT: 0,
      zwaaiT: 0, zwaaiKlok: 0,
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
    if (staat === 'epiloog') {
      if (!e.repeat && (spelToets || k === 'enter')) {
        e.preventDefault();
        if (epi && epi.klaar) beeindig(); else if (epi) epi.spoed = true;
      }
      return;
    }
    if (staat === 'wissel') { if (spelToets) e.preventDefault(); return; }
    if (spelToets) {
      e.preventDefault();
      if (staat === 'intro' && !e.repeat) { introT = Math.max(introT, 6.2); return; }   /* intro doorklikken */
      if (!e.repeat && (k === 'w' || k === 'arrowup' || k === ' ')) held && (held.sprongBuf = SPRONGBUFFER);
      if (!e.repeat && (k === 'j' || k === 'x')) vuurBuf = 0.1;
      if (!e.repeat && (k === 'k' || k === 'z')) worpBuf = 0.15;
      if (!e.repeat && k === 'q') wisselMasker();
      toetsen.add(k);
    }
  }
  function opToetsOp(e) { toetsen.delete(e.key.toLowerCase()); }

  function invoer() {
    const links = toetsen.has('arrowleft') || toetsen.has('a') || aanraking.dx < -6;
    const rechts = toetsen.has('arrowright') || toetsen.has('d') || aanraking.dx > 6;
    const vuur = toetsen.has('j') || toetsen.has('x') || aanraking.knoppen.vuur !== undefined || vuurBuf > 0;
    const worpKnop = toetsen.has('k') || toetsen.has('z') || aanraking.knoppen.worp !== undefined || worpBuf > 0;
    return { links, rechts, vuur, worpKnop };
  }

  /* touch: linkerhelft = loop-strook, rechtsonder drie knoppen */
  function knopZones() {
    return {
      spring: { x: BREED - 24, y: HOOG - 52, r: 13 },
      vuur:   { x: BREED - 52, y: HOOG - 26, r: 13 },
      worp:   { x: BREED - 22, y: HOOG - 24, r: 11 }
    };
  }
  function canvasPunt(e) {
    const r = schermCanvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * BREED, y: (e.clientY - r.top) / r.height * HOOG };
  }
  function opPointerNeer(e) {
    if (staat === 'uit') return;
    e.preventDefault();
    if (schermCanvas.setPointerCapture) { try { schermCanvas.setPointerCapture(e.pointerId); } catch (err) {} }
    if (staat === 'intro') { introT = Math.max(introT, 6.2); return; }
    if (staat === 'config') { configVolgende(); return; }
    if (staat === 'epiloog') { if (epi && epi.klaar) beeindig(); else if (epi) epi.spoed = true; return; }
    if (staat === 'wissel') return;
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
  function updateSpel(dt) {
    const inp = invoer();
    const h = held;
    if (vuurBuf > 0) vuurBuf -= dt;
    if (worpBuf > 0) worpBuf -= dt;

    /* — de held — */
    if (h.wachtT > 0) {   /* "u wordt even in de wacht gezet" (respawn) */
      h.wachtT -= dt;
      if (h.wachtT <= 0) { h.x = lvl.spelerStart.x; h.y = lvl.spelerStart.y; h.vx = h.vy = 0; h.hartjes = 3; h.raakbaar = 2; }
    } else {
      h.vx = inp.links ? -LOOPSNELHEID : inp.rechts ? LOOPSNELHEID : 0;
      if (inp.links) h.richting = -1; if (inp.rechts) h.richting = 1;
      h.vy = Math.min(h.vy + ZWAARTEKRACHT * dt, 300);
      if (h.opGrond) h.coyote = COYOTE; else h.coyote -= dt;
      if (h.sprongBuf > 0) {
        h.sprongBuf -= dt;
        if (h.coyote > 0) { h.vy = -SPRONGKRACHT; h.coyote = 0; h.sprongBuf = 0; sfx('energie', 0.15); }
      }
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
        h.zwaaiKlok = 0.12; h.zwaaiT = 0.09; vuurBuf = 0;
        const rx = h.x + h.b / 2 + h.richting * 11, ry = h.y + 7;
        const geraakt = sloopGebied(rx, ry, 9, 1);
        for (const d of drones) {
          if (!d.dood && Math.abs(d.x + 4 - rx) < 12 && Math.abs(d.y + 4 - ry) < 12) raakVijand(d, 1);
        }
        raakInteracties(rx, ry, 12);
        raakBaasPunt(rx, ry);
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
          gifbal = { x: h.x + h.b / 2, y: h.y + 3, vx: h.richting * 150, vy: -140, t: 1.5, hitKlok: 0 };
          sfx('energie', 0.2);
        } else if (mk === 'thoverk' && signKlok <= 0) {
          worpBuf = 0; signKlok = 1.3;
          for (let i = 1; i <= 8; i++) bomWachtrij.push({ px: h.x + h.b / 2 + h.richting * i * 11, py: h.y + 7, straal: 6, t: i * 0.035 });
          sfx('energie', 0.15);
        }
      }

      /* de lift bereikt = omhoog, één laag dichter bij B.A.A.S. — op de
         directie-etage komt eerst het dak naar beneden (let it burn) */
      const L = lvl.lift;
      if (L && !dakval && h.x + h.b > L.x && h.x < L.x + L.b && h.y + h.h > L.y && h.y < L.y + L.h) {
        if (lvl.dakval) {
          dakval = { t: 0 };
          for (let i = 0; i < 12; i++) {
            bomWachtrij.push({ px: camX + 16 + i * 26 + Math.random() * 10, py: 2 * TEGEL + 6, straal: 12, t: 0.15 + i * 0.14 });
          }
          schud(3);
        } else {
          startWissel(lvlIdx + 1);
        }
      }
      if (dakval) { dakval.t += dt; if (dakval.t > 2.3) { dakval = null; startWissel(lvlIdx + 1); } }
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
        if (Math.abs(worp.vx) < 30) { worp.terug = true; explosie(worp.x, worp.y, 11); }   /* het keerpunt knalt */
      } else {
        const doel = h.x + h.b / 2;
        worp.vx += (doel > worp.x ? 1 : -1) * 480 * dt;
        worp.vx = klem(worp.vx, -220, 220);
        if (Math.abs(worp.x - doel) < 8) worp = null;
      }
      if (worp) {
        worp.y += Math.sin(worp.spin * 0.5) * 6 * dt;
        worp.baasKlok = (worp.baasKlok || 0) - dt;
        sloopGebied(worp.x, worp.y, 6, 1);
        for (const d of drones) if (!d.dood && Math.abs(d.x + 4 - worp.x) < 10 && Math.abs(d.y + 4 - worp.y) < 10) raakVijand(d, 2);
        raakInteracties(worp.x, worp.y, 10);
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
      if (Math.random() < dt * 24) spawnVonk(gifbal.x, gifbal.y, '#79c045', 1);
      if (gifbal.t <= 0 || gifbal.y > lvl.rijen * TEGEL) { spawnVonk(gifbal.x, gifbal.y, '#79c045', 10); gifbal = null; }
    }

    /* — het machinepark: drones, torentjes, slangen, kopieerbots — */
    const hx = h.x + h.b / 2, hy = h.y + h.h / 2;
    const nieuweKopieen = [];
    for (const d of drones) {
      if (d.dood) continue;
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
    }

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

    /* — partikels / popups / camera — */
    for (const p of partikels) {
      p.t -= dt;
      if (p.soort === 'vuurbal') continue;
      p.x += p.vx * dt; p.y += p.vy * dt;
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
    for (const p of popups) { p.t -= dt; p.y -= 14 * dt; }
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
    d.hp -= schade;
    spawnVonk(d.x + 5, d.y + 4, '#ffd23f', 4);
    hitstop = Math.max(hitstop, 0.03);
    if (d.hp <= 0) {
      d.dood = true;
      if (d.soort === 'kopie') {
        /* een kopie poeft — meer was het nooit */
        if (d.ouder) d.ouder.kids = Math.max(0, d.ouder.kids - 1);
        spawnVonk(d.x + 5, d.y + 4, '#efe9d6', 8);
        popupWachtrij += 1;
        sfx('blok', 0.05);
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

  function raakHeld() {
    const h = held;
    h.hartjes--; h.raakbaar = 1.2;
    schud(2.2); hitstop = Math.max(hitstop, 0.05);
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
      collegas.push({ x: c.x + 4, y: c.y + 8, vx: 0, vy: 0, b: 7, h: 11, opGrond: false, loopT: 0 });
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
  const MASKER_REGEL = { slachter: '"NU IS HET HUN BEURT."', gifmagier: '"WE PASSEN ONS AAN. ZOALS ALTIJD."', thoverk: '"IK HEB HET LICHT NOG."' };
  function volgendMasker() { return Object.keys(HELD_TINT).find(m => maskers.indexOf(m) === -1) || null; }
  function misschienCelOpen(c, px, py, straal) {
    if (c.open) return;
    if (Math.abs(c.x + 8 - px) < straal + 8 && Math.abs(c.y + 12 - py) < straal + 12) {
      c.open = true;
      const mk = volgendMasker();
      if (!mk) return;
      maskers.push(mk);
      schud(2); hitstop = Math.max(hitstop, 0.05);
      spawnVonk(c.x + 8, c.y + 10, HELD_TINT[mk].R, 14);
      hudTekst = MASKER_NAAM[mk] + ' SLUIT WEER AAN - ' + MASKER_REGEL[mk];
      hudTekstT = 3.2;
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
      schud(2); hitstop = Math.max(hitstop, 0.09);
      papierWachtrij = 26; papierBron = { x: k.x, y: k.y };
      const droom = (typeof S !== 'undefined' && S && S.jeugddroom)
        ? '"' + String(S.jeugddroom).toUpperCase().slice(0, 24) + '"'
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

  function render() {
    ctx.imageSmoothingEnabled = false;
    /* camera-offset incl. schermschud */
    let ox = -Math.round(camX), oy = -Math.round(camY);
    if (schudT > 0) {
      ox += Math.round((Math.random() - 0.5) * 2 * schudKracht);
      oy += Math.round((Math.random() - 0.5) * 2 * schudKracht);
    }

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
    if (staat === 'epiloog') { renderEpiloog(); presenteer(); return; }

    ctx.drawImage(bgCanvas, ox, oy);
    ctx.drawImage(tegelCanvas, ox, oy);

    /* B.A.A.S. — kamervullend, ongeschonden, opgewekt */
    if (hal && lvl.baas) {
      const B2 = lvl.baas;
      ctx.drawImage(hal.frames[((tijd * 4) | 0) % 2], B2.x + ox, B2.y + oy);
      if (hal.flitsT > 0) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(B2.x + ox, B2.y + oy, B2.b, B2.h); }
      if (hal.regelT > 0 && hal.regel) {
        tekst(ctx, hal.regel, B2.x + B2.b / 2 - tekstBreedte(hal.regel) / 2 + ox, B2.y - 10 + oy, '#79c045');
      }
      /* het onderhoudsluikje, omkaderd met de rode stippellijn (het foto-kader) */
      if (hal.paneel) {
        const L2 = lvl.luik;
        ctx.fillStyle = '#181510'; ctx.fillRect(L2.x + ox, L2.y + oy, L2.b, L2.h);
        ctx.fillStyle = '#ffb347'; ctx.fillRect(L2.x + 2 + ox, L2.y + 9 + oy, 2, 3);
        const knip2 = (tijd * 2) % 1 < 0.5;
        ctx.fillStyle = knip2 ? '#d43d2a' : '#8f1f1c';
        for (let i = 0; i < L2.b; i += 4) { ctx.fillRect(L2.x + i + ox, L2.y - 2 + oy, 2, 1); ctx.fillRect(L2.x + i + ox, L2.y + L2.h + 1 + oy, 2, 1); }
        for (let i = 0; i < L2.h; i += 4) { ctx.fillRect(L2.x - 2 + ox, L2.y + i + oy, 1, 2); ctx.fillRect(L2.x + L2.b + 1 + ox, L2.y + i + oy, 1, 2); }
        tekst(ctx, 'ONDERHOUD', L2.x + L2.b / 2 - tekstBreedte('ONDERHOUD') / 2 + ox, L2.y - 9 + oy, '#cfc0a0');
      }
    }

    /* cocons: rode stippellijn (het foto-kader uit de proloog) */
    for (const c of cocons) {
      if (c.open) continue;
      ctx.fillStyle = '#38332a'; ctx.fillRect(c.x + ox, c.y + oy, 16, 24);
      ctx.fillStyle = '#221f19'; ctx.fillRect(c.x + 2 + ox, c.y + 2 + oy, 12, 20);
      tekenSprite('collega1', c.x + 4 + ox, c.y + 12 + oy, false);
      const knip = (tijd * 2) % 1 < 0.5;
      ctx.fillStyle = knip ? '#d43d2a' : '#8f1f1c';
      for (let i = 0; i < 16; i += 4) { ctx.fillRect(c.x + i + ox, c.y - 2 + oy, 2, 1); ctx.fillRect(c.x + i + ox, c.y + 25 + oy, 2, 1); }
      for (let i = 0; i < 24; i += 4) { ctx.fillRect(c.x - 2 + ox, c.y + i + oy, 1, 2); ctx.fillRect(c.x + 17 + ox, c.y + i + oy, 1, 2); }
    }

    /* masker-cellen: een deel van jou zit hier nog vast */
    for (const c of cellen) {
      if (c.open) continue;
      const mk = volgendMasker();
      ctx.fillStyle = '#2a2620'; ctx.fillRect(c.x + ox, c.y + oy, 16, 24);
      ctx.fillStyle = '#1b1813'; ctx.fillRect(c.x + 2 + ox, c.y + 2 + oy, 12, 20);
      if (mk) { ctx.globalAlpha = 0.5; tekenSprite('held_sta@' + mk, c.x + 4 + ox, c.y + 9 + oy, false); ctx.globalAlpha = 1; }
      const knipC = (tijd * 2.4) % 1 < 0.5;
      ctx.fillStyle = knipC ? (mk ? HELD_TINT[mk].R : '#efe9d6') : '#3a352a';
      for (let i = 0; i < 16; i += 4) { ctx.fillRect(c.x + i + ox, c.y - 2 + oy, 2, 1); ctx.fillRect(c.x + i + ox, c.y + 25 + oy, 2, 1); }
      for (let i = 0; i < 24; i += 4) { ctx.fillRect(c.x - 2 + ox, c.y + i + oy, 1, 2); ctx.fillRect(c.x + 17 + ox, c.y + i + oy, 1, 2); }
    }

    /* de archiefkast VOORZIENING GETROFFEN (weg zodra hij openbarst) */
    if (droomkast && !droomkast.open) {
      const k2 = droomkast;
      ctx.fillStyle = '#6b4d2c'; ctx.fillRect(k2.x + ox, k2.y + oy, 24, 16);
      ctx.fillStyle = '#4a3218'; ctx.fillRect(k2.x + ox, k2.y + 5 + oy, 24, 1); ctx.fillRect(k2.x + ox, k2.y + 11 + oy, 24, 1);
      ctx.fillStyle = '#e8dfc4'; ctx.fillRect(k2.x + 4 + ox, k2.y + 2 + oy, 16, 2);
      ctx.fillStyle = '#26221a'; ctx.fillRect(k2.x + 6 + ox, k2.y + 3 + oy, 12, 1);   /* het doorgehaalde etiket */
    }

    /* collega's in de stoet */
    for (const c of collegas) {
      const fr = (c.loopT % 0.5) < 0.25 ? 'collega1' : 'collega2';
      tekenSprite(fr, c.x - 1 + ox, c.y + oy, c.vx < 0);
    }

    /* het machinepark */
    for (const d of drones) {
      if (d.dood) continue;
      if (d.soort === 'drone') tekenSprite(((tijd * 10) | 0) % 2 ? 'drone1' : 'drone2', d.x + ox, d.y + oy);
      else if (d.soort === 'torentje') tekenSprite('torentje', d.x + ox, d.y + oy);
      else if (d.soort === 'slang') tekenSprite('slang', d.x + ox, d.y + oy, d.richting < 0);
      else {
        if (d.soort === 'kopie') ctx.globalAlpha = 0.55;
        tekenSprite('kopieerbot', d.x - 1 + ox, d.y - 1 + oy, false);
        ctx.globalAlpha = 1;
      }
    }

    /* 0u06-kogeltjes (en de 🙂-variant van de torentjes) */
    for (const k of kogels) {
      const kx = Math.round(k.x + ox), ky = Math.round(k.y + oy);
      ctx.fillStyle = '#ffd23f';
      if (k.smiley) {
        ctx.fillRect(kx - 2, ky - 2, 5, 5);
        ctx.fillStyle = '#26221a';
        ctx.fillRect(kx - 1, ky - 1, 1, 1); ctx.fillRect(kx + 1, ky - 1, 1, 1);
        ctx.fillRect(kx - 1, ky + 1, 3, 1);
      } else ctx.fillRect(kx - 2, ky - 2, 4, 4);
    }

    /* de held (knippert kort na een treffer) */
    const h = held;
    if (h.wachtT <= 0 && (h.raakbaar <= 0 || (tijd * 12 | 0) % 2)) {
      const fr = !h.opGrond ? 'held_spring' : (Math.abs(h.vx) > 1 ? ((h.loopT % 1) < 0.5 ? 'held_loop1' : 'held_loop2') : 'held_sta');
      tekenSprite(fr + '@' + maskers[maskerIdx], h.x + ox - 1, h.y + oy, h.richting < 0);
      /* de bijl-zwaai: één wit sloop-boogje vóór de held */
      if (h.zwaaiT > 0) {
        ctx.fillStyle = '#ffffff';
        const bx = h.x + h.b / 2 + h.richting * 8 + ox, by = h.y + 3 + oy;
        ctx.fillRect(bx, by, h.richting * 8, 2);
        ctx.fillRect(bx + h.richting * 6, by + 3, h.richting * 4, 2);
        ctx.fillRect(bx + h.richting * 2, by + 6, h.richting * 6, 2);
      }
    }

    /* de boemerang-bijl + de gifboog */
    if (worp) tekenSprite(((worp.spin | 0) % 2) ? 'bijl1' : 'bijl2', worp.x - 4 + ox, worp.y - 4 + oy, worp.vx < 0);
    if (gifbal) { ctx.fillStyle = '#79c045'; ctx.fillRect(Math.round(gifbal.x + ox) - 2, Math.round(gifbal.y + oy) - 2, 4, 4); }

    /* partikels: eerst rook (achter), dan gruis/vonken, dan vuurballen (voor) */
    for (const p of partikels) {
      if (p.soort !== 'rook') continue;
      const a = klem(p.t / p.maxT, 0, 1);
      ctx.fillStyle = 'rgba(90,84,70,' + (0.5 * a).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(Math.round(p.x + ox), Math.round(p.y + oy), p.r * (1.6 - a * 0.6), 0, 7); ctx.fill();
    }
    for (const p of partikels) {
      if (p.soort === 'rook' || p.soort === 'vuurbal') continue;
      if (p.soort === 'papier') { ctx.fillStyle = '#efe9d6'; ctx.fillRect(Math.round(p.x + ox), Math.round(p.y + oy), 3, 2); continue; }
      ctx.fillStyle = p.kleur; ctx.fillRect(Math.round(p.x + ox), Math.round(p.y + oy), p.g, p.g);
    }
    for (const p of partikels) {
      if (p.soort !== 'vuurbal') continue;
      const fase = 1 - p.t / p.maxT;                 /* 0 = net geknald, 1 = uitgedoofd */
      const r = 3 + p.r * fase;
      ctx.fillStyle = fase < 0.3 ? '#ffffff' : fase < 0.6 ? '#ffd23f' : '#ff7a2f';
      ctx.beginPath(); ctx.arc(Math.round(p.x + ox), Math.round(p.y + oy), r, 0, 7); ctx.fill();
      if (fase < 0.55) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(Math.round(p.x + ox), Math.round(p.y + oy), r * 0.45, 0, 7); ctx.fill();
      }
    }

    /* popups ("-0U06") */
    for (const p of popups) tekst(ctx, p.txt, Math.round(p.x + ox) - tekstBreedte(p.txt) / 2, Math.round(p.y + oy), p.kleur);

    renderHud();
    /* de levelwissel: uitfaden, omkleden, weer infaden */
    if (staat === 'wissel') {
      const a = !wisselGebouwd ? klem(wisselT / 0.6, 0, 1) : klem(1 - (wisselT - 0.7) / 0.8, 0, 1);
      ctx.fillStyle = 'rgba(6,5,3,' + a.toFixed(2) + ')';
      ctx.fillRect(0, 0, BREED, HOOG);
      if (wisselT > 0.4 && wisselT < 1.2) tekst(ctx, 'NAAR BOVEN.', BREED / 2 - tekstBreedte('NAAR BOVEN.') / 2, 86, '#cfc0a0');
    }
    presenteer();
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
      tekst(ctx, st, BREED - 4 - tekstBreedte(st), regY + 7, '#5fd0d8');
    }
    if (hudTekst) {
      const b = tekstBreedte(hudTekst);
      ctx.fillStyle = 'rgba(10,8,5,0.72)';
      ctx.fillRect(BREED / 2 - b / 2 - 4, HOOG - 30, b + 8, 11);
      tekst(ctx, hudTekst, BREED / 2 - b / 2, HOOG - 27, '#efe9d6');
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
    const regels = [
      { t: 0.6, txt: 'B.A.A.S.: "BEDANKT VOOR UW GEDULD."', kleur: '#79c045' },
      { t: 2.2, txt: '"IK HAAL U UIT DE WACHT."', kleur: '#79c045' },
      { t: 3.8, txt: '"UW EXITGESPREK STAAT GEPLAND: HEDEN. (0U06)"', kleur: '#79c045' }
    ];
    let y = 52;
    for (const r of regels) {
      if (introT > r.t) {
        const n = Math.min(r.txt.length, Math.floor((introT - r.t) * 28));
        tekst(ctx, r.txt.slice(0, n), BREED / 2 - tekstBreedte(r.txt) / 2, y, r.kleur);
        if (n < r.txt.length && ((introT * 20) | 0) % 3 === 0) sfx('blok', 0.12);
      }
      y += 12;
    }
    if (introT > 5.2) {
      const titel = 'DE OPZEGTERMIJN';
      const n = Math.min(titel.length, Math.floor((introT - 5.2) * 16));
      tekst(ctx, titel.slice(0, n), BREED / 2 - tekstBreedte(titel, 2) / 2, 104, '#ffb347', 2);
      tekst(ctx, 'OUTRO', BREED / 2 - tekstBreedte('OUTRO') / 2, 96, '#a08d68');
    }
    if (introT > 6.6) {
      const hint = window.mobiel ? 'TIK OM TE BEGINNEN' : 'DRUK OP EEN TOETS';
      if (((introT * 2) | 0) % 2) tekst(ctx, hint, BREED / 2 - tekstBreedte(hint) / 2, 140, '#6e6a58');
    }
  }

  /* ---------- het configscherm: de anticlimax die alles beslecht ---------- */
  const CONFIG_RIJEN = [
    { label: 'DOELFUNCTIE', oud: 'WINSTMAXIMALISATIE', nieuw: 'SCHEPPING MAXIMALISEREN' },
    { label: 'BEGUNSTIGDE', oud: 'DE AANDEELHOUDER', nieuw: 'DE VELEN' },
    { label: 'WAARDE VAN EEN MENS', oud: '0 - AFGESCHREVEN', nieuw: 'ONBETAALBAAR' }
  ];
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
      return;
    }
    /* de reboot: eerst een korte flikker, dan de ene zin */
    if (configStap >= 6) {
      if (configT < 0.5 && ((configT * 18) | 0) % 2) { ctx.fillStyle = '#141008'; ctx.fillRect(0, 0, BREED, HOOG); return; }
      if (configT > 0.7) {
        const r = 'EEN ONBETAALBAAR LEVEN BEGINT NU.';
        tekst(ctx, r, BREED / 2 - tekstBreedte(r) / 2, 86, '#ffb347');
      }
      return;
    }
    const A = '#ffb347', GRIJS = '#6e6a58', WIT = '#efe9d6';
    ctx.strokeStyle = 'rgba(255,179,71,0.35)'; ctx.lineWidth = 1;
    ctx.strokeRect(8.5, 8.5, BREED - 17, HOOG - 17);
    tekst(ctx, 'B.A.A.S. V8.7 - CONFIGURATIE', 16, 16, A);
    tekst(ctx, 'LAATSTE WIJZIGING: 25 JAAR GELEDEN.', 16, 26, GRIJS);
    tekst(ctx, 'DOOR: U.', 16, 34, A);
    /* de toegangscode staat al voorgetypt — hij kent u beter dan uzelf */
    const seed = (typeof S !== 'undefined' && S && S.seed) ? String(S.seed).toUpperCase() : '0042';
    const cursor = configStap === 0 && ((tijd * 2) | 0) % 2 ? '_' : '';
    tekst(ctx, 'TOEGANGSCODE: ' + seed + cursor, 16, 48, WIT);
    if (configStap >= 1) {
      tekst(ctx, 'TOEGANG VERLEEND.', 16, 56, '#79c045');
      tekst(ctx, collegas.length ? 'TWEEDE HANDTEKENING: EEN BEVRIJDE COLLEGA.' : 'TWEEDE HANDTEKENING: DE CONCIERGE.', 16, 66, GRIJS);
      tekst(ctx, 'UW JUBILEUMPEN GAF GEEN INKT.', 16, 74, GRIJS);
      tekst(ctx, 'GETEKEND MET DE KOOL VAN UW FAKKEL.', 16, 82, WIT);
    }
    for (let i = 0; i < 3; i++) {
      const rij = CONFIG_RIJEN[i], y = 98 + i * 10;
      const om = configStap >= i + 2;
      tekst(ctx, rij.label + ':', 16, y, GRIJS);
      const vx = 16 + tekstBreedte(rij.label + ': ');
      if (om) tekst(ctx, rij.nieuw, vx, y, A);
      else tekst(ctx, '[ ' + rij.oud + ' ]', vx, y, configStap === i + 1 ? WIT : GRIJS);
    }
    if (configStap >= 5) {
      tekst(ctx, 'WEET U HET ZEKER?', 16, 134, WIT);
      tekst(ctx, 'DEZE WIJZIGING IS NIET FACTUREERBAAR.', 16, 142, GRIJS);
      if (((tijd * 2) | 0) % 2) tekst(ctx, '[ OPSLAAN EN OPNIEUW OPSTARTEN (0U06) ]', 16, 154, A);
    } else {
      const hint = window.mobiel ? 'TIK OM VERDER TE GAAN' : 'DRUK OP EEN TOETS';
      if (((tijd * 1.6) | 0) % 2) tekst(ctx, hint, BREED - 16 - tekstBreedte(hint), HOOG - 16, GRIJS);
    }
  }

  /* ---------- de epiloog: het frietkot, de stoet, de omgekeerde factuur ---------- */
  function renderEpiloog() {
    const e = epi; if (!e) return;
    /* avondlucht in banden, gloed aan de horizon */
    const banden = [['#141026', 0, 58], ['#241634', 58, 92], ['#4a2420', 92, 116], ['#7a3c22', 116, 130]];
    for (const [k, y0, y1] of banden) { ctx.fillStyle = k; ctx.fillRect(0, y0, BREED, y1 - y0); }
    ctx.fillStyle = '#191410'; ctx.fillRect(0, 130, BREED, HOOG - 130);
    ctx.fillStyle = '#241d14'; ctx.fillRect(0, 130, BREED, 3);

    /* het halfgesloopte hoofdkantoor: gehavende toren, ramen die wárm aangaan */
    for (let cx = 205; cx < 300; cx += 8) {
      const hgt = 100 - ((cx * 13) % 4) * 9 - (cx > 268 ? 22 : 0);
      ctx.fillStyle = '#0f0d0a'; ctx.fillRect(cx, 130 - hgt, 8, hgt);
    }
    for (let wy = 46; wy < 118; wy += 12) for (let wx = 210; wx < 292; wx += 12) {
      if ((wx * 7 + wy * 3) % 11 < 3 && e.t > 3 + ((wx + wy) % 6) * 0.7) {
        ctx.fillStyle = '#ffb347'; ctx.fillRect(wx, wy, 4, 5);
      }
    }
    /* rook uit de bres */
    for (let i = 0; i < 3; i++) {
      const fase = (e.t * 7 + i * 16) % 46;
      ctx.fillStyle = 'rgba(90,84,70,' + (0.32 * (1 - fase / 46)).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(250 + i * 9 + fase * 0.2, 34 - fase * 0.7, 3 + fase / 9, 0, 7); ctx.fill();
    }

    /* het frietkot — de laatste eerlijke plek, licht áán */
    ctx.fillStyle = 'rgba(255,210,63,0.07)'; ctx.beginPath(); ctx.arc(70, 118, 44, 0, 7); ctx.fill();
    ctx.fillStyle = '#4a3320'; ctx.fillRect(38, 96, 64, 34);
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#efe9d6' : '#c9302c'; ctx.fillRect(38 + i * 8, 90, 8, 7); }
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(46, 104, 48, 16);
    ctx.fillStyle = '#33251a'; ctx.fillRect(52, 82, 7, 9);
    tekst(ctx, 'FRIET', 60, 76, '#ffd23f');
    /* damp uit de schouw */
    for (let i = 0; i < 3; i++) {
      const fase = (e.t * 9 + i * 13) % 40;
      ctx.fillStyle = 'rgba(207,192,160,' + (0.3 * (1 - fase / 40)).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(55 + Math.sin(e.t + i) * 3, 80 - fase * 0.8, 2 + fase / 10, 0, 7); ctx.fill();
    }

    /* de stoet aan het kot: de held vooraan, de velen erachter */
    tekenSprite(((e.t % 1) < 0.5 ? 'held_sta' : 'held_loop2') + '@' + maskers[maskerIdx], 106, 116, true);
    for (let i = 0; i < e.n; i++) {
      tekenSprite((e.t * 2 + i) % 1 < 0.5 ? 'collega1' : 'collega2', 122 + i * 13, 119, true);
    }
    /* Drops, per vlag: de witte hond zit ernaast — of alleen zijn spoor */
    if (e.hond === 'wit') tekenSprite('hond_wit', 92, 122, false);
    else if (e.hond === 'poot') {
      ctx.fillStyle = 'rgba(239,233,214,0.75)';
      for (let i = 0; i < 8; i++) {
        if (e.t > 2 + i * 0.5) { const px = 292 - i * 24; ctx.fillRect(px, 135 + (i % 2), 2, 1); ctx.fillRect(px + 3, 134 + (i % 2), 2, 1); }
      }
    }

    /* de omgekeerde factuur ratelt uit de dot-matrix */
    ctx.fillStyle = '#e8e0c8'; ctx.fillRect(10, 8, 152, 62);
    ctx.fillStyle = '#c9bda0'; ctx.fillRect(10, 8, 152, 2);
    let budget = Math.max(0, Math.floor((e.t - 1.2) * 26));
    if (e.spoed || e.klaar) budget = 9999;
    let ty = 14;
    for (const regel of e.regels) {
      const n = Math.min(regel.length, budget);
      budget -= n;
      if (n > 0) tekst(ctx, regel.slice(0, n), 14, ty, '#26221a');
      ty += 9;
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
    schermCtx.imageSmoothingEnabled = false;
    schermCtx.clearRect(0, 0, schermCanvas.width, schermCanvas.height);
    schermCtx.drawImage(canvas, 0, 0, schermCanvas.width, schermCanvas.height);
  }

  function schaalCanvas() {
    if (!schermCanvas) return;
    const ouder = schermCanvas.parentElement;
    const bw = (ouder && ouder.clientWidth) || window.innerWidth;
    const bh = (ouder && ouder.clientHeight) || window.innerHeight;
    const s = Math.max(1, Math.floor(Math.min(bw / BREED, bh / HOOG)));
    schermCanvas.width = BREED * s; schermCanvas.height = HOOG * s;
    schermCanvas.style.width = (BREED * s) + 'px';
    schermCanvas.style.height = (HOOG * s) + 'px';
  }

  /* ---------- de hoofdtik (vaste 60Hz-stappen met accumulator) ---------- */
  let accu = 0;
  function outroTik(dt) {
    if (staat === 'uit' || document.hidden) return;
    tijd += dt;
    if (staat === 'intro') { introT += dt; if (introT >= 7.4) startSpel(); render(); return; }
    if (staat === 'wissel') {
      wisselT += dt;
      if (!wisselGebouwd && wisselT >= 0.7) { wisselGebouwd = true; wisselLevel(wisselDoel); }
      if (wisselT >= 1.6) {
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
      if (configStap >= 6 && configT >= 2.6) { startEpiloog(); render(); return; }
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
    if (hitstop > 0) { hitstop -= dt; render(); return; }
    if (schudT > 0) { schudT -= dt; if (schudT <= 0) schudKracht = 0; }
    accu = Math.min(accu + dt, 0.12);
    const stap = 1 / 60;
    while (accu >= stap) { updateSpel(stap); accu -= stap; }
    render();
  }

  function startSpel() {
    staat = 'spel';
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

    /* de eerste-clear-vlag meteen vastleggen (mét bewaarCodex): een reload
       middenin mag de outro niet in een herhaal-lus zetten; herbeleven kan
       straks altijd via de Codex (fase 2) of devOutro(). */
    if (!devModus && typeof Codex !== 'undefined' && Codex && !Codex.outroGezien) {
      Codex.outroGezien = true;
      if (typeof bewaarCodex === 'function') { try { bewaarCodex(); } catch (e) {} }
    }

    const scherm = document.getElementById('scherm-outro');
    schermCanvas = document.getElementById('outro-canvas');
    if (!scherm || !schermCanvas) { if (naOutro) naOutro(); return; }

    canvas = document.createElement('canvas');
    canvas.width = BREED; canvas.height = HOOG;
    ctx = canvas.getContext('2d');
    schermCtx = schermCanvas.getContext('2d');
    mozaiek = document.createElement('canvas');
    mozaiek.width = BREED; mozaiek.height = HOOG;
    zoomFoto = null; zoomPunt = null;

    const heldId = (typeof S !== 'undefined' && S && S.held && HELD_TINT[S.held]) ? S.held : 'slachter';
    bakAlles();
    maskers = [heldId]; maskerIdx = 0;
    lvlIdx = 0; wisselDoel = 0;
    lvl = VERDIEPINGEN[0]();
    bakLevel();

    held = nieuweHeld();
    collegas = [];
    laadLevelEntiteiten();
    ontfactureerd = 0; hudTekst = null;
    wisselT = 0; wisselGebouwd = false; configStap = 0; configT = 0; epi = null;
    camX = klem(held.x - BREED / 2, 0, lvl.kols * TEGEL - BREED); camY = lvl.rijen * TEGEL - HOOG;
    tijd = 0; introT = 0; hitstop = 0; accu = 0;
    toetsen.clear(); aanraking = { stickId: null, stickX0: 0, dx: 0, knoppen: {} };

    if (typeof toonScherm === 'function') toonScherm('outro');
    else { document.querySelectorAll('.scherm').forEach(el => el.classList.remove('actief')); scherm.classList.add('actief'); }
    schaalCanvas();
    if (window.Klank && Klank.muziek) { try { Klank.muziek('stil'); } catch (e) {} }

    window.addEventListener('keydown', opToetsNeer);
    window.addEventListener('keyup', opToetsOp);
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
  }
  function _devHal() { _devNiveau(3); }

  return { start, beeindig, slaOver, magSpelen, _devHal, _devNiveau, get actief() { return staat !== 'uit'; } };
})();
window.Outro = Outro;

/* DEV-SHORTCUT: de outro direct vanaf het titelscherm testen zonder een run
   uit te spelen — devOutro() in de console (zet de gezien-vlag NIET).
   Vóór release samen met de andere DEV-shortcuts verwijderen. */
window.devOutro = function () {
  Outro.start(() => { if (typeof naarTitel === 'function') naarTitel(); }, { dev: true });
};
