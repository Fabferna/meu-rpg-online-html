import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { ITEM_BY_ID } from "@/lib/game/items";

export const POST = action("equip", z.object({ inventoryId: z.uuid() }).strict(), async ({ user, body, admin }) => {
  // Nível mínimo para equipar (só ao colocar; tirar é sempre permitido).
  const [{ data: inv }, { data: c }] = await Promise.all([
    admin.from("inventory").select("item_id, equipped").eq("id", body.inventoryId).eq("user_id", user.id).maybeSingle(),
    admin.from("characters").select("level").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!inv) throw new HttpError(404, "not_owner");
  if (!inv.equipped && (c?.level ?? 1) < (ITEM_BY_ID[inv.item_id]?.minLevel ?? 1)) throw new HttpError(403, "level_too_low");
  const equipped = await rpc<boolean>(admin, "toggle_equip", { p_user: user.id, p_inventory_id: body.inventoryId });
  return { ok: true, equipped };
});
