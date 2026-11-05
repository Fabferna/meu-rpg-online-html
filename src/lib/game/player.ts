import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Attributes } from "./data";
import { currentEnergy, currentHp, maxEnergy, maxHp } from "./rules";
import type { ItemBonus } from "./combat";
import { upgradedStats } from "./items";

export type CharacterRow = {
  user_id: string; name: string; race: string; region: string; gender: string;
  level: number; xp: number; attribute_points: number;
  str: number; dex: number; con: number; intel: number; wis: number; cha: number;
  hp: number; hp_updated_at: string; energy: number; energy_updated_at: string;
  pvp_rating: number; pvp_wins: number; pvp_losses: number; pve_wins: number;
  equipped_frame: string | null; equipped_title: string | null; equipped_skin: string | null; xp_boost_until: string | null;
};

export type LoadedPlayer = {
  row: CharacterRow;
  attributes: Attributes;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  gear: ItemBonus[];
};

export function deriveVitals(row: CharacterRow, now = new Date()) {
  const attributes = { str: row.str, dex: row.dex, con: row.con, intel: row.intel, wis: row.wis, cha: row.cha };
  const mHp = maxHp(attributes, row.level);
  const mEn = maxEnergy(attributes, row.level);
  return {
    attributes,
    maxHp: mHp,
    maxEnergy: mEn,
    hp: currentHp(row.hp, new Date(row.hp_updated_at), mHp, now),
    ...(() => {
      const e = currentEnergy(row.energy, new Date(row.energy_updated_at), mEn, now);
      return { energy: e.energy, nextEnergyInSec: e.nextPointInSec };
    })(),
  };
}

/** Carrega personagem + bônus dos equipamentos. `db` pode ser admin ou cliente com RLS. */
export async function loadPlayer(db: SupabaseClient, userId: string): Promise<LoadedPlayer | null> {
  const [{ data: row }, { data: gear }] = await Promise.all([
    db.from("characters").select("*").eq("user_id", userId).maybeSingle<CharacterRow>(),
    db.from("inventory").select("upgrade, items(data)").eq("user_id", userId).eq("equipped", true),
  ]);
  if (!row) return null;
  const v = deriveVitals(row);
  return {
    row,
    attributes: v.attributes,
    hp: v.hp,
    maxHp: v.maxHp,
    energy: v.energy,
    maxEnergy: v.maxEnergy,
    gear: ((gear ?? []) as unknown as { upgrade: number; items: { data: ItemBonus } }[]).map((g) => upgradedStats(g.items.data as Record<string, number>, g.upgrade ?? 0) as ItemBonus),
  };
}
