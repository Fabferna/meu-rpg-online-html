// Tabela de saque da Caçada, gerada AUTOMATICAMENTE a partir dos catálogos de inimigos e itens.
// Nada é escrito drop por drop: um item novo em items.ts já entra no saque dos inimigos da faixa dele.
// Arquivo puro (sem I/O e sem RNG próprio): o servidor sorteia com o RNG criptográfico (rng.ts),
// e as telas usam as mesmas funções para mostrar "Pode deixar cair" e "Encontrado em".
import type { Enemy } from "./enemies";
import { ITEMS, ITEM_BY_ID, type ItemDef } from "./items";

type Rarity = ItemDef["rarity"];
const RARITIES: Rarity[] = ["common", "rare", "epic", "legendary"];

export const POTION_ID = "pocao_vida";
/** Espaços da bolsa (itens NÃO equipados; uma pilha de poções ocupa 1 espaço). */
export const BAG_LIMIT = 60;
/** Proteção contra azar: depois de N vitórias seguidas sem equipamento, a próxima garante um raro ou épico. */
export const PITY_WINS = 25;

export const LOOT = {
  /** Chance de poção por vitória (quantidade sorteada entre qty[0] e qty[1]). */
  potion: { common: 0.3, boss: 0.6, qty: [1, 2] as [number, number] },
  /** Chance TOTAL de equipamento por vitória (dividida entre os itens da faixa). */
  gear: { common: 0.06, boss: 0.2 },
  /** Faixa de nível mínimo dos itens sorteáveis: [nível do inimigo − 8, nível do inimigo + 2]. */
  band: [-8, 2] as [number, number],
  /** Pesos de raridade (comum > raro > épico > lendário); chefes puxam para cima. */
  weights: {
    common: { common: 60, rare: 30, epic: 9, legendary: 1 },
    boss: { common: 30, rare: 40, epic: 22, legendary: 8 },
  } as Record<"common" | "boss", Record<Rarity, number>>,
  /**
   * Anti-farm: herói com nível ≥ nível do inimigo + 10 não recebe equipamento da tabela
   * (é o mesmo ponto em que o XP chega ao piso de 30%, ver battle/action).
   */
  noGearAt: 10,
};

export type LootEntry = { item: string; chance: number; qty: [number, number]; kind: "potion" | "gear" | "special" };
export type LootDrop = { item: string; qty: number };
/** Resultado entregue pelo banco: gold > 0 = bolsa cheia, o item virou ouro. */
export type LootResult = { item: string; qty: number; gold: number };

const tier = (e: Enemy) => (e.boss ? "boss" : "common");

/** Equipamentos sorteáveis por este inimigo (faixa de nível). */
export function gearPool(e: Enemy): ItemDef[] {
  const lo = e.minLevel + LOOT.band[0], hi = e.minLevel + LOOT.band[1];
  return ITEMS.filter((i) => i.slot && (i.minLevel ?? 1) >= lo && (i.minLevel ?? 1) <= hi);
}

/**
 * Chance de cada item quando sai equipamento. A raridade é sorteada com os pesos FIXOS
 * (a soma de todas as raridades); a parte de uma raridade divide-se igualmente entre os itens dela.
 * Se a faixa não tiver item de uma raridade, essa parte vira "nada" — assim uma faixa só com
 * lendários NÃO passa a dar só lendários. Com `only` (proteção contra azar), renormaliza entre as raridades pedidas.
 */
function weighted(pool: ItemDef[], w: Record<Rarity, number>, only?: Rarity[]) {
  const list = only ? pool.filter((i) => only.includes(i.rarity)) : pool;
  const present = RARITIES.filter((r) => list.some((i) => i.rarity === r));
  const total = only ? present.reduce((s, r) => s + w[r], 0) : RARITIES.reduce((s, r) => s + w[r], 0);
  if (!total) return [];
  return list.map((i) => ({ item: i, p: w[i.rarity] / total / list.filter((x) => x.rarity === i.rarity).length }));
}

/** Herói alto demais para este inimigo dar equipamento? */
export function gearAllowed(e: Enemy, heroLevel: number) {
  return heroLevel < e.minLevel + LOOT.noGearAt;
}

/** Tabela completa (só para exibir): poção, equipamentos da faixa e o drop especial do inimigo. */
export function lootTable(e: Enemy): LootEntry[] {
  const t = tier(e);
  const out: LootEntry[] = [{ item: POTION_ID, chance: LOOT.potion[t], qty: LOOT.potion.qty, kind: "potion" }];
  for (const { item, p } of weighted(gearPool(e), LOOT.weights[t])) out.push({ item: item.id, chance: LOOT.gear[t] * p, qty: [1, 1], kind: "gear" });
  if (e.drop) {
    const same = out.find((x) => x.item === e.drop!.item);
    if (same) same.chance = 1 - (1 - same.chance) * (1 - e.drop.chance);
    else out.push({ item: e.drop.item, chance: e.drop.chance, qty: [1, 1], kind: "special" });
  }
  return out.sort((a, b) => b.chance - a.chance);
}

/** "Pode deixar cair": os N itens mais prováveis. */
export function topDrops(e: Enemy, n = 3) {
  return lootTable(e).slice(0, n);
}

export type Rng = { chance: (p: number) => boolean; roll: (min: number, max: number) => number };

/** Sorteia pelo peso; se as chances somarem menos de 1, o resto é "nada". */
function pick(list: { item: ItemDef; p: number }[], rng: Rng): ItemDef | undefined {
  let r = rng.roll(0, 999_999) / 1_000_000;
  for (const x of list) { r -= x.p; if (r < 0) return x.item; }
  return undefined;
}

/**
 * Sorteio de uma vitória na Caçada (só no servidor).
 * `pity` = vitórias seguidas sem equipamento até agora.
 * Retorna os drops e o que fazer com o contador de azar: "reset" (veio equipamento),
 * "bump" (não veio) ou null (anti-farm: o contador não anda).
 */
export function rollLoot(e: Enemy, opts: { heroLevel: number; pity: number }, rng: Rng) {
  const t = tier(e);
  const drops: LootDrop[] = [];
  if (rng.chance(LOOT.potion[t])) drops.push({ item: POTION_ID, qty: rng.roll(LOOT.potion.qty[0], LOOT.potion.qty[1]) });

  const eligible = gearAllowed(e, opts.heroLevel);
  let pityHit = false;
  if (eligible) {
    const pool = gearPool(e);
    let g: ItemDef | undefined;
    if (rng.chance(LOOT.gear[t])) g = pick(weighted(pool, LOOT.weights[t]), rng);
    else if (opts.pity + 1 >= PITY_WINS) {
      // Azar demais: garante um raro ou épico da faixa (lendário nunca vem "de graça").
      // Faixa sem raro/épico: o contador continua subindo até cair algo.
      g = pick(weighted(pool, LOOT.weights[t], ["rare", "epic"]), rng);
      pityHit = !!g;
    }
    if (g) drops.push({ item: g.id, qty: 1 });
  }
  // Drop especial do inimigo (enemies.ts): bônus extra, independente da tabela.
  if (e.drop && rng.chance(e.drop.chance)) {
    const same = drops.find((d) => d.item === e.drop!.item && !ITEM_BY_ID[d.item]?.slot);
    if (same) same.qty += 1; else drops.push({ item: e.drop.item, qty: 1 });
  }
  // Chefe garante pelo menos 1 drop.
  if (e.boss && drops.length === 0) drops.push({ item: POTION_ID, qty: 1 });

  const gearDropped = drops.some((d) => ITEM_BY_ID[d.item]?.slot);
  const pity: "reset" | "bump" | null = !eligible ? (gearDropped ? "reset" : null) : gearDropped ? "reset" : "bump";
  return { drops, pity, pityHit };
}

/**
 * Saque do Errante (encontro raro): poção garantida e UM equipamento garantido da faixa,
 * sorteado só entre raro, épico e lendário (pesos de chefe). Respeita o anti-farm por nível.
 */
export function rollRareLoot(e: Enemy, heroLevel: number, rng: Rng): LootDrop[] {
  const drops: LootDrop[] = [{ item: POTION_ID, qty: rng.roll(1, 2) }];
  if (gearAllowed(e, heroLevel)) {
    const g = pick(weighted(gearPool(e), LOOT.weights.boss, ["rare", "epic", "legendary"]), rng)
      ?? pick(weighted(gearPool(e), LOOT.weights.boss), rng);
    if (g) drops.push({ item: g.id, qty: 1 });
  }
  return drops;
}
