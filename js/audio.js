/* ============================================================
   SLAY LIT — Klank: procedurele audio-engine (Web Audio)
   Mixer (master/muziek/sfx) + gelaagde SFX + generatieve
   ambient-muziek per scène, met crossfades en ducking.
   ============================================================ */

const Klank = (() => {
  let ctx = null, klaar = false;
  let master, comp, stilGain, musGain, sfxGain, duckGain, echo, echoTerug;
  let ruisBuffer = null;

  /* instellingen (bewaard in localStorage) — veilig lezen: een corrupte/getamperde
     store mag de module-evaluatie niet breken (anders bestaat Klank niet en brickt
     het hele spel — zelfde bugklasse als veiligLees() in game.js). */
  const vol = Object.assign(
    { aan: true, muziek: 0.55, sfx: 0.8 },
    (() => {
      try { return JSON.parse(localStorage.getItem('slayit_audio') || '{}'); }
      catch (e) { try { localStorage.removeItem('slayit_audio'); } catch (e2) {} return {}; }
    })()
  );
  function bewaar() { try { localStorage.setItem('slayit_audio', JSON.stringify(vol)); } catch (e) {} }

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
    /* stilGain: de allerlaatste schakel vóór de luidsprekers. Klank.stilte(ms) laat
       daarmee ALLES (muziek, sfx, de proloogbus) zacht wegvallen en terugkomen, los
       van de mute (die blijft op master). */
    stilGain = ctx.createGain();
    master.connect(comp); comp.connect(stilGain); stilGain.connect(ctx.destination);

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
    pasScene();   /* de vóór-init gezette scène alsnog toepassen (drone-fundament) */
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
    schitter()  { [880, 1175, 1568, 2093].forEach((f, i) => toon(f, 0.16, 'sine', 0.06, null, ctx && ctx.currentTime + i * 0.07)); },
    /* HET PROCES (v121): de hamer is het MOTIEF van de rechtszitting - dezelfde tik bij
       de klap en bij de stempel maakt van de drie bedrijfsovergangen een zitting in
       plaats van drie losse effectenshows. dreun = de sub-bass-inslag met lange staart,
       inzakken = iets zwaars dat in elkaar zakt (dient ook als 'scheur').
       LET OP: een onbekende naam is STIL, geen fout (zie sfx() hieronder) - deze drie
       moeten HOORBAAR getest worden, en 41 Hz klinkt op een telefoon anders dan hier. */
    hamer()    { ruis(0.10, 'bandpass', 2600, 900, 0.5); toon(1500, 0.05, 'square', 0.10); SFX.zwareklap(); },
    dreun()    { ruis(0.95, 'lowpass', 520, 42, 0.55); toon(41, 1.2, 'sine', 0.5, 26); toon(82, 0.45, 'sawtooth', 0.16, 38); duck(0.75, 1.3); },
    inzakken() { ruis(0.80, 'bandpass', 2600, 300, 0.30); toon(33, 1.1, 'sine', 0.30, 24); },
    /* BETAALD APPLAUS (v109): zes korte ruisstootjes met jitter — handen die klappen
       omdat ze betaald worden, net niet gelijk. */
    applaus()   {
      const t0 = ctx ? ctx.currentTime : 0;
      for (let i = 0; i < 6; i++) {
        ruis(0.05 + Math.random() * 0.04, 'bandpass', 1400 + Math.random() * 1200, 700, 0.09 + Math.random() * 0.05, t0 + i * 0.055 + Math.random() * 0.03);
      }
    },
    /* DE LANDING NA DE PROLOOG (R1, js/proloog-brug.js): elke letter van SLAY LIT die
       inbrandt knispert, en de fakkelchip telt met warme tikjes van 0 naar 80. */
    knisper()  { ruis(0.05 + Math.random() * 0.03, 'highpass', 2600 + Math.random() * 1800, 1500, 0.10); toon(1700 + Math.random() * 900, 0.03, 'triangle', 0.025); },
    warmtik()  { toon(740 + Math.random() * 60, 0.06, 'sine', 0.05, 690); }
  };

  /* geeft true terug als de naam bestaat (en dus klonk, of stil bleef door de mute) */
  function sfx(naam) { if (klaar && SFX[naam]) { SFX[naam](); return true; } return false; }

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
    /* de landing na de proloog: alleen de drone, laag (40 Hz) — bij 'kaart' glijdt hij in
       dezelfde context naar 55 Hz (pasScene: setTargetAtTime), geen knip en geen stilte */
    afgrond: { droneVol: 0.07, root: 40 },
    titel:   { droneVol: 0.10, root: 55, schaal: [0, 3, 5, 7, 10], bpm: 40, padKans: 0.5, plukKans: 0.18, puls: false, spanning: 0 },
    kaart:   { droneVol: 0.10, root: 55, schaal: [0, 3, 5, 7, 10], bpm: 44, padKans: 0.45, plukKans: 0.26, puls: false, spanning: 0.1 },
    rust:    { droneVol: 0.07, root: 65.4, schaal: [0, 4, 7, 9, 14], bpm: 40, padKans: 0.6, plukKans: 0.3, puls: false, spanning: 0 },
    gevecht: { droneVol: 0.13, root: 55, schaal: [0, 3, 5, 7, 10], bpm: 84, padKans: 0.5, plukKans: 0.15, puls: true, spanning: 0.3 },
    elite:   { droneVol: 0.15, root: 51.9, schaal: [0, 1, 5, 7, 8], bpm: 96, padKans: 0.55, plukKans: 0.12, puls: true, spanning: 0.6 },
    baas:    { droneVol: 0.17, root: 41.2, schaal: [0, 1, 5, 7, 8], bpm: 104, padKans: 0.7, plukKans: 0.1, puls: true, spanning: 1 },
    /* HET MANDAAT (v109): de tweede vorm van de DICKtator. Zelfde grondtoon als 'baas'
       maar sneller, dichter en met een grote-terts-schijn in de schaal — de triomfmars
       van iemand die zichzelf herkozen heeft. LET OP: de naam moet exact 'finale' zijn
       (een typefout betekent stilte, zie muziek() hieronder). */
    finale:  { droneVol: 0.20, root: 41.2, schaal: [0, 1, 4, 5, 8], bpm: 120, padKans: 0.8, plukKans: 0.08, puls: true, spanning: 1.2 },
    /* de outro (js/outro.js): de eerste échte chiptune van het spel — de
       bedrijfsjingle als 8-bit strijdlied in mineur (subdiv 4 = 16e noten;
       lagen stapelen per verdieping via zetChipLagen). 'outro_slot' is
       hetzelfde motief in majeur, traag en zacht — de reboot/epiloog. */
    outro:      { droneVol: 0, root: 110, bpm: 152, subdiv: 4, chip: 'strijd' },
    outro_slot: { droneVol: 0, root: 110, bpm: 66,  subdiv: 2, chip: 'slot' }
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

  /* de huidige scène op de klanklagen toepassen (drone/spanning/tellenraster).
     Apart van muziek(): init() moet dit óók draaien, want vóór het eerste
     gebruikersgebaar zet toonScherm de scène al terwijl klaar=false — zonder
     her-toepassing bleef de drone-laag dan op gain 0 hangen tot de eerstvolgende
     scène-WISSEL (titelmuziek zonder fundament). */
  function pasScene() {
    if (!klaar) return;
    const s = SCENES[scene];
    const t = ctx.currentTime;
    drone.gain.gain.setTargetAtTime(s.droneVol || 0, t, 1.2);
    drone.oscs.forEach(o => o.frequency.setTargetAtTime(s.root || 55, t, 0.8));
    spanVoice.gain.gain.setTargetAtTime((s.spanning || 0) * 0.022 + (duister && !s.chip ? 0.02 : 0), t, 1.5);   /* chip-scenes (outro): geen duister-zweving door de chiptune */
    spanVoice.oscs.forEach((o, i) => o.frequency.setTargetAtTime((s.root || 55) * 8 * (i ? 1.012 : 1), t, 0.8));
    tel = 0; maat = 0;
    volgendeTel = t + 0.1;
  }

  function muziek(naam) {
    if (!SCENES[naam]) naam = 'stil';
    /* de wachtmuziek wijkt voor elke expliciete muziekwissel, ook naar dezelfde scène
       (Outro.beeindig zet 'stil' terwijl het al 'stil' is). Echte muziek (een scène met
       tempo) neemt meteen over; 'stil'/'afgrond' pas na 0,4 s: Outro.start zet 'stil' in
       dezelfde adem waarin de intro de wacht hervat, en die volgorde mag niet uitmaken. */
    if (lijn && !lijn.weg && (SCENES[naam].bpm || performance.now() - lijn.startWand > 400)) sluitLijn(0.25);
    if (naam === scene) return;
    scene = naam;
    pasScene();
  }

  /* planner: kijkt vooruit en plant noten op het tellenraster */
  function plan() {
    if (!klaar || !vol.aan) return;
    if (lijn) planWacht();   /* de wachtmuziek loopt los van de scène (die is dan 'stil') */
    const s = SCENES[scene];
    if (!s || !s.bpm) return;
    /* na mute of een lange pauze: niet alle gemiste noten inhalen */
    if (volgendeTel < ctx.currentTime - 0.3) volgendeTel = ctx.currentTime + 0.05;
    const telDuur = 60 / s.bpm / (s.subdiv || 1);
    /* chip-scenes plannen verder vooruit: in een verborgen tab wordt de
       planner tot 1x/s gethrottled — 0,9s lookahead stottert dan net */
    while (volgendeTel < ctx.currentTime + (s.chip ? 1.8 : 0.9)) {
      plaatsTel(volgendeTel, s);
      volgendeTel += telDuur;
      tel++;
      if (tel % 8 === 0) maat++;
    }
  }

  /* ---------- de chiptune (outro) ----------
     Pure square/triangle-stemmen + ruis-drums, geroosterd op 16e noten.
     Alles routeert naar musGain (volumeslider + ducking gelden dus ook hier). */
  const CHIP_MEL = [   /* de jingle in mineur — 2 maten van 16 stappen */
    12, null, 7, null, 8, null, 7, null, 5, null, 3, null, 5, 7, null, null,
    12, null, 7, null, 8, null, 10, null, 12, null, 15, null, 12, null, null, null
  ];
  const CHIP_MEL_SLOT = [   /* dezelfde contour, eindelijk in majeur */
    12, null, 7, null, 9, null, 7, null, 5, null, 4, null, 5, 7, null, null,
    12, null, 7, null, 9, null, 11, null, 12, null, 16, null, 12, null, null, null
  ];
  const CHIP_AKK = [[0, 3, 7], [0, 3, 7], [-4, 0, 5], [-2, 2, 5]];   /* per 8 stappen */
  let chipLagen = 3;   /* 0 = uitgedunde hal · 1 = bas+kick · 2 = +drums+arp · 3 = +lead */

  function chipNoot(t, freq, duur, vorm, sterkte, glijNaar) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = vorm; o.frequency.setValueAtTime(freq, t);
    if (glijNaar) o.frequency.exponentialRampToValueAtTime(Math.max(20, glijNaar), t + duur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(sterkte, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duur);
    o.connect(g); g.connect(musGain);
    o.start(t); o.stop(t + duur + 0.05);
  }
  function chipRuis(t, duur, type, freq, sterkte) {
    const b = ctx.createBufferSource(); b.buffer = ruisBuffer;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(sterkte, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duur);
    b.connect(f); f.connect(g); g.connect(musGain);
    b.start(t, Math.random() * 0.5); b.stop(t + duur + 0.05);
  }

  function plaatsChipTel(t, s) {
    const stap = tel % 32;
    if (s.chip === 'slot') {
      /* het muziekdoosje: de jingle zuiver, traag, zonder drums */
      const n = CHIP_MEL_SLOT[stap];
      if (n !== null) chipNoot(t, s.root * 4 * Math.pow(2, n / 12), 0.6, 'triangle', 0.045);
      if (stap % 16 === 0) chipNoot(t, s.root, 1.4, 'triangle', 0.05);
      return;
    }
    const akkoord = CHIP_AKK[(stap >> 3) & 3];
    if (chipLagen >= 1) {
      /* triangle-bas in achtsten + kick — het fundament */
      if (stap % 2 === 0) chipNoot(t, s.root * Math.pow(2, akkoord[0] / 12), 0.16, 'triangle', 0.07);
      if (stap % 4 === 0) { chipNoot(t, 150, 0.14, 'square', 0.11, 42); chipRuis(t, 0.08, 'lowpass', 300, 0.06); }
    } else {
      /* de serverhal: alles weg behalve een kale bas — het gevecht is voorbij */
      if (stap % 8 === 0) chipNoot(t, s.root * Math.pow(2, akkoord[0] / 12), 0.6, 'triangle', 0.045);
    }
    if (chipLagen >= 2) {
      if (stap % 8 === 4) chipRuis(t, 0.09, 'highpass', 1800, 0.05);            /* snare */
      if (stap % 2 === 1) chipRuis(t, 0.03, 'highpass', 7000, 0.018);           /* hihat */
      chipNoot(t, s.root * 2 * Math.pow(2, (akkoord[stap % 3] + 12) / 12), 0.09, 'square', 0.02);   /* arp */
    }
    if (chipLagen >= 3) {
      const n = CHIP_MEL[stap];
      if (n !== null) chipNoot(t, s.root * 2 * Math.pow(2, n / 12), 0.22, 'square', 0.05);
    }
  }
  function zetChipLagen(n) { chipLagen = Math.max(0, Math.min(3, n | 0)); }

  function plaatsTel(t, s) {
    if (s.chip) { plaatsChipTel(t, s); return; }
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
    spanVoice.gain.gain.setTargetAtTime((s.spanning || 0) * 0.022 + (aan && !s.chip ? 0.02 : 0), t, 1.2);   /* chip-scenes: geen duister-zweving (zie pasScene) */
    drone.filter.frequency.setTargetAtTime(aan ? 115 : 170, t, 1);
  }

  /* ============================================================
     DE BEDRIJFSJINGLE EN DE WACHTMUZIEK (proloog R2, sep 2026)
     Dezelfde contour als CHIP_MEL, maar in majeur (CHIP_MEL_SLOT): het opgewekte
     deuntje van het bedrijf, euforisch en beige. In de reboot van de outro klinkt ze
     "voor het eerst zuiver en in majeur" (OUTRO.md), dus in de proloog NOOIT zuiver:
     · jingle({vals}) — de boot, uit de CRT-speaker: één maat te lang (ze landt, en
       landt dan nóg eens) en de laatste noot zakt net onder de toon.
     · wacht — dezelfde jingle als muzak door een telefoonlijn (300-3400 Hz, een
       snuifje lijnruis, een wiegelend bandje), trager, in een lus tot stop().
       transponeer(n) zet de hele lijn n halve tonen lager (glijdend, ±120 ms) en, zoals
       een bandje dat trager draait, zakt het tempo mee. Op −7 (de bodem) loopt ze vast
       op één vaste noot: de grondtoon, die blijft hangen tot de stilte haar afsnijdt.
     · wachtHervat(n, {buig}) — de outro haalt je UIT de wacht: dezelfde vaste noot op
       −n, dan hervat de lus en buigt de lijn in ±3 s omhoog naar 0 (het bandje dat weer
       op toeren komt).
     · stilte(ms) — alles zacht weg, ms stilte, en weer terug. Een lopende wachtlijn
       komt niet terug: de verbinding is verbroken.
     Alles op de ENE context en via musGain (muziekschuif, ducking en mute gelden).
     ============================================================ */
  const JINGLE_MEL = CHIP_MEL_SLOT.concat([   /* + de maat te veel */
    7, null, 9, null, 11, null, 12, null, 16, null, null, null, 12, null, null, null
  ]);
  const JINGLE_AKK = [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7], [7, 11, 14], [0, 4, 7]];   /* I IV V I | V I, per 8 stappen */
  const JINGLE_STAP = 0.095;
  const WACHT_MEL = CHIP_MEL_SLOT;
  const WACHT_PAD = [[7, 12, 16], [5, 9, 12], [7, 11, 14], [7, 12, 16]];   /* boven 220 Hz: I IV V I */
  const WACHT_BAS = [0, 5, 7, 0];
  const WACHT_STAP = 0.16;    /* 16e noten, 1,6x trager dan de outro-chip */
  const WACHT_BODEM = -7;     /* hier loopt de lijn vast op de vaste noot */
  const WACHT_VOORUIT = 1.5;  /* planningsvenster (s): ook een verborgen tab (1 tik/s) hapert niet */
  /* niveaus, A-gewogen gemeten tegen de spelmuziek: de wacht zit op het niveau van de
     titelmuziek (zacht, achtergrond), de jingle 3-4 dB daarboven (een moment, geen knal) */
  const WACHT_NIVEAU = 0.3, JINGLE_NIVEAU = 0.45;

  function biquad(type, freq, q) {
    const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = freq; b.Q.value = q; return b;
  }

  /* een goedkope FM-piano (DX-achtig): draaggolf + modulator 1:1 met een wegstervende
     index (de aanslag) en een tikje 'tine' op 4x. o.lijn: de transponeerlijn waar elke
     oscillator aan hangt (via detune, zodat ook klinkende noten meeglijden).
     o.vals = [van, naar] in cent: de noot zakt tijdens het klinken net onder de toon. */
  function epiano(t, f, duur, sterkte, uit, o) {
    o = o || {};
    const car = ctx.createOscillator(), mod = ctx.createOscillator(), tine = ctx.createOscillator();
    const mg = ctx.createGain(), g = ctx.createGain(), tg = ctx.createGain();
    car.frequency.value = f; mod.frequency.value = f; tine.frequency.value = f * 4;
    const index = o.helder || 1.4;
    mg.gain.setValueAtTime(f * index, t);
    mg.gain.setTargetAtTime(f * 0.15, t + 0.005, 0.09);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(sterkte, t + 0.006);
    g.gain.setTargetAtTime(sterkte * (o.hou || 0.3), t + 0.02, o.verval || 0.3);
    g.gain.setTargetAtTime(0, t + duur, 0.07);
    tg.gain.setValueAtTime(0, t);
    tg.gain.linearRampToValueAtTime(sterkte * (o.tine || 0.18), t + 0.003);
    tg.gain.setTargetAtTime(0, t + 0.004, 0.05);
    if (o.vals) {
      [car, mod, tine].forEach(x => { x.detune.setValueAtTime(o.vals[0], t); x.detune.linearRampToValueAtTime(o.vals[1], t + duur); });
    }
    mod.connect(mg); mg.connect(car.frequency);
    car.connect(g); g.connect(uit);
    tine.connect(tg); tg.connect(uit);
    const eind = t + duur + 0.45;
    [car, mod, tine].forEach(x => { x.start(t); x.stop(eind); });
    if (o.lijn) aanLijn(o.lijn, t, [car, mod, tine], [g, tg], eind);
  }
  /* zachte pad-stem: twee triangles ±5 cent (koortje) */
  function padNoot(t, f, duur, sterkte, aanzet, uit, lijnL, verval) {
    const g = ctx.createGain(), oscs = [];
    [-5, 5].forEach(c => { const x = ctx.createOscillator(); x.type = 'triangle'; x.frequency.value = f; x.detune.value = c; x.connect(g); oscs.push(x); });
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(sterkte, t + aanzet);
    if (verval) g.gain.setTargetAtTime(sterkte * 0.25, t + aanzet, verval);
    g.gain.setTargetAtTime(0, t + duur, 0.12);
    g.connect(uit);
    oscs.forEach(x => { x.start(t); x.stop(t + duur + 0.7); });
    if (lijnL) aanLijn(lijnL, t, oscs, [g], t + duur + 0.7);
  }
  function plukBas(t, f, duur, sterkte, uit, lijnL) {
    const x = ctx.createOscillator(), g = ctx.createGain();
    x.type = 'triangle'; x.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(sterkte, t + 0.01);
    g.gain.setTargetAtTime(0, t + 0.02, duur * 0.35);
    x.connect(g); g.connect(uit);
    x.start(t); x.stop(t + duur + 0.3);
    if (lijnL) aanLijn(lijnL, t, [x], [g], t + duur + 0.3);
  }
  /* koperen stoot (de 'ta-da' van een bedrijfsfilmpje) */
  function stab(t, f, duur, sterkte, uit) {
    const x = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    x.type = 'sawtooth'; x.frequency.value = f;
    lp.type = 'lowpass'; lp.Q.value = 0.8;
    lp.frequency.setValueAtTime(600, t);
    lp.frequency.linearRampToValueAtTime(2400, t + 0.04);
    lp.frequency.setTargetAtTime(900, t + 0.05, 0.15);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(sterkte, t + 0.03);
    g.gain.setTargetAtTime(sterkte * 0.45, t + 0.05, 0.2);
    g.gain.setTargetAtTime(0, t + duur, 0.08);
    x.connect(lp); lp.connect(g); g.connect(uit);
    x.start(t); x.stop(t + duur + 0.5);
  }

  /* ---------- de jingle ----------
     Speelt één keer, meteen. Geeft de duur in seconden terug (tot de laatste noot
     uitgeklonken is), of 0 als er niets klinkt: geen audio, mute, of een context die
     nog op een gebaar wacht (een jingle die pas bij de volgende tik losbarst, is erger
     dan geen jingle). */
  function jingle(opts) {
    opts = opts || {};
    if (!klaar || !vol.aan || ctx.state !== 'running') return 0;
    const vals = !!opts.vals;
    const mel = vals ? JINGLE_MEL : CHIP_MEL_SLOT;
    let laatste = -1;
    for (let i = mel.length - 1; i >= 0; i--) if (mel[i] !== null) { laatste = i; break; }
    /* de CRT-speaker: geen laag, geen glans */
    const bus = ctx.createGain(); bus.gain.value = JINGLE_NIVEAU;
    const hp = biquad('highpass', 170, 0.7), lp = biquad('lowpass', 5200, 0.7);
    bus.connect(hp); hp.connect(lp); lp.connect(musGain);
    const t0 = ctx.currentTime + 0.05;
    let t = t0, eind = t0;
    for (let i = 0; i < mel.length; i++) {
      const d = JINGLE_STAP * (i >= 32 ? 1.08 : 1);   /* de maat te veel sleept een tikje */
      if (i % 8 === 0) {
        const akk = JINGLE_AKK[i >> 3];
        const groot = i === 24 || i === mel.length - 8;
        akk.forEach(h => stab(t, 220 * Math.pow(2, h / 12), d * (groot ? 7 : 4.5), groot ? 0.026 : 0.018, bus));
      }
      if (i % 2 === 0) plukBas(t, 110 * Math.pow(2, JINGLE_AKK[i >> 3][0] / 12), d * 1.8, 0.05, bus);
      const n = mel[i];
      if (n !== null) {
        const f = 440 * Math.pow(2, n / 12);
        if (i === laatste) {
          const duur = vals ? 1.3 : 1.0;
          epiano(t, f, duur, 0.06, bus, { helder: 2.2, tine: 0.3, hou: 0.45, verval: 0.6, vals: vals ? [-30, -48] : null });
          eind = t + duur + 0.3;
        } else {
          epiano(t, f, d * 2.4, 0.06, bus, { helder: 2.2, tine: 0.3 });
        }
      }
      t += d;
    }
    const nu = ctx.currentTime;
    setTimeout(() => { try { bus.disconnect(); } catch (e) {} }, (eind - nu + 1.5) * 1000);
    return Math.round((eind - nu) * 1000) / 1000;
  }

  /* ---------- de wachtlijn ---------- */
  let lijn = null;             /* de lopende wachtlijn, of null (niemand in de wacht) */
  let wachtLaatsteToon = 0;    /* waar de lijn het laatst stond (voor de stand) */
  function zachteKnik() {      /* de lijnverzadiging: kleinsignaal-versterking 1, zacht plafond */
    const c = new Float32Array(1024);
    for (let i = 0; i < c.length; i++) { const x = i / 511.5 - 1; c[i] = 0.25 * Math.tanh(4 * x); }
    return c;
  }
  function maakLijn(toon) {
    const t = ctx.currentTime;
    const L = { toon, vast: false, weg: false, startWand: performance.now(), stap: 0, volgende: t + 0.08, noten: [], rooster: [], buig: null };
    /* de transponeerbron: één waarde in cent die ELKE oscillator van de lijn volgt
       (via detune) — zo glijden ook de noten die al klinken mee */
    if (ctx.createConstantSource) {
      L.bron = ctx.createConstantSource(); L.cent = L.bron.offset; L.bronUit = L.bron;
    } else {   /* oude Safari: een lus van enen door een gain */
      const b = ctx.createBuffer(1, 128, ctx.sampleRate); b.getChannelData(0).fill(1);
      L.bron = ctx.createBufferSource(); L.bron.buffer = b; L.bron.loop = true;
      L.bronUit = ctx.createGain(); L.bron.connect(L.bronUit); L.cent = L.bronUit.gain;
    }
    L.cent.value = toon * 100;
    L.som = ctx.createGain();
    L.bronUit.connect(L.som);
    /* het bandje wiegelt: ±7 cent op 0,45 Hz */
    L.wow = ctx.createOscillator(); L.wow.frequency.value = 0.45;
    L.wowG = ctx.createGain(); L.wowG.gain.value = 7;
    L.wow.connect(L.wowG); L.wowG.connect(L.som);
    /* de telefoonlijn: 300-3400 Hz (twee keer twee polen), een neus op 1,8 kHz, een
       zachte verzadiging en een snuifje lijnruis. Mono, zoals alles hier. */
    L.in = ctx.createGain();
    const hp1 = biquad('highpass', 300, 0.707), hp2 = biquad('highpass', 300, 0.707);
    const lp1 = biquad('lowpass', 3400, 0.707), lp2 = biquad('lowpass', 3400, 0.707);
    const neus = biquad('peaking', 1800, 0.9); neus.gain.value = 4;
    const knik = ctx.createWaveShaper(); knik.curve = zachteKnik();
    L.uit = ctx.createGain(); L.uit.gain.value = 0;
    L.in.connect(hp1); hp1.connect(hp2); hp2.connect(lp1); lp1.connect(lp2); lp2.connect(neus); neus.connect(knik); knik.connect(L.uit);
    L.ruis = ctx.createBufferSource(); L.ruis.buffer = ruisBuffer; L.ruis.loop = true;
    const rf = biquad('bandpass', 2200, 0.5), rg = ctx.createGain(); rg.gain.value = 0.0045;
    L.ruis.connect(rf); rf.connect(rg); rg.connect(lp1);   /* ook de ruis zit in de telefoonband */
    L.uit.connect(musGain);
    L.bron.start(t); L.wow.start(t); L.ruis.start(t);
    L.uit.gain.setTargetAtTime(WACHT_NIVEAU, t, 0.12);
    return L;
  }
  /* elke oscillator van een noot hangt aan de transponeerbron; los na het einde */
  function aanLijn(L, t, oscs, gains, eind) {
    oscs.forEach(x => {
      try { L.som.connect(x.detune); } catch (e) {}
      x.onended = () => { try { L.som.disconnect(x.detune); } catch (e) {} };
    });
    L.noten.push({ t, gains, oscs, eind });
  }
  /* de verwachte transpositie (halve tonen) op tijdstip t — voor het tempo */
  function toonOp(L, t) {
    const b = L.buig;
    if (b && t < b.t1) {
      if (t <= b.t0) return b.van;
      const p = (t - b.t0) / (b.t1 - b.t0);
      return b.van + (b.naar - b.van) * p * p * (3 - 2 * p);
    }
    return L.toon;
  }
  function planWacht() {
    const L = lijn;
    if (!L || L.vast || L.weg || !vol.aan) return;
    const nu = ctx.currentTime;
    if (L.volgende < nu - 0.3) L.volgende = nu + 0.05;   /* na mute of een pauze niets inhalen */
    while (L.volgende < nu + WACHT_VOORUIT) {
      const t = L.volgende;
      const d = WACHT_STAP / Math.pow(2, toonOp(L, t) / 12);   /* een trager bandje: lager én trager */
      plaatsWachtStap(L, t, L.stap, d);
      L.rooster.push({ t, stap: L.stap });
      L.volgende += d; L.stap++;
    }
    L.noten = L.noten.filter(n => n.t > nu - 4);
    L.rooster = L.rooster.filter(r => r.t > nu - 1);
  }
  function plaatsWachtStap(L, t, stap, d) {
    const i = stap % 32, maat = (i >> 3) & 3;
    if (i % 8 === 0) WACHT_PAD[maat].forEach(h => padNoot(t, 220 * Math.pow(2, h / 12), d * 8.2, 0.011, d * 1.5, L.in, L));
    if (i % 4 === 0) plukBas(t, 220 * Math.pow(2, WACHT_BAS[maat] / 12), d * 3, i % 8 === 0 ? 0.032 : 0.022, L.in, L);
    const n = WACHT_MEL[i];
    if (n !== null) epiano(t, 440 * Math.pow(2, n / 12), d * 2.2, 0.045 * (0.9 + Math.random() * 0.2), L.in, { lijn: L });
  }
  /* de vaste noot: de grondtoon (A5, op −7 een D5) + het I-akkoord, lang aangehouden */
  function vasteNoot(L, t, hou) {
    if (!vol.aan) return;
    epiano(t, 880, hou, 0.05, L.in, { lijn: L, hou: 0.2, verval: 3 });
    WACHT_PAD[0].forEach(h => padNoot(t, 220 * Math.pow(2, h / 12), hou, 0.012, 0.08, L.in, L, 4));
  }
  /* de bodem bereikt: wat na tv gepland stond valt weg, de lijn hangt op de vaste noot */
  function loopVast(L, tv) {
    L.vast = true;
    L.noten.forEach(n => {
      if (n.t < tv - 0.001) return;
      n.gains.forEach(g => { try { g.disconnect(); } catch (e) {} });
      n.oscs.forEach(x => { try { x.stop(n.t); } catch (e) {} });
    });
    vasteNoot(L, tv, 30);
    L.wowG.gain.setTargetAtTime(12, tv, 1.5);   /* het bandje blijft haken */
  }
  function sluitLijn(fade) {
    const L = lijn;
    if (!L) return false;
    lijn = null;
    L.weg = true;
    wachtLaatsteToon = L.toon;
    if (!klaar) return true;
    const t = ctx.currentTime, f = Math.max(0.02, fade || 0);
    try {
      const v = L.uit.gain.value;
      L.uit.gain.cancelScheduledValues(t);
      L.uit.gain.setValueAtTime(v, t);
      L.uit.gain.setTargetAtTime(0, t, f / 4);
    } catch (e) {}
    [L.bron, L.wow, L.ruis].forEach(x => { try { x.stop(t + f + 0.4); } catch (e) {} });
    /* ook de lange noten (de vaste noot houdt 30 s aan) niet stil laten doordraaien */
    L.noten.forEach(n => { if (n.eind > t + f + 0.4) n.oscs.forEach(x => { try { x.stop(Math.max(n.t, t + f + 0.4)); } catch (e) {} }); });
    setTimeout(() => {
      try { L.uit.disconnect(); } catch (e) {}
      L.noten.forEach(n => n.gains.forEach(g => { try { g.disconnect(); } catch (e) {} }));
    }, (f + 0.6) * 1000);
    return true;
  }
  /* -7 is de bodem: dieper bestaat niet (daar hangt de lijn, en daar hervat de outro) */
  function klemToon(n) { n = Number(n); return Math.max(WACHT_BODEM, Math.min(12, isFinite(n) ? n : 0)); }

  /* n halve tonen t.o.v. de oorspronkelijke toonhoogte (absoluut: -1, -2 … -7).
     Glijdt in ±120 ms; op −7 (de bodem, lager wordt −7) loopt de lijn vast op de vaste noot. */
  function transponeer(n) {
    n = klemToon(n);
    wachtLaatsteToon = n;
    const L = lijn;
    if (!L || L.weg || !klaar) return false;
    const t = ctx.currentTime;
    L.toon = n; L.buig = null;
    try {
      const v = L.cent.value;
      L.cent.cancelScheduledValues(t);
      L.cent.setValueAtTime(v, t);
      L.cent.setTargetAtTime(n * 100, t, 0.035);   /* 97 % na 120 ms */
    } catch (e) {}
    if (n <= WACHT_BODEM && !L.vast) {
      /* de eerste achtste NA het glijden: de vaste noot valt op de maat */
      const plek = L.rooster.find(r => r.t >= t + 0.13 && r.stap % 2 === 0);
      loopVast(L, plek ? plek.t : Math.max(L.volgende, t + 0.13));
    }
    return true;
  }
  function wachtStart(opts) {
    opts = opts || {};
    init();
    if (!klaar) return false;
    const n = klemToon(opts.transponeer || 0);
    if (lijn && !lijn.weg) { transponeer(n); return true; }   /* al in de wacht */
    lijn = maakLijn(n);
    wachtLaatsteToon = n;
    if (n <= WACHT_BODEM) loopVast(lijn, lijn.volgende);
    else planWacht();
    return true;
  }
  /* de outro: hervat op −n (dezelfde vaste noot als waar de proloog ophing) en buig
     (opts.buig) in opts.duur (3 s) omhoog naar 0, tempo mee — het bandje komt op toeren */
  function wachtHervat(n, opts) {
    opts = opts || {};
    init();
    if (!klaar) return false;
    n = Math.min(12, Math.abs(Number(n) || 0));
    if (lijn) sluitLijn(0.08);
    const L = lijn = maakLijn(-n);
    const t = ctx.currentTime + 0.05;
    vasteNoot(L, t, 1.1);
    L.volgende = t + 0.9; L.stap = 0;
    if (opts.buig && n > 0) {
      const duur = typeof opts.duur === 'number' && opts.duur > 0 ? opts.duur : 3;
      const t0 = t + 0.6;
      L.buig = { t0, t1: t0 + duur, van: -n, naar: 0 };
      /* smoothstep in 24 lineaire stukjes (geen setValueCurve: dat laat zich in
         Firefox niet netjes afbreken als transponeer() tussenkomt) */
      L.cent.setValueAtTime(-n * 100, t0);
      for (let k = 1; k <= 24; k++) { const p = k / 24; L.cent.linearRampToValueAtTime((-n + n * p * p * (3 - 2 * p)) * 100, t0 + duur * p); }
      L.toon = 0;
    }
    wachtLaatsteToon = L.toon;
    planWacht();
    return true;
  }

  /* ---------- de stilte ----------
     Alles zacht weg (±0,15 s), ms stilte, en in 0,35 s weer terug. Doet niets (false)
     als audio geblokkeerd is: een stilte die pas na de volgende tik valt, klopt niet. */
  function stilte(ms) {
    if (!klaar || ctx.state !== 'running') return false;
    const s = Math.max(0, Math.min(10000, Number(ms) || 0)) / 1000;
    if (lijn) sluitLijn(0.15);   /* de verbinding is verbroken: de wachtlijn komt niet terug */
    const t = ctx.currentTime, p = stilGain.gain;
    const v = p.value;
    p.cancelScheduledValues(t);
    p.setValueAtTime(v, t);
    p.setTargetAtTime(0, t, 0.035);
    p.setValueAtTime(0, t + s);
    p.linearRampToValueAtTime(1, t + s + 0.35);
    return true;
  }

  const wacht = {
    start: wachtStart,
    stop(opts) { return sluitLijn(opts && typeof opts.fade === 'number' ? opts.fade : 0.6); },
    transponeer,
    /* alleen-lezen: { actief, toon (halve tonen), vast (op de vaste noot) } */
    get stand() { return { actief: !!lijn, toon: lijn ? lijn.toon : wachtLaatsteToon, vast: !!(lijn && lijn.vast) }; }
  };

  /* ---------- de koppeling voor de proloog (R1) ----------
     De proloog (proloog/audio.js) maakt geen eigen AudioContext meer: ze bouwt haar
     klanken op DEZE context en stuurt ze door een eigen bus, zodat de game-mute en de
     schuiven ook voor haar gelden. Roept init() aan: zonder gebaar ontstaat de context
     'suspended' en hervat hij bij de eerstvolgende tik (zie Klank.hervat in game.js).
     Geeft altijd een object terug; ctx/uit zijn null als Web Audio ontbreekt. */
  let koppelSfx = null, koppelMuz = null;
  function koppel() {
    init();
    if (!klaar) return { ctx: null, uit: null, bus: null, muziekUit: null, sfx, muziek };
    if (!koppelSfx) { koppelSfx = ctx.createGain(); koppelSfx.connect(sfxGain); }
    if (!koppelMuz) { koppelMuz = ctx.createGain(); koppelMuz.connect(musGain); }
    return { ctx, uit: koppelSfx, bus: koppelSfx, muziekUit: koppelMuz, sfx, muziek };
  }

  /* ---------- publiek ---------- */
  return {
    init, hervat, sfx, muziek, duck, zetDuister, zetChipLagen, koppel,
    jingle, wacht, wachtHervat, stilte,
    zetTransponeer: transponeer,   /* de naam uit het plan (§4), zelfde functie als wacht.transponeer */
    get klaar() { return klaar; },
    get vol() { return vol; },
    zet(sleutel, waarde) { vol[sleutel] = waarde; bewaar(); pasVolumesToe(); },
    get huidigeScene() { return scene; }
  };
})();
window.Klank = Klank;
