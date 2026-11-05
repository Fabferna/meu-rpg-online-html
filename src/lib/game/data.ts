// Dados estáticos do mundo. Compartilhados entre cliente (exibição)
// e servidor (validação). Nada aqui é "segredo" — os VALORES finais
// (atributos, HP, energia) são sempre recalculados no servidor.

export const RACE_IDS = ["humano", "elfo", "anao", "gronar", "aetheliano"] as const;
export const REGION_IDS = ["sylvandell", "agulhas_congeladas", "deserto_ambar"] as const;
export const GENDERS = ["male", "female"] as const;

export type RaceId = (typeof RACE_IDS)[number];
export type RegionId = (typeof REGION_IDS)[number];
export type Gender = (typeof GENDERS)[number];

export type Attributes = { str: number; dex: number; con: number; intel: number; wis: number; cha: number };

export const REGIONS: Record<RegionId, { name: string; description: string; image: string }> = {
  sylvandell: {
    name: "Sylvandell",
    description: "Antiga floresta élfica, cheia de mistérios e magia ancestral.",
    image: "/assets/as_ruinas_sussurrantes.webp",
  },
  agulhas_congeladas: {
    name: "Agulhas Congeladas",
    description: "Montanhas imponentes, lar de clãs resistentes e feras gélidas.",
    image: "/assets/as_agulhas_congeladas.webp",
  },
  deserto_ambar: {
    name: "Deserto Âmbar",
    description: "Vastas dunas que escondem ruínas de civilizações perdidas e perigos.",
    image: "/assets/deserto_ambar.webp",
  },
};

export const RACES: Record<
  RaceId,
  { name: string; description: string; image: string; portraits: Record<Gender, string>; attributes: Attributes; bonus: string }
> = {
  humano: {
    name: "Humano",
    description: "Versáteis e adaptáveis, os humanos podem prosperar em qualquer lugar.",
    image: "/assets/aventureiro_de_aethelgard.webp",
    portraits: { male: "/assets/guerreiro_fantastico_determinado.webp", female: "/assets/aventureira_curiosa.webp" },
    attributes: { str: 10, dex: 10, con: 10, intel: 10, wis: 10, cha: 10 },
    bonus: "+1 atributo à escolha a cada 5 níveis.",
  },
  elfo: {
    name: "Elfo de Sylvandell",
    description: "Graciosos e conectados à magia da natureza, com sentidos aguçados.",
    image: "/assets/elfo_gracioso_de_sylvandelli.webp",
    portraits: { male: "/assets/elfo_de_Sylvandell_masc.webp", female: "/assets/elfo_de_sylvandell_mulher.webp" },
    attributes: { str: 9, dex: 12, con: 9, intel: 11, wis: 10, cha: 9 },
    bonus: "Visão no escuro e resistência a encantamentos.",
  },
  anao: {
    name: "Anão das Montanhas",
    description: "Robustos, resilientes e mestres na forja e no combate subterrâneo.",
    image: "/assets/anao_das_rochosas_determinado.webp",
    portraits: { male: "/assets/anaodasrochosas.webp", female: "/assets/ana_das_montanhas_rochosas.webp" },
    attributes: { str: 12, dex: 8, con: 13, intel: 9, wis: 10, cha: 8 },
    bonus: "Resistência a venenos e maestria em metais.",
  },
  gronar: {
    name: "Gronar",
    description: "Poderosos e tribais, com força física imponente e instintos selvagens.",
    image: "/assets/retrato_de_gronar_fantasia.webp",
    portraits: { male: "/assets/retratodegronar.webp", female: "/assets/guerreira_gronar.webp" },
    attributes: { str: 13, dex: 9, con: 12, intel: 7, wis: 8, cha: 7 },
    bonus: "Fúria de Batalha: dano aumentado temporariamente.",
  },
  aetheliano: {
    name: "Aetheliano",
    description: "Seres tocados pela magia primordial, com afinidade natural para o arcano.",
    image: "/assets/retrato_mistic_zetheliano.webp",
    portraits: { male: "/assets/aetheliano.webp", female: "/assets/retrato_aetheliana.webp" },
    attributes: { str: 8, dex: 10, con: 8, intel: 13, wis: 12, cha: 9 },
    bonus: "Regenera mana mais rapidamente.",
  },
};
