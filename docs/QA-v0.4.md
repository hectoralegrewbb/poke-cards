# QA — Pokécards Dungeon v0.4

## Comprobaciones

- Suite `node --test`: 95 pruebas (87 anteriores + 8 nuevas) aprobadas, sin fallos.
- Validador de datos: referencias correctas para especies, movimientos, gyms, ligas, legendarios, sprites, formas de captura y tablas de tipos.
- Regiones: test de identidad, orden de 8 líderes y Liga en los cinco destinos.
- Global: mismos equipos/sorteos para igual semilla; mezcla garantizada de las cinco regiones. Se corrigió una mutación de la lista compartida que alteraba la reproducibilidad.
- Eventos: hitos de 3 y 6 medallas, combate legendario de 1 objetivo, captura en recompensa, continuidad del primer nodo de la etapa siguiente y restricción de un legendario activo (incluido intercambio caja/party).
- Rival y Rocket: evolución del inicial con las medallas, contador de organizaciones y compatibilidad de teams.
- Guardado: snapshot de modo global, campañas, opciones, eventos y estado del RNG. Restauración básica de guardados v0.3.
- Daño: fórmula compartida de previsualización y ejecución para ataques de área, con tests del multiplicador de tipo.

## Simulación

Bot heurístico simplificado, 40 semillas por combinación (160 en total). No representa la dificultad para un jugador humano.

| Modo | Dificultad | Medallas promedio | 0 medallas |
|---|---|---:|---:|
| Regional sorpresa | Explorador | 3,38 | 0/40 |
| Regional sorpresa | Entrenador | 2,27 | 2/40 |
| Global | Explorador | 3,40 | 1/40 |
| Global | Entrenador | 2,13 | 6/40 |

No se validó el endgame en ninguna partida ganada por el bot. Se requieren pruebas con jugadores y refinamiento de composición de equipos.

## QA manual pendiente

- Seleccionar modo Regional/Global, alternar región y dificultad, escribir semilla, elegir inicial, jugar hasta primer gimnasio.
- Comprobar títulos de Kanto y Johto, rótulos de miembros de Liga, jugadores en 320/375 px y escritorio.
- Confirmar capturas legendarias tras medallas 3/6, rechazo de una captura, almacenamiento del segundo en la caja, límite al intercambiar.
- Confirmar daño previo y real con Surf contra tres enemigos, resistencia e inmunidad de doble tipo, cambio de objetivo y escudos.
- Comprobar gif front/back y su fallback PNG, FX de ataques, estado de movimiento reducido y audio.
- Continuar un guardado generado con v0.3 en etapa 4 y un guardado v0.4 en combate o recompensa.

## Bloqueo del entorno

El servidor Node entregó el frontend y `campaigns.json` correctamente. Chromium en modo headless se interrumpió por timeout al intentar obtener una captura: **no hay QA E2E visual confirmada**.
