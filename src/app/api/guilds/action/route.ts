import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { cleanMessage } from "@/lib/security/chatFilter";

const Schema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create"),
    name: z.string().trim().min(3).max(20).regex(/^[A-Za-zÀ-ÿ0-9 _]+$/),
    tag: z.string().trim().regex(/^[A-Za-z0-9]{2,4}$/),
    description: z.string().max(200).default(""),
  }).strict(),
  z.object({ type: z.literal("join"), guildId: z.uuid() }).strict(),
  z.object({ type: z.literal("leave") }).strict(),
  z.object({ type: z.literal("manage"), target: z.string().regex(/^[A-Za-zÀ-ÿ0-9_]{3,16}$/), op: z.enum(["kick", "promote", "demote", "transfer"]) }).strict(),
  z.object({ type: z.literal("donate"), amount: z.number().int().min(10).max(1_000_000) }).strict(),
]);

export const POST = action("guild", Schema, async ({ user, body, admin }) => {
  switch (body.type) {
    case "create": {
      const name = cleanMessage(body.name);
      if (!name.ok || name.text !== body.name) throw new HttpError(400, "invalid_name");
      const desc = body.description ? cleanMessage(body.description) : { ok: true as const, text: "" };
      return { id: await rpc(admin, "create_guild", { p_user: user.id, p_name: body.name, p_tag: body.tag.toUpperCase(), p_description: desc.ok ? desc.text : "" }) };
    }
    case "join":
      return rpc(admin, "join_guild", { p_user: user.id, p_guild: body.guildId });
    case "leave":
      return rpc(admin, "leave_guild", { p_user: user.id });
    case "manage": {
      const { data: t } = await admin.from("characters").select("user_id").eq("name", body.target).maybeSingle();
      if (!t) throw new HttpError(404, "not_owner");
      return rpc(admin, "guild_manage", { p_actor: user.id, p_target: t.user_id, p_action: body.op });
    }
    case "donate":
      return rpc(admin, "guild_donate", { p_user: user.id, p_amount: body.amount });
  }
}, { max: 20, windowSec: 60 });
