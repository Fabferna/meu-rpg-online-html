"use client";

import { useMemo, useState } from "react";
import type { GameCtx } from "./GameApp";
import { ITEMS, ITEM_BY_ID, MAX_UPGRADE, SLOTS } from "@/lib/game/items";
import type { InventoryEntry } from "@/lib/game/state";
import Forge from "./Forge";
import { FilterBar, GearCard, NO_FILTER, Sources, passes, type GearFilter } from "./GearCard";
import { post } from "./api";
import { Panel } from "./ui";
import { play } from "./sfx";
import { useT } from "@/lib/i18n/client";

const RARITY_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3 } as const;

/** Aba Forja: aprimorar, comprar no Ferreiro e ver o catálogo completo de equipamentos. */
export default function Smithy({ ctx }: { ctx: GameCtx }) {
  const t = useT();
  const [view, setView] = useState<"forge" | "smith" | "catalog">("forge");
  const [filter, setFilter] = useState<GearFilter>(NO_FILTER);
  const [busy, setBusy] = useState(false);
  const [forging, setForging] = useState<InventoryEntry | null>(null);
  const items = ctx.state.inventory;
  const race = ctx.state.character.race;
  const level = ctx.state.character.level;

  const gear = items.filter((i) => i.slot && passes(filter, ITEM_BY_ID[i.itemId], race))
    .sort((a, b) => Number(b.equipped) - Number(a.equipped) || SLOTS.indexOf(a.slot as never) - SLOTS.indexOf(b.slot as never));
  // Catálogo: por espaço, depois nível exigido e raridade.
  const catalog = useMemo(() => ITEMS.filter((d) => passes(filter, d, race))
    .sort((a, b) => SLOTS.indexOf(a.slot!) - SLOTS.indexOf(b.slot!) || (a.minLevel ?? 1) - (b.minLevel ?? 1) || RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]), [filter, race]);
  const shop = catalog.filter((d) => d.buy);
  const ownedQty = (id: string) => items.filter((i) => i.itemId === id).reduce((n, i) => n + i.qty, 0);

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

  const buyBtn = (id: string) => {
    const d = ITEM_BY_ID[id];
    const locked = level < (d.minLevel ?? 1);
    return (
      <button disabled={busy || locked || ctx.state.wallet.gold < d.buy!} onClick={() => buy(d.id, d.name)} className="btn-gold mt-2 min-h-11 w-full !py-1.5 text-xs">
        {locked ? t("Requer nível {n}", { n: d.minLevel ?? 1 }) : `🪙 ${d.buy!.toLocaleString(t.locale)}`}
      </button>
    );
  };
  const upBtn = (it: InventoryEntry) => (
    <button disabled={it.upgrade >= MAX_UPGRADE} onClick={() => setForging(it)}
      className="mt-2 min-h-11 w-full rounded-md bg-gradient-to-r from-ember/70 to-amber-600/70 py-1.5 text-xs hover:brightness-110 disabled:opacity-50">
      ⚒️ {it.upgrade >= MAX_UPGRADE ? t("Máximo") : t("Aprimorar (+{n})", { n: it.upgrade + 1 })}
    </button>
  );
  const grid = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {([["forge", "⚒️ Aprimorar"], ["smith", "🛒 Ferreiro"], ["catalog", "📖 Catálogo"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} className={`min-h-11 rounded-lg px-3 text-sm font-display sm:px-4 ${view === k ? "bg-gold text-ink" : "bg-white/5 text-white/70"}`}>{t(l)}</button>
        ))}
        <span className="ml-auto text-sm">🪙 <b>{ctx.state.wallet.gold.toLocaleString(t.locale)}</b></span>
      </div>
      <FilterBar value={filter} onChange={setFilter} count={view === "forge" ? gear.length : view === "smith" ? shop.length : catalog.length} />

      {view === "forge" && (
        gear.length === 0 ? (
          <Panel className="p-8 text-center text-white/60">
            {items.some((i) => i.slot) ? t("Nenhum equipamento seu com esses filtros.") : t("Você ainda não tem equipamentos para aprimorar. Compre no Ferreiro ou encontre em caçadas!")}
          </Panel>
        ) : (
          <>
            <p className="text-sm text-white/60">{t("Se falhar, o item não quebra nem perde nível: só o ouro é gasto.")}</p>
            <div className={grid}>
              {gear.map((it) => {
                const def = ITEM_BY_ID[it.itemId];
                return def ? <GearCard key={it.id} state={ctx.state} def={def} entry={it}>{upBtn(it)}</GearCard> : null;
              })}
            </div>
          </>
        )
      )}

      {view === "smith" && (
        <div className={grid}>
          {shop.map((d) => (
            <GearCard key={d.id} state={ctx.state} def={d} owned={ownedQty(d.id)} locked={level < (d.minLevel ?? 1)}>{buyBtn(d.id)}</GearCard>
          ))}
          {shop.length === 0 && <Panel className="col-span-full p-6 text-center text-white/60">{t("O Ferreiro não vende itens com esses filtros. Veja o 📖 Catálogo.")}</Panel>}
        </div>
      )}

      {view === "catalog" && (
        <>
          <p className="text-sm text-white/60">{t("Todos os equipamentos do jogo. Os que não estão à venda mostram onde encontrar.")}</p>
          <div className={grid}>
            {catalog.map((d) => {
              const mine = items.filter((i) => i.itemId === d.id).sort((a, b) => Number(b.equipped) - Number(a.equipped) || b.upgrade - a.upgrade)[0];
              return (
                <GearCard key={d.id} state={ctx.state} def={d} entry={mine} owned={ownedQty(d.id)} locked={level < (d.minLevel ?? 1)}>
                  {!d.buy && <div className="mt-2"><Sources id={d.id} /></div>}
                  {d.buy ? buyBtn(d.id) : mine ? upBtn(mine) : null}
                </GearCard>
              );
            })}
          </div>
        </>
      )}
      <Forge ctx={ctx} item={forging} onClose={() => setForging(null)} />
    </div>
  );
}
