// Catálogo de itens (espelho da tabela `items`) + preços do Ferreiro.

export type ItemDef = {
  id: string; name: string; rarity: "common" | "rare" | "epic" | "legendary"; slot?: "weapon" | "armor" | "accessory";
  stats: Partial<Record<"atk" | "def" | "str" | "dex" | "con" | "intel" | "heal", number>>; image: string;
  buy?: number; minLevel?: number; sell: number;
};

export const ITEMS: ItemDef[] = [
  { id: "pocao_vida", name: "Poção de Vida", rarity: "common", stats: { heal: 60 }, image: "/assets/shop/potion_hp.webp", sell: 8 },
  { id: "espada_curta", name: "Espada Curta Funcional", rarity: "common", slot: "weapon", stats: { atk: 4 }, image: "/assets/espada_curta_funcional.webp", buy: 120, minLevel: 1, sell: 40 },
  { id: "arco_elfico", name: "Arco Élfico Elegante", rarity: "rare", slot: "weapon", stats: { atk: 7, dex: 2 }, image: "/assets/arco_elfico_elegante.webp", buy: 420, minLevel: 3, sell: 150 },
  { id: "cajado_luminoso", name: "Cajado Mágico Luminoso", rarity: "rare", slot: "weapon", stats: { atk: 3, intel: 4 }, image: "/assets/cajado_magico_luminoso.webp", buy: 420, minLevel: 3, sell: 150 },
  { id: "estandarte_inspirador", name: "Estandarte Inspirador", rarity: "rare", slot: "accessory", stats: { atk: 2, con: 2 }, image: "/assets/estandarte_inspirador.webp", buy: 600, minLevel: 5, sell: 220 },
  { id: "peitoral_anao", name: "Peitoral de Placas Anão", rarity: "epic", slot: "armor", stats: { def: 8, con: 2 }, image: "/assets/peitoral_de_placas_anao.webp", buy: 900, minLevel: 8, sell: 320 },
  { id: "martelo_forja", name: "Martelo da Forja Ancestral", rarity: "epic", slot: "weapon", stats: { atk: 11, str: 2 }, image: "/assets/icone_forja_ancestral.webp", buy: 1800, minLevel: 12, sell: 650 },
  { id: "foco_arcano", name: "Foco de Canalização Arcana", rarity: "epic", slot: "accessory", stats: { intel: 6, def: 1 }, image: "/assets/canalizacao_de_magia.webp", buy: 1800, minLevel: 12, sell: 650 },
  { id: "amuleto_serpente", name: "Amuleto da Serpente Sinistra", rarity: "legendary", slot: "accessory", stats: { atk: 4, def: 3, intel: 3 }, image: "/assets/amuleto_da_serpente_sinistra.webp", buy: 5000, minLevel: 18, sell: 1500 },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// ── Aprimoramento (+1 a +10) ─────────────────────────────────────────
export const MAX_UPGRADE = 10;
/** Chance de sucesso (%) para chegar ao nível `next`. Falhar só gasta o ouro. */
export const UPGRADE_CHANCE = [100, 100, 100, 85, 75, 65, 55, 45, 35, 25];
export function upgradeChance(next: number) { return UPGRADE_CHANCE[next - 1] ?? 0; }
export function upgradeCost(item: ItemDef, next: number) {
  const base = item.buy ?? item.sell * 3;
  return Math.max(30, Math.round((base * 0.2 * next ** 1.6) / 10) * 10);
}
/** Cada +1 aumenta os atributos do item em 10% (mínimo +1 por nível no atributo principal). */
export function upgradedStats(stats: Record<string, number>, upgrade: number) {
  if (!upgrade) return { ...stats };
  return Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, typeof v === "number" ? v + Math.max(upgrade, Math.ceil(v * 0.1 * upgrade)) : v]));
}
export function sellPrice(item: ItemDef, upgrade: number) { return Math.round(item.sell * (1 + 0.25 * upgrade)); }
