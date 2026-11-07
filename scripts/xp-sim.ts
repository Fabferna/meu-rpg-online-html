// Simula quantos DIAS um jogador leva para chegar a cada nível (curva atual × proposta).
// Jogador "dedicado": usa toda a energia do dia (regenera 1 por minuto = 1440/dia), faz as
// caçadas permitidas no melhor inimigo liberado, missões com a energia que sobrar e os
// capítulos da história assim que o nível permite. Fim de semana = XP ×2.
// Uso: npx tsx --conditions=react-server scripts/xp-sim.ts
import { ENEMIES } from "../src/lib/game/enemies";
import { QUESTS } from "../src/lib/game/quests";
import { CHAPTERS } from "../src/lib/game/story";
import { REGION_OF_ENEMY, REGION_OF_QUEST, regionUnlocked } from "../src/lib/game/regions";
import { DAILY_HUNTS, DAILY_QUESTS, PVE_ENERGY_COST, xpForNextLevel, ENERGY_REGEN_SECONDS, XP_RATE } from "../src/lib/game/rules";

type Curve = (l: number) => number;
const OLD: Curve = (l) => 50 + (l - 1) * 25;

export function simulate(curve: Curve, opts: { dailyMinutes?: number; days?: number; rate?: number; collector?: boolean } = {}) {
  const rate = opts.rate ?? 1;
  let level = 1, xp = 0, chapter = 0;
  const reached: Record<number, number> = {};
  const energyPerDay = Math.floor(86400 / ENERGY_REGEN_SECONDS);
  const gain = (amount: number, mult: number) => {
    xp += Math.round(amount * mult * rate);
    while (level < 200 && xp >= curve(level)) { xp -= curve(level); level++; reached[level] ??= day; }
  };
  let day = 0;
  for (day = 1; day <= (opts.days ?? 400) && level < 40; day++) {
    const mult = day % 7 === 6 || day % 7 === 0 ? 2 : 1;
    let energy = energyPerDay;
    // História primeiro (sem custo de energia).
    for (const ch of CHAPTERS) if (ch.n === chapter + 1 && level >= ch.minLevel) { gain(ch.rewards.xp, mult); chapter = ch.n; }
    // Caçadas no inimigo comum de maior nível liberado.
    for (let h = 0; h < DAILY_HUNTS && energy >= PVE_ENERGY_COST; h++) {
      const e = ENEMIES.filter((x) => !x.story && x.minLevel <= level && regionUnlocked(REGION_OF_ENEMY[x.id], chapter)).sort((a, b) => b.minLevel - a.minLevel)[0];
      const gap = Math.max(0, level - e.minLevel - 3);
      gain(e.xp * Math.max(0.3, 1 - 0.1 * gap), mult);
      energy -= PVE_ENERGY_COST;
      for (const ch of CHAPTERS) if (ch.n === chapter + 1 && level >= ch.minLevel) { gain(ch.rewards.xp, mult); chapter = ch.n; }
    }
    // Missões: melhor XP por energia, limitadas pela energia, pelo teto diário e por 16 h de duração.
    let time = 16 * 3600;
    for (let q = 0; q < DAILY_QUESTS; q++) {
      const list = QUESTS.filter((x) => x.minLevel <= level && x.energy <= energy && x.durationSec <= time && regionUnlocked(REGION_OF_QUEST[x.id], chapter))
        .sort((a, b) => (b.xp[0] + b.xp[1]) / b.energy - (a.xp[0] + a.xp[1]) / a.energy);
      const qq = list[0]; if (!qq) break;
      gain((qq.xp[0] + qq.xp[1]) / 2, mult); energy -= qq.energy; time -= qq.durationSec;
    }
    // Encomendas do Colecionador (collector.ts): 1% + 1,5% + 2% do XP do próximo nível por dia.
    if (opts.collector) gain(curve(level) * 0.045, mult);
  }
  return { reached, chapter };
}

const fmt = (r: Record<number, number>) => [5, 10, 15, 20, 26, 30, 35, 40].map((l) => `nv${l}: ${r[l] ?? ">400"}d`).join("  ");
console.log("ANTES   ", fmt(simulate(OLD).reached));
console.log("RATE=1  ", fmt(simulate(xpForNextLevel).reached));
console.log(`ATUAL ×${XP_RATE}`, fmt(simulate(xpForNextLevel, { rate: XP_RATE }).reached));
console.log("+ENCOMENDAS", fmt(simulate(xpForNextLevel, { rate: XP_RATE, collector: true }).reached));
console.log("\nXP para o próximo nível (proposta):", [1, 5, 10, 15, 20, 26, 30, 35, 40].map((l) => `${l}→${xpForNextLevel(l)}`).join("  "));
console.log("Total até o 40: antes", Array.from({ length: 39 }, (_, i) => OLD(i + 1)).reduce((a, b) => a + b), "· proposta", Array.from({ length: 39 }, (_, i) => xpForNextLevel(i + 1)).reduce((a, b) => a + b));
