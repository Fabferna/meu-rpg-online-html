import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Attributes, RaceId } from "./data";
import { currentEnergy, currentHp, maxEnergy, maxHp } from "./rules";
import { playerCombatant, type ItemBonus } from "./combat";
import { ITEM_BY_ID, itemStatsFor, upgradedStats } from "./items";
import { petBonus } from "./pets";
import { heroStats, type Piece } from "./gear";

export type CharacterRow = {
  user_id: string; name: string; race: string; region: string; gender: string;
  level: number; xp: number; attribute_points: number;
  str: number; dex: number; con: number; intel: number; wis: number; cha: number;
  hp: number; hp_updated_at: string; energy: number; energy_updated_at: string;
  pvp_rating: number; pvp_wins: number; pvp_losses: number; pve_wins: number;
  equipped_frame: string | null; equipped_title: string | null; equipped_skin: string | null; xp_boost_until: string | null;
  story_chapter: number;
  skills?: unknown;
};

export type LoadedPlayer = {
  row: CharacterRow;
  attributes: Attributes;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  gear: ItemBonus[];
  /** Peças equipadas (do catálogo) com atributos finais: arma com tipo, peças com peso. */
  pieces: Piece[];
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
  const [{ data: row }, { data: gear }, { data: pet }] = await Promise.all([
    db.from("characters").select("*").eq("user_id", userId).maybeSingle<CharacterRow>(),
    db.from("inventory").select("item_id, upgrade, items(data)").eq("user_id", userId).eq("equipped", true),
    db.from("owned_pets").select("pet_id, level").eq("user_id", userId).eq("active", true).maybeSingle(),
  ]);
  if (!row) return null;
  const v = deriveVitals(row);
  const pieces: Piece[] = ((gear ?? []) as unknown as { item_id: string; upgrade: number; items: { data: Record<string, number | string> } }[])
    .map((g) => {
      const def = ITEM_BY_ID[g.item_id];
      const stats = itemStatsFor(def, upgradedStats(g.items.data as Record<string, number>, g.upgrade ?? 0), row.race) as Record<string, number>;
      return { item: { slot: def?.slot ?? String(g.items.data.slot ?? ""), rarity: def?.rarity ?? "common", weapon: def?.weapon, weight: def?.weight }, stats };
    });
  return {
    row,
    attributes: v.attributes,
    hp: v.hp,
    maxHp: v.maxHp,
    energy: v.energy,
    maxEnergy: v.maxEnergy,
    gear: pieces.map((x) => x.stats as ItemBonus).concat(pet ? [petBonus(pet.pet_id, pet.level) as ItemBonus] : []),
    pieces,
  };
}

/** Herói pronto para lutar (arma escala com atributo; peças com peso dão bônus por raça). */
export function heroCombatant(p: LoadedPlayer, hp: number, maxHp: number) {
  return playerCombatant(p.row.name, p.attributes, p.row.level, hp, maxHp, p.gear, p.row.race as RaceId, p.pieces);
}

/**
 * Vida no início de uma luta: peças pesadas (anão/gronar) dão vida extra SÓ em combate.
 * Ao terminar, o banco limita a vida ao máximo normal (set_hp), então o extra é o primeiro a ir embora.
 */
export function battleVitals(p: LoadedPlayer) {
  const bonus = Math.round(p.maxHp * heroStats(p.attributes, p.row.level, p.gear, p.row.race as RaceId, p.pieces).hpPct);
  return { hp: p.hp + bonus, maxHp: p.maxHp + bonus };
}
