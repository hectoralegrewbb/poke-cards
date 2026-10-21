// Efectos de sonido chiptune con Web Audio (sin archivos). El volumen y el mute viven en audioMixer.
import { mixer } from "./audioMixer.js";

function context() {
  return mixer.context();
}

function tone({ freq, to = freq, type = "square", duration = 0.08, volume = 0.05, delay = 0 }) {
  const ac = context();
  if (!ac) return;
  const start = ac.currentTime + delay;
  const oscillator = ac.createOscillator();
  const gain = ac.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, start);
  oscillator.frequency.linearRampToValueAtTime(to, start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(mixer.sfxBus());
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function noise({ duration = 0.12, volume = 0.05, delay = 0, freq = 1800, kind = "lowpass" }) {
  const ac = context();
  if (!ac) return;
  const start = ac.currentTime + delay;
  const length = Math.max(1, Math.floor(ac.sampleRate * duration));
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const source = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const gain = ac.createGain();
  source.buffer = buffer;
  filter.type = kind;
  filter.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter).connect(gain).connect(mixer.sfxBus());
  source.start(start);
}

// Un golpe por tipo: tonos y ruido cortos, distintos entre sí pero con el mismo volumen general.
const typeSounds = {
  normal: () => { noise({ duration: 0.07, freq: 2200 }); tone({ freq: 200, to: 100, duration: 0.1, volume: 0.06 }); },
  fire: () => { noise({ duration: 0.2, freq: 2600, volume: 0.06 }); tone({ freq: 220, to: 120, type: "sawtooth", duration: 0.16 }); },
  water: () => { tone({ freq: 500, to: 900, type: "sine", duration: 0.08, volume: 0.07 }); tone({ freq: 700, to: 1100, type: "sine", duration: 0.08, volume: 0.07, delay: 0.09 }); },
  grass: () => { noise({ duration: 0.09, freq: 3200, kind: "highpass", volume: 0.04 }); tone({ freq: 400, to: 620, type: "triangle", duration: 0.1 }); },
  electric: () => [1500, 700, 1700, 600].forEach((freq, i) => tone({ freq, type: "square", duration: 0.04, delay: i * 0.04, volume: 0.05 })),
  ice: () => { tone({ freq: 1400, to: 1900, type: "triangle", duration: 0.08 }); tone({ freq: 1900, to: 2300, type: "triangle", duration: 0.08, delay: 0.08 }); },
  fighting: () => { noise({ duration: 0.06, freq: 1800, volume: 0.07 }); tone({ freq: 150, to: 60, type: "square", duration: 0.12, volume: 0.07 }); },
  poison: () => [300, 220, 300, 200].forEach((freq, i) => tone({ freq, type: "sawtooth", duration: 0.07, delay: i * 0.06, volume: 0.04 })),
  ground: () => { noise({ duration: 0.2, freq: 400, volume: 0.08 }); tone({ freq: 120, to: 50, type: "triangle", duration: 0.2, volume: 0.07 }); },
  flying: () => { noise({ duration: 0.18, freq: 1200, kind: "bandpass", volume: 0.05 }); tone({ freq: 800, to: 1200, type: "triangle", duration: 0.12, volume: 0.04 }); },
  psychic: () => [400, 800, 300].forEach((freq, i) => tone({ freq, type: "sine", duration: 0.1, delay: i * 0.08, volume: 0.06 })),
  bug: () => [800, 900, 800, 900].forEach((freq, i) => tone({ freq, type: "square", duration: 0.04, delay: i * 0.035, volume: 0.04 })),
  rock: () => { noise({ duration: 0.14, freq: 700, volume: 0.08 }); tone({ freq: 130, to: 70, type: "triangle", duration: 0.14, volume: 0.07 }); },
  ghost: () => { tone({ freq: 300, to: 600, type: "sine", duration: 0.16, volume: 0.05 }); tone({ freq: 450, to: 200, type: "sine", duration: 0.16, delay: 0.1, volume: 0.05 }); },
  dragon: () => { tone({ freq: 120, to: 60, type: "sawtooth", duration: 0.24, volume: 0.07 }); tone({ freq: 240, to: 130, type: "sawtooth", duration: 0.2, delay: 0.04, volume: 0.04 }); },
  dark: () => { tone({ freq: 180, to: 90, type: "sawtooth", duration: 0.16, volume: 0.07 }); noise({ duration: 0.08, freq: 900, volume: 0.04 }); },
  steel: () => { tone({ freq: 1100, to: 900, type: "square", duration: 0.07, volume: 0.05 }); tone({ freq: 1650, duration: 0.1, delay: 0.05, volume: 0.04 }); }
};

const sounds = {
  ...Object.fromEntries(Object.entries(typeSounds).map(([type, play]) => [`type:${type}`, play])),
  super: () => { tone({ freq: 500, to: 900, duration: 0.07, volume: 0.07 }); tone({ freq: 900, to: 1400, duration: 0.09, delay: 0.07, volume: 0.07 }); },
  passive: () => { tone({ freq: 880, type: "triangle", duration: 0.06, volume: 0.04 }); tone({ freq: 1320, type: "triangle", duration: 0.08, delay: 0.06, volume: 0.04 }); },
  cure: () => [660, 880, 1320].forEach((freq, i) => tone({ freq, type: "triangle", duration: 0.07, delay: i * 0.06 })),
  select: () => tone({ freq: 660, to: 880, duration: 0.06 }),
  pick: () => tone({ freq: 520, to: 700, duration: 0.07 }),
  deny: () => tone({ freq: 160, to: 110, type: "sawtooth", duration: 0.14, volume: 0.06 }),
  card: () => { tone({ freq: 440, to: 660, duration: 0.05 }); tone({ freq: 880, duration: 0.06, delay: 0.05 }); },
  hit: () => tone({ freq: 220, to: 70, duration: 0.14, volume: 0.07 }),
  crit: () => { tone({ freq: 300, to: 60, duration: 0.18, volume: 0.08 }); tone({ freq: 1200, to: 1800, duration: 0.1, delay: 0.1 }); },
  resist: () => tone({ freq: 180, to: 140, type: "triangle", duration: 0.12 }),
  heal: () => [523, 659, 784, 1046].forEach((freq, i) => tone({ freq, type: "triangle", duration: 0.09, delay: i * 0.07 })),
  shield: () => { tone({ freq: 330, to: 520, type: "triangle", duration: 0.12 }); tone({ freq: 660, duration: 0.1, delay: 0.1 }); },
  faint: () => tone({ freq: 400, to: 40, type: "triangle", duration: 0.5, volume: 0.07 }),
  victory: () => [523, 659, 784, 1046, 784, 1046].forEach((freq, i) => tone({ freq, duration: 0.12, delay: i * 0.11 })),
  defeat: () => [392, 330, 262, 196].forEach((freq, i) => tone({ freq, type: "triangle", duration: 0.2, delay: i * 0.18 })),
  start: () => [262, 330, 392, 523].forEach((freq, i) => tone({ freq, duration: 0.09, delay: i * 0.08 }))
};

export const sfx = {
  play(name) {
    if (mixer.get().muted || !sounds[name]) return;
    try {
      sounds[name]();
    } catch {
      /* el audio nunca debe romper el juego */
    }
  },
  isMuted: () => mixer.get().muted,
  toggle() {
    mixer.set({ muted: !mixer.get().muted });
    return mixer.get().muted;
  }
};
