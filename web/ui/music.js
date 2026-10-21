// Música de fondo por escena. Dos fuentes, siempre sin cortes al repetir:
//  1) archivos propios opcionales listados en assets/music/tracks.json (loop de buffer, sin hueco);
//  2) temas chiptune originales generados con Web Audio (planificados por reloj de audio, no por setTimeout).
// Un solo "voice" activo a la vez: cambiar de escena lo desvanece, así nunca se superponen loops.
import { mixer } from "./audioMixer.js";

const manifestUrl = "../assets/music/tracks.json";
const musicBase = "../assets/music/";
const fadeSeconds = 0.6;
const lookahead = 0.25;

const noteIndex = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
function midi(token) {
  const match = /^([a-g])(#|b)?(\d)$/.exec(token);
  if (!match) return null;
  const [, letter, accidental, octave] = match;
  return 12 * (Number(octave) + 1) + noteIndex[letter] + (accidental === "#" ? 1 : accidental === "b" ? -1 : 0);
}
const frequency = (token) => { const note = midi(token); return note === null ? null : 440 * 2 ** ((note - 69) / 12); };
const pattern = (text) => text.replace(/\|/g, " ").trim().split(/\s+/);

// Temas originales. Cada token = un paso (corchea); "-" = silencio.
const themes = {
  title: { bpm: 96, leadType: "triangle", leadVolume: 0.07, bassType: "triangle", bassVolume: 0.08,
    lead: pattern("e5 - g5 - c6 - g5 - | d5 - f5 - a5 - f5 - | e5 - g5 - c6 - b5 - | a5 - g5 - e5 - c5 -"),
    bass: pattern("c3 - g3 - c3 - g3 - | d3 - a3 - d3 - a3 - | c3 - g3 - c3 - g3 - | f3 - c3 - g3 - g2 -") },
  map: { bpm: 118, leadType: "square", leadVolume: 0.045, bassType: "triangle", bassVolume: 0.09,
    lead: pattern("a4 c5 e5 c5 a4 c5 e5 g5 | g4 b4 d5 b4 g4 b4 d5 f5 | f4 a4 c5 a4 f4 a4 c5 e5 | e4 g#4 b4 g#4 e4 b4 e5 -"),
    bass: pattern("a2 - a2 - a2 - e3 - | g2 - g2 - g2 - d3 - | f2 - f2 - f2 - c3 - | e2 - e2 - e2 - e3 -") },
  combat: { bpm: 152, leadType: "square", leadVolume: 0.045, bassType: "triangle", bassVolume: 0.1,
    lead: pattern("e5 e5 - g5 e5 - b4 - | d5 d5 - f5 d5 - a4 - | c5 c5 - e5 c5 - g4 - | b4 d5 e5 g5 b5 - - -"),
    bass: pattern("e2 e2 e3 e2 e2 e3 e2 e3 | d2 d2 d3 d2 d2 d3 d2 d3 | c2 c2 c3 c2 c2 c3 c2 c3 | b1 b1 b2 b1 b1 b2 b1 b2") },
  boss: { bpm: 164, leadType: "sawtooth", leadVolume: 0.035, bassType: "triangle", bassVolume: 0.1,
    lead: pattern("b4 - b4 c5 b4 - f4 - | a4 - a4 bb4 a4 - e4 - | g4 - g4 ab4 g4 - d4 - | f#4 a4 c5 eb5 f#5 - - -"),
    bass: pattern("b1 b1 b2 b1 b1 b2 f2 b1 | a1 a1 a2 a1 a1 a2 e2 a1 | g1 g1 g2 g1 g1 g2 d2 g1 | f#1 f#1 f#2 f#1 f#1 f#2 c2 f#1") }
};

let desired = null;
let current = null; // { name, stop }
let manifest = null; // { escena: "archivo.ogg" | { file, loopStart, loopEnd } }
let manifestPromise = null;
const buffers = new Map();

function loadManifest() {
  manifestPromise ??= fetch(manifestUrl).then((response) => (response.ok ? response.json() : {})).catch(() => ({})).then((json) => { manifest = json; return json; });
  return manifestPromise;
}

async function loadBuffer(ac, entry) {
  const file = typeof entry === "string" ? entry : entry.file;
  if (!buffers.has(file)) {
    buffers.set(file, fetch(musicBase + file).then((response) => {
      if (!response.ok) throw new Error(`No se pudo cargar ${file}`);
      return response.arrayBuffer();
    }).then((bytes) => ac.decodeAudioData(bytes)));
  }
  return buffers.get(file);
}

function createVoice(ac) {
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, ac.currentTime);
  gain.gain.linearRampToValueAtTime(1, ac.currentTime + fadeSeconds);
  gain.connect(mixer.musicBus());
  let stopped = false;
  const cleanups = [];
  return {
    gain,
    get stopped() { return stopped; },
    onStop(fn) { cleanups.push(fn); },
    stop() {
      if (stopped) return;
      stopped = true;
      const now = ac.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);
      cleanups.forEach((fn) => fn());
      setTimeout(() => gain.disconnect(), fadeSeconds * 1000 + 200);
    }
  };
}

function playFile(ac, voice, buffer, entry) {
  const source = ac.createBufferSource();
  source.buffer = buffer;
  source.loop = true; // loop nativo del buffer: sin huecos
  if (typeof entry === "object") {
    if (Number.isFinite(entry.loopStart)) source.loopStart = entry.loopStart;
    if (Number.isFinite(entry.loopEnd)) source.loopEnd = entry.loopEnd;
  }
  source.connect(voice.gain);
  source.start();
  voice.onStop(() => { try { source.stop(ac.currentTime + fadeSeconds + 0.1); } catch { /* ya detenido */ } });
}

function playTheme(ac, voice, theme) {
  const step = 60 / theme.bpm / 2;
  const length = theme.lead.length;
  let index = 0;
  let time = ac.currentTime + 0.08;
  const note = (token, type, volume, start, duration) => {
    const freq = frequency(token);
    if (freq === null) return;
    const oscillator = ac.createOscillator();
    const env = ac.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, start);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(env).connect(voice.gain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  };
  const tick = () => {
    if (voice.stopped) return;
    while (time < ac.currentTime + lookahead) {
      const slot = index % length;
      note(theme.lead[slot], theme.leadType, theme.leadVolume, time, step * 1.8);
      note(theme.bass[slot], theme.bassType, theme.bassVolume, time, step * 1.9);
      time += step;
      index += 1;
    }
  };
  tick();
  const timer = setInterval(tick, 60);
  voice.onStop(() => clearInterval(timer));
}

async function start(name) {
  const ac = mixer.context();
  if (!ac || ac.state !== "running") return;
  current?.stop();
  const voice = createVoice(ac);
  current = { name, stop: () => voice.stop() };
  const mine = current;
  const entry = (await loadManifest())?.[name];
  if (current !== mine) return; // cambió la escena mientras se cargaba
  if (entry) {
    try {
      const buffer = await loadBuffer(ac, entry);
      if (current !== mine) return;
      playFile(ac, voice, buffer, entry);
      return;
    } catch { /* si el archivo falla, cae al tema generado */ }
  }
  if (current === mine && themes[name]) playTheme(ac, voice, themes[name]);
}

function sync() {
  if (desired === null) { current?.stop(); current = null; return; }
  if (current?.name === desired) return;
  start(desired);
}

let unlocked = false;
function unlock() {
  const ac = mixer.context();
  if (!ac) return;
  ac.resume().then(() => { unlocked = true; sync(); }).catch(() => {});
}
["pointerdown", "keydown", "touchend"].forEach((type) => window.addEventListener(type, () => { if (!unlocked) unlock(); }, { passive: true }));

export const music = {
  // Escenas válidas: title, map, combat, boss. Cualquier otra (o null) apaga la música.
  setScene(name) {
    const next = themes[name] ? name : null;
    if (next === desired) return;
    desired = next;
    if (unlocked) sync();
  },
  scene: () => desired
};
