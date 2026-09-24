/* SLAY LIT — Proloog · procedurele sfeer-audio (Web Audio API, geen bestanden).
   Alles gesynthetiseerd: CRT-brom, "d-ding"-belletje, hartslag, ruis, glitch, stempel, warmte.

   R1 "DE NAAD" (sep 2026): een DUNNE LAAG op de ENE AudioContext van het spel.
   De proloog maakt geen eigen AudioContext meer; ze haakt in op Klank.koppel()
   (js/audio.js) → { ctx, sfx(naam), muziek(scène) } en optioneel een uitgangsbus.
   De eigen mute-sleutel ('slaylit_audio_mute') is weg: de game-mute (Klank.vol.aan)
   en de sfx-schuif gelden. Ontbreekt Klank.koppel, of bestaat de context nog niet
   (geen gebaar gehad), dan zwijgt alles stil — nooit een fout. window.SLAYLIT_AUDIO.

   R2 "DE VAL EN DE KLANK": daarbovenop window.ProloogKlank (onderaan) — de jingle,
   de wachtmuziek, het transponeren, de stilte en de val-geluiden, op Klank.*. */
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
    const nodig = !!(humNodes || droneNodes || noiseNode || heartTimer || bromNodes);
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
    const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
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
    const g = ctx.createGain(); g.connect(master);
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
    const g = ctx.createGain(); g.connect(master);
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
    const g = ctx.createGain(); g.connect(master);
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
      noiseNode.connect(bp); bp.connect(noiseGain); noiseGain.connect(master);
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
      const g = ctx.createGain(); g.connect(master);
      g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(0.16, tt + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0006, tt + 0.045);
      const o = ctx.createOscillator(); o.type = 'square';
      o.frequency.value = 120 + Math.random() * 900; o.connect(g); o.start(tt); o.stop(tt + 0.05);
    }
  }

  // —— stempel-dreun (ONMIDDELLIJK ONTSLAG) ——
  function stamp() {
    if (!ensure()) return; const t = now();
    const g = ctx.createGain(); g.connect(master);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.3);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
    o.connect(g); o.start(t); o.stop(t + 0.32);
    // klik bovenop
    const ng = ctx.createGain(); ng.connect(master); ng.gain.setValueAtTime(0.2, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    const len = Math.floor(ctx.sampleRate * 0.06); const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const n = ctx.createBufferSource(); n.buffer = buf; n.connect(ng); n.start(t);
  }

  // —— warme akkoord-zwelling (de foto / de sintel) ——
  function warm() {
    if (!ensure()) return; const t = now();
    const freqs = [220, 277.18, 329.63]; // A majeur, troostend
    const g = ctx.createGain(); g.connect(master);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.5); g.gain.linearRampToValueAtTime(0, t + 2.6);
    freqs.forEach((f) => { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + 2.7); });
  }

  // —— power-on sweep (dive in het scherm) ——
  function powerOn() {
    if (!ensure()) return; const t = now();
    const g = ctx.createGain(); g.connect(master); g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.14, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0006, t + 0.5);
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(1200, t + 0.35);
    o.connect(g); o.start(t); o.stop(t + 0.55);
  }

  // —— diepe ambient-drone (de afgrond) ——
  function droneOn(baseFreq, vol) {
    if (!ensure()) return; droneOff();
    const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
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
    const g = ctx.createGain(); g.connect(master);
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
  /* een kort gefilterd ruisstootje */
  function stoot(t, dur, soort, freq, q, vol) {
    const n = ctx.createBufferSource(); n.buffer = ruisBuf();
    const f = ctx.createBiquadFilter(); f.type = soort; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    n.connect(f); f.connect(g); g.connect(master);
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
    const g = ctx.createGain(); g.connect(master);
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
    const g = ctx.createGain(); g.connect(master);
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
    const g = ctx.createGain(); g.connect(master);
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
    const g = ctx.createGain();
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
    const g = ctx.createGain(); g.connect(master);
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
    const g = ctx.createGain(); g.connect(master);
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
    const g = ctx.createGain();
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
  /* pauze (tab verborgen / draai-blok): de hartslag houdt zijn adem in, de lift-brom zwijgt */
  function pauzeer(aan) {
    aan = !!aan;
    if (aan !== pauzeNu) {
      pauzeNu = aan;
      if (bromNodes && ctx) { try { const g = bromNodes.g.gain, t = now(); g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.setTargetAtTime(aan ? 0 : BROM, t, 0.05); } catch (e) {} }
    }
    if (aan === heartPauze) return;
    heartPauze = aan;
    if (aan) { if (heartTimer) { clearInterval(heartTimer); heartTimer = -1; } }
    else if (heartTimer === -1) { heartTimer = null; heartStart(heartRate); }
  }
  /* alles uit (Proloog.stop) — ook de wachtmuziek, als ze nog liep (herbeleven dat
     halverwege stopt, een skip): de wacht mag de proloog nooit overleven */
  function stilte() {
    heartPauze = false; pauzeNu = false;
    heartStop(); humOff(); noiseOff(); droneOff(); liftBrom(false);
    if (volKlok) { clearInterval(volKlok); volKlok = null; }
    try { const K = window.Klank; if (K && K.wacht && K.wacht.stand.actief) K.wacht.stop(); } catch (e) {}
  }

  return { unlock, humOn, humOff, ding, tik, type, heartStart, heartRateSet, heartStop,
    noiseOn, noiseOff, glitch, stamp, warm, powerOn, droneOn, droneOff, plunge,
    etage, tlSterft, ledUit, vellen, liftknop, kooltje, schaarhek, verbinding, krant,
    grendel, donder, liftBrom,
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
     sfx(naam)         true/false · de val-geluiden (etage, tl-sterft, led-uit, vellen,
                       liftknop, kooltje, grendel, donder, verbinding, krant — ook onder de
                       gebeurtenisnamen van val.js: hek = grendel, bliksem = donder), de
                       proloogklanken (ding, tik, type, glitch, stamp, warm, powerOn, plunge,
                       beat) of een Klank-sfx
     stand             { actief, toon, vast, vastKlinkt, pauze } — bv. voor contract.wachtToon */
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
    'ding', 'tik', 'type', 'glitch', 'stamp', 'warm', 'powerOn', 'plunge', 'beat'];
  /* sleutels zonder hoofdletters en leestekens: 'tl-sterft', 'tl_sterft' en 'tlSterft'
     zijn dezelfde; plus synoniemen, en de gebeurtenisnamen van proloog/val.js (hek,
     bliksem, krant, etage, tl, verbinding, vloer, kooltje, knop, baasDrukt) klinken
     rechtstreeks. Het hek staat al dicht (fixer R2): 'hek' is het slot, niet het dichtschuiven. */
  const ALIAS = { liftbel: 'etage', verdieping: 'etage', tl: 'tlSterft', tluit: 'tlSterft', led: 'ledUit',
    papier: 'vellen', factuurvellen: 'vellen', vloer: 'vellen', knop: 'liftknop', baasdrukt: 'liftknop',
    adem: 'kooltje', hek: 'grendel', slot: 'grendel', bliksem: 'donder', onweer: 'donder',
    verbroken: 'verbinding', ophangen: 'verbinding', lichtkrant: 'krant', stempel: 'stamp' };
  EIGEN.forEach(n => { ALIAS[n.toLowerCase()] = n; });
  function sfx(naam) {
    if (typeof naam !== 'string' || !naam) return false;
    const eigen = ALIAS[naam.toLowerCase().replace(/[^a-z]/g, '')];
    if (eigen && A && typeof A[eigen] === 'function') { K(); return probeer(() => { A[eigen](); return true; }, false); }
    const k = K();
    if (!k || typeof k.sfx !== 'function') return false;
    return probeer(() => k.sfx(naam) === true, false);
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
    sfx,
    get stand() {
      const k = window.Klank;
      return (k && k.wacht && probeer(() => k.wacht.stand, null)) || Object.assign({}, LEEG);
    }
  };
})();
