# Pokécards Dungeon v0.7 — Catálogo completo, variocolores y móvil

## Catálogo
- `npm run dex:sync` ejecutado contra PokéAPI: **649 especies** (420 nuevas, Gen I–V). Las 229 curadas no se tocan.
- Los sets de ataques generados ahora dependen de la fuerza (techo de costo 1/2/3) y varían por especie (determinista por número nacional). Antes todas las especies de un tipo compartían el mismo kit y un Magikarp lanzaba Surf.
- Sin legendarios en rutas comunes (verificado).

## Variocolores
- 1/64 por salvaje, sin consumir el RNG de la corrida. Solo cosmético. Captura asegurada si lo derrotás. Sprite shiny con fallback.

## HUD móvil (retrato)
- Rivales arriba, aliados abajo en 3 columnas, mano fija al pie, guía plegada, menús y mapa compactos.

## Efectos y mecánicas
- **Cartas nuevas:** Recarga, Concentración, Prisa, Remedio (efecto nuevo `cureStatus`). Entran en recompensas y tienda.
- **Pasivas por tipo** para especies finales (279 nuevas; 293 con pasiva en total) y aviso visual cuando se activan (`passiveTriggered`).
- **Sonido por tipo** (Web Audio, sin archivos), aviso "¡MUY EFICAZ!" / "POCO EFICAZ", banners de modificadores, proyectiles para Normal y Volador, animación de curación de estado.

## Balance
- Las pasivas y cartas subieron el poder del jugador (campeón del bot 30% → 42%). Se recalibró: escalas de los gimnasios 6–8, Alto Mando `1.5/1.22` y campeón `1.65/1.32`.
- Resultado con el bot (Entrenador): campeón ~26% regional / ~22% global; Explorador ~77%; Experto ~3%. Referencia relativa, no dificultad humana.

## Proyecto
- Tests nuevos (`tests/shiny.test.js`, `tests/v07Effects.test.js`): 125 en total.
