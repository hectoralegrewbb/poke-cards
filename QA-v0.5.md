# QA — v0.5

## Alcance

- Validación de datos del motor, Pokédex actual, efectos de movimiento, guardados y modos Regional/Global.
- Pruebas contra especies inadecuadas en las primeras tres etapas, en cinco regiones y varias semillas.
- Pruebas de inmunidad a Onda trueno, parálisis, ítems curativos y ataques de coste 0.
- Importador verificado con un fixture sintético de 649 filas. **No se ejecutó la descarga de PokéAPI real** por falta de salida de red en este entorno.
- Test de simulación basado en un bot táctico simple; no sustituye una prueba de usuarios.

## Resultados

- `npm test`: **103 aprobadas, 0 fallidas** (node:test).
- 120 corridas de `node scripts/simulateRun.js 120`: **2,9 medallas en promedio, 0% de victorias completas**. Derrotas por etapa: gimnasio 1 (15), 2 (5), 3 (6), 4 (60), 5 (21), 6 (10), 7 (3). Los resultados describen únicamente al bot simplificado.
- Importación: parser, normalización y estructura de 649 filas probadas con un CSV sintético. La descarga real de los CSV debe verificarse en una computadora con salida de red.
- Servidor HTTP validado con `PORT=18765`: `/web/` y `/data/balance.json` responden 200. En este entorno el puerto 8080 está ocupado por otro servicio; en una máquina sin ese conflicto, `npm start` usa el puerto 8080.

## Limitaciones

- Los 420 Pokémon restantes se generan al ejecutar `npm run dex:sync` en un equipo conectado. Son datos derivados de estadísticas oficiales pero reescalados y movimientos aproximados para este juego.
- Los objetos y movimientos de generaciones posteriores no se importan, incluso si aparecieran en las fuentes actuales.
- No se realizó una inspección manual completa del HUD y animaciones en navegadores/dispositivos físicos en esta iteración.
- Las especies nuevas no tienen pases individuales de balance ni evoluciones de piedra/intercambio canónicas; esas evoluciones se convierten en progresión por EXP/medallas.
- Se mantienen excepciones de diseño para gimnasios, Alto Mando, campeón y legendarios, que pueden usar especies más fuertes que las salvajes de la misma etapa.
