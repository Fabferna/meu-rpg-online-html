// Catálogo de missões. Recompensas são SORTEADAS NO SERVIDOR ao iniciar.
export type Quest = {
  id: string;
  title: string;
  description: string;
  rank: "D" | "C" | "B" | "A" | "S";
  minLevel: number;
  energy: number;
  durationSec: number;
  xp: [number, number];
  gold: [number, number];
  drop?: { item: string; chance: number };
  image: string;
};

export const QUESTS: Quest[] = [
  {
    id: "patrulha_valerion", title: "Patrulha em Valerion", rank: "D", minLevel: 1, energy: 5, durationSec: 60,
    description: "Os guardas pedem reforço na ronda das muralhas ao anoitecer.",
    xp: [15, 22], gold: [8, 14], drop: { item: "pocao_vida", chance: 0.25 }, image: "/assets/paisagem_epica_de_aethelgard.png",
  },
  {
    id: "lamento_dos_mortos", title: "O Lamento dos Mortos", rank: "D", minLevel: 1, energy: 8, durationSec: 180,
    description: "Investigue as luzes estranhas no Cemitério Antigo.",
    xp: [30, 40], gold: [15, 25], drop: { item: "pocao_vida", chance: 0.35 }, image: "/assets/as_ruinas_sussurrantes.png",
  },
  {
    id: "caravana_perdida", title: "A Caravana Perdida", rank: "C", minLevel: 3, energy: 12, durationSec: 600,
    description: "Uma caravana sumiu na estrada leste. Encontre os sobreviventes.",
    xp: [80, 100], gold: [40, 60], drop: { item: "arco_elfico", chance: 0.05 }, image: "/assets/deserto_ambar.png",
  },
  {
    id: "eco_das_sombras", title: "Eco das Sombras", rank: "B", minLevel: 5, energy: 18, durationSec: 1800,
    description: "O diário do cemitério aponta para um santuário oculto.",
    xp: [200, 260], gold: [90, 130], drop: { item: "cajado_luminoso", chance: 0.08 }, image: "/assets/ruinas_misticas_de_sylvandell.png",
  },
  {
    id: "forja_das_agulhas", title: "A Forja das Agulhas", rank: "A", minLevel: 10, energy: 25, durationSec: 3600,
    description: "Escolte um mestre ferreiro anão através das montanhas geladas.",
    xp: [520, 640], gold: [220, 300], drop: { item: "peitoral_anao", chance: 0.1 }, image: "/assets/as_agulhas_congeladas.png",
  },
  {
    id: "reino_abissal", title: "Portal do Reino Abissal", rank: "S", minLevel: 18, energy: 35, durationSec: 7200,
    description: "Feche o portal antes que Meria desperte por completo.",
    xp: [1400, 1700], gold: [600, 800], drop: { item: "amuleto_serpente", chance: 0.06 }, image: "/assets/reino_abissal_de_meria.png",
  },
];

export const QUEST_BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q]));
