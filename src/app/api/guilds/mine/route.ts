import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/security/http";
import { RACES, type Gender, type RaceId } from "@/lib/game/data";
import { COSMETIC_BY_ID } from "@/lib/shop/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const admin = createAdminClient();
  const { data: me } = await admin.from("guild_members").select("guild_id, role").eq("user_id", user.id).maybeSingle();
  if (!me) return NextResponse.json({ guild: null }, { headers: { "Cache-Control": "no-store" } });

  const [{ data: g }, { data: members }] = await Promise.all([
    admin.from("guilds").select("*").eq("id", me.guild_id).single(),
    admin.from("guild_members").select("user_id, role, contributed, joined_at").eq("guild_id", me.guild_id),
  ]);
  const ids = (members ?? []).map((m) => m.user_id);
  const { data: chars } = await admin.from("characters").select("user_id, name, level, race, gender, equipped_frame, equipped_skin, updated_at").in("user_id", ids);
  const byId = new Map((chars ?? []).map((c) => [c.user_id, c]));
  const order = { leader: 0, officer: 1, member: 2 } as const;

  return NextResponse.json({
    guild: {
      id: g.id, name: g.name, tag: g.tag, description: g.description, level: g.level, xp: Number(g.xp),
      treasury: Number(g.treasury), limit: g.member_limit, myRole: me.role,
      members: (members ?? [])
        .map((m) => {
          const c = byId.get(m.user_id);
          return {
            name: c?.name ?? "?", level: c?.level ?? 1, role: m.role as keyof typeof order, contributed: Number(m.contributed), me: m.user_id === user.id,
            portrait: (c?.equipped_skin && COSMETIC_BY_ID[c.equipped_skin]?.image) || (c ? RACES[c.race as RaceId].portraits[c.gender as Gender] : ""),
            frame: c?.equipped_frame ?? null,
            active: c ? Date.now() - new Date(c.updated_at).getTime() < 24 * 3600_000 : false,
          };
        })
        .sort((a, b) => order[a.role] - order[b.role] || b.contributed - a.contributed),
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
