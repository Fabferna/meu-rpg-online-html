import "server-only";
import { dailyCounts } from "./dailyLimits";
import { normalizeLoadout, type SkillLoadout } from "./skills";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RACES, REGIONS, type Gender, type RaceId, type RegionId } from "./data";
import { xpForNextLevel } from "./rules";
import { deriveVitals, type CharacterRow } from "./player";
import type { BattleState } from "./combat";
import { COSMETIC_BY_ID } from "@/lib/shop/catalog";

export type InventoryEntry = {
  id: string;
  itemId: string;
  qty: number;
  equipped: boolean;
  slot: string | null;
  upgrade: number;
  name: string;
  kind: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  data: Record<string, number | string>;
};

export type PlayerState = {
  character: {
    name: string; race: RaceId; raceName: string; region: RegionId; regionName: string; gender: Gender; portrait: string;
    level: number; xp: number; xpToNext: number; attributePoints: number;
    attributes: { str: number; dex: number; con: number; intel: number; wis: number; cha: number };
    hp: number; maxHp: number; energy: number; maxEnergy: number; nextEnergyInSec: number;
    pvpRating: number; pvpWins: number; pvpLosses: number; pveWins: number;
    frame: string | null; title: string | null; skin: string | null; loadout: SkillLoadout; xpBoostUntil: string | null;
    storyChapter: number;
  };
  wallet: { gold: number; gems: number };
  quest: { id: string; questId: string; startedAt: string; endsAt: string; rewards: { xp: number; gold: number; item: string | null } } | null;
  battle: { id: string; state: BattleState } | null;
  inventory: InventoryEntry[];
  guild: { id: string; name: string; tag: string; level: number; role: "leader" | "officer" | "member" } | null;
  /** Pet ativo (o bônus dele soma aos atributos e ao combate). */
  pet: { petId: string; level: number } | null;
  daily: { hunts: number; quests: number; huntRefills: number; huntLimit: number; questRefills: number; questLimit: number };
  serverTime: string;
};

/** Estado completo do jogador, lido com o cliente do usuário (RLS). */
export async function getPlayerState(supabase: SupabaseClient, userId: string): Promise<PlayerState | null> {
  const [c, w, q, b, inv, gm, daily, pet] = await Promise.all([
    supabase.from("characters").select("*").eq("user_id", userId).maybeSingle<CharacterRow>(),
    supabase.from("wallets").select("gold, gems").eq("user_id", userId).maybeSingle(),
    supabase.from("quest_runs").select("*").eq("user_id", userId).eq("status", "running").maybeSingle(),
    supabase.from("battles").select("id, state").eq("user_id", userId).eq("status", "active").maybeSingle(),
    supabase.from("inventory").select("id, item_id, qty, equipped, slot, upgrade, items(name, kind, rarity, data)").eq("user_id", userId).order("acquired_at"),
    supabase.from("guild_members").select("role, guilds(id, name, tag, level)").eq("user_id", userId).maybeSingle(),
    dailyCounts(supabase, userId),
    supabase.from("owned_pets").select("pet_id, level").eq("user_id", userId).eq("active", true).maybeSingle(),
  ]);
  for (const r of [c, w, q, b, inv]) if (r.error) throw r.error;
  const row = c.data;
  if (!row) return null;

  const v = deriveVitals(row);
  const race = row.race as RaceId;
  const gender = row.gender as Gender;

  return {
    character: {
      name: row.name, race, raceName: RACES[race].name, region: row.region as RegionId,
      regionName: REGIONS[row.region as RegionId].name, gender, portrait: (row.equipped_skin && COSMETIC_BY_ID[row.equipped_skin]?.image) || RACES[race].portraits[gender],
      level: row.level, xp: Number(row.xp), xpToNext: xpForNextLevel(row.level), attributePoints: row.attribute_points,
      attributes: v.attributes, hp: v.hp, maxHp: v.maxHp, energy: v.energy, maxEnergy: v.maxEnergy, nextEnergyInSec: v.nextEnergyInSec,
      pvpRating: row.pvp_rating, pvpWins: row.pvp_wins, pvpLosses: row.pvp_losses, pveWins: row.pve_wins,
      frame: row.equipped_frame, title: row.equipped_title ? COSMETIC_BY_ID[row.equipped_title]?.name ?? null : null,
      loadout: normalizeLoadout(race, row.skills, row.level), skin: row.equipped_skin, xpBoostUntil: row.xp_boost_until, storyChapter: row.story_chapter ?? 0,
    },
    wallet: { gold: Number(w.data?.gold ?? 0), gems: Number(w.data?.gems ?? 0) },
    quest: q.data
      ? { id: q.data.id, questId: q.data.quest_id, startedAt: q.data.started_at, endsAt: q.data.ends_at, rewards: q.data.rewards }
      : null,
    battle: b.data ? { id: b.data.id, state: b.data.state as BattleState } : null,
    inventory: ((inv.data ?? []) as unknown as {
      id: string; item_id: string; qty: number; equipped: boolean; slot: string | null; upgrade: number;
      items: { name: string; kind: string; rarity: InventoryEntry["rarity"]; data: InventoryEntry["data"] };
    }[]).map((i) => ({ id: i.id, itemId: i.item_id, qty: i.qty, equipped: i.equipped, slot: i.slot, upgrade: i.upgrade ?? 0, ...i.items })),
    guild: gm.data?.guilds
      ? { ...(gm.data.guilds as unknown as { id: string; name: string; tag: string; level: number }), role: gm.data.role as "leader" | "officer" | "member" }
      : null,
    daily,
    pet: pet.data ? { petId: pet.data.pet_id as string, level: Number(pet.data.level) } : null,
    serverTime: new Date().toISOString(),
  };
}
