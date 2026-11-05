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
