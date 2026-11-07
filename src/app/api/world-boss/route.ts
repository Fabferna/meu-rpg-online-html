import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/security/http";
import { worldBossState } from "@/lib/game/worldBossServer";
import { WORLD_BOSS_RULES } from "@/lib/game/worldBoss";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const s = await worldBossState(createAdminClient(), user.id);
  const ended = s.defeated || new Date() >= new Date(s.endsAt);
  return NextResponse.json({
    ...s,
    attacksLeft: Math.max(0, WORLD_BOSS_RULES.attacksPerEvent - s.myAttacks),
    canClaim: ended && s.myDamage > 0 && !s.claimed,
  }, { headers: { "Cache-Control": "no-store" } });
}
