import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ACHIEVEMENTS, DAILY_BONUS, DAILY_GOALS, type Stat } from "./goals";
import { collectorKey, collectorOrders } from "./collector";

const today = () => new Date().toISOString().slice(0, 10);

/** Progresso das diárias e conquistas. Funciona com o cliente RLS ou admin. */
export async function loadGoals(db: SupabaseClient, userId: string) {
  const day = today();
  const [counters, claims, ch] = await Promise.all([
    db.from("user_counters").select("key, value").eq("user_id", userId).eq("day", day).like("key", "ev:%"),
    db.from("reward_claims").select("claim_key").eq("user_id", userId),
    db.from("characters").select("level, pve_wins, pvp_wins, quests_done, bosses_slain").eq("user_id", userId).single(),
  ]);
  const ev = (e: string) => counters.data?.find((c) => c.key === `ev:${e}`)?.value ?? 0;
  const claimed = new Set((claims.data ?? []).map((c) => c.claim_key));
  const stats = (ch.data ?? { level: 1, pve_wins: 0, pvp_wins: 0, quests_done: 0, bosses_slain: 0 }) as Record<Stat, number>;

  const daily = DAILY_GOALS.map((g) => ({
    ...g, progress: Math.min(g.target, ev(g.event)), claimed: claimed.has(`daily:${day}:${g.id}`),
  }));
  return {
    day,
    daily,
    bonus: { ...DAILY_BONUS, ready: daily.every((d) => d.claimed), claimed: claimed.has(`daily:${day}:bonus`) },
    collector: collectorOrders(day, stats.level ?? 1).map((o) => ({ ...o, claimed: claimed.has(collectorKey(day, o.idx)) })),
    achievements: ACHIEVEMENTS.map((a) => ({ ...a, progress: Math.min(a.target, stats[a.stat] ?? 0), claimed: claimed.has(`ach:${a.id}`) })),
  };
}
