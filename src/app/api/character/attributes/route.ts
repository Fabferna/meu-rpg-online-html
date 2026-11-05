import { z } from "zod";
import { action, rpc } from "@/lib/api";

const n = z.number().int().min(0).max(300);
const Schema = z.object({ str: n, dex: n, con: n, intel: n, wis: n, cha: n }).strict();

export const POST = action("attributes", Schema, async ({ user, body, admin }) => {
  await rpc(admin, "spend_attribute_points", {
    p_user: user.id, p_str: body.str, p_dex: body.dex, p_con: body.con, p_intel: body.intel, p_wis: body.wis, p_cha: body.cha,
  });
  return { ok: true };
});
