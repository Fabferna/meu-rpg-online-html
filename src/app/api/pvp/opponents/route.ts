import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/security/http";
import { RACES, type Gender, type RaceId } from "@/lib/game/data";

export const dynamic = "force-dynamic";

// Lista adversários com nível próximo. Só expõe dados públicos.
export async function GET() {
  const { user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const admin = createAdminClient();
  const { data: me } = await admin.from("characters").select("level").eq("user_id", user.id).single();
  if (!me) return jsonError(404, "no_character");

  const { data } = await admin
    .from("characters")
    .select("name, race, gender, level, pvp_rating, pvp_wins, pvp_losses")
    .neq("user_id", user.id)
    .gte("level", Math.max(1, me.level - 5))
    .lte("level", me.level + 5)
    .order("pvp_rating", { ascending: false })
    .limit(12);

  const opponents = (data ?? []).map((o) => ({
    name: o.name, level: o.level, rating: o.pvp_rating, wins: o.pvp_wins, losses: o.pvp_losses,
    raceName: RACES[o.race as RaceId].name, portrait: RACES[o.race as RaceId].portraits[o.gender as Gender],
  }));
  return NextResponse.json({ opponents }, { headers: { "Cache-Control": "no-store" } });
}
