// Equipamento por classe/atributo. Regras puras (sem I/O): o SERVIDOR usa para calcular o combate
// (combat.ts/player.ts); o cliente importa só para EXIBIR ("Dano efetivo para você").
//
// • Cada raça tem 2 atributos principais e tipos de arma preferidos.
// • Cada arma tem um tipo e um atributo de escala:
//     dano da arma = base + atributo de escala × coeficiente da raridade (× maior se for o tipo preferido)
//                    + bônus por nível do herói
// • Elmos, armaduras e botas têm peso (leve/média/pesada). Cada raça aproveita melhor um peso.
import type { Attributes, RaceId } from "./data";

export type Attr = "str" | "dex" | "con" | "intel" | "wis";
export type WeaponType = "espada" | "arco" | "machado" | "martelo" | "cajado" | "tridente";
export type Weight = "leve" | "media" | "pesada";
export type Rarity = "common" | "rare" | "epic" | "legendary";

export const ATTR_LABEL: Record<Attr, string> = { str: "FOR", dex: "DES", con: "CON", intel: "INT", wis: "SAB" };
export const WEIGHT_LABEL: Record<Weight, string> = { leve: "Leve", media: "Média", pesada: "Pesada" };

/** `arcane`: a arma reforça a magia (habilidades mágicas) em vez do golpe físico. */
export const WEAPON_TYPES: Record<WeaponType, { label: string; scale: Attr; arcane?: boolean }> = {
  espada: { label: "Espada", scale: "str" },
  arco: { label: "Arco", scale: "dex" },
  machado: { label: "Machado", scale: "str" },
  martelo: { label: "Martelo", scale: "str" },
  cajado: { label: "Cajado", scale: "intel", arcane: true },
  tridente: { label: "Tridente", scale: "intel", arcane: true },
};

export type Build = "versatil" | "agil" | "resistente" | "arcano";
export type RaceProfile = {
  main: [Attr, Attr];
  prefers: WeaponType[];
  /** Tipo preferido que, nesta raça, escala com outro atributo (ex.: elfo + espada → DES). */
  scaleOverride?: Partial<Record<WeaponType, Attr>>;
  build: Build;
  /** Peso de peça que a raça aproveita melhor ("qualquer" = versátil, bônus menor em todas). */
  weight: Weight | "qualquer";
};

export const RACE_PROFILE: Record<RaceId, RaceProfile> = {
  humano: { main: ["str", "dex"], prefers: ["espada"], build: "versatil", weight: "qualquer" },
  elfo: { main: ["dex", "str"], prefers: ["arco"], build: "agil", weight: "leve" },
  anao: { main: ["str", "con"], prefers: ["martelo", "machado"], build: "resistente", weight: "pesada" },
  gronar: { main: ["str", "con"], prefers: ["machado"], build: "resistente", weight: "pesada" },
  aetheliano: { main: ["intel", "wis"], prefers: ["cajado", "tridente"], build: "arcano", weight: "leve" },
};

/** Quanto do atributo de escala vira dano, por raridade. */
export const RARITY_COEF: Record<Rarity, number> = { common: 0.1, rare: 0.14, epic: 0.19, legendary: 0.25 };
/** Arma do tipo preferido da raça: escala maior. */
export const PREFERRED_MULT = 1.5;
/** Bônus de dano por nível do herói (dobra no tipo preferido). */
export const LEVEL_BONUS = 0.06;

/** Bônus por peça do peso certo para a raça (elmo, armadura e botas: até 3 peças). */
export const WEIGHT_BONUS: Record<Build, { dodge?: number; crit?: number; defPct?: number; hpPct?: number; magicPct?: number }> = {
  agil: { dodge: 0.02, crit: 0.025 },          // elfo + peças leves
  resistente: { defPct: 0.3, hpPct: 0.04 },    // anão/gronar + peças pesadas
  arcano: { magicPct: 0.05, dodge: 0.01 },     // aetheliano + mantos/peças leves
  versatil: { defPct: 0.1, crit: 0.01 },       // humano: um pouco com qualquer peça
};

export type WeaponInfo = {
  type: WeaponType; attr: Attr; preferred: boolean; arcane: boolean;
  base: number; fromAttr: number; fromLevel: number; total: number;
};

type ItemLike = { id?: string; slot?: string; rarity: Rarity; weapon?: WeaponType; weight?: Weight };

/** Atributo que a arma usa para esta raça e se é do tipo preferido. */
export function weaponScale(type: WeaponType, race: RaceId) {
  const prof = RACE_PROFILE[race];
  const preferred = prof.prefers.includes(type);
  const attr = (preferred && prof.scaleOverride?.[type]) || WEAPON_TYPES[type].scale;
  return { attr, preferred };
}

/**
 * Dano efetivo da arma para um herói.
 * `stats` = atributos do item já com aprimoramento e afinidade; `attrs` = atributos do herói (com bônus de equipamentos).
 */
export function weaponDamage(item: ItemLike, stats: Record<string, number>, race: RaceId, attrs: Attributes, level: number): WeaponInfo | null {
  if (item.slot !== "weapon" || !item.weapon) return null;
  const { attr, preferred } = weaponScale(item.weapon, race);
  const base = stats.atk ?? 0;
  const fromAttr = Math.round(attrs[attr] * RARITY_COEF[item.rarity] * (preferred ? PREFERRED_MULT : 1));
  const fromLevel = Math.round(level * LEVEL_BONUS * (preferred ? 2 : 1));
  return { type: item.weapon, attr, preferred, arcane: !!WEAPON_TYPES[item.weapon].arcane, base, fromAttr, fromLevel, total: base + fromAttr + fromLevel };
}

/** A peça é do peso que a raça aproveita? */
export const weightMatches = (item: ItemLike, race: RaceId) =>
  !!item.weight && (RACE_PROFILE[race].weight === "qualquer" || item.weight === RACE_PROFILE[race].weight);

export type GearMods = { dodge: number; crit: number; defPct: number; hpPct: number; magicPct: number; pieces: number };

/** Soma dos bônus de peso das peças equipadas. */
export function weightMods(items: ItemLike[], race: RaceId): GearMods {
  const b = WEIGHT_BONUS[RACE_PROFILE[race].build];
  const n = items.filter((i) => i.slot !== "weapon" && i.slot !== "accessory" && weightMatches(i, race)).length;
  return { dodge: (b.dodge ?? 0) * n, crit: (b.crit ?? 0) * n, defPct: (b.defPct ?? 0) * n, hpPct: (b.hpPct ?? 0) * n, magicPct: (b.magicPct ?? 0) * n, pieces: n };
}

/** Bônus de peso como textos traduzíveis ({ chave, variáveis }), para exibir no item. */
export function weightBonusText(race: RaceId): { k: string; n: number }[] {
  const b = WEIGHT_BONUS[RACE_PROFILE[race].build];
  const pct = (x: number) => Math.round(x * 1000) / 10;
  return [
    b.dodge ? { k: "+{n}% esquiva", n: pct(b.dodge) } : null,
    b.crit ? { k: "+{n}% crítico", n: pct(b.crit) } : null,
    b.defPct ? { k: "+{n}% DEF da peça", n: pct(b.defPct) } : null,
    b.hpPct ? { k: "+{n}% vida em combate", n: pct(b.hpPct) } : null,
    b.magicPct ? { k: "+{n}% magia", n: pct(b.magicPct) } : null,
  ].filter((x): x is { k: string; n: number } => !!x);
}

// ── Números de combate do herói ─────────────────────────────────────
export type ItemBonus = Partial<{ atk: number; def: number; str: number; dex: number; con: number; intel: number }>;
export type Piece = { item: ItemLike; stats: Record<string, number> };
export type HeroStats = {
  atk: [number, number]; magic: [number, number]; def: number; agility: number;
  dodge: number; crit: number; hpPct: number; weapon: WeaponInfo | null; mods: GearMods;
};

/** Golpe físico: o atributo de escala da arma vira a base do golpe (sem arma física: FOR). */
export const PHYS = { lo: 0.75, hi: 1.1, lvlLo: 1, lvlHi: 2 };
/** Arma arcana: parte do dano da arma reforça a magia. */
export const ARCANE_SHARE = 0.6;

/**
 * Ataque, magia, defesa e bônus do herói. `gear` = bônus somados de todas as peças (e pet);
 * `pieces` = peças equipadas com seus atributos finais (aprimoramento + afinidade).
 */
export function heroStats(a: Attributes, level: number, gear: ItemBonus[], race?: RaceId, pieces: Piece[] = []): HeroStats {
  const b = gear.reduce<Required<ItemBonus>>(
    (acc, g) => ({
      atk: acc.atk + (g.atk ?? 0), def: acc.def + (g.def ?? 0), str: acc.str + (g.str ?? 0),
      dex: acc.dex + (g.dex ?? 0), con: acc.con + (g.con ?? 0), intel: acc.intel + (g.intel ?? 0),
    }),
    { atk: 0, def: 0, str: 0, dex: 0, con: 0, intel: 0 },
  );
  const eff: Attributes = { ...a, str: a.str + b.str, dex: a.dex + b.dex, con: a.con + b.con, intel: a.intel + b.intel };
  const w = race ? pieces.map((p) => weaponDamage(p.item, p.stats, race, eff, level)).find(Boolean) ?? null : null;
  const mods = race ? weightMods(pieces.map((p) => p.item), race) : { dodge: 0, crit: 0, defPct: 0, hpPct: 0, magicPct: 0, pieces: 0 };
  const matchDef = race ? pieces.filter((p) => weightMatches(p.item, race) && p.item.slot !== "weapon" && p.item.slot !== "accessory").reduce((n, p) => n + (p.stats.def ?? 0), 0) : 0;

  // Físico: a arma física troca a FOR pelo seu atributo de escala e soma o dano extra (atributo + nível).
  const S = w && !w.arcane ? eff[w.attr] : eff.str;
  const physExtra = w && !w.arcane ? w.fromAttr + w.fromLevel : 0;
  const atkBonus = b.atk + physExtra;
  // Magia: INT (+ SAB para quem tem SAB como principal) e a parte arcana da arma.
  const wisPart = race && RACE_PROFILE[race].main.includes("wis") ? Math.round(eff.wis * 0.3) : 0;
  const arc = w?.arcane ? Math.round((w.fromAttr + w.fromLevel) * ARCANE_SHARE) : 0;
  const mk = 1 + mods.magicPct;
  return {
    atk: [Math.round(S * PHYS.lo + level * PHYS.lvlLo) + atkBonus, Math.round(S * PHYS.hi + level * PHYS.lvlHi) + atkBonus],
    magic: [Math.round((eff.intel + wisPart + level + arc) * mk), Math.round((eff.intel * 1.7 + wisPart + level * 2 + arc) * mk)],
    def: Math.round(eff.con * 0.5 + b.def + matchDef * mods.defPct),
    agility: eff.dex,
    dodge: mods.dodge, crit: mods.crit, hpPct: mods.hpPct, weapon: w, mods,
  };
}
