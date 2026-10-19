# QA v0.6

- `npm test`: 113/113.
- Determinismo: misma semilla con datos compartidos, 0/80 corridas divergentes.
- Guardado/restauración a mitad de combate: mismo desenlace (test automático).
- Recorrido en Chromium (Playwright) por título, inicial, mapa y combates por clics: sin errores de consola.
- Balance: ver `npm run balance`. Los números son de un bot, sirven para comparar etapas entre sí.
- Pendiente: sincronizar la Pokédex real (`npm run dex:sync`, 420 especies sin importar) y balancear por región.
