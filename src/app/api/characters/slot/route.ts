import { z } from "zod";
import { action, rpc } from "@/lib/api";
import { CHAR_SLOT_PRICE, MAX_CHAR_SLOTS } from "@/lib/game/rules";

export const POST = action("char-slot", z.object({}).strict(), async ({ user, admin }) => {
  const slots = await rpc<number>(admin, "buy_char_slot", { p_user: user.id, p_price: CHAR_SLOT_PRICE, p_max: MAX_CHAR_SLOTS });
  return { ok: true, slots };
}, { max: 5, windowSec: 60 });
