import { z } from "zod";
import { action, HttpError } from "@/lib/api";
import { CHAPTER_BY_N, CHAPTERS } from "@/lib/game/story";
import { ENEMY_BY_ID } from "@/lib/game/enemies";
import { loadPlayer } from "@/lib/game/player";
import type { BattleState } from "@/lib/game/combat";

// Luta do capítulo da história. Sem custo de energia e pode ser repetida até vencer.
export const POST = action("story-battle", z.object({ chapter: z.number().int().min(1).max(CHAPTERS.length) }).strict(), async ({ user, body, admin }) => {
  const ch = CHAPTER_BY_N[body.chapter];
  const p = await loadPlayer(admin, user.id);
  if (!p) throw new HttpError(404, "no_character");
  if (body.chapter !== (p.row.story_chapter ?? 0) + 1) throw new HttpError(409, "invalid_action");
  if (p.row.level < ch.minLevel) throw new HttpError(403, "level_too_low");
  if (p.hp < Math.ceil(p.maxHp * 0.3)) throw new HttpError(409, "hp_too_low");
  const { count } = await admin.from("quest_runs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "running");
  if (count) throw new HttpError(409, "quest_already_running");

  const e = ENEMY_BY_ID[ch.enemy];
  const state: BattleState = {
    enemyId: e.id, enemy: { name: e.name, image: e.image, hp: e.maxHp, maxHp: e.maxHp, boss: e.boss },
    player: { hp: p.hp, maxHp: p.maxHp }, turn: 0, skillCooldown: 0, log: [], story: ch.n,
  };
  const { error } = await admin.from("battles").insert({ user_id: user.id, kind: "pve", state });
  if (error) throw new HttpError(409, "in_battle");
  return { ok: true };
});
