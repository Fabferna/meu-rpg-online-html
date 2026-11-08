// Passe de temporada: uma temporada por mês (UTC), 30 níveis, trilhas grátis e premium.
export const PASS_POINTS = { quest: 40, pve_win: 10, boss_win: 40, pvp: 20, login: 30 }; // espelho de season_points()
export const PASS_TIER_POINTS = 100;
export const PASS_TIERS = 30;
export const PASS_PRICE_GEMS = 500;
export const PASS_DUNGEON_BONUS = 1; // entradas extras por dia nas masmorras para quem tem o premium

export type PassReward = { gold?: number; gems?: number; item?: { id: string; qty: number }; boostMin?: number; cosmetic?: string; pet?: string; label: string; icon: string };

function free(t: number): PassReward {
  if (t === 30) return { gems: 15, gold: 1500, label: "💎 15 + 🪙 1.500", icon: "/assets/shop/gems_large.webp" };
  if (t % 10 === 0) return { item: { id: "pocao_vida", qty: 5 }, gold: 300, label: "5 poções + 🪙 300", icon: "/assets/shop/potion_hp.webp" };
  if (t % 5 === 0) return { gems: 5, label: "💎 5", icon: "/assets/shop/gems_small.webp" };
  return { gold: 50 + t * 10, label: `🪙 ${50 + t * 10}`, icon: "" };
}
function premium(t: number): PassReward {
  const specials: Record<number, PassReward> = {
    1: { gems: 20, item: { id: "elixir_xp_2h", qty: 1 }, label: "💎 20 + Elixir da Sabedoria (2h)", icon: "/assets/items/tier/elixir_sabedoria.webp" },
    10: { gems: 20, pet: "tartaruga", label: "Pet: Tartaruga de Cristal", icon: "/assets/pets/tartaruga.webp" },
    15: { gems: 20, cosmetic: "frame_temporada", label: "Moldura da Temporada", icon: "" },
    20: { gems: 60, item: { id: "elixir_xp_3h", qty: 1 }, label: "💎 60 + Elixir da Sabedoria (3h)", icon: "/assets/items/tier/elixir_sabedoria.webp" },
    25: { gems: 20, pet: "fenix", label: "Pet lendário: Fênix", icon: "/assets/pets/fenix.webp" },
    30: { gems: 100, cosmetic: "title_heroi_temporada", label: "💎 100 + título “Herói da Temporada”", icon: "/assets/shop/gems_large.webp" },
  };
  return specials[t] ?? (t % 3 === 0
    ? { gems: 15, item: { id: "pocao_vida", qty: 3 }, label: "💎 15 + 3 poções", icon: "/assets/shop/potion_hp.webp" }
    : { gems: 15, gold: 200, label: "💎 15 + 🪙 200", icon: "/assets/shop/gems_small.webp" });
}

export const PASS_REWARDS = Array.from({ length: PASS_TIERS }, (_, i) => ({ tier: i + 1, free: free(i + 1), premium: premium(i + 1) }));
export const PREMIUM_TOTAL_GEMS = PASS_REWARDS.reduce((a, r) => a + (r.premium.gems ?? 0), 0);

export function seasonOf(d = new Date()) {
  const y = d.getUTCFullYear(), m = d.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1)), end = new Date(Date.UTC(y, m + 1, 0));
  return { id: `${y}-${String(m + 1).padStart(2, "0")}`, start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10),
    endsInSec: Math.floor((Date.UTC(y, m + 1, 1) - d.getTime()) / 1000),
    name: start.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }) };
}
export const tierFor = (points: number) => Math.min(PASS_TIERS, Math.floor(points / PASS_TIER_POINTS));
