import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { WORLD_BOSS_BY_ID, worldBossForDay, worldBossMaxHp, worldBossSchedule } from "./worldBoss";

/** Níveis dos jogadores ativos nos últimos 2 dias (define a vida do chefe do dia). */
export async function activeLevels(admin: SupabaseClient) {
  const since = new Date(Date.now() - 2 * 86_400_000).toISOString();
  const { data } = await admin.from("characters").select("level").gte("updated_at", since).limit(5000);
  return (data ?? []).map((r) => Number(r.level));
}

/** Estado do Chefe do Mundo do último evento (aberto agora ou o mais recente, para resgate). */
export async function worldBossState(admin: SupabaseClient, userId: string, now = new Date()) {
  const sch = worldBossSchedule(now);
  const [{ data: b }, { data: hits }, { data: claim }, { data: used }] = await Promise.all([
    admin.from("world_bosses").select("*").eq("day", sch.day).maybeSingle(),
    admin.from("world_boss_hits").select("user_id, damage, attacks").eq("day", sch.day).order("damage", { ascending: false }).limit(200),
    admin.from("reward_claims").select("claim_key").eq("user_id", userId).eq("claim_key", `wboss:${sch.day}`).maybeSingle(),
    admin.from("world_boss_hits").select("attacks, damage").eq("day", sch.day).eq("user_id", userId).maybeSingle(),
  ]);
  const boss = b ? WORLD_BOSS_BY_ID[b.boss_id] ?? worldBossForDay(sch.day) : worldBossForDay(sch.day);
  const maxHp = b ? Number(b.max_hp) : worldBossMaxHp(await activeLevels(admin));
  const list = hits ?? [];
  const top = list.slice(0, 10);
  const { data: names } = top.length ? await admin.from("characters").select("user_id, name").in("user_id", top.map((h) => h.user_id)) : { data: [] };
  const nameOf = new Map((names ?? []).map((n) => [n.user_id, n.name]));
  const myPos = list.findIndex((h) => h.user_id === userId) + 1;
  return {
    ...sch, boss, maxHp,
    hp: b ? Number(b.hp) : maxHp,
    defeated: !!b?.defeated_at,
    participants: list.length,
    ranking: top.map((h, i) => ({ pos: i + 1, name: nameOf.get(h.user_id) ?? "?", damage: Number(h.damage), me: h.user_id === userId })),
    myDamage: Number(used?.damage ?? 0),
    myAttacks: Number(used?.attacks ?? 0),
    myPos,
    claimed: !!claim,
  };
}
