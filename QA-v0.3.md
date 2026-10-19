# QA — Pokécards Dungeon v0.3

## Pruebas automatizadas

- Validación de referencias: especies, nacional Pokédex, ataques, estado/área, ítems, regiones y jefes.
- Pruebas del motor: movimiento grupal (Surf), inmunidad de Tierra (Terremoto), selección de fila (Avalancha), DOT de veneno, reducción física de quemadura, inmunidades, bloqueo de acción por retroceso propio/enemigo, casos de proc de movimientos con RNG controlado, EXP con medallas, inventario y guardado.
- Pruebas antiguas (73) mantenidas y 14 nuevas; suite de 87 casos.

## Simulación

- 120 semillas, Entrenador, bot heurístico mejorado: **2,4 medallas promedio y 0 campeones**. El bot ahora prioriza capturas cuando tiene equipo chico y valora ataques múltiples. No comparable directamente con los números v0.2, que usaban otro bot.

## Validación visual pendiente

- El navegador Chromium headless no devolvió una captura utilizable en este entorno. La interfaz fue modificada pero **no hay confirmación E2E visual**; se debe probar manualmente la trayectoria, carga de sprites en GIF y layout móvil.
- Checklist: atacar con Surf a 3 rivales, confirmar 3 trayectorias y 3 daños; Avalancha impacta solo la fila; usar Mordisco contra un enemigo que anuncie acción; revisar VEN/QUE durante DOT; curar con Antídoto/Antiquemar; alternar `prefers-reduced-motion`; guardar y reanudar combate con Pokémon envenenado; cargar GIF nuevos de Gen 5.
- Testear una corrida nueva: un Pokémon no debería alcanzar la tercera evolución antes de obtener 5 medallas por vía de EXP.
