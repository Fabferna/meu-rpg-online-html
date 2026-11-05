"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import { ITEM_BY_ID, sellPrice, upgradedStats } from "@/lib/game/items";
import type { TFn } from "@/lib/i18n/translate";
import Pets from "./Pets";
import { post, RARITY_LABEL, RARITY_STYLE } from "./api";
import { Panel } from "./ui";
import { play } from "./sfx";
import { useT } from "@/lib/i18n/client";

export const SLOT_LABEL: Record<string, string> = { weapon: "Arma", armor: "Armadura", accessory: "Acessório" };
const STAT_LABEL: Record<string, string> = { atk: "ATQ", def: "DEF", str: "FOR", dex: "DES", con: "CON", intel: "INT", heal: "Cura" };
export const statText = (t: TFn, d: Record<string, unknown>) =>
  Object.entries(d).filter(([k]) => k in STAT_LABEL).map(([k, v]) => `${t(STAT_LABEL[k])} +${v}`).join(" · ");

export default function Inventory({ ctx }: { ctx: GameCtx }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"bag" | "pets">("bag");
  const items = ctx.state.inventory;

  async function run(url: string, body: object, ok: string) {
    setBusy(true);
    try {
      await post(url, body);
      play("coin");
      ctx.toast(ok);
      await ctx.refresh();
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const equipped = items.filter((i) => i.equipped);

  return (
    <div className="space-y-5">
      <Panel className="grid grid-cols-3 gap-3 p-4">
        {["weapon", "armor", "accessory"].map((slot) => {
          const it = equipped.find((i) => i.slot === slot);
          return (
            <div key={slot} className={`flex flex-col items-center rounded-lg bg-black/30 p-3 ring-1 ${it ? RARITY_STYLE[it.rarity] : "ring-white/10"}`}>
              <p className="text-[11px] uppercase tracking-wider text-white/40">{t(SLOT_LABEL[slot])}</p>
              <div className="relative mt-2 h-16 w-16">
                {it ? <Image src={ITEM_BY_ID[it.itemId]?.image ?? String(it.data.image)} alt="" fill sizes="64px" className="object-contain" /> : <span className="grid h-full place-items-center text-2xl text-white/20">＋</span>}
              </div>
              <p className="mt-2 text-center text-xs">{it?.name ?? "Vazio"}{it?.upgrade ? <b className="ml-1 text-gold">+{it.upgrade}</b> : null}</p>
            </div>
          );
        })}
      </Panel>

      <div className="flex gap-2">
        {([["bag", "🎒 Minha bolsa"], ["pets", "🐾 Pets"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} className={`rounded-lg px-4 py-2 text-sm font-display ${view === k ? "bg-gold text-ink" : "bg-white/5 text-white/70"}`}>{t(l)}</button>
        ))}
        <span className="ml-auto self-center text-sm">🪙 <b>{ctx.state.wallet.gold.toLocaleString(t.locale)}</b></span>
      </div>

      {view === "pets" ? <Pets ctx={ctx} /> : (
        items.length === 0 ? (
          <Panel className="p-8 text-center text-white/60">{t("Sua bolsa está vazia. Complete missões e caçadas para encontrar itens!")}</Panel>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map((it, i) => {
              const def = ITEM_BY_ID[it.itemId];
              return (
                <motion.div key={it.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                  className={`panel relative flex flex-col p-3 ring-1 ${RARITY_STYLE[it.rarity]}`}>
                  <div className="relative mx-auto h-20 w-20">
                    <Image src={def?.image ?? String(it.data.image)} alt="" fill sizes="80px" className="object-contain" />
                    {it.qty > 1 && <span className="absolute -right-1 -top-1 rounded-full bg-gold px-1.5 text-xs font-bold text-ink">x{it.qty}</span>}
                  </div>
                  {it.upgrade > 0 && <span className="absolute left-2 top-2 rounded bg-gold px-1.5 font-display text-xs font-black text-ink">+{it.upgrade}</span>}
                  <p className="mt-2 truncate text-center text-sm">{t(it.name)}</p>
                  <p className="text-center text-[11px] text-white/40">{t(RARITY_LABEL[it.rarity])}</p>
                  <p className="mt-1 flex-1 text-center text-[11px] text-emerald-300">{statText(t, upgradedStats(it.data as Record<string, number>, it.upgrade))}</p>
                  <div className="mt-2 flex gap-1.5">
                    {it.slot && (
                      <button disabled={busy} onClick={() => run("/api/inventory/equip", { inventoryId: it.id }, it.equipped ? "Item removido" : "Item equipado")}
                        className={`flex-1 rounded-md py-1.5 text-xs ${it.equipped ? "bg-white/10" : "bg-gold/90 text-ink"}`}>
                        {it.equipped ? t("Remover") : t("Equipar")}
                      </button>
                    )}
                    {def && !it.equipped && (
                      <button disabled={busy} title={t("Vender 1 por {n} de ouro", { n: sellPrice(def, it.upgrade) })} onClick={() => run("/api/smith/sell", { inventoryId: it.id }, t("Vendido por {n} 🪙", { n: sellPrice(def, it.upgrade) }))}
                        className="flex-1 rounded-md bg-white/5 py-1.5 text-xs hover:bg-white/10">
                        {t("Vender")} 🪙{sellPrice(def, it.upgrade)}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
