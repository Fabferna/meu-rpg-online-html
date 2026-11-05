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
  /** Inimigo exclusivo da história (não aparece na Caçada). */
  story?: boolean;
  /** Chance de envenenar / atordoar ao acertar. */
  traits?: { poison?: number; stun?: number };
};

const RAW: Enemy[] = [
  { id: "sombra_fraca", name: "Criatura das Sombras", minLevel: 1, maxHp: 60, atk: [5, 9], def: 2, agility: 6, xp: 18, gold: 6, image: "/assets/enemies/sombra_fraca-hd.webp", drop: { item: "pocao_vida", chance: 0.2 } },
  { id: "lobo_corrompido", name: "Lobo das Sombras", minLevel: 2, maxHp: 75, atk: [6, 11], def: 3, agility: 14, xp: 28, gold: 8, image: "/assets/enemies/lobo_corrompido-hd.webp" },
  { id: "culto_acolito", name: "Acólito do Olho Vazio", minLevel: 4, maxHp: 110, atk: [9, 15], def: 5, agility: 8, xp: 48, gold: 18, image: "/assets/enemies/culto_acolito-hd.webp", drop: { item: "pocao_vida", chance: 0.3 }, traits: { poison: 0.15 } },
  { id: "vulto_menor", name: "Vulto Atormentado", minLevel: 6, maxHp: 150, atk: [12, 20], def: 6, agility: 10, xp: 75, gold: 25, image: "/assets/enemies/vulto_menor-hd.webp", traits: { stun: 0.1 } },
  { id: "javali_corrompido", name: "Javali das Sombras", minLevel: 9, maxHp: 230, atk: [15, 24], def: 10, agility: 6, xp: 120, gold: 35, image: "/assets/enemies/javali_corrompido-hd.webp", drop: { item: "peitoral_anao", chance: 0.03 } },
  { id: "lider_cultista", name: "Mestre dos Rituais", minLevel: 14, maxHp: 420, atk: [22, 34], def: 14, agility: 12, xp: 320, gold: 120, image: "/assets/enemies/lider_cultista-hd.webp", boss: true, drop: { item: "amuleto_serpente", chance: 0.05 } },
  { id: "escorpiao_ambar", name: "Escorpião Âmbar", minLevel: 11, maxHp: 300, atk: [18, 28], def: 16, agility: 11, xp: 170, gold: 50, image: "/assets/enemies/escorpiao_ambar-hd.webp", drop: { item: "pocao_vida", chance: 0.4 }, traits: { poison: 0.3 } },
  { id: "golem_gelo", name: "Golem de Gelo", minLevel: 16, maxHp: 520, atk: [24, 36], def: 24, agility: 5, xp: 260, gold: 80, image: "/assets/enemies/golem_gelo-hd.webp", drop: { item: "peitoral_anao", chance: 0.06 }, traits: { stun: 0.15 } },
  { id: "lorde_vorlag", name: "Lorde Vorlag, o Sombrio", minLevel: 20, maxHp: 780, atk: [30, 46], def: 22, agility: 16, xp: 600, gold: 220, image: "/assets/lord_vorlag_sombrio.webp", boss: true, drop: { item: "amuleto_serpente", chance: 0.08 }, traits: { stun: 0.12, poison: 0.15 } },
  { id: "serpente_abissal", name: "Serpente Abissal de Meria", minLevel: 25, maxHp: 1100, atk: [38, 58], def: 28, agility: 14, xp: 950, gold: 380, image: "/assets/enemies/serpente_abissal-hd.webp", boss: true, drop: { item: "amuleto_serpente", chance: 0.12 }, traits: { poison: 0.35 } },
  // ── Inimigos da história (únicos, mais fortes que os comuns do mesmo nível) ──
  { id: "story_batedor", name: "Batedor das Sombras", minLevel: 2, maxHp: 120, atk: [7, 11], def: 3, agility: 8, xp: 0, gold: 0, image: "/assets/enemies/sombra_fraca-hd.webp", story: true },
  { id: "story_alfa", name: "Alfa da Matilha Corrompida", minLevel: 4, maxHp: 170, atk: [11, 16], def: 5, agility: 15, xp: 0, gold: 0, image: "/assets/enemies/lobo_corrompido-hd.webp", story: true },
  { id: "story_sacerdote", name: "Sacerdote do Olho Vazio", minLevel: 6, maxHp: 230, atk: [14, 22], def: 7, agility: 9, xp: 0, gold: 0, image: "/assets/enemies/culto_acolito-hd.webp", story: true, traits: { poison: 0.25 } },
  { id: "story_guardiao", name: "Guardião Espectral", minLevel: 8, maxHp: 300, atk: [17, 26], def: 9, agility: 11, xp: 0, gold: 0, image: "/assets/enemies/vulto_menor-hd.webp", story: true, traits: { stun: 0.12 } },
  { id: "story_rainha", name: "Rainha Escorpião", minLevel: 11, maxHp: 900, atk: [22, 32], def: 16, agility: 11, xp: 0, gold: 0, image: "/assets/enemies/escorpiao_ambar-hd.webp", story: true, boss: true, traits: { poison: 0.3 } },
  { id: "story_mestre", name: "Mestre dos Rituais Desperto", minLevel: 14, maxHp: 900, atk: [26, 38], def: 15, agility: 12, xp: 0, gold: 0, image: "/assets/enemies/lider_cultista-hd.webp", story: true, boss: true, traits: { poison: 0.2 } },
  { id: "story_colosso", name: "Colosso das Agulhas", minLevel: 17, maxHp: 1100, atk: [30, 44], def: 26, agility: 5, xp: 0, gold: 0, image: "/assets/enemies/golem_gelo-hd.webp", story: true, boss: true, traits: { stun: 0.18 } },
  { id: "story_arauto", name: "Arauto do Abismo", minLevel: 18, maxHp: 1000, atk: [34, 50], def: 22, agility: 16, xp: 0, gold: 0, image: "/assets/raids/kraken.webp", story: true, boss: true, traits: { poison: 0.3 } },
  { id: "story_vorlag", name: "Lorde Vorlag, Desperto", minLevel: 21, maxHp: 1200, atk: [38, 56], def: 24, agility: 17, xp: 0, gold: 0, image: "/assets/lord_vorlag_sombrio.webp", story: true, boss: true, traits: { stun: 0.15, poison: 0.15 } },
  { id: "story_meria", name: "Meria, a Serpente Primordial", minLevel: 23, maxHp: 1400, atk: [42, 62], def: 28, agility: 15, xp: 0, gold: 0, image: "/assets/enemies/serpente_abissal-hd.webp", story: true, boss: true, traits: { poison: 0.35, stun: 0.1 } },
];

// Balanceamento: os atributos vêm de uma curva por nível (o "inimigo padrão"
// do nível recomendado) vezes a personalidade de cada inimigo. Os números do
// RAW servem só como proporção entre vida/ataque/defesa. Calibrado por simulação
// (scripts de teste): comuns ~90% de vitória, chefes ~55–75% no nível recomendado.
const K = { hp: 100, hpL: 28, atk: 14, atkL: 3.6, def: 1, defL: 0.9, bossHp: 1.3, bossAtk: 0.85 };

function tune(e: Enemy): Enemy {
  const L = e.minLevel;
  const hp = (K.hp + K.hpL * L) * (e.boss ? K.bossHp : 1);
  const atkMid = (K.atk + K.atkL * L) * (e.boss ? K.bossAtk : 1);
  // Personalidade: proporções relativas da tabela RAW (ex.: golem = muita defesa, lobo = rápido).
  const ref = RAW_REF(L);
  const hpP = e.maxHp / ref.hp, atkP = (e.atk[0] + e.atk[1]) / 2 / ref.atk, defP = (e.def + 1) / ref.def;
  const mid = atkMid * Math.sqrt(atkP);
  return {
    ...e,
    maxHp: Math.round(hp * Math.sqrt(e.boss ? Math.min(1, hpP) : hpP)),
    atk: [Math.round(mid * 0.8), Math.round(mid * 1.2)],
    def: Math.round((K.def + K.defL * L) * Math.sqrt(defP)),
  };
}
// Curva aproximada que gerou a tabela RAW original (para extrair as proporções).
function RAW_REF(L: number) { return { hp: 45 + 26 * L, atk: 6 + 1.9 * L, def: 1.5 + 0.95 * L }; }

export const ENEMIES: Enemy[] = RAW.map(tune);

export const ENEMY_BY_ID = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));
