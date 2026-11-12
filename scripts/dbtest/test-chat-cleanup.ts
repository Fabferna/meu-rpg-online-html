// Limpeza automática do chat: limite de mensagens por canal e idade máxima.
// Uso: npm run test:db:setup && npm run test:db:chat
import { makeHero } from "./helpers";
import { pool } from "./fakeSupabase";

const ok = (c: boolean, m: string) => { console.log(`${c ? "✅" : "❌"} ${m}`); if (!c) process.exitCode = 1; };
const n = async (ch: string) => Number((await pool.query("select count(*) n from public.chat_messages where channel=$1", [ch])).rows[0].n);
const post = (u: string, ch: string, i: number) => pool.query(
  "insert into public.chat_messages (channel, user_id, name, body) values ($1, $2, 'T', $3)", [ch, u, `msg ${i}`]);

async function main() {
  const h = await makeHero({ race: "humano", level: 5 });
  await pool.query("delete from public.chat_messages where channel in ('global', 'guild:00000000-0000-0000-0000-000000000001')");
  for (let i = 0; i < 170; i++) await post(h.userId, "global", i);
  ok(await n("global") === 150, `global: guarda só as 150 últimas (tem ${await n("global")})`);
  const first = (await pool.query("select body from public.chat_messages where channel='global' order by id limit 1")).rows[0].body;
  ok(first === "msg 20", `global: as mais antigas foram apagadas (a 1ª agora é "${first}")`);

  const g = "guild:00000000-0000-0000-0000-000000000001";
  for (let i = 0; i < 310; i++) await post(h.userId, g, i);
  ok(await n(g) === 300, `guilda: guarda as 300 últimas (tem ${await n(g)})`);

  await pool.query("update public.chat_messages set created_at = now() - interval '15 days' where channel=$1 and body in ('msg 100','msg 101')", [g]);
  await post(h.userId, g, 999);
  ok(await n(g) === 298, `guilda: as 2 mensagens com mais de 14 dias somem na próxima mensagem (tem ${await n(g)})`);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
