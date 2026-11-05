import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { jsonError } from "@/lib/security/http";
import { loadGoals } from "@/lib/game/goalsServer";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  return NextResponse.json(await loadGoals(supabase, user.id), { headers: { "Cache-Control": "no-store" } });
}
