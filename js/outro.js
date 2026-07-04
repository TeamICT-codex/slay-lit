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
  const T = { LUCHT: 0, BETON: 1, GIPS: 2, GLAS: 3, MEUBEL: 4, KAST: 5, MACHINE: 6, HOUT: 7, METER: 8 };
  const TEGEL_HP = [0, 255, 1, 1, 1, 1, 2, 1, 1];
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
    slachter:  { R: '#c9302c', Q: '#8f1f1c' },
    gifmagier: { R: '#79c045', Q: '#4c7f2a' },
    thoverk:   { R: '#ff9c3f', Q: '#b96a24' }
  };

  /* ---------- pixel-sprites (string-maps, bij init gebakken) ---------- */
  const SPRITES = {
    held_sta: [
      '..kkkk..',
      '.kkffkk.',
      '.kffff..',
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
      '..kkkk..',
      '.kkffkk.',
      '.kffff..',
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
      '..kkkk..',
      '.kkffkk.',
      '.kffff..',
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
      '..kkkk..',
      '.kkffkk.',
      '.kffff..',
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
  let tijd = 0, introT = 0, klaarT = 0;
  let hitstop = 0, schudT = 0, schudKracht = 0;
  let camX = 0, camY = 0;
  let held = null, drones = [], kogels = [], cocons = [], collegas = [], worp = null;
  let partikels = [], popups = [], popupWachtrij = 0, popupKlok = 0;
  let bomWachtrij = [], stortWachtrij = [];     /* kettingreacties + instortende kolommen */
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

  function bakAlles(heldId) {
    const tint = HELD_TINT[heldId] || HELD_TINT.slachter;
    gebakken = {};
    for (const naam in SPRITES) {
      gebakken[naam] = bakSprite(SPRITES[naam], naam.indexOf('held') === 0 ? tint : null);
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
      kols: B, rijen: H, type, hp,
      spelerStart: { x: 4 * TEGEL, y: (H - 5) * TEGEL },
      drones: [{ x: 31 * TEGEL, y: 6 * TEGEL }, { x: 56 * TEGEL, y: 8 * TEGEL }, { x: 86 * TEGEL, y: 6 * TEGEL }],
      cocons: [{ x: 25 * TEGEL, y: (H - 5) * TEGEL }, { x: 67 * TEGEL, y: (H - 5) * TEGEL }],
      lift: { x: 103 * TEGEL, y: (H - 8) * TEGEL, b: 4 * TEGEL, h: 5 * TEGEL }
    };
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
    /* de goederenlift (uitgang) op de achtergrond */
    const L = lvl.lift;
    bx.fillStyle = '#3f3c30'; bx.fillRect(L.x - 2, L.y - 2, L.b + 4, L.h + 2);
    bx.fillStyle = '#181510'; bx.fillRect(L.x, L.y, L.b, L.h);
    bx.fillStyle = '#ffb347'; bx.fillRect(L.x + L.b / 2 - 4, L.y - 6, 8, 3);
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
      if (!d.dood && Math.hypot(d.x + 4 - px, d.y + 4 - py) < straal + 8) raakDrone(d, 2);
    }
    for (const c of cocons) misschienCoconOpen(c, px, py, straal + 4);
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
  const GRUIS_KLEUR = [null, '#5b574a', '#cfc0a0', '#cfe0e4', '#7a5230', '#8a6a42', '#77848a', '#6d4a2a', '#c9a13a'];
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
  const GAME_TOETSEN = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'a', 'd', 'w', 's', 'j', 'k', 'x', 'z'];
  function opToetsNeer(e) {
    if (staat === 'uit') return;
    const k = e.key.toLowerCase();
    if (k === 'escape') { e.preventDefault(); slaOver(); return; }
    if (GAME_TOETSEN.indexOf(k) !== -1) {
      e.preventDefault();
      if (staat === 'intro' && !e.repeat) { introT = Math.max(introT, 6.2); return; }   /* intro doorklikken */
      if (staat === 'klaar' && !e.repeat && klaarT > 0.8) { beeindig(); return; }
      if (!e.repeat && (k === 'w' || k === 'arrowup' || k === ' ')) held && (held.sprongBuf = SPRONGBUFFER);
      if (!e.repeat && (k === 'j' || k === 'x')) vuurBuf = 0.1;
      if (!e.repeat && (k === 'k' || k === 'z')) worpBuf = 0.15;
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
    if (staat === 'klaar' && klaarT > 0.8) { beeindig(); return; }
    const p = canvasPunt(e);
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
      beweeg(h, dt);
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
          if (!d.dood && Math.abs(d.x + 4 - rx) < 12 && Math.abs(d.y + 4 - ry) < 12) raakDrone(d, 1);
        }
        for (const c of cocons) misschienCoconOpen(c, rx, ry, 12);
        if (!geraakt) sfx('smeed', 0.12);
      }
      /* DE BIJL — worp: boemerang die verder sloopt en terugkeert */
      if (inp.worpKnop && !worp) {
        worpBuf = 0;
        worp = { x: h.x + h.b / 2, y: h.y + 6, vx: h.richting * 170, terug: false, spin: 0 };
        sfx('energie', 0.2);
      }

      /* de lift bereikt = einde van de testverdieping */
      const L = lvl.lift;
      if (h.x + h.b > L.x && h.x < L.x + L.b && h.y + h.h > L.y && h.y < L.y + L.h) {
        staat = 'klaar'; klaarT = 0; sfx('win', 0.5);
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
        sloopGebied(worp.x, worp.y, 6, 1);
        for (const d of drones) if (!d.dood && Math.abs(d.x + 4 - worp.x) < 10 && Math.abs(d.y + 4 - worp.y) < 10) raakDrone(d, 2);
        for (const c of cocons) misschienCoconOpen(c, worp.x, worp.y, 10);
      }
    }

    /* — facturatiedrones — */
    for (const d of drones) {
      if (d.dood) continue;
      d.t += dt;
      d.y = d.y0 + Math.sin(d.t * 1.7) * 10;
      d.x = d.x0 + Math.sin(d.t * 0.8) * 14;
      d.klok -= dt;
      const dx = (h.x + h.b / 2) - (d.x + 4), dy = (h.y + h.h / 2) - (d.y + 4);
      const afst = Math.hypot(dx, dy);
      if (d.klok <= 0 && afst < 95 && h.wachtT <= 0) {
        d.klok = 1.6 + Math.random() * 0.7;
        const sn = 72 / (afst || 1);
        kogels.push({ x: d.x + 4, y: d.y + 6, vx: dx * sn, vy: dy * sn, t: 3 });
        sfx('blok', 0.1);
      }
      if (h.raakbaar <= 0 && h.wachtT <= 0 && Math.abs(d.x + 4 - (h.x + h.b / 2)) < 8 && Math.abs(d.y + 4 - (h.y + h.h / 2)) < 10) raakHeld();
    }

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

    /* — kettingreacties & instortingen — */
    verwerkBommen(dt);
    verwerkInstort(dt);

    /* — partikels / popups / camera — */
    for (const p of partikels) {
      p.t -= dt;
      if (p.soort === 'vuurbal') continue;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.soort === 'rook') { p.vy *= (1 - 0.6 * dt); continue; }
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

    const doelCam = klem(h.x + h.b / 2 - BREED / 2, 0, lvl.kols * TEGEL - BREED);
    camX += (doelCam - camX) * Math.min(1, dt * 7);
    camY = klem(lvl.rijen * TEGEL - HOOG, 0, 999);
  }

  function raakDrone(d, schade) {
    d.hp -= schade;
    spawnVonk(d.x + 4, d.y + 4, '#ffd23f', 4);
    hitstop = Math.max(hitstop, 0.03);
    if (d.hp <= 0) {
      d.dood = true;
      popupWachtrij += 3;   /* een drone is drie blokjes administratie */
      bomWachtrij.push({ px: d.x + 4, py: d.y + 4, straal: 11, t: 0.02 });   /* en gaat er Broforce-gewijs uit */
      spawnGruis(d.x + 4, d.y + 4, T.MACHINE);
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
      hudTekst = collegas.length === 1 ? '"...ZOALS IK DUS ZEI -"' : '"IK ZAT HIER SINDS DE TEAMBUILDING."';
      hudTekstT = 2.4;
      sfx('genees', 0.3);
    }
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
    if (staat === 'intro') { renderIntro(); presenteer(); return; }

    ctx.drawImage(bgCanvas, ox, oy);
    ctx.drawImage(tegelCanvas, ox, oy);

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

    /* collega's in de stoet */
    for (const c of collegas) {
      const fr = (c.loopT % 0.5) < 0.25 ? 'collega1' : 'collega2';
      tekenSprite(fr, c.x - 1 + ox, c.y + oy, c.vx < 0);
    }

    /* drones */
    for (const d of drones) {
      if (d.dood) continue;
      tekenSprite(((tijd * 10) | 0) % 2 ? 'drone1' : 'drone2', d.x + ox, d.y + oy);
    }

    /* 0u06-kogeltjes */
    ctx.fillStyle = '#ffd23f';
    for (const k of kogels) ctx.fillRect(Math.round(k.x + ox) - 2, Math.round(k.y + oy) - 2, 4, 4);

    /* de held (knippert kort na een treffer) */
    const h = held;
    if (h.wachtT <= 0 && (h.raakbaar <= 0 || (tijd * 12 | 0) % 2)) {
      const fr = !h.opGrond ? 'held_spring' : (Math.abs(h.vx) > 1 ? ((h.loopT % 1) < 0.5 ? 'held_loop1' : 'held_loop2') : 'held_sta');
      tekenSprite(fr, h.x + ox - 1, h.y + oy, h.richting < 0);
      /* de bijl-zwaai: één wit sloop-boogje vóór de held */
      if (h.zwaaiT > 0) {
        ctx.fillStyle = '#ffffff';
        const bx = h.x + h.b / 2 + h.richting * 8 + ox, by = h.y + 3 + oy;
        ctx.fillRect(bx, by, h.richting * 8, 2);
        ctx.fillRect(bx + h.richting * 6, by + 3, h.richting * 4, 2);
        ctx.fillRect(bx + h.richting * 2, by + 6, h.richting * 6, 2);
      }
    }

    /* de boemerang-bijl */
    if (worp) tekenSprite(((worp.spin | 0) % 2) ? 'bijl1' : 'bijl2', worp.x - 4 + ox, worp.y - 4 + oy, worp.vx < 0);

    /* partikels: eerst rook (achter), dan gruis/vonken, dan vuurballen (voor) */
    for (const p of partikels) {
      if (p.soort !== 'rook') continue;
      const a = klem(p.t / p.maxT, 0, 1);
      ctx.fillStyle = 'rgba(90,84,70,' + (0.5 * a).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(Math.round(p.x + ox), Math.round(p.y + oy), p.r * (1.6 - a * 0.6), 0, 7); ctx.fill();
    }
    for (const p of partikels) {
      if (p.soort === 'rook' || p.soort === 'vuurbal') continue;
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
    if (staat === 'klaar') renderKlaar();
    presenteer();
  }

  function renderHud() {
    /* hartjes linksboven */
    for (let i = 0; i < 3; i++) ctx.drawImage(gebakken[i < held.hartjes ? 'hart' : 'hart_leeg'], 4 + i * 7, 4);
    /* de ONTFACTUREERD-teller: sloop = administratie terugdraaien */
    const reg = 'ONTFACTUREERD: ' + Math.floor(ontfactureerd) + ' M2 KANTOOR';
    tekst(ctx, reg, BREED - 4 - tekstBreedte(reg), 5, '#cfc0a0');
    if (collegas.length) {
      const st = 'DE VELEN: ' + collegas.length;
      tekst(ctx, st, BREED - 4 - tekstBreedte(st), 12, '#5fd0d8');
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

  function renderKlaar() {
    ctx.fillStyle = 'rgba(8,6,4,' + klem(klaarT, 0, 0.78) + ')';
    ctx.fillRect(0, 0, BREED, HOOG);
    if (klaarT > 0.5) {
      tekst(ctx, 'EINDE TESTVERDIEPING', BREED / 2 - tekstBreedte('EINDE TESTVERDIEPING', 2) / 2, 60, '#ffb347', 2);
      const r1 = 'ONTFACTUREERD: ' + Math.floor(ontfactureerd) + ' M2 KANTOOR';
      const r2 = 'DE VELEN: ' + collegas.length + ' / ' + cocons.length;
      tekst(ctx, r1, BREED / 2 - tekstBreedte(r1) / 2, 86, '#cfc0a0');
      tekst(ctx, r2, BREED / 2 - tekstBreedte(r2) / 2, 96, '#5fd0d8');
      tekst(ctx, '(FASE 1 - FEEL-PROTOTYPE)', BREED / 2 - tekstBreedte('(FASE 1 - FEEL-PROTOTYPE)') / 2, 112, '#6e6a58');
    }
    if (klaarT > 1.2 && ((klaarT * 2) | 0) % 2) {
      const hint = window.mobiel ? 'TIK OM VERDER TE GAAN' : 'DRUK OP EEN TOETS';
      tekst(ctx, hint, BREED / 2 - tekstBreedte(hint) / 2, 140, '#6e6a58');
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
    if (staat === 'klaar') { klaarT += dt; render(); return; }
    if (hitstop > 0) { hitstop -= dt; render(); return; }
    if (schudT > 0) { schudT -= dt; if (schudT <= 0) schudKracht = 0; }
    accu = Math.min(accu + dt, 0.12);
    const stap = 1 / 60;
    while (accu >= stap) { updateSpel(stap); accu -= stap; }
    render();
  }

  function startSpel() {
    staat = 'spel';
    if (window.Klank && Klank.muziek) { try { Klank.muziek('stil'); } catch (e) {} }
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

    const heldId = (typeof S !== 'undefined' && S && S.held) ? S.held : 'slachter';
    bakAlles(heldId);
    lvl = bouwTestVerdieping();
    bakLevel();

    held = nieuweHeld();
    drones = lvl.drones.map(d => ({ x: d.x, y: d.y, x0: d.x, y0: d.y, t: Math.random() * 6, klok: 1 + Math.random(), hp: 2, dood: false }));
    cocons = lvl.cocons.map(c => ({ x: c.x, y: c.y, open: false }));
    collegas = []; kogels = []; partikels = []; popups = []; worp = null;
    ontfactureerd = 0; popupWachtrij = 0; hudTekst = null;
    camX = klem(held.x - BREED / 2, 0, lvl.kols * TEGEL - BREED); camY = lvl.rijen * TEGEL - HOOG;
    tijd = 0; introT = 0; klaarT = 0; hitstop = 0; accu = 0;
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
    const cb = naOutro; naOutro = null;
    if (cb) cb();
    else if (typeof naarTitel === 'function') naarTitel();
  }

  function slaOver() { beeindig(); }

  return { start, beeindig, slaOver, magSpelen, get actief() { return staat !== 'uit'; } };
})();
window.Outro = Outro;

/* DEV-SHORTCUT: de outro direct vanaf het titelscherm testen zonder een run
   uit te spelen — devOutro() in de console (zet de gezien-vlag NIET).
   Vóór release samen met de andere DEV-shortcuts verwijderen. */
window.devOutro = function () {
  Outro.start(() => { if (typeof naarTitel === 'function') naarTitel(); }, { dev: true });
};
