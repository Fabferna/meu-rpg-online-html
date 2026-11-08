// Elixir comprado/ganho vai para o inventário e só ativa quando o jogador usa.
// Uso: npm run test:db:setup && npm run test:db:consumables
import * as shopBuy from "../../src/app/api/shop/buy/route";
import * as useItem from "../../src/app/api/inventory/use/route";
import { call, makeHero } from "./helpers";
import { pool } from "./fakeSupabase";

const ok = (c: boolean, m: string) => { console.log(`${c ? "✅" : "❌"} ${m}`); if (!c) process.exitCode = 1; };
const q = async (sql: string, a: unknown[] = []) => (await pool.query(sql, a)).rows;

async function main() {
  const h = await makeHero({ race: "humano", level: 5 });
  await q("select public.wallet_apply($1, 'gems', 200, 'teste', 'teste-elixir')", [h.userId]);
  const r = await call(shopBuy, h.userId, { type: "deal", id: "xp_boost_60" });
  const boost0 = (await q("select xp_boost_until from characters where user_id=$1", [h.userId]))[0].xp_boost_until;
  const inv = Number((await q("select coalesce(sum(qty),0) n from inventory where user_id=$1 and item_id='elixir_xp_1h'", [h.userId]))[0].n);
  ok(r.status === 200 && inv === 1 && !boost0, "comprar o Elixir: vai para o inventário e NÃO ativa sozinho");
  const u = await call(useItem, h.userId, { itemId: "elixir_xp_1h" });
  const boost1 = (await q("select xp_boost_until from characters where user_id=$1", [h.userId]))[0].xp_boost_until;
  const mins = (new Date(boost1).getTime() - Date.now()) / 60000;
  ok(u.status === 200 && mins > 58 && mins <= 60.5, `usar o Elixir: bônus de XP ativo por ~60 min (${Math.round(mins)} min)`);
  ok((await call(useItem, h.userId, { itemId: "elixir_xp_1h" })).status >= 400, "elixir gasto: não usa de novo");
  ok((await call(useItem, h.userId, { itemId: "espada_curta" })).status >= 400, "equipamento não pode ser 'usado'");
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
