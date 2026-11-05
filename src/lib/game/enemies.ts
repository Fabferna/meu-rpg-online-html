export type Enemy = {
  id: string;
  name: string;
  minLevel: number;
  maxHp: number;
  atk: [number, number];
  def: number;
  agility: number;
  xp: number;
  gold: number;
  drop?: { item: string; chance: number };
  image: string;
  boss?: boolean;
};

export const ENEMIES: Enemy[] = [
  { id: "sombra_fraca", name: "Criatura das Sombras", minLevel: 1, maxHp: 60, atk: [5, 9], def: 2, agility: 6, xp: 18, gold: 6, image: "/assets/enemies/sombra_fraca.png", drop: { item: "pocao_vida", chance: 0.2 } },
  { id: "lobo_corrompido", name: "Lobo das Sombras", minLevel: 2, maxHp: 75, atk: [6, 11], def: 3, agility: 14, xp: 28, gold: 8, image: "/assets/enemies/lobo_corrompido.png" },
  { id: "culto_acolito", name: "Acólito do Olho Vazio", minLevel: 4, maxHp: 110, atk: [9, 15], def: 5, agility: 8, xp: 48, gold: 18, image: "/assets/enemies/culto_acolito.png", drop: { item: "pocao_vida", chance: 0.3 } },
  { id: "vulto_menor", name: "Vulto Atormentado", minLevel: 6, maxHp: 150, atk: [12, 20], def: 6, agility: 10, xp: 75, gold: 25, image: "/assets/enemies/vulto_menor.png" },
  { id: "javali_corrompido", name: "Javali das Sombras", minLevel: 9, maxHp: 230, atk: [15, 24], def: 10, agility: 6, xp: 120, gold: 35, image: "/assets/enemies/javali_corrompido.png", drop: { item: "peitoral_anao", chance: 0.03 } },
  { id: "lider_cultista", name: "Mestre dos Rituais", minLevel: 14, maxHp: 420, atk: [22, 34], def: 14, agility: 12, xp: 320, gold: 120, image: "/assets/enemies/lider_cultista.png", boss: true, drop: { item: "amuleto_serpente", chance: 0.05 } },
  { id: "escorpiao_ambar", name: "Escorpião Âmbar", minLevel: 11, maxHp: 300, atk: [18, 28], def: 16, agility: 11, xp: 170, gold: 50, image: "/assets/enemies/escorpiao_ambar.png", drop: { item: "pocao_vida", chance: 0.4 } },
  { id: "golem_gelo", name: "Golem de Gelo", minLevel: 16, maxHp: 520, atk: [24, 36], def: 24, agility: 5, xp: 260, gold: 80, image: "/assets/enemies/golem_gelo.png", drop: { item: "peitoral_anao", chance: 0.06 } },
  { id: "lorde_vorlag", name: "Lorde Vorlag, o Sombrio", minLevel: 20, maxHp: 780, atk: [30, 46], def: 22, agility: 16, xp: 600, gold: 220, image: "/assets/lord_vorlag_sombrio.png", boss: true, drop: { item: "amuleto_serpente", chance: 0.08 } },
  { id: "serpente_abissal", name: "Serpente Abissal de Meria", minLevel: 25, maxHp: 1100, atk: [38, 58], def: 28, agility: 14, xp: 950, gold: 380, image: "/assets/enemies/serpente_abissal.png", boss: true, drop: { item: "amuleto_serpente", chance: 0.12 } },
];

export const ENEMY_BY_ID = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));
