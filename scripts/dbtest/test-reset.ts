// Testa a migração 0021 (reset de progresso): cria heróis avançados, roda o reset e confere.
// Uso: banco com 0001–0020 aplicadas (ver README), depois: TSX_TSCONFIG_PATH=scripts/dbtest/tsconfig.json npx tsx --conditions=react-server scripts/dbtest/test-reset.ts
import { readFileSync } from "node:fs";
import { pool } from "./fakeSupabase";
import { makeHero, call } from "./helpers";
import * as story from "../../src/app/api/story/battle/route";

const ok = (cond: boolean, msg: string) => { console.log(`${cond ? "✅" : "❌"} ${msg}`); if (!cond) process.exitCode = 1; };
const q = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows;

async function main() {
  const a = await makeHero({ race: "elfo", level: 36, chapter: 14, gear: ["arco_lunar", "botas_vento"], potions: 9, gold: 99999 });
  const b = await makeHero({ race: "anao", level: 20, chapter: 8, gold: 10 });
  await q("update wallets set gems = 777 where user_id = $1", [a.userId]);
  await q("insert into owned_pets (user_id, pet_id, level, active) values ($1, 'lobo', 5, true)", [a.userId]);
  await q("insert into owned_cosmetics (user_id, cosmetic_id) values ($1, 'title_salvador')", [a.userId]);
  await q("insert into reward_claims (user_id, claim_key) values ($1,'story:1'),($1,'ach:lvl10'),($1,'pass:x:1:free'),($1,'season:2026-01-01')", [a.userId]);
  await q("insert into user_counters (user_id, key, day, value) values ($1, 'ev:pve_win', current_date, 50)", [a.userId]);
  const g = (await q("insert into guilds (name, tag, level, xp, treasury) values ('Teste Reset','TRS',5,900,5000) returning id"))[0].id;
  await q("insert into guild_members (user_id, guild_id, role, contributed) values ($1,$2,'leader',300)", [a.userId, g]);
  // Herói guardado (troca de herói) do jogador B.
  await q("select public.stash_character($1)", [b.userId]);

  const sql = readFileSync("supabase/migrations/0021_reset_progresso.sql", "utf8");
  await pool.query(sql);

  const c = (await q("select * from characters where user_id=$1", [a.userId]))[0];
  ok(c.level === 1 && Number(c.xp) === 0 && c.story_chapter === 0, "herói ativo: nível 1, XP 0, história 0");
  ok(c.dex === 12 && c.str === 9 && c.attribute_points === 0, "atributos voltaram aos do elfo");
  ok(JSON.stringify(c.skills) === "{}" && c.pvp_rating === 1000, "habilidades e PvP zerados");
  const w = (await q("select gold, gems from wallets where user_id=$1", [a.userId]))[0];
  ok(Number(w.gold) === 50 && Number(w.gems) === 777, "ouro = 50 e gemas mantidas (777)");
  ok((await q("select 1 from inventory where user_id=$1", [a.userId])).length === 0, "bolsa vazia");
  ok((await q("select level from owned_pets where user_id=$1", [a.userId]))[0]?.level === 1, "pet mantido, nível 1");
  ok((await q("select 1 from owned_cosmetics where user_id=$1", [a.userId])).length === 1, "cosmético mantido");
  const claims = (await q("select claim_key from reward_claims where user_id=$1", [a.userId])).map((r) => r.claim_key);
  ok(claims.length === 1 && claims[0].startsWith("season:"), "história/conquistas/passe liberados; ranking mantido");
  ok((await q("select 1 from user_counters where user_id=$1 and key like 'ev:%'", [a.userId])).length === 0, "pontos do passe zerados");
  const gg = (await q("select level, xp, treasury from guilds where id=$1", [g]))[0];
  ok(gg.level === 1 && Number(gg.xp) === 0 && Number(gg.treasury) === 0, "guilda nível 1, membros mantidos");
  const st = (await q("select data, inventory from character_stash where user_id=$1", [b.userId]))[0];
  ok(st.data.level === 1 && st.data.story_chapter === 0 && st.data.con === 13 && st.inventory.length === 0, "herói guardado também resetado");
  const wb = (await q("select gold from wallets where user_id=$1", [b.userId]))[0];
  ok(Number(wb.gold) === 50, "ouro de quem tinha MENOS que 50 também vira 50");

  // Trava: rodar de novo não mexe em nada.
  await q("update characters set level = 7 where user_id=$1", [a.userId]);
  await pool.query(sql);
  ok((await q("select level from characters where user_id=$1", [a.userId]))[0].level === 7, "2ª execução não faz nada (trava)");
  await q("update characters set level = 1 where user_id=$1", [a.userId]);

  // Recomeçar a história paga de novo (ouro do capítulo 1 não fica "já pago").
  const before = Number((await q("select gold from wallets where user_id=$1", [a.userId]))[0].gold);
  await q("select public.complete_chapter($1, 1, 60, 100, 5, null, null)", [a.userId]);
  const after = Number((await q("select gold from wallets where user_id=$1", [a.userId]))[0].gold);
  ok(after - before === 100, `capítulo 1 paga o ouro de novo (+${after - before})`);
  ok((await call(story, a.userId, { chapter: 2 })).status !== 500, "rota da história funciona após o reset");
  await pool.end();
}
main();
