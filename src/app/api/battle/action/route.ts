import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { ENEMY_BY_ID } from "@/lib/game/enemies";
import { loadPlayer } from "@/lib/game/player";
import { chance } from "@/lib/game/rng";
import type { RaceId } from "@/lib/game/data";
import { enemyCombatant, playerCombatant, POTION_ITEM, resolveTurn, type BattleState } from "@/lib/game/combat";

const Schema = z.object({ action: z.enum(["attack", "skill", "defend", "potion", "racial"]) }).strict();

export const POST = action(
  "battle-action",
  Schema,
  async ({ user, body, admin }) => {
    const { data: battle } = await admin
      .from("battles").select("id, state, version").eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (!battle) throw new HttpError(404, "no_battle");

    const state = battle.state as BattleState;
    const enemy = ENEMY_BY_ID[state.enemyId];
    const p = await loadPlayer(admin, user.id);
    if (!p || !enemy) throw new HttpError(404, "no_character");

    const pc = playerCombatant(p.row.name, p.attributes, p.row.level, state.player.hp, state.player.maxHp, p.gear);
    const ec = enemyCombatant(enemy, state.enemy.hp);

    let hasPotion = false;
    if (body.action === "potion") hasPotion = await rpc<boolean>(admin, "consume_item", { p_user: user.id, p_item: POTION_ITEM });

    const { state: next, outcome } = resolveTurn(state, body.action, pc, ec, hasPotion, p.row.race as RaceId, enemy.traits);

    if (outcome === "won") {
      // Inimigos muito abaixo do seu nível rendem menos XP (anti-farm).
      const gap = Math.max(0, p.row.level - enemy.minLevel - 3);
      next.rewards = {
        xp: Math.round(enemy.xp * Math.max(0.3, 1 - 0.1 * gap)),
        gold: enemy.gold,
        item: enemy.drop && chance(enemy.drop.chance) ? enemy.drop.item : null,
        levelUps: 0,
      };
    }

    // Concorrência otimista: se dois cliques chegarem juntos, só um grava.
    const { data: updated } = await admin
      .from("battles")
      .update({ state: next, status: outcome, version: battle.version + 1, updated_at: new Date().toISOString() })
      .eq("id", battle.id).eq("version", battle.version)
      .select("id");
    if (!updated?.length) throw new HttpError(409, "stale_battle");

    if (outcome !== "active") {
      await rpc(admin, "set_hp", { p_user: user.id, p_hp: next.player.hp });
    }
    if (outcome === "won" && next.rewards) {
      next.rewards.levelUps = await rpc<number>(admin, "grant_rewards", {
        p_user: user.id, p_xp: next.rewards.xp, p_gold: next.rewards.gold, p_item: next.rewards.item,
        p_reason: `pve:${enemy.id}`, p_ref: `battle:${battle.id}`,
      });
      await admin.from("battles").update({ state: next }).eq("id", battle.id);
      await rpc(admin, "record_event", { p_user: user.id, p_event: "pve_win", p_amount: 1 });
      if (enemy.boss) await rpc(admin, "record_event", { p_user: user.id, p_event: "boss_win", p_amount: 1 });
    }

    return { outcome, state: next };
  },
  { max: 90, windowSec: 60 },
);
