# -*- coding: utf-8 -*-
"""Maak DE IJKSET: de echte aankomstbuilds (alleen aangekomenEcht) uit de walkerruns, compact, met unieke seeds.
   python ijkset.py <uit.json> <bron.json> [<bron.json> ...]"""
import json, sys, io

uit = sys.argv[1]
runs, bronnen = [], []
HOUD = ['held', 'profiel', 'pad', 'schrijn', 'aangekomen', 'aangekomenEcht', 'act', 'hp', 'maxHp', 'hpPct', 'goud', 'fakkel', 'licht',
        'relikwieen', 'relBron', 'dek', 'dekN', 'upgrades', 'vloeken', 'vonkN', 'gesmeed', 'dranken', 'gered', 'afgedwongen', 'schade',
        'bezocht', 'rustKeuzes', 'gekocht', 'gevechten', 'goudUit', 'kaartenGenomen', 'kaartenGeweigerd', 'verdieping']
for f in sys.argv[2:]:
    d = json.load(io.open(f, encoding='utf-8'))
    m = d['meta']
    sch = m.get('schade', 1)
    n = 0
    for r in d['runs']:
        if not r.get('aangekomenEcht'):
            continue
        c = {k: r[k] for k in HOUD if k in r}
        c['seed'] = r['seed'] + '-S' + str(int(round(100 * sch)))   # uniek over de bronnen (zelfde seeds, andere vaardigheidsfactor)
        c['bronSeed'] = r['seed']
        runs.append(c); n += 1
    bronnen.append({'label': m.get('label'), 'versie': m.get('versie'), 'N': m.get('N'), 'seeds': m.get('seeds'), 'schade': sch,
                    'profiel': m.get('profiel'), 'pad': m.get('pad'), 'event': m.get('event'), 'vervloekt': m.get('vervloekt'),
                    'winkel': m.get('winkel'), 'runs': len(d['runs']), 'aangekomenEcht': n})
runs.sort(key=lambda r: (r['held'], r['seed']))
m0 = json.load(io.open(sys.argv[2], encoding='utf-8'))['meta']
meta = {k: m0[k] for k in ('helden', 'profiel', 'pad', 'schrijn', 'vervloekt', 'winkel', 'event', 'tafel', 'pook', 'olie', 'drank', 'botAlgemeen', 'botRace', 'solo') if k in m0}
meta.update({'label': 'ijkset', 'versie': bronnen[0]['versie'], 'schade': sorted({b['schade'] for b in bronnen}), 'wat': 'de echte aankomstbuilds aan de DICKtator (tools/baas-meting/aankomst.js, strikt: geen redding; '
        'vaardigheidsknop MEET_SCHADE onderweg, nooit in de finale)', 'redding': 0, 'bronnen': bronnen, 'N': len(runs)})
io.open(uit, 'w', encoding='utf-8', newline='\n').write(json.dumps({'meta': meta, 'runs': runs}, ensure_ascii=False, separators=(',', ':')))
per = {}
for r in runs:
    per.setdefault(r['held'], []).append(len(r['relikwieen']))
print('ijkset:', len(runs), 'builds ->', uit)
for h, v in per.items():
    v.sort(); print(' ', h, len(v), 'relikwieen p10/p50/p90', v[len(v) // 10], v[len(v) // 2], v[(9 * len(v)) // 10])
