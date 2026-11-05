import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { PASS_REWARDS, PASS_TIERS, seasonOf, tierFor } from "@/lib/game/seasonPass";

const Schema = z.object({ tier: z.number().int().min(1).max(PASS_TIERS), track: z.enum(["free", "premium"]) }).strict();

export const POST = action("pass-claim", Schema, async ({ user, body, admin }) => {
  const s = seasonOf();
  const points = Number(await rpc(admin, "season_points", { p_user: user.id, p_start: s.start, p_end: s.end }));
  if (tierFor(points) < body.tier) throw new HttpError(409, "goal_incomplete");
  if (body.track === "premium") {
    const { data } = await admin.from("season_passes").select("season").eq("user_id", user.id).eq("season", s.id).maybeSingle();
    if (!data) throw new HttpError(403, "no_permission");
  }
  const r = PASS_REWARDS[body.tier - 1][body.track];
  await rpc(admin, "claim_bundle", {
    p_user: user.id, p_key: `pass:${s.id}:${body.tier}:${body.track}`, p_gold: r.gold ?? 0, p_gems: r.gems ?? 0,
    p_cosmetic: r.cosmetic ?? null, p_item: r.item?.id ?? null, p_qty: r.item?.qty ?? 0, p_boost_min: r.boostMin ?? 0, p_pet: r.pet ?? null,
  });
  return { ok: true, label: r.label };
}, { max: 40, windowSec: 60 });
