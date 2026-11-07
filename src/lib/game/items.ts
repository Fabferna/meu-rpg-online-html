// Catálogo de itens (espelho da tabela `items`, sincronizado pela migração) + preços do Ferreiro.
// 5 espaços de equipamento; itens com afinidade de raça dão +20%; nível mínimo vale para equipar.
// Armas têm tipo (escala com um atributo) e peças de elmo/armadura/botas têm peso: ver gear.ts.
import type { WeaponType, Weight } from "./gear";

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
  /** Tipo da arma (define o atributo de escala). */
  weapon?: WeaponType;
  /** Peso de elmo/armadura/botas. */
  weight?: Weight;
};

/** Bônus de afinidade de raça. */
export const AFFINITY_BONUS = 0.2;

const A = (f: string) => `/assets/${f}.webp`;
// Sufixo -v2: as artes do Ato II foram trocadas com o mesmo nome; o novo nome fura o cache da CDN/navegador.
const IT = (f: string) => `/assets/items/${f}-v2.webp`;
// Itens novos (revisão do catálogo): artes feitas no Canva (sufixo -v2 = nome novo para furar o cache da CDN).
const NW = (f: string) => `/assets/items/${f}-v2.webp`;

export const ITEMS: ItemDef[] = [
  { id: "pocao_vida", name: "Poção de Vida", rarity: "common", stats: { heal: 60 }, image: "/assets/shop/potion_hp.webp", sell: 8 },

  // ── Armas ──
  { id: "espada_curta", name: "Espada Curta Funcional", rarity: "common", slot: "weapon", stats: { atk: 4 }, image: A("espada_curta_funcional"), buy: 120, minLevel: 1, sell: 40, affinity: ["humano"], weapon: "espada" },
  { id: "machado_bronze", name: "Machado de Bronze", rarity: "common", slot: "weapon", stats: { atk: 5, str: 1 }, image: IT("machado_bronze"), buy: 220, minLevel: 2, sell: 70, affinity: ["gronar", "anao"], weapon: "machado" },
  { id: "arco_elfico", name: "Arco Élfico Elegante", rarity: "rare", slot: "weapon", stats: { atk: 7, dex: 2 }, image: A("arco_elfico_elegante"), buy: 420, minLevel: 3, sell: 150, affinity: ["elfo"], weapon: "arco" },
  { id: "cajado_luminoso", name: "Cajado Mágico Luminoso", rarity: "rare", slot: "weapon", stats: { atk: 3, intel: 4 }, image: A("cajado_magico_luminoso"), buy: 420, minLevel: 3, sell: 150, affinity: ["aetheliano"], weapon: "cajado" },
  { id: "lamina_valerion", name: "Lâmina de Valerion", rarity: "rare", slot: "weapon", stats: { atk: 9, dex: 1 }, image: IT("lamina_valerion"), buy: 1100, minLevel: 8, sell: 380, affinity: ["humano"], weapon: "espada" },
  { id: "martelo_guerra", name: "Martelo de Guerra", rarity: "rare", slot: "weapon", stats: { atk: 8, str: 1 }, image: NW("martelo_guerra"), buy: 900, minLevel: 6, sell: 300, affinity: ["anao"], weapon: "martelo" },
  { id: "machado_guerra", name: "Machado de Guerra", rarity: "rare", slot: "weapon", stats: { atk: 10, str: 2 }, image: NW("machado_guerra"), buy: 1300, minLevel: 10, sell: 430, affinity: ["gronar", "anao"], weapon: "machado" },
  { id: "cajado_carvalho", name: "Cajado de Carvalho Rúnico", rarity: "rare", slot: "weapon", stats: { atk: 4, intel: 7 }, image: NW("cajado_carvalho"), buy: 1600, minLevel: 12, sell: 520, affinity: ["aetheliano"], weapon: "cajado" },
  { id: "arco_longo", name: "Arco Longo de Teixo", rarity: "rare", slot: "weapon", stats: { atk: 11, dex: 3 }, image: NW("arco_longo"), buy: 2200, minLevel: 14, sell: 720, affinity: ["elfo"], weapon: "arco" },
  { id: "martelo_forja", name: "Martelo da Forja Ancestral", rarity: "epic", slot: "weapon", stats: { atk: 11, str: 2 }, image: A("icone_forja_ancestral"), buy: 1800, minLevel: 12, sell: 650, affinity: ["anao"], weapon: "martelo" },
  { id: "arco_lunar", name: "Arco Lunar", rarity: "epic", slot: "weapon", stats: { atk: 13, dex: 4 }, image: IT("arco_lunar"), minLevel: 16, sell: 900, affinity: ["elfo"], weapon: "arco" },
  { id: "espada_capitao", name: "Espada do Capitão", rarity: "epic", slot: "weapon", stats: { atk: 15, str: 2, dex: 1 }, image: NW("espada_capitao"), buy: 3600, minLevel: 18, sell: 1100, affinity: ["humano"], weapon: "espada" },
  { id: "cajado_eter", name: "Cajado do Éter", rarity: "epic", slot: "weapon", stats: { atk: 6, intel: 10 }, image: IT("cajado_eter"), minLevel: 22, sell: 1200, affinity: ["aetheliano"], weapon: "cajado" },
  { id: "machado_escarlate", name: "Machado Escarlate", rarity: "epic", slot: "weapon", stats: { atk: 17, str: 3 }, image: IT("machado_escarlate"), minLevel: 22, sell: 1200, affinity: ["gronar"], weapon: "machado" },
  { id: "lamina_aurora", name: "Lâmina da Aurora", rarity: "legendary", slot: "weapon", stats: { atk: 22, str: 3, dex: 3 }, image: IT("lamina_aurora"), minLevel: 28, sell: 2500, affinity: ["humano"], weapon: "espada" },
  { id: "tridente_meria", name: "Tridente de Meria", rarity: "legendary", slot: "weapon", stats: { atk: 20, intel: 8 }, image: IT("tridente_meria"), minLevel: 30, sell: 2800, weapon: "tridente" },
  { id: "arco_tempestade", name: "Arco da Tempestade", rarity: "legendary", slot: "weapon", stats: { atk: 21, dex: 6 }, image: NW("arco_tempestade"), minLevel: 30, sell: 2800, affinity: ["elfo"], weapon: "arco" },
  { id: "martelo_trovao", name: "Martelo do Trovão Rúnico", rarity: "legendary", slot: "weapon", stats: { atk: 23, str: 4, con: 2 }, image: NW("martelo_trovao"), minLevel: 30, sell: 2800, affinity: ["anao"], weapon: "martelo" },
  { id: "machado_colosso", name: "Machado do Colosso", rarity: "legendary", slot: "weapon", stats: { atk: 25, str: 4 }, image: NW("machado_colosso"), minLevel: 32, sell: 3000, affinity: ["gronar"], weapon: "machado" },
  { id: "cajado_astral", name: "Cajado Astral", rarity: "legendary", slot: "weapon", stats: { atk: 10, intel: 14 }, image: NW("cajado_astral"), minLevel: 34, sell: 3200, affinity: ["aetheliano"], weapon: "cajado" },

  // ── Elmos ──
  { id: "capuz_viajante", name: "Capuz do Viajante", rarity: "common", slot: "helmet", stats: { def: 1, dex: 1 }, image: IT("capuz_viajante"), buy: 80, minLevel: 1, sell: 25, weight: "leve" },
  { id: "elmo_ferro", name: "Elmo de Ferro", rarity: "rare", slot: "helmet", stats: { def: 3, con: 1 }, image: IT("elmo_ferro"), buy: 500, minLevel: 7, sell: 170, affinity: ["anao", "humano"], weight: "pesada" },
  { id: "tiara_lunar", name: "Tiara Lunar", rarity: "epic", slot: "helmet", stats: { def: 3, intel: 5 }, image: IT("tiara_lunar"), minLevel: 15, sell: 700, affinity: ["elfo", "aetheliano"], weight: "leve" },
  { id: "capuz_sentinela", name: "Capuz da Sentinela", rarity: "rare", slot: "helmet", stats: { def: 3, dex: 2, intel: 1 }, image: NW("capuz_sentinela"), buy: 2400, minLevel: 20, sell: 800, affinity: ["elfo", "aetheliano"], weight: "leve" },
  { id: "coroa_vorlag", name: "Coroa de Vorlag", rarity: "legendary", slot: "helmet", stats: { def: 5, atk: 3, intel: 3 }, image: IT("coroa_vorlag"), minLevel: 24, sell: 2200, weight: "media" },
  { id: "elmo_estelar", name: "Elmo de Aço Estelar", rarity: "epic", slot: "helmet", stats: { def: 7, con: 3 }, image: NW("elmo_estelar"), minLevel: 28, sell: 1600, affinity: ["anao", "gronar"], weight: "pesada" },

  // ── Armaduras ──
  { id: "gibao_couro", name: "Gibão de Couro", rarity: "common", slot: "armor", stats: { def: 3 }, image: IT("gibao_couro"), buy: 100, minLevel: 1, sell: 30, weight: "leve" },
  { id: "cota_malha", name: "Cota de Malha", rarity: "rare", slot: "armor", stats: { def: 6, con: 1 }, image: IT("cota_malha"), buy: 650, minLevel: 6, sell: 220, affinity: ["humano", "gronar"], weight: "media" },
  { id: "peitoral_anao", name: "Peitoral de Placas Anão", rarity: "epic", slot: "armor", stats: { def: 8, con: 2 }, image: A("peitoral_de_placas_anao"), buy: 1400, minLevel: 8, sell: 470, affinity: ["anao"], weight: "pesada" },
  { id: "manto_arcano", name: "Manto Arcano", rarity: "epic", slot: "armor", stats: { def: 6, intel: 5 }, image: IT("manto_arcano"), minLevel: 14, sell: 800, affinity: ["aetheliano", "elfo"], weight: "leve" },
  { id: "couraca_escamas", name: "Couraça de Escamas", rarity: "rare", slot: "armor", stats: { def: 10, con: 2 }, image: NW("couraca_escamas"), buy: 2800, minLevel: 18, sell: 900, affinity: ["humano", "gronar"], weight: "media" },
  { id: "armadura_celeste", name: "Armadura Celeste", rarity: "legendary", slot: "armor", stats: { def: 16, con: 4 }, image: IT("armadura_celeste"), minLevel: 26, sell: 2600, weight: "pesada" },
  { id: "veste_lunar", name: "Veste Lunar das Sombras", rarity: "legendary", slot: "armor", stats: { def: 11, dex: 5, intel: 4 }, image: NW("veste_lunar"), minLevel: 32, sell: 3000, affinity: ["elfo", "aetheliano"], weight: "leve" },

  // ── Botas ──
  { id: "botas_couro", name: "Botas de Couro", rarity: "common", slot: "boots", stats: { dex: 1, def: 1 }, image: IT("botas_couro"), buy: 80, minLevel: 1, sell: 25, weight: "leve" },
  { id: "botas_patrulheiro", name: "Botas do Patrulheiro", rarity: "rare", slot: "boots", stats: { dex: 3, def: 1 }, image: IT("botas_patrulheiro"), buy: 520, minLevel: 6, sell: 180, affinity: ["elfo", "humano"], weight: "leve" },
  { id: "botas_cavaleiro", name: "Botas de Cavaleiro", rarity: "rare", slot: "boots", stats: { def: 2, con: 1, str: 1 }, image: NW("botas_cavaleiro"), buy: 1200, minLevel: 10, sell: 400, affinity: ["humano", "gronar"], weight: "media" },
  { id: "grevas_runicas", name: "Grevas Rúnicas", rarity: "epic", slot: "boots", stats: { def: 4, dex: 2 }, image: IT("grevas_runicas"), minLevel: 14, sell: 750, affinity: ["anao"], weight: "pesada" },
  { id: "botas_vento", name: "Botas do Vento Celeste", rarity: "legendary", slot: "boots", stats: { dex: 7, def: 3 }, image: IT("botas_vento"), minLevel: 26, sell: 2400, weight: "leve" },
  { id: "botas_guardiao", name: "Botas do Guardião", rarity: "epic", slot: "boots", stats: { def: 5, con: 2, dex: 2 }, image: NW("botas_guardiao"), minLevel: 28, sell: 1500, weight: "media" },
  { id: "grevas_eter", name: "Grevas de Éter", rarity: "epic", slot: "boots", stats: { def: 7, con: 3 }, image: NW("grevas_eter"), minLevel: 32, sell: 1700, affinity: ["anao"], weight: "pesada" },

  // ── Acessórios ──
  { id: "anel_vigor", name: "Anel do Vigor", rarity: "rare", slot: "accessory", stats: { con: 4, def: 1 }, image: IT("anel_vigor"), buy: 450, minLevel: 4, sell: 160 },
  { id: "estandarte_inspirador", name: "Estandarte Inspirador", rarity: "rare", slot: "accessory", stats: { atk: 2, con: 2 }, image: A("estandarte_inspirador"), buy: 600, minLevel: 5, sell: 220, affinity: ["humano", "gronar"] },
  { id: "foco_arcano", name: "Foco de Canalização Arcana", rarity: "epic", slot: "accessory", stats: { intel: 6, def: 1 }, image: A("canalizacao_de_magia"), buy: 1800, minLevel: 12, sell: 650, affinity: ["aetheliano"] },
  { id: "amuleto_serpente", name: "Amuleto da Serpente Sinistra", rarity: "legendary", slot: "accessory", stats: { atk: 4, def: 3, intel: 3 }, image: A("amuleto_da_serpente_sinistra"), buy: 5000, minLevel: 18, sell: 1500 },
  { id: "anel_tempestade", name: "Anel da Tempestade", rarity: "rare", slot: "accessory", stats: { atk: 2, dex: 3 }, image: NW("anel_tempestade"), buy: 3000, minLevel: 22, sell: 1000, affinity: ["elfo", "humano"] },
  { id: "talisma_estelar", name: "Talismã Estelar", rarity: "epic", slot: "accessory", stats: { intel: 6, con: 3, def: 2 }, image: NW("talisma_estelar"), minLevel: 30, sell: 1800, affinity: ["aetheliano"] },
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
