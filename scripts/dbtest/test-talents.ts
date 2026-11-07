// Árvore de talentos pela rota real: pontos livres, andares, exclusão, redistribuição e efeito no combate.
// Uso: npm run test:db:setup && npm run test:db:talents
import * as talents from "../../src/app/api/talents/route";
import { call, makeHero } from "./helpers";
import { fakeAdmin, pool } from "./fakeSupabase";
import { loadPlayer, heroCombatant } from "../../src/lib/game/player";
import { talentResetCost } from "../../src/lib/game/talents";

const ok = (c: boolean, m: string) => { console.log(`${c ? "✅" : "❌"} ${m}`); if (!c) process.exitCode = 1; };
const tal = async (u: string) => (await pool.query("select talents from public.characters where user_id=$1", [u])).rows[0].talents as Record<string, number>;
const learn = (u: string, id: string) => call(talents, u, { action: "learn", id });

async function main() {
  const h = await makeHero({ race: "humano", level: 10, gold: 5000 }); // 8 pontos
  const before = heroCombatant((await loadPlayer(fakeAdmin() as never, h.userId))!, 100, 100);

  ok((await learn(h.userId, "f_selvagem")).status === 409, "andar 2 fechado antes de gastar 5 pontos no ramo");
  for (let i = 0; i < 5; i++) await learn(h.userId, "f_lamina");
  ok((await tal(h.userId)).f_lamina === 5, "andar 1: 5 pontos em Lâmina Afiada");
  ok((await learn(h.userId, "f_lamina")).status === 409, "não passa do máximo do talento");
  ok((await learn(h.userId, "f_selvagem")).status === 200, "andar 2 abriu");
  ok((await learn(h.userId, "f_certeiro")).status === 409, "talento do mesmo grupo é bloqueado (um OU outro)");
  await learn(h.userId, "f_selvagem"); await learn(h.userId, "f_selvagem");
  ok((await learn(h.userId, "b_ferro")).status === 409, "sem pontos livres (8 de 8 gastos) → recusado");

  const after = heroCombatant((await loadPlayer(fakeAdmin() as never, h.userId))!, 100, 100);
  ok(after.atk[1] > before.atk[1], `combate: ataque máximo subiu de ${before.atk[1]} para ${after.atk[1]} (+17,5%)`);

  const g0 = Number((await pool.query("select gold from public.wallets where user_id=$1", [h.userId])).rows[0].gold);
  ok((await call(talents, h.userId, { action: "reset" })).status === 200, "redistribuir");
  const g1 = Number((await pool.query("select gold from public.wallets where user_id=$1", [h.userId])).rows[0].gold);
  ok(Object.keys(await tal(h.userId)).length === 0 && g0 - g1 === talentResetCost(10), `redistribuir zera a árvore e custa 🪙 ${talentResetCost(10)}`);
  ok((await call(talents, h.userId, { action: "reset" })).status === 409, "redistribuir sem pontos gastos é recusado");

  const poor = await makeHero({ race: "elfo", level: 10, gold: 0 });
  await learn(poor.userId, "a_mente");
  ok((await call(talents, poor.userId, { action: "reset" })).status >= 400 && (await tal(poor.userId)).a_mente === 1, "sem ouro: redistribuição recusada e nada muda");

  // Dois cliques ao mesmo tempo com 1 ponto livre: só um grava.
  const two = await makeHero({ race: "anao", level: 3 }); // 1 ponto
  const rr = await Promise.all([learn(two.userId, "b_ferro"), learn(two.userId, "a_mente")]);
  const t2 = await tal(two.userId);
  ok(Object.values(t2).reduce((s, n) => s + n, 0) === 1 && rr.filter((x) => x.status === 200).length === 1, "dois cliques juntos com 1 ponto: só 1 ponto gasto");

  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
