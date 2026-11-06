import { z } from "zod";
import { action, rpc } from "@/lib/api";
import { HUNT_REFILL } from "@/lib/game/rules";

// Renova as caçadas do dia com gemas (+30, 1 vez por dia). Preço e limite definidos aqui no servidor.
export const POST = action("battle-refill", z.object({}).strict(), async ({ user, admin }) => {
  const refills = await rpc<number>(admin, "buy_hunt_refill", { p_user: user.id, p_limit: HUNT_REFILL.perDay, p_price: HUNT_REFILL.gems });
  return { ok: true, refills };
}, { max: 10, windowSec: 60 });
