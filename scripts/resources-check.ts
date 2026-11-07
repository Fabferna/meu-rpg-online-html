// Regras de mana e stamina no combate (sem banco). Uso: npx tsx --conditions=react-server scripts/resources-check.ts
import { resolveTurn, playerCombatant, enemyCombatant, type BattleState } from "../src/lib/game/combat";
import { ENEMY_BY_ID } from "../src/lib/game/enemies";
import { RACES } from "../src/lib/game/data";
import { normalizeLoadout, SKILL_BY_ID } from "../src/lib/game/skills";
import { RES, skillCost, spCost } from "../src/lib/game/resources";

const ok = (c: boolean, m: string) => { console.log(`${c ? "✅" : "❌"} ${m}`); if (!c) process.exitCode = 1; };
const a = { ...RACES.aetheliano.attributes };
const pc = playerCombatant("p", a, 10, 300, 300, [], "aetheliano");
const e = ENEMY_BY_ID.javali_corrompido; const ec = enemyCombatant(e);
const lo = normalizeLoadout("aetheliano", null, 10);
const base = (mp: number, sp: number): BattleState => ({ enemyId: e.id, enemy: { name: "", image: "", hp: 9999, maxHp: 9999 }, player: { hp: 300, maxHp: 300, mp, maxMp: pc.maxMp, sp, maxSp: pc.maxSp }, turn: 0, skillCooldown: 0, log: [] });

ok(!!pc.maxMp && !!pc.maxSp, `herói tem mana ${pc.maxMp} e stamina ${pc.maxSp}`);
const sk = SKILL_BY_ID[lo.eq[0]]; const cost = skillCost(sk);
const r1 = resolveTurn(base(pc.maxMp!, pc.maxSp!), "s0", pc, ec, false, lo, {});
ok(r1.state.log.some((l) => l.action === "skill"), `com recurso a habilidade "${sk.name}" é usada (custa ${cost.amount} ${cost.res})`);
const r2 = resolveTurn(base(cost.res === "mp" ? 0 : pc.maxMp!, cost.res === "sp" ? 0 : pc.maxSp!), "s0", pc, ec, false, lo, {});
ok(!r2.state.log.some((l) => l.action === "skill") && r2.state.log.some((l) => l.actor === "player" && l.action === "attack"), "sem recurso a habilidade não sai (vira ataque)");
const r3 = resolveTurn(base(10, pc.maxSp!), "defend", pc, ec, false, lo, {});
ok((r3.state.player.mp ?? 0) >= 10 + Math.round(pc.maxMp! * RES.defendMp), "defender recupera mana");
const r4 = resolveTurn(base(pc.maxMp!, 50), "attack", pc, ec, false, lo, {});
ok((r4.state.player.sp ?? 0) <= 50 - spCost(RES.attackSp, 10) + Math.round(pc.maxSp! * RES.regenSp), "ataque gasta stamina");
let tiredAvg = 0, freshAvg = 0;
for (let i = 0; i < 400; i++) {
  tiredAvg += resolveTurn(base(0, 0), "attack", pc, ec, false, lo, {}).state.enemy.hp;
  freshAvg += resolveTurn(base(0, pc.maxSp!), "attack", pc, ec, false, lo, {}).state.enemy.hp;
}
ok(tiredAvg > freshAvg, "sem stamina o ataque causa menos dano");
const old = resolveTurn({ ...base(0, 0), player: { hp: 300, maxHp: 300 } }, "s0", pc, ec, false, lo, {});
ok(old.state.player.maxMp === pc.maxMp && old.state.log.some((l) => l.action === "skill"), "luta antiga sem mana/stamina salva começa cheia");
