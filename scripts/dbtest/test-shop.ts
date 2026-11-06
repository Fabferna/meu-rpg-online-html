// Inventário, Ferreiro e Loja pelas ROTAS REAIS: venda em lote, bolsa cheia, limites diários,
// preço sempre do servidor e TODA compra/venda registrada no extrato (ledger).
// Uso: npm run test:db:setup && npm run test:db:shop
import * as sellMany from "../../src/app/api/smith/sell-many/route";
import * as sell from "../../src/app/api/smith/sell/route";
import * as smithBuy from "../../src/app/api/smith/buy/route";
import * as shopBuy from "../../src/app/api/shop/buy/route";
import * as refill from "../../src/app/api/shop/refill-energy/route";
import { call, makeHero } from "./helpers";
import { pool } from "./fakeSupabase";
import { ITEM_BY_ID, sellPrice } from "../../src/lib/game/items";
import { BAG_LIMIT } from "../../src/lib/game/loot";
import { CONVENIENCE, COSMETICS } from "../../src/lib/shop/catalog";

const ok = (c: boolean, m: string) => { console.log(`${c ? "✅" : "❌"} ${m}`); if (!c) process.exitCode = 1; };
const q = async (sql: string, a: unknown[] = []) => (await pool.query(sql, a)).rows;
const wallet = async (u: string) => { const r = (await q("select gold, gems from wallets where user_id=$1", [u]))[0]; return { gold: Number(r.gold), gems: Number(r.gems) }; };
const ledger = async (u: string, like: string) => q("select delta, currency, reason from ledger where user_id=$1 and reason like $2 order by id", [u, like]);
const give = async (u: string, item: string, n = 1) => { await q("select public.give_item($1,$2,$3)", [u, item, n]); };
const invIds = async (u: string, item: string) => (await q("select id from inventory where user_id=$1 and item_id=$2 order by acquired_at", [u, item])).map((r) => r.id as string);

async function main() {
  // ── Venda em lote ──
  const h = await makeHero({ race: "humano", level: 20, gold: 10 });
  await give(h.userId, "lamina_valerion"); await give(h.userId, "elmo_ferro"); await give(h.userId, "pocao_vida", 7);
  await q("update inventory set upgrade=2 where user_id=$1 and item_id='lamina_valerion'", [h.userId]);
  const ids = [...await invIds(h.userId, "lamina_valerion"), ...await invIds(h.userId, "elmo_ferro"), ...await invIds(h.userId, "pocao_vida")];
  const pots = Number((await q("select qty from inventory where user_id=$1 and item_id='pocao_vida'", [h.userId]))[0].qty); // inclui as poções iniciais
  const expect = sellPrice(ITEM_BY_ID.lamina_valerion, 2) + sellPrice(ITEM_BY_ID.elmo_ferro, 0) + pots * sellPrice(ITEM_BY_ID.pocao_vida, 0);
  const w0 = await wallet(h.userId);
  const r1 = await call(sellMany, h.userId, { inventoryIds: [...ids, ids[0]] }); // id repetido de propósito
  ok(r1.status === 200 && r1.json.gold === expect && r1.json.count === 2 + pots, `vende 3 linhas (${2 + pots} unidades, com +2 e pilha) por ${expect} 🪙 (${JSON.stringify(r1.json)})`);
  ok((await wallet(h.userId)).gold - w0.gold === expect, "ouro creditado bate com o preço do servidor");
  ok((await ledger(h.userId, "smith:sell:%")).length === 3, "extrato: uma linha por item vendido");
  ok((await q("select 1 from inventory where id = any($1::uuid[])", [ids])).length === 0, "itens saíram da bolsa");

  await give(h.userId, "capuz_viajante"); await give(h.userId, "gibao_couro");
  const [cap] = await invIds(h.userId, "capuz_viajante"); const [gib] = await invIds(h.userId, "gibao_couro");
  await q("update inventory set equipped=true where id=$1", [gib]);
  const w1 = await wallet(h.userId);
  const r2 = await call(sellMany, h.userId, { inventoryIds: [cap, gib] });
  ok(r2.status === 409 && r2.json.error === "item_equipped" && (await wallet(h.userId)).gold === w1.gold && (await invIds(h.userId, "capuz_viajante")).length === 1,
    "com um item equipado no meio: recusa e não vende nada");
  const other = await makeHero({ race: "elfo", level: 5 });
  await give(other.userId, "arco_elfico");
  const [foreign] = await invIds(other.userId, "arco_elfico");
  const r3 = await call(sellMany, h.userId, { inventoryIds: [cap, foreign] });
  ok(r3.status === 404 && (await invIds(other.userId, "arco_elfico")).length === 1, "item de outro jogador: recusado (404) e intocado");
  const r4 = await call(sellMany, h.userId, { inventoryIds: [cap], price: 1 });
  ok(r4.status === 400, "cliente não consegue mandar preço (campo extra → 400)");
  const r5 = await call(sell, h.userId, { inventoryId: cap });
  ok(r5.status === 200 && (await ledger(h.userId, "smith:sell:capuz_viajante")).length === 1, "venda unitária continua funcionando e vai para o extrato");

  // ── Ferreiro: nível, bolsa cheia, extrato ──
  const b = await makeHero({ race: "anao", level: 10, gold: 50000 });
  const r6 = await call(smithBuy, b.userId, { itemId: "espada_capitao" });
  ok(r6.status === 403 && r6.json.error === "level_too_low", "Ferreiro: item acima do nível é recusado");
  const r7 = await call(smithBuy, b.userId, { itemId: "martelo_guerra" });
  const l7 = await ledger(b.userId, "smith:buy:martelo_guerra");
  ok(r7.status === 200 && l7.length === 1 && Number(l7[0].delta) === -ITEM_BY_ID.martelo_guerra.buy!, `Ferreiro: comprou o Martelo de Guerra (novo) por ${ITEM_BY_ID.martelo_guerra.buy} e registrou no extrato`);
  const used = Number((await q("select count(*) n from inventory where user_id=$1 and not equipped", [b.userId]))[0].n);
  await give(b.userId, "capuz_viajante", BAG_LIMIT - used);
  const wb = await wallet(b.userId);
  const r8 = await call(smithBuy, b.userId, { itemId: "elmo_ferro" });
  ok(r8.status === 409 && r8.json.error === "bag_full" && (await wallet(b.userId)).gold === wb.gold, "Ferreiro com a bolsa cheia: recusa ANTES de cobrar");
  const r9 = await call(smithBuy, b.userId, { itemId: "lamina_aurora" });
  ok(r9.status === 404, "item sem preço no Ferreiro (só drop) não pode ser comprado");

  // ── Loja: cosmético, conveniência com limite diário, energia ──
  const s = await makeHero({ race: "gronar", level: 8, gold: 5000 });
  await q("update wallets set gems=1000 where user_id=$1", [s.userId]);
  const cos = COSMETICS.find((c) => c.price?.currency === "gems" && !c.race)!;
  const rc = await call(shopBuy, s.userId, { type: "cosmetic", id: cos.id });
  const lc = await ledger(s.userId, `cosmetic:${cos.id}`);
  ok(rc.status === 200 && lc.length === 1 && Number(lc[0].delta) === -cos.price!.amount && lc[0].currency === "gems", `Loja: ${cos.name} por 💎${cos.price!.amount}, no extrato`);
  ok((await call(shopBuy, s.userId, { type: "cosmetic", id: cos.id })).json.error === "already_owned", "cosmético repetido: recusado");
  const deal = CONVENIENCE.find((d) => d.key === "potions_5")!;
  let bought = 0;
  for (let i = 0; i < deal.limit + 1; i++) if ((await call(shopBuy, s.userId, { type: "deal", id: deal.key })).status === 200) bought++;
  const ld = await ledger(s.userId, `shop:${deal.key}`);
  ok(bought === deal.limit && ld.length === deal.limit, `"${deal.name}": ${deal.limit} por dia, a ${deal.limit + 1}ª recusada; ${ld.length} linhas no extrato`);
  const rx = await call(shopBuy, s.userId, { type: "deal", id: deal.key, price: 0 });
  ok(rx.status === 400, "Loja: campo de preço vindo do cliente → 400");
  await q("update characters set energy=0, energy_updated_at=now() where user_id=$1", [s.userId]);
  const re = await call(refill, s.userId, {});
  ok(re.status === 200 && (await ledger(s.userId, "%energy%")).length + (await ledger(s.userId, "%refill%")).length >= 1, "recarga de energia vai para o extrato");

  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
