import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { ENEMY_BY_ID } from "@/lib/game/enemies";
import { heroCombatant, loadPlayer } from "@/lib/game/player";
import { chance, roll } from "@/lib/game/rng";
import { BAG_LIMIT, rollLoot, type LootDrop, type LootResult } from "@/lib/game/loot";
import { ITEM_BY_ID } from "@/lib/game/items";
import { normalizeLoadout } from "@/lib/game/skills";
import type { RaceId } from "@/lib/game/data";
import { DUNGEON_BY_ID, DUNGEON_REST } from "@/lib/game/dungeons";
import { CHAPTER_BY_N } from "@/lib/game/story";
import { xpRate } from "@/lib/game/rules";
import { enemyCombatant, POTION_ITEM, resolveTurn, type BattleState } from "@/lib/game/combat";

// "skill"/"racial" = nomes antigos, tratados como o 1º espaço da barra.
const Schema = z.object({ action: z.enum(["attack", "defend", "potion", "s0", "s1", "s2", "skill", "racial"]) }).strict();

type Commit = { level_ups: number; story_ups: number | null; story_done: boolean; loot?: LootResult[] };

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

    const pc = heroCombatant(p, state.player.hp, state.player.maxHp);
    const ec = enemyCombatant(enemy, state.enemy.hp);

    // Atordoado: o turno é perdido de qualquer jeito, então a poção não é gasta.
    const stunned = !!state.effects?.pStun;
    let hasPotion = false;
    if (body.action === "potion" && !stunned) hasPotion = await rpc<boolean>(admin, "consume_item", { p_user: user.id, p_item: POTION_ITEM });

    const act = body.action === "skill" || body.action === "racial" ? "s0" : body.action;
    const loadout = normalizeLoadout(p.row.race as RaceId, p.row.skills, p.row.level);
    const { state: next, outcome } = resolveTurn(state, act, pc, ec, hasPotion, loadout, enemy.traits);

    let drops: LootDrop[] = [];
    let pity: "reset" | "bump" | null = null;
    if (outcome === "won") {
      // Inimigos muito abaixo do seu nível rendem menos XP (anti-farm).
      const gap = Math.max(0, p.row.level - enemy.minLevel - 3);
      if (!state.dungeon && !state.story && !state.storyTrail) {
        // Caçada: tabela de saque completa (poções, equipamento da faixa, drop especial, proteção contra azar).
        const { data: pc } = await admin.from("user_counters").select("value").eq("user_id", user.id).eq("key", "loot_pity").eq("day", "2000-01-01").maybeSingle();
        const r = rollLoot(enemy, { heroLevel: p.row.level, pity: Number(pc?.value ?? 0) }, { chance, roll });
        drops = r.drops; pity = r.pity;
      } else if (enemy.drop && chance(enemy.drop.chance)) {
        // Masmorra/história: só o drop especial do inimigo (o baú e o capítulo têm recompensa própria).
        drops = [{ item: enemy.drop.item, qty: 1 }];
      }
      drops = drops.filter((d) => ITEM_BY_ID[d.item]);
      next.rewards = {
        xp: xpRate(enemy.xp * Math.max(0.3, 1 - 0.1 * gap)),
        gold: enemy.gold,
        item: null,
        loot: drops.map((d) => ({ ...d, gold: 0 })),
        levelUps: 0,
      };
    }

    // Masmorra: vencer um estágio que não é o último mantém a batalha ativa (próximo inimigo).
    const dg = next.dungeon;
    const d = dg ? DUNGEON_BY_ID[dg.id] : undefined;
    const stageCleared = outcome === "won" && !!dg && dg.stage < dg.total - 1;
    const status = stageCleared ? "active" : outcome;
    const won = outcome === "won" ? next.rewards : undefined;
    const chDef = outcome === "won" && next.story ? CHAPTER_BY_N[next.story] : undefined;
    const ch = chDef && { ...chDef, rewards: { ...chDef.rewards, xp: xpRate(chDef.rewards.xp) } };
    let chest: { gold: number; gems: number; item: string | null } | undefined;
    let saved: BattleState = next;
    if (stageCleared && d && dg) {
      // Entre os estágios o herói descansa e recupera só parte da vida.
      const nxt = ENEMY_BY_ID[d.stages[dg.stage + 1]];
      saved = {
        ...next,
        enemyId: nxt.id,
        enemy: { name: nxt.name, image: nxt.image, hp: nxt.maxHp, maxHp: nxt.maxHp, boss: nxt.boss },
        dungeon: { ...dg, stage: dg.stage + 1 },
        player: { ...next.player, hp: Math.min(next.player.maxHp, next.player.hp + Math.round(next.player.maxHp * DUNGEON_REST)) },
        effects: {},
        log: [],
        rewards: undefined,
      };
    } else if (outcome === "won" && d && dg) {
      chest = { gold: d.chest.gold, gems: d.chest.gems, item: d.chest.item && chance(d.chest.item.chance) ? d.chest.item.id : null };
      saved.dungeon = { ...dg, chest };
    }
    if (ch) saved.storyResult = { ...ch.rewards, levelUps: 0 };

    // Uma transação só: estado da luta + vida + recompensas + capítulo + baú.
    const res = await rpc<Commit>(admin, "battle_commit", {
      p_user: user.id, p_battle: battle.id, p_version: battle.version, p_state: saved, p_status: status, p_hp: saved.player.hp,
      p_xp: won?.xp ?? null, p_gold: won?.gold ?? null,
      p_loot: won ? drops.map((d) => ({ item: d.item, qty: d.qty, sell: ITEM_BY_ID[d.item].sell })) : null,
      p_reason: `pve:${enemy.id}`, p_ref: `battle:${battle.id}${dg ? `:${dg.stage}` : ""}`, p_boss: !!enemy.boss,
      p_chapter: ch?.n ?? null, p_ch_xp: ch?.rewards.xp ?? null, p_ch_gold: ch?.rewards.gold ?? null, p_ch_gems: ch?.rewards.gems ?? null,
      p_ch_item: ch?.rewards.item ?? null, p_ch_cosmetic: ch?.rewards.cosmetic ?? null,
      p_chest_key: chest ? `dungeon:${battle.id}` : null, p_chest_gold: chest?.gold ?? null, p_chest_gems: chest?.gems ?? null, p_chest_item: chest?.item ?? null,
      p_bag_limit: BAG_LIMIT, p_pity: won ? pity : null,
    });

    if (won) { won.levelUps = res.level_ups; won.loot = res.loot ?? []; }
    // Trecho da história vencido: avança a fila do capítulo (a luta só grava uma vez: stale_battle acima).
    if (outcome === "won" && next.storyTrail) {
      await rpc(admin, "advance_story_trail", { p_user: user.id, p_chapter: next.storyTrail.chapter, p_step: next.storyTrail.step });
    }
    if (ch) {
      if (res.story_done) saved.storyResult = { ...ch.rewards, levelUps: res.story_ups ?? 0 };
      else delete saved.storyResult;
    }
    if (stageCleared && dg) return { outcome: "active", state: saved, stageCleared: { stage: dg.stage + 1, rewards: won } };
    if (outcome !== "active") {
      // Só para exibição (subiu de nível etc.); a parte importante já foi gravada acima.
      await admin.from("battles").update({ state: saved }).eq("id", battle.id);
    }
    return { outcome, state: saved };
  },
  { max: 90, windowSec: 60 },
);
