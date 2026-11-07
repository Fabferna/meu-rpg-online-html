// Reproduz a luta do capítulo 11 (Rainha das Harpias) com as rotas reais e o banco local.
// Uso: scripts/dbtest/setup.sh && TSX_TSCONFIG_PATH=scripts/dbtest/tsconfig.json npx tsx --conditions=react-server scripts/dbtest/repro-ch11.ts
import * as story from "../../src/app/api/story/battle/route";
import * as act from "../../src/app/api/battle/action/route";
import * as flee from "../../src/app/api/battle/flee/route";
import { call, makeHero } from "./helpers";
import { pool } from "./fakeSupabase";

const ACTIONS = ["attack", "s0", "s1", "s2", "defend", "potion"] as const;

async function main() {
  const errors: Record<string, number> = {};
  let fights = 0, wins = 0, stunnedTurns = 0;
  for (let i = 0; i < Number(process.env.N ?? 40); i++) {
    const h = await makeHero({
      race: "elfo", level: 36, chapter: 10, potions: 5, trail: 2,
      gear: process.env.NOGEAR ? [] : ["arco_lunar", "tiara_lunar", "manto_arcano", "botas_patrulheiro", "anel_vigor"],
      skills: { lv: { e_flecha: 5, e_passo: 5, e_chuva: 5, e_vinculo: 5, e_comunhao: 3 }, eq: ["e_flecha", "e_chuva", "e_vinculo"] },
    });
    const s = await call(story, h.userId, { chapter: 11 });
    if (s.status !== 200) { errors[`story:${s.json.error}`] = (errors[`story:${s.json.error}`] ?? 0) + 1; continue; }
    fights++;
    for (let t = 0; t < 80; t++) {
      const { rows } = await pool.query("select state from public.battles where user_id=$1 and status='active'", [h.userId]);
      if (rows[0]?.state?.effects?.pStun) stunnedTurns++;
      const a = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
      const r = await call(act, h.userId, { action: a });
      if (r.status !== 200) {
        const k = `action:${a}:${r.status}:${r.json.error}`;
        errors[k] = (errors[k] ?? 0) + 1;
        console.log("ERRO", k, "turno", rows[0]?.state?.turn, "atordoado", !!rows[0]?.state?.effects?.pStun);
        break;
      }
      if (r.json.outcome !== "active") { if (r.json.outcome === "won") wins++; break; }
    }
    await call(flee, h.userId, {});
  }
  console.log({ fights, wins, stunnedTurns, errors });
  await pool.end();
}
main();
