// Chefe do Mundo: todos os dias às 21h (horário de Brasília), por 1 hora, todos os jogadores atacam
// o MESMO chefe (vida compartilhada). Quem causou dano recebe recompensa ao fim e tem uma chance
// pequena de ganhar um item exclusivo da sua raça (só cai aqui).
// Regras puras (sem I/O): o servidor decide horário, dano, vida e sorteio; a tela só mostra.
import type { RaceId } from "./data";

export const WORLD_BOSSES = [
  { id: "behemoth", name: "Behemoth Rubro", image: "/assets/raids/world_behemoth-v2.webp", def: 30, agility: 10, element: "fogo",
    lore: "Uma fera colossal de carapaça rachada por lava. Cada passo seu abre fendas de fogo pelo reino." },
  { id: "leviata", name: "Leviatã das Marés Negras", image: "/assets/raids/world_leviata-v2.webp", def: 26, agility: 16, element: "agua",
    lore: "A serpente que dormia sob o Mar Âmbar acordou faminta. Suas ondas engolem vilas inteiras." },
  { id: "eclipse", name: "Arauto do Eclipse", image: "/assets/raids/world_eclipse-v2.webp", def: 34, agility: 14, element: "sombra",
    lore: "Quando o sol escurece às 21h, ele desce das estrelas para apagar a última luz de Aethelgard." },
] as const;
export type WorldBossDef = (typeof WORLD_BOSSES)[number];
export const WORLD_BOSS_BY_ID: Record<string, WorldBossDef> = Object.fromEntries(WORLD_BOSSES.map((b) => [b.id, b]));

export const WORLD_BOSS_RULES = {
  /** Hora de início no horário de Brasília (UTC−3) e duração em minutos. */
  startHourBrt: 21, durationMin: 60,
  attacksPerEvent: 5, energy: 5, rounds: 6,
  /**
   * Vida = 8 × dano esperado de 1 ataque de cada jogador ativo (≈ todos atacando as 5 vezes, com folga
   * para quem tem bom equipamento), mínimo 40.000. Chefe de grupo: ninguém derruba sozinho.
   */
  hpFactor: 8, minHp: 40000,
  /** Um ataque tira no máximo esta fração da vida máxima (5 ataques = no máximo 25%: precisa de 4+ jogadores). */
  maxHitPct: 0.05,
} as const;

/** Dano esperado de 1 ataque de um herói típico do nível (medido com raidDamage). */
export const expectedHit = (level: number) => 25 + 21 * level;
/** Dano de um ataque depois do teto (nenhum ataque tira mais que maxHitPct da vida máxima). */
export const capHit = (damage: number, maxHp: number) => Math.min(damage, Math.ceil(maxHp * WORLD_BOSS_RULES.maxHitPct));
export const worldBossMaxHp = (levels: number[]) =>
  Math.max(WORLD_BOSS_RULES.minHp, Math.round(WORLD_BOSS_RULES.hpFactor * levels.reduce((s, l) => s + expectedHit(l), 0)));

// ── Horário ─────────────────────────────────────────────────────────
const BRT_OFFSET_MS = 3 * 3_600_000;
const brt = (now: Date) => new Date(now.getTime() - BRT_OFFSET_MS);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Início (UTC) do evento do dia `day` (data no horário de Brasília). */
export const eventStart = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) + (WORLD_BOSS_RULES.startHourBrt * 3_600_000) + BRT_OFFSET_MS);
export const eventEnd = (day: string) => new Date(eventStart(day).getTime() + WORLD_BOSS_RULES.durationMin * 60_000);

/**
 * Evento atual ou o último que já começou (dia em Brasília), se está aberto agora e quando começa o próximo.
 * Entre 00h e 21h o "último" é o de ontem (ainda dá para resgatar a recompensa até o próximo começar).
 */
export function worldBossSchedule(now = new Date()) {
  const b = brt(now);
  const today = ymd(b);
  const last = b.getUTCHours() >= WORLD_BOSS_RULES.startHourBrt ? today : ymd(new Date(b.getTime() - 86_400_000));
  const open = now >= eventStart(last) && now < eventEnd(last);
  const nextDay = last === today ? ymd(new Date(b.getTime() + 86_400_000)) : today;
  return { day: last, open, startsAt: eventStart(last).toISOString(), endsAt: eventEnd(last).toISOString(), nextStartsAt: eventStart(nextDay).toISOString() };
}

/** Chefe do dia (rotação pela data). */
export function worldBossForDay(day: string): WorldBossDef {
  const n = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  return WORLD_BOSSES[((n % WORLD_BOSSES.length) + WORLD_BOSSES.length) % WORLD_BOSSES.length];
}

// ── Recompensas ─────────────────────────────────────────────────────
/** Itens que só caem do Chefe do Mundo: arma e acessório de cada raça. */
export const WORLD_BOSS_ITEMS: Record<RaceId, [string, string]> = {
  humano: ["lamina_eclipse_solar", "selo_rei_dourado"],
  elfo: ["arco_cometa_errante", "lagrima_lua_prateada"],
  anao: ["martelo_nucleo_ardente", "runa_coracao_ferro"],
  gronar: ["machado_devorador_mundos", "presa_leviata"],
  aetheliano: ["cajado_abismo_estelar", "olho_firmamento"],
};
export const ALL_WORLD_BOSS_ITEMS = Object.values(WORLD_BOSS_ITEMS).flat();

/** Chance do item exclusivo pela posição no ranking de dano (1 = maior dano). */
export function itemChance(pos: number) {
  if (pos === 1) return 0.15;
  if (pos <= 3) return 0.1;
  if (pos <= 10) return 0.07;
  return 0.04;
}
/** Gemas extras pela posição. */
export const rankGems = (pos: number) => (pos === 1 ? 15 : pos <= 3 ? 10 : pos <= 10 ? 5 : 0);

export function worldBossReward(defeated: boolean, level: number, pos: number) {
  if (!defeated) return { gold: 50 + 5 * level, gems: 0, itemChance: 0 };
  return { gold: 200 + 15 * level, gems: 5 + rankGems(pos), itemChance: itemChance(pos) };
}
