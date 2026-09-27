# -*- coding: utf-8 -*-
"""De doeltabel van de finale: ALLE doelen in één tabel (E les 7), per meting.

Gebruik: python tools/baas-meting/doeltabel.py <uit.json> [<uit2.json> ...] [--pop] [--kort]
  --pop   de populatie per cel (basis + buren, gepoold) in plaats van alleen de basisbuild
  --kort  één regel per bestand
Per cel (held x sterkte x aankomst-HP, beide beleidsregels samen): n, seeds, winst ± 95 %-marge
(op het aantal seeds), mediaan rondes, rondes per voltooide scène, Factuur-aandeel van de
binnengekregen schade, weggeknipte schade (slot + vloer + plafond), wat het hof ving, stilstand,
IV gewonnen/gehaald en de sterfscène. Daaronder de doelen (afwerkplan §1, B1-B3)."""
import sys, os, statistics as st
from collections import defaultdict, Counter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from meetlib import HELD, ST, SCENE, laad, dick_rs, tag, seeds, marge, binnen_zonder_zelf, factuur, stilstand

# Architectbeslissingen B4a (27 sep 2026): 'sterk <= 80 %' vervalt; sterk (norm) wint per held
# MINSTENS sterk_boven pp meer dan gemiddeld EN HOOGSTENS sterk %. Gemiddeld = de gemiddeld-norm
# (MEET_GEMNORM=1) - de tabel toont wat de meting bevat.
DOEL = dict(gem=(40, 55), spr=20, spr_streef=15, sterk=90, sterk_boven=15, matig=(0, 10), med=(11, 14), scene=2, fact=45)


def cel_stats(v):
    n = len(v)
    w = sum(1 for r in v if r.get('gewonnen'))
    tel = defaultdict(list)
    for r in v:
        c = Counter(e['bd'] for e in r.get('log', []))
        eb = r.get('eindBedrijf') or 0
        for bd in (1, 2, 3, 4):
            if eb > bd or (eb == bd and r.get('gewonnen')):
                tel[bd].append(c.get(bd, 0))   # alleen VOLTOOIDE scènes
    tot = sum(binnen_zonder_zelf(r) for r in v) or 1
    fact = sum(factuur(r) for r in v)
    iv = [r for r in v if r.get('haaldeIV')]
    winst = 100.0 * w / n if n else 0
    return dict(
        n=n, s=seeds(v), winst=winst, marge=marge(winst, seeds(v)),
        med=st.median([r['rondes'] for r in v]) if v else 0,
        rb={bd: (st.mean(tel[bd]) if tel[bd] else None) for bd in (1, 2, 3, 4)},
        fact=100.0 * fact / tot,
        weg=st.mean(r.get('slotWeg', 0) for r in v) if v else 0,
        cap=st.mean(r.get('capWeg', 0) for r in v) if v else 0,
        spill=st.mean(r.get('spill', 0) for r in v) if v else 0,
        stil=st.mean(stilstand(r) for r in v) if v else 0,
        ivw=(sum(1 for r in iv if r.get('gewonnen')), len(iv)),
        sterf=Counter(r.get('sterfBedrijf') for r in v if r.get('dood')),
        tijd=sum(1 for r in v if r.get('timeout')),
    )


def ok(b):
    return 'ok' if b else 'NEE'


def druk(p, pop=False, kort=False):
    d = laad(p)
    m = d['meta']
    alle = dick_rs(d, pop=pop, fouten=True)
    rs = [r for r in alle if not r.get('fout')]
    nfout = len(alle) - len(rs)
    cel = defaultdict(list)
    for r in rs:
        cel[(r['held'], r['st'], r['hpPct'])].append(r)
    res = {k: cel_stats(v) for k, v in cel.items()}
    mg = Counter(r.get('metgezel') or r.get('gMet') for r in rs)
    solo = all(not k for k in mg)

    def rij(st_, hp=0.62):
        return {h: res[(h, st_, hp)] for h in HELD if (h, st_, hp) in res}
    gem, ster, mat = rij('gemiddeld'), rij('sterk'), rij('matig')
    spr = (max(s['winst'] for s in gem.values()) - min(s['winst'] for s in gem.values())) if len(gem) > 1 else None
    f3 = lambda dd: ' / '.join(f"{HELD[h]} {dd[h]['winst']:.0f}" for h in dd)

    kop = (f"== {m['label']} | {m.get('versie')} | seeds {m.get('seedbase', '?')}+{m['seeds']} | {len(rs)} gevechten"
           f" ({'populatie' if pop else 'basisbuilds'}) | {'SOLO' if solo else 'METGEZEL ' + str(dict(mg))} | fouten {nfout}"
           f" | time-outs {sum(s['tijd'] for s in res.values())} | paginafouten {len(m.get('paginafouten') or [])} | {m.get('duurS')} s")
    if kort:
        meds = [res[k]['med'] for k in res if k[1] == 'gemiddeld' and k[2] == 0.62]
        facts = [res[k]['fact'] for k in res if k[1] in ('gemiddeld', 'sterk') and k[2] == 0.62]
        print(f"{m['label']:28} gem {f3(gem):24} spr {'-' if spr is None else round(spr):>3} | sterk {f3(ster):24} | matig {f3(mat):22}"
              f" | med {min(meds) if meds else '-'}-{max(meds) if meds else '-'} | fact {min(facts) if facts else 0:.0f}-{max(facts) if facts else 0:.0f}%")
        return res
    print(kop)
    print(f"{'cel':24} {'n':>4} {'sd':>3} {'winst':>6} {'±':>3} {'med':>4} {'I':>4} {'II':>4} {'III':>4} {'IV':>4} {'fact%':>5} {'weg':>5} {'cap':>4} {'hof':>4} {'stil':>4} {'IV w/h':>7}  sterfscène")
    for k in sorted(res, key=lambda k: (k[0], ST.index(k[1]) if k[1] in ST else 9, k[2])):
        s = res[k]
        rb = lambda bd: (f"{s['rb'][bd]:.1f}" if s['rb'][bd] is not None else '-')
        sterf = ' '.join(f"{SCENE[b] if isinstance(b, int) and 0 < b <= 4 else b}:{c}" for b, c in sorted(s['sterf'].items(), key=lambda x: (x[0] is None, x[0])))
        print(f"{k[0] + '/' + k[1] + tag(k[2]):24} {s['n']:4} {s['s']:3} {s['winst']:5.0f}% {s['marge']:3.0f} {s['med']:4} {rb(1):>4} {rb(2):>4} {rb(3):>4} {rb(4):>4}"
              f" {s['fact']:5.0f} {s['weg']:5.0f} {s['cap']:4.0f} {s['spill']:4.0f} {s['stil']:4.1f} {s['ivw'][0]:>3}/{s['ivw'][1]:<3}  {sterf}")
    # ---- de doelen ----
    print('   DOELEN (solo, verse seeds):')
    if gem:
        print(f"   - gemiddeld {DOEL['gem'][0]}-{DOEL['gem'][1]} % per held : " + ' / '.join(f"{HELD[h]} {s['winst']:.0f} {ok(DOEL['gem'][0] <= s['winst'] <= DOEL['gem'][1])}" for h, s in gem.items()))
    if spr is not None:
        print(f"   - spreiding gemiddeld <= {DOEL['spr']} pp (streef {DOEL['spr_streef']}) : {spr:.0f} pp {ok(spr <= DOEL['spr'])}{'' if spr <= DOEL['spr_streef'] else ' (boven het streefcijfer)'}")
    if ster:
        print(f"   - sterk <= {DOEL['sterk']} %              : " + ' / '.join(f"{HELD[h]} {s['winst']:.0f} {ok(s['winst'] <= DOEL['sterk'])}" for h, s in ster.items()))
    if ster and gem:
        print(f"   - sterk >= gemiddeld + {DOEL['sterk_boven']} pp      : " + ' / '.join(f"{HELD[h]} {ster[h]['winst'] - gem[h]['winst']:+.0f} {ok(ster[h]['winst'] - gem[h]['winst'] >= DOEL['sterk_boven'])}" for h in HELD if h in ster and h in gem))
    if mat:
        print(f"   - matig {DOEL['matig'][0]}-{DOEL['matig'][1]} %                 : " + ' / '.join(f"{HELD[h]} {s['winst']:.0f} {ok(s['winst'] <= DOEL['matig'][1])}" for h, s in mat.items()))
    if gem:
        print(f"   - mediaan {DOEL['med'][0]}-{DOEL['med'][1]} rondes (gem)   : " + ' / '.join(f"{HELD[h]} {s['med']} {ok(DOEL['med'][0] <= s['med'] <= DOEL['med'][1])}" for h, s in gem.items()))
    bron = [s for k, s in res.items() if k[1] in ('gemiddeld', 'sterk') and k[2] == 0.62]
    if bron:
        mins = {bd: min((s['rb'][bd] for s in bron if s['rb'][bd] is not None), default=None) for bd in (1, 2, 3, 4)}
        print(f"   - elke scène >= {DOEL['scene']} rondes (min over gem+sterk): " + ' / '.join(f"{SCENE[bd]} {'-' if mins[bd] is None else f'{mins[bd]:.1f}'} {ok(mins[bd] is None or mins[bd] >= DOEL['scene'])}" for bd in (1, 2, 3, 4)))
        fmax = max(s['fact'] for s in bron)
        print(f"   - Factuur <= {DOEL['fact']} % van de schade (max over gem+sterk): {fmax:.0f} % {ok(fmax <= DOEL['fact'])}")
    print(f"   - solo (geen metgezel in één gevecht): {ok(solo)} · fouten {nfout} · paginafouten {len(m.get('paginafouten') or [])}")
    return res


if __name__ == '__main__':
    pop = '--pop' in sys.argv
    kort = '--kort' in sys.argv
    for p in [a for a in sys.argv[1:] if not a.startswith('--')]:
        druk(p, pop, kort)
        if not kort:
            print()
