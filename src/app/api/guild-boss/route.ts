import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/security/http";
import { bossState, myGuild, previousWeekStart } from "@/lib/game/guildServer";
import { GUILD_BOSS_RULES } from "@/lib/game/guildBoss";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const admin = createAdminClient();
  const g = await myGuild(admin, user.id);
  if (!g) return NextResponse.json({ guild: false });
  const [cur, prev, { data: used }] = await Promise.all([
    bossState(admin, g.guild_id, user.id),
    bossState(admin, g.guild_id, user.id, previousWeekStart()),
    admin.from("user_counters").select("value").eq("user_id", user.id).eq("key", "gboss").eq("day", new Date().toISOString().slice(0, 10)).maybeSingle(),
  ]);
  const strip = (s: typeof cur) => ({ ...s, topUser: undefined, isTop: s.topUser === user.id });
  return NextResponse.json({
    guild: true, current: strip(cur),
    previous: prev.defeated && prev.myDamage > 0 && !prev.claimed ? strip(prev) : null,
    attacksLeft: Math.max(0, GUILD_BOSS_RULES.attacksPerDay - (used?.value ?? 0)),
  }, { headers: { "Cache-Control": "no-store" } });
}
