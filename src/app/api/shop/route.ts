import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { jsonError } from "@/lib/security/http";
import { CONVENIENCE, todaysDeals, secondsToUtcMidnight, COSMETIC_BY_ID } from "@/lib/shop/catalog";
import { enabledProviders, todayUtc } from "@/lib/shop/server";

export const dynamic = "force-dynamic";

// Estado da loja para o jogador (lido via RLS).
export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const today = todayUtc();

  const [owned, counters, offers, myOffers, starter, login, char] = await Promise.all([
    supabase.from("owned_cosmetics").select("cosmetic_id").eq("user_id", user.id),
    supabase.from("user_counters").select("key, value").eq("user_id", user.id).eq("day", today),
    supabase.from("limited_offers").select("*").gt("ends_at", new Date().toISOString()).lte("starts_at", new Date().toISOString()),
    supabase.from("offer_purchases").select("offer_id").eq("user_id", user.id),
    supabase.from("payments").select("id").eq("user_id", user.id).eq("product_id", "starter").eq("status", "paid").limit(1),
    supabase.from("user_counters").select("day, value").eq("user_id", user.id).eq("key", "login").order("day", { ascending: false }).limit(1),
    supabase.from("characters").select("equipped_frame, equipped_title, equipped_skin, xp_boost_until").eq("user_id", user.id).maybeSingle(),
  ]);
  const paid = await supabase.from("payments").select("id").eq("user_id", user.id).in("status", ["paid", "refunded"]).limit(1);

  const count = (k: string) => counters.data?.find((c) => c.key === k)?.value ?? 0;
  const lastLogin = login.data?.[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const claimedToday = lastLogin?.day === today;
  const streak = claimedToday || lastLogin?.day === yesterday ? lastLogin!.value : 0;

  return NextResponse.json(
    {
      owned: (owned.data ?? []).map((o) => o.cosmetic_id),
      equipped: { frame: char.data?.equipped_frame ?? null, title: char.data?.equipped_title ?? null, skin: char.data?.equipped_skin ?? null },
      xpBoostUntil: char.data?.xp_boost_until ?? null,
      energyRefillPrice: Math.min(50, 10 * (count("energy_refill") + 1)),
      convenience: CONVENIENCE.map((d) => ({ ...d, boughtToday: count(`deal:${d.key}`) })),
      daily: { deals: todaysDeals().map((d) => ({ ...d, boughtToday: count(`deal:${d.key}`) })), resetsInSec: secondsToUtcMidnight() },
      limited: (offers.data ?? []).map((o) => ({
        id: o.id, cosmetic: o.cosmetic_id ? COSMETIC_BY_ID[o.cosmetic_id] : null, itemId: o.item_id,
        priceGems: o.price_gems, stockLeft: o.stock_total - o.sold, stockTotal: o.stock_total, endsAt: o.ends_at,
        mine: (myOffers.data ?? []).filter((m) => m.offer_id === o.id).length, perUser: o.per_user,
      })),
      starterAvailable: !starter.data?.length,
      firstPurchaseBonus: !paid.data?.length,
      login: { claimedToday, streak },
      providers: enabledProviders(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
