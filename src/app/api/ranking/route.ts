import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/security/http";
import { RACES, type Gender, type RaceId } from "@/lib/game/data";
import { COSMETIC_BY_ID } from "@/lib/shop/catalog";
import { previousSeasonStart, rewardFor, secondsToSeasonEnd, seasonStart } from "@/lib/game/weekly";
import { weeklyBoard } from "@/lib/game/weeklyServer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const admin = createAdminClient();
  const scope = new URL(request.url).searchParams.get("scope");

  if (scope === "week") {
    const cur = seasonStart(), prev = previousSeasonStart();
    const [board, last, claim] = await Promise.all([
      weeklyBoard(admin, cur),
      weeklyBoard(admin, prev),
      admin.from("reward_claims").select("claim_key").eq("user_id", user.id).eq("claim_key", `season:${prev}`).maybeSingle(),
    ]);
    const strip = ({ userId: _u, ...r }: (typeof board)[number]) => r; // não expõe ids
    const me = board.find((r) => r.userId === user.id);
    const mePrev = last.find((r) => r.userId === user.id);
    return NextResponse.json({
      week: cur, endsInSec: secondsToSeasonEnd(),
      rows: board.slice(0, 50).map(strip),
      me: me ? { pos: me.pos, score: me.score, reward: rewardFor(me.pos, me.score) } : null,
      lastWeek: mePrev ? { week: prev, pos: mePrev.pos, score: mePrev.score, reward: rewardFor(mePrev.pos, mePrev.score), claimed: !!claim.data } : null,
    }, { headers: { "Cache-Control": "no-store" } });
  }

  const { data } = await admin.from("ranking").select("*").limit(50);
  const rows = (data ?? []).map((r, i) => ({
    pos: i + 1, name: r.name, level: r.level, pvp_rating: r.pvp_rating, pvp_wins: r.pvp_wins, pvp_losses: r.pvp_losses,
    raceName: RACES[r.race as RaceId]?.name ?? r.race,
    portrait: (r.equipped_skin && COSMETIC_BY_ID[r.equipped_skin]?.image) || RACES[r.race as RaceId]?.portraits[r.gender as Gender],
    frame: r.equipped_frame, title: r.equipped_title ? COSMETIC_BY_ID[r.equipped_title]?.name ?? null : null,
  }));
  return NextResponse.json({ rows }, { headers: { "Cache-Control": "private, max-age=30" } });
}
