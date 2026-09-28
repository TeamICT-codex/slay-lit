# Samenvatting van een meet-JSON van dick_meting.js: per held x sterkte (beide beleidsregels samen).
# Gebruik: python tools/baas-meting/vat_samen.py <bestand.json>
import json, sys, statistics as st
from collections import defaultdict, Counter

d = json.load(open(sys.argv[1], encoding='utf-8'))
cel = defaultdict(list)
for r in d['resultaten']:
    if r.get('baas') != 'de_dicktator':
        continue
    # sinds v4 (Finale B4): alleen de basisbuilds op druk x1, zonder foute jobs (zie meetlib.py)
    # relikwie-balans (28 sep): ook geen relikwie-variant (veld rv, MEET_RELIEK_VAR)
    if (r.get('pv') or 'basis') != 'basis' or float(r.get('dmgx') or 1) != 1.0 or r.get('fout') or (r.get('rv') or 'basis') != 'basis':
        continue
    cel[(r['held'], r['st'], r.get('hpPct'))].append(r)

def rondes_per_bd(rs):
    tel = defaultdict(list)
    for r in rs:
        c = Counter(e['bd'] for e in r.get('log', []))
        for bd in (1, 2, 3, 4):
            if r.get('eindBedrijf', 0) >= bd:
                tel[bd].append(c.get(bd, 0))
    return ' '.join(f"{bd}:{st.mean(v):.1f}" for bd, v in sorted(tel.items()))

print(f"{'held':10} {'sterkte':9} {'hp%':4} {'winst':>7} {'rondes':>6} {'HPover':>6}  rondes/scene         sterf I/II/III/IV   factuur%  IV-winst  doodsbron")
tot_bron = Counter()
for k in sorted(cel):
    rs = cel[k]
    w = [r for r in rs if r['gewonnen']]
    sterf = Counter(r['sterfBedrijf'] for r in rs if r['dood'])
    bron = Counter()
    for r in rs:
        bron.update(r.get('bron', {}))
    tot_bron.update(bron)
    iv = [r for r in rs if r.get('haaldeIV')]
    iv_w = sum(1 for r in iv if r['gewonnen'])
    doods = Counter(r.get('doodsBron') or '?' for r in rs if r['dood'])
    tot = sum(v for b, v in bron.items() if not b.startswith('zelf')) or 1
    fact = sum(v for b, v in bron.items() if 'actuur' in b or 'nvordering' in b)
    print(f"{k[0]:10} {k[1]:9} {int((k[2] or 0)*100):3}% {len(w):3}/{len(rs):<3} {st.median([r['rondes'] for r in rs]):6} "
          f"{(st.median([r['hpOver'] for r in w]) if w else 0):6}  {rondes_per_bd(rs):20} "
          f"{sterf.get(1,0)}/{sterf.get(2,0)}/{sterf.get(3,0)}/{sterf.get(4,0):<9} {100*fact/tot:5.0f}   "
          f"{iv_w:3}/{len(iv):<4} {', '.join(f'{b} {n}' for b, n in doods.most_common(3))}")
print('\nschade per bron (alle cellen):', ', '.join(f"{b} {v}" for b, v in tot_bron.most_common(12)))
