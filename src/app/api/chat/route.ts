import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { jsonError } from "@/lib/security/http";
import { action, HttpError, rpc } from "@/lib/api";
import { rateLimit } from "@/lib/security/rateLimit";
import { cleanMessage } from "@/lib/security/chatFilter";

export const dynamic = "force-dynamic";

// Últimas mensagens de um canal. O RLS garante que só membros leem o chat da guilda.
export async function GET(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const url = new URL(request.url);
  const channel = url.searchParams.get("channel") === "guild" ? "guild" : "global";
  const after = Number(url.searchParams.get("after") ?? 0) || 0;

  let q = supabase.from("chat_messages").select("id, channel, name, tag, title, frame, body, created_at, hidden").order("id", { ascending: false }).limit(50);
  if (channel === "global") q = q.eq("channel", "global");
  else q = q.like("channel", "guild:%"); // RLS filtra para a guilda do jogador
  if (after) q = q.gt("id", after);
  const { data, error } = await q;
  if (error) return jsonError(500, "internal_error");
  return NextResponse.json({ messages: (data ?? []).reverse() }, { headers: { "Cache-Control": "no-store" } });
}

const Schema = z.object({ channel: z.enum(["global", "guild"]), body: z.string().min(1).max(400) }).strict();

export const POST = action("chat", Schema, async ({ user, body, admin }) => {
  // Anti-flood: 5 mensagens a cada 10 segundos.
  if (!(await rateLimit(`chat-burst:${user.id}`, 5, 10))) throw new HttpError(429, "too_many_requests");
  const clean = cleanMessage(body.body);
  if (!clean.ok) throw new HttpError(400, clean.reason === "links" ? "chat_links" : "invalid_input");
  const id = await rpc<number>(admin, "post_chat", { p_user: user.id, p_channel: body.channel, p_body: clean.text });
  return { ok: true, id, body: clean.text };
}, { max: 40, windowSec: 60 });
