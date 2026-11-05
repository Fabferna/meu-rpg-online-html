import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/security/http";
import { REFERRAL } from "@/lib/game/referrals";

export const dynamic = "force-dynamic";

// Convidados do jogador (só nome e nível) + o que já foi resgatado.
export async function GET() {
  const { user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const admin = createAdminClient();
  const [{ data: me }, { data: invited }, { data: claims }] = await Promise.all([
    admin.from("characters").select("name").eq("user_id", user.id).single(),
    admin.from("characters").select("user_id, name, level, created_at").eq("referred_by", user.id).order("created_at"),
    admin.from("reward_claims").select("claim_key").eq("user_id", user.id).like("claim_key", "ref:%"),
  ]);
  const claimed = new Set((claims ?? []).map((c) => c.claim_key));
  const paid = claimed.size;
  return NextResponse.json({
    code: me?.name ?? null,
    paid, maxPaid: REFERRAL.maxPaid,
    invited: (invited ?? []).map((i, idx) => ({
      idx, name: i.name, level: i.level,
      claimed: claimed.has(`ref:${i.user_id}`),
      ready: i.level >= REFERRAL.levelRequired,
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}
