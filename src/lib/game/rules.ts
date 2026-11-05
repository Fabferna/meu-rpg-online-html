// Regras de jogo puras (sem I/O). O servidor é a fonte da verdade:
// o cliente pode importar isto só para EXIBIR previsões (ex.: timer).
import { RACES, type Attributes, type RaceId } from "./data";

export const STARTING_GOLD = 50;

/** 1 ponto de energia a cada N segundos. */
export const ENERGY_REGEN_SECONDS = 180;

export function xpForNextLevel(level: number): number {
  return 50 + (level - 1) * 25;
}

export function baseAttributes(race: RaceId): Attributes {
  return { ...RACES[race].attributes };
}

export function maxHp(a: Pick<Attributes, "con">, level: number): number {
  return 50 + a.con * 8 + (level - 1) * 10;
}

export function maxEnergy(a: Pick<Attributes, "dex">, level: number): number {
  return 50 + a.dex * 2 + Math.floor((level - 1) / 5) * 5;
}

/**
 * Energia atual derivada do tempo do SERVIDOR. O jogador não consegue
 * acelerar nada mudando o relógio do navegador.
 */
export function currentEnergy(stored: number, updatedAt: Date, max: number, now: Date = new Date()) {
  if (stored >= max) return { energy: stored, nextPointInSec: 0 };
  const elapsed = Math.max(0, Math.floor((now.getTime() - updatedAt.getTime()) / 1000));
  const gained = Math.floor(elapsed / ENERGY_REGEN_SECONDS);
  const energy = Math.min(max, stored + gained);
  const nextPointInSec = energy >= max ? 0 : ENERGY_REGEN_SECONDS - (elapsed % ENERGY_REGEN_SECONDS);
  return { energy, nextPointInSec };
}
