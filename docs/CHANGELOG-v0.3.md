# Pokécards Dungeon v0.3 — Balance, contenido y efectos

## Cambios integrados

### EXP y evoluciones

- Antes cada Pokémon vivo recibía **el 100% de la suma de EXP enemiga**. Ahora recibe `round(0,7 × EXP enemiga / √cantidad de Pokémon vivos)` (mínimo 1).
- Primera evolución: 55 EXP + al menos 1 medalla; tercera etapa: 110 EXP + al menos 5 medallas. El excedente de EXP se conserva al evolucionar.
- No se incorporó un "nivel" numérico: el motor utiliza EXP de evolución. Si se quiere progresión con niveles individuales conviene diseñarla como un sistema separado.
- Los guardados antiguos siguen pudiendo leerse, pero un Pokémon **ya evolucionado no retrocede**; iniciá una corrida nueva para experimentar el balance completo.

### Combate

- `targetMode: allEnemies` para Surf y Terremoto (también Agua lodosa / Chispazo), `targetRow` para Avalancha, Hoja afilada y Zumbido.
- Ataques de área usan `spreadMultiplier` configurable entre 0,65 y 0,80 y no dañan aliados. El costo y cooldown se pagan una sola vez; críticos y STAB se calculan por ejecución y resistencias por enemigo.
- Veneno y quemadura: proc por movimiento, inmunidades, daño directo de estado, penalización de quemadura al daño físico, persistencia entre combates, cura y feedback UI.
- Mordisco/Triturar/Avalancha: retroceso con probabilidad; cancela una sola acción, no encadena bloqueos permanentes.
- Se agregó un proyectil animado con estilo retro por tipo y blancos múltiples, sin depender de sprites adicionales ni bibliotecas de animación.

### Nuevas familias y objetos

- De 62 a **93 especies** con 31 incorporaciones, incluidos Sewaddle, Venipede, Joltik, Litwick, Tympole, Solosis, Drilbur, Ferroseed, Yamask, Axew, Timburr y Frillish y sus evoluciones.
- De 55 a **74 movimientos**, con físicos/especiales/de apoyo para los tipos antes poco representados.
- Rutas con especies propias por etapa, menos iniciales repetidos, destinos sin duplicar en el mismo paso y gimnasios 6 a 8 de Fantasma / Psíquico / Dragón.
- De 5 a **13 ítems**: Antídoto, Antiquemar, Cura total, Restaurar todo, Superpoción, Máxima poción, Revivir máx. y Piedra noche.
- Tiendas muestran hasta cuatro ítems y hay drops de objetos con probabilidades pequeñas en rutas/combates ordinarios.
- Sprites Black/White: índice Pokédex ampliado a 93 especies; instalador opcional para **186 GIF** (front/back).

## Alcance pendiente y criterio de dificultad

- Simulación de 120 corridas en modalidad Entrenador: **2,4 medallas promedio**, 0 victorias. El bot es heurístico y no usa tácticas humanas avanzadas; no utilizar ese valor como porcentaje de éxito humano.
- Próxima prioridad: sesiones reales con al menos 5 jugadores, midiendo primer gimnasio, 3.er gimnasio, duración promedio de combate, uso de estados y nivel de confianza en ataques de área.
- Las animaciones son feedback CSS, **no assets animados propios por técnica**. El acabado audiovisual requiere prueba manual en navegadores desktop y móviles.
- Los GIF de Pokémon se consultan a una fuente externa o se descargan localmente por decisión del usuario. No se redistribuyen en el ZIP.
