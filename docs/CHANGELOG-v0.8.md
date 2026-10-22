# Pokécards Dungeon v0.8 — Mazo/cofre, eventos sin riesgo de muerte, audio y tema moderno

## Combate
- **Rivales con ataques múltiples:** el motor ya golpeaba a varios aliados con las técnicas de área/fila (`targetMode`); no era un bug. Ahora la UI lo muestra: marca ⚠ con el daño total anunciado sobre cada aliado (`getIncomingThreats`), intención "ÁREA"/"FILA", etiqueta CC.
- **Ataques que "no llegan":** es diseño original (las técnicas cuerpo a cuerpo `range: melee` solo alcanzan la fila frontal). Ahora se ve: etiqueta CC en el menú, aliados/rivales fuera de alcance atenuados con aviso.
- **Ataque del propio tipo garantizado:** toda especie tiene al menos una técnica de daño de cada uno de sus tipos (`scripts/moveRules.js`, validado en `validateData`). Ej.: Garchomp tiene ataque Dragón.

## Eventos opcionales
- Rival, grupo villano y legendario **no matan la corrida**: si perdés, el equipo vuelve a como estaba (PS, estados, debilitados) y no hay recompensa. Solo ganando se recibe el premio. El legendario "huye" y el hito se da por cumplido.

## Mazo y cofre
- Todas las cartas obtenidas se guardan: si el mazo activo está lleno (45) la carta va al **cofre**.
- Nuevo **editor de mazo** (botón MAZO en el panel lateral): dos listas, mover cartas una a una. Mazo válido: 40–45; si es inválido no se puede avanzar de nodo. No se edita en combate.
- Guardados anteriores cargan con cofre vacío.
- **Moneda de la suerte (trébol):** funcionaba (quita una moneda al próximo tiro de crítico: 12,5% → 25% con 3 monedas) pero no se veía. Ahora la carta lo explica y el HUD muestra "SUERTE xN". Test de tasa de crítico.

## Audio
- Mezclador único (`audioMixer.js`): volumen general / música / efectos + silencio, persistente. Panel ⚙ AJUSTES.
- Música (`music.js`): temas chiptune originales (título, mapa, combate, jefe) planificados con el reloj de audio → sin cortes ni loops superpuestos; un solo "voice" activo con fundido entre escenas. Se pausa con la pestaña oculta.
- Pistas propias opcionales en `assets/music/tracks.json` (loop nativo de buffer, `loopStart`/`loopEnd`). Ver `assets/music/README.md`.
- **Música de los juegos originales: no incluida** (copyright; el repo/Pages es público).

## Estética
- Nuevo tema **moderno** (por defecto): paneles claros, bordes redondeados, botones 3D, barras de PS tipo juego, tipografía Fredoka autohospedada (`web/fonts`, licencia OFL). Sin scanlines ni paleta neón. El tema **pixel** original sigue disponible desde ⚙ AJUSTES. Las fuentes ya no dependen de Google Fonts.
- Corregido: texto "null" suelto en la pantalla de título.

## Calidad
- Tests: 141 (nuevos: `ownTypeMoves`, `optionalEvents`, `deckManager`, `luckyCoin`, `incomingThreats`). Fuzz 293 sin problemas; determinismo 0/80.
- Balance (bot razonable, 200 corridas): Entrenador regional campeón 21%, global 21%, Explorador 70%, Experto 1%. El bot ahora gestiona el cofre (`optimizeDeck`). Referencia relativa, no dificultad humana.

## v0.8.1 (revisión móvil y legendarios)
- **Combate en móvil:** rivales arriba y tus Pokémon abajo (columnas explícitas en el DOM, ya no dependen de `order`); plates, diálogo y menú compactados para que todo entre sin scroll en 411×740; el menú de técnicas se trae a la vista al elegir un aliado. Insignias de amenaza reubicadas.
- **Legendarios:** no hay tope de uso (party/caja aceptan cualquier cantidad; test). El límite real era que solo aparecían 2 por corrida (eventos de 3 y 6 medallas). Ahora el resto del pool de la región/modo puede aparecer como ruta opcional (20% por paso desde la 1.ª medalla, sin repetir); capturar es seguro al vencer y huir no cuesta nada ni consume el paso.
- **"Técnicas que no aparecen":** no se reprodujo un fallo de lógica (menú verificado con toques reales en los 649 especies y en todos los aliados). La causa más probable era que el menú quedaba fuera de pantalla bajo 4 filas apiladas; corregido. Si persiste, pasame los pasos exactos.
- Fuzz: se eliminó el invariante antiguo "máx. 1 legendario".
- Balance bot (200 corridas): regional 21%, global 22%, Explorador 73%, Experto 2%.
- Corregido: la tarjeta COMBATE del mapa ocupaba toda la pantalla en móvil (la clase `.combat` del nodo chocaba con la del combate); ahora los estilos de combate se aplican solo a `section.combat`.

## v0.8.2 · sprites y pausa de resultado

- **Iconos 16×16** (estrella, energía, caramelo, bola arcoíris, espada, corazón, poción) en `assets/ui/`, usados por `pixelIcons.js` (`imageIcons`).
- **Ítems** recortados de la hoja de ítems en `assets/items/` (14 PNG), mostrados con `itemIcons.js` en mochila, tiendas y recompensas. Si falta un PNG, la imagen se oculta sola.
- **Efectos de movimiento** (hoja RS) recortados en `assets/fx/` (10 PNG); los proyectiles usan sprite según tipo (`projectileSprites` en `effects.js`).
- **Pausa de resultado**: el cartel de VICTORIA/DERROTA aparece 1,8 s después de resolverse el último golpe (`resultDelayMs` en `combatView.js`). Verificado con combate real: resultado a 72 ms, cartel a ~1,9 s.
- **No aplicado**: hojas de íconos Gen3/Gen5 (grilla irregular, ya hay sprites completos), hoja UI BW2 (choca con el tema claro) y barras HP BW2 (se emulan con CSS si se quiere).
- **Copyright**: los sprites son assets de Nintendo/Game Freak extraídos por terceros. Están aislados en `assets/ui`, `assets/items` y `assets/fx`; borrar esas carpetas deja el juego funcional (fallback a iconos pixel). Riesgo de repo público a cargo del autor.
- **Créditos de las hojas**: Neslug (efectos RS), Ploaj, PikachuMazzinga, GameMaster12.
- **Fix publicación**: `.gitignore` ignoraba toda la carpeta `assets/`, así que `git add -A` no subía los PNG (imágenes rotas en Pages). Ahora solo se ignora `assets/sprites/`. Además, si un PNG de ícono falla, vuelve al ícono vectorial.
