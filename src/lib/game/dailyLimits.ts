import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const startOfUtcDay = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d.toISOString(); };

/** Caçadas comuns (sem história/masmorra) e missões iniciadas hoje (UTC). */
export async function dailyCounts(db: SupabaseClient, userId: string) {
  const since = startOfUtcDay();
  const [h, q] = await Promise.all([
    db.from("battles").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("kind", "pve")
      .gte("created_at", since).is("state->story", null).is("state->dungeon", null),
    db.from("quest_runs").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("started_at", since),
  ]);
  return { hunts: h.count ?? 0, quests: q.count ?? 0 };
}
