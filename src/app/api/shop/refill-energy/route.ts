import { z } from "zod";
import { action, rpc } from "@/lib/api";

export const POST = action("refill", z.object({}).strict(), async ({ user, admin }) =>
  rpc(admin, "refill_energy", { p_user: user.id }), { max: 10, windowSec: 60 });
