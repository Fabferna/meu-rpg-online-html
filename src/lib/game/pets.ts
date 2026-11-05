// Pets: um ativo por vez; dão bônus de atributos que crescem com o nível (1–5).
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
