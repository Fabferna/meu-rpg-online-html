// Testa o limite de missões (30/dia) e a renovação com gemas (+30, 1 vez por dia).
// Uso: npm run test:db:setup && TSX_TSCONFIG_PATH=scripts/dbtest/tsconfig.json npx tsx --conditions=react-server scripts/dbtest/test-quest-refill.ts
import * as start from "../../src/app/api/quests/start/route";
import * as refill from "../../src/app/api/quests/refill/route";
import { call, makeHero } from "./helpers";
import { pool } from "./fakeSupabase";
import { DAILY_QUESTS, QUEST_REFILL } from "../../src/lib/game/rules";

const ok = (c: boolean, m: string) => { console.log(`${c ? "✅" : "❌"} ${m}`); if (!c) process.exitCode = 1; };
const gems = async (u: string) => Number((await pool.query("select gems from wallets where user_id=$1", [u])).rows[0].gems);
async function quest(u: string) {
  await pool.query("update characters set energy = 999, energy_updated_at = now() where user_id=$1", [u]);
  const r = await call(start, u, { questId: "patrulha_valerion" });
  // A missão leva tempo: o teste a dá como concluída para poder começar a próxima.
  await pool.query("update quest_runs set status = 'claimed' where user_id=$1 and status = 'running'", [u]);
  return r;
}

async function main() {
  const h = await makeHero({ race: "humano", level: 5 });
  await pool.query("update wallets set gems = 400 where user_id=$1", [h.userId]);
  let n = 0;
  for (let i = 0; i < DAILY_QUESTS; i++) if ((await quest(h.userId)).status === 200) n++;
  ok(n === DAILY_QUESTS, `${n} missões grátis`);
  const b = await quest(h.userId);
  ok(b.status === 429 && b.json.error === "daily_quests", `missão 31 bloqueada (${b.status} ${b.json.error})`);
  const r1 = await call(refill, h.userId, {});
  ok(r1.status === 200 && (await gems(h.userId)) === 400 - QUEST_REFILL.gems, `renovou e gastou 💎${QUEST_REFILL.gems}`);
  n = 0;
  for (let i = 0; i < QUEST_REFILL.quests; i++) if ((await quest(h.userId)).status === 200) n++;
  ok(n === QUEST_REFILL.quests, `+${n} missões após renovar`);
  ok((await quest(h.userId)).status === 429, "bloqueia de novo depois das 60");
  const r2 = await call(refill, h.userId, {});
  ok(r2.status === 409 && r2.json.error === "daily_limit" && (await gems(h.userId)) === 400 - QUEST_REFILL.gems, "2ª renovação no dia recusada, sem cobrar");
  const poor = await makeHero({ race: "elfo", level: 3 });
  const r3 = await call(refill, poor.userId, {});
  ok(r3.status === 409 && r3.json.error === "insufficient_funds", "sem gemas: recusado");
  await pool.end();
}
main();
