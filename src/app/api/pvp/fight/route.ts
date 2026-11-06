import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { battleVitals, heroCombatant, loadPlayer } from "@/lib/game/player";
import { PVP_ENERGY_COST } from "@/lib/game/rules";
import { rateLimit } from "@/lib/security/rateLimit";
import { eloDelta, simulateDuel } from "@/lib/game/combat";

export const POST = action(
  "pvp-fight",
  z.object({ opponent: z.string().regex(/^[A-Za-zÀ-ÿ0-9_]{3,16}$/) }).strict(),
  async ({ user, body, admin }) => {
    const { data: opp } = await admin.from("characters").select("user_id, level").eq("name", body.opponent).maybeSingle();
    if (!opp || opp.user_id === user.id) throw new HttpError(404, "unknown_opponent");

    const [me, them] = await Promise.all([loadPlayer(admin, user.id), loadPlayer(admin, opp.user_id)]);
    if (!me || !them) throw new HttpError(404, "unknown_opponent");
    if (Math.abs(me.row.level - them.row.level) > 5) throw new HttpError(403, "level_gap");

    // Máx. 3 ataques ao mesmo alvo por hora (anti "farm" de ranking).
    if (!(await rateLimit(`pvp-target:${user.id}:${opp.user_id}`, 3, 3600))) throw new HttpError(429, "target_cooldown");

    await rpc(admin, "spend_energy", { p_user: user.id, p_amount: PVP_ENERGY_COST });

    // PVP usa HP cheio dos dois lados (luta de arena).
    const va = battleVitals({ ...me, hp: me.maxHp }), vb = battleVitals({ ...them, hp: them.maxHp });
    const a = heroCombatant(me, va.hp, va.maxHp);
    const b = heroCombatant(them, vb.hp, vb.maxHp);
    const duel = simulateDuel(a, b);

    const [winner, loser] = duel.aWins ? [me, them] : [them, me];
    const delta = eloDelta(winner.row.pvp_rating, loser.row.pvp_rating);
    await rpc(admin, "apply_pvp_result", { p_winner: winner.row.user_id, p_loser: loser.row.user_id, p_delta: delta });

    const gold = duel.aWins ? 10 + me.row.level * 3 : 0;
    const xp = duel.aWins ? 20 + me.row.level * 4 : 5 + me.row.level;
    const { data: rec } = await admin
      .from("battles")
      .insert({
        user_id: user.id, kind: "pvp", status: duel.aWins ? "won" : "lost",
        state: { opponent: them.row.name, log: duel.log, hpA: duel.hpA, hpB: duel.hpB, maxA: a.maxHp, maxB: b.maxHp, delta },
      })
      .select("id").single();
    await rpc(admin, "record_event", { p_user: user.id, p_event: "pvp", p_amount: 1 });
    if (duel.aWins) await rpc(admin, "record_event", { p_user: user.id, p_event: "pvp_win", p_amount: 1 });
    const levelUps = await rpc<number>(admin, "grant_rewards", {
      p_user: user.id, p_xp: xp, p_gold: gold, p_item: null, p_reason: "pvp", p_ref: `pvp:${rec?.id}`,
    });

    return {
      won: duel.aWins, delta, rewards: { xp, gold, levelUps },
      me: { name: a.name, maxHp: a.maxHp, hp: duel.hpA }, them: { name: b.name, maxHp: b.maxHp, hp: duel.hpB },
      log: duel.log,
    };
  },
  { max: 20, windowSec: 60 },
);
