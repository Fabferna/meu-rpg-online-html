export const GUILD = { createCost: 1000, maxLevel: 10, minDonation: 10, xpPerLevelPct: 1, /** Pedidos pendentes para guildas privadas por jogador. */ maxRequests: 5 };
export const guildXpNext = (level: number) => 1000 * level; // espelho de f_guild_xp_next
export const ROLE_LABEL = { leader: "Líder", officer: "Oficial", member: "Membro" } as const;
export type GuildRole = keyof typeof ROLE_LABEL;
