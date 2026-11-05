import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { loadGoals } from "@/lib/game/goalsServer";

const Schema = z.object({ kind: z.enum(["daily", "bonus", "achievement"]), id: z.string().max(32).optional() }).strict();

export const POST = action("goal-claim", Schema, async ({ user, body, admin }) => {
  // Recalcula o progresso NO SERVIDOR antes de pagar.
  const g = await loadGoals(admin, user.id);
  let key: string, gold = 0, gems = 0, cosmetic: string | null = null;

  if (body.kind === "daily") {
    const d = g.daily.find((x) => x.id === body.id);
    if (!d) throw new HttpError(404, "unknown_goal");
    if (d.progress < d.target) throw new HttpError(409, "goal_incomplete");
    key = `daily:${g.day}:${d.id}`; gold = d.gold; gems = d.gems;
  } else if (body.kind === "bonus") {
    if (!g.bonus.ready) throw new HttpError(409, "goal_incomplete");
    key = `daily:${g.day}:bonus`; gold = g.bonus.gold; gems = g.bonus.gems;
  } else {
    const a = g.achievements.find((x) => x.id === body.id);
    if (!a) throw new HttpError(404, "unknown_goal");
    if (a.progress < a.target) throw new HttpError(409, "goal_incomplete");
    key = `ach:${a.id}`; gold = a.gold; gems = a.gems; cosmetic = a.cosmetic ?? null;
  }

  const levelUps = await rpc<number>(admin, "claim_reward", { p_user: user.id, p_key: key, p_gold: gold, p_gems: gems, p_xp: 0, p_cosmetic: cosmetic });
  return { ok: true, gold, gems, cosmetic, levelUps };
}, { max: 20, windowSec: 60 });
