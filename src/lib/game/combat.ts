import "server-only";
import { chance, roll } from "./rng";
import type { Attributes } from "./data";
import type { Enemy } from "./enemies";

export type ItemBonus = Partial<{ atk: number; def: number; str: number; dex: number; con: number; intel: number }>;

export type Combatant = {
  name: string;
  hp: number;
  maxHp: number;
  atk: [number, number];
  magic: [number, number];
  def: number;
  agility: number;
};

export type LogEntry = {
  turn: number;
  actor: "player" | "enemy";
  action: "attack" | "skill" | "defend" | "potion";
  dmg?: number;
  heal?: number;
  crit?: boolean;
  miss?: boolean;
};

export type BattleState = {
  enemyId: string;
  enemy: { name: string; image: string; hp: number; maxHp: number; boss?: boolean };
  player: { hp: number; maxHp: number };
  turn: number;
  skillCooldown: number;
  log: LogEntry[];
  rewards?: { xp: number; gold: number; item: string | null; levelUps: number };
};

export type PlayerAction = "attack" | "skill" | "defend" | "potion";

export const SKILL_COOLDOWN = 3;
export const POTION_ITEM = "pocao_vida";

export function playerCombatant(name: string, a: Attributes, level: number, hp: number, maxHp: number, gear: ItemBonus[]): Combatant {
  const b = gear.reduce<Required<ItemBonus>>(
    (acc, g) => ({
      atk: acc.atk + (g.atk ?? 0), def: acc.def + (g.def ?? 0), str: acc.str + (g.str ?? 0),
      dex: acc.dex + (g.dex ?? 0), con: acc.con + (g.con ?? 0), intel: acc.intel + (g.intel ?? 0),
    }),
    { atk: 0, def: 0, str: 0, dex: 0, con: 0, intel: 0 },
  );
  const str = a.str + b.str, dex = a.dex + b.dex, con = a.con + b.con, intel = a.intel + b.intel;
  return {
    name,
    hp,
    maxHp,
    atk: [str + level + b.atk, Math.round(str * 1.4 + level * 2) + b.atk],
    magic: [intel + level, Math.round(intel * 1.7 + level * 2)],
    def: Math.round(con * 0.5 + b.def),
    agility: dex,
  };
}

export function enemyCombatant(e: Enemy, hp = e.maxHp): Combatant {
  return { name: e.name, hp, maxHp: e.maxHp, atk: e.atk, magic: e.atk, def: e.def, agility: e.agility };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function strike(att: Combatant, def: Combatant, kind: "attack" | "skill", defending: boolean) {
  const dodge = clamp(0.04 + (def.agility - att.agility) * 0.01, 0.02, 0.25);
  if (kind === "attack" && chance(dodge)) return { dmg: 0, miss: true, crit: false };
  const crit = chance(clamp(0.05 + att.agility * 0.004, 0.05, 0.35));
  const base = kind === "skill" ? roll(...att.magic) * 1.8 : roll(...att.atk);
  const armor = kind === "skill" ? def.def * 0.3 : def.def * 0.6;
  let dmg = Math.max(1, Math.round((base - armor) * (crit ? 1.6 : 1)));
  if (defending) dmg = Math.max(1, Math.round(dmg * 0.45));
  return { dmg, miss: false, crit };
}

/** Resolve um turno de PVE. O cliente só informa a ação; tudo o resto é calculado aqui. */
export function resolveTurn(state: BattleState, action: PlayerAction, p: Combatant, e: Combatant, hasPotion: boolean) {
  const s: BattleState = structuredClone(state);
  s.turn += 1;
  let defending = false;
  let potionUsed = false;

  if (action === "skill" && s.skillCooldown > 0) action = "attack";
  if (action === "potion" && !hasPotion) action = "defend";

  if (action === "attack" || action === "skill") {
    const r = strike({ ...p, hp: s.player.hp }, e, action, false);
    s.enemy.hp = Math.max(0, s.enemy.hp - r.dmg);
    s.log.push({ turn: s.turn, actor: "player", action, ...r });
    if (action === "skill") s.skillCooldown = SKILL_COOLDOWN + 1;
  } else if (action === "defend") {
    defending = true;
    const heal = Math.round(s.player.maxHp * 0.05);
    s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal);
    s.log.push({ turn: s.turn, actor: "player", action, heal });
  } else {
    potionUsed = true;
    const heal = 60;
    s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal);
    s.log.push({ turn: s.turn, actor: "player", action, heal });
  }

  if (s.skillCooldown > 0) s.skillCooldown -= 1;

  if (s.enemy.hp > 0) {
    const r = strike(e, { ...p, hp: s.player.hp }, "attack", defending);
    s.player.hp = Math.max(0, s.player.hp - r.dmg);
    s.log.push({ turn: s.turn, actor: "enemy", action: "attack", ...r });
  }

  s.log = s.log.slice(-30);
  const outcome: "won" | "lost" | "active" = s.enemy.hp <= 0 ? "won" : s.player.hp <= 0 ? "lost" : "active";
  return { state: s, outcome, potionUsed };
}

/** PVP assíncrono: simulação completa no servidor (máx. 30 turnos). */
export function simulateDuel(a: Combatant, b: Combatant) {
  const A = { ...a, hp: a.maxHp };
  const B = { ...b, hp: b.maxHp };
  const log: (LogEntry & { side: "a" | "b" })[] = [];
  const first = A.agility >= B.agility ? "a" : "b";
  for (let turn = 1; turn <= 30 && A.hp > 0 && B.hp > 0; turn++) {
    for (const side of first === "a" ? (["a", "b"] as const) : (["b", "a"] as const)) {
      const [att, def] = side === "a" ? [A, B] : [B, A];
      if (att.hp <= 0 || def.hp <= 0) continue;
      const kind = turn % 3 === 0 ? "skill" : "attack";
      const r = strike(att, def, kind, false);
      def.hp = Math.max(0, def.hp - r.dmg);
      log.push({ turn, side, actor: side === "a" ? "player" : "enemy", action: kind, ...r });
    }
  }
  // Empate por tempo: vence quem tiver mais % de vida.
  const aWins = B.hp <= 0 || (A.hp > 0 && A.hp / A.maxHp >= B.hp / B.maxHp);
  return { aWins, log, hpA: A.hp, hpB: B.hp };
}

/** Elo simplificado. */
export function eloDelta(winner: number, loser: number, k = 32) {
  const expected = 1 / (1 + 10 ** ((loser - winner) / 400));
  return Math.max(1, Math.round(k * (1 - expected)));
}
