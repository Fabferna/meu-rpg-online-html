import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { PET_BY_ID, PET_MAX_LEVEL, petTrainCost } from "@/lib/game/pets";

const Schema = z.object({ type: z.enum(["buy", "train", "activate", "dismiss"]), petId: z.string().max(32).optional() }).strict();

export const POST = action("pets", Schema, async ({ user, body, admin }) => {
  if (body.type === "dismiss") return rpc(admin, "set_active_pet", { p_user: user.id, p_pet: null });
  const pet = body.petId ? PET_BY_ID[body.petId] : undefined;
  if (!pet) throw new HttpError(404, "unknown_item");
  if (body.type === "buy") {
    if (!pet.price) throw new HttpError(403, "no_permission"); // exclusivo do passe
    return rpc(admin, "buy_pet", { p_user: user.id, p_pet: pet.id, p_currency: pet.price.currency, p_price: pet.price.amount });
  }
  if (body.type === "activate") return rpc(admin, "set_active_pet", { p_user: user.id, p_pet: pet.id });
  const { data } = await admin.from("owned_pets").select("level").eq("user_id", user.id).eq("pet_id", pet.id).maybeSingle();
  if (!data) throw new HttpError(404, "not_owner");
  if (data.level >= PET_MAX_LEVEL) throw new HttpError(409, "max_upgrade");
  return { level: await rpc(admin, "train_pet", { p_user: user.id, p_pet: pet.id, p_cost: petTrainCost(data.level) }) };
});
