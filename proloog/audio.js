/* SLAY LIT — Proloog · procedurele sfeer-audio (Web Audio API, geen bestanden).
   Alles gesynthetiseerd: CRT-brom, "d-ding"-belletje, hartslag, ruis, glitch, stempel, warmte.

   R1 "DE NAAD" (sep 2026): een DUNNE LAAG op de ENE AudioContext van het spel.
   De proloog maakt geen eigen AudioContext meer; ze haakt in op Klank.koppel()
   (js/audio.js) → { ctx, sfx(naam), muziek(scène) } en optioneel een uitgangsbus.
   De eigen mute-sleutel ('slaylit_audio_mute') is weg: de game-mute (Klank.vol.aan)
   en de sfx-schuif gelden. Ontbreekt Klank.koppel, of bestaat de context nog niet
   (geen gebaar gehad), dan zwijgt alles stil — nooit een fout. window.SLAYLIT_AUDIO. */
window.SLAYLIT_AUDIO = (function () {
  let ctx = null, master = null, viaBus = false;
  let humNodes = null, noiseNode = null, noiseGain = null, droneNodes = null;
  let heartTimer = null, heartRate = 900, heartPauze = false;
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
      ctx = c; humNodes = null; noiseNode = null; noiseGain = null; droneNodes = null;
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
    const nodig = !!(humNodes || droneNodes || noiseNode || heartTimer);
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
  /* pauze (tab verborgen / draai-blok): de hartslag houdt zijn adem in */
  function pauzeer(aan) {
    if (aan === heartPauze) return;
    heartPauze = aan;
    if (aan) { if (heartTimer) { clearInterval(heartTimer); heartTimer = -1; } }
    else if (heartTimer === -1) { heartTimer = null; heartStart(heartRate); }
  }
  /* alles uit (Proloog.stop) */
  function stilte() {
    heartPauze = false;
    heartStop(); humOff(); noiseOff(); droneOff();
    if (volKlok) { clearInterval(volKlok); volKlok = null; }
  }

  return { unlock, humOn, humOff, ding, tik, type, heartStart, heartRateSet, heartStop,
    noiseOn, noiseOff, glitch, stamp, warm, powerOn, droneOn, droneOff, plunge,
    pauzeer, stilte, get gekoppeld() { return !!koppel(); } };
})();
