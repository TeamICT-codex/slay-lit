# -*- coding: utf-8 -*-
"""De samenvatting van de RUN-WALKER (tools/baas-meting/aankomst.js, 30 sep 2026).

Leest een of meer uitvoerbestanden van aankomst.js (samen = gepoold) en drukt:
  1. per held: runs, aangekomen (ECHT = zonder redding en zonder afgedwongen gevecht, en MET REDDING
     apart), dood (waar en waarom), fouten, reddingen (MEET_REDDING), afgedwongen gevechten;
  2. per held en per GROEP (strikt / met redding): relikwieen p10/p50/p90, dekgrootte, upgrades,
     vloeken, vonk-brandmerken, HP-% en max-HP bij aankomst, goud over, fakkel, dranken, rondes per
     gevecht, bezochte kamers;
  3. de bron van de relikwieen (start/schrijn/schat/elite/episch/winkel/event/baas/anders), per groep;
  4. een relikwie-frequentietabel: welke relikwieen komen het vaakst aan (in % van de aangekomen
     runs, per held en totaal), met het defensieve merkteken van dick_meting.js (DEF_RELIKWIEEN).

HERSTEL 30 sep: een run die alleen met MEET_REDDING aankwam, was in het echt dood; zijn HP bij
aankomst is geen speler-HP. De geredde aankomsten staan daarom altijd APART van de strikte, nooit
samengeteld (bevinding 'reddingsruns tellen als aankomst'). Een oud bestand zonder aangekomenEcht:
gered > 0 of afgedwongen = met redding.

Gebruik: python tools/baas-meting/aankomst_analyse.py <uit.json> [<uit2.json> ...] [--top 40] [--alle]
  --alle   neemt ook de niet-aangekomen runs mee in blok 2-4 (hun staat bij de dood), als derde groep"""
import json, sys, math
from collections import Counter, defaultdict

# de tabellen dragen accenten en tekens: altijd UTF-8 naar stdout (ook op een Windows-console of in een pijp)
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

HELD = {'slachter': 'Slachter', 'gifmagier': 'Gifmagiër', 'thoverk': 'Kolendruïde'}
# zelfde lijst als DEF_RELIKWIEEN in dick_meting.js (defensief = verkleint de schade of geeft HP/Blok in het gevecht)
DEF = {'mosamulet', 'anker', 'warme_mantel', 'martelaarskroon', 'dossierklem', 'indexkaart', 'was_zegel', 'hartsteen',
       'carbon_afdruk', 'feniksveer', 'verlopen_contract', 'houten_been'}
BRONNEN = ['start', 'schrijn', 'schat', 'elite', 'episch', 'winkel', 'event', 'baas', 'anders']


def pct(xs, p):
    if not xs:
        return None
    s = sorted(xs)
    k = max(0, min(len(s) - 1, math.ceil(p / 100 * len(s)) - 1))
    return s[k]


def gem(xs):
    return sum(xs) / len(xs) if xs else None


def f1(x):
    return '-' if x is None else f'{x:.1f}'


def gered(r):
    """kwam deze run alleen aan dankzij MEET_REDDING (of een afgedwongen gevecht)?"""
    if r.get('aangekomenEcht') is not None:
        return bool(r.get('aangekomen')) and not r['aangekomenEcht']
    return (r.get('gered') or 0) > 0 or bool(r.get('afgedwongen'))


def laad(paden):
    runs, metas = [], []
    for p in paden:
        with open(p, encoding='utf-8') as f:
            d = json.load(f)
        metas.append(d.get('meta', {}))
        runs.extend(d.get('runs', []))
    return metas, runs


def blok_staat(helden, runs, sel):
    for h in helden:
        rs = [r for r in runs if r['held'] == h and sel(r)]
        if not rs:
            print(f"{HELD.get(h, h)}: geen runs"); continue
        rel = [len(r['relikwieen']) for r in rs]
        rel_run = [len([x for x in r['relikwieen'] if r.get('relBron', {}).get(x) not in ('start', 'schrijn')]) for r in rs]
        dfn = [len([x for x in r['relikwieen'] if x in DEF]) for r in rs]
        print(f"{HELD.get(h, h)} (n {len(rs)}):")
        print(f"   relikwieën p10/p50/p90 {pct(rel, 10)}/{pct(rel, 50)}/{pct(rel, 90)} (gem {f1(gem(rel))}; onderweg gevonden {pct(rel_run, 10)}/{pct(rel_run, 50)}/{pct(rel_run, 90)};"
              f" defensief gem {f1(gem(dfn))})")
        vonk = [r.get('vonkN', len([c for c in r.get('dek', []) if isinstance(c, list) and len(c) > 2 and c[2]])) for r in rs]
        print(f"   dek {f1(gem([r['dekN'] for r in rs]))} (p10/p90 {pct([r['dekN'] for r in rs], 10)}/{pct([r['dekN'] for r in rs], 90)}) · upgrades {f1(gem([r['upgrades'] for r in rs]))}"
              f" · vloeken {f1(gem([r['vloeken'] for r in rs]))} · vonk {f1(gem(vonk))} · dranken {f1(gem([len(r.get('dranken', [])) for r in rs]))}")
        print(f"   hp {f1(100 * gem([r['hpPct'] for r in rs]))} % (p10 {f1(100 * pct([r['hpPct'] for r in rs], 10))} %) · max-HP {f1(gem([r['maxHp'] for r in rs]))}"
              f" · goud over {f1(gem([r['goud'] for r in rs]))} · goud uitgegeven {f1(gem([r.get('goudUit', 0) for r in rs]))} · fakkel {f1(gem([r['fakkel'] for r in rs]))}"
              f" (licht: {', '.join(f'{k} {v}' for k, v in Counter(r.get('licht', '?') for r in rs).most_common())})")
        g = sum(r['gevechten']['n'] for r in rs); rt = sum(r['gevechten']['rondesTotaal'] for r in rs)
        kam = Counter()
        for r in rs:
            for a, b in (r.get('bezocht') or {}).items():
                for k, v in b.items():
                    kam[k] += v
        print(f"   gevechten gem {f1(g / len(rs))} · rondes per gevecht {f1(rt / g if g else None)} · kamers per run: "
              + ' '.join(f"{k} {f1(kam[k] / len(rs))}" for k in ['gevecht', 'elite', 'episch', 'rust', 'winkel', 'schat', 'event']))
        rk = Counter(); gk = Counter()
        for r in rs:
            rk.update(r.get('rustKeuzes') or {}); gk.update(r.get('gekocht') or {})
        print(f"   rust: " + ' '.join(f"{k} {f1(rk[k] / len(rs))}" for k in ['genees', 'smeed', 'pook'])
              + ' · gekocht: ' + ' '.join(f"{k} {f1(gk[k] / len(rs))}" for k in ['relikwieen', 'kaarten', 'dranken', 'verwijderingen', 'olie'])
              + f" · kaarten genomen {f1(gem([r.get('kaartenGenomen', 0) for r in rs]))} / geweigerd {f1(gem([r.get('kaartenGeweigerd', 0) for r in rs]))}")


def blok_bron(helden, runs, sel):
    print('held         ' + ' '.join(f'{b:>7}' for b in BRONNEN))
    for h in helden:
        rs = [r for r in runs if r['held'] == h and sel(r)]
        if not rs:
            continue
        c = Counter()
        for r in rs:
            c.update((r.get('relBron') or {}).values())
        print(f"{HELD.get(h, h):<12} " + ' '.join(f'{c[b] / len(rs):>7.2f}' for b in BRONNEN))


def blok_freq(helden, runs, sel, top):
    rs_all = [r for r in runs if sel(r)]
    if not rs_all:
        print('geen runs'); return
    tot = Counter(); per = defaultdict(Counter); bron = defaultdict(Counter)
    for r in rs_all:
        for x in set(r['relikwieen']):
            tot[x] += 1; per[r['held']][x] += 1
            bron[x][(r.get('relBron') or {}).get(x, '?')] += 1
    nh = {h: len([r for r in rs_all if r['held'] == h]) for h in helden}
    print(f"{'relikwie':<26}{'tot':>6} " + ' '.join(f'{HELD.get(h, h)[:9]:>9}' for h in helden) + '  bron')
    for x, n in tot.most_common(top):
        br = ', '.join(f'{k} {v}' for k, v in bron[x].most_common(3))
        print(f"{x + (' *' if x in DEF else ''):<26}{100 * n / len(rs_all):>5.0f}% "
              + ' '.join(f"{(100 * per[h][x] / nh[h]) if nh[h] else 0:>8.0f}%" for h in helden) + f'  {br}')


def main():
    args = sys.argv[1:]
    top = 40
    if '--top' in args:
        i = args.index('--top'); top = int(args[i + 1]); del args[i:i + 2]
    alle = '--alle' in args
    args = [a for a in args if a != '--alle']
    if not args:
        print(__doc__); sys.exit(1)
    metas, runs = laad(args)
    for m in metas:
        print(f"# {m.get('label')} · {m.get('versie')} · N {m.get('N')} · helden {'/'.join(m.get('helden', []))} · profiel {m.get('profiel', 'vers (oud bestand)')} · pad {m.get('pad')}"
              f" · drank {m.get('drank', '?')} · winkel {m.get('winkel')} · event {m.get('event')} · vervloekt {'nemen' if m.get('vervloekt') else 'laten'}"
              f" · schrijn {'+'.join(m.get('schrijn') or []) or '-'} · tafel {m.get('tafel')} · pook {m.get('pook', 0)} · olie {m.get('olie', 0)}"
              f" · redding {m.get('redding', 0) or 'uit'} · {'SOLO' if m.get('solo', True) else 'MET METGEZEL'} · {m.get('duurS', '?')} s")
        if m.get('paginafouten'):
            print(f"  paginafouten: {len(m['paginafouten'])} verschillende, bv. {m['paginafouten'][0]}")
    helden = [h for h in HELD if any(r['held'] == h for r in runs)] + sorted({r['held'] for r in runs} - set(HELD))

    print('\n## 1. uitkomst per held')
    for h in helden:
        rs = [r for r in runs if r['held'] == h]
        aan = [r for r in rs if r.get('aangekomen')]
        echt = [r for r in aan if not gered(r)]
        dd = [r for r in rs if r.get('dood')]
        ft = [r for r in rs if r.get('fout')]
        waar = Counter()
        for r in dd:
            x = r['dood']
            k = f"A{x.get('act')} {x.get('type')}" + ('' if x.get('type') == 'baas' else f" r{x.get('rij')}")
            if x.get('reden'):
                k += f" ({x['reden']})"
            waar[k] += 1
        gr = [r.get('gered', 0) for r in rs]
        afg = sum(len(r.get('afgedwongen') or []) for r in rs)
        print(f"{HELD.get(h, h)}: {len(rs)} runs · ECHT aangekomen {len(echt)} ({100 * len(echt) / len(rs):.0f} %)"
              f" · met redding aangekomen {len(aan) - len(echt)} · dood {len(dd)} · fout {len(ft)}"
              + (f" · reddingen gem {f1(gem(gr))} (max {max(gr)})" if any(gr) else '')
              + (f" · afgedwongen gevechten {afg}" if afg else ''))
        if waar:
            print('   dood: ' + ', '.join(f'{k} x{v}' for k, v in waar.most_common()))
        for r in ft[:5]:
            print(f"   FOUT {r['seed']}: {str(r['fout']).splitlines()[0][:160]}")

    groepen = [('STRIKT (echte aankomst, zonder redding)', lambda r: bool(r.get('aangekomen')) and not gered(r)),
               ('MET REDDING (in het echt dood: buitstroom, geen speler-HP)', lambda r: bool(r.get('aangekomen')) and gered(r))]
    if alle:
        groepen.append(('NIET AANGEKOMEN (de staat bij de dood of de fout)', lambda r: not r.get('aangekomen')))
    for naam, sel in groepen:
        if not any(sel(r) for r in runs):
            print(f"\n######## {naam}: geen runs")
            continue
        print(f"\n######## {naam}")
        print('\n## 2. de staat bij aankomst')
        blok_staat(helden, runs, sel)
        print('\n## 3. de bron van de relikwieën (gemiddeld per run)')
        blok_bron(helden, runs, sel)
        print(f'\n## 4. welke relikwieën komen aan (% van de runs; * = defensief; top {top})')
        blok_freq(helden, runs, sel, top)


if __name__ == '__main__':
    main()
