// Masmorras: lutas em sequência sem recuperar vida entre elas, baú no final.
export type Dungeon = {
  id: string; name: string; description: string; image: string; minLevel: number; energy: number;
  stages: string[]; // ids de inimigos (o último é o guardião)
  chest: { gold: number; gems: number; item?: { id: string; chance: number } };
};

export const DUNGEONS: Dungeon[] = [
  { id: "cripta", name: "Cripta de Valerion", description: "Sob o cemitério antigo, o culto guarda seus segredos.", image: "/assets/as_ruinas_sussurrantes.webp",
    minLevel: 3, energy: 20, stages: ["sombra_fraca", "lobo_corrompido", "culto_acolito"], chest: { gold: 300, gems: 0, item: { id: "arco_elfico", chance: 0.25 } } },
  { id: "minas", name: "Minas Congeladas", description: "Túneis de gelo onde algo enorme desperta.", image: "/assets/as_agulhas_congeladas.webp",
    minLevel: 14, energy: 25, stages: ["javali_corrompido", "escorpiao_ambar", "golem_gelo"], chest: { gold: 900, gems: 3, item: { id: "peitoral_anao", chance: 0.2 } } },
  { id: "fortaleza", name: "Fortaleza de Vorlag", description: "O covil do Lorde Sombrio. Só os mais fortes voltam.", image: "/assets/lord_vorlag_sombrio_news.webp",
    minLevel: 22, energy: 30, stages: ["golem_gelo", "lider_cultista", "lorde_vorlag"], chest: { gold: 2500, gems: 8, item: { id: "amuleto_serpente", chance: 0.15 } } },
  { id: "santuario", name: "Santuário Celeste", description: "Um templo nas nuvens, onde o dragão guardava seus tesouros.", image: "/assets/regions/ilhas_celestes.webp",
    minLevel: 28, energy: 32, stages: ["harpia_tempestade", "sentinela_eter", "dragao_celeste"], chest: { gold: 4000, gems: 10, item: { id: "armadura_celeste", chance: 0.18 } } },
  { id: "abismo", name: "Abismo Estelar", description: "Desça pela fenda e enfrente o avatar de Nyx.", image: "/assets/regions/fenda_vazio.webp",
    minLevel: 36, energy: 35, stages: ["espectro_vazio", "devorador_estrelas", "avatar_nyx"], chest: { gold: 6000, gems: 14, item: { id: "olho_vazio", chance: 0.12 } } },
];
export const DUNGEON_BY_ID = Object.fromEntries(DUNGEONS.map((d) => [d.id, d]));
export const DUNGEON_DAILY = 1;
/** Descanso entre estágios: recupera esta fração da vida máxima. */
export const DUNGEON_REST = 0.25;
