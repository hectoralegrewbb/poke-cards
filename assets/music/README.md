# Música propia (opcional)

Sin archivos acá, el juego usa sus temas chiptune originales (title, map, combat, boss).

Para usar tus propias pistas: copiá los archivos (.ogg / .mp3 / .wav) en esta carpeta y creá `tracks.json`:

```json
{
  "title": "titulo.ogg",
  "map": "ruta.ogg",
  "combat": { "file": "batalla.ogg", "loopStart": 12.5, "loopEnd": 98.2 },
  "boss": "jefe.ogg"
}
```

- Escenas: `title`, `map`, `combat`, `boss`. Las que no listes siguen con el tema generado.
- Loop sin cortes: se repite como buffer nativo. `loopStart`/`loopEnd` (segundos) son opcionales y sirven para pistas con intro. Preferí .ogg (los .mp3 pueden agregar un pequeño silencio al inicio/fin).
- Importante: la música de los juegos originales (Nintendo/Game Freak) tiene copyright. Si el repo/Pages es público, no la subas ahí; usá pistas propias, con licencia libre (CC0/CC-BY) o encargadas.
