import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { ITEM_BY_ID, MAX_UPGRADE, upgradeChance, upgradeCost } from "@/lib/game/items";

export const POST = action("smith-upgrade", z.object({ inventoryId: z.uuid() }).strict(), async ({ user, body, admin }) => {
  const { data: inv } = await admin.from("inventory").select("item_id, upgrade").eq("id", body.inventoryId).eq("user_id", user.id).maybeSingle();
  const item = inv && ITEM_BY_ID[inv.item_id];
  if (!item || !item.slot) throw new HttpError(404, "not_equippable");
  if (inv.upgrade >= MAX_UPGRADE) throw new HttpError(409, "max_upgrade");
  const next = inv.upgrade + 1;
  // Custo e chance definidos no servidor; o sorteio acontece no banco.
  return rpc(admin, "upgrade_item", { p_user: user.id, p_inventory_id: body.inventoryId, p_cost: upgradeCost(item, next), p_chance: upgradeChance(next) });
}, { max: 40, windowSec: 60 });
