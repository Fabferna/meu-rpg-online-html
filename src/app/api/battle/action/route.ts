import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { ENEMY_BY_ID } from "@/lib/game/enemies";
import { loadPlayer } from "@/lib/game/player";
import { chance } from "@/lib/game/rng";
import { normalizeLoadout } from "@/lib/game/skills";
import type { RaceId } from "@/lib/game/data";
import { DUNGEON_BY_ID, DUNGEON_REST } from "@/lib/game/dungeons";
import { CHAPTER_BY_N } from "@/lib/game/story";
import { enemyCombatant, playerCombatant, POTION_ITEM, resolveTurn, type BattleState } from "@/lib/game/combat";

// "skill"/"racial" = nomes antigos, tratados como o 1º espaço da barra.
const Schema = z.object({ action: z.enum(["attack", "defend", "potion", "s0", "s1", "s2", "skill", "racial"]) }).strict();

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

    const act = body.action === "skill" || body.action === "racial" ? "s0" : body.action;
    const loadout = normalizeLoadout(p.row.race as RaceId, p.row.skills, p.row.level);
    const { state: next, outcome } = resolveTurn(state, act, pc, ec, hasPotion, loadout, enemy.traits);

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

    // Masmorra: vencer um estágio que não é o último mantém a batalha ativa.
    const dg = next.dungeon;
    const stageCleared = outcome === "won" && !!dg && dg.stage < dg.total - 1;
    const status = stageCleared ? "active" : outcome;

    // Concorrência otimista: se dois cliques chegarem juntos, só um grava.
    const { data: updated } = await admin
      .from("battles")
      .update({ state: next, status, version: battle.version + 1, updated_at: new Date().toISOString() })
      .eq("id", battle.id).eq("version", battle.version)
      .select("id");
    if (!updated?.length) throw new HttpError(409, "stale_battle");

    if (status !== "active") {
      await rpc(admin, "set_hp", { p_user: user.id, p_hp: next.player.hp });
    }
    if (outcome === "won" && next.rewards) {
      next.rewards.levelUps = await rpc<number>(admin, "grant_rewards", {
        p_user: user.id, p_xp: next.rewards.xp, p_gold: next.rewards.gold, p_item: next.rewards.item,
        p_reason: `pve:${enemy.id}`, p_ref: `battle:${battle.id}${dg ? `:${dg.stage}` : ""}`,
      });
      await rpc(admin, "record_event", { p_user: user.id, p_event: "pve_win", p_amount: 1 });
      if (enemy.boss) await rpc(admin, "record_event", { p_user: user.id, p_event: "boss_win", p_amount: 1 });

      // História: conclui o capítulo e entrega a recompensa (o SQL garante a ordem).
      if (next.story) {
        const ch = CHAPTER_BY_N[next.story];
        const ups = await rpc<number>(admin, "complete_chapter", {
          p_user: user.id, p_chapter: ch.n, p_xp: ch.rewards.xp, p_gold: ch.rewards.gold, p_gems: ch.rewards.gems,
          p_item: ch.rewards.item ?? null, p_cosmetic: ch.rewards.cosmetic ?? null,
        });
        next.storyResult = { ...ch.rewards, levelUps: ups };
      }

      const d = dg ? DUNGEON_BY_ID[dg.id] : undefined;
      if (stageCleared && d && dg) {
        // Próximo inimigo; entre os estágios o herói descansa e recupera só parte da vida.
        const nxt = ENEMY_BY_ID[d.stages[dg.stage + 1]];
        const cleared = { ...next };
        next.enemyId = nxt.id;
        next.enemy = { name: nxt.name, image: nxt.image, hp: nxt.maxHp, maxHp: nxt.maxHp, boss: nxt.boss };
        next.dungeon = { ...dg, stage: dg.stage + 1 };
        next.player.hp = Math.min(next.player.maxHp, next.player.hp + Math.round(next.player.maxHp * DUNGEON_REST));
        next.log = [];
        next.rewards = undefined;
        await admin.from("battles").update({ state: next }).eq("id", battle.id);
        return { outcome: "active", state: next, stageCleared: { stage: dg.stage + 1, rewards: cleared.rewards } };
      }
      if (d && dg) {
        // Baú final da masmorra (uma vez por batalha).
        const chest = { gold: d.chest.gold, gems: d.chest.gems, item: d.chest.item && chance(d.chest.item.chance) ? d.chest.item.id : null };
        await rpc(admin, "claim_bundle", {
          p_user: user.id, p_key: `dungeon:${battle.id}`, p_gold: chest.gold, p_gems: chest.gems, p_cosmetic: null,
          p_item: chest.item, p_qty: chest.item ? 1 : 0, p_boost_min: 0, p_pet: null,
        });
        next.dungeon = { ...dg, chest };
      }
      await admin.from("battles").update({ state: next }).eq("id", battle.id);
    }

    return { outcome, state: next };
  },
  { max: 90, windowSec: 60 },
);
