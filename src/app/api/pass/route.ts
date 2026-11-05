import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/security/http";
import { seasonOf, tierFor } from "@/lib/game/seasonPass";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const admin = createAdminClient();
  const s = seasonOf();
  const [{ data: points }, { data: pass }, { data: claims }] = await Promise.all([
    admin.rpc("season_points", { p_user: user.id, p_start: s.start, p_end: s.end }),
    admin.from("season_passes").select("season").eq("user_id", user.id).eq("season", s.id).maybeSingle(),
    admin.from("reward_claims").select("claim_key").eq("user_id", user.id).like("claim_key", `pass:${s.id}:%`),
  ]);
  const pts = Number(points ?? 0);
  return NextResponse.json({
    season: s, points: pts, tier: tierFor(pts), premium: !!pass,
    claimed: (claims ?? []).map((c) => c.claim_key.split(":").slice(2).join(":")), // "5:free"
  }, { headers: { "Cache-Control": "no-store" } });
}
