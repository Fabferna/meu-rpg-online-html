import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/security/http";
import { RACES, type Gender, type RaceId } from "@/lib/game/data";
import { COSMETIC_BY_ID } from "@/lib/shop/catalog";
import { CHAR_SLOT_PRICE, FREE_CHAR_SLOTS, MAX_CHAR_SLOTS } from "@/lib/game/rules";

export const dynamic = "force-dynamic";

type Row = { name: string; race: string; gender: string; level: number; equipped_skin: string | null };
const view = (c: Row) => ({
  name: c.name, race: c.race, raceName: RACES[c.race as RaceId]?.name ?? c.race, level: c.level,
  portrait: (c.equipped_skin && COSMETIC_BY_ID[c.equipped_skin]?.image) || RACES[c.race as RaceId]?.portraits[c.gender as Gender],
});

// GET: herói ativo + guardados + espaços.
export async function GET() {
  const { user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const admin = createAdminClient();
  const [a, s, p] = await Promise.all([
    admin.from("characters").select("name, race, gender, level, equipped_skin").eq("user_id", user.id).maybeSingle(),
    admin.from("character_stash").select("id, data").eq("user_id", user.id).order("stashed_at"),
    admin.from("profiles").select("char_slots").eq("id", user.id).maybeSingle(),
  ]);
  return NextResponse.json({
    active: a.data ? view(a.data as Row) : null,
    stashed: (s.data ?? []).map((r) => ({ id: r.id, ...view(r.data as Row) })),
    slots: p.data?.char_slots ?? FREE_CHAR_SLOTS, maxSlots: MAX_CHAR_SLOTS, slotPrice: CHAR_SLOT_PRICE,
  }, { headers: { "Cache-Control": "no-store" } });
}
