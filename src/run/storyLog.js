// Registro de llamadas: cada diálogo que se muestra queda guardado en la corrida (sin DOM, sin azar).
// Un diálogo es "no leído" hasta que el jugador lo cierra a mano o lo revisa en la campanita.
export const storyLogLimit = 40;

export function logStoryLine(run, line) {
  const log = (run.storyLog ??= []);
  run.storyLogSeq = (run.storyLogSeq ?? 0) + 1;
  const entry = { seq: run.storyLogSeq, id: line.id, speaker: line.speaker, expression: line.expression, name: line.name, text: line.text, gift: line.gift ?? null, read: false };
  log.push(entry);
  // Si se pasa del tope se descartan primero los ya leídos más viejos.
  while (log.length > storyLogLimit) {
    const index = log.findIndex((item) => item.read);
    log.splice(index === -1 ? 0 : index, 1);
  }
  return entry;
}

export const unreadStoryCount = (run) => (run.storyLog ?? []).filter((entry) => !entry.read).length;

export function markStoryRead(run, seq = null) {
  for (const entry of run.storyLog ?? []) if (seq === null || entry.seq === seq) entry.read = true;
}

// Tiempo de lectura de una llamada: proporcional al texto, con mínimo y máximo.
// typingMs es lo que tarda en escribirse el texto (velocidad del jugador): se suma para que dé tiempo a leerlo.
export function readingTimeMs(text, typingMs = 0) {
  return Math.min(14000, Math.max(4500, 2500 + text.length * 55)) + typingMs;
}
