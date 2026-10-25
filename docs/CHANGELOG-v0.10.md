# v0.10.0 · El último viaje (final secreto)

## Lore
Amelie es la **Gardevoir** del jugador y Lina su **Froslass**. El entrenador muere al final de su viaje y Gardevoir, incapaz de soltarlo, crea con sus poderes **Panhea**: su recorrido por las cinco regiones, guardado. Quedarse es un bucle; irse a la fuerza es un final amargo; el final verdadero es dejarlo ir con ella.

## Final y requisitos
- Tras vencer al campeón (Poké World): **ESCAPAR** cura al equipo (Amelie no quiere ganar con ventaja) y combate contra su equipo.
- **Final secreto** (`story.secret`): si en ninguna pelea previa llevaste más de **2 legendarios** y llegas con **como máximo 1** en el equipo, Amelie se revela como Gardevoir. Lina cura al equipo y le da 4 de escarcha. Se combate contra Ralts, Kirlia y Gardevoir (`story.gardevoir`). Si no cumples, final "ESCAPASTE".
- **QUEDARME**: el juego se reinicia (misma semilla y dificultad, selección de inicial). Amelie y Lina recuerdan el bucle (`run.loop`, líneas `welcomeLoop` y `linaLoop`). Lina aparece triste.
- Nueva pista críptica de Lina a partir de la 7.ª medalla sobre quien llega "sin apoyarse en leyendas".

## Datos y motor
- `run.legendaryPeak` registra el máximo de legendarios llevados a una pelea normal (las de Amelie/Gardevoir no cuentan). Fases nuevas: `gardevoirIntro`. Estado nuevo: `loop`, `legendaryPeak` (guardados antiguos usan 0).
- Las escalas de enemigos de jefe pueden definirse por Pokémon.
- Balance (bot, final secreto simulado): Gardevoir ~73 % en Explorador (~11 turnos). El bot gana a Amelie un 11 % en Entrenador y un 45 % en Explorador.

## v0.10.1 · Atajo de prueba del final

Abrir `/web/?finale` en la URL inicia una partida de Poké World con 6 Pokémon fuertes y 8 medallas, directo en la escena de Amelie. No toca el guardado local.
- `?finale`: cumple el requisito del final secreto.
- `?finale=normal`: no lo cumple (se juega el final de escape).
- `?finale=gardevoir`: salta a la escena de Gardevoir y Lina.
