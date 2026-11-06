import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/security/http";
import { action, HttpError, rpc } from "@/lib/api";
import { heroesByUser, publicHero } from "@/lib/game/publicHero";

export const dynamic = "force-dynamic";

// GET: amigos, pedidos recebidos e enviados. Cada amigo tem o canal da conversa privada.
export async function GET() {
  const { user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const admin = createAdminClient();
  const { data } = await admin.from("friendships").select("id, user_a, user_b, requested_by, status").or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
  const rows = data ?? [];
  const other = (r: (typeof rows)[number]) => (r.user_a === user.id ? r.user_b : r.user_a);
  const heroes = await heroesByUser(admin, rows.map(other));
  const view = (r: (typeof rows)[number]) => { const h = heroes.get(other(r)); return h ? { ...publicHero(h), channel: `dm:${r.id}` } : null; };
  const pick = (f: (r: (typeof rows)[number]) => boolean) => rows.filter(f).map(view).filter(Boolean);
  return NextResponse.json({
    friends: pick((r) => r.status === "accepted"),
    incoming: pick((r) => r.status === "pending" && r.requested_by !== user.id),
    outgoing: pick((r) => r.status === "pending" && r.requested_by === user.id),
  }, { headers: { "Cache-Control": "no-store" } });
}

const Name = z.string().regex(/^[A-Za-zÀ-ÿ0-9_]{3,16}$/);
const Schema = z.object({ op: z.enum(["add", "accept", "decline", "remove"]), name: Name }).strict();

export const POST = action("friends", Schema, async ({ user, body, admin }) => {
  const { data: t } = await admin.from("characters").select("user_id").eq("name", body.name).maybeSingle();
  if (!t) throw new HttpError(404, "unknown_player");
  if (body.op === "add") return { result: await rpc<string>(admin, "friend_request", { p_user: user.id, p_target: t.user_id }) };
  await rpc(admin, "friend_respond", { p_user: user.id, p_other: t.user_id, p_accept: body.op === "accept" });
  return { ok: true };
}, { max: 30, windowSec: 60 });
