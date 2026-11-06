import { z } from "zod";
import { action, rpc } from "@/lib/api";
import { QUEST_REFILL } from "@/lib/game/rules";

// Renova as missões do dia com gemas (+30, 1 vez por dia). Preço e limite definidos aqui no servidor.
export const POST = action("quest-refill", z.object({}).strict(), async ({ user, admin }) => {
  const refills = await rpc<number>(admin, "buy_quest_refill", { p_user: user.id, p_limit: QUEST_REFILL.perDay, p_price: QUEST_REFILL.gems });
  return { ok: true, refills };
}, { max: 10, windowSec: 60 });
