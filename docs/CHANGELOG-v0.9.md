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
