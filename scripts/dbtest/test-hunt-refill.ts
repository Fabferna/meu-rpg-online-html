// Testa o limite de caçadas (30/dia) e a renovação com gemas (+30, 1 vez por dia).
// Uso: npm run test:db:setup && TSX_TSCONFIG_PATH=scripts/dbtest/tsconfig.json npx tsx --conditions=react-server scripts/dbtest/test-hunt-refill.ts
import * as start from "../../src/app/api/battle/start/route";
import * as flee from "../../src/app/api/battle/flee/route";
import * as refill from "../../src/app/api/battle/refill/route";
import { call, makeHero } from "./helpers";
import { pool } from "./fakeSupabase";
import { DAILY_HUNTS, HUNT_REFILL } from "../../src/lib/game/rules";

const ok = (c: boolean, m: string) => { console.log(`${c ? "✅" : "❌"} ${m}`); if (!c) process.exitCode = 1; };
const gems = async (u: string) => Number((await pool.query("select gems from wallets where user_id=$1", [u])).rows[0].gems);
async function hunt(u: string) {
  await pool.query("update characters set energy = 999, energy_updated_at = now(), hp = 9999, hp_updated_at = now() where user_id=$1", [u]);
  const r = await call(start, u, { enemyId: "sombra_fraca" });
  if (r.status === 200) await call(flee, u, {});
  return r;
}

async function main() {
  const h = await makeHero({ race: "humano", level: 5 });
  await pool.query("update wallets set gems = 400 where user_id=$1", [h.userId]);
  let n = 0;
  for (let i = 0; i < DAILY_HUNTS; i++) if ((await hunt(h.userId)).status === 200) n++;
  ok(n === DAILY_HUNTS, `${n} caçadas grátis`);
  const blocked = await hunt(h.userId);
  ok(blocked.status === 429 && blocked.json.error === "daily_hunts", `caçada 31 bloqueada (${blocked.status} ${JSON.stringify(blocked.json)})`);
  const r1 = await call(refill, h.userId, {});
  ok(r1.status === 200 && (await gems(h.userId)) === 400 - HUNT_REFILL.gems, `renovou e gastou 💎${HUNT_REFILL.gems}`);
  n = 0;
  for (let i = 0; i < HUNT_REFILL.hunts; i++) if ((await hunt(h.userId)).status === 200) n++;
  ok(n === HUNT_REFILL.hunts, `+${n} caçadas após renovar`);
  ok((await hunt(h.userId)).status === 429, "bloqueia de novo depois das 60");
  const r2 = await call(refill, h.userId, {});
  ok(r2.status === 409 && r2.json.error === "daily_limit" && (await gems(h.userId)) === 400 - HUNT_REFILL.gems, "2ª renovação no dia recusada, sem cobrar");
  const poor = await makeHero({ race: "elfo", level: 3 });
  const r3 = await call(refill, poor.userId, {});
  ok(r3.status === 409 && r3.json.error === "insufficient_funds", "sem gemas: recusado");
  const c = (await pool.query("select coalesce(sum(value),0)::int v from user_counters where user_id=$1 and key='hunt_refill'", [poor.userId])).rows[0].v;
  ok(c === 0, "sem gemas: a compra não fica contada (pode tentar de novo depois)");
  await pool.end();
}
main();
