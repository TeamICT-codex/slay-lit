# -*- coding: utf-8 -*-
"""DE WINSTWINST VAN EEN RELIKWIE (relikwie-balans, 28 sep 2026), gepaard.

Leest de uitvoer van dick_meting.js (de finale; veld rv) en/of erfprins_meting.js (de Erfprins; veld
variant) met relikwie-varianten (MEET_RELIEK_VAR, zie reliek_meet.js) en zet elke variant tegenover
'basis' op DEZELFDE (baas, held, sterkte, beleid, aankomst-HP, seed). Foute jobs vallen weg (en worden
geteld).

  python tools/baas-meting/reliek_winst.py <uitvoer.json> [<nog.json> ...] [--variant naam] [--boot 2000]

Meerdere bestanden = gepoold (bv. twee verse seedblokken); dezelfde seed in twee blokken is een fout.
Per variant en per (sterkte, beleid):
  - per held: n paren, winst basis -> variant, de winstwinst in pp met een 95 %-marge op de gepaarde
    verschillen, en de omslagen (+ gered = basis verloor, variant won; - = omgekeerd);
  - gemiddeld over de helden (elke held even zwaar), met een 95 %-interval uit een bootstrap over de
    seeds (de seed is de eenheid die helden en beleidsregels delen);
  - mediaan rondes en gemiddeld HP-verlies (hpStart - hpOver, alle gevechten) basis -> variant;
  - de telling van het relikwie per gevecht (rt): Blok geleverd / ving (vingMin-vingMax) per relikwie,
    extra Energie, extra kaarten, Gif van de Inktpot, de Carbon-afdruk (treffers, terug, kaats);
  - DE LENGTE: de winstwinst apart voor korte, middellange en lange gevechten (op de rondes van het
    BASISgevecht: <= 7, 8-11, >= 12).
Onderaan één regel per variant: de winstwinst gepoold over alles wat gemeten is (per sterkte)."""
import json, math, random, statistics, sys
from collections import defaultdict

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

HELD = {'slachter': 'Sla', 'gifmagier': 'Gif', 'thoverk': 'Kol'}
BAAS = {'de_dicktator': 'de finale', 'de_erfprins': 'de Erfprins', 'slijmkoning': 'de Slijmkoning'}


def args():
    bestanden, variant, boot = [], None, 2000
    a = sys.argv[1:]
    i = 0
    while i < len(a):
        if a[i] == '--variant':
            variant = a[i + 1]; i += 2; continue
        if a[i] == '--boot':
            boot = int(a[i + 1]); i += 2; continue
        bestanden.append(a[i]); i += 1
    if not bestanden:
        sys.exit(__doc__)
    return bestanden, variant, boot


def laad(bestanden):
    rs, fout = [], 0
    for p in bestanden:
        with open(p, encoding='utf-8') as f:
            d = json.load(f)
        for r in d['resultaten']:
            if r.get('fout'):
                fout += 1
                continue
            r = dict(r)
            r['_v'] = r.get('rv') or r.get('variant') or 'basis'
            r['_baas'] = r.get('baas') or 'de_erfprins'
            r['_bron'] = p
            rs.append(r)
    return rs, fout


def cel(r):
    return (r['_baas'], r['st'], r['beleid'], round(float(r.get('hpPct') or 0), 2), r.get('pv') or 'basis', float(r.get('dmgx') or 1))


def pct(a, n):
    return 100.0 * a / n if n else 0.0


def fmt(x, d=0):
    return ('%.' + str(d) + 'f') % x


def marge_gepaard(ds):
    """95 %-marge in pp op het gemiddelde van gepaarde verschillen (-1/0/+1)"""
    n = len(ds)
    if n < 2:
        return float('nan')
    sd = statistics.pstdev(ds)
    return 196.0 * sd / math.sqrt(n)


def main():
    bestanden, alleen, boot = args()
    rs, nfout = laad(bestanden)
    basis = {}
    dubbel = 0
    for r in rs:
        if r['_v'] == 'basis':
            k = cel(r) + (r['held'], r['seed'])
            if k in basis:
                dubbel += 1
            basis[k] = r
    varianten = [v for v in dict.fromkeys(r['_v'] for r in rs) if v != 'basis' and (not alleen or v == alleen)]
    print(f"# De winstwinst per relikwie-variant (gepaard op dezelfde seed)\n")
    print(f"bronnen: {', '.join(bestanden)} · {len(rs)} gevechten · {nfout} foute jobs weggelaten" + (f" · LET OP: {dubbel} dubbele basis-seeds" if dubbel else ''))
    samenvatting = []
    random.seed(20260928)
    for v in varianten:
        paren = defaultdict(list)   # (baas, st, beleid, hp, pv, dmgx) -> [(held, seed, basis, variant)]
        for r in rs:
            if r['_v'] != v:
                continue
            b = basis.get(cel(r) + (r['held'], r['seed']))
            if b is None:
                continue
            paren[cel(r)].append((r['held'], r['seed'], b, r))
        if not paren:
            print(f"\n## {v}: geen paren met 'basis' gevonden\n")
            continue
        print(f"\n## variant `{v}`\n")
        print('| baas · sterkte · beleid | held | n | winst basis → variant | winstwinst ± 95 % | omslag +/− | rondes med. | HP-verlies gem. | relikwie per gevecht |')
        print('|---|---|---|---|---|---|---|---|---|')
        per_st = defaultdict(list)   # (baas, st) -> [(held, seed, beleid, d)]
        lengte = defaultdict(lambda: defaultdict(list))   # (baas, st) -> bucket -> d
        for c in sorted(paren, key=lambda c: (c[0], c[1], c[2], c[3])):
            baas, st, beleid, hp, pv, dmgx = c
            per_held = defaultdict(list)
            for held, seed, b, x in paren[c]:
                per_held[held].append((seed, b, x))
            deltas_held = {}
            for held in sorted(per_held, key=lambda h: list(HELD).index(h) if h in HELD else 9):
                lst = per_held[held]
                n = len(lst)
                wb = sum(1 for _, b, _x in lst if b.get('gewonnen'))
                wv = sum(1 for _, _b, x in lst if x.get('gewonnen'))
                ds = [(1 if x.get('gewonnen') else 0) - (1 if b.get('gewonnen') else 0) for _, b, x in lst]
                gered = sum(1 for d in ds if d > 0); verl = sum(1 for d in ds if d < 0)
                dpp = pct(wv, n) - pct(wb, n)
                deltas_held[held] = dpp
                rb = statistics.median([b['rondes'] for _, b, _x in lst]); rv_ = statistics.median([x['rondes'] for _, _b, x in lst])
                hb = statistics.mean([b['hpStart'] - b['hpOver'] for _, b, _x in lst]); hv = statistics.mean([x['hpStart'] - x['hpOver'] for _, _b, x in lst])
                rt = rt_tekst([x.get('rt') for _, _b, x in lst])
                naam = f"{BAAS.get(baas, baas)} · {st}{'' if hp in (0.62, 0.85) else '@' + str(int(hp * 100))}{'' if pv == 'basis' else '#' + pv}{'' if dmgx == 1 else ' x' + str(dmgx)} · {beleid}"
                print(f"| {naam} | {HELD.get(held, held)} | {n} | {fmt(pct(wb, n))} → **{fmt(pct(wv, n))} %** | **{'+' if dpp >= 0 else ''}{fmt(dpp, 1)}** ± {fmt(marge_gepaard(ds), 0)} | +{gered} / −{verl} | {fmt(rb, 1)} → {fmt(rv_, 1)} | {fmt(hb)} → {fmt(hv)} | {rt} |")
                for seed, b, x in lst:
                    d = (1 if x.get('gewonnen') else 0) - (1 if b.get('gewonnen') else 0)
                    per_st[(baas, st)].append((held, seed, beleid, d, b, x))
                    bk = '<= 7' if b['rondes'] <= 7 else ('8-11' if b['rondes'] <= 11 else '>= 12')
                    lengte[(baas, st)][bk].append(d)
            if deltas_held:
                gem = statistics.mean(deltas_held.values())
                print(f"| {BAAS.get(baas, baas)} · {st} · {beleid} | **alle helden** | | | **{'+' if gem >= 0 else ''}{fmt(gem, 1)}** | | | | |")
        # gepoold per sterkte: gemiddelde over helden van het gemiddelde over beleid; bootstrap over seeds
        for (baas, st), lst in sorted(per_st.items()):
            est, lo, hi = pool_boot(lst, boot)
            wb = pct(sum(1 for t in lst if t[4].get('gewonnen')), len(lst)); wv = pct(sum(1 for t in lst if t[5].get('gewonnen')), len(lst))
            lg = lengte[(baas, st)]
            lt = ' · '.join(f"{k}: {'+' if statistics.mean(lg[k]) >= 0 else ''}{fmt(100 * statistics.mean(lg[k]), 0)} pp (n {len(lg[k])})" for k in ('<= 7', '8-11', '>= 12') if lg.get(k))
            samenvatting.append(f"| `{v}` | {BAAS.get(baas, baas)} · {st} | {len(lst)} | {fmt(wb)} → {fmt(wv)} % | **{'+' if est >= 0 else ''}{fmt(est, 1)}** [{fmt(lo, 1)}, {fmt(hi, 1)}] | {lt} |")
    if samenvatting:
        print('\n## Samenvatting: winstwinst gepoold (gemiddelde over helden en beleid; 95 %-interval = bootstrap over de seeds)\n')
        print('| variant | baas · sterkte | paren | winst basis → variant | winstwinst pp [95 %] | per lengte van het basisgevecht (rondes) |')
        print('|---|---|---|---|---|---|')
        for s in samenvatting:
            print(s)


def pool_boot(lst, boot):
    """lst = [(held, seed, beleid, d, b, x)]; schatting = gemiddelde over helden van het gemiddelde over (beleid, seed);
    95 %-interval uit een bootstrap over de seeds"""
    seeds = sorted(set(t[1] for t in lst))
    per_seed = defaultdict(list)
    for t in lst:
        per_seed[t[1]].append(t)

    def schat(seedlijst):
        acc = defaultdict(list)
        for s in seedlijst:
            for held, _seed, _bel, d, _b, _x in per_seed[s]:
                acc[held].append(d)
        if not acc:
            return 0.0
        return 100.0 * statistics.mean(statistics.mean(v) for v in acc.values())

    est = schat(seeds)
    if boot <= 0 or len(seeds) < 5:
        return est, float('nan'), float('nan')
    xs = sorted(schat([random.choice(seeds) for _ in seeds]) for _ in range(boot))
    return est, xs[int(0.025 * boot)], xs[int(0.975 * boot) - 1]


def rt_tekst(rts):
    rts = [r for r in rts if r]
    if not rts:
        return '-'
    n = len(rts)
    delen = []
    ids = sorted(set(k for r in rts for k in (r.get('blok') or {})))
    for i in ids:
        g = sum((r.get('blok') or {}).get(i, {}).get('geleverd', 0) for r in rts) / n
        v = sum((r.get('blok') or {}).get(i, {}).get('ving', 0) for r in rts) / n
        vmin = sum((r.get('blok') or {}).get(i, {}).get('vingMin', 0) for r in rts) / n
        vmax = sum((r.get('blok') or {}).get(i, {}).get('vingMax', 0) for r in rts) / n
        delen.append(f"{i}: Blok {fmt(g)}, ving {fmt(v)} ({fmt(vmin)}-{fmt(vmax)})")
    en = defaultdict(float)
    for r in rts:
        for k, x in (r.get('energie') or {}).items():
            en[k] += x
    for k, x in en.items():
        delen.append(f"{k}: +{fmt(x / n, 1)} E")
    tr = sum(r.get('trek') or 0 for r in rts) / n
    if tr:
        delen.append(f"kaarten {'+' if tr > 0 else ''}{fmt(tr, 1)}")
    ik = sum(r.get('inkt') or 0 for r in rts) / n
    if ik:
        delen.append(f"inkt-Gif {fmt(ik, 1)}")
    cb = [r.get('carbon') or {} for r in rts]
    if any(c.get('treffers') for c in cb):
        delen.append(f"carbon: {fmt(sum(c.get('treffers', 0) for c in cb) / n, 1)} treffers, terug {fmt(sum(c.get('terug', 0) for c in cb) / n)}, kaats {fmt(sum(c.get('doornKaats', 0) for c in cb) / n)}, Doornen {fmt(sum(c.get('doornen', 0) for c in cb) / n, 1)}")
    delen.append(f"beurten {fmt(sum(r.get('beurten') or 0 for r in rts) / n, 1)}")
    return '; '.join(delen)


if __name__ == '__main__':
    main()
