import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { previousWeekStart, rewardFor } from "@/lib/game/weekly";
import { weeklyBoard } from "@/lib/game/weeklyServer";

// Resgata o prêmio da semana ANTERIOR (já encerrada). A posição é recalculada aqui.
export const POST = action("weekly-claim", z.object({}).strict(), async ({ user, admin }) => {
  const prev = previousWeekStart();
  const me = (await weeklyBoard(admin, prev)).find((r) => r.userId === user.id);
  const reward = me && rewardFor(me.pos, me.score);
  if (!me || !reward) throw new HttpError(409, "goal_incomplete");
  await rpc(admin, "claim_reward", {
    p_user: user.id, p_key: `week:${prev}`, p_gold: reward.gold, p_gems: reward.gems, p_xp: 0, p_cosmetic: reward.cosmetic ?? null,
  });
  return { ok: true, pos: me.pos, ...reward };
}, { max: 5, windowSec: 60 });
