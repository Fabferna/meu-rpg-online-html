"use client";
// Efeitos sonoros sintetizados com Web Audio (sem arquivos de áudio).
// O som só começa após um clique do jogador (regra dos navegadores).

const KEY = "aethelgard:muted";
let ctx: AudioContext | null = null;
let muted = (() => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } })();

export const isMuted = () => muted;
export function setMuted(v: boolean) {
  muted = v;
  try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* ignora */ }
}

function ac() {
  if (typeof window === "undefined") return null;
  ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.15, delay = 0, slideTo?: number) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.2, filter = 1800, delay = 0) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = filter;
  const g = a.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination); src.start(t);
}

const SOUNDS = {
  hit: () => { noise(0.12, 0.25, 1400); tone(140, 0.12, "square", 0.08, 0, 70); },
  crit: () => { noise(0.2, 0.35, 3000); tone(220, 0.25, "sawtooth", 0.1, 0, 60); tone(880, 0.15, "triangle", 0.08, 0.03); },
  hurt: () => { noise(0.15, 0.2, 700); tone(110, 0.2, "square", 0.07, 0, 55); },
  miss: () => { noise(0.18, 0.08, 5000); tone(600, 0.15, "sine", 0.04, 0, 1200); },
  skill: () => { tone(330, 0.35, "sawtooth", 0.06, 0, 990); tone(660, 0.3, "triangle", 0.06, 0.05, 1320); noise(0.25, 0.15, 4000, 0.1); },
  heal: () => { [523, 659, 784].forEach((f, i) => tone(f, 0.25, "sine", 0.08, i * 0.06)); },
  defend: () => { tone(200, 0.2, "triangle", 0.1); tone(300, 0.2, "triangle", 0.06, 0.02); },
  coin: () => { tone(988, 0.08, "square", 0.05); tone(1319, 0.25, "square", 0.05, 0.08); },
  victory: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.6 : 0.18, "triangle", 0.1, i * 0.13)); },
  defeat: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, "sine", 0.09, i * 0.2)); },
  levelup: () => { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, "square", 0.05, i * 0.07)); },
  click: () => tone(700, 0.04, "square", 0.03),
} as const;

export type Sfx = keyof typeof SOUNDS;
export function play(name: Sfx) {
  if (muted) return;
  try { SOUNDS[name](); } catch { /* áudio indisponível */ }
}
