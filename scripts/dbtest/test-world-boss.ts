// Chefe do Mundo: horário (21h Brasília), ataque fora do horário, resgate único e sorteio do item da raça.
// Uso: npm run test:db:setup && npm run test:db:worldboss
import * as attack from "../../src/app/api/world-boss/attack/route";
import * as claim from "../../src/app/api/world-boss/claim/route";
import { call, makeHero } from "./helpers";
import { pool } from "./fakeSupabase";
import { WORLD_BOSS_ITEMS, WORLD_BOSS_RULES, capHit, worldBossMaxHp, worldBossSchedule, worldBossReward } from "../../src/lib/game/worldBoss";
import type { RaceId } from "../../src/lib/game/data";

const ok = (c: boolean, m: string) => { console.log(`${c ? "✅" : "❌"} ${m}`); if (!c) process.exitCode = 1; };
const one = async (sql: string, a: unknown[] = []) => (await pool.query(sql, a)).rows[0];

async function main() {
  // ── Horário (Brasília = UTC−3) ──
  const a = worldBossSchedule(new Date("2026-11-07T23:59:00Z")); // 20:59 de 07/11
  ok(a.day === "2026-11-06" && !a.open && a.nextStartsAt === "2026-11-08T00:00:00.000Z", "horário: 20h59 → fechado, próximo às 21h do mesmo dia");
  const b = worldBossSchedule(new Date("2026-11-08T00:30:00Z")); // 21:30 de 07/11
  ok(b.day === "2026-11-07" && b.open && b.endsAt === "2026-11-08T01:00:00.000Z", "horário: 21h30 → aberto (evento de 07/11 até 22h)");
  const c = worldBossSchedule(new Date("2026-11-08T01:00:00Z")); // 22:00
  ok(c.day === "2026-11-07" && !c.open && c.nextStartsAt === "2026-11-09T00:00:00.000Z", "horário: 22h → fechado, próximo amanhã às 21h");

  // ── Dificuldade: vida mínima alta e teto por ataque (ninguém derruba sozinho) ──
  const hp1 = worldBossMaxHp([20]);
  ok(hp1 >= 40000, `chefe com 1 jogador ativo: ${hp1.toLocaleString("pt-BR")} de vida`);
  ok(capHit(999999, hp1) === Math.ceil(hp1 * WORLD_BOSS_RULES.maxHitPct), `um ataque tira no máximo ${WORLD_BOSS_RULES.maxHitPct * 100}% da vida`);
  ok(capHit(999999, hp1) * WORLD_BOSS_RULES.attacksPerEvent < hp1, "um jogador sozinho, com os 5 ataques no máximo, não derruba o chefe");
  ok(worldBossMaxHp(Array(30).fill(25)) > worldBossMaxHp([25]), "mais jogadores ativos → mais vida");

  const sch = worldBossSchedule();
  const h = await makeHero({ race: "elfo", level: 20 });
  const r = await call(attack, h.userId, {});
  ok(sch.open ? r.status === 200 : r.status === 409 && r.json.error === "world_boss_closed", `ataque ${sch.open ? "no horário funciona" : "fora do horário é recusado"} (${r.status})`);

  // ── Resgate: monta um chefe derrotado no evento atual com 40 participantes ──
  await pool.query("delete from public.world_bosses where day = $1", [sch.day]);
  await pool.query("insert into public.world_bosses (day, boss_id, hp, max_hp, starts_at, ends_at, defeated_at) values ($1, 'behemoth', 0, 5000, now() - interval '30 min', now() + interval '30 min', now())", [sch.day]);
  const races: RaceId[] = ["humano", "elfo", "anao", "gronar", "aetheliano"];
  const heroes: { id: string; race: RaceId }[] = [];
  for (let i = 0; i < 40; i++) {
    const race = races[i % races.length];
    const x = await makeHero({ race, level: 10 });
    heroes.push({ id: x.userId, race });
    await pool.query("insert into public.world_boss_hits (day, user_id, damage, attacks) values ($1, $2, $3, 3)", [sch.day, x.userId, 1000 - i * 10]);
  }
  const noHit = await makeHero({ race: "humano", level: 10 });
  ok((await call(claim, noHit.userId, {})).status === 409, "resgate: quem não causou dano não recebe");

  let items = 0, wrongRace = 0;
  const g0 = Number((await one("select gold from public.wallets where user_id=$1", [heroes[0].id])).gold);
  for (const x of heroes) {
    const res = await call(claim, x.id, {});
    if (res.status !== 200) { ok(false, `resgate falhou: ${JSON.stringify(res.json)}`); continue; }
    if (res.json.item) { items++; if (!WORLD_BOSS_ITEMS[x.race].includes(res.json.item as string)) wrongRace++; }
    if (res.json.item) {
      const inv = await one("select count(*) n from public.inventory where user_id=$1 and item_id=$2", [x.id, res.json.item]);
      if (Number(inv.n) !== 1) ok(false, "item sorteado não chegou na bolsa");
    }
  }
  const g1 = Number((await one("select gold from public.wallets where user_id=$1", [heroes[0].id])).gold);
  ok(g1 - g0 === worldBossReward(true, 10, 1).gold, `resgate: 1º lugar recebeu ${g1 - g0} de ouro`);
  const gems = Number((await one("select gems from public.wallets where user_id=$1", [heroes[0].id])).gems);
  ok(gems >= worldBossReward(true, 10, 1).gems, `resgate: 1º lugar recebeu 💎 ${worldBossReward(true, 10, 1).gems} (bônus do top 1)`);
  ok((await call(claim, heroes[0].id, {})).status === 409, "resgate: não dá para resgatar duas vezes");
  ok(wrongRace === 0, `item exclusivo sempre da raça do herói (${items} itens em 40 resgates)`);

  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
