import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { collectorKey, collectorOrders, orderAccepts } from "@/lib/game/collector";

// Entrega de uma Encomenda do Colecionador. O cliente só diz QUAL encomenda e QUAIS itens;
// a encomenda do dia, a recompensa e se os itens servem são decididos aqui no servidor.
const Schema = z.object({ idx: z.number().int().min(0).max(2), inventoryIds: z.array(z.uuid()).min(1).max(10) }).strict();

export const POST = action("collector-deliver", Schema, async ({ user, body, admin }) => {
  const day = new Date().toISOString().slice(0, 10);
  const { data: ch } = await admin.from("characters").select("level").eq("user_id", user.id).maybeSingle();
  if (!ch) throw new HttpError(404, "no_character");
  const order = collectorOrders(day, ch.level)[body.idx];

  const ids = [...new Set(body.inventoryIds)];
  const { data: rows } = await admin.from("inventory").select("id, item_id, qty, equipped").eq("user_id", user.id).in("id", ids);
  if (!rows || rows.length !== ids.length) throw new HttpError(404, "not_owner");
  if (rows.some((r) => r.equipped)) throw new HttpError(409, "item_equipped");
  if (rows.some((r) => !orderAccepts(order, r.item_id))) throw new HttpError(409, "wrong_item");

  // Tira só o necessário (ex.: 4 poções de uma pilha de 10).
  let left = order.qty;
  const take: { id: string; qty: number }[] = [];
  for (const r of rows) {
    if (left <= 0) break;
    const n = Math.min(left, r.qty);
    take.push({ id: r.id, qty: n });
    left -= n;
  }
  if (left > 0) throw new HttpError(409, "not_enough_items");

  const levelUps = await rpc<number>(admin, "collector_deliver", {
    p_user: user.id, p_key: collectorKey(day, order.idx), p_take: take, p_gold: order.gold, p_gems: order.gems, p_xp: order.xp,
  });
  return { ok: true, gold: order.gold, gems: order.gems, xp: order.xp, levelUps };
}, { max: 20, windowSec: 60 });
