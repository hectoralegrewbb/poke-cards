# QA v0.8

- `npm test`: 141/141. Fuzz: 293 sin problemas. Determinismo: 0 de 80 divergen.
- Chromium (headless) escritorio 1280×800 y móvil 390×800: título, inicial, mapa, combate, modal de mazo (mover carta, contador 40–45, pestañas en móvil), panel de ajustes (sliders, tema), sin errores de página.
- Bug hallado y corregido en esta pasada: `threats` fuera de alcance en `renderCombat` (rompía el combate en UI).
- Pendiente de probar en tu dispositivo: audio real (el sandbox no tiene salida de sonido; se verificó contexto `running`, escenas y persistencia de ajustes).
- Pendiente: logros (segunda etapa).

## v0.8.2
- Combate real con enemigo a 1 PS: `result` a ~72 ms, `.overlay` a ~1,9 s.
- Sin 404 ni errores de página en desktop 1000×760 y móvil 390×780 (título, mapa, combate).
- `node --test` 143/143, fuzz 291 chequeos sin problemas, determinismo 0/80, balance regional 21%.
