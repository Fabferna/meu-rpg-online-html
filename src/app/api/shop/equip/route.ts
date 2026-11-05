import { z } from "zod";
import { action, rpc } from "@/lib/api";

const Schema = z.object({ kind: z.enum(["frame", "title", "skin"]), cosmeticId: z.string().max(64).nullable() }).strict();

export const POST = action("cosmetic-equip", Schema, async ({ user, body, admin }) => {
  await rpc(admin, "equip_cosmetic", { p_user: user.id, p_kind: body.kind, p_cosmetic: body.cosmeticId });
  return { ok: true };
});
