import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { FREE_CHAR_SLOTS } from "@/lib/game/rules";

// Guarda o herói ativo para liberar a criação de outro (se houver espaço).
export const POST = action("char-new", z.object({}).strict(), async ({ user, admin }) => {
  const [{ count }, { data: p }] = await Promise.all([
    admin.from("character_stash").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    admin.from("profiles").select("char_slots").eq("id", user.id).maybeSingle(),
  ]);
  // Ativo + guardados + o novo precisam caber.
  if ((count ?? 0) + 2 > (p?.char_slots ?? FREE_CHAR_SLOTS)) throw new HttpError(403, "no_slot");
  await rpc(admin, "stash_character", { p_user: user.id });
  return { ok: true };
}, { max: 5, windowSec: 60 });
