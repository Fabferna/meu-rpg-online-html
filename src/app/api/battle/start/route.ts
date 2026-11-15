import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { ENEMY_BY_ID, enemyAt, huntLevel } from "@/lib/game/enemies";
import { battleVitals, loadPlayer } from "@/lib/game/player";
import { PVE_ENERGY_COST } from "@/lib/game/rules";
import { dailyCounts } from "@/lib/game/dailyLimits";
import type { BattleState } from "@/lib/game/combat";
import { REGION_OF_ENEMY, regionUnlocked } from "@/lib/game/regions";

export const POST = action("battle-start", z.object({ enemyId: z.string().max(64) }).strict(), async ({ user, body, admin }) => {
  const base = ENEMY_BY_ID[body.enemyId];
  if (!base || base.story) throw new HttpError(404, "unknown_enemy");

  const p = await loadPlayer(admin, user.id);
  if (!p) throw new HttpError(404, "no_character");
  if (p.row.level < base.minLevel) throw new HttpError(403, "level_too_low");
  if (!regionUnlocked(REGION_OF_ENEMY[base.id], p.row.story_chapter)) throw new HttpError(403, "region_locked");
  // Escala por nível: o monstro sobe até perto do nível do herói (enemies.ts → enemyAt).
  const lvl = huntLevel(base, p.row.level);
  const enemy = enemyAt(base, lvl);
  if (p.hp < Math.ceil(p.maxHp * 0.15)) throw new HttpError(409, "hp_too_low");

  const { count } = await admin.from("quest_runs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "running");
  if (count) throw new HttpError(409, "quest_already_running");

  const daily = await dailyCounts(admin, user.id);
  if (daily.hunts >= daily.huntLimit) throw new HttpError(429, "daily_hunts");

  await rpc(admin, "spend_energy", { p_user: user.id, p_amount: PVE_ENERGY_COST });

  const state: BattleState = {
    enemyId: enemy.id,
    enemy: { name: enemy.name, image: enemy.image, hp: enemy.maxHp, maxHp: enemy.maxHp, boss: enemy.boss },
    lvl,
    player: battleVitals(p),
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
