import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { loadPlayer } from "@/lib/game/player";
import { POTION_ITEM } from "@/lib/game/combat";
import { ITEM_BY_ID } from "@/lib/game/items";
import { DUNGEON_BY_ID } from "@/lib/game/dungeons";
import { chance } from "@/lib/game/rng";

// Usar um consumível do inventário: poção (cura), elixir (bônus de XP) ou baú de masmorra (abre e entrega o conteúdo).
// Tudo decidido aqui no servidor; o conteúdo do baú é sorteado com RNG criptográfico e entregue junto com o gasto do baú.
export const POST = action("use-item", z.object({ itemId: z.string().regex(/^[a-z0-9_]{2,40}$/) }).strict(), async ({ user, body, admin }) => {
  const def = ITEM_BY_ID[body.itemId];
  if (!def || def.slot) throw new HttpError(404, "unknown_item");
  const { count } = await admin.from("battles").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active");
  if (count) throw new HttpError(409, "in_battle");

  if (def.id === POTION_ITEM) {
    const p = await loadPlayer(admin, user.id);
    if (!p) throw new HttpError(404, "no_character");
    if (p.hp >= p.maxHp) throw new HttpError(409, "hp_full");
    if (!(await rpc<boolean>(admin, "consume_item", { p_user: user.id, p_item: POTION_ITEM }))) throw new HttpError(409, "no_item");
    await rpc(admin, "set_hp", { p_user: user.id, p_hp: p.hp + 60 });
    return { ok: true, kind: "heal", heal: 60 };
  }
  if (def.use?.kind === "boost") {
    const until = await rpc<string>(admin, "use_elixir", { p_user: user.id, p_item: def.id, p_minutes: def.use.minutes });
    return { ok: true, kind: "boost", minutes: def.use.minutes, until };
  }
  if (def.use?.kind === "chest") {
    const d = DUNGEON_BY_ID[def.use.dungeon];
    if (!d) throw new HttpError(404, "unknown_item");
    const item = d.chest.item && chance(d.chest.item.chance) && ITEM_BY_ID[d.chest.item.id] ? d.chest.item.id : null;
    await rpc(admin, "open_chest", { p_user: user.id, p_item: def.id, p_gold: d.chest.gold, p_gems: d.chest.gems, p_reward: item });
    return { ok: true, kind: "chest", gold: d.chest.gold, gems: d.chest.gems, item };
  }
  throw new HttpError(409, "invalid_action");
});
