"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import type { Achievement, DailyGoal } from "@/lib/game/goals";
import { COSMETIC_BY_ID, secondsToUtcMidnight } from "@/lib/shop/catalog";
import { fmtTime, post } from "./api";
import { Bar, Panel } from "./ui";
import { play } from "./sfx";
import Invite from "./Invite";
import { useT } from "@/lib/i18n/client";
import Image from "next/image";
import type { Order } from "@/lib/game/collector";
import { orderAccepts } from "@/lib/game/collector";
import { ITEM_BY_ID, sellPrice } from "@/lib/game/items";
import { RARITY_LABEL, RARITY_STYLE } from "./api";

type GoalsState = {
  daily: (DailyGoal & { progress: number; claimed: boolean })[];
  bonus: { gold: number; gems: number; ready: boolean; claimed: boolean };
  achievements: (Achievement & { progress: number; claimed: boolean })[];
  collector?: (Order & { claimed: boolean })[];
};

export default function Goals({ ctx, onCount }: { ctx: GameCtx; onCount?: (n: number) => void }) {
  const t = useT();
  const [g, setG] = useState<GoalsState | null>(null);
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);

  const load = useCallback(async () => {
    const r = await fetch("/api/goals", { cache: "no-store" });
    if (r.ok) setG(await r.json());
  }, []);
  useEffect(() => { load(); const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, [load]);
  useEffect(() => {
    if (!g || !onCount) return;
    const bag = ctx.state.inventory.filter((i) => !i.equipped);
    const readyOrders = (g.collector ?? []).filter((o) => !o.claimed && bag.filter((i) => orderAccepts(o, i.itemId)).reduce((n, i) => n + i.qty, 0) >= o.qty).length;
    onCount(g.daily.filter((d) => !d.claimed && d.progress >= d.target).length + g.achievements.filter((a) => !a.claimed && a.progress >= a.target).length + readyOrders);
  }, [g, onCount, ctx.state.inventory]);

  async function claim(body: object) {
    setBusy(true);
    try {
      const r = await post<{ gold: number; gems: number; cosmetic: string | null }>("/api/goals/claim", body);
      play("coin");
      ctx.toast(`🎁 ${[r.gold && `+${r.gold} 🪙`, r.gems && `+${r.gems} 💎`, r.cosmetic && t("Título “{x}”", { x: t(COSMETIC_BY_ID[r.cosmetic]?.name ?? "") })].filter(Boolean).join(" · ")}`, "reward");
      await Promise.all([load(), ctx.refresh()]);
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (!g) return <p className="text-white/50">{t("Carregando objetivos…")}</p>;
  const reward = (gold: number, gems: number) => [gold ? `🪙 ${gold}` : "", gems ? `💎 ${gems}` : ""].filter(Boolean).join(" + ");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-xl text-gold">{t("🎯 Missões Diárias")}</h2>
          <span className="text-xs text-white/50">{t("Renovam em {tempo}", { tempo: fmtTime(secondsToUtcMidnight()) })}</span>
        </div>
        {g.daily.map((d) => {
          const done = d.progress >= d.target;
          return (
            <Panel key={d.id} className="flex items-center gap-3 p-4">
              <span className="text-2xl">{d.icon}</span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex justify-between text-sm"><span>{t(d.title)}</span><span className="text-white/50">{d.progress}/{d.target}</span></div>
                <Bar value={d.progress} max={d.target} color={done ? "bg-emerald-500" : "bg-gold"} />
              </div>
              <button disabled={busy || !done || d.claimed} onClick={() => claim({ kind: "daily", id: d.id })}
                className={`min-w-24 rounded-lg px-3 py-2 text-xs font-semibold ${d.claimed ? "bg-white/5 text-white/40" : done ? "btn-gold" : "bg-white/5 text-white/60"}`}>
                {d.claimed ? t("✔ Feito") : reward(d.gold, d.gems)}
              </button>
            </Panel>
          );
        })}
        <motion.div animate={g.bonus.ready && !g.bonus.claimed ? { scale: [1, 1.02, 1] } : {}} transition={{ repeat: Infinity, duration: 1.6 }}
          className="panel flex items-center gap-3 bg-gradient-to-r from-fuchsia-900/30 to-amber-900/30 p-4 ring-1 ring-arcane/50">
          <span className="text-2xl">🏅</span>
          <p className="flex-1 text-sm">{t("Complete todas as diárias:")} <b>{reward(g.bonus.gold, g.bonus.gems)}</b></p>
          <button disabled={busy || !g.bonus.ready || g.bonus.claimed} onClick={() => claim({ kind: "bonus" })}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${g.bonus.claimed ? "bg-white/5 text-white/40" : g.bonus.ready ? "btn-gold" : "bg-white/5 text-white/60"}`}>
            {g.bonus.claimed ? t("✔ Feito") : t("Resgatar")}
          </button>
        </motion.div>
        {g.collector && g.collector.length > 0 && <Collector ctx={ctx} orders={g.collector} onDone={() => Promise.all([load(), ctx.refresh()]).then(() => undefined)} />}
        <Invite ctx={ctx} />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-gold">{t("🏆 Conquistas")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {g.achievements.map((a) => {
            const done = a.progress >= a.target;
            return (
              <div key={a.id} className={`panel space-y-2 p-4 ${a.claimed ? "opacity-60" : done ? "ring-1 ring-gold" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-sm">{t(a.title)}</p>
                    <p className="text-[11px] text-white/50">{t(a.description)}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-white/50">{a.progress}/{a.target}</span>
                </div>
                <Bar value={a.progress} max={a.target} color={done ? "bg-emerald-500" : "bg-arcane"} />
                <button disabled={busy || !done || a.claimed} onClick={() => claim({ kind: "achievement", id: a.id })}
                  className={`w-full rounded-md py-1.5 text-xs font-semibold ${a.claimed ? "bg-white/5 text-white/40" : done ? "btn-gold" : "bg-white/5 text-white/60"}`}>
                  {a.claimed ? t("✔ Conquistada") : `${reward(a.gold, a.gems)}${a.cosmetic ? ` + ${t("título “{x}”", { x: t(COSMETIC_BY_ID[a.cosmetic]?.name ?? "") })}` : ""}`}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/** Encomendas do Colecionador: entregue itens da Caçada (eles são consumidos) por ouro, XP e gemas. */
function Collector({ ctx, orders, onDone }: { ctx: GameCtx; orders: (Order & { claimed: boolean })[]; onDone: () => Promise<void> }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const inv = ctx.state.inventory.filter((i) => !i.equipped);

  // Encomenda "qualquer equipamento da raridade": o jogador escolhe quais itens da bolsa entregar.
  const [choosing, setChoosing] = useState<Order | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const value = (i: (typeof inv)[number]) => { const d = ITEM_BY_ID[i.itemId]; return d ? sellPrice(d, i.upgrade) : 0; };
  const options = choosing ? inv.filter((x) => orderAccepts(choosing, x.itemId)).sort((a, b) => a.upgrade - b.upgrade || value(a) - value(b)) : [];
  const units = options.filter((i) => sel.includes(i.id)).reduce((n, i) => n + i.qty, 0);
  const toggle = (id: string) => setSel((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : choosing && units >= choosing.qty ? cur : [...cur, id]);

  async function send(o: Order, ids: string[]) {
    setBusy(true);
    try {
      const r = await post<{ gold: number; gems: number; xp: number }>("/api/goals/collector", { idx: o.idx, inventoryIds: ids });
      play("coin");
      ctx.toast(`📦 ${[`+${r.gold} 🪙`, r.gems ? `+${r.gems} 💎` : "", `+${r.xp} XP`].filter(Boolean).join(" · ")}`, "reward");
      setChoosing(null);
      await onDone();
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function deliver(o: Order) {
    if (o.kind === "rarity") { setSel([]); setChoosing(o); return; }
    // Escolhe os itens que valem MENOS (sem aprimoramento primeiro) até completar a quantidade.
    const pick: typeof inv = [];
    let left = o.qty;
    for (const i of inv.filter((x) => orderAccepts(o, x.itemId)).sort((a, b) => a.upgrade - b.upgrade || value(a) - value(b))) {
      if (left <= 0) break;
      pick.push(i); left -= i.qty;
    }
    const names = pick.map((i) => `• ${t(i.name)}${i.upgrade ? ` +${i.upgrade}` : ""}`).join("\n");
    if (!confirm(`${t("Entregar estes itens? Eles serão consumidos.")}\n\n${names}`)) return;
    await send(o, pick.map((i) => i.id));
  }

  return (
    <div className="space-y-2 pt-2">
      <div>
        <h2 className="font-display text-xl text-gold">{t("📦 Encomendas do Colecionador")}</h2>
        <p className="text-xs text-white/50">{t("Itens entregues são consumidos")}</p>
      </div>
      {orders.map((o) => {
        const def = o.item ? ITEM_BY_ID[o.item] : undefined;
        const have = inv.filter((i) => orderAccepts(o, i.itemId)).reduce((n, i) => n + i.qty, 0);
        const ready = have >= o.qty;
        const label = o.kind === "item" ? t(def?.name ?? "") : t("Equipamento {r} (qualquer espaço)", { r: t(RARITY_LABEL[o.rarity ?? "common"]).toLowerCase() });
        return (
          <Panel key={o.idx} className={`flex items-center gap-3 p-3 ${o.claimed ? "opacity-60" : ""}`}>
            <span className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-black/40 ring-1 ${RARITY_STYLE[def?.rarity ?? o.rarity ?? "common"]}`}>
              {def ? <Image src={def.image} alt="" fill sizes="48px" className="object-contain p-1" /> : <span className="text-2xl">🧩</span>}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm leading-tight">{t("Entregue {n}× {x}", { n: o.qty, x: label })}</p>
              <Bar value={Math.min(have, o.qty)} max={o.qty} color={ready ? "bg-emerald-500" : "bg-gold"} />
              <p className="text-[11px] text-white/50">{t("Você tem {a}/{b}", { a: Math.min(have, o.qty), b: o.qty })} · 🪙 {o.gold}{o.gems ? ` · 💎 ${o.gems}` : ""} · ✨ {o.xp} XP</p>
            </div>
            <button disabled={busy || o.claimed || !ready} onClick={() => deliver(o)}
              className={`min-h-11 min-w-24 rounded-lg px-3 text-xs font-semibold ${o.claimed ? "bg-white/5 text-white/40" : ready ? "btn-gold" : "bg-white/5 text-white/60"}`}>
              {o.claimed ? t("✔ Entregue") : o.kind === "rarity" && ready ? t("Escolher itens") : t("Entregar")}
            </button>
          </Panel>
        );
      })}

      {choosing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" onClick={() => !busy && setChoosing(null)}>
          <div role="dialog" aria-modal="true" className="panel flex max-h-[85vh] w-full max-w-md flex-col p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg text-gold">{t("Escolha {n} itens para entregar", { n: choosing.qty })}</h3>
            <p className="mb-3 text-xs text-white/60">{t("Os itens escolhidos serão consumidos. Itens equipados não aparecem aqui.")}</p>
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {options.map((i) => {
                const d = ITEM_BY_ID[i.itemId];
                const on = sel.includes(i.id);
                const full = !on && units >= choosing.qty;
                return (
                  <li key={i.id}>
                    <button disabled={busy || full} aria-pressed={on} onClick={() => toggle(i.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${on ? "bg-emerald-600/25 ring-2 ring-emerald-400" : "bg-black/30 ring-1 ring-white/10"} ${full ? "opacity-40" : ""}`}>
                      <span className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-black/40 ring-1 ${RARITY_STYLE[d?.rarity ?? "common"]}`}>
                        {d && <Image src={d.image} alt="" fill sizes="44px" className="object-contain p-1" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{t(i.name)}{i.upgrade ? <b className="text-gold"> +{i.upgrade}</b> : null}{i.qty > 1 ? ` ×${i.qty}` : ""}</span>
                        <span className="block text-[11px] text-white/50">{t("Vale {n} 🪙 na venda", { n: value(i) })}</span>
                      </span>
                      <span className="text-lg">{on ? "✅" : "⬜"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex items-center gap-2">
              <span className="flex-1 text-sm text-white/70">{t("Escolhidos: {a}/{b}", { a: Math.min(units, choosing.qty), b: choosing.qty })}</span>
              <button disabled={busy} onClick={() => setChoosing(null)} className="min-h-11 rounded-lg bg-white/10 px-4 text-sm">{t("Cancelar")}</button>
              <button disabled={busy || units < choosing.qty} onClick={() => send(choosing, sel)} className="btn-gold min-h-11 !px-4 text-sm">{t("Entregar")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
