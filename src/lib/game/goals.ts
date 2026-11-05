// Missões diárias e conquistas. As metas são verificadas no SERVIDOR
// a partir dos contadores gravados pelas funções SQL.

export type DailyGoal = { id: string; title: string; event: string; target: number; gold: number; gems: number; icon: string };

export const DAILY_GOALS: DailyGoal[] = [
  { id: "quests", title: "Complete 2 missões", event: "quest", target: 2, gold: 100, gems: 0, icon: "📜" },
  { id: "hunts", title: "Vença 5 caçadas", event: "pve_win", target: 5, gold: 150, gems: 0, icon: "⚔️" },
  { id: "arena", title: "Lute 3 vezes na Arena", event: "pvp", target: 3, gold: 120, gems: 0, icon: "🏟️" },
  { id: "energy", title: "Gaste 60 de energia", event: "energy", target: 60, gold: 0, gems: 2, icon: "⚡" },
];
/** Bônus por completar TODAS as diárias do dia. */
export const DAILY_BONUS = { gold: 0, gems: 5 };

export type Stat = "level" | "pve_wins" | "pvp_wins" | "quests_done" | "bosses_slain";
export type Achievement = { id: string; title: string; description: string; stat: Stat; target: number; gems: number; gold: number; cosmetic?: string };

export const ACHIEVEMENTS: Achievement[] = [
  { id: "level_5", title: "Aprendiz", description: "Alcance o nível 5", stat: "level", target: 5, gems: 5, gold: 200 },
  { id: "level_10", title: "Aventureiro", description: "Alcance o nível 10", stat: "level", target: 10, gems: 15, gold: 500 },
  { id: "level_20", title: "Herói do Reino", description: "Alcance o nível 20", stat: "level", target: 20, gems: 40, gold: 1500 },
  { id: "pve_10", title: "Primeiro Sangue", description: "Vença 10 caçadas", stat: "pve_wins", target: 10, gems: 5, gold: 150 },
  { id: "pve_100", title: "Caçador Implacável", description: "Vença 100 caçadas", stat: "pve_wins", target: 100, gems: 25, gold: 1000 },
  { id: "pve_500", title: "Flagelo das Sombras", description: "Vença 500 caçadas", stat: "pve_wins", target: 500, gems: 60, gold: 4000 },
  { id: "boss_1", title: "Caça-Chefes", description: "Derrote 1 chefe", stat: "bosses_slain", target: 1, gems: 10, gold: 300 },
  { id: "boss_25", title: "Matador de Chefes", description: "Derrote 25 chefes", stat: "bosses_slain", target: 25, gems: 40, gold: 2000, cosmetic: "title_matador" },
  { id: "quest_10", title: "Mensageiro", description: "Complete 10 missões", stat: "quests_done", target: 10, gems: 5, gold: 200 },
  { id: "quest_100", title: "Lenda das Estradas", description: "Complete 100 missões", stat: "quests_done", target: 100, gems: 30, gold: 1500 },
  { id: "pvp_10", title: "Gladiador", description: "Vença 10 duelos na Arena", stat: "pvp_wins", target: 10, gems: 10, gold: 300 },
  { id: "pvp_50", title: "Veterano da Arena", description: "Vença 50 duelos na Arena", stat: "pvp_wins", target: 50, gems: 40, gold: 1500, cosmetic: "title_veterano" },
];

export const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
export const DAILY_BY_ID = Object.fromEntries(DAILY_GOALS.map((g) => [g.id, g]));
