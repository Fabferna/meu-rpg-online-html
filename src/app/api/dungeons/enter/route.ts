import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { DUNGEON_BY_ID, DUNGEON_DAILY } from "@/lib/game/dungeons";
import { ENEMY_BY_ID } from "@/lib/game/enemies";
import { battleVitals, loadPlayer } from "@/lib/game/player";
import { PASS_DUNGEON_BONUS, seasonOf } from "@/lib/game/seasonPass";
import type { BattleState } from "@/lib/game/combat";
import { REGION_OF_DUNGEON, regionUnlocked } from "@/lib/game/regions";

export const POST = action("dungeon-enter", z.object({ dungeonId: z.string().max(32) }).strict(), async ({ user, body, admin }) => {
  const d = DUNGEON_BY_ID[body.dungeonId];
  if (!d) throw new HttpError(404, "unknown_item");
  const p = await loadPlayer(admin, user.id);
  if (!p) throw new HttpError(404, "no_character");
  if (p.row.level < d.minLevel) throw new HttpError(403, "level_too_low");
  if (!regionUnlocked(REGION_OF_DUNGEON[d.id], p.row.story_chapter)) throw new HttpError(403, "region_locked");
  if (p.hp < Math.ceil(p.maxHp * 0.5)) throw new HttpError(409, "hp_too_low");

  const { data: pass } = await admin.from("season_passes").select("season").eq("user_id", user.id).eq("season", seasonOf().id).maybeSingle();
  const first = ENEMY_BY_ID[d.stages[0]];
  const state: BattleState = {
    enemyId: first.id, enemy: { name: first.name, image: first.image, hp: first.maxHp, maxHp: first.maxHp, boss: first.boss },
    player: battleVitals(p), turn: 0, skillCooldown: 0, log: [],
    dungeon: { id: d.id, name: d.name, stage: 0, total: d.stages.length },
  };
  // Energia + entrada do dia + criação da luta numa transação só (migração 0028).
  await rpc(admin, "enter_dungeon_battle", {
    p_user: user.id, p_dungeon: d.id, p_daily_limit: DUNGEON_DAILY + (pass ? PASS_DUNGEON_BONUS : 0), p_energy: d.energy, p_state: state,
  });
  return { ok: true };
});
