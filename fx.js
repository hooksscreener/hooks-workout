// Small sounds and haptics, generated in code so there are no audio files to license.
// Browsers only allow audio after a tap, so unlockAudio() is called from the first touch.
let ctx = null;

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { ctx = new C(); } catch (e) { return null; }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function unlockAudio() { audio(); }

// One short pitched blip with a fast decay.
function blip(c, { freq, at = 0, dur = 0.12, gain = 0.25, type = "sine", attack = 0.003 }) {
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g); g.connect(c.destination);
  osc.start(t); osc.stop(t + dur + 0.02);
}

// Soft tick when a set is logged.
export function playClick() {
  const c = audio(); if (!c) return;
  blip(c, { freq: 1500, dur: 0.035, gain: 0.12 });
  blip(c, { freq: 900, dur: 0.05, gain: 0.08 });
}

// Three slow wood-block knocks, like the ten-second warning in a boxing match.
export function playWoodTriple() {
  const c = audio(); if (!c) return;
  [0, 0.7, 1.4].forEach((at) => {
    blip(c, { freq: 1050, at, dur: 0.09, gain: 0.5, type: "triangle" });
    blip(c, { freq: 1560, at, dur: 0.05, gain: 0.25 });
    blip(c, { freq: 420, at, dur: 0.12, gain: 0.3 });
  });
}

// A single bell: a few inharmonic partials that ring out.
export function playBell() {
  const c = audio(); if (!c) return;
  const base = 660;
  [[1, 0.35, 2.2], [2.76, 0.22, 1.5], [5.4, 0.12, 1.0], [8.93, 0.06, 0.6]].forEach(([mult, gain, dur]) => {
    blip(c, { freq: base * mult, dur, gain, attack: 0.004 });
  });
}

export function vibrate(pattern) {
  try { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* not supported (iPhone) */ }
}
export const VIBE = {
  click: 12,
  warning: [160, 440, 160, 440, 160], // three slow pulses
  done: [70, 70, 70],                 // two quick pulses
};
