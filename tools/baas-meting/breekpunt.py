# -*- coding: utf-8 -*-
"""Het breekpunt per build (MEET_BREEK): bij welke druk (alle klappen van baas en hof x factor)
haalt elke build 50 %? Lineaire interpolatie tussen de twee gemeten factoren rond 50 %.

Gebruik: python tools/baas-meting/breekpunt.py <zwaai.json> [<meting.json> ...]
Een gewone meting (druk x1) mag erbij: haar basiscellen tellen als het punt x1 (of als het punt
op haar MEET_DMGX). Per build: de winstcurve en het breekpunt. Het verschil tussen de breekpunten
van twee builds is de druk die je nodig hebt om de ene evenveel te laten winnen als de andere
(afwerkplan §4.5: sterk-Kol haalt 80 % pas bij 1,2 à 1,35 keer de druk van de gemiddelde builds)."""
import sys, os
from collections import defaultdict
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from meetlib import HELD, ST, laad

pt = defaultdict(lambda: defaultdict(lambda: [0, 0]))
for p in [a for a in sys.argv[1:] if not a.startswith('--')]:
    d = laad(p)
    for r in d['resultaten']:
        if r.get('baas') != 'de_dicktator' or r.get('fout') or r.get('hpPct') != 0.62 or (r.get('pv') or 'basis') != 'basis':
            continue
        f = round(float(r.get('dmgx') or 1), 3)
        c = pt[(r['held'], r['st'])][f]
        c[1] += 1
        c[0] += 1 if r.get('gewonnen') else 0


def kruising(curve, doel):
    """de factor waarop de (dalende) curve het doel kruist; None als ze het niet kruist"""
    fs = sorted(curve)
    for a, b in zip(fs, fs[1:]):
        wa, wb = curve[a], curve[b]
        if (wa - doel) * (wb - doel) <= 0 and wa != wb:
            return a + (b - a) * (wa - doel) / (wa - wb)
    return None


for doel in (50, 80):
    print(f"== breekpunt: de druk waarop de build {doel} % haalt (x1 = de huidige waarden)")
    for k in sorted(pt, key=lambda k: (ST.index(k[1]) if k[1] in ST else 9, list(HELD).index(k[0]) if k[0] in HELD else 9)):
        curve = {f: 100.0 * w / n for f, (w, n) in pt[k].items() if n}
        x = kruising(curve, doel)
        fs = sorted(curve)
        if x is None:
            x = f"> {fs[-1]}" if curve[fs[-1]] > doel else f"< {fs[0]}"
        else:
            x = f"x{x:.2f}"
        print(f"   {k[0] + '/' + k[1]:20} {x:>8}   " + '  '.join(f"x{f}:{curve[f]:.0f}% (n{pt[k][f][1]})" for f in fs))
    print()
