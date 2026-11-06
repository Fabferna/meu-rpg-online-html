import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { REFERRAL } from "@/lib/game/referrals";

export const POST = action("ref-claim", z.object({ name: z.string().regex(/^[A-Za-zÀ-ÿ0-9_]{3,16}$/) }).strict(), async ({ user, body, admin }) => {
  const { data: inv } = await admin.from("characters").select("user_id, level").eq("referred_by", user.id).eq("name", body.name).maybeSingle();
  if (!inv) throw new HttpError(404, "unknown_goal");
  if (inv.level < REFERRAL.levelRequired) throw new HttpError(409, "goal_incomplete");
  const { count } = await admin.from("reward_claims").select("claim_key", { count: "exact", head: true }).eq("user_id", user.id).like("claim_key", "ref:%");
  if ((count ?? 0) >= REFERRAL.maxPaid) throw new HttpError(409, "daily_limit");
  await rpc(admin, "claim_reward", { p_user: user.id, p_key: `ref:${inv.user_id}`, p_gold: 0, p_gems: REFERRAL.inviterGems, p_xp: 0, p_cosmetic: null });
  return { ok: true, gems: REFERRAL.inviterGems };
}, { max: 20, windowSec: 60 });
