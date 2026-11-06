// Catálogo de itens (espelho da tabela `items`, sincronizado pela migração) + preços do Ferreiro.
// 5 espaços de equipamento; itens com afinidade de raça dão +20%; nível mínimo vale para equipar.

export type Slot = "weapon" | "armor" | "helmet" | "boots" | "accessory";
export const SLOTS: Slot[] = ["weapon", "helmet", "armor", "boots", "accessory"];

export type ItemDef = {
  id: string; name: string; rarity: "common" | "rare" | "epic" | "legendary"; slot?: Slot;
  stats: Partial<Record<"atk" | "def" | "str" | "dex" | "con" | "intel" | "heal", number>>; image: string;
  /** Preço no Ferreiro (sem preço = só em drops, masmorras e história). */
  buy?: number;
  /** Nível mínimo para comprar E equipar. */
  minLevel?: number;
  sell: number;
  /** Raças com afinidade: +20% em todos os atributos do item. */
  affinity?: string[];
};

/** Bônus de afinidade de raça. */
export const AFFINITY_BONUS = 0.2;

const A = (f: string) => `/assets/${f}.webp`;
const IT = (f: string) => `/assets/items/${f}.webp`;

export const ITEMS: ItemDef[] = [
  { id: "pocao_vida", name: "Poção de Vida", rarity: "common", stats: { heal: 60 }, image: "/assets/shop/potion_hp.webp", sell: 8 },

  // ── Armas ──
  { id: "espada_curta", name: "Espada Curta Funcional", rarity: "common", slot: "weapon", stats: { atk: 4 }, image: A("espada_curta_funcional"), buy: 120, minLevel: 1, sell: 40, affinity: ["humano"] },
  { id: "machado_bronze", name: "Machado de Bronze", rarity: "common", slot: "weapon", stats: { atk: 5, str: 1 }, image: IT("machado_bronze"), buy: 220, minLevel: 2, sell: 70, affinity: ["gronar", "anao"] },
  { id: "arco_elfico", name: "Arco Élfico Elegante", rarity: "rare", slot: "weapon", stats: { atk: 7, dex: 2 }, image: A("arco_elfico_elegante"), buy: 420, minLevel: 3, sell: 150, affinity: ["elfo"] },
  { id: "cajado_luminoso", name: "Cajado Mágico Luminoso", rarity: "rare", slot: "weapon", stats: { atk: 3, intel: 4 }, image: A("cajado_magico_luminoso"), buy: 420, minLevel: 3, sell: 150, affinity: ["aetheliano"] },
  { id: "lamina_valerion", name: "Lâmina de Valerion", rarity: "rare", slot: "weapon", stats: { atk: 9, dex: 1 }, image: IT("lamina_valerion"), buy: 1100, minLevel: 8, sell: 380, affinity: ["humano"] },
  { id: "martelo_forja", name: "Martelo da Forja Ancestral", rarity: "epic", slot: "weapon", stats: { atk: 11, str: 2 }, image: A("icone_forja_ancestral"), buy: 1800, minLevel: 12, sell: 650, affinity: ["anao"] },
  { id: "arco_lunar", name: "Arco Lunar", rarity: "epic", slot: "weapon", stats: { atk: 13, dex: 4 }, image: IT("arco_lunar"), minLevel: 16, sell: 900, affinity: ["elfo"] },
  { id: "cajado_eter", name: "Cajado do Éter", rarity: "epic", slot: "weapon", stats: { atk: 6, intel: 10 }, image: IT("cajado_eter"), minLevel: 22, sell: 1200, affinity: ["aetheliano"] },
  { id: "machado_escarlate", name: "Machado Escarlate", rarity: "epic", slot: "weapon", stats: { atk: 17, str: 3 }, image: IT("machado_escarlate"), minLevel: 22, sell: 1200, affinity: ["gronar"] },
  { id: "lamina_aurora", name: "Lâmina da Aurora", rarity: "legendary", slot: "weapon", stats: { atk: 22, str: 3, dex: 3 }, image: IT("lamina_aurora"), minLevel: 28, sell: 2500, affinity: ["humano"] },
  { id: "tridente_meria", name: "Tridente de Meria", rarity: "legendary", slot: "weapon", stats: { atk: 20, intel: 8 }, image: IT("tridente_meria"), minLevel: 30, sell: 2800 },

  // ── Elmos ──
  { id: "capuz_viajante", name: "Capuz do Viajante", rarity: "common", slot: "helmet", stats: { def: 1, dex: 1 }, image: IT("capuz_viajante"), buy: 80, minLevel: 1, sell: 25 },
  { id: "elmo_ferro", name: "Elmo de Ferro", rarity: "rare", slot: "helmet", stats: { def: 3, con: 1 }, image: IT("elmo_ferro"), buy: 500, minLevel: 7, sell: 170, affinity: ["anao", "humano"] },
  { id: "tiara_lunar", name: "Tiara Lunar", rarity: "epic", slot: "helmet", stats: { def: 2, intel: 4 }, image: IT("tiara_lunar"), minLevel: 15, sell: 700, affinity: ["elfo", "aetheliano"] },
  { id: "coroa_vorlag", name: "Coroa de Vorlag", rarity: "legendary", slot: "helmet", stats: { def: 5, atk: 3, intel: 3 }, image: IT("coroa_vorlag"), minLevel: 24, sell: 2200 },

  // ── Armaduras ──
  { id: "gibao_couro", name: "Gibão de Couro", rarity: "common", slot: "armor", stats: { def: 3 }, image: IT("gibao_couro"), buy: 100, minLevel: 1, sell: 30 },
  { id: "cota_malha", name: "Cota de Malha", rarity: "rare", slot: "armor", stats: { def: 6, con: 1 }, image: IT("cota_malha"), buy: 650, minLevel: 6, sell: 220, affinity: ["humano", "gronar"] },
  { id: "peitoral_anao", name: "Peitoral de Placas Anão", rarity: "epic", slot: "armor", stats: { def: 8, con: 2 }, image: A("peitoral_de_placas_anao"), buy: 900, minLevel: 8, sell: 320, affinity: ["anao"] },
  { id: "manto_arcano", name: "Manto Arcano", rarity: "epic", slot: "armor", stats: { def: 6, intel: 5 }, image: IT("manto_arcano"), minLevel: 14, sell: 800, affinity: ["aetheliano", "elfo"] },
  { id: "armadura_celeste", name: "Armadura Celeste", rarity: "legendary", slot: "armor", stats: { def: 16, con: 4 }, image: IT("armadura_celeste"), minLevel: 26, sell: 2600 },

  // ── Botas ──
  { id: "botas_couro", name: "Botas de Couro", rarity: "common", slot: "boots", stats: { dex: 1, def: 1 }, image: IT("botas_couro"), buy: 80, minLevel: 1, sell: 25 },
  { id: "botas_patrulheiro", name: "Botas do Patrulheiro", rarity: "rare", slot: "boots", stats: { dex: 3, def: 1 }, image: IT("botas_patrulheiro"), buy: 520, minLevel: 6, sell: 180, affinity: ["elfo", "humano"] },
  { id: "grevas_runicas", name: "Grevas Rúnicas", rarity: "epic", slot: "boots", stats: { def: 4, dex: 2 }, image: IT("grevas_runicas"), minLevel: 14, sell: 750, affinity: ["anao"] },
  { id: "botas_vento", name: "Botas do Vento Celeste", rarity: "legendary", slot: "boots", stats: { dex: 7, def: 3 }, image: IT("botas_vento"), minLevel: 26, sell: 2400 },

  // ── Acessórios ──
  { id: "anel_vigor", name: "Anel do Vigor", rarity: "rare", slot: "accessory", stats: { con: 3 }, image: IT("anel_vigor"), buy: 450, minLevel: 4, sell: 160 },
  { id: "estandarte_inspirador", name: "Estandarte Inspirador", rarity: "rare", slot: "accessory", stats: { atk: 2, con: 2 }, image: A("estandarte_inspirador"), buy: 600, minLevel: 5, sell: 220, affinity: ["humano", "gronar"] },
  { id: "foco_arcano", name: "Foco de Canalização Arcana", rarity: "epic", slot: "accessory", stats: { intel: 6, def: 1 }, image: A("canalizacao_de_magia"), buy: 1800, minLevel: 12, sell: 650, affinity: ["aetheliano"] },
  { id: "amuleto_serpente", name: "Amuleto da Serpente Sinistra", rarity: "legendary", slot: "accessory", stats: { atk: 4, def: 3, intel: 3 }, image: A("amuleto_da_serpente_sinistra"), buy: 5000, minLevel: 18, sell: 1500 },
  { id: "olho_vazio", name: "Olho do Vazio", rarity: "legendary", slot: "accessory", stats: { atk: 6, def: 4, intel: 6, str: 2 }, image: IT("olho_vazio"), minLevel: 34, sell: 3500 },
];

/** Atributos efetivos do item para uma raça (afinidade = +20%). */
export function itemStatsFor(item: ItemDef | undefined, stats: Record<string, number>, race: string) {
  if (!item?.affinity?.includes(race)) return stats;
  return Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, typeof v === "number" ? Math.round(v * (1 + AFFINITY_BONUS)) : v]));
}

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
