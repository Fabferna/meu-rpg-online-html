import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { loadPlayer } from "@/lib/game/player";
import { POTION_ITEM } from "@/lib/game/combat";

export const POST = action("use-item", z.object({ itemId: z.literal(POTION_ITEM) }).strict(), async ({ user, admin }) => {
  const p = await loadPlayer(admin, user.id);
  if (!p) throw new HttpError(404, "no_character");
  if (p.hp >= p.maxHp) throw new HttpError(409, "hp_full");
  const { count } = await admin.from("battles").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active");
  if (count) throw new HttpError(409, "in_battle");
  if (!(await rpc<boolean>(admin, "consume_item", { p_user: user.id, p_item: POTION_ITEM }))) throw new HttpError(409, "no_item");
  await rpc(admin, "set_hp", { p_user: user.id, p_hp: p.hp + 60 });
  return { ok: true };
});
