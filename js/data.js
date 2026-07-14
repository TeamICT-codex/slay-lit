/* ============================================================
   SLAY LIT — speldata: kaarten, vijanden, relikwieën, drankjes, events
   ============================================================ */

/* ---------- KAARTEN ----------
   type: aanval | vaardigheid | kracht | vloek
   zeld: basis | gewoon | ongewoon | zeldzaam | vloek
   doel: 'vijand' als de kaart een doelwit nodig heeft
   pv() = aanvalsschade-preview (incl. Kracht/Zwak), bv() = blokwaarde
*/
const KAARTEN = {
  /* --- basis --- */
  slag: {
    naam: 'Slag', type: 'aanval', zeld: 'basis', kost: 1, doel: 'vijand', icoon: '⚔️',
    dmg: 6, up: { dmg: 9 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade.`,
    speel: (c, t) => { aanvalOp(t, kval(c, 'dmg')); }
  },
  verdediging: {
    naam: 'Verdediging', type: 'vaardigheid', zeld: 'basis', kost: 1, icoon: '🛡️',
    blok: 5, up: { blok: 8 }, kopie: { soort: 'blok', veld: 'blok' },
    tekst: c => `Krijg ${kval(c, 'blok')} Blok.`,
    speel: c => { geefBlok(sp(), kval(c, 'blok')); }
  },
  knal: {
    naam: 'Knal', type: 'aanval', zeld: 'basis', kost: 2, doel: 'vijand', icoon: '💥',
    dmg: 8, kw: 2, up: { dmg: 10, kw: 3 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade. Geef ${kval(c, 'kw')} Kwetsbaar.`,
    speel: (c, t) => { aanvalOp(t, kval(c, 'dmg')); geefStatus(t, 'kwetsbaar', kval(c, 'kw')); }
  },

  /* --- gewone aanvallen --- */
  dubbelslag: {
    naam: 'Dubbelslag', type: 'aanval', zeld: 'gewoon', kost: 1, doel: 'vijand', icoon: '⚔️',
    dmg: 4, up: { dmg: 6 },
    tekst: c => `Doe ${pv(c, 'dmg')} schade, twee keer.`,
    speel: (c, t) => reeksAanval(t, kval(c, 'dmg'), 2)
  },
  zware_klap: {
    naam: 'Zware Klap', type: 'aanval', zeld: 'gewoon', kost: 2, doel: 'vijand', icoon: '🔨',
    dmg: 14, up: { dmg: 18 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade.`,
    speel: (c, t) => { aanvalOp(t, kval(c, 'dmg')); }
  },
  klingenstorm: {
    naam: 'Klingenstorm', type: 'aanval', zeld: 'gewoon', kost: 1, icoon: '🌪️',
    dmg: 4, up: { dmg: 6 },
    tekst: c => `Doe ${pv(c, 'dmg')} schade aan ALLE vijanden.`,
    speel: c => reeksAanvalAlle(kval(c, 'dmg'))
  },
  giftige_steek: {
    naam: 'Giftige Steek', type: 'aanval', zeld: 'gewoon', kost: 1, doel: 'vijand', icoon: '🗡️',
    dmg: 5, gif: 3, up: { dmg: 6, gif: 5 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade. Geef ${kval(c, 'gif')} Gif.`,
    speel: (c, t) => { aanvalOp(t, kval(c, 'dmg')); geefGif(t, kval(c, 'gif')); }
  },
  ijzeren_golf: {
    naam: 'IJzeren Golf', type: 'aanval', zeld: 'gewoon', kost: 1, doel: 'vijand', icoon: '🌊',
    dmg: 5, blok: 5, up: { dmg: 7, blok: 7 },
    tekst: c => `Doe ${pv(c, 'dmg')} schade. Krijg ${kval(c, 'blok')} Blok.`,
    speel: (c, t) => { aanvalOp(t, kval(c, 'dmg')); geefBlok(sp(), kval(c, 'blok')); }
  },
  bloedoffer: {
    naam: 'Bloedoffer', type: 'aanval', zeld: 'ongewoon', kost: 0, doel: 'vijand', icoon: '🩸',
    dmg: 13, zelf: 2, up: { dmg: 17, zelf: 2 },
    tekst: c => `Verlies ${kval(c, 'zelf')} HP. Doe ${pv(c, 'dmg')} schade.`,
    speel: (c, t) => { verliesHp(sp(), kval(c, 'zelf')); aanvalOp(t, kval(c, 'dmg')); }
  },
  uithaal: {
    naam: 'Uithaal', type: 'aanval', zeld: 'ongewoon', kost: 2, doel: 'vijand', icoon: '🥊',
    dmg: 10, st: 1, up: { dmg: 13, st: 2 },
    tekst: c => `Doe ${pv(c, 'dmg')} schade. Geef ${kval(c, 'st')} Zwak en ${kval(c, 'st')} Kwetsbaar.`,
    speel: (c, t) => {
      aanvalOp(t, kval(c, 'dmg'));
      geefStatus(t, 'zwak', kval(c, 'st'));
      geefStatus(t, 'kwetsbaar', kval(c, 'st'));
    }
  },
  executie: {
    naam: 'Executie', type: 'aanval', zeld: 'ongewoon', kost: 1, doel: 'vijand', icoon: '⚰️',
    dmg: 7, bonus: 5, up: { dmg: 9, bonus: 7 },
    tekst: c => `Doe ${pv(c, 'dmg')} schade. Kwetsbare vijanden krijgen ${kval(c, 'bonus')} extra schade.`,
    speel: (c, t) => {
      const extra = (t.status.kwetsbaar > 0) ? kval(c, 'bonus') : 0;
      aanvalOp(t, kval(c, 'dmg') + extra);
    }
  },
  molensteen: {
    naam: 'Molensteen', type: 'aanval', zeld: 'ongewoon', kost: 1, doel: 'vijand', icoon: '🪨',
    basis: 2, up: { basis: 4 },
    tekst: c => `Doe ${kval(c, 'basis')} schade plus 1 per kaart in je aflegstapel.`,
    speel: (c, t) => { aanvalOp(t, kval(c, 'basis') + S.gevecht.afleg.length); }
  },
  vampiersbeet: {
    naam: 'Vampiersbeet', type: 'aanval', zeld: 'zeldzaam', kost: 2, doel: 'vijand', icoon: '🧛',
    dmg: 9, heel: 4, up: { dmg: 12, heel: 6 },
    tekst: c => `Doe ${pv(c, 'dmg')} schade. Genees ${kval(c, 'heel')} HP.`,
    speel: (c, t) => { aanvalOp(t, kval(c, 'dmg')); geneesHp(kval(c, 'heel')); }
  },
  wervelwind: {
    naam: 'Wervelwind', type: 'aanval', zeld: 'zeldzaam', kost: 2, icoon: '🌀',
    dmg: 8, up: { dmg: 11 },
    tekst: c => `Doe ${pv(c, 'dmg')} schade aan ALLE vijanden.`,
    speel: c => reeksAanvalAlle(kval(c, 'dmg'))
  },
  genadeslag: {
    naam: 'Genadeslag', type: 'aanval', zeld: 'zeldzaam', kost: 3, doel: 'vijand', icoon: '☄️',
    dmg: 24, up: { dmg: 32 },
    tekst: c => `Doe ${pv(c, 'dmg')} schade.`,
    speel: (c, t) => { aanvalOp(t, kval(c, 'dmg')); }
  },

  /* --- vaardigheden --- */
  schildmuur: {
    naam: 'Schildmuur', type: 'vaardigheid', zeld: 'gewoon', kost: 1, icoon: '🧱',
    blok: 8, up: { blok: 11 },
    tekst: c => `Krijg ${kval(c, 'blok')} Blok. Trek 1 kaart.`,
    speel: c => { geefBlok(sp(), kval(c, 'blok')); trekKaarten(1); }
  },
  ontwijken: {
    naam: 'Ontwijken', type: 'vaardigheid', zeld: 'gewoon', kost: 0, icoon: '💨',
    blok: 3, up: { blok: 5 },
    tekst: c => `Krijg ${kval(c, 'blok')} Blok.`,
    speel: c => { geefBlok(sp(), kval(c, 'blok')); }
  },
  krijgslist: {
    naam: 'Krijgslist', type: 'vaardigheid', zeld: 'gewoon', kost: 0, icoon: '📜',
    n: 2, up: { n: 3 },
    tekst: c => `Trek ${kval(c, 'n')} kaarten.`,
    speel: c => { trekKaarten(kval(c, 'n')); }
  },
  ontwapening: {
    naam: 'Ontwapening', type: 'vaardigheid', zeld: 'gewoon', kost: 1, doel: 'vijand', icoon: '🪤',
    n: 2, up: { n: 3 },
    tekst: c => `Geef een vijand ${kval(c, 'n')} Zwak.`,
    speel: (c, t) => { geefStatus(t, 'zwak', kval(c, 'n')); }
  },
  gifwolk: {
    naam: 'Gifwolk', type: 'vaardigheid', zeld: 'ongewoon', kost: 1, icoon: '☁️',
    gif: 3, up: { gif: 5 },
    tekst: c => `Geef ALLE vijanden ${kval(c, 'gif')} Gif.`,
    speel: c => { alleVijanden().forEach(v => geefGif(v, kval(c, 'gif'))); }
  },
  schokgolf: {
    naam: 'Schokgolf', type: 'vaardigheid', zeld: 'ongewoon', kost: 1, icoon: '📣',
    n: 1, up: { n: 2 },
    tekst: c => `Geef ALLE vijanden ${kval(c, 'n')} Zwak en ${kval(c, 'n')} Kwetsbaar.`,
    speel: c => {
      alleVijanden().forEach(v => {
        geefStatus(v, 'zwak', kval(c, 'n'));
        geefStatus(v, 'kwetsbaar', kval(c, 'n'));
      });
    }
  },
  adrenaline: {
    naam: 'Adrenaline', type: 'vaardigheid', zeld: 'ongewoon', kost: 0, icoon: '⚡', uitputten: true,
    e: 1, up: { e: 2 },
    tekst: c => `Krijg ${kval(c, 'e')} Energie. Trek 1 kaart. Uitputten.`,
    speel: c => { S.gevecht.energie += kval(c, 'e'); trekKaarten(1); }
  },
  tweede_adem: {
    naam: 'Tweede Adem', type: 'vaardigheid', zeld: 'ongewoon', kost: 1, icoon: '🫁', uitputten: true,
    heel: 5, up: { heel: 8 },
    tekst: c => `Genees ${kval(c, 'heel')} HP. Uitputten.`,
    speel: c => { geneesHp(kval(c, 'heel')); }
  },
  offerande: {
    naam: 'Offerande', type: 'vaardigheid', zeld: 'ongewoon', kost: 0, icoon: '🕯️',
    zelf: 3, n: 3, up: { zelf: 2, n: 3 },
    tekst: c => `Verlies ${kval(c, 'zelf')} HP. Trek ${kval(c, 'n')} kaarten.`,
    speel: c => { verliesHp(sp(), kval(c, 'zelf')); trekKaarten(kval(c, 'n')); }
  },
  bolwerk: {
    naam: 'Bolwerk', type: 'vaardigheid', zeld: 'ongewoon', kost: 2, icoon: '🏰',
    blok: 13, up: { blok: 17 },
    tekst: c => `Krijg ${kval(c, 'blok')} Blok.`,
    speel: c => { geefBlok(sp(), kval(c, 'blok')); }
  },
  zuivering: {
    naam: 'Zuivering', type: 'vaardigheid', zeld: 'zeldzaam', kost: 1, icoon: '✨',
    blok: 7, up: { blok: 10 },
    tekst: c => `Krijg ${kval(c, 'blok')} Blok. Verwijder Zwak en Kwetsbaar van jezelf.`,
    speel: c => {
      geefBlok(sp(), kval(c, 'blok'));
      sp().status.zwak = 0; sp().status.kwetsbaar = 0;
    }
  },

  /* --- krachten --- */
  metaalhuid: {
    naam: 'Metaalhuid', type: 'kracht', zeld: 'gewoon', kost: 1, icoon: '🦾',
    n: 3, up: { n: 4 },
    tekst: c => `Krijg aan het einde van elke beurt ${kval(c, 'n')} Blok.`,
    speel: c => { geefStatus(sp(), 'metaalhuid', kval(c, 'n')); }
  },
  vlammende_hartstocht: {
    naam: 'Vlammende Hartstocht', type: 'kracht', zeld: 'ongewoon', kost: 1, icoon: '🔥',
    n: 2, up: { n: 3 },
    tekst: c => `Krijg ${kval(c, 'n')} Kracht.`,
    speel: c => { geefStatus(sp(), 'kracht', kval(c, 'n')); }
  },
  doornenhuid: {
    naam: 'Doornenhuid', type: 'kracht', zeld: 'ongewoon', kost: 1, icoon: '🌵',
    n: 3, up: { n: 5 },
    tekst: c => `Vijanden die je aanvallen krijgen ${kval(c, 'n')} schade.`,
    speel: c => { geefStatus(sp(), 'doornen', kval(c, 'n')); }
  },
  gifklieren: {
    naam: 'Gifklieren', type: 'kracht', zeld: 'ongewoon', kost: 1, icoon: '🧫',
    n: 2, up: { n: 3 },
    tekst: c => `Geef aan het begin van elke beurt ALLE vijanden ${kval(c, 'n')} Gif.`,
    speel: c => { geefStatus(sp(), 'gifklieren', kval(c, 'n')); }
  },
  demonenvorm: {
    naam: 'Demonenvorm', type: 'kracht', zeld: 'zeldzaam', kost: 3, icoon: '😈',
    n: 2, up: { n: 3 },
    tekst: c => `Krijg aan het begin van elke beurt ${kval(c, 'n')} Kracht.`,
    speel: c => { geefStatus(sp(), 'demonenvorm', kval(c, 'n')); }
  },
  energiekern: {
    naam: 'Energiekern', type: 'kracht', zeld: 'zeldzaam', kost: 3, icoon: '🔋',
    tekst: () => `Krijg aan het begin van elke beurt 1 extra Energie.`,
    speel: () => { geefStatus(sp(), 'energiekern', 1); }
  },

  /* ============ DE GIFMAGIËR — eigen kaartenpool ============ */
  prik: {
    naam: 'Prik', type: 'aanval', zeld: 'basis', kost: 1, doel: 'vijand', icoon: '🗡️',
    dmg: 5, up: { dmg: 8 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade.`,
    speel: (c, t) => { aanvalOp(t, kval(c, 'dmg')); }
  },
  dodelijke_kus: {
    naam: 'Dodelijke Kus', type: 'aanval', zeld: 'basis', kost: 1, doel: 'vijand', icoon: '💋',
    dmg: 3, gif: 3, up: { dmg: 4, gif: 5 },
    tekst: c => `Doe ${pv(c, 'dmg')} schade. Geef ${kval(c, 'gif')} Gif.`,
    speel: (c, t) => { aanvalOp(t, kval(c, 'dmg')); geefGif(t, kval(c, 'gif')); }
  },
  snelle_steek: {
    naam: 'Snelle Steek', type: 'aanval', zeld: 'gewoon', kost: 0, doel: 'vijand', icoon: '⚡',
    dmg: 4, up: { dmg: 6 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade.`,
    speel: (c, t) => { aanvalOp(t, kval(c, 'dmg')); }
  },
  slangenbeet: {
    naam: 'Slangenbeet', type: 'aanval', zeld: 'gewoon', kost: 1, doel: 'vijand', icoon: '🐍',
    dmg: 6, bonus: 4, up: { dmg: 8, bonus: 6 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade. Vergiftigde vijanden krijgen ${kval(c, 'bonus')} extra schade.`,
    speel: (c, t) => {
      const extra = (t.status.gif > 0) ? kval(c, 'bonus') : 0;
      aanvalOp(t, kval(c, 'dmg') + extra);
    }
  },
  venijnregen: {
    naam: 'Venijnregen', type: 'aanval', zeld: 'gewoon', kost: 1, icoon: '🌧️',
    dmg: 3, gif: 2, up: { dmg: 4, gif: 3 },
    tekst: c => `Doe ${pv(c, 'dmg')} schade en geef ${kval(c, 'gif')} Gif aan ALLE vijanden.`,
    speel: c => reeksAanvalAlle(kval(c, 'dmg'), v => geefGif(v, kval(c, 'gif')))
  },
  giftand: {
    naam: 'Giftand', type: 'aanval', zeld: 'ongewoon', kost: 2, doel: 'vijand', icoon: '🦷',
    dmg: 9, up: { dmg: 12 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade. Verdubbel het Gif op het doelwit.`,
    speel: (c, t) => {
      aanvalOp(t, kval(c, 'dmg'));
      if (!t.dood && t.status.gif > 0) geefStatus(t, 'gif', t.status.gif);
    }
  },
  nachtschade: {
    naam: 'Nachtschade', type: 'aanval', zeld: 'zeldzaam', kost: 2, doel: 'vijand', icoon: '🌑',
    maal: 3, up: { maal: 4 },
    tekst: c => `Doe ${kval(c, 'maal')}× het Gif op het doelwit aan schade. Verbruik daarna ál het Gif.`,
    speel: (c, t) => { aanvalOp(t, (t.status.gif || 0) * kval(c, 'maal')); if (!t.dood) t.status.gif = 0; }   /* finisher: het gif erupteert in één klap, geen blijvende DoT meer */
  },
  gifflits: {
    naam: 'Gifflits', type: 'vaardigheid', zeld: 'gewoon', kost: 0, doel: 'vijand', icoon: '💉',
    gif: 3, up: { gif: 5 }, kopie: { soort: 'gif', veld: 'gif' },
    tekst: c => `Geef ${kval(c, 'gif')} Gif.`,
    speel: (c, t) => { geefGif(t, kval(c, 'gif')); }
  },
  sluiproute: {
    naam: 'Sluiproute', type: 'vaardigheid', zeld: 'gewoon', kost: 1, icoon: '🥾',
    blok: 6, up: { blok: 9 },
    tekst: c => `Krijg ${kval(c, 'blok')} Blok. Trek 1 kaart.`,
    speel: c => { geefBlok(sp(), kval(c, 'blok')); trekKaarten(1); }
  },
  verlammend_gif: {
    naam: 'Verlammend Gif', type: 'vaardigheid', zeld: 'ongewoon', kost: 1, doel: 'vijand', icoon: '🕷️',
    gif: 2, zwak: 2, up: { gif: 3, zwak: 3 },
    tekst: c => `Geef ${kval(c, 'gif')} Gif en ${kval(c, 'zwak')} Zwak.`,
    speel: (c, t) => { geefGif(t, kval(c, 'gif')); geefStatus(t, 'zwak', kval(c, 'zwak')); }
  },
  katalyse: {
    naam: 'Katalyse', type: 'vaardigheid', zeld: 'zeldzaam', kost: 1, doel: 'vijand', icoon: '⚗️', uitputten: true,
    maal: 2, up: { maal: 3 },
    tekst: c => `${kval(c, 'maal') === 2 ? 'Verdubbel' : 'Verdriedubbel'} het Gif op een vijand. Uitputten.`,
    speel: (c, t) => {
      if (t.status.gif > 0) geefStatus(t, 'gif', t.status.gif * (kval(c, 'maal') - 1));
    }
  },
  etterende_wonden: {
    naam: 'Etterende Wonden', type: 'kracht', zeld: 'ongewoon', kost: 1, icoon: '🩹',
    n: 1, up: { n: 2 },
    tekst: c => `Je aanvallen geven ${kval(c, 'n')} Gif.`,
    speel: c => { geefStatus(sp(), 'etterende', kval(c, 'n')); }
  },
  bloedzuiger: {
    naam: 'Bloedzuiger', type: 'kracht', zeld: 'ongewoon', kost: 1, icoon: '🦟',
    n: 1, up: { n: 2 },
    tekst: c => `Genees aan het begin van je beurt ${kval(c, 'n')} HP per vergiftigde vijand.`,
    speel: c => { geefStatus(sp(), 'bloedzuiger', kval(c, 'n')); }
  },
  epidemie: {
    naam: 'Epidemie', type: 'kracht', zeld: 'zeldzaam', kost: 2, icoon: '☣️',
    gif: 4, up: { gif: 6 },
    tekst: c => `Sterft een vijand, dan krijgen alle vijanden ${kval(c, 'gif')} Gif.`,
    speel: c => { geefStatus(sp(), 'epidemie', kval(c, 'gif')); }
  },

  /* ============ LICHTKAARTEN (neutraal — verbranden fakkellicht) ============ */
  vlamstoot: {
    naam: 'Vlamstoot', type: 'aanval', zeld: 'ongewoon', kost: 1, doel: 'vijand', icoon: '🔥',
    dmg: 11, licht: 4, up: { dmg: 15 },
    tekst: c => `Verbrand ${kval(c, 'licht')} licht. Doe ${pv(c, 'dmg')} schade.`,
    speel: (c, t) => { verbrandLicht(kval(c, 'licht')); aanvalOp(t, kval(c, 'dmg')); }
  },
  verlichting: {
    naam: 'Verlichting', type: 'vaardigheid', zeld: 'gewoon', kost: 0, icoon: '🕯️',
    n: 2, licht: 3, up: { licht: 2 },
    tekst: c => `Verbrand ${kval(c, 'licht')} licht. Trek ${kval(c, 'n')} kaarten.`,
    speel: c => { verbrandLicht(kval(c, 'licht')); trekKaarten(kval(c, 'n')); }
  },
  innerlijk_vuur: {
    naam: 'Innerlijk Vuur', type: 'kracht', zeld: 'zeldzaam', kost: 2, icoon: '🫀',
    vuur: true,
    up: { kost: 1 },
    tekst: () => `Krijg elke beurt +1 Energie, maar verbrand elke beurt 2 licht.`,
    speel: () => { geefStatus(sp(), 'innerlijkvuur', 1); }
  },
  gloed: {
    naam: 'Gloed', type: 'vaardigheid', zeld: 'gewoon', kost: 1, icoon: '✨',
    vuur: true, uitputten: true,
    n: 8, up: { n: 12 },
    tekst: c => `Je fakkel laait op: +${pv(c, 'n')} licht. Uitputten.`,
    speel: c => { zetFakkel(kval(c, 'n')); }
  },
  lichtbaken: {
    naam: 'Lichtbaken', type: 'kracht', zeld: 'zeldzaam', kost: 2, icoon: '🏮',
    vuur: true,
    up: { kost: 1 },
    tekst: () => `Aan het begin van elke beurt: +2 licht.`,
    speel: () => { geefStatus(sp(), 'baken', 1); }
  },
  schaduwdans: {
    naam: 'Schaduwdans', type: 'vaardigheid', zeld: 'ongewoon', kost: 1, icoon: '🌑',
    blok: 5, donkerBlok: 11, up: { blok: 7, donkerBlok: 14 },
    tekst: c => `Krijg ${pv(c, 'blok')} Blok. Is je fakkel duister of gedoofd: ${kval(c, 'donkerBlok')} Blok.`,
    speel: c => {
      const donker = ['duister', 'gedoofd'].includes(lichtNiveau());
      geefBlok(sp(), kval(c, donker ? 'donkerBlok' : 'blok'));
    }
  },
  omarm_het_duister: {
    naam: 'Omarm het Duister', type: 'vaardigheid', zeld: 'zeldzaam', kost: 1, icoon: '🌒',
    licht: 1, uitputten: true,
    per: 10, up: { per: 8 },
    tekst: c => `Verbrand AL je licht. Krijg 1 Kracht per ${pv(c, 'per')} verbrande licht. Uitputten.`,
    speel: c => {
      /* Kracht uit het FEITELIJK verloren licht — zo tellen Fakkeljongleur (0),
         Eeuwige Lont (stopt bij 10) en Smeulbuidel (−1) eerlijk mee. */
      const voor = S.fakkel;
      verbrandLicht(S.fakkel);
      const echtVerbrand = Math.max(0, voor - S.fakkel);
      const kracht = Math.floor(echtVerbrand / kval(c, 'per'));
      if (kracht > 0) geefStatus(sp(), 'kracht', kracht);
    }
  },
  vlammenkling: {
    naam: 'Vlammenkling', type: 'aanval', zeld: 'ongewoon', kost: 1, doel: 'vijand', icoon: '🗡️',
    dmg: 7, felDmg: 12, licht: 2, up: { dmg: 9, felDmg: 15 },
    tekst: c => `Verbrand ${kval(c, 'licht')} licht. Doe ${pv(c, 'dmg')} schade; brandt je fakkel helder: ${kval(c, 'felDmg')}.`,
    speel: (c, t) => {
      const fel = lichtNiveau() === 'helder';
      verbrandLicht(kval(c, 'licht'));
      aanvalOp(t, kval(c, fel ? 'felDmg' : 'dmg'));
    }
  },
  gifvlam: {
    naam: 'Gifvlam', type: 'vaardigheid', zeld: 'ongewoon', kost: 1, icoon: '☄️',
    gif: 3, licht: 3, up: { gif: 4 },
    tekst: c => `Verbrand ${kval(c, 'licht')} licht. Geef ALLE vijanden ${pv(c, 'gif')} Gif.`,
    speel: c => {
      verbrandLicht(kval(c, 'licht'));
      alleVijanden().forEach(v => geefGif(v, kval(c, 'gif')));
    }
  },

  /* --- het lichtverhaal: kaarten die de fakkel terugbetalen --- */
  lichtdief: {
    naam: 'Lichtdief', type: 'aanval', zeld: 'ongewoon', kost: 1, doel: 'vijand', icoon: '🥷',
    vuur: true,
    dmg: 6, winst: 2, up: { dmg: 8, winst: 3 },
    tekst: c => `Doe ${pv(c, 'dmg')} schade en steel ${kval(c, 'winst')} licht uit de schaduwen.`,
    speel: (c, t) => { aanvalOp(t, kval(c, 'dmg')); zetFakkel(kval(c, 'winst')); }
  },
  vlamschild: {
    naam: 'Vlamschild', type: 'vaardigheid', zeld: 'ongewoon', kost: 1, icoon: '🔆',
    vuur: true,
    blok: 6, felBlok: 10, up: { blok: 8, felBlok: 13 },
    tekst: c => `Krijg ${pv(c, 'blok')} Blok; brandt je fakkel helder: ${kval(c, 'felBlok')}.`,
    speel: c => { geefBlok(sp(), kval(c, lichtNiveau() === 'helder' ? 'felBlok' : 'blok')); }
  },
  duisterklauw: {
    naam: 'Duisterklauw', type: 'aanval', zeld: 'zeldzaam', kost: 1, doel: 'vijand', icoon: '🌘',
    vuur: true,
    dmg: 7, schemerDmg: 10, duisterDmg: 14, gedoofdDmg: 19,
    up: { dmg: 9, schemerDmg: 13, duisterDmg: 17, gedoofdDmg: 23 },
    tekst: c => `Hoe donkerder, hoe harder: ${pv(c, 'dmg')}/${kval(c, 'schemerDmg')}/${kval(c, 'duisterDmg')}/${kval(c, 'gedoofdDmg')} schade (helder → gedoofd).`,
    speel: (c, t) => {
      const veld = { helder: 'dmg', schemer: 'schemerDmg', duister: 'duisterDmg', gedoofd: 'gedoofdDmg' }[lichtNiveau()];
      aanvalOp(t, kval(c, veld));
    }
  },
  offervlam: {
    naam: 'Offervlam', type: 'vaardigheid', zeld: 'zeldzaam', kost: 0, icoon: '🔥',
    licht: 4, uitputten: true, up: { licht: 3 },
    tekst: c => `Verbrand ${kval(c, 'licht')} licht: +1 Energie en trek 1 kaart. Uitputten.`,
    speel: c => { verbrandLicht(kval(c, 'licht')); S.gevecht.energie += 1; trekKaarten(1); }
  },
  brandmerk: {
    naam: 'Brandmerk', type: 'aanval', zeld: 'zeldzaam', kost: 2, doel: 'vijand', icoon: '🔱',
    licht: 3, dmg: 11, kw: 2, up: { dmg: 14, licht: 2 },
    tekst: c => `Verbrand ${kval(c, 'licht')} licht. Doe ${pv(c, 'dmg')} schade en geef ${kval(c, 'kw')} Kwetsbaar.`,
    speel: (c, t) => { verbrandLicht(kval(c, 'licht')); aanvalOp(t, kval(c, 'dmg')); geefStatus(t, 'kwetsbaar', kval(c, 'kw')); }
  },
  lichtrot: {
    naam: 'Lichtrot', type: 'vaardigheid', zeld: 'zeldzaam', kost: 1, icoon: '🍄',
    vuur: true,
    gif: 2, schemerGif: 3, duisterGif: 5, gedoofdGif: 7,
    up: { gif: 3, schemerGif: 4, duisterGif: 6, gedoofdGif: 8 },
    tekst: c => `Het gif gedijt in het donker: geef ALLE vijanden ${pv(c, 'gif')}/${kval(c, 'schemerGif')}/${kval(c, 'duisterGif')}/${kval(c, 'gedoofdGif')} Gif (helder → gedoofd).`,
    speel: c => {
      const veld = { helder: 'gif', schemer: 'schemerGif', duister: 'duisterGif', gedoofd: 'gedoofdGif' }[lichtNiveau()];
      alleVijanden().forEach(v => geefGif(v, kval(c, veld)));
    }
  },

  /* --- Thoverk, de Kolendruïde: wortels, kolen en keukenmagie --- */
  takkenslag: {
    naam: 'Takkenslag', type: 'aanval', zeld: 'basis', kost: 1, doel: 'vijand', icoon: '🌳',
    dmg: 6, up: { dmg: 9 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade.`,
    speel: (c, t) => { aanvalOp(t, kval(c, 'dmg')); }
  },
  vonkenbeet: {
    naam: 'Vonkenbeet', type: 'aanval', zeld: 'gewoon', kost: 1, doel: 'vijand', icoon: '💥',
    licht: 1, dmg: 8, up: { dmg: 11 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Verbrand ${kval(c, 'licht')} licht. Doe ${pv(c, 'dmg')} schade.`,
    speel: (c, t) => { verbrandLicht(kval(c, 'licht')); aanvalOp(t, kval(c, 'dmg')); }
  },
  stoofpotje: {
    naam: 'Stoofpotje', type: 'vaardigheid', zeld: 'gewoon', kost: 1, icoon: '🍲',
    blok: 4, heel: 1, up: { blok: 6, heel: 2 },
    tekst: c => `Krijg ${pv(c, 'blok')} Blok en genees ${kval(c, 'heel')} HP.`,
    speel: c => { geefBlok(sp(), kval(c, 'blok')); geneesHp(kval(c, 'heel')); }
  },
  wortelgreep: {
    naam: 'Wortelgreep', type: 'aanval', zeld: 'gewoon', kost: 1, doel: 'vijand', icoon: '🌿',
    dmg: 5, zw: 1, up: { dmg: 7, zw: 2 },
    tekst: c => `Doe ${pv(c, 'dmg')} schade en geef ${kval(c, 'zw')} Zwak.`,
    speel: (c, t) => { aanvalOp(t, kval(c, 'dmg')); geefStatus(t, 'zwak', kval(c, 'zw')); }
  },
  doornzweep: {
    naam: 'Doornzweep', type: 'aanval', zeld: 'gewoon', kost: 1, doel: 'vijand', icoon: '🌵',
    dmg: 3, up: { dmg: 4 },
    tekst: c => `Doe ${pv(c, 'dmg')} schade, drie keer.`,
    speel: (c, t) => reeksAanval(t, kval(c, 'dmg'), 3)
  },
  bastvel: {
    naam: 'Bastvel', type: 'vaardigheid', zeld: 'gewoon', kost: 1, icoon: '🪵',
    blok: 7, dr: 1, up: { blok: 9, dr: 2 },
    tekst: c => `Krijg ${pv(c, 'blok')} Blok en ${kval(c, 'dr')} Doornen.`,
    speel: c => { geefBlok(sp(), kval(c, 'blok')); geefStatus(sp(), 'doornen', kval(c, 'dr')); }
  },
  sporenstoot: {
    naam: 'Sporenstoot', type: 'aanval', zeld: 'gewoon', kost: 1, doel: 'vijand', icoon: '🍄',
    dmg: 6, bonus: 4, up: { dmg: 8, bonus: 5 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade; +${kval(c, 'bonus')} als het doelwit Zwak of Kwetsbaar is.`,
    speel: (c, t) => {
      const raak = ((t.status.zwak || 0) > 0 || (t.status.kwetsbaar || 0) > 0);
      aanvalOp(t, kval(c, 'dmg') + (raak ? kval(c, 'bonus') : 0));
    }
  },
  stoofgeur: {
    naam: 'Stoofgeur', type: 'vaardigheid', zeld: 'ongewoon', kost: 1, icoon: '🍜',
    zw: 2, up: { zw: 3 },
    tekst: c => `De geur leidt af: ALLE vijanden krijgen ${pv(c, 'zw')} Zwak.`,
    speel: c => { alleVijanden().forEach(v => geefStatus(v, 'zwak', kval(c, 'zw'))); }
  },
  wurgwortels: {
    naam: 'Wurgwortels', type: 'aanval', zeld: 'ongewoon', kost: 2, doel: 'vijand', icoon: '🪢',
    dmg: 11, kw: 2, up: { dmg: 14, kw: 2 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade en geef ${kval(c, 'kw')} Kwetsbaar.`,
    speel: (c, t) => { aanvalOp(t, kval(c, 'dmg')); geefStatus(t, 'kwetsbaar', kval(c, 'kw')); }
  },
  kolengloed: {
    naam: 'Kolengloed', type: 'vaardigheid', zeld: 'ongewoon', kost: 1, icoon: '♨️',
    licht: 3, kr: 2, up: { licht: 2 },
    tekst: c => `Verbrand ${kval(c, 'licht')} licht: krijg ${pv(c, 'kr')} Kracht.`,
    speel: c => { verbrandLicht(kval(c, 'licht')); geefStatus(sp(), 'kracht', kval(c, 'kr')); }
  },
  paddenstoelenstoofpot: {
    naam: 'Paddenstoelenstoofpot', type: 'vaardigheid', zeld: 'ongewoon', kost: 2, icoon: '🥘',
    heel: 5, up: { heel: 7 },
    tekst: c => `De legendarische stoofpot van Maxenzele: genees ${pv(c, 'heel')} HP.`,
    speel: c => { geneesHp(kval(c, 'heel')); }
  },
  asadem: {
    naam: 'Asadem', type: 'aanval', zeld: 'ongewoon', kost: 1, icoon: '🌪️',
    licht: 2, dmg: 5, up: { dmg: 7 },
    tekst: c => `Verbrand ${kval(c, 'licht')} licht. Doe ${pv(c, 'dmg')} schade aan ALLE vijanden.`,
    speel: c => { verbrandLicht(kval(c, 'licht')); return reeksAanvalAlle(kval(c, 'dmg')); }
  },
  eikenhuid: {
    naam: 'Eikenhuid', type: 'vaardigheid', zeld: 'ongewoon', kost: 2, icoon: '🌰',
    blok: 12, up: { blok: 16 },
    tekst: c => `Je huid wordt bast: krijg ${pv(c, 'blok')} Blok.`,
    speel: c => { geefBlok(sp(), kval(c, 'blok')); }
  },
  doornmantel: {
    naam: 'Doornmantel', type: 'kracht', zeld: 'zeldzaam', kost: 1, icoon: '🧥',
    dr: 3, up: { dr: 5 },
    tekst: c => `Krijg ${pv(c, 'dr')} Doornen.`,
    speel: c => { geefStatus(sp(), 'doornen', kval(c, 'dr')); }
  },
  duivelspact: {
    naam: 'Duivelspact', type: 'kracht', zeld: 'zeldzaam', kost: 1, icoon: '🤝',
    kr: 3, up: { kr: 4 },
    tekst: c => `De boom eist zijn prijs: krijg ${pv(c, 'kr')} Kracht én 1 Kwetsbaar.`,
    speel: c => { geefStatus(sp(), 'kracht', kval(c, 'kr')); geefStatus(sp(), 'kwetsbaar', 1); }
  },
  knalsigaar: {
    naam: 'Knalsigaar', type: 'aanval', zeld: 'zeldzaam', kost: 0, doel: 'vijand', icoon: '🚬',
    dmg: 14, kans: 30, up: { dmg: 18, kans: 20 },
    tekst: c => `Doe ${pv(c, 'dmg')} schade. ${kval(c, 'kans')}% kans dat hij in jouw gezicht ontploft: 4 schade.`,
    speel: (c, t) => {
      aanvalOp(t, kval(c, 'dmg'));
      if (Toeval.volgende() < kval(c, 'kans') / 100) {
        verliesHp(sp(), 4);
        melding('💥 De sigaar ontploft in je gezicht!');
      }
    }
  },
  sporenkring: {
    naam: 'Sporenkring', type: 'kracht', zeld: 'zeldzaam', kost: 1, icoon: '💫',
    n: 1, up: { n: 2 },
    tekst: c => `Aan het begin van elke beurt: ALLE vijanden krijgen ${pv(c, 'n')} Zwak.`,
    speel: c => { geefStatus(sp(), 'sporenkring', kval(c, 'n')); }
  },
  wilde_oogst: {
    naam: 'Wilde Oogst', type: 'aanval', zeld: 'episch', kost: 2, icoon: '🌾',
    dmg: 5, up: { dmg: 6 },
    tekst: c => `De oogststorm: doe ${pv(c, 'dmg')} schade aan ALLE vijanden, drie keer.`,
    speel: async c => {
      for (let i = 0; i < 3; i++) {
        await reeksAanvalAlle(kval(c, 'dmg'));
        if (i < 2) await slaap(180);
      }
    }
  },
  hart_van_de_duivelboom: {
    naam: 'Hart van de Duivelboom', type: 'kracht', zeld: 'episch', kost: 2, icoon: '🌳',
    up: { kost: 1 },
    tekst: () => `Aan het begin van elke beurt: +1 Kracht, maar verbrand 1 licht.`,
    speel: () => { geefStatus(sp(), 'duivelhart', 1); }
  },
  flame: {
    naam: 'Flame', type: 'aanval', zeld: 'episch', kost: 3, icoon: '🔥',
    licht: 5, uitputten: true,
    dmg: 18, up: { dmg: 22, licht: 4 },
    tekst: c => `Verbrand ${kval(c, 'licht')} licht. Doe ${pv(c, 'dmg')} schade aan ALLE vijanden en krijg 2 Kracht. Uitputten.`,
    speel: async c => {
      verbrandLicht(kval(c, 'licht'));
      geefStatus(sp(), 'kracht', 2);
      signatuurMoment('flame', 'oranje', 'FLAME.');
      await reeksAanvalAlle(kval(c, 'dmg'));
    }
  },

  /* --- signature-klappers: één episch moment per held (zie ook flame, Thoverk) --- */
  beulswerk: {
    naam: 'Beulswerk', type: 'aanval', zeld: 'episch', kost: 3, doel: 'vijand', icoon: '🪓',
    uitputten: true,
    dmg: 32, zelf: 4, up: { dmg: 38, zelf: 3 },
    tekst: c => `Doe ${pv(c, 'dmg')} schade. Het beulswerk eist ${kval(c, 'zelf')} van je eigen HP. Uitputten.`,
    speel: (c, t) => {
      aanvalOp(t, kval(c, 'dmg'));
      verliesHp(sp(), kval(c, 'zelf'));
      signatuurMoment('beulswerk', 'rood', 'Kniel.');
    }
  },
  moederslang: {
    naam: 'Moederslang', type: 'vaardigheid', zeld: 'episch', kost: 2, icoon: '🐍',
    uitputten: true,
    gif: 6, zw: 1, up: { gif: 8, zw: 2 },
    tekst: c => `Ontbied de Moederslang: ALLE vijanden krijgen ${pv(c, 'gif')} Gif en ${kval(c, 'zw')} Zwak. Uitputten.`,
    speel: c => {
      alleVijanden().forEach(v => { geefGif(v, kval(c, 'gif')); geefStatus(v, 'zwak', kval(c, 'zw')); });
      signatuurMoment('moederslang', 'groen', 'Ssss... zij is wakker.');
    }
  },

  /* --- vloeken --- */
  pijn: {
    naam: 'Pijn', type: 'vloek', zeld: 'vloek', kost: null, icoon: '💀',
    tekst: () => `Onbespeelbaar. Neemt ruimte in je hand in.`,
    speel: () => {}
  },
  /* Act 3 — de vloek van het regime: vijanden fluisteren hem gevecht-lokaal in je
     stapels (verdwijnt na het gevecht), events geven hem permanent. De Act 3-kaarten
     (Brandstapel/Schuldverschuiving/Volkswoede) maken er brandstof van. */
  laster: {
    naam: 'Laster', type: 'vloek', zeld: 'vloek', kost: null, icoon: '🗣️',
    tekst: () => `Onbespeelbaar. Neemt ruimte in je hand in.`,
    flavor: 'Je hebt het niet gedaan. Dat doet er niet toe.',
    speel: () => {}
  },

  /* ============ ACT 3 — HET SLACHTBLOK (de DICKtator-counter-build) ============
     De vloek-synergie zit bewust bij NEUTRAAL: iedereen kan de counter draften.
     putVloekUit() (game.js) stuurt vloeken naar uitgeput — en triggert de
     Kroon der Martelaren. */
  volkswoede: {
    naam: 'Volkswoede', type: 'aanval', zeld: 'gewoon', act: 3, kost: 1, doel: 'vijand', icoon: '✊',
    dmg: 5, per: 3, up: { dmg: 7, per: 4 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade, +${kval(c, 'per')} per vloek in je hand.`,
    flavor: 'Ze noemden het oproer. Het was gewoon iedereen tegelijk.',
    speel: (c, t) => {
      const vloeken = S.gevecht.hand.filter(k => kdef(k).type === 'vloek').length;
      aanvalOp(t, kval(c, 'dmg') + vloeken * kval(c, 'per'));
    }
  },
  brandstapel: {
    naam: 'Brandstapel', type: 'vaardigheid', zeld: 'ongewoon', act: 3, kost: 1, icoon: '🔥',
    dmg: 6, up: { dmg: 8 },
    tekst: c => `Put álle vloeken uit je hand uit. Doe ${kval(c, 'dmg')} schade aan ALLE vijanden per verbrande vloek.`,
    flavor: 'Wat ze je aansmeerden, brandt uitstekend.',
    speel: c => {
      const g = S.gevecht;
      const vloeken = g.hand.filter(k => kdef(k).type === 'vloek');
      vloeken.forEach(k => putVloekUit(k));
      if (vloeken.length) alleVijanden().forEach(v => verliesHp(v, kval(c, 'dmg') * vloeken.length));
      else melding('Geen vloeken in je hand — de brandstapel blijft koud.');
    }
  },
  schuldverschuiving: {
    naam: 'Schuldverschuiving', type: 'vaardigheid', zeld: 'ongewoon', act: 3, kost: 1, doel: 'vijand', icoon: '⚖️',
    n: 2, up: { n: 3 },
    tekst: c => `Put 1 vloek uit je hand uit: het doelwit krijgt ${kval(c, 'n')} Zwak en ${kval(c, 'n')} Kwetsbaar.`,
    flavor: 'Iemand moet hangen. Waarom jij?',
    kan: () => S.gevecht && S.gevecht.hand.some(k => kdef(k).type === 'vloek'),
    reden: () => 'Je hebt geen vloek in je hand om door te schuiven.',
    speel: (c, t) => {
      const vloek = S.gevecht.hand.find(k => kdef(k).type === 'vloek');
      if (!vloek) return;
      putVloekUit(vloek);
      geefStatus(t, 'zwak', kval(c, 'n'));
      geefStatus(t, 'kwetsbaar', kval(c, 'n'));
    }
  },
  ontslagbrief: {
    naam: 'Ontslagbrief', type: 'aanval', zeld: 'ongewoon', act: 3, kost: 1, doel: 'vijand', icoon: '✉️', held: 'slachter',
    dmg: 12, up: { dmg: 16 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade. Sterft het doelwit hieraan, trek dan 2 kaarten.`,
    flavor: '„U bent vrijgesteld." — Nee. Jíj bent vrijgesteld.',
    speel: (c, t) => { aanvalOp(t, kval(c, 'dmg')); if (t.dood || t.hp <= 0) trekKaarten(2); }
  },
  het_hakblok: {
    naam: 'Het Hakblok', type: 'kracht', zeld: 'ongewoon', act: 3, kost: 1, icoon: '🪵', held: 'slachter',
    n: 4, up: { n: 6 },
    tekst: c => `Je éérste aanval elke beurt doet +${kval(c, 'n')} schade.`,
    flavor: 'Hun blok. Jouw snijplank.',
    speel: c => { geefStatus(sp(), 'hakblok', kval(c, 'n')); }
  },
  martelaarsbloed: {
    naam: 'Martelaarsbloed', type: 'aanval', zeld: 'zeldzaam', act: 3, kost: 0, doel: 'vijand', icoon: '🩸', held: 'slachter',
    dmg: 16, prijs: 3, up: { dmg: 20 },
    tekst: c => `Verlies ${kval(c, 'prijs')} HP. Doe ${pv(c, 'dmg')} schade.`,
    flavor: 'Bloed dat je zélf geeft, kan niemand je afnemen.',
    speel: (c, t) => { verliesHp(sp(), kval(c, 'prijs')); aanvalOp(t, kval(c, 'dmg')); }
  },
  tribunaal: {
    naam: 'Tribunaal', type: 'aanval', zeld: 'gewoon', act: 3, kost: 2, icoon: '🔨', held: 'slachter',
    dmg: 7, bonus: 2, up: { dmg: 9, bonus: 2 },
    tekst: c => `Doe ${pv(c, 'dmg')} schade aan ALLE vijanden, +${kval(c, 'bonus')} aan Kwetsbare.`,
    flavor: 'Iedereen tegelijk terecht. Zo doen zij het toch ook?',
    speel: c => {
      alleVijanden().forEach(v => aanvalOp(v, kval(c, 'dmg') + ((v.status.kwetsbaar || 0) > 0 ? kval(c, 'bonus') : 0)));
    }
  },
  lastercampagne: {
    naam: 'Lastercampagne', type: 'vaardigheid', zeld: 'ongewoon', act: 3, kost: 1, icoon: '📰', held: 'gifmagier',
    gif: 3, zw: 1, up: { gif: 4, zw: 2 },
    tekst: c => `Geef ALLE vijanden ${kval(c, 'gif')} Gif en ${kval(c, 'zw')} Zwak.`,
    flavor: 'Een leugen per pamflet. Een pamflet per deur.',
    speel: c => { alleVijanden().forEach(v => { geefGif(v, kval(c, 'gif')); geefStatus(v, 'zwak', kval(c, 'zw')); }); }
  },
  gifpamflet: {
    naam: 'Gifpamflet', type: 'aanval', zeld: 'gewoon', act: 3, kost: 0, doel: 'vijand', icoon: '📃', held: 'gifmagier',
    dmg: 3, gif: 3, up: { gif: 5 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade en geef ${kval(c, 'gif')} Gif. Trek 1 kaart.`,
    flavor: 'Gratis meegenomen. Duur gelezen.',
    speel: (c, t) => { aanvalOp(t, kval(c, 'dmg')); geefGif(t, kval(c, 'gif')); trekKaarten(1); }
  },
  karaktermoord: {
    naam: 'Karaktermoord', type: 'aanval', zeld: 'zeldzaam', act: 3, kost: 1, doel: 'vijand', icoon: '🎭', held: 'gifmagier',
    dmg: 6, max: 8, up: { dmg: 9, max: 12 },
    tekst: c => `Doe ${pv(c, 'dmg')} schade. Verdubbel het Gif op het doelwit (tot +${kval(c, 'max')}).`,
    flavor: 'De man overleeft het. De naam niet.',
    speel: (c, t) => {
      aanvalOp(t, kval(c, 'dmg'));
      if (!t.dood) { const extra = Math.min(t.status.gif || 0, kval(c, 'max')); if (extra > 0) geefGif(t, extra); }
    }
  },
  de_gifbeker: {
    naam: 'De Gifbeker', type: 'aanval', zeld: 'ongewoon', act: 3, kost: 2, doel: 'vijand', icoon: '🏆', held: 'gifmagier',
    dmg: 10, gif: 6, up: { dmg: 13, gif: 8 },
    tekst: c => `Doe ${pv(c, 'dmg')} schade en geef ${kval(c, 'gif')} Gif.`,
    flavor: 'Op uw gezondheid. Op úw gezondheid, drink.',
    speel: (c, t) => { aanvalOp(t, kval(c, 'dmg')); geefGif(t, kval(c, 'gif')); }
  },
  fakkeloptocht: {
    naam: 'Fakkeloptocht', type: 'vaardigheid', zeld: 'ongewoon', act: 3, kost: 1, icoon: '🕯️', held: 'thoverk',
    dmg: 8, licht: 4, up: { dmg: 10 },
    tekst: c => `Verbrand ${kval(c, 'licht')} licht: doe ${kval(c, 'dmg')} schade aan ALLE vijanden.`,
    flavor: 'Eén zachte vlam de straat op. Toen nog één.',
    kan: () => S.fakkel >= 4,
    reden: () => 'Je fakkel is te zwak om uit te delen.',
    speel: c => { zetFakkel(-kval(c, 'licht')); alleVijanden().forEach(v => verliesHp(v, kval(c, 'dmg'))); }
  },
  tegenvuur: {
    naam: 'Tegenvuur', type: 'vaardigheid', zeld: 'gewoon', act: 3, kost: 1, icoon: '🛡️', held: 'thoverk',
    blok: 8, doorn: 2, up: { blok: 11, doorn: 3 },
    tekst: c => `Krijg ${kval(c, 'blok')} Blok en ${kval(c, 'doorn')} Doornen.`,
    flavor: 'Hun vuur vreet. Het onze verwarmt — en prikt.',
    speel: c => { geefBlok(sp(), kval(c, 'blok')); geefStatus(sp(), 'doornen', kval(c, 'doorn')); }
  },
  de_laatste_vonk: {
    naam: 'De Laatste Vonk', type: 'kracht', zeld: 'zeldzaam', act: 3, kost: 2, icoon: '✨', held: 'thoverk',
    n: 5, up: { n: 8 },
    tekst: c => `Aan het einde van elke beurt: +${kval(c, 'n')} licht.`,
    flavor: 'Ze factureerden alles. Behalve dit.',
    speel: c => { geefStatus(sp(), 'laatstevonk', kval(c, 'n')); }
  },
  asregen: {
    naam: 'Asregen', type: 'aanval', zeld: 'ongewoon', act: 3, kost: 1, doel: 'vijand', icoon: '🌋', held: 'thoverk',
    dmg: 10, zw: 1, up: { dmg: 13, zw: 2 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade en geef ${kval(c, 'zw')} Zwak.`,
    flavor: 'Alles wat opgaat in rook, komt neer als as.',
    speel: (c, t) => { aanvalOp(t, kval(c, 'dmg')); geefStatus(t, 'zwak', kval(c, 'zw')); }
  },
  /* --- LICHT-VLOEKEN — een licht-economie die je naar het midden-band knijpt.
     Onspeelbaar; de effecten vuren via de begin/eind-beurt-haken (game.js), niet via speel(). --- */
  schaduwsmet: {
    naam: 'Schaduwsmet', type: 'vloek', zeld: 'vloek', kost: null, icoon: '🌑',
    tekst: () => `Onbespeelbaar. Groeit in het donker en bijt elke beurt buiten helder licht (negeert Blok). Enkel helder licht zuivert haar.`,
    speel: () => {}
  },
  mottenvlam: {
    naam: 'Mottenvlam', type: 'vloek', zeld: 'vloek', kost: null, icoon: '🦟',
    tekst: () => `Onbespeelbaar. Zolang ze in je hand zit én je fakkel helder brandt, lokt je vlam ze: +1 Kwetsbaar per beurt.`,
    speel: () => {}
  },
  doofpot: {
    naam: 'Doofpot', type: 'vloek', zeld: 'vloek', kost: null, icoon: '🫥',
    tekst: () => `Onbespeelbaar. Aan het einde van elke beurt dat ze in je hand zit, smoort ze je vlam: −2 licht.`,
    speel: () => {}
  },

  /* ============ ACT 2 — HET ARCHIEF (namaak / index / doorslag) ============ */
  /* neutraal (voor iedereen) */
  doorslag_kaart: {
    naam: 'Doorslag', type: 'aanval', zeld: 'ongewoon', act: 2, kost: 1, doel: 'vijand', icoon: '📑',
    dmg: 6, up: { dmg: 8 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade. De eerstvolgende aanval die je deze beurt speelt, speel je een tweede keer af.`,
    speel: (c, t) => { aanvalOp(t, kval(c, 'dmg')); geefStatus(sp(), 'doorslag', 1); }
  },
  stempel: {
    naam: 'Stempel', type: 'vaardigheid', zeld: 'gewoon', act: 2, kost: 1, doel: 'vijand', icoon: '🔖',
    kw: 2, zw: 1, up: { kw: 3, zw: 2 }, kopie: { soort: 'zwak', veld: 'zw' },
    tekst: c => `Geef ${kval(c, 'kw')} Kwetsbaar en ${kval(c, 'zw')} Zwak.`,
    speel: (c, t) => { geefStatus(t, 'kwetsbaar', kval(c, 'kw')); geefStatus(t, 'zwak', kval(c, 'zw')); }
  },
  rode_tape: {
    naam: 'Rode Tape', type: 'vaardigheid', zeld: 'ongewoon', act: 2, kost: 1, doel: 'vijand', icoon: '🎀',
    zw: 1, kw: 1, n: 2, up: { zw: 2, kw: 2, n: 3 },
    tekst: c => `Geef ${kval(c, 'zw')} Zwak en ${kval(c, 'kw')} Kwetsbaar. Verwijder ${kval(c, 'n')} Blok van het doelwit.`,
    speel: (c, t) => { geefStatus(t, 'zwak', kval(c, 'zw')); geefStatus(t, 'kwetsbaar', kval(c, 'kw')); t.blok = Math.max(0, (t.blok || 0) - kval(c, 'n')); }
  },
  archiefstof: {
    naam: 'Archiefstof', type: 'vaardigheid', zeld: 'gewoon', act: 2, kost: 1, icoon: '🌫️',
    blok: 6, up: { blok: 9 },
    tekst: c => `Krijg ${kval(c, 'blok')} Blok. Trek 1 kaart.`,
    speel: c => { geefBlok(sp(), kval(c, 'blok')); trekKaarten(1); }
  },
  /* De Slachter */
  afgekeurd: {
    naam: 'Afgekeurd', type: 'aanval', zeld: 'ongewoon', kost: 1, doel: 'vijand', icoon: '❌',
    dmg: 8, bonus: 6, up: { dmg: 11, bonus: 8 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade. Kwetsbare vijanden krijgen ${kval(c, 'bonus')} extra.`,
    speel: (c, t) => { const extra = (t.status.kwetsbaar > 0) ? kval(c, 'bonus') : 0; aanvalOp(t, kval(c, 'dmg') + extra); }
  },
  in_drievoud: {
    naam: 'In Drievoud', type: 'aanval', zeld: 'gewoon', kost: 1, doel: 'vijand', icoon: '🗂️',
    dmg: 4, up: { dmg: 6 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade, drie keer.`,
    speel: (c, t) => reeksAanval(t, kval(c, 'dmg'), 3)
  },
  originele_handtekening: {
    naam: 'Originele Handtekening', type: 'aanval', zeld: 'zeldzaam', kost: 2, doel: 'vijand', icoon: '✍️',
    dmg: 16, kr: 2, up: { dmg: 20, kr: 2 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade. Is dit je eerste aanval deze beurt: krijg ${kval(c, 'kr')} Kracht.`,
    speel: (c, t) => { if (!(S.gevecht.aanvalDezeBeurt > 0)) geefStatus(sp(), 'kracht', kval(c, 'kr')); aanvalOp(t, kval(c, 'dmg')); }
  },
  geindexeerd: {
    naam: 'Geïndexeerd', type: 'kracht', zeld: 'ongewoon', kost: 1, icoon: '🗄️',
    n: 2, up: { n: 3 },
    tekst: c => `Telkens je een aanval speelt, krijg je ${kval(c, 'n')} Blok.`,
    speel: c => { geefStatus(sp(), 'geindexeerd', kval(c, 'n')); }
  },
  /* De Gifmagiër */
  naaperij: {
    naam: 'Naäperij', type: 'aanval', zeld: 'ongewoon', kost: 1, doel: 'vijand', icoon: '🐒',
    dmg: 7, gif: 4, up: { dmg: 9, gif: 6 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade en geef ${kval(c, 'gif')} Gif; was het doelwit al vergiftigd, nogmaals.`,
    speel: (c, t) => { const al = (t.status.gif || 0) > 0; aanvalOp(t, kval(c, 'dmg')); geefGif(t, kval(c, 'gif')); if (al) geefGif(t, kval(c, 'gif')); }
  },
  inktklerk_steek: {
    naam: 'Inktsteek', type: 'aanval', zeld: 'gewoon', kost: 0, doel: 'vijand', icoon: '🖋️',
    dmg: 4, gif: 2, up: { dmg: 5, gif: 4 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade. Geef ${kval(c, 'gif')} Gif.`,
    speel: (c, t) => { aanvalOp(t, kval(c, 'dmg')); geefGif(t, kval(c, 'gif')); }
  },
  registerrot: {
    naam: 'Registerrot', type: 'vaardigheid', zeld: 'zeldzaam', kost: 1, icoon: '🦠',
    gif: 3, up: { gif: 4 },
    tekst: c => `Geef alle vijanden ${kval(c, 'gif')} Gif, plus 1 extra per reeds vergiftigde vijand.`,
    speel: c => { const verg = alleVijanden().filter(v => (v.status.gif || 0) > 0).length; alleVijanden().forEach(v => geefGif(v, kval(c, 'gif') + verg)); }
  },
  /* De Kolendruïde */
  perkamentslag: {
    naam: 'Perkamentslag', type: 'aanval', zeld: 'gewoon', kost: 1, doel: 'vijand', icoon: '📜',
    dmg: 8, dr: 1, up: { dmg: 11, dr: 2 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade. Krijg ${kval(c, 'dr')} Doornen.`,
    speel: (c, t) => { aanvalOp(t, kval(c, 'dmg')); geefStatus(sp(), 'doornen', kval(c, 'dr')); }
  },
  doorslag_doornen: {
    naam: 'Naäpende Wortels', type: 'aanval', zeld: 'ongewoon', kost: 1, doel: 'vijand', icoon: '🪢',
    dmg: 6, bonus: 5, up: { dmg: 8, bonus: 7 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade. Is het doelwit Zwak óf Kwetsbaar: ${kval(c, 'bonus')} extra.`,
    speel: (c, t) => { const extra = ((t.status.zwak > 0) || (t.status.kwetsbaar > 0)) ? kval(c, 'bonus') : 0; aanvalOp(t, kval(c, 'dmg') + extra); }
  },
  kolenstempel: {
    naam: 'Kolenstempel', type: 'vaardigheid', zeld: 'ongewoon', kost: 1, licht: 3, kr: 2, dr: 1, up: { licht: 2 }, icoon: '♨️',
    tekst: c => `Verbrand ${kval(c, 'licht')} licht. Krijg ${kval(c, 'kr')} Kracht en ${kval(c, 'dr')} Doornen.`,
    speel: c => { verbrandLicht(kval(c, 'licht')); geefStatus(sp(), 'kracht', kval(c, 'kr')); geefStatus(sp(), 'doornen', kval(c, 'dr')); }
  },
  het_origineel_kaart: {
    naam: 'Het Origineel', type: 'aanval', zeld: 'zeldzaam', kost: 2, doel: 'vijand', icoon: '🌿',
    dmg: 12, maal: 2, up: { dmg: 16, maal: 2 }, kopie: { soort: 'aanval', veld: 'dmg' },
    tekst: c => `Doe ${pv(c, 'dmg')} schade, plus ${kval(c, 'maal')} per Doornen die je hebt.`,
    speel: (c, t) => { const dr = sp().status.doornen || 0; aanvalOp(t, kval(c, 'dmg') + kval(c, 'maal') * dr); }
  }
};

/* ---------- kaartpools per held (niet vermeld = neutraal, voor iedereen) ---------- */
['slag', 'knal', 'dubbelslag', 'zware_klap', 'klingenstorm', 'ijzeren_golf', 'bloedoffer',
 'uithaal', 'executie', 'molensteen', 'vampiersbeet', 'wervelwind', 'genadeslag',
 'metaalhuid', 'vlammende_hartstocht', 'demonenvorm', 'vlammenkling', 'brandmerk',
 'beulswerk',
 'afgekeurd', 'in_drievoud', 'originele_handtekening', 'geindexeerd'
].forEach(id => KAARTEN[id].held = 'slachter');
['giftige_steek', 'gifwolk', 'gifklieren', 'prik', 'dodelijke_kus', 'snelle_steek',
 'slangenbeet', 'venijnregen', 'giftand', 'nachtschade', 'gifflits', 'sluiproute',
 'verlammend_gif', 'katalyse', 'etterende_wonden', 'bloedzuiger', 'epidemie', 'gifvlam',
 'lichtrot', 'moederslang',
 'naaperij', 'inktklerk_steek', 'registerrot'
].forEach(id => KAARTEN[id].held = 'gifmagier');
['takkenslag', 'vonkenbeet', 'stoofpotje', 'wortelgreep', 'doornzweep', 'bastvel',
 'sporenstoot', 'stoofgeur', 'wurgwortels', 'kolengloed', 'paddenstoelenstoofpot',
 'asadem', 'eikenhuid', 'doornmantel', 'duivelspact', 'knalsigaar', 'sporenkring',
 'wilde_oogst', 'hart_van_de_duivelboom', 'flame',
 'perkamentslag', 'doorslag_doornen', 'kolenstempel', 'het_origineel_kaart'
].forEach(id => KAARTEN[id].held = 'thoverk');

/* Act 2-gating: deze 11 held-eigen Archief-kaarten horen NIET in de Act 1-beloningspool
   (net als de 4 neutrale Act 2-kaarten die al act:2 dragen). De beloningsgate leest k.act
   → (!k.act || k.act <= huidigeAct()). Zonder dit lekten o.a. in_drievoud (12 dmg/1 kost) en
   inktklerk_steek (0-kost 4dmg+2gif) al in Act 1 en domineerden ze de Act 1-kaarten strikt. */
['afgekeurd', 'in_drievoud', 'originele_handtekening', 'geindexeerd',
 'naaperij', 'inktklerk_steek', 'registerrot',
 'perkamentslag', 'doorslag_doornen', 'kolenstempel', 'het_origineel_kaart'
].forEach(id => { KAARTEN[id].act = 2; });

/* ---------- SPEELBARE HELDEN ---------- */
const SPELERS = {
  slachter: {
    naam: 'De Slachter', art: 'speler', icoon: '⚔️', hp: 70,
    kleur: '255, 156, 63',
    relikwie: 'brandend_bloed',
    stijl: 'Kracht en staal: hard slaan, blok stapelen en nog harder terugslaan.',
    dek: ['slag', 'slag', 'slag', 'slag', 'slag',
          'verdediging', 'verdediging', 'verdediging', 'verdediging', 'knal']
  },
  gifmagier: {
    naam: 'De Gifmagiër', art: 'gifmagier', icoon: '☣️', hp: 62,
    kleur: '126, 217, 87',
    relikwie: 'slangenamulet',
    stijl: 'Gif en geduld: vergiftig alles wat beweegt en zie het langzaam wegteren.',
    dek: ['prik', 'prik', 'prik', 'prik',
          'verdediging', 'verdediging', 'verdediging', 'verdediging',
          'dodelijke_kus', 'gifflits']
  },
  thoverk: {
    naam: 'De Kolendruïde', art: 'thoverk', icoon: '🌿', hp: 66,
    kleur: '214, 150, 86',
    relikwie: 'houten_been',
    stijl: 'Wortels en smeulende kolen: voed het vuur met je fakkel, wurg wat overblijft.',
    dek: ['takkenslag', 'takkenslag', 'takkenslag', 'takkenslag',
          'verdediging', 'verdediging', 'verdediging', 'verdediging',
          'vonkenbeet', 'stoofpotje']
  }
};

/* ---------- STATUSINFO (voor tooltips/iconen) ---------- */
const STATUSINFO = {
  kracht:      { naam: 'Kracht',      icoon: '💪', goed: true,  uitleg: 'Aanvallen doen zoveel extra schade.' },
  kwetsbaar:   { naam: 'Kwetsbaar',   icoon: '🎯', goed: false, uitleg: 'Ontvangt 50% meer aanvalsschade.' },
  zwak:        { naam: 'Zwak',        icoon: '🥀', goed: false, uitleg: 'Aanvallen doen 25% minder schade.' },
  gif:         { naam: 'Gif',         icoon: '☠️', goed: false, uitleg: 'Verliest aan het begin van de beurt zoveel HP (negeert Blok). Neemt elke beurt met 1 af.' },
  doornen:     { naam: 'Doornen',     icoon: '🌵', goed: true,  uitleg: 'Aanvallers krijgen zoveel schade terug.' },
  metaalhuid:  { naam: 'Metaalhuid',  icoon: '🦾', goed: true,  uitleg: 'Krijgt aan het einde van elke beurt zoveel Blok.' },
  demonenvorm: { naam: 'Demonenvorm', icoon: '😈', goed: true,  uitleg: 'Krijgt aan het begin van elke beurt zoveel Kracht.' },
  hakblok:     { naam: 'Het Hakblok', icoon: '🪵', goed: true,  uitleg: 'Je éérste aanval elke beurt doet zoveel extra schade.' },
  laatstevonk: { naam: 'De Laatste Vonk', icoon: '✨', goed: true, uitleg: 'Krijgt aan het einde van elke beurt zoveel licht.' },
  sporenkring: { naam: 'Sporenkring', icoon: '🍄', goed: true,  uitleg: 'Geeft aan het begin van elke beurt alle vijanden zoveel Zwak.' },
  duivelhart:  { naam: 'Duivelhart',  icoon: '🌳', goed: true,  uitleg: 'Geeft aan het begin van elke beurt zoveel Kracht, maar verbrandt evenveel licht.' },
  gifklieren:  { naam: 'Gifklieren',  icoon: '🧫', goed: true,  uitleg: 'Geeft aan het begin van elke beurt alle vijanden zoveel Gif.' },
  energiekern: { naam: 'Energiekern', icoon: '🔋', goed: true,  uitleg: 'Geeft elke beurt zoveel extra Energie.' },
  ritueel:     { naam: 'Ritueel',     icoon: '🕯️', goed: true,  uitleg: 'Krijgt aan het begin van elke beurt zoveel Kracht.' },
  etterende:   { naam: 'Etterende Wonden', icoon: '🩹', goed: true, uitleg: 'Aanvallen geven zoveel Gif aan het doelwit.' },
  innerlijkvuur: { naam: 'Innerlijk Vuur', icoon: '🫀', goed: true, uitleg: 'Geeft elke beurt zoveel extra Energie, maar verbrandt 2 licht per stapel.' },
  baken:       { naam: 'Lichtbaken',  icoon: '🏮', goed: true,  uitleg: 'Vult aan het begin van elke beurt 2 licht per stapel bij.' },
  bloedzuiger: { naam: 'Bloedzuiger', icoon: '🦟', goed: true,  uitleg: 'Geneest aan het begin van de beurt zoveel HP per vergiftigde vijand.' },
  epidemie:    { naam: 'Epidemie',    icoon: '☣️', goed: true,  uitleg: 'Sterft een vijand, dan krijgen alle vijanden zoveel Gif.' },
  /* Act 2 — Het Archief */
  doorslag:    { naam: 'Doorslag',    icoon: '📑', goed: true,  uitleg: 'De eerstvolgende aanval die je speelt, speel je een tweede keer af.' },
  geindexeerd: { naam: 'Geïndexeerd', icoon: '🗄️', goed: true,  uitleg: 'Telkens je een aanval speelt, krijg je zoveel Blok.' },
  /* licht-vloek (Schaduwsmet) */
  schaduwsmet: { naam: 'Schaduwsmet', icoon: '🌑', goed: false, uitleg: 'Bijt elke beurt buiten helder licht (negeert Blok). Groeit in het donker; helder licht zuivert er 1 per beurt.' },
  /* censor-status: je hand is verduisterd → je ziet enkel de ruggen, blind spelen */
  verduisterd: { naam: 'Verduisterd', icoon: '🌫️', goed: false, uitleg: 'Je hand is doorgehaald — je ziet enkel de kaartruggen en speelt BLIND. Neemt elke beurt met 1 af.' }
};

/* ---------- VIJANDEN ----------
   kies(v, beurt) geeft een intentie terug:
   { naam, type: aanval|blok|buff|debuff, dmg?, hits?, blok?, doe?(v) }
*/
const VIJANDEN = {
  groene_slijm: {
    naam: 'Groene Slijm', art: '🦠', hp: [12, 16],
    kies: v => willekeurig() < 0.6
      ? { naam: 'Hap', type: 'aanval', dmg: 6 }
      : { naam: 'Lik', type: 'aanval', dmg: 3, doe: () => geefStatus(sp(), 'zwak', 1) }
  },
  blauwe_slijm: {
    naam: 'Blauwe Slijm', art: '💧', hp: [22, 26],
    kies: v => {
      const r = willekeurig();
      if (r < 0.5) return { naam: 'Beuk', type: 'aanval', dmg: 8 };
      if (r < 0.8) return { naam: 'Spuug', type: 'aanval', dmg: 4, doe: () => geefStatus(sp(), 'kwetsbaar', 1) };
      return { naam: 'Verdikken', type: 'blok', blok: 6 };
    }
  },
  grotrat: {
    naam: 'Grotrat', art: '🐀', hp: [10, 14],
    kies: v => willekeurig() < 0.65
      ? { naam: 'Beet', type: 'aanval', dmg: 5 }
      : { naam: 'Krabben', type: 'aanval', dmg: 3, hits: 2 }
  },
  kultist: {
    naam: 'Kultist', art: '🐦‍⬛', hp: [46, 52],
    kies: (v, beurt) => beurt === 0
      ? { naam: 'Ritueel', type: 'buff', doe: () => geefStatus(v, 'ritueel', 3) }
      : { naam: 'Duistere Slag', type: 'aanval', dmg: 6 }
  },
  paddenstoelman: {
    naam: 'Paddenstoelman', art: '🍄', hp: [24, 28], gifImmuun: true,   /* sporen/toxines: immuun voor Gif → gif-deck moet hier directe schade doen */
    kies: v => {
      const r = willekeurig();
      if (r < 0.5) return { naam: 'Sporenbeet', type: 'aanval', dmg: 5, doe: () => geefGif(sp(), 2) };
      if (r < 0.8) return { naam: 'Sporenwolk', type: 'debuff', doe: () => geefGif(sp(), 3) };
      return { naam: 'Verschuilen', type: 'blok', blok: 7 };
    }
  },
  bandiet: {
    naam: 'Bandiet', art: '🥷', hp: [26, 30],
    kies: v => willekeurig() < 0.6
      ? { naam: 'Dolkstoot', type: 'aanval', dmg: 9 }
      : {
          naam: 'Zakkenrollen', type: 'aanval', dmg: 5,
          doe: () => {
            const buit = Math.min(S.goud, 12);
            if (buit > 0) { S.goud -= buit; melding(`De bandiet steelt ${buit} goud!`); }
          }
        }
  },
  steengolem: {
    naam: 'Steengolem', art: '🗿', hp: [38, 44],
    kies: (v, beurt) => beurt % 2 === 0
      ? { naam: 'Verstenen', type: 'blok', blok: 9 }
      : { naam: 'Verpletter', type: 'aanval', dmg: 12 }
  },
  schaduw: {
    naam: 'Schaduw', art: '👻', hp: [26, 30],
    kies: v => {
      const r = willekeurig();
      if (r < 0.45) return { naam: 'Duistere Greep', type: 'aanval', dmg: 7, doe: () => geefStatus(sp(), 'zwak', 1) };
      if (r < 0.8) return { naam: 'Schaduwklauw', type: 'aanval', dmg: 9 };
      return { naam: 'Vervagen', type: 'blok', blok: 8 };
    }
  },
  /* elites */
  grombaard: {
    naam: 'Grombaard', art: '👹', hp: [84, 92], elite: true,
    kies: (v, beurt) => {
      const stap = beurt % 3;
      if (stap === 0) return { naam: 'Brul', type: 'buff', doe: () => geefStatus(v, 'kracht', 2) };
      if (stap === 1) return { naam: 'Beuk', type: 'aanval', dmg: 11 };
      return { naam: 'Dubbelbeuk', type: 'aanval', dmg: 6, hits: 2 };
    }
  },
  steenwachter: {
    naam: 'Steenwachter', art: '🧌', hp: [76, 82], elite: true,
    kies: (v, beurt) => {
      if (beurt === 0) return {
        naam: 'Verharden', type: 'buff',
        doe: () => { geefBlok(v, 10); geefStatus(v, 'doornen', 3); }
      };
      const stap = (beurt - 1) % 3;
      if (stap === 0) return { naam: 'Klap', type: 'aanval', dmg: 9 };
      if (stap === 1) return { naam: 'Dreun', type: 'aanval', dmg: 14 };
      return { naam: 'Herstellen', type: 'blok', blok: 12 };
    }
  },
  /* ===== Act 2 — DE KOPIEERHEL (Copycat-thema: echo, duplicaat, naäap, plagiaat).
     Eigen roster i.p.v. opgeschaalde Act 1-vijanden; emoji-art voorlopig. ===== */
  echo: {
    naam: 'De Echo', art: '👥', hp: [22, 27],
    /* herhaalt elke beurt zijn éérste zet — hij kopieert zichzelf, eindeloos */
    kies: v => {
      if (!v.echoZet) v.echoZet = willekeurig() < 0.5
        ? { naam: 'Echo-slag', type: 'aanval', dmg: 8 }
        : { naam: 'Echo-stoot', type: 'aanval', dmg: 5, hits: 2 };
      return v.echoZet;
    }
  },
  doorslag: {
    naam: 'Doorslag', art: '📄', hp: [30, 36],
    /* maakt onder 50% HP eenmalig een zwakke kopie van zichzelf (carbon copy) */
    kies: v => {
      if (!v.gesplitst && v.hp / v.maxHp <= 0.5) {
        return { naam: 'Doorslaan', type: 'buff', doe: () => {
          v.gesplitst = true; voegVijandToe('doorslag_kopie');
          geefStatus(v, 'kwetsbaar', 2);   /* terwijl hij perst ligt hij er open bij: zichtbaar als Kwetsbaar-status + +50% schade als je 'm nu raakt */
          fxNummer(actorEl(v), '📄 ontzet — kwetsbaar!', 'fx-debuff');
          melding('📄 Doorslag perst een kopie — en ligt er even open bij! (Kwetsbaar)');
        } };
      }
      return willekeurig() < 0.6 ? { naam: 'Papiersnee', type: 'aanval', dmg: 9 }
        : { naam: 'Stapelen', type: 'blok', blok: 7 };
    }
  },
  doorslag_kopie: {   /* alleen gespawnd door Doorslag — niet in ONTMOETINGEN */
    naam: 'Kopie', art: '📃', hp: [8, 11],
    kies: () => ({ naam: 'Flauwe slag', type: 'aanval', dmg: 4 })
  },
  naaper: {
    naam: 'De Naäper', art: '🐒', hp: [24, 28],
    /* kopieert je Kracht én slaat er meteen mee (naäpen = weaponized), anders spot-slaat
       of bootst je verdediging na. Geen pure-buff-beurten meer → hij blijft dreigend. */
    kies: v => {
      const sk = sp().status.kracht || 0;
      if (sk > 0 && willekeurig() < 0.6) return { naam: 'Naäpende Klap', type: 'aanval', dmg: 6, doe: () => { geefStatus(v, 'kracht', Math.min(2, sk)); fxNummer(actorEl(v), '🐒 zoals jij!', 'fx-debuff'); } };
      return willekeurig() < 0.6 ? { naam: 'Spotklap', type: 'aanval', dmg: 8 }
        : { naam: 'Nabootsen', type: 'blok', blok: 7 };
    }
  },
  inktklerk: {
    naam: 'Inktklerk', art: '✒️', hp: [26, 31],
    /* stempelt een kopie van je zwakte op je, of kliedert inkt */
    kies: (v, beurt) => beurt % 2 === 1
      ? { naam: 'Stempel', type: 'aanval', dmg: 5, doe: () => geefStatus(sp(), 'zwak', 1) }
      : { naam: 'Inktklodder', type: 'aanval', dmg: 9 }
  },
  /* elite — De Mal: een matrijs die gietsels blijft baren tot je de mal zelf breekt */
  de_mal: {
    naam: 'De Mal', art: '🖨️', hp: [82, 90], elite: true,
    kies: (v, beurt) => {
      /* niet "Gieten" verspillen als het toneel al vol is (voegVijandToe no-opt bij 4) */
      const vol = (S.gevecht.vijanden || []).filter(x => !x.dood).length >= 4;
      /* MAX 3 gietsels per gevecht — playtest: hij perste er te veel uit */
      if (beurt % 2 === 0 && !vol && (v.gietsels || 0) < 3) return { naam: 'Gieten', type: 'buff', doe: () => {
        v.gietsels = (v.gietsels || 0) + 1;
        /* het PERS-moment mag gevoeld worden (playtest): dreun + gloeiende
           matrijs-flits op De Mal zelf, dan pas kruipt het gietsel eruit */
        if (typeof schudScherm === 'function') schudScherm();
        if (typeof Klank !== 'undefined' && Klank.sfx) Klank.sfx('zwareklap');
        const mel = (typeof actorEl === 'function') ? actorEl(v) : null;
        if (mel) { mel.classList.remove('pers-moment'); void mel.offsetWidth; mel.classList.add('pers-moment'); setTimeout(() => mel.classList.remove('pers-moment'), 1300); }
        if (typeof baasFaseMoment === 'function') baasFaseMoment('DE PERS SLAAT NEER', 'Gloeiend heet kruipt er wéér een kopie uit de matrijs...');
        setTimeout(() => {
          if (!S.gevecht || S.gevecht.voorbij || v.dood) return;
          voegVijandToe('mal_gietsel'); melding(`🖨️ De Mal perst er een gietsel uit! (${v.gietsels}/3)`);
        }, 650);
      } };
      return willekeurig() < 0.6 ? { naam: 'Persen', type: 'aanval', dmg: 13 }
        : { naam: 'Verharden', type: 'blok', blok: 10 };
    }
  },
  mal_gietsel: {   /* alleen gespawnd door De Mal */
    naam: 'Gietsel', art: '🫥', hp: [9, 12],
    kies: () => ({ naam: 'Holle klap', type: 'aanval', dmg: 5 })
  },
  /* episch — Het Origineel: "jij bent maar een kopie van mij" (Copycat-foreshadow).
     Verschijnt op een episch-node in Act 2 en laat bij verlies de drops_episch-scherf
     vallen. Perfectioneert zichzelf en spiegelt je klap terug. */
  het_origineel: {
    naam: 'Het Origineel', art: '🪞', hp: [72, 80], episch: true,
    kies: (v, beurt) => {
      const stap = beurt % 3;
      if (stap === 0) return { naam: 'Perfectioneren', type: 'buff', doe: () => geefStatus(v, 'kracht', 2) };
      if (stap === 1) return { naam: 'Spiegelslag', type: 'aanval', dmg: 11 };
      /* mini-plagiaat (Copycat-foreshadow): kaatst JOUW laatste klap terug */
      const echo = Math.min(16, (S.gevecht && S.gevecht.laatsteSpelerDmg) || 0);
      if (echo >= 6) return { naam: 'Namaak', type: 'aanval', dmg: echo, doe: () => melding('🪞 Het Origineel kaatst je eigen klap terug!') };
      return { naam: 'Origineel Vonnis', type: 'aanval', dmg: 7, hits: 2 };
    }
  },
  /* extra kopieerhel-vijanden (Act 2-promptbib) */
  stempelaar: {
    naam: 'De Stempelaar', art: '🖋️', hp: [25, 30],
    kies: (v, beurt) => beurt === 0
      ? { naam: 'Goedkeuringsstempel', type: 'debuff', doe: () => geefStatus(sp(), 'kwetsbaar', 2) }
      : (willekeurig() < 0.6
          ? { naam: 'Tegendruk', type: 'aanval', dmg: 7, doe: () => geefStatus(sp(), 'kwetsbaar', 1) }
          : { naam: 'Inktstapel', type: 'blok', blok: 8 })
  },
  dossierwurm: {
    naam: 'De Dossierwurm', art: '🐛', hp: [28, 34],
    kies: (v, beurt) => beurt % 2 === 1
      ? { naam: 'Inrollen', type: 'buff', doe: () => { geefStatus(v, 'kracht', 1); geefStatus(v, 'doornen', 2); } }
      : (willekeurig() < 0.55
          ? { naam: 'Papierbeet', type: 'aanval', dmg: 6, hits: 2 }
          : { naam: 'Bladsnede', type: 'aanval', dmg: 10 })
  },
  spiegelwachter: {
    naam: 'De Spiegelwachter', art: '🔮', hp: [24, 29], gifkaats: 0.5,   /* kaatst ook je Gif terug (helft) — niet alleen klappen */
    /* kaatst je eigen klap terug — leest dezelfde laatsteSpelerDmg als Het Origineel */
    kies: (v, beurt) => {
      if (beurt === 0) return { naam: 'Oppoetsen', type: 'blok', blok: 9 };
      const echo = Math.min(10, (S.gevecht && S.gevecht.laatsteSpelerDmg) || 0);
      return echo >= 5 ? { naam: 'Weerkaatsing', type: 'aanval', dmg: echo } : { naam: 'Glasscherf', type: 'aanval', dmg: 7 };
    }
  },
  /* nog meer kopieerhel-types (extra variatie) */
  de_deadline: {
    naam: 'De Deadline', art: '⏳', hp: [26, 32],
    /* de billability-klok: z'n klap escaleert elke beurt (deadline-druk) */
    kies: (v, beurt) => beurt % 4 === 3
      ? { naam: 'Verlengen', type: 'buff', doe: () => geefStatus(v, 'kracht', 1) }
      : { naam: 'Termijn', type: 'aanval', dmg: 6 + Math.min(beurt, 6) * 2 }
  },
  de_inktvlek: {
    naam: 'De Inktvlek', art: '🩸', hp: [20, 25], gifImmuun: true,   /* zelf van gif gemaakt → immuun; je kunt de vergiftiger niet vergiftigen */
    /* gif-bron: inkt die je dossier (en jou) wegvreet */
    kies: v => willekeurig() < 0.55
      ? { naam: 'Inktspat', type: 'aanval', dmg: 5, doe: () => geefGif(sp(), 3) }
      : { naam: 'Uitvloeien', type: 'debuff', doe: () => geefGif(sp(), 4) }
  },
  de_redacteur: {
    naam: 'De Redacteur', art: '✂️', hp: [24, 29],
    /* censureert: streept je Blok weg OF HAALT JE HAND DOOR (verduisterd → blind spelen) */
    kies: v => {
      const r = willekeurig();
      if (r < 0.34) return { naam: 'Doorhaling', type: 'aanval', dmg: 5, doe: () => { geefStatus(sp(), 'verduisterd', 1); melding('✂️ De Redacteur haalt je hand door — een beurt speel je BLIND.'); } };
      if (r < 0.67) return { naam: 'Wegstrepen', type: 'aanval', dmg: 6, doe: () => { sp().blok = Math.max(0, (sp().blok || 0) - 6); } };
      return { naam: 'Censuur', type: 'aanval', dmg: 9 };
    }
  },
  /* elite — De Archivaris: compoundt elke beurt (de bureaucratie die onafwendbaar groeit) */
  de_archivaris: {
    naam: 'De Archivaris', art: '📚', hp: [80, 88], elite: true,
    kies: (v, beurt) => beurt % 2 === 0
      ? { naam: 'Bijwerken', type: 'buff', doe: () => geefStatus(v, 'kracht', 2) }
      : (willekeurig() < 0.6 ? { naam: 'Dossier-dreun', type: 'aanval', dmg: 12 } : { naam: 'Indexeren', type: 'blok', blok: 10 })
  },
  /* baas — vecht in drie bedrijven (fases via checkBaasFase in game.js) */
  slijmkoning: {
    naam: 'De Slijmkoning', art: '🫠', hp: [150, 150], baas: true,
    titel: 'Heerser van de Diepte',
    kies: (v, beurt) => {
      /* fase 3 — Koninklijke Woede: geen verdediging meer, alleen geweld */
      if ((v.fase || 1) >= 3) {
        const stap = beurt % 3;
        if (stap === 0) return { naam: 'Razende Verplettering', type: 'aanval', dmg: 19 };
        if (stap === 1) return { naam: 'Zure Vloedgolf', type: 'aanval', dmg: 6, hits: 3 };
        return {
          naam: 'Kwijlgolf', type: 'debuff',
          doe: () => { geefStatus(sp(), 'zwak', 2); geefStatus(sp(), 'kwetsbaar', 2); }
        };
      }
      const stap = beurt % 4;
      if (stap === 0) return {
        naam: 'Kwijlgolf', type: 'debuff',
        doe: () => { geefStatus(sp(), 'zwak', 2); geefStatus(sp(), 'kwetsbaar', 2); }
      };
      if (stap === 1) return { naam: 'Verpletter', type: 'aanval', dmg: 17 };
      if (stap === 2) return { naam: 'Slijmregen', type: 'aanval', dmg: 5, hits: 3 };
      return { naam: 'Verdikken', type: 'blok', blok: 16, doe: () => geefStatus(v, 'kracht', 2) };
    }
  },
  /* Act 2-baas — THE COPYCAT (de Erfprins, het zoontje van de baas). Hij maakt
     NOOIT iets zelf: hij STEELT je kaarten (uit de gevecht-kopie van je trek/afleg
     — S.dek blijft heilig), kaatst ze opgewaardeerd terug, en GROEIT (v.gevoed)
     naarmate jij optimaler speelt (de DICKtator-foreshadow). Geen eigen arsenaal:
     zonder gestolen kaarten is z'n enige zet pathetisch zwak. De volledige mechaniek
     (state, stelen, plagiaat, voeding, fases, mercy, het offer-breekpunt) leeft in
     game.js — zie copycatKies() en de copycat*-helpers. Drops (METGEZELLEN.drops
     rol:'breker') breekt de machine bij je first-clear: trouw is niet te indexeren. */
  /* ====== ZWARTE ZIEL — corruptie die gif verzwelgt (counter op de Gifmagiër) ======
     zwarteZiel:'verminder' (gewone) = halve gif-tik · 'absorbeer' (elite) = gif HEELT het
     wezen · 'counter' (boss-tier) = kaatst gif terug. De Zielslantaarn-relikwie breekt dit.
     De getallen zijn vertrekwaarden → playtest-tunebaar. */
  pekziel: {
    naam: 'De Pekziel', art: '🕳️', hp: [27, 31], zwarteZiel: 'verminder',
    kies: v => {
      const r = willekeurig();
      if (r < 0.55) return { naam: 'Pekklauw', type: 'aanval', dmg: 9 };
      if (r < 0.8) return { naam: 'Teergreep', type: 'aanval', dmg: 5, doe: () => geefStatus(sp(), 'zwak', 1) };
      return { naam: 'Verharden', type: 'blok', blok: 7 };
    }
  },
  de_uitgewiste: {
    naam: 'De Uitgewiste', art: '⬛', hp: [29, 33], zwarteZiel: 'verminder',
    kies: v => {
      const r = willekeurig();
      if (r < 0.55) return { naam: 'Doorhaling', type: 'aanval', dmg: 9 };
      if (r < 0.8) return { naam: 'Wegwissen', type: 'aanval', dmg: 5, doe: () => geefStatus(sp(), 'zwak', 1) };
      return { naam: 'Verstommen', type: 'blok', blok: 8 };
    }
  },
  de_verzwolgene: {
    naam: 'De Verzwolgene', art: '🌑', hp: [82, 92], elite: true, zwarteZiel: 'absorbeer',
    kies: (v, beurt) => {
      if (beurt % 3 === 2) return { naam: 'Verzwelgen', type: 'blok', blok: 12 };
      return willekeurig() < 0.6
        ? { naam: 'Zielendreun', type: 'aanval', dmg: 14 }
        : { naam: 'Leegteklauw', type: 'aanval', dmg: 9, doe: () => geefStatus(sp(), 'kwetsbaar', 1) };
    }
  },
  de_erfprins: {
    naam: 'De Erfprins', art: '🤴', hp: [180, 180], baas: true, copycat: true, gifkaats: 0.5,   /* HP terug van 210→180: tegen een gehalveerd dek (Roof-rework) is 210 te veel om te grinden; tunebaar */
    titel: 'Erfgenaam zonder verdienste',
    kies: (v, beurt) => copycatKies(v, beurt)
  },
  /* BAAS ACT 3 — de DICKtator: het geparkeerde ontwerp gaat live. Kern = HET
     DECREET (PERMANENTE kaartverwijdering — het bewaarde contrast met de
     Erfprins-roof 'per gevecht') + de vloeken-as (zijn Karaktermoord schaalt op
     de laster die zijn hof over je uitstortte). Brein: dicktatorKies (game.js). */
  de_dicktator: {
    naam: 'de DICKtator', art: '👑', hp: [240, 240], baas: true,   /* playtest: 210 was te makkelijk; hij herrijst nu ook éénmalig (DE HERVERKIEZING) */
    titel: 'Heerser van het Slachtblok',
    kies: (v, beurt) => dicktatorKies(v, beurt)
  },
  /* DE DREMPELWACHTER — Balrog-stijl poortwachter; ontwaakt bij een FOUT scherf-trio op de Drempel
     (zie toonDrempel). Alleen via dat event gespawnd, niet in ONTMOETINGEN. Zwaar maar verslaanbaar. */
  de_drempelwachter: {
    naam: 'De Drempelwachter', art: '🔥', hp: [150, 150], elite: true,
    titel: 'Wachter tussen de werelden',
    kies: (v, beurt) => {
      if (beurt % 3 === 0) return { naam: 'Drempelvuur', type: 'aanval', dmg: 22, doe: () => melding('🔥 „JE KOMT ER NIET LANGS!"') };
      return willekeurig() < 0.55
        ? { naam: 'Vlammenzweep', type: 'aanval', dmg: 15 }
        : { naam: 'Schaduwgreep', type: 'aanval', dmg: 9, doe: () => geefStatus(sp(), 'kwetsbaar', 1) };
    }
  },

  /* ============ ACT 3 — HET SLACHTBLOK (het hof van de DICKtator) ============
     Thema = de MACHT en haar meelopers: buffs voor elkaar, schuld voor jou.
     Vertrekwaarden uit ACT3-PROMPTBIB.md — playtest-tunebaar. */
  de_omroeper: {
    naam: 'De Omroeper', art: '📯', hp: [22, 27],
    /* opent het gevecht met de Afkondiging: het hele hof +1 Kracht */
    kies: (v) => {
      if (!v.afgekondigd) return { naam: 'Afkondiging', type: 'buff', doe: () => {
        v.afgekondigd = true;
        S.gevecht.vijanden.forEach(x => { if (!x.dood) geefStatus(x, 'kracht', 1); });
        melding('📯 „HOORT!" — het regime spreekt: alle vijanden +1 Kracht.');
      } };
      return willekeurig() < 0.6 ? { naam: 'Schreeuw', type: 'aanval', dmg: 8 } : { naam: 'Oproep', type: 'blok', blok: 7 };
    }
  },
  het_klapvee: {
    naam: 'Het Klapvee', art: '👏', hp: [26, 32],
    /* de menigte klapt harder naarmate er meer staan te klappen */
    kies: (v) => {
      const anderen = S.gevecht.vijanden.filter(x => !x.dood && x !== v).length;
      return anderen > 0
        ? { naam: 'Applaus', type: 'aanval', dmg: 4 + 2 * anderen }
        : { naam: 'Aarzelend klapje', type: 'aanval', dmg: 3 };
    }
  },
  de_zondebok: {
    naam: 'De Zondebok', art: '🐐', hp: [18, 24],
    /* dreiging-mechaniek: vangt 50% van je klappen op ANDEREN op (haak in aanvalOp) */
    kies: () => ({ naam: 'Kopstoot', type: 'aanval', dmg: 6 }),
    bijDood: () => {
      /* satire: de schuld is weggedragen — de rest wordt driester */
      S.gevecht.vijanden.forEach(x => { if (!x.dood) geefStatus(x, 'kracht', 1); });
      melding('🐐 De schuld is weggedragen — de rest wordt driester (+1 Kracht).');
    }
  },
  de_aanklager: {
    naam: 'De Aanklager', art: '☝️', hp: [24, 29],
    kies: (v, beurt) => beurt % 3 === 0
      ? { naam: 'Requisitoir', type: 'aanval', dmg: 4, doe: () => { geefStatus(sp(), 'kwetsbaar', 2); geefStatus(sp(), 'zwak', 1); } }
      : { naam: 'Beschuldiging', type: 'aanval', dmg: 5, doe: () => geefStatus(sp(), 'kwetsbaar', 1) }
  },
  de_fluisteraar: {
    naam: 'De Fluisteraar', art: '🌫️', hp: [20, 26],
    /* stopt de vloek 'laster' in je AFLEG — gevecht-lokaal (niet in S.dek), dus
       hij verdwijnt vanzelf na het gevecht; de events geven 'm wél permanent */
    kies: (v, beurt) => beurt % 2 === 1
      ? { naam: 'Laster', type: 'buff', doe: () => {
          S.gevecht.afleg.push(nieuweKaart('laster'));
          Klank.sfx('debuff');
          melding('🌫️ Een gefluisterde leugen kruipt in je aflegstapel...');
        } }
      : { naam: 'Steek in de rug', type: 'aanval', dmg: 9 }
  },
  de_vaandeldrager: {
    naam: 'De Vaandeldrager', art: '🚩', hp: [28, 34],
    /* het vaandel hoog: elke stoot buft de rest — prioridoelwit */
    kies: (v) => ({ naam: 'Vaandelstoot', type: 'aanval', dmg: 8, doe: () => {
      S.gevecht.vijanden.forEach(x => { if (!x.dood && x !== v) geefStatus(x, 'kracht', 1); });
    } })
  },
  de_ophitser: {
    naam: 'De Ophitser', art: '🔥', hp: [23, 28],
    /* nieuw dreigingstype: hij brandt jóuw LICHT weg */
    kies: (v) => willekeurig() < 0.55
      ? { naam: 'Fakkelroof', type: 'aanval', dmg: 4, doe: () => { zetFakkel(-6); melding('🔥 De Ophitser brandt je licht weg! (−6 licht)'); } }
      : { naam: 'Opruiing', type: 'buff', doe: () => {
          geefStatus(v, 'kracht', 1);
          const maat = kiesUit(S.gevecht.vijanden.filter(x => !x.dood && x !== v));
          if (maat) geefStatus(maat, 'kracht', 1);
        } }
  },
  de_gouden_garde: {
    naam: 'De Gouden Garde', art: '🛡️', hp: [34, 40],
    kies: (v, beurt) => {
      if (beurt % 3 === 0) return { naam: 'Formatie', type: 'buff', doe: () => geefStatus(v, 'metaalhuid', 2) };
      return willekeurig() < 0.5
        ? { naam: 'Gouden muur', type: 'blok', blok: 12 }
        : { naam: 'Hellebaardslag', type: 'aanval', dmg: 12 };
    }
  },
  /* elite — De Rechter: het showproces. Stapelt bewijslast en telegrafeert het VONNIS,
     dat schaalt op jóuw Zwak/Kwetsbaar-stapels — hou jezelf schoon of blok op de maat. */
  de_rechter: {
    naam: 'De Rechter', art: '⚖️', hp: [86, 94], elite: true,
    titel: 'De uitspraak stond al vast',
    kies: (v, beurt) => {
      if (beurt % 3 === 0) {
        const st = (S.gevecht.speler.status.zwak || 0) + (S.gevecht.speler.status.kwetsbaar || 0);
        return { naam: 'VONNIS', type: 'aanval', dmg: 8 + 4 * st };
      }
      return { naam: 'Bewijslast', type: 'buff', doe: () => { geefStatus(sp(), 'zwak', 1); geefStatus(sp(), 'kwetsbaar', 1); } };
    }
  },
  /* elite — De Hofnar: hof-goedgekeurde wreedheid. Zingt leugens je TREK in en
     lacht (+Blok, haak in trekKaarten) telkens jij een vloek trekt. */
  de_hofnar: {
    naam: 'De Hofnar', art: '🃏', hp: [78, 86], elite: true,
    titel: 'Lach dan — iederéén lacht',
    kies: (v, beurt) => beurt % 2 === 1
      ? { naam: 'Spotlied', type: 'buff', doe: () => {
          const g = S.gevecht;
          g.trek.splice(Math.floor(willekeurig() * (g.trek.length + 1)), 0, nieuweKaart('laster'));
          geefStatus(v, 'kracht', 1);
          Klank.sfx('debuff');
          melding('🃏 De Hofnar zingt een spotlied — een leugen schuift tussen je kaarten.');
        } }
      : { naam: 'Kwinkslag', type: 'aanval', dmg: 6, hits: 2 }
  },
  /* episch — Het Spreekgestoelte: de levende katheder die decennia toespraken
     absorbeerde — en spreekt met de STEM van de DICKtator (foreshadow). */
  het_spreekgestoelte: {
    naam: 'Het Spreekgestoelte', art: '🎙️', hp: [84, 92], episch: true,
    kies: (v, beurt) => {
      const stap = beurt % 3;
      if (stap === 0) return { naam: 'Slogan', type: 'buff', doe: () => { geefStatus(sp(), 'zwak', 1); geefStatus(v, 'kracht', 2); } };
      if (stap === 1) return { naam: 'Donderrede', type: 'aanval', dmg: 14 };
      return { naam: 'Bijval eisen', type: 'blok', blok: 12, doe: () => {
        S.gevecht.afleg.push(nieuweKaart('laster'));
        melding('🎙️ „APPLAUS." — een leugen kruipt in je aflegstapel.');
      } };
    }
  }
};

/* ---------- METGEZELLEN: bondgenoten met eigen HP en een per-beurt-effect ----------
   Data-gestuurd register (zoals VIJANDEN/RELIKWIEEN), zodat er moeiteloos méér
   soorten metgezellen bij kunnen. Eén metgezel = data + hooks:
     maxHp, zeld, art (assets/metgezellen/<art>.webp), icoon, tekst, lore
     doelbaar : mogen vijanden hem raken?  dreiging = kans dat een klap op hém belandt
                (hij vangt de klap dan voor je op — handig, tot zijn HP op is)
     beurt(m) : wat hij doet aan het begin van ELKE spelersbeurt (m = de gevecht-actor,
                zelfde vorm als een vijand/speler: status{}, blok, hp, maxHp, dood)
     intent(m): optionele UI-hint van wat hij gaat doen
                {type:'aanval', dmg} | {type:'blok', blok} | {type:'heal', n}
   Sterft zijn HP in een gevecht, dan VLUCHT hij (S.metgezel.vluchtig = true) i.p.v.
   te sterven — terug te vinden via een latere queeste/event. */
const METGEZELLEN = {
  drops: {
    naam: 'Drops', art: 'drops', icoon: '🐕', zeld: 'episch', maxHp: 26, rol: 'breker',
    tekst: 'Begin van je beurt: bijt de baas voor 6. Vangt soms een klap op; vlucht als het te zwaar wordt. Zijn offer (De Laatste Sprong) breekt de kopieermachine en geeft je geroofde kaarten terug.',
    lore: 'Geen fakkel kon het wekken — het donker wel. Uit het diepste zwart kroop iets kleins, warms en koppigs, met trouwe ogen. Het had jouw licht nooit nodig. Het bleef.',
    doelbaar: true, dreiging: 0.22,
    beurt(m) {
      /* bijt bij voorkeur de Copycat-baas — pure druk op de overlevingsrace
         (er is bewust GEEN win-back meer; zijn offer geeft je de roof terug). Voedt hem NIET. */
      const d = (typeof copycatBaas === 'function' && copycatBaas(S.gevecht)) || kiesUit(alleVijanden());
      if (d) metgezelAanval(m, d, synergieN('drops', 6));
      if (synergieOptimaal('drops')) geefBlok(sp(), 2);   /* optimaal-perk (Thoverk): trouwe wacht → +2 Blok */
    },
    intent: () => (alleVijanden().length ? { type: 'aanval', dmg: synergieN('drops', 6) } : null),
    /* DE LAATSTE SPRONG — bewuste, PERMANENTE opoffering (climax tegen de Copycat).
       Breekt de kopieermachine, geeft je arsenaal terug, ramt de baas en schildt jou;
       Drops is daarna voorgoed weg. Het opoffering-haakje is generiek: latere verhaal-
       metgezellen kunnen hun eigen offer krijgen door dit blok in te vullen. */
    opoffering: {
      naam: 'De Laatste Sprong',
      tekst: 'Drops springt één laatste keer — recht in de kopieermachine. Trouw is niet te indexeren: hij breekt de machine, geeft je je hele gestolen arsenaal terug, doet 40 schade aan de baas, en jij krijgt 15 Blok.',
      /* beschikbaar zodra de Copycat het gevaarlijkst is — niet vanaf beurt 1: baas
         onder 50% HP, óf in fase 3, óf als Drops zelf kritiek laag staat. */
      beschikbaar: g => {
        if (g.soort !== 'baas') return false;
        const baas = g.vijanden.find(v => VIJANDEN[v.id].baas && !v.dood);
        const mg = g.metgezel;
        return (baas && (baas.hp / baas.maxHp <= 0.5 || (baas.fase || 1) >= 3))
            || (mg && !mg.dood && mg.hp / mg.maxHp <= 0.35);
      },
      doe(m, g) {
        const baas = g.vijanden.find(v => VIJANDEN[v.id].baas && !v.dood) || alleVijanden()[0];
        const eersteKeer = !Codex.copycatGebroken;
        g.copycatGebroken = true;          /* observeren/stelen/plagiaat worden no-op */
        if (baas) {
          /* geef het hele gestolen arsenaal terug (verse, kale kaarten in je trekstapel) */
          (baas.gestolen || []).forEach(s => { const k = nieuweKaart(s.id); k.up = false; g.trek.push(k); });
          baas.gestolen = [];
          baas.copyKracht = 0;             /* de breuk verzwakt hem zichtbaar */
          baasFaseMoment('ONINDEXEERBAAR', 'CLASSIFICEREN… TROUW: GEEN PRECEDENT');
          fxNummer(actorEl(baas), '🎭 machine gebroken!', 'fx-schade');
          doeSchade(baas, 40, m);
        }
        geefBlok(sp(), 15);
        schudScherm();
        Klank.sfx('schitter');
        /* first-clear: de breuk is PERMANENT (de epische beat). Latere runs:
           de Copycat herindexeert na 3 beurten — dan blijft het een slugfest. */
        if (!eersteKeer) g.copycatHerstelBeurt = (g.beurt || 0) + 3;
        Codex.copycatGebroken = true; bewaarCodex();
      }
    }
  },
  /* DROPS DE WITTE — de geascendeerde terugkeer (zie DROPS-DE-WITTE.md). Geen opoffering
     meer (hij ging al door de dood); zijn beet NEGEERT vijand-blok (onkopieerbaar), en hoe
     donkerder je fakkel, hoe feller hij brandt. Niet via scherven ontgrendeld maar via een
     van twee geheime poorten → isOntgrendeld('drops_wit'). Codex toont hem als variant van
     'drops' (transformeert de ✝-gedenkplek naar 🤍), niet als apart roster-slot. */
  drops_wit: {
    naam: 'Drops de Witte', art: 'drops_wit', icoon: '🤍', zeld: 'episch', maxHp: 34, rol: 'breker',
    tekst: 'Geascendeerd. Begin van je beurt: bijt de baas — negeert vijand-blok — en geeft je 3 Blok. Hoe donkerder je fakkel, hoe feller hij brandt (gedoofd = dubbele klap). Zolang hij leeft zie je elke intent, ook blind, en steelt de Copycat trager. Hij sterft niet meer.',
    lore: 'Je liet hem niet doven. Daarom kwam hij terug — niet zwart, maar wit. Trouw kun je niet indexeren, en de dood houdt haar niet.',
    doelbaar: true, dreiging: 0.18,
    beurt(m) {
      const d = (typeof copycatBaas === 'function' && copycatBaas(S.gevecht)) || kiesUit(alleVijanden());
      if (d) {
        const fel = synergieN('drops_wit', (typeof lichtNiveau === 'function' && lichtNiveau() === 'gedoofd') ? 12 : 6);   /* duisternis voedt hem */
        pose2D(m, 'attack', 0.5);
        verliesHp(d, fel, m);                                      /* negeert vijand-blok (onkopieerbaar) */
        if (d.copyKracht) d.copyKracht = Math.max(0, d.copyKracht - 1);   /* vertraagt het kopiëren */
      }
      geefBlok(sp(), synergieN('drops_wit', 3));
      if (synergieOptimaal('drops_wit')) geefBlok(sp(), 2);   /* optimaal-perk (Thoverk): +2 Blok extra */
    },
    intent: () => (alleVijanden().length ? { type: 'aanval', dmg: synergieN('drops_wit', (typeof lichtNiveau === 'function' && lichtNiveau() === 'gedoofd') ? 12 : 6) } : null)
    /* GEEN opoffering — hij is al door de dood. */
  },
  vlamwachter: {
    naam: 'De Vlamwacht', art: 'vlamwachter', icoon: '🛡️', zeld: 'zeldzaam', maxHp: 34,
    tekst: 'Begin van je beurt: geeft je 5 Blok én ramt een vijand met zijn schild voor 5. Een stille schilddrager die de klappen graag zelf opvangt — maar terugslaat als het moet.',
    lore: 'Hij sprak nooit. Hij stond gewoon tussen jou en wat kwam — telkens opnieuw.',
    doelbaar: true, dreiging: 0.32,
    beurt(m) { geefBlok(sp(), synergieN('vlamwachter', 5)); const d = kiesUit(alleVijanden()); if (d) { metgezelAanval(m, d, synergieN('vlamwachter', 5)); if (synergieOptimaal('vlamwachter') && !d.dood) geefStatus(d, 'kwetsbaar', 1); } },   /* optimaal-perk (Slachter): schildstoot → Kwetsbaar */
    intent: () => (alleVijanden().length ? { type: 'aanval', dmg: synergieN('vlamwachter', 5) } : { type: 'blok', blok: synergieN('vlamwachter', 5) })
  },
  mosgeest: {
    naam: 'De Mosgeest', art: 'mosgeest', icoon: '🍃', zeld: 'zeldzaam', maxHp: 22,
    tekst: 'Begin van je beurt: geneest je 4 HP én prikt een vijand met stekende sporen voor 4. Breekbaar maar trouw.',
    lore: 'Waar zij loopt, sluit de aarde je wonden. Vraag niet wat ze er ooit voor terugneemt.',
    doelbaar: true, dreiging: 0.16,
    beurt(m) { geneesHp(synergieN('mosgeest', 4)); const d = kiesUit(alleVijanden()); if (d) { metgezelAanval(m, d, synergieN('mosgeest', 4)); if (synergieOptimaal('mosgeest') && !d.dood) geefGif(d, 2); } },   /* optimaal-perk (Gifmagiër): sporen vergiftigen ook */
    intent: () => (alleVijanden().length ? { type: 'aanval', dmg: synergieN('mosgeest', 4) } : { type: 'heal', n: synergieN('mosgeest', 4) })
  }
};

/* ---------- SYNERGIE: metgezel × held ----------
   Een metgezel is ÁLTIJD nuttig (basis ×1.0), maar past extra goed bij sommige helden →
   sterker per-beurt-effect én meer HP. Tunebaar. Thematisch: Drops (onkopieerbare trouw) ↔
   Thoverk (standvastige natuur); Vlamwacht (schild-muur) ↔ de Slachter (frontlinie); Mosgeest
   (leven/groei) ↔ de Gifmagiër (natuur/gif-cyclus). 'goed' = themaverwant, kleinere bonus. */
const SYNERGIE = {
  drops:       { optimaal: 'thoverk',   goed: ['slachter'], perk: 'geeft je ook 2 Blok bij elke beet' },
  drops_wit:   { optimaal: 'thoverk',   goed: ['slachter'], perk: 'geeft je 2 Blok extra' },
  vlamwachter: { optimaal: 'slachter',  goed: ['thoverk'],  perk: 'zijn schildstoot maakt de vijand ook Kwetsbaar' },
  mosgeest:    { optimaal: 'gifmagier', goed: ['thoverk'],  perk: 'zijn sporen vergiftigen ook (+2 Gif)' },
};
const SYNERGIE_FACTOR = { optimaal: 1.3, goed: 1.15, basis: 1.0 };   /* vertrekwaarden — tunebaar */
window.SYNERGIE = SYNERGIE;
window.SYNERGIE_FACTOR = SYNERGIE_FACTOR;
window.SPELERS = SPELERS;   /* HELDNAAM guardde op window.SPELERS → toonde anders het kale held-id */

/* ---------- MYSTERIES: hoe je een metgezel VRIJSPEELT (cross-run) ----------
   "You were meant to fail": een metgezel wordt niet gegeven maar ontrafeld over
   runs heen. Data-gestuurd TEMPLATE — elke metgezel krijgt een eigen mysterie:
     vereist   : welke scherf-id's nodig zijn (tunebaar; bepaalt de lengte)
     scherven  : per scherf {bron, codexTekst} (de cryptische regel in de Codex)
     eindreveal: de tekst van het ontwaak-moment
   De rite (de onverwachte sleutel) zit in de engine per mysterie (Drops = je
   fakkel DOVEN bij de Erfprins). De voortgang (scherven/rijp/voltooid) leeft op
   de Codex (persistent over runs). Zie ONTWERP.md. */
const MYSTERIES = {
  drops: {
    metgezel: 'drops', baasId: 'de_erfprins',
    vereist: ['drops_baas', 'drops_figuur', 'drops_episch'],
    scherven: {
      drops_baas:   { bron: 'baas',   codexTekst: '„Wat trouw blijft zonder loon, kun je niet kopen — en niet namaken."' },
      drops_figuur: { bron: 'figuur', codexTekst: '„Het kwam pas toen ik mijn licht dúrfde te doven."' },
      drops_episch: { bron: 'episch', codexTekst: '„Doof alles. In het zwart wacht wat altijd al meeliep."' },
    },
    eindreveal: { titel: 'UIT HET GEDOOFDE LICHT', kreet: 'Waar je fakkel stierf, kroop iets warms uit het zwart — en het week niet meer van je zij.' },
  },
  /* HET TWEEDE mysterie — pas actief zodra Drops vrij is (sequentieel, zie actiefMysterie).
     Rite: de Erfprins verslaan met je fakkel nog HELDER (de tegenpool van Drops' doven). */
  vlamwachter: {
    metgezel: 'vlamwachter', baasId: 'de_erfprins', rite: 'fakkel_helder',
    vereist: ['vlamwachter_baas', 'vlamwachter_figuur', 'vlamwachter_episch'],
    scherven: {
      vlamwachter_baas:   { bron: 'baas',   codexTekst: '„Iemand stond altijd tussen jou en de klap. Je keek nooit om."' },
      vlamwachter_figuur: { bron: 'figuur', codexTekst: '„Hij sprak niet, hij doofde niet — hij blééf gewoon staan."' },
      vlamwachter_episch: { bron: 'episch', codexTekst: '„Hou je vlam hoog tot het einde, en wat wáákt zal ontwaken."' },
    },
    eindreveal: { titel: 'DE STILLE SCHILD', kreet: 'Je liet je licht nooit zakken — en uit dat onwankelbare vuur stapte een zwijgende schildwacht, voorgoed aan je zij.' },
  },
  /* HET DERDE mysterie. Rite: de Erfprins verslaan met hoge HP (gedijen i.p.v. bloeden). */
  mosgeest: {
    metgezel: 'mosgeest', baasId: 'de_erfprins', rite: 'baas_hoge_hp',
    vereist: ['mosgeest_baas', 'mosgeest_figuur', 'mosgeest_episch'],
    scherven: {
      mosgeest_baas:   { bron: 'baas',   codexTekst: '„Waar je heel bleef, sloot de aarde zich zacht om je heen."' },
      mosgeest_figuur: { bron: 'figuur', codexTekst: '„Het kleine groene licht volgt wie bloeit, niet wie bloedt."' },
      mosgeest_episch: { bron: 'episch', codexTekst: '„Versla de diepte zónder te breken, en het leven komt naar je toe."' },
    },
    eindreveal: { titel: 'WAT BLOEIT IN HET DONKER', kreet: 'Je bleef heel waar anderen braken — en uit de spleten kroop een zacht groen wezen dat je wonden sloot.' },
  },
};
window.MYSTERIES = MYSTERIES;   /* expliciet op window: de helpers in game.js guarden op window.MYSTERIES */

/* ---------- GIF-REACTIE-HINTS (Zwarte Ziel) ----------
   Korte log-hint die 1× per wezen per gevecht verschijnt zodra het op je
   gif reageert, zodat de speler de mechaniek léést: verminderen (gewone),
   absorberen (elite, HEELT) of counteren (kaatst terug). Verschijnt naast
   de _gif-reactie-pose + de drijvende fx op het wezen.                  */
const GIFHINTS = {
  pekziel:        '🕳️ De Pekziel slokt de helft van je gif op — de pek verzwelgt het.',
  de_uitgewiste:  '⬛ De Uitgewiste haalt je gif half door — alsof het er nooit was.',
  de_verzwolgene: '🌑 De Verzwolgene vérzwelgt je gif en HEELT ervan — niet vergiftigen!',
  spiegelwachter: '🪞 De Spiegelwachter weerkaatst een deel van je gif terug op JOU.',
  de_erfprins:    '🪞 De Erfprins kopieert de helft van je gif terug op JOU.',
  paddenstoelman: '🍄 De Paddenstoelman is gif-immuun — de sporen gedijen júist op je gif.',
  de_inktvlek:    '🩸 De Inktvlek vat geen gif — hier helpt enkel directe schade.'
};

/* ---------- UITSPRAKEN: fluistertekst in gevechten ----------
   Per vijand korte poelen (max ~6 woorden per regel). _duister is
   de gedeelde pool voor gevechten in het donker; _held spreekt
   zelden en droog; _baas is het script van de Slijmkoning.      */
const UITSPRAKEN = {
  groene_slijm:  { start: ['Blub... blub...', 'Glibber... glibber...'], dood: ['Blub...?', '*plets*'] },
  blauwe_slijm:  { start: ['Brrr... koud vlees...', 'Bevries... met ons...'], dood: ['*smelt weg*'] },
  grotrat:       { start: ['Piep! Vers vlees!', 'Jouw fakkel ruikt naar angst...'], dood: ['Piiiiep...!'] },
  kultist:       { start: ['De diepte eist bloed!', 'Kak-kaw! Het ritueel begint!'], dood: ['Het duister... neemt mij...'] },
  bandiet:       { start: ['Je goud óf je leven.', 'Mooie fakkel. Geef hier.'], dood: ['Hou... het wisselgeld...'] },
  steengolem:    { start: ['STEEN. BREEKT. BOT.', '*gerommel van rotsen*'], dood: ['*brokkelt af*'] },
  schaduw:       { start: ['...wij waren hier al...', '...doof het licht...'], dood: ['...eindelijk... rust...'] },
  grombaard:     { start: ['GRRRAAAH! Wie stoort mijn slaap?!', 'Ik kraak je als een twijgje!'], dood: ['Onmogelijk... zo klein...'] },
  steenwachter:  { start: ['HALT. Niemand passeert.', 'De wacht eindigt nooit.'], dood: ['De poort... staat open...'] },
  /* Act 2 — de kopieerhel */
  echo:          { start: ['...echo... echo...', 'Ik herhaal. Ik herhaal.'], dood: ['...stilte... eindelijk...'] },
  doorslag:      { start: ['Eén van mij is nooit genoeg.', 'Maak een kopie. Maak er twee.'], dood: ['...welke was het origineel...?'] },
  naaper:        { start: ['Wat jij kan, kan ik óók!', 'Kijk — precies zoals jij.'], dood: ['Na... ge... aapt...'] },
  inktklerk:     { start: ['In drievoud, graag.', 'Ik stempel je af.'], dood: ['De inkt... vloeit uit...'] },
  de_mal:        { start: ['UIT DE MAL KOMT ALLES.', 'Ik giet de diepte vol.'], dood: ['De vorm... breekt...'] },
  het_origineel: { start: ['Jij bent maar een kopie van mij.', 'Het origineel verslaat de namaak.'], dood: ['Maar ik wás... het echte...'] },
  stempelaar:     { start: ['Even afstempelen, graag.', 'In drievoud. Met merk.'], dood: ['...het zegel... breekt...'] },
  dossierwurm:    { start: ['Geregistreerd. Geklasseerd.', 'Jouw blad ontbreekt nog.'], dood: ['...uit... het... archief...'] },
  spiegelwachter: { start: ['Ik geef enkel terug.', 'Sla mij — sla jezelf.'], dood: ['...het glas... barst...'] },
  de_deadline:    { start: ['De termijn verstreek. Lang geleden.', 'Tik. Tik. Tik.'], dood: ['...eindelijk... uitstel...'] },
  de_inktvlek:    { start: ['Alles wordt vlek.', 'Ik kruip in je dossier.'], dood: ['...opdrogen...'] },
  de_redacteur:   { start: ['Dat keuren we niet goed.', 'Doorgehaald. Volgende.'], dood: ['...geschrapt... ikzelf...'] },
  de_archivaris:  { start: ['Ik vergeet NIETS.', 'Elke regel telt mee.'], dood: ['Mijn... archief... brandt...'] },
  pekziel:        { start: ['Mijn ziel is al zwart.', 'Je gif vindt hier geen plek meer.'], dood: ['...weer... leeg...'] },
  de_uitgewiste:  { start: ['Naam: doorgehaald.', 'Er valt niets meer te vergiftigen.'], dood: ['...al... gewist...'] },
  de_verzwolgene: { start: ['Geef mij je gif. Ik HONGER.', 'De leegte neemt álles.'], dood: ['...nooit... genoeg...'] },
  /* het gietsel en de kopie zwijgen bewust (niets ín om te spreken); de Wachter niet */
  doorslag_kopie: { start: ['...ook ik... ben nooit genoeg...'], dood: ['...welke laag... was ik...?'] },
  de_drempelwachter: { start: ['VERKEERD. ANTWOORD.', 'Wie de drempel met leugens voedt, voedt MIJ.'], dood: ['De drempel... staat... open...'] },
  /* Act 3 — het Slachtblok */
  de_omroeper:       { start: ['HOORT! De heerser spreekt door mij!', 'STILTE voor de afkondiging!'], dood: ['...wie roept er... nu om...'] },
  het_klapvee:       { start: ['*klapt omdat de rest klapt*', '*klapt harder*'], dood: ['...mag ik... stoppen...?'] },
  de_zondebok:       { start: ['Ik heb het niet gedaan. Ik doe het nooit.', 'Sla maar. Dat doet iedereen.'], dood: ['...eindelijk... niet mijn schuld...'] },
  de_aanklager:      { start: ['JIJ daar. Ja, JIJ.', 'De aanklacht schrijft zichzelf.'], dood: ['...bezwaar... toegewezen...'] },
  de_fluisteraar:    { start: ['Ze zeggen dingen over je...', 'Sst. Luister niet. Of juist wel.'], dood: ['...wie fluistert er... over mij...'] },
  de_vaandeldrager:  { start: ['Het gezicht op het doek ziet álles.', 'Het vaandel valt NOOIT.'], dood: ['...het doek... scheurt...'] },
  de_ophitser:       { start: ['Brandt het al? Het moet branden!', 'Jouw vlammetje eerst!'], dood: ['...zo koud... ineens...'] },
  de_gouden_garde:   { start: ['Voor de heerser. Wat de vraag ook was.', 'De muur wijkt niet.'], dood: ['...het goud... was hol...'] },
  de_rechter:        { start: ['De uitspraak stond al vast. De zitting is beleefdheid.', 'Orde. ORDE.'], dood: ['...in beroep... gaan ze... in beroep...'] },
  de_hofnar:         { start: ['Lach dan. Iederéén lacht.', 'Deze grap gaat over JOU.'], dood: ['...die was... goed...'] },
  het_spreekgestoelte: { start: ['WIE MAAKTE JULLIE GROOT? — HIJ.', 'HOOR DE STEM. BUIG VOOR DE STEM.'], dood: ['...de stem... was nooit... van mij...'] },
  _duister: ['...wij zien jou wél...', '...kom dichter, lichtje...', '...jouw vlam is bijna op...', '...het donker heeft tanden...'],
  _held: {
    overkill: ['Daar. Opgeruimd.', 'Wie volgt?', 'De diepte mag hem houden.'],
    gedoofd:  ['Ik zie geen hand voor ogen...', 'Blind. Geweldig.'],
    duister:  ['Mijn fakkel... niet nu.', 'Het wordt te donker. Te stil.']
  },
  _baas: {
    intro: 'WIE WAAGT ZICH IN MIJN TROONZAAL?',
    fase2: '„Mijn kinderen... VERSCHEUR ZE."',
    fase3: '„MIJN TROON. MIJN DIEPTE."',
    dood:  '„De diepte... vergeet... niets..."'
  },
  /* de DICKtator: de ladder's eindvorm — dreigend én net iets belachelijk.
     Zijn woord is een pen: wat hij afschrijft, bestaat niet meer. */
  _dicktator: {
    intro: '„ZO. Het niet-factureerbare element. JIJ."',
    fase2: '„U vecht? U VECHT? Dat stond niet in uw functieomschrijving."',
    fase3: '„IK BEN HET SLACHTBLOK. IK BEN DE LADDER. IK BEN ALLES."',
    herrijzenis: '„Herverkozen. Unaniem. Wie zou er ook ANDERS zijn?"',
    dood:  '„Maar... zonder mij... zijn jullie... niets...?"',
    decreet: ['„AFGESCHREVEN."', '„Voorziening getroffen."', '„Dat had u niet meer nodig."']
  },
  /* De Erfprins = THE COPYCAT: nepo-baby die nooit iets zelf maakte. Eerst pappies
     geld, nu steelt hij jóuw kaarten. Hij verafschuwt Drops — trouw kan hij niet kopiëren. */
  _erfprins: {
    intro:  '„EINDELIJK — IEMAND OM VAN AF TE KIJKEN."',
    woede:  '„Au — je SLÁÁT me?! Onbeschofte parvenu. Goed dan."',
    roof:   '„Laat eens zien wat je hébt... GEEF HIER. Het wordt nú MÍJN werk."',
    fase2:  '„Wéét je wel wie mijn váder is?! Ik hóéf niks zelf te maken."',
    fase3:  '„ALLES wat jij kan, kan ik óók — ik kopieer het gewoon!"',
    dood:   '„Maar... ik kopieerde alles... waarom verlies ík...?"',
    doodGebroken: '„Trouw... dát stond niet in mijn catalogus... dát kon ik niet kopiëren..."',
    /* ORAKEL: over opeenvolgende ontmoetingen verklapt hij cryptisch het geheim
       (geïndexeerd op Codex.erfprinsOntmoetingen). Twee assen: het kopieer-thema
       (1, 4) én de fakkel-doof-rite die Drops wekt (2, 3). */
    orakel: [
      '„Ik hóéf niks zelf te maken — ik kijk gewoon af."',
      '„Eén ding namaken lukt me niet: wat trouw blíjft zonder loon."',
      '„Wacht — waarom klem je dat lichtje zo vast? Bang voor wat in het zwart meeloopt?"',
      '„Hoe beter jij speelt, hoe sterker ík word... maar het zwart dat jij niet dúrft te maken, daar leeft wat ik nooit kan kopiëren."',
    ],
    /* sist hij op het moment dat jij in zijn zaal je fakkel laat DOVEN (de rite) */
    gedoofd: '„Wat... WÁT DOE JE? Het wordt wakker! BEWAKING! BE—"',
    /* grief-haak: ná Drops' offer claimt de Erfprins de overwinning — tot Drops de Witte terugkeert */
    dossier: '„Ik heb je hond geïndexeerd. Dossier gesloten."',
  }
};

/* ---------- ONTMOETINGEN per moeilijkheid ---------- */
/* vier oplopende lagen: ongedierte -> schurken -> zware jongens -> dodelijke combo's */
const ONTMOETINGEN = {
  vroeg: [
    ['groene_slijm'],
    ['groene_slijm', 'grotrat'],
    ['grotrat', 'grotrat'],
    ['blauwe_slijm'],
    ['groene_slijm', 'groene_slijm']
  ],
  midden: [
    ['paddenstoelman'],
    ['bandiet'],
    ['kultist'],
    ['blauwe_slijm', 'groene_slijm'],
    ['grotrat', 'grotrat', 'grotrat']
  ],
  laat: [
    ['steengolem'],
    ['schaduw'],
    ['bandiet', 'grotrat'],
    ['paddenstoelman', 'paddenstoelman'],
    ['kultist', 'groene_slijm'],
    ['pekziel'],
    ['pekziel', 'grotrat']
  ],
  zwaar: [
    ['steengolem', 'schaduw'],
    ['kultist', 'paddenstoelman'],
    ['bandiet', 'bandiet'],
    ['blauwe_slijm', 'blauwe_slijm'],
    ['schaduw', 'schaduw']
  ],
  elite: [['grombaard'], ['steenwachter'], ['de_verzwolgene']],
  baas: [['slijmkoning']],
  /* Act 2 — de kopieerhel: eigen tiers (kiesNodeEcht kiest deze bij huidigeAct()>=2) */
  act2: {
    midden: [['echo'], ['naaper'], ['inktklerk'], ['echo', 'echo'], ['stempelaar'], ['spiegelwachter'], ['de_inktvlek'], ['de_redacteur'], ['de_uitgewiste']],
    laat:   [['doorslag'], ['naaper', 'inktklerk'], ['echo', 'inktklerk'], ['doorslag', 'echo'], ['stempelaar', 'echo'], ['dossierwurm'], ['de_deadline'], ['de_inktvlek', 'echo'], ['de_uitgewiste', 'echo']],
    zwaar:  [['doorslag', 'naaper'], ['echo', 'echo', 'inktklerk'], ['doorslag', 'inktklerk'], ['naaper', 'naaper'], ['dossierwurm', 'spiegelwachter'], ['stempelaar', 'naaper'], ['de_deadline', 'de_redacteur'], ['de_inktvlek', 'de_inktvlek'], ['de_uitgewiste', 'doorslag']],
    elite:  [['de_mal'], ['de_mal', 'echo'], ['de_archivaris'], ['de_archivaris', 'echo'], ['de_verzwolgene'], ['de_verzwolgene', 'echo']]
  },
  /* Act 3 — het Slachtblok: het hof van de DICKtator. De buffers (omroeper/
     vaandeldrager/ophitser) maken elke groep gevaarlijker naarmate je wacht. */
  act3: {
    midden: [['de_omroeper', 'het_klapvee'], ['de_zondebok', 'het_klapvee'], ['de_aanklager'], ['de_fluisteraar'], ['het_klapvee', 'het_klapvee'], ['de_ophitser'], ['de_omroeper', 'de_zondebok']],
    laat:   [['de_vaandeldrager', 'het_klapvee'], ['de_aanklager', 'de_fluisteraar'], ['de_gouden_garde'], ['de_ophitser', 'de_zondebok'], ['de_omroeper', 'de_aanklager'], ['de_fluisteraar', 'het_klapvee'], ['de_gouden_garde', 'de_zondebok']],
    zwaar:  [['de_vaandeldrager', 'de_gouden_garde'], ['de_aanklager', 'de_ophitser', 'het_klapvee'], ['de_gouden_garde', 'de_fluisteraar'], ['de_vaandeldrager', 'de_aanklager'], ['de_omroeper', 'de_gouden_garde'], ['de_ophitser', 'de_ophitser']],
    elite:  [['de_rechter'], ['de_rechter', 'de_zondebok'], ['de_hofnar'], ['de_hofnar', 'het_klapvee']],
    episch: [['het_spreekgestoelte']]
  },
  /* episch-node (Act 2): de mysterie-vijand die de drops_episch-scherf laat vallen */
  episch: [['het_origineel']]
};

/* ---------- BESTIARIUM: het artbook (lore per vijand) ----------
   Vrij te bladeren via 'toonBestiarium', maar een vijand verschijnt PAS nadat je 'm
   écht bent tegengekomen (Codex.gezien). soort = categorie-label; lore = sfeer (1-2
   zinnen, in de 'diepte/fakkel'-canon); notitie = droge veldnotitie. Het citaat komt
   uit UITSPRAKEN[id].start. Act 1 eerst; Act 2 volgt later (zelfde structuur). */
const BESTIARIUM = {
  groene_slijm: { act: 1, soort: 'Ongedierte', lore: 'Het eerste wat de diepte je voorschotelt: een klodder hongerige gloed-gal die zich deelt zodra je niet oplet. Onschuldig ogend, eindeloos in aantal.', notitie: 'Trap er niet in — letterlijk.' },
  blauwe_slijm: { act: 1, soort: 'Ongedierte', lore: 'Een tragere, kille neef van de groene: een druppel bevroren zwaarmoedigheid die de warmte uit je botten wil trekken. Hij rouwt om iets wat hij zelf niet meer weet.', notitie: 'Hij wil dat je blijft. Voor altijd. In het koude.' },
  grotrat: { act: 1, soort: 'Ongedierte', lore: 'Knaagdieren zo groot als honden, vetgemest op alles wat in de diepte achterblijft. Ze ruiken angst — en jouw fakkel ruikt naar nog veel meer.', notitie: 'Waar één rat is, zijn er tien die je nog niet ziet.' },
  kultist: { act: 1, soort: 'Schurk', lore: 'Vogelgesnavelde dwepers die vrijwillig afdaalden om de diepte te "dienen". Wat ze aanbidden weet niemand — zij het minst van al.', notitie: 'Ze denken dat het ritueel hén spaart. Het spaart niemand.' },
  paddenstoelman: { act: 1, soort: 'Schurk', lore: 'Een logge zwam-mens die in het vochtige donker uitbotte. Gif glijdt van hem af; zijn sporen gedijen er juist op.', notitie: 'Vergiftig hem niet — je voedt hem alleen. Sla gewoon.' },
  bandiet: { act: 1, soort: 'Schurk', lore: 'Niet alles hierbeneden is een monster. Sommigen daalden af om te roven en bleven steken — en grijpen nu naar het enige wat nog waarde heeft: jouw licht.', notitie: '"Je goud óf je leven." Hij neemt allebei, en je fakkel toe.' },
  steengolem: { act: 1, soort: 'Zware jongen', lore: 'Een wandelend stuk diepte, opgetrokken uit gruis en oude woede. Traag, maar elke klap voelt als instortend gesteente.', notitie: 'Geduld verslaat hem. Haast verplettert jou.' },
  schaduw: { act: 1, soort: 'Schaduwwezen', lore: 'Geen wezen maar een afwezigheid — wat overblijft waar het licht ooit week. Ze waren hier al lang vóór jou en wachten tot je vlam dooft.', notitie: 'In het donker zijn het er meer. Houd je fakkel bij.' },
  pekziel: { act: 1, soort: 'Schaduwwezen', lore: 'Een put van zwart pek waarin ooit een ziel verdronk. Gif vindt er geen houvast — het wordt simpelweg opgeslokt door iets dat al leeg is.', notitie: 'Je kunt niets vergiftigen dat al niets meer is.' },
  grombaard: { act: 1, soort: 'Elite', lore: 'Een knorrige reus die de bovenste catacomben als zijn slaapkamer beschouwt. Wek hem en hij kraakt je als een twijgje, verontwaardigd dat iets zó kleins hem durft te storen.', notitie: 'Hij haat twee dingen: indringers en wakker worden. Jij bent allebei.' },
  steenwachter: { act: 1, soort: 'Elite', lore: 'Een poortwachter van steen, eeuwen geleden gezet om iets binnen te houden — of buiten. Niemand weet nog wat, en hij vraagt het zich al lang niet meer af.', notitie: 'Hij bewaakt een poort die allang geen kant meer kiest. De wacht eindigt nooit.' },
  de_verzwolgene: { act: 1, soort: 'Elite', lore: 'Een holte in de vorm van een mens, een leegte die nooit vol raakt. Voer hem gif en hij heelt ervan; hij hongert naar álles wat je draagt.', notitie: 'Hoe meer je hem geeft, hoe groter zijn honger. Geef niets.' },
  slijmkoning: { act: 1, soort: 'Baas', lore: 'De eerste troon van de afdaling: een berg samengeklonterd slijm die zichzelf kroonde tot heerser van alles wat naar beneden zakte. Wat hij verzwelgt, vergeet hij nooit.', notitie: '„De diepte vergeet niets." Hij ook niet — en jij staat nu op zijn lijst.' },

  /* ===== Act 2 — HET ARCHIEF / DE KOPIEERHEL (namaak, doorslag, index, plagiaat) ===== */
  echo: { act: 2, soort: 'Kopieerhel', lore: 'Het eerste teken dat het Archief je niet wíl maar wel kópieert: een wezen dat zelf niets bedenkt en enkel je laatste zet napraat, laag over laag, tot je niet meer weet welke laag de echte is.', notitie: 'Hij herhaalt jouw vorige beweging. Verras hem — en hij herhaalt je verrassing.' },
  doorslag: { act: 2, soort: 'Kopieerhel', lore: 'Een levend doorslagvel, zo dun dat je er dwars doorheen kijkt. Sla hem halfdood en hij perst een bleke kopie van zichzelf uit — want één origineel is hierbeneden nooit genoeg.', notitie: 'Terwijl hij perst ligt hij er open bij (Kwetsbaar). Dán toeslaan.' },
  doorslag_kopie: { act: 2, soort: 'Kopieerhel', lore: 'Wat de Doorslag onder druk uit zichzelf perst: een afdruk van een afdruk, zo bleek dat het fakkellicht er dwars doorheen valt. Hij wéét dat hij de mindere versie is — daarom slaat hij nét iets te gretig.', notitie: 'Dun papier scheurt snel. Eén ferme klap en dit blad is uit het dossier.' },
  naaper: { act: 2, soort: 'Kopieerhel', lore: 'Een pezige aap-imp die niets eigens bezit en alles afkijkt. Word jíj sterker, dan grist hij die kracht weg en zwaait ermee alsof hij ze verdiende.', notitie: 'Hoe sterker jij wordt, hoe gevaarlijker hij wordt. Hij steelt je groei.' },
  inktklerk: { act: 2, soort: 'Kopieerhel', lore: 'Een doorweekte klerk die inkt zweet uit elke vouw van zijn gewaad. Hij drukt een natte afdruk van jouw zwakte op je, alsof je een formulier bent dat in drievoud moet.', notitie: 'Zijn inkt verzwakt je klap. Sla door de smet heen.' },
  stempelaar: { act: 2, soort: 'Kopieerhel', lore: 'Waar zijn arm hoort te zitten torent een messing goedkeuringsstempel. Eén dreun en je draagt zijn rode lakzegel: goedgekeurd om geraakt te worden.', notitie: 'Zijn stempel maakt je Kwetsbaar. Breek het ritme van zijn arm.' },
  dossierwurm: { act: 2, soort: 'Kopieerhel', lore: 'Een eindeloze worm van aaneengeregen dossiers, opgerold uit alles wat het Archief ooit over je noteerde. De gescheurde papierranden snijden als messen.', notitie: 'Hoe langer het gevecht duurt, hoe dikker zijn dossier — en zijn doornen.' },
  spiegelwachter: { act: 2, soort: 'Kopieerhel', lore: 'Een wachter van donker spiegelglas die eeuwen onbeweeglijk stond. Elke klap die je hem geeft weerkaatst hij koud terug — je vecht tegen je eigen weerspiegeling.', notitie: 'Hij kaatst je schade terug. Tem je slag, of gebruik iets dat geen spiegel kent: gif.' },
  de_deadline: { act: 2, soort: 'Kopieerhel', lore: 'Een ineengedoken klokwerk-maaier met een zandloper waar zijn hart hoort. Het zand loopt leeg, en met elke beurt dat het gevecht rekt wordt hij genadelozer — ook de diepte heeft een deadline.', notitie: 'Tijd is zíjn wapen. Maak het kort.' },
  de_inktvlek: { act: 2, soort: 'Kopieerhel', lore: 'Een kruipende plas zwart-groene inkt waarin halfopgeloste handtekeningen ronddrijven. Alles wat hij raakt wordt vlek — ook jij, langzaam.', notitie: 'Hij vat geen gif (hij ís al venijn). Enkel directe schade telt.' },
  de_redacteur: { act: 2, soort: 'Kopieerhel', lore: 'Een elegante censor-ridder met een gezicht vol zwarte balken en een reuzenschaar in plaats van handen. Wat hem niet bevalt knipt hij weg — te beginnen met jouw verdediging.', notitie: 'Zijn schaar knipt je Blok door. Reken niet op blokken alleen.' },
  de_uitgewiste: { act: 2, soort: 'Kopieerhel', lore: 'Een klerk wiens naam met één streep werd doorgehaald — en die daarmee half ophield te bestaan. Wat van hem rest, haalt ook jouw gif half door, alsof het er nooit was.', notitie: 'Hij wist de helft van je gif uit. Vertrouw niet op vergif alleen.' },
  de_mal: { act: 2, soort: 'Elite', lore: 'Een kolossale gietpers van zwart ijzer met een gloeiend-oranje matrijs in zijn borst. Hij perst er gezichtsloze blanco gietsels uit, eindeloos, tot je de mal zelf breekt.', notitie: 'Negeer de gietsels niet — maar breek de Mal, anders blijft hij persen.' },
  mal_gietsel: { act: 2, soort: 'Kopieerhel', lore: 'Nog warm uit de matrijs van De Mal: een gezichtsloos gietsel zonder naam, zonder wil, zonder iets van zichzelf — enkel het bevel om te slaan. Het Archief noemt dit trots „verse aanwas".', notitie: 'Het zwijgt, want er is niemand ín. Sla het stuk en het mist zichzelf niet eens.' },
  de_archivaris: { act: 2, soort: 'Elite', lore: 'Een gehulde archivaris-inquisiteur met een geketend grootboek en een mantel van dossiers. Hij vergeet niets, vergeeft niets, en zet elke beurt een nieuwe rode zegel bij — zijn macht stapelt en stapelt.', notitie: 'Hoe langer hij leeft, hoe harder hij slaat. Sla snel toe.' },
  de_drempelwachter: { act: 2, soort: 'Wachter', lore: 'Niet alles wat je met scherven wekt, is je gunstig gezind. Voed je de drempel met een vals trio, dan krijgt hij een gezicht: as, oude vlam, en de rotsvaste overtuiging dat jíj de leugen bent die moet worden tegengehouden.', notitie: 'De prijs van een fout ritueel: drie scherven verbrand — en dan dít nog. Om de derde beurt komt het Drempelvuur; tel mee en blok op de maat.' },
  het_origineel: { act: 2, soort: 'Episch', lore: 'Het ene ware origineel waarvan heel het Archief zijn bleke kopieën aftrekt — en het houdt vol dat JIJ de namaak bent. Het straalt warm goud-karmozijn in een wereld van koud grijs, en kaatst je eigen klap terug als een vergeelde echo.', notitie: 'Het weerkaatst je sterkste klap. Verdeel je schade i.p.v. alles in één slag.' },
  de_erfprins: { act: 2, soort: 'Baas', lore: 'De onverdiende erfgenaam van het Archief: een verwend jong dat zelf nooit iets maakte en nu je halve dek rooft om je ermee af te maken. Zonder iets om na te apen is hij niets — mét jouw werk is hij dodelijk.', notitie: 'Hij steelt je beste kaarten. Een trouwe metgezel breekt zijn machine; trouw valt niet te kopiëren.' },
  /* Act 3 — het Slachtblok */
  de_omroeper: { act: 3, soort: 'Meeloper', lore: 'Zijn rechterarm vergroeide tot een bronzen roeptoeter en zijn eigen stem is hij al jaren kwijt. Wat eruit galmt is de wil van de heerser — hard genoeg om de rest driester te maken.', notitie: 'Zijn Afkondiging buft het hele hof. Snoer hem vroeg de mond.' },
  het_klapvee: { act: 3, soort: 'Meeloper', lore: 'Tientallen handen en identieke glimlachjes, opgestapeld tot één wezen zonder hoofd. Het klapt omdat de rest klapt. Alleen is het zielig; in massa is het dodelijk.', notitie: 'Klapt harder per levende bondgenoot. Dun eerst de kudde uit.' },
  de_zondebok: { act: 3, soort: 'Meeloper', lore: 'Een pikzwarte bok onder andermans schuld, met een wit geschilderd doelwit op de borst en kettingen naar meesters buiten beeld. Hij deed niets — hij draagt alles.', notitie: 'Vangt de helft van je klappen op anderen op. En sterft hij, dan is "de schuld weggedragen": de rest wordt driester.' },
  de_aanklager: { act: 3, soort: 'Hofhouding', lore: 'Zijn hele rechterarm loopt uit in één beschuldigende wijsvinger van gebleekt bot, gloeiend heet aan de punt. De aanklachtrol op de vloer wordt elke zitting langer.', notitie: 'Stapelt Kwetsbaar (en Zwak) op je. Precies wat het VONNIS van de Rechter nodig heeft — hou jezelf schoon.' },
  de_fluisteraar: { act: 3, soort: 'Hofhouding', lore: 'Een lege kap met een vage violette gloed waar een gezicht hoort, en linten rook die halfleesbare lasterpraat vormen. Wat hij fluistert, kruipt in je stapels.', notitie: 'Stopt de vloek Laster in je aflegstapel. Die verdwijnt ná het gevecht — maar zit intussen wél in je hand.' },
  de_vaandeldrager: { act: 3, soort: 'Hofhouding', lore: 'Achter het reusachtige karmozijnen doek met het gouden gezicht van de tyran schuilt een vizier zonder ogen. Hij is niemand — het vaandel is alles, en het maakt de rest sterker.', notitie: 'Elke Vaandelstoot buft zijn bondgenoten. Prioridoelwit nummer één.' },
  de_ophitser: { act: 3, soort: 'Hofhouding', lore: 'Asgrauwe huid vol embers-aders en een bandelier gestolen fakkels. Hij verbrandt wat anderen nodig hebben om warm te blijven — te beginnen met jóuw licht.', notitie: 'Zijn Fakkelroof brandt je fakkel weg (−6 licht). In het donker word je duurder betaald — maar zie je minder.' },
  de_gouden_garde: { act: 3, soort: 'Hofhouding', lore: 'Absurd opgepoetst paradepantser en een gouden masker zonder oogsleuven: loyaliteit heeft geen zicht nodig. De medailles liggen als visschubben over de borst.', notitie: 'Een muur van blok en metaalhuid. Gif of gestage druk breekt hem sneller dan één grote klap.' },
  de_rechter: { act: 3, soort: 'Elite', lore: 'Een rechter-beul in wijnrode toga, de blinddoek omhóóg geschoven op het voorhoofd — hij ziet precies wat hij wil zien. De gouden duim drukt de weegschaal al eeuwen dezelfde kant op.', notitie: 'Elke derde beurt valt het VONNIS: 8 + 4 per Zwak/Kwetsbaar-stapel op jou. Ontsmet jezelf, of blok op de maat.' },
  de_hofnar: { act: 3, soort: 'Elite', lore: 'Belletjes vervangen door grijnzende schedeltjes, één broekspijp vol doorgehaalde namen, en een geschilderde glimlach over een mond die niet lacht. Zijn grappen zijn vloeken — en ze gaan over jou.', notitie: 'Zingt Laster je trekstapel in en lacht (+Blok) telkens jij een vloek trekt. Verbrand zijn leugens snel.' },
  het_spreekgestoelte: { act: 3, soort: 'Episch', lore: 'Een verguld spreekgestoelte dat decennia toespraken opzoog tot het zélf ging spreken — monden vol slogans over het hele gouden front. En de stem... de stem is niet de zijne.', notitie: 'Slogans verzwakken je en sterken hem. Wie goed luistert, herkent de stem van wat boven het Slachtblok wacht.' },
  de_dicktator: { act: 3, soort: 'Baas', lore: 'De vergulde demagoog-koning op de top van de ladder: zelfbenoemde lauwerkrans, zelfgeslagen medailles, opvallend kleine handen in véél te grote gouden handschoenen. Zijn woord is een pen — wat hij afschrijft, bestaat niet meer. Ook jouw kaarten. Ook jouw dromen.', notitie: 'HET DECREET schrijft élke derde beurt een kaart PERMANENT af. Verbrand zijn laster, hou je dek lean, en maak het kort — tijd is zijn wapen.' }
};

/* ---------- RELIKWIEËN ---------- */
/* ---------- RELIKWIEËN ----------
   zeld: start | gewoon | ongewoon | zeldzaam | episch
   lore: één regel sfeer, getoond in het relikwieënboek          */
const RELIKWIEEN = {
  /* --- start (held-eigen) --- */
  brandend_bloed: { naam: 'Brandend Bloed', icoon: '🩸', start: true, zeld: 'start', tekst: 'Genees 6 HP na elk gevecht.',
    lore: 'Het bloed van De Slachter kookt — en wat kookt, sluit zichzelf.' },
  slangenamulet:  { naam: 'Slangenamulet', icoon: '🐍', start: true, zeld: 'start', tekst: 'Begin elk gevecht: geef alle vijanden 1 Gif.',
    lore: 'De slang slaapt nooit. Ze proeft al voordat jij toeslaat.' },

  /* --- gewoon --- */
  anker:          { naam: 'Het Anker', icoon: '⚓', zeld: 'gewoon', tekst: 'Begin elk gevecht met 10 Blok.',
    lore: 'Wie dit ooit droeg, ging nooit meer ten onder. Hij verdronk staand.' },
  klavertje:      { naam: 'Klavertje Vier', icoon: '🍀', zeld: 'gewoon', tekst: 'Trek op je eerste beurt 2 extra kaarten.',
    lore: 'Geplukt op het enige graf waar ooit iets groeide.' },
  bronzen_schub:  { naam: 'Bronzen Schub', icoon: '🐉', zeld: 'gewoon', tekst: 'Begin elk gevecht met 3 Doornen.',
    lore: 'Eén schub maar. Het beest dat ze verloor, mist haar niet.' },
  gelukspoot:     { naam: 'Gelukspoot', icoon: '🐾', zeld: 'gewoon', tekst: 'Ontvang 25% meer goud uit gevechten.',
    lore: 'Het konijn had vier. Het had er drie nodig gehad.' },
  vuurvliegenpot: { naam: 'Vuurvliegenpot', icoon: '✨', zeld: 'gewoon', tekst: 'Bij elke rustplaats: +15 licht.',
    lore: 'Ze sterven nooit, zolang je ze af en toe iets moois laat zien.' },
  zwarte_kaars:   { naam: 'Zwarte Kaars', icoon: '🕯️', zeld: 'gewoon', tekst: 'Verbrand je licht met een kaart, dan krijg je per punt 1 Blok.',
    lore: 'Ze brandt niet vóór je. Ze brandt mét je.' },
  leren_buidel:   { naam: 'Leren Buidel', icoon: '👝', zeld: 'gewoon', tekst: '+10 goud na elk gevecht.',
    lore: 'Hij rammelt al als je hem oppakt. Vraag niet van wie het was.' },
  wetsteen:       { naam: 'Wetsteen', icoon: '🪨', zeld: 'gewoon', tekst: 'Je eerste aanval elk gevecht doet +4 schade.',
    lore: 'De eerste snede beslist het gevecht. De rest is opruimen.' },
  warme_mantel:   { naam: 'Warme Mantel', icoon: '🧥', zeld: 'gewoon', tekst: 'Begin je een gevecht zonder heldere fakkel: krijg 6 Blok.',
    lore: 'Tegen de kou. Tegen het donker. Tegen wat in het donker woont.' },

  /* --- ongewoon --- */
  krachtsteen:    { naam: 'Krachtsteen', icoon: '💎', zeld: 'ongewoon', tekst: 'Begin elk gevecht met 1 Kracht.',
    lore: 'Hij is zwaarder dan hij eruitziet. Dat is precies het punt.' },
  smaragden_ring: { naam: 'Smaragden Ring', icoon: '💍', zeld: 'ongewoon', tekst: 'Wanneer je Gif toedient, dien je 1 extra toe.',
    lore: 'De steen is niet groen. Dat is wat erin gevangen zit.' },
  spaarvarken:    { naam: 'Spaarvarken', icoon: '🐷', zeld: 'ongewoon', tekst: 'Bij oppakken: krijg meteen 100 goud.',
    lore: 'Iemand spaarde een leven lang. De diepte gaf het niet terug.' },
  veldfles:       { naam: 'Veldfles', icoon: '🎒', zeld: 'ongewoon', tekst: '+1 drankjesvak.',
    lore: 'Eén vak meer tussen jou en het einde.' },
  scherpe_dolk:   { naam: 'Scherpe Dolk', icoon: '🗡️', zeld: 'ongewoon', tekst: 'Vijanden beginnen elk gevecht met 1 Kwetsbaar.',
    lore: 'Ze voelen hem al voor je hem trekt.' },
  stalen_vuist:   { naam: 'Stalen Vuist', icoon: '🥊', zeld: 'ongewoon', tekst: 'Je aanvallen doen +1 schade.',
    lore: 'Het ijzer onthoudt elke klap. En het telt mee.' },
  fluisterende_schedel: { naam: 'Fluisterende Schedel', icoon: '💀', zeld: 'ongewoon', tekst: 'Je leest vijand-intenties zelfs in het donker.',
    lore: 'Hij ziet niets meer. Maar hij hoort álles, en hij vertelt het jou.' },
  bloedrobijn:    { naam: 'Bloedrobijn', icoon: '❤️‍🔥', zeld: 'ongewoon', tekst: 'Bij oppakken: +8 Max HP.',
    lore: 'Hij klopt. Zachtjes. In de maat van jouw hart — net iets vóór.' },
  eeuwige_lont:   { naam: 'Eeuwige Lont', icoon: '🧵', zeld: 'ongewoon', tekst: 'Je fakkel zakt nooit onder 10 licht.',
    lore: 'Gevlochten uit het haar van iemand die het duister overleefde.' },
  oorlogsbanier:  { naam: 'Oorlogsbanier', icoon: '🚩', zeld: 'ongewoon', tekst: 'Begin elite- en baasgevechten met 1 Kracht.',
    lore: 'Hoe groter de vijand, hoe rechter hij wappert.' },
  bottenfluit:    { naam: 'Bottenfluit', icoon: '🦴', zeld: 'ongewoon', tekst: 'Vijanden beginnen elk gevecht met 1 Zwak.',
    lore: 'Eén lange noot, en hun knieën herinneren zich oude angst.' },

  /* --- het lichtverhaal: de fakkel als bondgenoot --- */
  kaarsenstomp:   { naam: 'Kaarsenstomp', icoon: '🕯️', zeld: 'gewoon', tekst: 'Na elk gevecht: +3 licht.',
    lore: 'Het laatste restje van duizend avonden. Het weigert op te branden.' },
  vonkenkluis:    { naam: 'Vonkenkluis', icoon: '⚱️', zeld: 'ongewoon', tekst: 'Telkens je licht wint, win je er 1 extra.',
    lore: 'Wat erin valt, klettert er dubbel weer uit.' },
  vuurvreter:     { naam: 'Vuurvreter', icoon: '🌋', zeld: 'zeldzaam', tekst: 'Verbrandt een kaart van jou licht, dan krijgen alle vijanden 2 schade.',
    lore: 'Hij slikt de vlam in — en spuwt de pijn naar wie te dichtbij staat.' },
  fakkeljongleur: { naam: 'Fakkeljongleur', icoon: '🤹', zeld: 'zeldzaam', tekst: 'De eerste kaart per beurt die licht verbrandt, verbrandt niets.',
    lore: 'Drie fakkels in de lucht, en geen één raakt ooit de grond.' },
  mottenkroon:    { naam: 'Mottenkroon', icoon: '🦋', zeld: 'episch', tekst: 'Begin je je beurt terwijl je fakkel helder brandt: trek 1 extra kaart.',
    lore: 'De motten fluisteren wat ze in het licht zagen.' },
  laatste_lucifer: { naam: 'De Laatste Lucifer', icoon: '🎇', zeld: 'episch', tekst: 'Dooft je fakkel, dan vlamt hij één keer per run weer op naar 50 licht.',
    lore: 'Voor het állerdonkerste moment. Strijk hem niet te vroeg af.' },

  /* --- Thoverk, de Kolendruïde --- */
  houten_been:    { naam: 'Het Houten Been', icoon: '🦵', zeld: 'start', tekst: 'Aan het begin van elk gevecht: 4 Blok en 1 Doornen — het been wortelt zich vast.',
    lore: 'Geruild met een pratende duivelboom, in een dimensie die hij liever vergeet. De boom denkt nog steeds dat hij won.' },
  smeulbuidel:    { naam: 'Smeulbuidel', icoon: '👝', zeld: 'gewoon', tekst: 'Kaarten die licht verbranden, verbranden er 1 minder (minimum 1).',
    lore: 'De kolen van zijn staf slapen erin. Ze snurken vonkjes.' },
  kookpot_van_maxenzele: { naam: 'Kookpot van Maxenzele', icoon: '🍯', zeld: 'ongewoon', tekst: 'Na elk gevecht: genees 3 HP.',
    lore: 'De pot die een compleet cafégevecht beëindigde. De deuken zitten er nog in.' },
  mosamulet:      { naam: 'Mosamulet', icoon: '🧿', zeld: 'zeldzaam', tekst: 'Aan het begin van je beurt: 3 Blok.',
    lore: 'Mos haast zich nooit. Mos komt toch wel.' },
  duivelboomtak:  { naam: 'Tak van de Duivelboom', icoon: '🌳', zeld: 'episch', tekst: '+2 Kracht aan het begin van elk gevecht, maar elke kamer kost +1 licht.',
    lore: 'Hij fluistert nog steeds ruilvoorstellen. Niet luisteren. Wel vasthouden.' },

  /* --- zeldzaam --- */
  oorlogstrommel: { naam: 'Oorlogstrommel', icoon: '🥁', zeld: 'zeldzaam', tekst: 'Trek elke beurt 1 extra kaart.',
    lore: 'Wie hem hoort, vecht sneller dan hij denkt.' },
  levenskruik:    { naam: 'Levenskruik', icoon: '🏺', zeld: 'zeldzaam', tekst: 'Rusten geneest 10 extra HP.',
    lore: 'Het water erin is op. Wat er nu in zit, werkt beter.' },
  gloeiende_lantaarn: { naam: 'Gloeiende Lantaarn', icoon: '🏮', zeld: 'zeldzaam', tekst: 'Kamers kosten 1 licht minder.',
    lore: 'Ze heeft de eed gezworen die vuur nooit zweert: ik blijf.' },
  feniksveer:     { naam: 'Feniksveer', icoon: '🪶', zeld: 'zeldzaam', tekst: 'Zou je sterven: blijf op 1 HP. De veer verbrandt.',
    lore: 'Eén keer. Voor één keer is de dood een misverstand.' },
  hartsteen:      { naam: 'Hartsteen', icoon: '🫧', zeld: 'zeldzaam', tekst: 'Genees 1 HP aan het begin van elke beurt.',
    lore: 'Een kiezel uit de rivier waar het leven stroomopwaarts zwemt.' },
  vijzel_en_stamper: { naam: 'Vijzel en Stamper', icoon: '🥣', zeld: 'zeldzaam', tekst: 'Drankjes werken dubbel.',
    lore: 'Het geheim is niet het kruid. Het is hoe hard je maalt.' },
  schaduwkroon:   { naam: 'Schaduwkroon', icoon: '👑', zeld: 'zeldzaam', tekst: 'Is je fakkel duister of gedoofd: +1 Energie elke beurt.',
    lore: 'In het donker gekroond. Het donker verwacht er iets voor terug.' },

  /* --- episch --- */
  energiekristal: { naam: 'Energiekristal', icoon: '🔮', zeld: 'episch', tekst: 'Krijg elke beurt 1 extra Energie.',
    lore: 'Het klopt als een tweede hart dat nooit moe wordt.' },
  kroon_van_sintels: { naam: 'Kroon van Sintels', icoon: '🔥', zeld: 'episch', tekst: 'Brandt je fakkel helder: +1 Energie elke beurt.',
    lore: 'Gesmeed uit het eerste vuur dat ooit in deze diepte brandde.' },
  gebroken_zandloper: { naam: 'Gebroken Zandloper', icoon: '⏳', zeld: 'episch', tekst: 'Ongebruikte Energie neem je mee naar je volgende beurt.',
    lore: 'Het zand valt omhoog. De tijd heeft het opgegeven.' },
  levend_vuur:    { naam: 'Levend Vuur', icoon: '🔆', zeld: 'episch', tekst: 'Je licht- en vuurkaarten kosten 1 Energie minder.',
    lore: 'Het koos jou. Vraag nooit wat er met de vorige drager gebeurde.' },
  /* ---- Act 2 — Het Archief ---- */
  was_zegel:      { naam: 'Het Was-zegel', icoon: '🔴', zeld: 'gewoon', tekst: 'Aan het einde van je eerste beurt verzegel je je verdediging: je behoudt je resterende Blok ook je volgende beurt.',
    lore: 'Niemand weet meer wiens zegel het was. Het sluit toch — alsof het bang is voor wat er anders uit zou kruipen.' },
  stempelkussen:  { naam: 'Het Stempelkussen', icoon: '🟥', zeld: 'gewoon', tekst: 'De eerste aanval die je elke beurt speelt, stempelt 1 Kwetsbaar op het doel.',
    lore: 'Eén klap met het kussen en je staat geregistreerd, gecatalogiseerd, gedoemd. De inkt droogt nooit helemaal.' },
  doorslagpapier: { naam: 'Doorslagpapier', icoon: '📄', zeld: 'gewoon', tekst: 'De eerste kaart die je elk gevecht speelt, glijdt als doorslag bovenop je trekstapel.',
    lore: 'Schrijf één keer, en het verschijnt twee keer. Welke de echte is, staat nergens genoteerd.' },
  dossierklem:    { naam: 'De Dossierklem', icoon: '📎', zeld: 'ongewoon', tekst: 'Aan het begin van je beurt krijg je 3 Metaalhuid — je dossier dijt uit zolang het gevecht duurt.',
    lore: 'Bureaucratie verliest nooit een vel. De klem die jouw dossier bijeenhoudt, houdt ook jou bijeen.' },
  rode_lint:      { naam: 'Het Rode Lint', icoon: '🎀', zeld: 'ongewoon', tekst: 'Bij gevechtsstart bind je de zwakste vijand vast: die krijgt 2 Zwak én 2 Kwetsbaar.',
    lore: 'Rode lint vertraagt alles — behalve jou. Bind het om je vijand en zelfs zijn vuist komt te laat.' },
  inktpot:        { naam: 'De Bodemloze Inktpot', icoon: '🖋️', zeld: 'ongewoon', tekst: 'Aan het begin van je beurt verspreidt de inkt: elke al-vergiftigde vijand krijgt er 1 Gif bij.',
    lore: 'De klerk vulde hem nooit bij. Hij raakt ook nooit leeg. Wat eruit komt, vlekt door tot op het bot.' },
  indexkaart:     { naam: 'De Verloren Index-kaart', icoon: '🗂️', zeld: 'ongewoon', tekst: 'Telkens je een aanval speelt, krijg je 1 Blok (Geïndexeerd).',
    lore: 'Elke klap die je uitdeelt, catalogiseer je meteen in het oneindige register. En een archief, goed bijgehouden, is een muur.' },
  carbon_afdruk:  { naam: 'De Carbon-afdruk', icoon: '🩹', zeld: 'zeldzaam', tekst: 'Telkens je geraakt wordt, sla je een afdruk: de aanvaller krijgt 2 extra Doornen-schade terug en jij krijgt 1 Doornen.',
    lore: 'Druk hard genoeg en de afdruk komt door op het blad eronder. Zo verdedig je je: niet één keer, maar laag na laag na laag.' },
  verlopen_contract: { naam: 'Het Verlopen Contract', icoon: '📜', zeld: 'zeldzaam', tekst: 'Zou je sterven: blijf op 1 HP en verwijder alle Zwak en Kwetsbaar. Eénmalig per run.',
    lore: 'De clausules zijn verlopen, de handtekening vervaagd. Maar de onderwereld eert geen einddatum — totdat jij hem zelf verscheurt.' },
  het_grootboek:  { naam: 'Het Grootboek', icoon: '📕', zeld: 'episch', tekst: 'Bij oppakken: +12 Max HP. Genees 8 HP na elk gevecht.',
    lore: 'Elke naam die de diepte ooit opslokte staat erin, regel na regel, tot in het oneindige. Sla het open en het schrijft jóuw naam bij — niet bij de doden, nog niet.' },
  zielslantaarn:  { naam: 'De Zielslantaarn', icoon: '🏮', zeld: 'episch', tekst: 'Je Gif negeert ALLE gif-afweer (immuniteit, weerstand, absorptie, Zwarte-Ziel-weerkaatsing). Sterft een wezen met zo\'n afweer aan je gif: +2 Kracht.',
    lore: 'Een lantaarn die geen vlam draagt maar zielen. Het zwart dat anderen verzwelgt, schenkt zij aan jou — regel na regel, ziel na ziel.' },

  /* ============ ACT 3 — HET SLACHTBLOK (de vloek-synergie-as = de DICKtator-counter) ============ */
  zondebokvel:    { naam: 'Het Zondebokvel', icoon: '🐐', zeld: 'gewoon', tekst: 'De eerste vloek die je deze run zou ontvangen, wordt geweigerd.',
    lore: 'Een lap zwart geitenvel met een geschilderd wit doelwit. Iemand droeg elke schuld die niet de zijne was. Nu draagt het vel er ééntje voor jou.' },
  galgentouw:     { naam: 'Het Galgentouw', icoon: '🪢', zeld: 'gewoon', tekst: 'Vijanden (geen bazen) onder 10% HP sterven meteen — de executie.',
    lore: 'Doorgesneden vlak vóór het strakke moment. De strop onthoudt hoe het moest — en maakt het af waar jij ophoudt.' },
  propagandaposter: { naam: 'De Overschreven Poster', icoon: '📰', zeld: 'gewoon', tekst: 'De eerste kaart die je elk gevecht speelt, kost 0 energie.',
    lore: 'Over het gouden gezicht heen kalkte iemand één woord. Het eerste woord is altijd gratis — daarna kost spreken.' },
  martelaarskroon: { naam: 'De Martelaarskroon', icoon: '👑', zeld: 'ongewoon', tekst: 'Telkens je een vloek trekt: +4 Blok.',
    lore: 'Doorniig ijzer met vonkjes warm licht tussen de weerhaken. Wie de laster draagt zonder te knielen, draagt een kroon.' },
  brandmerkijzer: { naam: 'Het Brandmerkijzer', icoon: '🔥', zeld: 'ongewoon', tekst: 'Je aanvallen op Kwetsbare doelwitten doen +3 schade.',
    lore: 'Het zegel gloeit nog van hún hand. Nu drukt het jouw merk — precies waar het pantser al openligt.' },
  kop_van_jut:    { naam: 'De Kop van Jut', icoon: '🔨', zeld: 'ongewoon', tekst: 'Bij gevechtsstart krijgt het sterkste doelwit 2 Kwetsbaar en 1 Zwak.',
    lore: 'Op de kermis van het regime sloeg iedereen op dezelfde vergulde kop. Iedereen krijgt één slag. Deze is de jouwe.' },
  oorkonde_van_verzet: { naam: 'De Oorkonde van Verzet', icoon: '📜', zeld: 'ongewoon', tekst: 'Na elke elite-overwinning: +1 Max HP en +10 goud.',
    lore: 'Tientallen onbeholpen handtekeningen, verzegeld met fakkel-as. Elke gevallen schrik van het regime zet er stilletjes eentje bij.' },
  de_gouden_handdruk: { naam: 'De Gouden Handdruk', icoon: '🤝', zeld: 'zeldzaam', tekst: 'Bij oppakken: +120 goud, −8 Max HP.',
    lore: 'Twee gevouwen handschoenen van massief goud, afgehakt aan beide polsen. Genereus en verminkend — zoals elke afkoopsom.' },
  het_volkslied:  { naam: 'Het Volkslied', icoon: '🎺', zeld: 'zeldzaam', tekst: 'Begin je je beurt met 2 of meer vloeken in je hand: +1 energie.',
    lore: 'Een gedeukte hoorn, door duizend handen gegaan. Het lied dat ze verboden klinkt het luidst waar de laster het dikst ligt.' },
  kroon_der_martelaren: { naam: 'De Kroon der Martelaren', icoon: '✨', zeld: 'episch', tekst: 'Telkens een vloek wordt uitgeput: 4 schade aan ALLE vijanden.',
    lore: 'Een zwevende krans van klein warm vuur — elke vlam een naam die het regime wou schrappen. Verbrand hun laster, en de namen slaan terug.' }
};

/* ---------- DRANKJES ---------- */
const DRANKEN = {
  heeldrank:    { naam: 'Heeldrank', icoon: '🧪', kleur: '#e0526b', tekst: 'Genees 12 HP.', drink: () => geneesHp(12),
    lore: 'Smaakt naar kersen. Vraag niet welke kleur de kersen hadden.' },
  vuurfles:     { naam: 'Vuurfles', icoon: '🧨', kleur: '#ff9046', doel: 'vijand', tekst: 'Doe 20 schade aan een vijand.', drink: t => doeSchade(t, 20, null),
    lore: 'De kurk rookt al. De brouwer heeft geen wenkbrauwen meer.' },
  krachtelixer: { naam: 'Krachtelixer', icoon: '⚗️', kleur: '#ffd24a', tekst: 'Krijg 2 Kracht.', drink: () => geefStatus(sp(), 'kracht', 2),
    lore: 'Eén slok en je hoort je voorouders juichen.' },
  ijzerdrank:   { naam: 'IJzerdrank', icoon: '🫙', kleur: '#9fb8c8', tekst: 'Krijg 12 Blok.', drink: () => geefBlok(sp(), 12),
    lore: 'Langzaam drinken. Je tanden tellen vanaf nu mee als pantser.' },
  gifflacon:    { naam: 'Gifflacon', icoon: '🍶', kleur: '#7ed957', doel: 'vijand', tekst: 'Geef een vijand 6 Gif.', drink: t => geefGif(t, 6),
    lore: 'De Gifmagiër noemt dit "limonade". Niemand lacht.' },
  energiedrank: { naam: 'Energiedrank', icoon: '🥤', kleur: '#5ad0e8', tekst: 'Krijg 2 Energie.', drink: () => { S.gevecht.energie += 2; },
    lore: 'Verboden in drie koninkrijken. Warm aanbevolen door het vierde.' },
  maxenzeelse_stoofpot: { naam: 'Maxenzeelse Stoofpot', icoon: '🍲', kleur: '#e0a64a', tekst: 'Genees 10 HP en verwijder Zwak en Kwetsbaar.',
    drink: () => { geneesHp(10); sp().status.zwak = 0; sp().status.kwetsbaar = 0; },
    lore: 'Eén hap en het cafégevecht in je hoofd valt stil.' },
  magische_sigaar: { naam: 'Magische Sigaar', icoon: '🚬', kleur: '#ff7a46', doel: 'vijand', tekst: 'Doe 16 schade aan een vijand. 25% kans dat hij in jouw gezicht ontploft: 4 schade.',
    drink: t => {
      doeSchade(t, 16, null);
      if (Toeval.volgende() < 0.25) { verliesHp(sp(), 4); melding('💥 In je gezicht!'); }
    },
    lore: 'Thoverk zweert dat deze partij wél stabiel is. Zijn ooglapje zwijgt.' },
  duivelshars: { naam: 'Duivelshars', icoon: '🫙', kleur: '#b8864a', tekst: 'Krijg 10 Blok en 2 Doornen.',
    drink: () => { geefBlok(sp(), 10); geefStatus(sp(), 'doornen', 2); },
    lore: 'Plakt aan je ribben. En aan alles wat je raakt.' }
};

/* ---------- EVENTS ---------- */
const EVENTS = [
  {
    id: 'altaar', titel: 'Het Vreemde Altaar', icoon: '🗿',
    tekst: 'In een nis staat een altaar van zwart steen. Gestold bloed vult de groeven. Een fluisterstem belooft macht — tegen een prijs.',
    opties: [
      {
        label: 'Offer je bloed', hint: 'De stem belooft macht. De prijs: bloed.',
        kan: () => S.hp > 9,
        reden: () => 'Je hebt te weinig levenspunten om te offeren.',
        doe: () => {
          S.hp -= 6;
          const r = willekeurigRelikwie();
          /* pool leeg (je bezit al elk niet-start relikwie)? willekeurigRelikwie()
             geeft dan null → niet dereferentiëren. Compenseer met goud, zoals de
             schat- en mottenzwerm-events ook doen. */
          if (!r) {
            S.goud += 60;
            return 'Het altaar gloeit op... maar je draagt al elke schat die het kent. Het stort 60 goud uit in ruil voor je bloed.';
          }
          geefRelikwie(r);
          if (willekeurig() < 0.25) {
            verliesHpBuitenGevecht(3);
            return `Het altaar gloeit op... en eist méér dan beloofd (−9 HP totaal). Maar je ontvangt ${RELIKWIEEN[r].naam}!`;
          }
          return `Het altaar gloeit op. Je ontvangt ${RELIKWIEEN[r].naam}! (−6 HP)`;
        }
      },
      { label: 'Loop weg', detail: 'Niets gebeurt.', doe: () => 'Je laat het altaar achter je. De fluisterstem sterft weg.' }
    ]
  },
  /* Fase 5 — mysterieuze-figuur-events: alleen in Act 2, alleen zolang het ACTIEVE
     mysterie nog een figuur-scherf mist. De afscheidsregel = de codexTekst van dat
     actieve mysterie → de hint verschilt per metgezel zonder te verklappen wélke. */
  {
    id: 'lantaarndrager', titel: 'De Gedoofde Lantaarndrager', icoon: '🏮',
    toon: () => huidigeAct() >= 2 && typeof scherfTeVinden === 'function' && scherfTeVinden('figuur'),
    tekst: 'Een gebogen figuur zit in het donker, een gedóófde lantaarn in de hand. „Iedereen hierbeneden jaagt op iets," fluistert hij. „Maar weet jij wel wát jou volgt? Luister..."',
    opties: [
      {
        label: 'Luister naar zijn raadsel', detail: 'Een scherf van een groter geheim.',
        doe: () => { const sid = vindScherf('figuur'); if (!sid) return 'De figuur is al verstomd.'; const d = scherfDef(sid); toonScherfReveal(sid, { kop: '🜂 EEN RAADSEL WORDT EEN SCHERF' }); return (d ? d.codexTekst : '') + ' Zijn woorden branden zich in je geheugen — je draagt nu een scherf. 🜂'; }
      },
      { label: 'Loop door', detail: 'Het donker heeft genoeg geheimen.', doe: () => 'Je laat de figuur in zijn duister achter.' }
    ]
  },
  {
    id: 'spiegelaar', titel: 'De Naamloze Spiegelaar', icoon: '🪞',
    toon: () => huidigeAct() >= 2 && typeof scherfTeVinden === 'function' && scherfTeVinden('figuur'),
    tekst: 'Een gestalte houdt je een blinde spiegel voor. „Alles hierbeneden is na te maken," zegt ze. „Op één ding na — en dát is precies wat jou zoekt. Kijk goed."',
    opties: [
      {
        label: 'Tuur in de blinde spiegel', detail: 'Een scherf van een groter geheim.',
        doe: () => { const sid = vindScherf('figuur'); if (!sid) return 'De spiegel is weer blind.'; const d = scherfDef(sid); toonScherfReveal(sid, { kop: '🜂 DE SPIEGEL TOONT EEN SCHERF' }); return 'Heel even toont de spiegel iets in het zwart. ' + (d ? d.codexTekst : '') + ' 🜂'; }
      },
      { label: 'Zeg niets', detail: 'Je vertrouwt het niet.', doe: () => 'Je zwijgt. De spiegelaar vervaagt in het donker.' }
    ]
  },
  {
    id: 'smid', titel: 'De Oude Smid', icoon: '⚒️', liggend: true,
    /* liggend:true → dit event speelt LIGGEND (het smeden zelf ook), anders dekte
       de portret-draaiprompt het smid-scherm + artwork af in landscape. */
    tekst: 'Een verweerde smid heeft zijn aambeeld in een grot opgezet. "Ik smeed of ik sloop," gromt hij. "Kies maar."',
    opties: [
      {
        label: 'Smeed', detail: 'Verbeter gratis een kaart.',
        kan: () => S.dek.some(c => !c.up && KAARTEN[c.id].up),
        reden: () => 'Al je kaarten zijn al gesmeed.',
        doe: () => { kiesKaartUitDek('upgrade', 'Kies een kaart om te smeden'); return null; }
      },
      {
        label: 'Sloop (50 goud)', detail: 'Verwijder een kaart uit je dek.',
        kan: () => S.goud >= 50 && S.dek.length > 5,
        reden: () => S.goud < 50 ? 'Je hebt niet genoeg goud.' : 'Je dek is al op het minimum (5 kaarten).',
        doe: () => {
          /* pas betalen nadat er echt een kaart gekozen is */
          kiesKaartUitDek('verwijder', 'Kies een kaart om te slopen', c => {
            if (c) { S.goud -= 50; eventKlaar('De smid slaat je kaart aan gruzelementen. Netjes betaald.'); }
            else eventKlaar('Je bedenkt je.');
          });
          return null;
        }
      },
      { label: 'Loop door', detail: 'Niets gebeurt.', doe: () => 'De smid haalt zijn schouders op en hamert verder.' }
    ]
  },
  {
    id: 'vonkaltaar', titel: 'Het Vonkaltaar', icoon: '🪔',
    /* GEEN liggend: het altaar is een staand event → de kaartkeuze speelt in portret
       (meer verticale ruimte om de art groot te zien en de kaarten te kiezen). */
    tekst: 'Op een laag altaar brandt een vlam die geen hout verteert — koud-blauw aan de randen, hongerig in haar hart. „Leg iets van jezelf erin," sist de hitte, „en ik brand er mijn aard in. Wélke aard? Dat beslist de vlam — niet jij."',
    opties: [
      {
        label: 'Leg een kaart in de vlam', hint: 'De vlam is grillig — niemand weet of ze schenkt of vreet.',
        kan: () => S.dek.some(c => !c.vonk && KAARTEN[c.id] && KAARTEN[c.id].kost !== null),
        reden: () => 'Geen kaart vat nog vlam (alles gebrandmerkt of onspeelbaar).',
        doe: () => { vonkAltaarKies(false); return null; }
      },
      {
        label: 'Voed eerst de vlam (−25 licht)', detail: 'Offer 25 fakkellicht; de vlam wordt milder gestemd — vaker Heldering, zelden een dud.',
        kan: () => S.fakkel >= 25 && S.dek.some(c => !c.vonk && KAARTEN[c.id] && KAARTEN[c.id].kost !== null),
        reden: () => S.fakkel < 25 ? 'Je fakkel heeft te weinig licht (min. 25).' : 'Geen kaart vat nog vlam.',
        doe: () => { vonkAltaarKies(true); return null; }
      },
      {
        label: 'Voer een vloek aan de vlam', hint: 'Het duister van een vloek is gretige brandstof — de vlam verslindt haar en slaat het om in licht.',
        kan: () => S.dek.some(c => KAARTEN[c.id] && KAARTEN[c.id].type === 'vloek'),
        reden: () => 'Je draagt geen vloek om te offeren.',
        doe: () => { vonkAltaarVloek(); return null; }
      },
      { label: 'Loop door', detail: 'Je laat de vlam met rust.', doe: () => 'Je laat de vlam likken aan de leegte. Sommige gokken sla je beter over.' }
    ]
  },
  {
    id: 'offeraltaar', titel: 'Het Offeraltaar', icoon: '🗿',
    /* GEEN liggend: staand event → de kaartkeuze speelt in portret (zie vonkaltaar). */
    tekst: 'Een muil van koud zwart steen gaapt in de rotswand, geduldig en oeroud. „Geef," fluistert ze van diep onderin, „en ik geef terug — maar wát ik teruggeef, dat kies ík."',
    opties: [
      {
        label: 'Versmelt twee kaarten', detail: 'Offer 2 kaarten → 1 willekeurige, één zeldzaamheid hoger. Een vloek erbij voedt extra (+1 tier).',
        kan: () => S.dek.length >= 2,
        reden: () => 'Je dek is te dun om te versmelten.',
        doe: () => { offeraltaarVersmelt(); return null; }
      },
      {
        label: 'Bloedoffer (−8 HP)', detail: 'Offer 1 kaart + 8 HP → twee zeldzaamheden hoger.',
        kan: () => S.hp > 8 && S.dek.length > 1,
        reden: () => S.hp <= 8 ? 'Je bent te zwak voor een bloedoffer.' : 'Je dek is te dun.',
        doe: () => { offeraltaarBloed(); return null; }
      },
      { label: 'Loop weg', detail: 'Je laat de steen hongerig achter.', doe: () => 'Je keert de hongerige muil de rug toe. Ze onthoudt gezichten.' }
    ]
  },
  {
    id: 'kist', titel: 'De Verdachte Kist', icoon: '🧰',
    tekst: 'Midden in de gang staat een kist. Zomaar. Niemand laat zomaar een kist achter in een kerker vol monsters... toch?',
    opties: [
      {
        label: 'Open de kist', hint: 'Wie laat er nu zomaar een kist achter...?',
        doe: () => {
          if (willekeurig() < 0.5) { S.goud += 45; return 'De kist zit vol goud! Je vindt 45 goud.'; }
          verliesHpBuitenGevecht(10); S.goud += 25;
          return 'Een gifpijl schiet uit het slot! Je verliest 10 HP, maar vindt nog 25 goud.';
        }
      },
      { label: 'Laat dicht', detail: 'Niets gebeurt.', doe: () => 'Je stapt er met een grote boog omheen. Veilig is veilig.' }
    ]
  },
  {
    id: 'fontein', titel: 'De Bloedfontein', icoon: '⛲',
    tekst: 'Een fontein van donkerrood vocht borrelt zachtjes. Het ruikt naar ijzer en... aardbeien?',
    opties: [
      {
        label: 'Drink ervan', hint: 'Het ruikt zoet. En gevaarlijk.',
        doe: () => {
          const r = willekeurig();
          if (r < 0.6) { geneesHpBuitenGevecht(15); return 'Warm en zoet. Je wonden sluiten zich — je geneest 15 HP.'; }
          if (r < 0.85) { S.maxHp += 4; S.hp += 4; return 'Er stroomt iets ouds door je aderen. +4 Max HP!'; }
          verliesHpBuitenGevecht(6);
          return 'Het brandt als vloeibaar vuur! Je verliest 6 HP.';
        }
      },
      {
        label: 'Baad erin', hint: 'Volledig onderdompelen. Durf je?',
        doe: () => {
          const r = willekeurig();
          if (r < 0.55) { S.maxHp += 5; S.hp += 5; return 'Je rijst herboren uit het rood. +5 Max HP!'; }
          if (r < 0.85) { geneesHpBuitenGevecht(12); return 'Het bloed sluit je wonden — je geneest 12 HP.'; }
          S.goud += 20;
          return 'Op de bodem glinstert iets: 20 goud van een vorige durfal. Hij had minder geluk.';
        }
      },
      { label: 'Negeer de fontein', detail: 'Niets gebeurt.', doe: () => 'Wie drinkt er nu uit een bloedfontein? Jij niet.' }
    ]
  },
  {
    id: 'koopman', titel: 'De Zwervende Koopman', icoon: '🧳',
    tekst: 'Een uitgemergelde gestalte schuifelt nader, half vergroeid met dossiers en rood lint — op zijn borst een verbleekt B.A.A.S.-naamplaatje, de naam weggekrast. Hij opent zijn jas; tientallen flesjes glinsteren tussen het papier. „...nog altijd in dienst," fluistert hij.',
    opties: [
      {
        label: 'Koop een drankje (20 goud)', detail: 'Een willekeurig drankje.',
        kan: () => S.goud >= 20 && S.dranken.length < drankSlots(),
        reden: () => S.goud < 20
          ? 'Je hebt niet genoeg goud.'
          : 'Je drankjesvakken zitten vol — gebruik er eerst een.',
        doe: () => { S.goud -= 20; const d = kiesUit(Object.keys(DRANKEN)); S.dranken.push(d); return `Je koopt een ${DRANKEN[d].naam}.`; }
      },
      { label: 'Bedank vriendelijk', detail: 'Niets gebeurt.', doe: () => 'De koopman verdwijnt in de schaduwen. Letterlijk.' }
    ]
  },
  {
    id: 'vuurvliegjes', titel: 'De Vuurvliegjes', icoon: '✨',
    tekst: 'Een zwerm vuurvliegjes danst door de gang — duizenden warme lichtjes die wervelen alsof ze je ergens heen willen leiden.',
    opties: [
      {
        label: 'Vang ze in je fakkel', detail: '+30 licht.',
        kan: () => S.fakkel < 100,
        reden: () => 'Je fakkel is al vol.',
        doe: () => { zetFakkel(30); return 'Je fakkel zoemt en laait goudgroen op. +30 licht!'; }
      },
      {
        label: 'Volg de zwerm', detail: '50% kans op een relikwie, anders 25 goud.',
        doe: () => {
          if (willekeurig() < 0.5) {
            const r = willekeurigRelikwie();
            if (r) { geefRelikwie(r); return `De zwerm leidt je naar een verborgen nis: ${RELIKWIEEN[r].naam}!`; }
          }
          S.goud += 25;
          return 'De zwerm verdwijnt in een spleet. Op de grond glinstert 25 goud.';
        }
      },
      { label: 'Laat ze dansen', detail: 'Niets gebeurt.', doe: () => 'Je kijkt nog even, en klimt dan verder. Mooi was het wel.' }
    ]
  },
  {
    id: 'avonturier', titel: 'De Gevallen Avonturier', icoon: '🪦',
    tekst: 'Tegen de muur ligt een avonturier die het niet heeft gered. Zijn buidel puilt uit. Zijn ogen lijken je te volgen.',
    opties: [
      {
        label: 'Doorzoek het lijk', detail: 'Krijg 60 goud, maar ook een vloek.',
        doe: () => { S.goud += 60; const v = geefVloek(); return v ? `Je vindt 60 goud... maar een kille rilling trekt door je botten. Je dek bevat nu "${v}".` : 'Je vindt 60 goud... en het Zondebokvel vangt de kille rilling op.'; }
      },
      { label: 'Laat hem rusten', detail: 'Niets gebeurt.', doe: () => 'Je vouwt zijn handen over zijn borst en loopt verder.' }
    ]
  },

  /* ===== Act 2 — Het Archief (alleen Act 2+) ===== */
  {
    id: 'onafgewerkte_dossier', titel: 'Het Onafgewerkte Dossier', icoon: '📂',
    toon: () => huidigeAct() === 2,   /* Archief-flavor: Act 3 heeft zijn eigen vier */
    tekst: 'Op een stenen lessenaar ligt een half-ingevuld dossier — jóuw naam staat er bovenaan, in een vreemde hand. De onderste helft is nog leeg.',
    opties: [
      {
        label: 'Teken het af', detail: 'Krijg 45 goud. Maar wie tekent, tekent een stuk van zichzelf weg (−6 Max HP).',
        kan: () => S.maxHp > 20,
        reden: () => 'Er is te weinig van je over om nog weg te tekenen.',
        doe: () => {
          /* playtest: meer goud, maar het verlies moet voelbaar zijn — MAX HP,
             niet zomaar HP (zelfde patroon als de ascensie-aderlating) */
          S.goud += 45;
          S.maxHp = Math.max(1, S.maxHp - 6);
          if (S.hp > S.maxHp) S.hp = S.maxHp;
          return 'Je zet je krabbel. 45 goud glijdt over de tafel — en de clausule onderaan neemt een stuk van je mee. Voorgoed. (−6 Max HP)';
        }
      },
      {
        label: 'Wis je naam uit', detail: 'Verlies 7 HP, maar je fakkel laait op (+20 licht).',
        kan: () => S.hp > 8,
        reden: () => 'Je bent te zwak om jezelf uit te wissen.',
        doe: () => { verliesHpBuitenGevecht(7); zetFakkel(20); return 'Je krast je eigen naam weg tot het bloedt. Maar ongeregistreerd brandt je fakkel feller. (+20 licht)'; }
      },
      { label: 'Laat het liggen', detail: 'Niets gebeurt.', doe: () => 'Je laat het dossier onafgewerkt. Ergens klinkt een zucht.' }
    ]
  },
  {
    id: 'kopieermachine', titel: 'De Kopieermachine', icoon: '🖨️',
    toon: () => huidigeAct() === 2,   /* Archief-flavor */
    tekst: 'Een rammelend monster van tandwielen en inktrollen staat te draaien in een nis. Stop er iets in, en het perst er een doorslag van uit.',
    opties: [
      {
        label: 'Dupliceer een kaart', detail: 'Voeg een kopie van een willekeurige kaart uit je dek toe.',
        kan: () => S.dek.length < 30,
        reden: () => 'Je dek is al overvol.',
        doe: () => { const c = kiesUit(S.dek); if (c) { const nk = nieuweKaart(c.id); S.dek.push(nk); toonKaartReveal(nk.id, { kop: '📠 EEN DOORSLAG ROLT ERUIT', klank: 'klik' }); return `De machine ratelt en spuwt een doorslag van "${KAARTEN[c.id].naam}" uit. Je dek groeit.`; } return 'De machine ratelt, maar er komt niets uit.'; }
      },
      {
        label: 'Dupliceer je goud', detail: 'Riskant: meestal +40%, soms −25%.',
        kan: () => S.goud >= 20,
        reden: () => 'Te weinig goud om te riskeren.',
        doe: () => { if (willekeurig() < 0.7) { const w = Math.floor(S.goud * 0.4); S.goud += w; return `De machine kopieert je beurs: +${w} goud!`; } const v = Math.floor(S.goud * 0.25); S.goud -= v; return `De machine eet je munten op i.p.v. ze te kopiëren: −${v} goud.`; }
      },
      { label: 'Laat het rammelen', detail: 'Niets gebeurt.', doe: () => 'Je laat de machine zichzelf herhalen, eindeloos.' }
    ]
  },
  {
    id: 'naamloze_klerk', titel: 'De Naamloze Klerk', icoon: '🖋️',
    toon: () => huidigeAct() === 2,   /* Archief-flavor */
    tekst: 'Achter een stenen loket zit een klerk zonder gezicht — waar een gelaat hoort, alleen glad perkament. Hij heft een stempel en wacht.',
    opties: [
      {
        label: 'Laat je stempelen', detail: 'Genees 14 HP en smeed een kaart.',
        doe: () => { geneesHpBuitenGevecht(14); if (S.dek.some(c => !c.up && KAARTEN[c.id].up)) { kiesKaartUitDek('upgrade', 'De klerk stempelt je dossier — kies een kaart om te smeden'); return null; } return 'De klerk drukt zijn zegel op je voorhoofd. Je voelt je geheeld (+14 HP).'; }
      },
      {
        label: 'Vraag om je dossier', detail: 'Misschien een relikwie — of een berisping.',
        doe: () => { if (willekeurig() < 0.55) { const r = willekeurigRelikwie(); if (r) { geefRelikwie(r); return `De klerk schuift je dossier door het loket. Erin: ${RELIKWIEEN[r].naam}!`; } S.goud += 50; return 'Je dossier is leeg op 50 goud aan onkostenvergoeding na.'; } verliesHpBuitenGevecht(5); const v = geefLichtVloek(); return v ? `De klerk stempelt AFGEKEURD op je verzoek. −5 HP en een clausule "${v}" erbij.` : 'De klerk stempelt AFGEKEURD op je verzoek. −5 HP — maar het Zondebokvel slikt de clausule in.'; }
      },
      { label: 'Loop weg', detail: 'Niets gebeurt.', doe: () => 'Je laat de gezichtloze klerk wachten. Hij zal je naam onthouden.' }
    ]
  },
  {
    id: 'verloren_origineel', titel: 'Het Verloren Origineel', icoon: '📜',
    toon: () => huidigeAct() === 2,   /* Archief-flavor */
    tekst: 'Tussen oneindige bleke doorslagen gloeit één enkel vel warm en goudkleurig — een origineel, levend, dat aan één hoek oplicht alsof het ademt.',
    opties: [
      {
        label: 'Neem het origineel', detail: 'Een relikwie — of, als het al van iemand was, een snee.',
        doe: () => { if (willekeurig() < 0.55) { const r = willekeurigRelikwie(); if (r) { geefRelikwie(r); return `Je grijpt het echte vel. Het verzegelt zich tot ${RELIKWIEEN[r].naam}!`; } } if (willekeurig() < 0.7) { S.maxHp += 4; S.hp += 4; return 'Het origineel lost op in je handen en schrijft je sterker. (+4 Max HP)'; } verliesHpBuitenGevecht(8); return 'Het vel was al van iemand anders. De rand snijdt diep. (−8 HP)'; }
      },
      {
        label: 'Brand het in je fakkel', detail: 'Je fakkel laait op (+30 licht).',
        kan: () => S.fakkel < 100,
        reden: () => 'Je fakkel is al vol.',
        doe: () => { zetFakkel(30); return 'Je houdt het warme vel bij je fakkel. Het enige onfactureerbare licht voedt het andere. (+30 licht)'; }
      },
      { label: 'Laat het waar het hoort', detail: 'Niets gebeurt.', doe: () => 'Je laat het origineel gloeien tussen zijn kopieën.' }
    ]
  },

  /* ============ ACT 3 — HET SLACHTBLOK (verraad koop je met je naam: laster) ============ */
  {
    id: 'het_schavot', titel: 'Het Schavot', icoon: '🪓',
    toon: () => huidigeAct() >= 3,
    tekst: 'Op een leeg nachtplein staat het schavot. De bijl leunt ONBEHEERD tegen het blok; de veroordeelde knielt er nog, kettingen slap. Eén zachte lantaarn binnen handbereik.',
    opties: [
      {
        label: 'Bevrijd de veroordeelde', detail: 'Verlies 8 HP. Hij vergeet het niet.',
        kan: () => S.hp > 10,
        reden: () => 'Je bent te zwak om de kettingen te breken.',
        doe: () => {
          verliesHpBuitenGevecht(8);
          if (willekeurig() < 0.6) { const r = willekeurigRelikwie(); if (r) { geefRelikwie(r); return `De kettingen snijden je open, maar hij drukt je iets in de handen: ${RELIKWIEEN[r].naam}. Dan is hij weg, het donker in.`; } }
          S.goud += 40;
          return 'De kettingen snijden je open. Hij heeft niets om te geven behalve wat hij ooit verstopte: 40 goud — en een blik die je nooit vergeet.';
        }
      },
      {
        label: 'Neem de bijl', detail: 'Eén willekeurige kaart wordt VOORGOED verwijderd. +60 goud.',
        kan: () => S.dek.length > 5,
        reden: () => 'Je dek is te dun om nog iets af te schrijven.',
        doe: () => {
          const kandidaten = S.dek.filter(c => KAARTEN[c.id].type !== 'vloek');
          const c = kiesUit(kandidaten.length ? kandidaten : S.dek);
          S.dek = S.dek.filter(x => x !== c);
          S.goud += 60;
          return `Je tilt de bijl. Hij valt zwaarder dan verwacht: „${KAARTEN[c.id].naam}" — afgeschreven, voorgoed. Onder het blok ligt het handgeld: 60 goud.`;
        }
      },
      { label: 'Loop stil voorbij', detail: 'Niets gebeurt.', doe: () => 'Je loopt voorbij. De lantaarn flakkert, alsof ze het onthoudt.' }
    ]
  },
  {
    id: 'de_verkiezing', titel: 'De Verkiezing', icoon: '🗳️',
    toon: () => huidigeAct() >= 3,
    tekst: 'Twee vergulde urnen op een bazalten podium, allebei al OVERVOL met identieke, goudgezegelde stembiljetten. Onder het podium, half verborgen, is een derde gleuf ruw in de steen gesneden.',
    opties: [
      {
        label: 'Stem urne A', detail: '+30 goud „aanwezigheidspremie". En je naam op een lijst.',
        doe: () => { S.goud += 30; if (willekeurig() < 0.5) { const v = geefDekVloek('laster'); if (v) { toonVloekReveal('laster'); return 'De teller knikt goedkeurend en betaalt je premie: 30 goud. Achter je krast een pen — jouw naam, een lijst, een leugen.'; } } return 'De teller knikt goedkeurend en betaalt je premie: 30 goud. De uitslag stond al vast.'; }
      },
      {
        label: 'Stem urne B', detail: '+30 goud „aanwezigheidspremie". En je naam op een lijst.',
        doe: () => { S.goud += 30; if (willekeurig() < 0.5) { const v = geefDekVloek('laster'); if (v) { toonVloekReveal('laster'); return 'De teller knikt exact even goedkeurend en betaalt exact dezelfde premie: 30 goud. B, A — de uitslag kent het verschil niet.'; } } return 'De teller knikt exact even goedkeurend: 30 goud. De urnen worden straks toch samengegoten.'; }
      },
      {
        label: 'De derde gleuf', detail: 'Stop je LICHT erin (−20). Wat eruit komt, is niet geteld.',
        kan: () => S.fakkel >= 60,
        reden: () => 'De gleuf is te donker — je fakkel moet feller branden (60+).',
        doe: () => { zetFakkel(-20); const r = willekeurigRelikwie(); if (r) { geefRelikwie(r); return `Je giet je licht in de gleuf. Iets onder het podium slikt, en schuift iets terug: ${RELIKWIEEN[r].naam}. Niet geteld. Niet gezien.`; } S.goud += 80; return 'Je giet je licht in de gleuf. Van onder het podium schuift een buidel terug: 80 goud. Niet geteld. Niet gezien.'; }
      }
    ]
  },
  {
    id: 'het_pamflet', titel: 'Het Pamflet', icoon: '🖨️',
    toon: () => huidigeAct() >= 3,
    tekst: 'In een bazalten kelder ratelt een verborgen handpers. Verse pamfletten hangen aan waslijnen te drogen. Boven het valluik: hard rood licht. Hier beneden: één zachte kaars, en inktvlekken op alles.',
    opties: [
      {
        label: 'Druk mee', detail: 'Smeed 1 willekeurige kaart (gratis upgrade). 35% kans: gesnapt.',
        kan: () => S.dek.some(c => !c.up && KAARTEN[c.id].up),
        reden: () => 'Al je kaarten zijn al gesmeed — je hand is hier niets waard.',
        doe: () => {
          const kandidaten = S.dek.filter(c => !c.up && KAARTEN[c.id].up);
          const c = kiesUit(kandidaten);
          c.up = true;
          if (willekeurig() < 0.35) { const v = geefDekVloek('laster'); if (v) { toonVloekReveal('laster'); return `Je draait de pers: „${KAARTEN[c.id].naam}" komt er scherper uit (+). Maar boven klapt het luik — iemand heeft je gezien.`; } }
          return `Je draait de pers tot je armen branden: „${KAARTEN[c.id].naam}" komt er scherper uit (+). De drukker knikt. Meer niet. Genoeg.`;
        }
      },
      {
        label: 'Verklik de drukker', detail: '+80 goud. Gegarandeerd een vloek — verraad kost je naam.',
        doe: () => { S.goud += 80; const v = geefDekVloek('laster'); if (v) toonVloekReveal('laster'); return v ? 'De premie is vorstelijk: 80 goud. De pers valt stil. Jouw naam fluistert voortaan mee in elke kelder.' : 'De premie is vorstelijk: 80 goud. Het Zondebokvel draagt de schande — maar jij weet het nog wel.'; }
      },
      { label: 'Duik terug de schaduw in', detail: 'Niets gebeurt.', doe: () => 'Je trekt je terug. Beneden ratelt de pers door — koppig, zacht, onbetaalbaar.' }
    ]
  },
  {
    id: 'de_overloper', titel: 'De Overloper', icoon: '🗝️',
    toon: () => huidigeAct() >= 3,
    tekst: 'Een gouden gardist staat in een schaduwboog — helm ÁF, onder zijn arm. Een moe, menselijk gezicht. Hij houdt je een sleutelbos en een gevouwen kaart voor. Zijn hellebaard leunt vergeten tegen de muur.',
    opties: [
      {
        label: 'Koop de sleutels', detail: '−40 goud. Je eerstvolgende elite-buit telt DUBBEL.',
        kan: () => S.goud >= 40,
        reden: () => 'Je hebt geen 40 goud.',
        doe: () => { S.goud -= 40; S.overloperDubbel = true; return 'Hij weegt je goud niet eens. „De kluizen tellen op wat de wacht niet ziet." De eerstvolgende elite-buit telt dubbel.'; }
      },
      {
        label: 'Vraag de route', detail: '+30 licht — de kortste weg door de patrouilles.',
        kan: () => S.fakkel < 100,
        reden: () => 'Je fakkel is al vol — je hebt zijn route niet nodig.',
        doe: () => { zetFakkel(30); return 'Hij tekent drie lijnen op je hand. „Daar staat niemand. Daar kijkt niemand. Daar wíl niemand staan." Je verspilt geen druppel olie. (+30 licht)'; }
      },
      {
        label: 'Meld hem aan', detail: '+100 goud + een vloek. De duurste keuze van de act.',
        doe: () => { S.goud += 100; const v = geefDekVloek('laster'); if (v) toonVloekReveal('laster'); return v ? 'Honderd goudstukken, keurig geteld. Ze nemen hem zonder geweld mee — hij kijkt je niet eens aan. Dat is het ergste.' : 'Honderd goudstukken, keurig geteld. Het Zondebokvel draagt je naam weg — maar zijn blik neem je mee.'; }
      }
    ]
  }
];
