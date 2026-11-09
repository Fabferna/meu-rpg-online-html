import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { cleanMessage } from "@/lib/security/chatFilter";
import { GUILD } from "@/lib/game/guilds";

const Schema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create"),
    name: z.string().trim().min(3).max(20).regex(/^[A-Za-zÀ-ÿ0-9 _]+$/),
    tag: z.string().trim().regex(/^[A-Za-z0-9]{2,4}$/),
    description: z.string().max(200).default(""),
    privacy: z.enum(["open", "private"]).default("open"),
  }).strict(),
  z.object({ type: z.literal("join"), guildId: z.uuid() }).strict(),
  z.object({ type: z.literal("leave") }).strict(),
  z.object({ type: z.literal("request"), guildId: z.uuid(), message: z.string().trim().max(200).default("") }).strict(),
  z.object({ type: z.literal("cancel_request"), guildId: z.uuid() }).strict(),
  z.object({ type: z.literal("decide"), target: z.string().regex(/^[A-Za-zÀ-ÿ0-9_]{3,16}$/), accept: z.boolean() }).strict(),
  z.object({ type: z.literal("privacy"), privacy: z.enum(["open", "private"]) }).strict(),
  z.object({ type: z.literal("manage"), target: z.string().regex(/^[A-Za-zÀ-ÿ0-9_]{3,16}$/), op: z.enum(["kick", "promote", "demote", "transfer"]) }).strict(),
  z.object({ type: z.literal("donate"), amount: z.number().int().min(10).max(1_000_000) }).strict(),
]);

export const POST = action("guild", Schema, async ({ user, body, admin }) => {
  switch (body.type) {
    case "create": {
      const name = cleanMessage(body.name);
      if (!name.ok || name.text !== body.name) throw new HttpError(400, "invalid_name");
      const desc = body.description ? cleanMessage(body.description) : { ok: true as const, text: "" };
      return { id: await rpc(admin, "create_guild", { p_user: user.id, p_name: body.name, p_tag: body.tag.toUpperCase(), p_description: desc.ok ? desc.text : "", p_privacy: body.privacy }) };
    }
    case "join":
      return rpc(admin, "join_guild", { p_user: user.id, p_guild: body.guildId });
    case "request": {
      const msg = body.message ? cleanMessage(body.message) : { ok: true as const, text: "" };
      if (!msg.ok) throw new HttpError(400, "invalid_message");
      return rpc(admin, "guild_request", { p_user: user.id, p_guild: body.guildId, p_message: msg.text, p_limit: GUILD.maxRequests });
    }
    case "cancel_request":
      return rpc(admin, "guild_request_cancel", { p_user: user.id, p_guild: body.guildId });
    case "decide": {
      const { data: t } = await admin.from("characters").select("user_id").eq("name", body.target).maybeSingle();
      if (!t) throw new HttpError(404, "no_request");
      return rpc(admin, "guild_request_decide", { p_actor: user.id, p_target: t.user_id, p_accept: body.accept });
    }
    case "privacy":
      return rpc(admin, "guild_set_privacy", { p_actor: user.id, p_privacy: body.privacy });
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
