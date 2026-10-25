# v0.11.0 · Llamadas, niveles, objetos y tutor

Última actualización antes de la pausa de una semana para que lo prueben otras personas.

## 1. Diálogos como "videollamada" + campanita
- Los diálogos ya no son un globo que se queda: salen como **llamada** (retrato en vivo, subtítulos, barra de tiempo). Se cortan solos en un tiempo proporcional al texto (4,5 a 14 s) y también se cierran con **OK ✓** / ✕.
- En combate solo aparecen al empezar **tu turno** (nunca durante la resolución ni con el combate cerrado). Si cambiás de pantalla, la llamada vieja se corta.
- Cada llamada queda en `run.storyLog` (máx. 40, se guarda con la partida). Si no la atendiste (se cortó sola) queda **sin leer**: la **campanita** 🔔 muestra el número y abre el **registro de llamadas** (al cerrarlo se marcan leídas).
- Móvil: ventana compacta arriba para no tapar el campo de batalla.

## 2. Niveles de poder (Nv.)
- `src/engine/level.js`: nivel derivado de PS máx. + 4 estadísticas (`(0,6·PS + ATQ + DEF + ESP + DEFE − 20) · 1,1`). Misma fórmula para aliados y enemigos, con la escala de dificultad ya aplicada.
- Se ve en el panel de equipo, en las placas de combate (los rivales se colorean contra el promedio de tu equipo) y en el **mapa**: cada destino muestra `RIVAL ≈Nv.X · TU EQUIPO Nv.Y`. La estimación arma el encuentro con una copia del RNG, así que coincide con el combate real y no altera la partida.
- Colores: verde (más débil), amarillo (parejo), naranja (más fuerte, +15 %), rojo (mucho más fuerte, +40 %).
- **Amelie rebalanceada**: escala `hp ×1,3 / stats ×1,18` (antes 1,65 / 1,3). Bot en Entrenador: ~97 % la ruta normal y ~56 % la ruta del final secreto (antes ~55 % y ~37 %). Gardevoir sin cambios (~70 %).

## 3. Retratos de Amelie
- La cara verde pasó a llamarse **`sick`** (mareo) y solo se usa en una línea nueva (`hint5`, Centro Pokémon con 6-7 medallas). Reasignados: "No… te… vas… a ir" (turno 7) → `dark`; aviso del campeón (turno 8) y revelación "este mundo lo escribí yo" → `glitch` (sonrisa torcida); "Qué lindo verte pelear…" → `gentle`; Gardevoir paso 1 → `shock`.
- Archivo renombrado: `assets/story/amelie-error.webp` → `amelie-sick.webp` (borrar el viejo con `git rm` es opcional).

## 4. Comodín
- Una carta **paga cualquier técnica por sí sola** (`fillsAnyCost`, energyValue 9) y sigue reforzando x2. El pago automático solo la gasta si la energía normal no alcanza. **Máximo 5 por mazo** (`maxInDeck`). Precio en tienda 25 → 40.

## 5. Objetos equipables (29, únicos)
- `data/heldItems.json`. Cada objeto existe **una sola vez por partida** y lo lleva un solo Pokémon. Se equipan fuera de combate (botón OBJETO en cada miembro, o ◆ en la cabecera del panel).
- Efectos: Restos, Vidasfera, Banda Focus, Cinta Experto, Banda Fuerte, Gafas Pro, Chaleco Asalto, Casco Dentado, Baya Aranja, Cristal Barrera, Concha Campana, Garra Rápida, Moneda Amuleto, Huevo Suerte, Lente Zoom, Baya Zanama, Pañuelo Sabio, Dado Pionero, Banda Furia, Pendiente Afín, Garra Crítica, Armadura Piedra, Garra Ígnea, Colmillo Tóxico, Cascabel Suerte, Globo Escudo, Pluma Curativa, Pesa Pesada, Bola Libre.
- Motor: modificadores de daño (`heldItems.js`, puro) y disparadores `combatStart / turnStart / onHit / onDamaged / onKO` (`heldTriggers.js`) que reutilizan el registro de efectos (nuevos: `healFromDamage`, `selfDamage`, `damageAttacker`, `focusSash`; `heal` acepta `fraction`).
- Cómo se consiguen (`balance.heldDrops`): gimnasio 100 %, rival/villano/legendario 60 %, Alto Mando 50 %, élite 30 %, combate 10 %, zona salvaje 0 %; la tienda ofrece 1. El nivel del objeto (1-3) depende de las medallas (0-2 / 3-5 / 6+; la tienda adelanta uno).

## 6. Piezas de estrella y tutor de técnicas
- Tras cada victoria: tirada de **1 a 10** piezas con pesos decrecientes (media ≈ 2,7); élite x2 tiradas, gimnasio/Alto Mando/legendario x3 (se queda la mejor). **Zona salvaje (captura): 0.** Contador en el panel de equipo.
- **Tutor** en el campamento (no gasta la acción de descansar/revivir/entrenar): reemplazá cualquiera de las 4 técnicas por una aprendible. Costo 1-5 piezas: `1 + costo de energía (+1 si poder ≥ 11)`. Sin límite de cambios.
- Aprendibles: técnicas de sus tipos, de tipo Normal y las de su familia evolutiva (≈17 por Pokémon). Las técnicas enseñadas **se conservan al evolucionar**.

## Datos, guardado y pruebas
- Nuevos campos de run con valores por defecto para guardados viejos: `storyLog`, `storyLogSeq`, `heldOwned`, `starPieces`; Pokémon: `heldItem`.
- 195 tests, fuzz 295 chequeos sin problemas (con invariantes nuevas de objetos/piezas/técnicas), determinismo 0/80.
- Balance (bot, 600 corridas, Poké World): campeón 77 % Explorador · 23 % Entrenador · 2 % Experto (sin cambios respecto a v0.10).
