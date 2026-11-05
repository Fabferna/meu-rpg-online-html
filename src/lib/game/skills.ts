import type { RaceId } from "./data";

// ── Habilidades por classe (raça) ─────────────────────────────────────
// Cada raça tem 5 habilidades. O jogador aprende ao atingir o nível exigido,
// equipa até 3 na barra de combate e melhora cada uma até o nível 5 com ouro.

export type SkillType = "physical" | "magic" | "support";

export type Skill = {
  id: string;
  race: RaceId;
  name: string;
  description: string;
  icon: string;
  type: SkillType;
  /** Nível do herói para aprender. */
  unlock: number;
  /** Turnos de recarga. */
  cooldown: number;
  /** Multiplicador de dano no nível 1 (sobe +12% por nível). */
  mult?: number;
  /** Quantidade de golpes (cada um com `mult`). */
  hits?: number;
  /** Não pode ser esquivado. */
  sure?: boolean;
  /** Turnos de veneno no inimigo. */
  poison?: number;
  /** Turnos de atordoamento no inimigo. */
  stun?: number;
  /** Cura em % da vida máxima no nível 1 (sobe +2 p.p. por nível). */
  healPct?: number;
  /** Turnos com dano recebido reduzido pela metade. */
  stone?: number;
  /** Custo em % da vida máxima. */
  selfHpPct?: number;
  /** Fração do dano causado que vira cura. */
  lifesteal?: number;
};

export const SKILL_MAX_LEVEL = 5;
/** Barra de combate: espaços liberados por nível do herói. */
export const SKILL_SLOT_LEVELS = [1, 5, 10] as const;
/** Custo em ouro para ir do nível N para N+1 (índice = nível atual). */
export const SKILL_UPGRADE_COST = [0, 300, 800, 1800, 3500] as const;
/** Nível do herói exigido para levar a habilidade ao nível N+1. */
export const skillUpgradeLevel = (s: Skill, cur: number) => s.unlock + cur * 3;

const I = (f: string) => `/assets/${f}.webp`;

export const SKILLS: Skill[] = [
  // Humano: versátil, golpes precisos e apoio.
  { id: "h_adaptavel", race: "humano", name: "Ataque Adaptável", description: "Golpe certeiro que não pode ser esquivado.", icon: I("icone_ataque_adaptavel"), type: "physical", unlock: 1, cooldown: 3, mult: 1.8, sure: true },
  { id: "h_demolidor", race: "humano", name: "Golpe Demolidor", description: "Pancada pesada que atordoa o inimigo por 1 turno.", icon: I("golpe_demolidor_icone"), type: "physical", unlock: 3, cooldown: 5, mult: 1.6, stun: 1 },
  { id: "h_estandarte", race: "humano", name: "Estandarte Inspirador", description: "Recupera vida e reduz o dano recebido pela metade por 2 turnos.", icon: I("estandarte_inspirador"), type: "support", unlock: 6, cooldown: 5, healPct: 12, stone: 2 },
  { id: "h_comando", race: "humano", name: "Voz de Comando", description: "Intimida o inimigo, que fica atordoado por 2 turnos.", icon: I("icone_diplomacia_persuasiva"), type: "support", unlock: 10, cooldown: 7, stun: 2 },
  { id: "h_campeao", race: "humano", name: "Lâmina do Campeão", description: "Golpe devastador que drena 30% do dano como vida.", icon: I("espada_curta_funcional"), type: "physical", unlock: 15, cooldown: 6, mult: 2.8, lifesteal: 0.3 },

  // Elfo: veneno, precisão e magia da floresta.
  { id: "e_flecha", race: "elfo", name: "Flecha Enfeitiçada", description: "Dano e envenena o inimigo por 3 turnos.", icon: I("flecha_enfeiticada_icone"), type: "physical", unlock: 1, cooldown: 4, mult: 1.1, poison: 3 },
  { id: "e_passo", race: "elfo", name: "Passo Silencioso", description: "Ataque furtivo que não pode ser esquivado.", icon: I("passo_silencioso_icone"), type: "physical", unlock: 3, cooldown: 3, mult: 1.7, sure: true },
  { id: "e_comunhao", race: "elfo", name: "Comunhão com Sylvandell", description: "A floresta cura uma boa parte da sua vida.", icon: I("comunhao_com_sylvandell"), type: "support", unlock: 6, cooldown: 5, healPct: 18 },
  { id: "e_chuva", race: "elfo", name: "Chuva de Flechas", description: "Dispara 3 flechas seguidas.", icon: I("arco_elfico_elegante"), type: "physical", unlock: 10, cooldown: 5, mult: 0.75, hits: 3 },
  { id: "e_vinculo", race: "elfo", name: "Vínculo Primevo", description: "Magia ancestral com dano alto e veneno por 3 turnos.", icon: I("vinculo_primevo_espiritual"), type: "magic", unlock: 15, cooldown: 6, mult: 1.5, poison: 3 },

  // Anão: resistência, cura e golpes pesados.
  { id: "a_pele", race: "anao", name: "Pele de Pedra", description: "Recupera vida e reduz o dano recebido pela metade por 3 turnos.", icon: I("icone_pele_de_pedra"), type: "support", unlock: 1, cooldown: 5, healPct: 10, stone: 3 },
  { id: "a_martelo", race: "anao", name: "Martelo Rúnico", description: "Golpe forjado em runas que atordoa por 1 turno.", icon: I("icone_forja_ancestral"), type: "physical", unlock: 3, cooldown: 5, mult: 1.7, stun: 1 },
  { id: "a_rugido", race: "anao", name: "Rugido da Montanha", description: "Grito de guerra que causa dano e atordoa por 1 turno.", icon: I("icone_rugido_intimidador"), type: "physical", unlock: 6, cooldown: 6, mult: 1.2, stun: 1 },
  { id: "a_sangue", race: "anao", name: "Sangue de Ferro", description: "Cura grande de uma só vez.", icon: I("peitoral_de_placas_anao"), type: "support", unlock: 10, cooldown: 6, healPct: 25 },
  { id: "a_sismico", race: "anao", name: "Golpe Sísmico", description: "O chão treme: dano muito alto.", icon: I("golpe_demolidor_icone"), type: "physical", unlock: 15, cooldown: 6, mult: 3.0 },

  // Gronar: fúria e dano bruto, pagando com a própria vida.
  { id: "g_furia", race: "gronar", name: "Fúria Selvagem", description: "Dano enorme, mas custa 6% da sua vida.", icon: I("furia_selvagem_icone"), type: "physical", unlock: 1, cooldown: 4, mult: 2.6, selfHpPct: 6 },
  { id: "g_rugido", race: "gronar", name: "Rugido Intimidador", description: "Atordoa o inimigo por 2 turnos.", icon: I("icone_rugido_intimidador"), type: "support", unlock: 3, cooldown: 7, stun: 2 },
  { id: "g_demolidor", race: "gronar", name: "Golpe Demolidor", description: "Pancada que atordoa por 1 turno.", icon: I("golpe_demolidor_icone"), type: "physical", unlock: 6, cooldown: 5, mult: 1.9, stun: 1 },
  { id: "g_vinculo", race: "gronar", name: "Instinto Primevo", description: "Ataque que drena 50% do dano como vida.", icon: I("vinculo_primevo_espiritual"), type: "physical", unlock: 10, cooldown: 4, mult: 1.6, lifesteal: 0.5 },
  { id: "g_massacre", race: "gronar", name: "Massacre", description: "3 golpes brutais seguidos; custa 10% da sua vida.", icon: I("furia_selvagem_icone"), type: "physical", unlock: 15, cooldown: 6, mult: 1.1, hits: 3, selfHpPct: 10 },

  // Aetheliano: magia arcana pura.
  { id: "t_centelha", race: "aetheliano", name: "Centelha Arcana", description: "Dano mágico que atordoa por 1 turno.", icon: I("centelha_arcana_explosiva"), type: "magic", unlock: 1, cooldown: 5, mult: 0.9, stun: 1 },
  { id: "t_canalizar", race: "aetheliano", name: "Canalização de Magia", description: "Dano mágico alto.", icon: I("canalizacao_de_magia"), type: "magic", unlock: 3, cooldown: 3, mult: 1.2 },
  { id: "t_eterea", race: "aetheliano", name: "Manifestação Etérea", description: "Recupera vida e reduz o dano recebido pela metade por 2 turnos.", icon: I("manifestacao_eterea_icone"), type: "support", unlock: 6, cooldown: 5, healPct: 15, stone: 2 },
  { id: "t_maldicao", race: "aetheliano", name: "Maldição Arcana", description: "Dano mágico e veneno por 3 turnos.", icon: I("cajado_magico_luminoso"), type: "magic", unlock: 10, cooldown: 5, mult: 0.8, poison: 3 },
  { id: "t_primordial", race: "aetheliano", name: "Explosão Primordial", description: "A magia mais poderosa: dano mágico devastador.", icon: I("amuleto_da_serpente_sinistra"), type: "magic", unlock: 15, cooldown: 6, mult: 1.9 },
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s])) as Record<string, Skill>;
export const skillsOf = (race: RaceId) => SKILLS.filter((s) => s.race === race);

/** Estado salvo no personagem: níveis aprendidos e barra equipada. */
export type SkillLoadout = { lv: Record<string, number>; eq: string[] };

/** Garante um estado válido (heróis antigos começam com a 1ª habilidade da raça). */
export function normalizeLoadout(race: RaceId, raw: unknown, level: number): SkillLoadout {
  const r = (raw ?? {}) as Partial<SkillLoadout>;
  const own = skillsOf(race);
  const lv: Record<string, number> = {};
  for (const s of own) {
    const v = Number(r.lv?.[s.id] ?? 0);
    if (v > 0) lv[s.id] = Math.min(SKILL_MAX_LEVEL, v);
  }
  if (!lv[own[0].id]) lv[own[0].id] = 1;
  const slots = slotsFor(level);
  let eq = (Array.isArray(r.eq) ? r.eq : []).filter((id) => lv[id] && SKILL_BY_ID[id]?.race === race);
  eq = [...new Set(eq)].slice(0, slots);
  if (!eq.length) eq = [own[0].id];
  return { lv, eq };
}

export const slotsFor = (level: number) => SKILL_SLOT_LEVELS.filter((l) => level >= l).length;

/** Números da habilidade num nível (para combate e para a tela). */
export function skillPower(s: Skill, level: number) {
  const k = Math.max(1, level) - 1;
  return {
    mult: s.mult ? +(s.mult * (1 + 0.12 * k)).toFixed(2) : 0,
    healPct: s.healPct ? s.healPct + 2 * k : 0,
    // No nível máximo a recarga cai 1 turno.
    cooldown: level >= SKILL_MAX_LEVEL ? Math.max(1, s.cooldown - 1) : s.cooldown,
  };
}
