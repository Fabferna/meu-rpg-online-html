import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RACES, REGIONS, type Gender, type RaceId, type RegionId } from "./data";
import { currentEnergy, maxEnergy, maxHp, xpForNextLevel } from "./rules";

export type PlayerState = {
  character: {
    name: string;
    race: RaceId;
    raceName: string;
    region: RegionId;
    regionName: string;
    gender: Gender;
    portrait: string;
    level: number;
    xp: number;
    xpToNext: number;
    attributePoints: number;
    attributes: { str: number; dex: number; con: number; intel: number; wis: number; cha: number };
    hp: number;
    maxHp: number;
    energy: number;
    maxEnergy: number;
    nextEnergyInSec: number;
  };
  wallet: { gold: number; gems: number };
  serverTime: string;
};

/**
 * Lê o estado do jogador. Usa o cliente com a sessão do usuário, então
 * o RLS garante que só os próprios dados são retornados.
 */
export async function getPlayerState(supabase: SupabaseClient, userId: string): Promise<PlayerState | null> {
  const [{ data: c, error: ce }, { data: w, error: we }] = await Promise.all([
    supabase.from("characters").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("wallets").select("gold, gems").eq("user_id", userId).maybeSingle(),
  ]);
  if (ce) throw ce;
  if (we) throw we;
  if (!c) return null;

  const attributes = { str: c.str, dex: c.dex, con: c.con, intel: c.intel, wis: c.wis, cha: c.cha };
  const now = new Date();
  const mEnergy = maxEnergy(attributes, c.level);
  const e = currentEnergy(c.energy, new Date(c.energy_updated_at), mEnergy, now);
  const race = c.race as RaceId;
  const gender = c.gender as Gender;

  return {
    character: {
      name: c.name,
      race,
      raceName: RACES[race].name,
      region: c.region,
      regionName: REGIONS[c.region as RegionId].name,
      gender,
      portrait: RACES[race].portraits[gender],
      level: c.level,
      xp: Number(c.xp),
      xpToNext: xpForNextLevel(c.level),
      attributePoints: c.attribute_points,
      attributes,
      hp: Math.min(c.hp, maxHp(attributes, c.level)),
      maxHp: maxHp(attributes, c.level),
      energy: e.energy,
      maxEnergy: mEnergy,
      nextEnergyInSec: e.nextPointInSec,
    },
    wallet: { gold: Number(w?.gold ?? 0), gems: Number(w?.gems ?? 0) },
    serverTime: now.toISOString(),
  };
}
