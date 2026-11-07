// Quanto cada conjunto acrescenta ao herói: ataque, magia e defesa com as 3 peças, sem e com o bônus.
// Herói típico da raça mais indicada, no nível da peça mais alta do conjunto, com o resto do equipamento vazio.
// Uso: npx tsx --conditions=react-server scripts/sets-sim.ts
import { GEAR_SETS } from "../src/lib/game/sets";
import { ITEM_BY_ID, itemStatsFor } from "../src/lib/game/items";
import { RACE_PROFILE, heroStats, type ItemBonus, type Piece } from "../src/lib/game/gear";
import { RACES, RACE_IDS, type Attributes, type RaceId } from "../src/lib/game/data";

/** Mesmo jogador típico do gear-sim: metade dos pontos no 1º atributo principal, 1/4 no 2º, 1/4 em CON. */
function typicalAttrs(race: RaceId, level: number): Attributes {
  const a = { ...RACES[race].attributes };
  const pts = (level - 1) * 3;
  const [m1, m2] = RACE_PROFILE[race].main;
  const p1 = Math.round(pts / 2), p2 = Math.round(pts / 4);
  a[m1] += p1; a[m2] += p2; a.con += pts - p1 - p2;
  return a;
}

const pct = (a: number, b: number) => `${b >= a ? "+" : ""}${Math.round(((b - a) / Math.max(1, a)) * 100)}%`;
console.log("| Conjunto | Raça | Nv | Ataque | Magia | Defesa |\n|---|---|---|---|---|---|");
for (const s of GEAR_SETS) {
  const defs = s.pieces.map((id) => ITEM_BY_ID[id]);
  const L = Math.max(...defs.map((d) => d.minLevel ?? 1));
  const race = (RACE_IDS as readonly RaceId[]).find((r) => defs.some((d) => d.affinity?.includes(r)))
    ?? (RACE_IDS as readonly RaceId[]).find((r) => defs.some((d) => d.weight === RACE_PROFILE[r].weight)) ?? "humano";
  const a = typicalAttrs(race, L);
  const pieces: Piece[] = defs.map((d) => ({ item: { id: d.id, slot: d.slot, rarity: d.rarity, weapon: d.weapon, weight: d.weight }, stats: itemStatsFor(d, d.stats as Record<string, number>, race) as Record<string, number> }));
  const base = heroStats(a, L, pieces.map((p) => p.stats as ItemBonus), race, pieces);
  const withSet = heroStats(a, L, [...pieces.map((p) => p.stats as ItemBonus), (s.bonus[3] ?? s.bonus[2])], race, pieces);
  const mid = (x: [number, number]) => (x[0] + x[1]) / 2;
  console.log(`| ${s.name} | ${race} | ${L} | ${pct(mid(base.atk), mid(withSet.atk))} | ${pct(mid(base.magic), mid(withSet.magic))} | ${pct(base.def, withSet.def)} |`);
}
