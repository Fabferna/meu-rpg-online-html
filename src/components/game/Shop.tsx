"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import {
  COSMETICS, DAILY_LOGIN, GEM_PACKS, STARTER_PACK, formatPrice, providersFor,
  type Cosmetic, type Currency, type DailyDeal, type GemPack, type Provider,
} from "@/lib/shop/catalog";
import { fmtTime, post, RARITY_LABEL, RARITY_STYLE } from "./api";
import { play } from "./sfx";
import { Panel } from "./ui";
import Avatar from "./Avatar";

type ShopState = {
  owned: string[];
  equipped: { frame: string | null; title: string | null; skin: string | null };
  xpBoostUntil: string | null;
  energyRefillPrice: number;
  convenience: (DailyDeal & { boughtToday: number })[];
  daily: { deals: (DailyDeal & { boughtToday: number })[]; resetsInSec: number };
  limited: { id: string; cosmetic: Cosmetic | null; priceGems: number; stockLeft: number; stockTotal: number; endsAt: string; mine: number; perUser: number }[];
  starterAvailable: boolean;
  firstPurchaseBonus: boolean;
  login: { claimedToday: boolean; streak: number };
  providers: { stripe: boolean; mercadopago: boolean; dev: boolean };
};

const PROVIDER_LABEL: Record<Provider | "dev", string> = { stripe: "Cartão (Stripe)", mercadopago: "Pix / Mercado Pago", dev: "Teste (dev)" };

export default function Shop({ ctx }: { ctx: GameCtx }) {
  const [shop, setShop] = useState<ShopState | null>(null);
  const [currency, setCurrency] = useState<Currency>(() => (typeof navigator !== "undefined" && !navigator.language.startsWith("pt") ? "USD" : "BRL"));
  const [buying, setBuying] = useState<GemPack | null>(null);
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    const r = await fetch("/api/shop", { cache: "no-store" });
    if (r.ok) setShop(await r.json());
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [load]);

  async function run(fn: () => Promise<unknown>, okText: string, kind: "ok" | "reward" = "ok") {
    setBusy(true);
    try {
      await fn();
      play("coin");
      ctx.toast(okText, kind);
      await Promise.all([load(), ctx.refresh()]);
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function checkout(pack: GemPack, provider: Provider | "dev") {
    setBusy(true);
    try {
      const { url } = await post<{ url: string }>("/api/shop/checkout", { productId: pack.id, currency, provider });
      window.location.href = url; // checkout hospedado do gateway
    } catch (e) {
      ctx.toast((e as Error).message, "error");
      setBusy(false);
    }
  }

  if (!shop) return <p className="text-white/50">Abrindo a loja…</p>;
  const c = ctx.state.character;
  const loaded = Date.now();
  const boostLeft = shop.xpBoostUntil ? (new Date(shop.xpBoostUntil).getTime() - Date.now()) / 1000 : 0;

  return (
    <div className="space-y-6">
      {/* LOGIN DIÁRIO */}
      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg text-gold">Recompensa Diária</h2>
            <p className="text-xs text-white/60">Entre todos os dias. Sequência atual: <b>{shop.login.streak}</b> dia(s). O 7º dia dá 💎 10!</p>
          </div>
          <button className="btn-gold" disabled={busy || shop.login.claimedToday}
            onClick={() => run(() => post("/api/daily-login"), "🎁 Recompensa diária recebida!", "reward")}>
            {shop.login.claimedToday ? "Volte amanhã" : "Receber"}
          </button>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[11px]">
          {DAILY_LOGIN.map((d) => {
            const cur = ((shop.login.streak - (shop.login.claimedToday ? 1 : 0)) % 7) + 1;
            const done = d.day < cur || (shop.login.claimedToday && d.day === cur);
            return (
              <div key={d.day} className={`rounded-lg p-2 ${done ? "bg-emerald-700/40" : d.day === cur ? "bg-gold/20 ring-1 ring-gold" : "bg-black/30"} ${d.day === 7 ? "ring-1 ring-arcane" : ""}`}>
                <p className="text-white/50">Dia {d.day}</p>
                <p>🪙{d.gold}</p>
                {d.gems ? <p>💎{d.gems}</p> : d.potions ? <p>🧪{d.potions}</p> : <p>&nbsp;</p>}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ENERGIA / ATALHOS */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Panel className="flex items-center gap-4 p-4">
          <Image src="/assets/shop/potion_energy.png" alt="" width={64} height={64} className="rounded-lg" />
          <div className="flex-1">
            <p className="font-display">Recarga Total de Energia</p>
            <p className="text-xs text-white/60">⚡ {c.energy}/{c.maxEnergy} · O preço sobe a cada recarga no dia.</p>
          </div>
          <button className="btn-gold !px-4 !py-2 text-sm" disabled={busy || c.energy >= c.maxEnergy}
            onClick={() => run(() => post("/api/shop/refill-energy"), "⚡ Energia recarregada!")}>
            💎 {shop.energyRefillPrice}
          </button>
        </Panel>
        <Panel className="flex items-center gap-4 p-4">
          <Image src="/assets/shop/potion_energy.png" alt="" width={64} height={64} className="rounded-lg hue-rotate-[200deg]" />
          <div className="flex-1">
            <p className="font-display">Elixir da Sabedoria</p>
            <p className="text-xs text-white/60">{boostLeft > 0 ? `Ativo! +50% XP por mais ${fmtTime(boostLeft)}` : "+50% de XP por 1 hora."}</p>
          </div>
          {(() => {
            const d = shop.convenience.find((x) => x.boostMinutes)!;
            return (
              <button className="btn-gold !px-4 !py-2 text-sm" disabled={busy || d.boughtToday >= d.limit}
                onClick={() => run(() => post("/api/shop/buy", { type: "deal", id: d.key }), "✨ Elixir ativado!")}>
                💎 {d.price}
              </button>
            );
          })()}
        </Panel>
      </div>

      {/* OFERTAS LIMITADAS */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-xl text-gold">🔥 Ofertas do Dia</h2>
          <span className="rounded-full bg-ember/30 px-3 py-1 text-xs">Renova em {fmtTime(shop.daily.resetsInSec - (Date.now() - loaded) / 1000)}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shop.daily.deals.map((d) => (
            <DealCard key={d.key} deal={d} busy={busy} onBuy={() => run(() => post("/api/shop/buy", { type: "deal", id: d.key }), "🛍️ Compra realizada!")} />
          ))}
          {shop.limited.map((o) => {
            const left = (new Date(o.endsAt).getTime() - Date.now()) / 1000;
            const owned = !!o.cosmetic && shop.owned.includes(o.cosmetic.id);
            return (
              <motion.div key={o.id} whileHover={{ y: -4 }} className={`panel relative overflow-hidden p-4 ring-1 ${RARITY_STYLE[o.cosmetic?.rarity ?? "rare"]}`}>
                <span className="absolute right-2 top-2 rounded bg-ember px-2 py-0.5 text-[10px] font-bold">EDIÇÃO LIMITADA</span>
                <div className="relative mx-auto mt-4 h-28 w-28">
                  {o.cosmetic?.kind === "frame" ? <Avatar src={c.portrait} frame={o.cosmetic.id} size={112} /> :
                    <Image src={o.cosmetic?.image ?? "/assets/loader.png"} alt="" fill sizes="112px" className="rounded-lg object-cover" />}
                </div>
                <p className="mt-3 text-center font-display text-sm">{o.cosmetic?.name}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/50">
                  <div className="h-full bg-ember" style={{ width: `${(o.stockLeft / o.stockTotal) * 100}%` }} />
                </div>
                <p className="mt-1 text-center text-[11px] text-white/60">Restam {o.stockLeft}/{o.stockTotal} · termina em {fmtTime(left)}</p>
                <button className="btn-gold mt-3 w-full !py-2 text-sm" disabled={busy || owned || o.stockLeft <= 0}
                  onClick={() => run(() => post("/api/shop/buy", { type: "offer", id: o.id }), "👑 Item lendário adquirido!", "reward")}>
                  {owned ? "Já é seu" : o.stockLeft <= 0 ? "Esgotado" : `💎 ${o.priceGems}`}
                </button>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* GEMAS */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-xl text-gold">💎 Gemas</h2>
            {shop.firstPurchaseBonus && <p className="text-xs text-emerald-300">Primeira compra: GEMAS EM DOBRO!</p>}
          </div>
          <div className="flex rounded-lg bg-black/40 p-1 text-xs">
            {(["BRL", "USD"] as const).map((cur) => (
              <button key={cur} onClick={() => setCurrency(cur)} className={`rounded-md px-3 py-1.5 ${currency === cur ? "bg-gold text-ink" : "text-white/70"}`}>{cur}</button>
            ))}
          </div>
        </div>

        {shop.starterAvailable && (
          <motion.div whileHover={{ scale: 1.01 }} className="panel mb-4 flex flex-wrap items-center gap-4 bg-gradient-to-r from-amber-900/40 to-fuchsia-900/30 p-5 ring-2 ring-gold/60">
            <Image src={STARTER_PACK.image} alt="" width={96} height={96} className="rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-amber-300">OFERTA ÚNICA · SÓ UMA VEZ POR CONTA</p>
              <p className="font-display text-xl">{STARTER_PACK.name}</p>
              <p className="text-sm text-white/70">💎 {STARTER_PACK.gems} + {STARTER_PACK.extras?.join(" + ")}</p>
            </div>
            <button className="btn-gold text-lg" disabled={busy} onClick={() => setBuying(STARTER_PACK)}>{formatPrice(STARTER_PACK.price[currency], currency)}</button>
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {GEM_PACKS.map((p) => (
            <motion.button key={p.id} whileHover={{ y: -4 }} onClick={() => setBuying(p)} disabled={busy}
              className={`panel relative p-4 text-center ${p.tag === "best" ? "ring-2 ring-gold" : ""}`}>
              {p.tag && <span className={`absolute -top-2 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[10px] font-bold ${p.tag === "best" ? "bg-gold text-ink" : "bg-arcane"}`}>{p.tag === "best" ? "MELHOR VALOR" : "POPULAR"}</span>}
              <Image src={p.image} alt="" width={120} height={120} className="mx-auto rounded-xl" />
              <p className="mt-2 font-display">{p.name}</p>
              <p className="text-2xl font-black text-sky-300">💎 {shop.firstPurchaseBonus ? p.gems * 2 : p.gems}</p>
              {(p.bonus > 0 || shop.firstPurchaseBonus) && (
                <p className="text-xs text-emerald-300">{shop.firstPurchaseBonus ? `${p.gems} + ${p.gems} bônus` : `inclui +${p.bonus} bônus`}</p>
              )}
              <p className="btn-gold mt-3">{formatPrice(p.price[currency], currency)}</p>
            </motion.button>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-white/40">
          Preços finais com impostos inclusos. Gemas são itens digitais sem valor monetário fora do jogo. Você pode solicitar reembolso em até 7 dias se as gemas não tiverem sido usadas (CDC art. 49).
        </p>
      </section>

      {/* COSMÉTICOS */}
      <section>
        <h2 className="mb-3 font-display text-xl text-gold">✨ Cosméticos</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {COSMETICS.filter((x) => x.price || shop.owned.includes(x.id)).map((x) => {
            const owned = shop.owned.includes(x.id);
            const equipped = shop.equipped[x.kind] === x.id;
            return (
              <div key={x.id} className={`panel p-4 text-center ring-1 ${RARITY_STYLE[x.rarity]}`}>
                <div className="mx-auto grid h-24 place-items-center">
                  {x.kind === "frame" ? <Avatar src={c.portrait} frame={x.id} size={92} /> :
                    x.kind === "skin" ? <Image src={x.image!} alt="" width={80} height={96} className="h-24 w-20 rounded-lg object-cover" /> :
                    <span className="rounded-md bg-black/40 px-3 py-2 font-display text-sm text-amber-200">« {x.name} »</span>}
                </div>
                <p className="mt-2 truncate text-sm">{x.name}</p>
                <p className="text-[11px] text-white/40">{x.kind === "frame" ? "Moldura" : x.kind === "title" ? "Título" : "Visual"} · {RARITY_LABEL[x.rarity]}</p>
                {owned ? (
                  <button disabled={busy} className={`mt-2 w-full rounded-md py-1.5 text-xs ${equipped ? "bg-white/10" : "bg-emerald-600"}`}
                    onClick={() => run(() => post("/api/shop/equip", { kind: x.kind, cosmeticId: equipped ? null : x.id }), equipped ? "Removido" : "Equipado!")}>
                    {equipped ? "Remover" : "Usar"}
                  </button>
                ) : (
                  <button disabled={busy} className="btn-gold mt-2 w-full !py-1.5 text-xs"
                    onClick={() => run(() => post("/api/shop/buy", { type: "cosmetic", id: x.id }), "✨ Cosmético adquirido!")}>
                    {x.price!.currency === "gems" ? "💎" : "🪙"} {x.price!.amount}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* CONVENIÊNCIA */}
      <section>
        <h2 className="mb-3 font-display text-xl text-gold">🎒 Suprimentos</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {shop.convenience.filter((d) => !d.boostMinutes).map((d) => (
            <DealCard key={d.key} deal={d} busy={busy} onBuy={() => run(() => post("/api/shop/buy", { type: "deal", id: d.key }), "🛍️ Compra realizada!")} />
          ))}
        </div>
      </section>

      {buying && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => !busy && setBuying(null)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="panel w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-xl">{buying.name}</p>
            <p className="text-sm text-white/60">💎 {buying.gems} · {formatPrice(buying.price[currency], currency)}</p>
            <div className="mt-5 space-y-2">
              {[...providersFor(currency), ...(shop.providers.dev ? (["dev"] as const) : [])]
                .filter((p) => p === "dev" || shop.providers[p])
                .map((p) => (
                  <button key={p} disabled={busy} onClick={() => checkout(buying, p)}
                    className={`w-full rounded-lg py-3 font-semibold ${p === "mercadopago" ? "bg-[#00b1ea] text-white" : p === "stripe" ? "bg-[#635bff] text-white" : "bg-white/10"}`}>
                    {PROVIDER_LABEL[p]}
                  </button>
                ))}
              {!shop.providers.stripe && !shop.providers.mercadopago && !shop.providers.dev && (
                <p className="text-sm text-amber-300">Pagamentos ainda não configurados no servidor.</p>
              )}
            </div>
            <p className="mt-4 text-center text-[11px] text-white/40">Pagamento processado com segurança pelo gateway. Não armazenamos dados do seu cartão.</p>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function DealCard({ deal, busy, onBuy }: { deal: DailyDeal & { boughtToday: number }; busy: boolean; onBuy: () => void }) {
  const soldOut = deal.boughtToday >= deal.limit;
  return (
    <motion.div whileHover={{ y: -4 }} className="panel p-4 text-center">
      <Image src={deal.image} alt="" width={96} height={96} className="mx-auto h-24 w-24 rounded-lg object-contain" />
      <p className="mt-2 font-display text-sm">{deal.name}</p>
      <p className="text-[11px] text-white/60">{deal.description}</p>
      <p className="text-[11px] text-white/40">Limite: {deal.boughtToday}/{deal.limit} hoje</p>
      <button className="btn-gold mt-3 w-full !py-2 text-sm" disabled={busy || soldOut} onClick={onBuy}>
        {soldOut ? "Esgotado hoje" : `${deal.currency === "gems" ? "💎" : "🪙"} ${deal.price}`}
      </button>
    </motion.div>
  );
}
