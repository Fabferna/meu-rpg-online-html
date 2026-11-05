import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/security/http";
import { RACES, type RaceId } from "@/lib/game/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const { data } = await createAdminClient().from("ranking").select("*").limit(50);
  const rows = (data ?? []).map((r, i) => ({ pos: i + 1, ...r, raceName: RACES[r.race as RaceId]?.name ?? r.race }));
  return NextResponse.json({ rows }, { headers: { "Cache-Control": "public, max-age=30" } });
}
