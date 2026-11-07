// Mana e Stamina: recursos de COMBATE (enchem no começo de cada luta e se recuperam a cada turno).
//
// • Mana (MP): habilidades mágicas e de suporte. Vem de INT e SAB.
//   Sem mana suficiente a habilidade não pode ser usada.
// • Stamina (SP): ataque básico, habilidades físicas, esquivas e defesa. Vem de CON e DES.
//   Sem stamina: o ataque sai "cansado" (60% do dano), não dá para esquivar e a defesa protege menos.
// • Defender = respirar: além de proteger, recupera 20% da mana.
// Regras puras: o servidor aplica no combate (combat.ts); a tela só mostra.
import type { Attributes } from "./data";
import type { Skill } from "./skills";

export const maxMana = (a: Pick<Attributes, "intel" | "wis">, level: number) => 20 + a.intel * 2 + a.wis + level;
export const maxStamina = (a: Pick<Attributes, "con" | "dex">, level: number) => 20 + a.con + a.dex + level;

export const RES = {
  /** Custos de stamina crescem com o nível (o máximo também cresce com nível e atributos). */
  attackSp: 6,
  dodgeSp: 4,
  defendSp: 5,
  /** Dano do ataque sem stamina. */
  tiredMult: 0.6,
  /** Quanto do dano a defesa deixa passar: com stamina / sem stamina. */
  defend: 0.45, defendTired: 0.7,
  /** Recuperação no fim de cada turno (fração do máximo). */
  regenMp: 0.06, regenSp: 0.05,
  /** Defender recupera esta fração da mana. */
  defendMp: 0.2,
};

/** Custo da habilidade: físicas gastam stamina; mágicas e de suporte gastam mana. */
export function skillCost(sk: Pick<Skill, "type" | "cooldown">): { res: "mp" | "sp"; amount: number } {
  return sk.type === "physical" ? { res: "sp", amount: 8 + 4 * sk.cooldown } : { res: "mp", amount: 8 + 5 * sk.cooldown };
}
/** Custo de stamina do ataque básico, da esquiva e da defesa no nível. */
export const spCost = (base: number, level: number) => Math.round(base + level * 0.25);
