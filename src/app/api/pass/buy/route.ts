import { z } from "zod";
import { action, rpc } from "@/lib/api";
import { PASS_PRICE_GEMS, seasonOf } from "@/lib/game/seasonPass";

export const POST = action("pass-buy", z.object({}).strict(), async ({ user, admin }) => {
  await rpc(admin, "buy_season_pass", { p_user: user.id, p_season: seasonOf().id, p_price: PASS_PRICE_GEMS });
  return { ok: true };
});
