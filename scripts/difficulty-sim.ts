// Resumo da dificuldade da Caçada por nível do herói (média dos monstros liberados, já escalados).
// Herói "médio": melhor peça de cada espaço até o nível (lendárias só a partir do 25), sem aprimoramento nem pet.
// Uso: npx tsx --conditions=react-server scripts/difficulty-sim.ts
import { resolveTurn, playerCombatant, enemyCombatant, type BattleState, type PlayerAction } from "../src/lib/game/combat";
import { ENEMIES, enemyAt, huntLevel, type Enemy } from "../src/lib/game/enemies";
import { RACES, type RaceId } from "../src/lib/game/data";
import { ITEMS, SLOTS, itemStatsFor } from "../src/lib/game/items";
import { maxHp } from "../src/lib/game/rules";
import { talentMods, talentPoints } from "../src/lib/game/talents";
import { normalizeLoadout } from "../src/lib/game/skills";

function hero(race: RaceId, lvl: number) {
  const a = { ...RACES[race].attributes }; const pts = (lvl - 1) * 3;
  const main = race === "aetheliano" ? "intel" : race === "elfo" ? "dex" : "str";
  (a as Record<string, number>)[main] += Math.round(pts * 2 / 3); a.con += pts - Math.round(pts * 2 / 3);
  const gear = SLOTS.map((sl) => ITEMS.filter((i) => i.slot === sl && (i.minLevel ?? 1) <= lvl && (lvl >= 25 || i.rarity !== "legendary"))
    .sort((x, y) => Object.values(y.stats).reduce((s, v) => s + v, 0) - Object.values(x.stats).reduce((s, v) => s + v, 0))[0])
    .filter(Boolean).map((i) => itemStatsFor(i, i.stats as Record<string, number>, race));
  const tp = talentPoints(lvl);
  const tal = talentMods(main === "intel" ? { a_mente: Math.min(5, tp), a_foco: Math.min(3, Math.max(0, tp - 5)), a_fluxo: Math.min(3, Math.max(0, tp - 8)) }
    : { f_lamina: Math.min(5, tp), f_selvagem: Math.min(3, Math.max(0, tp - 5)), f_brutal: Math.min(3, Math.max(0, tp - 8)) });
  const mh = maxHp(a, lvl);
  return { pc: playerCombatant("P", a, lvl, mh, mh, gear, race, [], null, tal), mh, loadout: normalizeLoadout(race, {}, lvl) };
}
function fight(race: RaceId, lvl: number, e: Enemy, N = 200) {
  let wins = 0, lost = 0, turns = 0; const { pc, mh, loadout } = hero(race, lvl);
  for (let i = 0; i < N; i++) {
    const ec = enemyCombatant(e);
    let st: BattleState = { enemyId: e.id, enemy: { name: e.name, image: "", hp: e.maxHp, maxHp: e.maxHp }, player: { hp: mh, maxHp: mh, mp: pc.maxMp, maxMp: pc.maxMp, sp: pc.maxSp, maxSp: pc.maxSp }, turn: 0, skillCooldown: 0, log: [] };
    let out = "active", pots = 1;
    while (out === "active" && st.turn < 60) {
      const act: PlayerAction = st.player.hp < mh * 0.3 && pots > 0 ? "potion" : (st.cds?.s0 ?? 0) === 0 ? "s0" : "attack";
      const r = resolveTurn(st, act, { ...pc, hp: st.player.hp }, { ...ec, hp: st.enemy.hp }, act === "potion" && pots > 0, loadout, e.traits);
      if (r.potionUsed) pots--; st = r.state; out = r.outcome;
    }
    if (out === "won") { wins++; lost += 1 - st.player.hp / mh; } turns += st.turn;
  }
  return { win: wins / N, lost: lost / Math.max(1, wins), turns: turns / N };
}
const races: RaceId[] = ["humano", "elfo", "anao", "gronar", "aetheliano"];
console.log("nível | comuns: vitória · vida perdida · turnos | chefes: vitória · turnos   (média das 5 raças, 1 poção)");
for (const lvl of [1, 3, 5, 8, 10, 13, 16, 20, 25, 30, 35, 40]) {
  const pool = ENEMIES.filter((e) => !e.story && e.minLevel <= lvl);
  const agg = (list: Enemy[]) => {
    const r = list.flatMap((e) => races.map((race) => fight(race, lvl, enemyAt(e, huntLevel(e, lvl)))));
    const m = (k: "win" | "lost" | "turns") => r.reduce((s, x) => s + x[k], 0) / Math.max(1, r.length);
    return { win: m("win"), lost: m("lost"), turns: m("turns"), n: list.length };
  };
  const c = agg(pool.filter((e) => !e.boss)), b = agg(pool.filter((e) => e.boss));
  console.log(`${String(lvl).padStart(5)} | ${(c.win * 100).toFixed(0).padStart(3)}% · ${(c.lost * 100).toFixed(0).padStart(3)}% · ${c.turns.toFixed(1).padStart(4)}            | ${b.n ? `${(b.win * 100).toFixed(0).padStart(3)}% · ${b.turns.toFixed(1)}` : "—"}`);
}
