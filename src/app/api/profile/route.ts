import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/security/http";
import { HERO_COLS, publicHero, type HeroRow } from "@/lib/game/publicHero";

export const dynamic = "force-dynamic";

// GET /api/profile?name=X → perfil público de um herói (nunca expõe user_id, e-mail, ouro ou gemas).
export async function GET(request: Request) {
  const { user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const name = new URL(request.url).searchParams.get("name") ?? "";
  if (!/^[A-Za-zÀ-ÿ0-9_]{3,16}$/.test(name)) return jsonError(400, "invalid_input");
  const admin = createAdminClient();
  const { data: c } = await admin.from("characters").select(`${HERO_COLS}, pvp_rating, pvp_wins, pvp_losses, pve_wins, story_chapter, bosses_slain, quests_done`).eq("name", name).maybeSingle();
  if (!c) return jsonError(404, "unknown_player");
  const id = (c as HeroRow).user_id;
  const [gear, pet, gm, fr] = await Promise.all([
    admin.from("inventory").select("item_id, slot, upgrade").eq("user_id", id).eq("equipped", true),
    admin.from("owned_pets").select("pet_id, level").eq("user_id", id).eq("active", true).maybeSingle(),
    admin.from("guild_members").select("role, guilds(name, tag)").eq("user_id", id).maybeSingle(),
    admin.from("friendships").select("status, requested_by").eq("user_a", id < user.id ? id : user.id).eq("user_b", id < user.id ? user.id : id).maybeSingle(),
  ]);
  const g = gm.data?.guilds as unknown as { name: string; tag: string } | null;
  return NextResponse.json({
    ...publicHero(c as HeroRow),
    pvpRating: c.pvp_rating, pvpWins: c.pvp_wins, pvpLosses: c.pvp_losses, pveWins: c.pve_wins,
    storyChapter: c.story_chapter ?? 0, bossesSlain: c.bosses_slain ?? 0, questsDone: c.quests_done ?? 0,
    gear: gear.data ?? [], pet: pet.data ?? null, guild: g ? { ...g, role: gm.data?.role } : null,
    me: id === user.id,
    friend: fr.data ? (fr.data.status === "accepted" ? "friends" : fr.data.requested_by === user.id ? "sent" : "received") : "none",
  }, { headers: { "Cache-Control": "no-store" } });
}
