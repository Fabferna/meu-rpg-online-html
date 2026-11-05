import "server-only";
import { chance, roll } from "./rng";
import type { Attributes, RaceId } from "./data";
import { RACIAL_SKILLS } from "./racial";
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
  action: "attack" | "skill" | "defend" | "potion" | "racial" | "poison" | "stunned";
  /** Quem recebe o efeito (para veneno/atordoamento). */
  target?: "player" | "enemy";
  dmg?: number;
  heal?: number;
  crit?: boolean;
  miss?: boolean;
  /** Efeito aplicado por este golpe. */
  effect?: "poison" | "stun" | "stone" | "rage";
};

export type Effects = { pPoison?: number; pStun?: number; pStone?: number; ePoison?: number; eStun?: number };

export type BattleState = {
  enemyId: string;
  enemy: { name: string; image: string; hp: number; maxHp: number; boss?: boolean };
  player: { hp: number; maxHp: number };
  turn: number;
  skillCooldown: number;
  racialCooldown?: number;
  effects?: Effects;
  log: LogEntry[];
  rewards?: { xp: number; gold: number; item: string | null; levelUps: number };
};

export type PlayerAction = "attack" | "skill" | "defend" | "potion" | "racial";

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

function strike(att: Combatant, def: Combatant, kind: "attack" | "skill", defending: boolean, mult = 1, sure = false) {
  const dodge = clamp(0.04 + (def.agility - att.agility) * 0.01, 0.02, 0.25);
  if (kind === "attack" && !sure && chance(dodge)) return { dmg: 0, miss: true, crit: false };
  const crit = chance(clamp(0.05 + att.agility * 0.004, 0.05, 0.35));
  const base = (kind === "skill" ? roll(...att.magic) * 1.8 : roll(...att.atk)) * mult;
  const armor = kind === "skill" ? def.def * 0.3 : def.def * 0.6;
  let dmg = Math.max(1, Math.round((base - armor) * (crit ? 1.6 : 1)));
  if (defending) dmg = Math.max(1, Math.round(dmg * 0.45));
  return { dmg, miss: false, crit };
}

export type EnemyTraits = { poison?: number; stun?: number };

/** Resolve um turno de PVE. O cliente só informa a ação; tudo o resto é calculado aqui. */
export function resolveTurn(
  state: BattleState, action: PlayerAction, p: Combatant, e: Combatant, hasPotion: boolean,
  race: RaceId, traits: EnemyTraits = {},
) {
  const s: BattleState = structuredClone(state);
  const fx: Effects = (s.effects ??= {});
  s.racialCooldown ??= 0;
  s.turn += 1;
  let defending = false;
  let potionUsed = false;
  const log = (l: Omit<LogEntry, "turn">) => s.log.push({ turn: s.turn, ...l });

  if (action === "skill" && s.skillCooldown > 0) action = "attack";
  if (action === "racial" && s.racialCooldown > 0) action = "attack";
  if (action === "potion" && !hasPotion) action = "defend";

  // ── Turno do jogador ──
  if (fx.pStun) {
    fx.pStun -= 1;
    log({ actor: "player", action: "stunned", target: "player" });
  } else if (action === "attack" || action === "skill") {
    const r = strike({ ...p, hp: s.player.hp }, e, action, false);
    s.enemy.hp = Math.max(0, s.enemy.hp - r.dmg);
    log({ actor: "player", action, ...r });
    if (action === "skill") s.skillCooldown = SKILL_COOLDOWN + 1;
  } else if (action === "racial") {
    const sk = RACIAL_SKILLS[race];
    s.racialCooldown = sk.cooldown + 1;
    if (race === "anao") {
      fx.pStone = 3;
      const heal = Math.round(s.player.maxHp * 0.1);
      s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal);
      log({ actor: "player", action: "racial", heal, effect: "stone" });
    } else {
      const kind = race === "aetheliano" ? "skill" : "attack";
      const mult = { humano: 1.8, elfo: 1.1, gronar: 2.6, aetheliano: 1.6 }[race];
      const r = strike({ ...p, hp: s.player.hp }, e, kind, false, mult, race === "humano");
      s.enemy.hp = Math.max(0, s.enemy.hp - r.dmg);
      let effect: LogEntry["effect"];
      if (race === "elfo" && !r.miss) { fx.ePoison = 3; effect = "poison"; }
      if (race === "aetheliano") { fx.eStun = 1; effect = "stun"; }
      if (race === "gronar") {
        effect = "rage";
        s.player.hp = Math.max(1, s.player.hp - Math.round(s.player.maxHp * 0.06));
      }
      log({ actor: "player", action: "racial", ...r, effect });
    }
  } else if (action === "defend") {
    defending = true;
    const heal = Math.round(s.player.maxHp * 0.05);
    s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal);
    log({ actor: "player", action, heal });
  } else {
    potionUsed = true;
    const heal = 60;
    s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal);
    log({ actor: "player", action, heal });
  }

  // Veneno no inimigo.
  if (s.enemy.hp > 0 && fx.ePoison) {
    const dmg = Math.max(3, Math.round(s.enemy.maxHp * 0.04));
    s.enemy.hp = Math.max(0, s.enemy.hp - dmg);
    fx.ePoison -= 1;
    log({ actor: "player", action: "poison", target: "enemy", dmg });
  }

  // ── Turno do inimigo ──
  if (s.enemy.hp > 0) {
    if (fx.eStun) {
      fx.eStun -= 1;
      log({ actor: "enemy", action: "stunned", target: "enemy" });
    } else {
      const r = strike(e, { ...p, hp: s.player.hp }, "attack", defending);
      if (fx.pStone && !r.miss) r.dmg = Math.max(1, Math.round(r.dmg * 0.5));
      s.player.hp = Math.max(0, s.player.hp - r.dmg);
      let effect: LogEntry["effect"];
      if (!r.miss && traits.poison && !fx.pPoison && chance(traits.poison)) { fx.pPoison = 3; effect = "poison"; }
      else if (!r.miss && traits.stun && chance(traits.stun)) { fx.pStun = 1; effect = "stun"; }
      log({ actor: "enemy", action: "attack", ...r, effect });
    }
  }

  // Veneno no jogador.
  if (s.player.hp > 0 && fx.pPoison) {
    const dmg = Math.max(2, Math.round(s.player.maxHp * 0.04));
    s.player.hp = Math.max(0, s.player.hp - dmg);
    fx.pPoison -= 1;
    log({ actor: "enemy", action: "poison", target: "player", dmg });
  }

  if (fx.pStone) fx.pStone -= 1;
  if (s.skillCooldown > 0) s.skillCooldown -= 1;
  if (s.racialCooldown > 0) s.racialCooldown -= 1;

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
