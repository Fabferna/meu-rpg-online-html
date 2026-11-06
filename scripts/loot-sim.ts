// Simula a tabela de saque da Caçada (src/lib/game/loot.ts): N vitórias por inimigo, com o herói
// no nível do inimigo e a proteção contra azar ativa. Mostra se os drops inundam a economia.
// Uso: npx tsx scripts/loot-sim.ts [N=1000]
import { ENEMIES } from "../src/lib/game/enemies";
import { ITEMS, ITEM_BY_ID } from "../src/lib/game/items";
import { gearPool, rollLoot, type Rng } from "../src/lib/game/loot";
import { DAILY_HUNTS, ENERGY_REGEN_SECONDS, PVE_ENERGY_COST } from "../src/lib/game/rules";

const N = Number(process.argv[2] ?? 1000);
const rng: Rng = { chance: (p) => Math.random() < p, roll: (a, b) => a + Math.floor(Math.random() * (b - a + 1)) };
const HUNTS_PER_HOUR = 3600 / ENERGY_REGEN_SECONDS / PVE_ENERGY_COST; // limitado pela energia
const f1 = (n: number) => n.toFixed(n < 10 ? 2 : 0);

console.log(`Simulação: ${N} vitórias por inimigo (herói no nível do inimigo). Caçadas/hora pela energia: ${HUNTS_PER_HOUR}; teto diário: ${DAILY_HUNTS}.\n`);
console.log("| Inimigo | Nv | Poções/vitória | Equip./vitória | C/R/E/L | Itens/hora | Equip./dia (30) | Ouro da luta | Ouro equiv. em itens (venda) | Itens ÷ ouro da luta | Preço médio no Ferreiro da faixa | Dias p/ esse preço só com itens |");
console.log("|---|---|---|---|---|---|---|---|---|---|---|---|");
let tot = { gear: 0, wins: 0, sell: 0, gold: 0 };
for (const e of ENEMIES.filter((x) => !x.story)) {
  let pity = 0, potions = 0, gear = 0, sell = 0;
  const rar = { common: 0, rare: 0, epic: 0, legendary: 0 };
  for (let i = 0; i < N; i++) {
    const r = rollLoot(e, { heroLevel: e.minLevel, pity }, rng);
    if (r.pity === "reset") pity = 0; else if (r.pity === "bump") pity++;
    for (const d of r.drops) {
      const it = ITEM_BY_ID[d.item];
      sell += it.sell * d.qty;
      if (it.slot) { gear++; rar[it.rarity]++; } else potions += d.qty;
    }
  }
  const shop = gearPool(e).filter((i) => i.buy);
  const avgBuy = shop.length ? shop.reduce((s, i) => s + i.buy!, 0) / shop.length : 0;
  const sellPerDay = (sell / N) * DAILY_HUNTS;
  tot = { gear: tot.gear + gear, wins: tot.wins + N, sell: tot.sell + sell, gold: tot.gold + e.gold * N };
  console.log(`| ${e.name}${e.boss ? " 👑" : ""} | ${e.minLevel} | ${f1(potions / N)} | ${(gear / N * 100).toFixed(1)}% | ${rar.common}/${rar.rare}/${rar.epic}/${rar.legendary} | ${f1(((potions + gear) / N) * HUNTS_PER_HOUR)} | ${f1(gear / N * DAILY_HUNTS)} | ${e.gold} | ${f1(sell / N)} | ${(sell / N / e.gold * 100).toFixed(0)}% | ${avgBuy ? Math.round(avgBuy) : "—"} | ${avgBuy ? f1(avgBuy / sellPerDay) : "—"} |`);
}
console.log(`\nMédia geral: ${(tot.gear / tot.wins * 100).toFixed(1)}% de vitórias com equipamento; itens valem ${(tot.sell / tot.gold * 100).toFixed(0)}% do ouro das lutas (se todos forem vendidos).`);
console.log(`Catálogo: ${ITEMS.filter((i) => i.slot).length} equipamentos.`);
