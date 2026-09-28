# -*- coding: utf-8 -*-
"""De doeltabel als MARKDOWN, voor de voor/na-tabellen in .claude/notities/baas-meting/meting_finale_R3.md
(afwerkplan §7 stap 4.5: 'de voor/na-tabel in meting_finale_R3.md'). Rechtstreeks uit de meetjson's,
zodat geen getal met de hand overgetikt wordt.

Gebruik: python tools/baas-meting/mdtabel.py <uit.json> [...] [--pop] [--kort]
  --pop   de populatie per cel (basis + buren, gepoold) in plaats van alleen de basisbuild
  --kort  één regel per bestand (label | gemiddeld | spreiding | sterk | matig | mediaan | scènes | Factuur)
Per cel: n (seeds), winst ± 95 %-marge (op het aantal seeds), mediaan rondes, rondes per voltooide
scène, Factuur-aandeel, weggeknipte schade, wat het hof ving, stilstand, IV gewonnen/gehaald en de
sterfscène (zelfde berekening als doeltabel.py)."""
import sys, os
from collections import defaultdict
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from meetlib import HELD, SCENE, laad, dick_rs
from doeltabel import cel_stats, DOEL

ORDE = ['sterk', 'sterk_oud', 'gemiddeld', 'matig']
k1 = lambda x: f"{x:.1f}".replace('.', ',')


def cellen(p, pop):
    d = laad(p)
    alle = dick_rs(d, pop=pop, fouten=True)
    rs = [r for r in alle if not r.get('fout')]
    cel = defaultdict(list)
    for r in rs:
        cel[(r['held'], r['st'], r['hpPct'])].append(r)
    return d, rs, len(alle) - len(rs), {k: cel_stats(v) for k, v in cel.items()}


def rij(res, st_, hp=0.62):
    return {h: res[(h, st_, hp)] for h in HELD if (h, st_, hp) in res}


def kort(p, pop):
    d, rs, nfout, res = cellen(p, pop)
    gem, ster, mat = rij(res, 'gemiddeld'), rij(res, 'sterk') or rij(res, 'sterk_oud'), rij(res, 'matig')
    # drie helden = in de volgorde van de kop; minder = met de heldnaam erbij
    f3 =lambda dd: (' / '.join(f"{dd[h]['winst']:.0f}" for h in dd) if len(dd) == 3 else ' / '.join(f"{HELD[h]} {dd[h]['winst']:.0f}" for h in dd)) or '-'
    spr = (max(s['winst'] for s in gem.values()) - min(s['winst'] for s in gem.values())) if len(gem) > 1 else None
    meds = [s['med'] for s in gem.values()]
    bron = [s for k, s in res.items() if k[1] in ('gemiddeld', 'sterk', 'sterk_oud') and k[2] == 0.62]
    mins = [min((s['rb'][bd] for s in bron if s['rb'][bd] is not None), default=None) for bd in (1, 2, 3, 4)]
    fact = [s['fact'] for s in bron]
    print(f"| {d['meta']['label']} | {f3(gem)} | {'-' if spr is None else f'{spr:.0f} pp'} | {f3(ster)} | {f3(mat)} | "
          f"{(k1(min(meds)) + '-' + k1(max(meds))) if meds else '-'} | "
          f"{' / '.join('-' if m is None else k1(m) for m in mins)} | {(f'{min(fact):.0f}-{max(fact):.0f}') if fact else '-'} % |")


def vol(p, pop):
    d, rs, nfout, res = cellen(p, pop)
    m = d['meta']
    print(f"\n**{m['label']}** (`{os.path.basename(p)}`, {m.get('versie')}, seeds {m.get('seedbase', '?')}-{int(m.get('seedbase', 0)) + int(m['seeds']) - 1},"
          f" {len(rs)} gevechten{' (populatie)' if pop else ''}, fouten {nfout}, paginafouten {len(m.get('paginafouten') or [])})\n")
    print('| cel | n (seeds) | winst ± 95 % | mediaan | rondes I / II / III / IV | Factuur % | weggeknipt | hof ving | stilstand | IV gew./gehaald | sterfscène |')
    print('|---|---|---|---|---|---|---|---|---|---|---|')
    for k in sorted(res, key=lambda k: (ORDE.index(k[1]) if k[1] in ORDE else 9, k[2], list(HELD).index(k[0]))):
        s = res[k]
        rb = ' / '.join('-' if s['rb'][bd] is None else k1(s['rb'][bd]) for bd in (1, 2, 3, 4))
        sterf = ' '.join(f"{SCENE[b]}:{c}" for b, c in sorted(s['sterf'].items(), key=lambda x: (x[0] is None, x[0])) if isinstance(b, int) and 0 < b <= 4)
        naam = f"{HELD[k[0]]} {k[1]}{'' if k[2] == 0.62 else ' @' + str(int(round(k[2] * 100)))}"
        print(f"| {naam} | {s['n']} ({s['s']}) | **{s['winst']:.0f} %** ± {s['marge']:.0f} | {k1(s['med'])} | {rb} | {s['fact']:.0f} | {s['weg']:.0f} | {s['spill']:.0f} | {k1(s['stil'])} | {s['ivw'][0]}/{s['ivw'][1]} | {sterf} |")
    gem, ster, mat = rij(res, 'gemiddeld'), rij(res, 'sterk'), rij(res, 'matig')
    ok = lambda b: 'ok' if b else '**nee**'
    print('\nDoelen (solo, verse seeds):\n')
    if gem:
        print(f"- gemiddeld {DOEL['gem'][0]}-{DOEL['gem'][1]} % per held: " + ' / '.join(f"{HELD[h]} {s['winst']:.0f} {ok(DOEL['gem'][0] <= s['winst'] <= DOEL['gem'][1])}" for h, s in gem.items()))
        if len(gem) > 1:
            spr = max(s['winst'] for s in gem.values()) - min(s['winst'] for s in gem.values())
            print(f"- spreiding gemiddeld ≤ {DOEL['spr']} pp (streef {DOEL['spr_streef']}): {spr:.0f} pp {ok(spr <= DOEL['spr'])}")
    if ster:
        print(f"- sterk ≤ {DOEL['sterk']} %: " + ' / '.join(f"{HELD[h]} {s['winst']:.0f} {ok(s['winst'] <= DOEL['sterk'])}" for h, s in ster.items()))
    if ster and gem:
        print(f"- sterk ≥ gemiddeld + {DOEL['sterk_boven']} pp: " + ' / '.join(f"{HELD[h]} {ster[h]['winst'] - gem[h]['winst']:+.0f} {ok(ster[h]['winst'] - gem[h]['winst'] >= DOEL['sterk_boven'])}" for h in HELD if h in ster and h in gem))
    if mat:
        print(f"- matig {DOEL['matig'][0]}-{DOEL['matig'][1]} %: " + ' / '.join(f"{HELD[h]} {s['winst']:.0f} {ok(s['winst'] <= DOEL['matig'][1])}" for h, s in mat.items()))
    if gem:
        print(f"- mediaan {DOEL['med'][0]}-{DOEL['med'][1]} rondes (gemiddeld): " + ' / '.join(f"{HELD[h]} {k1(s['med'])} {ok(DOEL['med'][0] <= s['med'] <= DOEL['med'][1])}" for h, s in gem.items()))
    bron = [s for k, s in res.items() if k[1] in ('gemiddeld', 'sterk') and k[2] == 0.62]
    if bron:
        mins = {bd: min((s['rb'][bd] for s in bron if s['rb'][bd] is not None), default=None) for bd in (1, 2, 3, 4)}
        print(f"- elke scène ≥ {DOEL['scene']} rondes (minimum over gemiddeld + sterk): " + ' / '.join(f"{SCENE[bd]} {'-' if mins[bd] is None else k1(mins[bd])} {ok(mins[bd] is None or mins[bd] >= DOEL['scene'])}" for bd in (1, 2, 3, 4)))
        fmax = max(s['fact'] for s in bron)
        print(f"- Factuur ≤ {DOEL['fact']} % van de binnengekregen schade (maximum over gemiddeld + sterk): {fmax:.0f} % {ok(fmax <= DOEL['fact'])}")


if __name__ == '__main__':
    pop = '--pop' in sys.argv
    paden = [a for a in sys.argv[1:] if not a.startswith('--')]
    if '--kort' in sys.argv:
        print('| meting | gemiddeld Sla / Gif / Kol | spreiding | sterk | matig | mediaan (gem) | min. rondes I / II / III / IV | Factuur |')
        print('|---|---|---|---|---|---|---|---|')
        for p in paden:
            kort(p, pop)
    else:
        for p in paden:
            vol(p, pop)
