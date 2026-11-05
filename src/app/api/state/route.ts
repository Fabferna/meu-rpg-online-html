import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getPlayerState } from "@/lib/game/state";
import { jsonError } from "@/lib/security/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const state = await getPlayerState(supabase, user.id);
  if (!state) return jsonError(404, "no_character");
  return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
}
