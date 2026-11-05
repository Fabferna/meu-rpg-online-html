import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import type { BattleState } from "@/lib/game/combat";

export const POST = action("battle-flee", z.object({}).strict(), async ({ user, admin }) => {
  const { data: b } = await admin.from("battles").select("id, state, version").eq("user_id", user.id).eq("status", "active").maybeSingle();
  if (!b) throw new HttpError(404, "no_battle");
  const { data: updated } = await admin.from("battles").update({ status: "fled", version: b.version + 1 }).eq("id", b.id).eq("version", b.version).select("id");
  if (!updated?.length) throw new HttpError(409, "stale_battle");
  await rpc(admin, "set_hp", { p_user: user.id, p_hp: (b.state as BattleState).player.hp });
  return { ok: true };
});
