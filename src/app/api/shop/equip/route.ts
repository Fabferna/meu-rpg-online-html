import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { COSMETIC_BY_ID, skinFits } from "@/lib/shop/catalog";

const Schema = z.object({ kind: z.enum(["frame", "title", "skin"]), cosmeticId: z.string().max(64).nullable() }).strict();

export const POST = action("cosmetic-equip", Schema, async ({ user, body, admin }) => {
  const c = body.cosmeticId ? COSMETIC_BY_ID[body.cosmeticId] : null;
  if (c?.race) {
    const { data: ch } = await admin.from("characters").select("race, gender").eq("user_id", user.id).single();
    if (!ch || !skinFits(c, ch.race, ch.gender)) throw new HttpError(403, "wrong_race");
  }
  await rpc(admin, "equip_cosmetic", { p_user: user.id, p_kind: body.kind, p_cosmetic: body.cosmeticId });
  return { ok: true };
});
