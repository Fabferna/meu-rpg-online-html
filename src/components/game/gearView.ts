"use client";
// Exibição dos equipamentos: dano efetivo para o herói e comparação com o que está equipado.
// Só PREVISÃO na tela — o servidor recalcula tudo no combate (player.ts → heroStats).
import type { PlayerState, InventoryEntry } from "@/lib/game/state";
import { ITEM_BY_ID, itemStatsFor, upgradedStats, type ItemDef } from "@/lib/game/items";
import { heroStats, weaponDamage, type Piece, type WeaponInfo } from "@/lib/game/gear";
import { petBonus } from "@/lib/game/pets";
import { setBonuses } from "@/lib/game/sets";
import { talentMods } from "@/lib/game/talents";
import { withBlessing } from "@/lib/game/encounters";

type Ch = PlayerState["character"];

const pieceOf = (def: ItemDef | undefined, data: Record<string, unknown>, upgrade: number, race: string): Piece => ({
  item: { id: def?.id, slot: def?.slot ?? String(data.slot ?? ""), rarity: def?.rarity ?? "common", weapon: def?.weapon, weight: def?.weight },
  stats: itemStatsFor(def, upgradedStats(data as Record<string, number>, upgrade), race) as Record<string, number>,
});

/** Peças equipadas agora. */
export function equippedPieces(inv: InventoryEntry[], race: string) {
  return inv.filter((i) => i.equipped && i.slot).map((i) => ({ slot: i.slot!, entry: i, piece: pieceOf(ITEM_BY_ID[i.itemId], i.data, i.upgrade, race) }));
}

/** Bônus do pet ativo (mesma conta do servidor em loadPlayer). */
export const petStats = (state: PlayerState) => (state.pet ? (petBonus(state.pet.petId, state.pet.level) as Record<string, number>) : {});

const summary = (ch: Ch, pieces: Piece[], pet: Record<string, number> = {}) => {
  const h = heroStats(ch.attributes, ch.level, [...pieces.map((p) => p.stats), ...setStats(pieces), pet], ch.race, pieces, talentMods(ch.talents ?? {}));
  return {
    h,
    atk: Math.round((h.atk[0] + h.atk[1]) / 2),
    magic: Math.round((h.magic[0] + h.magic[1]) / 2),
    def: h.def,
    dodge: Math.round(h.dodge * 1000) / 10,
    crit: Math.round(h.crit * 1000) / 10,
    hp: Math.round(h.hpPct * 100),
  };
};

export type Delta = { key: string; label: string; from: number; to: number; unit?: string };
export type ItemView = { weapon: WeaponInfo | null; deltas: Delta[]; same: boolean };

/**
 * Como o herói fica com este item no lugar do atual (mesmo espaço).
 * `upgrade` = aprimoramento do item avaliado (0 para itens da loja/catálogo).
 */
export function viewItem(state: PlayerState, def: ItemDef, upgrade = 0, inventoryId?: string): ItemView {
  const ch = state.character;
  const eq = equippedPieces(state.inventory, ch.race);
  const cand = pieceOf(def, def.stats as Record<string, unknown>, upgrade, ch.race);
  const now = eq.map((e) => e.piece);
  const withIt = eq.filter((e) => e.slot !== def.slot).map((e) => e.piece).concat(cand);
  const pet = petStats(state);
  const a = summary(ch, now, pet), b = summary(ch, withIt, pet);
  const same = !!inventoryId && eq.some((e) => e.entry.id === inventoryId);
  const weapon = weaponDamage(cand.item, cand.stats, ch.race, attrsWith(ch, [...withIt, { item: { rarity: "common" }, stats: pet }]), ch.level);
  const deltas: Delta[] = [
    { key: "atk", label: "Ataque", from: a.atk, to: b.atk },
    { key: "magic", label: "Magia", from: a.magic, to: b.magic },
    { key: "def", label: "Defesa", from: a.def, to: b.def },
    { key: "dodge", label: "Esquiva", from: a.dodge, to: b.dodge, unit: "%" },
    { key: "crit", label: "Crítico", from: a.crit, to: b.crit, unit: "%" },
    { key: "hp", label: "Vida em combate", from: a.hp, to: b.hp, unit: "%" },
  ].filter((d) => d.from !== d.to);
  return { weapon, deltas, same };
}

/** Bônus de conjunto das peças (mesma conta do servidor em loadPlayer). */
export const setStats = (pieces: Piece[]) => setBonuses(pieces.map((p) => p.item.id ?? "")) as Record<string, number>[];

/** Atributos do herói com os bônus das peças (para a escala da arma). */
function attrsWith(ch: Ch, pieces: Piece[]) {
  const a = { ...ch.attributes };
  for (const s of [...pieces.map((p) => p.stats), ...setStats(pieces)]) for (const k of ["str", "dex", "con", "intel"] as const) a[k] += s[k] ?? 0;
  return a;
}

/**
 * Status gerais do herói (quadro "Status de combate" da aba Herói): valor com tudo equipado e
 * quanto disso vem de equipamentos + conjuntos + pet. Mesma fórmula do servidor (heroStats / battleVitals).
 */
export function combatSummary(state: PlayerState) {
  const ch = state.character;
  const pieces = equippedPieces(state.inventory, ch.race).map((e) => e.piece);
  const extra = [...pieces.map((p) => p.stats), ...setStats(pieces), petStats(state)];
  // Três camadas: só atributos (bare) → + equipamentos/conjuntos/pet (gear) → + talentos e Bênção (full).
  const blessed = !!state.daily.blessedUntil && Date.parse(state.daily.blessedUntil) > Date.now();
  const full = heroStats(ch.attributes, ch.level, extra, ch.race, pieces, withBlessing(talentMods(ch.talents ?? {}), blessed));
  const gear = heroStats(ch.attributes, ch.level, extra, ch.race, pieces);
  const bare = heroStats(ch.attributes, ch.level, [], ch.race, []);
  const pct = (x: number) => Math.round(x * 1000) / 10;
  const dodge = (h: typeof full) => pct(Math.min(0.3, Math.max(0.02, 0.04 + h.dodge)));
  const crit = (h: typeof full) => pct(Math.min(0.4, Math.max(0.05, 0.05 + h.agility * 0.004 + h.crit)));
  const avg = (r: [number, number]) => Math.round((r[0] + r[1]) / 2);
  const hpGear = Math.round(ch.maxHp * gear.hpPct), hpAll = Math.round(ch.maxHp * full.hpPct);
  const d1 = (x: number) => Math.round(x * 10) / 10;
  return {
    hp: { value: ch.maxHp + hpAll, bonus: hpGear, talent: hpAll - hpGear },
    energy: { value: ch.maxEnergy, bonus: 0, talent: 0 },
    atk: { range: full.atk, value: avg(full.atk), bonus: avg(gear.atk) - avg(bare.atk), talent: avg(full.atk) - avg(gear.atk) },
    magic: { range: full.magic, value: avg(full.magic), bonus: avg(gear.magic) - avg(bare.magic), talent: avg(full.magic) - avg(gear.magic) },
    def: { value: full.def, bonus: gear.def - bare.def, talent: full.def - gear.def },
    dodge: { value: dodge(full), bonus: d1(dodge(gear) - dodge(bare)), talent: d1(dodge(full) - dodge(gear)) },
    crit: { value: crit(full), bonus: d1(crit(gear) - crit(bare)), talent: d1(crit(full) - crit(gear)) },
    weapon: full.weapon,
    blessed,
  };
}
