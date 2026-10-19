# Pokécards Dungeon v0.6 — Revisión completa

## Correcciones
- **Semilla repetible:** `buildCampaign` barajaba in situ el arreglo de legendarios del catálogo, así que la misma semilla daba otra corrida si se jugaba una segunda partida en la misma sesión. Ahora trabaja sobre una copia (0/80 corridas divergentes; antes 40/80).
- **Etiqueta de estado:** la parálisis se mostraba como `QUE` en el panel del equipo. Se centralizó en `statusInfo` (`web/ui/labels.js`) y la ayuda del combate describe los tres estados.
- **Evolución por EXP** en el panel del equipo: se prioriza la evolución `method === "exp"` en lugar de la primera de la lista.
- **Carga de energía:** `splitCharge` / `choosePayCards` (`src/engine/actions.js`) pagan con lo mínimo y guardan los comodines para reforzar, en lugar de gastarlos en el costo.

## Balance (medido con el bot de referencia, dificultad Entrenador)
- Los gimnasios 2-4 pasan a 3 enemigos (antes el 4.º tenía 4).
- Escalas de `data/region.json`: etapa 4 `1.22/1.1`, etapa 7 `1.55/1.26`, etapa 8 `1.62/1.28`, Liga `1.4/1.18`, campeón `1.5/1.25`.
- El Alto Mando y el campeón arman equipos con las especies más fuertes disponibles (`strongestFirst`), en vez de un sorteo plano.
- Resultado: campeón ~22-25% (regional aleatorio y global), Explorador ~74%, Experto ~2%. Por región hay desvío (Unova 50%, Hoenn 10%): pendiente.

## Interfaz
- **FIN TURNO** pide una segunda pulsación si quedan Pokémon sin actuar (ventana de 2,4 s).

## Herramientas y proyecto
- `src/tools/smartPlayer.js`, `src/tools/smartRunBot.js` y `npm run balance` (`scripts/balanceReport.js`).
- Tests nuevos en `tests/v06Review.test.js` (113 en total).
- Los CHANGELOG y QA anteriores pasaron a `docs/`.
