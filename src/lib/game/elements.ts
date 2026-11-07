// Elementos: cada herói escolhe um elemento e todo inimigo tem o seu.
// Ciclo: Fogo vence Ar, Ar vence Terra, Terra vence Água, Água vence Fogo. Luz e Sombra vencem uma à outra.
// Vantagem = +15% de dano; desvantagem = −10%. Vale para os DOIS lados (o inimigo também aproveita).
// Regras puras: o servidor aplica no combate (combat.ts → strike); a tela só mostra.

export type Element = "fogo" | "agua" | "terra" | "ar" | "luz" | "sombra";
export const ELEMENTS: Element[] = ["fogo", "agua", "terra", "ar", "luz", "sombra"];

export const ELEMENT_INFO: Record<Element, { label: string; icon: string; color: string }> = {
  fogo: { label: "Fogo", icon: "🔥", color: "text-orange-300" },
  agua: { label: "Água", icon: "💧", color: "text-sky-300" },
  terra: { label: "Terra", icon: "🪨", color: "text-amber-300" },
  ar: { label: "Ar", icon: "🌪️", color: "text-emerald-300" },
  luz: { label: "Luz", icon: "✨", color: "text-yellow-200" },
  sombra: { label: "Sombra", icon: "🌑", color: "text-violet-300" },
};

/** Quem cada elemento vence. */
export const BEATS: Record<Element, Element[]> = {
  fogo: ["ar"], ar: ["terra"], terra: ["agua"], agua: ["fogo"], luz: ["sombra"], sombra: ["luz"],
};

export const ELEMENT_ADVANTAGE = 1.15;
export const ELEMENT_DISADVANTAGE = 0.9;
/** Trocar de elemento (a 1ª escolha é grátis). */
export const ELEMENT_CHANGE_GEMS = 50;

export const isElement = (x: unknown): x is Element => typeof x === "string" && (ELEMENTS as string[]).includes(x);

/** Multiplicador de dano de quem ataca (`att`) contra quem defende (`def`). Sem elemento = neutro. */
export function elementMult(att?: Element | null, def?: Element | null) {
  if (!att || !def) return 1;
  if (BEATS[att].includes(def)) return ELEMENT_ADVANTAGE;
  if (BEATS[def].includes(att)) return ELEMENT_DISADVANTAGE;
  return 1;
}

/** "forte" / "fraco" / null — para mostrar no cartão do inimigo. */
export function matchup(hero?: Element | null, enemy?: Element | null): "forte" | "fraco" | null {
  const m = elementMult(hero, enemy);
  return m > 1 ? "forte" : m < 1 ? "fraco" : null;
}

/** Elemento do inimigo pela família da arte (todos os inimigos de uma família compartilham o elemento). */
const BY_ART: [string, Element][] = [
  ["sombra_fraca", "sombra"], ["lobo_corrompido", "ar"], ["culto_acolito", "fogo"], ["vulto_menor", "luz"],
  ["javali_corrompido", "terra"], ["lider_cultista", "fogo"], ["escorpiao_ambar", "terra"], ["golem_gelo", "agua"],
  ["lord_vorlag", "sombra"], ["serpente_abissal", "agua"], ["harpia_tempestade", "ar"], ["sentinela_eter", "luz"],
  ["dragao_celeste", "fogo"], ["espectro_vazio", "sombra"], ["devorador_estrelas", "sombra"], ["avatar_nyx", "sombra"],
  ["kraken", "agua"],
];
export function elementOfArt(image: string): Element | undefined {
  return BY_ART.find(([k]) => image.includes(k))?.[1];
}
