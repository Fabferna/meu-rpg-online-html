import { z } from "zod";
import { action, rpc } from "@/lib/api";

export const POST = action("equip", z.object({ inventoryId: z.uuid() }).strict(), async ({ user, body, admin }) => {
  const equipped = await rpc<boolean>(admin, "toggle_equip", { p_user: user.id, p_inventory_id: body.inventoryId });
  return { ok: true, equipped };
});
