// Expedições da Guilda: caçadas, missões e incursões pagas com o OURO DO TESOURO da guilda.
import { MONSTER_DIFFICULTY } from "./enemies";
// Quem organiza abre um saguão de alguns minutos para os membros entrarem (ou parte sozinho);
// o grupo viaja por 15 min a 2 h e, na volta, cada participante resgata a sua recompensa.
// Tudo aqui é regra pura (sem banco): o servidor usa para sortear, a tela para explicar.
import type { RaceId } from "./data";
import { ITEMS, type ItemDef } from "./items";

export type ExpeditionKind = "hunt" | "mission" | "raid";
export const KIND_LABEL: Record<ExpeditionKind, string> = { hunt: "Caçada", mission: "Missão", raid: "Incursão" };
export const KIND_ICON: Record<ExpeditionKind, string> = { hunt: "🏹", mission: "📜", raid: "🐉" };

export type Expedition = {
  id: string; kind: ExpeditionKind; name: string; foe: string; description: string; image: string;
  /** Duração da viagem, em minutos. */
  minutes: number;
  /** Custo em ouro do tesouro da guilda. */
  cost: number;
  /** Nível mínimo da guilda. */
  guildLevel: number;
  /** Máximo de participantes. */
  party: number;
  /** Poder de grupo recomendado (com ele a chance de sucesso é a máxima). */
  power: number;
  /** Recompensa de CADA participante num sucesso. */
  xp: number; gold: number;
  /** Poções de vida (mín–máx) e chance de um baú de masmorra. */
  potions: [number, number];
  chest?: { item: string; chance: number };
  /** Equipamento da própria raça já existente no jogo: raridades, faixa de nível e chance. */
  gear: { rarity: ItemDef["rarity"][]; minLevel: number; maxLevel: number; chance: number };
  /** Chance da relíquia lendária de expedição da raça (só incursões). */
  relic?: number;
  /** Raças que conhecem o terreno: +15% de poder para elas. */
  favored: RaceId[];
};

export const EXPEDITION_RULES = {
  /** Saguão: tempo para os membros entrarem antes da partida. */
  lobbySec: 300,
  /** Expedições da mesma guilda ao mesmo tempo. */
  maxActive: 3,
  favoredBonus: 0.15,
  /** +4% de poder por raça diferente no grupo além da primeira (até +16%). */
  diversityBonus: 0.04, diversityMax: 0.16,
  /** Fracasso: parte da recompensa que ainda volta. */
  failShare: 0.25,
  /** Triunfo: multiplicador de XP/ouro e da chance de itens. */
  triumphMult: 1.5, triumphLoot: 2,
  /** XP de guilda (% do custo) por resultado. */
  guildXpPct: { triumph: 12, success: 8, fail: 2 },
  /** Histórico mostrado na tela. */
  history: 8,
};

export const EXPEDITIONS: Expedition[] = [
  {
    id: "trilha_lobos", kind: "hunt", name: "Trilha dos Lobos Corrompidos", foe: "Alcateia Corrompida", image: "/assets/enemies/lobo_corrompido-hd.webp",
    description: "Uma alcateia tomada pela sombra ronda as estradas de Valerion. Rápido, barato e bom para esquentar o esquadrão.",
    minutes: 15, cost: 600, guildLevel: 1, party: 3, power: 350, xp: 120, gold: 90, potions: [1, 2],
    chest: { item: "bau_cripta", chance: 0.08 }, gear: { rarity: ["rare"], minLevel: 1, maxLevel: 12, chance: 0.05 }, favored: ["elfo", "humano"],
  },
  {
    id: "ninho_harpias", kind: "hunt", name: "Ninho das Harpias", foe: "Rainha das Harpias", image: "/assets/enemies/harpia_tempestade-v2.webp",
    description: "As harpias da tempestade fizeram ninho nas Agulhas Congeladas. Derrubem o ninho antes da próxima nevasca.",
    minutes: 30, cost: 1400, guildLevel: 2, party: 4, power: 900, xp: 280, gold: 160, potions: [1, 3],
    chest: { item: "bau_cripta", chance: 0.15 }, gear: { rarity: ["rare", "epic"], minLevel: 5, maxLevel: 18, chance: 0.07 }, favored: ["elfo", "anao"],
  },
  {
    id: "caravana_ambar", kind: "mission", name: "Escolta da Caravana de Âmbar", foe: "Escorpiões do Deserto", image: "/assets/enemies/escorpiao_ambar-hd.webp",
    description: "Mercadores pagam bem por uma escolta pelo Deserto Âmbar. A travessia leva uma hora e os escorpiões não dão trégua.",
    minutes: 60, cost: 2800, guildLevel: 3, party: 5, power: 1800, xp: 600, gold: 260, potions: [2, 3],
    chest: { item: "bau_minas", chance: 0.18 }, gear: { rarity: ["rare", "epic"], minLevel: 10, maxLevel: 24, chance: 0.09 }, favored: ["humano", "gronar"],
  },
  {
    id: "ruinas_sussurrantes", kind: "mission", name: "Segredo das Ruínas Sussurrantes", foe: "Espectro do Vazio", image: "/assets/enemies/espectro_vazio-v2.webp",
    description: "Vozes chamam do fundo das ruínas. Recuperem os pergaminhos antes que o Espectro do Vazio os consuma.",
    minutes: 90, cost: 4000, guildLevel: 5, party: 5, power: 3000, xp: 900, gold: 380, potions: [2, 4],
    chest: { item: "bau_fortaleza", chance: 0.18 }, gear: { rarity: ["epic"], minLevel: 14, maxLevel: 30, chance: 0.11 }, favored: ["aetheliano", "elfo"],
  },
  {
    id: "covil_dragao", kind: "raid", name: "Covil do Dragão Ancestral", foe: "Dragão Ancestral", image: "/assets/raids/dragao-v2.webp",
    description: "O Dragão Ancestral dorme sobre um tesouro sob Valerion. Uma incursão para um esquadrão inteiro.",
    minutes: 90, cost: 5000, guildLevel: 6, party: 6, power: 4500, xp: 1300, gold: 400, potions: [3, 5],
    chest: { item: "bau_fortaleza", chance: 0.25 }, gear: { rarity: ["epic"], minLevel: 18, maxLevel: 34, chance: 0.12 }, relic: 0.06, favored: ["anao", "humano"],
  },
  {
    id: "abismo_kraken", kind: "raid", name: "Abismo do Kraken", foe: "Kraken Abissal", image: "/assets/raids/kraken-v2.webp",
    description: "Navios somem na Costa de Meria. Desçam ao abismo e enfrentem o Kraken no próprio lar dele.",
    minutes: 120, cost: 9000, guildLevel: 9, party: 8, power: 8000, xp: 2200, gold: 520, potions: [3, 6],
    chest: { item: "bau_santuario", chance: 0.25 }, gear: { rarity: ["epic", "legendary"], minLevel: 22, maxLevel: 40, chance: 0.12 }, relic: 0.08, favored: ["aetheliano", "gronar"],
  },
  {
    id: "trono_tita", kind: "raid", name: "Trono do Titã de Gelo", foe: "Titã de Gelo", image: "/assets/raids/tita_gelo-v2.webp",
    description: "No topo das Agulhas, o Titã de Gelo desperta. A maior incursão de Aethelgard: só para guildas veteranas.",
    minutes: 120, cost: 15000, guildLevel: 12, party: 10, power: 13000, xp: 3600, gold: 700, potions: [4, 8],
    chest: { item: "bau_abismo", chance: 0.3 }, gear: { rarity: ["epic", "legendary"], minLevel: 26, maxLevel: 60, chance: 0.14 }, relic: 0.1, favored: ["anao", "gronar"],
  },
];
export const EXPEDITION_BY_ID: Record<string, Expedition> = Object.fromEntries(EXPEDITIONS.map((e) => [e.id, e]));

/** Relíquia lendária de expedição de cada raça (só nas incursões). */
export const EXPEDITION_RELICS: Record<RaceId, string> = {
  humano: "gladio_esquadrao", elfo: "arco_batedor_mor", anao: "martelo_vanguarda", gronar: "machado_incursor", aetheliano: "cajado_expedicionario",
};
export const ALL_EXPEDITION_RELICS = Object.values(EXPEDITION_RELICS);

// ── Estratégia (escolhida por quem organiza) ─────────────────────────
export type Strategy = "cautious" | "balanced" | "bold";
export const STRATEGIES: Record<Strategy, { name: string; icon: string; description: string; success: number; triumph: number; reward: number; loot: number }> = {
  cautious: { name: "Cautelosa", icon: "🛡️", description: "+10% de chance de sucesso, mas −25% de ouro e metade da chance de itens.", success: 0.1, triumph: 0, reward: 0.75, loot: 0.5 },
  balanced: { name: "Equilibrada", icon: "⚖️", description: "Sem bônus nem penalidade.", success: 0, triumph: 0, reward: 1, loot: 1 },
  bold: { name: "Ousada", icon: "🔥", description: "−15% de chance de sucesso, mas +25% de ouro, +50% de chance de itens e mais triunfos.", success: -0.15, triumph: 0.1, reward: 1.25, loot: 1.5 },
};
export const isStrategy = (s: unknown): s is Strategy => typeof s === "string" && s in STRATEGIES;

// ── Poder ────────────────────────────────────────────────────────────
/** Poder de expedição de um herói, a partir dos números de combate (com equipamentos, pet, talentos e bônus da guilda). */
export function heroPower(c: { atk: [number, number]; magic: [number, number]; def: number; maxHp: number }) {
  const atk = (c.atk[0] + c.atk[1]) / 2, magic = (c.magic[0] + c.magic[1]) / 2;
  return Math.round(Math.max(atk, magic * 0.75) * 4 + c.def * 3 + c.maxHp / 2);
}

export type Member = { power: number; race: string };
/** Poder do grupo: soma dos heróis (+15% para raças que conhecem o terreno) × bônus de diversidade de raças. */
export function partyPower(e: Expedition, members: Member[]) {
  const base = members.reduce((n, m) => n + m.power * (e.favored.includes(m.race as RaceId) ? 1 + EXPEDITION_RULES.favoredBonus : 1), 0);
  const races = new Set(members.map((m) => m.race)).size;
  const diversity = Math.min(EXPEDITION_RULES.diversityMax, Math.max(0, races - 1) * EXPEDITION_RULES.diversityBonus);
  return { total: Math.round(base * (1 + diversity)), diversity, races };
}

/** Poder recomendado de verdade (com os monstros mais fortes). */
export const expeditionPower = (e: Expedition) => Math.round(e.power * MONSTER_DIFFICULTY.hp);

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Chances de sucesso e de triunfo (triunfo = parte dos sucessos) para um poder de grupo e uma estratégia. */
export function expeditionOdds(e: Expedition, power: number, strategy: Strategy) {
  // Monstros 20% mais fortes (enemies.ts → MONSTER_DIFFICULTY): o grupo precisa de 20% mais poder.
  const ratio = power / expeditionPower(e);
  const s = STRATEGIES[strategy];
  const success = clamp(0.95 * Math.min(1, ratio) ** 1.6 + s.success, 0.05, 0.97);
  const triumph = clamp(0.1 + 0.4 * (ratio - 1) + s.triumph, 0.1, 0.6);
  return { ratio, success, triumph };
}

export type Outcome = "triumph" | "success" | "fail";
export const OUTCOME_LABEL: Record<Outcome, string> = { triumph: "Triunfo!", success: "Sucesso", fail: "Fracasso" };

/** XP e ouro de cada participante para um resultado (o servidor aplica; a tela mostra a previsão). */
export function expeditionPayout(e: Expedition, outcome: Outcome, strategy: Strategy) {
  const k = outcome === "fail" ? EXPEDITION_RULES.failShare : outcome === "triumph" ? EXPEDITION_RULES.triumphMult : 1;
  return { xp: Math.round(e.xp * k), gold: Math.round(e.gold * k * STRATEGIES[strategy].reward) };
}
/** Multiplicador da chance de itens (0 no fracasso). */
export function lootMult(outcome: Outcome, strategy: Strategy) {
  if (outcome === "fail") return 0;
  return (outcome === "triumph" ? EXPEDITION_RULES.triumphLoot : 1) * STRATEGIES[strategy].loot;
}
export const guildXpFor = (e: Expedition, outcome: Outcome) => Math.round(e.cost * EXPEDITION_RULES.guildXpPct[outcome] / 100);

/** Equipamentos da raça que esta expedição pode entregar (além da relíquia). */
export function gearPool(e: Expedition, race: string): ItemDef[] {
  return ITEMS.filter((i) => i.slot && i.affinity?.includes(race) && e.gear.rarity.includes(i.rarity)
    && (i.minLevel ?? 1) >= e.gear.minLevel && (i.minLevel ?? 1) <= e.gear.maxLevel && !ALL_EXPEDITION_RELICS.includes(i.id));
}

// ── Relato da viagem (sorteado no servidor, guardado com o resultado) ─
export const REPORT_LINES: Record<Outcome, string[]> = {
  triumph: [
    "O grupo pegou {foe} de surpresa e não deu chance de reação.",
    "Uma manobra perfeita encurralou {foe} logo no começo.",
    "O esquadrão voltou cantando: nem um arranhão sério.",
    "No caminho de volta ainda acharam um esconderijo cheio de suprimentos.",
  ],
  success: [
    "A viagem foi dura, mas o grupo se manteve unido.",
    "{foe} resistiu bastante antes de cair.",
    "Um desvio pela trilha antiga poupou o grupo de uma emboscada.",
    "Houve feridos leves, nada que uma noite de descanso não resolva.",
    "O acampamento foi atacado de madrugada, mas a vigília segurou.",
  ],
  fail: [
    "{foe} era mais forte do que os batedores disseram.",
    "Uma emboscada no caminho gastou as forças do grupo cedo demais.",
    "O esquadrão recuou em ordem e salvou parte da carga.",
    "Faltou gente (ou poder) para segurar a linha de frente.",
  ],
};
