# Arte de Amelie

Los retratos son `amelie-<expresión>.webp` (360×389) y se listan en `manifest.json`.
Para cambiar uno, reemplaza el archivo con el mismo nombre (mismo encuadre: busto, cara en el tercio superior).

Expresiones usadas por el juego: neutral, smile, worried, glitch, dark, happy, wink, think, error, cry, gentle.
Disponibles sin usar aún: grin, scared, confused, surprised, shock.
Para usar una en un diálogo, pon su nombre en el campo `expression` de la línea en `data/story.json`
(la lista permitida está en `story.expressions`).

Sin `manifest.json` o sin el archivo de una expresión, el juego dibuja el busto SVG de respaldo.
