// Conjuntos de equipamento (bônus no servidor) e Encomendas do Colecionador pelas ROTAS REAIS.
// Uso: npm run test:db:setup && npm run test:db:collector
import * as deliver from "../../src/app/api/goals/collector/route";
import { call, makeHero } from "./helpers";
import { fakeAdmin, pool } from "./fakeSupabase";
import { heroCombatant, loadPlayer } from "../../src/lib/game/player";
import { SET_BY_ID } from "../../src/lib/game/sets";
import { collectorOrders } from "../../src/lib/game/collector";
import { ITEMS } from "../../src/lib/game/items";

const ok = (c: boolean, m: string) => { console.log(`${c ? "✅" : "❌"} ${m}`); if (!c) process.exitCode = 1; };
const q = async (sql: string, a: unknown[] = []) => (await pool.query(sql, a)).rows;
const admin = fakeAdmin() as never;
const units = async (u: string, item: string) => Number((await q("select coalesce(sum(qty),0) n from inventory where user_id=$1 and item_id=$2", [u, item]))[0].n);
const ids = async (u: string, item: string) => (await q("select id from inventory where user_id=$1 and item_id=$2 and not equipped", [u, item])).map((r) => r.id as string);
const gold = async (u: string) => Number((await q("select gold from wallets where user_id=$1", [u]))[0].gold);
const give = (u: string, item: string, n = 1) => q("select public.give_item($1,$2,$3)", [u, item, n]);

async function def(userId: string) {
  const p = (await loadPlayer(admin, userId))!;
  return heroCombatant(p, p.hp, p.maxHp);
}

async function main() {
  // ── Conjuntos ──
  const v = SET_BY_ID.valerion;
  const h1 = await makeHero({ race: "humano", level: 20, gear: [v.pieces[0]] });
  const h2 = await makeHero({ race: "humano", level: 20, gear: v.pieces.slice(0, 2) });
  const h3 = await makeHero({ race: "humano", level: 20, gear: v.pieces });
  const p3 = (await loadPlayer(admin, h3.userId))!;
  ok(p3.gear.some((g) => JSON.stringify(g) === JSON.stringify(v.bonus[3])), `3 peças de "${v.name}": o servidor soma o bônus de 3 peças ${JSON.stringify(v.bonus[3])}`);
  const p2 = (await loadPlayer(admin, h2.userId))!;
  ok(p2.gear.some((g) => JSON.stringify(g) === JSON.stringify(v.bonus[2])) && !p2.gear.some((g) => JSON.stringify(g) === JSON.stringify(v.bonus[3])), "2 peças: só o bônus de 2 (o de 3 não soma junto)");
  const p1 = (await loadPlayer(admin, h1.userId))!;
  ok(!p1.gear.some((g) => JSON.stringify(g) === JSON.stringify(v.bonus[2])), "1 peça: sem bônus de conjunto");
  const d2 = await def(h2.userId), d3 = await def(h3.userId);
  ok(d3.def > d2.def, `defesa em combate sobe com a 3ª peça (${d2.def} → ${d3.def})`);

  // ── Encomendas do Colecionador ──
  const day = new Date().toISOString().slice(0, 10);
  const c = await makeHero({ race: "elfo", level: 12, gold: 0 });
  const orders = collectorOrders(day, 12);
  // 0) Poções: consome exatamente a quantidade pedida, paga e registra no extrato.
  await give(c.userId, "pocao_vida", 10);
  const before = await units(c.userId, "pocao_vida");
  const g0 = await gold(c.userId);
  const r0 = await call(deliver, c.userId, { idx: 0, inventoryIds: await ids(c.userId, "pocao_vida") });
  ok(r0.status === 200 && (await units(c.userId, "pocao_vida")) === before - orders[0].qty, `entrega ${orders[0].qty} poções: tirou só ${orders[0].qty} da pilha (${before} → ${before - orders[0].qty})`);
  ok((await gold(c.userId)) - g0 >= orders[0].gold, `pagou 🪙${orders[0].gold} + ${orders[0].xp} XP`);
  ok((await q("select 1 from ledger where user_id=$1 and reason like 'reward:collector:%'", [c.userId])).length >= 1, "recompensa no extrato");
  const again = await call(deliver, c.userId, { idx: 0, inventoryIds: await ids(c.userId, "pocao_vida") });
  ok(again.status === 409 && again.json.error === "already_claimed" && (await units(c.userId, "pocao_vida")) === before - orders[0].qty, "repetir a mesma encomenda: recusado e nada consumido");

  // 2) Raridade: precisa de N equipamentos daquela raridade.
  const o2 = orders[2];
  const rareItems = ITEMS.filter((i) => i.slot && i.rarity === o2.rarity).map((i) => i.id);
  await give(c.userId, rareItems[0]);
  const one = await ids(c.userId, rareItems[0]);
  const r1 = await call(deliver, c.userId, { idx: 2, inventoryIds: one });
  ok(r1.status === 409 && r1.json.error === "not_enough_items", `só 1 de ${o2.qty} itens ${o2.rarity}: not_enough_items`);
  await give(c.userId, "espada_curta");
  const wrong = await call(deliver, c.userId, { idx: 2, inventoryIds: [...one, ...(await ids(c.userId, "espada_curta"))] });
  ok(wrong.status === 409 && wrong.json.error === "wrong_item", `item de outra raridade no meio: wrong_item`);
  await give(c.userId, rareItems[1]);
  const two = [...one, ...(await ids(c.userId, rareItems[1]))];
  await q("update inventory set equipped=true where id=$1", [two[1]]);
  const eq = await call(deliver, c.userId, { idx: 2, inventoryIds: two });
  ok(eq.status === 409 && eq.json.error === "item_equipped", "item equipado: recusado");
  await q("update inventory set equipped=false where id=$1", [two[1]]);
  const gems0 = Number((await q("select gems from wallets where user_id=$1", [c.userId]))[0].gems);
  const r2 = await call(deliver, c.userId, { idx: 2, inventoryIds: two });
  ok(r2.status === 200 && (await q("select 1 from inventory where id = any($1::uuid[])", [two])).length === 0, `${o2.qty} itens ${o2.rarity} entregues e consumidos`);
  ok(Number((await q("select gems from wallets where user_id=$1", [c.userId]))[0].gems) - gems0 === o2.gems, `+${o2.gems} 💎`);

  // 1) Item específico + dois cliques ao mesmo tempo.
  const o1 = orders[1];
  await give(c.userId, o1.item!, 2);
  const its = await ids(c.userId, o1.item!);
  const rs = await Promise.all([call(deliver, c.userId, { idx: 1, inventoryIds: [its[0]] }), call(deliver, c.userId, { idx: 1, inventoryIds: [its[1]] })]);
  ok(rs.filter((r) => r.status === 200).length === 1 && (await units(c.userId, o1.item!)) === 1, `dois cliques na encomenda "${o1.item}": paga uma vez e consome 1 item`);

  // O cliente não escolhe a recompensa nem a encomenda além do índice.
  const hack = await call(deliver, c.userId, { idx: 1, inventoryIds: [its[0]], gold: 99999 });
  ok(hack.status === 400, "campo extra (ouro) → 400");
  const other = await makeHero({ race: "anao", level: 12 });
  await give(other.userId, "pocao_vida", 5);
  const steal = await call(deliver, c.userId, { idx: 0, inventoryIds: await ids(other.userId, "pocao_vida") });
  ok(steal.status === 404, "itens de outro jogador: 404");

  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
