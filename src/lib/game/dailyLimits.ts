import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { duelLimit, huntLimit, questLimit } from "./rules";

const startOfUtcDay = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d.toISOString(); };

/** Caçadas comuns (sem história/masmorra), missões e duelos da Arena iniciados hoje (UTC). */
export async function dailyCounts(db: SupabaseClient, userId: string) {
  const since = startOfUtcDay();
  const [h, q, r, rq, d, rd] = await Promise.all([
    db.from("battles").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("kind", "pve")
      .gte("created_at", since).is("state->story", null).is("state->dungeon", null),
    db.from("quest_runs").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("started_at", since),
    db.from("user_counters").select("value").eq("user_id", userId).eq("key", "hunt_refill").eq("day", since.slice(0, 10)).maybeSingle(),
    db.from("user_counters").select("value").eq("user_id", userId).eq("key", "quest_refill").eq("day", since.slice(0, 10)).maybeSingle(),
    db.from("battles").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("kind", "pvp").gte("created_at", since),
    db.from("user_counters").select("value").eq("user_id", userId).eq("key", "pvp_refill").eq("day", since.slice(0, 10)).maybeSingle(),
  ]);
  const duelRefills = Number((rd.data as { value?: number } | null)?.value ?? 0);
  const questRefills = Number((rq.data as { value?: number } | null)?.value ?? 0);
  const huntRefills = Number((r.data as { value?: number } | null)?.value ?? 0);
  return { hunts: h.count ?? 0, quests: q.count ?? 0, huntRefills, huntLimit: huntLimit(huntRefills), questRefills, questLimit: questLimit(questRefills),
    duels: d.count ?? 0, duelRefills, duelLimit: duelLimit(duelRefills) };
}
