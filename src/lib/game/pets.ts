// Pets: um ativo por vez; dão bônus de atributos que crescem com o nível (1–5)
// e AGEM na luta: a cada turno o pet ativo tem uma chance de usar a sua habilidade (combat.ts → petAct).
export type PetDef = {
  id: string; name: string; image: string; rarity: "rare" | "epic" | "legendary"; description: string;
  perLevel: Partial<Record<"atk" | "def" | "str" | "dex" | "con" | "intel", number>>;
  price?: { currency: "gold" | "gems"; amount: number }; // sem preço = só pelo passe de temporada
};

export const PETS: PetDef[] = [
  { id: "lobo", name: "Lobo Espiritual", image: "/assets/pets/lobo.webp", rarity: "rare", description: "Caça ao seu lado: mais ataque e agilidade.",
    perLevel: { atk: 2, dex: 1 }, price: { currency: "gold", amount: 2000 } },
  { id: "coruja", name: "Coruja Arcana", image: "/assets/pets/coruja.webp", rarity: "epic", description: "Canaliza magia: habilidades muito mais fortes.",
    perLevel: { intel: 3 }, price: { currency: "gems", amount: 150 } },
  { id: "tartaruga", name: "Tartaruga de Cristal", image: "/assets/pets/tartaruga.webp", rarity: "epic", description: "Casco de cristal: mais defesa e vida.",
    perLevel: { def: 2, con: 1 }, price: { currency: "gold", amount: 3500 } },
  { id: "fenix", name: "Fênix Lendária", image: "/assets/pets/fenix.webp", rarity: "legendary", description: "Exclusiva do Passe de Temporada: fortalece tudo.",
    perLevel: { atk: 1, def: 1, str: 1, dex: 1, con: 1, intel: 1 } },
];
export const PET_BY_ID = Object.fromEntries(PETS.map((p) => [p.id, p]));
export const PET_MAX_LEVEL = 5;
export const petTrainCost = (level: number) => 500 * level * level; // para ir de `level` a `level+1`
export function petBonus(petId: string, level: number) {
  const p = PET_BY_ID[petId];
  return p ? Object.fromEntries(Object.entries(p.perLevel).map(([k, v]) => [k, (v ?? 0) * level])) : {};
}

// ── Pet em combate ───────────────────────────────────────────────────
/**
 * Habilidade do pet. A cada turno (depois da ação do dono) o pet tem `petChance(nível)` de agir.
 *  • dmg: golpe baseado no ataque físico ("atk") ou no poder mágico ("magic") do dono × petDamageMult(nível).
 *  • weak: enfraquece o inimigo — o próximo ataque dele causa PET_RULES.weakPct% a menos.
 *  • heal: cura o dono em petHealPct(nível)% da vida máxima.
 *  • drain: cura o dono em PET_RULES.drainPct% do dano que o pet causou.
 */
export type PetAbility = { name: string; icon: string; description: string; dmg?: "atk" | "magic"; weak?: boolean; heal?: boolean; drain?: boolean;
  /** Ajuste do dano desta espécie (quem tem efeito extra bate mais fraco). Padrão 1. */
  power?: number };

export const PET_ABILITY: Record<string, PetAbility> = {
  lobo: { name: "Mordida Espiritual", icon: "🐺", dmg: "atk", description: "Em combate: chance de morder o inimigo a cada turno." },
  coruja: { name: "Olhar Arcano", icon: "🦉", dmg: "magic", weak: true, power: 0.7, description: "Em combate: chance de lançar um raio arcano que também enfraquece o próximo ataque do inimigo." },
  tartaruga: { name: "Bênção de Cristal", icon: "🐢", heal: true, description: "Em combate: chance de curar você a cada turno." },
  fenix: { name: "Chama Renascida", icon: "🔥", dmg: "atk", drain: true, power: 0.65, description: "Em combate: chance de queimar o inimigo e curar você com metade do dano." },
};

export const PET_RULES = { baseChance: 0.25, chancePerLevel: 0.03, weakPct: 20, drainPct: 50 };
/** Chance de o pet agir no turno: 28% no nível 1 até 40% no nível 5. */
export const petChance = (level: number) => PET_RULES.baseChance + PET_RULES.chancePerLevel * Math.max(1, Math.min(PET_MAX_LEVEL, level));
/** Parte do golpe do dono que o pet causa: 40% no nível 1 até 60% no nível 5. */
export const petDamageMult = (level: number) => 0.35 + 0.05 * Math.max(1, Math.min(PET_MAX_LEVEL, level));
/** Cura (% da vida máxima do dono): 4% no nível 1 até 8% no nível 5. */
export const petHealPct = (level: number) => 3 + Math.max(1, Math.min(PET_MAX_LEVEL, level));
