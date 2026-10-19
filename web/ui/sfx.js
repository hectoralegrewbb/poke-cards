// Efectos de sonido chiptune con Web Audio (sin archivos). Se silencian con el botón SND.
let audio = null;
let muted = false;
try {
  muted = localStorage.getItem("pokecards.muted") === "1";
} catch {
  muted = false;
}

function context() {
  if (!audio) {
    const Ctor = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctor) return null;
    audio = new Ctor();
  }
  if (audio.state === "suspended") audio.resume();
  return audio;
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
  oscillator.connect(gain).connect(ac.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

const sounds = {
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
    if (muted || !sounds[name]) return;
    try {
      sounds[name]();
    } catch {
      /* el audio nunca debe romper el juego */
    }
  },
  isMuted: () => muted,
  toggle() {
    muted = !muted;
    try {
      localStorage.setItem("pokecards.muted", muted ? "1" : "0");
    } catch {
      /* sin storage: solo vale para esta sesión */
    }
    return muted;
  }
};
