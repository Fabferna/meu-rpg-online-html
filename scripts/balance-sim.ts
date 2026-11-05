// Simulador de balanceamento: npx tsx --conditions=react-server scripts/balance-sim.ts
import { resolveTurn, playerCombatant, enemyCombatant, type BattleState, type PlayerAction } from "../src/lib/game/combat";
import { ENEMIES } from "../src/lib/game/enemies";
import { RACES, type RaceId } from "../src/lib/game/data";
import { maxHp } from "../src/lib/game/rules";
const races = Object.keys(RACES) as RaceId[];
const gear = { espada: { atk: 4 }, arco: { atk: 7, dex: 2 }, peitoral: { def: 8, con: 2 }, martelo: { atk: 11, str: 2 } };
console.log("inimigo (nível)".padEnd(32), races.map(r => r.padEnd(11)).join(""), "  turnos médios");
for (const e of ENEMIES) {
  const lvl = e.minLevel + 1, row: string[] = []; let turnsAll = 0;
  for (const race of races) {
    let wins = 0, turns = 0; const N = 300;
    for (let i = 0; i < N; i++) {
      const a = { ...RACES[race].attributes }; const pts = (lvl - 1) * 3;
      a.str += Math.floor(pts / 3); a.con += Math.floor(pts / 3); a.dex += pts - 2 * Math.floor(pts / 3);
      const g = lvl >= 12 ? [gear.martelo, gear.peitoral] : lvl >= 8 ? [gear.arco, gear.peitoral] : lvl >= 3 ? [gear.arco] : [gear.espada];
      const mh = maxHp(a, lvl); const pc = playerCombatant("P", a, lvl, mh, mh, g); const ec = enemyCombatant(e);
      let st: BattleState = { enemyId: e.id, enemy: { name: e.name, image: "", hp: e.maxHp, maxHp: e.maxHp }, player: { hp: mh, maxHp: mh }, turn: 0, skillCooldown: 0, log: [] };
      let out = "active", pots = 3;
      while (out === "active" && st.turn < 100) {
        const act: PlayerAction = (st.racialCooldown ?? 0) === 0 ? "racial" : st.skillCooldown === 0 ? "skill" : st.player.hp < st.player.maxHp * 0.3 && pots > 0 ? "potion" : "attack";
        const r = resolveTurn(st, act, { ...pc, hp: st.player.hp }, { ...ec, hp: st.enemy.hp }, pots > 0, race, e.traits);
        if (r.potionUsed) pots--; st = r.state; out = r.outcome;
      }
      if (out === "won") wins++; turns += st.turn;
    }
    row.push(`${Math.round(wins / N * 100)}%`.padEnd(11)); turnsAll += turns / N;
  }
  console.log(`${e.name} (${lvl}) hp${e.maxHp} atk${e.atk}`.padEnd(32), row.join(""), (turnsAll / races.length).toFixed(1));
}
