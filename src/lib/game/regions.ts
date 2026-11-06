// Regiões do mundo. Cada uma é liberada por um capítulo da história.
export type Region = { id: string; name: string; description: string; image: string; unlockChapter: number; recommended: string; quests: string[]; enemies: string[]; dungeons: string[] };

export const REGIONS_MAP: Region[] = [
  { id: "valerion", name: "Valerion", description: "A cidade-fortaleza onde sua jornada começa. Sombras rondam o cemitério antigo.",
    image: "/assets/paisagem_epica_de_aethelgard.webp", unlockChapter: 0, recommended: "Nv. 1–5",
    quests: ["patrulha_valerion", "lamento_dos_mortos", "ervas_curandeira"], enemies: ["sombra_fraca", "lobo_corrompido", "culto_acolito"], dungeons: ["cripta"] },
  { id: "sylvandell", name: "Sylvandell", description: "A floresta élfica, onde ruínas antigas sussurram nomes esquecidos.",
    image: "/assets/ruinas_misticas_de_sylvandell.webp", unlockChapter: 2, recommended: "Nv. 3–9",
    quests: ["raizes_corrompidas", "eco_das_sombras", "mercado_sombras"], enemies: ["vulto_menor", "javali_corrompido"], dungeons: [] },
  { id: "deserto", name: "Deserto Âmbar", description: "Dunas sem fim que escondem cidades soterradas e um culto em ascensão.",
    image: "/assets/deserto_ambar.webp", unlockChapter: 4, recommended: "Nv. 7–15",
    quests: ["caravana_perdida", "tempestade_areia"], enemies: ["escorpiao_ambar", "lider_cultista"], dungeons: [] },
  { id: "agulhas", name: "Agulhas Congeladas", description: "Montanhas de gelo eterno, lar dos anões e de colossos adormecidos.",
    image: "/assets/as_agulhas_congeladas.webp", unlockChapter: 6, recommended: "Nv. 13–20",
    quests: ["forja_das_agulhas", "coracao_gelo"], enemies: ["golem_gelo"], dungeons: ["minas"] },
  { id: "meria", name: "Reino Abissal de Meria", description: "O reino afundado de onde a escuridão nasceu. O fim de tudo — ou o recomeço.",
    image: "/assets/reino_abissal_de_meria.webp", unlockChapter: 8, recommended: "Nv. 19+",
    quests: ["reino_abissal", "coroa_vorlag"], enemies: ["lorde_vorlag", "serpente_abissal"], dungeons: ["fortaleza"] },
  { id: "ilhas", name: "Ilhas Celestes", description: "Ilhas de pedra flutuando acima das nuvens, ligadas por pontes de cristal e guardadas por um dragão antigo.",
    image: "/assets/regions/ilhas_celestes-v2.webp", unlockChapter: 10, recommended: "Nv. 26–34",
    quests: ["patrulha_celeste", "ninho_harpias", "cristal_eter"], enemies: ["harpia_tempestade", "sentinela_eter", "dragao_celeste"], dungeons: ["santuario"] },
  { id: "vazio", name: "Fenda do Vazio", description: "A borda do mundo, onde a escuridão engole até a luz das estrelas. Lar de Nyx.",
    image: "/assets/regions/fenda_vazio-v2.webp", unlockChapter: 13, recommended: "Nv. 34+",
    quests: ["eco_vazio", "olho_que_tudo_ve"], enemies: ["espectro_vazio", "devorador_estrelas", "avatar_nyx"], dungeons: ["abismo"] },
];
export const REGION_BY_ID = Object.fromEntries(REGIONS_MAP.map((r) => [r.id, r]));

const index = (key: "quests" | "enemies" | "dungeons") =>
  Object.fromEntries(REGIONS_MAP.flatMap((r) => r[key].map((id) => [id, r])));
export const REGION_OF_QUEST = index("quests");
export const REGION_OF_ENEMY = index("enemies");
export const REGION_OF_DUNGEON = index("dungeons");

/** Liberada se o jogador já concluiu o capítulo exigido. Conteúdo sem região fica sempre liberado. */
export const regionUnlocked = (region: Region | undefined, storyChapter: number) => !region || storyChapter >= region.unlockChapter;
