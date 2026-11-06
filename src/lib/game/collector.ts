// Encomendas do Colecionador: 3 pedidos por dia de itens que caem na Caçada.
// Entregar CONSOME os itens (tira itens da economia) e paga ouro, XP e, às vezes, gemas.
// Regras puras e determinísticas: o mesmo dia (UTC) + faixa de nível dão as mesmas encomendas,
// então servidor e tela calculam igual sem gravar nada. O servidor revalida tudo antes de pagar.
import { ENEMIES } from "./enemies";
import { ITEM_BY_ID, type ItemDef } from "./items";
import { gearPool, POTION_ID } from "./loot";
import { xpForNextLevel, xpRate } from "./rules";

type Rarity = ItemDef["rarity"];
export type Order = {
  idx: number;
  /** "item" = um item específico; "rarity" = qualquer equipamento daquela raridade. */
  kind: "item" | "rarity";
  item?: string;
  rarity?: Rarity;
  qty: number;
  gold: number;
  gems: number;
  xp: number;
};

/** Faixa de nível (as encomendas mudam a cada 5 níveis, não a cada nível). */
export const collectorBand = (level: number) => Math.max(1, Math.floor(level / 5) * 5);

/** Número pseudoaleatório estável a partir de um texto (FNV-1a). */
function seed(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Equipamentos comuns/raros que caem de inimigos da faixa (dá para conseguir caçando). */
function huntableGear(band: number) {
  const ids = new Set<string>();
  for (const e of ENEMIES) if (!e.story && e.minLevel <= band + 4 && e.minLevel >= band - 8)
    for (const i of gearPool(e)) if (i.rarity === "common" || i.rarity === "rare") ids.add(i.id);
  return [...ids].sort();
}

/** XP de cada encomenda: fração do XP do próximo nível (com o multiplicador global). */
const xpPct = (level: number, pct: number) => xpRate(xpForNextLevel(level) * pct);

export function collectorOrders(day: string, level: number): Order[] {
  const band = collectorBand(level);
  const s = seed(`${day}:${band}`);
  const out: Order[] = [];
  // 1) Suprimentos: poções.
  const pq = 3 + (s % 3);
  out.push({ idx: 0, kind: "item", item: POTION_ID, qty: pq, gold: 15 * pq, gems: 0, xp: xpPct(level, 0.01) });
  // 2) Um equipamento específico da faixa (paga o dobro do preço de venda).
  const pool = huntableGear(band);
  const item = pool.length ? ITEM_BY_ID[pool[(s >>> 3) % pool.length]] : ITEM_BY_ID.capuz_viajante;
  out.push({ idx: 1, kind: "item", item: item.id, qty: 1, gold: item.sell * 2, gems: 0, xp: xpPct(level, 0.015) });
  // 3) Colecionador raro: N equipamentos de uma raridade (qualquer espaço).
  const rare = band >= 10;
  out.push({ idx: 2, kind: "rarity", rarity: rare ? "rare" : "common", qty: rare ? 2 : 3, gold: 100 + 15 * band, gems: rare ? 3 : 1, xp: xpPct(level, 0.02) });
  return out;
}

/** Este item serve para a encomenda? */
export function orderAccepts(o: Order, itemId: string) {
  const d = ITEM_BY_ID[itemId];
  if (!d) return false;
  return o.kind === "item" ? d.id === o.item : !!d.slot && d.rarity === o.rarity;
}

export const collectorKey = (day: string, idx: number) => `collector:${day}:${idx}`;
