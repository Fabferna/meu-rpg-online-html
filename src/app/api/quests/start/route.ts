import { z } from "zod";
import { xpRate } from "@/lib/game/rules";
import { action, HttpError, rpc } from "@/lib/api";
import { QUEST_BY_ID } from "@/lib/game/quests";
import { chance, roll } from "@/lib/game/rng";
import { DAILY_QUESTS } from "@/lib/game/rules";
import { dailyCounts } from "@/lib/game/dailyLimits";
import { REGION_OF_QUEST, regionUnlocked } from "@/lib/game/regions";

export const POST = action("quest-start", z.object({ questId: z.string().max(64) }).strict(), async ({ user, body, admin }) => {
  const quest = QUEST_BY_ID[body.questId];
  if (!quest) throw new HttpError(404, "unknown_quest");

  const { data: c } = await admin.from("characters").select("level, story_chapter").eq("user_id", user.id).single();
  if (!c || c.level < quest.minLevel) throw new HttpError(403, "level_too_low");
  if (!regionUnlocked(REGION_OF_QUEST[quest.id], c.story_chapter)) throw new HttpError(403, "region_locked");

  if ((await dailyCounts(admin, user.id)).quests >= DAILY_QUESTS) throw new HttpError(429, "daily_quests");

  // Recompensa sorteada AGORA, no servidor, e gravada junto com a missão.
  const rewards = {
    xp: xpRate(roll(...quest.xp)),
    gold: roll(...quest.gold),
    item: quest.drop && chance(quest.drop.chance) ? quest.drop.item : null,
  };
  await rpc(admin, "start_quest", {
    p_user: user.id, p_quest: quest.id, p_energy: quest.energy, p_duration_sec: quest.durationSec, p_rewards: rewards,
  });
  return { ok: true };
});
