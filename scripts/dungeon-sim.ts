// Simulador das masmorras: npx tsx --conditions=react-server scripts/dungeon-sim.ts
import { resolveTurn, playerCombatant, enemyCombatant, type BattleState, type PlayerAction } from "../src/lib/game/combat";
import { ENEMY_BY_ID } from "../src/lib/game/enemies";
import { DUNGEONS } from "../src/lib/game/dungeons";
import { RACES, type RaceId } from "../src/lib/game/data";
import { maxHp } from "../src/lib/game/rules";
for (const d of DUNGEONS) for (const lvl of [d.minLevel, d.minLevel + 3]) {
  const row: string[] = [];
  for (const race of Object.keys(RACES) as RaceId[]) {
    let wins = 0; const N = 300;
    for (let i = 0; i < N; i++) {
      const a = { ...RACES[race].attributes }; const pts = (lvl - 1) * 3; a.str += pts / 3 | 0; a.con += pts / 3 | 0; a.dex += pts - 2 * (pts / 3 | 0);
      const g = lvl >= 12 ? [{ atk: 11, str: 2 }, { def: 8, con: 2 }] : lvl >= 8 ? [{ atk: 7, dex: 2 }, { def: 8, con: 2 }] : [{ atk: 7, dex: 2 }];
      const mh = maxHp(a, lvl); let hp = mh, pots = 3, alive = true;
      for (const id of d.stages) {
        const e = ENEMY_BY_ID[id]; const pc = playerCombatant("p", a, lvl, hp, mh, g); const ec = enemyCombatant(e);
        let st: BattleState = { enemyId: id, enemy: { name: "", image: "", hp: e.maxHp, maxHp: e.maxHp }, player: { hp, maxHp: mh }, turn: 0, skillCooldown: 0, log: [] };
        let out = "active";
        while (out === "active" && st.turn < 100) {
          const act: PlayerAction = st.player.hp < mh * 0.35 && pots > 0 ? "potion" : (st.racialCooldown ?? 0) === 0 ? "racial" : st.skillCooldown === 0 ? "skill" : "attack";
          const r = resolveTurn(st, act, { ...pc, hp: st.player.hp }, { ...ec, hp: st.enemy.hp }, pots > 0, race, e.traits);
          if (r.potionUsed) pots--; st = r.state; out = r.outcome;
        }
        if (out !== "won") { alive = false; break; } hp = Math.min(mh, st.player.hp + Math.round(mh * 0.25));
      }
      if (alive) wins++;
    }
    row.push(`${race}:${Math.round(wins / N * 100)}%`);
  }
  console.log(`${d.name} nível ${lvl}:`, row.join("  "));
}
