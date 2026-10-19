# Pokécards Dungeon — cambios v0.4

## Entregado

- Dos modos seleccionables al iniciar: **Regional** (Kanto, Johto, Hoenn, Sinnoh, Teselia o región sorpresa) y **Global** (orden mixto de gimnasios de las cinco regiones). Independientes de la dificultad.
- Definiciones de 40 gimnasios, 20 miembros del Alto Mando y 5 campeones, con nombre, tipo y Pokémon insignia; alineados a la estructura Black/White en Teselia, con variantes simplificadas cuando hay líderes/versiones alternativos.
- Campaña serializada, determinista por semilla. Un estado de RNG del mapa y otro del combate se conservan tras guardar. Guardados clásicos de v0.3 siguen restaurándose con su campaña anterior.
- Catálogo: **93 → 229 especies**; incluyen líderes/aces regionales, 24 legendarios y Pokémon para eventos de historia. Datos de movimientos y stats adaptados al roguelike, no reproducciones canónicas completas.
- Movimientos: **74 → 104**, 30 técnicas adicionales; se conservan intactos los sets de las 93 especies originales para evitar regresiones del motor.
- Eventos: tras 3 y 6 medallas se habilitan batallas legendarias obligatorias de recompensa con captura garantizada al ganar. Solo uno activo; otros a la caja. Eventos narrativos aleatorios de rival y grupo villano por región (Jessie y James del Team Rocket en Kanto/Johto).
- Rival: su inicial se selecciona con ventaja de tipo contra tu inicial y evoluciona con el avance de medallas.
- Daño: `calculateMoveDamage` unifica previsualización, IA enemiga y daño aplicado; el multiplicador por ataque a múltiples rivales se calcula en un solo lugar.
- Gimnasios: primeros líderes 2 rivales, gimnasios 2 y 3 con 3, últimos gimnasios 4, para suavizar la curva inicial. El Alto Mando conserva 5 y el campeón 6.
- UI: tarjetas de modo, elección de región y semilla, rótulos regionales, nombres de líderes, avisos de encuentro legendario, etiquetas de peligro/recompensa.
- Separación modular: nueva `src/shared/nationalDex.js`, `src/run/campaignBuilder.js`, `data/campaigns.json`. Validación cruzada de las cinco campañas.

## Limitaciones conscientes

- **420 especies** faltantes para llegar a la Pokédex completa de 649; los equipos de algunos entrenadores son composiciones temáticas, no plantillas oficiales exactas.
- La llegada de legendarios es obligatoria en el mapa, pero su captura se puede rechazar. No hay todavía diálogos ramificados ni otras escenas del anime.
- No se incluyeron GIF con copyright en el ZIP; se siguen resolviendo en línea o con `npm run sprites:download`.
- Se mantiene la regla existente de EXP + medallas; no se implementaron niveles numéricos ni todas las alteraciones del canon.
- El bot de simulación sigue sin completar la Liga. Se requiere playtesting humano y QA visual en navegador.
