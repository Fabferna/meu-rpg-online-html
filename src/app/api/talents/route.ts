import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { canLearn, normalizeTalents, talentResetCost, spent } from "@/lib/game/talents";

// Árvore de talentos: "learn" coloca +1 ponto num talento (grátis); "reset" devolve todos os pontos (custa ouro).
// Toda a validação é feita aqui; o banco só grava se a árvore não mudou desde a leitura (stale_talents).
export const POST = action("talents", z.discriminatedUnion("action", [
  z.object({ action: z.literal("learn"), id: z.string().regex(/^[a-z0-9_]{2,32}$/) }).strict(),
  z.object({ action: z.literal("reset") }).strict(),
]), async ({ user, body, admin }) => {
  const { data: c } = await admin.from("characters").select("level, talents").eq("user_id", user.id).maybeSingle();
  if (!c) throw new HttpError(404, "no_character");
  const old = c.talents ?? {};
  const cur = normalizeTalents(old);

  if (body.action === "learn") {
    const v = canLearn(cur, body.id, c.level);
    if (!v.ok) throw new HttpError(409, "talent_locked");
    const next = { ...cur, [body.id]: (cur[body.id] ?? 0) + 1 };
    await rpc(admin, "talent_save", { p_user: user.id, p_old: old, p_new: next, p_cost: 0 });
    return { ok: true, talents: next };
  }
  if (spent(cur) === 0) throw new HttpError(409, "invalid_action");
  const cost = talentResetCost(c.level);
  await rpc(admin, "talent_save", { p_user: user.id, p_old: old, p_new: {}, p_cost: cost });
  return { ok: true, talents: {}, cost };
}, { max: 40, windowSec: 60 });
