import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { jsonError } from "@/lib/security/http";
import { DUNGEONS, DUNGEON_DAILY } from "@/lib/game/dungeons";
import { PASS_DUNGEON_BONUS, seasonOf } from "@/lib/game/seasonPass";

export const dynamic = "force-dynamic";

// Entradas restantes hoje em cada masmorra.
export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const [{ data: counters }, { data: pass }] = await Promise.all([
    supabase.from("user_counters").select("key, value").eq("user_id", user.id).eq("day", new Date().toISOString().slice(0, 10)).like("key", "dungeon:%"),
    supabase.from("season_passes").select("season").eq("user_id", user.id).eq("season", seasonOf().id).maybeSingle(),
  ]);
  const limit = DUNGEON_DAILY + (pass ? PASS_DUNGEON_BONUS : 0);
  return NextResponse.json({
    limit, premium: !!pass,
    left: Object.fromEntries(DUNGEONS.map((d) => [d.id, Math.max(0, limit - (counters?.find((c) => c.key === `dungeon:${d.id}`)?.value ?? 0))])),
  }, { headers: { "Cache-Control": "no-store" } });
}
