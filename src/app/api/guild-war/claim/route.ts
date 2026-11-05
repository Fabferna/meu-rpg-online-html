import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { GUILD_WAR_REWARDS } from "@/lib/game/guildBoss";
import { guildWarBoard, myGuild, previousWeekStart } from "@/lib/game/guildServer";

export const POST = action("guild-war-claim", z.object({}).strict(), async ({ user, admin }) => {
  const g = await myGuild(admin, user.id);
  if (!g) throw new HttpError(409, "not_in_guild");
  const prev = previousWeekStart();
  const weekEnd = new Date(prev + "T00:00:00Z").getTime() + 7 * 86_400_000;
  if (new Date(g.joined_at).getTime() >= weekEnd) throw new HttpError(409, "goal_incomplete");
  const pos = (await guildWarBoard(admin, prev)).find((r) => r.guildId === g.guild_id)?.pos;
  const reward = GUILD_WAR_REWARDS.find((r) => r.rank === pos);
  if (!reward) throw new HttpError(409, "goal_incomplete");
  await rpc(admin, "claim_reward", { p_user: user.id, p_key: `gwar:${prev}`, p_gold: reward.gold, p_gems: reward.gems, p_xp: 0, p_cosmetic: null });
  return { ok: true, pos, ...reward };
});
