import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { heroCombatant, loadPlayer } from "@/lib/game/player";
import { raidDamage } from "@/lib/game/combat";
import { bossForWeek, bossMaxHp, GUILD_BOSS_RULES, BOSS_BY_ID } from "@/lib/game/guildBoss";
import { myGuild, weekStart } from "@/lib/game/guildServer";
import { elementOfArt } from "@/lib/game/elements";

export const POST = action("guild-boss", z.object({}).strict(), async ({ user, admin }) => {
  const g = await myGuild(admin, user.id);
  if (!g) throw new HttpError(409, "not_in_guild");
  const week = weekStart();
  const p = await loadPlayer(admin, user.id);
  if (!p) throw new HttpError(404, "no_character");

  const [{ data: existing }, { count }] = await Promise.all([
    admin.from("guild_bosses").select("boss_id").eq("guild_id", g.guild_id).eq("week", week).maybeSingle(),
    admin.from("guild_members").select("user_id", { count: "exact", head: true }).eq("guild_id", g.guild_id),
  ]);
  const boss = existing ? BOSS_BY_ID[existing.boss_id] : bossForWeek(week);

  // Dano calculado no servidor com os atributos e equipamentos reais.
  const pc = heroCombatant(p, p.maxHp, p.maxHp);
  const r = raidDamage(pc, boss.def, boss.agility, GUILD_BOSS_RULES.rounds, elementOfArt(boss.image));
  const res = await rpc<{ dealt: number; hp: number; defeated: boolean }>(admin, "guild_boss_attack", {
    p_user: user.id, p_week: week, p_boss_id: boss.id, p_max_hp: bossMaxHp(count ?? 1), p_damage: r.total,
    p_daily_limit: GUILD_BOSS_RULES.attacksPerDay, p_energy: GUILD_BOSS_RULES.energy,
  });
  return { ...res, hits: r.hits };
}, { max: 10, windowSec: 60 });
