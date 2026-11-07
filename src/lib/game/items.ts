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
// Progressão por classe (níveis 5…38): artes do Canva, nomes novos.
const TI = (f: string) => `/assets/items/tier/${f}.webp`;

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
  { id: "tridente_meria", name: "Tridente de Meria", rarity: "legendary", slot: "weapon", stats: { atk: 20, intel: 8 }, image: IT("tridente_meria"), minLevel: 30, sell: 2800, affinity: ["aetheliano"], weapon: "tridente" },
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

  // ── Progressão completa por classe (níveis 5, 7, 10, 13, 15, 17, 20 … 38) ──
  // Cada família (arma de cada raça, peças leves/pesadas e acessórios) tem item a cada poucos níveis.
  // Até o nível 17 o Ferreiro vende; acima, só drop/missão/masmorra. Artes: Canva.
  // Espadas
  { id: "espada_do_recruta", name: "Espada do Recruta", rarity: "common", slot: "weapon", stats: { atk: 5, str: 2 }, image: TI("espada_do_recruta"), buy: 430, minLevel: 5, sell: 140, affinity: ["humano"], weapon: "espada" },
  { id: "gladio_de_ferro", name: "Gládio de Ferro", rarity: "rare", slot: "weapon", stats: { atk: 9, str: 2 }, image: TI("gladio_de_ferro"), buy: 1340, minLevel: 10, sell: 450, affinity: ["humano"], weapon: "espada" },
  { id: "espada_da_guarda", name: "Espada da Guarda", rarity: "rare", slot: "weapon", stats: { atk: 11, str: 3 }, image: TI("espada_da_guarda"), buy: 2070, minLevel: 13, sell: 690, affinity: ["humano"], weapon: "espada" },
  { id: "sabre_do_veterano", name: "Sabre do Veterano", rarity: "rare", slot: "weapon", stats: { atk: 12, str: 3 }, image: TI("sabre_do_veterano"), buy: 2620, minLevel: 15, sell: 870, affinity: ["humano"], weapon: "espada" },
  { id: "lamina_do_juramento", name: "Lâmina do Juramento", rarity: "epic", slot: "weapon", stats: { atk: 16, str: 4, dex: 1 }, image: TI("lamina_do_juramento"), minLevel: 20, sell: 1510, affinity: ["humano"], weapon: "espada" },
  { id: "espada_runica", name: "Espada Rúnica", rarity: "epic", slot: "weapon", stats: { atk: 18, str: 4, dex: 2 }, image: TI("espada_runica"), minLevel: 23, sell: 1910, affinity: ["humano"], weapon: "espada" },
  { id: "espada_do_alvorecer", name: "Espada do Alvorecer", rarity: "epic", slot: "weapon", stats: { atk: 20, str: 5, dex: 2 }, image: TI("espada_do_alvorecer"), minLevel: 26, sell: 2330, affinity: ["humano"], weapon: "espada" },
  { id: "montante_real", name: "Montante Real", rarity: "legendary", slot: "weapon", stats: { atk: 26, str: 6, dex: 2 }, image: TI("montante_real"), minLevel: 32, sell: 3500, affinity: ["humano"], weapon: "espada" },
  { id: "lamina_do_firmamento", name: "Lâmina do Firmamento", rarity: "legendary", slot: "weapon", stats: { atk: 28, str: 6, dex: 2 }, image: TI("lamina_do_firmamento"), minLevel: 35, sell: 4060, affinity: ["humano"], weapon: "espada" },
  { id: "espada_do_rei_eterno", name: "Espada do Rei Eterno", rarity: "legendary", slot: "weapon", stats: { atk: 30, str: 6, dex: 3 }, image: TI("espada_do_rei_eterno"), minLevel: 38, sell: 4650, affinity: ["humano"], weapon: "espada" },
  // Arcos
  { id: "arco_do_cacador", name: "Arco do Caçador", rarity: "common", slot: "weapon", stats: { atk: 5, dex: 2 }, image: TI("arco_do_cacador"), buy: 430, minLevel: 5, sell: 140, affinity: ["elfo"], weapon: "arco" },
  { id: "arco_de_teixo", name: "Arco de Teixo", rarity: "rare", slot: "weapon", stats: { atk: 7, dex: 2 }, image: TI("arco_de_teixo"), buy: 740, minLevel: 7, sell: 250, affinity: ["elfo"], weapon: "arco" },
  { id: "arco_do_batedor", name: "Arco do Batedor", rarity: "rare", slot: "weapon", stats: { atk: 9, dex: 2 }, image: TI("arco_do_batedor"), buy: 1340, minLevel: 10, sell: 450, affinity: ["elfo"], weapon: "arco" },
  { id: "arco_do_vento_norte", name: "Arco do Vento Norte", rarity: "epic", slot: "weapon", stats: { atk: 16, dex: 4 }, image: TI("arco_do_vento_norte"), minLevel: 20, sell: 1510, affinity: ["elfo"], weapon: "arco" },
  { id: "arco_de_prata_elfica", name: "Arco de Prata Élfica", rarity: "epic", slot: "weapon", stats: { atk: 18, dex: 4 }, image: TI("arco_de_prata_elfica"), minLevel: 23, sell: 1910, affinity: ["elfo"], weapon: "arco" },
  { id: "arco_estrelado", name: "Arco Estrelado", rarity: "epic", slot: "weapon", stats: { atk: 20, dex: 5 }, image: TI("arco_estrelado"), minLevel: 26, sell: 2330, affinity: ["elfo"], weapon: "arco" },
  { id: "arco_do_crepusculo", name: "Arco do Crepúsculo", rarity: "legendary", slot: "weapon", stats: { atk: 26, dex: 6 }, image: TI("arco_do_crepusculo"), minLevel: 32, sell: 3500, affinity: ["elfo"], weapon: "arco" },
  { id: "arco_da_aurora_boreal", name: "Arco da Aurora Boreal", rarity: "legendary", slot: "weapon", stats: { atk: 28, dex: 6 }, image: TI("arco_da_aurora_boreal"), minLevel: 35, sell: 4060, affinity: ["elfo"], weapon: "arco" },
  { id: "arco_do_ultimo_luar", name: "Arco do Último Luar", rarity: "legendary", slot: "weapon", stats: { atk: 30, dex: 6 }, image: TI("arco_do_ultimo_luar"), minLevel: 38, sell: 4650, affinity: ["elfo"], weapon: "arco" },
  // Martelos
  { id: "martelo_de_pedra", name: "Martelo de Pedra", rarity: "rare", slot: "weapon", stats: { atk: 9, str: 2 }, image: TI("martelo_de_pedra"), buy: 1340, minLevel: 10, sell: 450, affinity: ["anao"], weapon: "martelo" },
  { id: "martelo_do_ferreiro", name: "Martelo do Ferreiro", rarity: "rare", slot: "weapon", stats: { atk: 12, str: 3 }, image: TI("martelo_do_ferreiro"), buy: 2620, minLevel: 15, sell: 870, affinity: ["anao"], weapon: "martelo" },
  { id: "malho_de_bronze", name: "Malho de Bronze", rarity: "rare", slot: "weapon", stats: { atk: 14, str: 3 }, image: TI("malho_de_bronze"), buy: 3220, minLevel: 17, sell: 1070, affinity: ["anao"], weapon: "martelo" },
  { id: "martelo_da_montanha", name: "Martelo da Montanha", rarity: "epic", slot: "weapon", stats: { atk: 17, str: 4, con: 1 }, image: TI("martelo_da_montanha"), minLevel: 20, sell: 1510, affinity: ["anao"], weapon: "martelo" },
  { id: "martelo_runico_de_guerra", name: "Martelo Rúnico de Guerra", rarity: "epic", slot: "weapon", stats: { atk: 19, str: 4, con: 2 }, image: TI("martelo_runico_de_guerra"), minLevel: 23, sell: 1910, affinity: ["anao"], weapon: "martelo" },
  { id: "malho_do_trovao_profundo", name: "Malho do Trovão Profundo", rarity: "epic", slot: "weapon", stats: { atk: 21, str: 5, con: 2 }, image: TI("malho_do_trovao_profundo"), minLevel: 26, sell: 2330, affinity: ["anao"], weapon: "martelo" },
  { id: "martelo_do_rei_anao", name: "Martelo do Rei Anão", rarity: "legendary", slot: "weapon", stats: { atk: 27, str: 6, con: 2 }, image: TI("martelo_do_rei_anao"), minLevel: 32, sell: 3500, affinity: ["anao"], weapon: "martelo" },
  { id: "martelo_ancestral", name: "Martelo Ancestral", rarity: "legendary", slot: "weapon", stats: { atk: 29, str: 6, con: 2 }, image: TI("martelo_ancestral"), minLevel: 35, sell: 4060, affinity: ["anao"], weapon: "martelo" },
  { id: "martelo_do_coracao_da_terra", name: "Martelo do Coração da Terra", rarity: "legendary", slot: "weapon", stats: { atk: 31, str: 6, con: 3 }, image: TI("martelo_do_coracao_da_terra"), minLevel: 38, sell: 4650, affinity: ["anao"], weapon: "martelo" },
  // Machados
  { id: "machado_do_lenhador", name: "Machado do Lenhador", rarity: "common", slot: "weapon", stats: { atk: 5, str: 2 }, image: TI("machado_do_lenhador"), buy: 430, minLevel: 5, sell: 140, affinity: ["gronar", "anao"], weapon: "machado" },
  { id: "machado_tribal", name: "Machado Tribal", rarity: "rare", slot: "weapon", stats: { atk: 7, str: 2 }, image: TI("machado_tribal"), buy: 740, minLevel: 7, sell: 250, affinity: ["gronar", "anao"], weapon: "machado" },
  { id: "machado_de_duas_laminas", name: "Machado de Duas Lâminas", rarity: "rare", slot: "weapon", stats: { atk: 11, str: 3 }, image: TI("machado_de_duas_laminas"), buy: 2070, minLevel: 13, sell: 690, affinity: ["gronar", "anao"], weapon: "machado" },
  { id: "machado_do_berserker", name: "Machado do Berserker", rarity: "rare", slot: "weapon", stats: { atk: 12, str: 3 }, image: TI("machado_do_berserker"), buy: 2620, minLevel: 15, sell: 870, affinity: ["gronar", "anao"], weapon: "machado" },
  { id: "machado_sanguinario", name: "Machado Sanguinário", rarity: "rare", slot: "weapon", stats: { atk: 14, str: 3 }, image: TI("machado_sanguinario"), buy: 3220, minLevel: 17, sell: 1070, affinity: ["gronar", "anao"], weapon: "machado" },
  { id: "machado_do_chefe_guerreiro", name: "Machado do Chefe Guerreiro", rarity: "epic", slot: "weapon", stats: { atk: 17, str: 4 }, image: TI("machado_do_chefe_guerreiro"), minLevel: 20, sell: 1510, affinity: ["gronar", "anao"], weapon: "machado" },
  { id: "machado_da_furia", name: "Machado da Fúria", rarity: "epic", slot: "weapon", stats: { atk: 21, str: 5 }, image: TI("machado_da_furia"), minLevel: 26, sell: 2330, affinity: ["gronar", "anao"], weapon: "machado" },
  { id: "machado_rachador_de_cranios", name: "Machado Rachador de Crânios", rarity: "epic", slot: "weapon", stats: { atk: 23, str: 5 }, image: TI("machado_rachador_de_cranios"), minLevel: 29, sell: 2790, affinity: ["gronar", "anao"], weapon: "machado" },
  { id: "machado_do_tita", name: "Machado do Titã", rarity: "legendary", slot: "weapon", stats: { atk: 29, str: 6 }, image: TI("machado_do_tita"), minLevel: 35, sell: 4060, affinity: ["gronar", "anao"], weapon: "machado" },
  { id: "machado_do_fim_dos_tempos", name: "Machado do Fim dos Tempos", rarity: "legendary", slot: "weapon", stats: { atk: 31, str: 6 }, image: TI("machado_do_fim_dos_tempos"), minLevel: 38, sell: 4650, affinity: ["gronar", "anao"], weapon: "machado" },
  // Cajados
  { id: "cajado_do_aprendiz", name: "Cajado do Aprendiz", rarity: "common", slot: "weapon", stats: { atk: 2, intel: 3 }, image: TI("cajado_do_aprendiz"), buy: 430, minLevel: 5, sell: 140, affinity: ["aetheliano"], weapon: "cajado" },
  { id: "cajado_de_cristal_azul", name: "Cajado de Cristal Azul", rarity: "rare", slot: "weapon", stats: { atk: 3, intel: 5 }, image: TI("cajado_de_cristal_azul"), buy: 740, minLevel: 7, sell: 250, affinity: ["aetheliano"], weapon: "cajado" },
  { id: "cajado_do_iniciado", name: "Cajado do Iniciado", rarity: "rare", slot: "weapon", stats: { atk: 4, intel: 6 }, image: TI("cajado_do_iniciado"), buy: 1340, minLevel: 10, sell: 450, affinity: ["aetheliano"], weapon: "cajado" },
  { id: "cajado_das_mares", name: "Cajado das Marés", rarity: "rare", slot: "weapon", stats: { atk: 6, intel: 8 }, image: TI("cajado_das_mares"), buy: 2620, minLevel: 15, sell: 870, affinity: ["aetheliano"], weapon: "cajado" },
  { id: "cajado_do_arcanista", name: "Cajado do Arcanista", rarity: "rare", slot: "weapon", stats: { atk: 6, intel: 8 }, image: TI("cajado_do_arcanista"), buy: 3220, minLevel: 17, sell: 1070, affinity: ["aetheliano"], weapon: "cajado" },
  { id: "cajado_da_lua_crescente", name: "Cajado da Lua Crescente", rarity: "epic", slot: "weapon", stats: { atk: 8, intel: 10 }, image: TI("cajado_da_lua_crescente"), minLevel: 20, sell: 1510, affinity: ["aetheliano"], weapon: "cajado" },
  { id: "cajado_do_arquimago", name: "Cajado do Arquimago", rarity: "epic", slot: "weapon", stats: { atk: 10, intel: 13 }, image: TI("cajado_do_arquimago"), minLevel: 26, sell: 2330, affinity: ["aetheliano"], weapon: "cajado" },
  { id: "cajado_das_constelacoes", name: "Cajado das Constelações", rarity: "epic", slot: "weapon", stats: { atk: 10, intel: 14 }, image: TI("cajado_das_constelacoes"), minLevel: 29, sell: 2790, affinity: ["aetheliano"], weapon: "cajado" },
  { id: "cajado_do_veu_etereo", name: "Cajado do Véu Etéreo", rarity: "legendary", slot: "weapon", stats: { atk: 12, intel: 16 }, image: TI("cajado_do_veu_etereo"), minLevel: 32, sell: 3500, affinity: ["aetheliano"], weapon: "cajado" },
  { id: "cajado_do_primeiro_arcano", name: "Cajado do Primeiro Arcano", rarity: "legendary", slot: "weapon", stats: { atk: 14, intel: 19 }, image: TI("cajado_do_primeiro_arcano"), minLevel: 38, sell: 4650, affinity: ["aetheliano"], weapon: "cajado" },
  // Elmos leves
  { id: "capuz_de_la", name: "Capuz de Lã", rarity: "common", slot: "helmet", stats: { def: 1, dex: 1, intel: 1 }, image: TI("capuz_de_la"), buy: 430, minLevel: 5, sell: 140, affinity: ["elfo", "aetheliano"], weight: "leve" },
  { id: "capuz_do_arqueiro", name: "Capuz do Arqueiro", rarity: "rare", slot: "helmet", stats: { def: 2, dex: 1, intel: 1 }, image: TI("capuz_do_arqueiro"), buy: 1340, minLevel: 10, sell: 450, affinity: ["elfo", "aetheliano"], weight: "leve" },
  { id: "diadema_etereo", name: "Diadema Etéreo", rarity: "epic", slot: "helmet", stats: { def: 5, dex: 2, intel: 2 }, image: TI("diadema_etereo"), minLevel: 25, sell: 2190, affinity: ["elfo", "aetheliano"], weight: "leve" },
  { id: "capuz_das_sombras_celestes", name: "Capuz das Sombras Celestes", rarity: "legendary", slot: "helmet", stats: { def: 7, dex: 3, intel: 3 }, image: TI("capuz_das_sombras_celestes"), minLevel: 30, sell: 3150, affinity: ["elfo", "aetheliano"], weight: "leve" },
  { id: "diadema_da_noite_eterna", name: "Diadema da Noite Eterna", rarity: "legendary", slot: "helmet", stats: { def: 8, dex: 3, intel: 3 }, image: TI("diadema_da_noite_eterna"), minLevel: 35, sell: 4060, affinity: ["elfo", "aetheliano"], weight: "leve" },
  // Elmos pesados
  { id: "elmo_de_bronze", name: "Elmo de Bronze", rarity: "common", slot: "helmet", stats: { def: 2, con: 1 }, image: TI("elmo_de_bronze"), buy: 430, minLevel: 5, sell: 140, affinity: ["anao", "gronar"], weight: "pesada" },
  { id: "elmo_do_soldado", name: "Elmo do Soldado", rarity: "rare", slot: "helmet", stats: { def: 4, con: 1 }, image: TI("elmo_do_soldado"), buy: 1340, minLevel: 10, sell: 450, affinity: ["anao", "gronar"], weight: "pesada" },
  { id: "elmo_de_placas", name: "Elmo de Placas", rarity: "rare", slot: "helmet", stats: { def: 5, con: 1 }, image: TI("elmo_de_placas"), buy: 2620, minLevel: 15, sell: 870, affinity: ["anao", "gronar"], weight: "pesada" },
  { id: "elmo_do_guardiao", name: "Elmo do Guardião", rarity: "epic", slot: "helmet", stats: { def: 7, con: 2 }, image: TI("elmo_do_guardiao"), minLevel: 20, sell: 1510, affinity: ["anao", "gronar"], weight: "pesada" },
  { id: "elmo_runico", name: "Elmo Rúnico", rarity: "epic", slot: "helmet", stats: { def: 9, con: 2 }, image: TI("elmo_runico"), minLevel: 25, sell: 2190, affinity: ["anao", "gronar"], weight: "pesada" },
  { id: "elmo_do_colosso", name: "Elmo do Colosso", rarity: "legendary", slot: "helmet", stats: { def: 11, con: 3 }, image: TI("elmo_do_colosso"), minLevel: 30, sell: 3150, affinity: ["anao", "gronar"], weight: "pesada" },
  { id: "elmo_do_rei_da_montanha", name: "Elmo do Rei da Montanha", rarity: "legendary", slot: "helmet", stats: { def: 12, con: 3 }, image: TI("elmo_do_rei_da_montanha"), minLevel: 35, sell: 4060, affinity: ["anao", "gronar"], weight: "pesada" },
  // Armaduras leves
  { id: "tunica_do_aprendiz", name: "Túnica do Aprendiz", rarity: "common", slot: "armor", stats: { def: 2, dex: 1, intel: 1 }, image: TI("tunica_do_aprendiz"), buy: 430, minLevel: 5, sell: 140, affinity: ["elfo", "aetheliano"], weight: "leve" },
  { id: "veste_do_batedor", name: "Veste do Batedor", rarity: "rare", slot: "armor", stats: { def: 4, dex: 2, intel: 2 }, image: TI("veste_do_batedor"), buy: 1340, minLevel: 10, sell: 450, affinity: ["elfo", "aetheliano"], weight: "leve" },
  { id: "manto_do_arcanista", name: "Manto do Arcanista", rarity: "epic", slot: "armor", stats: { def: 8, dex: 3, intel: 3 }, image: TI("manto_do_arcanista"), minLevel: 20, sell: 1510, affinity: ["elfo", "aetheliano"], weight: "leve" },
  { id: "manto_das_estrelas", name: "Manto das Estrelas", rarity: "epic", slot: "armor", stats: { def: 10, dex: 4, intel: 4 }, image: TI("manto_das_estrelas"), minLevel: 25, sell: 2190, affinity: ["elfo", "aetheliano"], weight: "leve" },
  { id: "veste_do_crepusculo", name: "Veste do Crepúsculo", rarity: "legendary", slot: "armor", stats: { def: 12, dex: 5, intel: 5 }, image: TI("veste_do_crepusculo"), minLevel: 30, sell: 3150, affinity: ["elfo", "aetheliano"], weight: "leve" },
  { id: "manto_do_veu_etereo", name: "Manto do Véu Etéreo", rarity: "legendary", slot: "armor", stats: { def: 14, dex: 5, intel: 5 }, image: TI("manto_do_veu_etereo"), minLevel: 35, sell: 4060, affinity: ["elfo", "aetheliano"], weight: "leve" },
  // Armaduras pesadas
  { id: "cota_de_bronze", name: "Cota de Bronze", rarity: "common", slot: "armor", stats: { def: 4, con: 1 }, image: TI("cota_de_bronze"), buy: 430, minLevel: 5, sell: 140, affinity: ["anao", "gronar"], weight: "pesada" },
  { id: "armadura_de_placas", name: "Armadura de Placas", rarity: "rare", slot: "armor", stats: { def: 7, con: 2 }, image: TI("armadura_de_placas"), buy: 1340, minLevel: 10, sell: 450, affinity: ["anao", "gronar"], weight: "pesada" },
  { id: "couraca_do_guardiao", name: "Couraça do Guardião", rarity: "rare", slot: "armor", stats: { def: 10, con: 3 }, image: TI("couraca_do_guardiao"), buy: 2620, minLevel: 15, sell: 870, affinity: ["anao", "gronar"], weight: "pesada" },
  { id: "armadura_runica", name: "Armadura Rúnica", rarity: "epic", slot: "armor", stats: { def: 13, con: 3 }, image: TI("armadura_runica"), minLevel: 20, sell: 1510, affinity: ["anao", "gronar"], weight: "pesada" },
  { id: "armadura_do_colosso", name: "Armadura do Colosso", rarity: "legendary", slot: "armor", stats: { def: 20, con: 5 }, image: TI("armadura_do_colosso"), minLevel: 30, sell: 3150, affinity: ["anao", "gronar"], weight: "pesada" },
  { id: "armadura_do_rei_da_montanha", name: "Armadura do Rei da Montanha", rarity: "legendary", slot: "armor", stats: { def: 22, con: 6 }, image: TI("armadura_do_rei_da_montanha"), minLevel: 35, sell: 4060, affinity: ["anao", "gronar"], weight: "pesada" },
  // Botas leves
  { id: "sapatilhas_do_batedor", name: "Sapatilhas do Batedor", rarity: "rare", slot: "boots", stats: { def: 2, dex: 1 }, image: TI("sapatilhas_do_batedor"), buy: 1340, minLevel: 10, sell: 450, affinity: ["elfo", "aetheliano"], weight: "leve" },
  { id: "botas_do_andarilho", name: "Botas do Andarilho", rarity: "rare", slot: "boots", stats: { def: 3, dex: 1 }, image: TI("botas_do_andarilho"), buy: 2620, minLevel: 15, sell: 870, affinity: ["elfo", "aetheliano"], weight: "leve" },
  { id: "botas_da_brisa", name: "Botas da Brisa", rarity: "epic", slot: "boots", stats: { def: 4, dex: 2 }, image: TI("botas_da_brisa"), minLevel: 20, sell: 1510, affinity: ["elfo", "aetheliano"], weight: "leve" },
  { id: "botas_etereas", name: "Botas Etéreas", rarity: "legendary", slot: "boots", stats: { def: 6, dex: 2 }, image: TI("botas_etereas"), minLevel: 30, sell: 3150, affinity: ["elfo", "aetheliano"], weight: "leve" },
  { id: "botas_do_passo_estelar", name: "Botas do Passo Estelar", rarity: "legendary", slot: "boots", stats: { def: 7, dex: 3 }, image: TI("botas_do_passo_estelar"), minLevel: 35, sell: 4060, affinity: ["elfo", "aetheliano"], weight: "leve" },
  // Botas pesadas
  { id: "botas_de_bronze", name: "Botas de Bronze", rarity: "common", slot: "boots", stats: { def: 2, con: 1 }, image: TI("botas_de_bronze"), buy: 430, minLevel: 5, sell: 140, affinity: ["anao", "gronar"], weight: "pesada" },
  { id: "grevas_do_soldado", name: "Grevas do Soldado", rarity: "rare", slot: "boots", stats: { def: 4, con: 1 }, image: TI("grevas_do_soldado"), buy: 1340, minLevel: 10, sell: 450, affinity: ["anao", "gronar"], weight: "pesada" },
  { id: "grevas_de_placas", name: "Grevas de Placas", rarity: "epic", slot: "boots", stats: { def: 6, con: 2 }, image: TI("grevas_de_placas"), minLevel: 20, sell: 1510, affinity: ["anao", "gronar"], weight: "pesada" },
  { id: "grevas_do_guardiao", name: "Grevas do Guardião", rarity: "epic", slot: "boots", stats: { def: 8, con: 2 }, image: TI("grevas_do_guardiao"), minLevel: 25, sell: 2190, affinity: ["anao", "gronar"], weight: "pesada" },
  { id: "grevas_do_colosso", name: "Grevas do Colosso", rarity: "legendary", slot: "boots", stats: { def: 10, con: 2 }, image: TI("grevas_do_colosso"), minLevel: 30, sell: 3150, affinity: ["anao", "gronar"], weight: "pesada" },
  { id: "grevas_do_rei_da_montanha", name: "Grevas do Rei da Montanha", rarity: "legendary", slot: "boots", stats: { def: 11, con: 3 }, image: TI("grevas_do_rei_da_montanha"), minLevel: 35, sell: 4060, affinity: ["anao", "gronar"], weight: "pesada" },
  // Acessórios arcanos
  { id: "anel_do_aprendiz", name: "Anel do Aprendiz", rarity: "rare", slot: "accessory", stats: { intel: 4, def: 1 }, image: TI("anel_do_aprendiz"), buy: 740, minLevel: 7, sell: 250, affinity: ["aetheliano"] },
  { id: "pingente_arcano", name: "Pingente Arcano", rarity: "rare", slot: "accessory", stats: { intel: 6, def: 1 }, image: TI("pingente_arcano"), buy: 2620, minLevel: 15, sell: 870, affinity: ["aetheliano"] },
  { id: "orbe_das_mares", name: "Orbe das Marés", rarity: "epic", slot: "accessory", stats: { intel: 10, def: 2 }, image: TI("orbe_das_mares"), minLevel: 23, sell: 1910, affinity: ["aetheliano"] },
  { id: "coracao_do_primeiro_arcano", name: "Coração do Primeiro Arcano", rarity: "legendary", slot: "accessory", stats: { intel: 15, def: 3 }, image: TI("coracao_do_primeiro_arcano"), minLevel: 38, sell: 4650, affinity: ["aetheliano"] },
  // Acessórios ágeis
  { id: "anel_da_agilidade", name: "Anel da Agilidade", rarity: "rare", slot: "accessory", stats: { dex: 3, atk: 1 }, image: TI("anel_da_agilidade"), buy: 740, minLevel: 7, sell: 250, affinity: ["elfo"] },
  { id: "bracelete_do_cacador", name: "Bracelete do Caçador", rarity: "rare", slot: "accessory", stats: { dex: 4, atk: 2 }, image: TI("bracelete_do_cacador"), buy: 2620, minLevel: 15, sell: 870, affinity: ["elfo"] },
  { id: "anel_do_vento_veloz", name: "Anel do Vento Veloz", rarity: "legendary", slot: "accessory", stats: { dex: 9, atk: 3 }, image: TI("anel_do_vento_veloz"), minLevel: 30, sell: 3150, affinity: ["elfo"] },
  { id: "pena_da_fenix_prateada", name: "Pena da Fênix Prateada", rarity: "legendary", slot: "accessory", stats: { dex: 11, atk: 4 }, image: TI("pena_da_fenix_prateada"), minLevel: 38, sell: 4650, affinity: ["elfo"] },
  // Acessórios de força
  { id: "bracelete_de_couro", name: "Bracelete de Couro", rarity: "rare", slot: "accessory", stats: { str: 2, atk: 2 }, image: TI("bracelete_de_couro"), buy: 740, minLevel: 7, sell: 250, affinity: ["gronar", "humano"] },
  { id: "anel_do_guerreiro", name: "Anel do Guerreiro", rarity: "rare", slot: "accessory", stats: { str: 4, atk: 3 }, image: TI("anel_do_guerreiro"), buy: 2620, minLevel: 15, sell: 870, affinity: ["gronar", "humano"] },
  { id: "insignia_do_campeao", name: "Insígnia do Campeão", rarity: "legendary", slot: "accessory", stats: { str: 8, atk: 6 }, image: TI("insignia_do_campeao"), minLevel: 30, sell: 3150, affinity: ["gronar", "humano"] },
  { id: "medalhao_do_tita", name: "Medalhão do Titã", rarity: "legendary", slot: "accessory", stats: { str: 10, atk: 7 }, image: TI("medalhao_do_tita"), minLevel: 38, sell: 4650, affinity: ["gronar", "humano"] },
  // Acessórios de guarda
  { id: "amuleto_de_pedra", name: "Amuleto de Pedra", rarity: "rare", slot: "accessory", stats: { con: 4, def: 2 }, image: TI("amuleto_de_pedra"), buy: 740, minLevel: 7, sell: 250, affinity: ["anao"] },
  { id: "pingente_do_guardiao", name: "Pingente do Guardião", rarity: "rare", slot: "accessory", stats: { con: 6, def: 2 }, image: TI("pingente_do_guardiao"), buy: 2620, minLevel: 15, sell: 870, affinity: ["anao"] },
  { id: "amuleto_da_montanha", name: "Amuleto da Montanha", rarity: "epic", slot: "accessory", stats: { con: 8, def: 4 }, image: TI("amuleto_da_montanha"), minLevel: 23, sell: 1910, affinity: ["anao"] },
  { id: "coracao_do_colosso", name: "Coração do Colosso", rarity: "legendary", slot: "accessory", stats: { con: 13, def: 6 }, image: TI("coracao_do_colosso"), minLevel: 38, sell: 4650, affinity: ["anao"] },
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
