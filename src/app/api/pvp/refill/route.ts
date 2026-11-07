import { z } from "zod";
import { action, rpc } from "@/lib/api";
import { DUEL_REFILL } from "@/lib/game/rules";

// Renova os duelos do dia com gemas (+15, 1 vez por dia). Preço e limite definidos aqui no servidor.
export const POST = action("pvp-refill", z.object({}).strict(), async ({ user, admin }) => {
  const refills = await rpc<number>(admin, "buy_pvp_refill", { p_user: user.id, p_limit: DUEL_REFILL.perDay, p_price: DUEL_REFILL.gems });
  return { ok: true, refills };
}, { max: 10, windowSec: 60 });
