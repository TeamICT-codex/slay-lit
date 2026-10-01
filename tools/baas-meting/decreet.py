# -*- coding: utf-8 -*-
"""Waarom valt er (geen) decreet? (review B4a, A4: "het decreet moet weer gemiddeld minstens één keer per
gevecht voorkomen"). Per cel (basisbuilds, x1, 62 %) en per beleid:
  - decreten per gevecht en de kiezers bij de herverkiezing (van wie IV haalde);
  - wat er gebeurde met elke pil HET DECREET aan het begin van een ronde: stond hij er aan het einde van
    jouw beurt nog (pilEind 'HET DECREET'), werd hij ingehaald door een overgang ('HERSCHIKT DE ZAAL'), of
    stierf de griffier in jouw beurt ('EIGENHANDIG VONNIS')? pilEind bestaat sinds B4a in het harnas.

Gebruik: python tools/baas-meting/decreet.py <uit.json> [...]"""
import sys, os, statistics as st
from collections import defaultdict, Counter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from meetlib import HELD, laad, dick_rs, standaard_hp

KORT = {'HET DECREET': 'staat', 'HERSCHIKT DE ZAAL': 'ingehaald', 'EIGENHANDIG VONNIS': 'griffier dood'}

cel = defaultdict(list)
for p in sys.argv[1:]:
    for r in dick_rs(laad(p)):
        if not standaard_hp(r):
            continue
        cel[(r['held'], r['st'], '*')].append(r)
        cel[(r['held'], r['st'], r['beleid'])].append(r)

print(f"{'cel':32} {'n':>4} {'dec':>5} {'kiez':>5}   pil HET DECREET aan het begin van de ronde → aan het einde van jouw beurt (scène I | II)")
for k in sorted(cel, key=lambda k: (k[1], k[0], k[2] != '*', k[2])):
    v = cel[k]
    dec = st.mean(len(r.get('decreten') or []) for r in v)
    iv = [r for r in v if r.get('haaldeIV')]
    kz = f"{st.mean((r.get('kiezers') or 0) for r in iv):5.2f}" if iv else '    -'
    zit = {1: Counter(), 2: Counter()}
    for r in v:
        for e in r.get('log') or []:
            if e.get('intent') == 'HET DECREET' and e.get('bd') in zit:
                zit[e['bd']][KORT.get(e.get('pilEind'), e.get('pilEind') or '?')] += 1
    txt = lambda c: ', '.join(f"{w} {n}" for w, n in c.most_common()) or '-'
    naam = HELD.get(k[0], k[0]) + '/' + k[1] + ('' if k[2] == '*' else '/' + k[2])
    print(f"{naam:32} {len(v):4} {dec:5.2f} {kz}   I: {txt(zit[1])} | II: {txt(zit[2])}")
