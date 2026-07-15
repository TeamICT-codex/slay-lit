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

  const actief = () => !!(CONFIG.url && CONFIG.anonKey);
  const isLid = () => actief() && !!lid;

  /* codes en namen strak normaliseren: ze reizen door URL's én innerHTML */
  const normCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
  const normNaam = n => String(n || '').trim().replace(/[<>&"']/g, '').slice(0, 20);

  /* woordenlijst voor de code-generator — thematisch, makkelijk door te zeggen */
  const CODE_WOORDEN = ['KELDER', 'FAKKEL', 'SINTEL', 'DIEPTE', 'SCHACHT', 'VONK', 'ASREGEN', 'DREMPEL'];
  const verzinCode = () => CODE_WOORDEN[Math.floor(Math.random() * CODE_WOORDEN.length)] + '-' + Math.floor(1000 + Math.random() * 9000);

  async function req(pad, opts) {
    opts = opts || {};
    const r = await fetch(CONFIG.url + '/rest/v1/' + pad, {
      method: opts.method || 'GET',
      headers: {
        apikey: CONFIG.anonKey,
        Authorization: 'Bearer ' + CONFIG.anonKey,
        'Content-Type': 'application/json',
        Prefer: opts.prefer || ''
      },
      body: opts.body || undefined
    });
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
     dag overschrijft gewoon (de daily is toch één poging per dag) */
  async function stuurScore(d) {
    if (!isLid()) return false;
    try {
      await req('scores?on_conflict=groep,naam,dag', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates',
        body: JSON.stringify({
          groep: lid.code, naam: lid.naam,
          dag: String(d.dag || ''), score: Math.max(0, d.score | 0),
          held: String(d.held || 'slachter'), diepte: Math.max(0, d.diepte | 0),
          gewonnen: !!d.gewonnen, seed: String(d.seed || '').slice(0, 24)
        })
      });
      return true;
    } catch (e) { return false; }
  }

  const q = () => 'groep=eq.' + encodeURIComponent(lid.code);
  /* het dagpodium: de scores van het syndicaat voor één dag */
  const dagTop = dag => req(`scores?${q()}&dag=eq.${encodeURIComponent(dag)}&order=score.desc&limit=10`);
  /* aller tijden: de hoogste scores ooit binnen het syndicaat */
  const allerTijden = () => req(`scores?${q()}&order=score.desc&limit=10`);
  /* de stoef-feed: recentste wapenfeiten */
  const feed = () => req(`scores?${q()}&order=gemaakt.desc&limit=8`);

  /* ---------- de sociale laag: leden + porren ---------- */
  /* aanmelden als lid + 'laatst gezien' verversen (upsert op groep,naam).
     Faalt de leden-tabel (SQL deel 1b nog niet gedraaid)? Stil negeren —
     het bord blijft werken. */
  async function meldAan() {
    if (!isLid()) return false;
    try {
      await req('leden?on_conflict=groep,naam', {
        method: 'POST', prefer: 'resolution=merge-duplicates',
        body: JSON.stringify({ groep: lid.code, naam: lid.naam, laatst_gezien: new Date().toISOString() })
      });
      return true;
    } catch (e) { return false; }
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
           stuurScore, dagTop, allerTijden, feed,
           meldAan, leden, stuurPor, mijnPorren, _dev };
})();
window.Online = Online;
