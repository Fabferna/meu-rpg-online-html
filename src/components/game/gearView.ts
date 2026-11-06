"use client";
// Exibição dos equipamentos: dano efetivo para o herói e comparação com o que está equipado.
// Só PREVISÃO na tela — o servidor recalcula tudo no combate (player.ts → heroStats).
import type { PlayerState, InventoryEntry } from "@/lib/game/state";
import { ITEM_BY_ID, itemStatsFor, upgradedStats, type ItemDef } from "@/lib/game/items";
import { heroStats, weaponDamage, type Piece, type WeaponInfo } from "@/lib/game/gear";

type Ch = PlayerState["character"];

const pieceOf = (def: ItemDef | undefined, data: Record<string, unknown>, upgrade: number, race: string): Piece => ({
  item: { slot: def?.slot ?? String(data.slot ?? ""), rarity: def?.rarity ?? "common", weapon: def?.weapon, weight: def?.weight },
  stats: itemStatsFor(def, upgradedStats(data as Record<string, number>, upgrade), race) as Record<string, number>,
});

/** Peças equipadas agora. */
export function equippedPieces(inv: InventoryEntry[], race: string) {
  return inv.filter((i) => i.equipped && i.slot).map((i) => ({ slot: i.slot!, entry: i, piece: pieceOf(ITEM_BY_ID[i.itemId], i.data, i.upgrade, race) }));
}

const summary = (ch: Ch, pieces: Piece[]) => {
  const h = heroStats(ch.attributes, ch.level, pieces.map((p) => p.stats), ch.race, pieces);
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
  const a = summary(ch, now), b = summary(ch, withIt);
  const same = !!inventoryId && eq.some((e) => e.entry.id === inventoryId);
  const weapon = weaponDamage(cand.item, cand.stats, ch.race, attrsWith(ch, withIt), ch.level);
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

/** Atributos do herói com os bônus das peças (para a escala da arma). */
function attrsWith(ch: Ch, pieces: Piece[]) {
  const a = { ...ch.attributes };
  for (const p of pieces) for (const k of ["str", "dex", "con", "intel"] as const) a[k] += p.stats[k] ?? 0;
  return a;
}
