import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { GUILD_BOSS_REWARD } from "@/lib/game/guildBoss";
import { bossState, myGuild, previousWeekStart, weekStart } from "@/lib/game/guildServer";

// Recompensa para quem causou dano a um chefe derrotado (semana atual ou anterior).
export const POST = action("guild-boss-claim", z.object({ week: z.enum(["current", "previous"]) }).strict(), async ({ user, body, admin }) => {
  const g = await myGuild(admin, user.id);
  if (!g) throw new HttpError(409, "not_in_guild");
  const week = body.week === "current" ? weekStart() : previousWeekStart();
  const s = await bossState(admin, g.guild_id, user.id, week);
  if (!s.defeated || s.myDamage <= 0) throw new HttpError(409, "goal_incomplete");
  const gems = GUILD_BOSS_REWARD.gems + (s.topUser === user.id ? GUILD_BOSS_REWARD.topGems : 0);
  await rpc(admin, "claim_reward", { p_user: user.id, p_key: `gboss:${g.guild_id}:${week}`, p_gold: GUILD_BOSS_REWARD.gold, p_gems: gems, p_xp: 0, p_cosmetic: null });
  return { ok: true, gems, gold: GUILD_BOSS_REWARD.gold };
});
