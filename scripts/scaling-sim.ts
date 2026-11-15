// Quantos turnos um herói bem equipado leva para vencer monstros, com e sem a escala por nível.
// Uso: npx tsx --conditions=react-server scripts/scaling-sim.ts
import { resolveTurn, playerCombatant, enemyCombatant, type BattleState, type PlayerAction } from "../src/lib/game/combat";
import { ENEMIES, enemyAt, huntLevel } from "../src/lib/game/enemies";
import { RACES, type RaceId } from "../src/lib/game/data";
import { ITEMS, SLOTS, itemStatsFor } from "../src/lib/game/items";
import { maxHp } from "../src/lib/game/rules";
import { talentMods } from "../src/lib/game/talents";
import { normalizeLoadout } from "../src/lib/game/skills";

const race: RaceId = (process.argv[2] as RaceId) ?? "humano";
function hero(lvl: number) {
  const a = { ...RACES[race].attributes }; const pts = (lvl - 1) * 3;
  const main = race === "aetheliano" ? "intel" : race === "elfo" ? "dex" : "str";
  (a as Record<string, number>)[main] += Math.round(pts * 2 / 3); a.con += pts - Math.round(pts * 2 / 3);
  // Melhor peça de cada espaço até o nível (pela soma dos atributos), +3 de aprimoramento aproximado.
  const gear = SLOTS.map((sl) => ITEMS.filter((i) => i.slot === sl && (i.minLevel ?? 1) <= lvl && i.rarity !== "legendary")
    .sort((x, y) => Object.values(y.stats).reduce((s, v) => s + v, 0) - Object.values(x.stats).reduce((s, v) => s + v, 0))[0])
    .filter(Boolean).map((i) => itemStatsFor(i, i.stats as Record<string, number>, race));
  const tal = talentMods(main === "intel" ? { a_mente: 5, a_foco: 3, a_fluxo: 3 } : { f_lamina: 5, f_selvagem: 3, f_brutal: 3 });
  const mh = maxHp(a, lvl);
  return { pc: playerCombatant("P", a, lvl, mh, mh, gear, race, [], null, tal), mh, loadout: normalizeLoadout(race, {}, lvl) };
}
function fight(lvl: number, e: (typeof ENEMIES)[number]) {
  const N = 300; let wins = 0, turns = 0, hpLeft = 0;
  const { pc, mh, loadout } = hero(lvl);
  for (let i = 0; i < N; i++) {
    const ec = enemyCombatant(e);
    let st: BattleState = { enemyId: e.id, enemy: { name: e.name, image: "", hp: e.maxHp, maxHp: e.maxHp }, player: { hp: mh, maxHp: mh, mp: pc.maxMp, maxMp: pc.maxMp, sp: pc.maxSp, maxSp: pc.maxSp }, turn: 0, skillCooldown: 0, log: [] };
    let out = "active";
    while (out === "active" && st.turn < 60) {
      const act: PlayerAction = (st.cds?.s0 ?? 0) === 0 ? "s0" : "attack";
      const r = resolveTurn(st, act, { ...pc, hp: st.player.hp }, { ...ec, hp: st.enemy.hp }, false, loadout, e.traits);
      st = r.state; out = r.outcome;
    }
    if (out === "won") { wins++; hpLeft += st.player.hp / mh; } turns += st.turn;
  }
  return `${String(Math.round(wins / N * 100)).padStart(3)}% vit · ${(turns / N).toFixed(1).padStart(4)} turnos · sobra ${Math.round(hpLeft / Math.max(1, wins) * 100)}% vida`;
}
for (const lvl of [5, 9, 13, 18, 25]) {
  console.log(`\\n── Herói nível ${lvl} (${race}) ──`);
  for (const e of ENEMIES.filter((x) => !x.story && x.minLevel <= lvl)) {
    const s = enemyAt(e, huntLevel(e, lvl));
    console.log(`${e.name.padEnd(28)} nv${String(e.minLevel).padStart(2)}  ANTES ${fight(lvl, e)}   |  AGORA (nv${s.minLevel}) ${fight(lvl, s)}  xp ${e.xp}→${s.xp}`);
  }
}
