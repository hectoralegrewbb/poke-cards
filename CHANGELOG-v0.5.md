# Pokécards Dungeon v0.5 — Rutas justas, parálisis y expansión de Pokédex

## Balance de Pokémon salvajes

- Nueva `src/run/wildEligibility.js`, una fuente de reglas para las especies que pueden aparecer en cada etapa. Evalúa **profundidad evolutiva** y **suma de estadísticas**, en lugar de filtrar solamente por PS.
- Hasta la segunda medalla no salen Arcanine, Rhydon, Charizard ni otros oponentes de fuerza equivalente en nodos salvajes. El límite evolutivo y el límite de amenaza aumentan por gimnasio, con excepciones para los Pokémon insignia de los jefes.
- Los encuentros de Rival y de las organizaciones regionales también usan pools filtrados.
- Se vuelven a filtrar los pools al construir combates para impedir que guardados de versiones anteriores vuelvan a ofrecer especies rotas.
- Las técnicas de alto coste ya no están disponibles ilimitadamente para enemigos comunes desde el inicio. Los costes máximos de la IA salvaje por etapa son `0, 1, 1, 2, 2, 2, 3, 3`. Esto **no** restringe a los jefes de gimnasio.

## Más opciones para el jugador

- **Todas las especies** incluidas en el catálogo local tienen un ataque ofensivo con **coste 0 y cooldown 0**. La validación del motor impide introducir una especie que no cumpla esta regla.
- Nuevos movimientos de estado: **Onda trueno**, **Paralizador** y **Deslumbrar**. Impactrueno, Chispa, Rayo, Trueno y Golpe cuerpo pueden provocar parálisis con probabilidades diferentes. Se agregó Onda trueno a varios Pokémon Eléctricos y Deslumbrar/Paralizador a especies temáticas.
- La parálisis tiene un **25% de probabilidad de impedir una acción por turno**, no inflige daño residual, persiste entre combates y no se acumula con quemadura/veneno. Respeta inmunidades por tipo en los movimientos que no causan daño.
- Nuevo **Antiparalizador** en las tiendas y recompensas; Cura total y Restaurar todo también funcionan.
- Indicador visual `PAR` y mensajes/efectos asociados a parálisis en batalla.

## Pokédex completa: herramienta de sincronización

- `npm run dex:sync` importa desde cuatro CSV oficiales del repositorio de datos de **PokéAPI**. Completa **649 especies** (Generaciones I–V), sus tipos y estadísticas adaptadas al sistema de cartas, conexiones evolutivas y números nacionales para sprites.
- No sobreescribe las **229 especies curadas manualmente** de la v0.4. Los sets autogenerados son adaptaciones jugables, no los learnsets oficiales ni un balance individual terminado.
- El importador revisa referencias y movimientos antes de escribir, y es repetible.
- **Este ZIP incluye 229 especies precargadas.** La importación real de las otras 420 requiere ejecutar ese comando con acceso a Internet; la descarga de fuentes no fue posible desde el entorno de creación. Tras sincronizar, el juego y el descargador de GIF incluyen las 649 especies.

## Compatibilidad y QA

- No cambia la estructura del guardado (`saveVersion = 1`). Recomendamos **una nueva partida** para regenerar pools regionales; las partidas viejas recuperan la protección por combate, pero pueden tener equipos previos ya capturados/evolucionados.
- Se agregaron pruebas de filtros de amenaza, IA, parálisis, coste 0, importación CSV y compatibilidad con el catálogo ampliado.
- Los sprites son los GIF de Black/White de PokéAPI y pueden requerir descarga aparte para usarse sin conexión. Algunos GIF pueden no existir en el repositorio remoto; hay fallback a PNG.
