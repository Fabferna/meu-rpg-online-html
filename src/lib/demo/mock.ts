"use client";
// Modo demonstração: dados falsos e API simulada NO NAVEGADOR, para mostrar
// o jogo sem backend. Nada aqui afeta contas reais.
import type { PlayerState } from "@/lib/game/state";
import { COSMETICS, CONVENIENCE, todaysDeals, secondsToUtcMidnight } from "@/lib/shop/catalog";

export function demoState(): PlayerState {
  return {
    character: {
      name: "Kaelen", race: "humano", raceName: "Humano", region: "sylvandell", regionName: "Sylvandell", gender: "male",
      portrait: "/assets/guerreiro_fantastico_determinado.png", level: 6, xp: 80, xpToNext: 175, attributePoints: 3,
      attributes: { str: 14, dex: 12, con: 12, intel: 10, wis: 10, cha: 10 }, hp: 170, maxHp: 196, energy: 41, maxEnergy: 74, nextEnergyInSec: 120,
      pvpRating: 1048, pvpWins: 5, pvpLosses: 2, pveWins: 23, frame: "frame_arcano", title: "Caçador de Sombras", skin: null, xpBoostUntil: null,
    },
    wallet: { gold: 1840, gems: 120 },
    quest: null,
    battle: null,
    inventory: [
      { id: "i1", itemId: "espada_curta", qty: 1, equipped: true, slot: "weapon", name: "Espada Curta Funcional", kind: "weapon", rarity: "common", data: { atk: 4, image: "/assets/espada_curta_funcional.png" } },
      { id: "i2", itemId: "peitoral_anao", qty: 1, equipped: true, slot: "armor", name: "Peitoral de Placas Anão", kind: "armor", rarity: "epic", data: { def: 8, con: 2, image: "/assets/peitoral_de_placas_anao.png" } },
      { id: "i3", itemId: "arco_elfico", qty: 1, equipped: false, slot: "weapon", name: "Arco Élfico Elegante", kind: "weapon", rarity: "rare", data: { atk: 7, dex: 2, image: "/assets/arco_elfico_elegante.png" } },
      { id: "i4", itemId: "amuleto_serpente", qty: 1, equipped: false, slot: "accessory", name: "Amuleto da Serpente Sinistra", kind: "accessory", rarity: "legendary", data: { atk: 4, def: 3, intel: 3, image: "/assets/amuleto_da_serpente_sinistra.png" } },
      { id: "i5", itemId: "pocao_vida", qty: 6, equipped: false, slot: null, name: "Poção de Vida", kind: "consumable", rarity: "common", data: { heal: 60, image: "/assets/shop/potion_hp.png" } },
    ],
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
      { name: "Lyra", level: 7, rating: 1102, wins: 9, losses: 3, raceName: "Elfo de Sylvandell", portrait: "/assets/elfo_de_sylvandell_mulher.png", frame: "frame_dragao", title: "Lenda de Aethelgard" },
      { name: "Gromak", level: 5, rating: 1010, wins: 4, losses: 4, raceName: "Gronar", portrait: "/assets/retratodegronar.png", frame: null, title: null },
      { name: "Thorin", level: 6, rating: 990, wins: 3, losses: 5, raceName: "Anão das Montanhas", portrait: "/assets/anaodasrochosas.png", frame: "frame_bronze", title: "O Destemido" },
    ] });
    if (url.startsWith("/api/ranking")) return json({ rows: [
      { pos: 1, name: "Lyra", raceName: "Elfo de Sylvandell", level: 7, pvp_rating: 1102, pvp_wins: 9, pvp_losses: 3, portrait: "/assets/elfo_de_sylvandell_mulher.png", frame: "frame_dragao", title: "Lenda de Aethelgard" },
      { pos: 2, name: "Kaelen", raceName: "Humano", level: 6, pvp_rating: 1048, pvp_wins: 5, pvp_losses: 2, portrait: "/assets/guerreiro_fantastico_determinado.png", frame: "frame_arcano", title: "Caçador de Sombras" },
      { pos: 3, name: "Gromak", raceName: "Gronar", level: 5, pvp_rating: 1010, pvp_wins: 4, pvp_losses: 4, portrait: "/assets/retratodegronar.png", frame: null, title: null },
    ] });
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
