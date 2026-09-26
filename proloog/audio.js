/* SLAY LIT — Proloog · procedurele sfeer-audio (Web Audio API, geen bestanden).
   Alles gesynthetiseerd: CRT-brom, "d-ding"-belletje, hartslag, ruis, glitch, stempel, warmte.

   R1 "DE NAAD" (sep 2026): een DUNNE LAAG op de ENE AudioContext van het spel.
   De proloog maakt geen eigen AudioContext meer; ze haakt in op Klank.koppel()
   (js/audio.js) → { ctx, sfx(naam), muziek(scène) } en optioneel een uitgangsbus.
   De eigen mute-sleutel ('slaylit_audio_mute') is weg: de game-mute (Klank.vol.aan)
   en de sfx-schuif gelden. Ontbreekt Klank.koppel, of bestaat de context nog niet
   (geen gebaar gehad), dan zwijgt alles stil — nooit een fout. window.SLAYLIT_AUDIO.

   R2 "DE VAL EN DE KLANK": daarbovenop window.ProloogKlank (onderaan) — de jingle,
   de wachtmuziek, het transponeren, de stilte en de val-geluiden, op Klank.*.

   R3 "HET KANTOOR ALS FILM": de klank van scènes 0-2 (tik… tik… TING, de prikklok,
   de tl-golf, het glimlachquotum, de scheur, de audit, Karels buis, de oproep), twee
   lussen (regen op glas, de kantoorzoem) en een optionele maat (de wandklok) voor het
   ritmespel. Alle continue lagen lopen via één ambient-keten die pauzeert en knipt. */
window.SLAYLIT_AUDIO = (function () {
  let ctx = null, master = null, viaBus = false;
  let humNodes = null, noiseNode = null, noiseGain = null, droneNodes = null, bromNodes = null;
  let heartTimer = null, heartRate = 900, heartPauze = false, pauzeNu = false;
  let volKlok = null;

  /* ---------- koppeling met het spel ---------- */
  function koppel() {
    const K = window.Klank;
    if (!K || typeof K.koppel !== 'function') return null;
    let k = null;
    try { k = K.koppel(); } catch (e) { return null; }
    const c = k && k.ctx;
    if (!c || typeof c.createGain !== 'function') return null;
    if (c !== ctx) {
      /* nieuwe (of eerste) context: eigen submix erop, alles wat nog van een oude
         context hing is waardeloos → vergeten */
      ctx = c; humNodes = null; noiseNode = null; noiseGain = null; droneNodes = null; bromNodes = null;
      vergeetR3();
      master = c.createGain();
      const bus = k.bus || k.uit || k.sfxBus || null;
      viaBus = false;
      if (bus && typeof bus.connect === 'function') {
        try { master.connect(bus); viaBus = true; } catch (e) { viaBus = false; }
      }
      if (!viaBus) master.connect(c.destination);
      master.gain.value = doelVolume();
    }
    return c;
  }
  /* de game-mute en de sfx-schuif: via een bus regelt het spel dat zelf,
     rechtstreeks naar de luidsprekers lezen we Klank.vol */
  function doelVolume() {
    if (viaBus) return 0.9;
    const v = window.Klank && window.Klank.vol;
    if (!v) return 0.9;
    if (v.aan === false) return 0;
    const sfx = typeof v.sfx === 'number' ? v.sfx : 0.8;
    return Math.max(0, Math.min(1.2, sfx * 1.1));
  }
  function syncVolume() {
    if (!ctx || !master) return;
    try { master.gain.setTargetAtTime(doelVolume(), ctx.currentTime, 0.05); } catch (e) {}
  }
  /* continue lagen (brom/drone/ruis/hart) volgen een mute-klik binnen ±0,7 s */
  function volgVolume() {
    const nodig = !!(humNodes || droneNodes || noiseNode || heartTimer || bromNodes || regenNodes || kantoorNodes);
    if (nodig && !volKlok) volKlok = setInterval(syncVolume, 700);
    else if (!nodig && volKlok) { clearInterval(volKlok); volKlok = null; }
  }
  function ensure() {
    const c = koppel();
    if (!c) return null;
    syncVolume();
    return c;
  }
  function now() { return ctx.currentTime; }

  // —— CRT-brom: lage drone die "het scherm staat aan" suggereert ——
  function humOn() {
    if (!ensure() || humNodes) return;
    const g = ctx.createGain(); g.gain.value = 0; g.connect(lusBus() || master);   /* R3: via de ambient-keten (pauze, snit) */
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320; lp.connect(g);
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 60;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 120;
    // lichte 50Hz-flikker via een trage LFO op de gain
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.7;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.007; lfo.connect(lfoG); lfoG.connect(g.gain);
    o1.connect(lp); o2.connect(lp);
    o1.start(); o2.start(); lfo.start();
    g.gain.linearRampToValueAtTime(0.03, now() + 1.2);
    humNodes = { g, o1, o2, lfo };
    volgVolume();
  }
  function humOff() {
    if (!humNodes || !ctx) { humNodes = null; return; }
    const { g, o1, o2, lfo } = humNodes; const t = now();
    try { g.gain.cancelScheduledValues(t); g.gain.linearRampToValueAtTime(0, t + 0.8); } catch (e) {}
    [o1, o2, lfo].forEach((o) => { try { o.stop(t + 0.9); } catch (e) {} });
    humNodes = null;
    volgVolume();
  }

  // —— "d-ding": vies belletje van voldoening (twee korte tikken) ——
  function bel(freq, t0, dur, vol) {
    const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2.01;
    const g2 = ctx.createGain(); g2.gain.value = 0.35; o2.connect(g2); g2.connect(g);
    o.connect(g); o.start(t0); o2.start(t0); o.stop(t0 + dur + 0.05); o2.stop(t0 + dur + 0.05);
  }
  function ding() { if (!ensure()) return; const t = now(); bel(1320, t, 0.22, 0.22); bel(1760, t + 0.09, 0.3, 0.18); }
  function tik() { if (!ensure()) return; bel(880, now(), 0.12, 0.1); } // subtiele kaart-tik

  // —— teletype-tik: kort mechanisch toetsklikje terwijl B.A.A.S. typt ——
  function type() {
    if (!ensure()) return; const t = now();
    const g = ctx.createGain(); g.gain.value = 0.06; g.connect(master);
    g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.03);
    const o = ctx.createOscillator(); o.type = 'square';
    o.frequency.value = 1500 + Math.random() * 800; o.connect(g); o.start(t); o.stop(t + 0.035);
    const len = Math.floor(ctx.sampleRate * 0.02); const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const ng = ctx.createGain(); ng.gain.value = 0.05; ng.connect(master);
    const n = ctx.createBufferSource(); n.buffer = buf; n.connect(ng); n.start(t);
  }

  // —— hartslag: lub-dub, ritme instelbaar (versnelt in de val) ——
  function thump(t0, vol) {
    const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.22);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(78, t0); o.frequency.exponentialRampToValueAtTime(38, t0 + 0.2);
    o.connect(g); o.start(t0); o.stop(t0 + 0.26);
  }
  function beat() { if (!ensure()) return; const t = now(); thump(t, 0.5); thump(t + 0.17, 0.32); }
  function heartStart(rate) {
    heartRate = rate || 900;
    if (heartTimer && heartTimer !== -1) clearInterval(heartTimer);
    heartTimer = null;
    if (heartPauze) { heartTimer = -1; volgVolume(); return; }   /* -1 = start zodra de pauze voorbij is */
    if (!ensure()) { volgVolume(); return; }
    beat(); heartTimer = setInterval(beat, heartRate);
    volgVolume();
  }
  function heartRateSet(rate) {
    heartRate = rate || heartRate;
    if (!heartTimer || heartTimer === -1) return;
    clearInterval(heartTimer); beat(); heartTimer = setInterval(beat, heartRate);
  }
  function heartStop() { if (heartTimer) { if (heartTimer !== -1) clearInterval(heartTimer); heartTimer = null; } volgVolume(); }

  // —— aanzwellende ruis (val/blackout) ——
  function noiseOn(level) {
    if (!ensure()) return;
    if (!noiseNode) {
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      noiseNode = ctx.createBufferSource(); noiseNode.buffer = buf; noiseNode.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6;
      noiseGain = ctx.createGain(); noiseGain.gain.value = 0;
      noiseNode.connect(bp); bp.connect(noiseGain); noiseGain.connect(lusBus() || master);
      noiseNode.start();
    }
    noiseGain.gain.cancelScheduledValues(now());
    noiseGain.gain.linearRampToValueAtTime(Math.max(0, Math.min(0.16, level)), now() + 0.6);
    volgVolume();
  }
  function noiseOff() {
    if (!noiseNode || !ctx) { noiseNode = null; noiseGain = null; return; }
    const n = noiseNode, g = noiseGain, t = now();
    try { g.gain.cancelScheduledValues(t); g.gain.linearRampToValueAtTime(0, t + 0.8); n.stop(t + 0.9); } catch (e) {}
    noiseNode = null; noiseGain = null;
    volgVolume();
  }

  // —— glitch-zap ——
  function glitch() {
    if (!ensure()) return; const t = now();
    for (let i = 0; i < 5; i++) {
      const tt = t + i * 0.05;
      const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(master);
      g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(0.16, tt + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0006, tt + 0.045);
      const o = ctx.createOscillator(); o.type = 'square';
      o.frequency.value = 120 + Math.random() * 900; o.connect(g); o.start(tt); o.stop(tt + 0.05);
    }
  }

  // —— stempel-dreun (ONMIDDELLIJK ONTSLAG) ——
  /* R3: de dreun zelf is gedeeld — de prikklok (KA-TSJONK) en de machinestempel slaan met
     precies dezelfde klap als het ontslag later: het begin rijmt op het einde */
  function dreun(t, vol) {
    const g = ctx.createGain(); g.gain.value = vol; g.connect(master);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.3);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
    o.connect(g); o.start(t); o.stop(t + 0.32);
  }
  function stamp() {
    if (!ensure()) return; const t = now();
    dreun(t, 0.5);
    // klik bovenop
    const ng = ctx.createGain(); ng.gain.value = 0.2; ng.connect(master); ng.gain.setValueAtTime(0.2, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    const len = Math.floor(ctx.sampleRate * 0.06); const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const n = ctx.createBufferSource(); n.buffer = buf; n.connect(ng); n.start(t);
  }

  // —— warme akkoord-zwelling (de foto / de sintel) ——
  function warm() {
    if (!ensure()) return; const t = now();
    const freqs = [220, 277.18, 329.63]; // A majeur, troostend
    const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.5); g.gain.linearRampToValueAtTime(0, t + 2.6);
    freqs.forEach((f) => { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + 2.7); });
    warmG = g; warmTot = t + 2.6;   /* R3: de harde snit (gemarkeerd) knipt de warmte af */
  }

  // —— power-on sweep (dive in het scherm) ——
  function powerOn() {
    if (!ensure()) return; const t = now();
    const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(master); g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.14, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0006, t + 0.5);
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(1200, t + 0.35);
    o.connect(g); o.start(t); o.stop(t + 0.55);
  }

  // —— diepe ambient-drone (de afgrond) ——
  function droneOn(baseFreq, vol) {
    if (!ensure()) return; droneOff();
    const g = ctx.createGain(); g.gain.value = 0; g.connect(lusBus() || master);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.connect(g);
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = baseFreq;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = baseFreq * 1.5;
    const o3 = ctx.createOscillator(); o3.type = 'sine'; o3.frequency.value = baseFreq * 0.5;
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.09;
    const lfoG = ctx.createGain(); lfoG.gain.value = 3; lfo.connect(lfoG); lfoG.connect(o1.detune);
    o1.connect(lp); o2.connect(lp); o3.connect(lp);
    o1.start(); o2.start(); o3.start(); lfo.start();
    g.gain.linearRampToValueAtTime(vol, now() + 1.6);
    droneNodes = { g, os: [o1, o2, o3, lfo] };
    volgVolume();
  }
  function droneOff() {
    if (!droneNodes || !ctx) { droneNodes = null; return; }
    const { g, os } = droneNodes; const t = now();
    try { g.gain.cancelScheduledValues(t); g.gain.linearRampToValueAtTime(0, t + 1.0); } catch (e) {}
    os.forEach((o) => { try { o.stop(t + 1.1); } catch (e) {} }); droneNodes = null;
    volgVolume();
  }

  // —— plunge-whoosh: neerwaartse sweep wanneer je een masker loslaat ——
  function plunge() {
    if (!ensure()) return; const t = now();
    const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(master);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.15, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0006, t + 1.6);
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(440, t); o.frequency.exponentialRampToValueAtTime(38, t + 1.6);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1900, t); lp.frequency.exponentialRampToValueAtTime(200, t + 1.6);
    o.connect(lp); lp.connect(g); o.start(t); o.stop(t + 1.7);
    // ruis-vlaag eronder
    const len = Math.floor(ctx.sampleRate * 1.4); const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.4);
    const ng = ctx.createGain(); ng.gain.value = 0.08; ng.connect(master);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(1200, t); bp.frequency.exponentialRampToValueAtTime(180, t + 1.5);
    const n = ctx.createBufferSource(); n.buffer = buf; n.connect(bp); bp.connect(ng); n.start(t);
  }

  /* —— de val (R2): de goederenlift in de wacht ——
     Kleine, droge geluiden van een systeem dat één voor één uitgaat. Bewust GEEN
     val-whoosh, geen wind en geen inslag (keuze 3: de lift daalt, de mens valt niet). */
  let ruisB = null, ruisCtx = null;
  function ruisBuf() {
    if (ruisB && ruisCtx === ctx) return ruisB;
    const len = ctx.sampleRate; ruisB = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = ruisB.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    ruisCtx = ctx; return ruisB;
  }
  /* een kort gefilterd ruisstootje (R3: optioneel naar een andere knoop dan master) */
  function stoot(t, dur, soort, freq, q, vol, naar) {
    const n = ctx.createBufferSource(); n.buffer = ruisBuf();
    const f = ctx.createBiquadFilter(); f.type = soort; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    n.connect(f); f.connect(g); g.connect(naar || master);
    n.start(t, Math.random() * 0.5); n.stop(t + dur + 0.05);
  }
  /* de liftbel zakt mee met de wachtmuziek */
  function liftToon() {
    try { const s = window.Klank && window.Klank.wacht && window.Klank.wacht.stand; return s && typeof s.toon === 'number' ? s.toon : 0; } catch (e) { return 0; }
  }
  // etage: één dof liftbelletje per verdieping, en de kooi die over de railnaad tikt
  function etage() {
    if (!ensure()) return; const t = now();
    bel(1318.5 * Math.pow(2, liftToon() / 12), t, 0.55, 0.06);
    const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(master);
    g.gain.setValueAtTime(0.0001, t + 0.05); g.gain.linearRampToValueAtTime(0.12, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.2);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(90, t + 0.05); o.frequency.exponentialRampToValueAtTime(55, t + 0.18);
    o.connect(g); o.start(t + 0.05); o.stop(t + 0.22);
    for (let i = 0; i < 4; i++) stoot(t + 0.06 + i * 0.035 + Math.random() * 0.012, 0.03, 'bandpass', 2600 + Math.random() * 1600, 5, 0.03);
  }
  // tl-sterft: de kooi-tl hapert drie keer, en de starter geeft het op met één droog tikje
  function tlSterft() {
    if (!ensure()) return; const t = now();
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 100;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = 0;
    o.connect(bp); bp.connect(g); g.connect(master);
    const flak = [[0, 0.09, 0.05], [0.16, 0.2, 0.035], [0.33, 0.36, 0.028], [0.5, 0.52, 0.016]];
    flak.forEach(([a, b, v]) => { g.gain.setValueAtTime(v, t + a); g.gain.setValueAtTime(0, t + b); stoot(t + a, 0.012, 'highpass', 5000, 0.7, 0.04); });
    o.start(t); o.stop(t + 0.6);
    stoot(t + 0.62, 0.02, 'highpass', 3500, 0.7, 0.07);
  }
  // led-uit: het laatste gekochte licht — een klein elektronisch zuchtje naar beneden
  function ledUit() {
    if (!ensure()) return; const t = now();
    const g = ctx.createGain(); g.gain.value = 0.04; g.connect(master);
    g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.0006, t + 0.35);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(1760, t); o.frequency.exponentialRampToValueAtTime(220, t + 0.33);
    o.connect(g); o.start(t); o.stop(t + 0.37);
    stoot(t, 0.01, 'highpass', 4000, 0.7, 0.035);
  }
  // vellen: de vloer valt uiteen in factuurvellen — papier dat fladdert, geen dreun
  function vellen() {
    if (!ensure()) return; const t = now();
    for (let i = 0; i < 16; i++) {
      const tt = t + Math.pow(i / 16, 1.3) * 1.6 + Math.random() * 0.05;
      stoot(tt, 0.04 + Math.random() * 0.07, 'bandpass', 1800 + Math.random() * 2600, 1.4, 0.05 * (1 - i / 20));
    }
  }
  // liftknop: de knop −∞ gaat in — klik, een mechanische tunk en het relais
  function liftknop() {
    if (!ensure()) return; const t = now();
    stoot(t, 0.018, 'highpass', 2500, 0.7, 0.1);
    const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(master);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.18, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.16);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.14);
    o.connect(g); o.start(t); o.stop(t + 0.18);
    stoot(t + 0.09, 0.012, 'bandpass', 3200, 3, 0.045);
  }
  // kooltje: één warme ademhaling (zachte ruis die aanzwelt en wegebt) met drie knispers
  function kooltje() {
    if (!ensure()) return; const t = now();
    const n = ctx.createBufferSource(); n.buffer = ruisBuf(); n.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 0.5;
    const g = ctx.createGain(); g.gain.value = 0;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.9); g.gain.linearRampToValueAtTime(0, t + 2.2);
    n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + 2.3);
    [0.35, 0.8, 1.3].forEach((d) => stoot(t + d + Math.random() * 0.1, 0.02, 'highpass', 3000 + Math.random() * 2500, 0.7, 0.035));
  }
  // verbinding: de lijn valt weg — de haak die neergaat (klik-klak) en een korte kraak
  function verbinding() {
    if (!ensure()) return; const t = now();
    stoot(t, 0.012, 'bandpass', 1900, 2, 0.09);
    stoot(t + 0.065, 0.016, 'bandpass', 1300, 2, 0.07);
    for (let i = 0; i < 5; i++) stoot(t + 0.09 + i * 0.022 + Math.random() * 0.01, 0.015, 'bandpass', 900 + Math.random() * 2200, 1.2, 0.025);
  }
  // krant: de lichtkrant schuift een nieuw bericht in — één klein elektronisch tikje
  function krant() {
    if (!ensure()) return; const t = now();
    const g = ctx.createGain(); g.gain.value = 0.018; g.connect(master);
    g.gain.setValueAtTime(0.018, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.04);
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 2093;
    o.connect(g); o.start(t); o.stop(t + 0.05);
  }
  // schaarhek: het metalen hek van de goederenlift ratelt dicht
  function schaarhek() {
    if (!ensure()) return; const t = now();
    for (let i = 0; i < 9; i++) stoot(t + i * 0.045 + Math.random() * 0.02, 0.05, 'bandpass', 1800 + Math.random() * 3000, 8, 0.045);
    stoot(t + 0.42, 0.08, 'bandpass', 900, 3, 0.06);
  }
  // grendel (fixer R2): het schaarhek staat van bij het eerste beeld dicht; wat je hoort, is
  // het slot dat vergrendelt — de pal, een droge klak en het hek dat even natrilt
  function grendel() {
    if (!ensure()) return; const t = now();
    stoot(t, 0.02, 'bandpass', 2400, 6, 0.07);
    stoot(t + 0.05, 0.03, 'bandpass', 1500, 4, 0.07);
    const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(master);
    g.gain.setValueAtTime(0.0001, t + 0.05); g.gain.linearRampToValueAtTime(0.09, t + 0.056); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.17);
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(420, t + 0.05); o.frequency.exponentialRampToValueAtTime(260, t + 0.16);
    o.connect(g); o.start(t + 0.05); o.stop(t + 0.19);
    for (let i = 0; i < 3; i++) stoot(t + 0.1 + i * 0.05, 0.04, 'bandpass', 2800 + Math.random() * 1400, 9, 0.018);
  }
  // donder (fixer R2): de bliksem die op het dak in de mast slaat, ver weg. Gerommel dat
  // aanrolt, geen klap: licht is sneller dan geluid, dus het komt pas na ±0,35 s
  function donder() {
    if (!ensure()) return; const t = now() + 0.35;
    const n = ctx.createBufferSource(); n.buffer = ruisBuf(); n.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.6;
    lp.frequency.setValueAtTime(280, t); lp.frequency.exponentialRampToValueAtTime(90, t + 2.2);
    const g = ctx.createGain(); g.gain.value = 0;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.3);
    g.gain.linearRampToValueAtTime(0.05, t + 0.65);
    g.gain.linearRampToValueAtTime(0.075, t + 0.95);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 2.4);
    n.connect(lp); lp.connect(g); g.connect(master);
    n.start(t, Math.random() * 0.5); n.stop(t + 2.5);
  }
  // lift-brom (fixer R2): de motor en de kabels van de goederenlift, zolang ze daalt. Ze valt
  // stil samen met de kooi-tl: de stroom hapert en is weg. Bewust geen motor die hoorbaar
  // uitdraait en geen rem: de mechaniek stopt gewoon (een uitlopende motor zou een val
  // suggereren, keuze 3). Een pauze (tab verborgen) zet haar stil, zoals de wacht.
  const BROM = 0.03;
  function liftBrom(aan) {
    if (!aan) {
      if (!bromNodes || !ctx) { bromNodes = null; volgVolume(); return; }
      const { g, os } = bromNodes; const t = now();
      try {
        const v = g.gain.value;
        g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(v, t);
        g.gain.setValueAtTime(0, t + 0.08); g.gain.setValueAtTime(v * 0.6, t + 0.16); g.gain.setValueAtTime(0, t + 0.2);
      } catch (e) {}
      os.forEach(o => { try { o.stop(t + 0.3); } catch (e) {} });
      bromNodes = null;
      volgVolume();
      return;
    }
    if (bromNodes || !ensure()) return;
    const t = now();
    const g = ctx.createGain(); g.gain.value = 0;
    const gm = ctx.createGain(); gm.gain.value = 1;   /* het ritme van de rails: een trage golf */
    g.connect(gm); gm.connect(master);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; lp.Q.value = 0.7; lp.connect(g);
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 49;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 98.5;
    o1.connect(lp); o2.connect(lp);
    const n = ctx.createBufferSource(); n.buffer = ruisBuf(); n.loop = true;   /* de kabels zingen zacht */
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 3;
    const ng = ctx.createGain(); ng.gain.value = 0.3;
    n.connect(bp); bp.connect(ng); ng.connect(g);
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 1.6;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.2; lfo.connect(lfoG); lfoG.connect(gm.gain);
    [o1, o2, n, lfo].forEach(o => o.start(t));
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pauzeNu ? 0 : BROM, t + 0.5);
    bromNodes = { g, os: [o1, o2, n, lfo] };
    volgVolume();
  }

  /* ======================================================================
     R3 · HET KANTOOR ALS FILM (sep 2026) — de klank van scènes 0-2
     Kort en droog, 198X: bimetaal, blik, rubber, bakeliet, een ballast die zoemt.
     · Eenmalige klanken zwijgen (false) als de context niet kan klinken — geen stapel
       oude klanken die bij de eerste tik tegelijk losbarsten. Midden in een gebaar mag
       het wel: dan hervat de context net.
     · Continue lagen (regen, kantoorzoem, de klok van de maat, én sinds R3 ook de
       CRT-brom, de drone en de ruis) lopen via lusIn → lusSnit → lusPauze → master:
       pauzeer() zet ze stil, de scheur laat ze haperen, de harde snit knipt ze een tel.
     · Het licht heeft een geluid: elke tl die aangaat maakt de zoem voller (en drukt de
       regen buiten wat weg), elke glimlach maakt hem feller, elke rij die dooft stiller.
       Wie hervat in een verlicht kantoor zonder de tl-klanken opnieuw te spelen, geeft
       kantoor(true, { lampen: n }) mee.
     ====================================================================== */
  let lusIn = null, lusSnit = null, lusPauze = null;
  let regenNodes = null, kantoorNodes = null, maatSt = null;
  let warmG = null, warmTot = 0, glimLaatst = null;
  const tl = { spot: false, banken: new Set(), karel: false, feller: 0 };

  /* een nieuwe context: alles wat aan de oude hing is waardeloos */
  function vergeetR3() {
    lusIn = null; lusSnit = null; lusPauze = null;
    regenNodes = null; kantoorNodes = null; warmG = null;
    if (maatSt) { if (maatSt.timer) clearInterval(maatSt.timer); maatSt = null; }
  }
  /* de ambient-keten (lui, per context) */
  function lusBus() {
    if (!ctx || !master) return null;
    if (!lusIn) {
      lusPauze = ctx.createGain(); lusPauze.gain.value = pauzeNu ? 0 : 1; lusPauze.connect(master);
      lusSnit = ctx.createGain(); lusSnit.gain.value = 1; lusSnit.connect(lusPauze);
      lusIn = ctx.createGain(); lusIn.gain.value = 1; lusIn.connect(lusSnit);
    }
    return lusIn;
  }
  function gebaarNu() { try { const u = navigator.userActivation; return !!(u && u.isActive); } catch (e) { return false; } }
  /* voor eenmalige klanken: de context als hij nu kan klinken, anders null */
  function speelt() {
    const c = ensure();
    if (!c) return null;
    if (c.state === 'running') return c;
    if (c.state === 'suspended' && gebaarNu()) {
      try { const K = window.Klank; if (K && typeof K.hervat === 'function') K.hervat(); else c.resume(); } catch (e) {}
      return c;
    }
    return null;
  }
  /* één toon: korte aanzet, exponentiële uitklank, optioneel glijdend */
  function piep(t, f, dur, vorm, vol, naar, glij, aanzet) {
    const o = ctx.createOscillator(); o.type = vorm || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (glij) o.frequency.exponentialRampToValueAtTime(Math.max(20, glij), t + dur);
    const g = ctx.createGain(); g.gain.value = 0;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + (aanzet || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g); g.connect(naar || master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  /* een metalen tinkje: inharmonische partialen [verhouding, sterkte, duur] */
  function tink(t, f, vol, dur, part) {
    (part || [[1, 1, 1], [2.76, 0.4, 0.5], [5.4, 0.2, 0.3]]).forEach(p => piep(t, f * p[0], dur * p[2], 'sine', vol * p[1], null, null, 0.002));
  }
  /* een stukje tl-brom: 100 Hz (het net, 2 × 50 Hz) door de ballast. o.van/o.zak: de
     filterband (en waar ze heen zakt), o.flak: flikkeren (Hz), o.hard: dood afgeknipt */
  function tlBrom(t, dur, vol, o) {
    o = o || {};
    const n = t + dur;
    const s = ctx.createOscillator(); s.type = 'sawtooth'; s.frequency.value = 100;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(o.van || 620, t);
    if (o.zak) bp.frequency.exponentialRampToValueAtTime(o.zak, n);
    const g = ctx.createGain(); g.gain.value = 0;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + (o.aanzet || 0.006));
    if (o.hard) g.gain.setValueAtTime(0, n);
    else g.gain.setTargetAtTime(0, t + dur * 0.35, dur * 0.22);
    s.connect(bp); bp.connect(g);
    const bronnen = [s];
    let uit = g;
    if (o.flak) {
      const gm = ctx.createGain(); gm.gain.value = 0.5;
      const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = o.flak;
      const lg = ctx.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(gm.gain);
      g.connect(gm); uit = gm; bronnen.push(lfo);
    }
    uit.connect(master);
    const eind = o.hard ? n + 0.01 : n + dur * 1.3 + 0.1;
    bronnen.forEach(x => { x.start(t); x.stop(eind); });
  }
  /* de ambient-keten een tel dichtknijpen (harde snit), daarna terug */
  function snit(t, hou, terug) {
    if (!lusBus()) return;
    const p = lusSnit.gain;
    try {
      p.cancelScheduledValues(t); p.setValueAtTime(p.value, t);
      p.linearRampToValueAtTime(0, t + 0.005); p.setValueAtTime(0, t + hou);
      p.linearRampToValueAtTime(1, t + hou + terug);
    } catch (e) {}
  }
  /* de warmte (warm()) afknippen, als ze nog klinkt */
  function knipWarm(t) {
    if (!warmG || t >= warmTot) { warmG = null; return; }
    const g = warmG.gain; warmG = null;
    try { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + 0.012); } catch (e) {}
  }

  /* —— het licht en zijn zoem ——
     lichtFactor 0..1: hoeveel gekocht licht er brandt (de spot boven de prikklok telt
     één, elke bank één, Karels uitgeklakte buis een halve min; vol vanaf zes) */
  function tlReset() { tl.spot = false; tl.banken.clear(); tl.karel = false; tl.feller = 0; }
  function zetLampen(n) {
    n = Math.max(0, Math.min(12, Math.round(Number(n) || 0)));
    tlReset(); tl.spot = n > 0;
    for (let i = 0; i < n - 1; i++) tl.banken.add(i);
  }
  function lichtFactor() {
    const n = (tl.spot ? 1 : 0) + tl.banken.size - (tl.karel ? 0.5 : 0);
    return Math.max(0, Math.min(1, n / 6));
  }
  const ZOEM = 0.009, LUCHT = 0.014, REGEN = 0.14;   /* A-gewogen ±10 dB onder de wachtmuziek */
  function zoemDoel() { const f = lichtFactor(); return f <= 0 ? 0 : ZOEM * (0.3 + 0.7 * f) * (1 + 0.05 * tl.feller); }
  function regenDoel() { return REGEN * (1 - 0.45 * lichtFactor()); }   /* het licht drukt de wereld buiten weg */
  function zoemBij() {
    if (!ctx) return;
    const t = now();
    if (kantoorNodes) {
      const k = kantoorNodes;
      try {
        k.zg.gain.setTargetAtTime(zoemDoel(), t, 0.22);
        k.body.frequency.setTargetAtTime(240 * (1 + 0.07 * tl.feller), t, 0.2);
        k.sg.gain.setTargetAtTime(0.09 * (1 + 0.14 * tl.feller), t, 0.2);
      } catch (e) {}
    }
    if (regenNodes) { try { regenNodes.g.gain.setTargetAtTime(regenDoel(), t, 0.5); } catch (e) {} }
  }

  // tl-starter: de bimetaalstarter tikt (twee contacten vlak na elkaar) en de buis
  // probeert het één flits lang — tik… tik…
  function tlStarter() {
    if (!speelt()) return false; const t = now();
    const j = 0.9 + Math.random() * 0.2;
    stoot(t, 0.006, 'highpass', 4200, 0.7, 0.08);
    stoot(t + 0.003, 0.018, 'bandpass', 2300 * j, 6, 0.07);
    stoot(t + 0.021, 0.01, 'bandpass', 3100 * j, 5, 0.035);
    tlBrom(t + 0.012, 0.05 + Math.random() * 0.03, 0.03, { hard: true, van: 900 });
    return true;
  }
  // tl-aan: de TING — de buis vat vlam. Het laatste starter-tikje, de reflector die net
  // niet zuiver meezingt, de ballast die 'donk' zegt, en de brom die flikkert, opbloeit en
  // overgaat in de kantoorzoem
  function tlAan() {
    if (!speelt()) { tl.spot = true; zoemBij(); return false; }
    const t = now();
    stoot(t, 0.008, 'highpass', 4500, 0.7, 0.09);
    tink(t + 0.004, 1760, 0.1, 1.4, [[1, 1, 1], [1.503, 0.35, 0.7], [2.76, 0.3, 0.45], [5.4, 0.12, 0.2]]);
    piep(t + 0.004, 118, 0.14, 'sine', 0.1, null, 70);
    tlBrom(t + 0.01, 0.15, 0.045, { van: 1600, flak: 24, hard: true });
    tlBrom(t + 0.15, 1.5, 0.05, { van: 1300, zak: 380, aanzet: 0.04 });
    tl.spot = true; zoemBij();
    return true;
  }
  /* doorspoelen vuurt soms een hele reeks in één beeld: van dezelfde klank binnen 40 ms klinkt
     alleen de eerste (geen klakkenstapel), maar het licht telt ze allemaal */
  const laatstGespeeld = {};
  function opEen(naam) {
    const t = now(), v = laatstGespeeld[naam];
    if (typeof v === 'number' && t >= v && t - v < 0.04) return true;
    laatstGespeeld[naam] = t;
    return false;
  }
  /* halve tonen per rij: elke bank klinkt net anders (modulo: elke rij heeft een toon) */
  const RIJ_TOON = [0, 3, -2, 5, 1, -3, 4, -1];
  function rijK(rij) {
    const r = Math.max(0, Math.floor(Number(rij) || 0));
    return { r, k: Math.pow(2, RIJ_TOON[r % RIJ_TOON.length] / 12) };
  }
  // tl-bank: een rij klakt aan (de tl-golf) — het relais in de verdeelkast, de buizen die
  // vlam vatten, een tinkje. arg = rijnummer 0..n
  function tlBank(rij) {
    const { r, k } = rijK(rij);
    tl.banken.add(r);
    if (!speelt()) { zoemBij(); return false; }
    const t = now();
    if (opEen('tlBank')) { zoemBij(); return true; }
    stoot(t, 0.006, 'highpass', 3800, 0.7, 0.09);
    stoot(t + 0.002, 0.045, 'bandpass', 1250 * k, 3, 0.08);
    piep(t, 150 * k, 0.09, 'sine', 0.12, null, 70 * k, 0.003);
    tlBrom(t + 0.025, 0.1, 0.03, { van: 1400 * k, flak: 21, hard: true });
    tlBrom(t + 0.12, 0.5, 0.025, { van: 900 * k, zak: 400, aanzet: 0.03 });
    tink(t + 0.03, 2093 * k, 0.03, 0.5);
    zoemBij();
    return true;
  }
  // prikklok: KA-TSJONK. KA: de kaart zakt in de gleuf en het mechaniek grijpt (een ratel
  // en een klop). TSJONK: de drukhamer slaat — dezelfde dreun als de ontslagstempel — en
  // de blikken kast trilt na. Dan schuift de kaart terug.
  function prikklok() {
    if (!speelt()) return false; const t = now();
    stoot(t, 0.03, 'bandpass', 950, 2, 0.12);
    for (let i = 0; i < 4; i++) stoot(t + 0.012 + i * 0.013, 0.01, 'bandpass', 2500 + i * 180, 7, 0.05);
    piep(t, 190, 0.07, 'sine', 0.12, null, 110, 0.003);
    const h = t + 0.15;
    stoot(h, 0.09, 'highpass', 2600, 0.7, 0.13);
    dreun(h, 0.42);
    tink(h + 0.004, 587, 0.045, 0.45, [[1, 1, 1], [1.5, 0.55, 0.8], [2.38, 0.3, 0.5]]);
    stoot(h + 0.33, 0.1, 'bandpass', 1700, 1.2, 0.025);
    return true;
  }
  /* een belletje: grondtoon + octaaf. vies (0..1): het octaaf net ernaast, een
     inharmonische klepel, een FM-rasp in de aanslag en een toon die net te laag begint */
  function belletje(t, f, dur, vol, vies) {
    const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * (vies ? 2.013 : 2);
    const g2 = ctx.createGain(); g2.gain.value = 0.3; o2.connect(g2); g2.connect(g);
    o1.connect(g);
    const os = [o1, o2];
    if (vies) {
      const o3 = ctx.createOscillator(); o3.type = 'sine'; o3.frequency.value = f * 2.76;
      const g3 = ctx.createGain(); g3.gain.value = 0.3 * vies; g3.gain.setValueAtTime(0.3 * vies, t); g3.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.5);
      o3.connect(g3); g3.connect(g);
      const m = ctx.createOscillator(); m.frequency.value = f * 1.41;
      const mg = ctx.createGain(); mg.gain.value = f * 0.5 * vies; mg.gain.setValueAtTime(f * 0.5 * vies, t); mg.gain.exponentialRampToValueAtTime(1, t + 0.06);
      m.connect(mg); mg.connect(o1.frequency);
      o1.detune.setValueAtTime(-22 * vies, t); o1.detune.linearRampToValueAtTime(-6 * vies, t + dur);
      os.push(o3, m);
    }
    os.forEach(o => { o.start(t); o.stop(t + dur + 0.05); });
  }
  /* de majeurladder omhoog: bij 5 (het quotum) staat hij op de kwint — de scheur valt
     vóór hij kan oplossen. Bijgesteld naar 8 zou hij het octaaf halen. */
  const GLIM_TRAP = [0, 2, 4, 5, 7, 9, 11, 12];
  // glimlach: het d-ding — een vies belletje van voldoening dat per tik stijgt (n = 1..8).
  // variant 'opDeTel' (of true) klinkt zuiver: wie op de maat glimlacht, wordt beloond.
  // Zonder variant beslist de maat zelf (als ze loopt); anders is hij vies. De tl zoemt feller.
  function glimlach(n, variant) {
    const i = Math.max(1, Math.min(8, Math.round(Number(n) || 1))) - 1;
    tl.feller = i + 1;
    if (!speelt()) { zoemBij(); return false; }
    const t = now();
    let zuiver;
    if (variant === true || /^(opdetel|zuiver|tel)$/i.test(String(variant))) zuiver = true;
    else if (variant === false || /^(naast|vals|vies)$/i.test(String(variant))) zuiver = false;
    else { const m = maatSt && maatSt.bron === 'maat' ? tel() : null; zuiver = !!(m && m.opDeTel); }   /* met de regie beslist de regie */
    const f = 1046.5 * Math.pow(2, GLIM_TRAP[i] / 12);
    const vies = zuiver ? 0 : 0.6 + i * 0.06;
    belletje(t, f * 0.749, 0.07, 0.06, vies * 0.6);            // d
    belletje(t + 0.075, f, zuiver ? 0.6 : 0.42, 0.14, vies);     // ding
    if (zuiver) piep(t + 0.075, f * 4, 0.35, 'sine', 0.012);    // een glans erbovenop
    glimLaatst = zuiver ? 'zuiver' : 'vies';
    zoemBij();
    return true;
  }
  // naald: de VU-naald verspringt — een tikje tegen de schaal en een veertje dat natrilt.
  // arg = de nieuwe stand in % (hoger klinkt een tikje hoger)
  function naald(pct) {
    if (!speelt()) return false; const t = now();
    const p = Math.max(0, Math.min(120, Number(pct) || 78)) / 100;
    const f = 620 + p * 260;
    stoot(t, 0.006, 'bandpass', 3000 + p * 900, 5, 0.05);
    piep(t + 0.002, f, 0.06, 'triangle', 0.018, null, f * 0.96, 0.002);
    stoot(t + 0.028, 0.004, 'highpass', 5200, 0.7, 0.018);
    return true;
  }
  // scheur (1,2 s): het beeld verliest zijn verticale houvast. Tv-ruis die hapert, de brom
  // van een rollend beeld, twee dunne tonen die schuren (de kleuren schuiven uit elkaar),
  // en op de twee frames van de kaartplaat breekt de echte wereld door: de 55 Hz-drone van
  // de kaart en één vonk. Dan een harde knip. De ambient hapert mee.
  // arg: het moment (s) van de plaatframes, een getal of een lijst (standaard 0,42 en 0,78)
  function scheur(frames) {
    if (!speelt()) return false; const t = now(), D = 1.2;
    const fr = (Array.isArray(frames) ? frames : typeof frames === 'number' ? [frames] : [0.42, 0.78])
      .map(Number).filter(x => isFinite(x) && x >= 0 && x < D).slice(0, 4);
    const inFrame = x => fr.some(f => x >= t + f - 0.01 && x <= t + f + 0.07);
    // de ruis, hapert in onregelmatige stappen
    const n = ctx.createBufferSource(); n.buffer = ruisBuf(); n.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 450;
    const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 3200; pk.gain.value = 5; pk.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = 0; g.gain.setValueAtTime(0, t);
    n.connect(hp); hp.connect(pk); pk.connect(g); g.connect(master);
    let x = t + 0.02, i = 0;
    g.gain.linearRampToValueAtTime(0.03, x);
    while (x < t + D - 0.02) {
      const v = inFrame(x) ? 0 : (i % 5 === 3 ? 0.004 : 0.012 + Math.random() * 0.028);
      g.gain.setValueAtTime(v, x);
      x += 0.022 + Math.random() * 0.045; i++;
    }
    // het rollende beeld: een brom die zwabbert en op een trage poort hapert
    const r = ctx.createOscillator(); r.type = 'sawtooth';
    r.frequency.setValueAtTime(58, t); r.frequency.linearRampToValueAtTime(41, t + 0.5);
    r.frequency.linearRampToValueAtTime(63, t + 0.9); r.frequency.linearRampToValueAtTime(47, t + D);
    const rl = ctx.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 900;
    const rg = ctx.createGain(); rg.gain.value = 0.014;
    const lfo = ctx.createOscillator(); lfo.type = 'square';
    lfo.frequency.setValueAtTime(7, t); lfo.frequency.linearRampToValueAtTime(3.5, t + D);
    const lg = ctx.createGain(); lg.gain.value = 0.01; lfo.connect(lg); lg.connect(rg.gain);
    r.connect(rl); rl.connect(rg); rg.connect(master);
    // de kleuren schuiven uit elkaar: twee dunne tonen die schuren
    const zg = ctx.createGain(); zg.gain.value = 0; zg.gain.setValueAtTime(0, t); zg.gain.linearRampToValueAtTime(0.006, t + 0.15); zg.connect(master);
    const z1 = ctx.createOscillator(); z1.frequency.value = 3100;
    const z2 = ctx.createOscillator(); z2.frequency.value = 3163;
    z1.connect(zg); z2.connect(zg);
    // alles knipt op hetzelfde sample af
    n.start(t, Math.random() * 0.5);
    [r, lfo, z1, z2].forEach(o => o.start(t));
    [n, r, lfo, z1, z2].forEach(o => o.stop(t + D));
    // de echte wereld, twee frames lang
    fr.forEach(f => {
      const a = t + f;
      const dg = ctx.createGain(); dg.gain.value = 0; dg.gain.setValueAtTime(0, a); dg.gain.linearRampToValueAtTime(0.07, a + 0.004);
      dg.gain.setValueAtTime(0.07, a + 0.058); dg.gain.linearRampToValueAtTime(0, a + 0.064); dg.connect(master);
      [55, 110].forEach((hz, j) => { const o = ctx.createOscillator(); o.frequency.value = hz; const og = ctx.createGain(); og.gain.value = j ? 0.4 : 1; o.connect(og); og.connect(dg); o.start(a); o.stop(a + 0.07); });
      stoot(a + 0.012, 0.035, 'highpass', 3000, 0.7, 0.05);
    });
    // de ambient hapert mee en valt op het einde stil; komt daarna traag terug
    if (lusBus()) {
      const p = lusSnit.gain;
      try {
        p.cancelScheduledValues(t); p.setValueAtTime(p.value, t);
        let y = t + 0.01;
        while (y < t + D) { p.setValueAtTime(Math.random() < 0.3 ? 0 : 0.15 + Math.random() * 0.3, y); y += 0.04 + Math.random() * 0.05; }
        p.setValueAtTime(0, t + D); p.setValueAtTime(0, t + D + 0.15); p.linearRampToValueAtTime(1, t + D + 0.75);
      } catch (e) {}
    }
    return true;
  }
  // gemarkeerd: de harde snit NIET-FACTUREERBAAR. GEMARKEERD. — de warmte wordt afgeknipt,
  // de ruimte valt een tel stil, een droge stempel en een terminalpiep zonder uitklank
  function gemarkeerd() {
    if (!speelt()) return false; const t = now();
    knipWarm(t);
    snit(t, 0.3, 0.25);
    piep(t, 135, 0.07, 'sine', 0.3, null, 70, 0.002);
    stoot(t, 0.015, 'highpass', 3000, 0.7, 0.14);
    stoot(t + 0.004, 0.035, 'bandpass', 1400, 2, 0.08);
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 1318.5;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    const g = ctx.createGain(); g.gain.value = 0;
    g.gain.setValueAtTime(0, t + 0.03); g.gain.linearRampToValueAtTime(0.035, t + 0.033);
    g.gain.setValueAtTime(0.035, t + 0.15); g.gain.linearRampToValueAtTime(0, t + 0.153);
    o.connect(lp); lp.connect(g); g.connect(master); o.start(t + 0.03); o.stop(t + 0.16);
    return true;
  }
  // stempel-zelf: jouw handstempel — rubber en hout op papier op een bureau. Nooit twee
  // keer hetzelfde (een hand), met een klein naveertje als je hem optilt.
  function stempelZelf() {
    if (!speelt()) return false; const t = now();
    const j = () => 0.92 + Math.random() * 0.16;
    piep(t, 150 * j(), 0.2, 'sine', 0.36 * j(), null, 55, 0.003);
    piep(t + 0.002, 330 * j(), 0.07, 'triangle', 0.07, null, 260, 0.002);
    stoot(t, 0.05, 'bandpass', 1100 * j(), 1, 0.11 * j());
    stoot(t + 0.006, 0.08, 'lowpass', 650, 0.7, 0.05);
    stoot(t + 0.13 + Math.random() * 0.03, 0.02, 'bandpass', 1900 * j(), 2, 0.02);
    return true;
  }
  // stempel-machine: kouder. Een motortje dat opspant, een solenoïde die slaat (de dreun
  // van de ontslagstempel, in blik) en een relais dat terugvalt. Altijd exact hetzelfde.
  function stempelMachine() {
    if (!speelt()) return false; const t = now(), s = t + 0.16;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(420, s);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 3;
    const g = ctx.createGain(); g.gain.value = 0; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03, t + 0.03);
    g.gain.linearRampToValueAtTime(0.04, s - 0.005); g.gain.linearRampToValueAtTime(0, s);
    o.connect(bp); bp.connect(g); g.connect(master); o.start(t); o.stop(s + 0.01);
    stoot(s, 0.005, 'highpass', 3000, 0.7, 0.12);
    stoot(s + 0.001, 0.06, 'bandpass', 2400, 10, 0.06);
    dreun(s, 0.42);
    tink(s + 0.002, 1480, 0.03, 0.3, [[1, 1, 1], [1.498, 0.6, 0.8], [2.9, 0.25, 0.4]]);
    stoot(s + 0.17, 0.008, 'bandpass', 2000, 4, 0.05);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.connect(master);
    piep(s + 0.17, 420, 0.1, 'sawtooth', 0.014, lp, 200, 0.004);
    return true;
  }
  // buizenpost: het klepje, de zuiging (fwoep), de koker die wegzoeft met een fluitje en
  // nog even ratelt, en na een tel stilte heel ver weg een plofje: aangekomen in het ARCHIEF
  function buizenpost() {
    if (!speelt()) return false; const t = now();
    stoot(t, 0.02, 'bandpass', 1800, 4, 0.08);
    piep(t, 210, 0.05, 'sine', 0.06, null, 140, 0.002);
    const n = ctx.createBufferSource(); n.buffer = ruisBuf(); n.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(260, t + 0.08); bp.frequency.exponentialRampToValueAtTime(1500, t + 0.44);
    bp.frequency.setValueAtTime(1600, t + 0.46); bp.frequency.exponentialRampToValueAtTime(360, t + 1.05);
    const g = ctx.createGain(); g.gain.value = 0; g.gain.setValueAtTime(0, t + 0.08);
    g.gain.linearRampToValueAtTime(0.09, t + 0.42); g.gain.setValueAtTime(0.1, t + 0.46);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 1.05);
    n.connect(bp); bp.connect(g); g.connect(master);
    n.start(t + 0.08, Math.random() * 0.4); n.stop(t + 1.1);
    piep(t + 0.43, 300, 0.06, 'sine', 0.12, null, 120, 0.003);
    stoot(t + 0.43, 0.04, 'lowpass', 1500, 0.7, 0.07);
    piep(t + 0.46, 1400, 0.55, 'sine', 0.014, null, 620, 0.02);
    for (let i = 0; i < 6; i++) stoot(t + 0.5 + i * 0.07 + Math.random() * 0.02, 0.012, 'bandpass', 2200 + Math.random() * 900, 6, 0.03 * (1 - i / 7));
    const p = t + 1.48;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.connect(master);
    piep(p, 95, 0.14, 'sine', 0.06, lp, 60, 0.004);
    stoot(p, 0.03, 'lowpass', 600, 0.7, 0.02);
    stoot(p + 0.07, 0.012, 'bandpass', 1500, 3, 0.008);
    return true;
  }
  // tl-klak-uit: Karels buis — HARD uit, midden in een woord. De buis laait nog één keer
  // op, de zekering slaat, de zoem van de hele ruimte valt een tel dood, en later tikt de
  // afkoelende buis nog één keer. (Niet tlSterft: dat is de kooi-tl die hapert en opgeeft.)
  function tlKlakUit() {
    if (!speelt()) { tl.karel = true; zoemBij(); return false; }
    const t = now(), k = t + 0.035;
    tlBrom(t, 0.035, 0.05, { hard: true, van: 1200 });
    snit(k, 0.22, 0.8);
    stoot(k, 0.004, 'highpass', 3000, 0.7, 0.22);
    stoot(k + 0.001, 0.035, 'bandpass', 1600, 3, 0.17);
    piep(k, 115, 0.1, 'sine', 0.24, null, 50, 0.002);
    stoot(k + 0.62, 0.008, 'bandpass', 3400, 4, 0.015);
    tl.karel = true; zoemBij();
    return true;
  }
  // tl-dooft: bij de oproep gaan de rijen uit, van achter naar voor — een relais dat
  // terugvalt en de gloed die in de buis ineenzakt (vwoem). arg = de rij
  function tlDooft(rij) {
    const { r, k } = rijK(rij);
    if (tl.banken.has(r)) tl.banken.delete(r);
    else if (tl.banken.size) tl.banken.delete(tl.banken.values().next().value);
    zoemBij();
    if (!speelt()) return false;
    const t = now();
    if (opEen('tlDooft')) return true;
    stoot(t, 0.04, 'bandpass', 780 * k, 2, 0.07);
    piep(t, 95 * k, 0.09, 'sine', 0.09, null, 50, 0.003);
    tlBrom(t + 0.01, 0.4, 0.03, { van: 700 * k, zak: 160, aanzet: 0.005 });
    return true;
  }
  /* de lift omhoog: de bel stijgt per verdieping (in de val zakt dezelfde bel mee met de wacht) */
  const LIFT_TOON = { 2: 0, 3: 1, 4: 2, dak: 3 };
  // lift-ding (alleen als de lift omhoog gebouwd wordt): de liftbel op de toon van de
  // verdieping, de kooi over de railnaad, en op het DAK de aankomst (ding-dong)
  function liftDing(v) {
    if (!speelt()) return false; const t = now();
    let s = String(v == null ? '' : v).toLowerCase();
    if (s === '5' || s === 'd') s = 'dak';
    const toon = Object.prototype.hasOwnProperty.call(LIFT_TOON, s) ? LIFT_TOON[s] : 0;
    bel(1318.5 * Math.pow(2, toon / 12), t, 0.5, 0.06);
    piep(t + 0.05, 90, 0.15, 'sine', 0.1, null, 55, 0.01);
    for (let i = 0; i < 3; i++) stoot(t + 0.06 + i * 0.035 + Math.random() * 0.01, 0.03, 'bandpass', 2600 + Math.random() * 1400, 5, 0.025);
    if (s === 'dak') bel(1046.5 * Math.pow(2, toon / 12), t + 0.32, 0.8, 0.06);
    return true;
  }
  // toets: een zachte klik op een kantoorknop (beige bakeliet)
  function toets() {
    if (!speelt()) return false; const t = now();
    stoot(t, 0.006, 'highpass', 2800, 0.7, 0.05);
    piep(t, 1800 + Math.random() * 200, 0.014, 'triangle', 0.018, null, null, 0.001);
    stoot(t + 0.028, 0.01, 'bandpass', 1200, 2, 0.02);
    return true;
  }
  // degauss (extra, buiten de interface): de CRT ontmagnetiseert — BWOMM, een klap van
  // 50 Hz die wiebelend uitdooft, en het schaduwmasker dat even zingt. Voor scène 1.
  function degauss() {
    if (!speelt()) return false; const t = now();
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 50;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(700, t); lp.frequency.exponentialRampToValueAtTime(140, t + 0.9);
    const g = ctx.createGain(); g.gain.value = 0; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.14, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 1.0);
    const w = ctx.createGain(); w.gain.value = 0.65;
    const lfo = ctx.createOscillator(); lfo.frequency.setValueAtTime(9, t); lfo.frequency.exponentialRampToValueAtTime(2.5, t + 1);
    const lg = ctx.createGain(); lg.gain.value = 0.35; lfo.connect(lg); lg.connect(w.gain);
    o.connect(lp); lp.connect(g); g.connect(w); w.connect(master);
    [o, lfo].forEach(x => { x.start(t); x.stop(t + 1.05); });
    stoot(t, 0.01, 'bandpass', 900, 2, 0.08);
    tink(t + 0.01, 3100, 0.012, 0.35, [[1, 1, 1], [1.52, 0.6, 0.7]]);
    return true;
  }

  /* —— de lussen —— */
  /* de druppels op het glas: 6,37 s, vooraf berekend en naadloos in een lus (modulo) */
  let druppelB = null, druppelCtx = null;
  function druppelBuf() {
    if (druppelB && druppelCtx === ctx) return druppelB;
    const sr = ctx.sampleRate, len = Math.floor(sr * 6.37);
    const b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    const n = Math.floor(6.37 * 34);   /* tikjes op het glas */
    for (let k = 0; k < n; k++) {
      const i0 = Math.floor(Math.random() * len);
      const f = 2400 + Math.random() * 3600, tau = 0.002 + Math.random() * 0.006;
      const a = Math.pow(Math.random(), 2.2) * 0.5 + 0.03;
      const m = Math.floor(sr * tau * 6), w = 2 * Math.PI * f / sr, ph = Math.random() * 6.28;
      for (let i = 0; i < m; i++) d[(i0 + i) % len] += a * Math.exp(-i / (sr * tau)) * (0.6 * Math.sin(w * i + ph) + 0.4 * (Math.random() * 2 - 1));
    }
    const nd = Math.max(3, Math.floor(6.37 * 0.9));   /* af en toe een dikke druppel van het kozijn (bloep) */
    for (let k = 0; k < nd; k++) {
      const i0 = Math.floor(Math.random() * len);
      const f0 = 900 + Math.random() * 700, tau = 0.012 + Math.random() * 0.01;
      const m = Math.floor(sr * tau * 6);
      let ph = 0;
      for (let i = 0; i < m; i++) { ph += 2 * Math.PI * f0 * (1 - 0.25 * i / m) / sr; d[(i0 + i) % len] += 0.35 * Math.exp(-i / (sr * tau)) * Math.sin(ph); }
    }
    druppelB = b; druppelCtx = ctx; return b;
  }
  function lusUit(nodes, snel) {
    const t = now(), tc = snel ? 0.02 : 0.25;
    try { nodes.g.gain.cancelScheduledValues(t); nodes.g.gain.setValueAtTime(nodes.g.gain.value, t); nodes.g.gain.setTargetAtTime(0, t, tc); } catch (e) {}
    nodes.os.forEach(o => { try { o.stop(t + tc * 5 + 0.05); } catch (e) {} });
  }
  // regen: regen op glas, heel zacht — een gesis dat in vlagen aanzwelt, ver gerommel en
  // tikjes op de ruit, met af en toe een druppel van het kozijn. Het licht drukt haar weg.
  function regen(aan, snel) {
    if (!aan) {
      if (regenNodes && ctx) lusUit(regenNodes, snel);
      regenNodes = null; volgVolume(); return true;
    }
    if (regenNodes) return true;
    if (!ensure() || !lusBus()) return false;
    const t = now();
    const g = ctx.createGain(); g.gain.value = 0; g.connect(lusIn);
    const n1 = ctx.createBufferSource(); n1.buffer = ruisBuf(); n1.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.35;
    const g1 = ctx.createGain(); g1.gain.value = 0.02;
    n1.connect(bp); bp.connect(g1); g1.connect(g);
    const n2 = ctx.createBufferSource(); n2.buffer = ruisBuf(); n2.loop = true; n2.playbackRate.value = 0.73;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.5;
    const g2 = ctx.createGain(); g2.gain.value = 0.03;
    n2.connect(lp); lp.connect(g2); g2.connect(g);
    const dr = ctx.createBufferSource(); dr.buffer = druppelBuf(); dr.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
    const g3 = ctx.createGain(); g3.gain.value = 0.05;
    dr.connect(hp); hp.connect(g3); g3.connect(g);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;   /* de vlagen */
    const lg = ctx.createGain(); lg.gain.value = 0.007; lfo.connect(lg); lg.connect(g1.gain);
    n1.start(t, Math.random() * 0.9); n2.start(t, Math.random() * 0.9); dr.start(t, Math.random() * 6); lfo.start(t);
    g.gain.setTargetAtTime(regenDoel(), t, 0.6);
    regenNodes = { g, os: [n1, n2, dr, lfo] };
    volgVolume();
    return true;
  }
  // kantoor: de kantoorzoem onder scènes 0-2 — de ventilatie (altijd) en de tl-brom van twee
  // ballasten net naast elkaar (een trage zweving), zo vol als er licht brandt.
  // opts.lampen: de lichtstand zetten zonder de tl-klanken (hervatten in een verlicht kantoor)
  function kantoor(aan, opts, snel) {
    if (opts && typeof opts.lampen === 'number') { zetLampen(opts.lampen); zoemBij(); }
    if (!aan) {
      if (kantoorNodes && ctx) lusUit(kantoorNodes, snel);
      if (maatSt && maatSt.bron === 'kantoor') maat(false);
      kantoorNodes = null; tlReset(); volgVolume(); return true;
    }
    /* de maat van de regie hoort bij het bureau, en dat staat altijd in een verlicht kantoor:
       wie daar rechtstreeks hervat (herlaad, hoofdstuk herbeleven), heeft de tl-golf niet
       gehoord, dus zonder lichtstand = alle lampen aan */
    if (opts && Number(opts.tel) > 0 && typeof opts.lampen !== 'number' && lichtFactor() === 0) zetLampen(6);
    const metTel = () => { if (opts && Number(opts.tel) > 0) maat(true, { periode: Number(opts.tel) / 1000, bron: 'kantoor', nu: true }); };
    if (kantoorNodes) { metTel(); return true; }
    if (!ensure() || !lusBus()) return false;
    const t = now();
    const g = ctx.createGain(); g.gain.value = 0; g.connect(lusIn);
    const n = ctx.createBufferSource(); n.buffer = ruisBuf(); n.loop = true; n.playbackRate.value = 0.61;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240; lp.Q.value = 0.6;
    const gl = ctx.createGain(); gl.gain.value = LUCHT;
    n.connect(lp); lp.connect(gl); gl.connect(g);
    const zg = ctx.createGain(); zg.gain.value = 0;   /* het licht */
    const pg = ctx.createGain(); pg.gain.value = 1;   /* de puls van de maat */
    zg.connect(pg); pg.connect(g);
    const s1 = ctx.createOscillator(); s1.type = 'sawtooth'; s1.frequency.value = 100;
    const s2 = ctx.createOscillator(); s2.type = 'sawtooth'; s2.frequency.value = 100.4;
    const body = ctx.createBiquadFilter(); body.type = 'bandpass'; body.frequency.value = 240; body.Q.value = 0.8;
    const sz = ctx.createBiquadFilter(); sz.type = 'highpass'; sz.frequency.value = 1800;
    const sg = ctx.createGain(); sg.gain.value = 0.09;
    s1.connect(body); s2.connect(body); body.connect(zg);
    s1.connect(sz); s2.connect(sz); sz.connect(sg); sg.connect(zg);
    n.start(t, Math.random() * 0.9); s1.start(t); s2.start(t);
    g.gain.setTargetAtTime(1, t, 0.3);
    kantoorNodes = { g, zg, pg, body, sg, os: [n, s1, s2] };
    zoemBij(); volgVolume(); metTel();
    return true;
  }
  /* de maat: de wandklok van de kantoortuin (tik… tak…) die te snel loopt — tijd is geld — en
     de tl die op elke tel aanzwelt. Twee manieren om haar te starten:
     · kantoor(true, { tel: ms }): de regie (proloog.js) pulseert naald, tl en knop op haar
       eigen speelklok vanaf DIT moment; de klok tikt hoorbaar op precies die tel (de
       uitvoerlatentie eraf, dus je hoort de tik als je de puls ziet) en schuift mee met elke
       pauze, want de speelklok staat dan ook stil. De regie beslist zelf wat 'op de tel' is.
     · maat(true, opts): los, met tel() als bron voor de regie; dan beslist de maat ook of een
       glimlach zonder variant zuiver klinkt.
     Zodra de wachtmuziek loopt (de oproep), zwijgt de klok: twee tempo's door elkaar is rommel. */
  const MAAT = 0.8;
  function klokTik(t, k) {
    const M = maatSt;
    if (!M || !M.g) return;
    try { const W = window.Klank && window.Klank.wacht; if (W && W.stand && W.stand.actief) return; } catch (e) {}
    const tak = k % 2 === 1;
    stoot(t, 0.012, 'bandpass', tak ? 1900 : 2500, 5, 0.075, M.g);
    piep(t, tak ? 1050 : 1250, 0.025, 'triangle', 0.03, M.g, null, 0.001);
    piep(t, tak ? 520 : 610, 0.03, 'sine', 0.02, M.g, null, 0.001);   /* het houten kastje */
    if (kantoorNodes) {
      const p = kantoorNodes.pg.gain;
      try { p.setValueAtTime(1, t); p.linearRampToValueAtTime(1.45, t + 0.02); p.setTargetAtTime(1, t + 0.03, 0.09); } catch (e) {}
    }
  }
  function planMaat() {
    const M = maatSt;
    if (!M || !M.audio || !ctx || M.pauzeT !== null) return;
    const nu = ctx.currentTime;
    if (M.t0 + M.k * M.periode < nu - 0.2) M.k = Math.ceil((nu - M.t0) / M.periode);   /* na een hapering niets inhalen */
    while (M.t0 + M.k * M.periode < nu + 0.35) { klokTik(M.t0 + M.k * M.periode, M.k); M.k++; }
  }
  /* de pauze: de speelklok van de regie staat stil, dus schuift de maat evenveel op. Wat al
     vooruit gepland stond op het oude rooster, zwijgt tot de eerste tel van het nieuwe. */
  function maatPauze(aan) {
    const M = maatSt;
    if (!M || !M.audio || !ctx) return;
    const nu = ctx.currentTime;
    if (aan) { if (M.pauzeT === null) M.pauzeT = nu; return; }
    if (M.pauzeT === null) return;
    M.t0 += nu - M.pauzeT; M.pauzeT = null;
    M.k = Math.max(0, Math.ceil((nu + 0.02 - M.t0) / M.periode));
    try { const g = M.g.gain; g.cancelScheduledValues(nu); g.setValueAtTime(0, nu); g.setValueAtTime(1, Math.max(nu, M.t0 + M.k * M.periode - 0.005)); } catch (e) {}
    planMaat();
  }
  // maat(aan, { periode = 0,8 s, venster = 110 ms }): true als de klok hoorbaar tikt. Zonder
  // klinkende context loopt de maat stil op de wandklok, zodat tel() blijft werken.
  // (intern: opts.bron 'kantoor' + opts.nu = het rooster begint NU, zoals de speelklok van de regie)
  function maat(aan, opts) {
    if (!aan) {
      if (maatSt) {
        if (maatSt.timer) clearInterval(maatSt.timer);
        const g = maatSt.g; if (g) setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 800);
        maatSt = null;
      }
      return true;
    }
    opts = opts || {};
    const periode = Math.max(0.35, Math.min(1.6, Number(opts.periode) || MAAT));
    const venster = Math.max(40, Math.min(250, Number(opts.venster) || 110));
    const bron = opts.bron === 'kantoor' ? 'kantoor' : 'maat';
    if (maatSt) {
      maatSt.venster = venster;
      if (!opts.nu && maatSt.bron === bron && Math.abs(maatSt.periode - periode) < 1e-6) return maatSt.audio;
      maat(false);
    }
    const c = ensure();
    const audio = !!(c && c.state === 'running' && lusBus());
    const lat = audio ? (c.outputLatency || c.baseLatency || 0) : 0;
    /* los: de eerste tel over 0,1 s. Met de regie: de tel die je NU ziet, hoor je ook nu */
    const t0 = audio ? (opts.nu ? c.currentTime - lat : c.currentTime + 0.1) : performance.now() / 1000 + (opts.nu ? 0 : 0.1);
    maatSt = { periode, venster, t0, audio, bron, k: 0, timer: null, pauzeT: null, g: null };
    if (audio) {
      maatSt.g = ctx.createGain(); maatSt.g.gain.value = 1; maatSt.g.connect(lusIn);
      if (pauzeNu) maatSt.pauzeT = c.currentTime;   /* gestart in een pauze: het rooster wacht */
      planMaat(); maatSt.timer = setInterval(planMaat, 90);
    }
    return audio;
  }
  // tel(): waar staan we in de maat, zoals je hem HOORT (de uitvoerlatentie eraf)?
  // { periode, fase 0..1, tel, afstand (ms tot de dichtste tel, − = ervoor), opDeTel, klinkt }
  // of null als de maat niet loopt
  function tel() {
    const M = maatSt;
    if (!M) return null;
    let nu;
    if (M.audio && ctx) nu = (M.pauzeT !== null ? M.pauzeT : ctx.currentTime) - (ctx.outputLatency || ctx.baseLatency || 0);
    else nu = performance.now() / 1000;
    const x = (nu - M.t0) / M.periode, n = Math.round(x);
    const afstand = Math.round((x - n) * M.periode * 1000);
    return { periode: M.periode, fase: x - Math.floor(x), tel: n, afstand, opDeTel: Math.abs(afstand) <= M.venster, klinkt: M.audio };
  }

  /* ---------- levenscyclus (aangestuurd door proloog.js) ---------- */
  /* op een gebruikersgebaar: het spel zijn audio laten starten/hervatten */
  function unlock() {
    const K = window.Klank;
    if (K) {
      try { if (typeof K.init === 'function') K.init(); } catch (e) {}
      try { if (typeof K.hervat === 'function') K.hervat(); } catch (e) {}
    }
    ensure();
  }
  /* pauze (tab verborgen / draai-blok): de hartslag houdt zijn adem in, de lift-brom zwijgt,
     en (R3) de hele ambient-keten zwijgt: regen, kantoorzoem, de klok, de CRT-brom, de drone */
  function pauzeer(aan) {
    aan = !!aan;
    if (aan !== pauzeNu) {
      pauzeNu = aan;
      if (bromNodes && ctx) { try { const g = bromNodes.g.gain, t = now(); g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.setTargetAtTime(aan ? 0 : BROM, t, 0.05); } catch (e) {} }
      if (lusPauze && ctx) { try { const g = lusPauze.gain, t = now(); g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.setTargetAtTime(aan ? 0 : 1, t, 0.05); } catch (e) {} }
      maatPauze(aan);
    }
    if (aan === heartPauze) return;
    heartPauze = aan;
    if (aan) { if (heartTimer) { clearInterval(heartTimer); heartTimer = -1; } }
    else if (heartTimer === -1) { heartTimer = null; heartStart(heartRate); }
  }
  /* alles uit (Proloog.stop) — ook de wachtmuziek, als ze nog liep (herbeleven dat
     halverwege stopt, een skip): de wacht mag de proloog nooit overleven */
  function stilte() {
    const wasPauze = pauzeNu;
    heartPauze = false; pauzeNu = false;
    heartStop(); humOff(); noiseOff(); droneOff(); liftBrom(false);
    /* R3: de lussen en de maat snel weg, het licht vergeten, de warmte los */
    regen(false, true); kantoor(false, null, true); maat(false);
    tlReset(); warmG = null; glimLaatst = null;
    if (lusIn && wasPauze) {
      /* stop midden in een pauze: de oude keten blijft op 0 (niets flitst nog op) en een
         volgende start krijgt een verse */
      const oud = [lusIn, lusSnit, lusPauze];
      lusIn = null; lusSnit = null; lusPauze = null;
      setTimeout(() => oud.forEach(x => { try { x.disconnect(); } catch (e) {} }), 2000);
    } else if (lusSnit && ctx) {
      try { const p = lusSnit.gain, t = now(); p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.linearRampToValueAtTime(1, t + 0.1); } catch (e) {}
    }
    if (volKlok) { clearInterval(volKlok); volKlok = null; }
    try { const K = window.Klank; if (K && K.wacht && K.wacht.stand.actief) K.wacht.stop(); } catch (e) {}
  }

  return { unlock, humOn, humOff, ding, tik, type, heartStart, heartRateSet, heartStop,
    noiseOn, noiseOff, glitch, stamp, warm, powerOn, droneOn, droneOff, plunge,
    etage, tlSterft, ledUit, vellen, liftknop, kooltje, schaarhek, verbinding, krant,
    grendel, donder, liftBrom,
    /* R3 */
    tlStarter, tlAan, tlBank, prikklok, glimlach, naald, scheur, gemarkeerd, stempelZelf,
    stempelMachine, buizenpost, tlKlakUit, tlDooft, liftDing, toets, degauss,
    regen, kantoor, maat, tel,
    get licht() { return lichtFactor(); },          /* 0..1: hoeveel gekocht licht er brandt */
    get glimlachLaatst() { return glimLaatst; },     /* 'zuiver' | 'vies' | null: de laatste glimlach */
    pauzeer, stilte, get gekoppeld() { return !!koppel(); } };
})();

/* ---------- window.ProloogKlank (R2): de publieke klanklaag van de proloog ----------
   Bovenop Klank.koppel() / Klank.* (js/audio.js). Elke oproep is veilig: ontbreekt
   Klank, is er geen Web Audio of wacht de context nog op een gebaar, dan blijft het
   stil en komt er nooit een fout. Wat terugkomt:
     jingle(opts)      duur in s (0 = niets gespeeld). Standaard { vals: true }: in de
                       proloog is de jingle nooit zuiver (pas in de outro-reboot).
     wachtStart(opts)  true/false · de wachtmuziek op opts.transponeer (standaard 0)
     wachtStop()       true/false · zacht weg (0,6 s)
     transponeer(n)    true/false · n halve tonen, absoluut (-1 … -7); op −7 loopt de
                       lijn vast op de vaste noot
     stilte(ms)        true/false · alles weg, ms stilte, terug (de wacht komt niet terug)
     stilteWeg()       true/false · (fixer R2) een lopende stilte vroegtijdig opheffen
     pauzeer(aan)      true/false · (fixer R2) de wacht en de lift-brom zwijgen en plannen
                       niets zolang de proloog pauzeert (tab verborgen, draai-blok)
     brom(aan)         (fixer R2) de lift-brom: motor en kabels, van vertrek tot de kooi-tl
     sfx(naam, ...args) true/false · de val-geluiden (etage, tl-sterft, led-uit, vellen,
                       liftknop, kooltje, grendel, donder, verbinding, krant — ook onder de
                       gebeurtenisnamen van val.js: hek = grendel, bliksem = donder), de
                       proloogklanken (ding, tik, type, glitch, stamp, warm, powerOn, plunge,
                       beat), R3 (hieronder) of een Klank-sfx. De argumenten gaan door naar
                       de klank. false = onbekend, of (R3) de context kan nu niet klinken.
     stand             { actief, toon, vast, vastKlinkt, pauze } — bv. voor contract.wachtToon

   R3 · het kantoor als film (sfx-namen; sleutels zonder hoofdletters en leestekens):
     tlStarter          één droog starter-tikje met een flits brom (tik… tik…)
     tlAan              de TING: de buis vat vlam, de brom bloeit op (het licht: de spot)
     tlBank(rij)        rij 0..n klakt aan (de tl-golf); elke rij een net andere toon
     prikklok           KA-TSJONK (de dreun van de ontslagstempel)
     glimlach(n, v)     het d-ding, n = 1..8 stijgt de majeurladder op; v = 'opDeTel'|true
                        zuiver, 'naast'|false vies; zonder v beslist de maat (als ze loopt)
     naald(pct)         de VU-naald tikt (pct = nieuwe stand, hoger = iets hoger)
     scheur(frames)     1,2 s V-hold/RGB-split; frames = moment(en) in s van de kaartplaat
                        (standaard [0.42, 0.78]): daar breekt de 55 Hz van de kaart door
     gemarkeerd         de harde snit NIET-FACTUREERBAAR: knipt warm() en de ambient af
     stempelZelf        jouw handstempel (elke keer net anders)
     stempelMachine     de machinestempel (kouder, altijd gelijk)
     buizenpost         aanzuigen, wegzoeven, ratelen, na 1,5 s een verre plof
     tlKlakUit          Karels buis: HARD uit, de zoem valt een tel dood
     tlDooft(rij)       bij de oproep dooft een rij (van achter naar voor)
     liftDing(v)        v = 2 | 3 | 4 | 'DAK': de liftbel stijgt, op het DAK ding-dong
     toets              een zachte klik op een kantoorknop
     degauss            (extra) de CRT ontmagnetiseert: BWOMM
   plus de lussen en de maat:
     regen(aan)         true/false · regen op glas, heel zacht
     kantoor(aan, opts) true/false · de kantoorzoem (ventilatie + tl-brom, zo vol als er
                        licht brandt); opts.lampen = n zet de lichtstand zonder de tl-klanken;
                        opts.tel = ms: de wandklok tikt en de tl zwelt op de tel van de regie,
                        vanaf dit moment, en schuift mee met elke pauze (zwijgt in de wacht)
     maat(aan, opts)    true als de wandklok hoorbaar tikt · opts.periode (0,8 s), venster (110 ms)
     tel()              { periode, fase, tel, afstand (ms), opDeTel, klinkt } of null
   Alles pauzeert mee met pauzeer(aan) en stopt met SLAYLIT_AUDIO.stilte() (Proloog.stop). */
window.ProloogKlank = (function () {
  const A = window.SLAYLIT_AUDIO || null;
  /* het spel wakker maken (Klank.koppel → init) en Klank teruggeven, of null */
  function K() {
    const k = window.Klank;
    if (!k) return null;
    try { if (typeof k.koppel === 'function') k.koppel(); } catch (e) {}
    return k;
  }
  function probeer(f, anders) { try { const r = f(); return r === undefined ? anders : r; } catch (e) { return anders; } }
  const EIGEN = ['etage', 'tlSterft', 'ledUit', 'vellen', 'liftknop', 'kooltje', 'schaarhek', 'grendel', 'donder', 'verbinding', 'krant',
    'ding', 'tik', 'type', 'glitch', 'stamp', 'warm', 'powerOn', 'plunge', 'beat',
    /* R3 */
    'tlStarter', 'tlAan', 'tlBank', 'prikklok', 'glimlach', 'naald', 'scheur', 'gemarkeerd', 'stempelZelf',
    'stempelMachine', 'buizenpost', 'tlKlakUit', 'tlDooft', 'liftDing', 'toets', 'degauss'];
  /* sleutels zonder hoofdletters en leestekens: 'tl-sterft', 'tl_sterft' en 'tlSterft'
     zijn dezelfde; plus synoniemen, en de gebeurtenisnamen van proloog/val.js (hek,
     bliksem, krant, etage, tl, verbinding, vloer, kooltje, knop, baasDrukt) klinken
     rechtstreeks. Het hek staat al dicht (fixer R2): 'hek' is het slot, niet het dichtschuiven. */
  const ALIAS = { liftbel: 'etage', verdieping: 'etage', tl: 'tlSterft', tluit: 'tlSterft', led: 'ledUit',
    papier: 'vellen', factuurvellen: 'vellen', vloer: 'vellen', knop: 'liftknop', baasdrukt: 'liftknop',
    adem: 'kooltje', hek: 'grendel', slot: 'grendel', bliksem: 'donder', onweer: 'donder',
    verbroken: 'verbinding', ophangen: 'verbinding', lichtkrant: 'krant', stempel: 'stamp',
    /* R3: de woorden van het plan ('d-ding', 'KA-TSJONK', 'TING', …) klinken ook */
    starter: 'tlStarter', ting: 'tlAan', tlgolf: 'tlBank', bank: 'tlBank', tlrij: 'tlBank',
    inklokken: 'prikklok', klokin: 'prikklok', katsjonk: 'prikklok', tijdkaart: 'prikklok',
    dding: 'glimlach', glimlachquotum: 'glimlach', vu: 'naald', vumeter: 'naald',
    vhold: 'scheur', rgbsplit: 'scheur', systeemruis: 'scheur',
    nietfactureerbaar: 'gemarkeerd', snit: 'gemarkeerd',
    handstempel: 'stempelZelf', zelfstempel: 'stempelZelf', afstempelen: 'stempelZelf', zelfgestempeld: 'stempelZelf',
    machinestempel: 'stempelMachine', karel: 'tlKlakUit', klakuit: 'tlKlakUit',
    dooft: 'tlDooft', liftomhoog: 'liftDing', kantoorknop: 'toets', crt: 'degauss' };
  EIGEN.forEach(n => { ALIAS[n.toLowerCase()] = n; });
  const eigenVan = sleutel => Object.prototype.hasOwnProperty.call(ALIAS, sleutel) ? ALIAS[sleutel] : null;
  function sfx(naam, ...args) {
    if (typeof naam !== 'string' || !naam) return false;
    const eigen = eigenVan(naam.toLowerCase().replace(/[^a-z]/g, ''));
    if (eigen && A && typeof A[eigen] === 'function') { K(); return probeer(() => A[eigen](...args) !== false, false); }
    if (naam in Object.prototype) return false;   /* 'constructor', 'toString', … zijn geen klanken */
    const k = K();
    if (!k || typeof k.sfx !== 'function') return false;
    return probeer(() => k.sfx(naam) === true, false);
  }
  /* een lus aan/uit op SLAYLIT_AUDIO, veilig */
  function lus(naam, aan, opts) {
    if (!A || typeof A[naam] !== 'function') return false;
    if (aan) K();
    return probeer(() => A[naam](!!aan, opts) === true, false);
  }
  const LEEG = { actief: false, toon: 0, vast: false, vastKlinkt: false, pauze: false };
  let pauze = false;   /* de proloog pauzeert (fixer R2): een wacht die nu start, zwijgt meteen */
  return {
    jingle(opts) {
      const k = K();
      if (!k || typeof k.jingle !== 'function') return 0;
      return probeer(() => k.jingle(Object.assign({ vals: true }, opts || {})), 0) || 0;
    },
    wachtStart(opts) {
      const k = K();
      if (!k || !k.wacht) return false;
      const n = opts && typeof opts.transponeer === 'number' ? opts.transponeer : 0;
      const ok = !!probeer(() => k.wacht.start({ transponeer: n }), false);
      if (ok && pauze && typeof k.wacht.pauzeer === 'function') probeer(() => k.wacht.pauzeer(true), null);   /* gestart in een pauze: meteen stil */
      return ok;
    },
    wachtStop() {
      const k = window.Klank;
      if (!k || !k.wacht) return false;
      return !!probeer(() => k.wacht.stop(), false);
    },
    transponeer(n) {
      const k = window.Klank;
      if (!k || !k.wacht) return false;
      return !!probeer(() => k.wacht.transponeer(n), false);
    },
    stilte(ms) {
      const k = K();
      if (!k || typeof k.stilte !== 'function') return false;
      return !!probeer(() => k.stilte(ms), false);
    },
    stilteWeg() {
      const k = window.Klank;
      if (!k || typeof k.stilteWeg !== 'function') return false;
      return !!probeer(() => k.stilteWeg(), false);
    },
    pauzeer(aan) {
      pauze = !!aan;
      if (A && typeof A.pauzeer === 'function') probeer(() => A.pauzeer(!!aan), null);
      const k = window.Klank;
      if (!k || !k.wacht || typeof k.wacht.pauzeer !== 'function') return false;
      return !!probeer(() => k.wacht.pauzeer(!!aan), false);
    },
    brom(aan) {
      if (!A || typeof A.liftBrom !== 'function') return false;
      if (aan) K();
      return probeer(() => { A.liftBrom(!!aan); return true; }, false);
    },
    /* R3: de lussen onder scènes 0-2 en de maat van het glimlachquotum */
    regen(aan) { return lus('regen', aan); },
    kantoor(aan, opts) { return lus('kantoor', aan, opts); },
    maat(aan, opts) { return lus('maat', aan, opts); },
    tel() { return (A && typeof A.tel === 'function' && probeer(() => A.tel(), null)) || null; },
    sfx,
    get stand() {
      const k = window.Klank;
      return (k && k.wacht && probeer(() => k.wacht.stand, null)) || Object.assign({}, LEEG);
    }
  };
})();
