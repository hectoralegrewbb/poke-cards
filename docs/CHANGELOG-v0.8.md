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
