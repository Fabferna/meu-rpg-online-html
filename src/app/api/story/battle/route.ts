import { z } from "zod";
import { action, HttpError } from "@/lib/api";
import { CHAPTER_BY_N, CHAPTERS, trailDone, trailLevel, trailOf } from "@/lib/game/story";
import { ENEMY_BY_ID } from "@/lib/game/enemies";
import { battleVitals, loadPlayer } from "@/lib/game/player";
import type { BattleState } from "@/lib/game/combat";

// Luta da história: os 2 trechos do capítulo (step 1 e 2) e depois o chefe (sem step).
// Sem custo de energia e pode ser repetida até vencer. Ordem e nível conferidos aqui no servidor.
export const POST = action("story-battle", z.object({
  chapter: z.number().int().min(1).max(CHAPTERS.length),
  step: z.number().int().min(1).max(5).optional(),
}).strict(), async ({ user, body, admin }) => {
  const ch = CHAPTER_BY_N[body.chapter];
  const p = await loadPlayer(admin, user.id);
  if (!p) throw new HttpError(404, "no_character");
  if (body.chapter !== (p.row.story_chapter ?? 0) + 1) throw new HttpError(409, "invalid_action");
  if (p.hp < Math.ceil(p.maxHp * 0.3)) throw new HttpError(409, "hp_too_low");
  const { count } = await admin.from("quest_runs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "running");
  if (count) throw new HttpError(409, "quest_already_running");

  const trail = trailOf(ch.n);
  const { data: tc } = await admin.from("user_counters").select("value").eq("user_id", user.id).eq("key", "story_trail").eq("day", "2000-01-01").maybeSingle();
  const done = trailDone(ch.n, Number(tc?.value ?? 0));

  let enemyId: string;
  const extra: Partial<BattleState> = {};
  if (body.step) {
    // Trecho: só o próximo da fila, no nível do capítulo anterior.
    if (body.step !== done + 1 || body.step > trail.length) throw new HttpError(409, "invalid_action");
    if (p.row.level < trailLevel(ch.n)) throw new HttpError(403, "level_too_low");
    enemyId = trail[body.step - 1].enemy;
    extra.storyTrail = { chapter: ch.n, step: body.step };
  } else {
    // Chefe: só depois dos trechos e no nível do capítulo.
    if (done < trail.length) throw new HttpError(409, "story_trail_pending");
    if (p.row.level < ch.minLevel) throw new HttpError(403, "level_too_low");
    enemyId = ch.enemy;
    extra.story = ch.n;
  }

  const e = ENEMY_BY_ID[enemyId];
  const state: BattleState = {
    enemyId: e.id, enemy: { name: e.name, image: e.image, hp: e.maxHp, maxHp: e.maxHp, boss: e.boss },
    player: battleVitals(p), turn: 0, skillCooldown: 0, log: [], ...extra,
  };
  const { error } = await admin.from("battles").insert({ user_id: user.id, kind: "pve", state });
  if (error) throw new HttpError(409, "in_battle");
  return { ok: true };
});
