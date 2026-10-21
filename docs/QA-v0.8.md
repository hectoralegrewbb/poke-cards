# QA v0.8

- `npm test`: 141/141. Fuzz: 293 sin problemas. Determinismo: 0 de 80 divergen.
- Chromium (headless) escritorio 1280×800 y móvil 390×800: título, inicial, mapa, combate, modal de mazo (mover carta, contador 40–45, pestañas en móvil), panel de ajustes (sliders, tema), sin errores de página.
- Bug hallado y corregido en esta pasada: `threats` fuera de alcance en `renderCombat` (rompía el combate en UI).
- Pendiente de probar en tu dispositivo: audio real (el sandbox no tiene salida de sonido; se verificó contexto `running`, escenas y persistencia de ajustes).
- Pendiente: logros (segunda etapa).
