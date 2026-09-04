/* ============================================================
   SLAY LIT — HET SYNDICAAT: het online leaderboard (Supabase).
   Sociaal-competitief tussen vrienden: sticht een syndicaat met een
   code, deel hem, en stoef met je dagelijkse afdalingen.

   Bewust GEEN dependency: Supabase's PostgREST-API is kale fetch met
   twee headers. De anon-key is publiek per ontwerp (RLS beschermt de
   tabel — zie SUPABASE-SETUP.md voor de SQL + stappen).

   Zonder config hieronder blijft ALLES stil verborgen: het lokale
   bord werkt altijd, online is een laagje erbovenop. Elke aanroep is
   fire-and-forget-veilig — een kapotte verbinding raakt het spel nooit.
   ============================================================ */
const Online = (() => {
  /* >>> Supabase-dashboard → Settings → API <<< (publishable key = veilig in
     client-code; RLS beschermt de tabellen — zie SUPABASE-SETUP.md) */
  const CONFIG = {
    url: 'https://datozlvdyripzbfgmyfv.supabase.co',
    anonKey: 'sb_publishable_65KIIX0hZ2ZQ3OIFspgvEg_5ZfJF_xc'
  };

  const SLEUTEL = 'slayit_syndicaat';
  let lid = null;
  try { lid = JSON.parse(localStorage.getItem(SLEUTEL) || 'null'); } catch (e) {}
  if (lid && (!lid.naam || !lid.code)) lid = null;

  /* DE ZWERVER: een speler zónder posse die tóch op het wereldbord wil.
     Technisch een posse-van-één met een verborgen persoonlijke code
     (ZW-XXXXXX) — zo blijft (groep, naam, dag) uniek per speler en is er
     GEEN schema- of RLS-wijziging nodig. Sluit hij later bij een echt
     syndicaat aan, dan wint die identiteit (identiteit() hieronder). */
  const ZW_SLEUTEL = 'slayit_zwerver';
  let zwerver = null;
  try { zwerver = JSON.parse(localStorage.getItem(ZW_SLEUTEL) || 'null'); } catch (e) {}
  if (zwerver && (!zwerver.naam || !zwerver.code)) zwerver = null;

  const actief = () => !!(CONFIG.url && CONFIG.anonKey);
  const isLid = () => actief() && !!lid;
  /* wie ben je voor het WERELDBORD? je syndicaat-lidmaatschap, anders je
     zwerver-identiteit, anders niemand (= scores blijven lokaal) */
  const identiteit = () => actief() ? (lid || zwerver) : null;
  const isZwerver = () => actief() && !lid && !!zwerver;
  function wordZwerver(naam) {
    naam = normNaam(naam);
    if (!naam) return null;
    const code = (zwerver && zwerver.code) || ('ZW-' + Math.random().toString(36).slice(2, 8).toUpperCase().replace(/[^A-Z0-9]/g, 'X'));
    zwerver = { naam, code };
    try { localStorage.setItem(ZW_SLEUTEL, JSON.stringify(zwerver)); } catch (e) {}
    return zwerver;
  }

  /* codes en namen strak normaliseren: ze reizen door URL's én innerHTML */
  const normCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
  const normNaam = n => String(n || '').trim().replace(/[<>&"']/g, '').slice(0, 20);

  /* woordenlijst voor de code-generator — thematisch, makkelijk door te zeggen */
  const CODE_WOORDEN = ['KELDER', 'FAKKEL', 'SINTEL', 'DIEPTE', 'SCHACHT', 'VONK', 'ASREGEN', 'DREMPEL'];
  const verzinCode = () => CODE_WOORDEN[Math.floor(Math.random() * CODE_WOORDEN.length)] + '-' + Math.floor(1000 + Math.random() * 9000);

  /* TIMEOUT: zonder deze afbreker bleef een hangende verbinding (trage gsm,
     captive portal, Supabase-hik) de UI eeuwig op "De duiven zijn onderweg…"
     zetten — de promise loste simpelweg nooit op. Nu faalt hij netjes na
     TIMEOUT_MS en toont de aanroeper zijn offline-terugval. */
  const TIMEOUT_MS = 8000;
  async function req(pad, opts) {
    opts = opts || {};
    const afbreker = typeof AbortController === 'function' ? new AbortController() : null;
    const klok = setTimeout(() => { if (afbreker) afbreker.abort(); }, TIMEOUT_MS);
    let r;
    try {
      r = await fetch(CONFIG.url + '/rest/v1/' + pad, {
        method: opts.method || 'GET',
        headers: {
          apikey: CONFIG.anonKey,
          Authorization: 'Bearer ' + CONFIG.anonKey,
          'Content-Type': 'application/json',
          Prefer: opts.prefer || ''
        },
        body: opts.body || undefined,
        signal: afbreker ? afbreker.signal : undefined
      });
    } finally {
      clearTimeout(klok);
    }
    if (!r.ok) throw new Error('syndicaat-fout ' + r.status);
    /* een geslaagde insert/upsert komt als 201/204 met LEGE body terug —
       r.json() zou daarop crashen en de upload vals-negatief rapporteren */
    const txt = await r.text();
    return txt ? JSON.parse(txt) : null;
  }

  function wordLid(naam, code) {
    naam = normNaam(naam); code = normCode(code);
    if (!naam || code.length < 3) return null;
    lid = { naam, code };
    try { localStorage.setItem(SLEUTEL, JSON.stringify(lid)); } catch (e) {}
    return lid;
  }
  function verlaat() {
    lid = null;
    try { localStorage.removeItem(SLEUTEL); } catch (e) {}
  }

  /* NAAM WIJZIGEN = VERHUIZEN. De naam is bewust de identiteit (zo tik je op
     een tweede toestel gewoon dezelfde naam in en speel je verder), maar
     'verlaten + opnieuw joinen' — de enige route die er wás — liet een SPOOK
     achter: je oude naam bleef als eeuwige achterblijver in de ledenlijst
     staan, kreeg porren die niemand leest, en je scores hingen aan de oude
     naam. hernoem() sleept scores, porren én het lidmaatschap mee.
     Retour: true | 'bezet' (die naam is al iemand anders) | false (fout). */
  async function hernoem(nieuw) {
    const ik = identiteit();
    if (!ik) return false;
    nieuw = normNaam(nieuw);
    const oud = ik.naam;
    if (!nieuw || nieuw === oud) return false;
    const g = encodeURIComponent(ik.code);
    const nN = encodeURIComponent(nieuw), oN = encodeURIComponent(oud);
    try {
      /* is de nieuwe naam al bezet in deze groep? dan is dat een ander mens —
         doorgaan zou zijn scores met de jouwe laten botsen (unieke sleutel) */
      const botsScores = await req(`scores?groep=eq.${g}&naam=eq.${nN}&limit=1`);
      if (Array.isArray(botsScores) && botsScores.length) return 'bezet';
      const botsLeden = await req(`leden?groep=eq.${g}&naam=eq.${nN}&limit=1`).catch(() => null);
      if (Array.isArray(botsLeden) && botsLeden.length) return 'bezet';
      /* de geschiedenis verhuist mee; porren/leden zijn best-effort (hun
         unieke indexen kunnen botsen op een dag dat er al gepord is) */
      await req(`scores?groep=eq.${g}&naam=eq.${oN}`, { method: 'PATCH', body: JSON.stringify({ naam: nieuw }) });
      await req(`leden?groep=eq.${g}&naam=eq.${oN}`, { method: 'PATCH', body: JSON.stringify({ naam: nieuw }) }).catch(() => {});
      await req(`porren?groep=eq.${g}&van=eq.${oN}`, { method: 'PATCH', body: JSON.stringify({ van: nieuw }) }).catch(() => {});
      await req(`porren?groep=eq.${g}&naar=eq.${oN}`, { method: 'PATCH', body: JSON.stringify({ naar: nieuw }) }).catch(() => {});
      if (lid) { lid = { naam: nieuw, code: lid.code }; try { localStorage.setItem(SLEUTEL, JSON.stringify(lid)); } catch (e) {} }
      else { zwerver = { naam: nieuw, code: zwerver.code }; try { localStorage.setItem(ZW_SLEUTEL, JSON.stringify(zwerver)); } catch (e) {} }
      return true;
    } catch (e) { return false; }
  }

  /* score insturen — upsert op (groep, naam, dag): opnieuw insturen op dezelfde
     dag overschrijft gewoon (de daily is toch één poging per dag). Werkt voor
     syndicaat-leden ÉN zwervers (identiteit) — het wereldbord leest alles. */
  async function stuurScore(d) {
    const ik = identiteit();
    if (!ik) return false;
    try {
      await req('scores?on_conflict=groep,naam,dag', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates',
        body: JSON.stringify({
          groep: ik.code, naam: ik.naam,
          dag: String(d.dag || ''), score: Math.max(0, d.score | 0),
          held: String(d.held || 'slachter'), diepte: Math.max(0, d.diepte | 0),
          gewonnen: !!d.gewonnen, seed: String(d.seed || '').slice(0, 24)
        })
      });
      return true;
    } catch (e) { return false; }
  }

  /* ---------- VRIJE RUNS (v100) ----------
     De RLS-policy eist dag = echte datum, dus een vrije run krijgt geen eigen
     dag-sleutel maar een eigen GROEP: '<code>-RUN'. Zo botst ze nooit met de
     daily van dezelfde dag ((groep,naam,dag) uniek), blijven de posse-borden
     (groep=eq.<code>) zuiver daily, en filtert het wereldbord ze bewust:
     'Vandaag' laat ze weg, 'Aller tijden' dedupt op de BASISgroep zodat elke
     speler één rij houdt — zijn beste, daily óf vrij. Eén vrije run per dag per
     speler; een lagere score van dezelfde dag overschrijft de betere niet. */
  const RUN_SUFFIX = '-RUN';
  const isRunGroep = g => /-RUN$/.test(String(g || ''));
  const basisGroep = g => String(g || '').replace(/-RUN$/, '');
  async function stuurRunScore(d) {
    const ik = identiteit();
    if (!ik) return false;
    const groep = basisGroep(ik.code).slice(0, 24 - RUN_SUFFIX.length) + RUN_SUFFIX;   /* policy: max 24 tekens */
    const dag = String(d.dag || '');
    const score = Math.max(0, d.score | 0);
    try {
      const q = `groep=eq.${encodeURIComponent(groep)}&naam=eq.${encodeURIComponent(ik.naam)}&dag=eq.${encodeURIComponent(dag)}&select=score`;
      const bestaand = await req('scores?' + q);
      if (Array.isArray(bestaand) && bestaand.length && (bestaand[0].score | 0) >= score) return 'lager';
      await req('scores?on_conflict=groep,naam,dag', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates',
        body: JSON.stringify({
          groep, naam: ik.naam, dag, score,
          held: String(d.held || 'slachter'), diepte: Math.min(99, Math.max(0, d.diepte | 0)),
          gewonnen: !!d.gewonnen, seed: String(d.seed || '').slice(0, 24)
        })
      });
      return true;
    } catch (e) { return false; }
  }

  /* HET GRAFSCHRIFT: je laatste woorden op je score-rij van vandaag (kolom
     'boodschap', SQL deel 1d). Best-effort PATCH — de score-upload loopt
     hier nooit gevaar door. return=representation onthult of er écht een
     rij geraakt is: vlak na de dood kan de score-insert nog onderweg zijn
     (fire-and-forget) → dan één stille herkansing. */
  async function stuurGrafschrift(dag, tekst) {
    const ik = identiteit();
    tekst = String(tekst || '').replace(/[<>]/g, '').trim().slice(0, 140);
    if (!ik || !tekst) return false;
    const patch = async () => {
      const r = await req(`scores?groep=eq.${encodeURIComponent(ik.code)}&naam=eq.${encodeURIComponent(ik.naam)}&dag=eq.${encodeURIComponent(dag)}`, {
        method: 'PATCH', prefer: 'return=representation',
        body: JSON.stringify({ boodschap: tekst })
      });
      return Array.isArray(r) && r.length > 0;
    };
    try {
      if (await patch()) return true;
      await new Promise(res => setTimeout(res, 1600));   /* score-rij nog onderweg? */
      return await patch();
    } catch (e) { return false; }
  }

  const q = () => 'groep=eq.' + encodeURIComponent(lid.code);

  /* de groepsgeschiedenis over meerdere dagen in ÉÉN query — voedt HET
     DUELDECREET (duelstand) en DE EEUWIGE VLAM (posse-reeks). De caller
     (game.js) bouwt de dagenlijst; datums zijn YYYY-MM-DD, veilig in in.() */
  const groepGeschiedenis = dagen =>
    req(`scores?${q()}&dag=in.(${dagen.map(encodeURIComponent).join(',')})&select=dag,naam,score,gewonnen&limit=400`);

  /* DE NALATENSCHAP (SQL 1g, kolom 'nalatenschap'): de beste kaart van een
     gevallene reist naar de volgende genoot die afdaalt. Zelfde best-effort
     PATCH-patroon als het grafschrift: de score-upload loopt nooit gevaar,
     en zolang de kolom niet bestaat (SQL 1g niet gedraaid) faalt dit stil. */
  async function stuurNalatenschap(dag, kaartId) {
    const ik = identiteit();
    kaartId = String(kaartId || '').slice(0, 40);
    if (!ik || !kaartId) return false;
    const patch = async () => {
      const r = await req(`scores?groep=eq.${encodeURIComponent(ik.code)}&naam=eq.${encodeURIComponent(ik.naam)}&dag=eq.${encodeURIComponent(dag)}`, {
        method: 'PATCH', prefer: 'return=representation',
        body: JSON.stringify({ nalatenschap: kaartId })
      });
      return Array.isArray(r) && r.length > 0;
    };
    try {
      if (await patch()) return true;
      await new Promise(res => setTimeout(res, 1600));   /* score-rij nog onderweg? */
      return await patch();
    } catch (e) { return false; }
  }

  /* de nalatenschap van vandaag ophalen: de hoogst gescoorde GEVALLEN genoot
     (niet jijzelf) die een kaart naliet. Kolom onbekend/offline → stil null. */
  async function haalNalatenschap(dag) {
    if (!lid) return null;
    try {
      const r = await req(`scores?${q()}&dag=eq.${encodeURIComponent(dag)}&naam=neq.${encodeURIComponent(lid.naam)}&nalatenschap=not.is.null&gewonnen=is.false&select=naam,nalatenschap&order=score.desc&limit=1`);
      return (Array.isArray(r) && r[0]) ? { naam: r[0].naam, kaart: r[0].nalatenschap } : null;
    } catch (e) { return null; }
  }
  /* het dagpodium: de scores van het syndicaat voor één dag */
  const dagTop = dag => req(`scores?${q()}&dag=eq.${encodeURIComponent(dag)}&order=score.desc&limit=60`);   /* 60: wie buiten een top-10 viel werd als 'niet afgedaald' gepord (debug-sweep) */
  /* aller tijden: de hoogste scores ooit binnen het syndicaat */
  const allerTijden = () => req(`scores?${q()}&order=score.desc&limit=10`);
  /* de stoef-feed: recentste wapenfeiten */
  const feed = () => req(`scores?${q()}&order=gemaakt.desc&limit=8`);

  /* ---------- HET WERELDBORD: over alle posses heen ---------- */
  /* dev-/testgroepen horen niet op het echte bord (eerdere test-inserts
     staan onherroepelijk in de tabel — RLS kent bewust geen delete) */
  const isTestGroep = g => /^(TEST|ETEST|PROBE)-/.test(String(g || ''));
  const zonderTest = r => (Array.isArray(r) ? r.filter(x => x && !isTestGroep(x.groep)) : r);
  /* het wereld-dagklassement: iedereen die vandaag afdaalde, alle groepen.
     (groep,naam,dag) is uniek → geen dubbele spelers op één dag. */
  const wereldDag = dag => req(`scores?dag=eq.${encodeURIComponent(dag)}&order=score.desc&limit=40`)
    .then(zonderTest).then(r => (Array.isArray(r) ? r.filter(x => !isRunGroep(x.groep)) : r));   /* 'Vandaag' = zelfde seed → alleen dailies (v100) */
  /* aller tijden wereldwijd: haal ruim op en houd per speler (groep+naam)
     alleen zijn beste dag over — PostgREST kan geen DISTINCT ON, dus de
     dedup gebeurt hier (client), ruim binnen de vriendenschaal */
  const wereldOoit = () => req('scores?order=score.desc&limit=200').then(rijen => {
    const beste = [];
    const gezien = {};
    (zonderTest(rijen) || []).forEach(r => {
      const sleutel = basisGroep(r.groep) + '|' + r.naam; /* basisgroep: daily én vrije run van dezelfde speler tellen als één (v100). Zichtbare scheider: '|' kan nooit in een code (normCode); hier stond een ONZICHTBARE controlebyte (0x01) die als lege string oogde */
      if (!gezien[sleutel]) { gezien[sleutel] = true; beste.push(r); }
    });
    return beste;
  });

  /* ---------- de sociale laag: leden + porren ---------- */
  /* aanmelden als lid + 'laatst gezien' verversen (upsert op groep,naam).
     Faalt de leden-tabel (SQL deel 1b nog niet gedraaid)? Stil negeren —
     het bord blijft werken. */
  /* THROTTLE: 'laatst gezien' hoeft niet bij élke aanroep de deur uit. Het
     leaderboard openen triggerde meldAan 2× (vulSyndicaat + checkPorInbox) —
     nu hooguit één schrijf per MELD_PAUZE. */
  const MELD_PAUZE = 5 * 60 * 1000;
  let laatsteMelding = 0;
  let laatsteMeldSleutel = '';   /* groep|naam: een syndicaatswissel binnen de pauze bleef anders onaangemeld (debug-sweep) */
  async function meldAan(forceer) {
    if (!isLid()) return false;
    const nu = Date.now();
    const sleutel = lid.code + '|' + lid.naam;
    if (!forceer && sleutel === laatsteMeldSleutel && nu - laatsteMelding < MELD_PAUZE) return true;
    laatsteMelding = nu;
    laatsteMeldSleutel = sleutel;
    try {
      await req('leden?on_conflict=groep,naam', {
        method: 'POST', prefer: 'resolution=merge-duplicates',
        body: JSON.stringify({ groep: lid.code, naam: lid.naam, laatst_gezien: new Date().toISOString() })
      });
      return true;
    } catch (e) { laatsteMelding = 0; laatsteMeldSleutel = ''; return false; }   /* mislukt? volgende keer opnieuw proberen */
  }
  const leden = () => req(`leden?${q()}&order=naam.asc&limit=60`);

  /* por een genoot om zijn dagelijkse afdaling te doen. Eén por per koppel per
     dag (unieke index → duplicaat wordt genegeerd) = ingebouwde anti-spam. */
  async function stuurPor(naar, dag, bericht) {
    if (!isLid()) return false;
    naar = normNaam(naar);
    if (!naar || naar === lid.naam) return false;
    try {
      await req('porren?on_conflict=groep,van,naar,dag', {
        method: 'POST', prefer: 'resolution=ignore-duplicates',
        body: JSON.stringify({ groep: lid.code, van: lid.naam, naar, dag: String(dag || ''), bericht: String(bericht || '').slice(0, 120) })
      });
      return true;
    } catch (e) { return false; }
  }
  /* mijn inbox voor vandaag: wie heeft míj gepord? */
  const mijnPorren = dag => req(`porren?${q()}&naar=eq.${encodeURIComponent(lid.naam)}&dag=eq.${encodeURIComponent(dag)}&order=gemaakt.desc&limit=20`);

  /* DEV-haakje: config vanuit de console zetten om te testen zonder hardcoden
     (bv. Online._dev('https://xyz.supabase.co', 'sleutel')) */
  function _dev(url, key) { CONFIG.url = url || CONFIG.url; CONFIG.anonKey = key || CONFIG.anonKey; }

  return { actief, isLid, lid: () => lid, normCode, normNaam, verzinCode, wordLid, verlaat,
           identiteit, isZwerver, wordZwerver, hernoem,
           stuurScore, stuurRunScore, isRunGroep, basisGroep, stuurGrafschrift, dagTop, allerTijden, feed,
           groepGeschiedenis, stuurNalatenschap, haalNalatenschap,
           wereldDag, wereldOoit,
           meldAan, leden, stuurPor, mijnPorren, _dev };
})();
window.Online = Online;
