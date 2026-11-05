import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/security/http";
import { RACES, type Gender, type RaceId } from "@/lib/game/data";
import { COSMETIC_BY_ID } from "@/lib/shop/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const { data } = await createAdminClient().from("ranking").select("*").limit(50);
  const rows = (data ?? []).map((r, i) => ({
    pos: i + 1, name: r.name, level: r.level, pvp_rating: r.pvp_rating, pvp_wins: r.pvp_wins, pvp_losses: r.pvp_losses,
    raceName: RACES[r.race as RaceId]?.name ?? r.race,
    portrait: (r.equipped_skin && COSMETIC_BY_ID[r.equipped_skin]?.image) || RACES[r.race as RaceId]?.portraits[r.gender as Gender],
    frame: r.equipped_frame, title: r.equipped_title ? COSMETIC_BY_ID[r.equipped_title]?.name ?? null : null,
  }));
  return NextResponse.json({ rows }, { headers: { "Cache-Control": "public, max-age=30" } });
}
