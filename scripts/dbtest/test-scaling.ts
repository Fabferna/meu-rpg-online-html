// Escala por nível da Caçada: o servidor cria a luta com o monstro no nível do herói.
// Uso: npm run test:db:setup && npm run test:db:scaling
import * as start from "../../src/app/api/battle/start/route";
import { call, makeHero } from "./helpers";
import { pool } from "./fakeSupabase";
import { ENEMY_BY_ID, enemyAt, huntLevel } from "../../src/lib/game/enemies";

const ok = (c: boolean, m: string) => { console.log(`${c ? "✅" : "❌"} ${m}`); if (!c) process.exitCode = 1; };
async function main() {
  const base = ENEMY_BY_ID.sombra_fraca;
  for (const lvl of [1, 5, 13]) {
    const h = await makeHero({ race: "humano", level: lvl, chapter: 15 });
    const r = await call(start, h.userId, { enemyId: base.id });
    const st = (await pool.query("select state from public.battles where user_id=$1 and status='active'", [h.userId])).rows[0]?.state;
    const want = enemyAt(base, huntLevel(base, lvl));
    ok(r.status === 200 && st.enemy.maxHp === want.maxHp && (st.lvl ?? base.minLevel) === want.minLevel,
      `herói nível ${lvl}: Criatura das Sombras luta no nível ${st?.lvl} com ❤️ ${st?.enemy.maxHp} (base ❤️ ${base.maxHp})`);
  }
  const boss = ENEMY_BY_ID.lider_cultista;
  ok(enemyAt(boss, boss.minLevel) === boss, "chefe no próprio nível não muda");
  ok(enemyAt(boss, 20).maxHp > boss.maxHp && enemyAt(boss, 20).xp > boss.xp, "chefe escalado tem mais vida e dá mais XP");
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
