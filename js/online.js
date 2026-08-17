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
  /* het dagpodium: de scores van het syndicaat voor één dag */
  const dagTop = dag => req(`scores?${q()}&dag=eq.${encodeURIComponent(dag)}&order=score.desc&limit=10`);
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
  const wereldDag = dag => req(`scores?dag=eq.${encodeURIComponent(dag)}&order=score.desc&limit=40`).then(zonderTest);
  /* aller tijden wereldwijd: haal ruim op en houd per speler (groep+naam)
     alleen zijn beste dag over — PostgREST kan geen DISTINCT ON, dus de
     dedup gebeurt hier (client), ruim binnen de vriendenschaal */
  const wereldOoit = () => req('scores?order=score.desc&limit=200').then(rijen => {
    const beste = [];
    const gezien = {};
    (zonderTest(rijen) || []).forEach(r => {
      const sleutel = r.groep + '' + r.naam;
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
  async function meldAan(forceer) {
    if (!isLid()) return false;
    const nu = Date.now();
    if (!forceer && nu - laatsteMelding < MELD_PAUZE) return true;
    laatsteMelding = nu;
    try {
      await req('leden?on_conflict=groep,naam', {
        method: 'POST', prefer: 'resolution=merge-duplicates',
        body: JSON.stringify({ groep: lid.code, naam: lid.naam, laatst_gezien: new Date().toISOString() })
      });
      return true;
    } catch (e) { laatsteMelding = 0; return false; }   /* mislukt? volgende keer opnieuw proberen */
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
           identiteit, isZwerver, wordZwerver,
           stuurScore, stuurGrafschrift, dagTop, allerTijden, feed,
           wereldDag, wereldOoit,
           meldAan, leden, stuurPor, mijnPorren, _dev };
})();
window.Online = Online;
