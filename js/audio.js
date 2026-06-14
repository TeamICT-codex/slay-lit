/* ============================================================
   SLAY LIT — Klank: procedurele audio-engine (Web Audio)
   Mixer (master/muziek/sfx) + gelaagde SFX + generatieve
   ambient-muziek per scène, met crossfades en ducking.
   ============================================================ */

const Klank = (() => {
  let ctx = null, klaar = false;
  let master, comp, musGain, sfxGain, duckGain, echo, echoTerug;
  let ruisBuffer = null;

  /* instellingen (bewaard in localStorage) */
  const vol = Object.assign(
    { aan: true, muziek: 0.55, sfx: 0.8 },
    JSON.parse(localStorage.getItem('slayit_audio') || '{}')
  );
  function bewaar() { localStorage.setItem('slayit_audio', JSON.stringify(vol)); }

  /* ---------- opstart (vereist een gebruikersgebaar) ---------- */
  function init() {
    if (klaar) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      /* op mobiel een grotere audiobuffer ('playback') → veel minder kans op
         kraken/underruns als de hoofdthread even druk is. De extra latency is
         in een turn-based spel onmerkbaar. Desktop blijft laag-latent. */
      ctx = window.mobiel ? new AC({ latencyHint: 'playback' }) : new AC();
    } catch (e) { return; }
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 6;
    master = ctx.createGain();
    master.connect(comp); comp.connect(ctx.destination);

    duckGain = ctx.createGain();
    musGain = ctx.createGain();
    musGain.connect(duckGain); duckGain.connect(master);
    sfxGain = ctx.createGain();
    sfxGain.connect(master);

    /* gedeelde echo voor plukjes */
    echo = ctx.createDelay(1.2); echo.delayTime.value = 0.42;
    echoTerug = ctx.createGain(); echoTerug.gain.value = 0.32;
    echo.connect(echoTerug); echoTerug.connect(echo);
    echoTerug.connect(musGain);

    /* ruisbuffer voor klappen/whooshes */
    ruisBuffer = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = ruisBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    startDrone();
    setInterval(plan, 200);
    klaar = true;
    pasVolumesToe();
    hervat();
  }

  /* iOS/Safari (en het keydown-pad) kunnen de AudioContext 'suspended' starten of
     na backgrounding opnieuw suspenden → dan blijft alles stil terwijl 'geluid
     aan' staat. Expliciet hervatten binnen een gebruikersgebaar lost dat op. */
  function hervat() {
    if (ctx && ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(() => {});
  }

  function pasVolumesToe() {
    if (!klaar) return;
    master.gain.setTargetAtTime(vol.aan ? 1 : 0, ctx.currentTime, 0.05);
    musGain.gain.setTargetAtTime(vol.muziek * 0.5, ctx.currentTime, 0.1);
    sfxGain.gain.setTargetAtTime(vol.sfx, ctx.currentTime, 0.05);
  }

  /* ---------- sfx-bouwstenen ---------- */
  function toon(freq, duur, vorm, sterkte, glijNaar, start) {
    if (!klaar || !vol.aan) return;
    const t = start || ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = vorm; o.frequency.setValueAtTime(freq, t);
    if (glijNaar) o.frequency.exponentialRampToValueAtTime(Math.max(20, glijNaar), t + duur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(sterkte, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duur);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + duur + 0.05);
  }

  function ruis(duur, filterType, freqVan, freqNaar, sterkte, start) {
    if (!klaar || !vol.aan) return;
    const t = start || ctx.currentTime;
    const b = ctx.createBufferSource(); b.buffer = ruisBuffer;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.Q.value = 1;
    f.frequency.setValueAtTime(freqVan, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, freqNaar), t + duur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(sterkte, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duur);
    b.connect(f); f.connect(g); g.connect(sfxGain);
    b.start(t, Math.random() * 0.5); b.stop(t + duur + 0.05);
  }

  /* ---------- sfx-bibliotheek ---------- */
  const SFX = {
    klap()      { ruis(0.14, 'bandpass', 700, 120, 0.5); toon(120, 0.12, 'square', 0.18, 50); },
    zwareklap() { ruis(0.3, 'lowpass', 900, 90, 0.65); toon(70, 0.3, 'sine', 0.4, 32); toon(140, 0.18, 'sawtooth', 0.16, 55); duck(0.35, 0.5); },
    blok()      { toon(520, 0.1, 'square', 0.1, 480); toon(660, 0.16, 'triangle', 0.08, 620); ruis(0.06, 'highpass', 3000, 2000, 0.08); },
    kaart()     { ruis(0.16, 'bandpass', 600, 2400, 0.16); },
    trek()      { ruis(0.1, 'bandpass', 1800, 3600, 0.07); },
    goud()      { toon(880, 0.07, 'sine', 0.12); toon(1320, 0.1, 'sine', 0.1, null, ctx && ctx.currentTime + 0.06); },
    genees()    { [440, 554, 659].forEach((f, i) => toon(f, 0.22, 'sine', 0.09, null, ctx && ctx.currentTime + i * 0.07)); },
    gif()       { [300, 220, 260, 180].forEach((f, i) => toon(f, 0.06, 'sine', 0.07, f * 0.7, ctx && ctx.currentTime + i * 0.05)); },
    buff()      { toon(330, 0.16, 'triangle', 0.1, 495); },
    debuff()    { toon(440, 0.22, 'triangle', 0.1, 311); },
    dood()      { ruis(0.45, 'lowpass', 1200, 80, 0.3); toon(220, 0.5, 'sawtooth', 0.12, 40); },
    win()       { [440, 554, 659, 880].forEach((f, i) => toon(f, 0.2, 'triangle', 0.12, null, ctx && ctx.currentTime + i * 0.11)); },
    verlies()   { [330, 247, 196, 131].forEach((f, i) => toon(f, 0.3, 'sawtooth', 0.1, f * 0.92, ctx && ctx.currentTime + i * 0.16)); },
    klik()      { toon(900, 0.04, 'triangle', 0.05); },
    smeed()     { toon(720, 0.25, 'triangle', 0.12, 700); ruis(0.08, 'highpass', 4000, 3000, 0.1); },
    fout()      { toon(110, 0.14, 'sawtooth', 0.1, 95); },
    energie()   { toon(1200, 0.09, 'sine', 0.08, 1800); },
    drank()     { [500, 700, 600].forEach((f, i) => toon(f, 0.06, 'sine', 0.07, f * 1.15, ctx && ctx.currentTime + i * 0.05)); },
    stap()      { toon(330, 0.06, 'triangle', 0.05); },
    flip()      { ruis(0.13, 'bandpass', 900, 2800, 0.12); toon(620, 0.07, 'triangle', 0.05); },
    schitter()  { [880, 1175, 1568, 2093].forEach((f, i) => toon(f, 0.16, 'sine', 0.06, null, ctx && ctx.currentTime + i * 0.07)); }
  };

  function sfx(naam) { if (klaar && SFX[naam]) SFX[naam](); }

  /* muziek even laten dimmen (bij grote klappen) */
  function duck(diepte, duur) {
    if (!klaar) return;
    const t = ctx.currentTime;
    duckGain.gain.cancelScheduledValues(t);
    duckGain.gain.setValueAtTime(duckGain.gain.value, t);
    duckGain.gain.linearRampToValueAtTime(1 - (diepte || 0.3), t + 0.04);
    duckGain.gain.linearRampToValueAtTime(1, t + (duur || 0.45));
  }

  /* ============================================================
     GENERATIEVE MUZIEK
     drone (continu) + pad-akkoorden + plukjes + hartslag-puls
     ============================================================ */
  const SCENES = {
    stil:    { droneVol: 0,    root: 55 },
    titel:   { droneVol: 0.10, root: 55, schaal: [0, 3, 5, 7, 10], bpm: 40, padKans: 0.5, plukKans: 0.18, puls: false, spanning: 0 },
    kaart:   { droneVol: 0.10, root: 55, schaal: [0, 3, 5, 7, 10], bpm: 44, padKans: 0.45, plukKans: 0.26, puls: false, spanning: 0.1 },
    rust:    { droneVol: 0.07, root: 65.4, schaal: [0, 4, 7, 9, 14], bpm: 40, padKans: 0.6, plukKans: 0.3, puls: false, spanning: 0 },
    gevecht: { droneVol: 0.13, root: 55, schaal: [0, 3, 5, 7, 10], bpm: 84, padKans: 0.5, plukKans: 0.15, puls: true, spanning: 0.3 },
    elite:   { droneVol: 0.15, root: 51.9, schaal: [0, 1, 5, 7, 8], bpm: 96, padKans: 0.55, plukKans: 0.12, puls: true, spanning: 0.6 },
    baas:    { droneVol: 0.17, root: 41.2, schaal: [0, 1, 5, 7, 8], bpm: 104, padKans: 0.7, plukKans: 0.1, puls: true, spanning: 1 }
  };
  /* akkoorden als halve-toon-afstanden boven de grondtoon */
  const PROGRESSIE = [[0, 3, 7], [-2, 2, 5], [3, 7, 10], [-4, 0, 5]];

  let scene = 'stil';
  let drone = null, spanVoice = null;
  let volgendeTel = 0, tel = 0, maat = 0;
  let duister = false; /* fakkel bijna op: muziek wordt donkerder */

  function startDrone() {
    drone = { oscs: [], gain: ctx.createGain(), filter: ctx.createBiquadFilter() };
    drone.filter.type = 'lowpass'; drone.filter.frequency.value = 170;
    drone.gain.gain.value = 0;
    drone.filter.connect(drone.gain); drone.gain.connect(musGain);
    [-4, 4].forEach(cents => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 55;
      o.detune.value = cents;
      o.connect(drone.filter);
      o.start();
      drone.oscs.push(o);
    });
    /* hoge spanningszweving voor elites/bazen */
    spanVoice = { oscs: [], gain: ctx.createGain() };
    spanVoice.gain.gain.value = 0;
    spanVoice.gain.connect(musGain);
    [1, 1.012].forEach(mult => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = 55 * 8 * mult;
      o.connect(spanVoice.gain);
      o.start();
      spanVoice.oscs.push(o);
    });
  }

  function muziek(naam) {
    if (!SCENES[naam]) naam = 'stil';
    if (naam === scene) return;
    scene = naam;
    if (!klaar) return;
    const s = SCENES[scene];
    const t = ctx.currentTime;
    drone.gain.gain.setTargetAtTime(s.droneVol || 0, t, 1.2);
    drone.oscs.forEach(o => o.frequency.setTargetAtTime(s.root || 55, t, 0.8));
    spanVoice.gain.gain.setTargetAtTime((s.spanning || 0) * 0.022 + (duister ? 0.02 : 0), t, 1.5);
    spanVoice.oscs.forEach((o, i) => o.frequency.setTargetAtTime((s.root || 55) * 8 * (i ? 1.012 : 1), t, 0.8));
    tel = 0; maat = 0;
    volgendeTel = t + 0.1;
  }

  /* planner: kijkt vooruit en plant noten op het tellenraster */
  function plan() {
    if (!klaar || !vol.aan) return;
    const s = SCENES[scene];
    if (!s || !s.bpm) return;
    /* na mute of een lange pauze: niet alle gemiste noten inhalen */
    if (volgendeTel < ctx.currentTime - 0.3) volgendeTel = ctx.currentTime + 0.05;
    const telDuur = 60 / s.bpm;
    while (volgendeTel < ctx.currentTime + 0.9) {
      plaatsTel(volgendeTel, s);
      volgendeTel += telDuur;
      tel++;
      if (tel % 8 === 0) maat++;
    }
  }

  function plaatsTel(t, s) {
    /* hartslag-puls in gevechten op tel 1 en 5 */
    if (s.puls && tel % 4 === 0) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(64, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.13);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); g.connect(musGain);
      o.start(t); o.stop(t + 0.25);
    }
    /* pad-akkoord aan het begin van de maat */
    if (tel % 8 === 0 && Math.random() < s.padKans) {
      const akkoord = PROGRESSIE[maat % PROGRESSIE.length];
      akkoord.forEach(halve => {
        const f = s.root * 2 * Math.pow(2, halve / 12);
        padStem(t, f, 8 * (60 / s.bpm));
      });
    }
    /* losse plukjes uit de toonladder */
    if (Math.random() < s.plukKans) {
      const stap = s.schaal[Math.floor(Math.random() * s.schaal.length)];
      const octaaf = Math.random() < 0.3 ? 8 : 4;
      pluk(t + Math.random() * 0.2, s.root * octaaf * Math.pow(2, stap / 12));
    }
  }

  function padStem(t, freq, duur) {
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = 'triangle'; o2.type = 'sawtooth';
    o1.frequency.value = freq; o2.frequency.value = freq; o2.detune.value = 6;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 600 + Math.random() * 500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.035, t + duur * 0.35);
    g.gain.linearRampToValueAtTime(0, t + duur * 1.05);
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(musGain);
    o1.start(t); o2.start(t);
    o1.stop(t + duur * 1.1); o2.stop(t + duur * 1.1);
  }

  function pluk(t, freq) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(g); g.connect(musGain); g.connect(echo);
    o.start(t); o.stop(t + 0.8);
  }

  /* fakkel bijna op: spanningszweving omhoog, drone doffer */
  function zetDuister(aan) {
    if (duister === aan) return;
    duister = aan;
    if (!klaar) return;
    const s = SCENES[scene] || {};
    const t = ctx.currentTime;
    spanVoice.gain.gain.setTargetAtTime((s.spanning || 0) * 0.022 + (aan ? 0.02 : 0), t, 1.2);
    drone.filter.frequency.setTargetAtTime(aan ? 115 : 170, t, 1);
  }

  /* ---------- publiek ---------- */
  return {
    init, hervat, sfx, muziek, duck, zetDuister,
    get klaar() { return klaar; },
    get vol() { return vol; },
    zet(sleutel, waarde) { vol[sleutel] = waarde; bewaar(); pasVolumesToe(); },
    get huidigeScene() { return scene; }
  };
})();
window.Klank = Klank;
