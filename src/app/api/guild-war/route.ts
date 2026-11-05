import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/security/http";
import { guildWarBoard, myGuild, previousWeekStart, weekStart } from "@/lib/game/guildServer";
import { GUILD_WAR_REWARDS } from "@/lib/game/guildBoss";
import { secondsToWeekEnd } from "@/lib/game/weekly";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const admin = createAdminClient();
  const prevStart = previousWeekStart();
  const [g, board, last] = await Promise.all([myGuild(admin, user.id), guildWarBoard(admin, weekStart()), guildWarBoard(admin, prevStart)]);
  const mine = g ? board.find((r) => r.guildId === g.guild_id) : undefined;
  const myLast = g ? last.find((r) => r.guildId === g.guild_id) : undefined;
  const reward = myLast ? GUILD_WAR_REWARDS.find((r) => r.rank === myLast.pos) : undefined;
  let claimable = null;
  if (g && myLast && reward) {
    // Só quem já estava na guilda antes do fim daquela semana.
    const weekEnd = new Date(prevStart + "T00:00:00Z").getTime() + 7 * 86_400_000;
    const { data: c } = await admin.from("reward_claims").select("claim_key").eq("user_id", user.id).eq("claim_key", `gwar:${prevStart}`).maybeSingle();
    if (new Date(g.joined_at).getTime() < weekEnd && !c) claimable = { pos: myLast.pos, ...reward };
  }
  const strip = (r: (typeof board)[number]) => ({ pos: r.pos, name: r.name, tag: r.tag, level: r.level, score: r.score, mine: r.guildId === g?.guild_id });
  return NextResponse.json({
    endsInSec: secondsToWeekEnd(), rows: board.slice(0, 20).map(strip),
    mine: mine ? strip(mine) : null, claimable,
  }, { headers: { "Cache-Control": "no-store" } });
}
