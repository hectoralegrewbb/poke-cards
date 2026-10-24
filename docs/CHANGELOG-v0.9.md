# v0.9.0

## Menús y carga
- **Pantalla de carga** de 6,5 s con barra: acelera (curva cuadrática) hasta el 90 % en el 40 % del tiempo y el tramo final avanza lento hasta completar. `web/ui/loadingCurve.js` (con test) y `loadingScreen.js`. `?fastload` la acorta para pruebas.
- **Inicio** limpio: nombre, INICIAR, OPCIONES (audio/tema) y FAQ; CONTINUAR aparece si hay partida guardada.
- **INICIAR → tipo de aventura:** REGIÓN o POKÉ WORLD (modos regional/global del motor) → submenú propio (región, dificultad, semilla) → elegir inicial.
- **FAQ** (`faqContent.js`): de qué va el juego, modos, reglas rápidas, quién lo hace, aviso de fan game, guardado.

## Juego
- **Técnicas LIBRE no consumen** las cartas cargadas ni las usan como refuerzo (`splitCharge`); el aviso aparece en el prompt.
- **Centro Pokémon:** una vez por ruta (inicio → gimnasio), siempre en el 3.º o 4.º evento (`pokeCenterStep`, determinista por semilla y etapa, sin consumir el RNG). Reemplaza la segunda opción de ese paso; cura y revive a party y caja, quita estados.
- **Cartas nuevas:**
  - **Revivir** (objetivo: aliado debilitado): vuelve con 50 % de PS, actúa desde el próximo turno.
  - **Baya Zidra** (aliado): el próximo golpe letal del combate, incluido el daño por veneno/quemadura, lo deja con 1 PS y se consume.
  - **Buscador** (lupa): elegís una carta de la pila de robo y pasa a la mano. Máximo 2 en el mazo activo (`maxInDeck`); la tercera va al cofre.
- Arte flat propio para las 3 cartas y el Centro Pokémon.

## Fixes
- Faltaba el ícono `potion` tras quitar los PNG: fallback a `star` y test `uiIcons` que valida todos los nombres de ícono.

## Balance (proxy, 200 corridas)
Regional/entrenador 25 % (antes 21 %), global 23 %, explorador 79 % (antes 73 %). El bot usa Revivir y Baya Zidra pero no el Buscador.

## v0.9.1 · Profesora Amelie (solo Poké World)

- **Historia híbrida**: Amelie, investigadora de Panhea, ofrece el primer Pokémon, da consejos en mapa/combate/captura/Centro y aparece una sola vez por cada diálogo (`data/story.json`, `run.storySeen`). Tres capas según medallas: cálida (0–1), pistas sutiles con glitch (2–5) y posesiva (6–8).
- **Final**: al vencer al campeón en Poké World se abre la escena de Amelie con dos elecciones: *ESCAPAR Y ENFRENTARLA* (combate contra su equipo psíquico/siniestro: Absol, Gallade, Bisharp, Xatu, Alakazam, Hydreigon; escala 1.65/1.3) o *QUEDARME EN PANHEA* (final alternativo). Modo Región queda clásico, sin historia.
- **Retrato**: busto flat en capas SVG con 5 expresiones (neutral, sonrisa, preocupada, glitch, oscura) y parpadeo/glitch en CSS. Para usar tu arte: `assets/story/manifest.json` (ver `assets/story/README.md`); sin archivos se usa el SVG.
- Guardado: `storySeen`, `ending` y fase `amelieIntro` (compatibles con guardados anteriores). Bots resuelven la escena eligiendo escapar.
- Balance (bot, entrenador/global): Amelie ≈ campeón en dificultad. Tests 158/158, fuzz 294 sin problemas, determinismo 0/80.
