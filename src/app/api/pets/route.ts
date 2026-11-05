import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { jsonError } from "@/lib/security/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const { data } = await supabase.from("owned_pets").select("pet_id, level, active").eq("user_id", user.id);
  return NextResponse.json({ pets: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
