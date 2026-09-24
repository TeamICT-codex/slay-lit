/* ============================================================
   SLAY LIT — OutroFX: de beeldmotor van "De Opzegtermijn"
   Een pixel-lichtmotor (multiply-lichtkaart met gepostiseerde,
   gedithered lichtsprites — licht in banden, zoals pixel-art het
   wil), additieve gloed, kleurgrading, vignet, scanlines, en de
   procedurele buitenwereld: de nachtstad in parallax met regen,
   bliksem, zoeklichten en de reclamezeppelin; de onweerslucht op
   het dak; de dageraad. Alles procedureel — geen enkel asset.
   outro.js orkestreert; deze module weet niets van de spelwereld.
   ============================================================ */

const OutroFX = (() => {
  let W = 320, H = 180, lite = false, rustig = false, tekstFn = null, bandenNu = 6;
  let lichtC = null, lichtX = null;
  let vignetC = null, scanC = null, scanS = 0;
  const cache = new Map();                    /* gebakken lichtsprites */

  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };
  const klem = (v, a, b) => v < a ? a : (v > b ? b : v);
  const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  /* de ordered-dither-matrix: lichtbanden krijgen een gekorrelde overgang */
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  /* deterministische rng — elke stad is elke keer dezelfde stad */
  function rng(zaad) { let s = (zaad >>> 0) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

  /* pixels rechtstreeks in ImageData schrijven: bakken zonder duizenden
     losse fillRect-aanroepen (die op mobiel een voorbak-taak laten haperen) */
  const rgbCache = {};
  const rgbVan = k => rgbCache[k] || (rgbCache[k] = hex(k));
  function pixelVel(w, h) {
    const c = mk(w, h), x = c.getContext('2d'), img = x.createImageData(c.width, c.height), p = img.data, W2 = c.width;
    return {
      c,
      zet(xx, yy, kleur) {
        if (xx < 0 || yy < 0 || xx >= W2 || yy >= c.height) return;
        const k = rgbVan(kleur), i = (yy * W2 + xx) * 4;
        p[i] = k[0]; p[i + 1] = k[1]; p[i + 2] = k[2]; p[i + 3] = 255;
      },
      klaar() { x.putImageData(img, 0, 0); return c; }
    };
  }

  function init(opts) {
    W = opts.breed || 320; H = opts.hoog || 180; lite = !!opts.lite; rustig = !!opts.rustig; tekstFn = opts.tekst || null;
    lichtC = mk(W, H); lichtX = lichtC.getContext('2d');
    vignetC = bakVignet();
    bliksem.t = 0; bliksem.volgende = 3 + Math.random() * 4; bliksem.pad = null;
    bliksem.flits = 0; bliksem.tak = null; bliksem.inslag = null;
  }
  const isLite = () => lite;
  /* hoe grof het licht in trappen valt (per laag: 4 → 2, na de flip 6 → 8) */
  const zetBanden = n => { bandenNu = n | 0 || 6; };

  /* ---------- gebakken lichtsprites ----------
     een radiale val-af, in banden gepostiseerd (6 niveaus) met Bayer-dither
     op de randen: het licht "trapt" af, net als in handgetekende pixel-art */
  /* stralen worden op een vaste ladder afgerond: een ademende of groeiende
     lamp kiest zo een andere gebakken trap i.p.v. elk frame een nieuwe te bakken */
  const LADDER = [2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 90, 100];
  const kwant = r => { for (const k of LADDER) if (k >= r) return k; return 100; };
  function lichtSprite(r, kleur, banden) {
    r = kwant(Math.max(2, r | 0)); banden = banden || bandenNu;
    const sleutel = 'b' + r + kleur + banden;
    let c = cache.get(sleutel); if (c) return c;
    /* vol? dan de oudste eruit (Map onthoudt de volgorde), niet alles wissen */
    if (cache.size > 700) { let n = 0; for (const k of cache.keys()) { cache.delete(k); if (++n >= 100) break; } }
    const d = r * 2; c = mk(d, d);
    const x = c.getContext('2d'); const img = x.createImageData(d, d); const p = img.data;
    const [R, G, B] = hex(kleur);
    for (let yy = 0; yy < d; yy++) for (let xx = 0; xx < d; xx++) {
      const dx = (xx + 0.5 - r) / r, dy = (yy + 0.5 - r) / r;
      const afst = Math.sqrt(dx * dx + dy * dy);
      const i = (yy * d + xx) * 4; p[i + 3] = 255;
      if (afst >= 1) continue;
      const f = Math.pow(1 - afst, 1.5);
      const drempel = (BAYER[(yy & 3) * 4 + (xx & 3)] / 16 - 0.47) * 0.95;
      const q = klem(Math.round(f * banden + drempel), 0, banden) / banden;
      p[i] = R * q; p[i + 1] = G * q; p[i + 2] = B * q;
    }
    x.putImageData(img, 0, 0);
    cache.set(sleutel, c);
    return c;
  }
  /* een lichtkegel naar beneden (tl-bak, spot): smal bovenaan, breed onderaan */
  function kegelSprite(breed, lengte, kleur) {
    breed = Math.max(1, breed | 0); lengte = Math.max(1, lengte | 0);
    const sleutel = 'k' + breed + 'x' + lengte + kleur + bandenNu;
    let c = cache.get(sleutel); if (c) return c;
    c = mk(breed, lengte);
    const x = c.getContext('2d'); const img = x.createImageData(breed, lengte); const p = img.data;
    const [R, G, B] = hex(kleur); const banden = Math.max(2, bandenNu);
    for (let yy = 0; yy < lengte; yy++) {
      const v = yy / lengte;
      const half = (0.18 + 0.82 * v) * breed / 2;        /* de kegel waaiert uit */
      for (let xx = 0; xx < breed; xx++) {
        const i = (yy * breed + xx) * 4; p[i + 3] = 255;
        const dx = Math.abs(xx + 0.5 - breed / 2) / half;
        if (dx >= 1) continue;
        const f = Math.pow(1 - dx * dx, 0.7) * (0.62 + 0.38 * (1 - v)) * (v > 0.9 ? 1 - (v - 0.9) * 6 : 1);
        const drempel = (BAYER[(yy & 3) * 4 + (xx & 3)] / 16 - 0.47) * 0.9;
        const q = klem(Math.round(f * banden + drempel), 0, banden) / banden;
        p[i] = R * q; p[i + 1] = G * q; p[i + 2] = B * q;
      }
    }
    x.putImageData(img, 0, 0);
    cache.set(sleutel, c);
    return c;
  }

  /* ---------- de lichtkaart ----------
     lichtBegin(ambient) → licht()/kegel()/flits() → toepassen(ctx) (multiply).
     Wat vóór toepassen getekend wordt is "belicht"; wat erna komt is emissief. */
  function lichtBegin(ambient) {
    lichtX.globalCompositeOperation = 'source-over';
    lichtX.globalAlpha = 1;
    lichtX.fillStyle = ambient; lichtX.fillRect(0, 0, W, H);
    lichtX.globalCompositeOperation = 'lighter';
  }
  function licht(x, y, r, kleur, sterkte) {
    if (sterkte <= 0.02 || x + r < 0 || y + r < 0 || x - r > W || y - r > H) return;
    lichtX.globalAlpha = klem(sterkte == null ? 1 : sterkte, 0, 1);
    const c = lichtSprite(r, kleur), rr = c.width >> 1;
    lichtX.drawImage(c, Math.round(x - rr), Math.round(y - rr));
  }
  function kegel(x, y, breed, lengte, kleur, sterkte) {
    if (sterkte <= 0.02 || x + breed < 0 || x - breed > W) return;
    lichtX.globalAlpha = klem(sterkte == null ? 1 : sterkte, 0, 1);
    lichtX.drawImage(kegelSprite(breed, lengte, kleur), Math.round(x - breed / 2), Math.round(y));
  }
  /* vullicht over een horizontale band (de speelstrook): drie harde trappen die
     naar de vloer toe sterker worden — plafond en ramen blijven donker */
  function vulBand(y0, y1, kleur, sterkte) {
    if (sterkte <= 0.02 || y1 <= y0) return;
    const n = 3, hoog = y1 - y0;
    lichtX.fillStyle = kleur;
    for (let b = 0; b < n; b++) {
      const ya = Math.round(y0 + hoog * b / n), yb = Math.round(y0 + hoog * (b + 1) / n);
      lichtX.globalAlpha = klem(sterkte * (b + 1) / n, 0, 1);
      lichtX.fillRect(0, ya, W, yb - ya);
    }
  }
  function lichtFlits(kleur, sterkte) {
    if (sterkte <= 0.01) return;
    lichtX.globalAlpha = klem(sterkte, 0, 1);
    lichtX.fillStyle = kleur; lichtX.fillRect(0, 0, W, H);
  }
  function toepassen(ctx) {
    lichtX.globalAlpha = 1;
    lichtX.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(lichtC, 0, 0);
    ctx.restore();
  }
  /* belichten met behoud van gaten: de lichtkaart eerst uitknippen op de vorm
     van de wereldlaag (destination-in), dan pas vermenigvuldigen. Waar de
     wereld doorzichtig is (de ramen, de open lucht) blijft ze doorzichtig —
     de buitenwereld eronder straalt dus onbelicht en vol door. */
  function toepassenMasker(wctx, wc) {
    lichtX.globalAlpha = 1;
    lichtX.globalCompositeOperation = 'destination-in';
    lichtX.drawImage(wc, 0, 0);
    lichtX.globalCompositeOperation = 'source-over';
    wctx.save();
    wctx.globalCompositeOperation = 'multiply';
    wctx.drawImage(lichtC, 0, 0);
    wctx.restore();
  }

  /* ---------- gloed (additief, ná de lichtkaart) ---------- */
  function gloed(ctx, x, y, r, kleur, sterkte) {
    if (lite && r > 10) r = Math.round(r * 0.75);
    if (sterkte <= 0.02 || x + r < 0 || y + r < 0 || x - r > W || y - r > H) return;
    const vorig = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = klem(sterkte, 0, 1);
    const c = lichtSprite(r, kleur, 5), rr = c.width >> 1;
    ctx.drawImage(c, Math.round(x - rr), Math.round(y - rr));
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = vorig;
  }

  /* ---------- kleurgrading + vignet ---------- */
  function grade(ctx, kleur, sterkte, modus) {
    if (!kleur || sterkte <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = modus || 'soft-light';
    ctx.globalAlpha = klem(sterkte, 0, 1);
    ctx.fillStyle = kleur; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  function bakVignet() {
    const c = mk(W, H); const x = c.getContext('2d'); const img = x.createImageData(W, H); const p = img.data;
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
      const dx = (xx - W / 2) / (W / 2), dy = (yy - H / 2) / (H / 2);
      const d = Math.sqrt(dx * dx * 0.85 + dy * dy * 1.1);
      const f = klem((d - 0.62) / 0.6, 0, 1);
      const drempel = BAYER[(yy & 3) * 4 + (xx & 3)] / 16;
      const q = Math.floor(f * 5 + drempel) / 5;
      const i = (yy * W + xx) * 4;
      p[i] = 6; p[i + 1] = 4; p[i + 2] = 10; p[i + 3] = Math.round(q * 150);
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  function vignet(ctx, sterkte) {
    ctx.globalAlpha = klem(sterkte == null ? 1 : sterkte, 0, 1);
    ctx.drawImage(vignetC, 0, 0);
    ctx.globalAlpha = 1;
  }
  /* scanlines op het OPGESCHAALDE scherm (daar bestaan subpixels): CRT-gevoel */
  function scanlines(sctx, bw, bh, s, sterkte) {
    if (lite || s < 3) return;
    if (!scanC || scanS !== s || scanC.width !== bw || scanC.height !== bh) {
      scanC = mk(bw, bh); scanS = s;
      const x = scanC.getContext('2d');
      x.fillStyle = 'rgba(0,0,0,1)';
      for (let yy = s - 1; yy < bh; yy += s) x.fillRect(0, yy, bw, 1);
    }
    sctx.globalAlpha = sterkte == null ? 0.16 : sterkte;
    sctx.drawImage(scanC, 0, 0);
    sctx.globalAlpha = 1;
  }

  /* ============================================================
     VUUR, ROOK EN SCHROEI — gebakken frames, per frame alleen drawImage
     ============================================================ */
  const HELLING = ['#ffffff', '#fff4a0', '#ffd23f', '#ff9c3f', '#ff5a3c', '#8f2a1c', '#3a1a10'].map(hex);
  const VB_KLASSEN = [8, 12, 16, 24, 32];
  const vbCache = {};
  const hash = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  /* de vuurbal in 8 fasen: witte kern met stralen → klonterige gele bol →
     oranje-rode rand met een bruine korst → uiteenvallende sintelwolk */
  function vuurbalFrames(R) {
    if (vbCache[R]) return vbCache[R];
    const frames = [], n = lite ? 5 : 8, D = R * 2 + 6;
    for (let f = 0; f < n; f++) {
      const fase = f / (n - 1);
      const c = mk(D, D), x = c.getContext('2d'), img = x.createImageData(D, D), p = img.data;
      const rf = R * (0.5 + 0.5 * (1 - Math.pow(1 - fase, 3)));
      for (let yy = 0; yy < D; yy++) for (let xx = 0; xx < D; xx++) {
        const dx = xx + 0.5 - D / 2, dy = yy + 0.5 - D / 2, d = Math.sqrt(dx * dx + dy * dy), a = Math.atan2(dy, dx);
        const rand = rf * (1 + 0.16 * (Math.sin(3 * a + f) + Math.sin(5 * a - 2 * f) + Math.sin(7 * a + 3 * f)) / 3);
        if (d > rand) continue;
        let v = (d / rand) * 0.6 + fase * 0.85;
        if (dy < -rand * 0.3 && fase > 0.45) v += 0.22;                     /* de korst bovenaan */
        if (fase > 0.55 && hash(xx, yy, f) < (fase - 0.55) * 1.7) continue;   /* hij valt uiteen */
        const drempel = BAYER[(yy & 3) * 4 + (xx & 3)] / 16;
        const k = HELLING[klem(Math.floor(v * 6 + drempel - 0.4), 0, 6)];
        const i = (yy * D + xx) * 4; p[i] = k[0]; p[i + 1] = k[1]; p[i + 2] = k[2]; p[i + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      if (f === 0) {
        /* de flits: een witte kern met vijf gekartelde stralen */
        x.fillStyle = '#ffffff';
        for (let k = 0; k < 5; k++) {
          const a = k * 1.2566 + 0.4, L = R * 1.3;
          for (let s2 = rf * 0.5; s2 < L; s2 += 1) x.fillRect(Math.round(D / 2 + Math.cos(a) * s2 + (s2 % 4 < 2 ? 0 : 1)), Math.round(D / 2 + Math.sin(a) * s2), 1, 1);
        }
      }
      frames.push(c);
    }
    vbCache[R] = frames;
    return frames;
  }
  function tekenVuurbal(ctx, x, y, r, fase) {
    let R = VB_KLASSEN[VB_KLASSEN.length - 1];
    for (const k of VB_KLASSEN) if (k >= r * 0.85) { R = k; break; }
    if (lite && R !== 12 && R !== 24) R = R < 18 ? 12 : 24;
    const fr = vuurbalFrames(R);
    const c = fr[klem(Math.floor(fase * fr.length), 0, fr.length - 1)];
    ctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height / 2));
  }
  /* rookbollen: gedithered rand, een koude bovenkant en (warm/heet) een
     door het vuur aangelichte onderkant */
  const rookCache = {};
  const ROOK = {
    koud: { lijf: '#3a3a3e', top: '#4a4a50', onder: '#2c2c32' },
    warm: { lijf: '#5a3a2a', top: '#4a4448', onder: '#b0582c' },
    heet: { lijf: '#9a5a2a', top: '#6a4a3a', onder: '#ffb347' }
  };
  function rookBol(r, tint) {
    r = Math.max(2, Math.min(14, Math.round(r)));
    const sleutel = tint + r;
    if (rookCache[sleutel]) return rookCache[sleutel];
    const T2 = ROOK[tint] || ROOK.koud, D = r * 2;
    const v = pixelVel(D, D);
    for (let yy = 0; yy < D; yy++) for (let xx = 0; xx < D; xx++) {
      const dx = (xx + 0.5 - r) / r, dy = (yy + 0.5 - r) / r, d = Math.sqrt(dx * dx + dy * dy);
      const drempel = BAYER[(yy & 3) * 4 + (xx & 3)] / 16;
      if (d > 1 || (d > 0.72 && drempel < (d - 0.72) * 3.2)) continue;
      v.zet(xx, yy, dy > 0.35 ? T2.onder : (dy < -0.45 ? T2.top : T2.lijf));
    }
    const c = v.klaar();
    rookCache[sleutel] = c;
    return c;
  }
  /* de schroeiplek die in de achterwand blijft: gedithered, met roetstrepen */
  const schroeiCache = {};
  function schroeiStempel(r) {
    r = Math.max(6, Math.min(30, Math.round(r / 2) * 2));
    if (schroeiCache[r]) return schroeiCache[r];
    const b = r * 2, h = r * 2 + 18;
    const v = pixelVel(b, h), Z = '#0b0907';
    const cy = 18 + r;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < b; xx++) {
      const dx = (xx + 0.5 - r) / r, dy = (yy + 0.5 - cy) / (r * 0.8), d = Math.sqrt(dx * dx + dy * dy);
      const drempel = BAYER[(yy & 3) * 4 + (xx & 3)] / 16;
      if (d < 1 && drempel < (1 - d) * 1.4 + 0.1) v.zet(xx, yy, Z);
    }
    /* roetstrepen omhoog, die naar boven toe uitdunnen */
    const rr = rng(r * 13);
    for (let k = 0; k < 4; k++) {
      const sx = Math.round(r * 0.4 + rr() * r * 1.2), l = 8 + ((rr() * 12) | 0);
      for (let yy = 0; yy < l; yy++) if (BAYER[(yy & 3) * 4 + (sx & 3)] / 16 < 1 - yy / l) v.zet(sx, Math.round(cy - r * 0.6 - yy), Z);
    }
    const c = v.klaar();
    schroeiCache[r] = { c, ox: r, oy: cy };
    return schroeiCache[r];
  }

  /* ============================================================
     DE BUITENWERELD — luchten en de stad
     ============================================================ */
  const LUCHTEN = {
    nacht:    { banden: ['#07060f', '#0c0b1c', '#141330', '#1e1a3e', '#2a2048', '#3a2750'], sterren: 1 },
    storm:    { banden: ['#0b0812', '#171023', '#251533', '#3a1c3d', '#5a2740', '#7a3a3a', '#9a5234'], sterren: 0 },
    dageraad: { banden: ['#1e3a5c', '#3b4f78', '#6a5a86', '#a8687a', '#d8835e', '#f0a95a', '#f8cf7a'], sterren: 0.25 }
  };
  const luchtCache = new Map();
  function bakLucht(naam, hoog) {
    const sleutel = naam + hoog; let c = luchtCache.get(sleutel); if (c) return c;
    const L = LUCHTEN[naam] || LUCHTEN.nacht;
    c = mk(W, hoog); const x = c.getContext('2d'); const img = x.createImageData(W, hoog); const p = img.data;
    const kl = L.banden.map(hex), n = kl.length - 1;
    for (let yy = 0; yy < hoog; yy++) {
      const f = (yy / hoog) * n;
      for (let xx = 0; xx < W; xx++) {
        const drempel = BAYER[(yy & 3) * 4 + (xx & 3)] / 16;
        const k = kl[klem(Math.floor(f + drempel - 0.25), 0, n)];
        const i = (yy * W + xx) * 4; p[i] = k[0]; p[i + 1] = k[1]; p[i + 2] = k[2]; p[i + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    if (L.sterren) {
      const r = rng(naam.length * 97 + hoog);
      for (let i = 0; i < 70 * L.sterren; i++) {
        const sx = (r() * W) | 0, sy = (r() * hoog * 0.6) | 0;
        x.fillStyle = r() < 0.2 ? '#fff4d6' : (r() < 0.5 ? '#9aa7c8' : '#5d6690');
        x.fillRect(sx, sy, 1, 1);
      }
    }
    luchtCache.set(sleutel, c);
    return c;
  }

  /* de stad in drie lagen, elk een tegelbare strook */
  const STAD_B = 640;
  let stadLagen = null;
  function bakStad() {
    if (stadLagen) return stadLagen;
    const r = rng(8742);
    const laag = (hoog, opt) => {
      const c = mk(STAD_B, hoog); const x = c.getContext('2d');
      const gebouw = (bx, bw, bh) => {
        const by = hoog - bh;
        x.fillStyle = opt.kleur; x.fillRect(bx, by, bw, bh);
        /* daklijn: antenne, watertank of een getrapte top */
        const soort = r();
        if (soort < 0.25) { x.fillRect(bx + (bw >> 1), by - 6 - ((r() * 8) | 0), 1, 8 + ((r() * 6) | 0)); }
        else if (soort < 0.45) { x.fillRect(bx + 2, by - 4, 5, 4); x.fillRect(bx + 3, by - 5, 3, 1); }
        else if (soort < 0.6 && bw > 10) { x.fillRect(bx + 2, by - 3, bw - 4, 3); x.fillRect(bx + 4, by - 5, bw - 8, 2); }
        if (opt.rood && r() < 0.5) opt.rood.push({ x: bx + (bw >> 1), y: by - 7, fase: r() * 6 });
        /* ramen: een raster, een deel brandt (warm of tl-koud) */
        for (let wy = by + 3; wy < hoog - 2; wy += opt.rij) {
          for (let wx = bx + 2; wx < bx + bw - 2; wx += opt.kol) {
            if (r() < opt.kans) {
              x.fillStyle = r() < 0.72 ? opt.warm : opt.koud;
              x.fillRect(wx, wy, opt.rw, opt.rh);
              if (opt.flikker && r() < 0.05) opt.flikker.push({ x: wx, y: wy, w: opt.rw, h: opt.rh, fase: r() * 9 });
            }
          }
        }
      };
      let bx = 0;
      while (bx < STAD_B) {
        const bw = opt.bmin + ((r() * (opt.bmax - opt.bmin)) | 0);
        const bh = opt.hmin + ((r() * (opt.hmax - opt.hmin)) | 0);
        gebouw(bx, bw, bh);
        if (bx + bw > STAD_B) { x.save(); x.translate(-STAD_B, 0); gebouw(bx, bw, bh); x.restore(); }
        bx += bw + ((r() * 3) | 0);
      }
      return c;
    };
    const verRood = [], midRood = [], nabijFlikker = [];
    stadLagen = {
      ver:    { c: laag(90,  { kleur: '#161634', warm: '#4a4064', koud: '#3a4a70', kans: 0.28, kol: 3, rij: 4, rw: 1, rh: 1, bmin: 8, bmax: 22, hmin: 30, hmax: 78, rood: verRood }), f: 0.08, rood: verRood },
      mid:    { c: laag(110, { kleur: '#0f0e22', warm: '#8a6a4a', koud: '#4a6a8a', kans: 0.22, kol: 4, rij: 5, rw: 2, rh: 2, bmin: 14, bmax: 34, hmin: 40, hmax: 104, rood: midRood }), f: 0.18, rood: midRood },
      nabij:  { c: laag(130, { kleur: '#08070f', warm: '#d8a052', koud: '#6a9ac8', kans: 0.18, kol: 6, rij: 7, rw: 3, rh: 3, bmin: 26, bmax: 58, hmin: 50, hmax: 126, flikker: nabijFlikker }), f: 0.34, flikker: nabijFlikker }
    };
    /* reclame op het dichtste gebouw: het neonbord en de knipoog */
    if (tekstFn) {
      const x = stadLagen.nabij.c.getContext('2d');
      /* korte, omkaderde neonborden: ze moeten leesbaar blijven tussen de roeden */
      const bord = (bx, by, txt, kl) => {
        const b = txt.length * 6 + 5;
        x.fillStyle = '#08070f'; x.fillRect(bx, by, b, 12);
        x.fillStyle = kl; x.globalAlpha = 0.5; x.fillRect(bx, by, b, 1); x.fillRect(bx, by + 11, b, 1); x.globalAlpha = 1;
        tekstFn(x, txt, bx + 3, by + 3, kl);
      };
      bord(206, 26, 'B.A.A.S.', '#d43d6a');
      bord(470, 34, 'GLIMLACH!', '#ffd23f');
    }
    return stadLagen;
  }

  /* de onweerswolken: drie lagen, een harde vorm met een Bayer-rafelrand, en
     aan de onderbuik GESMOLTEN ROOD ONDERLICHT van je eigen brandende toren
     (de Act 3-handtekening: 3 px #8a2a1c met een rand van 1 px #ff6a2a) */
  const WOLK_B = 640;
  const wolken = [null, null, null];
  /* elke laag = een rij cumulus-bulten (cirkels): een geschulpte onderrand
     die van onder rood aangelicht wordt, en een donker, getextureerd lijf */
  function stormLaag(zaad, hoog, lijf, licht, rood) {
      const v = pixelVel(WOLK_B, hoog), r = rng(zaad);
      const onder = new Float32Array(WOLK_B).fill(-1), bov = new Float32Array(WOLK_B).fill(hoog);
      for (let k = 0; k < 26; k++) {
        const bx = r() * WOLK_B, br = 10 + r() * 22, by = hoog * (0.25 + r() * 0.45);
        for (let dx = -br; dx <= br; dx++) {
          const xx = ((Math.round(bx + dx) % WOLK_B) + WOLK_B) % WOLK_B, h = Math.sqrt(br * br - dx * dx);
          onder[xx] = Math.max(onder[xx], by + h * 0.55);
          bov[xx] = Math.min(bov[xx], by - h * 0.8);
        }
      }
      for (let xx = 0; xx < WOLK_B; xx++) {
        if (onder[xx] < 0) continue;
        const o = Math.min(hoog, Math.round(onder[xx])), b0 = Math.max(0, Math.round(bov[xx]));
        for (let yy = b0; yy < o; yy++) {
          const tot = o - yy, drempel = BAYER[(yy & 3) * 4 + (xx & 3)] / 16;
          let kl = lijf;
          if (yy - b0 < 3 && drempel < 0.5) kl = licht;                         /* bovenrand vangt wat stadslicht */
          if (rood) {
            if (tot === 1) kl = '#ff6a2a';
            else if (tot <= 3) kl = '#8a2a1c';
            else if (tot <= 7 && drempel < (8 - tot) / 6) kl = '#5a1e22';        /* de gloed dithert omhoog uit */
          }
          if (yy - b0 < 2 && drempel > 0.6) continue;                           /* rafelrand */
          v.zet(xx, yy, kl);
        }
      }
      return v.klaar();
  }
  const STORM = [
    [91, 60, '#140e1e', '#231a30', false, 0.08, 3, -12],
    [57, 64, '#1a1124', '#2a1c34', true, 0.18, 7, 6],
    [23, 58, '#1e1222', '#301c30', true, 0.32, 12, 26]
  ];
  function bakWolkLaag(i) {
    if (!wolken[i]) { const [z, h, l, li, ro, f, v, y] = STORM[i]; wolken[i] = { c: stormLaag(z, h, l, li, ro), f, v, y }; }
    return wolken[i];
  }
  function bakWolken() { for (let i = 0; i < STORM.length; i++) bakWolkLaag(i); return wolken; }
  /* dageraadwolken: roze lijf, een gouden rand aan de zonkant (boven), een
     paarse onderbuik — voor de val en de epiloog */
  const dagWolken = [null, null];
  function dagLaag(zaad, hoog, lijf, rand, onderK) {
      const v = pixelVel(WOLK_B, hoog), r = rng(zaad);
      const onder = new Float32Array(WOLK_B).fill(-1), bov = new Float32Array(WOLK_B).fill(hoog);
      for (let k = 0; k < 14; k++) {
        const bx = r() * WOLK_B, br = 8 + r() * 18, by = hoog * (0.35 + r() * 0.3);
        for (let dx = -br * 1.6; dx <= br * 1.6; dx++) {
          const xx = ((Math.round(bx + dx) % WOLK_B) + WOLK_B) % WOLK_B, q = dx / 1.6, h = Math.sqrt(Math.max(0, br * br - q * q));
          onder[xx] = Math.max(onder[xx], by + h * 0.35);
          bov[xx] = Math.min(bov[xx], by - h * 0.7);
        }
      }
      for (let xx = 0; xx < WOLK_B; xx++) {
        if (onder[xx] < 0) continue;
        const o = Math.min(hoog, Math.round(onder[xx])), b0 = Math.max(0, Math.round(bov[xx]));
        for (let yy = b0; yy < o; yy++) {
          const drempel = BAYER[(yy & 3) * 4 + (xx & 3)] / 16;
          let kl = lijf;
          if (yy - b0 < 2) kl = rand; else if (yy - b0 < 4 && drempel < 0.5) kl = rand;
          if (o - yy <= 2) kl = onderK;
          v.zet(xx, yy, kl);
        }
      }
      return v.klaar();
  }
  const DAG = [
    [301, 40, '#b86a7a', '#ffd8b0', '#7a4a6a', 0.1, 3, 0],
    [177, 46, '#d88a8a', '#fff0d0', '#9a5a72', 0.2, 6, 0]
  ];
  function bakDagLaag(i) {
    if (!dagWolken[i]) { const [z, h, l, ra, on, f, v, y] = DAG[i]; dagWolken[i] = { c: dagLaag(z, h, l, ra, on), f, v, y }; }
    return dagWolken[i];
  }
  function bakDagWolken() { for (let i = 0; i < DAG.length; i++) bakDagLaag(i); return dagWolken; }
  function tekenDagWolken(ctx, t, dx, y0, y1) {
    const W2 = bakDagWolken();
    for (let i = 0; i < (lite ? 1 : 2); i++) {
      const L = W2[i], y = i ? y1 : y0;
      const off = -((((dx * L.f + t * L.v) % WOLK_B) + WOLK_B) % WOLK_B);
      ctx.drawImage(L.c, Math.round(off), Math.round(y)); ctx.drawImage(L.c, Math.round(off + WOLK_B), Math.round(y));
    }
  }
  function tekenWolken(ctx, t, camX, laagBov) {
    const W2 = bakWolken();
    const n = lite ? 1 : 3;
    for (let i = 0; i < n; i++) {
      const L = W2[lite ? 2 : i];
      const off = -((((camX * L.f + t * L.v) % WOLK_B) + WOLK_B) % WOLK_B);
      ctx.drawImage(L.c, Math.round(off), L.y + (laagBov || 0));
      ctx.drawImage(L.c, Math.round(off + WOLK_B), L.y + (laagBov || 0));
    }
  }

  /* bliksem: een eigen klokje; flitst de lucht en (via bliksemSterkte) de lichtkaart */
  const bliksem = { t: 0, volgende: 5, flits: 0, pad: null, tak: null, pX: 0, inslag: null };
  /* een gekarteld pad via midpoint-displacement (grof → fijn) */
  function bliksemPad(x0, y0, x1, y1, ruw) {
    let pts = [[x0, y0], [x1, y1]];
    for (let niveau = 0; niveau < 5; niveau++) {
      const nw = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
        nw.push([(ax + bx) / 2 + (Math.random() - 0.5) * ruw, (ay + by) / 2 + (Math.random() - 0.5) * ruw * 0.3], [bx, by]);
      }
      pts = nw; ruw *= 0.55;
    }
    return pts;
  }
  /* updateBliksem(dt, actief, opDonder, doel): doel() geeft een inslagpunt
     (de antenne van B.A.A.S.) — om de andere keer slaat hij daar in */
  function updateBliksem(dt, actief, opDonder, doel) {
    if (bliksem.flits > 0) bliksem.flits = Math.max(0, bliksem.flits - dt * 2.6);
    if (!actief) return;
    bliksem.t += dt;
    if (bliksem.t >= bliksem.volgende) {
      bliksem.t = 0; bliksem.volgende = 3.5 + Math.random() * 6;
      bliksem.flits = 1;
      const d = doel && Math.random() < 0.5 ? doel() : null;
      const x0 = 30 + Math.random() * (W - 60);
      const x1 = d ? d.x : x0 + (Math.random() - 0.5) * 80, y1 = d ? d.y : H * (0.55 + Math.random() * 0.25);
      bliksem.pX = x1;
      bliksem.pad = bliksemPad(x0, 0, x1, y1, 60);
      const i = (bliksem.pad.length * (0.3 + Math.random() * 0.3)) | 0, [tx, ty] = bliksem.pad[i];
      bliksem.tak = bliksemPad(tx, ty, tx + (Math.random() - 0.5) * 70, ty + 20 + Math.random() * 30, 26);
      bliksem.inslag = d ? { x: x1, y: y1 } : null;
      if (opDonder) opDonder(bliksem.inslag);
    }
  }
  const bliksemSterkte = () => bliksem.flits * bliksem.flits * (rustig ? 0.25 : 1);
  const forceerBliksem = () => { bliksem.t = bliksem.volgende; };
  /* een schuine lichtschacht (parallellogram) in de lichtkaart: 3 banden over
     de breedte, met een gedithered rafelrand — het maanlicht door het gat */
  function schacht(x0, breed, hoek, kleur, sterkte) {
    if (sterkte <= 0.02) return;
    lichtX.fillStyle = kleur;
    for (let y = 0; y < H; y += 2) {
      const x = x0 + y * hoek;
      if (x > W + breed || x + breed < -breed) continue;
      for (const [f, a] of [[0, 0.35], [0.2, 0.7], [0.4, 1]]) {
        lichtX.globalAlpha = klem(sterkte * a, 0, 1);
        const rafel = BAYER[((y >> 1) & 3) * 4 + (y & 3)] / 16 * 2;
        lichtX.fillRect(Math.round(x + breed * f / 2 + rafel), y, Math.round(breed * (1 - f)), 2);
      }
    }
  }
  function plotPad(ctx, pad, dx, dy) {
    for (let i = 1; i < pad.length; i++) {
      const [x0, y0] = pad[i - 1], [x1, y1] = pad[i];
      const st = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
      for (let q = 0; q <= st; q++) ctx.fillRect(Math.round(x0 + (x1 - x0) * q / st) + dx, Math.round(y0 + (y1 - y0) * q / st) + dy, 1, 1);
    }
  }
  function tekenBliksemPad(ctx) {
    if (!bliksem.pad || bliksem.flits < 0.35) return;
    if (!lite) { ctx.fillStyle = '#9ab0ff'; plotPad(ctx, bliksem.pad, -1, 0); plotPad(ctx, bliksem.pad, 1, 0); }
    ctx.fillStyle = bliksem.flits > 0.7 ? '#ffffff' : '#dfe6ff';
    plotPad(ctx, bliksem.pad, 0, 0);
    if (bliksem.tak) plotPad(ctx, bliksem.tak, 0, 0);
  }

  /* regen: twee dieptes, elk één gebakken tegelbaar vel met schuine strepen
     dat per frame alleen verschoven wordt (4 blits i.p.v. honderden rects) */
  const regenVel = {};
  function bakRegen(nabij) {
    const sleutel = nabij ? 'n' : 'v';
    if (regenVel[sleutel]) return regenVel[sleutel];
    const c = mk(W, H), x = c.getContext('2d'), r = rng(nabij ? 777 : 333);
    const n = nabij ? 38 : 80, lengte = nabij ? 7 : 4;
    x.fillStyle = nabij ? 'rgba(178,196,236,0.55)' : 'rgba(120,140,190,0.5)';
    for (let i = 0; i < n; i++) {
      const sx = (r() * W) | 0, sy = (r() * H) | 0;
      for (let k = 0; k < lengte; k++) {
        const px = (sx - (k >> 1) + W) % W, py = (sy + k) % H;   /* 1 px opzij per 2 px omlaag: schuine regen */
        x.fillRect(px, py, 1, 1);
      }
    }
    regenVel[sleutel] = c;
    return c;
  }
  function tekenRegen(ctx, t, nabij, sterkte, y0, y1) {
    const c = bakRegen(nabij);
    const v = nabij ? 300 : 190;
    const oy = Math.round(((t * v) % H + H) % H), oxx = Math.round(((-t * v * 0.5) % W + W) % W);
    y0 = Math.max(0, y0 == null ? 0 : y0 | 0); y1 = Math.min(H, y1 == null ? H : Math.ceil(y1));
    if (y1 <= y0) return;
    if (sterkte != null) ctx.globalAlpha = klem(sterkte, 0, 1);
    for (const dx of [oxx - W, oxx]) for (const dy of [oy - H, oy]) {
      /* alleen het stuk van het vel dat in [y0, y1) valt */
      const a = Math.max(y0, dy), b = Math.min(y1, dy + H);
      if (b > a) ctx.drawImage(c, 0, a - dy, W, b - a, dx, a, W, b - a);
    }
    ctx.globalAlpha = 1;
  }

  /* de zeppelin met de reclame: een lichtkrant op de romp die "EEN PRODUCTIEF
     LEVEN" rondstuurt, navigatielichten, en een zoeklicht dat de stad aftast */
  let zeppelinC = null;
  const ZEP_B = 132, ZEP_H = 34;
  function bakZeppelin() {
    if (zeppelinC) return zeppelinC;
    zeppelinC = mk(ZEP_B, ZEP_H); const x = zeppelinC.getContext('2d');
    /* de romp: een langgerekte ellips, rij per rij, van onder donker naar boven licht */
    for (let yy = 0; yy < 24; yy++) {
      const dy = (yy - 11.5) / 12;
      const half = Math.sqrt(Math.max(0, 1 - dy * dy)) * 56;
      const kl = yy < 5 ? '#4a4460' : yy < 10 ? '#3a3550' : yy < 17 ? '#2c283e' : '#1e1b2c';
      x.fillStyle = kl; x.fillRect(Math.round(60 - half), yy + 2, Math.round(half * 2), 1);
    }
    x.fillStyle = '#1a1726';
    for (let k = 14; k < 110; k += 12) x.fillRect(k, 4, 1, 20);                       /* de spanten */
    x.fillStyle = '#1e1b2c'; x.fillRect(108, 2, 10, 8); x.fillRect(114, 0, 6, 12); x.fillRect(108, 18, 10, 7); x.fillRect(114, 16, 6, 11); /* vinnen */
    x.fillRect(46, 25, 22, 6); x.fillRect(48, 31, 18, 2);                             /* de gondel */
    x.fillStyle = '#ffb347'; for (const k of [49, 53, 57, 61]) x.fillRect(k, 27, 2, 2);
    x.fillStyle = '#0b0a12'; x.fillRect(18, 9, 84, 10);                               /* de lichtkrant */
    x.fillStyle = '#26223a'; x.fillRect(18, 9, 84, 1);
    return zeppelinC;
  }

  /* ---------- tekenLucht: de hele buitenwereld in één aanroep ----------
     opts: { lucht:'nacht'|'storm'|'dageraad', horizon: y van de stadvoet,
             camX, t, regen: bool, bliksem: bool, zoeklicht: bool, zeppelin: bool,
             maan: bool } */
  function tekenLucht(ctx, o) {
    const hoog = H;
    ctx.drawImage(bakLucht(o.lucht || 'nacht', hoog), 0, 0);
    const t = o.t || 0, camX = o.camX || 0;
    /* de maan, half achter de wolken */
    if (o.maan) {
      const mx = 46 - camX * 0.02, my = 20;
      ctx.fillStyle = '#e8e2c8'; ctx.fillRect(mx, my, 9, 9); ctx.fillRect(mx - 1, my + 2, 11, 5); ctx.fillRect(mx + 2, my - 1, 5, 11);
      ctx.fillStyle = '#c8c0a0'; ctx.fillRect(mx + 2, my + 3, 2, 2); ctx.fillRect(mx + 5, my + 5, 2, 1);
      if (!lite) gloed(ctx, mx + 4, my + 4, 26, '#6a6a9a', 0.35);
    }
    /* bliksem-flits: de hele lucht licht op */
    if (bliksem.flits > 0.05) {
      ctx.fillStyle = 'rgba(200,210,255,' + (0.35 * bliksemSterkte()).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, hoog);
    }
    if (o.lucht === 'storm') tekenWolken(ctx, t, camX, o.wolkY);
    if (bliksem.flits > 0.05) tekenBliksemPad(ctx);
    /* de zoeklichten van de stad: twee trage bundels */
    if (o.zoeklicht && !lite) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) {
        const hoek = Math.sin(t * (0.23 + i * 0.11) + i * 2) * 0.55 - (i ? 0.2 : -0.2);
        const bx = (i ? 230 : 80) - camX * 0.18, by = o.horizon;
        ctx.fillStyle = 'rgba(120,130,170,0.07)';
        ctx.beginPath(); ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.sin(hoek - 0.06) * 260, by - Math.cos(hoek - 0.06) * 260);
        ctx.lineTo(bx + Math.sin(hoek + 0.06) * 260, by - Math.cos(hoek + 0.06) * 260);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    /* de zeppelin, heel traag, met een lichtkrant die loopt en een zoeklicht */
    if (o.zeppelin && tekstFn) {
      const z = bakZeppelin();
      const zx = Math.round(((t * 5 - camX * 0.06) % (W + ZEP_B + 60)) - ZEP_B - 20), zy = Math.round(18 + Math.sin(t * 0.4) * 2);
      if (!lite) {
        /* het zoeklicht uit de gondel veegt traag over de stad */
        const hoek = Math.sin(t * 0.5) * 0.45;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,220,150,0.06)';
        ctx.beginPath(); ctx.moveTo(zx + 57, zy + 32);
        ctx.lineTo(zx + 57 + Math.sin(hoek - 0.12) * 200, zy + 32 + Math.cos(hoek - 0.12) * 200);
        ctx.lineTo(zx + 57 + Math.sin(hoek + 0.12) * 200, zy + 32 + Math.cos(hoek + 0.12) * 200);
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
      ctx.drawImage(z, zx, zy);
      const krant = 'EEN PRODUCTIEF LEVEN  -  UW WELZIJN IS ONZE KPI  -  GLIMLACH  -  ';
      const off = ((t * 16) % (krant.length * 6));
      ctx.save(); ctx.beginPath(); ctx.rect(zx + 19, zy + 10, 82, 8); ctx.clip();
      tekstFn(ctx, krant + krant, zx + 19 - off, zy + 10, '#ffb347');
      ctx.restore();
      /* navigatielichten: rood links, groen rechts, om beurten */
      if (((t * 1.5) | 0) % 2) { ctx.fillStyle = '#ff4a3a'; ctx.fillRect(zx + 6, zy + 13, 2, 2); }
      else { ctx.fillStyle = '#6aff9a'; ctx.fillRect(zx + 112, zy + 13, 2, 2); }
    }
    /* de stad, drie lagen parallax */
    const S = bakStad();
    const trek = (laag, voetY) => {
      const off = -(((camX * laag.f) % STAD_B) + STAD_B) % STAD_B;
      const y = Math.round(voetY - laag.c.height);
      ctx.drawImage(laag.c, Math.round(off), y);
      ctx.drawImage(laag.c, Math.round(off + STAD_B), y);
      return { off, y };
    };
    const hv = o.horizon;
    /* lite: de verste laag valt weg (je mist ze niet achter kleine ramen) */
    const lv = lite ? { off: 0, y: 0 } : trek(S.ver, hv - 6);
    /* knipperende rode obstakellichten op de verre torens */
    if (!lite && ((t * 1.3) | 0) % 2) {
      ctx.fillStyle = '#d43d2a';
      for (const r of S.ver.rood) { const x = ((r.x + lv.off) % STAD_B + STAD_B) % STAD_B; if (x < W) ctx.fillRect(Math.round(x), lv.y + r.y, 1, 1); }
    }
    if (o.regen && !lite) tekenRegen(ctx, t, false, null, o.y0, o.y1);
    const lm = trek(S.mid, hv + 2);
    if (((t * 0.9 + 0.5) | 0) % 2) {
      ctx.fillStyle = '#ff5a3c';
      for (const r of S.mid.rood) { const x = ((r.x + lm.off) % STAD_B + STAD_B) % STAD_B; if (x < W) ctx.fillRect(Math.round(x), lm.y + r.y, 1, 1); }
    }
    const ln = trek(S.nabij, hv + 14);
    /* een paar ramen in de dichtste laag gaan aan en uit: er woont iemand */
    ctx.fillStyle = '#08070f';
    for (const f of S.nabij.flikker) {
      if (Math.sin(t * 0.7 + f.fase) > 0.2) continue;
      const x = ((f.x + ln.off) % STAD_B + STAD_B) % STAD_B;
      if (x < W) ctx.fillRect(Math.round(x), ln.y + f.y, f.w, f.h);
    }
    /* mist aan de voet van de stad */
    ctx.fillStyle = 'rgba(40,36,70,0.35)'; ctx.fillRect(0, hv + 4, W, 20);
    if (o.regen) tekenRegen(ctx, t, true, null, o.y0, o.y1);
  }

  /* voorbakken: alles wat anders bij het eerste gebruik midden in de actie
     gebakken wordt, als kleine taken die outro.js tijdens de intro afwerkt */
  function voorbakTaken() {
    const t = [];
    for (const R of VB_KLASSEN) t.push(() => vuurbalFrames(R));
    for (const tint of ['koud', 'warm', 'heet']) t.push(() => { for (let r = 2; r <= 14; r++) rookBol(r, tint); });
    t.push(() => { for (let r = 6; r <= 30; r += 2) schroeiStempel(r); });
    t.push(bakStad);
    for (let i = 0; i < STORM.length; i++) t.push(() => bakWolkLaag(i));
    for (let i = 0; i < DAG.length; i++) t.push(() => bakDagLaag(i));
    t.push(() => bakRegen(false)); t.push(() => bakRegen(true));
    t.push(() => { for (const n of ['nacht', 'storm']) bakLucht(n, H); });
    return t;
  }
  const zetLite = v => { lite = !!v; };

  return {
    init, isLite, zetLite, voorbakTaken, zetBanden, vulBand, tekenVuurbal, rookBol, schroeiStempel, lichtBegin, licht, kegel, lichtFlits, toepassen, toepassenMasker, gloed, grade, vignet, scanlines,
    tekenLucht, updateBliksem, bliksemSterkte, forceerBliksem, schacht, tekenBliksemPad, tekenWolken, tekenDagWolken,
    get inslag() { return bliksem.flits > 0.6 ? bliksem.inslag : null; }, get bliksemFlits() { return bliksem.flits; }, tekenRegen, bakLucht, lichtSprite,
    get bliksemX() { return bliksem.pX; }
  };
})();
window.OutroFX = OutroFX;
