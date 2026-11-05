import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { isAdmin } from "@/lib/admin";

const Schema = z.object({
  action: z.enum(["mute", "unmute", "ban", "unban", "hide", "restore", "dismiss"]),
  target: z.string().min(3).max(16).optional(),
  messageId: z.number().int().positive().optional(),
  minutes: z.number().int().min(1).max(60 * 24 * 30).default(60),
}).strict();

export const POST = action("admin", Schema, async ({ user, body, admin }) => {
  if (!(await isAdmin(user.id))) throw new HttpError(404, "not_found");
  let targetId: string | null = null;
  if (body.target) {
    const { data } = await admin.from("characters").select("user_id").ilike("name", body.target).maybeSingle();
    if (!data) throw new HttpError(404, "not_owner");
    targetId = data.user_id;
  }
  if (["mute", "unmute", "ban", "unban"].includes(body.action) && !targetId) throw new HttpError(400, "invalid_input");
  if (["hide", "restore", "dismiss"].includes(body.action) && !body.messageId) throw new HttpError(400, "invalid_input");
  await rpc(admin, "admin_moderate", { p_admin: user.id, p_target: targetId, p_action: body.action, p_minutes: body.minutes, p_message: body.messageId ?? null });
  return { ok: true };
});
