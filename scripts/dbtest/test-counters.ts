// Contadores de jogadores (0044): registrados = contas criadas; online = batimento recente.
// Uso: npm run test:db:setup && npm run test:db:counters
import * as presence from "../../src/app/api/presence/route";
import { call, makeHero } from "./helpers";
import { pool } from "./fakeSupabase";

const ok = (c: boolean, m: string) => { console.log(`${c ? "✅" : "❌"} ${m}`); if (!c) process.exitCode = 1; };
const counters = async (w = 180) => (await pool.query("select public.player_counters($1) c", [w])).rows[0].c as { registered: number; online: number };

async function main() {
  const base = await counters();
  const a = await makeHero({ race: "humano", level: 3 });
  const b = await makeHero({ race: "elfo", level: 3 });
  // Conta sem herói também é uma conta registrada.
  await pool.query("insert into auth.users (email) values ($1)", [`semheroi${Date.now()}@x.dev`]);
  const c1 = await counters();
  ok(c1.registered === base.registered + 3, `registrados conta as contas criadas (${base.registered} → ${c1.registered})`);
  ok(c1.online === base.online, "criar conta não deixa ninguém online");

  const r = await call(presence, a.userId, {});
  ok(r.status === 200 && Number(r.json.online) >= 1 && Number(r.json.registered) >= 3, "batimento responde com os contadores");
  ok((await counters()).online === base.online + 1, "quem mandou batimento conta como online");
  await call(presence, a.userId, {});
  ok((await counters()).online === base.online + 1, "batimento repetido não conta duas vezes");
  await call(presence, b.userId, {});
  ok((await counters()).online === base.online + 2, "segundo jogador online");

  await pool.query("update public.player_presence set last_seen = now() - interval '4 minutes' where user_id=$1", [a.userId]);
  ok((await counters()).online === base.online + 1, "sem batimento há mais de 3 minutos: sai da contagem");
  ok((await counters(600)).online === base.online + 2, "a janela de tempo é configurável");
  ok((await call(presence, a.userId, { gold: 999 })).status === 400, "campos extras são recusados");

  const asRole = async (role: string, sql: string) => {
    const c = await pool.connect();
    try { await c.query("begin"); await c.query(`set local role ${role}`); await c.query(sql); await c.query("rollback"); return null; }
    catch (e) { await c.query("rollback"); return (e as Error).message; } finally { c.release(); }
  };
  ok(!!(await asRole("authenticated", "select * from public.player_presence")), "jogador não lê a tabela de presença");
  ok(!!(await asRole("authenticated", `select public.presence_ping('${b.userId}')`)), "jogador não marca presença direto no banco");
  ok(!!(await asRole("anon", "select public.player_counters(180)")), "visitante não chama a função direto (só pela rota, com cache)");
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
