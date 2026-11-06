import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { ITEM_BY_ID, sellPrice } from "@/lib/game/items";
import { BAG_LIMIT } from "@/lib/game/loot";

// Vende vários itens de uma vez (pilhas inteiras). O preço vem do catálogo do servidor,
// e a venda é uma transação só (sell_many): ou vende tudo, ou nada.
const Schema = z.object({ inventoryIds: z.array(z.uuid()).min(1).max(BAG_LIMIT) }).strict();

export const POST = action("smith-sell-many", Schema, async ({ user, body, admin }) => {
  const ids = [...new Set(body.inventoryIds)];
  const { data: rows } = await admin.from("inventory").select("id, item_id, upgrade, equipped").eq("user_id", user.id).in("id", ids);
  if (!rows || rows.length !== ids.length) throw new HttpError(404, "not_owner");
  if (rows.some((r) => r.equipped)) throw new HttpError(409, "item_equipped");
  const sales = rows.map((r) => {
    const item = ITEM_BY_ID[r.item_id];
    if (!item) throw new HttpError(404, "unknown_item");
    return { id: r.id, price: sellPrice(item, r.upgrade ?? 0) };
  });
  return rpc<{ gold: number; count: number }>(admin, "sell_many", { p_user: user.id, p_sales: sales });
}, { max: 15, windowSec: 60 });
