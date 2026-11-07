import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { RARE_ENEMIES } from "@/lib/game/enemies";
import { battleVitals, loadPlayer } from "@/lib/game/player";
import { RARE_RULES } from "@/lib/game/encounters";
import type { BattleState } from "@/lib/game/combat";

// Enfrentar o Errante que está esperando (encontro raro). Sem custo de energia; máximo 5 por dia.
// O banco consome o encontro e conta no limite na mesma transação (rare_start).
export const POST = action("rare-start", z.object({}).strict(), async ({ user, admin }) => {
  const p = await loadPlayer(admin, user.id);
  if (!p) throw new HttpError(404, "no_character");
  if (p.hp < Math.ceil(p.maxHp * 0.15)) throw new HttpError(409, "hp_too_low");
  const [{ count: quests }, { count: fights }] = await Promise.all([
    admin.from("quest_runs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "running"),
    admin.from("battles").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active"),
  ]);
  if (quests) throw new HttpError(409, "quest_already_running");
  if (fights) throw new HttpError(409, "in_battle");

  const idx = await rpc<number>(admin, "rare_start", { p_user: user.id, p_limit: RARE_RULES.perDay });
  const e = RARE_ENEMIES[idx];
  if (!e) throw new HttpError(409, "no_encounter");
  const state: BattleState = {
    enemyId: e.id, enemy: { name: e.name, image: e.image, hp: e.maxHp, maxHp: e.maxHp, boss: e.boss },
    player: battleVitals(p), turn: 0, skillCooldown: 0, log: [], rare: true,
  };
  const { error } = await admin.from("battles").insert({ user_id: user.id, kind: "pve", state });
  if (error) throw new HttpError(409, "in_battle");
  return { ok: true, enemy: e.id };
});
