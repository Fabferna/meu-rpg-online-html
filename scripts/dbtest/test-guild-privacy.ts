// Guilda aberta x privada: entrar direto, pedir com mensagem, aceitar/recusar, cancelar, limite de pedidos.
// Uso: npm run test:db:setup && npm run test:db:guild
import * as guild from "../../src/app/api/guilds/action/route";
import { call, makeHero } from "./helpers";
import { pool } from "./fakeSupabase";

const ok = (c: boolean, m: string) => { console.log(`${c ? "✅" : "❌"} ${m}`); if (!c) process.exitCode = 1; };
const one = async (sql: string, a: unknown[] = []) => (await pool.query(sql, a)).rows[0];
const tag = () => Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, "A");
const nameOf = async (id: string) => (await one("select name from public.characters where user_id=$1", [id])).name as string;
const guildOf = async (id: string) => (await one("select guild_id from public.guild_members where user_id=$1", [id]))?.guild_id ?? null;

async function main() {
  const leader = await makeHero({ race: "humano", level: 10, gold: 5000 });
  const t1 = tag();
  const rc = await call(guild, leader.userId, { type: "create", name: `Privada ${t1}`, tag: t1, description: "", privacy: "private" });
  ok(rc.status === 200, "fundou guilda privada");
  const gid = rc.json.id as string;
  ok((await one("select privacy from public.guilds where id=$1", [gid])).privacy === "private", "guilda salva como privada");

  const a = await makeHero({ race: "elfo", level: 8 });
  const j = await call(guild, a.userId, { type: "join", guildId: gid });
  ok(j.status === 409 && j.json.error === "guild_private", "guilda privada: não dá para entrar direto");

  ok((await call(guild, a.userId, { type: "request", guildId: gid, message: "Jogo todo dia à noite!" })).status === 200, "pedido com mensagem enviado");
  ok((await one("select message from public.guild_requests where user_id=$1", [a.userId])).message === "Jogo todo dia à noite!", "mensagem do pedido salva");

  const outsider = await makeHero({ race: "anao", level: 8 });
  const no = await call(guild, outsider.userId, { type: "decide", target: await nameOf(a.userId), accept: true });
  ok(no.status === 409 && no.json.error === "no_permission", "quem não é da guilda não aceita pedidos");

  ok((await call(guild, leader.userId, { type: "decide", target: await nameOf(a.userId), accept: true })).status === 200, "líder aceitou o pedido");
  ok((await guildOf(a.userId)) === gid, "jogador aceito virou membro");
  ok(!(await one("select 1 x from public.guild_requests where user_id=$1", [a.userId])), "pedido some depois de aceito");

  const b = await makeHero({ race: "gronar", level: 8 });
  await call(guild, b.userId, { type: "request", guildId: gid, message: "" });
  ok((await call(guild, a.userId, { type: "decide", target: await nameOf(b.userId), accept: false })).status === 409, "membro comum não decide pedidos");
  await call(guild, leader.userId, { type: "manage", target: await nameOf(a.userId), op: "promote" });
  ok((await call(guild, a.userId, { type: "decide", target: await nameOf(b.userId), accept: false })).status === 200, "oficial recusou o pedido");
  ok(!(await guildOf(b.userId)) && !(await one("select 1 x from public.guild_requests where user_id=$1", [b.userId])), "recusado: fora da guilda e sem pedido");

  // Cancelar e limite de pedidos.
  ok((await call(guild, b.userId, { type: "request", guildId: gid, message: "de novo" })).status === 200, "pode pedir de novo depois de recusado");
  ok((await call(guild, b.userId, { type: "cancel_request", guildId: gid })).status === 200, "cancelou o próprio pedido");
  const ids: string[] = [];
  for (let i = 0; i < 6; i++) {
    const l = await makeHero({ race: "humano", level: 5, gold: 2000 }); const tg = tag();
    const r = await call(guild, l.userId, { type: "create", name: `Priv ${tg}${i}`, tag: tg, description: "", privacy: "private" });
    ids.push(r.json.id as string);
  }
  for (let i = 0; i < 5; i++) await call(guild, b.userId, { type: "request", guildId: ids[i], message: "" });
  const lim = await call(guild, b.userId, { type: "request", guildId: ids[5], message: "" });
  ok(lim.status === 409 && lim.json.error === "request_limit", "no máximo 5 pedidos pendentes");

  // Aberta: entra direto e os pedidos pendentes somem.
  const l2 = await makeHero({ race: "elfo", level: 5, gold: 2000 }); const t2 = tag();
  const open = await call(guild, l2.userId, { type: "create", name: `Aberta ${t2}`, tag: t2, description: "" });
  ok((await one("select privacy from public.guilds where id=$1", [open.json.id])).privacy === "open", "sem escolher, a guilda é aberta");
  ok((await call(guild, b.userId, { type: "join", guildId: open.json.id })).status === 200, "guilda aberta: entra direto");
  ok(Number((await one("select count(*) n from public.guild_requests where user_id=$1", [b.userId])).n) === 0, "ao entrar numa guilda, os outros pedidos somem");
  const req = await call(guild, outsider.userId, { type: "request", guildId: open.json.id, message: "" });
  ok(req.status === 409, "não há pedido para guilda aberta (é só entrar)");

  // Capitão e Vice-Capitão mudam a privacidade (0043); Membro não.
  const plain = await makeHero({ race: "humano", level: 5 });
  await call(guild, plain.userId, { type: "request", guildId: gid, message: "" });
  await call(guild, leader.userId, { type: "decide", target: await nameOf(plain.userId), accept: true });
  ok((await call(guild, plain.userId, { type: "privacy", privacy: "open" })).status === 409, "membro comum não muda a privacidade");
  ok((await call(guild, a.userId, { type: "privacy", privacy: "open" })).status === 200, "vice-capitão (oficial) deixou a guilda aberta");
  ok((await call(guild, leader.userId, { type: "privacy", privacy: "open" })).status === 200, "capitão (líder) também muda a privacidade");
  ok((await call(guild, outsider.userId, { type: "join", guildId: gid })).status === 200, "depois de aberta, qualquer um entra");

  // Mensagem com link é recusada.
  const c = await makeHero({ race: "anao", level: 5 });
  ok((await call(guild, c.userId, { type: "request", guildId: ids[5], message: "www.site-ruim.com" })).status === 400, "mensagem com link é recusada");
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
