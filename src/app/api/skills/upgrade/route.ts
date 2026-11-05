import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import type { RaceId } from "@/lib/game/data";
import { normalizeLoadout, SKILL_BY_ID, SKILL_MAX_LEVEL, SKILL_UPGRADE_COST, skillUpgradeLevel } from "@/lib/game/skills";

// Aprende (nível 0 → 1, grátis ao atingir o nível exigido) ou melhora uma habilidade com ouro.
export const POST = action("skill-upgrade", z.object({ skillId: z.string().max(32) }).strict(), async ({ user, body, admin }) => {
  const sk = SKILL_BY_ID[body.skillId];
  const { data: c } = await admin.from("characters").select("race, level, skills").eq("user_id", user.id).single();
  if (!c || !sk || sk.race !== c.race) throw new HttpError(404, "unknown_skill");
  const cur = normalizeLoadout(c.race as RaceId, c.skills, c.level).lv[sk.id] ?? 0;
  // Heróis antigos: a 1ª habilidade conta como nível 1 mesmo sem estar salva.
  const stored = Number((c.skills as { lv?: Record<string, number> } | null)?.lv?.[sk.id] ?? 0);
  if (cur >= SKILL_MAX_LEVEL) throw new HttpError(409, "max_upgrade");
  const need = cur === 0 ? sk.unlock : skillUpgradeLevel(sk, cur);
  if (c.level < need) throw new HttpError(403, "level_too_low");
  const cost = cur === 0 ? 0 : SKILL_UPGRADE_COST[cur];
  if (stored !== cur) {
    // Grava o nível implícito antes de cobrar o próximo.
    await rpc(admin, "upgrade_skill", { p_user: user.id, p_skill: sk.id, p_from: stored, p_cost: 0, p_max: cur });
  }
  const lv = await rpc<number>(admin, "upgrade_skill", { p_user: user.id, p_skill: sk.id, p_from: cur, p_cost: cost, p_max: SKILL_MAX_LEVEL });
  return { ok: true, level: lv };
}, { max: 30, windowSec: 60 });
