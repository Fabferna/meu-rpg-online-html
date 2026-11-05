import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import type { RaceId } from "@/lib/game/data";
import { normalizeLoadout, SKILL_BY_ID, slotsFor } from "@/lib/game/skills";

// Define a barra de combate (até 3 habilidades aprendidas da própria raça).
export const POST = action("skill-equip", z.object({ eq: z.array(z.string().max(32)).min(1).max(3) }).strict(), async ({ user, body, admin }) => {
  const { data: c } = await admin.from("characters").select("race, level, skills").eq("user_id", user.id).single();
  if (!c) throw new HttpError(404, "no_character");
  const lo = normalizeLoadout(c.race as RaceId, c.skills, c.level);
  const eq = [...new Set(body.eq)];
  if (eq.length > slotsFor(c.level)) throw new HttpError(403, "level_too_low");
  if (eq.some((id) => !lo.lv[id] || SKILL_BY_ID[id]?.race !== c.race)) throw new HttpError(400, "invalid_action");
  await rpc(admin, "equip_skills", { p_user: user.id, p_eq: eq });
  return { ok: true };
}, { max: 30, windowSec: 60 });
