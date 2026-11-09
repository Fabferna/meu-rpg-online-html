import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { jsonError } from "@/lib/security/http";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Lista de guildas (públicas dentro do jogo), com busca por nome ou tag.
export async function GET(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const q = (new URL(request.url).searchParams.get("q") ?? "").replace(/[%_,()]/g, "").slice(0, 20);
  let query = supabase.from("guilds").select("id, name, tag, description, level, member_limit, privacy, guild_members(count)").order("level", { ascending: false }).limit(30);
  if (q) query = query.or(`name.ilike.%${q}%,tag.ilike.%${q}%`);
  const [{ data, error }, { data: reqs }] = await Promise.all([
    query, createAdminClient().from("guild_requests").select("guild_id").eq("user_id", user.id),
  ]);
  const requested = new Set((reqs ?? []).map((r) => r.guild_id));
  if (error) return jsonError(500, "internal_error");
  const guilds = (data ?? []).map((g) => ({
    id: g.id, name: g.name, tag: g.tag, description: g.description, level: g.level, limit: g.member_limit,
    private: g.privacy === "private", requested: requested.has(g.id),
    members: (g.guild_members as unknown as { count: number }[])[0]?.count ?? 0,
  }));
  return NextResponse.json({ guilds }, { headers: { "Cache-Control": "no-store" } });
}
