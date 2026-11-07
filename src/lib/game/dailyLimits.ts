import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { duelLimit, huntLimit, questLimit } from "./rules";
import { RARE_RULES, blessedUntil, blessingChance, isBlessed } from "./encounters";
import { RARE_ENEMIES } from "./enemies";

const startOfUtcDay = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d.toISOString(); };

/** Caçadas comuns (sem história/masmorra), missões e duelos da Arena iniciados hoje (UTC). */
export async function dailyCounts(db: SupabaseClient, userId: string) {
  const since = startOfUtcDay();
  const [h, q, r, rq, d, rd, rf, rp, bl, bp, br] = await Promise.all([
    db.from("battles").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("kind", "pve")
      .gte("created_at", since).is("state->story", null).is("state->dungeon", null).is("state->storyTrail", null).is("state->rare", null),
    db.from("quest_runs").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("started_at", since),
    db.from("user_counters").select("value").eq("user_id", userId).eq("key", "hunt_refill").eq("day", since.slice(0, 10)).maybeSingle(),
    db.from("user_counters").select("value").eq("user_id", userId).eq("key", "quest_refill").eq("day", since.slice(0, 10)).maybeSingle(),
    db.from("battles").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("kind", "pvp").gte("created_at", since),
    db.from("user_counters").select("value").eq("user_id", userId).eq("key", "pvp_refill").eq("day", since.slice(0, 10)).maybeSingle(),
    db.from("user_counters").select("value").eq("user_id", userId).eq("key", "rare_fight").eq("day", since.slice(0, 10)).maybeSingle(),
    db.from("user_counters").select("value").eq("user_id", userId).eq("key", "rare_pending").eq("day", since.slice(0, 10)).maybeSingle(),
    db.from("user_counters").select("value").eq("user_id", userId).eq("key", "blessing_until").eq("day", "2000-01-01").maybeSingle(),
    db.from("user_counters").select("value").eq("user_id", userId).eq("key", "bless_points").eq("day", "2000-01-01").maybeSingle(),
    db.from("user_counters").select("value").eq("user_id", userId).eq("key", "bless_roll").eq("day", since.slice(0, 10)).maybeSingle(),
  ]);
  const v = (x: { data: unknown }) => Number((x.data as { value?: number } | null)?.value ?? 0);
  const pendingIdx = v(rp) - 1;
  const duelRefills = Number((rd.data as { value?: number } | null)?.value ?? 0);
  const questRefills = Number((rq.data as { value?: number } | null)?.value ?? 0);
  const huntRefills = Number((r.data as { value?: number } | null)?.value ?? 0);
  return { hunts: h.count ?? 0, quests: q.count ?? 0, huntRefills, huntLimit: huntLimit(huntRefills), questRefills, questLimit: questLimit(questRefills),
    duels: d.count ?? 0, duelRefills, duelLimit: duelLimit(duelRefills),
    rareFights: v(rf), rareLimit: RARE_RULES.perDay, rarePending: pendingIdx >= 0 ? RARE_ENEMIES[pendingIdx]?.id ?? null : null,
    blessedUntil: isBlessed(v(bl)) ? blessedUntil(v(bl))!.toISOString() : null, blessChance: blessingChance(v(bp)), blessRolled: v(br) > 0 };
}
