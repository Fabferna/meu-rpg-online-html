import type { TalentMods } from "./talents";

export const GUILD = {
  createCost: 1000, maxLevel: 20, minDonation: 10, xpPerLevelPct: 1,
  /** Pedidos pendentes para guildas privadas por jogador. */
  maxRequests: 5,
  /** Quantos cabem em cada cargo de comando. */
  maxVice: 2, maxSquadLeaders: 5,
  /** Um Membro precisa deste tempo de guilda para retirar itens do cofre. */
  vaultMinHours: 24,
  /** Taxa mínima de retirada (por unidade). */
  vaultMinFee: 10,
};

/** XP para o próximo nível (espelho de f_guild_xp_next): igual a antes até o 10, depois fica mais caro. */
export const guildXpNext = (level: number) => (level < 10 ? 1000 * level : 5000 * (level - 8));

// ── Cargos ───────────────────────────────────────────────────────────
// No banco: leader = Capitão, officer = Vice-Capitão, squad_leader = Líder de Esquadrão, member = Membro.
export const ROLE_LABEL = { leader: "Capitão", officer: "Vice-Capitão", squad_leader: "Líder de Esquadrão", member: "Membro" } as const;
export type GuildRole = keyof typeof ROLE_LABEL;
export const ROLE_ICON: Record<GuildRole, string> = { leader: "👑", officer: "⚜️", squad_leader: "🛡️", member: "🗡️" };
export const ROLE_RANK: Record<GuildRole, number> = { leader: 3, officer: 2, squad_leader: 1, member: 0 };
export const ROLES: GuildRole[] = ["leader", "officer", "squad_leader", "member"];
export const isGuildRole = (r: unknown): r is GuildRole => typeof r === "string" && r in ROLE_RANK;

/** O que cada cargo pode fazer (espelho das funções SQL da migração 0043). */
export function guildPerms(role: GuildRole) {
  const rank = ROLE_RANK[role];
  return {
    /** Aceitar/recusar pedidos de entrada. */
    requests: rank >= 1,
    /** Expulsar quem está abaixo e definir cargos abaixo do seu. */
    manage: rank >= 2,
    /** Editar descrição e aberta/privada. */
    settings: rank >= 2,
    /** Passar o comando da guilda. */
    transfer: rank >= 3,
  };
}
/** Cargos que `actor` pode dar a alguém que hoje é `target`. */
export function assignableRoles(actor: GuildRole, target: GuildRole): GuildRole[] {
  const a = ROLE_RANK[actor];
  if (a < 2 || a <= ROLE_RANK[target]) return [];
  return ROLES.filter((r) => r !== "leader" && r !== target && ROLE_RANK[r] < a);
}
export const canKick = (actor: GuildRole, target: GuildRole) => ROLE_RANK[actor] >= 2 && ROLE_RANK[actor] > ROLE_RANK[target];

// ── Benefícios por nível ─────────────────────────────────────────────
export type GuildPerks = { xpPct: number; atkPct: number; defPct: number; memberLimit: number; vaultSlots: number };
/**
 * Todo nível dá +1% de XP, +2 vagas e +4 espaços no cofre.
 * Níveis ímpares aumentam o ataque (físico e mágico) e níveis pares a defesa: +10% de cada no nível 20.
 */
export function guildPerks(level: number): GuildPerks {
  const l = Math.max(1, Math.min(GUILD.maxLevel, Math.floor(level)));
  return {
    xpPct: l * GUILD.xpPerLevelPct,
    atkPct: Math.ceil(l / 2),
    defPct: Math.floor(l / 2),
    memberLimit: 20 + 2 * (l - 1),   // espelho de f_guild_member_limit
    vaultSlots: 10 + 4 * (l - 1),    // espelho de f_guild_vault_slots
  };
}

/** Soma o bônus de combate da guilda aos bônus de talento (mesma conta no servidor e na tela). */
export function withGuildBuff(m: TalentMods, guildLevel: number | null | undefined): TalentMods {
  if (!guildLevel) return m;
  const p = guildPerks(guildLevel);
  return { ...m, atkPct: m.atkPct + p.atkPct / 100, magicPct: m.magicPct + p.atkPct / 100, defPct: m.defPct + p.defPct / 100 };
}

// ── Cofre ────────────────────────────────────────────────────────────
/** Desconto na taxa de retirada por cargo. */
export const VAULT_FEE_MULT: Record<GuildRole, number> = { leader: 0.5, officer: 0.5, squad_leader: 0.75, member: 1 };
/**
 * Taxa de retirada: o valor de venda do item no Ferreiro (por unidade), com desconto por cargo.
 * `sell` já deve vir com o aprimoramento aplicado (sellPrice).
 */
export function vaultFee(sell: number, qty: number, role: GuildRole) {
  return Math.max(GUILD.vaultMinFee, Math.round(sell * VAULT_FEE_MULT[role])) * qty;
}
