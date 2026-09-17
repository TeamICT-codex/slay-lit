# -*- coding: utf-8 -*-
"""Alfa-scan voor de VOETMARGE-tabel (js/art.js r587).
Meet per plaat de TRANSPARANTE marge onder de laagste geschilderde pixel,
in % van de beeldhoogte - exact wat --voetc wegdrukt.
Draai: python voetmarge_scan.py
"""
import os
import sys
from PIL import Image

WT = r"C:\Users\Thomas Aelbrecht\Desktop\Workspace\SLAY-IT-drama"
MAP = os.path.join(WT, "assets", "karakters")

# dezelfde drempel als een normale alfa-scan: alles boven 10/255 telt als verf
DREMPEL = 10

BASISSEN = {
    "de_dicktator": ["hit", "death", "cast", "attack", "herkozen", "factuur",
                     "block", "decreet", "intro"],
    "de_griffier": ["cast", "death", "hit"],
    "de_deurwaarder": ["attack", "death", "hit"],
    "de_claqueur": ["attack", "death", "hit"],
}


def marge(pad):
    im = Image.open(pad).convert("RGBA")
    b, h = im.size
    a = im.split()[3]
    px = a.load()
    for y in range(h - 1, -1, -1):
        for x in range(b):
            if px[x, y] > DREMPEL:
                return (h - 1 - y) / h * 100.0, b, h
    return None, b, h


def main():
    # controlemeting: de bestaande tabelwaarden die we moeten reproduceren
    print("== ijking (bestaande tabelwaarden) ==")
    for naam, verwacht in (("de_dicktator", 3.0), ("het_klapvee", 3.9), ("slijmkoning", 2.1)):
        p = os.path.join(MAP, naam + ".webp")
        if os.path.exists(p):
            m, b, h = marge(p)
            print("  %-16s gemeten %5.2f%%  tabel %4.1f%%  (%dx%d)" % (naam, m, verwacht, b, h))

    print("\n== scan ==")
    regels = []
    for basis, poses in BASISSEN.items():
        p0 = os.path.join(MAP, basis + ".webp")
        if not os.path.exists(p0):
            print("ONTBREEKT: " + basis)
            continue
        m0, b0, h0 = marge(p0)
        print("%-24s %6.2f%%  (basis, %dx%d)" % (basis, m0, b0, h0))
        for pose in poses:
            naam = basis + "_" + pose
            p = os.path.join(MAP, naam + ".webp")
            if not os.path.exists(p):
                print("   %-21s ONTBREEKT" % pose)
                continue
            m, b, h = marge(p)
            d = m - m0
            vlag = "EIGEN MARGE" if abs(d) >= 1.5 else "-"
            print("   %-21s %6.2f%%  afwijking %+6.2f%%  %s  (%dx%d)"
                  % (pose, m, d, vlag, b, h))
            if abs(d) >= 1.5:
                regels.append((naam, round(m, 1), round(d, 1)))

    print("\n== tabelregels (>= 1,5%% afwijking) ==")
    for naam, m, d in regels:
        print("  %s: %s,   /* %+.1f%% t.o.v. basis */" % (naam, m, d))
    print("\n%d van de gescande poses krijgen een eigen marge." % len(regels))


if __name__ == "__main__":
    sys.exit(main())
