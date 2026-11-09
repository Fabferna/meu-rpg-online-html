import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/security/http";

export const dynamic = "force-dynamic";

/** Cosméticos do jogador (títulos, molduras e visuais) e o que está em uso. */
export async function GET() {
  const { user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const admin = createAdminClient();
  const [owned, ch] = await Promise.all([
    admin.from("owned_cosmetics").select("cosmetic_id, acquired_at").eq("user_id", user.id),
    admin.from("characters").select("equipped_frame, equipped_title, equipped_skin").eq("user_id", user.id).maybeSingle(),
  ]);
  return NextResponse.json({
    owned: (owned.data ?? []).map((o) => o.cosmetic_id),
    equipped: { frame: ch.data?.equipped_frame ?? null, title: ch.data?.equipped_title ?? null, skin: ch.data?.equipped_skin ?? null },
  }, { headers: { "Cache-Control": "no-store" } });
}
