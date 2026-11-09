// Guilda "esquadrão" (0043): cargos e permissões, benefícios por nível e cofre de itens com taxa.
// Uso: npm run test:db:setup && npm run test:db:squads
import * as guild from "../../src/app/api/guilds/action/route";
import { call, makeHero } from "./helpers";
import { fakeAdmin, pool } from "./fakeSupabase";
import { loadPlayer, heroCombatant } from "../../src/lib/game/player";
import { GUILD, guildPerks, guildXpNext, vaultFee } from "../../src/lib/game/guilds";
import { ITEM_BY_ID, sellPrice } from "../../src/lib/game/items";
import { BAG_LIMIT } from "../../src/lib/game/loot";

const ok = (c: boolean, m: string) => { console.log(`${c ? "✅" : "❌"} ${m}`); if (!c) process.exitCode = 1; };
const one = async (sql: string, a: unknown[] = []) => (await pool.query(sql, a)).rows[0];
const tag = () => Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, "A");
const nameOf = async (id: string) => (await one("select name from public.characters where user_id=$1", [id])).name as string;
const roleOf = async (id: string) => (await one("select role from public.guild_members where user_id=$1", [id]))?.role ?? null;
const gold = async (id: string) => Number((await one("select gold from public.wallets where user_id=$1", [id])).gold);
const is = (r: { status: number; json: Record<string, unknown> }, code: string) => r.status === 409 && r.json.error === code;

async function main() {
  // ── Espelho TS × SQL ──
  let mirror = true;
  for (let l = 1; l <= 20; l++) {
    const r = await one("select public.f_guild_xp_next($1) x, public.f_guild_member_limit($1) m, public.f_guild_vault_slots($1) v", [l]);
    const p = guildPerks(l);
    if (Number(r.x) !== guildXpNext(l) || r.m !== p.memberLimit || r.v !== p.vaultSlots) mirror = false;
  }
  ok(mirror, "fórmulas de XP, vagas e espaços do cofre iguais no TS e no SQL (níveis 1–20)");

  // ── Cargos ──
  const cap = await makeHero({ race: "humano", level: 10, gold: 200000 });
  const t1 = tag();
  const gid = (await call(guild, cap.userId, { type: "create", name: `Esq ${t1}`, tag: t1, description: "" })).json.id as string;
  const mk = async () => { const h = await makeHero({ race: "elfo", level: 8, gold: 3000 }); await call(guild, h.userId, { type: "join", guildId: gid }); return h; };
  const [vice, squad, rec, rec2] = [await mk(), await mk(), await mk(), await mk()];
  const n = { vice: await nameOf(vice.userId), squad: await nameOf(squad.userId), rec: await nameOf(rec.userId), rec2: await nameOf(rec2.userId), cap: await nameOf(cap.userId) };

  ok(is(await call(guild, rec.userId, { type: "role", target: n.rec2, role: "squad_leader" }), "no_permission"), "Membro não define cargos");
  ok((await call(guild, cap.userId, { type: "role", target: n.vice, role: "officer" })).status === 200 && (await roleOf(vice.userId)) === "officer", "Capitão nomeou um Vice-Capitão");
  ok((await call(guild, vice.userId, { type: "role", target: n.squad, role: "squad_leader" })).status === 200 && (await roleOf(squad.userId)) === "squad_leader", "Vice-Capitão nomeou um Líder de Esquadrão");
  ok(is(await call(guild, vice.userId, { type: "role", target: n.rec, role: "officer" }), "no_permission"), "Vice-Capitão não nomeia outro Vice");
  ok(is(await call(guild, vice.userId, { type: "manage", target: n.cap, op: "kick" }), "no_permission"), "Vice-Capitão não expulsa o Capitão");
  ok(is(await call(guild, squad.userId, { type: "manage", target: n.rec, op: "kick" }), "no_permission"), "Líder de Esquadrão não expulsa");
  ok(is(await call(guild, squad.userId, { type: "role", target: n.rec, role: "squad_leader" }), "no_permission"), "Líder de Esquadrão não define cargos");
  ok(is(await call(guild, squad.userId, { type: "privacy", privacy: "private" }), "no_permission"), "Líder de Esquadrão não muda configurações");
  ok(is(await call(guild, squad.userId, { type: "describe", description: "oi" }), "no_permission"), "Líder de Esquadrão não edita a descrição");
  ok((await call(guild, vice.userId, { type: "describe", description: "Touros de Aethelgard" })).status === 200
    && (await one("select description from public.guilds where id=$1", [gid])).description === "Touros de Aethelgard", "Vice-Capitão editou a descrição");
  ok((await call(guild, vice.userId, { type: "privacy", privacy: "private" })).status === 200, "Vice-Capitão deixou a guilda privada");

  // Pedidos: Líder de Esquadrão aceita.
  const cand = await makeHero({ race: "anao", level: 6 });
  await call(guild, cand.userId, { type: "request", guildId: gid, message: "" });
  ok(is(await call(guild, rec.userId, { type: "decide", target: await nameOf(cand.userId), accept: true }), "no_permission"), "Membro não aceita pedidos");
  ok((await call(guild, squad.userId, { type: "decide", target: await nameOf(cand.userId), accept: true })).status === 200, "Líder de Esquadrão aceitou um pedido");
  await call(guild, cap.userId, { type: "privacy", privacy: "open" });

  // Limite de vagas por cargo.
  const v2 = await mk(), v3 = await mk();
  await call(guild, cap.userId, { type: "role", target: await nameOf(v2.userId), role: "officer" });
  ok(is(await call(guild, cap.userId, { type: "role", target: await nameOf(v3.userId), role: "officer" }), "role_full"), `no máximo ${GUILD.maxVice} Vice-Capitães`);
  ok((await call(guild, cap.userId, { type: "role", target: await nameOf(v2.userId), role: "member" })).status === 200 && (await roleOf(v2.userId)) === "member", "Capitão rebaixou um Vice a Membro");
  ok((await call(guild, vice.userId, { type: "manage", target: n.rec2, op: "kick" })).status === 200 && !(await roleOf(rec2.userId)), "Vice-Capitão expulsou um Membro");

  // ── Progressão e bônus ──
  const before = heroCombatant((await loadPlayer(fakeAdmin() as never, rec.userId))!, 100, 100);
  ok((await call(guild, cap.userId, { type: "donate", amount: 45000 })).status === 200, "doação de 45.000 🪙");
  let g = await one("select level, xp, member_limit from public.guilds where id=$1", [gid]);
  ok(g.level === 10 && g.member_limit === guildPerks(10).memberLimit, `guilda no nível 10 com ${guildPerks(10).memberLimit} vagas`);
  ok((await call(guild, cap.userId, { type: "donate", amount: 10000 })).status === 200 && (await one("select level from public.guilds where id=$1", [gid])).level === 11, "passa do antigo teto (nível 11)");
  const after = heroCombatant((await loadPlayer(fakeAdmin() as never, rec.userId))!, 100, 100);
  const p11 = guildPerks(11);
  ok(after.atk[1] > before.atk[1] && after.def >= before.def && after.magic[1] > before.magic[1],
    `bônus de combate aplicado (+${p11.atkPct}% atq, +${p11.defPct}% def): ataque ${before.atk[1]}→${after.atk[1]}, defesa ${before.def}→${after.def}`);
  const solo = heroCombatant((await loadPlayer(fakeAdmin() as never, cand.userId))!, 100, 100);
  await call(guild, cand.userId, { type: "leave" });
  const out = heroCombatant((await loadPlayer(fakeAdmin() as never, cand.userId))!, 100, 100);
  ok(out.atk[1] < solo.atk[1], "quem sai da guilda perde o bônus");

  // ── Cofre ──
  await pool.query("select public.give_item($1,'elmo_ferro',1)", [rec.userId]);
  // Todo herói começa com 3 poções: zera para contar certo.
  await pool.query("delete from public.inventory where item_id='pocao_vida' and user_id = any($1)", [[rec.userId, vice.userId]]);
  await pool.query("select public.give_item($1,'pocao_vida',5)", [rec.userId]);
  const inv = async (u: string, item: string) => one("select id, qty, upgrade, equipped from public.inventory where user_id=$1 and item_id=$2", [u, item]);
  await pool.query("update public.inventory set upgrade=3 where id=$1", [(await inv(rec.userId, "elmo_ferro")).id]);

  const outsider = await makeHero({ race: "gronar", level: 8, gold: 5000 });
  await pool.query("select public.give_item($1,'elmo_ferro',1)", [outsider.userId]);
  ok(is(await call(guild, outsider.userId, { type: "vault_deposit", inventoryId: (await inv(outsider.userId, "elmo_ferro")).id }), "not_in_guild"), "quem não tem guilda não deposita");
  ok(is(await call(guild, squad.userId, { type: "vault_deposit", inventoryId: (await inv(rec.userId, "elmo_ferro")).id }), "not_owner"), "não dá para depositar item de outro jogador");

  await pool.query("update public.inventory set equipped=true where id=$1", [(await inv(rec.userId, "elmo_ferro")).id]);
  ok(is(await call(guild, rec.userId, { type: "vault_deposit", inventoryId: (await inv(rec.userId, "elmo_ferro")).id }), "item_equipped"), "item equipado não vai para o cofre");
  await pool.query("update public.inventory set equipped=false where user_id=$1", [rec.userId]);

  const dep = await call(guild, rec.userId, { type: "vault_deposit", inventoryId: (await inv(rec.userId, "elmo_ferro")).id });
  ok(dep.status === 200 && !(await inv(rec.userId, "elmo_ferro")), "Membro depositou um elmo (saiu da bolsa)");
  const vElmo = await one("select id, upgrade from public.guild_inventory where guild_id=$1 and item_id='elmo_ferro'", [gid]);
  ok(vElmo?.upgrade === 3, "o aprimoramento (+3) foi junto para o cofre");
  ok(is(await call(guild, rec.userId, { type: "vault_deposit", inventoryId: (await inv(rec.userId, "pocao_vida")).id, qty: 9 }), "invalid_action"), "não deposita mais do que tem");
  await call(guild, rec.userId, { type: "vault_deposit", inventoryId: (await inv(rec.userId, "pocao_vida")).id, qty: 2 });
  await call(guild, rec.userId, { type: "vault_deposit", inventoryId: (await inv(rec.userId, "pocao_vida")).id, qty: 2 });
  const vPot = await one("select id, qty from public.guild_inventory where guild_id=$1 and item_id='pocao_vida'", [gid]);
  ok(vPot.qty === 4 && (await inv(rec.userId, "pocao_vida")).qty === 1
    && Number((await one("select count(*) n from public.guild_inventory where guild_id=$1", [gid])).n) === 2, "poções empilham num espaço só (4 no cofre, 1 na bolsa)");

  // Retirada: membro novo espera 24h.
  ok(is(await call(guild, rec.userId, { type: "vault_withdraw", vaultId: vElmo.id }), "vault_locked"), "Membro com menos de 24h de guilda não retira");
  await pool.query("update public.guild_members set joined_at = now() - interval '2 days' where guild_id=$1", [gid]);
  ok(is(await call(guild, outsider.userId, { type: "vault_withdraw", vaultId: vElmo.id }), "not_in_guild"), "quem é de fora não retira");

  const elmo = ITEM_BY_ID.elmo_ferro;
  const feeMember = vaultFee(sellPrice(elmo, 3), 1, "member"), feeVice = vaultFee(sellPrice(elmo, 3), 1, "officer");
  ok(feeVice < feeMember, `taxa menor para o comando (Membro ${feeMember} 🪙, Vice ${feeVice} 🪙)`);

  await pool.query("update public.wallets set gold = 0 where user_id=$1", [squad.userId]);
  ok(is(await call(guild, squad.userId, { type: "vault_withdraw", vaultId: vElmo.id }), "insufficient_funds"), "sem ouro para a taxa: não retira");
  ok(!!(await one("select 1 x from public.guild_inventory where id=$1", [vElmo.id])), "…e o item continua no cofre");

  const g0 = await gold(v3.userId), tr0 = Number((await one("select treasury from public.guilds where id=$1", [gid])).treasury);
  const wd = await call(guild, v3.userId, { type: "vault_withdraw", vaultId: vElmo.id });
  const got = await inv(v3.userId, "elmo_ferro");
  ok(wd.status === 200 && wd.json.fee === feeMember && g0 - (await gold(v3.userId)) === feeMember, `outro Membro retirou o elmo pagando ${feeMember} 🪙`);
  ok(got?.upgrade === 3 && !got.equipped, "o elmo chegou na bolsa com +3");
  ok(Number((await one("select treasury from public.guilds where id=$1", [gid])).treasury) - tr0 === feeMember, "a taxa foi para o tesouro da guilda");
  ok(is(await call(guild, rec.userId, { type: "vault_withdraw", vaultId: vElmo.id }), "vault_item_gone"), "item já retirado: não sai duas vezes");

  const gv = await gold(vice.userId);
  const wp = await call(guild, vice.userId, { type: "vault_withdraw", vaultId: vPot.id, qty: 3 });
  const potFee = vaultFee(sellPrice(ITEM_BY_ID.pocao_vida, 0), 3, "officer");
  ok(wp.status === 200 && gv - (await gold(vice.userId)) === potFee && (await inv(vice.userId, "pocao_vida")).qty === 3
    && (await one("select qty from public.guild_inventory where id=$1", [vPot.id])).qty === 1, `Vice retirou 3 poções por ${potFee} 🪙 (sobrou 1 no cofre)`);

  // Bolsa cheia.
  await pool.query("insert into public.inventory (user_id, item_id, qty, slot) select $1, 'elmo_ferro', 1, 'head' from generate_series(1, $2)", [rec.userId, BAG_LIMIT]);
  const gb = await gold(rec.userId);
  await pool.query("select public.give_item($1,'elmo_ferro',1)", [squad.userId]);
  await pool.query("update public.wallets set gold = 5000 where user_id=$1", [squad.userId]);
  await call(guild, squad.userId, { type: "vault_deposit", inventoryId: (await inv(squad.userId, "elmo_ferro")).id });
  const v2id = (await one("select id from public.guild_inventory where guild_id=$1 and item_id='elmo_ferro'", [gid])).id;
  ok(is(await call(guild, rec.userId, { type: "vault_withdraw", vaultId: v2id }), "bag_full") && (await gold(rec.userId)) === gb, "bolsa cheia: não retira e não cobra");

  // Cofre cheio (limite pelo nível da guilda).
  const slots = guildPerks(11).vaultSlots;
  const used = Number((await one("select count(*) n from public.guild_inventory where guild_id=$1", [gid])).n);
  await pool.query("insert into public.guild_inventory (guild_id, item_id) select $1, 'elmo_ferro' from generate_series(1, $2)", [gid, slots - used]);
  const anyElmo = (await one("select id from public.inventory where user_id=$1 and item_id='elmo_ferro' limit 1", [rec.userId])).id;
  ok(is(await call(guild, rec.userId, { type: "vault_deposit", inventoryId: anyElmo }), "vault_full"), `cofre cheio no nível 11 (${slots} espaços)`);
  ok((await call(guild, rec.userId, { type: "vault_deposit", inventoryId: (await inv(rec.userId, "pocao_vida")).id, qty: 1 })).status === 200, "…mas poção ainda empilha no espaço que já existe");

  const logs = await pool.query("select action, count(*)::int n from public.guild_vault_log where guild_id=$1 group by action", [gid]);
  ok(logs.rows.some((r) => r.action === "deposit" && r.n >= 4) && logs.rows.some((r) => r.action === "withdraw" && r.n === 2), "histórico do cofre registra depósitos e retiradas");

  // RLS: só membros leem o cofre; ninguém escreve direto.
  const asUser = async (u: string, sql: string) => {
    const c = await pool.connect();
    try {
      await c.query("begin"); await c.query("set local role authenticated"); await c.query("select set_config('request.jwt.claim.sub', $1, true)", [u]);
      const r = await c.query(sql); await c.query("rollback"); return { rows: r.rows, error: null as string | null };
    } catch (e) { await c.query("rollback"); return { rows: [], error: (e as Error).message }; } finally { c.release(); }
  };
  ok((await asUser(rec.userId, "select id from public.guild_inventory")).rows.length > 0, "RLS: membro enxerga o cofre da sua guilda");
  ok((await asUser(outsider.userId, "select id from public.guild_inventory")).rows.length === 0, "RLS: quem é de fora não enxerga o cofre");
  ok(!!(await asUser(rec.userId, "delete from public.guild_inventory")).error, "RLS: jogador não apaga itens do cofre direto");
  ok(!!(await asUser(rec.userId, `select public.guild_vault_withdraw('${rec.userId}', '${v2id}', 1, 0, 999, 0)`)).error, "jogador não chama a função de retirada direto (taxa 0)");

  // Sucessão: Capitão sai → o Vice mais antigo assume.
  ok((await call(guild, cap.userId, { type: "leave" })).status === 200 && (await roleOf(vice.userId)) === "leader", "Capitão saiu: o Vice-Capitão assumiu o comando");
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
