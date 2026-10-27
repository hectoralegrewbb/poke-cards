# v0.12.0 — Pokémon Dream

- **Nuevo nombre:** Pokémon Dream (la clave de guardado `pokecards-dungeon-v2` no cambia: las partidas existentes siguen funcionando).
- **Inglés completo:** selector ESPAÑOL / ENGLISH en la pantalla de inicio y en OPCIONES. Traduce interfaz, FAQ, combate, datos (nombres de técnicas, pasivas, objetos) e historia. Al cambiar de idioma la página se recarga y la partida en curso se retoma sola. Sin preferencia guardada se usa el idioma del navegador. El registro de llamadas conserva cada texto en el idioma en que se recibió.
- **Texto que se escribe:** los diálogos aparecen letra a letra. Velocidad ajustable en OPCIONES (LENTA / NORMAL / RÁPIDA / INSTANTÁNEA). Un toque completa el texto; con SIGUIENTE, el primer toque completa y el segundo avanza.
- **Presentaciones:** cada personaje se presenta en su primera aparición; sus demás líneas esperan a esa presentación (`requires`).
- **Amelie y Lina:** más diálogo y desarrollo. Corregida la frase confusa del líder ("siempre sabe cuándo vas a venir").
- **Tutor con cobertura:** todo Pokémon puede aprender ataques de hasta 4 tipos de cobertura (lista por tipo + ampliada por especie, `balance.tutor`). Filtro por tipo en la vista del tutor.
- **Portada:** Pokémon caminando, 4 distintos en cada arranque (sprites animados de PokeAPI).

## v0.12.1 — arte pixel art
- **Cartas con sprite propio:** las 15 cartas usan su sprite completo de **18×30 px con marco**, siempre a escala entera (5× escritorio, 3× móvil; 7×/5× en recompensas). Pulsar una carta escribe su nombre encima; mantenerla pulsada muestra qué hace (esa pulsación larga no juega la carta). En las recompensas el nombre y el efecto van debajo del sprite.
- **Sprites provisionales (recoloreados):** Prisa, Paso ágil, Remedio y Revivir reutilizan otro sprite con el tono cambiado; reemplazar `assets/cards/<id>.png` (18×30) para darles arte propio. Cada carta enlaza su sprite con el campo `art` de `data/cards.json`.
- **Amelie en pixel art:** 24 expresiones (276×292, fondo transparente) reemplazan a las anteriores; 8 nuevas disponibles para diálogos: laugh, unsure, gasp, cheer, flustered, gloom, sad, nauseous.
- Herramientas: `tools/sliceCardArt.py` y `tools/sliceAmelie.py` regeneran los recortes desde `tools/art/`.
