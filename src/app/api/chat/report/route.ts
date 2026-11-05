import { z } from "zod";
import { action, rpc } from "@/lib/api";

export const POST = action("chat-report", z.object({ messageId: z.number().int().positive(), reason: z.enum(["ofensa", "spam", "golpe", "outro"]) }).strict(),
  async ({ user, body, admin }) => ({ hidden: await rpc<boolean>(admin, "report_message", { p_user: user.id, p_message: body.messageId, p_reason: body.reason }) }),
  { max: 10, windowSec: 60 });
