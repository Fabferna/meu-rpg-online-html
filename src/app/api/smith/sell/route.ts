import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { ITEM_BY_ID } from "@/lib/game/items";

export const POST = action("smith-sell", z.object({ inventoryId: z.uuid() }).strict(), async ({ user, body, admin }) => {
  // O preço de venda vem do catálogo do servidor, pelo item que está no inventário.
  const { data: inv } = await admin.from("inventory").select("item_id").eq("id", body.inventoryId).eq("user_id", user.id).maybeSingle();
  const item = inv && ITEM_BY_ID[inv.item_id];
  if (!item) throw new HttpError(404, "not_owner");
  await rpc(admin, "sell_item", { p_user: user.id, p_inventory_id: body.inventoryId, p_price: item.sell });
  return { ok: true, gold: item.sell };
}, { max: 40, windowSec: 60 });
