# -*- coding: utf-8 -*-
"""Hoe vaak zakt de baas een hele ronde NIET (stilstand), en hoe vaak viel een klap volledig in de
leegte (nulklap)? (planner F, stilstand_F.py). Zonder lengteregel: 0,8-1,8 per gevecht.

Gebruik: python tools/baas-meting/stilstand.py <uit.json> [...] [--pop]"""
import sys, os, statistics as st
from collections import defaultdict
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from meetlib import laad, dick_rs, stilstand

pop = '--pop' in sys.argv
for p in [a for a in sys.argv[1:] if not a.startswith('--')]:
    d = laad(p)
    rs = [r for r in dick_rs(d, pop=pop) if r.get('hpPct') == 0.62]
    cel = defaultdict(list)
    for r in rs:
        cel[(r['held'], r['st'])].append(r)
    out = []
    for k in sorted(cel):
        v = cel[k]
        out.append(f"{k[0][:3]}/{k[1][:5]} stil {st.mean(stilstand(r) for r in v):.1f} nulklap {st.mean(r.get('slotNul', 0) for r in v):.1f}")
    print(os.path.basename(p)[:-5].ljust(16), ' | '.join(out))
