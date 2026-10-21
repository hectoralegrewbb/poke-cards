// Mezclador único: un AudioContext, tres buses (master → música / efectos) y ajustes persistentes.
const storageKey = "pokecards.audio";
const defaults = Object.freeze({ master: 0.8, music: 0.5, sfx: 0.8, muted: false });

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (saved) return { ...defaults, ...saved };
    if (localStorage.getItem("pokecards.muted") === "1") return { ...defaults, muted: true }; // migra el SND OFF viejo
  } catch { /* storage bloqueado o JSON dañado */ }
  return { ...defaults };
}

const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));
const settings = loadSettings();
const listeners = new Set();
let audio = null;
let buses = null;

function applyGains() {
  if (!buses) return;
  const now = audio.currentTime;
  buses.master.gain.setTargetAtTime(settings.muted ? 0 : settings.master, now, 0.03);
  buses.music.gain.setTargetAtTime(settings.music, now, 0.03);
  buses.sfx.gain.setTargetAtTime(settings.sfx, now, 0.03);
}

export const mixer = {
  // Crea (o reanuda) el contexto. Debe llamarse desde un gesto del usuario la primera vez.
  context() {
    if (!audio) {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return null;
      audio = new Ctor();
      buses = { master: audio.createGain(), music: audio.createGain(), sfx: audio.createGain() };
      buses.music.connect(buses.master);
      buses.sfx.connect(buses.master);
      buses.master.connect(audio.destination);
      applyGains();
      document.addEventListener("visibilitychange", () => {
        if (!audio) return;
        if (document.hidden) audio.suspend(); else audio.resume();
      });
    }
    if (audio.state === "suspended" && !document.hidden) audio.resume();
    return audio;
  },
  musicBus: () => { mixer.context(); return buses?.music ?? null; },
  sfxBus: () => { mixer.context(); return buses?.sfx ?? null; },
  get: () => ({ ...settings }),
  set(patch) {
    for (const key of ["master", "music", "sfx"]) if (key in patch) settings[key] = clamp01(patch[key]);
    if ("muted" in patch) settings.muted = Boolean(patch.muted);
    applyGains();
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch { /* solo vale para esta sesión */ }
    listeners.forEach((listener) => listener({ ...settings }));
  },
  onChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }
};
