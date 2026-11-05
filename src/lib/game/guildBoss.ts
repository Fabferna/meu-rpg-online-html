// Chefe de guilda: um por semana (rotação), vida compartilhada pelos membros.
export const GUILD_BOSSES = [
  { id: "dragao", name: "Dragão Ancestral", image: "/assets/raids/dragao.webp", def: 30, agility: 12, lore: "Desperto sob as ruínas de Valerion, cospe fogo que derrete muralhas." },
  { id: "tita_gelo", name: "Titã de Gelo", image: "/assets/raids/tita_gelo.webp", def: 40, agility: 6, lore: "O guardião das Agulhas Congeladas marcha sobre as vilas do vale." },
  { id: "kraken", name: "Kraken Abissal", image: "/assets/raids/kraken.webp", def: 24, agility: 18, lore: "Das profundezas de Meria, afunda tudo que navega no Mar Âmbar." },
] as const;

export const GUILD_BOSS_RULES = { energy: 10, attacksPerDay: 3, rounds: 6, baseHp: 2500, hpPerMember: 1100 };
export const GUILD_BOSS_REWARD = { gems: 10, gold: 400, topGems: 10 };

/** Chefe da semana (rotação pela data de início da semana). */
export function bossForWeek(weekStart: string) {
  const n = Math.floor(new Date(weekStart + "T00:00:00Z").getTime() / (7 * 86_400_000));
  return GUILD_BOSSES[((n % GUILD_BOSSES.length) + GUILD_BOSSES.length) % GUILD_BOSSES.length];
}
export const bossMaxHp = (members: number) => GUILD_BOSS_RULES.baseHp + GUILD_BOSS_RULES.hpPerMember * Math.max(1, members);
export const BOSS_BY_ID = Object.fromEntries(GUILD_BOSSES.map((b) => [b.id, b]));

export const GUILD_WAR_REWARDS = [
  { rank: 1, gems: 30, gold: 1000 },
  { rank: 2, gems: 20, gold: 600 },
  { rank: 3, gems: 10, gold: 300 },
];
