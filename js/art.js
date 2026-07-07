/* ============================================================
   SLAY LIT — Karakter-art: handgetekende SVG-personages
   Elke functie geeft de binnenkant van een 100×100-viewBox terug.
   opties.dicht = ogen dicht (voor knipperen).
   ============================================================ */

/* open/dicht-oog met highlight */
function _oog(x, y, r, dicht, iris = '#1a1020', wit = '#fff') {
  if (dicht) {
    return `<path d="M${x - r} ${y} Q${x} ${y + r} ${x + r} ${y}" stroke="${iris}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  }
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${wit}"/>
    <circle cx="${x}" cy="${y + r * 0.18}" r="${r * 0.48}" fill="${iris}"/>
    <circle cx="${x - r * 0.25}" cy="${y - r * 0.3}" r="${r * 0.2}" fill="#fff"/>`;
}

/* gloeiend oog (voor golems, schimmen...) */
function _gloeiOog(x, y, rx, ry, dicht, kleur) {
  if (dicht) return `<path d="M${x - rx} ${y} L${x + rx} ${y}" stroke="${kleur}" stroke-width="1.6" opacity=".5" stroke-linecap="round"/>`;
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${kleur}"/>
    <ellipse cx="${x}" cy="${y}" rx="${rx * 1.9}" ry="${ry * 1.9}" fill="${kleur}" opacity=".22"/>`;
}

const KARAKTER_ART = {

  /* ---------- DE SLACHTER (speler) — kijkt naar rechts ---------- */
  speler(o = {}) {
    const d = o.dicht;
    return `
    <defs>
      <linearGradient id="sp-robe" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3d3066"/><stop offset="1" stop-color="#1b1430"/>
      </linearGradient>
      <linearGradient id="sp-staal" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="#8fa6b8"/><stop offset=".5" stop-color="#e8f2fa"/><stop offset="1" stop-color="#9db4c6"/>
      </linearGradient>
    </defs>
    <!-- cape -->
    <path d="M40 93 Q22 78 26 52 Q30 38 40 32 L44 40 Q34 56 38 76 Q39 86 42 93 Z" fill="#241a3e"/>
    <path d="M40 93 Q28 80 30 56 L36 60 Q33 78 41 93 Z" fill="#170f2b" opacity=".8"/>
    <!-- romp -->
    <path d="M40 93 Q36 64 46 50 L60 50 Q68 66 64 93 Z" fill="url(#sp-robe)"/>
    <path d="M46 58 H62 M45 66 H63" stroke="#120c22" stroke-width="1.4" opacity=".5"/>
    <!-- riem -->
    <rect x="42" y="70" width="22" height="5" rx="2" fill="#33232a"/>
    <rect x="50" y="69.4" width="6.5" height="6.2" rx="1.4" fill="#d8a64a"/>
    <!-- arm naar voren + zwaard -->
    <path d="M58 56 Q70 54 74 49" stroke="#2c2250" stroke-width="7" stroke-linecap="round" fill="none"/>
    <circle cx="75" cy="48" r="4.4" fill="#3d3066"/>
    <path d="M70 53 L82 42" stroke="#5a4630" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M76 47 L94 22 L96 27 L80 51 Z" fill="url(#sp-staal)"/>
    <path d="M94 22 L96 27" stroke="#fff" stroke-width="1" opacity=".8"/>
    <!-- kap -->
    <path d="M42 38 Q40 20 56 18 Q72 20 68 40 Q66 48 56 49 Q46 48 42 38 Z" fill="#322757"/>
    <path d="M56 18 Q74 18 70 38 L64 36 Q66 24 56 22 Z" fill="#3f3270"/>
    <!-- gezicht in schaduw -->
    <path d="M47 38 Q48 28 58 28 Q66 30 64 41 Q62 46 55 46 Q49 45 47 38 Z" fill="#0e0918"/>
    ${_gloeiOog(54.5, 36.5, 2.4, 1.5, d, '#ffb45e')}
    ${_gloeiOog(61, 36.8, 2.2, 1.4, d, '#ffb45e')}
    <!-- ember-trim op de kap -->
    <path d="M44 41 Q52 50 66 42" stroke="#c8742e" stroke-width="1.6" fill="none" opacity=".9"/>`;
  },

  /* ---------- DE GIFMAGIËR (2e held) — kijkt naar rechts ---------- */
  gifmagier(o = {}) {
    const d = o.dicht;
    return `
    <defs>
      <linearGradient id="gm-pij" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2e5c3a"/><stop offset="1" stop-color="#142a1a"/>
      </linearGradient>
    </defs>
    <!-- giftige dampen -->
    <circle cx="24" cy="30" r="2" fill="#7ed957" opacity=".55"/>
    <circle cx="80" cy="36" r="1.6" fill="#7ed957" opacity=".45"/>
    <circle cx="74" cy="20" r="1.3" fill="#7ed957" opacity=".4"/>
    <!-- mantel -->
    <path d="M36 93 Q28 64 42 48 L60 48 Q72 64 66 93 Z" fill="url(#gm-pij)"/>
    <path d="M42 56 H62 M41 64 H63" stroke="#0e2012" stroke-width="1.3" opacity=".5"/>
    <!-- riem met flesjes -->
    <rect x="38" y="70" width="28" height="4.6" rx="2" fill="#33232a"/>
    <rect x="42" y="73" width="5" height="9" rx="2" fill="#7ed957"/>
    <rect x="50" y="74" width="4.4" height="8" rx="2" fill="#b56ee0"/>
    <rect x="57" y="73" width="5" height="9" rx="2" fill="#5ad0e8"/>
    <!-- arm met borrelende kolf -->
    <path d="M60 56 Q72 54 77 49" stroke="#1f3d27" stroke-width="6.5" stroke-linecap="round" fill="none"/>
    <path d="M76 44 L84 44 L86 54 Q81 59 76 54 Z" fill="rgba(160,230,140,.35)" stroke="#7ed957" stroke-width="1.4"/>
    <path d="M78 40 L82 40 L82 45 L78 45 Z" fill="#5a4630"/>
    <circle cx="80" cy="50" r="1.4" fill="#c8f5a8"/>
    <circle cx="83" cy="47" r="1" fill="#c8f5a8"/>
    <!-- kap -->
    <path d="M40 38 Q38 18 54 16 Q70 18 66 40 Q64 48 54 49 Q44 48 40 38 Z" fill="#23472c"/>
    <path d="M54 16 Q72 16 66 38 L61 36 Q64 22 54 20 Z" fill="#2f5c3a"/>
    <!-- snavelmasker (pestdokter) -->
    <path d="M52 32 Q62 30 74 38 Q63 42 54 41 Q49 40 49 36 Q49 33 52 32 Z" fill="#d8ccb0"/>
    <path d="M58 33 Q66 33 72 37" stroke="#a89878" stroke-width="1" fill="none"/>
    <circle cx="68" cy="36.5" r=".9" fill="#5a4a30"/>
    <!-- gloeiende lens -->
    ${_gloeiOog(52, 31, 2.6, 2.2, d, '#9ef07a')}
    <!-- ember-stiksel -->
    <path d="M42 41 Q50 49 64 42" stroke="#3f7a4e" stroke-width="1.5" fill="none" opacity=".9"/>`;
  },

  /* ---------- GROENE SLIJM ---------- */
  groene_slijm(o = {}) {
    const d = o.dicht;
    return `
    <defs>
      <radialGradient id="gs-lijf" cx=".35" cy=".3" r="1">
        <stop offset="0" stop-color="#a8e063"/><stop offset=".6" stop-color="#5cab38"/><stop offset="1" stop-color="#2e6e22"/>
      </radialGradient>
    </defs>
    <!-- druppels -->
    <path d="M18 88 Q16 80 21 78 Q25 82 23 89 Q20 93 18 88 Z" fill="#4e9c32"/>
    <path d="M82 90 Q84 83 79 81 Q76 86 78 91 Z" fill="#4e9c32"/>
    <!-- lijf -->
    <path d="M50 30 Q78 32 82 62 Q86 82 72 90 Q60 96 50 94 Q38 96 28 89 Q15 81 19 60 Q24 33 50 30 Z" fill="url(#gs-lijf)"/>
    <path d="M50 30 Q78 32 82 62 Q84 74 78 82 Q80 60 66 46 Q56 38 42 38 Q60 32 50 30 Z" fill="#7cc94e" opacity=".5"/>
    <!-- belletjes -->
    <circle cx="36" cy="72" r="4" fill="#8fdb5e" opacity=".6"/>
    <circle cx="64" cy="78" r="3" fill="#8fdb5e" opacity=".5"/>
    <circle cx="58" cy="62" r="2.2" fill="#c4f29a" opacity=".7"/>
    <!-- glans -->
    <ellipse cx="38" cy="44" rx="9" ry="5.5" fill="#d6f7ae" opacity=".7" transform="rotate(-18 38 44)"/>
    ${_oog(42, 58, 5.5, d, '#173312')}
    ${_oog(60, 58, 5, d, '#173312')}
    <path d="M45 72 Q52 78 59 71" stroke="#1d3d14" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  },

  /* ---------- BLAUWE SLIJM ---------- */
  blauwe_slijm(o = {}) {
    const d = o.dicht;
    return `
    <defs>
      <radialGradient id="bs-lijf" cx=".35" cy=".28" r="1">
        <stop offset="0" stop-color="#7cd4f0"/><stop offset=".6" stop-color="#3b8ecc"/><stop offset="1" stop-color="#1d4d8a"/>
      </radialGradient>
    </defs>
    <!-- kruin-druppel -->
    <path d="M50 12 Q57 22 53 28 L47 28 Q43 22 50 12 Z" fill="#5cb4e0"/>
    <!-- lijf: hogere druppelvorm -->
    <path d="M50 24 Q74 28 78 58 Q82 82 68 90 Q58 96 50 95 Q42 96 32 90 Q18 82 22 58 Q26 28 50 24 Z" fill="url(#bs-lijf)"/>
    <path d="M50 24 Q74 28 78 58 Q80 72 74 82 Q76 56 62 42 Q54 35 44 34 Q58 27 50 24 Z" fill="#65b9e2" opacity=".55"/>
    <!-- druppel zijkant -->
    <path d="M80 70 Q84 76 80 81 Q76 77 78 71 Z" fill="#4392c8"/>
    <ellipse cx="37" cy="42" rx="8" ry="5" fill="#c8eeff" opacity=".75" transform="rotate(-20 37 42)"/>
    <circle cx="62" cy="74" r="3.4" fill="#9adcf5" opacity=".55"/>
    <circle cx="40" cy="78" r="2.6" fill="#9adcf5" opacity=".5"/>
    ${_oog(42, 56, 5.2, d, '#0d2440')}
    ${_oog(60, 56, 4.8, d, '#0d2440')}
    <path d="M46 70 Q52 67 58 70" stroke="#0d2a4a" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  },

  /* ---------- GROTRAT — kijkt naar links ---------- */
  grotrat(o = {}) {
    const d = o.dicht;
    return `
    <defs>
      <linearGradient id="rt-vacht" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8a8494"/><stop offset="1" stop-color="#4a4452"/>
      </linearGradient>
    </defs>
    <!-- staart -->
    <path d="M74 80 Q94 76 92 60 Q91 50 84 50" stroke="#b88a96" stroke-width="4" fill="none" stroke-linecap="round"/>
    <!-- lijf gebocheld -->
    <path d="M26 88 Q18 70 34 56 Q50 42 68 52 Q84 62 78 80 Q74 90 60 91 L34 91 Q28 91 26 88 Z" fill="url(#rt-vacht)"/>
    <path d="M34 56 Q50 42 68 52 Q76 58 78 68 Q66 56 50 56 Q40 56 34 62 Z" fill="#9d97a8" opacity=".6"/>
    <!-- kop -->
    <path d="M30 86 Q12 84 8 74 Q14 60 30 62 Q42 64 42 76 Q40 86 30 86 Z" fill="url(#rt-vacht)"/>
    <!-- oren -->
    <circle cx="34" cy="58" r="7" fill="#6e6878"/><circle cx="34" cy="58" r="4" fill="#b88a96"/>
    <circle cx="22" cy="60" r="5.5" fill="#6e6878"/><circle cx="22" cy="60" r="3" fill="#b88a96"/>
    <!-- snuit + neus -->
    <path d="M10 73 Q8 74 9 76" stroke="#3a3442" stroke-width="1" fill="none"/>
    <circle cx="9" cy="74" r="2.4" fill="#d8758a"/>
    <!-- snorharen -->
    <path d="M10 72 L2 68 M10 75 L1 75 M10 78 L3 82" stroke="#cfc9d8" stroke-width=".9" opacity=".8"/>
    <!-- rood oog -->
    ${_gloeiOog(24, 70, 3, 2.2, d, '#ff5d55')}
    <!-- tandjes -->
    <path d="M14 80 L16 84 L18 80" fill="#f5f0e0"/>
    <!-- pootjes -->
    <path d="M36 91 Q36 95 40 95 M54 91 Q54 95 58 95" stroke="#b88a96" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  },

  /* ---------- KULTIST — vogelmasker, kijkt naar links ---------- */
  kultist(o = {}) {
    const d = o.dicht;
    return `
    <defs>
      <linearGradient id="kt-pij" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3c2a52"/><stop offset="1" stop-color="#170e26"/>
      </linearGradient>
    </defs>
    <!-- zwevende veren/sintels -->
    <circle cx="20" cy="38" r="1.6" fill="#b08aff" opacity=".7"/>
    <circle cx="80" cy="30" r="1.3" fill="#b08aff" opacity=".5"/>
    <circle cx="74" cy="56" r="1.2" fill="#ff9c5e" opacity=".6"/>
    <!-- pij -->
    <path d="M50 22 Q70 30 72 60 Q74 84 66 93 L34 93 Q26 84 28 60 Q30 30 50 22 Z" fill="url(#kt-pij)"/>
    <path d="M50 22 Q70 30 72 60 Q73 74 69 84 Q68 56 56 40 Q50 33 44 32 Q48 24 50 22 Z" fill="#4e3a6a" opacity=".6"/>
    <!-- armen omhoog -->
    <path d="M34 52 Q20 44 18 32" stroke="#2c1e42" stroke-width="6.5" stroke-linecap="round" fill="none"/>
    <path d="M66 52 Q80 46 84 35" stroke="#2c1e42" stroke-width="6.5" stroke-linecap="round" fill="none"/>
    <path d="M17 30 Q14 26 17 23 M84 33 Q88 30 86 26" stroke="#8a7aa8" stroke-width="3.4" stroke-linecap="round" fill="none"/>
    <!-- ketting met oog-amulet -->
    <path d="M42 38 Q50 46 58 38" stroke="#d8a64a" stroke-width="1.6" fill="none"/>
    <circle cx="50" cy="45" r="3.4" fill="#d8a64a"/><circle cx="50" cy="45" r="1.5" fill="#5a1a2e"/>
    <!-- kap + vogelmasker -->
    <path d="M38 30 Q36 12 52 11 Q68 12 64 32 Q62 38 50 38 Q40 37 38 30 Z" fill="#2c1e42"/>
    <path d="M40 26 Q24 26 16 32 Q24 36 34 34 Q40 32 40 26 Z" fill="#e8dcc8"/>
    <path d="M40 26 Q28 27 19 31" stroke="#b8a888" stroke-width="1" fill="none"/>
    ${_gloeiOog(42, 24, 2.6, 1.8, d, '#7ee0ff')}
    <!-- runen op de pij -->
    <path d="M46 64 L50 60 L54 64 L50 68 Z M48 78 H56" stroke="#8a6ad0" stroke-width="1.3" fill="none" opacity=".8"/>`;
  },

  /* ---------- PADDENSTOELMAN ---------- */
  paddenstoelman(o = {}) {
    const d = o.dicht;
    return `
    <defs>
      <radialGradient id="pd-hoed" cx=".4" cy=".3" r="1">
        <stop offset="0" stop-color="#e85d5d"/><stop offset="1" stop-color="#8a2430"/>
      </radialGradient>
      <linearGradient id="pd-steel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f0e2c4"/><stop offset="1" stop-color="#c0a87e"/>
      </linearGradient>
    </defs>
    <!-- sporen -->
    <circle cx="24" cy="34" r="1.8" fill="#9ed080" opacity=".7"/>
    <circle cx="78" cy="42" r="1.4" fill="#9ed080" opacity=".6"/>
    <circle cx="70" cy="24" r="1.2" fill="#9ed080" opacity=".5"/>
    <!-- steel/lijf -->
    <path d="M36 92 Q34 60 42 52 L58 52 Q66 60 64 92 Z" fill="url(#pd-steel)"/>
    <path d="M42 52 L58 52 Q60 56 58 58 Q50 62 42 58 Q40 56 42 52 Z" fill="#a8906a" opacity=".6"/>
    <!-- armpjes -->
    <path d="M38 68 Q28 70 26 76 M62 68 Q72 70 74 76" stroke="#c0a87e" stroke-width="4.5" stroke-linecap="round" fill="none"/>
    <!-- hoed -->
    <path d="M16 46 Q18 18 50 16 Q82 18 84 46 Q68 52 50 52 Q32 52 16 46 Z" fill="url(#pd-hoed)"/>
    <path d="M16 46 Q50 56 84 46 Q68 51 50 51 Q32 51 16 46 Z" fill="#6e1c26"/>
    <!-- stippen -->
    <ellipse cx="32" cy="30" rx="5" ry="3.6" fill="#f5e9d0" opacity=".9"/>
    <ellipse cx="56" cy="24" rx="4" ry="3" fill="#f5e9d0" opacity=".9"/>
    <ellipse cx="70" cy="36" rx="3.4" ry="2.6" fill="#f5e9d0" opacity=".85"/>
    <!-- slaperige ogen -->
    ${_oog(44, 62, 3.6, d, '#4a3520')}
    ${_oog(57, 62, 3.4, d, '#4a3520')}
    <path d="M47 73 Q51 75 55 73" stroke="#5c4228" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  },

  /* ---------- BANDIET — kijkt naar links ---------- */
  bandiet(o = {}) {
    const d = o.dicht;
    return `
    <defs>
      <linearGradient id="bd-pak" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2e4248"/><stop offset="1" stop-color="#16242a"/>
      </linearGradient>
    </defs>
    <!-- lijf -->
    <path d="M34 93 Q28 64 40 50 L60 50 Q72 64 66 93 Z" fill="url(#bd-pak)"/>
    <!-- sjerp -->
    <path d="M38 60 L64 70 L62 78 L36 68 Z" fill="#7e2138"/>
    <!-- dolk-arm links (richting speler) -->
    <path d="M40 56 Q26 58 20 64" stroke="#22343a" stroke-width="6" stroke-linecap="round" fill="none"/>
    <circle cx="19" cy="65" r="3.6" fill="#2e4248"/>
    <path d="M16 62 L6 50 L9 48 L20 60 Z" fill="#c8d4dc"/>
    <path d="M14 64 L22 67" stroke="#5a4630" stroke-width="2.6" stroke-linecap="round"/>
    <!-- tweede dolk op de rug -->
    <path d="M62 54 L74 42" stroke="#8a96a0" stroke-width="3" stroke-linecap="round"/>
    <!-- hoofd met kap en masker -->
    <circle cx="50" cy="36" r="14" fill="#22343a"/>
    <path d="M50 22 Q38 22 36 36 Q36 28 44 25 Q50 23 50 22 Z" fill="#2e4248"/>
    <!-- maskerdoek -->
    <path d="M37 40 Q50 48 63 40 L63 46 Q50 54 37 46 Z" fill="#16242a"/>
    <!-- oogspleet -->
    <path d="M37 33 Q50 28 63 33 L63 39 Q50 35 37 39 Z" fill="#0c1418"/>
    ${_gloeiOog(44, 35.5, 2.4, 1.4, d, '#e8e2c8')}
    ${_gloeiOog(56, 35.5, 2.4, 1.4, d, '#e8e2c8')}
    <!-- buidel -->
    <circle cx="60" cy="84" r="5" fill="#5a4630"/>
    <path d="M57 80 Q60 78 63 80" stroke="#d8a64a" stroke-width="1.4" fill="none"/>`;
  },

  /* ---------- STEENGOLEM ---------- */
  steengolem(o = {}) {
    const d = o.dicht;
    return `
    <defs>
      <linearGradient id="sg-steen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#7a7488"/><stop offset="1" stop-color="#3e3848"/>
      </linearGradient>
    </defs>
    <!-- benen -->
    <path d="M30 93 L32 78 L44 78 L42 93 Z M58 93 L56 78 L68 78 L70 93 Z" fill="#4e4858"/>
    <!-- romp: gestapelde rotsen -->
    <path d="M24 78 Q18 56 32 46 L68 46 Q82 56 76 78 Q60 84 50 84 Q40 84 24 78 Z" fill="url(#sg-steen)"/>
    <path d="M32 46 L68 46 Q74 50 76 58 Q58 52 42 52 Q36 50 32 46 Z" fill="#8e88a0" opacity=".55"/>
    <!-- gloeiende kern -->
    <path d="M44 58 L56 58 L58 68 L50 74 L42 68 Z" fill="#1c1018"/>
    <path d="M46 60 L54 60 L55 67 L50 71 L45 67 Z" fill="#ff8c3f"/>
    <path d="M46 60 L54 60 L55 67 L50 71 L45 67 Z" fill="#ffd24a" opacity=".5"/>
    <!-- barsten met gloed -->
    <path d="M38 56 L34 64 M62 54 L68 62 M50 74 L50 80" stroke="#ff8c3f" stroke-width="1.4" opacity=".8"/>
    <path d="M28 66 L34 70 M70 68 L64 72" stroke="#262030" stroke-width="1.6"/>
    <!-- zware armen -->
    <path d="M24 56 Q10 60 12 76 Q13 84 20 85 Q26 84 26 76 Q25 66 30 60 Z" fill="#5e5870"/>
    <path d="M76 56 Q90 60 88 76 Q87 84 80 85 Q74 84 74 76 Q75 66 70 60 Z" fill="#5e5870"/>
    <!-- kop -->
    <path d="M38 46 Q36 30 50 28 Q64 30 62 46 Z" fill="#6a6478"/>
    <path d="M50 28 Q64 30 62 46 L56 46 Q58 34 50 31 Z" fill="#827c94" opacity=".6"/>
    ${_gloeiOog(44, 39, 2.8, 1.6, d, '#ffb45e')}
    ${_gloeiOog(56, 39, 2.8, 1.6, d, '#ffb45e')}
    <!-- mos -->
    <path d="M28 50 Q32 46 36 50 Q32 53 28 50 Z" fill="#5c8a4a" opacity=".8"/>
    <path d="M66 74 Q70 71 73 75 Q69 78 66 74 Z" fill="#5c8a4a" opacity=".7"/>`;
  },

  /* ---------- SCHADUW ---------- */
  schaduw(o = {}) {
    const d = o.dicht;
    return `
    <defs>
      <linearGradient id="sd-mist" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#5a5078" stop-opacity=".95"/>
        <stop offset=".7" stop-color="#2c2444" stop-opacity=".8"/>
        <stop offset="1" stop-color="#1a1430" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <!-- wegdrijvende slierten -->
    <path d="M24 80 Q18 86 20 93 Q26 90 28 84 Z" fill="#3a3058" opacity=".5"/>
    <path d="M76 78 Q82 84 80 92 Q74 89 72 83 Z" fill="#3a3058" opacity=".5"/>
    <!-- gedaante -->
    <path d="M50 16 Q72 20 72 48 Q72 66 64 76 Q58 84 60 92 Q50 86 50 86 Q50 86 40 92 Q42 84 36 76 Q28 66 28 48 Q28 20 50 16 Z" fill="url(#sd-mist)"/>
    <path d="M50 16 Q72 20 72 48 Q72 58 68 66 Q70 44 58 32 Q52 27 44 26 Q47 18 50 16 Z" fill="#6e6492" opacity=".4"/>
    <!-- armen/slierten -->
    <path d="M30 50 Q18 54 14 64 Q20 64 26 58" fill="#3a3058" opacity=".7"/>
    <path d="M70 50 Q82 54 86 64 Q80 64 74 58" fill="#3a3058" opacity=".7"/>
    <!-- gezicht: holte -->
    <ellipse cx="50" cy="40" rx="13" ry="11" fill="#0c081a" opacity=".85"/>
    ${_gloeiOog(44, 38, 2.8, 2, d, '#9ef0ff')}
    ${_gloeiOog(57, 38, 2.8, 2, d, '#9ef0ff')}
    <path d="M46 48 Q50 51 54 48" stroke="#9ef0ff" stroke-width="1.2" opacity=".5" fill="none"/>`;
  },

  /* ---------- GROMBAARD (elite) ---------- */
  grombaard(o = {}) {
    const d = o.dicht;
    return `
    <defs>
      <linearGradient id="gb-huid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#a8694e"/><stop offset="1" stop-color="#6e3a2c"/>
      </linearGradient>
    </defs>
    <!-- knots achter de rug -->
    <path d="M76 60 L90 30" stroke="#5a4630" stroke-width="5" stroke-linecap="round"/>
    <path d="M84 36 Q80 22 90 18 Q100 22 96 36 Q92 44 88 42 Q84 40 84 36 Z" fill="#6e5a40"/>
    <path d="M88 20 L90 16 M95 26 L99 24 M94 36 L98 38" stroke="#d8ccb8" stroke-width="2" stroke-linecap="round"/>
    <!-- benen -->
    <path d="M32 93 L34 80 L46 80 L44 93 Z M56 93 L54 80 L66 80 L68 93 Z" fill="#4a3024"/>
    <!-- romp -->
    <path d="M22 80 Q16 50 36 40 L64 40 Q84 50 78 80 Q62 88 50 88 Q38 88 22 80 Z" fill="url(#gb-huid)"/>
    <path d="M36 40 L64 40 Q72 44 76 52 Q60 46 44 46 Q38 44 36 40 Z" fill="#c08562" opacity=".5"/>
    <!-- riem met schedel -->
    <path d="M26 72 Q50 80 74 72 L74 79 Q50 87 26 79 Z" fill="#33232a"/>
    <circle cx="50" cy="77" r="5" fill="#e8dcc8"/>
    <circle cx="48" cy="76" r="1.2" fill="#33232a"/><circle cx="52.5" cy="76" r="1.2" fill="#33232a"/>
    <path d="M48 80 H52" stroke="#33232a" stroke-width="1"/>
    <!-- armen -->
    <path d="M24 50 Q8 56 10 72 Q11 80 18 80 Q24 79 24 71 Q24 60 28 54 Z" fill="#8a543e"/>
    <path d="M76 50 Q90 54 90 62" stroke="#8a543e" stroke-width="9" stroke-linecap="round" fill="none"/>
    <!-- kop -->
    <path d="M36 42 Q32 20 50 18 Q68 20 64 42 Q58 48 50 48 Q42 48 36 42 Z" fill="#a8694e"/>
    <!-- hoorns -->
    <path d="M38 24 Q30 18 28 10 Q36 12 40 20 Z" fill="#e8dcc8"/>
    <path d="M62 24 Q70 18 72 10 Q64 12 60 20 Z" fill="#e8dcc8"/>
    <!-- boze wenkbrauwen + ogen -->
    <path d="M40 30 L48 33 M60 30 L52 33" stroke="#4a2418" stroke-width="2.6" stroke-linecap="round"/>
    ${_gloeiOog(45, 35, 2.4, 1.6, d, '#ffd24a')}
    ${_gloeiOog(55, 35, 2.4, 1.6, d, '#ffd24a')}
    <!-- grote onderkaak met slagtanden -->
    <path d="M38 42 Q50 50 62 42 L62 47 Q50 54 38 47 Z" fill="#8a543e"/>
    <path d="M41 44 L43 38 L46 44 Z M59 44 L57 38 L54 44 Z" fill="#f5f0e0"/>
    <!-- baard -->
    <path d="M40 47 Q42 58 50 60 Q58 58 60 47 Q55 52 50 52 Q45 52 40 47 Z" fill="#8a8494"/>
    <path d="M44 50 Q46 56 50 58 M56 50 Q54 56 50 58" stroke="#6e6878" stroke-width="1" fill="none"/>`;
  },

  /* ---------- STEENWACHTER (elite) ---------- */
  steenwachter(o = {}) {
    const d = o.dicht;
    return `
    <defs>
      <linearGradient id="sw-steen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#6e7a8a"/><stop offset="1" stop-color="#39424e"/>
      </linearGradient>
      <linearGradient id="sw-schild" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#525e6e"/><stop offset="1" stop-color="#2c343e"/>
      </linearGradient>
    </defs>
    <!-- benen -->
    <path d="M34 93 L36 80 L46 80 L44 93 Z M56 93 L54 80 L64 80 L62 93 Z" fill="#39424e"/>
    <!-- romp -->
    <path d="M28 80 Q22 52 38 44 L62 44 Q78 52 72 80 Q58 86 50 86 Q42 86 28 80 Z" fill="url(#sw-steen)"/>
    <!-- doorn-schouders -->
    <path d="M30 46 L20 34 L34 40 Z M70 46 L80 34 L66 40 Z" fill="#8a96a4"/>
    <path d="M36 42 L32 30 L42 38 Z M64 42 L68 30 L58 38 Z" fill="#a4b0bc"/>
    <!-- helm -->
    <path d="M38 44 Q34 24 50 22 Q66 24 62 44 Z" fill="#5a6674"/>
    <path d="M50 22 Q66 24 62 44 L56 44 Q58 30 50 26 Z" fill="#76828e" opacity=".7"/>
    <path d="M44 14 L46 24 L50 22 L54 24 L56 14 L50 18 Z" fill="#8a96a4"/>
    <!-- gloeiende oogspleet -->
    <path d="M40 34 Q50 30 60 34 L60 39 Q50 35 40 39 Z" fill="#10141a"/>
    ${d
      ? `<path d="M43 36 L57 36" stroke="#7ee0ff" stroke-width="1.4" opacity=".5" stroke-linecap="round"/>`
      : `<path d="M43 36 Q50 33 57 36" stroke="#7ee0ff" stroke-width="2.4" stroke-linecap="round" fill="none"/>
         <path d="M43 36 Q50 33 57 36" stroke="#7ee0ff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".25"/>`}
    <!-- torenschild vooraan (links) -->
    <path d="M12 44 Q26 40 30 44 L30 86 Q22 92 18 92 Q10 86 10 78 Z" fill="url(#sw-schild)"/>
    <path d="M14 48 L28 48 M13 58 L29 58 M12 68 L29 68" stroke="#1e2630" stroke-width="1.4" opacity=".7"/>
    <circle cx="21" cy="63" r="4.4" fill="#d8a64a"/>
    <circle cx="21" cy="63" r="2" fill="#8a5a1e"/>
    <!-- schildarm -->
    <path d="M34 56 Q30 58 30 62" stroke="#4a5560" stroke-width="6" stroke-linecap="round" fill="none"/>
    <!-- rechterarm met hamer -->
    <path d="M72 54 Q84 58 84 68" stroke="#4a5560" stroke-width="7" stroke-linecap="round" fill="none"/>
    <rect x="78" y="66" width="12" height="9" rx="2" fill="#5a6674"/>
    <path d="M84 75 L84 88" stroke="#5a4630" stroke-width="3.6" stroke-linecap="round"/>
    <!-- barsten -->
    <path d="M42 62 L38 70 M58 58 L62 66" stroke="#222a34" stroke-width="1.4"/>`;
  },

  /* ---------- DE SLIJMKONING (baas) ---------- */
  slijmkoning(o = {}) {
    const d = o.dicht;
    return `
    <defs>
      <radialGradient id="sk-lijf" cx=".38" cy=".3" r="1.05">
        <stop offset="0" stop-color="#b8e87a"/><stop offset=".55" stop-color="#6eb83e"/><stop offset="1" stop-color="#2e6e2a"/>
      </radialGradient>
      <linearGradient id="sk-kroon" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffe28a"/><stop offset="1" stop-color="#c8862a"/>
      </linearGradient>
    </defs>
    <!-- druipend slijm rond de voet -->
    <path d="M10 90 Q8 82 14 80 Q18 85 16 91 Q12 95 10 90 Z" fill="#4e9c32"/>
    <path d="M88 91 Q92 84 86 81 Q82 86 84 92 Z" fill="#4e9c32"/>
    <ellipse cx="50" cy="93" rx="42" ry="4" fill="#3e7e2a" opacity=".6"/>
    <!-- enorm lijf -->
    <path d="M50 26 Q82 28 88 60 Q93 84 74 91 Q60 96 50 95 Q40 96 26 91 Q7 84 12 60 Q18 28 50 26 Z" fill="url(#sk-lijf)"/>
    <path d="M50 26 Q82 28 88 60 Q91 74 83 84 Q86 58 70 44 Q60 36 46 35 Q60 28 50 26 Z" fill="#8ed05a" opacity=".55"/>
    <!-- opgeslokte schat & schedel -->
    <circle cx="32" cy="76" r="4.4" fill="#ffd24a" opacity=".55"/>
    <circle cx="38" cy="82" r="3" fill="#ffd24a" opacity=".45"/>
    <g opacity=".5">
      <circle cx="68" cy="76" r="6" fill="#e8dcc8"/>
      <circle cx="66" cy="75" r="1.4" fill="#2e5e22"/><circle cx="71" cy="75" r="1.4" fill="#2e5e22"/>
      <path d="M66 80 H71" stroke="#2e5e22" stroke-width="1.2"/>
    </g>
    <!-- belletjes -->
    <circle cx="26" cy="60" r="3" fill="#a8e070" opacity=".6"/>
    <circle cx="76" cy="58" r="2.4" fill="#a8e070" opacity=".55"/>
    <!-- glans -->
    <ellipse cx="34" cy="42" rx="11" ry="6" fill="#dcf7b0" opacity=".75" transform="rotate(-16 34 42)"/>
    <!-- kroon -->
    <path d="M34 18 L38 4 L46 14 L52 2 L58 14 L66 4 L70 18 Q52 24 34 18 Z" fill="url(#sk-kroon)"/>
    <path d="M34 18 Q52 24 70 18 L70 23 Q52 29 34 23 Z" fill="#c8862a"/>
    <circle cx="42" cy="17" r="1.8" fill="#c83a5a"/>
    <circle cx="52" cy="19" r="1.8" fill="#3b8ecc"/>
    <circle cx="62" cy="17" r="1.8" fill="#c83a5a"/>
    <!-- koninklijke ogen: licht geërgerd -->
    <path d="M36 48 L46 51 M68 48 L58 51" stroke="#1d3d14" stroke-width="2.2" stroke-linecap="round"/>
    ${_oog(42, 55, 6, d, '#143310')}
    ${_oog(62, 55, 5.5, d, '#143310')}
    <!-- brede zelfvoldane mond met tandje -->
    <path d="M38 70 Q50 80 66 69 Q58 78 48 77 Q42 76 38 70 Z" fill="#1d3d14"/>
    <path d="M58 73 L60 69 L62 72 Z" fill="#f5f0e0"/>`;
  }
};

/* volledige SVG-string (voor DOM én rasterisatie) */
function karakterSvg(id, opties = {}, grootte = 100) {
  const teken = KARAKTER_ART[id];
  if (!teken) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${grootte}" height="${grootte}">${teken(opties)}</svg>`;
}

window.KARAKTER_ART = KARAKTER_ART;
window.karakterSvg = karakterSvg;

/* ============================================================
   Eigen karakter-PNG's — zet een bestand in assets/karakters/
   met de juiste naam (bv. grotrat.png) en het vervangt de
   ingebouwde SVG automatisch, in 2D én 3D.
   ============================================================ */
const KARAKTER_FOTOS = { basis: 'assets/karakters/', cache: {}, mislukt: {} };
/* een mislukte laadpoging (art bestaat nog niet) werd voorheen PERMANENT als null
   gecachet → net-gedeployede poses bleven een hele sessie onzichtbaar (in gevecht
   ÉN bestiarium) tot een harde herlaad. Nu met een korte TTL: hooguit 1 herpoging
   per ~20s per id → nieuwe art verschijnt binnen de sessie vanzelf, zonder 404-hameren. */
const _ART_MISLUKT_TTL = 20000;
function laadKarakterAfbeelding(id, cb) {
  const c = KARAKTER_FOTOS.cache;
  if (id in c) { cb(c[id]); return; }                                   /* positieve hit: altijd hergebruiken */
  const m = KARAKTER_FOTOS.mislukt[id];
  if (m && Date.now() - m < _ART_MISLUKT_TTL) { cb(null); return; }      /* verse mislukking: niet hameren */
  const probeer = (ext, anders) => {
    const img = new Image();
    img.onload = () => { c[id] = img; delete KARAKTER_FOTOS.mislukt[id]; cb(img); };
    img.onerror = anders;
    img.src = KARAKTER_FOTOS.basis + id + '.' + ext;
  };
  /* webp = de geoptimaliseerde vorm; png = verse drops vóór conversie */
  probeer('webp', () => probeer('png', () => { KARAKTER_FOTOS.mislukt[id] = Date.now(); cb(null); }));
}
window.laadKarakterAfbeelding = laadKarakterAfbeelding;

/* ============================================================
   Art-laders — elke map is een drop-zone: bestand met de juiste
   id als naam (PNG of JPG) en het verschijnt in het spel.
   ============================================================ */
function maakArtLader(basis) {
  const cache = {}, mislukt = {};   /* mislukt = TTL-cache (zie _ART_MISLUKT_TTL) → net-gedropte art verschijnt vanzelf */
  return function (id, cb) {
    if (id in cache) { cb(cache[id]); return; }
    const m = mislukt[id];
    if (m && Date.now() - m < _ART_MISLUKT_TTL) { cb(null); return; }
    const probeer = (ext, anders) => {
      const img = new Image();
      img.onload = () => { cache[id] = img; delete mislukt[id]; cb(img); };
      img.onerror = anders;
      img.src = basis + id + '.' + ext;
    };
    probeer('webp', () => probeer('png', () => probeer('jpg', () => { mislukt[id] = Date.now(); cb(null); })));
  };
}
window.laadKaartAfbeelding = maakArtLader('assets/kaarten/');
window.laadEventAfbeelding = maakArtLader('assets/events/');
window.laadRelikwieAfbeelding = maakArtLader('assets/relikwieen/');
window.laadDrankAfbeelding = maakArtLader('assets/dranken/');
window.laadIcoonAfbeelding = maakArtLader('assets/iconen/');   /* UI-iconen (rust-opties enz.) */
window.laadMetgezelAfbeelding = maakArtLader('assets/metgezellen/');   /* bondgenoten-art */
window.laadScherfAfbeelding = maakArtLader('assets/scherven/');   /* mysterie-scherven (cryptische fragmenten per bron) */

/* ============================================================
   Achtergrond-manifest — verwijst naar de platen in
   assets/achtergronden/. Nieuwe bestanden? Voeg ze hier toe.
   (Bestandsnamen exact overnemen, inclusief spaties.)
   ============================================================ */
const ACHTERGRONDEN = {
  basis: 'assets/achtergronden/',
  titel: 'Startscherm achtergrond.webp',
  act1: {
    kaart: 'Act 1 achtergronden/Achtergrond ACT 1.webp',
    rust: 'Act 1 achtergronden/Achtergrondrust1.webp',
    gevecht: [
      'Act 1 achtergronden/Gevechtstijl1act1.webp',
      'Act 1 achtergronden/Gevechtsijl2act1.webp',
      'Act 1 achtergronden/Gevechtstijl3act1.webp'
    ],
    episch: [
      'Act 1 achtergronden/GevechtstijlEPISCHGEVECHTACT1.webp',
      'Act 1 achtergronden/GevechtstijlEPISCHGEVECHT2ACT1.webp'
    ],
    winkel: 'Act 1 achtergronden/Achtergrondverkoper1.webp',
    winkelEasterEgg: 'Act 1 achtergronden/Achtergrondverkoper2easteregg.webp',
    event: 'Act 1 achtergronden/Achtergrondvraagtekenrandomencounters.webp',
    eventRelikwie: 'Act 1 achtergronden/Achtergrondvraagtekenrelikwieartefact.webp',
    schat: 'Act 1 achtergronden/Achtergrondschatkist.webp',
    beloning: 'Act 1 achtergronden/Overwinningsachtergrond1gewoon.webp',
    overwinning: 'Act 1 achtergronden/Overwinningsachtergrond1episch.webp',
    nederlaag: 'Act 1 achtergronden/Achtergrond nederlaag ACT1.webp'
  },
  /* Act 2 — Het Archief (de catacombe als bureaucratisch dodenarchief). Ontbrekende
     slots (rust/schat/beloning/overwinning/nederlaag) vallen via actBg() terug op act1. */
  act2: {
    kaart: 'Act 2 achtergronden/Startscherm ACT 2 achtergrond.webp',
    gevecht: [
      'Act 2 achtergronden/Gevechtstijl1act2.webp',
      'Act 2 achtergronden/Gevechtstijl2act2.webp',
      'Act 2 achtergronden/Gevechtstijl3act2.webp',
      'Act 2 achtergronden/Gevechtstijl4act2.webp',
      'Act 2 achtergronden/Gevechtstijl5act2.webp'
    ],
    episch: [
      'Act 2 achtergronden/Gevechtstijl act2 EPISCH 1.webp',
      'Act 2 achtergronden/Gevechtstijl act2 EPISCH 2.webp',
      'Act 2 achtergronden/Gevechtstijl act2 EPISCH 3.webp'
    ],
    winkel: 'Act 2 achtergronden/Achtergrondverkoper ACT2.webp',
    winkelEasterEgg: 'Act 2 achtergronden/Achtergrondverkoper ACT2 easter egg.webp',
    event: 'Act 2 achtergronden/Achtergrondvraagtekenencounter ACT2.webp',
    eventRelikwie: 'Act 2 achtergronden/Achtergrondvraagtekenrelikwieartefact ACT2.webp',
    rust: 'Act 2 achtergronden/Achtergrondrust2.webp',
    schat: 'Act 2 achtergronden/Achtergrondschatkist2.webp',
    beloning: 'Act 2 achtergronden/Overwinningsachtergrond2gewoon.webp',
    overwinning: 'Act 2 achtergronden/Overwinningsachtergrond2episch.webp',
    nederlaag: 'Act 2 achtergronden/Achtergrond nederlaag ACT2.webp'
  },
  /* Act 3 — Het Slachtblok. Art staat klaar; de act zelf is nog niet gebouwd
     (ACTS_MAX=2), dus dit blok is slapend tot de Act 3-bouw. `finale` is de
     aparte plaat voor het DICKtator-eindgevecht. */
  act3: {
    kaart: 'Act 3 achtergronden/Achtergrond ACT 3 laadscherm.webp',
    gevecht: [
      'Act 3 achtergronden/Gevechtstijl Act 3 stijl 1.webp',
      'Act 3 achtergronden/Gevechtstijl Act 3 stijl 2.webp',
      'Act 3 achtergronden/Gevechtstijl Act 3 stijl 3.webp',
      'Act 3 achtergronden/Gevechtstijl Act 3 stijl 4.webp'
    ],
    episch: [
      'Act 3 achtergronden/Gevechtstijl Act 3 stijl EPISCH 1.webp',
      'Act 3 achtergronden/Gevechtstijl Act 3 stijl EPISCH 2.webp',
      'Act 3 achtergronden/Gevechtstijl Act 3 stijl EPISCH 3.webp'
    ],
    finale: 'Act 3 achtergronden/Achtergrond ACT 3 FINALE.webp',
    winkel: 'Act 3 achtergronden/Achtergrond verkoper ACT3.webp',
    winkelEasterEgg: 'Act 3 achtergronden/Achtergrond verkoper ACT3 easter egg.webp',
    event: 'Act 3 achtergronden/Achtergrondvraagtekenencounter ACT3.webp',
    eventRelikwie: 'Act 3 achtergronden/Achtergrondvraagtekenrelikwieartefact ACT3.webp',
    rust: 'Act 3 achtergronden/Achtergrondrust3.webp',
    schat: 'Act 3 achtergronden/Achtergrondschatkist3.webp',
    beloning: 'Act 3 achtergronden/Overwinningsachtergrond3gewoon.webp',
    overwinning: 'Act 3 achtergronden/Overwinningsachtergrond3episch.webp',
    nederlaag: 'Act 3 achtergronden/Achtergrond nederlaag ACT3.webp'
  }
};
window.ACHTERGRONDEN = ACHTERGRONDEN;
