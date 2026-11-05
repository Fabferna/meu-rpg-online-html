// Simulador dos chefes da história: npx tsx --conditions=react-server scripts/story-sim.ts
import { resolveTurn, playerCombatant, enemyCombatant, type BattleState, type PlayerAction } from "../src/lib/game/combat";
import { ENEMY_BY_ID } from "../src/lib/game/enemies";
import { CHAPTERS } from "../src/lib/game/story";
import { RACES, type RaceId } from "../src/lib/game/data";
import { maxHp } from "../src/lib/game/rules";
for (const ch of CHAPTERS) {
  const lvl = ch.minLevel, e = ENEMY_BY_ID[ch.enemy], row: string[] = [];
  for (const race of Object.keys(RACES) as RaceId[]) {
    let wins = 0; const N = 300;
    for (let i = 0; i < N; i++) {
      const a = { ...RACES[race].attributes }; const pts = (lvl - 1) * 3; a.str += pts / 3 | 0; a.con += pts / 3 | 0; a.dex += pts - 2 * (pts / 3 | 0);
      const g = lvl >= 12 ? [{ atk: 11, str: 2 }, { def: 8, con: 2 }] : lvl >= 8 ? [{ atk: 7, dex: 2 }, { def: 8, con: 2 }] : lvl >= 3 ? [{ atk: 7, dex: 2 }] : [{ atk: 4 }];
      const mh = maxHp(a, lvl); const pc = playerCombatant("p", a, lvl, mh, mh, g); const ec = enemyCombatant(e);
      let st: BattleState = { enemyId: e.id, enemy: { name: "", image: "", hp: e.maxHp, maxHp: e.maxHp }, player: { hp: mh, maxHp: mh }, turn: 0, skillCooldown: 0, log: [] };
      let out = "active", pots = 3;
      while (out === "active" && st.turn < 100) {
        const act: PlayerAction = st.player.hp < mh * 0.35 && pots > 0 ? "potion" : (st.racialCooldown ?? 0) === 0 ? "racial" : st.skillCooldown === 0 ? "skill" : "attack";
        const r = resolveTurn(st, act, { ...pc, hp: st.player.hp }, { ...ec, hp: st.enemy.hp }, pots > 0, race, e.traits);
        if (r.potionUsed) pots--; st = r.state; out = r.outcome;
      }
      if (out === "won") wins++;
    }
    row.push(`${race}:${Math.round(wins / N * 100)}%`);
  }
  console.log(`Cap ${ch.n} (nv ${lvl}) ${e.name} hp${e.maxHp}:`.padEnd(52), row.join(" "));
}
