# -*- coding: utf-8 -*-
"""De leugendetector van de telegraaf (review B4a, vondst 1). Leest de rondevelden pilEind, teleEind
en inVijand (dick_meting.js sinds B4a): de pil van de baas en de getelegrafeerde schade aan het einde
van jouw beurt, en wat je in de vijandbeurt echt verloor.

Gebruik: python tools/baas-meting/leugen.py <uit.json> [...]
Per cel (basisbuilds, x1):
  - decreetleugen: een ronde met pilEind 'HET DECREET' waarin je >= 10 HP verloor (de leugen van
    vondst 1: HET DECREET werd stil EIGENHANDIG VONNIS) - doel 0;
  - boven de telegraaf: rondes waarin je meer verloor dan er op het bord stond (inVijand > teleEind).
    Informatief: je eigen statussen (gif, Schaduwsmet) bij het begin van je beurt tellen ook mee."""
import sys, os
from collections import defaultdict
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from meetlib import HELD, laad, dick_rs, tag, hp_cel

for p in sys.argv[1:]:
    d = laad(p)
    rs = dick_rs(d)
    if not any('pilEind' in e for r in rs for e in (r.get('log') or [])):
        print(f"== {d['meta']['label']}: geen pilEind in de rondes (gemeten met een harnas van vóór B4a)")
        continue
    cel = defaultdict(lambda: dict(n=0, leugen=0, verloren=0, boven=0, rondes=0, decreetpil=0))
    for r in rs:
        c = cel[(r['held'], r['st'], hp_cel(r))]
        c['n'] += 1
        log = r.get('log') or []
        lg = [e for e in log if e.get('pilEind') == 'HET DECREET' and (e.get('inVijand') or 0) >= 10]
        c['decreetpil'] += sum(1 for e in log if e.get('pilEind') == 'HET DECREET')
        if lg:
            c['leugen'] += 1
            if not r.get('gewonnen'):
                c['verloren'] += 1
        c['boven'] += sum(1 for e in log if e.get('teleEind') is not None and (e.get('inVijand') or 0) > e['teleEind'])
        c['rondes'] += len(log)
    print(f"== {d['meta']['label']} | seeds {d['meta'].get('seedbase')}+{d['meta']['seeds']}")
    print(f"{'cel':24} {'n':>4} {'decreetleugen':>14} {'waarvan verloren':>17} {'decreetpillen':>14} {'rondes boven telegraaf':>23}")
    for k in sorted(cel):
        c = cel[k]
        print(f"{HELD.get(k[0], k[0]) + '/' + k[1] + tag(k[2]):24} {c['n']:4} {c['leugen']:5} ({100.0 * c['leugen'] / c['n']:4.1f}%) {c['verloren']:17} {c['decreetpil']:14} {c['boven']:12} / {c['rondes']}")
