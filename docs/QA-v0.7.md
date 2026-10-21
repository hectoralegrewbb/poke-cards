# QA v0.7

- `npm test`: 125/125.
- Fuzz (291 combates) sin problemas ni diferencias de guardado; determinismo 0/80 divergentes.
- Chromium (Playwright) en 1280×800 y 390×844: título, inicial, mapa, combates por clics, recompensas, tienda y campamento sin errores de juego. Los avisos de consola son externos: fuentes de Google bloqueadas en el entorno de prueba y `assets/sprites/manifest.json` opcional.
- Combate de gimnasio 4 vs 6 en 390×844 revisado con capturas.
- Sin probar en dispositivo real: el drag & drop táctil, el audio en iOS (requiere un toque previo) y el comportamiento con la barra de direcciones del navegador móvil.
- Pendiente: curar a mano los sets de las 420 especies importadas que más te importen.
