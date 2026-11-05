import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { CONVENIENCE, COSMETIC_BY_ID, todaysDeals } from "@/lib/shop/catalog";

const Schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("cosmetic"), id: z.string().max(64) }).strict(),
  z.object({ type: z.literal("deal"), id: z.string().max(64) }).strict(),
  z.object({ type: z.literal("offer"), id: z.string().max(64) }).strict(),
]);

export const POST = action("shop-buy", Schema, async ({ user, body, admin }) => {
  if (body.type === "cosmetic") {
    const c = COSMETIC_BY_ID[body.id];
    if (!c?.price) throw new HttpError(404, "unknown_item");
    await rpc(admin, "buy_cosmetic", { p_user: user.id, p_cosmetic: c.id, p_currency: c.price.currency, p_price: c.price.amount });
  } else if (body.type === "deal") {
    const d = [...CONVENIENCE, ...todaysDeals()].find((x) => x.key === body.id);
    if (!d) throw new HttpError(404, "offer_expired");
    await rpc(admin, "buy_daily", {
      p_user: user.id, p_key: d.key, p_limit: d.limit, p_currency: d.currency, p_price: d.price,
      p_item: d.item?.id ?? null, p_qty: d.item?.qty ?? 0, p_boost_minutes: d.boostMinutes ?? 0,
    });
  } else {
    await rpc(admin, "buy_limited_offer", { p_user: user.id, p_offer: body.id });
  }
  return { ok: true };
}, { max: 20, windowSec: 60 });
