// Tabela de saque da Caçada pelas ROTAS REAIS: entrega ao inventário, bolsa cheia vira ouro,
// proteção contra azar, anti-farm e clique duplo sem duplicar.
// Uso: npm run test:db:setup && npm run test:db:loot
import * as start from "../../src/app/api/battle/start/route";
import * as action from "../../src/app/api/battle/action/route";
import { call, makeHero } from "./helpers";
import { pool } from "./fakeSupabase";
import { ITEM_BY_ID } from "../../src/lib/game/items";
import { ENEMY_BY_ID } from "../../src/lib/game/enemies";
import { BAG_LIMIT, PITY_WINS, type LootResult } from "../../src/lib/game/loot";

const ok = (c: boolean, m: string) => { console.log(`${c ? "✅" : "❌"} ${m}`); if (!c) process.exitCode = 1; };
/** Fixa a "sorte" das rotas (0 = tudo cai; 0,99 = nada cai). */
const luck = (v: number | undefined) => { (globalThis as { __TEST_RNG__?: () => number }).__TEST_RNG__ = v === undefined ? undefined : () => v; };
const q1 = async (sql: string, args: unknown[]) => (await pool.query(sql, args)).rows[0];
const gold = async (u: string) => Number((await q1("select gold from wallets where user_id=$1", [u])).gold);
const bag = async (u: string) => Number((await q1("select count(*) n from inventory where user_id=$1 and not equipped", [u])).n);
const units = async (u: string, item: string) => Number((await q1("select coalesce(sum(qty),0) n from inventory where user_id=$1 and item_id=$2", [u, item])).n);
const pity = async (u: string) => Number((await q1("select coalesce(max(value),0) v from user_counters where user_id=$1 and key='loot_pity'", [u])).v);

/** Começa a caçada e deixa o inimigo com 1 de vida (o resultado do saque é o que importa aqui). */
async function prepare(u: string, enemyId: string) {
  await pool.query("update characters set energy=999, energy_updated_at=now(), hp=99999, hp_updated_at=now() where user_id=$1", [u]);
  const r = await call(start, u, { enemyId });
  if (r.status !== 200) throw new Error(`start ${enemyId}: ${JSON.stringify(r.json)}`);
  await pool.query("update battles set state = jsonb_set(state, '{enemy,hp}', '1') where user_id=$1 and status='active'", [u]);
}
async function win(u: string, enemyId: string) {
  await prepare(u, enemyId);
  for (let i = 0; i < 30; i++) {
    await pool.query("update battles set state = jsonb_set(state, '{player,hp}', '99999') where user_id=$1 and status='active'", [u]);
    const r = await call(action, u, { action: "attack" });
    if (r.json.outcome === "won") return (r.json.state as { rewards: { loot: LootResult[]; gold: number } }).rewards;
    if (r.status !== 200) throw new Error(JSON.stringify(r.json));
  }
  throw new Error("não venceu");
}

async function main() {
  // 1) Vitória entrega TODOS os itens sorteados ao inventário.
  const h = await makeHero({ race: "humano", level: 14, chapter: 15 });
  luck(0);
  const r1 = await win(h.userId, "lider_cultista");
  const items = r1.loot.map((l) => l.item);
  ok(r1.loot.length === 3 && items.includes("pocao_vida") && items.includes("tiara_lunar") && r1.loot.every((l) => l.gold === 0),
    `chefe com sorte máxima: poção + equipamento + drop especial (${items.join(", ")})`);
  let all = true;
  for (const l of r1.loot) all &&= (await units(h.userId, l.item)) >= l.qty;
  ok(all, "todos os itens estão no inventário");
  ok(r1.loot.every((l) => ITEM_BY_ID[l.item]), "todo item sorteado existe no catálogo/tabela items");
  ok((await pity(h.userId)) === 0, "veio equipamento: contador de azar fica em 0");

  // 2) Bolsa cheia: o item vira ouro (preço de venda), com registro no extrato.
  const f = await makeHero({ race: "elfo", level: 5 });
  await pool.query("select public.give_item($1, 'capuz_viajante', $2)", [f.userId, BAG_LIMIT - (await bag(f.userId))]);
  const g0 = await gold(f.userId);
  luck(0);
  const r2 = await win(f.userId, "sombra_fraca");
  const conv = r2.loot.filter((l) => l.gold > 0);
  const expected = conv.reduce((s, l) => s + ITEM_BY_ID[l.item].sell * l.qty, 0);
  const gearL = r2.loot.filter((l) => ITEM_BY_ID[l.item].slot);
  ok(gearL.length >= 1 && gearL.every((l) => l.gold === ITEM_BY_ID[l.item].sell), `bolsa cheia (${BAG_LIMIT}/${BAG_LIMIT}): equipamento virou ouro (${conv.map((l) => `${l.item}=${l.gold}`).join(", ")})`);
  ok(r2.loot.filter((l) => !ITEM_BY_ID[l.item].slot).every((l) => l.gold === 0), "poção entra na pilha que já existe (não ocupa espaço novo)");
  ok((await gold(f.userId)) - g0 === ENEMY_BY_ID.sombra_fraca.gold + expected, `ouro: +${ENEMY_BY_ID.sombra_fraca.gold} da luta + ${expected} dos itens`);
  ok((await bag(f.userId)) === BAG_LIMIT, "a bolsa não passou do limite");
  const led = Number((await q1("select count(*) n from ledger where user_id=$1 and reason like 'loot_bag_full:%'", [f.userId])).n);
  ok(led === conv.length, `extrato registra cada conversão (${led})`);

  await pool.query("delete from inventory where user_id=$1 and item_id='pocao_vida'", [f.userId]);
  await pool.query("select public.give_item($1, 'capuz_viajante', 1)", [f.userId]);
  const r2b = await win(f.userId, "sombra_fraca");
  ok(r2b.loot.length > 0 && r2b.loot.every((l) => l.gold > 0) && (await bag(f.userId)) === BAG_LIMIT, `sem pilha de poções e bolsa cheia: tudo vira ouro (${r2b.loot.map((l) => `${l.item}=${l.gold}`).join(", ")})`);

  // 3) Proteção contra azar: na vitória nº ${PITY_WINS} sem equipamento, vem um raro ou melhor.
  const p = await makeHero({ race: "anao", level: 5 });
  luck(0.99);
  const r3a = await win(p.userId, "sombra_fraca");
  ok(r3a.loot.length === 0 && (await pity(p.userId)) === 1, "sem sorte: nada cai e o contador sobe para 1");
  await pool.query("update user_counters set value=$2 where user_id=$1 and key='loot_pity'", [p.userId, PITY_WINS - 1]);
  const r3 = await win(p.userId, "sombra_fraca");
  const g = r3.loot.map((l) => ITEM_BY_ID[l.item]).find((d) => d?.slot);
  ok(!!g && g.rarity !== "common", `contador em ${PITY_WINS - 1}: garantiu ${g?.id} (${g?.rarity})`);
  ok((await pity(p.userId)) === 0, "contador zerado depois do item garantido");

  // 4) Anti-farm: herói 10+ níveis acima não recebe equipamento (poção ainda cai) e o contador não anda.
  const a = await makeHero({ race: "gronar", level: 15, chapter: 15 });
  luck(0);
  const r4 = await win(a.userId, "sombra_fraca");
  ok(r4.loot.every((l) => !ITEM_BY_ID[l.item].slot) && r4.loot.some((l) => l.item === "pocao_vida"), `nível 15 × inimigo nível 1: só poção (${r4.loot.map((l) => l.item).join(", ")})`);
  ok((await pity(a.userId)) === 0, "anti-farm: contador de azar não anda");

  // 5) Dois cliques ao mesmo tempo: só um grava, o saque não duplica.
  const d = await makeHero({ race: "aetheliano", level: 14, chapter: 15 });
  luck(0);
  await prepare(d.userId, "lider_cultista");
  const before = Number((await q1("select coalesce(sum(qty),0) n from inventory where user_id=$1", [d.userId])).n);
  let won: LootResult[] | null = null; let rejected = 0;
  for (let i = 0; i < 10 && !won; i++) {
    await pool.query("update battles set state = jsonb_set(state, '{player,hp}', '99999') where user_id=$1 and status='active'", [d.userId]);
    const rs = await Promise.all([call(action, d.userId, { action: "attack" }), call(action, d.userId, { action: "attack" })]);
    rejected += rs.filter((r) => r.status !== 200).length;
    const w = rs.find((r) => r.json.outcome === "won");
    if (w) won = (w.json.state as { rewards: { loot: LootResult[] } }).rewards.loot;
  }
  const after = Number((await q1("select coalesce(sum(qty),0) n from inventory where user_id=$1", [d.userId])).n);
  const got = (won ?? []).reduce((s, l) => s + l.qty, 0);
  ok(!!won && rejected >= 1 && after - before === got, `clique duplo: ${rejected} recusado(s), +${after - before} unidades = ${got} do saque`);
  const wins = Number((await q1("select count(*) n from battles where user_id=$1 and status='won'", [d.userId])).n);
  ok(wins === 1, "só uma vitória gravada");

  luck(undefined);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
