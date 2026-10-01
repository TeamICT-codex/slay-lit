# -*- coding: utf-8 -*-
"""Gepoolde winstkans per held x sterkte over meerdere seedblokken van DEZELFDE configuratie
(planner F, pool_winst_F.py). Alleen de 62 %-aankomst.

Gebruik: python tools/baas-meting/pool_winst.py naam=a.json,b.json,c.json [naam2=...] [--pop]"""
import sys, os
from collections import defaultdict
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from meetlib import laad, dick_rs, marge, standaard_hp

pop = '--pop' in sys.argv
for arg in [a for a in sys.argv[1:] if not a.startswith('--')]:
    naam, lijst = arg.split('=', 1)
    cel = defaultdict(lambda: [0, 0])
    sd = defaultdict(set)
    for p in lijst.split(','):
        for r in dick_rs(laad(p), pop=pop):
            if not standaard_hp(r):
                continue
            k = (r['held'], r['st'])
            cel[k][1] += 1
            cel[k][0] += 1 if r.get('gewonnen') else 0
            sd[k].add(r['seed'])
    uit = []
    for st_ in ('gemiddeld', 'sterk', 'sterk_oud', 'matig', 'aankomst'):   # aankomst = MEET_AANKOMST (echte aankomst-HP)
        rij = [(h, cel[(h, st_)]) for h in ('slachter', 'gifmagier', 'thoverk') if cel[(h, st_)][1]]
        if not rij:
            continue
        pc = [100 * w / n for _, (w, n) in rij]
        uit.append(f"{st_}: " + ' / '.join(f"{h[:3]} {100 * w / n:.0f}±{marge(100 * w / n, len(sd[(h, st_)])):.0f} ({len(sd[(h, st_)])} seeds)" for h, (w, n) in rij)
                   + (f"  spr {max(pc) - min(pc):.0f}" if len(pc) == 3 else ''))
    print(naam.ljust(10), ' | '.join(uit))
