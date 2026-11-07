// Simula, NO SERVIDOR (rotas reais + funções SQL do banco local), as lutas do Ato II:
// capítulos 11–15, masmorras Santuário e Abismo e todos os inimigos novos da Caçada.
// Uso: scripts/dbtest/setup.sh && TSX_TSCONFIG_PATH=scripts/dbtest/tsconfig.json npx tsx --conditions=react-server scripts/dbtest/sim-act2.ts
import * as story from "../../src/app/api/story/battle/route";
import * as start from "../../src/app/api/battle/start/route";
import * as enter from "../../src/app/api/dungeons/enter/route";
import * as act from "../../src/app/api/battle/action/route";
import { call, makeHero } from "./helpers";
import { pool } from "./fakeSupabase";
import { CHAPTERS } from "../../src/lib/game/story";
import { DUNGEON_BY_ID } from "../../src/lib/game/dungeons";
import { ENEMY_BY_ID } from "../../src/lib/game/enemies";
import { ITEMS, SLOTS } from "../../src/lib/game/items";
import { skillsOf, slotsFor, skillUpgradeLevel, SKILL_MAX_LEVEL } from "../../src/lib/game/skills";
import { RACE_IDS, type RaceId } from "../../src/lib/game/data";
import type { BattleState, PlayerAction } from "../../src/lib/game/combat";

const N = Number(process.env.N ?? 12);

/** Equipamento "de loja" do nível: o melhor item comprável de cada espaço (com afinidade, se houver). */
export function shopGear(race: RaceId, level: number) {
  return SLOTS.map((slot) => ITEMS.filter((i) => i.slot === slot && i.buy && (i.minLevel ?? 1) <= level)
    .sort((a, b) => (b.affinity?.includes(race) ? 1 : 0) - (a.affinity?.includes(race) ? 1 : 0) || (b.minLevel ?? 0) - (a.minLevel ?? 0))[0]?.id)
    .filter(Boolean) as string[];
}
/** Habilidades no nível máximo permitido; a barra leva as 3 mais recentes. */
export function skillSet(race: RaceId, level: number) {
  const own = skillsOf(race).filter((s) => s.unlock <= level);
  const lv: Record<string, number> = {};
  for (const s of own) { let l = 1; while (l < SKILL_MAX_LEVEL && skillUpgradeLevel(s, l) <= level) l++; lv[s.id] = l; }
  return { lv, eq: own.slice(-slotsFor(level)).map((s) => s.id) };
}

async function fight(userId: string, eq: string[]) {
  let errors = "";
  for (let t = 0; t < 120; t++) {
    const { rows } = await pool.query("select state from public.battles where user_id=$1 and status='active'", [userId]);
    const st = rows[0]?.state as BattleState | undefined;
    if (!st) return { outcome: "none", errors };
    const pots = (await pool.query("select coalesce(sum(qty),0)::int n from inventory where user_id=$1 and item_id='pocao_vida'", [userId])).rows[0].n;
    let a: PlayerAction = "attack";
    if (st.player.hp < st.player.maxHp * 0.35 && pots > 0) a = "potion";
    else { const i = eq.findIndex((id) => !(st.cds?.[id] ?? 0)); if (i >= 0) a = `s${i}` as PlayerAction; }
    const r = await call(act, userId, { action: a });
    if (r.status !== 200) { errors = `${a}:${r.status}:${r.json.error}`; return { outcome: "error", errors }; }
    if (r.json.outcome !== "active") return { outcome: r.json.outcome as string, errors };
  }
  return { outcome: "timeout", errors };
}

async function main() {
  const out: string[] = [];
  const errs: string[] = [];
  const row = async (label: string, level: number, chapter: number, begin: (u: string) => Promise<{ status: number; json: Record<string, unknown> }>) => {
    const cells: string[] = [];
    for (const race of RACE_IDS) {
      let wins = 0;
      for (let i = 0; i < N; i++) {
        const sk = skillSet(race, level);
        const h = await makeHero({ race, level, chapter, gear: shopGear(race, level), skills: sk, potions: 3, trail: 2 });
        const s = await begin(h.userId);
        if (s.status !== 200) { errs.push(`${label} ${race}: início ${s.status} ${s.json.error}`); continue; }
        const r = await fight(h.userId, sk.eq);
        if (r.errors) errs.push(`${label} ${race}: ${r.errors}`);
        if (r.outcome === "won") wins++;
      }
      cells.push(`${race} ${Math.round((wins / N) * 100)}%`.padEnd(15));
    }
    out.push(`${label.padEnd(44)} ${cells.join(" ")}`);
    console.log(out.at(-1));
  };

  console.log(`Vitórias em ${N} lutas por raça (equipamento de loja, 3 poções, nível recomendado)\n`);
  for (const ch of CHAPTERS.filter((c) => c.n >= 11)) {
    await row(`Cap. ${ch.n} ${ENEMY_BY_ID[ch.enemy].name} (nv ${ch.minLevel})`, ch.minLevel, ch.n - 1, (u) => call(story, u, { chapter: ch.n }));
  }
  for (const id of ["santuario", "abismo"]) {
    const d = DUNGEON_BY_ID[id];
    await row(`Masmorra ${d.name} (nv ${d.minLevel})`, d.minLevel, 15, (u) => call(enter, u, { dungeonId: id }));
  }
  for (const id of ["harpia_tempestade", "sentinela_eter", "dragao_celeste", "espectro_vazio", "devorador_estrelas", "avatar_nyx"]) {
    const e = ENEMY_BY_ID[id];
    await row(`Caçada ${e.name} (nv ${e.minLevel})`, e.minLevel, 15, (u) => call(start, u, { enemyId: id }));
  }
  console.log(errs.length ? `\nERROS:\n${errs.join("\n")}` : "\nNenhum erro de servidor.");
  await pool.end();
}
main();
