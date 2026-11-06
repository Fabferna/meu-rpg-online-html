import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RACES, type Gender, type RaceId } from "./data";
import { COSMETIC_BY_ID } from "@/lib/shop/catalog";

export type HeroRow = { user_id: string; name: string; level: number; race: string; gender: string; equipped_frame: string | null; equipped_title: string | null; equipped_skin: string | null; updated_at: string };
export const HERO_COLS = "user_id, name, level, race, gender, equipped_frame, equipped_title, equipped_skin, updated_at";

/** Dados públicos de um herói (sem user_id). */
export const publicHero = (c: HeroRow) => ({
  name: c.name, level: c.level, raceName: RACES[c.race as RaceId]?.name ?? c.race,
  portrait: (c.equipped_skin && COSMETIC_BY_ID[c.equipped_skin]?.image) || RACES[c.race as RaceId]?.portraits[c.gender as Gender],
  frame: c.equipped_frame, title: c.equipped_title ? COSMETIC_BY_ID[c.equipped_title]?.name ?? null : null,
  online: Date.now() - new Date(c.updated_at).getTime() < 15 * 60_000,
});

export async function heroesByUser(admin: SupabaseClient, ids: string[]) {
  if (!ids.length) return new Map<string, HeroRow>();
  const { data } = await admin.from("characters").select(HERO_COLS).in("user_id", ids);
  return new Map(((data ?? []) as HeroRow[]).map((c) => [c.user_id, c]));
}
