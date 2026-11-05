import { z } from "zod";
import { action, rpc } from "@/lib/api";

export const POST = action("rush", z.object({}).strict(), async ({ user, admin }) => ({
  price: await rpc<number>(admin, "rush_quest", { p_user: user.id }),
}), { max: 10, windowSec: 60 });
