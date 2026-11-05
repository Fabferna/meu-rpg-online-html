import { z } from "zod";
import { action, rpc } from "@/lib/api";

// Troca para um herói guardado (guarda o ativo, se houver).
export const POST = action("char-switch", z.object({ stashId: z.string().uuid() }).strict(), async ({ user, body, admin }) => {
  const { data: active } = await admin.from("characters").select("id").eq("user_id", user.id).maybeSingle();
  if (active) await rpc(admin, "stash_character", { p_user: user.id });
  try {
    await rpc(admin, "restore_character", { p_user: user.id, p_stash: body.stashId });
  } catch (e) {
    // Não deixa a conta sem herói se o destino for inválido: traz o anterior de volta.
    if (active) {
      const { data: last } = await admin.from("character_stash").select("id").eq("user_id", user.id).order("stashed_at", { ascending: false }).limit(1).single();
      if (last) await rpc(admin, "restore_character", { p_user: user.id, p_stash: last.id });
    }
    throw e;
  }
  return { ok: true };
}, { max: 10, windowSec: 60 });
