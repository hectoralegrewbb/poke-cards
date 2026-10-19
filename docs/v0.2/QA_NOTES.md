# Validación técnica v0.2

- **Node.js:** suite `npm test` completada con 73 casos aprobados, 0 fallidos.
- **Sintaxis:** comprobados `web/ui/main.js`, `web/ui/combatView.js`, `web/ui/spriteProvider.js`, `src/run/saveGame.js` y `scripts/downloadSprites.js` con `node --check`.
- **Simulación:** 150 corridas deterministas por preset; resultados detallados en `DESIGN_REVIEW.md`.
- **Servidor:** respuesta HTTP 200 desde `/web/` usando el servidor estático del proyecto.
- **Sprites:** validados por tests los identificadores para las 62 especies y las rutas front/back GIF/PNG. **No se descargaron aquí los archivos binarios** por falta de salida a Internet en el entorno de pruebas. El comportamiento real de red debe verificarse con un navegador conectado.
- **QA visual:** intentado Chromium headless; quedó bloqueado por el entorno de ejecución, así que **no hay captura de pantalla validada**. Es necesario hacer una pasada manual desktop/móvil antes de considerar la UI terminada.

## Checklist manual recomendado

1. Abrir la portada, elegir cada dificultad, regresar desde el selector de inicial y comprobar los GIF de 5 generaciones.
2. Entrar en zona salvaje con un inicial: comprobar sprite posterior, intención enemiga, selección por defecto, técnica LIBRE, consumo de cartas y escudo.
3. En móvil: deslizar la mano horizontalmente; comprobar que arrastrar cartas y seleccionar con toque sigue funcionando.
4. Recargar durante el combate y continuar desde la portada: comprobar PS, cartas en mano, objetivos y reproducibilidad de la semilla.
5. Terminar una batalla, aceptar captura/recompensa, comprar, evolucionar y comprobar que la partida continúa tras reiniciar el navegador.
6. Probar un GIF intencionalmente inaccesible para verificar PNG local/placeholder y auditar consola de red.

## Siguientes riesgos a cubrir

Pruebas visuales E2E, estrés del tamaño de `localStorage` en corridas extensas, balance humano por etapas y permiso de uso de la propiedad intelectual de Pokémon para cualquier distribución pública.
