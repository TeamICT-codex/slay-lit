# CONTACTVEL-PLAKKER (v121) - plakt de losse frames van tools/drama_contactvel.js tot drie
# contactvellen: een rij per viewport (laptop 2D boven, mobiel liggend onder), een kolom per
# kernbeat, met tijdstempel en bijschrift boven elk frame.
#
# Leest frames.json uit dezelfde map als waar drama_contactvel.js zijn schoten zette en
# schrijft contactvel_<overgang>.png daarnaast.
#
# DRAAIEN (na drama_contactvel.js, met dezelfde SLAYIT_SHOTS):
#   SLAYIT_SHOTS="$PWD/drama_shots_v121" python ".../SLAY-IT-drama/tools/drama_contactvel_plak.py"
# Zonder SLAYIT_SHOTS valt hij terug op tools/drama_shots. Vereist Pillow.
import json, os
from PIL import Image, ImageDraw, ImageFont

MAP = os.environ.get('SLAYIT_SHOTS') or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'drama_shots')
RONDE = os.environ.get('SLAYIT_RONDE', 'v121')
KOL = 400          # celbreedte
KOP = 46           # hoogte van de tijdstempelbalk boven elk frame
TITEL = 40         # hoogte van de titelbalk boven het hele vel
RIJKOP = 24        # hoogte van het viewport-label per rij
MARGE = 10


def lettertype(px, vet=False):
    for naam in (('segoeuib.ttf', 'arialbd.ttf') if vet else ('segoeui.ttf', 'arial.ttf')):
        try:
            return ImageFont.truetype(naam, px)
        except OSError:
            pass
    return ImageFont.load_default()


F_TITEL = lettertype(24, True)
F_TIJD = lettertype(17, True)
F_BIJ = lettertype(14)
F_RIJ = lettertype(15, True)

with open(os.path.join(MAP, 'frames.json'), encoding='utf-8') as fh:
    data = json.load(fh)

RIJEN = ['laptop', 'liggend']
LABEL = {'laptop': 'LAPTOP 1440x900 (2D)', 'liggend': 'MOBIEL LIGGEND 800x360'}

for ov in data['overgangen']:
    sleutel = ov['sleutel']
    rijen = []
    for vp in RIJEN:
        frames = data['uit'][vp][sleutel]
        beelden = []
        for fr in frames:
            im = Image.open(fr['bestand']).convert('RGB')
            h = round(im.height * KOL / im.width)
            beelden.append((im.resize((KOL, h), Image.LANCZOS), fr))
        rijen.append((vp, beelden))

    n = max(len(b) for _, b in rijen)
    breedte = MARGE + n * (KOL + MARGE)
    hoogte = TITEL + sum(RIJKOP + KOP + b[0][0].height + MARGE for _, b in rijen) + MARGE

    vel = Image.new('RGB', (breedte, hoogte), (14, 12, 18))
    tek = ImageDraw.Draw(vel)
    tek.text((MARGE, 9), 'SLAY IT ' + RONDE + ' · HET PROCES · ' + ov['naam'] + '   (regieblad §2, DICK.tempo = 1, totaal ' + str(ov['totaal']) + ' ms)',
             font=F_TITEL, fill=(255, 216, 150))

    y = TITEL
    for vp, beelden in rijen:
        tek.rectangle([0, y, breedte, y + RIJKOP - 2], fill=(34, 26, 40))
        tek.text((MARGE, y + 3), LABEL[vp], font=F_RIJ, fill=(198, 182, 214))
        y += RIJKOP
        x = MARGE
        for im, fr in beelden:
            tek.rectangle([x, y, x + KOL, y + KOP - 2], fill=(28, 22, 34))
            tek.text((x + 6, y + 3), 't = ' + str(fr['doel']) + ' ms', font=F_TIJD, fill=(255, 176, 120))
            tek.text((x + 6, y + 24), fr['bijschrift'][:52], font=F_BIJ, fill=(176, 166, 190))
            vel.paste(im, (x, y + KOP))
            tek.rectangle([x, y + KOP, x + KOL - 1, y + KOP + im.height - 1], outline=(70, 58, 84))
            x += KOL + MARGE
        y += KOP + beelden[0][0].height + MARGE

    uit = os.path.join(MAP, 'contactvel_' + sleutel + '.png')
    vel.save(uit)
    print(uit, vel.size)
