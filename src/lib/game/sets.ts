// Conjuntos de equipamento: vestir 2 ou 3 peças do mesmo conjunto dá um bônus extra.
// Regras puras (sem I/O): o SERVIDOR soma o bônus no combate (player.ts → loadPlayer, como o pet);
// a tela usa as mesmas funções para mostrar o progresso e a comparação ▲/▼.
// Cada item pertence a no máximo UM conjunto. O bônus não depende de aprimoramento nem de afinidade.
import type { ItemBonus } from "./gear";

export type GearSet = {
  id: string;
  name: string;
  /** Peças do conjunto (ids de items.ts). */
  pieces: string[];
  /** Bônus com 2 e com 3 peças (o de 3 substitui o de 2, não soma). */
  bonus: { 2: ItemBonus; 3: ItemBonus };
};

export const GEAR_SETS: GearSet[] = [
  { id: "viajante", name: "Conjunto do Viajante", pieces: ["capuz_viajante", "gibao_couro", "botas_couro"],
    bonus: { 2: { dex: 1 }, 3: { def: 1, dex: 2, con: 1 } } },
  { id: "patrulheiro", name: "Conjunto do Patrulheiro", pieces: ["arco_longo", "botas_patrulheiro", "capuz_sentinela"],
    bonus: { 2: { dex: 3 }, 3: { dex: 5, atk: 3 } } },
  { id: "valerion", name: "Guarda de Valerion", pieces: ["espada_capitao", "couraca_escamas", "botas_cavaleiro"],
    bonus: { 2: { def: 1, str: 2 }, 3: { def: 3, str: 3, con: 2 } } },
  { id: "escarlate", name: "Guerreiro Escarlate", pieces: ["machado_escarlate", "estandarte_inspirador", "cota_malha"],
    bonus: { 2: { str: 2, atk: 2 }, 3: { str: 4, atk: 3, con: 3 } } },
  { id: "forja_runica", name: "Forja Rúnica", pieces: ["martelo_forja", "peitoral_anao", "grevas_runicas"],
    bonus: { 2: { def: 2, con: 2 }, 3: { def: 4, con: 3, str: 3 } } },
  { id: "arcano", name: "Vestes do Arcano", pieces: ["manto_arcano", "tiara_lunar", "foco_arcano"],
    bonus: { 2: { intel: 2 }, 3: { intel: 4, def: 1 } } },
  { id: "ceu_eterno", name: "Céu Eterno", pieces: ["elmo_estelar", "grevas_eter", "armadura_celeste"],
    bonus: { 2: { def: 4, con: 3 }, 3: { def: 8, con: 5, str: 3 } } },
  { id: "sombra_lunar", name: "Sombra Lunar", pieces: ["veste_lunar", "botas_vento", "arco_tempestade"],
    bonus: { 2: { dex: 4 }, 3: { dex: 7, atk: 4, intel: 3 } } },
];

export const SET_BY_ID = Object.fromEntries(GEAR_SETS.map((s) => [s.id, s]));
/** Conjunto de cada item (item → conjunto). */
export const SET_OF_ITEM: Record<string, GearSet> = Object.fromEntries(GEAR_SETS.flatMap((s) => s.pieces.map((p) => [p, s])));

export type ActiveSet = { set: GearSet; count: number; bonus: ItemBonus | null };

/** Conjuntos com pelo menos 1 peça equipada, com quantas peças e o bônus ativo (null se < 2). */
export function activeSets(equippedIds: string[]): ActiveSet[] {
  const ids = new Set(equippedIds);
  return GEAR_SETS.map((set) => {
    const count = set.pieces.filter((p) => ids.has(p)).length;
    const bonus = count >= 3 ? set.bonus[3] : count === 2 ? set.bonus[2] : null;
    return { set, count, bonus };
  }).filter((a) => a.count > 0);
}

/** Bônus de conjunto para somar no combate (mesma lista do pet: ItemBonus[]). */
export function setBonuses(equippedIds: string[]): ItemBonus[] {
  return activeSets(equippedIds).flatMap((a) => (a.bonus ? [a.bonus] : []));
}
