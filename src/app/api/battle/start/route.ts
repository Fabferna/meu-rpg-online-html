import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { ENEMY_BY_ID } from "@/lib/game/enemies";
import { loadPlayer } from "@/lib/game/player";
import { PVE_ENERGY_COST } from "@/lib/game/rules";
import type { BattleState } from "@/lib/game/combat";
import { REGION_OF_ENEMY, regionUnlocked } from "@/lib/game/regions";

export const POST = action("battle-start", z.object({ enemyId: z.string().max(64) }).strict(), async ({ user, body, admin }) => {
  const enemy = ENEMY_BY_ID[body.enemyId];
  if (!enemy || enemy.story) throw new HttpError(404, "unknown_enemy");

  const p = await loadPlayer(admin, user.id);
  if (!p) throw new HttpError(404, "no_character");
  if (p.row.level < enemy.minLevel) throw new HttpError(403, "level_too_low");
  if (!regionUnlocked(REGION_OF_ENEMY[enemy.id], p.row.story_chapter)) throw new HttpError(403, "region_locked");
  if (p.hp < Math.ceil(p.maxHp * 0.15)) throw new HttpError(409, "hp_too_low");

  const { count } = await admin.from("quest_runs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "running");
  if (count) throw new HttpError(409, "quest_already_running");

  await rpc(admin, "spend_energy", { p_user: user.id, p_amount: PVE_ENERGY_COST });

  const state: BattleState = {
    enemyId: enemy.id,
    enemy: { name: enemy.name, image: enemy.image, hp: enemy.maxHp, maxHp: enemy.maxHp, boss: enemy.boss },
    player: { hp: p.hp, maxHp: p.maxHp },
    turn: 0,
    skillCooldown: 0,
    log: [],
  };
  const { data, error } = await admin.from("battles").insert({ user_id: user.id, kind: "pve", state }).select("id").single();
  if (error) {
    if (error.code === "23505") throw new HttpError(409, "in_battle");
    throw error;
  }
  return { ok: true, battleId: data.id };
});
