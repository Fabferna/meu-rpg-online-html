"use client";

import { useState } from "react";
import Image from "next/image";
import type { GameCtx } from "./GameApp";
import { ITEMS, ITEM_BY_ID, MAX_UPGRADE, upgradedStats } from "@/lib/game/items";
import type { InventoryEntry } from "@/lib/game/state";
import Forge from "./Forge";
import { SLOT_LABEL, statText } from "./Inventory";
import { post, RARITY_LABEL, RARITY_STYLE } from "./api";
import { Panel } from "./ui";
import { play } from "./sfx";
import { useT } from "@/lib/i18n/client";

/** Aba Forja: aprimorar equipamentos e comprar no Ferreiro. */
export default function Smithy({ ctx }: { ctx: GameCtx }) {
  const t = useT();
  const [view, setView] = useState<"forge" | "smith">("forge");
  const [busy, setBusy] = useState(false);
  const [forging, setForging] = useState<InventoryEntry | null>(null);
  const items = ctx.state.inventory;
  const level = ctx.state.character.level;
  const gear = items.filter((i) => i.slot).sort((a, b) => Number(b.equipped) - Number(a.equipped));

  async function buy(id: string, name: string) {
    setBusy(true);
    try {
      await post("/api/smith/buy", { itemId: id });
      play("coin");
      ctx.toast(t("{x} comprado!", { x: t(name) }));
      await ctx.refresh();
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {([["forge", "⚒️ Forja"], ["smith", "⚒️ Ferreiro"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} className={`rounded-lg px-4 py-2 text-sm font-display ${view === k ? "bg-gold text-ink" : "bg-white/5 text-white/70"}`}>{t(l)}</button>
        ))}
        <span className="ml-auto text-sm">🪙 <b>{ctx.state.wallet.gold.toLocaleString(t.locale)}</b></span>
      </div>

      {view === "forge" ? (
        gear.length === 0 ? (
          <Panel className="p-8 text-center text-white/60">{t("Você ainda não tem equipamentos para aprimorar. Compre no Ferreiro ou encontre em caçadas!")}</Panel>
        ) : (
          <>
            <p className="text-sm text-white/60">{t("Se falhar, o item não quebra nem perde nível: só o ouro é gasto.")}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {gear.map((it) => {
                const def = ITEM_BY_ID[it.itemId];
                return (
                  <div key={it.id} className={`panel relative flex flex-col p-3 ring-1 ${RARITY_STYLE[it.rarity]}`}>
                    <div className="relative mx-auto h-20 w-20"><Image src={def?.image ?? String(it.data.image)} alt="" fill sizes="80px" className="object-contain" /></div>
                    {it.upgrade > 0 && <span className="absolute left-2 top-2 rounded bg-gold px-1.5 font-display text-xs font-black text-ink">+{it.upgrade}</span>}
                    {it.equipped && <span className="absolute right-2 top-2 rounded bg-emerald-600/80 px-1.5 text-[10px]">{t("Equipado")}</span>}
                    <p className="mt-2 truncate text-center text-sm">{t(it.name)}</p>
                    <p className="text-center text-[11px] text-white/40">{t(SLOT_LABEL[it.slot!] ?? "")} · {t(RARITY_LABEL[it.rarity])}</p>
                    <p className="mt-1 flex-1 text-center text-[11px] text-emerald-300">{statText(t, upgradedStats(it.data as Record<string, number>, it.upgrade))}</p>
                    <button disabled={it.upgrade >= MAX_UPGRADE} onClick={() => setForging(it)}
                      className="mt-2 w-full rounded-md bg-gradient-to-r from-ember/70 to-amber-600/70 py-1.5 text-xs hover:brightness-110 disabled:opacity-50">
                      ⚒️ {it.upgrade >= MAX_UPGRADE ? t("Máximo") : t("Aprimorar (+{n})", { n: it.upgrade + 1 })}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ITEMS.filter((d) => d.buy).map((d) => {
            const locked = level < (d.minLevel ?? 1);
            const owned = items.filter((i) => i.itemId === d.id).reduce((n, i) => n + i.qty, 0);
            return (
              <div key={d.id} className={`panel flex flex-col p-3 ring-1 ${RARITY_STYLE[d.rarity]} ${locked ? "opacity-50" : ""}`}>
                <div className="relative mx-auto h-20 w-20"><Image src={d.image} alt="" fill sizes="80px" className="object-contain" /></div>
                <p className="mt-2 truncate text-center text-sm">{t(d.name)}</p>
                <p className="text-center text-[11px] text-white/40">{d.slot ? t(SLOT_LABEL[d.slot]) : ""} · {t(RARITY_LABEL[d.rarity])}{owned ? ` · ${t("você tem {n}", { n: owned })}` : ""}</p>
                <p className="mt-1 flex-1 text-center text-[11px] text-emerald-300">{statText(t, d.stats)}</p>
                <button disabled={busy || locked || ctx.state.wallet.gold < d.buy!} onClick={() => buy(d.id, d.name)} className="btn-gold mt-2 w-full !py-1.5 text-xs">
                  {locked ? t("Requer nível {n}", { n: d.minLevel ?? 1 }) : `🪙 ${d.buy}`}
                </button>
              </div>
            );
          })}
        </div>
      )}
      <Forge ctx={ctx} item={forging} onClose={() => setForging(null)} />
    </div>
  );
}
