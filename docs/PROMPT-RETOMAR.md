# Prompt para retomar en un chat nuevo

Pegá esto como primer mensaje y adjuntá el zip más reciente del juego (o el repo):

---
Retomamos el proyecto **Pokémon Dream** (antes Pokécards Dungeon), mi fan game roguelike táctico de cartas en JS vanilla (ES modules, Node ≥ 20, sin dependencias). Está en v0.12.1.

Antes de hacer nada:
1. Leé `docs/HANDOFF.md` completo (arquitectura, reglas para modificar, flujo de entrega, pendientes) y `docs/CHANGELOG-v0.12.md`.
2. Corré `npm test` y confirmá que da 0 fallos (207 tests).
3. No asumas nada que no esté en esos documentos; si falta contexto, preguntame.

Cómo trabajamos:
- Respondé en español, directo y técnico. Cuestionime si tenés fundamentos para contradecirme.
- Al modificar código dame el **bloque/archivo completo**, nombres en lowerCamelCase, modular y SOLID, sin sobre‑ingeniería.
- Actualizo desde Termux: entregame un **zip con nombre distinto cada vez** (ej. `pokemon-dream-v0.12.1.zip`), archivos en la raíz del zip, más los comandos `cd ~/poke-cards` → `cp -rf ~/storage/downloads/761/. .` → `git add -A` → `git status --short` → commit → push. Si hay archivos a borrar, dame el `git rm` explícito.
- Todo texto nuevo debe quedar en español **e inglés** (flujo en HANDOFF §6). El idioma base es español; el selector ES/EN ya existe.
- Las cartas son sprites 18×30 px con marco, siempre a escala entera; no las deformes ni recortes el marco.
- No cambies la clave de guardado `pokecards-dungeon-v2`.

Pendientes que quiero decidir primero (preguntame): corregir el mensaje del commit v0.11.0 (`--amend` + `--force-with-lease`), borrar `assets/story/amelie-error.webp`, y si pasamos toda la UI a tuteo.

Lo que quiero trabajar ahora: <ESCRIBÍ ACÁ EL OBJETIVO DE LA SESIÓN>
---
