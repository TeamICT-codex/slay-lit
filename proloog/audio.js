/* SLAY LIT — Proloog · procedurele sfeer-audio (Web Audio API, geen bestanden).
   Alles gesynthetiseerd: CRT-brom, "d-ding"-belletje, hartslag, ruis, glitch, stempel, warmte.
   Lazy init op de eerste user-gesture (browservereiste). window.SLAYLIT_AUDIO. */
window.SLAYLIT_AUDIO = (function () {
  let ctx = null, master = null, humNodes = null, noiseNode = null, noiseGain = null;
  let heartTimer = null, heartRate = 900;
  let muted = false;
  try { muted = localStorage.getItem('slaylit_audio_mute') === '1'; } catch (e) {}

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
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
  }
  function humOff() {
    if (!humNodes) return;
    const { g, o1, o2, lfo } = humNodes; const t = now();
    g.gain.cancelScheduledValues(t); g.gain.linearRampToValueAtTime(0, t + 0.8);
    [o1, o2, lfo].forEach((o) => { try { o.stop(t + 0.9); } catch (e) {} });
    humNodes = null;
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
  function beat() { const t = now(); thump(t, 0.5); thump(t + 0.17, 0.32); }
  function heartStart(rate) {
    if (!ensure()) return; heartRate = rate || 900;
    if (heartTimer) clearInterval(heartTimer);
    beat(); heartTimer = setInterval(beat, heartRate);
  }
  function heartRateSet(rate) {
    if (!heartTimer) return; heartRate = rate;
    clearInterval(heartTimer); beat(); heartTimer = setInterval(beat, heartRate);
  }
  function heartStop() { if (heartTimer) { clearInterval(heartTimer); heartTimer = null; } }

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
  }
  function noiseOff() {
    if (noiseGain) noiseGain.gain.linearRampToValueAtTime(0, now() + 0.8);
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
    const len = ctx.sampleRate * 0.06; const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
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

  // —— diepe ambient-drone (afgrond / afdaling) ——
  let droneNodes = null;
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
  }
  function droneOff() {
    if (!droneNodes) return; const { g, os } = droneNodes; const t = now();
    g.gain.cancelScheduledValues(t); g.gain.linearRampToValueAtTime(0, t + 1.0);
    os.forEach((o) => { try { o.stop(t + 1.1); } catch (e) {} }); droneNodes = null;
  }

  // —— plunge-whoosh: neerwaartse sweep wanneer je kiest hóe je valt ——
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

  function setMute(m) {
    muted = m; try { localStorage.setItem('slaylit_audio_mute', m ? '1' : '0'); } catch (e) {}
    if (master) master.gain.linearRampToValueAtTime(m ? 0 : 0.9, now() + 0.1);
  }
  function isMuted() { return muted; }
  function unlock() { ensure(); } // op user-gesture

  return { unlock, humOn, humOff, ding, tik, type, heartStart, heartRateSet, heartStop,
    noiseOn, noiseOff, glitch, stamp, warm, powerOn, droneOn, droneOff, plunge, setMute, isMuted };
})();
