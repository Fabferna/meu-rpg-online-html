import { z } from "zod";
import { action, rpc } from "@/lib/api";

export const POST = action("daily-login", z.object({}).strict(), async ({ user, admin }) =>
  rpc(admin, "claim_daily_login", { p_user: user.id }), { max: 5, windowSec: 60 });
