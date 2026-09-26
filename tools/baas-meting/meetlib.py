# -*- coding: utf-8 -*-
"""Gedeelde hulp voor de analyse van de uitvoer van dick_meting.js (Finale B4 stap 1).

Elke analyse leest standaard alleen de BASISBUILDS op druk x1 (geen populatievariant, geen
breekpuntzwaai) en laat foute jobs weg, maar telt ze wel. --pop neemt de populatie mee
(de basis en haar buren samen, elk op dezelfde seeds).
De effectieve n is het aantal SEEDS, niet het aantal gevechten: de twee beleidsregels (en de
populatievarianten) delen per seed de schudding (afwerkplan §3, 'ruis')."""
import json, math, sys

# de tabellen dragen ± − · en accenten: altijd UTF-8 naar stdout (ook op een Windows-console of in een pijp)
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

HELD = {'slachter': 'Sla', 'gifmagier': 'Gif', 'thoverk': 'Kol'}
ST = ['sterk', 'sterk_oud', 'gemiddeld', 'matig']
SCENE = ['', 'I', 'II', 'III', 'IV']


def laad(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def is_basis(r):
    return (r.get('pv') or 'basis') == 'basis' and abs(float(r.get('dmgx') or 1) - 1.0) < 1e-9


def dick_rs(d, pop=False, fouten=False):
    """de DICKtator-gevechten; standaard alleen de basis op x1 en zonder foute jobs"""
    rs = [r for r in d['resultaten'] if r.get('baas') == 'de_dicktator']
    if not pop:
        rs = [r for r in rs if is_basis(r)]
    else:
        rs = [r for r in rs if abs(float(r.get('dmgx') or 1) - 1.0) < 1e-9]
    if not fouten:
        rs = [r for r in rs if not r.get('fout')]
    return rs


def tag(hp):
    return '' if hp in (None, 0.62) else '@' + str(int(round(hp * 100)))


def seeds(v):
    return len(set(r.get('seed') for r in v))


def marge(p, n):
    """95 %-marge (in pp) van een winstkans p (0-100) op n effectieve waarnemingen (seeds)"""
    if not n:
        return 0.0
    q = p / 100.0
    return 196.0 * math.sqrt(max(q * (1 - q), 0.25 / n) / n)


def binnen_zonder_zelf(r):
    return sum(x for b, x in (r.get('bron') or {}).items() if not b.startswith('zelf'))


def factuur(r):
    return sum(x for b, x in (r.get('bron') or {}).items() if 'actuur' in b or 'nvordering' in b)


def stilstand(r):
    """rondes waarin de baas geen HP verliest (hij leeft nog)"""
    log = r.get('log') or []
    s = 0
    for i in range(1, len(log)):
        a, b = log[i - 1].get('bossHp'), log[i].get('bossHp')
        if a is not None and b is not None and b >= a and b > 0:
            s += 1
    return s
