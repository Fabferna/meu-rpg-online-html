import { z } from "zod";
import { action, rpc } from "@/lib/api";

export const POST = action("quest-claim", z.object({}).strict(), async ({ user, admin }) => {
  const rewards = await rpc(admin, "claim_quest", { p_user: user.id });
  return { ok: true, rewards };
});
