import { z } from "zod";
import { action, rpc } from "@/lib/api";
import { BLESSING } from "@/lib/game/encounters";
import { roll } from "@/lib/game/rng";

// Recompensa diária + sorteio da Bênção dos Ancestrais (o número aleatório é gerado aqui, RNG criptográfico).
export const POST = action("daily-login", z.object({}).strict(), async ({ user, admin }) => {
  const res = await rpc<Record<string, unknown>>(admin, "claim_daily_login", { p_user: user.id });
  let blessing: { won: boolean; chance_ppm: number; until: number | null; points: number } | null = null;
  try {
    blessing = await rpc(admin, "bless_roll", {
      p_user: user.id, p_roll: roll(0, 999_999),
      p_base_ppm: Math.round(BLESSING.base * 1e6), p_per_point_ppm: Math.round(BLESSING.perPoint * 1e6), p_max_ppm: Math.round(BLESSING.max * 1e6),
      p_minutes: BLESSING.minutes,
    });
  } catch { /* sorteio já feito hoje: só a recompensa vale */ }
  return { ...res, blessing };
}, { max: 5, windowSec: 60 });
