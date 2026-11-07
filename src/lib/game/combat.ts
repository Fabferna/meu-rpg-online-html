import "server-only";
import { elementMult, type Element } from "./elements";
import type { LootResult } from "./loot";
import { chance, roll } from "./rng";
import type { Attributes, RaceId } from "./data";
import { SKILL_BY_ID, skillPower, type SkillLoadout } from "./skills";
import type { Enemy } from "./enemies";
import { heroStats, type ItemBonus, type Piece } from "./gear";

export type { ItemBonus } from "./gear";

export type Combatant = {
  name: string;
  hp: number;
  maxHp: number;
  atk: [number, number];
  magic: [number, number];
  def: number;
  agility: number;
  /** Bônus de esquiva/crítico vindos do peso das peças (0.02 = +2 p.p.). */
  dodge?: number;
  crit?: number;
  /** Elemento (elements.ts): +15% contra quem ele vence, −10% contra quem o vence. */
  element?: Element | null;
};

export type LogEntry = {
  turn: number;
  actor: "player" | "enemy";
  action: "attack" | "skill" | "defend" | "potion" | "racial" | "poison" | "stunned";
  /** Habilidade usada (id). */
  skillId?: string;
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
  /** Recarga de cada habilidade (id → turnos). */
  cds?: Record<string, number>;
  effects?: Effects;
  log: LogEntry[];
  rewards?: { xp: number; gold: number; item: string | null; levelUps: number; loot?: LootResult[] };
  /** História: número do capítulo e, ao vencer, a recompensa entregue. */
  story?: number;
  storyResult?: { xp: number; gold: number; gems: number; item?: string; cosmetic?: string; levelUps: number };
  /** Trecho da história (luta antes do chefe): capítulo e número do trecho (1 ou 2). */
  storyTrail?: { chapter: number; step: number };
  /** Masmorra: estágio atual (0 = primeira luta) e total de estágios. */
  dungeon?: { id: string; name: string; stage: number; total: number; chest?: { gold: number; gems: number; item: string | null } };
};

export type PlayerAction = "attack" | "defend" | "potion" | "s0" | "s1" | "s2";

export const SKILL_COOLDOWN = 3;
export const POTION_ITEM = "pocao_vida";

/**
 * Herói em combate. Com `race` e `pieces`, aplica a escala das armas e o peso das peças (gear.ts);
 * sem eles, usa só os bônus somados (compatível com chamadas antigas).
 */
export function playerCombatant(
  name: string, a: Attributes, level: number, hp: number, maxHp: number, gear: ItemBonus[], race?: RaceId, pieces: Piece[] = [], element?: Element | null,
): Combatant {
  const h = heroStats(a, level, gear, race, pieces);
  return { name, hp, maxHp, atk: h.atk, magic: h.magic, def: h.def, agility: h.agility, dodge: h.dodge, crit: h.crit, element: element ?? null };
}

export function enemyCombatant(e: Enemy, hp = e.maxHp): Combatant {
  return { name: e.name, hp, maxHp: e.maxHp, atk: e.atk, magic: e.atk, def: e.def, agility: e.agility, element: e.element ?? null };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function strike(att: Combatant, def: Combatant, kind: "attack" | "skill", defending: boolean, mult = 1, sure = false) {
  const dodge = clamp(0.04 + (def.agility - att.agility) * 0.01 + (def.dodge ?? 0), 0.02, 0.3);
  if (kind === "attack" && !sure && chance(dodge)) return { dmg: 0, miss: true, crit: false };
  const crit = chance(clamp(0.05 + att.agility * 0.004 + (att.crit ?? 0), 0.05, 0.4));
  const base = (kind === "skill" ? roll(...att.magic) * 1.8 : roll(...att.atk)) * mult;
  const armor = kind === "skill" ? def.def * 0.3 : def.def * 0.6;
  let dmg = Math.max(1, Math.round((base - armor) * (crit ? 1.6 : 1) * elementMult(att.element, def.element)));
  if (defending) dmg = Math.max(1, Math.round(dmg * 0.45));
  return { dmg, miss: false, crit };
}

export type EnemyTraits = { poison?: number; stun?: number };

/** Resolve um turno de PVE. O cliente só informa a ação; tudo o resto é calculado aqui. */
export function resolveTurn(
  state: BattleState, action: PlayerAction, p: Combatant, e: Combatant, hasPotion: boolean,
  loadout: SkillLoadout, traits: EnemyTraits = {},
) {
  const s: BattleState = structuredClone(state);
  const fx: Effects = (s.effects ??= {});
  const cds = (s.cds ??= {});
  s.turn += 1;
  let defending = false;
  let potionUsed = false;
  const log = (l: Omit<LogEntry, "turn">) => s.log.push({ turn: s.turn, ...l });

  // Habilidade da barra (s0/s1/s2): precisa estar equipada e fora de recarga.
  let skillId: string | undefined;
  if (action === "s0" || action === "s1" || action === "s2") {
    skillId = loadout.eq[Number(action[1])];
    if (!skillId || !SKILL_BY_ID[skillId] || (cds[skillId] ?? 0) > 0) action = "attack";
  }
  if (action === "potion" && !hasPotion) action = "defend";

  // ── Turno do jogador ──
  if (fx.pStun) {
    fx.pStun -= 1;
    log({ actor: "player", action: "stunned", target: "player" });
  } else if (action === "attack") {
    const r = strike({ ...p, hp: s.player.hp }, e, "attack", false);
    s.enemy.hp = Math.max(0, s.enemy.hp - r.dmg);
    log({ actor: "player", action, ...r });
  } else if (skillId) {
    const sk = SKILL_BY_ID[skillId];
    const pw = skillPower(sk, loadout.lv[skillId] ?? 1);
    cds[skillId] = pw.cooldown + 1;
    let effect: LogEntry["effect"];
    let dmg = 0, crit = false, miss = false, heal = 0;
    if (pw.mult) {
      for (let i = 0; i < (sk.hits ?? 1) && s.enemy.hp > 0; i++) {
        const r = strike({ ...p, hp: s.player.hp }, e, sk.type === "magic" ? "skill" : "attack", false, pw.mult, sk.sure);
        s.enemy.hp = Math.max(0, s.enemy.hp - r.dmg);
        dmg += r.dmg; crit ||= r.crit; miss = (sk.hits ?? 1) === 1 && r.miss;
      }
    }
    if (!miss) {
      if (sk.poison) { fx.ePoison = sk.poison; effect = "poison"; }
      if (sk.stun) { fx.eStun = sk.stun; effect = "stun"; }
    }
    if (sk.lifesteal && dmg) heal += Math.round(dmg * sk.lifesteal);
    if (pw.healPct) heal += Math.round(s.player.maxHp * pw.healPct / 100);
    if (sk.stone) { fx.pStone = sk.stone; effect ??= "stone"; }
    if (heal) s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal);
    if (sk.selfHpPct) { effect = "rage"; s.player.hp = Math.max(1, s.player.hp - Math.round(s.player.maxHp * sk.selfHpPct / 100)); }
    log({ actor: "player", action: "skill", skillId, ...(pw.mult ? { dmg, crit, miss } : {}), ...(heal ? { heal } : {}), effect });
  } else if (action === "defend") {
    defending = true;
    const heal = Math.round(s.player.maxHp * 0.05);
    s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal);
    log({ actor: "player", action, heal });
  } else {
    potionUsed = true;
    const heal = 60;
    s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal);
    log({ actor: "player", action: "potion", heal });
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
  for (const k of Object.keys(cds)) if (cds[k] > 0) cds[k] -= 1;

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

/** Chefe de guilda: N rodadas de golpes (sem contra-ataque). A cada 3ª rodada, habilidade. */
export function raidDamage(p: Combatant, bossDef: number, bossAgility: number, rounds = 6, bossElement?: Element) {
  const boss: Combatant = { name: "boss", hp: 1, maxHp: 1, atk: [0, 0], magic: [0, 0], def: bossDef, agility: bossAgility, element: bossElement ?? null };
  const hits: { dmg: number; crit: boolean; miss: boolean; skill: boolean }[] = [];
  for (let i = 1; i <= rounds; i++) {
    const skill = i % 3 === 0;
    const r = strike(p, boss, skill ? "skill" : "attack", false);
    hits.push({ ...r, skill });
  }
  return { total: hits.reduce((a, h) => a + h.dmg, 0), hits };
}
