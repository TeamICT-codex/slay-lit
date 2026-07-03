/* ============================================================
   SLAY LIT — Vista: Three.js strijdtoneel
   Kerkerzaal met fakkels, mist en stof; acteurs als billboard-
   sprites (SVG-karakter-art met knipperende ogen en uitval-
   animaties). Eigen achtergrondplaten uit assets/achtergronden/
   worden automatisch opgepakt. UI blijft DOM.
   ============================================================ */

const Vista = (() => {
  let renderer = null, scene = null, camera = null;
  let kijkY = 1.8;              /* camerablik: hoger bij eigen platen = figuren lager in beeld */
  let klaar = false, actief = false;
  let acteurs = new Map();      /* actor-object -> sprite-info */
  let fakkels = [], vlammen = [], stof = null;
  let zaalGroep = null;         /* vloer/wand/pilaren/fakkels — verborgen bij eigen plaat */
  let ambientLicht = null;
  let lichtDoel = 1, lichtNu = 1; /* fakkelniveau van het spel: 1 = helder */
  let kick = 0, tijd = 0;

  function beschikbaar() {
    if (!window.THREE) return false;
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (e) { return false; }
  }

  /* ---------- opbouw van de zaal ---------- */
  function start(canvas) {
    if (klaar || !beschikbaar()) return klaar;
    /* antialias is duur op mobiele GPU's en alleen bij creatie instelbaar;
       op laptop (window.mobiel=false) blijft het gewoon aan */
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !window.mobiel, alpha: true });
    renderer.setClearColor(0x0d0a12, 1);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0d0a12, 0.045);

    camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 60);
    camera.position.set(0, 2.6, 8.8);
    camera.lookAt(0, kijkY, 0);

    /* de procedurele zaal — wordt in zijn geheel verborgen wanneer
       een eigen achtergrondplaat fullscreen achter het canvas staat */
    zaalGroep = new THREE.Group();

    const vloer = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 22),
      new THREE.MeshStandardMaterial({ map: tegelTextuur(), roughness: 0.95 })
    );
    vloer.rotation.x = -Math.PI / 2;
    zaalGroep.add(vloer);

    const wand = new THREE.Mesh(
      new THREE.PlaneGeometry(44, 16),
      new THREE.MeshStandardMaterial({ map: wandTextuur(), roughness: 1 })
    );
    wand.position.set(0, 7, -8);
    zaalGroep.add(wand);
    [-3.4, 3.4].forEach(x => {
      const vaandel = new THREE.Mesh(
        new THREE.PlaneGeometry(1.7, 3.4),
        new THREE.MeshStandardMaterial({ map: vaandelTextuur(), transparent: true, roughness: 1 })
      );
      vaandel.position.set(x, 5.4, -7.55);
      zaalGroep.add(vaandel);
    });

    [-8.5, -4.8, 4.8, 8.5].forEach(x => {
      const pilaar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.65, 11, 10),
        new THREE.MeshStandardMaterial({ color: 0x2b2138, roughness: 0.9 })
      );
      pilaar.position.set(x, 5.5, -5);
      zaalGroep.add(pilaar);
    });

    ambientLicht = new THREE.AmbientLight(0x4a3a66, 0.55);
    scene.add(ambientLicht);
    [[-5.6, 3.6, -3], [5.6, 3.6, -3]].forEach(p => {
      const licht = new THREE.PointLight(0xff8c3f, 1.5, 20, 1.6);
      licht.position.set(...p);
      zaalGroep.add(licht);
      fakkels.push(licht);
      const vlam = new THREE.Sprite(new THREE.SpriteMaterial({
        map: gloedTextuur(), color: 0xffa850, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      vlam.position.set(p[0], p[1] + 0.1, p[2]);
      vlam.scale.set(1.6, 2.1, 1);
      zaalGroep.add(vlam);
      vlammen.push(vlam);
    });

    scene.add(zaalGroep);

    /* zwevend stof */
    const n = 140, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = Math.random() * 7;
      pos[i * 3 + 2] = -6 + Math.random() * 9;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    stof = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffb070, size: 0.055, transparent: true, opacity: 0.45,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    scene.add(stof);

    window.addEventListener('resize', resize);
    resize();
    klaar = true;
    return true;
  }

  function resize() {
    if (!renderer) return;
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    /* pixelratio kan wijzigen (ander scherm / zoom); CSS bepaalt de weergavegrootte.
       Op mobiel cappen we strakker (1.0) — fillrate is daar de grootste kost. */
    const ratioCap = window.mobiel ? 1 : 1.5;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, ratioCap));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ---------- procedurele textures ---------- */
  function tegelTextuur() {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const x = c.getContext('2d');
    x.fillStyle = '#221a2e'; x.fillRect(0, 0, 512, 512);
    x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 3;
    for (let r = 0; r < 8; r++) {
      for (let k = 0; k < 8; k++) {
        const v = 18 + Math.random() * 14;
        x.fillStyle = `rgb(${v + 12},${v + 4},${v + 20})`;
        x.fillRect(k * 64 + 2, r * 64 + 2, 60, 60);
        x.strokeRect(k * 64 + 2, r * 64 + 2, 60, 60);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 2);
    return t;
  }

  function wandTextuur() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 384;
    const x = c.getContext('2d');
    x.fillStyle = '#18121f'; x.fillRect(0, 0, 1024, 384);
    /* vage steenlagen */
    x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2;
    for (let r = 0; r < 8; r++) {
      const y = r * 48;
      x.beginPath(); x.moveTo(0, y); x.lineTo(1024, y); x.stroke();
      for (let k = 0; k < 10; k++) {
        const vx = ((k + (r % 2 ? 0.5 : 0)) * 102) % 1024;
        x.beginPath(); x.moveTo(vx, y); x.lineTo(vx, y + 48); x.stroke();
      }
    }
    /* drie donkere nissen met bogen; in de middelste gloeit iets */
    [[512, true], [212, false], [812, false]].forEach(([bx, gloed]) => {
      x.fillStyle = '#0c0813';
      x.beginPath();
      x.moveTo(bx - 64, 384); x.lineTo(bx - 64, 180);
      x.quadraticCurveTo(bx, 96, bx + 64, 180);
      x.lineTo(bx + 64, 384); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(120,100,150,.25)'; x.lineWidth = 5; x.stroke();
      if (gloed) {
        const g = x.createRadialGradient(bx, 300, 8, bx, 300, 100);
        g.addColorStop(0, 'rgba(140,90,200,.4)');
        g.addColorStop(1, 'rgba(140,90,200,0)');
        x.fillStyle = g; x.fillRect(bx - 100, 180, 200, 204);
      }
    });
    return new THREE.CanvasTexture(c);
  }

  function vaandelTextuur() {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    const x = c.getContext('2d');
    x.clearRect(0, 0, 128, 256);
    /* banier met punt onderaan */
    x.fillStyle = '#5e1c2e';
    x.beginPath();
    x.moveTo(8, 0); x.lineTo(120, 0); x.lineTo(120, 190);
    x.lineTo(64, 246); x.lineTo(8, 190); x.closePath(); x.fill();
    x.strokeStyle = '#c89a4a'; x.lineWidth = 6; x.stroke();
    /* zwaard-embleem */
    x.strokeStyle = '#e8c87a'; x.lineWidth = 8; x.lineCap = 'round';
    x.beginPath(); x.moveTo(64, 60); x.lineTo(64, 160); x.stroke();
    x.beginPath(); x.moveTo(40, 88); x.lineTo(88, 88); x.stroke();
    x.fillStyle = '#e8c87a';
    x.beginPath(); x.arc(64, 176, 8, 0, 7); x.fill();
    return new THREE.CanvasTexture(c);
  }

  /* GEDEELD en gecachet (zoals schaduwTextuur): elke stofwolk-poef maakte vroeger
     z'n eigen CanvasTexture die nooit gedisposed werd → GPU-textuur-lek per
     sterfgeval, het hele gevecht/de hele sessie lang. */
  let gloedTex = null;
  function gloedTextuur() {
    if (gloedTex) return gloedTex;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(255,230,170,1)');
    g.addColorStop(0.35, 'rgba(255,150,60,.55)');
    g.addColorStop(1, 'rgba(255,120,40,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    gloedTex = new THREE.CanvasTexture(c);
    return gloedTex;
  }

  /* gedeelde doorzichtige placeholder: materialen starten altijd MET een map,
     zodat het zetten van de echte texture geen shader-hercompilatie afdwingt */
  let leegTex = null;
  function leegTextuur() {
    if (leegTex) return leegTex;
    const c = document.createElement('canvas');
    c.width = c.height = 2;
    leegTex = new THREE.CanvasTexture(c);
    return leegTex;
  }

  let schaduwTex = null;
  function schaduwTextuur() {
    if (schaduwTex) return schaduwTex;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(0,0,0,.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    schaduwTex = new THREE.CanvasTexture(c);
    return schaduwTex;
  }

  function emojiTextuur(teken, spiegel) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    if (spiegel) { x.translate(256, 0); x.scale(-1, 1); }
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 18; x.shadowOffsetY = 10;
    x.font = '180px "Segoe UI Emoji", serif';
    x.fillText(teken, 128, 138);
    return new THREE.CanvasTexture(c);
  }

  /* SVG-karakter-art -> texture (asynchroon) */
  function svgTextuur(svgStr, cb) {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' }));
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 512;
      c.getContext('2d').drawImage(img, 0, 0, 512, 512);
      URL.revokeObjectURL(url);
      cb(new THREE.CanvasTexture(c));
    };
    img.onerror = () => { URL.revokeObjectURL(url); cb(null); };
    img.src = url;
  }

  /* ---------- acteurs ---------- */
  function maakActeur(sleutel, artId, valTerug, x, z, schaal) {
    const mat = new THREE.SpriteMaterial({ map: leegTextuur(), transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(schaal, schaal, 1);
    sprite.position.set(x, schaal / 2 + 0.05, z);
    scene.add(sprite);

    /* zachte grondschaduw zodat de figuren echt 'staan' */
    const schaduwMat = new THREE.MeshBasicMaterial({
      map: schaduwTextuur(), transparent: true, depthWrite: false
    });
    const schaduw = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), schaduwMat);
    schaduw.rotation.x = -Math.PI / 2;
    schaduw.scale.set(schaal * 0.85, schaal * 0.4, 1);
    schaduw.position.set(x, 0.02, z);
    scene.add(schaduw);

    const a = {
      sprite, mat, schaal, schaduw, schaduwMat,
      basisX: x, basisY: schaal / 2 + 0.05, fase: Math.random() * 6.28,
      flits: 0, dood: false, weg: 0,
      frames: null, knipperTot: 0, volgendeKnipper: tijd + 1.5 + Math.random() * 3,
      uitval: null,
      /* slijmen wiebelen merkbaar, de rest ademt subtiel */
      wiebel: artId.includes('slijm') ? 0.045 : 0.016,
      valKant: 0, poefGedaan: false,
      stateTex: {}, pose: null, poseTot: 0,
      entree: null
    };
    acteurs.set(sleutel, a);

    /* entree: nieuwkomers glijden vanuit het duister het toneel op
       (eenmalig per wezen — bij een herbouw blijven ze gewoon staan) */
    if (!sleutel.entreeGedaan) {
      sleutel.entreeGedaan = true;
      const vanLinks = !!sleutel.isSpeler;
      a.entree = { t: -(vanLinks ? 0 : 0.12 + Math.random() * 0.3), kant: vanLinks ? -1 : 1 };
      a.sprite.visible = false;
      a.schaduw.visible = false;
    }

    /* optionele state-afbeeldingen: <artId>_<state>.png (bv. speler_attack.png) */
    if (window.laadKarakterAfbeelding) {
      const states = ['attack', 'hit', 'death', 'poison', 'block', 'victory', 'cast', 'wounded'];
      /* signature-kaarten hebben een eigen pose (alleen helden) */
      if (sleutel.isSpeler) states.push('beulswerk', 'moederslang', 'flame');
      states.forEach(st => {
        laadKarakterAfbeelding(artId + '_' + st, img => {
          if (!img || !sprite.parent) return;
          const tex = new THREE.Texture(img);
          tex.needsUpdate = true;
          a.stateTex[st] = tex;
        });
      });
    }

    /* art laden, in volgorde van voorkeur:
       1. eigen PNG uit assets/karakters/  2. ingebouwde SVG  3. emoji
       (weg = het gevecht is intussen al opgeruimd: niets meer doen) */
    const weg = () => !sprite.parent;
    const zetEmoji = () => {
      if (weg()) return;
      mat.map = emojiTextuur(valTerug.teken, valTerug.spiegel);
      a.stateTex.idle = mat.map;
    };
    const zetSvg = () => {
      if (!(window.karakterSvg && KARAKTER_ART[artId])) { zetEmoji(); return; }
      svgTextuur(karakterSvg(artId, { dicht: false }), open => {
        if (weg()) return;
        if (!open) { zetEmoji(); return; }
        mat.map = open;
        a.stateTex.idle = open;
        a.frames = { open, dicht: open };
        svgTextuur(karakterSvg(artId, { dicht: true }), dichtTex => {
          if (dichtTex && a.frames && !weg()) a.frames.dicht = dichtTex;
        });
      });
    };
    if (window.laadKarakterAfbeelding) {
      laadKarakterAfbeelding(artId, img => {
        if (weg()) return;
        if (img) {
          const tex = new THREE.Texture(img);
          tex.needsUpdate = true;
          mat.map = tex;
          a.stateTex.idle = tex;
        } else zetSvg();
      });
    } else zetSvg();
  }

  function gevechtStart(g, soort, eigenAchtergrond) {
    if (!klaar) return;
    gevechtEind();
    /* eigen plaat fullscreen achter het canvas? dan de zaal weg en doorzichtig renderen */
    zaalGroep.visible = !eigenAchtergrond;
    renderer.setClearColor(0x0d0a12, eigenAchtergrond ? 0 : 1);
    /* bij een geschilderde plaat kijkt de camera hoger, zodat de figuren
       lager in beeld staan — op de vloer van de plaat, niet zwevend erboven */
    kijkY = eigenAchtergrond ? 2.35 : 1.8;
    maakActeur(g.speler, g.heldArt || 'speler', { teken: '🤺', spiegel: true }, -3.7, 0.4, 2.5);
    /* enkel LEVENDE vijanden als sprite opbouwen: dode blijven in g.vijanden staan (v.dood=true,
       voor de sterft-fade), maar een herbouw (voegVijandToe — Doorslag-kopie / Mal-gietsel) mag een
       reeds afgemaakte vijand NIET opnieuw als sprite tonen. De DOM verbergt 'm wel (sterft=opacity 0),
       Vista's three.js-sprite niet → dit was de 'dode vijand herrijst'-bug. */
    const levend = g.vijanden.filter(v => !v.dood);
    const n = levend.length;
    levend.forEach((v, i) => {
      const def = VIJANDEN[v.id];
      const schaal = def.baas ? 4.4 : (def.elite ? 3.3 : 2.4);
      const x = n === 1 ? 3.1 : 1.1 + i * (3.9 / (n - 1));
      const z = (i % 2) * 0.8 - 0.4;
      maakActeur(v, v.id, { teken: def.art, spiegel: false }, x, z, schaal);
    });
    actief = true;
  }

  function gevechtEind() {
    for (const a of acteurs.values()) {
      scene.remove(a.sprite);
      scene.remove(a.schaduw);
      /* de gedeelde placeholder nooit weggooien */
      if (a.mat.map && a.mat.map !== leegTex) a.mat.map.dispose();
      if (a.frames) {
        if (a.frames.open && a.frames.open !== a.mat.map) a.frames.open.dispose();
        if (a.frames.dicht && a.frames.dicht !== a.mat.map && a.frames.dicht !== a.frames.open) a.frames.dicht.dispose();
      }
      for (const st of Object.keys(a.stateTex)) {
        const t = a.stateTex[st];
        if (t && t !== a.mat.map && t !== leegTex
            && !(a.frames && (t === a.frames.open || t === a.frames.dicht))) t.dispose();
      }
      a.mat.dispose();
      a.schaduwMat.dispose();
      a.schaduw.geometry.dispose();   /* elke schaduw heeft z'n eigen PlaneGeometry — anders lekt er GPU-buffer per acteur per gevecht */
    }
    acteurs.clear();
    for (const p of poefjes) {
      scene.remove(p.punten);
      p.geo.dispose(); p.mat.dispose();
    }
    poefjes.length = 0;
    actief = false;
  }

  function raak(actor, zwaar) {
    const a = acteurs.get(actor);
    if (a) a.flits = 1;
    kick = Math.min(1, kick + (zwaar ? 0.7 : 0.3));
  }

  /* tijdelijke pose tonen (block/victory/cast) als die afbeelding bestaat */
  function pose(actor, naam, duur) {
    const a = acteurs.get(actor);
    if (!a) return;
    a.pose = naam;
    a.poseTot = tijd + (duur || 0.8);
  }

  /* uitval richting het doelwit */
  function aanval(bron, doel) {
    const a = acteurs.get(bron), b = acteurs.get(doel);
    if (!a || a.dood) return;
    const richting = b ? (b.basisX - a.basisX) : (a.basisX < 0 ? 4 : -4);
    const dx = Math.max(-2.2, Math.min(2.2, richting * 0.3));
    a.uitval = { t: 0, dx };
  }

  function sterf(actor) {
    const a = acteurs.get(actor);
    if (a && !a.dood) {
      a.dood = true;
      a.valKant = (Math.random() < 0.5 ? -1 : 1) * (0.45 + Math.random() * 0.35);
      kick = Math.min(1, kick + 0.5);
    }
  }

  /* stofwolk-"poef" bij een sterfgeval */
  const poefjes = [];
  function spawnPoef(x, y, z) {
    const n = 16, pos = new Float32Array(n * 3), snel = [];
    for (let i = 0; i < n; i++) {
      pos[i * 3] = x + (Math.random() - 0.5) * 0.5;
      pos[i * 3 + 1] = y + Math.random() * 0.9;
      pos[i * 3 + 2] = z;
      snel.push([(Math.random() - 0.5) * 2.4, Math.random() * 2 + 0.6]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: gloedTextuur(), color: 0xb9a8e8, size: 0.18,
      transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const punten = new THREE.Points(geo, mat);
    scene.add(punten);
    poefjes.push({ punten, geo, mat, snel, t: 0 });
  }

  /* ---------- animatielus (aangeroepen vanuit de speltikker) ---------- */
  function tik(dt) {
    if (!klaar || !actief) return;
    tijd += dt;

    /* fakkelniveau van het spel: geleidelijk dimmen/opvlammen */
    lichtNu += (lichtDoel - lichtNu) * Math.min(1, dt * 2);
    if (ambientLicht) ambientLicht.intensity = 0.55 * (0.3 + 0.7 * lichtNu);

    fakkels.forEach((f, i) => {
      f.intensity = (1.35 + Math.sin(tijd * 9 + i * 2.4) * 0.18 + Math.random() * 0.16) * lichtNu;
    });
    vlammen.forEach((v, i) => {
      const s = (1.5 + Math.sin(tijd * 7 + i) * 0.18) * (0.4 + 0.6 * lichtNu);
      v.scale.set(s, s * 1.35, 1);
      v.material.opacity = Math.min(1, 0.2 + lichtNu);
    });

    const sp = stof.geometry.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      let y = sp.getY(i) + dt * 0.16;
      if (y > 7) y = 0;
      sp.setY(i, y);
    }
    sp.needsUpdate = true;

    for (const [actor, a] of acteurs) {
      if (a.dood) {
        /* dood: stofwolk, omvallen, wegzakken en vervagen */
        if (a.stateTex.death && a.mat.map !== a.stateTex.death) a.mat.map = a.stateTex.death;
        if (!a.poefGedaan) {
          a.poefGedaan = true;
          spawnPoef(a.sprite.position.x, a.basisY, a.sprite.position.z);
        }
        a.weg = Math.min(1, a.weg + dt * 1.4);
        a.mat.opacity = 1 - a.weg;
        a.sprite.position.y = a.basisY - a.weg * 0.9;
        a.mat.rotation = a.weg * (a.valKant || 0.5);
        a.sprite.scale.set(a.schaal * (1 - a.weg * 0.12), a.schaal * (1 - a.weg * 0.3), 1);
        a.schaduwMat.opacity = 1 - a.weg;
        a.schaduw.scale.set(a.schaal * 0.85 * (1 - a.weg * 0.6), a.schaal * 0.4 * (1 - a.weg * 0.6), 1);
        if (a.weg >= 1) { a.sprite.visible = false; a.schaduw.visible = false; }
        continue;
      }

      /* entree: vanuit het donker aanglijden, huppeltje, poef bij de landing */
      if (a.entree) {
        const e = a.entree;
        e.t += dt / 0.6;
        if (e.t < 0) continue;            /* gespreide opkomst */
        a.sprite.visible = true;
        a.schaduw.visible = true;
        const p = Math.min(1, e.t);
        const zacht = 1 - Math.pow(1 - p, 3);
        a.sprite.position.x = a.basisX + e.kant * 4.4 * (1 - zacht);
        a.sprite.position.y = a.basisY + Math.abs(Math.sin(p * Math.PI * 2.5)) * 0.12 * (1 - p);
        a.schaduw.position.x = a.sprite.position.x;
        a.mat.opacity = Math.min(1, p / 0.3);
        a.schaduwMat.opacity = Math.min(1, p / 0.3);
        if (p >= 1) {
          a.entree = null;
          a.mat.opacity = 1;
          a.schaduwMat.opacity = 1;
          spawnPoef(a.basisX, a.basisY * 0.35, a.sprite.position.z);
        }
        continue;                         /* tijdens de entree geen andere animatie */
      }

      /* state-afbeelding kiezen (alleen aanwezig als de maker hem leverde) */
      let st = 'idle';
      if (a.flits > 0.35) st = 'hit';
      else if (a.uitval && a.uitval.t < 0.7) st = 'attack';
      else if (a.poseTot && tijd < a.poseTot && a.pose) st = a.pose;
      else if (actor.status && (actor.status.gif || 0) > 0) st = 'poison';
      else if (actor.isSpeler && window.S && S.maxHp && S.hp / S.maxHp < 0.3) st = 'wounded';

      if (st !== 'idle' && a.stateTex[st]) {
        if (a.mat.map !== a.stateTex[st]) a.mat.map = a.stateTex[st];
        a.knipperTot = 0;
      } else if (a.frames) {
        /* idle: knipperen (SVG-art) */
        if (a.stateTex.idle && a.mat.map !== a.frames.open && a.mat.map !== a.frames.dicht) {
          a.mat.map = a.frames.open;
        }
        if (a.knipperTot && tijd > a.knipperTot) {
          a.mat.map = a.frames.open;
          a.knipperTot = 0;
        } else if (!a.knipperTot && tijd > a.volgendeKnipper) {
          a.mat.map = a.frames.dicht;
          a.knipperTot = tijd + 0.13;
          a.volgendeKnipper = tijd + 2.2 + Math.random() * 3.6;
        }
      } else if (a.stateTex.idle && a.mat.map !== a.stateTex.idle) {
        a.mat.map = a.stateTex.idle;
      }

      /* squash & stretch: idle-adem (slijmen wiebelen extra) */
      let sx = 1 + Math.sin(tijd * 2.2 + a.fase) * a.wiebel;
      let sy = 1 - Math.sin(tijd * 2.2 + a.fase) * a.wiebel * 1.2;
      let offX = 0, rot = 0;

      /* aanval in drie fases: aanloop -> uithaal -> herstel */
      if (a.uitval) {
        a.uitval.t += dt / 0.55;
        const t = a.uitval.t, dx = a.uitval.dx;
        if (t >= 1) a.uitval = null;
        else if (t < 0.35) {
          const f = t / 0.35;                    /* terugdeinzen + samenpersen */
          offX -= dx * 0.45 * Math.sin(f * Math.PI / 2);
          sx *= 1 + 0.07 * f; sy *= 1 - 0.09 * f;
          rot -= 0.06 * f * Math.sign(dx);
        } else if (t < 0.62) {
          const f = (t - 0.35) / 0.27;           /* naar voren, uitgerekt */
          const e = 1 - Math.pow(1 - f, 3);
          offX += dx * (1.65 * e - 0.45);
          sx *= 1 + 0.12 * Math.sin(f * Math.PI);
          sy *= 1 - 0.07 * Math.sin(f * Math.PI);
          rot += 0.1 * Math.sin(f * Math.PI) * Math.sign(dx);
        } else {
          const f = (t - 0.62) / 0.38;           /* terug naar de basis */
          offX += dx * 1.2 * (1 - f * f);
        }
      }

      /* geraakt: flits + schudden + ineenkrimpen */
      if (a.flits > 0) {
        a.flits = Math.max(0, a.flits - dt * 4.5);
        a.mat.color.setRGB(1, 1 - a.flits * 0.75, 1 - a.flits * 0.75);
        offX += Math.sin(a.flits * 40) * 0.1 * a.flits;
        sx *= 1 + 0.1 * a.flits;
        sy *= 1 - 0.13 * a.flits;
        rot += 0.07 * a.flits;
      } else if (actor.status && (actor.status.gif || 0) > 0) {
        /* vergiftigd: zachte groene tint */
        a.mat.color.setRGB(0.78, 1, 0.74);
      } else {
        a.mat.color.setRGB(1, 1, 1);
      }

      a.sprite.scale.set(a.schaal * sx, a.schaal * sy, 1);
      a.mat.rotation = rot;
      /* voeten blijven geplant: bij samenpersen zakt het middelpunt mee */
      a.sprite.position.y = a.basisY + Math.sin(tijd * 2 + a.fase) * 0.06 - (1 - sy) * a.schaal / 2;
      a.sprite.position.x = a.basisX + offX;
      a.schaduw.position.x = a.basisX + offX;
      a.schaduw.scale.set(a.schaal * 0.85 * sx, a.schaal * 0.4, 1);
    }

    /* poef-deeltjes: opstijgen, uitwaaieren, vervagen */
    for (let i = poefjes.length - 1; i >= 0; i--) {
      const p = poefjes[i];
      p.t += dt / 0.7;
      const att = p.geo.attributes.position;
      for (let j = 0; j < att.count; j++) {
        att.setX(j, att.getX(j) + p.snel[j][0] * dt);
        att.setY(j, att.getY(j) + p.snel[j][1] * dt);
        p.snel[j][1] -= dt * 2.4;
      }
      att.needsUpdate = true;
      p.mat.opacity = 0.85 * Math.max(0, 1 - p.t);
      if (p.t >= 1) {
        scene.remove(p.punten);
        p.geo.dispose(); p.mat.dispose();
        poefjes.splice(i, 1);
      }
    }

    /* camera: trage zwaai + schudden bij klappen */
    kick *= Math.pow(0.002, dt);
    camera.position.x = Math.sin(tijd * 0.3) * 0.18 + (Math.random() - 0.5) * 0.3 * kick;
    camera.position.y = 2.6 + Math.sin(tijd * 0.22) * 0.08 + (Math.random() - 0.5) * 0.2 * kick;
    camera.lookAt(0, kijkY, 0);

    /* verborgen tab: de Tikker tikt bewust door (slaap()/vijandbeurten lopen af),
       maar het GPU-werk is dan pure verspilling — sla enkel de render over */
    if (!document.hidden) renderer.render(scene, camera);
  }

  /* schermpositie van een acteur (px) voor DOM-overlays */
  function projecteer(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(camera);
    return {
      x: (v.x * 0.5 + 0.5) * window.innerWidth,
      y: (-v.y * 0.5 + 0.5) * window.innerHeight
    };
  }
  function schermPos(actor) {
    const a = acteurs.get(actor);
    if (!a || !klaar) return null;
    const p = a.sprite.position;
    const top = projecteer(p.x, a.basisY + a.schaal / 2, p.z);
    const voet = projecteer(p.x, a.basisY - a.schaal / 2, p.z);
    return { x: voet.x, topY: top.y, voetY: voet.y };
  }

  /* fakkelniveau van het spel (1 = helder, 0.16 = gedoofd) */
  function zetLicht(f) { lichtDoel = Math.max(0.05, Math.min(1, f)); }

  /* camerazwaai t.o.v. de rustpositie — voor parallax op de achtergrondplaat */
  function zwaai() {
    if (!camera) return { x: 0, y: 0 };
    return { x: camera.position.x, y: camera.position.y - 2.6 };
  }

  return {
    beschikbaar, start, gevechtStart, gevechtEind, raak, aanval, sterf, pose, tik, schermPos, resize, zwaai, zetLicht,
    get actief() { return actief; },
    get klaar() { return klaar; }
  };
})();
window.Vista = Vista;
