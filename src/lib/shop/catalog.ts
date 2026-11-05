// Catálogo da loja. O SERVIDOR usa estes preços; o cliente só exibe.

export type Currency = "BRL" | "USD";
export type Provider = "stripe" | "mercadopago";

export type GemPack = {
  id: string;
  name: string;
  gems: number;
  bonus: number; // gemas extras já inclusas em `gems` (exibição "+X")
  price: Record<Currency, number>; // centavos
  image: string;
  tag?: "popular" | "best";
  oncePerAccount?: boolean;
  extras?: string[];
};

export const GEM_PACKS: GemPack[] = [
  { id: "gems_80", name: "Bolsa de Gemas", gems: 80, bonus: 0, price: { BRL: 490, USD: 99 }, image: "/assets/shop/gems_small.webp" },
  { id: "gems_450", name: "Saco de Gemas", gems: 450, bonus: 50, price: { BRL: 2490, USD: 499 }, image: "/assets/shop/gems_small.webp", tag: "popular" },
  { id: "gems_1000", name: "Arca de Gemas", gems: 1000, bonus: 150, price: { BRL: 4990, USD: 999 }, image: "/assets/shop/gems_large.webp", tag: "best" },
  { id: "gems_2200", name: "Tesouro do Rei", gems: 2200, bonus: 400, price: { BRL: 9990, USD: 1999 }, image: "/assets/shop/gems_large.webp" },
];

export const STARTER_PACK: GemPack = {
  id: "starter", name: "Pacote do Aventureiro", gems: 300, bonus: 0, price: { BRL: 990, USD: 199 },
  image: "/assets/shop/gems_large.webp", oncePerAccount: true,
  extras: ["Peitoral de Placas Anão (Épico)", "5 Poções de Vida", "Título exclusivo “Pioneiro”"],
};

export const ALL_PACKS = [STARTER_PACK, ...GEM_PACKS];
export const PACK_BY_ID = Object.fromEntries(ALL_PACKS.map((p) => [p.id, p]));

/** Mercado Pago (conta BR) só cobra em BRL. USD vai pelo Stripe. */
export function providersFor(currency: Currency): Provider[] {
  return currency === "BRL" ? ["mercadopago", "stripe"] : ["stripe"];
}

export function formatPrice(cents: number, currency: Currency) {
  return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "en-US", { style: "currency", currency }).format(cents / 100);
}

// ── Cosméticos ────────────────────────────────────────────────────────
export type CosmeticKind = "frame" | "title" | "skin";
export type Cosmetic = {
  id: string;
  kind: CosmeticKind;
  name: string;
  price?: { currency: "gems" | "gold"; amount: number }; // sem preço = só por oferta/evento
  image?: string;
  /** Classe CSS da moldura (para frames sem imagem). */
  ring?: string;
  rarity: "common" | "rare" | "epic" | "legendary";
};

export const COSMETICS: Cosmetic[] = [
  { id: "frame_bronze", kind: "frame", name: "Moldura de Bronze", rarity: "common", price: { currency: "gold", amount: 800 }, ring: "ring-4 ring-amber-700" },
  { id: "frame_arcano", kind: "frame", name: "Moldura Arcana", rarity: "epic", price: { currency: "gems", amount: 250 }, image: "/assets/shop/frame_arcano.webp" },
  { id: "frame_dragao", kind: "frame", name: "Moldura do Dragão Dourado", rarity: "legendary", image: "/assets/shop/frame_dragao.webp" },
  { id: "title_destemido", kind: "title", name: "O Destemido", rarity: "common", price: { currency: "gold", amount: 1500 } },
  { id: "title_cacador", kind: "title", name: "Caçador de Sombras", rarity: "rare", price: { currency: "gems", amount: 120 } },
  { id: "title_lenda", kind: "title", name: "Lenda de Aethelgard", rarity: "legendary", price: { currency: "gems", amount: 600 } },
  { id: "title_pioneiro", kind: "title", name: "Pioneiro", rarity: "epic" },
  { id: "title_matador", kind: "title", name: "Matador de Chefes", rarity: "legendary" },
  { id: "title_veterano", kind: "title", name: "Veterano da Arena", rarity: "epic" },
  { id: "title_campeao", kind: "title", name: "Campeão Semanal", rarity: "legendary" },
  { id: "title_fiel", kind: "title", name: "Fiel ao Reino", rarity: "epic" },
  { id: "title_heroi_temporada", kind: "title", name: "Herói da Temporada", rarity: "legendary" },
  { id: "frame_temporada", kind: "frame", name: "Moldura da Temporada", rarity: "epic", ring: "ring-4 ring-fuchsia-400 shadow-[0_0_14px_#e879f9]" },
  { id: "skin_kaelen", kind: "skin", name: "Kaelen, Guardião da Chama", rarity: "epic", price: { currency: "gems", amount: 450 }, image: "/assets/kaelen_guardiao_da_chama.webp" },
  { id: "skin_lyra", kind: "skin", name: "Lyra, Sacerdotisa da Lua", rarity: "epic", price: { currency: "gems", amount: 450 }, image: "/assets/lyra_a_sacerdotisa_da_lua.webp" },
  { id: "skin_roric", kind: "skin", name: "Roric Corvo Blackwood", rarity: "rare", price: { currency: "gems", amount: 300 }, image: "/assets/roric_corvo__blackwood.webp" },
  { id: "skin_vorlag", kind: "skin", name: "Lorde Vorlag Sombrio", rarity: "legendary", image: "/assets/lord_vorlag_sombrio.webp" },
];
export const COSMETIC_BY_ID = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));

// ── Conveniência (limite diário por jogador) ─────────────────────────
export type DailyDeal = {
  key: string; name: string; description: string; image: string;
  currency: "gems" | "gold"; price: number; limit: number;
  item?: { id: string; qty: number }; boostMinutes?: number;
};

export const CONVENIENCE: DailyDeal[] = [
  { key: "potions_5", name: "5 Poções de Vida", description: "Cura 60 de vida cada.", image: "/assets/shop/potion_hp.webp", currency: "gold", price: 110, limit: 3, item: { id: "pocao_vida", qty: 5 } },
  { key: "potions_20", name: "Caixa com 20 Poções", description: "Para longas caçadas.", image: "/assets/shop/potion_hp.webp", currency: "gems", price: 40, limit: 5, item: { id: "pocao_vida", qty: 20 } },
  { key: "xp_boost_60", name: "Elixir da Sabedoria (1h)", description: "+50% de XP em tudo por 1 hora.", image: "/assets/shop/potion_energy.webp", currency: "gems", price: 60, limit: 5, boostMinutes: 60 },
];

/** Ofertas do dia: rotação determinística por data (UTC) com desconto. */
const DAILY_POOL: DailyDeal[] = [
  { key: "daily_potions", name: "Oferta: 10 Poções", description: "-50% só hoje!", image: "/assets/shop/potion_hp.webp", currency: "gems", price: 10, limit: 1, item: { id: "pocao_vida", qty: 10 } },
  { key: "daily_boost", name: "Oferta: Elixir 3h", description: "-40% só hoje!", image: "/assets/shop/potion_energy.webp", currency: "gems", price: 110, limit: 1, boostMinutes: 180 },
  { key: "daily_bow", name: "Oferta: Arco Élfico", description: "Arma rara por ouro.", image: "/assets/arco_elfico_elegante.webp", currency: "gold", price: 350, limit: 1, item: { id: "arco_elfico", qty: 1 } },
  { key: "daily_staff", name: "Oferta: Cajado Luminoso", description: "Arma rara por ouro.", image: "/assets/cajado_magico_luminoso.webp", currency: "gold", price: 350, limit: 1, item: { id: "cajado_luminoso", qty: 1 } },
  { key: "daily_armor", name: "Oferta: Peitoral Anão", description: "Armadura épica -30%.", image: "/assets/peitoral_de_placas_anao.webp", currency: "gems", price: 140, limit: 1, item: { id: "peitoral_anao", qty: 1 } },
];

export function todaysDeals(now = new Date()): DailyDeal[] {
  const day = Math.floor(now.getTime() / 86_400_000);
  const a = DAILY_POOL[day % DAILY_POOL.length];
  const b = DAILY_POOL[(day * 7 + 3) % DAILY_POOL.length];
  const picks = a.key === b.key ? [a, DAILY_POOL[(day + 1) % DAILY_POOL.length]] : [a, b];
  // A chave inclui o dia: cada dia é uma oferta nova com seu próprio limite.
  return picks.map((d) => ({ ...d, key: `${d.key}_${day}` }));
}

export function secondsToUtcMidnight(now = new Date()) {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.floor((next - now.getTime()) / 1000);
}

export const DAILY_LOGIN = [
  { day: 1, gold: 50 }, { day: 2, gold: 75 }, { day: 3, gold: 100, gems: 2 }, { day: 4, gold: 125, potions: 2 },
  { day: 5, gold: 150, gems: 3 }, { day: 6, gold: 200 }, { day: 7, gold: 300, gems: 10 },
];

/** Bônus extras por dias SEGUIDOS (espelho da migração 0007). */
export const LOGIN_MILESTONES = [
  { streak: 7, label: "1 semana", reward: "Baú do 7º dia (💎 10)" },
  { streak: 14, label: "2 semanas", reward: "💎 15 extras" },
  { streak: 30, label: "1 mês", reward: "💎 30 + título “Fiel ao Reino”" },
];
