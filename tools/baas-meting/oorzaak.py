# -*- coding: utf-8 -*-
"""De OORZAAK van de heldspreiding per cel: verdediging tegenover tempo (planner F, oorzaak_F.py).

Gebruik: python tools/baas-meting/oorzaak.py <uit.json> [...] [--pop]
hp0 = HP bij aankomst, rauw = binnenkomende schade vóór blok, blok% = wat je blok ving, netto =
wat er echt binnenkwam (zonder eigen kaarten), net/r en uit/r per ronde, baas% = deel van je
schade dat op de baas viel, weg = wat slot/vloer/plafond wegknipten, hof = wat het hof ving,
gif%/doorn% = aandeel van gif en doornen in de schade op de baas."""
import sys, os, statistics as st
from collections import defaultdict, Counter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from meetlib import laad, dick_rs, binnen_zonder_zelf

pop = '--pop' in sys.argv
for p in [a for a in sys.argv[1:] if not a.startswith('--')]:
    d = laad(p)
    rs = [r for r in dick_rs(d, pop=pop) if r.get('hpPct') == 0.62]
    cel = defaultdict(list)
    for r in rs:
        cel[(r['held'], r['st'])].append(r)
    print('==', os.path.basename(p)[:-5], '(populatie)' if pop else '(basisbuilds)')
    print(f"{'cel':22} {'win':>4} {'hp0':>4} {'rauw':>5} {'blok%':>5} {'netto':>5} {'net/r':>5} {'uit/r':>5} {'baas%':>5} {'weg':>5} {'hof':>4} {'rond':>5} {'gif%':>4} {'doorn%':>6}")
    for k in sorted(cel):
        v = cel[k]
        n = len(v)
        w = 100 * sum(1 for r in v if r.get('gewonnen')) / n
        hp0 = st.mean(r['hpStart'] for r in v)
        rauw = st.mean(r.get('rawIn', 0) for r in v)
        blok = 100 * sum(r.get('geblokt', 0) for r in v) / max(1, sum(r.get('rawIn', 0) for r in v))
        netto = st.mean(binnen_zonder_zelf(r) for r in v)
        rond = st.mean(r['rondes'] for r in v)
        netr = st.mean(binnen_zonder_zelf(r) / max(1, r['rondes']) for r in v)
        uitr = st.mean((r.get('uitBaas', 0) + r.get('uitHof', 0)) / max(1, r['rondes']) for r in v)
        baasp = 100 * sum(r.get('uitBaas', 0) for r in v) / max(1, sum(r.get('uitBaas', 0) + r.get('uitHof', 0) for r in v))
        weg = st.mean(r.get('slotWeg', 0) for r in v)
        hof = st.mean(r.get('spill', 0) for r in v)
        bs = Counter()
        for r in v:
            bs.update(r.get('baasSoort') or {})
        tot = sum(bs.values()) or 1
        print(f"{k[0][:9] + '/' + k[1][:9]:22} {w:4.0f} {hp0:4.0f} {rauw:5.0f} {blok:5.0f} {netto:5.0f} {netr:5.1f} {uitr:5.1f} {baasp:5.0f} {weg:5.0f} {hof:4.0f} {rond:5.1f} {100 * bs.get('gif/overig', 0) / tot:4.0f} {100 * bs.get('doornen', 0) / tot:6.0f}")
    print()
