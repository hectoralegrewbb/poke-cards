# Corta los 24 retratos pixel art de Amelie de tools/art/amelieSheet.jpg (4 columnas × 6 filas), quita el fondo crema
# y guarda assets/story/amelie-<expresión>.webp (276×292, sin pérdida, busto alineado abajo) + manifest.json.
# Ejecutar desde la raíz del juego: python3 tools/sliceAmelie.py   (requiere Pillow y numpy)
import json
from collections import deque
import numpy as np
from PIL import Image

# Posición en la hoja (fila a fila, de izquierda a derecha) → nombre de expresión.
names = ["happy", "think", "neutral", "surprised",
         "laugh", "dark", "cry", "scared",
         "grin", "smile", "unsure", "gasp",
         "cheer", "confused", "glitch", "flustered",
         "worried", "sick", "gentle", "wink",
         "gloom", "sad", "nauseous", "shock"]
# La hoja generada no tiene celdas iguales: límites medidos (y0, y1) por fila y (x0, x1) por columna.
rows = [(12, 300), (309, 599), (608, 880), (890, 1152), (1163, 1423), (1432, 1703)]
cols = [(8, 277), (296, 569), (596, 859), (878, 1141)]
W, H = 276, 292
sheet = Image.open("tools/art/amelieSheet.jpg").convert("RGB")

def isBackground(a):  # crema exacto del fondo (el abrigo blanco queda fuera por su azul más alto)
    return (np.abs(a[..., 0] - 254) <= 3) & (np.abs(a[..., 1] - 247) <= 4) & (a[..., 2] >= 224) & (a[..., 2] <= 235)

def looksLikeBackground(a):  # tolerancia mayor, solo para crecer desde lo ya detectado (ruido del JPEG en los bordes)
    return (a[..., 0] >= 238) & (a[..., 1] >= 228) & (a[..., 2] <= 238) & ((a[..., 0] - a[..., 2]) >= 11)

def portrait(index):
    row, col = divmod(index, 4)
    (y0, y1), (x0, x1) = rows[row], cols[col]
    a = np.array(sheet.crop((x0, y0, x1 + 1, y1 + 1))).astype(int)
    h, w, _ = a.shape
    near = isBackground(a)
    seen = np.zeros((h, w), bool)
    queue = deque()
    for x in range(w):
        if near[0, x] and not seen[0, x]: seen[0, x] = True; queue.append((0, x))  # no se siembra por el borde inferior: el busto está cortado ahí
    for y in range(h):
        for x in (0, w - 1):
            if near[y, x] and not seen[y, x]: seen[y, x] = True; queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and near[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; queue.append((ny, nx))
    loose = looksLikeBackground(a)
    upper = np.zeros((h, w), bool)
    upper[: int(h * 0.7), :] = True  # el abrigo blanco (parte baja) no se toca: tiene tonos parecidos al fondo
    for _ in range(3):
        grow = np.zeros_like(seen)
        grow[1:, :] |= seen[:-1, :]; grow[:-1, :] |= seen[1:, :]; grow[:, 1:] |= seen[:, :-1]; grow[:, :-1] |= seen[:, 1:]
        seen |= grow & loose & upper
    solid = ~seen
    eroded = solid.copy()  # 1 px menos para quitar el halo claro del JPEG
    eroded[1:, :] &= solid[:-1, :]; eroded[:-1, :] &= solid[1:, :]; eroded[:, 1:] &= solid[:, :-1]; eroded[:, :-1] &= solid[:, 1:]
    image = Image.fromarray(np.dstack([a.astype(np.uint8), (eroded * 255).astype(np.uint8)]), "RGBA")
    ys, xs = np.where(eroded)
    image = image.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    canvas.paste(image, ((W - image.width) // 2, H - image.height), image)
    return canvas

manifest = {}
for index, name in enumerate(names):
    file = f"amelie-{name}.webp"
    image = portrait(index)
    # Paleta reducida: limpia el ruido del JPEG de origen y achica el archivo; el alfa se conserva.
    flat = image.convert("RGB").quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    flat.putalpha(image.getchannel("A"))
    flat.save(f"assets/story/{file}", lossless=True, quality=100, method=6)
    manifest[name] = file
json.dump(manifest, open("assets/story/manifest.json", "w", encoding="utf-8"), indent=1)
print(len(manifest), "retratos")
