# v0.12.0 — Pokémon Dream

- **Nuevo nombre:** Pokémon Dream (la clave de guardado `pokecards-dungeon-v2` no cambia: las partidas existentes siguen funcionando).
- **Inglés completo:** selector ESPAÑOL / ENGLISH en la pantalla de inicio y en OPCIONES. Traduce interfaz, FAQ, combate, datos (nombres de técnicas, pasivas, objetos) e historia. Al cambiar de idioma la página se recarga y la partida en curso se retoma sola. Sin preferencia guardada se usa el idioma del navegador. El registro de llamadas conserva cada texto en el idioma en que se recibió.
- **Texto que se escribe:** los diálogos aparecen letra a letra. Velocidad ajustable en OPCIONES (LENTA / NORMAL / RÁPIDA / INSTANTÁNEA). Un toque completa el texto; con SIGUIENTE, el primer toque completa y el segundo avanza.
- **Presentaciones:** cada personaje se presenta en su primera aparición; sus demás líneas esperan a esa presentación (`requires`).
- **Amelie y Lina:** más diálogo y desarrollo. Corregida la frase confusa del líder ("siempre sabe cuándo vas a venir").
- **Tutor con cobertura:** todo Pokémon puede aprender ataques de hasta 4 tipos de cobertura (lista por tipo + ampliada por especie, `balance.tutor`). Filtro por tipo en la vista del tutor.
- **Portada:** Pokémon caminando, 4 distintos en cada arranque (sprites animados de PokeAPI).
