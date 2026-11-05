import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BOSS_BY_ID, bossForWeek, bossMaxHp } from "./guildBoss";
import { previousWeekStart, weekStart } from "./weekly";

export async function myGuild(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from("guild_members").select("guild_id, role, joined_at").eq("user_id", userId).maybeSingle();
  return data as { guild_id: string; role: string; joined_at: string } | null;
}

/** Estado do chefe da semana (ou da semana anterior, para resgates). */
export async function bossState(admin: SupabaseClient, guildId: string, userId: string, week = weekStart()) {
  const [{ data: b }, { data: hits }, { count: members }, { data: claim }] = await Promise.all([
    admin.from("guild_bosses").select("*").eq("guild_id", guildId).eq("week", week).maybeSingle(),
    admin.from("guild_boss_hits").select("user_id, damage, attacks").eq("guild_id", guildId).eq("week", week).order("damage", { ascending: false }),
    admin.from("guild_members").select("user_id", { count: "exact", head: true }).eq("guild_id", guildId),
    admin.from("reward_claims").select("claim_key").eq("user_id", userId).eq("claim_key", `gboss:${guildId}:${week}`).maybeSingle(),
  ]);
  const def = b ? BOSS_BY_ID[b.boss_id] : bossForWeek(week);
  const maxHp = b ? Number(b.max_hp) : bossMaxHp(members ?? 1);
  const ids = (hits ?? []).map((h) => h.user_id);
  const { data: names } = ids.length ? await admin.from("characters").select("user_id, name").in("user_id", ids) : { data: [] };
  const nameOf = new Map((names ?? []).map((n) => [n.user_id, n.name]));
  return {
    week, boss: def, hp: b ? Number(b.hp) : maxHp, maxHp, defeated: !!b?.defeated_at,
    ranking: (hits ?? []).map((h, i) => ({ pos: i + 1, name: nameOf.get(h.user_id) ?? "?", damage: Number(h.damage), attacks: h.attacks, me: h.user_id === userId })),
    myDamage: Number((hits ?? []).find((h) => h.user_id === userId)?.damage ?? 0),
    topUser: hits?.[0]?.user_id ?? null,
    claimed: !!claim,
  };
}

export async function guildWarBoard(admin: SupabaseClient, start: string) {
  const { data, error } = await admin.rpc("guild_weekly_scores", { p_start: start });
  if (error) throw error;
  const rows = ((data ?? []) as { guild_id: string; score: number }[]).filter((r) => Number(r.score) > 0);
  if (!rows.length) return [];
  const { data: gs } = await admin.from("guilds").select("id, name, tag, level, created_at").in("id", rows.map((r) => r.guild_id));
  const byId = new Map((gs ?? []).map((g) => [g.id, g]));
  return rows.filter((r) => byId.has(r.guild_id))
    .sort((a, b) => Number(b.score) - Number(a.score) || String(byId.get(a.guild_id)!.created_at).localeCompare(String(byId.get(b.guild_id)!.created_at)))
    .map((r, i) => ({ pos: i + 1, guildId: r.guild_id, score: Number(r.score), ...(({ name, tag, level }) => ({ name, tag, level }))(byId.get(r.guild_id)!) }));
}

export { previousWeekStart, weekStart };
