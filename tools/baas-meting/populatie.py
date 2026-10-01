# -*- coding: utf-8 -*-
"""De populatie per cel (MEET_POP=1): de basisbuild en haar buren op dezelfde seeds.

Gebruik: python tools/baas-meting/populatie.py <uit.json> [...]
Per cel (held x sterkte, 62 %): de winst van de basis, van elke buur (minDef / plusDef / laster,
met wat er precies veranderde), het populatiegemiddelde (elke variant even zwaar) en de
breedte (max - min): hoe steil de klif rond deze build is (afwerkplan §3)."""
import sys, os
from collections import defaultdict
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from meetlib import HELD, ST, laad, dick_rs, seeds, marge, standaard_hp

VAR = ['basis', 'minDef', 'plusDef', 'laster']

for p in [a for a in sys.argv[1:] if not a.startswith('--')]:
    d = laad(p)
    rs = [r for r in dick_rs(d, pop=True) if standaard_hp(r)]
    cel = defaultdict(lambda: defaultdict(list))
    for r in rs:
        cel[(r['held'], r['st'])][r.get('pv') or 'basis'].append(r)
    txt = {}
    for k, b in (d.get('builds') or {}).items():
        if '#' in k:
            txt[k] = b.get('pvTxt') or (b.get('label') or '').split(': ')[-1].rstrip(']')
    print(f"== populatie · {d['meta']['label']} · seeds {d['meta'].get('seedbase', '?')}+{d['meta']['seeds']}")
    print(f"{'cel':20} " + ' '.join(f"{v:>8}" for v in VAR) + f" {'POP':>6} {'±':>3} {'breedte':>7}   buren")
    popw = defaultdict(dict)
    for k in sorted(cel, key=lambda k: (ST.index(k[1]) if k[1] in ST else 9, list(HELD).index(k[0]))):
        vs = cel[k]
        w = {v: 100.0 * sum(1 for r in vs[v] if r.get('gewonnen')) / len(vs[v]) for v in VAR if vs.get(v)}
        pop = sum(w.values()) / len(w)
        popw[k[1]][k[0]] = pop
        allen = [r for v in vs.values() for r in v]
        buren = '; '.join(f"{v}: {txt.get(k[0] + '/' + k[1] + '#' + v, '?')}" for v in VAR[1:] if vs.get(v))
        print(f"{k[0] + '/' + k[1]:20} " + ' '.join(f"{w[v]:7.0f}%" if v in w else f"{'-':>8}" for v in VAR)
              + f" {pop:5.0f}% {marge(pop, seeds(allen)):3.0f} {max(w.values()) - min(w.values()):6.0f}pp   {buren}")
    for st_, h in popw.items():
        if len(h) == 3:
            print(f"   {st_}: populatie {' / '.join(f'{HELD[x]} {h[x]:.0f}' for x in HELD if x in h)}  spreiding {max(h.values()) - min(h.values()):.0f} pp")
    print()
