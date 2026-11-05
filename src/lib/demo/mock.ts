"use client";
// Modo demonstração: dados falsos e API simulada NO NAVEGADOR, para mostrar
// o jogo sem backend. Nada aqui afeta contas reais.
import type { PlayerState } from "@/lib/game/state";
import { COSMETICS, CONVENIENCE, todaysDeals, secondsToUtcMidnight } from "@/lib/shop/catalog";
import { ACHIEVEMENTS, DAILY_BONUS, DAILY_GOALS } from "@/lib/game/goals";

export function demoState(): PlayerState {
  return {
    character: {
      name: "Kaelen", race: "humano", raceName: "Humano", region: "sylvandell", regionName: "Sylvandell", gender: "male",
      portrait: "/assets/guerreiro_fantastico_determinado.webp", level: 6, xp: 80, xpToNext: 175, attributePoints: 3,
      attributes: { str: 14, dex: 12, con: 12, intel: 10, wis: 10, cha: 10 }, hp: 170, maxHp: 196, energy: 41, maxEnergy: 74, nextEnergyInSec: 120,
      pvpRating: 1048, pvpWins: 5, pvpLosses: 2, pveWins: 23, frame: "frame_arcano", title: "Caçador de Sombras", skin: null, loadout: { lv: { h_adaptavel: 2, h_demolidor: 1, h_estandarte: 1 }, eq: ["h_adaptavel", "h_demolidor"] }, xpBoostUntil: null, storyChapter: 3,
    },
    wallet: { gold: 1840, gems: 120 },
    quest: null,
    battle: null,
    inventory: [
      { id: "i1", itemId: "espada_curta", qty: 1, equipped: true, slot: "weapon", upgrade: 4, name: "Espada Curta Funcional", kind: "weapon", rarity: "common", data: { atk: 4, image: "/assets/espada_curta_funcional.webp" } },
      { id: "i2", itemId: "peitoral_anao", qty: 1, equipped: true, slot: "armor", upgrade: 0, name: "Peitoral de Placas Anão", kind: "armor", rarity: "epic", data: { def: 8, con: 2, image: "/assets/peitoral_de_placas_anao.webp" } },
      { id: "i3", itemId: "arco_elfico", qty: 1, equipped: false, slot: "weapon", upgrade: 0, name: "Arco Élfico Elegante", kind: "weapon", rarity: "rare", data: { atk: 7, dex: 2, image: "/assets/arco_elfico_elegante.webp" } },
      { id: "i4", itemId: "amuleto_serpente", qty: 1, equipped: false, slot: "accessory", upgrade: 0, name: "Amuleto da Serpente Sinistra", kind: "accessory", rarity: "legendary", data: { atk: 4, def: 3, intel: 3, image: "/assets/amuleto_da_serpente_sinistra.webp" } },
      { id: "i5", itemId: "pocao_vida", qty: 6, equipped: false, slot: null, upgrade: 0, name: "Poção de Vida", kind: "consumable", rarity: "common", data: { heal: 60, image: "/assets/shop/potion_hp.webp" } },
    ],
    guild: { id: "g1", name: "Ordem da Chama", tag: "ODC", level: 3, role: "leader" },
    daily: { hunts: 12, quests: 3 },
    serverTime: new Date().toISOString(),
  };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export function installDemoFetch() {
  if ((window as unknown as { __demo?: boolean }).__demo) return;
  (window as unknown as { __demo?: boolean }).__demo = true;
  const real = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
    if (!url.startsWith("/api/")) return real(input, init);
    if ((init?.method ?? "GET") !== "GET") return json({ error: "demo" }, 403);
    if (url === "/api/state") return json({ ...demoState(), serverTime: new Date().toISOString() });
    if (url === "/api/pvp/opponents") return json({ opponents: [
      { name: "Lyra", level: 7, rating: 1102, wins: 9, losses: 3, raceName: "Elfo de Sylvandell", portrait: "/assets/elfo_de_sylvandell_mulher.webp", frame: "frame_dragao", title: "Lenda de Aethelgard" },
      { name: "Gromak", level: 5, rating: 1010, wins: 4, losses: 4, raceName: "Gronar", portrait: "/assets/retratodegronar.webp", frame: null, title: null },
      { name: "Thorin", level: 6, rating: 990, wins: 3, losses: 5, raceName: "Anão das Montanhas", portrait: "/assets/anaodasrochosas.webp", frame: "frame_bronze", title: "O Destemido" },
    ] });
    if (url === "/api/ranking?scope=week") return json({
      week: "", endsInSec: 3 * 86400 + 5000,
      rows: [
        { pos: 1, name: "Lyra", raceName: "Elfo de Sylvandell", level: 7, score: 214, portrait: "/assets/elfo_de_sylvandell_mulher.webp", frame: "frame_dragao", title: "Lenda de Aethelgard" },
        { pos: 2, name: "Kaelen", raceName: "Humano", level: 6, score: 168, portrait: "/assets/guerreiro_fantastico_determinado.webp", frame: "frame_arcano", title: "Caçador de Sombras" },
        { pos: 3, name: "Gromak", raceName: "Gronar", level: 5, score: 97, portrait: "/assets/retratodegronar.webp", frame: null, title: null },
        { pos: 4, name: "Thorin", raceName: "Anão das Montanhas", level: 6, score: 54, portrait: "/assets/anaodasrochosas.webp", frame: "frame_bronze", title: "O Destemido" },
      ],
      me: { pos: 2, score: 168, reward: { maxRank: 3, label: "2º–3º", gems: 50, gold: 1000 } },
      lastWeek: { week: "", pos: 4, score: 120, reward: { maxRank: 10, label: "4º–10º", gems: 20, gold: 500 }, claimed: false },
    });
    if (url.startsWith("/api/ranking")) return json({ rows: [
      { pos: 1, name: "Lyra", raceName: "Elfo de Sylvandell", level: 7, pvp_rating: 1102, pvp_wins: 9, pvp_losses: 3, portrait: "/assets/elfo_de_sylvandell_mulher.webp", frame: "frame_dragao", title: "Lenda de Aethelgard" },
      { pos: 2, name: "Kaelen", raceName: "Humano", level: 6, pvp_rating: 1048, pvp_wins: 5, pvp_losses: 2, portrait: "/assets/guerreiro_fantastico_determinado.webp", frame: "frame_arcano", title: "Caçador de Sombras" },
      { pos: 3, name: "Gromak", raceName: "Gronar", level: 5, pvp_rating: 1010, pvp_wins: 4, pvp_losses: 4, portrait: "/assets/retratodegronar.webp", frame: null, title: null },
    ] });
    if (url === "/api/pass") {
      const now = new Date(); const y = now.getUTCFullYear(), m = now.getUTCMonth();
      return json({ season: { id: "", name: new Date(Date.UTC(y, m, 1)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }), endsInSec: Math.floor((Date.UTC(y, m + 1, 1) - now.getTime()) / 1000) },
        points: 1260, tier: 12, premium: false, claimed: ["1:free", "2:free", "3:free", "4:free", "5:free", "6:free", "7:free", "8:free", "9:free"] });
    }
    if (url === "/api/pets") return json({ pets: [{ pet_id: "lobo", level: 3, active: true }, { pet_id: "coruja", level: 1, active: false }] });
    if (url === "/api/dungeons") return json({ limit: 1, premium: false, left: { cripta: 1, minas: 1, fortaleza: 1 } });
    if (url === "/api/events") return json({ events: [{ id: "fim_de_semana_xp", name: "Fim de Semana Heroico", description: "XP em dobro todo sábado e domingo!", kind: "xp", multiplier: 2, endsAt: new Date(Date.now() + 30 * 3600_000).toISOString() }] });
    if (url === "/api/guild-boss") return json({ guild: true, attacksLeft: 2, previous: null, current: {
      week: "", boss: { id: "dragao", name: "Dragão Ancestral", image: "/assets/raids/dragao.webp", lore: "Desperto sob as ruínas de Valerion, cospe fogo que derrete muralhas." },
      hp: 9420, maxHp: 20000, defeated: false, myDamage: 3120, claimed: false, isTop: true,
      ranking: [{ pos: 1, name: "Kaelen", damage: 3120, attacks: 4, me: true }, { pos: 2, name: "Lyra", damage: 2980, attacks: 4, me: false },
        { pos: 3, name: "Thorin", damage: 2650, attacks: 3, me: false }, { pos: 4, name: "Mirelle", damage: 1830, attacks: 2, me: false }] } });
    if (url === "/api/guild-war") return json({ endsInSec: 3 * 86400 + 4000, claimable: { pos: 2, gems: 20, gold: 600 },
      mine: { pos: 2, name: "Ordem da Chama", tag: "ODC", level: 3, score: 412, mine: true },
      rows: [{ pos: 1, name: "Lâminas do Deserto", tag: "LDD", level: 5, score: 688, mine: false }, { pos: 2, name: "Ordem da Chama", tag: "ODC", level: 3, score: 412, mine: true },
        { pos: 3, name: "Filhos da Montanha", tag: "FDM", level: 2, score: 230, mine: false }] });
    if (url.startsWith("/api/guilds/mine")) return json({ guild: {
      id: "g1", name: "Ordem da Chama", tag: "ODC", description: "Caçadores de sombras de Valerion. Ativos todo dia, foco em chefes e Arena!", level: 3, xp: 1240, treasury: 8650, limit: 20, myRole: "leader",
      members: [
        { name: "Kaelen", level: 6, role: "leader", contributed: 4200, me: true, portrait: "/assets/guerreiro_fantastico_determinado.webp", frame: "frame_arcano", active: true },
        { name: "Lyra", level: 7, role: "officer", contributed: 2900, me: false, portrait: "/assets/elfo_de_sylvandell_mulher.webp", frame: "frame_dragao", active: true },
        { name: "Thorin", level: 6, role: "member", contributed: 1050, me: false, portrait: "/assets/anaodasrochosas.webp", frame: "frame_bronze", active: false },
        { name: "Mirelle", level: 5, role: "member", contributed: 500, me: false, portrait: "/assets/retrato_aetheliana.webp", frame: null, active: true },
      ] } });
    if (url.startsWith("/api/guilds")) return json({ guilds: [
      { id: "g1", name: "Ordem da Chama", tag: "ODC", description: "Caçadores de sombras de Valerion.", level: 3, limit: 20, members: 4 },
      { id: "g2", name: "Lâminas do Deserto", tag: "LDD", description: "PVP todo dia às 21h.", level: 5, limit: 20, members: 17 },
      { id: "g3", name: "Filhos da Montanha", tag: "FDM", description: "Anões e amigos. Iniciantes bem-vindos!", level: 2, limit: 20, members: 9 },
    ] });
    if (url.startsWith("/api/chat")) {
      const guild = url.includes("channel=guild");
      const now = Date.now();
      const m = (id: number, name: string, body: string, ago: number, extra: object = {}) => ({ id, channel: guild ? "guild:g1" : "global", name, body, created_at: new Date(now - ago * 60000).toISOString(), tag: null, title: null, frame: null, ...extra });
      return json({ messages: guild ? [
        m(11, "Lyra", "Bora derrubar o Mestre dos Rituais hoje?", 14, { tag: "ODC", frame: "frame_dragao" }),
        m(12, "Thorin", "Tô dentro, só terminar a missão", 12, { tag: "ODC", frame: "frame_bronze" }),
        m(13, "Kaelen", "Doei 1000 pro cofre, falta pouco pro nível 4 da guilda!", 5, { tag: "ODC", frame: "frame_arcano" }),
      ] : [
        m(1, "Gromak", "alguém sabe onde dropa o Amuleto da Serpente?", 30),
        m(2, "Lyra", "Chefes de nível alto, tipo o Lorde Vorlag", 28, { tag: "ODC", title: "title_lenda", frame: "frame_dragao" }),
        m(3, "Bran", "valeu! e qual raça vocês acham melhor pra PVP?", 9),
        m(4, "Thorin", "Anão com Pele de Pedra aguenta tudo 😄", 7, { tag: "ODC", frame: "frame_bronze" }),
      ] });
    }
    if (url === "/api/referrals") return json({ code: "Kaelen", paid: 1, maxPaid: 10, invited: [
      { idx: 0, name: "Thorin", level: 6, claimed: true, ready: true },
      { idx: 1, name: "Mirelle", level: 5, claimed: false, ready: true },
      { idx: 2, name: "Bran", level: 2, claimed: false, ready: false },
    ] });
    if (url === "/api/goals") {
      const prog: Record<string, number> = { quests: 2, hunts: 3, arena: 1, energy: 60 };
      const stats: Record<string, number> = { level: 6, pve_wins: 23, pvp_wins: 5, quests_done: 14, bosses_slain: 0 };
      return json({
        day: new Date().toISOString().slice(0, 10),
        daily: DAILY_GOALS.map((g) => ({ ...g, progress: Math.min(g.target, prog[g.id] ?? 0), claimed: g.id === "quests" })),
        bonus: { ...DAILY_BONUS, ready: false, claimed: false },
        achievements: ACHIEVEMENTS.map((a) => ({ ...a, progress: Math.min(a.target, stats[a.stat] ?? 0), claimed: a.id === "level_5" })),
      });
    }
    if (url === "/api/shop") return json({
      owned: ["frame_arcano", "title_cacador"], equipped: { frame: "frame_arcano", title: "title_cacador", skin: null }, xpBoostUntil: null, energyRefillPrice: 10,
      convenience: CONVENIENCE.map((d) => ({ ...d, boughtToday: 0 })),
      daily: { deals: todaysDeals().map((d) => ({ ...d, boughtToday: 0 })), resetsInSec: secondsToUtcMidnight() },
      limited: [
        { id: "o1", cosmetic: COSMETICS.find((c) => c.id === "frame_dragao"), priceGems: 400, stockLeft: 137, stockTotal: 500, endsAt: new Date(Date.now() + 4.3 * 86400000).toISOString(), mine: 0, perUser: 1 },
        { id: "o2", cosmetic: COSMETICS.find((c) => c.id === "skin_vorlag"), priceGems: 900, stockLeft: 22, stockTotal: 200, endsAt: new Date(Date.now() + 4.3 * 86400000).toISOString(), mine: 0, perUser: 1 },
      ],
      starterAvailable: true, firstPurchaseBonus: true, login: { claimedToday: false, streak: 2 }, providers: { stripe: true, mercadopago: true, dev: false },
    });
    return json({ error: "demo" }, 403);
  }) as typeof fetch;
}
