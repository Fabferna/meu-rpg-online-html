import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { ITEM_BY_ID } from "@/lib/game/items";
import { assertBagSpace } from "@/lib/game/bag";

export const POST = action("smith-buy", z.object({ itemId: z.string().max(64) }).strict(), async ({ user, body, admin }) => {
  const item = ITEM_BY_ID[body.itemId];
  if (!item?.buy) throw new HttpError(404, "unknown_item");
  const { data: c } = await admin.from("characters").select("level").eq("user_id", user.id).single();
  if (!c || c.level < (item.minLevel ?? 1)) throw new HttpError(403, "level_too_low");
  await assertBagSpace(admin, user.id);
  await rpc(admin, "buy_item", { p_user: user.id, p_item: item.id, p_price: item.buy, p_qty: 1 });
  return { ok: true };
}, { max: 20, windowSec: 60 });
