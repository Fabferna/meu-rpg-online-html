import type { RaceId } from "./data";

// Habilidade racial: uma por raça, com recarga própria. Ícones já existentes no projeto.
export const RACIAL_SKILLS: Record<RaceId, { name: string; description: string; icon: string; cooldown: number }> = {
  humano: { name: "Ataque Adaptável", description: "Golpe certeiro (não pode ser esquivado) com 150% de dano.", icon: "/assets/icone_ataque_adaptavel.webp", cooldown: 3 },
  elfo: { name: "Flecha Enfeitiçada", description: "Dano e envenena o inimigo por 3 turnos.", icon: "/assets/flecha_enfeiticada_icone.webp", cooldown: 4 },
  anao: { name: "Pele de Pedra", description: "Recupera 10% da vida e reduz o dano recebido pela metade por 3 turnos.", icon: "/assets/icone_pele_de_pedra.webp", cooldown: 5 },
  gronar: { name: "Fúria Selvagem", description: "230% de dano, mas custa 6% da sua vida.", icon: "/assets/furia_selvagem_icone.webp", cooldown: 4 },
  aetheliano: { name: "Centelha Arcana", description: "Dano mágico e atordoa o inimigo por 1 turno.", icon: "/assets/centelha_arcana_explosiva.webp", cooldown: 5 },
};
