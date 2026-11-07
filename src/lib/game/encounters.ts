// Encontros raros (Errantes) e Bênção dos Ancestrais. Regras puras: o servidor sorteia e aplica.
//
// • Errante: depois de vencer uma caçada comum há chance de aparecer a versão de elite daquele monstro.
//   Mais forte, dá 3× XP e ouro, não gasta energia e SEMPRE deixa cair equipamento (raro ou melhor).
//   Fica esperando até o fim do dia (UTC); no máximo 5 lutas contra Errantes por dia.
// • Bênção: ao resgatar a recompensa diária há um sorteio. Quem ganha fica 24 h abençoado
//   (+10% ataque, magia e defesa, +5% vida). Cada dia sem ganhar aumenta a chance do próximo.
import type { TalentMods } from "./talents";

export const RARE_RULES = { spawnChance: 0.12, perDay: 5, xpMult: 3, goldMult: 3, statMult: 1.3, levelUp: 2 };

export const BLESSING = {
  minutes: 24 * 60,
  /** Chance = base + por ponto acumulado, até o teto (ponto = 1 dia sem ganhar). */
  base: 0.05, perPoint: 0.025, max: 0.3,
  mods: { atkPct: 0.1, magicPct: 0.1, defPct: 0.1, hpPct: 0.05 } as Partial<TalentMods>,
};
export const blessingChance = (points: number) => Math.min(BLESSING.max, BLESSING.base + BLESSING.perPoint * Math.max(0, points));

/** Minutos desde 1970 (cabe no contador inteiro do banco). */
export const epochMinutes = (d = new Date()) => Math.floor(d.getTime() / 60_000);
export const blessedUntil = (value: number | null | undefined) => (value ? new Date(value * 60_000) : null);
export const isBlessed = (value: number | null | undefined, now = new Date()) => !!value && value * 60_000 > now.getTime();

/** Soma o bônus da Bênção aos bônus de talento. */
export function withBlessing(m: TalentMods, active: boolean): TalentMods {
  if (!active) return m;
  const out = { ...m };
  for (const [k, v] of Object.entries(BLESSING.mods) as [keyof TalentMods, number][]) out[k] += v;
  return out;
}
