import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { worldBossState } from "@/lib/game/worldBossServer";
import { WORLD_BOSS_ITEMS, worldBossReward } from "@/lib/game/worldBoss";
import { chance, roll } from "@/lib/game/rng";
import type { RaceId } from "@/lib/game/data";

// Recompensa do último Chefe do Mundo (depois que ele cai ou o horário acaba), 1 vez por evento.
// O sorteio do item exclusivo é feito aqui com RNG criptográfico; a chave wboss:<dia> impede resgate duplo.
export const POST = action("world-boss-claim", z.object({}).strict(), async ({ user, admin }) => {
  const s = await worldBossState(admin, user.id);
  const ended = s.defeated || new Date() >= new Date(s.endsAt);
  if (!ended || s.myDamage <= 0) throw new HttpError(409, "goal_incomplete");
  if (s.claimed) throw new HttpError(409, "already_claimed");

  const { data: c } = await admin.from("characters").select("race, level").eq("user_id", user.id).single();
  const rw = worldBossReward(s.defeated, Number(c?.level ?? 1), s.myPos);
  const pool = WORLD_BOSS_ITEMS[(c?.race ?? "humano") as RaceId];
  const item = rw.itemChance > 0 && chance(rw.itemChance) ? pool[roll(0, pool.length - 1)] : null;

  await rpc(admin, "claim_bundle", {
    p_user: user.id, p_key: `wboss:${s.day}`, p_gold: rw.gold, p_gems: rw.gems, p_cosmetic: null,
    p_item: item, p_qty: item ? 1 : 0, p_boost_min: 0, p_pet: null,
  });
  return { ok: true, gold: rw.gold, gems: rw.gems, item, defeated: s.defeated, pos: s.myPos };
});
