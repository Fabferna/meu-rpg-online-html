// Gera o SQL que sincroniza a tabela `items` com src/lib/game/items.ts.
// Uso: npx tsx scripts/gen-items-sql.ts > supabase/migrations/00XX_items.sql
import { ITEMS } from "../src/lib/game/items";
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const rows = ITEMS.map((i) => {
  const kind = i.slot ? (i.slot === "weapon" ? "weapon" : i.slot === "accessory" ? "accessory" : "armor") : "consumable";
  const data = { ...(i.slot ? { slot: i.slot } : {}), ...i.stats, image: i.image};
  return `  (${q(i.id)}, ${q(i.name)}, ${q(kind)}, ${q(i.rarity)}, ${q(JSON.stringify(data))})`;
});
console.log(`insert into public.items (id, name, kind, rarity, data) values\n${rows.join(",\n")}\non conflict (id) do update set name = excluded.name, kind = excluded.kind, rarity = excluded.rarity, data = excluded.data;`);
