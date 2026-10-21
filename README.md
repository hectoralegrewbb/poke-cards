> **v0.8:** mazo + cofre con editor, eventos opcionales sin riesgo de muerte, ataque del propio tipo garantizado, audio (volúmenes + música en loop sin cortes), tema visual moderno. Ver [`docs/CHANGELOG-v0.8.md`](docs/CHANGELOG-v0.8.md) y [`docs/QA-v0.8.md`](docs/QA-v0.8.md).

> **v0.7:** catálogo completo de 649 especies, variocolores (shiny), HUD para móvil en vertical, cartas y pasivas nuevas, y efectos de sonido y pantalla por tipo. Ver [`docs/CHANGELOG-v0.7.md`](docs/CHANGELOG-v0.7.md) y [`docs/QA-v0.7.md`](docs/QA-v0.7.md).
> **v0.6:** revisión completa: corrección de la semilla repetible, curva de dificultad calibrada con un bot de referencia, Liga y campeón más fuertes, carga de energía que reserva comodines para reforzar y confirmación al terminar turno con Pokémon sin actuar. Ver [`docs/CHANGELOG-v0.6.md`](docs/CHANGELOG-v0.6.md) y [`docs/QA-v0.6.md`](docs/QA-v0.6.md).

# Pokécards Dungeon

Fan game roguelike táctico de cartas en navegador: elegí un inicial, capturá un equipo de hasta 6, superá 8 gimnasios y conquistá la Liga. Uso privado y sin fines de lucro. **Ahora muestra automáticamente los sprites GIF animados de Black/White (5.ª generación)** si hay conexión; los archivos gráficos originales no se redistribuyen en el ZIP. Consultá la sección «Sprites» para instalarlos offline.

## Uso

```bash
npm start                 # servidor local -> http://localhost:8080/web/  (no abras index.html con doble clic: hace falta el servidor)
npm run sprites           # informa qué GIF faltan para jugar offline
npm run dex:sync       # ya ejecutado en v0.7 (649 especies); repetible, no pisa las curadas ni las pasivas a mano
npm run sprites:download  # baja 458 GIF con el catálogo base o hasta 1298 con Pokédex completa
npm test                  # tests de reglas, dificultad, sprites y guardado (node:test)
npm run simulate          # combates sueltos con jugador ingenuo
npm run simulateRun       # corridas completas con un bot (node scripts/simulateRun.js [corridas])
```

Requiere Node 20+. El motor no toca el DOM ni el filesystem: recibe un objeto `data` por parámetro (`src/node/loadGameData.js` lo arma en Node; en el navegador se arma igual con `fetch` o imports JSON).

## Modos de campaña (v0.4)

Al iniciar elegís una de dos campañas. **No son dificultades**: las dificultades Explorador / Entrenador / Veterano se seleccionan por separado.

- **Regional:** elegís Kanto, Johto, Hoenn, Sinnoh o Teselia (o `SORPRESA` para sortear una). Los 8 gimnasios conservan su orden característico, nombres y especialidades; la Liga corresponde a la región seleccionada. Los equipos son adaptaciones jugables con Pokémon del catálogo disponible, **no equipos canónicos exactos**.
- **Global:** cada una de las 8 etapas tiene un gimnasio elegido entre las cinco regiones, con al menos una etapa de cada región; el Alto Mando reúne cuatro miembros de regiones diferentes y el campeón se elige entre las cinco Ligas. Los encuentros salvajes cruzan especies de distintas generaciones. Se repite la misma estructura con la misma semilla.

**Eventos:** una posibilidad de encuentro con el rival o el grupo villano aparece durante algunas rutas; la organización depende de la región del gimnasio y en Kanto/Johto se presenta Team Rocket (Jessie y James). Tras las medallas **3 y 6** hay una batalla legendaria obligatoria con captura garantizada si ganás (podés rechazarla); sin límite de legendarios en el equipo (v0.9; antes solo uno activo). Los eventos se desencadenan por nodos, no por temporizadores reales. La batalla del rival adapta su inicial y evolución a tus medallas.

**Progreso de catálogo:** **649 especies (Gen I–V)** desde v0.7: 229 curadas a mano y 420 importadas con `npm run dex:sync`. Las importadas tienen estadísticas y sets adaptados al combate de cartas, no son conversiones idénticas a sus contrapartes oficiales. Las 136 especies agregadas desde v0.3 usan estadísticas y sets adaptados al combate de cartas; requieren un balance posterior, no son conversiones exactas de los juegos oficiales.

**Guardado:** el snapshot conserva el modo, la región, los gimnasios, la Liga, los legendarios sorteados, las decisiones y los estados del RNG; se puede continuar con un guardado de v0.3 en su campaña clásica anterior (sin aplicar retroactivamente el modo nuevo).

## Objetivo y modalidades

1. **Prepará el equipo:** elegí 1 inicial de Kanto a Teselia y capturá aliados en zonas salvajes (hasta 6 en la party; el resto, a la caja).
2. **Tomá decisiones:** cada tramo propone rutas con riesgo y recompensas visibles. Con cartas de energía pagás técnicas y reforzás ataques o escudos. Gestioná PS, oro, posiciones y evoluciones.
3. **Completá la corrida:** 8 gimnasios, cuatro enfrentamientos del Alto Mando y el campeón. Si todos los miembros quedan debilitados, perdés.

**Tres dificultades seleccionables, independientes del modo de campaña:**

| Modalidad | PS enemigos | Stats enemigos | Recursos iniciales |
| --- | --- | --- | --- |
| Explorador | ×0,82 | ×0,90 | +30 oro, +2 bayas |
| Entrenador (base) | ×1,00 | ×1,00 | Estándar |
| Veterano | ×1,17 | ×1,10 | −10 oro |

El ajuste es un multiplicador de las escalas de la campaña, derivadas inicialmente de `data/region.json`: no cambia la IA, las reglas de captura, la EXP ni los enfriamientos. **Son presets iniciales, no un balance validado estadísticamente**. El indicador de modo aparece en el mapa. El guardado local automático permite cerrar y reanudar desde la portada; conserva el estado RNG incluso en combate (requiere que el navegador permita `localStorage`).

La interfaz incorpora guías de 3 pasos, objetivos de tramo, indicadores de peligro/recompensa, foco de teclado y feedback visual; las cartas se pueden jugar con clic o arrastrando.

## Reglas implementadas

- **Mano:** 6 cartas en el turno 1; luego 1 por turno, más lo que den cartas (`drawCards`) y pasivas. Máximo en mano: 10. Mazo recomendado: 40-45 (`validateDeck` avisa, no bloquea).
- **Energía universal:** las cartas no tienen tipo. Una carta de energía puede **pagar** un movimiento, **reforzar un ataque** (+3 de poder por carta, máx. 3) o **reforzar una defensa** (+5 de escudo por carta). Variantes: Energía (1), Energía doble (2), Comodín (valor 1, refuerzo x2). Cartas de utilidad: Intuición, Poción, Paso ágil, Moneda de la suerte, Barrera, Recarga (+2 energía), Concentración (+3 POD un turno), Prisa (-1 costo un turno) y Remedio (cura el estado y 6 PS).
- **Movimientos:** 4 fijos por especie; solo cambian al evolucionar. Cada uno tiene `cost` (energía) y `cooldown` (turnos propios inutilizable tras usarlo). Los que tienen `targetMode` pueden afectar `allEnemies` (Surf/Terremoto) o `targetRow` (Avalancha/Hoja afilada); `spreadMultiplier` atenúa el daño total para compensar que golpean a varios rivales.
- **Críticos:** `critCoins` monedas (4 por defecto); crítico si todas salen cara (6,25 %; con 3 monedas, 12,5 %). Cada Moneda de la suerte quita una moneda en la siguiente tirada.
- **Los 6 Pokémon están activos.** Cada uno actúa una vez por turno. Los enemigos eligen objetivo según su perfil (`data/enemyProfiles.json`), mezclando estrategias por peso: `lowestHp`, `highestThreat`, `typeAdvantage`, `random`.
- **Intención visible:** cada enemigo anuncia movimiento, objetivo y daño estimado al inicio de la ronda (`enemy.intent`). Si el objetivo cae antes de resolver, reelige.
- **Encuentros:** normal 1-3 enemigos, gimnasio 2 (el primero), 3 (gimnasios 2-4) y 4 (gimnasios 5-8), Alto Mando 5, campeón 6 (`balance.encounters`).
- **Progreso:** EXP de combate repartida con rendimientos decrecientes según la cantidad de aliados en pie (`0,7 / √N` de la EXP total para cada uno). No existe un nivel numérico en esta versión: la EXP alimenta las evoluciones. Evolución inicial desde 55 EXP y 1 medalla, evolución final desde 110 EXP y 5 medallas; las piedras evolucionan según especie. (`findEvolution` / `evolve`).

### Estados alterados y animaciones (v0.3)

- **Veneno:** Picotazo veneno, Bomba lodo, Cola veneno y Tóxico tienen probabilidad configurable; al finalizar el turno correspondiente inflige 6% de PS máximos (mínimo 1), ignorando escudos. Acero y Veneno son inmunes.
- **Quemadura:** ataques de Fuego y Fuego fatuo pueden quemar. El afectado inflige un 25% menos de daño físico y pierde 4% de PS máximos (mínimo 1) por turno. Los tipo Fuego son inmunes.
- **Retroceso:** Mordisco, Triturar y Avalancha pueden anular una acción del objetivo. No causa bloqueo permanente.
- **Ítems y persistencia:** veneno/quemadura permanecen entre combates y se curan con Antídoto, Antiquemar, Cura total y Restaurar todo; el estado se limpia al debilitarse.
- **Feedback:** proyectiles CSS por tipo con trayectoria hacia cada objetivo, impacto múltiple sincronizado, partículas, indicadores VEN/QUE y log de proc. Se respeta `prefers-reduced-motion`.

Estas son **adaptaciones para el roguelike**, no una réplica exacta de probabilidades ni duraciones de los videojuegos originales.

## La corrida

- **Mapa:** 8 etapas. Cada una tiene 4 pasos con 2 opciones (combate, zona salvaje, élite, campamento, tienda, eventos de historia) y termina en el gimnasio. Después: campamento o tienda, 4 combates del Alto Mando (5 rivales, sin descanso entre ellos) y el campeón (6).
- **Dificultad:** cada etapa escala vida y stats de los rivales (`data/region.json` → `stages[].scale`, aplicadas a la campaña generada). Los nodos normales aplican un `scaleBonus` menor.
- **Recompensas:** oro según EXP de los rivales, 3 cartas para elegir una (o saltar), ítems en élites/gimnasios y probabilidad reducida de encontrarlos en rutas, medalla. Con el mazo en el máximo (45) hay que descartar una carta para sumar otra.
- **Inicio:** elegís UN inicial entre 15 (Kanto a Teselia, solo hasta Gen 5 por los sprites) y el resto del equipo lo capturás en el camino. Los enemigos escalan según el tamaño de tu equipo para que el arranque no sea letal.
- **Captura:** tras una zona salvaje se ofrece un Pokémon de los derrotados. Si la party está llena va a la caja y se cambia desde el panel.
- **Debilitamiento persistente:** un Pokémon debilitado sigue así hasta que lo revivas (ítem Revivir, 50 de oro, o campamento con 25% de PS). Si caen los 6, termina la corrida.
- **Evolución:** automática al alcanzar EXP y medallas mínimas; piedra/cable se usan desde el panel. Los ítems ahora también curan veneno y quemaduras, y hay pociones de mayor nivel.
- **Campamento (una opción):** descansar (+40% PS a todos), revivir o entrenar (+12 EXP).

## Controles del combate

**Energía por Pokémon (se suma):** cada Pokémon *carga* cartas de energía en su casillero. Las cartas cargadas no se gastan hasta que usa una técnica: las primeras pagan el costo y las siguientes refuerzan (+3 de poder, hasta 3). Si no las usa, vuelven a la mano al terminar su acción. Tope de carga: costo de su técnica más cara + 3. El costo mostrado ya incluye modificadores (flecha verde ▼ = más barato, roja ▲ = más caro).

**Arrastrando** (o con clic, siempre hay alternativa). Al agarrar una carta de energía, cada Pokémon tuyo muestra dos zonas:

- **CARGAR:** reserva la carta en ese Pokémon (arrastrá varias: se suman). Tocá las bolitas amarillas del casillero para devolverlas.
- **ESCUDO:** gasta la carta ya mismo en escudo (+5). Es una zona aparte para no gastar cartas por accidente.
- También se puede soltar una carta sobre una técnica del menú: la carga en el Pokémon elegido.
- Carta de utilidad → sobre un aliado (si la pide) o sobre el campo.
- **Técnica → sobre un rival** (o aliado, si es de apoyo): la usa. Sin energía suficiente avisa y no gasta nada.

**Con clics:** clic en tu Pokémon → clic en cartas (se cargan; otro clic las devuelve) → técnica → objetivo → **¡USAR!**. El botón ESCUDO activa el modo escudo por clics. Sobre cada rival ves el daño estimado con el multiplicador de tipo y su intención del turno. Las estimaciones ahora comparten fórmula con el daño real (incluyen penalización de área; los críticos siguen siendo probabilísticos) y muestran la existencia de escudo. El registro explica cada golpe (tipo, STAB, refuerzo, crítico). Botón SND para silenciar.

## Habilidades, pasivas y efectos temporales

- **Técnicas de apoyo con efecto sobre las reglas:** *Agilidad* baja 1 el cooldown de todo el equipo; *Espacio raro* hace que las técnicas de costo 1+ cuesten 1 menos durante 5 turnos; *Danza espada*/*Maquinación* suman +3 de poder físico/especial 3 turnos; *Carga* agrega 2 energías a la mano; *Descanso* cura; etc. Los efectos activos aparecen como chips bajo la barra superior (nombre · turnos restantes).
- **Pasivas por tipo (v0.7):** las especies finales (sin evolución siguiente, no legendarias, fuerza mínima) reciben una pasiva temática según su primer tipo (`scripts/typePassives.js`). Las curadas a mano no se pisan. Al activarse una pasiva aparece su nombre sobre el Pokémon.
- **Pasivas por especie** (se ven al elegir al Pokémon y en el tooltip del casillero): `turnStart` (curar, escudo, robar, bajar cooldowns), `combatStart` (escudo inicial, moneda de la suerte) y `static` (modificadores permanentes de costo o poder, p. ej. Técnico: +2 a técnicas sin costo).
- Todo esto vive en `src/engine/modifiers.js` + registro de efectos (`registerEffect`), así que sumar uno nuevo es agregar datos o una función, sin tocar el combate.

**Cuánto pega un golpe:** (poder + refuerzo de cartas) × relación de stats (0.5–2) × STAB 1.5 × tipo × crítico 1.5. El refuerzo es plano (+3 por carta, +6 con Comodín, hasta 3 cartas), así que sobre una técnica de poder 4 pesa muchísimo. Se ajusta en `data/balance.json` (`attackBoostPerCard`, `maxBoostCardsPerAttack`).

## Estilo visual

Pixel art de 16 colores (paleta Sweetie 16), cajas con bordes escalonados, barras de PS segmentadas y cartas con íconos dibujados en grilla (`web/ui/pixelIcons.js`). Las tipografías (Press Start 2P y VT323) se cargan de Google Fonts: la primera vez hace falta internet; sin ellas se usa una fuente monoespaciada. Los colores están como variables CSS al inicio de `web/styles.css`.

## Sprites animados de 5.ª generación

El provider `web/ui/spriteProvider.js` obtiene automáticamente los **GIF animados frontales y posteriores** de Pokémon Black/White a través de [PokeAPI/sprites](https://github.com/PokeAPI/sprites). `src/shared/nationalDex.js` traduce los IDs de especies del juego a su número en la Pokédex Nacional (las 649); todos pertenecen a las primeras cinco generaciones.

- **Con Internet:** `npm start` alcanza. Se cargan GIF animados desde `raw.githubusercontent.com`; si falla uno, se intenta PNG estático de Gen 5 y después un recurso local o marcador. No requiere claves ni dependencias.
- **Sin conexión:** ejecutá `npm run sprites:download` **una vez con conexión a Internet**. Los GIF (458 de base o hasta 1298 tras sincronizar la Pokédex) se guardan en `assets/sprites/front/` y `assets/sprites/back/`, creando un `manifest.json` para dar prioridad a los archivos locales. El servidor sirve estas rutas directamente.
- **Pack propio:** colocá manualmente `<speciesId>.gif` o `<speciesId>.png` en las mismas carpetas. `npm run sprites` lista lo que falte. Si querés forzar prioridad local, creá `assets/sprites/manifest.json`.

**Derechos de autor:** las imágenes de Pokémon pertenecen a sus titulares y colaboradores según el caso. La disponibilidad en un repositorio público no supone permiso para redistribuirlas; por eso el ZIP incluye proveedor y descargador, **no copias de los GIF**. Para una publicación comercial habría que sustituir los recursos por arte licenciado/original y revisar también la propiedad intelectual de los nombres y elementos del juego.

## Decisiones que tomé por defecto (cambialas si no te cierran)

1. **Formación frente/fondo.** Los movimientos `"range": "melee"` solo llegan a la fila frontal mientras haya alguien vivo ahí. Si ponés a todos en `"front"` la regla desaparece.
2. **Una acción por Pokémon por turno** (`balance.combat.actionsPerPokemonPerTurn`).
3. **Las pasivas `turnStart` se disparan desde el turno 2** (el turno 1 es exactamente la mano inicial de 6); las `combatStart` y `static` valen desde el principio.
4. **Los enemigos no usan mazo:** solo cooldowns. Los efectos de robo/moneda no les hacen nada.
5. **Escudos:** los del jugador duran hasta el inicio de su próximo turno; los enemigos, hasta el inicio de la siguiente fase enemiga.
6. **Convención de datos (no forzada):** slot 0 básico (costo 0, cd 0), slot 1 núcleo (costo 1, cd 1), slot 2 fuerte (costo 2, cd 2-3), slot 3 utilidad o cobertura.

## Estructura

```
data/                 balance, cartas, movimientos, 649 especies, tipos, perfiles enemigos, ítems, región base, campañas regionales
src/engine/           reglas de combate puras: rng, mazo, daño, efectos, targeting, IA enemiga, acciones, turnos, progresión
src/engine/status.js  estados alterados y retroceso
src/run/              reglas de la corrida: modos, generación de campaña, mapa, eventos, encuentros, recompensas, campamento, tienda
src/shared/           Pokédex nacional usada por UI, generador de regiones y descargador de sprites
src/node/             carga de datos en Node
src/tools/            jugador y bot de corrida ingenuos (solo simulación/tests)
web/                  index.html, styles.css y ui/ (vistas DOM, arrastre, efectos, sonido, íconos, provider de sprites)
scripts/  tests/      servidor, diagnóstico/descarga de sprites, simulaciones y tests
```

API principal: `createCombat`, `playMove`, `playShield`, `playUtility`, `endPlayerTurn`, `serializeRun`, `restoreRun`. Las acciones devuelven `{ ok, events }` o `{ ok: false, error }`. Todo lo que pasa queda en `state.log` para que la vista lo anime.

Para extender sin tocar el motor: `registerEffect(type, handler)` (efectos de movimientos, cartas y pasivas) y `registerTargetingStrategy(name, fn)`. `validateGameData(data)` revisa que los JSON se referencien bien entre sí (corre en los tests).

## Pendientes y limitaciones (v0.4)

- **Pokédex:** las 420 especies importadas usan sets de ataques generados por fuerza y variedad (no los learnsets oficiales). Conviene curar a mano las que te importen.
- **Fidelidad de equipos:** la identidad de gimnasios/Ligas (orden, líderes, tipos, insignias) está definida para cinco regiones, pero varias plantillas de rivales usan sustitutos del mismo tipo hasta completar el catálogo. Los iniciales y la regla de EXP siguen el balance roguelike, no las reglas exactas de Pokémon.
- **Eventos anime:** la primera iteración cubre rival y Rocket/organizaciones. Falta contenido episódico específico, diálogos y decisiones narrativas ramificadas.
- **Estadísticas:** pruebas de regresión automatizadas y simulación con bot heurístico, no playtests humanos. Ninguna corrida del bot llegó a ganar la Liga; el balance endgame es provisional.
- **Revisión visual:** el código web pasó chequeo de sintaxis y el servidor entregó los archivos correctamente, pero Chromium headless no completó captura en este entorno: revisar modo selector, responsividad, GIF y animaciones en navegador real.

Cambios y validación: `docs/CHANGELOG-v0.7.md` y `docs/QA-v0.7.md`. Historial: `docs/CHANGELOG-v0.3.md` a `v0.5`, `docs/QA-v0.3.md` a `v0.5` y `docs/v0.2/`.

**Reporte de balance:** `npm run balance -- 300 trainer regional [región|random]` simula corridas con un bot razonable (`src/tools/smartRunBot.js`) y muestra victorias y PS restantes por gimnasio, ruta, Liga y tipo de nodo. Es una referencia relativa (dónde se endurece el juego), no una medida de dificultad humana.

## Variocolores (v0.7)

Cada Pokémon salvaje tiene 1/64 de ser **variocolor** (`src/run/shiny.js`, sin consumir el RNG de la corrida: la misma semilla da los mismos variocolores). Es solo cosmético: sprite shiny de Black/White, marca ✦ y brillo. Si derrotás uno en una ruta, siempre se ofrece para capturar. La marca se conserva al evolucionar y al guardar. Si falta el sprite shiny remoto, se muestra el normal con un tinte.

## Móvil en vertical (v0.7)

Hasta 640 px de ancho, el combate pone los rivales arriba, los aliados abajo (3 por fila) y la mano fija al pie con MAZO, DESC., ESCUDO y FIN TURNO en una fila. La guía arranca plegada. Todo el CSS móvil está en un bloque al final de `web/styles.css`.
