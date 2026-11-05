// Temporada semanal: segunda 00:00 UTC → domingo 23:59 UTC.

export const WEEKLY_POINTS = { pvp_win: 10, boss_win: 8, quest: 4, pve_win: 2 };

export type WeeklyTier = { maxRank: number; label: string; gems: number; gold: number; cosmetic?: string };
export const WEEKLY_REWARDS: WeeklyTier[] = [
  { maxRank: 1, label: "1º lugar", gems: 100, gold: 2000, cosmetic: "title_campeao" },
  { maxRank: 3, label: "2º–3º", gems: 50, gold: 1000 },
  { maxRank: 10, label: "4º–10º", gems: 20, gold: 500 },
  { maxRank: 50, label: "11º–50º", gems: 5, gold: 250 },
];
/** Prêmio de participação: quem fez ao menos isso de pontos na semana. */
export const WEEKLY_PARTICIPATION = { minScore: 20, gems: 0, gold: 100 };

export function rewardFor(rank: number, score: number) {
  const tier = WEEKLY_REWARDS.find((t) => rank <= t.maxRank);
  if (tier) return tier;
  if (score >= WEEKLY_PARTICIPATION.minScore) return { maxRank: Infinity, label: "Participação", ...WEEKLY_PARTICIPATION };
  return null;
}

export function weekStart(d = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7; // segunda = 0
  x.setUTCDate(x.getUTCDate() - dow);
  return x.toISOString().slice(0, 10);
}

export function previousWeekStart(d = new Date()): string {
  const x = new Date(weekStart(d) + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() - 7);
  return x.toISOString().slice(0, 10);
}

export function secondsToWeekEnd(d = new Date()) {
  const end = new Date(weekStart(d) + "T00:00:00Z").getTime() + 7 * 86_400_000;
  return Math.floor((end - d.getTime()) / 1000);
}
