"use client";

import Image from "next/image";
import type { PlayerState, InventoryEntry } from "@/lib/game/state";
import { RARITY_COEF, RACE_PROFILE, WEAPON_TYPES, WEIGHT_LABEL, ATTR_LABEL, weightBonusText, weightMatches } from "@/lib/game/gear";
import { ITEM_BY_ID, SLOTS, itemStatsFor, upgradedStats, type ItemDef, type Slot } from "@/lib/game/items";
import { ITEM_SOURCES, type ItemSource } from "@/lib/game/itemSources";
import type { RaceId } from "@/lib/game/data";
import type { TFn } from "@/lib/i18n/translate";
import { useT } from "@/lib/i18n/client";
import { RARITY_LABEL, RARITY_STYLE } from "./api";
import { ItemTags, SLOT_LABEL, statText } from "./Inventory";
import { viewItem } from "./gearView";
import { SET_OF_ITEM, activeSets } from "@/lib/game/sets";

// ── Filtros ─────────────────────────────────────────────────────────
export type GearFilter = { slot: Slot | "all"; rarity: ItemDef["rarity"] | "all"; mine: boolean };
export const NO_FILTER: GearFilter = { slot: "all", rarity: "all", mine: false };

/** O item "é da minha raça": afinidade, arma do tipo preferido ou peça do peso certo. */
export function fitsRace(def: ItemDef, race: RaceId) {
  return !!def.affinity?.includes(race) || (!!def.weapon && RACE_PROFILE[race].prefers.includes(def.weapon)) || (!!def.weight && weightMatches(def, race));
}
export function passes(f: GearFilter, def: ItemDef | undefined, race: RaceId) {
  if (!def?.slot) return false;
  return (f.slot === "all" || def.slot === f.slot) && (f.rarity === "all" || def.rarity === f.rarity) && (!f.mine || fitsRace(def, race));
}

export function FilterBar({ value, onChange, count }: { value: GearFilter; onChange: (f: GearFilter) => void; count?: number }) {
  const t = useT();
  const chip = (on: boolean) => `min-h-11 rounded-full px-3 text-xs transition ${on ? "bg-gold text-ink" : "bg-white/5 text-white/70 hover:bg-white/10"}`;
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label={t("Espaço")}>
        {(["all", ...SLOTS] as const).map((s) => (
          <button key={s} className={`${chip(value.slot === s)} shrink-0`} onClick={() => onChange({ ...value, slot: s })}>{s === "all" ? t("Todos") : t(SLOT_LABEL[s])}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <select aria-label={t("Raridade")} value={value.rarity} onChange={(e) => onChange({ ...value, rarity: e.target.value as GearFilter["rarity"] })}
          className="min-h-11 rounded-full border-0 bg-white/5 px-3 text-xs text-white/80">
          <option value="all">{t("Todas as raridades")}</option>
          {(["common", "rare", "epic", "legendary"] as const).map((r) => <option key={r} value={r}>{t(RARITY_LABEL[r])}</option>)}
        </select>
        <button className={chip(value.mine)} aria-pressed={value.mine} onClick={() => onChange({ ...value, mine: !value.mine })}>★ {t("Da minha raça")}</button>
        {count !== undefined && <span className="ml-auto text-xs text-white/40">{t("{n} itens", { n: count })}</span>}
      </div>
    </div>
  );
}

// ── Origem ──────────────────────────────────────────────────────────
/** Chance em %: uma casa decimal abaixo de 10% (ex.: 0,6%). */
export function pctText(p: number, locale: string) {
  const v = p * 100;
  if (v > 0 && v < 0.1) return `<${(0.1).toLocaleString(locale)}%`;
  return `${v.toLocaleString(locale, { maximumFractionDigits: v < 10 ? 1 : 0 })}%`;
}

export function sourceText(t: TFn, s: ItemSource) {
  const pct = "chance" in s ? ` (${pctText(s.chance, t.locale)})` : "";
  switch (s.kind) {
    case "enemy": return `${s.boss ? "👑" : "⚔️"} ${t(s.name)}${pct}`;
    case "dungeon": return `🗝️ ${t(s.name)}${pct}`;
    case "quest": return `📜 ${t(s.name)}${pct}`;
    case "story": return `📖 ${t("Capítulo {n}", { n: s.chapter })}: ${t(s.name)}`;
    case "deal": return `🏷️ ${t("Oferta do dia na Loja")}`;
  }
}

export function Sources({ id, max = 3 }: { id: string; max?: number }) {
  const t = useT();
  const list = ITEM_SOURCES[id] ?? [];
  if (!list.length) return <p className="text-[11px] text-white/40">{t("Origem: eventos especiais")}</p>;
  return (
    <p className="text-[11px] leading-snug text-sky-200/80">
      <span className="text-white/50">{t("Encontrado em:")}</span> {list.slice(0, max).map((s) => sourceText(t, s)).join(" · ")}
      {list.length > max ? ` · +${list.length - max}` : ""}
    </p>
  );
}

// ── Como o item fica para VOCÊ ──────────────────────────────────────
export function GearInsight({ state, def, upgrade = 0, entry }: { state: PlayerState; def: ItemDef; upgrade?: number; entry?: InventoryEntry }) {
  const t = useT();
  const race = state.character.race;
  const v = viewItem(state, def, upgrade, entry?.id);
  const w = v.weapon;
  return (
    <div className="mt-1 space-y-1 text-[11px] leading-snug">
      {w && (
        <p className={w.preferred ? "text-amber-200" : "text-white/70"}>
          🗡️ {t("Dano efetivo para você: {x} (escala com {a})", { x: w.total, a: t(ATTR_LABEL[w.attr]) })}
          {w.preferred && <span className="ml-1 rounded bg-amber-500/20 px-1 text-amber-200">★ {t("arma preferida")}</span>}
          {w.arcane && <span className="block text-fuchsia-200/80">✨ {t("Arma arcana: reforça suas magias")}</span>}
        </p>
      )}
      {def.weight && (
        <p className={weightMatches(def, race) ? "text-emerald-300" : "text-white/40"}>
          {t("Peso: {p}", { p: t(WEIGHT_LABEL[def.weight]) })}
          {weightMatches(def, race) ? ` — ✓ ${weightBonusText(race).map((x) => t(x.k, { n: x.n })).join(", ")}` : ""}
        </p>
      )}
      {v.same ? (
        <p className="text-white/40">{t("Equipado agora")}</p>
      ) : entry && !entry.equipped && state.inventory.some((i) => i.equipped && i.itemId === entry.itemId && i.id !== entry.id) && v.deltas.length === 0 ? (
        <p className="font-semibold text-sky-200">🔁 {t("Cópia do item equipado: está na bolsa e pode ser vendida.")}</p>
      ) : v.deltas.length > 0 ? (() => {
        const ups = v.deltas.filter((d) => d.to > d.from).length, downs = v.deltas.length - ups;
        const verdict = downs === 0 ? { k: "▲ Melhor que o equipado", c: "text-emerald-300" } : ups === 0 ? { k: "▼ Pior que o equipado", c: "text-red-300" } : { k: "⇅ Troca: ganha e perde", c: "text-amber-200" };
        return (
          <div>
            <p className={`font-semibold ${verdict.c}`}>{t(verdict.k)}</p>
            <ul className="mt-0.5 flex flex-wrap gap-1" aria-label={t("Comparado ao equipamento atual")}>
              {v.deltas.map((d) => {
                const up = d.to > d.from;
                const diff = Math.round((d.to - d.from) * 10) / 10;
                return (
                  <li key={d.key} title={`${d.from}${d.unit ?? ""} → ${d.to}${d.unit ?? ""}`}
                    className={`rounded px-1 font-medium ${up ? "bg-emerald-900/60 text-emerald-200" : "bg-red-900/60 text-red-200"}`}>
                    {up ? "▲" : "▼"} {t(d.label)} {diff > 0 ? "+" : "−"}{Math.abs(diff)}{d.unit ?? ""}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })() : (
        <p className="text-white/40">{t("Igual ao equipamento atual")}</p>
      )}
    </div>
  );
}

/** Selo do conjunto: nome, peças equipadas e os bônus de 2 e 3 peças (o ativo em destaque). */
export function SetTag({ itemId, state }: { itemId: string; state: PlayerState }) {
  const t = useT();
  const set = SET_OF_ITEM[itemId];
  if (!set) return null;
  const n = activeSets(state.inventory.filter((i) => i.equipped).map((i) => i.itemId)).find((a) => a.set.id === set.id)?.count ?? 0;
  return (
    <div className="mt-1 rounded bg-indigo-950/60 px-1.5 py-1 text-[10px] leading-snug ring-1 ring-indigo-400/30" title={set.pieces.map((p) => t(ITEM_BY_ID[p]?.name ?? p)).join(" · ")}>
      <p className="font-semibold text-indigo-200">🧩 {t(set.name)} <span className="text-indigo-300/70">({n}/{set.pieces.length})</span></p>
      {([2, 3] as const).map((k) => (
        <p key={k} className={n >= k ? "text-emerald-300" : "text-white/40"}>{n >= k ? "✓" : "○"} {t("{n} peças:", { n: k })} {statText(t, set.bonus[k])}</p>
      ))}
    </div>
  );
}

/** Linha "Espada · escala FOR" / "Armadura · Pesada". */
export function kindText(t: TFn, def: ItemDef) {
  if (def.weapon) return `${t(WEAPON_TYPES[def.weapon].label)} · ${t(ATTR_LABEL[WEAPON_TYPES[def.weapon].scale])} ×${RARITY_COEF[def.rarity]}`;
  if (def.weight) return `${t(SLOT_LABEL[def.slot!])} · ${t(WEIGHT_LABEL[def.weight])}`;
  return def.slot ? t(SLOT_LABEL[def.slot]) : "";
}

/** Cartão de equipamento usado no Catálogo, no Ferreiro e na Forja. */
export function GearCard({ state, def, entry, owned = 0, locked, children }: {
  state: PlayerState; def: ItemDef; entry?: InventoryEntry; owned?: number; locked?: boolean; children?: React.ReactNode;
}) {
  const t = useT();
  const race = state.character.race;
  const up = entry?.upgrade ?? 0;
  return (
    <div className={`panel relative flex flex-col p-3 ring-1 ${RARITY_STYLE[def.rarity]} ${locked ? "opacity-50 saturate-50" : ""}`}>
      <div className="relative mx-auto h-16 w-16 sm:h-20 sm:w-20"><Image src={def.image} alt="" fill sizes="80px" className="object-contain" /></div>
      {up > 0 && <span className="absolute left-2 top-2 rounded bg-gold px-1.5 font-display text-xs font-black text-ink">+{up}</span>}
      {entry?.equipped && <span className="absolute right-2 top-2 rounded bg-emerald-600/80 px-1.5 text-[10px]">{t("Equipado")}</span>}
      {!entry && owned > 0 && <span className="absolute right-2 top-2 rounded bg-white/15 px-1.5 text-[10px]">{t("você tem {n}", { n: owned })}</span>}
      <p className="mt-2 text-center text-sm leading-tight">{t(def.name)}</p>
      <p className="text-center text-[11px] text-white/40">{kindText(t, def)} · {t(RARITY_LABEL[def.rarity])}</p>
      <p className="mt-1 text-center text-[11px] text-emerald-300">{statText(t, itemStatsFor(def, upgradedStats(def.stats as Record<string, number>, up), race))}</p>
      <ItemTags def={def} race={race} level={state.character.level} />
      <SetTag itemId={def.id} state={state} />
      <div className="flex-1"><GearInsight state={state} def={def} upgrade={up} entry={entry} /></div>
      {children}
    </div>
  );
}
