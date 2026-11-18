// Expedições da Guilda (0046): tesouro, saguão, grupo, resultado sorteado no servidor e resgate único.
// Uso: npm run test:db:setup && npm run test:db:expeditions
import * as guild from "../../src/app/api/guilds/action/route";
import * as exp from "../../src/app/api/guild-expeditions/action/route";
import * as expList from "../../src/app/api/guild-expeditions/route";
import { call, makeHero } from "./helpers";
import { pool } from "./fakeSupabase";
import { expeditionPower,
  EXPEDITIONS, EXPEDITION_BY_ID, EXPEDITION_RELICS, EXPEDITION_RULES, STRATEGIES, expeditionOdds, expeditionPayout, gearPool, guildXpFor, partyPower,
} from "../../src/lib/game/expeditions";
import { rollExpeditionReward } from "../../src/lib/game/expeditionServer";
import { ITEM_BY_ID } from "../../src/lib/game/items";
import { RACES } from "../../src/lib/game/data";

const ok = (c: boolean, m: string) => { console.log(`${c ? "✅" : "❌"} ${m}`); if (!c) process.exitCode = 1; };
const one = async (sql: string, a: unknown[] = []) => (await pool.query(sql, a)).rows[0];
const tag = () => Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, "A");
const nameOf = async (id: string) => (await one("select name from public.characters where user_id=$1", [id])).name as string;
const gold = async (id: string) => Number((await one("select gold from public.wallets where user_id=$1", [id])).gold);
const is = (r: { status: number; json: Record<string, unknown> }, code: string) => r.status === 409 && r.json.error === code;
const list = async (userId: string) => {
  (globalThis as { __TEST_USER__?: string }).__TEST_USER__ = userId;
  return (await (await expList.GET()).json()) as Record<string, never>;
};

async function main() {
  // ── Catálogo ──
  const races = Object.keys(RACES);
  ok(EXPEDITIONS.every((e) => races.every((r) => gearPool(e, r).length > 0)), "toda expedição tem equipamento para as 5 raças");
  ok(races.every((r) => ITEM_BY_ID[EXPEDITION_RELICS[r as keyof typeof EXPEDITION_RELICS]]?.affinity?.includes(r)), "cada raça tem a sua relíquia lendária de expedição");
  ok(EXPEDITIONS.every((e) => !e.chest || !!ITEM_BY_ID[e.chest.item]), "os baús das expedições existem no catálogo");
  // Anti "fábrica de ouro": nem no melhor caso (grupo cheio, ousada, triunfo) o ouro pago passa do custo.
  const worst = EXPEDITIONS.map((e) => ({ id: e.id, pct: expeditionPayout(e, "triumph", "bold").gold * e.party / e.cost }));
  ok(worst.every((w) => w.pct < 1), `ouro pago nunca passa do custo (pior caso: ${worst.map((w) => `${Math.round(w.pct * 100)}%`).join(", ")})`);
  const e1 = EXPEDITION_BY_ID.trilha_lobos;
  const pw = expeditionPower(e1); // poder recomendado com os monstros mais fortes (MONSTER_DIFFICULTY)
  ok(expeditionOdds(e1, pw, "balanced").success === 0.95 && expeditionOdds(e1, pw / 2, "balanced").success < 0.4
    && expeditionOdds(e1, e1.power, "balanced").success < 0.95
    && expeditionOdds(e1, pw, "bold").success < expeditionOdds(e1, pw, "cautious").success, "chance de sucesso cresce com o poder e muda com a estratégia (precisa de 20% mais poder)");
  const pp = partyPower(e1, [{ power: 100, race: "elfo" }, { power: 100, race: "anao" }]);
  ok(pp.total === Math.round((115 + 100) * 1.04), "poder do grupo: +15% para raça favorecida e +4% por raça diferente");

  // ── Guilda com tesouro ──
  const cap = await makeHero({ race: "humano", level: 20, gold: 60000 });
  const t1 = tag();
  const gid = (await call(guild, cap.userId, { type: "create", name: `Exp ${t1}`, tag: t1, description: "" })).json.id as string;
  const mk = async (race: "elfo" | "anao" | "gronar" | "aetheliano") => { const h = await makeHero({ race, level: 15, gold: 100 }); await call(guild, h.userId, { type: "join", guildId: gid }); return h; };
  const squad = await mk("elfo"), rec = await mk("anao"), rec2 = await mk("gronar"), rec3 = await mk("aetheliano");
  await call(guild, cap.userId, { type: "role", target: await nameOf(squad.userId), role: "squad_leader" });
  const treasury = async () => Number((await one("select treasury from public.guilds where id=$1", [gid])).treasury);

  ok(is(await call(exp, cap.userId, { type: "start", expedition: "trilha_lobos" }), "treasury_low"), "tesouro vazio: não dá para organizar");
  await call(guild, cap.userId, { type: "donate", amount: 3000 });
  ok(is(await call(exp, rec.userId, { type: "start", expedition: "trilha_lobos" }), "no_permission"), "Membro não organiza (gasta o ouro da guilda)");
  ok(is(await call(exp, cap.userId, { type: "start", expedition: "trono_tita" }), "guild_level_low"), "incursão grande exige nível de guilda");
  ok((await call(exp, cap.userId, { type: "start", expedition: "nao_existe" })).status === 404, "expedição desconhecida é recusada");

  // ── Saguão ──
  const t0 = await treasury();
  const s = await call(exp, squad.userId, { type: "start", expedition: "trilha_lobos", strategy: "bold" });
  const id = s.json.id as string;
  ok(s.status === 200 && t0 - (await treasury()) === e1.cost, `Líder de Esquadrão organizou: ${e1.cost} 🪙 saíram do tesouro`);
  const row = async () => one("select *, extract(epoch from departs_at - created_at)::int lobby, extract(epoch from ends_at - departs_at)::int trip from public.guild_expeditions where id=$1", [id]);
  ok((await row()).lobby === EXPEDITION_RULES.lobbySec && (await row()).trip === e1.minutes * 60, "saguão de 5 minutos e viagem com a duração do catálogo");
  ok(!!(await one("select 1 x from public.chat_messages where channel=$1 and body like '%Trilha dos Lobos%'", [`guild:${gid}`])), "aviso no chat da guilda");
  ok((await call(exp, rec.userId, { type: "join", id })).status === 200 && (await call(exp, rec2.userId, { type: "join", id })).status === 200, "dois membros entraram no grupo");
  ok(is(await call(exp, rec3.userId, { type: "join", id }), "expedition_full"), `grupo cheio (${e1.party})`);
  ok(is(await call(exp, rec.userId, { type: "start", expedition: "trilha_lobos" }), "no_permission") && is(await call(exp, squad.userId, { type: "start", expedition: "trilha_lobos" }), "already_on_expedition"), "quem já está numa expedição não organiza outra");
  ok((await call(exp, rec2.userId, { type: "leave", id })).status === 200 && (await call(exp, rec3.userId, { type: "join", id })).status === 200, "um saiu durante o saguão e outro entrou no lugar");
  ok(is(await call(exp, squad.userId, { type: "leave", id }), "invalid_action"), "o organizador não sai (ele cancela)");
  ok(is(await call(exp, rec.userId, { type: "depart", id }), "no_permission") && is(await call(exp, rec.userId, { type: "cancel", id }), "no_permission"), "Membro não parte nem cancela a expedição dos outros");
  const outsider = await makeHero({ race: "humano", level: 20 });
  ok(is(await call(exp, outsider.userId, { type: "join", id }), "not_in_guild"), "quem é de fora não entra");

  const v1 = await list(rec.userId);
  ok(v1.guild && (v1.open as never[]).length === 1 && (v1.open[0] as { phase: string; members: unknown[]; joined: boolean }).phase === "lobby"
    && (v1.open[0] as { members: unknown[] }).members.length === 3 && (v1.open[0] as { joined: boolean }).joined && Number(v1.myPower) > 0, "a tela mostra o saguão, os 3 participantes e o meu poder");

  // ── Partida e viagem ──
  ok((await call(exp, squad.userId, { type: "depart", id })).status === 200 && (await row()).trip === e1.minutes * 60, "organizador partiu antes do fim do saguão");
  ok(is(await call(exp, rec2.userId, { type: "join", id }), "expedition_departed") && is(await call(exp, squad.userId, { type: "cancel", id }), "expedition_departed"), "depois da partida ninguém entra nem cancela");
  ok(is(await call(exp, rec.userId, { type: "claim", id }), "expedition_running"), "não dá para resgatar antes da volta");
  ok((await list(rec.userId)).open[0].phase === "running", "fase: em viagem");

  // ── Volta: resultado único e resgate único ──
  await pool.query("update public.guild_expeditions set ends_at = now() - interval '1 second' where id=$1", [id]);
  const lvl0 = await one("select level, xp from public.guilds where id=$1", [gid]);
  const g0 = await gold(rec.userId);
  const [c1, c2] = await Promise.all([call(exp, rec.userId, { type: "claim", id }), call(exp, rec.userId, { type: "claim", id })]);
  const done = await row();
  ok(done.status === "done" && ["triumph", "success", "fail"].includes(done.outcome) && done.report.length === 2, `resultado sorteado no servidor: ${done.outcome} (poder ${done.power})`);
  ok([c1.status, c2.status].sort().join() === "200,409", "clique duplo: só um resgate vale");
  const won = (c1.status === 200 ? c1 : c2).json as { outcome: string; reward: { xp: number; gold: number; items: { item: string; qty: number }[] } };
  const pay = expeditionPayout(e1, done.outcome, "bold");
  ok(won.reward.xp === pay.xp && won.reward.gold === pay.gold && (await gold(rec.userId)) - g0 === pay.gold, `participante recebeu ${pay.xp} XP e ${pay.gold} 🪙 (estratégia ousada, ${done.outcome})`);
  ok(done.outcome === "fail" ? won.reward.items.length === 0 : won.reward.items.some((i) => i.item === "pocao_vida"), "itens só em sucesso (poções garantidas)");
  const lvl1 = await one("select level, xp from public.guilds where id=$1", [gid]);
  ok(lvl1.level > lvl0.level || Number(lvl1.xp) - Number(lvl0.xp) === guildXpFor(e1, done.outcome), `guilda ganhou ${guildXpFor(e1, done.outcome)} de XP`);
  ok((await call(exp, squad.userId, { type: "claim", id })).json.outcome === done.outcome && (await call(exp, rec3.userId, { type: "claim", id })).json.outcome === done.outcome, "todos recebem o MESMO resultado");
  ok(is(await call(exp, rec2.userId, { type: "claim", id }), "not_on_expedition"), "quem saiu no saguão não resgata");
  const v2 = await list(rec.userId);
  ok((v2.open as never[]).length === 0 && (v2.ready as never[]).length === 0 && (v2.history as { reward: unknown }[])[0]?.reward != null, "depois de resgatar, vai para o histórico com a recompensa");

  // ── Solo, cancelamento e limite ──
  await call(guild, cap.userId, { type: "donate", amount: 20000 });
  const tb = await treasury();
  const solo = await call(exp, cap.userId, { type: "start", expedition: "trilha_lobos", solo: true });
  const soloRow = await one("select max_party, extract(epoch from departs_at - created_at)::int lobby from public.guild_expeditions where id=$1", [solo.json.id]);
  ok(solo.status === 200 && soloRow.lobby === 0 && soloRow.max_party === 1 && is(await call(exp, rec.userId, { type: "join", id: solo.json.id }), "expedition_departed"), "sozinho: parte na hora e ninguém entra");
  const c = await call(exp, squad.userId, { type: "start", expedition: "ninho_harpias" });
  const afterStart = await treasury();
  ok((await call(exp, cap.userId, { type: "cancel", id: c.json.id })).status === 200 && (await treasury()) - afterStart === EXPEDITION_BY_ID.ninho_harpias.cost, "Capitão cancelou no saguão: o ouro voltou para o tesouro");
  ok(is(await call(exp, squad.userId, { type: "claim", id: c.json.id }), "expedition_running") || (await call(exp, squad.userId, { type: "claim", id: c.json.id })).status === 409, "expedição cancelada não dá recompensa");
  ok(tb - (await treasury()) === e1.cost, "só a expedição que partiu foi cobrada");
  // Lazy settle pela tela: quem abre a aba fecha as que voltaram.
  await pool.query("update public.guild_expeditions set ends_at = now() - interval '1 second' where id=$1", [solo.json.id]);
  const v3 = await list(cap.userId);
  ok((v3.ready as { outcome: string }[]).length === 1 && !!v3.ready[0].outcome && !v3.busy, "abrir a aba fecha a expedição que voltou e mostra 'pronta para resgatar'");
  for (let i = 0; i < EXPEDITION_RULES.maxActive; i++) {
    const h = await makeHero({ race: "humano", level: 10 }); await call(guild, h.userId, { type: "join", guildId: gid });
    await pool.query("update public.guild_members set role='squad_leader' where user_id=$1", [h.userId]);
    await call(exp, h.userId, { type: "start", expedition: "trilha_lobos", solo: true });
  }
  ok(is(await call(exp, squad.userId, { type: "start", expedition: "trilha_lobos" }), "expedition_limit"), `no máximo ${EXPEDITION_RULES.maxActive} expedições da guilda ao mesmo tempo`);

  // ── Sorteio de recompensas (estatística) ──
  const raid = EXPEDITION_BY_ID.trono_tita;
  let relic = 0, gear = 0, both = 0, wrong = 0; const N = 6000;
  for (let i = 0; i < N; i++) {
    const r = rollExpeditionReward(raid, "success", "balanced", "anao");
    const eq = r.items.filter((x) => ITEM_BY_ID[x.item]?.slot);
    if (eq.length > 1) both++;
    for (const x of eq) { if (x.item === EXPEDITION_RELICS.anao) relic++; else gear++; if (!ITEM_BY_ID[x.item].affinity?.includes("anao")) wrong++; }
  }
  ok(both === 0 && wrong === 0, "no máximo um equipamento por expedição, sempre da raça do herói");
  ok(Math.abs(relic / N - raid.relic!) < 0.015, `relíquia lendária: ${(relic / N * 100).toFixed(1)}% (esperado ${raid.relic! * 100}%)`);
  ok(Math.abs(gear / N - raid.gear.chance * (1 - raid.relic!)) < 0.02, `equipamento da raça: ${(gear / N * 100).toFixed(1)}%`);
  ok(rollExpeditionReward(raid, "fail", "bold", "anao").items.length === 0 && rollExpeditionReward(raid, "fail", "balanced", "anao").gold === Math.round(raid.gold * EXPEDITION_RULES.failShare), "fracasso: 25% do ouro/XP e nenhum item");
  ok(STRATEGIES.cautious.reward < 1 && STRATEGIES.bold.reward > 1, "estratégias mudam a recompensa");

  // Bolsa cheia: equipamento vira ouro.
  const full = await makeHero({ race: "anao", level: 30 }); await call(guild, full.userId, { type: "join", guildId: gid });
  await pool.query("insert into public.inventory (user_id, item_id, qty, slot) select $1, 'elmo_ferro', 1, 'helmet' from generate_series(1, 70)", [full.userId]);
  const fid = (await one("insert into public.guild_expeditions (guild_id, expedition, cost, minutes, max_party, status, outcome, departs_at, ends_at) values ($1,'trono_tita',1,1,5,'done','success',now(),now()) returning id", [gid])).id;
  await pool.query("insert into public.guild_expedition_members (expedition_id, user_id, name, race, power) values ($1,$2,'x','anao',1)", [fid, full.userId]);
  const gf = await gold(full.userId);
  const rw = (await one("select public.guild_expedition_claim($1,$2,10,100,$3,60) r", [full.userId, fid, JSON.stringify([{ item: "martelo_vanguarda", qty: 1, gold: 2900 }])])).r;
  ok(rw.gold === 3000 && (await gold(full.userId)) - gf === 3000 && rw.items[0].sold === 2900 && !(await one("select 1 x from public.inventory where user_id=$1 and item_id='martelo_vanguarda'", [full.userId])), "bolsa cheia: o item vira ouro pelo valor de venda");

  // Permissões do banco.
  const asUser = async (u: string, sql: string) => {
    const c2 = await pool.connect();
    try { await c2.query("begin"); await c2.query("set local role authenticated"); await c2.query("select set_config('request.jwt.claim.sub', $1, true)", [u]); await c2.query(sql); await c2.query("rollback"); return null; }
    catch (e) { await c2.query("rollback"); return (e as Error).message; } finally { c2.release(); }
  };
  ok(!!(await asUser(rec.userId, "select * from public.guild_expeditions")) && !!(await asUser(rec.userId, `select public.guild_expedition_claim('${rec.userId}', '${fid}', 999999, 999999, '[]', 60)`)), "jogador não lê as tabelas nem chama o resgate direto");
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
