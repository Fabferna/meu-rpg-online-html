"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import { COSMETICS, type Cosmetic } from "@/lib/shop/catalog";
import { post, RARITY_LABEL } from "./api";
import { play } from "./sfx";
import { useT } from "@/lib/i18n/client";

type Data = { owned: string[]; equipped: string | null };
type Filter = "all" | "mine" | "locked";

const TITLES = COSMETICS.filter((x) => x.kind === "title");
const RARITY_ORDER = { legendary: 0, epic: 1, rare: 2, common: 3 } as const;
const RARITY_TEXT: Record<string, string> = { common: "text-white/80", rare: "text-sky-300", epic: "text-fuchsia-300", legendary: "text-amber-300" };
const RARITY_EDGE: Record<string, string> = { common: "border-l-white/30", rare: "border-l-sky-400", epic: "border-l-fuchsia-400", legendary: "border-l-amber-300" };

/**
 * Painel só de Títulos: o que está em uso, os que o jogador já tem (um clique para equipar ou desequipar)
 * e os bloqueados, acinzentados, com a condição para liberar.
 */
export default function Titles({ ctx, open, onClose }: { ctx: GameCtx; open: boolean; onClose: () => void }) {
  const t = useT();
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const c = ctx.state.character;

  const load = useCallback(async () => {
    const r = await fetch("/api/cosmetics", { cache: "no-store" });
    if (r.ok) { const j = await r.json(); setD({ owned: j.owned ?? [], equipped: j.equipped?.title ?? null }); }
  }, []);
  useEffect(() => { if (open) { setFilter("all"); load(); } }, [open, load]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /** Um clique: equipa o título (ou desequipa, se já for o que está em uso). A tela muda na hora. */
  async function toggle(x: Cosmetic) {
    if (!d || busy) return;
    const before = d.equipped;
    const next = before === x.id ? null : x.id;
    setBusy(x.id);
    setD({ ...d, equipped: next });
    try {
      await post("/api/shop/equip", { kind: "title", cosmeticId: next });
      play("coin");
      ctx.toast(next ? t("Título « {x} » equipado!", { x: t(x.name) }) : t("Título removido."));
      await ctx.refresh();
    } catch (e) {
      setD((cur) => (cur ? { ...cur, equipped: before } : cur));
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  const has = (x: Cosmetic) => !!d?.owned.includes(x.id);
  const byRarity = (a: Cosmetic, b: Cosmetic) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
  const mine = TITLES.filter(has).sort((a, b) => Number(d?.equipped === b.id) - Number(d?.equipped === a.id) || byRarity(a, b));
  const locked = TITLES.filter((x) => !has(x)).sort(byRarity);
  const current = TITLES.find((x) => x.id === d?.equipped) ?? null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-3 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()}
            className="panel flex max-h-[92dvh] w-full max-w-2xl flex-col" role="dialog" aria-modal="true" aria-labelledby="titles-h">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4 sm:p-5">
              <div>
                <h2 id="titles-h" className="font-display text-xl text-gold">🏷️ {t("Títulos")}</h2>
                <p className="text-xs text-white/60">{t("O título aparece ao lado do seu nome no perfil, no ranking e no chat.")}</p>
              </div>
              <button onClick={onClose} aria-label={t("Fechar")} className="min-h-9 rounded-md px-2 text-white/50 hover:text-white">✕</button>
            </div>

            {!d ? <p className="p-10 text-center text-white/50">{t("Carregando…")}</p> : (
              <div className="space-y-4 overflow-y-auto p-4 sm:p-5">
                {/* Em uso agora */}
                <div className="rounded-xl bg-black/40 p-4 text-center ring-1 ring-gold/30">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-white/50">{t("Em uso agora")}</p>
                  <p className="mt-1 font-display text-lg">
                    {c.name}{" "}
                    {current ? <span className={RARITY_TEXT[current.rarity]}>« {t(current.name)} »</span> : <span className="text-sm text-white/40">({t("sem título")})</span>}
                  </p>
                  {current && (
                    <button disabled={!!busy} onClick={() => toggle(current)} className="mt-2 rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20">{t("Desequipar")}</button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("Filtrar títulos")}>
                  {([["all", "Todos", TITLES.length], ["mine", "Meus títulos", mine.length], ["locked", "Bloqueados", locked.length]] as const).map(([k, l, n]) => (
                    <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}
                      className={`min-h-9 rounded-full px-3 text-xs transition ${filter === k ? "bg-gold text-ink" : "bg-white/5 text-white/70 hover:bg-white/10"}`}>{t(l)} ({n})</button>
                  ))}
                </div>

                {filter !== "locked" && (
                  <section>
                    <h3 className="mb-2 font-display text-sm text-emerald-300">✔ {t("Meus títulos")} ({mine.length}/{TITLES.length})</h3>
                    {mine.length === 0 ? <p className="rounded-lg bg-black/30 p-4 text-center text-sm text-white/50">{t("Você ainda não tem títulos. Veja abaixo como conseguir o primeiro!")}</p> : (
                      <ul className="space-y-2">
                        {mine.map((x) => {
                          const on = d.equipped === x.id;
                          return (
                            <li key={x.id} className={`flex items-center gap-3 rounded-lg border-l-4 px-3 py-2.5 ${RARITY_EDGE[x.rarity]} ${on ? "bg-emerald-500/15 ring-1 ring-emerald-400/60" : "bg-black/30"}`}>
                              <span className="min-w-0 flex-1">
                                <span className={`block font-display text-base leading-tight ${RARITY_TEXT[x.rarity]}`}>« {t(x.name)} »</span>
                                <span className="block text-[11px] text-white/50">{t(RARITY_LABEL[x.rarity])}{on && <b className="ml-2 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] text-white">{t("EM USO")}</b>}</span>
                              </span>
                              <button disabled={!!busy} onClick={() => toggle(x)} aria-pressed={on}
                                className={`min-h-10 w-28 shrink-0 rounded-md text-sm font-bold ${on ? "bg-white/10 text-white/90 hover:bg-white/20" : "bg-emerald-600 text-white hover:bg-emerald-500"} disabled:opacity-60`}>
                                {on ? t("Desequipar") : t("Equipar")}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                )}

                {filter !== "mine" && locked.length > 0 && (
                  <section>
                    <h3 className="mb-2 font-display text-sm text-white/60">🔒 {t("Bloqueados")} ({locked.length})</h3>
                    <ul className="space-y-2">
                      {locked.map((x) => (
                        <li key={x.id} className="flex flex-wrap items-center gap-3 rounded-lg border-l-4 border-l-white/10 bg-black/20 px-3 py-2.5">
                          <span className="min-w-0 flex-1">
                            <span className="block font-display text-base leading-tight text-white/40 grayscale">🔒 « {t(x.name)} »</span>
                            <span className="block text-[11px] text-white/40">{t(RARITY_LABEL[x.rarity])}</span>
                            <span className="mt-0.5 block text-xs text-amber-200/90">
                              <b>{t("Como desbloquear:")}</b> {x.how ? t(x.how) : x.price ? t("Compre na Loja por {n}", { n: `${x.price.currency === "gems" ? "💎" : "🪙"} ${x.price.amount.toLocaleString(t.locale)}` }) : t("Em breve")}
                            </span>
                          </span>
                          {x.price && !x.how && (
                            <button onClick={() => { onClose(); ctx.go?.("shop"); }} className="min-h-10 w-28 shrink-0 rounded-md bg-white/10 text-xs hover:bg-white/20">{t("Ir para a Loja")}</button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {filter === "locked" && locked.length === 0 && <p className="rounded-lg bg-black/30 p-4 text-center text-sm text-emerald-300">{t("Você já desbloqueou todos os títulos!")}</p>}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
