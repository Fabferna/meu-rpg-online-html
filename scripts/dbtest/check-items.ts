// Confere o catálogo (src/lib/game/items.ts) contra a tabela `items` do banco local
// (depois de aplicar TODAS as migrações) e se toda recompensa citada no jogo existe.
// Uso: scripts/dbtest/setup.sh && npx tsx scripts/dbtest/check-items.ts
import { existsSync } from "node:fs";
import { pool } from "./fakeSupabase";
import { ITEMS, ITEM_BY_ID } from "../../src/lib/game/items";
import { ENEMIES } from "../../src/lib/game/enemies";
import { QUESTS } from "../../src/lib/game/quests";
import { DUNGEONS } from "../../src/lib/game/dungeons";
import { CHAPTERS } from "../../src/lib/game/story";
import { CONVENIENCE, DAILY_POOL } from "../../src/lib/shop/catalog";

async function main() {
  const problems: string[] = [];
  const { rows } = await pool.query("select id, kind, rarity, data from public.items");
  const db = Object.fromEntries(rows.map((r) => [r.id, r]));
  for (const it of ITEMS) {
    const r = db[it.id];
    if (!r) { problems.push(`catálogo tem "${it.id}", banco não`); continue; }
    if ((r.data.slot ?? undefined) !== it.slot) problems.push(`${it.id}: espaço ${r.data.slot} no banco ≠ ${it.slot}`);
    for (const [k, v] of Object.entries(it.stats)) if (r.data[k] !== v) problems.push(`${it.id}: ${k}=${r.data[k]} no banco ≠ ${v}`);
    if (r.data.image !== it.image) problems.push(`${it.id}: imagem ${r.data.image} no banco ≠ ${it.image}`);
    if (r.rarity !== it.rarity) problems.push(`${it.id}: raridade ${r.rarity} ≠ ${it.rarity}`);
    if (!existsSync(`public${it.image}`)) problems.push(`${it.id}: arquivo public${it.image} não existe`);
  }
  for (const id of Object.keys(db)) if (!ITEM_BY_ID[id]) problems.push(`banco tem "${id}", catálogo não (itens antigos ficam só para inventários existentes)`);

  const refs: [string, string][] = [
    ...ENEMIES.filter((e) => e.drop).map((e) => [e.drop!.item, `drop de ${e.id}`] as [string, string]),
    ...QUESTS.filter((q) => q.drop).map((q) => [q.drop!.item, `missão ${q.id}`] as [string, string]),
    ...DUNGEONS.filter((d) => d.chest.item).map((d) => [d.chest.item!.id, `baú ${d.id}`] as [string, string]),
    ...CHAPTERS.filter((c) => c.rewards.item).map((c) => [c.rewards.item!, `capítulo ${c.n}`] as [string, string]),
    ...[...CONVENIENCE, ...DAILY_POOL].filter((s) => s.item).map((s) => [s.item!.id, `loja ${s.key}`] as [string, string]),
  ];
  for (const [id, where] of refs) {
    if (!ITEM_BY_ID[id]) problems.push(`${where}: item "${id}" não está no catálogo`);
    if (!db[id]) problems.push(`${where}: item "${id}" não está no banco`);
  }
  console.log(`${ITEMS.length} itens no catálogo, ${rows.length} no banco, ${refs.length} recompensas conferidas.`);
  console.log(problems.length ? `PROBLEMAS:\n- ${problems.join("\n- ")}` : "OK: catálogo e banco batem.");
  await pool.end();
  if (problems.some((p) => !p.startsWith("banco tem"))) process.exit(1);
}
main();
