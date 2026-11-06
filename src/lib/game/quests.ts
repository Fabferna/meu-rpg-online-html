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

export const QUESTS: Quest[] = ([
  {
    id: "patrulha_valerion", title: "Patrulha em Valerion", rank: "D", minLevel: 1, energy: 4, durationSec: 60,
    description: "Os guardas pedem reforço na ronda das muralhas ao anoitecer.",
    xp: [15, 22], gold: [8, 14], drop: { item: "pocao_vida", chance: 0.25 }, image: "/assets/paisagem_epica_de_aethelgard.webp",
  },
  {
    id: "lamento_dos_mortos", title: "O Lamento dos Mortos", rank: "D", minLevel: 1, energy: 6, durationSec: 180,
    description: "Investigue as luzes estranhas no Cemitério Antigo.",
    xp: [30, 40], gold: [15, 25], drop: { item: "pocao_vida", chance: 0.35 }, image: "/assets/as_ruinas_sussurrantes.webp",
  },
  {
    id: "caravana_perdida", title: "A Caravana Perdida", rank: "C", minLevel: 3, energy: 10, durationSec: 600,
    description: "Uma caravana sumiu na estrada leste. Encontre os sobreviventes.",
    xp: [80, 100], gold: [40, 60], drop: { item: "arco_elfico", chance: 0.05 }, image: "/assets/deserto_ambar.webp",
  },
  {
    id: "eco_das_sombras", title: "Eco das Sombras", rank: "B", minLevel: 5, energy: 14, durationSec: 1800,
    description: "O diário do cemitério aponta para um santuário oculto.",
    xp: [200, 260], gold: [90, 130], drop: { item: "cajado_luminoso", chance: 0.08 }, image: "/assets/ruinas_misticas_de_sylvandell.webp",
  },
  {
    id: "forja_das_agulhas", title: "A Forja das Agulhas", rank: "A", minLevel: 10, energy: 20, durationSec: 3600,
    description: "Escolte um mestre ferreiro anão através das montanhas geladas.",
    xp: [520, 640], gold: [220, 300], drop: { item: "peitoral_anao", chance: 0.1 }, image: "/assets/as_agulhas_congeladas.webp",
  },
  {
    id: "reino_abissal", title: "Portal do Reino Abissal", rank: "S", minLevel: 18, energy: 28, durationSec: 7200,
    description: "Feche o portal antes que Meria desperte por completo.",
    xp: [1400, 1700], gold: [600, 800], drop: { item: "amuleto_serpente", chance: 0.06 }, image: "/assets/reino_abissal_de_meria.webp",
  },
  {
    id: "raizes_corrompidas", title: "Raízes Corrompidas", rank: "C", minLevel: 3, energy: 10, durationSec: 420,
    description: "As raízes do grande carvalho escurecem. Descubra o que as envenena.",
    xp: [60, 80], gold: [30, 45], drop: { item: "pocao_vida", chance: 0.4 }, image: "/assets/as_ruinas_sussurrantes.webp",
  },
  {
    id: "ervas_curandeira", title: "Ervas para a Curandeira", rank: "D", minLevel: 1, energy: 6, durationSec: 120,
    description: "A curandeira de Sylvandell precisa de raízes-da-lua antes do anoitecer.",
    xp: [20, 28], gold: [10, 16], drop: { item: "pocao_vida", chance: 0.5 }, image: "/assets/comunhao_com_sylvandell.webp",
  },
  {
    id: "tempestade_areia", title: "Tempestade de Areia", rank: "C", minLevel: 4, energy: 14, durationSec: 900,
    description: "Guie um grupo de peregrinos pelo Deserto Âmbar antes que a tempestade os engula.",
    xp: [110, 140], gold: [50, 75], drop: { item: "pocao_vida", chance: 0.4 }, image: "/assets/deserto_ambar.webp",
  },
  {
    id: "mercado_sombras", title: "O Mercado das Sombras", rank: "B", minLevel: 7, energy: 20, durationSec: 2700,
    description: "Infiltre-se no mercado clandestino e descubra quem vende relíquias do culto.",
    xp: [300, 380], gold: [130, 180], drop: { item: "arco_elfico", chance: 0.1 }, image: "/assets/ruinas_misticas_de_sylvandell.webp",
  },
  {
    id: "coracao_gelo", title: "Coração de Gelo", rank: "A", minLevel: 13, energy: 28, durationSec: 5400,
    description: "Recupere o núcleo de um golem antigo nas Agulhas Congeladas.",
    xp: [800, 980], gold: [320, 420], drop: { item: "peitoral_anao", chance: 0.12 }, image: "/assets/as_agulhas_congeladas.webp",
  },
  {
    id: "coroa_vorlag", title: "A Coroa de Vorlag", rank: "S", minLevel: 22, energy: 40, durationSec: 10800,
    description: "Invada a fortaleza do Lorde Sombrio e roube a coroa que alimenta seu poder.",
    xp: [2200, 2600], gold: [900, 1200], drop: { item: "amuleto_serpente", chance: 0.1 }, image: "/assets/lord_vorlag_sombrio_news.webp",
  },
  {
    id: "patrulha_celeste", title: "Patrulha Celeste", rank: "A", minLevel: 26, energy: 26, durationSec: 3600,
    description: "Percorra as pontes de cristal e afaste as harpias das ilhas habitadas.",
    xp: [1800, 2100], gold: [700, 900], drop: { item: "botas_patrulheiro", chance: 0.15 }, image: "/assets/regions/ilhas_celestes-v2.webp",
  },
  {
    id: "ninho_harpias", title: "O Ninho das Harpias", rank: "S", minLevel: 28, energy: 34, durationSec: 7200,
    description: "Encontre o ninho da rainha e recupere os tesouros roubados dos vilarejos.",
    xp: [3000, 3500], gold: [1200, 1500], drop: { item: "botas_vento", chance: 0.05 }, image: "/assets/regions/ilhas_celestes-v2.webp",
  },
  {
    id: "cristal_eter", title: "Cristal de Éter", rank: "S", minLevel: 31, energy: 38, durationSec: 10800,
    description: "Extraia um cristal de éter puro sem acordar as sentinelas.",
    xp: [4200, 4800], gold: [1600, 2000], drop: { item: "cajado_eter", chance: 0.08 }, image: "/assets/regions/ilhas_celestes-v2.webp",
  },
  {
    id: "eco_vazio", title: "Ecos do Vazio", rank: "S", minLevel: 34, energy: 40, durationSec: 10800,
    description: "Feche as pequenas fendas que se abrem pelo reino antes que algo atravesse.",
    xp: [5200, 5900], gold: [2000, 2500], drop: { item: "machado_escarlate", chance: 0.08 }, image: "/assets/regions/fenda_vazio-v2.webp",
  },
  {
    id: "olho_que_tudo_ve", title: "O Olho que Tudo Vê", rank: "S", minLevel: 38, energy: 45, durationSec: 14400,
    description: "Espione o último templo do culto e descubra como Nyx pretende voltar.",
    xp: [7000, 8000], gold: [2800, 3400], drop: { item: "tridente_meria", chance: 0.06 }, image: "/assets/regions/fenda_vazio-v2.webp",
  },
] as Quest[]).sort((a, b) => a.minLevel - b.minLevel || a.durationSec - b.durationSec);

export const QUEST_BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q]));
