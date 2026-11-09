"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import { type ItemDef, ITEM_BY_ID, SLOTS, itemStatsFor, sellPrice, upgradedStats, type Slot } from "@/lib/game/items";
import type { InventoryEntry } from "@/lib/game/state";
import type { TFn } from "@/lib/i18n/translate";
import Pets from "./Pets";
import Cosmetics from "./Cosmetics";
import { post, RARITY_LABEL, RARITY_STYLE } from "./api";
import { Panel } from "./ui";
import { play } from "./sfx";
import { useT } from "@/lib/i18n/client";
import { RACES, type RaceId } from "@/lib/game/data";
import { GearInsight, SetTag } from "./GearCard";
import { activeSets } from "@/lib/game/sets";
import { BAG_LIMIT } from "@/lib/game/loot";

export const SLOT_LABEL: Record<string, string> = { weapon: "Arma", helmet: "Elmo", armor: "Armadura", boots: "Botas", accessory: "Acessório" };
const STAT_LABEL: Record<string, string> = { atk: "ATQ", def: "DEF", str: "FOR", dex: "DES", con: "CON", intel: "INT", heal: "Cura" };
export const statText = (t: TFn, d: Record<string, unknown>) =>
  Object.entries(d).filter(([k]) => k in STAT_LABEL).map(([k, v]) => `${t(STAT_LABEL[k])} +${v}`).join(" · ");

/** Abre o Inventário direto em uma aba (ex.: atalho "Escolher título" na tela do Herói). */
let nextView: "bag" | "pets" | "looks" | null = null;
export const openInventoryView = (v: "bag" | "pets" | "looks") => { nextView = v; };

export default function Inventory({ ctx }: { ctx: GameCtx }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"bag" | "pets" | "looks">(() => { const v = nextView ?? "bag"; nextView = null; return v; });
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

  // Usar consumível: poção, elixir (bônus de XP) ou baú (abre e mostra o que saiu).
  const [opened, setOpened] = useState<{ name: string; gold: number; gems: number; item: string | null } | null>(null);
  async function useItem(it: InventoryEntry) {
    const d = ITEM_BY_ID[it.itemId];
    setBusy(true);
    try {
      const r = await post<{ kind: string; heal?: number; minutes?: number; gold?: number; gems?: number; item?: string | null }>("/api/inventory/use", { itemId: it.itemId });
      if (r.kind === "chest") { play("victory"); setOpened({ name: d?.name ?? it.name, gold: r.gold ?? 0, gems: r.gems ?? 0, item: r.item ?? null }); }
      else if (r.kind === "boost") { play("skill"); ctx.toast(t("✨ Elixir ativado: +50% de XP por {n} min!", { n: r.minutes ?? 0 }), "reward"); }
      else { play("heal"); ctx.toast(t("❤️ +{n} de vida", { n: r.heal ?? 0 }), "reward"); }
      await ctx.refresh();
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const equipped = items.filter((i) => i.equipped);
  const bagUsed = items.length - equipped.length;
  const sets = activeSets(equipped.map((i) => i.itemId));
  const [f, setF] = useState<BagFilter>(NO_BAG_FILTER);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const shown = useMemo(() => filterBag(items, f), [items, f]);
  const priceOf = (it: InventoryEntry) => { const d = ITEM_BY_ID[it.itemId]; return d ? sellPrice(d, it.upgrade) * it.qty : 0; };
  const pickedList = items.filter((i) => picked.has(i.id) && !i.equipped);
  const pickedGold = pickedList.reduce((n, i) => n + priceOf(i), 0);
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function sellMany() {
    if (!pickedList.length) return;
    const names = pickedList.slice(0, 6).map((i) => `• ${t(i.name)}${i.qty > 1 ? ` ×${i.qty}` : ""}${i.upgrade ? ` +${i.upgrade}` : ""}`).join("\n");
    const more = pickedList.length > 6 ? `\n${t("…e mais {n}", { n: pickedList.length - 6 })}` : "";
    const rareUp = pickedList.some((i) => i.rarity === "epic" || i.rarity === "legendary" || i.upgrade > 0);
    if (!confirm(`${t("Vender {n} item(ns) por {g} de ouro?", { n: pickedList.length, g: pickedGold.toLocaleString(t.locale) })}\n\n${names}${more}${rareUp ? `\n\n⚠️ ${t("Inclui itens épicos/lendários ou aprimorados.")}` : ""}`)) return;
    setBusy(true);
    try {
      const r = await post<{ gold: number; count: number }>("/api/smith/sell-many", { inventoryIds: pickedList.map((i) => i.id) });
      play("coin");
      ctx.toast(t("Vendidos {n} item(ns) por {g} 🪙", { n: r.count, g: r.gold }), "reward");
      setPicked(new Set()); setPicking(false);
      await ctx.refresh();
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }
  const race = ctx.state.character.race;

  return (
    <div className="space-y-5">
      <Panel className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-5 sm:gap-3 sm:p-4">
        {SLOTS.map((slot) => {
          const it = equipped.find((i) => i.slot === slot);
          return (
            <div key={slot} className={`flex flex-col items-center rounded-lg bg-black/30 p-3 ring-1 ${it ? RARITY_STYLE[it.rarity] : "ring-white/10"}`}>
              <p className="text-[11px] uppercase tracking-wider text-white/40">{t(SLOT_LABEL[slot])}</p>
              <div className="relative mt-2 h-16 w-16">
                {it ? <Image src={ITEM_BY_ID[it.itemId]?.image ?? String(it.data.image)} alt="" fill sizes="64px" className="object-contain" /> : <span className="grid h-full place-items-center text-2xl text-white/20">＋</span>}
              </div>
              <p className="mt-2 text-center text-xs">{it ? t(it.name) : t("Vazio")}{it?.upgrade ? <b className="ml-1 text-gold">+{it.upgrade}</b> : null}</p>
            </div>
          );
        })}
      </Panel>

      {sets.length > 0 && (
        <Panel className="flex flex-wrap gap-2 p-3 text-xs">
          {sets.map((a) => (
            <span key={a.set.id} className={`rounded-full px-3 py-1.5 ring-1 ${a.bonus ? "bg-indigo-900/50 text-indigo-100 ring-indigo-400/50" : "bg-white/5 text-white/50 ring-white/10"}`}>
              🧩 {t(a.set.name)} {a.count}/{a.set.pieces.length}{a.bonus ? ` · ${statText(t, a.bonus)}` : ` · ${t("falta {n} para o bônus", { n: 2 - a.count })}`}
            </span>
          ))}
        </Panel>
      )}

      <div className="flex flex-wrap gap-2">
        {([["bag", "🎒 Minha bolsa"], ["pets", "🐾 Pets"], ["looks", "✨ Cosméticos e títulos"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} className={`rounded-lg px-4 py-2 text-sm font-display ${view === k ? "bg-gold text-ink" : "bg-white/5 text-white/70"}`}>{t(l)}</button>
        ))}
        <span className={`ml-auto self-center text-sm ${bagUsed >= BAG_LIMIT ? "text-amber-300" : "text-white/70"}`} title={t("Itens não equipados. Com a bolsa cheia, itens encontrados viram ouro.")}>🎒 {bagUsed}/{BAG_LIMIT}</span>
        <span className="self-center text-sm">🪙 <b>{ctx.state.wallet.gold.toLocaleString(t.locale)}</b></span>
      </div>

      {view === "pets" ? <Pets ctx={ctx} /> : view === "looks" ? <Cosmetics ctx={ctx} /> : (
        items.length === 0 ? (
          <Panel className="p-8 text-center text-white/60">{t("Sua bolsa está vazia. Complete missões e caçadas para encontrar itens!")}</Panel>
        ) : (
          <>
          <BagControls value={f} onChange={setF} count={shown.length} picking={picking}
            onPick={() => { setPicking(!picking); setPicked(new Set()); }}
            onPickAll={() => setPicked(new Set(shown.filter((i) => !i.equipped).map((i) => i.id)))} />
          {bagUsed >= BAG_LIMIT && <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-300 ring-1 ring-amber-400/30">{t("🎒 Bolsa cheia: itens encontrados viram ouro e o Ferreiro não vende até você abrir espaço.")}</p>}
          {shown.length === 0 && <Panel className="p-6 text-center text-white/60">{t("Nenhum item com esses filtros.")}</Panel>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {shown.map((it, i) => {
              const def = ITEM_BY_ID[it.itemId];
              const on = picked.has(it.id);
              return (
                <motion.div key={it.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(i, 12) * 0.03 }}
                  onClick={picking && !it.equipped ? () => toggle(it.id) : undefined}
                  className={`panel relative flex flex-col p-3 ring-1 ${RARITY_STYLE[it.rarity]} ${picking && !it.equipped ? "cursor-pointer" : ""} ${picking && it.equipped ? "opacity-40" : ""} ${on ? "!ring-2 !ring-gold" : ""}`}>
                  {picking && !it.equipped && (
                    <span role="checkbox" aria-checked={on} aria-label={t("Selecionar {x}", { x: t(it.name) })} tabIndex={0}
                      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(it.id); } }}
                      className={`absolute right-1 top-1 z-10 grid h-11 w-11 place-items-center`}>
                      <span className={`grid h-6 w-6 place-items-center rounded border-2 text-sm font-black ${on ? "border-gold bg-gold text-ink" : "border-white/40 bg-black/50"}`}>{on ? "✓" : ""}</span>
                    </span>
                  )}
                  <div className="relative mx-auto h-20 w-20">
                    <Image src={def?.image ?? String(it.data.image)} alt="" fill sizes="80px" className="object-contain" />
                    {it.qty > 1 && <span className="absolute -right-1 -top-1 rounded-full bg-gold px-1.5 text-xs font-bold text-ink">x{it.qty}</span>}
                  </div>
                  {it.upgrade > 0 && <span className="absolute left-2 top-2 rounded bg-gold px-1.5 font-display text-xs font-black text-ink">+{it.upgrade}</span>}
                  <p className="mt-2 line-clamp-2 text-center text-sm leading-tight">{t(it.name)}</p>
                  <p className="text-center text-[11px] text-white/40">{t(RARITY_LABEL[it.rarity])}
                    {it.equipped
                      ? <span className="ml-1 rounded bg-emerald-600/80 px-1.5 text-[10px] text-white">{t("Equipado")}</span>
                      : it.slot && <span className="ml-1 rounded bg-white/10 px-1.5 text-[10px] text-white/70">{t("Na bolsa")}</span>}</p>
                  <p className="mt-1 text-center text-[11px] text-emerald-300">{statText(t, itemStatsFor(def, upgradedStats(it.data as Record<string, number>, it.upgrade), race))}</p>
                  <ItemTags def={def} race={race} level={ctx.state.character.level} />
                  <SetTag itemId={it.itemId} state={ctx.state} />
                  {def?.slot && <GearInsight state={ctx.state} def={def} upgrade={it.upgrade} entry={it} />}
                  {def?.description && <p className="mt-1 text-center text-[11px] text-white/60">{t(def.description)}</p>}
                  {!picking && <div className="mt-auto flex gap-1.5 pt-2">
                    {!it.slot && (def?.use || it.itemId === "pocao_vida") && (
                      <button disabled={busy} onClick={() => useItem(it)} className="min-h-11 flex-1 rounded-md bg-gold/90 py-1.5 text-xs text-ink">
                        {def?.use?.kind === "chest" ? t("🎁 Abrir") : t("Usar")}
                      </button>
                    )}
                    {it.slot && (
                      <button disabled={busy || (!it.equipped && ctx.state.character.level < (def?.minLevel ?? 1))} onClick={() => run("/api/inventory/equip", { inventoryId: it.id }, it.equipped ? "Item removido" : "Item equipado")}
                        className={`min-h-11 flex-1 rounded-md py-1.5 text-xs ${it.equipped ? "bg-white/10" : "bg-gold/90 text-ink"}`}>
                        {it.equipped ? t("Remover") : t("Equipar")}
                      </button>
                    )}
                    {def && !it.equipped && (
                      <button disabled={busy} title={t("Vender 1 por {n} de ouro", { n: sellPrice(def, it.upgrade) })} onClick={() => run("/api/smith/sell", { inventoryId: it.id }, t("Vendido por {n} 🪙", { n: sellPrice(def, it.upgrade) }))}
                        className="min-h-11 flex-1 rounded-md bg-white/5 py-1.5 text-xs hover:bg-white/10">
                        {t("Vender")} 🪙{sellPrice(def, it.upgrade)}
                      </button>
                    )}
                  </div>}
                </motion.div>
              );
            })}
          </div>
          <AnimatePresence>
            {opened && (
              <motion.div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpened(null)}>
                <motion.div initial={{ scale: 0.7, rotate: -4 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring" }} className="panel w-full max-w-sm p-6 text-center" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                  <Image src="/assets/items/tier/bau_masmorra.webp" alt="" width={96} height={96} className="mx-auto" />
                  <p className="mt-2 font-display text-xl text-gold">{t("{x} aberto!", { x: t(opened.name) })}</p>
                  <p className="mt-3 text-lg">🪙 +{opened.gold.toLocaleString(t.locale)}{opened.gems ? ` · 💎 +${opened.gems}` : ""}</p>
                  {opened.item && ITEM_BY_ID[opened.item] && (
                    <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-amber-500/15 p-2 ring-1 ring-amber-400/50">
                      <Image src={ITEM_BY_ID[opened.item].image} alt="" width={40} height={40} className="rounded" />
                      <span className="font-display text-amber-200">✨ {t(ITEM_BY_ID[opened.item].name)}</span>
                    </div>
                  )}
                  {!opened.item && <p className="mt-2 text-xs text-white/50">{t("Desta vez não veio item raro.")}</p>}
                  <button className="btn-gold mt-5 w-full" onClick={() => setOpened(null)}>{t("Continuar")}</button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {picking && (
            <div className="sticky bottom-2 z-30 flex flex-wrap items-center gap-2 rounded-xl border border-gold/30 bg-ink/95 p-2 shadow-[0_-8px_24px_#0008] backdrop-blur"
              style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
              <span className="flex-1 text-sm">{t("{n} selecionado(s)", { n: pickedList.length })} · 🪙 <b>{pickedGold.toLocaleString(t.locale)}</b></span>
              <button className="min-h-11 rounded-lg bg-white/10 px-3 text-sm" onClick={() => { setPicking(false); setPicked(new Set()); }}>{t("Cancelar")}</button>
              <button className="btn-gold min-h-11 px-4" disabled={busy || !pickedList.length} onClick={sellMany}>{t("Vender selecionados")}</button>
            </div>
          )}
          </>
        )
      )}
    </div>
  );
}

/** Selos do item: nível exigido e afinidade de raça. */
export function ItemTags({ def, race, level }: { def?: ItemDef; race: string; level: number }) {
  const t = useT();
  if (!def?.slot) return null;
  const low = level < (def.minLevel ?? 1);
  const aff = def.affinity?.includes(race);
  return (
    <p className="mt-0.5 flex flex-wrap justify-center gap-1 text-[10px]">
      {(def.minLevel ?? 1) > 1 && <span className={`rounded px-1 ${low ? "bg-red-900/60 text-red-200" : "bg-white/5 text-white/50"}`}>{t("Nv. {n}+", { n: def.minLevel ?? 1 })}</span>}
      {def.affinity && <span className={`rounded px-1 ${aff ? "bg-emerald-800/60 text-emerald-200" : "bg-white/5 text-white/40"}`} title={t("Afinidade: +20% nos atributos para estas raças")}>{aff ? `★ ${t("Afinidade +20%")}` : `☆ ${def.affinity.map((r) => t(RACES[r as RaceId]?.name ?? r)).join(", ")}`}</span>}
    </p>
  );
}

// ── Filtros e ordem da bolsa ─────────────────────────────────────────
type BagSort = "recent" | "rarity" | "level" | "value" | "name";
export type BagFilter = { slot: Slot | "consumable" | "all"; rarity: ItemDef["rarity"] | "all"; state: "all" | "equipped" | "bag"; sort: BagSort };
const NO_BAG_FILTER: BagFilter = { slot: "all", rarity: "all", state: "all", sort: "recent" };
const RANK = { common: 0, rare: 1, epic: 2, legendary: 3 } as const;

function filterBag(items: InventoryEntry[], f: BagFilter) {
  const list = items.filter((i) => {
    const slotOk = f.slot === "all" || (f.slot === "consumable" ? !i.slot : i.slot === f.slot);
    const stateOk = f.state === "all" || (f.state === "equipped" ? i.equipped : !i.equipped);
    return slotOk && stateOk && (f.rarity === "all" || i.rarity === f.rarity);
  });
  const def = (i: InventoryEntry) => ITEM_BY_ID[i.itemId];
  const val = (i: InventoryEntry) => { const d = def(i); return d ? sellPrice(d, i.upgrade) * i.qty : 0; };
  const by: Record<BagSort, (a: InventoryEntry, b: InventoryEntry) => number> = {
    recent: () => 0,
    rarity: (a, b) => RANK[b.rarity] - RANK[a.rarity] || b.upgrade - a.upgrade,
    level: (a, b) => (def(b)?.minLevel ?? 0) - (def(a)?.minLevel ?? 0),
    value: (a, b) => val(b) - val(a),
    name: (a, b) => a.name.localeCompare(b.name),
  };
  // Equipados sempre primeiro; depois a ordem escolhida (estável: "recentes" mantém a ordem de chegada).
  return list.map((x, i) => [x, i] as const).sort(([a, ia], [b, ib]) => Number(b.equipped) - Number(a.equipped) || by[f.sort](a, b) || ia - ib).map(([x]) => x);
}

function BagControls({ value, onChange, count, picking, onPick, onPickAll }: {
  value: BagFilter; onChange: (f: BagFilter) => void; count: number; picking: boolean; onPick: () => void; onPickAll: () => void;
}) {
  const t = useT();
  const chip = (on: boolean) => `min-h-11 shrink-0 rounded-full px-3 text-xs transition ${on ? "bg-gold text-ink" : "bg-white/5 text-white/70 hover:bg-white/10"}`;
  const sel = "min-h-11 rounded-full border-0 bg-white/5 px-3 text-xs text-white/80";
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label={t("Espaço")}>
        {(["all", ...SLOTS, "consumable"] as const).map((s) => (
          <button key={s} className={chip(value.slot === s)} onClick={() => onChange({ ...value, slot: s })}>
            {s === "all" ? t("Todos") : s === "consumable" ? t("Consumíveis") : t(SLOT_LABEL[s])}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <select aria-label={t("Raridade")} className={sel} value={value.rarity} onChange={(e) => onChange({ ...value, rarity: e.target.value as BagFilter["rarity"] })}>
          <option value="all">{t("Todas as raridades")}</option>
          {(["common", "rare", "epic", "legendary"] as const).map((r) => <option key={r} value={r}>{t(RARITY_LABEL[r])}</option>)}
        </select>
        <select aria-label={t("Equipados")} className={sel} value={value.state} onChange={(e) => onChange({ ...value, state: e.target.value as BagFilter["state"] })}>
          <option value="all">{t("Equipados e na bolsa")}</option>
          <option value="equipped">{t("Só equipados")}</option>
          <option value="bag">{t("Só na bolsa")}</option>
        </select>
        <select aria-label={t("Ordenar")} className={sel} value={value.sort} onChange={(e) => onChange({ ...value, sort: e.target.value as BagSort })}>
          <option value="recent">{t("Ordem: mais antigos")}</option>
          <option value="rarity">{t("Ordem: raridade")}</option>
          <option value="level">{t("Ordem: nível")}</option>
          <option value="value">{t("Ordem: valor de venda")}</option>
          <option value="name">{t("Ordem: nome")}</option>
        </select>
        <span className="text-xs text-white/40">{t("{n} itens", { n: count })}</span>
        <span className="ml-auto flex gap-1.5">
          {picking && <button className={chip(false)} onClick={onPickAll}>{t("Selecionar visíveis")}</button>}
          <button className={chip(picking)} aria-pressed={picking} onClick={onPick}>🪙 {t("Vender vários")}</button>
        </span>
      </div>
    </div>
  );
}
