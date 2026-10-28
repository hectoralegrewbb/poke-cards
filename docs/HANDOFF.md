# Pokémon Dream — documento de traspaso (v0.12.2)

Para retomar el proyecto en un chat nuevo. Léelo entero antes de tocar código.

## 1. Qué es
Fan game roguelike táctico de cartas con combate por turnos, en navegador (JS vanilla, módulos ES). Sin fines de lucro, uso privado. Autor: Hector (Argentina). Un inicial, party de hasta 6, mazo 40–45 cartas, 8 gimnasios + Alto Mando + campeón; 649 especies (Gen I–V). Modo **Poké World** (`mode:"global"`) incluye la historia de la profesora Amelie (llamadas, final, final secreto Gardevoir).

- Repo: `~/poke-cards` (GitHub `hectoralegrewbb/poke-cards`, rama `main`). Se publica como sitio estático (`.nojekyll`).
- Node ≥ 20, sin dependencias. `npm test` (`node --test`), `npm start` (servidor en :8080, abrir `/web/`).

## 2. Cómo trabaja Hector (flujo de entrega)
- Edita desde el móvil con **Termux**. Se le entrega un **zip con nombre distinto cada vez** (Android agrega `-1`/`-2` a nombres repetidos), con los archivos en la raíz del zip (incluye `.gitignore` y `.nojekyll`).
- Pasos que ejecuta: descomprimir en `~/storage/downloads/761` → `cd ~/poke-cards` → `cp -rf ~/storage/downloads/761/. .` → `git add -A` → `git status --short` → commit → `git push`.
- Los archivos eliminados NO se borran con `cp -rf`; si hay que borrar, dar el `git rm` explícito.
- Commits terminan con las líneas de atribución que indique el sistema (`Co-Authored-By` y `Claude-Session`).
- Estado pendiente: el commit de v0.11.0 quedó con el mensaje equivocado "v0.9.1: profesora Amelie (Poké World)". Se ofreció `git commit --amend` + `git push --force-with-lease` y `git rm assets/story/amelie-error.webp` (opcional). **Sin respuesta aún.**

## 3. Preferencias del usuario (aplicar siempre)
- Español rioplatense, directo y técnico, sin explicaciones básicas. Cuestionar sus propuestas si hay fundamento; preguntar si falta contexto; no asumir tema en chats nuevos.
- Código: dar **bloques completos** al modificar; nombres en **lowerCamelCase**; modular, SOLID, sin sobre‑ingeniería. Leer archivos antes de editar, solución completa, probar una vez.
- Diálogo de historia en **tuteo neutro**; el resto de la UI está en **voseo** (ofrecido pasar todo a tuteo: sin respuesta).
- Es diseñador gráfico con posgrado UI/UX y programador de automatización industrial (TIA Portal, Node‑RED); hace gamedev como hobby.

## 4. Arquitectura
```
src/engine   motor puro (sin DOM ni fs): combate, daño, efectos, IA, estados, RNG determinista
src/run      capa de corrida: mapa, campaña, recompensas, tienda, tutor, historia, guardado
src/shared   i18n.js (t, setLanguage, localizeData, detectLanguage…), en.js (GENERADO), nationalDex.js
src/node     loadGameData.js (arma `data` en Node para tests/scripts)
src/tools    bots (greedy/smart) para simulación y balance
web/ui       interfaz DOM con h(); app.js es la app, main.js solo fija el idioma y luego importa app.js
data/*.json  balance, cards, moves, species, items, heldItems, campaigns, story, …
i18n/*.json  diccionarios EN (en.ui, en.data, en.story) → se compilan a src/shared/en.js
tools/       generadores y scripts de verificación (ver §7)
tests/       207 tests
```
- Guardado: clave `pokecards-dungeon-v2` (NO cambiar; conserva partidas), `saveVersion=1`. Preferencias: `pokemon-dream.lang`, `pokecards.textSpeed`, `pokecards.theme`; sessionStorage `pokemon-dream.resume`.
- Determinismo: la historia elige variantes con un hash de la semilla (`hashString`), nunca con el RNG de la corrida, para no alterar combates/mapas/recompensas.

## 5. Sistemas relevantes de v0.12
- **Historia** (`src/run/story.js`, `data/story.json`): líneas con `when`, `priority` (huecos por prioridad `{1:2,2:1,3:0}` nodos), `oncePer`, `chance`, `gift` y nuevo `requires` (la línea solo es elegible si el id requerido está en `run.storySeen`; así cada personaje se presenta antes de hablar). **`data/story.json` y `i18n/en.story.json` se generan con `tools/buildStory.py`: editar el script, no el JSON.** Helpers `T(es,en)` y `V((es,en),…)`.
- **Máquina de escribir** (`web/ui/typewriter.js`): el DOM se redibuja entero en cada cambio, por eso el avance se calcula con una marca de inicio por clave (`started` Map) + `requestAnimationFrame`. Clic completa; `isTyping/finishTyping` para los botones SIGUIENTE. `readingTimeMs(text, typingMs)` en `storyLog.js` suma el tiempo de escritura al de lectura de la llamada.
- **i18n**: el texto fuente en español ES la clave. En código: `t("Texto {x}", {x})`. `main.js` detecta idioma (preferencia guardada, si no `navigator.language`: es→es, otro→en), carga `en.js` por import dinámico **antes** de importar `app.js` (varios módulos llaman `t()` al importarse). Los datos del juego se traducen con `localizeData(data, dict)` (cualquier string que sea clave del diccionario). Cambiar idioma = guardar, marcar resume, `location.reload()`; `app.js` retoma la corrida. El registro de llamadas conserva el idioma de recepción.
- **Tutor de cobertura** (`src/run/moveTutor.js`, `data/balance.json → tutor`): `coverage[tipo]` da 5 tipos extra por tipo; `coverageCap=4`, repartidos round‑robin entre los tipos de la especie; solo se agregan movimientos que dañan. Validado en `validateData.js`. Filtro por tipo en `web/ui/tutorView.js`.
- **Portada** (`web/ui/titleWalkers.js`): 4 especies no legendarias al azar, sprites animados de PokeAPI, CSS keyframes, contenedor `position:fixed`.
- **Cartas con sprite (INACTIVO desde v0.12.2):** el autor retiró sus sprites por críticas al arte y las rehará. Hoy ninguna carta tiene `art`, así que se usa el diseño de texto con icono pixelado. El sistema sigue listo (`web/ui/cardSprite.js`, `web/cardSprites.css`): una carta con `"art": "<id>.png"` en `data/cards.json` y el PNG en `assets/cards/` se dibuja como sprite **18×30 px con marco**, SIEMPRE a escala entera (`--cs`: 5 escritorio, 3 móvil; big 7/5), sin deformar ni recortar el marco (requisito del autor). Clic = escribe el nombre encima; pulsación larga 450 ms = descripción (no juega la carta); en recompensas el texto va debajo.
- **Retratos de Amelie** (`assets/story/`, `web/ui/amelieArt.js`): 24 expresiones pixel art 276×292 generadas desde `tools/art/amelieSheet.jpg` con `tools/sliceAmelie.py` (mapa posición→nombre en el script). Nuevas utilizables: laugh, unsure, gasp, cheer, flustered, gloom, sad, nauseous (lista permitida en `tools/buildStory.py`). `glitch` es un retrato neutro con efecto CSS.
- **Piezas de estrella / tutor / objetos equipables / Comodín / llamadas**: ver `docs/CHANGELOG-v0.11.md`.

## 6. Reglas para modificar
1. Textos nuevos de UI: envolver con `t()` y agregar la línea `ES ||| EN` en `tools/i18n/ui1.txt` o `ui2.txt`; textos de datos (moves, items, pasivas…) en `tools/i18n/data.txt`; historia en `buildStory.py`. Luego `bash tools/rebuildI18n.sh`. `tests/i18n.test.js` falla si una clave queda sin traducir.
2. No envolver con `t()` identificadores (`event.key`, clases CSS, ids de datos) ni paths SVG.
3. Módulos que traducen en top level están bien porque el idioma se fija antes de importar `app.js`; no importar `app.js` desde otro lado.
4. Cambios de balance → correr `node scripts/balanceReport.js` y los scripts de §7.
5. Cada entrega: bump de versión (`package.json`, `web/errorBanner.js`), changelog en `docs/`, zip con nombre nuevo.

## 7. Verificación
```
npm test                                   # 207 tests (debe dar 0 fail)
node tools/fuzz.mjs $PWD                   # esperado: problems 0, crashes 0
node tools/determinism.mjs $PWD            # esperado: 0 de 80 no deterministas
bash tools/rebuildI18n.sh                  # regenera inglés (avisa MISSING)
node tools/e2eEnglishScan.mjs              # Playwright: recorre pantallas en EN y lista texto sospechoso en español
node tools/e2eCards.mjs                   # Playwright: cartas sprite en combate (clic = nombre, mantener = descripción) ES/móvil
node tools/e2eLanguageSwitch.mjs           # Playwright: cambia ES→EN en mitad de una corrida y verifica el resume
```
Los scripts Playwright asumen `npm start` activo y Playwright en `/opt/npm-tools/node_modules` con chromium en `/opt/pw-browsers/…` (entorno del sandbox; ajustar rutas en otro entorno). Falsos positivos esperados del escaneo: "ESPAÑOL", y frases en inglés con palabras como "it/no".

## 8. Pendiente / ideas
- Responder: ¿corregir el mensaje del commit v0.11.0? ¿quitar `assets/story/amelie-error.webp`? ¿pasar toda la UI a tuteo?
- Revisión visual manual del inglés en: pantalla de recompensa, modal de objetos equipados, escenas de Amelie/Gardevoir (el escaneo automático no las cubrió a fondo) y largo de textos en móvil (390 px).
- Retratos propios para Gardevoir/Froslass; diferenciar el diseño de Amelie si el juego se hace público.
- Sprites de cartas: los rehace el autor (ver arriba). Si vuelven, el deck editor, la tienda y el cofre siguen mostrando cartas como texto.
- Los scripts `tools/e2e*.mjs` y los dos `slice*.py` son de entorno de desarrollo (Playwright/Pillow/numpy).
- Logros (diferidos).
- Los sprites de la portada son el frente espejado, no ciclos de caminata reales.
- Revisar balance del tutor con el pool ampliado (`node scripts/balanceReport.js`).
- Mensajes de error de `src/run/saveGame.js` siguen en español (solo desarrollo).
