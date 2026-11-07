// Encontros raros (Errantes) e Bênção dos Ancestrais pelas rotas reais.
// Uso: npm run test:db:setup && npm run test:db:encounters
import * as battleAction from "../../src/app/api/battle/action/route";
import * as rareStart from "../../src/app/api/rare/start/route";
import * as dailyLogin from "../../src/app/api/daily-login/route";
import { call, makeHero } from "./helpers";
import { fakeAdmin, pool } from "./fakeSupabase";
import { loadPlayer, heroCombatant } from "../../src/lib/game/player";
import { RARE_ENEMIES, rareOf, ENEMY_BY_ID } from "../../src/lib/game/enemies";
import { ITEM_BY_ID } from "../../src/lib/game/items";
import { RARE_RULES, blessingChance } from "../../src/lib/game/encounters";

const ok = (c: boolean, m: string) => { console.log(`${c ? "✅" : "❌"} ${m}`); if (!c) process.exitCode = 1; };
const q = async (sql: string, a: unknown[] = []) => (await pool.query(sql, a)).rows;
async function fight(u: string) {
  for (let i = 0; i < 60; i++) {
    await q("update battles set state = jsonb_set(jsonb_set(state, '{enemy,hp}', '1'), '{player,hp}', '99999') where user_id=$1 and status='active'", [u]);
    const r = await call(battleAction, u, { action: "attack" });
    if (r.status !== 200 || r.json.outcome === "won" || r.json.outcome === "lost") return r;
  }
  throw new Error("luta não terminou");
}

async function main() {
  // ── Errante ──
  const h = await makeHero({ race: "humano", level: 6 });
  ok((await call(rareStart, h.userId, {})).status === 409, "sem Errante esperando: não dá para lutar");
  const idx = rareOf("lobo_corrompido");
  const base = ENEMY_BY_ID.lobo_corrompido, rare = RARE_ENEMIES[idx];
  ok(rare.maxHp > base.maxHp && rare.xp === base.xp * 3 && rare.gold === base.gold * 3, `Errante mais forte (vida ${base.maxHp} → ${rare.maxHp}) e 3× XP/ouro`);
  await q("select public.rare_spawn($1, $2, $3)", [h.userId, idx, RARE_RULES.perDay]);
  const s1 = await call(rareStart, h.userId, {});
  ok(s1.status === 200 && s1.json.enemy === rare.id, "Errante esperando: a luta começou");
  ok((await q("select state->>'rare' r from battles where user_id=$1 and status='active'", [h.userId]))[0]?.r === "true", "a luta está marcada como Errante");
  ok((await call(rareStart, h.userId, {})).status === 409, "o encontro é consumido (não dá para começar duas vezes)");
  const energy0 = (await q("select energy from characters where user_id=$1", [h.userId]))[0].energy;
  const w = await fight(h.userId);
  const loot = (w.json.state as { rewards?: { loot?: { item: string }[] } }).rewards?.loot ?? [];
  const gear = loot.filter((l) => ITEM_BY_ID[l.item]?.slot);
  ok(w.json.outcome === "won" && gear.length === 1 && ["rare", "epic", "legendary"].includes(ITEM_BY_ID[gear[0].item].rarity),
    `vitória: equipamento garantido raro ou melhor (${gear.map((g) => ITEM_BY_ID[g.item].name).join(", ")})`);
  ok((await q("select energy from characters where user_id=$1", [h.userId]))[0].energy === energy0, "Errante não gasta energia");

  // Limite diário: 5 lutas.
  await q("update user_counters set value=$2 where user_id=$1 and key='rare_fight' and day=(now() at time zone 'utc')::date", [h.userId, RARE_RULES.perDay]);
  ok((await q("select public.rare_spawn($1, $2, $3) s", [h.userId, idx, RARE_RULES.perDay]))[0].s === false, `depois de ${RARE_RULES.perDay} Errantes no dia, nenhum novo aparece`);

  // ── Bênção ──
  const b = await makeHero({ race: "elfo", level: 10 });
  const r1 = await call(dailyLogin, b.userId, {});
  ok(r1.status === 200 && !!r1.json.blessing, "recompensa diária já faz o sorteio da Bênção");
  ok((await call(dailyLogin, b.userId, {})).status === 409, "não dá para sortear duas vezes no dia");
  // Força uma derrota e uma vitória direto na função (o número aleatório vem do servidor).
  const c = await makeHero({ race: "anao", level: 10 });
  await q("insert into user_counters (user_id, key, day, value) values ($1, 'login', (now() at time zone 'utc')::date, 1)", [c.userId]);
  const lose = (await q("select public.bless_roll($1, 999999, 50000, 25000, 300000, 1440) r", [c.userId]))[0].r;
  ok(lose.won === false && lose.points === 1, "perdeu: ganha 1 ponto");
  ok(Math.round(blessingChance(1) * 100) === 8 && Math.round(blessingChance(20) * 100) === 30, "chance sobe 2,5% por dia sem ganhar, até 30%");
  const before = heroCombatant((await loadPlayer(fakeAdmin() as never, c.userId))!, 100, 100);
  await q("delete from user_counters where user_id=$1 and key='bless_roll'", [c.userId]);
  const win = (await q("select public.bless_roll($1, 0, 50000, 25000, 300000, 1440) r", [c.userId]))[0].r;
  ok(win.won === true && win.points === 0, "ganhou: pontos voltam a zero");
  const after = heroCombatant((await loadPlayer(fakeAdmin() as never, c.userId))!, 100, 100);
  ok(after.atk[1] > before.atk[1] && after.def > before.def, `abençoado: ataque ${before.atk[1]} → ${after.atk[1]}, defesa ${before.def} → ${after.def}`);
  const d = await makeHero({ race: "gronar", level: 5 });
  ok((await q("select 1 from user_counters where user_id=$1 and key='login'", [d.userId])).length === 0
    && await pool.query("select public.bless_roll($1, 0, 50000, 25000, 300000, 1440)", [d.userId]).then(() => false, () => true), "sem resgatar a recompensa diária não há sorteio");

  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
