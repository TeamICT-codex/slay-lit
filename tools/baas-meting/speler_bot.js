/* DE SPELERBOT ('bewust') als herbruikbaar stuk - voor de run-walker (aankomst.js) en later elk
   harnas dat gevechten met de ECHTE spelcode wil laten spelen.

   HERKOMST: dit is een KOPIE van het beleid van de bot in eenGevecht() van dick_meting.js per v140
   (cache slayit-v140, commit ec69a3d): ruimte/hofVangt/spillW, verwacht/inkomend, factuurMarge,
   shortlistPlan, doelwitVoor, waarde (de hele kaart-switch), kiesKaart, drinkIndien en de lus.
   Zelfde keuzes, zonder de meetinstrumentatie (geen window.__T, geen bron-/kaarttelling, geen
   leugendetector). De DICK-kennis blijft staan (ruimte, factuur, shortlist): tegen elke andere
   vijand geeft ruimte() Infinity en doen die takken niets. UNIFICATIE VOLGT LATER: tot dan moet
   een wijziging aan de bot in dick_meting.js hier met de hand worden nagetrokken (en omgekeerd).

   Weggelaten t.o.v. dick_meting.js (bewust, solo-meting):
   - de Erfprins-tak 'DE LAATSTE SPRONG van Drops' (metgezelOpoffering): de metgezellen zijn
     geparkeerd (METGEZELLEN_AAN = false), dus die tak vuurt solo nooit;
   - de probe MEET_SPILL (window.__spillProbe) en MEET_CAP (window.__capRuimte): alleen de regels
     uit de spelcode tellen (dicktatorVloer/Drempel/OnschendbaarOpen/HofVangst);
   - T.drank/T.offer/T.decreten en de rondelog met bossHp/pilEind/teleEind.
   Eén kleine aanpassing: een gesmede kaart haalt zijn modules uit window.__smeedSpec (de meting) OF
   uit S.gesmeed (een echte run); de startwacht (opts.startWacht, standaard 720 ms) is instelbaar.

   WALKER-TOEVOEGINGEN (alleen als de aanroeper ze vraagt; ZONDER deze opties kiest de bot kaart voor
   kaart wat de bot van dick_meting.js kiest; opts.algemeen verandert tegen de DICKtator niets (hij
   geeft geen Gif, weert geen gif af en zijn zaal is altijd verlicht), opts.dranken alleen als de build
   andere dranken dan de heeldrank draagt - de oude builds van dick_meting.js dragen er geen, de
   AANKOMSTBUILDS (MEET_AANKOMST) wel: daarom draagt dick_meting.js sinds het herstel van 30 sep in
   die modus DEZELFDE drinkRest-regel (een kopie; bij een wijziging hier daar natrekken):
   - opts.dranken === 'alle': ook de andere dranken dan de heeldrank (zie drinkRest);
   - opts.algemeen: het Gif op jezelf telt als onafwendbare inkomende schade, en de bot kent de
     gif-afweer van gewone vijanden (gifFactor: immuun 0, Zwarte Ziel absorbeer -1 / verminder 0,5,
     counter/gif-kaats 0,25) - zonder dat speelt een gifdek zich dood op een Paddenstoelman;
   - opts.algemeen: in het donker geen informatievoordeel meer (zie zichtbaar/poolVerwacht): bij een
     gewone vijand of elite in 'duister'/'gedoofd' rekent de bot met de verwachting over de
     intentpool in plaats van met het verborgen getal;
   - opts.race: DE WEDLOOP (zie raceFactor) - het nodige Blok telt zwaarder als de bot de wedloop
     verliest; nooit tegen de DICKtator;
   - opts.log (diagnose): een array die per ronde {r, hp, e, ink, inkEcht, licht, hand, vij, k, blok,
     eOver} krijgt (ink = wat de bot ziet, inkEcht = de echte telegraaf).

   Gebruik (in de pagina, na het laden van de spelcode):
     await page.evaluate(require('./speler_bot.js').installeerSpelerBot);
     ... startGevecht(...) of kiesNodeEcht(id) ...
     const r = await window.__speelGevecht({ beleid: 'bewust', maxRondes: 45, startWacht: 720, dranken: 'alle', algemeen: true });
     r = { gewonnen, dood, timeout, rondes, hpStart, hpEind, hpVerlies, dranken, fout, vijanden }
   Het gevecht moet al lopen (S.gevecht). De bot beslist NIET over win/verlies-afhandeling: die
   laat hij aan de spelcode (gevechtGewonnen / nederlaag) of aan de wikkels van het harnas.
   gewonnen = het gevecht is voorbij, niet verloren (g._verloren of window.__doodVlag) en S.hp > 0.
   Guards: max 45 rondes (opts.maxRondes), een eindBeurt die niet doorkomt = fout. */

function installeerSpelerBot() {
  window.__speelGevecht = async function (opts) {
    opts = opts || {};
    const g = S.gevecht;
    if (!g) return { gewonnen: false, dood: false, timeout: false, rondes: 0, fout: 'geen gevecht (S.gevecht leeg)' };
    const beleid = opts.beleid || 'bewust';
    const MAX = opts.maxRondes || 45;
    const isBaas = v => VIJANDEN[v.id] && VIJANDEN[v.id].baas;
    const baasId = (g.vijanden.find(isBaas) || {}).id || null;
    const vijandenStart = g.vijanden.map(v => v.id);
    const hpStart = S.hp;
    /* de levende baas; is hij dood maar leeft zijn gevolg nog (de Slijmkoning splijt), dan het eerste levende
       doelwit. Zonder baas (gewone gevechten, elites): het eerste levende doelwit. */
    const boss = () => g.vijanden.find(v => isBaas(v) && !v.dood) || alleVijanden()[0] || g.vijanden.find(isBaas);
    /* zoals dick_meting.js: alles wat leeft en geen baas is (in een gewoon gevecht dus ook boss() zelf) */
    const hof = () => alleVijanden().filter(v => !isBaas(v));
    const spl = () => g.speler;
    const vrij = async () => { let w = 0; while ((g.ceremonie || g.bezig || g._regieBezig) && w++ < 600 && S.gevecht === g && !g.voorbij) await new Promise(r => setTimeout(r, 15)); };
    await new Promise(r => setTimeout(r, opts.startWacht != null ? opts.startWacht : 720));   /* intro/openingsbeat laten landen (zoals dick_meting.js) */
    await vrij();

    /* ---------------- SPELER-AI (kopie dick_meting.js v140) ---------------- */
    const botBlind = !!opts.blind;
    const ruimte = x => {
      if (botBlind || !x || x.id !== 'de_dicktator' || x.dood) return Infinity;
      if (x._geschorst) return 0;
      let r = Infinity;
      const vl = (typeof dicktatorVloer === 'function') ? dicktatorVloer(x) : null;
      if (vl != null) r = Math.min(r, Math.max(0, x.hp - vl));
      const sc = (typeof dicktatorScene === 'function') ? dicktatorScene(x) : 3;
      if (!x.vorm2 && !x.herrezen && sc < 3 && typeof dicktatorDrempel === 'function') r = Math.min(r, Math.max(0, x.hp - dicktatorDrempel(x, sc + 1)));
      if (typeof dicktatorOnschendbaarOpen === 'function') r = Math.min(r, Math.max(0, dicktatorOnschendbaarOpen(x)));
      return r;
    };
    const hofVangt = () => !botBlind && !!(typeof DICK === 'object' && DICK && DICK.hofVangt);
    const vanger = () => (typeof dicktatorHofVanger === 'function')
      ? dicktatorHofVanger(g, dicktatorBaas(g))
      : (g.vijanden.find(x => !x.dood && !isBaas(x) && x.hp > 0) || null);
    const spillW = over => {
      if (over <= 0 || !hofVangt()) return 0;
      if (typeof dicktatorHofVangst === 'function') {
        return dicktatorHofVangst(g, dicktatorBaas(g), over).reduce((s, x) => s + x.n * 0.8 + (x.n >= x.h.hp ? 6 : 0), 0);
      }
      const h = vanger(); if (!h) return 0;
      const echt = Math.min(over, h.hp);
      return echt * 0.8 + (over >= h.hp ? 6 : 0);
    };
    const R_ = () => { const b = boss(); return Math.max(2, Math.min(6, Math.ceil(((b && b.hp) || 60) / 28))); };
    const gifWaarde = (add, huidig, R, halveer) => {
      let met = 0, zonder = 0;
      for (let t = 0; t < R; t++) {
        const a = Math.max(0, huidig + add - t), z = Math.max(0, huidig - t);
        met += halveer ? Math.ceil(a / 2) : a; zonder += halveer ? Math.ceil(z / 2) : z;
      }
      return met - zonder;
    };
    /* WALKER-TOEVOEGING (opts.algemeen, herstel 30 sep): de bot ziet in het DONKER niet meer dan een
       speler. De spelcode (intentHtml, game.js ~6127) verbergt bij een gewone vijand of elite in
       'duister' het getal van een aanval ('⚔️ ?') en in 'gedoofd' de hele intent ('❓'); een baas,
       het hof van de DICKtator (dicktatorBaas: de zaal is verlicht), Drops de Witte en de
       Fluisterende Schedel houden het zichtbaar. Dan rekent de bot met de VERWACHTING over de
       intentpool van die vijand: 16 trekkingen van VIJANDEN[id].kies op een kopie van de vijand, elk
       met een eigen vast zaad, waarna de RNG-staat van het spel exact terugkomt (Toeval.staat /
       zetStaat) - het spel merkt niets en de run blijft reproduceerbaar. duister: het gemiddelde
       van de AANVAL-trekkingen (het soort intent is zichtbaar); gedoofd: het gemiddelde over alle
       trekkingen (niet-aanvallen tellen 0). Zonder opts.algemeen: de exacte telegraaf, zoals
       dick_meting.js. */
    const zichtbaar = v => {
      if (!opts.algemeen || !v || isBaas(v)) return true;
      if (typeof dicktatorBaas === 'function' && dicktatorBaas(g)) return true;
      if (heeftRelikwie('fluisterende_schedel')) return true;
      const m = g.metgezel; if (m && !m.dood && m.id === 'drops_wit') return true;
      const n = lichtNiveau();
      return n !== 'duister' && n !== 'gedoofd';
    };
    const poolCache = new WeakMap();   /* per vijand-object: {sleutel: beurt|kracht|zwak|kwetsbaar|soort -> waarde} */
    const poolVerwacht = (v, alleenAanval) => {
      const sleutel = [g.beurt, v.beurtTeller, v.status.kracht || 0, v.status.zwak || 0, spl().status.kwetsbaar || 0, alleenAanval].join('|');
      const c = poolCache.get(v) || {}; if (c[sleutel] != null) return c[sleutel];
      const def = VIJANDEN[v.id]; if (!def || typeof def.kies !== 'function') return 0;
      const staat = Toeval.staat;
      let som = 0, n = 0;
      try {
        for (let k = 0; k < 16; k++) {
          Toeval.zetZaad(0x9E3779B9 ^ Math.imul(k + 1, 2654435761));
          let kopie;
          try { kopie = JSON.parse(JSON.stringify(v, (key, val) => (typeof val === 'function' ? undefined : val))); } catch (e) { continue; }
          let it = null;
          try { it = def.kies(kopie, v.beurtTeller != null ? v.beurtTeller : g.beurt); } catch (e) { it = null; }
          if (!it) continue;
          if (alleenAanval && it.type !== 'aanval') continue;
          kopie.intent = it;
          let d = 0; try { d = intentVerwachteSchade(kopie) || 0; } catch (e) { d = 0; }
          som += d; n++;
        }
      } finally { Toeval.zetStaat(staat); }
      const uit = n ? som / n : 0;
      c[sleutel] = uit; poolCache.set(v, c);
      return uit;
    };
    const verwacht = v => {
      const it = v && v.intent;
      if (it && it.type === 'plagiaat' && Array.isArray(it.plan)) {
        let d = it.plan.reduce((s, x) => s + (x.eindDmg || 0), 0);
        if ((spl().status.kwetsbaar || 0) > 0) d = Math.floor(d * 1.5);
        return d;
      }
      if (!zichtbaar(v)) {
        if (lichtNiveau() === 'gedoofd') return poolVerwacht(v, false);
        return (it && it.type === 'aanval') ? poolVerwacht(v, true) : 0;
      }
      return (typeof intentVerwachteSchade === 'function') ? intentVerwachteSchade(v) : 0;
    };
    /* WALKER-TOEVOEGING (opts.algemeen, niet in dick_meting.js): het Gif op JEZELF tikt door je Blok
       heen; het telt mee als onafwendbare inkomende schade (in inkomend() en in doorBlokNu(), zodat
       'nodig' ongewijzigd blijft maar 'dodelijk' en de drankregel het wel zien). De DICKtator geeft
       geen Gif, dus tegen hem verandert dit niets. */
    const eigenGif = () => opts.algemeen ? ((spl().status && spl().status.gif) || 0) : 0;
    /* MEET_SCHADE (alleen de walker zet window.__schade; in de finale is hij 1): de bot rekent met de klap die echt landt */
    const sf = () => (typeof window.__schade === 'number' && window.__schade > 0 && window.__schade !== 1) ? window.__schade : 1;
    const inkomend = () => alleVijanden().reduce((s, v) => s + verwacht(v), 0) * sf() + eigenGif();
    const doorBlokNu = () => ((typeof intentDoorBlok === 'function') ? alleVijanden().reduce((s, v) => s + intentDoorBlok(v), 0) * sf() : 0) + eigenGif();
    /* WALKER-TOEVOEGING (opts.algemeen): de gif-afweer van de gewone vijanden (geen baas; tenzij de
       Zielslantaarn hem breekt, zoals geefGif/de gif-tik in game.js): gif-immuun (Paddenstoelman,
       Inktvlek) = 0, Zwarte Ziel 'absorbeer' (het gif HEELT, de Verzwolgene) = -1, 'verminder' = 0,5,
       'counter' en gif-kaats (een deel kaatst op jou) = 0,25. De bot waardeert gif met die factor en
       richt een gifkaart op het doelwit dat het het best voelt. Zonder opts.algemeen: altijd 1. */
    const gifFactor = x => {
      if (!opts.algemeen || !x || x.isSpeler || heeftRelikwie('zielslantaarn')) return 1;
      const gd = VIJANDEN[x.id] || {};
      if (gd.gifImmuun) return 0;
      if (gd.zwarteZiel === 'absorbeer') return -1;
      if (gd.zwarteZiel === 'verminder') return 0.5;
      if (gd.zwarteZiel === 'counter' || gd.gifkaats) return 0.25;
      return 1;
    };
    const factuurBron = () => (typeof dicktatorFactuurBron === 'function') ? dicktatorFactuurBron(g) : null;
    const postenVan = c => { const k = kval(c, 'kost'); const pw = (typeof DICK === 'object' && DICK.POSTEN) || { gratis: 2, een: 1 }; return k === 0 ? pw.gratis : (k === 1 ? pw.een : 0); };
    const factuurMarge = c => {
      const fb = factuurBron(); if (!fb) return 0;
      const p = postenVan(c); if (!p) return 0;
      const nu = dicktatorFactuurBedrag(g, fb.intent);
      const na = dicktatorFactuurBedrag({ posten: (g.posten || 0) + p, vijanden: g.vijanden }, fb.intent);
      let d = na - nu;
      if ((fb.status.zwak || 0) > 0) d *= 0.75;
      if ((spl().status.kwetsbaar || 0) > 0) d *= 1.5;
      const f = (typeof dicktatorDoorBlokFrac === 'function') ? dicktatorDoorBlokFrac(fb.intent) : 0;
      const overschot = (spl().blok || 0) + (spl().status.metaalhuid || 0) - (inkomend() - doorBlokNu());
      if (overschot > d) return d * f + d * (1 - f) * 0.25;
      return d;
    };
    /* WALKER-TOEVOEGING (opts.race, herstel 30 sep - de grondoorzaak 'de bot haalt Act 1 strikt niet'):
       DE WEDLOOP. De DICK-bot waardeert 1 Blok ongeveer als 1 schade op de baas; tegen de Slijmkoning
       met 28 HP speelt hij zo Knal en Lichtdief tegen een inkomende 5x3 en sterft. Een speler rekent de
       wedloop: hoeveel beurten tot ik val (hp / de gemiddelde inkomende klap van dit gevecht) tegenover
       hoeveel beurten tot zij vallen (hun HP + Blok / mijn gemiddelde schade per ronde in dit gevecht,
       met een startschatting 10 + 3 per act). Verlies ik de wedloop, dan telt het nodige Blok zwaarder:
       x (beurten tot zij vallen / beurten tot ik val), geklemd op 1..2,5. Nooit tegen de DICKtator (daar
       blijft de bot kaart voor kaart die van dick_meting.js). */
    const race = { dmg: 10 + 3 * ((S.act || 1) - 1), dmgN: 1, ink: 8 + 4 * ((S.act || 1) - 1), inkN: 1, vorigHp: null };
    const vijandEhp = () => alleVijanden().reduce((som, v) => som + v.hp + (v.blok || 0), 0);
    const raceFactor = () => {
      if (!opts.race || baasId === 'de_dicktator') return 1;
      const ink = Math.max(race.ink / race.inkN, inkomend(), 1);
      const totIkVal = Math.max(0.5, S.hp / ink);
      const totZijVallen = vijandEhp() / Math.max(3, race.dmg / race.dmgN);
      return Math.max(1, Math.min(2.5, totZijVallen / totIkVal));
    };
    const raceRonde = () => {   /* aan het begin van elke ronde: de metingen van de vorige ronde bijtellen */
      if (!opts.race) return;
      const nu = alleVijanden().reduce((som, v) => som + v.hp, 0);
      if (race.vorigHp != null) { race.dmg += Math.max(0, race.vorigHp - nu); race.dmgN++; }
      race.vorigHp = nu;
      const ink = inkomend(); if (ink > 0) { race.ink += ink; race.inkN++; }
    };
    const kaartRang = c => (({ basis: 0, start: 0, gewoon: 1, ongewoon: 2, gesmeed: 2, zeldzaam: 3, episch: 4 })[kdef(c).zeld] ?? 0) * 3 + (kval(c, 'kost') || 0) + (c.up ? 1 : 0);
    const shortlistPlan = () => {
      if (!g.aangezegd || g.aangezegd.size < 2) return null;
      const [a, b] = [...g.aangezegd.values()];
      const ca = S.dek.find(x => x.uid === a.uid) || S.dek.find(x => x.id === a.id);
      const cb = S.dek.find(x => x.uid === b.uid) || S.dek.find(x => x.id === b.id);
      if (!ca || !cb) return null;
      const sinds = d => Math.max(0, ((g.gespeeld && g.gespeeld[d.id]) || 0) - (d.start || 0));
      const houdA = kaartRang(ca) >= kaartRang(cb);
      const houd = houdA ? a : b, offer = houdA ? b : a;
      const sh = sinds(houd), so = sinds(offer);
      const kh = kval(houdA ? ca : cb, 'kost') || 0, ko = kval(houdA ? cb : ca, 'kost') || 0;
      let veilig;
      if (sh + so > 0) veilig = true;
      else if (kh !== ko) veilig = kh < ko;
      else veilig = (offer === b);
      return { houdId: houd.id, offerId: offer.id, veilig, sh, so };
    };

    const doelwitVoor = c => {
      const b = boss(); const h = hof().sort((x, y) => x.hp - y.hp);
      if (!h.length) return b;
      const d = kdef(c);
      const kr = (spl().status.kracht || 0) + relikwieSchadeBonus();
      const klap = (kval(c, 'dmg') || 0) + kr;
      const isGif = (kval(c, 'gif') || 0) > 0 || /nachtschade|katalyse|giftand|karaktermoord|slangenbeet/.test(c.id);
      if (!isGif && ruimte(b) < Math.max(1, klap * 0.5)) {
        if (!hofVangt()) return h[0];
        const rb = ruimte(b);
        const opBaas = Math.min(klap, rb) + spillW(klap - rb);
        const opHof = Math.min(klap, h[0].hp) * 0.8 + (klap >= h[0].hp ? 6 : 0);
        if (opHof > opBaas) return h[0];
      }
      if (beleid === 'gebalanceerd' || baasId !== 'de_dicktator') {
        if (isGif && gifFactor(b) < 1) { const vat = alleVijanden().filter(x => gifFactor(x) > gifFactor(b)).sort((x, y) => gifFactor(y) - gifFactor(x) || x.hp - y.hp)[0]; if (vat) return vat; }
        if (isGif) return b;
        if (h[0].hp <= klap) return h[0];
        return (b.hp > 70 && h[0].hp <= klap * 2) ? h[0] : b;
      }
      if (isGif && d.type !== 'aanval') return b;
      const naam = id => h.find(x => x.id === id);
      const cl = naam('de_claqueur'), dw = naam('de_deurwaarder'), gr = naam('de_griffier');
      const ontslagNabij = b.vorm2 && b.intent && b.intent.ontslag;
      const klok = (typeof dicktatorKlok === 'function' && b.vorm2) ? dicktatorKlok(b) : 9;
      if (dw && b.vorm2 && !isGif && ((ontslagNabij && dw.hp <= klap * 1.5) || (klok <= 2 && b.hp > 60))) return dw;
      const totGrens = b.vorm2 ? b.hp : Math.max(0, b.hp - ((b.fase || 1) >= 3 ? 0 : (typeof dicktatorDrempel === 'function' ? dicktatorDrempel(b, (b.fase || 1) + 1) : 0)));
      if (cl && !isGif && (cl.hp <= klap || (cl.hp <= klap * 2 && totGrens > 90))) return cl;
      if (!b.vorm2 && (b.fase || 1) >= 3 && b.hp <= 30 && !isGif && h[0].hp <= klap) return h[0];
      if (dw && !isGif && dw.hp <= klap && factuurBron() === dw) return dw;
      if (gr && !isGif && gr.hp <= klap && !(b.intent && b.intent.type === 'decreet')) return b;
      return b;
    };

    const waarde = (c, R) => {
      const b = boss(); const d = kdef(c); const raw = veld => kval(c, veld) || 0;
      const t = d.doel === 'vijand' ? doelwitVoor(c) : b;
      const s = spl();
      const kr = (s.status.kracht || 0) + relikwieSchadeBonus();
      const zw = (s.status.zwak || 0) > 0 ? 0.75 : 1;
      const eerste = !(g.aanvalDezeBeurt > 0);
      const hak = ((s.status.hakblok || 0) > 0 && !g._hakblokGebruikt) ? s.status.hakblok : 0;
      const wet = (heeftRelikwie('wetsteen') && !g.wetsteenGebruikt) ? 4 : 0;
      const kwVan = x => (x.status.kwetsbaar || 0) > 0 || (eerste && heeftRelikwie('stempelkussen') && d.type === 'aanval');
      const hit = (basis, x, extra = 0) => {
        x = x || t; if (!x) return 0;
        let dm = Math.floor((basis + kr + extra) * zw);
        if (kwVan(x)) dm = Math.floor(dm * 1.5) + (heeftRelikwie('brandmerkijzer') ? 3 : 0);
        return Math.max(0, dm - (x.blok || 0) * 0.5);
      };
      const opDoel = (dm, x) => {
        x = x || t; if (!x) return 0;
        if (isBaas(x)) { const rb = ruimte(x); return Math.min(dm, rb) + spillW(dm - rb); }
        const echt = Math.min(dm, x.hp);
        return echt * 0.8 + (dm >= x.hp ? 6 : 0);
      };
      const aoe = (dm1, keer = 1) => alleVijanden().reduce((som, x) => som + opDoel(hit(dm1, x) * keer, x), 0);
      const gifNu = (t && t.status.gif) || 0;
      const gifB = heeftRelikwie('smaragden_ring') ? 1 : 0;
      const gw = (add, x) => { x = x || t; const gf = gifFactor(x); if (gf === 0) return 0; return gf * gwKaal(add, x); };
      const gwKaal = (add, x) => { return x ? (isBaas(x) ? gifWaarde(add + gifB, x.status.gif || 0, R, true) : Math.min(x.hp, gifWaarde(add + gifB, x.status.gif || 0, R, false))) : 0; };
      const gwAlle = add => alleVijanden().reduce((som, x) => som + gw(add, x), 0);
      const ink = inkomend();
      const door = doorBlokNu();
      const nodig = Math.max(0, ink - door - (s.blok || 0) - (s.status.metaalhuid || 0));
      const hpFrac = S.hp / S.maxHp;
      const blokW = (hpFrac < 0.4 ? 1.5 : 1.05) * raceFactor();
      const dodelijk = nodig + door >= S.hp;
      const blokV = n => Math.min(n, nodig) * (dodelijk ? 3 : blokW) + Math.max(0, n - nodig) * 0.05;
      const hitsPerBeurt = Math.max(1, alleVijanden().filter(x => x.intent && (x.intent.type === 'aanval' || x.intent.type === 'factuur')).length);
      const doornV = n => n * Math.min(R, 5) * 0.9 * Math.max(1, hitsPerBeurt * 0.8);
      const krachtV = n => n * 2.2 * Math.min(R, 5) * 0.8;
      const zwakV = n => Math.min(n, R) * Math.max(2, ink * 0.25);
      const kwV = n => Math.min(n, R) * 3.5;
      const heelV = n => Math.min(n, S.maxHp - S.hp) * (hpFrac < 0.5 ? 1.2 : 0.7);
      let v = 0;
      /* een gesmede kaart: in de meting (dick_meting) uit window.__smeedSpec, in een echte run uit S.gesmeed */
      const smSpec = d.gesmeed ? ((window.__smeedSpec || {})[c.id] || (S.gesmeed || {})[c.id] || null) : null;
      if (smSpec && Array.isArray(smSpec.modules)) {
        for (const m of smSpec.modules) {
          const n = m.p * ((SMEED_MODULES[m.m] || { perPunt: 0 }).perPunt);
          if (m.m === 'schade') v += opDoel(hit(n));
          else if (m.m === 'gif') v += gw(n);
          else if (m.m === 'miasma') v += gwAlle(n);
          else if (m.m === 'zwak') v += zwakV(n);
          else if (m.m === 'kwetsbaar') v += kwV(n);
          else if (m.m === 'blok') v += blokV(n);
          else if (m.m === 'doornen') v += doornV(n);
          else if (m.m === 'woede') v += krachtV(n);
          else if (m.m === 'genees') v += heelV(n);
          else if (m.m === 'groei') v += heelV(n) + blokV(n);
          else if (m.m === 'trek') v += n * 4;
        }
      } else switch (c.id) {
        /* ---- Gifmagier ---- */
        case 'nachtschade': { const dm = hit(gifNu * raw('maal'), t, -kr); v = opDoel(dm) - gifWaarde(gifNu, 0, R, isBaas(t)); if (t && isBaas(t) && Math.min(dm, ruimte(t)) >= t.hp) v = 999; break; }
        case 'katalyse': v = gifNu >= 3 ? gifWaarde(gifNu * (raw('maal') - 1), gifNu, R, isBaas(t)) : -1; break;
        case 'giftand': v = opDoel(hit(raw('dmg'))) + (gifNu > 0 ? gifWaarde(gifNu, gifNu, R, isBaas(t)) : 0); break;
        case 'karaktermoord': v = opDoel(hit(raw('dmg'))) + gifWaarde(Math.min(gifNu, raw('max')) + (gifNu > 0 ? gifB : 0), gifNu, R, isBaas(t)); break;
        case 'slangenbeet': v = opDoel(hit(raw('dmg') + (gifNu > 0 ? raw('bonus') : 0))); break;
        case 'naaperij': v = opDoel(hit(raw('dmg'))) + gw(raw('gif') * (gifNu > 0 ? 2 : 1)); break;
        case 'venijnregen': v = aoe(raw('dmg')) + gwAlle(raw('gif')); break;
        case 'gifwolk': v = gwAlle(raw('gif')); break;
        case 'lastercampagne': v = gwAlle(raw('gif')) + zwakV(raw('zw')); break;
        case 'verlammend_gif': v = gw(raw('gif')) + zwakV(raw('zwak')); break;
        case 'gifpamflet': v = opDoel(hit(raw('dmg'))) + gw(raw('gif')) + 2; break;
        case 'etterende_wonden': v = raw('n') * 2 * R; break;
        case 'gifklieren': v = gwAlle(raw('n') * Math.min(R, 4)) * 0.6; break;
        case 'bloedzuiger': v = raw('n') * R * 0.8; break;
        case 'epidemie': v = hof().length ? 6 : 1; break;
        case 'registerrot': v = gw(raw('gif')) + 2; break;
        case 'moederslang': v = gw(raw('gif')) + zwakV(raw('zw')); break;
        /* ---- Slachter ---- */
        case 'executie': case 'afgekeurd': v = opDoel(hit(raw('dmg') + (t && kwVan(t) ? raw('bonus') : 0))); break;
        case 'knal': v = opDoel(hit(raw('dmg'))) + kwV(raw('kw')); break;
        case 'uithaal': v = opDoel(hit(raw('dmg'))) + kwV(raw('st')) + zwakV(raw('st')); break;
        case 'dubbelslag': v = opDoel(hit(raw('dmg')) + hit(raw('dmg'), t, -hak - wet)); break;
        case 'in_drievoud': v = opDoel(hit(raw('dmg')) + 2 * hit(raw('dmg'), t, -hak - wet)); break;
        case 'klingenstorm': case 'wervelwind': case 'asadem': v = aoe(raw('dmg')); break;
        case 'tribunaal': v = alleVijanden().reduce((som, x) => som + opDoel(hit(raw('dmg') + (kwVan(x) ? raw('bonus') : 0), x), x), 0); break;
        case 'originele_handtekening': v = opDoel(hit(raw('dmg'))) + (eerste ? krachtV(raw('kr')) : 0); break;
        case 'bloedoffer': case 'martelaarsbloed': v = opDoel(hit(raw('dmg'))) - (raw('zelf') || raw('prijs')) * (hpFrac < 0.3 ? 3 : 1.1); break;
        case 'molensteen': v = opDoel(hit(raw('basis') + g.afleg.length)); break;
        case 'ijzeren_golf': v = opDoel(hit(raw('dmg'))) + blokV(raw('blok')); break;
        case 'vampiersbeet': v = opDoel(hit(raw('dmg'))) + heelV(raw('heel')); break;
        case 'het_hakblok': v = raw('n') * Math.min(R, 5) * 0.9; break;
        case 'metaalhuid': v = raw('n') * Math.min(R, 5) * 0.9; break;
        case 'vlammende_hartstocht': case 'demonenvorm': v = krachtV(raw('n')) * (c.id === 'demonenvorm' ? R / 2 : 1); break;
        case 'geindexeerd': v = raw('n') * 1.8 * R * 0.7; break;
        case 'beulswerk': v = opDoel(hit(raw('dmg'))) - raw('zelf') * 1.1; break;
        /* ---- Kolendruide ---- */
        case 'doornzweep': v = opDoel(hit(raw('dmg')) + 2 * hit(raw('dmg'), t, -hak - wet)); break;
        case 'het_origineel_kaart': v = opDoel(hit(raw('dmg') + raw('maal') * (s.status.doornen || 0))); break;
        case 'perkamentslag': v = opDoel(hit(raw('dmg'))) + doornV(raw('dr')); break;
        case 'doorslag_doornen': case 'sporenstoot': v = opDoel(hit(raw('dmg') + (t && ((t.status.zwak || 0) > 0 || kwVan(t)) ? raw('bonus') : 0))); break;
        case 'wortelgreep': case 'asregen': v = opDoel(hit(raw('dmg'))) + zwakV(raw('zw')); break;
        case 'wurgwortels': v = opDoel(hit(raw('dmg'))) + kwV(raw('kw')); break;
        case 'knalsigaar': v = opDoel(hit(raw('dmg'))) - raw('kans') / 100 * 4; break;
        case 'wilde_oogst': v = aoe(raw('dmg'), 3); break;
        case 'flame': v = aoe(raw('dmg')) + krachtV(2); break;
        case 'fakkeloptocht': v = aoe(raw('dmg')); break;
        case 'bastvel': v = blokV(raw('blok')) + doornV(raw('dr')); break;
        case 'tegenvuur': v = blokV(raw('blok')) + doornV(raw('doorn')); break;
        case 'doornmantel': v = doornV(raw('dr')); break;
        case 'duivelspact': v = krachtV(raw('kr')) - 4; break;
        case 'kolengloed': v = krachtV(raw('kr')) - 0.3 * raw('licht'); break;
        case 'kolenstempel': v = krachtV(raw('kr')) + doornV(raw('dr')) - 0.3 * raw('licht'); break;
        case 'stoofpotje': v = blokV(raw('blok')) + heelV(raw('heel')); break;
        case 'paddenstoelenstoofpot': case 'tweede_adem': v = heelV(raw('heel')); break;
        case 'stoofgeur': v = zwakV(raw('zw')) * Math.max(1, hitsPerBeurt * 0.7); break;
        case 'sporenkring': v = zwakV(raw('n')) * 1.5; break;
        case 'hart_van_de_duivelboom': v = krachtV(1) * R / 2; break;
        case 'de_laatste_vonk': v = 1; break;
        case 'vonkenbeet': v = opDoel(hit(raw('dmg'))) - 0.3 * raw('licht'); break;
        /* ---- neutraal ---- */
        case 'brandstapel': { const vl = g.hand.filter(k => kdef(k).type === 'vloek').length; v = vl ? aoe(raw('dmg') * vl) + vl * 3 : -1; break; }
        case 'volkswoede': { const vl = g.hand.filter(k => kdef(k).type === 'vloek').length; v = opDoel(hit(raw('dmg') + raw('per') * vl)); break; }
        case 'schuldverschuiving': v = zwakV(raw('n')) + kwV(raw('n')) + 3; break;
        case 'stempel': v = kwV(raw('kw')) + zwakV(raw('zw')); break;
        case 'doornenhuid': v = doornV(raw('n')); break;
        case 'krijgslist': v = 2; break;
        case 'adrenaline': v = 5; break;
        default: {
          if (d.type === 'aanval') v += opDoel(hit(raw('dmg')));
          if (raw('gif') > 0) v += gw(raw('gif'));
        }
      }
      if (raw('blok') > 0 && !['bastvel', 'tegenvuur', 'stoofpotje', 'ijzeren_golf'].includes(c.id)) v += blokV(raw('blok'));
      if (beleid === 'bewust' && baasId === 'de_dicktator') {
        const marge = factuurMarge(c);
        v -= marge * (nodig + marge >= S.hp ? 3 : (hpFrac < 0.4 ? 1.8 : 1.2));
        const plan = shortlistPlan();
        if (plan && !plan.veilig && (c.id === plan.houdId || c.id === plan.offerId)) {
          v += (boss() && boss().intent && boss().intent.type === 'decreet') ? 10 : 4;
        }
      }
      return v;
    };
    const kiesKaart = () => {
      const b = boss(); if (!b || b.dood) return null;
      const R = R_();
      let best = null, bestS = 0.2;
      for (const c of g.hand) {
        const d = kdef(c); const k = kkost(c);
        if (!d || d.type === 'vloek' || k === null || k > g.energie) continue;
        if (d.kan && !d.kan(c)) continue;
        const s = waarde(c, R) / Math.max(0.6, k);
        if (s > bestS) { bestS = s; best = c; }
      }
      return best;
    };
    let gedronken = 0;
    const drinkIndien = (noodgeval) => {
      const i = S.dranken.indexOf('heeldrank'); if (i < 0 || g.ceremonie || g.bezig) return false;
      const drempel = S.hp < S.maxHp * 0.35 || (noodgeval && Math.max(0, inkomend() - doorBlokNu() - (spl().blok || 0)) + doorBlokNu() >= S.hp);
      if (!drempel) return false;
      try { gebruikDrank(i); gedronken++; return true; } catch (e) { return false; }
    };
    /* WALKER-TOEVOEGING (niet in dick_meting.js; alleen met opts.dranken === 'alle'): de builds van
       dick_meting dragen alleen een heeldrank, maar een echte run raapt elke soort drank op. Zonder
       dit beleid zou de bot ze nooit drinken en onderweg onterecht sneuvelen. Regels:
       - genezing (heeldrank hierboven; de Maxenzeelse Stoofpot op dezelfde drempel);
       - in een zwaar gevecht (baas/elite/episch) gaat in ronde 1 alles wat geen genezing is open:
         schade/gif op het doelwit dat de bot met een aanval zou kiezen, kracht/energie/blok op jezelf;
       - in een gewoon gevecht alleen in nood (wat er binnenkomt kost je het leven): eerst blok
         (IJzerdrank, Duivelshars), dan de rest.
       Een vijand-drank met meerdere levende vijanden gaat via drinkEffect + naActie (de weg van de
       doelklik), zodat er nooit een doelkeuze open blijft staan. */
    const HEEL = ['heeldrank', 'maxenzeelse_stoofpot'];
    const zwaar = g.soort === 'baas' || g.soort === 'elite' || g.soort === 'episch';
    const drinkEen = id => {
      const i = S.dranken.indexOf(id); if (i < 0 || g.ceremonie || g.bezig || g.voorbij) return false;
      const def = DRANKEN[id]; if (!def) return false;
      try {
        if (def.doel === 'vijand') {
          const levend = alleVijanden(); if (!levend.length) return false;
          if (levend.length === 1) gebruikDrank(i);
          else {
            const doel = doelwitVoor({ id: 'slag', up: false }) || levend[0];
            S.dranken.splice(i, 1); drinkEffect(id, doel); naActie();
          }
        } else gebruikDrank(i);
        gedronken++; return true;
      } catch (e) { return false; }
    };
    const drinkRest = (ronde) => {
      if (opts.dranken !== 'alle') return;
      if (S.hp < S.maxHp * 0.35 && S.dranken.includes('maxenzeelse_stoofpot')) drinkEen('maxenzeelse_stoofpot');
      const rest = S.dranken.filter(id => !HEEL.includes(id));
      if (!rest.length) return;
      const nood = Math.max(0, inkomend() - doorBlokNu() - (spl().blok || 0)) + doorBlokNu() >= S.hp;
      if (zwaar && ronde === 1) { rest.forEach(drinkEen); return; }
      if (nood) {
        const volg = rest.slice().sort((a, b) => (['ijzerdrank', 'duivelshars'].includes(a) ? 0 : 1) - (['ijzerdrank', 'duivelshars'].includes(b) ? 0 : 1));
        for (const id of volg) { drinkEen(id); if (Math.max(0, inkomend() - doorBlokNu() - (spl().blok || 0)) + doorBlokNu() < S.hp) break; }
      }
    };

    /* ---------------- DE LUS (kopie dick_meting.js v140, zonder de meetlog) ---------------- */
    let fout = null; let ronde = 0;
    try {
      while (!g.voorbij && S.gevecht === g && S.hp > 0 && ronde < MAX) {
        await vrij();
        if (g.voorbij) break;
        ronde++;
        const beurtStart = g.beurt;
        /* opts.log (diagnose, standaard uit): per ronde hp, energie, hand, inkomend en de gespeelde kaarten */
        const rl = opts.log ? { r: ronde, hp: S.hp, e: g.energie, ink: Math.round(inkomend()), inkEcht: alleVijanden().reduce((som, v) => som + intentVerwachteSchade(v), 0), licht: lichtNiveau(), hand: g.hand.map(c => c.id + (c.up ? '+' : '')),
          vij: alleVijanden().map(v => v.id + ':' + v.hp + (v.intent ? '/' + v.intent.naam : '')), k: [] } : null;
        raceRonde();
        drinkIndien(false);
        drinkRest(ronde);
        await vrij();
        let guard = 0;
        while (guard++ < 30 && !g.voorbij && S.gevecht === g) {
          await vrij();
          if (g.voorbij || g.beurt !== beurtStart) break;
          const c = kiesKaart(); if (!c) break;
          const d = kdef(c);
          if (rl) rl.k.push(c.id);
          await speelKaart(c, d.doel === 'vijand' ? doelwitVoor(c) : undefined);
        }
        if (rl) { rl.blok = spl().blok || 0; rl.eOver = g.energie; opts.log.push(rl); }
        await vrij();
        if (g.voorbij || S.gevecht !== g) break;
        drinkIndien(true);
        drinkRest(-1);   /* walker-toevoeging: alleen in nood (opts.dranken === 'alle') */
        if (g.beurt === beurtStart) {
          let pog = 0;
          while (g.beurt === beurtStart && !g.voorbij && pog++ < 5) { await vrij(); await eindBeurt(); await vrij(); }
          if (g.beurt === beurtStart && !g.voorbij) { fout = 'eindBeurt kwam niet door (ronde ' + ronde + ')'; break; }
        }
      }
    } catch (e) { fout = (e && e.stack) ? String(e.stack).slice(0, 600) : String(e); }
    await vrij();
    const verloren = !!g._verloren || !!window.__doodVlag;
    const gewonnen = !!g.voorbij && !verloren && S.hp > 0;
    const dood = !gewonnen && (S.hp <= 0 || verloren);
    return {
      gewonnen, dood, timeout: !gewonnen && !dood && !fout, rondes: ronde, fout,
      hpStart, hpEind: S.hp, hpVerlies: Math.max(0, hpStart - S.hp), dranken: gedronken,
      vijanden: vijandenStart, baas: baasId
    };
  };
}

module.exports = { installeerSpelerBot };
