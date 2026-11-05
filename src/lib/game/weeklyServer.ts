import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RACES, type Gender, type RaceId } from "./data";
import { COSMETIC_BY_ID } from "@/lib/shop/catalog";

export type WeeklyRow = { pos: number; userId: string; name: string; level: number; raceName: string; portrait: string; frame: string | null; title: string | null; score: number };

/** Classificação completa de uma semana (usa a service_role). */
export async function weeklyBoard(admin: SupabaseClient, start: string): Promise<WeeklyRow[]> {
  const { data: scores, error } = await admin.rpc("weekly_scores", { p_start: start });
  if (error) throw error;
  const list = ((scores ?? []) as { user_id: string; score: number }[]).filter((s) => Number(s.score) > 0);
  if (!list.length) return [];
  const { data: chars } = await admin
    .from("characters")
    .select("user_id, name, level, race, gender, equipped_frame, equipped_title, equipped_skin, created_at")
    .in("user_id", list.map((s) => s.user_id));
  const byId = new Map((chars ?? []).map((c) => [c.user_id, c]));
  return list
    .filter((s) => byId.has(s.user_id))
    // Desempate: mais pontos, depois quem chegou primeiro ao jogo.
    .sort((a, b) => Number(b.score) - Number(a.score) || String(byId.get(a.user_id)!.created_at).localeCompare(String(byId.get(b.user_id)!.created_at)))
    .map((s, i) => {
      const c = byId.get(s.user_id)!;
      return {
        pos: i + 1, userId: s.user_id, name: c.name, level: c.level, score: Number(s.score),
        raceName: RACES[c.race as RaceId]?.name ?? c.race,
        portrait: (c.equipped_skin && COSMETIC_BY_ID[c.equipped_skin]?.image) || RACES[c.race as RaceId].portraits[c.gender as Gender],
        frame: c.equipped_frame, title: c.equipped_title ? COSMETIC_BY_ID[c.equipped_title]?.name ?? null : null,
      };
    });
}
