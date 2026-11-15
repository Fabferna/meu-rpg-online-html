import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { rpc } from "@/lib/api";
import { chance, roll } from "./rng";
import { battleVitals, heroCombatant, loadPlayer } from "./player";
import { ITEM_BY_ID, sellPrice } from "./items";
import {
  EXPEDITION_BY_ID, EXPEDITION_RELICS, REPORT_LINES, expeditionOdds, expeditionPayout, gearPool, guildXpFor, heroPower, isStrategy, lootMult, partyPower,
  type Expedition, type Outcome, type Strategy,
} from "./expeditions";
import type { RaceId } from "./data";

type Admin = ReturnType<typeof createAdminClient>;

export type ExpeditionRow = {
  id: string; guild_id: string; expedition: string; strategy: string; created_by: string | null; cost: number; minutes: number; max_party: number;
  status: "active" | "done" | "cancelled"; created_at: string; departs_at: string; ends_at: string; outcome: Outcome | null; power: number | null; report: string[]; settled_at: string | null;
};
export type ExpeditionMemberRow = {
  expedition_id: string; user_id: string; name: string; race: string; level: number; power: number; joined_at: string; claimed_at: string | null;
  reward: { xp: number; gold: number; items: { item: string; qty: number; sold?: number }[]; levelUps: number } | null;
};

/** Poder de expedição do herói ativo do jogador (vida cheia; com equipamentos, pet, talentos e bônus da guilda). */
export async function myExpeditionPower(admin: Admin, userId: string) {
  const p = await loadPlayer(admin, userId);
  if (!p) return null;
  const v = battleVitals({ ...p, hp: p.maxHp });
  return { power: heroPower(heroCombatant(p, v.hp, v.maxHp)), race: p.row.race, level: p.row.level, name: p.row.name };
}

const strategyOf = (s: string): Strategy => (isStrategy(s) ? s : "balanced");

/** Sorteia o resultado de uma expedição que já voltou e grava (o banco garante que só o primeiro pedido vale). */
export async function settleExpedition(admin: Admin, row: ExpeditionRow, members: ExpeditionMemberRow[]): Promise<Outcome | null> {
  const def = EXPEDITION_BY_ID[row.expedition];
  if (!def) return null;
  const strategy = strategyOf(row.strategy);
  const { total } = partyPower(def, members);
  const odds = expeditionOdds(def, total, strategy);
  const outcome: Outcome = chance(odds.success) ? (chance(odds.triumph) ? "triumph" : "success") : "fail";
  const pool = [...REPORT_LINES[outcome]];
  const report: string[] = [];
  for (let i = 0; i < 2 && pool.length; i++) report.push(pool.splice(roll(0, pool.length - 1), 1)[0]);
  return rpc<Outcome>(admin, "guild_expedition_settle", { p_id: row.id, p_outcome: outcome, p_power: total, p_report: report, p_guild_xp: guildXpFor(def, outcome) });
}

/** Sorteia a recompensa de UM participante (ouro/XP fixos pelo resultado; itens pela sorte e pela raça). */
export function rollExpeditionReward(def: Expedition, outcome: Outcome, strategy: Strategy, race: string) {
  const pay = expeditionPayout(def, outcome, strategy);
  const k = lootMult(outcome, strategy);
  const items: { item: string; qty: number; gold: number }[] = [];
  if (k > 0) {
    const qty = roll(def.potions[0], def.potions[1]);
    if (qty > 0) items.push({ item: "pocao_vida", qty, gold: sellPrice(ITEM_BY_ID.pocao_vida, 0) * qty });
    if (def.chest && ITEM_BY_ID[def.chest.item] && chance(Math.min(0.9, def.chest.chance * k))) items.push({ item: def.chest.item, qty: 1, gold: ITEM_BY_ID[def.chest.item].sell });
    // No máximo UM equipamento por expedição: primeiro tenta a relíquia lendária, depois um item da raça.
    const relic = EXPEDITION_RELICS[race as RaceId];
    const gear = gearPool(def, race);
    if (def.relic && relic && ITEM_BY_ID[relic] && chance(Math.min(0.5, def.relic * k))) items.push({ item: relic, qty: 1, gold: ITEM_BY_ID[relic].sell });
    else if (gear.length && chance(Math.min(0.6, def.gear.chance * k))) { const g = gear[roll(0, gear.length - 1)]; items.push({ item: g.id, qty: 1, gold: g.sell }); }
  }
  return { ...pay, items };
}

export { strategyOf };
