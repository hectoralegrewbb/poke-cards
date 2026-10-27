# Corta las cartas completas (18×30 px, con marco) de la tira tools/art/cardsStrip.png a assets/cards/<cardId>.png
# y agrega el campo "art" en data/cards.json. La tira tiene 12 cartas separadas por 1 px; la 12.ª es un duplicado y se ignora.
# Las cartas sin sprite propio reutilizan uno con la ilustración recoloreada (marcadas como PROVISIONAL abajo).
# Ejecutar desde la raíz del juego: python3 tools/sliceCardArt.py
import colorsys, json
from PIL import Image

CARD_W, CARD_H, PITCH = 18, 30, 19
ART_BOX = (3, 3, 15, 21)  # ventana de ilustración dentro de la carta (el marco queda intacto al recolorear)
order = ["energyBasic", "luckyCoin", "energyDouble", "insight", "barrier", "focus", "recharge", "wildcard", "potion", "finder", "sitrusBerry"]
# carta nueva: (carta de origen, giro de tono en grados) — PROVISIONAL hasta tener arte propio
recolored = {"haste": ("energyBasic", 150), "quickStep": ("recharge", 100), "remedy": ("potion", 110), "revive": ("potion", 55)}

strip = Image.open("tools/art/cardsStrip.png").convert("RGBA")
sprites = {cardId: strip.crop((index * PITCH, 0, index * PITCH + CARD_W, CARD_H)) for index, cardId in enumerate(order)}

def shiftHue(card, degrees):
    out = card.copy()
    pixels = out.load()
    for y in range(ART_BOX[1], ART_BOX[3]):
        for x in range(ART_BOX[0], ART_BOX[2]):
            r, g, b, a = pixels[x, y]
            if a == 0: continue
            hue, sat, val = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if sat < 0.12: continue  # blancos y grises (fondo, contornos) no cambian
            r2, g2, b2 = colorsys.hsv_to_rgb((hue + degrees / 360) % 1, sat, val)
            pixels[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return out

for cardId, (source, degrees) in recolored.items():
    sprites[cardId] = shiftHue(sprites[source], degrees)
for cardId, sprite in sprites.items():
    sprite.save(f"assets/cards/{cardId}.png", optimize=True)

path = "data/cards.json"
cards = json.load(open(path, encoding="utf-8"))
for cardId in sprites:
    cards[cardId]["art"] = f"{cardId}.png"
json.dump(cards, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
open(path, "a").write("\n")
print(len(sprites), "cartas", sorted(set(cards) - set(sprites)) or "(todas con arte)")
