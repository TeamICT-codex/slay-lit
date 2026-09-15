// STAP A (v120) - A11: de drie nieuwe SFX (hamer / dreun / inzakken) meten op een analyser
// die achter de compressor hangt. Een onbekende naam MOET stil zijn, geen fout (audio.js sfx()).
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const WT = process.env.SLAYIT_WORKTREE || 'C:/Users/Thomas Aelbrecht/Desktop/Workspace/SLAY-IT-drama';
const HOST = 'localhost:4182';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const slaap = ms => new Promise(r => setTimeout(r, ms));
let okN = 0, foutN = 0;
const t = (goed, tekst) => { if (goed) { okN++; console.log('   ok   ' + tekst); } else { foutN++; console.log('   FOUT ' + tekst); } };

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  const page = await ctx.newPage(); const fouten = [];
  page.on('pageerror', e => fouten.push(e.message));
  await page.addInitScript(() => {
    /* een analyser meeknopen op alles wat naar de destination gaat (= na de compressor) */
    const orig = AudioNode.prototype.connect;
    window.__an = null;
    AudioNode.prototype.connect = function (dest, ...rest) {
      try {
        if (dest && dest.constructor && dest.constructor.name === 'AudioDestinationNode') {
          if (!window.__an) { window.__an = this.context.createAnalyser(); window.__an.fftSize = 2048; }
          orig.call(this, window.__an);
        }
      } catch (e) {}
      return orig.call(this, dest, ...rest);
    };
  });
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url()); if (u.host !== HOST) return route.abort();
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
    const f = path.join(WT, rel.split('/').join(path.sep));
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ status: 200, contentType: MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(f) });
    return route.fulfill({ status: 404, body: 'weg' });
  });
  await page.goto('http://' + HOST + '/', { waitUntil: 'load' });
  await slaap(400);
  const start = await page.evaluate(async () => {
    Klank.vol.aan = true; Klank.zet('sfx', 1); Klank.zet('muziek', 0);
    Klank.init(); Klank.hervat();
    await new Promise(r => setTimeout(r, 400));
    Klank.muziek('stil');
    return { klaar: Klank.klaar, analyser: !!window.__an, state: window.__an ? window.__an.context.state : null, rate: window.__an ? window.__an.context.sampleRate : null };
  });
  t(start.klaar && start.analyser && start.state === 'running', `audio-engine draait: klaar=${start.klaar}, analyser=${start.analyser}, ctx.state=${start.state} @ ${start.rate}Hz`);

  const meet = async naam => page.evaluate(async naam => {
    const an = window.__an;
    const tijd = new Uint8Array(an.fftSize), freq = new Uint8Array(an.frequencyBinCount);
    const rate = an.context.sampleRate;
    await new Promise(r => setTimeout(r, 260));           // stilte laten inzakken
    let rust = 0;
    for (let i = 0; i < 6; i++) { an.getByteTimeDomainData(tijd); for (const v of tijd) rust = Math.max(rust, Math.abs(v - 128)); await new Promise(r => setTimeout(r, 16)); }
    Klank.sfx(naam);
    let piek = 0, piekMs = 0, bandPiek = 0, bandHz = 0, laatsteBoven = 0;
    const t0 = performance.now();
    while (performance.now() - t0 < 1500) {
      an.getByteTimeDomainData(tijd);
      let p = 0; for (const v of tijd) p = Math.max(p, Math.abs(v - 128));
      if (p > piek) { piek = p; piekMs = Math.round(performance.now() - t0); }
      if (p > 4) laatsteBoven = Math.round(performance.now() - t0);
      an.getByteFrequencyData(freq);
      for (let i = 1; i < freq.length; i++) if (freq[i] > bandPiek) { bandPiek = freq[i]; bandHz = Math.round(i * rate / an.fftSize); }
      await new Promise(r => requestAnimationFrame(r));
    }
    return { naam, rust, piek, piekMs, staartMs: laatsteBoven, bandHz, bandPiek };
  }, naam);

  console.log('\n== A11 · de drie nieuwe SFX op de analyser ==');
  for (const naam of ['hamer', 'dreun', 'inzakken']) {
    const m = await meet(naam);
    t(m.piek >= 20, `Klank.sfx('${naam}'): piek ${m.piek}/127 op t=${m.piekMs}ms (rust voor de klap ${m.rust}), hoorbaar tot t=${m.staartMs}ms, sterkste band ~${m.bandHz}Hz (${m.bandPiek}/255)`);
  }
  const bestaande = await meet('zwareklap');
  t(bestaande.piek >= 20, `ijkpunt Klank.sfx('zwareklap') (bestaand): piek ${bestaande.piek}/127 op t=${bestaande.piekMs}ms`);
  const onbekend = await meet('bestaat_niet_ronde_v120');
  t(onbekend.piek <= 4, `een ONBEKENDE naam is stil, geen fout: piek ${onbekend.piek}/127 (rust ${onbekend.rust})`);
  t(fouten.length === 0, fouten.length ? 'PAGINAFOUTEN: ' + fouten.join(' | ') : 'geen paginafouten');
  console.log(`\n============================================\nSTAP A AUDIO: ${okN} ok, ${foutN} FOUT\n============================================`);
  await ctx.close(); await browser.close();
  process.exit(foutN ? 1 : 0);
})();
