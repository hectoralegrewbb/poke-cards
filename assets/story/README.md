# Arte de Amelie

Retratos pixel art `amelie-<expresión>.webp` (276×292, fondo transparente), listados en `manifest.json`.
Se generan desde la hoja `tools/art/amelieSheet.jpg` con `python3 tools/sliceAmelie.py` (el mapa posición → nombre está en ese script).
Para cambiar uno basta reemplazar el archivo con el mismo nombre (busto, cara en la mitad superior); se muestran con `image-rendering: pixelated`.

Expresiones (24): happy, think, neutral, surprised, laugh, dark, cry, scared, grin, smile, unsure, gasp, cheer, confused,
glitch (se muestra con un efecto de CSS), flustered, worried, sick, gentle, wink, gloom, sad, nauseous, shock.
Para usar una en un diálogo, poné su nombre en el campo `expression` de la línea (lista permitida: `story.expressions`, que se genera en `tools/buildStory.py`).

Sin `manifest.json` o sin el archivo de una expresión, el juego dibuja el busto SVG de respaldo.
