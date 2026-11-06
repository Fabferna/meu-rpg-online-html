// Fluxos de ponta a ponta pelas ROTAS REAIS: caçada, masmorra, história, missão, PvP, forja, venda,
// pets, passe, guilda e troca de herói. Cada passo confere saldo, inventário, contadores e extrato.
// Uso: npm run test:db:setup && npm run test:db:flows
import * as battleStart from "../../src/app/api/battle/start/route";
import * as battleAction from "../../src/app/api/battle/action/route";
import * as dungeonEnter from "../../src/app/api/dungeons/enter/route";
import * as storyBattle from "../../src/app/api/story/battle/route";
import * as questStart from "../../src/app/api/quests/start/route";
import * as questClaim from "../../src/app/api/quests/claim/route";
import * as pvp from "../../src/app/api/pvp/fight/route";
import * as upgrade from "../../src/app/api/smith/upgrade/route";
import * as sell from "../../src/app/api/smith/sell/route";
import * as equip from "../../src/app/api/inventory/equip/route";
import * as pets from "../../src/app/api/pets/action/route";
import * as passClaim from "../../src/app/api/pass/claim/route";
import * as guild from "../../src/app/api/guilds/action/route";
import * as charNew from "../../src/app/api/characters/new/route";
import * as charSwitch from "../../src/app/api/characters/switch/route";
import * as charCreate from "../../src/app/api/character/route";
import { call, makeHero } from "./helpers";
import { fakeAdmin, pool } from "./fakeSupabase";
import { loadPlayer } from "../../src/lib/game/player";
import { DUNGEONS } from "../../src/lib/game/dungeons";
import { QUESTS } from "../../src/lib/game/quests";
import { ITEM_BY_ID, sellPrice, upgradeCost } from "../../src/lib/game/items";
import { PETS, petTrainCost } from "../../src/lib/game/pets";

const ok = (c: boolean, m: string) => { console.log(`${c ? "✅" : "❌"} ${m}`); if (!c) process.exitCode = 1; };
const q = async (sql: string, a: unknown[] = []) => (await pool.query(sql, a)).rows;
const one = async (sql: string, a: unknown[] = []) => (await q(sql, a))[0];
const wallet = async (u: string) => { const r = await one("select gold, gems from wallets where user_id=$1", [u]); return { gold: Number(r.gold), gems: Number(r.gems) }; };
const ch = (u: string) => one("select * from characters where user_id=$1", [u]);
const ledgerSum = async (u: string, cur: string) => Number((await one("select coalesce(sum(delta),0) s from ledger where user_id=$1 and currency=$2", [u, cur])).s);
const fresh = (u: string) => q("update characters set energy=999, energy_updated_at=now(), hp=99999, hp_updated_at=now() where user_id=$1", [u]);

/** Luta até o fim: a cada turno o inimigo fica com 1 de vida (o que importa aqui é o fluxo, não o equilíbrio). */
async function fight(u: string) {
  for (let i = 0; i < 60; i++) {
    await q("update battles set state = jsonb_set(jsonb_set(state, '{enemy,hp}', '1'), '{player,hp}', '99999') where user_id=$1 and status='active'", [u]);
    const r = await call(battleAction, u, { action: "attack" });
    if (r.status !== 200) return r;
    if (r.json.outcome === "won" || r.json.outcome === "lost") return r;
  }
  throw new Error("luta não terminou");
}

/** O saldo da carteira bate com a soma do extrato (nenhuma moeda entra ou sai sem registro). */
async function ledgerMatches(u: string, label: string, start = { gold: 0, gems: 0 }) {
  const w = await wallet(u);
  const g = await ledgerSum(u, "gold"), gm = await ledgerSum(u, "gems");
  ok(w.gold - start.gold === g && w.gems - start.gems === gm, `${label}: carteira bate com o extrato (ouro ${w.gold - start.gold} = ${g}, gemas ${w.gems - start.gems} = ${gm})`);
}

async function main() {
  // ── Caçada ──
  const h = await makeHero({ race: "humano", level: 6, chapter: 2 });
  const w0h = await wallet(h.userId); // ouro inicial vem do create_character (fora do extrato) → base
  await fresh(h.userId);
  const c0 = await ch(h.userId);
  ok((await call(battleStart, h.userId, { enemyId: "vulto_menor" })).status === 200, "caçada: começou");
  const rh = await fight(h.userId);
  const c1 = await ch(h.userId);
  ok(rh.json.outcome === "won" && c1.pve_wins === c0.pve_wins + 1 && (Number(c1.xp) > Number(c0.xp) || c1.level > c0.level), "caçada: vitória conta e dá XP");
  ok((await call(battleStart, h.userId, { enemyId: "lorde_vorlag" })).json.error === "level_too_low", "caçada: inimigo acima do nível é recusado");
  ok((await call(battleAction, h.userId, { action: "attack" })).status === 404, "caçada: atacar sem luta ativa → 404 (no_battle)");

  // ── Masmorra ──
  const d0 = DUNGEONS[0];
  const dh = await makeHero({ race: "anao", level: d0.minLevel + 2, chapter: 3 });
  await fresh(dh.userId);
  const wd = await wallet(dh.userId);
  ok((await call(dungeonEnter, dh.userId, { dungeonId: d0.id })).status === 200, `masmorra "${d0.name}": entrou`);
  const rd = await fight(dh.userId); // a função de luta segue estágio após estágio até o fim
  const st = (rd.json.state as { dungeon?: { stage: number; total: number } }).dungeon;
  ok(rd.json.outcome === "won" && st?.stage === d0.stages.length - 1, `masmorra: venceu os ${d0.stages.length} estágios`);
  const claimKey = (await q("select claim_key from reward_claims where user_id=$1 and claim_key like 'dungeon:%'", [dh.userId])).length;
  ok(claimKey === 1 && (await wallet(dh.userId)).gold - wd.gold >= d0.chest.gold, `masmorra: baú entregue uma vez (+${d0.chest.gold} 🪙 ou mais)`);
  await fresh(dh.userId);
  ok((await call(dungeonEnter, dh.userId, { dungeonId: d0.id })).json.error === "daily_limit", "masmorra: 2ª entrada no dia recusada");

  // ── História ──
  const sh = await makeHero({ race: "elfo", level: 3, chapter: 0 });
  await fresh(sh.userId);
  ok((await call(storyBattle, sh.userId, { chapter: 2 })).status >= 400, "história: não pula capítulo");
  ok((await call(storyBattle, sh.userId, { chapter: 1 })).status === 200, "história: capítulo 1 começou");
  const rs = await fight(sh.userId);
  ok(rs.json.outcome === "won" && (await ch(sh.userId)).story_chapter === 1, "história: venceu e o capítulo 1 ficou concluído");

  // ── Missão ──
  const qh = await makeHero({ race: "gronar", level: 5 });
  await fresh(qh.userId);
  const quest = QUESTS.filter((x) => x.minLevel <= 5).sort((a, b) => a.minLevel - b.minLevel)[0];
  ok((await call(questStart, qh.userId, { questId: quest.id })).status === 200, `missão "${quest.title}": começou`);
  ok((await call(battleStart, qh.userId, { enemyId: "sombra_fraca" })).json.error === "quest_already_running", "missão em andamento bloqueia a caçada");
  ok((await call(questClaim, qh.userId, {})).status === 409, "missão: não dá para receber antes do tempo");
  await q("update quest_runs set ends_at = now() - interval '1 second' where user_id=$1 and status='running'", [qh.userId]);
  const wq = await wallet(qh.userId);
  const rq = await call(questClaim, qh.userId, {});
  ok(rq.status === 200 && (await wallet(qh.userId)).gold >= wq.gold, "missão: recompensa recebida no fim do tempo");
  ok((await call(questClaim, qh.userId, {})).status === 409, "missão: receber de novo é recusado");

  // ── PvP ──
  const a = await makeHero({ race: "humano", level: 10, name: `PvA${Date.now() % 100000}` });
  const b = await makeHero({ race: "elfo", level: 11, name: `PvB${Date.now() % 100000}` });
  await fresh(a.userId);
  const ra0 = (await ch(a.userId)).pvp_rating, rb0 = (await ch(b.userId)).pvp_rating;
  const rp = await call(pvp, a.userId, { opponent: (await ch(b.userId)).name });
  const ra1 = (await ch(a.userId)).pvp_rating, rb1 = (await ch(b.userId)).pvp_rating;
  ok(rp.status === 200 && ra1 - ra0 === -(rb1 - rb0) && ra1 !== ra0, `PvP: duelo feito, pontos trocados (${ra0}→${ra1} × ${rb0}→${rb1})`);
  ok((await call(pvp, a.userId, { opponent: (await ch(a.userId)).name })).status === 404, "PvP: não luta contra si mesmo");
  const far = await makeHero({ race: "anao", level: 30, name: `PvC${Date.now() % 100000}` });
  ok((await call(pvp, a.userId, { opponent: (await ch(far.userId)).name })).json.error === "level_gap", "PvP: diferença de nível > 5 recusada");

  // ── Forja (aprimorar) e venda ──
  const f = await makeHero({ race: "anao", level: 12, gold: 100000 });
  await q("select public.give_item($1,'martelo_forja',1)", [f.userId]);
  const inv = (await one("select id from inventory where user_id=$1 and item_id='martelo_forja'", [f.userId])).id;
  const wf = await wallet(f.userId);
  const ru = await call(upgrade, f.userId, { inventoryId: inv });
  const cost = upgradeCost(ITEM_BY_ID.martelo_forja, 1);
  ok(ru.status === 200 && wf.gold - (await wallet(f.userId)).gold === cost && (await one("select upgrade from inventory where id=$1", [inv])).upgrade === 1, `forja: +1 custou ${cost} 🪙 (100% de chance)`);
  ok((await q("select 1 from ledger where user_id=$1 and reason like 'upgrade:martelo_forja:%'", [f.userId])).length === 1, "forja: aprimoramento no extrato");
  ok((await call(equip, f.userId, { inventoryId: inv })).status === 200, "equipar o item aprimorado");
  ok((await call(sell, f.userId, { inventoryId: inv })).json.error === "item_equipped", "venda: item equipado não pode ser vendido");
  await call(equip, f.userId, { inventoryId: inv });
  const ws = await wallet(f.userId);
  ok((await call(sell, f.userId, { inventoryId: inv })).status === 200 && (await wallet(f.userId)).gold - ws.gold === sellPrice(ITEM_BY_ID.martelo_forja, 1), "venda: item +1 vendido pelo preço com aprimoramento");

  // ── Pets ──
  const p = await makeHero({ race: "elfo", level: 10, gold: 50000 });
  const lobo = PETS.find((x) => x.id === "lobo")!;
  const wp = await wallet(p.userId);
  ok((await call(pets, p.userId, { type: "buy", petId: "lobo" })).status === 200 && wp.gold - (await wallet(p.userId)).gold === lobo.price!.amount, `pets: comprou ${lobo.name} por ${lobo.price!.amount} 🪙`);
  ok((await call(pets, p.userId, { type: "buy", petId: "lobo" })).status === 409, "pets: comprar de novo é recusado");
  ok((await call(pets, p.userId, { type: "buy", petId: "fenix" })).status >= 400, "pets: a Fênix (só do passe) não está à venda");
  await call(pets, p.userId, { type: "activate", petId: "lobo" });
  const wt = await wallet(p.userId);
  ok((await call(pets, p.userId, { type: "train", petId: "lobo" })).status === 200 && wt.gold - (await wallet(p.userId)).gold === petTrainCost(1), `pets: treino 1→2 custou ${petTrainCost(1)} 🪙`);
  const lp = (await loadPlayer(fakeAdmin() as never, p.userId))!;
  ok(lp.gear.some((g) => g.atk === lobo.perLevel.atk! * 2), "pets: bônus do pet nível 2 entra no combate (servidor)");

  // ── Passe ──
  const pa = await makeHero({ race: "humano", level: 4 });
  ok((await call(passClaim, pa.userId, { tier: 1, track: "free" })).json.error === "goal_incomplete", "passe: sem pontos, o nível 1 não libera");
  await q("insert into user_counters (user_id, key, value) values ($1, 'ev:quest', 50) on conflict (user_id, key, day) do update set value = 50", [pa.userId]);
  const rpa = await call(passClaim, pa.userId, { tier: 1, track: "free" });
  ok(rpa.status === 200, "passe: com pontos, nível 1 (grátis) resgatado");
  ok((await call(passClaim, pa.userId, { tier: 1, track: "free" })).json.error === "already_claimed", "passe: resgatar de novo é recusado");
  ok((await call(passClaim, pa.userId, { tier: 1, track: "premium" })).status === 403, "passe: trilha premium sem comprar o passe → 403");

  // ── Guilda ──
  const g1 = await makeHero({ race: "gronar", level: 10, gold: 5000 });
  const g2 = await makeHero({ race: "humano", level: 10, gold: 5000 });
  const tag = `T${Math.floor(Math.random() * 900 + 100)}`;
  const rg = await call(guild, g1.userId, { type: "create", name: `Guilda ${tag}`, tag, description: "" });
  ok(rg.status === 200 && (await wallet(g1.userId)).gold === 4000, "guilda: criada por 1000 🪙");
  const gid = rg.json.id as string;
  ok((await call(guild, g2.userId, { type: "join", guildId: gid })).status === 200, "guilda: outro jogador entrou");
  const wg = await wallet(g2.userId);
  ok((await call(guild, g2.userId, { type: "donate", amount: 300 })).status === 200 && wg.gold - (await wallet(g2.userId)).gold === 300, "guilda: doação de 300 🪙 debitada");
  ok(Number((await one("select treasury from guilds where id=$1", [gid])).treasury) >= 300, "guilda: tesouro recebeu a doação");
  ok((await call(guild, g2.userId, { type: "leave" })).status === 200, "guilda: membro saiu");
  ok((await call(guild, g1.userId, { type: "create", name: `Outra ${tag}`, tag: `X${tag.slice(1)}`, description: "" })).json.error === "already_in_guild", "guilda: líder não cria segunda guilda");

  // ── Troca de herói ──
  const t = await makeHero({ race: "anao", level: 8, gold: 700 });
  await q("select public.give_item($1,'elmo_ferro',1)", [t.userId]);
  const firstName = (await ch(t.userId)).name;
  ok((await call(charNew, t.userId, {})).status === 200 && !(await ch(t.userId)), "troca: herói guardado (conta sem herói ativo)");
  const name2 = `Nv${Date.now() % 1000000}`;
  const rc = await call(charCreate, t.userId, { name: name2, race: "elfo", region: "sylvandell", gender: "female" });
  ok(rc.status === 201 && (await ch(t.userId)).name === name2, "troca: segundo herói criado");
  ok((await q("select 1 from inventory where user_id=$1 and item_id='elmo_ferro'", [t.userId])).length === 0, "troca: o novo herói não herda a bolsa do outro");
  const stash = (await one("select id from character_stash where user_id=$1", [t.userId])).id;
  ok((await call(charSwitch, t.userId, { stashId: stash })).status === 200 && (await ch(t.userId)).name === firstName, "troca: voltou para o primeiro herói");
  ok((await q("select 1 from inventory where user_id=$1 and item_id='elmo_ferro'", [t.userId])).length === 1, "troca: a bolsa do primeiro herói voltou junto");
  ok((await one("select count(*) n from character_stash where user_id=$1", [t.userId])).n === "1", "troca: o segundo herói ficou guardado");
  ok((await call(charSwitch, t.userId, { stashId: "00000000-0000-0000-0000-000000000000" })).status >= 400 && (await ch(t.userId))?.name === firstName, "troca: destino inválido não deixa a conta sem herói");

  // ── Integridade do dinheiro ──
  for (const [u, label, base] of [[h.userId, "caçada", w0h], [qh.userId, "missão", undefined], [f.userId, "forja", undefined]] as const) {
    const start = base ?? { gold: Number((await one("select gold from wallets where user_id=$1", [u])).gold) - (await ledgerSum(u, "gold")), gems: 0 };
    await ledgerMatches(u, label, start);
  }

  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
