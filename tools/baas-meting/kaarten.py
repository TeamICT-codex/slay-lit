# -*- coding: utf-8 -*-
"""Waar komt de schade op de baas vandaan (per kaart en soort), en wat kost de speler (per bron)?
(planner F, kaarten_F.py). Alle opgegeven bestanden samengevoegd.

Gebruik: python tools/baas-meting/kaarten.py <uit.json> [...] [--pop]"""
import sys, os, statistics as st
from collections import defaultdict, Counter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from meetlib import laad, dick_rs, binnen_zonder_zelf, standaard_hp

pop = '--pop' in sys.argv
cel = defaultdict(list)
for p in [a for a in sys.argv[1:] if not a.startswith('--')]:
    for r in dick_rs(laad(p), pop=pop):
        if standaard_hp(r):
            cel[(r['held'], r['st'])].append(r)
for k in sorted(cel):
    v = cel[k]
    n = len(v)
    w = sum(1 for r in v if r.get('gewonnen'))
    kb, kh, bron = Counter(), Counter(), Counter()
    for r in v:
        kb.update(r.get('kaartBaas') or {})
        kh.update(r.get('kaartHof') or {})
        bron.update({b: x for b, x in (r.get('bron') or {}).items() if not b.startswith('zelf')})
    tot = sum(kb.values()) or 1
    btot = sum(bron.values()) or 1
    raw = sum(r.get('rawIn', 0) for r in v) or 1
    blok = sum(r.get('geblokt', 0) for r in v)
    kz = st.mean((r.get('kiezers') or 0) for r in v if r.get('haaldeIV')) if any(r.get('haaldeIV') for r in v) else 0
    print(f"{k[0]}/{k[1]}: n {n}, winst {100 * w / n:.0f}%, binnen {btot / n:.0f}/gevecht, blok {100 * blok / raw:.0f}%, kiezers {kz:.1f},"
          f" weggeknipt {st.mean(r.get('slotWeg', 0) for r in v):.0f}/gevecht (plafond {st.mean(r.get('capWeg', 0) for r in v):.0f}), hof ving {st.mean(r.get('spill', 0) for r in v):.0f}, op het hof {sum(kh.values()) / n:.0f}")
    print('   op de baas: ' + ', '.join(f"{x} {100 * c / tot:.0f}%" for x, c in kb.most_common(6)))
    print('   binnen:     ' + ', '.join(f"{x} {100 * c / btot:.0f}%" for x, c in bron.most_common(7)))
