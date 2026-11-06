// Substitui @/lib/game/rng nas ROTAS durante os testes: por padrão é o RNG criptográfico de verdade;
// um teste pode fixar a sorte com globalThis.__TEST_RNG__ = () => 0.99 (número entre 0 e 1).
import { randomInt } from "node:crypto";
const fixed = () => (globalThis as { __TEST_RNG__?: () => number }).__TEST_RNG__?.();
export const roll = (min: number, max: number) => { const f = fixed(); return f === undefined ? randomInt(min, max + 1) : min + Math.min(max - min, Math.floor(f * (max - min + 1))); };
export const chance = (p: number) => { const f = fixed(); return f === undefined ? randomInt(0, 1_000_000) < p * 1_000_000 : f < p; };
